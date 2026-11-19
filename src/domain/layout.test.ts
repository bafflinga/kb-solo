import { describe, expect, it } from 'vitest'
import {
  allLayouts,
  codeForChar,
  expectedKeyFor,
  getLayout,
  inputCodeFor,
  layoutForProfile,
  layoutsForLanguage,
  profileOf,
} from './layout'

const ru = getLayout('ru-jcuken')
const ruMac = getLayout('ru-jcuken-mac')
const ruMacIso = getLayout('ru-jcuken-mac-iso')
const us = getLayout('us-qwerty')
const usMac = getLayout('us-qwerty-mac')
const usMacIso = getLayout('us-qwerty-mac-iso')

describe('layouts', () => {
  it('exposes all layout variants', () => {
    expect(allLayouts().map((layout) => layout.id)).toEqual([
      'us-qwerty',
      'us-qwerty-mac',
      'us-qwerty-mac-iso',
      'ru-jcuken',
      'ru-jcuken-mac',
      'ru-jcuken-mac-iso',
    ])
    expect(us.formFactor).toBe('ansi')
    expect(ru.formFactor).toBe('ansi')
    expect(ruMac.formFactor).toBe('ansi')
    expect(ruMacIso.formFactor).toBe('iso')
    expect(usMacIso.formFactor).toBe('iso')
  })

  it('maps layouts to keyboard profiles and languages', () => {
    expect(profileOf('us-qwerty')).toBe('pc')
    expect(profileOf('ru-jcuken-mac')).toBe('mac-ansi')
    expect(profileOf('us-qwerty-mac-iso')).toBe('mac-iso')
    expect(layoutForProfile('mac-iso', 'en')).toBe('us-qwerty-mac-iso')
    expect(layoutForProfile('mac-iso', 'ru')).toBe('ru-jcuken-mac-iso')
    expect(layoutsForLanguage('ru').map((layout) => layout.id)).toEqual([
      'ru-jcuken',
      'ru-jcuken-mac',
      'ru-jcuken-mac-iso',
    ])
    expect(layoutsForLanguage('en').map((layout) => layout.id)).toEqual([
      'us-qwerty',
      'us-qwerty-mac',
      'us-qwerty-mac-iso',
    ])
  })

  it('resolves Cyrillic characters to physical codes', () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['ж', 'Semicolon'],
      ['э', 'Quote'],
      ['ъ', 'BracketRight'],
      ['ё', 'Backquote'],
      ['Ё', 'Backquote'],
      ['ю', 'Period'],
      ['б', 'Comma'],
      ['й', 'KeyQ'],
      ['я', 'KeyZ'],
    ]
    for (const [char, code] of cases) {
      expect(codeForChar(ru, char), char).toBe(code)
    }
  })

  it('prefers the base layer over the shift layer', () => {
    expect(codeForChar(ru, 'б')).toBe('Comma')
    expect(codeForChar(ru, ',')).toBe('Slash')
    expect(codeForChar(ru, '.')).toBe('Slash')
    expect(codeForChar(ru, 'ё')).toBe('Backquote')
    expect(codeForChar(ru, 'Ё')).toBe('Backquote')
  })

  it('resolves the Russian number-row shift layer', () => {
    expect(codeForChar(ru, '№')).toBe('Digit3')
    expect(codeForChar(ru, ';')).toBe('Digit4')
    expect(codeForChar(ru, ':')).toBe('Digit6')
    expect(codeForChar(ru, '?')).toBe('Digit7')
  })

  it('models the Mac ANSI Russian laptop legends', () => {
    expect(
      expectedKeyFor(ruMac, 'Backquote', { shift: false, alt: false }),
    ).toBe(']')
    expect(
      expectedKeyFor(ruMac, 'Backquote', { shift: true, alt: false }),
    ).toBe('[')
    expect(
      expectedKeyFor(ruMac, 'Backslash', { shift: false, alt: false }),
    ).toBe('ё')
    expect(
      expectedKeyFor(ruMac, 'Backslash', { shift: true, alt: false }),
    ).toBe('Ё')
    expect(expectedKeyFor(ruMac, 'Slash', { shift: false, alt: false })).toBe(
      '/',
    )
    expect(expectedKeyFor(ruMac, 'Slash', { shift: true, alt: false })).toBe(
      '?',
    )
  })

  it('models the Mac ISO Russian number row and punctuation', () => {
    expect(
      expectedKeyFor(ruMacIso, 'Backquote', { shift: false, alt: false }),
    ).toBe('>')
    expect(
      expectedKeyFor(ruMacIso, 'Backquote', { shift: true, alt: false }),
    ).toBe('<')
    expect(
      expectedKeyFor(ruMacIso, 'Digit4', { shift: true, alt: false }),
    ).toBe('%')
    expect(
      expectedKeyFor(ruMacIso, 'Digit5', { shift: true, alt: false }),
    ).toBe(':')
    expect(
      expectedKeyFor(ruMacIso, 'Digit6', { shift: true, alt: false }),
    ).toBe(',')
    expect(
      expectedKeyFor(ruMacIso, 'Digit7', { shift: true, alt: false }),
    ).toBe('.')
    expect(
      expectedKeyFor(ruMacIso, 'Digit8', { shift: true, alt: false }),
    ).toBe(';')
    expect(
      expectedKeyFor(ruMacIso, 'Backslash', { shift: false, alt: false }),
    ).toBe('ё')
    expect(
      expectedKeyFor(ruMacIso, 'Backslash', { shift: true, alt: false }),
    ).toBe('Ё')
    expect(
      expectedKeyFor(ruMacIso, 'IntlBackslash', { shift: false, alt: false }),
    ).toBe(']')
    expect(
      expectedKeyFor(ruMacIso, 'IntlBackslash', { shift: true, alt: false }),
    ).toBe('[')
    expect(
      expectedKeyFor(ruMacIso, 'Slash', { shift: false, alt: false }),
    ).toBe('/')
    expect(expectedKeyFor(ruMacIso, 'Slash', { shift: true, alt: false })).toBe(
      '?',
    )
  })

  it('swaps Mac ISO section and grave codes on input', () => {
    expect(inputCodeFor(ruMacIso, 'Backquote')).toBe('IntlBackslash')
    expect(inputCodeFor(ruMacIso, 'IntlBackslash')).toBe('Backquote')
    expect(inputCodeFor(ruMacIso, 'KeyZ')).toBe('KeyZ')
    expect(inputCodeFor(ruMac, 'Backquote')).toBe('Backquote')
    expect(inputCodeFor(usMacIso, 'Backquote')).toBe('IntlBackslash')
  })

  it('resolves Mac Russian characters to physical codes', () => {
    expect(codeForChar(ruMac, 'ё')).toBe('Backslash')
    expect(codeForChar(ruMac, 'Ё')).toBe('Backslash')
    expect(codeForChar(ruMac, ']')).toBe('Backquote')
    expect(codeForChar(ruMac, '[')).toBe('Backquote')
    expect(codeForChar(ruMacIso, 'ё')).toBe('Backslash')
    expect(codeForChar(ruMacIso, 'Ё')).toBe('Backslash')
    expect(codeForChar(ruMacIso, '>')).toBe('Backquote')
    expect(codeForChar(ruMacIso, '<')).toBe('Backquote')
    expect(codeForChar(ruMacIso, ']')).toBe('IntlBackslash')
    expect(codeForChar(ruMacIso, '[')).toBe('IntlBackslash')
    expect(codeForChar(ruMacIso, '%')).toBe('Digit4')
    expect(codeForChar(ruMacIso, ',')).toBe('Digit6')
    expect(codeForChar(ruMacIso, '?')).toBe('Slash')
  })

  it('models the Mac ANSI English top-left and Backslash keys', () => {
    expect(
      expectedKeyFor(usMac, 'Backquote', { shift: false, alt: false }),
    ).toBe('`')
    expect(
      expectedKeyFor(usMac, 'Backquote', { shift: true, alt: false }),
    ).toBe('~')
    expect(
      expectedKeyFor(usMac, 'Backslash', { shift: false, alt: false }),
    ).toBe('\\')
    expect(
      expectedKeyFor(usMac, 'Backslash', { shift: true, alt: false }),
    ).toBe('|')
  })

  it('models the Mac ISO English top-left and IntlBackslash keys', () => {
    expect(
      expectedKeyFor(usMacIso, 'Backquote', { shift: false, alt: false }),
    ).toBe('§')
    expect(
      expectedKeyFor(usMacIso, 'Backquote', { shift: true, alt: false }),
    ).toBe('±')
    expect(
      expectedKeyFor(usMacIso, 'IntlBackslash', { shift: false, alt: false }),
    ).toBe('`')
    expect(
      expectedKeyFor(usMacIso, 'IntlBackslash', { shift: true, alt: false }),
    ).toBe('~')
    expect(
      expectedKeyFor(usMacIso, 'Backslash', { shift: false, alt: false }),
    ).toBe('\\')
  })

  it('resolves US symbols', () => {
    expect(codeForChar(us, ';')).toBe('Semicolon')
    expect(codeForChar(us, "'")).toBe('Quote')
    expect(codeForChar(us, '?')).toBe('Slash')
    expect(codeForChar(us, ':')).toBe('Semicolon')
  })

  it('computes the expected character under modifiers', () => {
    expect(expectedKeyFor(ru, 'Digit3', { shift: true, alt: false })).toBe('№')
    expect(expectedKeyFor(ru, 'Digit8', { shift: false, alt: true })).toBe('₽')
    expect(expectedKeyFor(ru, 'Digit8', { shift: true, alt: true })).toBe('₽')
    expect(expectedKeyFor(ru, 'Backquote', { shift: false, alt: false })).toBe(
      'ё',
    )
    expect(expectedKeyFor(ru, 'Backquote', { shift: true, alt: false })).toBe(
      'Ё',
    )
    expect(expectedKeyFor(us, 'KeyA', { shift: false, alt: false })).toBe('a')
    expect(expectedKeyFor(us, 'KeyA', { shift: true, alt: false })).toBe('A')
    expect(
      expectedKeyFor(us, 'NoSuchCode', { shift: false, alt: false }),
    ).toBeUndefined()
  })

  it('returns undefined for a character the layout cannot produce', () => {
    expect(codeForChar(us, 'Ж')).toBeUndefined()
  })
})
