import { FINGER_MAP } from '../../domain/fingerMap'
import type { Code, Finger, Layout } from '../../domain/types'

export const KEYBOARD_COLUMNS = 60
export const QUARTER_UNITS = 4
export const KEYBOARD_ROWS = 5

export const MODIFIER_CODES: readonly Code[] = [
  'Tab',
  'CapsLock',
  'ShiftLeft',
  'ShiftRight',
  'Enter',
  'Backspace',
]

export type KeyState = 'rest' | 'next' | 'pressed' | 'error' | 'wrong-layout'

export interface KeyCapModel {
  code: Code
  x: number
  y: number
  u: number
  h: number
  base: string
  shift?: string
  alt?: string
  finger?: Finger
  modifier: boolean
  used: boolean
}

export interface GridPlacement {
  columnStart: number
  columnSpan: number
  row: number
  rowSpan: number
}

export function buildKeyboardKeys(layout: Layout): KeyCapModel[] {
  return Object.keys(layout.geometry).map((code) => {
    const geometry = layout.geometry[code]
    if (!geometry) {
      throw new Error(`Missing geometry for ${code}`)
    }
    const legend = layout.legends[code]
    const modifier = legend === undefined && MODIFIER_CODES.includes(code)
    return {
      code,
      x: geometry.x,
      y: geometry.y,
      u: geometry.u,
      h: geometry.h ?? 1,
      base: legend?.base ?? '',
      shift: legend?.shift,
      alt: legend?.alt,
      finger: FINGER_MAP[code],
      modifier,
      used: legend !== undefined || modifier,
    }
  })
}

export function gridPlacement(model: KeyCapModel): GridPlacement {
  return {
    columnStart: model.x * QUARTER_UNITS + 1,
    columnSpan: model.u * QUARTER_UNITS,
    row: model.y + 1,
    rowSpan: model.h,
  }
}

export function findKey(
  models: readonly KeyCapModel[],
  code: Code,
): KeyCapModel | undefined {
  return models.find((model) => model.code === code)
}
