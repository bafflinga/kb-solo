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

function wordCuesFor(...words: string[]): Cue[] {
  return words.map((word) => cueFromText(layout, word, 'word'))
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
    showFeedback = false,
  ): Promise<void> {
    await act(async () => {
      root.render(<TypingArea state={state} showFeedback={showFeedback} />)
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
    expect(space?.textContent).toBe(' ')
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

  it('renders the current cue with five dimmed upcoming cues', async () => {
    const cues = wordCuesFor('a', 'b', 'c', 'd', 'e', 'f', 'g')
    await render(start(cues))

    const slots = container.querySelectorAll('.cue-slot')
    expect(
      Array.from(slots).map((slot) => slot.getAttribute('data-slot')),
    ).toEqual(['0', '1', '2', '3', '4', '5'])
    expect(
      Array.from(slots).map((slot) => slot.getAttribute('data-state')),
    ).toEqual(['active', 'future', 'future', 'future', 'future', 'future'])
    expect(
      Array.from(slots).map((slot) => slot.getAttribute('aria-hidden')),
    ).toEqual([null, 'true', 'true', 'true', 'true', 'true'])
    expect(container.querySelectorAll('.typing-char')).toHaveLength(1)
  })

  it('keeps completed cues in place with their text footprint', async () => {
    const cues = wordCuesFor('ab', 'cd', 'ef')
    let state = start(cues)
    await render(state)
    state = typeKey(state, 'KeyA', 'a')
    state = typeKey(state, 'KeyB', 'b')
    await render(state)

    const slots = container.querySelectorAll('.cue-slot')
    expect(slots).toHaveLength(3)
    expect(slots[0]?.getAttribute('data-state')).toBe('done')
    expect(slots[0]?.getAttribute('data-slot')).toBe('-1')
    expect(slots[0]?.textContent).toBe('ab')
    expect(slots[1]?.getAttribute('data-state')).toBe('active')
    expect(slots[1]?.getAttribute('data-slot')).toBe('0')
    expect(slots[1]?.textContent).toBe('cd')
  })

  it('renders line cues as their own block ending with the newline marker', async () => {
    await render(start(lineCues(layout, 'ab\ncd')))

    const slots = container.querySelectorAll('.cue-slot')
    expect(slots).toHaveLength(2)
    expect(slots[0]?.getAttribute('data-kind')).toBe('line')
    expect(slots[1]?.getAttribute('data-kind')).toBe('line')
    expect(slots[0]?.textContent).toBe('ab↵')
  })

  it('does not overflow the window at the end of the lesson', async () => {
    const cues = wordCuesFor('ab', 'cd')
    let state = start(cues)
    state = typeKey(state, 'KeyA', 'a')
    state = typeKey(state, 'KeyB', 'b')
    state = typeKey(state, 'KeyC', 'c')
    state = typeKey(state, 'KeyD', 'd')
    await render(state)

    const slots = container.querySelectorAll('.cue-slot')
    expect(slots).toHaveLength(2)
    expect(slots[0]?.getAttribute('data-slot')).toBe('-1')
    expect(slots[1]?.getAttribute('data-slot')).toBe('0')
  })

  it('flashes the completed cue when feedback is enabled', async () => {
    const cues = wordCuesFor('a', 'b')
    let state = start(cues)
    await render(state, true)
    state = typeKey(state, 'KeyA', 'a')
    await render(state, true)

    const leaving = container.querySelector('[data-slot="-1"]')
    expect(leaving?.getAttribute('data-flash-kind')).toBe('success')
    expect(leaving?.textContent).toBe('a')
  })

  it('does not flash the completed cue when feedback is disabled', async () => {
    const cues = wordCuesFor('a', 'b')
    let state = start(cues)
    await render(state)
    state = typeKey(state, 'KeyA', 'a')
    await render(state)

    expect(container.querySelector('[data-flash-kind]')).toBeNull()
  })

  it('flashes red when the completed cue had an error', async () => {
    const cues = wordCuesFor('a', 'b')
    let state = start(cues, 'advance')
    await render(state, true)
    state = typeKey(state, 'KeyZ', 'z')
    await render(state, true)

    const leaving = container.querySelector('[data-slot="-1"]')
    expect(leaving?.getAttribute('data-flash-kind')).toBe('error')
  })
})
