import type { Code } from '../../domain/types'
import type { KeyState } from './keyboardModel'

export interface KeyElement {
  dataset: DOMStringMap
}

export interface KeyboardController {
  attach(code: Code, element: KeyElement | null): void
  setKeyState(code: Code, state: KeyState): void
  setNextKey(code: Code | undefined, needsShift: boolean): void
  clearKeyStates(): void
  getKeyState(code: Code): KeyState
}

export function createKeyboardController(): KeyboardController {
  const elements = new Map<Code, KeyElement>()
  const states = new Map<Code, KeyState>()
  let next: Code | undefined

  function write(code: Code, state: KeyState): void {
    states.set(code, state)
    const element = elements.get(code)
    if (element) {
      element.dataset.state = state
    }
  }

  function writeShift(code: Code, shift: 'active' | 'inactive'): void {
    const element = elements.get(code)
    if (element) {
      element.dataset.shift = shift
    }
  }

  return {
    attach(code, element) {
      if (!element) {
        elements.delete(code)
        return
      }
      elements.set(code, element)
      const state = states.get(code)
      if (state) {
        element.dataset.state = state
      }
    },
    setKeyState(code, state) {
      write(code, state)
    },
    setNextKey(code, needsShift) {
      if (next !== undefined && next !== code) {
        write(next, 'rest')
        writeShift(next, 'inactive')
      }
      next = code
      if (code === undefined) {
        return
      }
      write(code, 'next')
      writeShift(code, needsShift ? 'active' : 'inactive')
    },
    clearKeyStates() {
      for (const code of states.keys()) {
        states.delete(code)
      }
      for (const element of elements.values()) {
        element.dataset.state = 'rest'
        element.dataset.shift = 'inactive'
      }
      next = undefined
    },
    getKeyState(code) {
      return states.get(code) ?? 'rest'
    },
  }
}
