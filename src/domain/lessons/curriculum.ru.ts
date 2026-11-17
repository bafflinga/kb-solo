import { drillCues, wordCues } from '../cues'
import { getLayout } from '../layout'
import type { Cue, Layout } from '../types'
import {
  RU_ALL_LETTERS_DRILL,
  RU_CAPS_DRILL,
  RU_DIGITS_LEFT_DRILL,
  RU_DIGITS_RIGHT_DRILL,
  RU_HOME_BOTH_DRILL,
  RU_HOME_LEFT_DRILL,
  RU_HOME_RIGHT_DRILL,
  RU_HOME_WORDS_DRILL,
  RU_HARD_SIGN_DRILL,
  RU_INDEX_BOTH_DRILL,
  RU_INDEX_BOTTOM_DRILL,
  RU_INDEX_MID_DRILL,
  RU_INDEX_TOP_LEFT_DRILL,
  RU_INDEX_TOP_RIGHT_DRILL,
  RU_MIDDLE_BOTH_DRILL,
  RU_MIDDLE_DRILL,
  RU_PINKY_BOTH_DRILL,
  RU_PINKY_BOTTOM_DRILL,
  RU_PINKY_RIGHT_DRILL,
  RU_PINKY_TOP_DRILL,
  RU_PUNCTUATION_DRILL,
  RU_RING_BOTH_DRILL,
  RU_RING_DRILL,
  RU_WORDS,
} from './drills.ru'
import { RU_PROSE } from './prose.ru'
import type { LessonMeta, LessonProvider } from './types'

type Plan =
  | { kind: 'drill'; pattern: string }
  | { kind: 'words'; words: readonly string[] }
  | { kind: 'prose'; text: string }

function makeProvider(meta: LessonMeta, plan: Plan): LessonProvider {
  return {
    meta,
    createCues(layoutOverride?: Layout): Cue[] {
      const layout = layoutOverride ?? getLayout(meta.layoutId)
      switch (plan.kind) {
        case 'drill':
          return drillCues(layout, plan.pattern)
        case 'words':
          return wordCues(layout, plan.words.join(' '))
        case 'prose':
          return wordCues(layout, plan.text)
      }
    },
  }
}

const metas: LessonMeta[] = []
const providers: LessonProvider[] = []

function add(meta: LessonMeta, plan: Plan): void {
  const previous = metas[metas.length - 1]
  const finalMeta: LessonMeta = previous
    ? { ...meta, requires: [previous.id] }
    : meta
  metas.push(finalMeta)
  providers.push(makeProvider(finalMeta, plan))
}

add(
  {
    id: 'ru-home-left',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.homeLeft',
    order: 1,
    difficulty: 1,
    focusCodes: ['KeyA', 'KeyS', 'KeyD', 'KeyF'],
  },
  { kind: 'drill', pattern: RU_HOME_LEFT_DRILL },
)

add(
  {
    id: 'ru-home-right',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.homeRight',
    order: 2,
    difficulty: 1,
    focusCodes: ['KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
  },
  { kind: 'drill', pattern: RU_HOME_RIGHT_DRILL },
)

add(
  {
    id: 'ru-home-both',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.homeBoth',
    order: 3,
    difficulty: 1,
    focusCodes: [
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyF',
      'KeyJ',
      'KeyK',
      'KeyL',
      'Semicolon',
    ],
  },
  { kind: 'drill', pattern: RU_HOME_BOTH_DRILL },
)

add(
  {
    id: 'ru-home-words',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.homeWords',
    order: 4,
    difficulty: 1,
    focusCodes: [
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyF',
      'KeyJ',
      'KeyK',
      'KeyL',
      'Semicolon',
    ],
  },
  { kind: 'drill', pattern: RU_HOME_WORDS_DRILL },
)

add(
  {
    id: 'ru-index-top-left',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.indexTopLeft',
    order: 5,
    difficulty: 2,
    focusCodes: ['KeyR', 'KeyT'],
  },
  { kind: 'drill', pattern: RU_INDEX_TOP_LEFT_DRILL },
)

add(
  {
    id: 'ru-index-top-right',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.indexTopRight',
    order: 6,
    difficulty: 2,
    focusCodes: ['KeyY', 'KeyU'],
  },
  { kind: 'drill', pattern: RU_INDEX_TOP_RIGHT_DRILL },
)

add(
  {
    id: 'ru-index-mid',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.indexMid',
    order: 7,
    difficulty: 2,
    focusCodes: ['KeyG', 'KeyH'],
  },
  { kind: 'drill', pattern: RU_INDEX_MID_DRILL },
)

add(
  {
    id: 'ru-index-bottom',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.indexBottom',
    order: 8,
    difficulty: 2,
    focusCodes: ['KeyV', 'KeyB', 'KeyN', 'KeyM'],
  },
  { kind: 'drill', pattern: RU_INDEX_BOTTOM_DRILL },
)

add(
  {
    id: 'ru-index-both',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.indexBoth',
    order: 9,
    difficulty: 3,
    focusCodes: [
      'KeyF',
      'KeyG',
      'KeyR',
      'KeyT',
      'KeyV',
      'KeyB',
      'KeyN',
      'KeyM',
      'KeyJ',
      'KeyH',
      'KeyY',
      'KeyU',
    ],
  },
  { kind: 'drill', pattern: RU_INDEX_BOTH_DRILL },
)

add(
  {
    id: 'ru-middle',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.middle',
    order: 10,
    difficulty: 3,
    focusCodes: ['KeyE', 'KeyI', 'KeyC', 'Comma'],
  },
  { kind: 'drill', pattern: RU_MIDDLE_DRILL },
)

add(
  {
    id: 'ru-middle-both',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.middleBoth',
    order: 11,
    difficulty: 3,
    focusCodes: ['KeyD', 'KeyE', 'KeyC', 'KeyK', 'KeyI', 'Comma'],
  },
  { kind: 'drill', pattern: RU_MIDDLE_BOTH_DRILL },
)

add(
  {
    id: 'ru-ring',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.ring',
    order: 12,
    difficulty: 3,
    focusCodes: ['KeyW', 'KeyO', 'KeyX', 'Period'],
  },
  { kind: 'drill', pattern: RU_RING_DRILL },
)

add(
  {
    id: 'ru-ring-both',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.ringBoth',
    order: 13,
    difficulty: 4,
    focusCodes: ['KeyS', 'KeyW', 'KeyX', 'KeyL', 'KeyO', 'Period'],
  },
  { kind: 'drill', pattern: RU_RING_BOTH_DRILL },
)

add(
  {
    id: 'ru-pinky-top',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.pinkyTop',
    order: 14,
    difficulty: 3,
    focusCodes: ['KeyQ'],
  },
  { kind: 'drill', pattern: RU_PINKY_TOP_DRILL },
)

add(
  {
    id: 'ru-pinky-bottom',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.pinkyBottom',
    order: 15,
    difficulty: 3,
    focusCodes: ['KeyZ'],
  },
  { kind: 'drill', pattern: RU_PINKY_BOTTOM_DRILL },
)

add(
  {
    id: 'ru-pinky-right',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.pinkyRight',
    order: 16,
    difficulty: 4,
    focusCodes: ['KeyP', 'BracketLeft', 'Quote'],
  },
  { kind: 'drill', pattern: RU_PINKY_RIGHT_DRILL },
)

add(
  {
    id: 'ru-pinky-both',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.pinkyBoth',
    order: 17,
    difficulty: 4,
    focusCodes: [
      'KeyF',
      'KeyQ',
      'KeyZ',
      'Semicolon',
      'KeyP',
      'BracketLeft',
      'Quote',
    ],
  },
  { kind: 'drill', pattern: RU_PINKY_BOTH_DRILL },
)

add(
  {
    id: 'ru-hard-sign',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.hardSign',
    order: 18,
    difficulty: 3,
    focusCodes: ['BracketRight', 'Backquote'],
  },
  { kind: 'drill', pattern: RU_HARD_SIGN_DRILL },
)

add(
  {
    id: 'ru-all-letters',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.allLetters',
    order: 19,
    difficulty: 4,
  },
  { kind: 'drill', pattern: RU_ALL_LETTERS_DRILL },
)

add(
  {
    id: 'ru-caps',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.caps',
    order: 20,
    difficulty: 4,
  },
  { kind: 'drill', pattern: RU_CAPS_DRILL },
)

add(
  {
    id: 'ru-digits-left',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.digitsLeft',
    order: 21,
    difficulty: 3,
    focusCodes: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'],
  },
  { kind: 'drill', pattern: RU_DIGITS_LEFT_DRILL },
)

add(
  {
    id: 'ru-digits-right',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.digitsRight',
    order: 22,
    difficulty: 3,
    focusCodes: ['Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'],
  },
  { kind: 'drill', pattern: RU_DIGITS_RIGHT_DRILL },
)

add(
  {
    id: 'ru-punctuation',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.punctuation',
    order: 23,
    difficulty: 4,
    focusCodes: [
      'Slash',
      'Digit4',
      'Digit6',
      'Digit1',
      'Digit7',
      'Digit2',
      'Minus',
    ],
  },
  { kind: 'drill', pattern: RU_PUNCTUATION_DRILL },
)

add(
  {
    id: 'ru-words',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.words',
    order: 24,
    difficulty: 4,
  },
  { kind: 'words', words: RU_WORDS },
)

add(
  {
    id: 'ru-prose',
    language: 'ru',
    layoutId: 'ru-jcuken',
    titleKey: 'lesson.ru.prose',
    order: 25,
    difficulty: 5,
  },
  { kind: 'prose', text: RU_PROSE },
)

export const ruLessons: readonly LessonProvider[] = providers
