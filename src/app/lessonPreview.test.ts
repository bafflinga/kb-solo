import { describe, expect, it } from 'vitest'
import { getLayout } from '../domain/layout'
import type { LessonContentMap, LessonMeta } from '../domain/lessons/types'
import type { LayoutId } from '../domain/types'
import { usedCodesForLesson } from './lessonPreview'

const meta: LessonMeta = {
  id: 'test-preview',
  language: 'en',
  layoutId: 'us-qwerty',
  titleKey: 'lesson.en.homeLeft',
  kind: 'drill',
  order: 1,
  difficulty: 1,
  focusCodes: ['KeyA', 'KeyS'],
}

const contentFor = (
  variants: unknown[],
  layoutVariants?: Partial<Record<LayoutId, unknown[]>>,
): LessonContentMap => ({
  'test-preview': {
    formatVersion: 1,
    variants,
    ...(layoutVariants ? { layoutVariants } : {}),
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

  it('uses layout-specific variants when present', () => {
    const codes = usedCodesForLesson(
      meta,
      contentFor(['a'], { 'us-qwerty-mac': ['x'] }),
      getLayout('us-qwerty-mac'),
    )
    expect(codes).toEqual(['KeyX'])
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
    expect(codes).toEqual(['KeyA', 'KeyS'])
  })
})
