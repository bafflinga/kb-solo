import type { EngineState } from '../../domain/engine'
import type { CueFeedback } from '../../app/useTypingSession'
import './typingArea.css'

export interface TypingAreaProps {
  state: EngineState
  feedback?: CueFeedback
  showFeedback?: boolean
  lang?: string
}

export function TypingArea({
  state,
  feedback,
  showFeedback = false,
  lang,
}: TypingAreaProps) {
  const cue = state.cues[state.cueIndex]
  const pendingError = state.errorMode === 'block' && state.errored

  return (
    <div className="typing-stage">
      <div className="typing-area" lang={lang}>
        {cue?.chars.map((cueChar, index) => {
          const done = index < state.charIndex
          const pending = index === state.charIndex
          const wrong = done && state.correctFlags[index] === false
          const isNewline = cueChar.char === '\n'
          const isSpace = cueChar.char === ' '
          return (
            <span
              key={`${state.cueIndex}-${index}`}
              className="typing-char"
              data-done={done ? 'true' : 'false'}
              data-pending={pending ? 'true' : 'false'}
              data-wrong={wrong ? 'true' : 'false'}
              data-error={pending && pendingError ? 'true' : 'false'}
              data-space={isSpace ? 'true' : 'false'}
              data-newline={isNewline ? 'true' : 'false'}
            >
              {isNewline ? '↵' : isSpace ? '\u00a0' : cueChar.char}
            </span>
          )
        })}
        {showFeedback && feedback !== undefined && (
          <span
            key={feedback.id}
            className="typing-feedback"
            data-kind={feedback.kind}
            aria-hidden="true"
          >
            {feedback.text}
          </span>
        )}
      </div>
    </div>
  )
}
