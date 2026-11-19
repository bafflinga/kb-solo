// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LessonMeta } from '../domain/lessons/types'
import type { LessonProgress } from '../storage/progress'
import { LessonPicker } from './LessonPicker'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

const lessons: LessonMeta[] = [
  {
    id: 'en-home-left',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.homeLeft',
    order: 1,
    difficulty: 1,
  },
  {
    id: 'en-home-right',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.homeRight',
    order: 2,
    difficulty: 1,
    requires: ['en-home-left'],
  },
]

const record: LessonProgress = {
  lessonId: 'en-home-left',
  paceLevel: 'off',
  bestNetWpm: 40,
  bestAccuracy: 0.98,
  stars: 3,
  attempts: 2,
  completedAt: 1,
}

describe('LessonPicker', () => {
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
      completedIds?: ReadonlySet<string>
      onSelect?: (id: string) => void
      onHover?: (id: string | null) => void
    } = {},
  ): Promise<void> {
    await act(async () => {
      root.render(
        <LessonPicker
          lessons={lessons}
          language="en"
          progress={[record]}
          completedIds={options.completedIds ?? new Set()}
          onSelect={options.onSelect ?? (() => {})}
          onHover={options.onHover}
        />,
      )
    })
  }

  it('renders one card per lesson for the active language', async () => {
    await render()

    expect(container.querySelectorAll('.lesson-button')).toHaveLength(2)
    expect(container.textContent).toContain('Home row: left hand')
    expect(container.textContent).toContain('Home row: right hand')
    expect(container.textContent).toContain('2 lessons')
  })

  it('shows persisted stars and best speed from the progress map', async () => {
    await render({ completedIds: new Set(['en-home-left']) })

    const buttons = [...container.querySelectorAll('.lesson-button')]
    expect(buttons[0]?.querySelector('.stars')?.textContent).toBe('★★★')
    expect(buttons[0]?.textContent).toContain('Best: 40 WPM')
    expect(buttons[1]?.querySelector('.stars')?.textContent).toBe('☆☆☆')
  })

  it('locks lessons whose prerequisites are not complete', async () => {
    await render()

    const buttons = [...container.querySelectorAll('button')]
    expect(buttons[0]?.getAttribute('aria-disabled')).toBeNull()
    expect(buttons[1]?.getAttribute('aria-disabled')).toBe('true')
  })

  it('forwards hover callbacks from cards, including locked ones', async () => {
    const onHover = vi.fn()
    await render({ onHover })

    const buttons = [...container.querySelectorAll('button')]
    await act(async () => {
      buttons[1]?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    expect(onHover).toHaveBeenLastCalledWith('en-home-right')

    await act(async () => {
      buttons[1]?.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          relatedTarget: document.body,
        }),
      )
    })
    expect(onHover).toHaveBeenLastCalledWith(null)
  })

  it('forwards the selected lesson id', async () => {
    const onSelect = vi.fn()
    await render({ onSelect })

    const buttons = [...container.querySelectorAll('button')]
    await act(async () => {
      buttons[0]?.click()
    })

    expect(onSelect).toHaveBeenCalledWith('en-home-left')
  })
})
