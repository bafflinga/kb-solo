import type { Faker } from '@faker-js/faker'
import type { ContentLanguage, Cue, Layout, LayoutId } from '../types'
import type { LessonFocus } from '../keyZones'
import type {
  GenerationAreaId,
  GenerationSentenceSource,
} from './generationAreas'

export type LessonKind = 'drill' | 'words' | 'prose' | 'code'

export interface LessonMeta {
  id: string
  language: ContentLanguage
  layoutId: LayoutId
  titleKey: string
  kind?: LessonKind
  descriptionKey?: string
  /** Physical key zones or character goals. Characters are derived per layout. */
  focus?: LessonFocus
  requires?: string[]
  /** Optional override. Real values are derived by `derivePacing` from the chosen pace and cues. */
  timeLimitSec?: number
  /** Optional override. Real values are derived by `derivePacing` from the chosen pace and cues. */
  targetWpm?: number
}

export interface LessonContent {
  formatVersion: number
  variants: unknown[]
  /** Layout the authored drill text is written in. Defaults to the lesson layout. */
  canonicalLayout?: LayoutId
  /** Legacy per-layout variant sets, read for backwards compatibility only. */
  layoutVariants?: Partial<Record<LayoutId, unknown[]>>
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
  faker?: Faker
  area?: GenerationAreaId | 'random'
  sentenceSource?: GenerationSentenceSource
  minPhraseWords?: number
}

export interface GenerationInfo {
  areaId: GenerationAreaId
  sentenceSource: GenerationSentenceSource
}

export interface GeneratedCuesResult {
  cues: Cue[]
  generation?: GenerationInfo
}

export interface LessonProvider {
  meta: LessonMeta
  kind: LessonKind
  templateCount: number
  createCues(layout?: Layout, options?: CreateCuesOptions): Cue[]
  createGeneratedCues?(
    layout?: Layout,
    options?: CreateCuesOptions,
  ): GeneratedCuesResult
}
