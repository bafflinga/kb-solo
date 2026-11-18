import { describe, expect, it } from 'vitest'
import { getLayout } from '../layout'
import { allLessons, getLesson } from './registry'

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
  it('produces non-empty, fully resolved cues for all 42 lessons', () => {
    const metas = allLessons()
    expect(metas).toHaveLength(42)

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
      for (const code of meta.focusCodes ?? []) {
        const legend = layout.legends[code]
        if (!legend) {
          continue
        }
        focusChars.add(legend.base)
        focusChars.add(legend.shift)
        if (legend.alt) {
          focusChars.add(legend.alt)
        }
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

        if (!meta.focusCodes?.length) {
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
    expect([...(right?.focusCodes ?? [])].sort()).toEqual([...homeKeys].sort())

    for (const id of ['ru-home-both', 'ru-home-words']) {
      const meta = allLessons().find((lesson) => lesson.id === id)
      const focus = new Set(meta?.focusCodes ?? [])
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
    expect(meta?.focusCodes?.length).toBeGreaterThan(0)
    const focus = new Set(meta?.focusCodes ?? [])

    for (const cue of provider?.createCues(undefined, { generate: true }) ?? []) {
      for (const char of cue.chars) {
        if (char.code === undefined || char.code === 'Space') {
          continue
        }
        expect(focus.has(char.code), `${char.code} is outside focus codes`).toBe(
          true,
        )
      }
    }
  })

  it('falls back to authored variants for drills without focus codes', () => {
    const provider = getLesson('en-shift')
    expect(provider?.meta.focusCodes).toBeUndefined()
    expect(
      provider?.createCues(undefined, { variantIndex: 0, generate: true }),
    ).toEqual(provider?.createCues(undefined, { variantIndex: 0 }))
  })

  it('keeps the English home-words drill to the home row', () => {
    const focus = new Set([
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyF',
      'KeyJ',
      'KeyK',
      'KeyL',
      'Semicolon',
    ])
    for (const code of typedCodes('en-home-words')) {
      expect(focus.has(code), `en-home-words: ${code}`).toBe(true)
    }
  })
})
