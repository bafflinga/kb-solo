import { drillCues, lineCues, randomComboCues, wordCues } from '../cues'
import {
  focusLabels,
  mapCanonicalChar,
  resolveFocus,
} from '../keyZones'
import { codeForChar, getLayout } from '../layout'
import type { Cue, Layout } from '../types'
import { generateText } from './fakerGenerator'
import type {
  CreateCuesOptions,
  GeneratedCuesResult,
  LessonContent,
  LessonContentMap,
  LessonKind,
  LessonMeta,
  LessonProvider,
} from './types'

export function focusKeyLabels(meta: LessonMeta): string {
  return focusLabels(meta, getLayout(meta.layoutId))
}

function pickVariant<T>(variants: readonly T[], index?: number): T {
  if (variants.length === 0) {
    throw new Error('Lesson templates must include at least one variant')
  }
  const safe =
    index === undefined ? 0 : Math.max(0, Math.min(index, variants.length - 1))
  return variants[safe] as T
}

/**
 * Authored text for a specific layout: the layout override verbatim (real
 * symbols), or the canonical source mapped onto the layout.
 */
export function lessonSourceFor(
  meta: LessonMeta,
  content: LessonContent,
  layout: Layout,
): unknown[] {
  const override = content.layoutVariants?.[layout.id]
  if (override) {
    return override
  }
  const focus = meta.focus
  if (focus?.keys) {
    const canonical = getLayout(content.canonicalLayout ?? meta.layoutId)
    return content.variants.map((variant) =>
      Array.from(String(variant), (char) =>
        mapCanonicalChar(meta, canonical, layout, char),
      )
        .map((mapped) => mapped?.char ?? '')
        .join(''),
    )
  }
  if (focus?.chars?.length) {
    return content.variants.map((variant) =>
      Array.from(String(variant), (char) =>
        codeForChar(layout, char) !== undefined ? char : '',
      ).join(''),
    )
  }
  return content.variants
}

export function makeProvider(
  meta: LessonMeta,
  content: LessonContent,
): LessonProvider {
  const kind = meta.kind
  if (!kind) {
    throw new Error(`Missing lesson kind for ${meta.id}`)
  }
  const variants = content.variants

  function drillCuesFor(
    layout: Layout,
    text: string,
    verbatim: boolean,
  ): Cue[] {
    const focus = meta.focus
    if (focus?.keys) {
      if (verbatim) {
        return drillCues(layout, text, { dropMissing: true })
      }
      const canonical = getLayout(content.canonicalLayout ?? meta.layoutId)
      return drillCues(layout, text, {
        charMap: (char) => mapCanonicalChar(meta, canonical, layout, char),
      })
    }
    if (focus?.chars?.length) {
      return drillCues(layout, text, { dropMissing: true })
    }
    return drillCues(layout, text)
  }

  function authoredCues(layout: Layout, options?: CreateCuesOptions): Cue[] {
    const layoutOverride = content.layoutVariants?.[layout.id]
    const selected = layoutOverride ?? variants
    switch (kind) {
      case 'drill': {
        if (options?.generate === true && meta.focus?.keys) {
          const codes = resolveFocus(meta, layout)?.codes ?? []
          return randomComboCues(layout, codes)
        }
        return drillCuesFor(
          layout,
          pickVariant(selected as string[], options?.variantIndex),
          layoutOverride !== undefined,
        )
      }
      case 'words':
        return wordCues(
          layout,
          pickVariant(
            selected as (readonly string[])[],
            options?.variantIndex,
          ).join(' '),
        )
      case 'prose':
        return wordCues(
          layout,
          pickVariant(selected as string[], options?.variantIndex),
        )
      case 'code':
        return lineCues(
          layout,
          pickVariant(selected as string[], options?.variantIndex),
        )
      default:
        return []
    }
  }

  function generatedCues(
    layoutOverride?: Layout,
    options?: CreateCuesOptions,
  ): GeneratedCuesResult {
    const layout = layoutOverride ?? getLayout(meta.layoutId)
    if (options?.generate !== true || options.faker === undefined) {
      return { cues: authoredCues(layout, options) }
    }
    const sentenceSource = options.sentenceSource ?? 'lorem'

    if (kind === 'drill') {
      const codes = meta.focus?.keys
        ? (resolveFocus(meta, layout)?.codes ?? [])
        : []
      if (codes.length === 0) {
        return { cues: authoredCues(layout, options) }
      }
      return {
        cues: randomComboCues(layout, codes),
        generation: { areaId: 'focus', sentenceSource },
      }
    }

    if (kind === 'words' || kind === 'prose') {
      const text = generateText(
        options.faker,
        options.area ?? 'random',
        sentenceSource,
        layout,
        options.minPhraseWords,
      )
      if (kind === 'words' && text.words.length === 0) {
        return { cues: authoredCues(layout, options) }
      }
      if (kind === 'prose' && text.sentences.length === 0) {
        return { cues: authoredCues(layout, options) }
      }
      return {
        cues: wordCues(
          layout,
          kind === 'words' ? text.words.join(' ') : text.sentences,
        ),
        generation: { areaId: text.areaId, sentenceSource },
      }
    }

    return { cues: authoredCues(layout, options) }
  }

  return {
    meta,
    kind,
    templateCount: variants.length,
    createCues: (layout?: Layout, options?: CreateCuesOptions): Cue[] =>
      generatedCues(layout, options).cues,
    createGeneratedCues: generatedCues,
  }
}

export type LessonDef = Omit<LessonMeta, 'requires'> & {
  kind: LessonKind
}

export function chainDefs(defs: readonly LessonDef[]): LessonMeta[] {
  return defs.map((def, index) => {
    const previous = index > 0 ? defs[index - 1] : undefined
    return previous ? { ...def, requires: [previous.id] } : { ...def }
  })
}

export function buildChainedLessons(
  defs: readonly LessonDef[],
  content: LessonContentMap,
): LessonProvider[] {
  return chainDefs(defs).map((meta) => {
    const found = content[meta.id]
    if (!found) {
      throw new Error(`Missing lesson content for ${meta.id}`)
    }
    return makeProvider(meta, found)
  })
}
