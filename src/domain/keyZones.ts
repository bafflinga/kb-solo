import { FINGER_MAP } from './fingerMap'
import {
  charForSlot,
  codeForChar,
  fingerFor,
  getLayout,
  layoutsForLanguage,
  slotForChar,
} from './layout'
import type {
  Code,
  Finger,
  KeyLevel,
  Layout,
  LayoutId,
  Row,
  Side,
} from './types'
import type { LessonMeta } from './lessons/types'

export interface KeySelector {
  fingers?: Finger[]
  rows?: Row[]
  sides?: Side[]
  /** Explicit key escape hatch; still filtered by the active layout. */
  codes?: Code[]
  exclude?: Code[]
  unionExclude?: Code[]
}

export interface LessonFocus {
  /** Physical keys/fingers. Characters are derived from the active layout. */
  keys?: KeySelector
  /** Character goals (punctuation, symbols). Missing characters drop. */
  chars?: string[]
}

export interface ResolvedFocus {
  codes: Code[]
  chars: ReadonlySet<string>
  labels: string
}

const LEFT: ReadonlySet<Finger> = new Set(['lp', 'lr', 'lm', 'li'])
const RIGHT: ReadonlySet<Finger> = new Set(['ri', 'rm', 'rr', 'rp'])

function rowOf(layout: Layout, code: Code): Row | undefined {
  const geometry = layout.geometry[code]
  if (!geometry) {
    return undefined
  }
  if (geometry.y === 0) {
    return 'digits'
  }
  if (geometry.y === 1) {
    return 'top'
  }
  if (geometry.y === 2) {
    return 'home'
  }
  if (geometry.y === 3) {
    return 'bottom'
  }
  return undefined
}

function sideOf(code: Code): Side | undefined {
  const finger = FINGER_MAP[code]
  if (finger === undefined) {
    return undefined
  }
  if (LEFT.has(finger)) {
    return 'left'
  }
  if (RIGHT.has(finger)) {
    return 'right'
  }
  return undefined
}

function orderCodes(layout: Layout, codes: Iterable<Code>): Code[] {
  return [...codes].sort((a, b) => {
    const left = layout.geometry[a]
    const right = layout.geometry[b]
    if (!left || !right) {
      return a.localeCompare(b)
    }
    return left.y - right.y || left.x - right.x
  })
}

export function zoneCodes(selector: KeySelector, layout: Layout): Code[] {
  const result = new Set<Code>()

  for (const code of selector.codes ?? []) {
    if (layout.legends[code]) {
      result.add(code)
    }
  }

  const usesZone =
    selector.fingers !== undefined ||
    selector.rows !== undefined ||
    selector.sides !== undefined

  if (usesZone) {
    for (const code of Object.keys(layout.legends)) {
      const finger = FINGER_MAP[code]
      if (finger === undefined) {
        continue
      }
      if (selector.fingers && !selector.fingers.includes(finger)) {
        continue
      }
      if (selector.sides) {
        const side = sideOf(code)
        if (!side || !selector.sides.includes(side)) {
          continue
        }
      }
      if (selector.rows) {
        const row = rowOf(layout, code)
        if (!row || !selector.rows.includes(row)) {
          continue
        }
      }
      result.add(code)
    }
  }

  for (const code of selector.exclude ?? []) {
    result.delete(code)
  }

  return orderCodes(layout, result)
}

export function unionZone(meta: LessonMeta): ReadonlySet<Code> {
  const selector = meta.focus?.keys
  if (!selector) {
    return new Set()
  }
  const codes = new Set<Code>()
  const unionExclude = new Set(selector.unionExclude ?? [])
  for (const layout of layoutsForLanguage(meta.language)) {
    for (const code of zoneCodes(selector, layout)) {
      if (!unionExclude.has(code)) {
        codes.add(code)
      }
    }
  }
  return codes
}

export function coversUnion(meta: LessonMeta, layout: Layout): boolean {
  const selector = meta.focus?.keys
  if (!selector) {
    return false
  }
  const union = unionZone(meta)
  const available = new Set(zoneCodes(selector, layout))
  for (const code of union) {
    if (!available.has(code)) {
      return false
    }
  }
  return true
}

export function canonicalLayoutFor(meta: LessonMeta): Layout | undefined {
  if (!meta.focus?.keys) {
    return undefined
  }
  const authored = getLayout(meta.layoutId)
  if (coversUnion(meta, authored)) {
    return authored
  }
  for (const layout of layoutsForLanguage(meta.language)) {
    if (coversUnion(meta, layout)) {
      return layout
    }
  }
  throw new Error(`No layout covers the focus zone for ${meta.id}`)
}

export function charsForCodes(
  layout: Layout,
  codes: readonly Code[],
): Set<string> {
  const chars = new Set<string>([' ', '\n'])
  for (const code of codes) {
    const legend = layout.legends[code]
    if (!legend) {
      continue
    }
    chars.add(legend.base)
    chars.add(legend.shift)
    if (legend.alt) {
      chars.add(legend.alt)
    }
  }
  return chars
}

export function resolveFocus(
  meta: LessonMeta,
  layout: Layout,
): ResolvedFocus | undefined {
  const focus = meta.focus
  if (!focus) {
    return undefined
  }

  if (focus.chars?.length) {
    const codes: Code[] = []
    const chars = new Set<string>([' ', '\n'])
    for (const char of focus.chars) {
      const code = codeForChar(layout, char)
      if (code === undefined) {
        continue
      }
      if (!codes.includes(code)) {
        codes.push(code)
      }
      chars.add(char)
    }
    const labels = codes
      .map((code) => layout.legends[code]?.base ?? code)
      .join(' ')
    return { codes: orderCodes(layout, codes), chars, labels }
  }

  if (!focus.keys) {
    return undefined
  }

  const codes = zoneCodes(focus.keys, layout)
  const labels = codes
    .map((code) => layout.legends[code]?.base ?? code)
    .join(' ')
  return { codes, chars: charsForCodes(layout, codes), labels }
}

export interface MappedChar {
  char: string
  code: Code
  finger?: Finger
  needsShift: boolean
}

function slotChar(
  layout: Layout,
  code: Code,
  level: KeyLevel,
): string | undefined {
  return charForSlot(layout, code, level)
}

/**
 * Maps a character authored in the canonical layout onto the active layout by
 * physical key. Keys absent from the active lesson zone are dropped.
 */
export function mapCanonicalChar(
  meta: LessonMeta,
  canonical: Layout,
  active: Layout,
  char: string,
): MappedChar | undefined {
  if (char === '\n') {
    return { char, code: 'Enter', needsShift: false }
  }
  if (char === ' ') {
    return { char, code: 'Space', finger: 'thumb', needsShift: false }
  }
  const selector = meta.focus?.keys
  if (!selector) {
    return undefined
  }
  const union = unionZone(meta)
  const slot = slotForChar(canonical, char, union)
  if (!slot) {
    return undefined
  }
  const activeCodes = new Set(zoneCodes(selector, active))
  if (!activeCodes.has(slot.code)) {
    return undefined
  }
  const nextChar = slotChar(active, slot.code, slot.level)
  if (nextChar === undefined) {
    return undefined
  }
  return {
    char: nextChar,
    code: slot.code,
    finger: fingerFor(slot.code),
    needsShift: slot.level === 'shift',
  }
}

/** Converts an active-layout character back into canonical-layout text. */
export function toCanonicalChar(
  meta: LessonMeta,
  active: Layout,
  char: string,
): string | undefined {
  if (char === ' ' || char === '\n') {
    return char
  }
  const selector = meta.focus?.keys
  const canonical = canonicalLayoutFor(meta)
  if (!selector || !canonical) {
    return char
  }
  const activeCodes = new Set(zoneCodes(selector, active))
  const slot = slotForChar(active, char, activeCodes)
  if (!slot) {
    return undefined
  }
  return slotChar(canonical, slot.code, slot.level)
}

export function focusLabels(meta: LessonMeta, layout: Layout): string {
  return resolveFocus(meta, layout)?.labels ?? ''
}

/** Characters accepted for the lesson's canonical authored content. */
export function contentFocusChars(
  meta: LessonMeta,
): ReadonlySet<string> | undefined {
  if (meta.focus?.keys) {
    const canonical = canonicalLayoutFor(meta)
    return canonical ? resolveFocus(meta, canonical)?.chars : undefined
  }
  return resolveFocus(meta, getLayout(meta.layoutId))?.chars
}

/** Characters accepted for authored content targeting a specific layout. */
export function contentFocusCharsFor(
  meta: LessonMeta,
  layoutId: LayoutId,
): ReadonlySet<string> | undefined {
  if (meta.focus?.keys) {
    return resolveFocus(meta, getLayout(layoutId))?.chars
  }
  return resolveFocus(meta, getLayout(meta.layoutId))?.chars
}
