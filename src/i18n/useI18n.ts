import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { loadSettings, updateSettings } from '../app/settings'
import { messages } from './messages'
import type { MessageKey, UiLocale } from './messages'

export interface I18nValue {
  locale: UiLocale
  setLocale(locale: UiLocale): void
  t(key: MessageKey, vars?: Record<string, string | number>): string
  n(value: number): string
  d(value: number | Date): string
}

type Dictionary = (typeof messages)[UiLocale]

function lookup(dictionary: Dictionary, key: string): string | undefined {
  return (dictionary as Record<string, string>)[key]
}

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (vars === undefined) {
    return template
  }
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

// One shared locale for the whole tree. Every `useI18n` subscribes to this
// store, so switching the language re-renders consumers immediately instead of
// only the component that called `setLocale`.
const localeListeners = new Set<() => void>()

function subscribeToLocale(listener: () => void): () => void {
  localeListeners.add(listener)
  return () => {
    localeListeners.delete(listener)
  }
}

function getLocaleSnapshot(): UiLocale {
  return loadSettings().locale
}

function storeLocale(next: UiLocale): void {
  updateSettings({ locale: next })
  for (const listener of localeListeners) {
    listener()
  }
}

export function useI18n(): I18nValue {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    getLocaleSnapshot,
  )

  const setLocale = useCallback((next: UiLocale) => {
    storeLocale(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>): string => {
      const count = vars?.count
      let resolved: string = key
      if (typeof count === 'number') {
        const form = new Intl.PluralRules(locale).select(count)
        const pluralKey = `${key}_${form}`
        if (
          lookup(messages[locale], pluralKey) !== undefined ||
          lookup(messages.en, pluralKey) !== undefined
        ) {
          resolved = pluralKey
        }
      }
      const raw =
        lookup(messages[locale], resolved) ??
        lookup(messages.en, resolved) ??
        key
      return interpolate(raw, vars)
    },
    [locale],
  )

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    [locale],
  )

  const n = useCallback(
    (value: number) => numberFormatter.format(value),
    [numberFormatter],
  )
  const d = useCallback(
    (value: number | Date) =>
      dateFormatter.format(value instanceof Date ? value : new Date(value)),
    [dateFormatter],
  )

  return { locale, setLocale, t, n, d }
}

export default useI18n
