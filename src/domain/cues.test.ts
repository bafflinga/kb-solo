import { describe, expect, it } from 'vitest'
import { cueFromText, drillCues, lineCues, wordCues } from './cues'
import { getLayout } from './layout'
import type { CueChar, LayoutId } from './types'

function firstChar(text: string, layoutId: LayoutId = 'ru-jcuken'): CueChar {
  const cue = cueFromText(getLayout(layoutId), text, 'char')
  const char = cue.chars[0]
  if (!char) {
    throw new Error(`No cue char produced for ${JSON.stringify(text)}`)
  }
  return char
}

describe('cues', () => {
  it('maps lowercase Cyrillic to the correct physical code', () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['ж', 'Semicolon'],
      ['э', 'Quote'],
      ['ъ', 'BracketRight'],
      ['ё', 'Backquote'],
      ['ю', 'Period'],
      ['б', 'Comma'],
      ['й', 'KeyQ'],
      ['я', 'KeyZ'],
    ]
    for (const [char, code] of cases) {
      expect(firstChar(char).code, char).toBe(code)
    }
  })

  it('maps uppercase Cyrillic to the same code with Shift', () => {
    expect(firstChar('Ж').code).toBe('Semicolon')
    expect(firstChar('Ж').needsShift).toBe(true)
    expect(firstChar('Ё').code).toBe('Backquote')
    expect(firstChar('Ё').needsShift).toBe(true)
  })

  it('handles the yo/YO shift pair correctly', () => {
    expect(firstChar('ё').code).toBe('Backquote')
    expect(firstChar('ё').needsShift).toBe(false)
    expect(firstChar('Ё').code).toBe('Backquote')
    expect(firstChar('Ё').needsShift).toBe(true)
  })

  it('maps Russian punctuation and symbols with the right Shift state', () => {
    expect(firstChar(',').code).toBe('Slash')
    expect(firstChar(',').needsShift).toBe(true)
    expect(firstChar('.').code).toBe('Slash')
    expect(firstChar('.').needsShift).toBe(false)
    expect(firstChar('№').code).toBe('Digit3')
    expect(firstChar('№').needsShift).toBe(true)
  })

  it('maps US symbols with the right Shift state', () => {
    const semi = firstChar(';', 'us-qwerty')
    expect(semi.code).toBe('Semicolon')
    expect(semi.needsShift).toBe(false)

    const quote = firstChar("'", 'us-qwerty')
    expect(quote.code).toBe('Quote')
    expect(quote.needsShift).toBe(false)

    const question = firstChar('?', 'us-qwerty')
    expect(question.code).toBe('Slash')
    expect(question.needsShift).toBe(true)

    const colon = firstChar(':', 'us-qwerty')
    expect(colon.code).toBe('Semicolon')
    expect(colon.needsShift).toBe(true)
  })

  it('attaches the positional finger to each cue char', () => {
    expect(firstChar('f', 'us-qwerty').finger).toBe('li')
    expect(firstChar('а').finger).toBe('li')
    expect(firstChar(' ', 'us-qwerty').finger).toBe('thumb')
  })

  it('maps a newline to Enter without Shift', () => {
    const cue = cueFromText(getLayout('us-qwerty'), '\n', 'line')
    expect(cue.chars).toHaveLength(1)
    expect(cue.chars[0]?.code).toBe('Enter')
    expect(cue.chars[0]?.needsShift).toBe(false)
  })

  it('throws on a character the layout cannot produce', () => {
    expect(() => cueFromText(getLayout('us-qwerty'), 'Ж', 'char')).toThrow(
      /not available/,
    )
  })

  it('builds word cues with a trailing space', () => {
    const cues = wordCues(getLayout('us-qwerty'), 'cat dog')
    expect(cues.map((cue) => cue.text)).toEqual(['cat ', 'dog '])
    expect(cues.every((cue) => cue.kind === 'word')).toBe(true)
  })

  it('builds line cues ending with Enter and drops a trailing empty line', () => {
    const cues = lineCues(getLayout('us-qwerty'), 'ab\ncd\n')
    expect(cues.map((cue) => cue.text)).toEqual(['ab\n', 'cd\n'])
    expect(cues.every((cue) => cue.kind === 'line')).toBe(true)
    expect(cues[0]?.chars.at(-1)?.code).toBe('Enter')
  })

  it('builds drill cues from a spaced pattern', () => {
    const cues = drillCues(getLayout('us-qwerty'), 'as df')
    expect(cues.map((cue) => cue.text)).toEqual(['as ', 'df '])
    expect(cues.every((cue) => cue.kind === 'word')).toBe(true)
  })
})
