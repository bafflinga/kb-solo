// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ErrorMode, EngineState } from '../../domain/engine'
import { createInitialState, engineReducer } from '../../domain/engine'
import { cueFromText, lineCues } from '../../domain/cues'
import { getLayout } from '../../domain/layout'
import type { Cue } from '../../domain/types'
import { TypingArea } from './TypingArea'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

const layout = getLayout('us-qwerty')

function start(cues: Cue[], errorMode: ErrorMode = 'block'): EngineState {
  let state = engineReducer(createInitialState({ layout, errorMode }), {
    type: 'START',
    cues,
    lessonId: 'test',
    layout,
    errorMode,
  })
  state = engineReducer(state, { type: 'COUNTDOWN_DONE' })
  return state
}

function typeKey(state: EngineState, code: string, char: string): EngineState {
  return engineReducer(state, {
    type: 'KEY',
    code,
    char,
    shift: false,
    alt: false,
  })
}

describe('TypingArea', () => {
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

  async function render(
    state: EngineState,
    feedback?: { id: number; kind: 'success' | 'error'; text: string },
    showFeedback = false,
  ): Promise<void> {
    await act(async () => {
      root.render(
        <TypingArea
          state={state}
          feedback={feedback}
          showFeedback={showFeedback}
        />,
      )
    })
  }

  it('marks done and pending characters', async () => {
    let state = start([cueFromText(layout, 'ab', 'word')])
    state = typeKey(state, 'KeyA', 'a')
    await render(state)

    const chars = container.querySelectorAll('.typing-char')
    expect(chars).toHaveLength(2)
    expect(chars[0]?.getAttribute('data-done')).toBe('true')
    expect(chars[0]?.getAttribute('data-pending')).toBe('false')
    expect(chars[1]?.getAttribute('data-pending')).toBe('true')
    expect(chars[1]?.getAttribute('data-done')).toBe('false')
  })

  it('shows a pending error in block mode', async () => {
    let state = start([cueFromText(layout, 'ab', 'word')])
    state = typeKey(state, 'KeyZ', 'z')
    await render(state)

    const first = container.querySelector('.typing-char')
    expect(first?.getAttribute('data-pending')).toBe('true')
    expect(first?.getAttribute('data-error')).toBe('true')
    expect(first?.textContent).toBe('a')
  })

  it('keeps the wrong character visible in advance mode', async () => {
    let state = start([cueFromText(layout, 'ab', 'word')], 'advance')
    state = typeKey(state, 'KeyZ', 'z')
    await render(state)

    const chars = container.querySelectorAll('.typing-char')
    expect(chars[0]?.getAttribute('data-done')).toBe('true')
    expect(chars[0]?.getAttribute('data-wrong')).toBe('true')
    expect(chars[0]?.getAttribute('data-error')).toBe('false')
    expect(chars[1]?.getAttribute('data-pending')).toBe('true')
    expect(chars[1]?.getAttribute('data-error')).toBe('false')
  })

  it('renders spaces without collapsing them', async () => {
    await render(start([cueFromText(layout, 'a b', 'word')]))

    const space = container.querySelector('[data-space="true"]')
    expect(space?.textContent).toBe('\u00a0')
  })

  it('renders a newline as a visible marker', async () => {
    let state = start(lineCues(layout, 'ab'))
    state = typeKey(state, 'KeyA', 'a')
    state = typeKey(state, 'KeyB', 'b')
    await render(state)

    const newline = container.querySelector('[data-newline="true"]')
    expect(newline?.textContent).toBe('↵')
    expect(newline?.getAttribute('data-pending')).toBe('true')
  })

  it('shows transient cue feedback when enabled', async () => {
    await render(
      start([cueFromText(layout, 'ab', 'word')]),
      { id: 1, kind: 'success', text: 'ab' },
      true,
    )

    const feedback = container.querySelector('.typing-feedback')
    expect(feedback?.textContent).toBe('ab')
    expect(feedback?.getAttribute('data-kind')).toBe('success')
  })

  it('hides cue feedback when disabled', async () => {
    await render(
      start([cueFromText(layout, 'ab', 'word')]),
      { id: 1, kind: 'success', text: 'ab' },
      false,
    )

    expect(container.querySelector('.typing-feedback')).toBeNull()
  })
})
