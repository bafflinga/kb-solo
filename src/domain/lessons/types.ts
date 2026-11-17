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
  timeLimitSec?: number
  targetWpm?: number
}

export interface LessonProvider {
  meta: LessonMeta
  createCues(layout?: Layout): Cue[]
}
