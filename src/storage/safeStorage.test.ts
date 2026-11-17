import { describe, expect, it } from 'vitest'
import { createSafeStorage } from './safeStorage'
import type { StorageLike } from './safeStorage'

function memoryBackend(initial: Record<string, string> = {}): StorageLike {
  const data = new Map(Object.entries(initial))
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

function quotaError(): Error {
  return Object.assign(new Error('full'), { name: 'QuotaExceededError' })
}

describe('safeStorage', () => {
  it('falls back to memory when setItem throws', () => {
    const backend = memoryBackend()
    const guarded = createSafeStorage({
      ...backend,
      setItem: () => {
        throw new Error('denied')
      },
    })

    guarded.set('kb-solo.settings', 'value')
    expect(guarded.get('kb-solo.settings')).toBe('value')
    expect(guarded.keys()).toContain('kb-solo.settings')
    guarded.remove('kb-solo.settings')
    expect(guarded.get('kb-solo.settings')).toBeUndefined()
  })

  it('reads and writes through a working backend', () => {
    const backend = memoryBackend({ existing: 'stored' })
    const guarded = createSafeStorage(backend)

    expect(guarded.get('existing')).toBe('stored')
    guarded.set('fresh', 'written')
    expect(backend.getItem('fresh')).toBe('written')
  })

  it('prunes oldest progress keys on quota failure and retries', () => {
    let full = false
    const data = new Map<string, string>()
    const backend: StorageLike = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        if (full && !key.includes('__probe__')) {
          throw quotaError()
        }
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

    const guarded = createSafeStorage(backend)
    guarded.set('kb-solo.progress.old', 'old')
    full = true

    guarded.set('kb-solo.settings', 'settings')
    expect(guarded.get('kb-solo.progress.old')).toBeUndefined()
    expect(guarded.get('kb-solo.settings')).toBe('settings')
  })
})
