// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setMuted } from '../audio/audio'
import { flushProgress } from '../storage/progress'
import AppShell from './AppShell'

vi.mock('../audio/audio', () => ({
  play: vi.fn(),
  setMuted: vi.fn(),
  unlockAudio: vi.fn().mockResolvedValue(undefined),
  isMuted: vi.fn(),
}))

vi.mock('./PwaUpdatePrompt', () => ({
  default: () => null,
}))

vi.mock('../domain/lessons/fakerGenerator', () => ({
  loadFaker: async () => ({}),
  generateText: () => ({
    areaId: 'commerce',
    sentenceSource: 'lorem',
    words: ['alpha', 'beta', 'gamma'],
    sentences: 'Alpha beta gamma.',
  }),
}))

const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
scope.IS_REACT_ACT_ENVIRONMENT = true

function selectWithOption(
  container: HTMLElement,
  value: string,
): HTMLSelectElement | undefined {
  return [...container.querySelectorAll('select')].find((element) =>
    [...element.options].some((option) => option.value === value),
  )
}

async function choose(
  container: HTMLElement,
  optionValue: string,
): Promise<void> {
  const select = selectWithOption(container, optionValue)
  expect(select, optionValue).toBeDefined()
  await act(async () => {
    if (select) {
      select.value = optionValue
      select.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
}

describe('AppShell', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.useRealTimers()
  })

  it('shows content cache status as a transient toast instead of a header label', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    expect(container.querySelector('.content-status')).toBeNull()
    expect(container.querySelector('.content-toast')?.textContent).toContain(
      'Content cached',
    )
    expect(
      [...container.querySelectorAll('.app-nav a')].some(
        (link) => link.getAttribute('href') === '#/content',
      ),
    ).toBe(false)
  })

  it('shows the content editor menu item only when the setting is enabled', async () => {
    localStorage.setItem(
      'kb-solo.settings',
      JSON.stringify({ showContentEditor: true }),
    )

    await act(async () => {
      root.render(<AppShell />)
    })

    expect(
      [...container.querySelectorAll('.app-nav a')].some(
        (link) => link.getAttribute('href') === '#/content',
      ),
    ).toBe(true)
  })

  it('renders the menu with the keyboard board', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    expect(container.textContent).toContain('KB Solo')
    expect(container.querySelectorAll('.keycap')).toHaveLength(54)
    expect(
      container.querySelector('.keyboard')?.getAttribute('aria-hidden'),
    ).toBe('true')
  })

  it('previews the used keys on lesson hover and clears them on leave', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    const button =
      container.querySelectorAll<HTMLButtonElement>('.lesson-button')[0]
    const focused = (code: string) =>
      container
        .querySelector(`.keycap[data-code="${code}"]`)
        ?.getAttribute('data-focused')

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    expect(focused('KeyA')).toBe('true')
    expect(focused('KeyJ')).toBe('false')

    await act(async () => {
      button?.dispatchEvent(
        new MouseEvent('mouseout', {
          bubbles: true,
          relatedTarget: document.body,
        }),
      )
    })
    expect(focused('KeyA')).toBe('false')
  })

  it('previews keys for locked lessons too', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    const button =
      container.querySelectorAll<HTMLButtonElement>('.lesson-button')[1]
    expect(button?.getAttribute('aria-disabled')).toBe('true')

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    expect(
      container
        .querySelector('.keycap[data-code="KeyJ"]')
        ?.getAttribute('data-focused'),
    ).toBe('true')
    expect(
      container
        .querySelector('.keycap[data-code="KeyA"]')
        ?.getAttribute('data-focused'),
    ).toBe('false')
  })

  it('previews Russian word keys on lesson hover', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })
    await choose(container, 'ru')

    const button = [
      ...container.querySelectorAll<HTMLButtonElement>('.lesson-button'),
    ].find((element) => element.textContent?.includes('Common words'))
    expect(button).toBeDefined()

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    expect(
      container.querySelectorAll('.keycap[data-focused="true"]').length,
    ).toBeGreaterThan(0)
  })

  it('syncs the sound setting to the audio engine', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    expect(vi.mocked(setMuted)).toHaveBeenCalledWith(false)

    const sound = [
      ...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
    ].find((input) => input.parentElement?.textContent?.includes('Sound'))
    expect(sound).toBeDefined()

    await act(async () => {
      sound?.click()
    })

    expect(vi.mocked(setMuted)).toHaveBeenLastCalledWith(true)
  })

  it('resolves conflicting template settings in favour of generated content', async () => {
    localStorage.setItem(
      'kb-solo.settings',
      JSON.stringify({ generatedContent: true, randomTemplates: true }),
    )

    await act(async () => {
      root.render(<AppShell />)
    })

    const checkbox = (label: string) =>
      [
        ...container.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"]',
        ),
      ].find((input) => input.parentElement?.textContent?.includes(label))
    expect(checkbox('Generated content')?.checked).toBe(true)
    expect(checkbox('Random templates')?.checked).toBe(false)
  })

  it('switches the interface language and persists it', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    const russian = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'RU',
    )
    expect(russian).toBeDefined()

    await act(async () => {
      russian?.click()
    })

    expect(document.documentElement.lang).toBe('ru')
    expect(container.textContent).toContain('Меню')
    expect(localStorage.getItem('kb-solo.settings')).toContain('"locale":"ru"')
  })

  it('re-renders every screen immediately when the UI language changes', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    // 'Select a lesson to start' is rendered by LessonPicker's own useI18n.
    expect(container.textContent).toContain('Select a lesson to start')

    const russian = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'RU',
    )
    await act(async () => {
      russian?.click()
    })

    expect(container.textContent).toContain('Выберите урок, чтобы начать')
    expect(document.documentElement.lang).toBe('ru')
  })

  it('switches to the Mac ANSI Russian layout and persists it', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    await choose(container, 'ru')
    await choose(container, 'ru-jcuken-mac')

    expect(
      container.querySelector('[data-code="Backquote"]')?.textContent,
    ).toContain(']')
    expect(
      container.querySelector('[data-code="Backslash"]')?.textContent,
    ).toContain('ё')
    expect(container.querySelectorAll('.keycap')).toHaveLength(54)
    expect(localStorage.getItem('kb-solo.settings')).toContain(
      '"layoutId":"ru-jcuken-mac"',
    )
  })

  it('switches to the Mac ISO Russian layout and persists it', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    await choose(container, 'ru')
    await choose(container, 'ru-jcuken-mac-iso')

    expect(container.querySelectorAll('.keycap')).toHaveLength(55)
    expect(
      container.querySelector('[data-code="Backquote"]')?.textContent,
    ).toContain('>')
    expect(
      container.querySelector('[data-code="Backslash"]')?.textContent,
    ).toContain('ё')
    expect(
      container.querySelector('[data-code="IntlBackslash"]')?.textContent,
    ).toContain(']')
    expect(
      container.querySelector('[data-code="Enter"]')?.getAttribute('style'),
    ).toContain('span 2')
    expect(localStorage.getItem('kb-solo.settings')).toContain(
      '"layoutId":"ru-jcuken-mac-iso"',
    )
  })

  it('keeps the keyboard profile when switching content language', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    await choose(container, 'us-qwerty-mac-iso')
    expect(container.querySelectorAll('.keycap')).toHaveLength(55)

    await choose(container, 'ru')

    expect(localStorage.getItem('kb-solo.settings')).toContain(
      '"layoutId":"ru-jcuken-mac-iso"',
    )
    expect(
      container.querySelector('[data-code="IntlBackslash"]')?.textContent,
    ).toContain(']')
  })

  it('applies the selected Mac ANSI layout to Russian lessons', async () => {
    localStorage.setItem(
      'kb-solo.settings',
      JSON.stringify({
        locale: 'en',
        contentLanguage: 'ru',
        layoutId: 'ru-jcuken-mac',
      }),
    )
    window.location.hash = '#/lesson/ru-pinky-home-bottom'

    await act(async () => {
      root.render(<AppShell />)
    })

    expect(
      container.querySelector('[data-code="Backslash"]')?.textContent,
    ).toContain('ё')
    expect(
      container
        .querySelector('[data-code="Semicolon"]')
        ?.getAttribute('data-focused'),
    ).toBe('true')
    expect(
      container
        .querySelector('[data-code="Backslash"]')
        ?.getAttribute('data-focused'),
    ).toBe('false')
  })

  it('does not ring Backslash on RU Windows for ru-pinky-home-bottom', async () => {
    localStorage.setItem(
      'kb-solo.settings',
      JSON.stringify({
        locale: 'en',
        contentLanguage: 'ru',
        layoutId: 'ru-jcuken',
      }),
    )
    window.location.hash = '#/lesson/ru-pinky-home-bottom'

    await act(async () => {
      root.render(<AppShell />)
    })

    expect(
      container
        .querySelector('[data-code="Semicolon"]')
        ?.getAttribute('data-focused'),
    ).toBe('true')
    expect(
      container
        .querySelector('[data-code="Backslash"]')
        ?.getAttribute('data-focused'),
    ).toBe('false')
  })

  it('rings the ОЛДЖ home keys (ж, not д) on the RU Mac ISO lesson', async () => {
    localStorage.setItem(
      'kb-solo.settings',
      JSON.stringify({
        locale: 'en',
        contentLanguage: 'ru',
        layoutId: 'ru-jcuken-mac-iso',
      }),
    )
    window.location.hash = '#/lesson/ru-home-right'

    await act(async () => {
      root.render(<AppShell />)
    })

    const focused = (code: string) =>
      container
        .querySelector(`[data-code="${code}"]`)
        ?.getAttribute('data-focused')

    for (const code of ['KeyJ', 'KeyK', 'KeyL', 'Semicolon']) {
      expect(focused(code), code).toBe('true')
    }
    expect(focused('KeyH'), 'KeyH (р)').toBe('false')
    expect(
      container.querySelector('[data-code="Semicolon"]')?.textContent,
    ).toContain('ж')
  })

  it('applies the selected Mac ISO layout to Russian lessons', async () => {
    localStorage.setItem(
      'kb-solo.settings',
      JSON.stringify({
        locale: 'en',
        contentLanguage: 'ru',
        layoutId: 'ru-jcuken-mac-iso',
      }),
    )
    window.location.hash = '#/lesson/ru-pinky-home-bottom'

    await act(async () => {
      root.render(<AppShell />)
    })

    expect(container.querySelectorAll('.keycap')).toHaveLength(55)
    expect(
      container.querySelector('[data-code="Backslash"]')?.textContent,
    ).toContain('ё')
    expect(
      container
        .querySelector('[data-code="Semicolon"]')
        ?.getAttribute('data-focused'),
    ).toBe('true')
    expect(
      container
        .querySelector('[data-code="Backslash"]')
        ?.getAttribute('data-focused'),
    ).toBe('true')
    expect(
      container.querySelector('.finger-guide')?.getAttribute('aria-hidden'),
    ).toBe('true')
    const activeFinger = container
      .querySelector('.finger-guide [data-active="true"]')
      ?.getAttribute('data-finger')
    expect(['lp', 'rp']).toContain(activeFinger)
    expect(
      container.querySelectorAll('.finger-guide [data-active="true"]'),
    ).toHaveLength(1)
  })

  it('rings only top-row pinky keys on RU Mac ISO for ru-pinky-top', async () => {
    localStorage.setItem(
      'kb-solo.settings',
      JSON.stringify({
        locale: 'en',
        contentLanguage: 'ru',
        layoutId: 'ru-jcuken-mac-iso',
      }),
    )
    window.location.hash = '#/lesson/ru-pinky-top'

    await act(async () => {
      root.render(<AppShell />)
    })

    const focused = (code: string) =>
      container
        .querySelector(`[data-code="${code}"]`)
        ?.getAttribute('data-focused')
    for (const code of ['KeyQ', 'KeyP', 'BracketLeft', 'BracketRight']) {
      expect(focused(code), code).toBe('true')
    }
    expect(focused('Backquote'), 'Backquote').toBe('true')
    for (const code of ['Backslash', 'IntlBackslash']) {
      expect(focused(code), code).toBe('false')
    }
  })

  it('opens settings as a drawer without unmounting the lesson', async () => {
    localStorage.setItem(
      'kb-solo.settings',
      JSON.stringify({
        locale: 'en',
        contentLanguage: 'ru',
        layoutId: 'ru-jcuken-mac-iso',
      }),
    )
    window.location.hash = '#/lesson/ru-pinky-home-bottom'

    await act(async () => {
      root.render(<AppShell />)
    })

    expect(container.querySelector('.play-screen')).not.toBeNull()

    const settingsButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Settings',
    )
    expect(settingsButton).toBeDefined()

    await act(async () => {
      settingsButton?.click()
    })

    expect(
      container.querySelector('.settings-drawer')?.getAttribute('data-open'),
    ).toBe('true')
    expect(container.querySelector('.play-screen')).not.toBeNull()
    expect(container.querySelector('.app-shell')?.hasAttribute('inert')).toBe(
      true,
    )

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(
      container.querySelector('.settings-drawer')?.getAttribute('data-open'),
    ).toBe('false')
    expect(container.querySelector('.app-shell')?.hasAttribute('inert')).toBe(
      false,
    )
    expect(container.querySelector('.play-screen')).not.toBeNull()
  })

  it('shows persisted stars and unlocks the next lesson after a reload', async () => {
    localStorage.setItem(
      'kb-solo.settings',
      JSON.stringify({
        locale: 'en',
        contentLanguage: 'en',
        layoutId: 'us-qwerty',
      }),
    )
    localStorage.setItem(
      'kb-solo.progress.en-home-left',
      JSON.stringify({
        lessonId: 'en-home-left',
        bestNetWpm: 33,
        bestAccuracy: 0.96,
        stars: 2,
        attempts: 2,
        completedAt: 1,
      }),
    )
    window.location.hash = '#/'

    await act(async () => {
      root.render(<AppShell />)
    })

    const buttons = [
      ...container.querySelectorAll<HTMLButtonElement>('.lesson-button'),
    ]
    const find = (title: string) =>
      buttons.find((button) => button.textContent?.includes(title))
    const left = find('Home row: left hand')
    const right = find('Home row: right hand')
    const both = find('Home row: both hands')

    expect(left?.querySelector('.stars')?.textContent).toBe('★★☆')
    expect(left?.textContent).toContain('Best: 33 WPM')
    expect(right?.getAttribute('aria-disabled')).toBeNull()
    expect(both?.getAttribute('aria-disabled')).toBe('true')
  })

  it('renders the stats screen from persisted progress', async () => {
    localStorage.setItem(
      'kb-solo.settings',
      JSON.stringify({
        locale: 'en',
        contentLanguage: 'en',
        layoutId: 'us-qwerty',
      }),
    )
    localStorage.setItem(
      'kb-solo.progress.en-home-left',
      JSON.stringify({
        lessonId: 'en-home-left',
        bestNetWpm: 41,
        bestAccuracy: 0.98,
        stars: 3,
        attempts: 1,
        completedAt: 1,
      }),
    )
    window.location.hash = '#/stats'

    await act(async () => {
      root.render(<AppShell />)
    })

    expect(container.textContent).toContain('1 lesson completed')
    expect(container.textContent).toContain('Home row: left hand')
    expect(container.querySelectorAll('.stats-row')).toHaveLength(1)
  })

  it('saves a hardcore timeout as an attempt without unlocking the next lesson', async () => {
    vi.useFakeTimers()
    localStorage.setItem(
      'kb-solo.settings',
      JSON.stringify({
        locale: 'en',
        contentLanguage: 'en',
        layoutId: 'us-qwerty',
        paceLevel: 'hardcore',
      }),
    )
    window.location.hash = '#/lesson/en-home-left'

    await act(async () => {
      root.render(<AppShell />)
    })

    const play = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Play',
    )
    expect(play).toBeDefined()
    await act(async () => {
      play?.click()
    })

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })
    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'KeyF',
          key: 'f',
          bubbles: true,
        }),
      )
    })
    await act(async () => {
      vi.advanceTimersByTime(120000)
    })
    act(() => {
      flushProgress()
    })

    const raw = localStorage.getItem('kb-solo.progress.hardcore.en-home-left')
    expect(raw).toBeDefined()
    const record = JSON.parse(raw ?? '{}')
    expect(record).toMatchObject({
      lessonId: 'en-home-left',
      paceLevel: 'hardcore',
      attempts: 1,
      stars: 0,
    })
    expect(record.completedAt).toBeUndefined()

    window.location.hash = '#/'
    await act(async () => {
      window.dispatchEvent(new Event('hashchange'))
    })
    const right = [
      ...container.querySelectorAll<HTMLButtonElement>('.lesson-button'),
    ].find((button) => button.textContent?.includes('Home row: right hand'))
    expect(right?.getAttribute('aria-disabled')).toBe('true')

    vi.useRealTimers()
  })
})
