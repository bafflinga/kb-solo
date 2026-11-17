import type { Code, KeyGeometry } from './types'

type Entry = readonly [Code, number, number, number, number?]

const ENTRIES: readonly Entry[] = [
  ['Backquote', 0, 0, 1],
  ['Digit1', 1, 0, 1],
  ['Digit2', 2, 0, 1],
  ['Digit3', 3, 0, 1],
  ['Digit4', 4, 0, 1],
  ['Digit5', 5, 0, 1],
  ['Digit6', 6, 0, 1],
  ['Digit7', 7, 0, 1],
  ['Digit8', 8, 0, 1],
  ['Digit9', 9, 0, 1],
  ['Digit0', 10, 0, 1],
  ['Minus', 11, 0, 1],
  ['Equal', 12, 0, 1],
  ['Backspace', 13, 0, 2],
  ['Tab', 0, 1, 1.5],
  ['KeyQ', 1.5, 1, 1],
  ['KeyW', 2.5, 1, 1],
  ['KeyE', 3.5, 1, 1],
  ['KeyR', 4.5, 1, 1],
  ['KeyT', 5.5, 1, 1],
  ['KeyY', 6.5, 1, 1],
  ['KeyU', 7.5, 1, 1],
  ['KeyI', 8.5, 1, 1],
  ['KeyO', 9.5, 1, 1],
  ['KeyP', 10.5, 1, 1],
  ['BracketLeft', 11.5, 1, 1],
  ['BracketRight', 12.5, 1, 1],
  ['Backslash', 13.5, 1, 1.5],
  ['CapsLock', 0, 2, 1.75],
  ['KeyA', 1.75, 2, 1],
  ['KeyS', 2.75, 2, 1],
  ['KeyD', 3.75, 2, 1],
  ['KeyF', 4.75, 2, 1],
  ['KeyG', 5.75, 2, 1],
  ['KeyH', 6.75, 2, 1],
  ['KeyJ', 7.75, 2, 1],
  ['KeyK', 8.75, 2, 1],
  ['KeyL', 9.75, 2, 1],
  ['Semicolon', 10.75, 2, 1],
  ['Quote', 11.75, 2, 1],
  ['Enter', 12.75, 2, 2.25],
  ['ShiftLeft', 0, 3, 2.25],
  ['KeyZ', 2.25, 3, 1],
  ['KeyX', 3.25, 3, 1],
  ['KeyC', 4.25, 3, 1],
  ['KeyV', 5.25, 3, 1],
  ['KeyB', 6.25, 3, 1],
  ['KeyN', 7.25, 3, 1],
  ['KeyM', 8.25, 3, 1],
  ['Comma', 9.25, 3, 1],
  ['Period', 10.25, 3, 1],
  ['Slash', 11.25, 3, 1],
  ['ShiftRight', 12.25, 3, 2.75],
  ['Space', 3.25, 4, 6.25],
]

function toGeometry(entries: readonly Entry[]): Record<Code, KeyGeometry> {
  return Object.fromEntries(
    entries.map(([code, x, y, u, h]) => [
      code,
      h === undefined ? { x, y, u } : { x, y, u, h },
    ]),
  )
}

export const ANSI_GEOMETRY: Record<Code, KeyGeometry> = toGeometry(ENTRIES)

const ISO_OVERRIDES: readonly Entry[] = [
  ['BracketRight', 12.5, 1, 1.25],
  ['Enter', 13.75, 1, 1.25, 2],
  ['Backslash', 12.75, 2, 1],
  ['ShiftLeft', 0, 3, 1.25],
  ['IntlBackslash', 1.25, 3, 1],
]

export const ISO_GEOMETRY: Record<Code, KeyGeometry> = {
  ...ANSI_GEOMETRY,
  ...toGeometry(ISO_OVERRIDES),
}
