import { drillCues, lineCues, wordCues } from '../cues'
import { getLayout } from '../layout'
import type { Cue, Layout } from '../types'
import { EN_CODE_SNIPPET } from './code'
import {
  EN_BOTTOM_BOTH_DRILL,
  EN_BOTTOM_LEFT_DRILL,
  EN_BOTTOM_RIGHT_DRILL,
  EN_DIGITS_LEFT_DRILL,
  EN_DIGITS_RIGHT_DRILL,
  EN_HOME_BOTH_DRILL,
  EN_HOME_LEFT_DRILL,
  EN_HOME_RIGHT_DRILL,
  EN_HOME_WORDS_DRILL,
  EN_SHIFT_DRILL,
  EN_SYMBOL_DRILL,
  EN_TOP_BOTH_DRILL,
  EN_TOP_LEFT_DRILL,
  EN_TOP_RIGHT_DRILL,
  EN_WORDS,
} from './drills.en'
import { EN_PROSE } from './prose.en'
import type { LessonMeta, LessonProvider } from './types'

type Plan =
  | { kind: 'drill'; pattern: string }
  | { kind: 'words'; words: readonly string[] }
  | { kind: 'prose'; text: string }
  | { kind: 'code'; text: string }

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
        case 'code':
          return lineCues(layout, plan.text)
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
    id: 'en-home-left',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.homeLeft',
    order: 1,
    difficulty: 1,
    focusCodes: ['KeyA', 'KeyS', 'KeyD', 'KeyF'],
  },
  { kind: 'drill', pattern: EN_HOME_LEFT_DRILL },
)

add(
  {
    id: 'en-home-right',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.homeRight',
    order: 2,
    difficulty: 1,
    focusCodes: ['KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
  },
  { kind: 'drill', pattern: EN_HOME_RIGHT_DRILL },
)

add(
  {
    id: 'en-home-both',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.homeBoth',
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
  { kind: 'drill', pattern: EN_HOME_BOTH_DRILL },
)

add(
  {
    id: 'en-home-words',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.homeWords',
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
  { kind: 'drill', pattern: EN_HOME_WORDS_DRILL },
)

add(
  {
    id: 'en-top-left',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.topLeft',
    order: 5,
    difficulty: 2,
    focusCodes: ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'],
  },
  { kind: 'drill', pattern: EN_TOP_LEFT_DRILL },
)

add(
  {
    id: 'en-top-right',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.topRight',
    order: 6,
    difficulty: 2,
    focusCodes: ['KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'],
  },
  { kind: 'drill', pattern: EN_TOP_RIGHT_DRILL },
)

add(
  {
    id: 'en-top-both',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.topBoth',
    order: 7,
    difficulty: 2,
    focusCodes: [
      'KeyQ',
      'KeyW',
      'KeyE',
      'KeyR',
      'KeyT',
      'KeyY',
      'KeyU',
      'KeyI',
      'KeyO',
      'KeyP',
    ],
  },
  { kind: 'drill', pattern: EN_TOP_BOTH_DRILL },
)

add(
  {
    id: 'en-bottom-right',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.bottomRight',
    order: 8,
    difficulty: 2,
    focusCodes: ['KeyN', 'KeyM', 'Comma', 'Period'],
  },
  { kind: 'drill', pattern: EN_BOTTOM_RIGHT_DRILL },
)

add(
  {
    id: 'en-bottom-left',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.bottomLeft',
    order: 9,
    difficulty: 2,
    focusCodes: ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB'],
  },
  { kind: 'drill', pattern: EN_BOTTOM_LEFT_DRILL },
)

add(
  {
    id: 'en-bottom-both',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.bottomBoth',
    order: 10,
    difficulty: 3,
    focusCodes: [
      'KeyZ',
      'KeyX',
      'KeyC',
      'KeyV',
      'KeyB',
      'KeyN',
      'KeyM',
      'Comma',
      'Period',
    ],
  },
  { kind: 'drill', pattern: EN_BOTTOM_BOTH_DRILL },
)

add(
  {
    id: 'en-shift',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.shift',
    order: 11,
    difficulty: 3,
  },
  { kind: 'drill', pattern: EN_SHIFT_DRILL },
)

add(
  {
    id: 'en-digits-left',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.digitsLeft',
    order: 12,
    difficulty: 3,
    focusCodes: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'],
  },
  { kind: 'drill', pattern: EN_DIGITS_LEFT_DRILL },
)

add(
  {
    id: 'en-digits-right',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.digitsRight',
    order: 13,
    difficulty: 3,
    focusCodes: ['Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'],
  },
  { kind: 'drill', pattern: EN_DIGITS_RIGHT_DRILL },
)

add(
  {
    id: 'en-symbols',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.symbols',
    order: 14,
    difficulty: 4,
    focusCodes: [
      'Minus',
      'Equal',
      'BracketLeft',
      'BracketRight',
      'Semicolon',
      'Quote',
      'Comma',
      'Period',
      'Slash',
      'Backslash',
    ],
  },
  { kind: 'drill', pattern: EN_SYMBOL_DRILL },
)

add(
  {
    id: 'en-words',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.words',
    order: 15,
    difficulty: 3,
  },
  { kind: 'words', words: EN_WORDS },
)

add(
  {
    id: 'en-prose',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.prose',
    order: 16,
    difficulty: 4,
  },
  { kind: 'prose', text: EN_PROSE },
)

add(
  {
    id: 'en-code',
    language: 'en',
    layoutId: 'us-qwerty',
    titleKey: 'lesson.en.code',
    order: 17,
    difficulty: 5,
  },
  { kind: 'code', text: EN_CODE_SNIPPET },
)

export const enLessons: readonly LessonProvider[] = providers
