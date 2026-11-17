export interface Shortcut {
  code: string
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}

export interface ShortcutSettings {
  start: Shortcut
  pause: Shortcut
}

const MODIFIER_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'MetaLeft',
  'MetaRight',
  'AltLeft',
  'AltRight',
  'ShiftLeft',
  'ShiftRight',
])

const RESERVED_WITH_PRIMARY = new Set([
  'KeyQ',
  'KeyW',
  'KeyT',
  'KeyN',
  'KeyR',
  'KeyL',
  'KeyP',
  'KeyS',
  'KeyH',
  'KeyM',
  'Tab',
  'Space',
])

const ALWAYS_RESERVED = new Set(['F4', 'F5', 'F11', 'F12'])

export function isMac(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
  const platform = nav.userAgentData?.platform ?? nav.platform ?? ''
  if (platform !== '') {
    return /mac/i.test(platform)
  }
  return /mac/i.test(nav.userAgent ?? '')
}

export function isModifierCode(code: string): boolean {
  return MODIFIER_CODES.has(code)
}

export function defaultShortcuts(): ShortcutSettings {
  const primary = isMac()
    ? { ctrl: false, meta: true }
    : { ctrl: true, meta: false }
  const start: Shortcut = {
    code: 'Enter',
    ...primary,
    alt: false,
    shift: false,
  }
  return { start, pause: { ...start } }
}

export const DEFAULT_SHORTCUTS: ShortcutSettings = defaultShortcuts()

export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: Shortcut,
): boolean {
  return (
    event.code === shortcut.code &&
    event.ctrlKey === shortcut.ctrl &&
    event.metaKey === shortcut.meta &&
    event.altKey === shortcut.alt &&
    event.shiftKey === shortcut.shift
  )
}

export function needsModifier(shortcut: Shortcut): boolean {
  const hasModifier =
    shortcut.ctrl || shortcut.meta || shortcut.alt || shortcut.shift
  return !hasModifier && !/^F\d+$/.test(shortcut.code)
}

export function isReservedShortcut(shortcut: Shortcut): boolean {
  if (ALWAYS_RESERVED.has(shortcut.code)) {
    return true
  }
  if (!shortcut.ctrl && !shortcut.meta) {
    return false
  }
  return RESERVED_WITH_PRIMARY.has(shortcut.code)
}

export function isShortcutSafe(shortcut: Shortcut): boolean {
  return !needsModifier(shortcut) && !isReservedShortcut(shortcut)
}

const KEY_LABELS: Record<string, string> = {
  Enter: 'Enter',
  Space: 'Space',
  Escape: 'Esc',
  Backspace: 'Backspace',
  Tab: 'Tab',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
}

function formatKey(code: string): string {
  const label = KEY_LABELS[code]
  if (label !== undefined) {
    return label
  }
  if (code.startsWith('Key')) {
    return code.slice(3)
  }
  if (code.startsWith('Digit')) {
    return code.slice(5)
  }
  return code
}

export function formatShortcut(
  shortcut: Shortcut,
  keyLabel?: (code: string) => string | undefined,
): string {
  const parts: string[] = []
  if (shortcut.ctrl) {
    parts.push('Ctrl')
  }
  if (shortcut.meta) {
    parts.push('⌘')
  }
  if (shortcut.alt) {
    parts.push('Alt')
  }
  if (shortcut.shift) {
    parts.push('Shift')
  }
  parts.push(keyLabel?.(shortcut.code) ?? formatKey(shortcut.code))
  return parts.join(' + ')
}

export function normalizeShortcut(value: unknown): Shortcut | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const raw = value as Record<string, unknown>
  if (typeof raw.code !== 'string' || raw.code.length === 0) {
    return undefined
  }
  const shortcut: Shortcut = {
    code: raw.code,
    ctrl: raw.ctrl === true,
    meta: raw.meta === true,
    alt: raw.alt === true,
    shift: raw.shift === true,
  }
  return isShortcutSafe(shortcut) ? shortcut : undefined
}

export function normalizeShortcutSettings(
  value: unknown,
): ShortcutSettings | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const raw = value as Record<string, unknown>
  const start = normalizeShortcut(raw.start)
  const pause = normalizeShortcut(raw.pause)
  if (start === undefined || pause === undefined) {
    return undefined
  }
  return { start, pause }
}
