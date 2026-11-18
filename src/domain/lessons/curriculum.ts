import {
  drillCues,
  lineCues,
  randomComboCues,
  wordCues,
} from '../cues'
import { getLayout } from '../layout'
import type { Cue, Layout } from '../types'
import type {
  CreateCuesOptions,
  LessonMeta,
  LessonProvider,
  LessonTemplates,
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
  templates: LessonTemplates,
): LessonProvider {
  return {
    meta,
    kind: templates.kind,
    templateCount: templates.variants.length,
    createCues(layoutOverride?: Layout, options?: CreateCuesOptions): Cue[] {
      const layout = layoutOverride ?? getLayout(meta.layoutId)
      switch (templates.kind) {
        case 'drill':
          if (options?.generate === true && meta.focusCodes?.length) {
            return randomComboCues(layout, meta.focusCodes)
          }
          return drillCues(
            layout,
            pickVariant(templates.variants, options?.variantIndex),
          )
        case 'words':
          return wordCues(
            layout,
            pickVariant(templates.variants, options?.variantIndex).join(' '),
          )
        case 'prose':
          return wordCues(
            layout,
            pickVariant(templates.variants, options?.variantIndex),
          )
        case 'code':
          return lineCues(
            layout,
            pickVariant(templates.variants, options?.variantIndex),
          )
      }
    },
  }
}

export type LessonDef = Omit<LessonMeta, 'requires'>

export function buildChainedLessons(
  defs: readonly { meta: LessonDef; templates: LessonTemplates }[],
): LessonProvider[] {
  const providers: LessonProvider[] = []
  for (const { meta, templates } of defs) {
    const previous = providers[providers.length - 1]
    const finalMeta: LessonMeta = previous
      ? { ...meta, requires: [previous.meta.id] }
      : { ...meta }
    providers.push(makeProvider(finalMeta, templates))
  }
  return providers
}
