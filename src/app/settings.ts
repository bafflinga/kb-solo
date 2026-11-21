import type { ErrorMode } from '../domain/engine'
import { LANGUAGE_CODES } from '../domain/languages'
import { areaIdsForSource } from '../domain/lessons/generationAreas'
import type {
  GenerationAreaId,
  GenerationSentenceSource,
} from '../domain/lessons/generationAreas'
import { isLayoutId, layoutForProfile, profileOf } from '../domain/layout'
import { isPaceLevel } from '../domain/pacing'
import type { PaceLevel } from '../domain/pacing'
import type { Code, ContentLanguage, Finger, LayoutId } from '../domain/types'
import { LOCALES } from '../i18n/messages'
import type { UiLocale } from '../i18n/messages'
import { DEFAULT_SHORTCUTS, normalizeShortcutSettings } from './shortcuts'
import type { ShortcutSettings } from './shortcuts'
import { safeStorage } from '../storage/safeStorage'
import type { SafeStorage } from '../storage/safeStorage'

const SETTINGS_KEY = 'kb-solo.settings'

export interface AppSettings {
  locale: UiLocale
  contentLanguage: ContentLanguage
  layoutId: LayoutId
  sound: boolean
  showFeedback: boolean
  randomTemplates: boolean
  generatedContent: boolean
  generationSentenceSource: GenerationSentenceSource
  generationArea: GenerationAreaId | 'random'
  generationMinPhraseWords: GenerationMinPhraseWords
  paceLevel: PaceLevel
  errorMode: ErrorMode
  strictShift: boolean
  showContentEditor: boolean
  fingerOverrides: Partial<Record<Code, Finger>>
  shortcuts: ShortcutSettings
}

export type GenerationMinPhraseWords = 5 | 8 | 12

export const MIN_PHRASE_WORD_OPTIONS: readonly GenerationMinPhraseWords[] = [
  5, 8, 12,
]

export type ClearScope = PaceLevel | 'all'

export interface SettingsStore {
  load(): AppSettings
  update(patch: Partial<AppSettings>): AppSettings
}

function isUiLocale(value: unknown): value is UiLocale {
  return (
    typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
  )
}

function isContentLanguage(value: unknown): value is ContentLanguage {
  return (
    typeof value === 'string' &&
    (LANGUAGE_CODES as readonly string[]).includes(value)
  )
}

function detectLocale(): UiLocale {
  const preferred =
    typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : ''
  const match = LANGUAGE_CODES.find((code) => preferred.startsWith(code))
  return match !== undefined && isUiLocale(match) ? match : 'en'
}

const initialLocale = detectLocale()

export const DEFAULT_SETTINGS: AppSettings = {
  locale: initialLocale,
  contentLanguage: initialLocale,
  layoutId: layoutForProfile('pc', initialLocale),
  sound: true,
  showFeedback: false,
  randomTemplates: false,
  generatedContent: false,
  generationSentenceSource: 'lorem',
  generationArea: 'random',
  generationMinPhraseWords: 5,
  paceLevel: 'off',
  errorMode: 'block',
  strictShift: false,
  showContentEditor: false,
  fingerOverrides: {},
  shortcuts: DEFAULT_SHORTCUTS,
}

export function createSettingsStore(storage: SafeStorage): SettingsStore {
  function load(): AppSettings {
    const raw = storage.get(SETTINGS_KEY)
    if (raw === undefined) {
      return { ...DEFAULT_SETTINGS }
    }
    try {
      const stored = JSON.parse(raw) as Partial<AppSettings> & {
        generatedDrills?: unknown
      }
      const { generatedDrills: legacyGeneratedDrills, ...parsed } = stored
      const contentLanguage = isContentLanguage(parsed.contentLanguage)
        ? parsed.contentLanguage
        : DEFAULT_SETTINGS.contentLanguage
      const storedLayout = isLayoutId(parsed.layoutId)
        ? parsed.layoutId
        : DEFAULT_SETTINGS.layoutId
      const generatedContent =
        typeof parsed.generatedContent === 'boolean'
          ? parsed.generatedContent
          : legacyGeneratedDrills === true
      const randomTemplates =
        generatedContent && typeof parsed.randomTemplates === 'boolean'
          ? false
          : typeof parsed.randomTemplates === 'boolean'
            ? parsed.randomTemplates
            : DEFAULT_SETTINGS.randomTemplates
      const generationSentenceSource =
        parsed.generationSentenceSource === 'phrase' ? 'phrase' : 'lorem'
      const allowedAreas = areaIdsForSource(generationSentenceSource)
      const generationArea =
        parsed.generationArea === 'random' ||
        (typeof parsed.generationArea === 'string' &&
          allowedAreas.includes(parsed.generationArea as GenerationAreaId))
          ? (parsed.generationArea as GenerationAreaId | 'random')
          : DEFAULT_SETTINGS.generationArea
      const generationMinPhraseWords = MIN_PHRASE_WORD_OPTIONS.includes(
        parsed.generationMinPhraseWords as GenerationMinPhraseWords,
      )
        ? (parsed.generationMinPhraseWords as GenerationMinPhraseWords)
        : DEFAULT_SETTINGS.generationMinPhraseWords
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        locale: isUiLocale(parsed.locale)
          ? parsed.locale
          : DEFAULT_SETTINGS.locale,
        contentLanguage,
        layoutId: layoutForProfile(profileOf(storedLayout), contentLanguage),
        showFeedback:
          typeof parsed.showFeedback === 'boolean'
            ? parsed.showFeedback
            : DEFAULT_SETTINGS.showFeedback,
        randomTemplates,
        generatedContent,
        generationSentenceSource,
        generationArea,
        generationMinPhraseWords,
        paceLevel: isPaceLevel(parsed.paceLevel)
          ? parsed.paceLevel
          : DEFAULT_SETTINGS.paceLevel,
        showContentEditor:
          typeof parsed.showContentEditor === 'boolean'
            ? parsed.showContentEditor
            : DEFAULT_SETTINGS.showContentEditor,
        shortcuts:
          normalizeShortcutSettings(parsed.shortcuts) ?? DEFAULT_SHORTCUTS,
      }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  function update(patch: Partial<AppSettings>): AppSettings {
    const next = { ...load(), ...patch }
    if (next.generatedContent && next.randomTemplates) {
      if (patch.generatedContent === true) {
        next.randomTemplates = false
      } else {
        next.generatedContent = false
      }
    }
    const allowedAreas = areaIdsForSource(next.generationSentenceSource)
    if (
      next.generationArea !== 'random' &&
      !allowedAreas.includes(next.generationArea)
    ) {
      next.generationArea = 'random'
    }
    if (
      !MIN_PHRASE_WORD_OPTIONS.includes(
        next.generationMinPhraseWords as GenerationMinPhraseWords,
      )
    ) {
      next.generationMinPhraseWords = DEFAULT_SETTINGS.generationMinPhraseWords
    }
    storage.set(SETTINGS_KEY, JSON.stringify(next))
    return next
  }

  return { load, update }
}

export const settingsStore = createSettingsStore(safeStorage)

export function loadSettings(): AppSettings {
  return settingsStore.load()
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  return settingsStore.update(patch)
}
