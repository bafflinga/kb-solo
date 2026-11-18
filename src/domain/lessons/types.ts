import type { Code, ContentLanguage, Cue, Layout, LayoutId } from '../types'

export interface LessonMeta {
  id: string
  language: ContentLanguage
  layoutId: LayoutId
  titleKey: string
  descriptionKey?: string
  order: number
  difficulty: 1 | 2 | 3 | 4 | 5
  focusCodes?: Code[]
  requires?: string[]
  /** Optional override. Real values are derived by `derivePacing` from the chosen pace and cues. */
  timeLimitSec?: number
  /** Optional override. Real values are derived by `derivePacing` from the chosen pace and cues. */
  targetWpm?: number
}

export interface CreateCuesOptions {
  variantIndex?: number
  generate?: boolean
}

export interface LessonProvider {
  meta: LessonMeta
  kind: LessonTemplates['kind']
  templateCount: number
  createCues(layout?: Layout, options?: CreateCuesOptions): Cue[]
}

export type LessonTemplates =
  | { kind: 'drill'; variants: readonly string[] }
  | { kind: 'words'; variants: readonly (readonly string[])[] }
  | { kind: 'prose' | 'code'; variants: readonly string[] }
