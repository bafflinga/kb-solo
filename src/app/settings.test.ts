import { describe, expect, it } from 'vitest'
import { createSettingsStore, DEFAULT_SETTINGS } from './settings'
import { DEFAULT_SHORTCUTS } from './shortcuts'
import type { Shortcut } from './shortcuts'
import { createSafeStorage } from '../storage/safeStorage'

const altEnter: Shortcut = {
  code: 'Enter',
  ctrl: false,
  meta: false,
  alt: true,
  shift: false,
}

function storeWith(raw?: string) {
  const values = new Map<string, string>()
  if (raw !== undefined) {
    values.set('kb-solo.settings', raw)
  }
  const storage = createSafeStorage({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  })
  return { store: createSettingsStore(storage), values }
}

describe('settings showFeedback', () => {
  it('defaults to hidden', () => {
    expect(DEFAULT_SETTINGS.showFeedback).toBe(false)
    expect(storeWith().store.load().showFeedback).toBe(false)
  })

  it('defaults to hidden for settings saved before the option existed', () => {
    const { store } = storeWith(JSON.stringify({ sound: false }))
    expect(store.load().showFeedback).toBe(false)
  })

  it('restores and persists an explicit value', () => {
    const { store, values } = storeWith(JSON.stringify({ showFeedback: true }))
    expect(store.load().showFeedback).toBe(true)
    expect(
      JSON.parse(values.get('kb-solo.settings') ?? '{}').showFeedback,
    ).toBe(true)
  })
})

describe('settings shortcuts', () => {
  it('uses the platform defaults when nothing is stored', () => {
    const { store } = storeWith()
    expect(store.load().shortcuts).toEqual(DEFAULT_SHORTCUTS)
    expect(DEFAULT_SETTINGS.shortcuts).toEqual(DEFAULT_SHORTCUTS)
  })

  it('migrates settings saved before shortcuts existed', () => {
    const { store } = storeWith(
      JSON.stringify({ sound: false, errorMode: 'advance' }),
    )
    const loaded = store.load()
    expect(loaded.sound).toBe(false)
    expect(loaded.errorMode).toBe('advance')
    expect(loaded.shortcuts).toEqual(DEFAULT_SHORTCUTS)
  })

  it('restores valid stored shortcuts', () => {
    const { store } = storeWith(
      JSON.stringify({
        shortcuts: {
          start: altEnter,
          pause: { ...altEnter, code: 'Space' },
        },
      }),
    )
    expect(store.load().shortcuts).toEqual({
      start: altEnter,
      pause: { ...altEnter, code: 'Space' },
    })
  })

  it('falls back to defaults when a stored shortcut is invalid', () => {
    const { store } = storeWith(
      JSON.stringify({
        shortcuts: {
          start: { code: 'Enter' },
          pause: altEnter,
        },
      }),
    )
    expect(store.load().shortcuts).toEqual(DEFAULT_SHORTCUTS)
  })

  it('persists shortcut updates', () => {
    const { store, values } = storeWith()
    const next = store.update({
      shortcuts: { start: altEnter, pause: DEFAULT_SHORTCUTS.pause },
    })
    expect(next.shortcuts.start).toEqual(altEnter)
    expect(
      JSON.parse(values.get('kb-solo.settings') ?? '{}').shortcuts.start,
    ).toEqual(altEnter)
  })
})
