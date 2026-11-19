import type { Faker } from '@faker-js/faker'
import { codeForChar } from '../layout'
import type { ContentLanguage, Layout } from '../types'
import { GENERATION_AREAS, areaIdsForSource } from './generationAreas'
import type {
  GenerationAreaId,
  GenerationSentenceSource,
} from './generationAreas'

const FAKER_LOADERS: Readonly<
  Record<ContentLanguage, () => Promise<{ faker: Faker }>>
> = {
  en: () => import('@faker-js/faker/locale/en'),
  ru: () => import('@faker-js/faker/locale/ru'),
}

const fakerCache = new Map<ContentLanguage, Promise<Faker>>()

export function loadFaker(language: ContentLanguage): Promise<Faker> {
  const cached = fakerCache.get(language)
  if (cached) {
    return cached
  }
  const pending = FAKER_LOADERS[language]().then((module) => module.faker)
  fakerCache.set(language, pending)
  return pending
}

export function sanitizeGeneratedText(text: string, layout: Layout): string {
  return Array.from(text)
    .filter(
      (char) => /\s/u.test(char) || codeForChar(layout, char) !== undefined,
    )
    .join('')
    .replace(/\s+/gu, ' ')
    .trim()
}

export function resolveGenerationArea(
  area: GenerationAreaId | 'random',
  source: GenerationSentenceSource,
  faker: Faker,
): GenerationAreaId {
  if (area !== 'random') {
    return area
  }
  const ids = areaIdsForSource(source)
  return faker.helpers.arrayElement([...ids])
}

function hasUsableText(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text)
}

interface WordsResult {
  words: string[]
  usedFallback: boolean
}

function buildWords(
  faker: Faker,
  areaId: GenerationAreaId,
  layout: Layout,
  count = 10,
): WordsResult {
  const area = GENERATION_AREAS[areaId]
  const words: string[] = []
  const seen = new Set<string>()
  const attempts = Math.max(30, count * 5)

  for (
    let attempt = 0;
    attempt < attempts && words.length < count;
    attempt += 1
  ) {
    const candidate = sanitizeGeneratedText(area.word(faker), layout)
    for (const word of candidate.split(' ')) {
      if (word.length === 0 || !hasUsableText(word) || seen.has(word)) {
        continue
      }
      seen.add(word)
      words.push(word)
      if (words.length === count) {
        break
      }
    }
  }

  let usedFallback = false
  let guard = 0
  while (words.length < count && guard < count * 10) {
    const word = sanitizeGeneratedText(faker.lorem.word(), layout)
    guard += 1
    if (word.length === 0 || !hasUsableText(word) || seen.has(word)) {
      continue
    }
    usedFallback = true
    seen.add(word)
    words.push(word)
  }

  return { words, usedFallback }
}

export function generateWords(
  faker: Faker,
  areaId: GenerationAreaId,
  layout: Layout,
  count = 10,
): string[] {
  return buildWords(faker, areaId, layout, count).words
}

function countWords(text: string): number {
  return text.split(/\s+/u).filter((word) => word.length > 0).length
}

interface SentencesResult {
  text: string
  usedFallback: boolean
}

function buildSentences(
  faker: Faker,
  areaId: GenerationAreaId,
  source: GenerationSentenceSource,
  layout: Layout,
  minWords: number,
): SentencesResult {
  const count = faker.number.int({ min: 3, max: 5 })

  if (source === 'lorem') {
    return {
      text: Array.from({ length: count }, () =>
        sanitizeGeneratedText(
          faker.lorem.sentence({ min: minWords, max: minWords + 5 }),
          layout,
        ),
      ).join(' '),
      usedFallback: false,
    }
  }

  const area = GENERATION_AREAS[areaId]
  const phrase = area.phrase ?? ((instance: Faker) => instance.lorem.sentence())
  const sentences: string[] = []
  let usedFallback = false

  for (let index = 0; index < count; index += 1) {
    const parts: string[] = []
    const seen = new Set<string>()
    let words = 0

    for (let attempt = 0; attempt < 16 && words < minWords; attempt += 1) {
      const candidate = sanitizeGeneratedText(phrase(faker), layout)
        .replace(/[.!?]+$/u, '')
        .trim()
      if (!hasUsableText(candidate) || seen.has(candidate)) {
        continue
      }
      seen.add(candidate)
      parts.push(candidate)
      words = countWords(parts.join(', '))
    }

    let guard = 0
    while (words < minWords && guard < minWords * 10) {
      const areaWord = sanitizeGeneratedText(area.word(faker), layout)
        .split(' ')
        .find((word) => word.length > 0 && hasUsableText(word))
      const fallbackWord = sanitizeGeneratedText(faker.lorem.word(), layout)
      const word =
        areaWord && !parts.includes(areaWord)
          ? areaWord
          : hasUsableText(fallbackWord) && !parts.includes(fallbackWord)
            ? fallbackWord
            : undefined
      guard += 1
      if (word === undefined) {
        continue
      }
      if (word === fallbackWord && areaWord !== word) {
        usedFallback = true
      }
      parts.push(word)
      words += 1
    }

    if (parts.length > 0) {
      sentences.push(parts.join(', '))
    }
  }

  if (sentences.length === 0) {
    return {
      text: sanitizeGeneratedText(
        faker.lorem.sentence({ min: minWords, max: minWords + 5 }),
        layout,
      ),
      usedFallback: true,
    }
  }

  return { text: `${sentences.join('. ')}.`, usedFallback }
}

export function generateSentences(
  faker: Faker,
  areaId: GenerationAreaId,
  source: GenerationSentenceSource,
  layout: Layout,
  minWords = 5,
): string {
  return buildSentences(faker, areaId, source, layout, minWords).text
}

export interface GeneratedText {
  areaId: GenerationAreaId
  sentenceSource: GenerationSentenceSource
  words: string[]
  sentences: string
}

export function generateText(
  faker: Faker,
  area: GenerationAreaId | 'random',
  source: GenerationSentenceSource,
  layout: Layout,
  minWords = 5,
): GeneratedText {
  const requestedArea = resolveGenerationArea(area, source, faker)
  const wordsResult = buildWords(faker, requestedArea, layout)
  const sentencesResult = buildSentences(
    faker,
    requestedArea,
    source,
    layout,
    minWords,
  )
  return {
    areaId:
      wordsResult.usedFallback || sentencesResult.usedFallback
        ? 'lorem'
        : requestedArea,
    sentenceSource: source,
    words: wordsResult.words,
    sentences: sentencesResult.text,
  }
}
