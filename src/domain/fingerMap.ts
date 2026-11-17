import type { Code, Finger } from './types'

export const FINGER_COLORS: Record<Finger, string> = {
  lp: '#f76c6c',
  lr: '#f5a04c',
  lm: '#e8c547',
  li: '#63c174',
  ri: '#3fbfa8',
  rm: '#4a90d9',
  rr: '#8f7ae5',
  rp: '#ec6fa8',
  thumb: '#8a8f98',
}

const GROUPS: ReadonlyArray<readonly [Finger, readonly Code[]]> = [
  [
    'lp',
    [
      'Backquote',
      'Digit1',
      'KeyQ',
      'KeyA',
      'KeyZ',
      'IntlBackslash',
      'Tab',
      'CapsLock',
      'ShiftLeft',
    ],
  ],
  ['lr', ['Digit2', 'KeyW', 'KeyS', 'KeyX']],
  ['lm', ['Digit3', 'KeyE', 'KeyD', 'KeyC']],
  ['li', ['Digit4', 'Digit5', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB']],
  ['ri', ['Digit6', 'Digit7', 'KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyN', 'KeyM']],
  ['rm', ['Digit8', 'KeyI', 'KeyK', 'Comma']],
  ['rr', ['Digit9', 'KeyO', 'KeyL', 'Period']],
  [
    'rp',
    [
      'Digit0',
      'KeyP',
      'Semicolon',
      'Quote',
      'Slash',
      'Minus',
      'Equal',
      'BracketLeft',
      'BracketRight',
      'Backslash',
      'Enter',
      'Backspace',
      'ShiftRight',
    ],
  ],
  ['thumb', ['Space']],
]

export const FINGER_MAP: Record<Code, Finger> = Object.fromEntries(
  GROUPS.flatMap(([finger, codes]) =>
    codes.map((code) => [code, finger] as const),
  ),
)

export function fingerFor(code: Code): Finger | undefined {
  return FINGER_MAP[code]
}
