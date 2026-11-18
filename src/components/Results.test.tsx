// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Score } from '../domain/scoring'
import type { LessonProgress } from '../storage/progress'
import { Results } from './Results'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

const score: Score = { grossWpm: 44, netWpm: 40.2, accuracy: 0.981 }

const previousBest: LessonProgress = {
  lessonId: 'en-home-left',
  paceLevel: 'off',
  bestNetWpm: 30,
  bestAccuracy: 0.95,
  stars: 2,
  attempts: 3,
  completedAt: 1,
}

describe('Results', () => {
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
      status?: 'success' | 'failure'
      stars?: 0 | 1 | 2 | 3
      best?: LessonProgress
      hasNext?: boolean
      onRetry?: () => void
      onNext?: () => void
      onBack?: () => void
    } = {},
  ): Promise<void> {
    await act(async () => {
      root.render(
        <Results
          status={options.status ?? 'success'}
          stars={options.stars ?? 2}
          score={score}
          elapsedMs={90000}
          errors={3}
          previousBest={options.best}
          hasNext={options.hasNext ?? true}
          onRetry={options.onRetry ?? (() => {})}
          onNext={options.onNext ?? (() => {})}
          onBack={options.onBack ?? (() => {})}
        />,
      )
    })
  }

  function button(label: string): HTMLButtonElement | undefined {
    return [...container.querySelectorAll('button')].find(
      (element) => element.textContent === label,
    )
  }

  function stat(label: string): string | null | undefined {
    const item = [...container.querySelectorAll('.results-stats div')].find(
      (node) => node.querySelector('dt')?.textContent === label,
    )
    return item?.querySelector('dd')?.textContent
  }

  it('shows the success summary with stars, speed, accuracy, time and errors', async () => {
    await render()

    expect(container.querySelector('.results h3')?.textContent).toBe(
      'Lesson complete',
    )
    expect(container.querySelector('.stars')?.textContent).toBe('★★☆')
    expect(stat('WPM')).toBe('40')
    expect(stat('Accuracy')).toBe('98%')
    expect(stat('Time')).toBe('1:30')
    expect(stat('Errors')).toBe('3')
  })

  it('shows the failure heading without stars', async () => {
    await render({ status: 'failure', stars: 0 })

    expect(container.querySelector('.results h3')?.textContent).toBe(
      'Time is up',
    )
    expect(container.querySelector('.stars')?.textContent).toBe('☆☆☆')
  })

  it('compares against the previous best and flags a new record', async () => {
    await render({ best: previousBest })

    expect(container.textContent).toContain('Best: 30 WPM')
    expect(container.textContent).toContain('New best!')
  })

  it('hides the comparison on a first run and on a worse run', async () => {
    await render({ best: undefined })
    expect(container.textContent).not.toContain('Best:')

    await render({ best: { ...previousBest, bestNetWpm: 99 } })
    expect(container.textContent).toContain('Best: 99 WPM')
    expect(container.textContent).not.toContain('New best!')
  })

  it('offers Retry, Next lesson and Back to menu', async () => {
    const onRetry = vi.fn()
    const onNext = vi.fn()
    const onBack = vi.fn()
    await render({ onRetry, onNext, onBack, hasNext: true })

    for (const [label, spy] of [
      ['Retry', onRetry],
      ['Next lesson', onNext],
      ['Back to menu', onBack],
    ] as const) {
      const element = button(label)
      expect(element, label).toBeDefined()
      await act(async () => {
        element?.click()
      })
      expect(spy).toHaveBeenCalledTimes(1)
    }
  })

  it('hides Next lesson on the last lesson', async () => {
    await render({ hasNext: false })

    expect(button('Next lesson')).toBeUndefined()
    expect(button('Retry')).toBeDefined()
    expect(button('Back to menu')).toBeDefined()
  })
})
