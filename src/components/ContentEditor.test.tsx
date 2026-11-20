// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LayoutId } from '../domain/types'
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
    await lessonsDb.removeOverride('ru-pinky-top')
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

  async function render(
    id: string,
    layoutId: LayoutId = 'us-qwerty',
    onLayoutChange = vi.fn<(next: LayoutId) => void>(),
  ): Promise<void> {
    await act(async () => {
      root.render(
        <ContentEditor
          id={id}
          version={0}
          layoutId={layoutId}
          onLayoutChange={onLayoutChange}
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

  it('shows focus keys for the selected layout', async () => {
    await render('ru-pinky-top', 'ru-jcuken')

    const winHint =
      container.querySelector('.content-focus-hint')?.textContent ?? ''
    expect(winHint).not.toContain('ё')
    expect(winHint).toContain('\\')

    await render('ru-pinky-top', 'ru-jcuken-mac-iso')

    const isoHint =
      container.querySelector('.content-focus-hint')?.textContent ?? ''
    expect(isoHint).not.toContain('ё')
    expect(isoHint).not.toContain('\\')
    expect(container.textContent).toContain('shared variants')

    await render('ru-pinky-top', 'ru-jcuken-mac')
    const macHint =
      container.querySelector('.content-focus-hint')?.textContent ?? ''
    expect(macHint.split('ё').length - 1).toBe(1)
  })

  it('shows the selected layout symbols as current values', async () => {
    await render('ru-bottom-right', 'ru-jcuken')
    expect(textareas()[0]?.value).toBe('ть б. ю, ьт .б тю ,ь тьб ю.')
    expect(container.textContent).toContain('layout-specific variants')

    await render('ru-bottom-right', 'ru-jcuken-mac')
    expect(textareas()[0]?.value).toBe('ть б/ ю/ ьт /б тю /ь тьб ю/')
    expect(container.textContent).toContain('shared variants')

    await render('ru-bottom-right', 'ru-jcuken-mac-iso')
    expect(textareas()[0]?.value).toBe('ть б/ ю/ ьт /б тю /ь тьб ю/')
  })

  it('lets the user switch layout from the editor header', async () => {
    const onLayoutChange = vi.fn<(next: LayoutId) => void>()
    await render('ru-pinky-top', 'ru-jcuken', onLayoutChange)

    const select = container.querySelector(
      '.content-layout-row select',
    ) as HTMLSelectElement
    expect(select.value).toBe('ru-jcuken')

    await act(async () => {
      select.value = 'ru-jcuken-mac-iso'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(onLayoutChange).toHaveBeenCalledWith('ru-jcuken-mac-iso')
  })

  it('saves layout-specific content for the selected layout', async () => {
    await render('ru-pinky-top', 'ru-jcuken-mac-iso')
    const original = textareas()[0]?.value ?? ''

    await type(textareas()[0] as HTMLTextAreaElement, `${original} й`)
    await click(button('Save'))

    const override = await lessonsDb.getOverride('ru-pinky-top')
    expect(override?.document.canonicalLayout).toBe('ru-jcuken')
    expect(
      String(
        override?.document.layoutVariants?.['ru-jcuken-mac-iso']?.[0],
      ).endsWith(' й'),
    ).toBe(true)
    expect(override?.document.variants).not.toEqual(
      override?.document.layoutVariants?.['ru-jcuken-mac-iso'],
    )
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
