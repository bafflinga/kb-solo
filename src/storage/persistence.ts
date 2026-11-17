export interface QuotaInfo {
  usage: number
  quota: number
}

let requested = false

export function hasPersistenceSupport(): boolean {
  return typeof navigator !== 'undefined' && navigator.storage !== undefined
}

export async function requestPersistence(): Promise<boolean> {
  if (requested || !hasPersistenceSupport()) {
    return false
  }
  const storage = navigator.storage
  if (
    typeof storage.persisted !== 'function' ||
    typeof storage.persist !== 'function'
  ) {
    return false
  }
  requested = true
  try {
    if (await storage.persisted()) {
      return true
    }
    return await storage.persist()
  } catch {
    return false
  }
}

export async function estimateQuota(): Promise<QuotaInfo | undefined> {
  if (
    !hasPersistenceSupport() ||
    typeof navigator.storage.estimate !== 'function'
  ) {
    return undefined
  }
  try {
    const estimate = await navigator.storage.estimate()
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 }
  } catch {
    return undefined
  }
}
