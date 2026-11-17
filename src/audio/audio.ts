import { synthesizeSound } from './sounds'
import type { SoundName } from './sounds'

export type { SoundName } from './sounds'

const MASTER_GAIN = 0.6

export interface AudioEngine {
  unlock(): Promise<void>
  play(name: SoundName): void
  setMuted(value: boolean): void
  isMuted(): boolean
}

function defaultCreateContext(): AudioContext {
  const global = window as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  const Ctor = global.AudioContext ?? global.webkitAudioContext
  if (Ctor === undefined) {
    throw new Error('Web Audio API is not available')
  }
  return new Ctor()
}

export function createAudioEngine(
  createContext: () => AudioContext = defaultCreateContext,
): AudioEngine {
  let context: AudioContext | null = null
  let master: GainNode | null = null
  let muted = false

  async function unlock(): Promise<void> {
    try {
      if (context === null) {
        const next = createContext()
        const gain = next.createGain()
        gain.gain.value = muted ? 0 : MASTER_GAIN
        gain.connect(next.destination)
        context = next
        master = gain
      }
    } catch {
      // No usable context; play() stays a silent no-op.
      return
    }
    try {
      if (context.state !== 'running') {
        await context.resume()
      }
    } catch {
      // Autoplay policies can reject resume(); try again on a later gesture.
    }
  }

  function play(name: SoundName): void {
    try {
      if (muted || context === null || master === null) {
        return
      }
      if (context.state !== 'running') {
        return
      }
      synthesizeSound(context, master, name, context.currentTime)
    } catch {
      // Audio must never break gameplay.
    }
  }

  function setMuted(value: boolean): void {
    muted = value
    if (master !== null) {
      master.gain.value = value ? 0 : MASTER_GAIN
    }
  }

  return {
    unlock,
    play,
    setMuted,
    isMuted: () => muted,
  }
}

export const audio = createAudioEngine()

export function unlockAudio(): Promise<void> {
  return audio.unlock()
}

export function play(name: SoundName): void {
  audio.play(name)
}

export function setMuted(value: boolean): void {
  audio.setMuted(value)
}

export function isMuted(): boolean {
  return audio.isMuted()
}
