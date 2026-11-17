// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../app/settings'
import type { AppSettings } from '../app/settings'
import { DEFAULT_SHORTCUTS, formatShortcut } from '../app/shortcuts'
import { useI18n } from '../i18n'
import { APP_VERSION } from '../version'
import { SettingsPanel } from './SettingsPanel'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

interface HarnessProps {
  settings: AppSettings
  onPatch(patch: Partial<AppSettings>): void
  onClearProgress(): void
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

  it('shows the configured shortcuts', async () => {
    await render()
    expect(container.textContent).toContain('Keyboard shortcuts')
    expect(container.textContent).toContain('Start / retry lesson')
    expect(container.textContent).toContain('Pause / resume')
    expect(container.querySelectorAll('.shortcut-keys')).toHaveLength(2)
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
