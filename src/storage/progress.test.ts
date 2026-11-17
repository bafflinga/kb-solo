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
      bestNetWpm: 20,
      bestAccuracy: 0.95,
      stars: 2 as const,
      attempts: 1,
      completedAt: 1,
    }

    store.saveProgress(record)
    expect(store.loadProgress('en-home-left')).toEqual(record)
    expect(storage.getItem('kb-solo.progress.en-home-left')).toBeNull()

    vi.advanceTimersByTime(499)
    expect(storage.getItem('kb-solo.progress.en-home-left')).toBeNull()

    vi.advanceTimersByTime(1)
    expect(storage.getItem('kb-solo.progress.en-home-left')).toBe(
      JSON.stringify(record),
    )
  })

  it('merges pending and stored records, tracks unlocks and clears everything', () => {
    const { store } = setup()
    const done = {
      lessonId: 'en-home-left',
      bestNetWpm: 20,
      bestAccuracy: 0.95,
      stars: 2 as const,
      attempts: 1,
      completedAt: 1,
    }
    const started = {
      lessonId: 'en-home-right',
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
      netWpm: 24.6,
      accuracy: 0.98,
      stars: 3,
      completed: true,
      at: 1000,
    })

    expect(next).toEqual({
      lessonId: 'en-home-left',
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
      bestNetWpm: 20,
      bestAccuracy: 0.9,
      stars: 1 as const,
      attempts: 2,
      completedAt: 500,
    }

    const next = mergeProgress(previous, {
      lessonId: 'l',
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
      bestNetWpm: 30,
      bestAccuracy: 0.97,
      stars: 3 as const,
      attempts: 1,
      completedAt: 500,
    }

    const next = mergeProgress(previous, {
      lessonId: 'l',
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
      bestNetWpm: 20,
      bestAccuracy: 0.9,
      stars: 2 as const,
      attempts: 4,
    }

    const next = mergeProgress(previous, {
      lessonId: 'l',
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
      netWpm: 0,
      accuracy: 0,
      stars: 0,
      completed: false,
      at: 900,
    })

    expect(next).toEqual({
      lessonId: 'l',
      bestNetWpm: 0,
      bestAccuracy: 0,
      stars: 0,
      attempts: 1,
    })
  })
})
