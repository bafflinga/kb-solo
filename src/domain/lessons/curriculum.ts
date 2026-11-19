import { drillCues, lineCues, randomComboCues, wordCues } from '../cues'
import { getLayout } from '../layout'
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
  if (!meta.focusCodes?.length) {
    return ''
  }
  const layout = getLayout(meta.layoutId)
  return meta.focusCodes
    .map((code) => layout.legends[code]?.base ?? code)
    .join(' ')
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
    switch (kind) {
      case 'drill':
        if (options?.generate === true && meta.focusCodes?.length) {
          return randomComboCues(layout, meta.focusCodes)
        }
        return drillCues(
          layout,
          pickVariant(variants as string[], options?.variantIndex),
        )
      case 'words':
        return wordCues(
          layout,
          pickVariant(
            variants as (readonly string[])[],
            options?.variantIndex,
          ).join(' '),
        )
      case 'prose':
        return wordCues(
          layout,
          pickVariant(variants as string[], options?.variantIndex),
        )
      case 'code':
        return lineCues(
          layout,
          pickVariant(variants as string[], options?.variantIndex),
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

export type LessonDef = Omit<LessonMeta, 'requires'> & { kind: LessonKind }

export function chainDefs(defs: readonly LessonDef[]): LessonMeta[] {
  const metas: LessonMeta[] = []
  for (const def of defs) {
    const previous = metas[metas.length - 1]
    metas.push(previous ? { ...def, requires: [previous.id] } : { ...def })
  }
  return metas
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
