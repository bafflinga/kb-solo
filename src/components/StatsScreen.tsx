import { useCallback } from 'react'
import type { PaceLevel } from '../domain/pacing'
import type { ContentLanguage } from '../domain/types'
import type { LessonMeta } from '../domain/lessons/types'
import type { LessonProgress } from '../storage/progress'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n'
import { starGlyphs } from './stars'
import { LANGUAGE_LABEL } from './languages'
import { navigate } from '../app/useHashRoute'
import './statsScreen.css'

const LANGUAGES: readonly ContentLanguage[] = ['en', 'ru']

export interface StatsScreenProps {
  progress: LessonProgress[]
  lessons: LessonMeta[]
  paceLevel?: PaceLevel
}

export function StatsScreen({
  progress,
  lessons,
  paceLevel = 'off',
}: StatsScreenProps) {
  const { t, n } = useI18n()
  const scored = progress.filter((item) => item.completedAt !== undefined)
  const records = new Map(scored.map((item) => [item.lessonId, item]))
  const completed = scored.length
  const attempts = progress.reduce((sum, item) => sum + item.attempts, 0)
  const bestWpm = scored.reduce(
    (max, item) => Math.max(max, item.bestNetWpm),
    0,
  )
  const averageAccuracy =
    scored.length === 0
      ? 0
      : scored.reduce((sum, item) => sum + item.bestAccuracy, 0) / scored.length

  const gotoLessonHandler = useCallback((id: string) => () => {
    navigate(`#/lesson/${encodeURIComponent(id)}`)
  }, [])

  if (progress.length === 0) {
    return (
      <section className="panel stats-screen">
        <h2>{t('stats')}</h2>
        <p className="muted">
          {t('statsPace', { pace: t(`pace.${paceLevel}` as MessageKey) })}
        </p>
        <p className="muted">{t('statsEmpty')}</p>
      </section>
    )
  }

  return (
    <section className="panel stats-screen">
      <h2>{t('stats')}</h2>
      <p className="muted">
        {t('statsPace', { pace: t(`pace.${paceLevel}` as MessageKey) })}
      </p>
      <p>{t('lessonCompleted', { count: completed })}</p>
      <dl className="stats-overall">
        <div>
          <dt>{t('attempts')}</dt>
          <dd>{n(attempts)}</dd>
        </div>
        <div>
          <dt>
            {t('best')} {t('wpm')}
          </dt>
          <dd>{n(bestWpm)}</dd>
        </div>
        <div>
          <dt>{t('averageAccuracy')}</dt>
          <dd>{n(Math.round(averageAccuracy * 100))}%</dd>
        </div>
      </dl>

      {LANGUAGES.map((language) => {
        const rows = lessons.filter(
          (meta) => meta.language === language && records.has(meta.id),
        )
        if (rows.length === 0) {
          return null
        }
        return (
          <section key={language} className="stats-group">
            <h3>
              {LANGUAGE_LABEL[language]} ·{' '}
              {t('lessonCompletedCount', { count: rows.length })}
            </h3>
            <ul className="stats-list">
              {rows.map((meta) => {
                const record = records.get(meta.id)
                return (
                  <li
                    key={meta.id}
                    className="stats-row"
                    onClick={gotoLessonHandler(meta.id)}
                  >
                    <span>{t(meta.titleKey as MessageKey)}</span>
                    <span className="stars" aria-label={t('stars')}>
                      {starGlyphs(record?.stars ?? 0)}
                    </span>
                    <span className="muted">
                      {t('best')}: {n(record?.bestNetWpm ?? 0)} {t('wpm')}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </section>
  )
}
