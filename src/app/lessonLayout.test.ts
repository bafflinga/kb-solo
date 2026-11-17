import { describe, expect, it } from 'vitest'
import { getLayout } from '../domain/layout'
import { mapFocusCodes, resolveLessonLayout } from './lessonLayout'

describe('lesson layout resolution', () => {
  it('uses the selected Russian variant for Russian lessons', () => {
    expect(resolveLessonLayout('ru', 'ru-jcuken', 'ru-jcuken-mac').id).toBe(
      'ru-jcuken-mac',
    )
    expect(resolveLessonLayout('ru', 'ru-jcuken', 'ru-jcuken-mac-iso').id).toBe(
      'ru-jcuken-mac-iso',
    )
  })

  it('uses the selected English variant for English lessons', () => {
    expect(resolveLessonLayout('en', 'us-qwerty', 'us-qwerty-mac-iso').id).toBe(
      'us-qwerty-mac-iso',
    )
  })

  it('falls back to the lesson layout when the selection is another family', () => {
    expect(resolveLessonLayout('ru', 'ru-jcuken', 'us-qwerty').id).toBe(
      'ru-jcuken',
    )
    expect(resolveLessonLayout('en', 'us-qwerty', 'ru-jcuken-mac').id).toBe(
      'us-qwerty',
    )
    expect(resolveLessonLayout('en', 'us-qwerty', 'ru-jcuken-mac-iso').id).toBe(
      'us-qwerty',
    )
  })

  it('keeps English lessons on the US layout by default', () => {
    expect(resolveLessonLayout('en', 'us-qwerty', 'us-qwerty').id).toBe(
      'us-qwerty',
    )
  })

  it('remaps focus codes onto the selected layout', () => {
    const from = getLayout('ru-jcuken')
    const ansi = getLayout('ru-jcuken-mac')
    const iso = getLayout('ru-jcuken-mac-iso')

    expect(mapFocusCodes(['Backquote'], from, ansi)).toEqual(['Backslash'])
    expect(mapFocusCodes(['Backquote'], from, iso)).toEqual(['Backslash'])
    expect(
      mapFocusCodes(['Backquote', 'Digit4', 'Digit7', 'Slash'], from, iso),
    ).toEqual(['Backslash', 'Digit4', 'Digit7'])
    expect(mapFocusCodes(undefined, from, iso)).toBeUndefined()
  })
})
