import { faker } from '@faker-js/faker/locale/en'
import { faker as fakerRU } from '@faker-js/faker/locale/ru'
import { beforeEach, describe, expect, it } from 'vitest'
import { getLayout } from '../layout'
import {
  generateSentences,
  generateText,
  generateWords,
  resolveGenerationArea,
  sanitizeGeneratedText,
} from './fakerGenerator'
import { PHRASE_AREA_IDS } from './generationAreas'

const layout = getLayout('us-qwerty')
const ruLayout = getLayout('ru-jcuken')

function sentenceWordCounts(text: string): number[] {
  return text.split('. ').map(
    (sentence) =>
      sentence
        .replace(/\.$/u, '')
        .split(/\s+/u)
        .filter((word) => word.length > 0).length,
  )
}

describe('fakerGenerator', () => {
  beforeEach(() => {
    faker.seed(1234)
  })

  it('generates ten unique words for a pinned area', () => {
    const words = generateWords(faker, 'commerce', layout, 10)
    expect(words).toHaveLength(10)
    expect(new Set(words).size).toBe(10)
    expect(words.every((word) => word.length > 0)).toBe(true)
  })

  it('falls back to lorem when the area has no word factory', () => {
    const result = generateText(faker, 'focus', 'lorem', layout)
    expect(result.words).toHaveLength(10)
    expect(result.areaId).toBe('lorem')
  })

  it('generates three to five lorem sentences', () => {
    const sentences = generateSentences(faker, 'lorem', 'lorem', layout)
    const count = sentences.split('. ').length
    expect(count).toBeGreaterThanOrEqual(3)
    expect(count).toBeLessThanOrEqual(5)
  })

  it('generates phrase sentences for a phrase-capable area', () => {
    const sentences = generateSentences(faker, 'company', 'phrase', layout)
    expect(sentences.length).toBeGreaterThan(0)
    expect(sentences.endsWith('.')).toBe(true)
    expect(sentences.split('. ').length).toBeGreaterThanOrEqual(3)
  })

  it('enforces the minimum for lorem sentences', () => {
    for (const minWords of [5, 8, 12]) {
      const sentences = generateSentences(
        faker,
        'lorem',
        'lorem',
        layout,
        minWords,
      )
      expect(
        sentenceWordCounts(sentences).every((count) => count >= minWords),
      ).toBe(true)
    }
  })

  it('enforces the minimum for phrase sentences in both locales', () => {
    const cases = [
      { label: 'ru', faker: fakerRU, layout: ruLayout },
      { label: 'en', faker, layout },
    ]

    for (const { label, faker: instance, layout: activeLayout } of cases) {
      for (const areaId of PHRASE_AREA_IDS) {
        for (const minWords of [5, 8, 12]) {
          instance.seed(4321)
          const sentences = generateSentences(
            instance,
            areaId,
            'phrase',
            activeLayout,
            minWords,
          )
          expect(
            sentenceWordCounts(sentences).every((count) => count >= minWords),
            `${label}:${areaId}:${minWords}`,
          ).toBe(true)
        }
      }
    }
  })

  it('resolves random phrase areas only from phrase-capable ids', () => {
    const resolved = new Set(
      Array.from({ length: 20 }, () =>
        resolveGenerationArea('random', 'phrase', faker),
      ),
    )
    expect(resolved.size).toBeGreaterThan(1)
    expect([...resolved].every((id) => PHRASE_AREA_IDS.includes(id))).toBe(true)
  })

  it('keeps a pinned area', () => {
    expect(resolveGenerationArea('music', 'phrase', faker)).toBe('music')
  })

  it('drops characters unavailable in the active layout', () => {
    expect(sanitizeGeneratedText('café — ok', layout)).toBe('caf ok')
  })

  it('is reproducible for a given seed', () => {
    faker.seed(99)
    const first = generateText(faker, 'food', 'lorem', layout)
    faker.seed(99)
    const second = generateText(faker, 'food', 'lorem', layout)
    expect(second).toEqual(first)
  })
})
