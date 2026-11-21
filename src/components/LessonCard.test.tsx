// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LessonMeta } from '../domain/lessons/types'
import { LessonCard } from './LessonCard'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

const meta: LessonMeta = {
  id: 'en-home-left',
  language: 'en',
  layoutId: 'us-qwerty',
  titleKey: 'lesson.homeLeft',
}

describe('LessonCard', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    localStorage.clear()
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

  async function render(
    options: {
      stars?: 0 | 1 | 2 | 3
      bestNetWpm?: number
      unlocked?: boolean
      onSelect?: () => void
      onHover?: (id: string | null) => void
    } = {},
  ): Promise<void> {
    await act(async () => {
      root.render(
        <ul>
          <LessonCard
            meta={meta}
            stars={options.stars ?? 0}
            bestNetWpm={options.bestNetWpm ?? 0}
            unlocked={options.unlocked ?? true}
            onSelect={options.onSelect ?? (() => {})}
            onHover={options.onHover}
          />
        </ul>,
      )
    })
  }

  it('shows the title, stars and best speed', async () => {
    await render({ stars: 2, bestNetWpm: 34 })

    expect(container.textContent).toContain('Home row: left hand')
    expect(container.querySelector('.stars')?.textContent).toBe('★★☆')
    expect(container.textContent).toContain('Best: 34 WPM')
  })

  it('hides the best speed before any completed run', async () => {
    await render()

    expect(container.textContent).not.toContain('Best')
    expect(container.querySelector('.stars')?.textContent).toBe('☆☆☆')
  })

  it('calls onSelect for an unlocked lesson', async () => {
    const onSelect = vi.fn()
    await render({ onSelect })

    const button = container.querySelector('button')
    await act(async () => {
      button?.click()
    })

    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('disables a locked lesson and explains why', async () => {
    const onSelect = vi.fn()
    await render({ unlocked: false, onSelect })

    const button = container.querySelector('button')
    expect(button?.disabled).toBe(false)
    expect(button?.getAttribute('aria-disabled')).toBe('true')
    expect(button?.getAttribute('title')).toBe(
      'Complete the previous lesson to unlock',
    )

    await act(async () => {
      button?.click()
    })

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('reports hover and focus for a locked lesson without selecting it', async () => {
    const onSelect = vi.fn()
    const onHover = vi.fn()
    await render({ unlocked: false, onSelect, onHover })

    const button = container.querySelector('button')
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    expect(onHover).toHaveBeenLastCalledWith('en-home-left')

    await act(async () => {
      button?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })
    expect(onHover).toHaveBeenLastCalledWith('en-home-left')

    await act(async () => {
      button?.click()
    })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('reports hover enter/leave and focus/blur with the lesson id and null', async () => {
    const onHover = vi.fn()
    await render({ onHover })

    const button = container.querySelector('button')
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    expect(onHover).toHaveBeenLastCalledWith('en-home-left')

    await act(async () => {
      button?.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          relatedTarget: document.body,
        }),
      )
    })
    expect(onHover).toHaveBeenLastCalledWith(null)

    await act(async () => {
      button?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })
    expect(onHover).toHaveBeenLastCalledWith('en-home-left')

    await act(async () => {
      button?.dispatchEvent(
        new FocusEvent('focusout', {
          bubbles: true,
          relatedTarget: document.body,
        }),
      )
    })
    expect(onHover).toHaveBeenLastCalledWith(null)
  })
})
