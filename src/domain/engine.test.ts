import { describe, expect, it } from 'vitest'
import { cueFromText, lineCues } from './cues'
import { createInitialState, engineReducer, scoreFor, starsFor } from './engine'
import type { EngineConfig, EngineEvent, EngineState } from './engine'
import { getLayout } from './layout'
import type { LessonProvider } from './lessons/types'
import type { CueChar, Layout } from './types'

const layout = getLayout('us-qwerty')

function start(
  cues: ReturnType<typeof cueFromText>[],
  config: Partial<EngineConfig> = {},
): EngineState {
  let state = engineReducer(createInitialState(config), {
    type: 'START',
    cues,
    lessonId: 'test',
    layout: config.layout,
  })
  state = engineReducer(state, { type: 'COUNTDOWN_DONE' })
  return state
}

function keyFor(
  expected: CueChar,
  overrides: Partial<Extract<EngineEvent, { type: 'KEY' }>> = {},
): EngineEvent {
  return {
    type: 'KEY',
    code: expected.code ?? '',
    char: expected.char,
    shift: expected.needsShift,
    alt: false,
    ...overrides,
  }
}

function press(
  state: EngineState,
  overrides: Partial<Extract<EngineEvent, { type: 'KEY' }>> = {},
): EngineState {
  const expected = state.cues[state.cueIndex]?.chars[state.charIndex]
  if (!expected) {
    return state
  }
  return engineReducer(state, keyFor(expected, overrides))
}

describe('engine', () => {
  it('advances on correct keys, resets per cue and reaches success', () => {
    const cues = [
      cueFromText(layout, 'ab', 'word'),
      cueFromText(layout, 'c', 'word'),
    ]
    let state = start(cues)

    state = press(state)
    expect(state.charIndex).toBe(1)
    expect(state.typed).toBe('a')
    expect(state.correct).toBe(1)
    expect(state.keystrokes).toBe(1)

    state = press(state)
    expect(state.cueIndex).toBe(1)
    expect(state.charIndex).toBe(0)
    expect(state.typed).toBe('')
    expect(state.correctFlags).toEqual([])

    state = press(state)
    expect(state.status).toBe('success')
    expect(state.correct).toBe(3)
    expect(state.keystrokes).toBe(3)
    expect(state.errors).toBe(0)
  })

  it('blocks wrong keys in block mode without advancing', () => {
    let state = start([cueFromText(layout, 'a', 'word')])

    state = press(state, { code: 'KeyZ', char: 'z' })
    expect(state.charIndex).toBe(0)
    expect(state.typed).toBe('')
    expect(state.errors).toBe(1)
    expect(state.keystrokes).toBe(1)
    expect(state.correct).toBe(0)
    expect(state.errored).toBe(true)

    state = press(state)
    expect(state.status).toBe('success')
    expect(state.errors).toBe(1)
  })

  it('advances on wrong keys and records them in advance mode', () => {
    let state = start([cueFromText(layout, 'ab', 'word')], {
      errorMode: 'advance',
    })

    state = press(state, { code: 'KeyZ', char: 'z' })
    expect(state.charIndex).toBe(1)
    expect(state.typed).toBe('z')
    expect(state.correctFlags).toEqual([false])
    expect(state.errors).toBe(1)
    expect(state.correct).toBe(0)
    expect(state.keystrokes).toBe(1)
    expect(state.errored).toBe(true)

    state = engineReducer(state, { type: 'BACKSPACE' })
    expect(state.charIndex).toBe(0)
    expect(state.typed).toBe('')
    expect(state.errors).toBe(1)
    expect(state.correct).toBe(0)
  })

  it('backspaces correct chars without erasing errors or keystrokes', () => {
    let state = start([cueFromText(layout, 'ab', 'word')])

    state = press(state)
    expect(state.correct).toBe(1)

    state = engineReducer(state, { type: 'BACKSPACE' })
    expect(state.charIndex).toBe(0)
    expect(state.typed).toBe('')
    expect(state.correct).toBe(0)
    expect(state.keystrokes).toBe(1)

    const atStart = engineReducer(state, { type: 'BACKSPACE' })
    expect(atStart).toEqual(state)

    state = press(state)
    state = press(state)
    expect(state.status).toBe('success')
    expect(state.correct).toBe(2)
    expect(state.keystrokes).toBe(3)
  })

  it('requires shift for uppercase and tolerates extra shift', () => {
    let state = start([cueFromText(layout, 'A', 'word')])
    state = press(state, { char: 'a', shift: false })
    expect(state.errors).toBe(1)
    expect(state.charIndex).toBe(0)

    state = press(state, { char: 'A', shift: true })
    expect(state.status).toBe('success')

    let lower = start([cueFromText(layout, 'a', 'word')])
    lower = press(lower, { char: 'A', shift: true })
    expect(lower.errors).toBe(0)
    expect(lower.correct).toBe(1)
    expect(lower.shiftHint).toBe(false)

    let strict = start([cueFromText(layout, 'a', 'word')], {
      strictShift: true,
    })
    strict = press(strict, { char: 'A', shift: true })
    expect(strict.errors).toBe(0)
    expect(strict.shiftHint).toBe(true)
  })

  it('flags an OS layout mismatch without counting an error or stalling', () => {
    let state = start([cueFromText(layout, 'a', 'word')])
    state = press(state, { code: 'KeyA', char: 'ф' })

    expect(state.layoutMismatch).toBe(true)
    expect(state.errors).toBe(0)
    expect(state.correct).toBe(1)
    expect(state.status).toBe('success')
  })

  it('ignores repeats, IME, dead keys, empty codes and modifier-only keys', () => {
    let state = start([cueFromText(layout, 'ab', 'word')])
    const before = state

    state = engineReducer(state, {
      type: 'KEY',
      code: 'KeyA',
      char: 'a',
      shift: false,
      alt: false,
      repeat: true,
    })
    expect(state).toEqual(before)

    state = engineReducer(state, {
      type: 'KEY',
      code: 'KeyA',
      char: 'a',
      shift: false,
      alt: false,
      isComposing: true,
    })
    expect(state).toEqual(before)

    state = engineReducer(state, {
      type: 'KEY',
      code: '',
      char: 'a',
      shift: false,
      alt: false,
    })
    expect(state).toEqual(before)

    state = engineReducer(state, {
      type: 'KEY',
      code: 'KeyA',
      char: 'Dead',
      shift: false,
      alt: false,
    })
    expect(state).toEqual(before)

    state = engineReducer(state, {
      type: 'KEY',
      code: 'ShiftLeft',
      char: 'Shift',
      shift: true,
      alt: false,
    })
    expect(state.keystrokes).toBe(0)
    expect(state.errors).toBe(0)
    expect(state.shiftDown).toBe(true)
  })

  it('only accepts Enter when the expected char is a newline', () => {
    let state = start(lineCues(layout, 'a'))
    state = press(state)

    const expected = state.cues[state.cueIndex]?.chars[state.charIndex]
    expect(expected?.char).toBe('\n')

    state = engineReducer(state, {
      type: 'KEY',
      code: 'KeyB',
      char: 'b',
      shift: false,
      alt: false,
    })
    expect(state.errors).toBe(1)
    expect(state.status).toBe('running')

    state = engineReducer(state, {
      type: 'KEY',
      code: 'Enter',
      char: 'Enter',
      shift: false,
      alt: false,
    })
    expect(state.status).toBe('success')
    expect(state.typed).toBe('')
  })

  it('fails on the time limit without overwriting success', () => {
    let state = start([cueFromText(layout, 'ab', 'word')], {
      timeLimitMs: 1000,
    })
    state = engineReducer(state, { type: 'TICK', elapsedMs: 999 })
    expect(state.status).toBe('running')
    expect(state.elapsedMs).toBe(999)

    state = engineReducer(state, { type: 'TICK', elapsedMs: 1000 })
    expect(state.status).toBe('failure')
    state = press(state)
    expect(state.status).toBe('failure')

    let done = start([cueFromText(layout, 'a', 'word')], { timeLimitMs: 100 })
    done = press(done)
    expect(done.status).toBe('success')
    done = engineReducer(done, { type: 'TICK', elapsedMs: 500 })
    expect(done.status).toBe('success')
  })

  it('pauses, resumes and resets while preserving config', () => {
    let state = start([cueFromText(layout, 'ab', 'word')], {
      timeLimitMs: 1000,
    })
    state = engineReducer(state, { type: 'PAUSE' })
    expect(state.status).toBe('paused')
    state = press(state)
    expect(state.keystrokes).toBe(0)

    state = engineReducer(state, { type: 'RESUME' })
    expect(state.status).toBe('running')
    state = engineReducer(state, { type: 'TICK', elapsedMs: 100 })
    state = press(state)
    expect(state.keystrokes).toBe(1)

    const reset = engineReducer(state, { type: 'RESET' })
    expect(reset.status).toBe('idle')
    expect(reset.cues).toEqual([])
    expect(reset.keystrokes).toBe(0)
    expect(reset.elapsedMs).toBe(0)
    expect(reset.timeLimitMs).toBe(1000)
  })

  it('exposes score and star read-outs', () => {
    let state = start([cueFromText(layout, 'a', 'word')])
    state = press(state)
    state = engineReducer(state, { type: 'TICK', elapsedMs: 60000 })

    expect(scoreFor(state).netWpm).toBeCloseTo(0.2)
    expect(scoreFor(state).accuracy).toBe(1)
    expect(starsFor(state)).toBe(2)
  })

  it('runs a synthetic layout and provider through the real engine', () => {
    const syntheticLayout: Layout = {
      id: 'us-qwerty',
      displayName: 'Synthetic',
      formFactor: 'ansi',
      legends: {
        KeyX: { base: 'x', shift: 'X' },
        Space: { base: ' ', shift: ' ' },
      },
      geometry: {
        KeyX: { x: 0, y: 0, u: 1 },
        Space: { x: 1, y: 0, u: 1 },
      },
    }

    const provider: LessonProvider = {
      meta: {
        id: 'synthetic-lesson',
        language: 'en',
        layoutId: 'us-qwerty',
        titleKey: 'lesson.synthetic',
        order: 0,
        difficulty: 1,
      },
      createCues: () => [cueFromText(syntheticLayout, 'x x', 'word')],
    }

    let state = start(provider.createCues(), { layout: syntheticLayout })
    while (state.status === 'running') {
      state = press(state)
    }

    expect(state.status).toBe('success')
    expect(state.correct).toBe(3)
    expect(state.errors).toBe(0)
    expect(state.layoutMismatch).toBe(false)
  })
})
