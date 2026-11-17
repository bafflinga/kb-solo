export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  readonly length?: number
  key?(index: number): string | null
}

export interface SafeStorage {
  get(key: string): string | undefined
  set(key: string, value: string): void
  remove(key: string): void
  keys(): string[]
}

export const PROGRESS_PREFIX = 'kb-solo.progress.'

function getGlobalStorage(): StorageLike | null {
  try {
    const candidate = globalThis.localStorage
    return candidate ?? null
  } catch {
    return null
  }
}

function quotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return false
  }
  const name = (error as { name?: unknown }).name
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
}

export function createSafeStorage(backend?: StorageLike | null): SafeStorage {
  const memory = new Map<string, string>()
  const order: string[] = []
  let target: StorageLike | null = null

  const candidate = backend === undefined ? getGlobalStorage() : backend
  if (candidate) {
    try {
      const probe = 'kb-solo.__probe__'
      candidate.setItem(probe, '1')
      candidate.removeItem(probe)
      target = candidate
    } catch {
      target = null
    }
  }

  function remember(key: string): void {
    const index = order.indexOf(key)
    if (index >= 0) {
      order.splice(index, 1)
    }
    order.push(key)
  }

  function forget(key: string): void {
    const index = order.indexOf(key)
    if (index >= 0) {
      order.splice(index, 1)
    }
  }

  function writeToMemory(key: string, value: string): void {
    memory.set(key, value)
    remember(key)
  }

  function pruneOldest(count: number): void {
    const stale = order
      .filter((key) => key.startsWith(PROGRESS_PREFIX))
      .slice(0, count)
    for (const key of stale) {
      try {
        target?.removeItem(key)
      } catch {
        memory.delete(key)
      }
      memory.delete(key)
      forget(key)
    }
  }

  return {
    get(key) {
      const fallback = memory.get(key)
      if (!target) {
        return fallback
      }
      try {
        return target.getItem(key) ?? fallback
      } catch {
        return fallback
      }
    },
    set(key, value) {
      if (!target) {
        writeToMemory(key, value)
        return
      }
      try {
        target.setItem(key, value)
        remember(key)
        return
      } catch (error) {
        if (!quotaError(error)) {
          writeToMemory(key, value)
          return
        }
      }
      pruneOldest(5)
      try {
        target.setItem(key, value)
        remember(key)
      } catch {
        writeToMemory(key, value)
      }
    },
    remove(key) {
      memory.delete(key)
      forget(key)
      if (!target) {
        return
      }
      try {
        target.removeItem(key)
      } catch {
        return
      }
    },
    keys() {
      const result = new Set<string>([...memory.keys(), ...order])
      if (target?.length !== undefined && typeof target.key === 'function') {
        try {
          for (let index = 0; index < target.length; index++) {
            const key = target.key(index)
            if (key !== null) {
              result.add(key)
            }
          }
        } catch {
          return [...result]
        }
      }
      return [...result]
    },
  }
}

export const safeStorage = createSafeStorage()
