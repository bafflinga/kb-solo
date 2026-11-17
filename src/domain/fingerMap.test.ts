import { describe, expect, it } from 'vitest'
import { ANSI_GEOMETRY, ISO_GEOMETRY } from './geometry'
import { fingerFor } from './fingerMap'
import { allLayouts, getLayout } from './layout'
import type { Code, Finger, LayoutId } from './types'

function mappedCodes(layoutId: LayoutId): Record<Code, Finger | undefined> {
  const layout = getLayout(layoutId)
  const codes = new Set([
    ...Object.keys(layout.legends),
    ...Object.keys(layout.geometry),
  ])
  return Object.fromEntries([...codes].map((code) => [code, fingerFor(code)]))
}

describe('finger map', () => {
  it('assigns a finger to every printable code in both layouts', () => {
    for (const layout of allLayouts()) {
      for (const code of Object.keys(layout.legends)) {
        expect(fingerFor(code), `${layout.id}: ${code}`).toBeDefined()
      }
    }
  })

  it('assigns a finger to every geometry code', () => {
    for (const code of [
      ...Object.keys(ANSI_GEOMETRY),
      ...Object.keys(ISO_GEOMETRY),
    ]) {
      expect(fingerFor(code), code).toBeDefined()
    }
    expect(fingerFor('IntlBackslash')).toBe('lp')
  })

  it('is identical between us-qwerty and ru-jcuken', () => {
    expect(mappedCodes('us-qwerty')).toEqual(mappedCodes('ru-jcuken'))
  })

  it('uses the classic positional defaults', () => {
    expect(fingerFor('KeyB')).toBe('li')
    expect(fingerFor('Digit8')).toBe('rm')
    expect(fingerFor('Digit9')).toBe('rr')
    expect(fingerFor('Space')).toBe('thumb')
    expect(fingerFor('ShiftRight')).toBe('rp')
  })
})
