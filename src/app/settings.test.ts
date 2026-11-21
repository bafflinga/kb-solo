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

const altArrowRight: Shortcut = {
  code: 'ArrowRight',
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
          nextLesson: altArrowRight,
        },
      }),
    )
    expect(store.load().shortcuts).toEqual({
      start: altEnter,
      pause: { ...altEnter, code: 'Space' },
      nextLesson: altArrowRight,
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
      shortcuts: {
        start: altEnter,
        pause: DEFAULT_SHORTCUTS.pause,
        nextLesson: altArrowRight,
      },
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

describe('settings generatedContent', () => {
  it('defaults to off with lorem sentences and a random area', () => {
    expect(DEFAULT_SETTINGS.generatedContent).toBe(false)
    expect(DEFAULT_SETTINGS.generationSentenceSource).toBe('lorem')
    expect(DEFAULT_SETTINGS.generationArea).toBe('random')
    expect(DEFAULT_SETTINGS.generationMinPhraseWords).toBe(5)
    const loaded = storeWith().store.load()
    expect(loaded.generatedContent).toBe(false)
    expect(loaded.generationSentenceSource).toBe('lorem')
    expect(loaded.generationArea).toBe('random')
    expect(loaded.generationMinPhraseWords).toBe(5)
  })

  it('migrates the old generatedDrills flag', () => {
    const { store } = storeWith(JSON.stringify({ generatedDrills: true }))
    expect(store.load().generatedContent).toBe(true)
    expect(store.load()).not.toHaveProperty('generatedDrills')
  })

  it('ignores invalid stored values', () => {
    const { store } = storeWith(
      JSON.stringify({
        generatedContent: 'yes',
        generationSentenceSource: 'unknown',
        generationArea: 'unknown',
        generationMinPhraseWords: 7,
      }),
    )
    const loaded = store.load()
    expect(loaded.generatedContent).toBe(false)
    expect(loaded.generationSentenceSource).toBe('lorem')
    expect(loaded.generationArea).toBe('random')
    expect(loaded.generationMinPhraseWords).toBe(5)
  })

  it('restores and persists explicit values', () => {
    const { store, values } = storeWith(
      JSON.stringify({
        generatedContent: true,
        generationSentenceSource: 'phrase',
        generationArea: 'hacker',
        generationMinPhraseWords: 12,
      }),
    )
    expect(store.load().generationArea).toBe('hacker')
    expect(store.load().generationMinPhraseWords).toBe(12)
    expect(
      JSON.parse(values.get('kb-solo.settings') ?? '{}').generationArea,
    ).toBe('hacker')
  })

  it('falls back to the default minimum for an invalid patch', () => {
    const { store } = storeWith()
    const next = store.update({
      generationMinPhraseWords: 7 as 5,
    })
    expect(next.generationMinPhraseWords).toBe(5)
  })

  it('resets non-phrase areas when switching to phrase sentences', () => {
    const { store } = storeWith(JSON.stringify({ generationArea: 'commerce' }))
    const next = store.update({ generationSentenceSource: 'phrase' })
    expect(next.generationArea).toBe('random')
  })

  it('resets hacker area when switching back to lorem sentences', () => {
    const { store } = storeWith(
      JSON.stringify({
        generationSentenceSource: 'phrase',
        generationArea: 'hacker',
      }),
    )
    const next = store.update({ generationSentenceSource: 'lorem' })
    expect(next.generationArea).toBe('random')
  })

  it('resolves a stored conflict in favour of generatedContent', () => {
    const { store } = storeWith(
      JSON.stringify({ generatedContent: true, randomTemplates: true }),
    )
    const loaded = store.load()
    expect(loaded.generatedContent).toBe(true)
    expect(loaded.randomTemplates).toBe(false)
  })

  it('enforces exclusivity when patching', () => {
    const { store } = storeWith(JSON.stringify({ randomTemplates: true }))
    const on = store.update({ generatedContent: true })
    expect(on.generatedContent).toBe(true)
    expect(on.randomTemplates).toBe(false)

    const off = store.update({ randomTemplates: true })
    expect(off.randomTemplates).toBe(true)
    expect(off.generatedContent).toBe(false)

    const both = store.update({
      randomTemplates: true,
      generatedContent: true,
    })
    expect(both.generatedContent).toBe(true)
    expect(both.randomTemplates).toBe(false)
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
