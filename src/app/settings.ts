import type { ErrorMode } from '../domain/engine'
import { isLayoutId, layoutForProfile, profileOf } from '../domain/layout'
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
  errorMode: ErrorMode
  strictShift: boolean
  fingerOverrides: Partial<Record<Code, Finger>>
  shortcuts: ShortcutSettings
}

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
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        locale:
          parsed.locale === 'en' || parsed.locale === 'ru'
            ? parsed.locale
            : DEFAULT_SETTINGS.locale,
        contentLanguage,
        layoutId: layoutForProfile(profileOf(storedLayout), contentLanguage),
        shortcuts:
          normalizeShortcutSettings(parsed.shortcuts) ?? DEFAULT_SHORTCUTS,
      }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  function update(patch: Partial<AppSettings>): AppSettings {
    const next = { ...load(), ...patch }
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
