import { expectedKeyFor, getLayout } from './layout'
import { computeScore, computeStars } from './scoring'
import type { Score, Stars } from './scoring'
import type { Code, Cue, Layout } from './types'

export type EngineStatus =
  'idle' | 'countdown' | 'running' | 'paused' | 'success' | 'failure'

export type ErrorMode = 'block' | 'advance'

export interface EngineState {
  status: EngineStatus
  cues: Cue[]
  cueIndex: number
  charIndex: number
  typed: string
  errored: boolean
  keystrokes: number
  errors: number
  correct: number
  elapsedMs: number
  lessonId: string
  layout: Layout
  errorMode: ErrorMode
  strictShift: boolean
  layoutMismatch: boolean
  shiftHint: boolean
  timeLimitMs: number | null
  targetWpm: number
  failOnTimeout: boolean
  shiftDown: boolean
  altDown: boolean
  correctFlags: boolean[]
}

export type EngineEvent =
  | {
      type: 'START'
      cues: Cue[]
      lessonId: string
      layout?: Layout
      errorMode?: ErrorMode
      strictShift?: boolean
      timeLimitMs?: number | null
      targetWpm?: number
      failOnTimeout?: boolean
    }
  | { type: 'COUNTDOWN_DONE' }
  | {
      type: 'KEY'
      code: Code
      char: string
      shift: boolean
      alt: boolean
      repeat?: boolean
      isComposing?: boolean
    }
  | { type: 'BACKSPACE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'TICK'; elapsedMs: number }
  | { type: 'RESET' }

export interface EngineConfig {
  layout: Layout
  errorMode: ErrorMode
  strictShift: boolean
  timeLimitMs: number | null
  targetWpm: number
  failOnTimeout: boolean
}

const MODIFIER_CODES = new Set<Code>([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'CapsLock',
  'Tab',
])

export function createInitialState(
  config?: Partial<EngineConfig>,
): EngineState {
  return {
    status: 'idle',
    cues: [],
    cueIndex: 0,
    charIndex: 0,
    typed: '',
    errored: false,
    keystrokes: 0,
    errors: 0,
    correct: 0,
    elapsedMs: 0,
    lessonId: '',
    layout: config?.layout ?? getLayout('us-qwerty'),
    errorMode: config?.errorMode ?? 'block',
    strictShift: config?.strictShift ?? false,
    layoutMismatch: false,
    shiftHint: false,
    timeLimitMs: config?.timeLimitMs ?? null,
    targetWpm: config?.targetWpm ?? 30,
    failOnTimeout: config?.failOnTimeout ?? false,
    shiftDown: false,
    altDown: false,
    correctFlags: [],
  }
}

function dropLastChar(value: string): string {
  const chars = Array.from(value)
  chars.pop()
  return chars.join('')
}

function advancePosition(state: EngineState): EngineState {
  const cue = state.cues[state.cueIndex]
  if (!cue) {
    return state
  }

  const nextCharIndex = state.charIndex + 1
  if (nextCharIndex < cue.chars.length) {
    return { ...state, charIndex: nextCharIndex }
  }

  const nextCueIndex = state.cueIndex + 1
  if (nextCueIndex >= state.cues.length) {
    return {
      ...state,
      status: 'success',
      charIndex: nextCharIndex,
      typed: '',
      correctFlags: [],
    }
  }

  return {
    ...state,
    cueIndex: nextCueIndex,
    charIndex: 0,
    typed: '',
    correctFlags: [],
  }
}

function applyKey(
  state: EngineState,
  event: Extract<EngineEvent, { type: 'KEY' }>,
): EngineState {
  if (state.status !== 'running') {
    return state
  }
  if (
    event.repeat === true ||
    event.isComposing === true ||
    event.code === ''
  ) {
    return state
  }

  if (MODIFIER_CODES.has(event.code)) {
    return { ...state, shiftDown: event.shift, altDown: event.alt }
  }

  const cue = state.cues[state.cueIndex]
  const expected = cue?.chars[state.charIndex]
  if (!cue || !expected || expected.code === undefined) {
    return state
  }
  if (event.code !== 'Enter' && (event.char === '' || event.char === 'Dead')) {
    return state
  }

  let layoutMismatch = state.layoutMismatch
  if (event.code !== 'Enter') {
    const active = expectedKeyFor(state.layout, event.code, {
      shift: event.shift,
      alt: event.alt,
    })
    if (active !== undefined && active !== event.char) {
      layoutMismatch = true
    }
  }

  const missingShift = expected.needsShift && !event.shift
  const extraShift = !expected.needsShift && event.shift
  const isError = event.code !== expected.code || missingShift
  const storedChar = event.code === 'Enter' ? expected.char : event.char

  const base: EngineState = {
    ...state,
    shiftDown: event.shift,
    altDown: event.alt,
    layoutMismatch,
    shiftHint: state.shiftHint || (extraShift && state.strictShift),
    keystrokes: state.keystrokes + 1,
  }

  if (isError) {
    const errored: EngineState = {
      ...base,
      errors: state.errors + 1,
      errored: true,
    }
    if (state.errorMode === 'block') {
      return errored
    }
    const typed = state.typed + storedChar
    const correctFlags = [...state.correctFlags, false]
    return advancePosition({ ...errored, typed, correctFlags })
  }

  const typed = state.typed + storedChar
  const correctFlags = [...state.correctFlags, true]
  const accepted: EngineState = {
    ...base,
    correct: state.correct + 1,
    errored: false,
    typed,
    correctFlags,
  }
  return advancePosition(accepted)
}

export function engineReducer(
  state: EngineState,
  event: EngineEvent,
): EngineState {
  switch (event.type) {
    case 'RESET':
      return createInitialState({
        layout: state.layout,
        errorMode: state.errorMode,
        strictShift: state.strictShift,
        timeLimitMs: state.timeLimitMs,
        targetWpm: state.targetWpm,
        failOnTimeout: state.failOnTimeout,
      })
    case 'START':
      return {
        ...createInitialState({
          layout: event.layout ?? state.layout,
          errorMode: event.errorMode ?? state.errorMode,
          strictShift: event.strictShift ?? state.strictShift,
          timeLimitMs: event.timeLimitMs ?? state.timeLimitMs,
          targetWpm: event.targetWpm ?? state.targetWpm,
          failOnTimeout: event.failOnTimeout ?? state.failOnTimeout,
        }),
        status: 'countdown',
        cues: event.cues,
        lessonId: event.lessonId,
      }
    case 'COUNTDOWN_DONE':
      return state.status === 'countdown'
        ? { ...state, status: 'running' }
        : state
    case 'PAUSE':
      return state.status === 'running' ? { ...state, status: 'paused' } : state
    case 'RESUME':
      return state.status === 'paused' ? { ...state, status: 'running' } : state
    case 'TICK': {
      const elapsedMs = Math.max(0, event.elapsedMs)
      if (
        state.status === 'running' &&
        state.failOnTimeout &&
        state.timeLimitMs !== null &&
        elapsedMs >= state.timeLimitMs
      ) {
        return { ...state, elapsedMs, status: 'failure' }
      }
      return { ...state, elapsedMs }
    }
    case 'BACKSPACE': {
      if (state.status !== 'running' || state.charIndex === 0) {
        return state
      }
      const correctFlags = [...state.correctFlags]
      const wasCorrect = correctFlags.pop() ?? false
      return {
        ...state,
        charIndex: state.charIndex - 1,
        typed: dropLastChar(state.typed),
        correctFlags,
        correct: wasCorrect ? Math.max(0, state.correct - 1) : state.correct,
        errored: false,
      }
    }
    case 'KEY':
      return applyKey(state, event)
  }
}

export function scoreFor(state: EngineState): Score {
  return computeScore({
    keystrokes: state.keystrokes,
    correct: state.correct,
    elapsedMs: state.elapsedMs,
  })
}

export function starsFor(state: EngineState): Stars {
  return computeStars(
    scoreFor(state),
    state.status === 'success',
    state.targetWpm,
  )
}
