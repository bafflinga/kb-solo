// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fingerFor, FINGER_MAP } from '../../domain/fingerMap'
import { getLayout } from '../../domain/layout'
import type { Finger } from '../../domain/types'
import { FingerGuide } from './FingerGuide'
import { HAND_FINGER_IDS } from './Hand'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

describe('FingerGuide', () => {
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

  async function renderGuide(finger?: Finger): Promise<void> {
    await act(async () => {
      root.render(<FingerGuide finger={finger} />)
    })
  }

  function fingerNode(finger: Finger): Element | null {
    return container.querySelector(`[data-finger="${finger}"]`)
  }

  function isActive(finger: Finger): boolean {
    return fingerNode(finger)?.getAttribute('data-active') === 'true'
  }

  it('renders two hands and every finger slot', async () => {
    await renderGuide()

    expect(
      container.querySelector('.finger-guide')?.getAttribute('aria-hidden'),
    ).toBe('true')
    expect(container.querySelectorAll('svg.hand')).toHaveLength(2)
    expect(container.querySelectorAll('[data-finger]')).toHaveLength(10)
    expect(new Set(HAND_FINGER_IDS)).toEqual(new Set(Object.values(FINGER_MAP)))
    for (const finger of HAND_FINGER_IDS) {
      expect(fingerNode(finger), finger).not.toBeNull()
    }
  })

  it('covers the finger of every key in the shipped layouts', () => {
    for (const layoutId of ['us-qwerty', 'ru-jcuken'] as const) {
      const layout = getLayout(layoutId)
      for (const code of Object.keys(layout.legends)) {
        const finger = fingerFor(code)
        expect(finger, `${layoutId}: ${code}`).toBeDefined()
        expect(HAND_FINGER_IDS).toContain(finger)
      }
    }
  })

  it('marks only the requested left finger', async () => {
    await renderGuide('li')

    expect(isActive('li')).toBe(true)
    expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1)
    expect(isActive('lp')).toBe(false)
    expect(isActive('ri')).toBe(false)
    expect(isActive('thumb')).toBe(false)
  })

  it('marks only the requested right finger', async () => {
    await renderGuide('rp')

    expect(isActive('rp')).toBe(true)
    expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1)
    expect(isActive('lp')).toBe(false)
    expect(isActive('thumb')).toBe(false)
  })

  it('marks both thumbs for the thumb finger', async () => {
    await renderGuide('thumb')

    expect(isActive('thumb')).toBe(true)
    expect(
      container.querySelectorAll('[data-finger="thumb"][data-active="true"]'),
    ).toHaveLength(2)
  })

  it('leaves every finger inactive without a next finger', async () => {
    await renderGuide()

    expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(0)
  })

  it('mirrors the right hand only', async () => {
    await renderGuide('ri')

    expect(
      container.querySelector('.hand-left g')?.getAttribute('transform'),
    ).toBeNull()
    expect(
      container.querySelector('.hand-right g')?.getAttribute('transform'),
    ).toBe('translate(120 0) scale(-1 1)')
  })

  it('keeps the four fingers parallel and only angles the thumb', async () => {
    await renderGuide('li')

    for (const finger of [
      'lp',
      'lr',
      'lm',
      'li',
      'rp',
      'rr',
      'rm',
      'ri',
    ] as const) {
      expect(fingerNode(finger)?.getAttribute('transform'), finger).toBeNull()
    }

    const thumbs = container.querySelectorAll('[data-finger="thumb"]')
    expect(thumbs).toHaveLength(2)
    for (const thumb of thumbs) {
      expect(thumb.getAttribute('transform')).toMatch(/^rotate\(55 /)
    }
  })

  it('puts the left thumb on the right side and mirrors the right hand', async () => {
    await renderGuide()

    const leftThumb = container.querySelector(
      '.hand-left [data-finger="thumb"]',
    )
    expect(Number(leftThumb?.getAttribute('x'))).toBeGreaterThan(60)
    expect(
      container.querySelector('.hand-right g')?.getAttribute('transform'),
    ).toBe('translate(120 0) scale(-1 1)')
  })

  it('orders finger lengths middle > ring > index > pinky', async () => {
    await renderGuide()

    const height = (finger: Finger) =>
      Number(fingerNode(finger)?.getAttribute('height'))

    expect(height('lm')).toBeGreaterThan(height('lr'))
    expect(height('lr')).toBeGreaterThan(height('li'))
    expect(height('li')).toBeGreaterThan(height('lp'))
    expect(height('lr') - height('li')).toBeGreaterThanOrEqual(2)
  })
})
