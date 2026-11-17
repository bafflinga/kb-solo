import { codeForChar, fingerFor } from './layout'
import type { Cue, CueChar, Layout } from './types'

function cueCharFor(layout: Layout, char: string): CueChar {
  if (char === '\n') {
    return { char, code: 'Enter', needsShift: false }
  }

  const code = codeForChar(layout, char)
  if (code === undefined) {
    throw new Error(
      `Character ${JSON.stringify(char)} is not available in layout ${layout.id}`,
    )
  }

  const legend = layout.legends[code]
  if (!legend) {
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
): Cue {
  return {
    kind,
    text,
    chars: Array.from(text, (char) => cueCharFor(layout, char)),
  }
}

export function wordCues(layout: Layout, text: string): Cue[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => cueFromText(layout, `${word} `, 'word'))
}

export function lineCues(layout: Layout, text: string): Cue[] {
  const lines = text.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines.map((line) => cueFromText(layout, `${line}\n`, 'line'))
}

export function drillCues(layout: Layout, pattern: string): Cue[] {
  return wordCues(layout, pattern)
}
