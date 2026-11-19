import type { Faker } from '@faker-js/faker'
import type { MessageKey } from '../../i18n'

export type GenerationSentenceSource = 'lorem' | 'phrase'

export type GenerationAreaId =
  | 'lorem'
  | 'commerce'
  | 'company'
  | 'hacker'
  | 'location'
  | 'person'
  | 'animal'
  | 'food'
  | 'science'
  | 'music'
  | 'book'
  | 'vehicle'
  | 'color'
  | 'focus'

export interface GenerationArea {
  id: GenerationAreaId
  labelKey: MessageKey
  word(faker: Faker): string
  phrase?(faker: Faker): string
}

export const WORD_AREA_IDS: readonly GenerationAreaId[] = [
  'lorem',
  'commerce',
  'company',
  'location',
  'person',
  'animal',
  'food',
  'science',
  'music',
  'book',
  'vehicle',
  'color',
]

export const PHRASE_AREA_IDS: readonly GenerationAreaId[] = [
  'company',
  'hacker',
  'book',
  'music',
]

export const GENERATION_AREAS: Readonly<
  Record<GenerationAreaId, GenerationArea>
> = {
  lorem: {
    id: 'lorem',
    labelKey: 'generationArea.lorem',
    word: (faker) => faker.lorem.word(),
  },
  commerce: {
    id: 'commerce',
    labelKey: 'generationArea.commerce',
    word: (faker) => faker.commerce.product(),
  },
  company: {
    id: 'company',
    labelKey: 'generationArea.company',
    word: (faker) => faker.company.buzzNoun(),
    phrase: (faker) => faker.company.catchPhrase(),
  },
  hacker: {
    id: 'hacker',
    labelKey: 'generationArea.hacker',
    word: (faker) => faker.hacker.noun(),
    phrase: (faker) => faker.hacker.phrase(),
  },
  location: {
    id: 'location',
    labelKey: 'generationArea.location',
    word: (faker) => faker.location.city(),
  },
  person: {
    id: 'person',
    labelKey: 'generationArea.person',
    word: (faker) => faker.person.firstName(),
  },
  animal: {
    id: 'animal',
    labelKey: 'generationArea.animal',
    word: (faker) => faker.animal.type(),
  },
  food: {
    id: 'food',
    labelKey: 'generationArea.food',
    word: (faker) => faker.food.fruit(),
  },
  science: {
    id: 'science',
    labelKey: 'generationArea.science',
    word: (faker) => faker.science.chemicalElement().name,
  },
  music: {
    id: 'music',
    labelKey: 'generationArea.music',
    word: (faker) => faker.music.genre(),
    phrase: (faker) => faker.music.songName(),
  },
  book: {
    id: 'book',
    labelKey: 'generationArea.book',
    word: (faker) => faker.book.genre(),
    phrase: (faker) => faker.book.title(),
  },
  vehicle: {
    id: 'vehicle',
    labelKey: 'generationArea.vehicle',
    word: (faker) => faker.vehicle.type(),
  },
  color: {
    id: 'color',
    labelKey: 'generationArea.color',
    word: (faker) => faker.color.human(),
  },
  focus: {
    id: 'focus',
    labelKey: 'generationArea.focus',
    word: () => '',
  },
}

export function isWordAreaId(value: unknown): value is GenerationAreaId {
  return (
    typeof value === 'string' &&
    WORD_AREA_IDS.includes(value as GenerationAreaId)
  )
}

export function isPhraseAreaId(value: unknown): value is GenerationAreaId {
  return (
    typeof value === 'string' &&
    PHRASE_AREA_IDS.includes(value as GenerationAreaId)
  )
}

export function areaIdsForSource(
  source: GenerationSentenceSource,
): readonly GenerationAreaId[] {
  return source === 'phrase' ? PHRASE_AREA_IDS : WORD_AREA_IDS
}
