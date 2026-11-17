import type { ContentLanguage } from '../domain/types'
import { isUnlocked } from '../domain/lessons/registry'
import type { LessonMeta } from '../domain/lessons/types'
import type { LessonProgress } from '../storage/progress'
import { useI18n } from '../i18n'
import { LessonCard } from './LessonCard'
import { LANGUAGE_LABEL } from './languages'

export interface LessonPickerProps {
  lessons: LessonMeta[]
  language: ContentLanguage
  progress: LessonProgress[]
  completedIds: ReadonlySet<string>
  onSelect(id: string): void
}

export function LessonPicker({
  lessons,
  language,
  progress,
  completedIds,
  onSelect,
}: LessonPickerProps) {
  const { t } = useI18n()
  const records = new Map(progress.map((item) => [item.lessonId, item]))

  return (
    <section className="panel">
      <h2>{t('selectLesson')}</h2>
      <h3>
        {LANGUAGE_LABEL[language]} ·{' '}
        {t('lessonCompletedCount', { count: lessons.length })}
      </h3>
      <ul className="lesson-list">
        {lessons.map((meta) => {
          const record = records.get(meta.id)
          return (
            <LessonCard
              key={meta.id}
              meta={meta}
              stars={record?.stars ?? 0}
              bestNetWpm={record?.bestNetWpm ?? 0}
              unlocked={isUnlocked(meta, completedIds)}
              onSelect={() => onSelect(meta.id)}
            />
          )
        })}
      </ul>
    </section>
  )
}
