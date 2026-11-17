import type { Score, Stars } from '../domain/scoring'
import type { LessonProgress } from '../storage/progress'
import { useI18n } from '../i18n'
import { formatTime } from './Hud/Hud'
import { starGlyphs } from './stars'
import './results.css'

export interface ResultsProps {
  status: 'success' | 'failure'
  stars: Stars
  score: Score
  elapsedMs: number
  errors: number
  previousBest?: LessonProgress
  hasNext: boolean
  onRetry(): void
  onNext(): void
  onBack(): void
}

export function Results({
  status,
  stars,
  score,
  elapsedMs,
  errors,
  previousBest,
  hasNext,
  onRetry,
  onNext,
  onBack,
}: ResultsProps) {
  const { t, n } = useI18n()
  const wpm = Math.round(score.netWpm)
  const accuracy = Math.round(score.accuracy * 100)
  const newBest =
    previousBest !== undefined && score.netWpm > previousBest.bestNetWpm

  return (
    <div className="play-result results" role="status">
      <h3>{status === 'success' ? t('lessonSuccess') : t('lessonFailure')}</h3>
      <p className="results-stars stars" aria-label={t('stars')}>
        {starGlyphs(stars)}
      </p>
      <dl className="results-stats">
        <div>
          <dt>{t('wpm')}</dt>
          <dd>{n(wpm)}</dd>
        </div>
        <div>
          <dt>{t('accuracy')}</dt>
          <dd>{n(accuracy)}%</dd>
        </div>
        <div>
          <dt>{t('time')}</dt>
          <dd>{formatTime(elapsedMs)}</dd>
        </div>
        <div>
          <dt>{t('errors')}</dt>
          <dd>{n(errors)}</dd>
        </div>
      </dl>
      {previousBest !== undefined && (
        <p className="results-best muted">
          {t('best')}: {n(Math.round(previousBest.bestNetWpm))} {t('wpm')}
          {newBest && (
            <span className="results-new-best"> · {t('newBest')}</span>
          )}
        </p>
      )}
      <div className="results-actions">
        <button
          type="button"
          className="play-primary"
          onClick={(event) => {
            event.currentTarget.blur()
            onRetry()
          }}
        >
          {t('retry')}
        </button>
        {hasNext && (
          <button
            type="button"
            className="play-primary"
            onClick={(event) => {
              event.currentTarget.blur()
              onNext()
            }}
          >
            {t('nextLesson')}
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.currentTarget.blur()
            onBack()
          }}
        >
          {t('backToMenu')}
        </button>
      </div>
    </div>
  )
}
