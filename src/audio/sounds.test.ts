import { describe, expect, it } from 'vitest'
import { FakeAudioContext } from './fakeAudio'
import { synthesizeSound } from './sounds'
import type { SoundName } from './sounds'

function run(name: SoundName): FakeAudioContext {
  const ctx = new FakeAudioContext()
  synthesizeSound(ctx.asContext(), ctx.asDestination(), name, 0)
  return ctx
}

function frequencies(ctx: FakeAudioContext): Array<number | undefined> {
  return ctx.oscillators.map((o) => o.frequency.events[0]?.value)
}

function gains(ctx: FakeAudioContext): Array<number | undefined> {
  return ctx.gains.map(
    (g) => g.gain.events.find((event) => event.kind === 'linear')?.value,
  )
}

describe('synthesizeSound', () => {
  it('synthesizes a quiet keypress with a short pitch ramp', () => {
    const ctx = run('keypress')

    expect(ctx.oscillators).toHaveLength(1)
    expect(ctx.oscillators[0]?.type).toBe('triangle')
    expect(ctx.oscillators[0]?.frequency.events).toEqual([
      { kind: 'set', value: 880, time: 0 },
      { kind: 'exp', value: 1180, time: 0.025 },
    ])
    expect(gains(ctx)).toEqual([0.05])
    expect(ctx.gains[0]?.gain.events.at(-1)).toEqual({
      kind: 'exp',
      value: 0.0001,
      time: 0.04,
    })
    expect(ctx.filters).toHaveLength(0)
  })

  it('synthesizes a sour error with a lowpass', () => {
    const ctx = run('error')

    expect(ctx.oscillators[0]?.type).toBe('square')
    expect(frequencies(ctx)).toEqual([180])
    expect(ctx.oscillators[0]?.frequency.events[1]).toEqual({
      kind: 'exp',
      value: 140,
      time: 0.14,
    })
    expect(gains(ctx)).toEqual([0.08])
    expect(ctx.filters).toHaveLength(1)
    expect(ctx.filters[0]?.type).toBe('lowpass')
    expect(ctx.filters[0]?.frequency.value).toBe(900)
  })

  it('synthesizes a short word-complete chime', () => {
    const ctx = run('wordComplete')

    expect(ctx.oscillators[0]?.type).toBe('sine')
    expect(frequencies(ctx)).toEqual([1320])
    expect(gains(ctx)).toEqual([0.04])
  })

  it('synthesizes the four-note success arpeggio', () => {
    const ctx = run('lessonSuccess')

    expect(ctx.oscillators).toHaveLength(4)
    expect(ctx.oscillators.map((o) => o.type)).toEqual([
      'triangle',
      'triangle',
      'triangle',
      'triangle',
    ])
    expect(frequencies(ctx)).toEqual([523.25, 659.25, 783.99, 1046.5])
    expect(ctx.filters.map((f) => f.frequency.value)).toEqual([
      4000, 4000, 4000, 4000,
    ])
    expect(gains(ctx)).toEqual([0.12, 0.12, 0.12, 0.12])
  })

  it('synthesizes a descending failure tone', () => {
    const ctx = run('lessonFailure')

    expect(ctx.oscillators[0]?.type).toBe('sawtooth')
    expect(frequencies(ctx)).toEqual([240])
    expect(ctx.oscillators[0]?.frequency.events[1]).toEqual({
      kind: 'exp',
      value: 110,
      time: 0.6,
    })
    expect(gains(ctx)).toEqual([0.1])
    expect(ctx.filters[0]?.frequency.value).toBe(1200)
  })

  it('synthesizes a rising star chime', () => {
    const ctx = run('starEarned')

    expect(ctx.oscillators[0]?.type).toBe('sine')
    expect(frequencies(ctx)).toEqual([1046.5])
    expect(ctx.oscillators[0]?.frequency.events[1]).toEqual({
      kind: 'exp',
      value: 1568,
      time: 0.12,
    })
    expect(gains(ctx)).toEqual([0.08])
  })

  it('never throws when the context misbehaves', () => {
    const throwing = {
      createOscillator() {
        throw new Error('boom')
      },
    } as unknown as AudioContext

    expect(() =>
      synthesizeSound(throwing, {} as AudioNode, 'keypress', 0),
    ).not.toThrow()
  })
})
