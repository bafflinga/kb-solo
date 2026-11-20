// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  defaultNextLessonShortcut,
  defaultShortcuts,
  formatShortcut,
  isMac,
  isModifierCode,
  isReservedShortcut,
  isShortcutSafe,
  matchesShortcut,
  needsModifier,
  normalizeShortcut,
  normalizeShortcutSettings,
} from './shortcuts'
import type { Shortcut } from './shortcuts'

const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform')

function setPlatform(platform: string): void {
  Object.defineProperty(navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}

function event(init: Partial<KeyboardEvent>): KeyboardEvent {
  return new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', ...init })
}

const enterCtrl: Shortcut = {
  code: 'Enter',
  ctrl: true,
  meta: false,
  alt: false,
  shift: false,
}

describe('shortcuts', () => {
  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(navigator, 'platform', originalPlatform)
    } else {
      Reflect.deleteProperty(navigator, 'platform')
    }
  })

  it('detects the platform', () => {
    setPlatform('MacIntel')
    expect(isMac()).toBe(true)
    setPlatform('Win32')
    expect(isMac()).toBe(false)
  })

  it('builds platform-appropriate defaults', () => {
    setPlatform('Win32')
    expect(defaultShortcuts()).toEqual({
      start: enterCtrl,
      pause: enterCtrl,
    })

    setPlatform('MacIntel')
    expect(defaultShortcuts().start).toEqual({
      code: 'Enter',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    })
  })

  it('builds a platform-appropriate next-lesson shortcut', () => {
    setPlatform('Win32')
    expect(defaultNextLessonShortcut()).toEqual({
      code: 'ArrowRight',
      ctrl: true,
      meta: false,
      alt: false,
      shift: false,
    })

    setPlatform('MacIntel')
    expect(defaultNextLessonShortcut()).toEqual({
      code: 'ArrowRight',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    })
  })

  it('keeps separate shortcut objects for each action', () => {
    const defaults = defaultShortcuts()
    expect(defaults.start).not.toBe(defaults.pause)
    defaults.start.code = 'KeyA'
    expect(defaults.pause.code).toBe('Enter')
  })

  it('matches a shortcut by code and every modifier flag', () => {
    expect(matchesShortcut(event({ ctrlKey: true }), enterCtrl)).toBe(true)
    expect(matchesShortcut(event({}), enterCtrl)).toBe(false)
    expect(
      matchesShortcut(event({ ctrlKey: true, shiftKey: true }), enterCtrl),
    ).toBe(false)
    expect(
      matchesShortcut(event({ metaKey: true }), { ...enterCtrl, meta: true }),
    ).toBe(false)
  })

  it('formats shortcuts with symbols and localized key labels', () => {
    expect(formatShortcut(enterCtrl)).toBe('Ctrl + Enter')
    expect(formatShortcut({ ...enterCtrl, ctrl: false, meta: true })).toBe(
      '⌘ + Enter',
    )
    expect(
      formatShortcut({ ...enterCtrl, alt: true, shift: true, code: 'KeyA' }),
    ).toBe('Ctrl + Alt + Shift + A')
    expect(formatShortcut(enterCtrl, () => 'Ввод')).toBe('Ctrl + Ввод')
  })

  it('identifies modifier-only key codes', () => {
    expect(isModifierCode('ControlLeft')).toBe(true)
    expect(isModifierCode('ShiftRight')).toBe(true)
    expect(isModifierCode('Enter')).toBe(false)
  })

  it('requires a modifier except for function keys', () => {
    expect(needsModifier({ ...enterCtrl, ctrl: false })).toBe(true)
    expect(needsModifier(enterCtrl)).toBe(false)
    expect(needsModifier({ ...enterCtrl, ctrl: false, code: 'F9' })).toBe(false)
  })

  it('rejects browser-reserved combinations', () => {
    expect(isReservedShortcut({ ...enterCtrl, code: 'KeyR' })).toBe(true)
    expect(isReservedShortcut({ ...enterCtrl, code: 'KeyT' })).toBe(true)
    expect(isReservedShortcut({ ...enterCtrl, meta: true, ctrl: false })).toBe(
      false,
    )
    expect(isReservedShortcut({ ...enterCtrl, code: 'F5' })).toBe(true)
    expect(
      isReservedShortcut({
        ...enterCtrl,
        ctrl: false,
        alt: true,
        code: 'KeyR',
      }),
    ).toBe(false)
  })

  it('normalizes stored shortcuts and rejects unsafe ones', () => {
    expect(normalizeShortcut(enterCtrl)).toEqual(enterCtrl)
    expect(
      normalizeShortcut({ code: 'Enter', ctrl: true, extra: 'ignored' }),
    ).toEqual(enterCtrl)
    expect(normalizeShortcut({ code: 'Enter' })).toBeUndefined()
    expect(normalizeShortcut({ ctrl: true })).toBeUndefined()
    expect(normalizeShortcut(null)).toBeUndefined()
    expect(normalizeShortcut({ ...enterCtrl, code: 'KeyR' })).toBeUndefined()
    expect(isShortcutSafe(enterCtrl)).toBe(true)
  })

  it('normalizes a shortcut pair as a unit', () => {
    expect(
      normalizeShortcutSettings({ start: enterCtrl, pause: { ...enterCtrl } }),
    ).toEqual({ start: enterCtrl, pause: enterCtrl })
    expect(normalizeShortcutSettings({ start: enterCtrl })).toBeUndefined()
    expect(normalizeShortcutSettings(undefined)).toBeUndefined()
  })
})
