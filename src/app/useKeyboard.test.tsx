// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useKeyboard } from './useKeyboard'
import type { KeyboardInput } from './useKeyboard'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

interface HarnessProps {
  active: boolean
  onKey(input: KeyboardInput): void
  onBackspace(): void
  inputCode?(code: string): string
}

function Harness({ active, onKey, onBackspace, inputCode }: HarnessProps) {
  useKeyboard({ active, onKey, onBackspace, inputCode })
  return null
}

describe('useKeyboard', () => {
  let container: HTMLDivElement
  let root: Root
  let onKey: ReturnType<typeof vi.fn<(input: KeyboardInput) => void>>
  let onBackspace: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    onKey = vi.fn<(input: KeyboardInput) => void>()
    onBackspace = vi.fn<() => void>()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  async function render(
    active = true,
    inputCode?: (code: string) => string,
  ): Promise<void> {
    await act(async () => {
      root.render(
        <Harness
          active={active}
          onKey={onKey}
          onBackspace={onBackspace}
          inputCode={inputCode}
        />,
      )
    })
  }

  function press(
    init: KeyboardEventInit,
    target: EventTarget = window,
  ): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ...init,
    })
    target.dispatchEvent(event)
    return event
  }

  it('passes a letter through with its modifiers', async () => {
    await render()

    const event = press({
      code: 'KeyA',
      key: 'A',
      shiftKey: true,
      altKey: true,
      repeat: true,
      isComposing: true,
    })

    expect(event.defaultPrevented).toBe(false)
    expect(onKey).toHaveBeenCalledTimes(1)
    expect(onKey.mock.calls[0]?.[0]).toEqual({
      code: 'KeyA',
      char: 'A',
      shift: true,
      alt: true,
      repeat: true,
      isComposing: true,
    })
    expect(onBackspace).not.toHaveBeenCalled()
  })

  it('normalizes codes through the inputCode option', async () => {
    await render(true, (code) =>
      code === 'Backquote' ? 'IntlBackslash' : code,
    )

    press({ code: 'Backquote', key: ']' })

    expect(onKey.mock.calls[0]?.[0].code).toBe('IntlBackslash')
    expect(onKey.mock.calls[0]?.[0].char).toBe(']')
  })

  it('routes Backspace and prevents its default action', async () => {
    await render()

    const event = press({ code: 'Backspace', key: 'Backspace' })

    expect(event.defaultPrevented).toBe(true)
    expect(onBackspace).toHaveBeenCalledTimes(1)
    expect(onKey).not.toHaveBeenCalled()
  })

  it('maps Space and Enter and prevents scrolling or submission', async () => {
    await render()

    const space = press({ code: 'Space', key: ' ' })
    const enter = press({ code: 'Enter', key: 'Enter' })
    const tab = press({ code: 'Tab', key: 'Tab' })

    expect(space.defaultPrevented).toBe(true)
    expect(enter.defaultPrevented).toBe(true)
    expect(tab.defaultPrevented).toBe(true)
    expect(onKey.mock.calls.map((call) => call[0].char)).toEqual([
      ' ',
      'Enter',
      'Tab',
    ])
  })

  it('ignores shortcuts with Control or Meta', async () => {
    await render()

    press({ code: 'KeyA', key: 'a', ctrlKey: true })
    press({ code: 'KeyR', key: 'r', metaKey: true })

    expect(onKey).not.toHaveBeenCalled()
  })

  it('ignores events from editable controls and links', async () => {
    await render()
    const input = document.createElement('input')
    const link = document.createElement('a')
    document.body.append(input, link)

    press({ code: 'KeyA', key: 'a' }, input)
    press({ code: 'KeyB', key: 'b' }, link)

    expect(onKey).not.toHaveBeenCalled()
    input.remove()
    link.remove()
  })

  it('ignores events that were already handled', async () => {
    await render()
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'KeyA',
      key: 'a',
    })
    event.preventDefault()

    window.dispatchEvent(event)

    expect(onKey).not.toHaveBeenCalled()
  })

  it('does not listen while inactive', async () => {
    await render(false)

    press({ code: 'KeyA', key: 'a' })
    press({ code: 'Backspace', key: 'Backspace' })

    expect(onKey).not.toHaveBeenCalled()
    expect(onBackspace).not.toHaveBeenCalled()
  })
})
