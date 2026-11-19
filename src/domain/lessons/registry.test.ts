import { describe, expect, it } from 'vitest'
import { cueFromText } from '../cues'
import type { Cue, Layout } from '../types'
import {
  allLessons,
  getLesson,
  isUnlocked,
  lessonsFor,
  nextLesson,
} from './registry'
import type { LessonProvider } from './types'

function countChars(cues: readonly Cue[]): number {
  return cues.reduce((total, cue) => total + cue.chars.length, 0)
}

describe('registry', () => {
  it('has 56 lessons split into 28 English and 28 Russian', () => {
    expect(allLessons()).toHaveLength(56)
    expect(lessonsFor('en')).toHaveLength(28)
    expect(lessonsFor('ru')).toHaveLength(28)
  })

  it('shares lesson types and difficulty across languages', () => {
    const typeOf = (id: string) => id.replace(/^(en|ru)-/, '')
    const enLessons = lessonsFor('en')
    const ruLessons = lessonsFor('ru')
    const enTypes = enLessons.map((meta) => typeOf(meta.id))
    const ruTypes = ruLessons.map((meta) => typeOf(meta.id))

    expect([...enTypes].sort()).toEqual([...ruTypes].sort())
    for (const meta of enLessons) {
      const type = typeOf(meta.id)
      const russian = ruLessons.find(
        (candidate) => typeOf(candidate.id) === type,
      )
      expect(
        russian?.difficulty,
        `${meta.id} should have a Russian twin`,
      ).toBeDefined()
      if (russian) {
        expect(meta.difficulty, meta.id).toBe(russian.difficulty)
      }
    }
  })

  it('orders lessons by language, then order, then id', () => {
    const metas = allLessons()
    for (let i = 1; i < metas.length; i++) {
      const previous = metas[i - 1]
      const current = metas[i]
      if (!previous || !current) {
        throw new Error('missing lesson in ordering check')
      }
      expect(previous.language <= current.language).toBe(true)
      if (previous.language === current.language) {
        expect(previous.order <= current.order).toBe(true)
        if (previous.order === current.order) {
          expect(previous.id < current.id).toBe(true)
        }
      }
    }
  })

  it('has unique ids and title keys', () => {
    const metas = allLessons()
    expect(new Set(metas.map((meta) => meta.id)).size).toBe(metas.length)
    expect(new Set(metas.map((meta) => meta.titleKey)).size).toBe(metas.length)
  })

  it('resolves every registered id to a provider', () => {
    for (const meta of allLessons()) {
      expect(getLesson(meta.id)?.meta.id, meta.id).toBe(meta.id)
    }
    expect(getLesson('does-not-exist')).toBeUndefined()
  })

  it('chains each lesson to the previous one within its language', () => {
    for (const language of ['en', 'ru'] as const) {
      const metas = lessonsFor(language)
      for (let i = 1; i < metas.length; i++) {
        const current = metas[i]
        const previous = metas[i - 1]
        if (!current || !previous) {
          throw new Error('missing lesson in prerequisite check')
        }
        expect(current.requires, current.id).toEqual([previous.id])
      }
    }
  })

  it('unlocks only lessons whose prerequisites are complete', () => {
    const first = allLessons()[0]
    const second = allLessons()[1]
    if (!first || !second) {
      throw new Error('missing lesson in unlock check')
    }
    expect(isUnlocked(first, new Set())).toBe(true)
    expect(isUnlocked(second, new Set())).toBe(false)
    expect(isUnlocked(second, new Set([first.id]))).toBe(true)
  })

  it('accepts a synthetic layout and a new provider without core changes', () => {
    const syntheticLayout: Layout = {
      id: 'us-qwerty',
      displayName: 'Synthetic',
      formFactor: 'ansi',
      legends: {
        KeyX: { base: 'x', shift: 'X' },
        Space: { base: ' ', shift: ' ' },
      },
      geometry: {
        KeyX: { x: 0, y: 0, u: 1 },
        Space: { x: 1, y: 0, u: 1 },
      },
    }

    const syntheticProvider: LessonProvider = {
      meta: {
        id: 'synthetic-lesson',
        language: 'en',
        layoutId: 'us-qwerty',
        titleKey: 'lesson.synthetic',
        order: 0,
        difficulty: 1,
      },
      kind: 'drill',
      templateCount: 1,
      createCues: () => [cueFromText(syntheticLayout, 'xx x', 'word')],
    }

    const cues = syntheticProvider.createCues()
    expect(cues[0]?.text).toBe('xx x')
    expect(cues[0]?.chars.every((char) => char.code !== undefined)).toBe(true)
    expect(cues[0]?.chars[0]?.finger).toBe('lr')
    expect(countChars(cues)).toBe(4)

    const otherKind: LessonProvider = {
      meta: { ...syntheticProvider.meta, id: 'synthetic-line' },
      kind: 'drill',
      templateCount: 1,
      createCues: () => [cueFromText(syntheticLayout, 'x\nx', 'line')],
    }
    expect(countChars(otherKind.createCues())).toBe(3)
  })

  it('resolves the next lesson within the same language and stops at the end', () => {
    for (const language of ['en', 'ru'] as const) {
      const metas = lessonsFor(language)
      for (let i = 0; i < metas.length - 1; i++) {
        const current = metas[i]
        const following = metas[i + 1]
        if (!current || !following) {
          throw new Error('missing lesson in nextLesson check')
        }
        expect(nextLesson(current)?.id, current.id).toBe(following.id)
      }
      const last = metas[metas.length - 1]
      if (!last) {
        throw new Error('missing last lesson in nextLesson check')
      }
      expect(nextLesson(last)).toBeUndefined()
    }
  })

  it('never crosses languages when resolving the next lesson', () => {
    const lastEn = lessonsFor('en').at(-1)
    const firstRu = lessonsFor('ru')[0]
    if (!lastEn || !firstRu) {
      throw new Error('missing lesson in cross-language check')
    }
    expect(nextLesson(lastEn)).toBeUndefined()
    expect(nextLesson(lastEn)?.language).not.toBe('ru')
  })
})
