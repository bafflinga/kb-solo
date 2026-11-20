import { faker } from '@faker-js/faker/locale/en'
import { describe, expect, it } from 'vitest'
import { mapFocusCodes } from '../../app/lessonLayout'
import { resolveFocus } from '../keyZones'
import { getLayout } from '../layout'
import type { LayoutId } from '../types'
import { allLessons, getLesson } from './registry'
import type { LessonProvider } from './types'

function typedCodes(id: string): Set<string> {
  const provider = getLesson(id)
  const cues = provider?.createCues() ?? []
  const codes = new Set<string>()
  for (const cue of cues) {
    for (const char of cue.chars) {
      if (char.code !== undefined && char.code !== 'Space') {
        codes.add(char.code)
      }
    }
  }
  return codes
}

describe('curricula', () => {
  it('produces non-empty, fully resolved cues for all 56 lessons', () => {
    const metas = allLessons()
    expect(metas).toHaveLength(56)

    for (const meta of metas) {
      const provider = getLesson(meta.id)
      expect(provider, meta.id).toBeDefined()

      const cues = provider?.createCues() ?? []
      expect(cues.length, meta.id).toBeGreaterThan(0)

      for (const cue of cues) {
        expect(cue.text.length, `${meta.id}: empty cue text`).toBeGreaterThan(0)
        expect(cue.chars.length, `${meta.id}: empty cue chars`).toBeGreaterThan(
          0,
        )
        for (const char of cue.chars) {
          expect(
            char.code,
            `${meta.id}: unresolved ${JSON.stringify(char.char)}`,
          ).toBeDefined()
        }
      }
    }
  })

  it('keeps lesson variants distinct and within their focus codes', () => {
    for (const meta of allLessons()) {
      const provider = getLesson(meta.id)
      expect(provider, meta.id).toBeDefined()
      if (!provider) {
        continue
      }

      const layout = getLayout(meta.layoutId)
      const focusChars = new Set<string>([' ', '\n'])
      for (const char of resolveFocus(meta, layout)?.chars ?? []) {
        focusChars.add(char)
      }

      const seen = new Map<string, number>()
      for (let index = 0; index < provider.templateCount; index++) {
        const cues = provider.createCues(undefined, { variantIndex: index })
        const text = cues.map((cue) => cue.text).join('')
        expect(
          seen.has(text),
          `${meta.id}: variant ${index} repeats variant ${seen.get(text)}`,
        ).toBe(false)
        seen.set(text, index)

        if (!resolveFocus(meta, layout)?.chars) {
          continue
        }
        for (const cue of cues) {
          for (const char of cue.chars) {
            expect(
              focusChars.has(char.char),
              `${meta.id} variant ${index}: ${JSON.stringify(char.char)} is outside the focus codes`,
            ).toBe(true)
          }
        }
      }
    }
  })

  it('resolves every Russian lesson with the Mac layout', () => {
    const mac = getLayout('ru-jcuken-mac')
    const russian = allLessons().filter((meta) => meta.language === 'ru')

    for (const meta of russian) {
      const provider = getLesson(meta.id)
      expect(provider, meta.id).toBeDefined()
      expect(() => provider?.createCues(mac), meta.id).not.toThrow()
    }
  })

  it('resolves every Russian lesson with the Mac ISO layout', () => {
    const macIso = getLayout('ru-jcuken-mac-iso')
    const russian = allLessons().filter((meta) => meta.language === 'ru')

    for (const meta of russian) {
      const provider = getLesson(meta.id)
      expect(provider, meta.id).toBeDefined()
      expect(() => provider?.createCues(macIso), meta.id).not.toThrow()
    }
  })

  it('keeps ru-pinky-bottom on unshifted pinky keys across Russian layouts', () => {
    const provider = getLesson('ru-pinky-bottom')
    expect(provider).toBeDefined()
    const expectedCodes = new Set(['KeyZ', 'Slash', 'IntlBackslash'])

    for (const layoutId of [
      'ru-jcuken',
      'ru-jcuken-mac',
      'ru-jcuken-mac-iso',
    ] as const) {
      const layout = getLayout(layoutId)
      const seen = new Set<string>()
      let hasIntlBackslash = false
      for (let index = 0; index < (provider?.templateCount ?? 0); index += 1) {
        const cues = provider?.createCues(layout, { variantIndex: index }) ?? []
        expect(cues.length, `${layoutId} variant ${index}`).toBeGreaterThan(0)
        const text = cues.map((cue) => cue.text).join('')
        expect(seen.has(text), `${layoutId} variant ${index} repeats`).toBe(
          false,
        )
        seen.add(text)
        for (const cue of cues) {
          for (const char of cue.chars) {
            if (char.code === 'Space' || char.code === 'Enter') {
              continue
            }
            expect(
              expectedCodes.has(char.code ?? ''),
              `${layoutId}: ${char.code}`,
            ).toBe(true)
            expect(['lp', 'rp'], char.finger).toContain(char.finger)
            expect(char.needsShift, `${layoutId}: ${char.code}`).toBe(false)
            if (char.code === 'IntlBackslash') {
              hasIntlBackslash = true
            }
          }
        }
      }
      expect(hasIntlBackslash, layoutId).toBe(layoutId === 'ru-jcuken-mac-iso')
    }
  })

  it('keeps the merged pinky lessons on their keys across layouts', () => {
    const ruLayouts: readonly LayoutId[] = [
      'ru-jcuken',
      'ru-jcuken-mac',
      'ru-jcuken-mac-iso',
    ]
    const enLayouts: readonly LayoutId[] = [
      'us-qwerty',
      'us-qwerty-mac',
      'us-qwerty-mac-iso',
    ]
    const cases = [
      {
        id: 'ru-pinky-top',
        codes: [
          'KeyQ',
          'KeyP',
          'BracketLeft',
          'BracketRight',
          'Backslash',
          'Backquote',
        ],
        fingers: ['lp', 'rp'],
        layouts: ruLayouts,
      },
      {
        id: 'ru-pinky-home-both',
        codes: ['KeyA', 'Semicolon', 'Quote', 'Backslash'],
        fingers: ['lp', 'rp'],
        layouts: ruLayouts,
      },
      {
        id: 'en-pinky-top',
        codes: ['KeyQ', 'KeyP', 'BracketLeft', 'BracketRight'],
        fingers: ['lp', 'rp'],
        layouts: enLayouts,
      },
      {
        id: 'en-pinky-home-both',
        codes: ['KeyA', 'Semicolon', 'Quote'],
        fingers: ['lp', 'rp'],
        layouts: enLayouts,
      },
    ]

    for (const { id, codes, fingers, layouts } of cases) {
      const provider = getLesson(id)
      expect(provider, id).toBeDefined()
      const expectedCodes = new Set(codes)
      for (const layoutId of layouts) {
        const layout = getLayout(layoutId)
        for (
          let index = 0;
          index < (provider?.templateCount ?? 0);
          index += 1
        ) {
          const cues =
            provider?.createCues(layout, { variantIndex: index }) ?? []
          expect(
            cues.length,
            `${id} ${layoutId} variant ${index}`,
          ).toBeGreaterThan(0)
          for (const cue of cues) {
            for (const char of cue.chars) {
              if (char.code === 'Space' || char.code === 'Enter') {
                continue
              }
              expect(
                expectedCodes.has(char.code ?? ''),
                `${id} ${layoutId}: ${char.code}`,
              ).toBe(true)
              expect(fingers, `${id} ${layoutId}: ${char.finger}`).toContain(
                char.finger,
              )
              expect(char.needsShift, `${id} ${layoutId}: ${char.code}`).toBe(
                false,
              )
            }
          }
        }
      }
    }
  })

  it('keeps ё on the intended pinky keys across layouts', () => {
    const cuesFor = (
      provider: LessonProvider | undefined,
      layoutId: LayoutId,
    ) =>
      (provider?.createCues(getLayout(layoutId)) ?? []).flatMap(
        (cue) => cue.chars,
      )
    const yoCodeFor = (
      provider: LessonProvider | undefined,
      layoutId: LayoutId,
    ) => cuesFor(provider, layoutId).find((char) => char.char === 'ё')?.code

    const top = getLesson('ru-pinky-top')
    const home = getLesson('ru-pinky-home-both')

    expect(yoCodeFor(top, 'ru-jcuken')).toBe('Backquote')
    expect(yoCodeFor(top, 'ru-jcuken-mac')).toBe('Backslash')
    expect(yoCodeFor(top, 'ru-jcuken-mac-iso')).toBeUndefined()

    const backslashCodeFor = (layoutId: LayoutId) =>
      cuesFor(top, layoutId).find((char) => char.char === '\\')?.code
    expect(backslashCodeFor('ru-jcuken')).toBe('Backslash')
    expect(backslashCodeFor('ru-jcuken-mac')).toBeUndefined()
    expect(backslashCodeFor('ru-jcuken-mac-iso')).toBeUndefined()

    expect(yoCodeFor(home, 'ru-jcuken')).toBeUndefined()
    expect(yoCodeFor(home, 'ru-jcuken-mac')).toBeUndefined()
    expect(yoCodeFor(home, 'ru-jcuken-mac-iso')).toBe('Backslash')
  })

  it('keeps Slash identity-bound for Russian bottom-row lessons on Mac', () => {
    for (const id of ['ru-bottom-right', 'ru-bottom-both']) {
      const provider = getLesson(id)
      expect(provider, id).toBeDefined()
      for (const layoutId of ['ru-jcuken-mac', 'ru-jcuken-mac-iso'] as const) {
        const layout = getLayout(layoutId)
        const meta = provider?.meta
        expect(meta, id).toBeDefined()
        const focus = meta && mapFocusCodes(meta, layout)
        expect(focus, `${id} ${layoutId}`).toContain('Slash')
        const cues = provider?.createCues(layout, { variantIndex: 0 }) ?? []
        const slash = cues
          .flatMap((cue) => cue.chars)
          .find((char) => char.code === 'Slash')
        expect(slash?.char, `${id} ${layoutId}`).toBe('/')
      }
    }
  })

  it('renders the authored Mac content for Russian bottom-row lessons', () => {
    const cases: Record<string, Partial<Record<LayoutId, string>>> = {
      'ru-bottom-right': {
        'ru-jcuken': 'ть б. ю, ьт .б тю ,ь тьб ю.',
        'ru-jcuken-mac': 'ть б/ ю/ ьт /б тю /ь тьб ю/',
        'ru-jcuken-mac-iso': 'ть б/ ю/ ьт /б тю /ь тьб ю/',
      },
      'ru-bottom-both': {
        'ru-jcuken': 'яч ть сми б. ю, ьт ячс миб',
        'ru-jcuken-mac': 'яч ть сми б/ ю/ ьт ячс миб',
        'ru-jcuken-mac-iso': 'яч ть сми б/ ю/ ьт ячс миб',
      },
    }
    for (const [id, byLayout] of Object.entries(cases)) {
      const provider = getLesson(id)
      expect(provider, id).toBeDefined()
      for (const [layoutId, expected] of Object.entries(byLayout)) {
        const text = (
          provider?.createCues(getLayout(layoutId as LayoutId), {
            variantIndex: 0,
          }) ?? []
        )
          .map((cue) => cue.text)
          .join('')
          .trim()
        expect(text, `${id} ${layoutId}`).toBe(expected)
      }
    }
  })

  it('renders the authored Windows and ISO content for Russian pinky lessons', () => {
    const cases: Record<string, Partial<Record<LayoutId, string>>> = {
      'ru-pinky-bottom': {
        'ru-jcuken': '.я я. я. .я .я я. я.',
        'ru-jcuken-mac': '/я я/ я/ /я /я я/ я/',
        'ru-jcuken-mac-iso': ']я /я я/ ]я /я я/ ]я /я',
      },
      'ru-pinky-home-both': {
        'ru-jcuken': 'фж эф жэ фэ жф эж фжэ',
        'ru-jcuken-mac': 'фж эф жэ фэ жф эж фжэ',
        'ru-jcuken-mac-iso': 'фж ёф жэ ёж фэ жё фжэ',
      },
    }
    for (const [id, byLayout] of Object.entries(cases)) {
      const provider = getLesson(id)
      expect(provider, id).toBeDefined()
      for (const [layoutId, expected] of Object.entries(byLayout)) {
        const text = (
          provider?.createCues(getLayout(layoutId as LayoutId), {
            variantIndex: 0,
          }) ?? []
        )
          .map((cue) => cue.text)
          .join('')
          .trim()
        expect(text, `${id} ${layoutId}`).toBe(expected)
      }
    }
  })

  it('scopes top-row punctuation across Russian layouts', () => {
    for (const id of ['ru-top-right', 'ru-top-both']) {
      const provider = getLesson(id)
      expect(provider, id).toBeDefined()
      const textFor = (layoutId: LayoutId) =>
        (provider?.createCues(getLayout(layoutId)) ?? [])
          .map((cue) => cue.text)
          .join('')

      const win = textFor('ru-jcuken')
      const mac = textFor('ru-jcuken-mac')
      const iso = textFor('ru-jcuken-mac-iso')
      for (const text of [win, mac, iso]) {
        expect(text, id).toContain('х')
        expect(text, id).toContain('ъ')
      }
      expect(win, id).toContain('\\')
      expect(win, id).not.toContain('ё')
      expect(mac, id).toContain('ё')
      expect(mac, id).not.toContain('\\')
      expect(iso, id).not.toContain('ё')
      expect(iso, id).not.toContain('\\')
    }
  })

  it('scopes pinky-both punctuation across Russian layouts', () => {
    const provider = getLesson('ru-pinky-both')
    expect(provider).toBeDefined()
    const textFor = (layoutId: LayoutId) =>
      (provider?.createCues(getLayout(layoutId)) ?? [])
        .map((cue) => cue.text)
        .join('')

    const win = textFor('ru-jcuken')
    const mac = textFor('ru-jcuken-mac')
    const iso = textFor('ru-jcuken-mac-iso')
    for (const text of [win, mac, iso]) {
      for (const char of ['ф', 'й', 'я', 'ж', 'з', 'х', 'ъ', 'э']) {
        expect(text).toContain(char)
      }
    }
    expect(win).toContain('.')
    expect(win).toContain('\\')
    expect(win).toContain('ё')
    expect(win).not.toContain(']')
    expect(win).not.toContain('>')
    expect(mac).toContain('/')
    expect(mac).toContain('ё')
    expect(mac).toContain(']')
    expect(mac).not.toContain('\\')
    expect(mac).not.toContain('>')
    expect(iso).toContain('/')
    expect(iso).toContain('ё')
    expect(iso).toContain('>')
    expect(iso).toContain(']')
    expect(iso).not.toContain('\\')
  })

  it('resolves every English lesson with the Mac ISO layout', () => {
    const macIso = getLayout('us-qwerty-mac-iso')
    const english = allLessons().filter((meta) => meta.language === 'en')

    for (const meta of english) {
      const provider = getLesson(meta.id)
      expect(provider, meta.id).toBeDefined()
      expect(() => provider?.createCues(macIso), meta.id).not.toThrow()
    }
  })

  it('resolves every English lesson with the Mac ANSI layout', () => {
    const mac = getLayout('us-qwerty-mac')
    const english = allLessons().filter((meta) => meta.language === 'en')

    for (const meta of english) {
      const provider = getLesson(meta.id)
      expect(provider, meta.id).toBeDefined()
      expect(() => provider?.createCues(mac), meta.id).not.toThrow()
    }
  })

  it('rings the ОЛДЖ home keys on the Russian right-hand home lessons', () => {
    // ОЛДЖ sits on KeyJ, KeyK, KeyL, Semicolon — the right hand's home keys.
    // KeyH (р) is the right index's neighbour and must not be ringed instead.
    const homeKeys = ['KeyJ', 'KeyK', 'KeyL', 'Semicolon']

    const right = allLessons().find((lesson) => lesson.id === 'ru-home-right')
    expect([...(right ? (resolveFocus(right, getLayout(right.layoutId))?.codes ?? []) : [])].sort()).toEqual([...homeKeys].sort())

    for (const id of ['ru-home-both']) {
      const meta = allLessons().find((lesson) => lesson.id === id)
      const focus = new Set(
        meta ? (resolveFocus(meta, getLayout(meta.layoutId))?.codes ?? []) : [],
      )
      for (const code of homeKeys) {
        expect(focus.has(code), `${id}: missing ${code}`).toBe(true)
      }
      expect(focus.has('KeyH'), `${id}: KeyH (р) is not a home key`).toBe(false)
    }
  })

  it('keeps the Russian index-bottom drill to the index keys', () => {
    const focus = new Set(['KeyV', 'KeyB', 'KeyN', 'KeyM'])
    for (const code of typedCodes('ru-index-bottom')) {
      expect(focus.has(code), `ru-index-bottom: ${code}`).toBe(true)
    }
  })

  it('exposes the template kind on lesson providers', () => {
    expect(getLesson('en-home-left')?.kind).toBe('drill')
    expect(getLesson('en-words')?.kind).toBe('words')
  })

  it('keeps generated combos inside the lesson focus codes', () => {
    const provider = getLesson('en-home-left')
    const meta = provider?.meta
    expect(provider).toBeDefined()
    expect(meta?.focus?.keys).toBeDefined()
    const focus = new Set(
      meta ? (resolveFocus(meta, getLayout(meta.layoutId))?.codes ?? []) : [],
    )

    for (const cue of provider?.createCues(undefined, { generate: true }) ??
      []) {
      for (const char of cue.chars) {
        if (char.code === undefined || char.code === 'Space') {
          continue
        }
        expect(
          focus.has(char.code),
          `${char.code} is outside focus codes`,
        ).toBe(true)
      }
    }
  })

  it('falls back to authored variants for drills without focus codes', () => {
    const provider = getLesson('en-caps')
    expect(provider?.meta.focus).toBeUndefined()
    expect(
      provider?.createCues(undefined, { variantIndex: 0, generate: true }),
    ).toEqual(provider?.createCues(undefined, { variantIndex: 0 }))
  })

  it('generates word cues with area metadata', () => {
    faker.seed(4321)
    const result = getLesson('en-words')?.createGeneratedCues?.(undefined, {
      generate: true,
      faker,
      area: 'commerce',
      sentenceSource: 'lorem',
    })

    expect(result?.cues).toHaveLength(10)
    expect(result?.generation).toEqual({
      areaId: 'commerce',
      sentenceSource: 'lorem',
    })
  })

  it('generates prose cues with area metadata', () => {
    faker.seed(4321)
    const result = getLesson('en-prose')?.createGeneratedCues?.(undefined, {
      generate: true,
      faker,
      area: 'music',
      sentenceSource: 'phrase',
    })

    expect(result?.cues.length).toBeGreaterThan(0)
    expect(result?.generation).toEqual({
      areaId: 'music',
      sentenceSource: 'phrase',
    })
  })

  it('keeps code lessons on authored variants when generation is requested', () => {
    const provider = getLesson('en-code')
    const result = provider?.createGeneratedCues?.(undefined, {
      generate: true,
      faker,
    })
    expect(result?.generation).toBeUndefined()
    expect(result?.cues).toEqual(
      provider?.createCues(undefined, { variantIndex: 0 }),
    )
  })
})
