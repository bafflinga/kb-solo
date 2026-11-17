export interface FakeParamEvent {
  kind: 'set' | 'linear' | 'exp'
  value: number
  time: number
}

export class FakeParam {
  value = 0
  events: FakeParamEvent[] = []

  setValueAtTime(value: number, time: number): this {
    this.value = value
    this.events.push({ kind: 'set', value, time })
    return this
  }

  linearRampToValueAtTime(value: number, time: number): this {
    this.value = value
    this.events.push({ kind: 'linear', value, time })
    return this
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    this.value = value
    this.events.push({ kind: 'exp', value, time })
    return this
  }
}

export class FakeOscillator {
  type: OscillatorType = 'sine'
  frequency = new FakeParam()
  connect(): void {}
  start(): void {}
  stop(): void {}
}

export class FakeGain {
  gain = new FakeParam()
  connect(): void {}
}

export class FakeFilter {
  type: BiquadFilterType = 'lowpass'
  frequency = new FakeParam()
  connect(): void {}
}

export class FakeAudioContext {
  state: AudioContextState = 'suspended'
  currentTime = 0
  destination: unknown = {}
  oscillators: FakeOscillator[] = []
  gains: FakeGain[] = []
  filters: FakeFilter[] = []
  resumeCalls = 0

  createOscillator(): FakeOscillator {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  }

  createGain(): FakeGain {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }

  createBiquadFilter(): FakeFilter {
    const filter = new FakeFilter()
    this.filters.push(filter)
    return filter
  }

  async resume(): Promise<void> {
    this.resumeCalls += 1
    this.state = 'running'
  }

  asContext(): AudioContext {
    return this as unknown as AudioContext
  }

  asDestination(): AudioNode {
    return this.destination as AudioNode
  }
}
