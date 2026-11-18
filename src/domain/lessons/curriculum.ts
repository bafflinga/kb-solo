import { drillCues, lineCues, randomComboCues, wordCues } from '../cues'
import { getLayout } from '../layout'
import type { Cue, Layout } from '../types'
import type {
  CreateCuesOptions,
  LessonContent,
  LessonContentMap,
  LessonKind,
  LessonMeta,
  LessonProvider,
} from './types'

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
  return {
    meta,
    kind,
    templateCount: variants.length,
    createCues(layoutOverride?: Layout, options?: CreateCuesOptions): Cue[] {
      const layout = layoutOverride ?? getLayout(meta.layoutId)
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
      }
    },
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
