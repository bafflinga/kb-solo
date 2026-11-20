import { describe, expect, it } from 'vitest'
import { getLayout } from '../domain/layout'
import { getLessonMeta } from '../domain/lessons/registry'
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
  it('previews the full focus zone, not just codes used by variants', () => {
    const codes = usedCodesForLesson(
      meta,
      contentFor(['aa', 's']),
      getLayout('us-qwerty'),
    )
    expect(codes).toEqual(['KeyA', 'KeyS', 'KeyD'])
  })

  it('previews the focus zone regardless of overrides in the map', () => {
    const codes = usedCodesForLesson(
      meta,
      contentFor(['d']),
      getLayout('us-qwerty'),
    )
    expect(codes).toEqual(['KeyA', 'KeyS', 'KeyD'])
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

  it('previews the focus zone when content is missing', () => {
    const codes = usedCodesForLesson(
      meta,
      undefined,
      getLayout('us-qwerty-mac'),
    )
    expect(codes).toEqual(['KeyA', 'KeyS', 'KeyD'])
  })

  it('falls back to content codes for lessons without a focus', () => {
    const withoutFocus: LessonMeta = { ...meta, focus: undefined }
    const codes = usedCodesForLesson(
      withoutFocus,
      contentFor(['aa', 's']),
      getLayout('us-qwerty'),
    )
    expect(codes).toEqual(['KeyA', 'KeyS'])
  })

  it('previews Backquote for ru-pinky-top on every Russian layout', () => {
    const pinkyTop = getLessonMeta('ru-pinky-top')
    expect(pinkyTop).toBeDefined()
    for (const id of [
      'ru-jcuken',
      'ru-jcuken-mac',
      'ru-jcuken-mac-iso',
    ] as const) {
      const codes = usedCodesForLesson(pinkyTop!, undefined, getLayout(id))
      expect(codes, id).toContain('Backquote')
    }
  })
})
