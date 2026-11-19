import type { Faker } from '@faker-js/faker'
import type { Code, ContentLanguage, Cue, Layout, LayoutId } from '../types'
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
  order: number
  difficulty: 1 | 2 | 3 | 4 | 5
  focusCodes?: Code[]
  /** Codes whose physical key identity must be preserved when remapping across layouts. */
  identityCodes?: Code[]
  /** Focus codes used only when the active layout matches the key exactly. */
  layoutFocusCodes?: Partial<Record<LayoutId, Code[]>>
  requires?: string[]
  /** Optional override. Real values are derived by `derivePacing` from the chosen pace and cues. */
  timeLimitSec?: number
  /** Optional override. Real values are derived by `derivePacing` from the chosen pace and cues. */
  targetWpm?: number
}

export interface LessonContent {
  formatVersion: number
  variants: unknown[]
  /** Variant sets used only when the active layout matches the key exactly. */
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
