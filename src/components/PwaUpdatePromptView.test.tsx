// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PwaUpdatePromptView from './PwaUpdatePromptView'
import type { PwaUpdatePromptViewProps } from './PwaUpdatePromptView'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

describe('PwaUpdatePromptView', () => {
  let container: HTMLDivElement
  let root: Root
  let props: PwaUpdatePromptViewProps
  let onReload: () => void
  let onDismissUpdate: () => void
  let onDismissOffline: () => void

  function findButton(label: string): HTMLButtonElement {
    const button = [...container.querySelectorAll('button')].find(
      (element) => element.textContent === label,
    )
    if (!button) throw new Error(`missing button: ${label}`)
    return button
  }

  async function renderView(patch: Partial<PwaUpdatePromptViewProps> = {}) {
    await act(async () => {
      root.render(<PwaUpdatePromptView {...props} {...patch} />)
    })
  }

  beforeEach(() => {
    localStorage.clear()
    onReload = vi.fn()
    onDismissUpdate = vi.fn()
    onDismissOffline = vi.fn()
    props = {
      needRefresh: false,
      offlineReady: false,
      onReload,
      onDismissUpdate,
      onDismissOffline,
    }
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('renders nothing when there is no notification', async () => {
    await renderView()

    expect(container.querySelector('.pwa-toast')).toBeNull()
  })

  it('shows the update prompt with priority over offline ready', async () => {
    await renderView({ needRefresh: true, offlineReady: true })

    expect(container.textContent).toContain('A new version is available')
    expect(container.textContent).not.toContain('Available offline')
    expect(container.querySelector('.pwa-toast-update')).not.toBeNull()
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('reloads and dismisses the update prompt', async () => {
    await renderView({ needRefresh: true })

    await act(async () => {
      findButton('Reload').click()
    })
    expect(onReload).toHaveBeenCalledTimes(1)

    await act(async () => {
      findButton('Close').click()
    })
    expect(onDismissUpdate).toHaveBeenCalledTimes(1)
  })

  it('shows and dismisses the offline-ready notification', async () => {
    await renderView({ offlineReady: true })

    expect(container.textContent).toContain('Available offline')
    expect(container.querySelector('.pwa-toast-offline')).not.toBeNull()
    expect(
      container.querySelector('[role="status"][aria-live="polite"]'),
    ).not.toBeNull()

    await act(async () => {
      findButton('Dismiss').click()
    })
    expect(onDismissOffline).toHaveBeenCalledTimes(1)
  })
})
