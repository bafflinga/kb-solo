import { describe, expect, it } from 'vitest'
import { parseHash } from './useHashRoute'

describe('parseHash', () => {
  it('maps known routes', () => {
    expect(parseHash('')).toEqual({ screen: 'menu' })
    expect(parseHash('#/')).toEqual({ screen: 'menu' })
    expect(parseHash('#/stats')).toEqual({ screen: 'stats' })
    expect(parseHash('#/content')).toEqual({ screen: 'content' })
    expect(parseHash('#/lesson/en-home-left')).toEqual({
      screen: 'lesson',
      lessonId: 'en-home-left',
    })
  })

  it('decodes lesson ids and falls back to menu', () => {
    expect(parseHash('#/lesson/en%20one')).toEqual({
      screen: 'lesson',
      lessonId: 'en one',
    })
    expect(parseHash('#/unknown')).toEqual({ screen: 'menu' })
    expect(parseHash('#/lesson/')).toEqual({ screen: 'menu' })
  })
})
