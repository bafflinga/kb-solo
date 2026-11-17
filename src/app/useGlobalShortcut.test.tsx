// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SHORTCUTS } from './shortcuts'
import type { Shortcut } from './shortcuts'
import { useGlobalShortcut } from './useGlobalShortcut'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

interface HarnessProps {
  shortcut: Shortcut
  enabled?: boolean
  onTrigger(): void
}

function Harness({ shortcut, enabled, onTrigger }: HarnessProps) {
  useGlobalShortcut({ shortcut, enabled, onTrigger })
  return null
}

const shortcut = DEFAULT_SHORTCUTS.start

describe('useGlobalShortcut', () => {
  let container: HTMLDivElement
  let root: Root
  let onTrigger: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    onTrigger = vi.fn<() => void>()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  async function render(enabled = true, value = shortcut): Promise<void> {
    await act(async () => {
      root.render(
        <Harness shortcut={value} enabled={enabled} onTrigger={onTrigger} />,
      )
    })
  }

  function press(init: KeyboardEventInit): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ...init,
    })
    window.dispatchEvent(event)
    return event
  }

  it('triggers and prevents the default on an exact match', async () => {
    await render()
    const event = press({
      code: 'Enter',
      key: 'Enter',
      ctrlKey: shortcut.ctrl,
      metaKey: shortcut.meta,
    })
    expect(onTrigger).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('ignores other combinations', async () => {
    await render()
    press({ code: 'Enter', key: 'Enter' })
    press({ code: 'KeyA', key: 'a', ctrlKey: shortcut.ctrl })
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('does not listen while disabled', async () => {
    await render(false)
    press({
      code: 'Enter',
      key: 'Enter',
      ctrlKey: shortcut.ctrl,
      metaKey: shortcut.meta,
    })
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('ignores repeats and already-handled events', async () => {
    await render()
    press({
      code: 'Enter',
      key: 'Enter',
      ctrlKey: shortcut.ctrl,
      repeat: true,
    })
    const event = new KeyboardEvent('keydown', {
      code: 'Enter',
      key: 'Enter',
      ctrlKey: shortcut.ctrl,
      cancelable: true,
    })
    event.preventDefault()
    window.dispatchEvent(event)
    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('uses the latest configured shortcut', async () => {
    await render()
    await render(true, {
      ...shortcut,
      code: 'KeyA',
      ctrl: false,
      meta: false,
      alt: true,
    })
    press({ code: 'Enter', key: 'Enter', ctrlKey: shortcut.ctrl })
    expect(onTrigger).not.toHaveBeenCalled()
    press({ code: 'KeyA', key: 'a', altKey: true })
    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('removes the listener on unmount', async () => {
    await render()
    act(() => {
      root.unmount()
    })
    press({
      code: 'Enter',
      key: 'Enter',
      ctrlKey: shortcut.ctrl,
      metaKey: shortcut.meta,
    })
    expect(onTrigger).not.toHaveBeenCalled()
  })
})
