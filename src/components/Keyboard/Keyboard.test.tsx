// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getLayout } from '../../domain/layout'
import { KeyCap } from './KeyCap'
import { Keyboard } from './Keyboard'
import { createKeyboardController } from './keyboardController'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

describe('Keyboard', () => {
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

  it('renders every ANSI key with the active layout legends', async () => {
    const controller = createKeyboardController()
    await act(async () => {
      root.render(
        <Keyboard
          layout={getLayout('ru-jcuken')}
          controller={controller}
          focusCodes={['Digit3']}
          labels={{ Tab: 'Tab' }}
        />,
      )
    })

    expect(
      container.querySelector('.keyboard')?.getAttribute('aria-hidden'),
    ).toBe('true')
    expect(container.querySelectorAll('.keycap')).toHaveLength(54)

    const digit3 = container.querySelector('[data-code="Digit3"]')
    expect(digit3?.textContent).toContain('3')
    expect(digit3?.textContent).toContain('№')
    expect(digit3?.getAttribute('data-focused')).toBe('true')
    expect(digit3?.getAttribute('data-state')).toBe('rest')
  })

  it('renders the ISO keys with a tall Enter', async () => {
    const controller = createKeyboardController()
    await act(async () => {
      root.render(
        <Keyboard
          layout={getLayout('ru-jcuken-mac-iso')}
          controller={controller}
        />,
      )
    })

    expect(container.querySelectorAll('.keycap')).toHaveLength(55)
    expect(
      container.querySelector('[data-code="IntlBackslash"]')?.textContent,
    ).toContain(']')
    expect(
      container.querySelector('[data-code="Enter"]')?.getAttribute('style'),
    ).toContain('span 2')
  })

  it('updates the next key imperatively without replacing the node', async () => {
    const controller = createKeyboardController()
    await act(async () => {
      root.render(
        <Keyboard layout={getLayout('us-qwerty')} controller={controller} />,
      )
    })

    const before = container.querySelector('[data-code="KeyA"]')
    act(() => {
      controller.setNextKey('KeyA', true)
    })
    const after = container.querySelector('[data-code="KeyA"]')

    expect(after).toBe(before)
    expect(after?.getAttribute('data-state')).toBe('next')
    expect(after?.getAttribute('data-shift')).toBe('active')
  })

  it('memoises the key cap so per-key updates do not re-render the board', () => {
    expect((KeyCap as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for('react.memo'),
    )
  })
})
