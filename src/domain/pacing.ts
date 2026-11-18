import type { LessonMeta } from './lessons/types'
import type { Cue } from './types'

export type PaceLevel =
  | 'off'
  | 'relaxed'
  | 'standard'
  | 'challenging'
  | 'hardcore'

export const PACE_LEVELS: readonly PaceLevel[] = [
  'off',
  'relaxed',
  'standard',
  'challenging',
  'hardcore',
]

const BASE_WPM: Readonly<Record<PaceLevel, number>> = {
  off: 30,
  relaxed: 15,
  standard: 25,
  challenging: 35,
  hardcore: 35,
}

const SLACK: Readonly<Record<PaceLevel, number>> = {
  off: 1.5,
  relaxed: 1.5,
  standard: 1.5,
  challenging: 1.5,
  hardcore: 1,
}
const AWKWARD_FINGERS = new Set(['lp', 'rp', 'lr', 'rr'])

export interface LessonPacing {
  timeLimitMs: number | null
  targetWpm: number
}

export function isPaceLevel(value: unknown): value is PaceLevel {
  return typeof value === 'string' && PACE_LEVELS.includes(value as PaceLevel)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function contentFactor(cues: readonly Cue[]): number {
  let total = 0
  let shifted = 0
  let digits = 0
  let awkward = 0
  for (const cue of cues) {
    for (const char of cue.chars) {
      total += 1
      if (char.needsShift) {
        shifted += 1
      }
      if (char.code?.startsWith('Digit') === true) {
        digits += 1
      }
      if (char.finger !== undefined && AWKWARD_FINGERS.has(char.finger)) {
        awkward += 1
      }
    }
  }
  if (total === 0) {
    return 1
  }
  return clamp(
    1 -
      0.15 * (shifted / total) -
      0.15 * (digits / total) -
      0.1 * (awkward / total),
    0.7,
    1,
  )
}

export function derivePacing(
  cues: readonly Cue[],
  meta: Pick<LessonMeta, 'timeLimitSec' | 'targetWpm'>,
  pace: PaceLevel,
): LessonPacing {
  const targetWpm =
    meta.targetWpm ??
    (pace === 'off'
      ? BASE_WPM.off
      : Math.round(BASE_WPM[pace] * contentFactor(cues) * 10) / 10)

  let timeLimitMs: number | null
  if (meta.timeLimitSec !== undefined) {
    timeLimitMs = meta.timeLimitSec * 1000
  } else if (pace === 'off') {
    timeLimitMs = null
  } else {
    const chars = cues.reduce((total, cue) => total + cue.chars.length, 0)
    const parMs = (chars / 5 / targetWpm) * 60_000
    timeLimitMs = parMs * SLACK[pace]
  }

  return { timeLimitMs, targetWpm }
}
