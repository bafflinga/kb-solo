import { describe, expect, it } from 'vitest'
import { computeScore, computeStars } from './scoring'

describe('scoring', () => {
  it('computes gross WPM, net WPM and accuracy', () => {
    const score = computeScore({
      keystrokes: 100,
      correct: 95,
      elapsedMs: 60000,
    })
    expect(score.grossWpm).toBe(20)
    expect(score.netWpm).toBe(19)
    expect(score.accuracy).toBeCloseTo(0.95)
  })

  it('guards zero elapsed time and zero keystrokes', () => {
    expect(
      computeScore({ keystrokes: 100, correct: 95, elapsedMs: 0 }),
    ).toEqual({
      grossWpm: 0,
      netWpm: 0,
      accuracy: 0,
    })
    expect(
      computeScore({ keystrokes: 0, correct: 0, elapsedMs: 60000 }),
    ).toEqual({
      grossWpm: 0,
      netWpm: 0,
      accuracy: 0,
    })
  })

  it('awards three stars only at high accuracy and target speed', () => {
    expect(
      computeStars({ grossWpm: 36, netWpm: 35, accuracy: 0.98 }, true),
    ).toBe(3)
    expect(
      computeStars({ grossWpm: 31, netWpm: 29, accuracy: 0.98 }, true),
    ).toBe(2)
    expect(
      computeStars({ grossWpm: 42, netWpm: 40, accuracy: 0.96 }, true),
    ).toBe(2)
  })

  it('awards two stars only with enough speed and 90 percent accuracy', () => {
    expect(
      computeStars({ grossWpm: 25, netWpm: 22, accuracy: 0.9 }, true),
    ).toBe(2)
    expect(
      computeStars({ grossWpm: 20, netWpm: 18, accuracy: 0.9 }, true),
    ).toBe(1)
    expect(
      computeStars({ grossWpm: 20, netWpm: 22, accuracy: 0.85 }, true),
    ).toBe(1)
  })

  it('awards no stars for an incomplete lesson', () => {
    expect(computeStars({ grossWpm: 60, netWpm: 60, accuracy: 1 }, false)).toBe(
      0,
    )
  })

  it('honours a custom target WPM', () => {
    const score = { grossWpm: 24, netWpm: 22, accuracy: 0.99 }
    expect(computeStars(score, true)).toBe(2)
    expect(computeStars(score, true, 20)).toBe(3)
  })
})
