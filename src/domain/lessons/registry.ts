import type { ContentLanguage } from '../types'
import { enLessons } from './curriculum.en'
import { ruLessons } from './curriculum.ru'
import type { LessonMeta, LessonProvider } from './types'

const PROVIDERS: readonly LessonProvider[] = [...enLessons, ...ruLessons]

function compareMeta(a: LessonMeta, b: LessonMeta): number {
  if (a.language !== b.language) {
    return a.language.localeCompare(b.language)
  }
  if (a.order !== b.order) {
    return a.order - b.order
  }
  return a.id.localeCompare(b.id)
}

export function allLessons(): LessonMeta[] {
  return PROVIDERS.map((provider) => provider.meta).sort(compareMeta)
}

export function lessonsFor(language: ContentLanguage): LessonMeta[] {
  return allLessons().filter((meta) => meta.language === language)
}

export function getLesson(id: string): LessonProvider | undefined {
  return PROVIDERS.find((provider) => provider.meta.id === id)
}

export function isUnlocked(
  meta: LessonMeta,
  completedIds: ReadonlySet<string>,
): boolean {
  return (meta.requires ?? []).every((id) => completedIds.has(id))
}

/** The following lesson in the same language, or `undefined` at the end. */
export function nextLesson(meta: LessonMeta): LessonMeta | undefined {
  return lessonsFor(meta.language).find(
    (candidate) => candidate.order > meta.order,
  )
}
