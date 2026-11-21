import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { EngineState } from '../../domain/engine'
import type { Cue } from '../../domain/types'
import './typingArea.css'

export const CUE_LOOKAHEAD = 5
export const FLASH_MS = 650

export interface TypingAreaProps {
  state: EngineState
  showFeedback?: boolean
  lang?: string
}

type SlotStyle = CSSProperties & { '--cue-len': number }

interface OutgoingFlash {
  index: number
  kind: 'success' | 'error'
}

function cueText(cue: Cue): string {
  return Array.from(cue.text, (char) => (char === '\n' ? '↵' : char)).join('')
}

export function TypingArea({
  state,
  showFeedback = false,
  lang,
}: TypingAreaProps) {
  const [outgoing, setOutgoing] = useState<OutgoingFlash | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const previousRef = useRef({ cueIndex: state.cueIndex, errors: state.errors })

  useLayoutEffect(() => {
    const previous = previousRef.current
    previousRef.current = { cueIndex: state.cueIndex, errors: state.errors }
    if (!showFeedback || state.cueIndex <= previous.cueIndex) {
      return
    }
    setOutgoing({
      index: previous.cueIndex,
      kind: state.errors > previous.errors ? 'error' : 'success',
    })
  }, [state.cueIndex, state.errors, showFeedback])

  useEffect(() => {
    if (outgoing === null) {
      return
    }
    const timeout = window.setTimeout(() => setOutgoing(null), FLASH_MS)
    return () => window.clearTimeout(timeout)
  }, [outgoing])

  useLayoutEffect(() => {
    const area = areaRef.current
    if (area === null) {
      return
    }
    if (state.cueIndex === 0 && state.charIndex === 0) {
      area.scrollTop = 0
      return
    }
    const pending = area.querySelector('[data-pending="true"]')
    if (pending === null || typeof pending.scrollIntoView !== 'function') {
      return
    }
    const reduceMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    pending.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }, [state.cueIndex, state.charIndex, state.status])

  const lastIndex = Math.min(
    state.cues.length,
    state.cueIndex + CUE_LOOKAHEAD + 1,
  )
  const visibleCues = state.cues.slice(0, lastIndex)
  const pendingError = state.errorMode === 'block' && state.errored

  return (
    <div className="typing-stage">
      <div className="typing-area" ref={areaRef} lang={lang}>
        {visibleCues.map((cue, index) => {
          const done = index < state.cueIndex
          const slot = index - state.cueIndex
          const slotStyle: SlotStyle = { '--cue-len': cue.chars.length }
          const isLine = cue.kind === 'line'
          const flashKind =
            done && showFeedback && outgoing?.index === index
              ? outgoing.kind
              : undefined

          return (
            <Fragment key={index}>
              <span
                className="cue-slot"
                style={slotStyle}
                data-slot={slot}
                data-state={done ? 'done' : slot === 0 ? 'active' : 'future'}
                data-kind={cue.kind}
                data-flash-kind={flashKind}
                aria-hidden={slot === 0 ? undefined : true}
              >
                {slot === 0
                  ? cue.chars.map((cueChar, charIndex) => {
                      const charDone = charIndex < state.charIndex
                      const pending = charIndex === state.charIndex
                      const wrong =
                        charDone && state.correctFlags[charIndex] === false
                      const isNewline = cueChar.char === '\n'
                      return (
                        <span
                          key={charIndex}
                          className="typing-char"
                          data-done={charDone ? 'true' : 'false'}
                          data-pending={pending ? 'true' : 'false'}
                          data-wrong={wrong ? 'true' : 'false'}
                          data-error={
                            pending && pendingError ? 'true' : 'false'
                          }
                          data-space={cueChar.char === ' ' ? 'true' : 'false'}
                          data-newline={isNewline ? 'true' : 'false'}
                        >
                          {isNewline ? '↵' : cueChar.char}
                        </span>
                      )
                    })
                  : cueText(cue)}
              </span>
              {!isLine && <wbr />}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
