import type { LessonMeta } from '../domain/lessons/types'
import type { Stars } from '../domain/scoring'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n'
import { starGlyphs } from './stars'

export interface LessonCardProps {
  meta: LessonMeta
  stars: Stars
  bestNetWpm: number
  unlocked: boolean
  onSelect(): void
}

export function LessonCard({
  meta,
  stars,
  bestNetWpm,
  unlocked,
  onSelect,
}: LessonCardProps) {
  const { t, n } = useI18n()

  return (
    <li>
      <button
        type="button"
        className="lesson-button"
        disabled={!unlocked}
        aria-disabled={unlocked ? undefined : true}
        title={unlocked ? undefined : t('locked')}
        onClick={onSelect}
      >
        <span className="lesson-card-main">
          <span className="lesson-title">{t(meta.titleKey as MessageKey)}</span>
          {bestNetWpm > 0 && (
            <span className="lesson-best muted">
              {t('best')}: {n(bestNetWpm)} {t('wpm')}
            </span>
          )}
        </span>
        <span className="stars" aria-label={t('stars')}>
          {starGlyphs(stars)}
        </span>
        {!unlocked && <span className="visually-hidden">{t('locked')}</span>}
      </button>
    </li>
  )
}
