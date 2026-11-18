import type { Code, ContentLanguage, Cue, Layout, LayoutId } from '../types'

export type LessonKind = 'drill' | 'words' | 'prose' | 'code'

export interface LessonMeta {
  id: string
  language: ContentLanguage
  layoutId: LayoutId
  titleKey: string
  kind?: LessonKind
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

export interface LessonContent {
  formatVersion: number
  variants: unknown[]
}

export type LessonContentMap = Readonly<Record<string, LessonContent>>

export interface LanguageContent {
  formatVersion: number
  language: ContentLanguage
  lessons: LessonContentMap
}

export interface CreateCuesOptions {
  variantIndex?: number
  generate?: boolean
}

export interface LessonProvider {
  meta: LessonMeta
  kind: LessonKind
  templateCount: number
  createCues(layout?: Layout, options?: CreateCuesOptions): Cue[]
}
