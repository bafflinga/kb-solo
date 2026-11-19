// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lessonsDb } from '../storage/lessonsDb'
import { ContentEditor } from './ContentEditor'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

describe('ContentEditor', () => {
  let container: HTMLDivElement
  let root: Root
  let onChange: ReturnType<typeof vi.fn<() => void>>
  let notify: ReturnType<typeof vi.fn<(message: string) => void>>

  beforeEach(async () => {
    localStorage.clear()
    await lessonsDb.removeOverride('en-home-left')
    await lessonsDb.removeOverride('en-home-right')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    onChange = vi.fn<() => void>()
    notify = vi.fn<(message: string) => void>()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  function button(label: string): HTMLButtonElement {
    const found = [...container.querySelectorAll('button')].find(
      (element) => element.textContent === label,
    )
    expect(found, label).toBeDefined()
    return found as HTMLButtonElement
  }

  function textareas(): HTMLTextAreaElement[] {
    return [...container.querySelectorAll('textarea')]
  }

  async function click(element: HTMLButtonElement): Promise<void> {
    await act(async () => {
      element.click()
    })
  }

  async function type(
    element: HTMLTextAreaElement,
    value: string,
  ): Promise<void> {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )?.set
    await act(async () => {
      setter?.call(element, value)
      element.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  async function render(id: string): Promise<void> {
    await act(async () => {
      root.render(
        <ContentEditor
          id={id}
          version={0}
          onChange={onChange}
          notify={notify}
        />,
      )
    })
  }

  it('adds, reorders and removes variants', async () => {
    await render('en-home-left')

    const initial = textareas().map((element) => element.value)
    expect(initial).toHaveLength(4)

    await click(button('Add variant'))
    expect(textareas()).toHaveLength(5)
    await type(textareas()[4] as HTMLTextAreaElement, 'asdf')

    const moveUp = [
      ...container.querySelectorAll<HTMLButtonElement>(
        'button[aria-label="Move up"]',
      ),
    ]
    await click(moveUp[4] as HTMLButtonElement)
    expect(textareas().map((element) => element.value)).toEqual([
      initial[0],
      initial[1],
      initial[2],
      'asdf',
      initial[3],
    ])

    const remove = container.querySelectorAll<HTMLButtonElement>(
      '.content-variant-actions button:last-child',
    )
    await click(remove[0] as HTMLButtonElement)
    expect(textareas().map((element) => element.value)).toEqual([
      initial[1],
      initial[2],
      'asdf',
      initial[3],
    ])
  })

  it('saves an override and resets it back to shipped content', async () => {
    await render('en-home-right')
    await type(textareas()[0] as HTMLTextAreaElement, 'jkl;')

    await click(button('Save'))

    expect(onChange).toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith('Content saved')
    expect(
      (await lessonsDb.getOverride('en-home-right'))?.document.variants[0],
    ).toBe('jkl;')

    await click(button('Reset to shipped'))

    expect(await lessonsDb.getOverride('en-home-right')).toBeUndefined()
    expect(notify).toHaveBeenCalledWith('Override removed')
  })

  it('skips forbidden keys while naming and highlighting the rejected one', async () => {
    await render('en-home-left')

    expect(
      container.querySelector('.content-focus-hint')?.textContent,
    ).toContain('a s d f')

    await type(textareas()[0] as HTMLTextAreaElement, 'asg')

    expect(textareas()[0]?.value).toBe('as')
    expect(container.querySelector('.content-variant.invalid')).not.toBeNull()
    expect(textareas()[0]?.getAttribute('aria-invalid')).toBe('true')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'g',
    )
    expect(button('Save').disabled).toBe(false)

    await type(textareas()[0] as HTMLTextAreaElement, 'asd')

    expect(container.querySelector('.content-variant.invalid')).toBeNull()
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('rejects an empty variant', async () => {
    await render('en-home-right')
    await type(textareas()[0] as HTMLTextAreaElement, '   ')

    await click(button('Save'))

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Check the variants',
    )
    expect(await lessonsDb.getOverride('en-home-right')).toBeUndefined()
  })
})
