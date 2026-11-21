// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../app/settings'
import type { AppSettings, ClearScope } from '../app/settings'
import { DEFAULT_SHORTCUTS, formatShortcut } from '../app/shortcuts'
import { PACE_LEVELS } from '../domain/pacing'
import { messages, useI18n } from '../i18n'
import type { MessageKey } from '../i18n'
import { APP_VERSION } from '../version'

vi.mock('../domain/lessons/fakerGenerator', () => ({
  loadFaker: async () => ({}),
  generateText: (
    _faker: unknown,
    _area: unknown,
    _source: unknown,
    _layout: unknown,
    minWords = 5,
  ) => ({
    areaId: 'commerce',
    sentenceSource: 'lorem',
    words: ['alpha', 'beta', `gamma${minWords}`],
    sentences: 'Alpha beta gamma.',
  }),
}))
import { SettingsPanel } from './SettingsPanel'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

interface HarnessProps {
  settings: AppSettings
  onPatch(patch: Partial<AppSettings>): void
  onClearProgress(scope: ClearScope): void
}

function Harness({ settings, onPatch, onClearProgress }: HarnessProps) {
  const i18n = useI18n()
  return (
    <SettingsPanel
      settings={settings}
      onPatch={onPatch}
      onClearProgress={onClearProgress}
      i18n={i18n}
    />
  )
}

describe('SettingsPanel shortcuts', () => {
  let container: HTMLDivElement
  let root: Root
  let onPatch: ReturnType<typeof vi.fn<(patch: Partial<AppSettings>) => void>>

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    onPatch = vi.fn<(patch: Partial<AppSettings>) => void>()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  async function render(settings = DEFAULT_SETTINGS): Promise<void> {
    await act(async () => {
      root.render(
        <Harness
          settings={settings}
          onPatch={onPatch}
          onClearProgress={() => undefined}
        />,
      )
    })
  }

  function button(label: string, index = 0): HTMLButtonElement {
    const buttons = [...container.querySelectorAll('button')].filter(
      (element) => element.textContent === label,
    )
    const found = buttons[index]
    expect(found, `${label} #${index}`).toBeDefined()
    return found as HTMLButtonElement
  }

  async function click(element: HTMLButtonElement): Promise<void> {
    await act(async () => {
      element.click()
    })
  }

  async function press(init: KeyboardEventInit): Promise<void> {
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          ...init,
        }),
      )
    })
  }

  it('uses three columns with a version footer', async () => {
    await render()
    await act(async () => {})

    const grid = container.querySelector('.settings-grid')
    expect(grid).not.toBeNull()
    const columns = [
      ...(grid as HTMLElement).querySelectorAll(':scope > .settings-column'),
    ]
    expect(columns).toHaveLength(3)

    expect(columns[0]?.textContent).toContain('Typing')
    expect(columns[0]?.textContent).toContain('Difficulty')
    expect(columns[0]?.textContent).toContain('Layout')
    expect(columns[0]?.textContent).toContain('Error mode')
    expect(columns[0]?.textContent).toContain('Keyboard shortcuts')

    expect(columns[1]?.textContent).toContain('Generation')
    expect(columns[1]?.textContent).toContain('Random templates')

    expect(columns[2]?.textContent).toContain('General')
    expect(columns[2]?.textContent).toContain('Sound')
    expect(columns[2]?.textContent).toContain('Data')

    const footer = (grid as HTMLElement).lastElementChild
    expect(footer?.classList.contains('settings-footer')).toBe(true)
    expect(footer?.textContent).toContain(
      `${messages.en.version} ${APP_VERSION}`,
    )
  })

  it('toggles the show feedback setting', async () => {
    await render()
    const label = [...container.querySelectorAll('label')].find(
      (element) => element.textContent === 'Show feedback',
    )
    const checkbox = label?.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeDefined()
    const input = checkbox as HTMLInputElement
    expect(input.checked).toBe(false)

    await act(async () => {
      input.click()
    })
    expect(onPatch).toHaveBeenCalledWith({ showFeedback: true })
  })

  it('toggles the show content editor setting', async () => {
    await render()
    const label = [...container.querySelectorAll('label')].find(
      (element) => element.textContent === 'Show content editor',
    )
    const checkbox = label?.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeDefined()
    const input = checkbox as HTMLInputElement
    expect(input.checked).toBe(false)

    await act(async () => {
      input.click()
    })
    expect(onPatch).toHaveBeenCalledWith({ showContentEditor: true })
  })

  it('shows the configured shortcuts', async () => {
    await render()
    expect(container.textContent).toContain('Keyboard shortcuts')
    expect(container.textContent).toContain('Start / retry lesson')
    expect(container.textContent).toContain('Pause / resume')
    expect(container.textContent).toContain('Next Lesson')
    expect(container.querySelectorAll('.shortcut-keys')).toHaveLength(3)
    expect(container.querySelector('.shortcut-keys')?.textContent).toBe(
      formatShortcut(DEFAULT_SHORTCUTS.start, (code) =>
        code === 'Enter' ? 'Enter' : undefined,
      ),
    )
  })

  it('records a new combination', async () => {
    await render()
    await click(button('Change'))

    expect(container.querySelector('.shortcut-keys')?.textContent).toBe(
      'Press keys…',
    )
    await press({ code: 'KeyA', key: 'a', altKey: true })

    expect(onPatch).toHaveBeenCalledWith({
      shortcuts: {
        ...DEFAULT_SHORTCUTS,
        start: {
          code: 'KeyA',
          ctrl: false,
          meta: false,
          alt: true,
          shift: false,
        },
      },
    })
  })

  it('cancels recording with Escape', async () => {
    await render()
    await click(button('Change'))
    await press({ code: 'Escape', key: 'Escape' })

    expect(onPatch).not.toHaveBeenCalled()
    expect(container.querySelector('.shortcut-keys')?.textContent).not.toBe(
      'Press keys…',
    )
  })

  it('ignores modifier-only keys while recording', async () => {
    await render()
    await click(button('Change'))
    await press({ code: 'ControlLeft', key: 'Control', ctrlKey: true })

    expect(container.querySelector('.shortcut-keys')?.textContent).toBe(
      'Press keys…',
    )
    expect(onPatch).not.toHaveBeenCalled()
  })

  it('rejects a combination without modifiers', async () => {
    await render()
    await click(button('Change'))
    await press({ code: 'Enter', key: 'Enter' })

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Add Ctrl',
    )
    expect(onPatch).not.toHaveBeenCalled()
  })

  it('rejects a browser-reserved combination', async () => {
    await render()
    await click(button('Change'))
    await press({ code: 'KeyR', key: 'r', ctrlKey: true })

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'reserved',
    )
    expect(onPatch).not.toHaveBeenCalled()
  })

  it('records the pause shortcut independently', async () => {
    await render()
    await click(button('Change', 1))
    await press({ code: 'Space', key: ' ', altKey: true })

    expect(onPatch).toHaveBeenCalledWith({
      shortcuts: {
        ...DEFAULT_SHORTCUTS,
        pause: {
          code: 'Space',
          ctrl: false,
          meta: false,
          alt: true,
          shift: false,
        },
      },
    })
  })

  it('resets a shortcut to its default', async () => {
    const changed: AppSettings = {
      ...DEFAULT_SETTINGS,
      shortcuts: {
        ...DEFAULT_SHORTCUTS,
        start: {
          code: 'KeyA',
          ctrl: false,
          meta: false,
          alt: true,
          shift: false,
        },
      },
    }
    await render(changed)
    await click(button('Reset'))

    expect(onPatch).toHaveBeenCalledWith({
      shortcuts: { ...changed.shortcuts, start: DEFAULT_SHORTCUTS.start },
    })
  })

  it('shows the package version', async () => {
    await render()
    expect(container.textContent).toContain(`Version ${APP_VERSION}`)
  })
})

describe('SettingsPanel pace', () => {
  let container: HTMLDivElement
  let root: Root
  let onPatch: ReturnType<typeof vi.fn<(patch: Partial<AppSettings>) => void>>
  let onClearProgress: ReturnType<typeof vi.fn<(scope: string) => void>>

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    onPatch = vi.fn()
    onClearProgress = vi.fn()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  async function render(settings = DEFAULT_SETTINGS): Promise<void> {
    await act(async () => {
      root.render(
        <Harness
          settings={settings}
          onPatch={onPatch}
          onClearProgress={onClearProgress}
        />,
      )
    })
  }

  function selectFor(label: string): HTMLSelectElement {
    const field = [...container.querySelectorAll('label')].find((element) =>
      element.textContent?.includes(label),
    )
    const select = field?.querySelector('select')
    expect(select).toBeDefined()
    return select as HTMLSelectElement
  }

  it('shows generated content controls and preview when enabled', async () => {
    await render({
      ...DEFAULT_SETTINGS,
      generatedContent: true,
      generationSentenceSource: 'phrase',
      generationArea: 'book',
      generationMinPhraseWords: 8,
    })
    await act(async () => {})

    const label = [...container.querySelectorAll('label')].find(
      (element) => element.textContent === 'Generated content',
    )
    const input = label?.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement | null
    expect(input?.checked).toBe(true)
    expect(container.textContent).toContain(messages.en.generatedContentHint)

    const source = selectFor('Sentences')
    expect(source.value).toBe('phrase')
    const area = selectFor('Area')
    expect(area.value).toBe('book')
    expect([...area.options].map((option) => option.value)).toEqual([
      'random',
      'company',
      'hacker',
      'book',
      'music',
    ])
    const minWords = selectFor('Minimum phrase length')
    expect(minWords.value).toBe('8')
    expect([...minWords.options].map((option) => option.value)).toEqual([
      '5',
      '8',
      '12',
    ])
    expect(container.textContent).toContain('alpha beta gamma8')
    const generationColumn = container.querySelectorAll('.settings-column')[1]
    expect(generationColumn?.textContent).toContain('Minimum phrase length')

    await act(async () => {
      input?.click()
    })
    expect(onPatch).toHaveBeenCalledWith({ generatedContent: false })
  })

  it('changes the pace level', async () => {
    await render()
    const select = selectFor('Difficulty')
    expect(select.value).toBe('off')

    await act(async () => {
      select.value = 'standard'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onPatch).toHaveBeenCalledWith({ paceLevel: 'standard' })
  })

  it('offers every pace level and shows its own hint', async () => {
    await render()
    expect(
      [...selectFor('Difficulty').options].map((option) => option.value),
    ).toEqual(PACE_LEVELS)

    for (const level of PACE_LEVELS) {
      await render({ ...DEFAULT_SETTINGS, paceLevel: level })
      const hintKey = `pace.${level}Hint` as MessageKey

      expect(selectFor('Difficulty').value).toBe(level)
      expect(container.textContent).toContain(messages.en[hintKey])
    }
  })

  it('clears all levels by default and the current level on request', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await render({ ...DEFAULT_SETTINGS, paceLevel: 'relaxed' })
    const scope = selectFor('Clear progress for')
    expect(scope.value).toBe('all')
    const button = [...container.querySelectorAll('button')].find(
      (element) => element.textContent === 'Clear all progress',
    )
    expect(button).toBeDefined()

    await act(async () => button?.click())
    expect(onClearProgress).toHaveBeenCalledWith('all')

    await act(async () => {
      scope.value = 'relaxed'
      scope.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => button?.click())
    expect(onClearProgress).toHaveBeenCalledWith('relaxed')
  })
})
