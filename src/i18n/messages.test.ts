import { describe, expect, it } from 'vitest'
import { allLessons } from '../domain/lessons/registry'
import { PACE_LEVELS } from '../domain/pacing'
import { hasMessage, messages } from './messages'
import type { MessageKey } from './messages'

const enKeys = Object.keys(messages.en)
const ruKeys = Object.keys(messages.ru)

describe('messages', () => {
  it('has identical key sets in both locales', () => {
    expect([...ruKeys].sort()).toEqual([...enKeys].sort())
  })

  it('defines a pace label and hint for every level in both locales', () => {
    for (const level of PACE_LEVELS) {
      const labelKey = `pace.${level}`
      const hintKey = `pace.${level}Hint`
      expect(messages.en[labelKey as MessageKey]).toBeTypeOf('string')
      expect(messages.ru[labelKey as keyof typeof messages.ru]).toBeTypeOf(
        'string',
      )
      expect(hasMessage(hintKey as MessageKey), hintKey).toBe(true)
      expect(messages.en[hintKey as MessageKey]).toBeTypeOf('string')
      expect(messages.ru[hintKey as keyof typeof messages.ru]).toBeTypeOf(
        'string',
      )
    }
    expect(hasMessage('pace.missingHint' as MessageKey)).toBe(false)
  })

  it('covers every lesson title in both locales', () => {
    expect(enKeys.some((key) => /\.(en|ru)\./.test(key))).toBe(false)

    for (const meta of allLessons()) {
      expect(meta.titleKey.startsWith('lesson.'), meta.id).toBe(true)
      expect(
        messages.en[meta.titleKey as MessageKey],
        `en: ${meta.titleKey}`,
      ).toBeTypeOf('string')
      expect(
        messages.ru[meta.titleKey as keyof typeof messages.ru],
        `ru: ${meta.titleKey}`,
      ).toBeTypeOf('string')
    }
  })

  it('defines all four plural forms for both plural keys', () => {
    for (const base of ['lessonCompleted', 'lessonCompletedCount'] as const) {
      for (const form of ['one', 'few', 'many', 'other'] as const) {
        const key = `${base}_${form}`
        expect(messages.en[key as MessageKey]).toBeTypeOf('string')
        expect(messages.ru[key as keyof typeof messages.ru]).toBeTypeOf(
          'string',
        )
      }
    }
  })
})
