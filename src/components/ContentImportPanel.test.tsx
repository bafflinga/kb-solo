// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PACK_FORMAT } from '../domain/lessons/contentStore'
import { lessonsDb } from '../storage/lessonsDb'
import { ContentImportPanel } from './ContentImportPanel'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

describe('ContentImportPanel', () => {
  let container: HTMLDivElement
  let root: Root
  let onChange: ReturnType<typeof vi.fn<() => void>>
  let notify: ReturnType<typeof vi.fn<(message: string) => void>>
  let onApplied: ReturnType<typeof vi.fn<() => void>>

  beforeEach(async () => {
    localStorage.clear()
    await lessonsDb.removeOverride('en-home-left')
    await lessonsDb.removeOverride('en-home-right')
    await lessonsDb.putOverride({
      id: 'en-home-right',
      document: { formatVersion: 1, variants: ['kj;'] },
      updatedAt: 1,
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    onChange = vi.fn<() => void>()
    notify = vi.fn<(message: string) => void>()
    onApplied = vi.fn<() => void>()
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

  async function click(element: HTMLElement): Promise<void> {
    await act(async () => {
      element.click()
    })
  }

  const pack = {
    format: PACK_FORMAT,
    formatVersion: 1,
    exportedAt: 1,
    description: 'evening edits',
    items: {
      'en-home-left': { formatVersion: 1, variants: ['asdf'] },
      'en-home-right': { formatVersion: 1, variants: ['jkl;'] },
    },
  }

  async function loadPack(): Promise<void> {
    await act(async () => {
      root.render(
        <ContentImportPanel
          version={0}
          onChange={onChange}
          notify={notify}
          onApplied={onApplied}
        />,
      )
    })
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).toBeDefined()
    const file = new File([JSON.stringify(pack)], 'pack.json', {
      type: 'application/json',
    })
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    })
    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  it('applies only selected items and keeps untouched overrides', async () => {
    await loadPack()

    const checkboxes = [
      ...container.querySelectorAll<HTMLInputElement>(
        '.content-import-item input[type="checkbox"]',
      ),
    ]
    expect(checkboxes).toHaveLength(3)
    expect(
      container.querySelector('.content-pack-summary')?.textContent,
    ).toContain('evening edits')
    expect(
      container.querySelector('.content-pack-summary')?.textContent,
    ).toContain('pack.json')
    await click(checkboxes[1] as HTMLInputElement)

    await click(button('Apply import'))

    expect(onChange).toHaveBeenCalled()
    expect(
      (await lessonsDb.getOverride('en-home-left'))?.document.variants,
    ).toEqual(['asdf'])
    expect(
      (await lessonsDb.getOverride('en-home-right'))?.document.variants,
    ).toEqual(['kj;'])
  })

  it('clears on a checked or partial header box, selects from empty', async () => {
    await loadPack()

    const selectionBoxes = () => [
      ...container.querySelectorAll<HTMLInputElement>(
        '.content-import-item > label:first-child input[type="checkbox"]',
      ),
    ]
    const selectAll = () =>
      container.querySelector<HTMLInputElement>(
        '.content-select-all-row input[type="checkbox"]',
      )

    expect(selectionBoxes().every((input) => input.checked)).toBe(true)
    expect(selectAll()?.checked).toBe(true)

    await click(selectionBoxes()[0] as HTMLInputElement)
    expect(selectAll()?.indeterminate).toBe(true)
    await click(selectAll() as HTMLInputElement)
    expect(selectionBoxes().every((input) => input.checked)).toBe(false)

    await click(selectAll() as HTMLInputElement)
    expect(selectionBoxes().every((input) => input.checked)).toBe(true)
  })

  it('previews incoming variants against current content', async () => {
    await loadPack()
    await act(async () => {})

    const details =
      container.querySelector<HTMLDetailsElement>('.content-preview')
    expect(details).not.toBeNull()
    await act(async () => {
      if (details) {
        details.open = true
      }
    })

    expect(details?.textContent).toContain('Incoming')
    expect(details?.textContent).toContain('Current')
    expect(details?.textContent).toContain('1. asdf')
    expect(details?.textContent).toContain('Changed')

    const raw = details?.querySelector<HTMLDetailsElement>(
      '.content-preview-raw',
    )
    await act(async () => {
      if (raw) {
        raw.open = true
      }
    })
    expect(raw?.textContent).toContain('"formatVersion"')
  })

  it('overwrites an existing override only when approved', async () => {
    await loadPack()

    const overwrite = [
      ...container.querySelectorAll<HTMLInputElement>(
        '.content-import-item input[type="checkbox"]',
      ),
    ].find(
      (input) => input.parentElement?.textContent === 'Overwrite existing edit',
    )
    expect(overwrite).toBeDefined()
    await click(overwrite as HTMLInputElement)

    await click(button('Apply import'))

    expect(
      (await lessonsDb.getOverride('en-home-right'))?.document.variants,
    ).toEqual(['jkl;'])
    expect(notify).toHaveBeenCalledWith('Imported 2, conflicts 0')
    expect(onApplied).toHaveBeenCalledOnce()
  })
})
