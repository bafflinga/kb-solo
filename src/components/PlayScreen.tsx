import { useCallback, useEffect, useRef, useState } from 'react'
import type { ErrorMode } from '../domain/engine'
import { nextLesson } from '../domain/lessons/registry'
import type { LessonProvider } from '../domain/lessons/types'
import type { Score, Stars } from '../domain/scoring'
import type { Code, Layout } from '../domain/types'
import { DEFAULT_SHORTCUTS } from '../app/shortcuts'
import type { ShortcutSettings } from '../app/shortcuts'
import { useGlobalShortcut } from '../app/useGlobalShortcut'
import { useTypingSession } from '../app/useTypingSession'
import { navigate } from '../app/useHashRoute'
import { play, unlockAudio } from '../audio/audio'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n'
import type { LessonProgress, LessonResult } from '../storage/progress'
import { FingerGuide } from './FingerGuide/FingerGuide'
import { Hud } from './Hud/Hud'
import { Keyboard } from './Keyboard/Keyboard'
import { KeyboardLiveRegion } from './Keyboard/KeyboardLiveRegion'
import { createKeyboardController } from './Keyboard/keyboardController'
import { Results } from './Results'
import { TypingArea } from './TypingArea/TypingArea'
import './playScreen.css'

const KEY_FLASH_MS = 160

export interface PlayScreenProps {
  lesson: LessonProvider
  layout: Layout
  focusCodes?: readonly Code[]
  labels?: Partial<Record<Code, string>>
  errorMode: ErrorMode
  strictShift: boolean
  showFeedback?: boolean
  suspended?: boolean
  shortcuts?: ShortcutSettings
  now?: () => number
  best?: LessonProgress
  onFinish?(result: LessonResult): void
}

export function PlayScreen({
  lesson,
  layout,
  focusCodes,
  labels,
  errorMode,
  strictShift,
  showFeedback = false,
  suspended = false,
  shortcuts = DEFAULT_SHORTCUTS,
  now,
  best,
  onFinish,
}: PlayScreenProps) {
  const { t, n } = useI18n()
  const [keyboard] = useState(createKeyboardController)
  const [dismissedMismatch, setDismissedMismatch] = useState(false)
  const suspendedRef = useRef(false)
  const [previousBest] = useState(best)

  const session = useTypingSession({
    lesson,
    layout,
    errorMode,
    strictShift,
    now,
  })
  const {
    state,
    nextChar,
    score,
    stars,
    liveWpm,
    countdown,
    feedback,
    lastKey,
    start,
    pause,
    resume,
  } = session

  const finishRef = useRef<{
    score: Score
    stars: Stars
    onFinish?: (result: LessonResult) => void
  }>({ score, stars, onFinish })

  const previousStatusRef = useRef(state.status)
  const playedFeedbackRef = useRef(0)

  const begin = useCallback(() => {
    setDismissedMismatch(false)
    void unlockAudio()
    start()
  }, [start])

  useEffect(() => {
    finishRef.current = { score, stars, onFinish }
  }, [score, stars, onFinish])

  useEffect(() => {
    keyboard.setNextKey(nextChar?.code, nextChar?.needsShift ?? false)
  }, [keyboard, nextChar?.code, nextChar?.needsShift])

  useEffect(() => {
    if (lastKey === undefined) {
      return
    }
    const code = lastKey.code
    keyboard.setKeyState(code, lastKey.correct ? 'pressed' : 'error')
    const id = window.setTimeout(() => {
      keyboard.setKeyState(code, 'rest')
      if (state.status === 'running') {
        keyboard.setNextKey(nextChar?.code, nextChar?.needsShift ?? false)
      }
    }, KEY_FLASH_MS)
    return () => {
      window.clearTimeout(id)
      keyboard.setKeyState(code, 'rest')
    }
  }, [keyboard, lastKey, nextChar?.code, nextChar?.needsShift, state.status])

  useEffect(() => {
    if (suspended) {
      if (state.status === 'running') {
        suspendedRef.current = true
        pause()
      }
      return
    }
    if (suspendedRef.current) {
      suspendedRef.current = false
      if (state.status === 'paused') {
        resume()
      }
    }
  }, [suspended, state.status, pause, resume])

  useEffect(() => {
    const previous = previousStatusRef.current
    previousStatusRef.current = state.status
    if (state.status === previous) {
      return
    }
    const latest = finishRef.current
    if (state.status === 'success') {
      play('lessonSuccess')
      if (latest.stars > (previousBest?.stars ?? 0)) {
        play('starEarned')
      }
      latest.onFinish?.({
        lessonId: lesson.meta.id,
        netWpm: latest.score.netWpm,
        accuracy: latest.score.accuracy,
        stars: latest.stars,
        completed: true,
        at: Date.now(),
      })
    } else if (state.status === 'failure') {
      play('lessonFailure')
      latest.onFinish?.({
        lessonId: lesson.meta.id,
        netWpm: latest.score.netWpm,
        accuracy: latest.score.accuracy,
        stars: 0,
        completed: false,
        at: Date.now(),
      })
    }
  }, [state.status, lesson.meta.id, previousBest])

  useEffect(() => {
    if (lastKey === undefined) {
      return
    }
    play(lastKey.correct ? 'keypress' : 'error')
  }, [lastKey])

  useEffect(() => {
    if (feedback === undefined || feedback.id === playedFeedbackRef.current) {
      return
    }
    playedFeedbackRef.current = feedback.id
    if (feedback.kind === 'success' && state.status === 'running') {
      play('wordComplete')
    }
  }, [feedback, state.status])

  const finished = state.status === 'success' || state.status === 'failure'
  const language = lesson.meta.language === 'ru' ? 'ru' : 'en'
  const next = nextLesson(lesson.meta)

  useGlobalShortcut({
    shortcut: shortcuts.start,
    enabled: !suspended && (state.status === 'idle' || finished),
    onTrigger: begin,
  })
  useGlobalShortcut({
    shortcut: shortcuts.pause,
    enabled:
      !suspended && (state.status === 'running' || state.status === 'paused'),
    onTrigger: () => {
      if (state.status === 'running') {
        pause()
      } else if (state.status === 'paused') {
        resume()
      }
    },
  })

  return (
    <section className="play-screen">
      <header className="play-header">
        <a href="#/" className="play-back">
          ← {t('back')}
        </a>
        <h2>{t(lesson.meta.titleKey as MessageKey)}</h2>
        {state.status === 'running' && (
          <div className="play-controls">
            <button
              type="button"
              onClick={(event) => {
                event.currentTarget.blur()
                pause()
              }}
            >
              {t('pause')}
            </button>
          </div>
        )}
      </header>

      {state.layoutMismatch && !dismissedMismatch && (
        <div className="play-banner" role="status">
          <span>{t('layoutMismatch', { layout: layout.displayName })}</span>
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.blur()
              setDismissedMismatch(true)
            }}
          >
            {t('dismiss')}
          </button>
        </div>
      )}

      {state.shiftHint && <p className="play-hint">{t('shiftHint')}</p>}

      <Hud state={state} score={score} liveWpm={liveWpm} />

      <div className="play-stage">
        <TypingArea
          state={state}
          feedback={feedback}
          showFeedback={showFeedback}
          lang={language}
        />

        {state.status === 'idle' && (
          <div className="play-overlay">
            <button
              type="button"
              className="play-primary"
              onClick={(event) => {
                event.currentTarget.blur()
                begin()
              }}
            >
              {t('play')}
            </button>
          </div>
        )}

        {state.status === 'countdown' && (
          <div
            className="play-overlay"
            role="status"
            aria-live="polite"
            aria-label={t('play')}
          >
            <span className="play-countdown">{n(countdown)}</span>
          </div>
        )}

        {state.status === 'paused' && (
          <div className="play-overlay" role="status">
            <p>{t('pause')}</p>
            <button
              type="button"
              className="play-primary"
              onClick={(event) => {
                event.currentTarget.blur()
                resume()
              }}
            >
              {t('resume')}
            </button>
          </div>
        )}

        {finished && (
          <Results
            status={state.status === 'success' ? 'success' : 'failure'}
            stars={stars}
            score={score}
            elapsedMs={state.elapsedMs}
            errors={state.errors}
            previousBest={previousBest}
            hasNext={next !== undefined}
            onRetry={begin}
            onNext={() => {
              if (next) {
                navigate(`#/lesson/${encodeURIComponent(next.id)}`)
              }
            }}
            onBack={() => navigate('#/')}
          />
        )}
      </div>

      <FingerGuide finger={nextChar?.finger} />
      <Keyboard
        layout={layout}
        controller={keyboard}
        focusCodes={focusCodes}
        labels={labels}
      />
      <KeyboardLiveRegion
        layout={layout}
        code={nextChar?.code}
        character={nextChar?.char}
      />
    </section>
  )
}
