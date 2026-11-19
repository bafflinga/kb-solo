// @vitest-environment jsdom
import { faker } from '@faker-js/faker/locale/en'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SHORTCUTS } from '../app/shortcuts'
import { play, unlockAudio } from '../audio/audio'
import { cueFromText } from '../domain/cues'
import { getLayout } from '../domain/layout'
import type { LessonMeta, LessonProvider } from '../domain/lessons/types'
import type { PaceLevel } from '../domain/pacing'
import type { Layout } from '../domain/types'
import type { LessonProgress, LessonResult } from '../storage/progress'
import { PlayScreen } from './PlayScreen'

vi.mock('../audio/audio', () => ({
  play: vi.fn(),
  unlockAudio: vi.fn().mockResolvedValue(undefined),
}))

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

const layout = getLayout('us-qwerty')
const lesson: LessonProvider = {
  meta: {
    id: 'test',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.homeLeft',
    order: 1,
    difficulty: 1,
  } satisfies LessonMeta,
  kind: 'drill',
  templateCount: 1,
  createCues: () => [cueFromText(layout, 'ab', 'word')],
}

const mismatchLesson: LessonProvider = {
  meta: {
    ...lesson.meta,
    id: 'mismatch',
    layoutId: 'ru-jcuken',
  },
  kind: 'drill',
  templateCount: 1,
  createCues: () => [cueFromText(layout, 'ab', 'word')],
}

const twoCueLesson: LessonProvider = {
  meta: { ...lesson.meta, id: 'two' },
  kind: 'drill',
  templateCount: 1,
  createCues: () => [
    cueFromText(layout, 'a', 'word'),
    cueFromText(layout, 'b', 'word'),
  ],
}

const timedLesson: LessonProvider = {
  meta: { ...lesson.meta, id: 'timed', timeLimitSec: 1 },
  kind: 'drill',
  templateCount: 1,
  createCues: () => [cueFromText(layout, 'ab', 'word')],
}

function generatedLessonFor(): {
  provider: LessonProvider
  texts: string[]
} {
  let count = 0
  const texts: string[] = []
  return {
    texts,
    provider: {
      meta: {
        ...lesson.meta,
        id: 'generated',
        focusCodes: ['KeyA', 'KeyS'],
      },
      kind: 'drill',
      templateCount: 1,
      createCues: () => {
        count += 1
        const text = `ab${count}`
        texts.push(text)
        return [cueFromText(layout, text, 'word')]
      },
      createGeneratedCues: () => {
        count += 1
        const text = `ab${count}`
        texts.push(text)
        return {
          cues: [cueFromText(layout, text, 'word')],
          generation: { areaId: 'focus', sentenceSource: 'lorem' },
        }
      },
    },
  }
}

const bestRecord: LessonProgress = {
  lessonId: 'test',
  paceLevel: 'off',
  bestNetWpm: 20,
  bestAccuracy: 0.9,
  stars: 1,
  attempts: 1,
  completedAt: 1,
}

describe('PlayScreen', () => {
  let container: HTMLDivElement
  let root: Root
  let clock: number
  const now = () => clock

  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    clock = 0
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    vi.clearAllTimers()
    vi.useRealTimers()
    container.remove()
  })

  async function render(
    options: {
      lesson?: LessonProvider
      layout?: Layout
      suspended?: boolean
      showFeedback?: boolean
      generatedContent?: boolean
      paceLevel?: PaceLevel
      best?: LessonProgress
      onFinish?: (result: LessonResult) => void
    } = {},
  ): Promise<void> {
    await act(async () => {
      root.render(
        <PlayScreen
          lesson={options.lesson ?? lesson}
          layout={options.layout ?? layout}
          errorMode="block"
          strictShift={false}
          showFeedback={options.showFeedback ?? false}
          generatedContent={options.generatedContent}
          faker={options.generatedContent ? faker : undefined}
          paceLevel={options.paceLevel}
          suspended={options.suspended ?? false}
          now={now}
          best={options.best}
          onFinish={options.onFinish}
        />,
      )
    })
  }

  async function advance(ms: number): Promise<void> {
    clock += ms
    await act(async () => {
      vi.advanceTimersByTime(ms)
    })
  }

  async function click(label: string): Promise<void> {
    const button = [...container.querySelectorAll('button')].find(
      (element) => element.textContent === label,
    )
    expect(button, label).toBeDefined()
    await act(async () => {
      button?.click()
    })
  }

  async function press(code: string, key: string): Promise<void> {
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code,
          key,
        }),
      )
    })
  }

  function visibleCue(): string {
    return [...container.querySelectorAll('.typing-char')]
      .map((element) => element.textContent ?? '')
      .join('')
  }

  async function pressShortcut(init: KeyboardEventInit = {}): Promise<void> {
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code: 'Enter',
          key: 'Enter',
          ctrlKey: DEFAULT_SHORTCUTS.start.ctrl,
          metaKey: DEFAULT_SHORTCUTS.start.meta,
          ...init,
        }),
      )
    })
  }

  it('previews the first key and finger before starting', async () => {
    await render()

    expect(
      container.querySelector('[data-code="KeyA"]')?.getAttribute('data-state'),
    ).toBe('next')
    expect(
      container.querySelectorAll('.finger-guide [data-active="true"]'),
    ).toHaveLength(1)
    expect(
      [...container.querySelectorAll('button')].some(
        (button) => button.textContent === 'Play',
      ),
    ).toBe(true)
  })

  it('starts, counts down, types a cue and offers a retry', async () => {
    await render()

    await click('Play')
    expect(container.querySelector('.play-countdown')?.textContent).toBe('3')
    await advance(3000)
    expect(container.querySelector('.play-countdown')).toBeNull()

    await press('KeyA', 'a')
    expect(
      container.querySelector('[data-code="KeyA"]')?.getAttribute('data-state'),
    ).toBe('pressed')
    await press('KeyB', 'b')

    expect(container.textContent).toContain('Lesson complete')
    expect(
      [...container.querySelectorAll('button')].some(
        (button) => button.textContent === 'Retry',
      ),
    ).toBe(true)
    expect(
      container
        .querySelector('[role="progressbar"]')
        ?.getAttribute('aria-valuenow'),
    ).toBe('1')

    await advance(200)
    expect(container.querySelector('[data-state="next"]')).toBeNull()
    expect(
      container.querySelectorAll('.finger-guide [data-active="true"]'),
    ).toHaveLength(0)

    await click('Retry')
    expect(container.textContent).not.toContain('Lesson complete')
    expect(container.querySelector('.play-countdown')?.textContent).toBe('3')
  })

  it('warns about a layout mismatch and lets the user dismiss it', async () => {
    await render({
      lesson: mismatchLesson,
      layout: getLayout('ru-jcuken'),
    })

    await click('Play')
    await advance(3000)
    await press('KeyA', 'a')

    expect(container.textContent).toContain('Switch to Русская (Windows)')

    await click('Dismiss')
    expect(container.textContent).not.toContain('Switch to Русская (Windows)')

    await press('KeyB', 'b')
    expect(container.textContent).not.toContain('Switch to Русская (Windows)')
    expect(container.textContent).toContain('Lesson complete')
  })

  it('pauses typing and resumes where it stopped', async () => {
    await render()

    await click('Play')
    await advance(3000)
    await press('KeyA', 'a')

    await click('Pause')
    expect(container.textContent).toContain('Pause')
    await press('KeyB', 'b')
    expect(container.textContent).not.toContain('Lesson complete')

    await click('Resume')
    await press('KeyB', 'b')
    expect(container.textContent).toContain('Lesson complete')
  })

  it('pauses while suspended and resumes when released', async () => {
    await render()

    await click('Play')
    await advance(3000)
    await press('KeyA', 'a')

    await render({ suspended: true })
    expect(container.textContent).toContain('Pause')
    await press('KeyB', 'b')
    expect(container.textContent).not.toContain('Lesson complete')

    await render({ suspended: false })
    await press('KeyB', 'b')
    expect(container.textContent).toContain('Lesson complete')
  })

  describe('cue feedback visibility', () => {
    async function completeCue(options: { showFeedback?: boolean } = {}) {
      await render(options)
      await click('Play')
      await advance(3000)
      await press('KeyA', 'a')
      await press('KeyB', 'b')
    }

    it('hides the feedback span by default', async () => {
      await completeCue()
      expect(container.querySelector('.typing-feedback')).toBeNull()
    })

    it('shows the feedback span when enabled', async () => {
      await completeCue({ showFeedback: true })
      expect(container.querySelector('.typing-feedback')?.textContent).toBe(
        'ab',
      )
    })
  })

  describe('keyboard shortcuts', () => {
    it('starts from the idle screen with the start shortcut', async () => {
      await render()

      await pressShortcut()
      expect(container.querySelector('.play-countdown')?.textContent).toBe('3')
      expect(vi.mocked(unlockAudio)).toHaveBeenCalledTimes(1)
    })

    it('ignores the start shortcut while suspended', async () => {
      await render({ suspended: true })

      await pressShortcut()
      expect(container.querySelector('.play-countdown')).toBeNull()

      await render({ suspended: false })
      await pressShortcut()
      expect(container.querySelector('.play-countdown')?.textContent).toBe('3')
    })

    it('retries from the results screen with the start shortcut', async () => {
      await render()

      await pressShortcut()
      await advance(3000)
      await press('KeyA', 'a')
      await press('KeyB', 'b')
      expect(container.textContent).toContain('Lesson complete')

      await pressShortcut()
      expect(container.textContent).not.toContain('Lesson complete')
      expect(container.querySelector('.play-countdown')?.textContent).toBe('3')
    })

    it('toggles pause and resume with the pause shortcut', async () => {
      await render()

      await pressShortcut()
      await advance(3000)
      await press('KeyA', 'a')

      await pressShortcut()
      expect(
        [...container.querySelectorAll('button')].some(
          (button) => button.textContent === 'Resume',
        ),
      ).toBe(true)
      await press('KeyB', 'b')
      expect(container.textContent).not.toContain('Lesson complete')

      await pressShortcut()
      await press('KeyB', 'b')
      expect(container.textContent).toContain('Lesson complete')
    })

    it('ignores unconfigured combinations', async () => {
      await render()

      await press('Enter', 'Enter')
      expect(container.querySelector('.play-countdown')).toBeNull()
    })
  })

  describe('audio', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('unlocks on start and plays a sound per key', async () => {
      await render()

      await click('Play')
      expect(vi.mocked(unlockAudio)).toHaveBeenCalledTimes(1)

      await advance(3000)
      await press('KeyA', 'a')
      expect(vi.mocked(play)).toHaveBeenCalledWith('keypress')

      await press('KeyZ', 'z')
      expect(vi.mocked(play)).toHaveBeenCalledWith('error')
    })

    it('plays wordComplete for a clean non-final cue', async () => {
      await render({ lesson: twoCueLesson })

      await click('Play')
      await advance(3000)
      await press('KeyA', 'a')

      expect(vi.mocked(play)).toHaveBeenCalledWith('wordComplete')
    })

    it('plays exactly one end sound on success', async () => {
      await render()

      await click('Play')
      await advance(3000)
      await press('KeyA', 'a')
      await press('KeyB', 'b')

      expect(vi.mocked(play)).toHaveBeenCalledWith('lessonSuccess')
      expect(vi.mocked(play)).not.toHaveBeenCalledWith('lessonFailure')
    })

    it('does not fail when the time limit runs out', async () => {
      await render({ lesson: timedLesson })

      await click('Play')
      await advance(3000)
      await press('KeyA', 'a')
      await advance(1200)
      await press('KeyB', 'b')

      expect(vi.mocked(play)).toHaveBeenCalledWith('lessonSuccess')
      expect(vi.mocked(play)).not.toHaveBeenCalledWith('lessonFailure')
    })

    it('plays the failure sound when hardcore time runs out', async () => {
      await render({ lesson: timedLesson, paceLevel: 'hardcore' })

      await click('Play')
      await advance(3000)
      await press('KeyA', 'a')
      await advance(1200)

      expect(vi.mocked(play)).toHaveBeenCalledWith('lessonFailure')
      expect(vi.mocked(play)).not.toHaveBeenCalledWith('lessonSuccess')
      expect(vi.mocked(play)).not.toHaveBeenCalledWith('starEarned')
    })
  })

  describe('progression', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('reports a single completed result on success', async () => {
      const onFinish = vi.fn()
      await render({ onFinish })

      await click('Play')
      await advance(3000)
      await press('KeyA', 'a')
      await press('KeyB', 'b')

      expect(onFinish).toHaveBeenCalledTimes(1)
      expect(onFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          lessonId: 'test',
          paceLevel: 'off',
          completed: true,
        }),
      )
    })

    it('reports a completed result on a timed lesson', async () => {
      const onFinish = vi.fn()
      await render({ lesson: timedLesson, onFinish })

      await click('Play')
      await advance(3000)
      await press('KeyA', 'a')
      await advance(1200)
      await press('KeyB', 'b')

      expect(onFinish).toHaveBeenCalledTimes(1)
      expect(onFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          lessonId: 'timed',
          paceLevel: 'off',
          completed: true,
        }),
      )
    })

    it('reports a failed attempt when hardcore time runs out', async () => {
      const onFinish = vi.fn()
      await render({
        lesson: timedLesson,
        paceLevel: 'hardcore',
        onFinish,
      })

      await click('Play')
      await advance(3000)
      await press('KeyA', 'a')
      await advance(1200)

      expect(onFinish).toHaveBeenCalledTimes(1)
      expect(onFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          lessonId: 'timed',
          paceLevel: 'hardcore',
          completed: false,
          stars: 0,
        }),
      )
    })

    it('generates a new drill combo on retry', async () => {
      const { provider, texts } = generatedLessonFor()
      await render({ lesson: provider, generatedContent: true })

      await click('Play')
      await advance(3000)
      const first = visibleCue()
      expect(first).toContain('ab2')

      await press('KeyA', 'a')
      await press('KeyB', 'b')
      await press('Digit2', '2')
      expect(container.textContent).toContain('Lesson complete')
      await click('Retry')
      await advance(3000)
      const second = visibleCue()

      expect(second).toContain('ab3')
      expect(second).not.toBe(first)
      expect(texts).toEqual(['ab1', 'ab2', 'ab3'])
    })

    it('plays starEarned when the run beats the previous best stars', async () => {
      await render({ best: { ...bestRecord, stars: 0 } })

      await click('Play')
      await advance(3000)
      await press('KeyA', 'a')
      await press('KeyB', 'b')

      expect(vi.mocked(play)).toHaveBeenCalledWith('starEarned')
    })

    it('does not play starEarned when no new star is earned', async () => {
      await render({ best: { ...bestRecord, stars: 3 } })

      await click('Play')
      await advance(3000)
      await press('KeyA', 'a')
      await press('KeyB', 'b')

      expect(vi.mocked(play)).not.toHaveBeenCalledWith('starEarned')
    })

    it('offers Back to menu on the results screen', async () => {
      await render()

      await click('Play')
      await advance(3000)
      await press('KeyA', 'a')
      await press('KeyB', 'b')

      const back = [...container.querySelectorAll('button')].find(
        (button) => button.textContent === 'Back to menu',
      )
      expect(back).toBeDefined()

      await act(async () => {
        back?.click()
      })

      expect(window.location.hash).toBe('#/')
    })
  })
})
