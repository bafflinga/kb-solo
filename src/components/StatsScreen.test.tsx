// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LessonMeta } from '../domain/lessons/types'
import type { LessonProgress } from '../storage/progress'
import { StatsScreen } from './StatsScreen'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

const lessons: LessonMeta[] = [
  {
    id: 'en-home-left',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.homeLeft',
  },
  {
    id: 'en-home-right',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.homeRight',
  },
  {
    id: 'ru-home-left',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.homeLeft',
  },
]

const progress: LessonProgress[] = [
  {
    lessonId: 'en-home-left',
    paceLevel: 'off',
    bestNetWpm: 40,
    bestAccuracy: 0.98,
    stars: 3,
    attempts: 1,
    completedAt: 1,
  },
  {
    lessonId: 'ru-home-left',
    paceLevel: 'off',
    bestNetWpm: 10,
    bestAccuracy: 0.8,
    stars: 1,
    attempts: 1,
    completedAt: 2,
  },
]

describe('StatsScreen', () => {
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
    records: LessonProgress[],
    paceLevel?:
      | 'off'
      | 'relaxed'
      | 'standard'
      | 'challenging'
      | 'hardcore',
  ): Promise<void> {
    await act(async () => {
      root.render(
        <StatsScreen
          progress={records}
          lessons={lessons}
          paceLevel={paceLevel}
        />,
      )
    })
  }

  function overall(label: string): string | null | undefined {
    const item = [...container.querySelectorAll('.stats-overall div')].find(
      (node) => node.querySelector('dt')?.textContent === label,
    )
    return item?.querySelector('dd')?.textContent
  }

  it('summarises completed lessons, attempts, best speed and average accuracy', async () => {
    await render(progress)

    expect(container.textContent).toContain('2 lessons completed')
    expect(overall('Attempts')).toBe('2')
    expect(overall('Best WPM')).toBe('40')
    expect(overall('Average accuracy')).toBe('89%')
  })

  it('lists only lessons with a record, grouped by language', async () => {
    await render(progress)

    expect(container.textContent).toContain('Home row: left hand')
    expect(container.textContent).toContain('Ряд дома: левая рука')
    expect(container.textContent).not.toContain('Home row: right hand')
    expect(container.querySelectorAll('.stats-row')).toHaveLength(2)
  })

  it('labels the stats with the selected pace level', async () => {
    await render(progress, 'challenging')
    expect(container.textContent).toContain('Difficulty: Challenging')
  })

  it('counts attempt-only records without listing them as completed', async () => {
    const attempted: LessonProgress = {
      lessonId: 'en-home-right',
      paceLevel: 'hardcore',
      bestNetWpm: 0,
      bestAccuracy: 0,
      stars: 0,
      attempts: 2,
    }

    await render([attempted], 'hardcore')

    expect(container.textContent).toContain('Difficulty: Hardcore')
    expect(container.textContent).toContain('0 lessons completed')
    expect(overall('Attempts')).toBe('2')
    expect(overall('Best WPM')).toBe('0')
    expect(container.querySelectorAll('.stats-row')).toHaveLength(0)
  })

  it('shows an empty state before any lesson is completed', async () => {
    await render([])

    expect(container.textContent).toContain('No lessons completed yet')
    expect(container.querySelectorAll('.stats-row')).toHaveLength(0)
  })
})
