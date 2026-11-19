import {
  drillCues,
  lineCues,
  randomComboCues,
  wordCues,
  type CueTextOptions,
} from '../cues'
import { getLayout, resolveKeyCode } from '../layout'
import type { Code, Cue, Layout } from '../types'
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
  if (!meta.focusCodes?.length) {
    return ''
  }
  const layout = getLayout(meta.layoutId)
  return meta.focusCodes
    .map((code) => layout.legends[code]?.base ?? code)
    .join(' ')
}

function focusCodesFor(meta: LessonMeta, layout: Layout): Code[] | undefined {
  return meta.layoutFocusCodes?.[layout.id] ?? meta.focusCodes
}

export function focusCharsForLayout(
  meta: LessonMeta,
  layout: Layout,
): ReadonlySet<string> | undefined {
  const codes = focusCodesFor(meta, layout)
  if (!codes?.length) {
    return undefined
  }
  const from = getLayout(meta.layoutId)
  const chars = new Set<string>([' ', '\n'])
  for (const code of codes) {
    const resolved = resolveKeyCode(code, from, layout, meta.identityCodes)
    if (resolved === undefined) {
      continue
    }
    const fromLegend = from.legends[code]
    if (meta.identityCodes?.includes(code) && fromLegend) {
      chars.add(fromLegend.base)
      chars.add(fromLegend.shift)
      if (fromLegend.alt) {
        chars.add(fromLegend.alt)
      }
    }
    const legend = layout.legends[resolved]
    if (!legend) {
      continue
    }
    chars.add(legend.base)
    chars.add(legend.shift)
    if (legend.alt) {
      chars.add(legend.alt)
    }
  }
  return chars
}

export function focusKeyLabelsForLayout(
  meta: LessonMeta,
  layout: Layout,
): string {
  const codes = focusCodesFor(meta, layout)
  if (!codes?.length) {
    return ''
  }
  const from = getLayout(meta.layoutId)
  const labels = codes.map((code) => {
    const resolved = resolveKeyCode(code, from, layout, meta.identityCodes)
    return (resolved && layout.legends[resolved]?.base) ?? code
  })
  return [...new Set(labels)].join(' ')
}

export function focusCharsFor(
  meta: LessonMeta,
): ReadonlySet<string> | undefined {
  if (!meta.focusCodes?.length) {
    return undefined
  }
  const layout = getLayout(meta.layoutId)
  const chars = new Set<string>([' ', '\n'])
  for (const code of meta.focusCodes) {
    const legend = layout.legends[code]
    if (!legend) {
      continue
    }
    chars.add(legend.base)
    chars.add(legend.shift)
    if (legend.alt) {
      chars.add(legend.alt)
    }
  }
  return chars
}

function pickVariant<T>(variants: readonly T[], index?: number): T {
  if (variants.length === 0) {
    throw new Error('Lesson templates must include at least one variant')
  }
  const safe =
    index === undefined ? 0 : Math.max(0, Math.min(index, variants.length - 1))
  return variants[safe] as T
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

  function authoredCues(layout: Layout, options?: CreateCuesOptions): Cue[] {
    const cueOptions: CueTextOptions = meta.identityCodes?.length
      ? {
          authoredLayout: getLayout(meta.layoutId),
          identityCodes: meta.identityCodes,
        }
      : {}
    const selected = content.layoutVariants?.[layout.id] ?? variants
    switch (kind) {
      case 'drill':
        if (options?.generate === true && meta.focusCodes?.length) {
          return randomComboCues(layout, meta.focusCodes)
        }
        return drillCues(
          layout,
          pickVariant(selected as string[], options?.variantIndex),
          cueOptions,
        )
      case 'words':
        return wordCues(
          layout,
          pickVariant(
            selected as (readonly string[])[],
            options?.variantIndex,
          ).join(' '),
          cueOptions,
        )
      case 'prose':
        return wordCues(
          layout,
          pickVariant(selected as string[], options?.variantIndex),
          cueOptions,
        )
      case 'code':
        return lineCues(
          layout,
          pickVariant(selected as string[], options?.variantIndex),
          cueOptions,
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
      if (!meta.focusCodes?.length) {
        return { cues: authoredCues(layout, options) }
      }
      return {
        cues: randomComboCues(layout, meta.focusCodes),
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

export type LessonDef = Omit<LessonMeta, 'requires' | 'order'> & {
  kind: LessonKind
}

export function chainDefs(defs: readonly LessonDef[]): LessonMeta[] {
  return defs.map((def, index) => {
    const previous = index > 0 ? defs[index - 1] : undefined
    return previous
      ? { ...def, order: index + 1, requires: [previous.id] }
      : { ...def, order: index + 1 }
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
