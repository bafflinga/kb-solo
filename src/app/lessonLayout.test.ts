import { describe, expect, it } from 'vitest'
import { getLayout } from '../domain/layout'
import { getLessonMeta } from '../domain/lessons/registry'
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

  it('resolves physical focus codes for the active layout', () => {
    const meta = getLessonMeta('en-pinky-top')
    expect(meta).toBeDefined()
    const windows = getLayout('us-qwerty')
    const macIso = getLayout('us-qwerty-mac-iso')

    expect(mapFocusCodes(meta!, windows)).toEqual([
      'Backquote',
      'KeyQ',
      'KeyP',
      'BracketLeft',
      'BracketRight',
      'Backslash',
    ])
    expect(mapFocusCodes(meta!, macIso)).toEqual([
      'Backquote',
      'KeyQ',
      'KeyP',
      'BracketLeft',
      'BracketRight',
    ])
  })

  it('returns undefined when a lesson has no focus', () => {
    const meta = getLessonMeta('en-words')
    expect(meta).toBeDefined()
    expect(mapFocusCodes(meta!, getLayout('us-qwerty'))).toBeUndefined()
  })
})
