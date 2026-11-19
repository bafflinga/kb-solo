// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  dismissLayoutMismatch,
  loadDismissedLayoutMismatch,
} from './layoutMismatchNotice'

const KEY = 'kb-solo.dismissedLayoutMismatch'

describe('layoutMismatchNotice', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty and persists dismissals per layout', () => {
    expect(loadDismissedLayoutMismatch().size).toBe(0)

    dismissLayoutMismatch('ru-jcuken-mac-iso')
    expect(loadDismissedLayoutMismatch().has('ru-jcuken-mac-iso')).toBe(true)
    expect(loadDismissedLayoutMismatch().has('ru-jcuken')).toBe(false)

    dismissLayoutMismatch('ru-jcuken')
    expect([...loadDismissedLayoutMismatch()].sort()).toEqual([
      'ru-jcuken',
      'ru-jcuken-mac-iso',
    ])
  })

  it('ignores malformed stored data', () => {
    localStorage.setItem(KEY, '{nope')
    expect(loadDismissedLayoutMismatch().size).toBe(0)

    localStorage.setItem(KEY, JSON.stringify(['ru-jcuken', 'bogus-layout', 7]))
    expect([...loadDismissedLayoutMismatch()]).toEqual(['ru-jcuken'])
  })
})
