import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProgressStore, mergeProgress } from './progress'
import { createSafeStorage } from './safeStorage'
import type { StorageLike } from './safeStorage'

function backend(): StorageLike {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
    get length() {
      return data.size
    },
    key: (index) => [...data.keys()][index] ?? null,
  }
}

function setup() {
  const storage = backend()
  return { storage, store: createProgressStore(createSafeStorage(storage)) }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('progress store', () => {
  it('stores one key per lesson after a 500 ms debounce', () => {
    vi.useFakeTimers()
    const { storage, store } = setup()
    const record = {
      lessonId: 'en-home-left',
      paceLevel: 'off' as const,
      bestNetWpm: 20,
      bestAccuracy: 0.95,
      stars: 2 as const,
      attempts: 1,
      completedAt: 1,
    }

    store.saveProgress(record)
    expect(store.loadProgress('en-home-left', 'off')).toEqual(record)
    expect(storage.getItem('kb-solo.progress.off.en-home-left')).toBeNull()

    vi.advanceTimersByTime(499)
    expect(storage.getItem('kb-solo.progress.off.en-home-left')).toBeNull()

    vi.advanceTimersByTime(1)
    expect(storage.getItem('kb-solo.progress.off.en-home-left')).toBe(
      JSON.stringify(record),
    )
  })

  it('merges pending and stored records, tracks unlocks and clears everything', () => {
    const { store } = setup()
    const done = {
      lessonId: 'en-home-left',
      paceLevel: 'off' as const,
      bestNetWpm: 20,
      bestAccuracy: 0.95,
      stars: 2 as const,
      attempts: 1,
      completedAt: 1,
    }
    const started = {
      lessonId: 'en-home-right',
      paceLevel: 'off' as const,
      bestNetWpm: 0,
      bestAccuracy: 0,
      stars: 0 as const,
      attempts: 1,
    }

    store.saveProgress(done)
    store.saveProgress(started)
    expect(store.allProgress()).toHaveLength(2)
    expect([...store.completedLessonIds()]).toEqual(['en-home-left'])

    store.flush()
    store.clearAllProgress()
    expect(store.allProgress()).toEqual([])
    expect(store.completedLessonIds().size).toBe(0)
  })
})

describe('mergeProgress', () => {
  it('records a first completion', () => {
    const next = mergeProgress(undefined, {
      lessonId: 'en-home-left',
      paceLevel: 'off' as const,
      netWpm: 24.6,
      accuracy: 0.98,
      stars: 3,
      completed: true,
      at: 1000,
    })

    expect(next).toEqual({
      lessonId: 'en-home-left',
      paceLevel: 'off' as const,
      bestNetWpm: 24.6,
      bestAccuracy: 0.98,
      stars: 3,
      attempts: 1,
      completedAt: 1000,
    })
  })

  it('raises stars and best scores on a better run without moving completedAt', () => {
    const previous = {
      lessonId: 'l',
      paceLevel: 'off' as const,
      bestNetWpm: 20,
      bestAccuracy: 0.9,
      stars: 1 as const,
      attempts: 2,
      completedAt: 500,
    }

    const next = mergeProgress(previous, {
      lessonId: 'l',
      paceLevel: 'off' as const,
      netWpm: 31,
      accuracy: 0.97,
      stars: 3,
      completed: true,
      at: 900,
    })

    expect(next.bestNetWpm).toBe(31)
    expect(next.bestAccuracy).toBe(0.97)
    expect(next.stars).toBe(3)
    expect(next.attempts).toBe(3)
    expect(next.completedAt).toBe(500)
  })

  it('does not lower stars or best scores on a worse run', () => {
    const previous = {
      lessonId: 'l',
      paceLevel: 'off' as const,
      bestNetWpm: 30,
      bestAccuracy: 0.97,
      stars: 3 as const,
      attempts: 1,
      completedAt: 500,
    }

    const next = mergeProgress(previous, {
      lessonId: 'l',
      paceLevel: 'off' as const,
      netWpm: 10,
      accuracy: 0.5,
      stars: 1,
      completed: true,
      at: 900,
    })

    expect(next.stars).toBe(3)
    expect(next.bestNetWpm).toBe(30)
    expect(next.bestAccuracy).toBe(0.97)
    expect(next.attempts).toBe(2)
    expect(next.completedAt).toBe(500)
  })

  it('counts a failed attempt without recording stars, bests or completion', () => {
    const previous = {
      lessonId: 'l',
      paceLevel: 'off' as const,
      bestNetWpm: 20,
      bestAccuracy: 0.9,
      stars: 2 as const,
      attempts: 4,
    }

    const next = mergeProgress(previous, {
      lessonId: 'l',
      paceLevel: 'off' as const,
      netWpm: 5,
      accuracy: 0.2,
      stars: 0,
      completed: false,
      at: 900,
    })

    expect(next).toEqual({ ...previous, attempts: 5 })
    expect(next.completedAt).toBeUndefined()
  })

  it('counts a failed attempt on an unstarted lesson', () => {
    const next = mergeProgress(undefined, {
      lessonId: 'l',
      paceLevel: 'off' as const,
      netWpm: 0,
      accuracy: 0,
      stars: 0,
      completed: false,
      at: 900,
    })

    expect(next).toEqual({
      lessonId: 'l',
      paceLevel: 'off' as const,
      bestNetWpm: 0,
      bestAccuracy: 0,
      stars: 0,
      attempts: 1,
    })
  })
})

describe('per-level progress', () => {
  const off = {
    lessonId: 'en-home-left',
    paceLevel: 'off' as const,
    bestNetWpm: 20,
    bestAccuracy: 0.9,
    stars: 2 as const,
    attempts: 3,
    completedAt: 1,
  }
  const hard = {
    lessonId: 'en-home-left',
    paceLevel: 'challenging' as const,
    bestNetWpm: 35,
    bestAccuracy: 0.98,
    stars: 3 as const,
    attempts: 1,
    completedAt: 2,
  }

  it('keeps separate records per pace level', () => {
    const { storage, store } = setup()
    store.saveProgress(off)
    store.saveProgress(hard)
    store.flush()

    expect(store.allProgress()).toHaveLength(2)
    expect(store.allProgress('off')).toEqual([off])
    expect(store.allProgress('challenging')).toEqual([hard])
    expect(store.loadProgress('en-home-left', 'off')).toEqual(off)
    expect(store.loadProgress('en-home-left', 'challenging')).toEqual(hard)
    expect(storage.getItem('kb-solo.progress.off.en-home-left')).toBe(
      JSON.stringify(off),
    )
    expect(storage.getItem('kb-solo.progress.challenging.en-home-left')).toBe(
      JSON.stringify(hard),
    )
  })

  it('shares unlocks across pace levels', () => {
    const { store } = setup()
    store.saveProgress(off)
    store.saveProgress(hard)
    store.flush()

    expect([...store.completedLessonIds()]).toEqual(['en-home-left'])
  })

  it('reads legacy records as the off level without rewriting them', () => {
    const { storage, store } = setup()
    storage.setItem(
      'kb-solo.progress.en-home-left',
      JSON.stringify({ ...off, paceLevel: undefined }),
    )

    expect(store.loadProgress('en-home-left', 'off')).toEqual(off)
    expect(store.loadProgress('en-home-left', 'challenging')).toBeUndefined()
    expect(store.allProgress('off')).toEqual([off])
    expect(storage.getItem('kb-solo.progress.en-home-left')).not.toBeNull()
  })

  it('prefers a level-specific key over a legacy record', () => {
    const { storage, store } = setup()
    storage.setItem(
      'kb-solo.progress.en-home-left',
      JSON.stringify({ ...off, bestNetWpm: 1 }),
    )
    store.saveProgress(off)
    store.flush()

    expect(store.loadProgress('en-home-left', 'off')).toEqual(off)
    expect(store.allProgress('off')).toHaveLength(1)
  })

  it('clears only the selected level', () => {
    const { store } = setup()
    store.saveProgress(off)
    store.saveProgress(hard)
    store.flush()

    store.clearProgress('off')
    expect(store.allProgress('off')).toEqual([])
    expect(store.allProgress('challenging')).toEqual([hard])
    expect([...store.completedLessonIds()]).toEqual(['en-home-left'])

    store.clearProgress()
    expect(store.allProgress()).toEqual([])
  })

  it('stores hardcore timeouts as attempt-only records', () => {
    const { store } = setup()
    const failed = mergeProgress(undefined, {
      lessonId: 'en-home-left',
      paceLevel: 'hardcore',
      netWpm: 0,
      accuracy: 0,
      stars: 0,
      completed: false,
      at: 3,
    })

    expect(failed).toEqual({
      lessonId: 'en-home-left',
      paceLevel: 'hardcore',
      bestNetWpm: 0,
      bestAccuracy: 0,
      stars: 0,
      attempts: 1,
    })
    expect(failed.completedAt).toBeUndefined()

    store.saveProgress(failed)
    store.flush()

    expect(store.allProgress('hardcore')).toEqual([failed])
    expect(store.allProgress('off')).toEqual([])
    expect([...store.completedLessonIds()]).toEqual([])
  })

  it('clears hardcore progress without touching other levels', () => {
    const { store } = setup()
    const failed = mergeProgress(undefined, {
      lessonId: 'en-home-left',
      paceLevel: 'hardcore',
      netWpm: 0,
      accuracy: 0,
      stars: 0,
      completed: false,
      at: 3,
    })
    store.saveProgress(off)
    store.saveProgress(failed)
    store.flush()

    store.clearProgress('hardcore')
    expect(store.allProgress('hardcore')).toEqual([])
    expect(store.allProgress('off')).toEqual([off])
  })
})
