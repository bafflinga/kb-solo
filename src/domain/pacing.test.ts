import { describe, expect, it } from 'vitest'
import { cueFromText, wordCues } from './cues'
import { getLayout } from './layout'
import { derivePacing, isPaceLevel } from './pacing'

const layout = getLayout('us-qwerty')

function cues(text: string) {
  return wordCues(layout, text)
}

describe('pacing', () => {
  it('recognizes pace levels', () => {
    expect(isPaceLevel('off')).toBe(true)
    expect(isPaceLevel('challenging')).toBe(true)
    expect(isPaceLevel('hardcore')).toBe(true)
    expect(isPaceLevel('fast')).toBe(false)
    expect(isPaceLevel(undefined)).toBe(false)
  })

  it('leaves beginners untimed at the default target', () => {
    const result = derivePacing(cues('as df'), {}, 'off')
    expect(result.timeLimitMs).toBeNull()
    expect(result.targetWpm).toBe(30)
  })

  it('uses increasing target speeds for the presets', () => {
    const text = 'as df jk l;'
    const off = derivePacing(cues(text), {}, 'off')
    const relaxed = derivePacing(cues(text), {}, 'relaxed')
    const standard = derivePacing(cues(text), {}, 'standard')
    const challenging = derivePacing(cues(text), {}, 'challenging')
    expect(relaxed.targetWpm).toBeLessThan(standard.targetWpm)
    expect(standard.targetWpm).toBeLessThan(challenging.targetWpm)
    expect(off.targetWpm).toBe(30)
    expect(relaxed.timeLimitMs).toBeGreaterThan(0)
  })

  it('scales the limit with the amount of text', () => {
    const short = derivePacing(cues('as df'), {}, 'standard')
    const long = derivePacing(cues('as df as df as df as df'), {}, 'standard')
    expect(short.timeLimitMs).not.toBeNull()
    expect(long.timeLimitMs).not.toBeNull()
    expect((long.timeLimitMs ?? 0) / (short.timeLimitMs ?? 1)).toBeGreaterThan(3)
  })

  it('lowers the target for symbol-heavy content', () => {
    const plain = derivePacing([cueFromText(layout, 'asdf', 'word')], {}, 'standard')
    const digits = derivePacing([cueFromText(layout, '1234', 'word')], {}, 'standard')
    const shifted = derivePacing([cueFromText(layout, 'ASDF', 'word')], {}, 'standard')
    expect(digits.targetWpm).toBeLessThan(plain.targetWpm)
    expect(shifted.targetWpm).toBeLessThan(plain.targetWpm)
  })

  it('gives hardcore a par-time limit at the challenging base speed', () => {
    const text = 'as df jk l;'
    const challenging = derivePacing(cues(text), {}, 'challenging')
    const hardcore = derivePacing(cues(text), {}, 'hardcore')

    expect(hardcore.targetWpm).toBe(challenging.targetWpm)
    expect(hardcore.timeLimitMs).not.toBeNull()
    expect(challenging.timeLimitMs).not.toBeNull()
    expect(hardcore.timeLimitMs).toBeLessThan(challenging.timeLimitMs ?? 0)
    expect(hardcore.timeLimitMs).toBeCloseTo(
      (challenging.timeLimitMs ?? 0) / 1.5,
      1,
    )
  })

  it('honours per-lesson overrides', () => {
    const result = derivePacing(cues('as df'), {
      targetWpm: 42,
      timeLimitSec: 7,
    }, 'challenging')
    expect(result.targetWpm).toBe(42)
    expect(result.timeLimitMs).toBe(7000)

    const hardcore = derivePacing(cues('as df'), {
      targetWpm: 50,
      timeLimitSec: 3,
    }, 'hardcore')
    expect(hardcore.targetWpm).toBe(50)
    expect(hardcore.timeLimitMs).toBe(3000)
  })
})
