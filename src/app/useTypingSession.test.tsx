// @vitest-environment jsdom
import { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cueFromText } from '../domain/cues'
import type { ErrorMode } from '../domain/engine'
import type { PaceLevel } from '../domain/pacing'
import { getLayout } from '../domain/layout'
import type { LessonMeta, LessonProvider } from '../domain/lessons/types'
import type { Cue } from '../domain/types'
import { rollingWpm, useTypingSession } from './useTypingSession'
import type { TypingSession } from './useTypingSession'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

const layout = getLayout('us-qwerty')

function lessonFor(
  text: string,
  meta: Partial<LessonMeta> = {},
): LessonProvider {
  const cues: Cue[] = [cueFromText(layout, text, 'word')]
  return {
    meta: {
      id: 'test',
      language: 'en',
      layoutId: 'us-qwerty',
      titleKey: 'lesson.en.homeLeft',
      order: 1,
      difficulty: 1,
      ...meta,
    },
    kind: 'drill',
    templateCount: 1,
    createCues: () => cues,
  }
}

function drillLessonFor(
  text: string,
  meta: Partial<LessonMeta> = {},
): { provider: LessonProvider; calls: { generate?: boolean }[] } {
  const calls: { generate?: boolean }[] = []
  return {
    calls,
    provider: {
      meta: {
        id: 'drill',
        language: 'en',
        layoutId: 'us-qwerty',
        titleKey: 'lesson.en.homeLeft',
        order: 1,
        difficulty: 1,
        focusCodes: ['KeyA', 'KeyS'],
        ...meta,
      },
      kind: 'drill',
      templateCount: 4,
      createCues: (_layout, options) => {
        calls.push({ generate: options?.generate })
        return [cueFromText(layout, `${text}${calls.length}`, 'word')]
      },
    },
  }
}

interface SessionRef {
  current?: TypingSession
}

let sessionRef: SessionRef

interface HarnessProps {
  lesson: LessonProvider
  errorMode?: ErrorMode
  strictShift?: boolean
  randomTemplates?: boolean
  generatedDrills?: boolean
  paceLevel?: PaceLevel
  now: () => number
  sessionRef: SessionRef
}

function Harness({
  lesson,
  errorMode = 'block',
  strictShift = false,
  randomTemplates = false,
  generatedDrills = false,
  paceLevel = 'off',
  now,
  sessionRef,
}: HarnessProps) {
  const session = useTypingSession({
    lesson,
    layout,
    errorMode,
    strictShift,
    randomTemplates,
    generatedDrills,
    paceLevel,
    now,
  })
  useEffect(() => {
    sessionRef.current = session
  }, [session, sessionRef])
  return <div data-status={session.state.status} />
}

function current(): TypingSession {
  if (sessionRef.current === undefined) {
    throw new Error('Session was not rendered')
  }
  return sessionRef.current
}

describe('useTypingSession', () => {
  let container: HTMLDivElement
  let root: Root
  let clock: number
  const now = () => clock

  beforeEach(() => {
    vi.useFakeTimers()
    clock = 0
    sessionRef = {}
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
    lesson: LessonProvider,
    options: {
      errorMode?: ErrorMode
      strictShift?: boolean
      randomTemplates?: boolean
      generatedDrills?: boolean
      paceLevel?: PaceLevel
    } = {},
  ): Promise<void> {
    await act(async () => {
      root.render(
        <Harness
          lesson={lesson}
          now={now}
          sessionRef={sessionRef}
          {...options}
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

  async function begin(): Promise<void> {
    await act(async () => {
      current().start()
    })
    await advance(3000)
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

  it('counts down then runs', async () => {
    await render(lessonFor('ab'))

    expect(current().state.status).toBe('idle')
    expect(current().countdown).toBe(3)
    expect(current().nextChar?.char).toBe('a')

    await act(async () => {
      current().start()
    })
    expect(current().state.status).toBe('countdown')

    await advance(1000)
    expect(current().countdown).toBe(2)
    await advance(1000)
    expect(current().countdown).toBe(1)
    await advance(1000)
    expect(current().countdown).toBe(0)
    expect(current().state.status).toBe('running')
  })

  it('advances on correct keys and reaches success', async () => {
    await render(lessonFor('ab'))
    await begin()

    await press('KeyA', 'a')
    expect(current().state.charIndex).toBe(1)
    expect(current().state.keystrokes).toBe(1)
    expect(current().state.correct).toBe(1)
    expect(current().nextChar?.char).toBe('b')
    expect(current().lastKey).toMatchObject({
      code: 'KeyA',
      correct: true,
    })

    await press('KeyB', 'b')
    expect(current().state.status).toBe('success')
    expect(current().nextChar).toBeUndefined()
  })

  it('blocks wrong keys without advancing', async () => {
    await render(lessonFor('ab'))
    await begin()

    await press('KeyZ', 'z')
    expect(current().state.charIndex).toBe(0)
    expect(current().state.errors).toBe(1)
    expect(current().state.errored).toBe(true)
    expect(current().lastKey).toMatchObject({
      code: 'KeyZ',
      correct: false,
    })

    await press('KeyA', 'a')
    expect(current().state.charIndex).toBe(1)
    expect(current().state.errored).toBe(false)
  })

  it('moves back with Backspace and lets the user retype', async () => {
    await render(lessonFor('abc'))
    await begin()

    await press('KeyA', 'a')
    await press('KeyB', 'b')
    expect(current().state.charIndex).toBe(2)

    await press('Backspace', 'Backspace')
    expect(current().state.charIndex).toBe(1)
    expect(current().state.typed).toBe('a')

    await press('KeyB', 'b')
    await press('KeyC', 'c')
    expect(current().state.status).toBe('success')
  })

  it('pauses keys and ticks and excludes paused time', async () => {
    await render(lessonFor('ab'))
    await begin()

    await press('KeyA', 'a')
    await advance(1000)
    expect(current().state.elapsedMs).toBe(1000)

    await act(async () => {
      current().pause()
    })
    expect(current().state.status).toBe('paused')

    await press('KeyB', 'b')
    expect(current().state.keystrokes).toBe(1)

    await advance(5000)
    expect(current().state.elapsedMs).toBe(1000)

    await act(async () => {
      current().resume()
    })
    expect(current().state.status).toBe('running')

    await advance(1000)
    expect(current().state.elapsedMs).toBeGreaterThanOrEqual(1900)
    expect(current().state.elapsedMs).toBeLessThan(3000)
  })

  it('keeps running when the lesson time limit elapses', async () => {
    await render(lessonFor('ab', { timeLimitSec: 1 }))
    await begin()

    await press('KeyA', 'a')
    await advance(1200)

    expect(current().state.status).toBe('running')
    expect(current().nextChar?.char).toBe('b')
  })

  it('derives pacing from the chosen level and the lesson cues', async () => {
    await render(lessonFor('ab'), { paceLevel: 'relaxed' })
    await act(async () => {
      current().start()
    })

    expect(current().state.timeLimitMs).toBeGreaterThan(0)
    expect(current().state.targetWpm).toBeGreaterThan(0)
    expect(current().state.targetWpm).toBeLessThan(30)
  })

  it('regenerates drill cues on every start when generatedDrills is on', async () => {
    const { provider, calls } = drillLessonFor('ab')
    await render(provider, { generatedDrills: true })

    await act(async () => {
      current().start()
    })
    const first = current().state.cues[0]?.text

    await act(async () => {
      current().start()
    })
    const second = current().state.cues[0]?.text

    expect(calls.filter((call) => call.generate === true)).toHaveLength(2)
    expect(second).not.toBe(first)
  })

  it('does not generate for drills without focus codes', async () => {
    const { provider, calls } = drillLessonFor('ab', {
      focusCodes: undefined,
    })
    await render(provider, { generatedDrills: true })

    await act(async () => {
      current().start()
    })

    expect(calls.some((call) => call.generate === true)).toBe(false)
  })

  it('fails on timeout in hardcore mode', async () => {
    await render(lessonFor('ab', { timeLimitSec: 1 }), {
      paceLevel: 'hardcore',
    })
    await begin()

    expect(current().state.failOnTimeout).toBe(true)

    await press('KeyA', 'a')
    await advance(1200)

    expect(current().state.status).toBe('failure')
    expect(current().nextChar).toBeUndefined()
  })

  it('reports cue success and clears the flash', async () => {
    await render(lessonFor('ab'))
    await begin()

    await press('KeyA', 'a')
    await press('KeyB', 'b')

    expect(current().state.status).toBe('success')
    expect(current().feedback).toMatchObject({ kind: 'success', text: 'ab' })

    await advance(700)
    expect(current().feedback).toBeUndefined()
  })

  it('reports cue errors when the completed cue had mistakes', async () => {
    await render(lessonFor('a'))
    await begin()

    await press('KeyZ', 'z')
    await press('KeyA', 'a')

    expect(current().state.status).toBe('success')
    expect(current().feedback).toMatchObject({ kind: 'error', text: 'a' })
  })

  it('does not count keys before the countdown finishes', async () => {
    await render(lessonFor('a'))

    await act(async () => {
      current().start()
    })
    await press('KeyA', 'a')

    expect(current().state.keystrokes).toBe(0)
    expect(current().state.status).toBe('countdown')
  })
})

describe('rollingWpm', () => {
  it('returns zero without time or samples', () => {
    expect(rollingWpm([], 10000)).toBe(0)
    expect(rollingWpm([{ at: 0, correct: true }], 0)).toBe(0)
  })

  it('uses a fifteen second window', () => {
    const samples = [
      { at: 0, correct: true },
      { at: 5000, correct: true },
      { at: 10000, correct: false },
    ]

    expect(rollingWpm(samples, 20000)).toBeCloseTo(0.8)
    expect(rollingWpm(samples, 5000)).toBeCloseTo(4.8)
  })
})
