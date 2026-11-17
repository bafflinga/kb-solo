import type { EngineState } from '../../domain/engine'
import type { Score } from '../../domain/scoring'
import { useI18n } from '../../i18n/useI18n'
import './hud.css'

export interface HudProps {
  state: EngineState
  score: Score
  liveWpm: number
}

export function formatTime(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function Hud({ state, score, liveWpm }: HudProps) {
  const { t, n } = useI18n()
  const finished = state.status === 'success' || state.status === 'failure'
  const wpm = finished ? Math.round(score.netWpm) : Math.round(liveWpm)
  const accuracy = Math.round(score.accuracy * 100)
  const total = state.cues.length
  const current =
    state.status === 'success' ? total : Math.min(state.cueIndex, total)

  return (
    <section className="hud">
      <dl className="hud-stats">
        <div className="hud-stat">
          <dt>{t('wpm')}</dt>
          <dd>{n(wpm)}</dd>
        </div>
        <div className="hud-stat">
          <dt>{t('accuracy')}</dt>
          <dd>{n(accuracy)}%</dd>
        </div>
        <div className="hud-stat">
          <dt>{t('time')}</dt>
          <dd>{formatTime(state.elapsedMs)}</dd>
        </div>
        <div className="hud-stat">
          <dt>{t('errors')}</dt>
          <dd>{n(state.errors)}</dd>
        </div>
      </dl>
      <div className="hud-progress">
        <div className="hud-progress-label">
          <span>{t('progress')}</span>
          <span>
            {n(current)} / {n(total)}
          </span>
        </div>
        <div
          className="hud-progress-track"
          role="progressbar"
          aria-label={t('progress')}
          aria-valuemin={0}
          aria-valuemax={Math.max(total, 1)}
          aria-valuenow={current}
          aria-valuetext={`${n(current)} / ${n(total)}`}
        >
          <span
            className="hud-progress-fill"
            style={{
              width: total === 0 ? '0%' : `${(current / total) * 100}%`,
            }}
          />
        </div>
      </div>
    </section>
  )
}

export default Hud
