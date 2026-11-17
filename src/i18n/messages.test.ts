import { describe, expect, it } from 'vitest'
import { allLessons } from '../domain/lessons/registry'
import { messages } from './messages'

const enKeys = Object.keys(messages.en)
const ruKeys = Object.keys(messages.ru)

describe('messages', () => {
  it('has identical key sets in both locales', () => {
    expect([...ruKeys].sort()).toEqual([...enKeys].sort())
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
