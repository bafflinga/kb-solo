import type { ContentLanguage } from '../types'
import { buildChainedLessons, chainDefs } from './curriculum'
import { enDefs } from './curriculum.en'
import { ruDefs } from './curriculum.ru'
import type { LessonContentMap, LessonMeta, LessonProvider } from './types'

const DEF_GROUPS = [enDefs, ruDefs] as const
const METAS: readonly LessonMeta[] = DEF_GROUPS.flatMap(chainDefs)
const KNOWN_IDS = new Set(METAS.map((meta) => meta.id))

let providers: ReadonlyMap<string, LessonProvider> = new Map()

export function isKnownLessonId(id: string): boolean {
  return KNOWN_IDS.has(id)
}

export function hydrateLessons(content: LessonContentMap): void {
  const built = DEF_GROUPS.flatMap((defs) => buildChainedLessons(defs, content))
  providers = new Map(built.map((provider) => [provider.meta.id, provider]))
}

function compareMeta(a: LessonMeta, b: LessonMeta): number {
  return a.language.localeCompare(b.language)
}

export function allLessons(): LessonMeta[] {
  return [...METAS].sort(compareMeta)
}

export function lessonsFor(language: ContentLanguage): LessonMeta[] {
  return allLessons().filter((meta) => meta.language === language)
}

export function getLessonMeta(id: string): LessonMeta | undefined {
  return METAS.find((meta) => meta.id === id)
}

export function getLesson(id: string): LessonProvider | undefined {
  return providers.get(id)
}

export function isUnlocked(
  meta: LessonMeta,
  completedIds: ReadonlySet<string>,
): boolean {
  return (meta.requires ?? []).every((id) => completedIds.has(id))
}

/** The following lesson in the same language, or `undefined` at the end. */
export function nextLesson(meta: LessonMeta): LessonMeta | undefined {
  const lessons = lessonsFor(meta.language)
  const index = lessons.findIndex((candidate) => candidate.id === meta.id)
  return index >= 0 ? lessons[index + 1] : undefined
}
