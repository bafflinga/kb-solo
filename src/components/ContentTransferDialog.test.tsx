// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lessonsFor } from '../domain/lessons/registry'
import { ContentTransferDialog } from './ContentTransferDialog'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

describe('ContentTransferDialog', () => {
  let container: HTMLDivElement
  let root: Root
  let onToggleExport: ReturnType<typeof vi.fn<(id: string) => void>>
  let onSetExport: ReturnType<
    typeof vi.fn<(ids: readonly string[], selected: boolean) => void>
  >
  let onDownload: ReturnType<
    typeof vi.fn<(ids: readonly string[], description: string) => void>
  >
  let onClose: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    onToggleExport = vi.fn<(id: string) => void>()
    onSetExport = vi.fn<(ids: readonly string[], selected: boolean) => void>()
    onDownload = vi.fn<(ids: readonly string[], description: string) => void>()
    onClose = vi.fn<() => void>()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  async function render(
    exportIds: ReadonlySet<string> = new Set(['en-home-left']),
  ): Promise<void> {
    await act(async () => {
      root.render(
        <ContentTransferDialog
          language="en"
          exportIds={exportIds}
          editedIds={new Set(['en-home-right'])}
          version={0}
          onChange={vi.fn<() => void>()}
          notify={vi.fn<(message: string) => void>()}
          onToggleExport={onToggleExport}
          onSetExport={onSetExport}
          onDownload={onDownload}
          onClose={onClose}
        />,
      )
    })
  }

  function button(label: string): HTMLButtonElement {
    const found = [...container.querySelectorAll('button')].find(
      (element) => element.textContent === label,
    )
    expect(found, label).toBeDefined()
    return found as HTMLButtonElement
  }

  it('shows export and import side by side', async () => {
    await render()

    expect(container.querySelectorAll('.content-dialog-column')).toHaveLength(2)
    expect(
      container.querySelectorAll('.content-transfer-list li'),
    ).toHaveLength(31)
    expect(container.querySelector('.content-import')).not.toBeNull()
    expect(document.activeElement).toBe(
      container.querySelector('.content-dialog-close'),
    )
  })

  it('clears on any partial or full selection, selects only from empty', async () => {
    await render()

    const selectAll = container.querySelector<HTMLInputElement>(
      '.content-select-all-row input[type="checkbox"]',
    )
    expect(selectAll?.checked).toBe(false)
    expect(selectAll?.indeterminate).toBe(true)

    await act(async () => {
      selectAll?.click()
    })
    expect(onSetExport).toHaveBeenLastCalledWith(
      expect.arrayContaining(['en-home-left']),
      false,
    )
    expect(onSetExport.mock.calls[0]?.[0]).toHaveLength(31)

    await render(new Set(lessonsFor('en').map((meta) => meta.id)))
    const checkedAll = container.querySelector<HTMLInputElement>(
      '.content-select-all-row input[type="checkbox"]',
    )
    expect(checkedAll?.checked).toBe(true)
    await act(async () => {
      checkedAll?.click()
    })
    expect(onSetExport).toHaveBeenLastCalledWith(
      expect.arrayContaining(['en-home-left']),
      false,
    )

    await render(new Set())
    const empty = container.querySelector<HTMLInputElement>(
      '.content-select-all-row input[type="checkbox"]',
    )
    await act(async () => {
      empty?.click()
    })
    expect(onSetExport).toHaveBeenLastCalledWith(
      expect.arrayContaining(['en-home-left']),
      true,
    )
  })

  it('toggles selection and downloads only the requested lessons', async () => {
    await render()

    const checkbox = container.querySelector<HTMLInputElement>(
      '.content-transfer-list input[type="checkbox"]',
    )
    expect(checkbox?.checked).toBe(true)
    await act(async () => {
      checkbox?.click()
    })
    expect(onToggleExport).toHaveBeenCalledWith(expect.stringMatching(/^en-/))

    await act(async () => {
      button('Export selected').click()
    })
    expect(onDownload).toHaveBeenCalledWith(['en-home-left'], '')
    expect(onClose).toHaveBeenCalledTimes(1)

    const description =
      container.querySelector<HTMLInputElement>('input[type="text"]')
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(description, 'evening edits')
      description?.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      button('Export edited only').click()
    })
    expect(onDownload).toHaveBeenLastCalledWith(
      ['en-home-right'],
      'evening edits',
    )
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('closes on Escape and on backdrop click', async () => {
    await render()

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)

    await act(async () => {
      container
        .querySelector('.content-dialog-backdrop')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
