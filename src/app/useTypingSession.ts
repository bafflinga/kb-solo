import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  createInitialState,
  engineReducer,
  scoreFor,
  starsFor,
} from '../domain/engine'
import type { EngineConfig, EngineState, ErrorMode } from '../domain/engine'
import type { LessonProvider } from '../domain/lessons/types'
import type { Score, Stars } from '../domain/scoring'
import type { Code, Cue, CueChar, Layout } from '../domain/types'
import { useKeyboard } from './useKeyboard'
import type { KeyboardInput } from './useKeyboard'

export const COUNTDOWN_SECONDS = 3
export const ROLLING_WINDOW_MS = 15000
export const FEEDBACK_MS = 700

function defaultNow(): number {
  return performance.now()
}

export interface KeystrokeSample {
  at: number
  correct: boolean
}

export interface CueFeedback {
  id: number
  kind: 'success' | 'error'
  text: string
}

export interface LastKey {
  code: Code
  correct: boolean
  seq: number
}

export interface TypingSessionOptions {
  lesson: LessonProvider | null
  layout: Layout
  errorMode: ErrorMode
  strictShift: boolean
  now?: () => number
}

export interface TypingSession {
  state: EngineState
  cues: Cue[]
  nextChar?: CueChar
  score: Score
  stars: Stars
  liveWpm: number
  countdown: number
  feedback?: CueFeedback
  lastKey?: LastKey
  start(): void
  pause(): void
  resume(): void
}

export function rollingWpm(
  samples: readonly KeystrokeSample[],
  elapsedMs: number,
): number {
  if (elapsedMs <= 0) {
    return 0
  }
  const windowStart = Math.max(0, elapsedMs - ROLLING_WINDOW_MS)
  const recent = samples.filter((sample) => sample.at >= windowStart)
  if (recent.length === 0) {
    return 0
  }
  const correct = recent.reduce(
    (sum, sample) => sum + (sample.correct ? 1 : 0),
    0,
  )
  const duration = Math.max(1000, elapsedMs - windowStart)
  return correct / 5 / (duration / 60000)
}

export function useTypingSession({
  lesson,
  layout,
  errorMode,
  strictShift,
  now = defaultNow,
}: TypingSessionOptions): TypingSession {
  const timeLimitMs =
    lesson?.meta.timeLimitSec === undefined
      ? null
      : lesson.meta.timeLimitSec * 1000
  const targetWpm = lesson?.meta.targetWpm ?? 30

  const config = useMemo<Partial<EngineConfig>>(
    () => ({ layout, errorMode, strictShift, timeLimitMs, targetWpm }),
    [layout, errorMode, strictShift, timeLimitMs, targetWpm],
  )
  const [state, dispatch] = useReducer(
    engineReducer,
    config,
    createInitialState,
  )

  const cues = useMemo(() => lesson?.createCues(layout) ?? [], [lesson, layout])

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [history, setHistory] = useState<KeystrokeSample[]>([])
  const [lastKey, setLastKey] = useState<LastKey>()
  const [feedback, setFeedback] = useState<CueFeedback>()

  const startedAtRef = useRef<number | null>(null)
  const pausedAtRef = useRef<number | null>(null)
  const lastCodeRef = useRef<Code | undefined>(undefined)
  const lastKeySeqRef = useRef(0)
  const previousTotalsRef = useRef({ keystrokes: 0, correct: 0 })
  const lastCueIndexRef = useRef(0)
  const cueStartErrorsRef = useRef(0)
  const feedbackSeqRef = useRef(0)

  const resetRuntime = useCallback(() => {
    startedAtRef.current = null
    pausedAtRef.current = null
    previousTotalsRef.current = { keystrokes: 0, correct: 0 }
    lastCueIndexRef.current = 0
    cueStartErrorsRef.current = 0
    setCountdown(COUNTDOWN_SECONDS)
    setHistory([])
    setLastKey(undefined)
    setFeedback(undefined)
  }, [])

  const start = useCallback(() => {
    if (!lesson) {
      return
    }
    resetRuntime()
    dispatch({
      type: 'START',
      cues,
      lessonId: lesson.meta.id,
      layout,
      errorMode,
      strictShift,
      timeLimitMs,
      targetWpm,
    })
  }, [
    lesson,
    cues,
    layout,
    errorMode,
    strictShift,
    timeLimitMs,
    targetWpm,
    resetRuntime,
  ])

  const pause = useCallback(() => {
    if (state.status !== 'running') {
      return
    }
    pausedAtRef.current = now()
    dispatch({ type: 'PAUSE' })
  }, [now, state.status])

  const resume = useCallback(() => {
    if (state.status !== 'paused') {
      return
    }
    if (pausedAtRef.current !== null && startedAtRef.current !== null) {
      startedAtRef.current += now() - pausedAtRef.current
    }
    pausedAtRef.current = null
    dispatch({ type: 'RESUME' })
  }, [now, state.status])

  useEffect(() => {
    if (state.status !== 'countdown') {
      return
    }
    const timeouts = Array.from({ length: COUNTDOWN_SECONDS }, (_, index) => {
      const second = index + 1
      return window.setTimeout(() => {
        setCountdown(COUNTDOWN_SECONDS - second)
        if (second === COUNTDOWN_SECONDS) {
          dispatch({ type: 'COUNTDOWN_DONE' })
        }
      }, second * 1000)
    })
    return () => {
      for (const timeout of timeouts) {
        window.clearTimeout(timeout)
      }
    }
  }, [state.status])

  useEffect(() => {
    if (state.status !== 'running') {
      return
    }
    const id = window.setInterval(() => {
      const startedAt = startedAtRef.current
      if (startedAt !== null) {
        dispatch({ type: 'TICK', elapsedMs: now() - startedAt })
      }
    }, 100)
    return () => {
      window.clearInterval(id)
    }
  }, [now, state.status])

  useEffect(() => {
    if (state.status !== 'running' || state.keystrokes === 0) {
      return
    }
    if (startedAtRef.current === null) {
      startedAtRef.current = now() - state.elapsedMs
    }
  }, [now, state.status, state.keystrokes, state.elapsedMs])

  useEffect(() => {
    const previous = previousTotalsRef.current
    if (state.keystrokes > previous.keystrokes) {
      const code = lastCodeRef.current
      if (code !== undefined) {
        const correct = state.correct > previous.correct
        setLastKey({ code, correct, seq: ++lastKeySeqRef.current })
        setHistory((samples) => {
          const next = [...samples, { at: state.elapsedMs, correct }]
          const windowStart = Math.max(0, state.elapsedMs - ROLLING_WINDOW_MS)
          return next.filter((sample) => sample.at >= windowStart)
        })
      }
    }
    previousTotalsRef.current = {
      keystrokes: state.keystrokes,
      correct: state.correct,
    }
  }, [state.keystrokes, state.correct, state.elapsedMs])

  useEffect(() => {
    const advanced = state.cueIndex !== lastCueIndexRef.current
    const completedLast = state.status === 'success' && !advanced
    if (!advanced && !completedLast) {
      return
    }
    const completedIndex = advanced ? lastCueIndexRef.current : state.cueIndex
    const completed = state.cues[completedIndex]
    const kind: CueFeedback['kind'] =
      state.errors > cueStartErrorsRef.current ? 'error' : 'success'
    setFeedback({
      id: ++feedbackSeqRef.current,
      kind,
      text: completed?.text.trim() ?? '',
    })
    lastCueIndexRef.current = state.cueIndex
    cueStartErrorsRef.current = state.errors
  }, [state.status, state.cueIndex, state.cues, state.errors])

  useEffect(() => {
    if (feedback === undefined) {
      return
    }
    const id = window.setTimeout(() => {
      setFeedback((current) =>
        current?.id === feedback.id ? undefined : current,
      )
    }, FEEDBACK_MS)
    return () => {
      window.clearTimeout(id)
    }
  }, [feedback])

  const onKey = useCallback((input: KeyboardInput) => {
    lastCodeRef.current = input.code
    dispatch({
      type: 'KEY',
      code: input.code,
      char: input.char,
      shift: input.shift,
      alt: input.alt,
      repeat: input.repeat,
      isComposing: input.isComposing,
    })
  }, [])

  const onBackspace = useCallback(() => {
    dispatch({ type: 'BACKSPACE' })
  }, [])

  useKeyboard({
    active: state.status === 'running',
    onKey,
    onBackspace,
  })

  const activeCues = state.cues.length > 0 ? state.cues : cues
  const nextChar = useMemo(() => {
    if (state.status === 'success' || state.status === 'failure') {
      return undefined
    }
    return activeCues[state.cueIndex]?.chars[state.charIndex]
  }, [activeCues, state.status, state.cueIndex, state.charIndex])

  const liveWpm = useMemo(
    () => rollingWpm(history, state.elapsedMs),
    [history, state.elapsedMs],
  )

  return {
    state,
    cues,
    nextChar,
    score: scoreFor(state),
    stars: starsFor(state),
    liveWpm,
    countdown,
    feedback,
    lastKey,
    start,
    pause,
    resume,
  }
}
