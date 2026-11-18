import type { ErrorMode } from '../domain/engine'
import { isLayoutId, layoutForProfile, profileOf } from '../domain/layout'
import { isPaceLevel } from '../domain/pacing'
import type { PaceLevel } from '../domain/pacing'
import type { Code, ContentLanguage, Finger, LayoutId } from '../domain/types'
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
  generatedDrills: boolean
  paceLevel: PaceLevel
  errorMode: ErrorMode
  strictShift: boolean
  fingerOverrides: Partial<Record<Code, Finger>>
  shortcuts: ShortcutSettings
}

export type ClearScope = PaceLevel | 'all'

export interface SettingsStore {
  load(): AppSettings
  update(patch: Partial<AppSettings>): AppSettings
}

function detectLocale(): UiLocale {
  if (typeof navigator !== 'undefined' && navigator.language.startsWith('ru')) {
    return 'ru'
  }
  return 'en'
}

const initialLocale = detectLocale()

export const DEFAULT_SETTINGS: AppSettings = {
  locale: initialLocale,
  contentLanguage: initialLocale,
  layoutId: layoutForProfile('pc', initialLocale),
  sound: true,
  showFeedback: false,
  randomTemplates: false,
  generatedDrills: false,
  paceLevel: 'off',
  errorMode: 'block',
  strictShift: false,
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
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      const contentLanguage =
        parsed.contentLanguage === 'en' || parsed.contentLanguage === 'ru'
          ? parsed.contentLanguage
          : DEFAULT_SETTINGS.contentLanguage
      const storedLayout = isLayoutId(parsed.layoutId)
        ? parsed.layoutId
        : DEFAULT_SETTINGS.layoutId
      const generatedDrills =
        typeof parsed.generatedDrills === 'boolean'
          ? parsed.generatedDrills
          : DEFAULT_SETTINGS.generatedDrills
      const randomTemplates =
        generatedDrills &&
        typeof parsed.randomTemplates === 'boolean'
          ? false
          : typeof parsed.randomTemplates === 'boolean'
            ? parsed.randomTemplates
            : DEFAULT_SETTINGS.randomTemplates
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        locale:
          parsed.locale === 'en' || parsed.locale === 'ru'
            ? parsed.locale
            : DEFAULT_SETTINGS.locale,
        contentLanguage,
        layoutId: layoutForProfile(profileOf(storedLayout), contentLanguage),
        showFeedback:
          typeof parsed.showFeedback === 'boolean'
            ? parsed.showFeedback
            : DEFAULT_SETTINGS.showFeedback,
        randomTemplates,
        generatedDrills,
        paceLevel: isPaceLevel(parsed.paceLevel)
          ? parsed.paceLevel
          : DEFAULT_SETTINGS.paceLevel,
        shortcuts:
          normalizeShortcutSettings(parsed.shortcuts) ?? DEFAULT_SHORTCUTS,
      }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  function update(patch: Partial<AppSettings>): AppSettings {
    const next = { ...load(), ...patch }
    if (next.generatedDrills && next.randomTemplates) {
      if (patch.generatedDrills === true) {
        next.randomTemplates = false
      } else {
        next.generatedDrills = false
      }
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
