import { PROGRESS_PREFIX, safeStorage } from './safeStorage'
import type { SafeStorage } from './safeStorage'
import { requestPersistence } from './persistence'

export interface LessonProgress {
  lessonId: string
  bestNetWpm: number
  bestAccuracy: number
  stars: 0 | 1 | 2 | 3
  attempts: number
  completedAt?: number
}

export interface LessonResult {
  lessonId: string
  netWpm: number
  accuracy: number
  stars: 0 | 1 | 2 | 3
  completed: boolean
  at: number
}

/**
 * Folds one finished attempt into a lesson's stored record. A completed run
 * raises `stars`/`best*` (never lowers them) and stamps `completedAt` once;
 * every finished run — success or failure — counts as an attempt.
 */
export function mergeProgress(
  prev: LessonProgress | undefined,
  result: LessonResult,
): LessonProgress {
  const attempts = (prev?.attempts ?? 0) + 1
  if (!result.completed) {
    return {
      lessonId: result.lessonId,
      bestNetWpm: prev?.bestNetWpm ?? 0,
      bestAccuracy: prev?.bestAccuracy ?? 0,
      stars: prev?.stars ?? 0,
      attempts,
      ...(prev?.completedAt === undefined
        ? {}
        : { completedAt: prev.completedAt }),
    }
  }
  return {
    lessonId: result.lessonId,
    bestNetWpm: Math.max(prev?.bestNetWpm ?? 0, result.netWpm),
    bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, result.accuracy),
    stars: Math.max(prev?.stars ?? 0, result.stars) as 0 | 1 | 2 | 3,
    attempts,
    completedAt: prev?.completedAt ?? result.at,
  }
}

export interface ProgressStore {
  loadProgress(lessonId: string): LessonProgress | undefined
  saveProgress(progress: LessonProgress): void
  allProgress(): LessonProgress[]
  completedLessonIds(): ReadonlySet<string>
  clearAllProgress(): void
  flush(): void
}

function decode(raw: string | undefined): LessonProgress | undefined {
  if (raw === undefined) {
    return undefined
  }
  try {
    const parsed = JSON.parse(raw) as LessonProgress
    return typeof parsed.lessonId === 'string' ? parsed : undefined
  } catch {
    return undefined
  }
}

export function createProgressStore(storage: SafeStorage): ProgressStore {
  const pending = new Map<string, LessonProgress>()
  const persistedIds = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | undefined

  function flush(): void {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    for (const progress of pending.values()) {
      storage.set(PROGRESS_PREFIX + progress.lessonId, JSON.stringify(progress))
      if (
        progress.completedAt !== undefined &&
        !persistedIds.has(progress.lessonId)
      ) {
        persistedIds.add(progress.lessonId)
        void requestPersistence()
      }
    }
    pending.clear()
  }

  function loadProgress(lessonId: string): LessonProgress | undefined {
    return (
      pending.get(lessonId) ?? decode(storage.get(PROGRESS_PREFIX + lessonId))
    )
  }

  function saveProgress(progress: LessonProgress): void {
    pending.set(progress.lessonId, progress)
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    timer = setTimeout(flush, 500)
  }

  function allProgress(): LessonProgress[] {
    const byId = new Map<string, LessonProgress>()
    for (const key of storage.keys()) {
      if (!key.startsWith(PROGRESS_PREFIX)) {
        continue
      }
      const progress = decode(storage.get(key))
      if (progress) {
        byId.set(progress.lessonId, progress)
      }
    }
    for (const progress of pending.values()) {
      byId.set(progress.lessonId, progress)
    }
    return [...byId.values()]
  }

  function completedLessonIds(): ReadonlySet<string> {
    return new Set(
      allProgress()
        .filter((progress) => progress.completedAt !== undefined)
        .map((progress) => progress.lessonId),
    )
  }

  function clearAllProgress(): void {
    pending.clear()
    for (const key of storage.keys()) {
      if (key.startsWith(PROGRESS_PREFIX)) {
        storage.remove(key)
      }
    }
  }

  return {
    loadProgress,
    saveProgress,
    allProgress,
    completedLessonIds,
    clearAllProgress,
    flush,
  }
}

export const progressStore = createProgressStore(safeStorage)

export const loadProgress = progressStore.loadProgress
export const saveProgress = progressStore.saveProgress
export const allProgress = progressStore.allProgress
export const completedLessonIds = progressStore.completedLessonIds
export const clearAllProgress = progressStore.clearAllProgress
export const flushProgress = progressStore.flush

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushProgress)
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushProgress()
    }
  })
}
