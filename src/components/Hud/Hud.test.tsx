// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cueFromText } from '../../domain/cues'
import type { EngineState } from '../../domain/engine'
import {
  createInitialState,
  engineReducer,
  scoreFor,
} from '../../domain/engine'
import { getLayout } from '../../domain/layout'
import { Hud } from './Hud'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

const layout = getLayout('us-qwerty')

function start(): EngineState {
  let state = engineReducer(createInitialState({ layout }), {
    type: 'START',
    cues: [cueFromText(layout, 'ab', 'word')],
    lessonId: 'test',
    layout,
  })
  state = engineReducer(state, { type: 'COUNTDOWN_DONE' })
  return state
}

function press(state: EngineState, code: string, char: string): EngineState {
  return engineReducer(state, {
    type: 'KEY',
    code,
    char,
    shift: false,
    alt: false,
  })
}

describe('Hud', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  async function render(state: EngineState, liveWpm: number): Promise<void> {
    await act(async () => {
      root.render(
        <Hud state={state} score={scoreFor(state)} liveWpm={liveWpm} />,
      )
    })
  }

  function stat(label: string): string | null | undefined {
    const item = [...container.querySelectorAll('.hud-stat')].find(
      (node) => node.querySelector('dt')?.textContent === label,
    )
    return item?.querySelector('dd')?.textContent
  }

  it('shows live speed, accuracy, time and progress', async () => {
    let state = start()
    state = press(state, 'KeyA', 'a')
    state = engineReducer(state, { type: 'TICK', elapsedMs: 30000 })
    await render(state, 42)

    expect(stat('WPM')).toBe('42')
    expect(stat('Accuracy')).toBe('100%')
    expect(stat('Time')).toBe('0:30')
    expect(stat('Errors')).toBe('0')

    const progress = container.querySelector('[role="progressbar"]')
    expect(progress?.getAttribute('aria-valuemin')).toBe('0')
    expect(progress?.getAttribute('aria-valuemax')).toBe('1')
    expect(progress?.getAttribute('aria-valuenow')).toBe('0')
    expect(progress?.getAttribute('aria-valuetext')).toBe('0 / 1')
  })

  it('shows the final score and errors when the lesson ends', async () => {
    let state = start()
    state = press(state, 'KeyZ', 'z')
    state = press(state, 'KeyA', 'a')
    state = engineReducer(state, { type: 'TICK', elapsedMs: 60000 })
    state = press(state, 'KeyB', 'b')
    await render(state, 99)

    expect(state.status).toBe('success')
    expect(stat('WPM')).toBe('0')
    expect(stat('Accuracy')).toBe('67%')
    expect(stat('Time')).toBe('1:00')
    expect(stat('Errors')).toBe('1')
    expect(
      container
        .querySelector('[role="progressbar"]')
        ?.getAttribute('aria-valuenow'),
    ).toBe('1')
  })
})
