// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GenerationBadge } from './GenerationBadge'

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

describe('GenerationBadge', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    localStorage.setItem('kb-solo.settings', JSON.stringify({ locale: 'en' }))
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

  it('shows the resolved area and sentence source', async () => {
    await act(async () => {
      root.render(
        <GenerationBadge
          generation={{ areaId: 'commerce', sentenceSource: 'phrase' }}
        />,
      )
    })

    expect(container.querySelector('.generation-badge')?.textContent).toBe(
      'Generated · Commerce · Faker phrases',
    )
  })

  it('renders nothing without generation metadata', async () => {
    await act(async () => {
      root.render(<GenerationBadge />)
    })
    expect(container.querySelector('.generation-badge')).toBeNull()
  })
})
