// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentToast } from './ContentToast'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

describe('ContentToast', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.useRealTimers()
  })

  it('dismisses itself after three seconds', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()

    await act(async () => {
      root.render(
        <ContentToast
          message={{ id: 1, text: 'Content saved' }}
          onDismiss={onDismiss}
        />,
      )
    })

    expect(container.textContent).toContain('Content saved')
    expect(container.querySelector('[role="status"]')).not.toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('renders nothing without a message', async () => {
    await act(async () => {
      root.render(<ContentToast message={null} onDismiss={vi.fn()} />)
    })

    expect(container.textContent).toBe('')
  })
})
