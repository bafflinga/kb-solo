import { describe, expect, it } from 'vitest'
import { getLayout } from '../domain/layout'
import type { LessonContentMap, LessonMeta } from '../domain/lessons/types'
import { usedCodesForLesson } from './lessonPreview'

const meta: LessonMeta = {
  id: 'test-preview',
  language: 'en',
  layoutId: 'us-qwerty',
  titleKey: 'lesson.en.homeLeft',
  kind: 'drill',
  focus: { keys: { codes: ['KeyA', 'KeyS', 'KeyD'] } },
}

const contentFor = (variants: unknown[]): LessonContentMap => ({
  'test-preview': {
    formatVersion: 1,
    variants,
  },
})

describe('usedCodesForLesson', () => {
  it('collects codes from every authored variant, deduped', () => {
    const codes = usedCodesForLesson(
      meta,
      contentFor(['aa', 's']),
      getLayout('us-qwerty'),
    )
    expect(codes).toEqual(['KeyA', 'KeyS'])
  })

  it('uses overridden content from the map', () => {
    const codes = usedCodesForLesson(
      meta,
      contentFor(['d']),
      getLayout('us-qwerty'),
    )
    expect(codes).toEqual(['KeyD'])
  })

  it('excludes Space and Enter', () => {
    const codes = usedCodesForLesson(
      meta,
      contentFor(['a b']),
      getLayout('us-qwerty'),
    )
    expect(codes).not.toContain('Space')
    expect(codes).not.toContain('Enter')
  })

  it('falls back to mapped focus codes when content is missing', () => {
    const codes = usedCodesForLesson(
      meta,
      undefined,
      getLayout('us-qwerty-mac'),
    )
    expect(codes).toEqual(['KeyA', 'KeyS', 'KeyD'])
  })
})
