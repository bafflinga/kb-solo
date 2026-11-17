export type SoundName =
  | 'keypress'
  | 'error'
  | 'wordComplete'
  | 'lessonSuccess'
  | 'lessonFailure'
  | 'starEarned'

// exponentialRampToValueAtTime cannot target exactly 0; ramp to this instead.
const SILENCE = 0.0001

interface ToneOptions {
  type: OscillatorType
  frequency: number
  endFrequency?: number
  frequencyDuration?: number
  duration: number
  attack?: number
  gain: number
  filterFrequency?: number
}

function scheduleTone(
  ctx: AudioContext,
  destination: AudioNode,
  startTime: number,
  options: ToneOptions,
): void {
  const {
    type,
    frequency,
    endFrequency,
    frequencyDuration,
    duration,
    attack = 0.01,
    gain,
    filterFrequency,
  } = options
  const start = startTime
  const end = start + duration

  const oscillator = ctx.createOscillator()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  if (endFrequency !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      start + (frequencyDuration ?? duration),
    )
  }

  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0, start)
  envelope.gain.linearRampToValueAtTime(gain, start + attack)
  envelope.gain.exponentialRampToValueAtTime(SILENCE, end)

  oscillator.connect(envelope)

  if (filterFrequency !== undefined) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(filterFrequency, start)
    envelope.connect(filter)
    filter.connect(destination)
  } else {
    envelope.connect(destination)
  }

  oscillator.start(start)
  oscillator.stop(end + 0.02)
}

const SUCCESS_NOTES = [523.25, 659.25, 783.99, 1046.5] as const
const SUCCESS_SPACING = 0.09

type SoundBuilder = (
  ctx: AudioContext,
  destination: AudioNode,
  startTime: number,
) => void

const SOUNDS: Record<SoundName, SoundBuilder> = {
  keypress: (ctx, destination, startTime) => {
    scheduleTone(ctx, destination, startTime, {
      type: 'triangle',
      frequency: 880,
      endFrequency: 1180,
      frequencyDuration: 0.025,
      duration: 0.04,
      attack: 0.005,
      gain: 0.05,
    })
  },
  error: (ctx, destination, startTime) => {
    scheduleTone(ctx, destination, startTime, {
      type: 'square',
      frequency: 180,
      endFrequency: 140,
      duration: 0.14,
      gain: 0.08,
      filterFrequency: 900,
    })
  },
  wordComplete: (ctx, destination, startTime) => {
    scheduleTone(ctx, destination, startTime, {
      type: 'sine',
      frequency: 1320,
      duration: 0.06,
      gain: 0.04,
    })
  },
  lessonSuccess: (ctx, destination, startTime) => {
    SUCCESS_NOTES.forEach((frequency, index) => {
      scheduleTone(ctx, destination, startTime + index * SUCCESS_SPACING, {
        type: 'triangle',
        frequency,
        duration: 0.26,
        gain: 0.12,
        filterFrequency: 4000,
      })
    })
  },
  lessonFailure: (ctx, destination, startTime) => {
    scheduleTone(ctx, destination, startTime, {
      type: 'sawtooth',
      frequency: 240,
      endFrequency: 110,
      duration: 0.6,
      gain: 0.1,
      filterFrequency: 1200,
    })
  },
  starEarned: (ctx, destination, startTime) => {
    scheduleTone(ctx, destination, startTime, {
      type: 'sine',
      frequency: 1046.5,
      endFrequency: 1568,
      duration: 0.12,
      gain: 0.08,
    })
  },
}

export function synthesizeSound(
  ctx: AudioContext,
  destination: AudioNode,
  name: SoundName,
  startTime: number,
): void {
  try {
    SOUNDS[name](ctx, destination, startTime)
  } catch {
    // Audio must never break gameplay.
  }
}
