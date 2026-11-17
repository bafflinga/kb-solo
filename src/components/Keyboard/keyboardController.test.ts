import { describe, expect, it } from 'vitest'
import { createKeyboardController } from './keyboardController'
import type { KeyElement } from './keyboardController'

function element(): KeyElement {
  return { dataset: {} as DOMStringMap }
}

describe('keyboard controller', () => {
  it('writes key states onto attached elements', () => {
    const controller = createKeyboardController()
    const cap = element()
    controller.attach('KeyA', cap)

    controller.setKeyState('KeyA', 'error')
    expect(cap.dataset.state).toBe('error')
    expect(controller.getKeyState('KeyA')).toBe('error')
  })

  it('marks the next key and resets the previous one', () => {
    const controller = createKeyboardController()
    const first = element()
    const second = element()
    controller.attach('KeyA', first)
    controller.attach('KeyB', second)

    controller.setNextKey('KeyA', true)
    expect(first.dataset.state).toBe('next')
    expect(first.dataset.shift).toBe('active')

    controller.setNextKey('KeyB', false)
    expect(first.dataset.state).toBe('rest')
    expect(first.dataset.shift).toBe('inactive')
    expect(second.dataset.state).toBe('next')
    expect(second.dataset.shift).toBe('inactive')
  })

  it('clears every state and shift flag', () => {
    const controller = createKeyboardController()
    const cap = element()
    controller.attach('KeyA', cap)
    controller.setNextKey('KeyA', true)
    controller.setKeyState('KeyB', 'pressed')

    controller.clearKeyStates()
    expect(cap.dataset.state).toBe('rest')
    expect(cap.dataset.shift).toBe('inactive')
    expect(controller.getKeyState('KeyA')).toBe('rest')
    expect(controller.getKeyState('KeyB')).toBe('rest')
  })

  it('defaults unknown codes to rest and tolerates missing elements', () => {
    const controller = createKeyboardController()
    expect(controller.getKeyState('KeyZ')).toBe('rest')
    controller.setKeyState('KeyZ', 'next')
    expect(controller.getKeyState('KeyZ')).toBe('next')
    controller.attach('KeyZ', null)
    controller.setNextKey('KeyZ', true)
  })
})
