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
      const labelKey = `pace.${level}` as MessageKey
      const hintKey = `pace.${level}Hint` as MessageKey
      expect(messages.en[labelKey]).toBeTypeOf('string')
      expect(messages.ru[labelKey]).toBeTypeOf('string')
      expect(hasMessage(hintKey), hintKey).toBe(true)
      expect(messages.en[hintKey]).toBeTypeOf('string')
      expect(messages.ru[hintKey]).toBeTypeOf('string')
    }
    expect(hasMessage('pace.missingHint' as MessageKey)).toBe(false)
  })

  it('covers every lesson title key in both locales', () => {
    for (const meta of allLessons()) {
      expect(
        Object.prototype.hasOwnProperty.call(messages.en, meta.titleKey),
        `en: ${meta.titleKey}`,
      ).toBe(true)
      expect(
        Object.prototype.hasOwnProperty.call(messages.ru, meta.titleKey),
        `ru: ${meta.titleKey}`,
      ).toBe(true)
    }
  })

  it('defines all four plural forms for both plural keys', () => {
    for (const base of ['lessonCompleted', 'lessonCompletedCount'] as const) {
      for (const form of ['one', 'few', 'many', 'other'] as const) {
        const key = `${base}_${form}` as keyof typeof messages.en
        expect(messages.en[key]).toBeTypeOf('string')
        expect(messages.ru[key]).toBeTypeOf('string')
      }
    }
  })
})
