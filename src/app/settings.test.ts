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

describe('settings showContentEditor', () => {
  it('defaults to hidden, including for older saved settings', () => {
    expect(DEFAULT_SETTINGS.showContentEditor).toBe(false)
    expect(storeWith().store.load().showContentEditor).toBe(false)
    expect(
      storeWith(JSON.stringify({ sound: false })).store.load()
        .showContentEditor,
    ).toBe(false)
  })

  it('ignores non-boolean values and restores an explicit one', () => {
    expect(
      storeWith(JSON.stringify({ showContentEditor: 'yes' })).store.load()
        .showContentEditor,
    ).toBe(false)
    const { store, values } = storeWith(
      JSON.stringify({ showContentEditor: true }),
    )
    expect(store.load().showContentEditor).toBe(true)
    expect(
      JSON.parse(values.get('kb-solo.settings') ?? '{}').showContentEditor,
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

describe('settings randomTemplates', () => {
  it('defaults to off', () => {
    expect(DEFAULT_SETTINGS.randomTemplates).toBe(false)
    expect(storeWith().store.load().randomTemplates).toBe(false)
  })

  it('defaults to off for settings saved before the option existed', () => {
    const { store } = storeWith(JSON.stringify({ sound: false }))
    expect(store.load().randomTemplates).toBe(false)
  })

  it('restores and persists an explicit value', () => {
    const { store, values } = storeWith(
      JSON.stringify({ randomTemplates: true }),
    )
    expect(store.load().randomTemplates).toBe(true)
    expect(
      JSON.parse(values.get('kb-solo.settings') ?? '{}').randomTemplates,
    ).toBe(true)
  })
})

describe('settings generatedDrills', () => {
  it('defaults to off', () => {
    expect(DEFAULT_SETTINGS.generatedDrills).toBe(false)
    expect(storeWith().store.load().generatedDrills).toBe(false)
  })

  it('defaults to off for settings saved before the option existed', () => {
    const { store } = storeWith(JSON.stringify({ sound: false }))
    expect(store.load().generatedDrills).toBe(false)
  })

  it('falls back to off for an invalid stored value', () => {
    const { store } = storeWith(JSON.stringify({ generatedDrills: 'yes' }))
    expect(store.load().generatedDrills).toBe(false)
  })

  it('restores and persists an explicit value', () => {
    const { store, values } = storeWith(
      JSON.stringify({ generatedDrills: true }),
    )
    expect(store.load().generatedDrills).toBe(true)
    expect(
      JSON.parse(values.get('kb-solo.settings') ?? '{}').generatedDrills,
    ).toBe(true)
  })

  it('resolves a stored conflict in favour of generatedDrills', () => {
    const { store } = storeWith(
      JSON.stringify({ generatedDrills: true, randomTemplates: true }),
    )
    const loaded = store.load()
    expect(loaded.generatedDrills).toBe(true)
    expect(loaded.randomTemplates).toBe(false)
  })

  it('turning generatedDrills on turns randomTemplates off', () => {
    const { store } = storeWith(JSON.stringify({ randomTemplates: true }))
    const next = store.update({ generatedDrills: true })
    expect(next.generatedDrills).toBe(true)
    expect(next.randomTemplates).toBe(false)
  })

  it('turning randomTemplates on turns generatedDrills off', () => {
    const { store } = storeWith(JSON.stringify({ generatedDrills: true }))
    const next = store.update({ randomTemplates: true })
    expect(next.randomTemplates).toBe(true)
    expect(next.generatedDrills).toBe(false)
  })

  it('turning one off leaves both off', () => {
    const { store } = storeWith(JSON.stringify({ generatedDrills: true }))
    const next = store.update({ generatedDrills: false })
    expect(next.generatedDrills).toBe(false)
    expect(next.randomTemplates).toBe(false)
  })

  it('generatedDrills wins if both are patched on', () => {
    const { store } = storeWith()
    const next = store.update({
      randomTemplates: true,
      generatedDrills: true,
    })
    expect(next.generatedDrills).toBe(true)
    expect(next.randomTemplates).toBe(false)
  })
})

describe('settings paceLevel', () => {
  it('defaults to off', () => {
    expect(DEFAULT_SETTINGS.paceLevel).toBe('off')
    expect(storeWith().store.load().paceLevel).toBe('off')
  })

  it('defaults to off for settings saved before the option existed', () => {
    const { store } = storeWith(JSON.stringify({ sound: false }))
    expect(store.load().paceLevel).toBe('off')
  })

  it('falls back to off for an invalid stored value', () => {
    const { store } = storeWith(JSON.stringify({ paceLevel: 'turbo' }))
    expect(store.load().paceLevel).toBe('off')
  })

  it('restores and persists an explicit value', () => {
    const { store, values } = storeWith(
      JSON.stringify({ paceLevel: 'challenging' }),
    )
    expect(store.load().paceLevel).toBe('challenging')
    expect(JSON.parse(values.get('kb-solo.settings') ?? '{}').paceLevel).toBe(
      'challenging',
    )
  })

  it('accepts and persists the hardcore level', () => {
    const { store, values } = storeWith(
      JSON.stringify({ paceLevel: 'hardcore' }),
    )
    expect(store.load().paceLevel).toBe('hardcore')
    expect(JSON.parse(values.get('kb-solo.settings') ?? '{}').paceLevel).toBe(
      'hardcore',
    )
  })
})
