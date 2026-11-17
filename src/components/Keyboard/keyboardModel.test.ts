import { describe, expect, it } from 'vitest'
import { getLayout } from '../../domain/layout'
import { buildKeyboardKeys, findKey, gridPlacement } from './keyboardModel'

function placementOf(
  models: ReturnType<typeof buildKeyboardKeys>,
  code: string,
) {
  const model = findKey(models, code)
  if (!model) {
    throw new Error(`Missing key ${code}`)
  }
  return gridPlacement(model)
}

describe('keyboard model', () => {
  it('builds one key per ANSI geometry code', () => {
    const models = buildKeyboardKeys(getLayout('us-qwerty'))
    expect(models).toHaveLength(54)
    for (const model of models) {
      expect(model.finger, model.code).toBeDefined()
      expect(model.used, model.code).toBe(true)
    }
  })

  it('builds one key per ISO geometry code', () => {
    const models = buildKeyboardKeys(getLayout('ru-jcuken-mac-iso'))
    expect(models).toHaveLength(55)
    for (const model of models) {
      expect(model.finger, model.code).toBeDefined()
      expect(model.used, model.code).toBe(true)
    }
  })

  it('uses the Russian legends for the shifted number row and Backquote', () => {
    const models = buildKeyboardKeys(getLayout('ru-jcuken'))
    const digit3 = findKey(models, 'Digit3')
    expect(digit3?.base).toBe('3')
    expect(digit3?.shift).toBe('№')

    const backquote = findKey(models, 'Backquote')
    expect(backquote?.base).toBe('ё')
    expect(backquote?.shift).toBe('Ё')
  })

  it('uses the Mac ANSI Russian laptop legends', () => {
    const models = buildKeyboardKeys(getLayout('ru-jcuken-mac'))
    expect(findKey(models, 'Backquote')?.base).toBe(']')
    expect(findKey(models, 'Backquote')?.shift).toBe('[')
    expect(findKey(models, 'Backslash')?.base).toBe('ё')
    expect(findKey(models, 'Backslash')?.shift).toBe('Ё')
    expect(findKey(models, 'Slash')?.base).toBe('/')
    expect(findKey(models, 'Slash')?.shift).toBe('?')
  })

  it('uses the Mac ISO Russian legends', () => {
    const models = buildKeyboardKeys(getLayout('ru-jcuken-mac-iso'))
    expect(findKey(models, 'Backquote')?.base).toBe('>')
    expect(findKey(models, 'Backquote')?.shift).toBe('<')
    expect(findKey(models, 'Backslash')?.base).toBe('ё')
    expect(findKey(models, 'Backslash')?.shift).toBe('Ё')
    expect(findKey(models, 'IntlBackslash')?.base).toBe(']')
    expect(findKey(models, 'IntlBackslash')?.shift).toBe('[')
    expect(findKey(models, 'Slash')?.base).toBe('/')
    expect(findKey(models, 'Slash')?.shift).toBe('?')
  })

  it('uses the US legends', () => {
    const models = buildKeyboardKeys(getLayout('us-qwerty'))
    expect(findKey(models, 'KeyA')?.base).toBe('a')
    expect(findKey(models, 'KeyA')?.shift).toBe('A')
    expect(findKey(models, 'Quote')?.base).toBe("'")
    expect(findKey(models, 'Quote')?.shift).toBe('"')
  })

  it('uses the Mac ANSI English legends', () => {
    const models = buildKeyboardKeys(getLayout('us-qwerty-mac'))
    expect(findKey(models, 'Backquote')?.base).toBe('`')
    expect(findKey(models, 'Backquote')?.shift).toBe('~')
    expect(findKey(models, 'Backslash')?.base).toBe('\\')
    expect(findKey(models, 'Backslash')?.shift).toBe('|')
  })

  it('flags the non-printing keys as modifiers', () => {
    const models = buildKeyboardKeys(getLayout('us-qwerty'))
    for (const code of [
      'Tab',
      'CapsLock',
      'ShiftLeft',
      'ShiftRight',
      'Enter',
      'Backspace',
    ]) {
      expect(findKey(models, code)?.modifier, code).toBe(true)
    }
    expect(findKey(models, 'Space')?.modifier).toBe(false)
    expect(findKey(models, 'KeyA')?.modifier).toBe(false)
  })

  it('places every key inside 60 quarter-unit columns and 5 rows', () => {
    for (const id of ['us-qwerty', 'ru-jcuken-mac-iso'] as const) {
      const models = buildKeyboardKeys(getLayout(id))
      for (const model of models) {
        const placement = gridPlacement(model)
        expect(placement.columnStart, model.code).toBeGreaterThanOrEqual(1)
        expect(
          placement.columnStart + placement.columnSpan - 1,
          model.code,
        ).toBeLessThanOrEqual(60)
        expect(placement.row, model.code).toBeGreaterThanOrEqual(1)
        expect(placement.row, model.code).toBeLessThanOrEqual(5)
        expect(
          placement.row + placement.rowSpan - 1,
          model.code,
        ).toBeLessThanOrEqual(5)
      }
    }
  })

  it('computes exact ANSI grid placements', () => {
    const models = buildKeyboardKeys(getLayout('us-qwerty'))

    expect(placementOf(models, 'Tab')).toEqual({
      columnStart: 1,
      columnSpan: 6,
      row: 2,
      rowSpan: 1,
    })
    expect(placementOf(models, 'KeyQ')).toEqual({
      columnStart: 7,
      columnSpan: 4,
      row: 2,
      rowSpan: 1,
    })
    expect(placementOf(models, 'Enter')).toEqual({
      columnStart: 52,
      columnSpan: 9,
      row: 3,
      rowSpan: 1,
    })
    expect(placementOf(models, 'Space')).toEqual({
      columnStart: 14,
      columnSpan: 25,
      row: 5,
      rowSpan: 1,
    })
  })

  it('computes exact ISO grid placements', () => {
    const models = buildKeyboardKeys(getLayout('ru-jcuken-mac-iso'))

    expect(placementOf(models, 'BracketRight')).toEqual({
      columnStart: 51,
      columnSpan: 5,
      row: 2,
      rowSpan: 1,
    })
    expect(placementOf(models, 'Enter')).toEqual({
      columnStart: 56,
      columnSpan: 5,
      row: 2,
      rowSpan: 2,
    })
    expect(placementOf(models, 'Backslash')).toEqual({
      columnStart: 52,
      columnSpan: 4,
      row: 3,
      rowSpan: 1,
    })
    expect(placementOf(models, 'ShiftLeft')).toEqual({
      columnStart: 1,
      columnSpan: 5,
      row: 4,
      rowSpan: 1,
    })
    expect(placementOf(models, 'IntlBackslash')).toEqual({
      columnStart: 6,
      columnSpan: 4,
      row: 4,
      rowSpan: 1,
    })
  })
})
