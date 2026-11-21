// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lessonsDb } from '../storage/lessonsDb'
import { ContentScreen } from './ContentScreen'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

describe('ContentScreen', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    localStorage.clear()
    await lessonsDb.removeOverride('en-home-left')
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

  async function render(): Promise<void> {
    await act(async () => {
      root.render(
        <ContentScreen
          language="en"
          layoutId="us-qwerty"
          onLayoutChange={vi.fn<() => void>()}
          version={0}
          onChange={vi.fn<() => void>()}
          notify={vi.fn<(message: string) => void>()}
        />,
      )
    })
  }

  it('lists lessons for the selected language and opens an editor', async () => {
    await render()

    expect(container.querySelector('.content-editor')).toBeNull()
    expect(
      container.querySelector('.content-editor-hint')?.textContent,
    ).toContain('Pick a lesson on the left')
    expect(container.querySelector('.content-columns')).not.toBeNull()
    expect(
      container.querySelector('.content-column-editor .content-editor-toolbar'),
    ).not.toBeNull()

    await act(async () => {
      ;(
        container.querySelector('.content-lesson-button') as HTMLButtonElement
      ).click()
    })

    expect(
      container.querySelector('.content-column-editor .content-editor'),
    ).not.toBeNull()
    expect(
      container.querySelector('.content-lesson-row.selected'),
    ).not.toBeNull()
  })

  it('opens the export/import dialog with two columns', async () => {
    await render()

    const transfer = [...container.querySelectorAll('button')].find(
      (element) => element.textContent === 'Export / import',
    )
    expect(transfer).toBeDefined()
    await act(async () => {
      transfer?.click()
    })

    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
    expect(container.querySelectorAll('.content-dialog-column')).toHaveLength(2)
    expect(container.querySelector('.content-import')).not.toBeNull()

    const close = container.querySelector<HTMLButtonElement>(
      '.content-dialog-close',
    )
    await act(async () => {
      close?.click()
    })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('marks edited lessons and switches the listed language', async () => {
    await lessonsDb.putOverride({
      id: 'en-home-left',
      document: { formatVersion: 1, variants: ['edited'] },
      updatedAt: 1,
    })
    await render()

    expect(container.querySelector('.content-edited')?.textContent).toBe(
      'Edited',
    )

    const select = container.querySelector('select')
    expect(select).toBeDefined()
    await act(async () => {
      if (select) {
        select.value = 'ru'
        select.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    expect(container.querySelector('.content-edited')).toBeNull()
    expect(container.querySelector('.content-lesson-row')).not.toBeNull()
  })
})
