import { codeForChar, fingerFor } from './layout'
import type { Code, Cue, CueChar, Layout } from './types'

export interface CueTextOptions {
  /** Layout-independent character mapper. Returning undefined drops the char. */
  charMap?: (char: string) => CueChar | undefined
  /** Drop characters the active layout cannot produce instead of throwing. */
  dropMissing?: boolean
}

function cueCharFor(
  layout: Layout,
  char: string,
  options?: CueTextOptions,
): CueChar | undefined {
  if (char === '\n') {
    return { char, code: 'Enter', needsShift: false }
  }

  if (options?.charMap) {
    return options.charMap(char)
  }

  const code = codeForChar(layout, char)
  if (code === undefined) {
    if (options?.dropMissing) {
      return undefined
    }
    throw new Error(
      `Character ${JSON.stringify(char)} is not available in layout ${layout.id}`,
    )
  }

  const legend = layout.legends[code]
  if (!legend) {
    if (options?.dropMissing) {
      return undefined
    }
    throw new Error(`Missing legend for code ${code} in layout ${layout.id}`)
  }

  return {
    char,
    code,
    finger: fingerFor(code),
    needsShift: legend.shift !== legend.base && char === legend.shift,
  }
}

export function cueFromText(
  layout: Layout,
  text: string,
  kind: Cue['kind'],
  options?: CueTextOptions,
): Cue {
  const chars = Array.from(text, (char) =>
    cueCharFor(layout, char, options),
  ).filter((char): char is CueChar => char !== undefined)
  return {
    kind,
    text: chars.map((char) => char.char).join(''),
    chars,
  }
}

export function wordCues(
  layout: Layout,
  text: string,
  options?: CueTextOptions,
): Cue[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => cueFromText(layout, `${word} `, 'word', options))
    .filter((cue) => cue.text.trim().length > 0)
}

export function lineCues(
  layout: Layout,
  text: string,
  options?: CueTextOptions,
): Cue[] {
  const lines = text.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
    .map((line) => cueFromText(layout, `${line}\n`, 'line', options))
    .filter((cue) => cue.text.trim().length > 0)
}

export function drillCues(
  layout: Layout,
  pattern: string,
  options?: CueTextOptions,
): Cue[] {
  return wordCues(layout, pattern, options)
}

export interface RandomComboOptions {
  chunkCount?: number
  minLength?: number
  maxLength?: number
  rng?: () => number
}

export function randomComboCues(
  layout: Layout,
  codes: readonly Code[],
  options: RandomComboOptions = {},
): Cue[] {
  const chars = codes
    .map((code) => layout.legends[code]?.base)
    .filter(
      (char): char is string =>
        typeof char === 'string' && char.length === 1 && !/\s/.test(char),
    )
  if (chars.length === 0) {
    return []
  }

  const chunkCount = options.chunkCount ?? 10
  const minLength = options.minLength ?? 2
  const maxLength = options.maxLength ?? 5
  const rng = options.rng ?? Math.random
  const chunks: string[] = []

  for (let index = 0; index < chunkCount; index += 1) {
    const span = Math.max(0, maxLength - minLength)
    const length = minLength + Math.min(span, Math.floor(rng() * (span + 1)))
    let chunk = ''
    for (let position = 0; position < length; position += 1) {
      const charIndex = Math.min(
        chars.length - 1,
        Math.floor(rng() * chars.length),
      )
      chunk += chars[charIndex]
    }
    chunks.push(chunk)
  }

  return wordCues(layout, chunks.join(' '))
}
