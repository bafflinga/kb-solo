import { describe, expect, it } from 'vitest'
import { routeKey } from './navigation'

describe('routeKey', () => {
  it('identifies each screen and lesson', () => {
    expect(routeKey({ screen: 'menu' })).toBe('menu')
    expect(routeKey({ screen: 'stats' })).toBe('stats')
    expect(routeKey({ screen: 'lesson', lessonId: 'ru-home-left' })).toBe(
      'lesson:ru-home-left',
    )
  })
})
