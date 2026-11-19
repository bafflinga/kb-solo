import { isLayoutId } from '../domain/layout'
import type { LayoutId } from '../domain/types'
import { safeStorage } from '../storage/safeStorage'

const DISMISSED_KEY = 'kb-solo.dismissedLayoutMismatch'

export function loadDismissedLayoutMismatch(): ReadonlySet<LayoutId> {
  const raw = safeStorage.get(DISMISSED_KEY)
  if (raw === undefined) {
    return new Set()
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return new Set()
    }
    return new Set(parsed.filter(isLayoutId))
  } catch {
    return new Set()
  }
}

export function dismissLayoutMismatch(id: LayoutId): void {
  const dismissed = new Set(loadDismissedLayoutMismatch())
  dismissed.add(id)
  safeStorage.set(DISMISSED_KEY, JSON.stringify([...dismissed]))
}
