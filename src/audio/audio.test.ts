import { describe, expect, it } from 'vitest'
import { createAudioEngine } from './audio'
import { FakeAudioContext } from './fakeAudio'

function engineFor(fake: FakeAudioContext) {
  return createAudioEngine(() => fake.asContext())
}

describe('createAudioEngine', () => {
  it('does not create a context before the first gesture', () => {
    const fake = new FakeAudioContext()
    const engine = engineFor(fake)

    engine.play('keypress')

    expect(fake.gains).toHaveLength(0)
    expect(fake.oscillators).toHaveLength(0)
  })

  it('creates a master gain and resumes on unlock', async () => {
    const fake = new FakeAudioContext()
    const engine = engineFor(fake)

    await engine.unlock()

    expect(fake.gains).toHaveLength(1)
    expect(fake.gains[0]?.gain.value).toBe(0.6)
    expect(fake.resumeCalls).toBe(1)
    expect(fake.state).toBe('running')
  })

  it('resumes a suspended context and replays the sound', async () => {
    const fake = new FakeAudioContext()
    const engine = engineFor(fake)
    await engine.unlock()

    engine.play('keypress')
    expect(fake.oscillators).toHaveLength(1)

    fake.state = 'suspended'
    engine.play('keypress')
    expect(fake.oscillators).toHaveLength(1)

    await Promise.resolve()
    expect(fake.resumeCalls).toBe(2)
    expect(fake.state).toBe('running')
    expect(fake.oscillators).toHaveLength(2)
  })

  it('skips sounds while muted and restores gain when unmuted', async () => {
    const fake = new FakeAudioContext()
    const engine = engineFor(fake)
    await engine.unlock()

    engine.setMuted(true)
    expect(engine.isMuted()).toBe(true)
    expect(fake.gains[0]?.gain.value).toBe(0)

    engine.play('keypress')
    expect(fake.oscillators).toHaveLength(0)

    engine.setMuted(false)
    expect(engine.isMuted()).toBe(false)
    expect(fake.gains[0]?.gain.value).toBe(0.6)
  })

  it('starts unmuted', () => {
    const engine = engineFor(new FakeAudioContext())
    expect(engine.isMuted()).toBe(false)
  })

  it('never throws when the context cannot be created', async () => {
    const engine = createAudioEngine(() => {
      throw new Error('no audio')
    })

    await expect(engine.unlock()).resolves.toBeUndefined()
    expect(() => engine.play('keypress')).not.toThrow()
  })

  it('never throws when resume is blocked', async () => {
    const fake = new FakeAudioContext()
    fake.resume = async () => {
      throw new Error('blocked')
    }
    const engine = engineFor(fake)

    await expect(engine.unlock()).resolves.toBeUndefined()
    expect(() => engine.play('keypress')).not.toThrow()
  })
})
