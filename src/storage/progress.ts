import { isPaceLevel } from '../domain/pacing'
import type { PaceLevel } from '../domain/pacing'
import { PROGRESS_PREFIX, safeStorage } from './safeStorage'
import type { SafeStorage } from './safeStorage'
import { requestPersistence } from './persistence'

export interface LessonProgress {
  lessonId: string
  paceLevel: PaceLevel
  bestNetWpm: number
  bestAccuracy: number
  stars: 0 | 1 | 2 | 3
  attempts: number
  completedAt?: number
}

export interface LessonResult {
  lessonId: string
  paceLevel: PaceLevel
  netWpm: number
  accuracy: number
  stars: 0 | 1 | 2 | 3
  completed: boolean
  at: number
}

export function progressKey(lessonId: string, pace: PaceLevel): string {
  return `${PROGRESS_PREFIX}${pace}.${lessonId}`
}

interface ParsedKey {
  lessonId: string
  pace: PaceLevel
}

function parseKey(key: string): ParsedKey | undefined {
  if (!key.startsWith(PROGRESS_PREFIX)) {
    return undefined
  }
  const body = key.slice(PROGRESS_PREFIX.length)
  const dot = body.indexOf('.')
  if (dot >= 0) {
    const pace = body.slice(0, dot)
    const lessonId = body.slice(dot + 1)
    if (isPaceLevel(pace) && lessonId.length > 0) {
      return { lessonId, pace }
    }
  }
  return body.length > 0 ? { lessonId: body, pace: 'off' } : undefined
}

/**
 * Folds one finished attempt into a lesson's stored record. A completed run
 * raises `stars`/`best*` (never lowers them) and stamps `completedAt` once;
 * every finished run — success or failure — counts as an attempt.
 * Records are kept per pace level by the caller.
 */
export function mergeProgress(
  prev: LessonProgress | undefined,
  result: LessonResult,
): LessonProgress {
  const attempts = (prev?.attempts ?? 0) + 1
  if (!result.completed) {
    return {
      lessonId: result.lessonId,
      paceLevel: result.paceLevel,
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
    paceLevel: result.paceLevel,
    bestNetWpm: Math.max(prev?.bestNetWpm ?? 0, result.netWpm),
    bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, result.accuracy),
    stars: Math.max(prev?.stars ?? 0, result.stars) as 0 | 1 | 2 | 3,
    attempts,
    completedAt: prev?.completedAt ?? result.at,
  }
}

export interface ProgressStore {
  loadProgress(lessonId: string, pace: PaceLevel): LessonProgress | undefined
  saveProgress(progress: LessonProgress): void
  allProgress(pace?: PaceLevel): LessonProgress[]
  completedLessonIds(): ReadonlySet<string>
  clearProgress(pace?: PaceLevel): void
  clearAllProgress(): void
  flush(): void
}

function decode(raw: string | undefined): LessonProgress | undefined {
  if (raw === undefined) {
    return undefined
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LessonProgress>
    if (typeof parsed.lessonId !== 'string') {
      return undefined
    }
    return {
      ...(parsed as LessonProgress),
      paceLevel: isPaceLevel(parsed.paceLevel) ? parsed.paceLevel : 'off',
    }
  } catch {
    return undefined
  }
}

function recordKey(record: LessonProgress): string {
  return progressKey(record.lessonId, record.paceLevel)
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
    for (const [key, progress] of pending) {
      storage.set(key, JSON.stringify(progress))
      if (
        progress.completedAt !== undefined &&
        !persistedIds.has(key)
      ) {
        persistedIds.add(key)
        void requestPersistence()
      }
    }
    pending.clear()
  }

  function loadProgress(
    lessonId: string,
    pace: PaceLevel,
  ): LessonProgress | undefined {
    const key = progressKey(lessonId, pace)
    const found = pending.get(key) ?? decode(storage.get(key))
    if (found !== undefined) {
      return found
    }
    if (pace === 'off') {
      return decode(storage.get(PROGRESS_PREFIX + lessonId))
    }
    return undefined
  }

  function saveProgress(progress: LessonProgress): void {
    pending.set(recordKey(progress), progress)
    if (timer !== undefined) {
      clearTimeout(timer)
    }
    timer = setTimeout(flush, 500)
  }

  function allProgress(pace?: PaceLevel): LessonProgress[] {
    const byKey = new Map<string, LessonProgress>()
    for (const key of storage.keys()) {
      const parsed = parseKey(key)
      if (!parsed || (pace !== undefined && parsed.pace !== pace)) {
        continue
      }
      if (key.slice(PROGRESS_PREFIX.length).includes('.')) {
        const record = decode(storage.get(key))
        if (record) {
          byKey.set(key, record)
        }
      }
    }
    for (const key of storage.keys()) {
      const parsed = parseKey(key)
      if (!parsed || (pace !== undefined && parsed.pace !== pace)) {
        continue
      }
      if (!key.slice(PROGRESS_PREFIX.length).includes('.')) {
        const record = decode(storage.get(key))
        if (record && !byKey.has(progressKey(record.lessonId, 'off'))) {
          byKey.set(key, record)
        }
      }
    }
    for (const [key, record] of pending) {
      if (pace === undefined || record.paceLevel === pace) {
        byKey.set(key, record)
      }
    }
    return [...byKey.values()]
  }

  function completedLessonIds(): ReadonlySet<string> {
    return new Set(
      allProgress()
        .filter((progress) => progress.completedAt !== undefined)
        .map((progress) => progress.lessonId),
    )
  }

  function clearProgress(pace?: PaceLevel): void {
    for (const key of storage.keys()) {
      const parsed = parseKey(key)
      if (parsed && (pace === undefined || parsed.pace === pace)) {
        storage.remove(key)
        pending.delete(key)
        persistedIds.delete(key)
      }
    }
    for (const key of [...pending.keys()]) {
      const parsed = parseKey(key)
      if (parsed && (pace === undefined || parsed.pace === pace)) {
        pending.delete(key)
        persistedIds.delete(key)
      }
    }
  }

  function clearAllProgress(): void {
    clearProgress()
  }

  return {
    loadProgress,
    saveProgress,
    allProgress,
    completedLessonIds,
    clearProgress,
    clearAllProgress,
    flush,
  }
}

export const progressStore = createProgressStore(safeStorage)

export const loadProgress = progressStore.loadProgress
export const saveProgress = progressStore.saveProgress
export const allProgress = progressStore.allProgress
export const completedLessonIds = progressStore.completedLessonIds
export const clearProgress = progressStore.clearProgress
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
