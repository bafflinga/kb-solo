import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lessonsDb } from '../../storage/lessonsDb'
import {
  applyPack,
  exportPack,
  loadContent,
  parsePack,
  resetOverride,
  setOverride,
  validateLessonContent,
} from './contentStore'
import { PACK_FORMAT } from './contentStore'
import type { LanguageContent, LessonContent } from './types'

const lessonsDir = path.resolve(process.cwd(), 'public/lessons')
const manifestText = await readFile(
  path.join(lessonsDir, 'manifest.json'),
  'utf8',
)
const manifest = JSON.parse(manifestText) as {
  files: { language: string; file: string; hash: string }[]
}
const languageTexts: Record<string, string> = {}
for (const entry of manifest.files) {
  languageTexts[entry.file] = await readFile(
    path.join(lessonsDir, entry.file),
    'utf8',
  )
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(async (input: string) => {
    const url = String(input)
    if (url.includes('/lessons/manifest.json')) {
      return new Response(manifestText, { status: 200 })
    }
    const match = /lessons\/((?:en|ru)\.json)/.exec(url)
    const text = match?.[1] ? languageTexts[match[1]] : undefined
    if (text === undefined) {
      return new Response('Not found', { status: 404 })
    }
    return new Response(text, { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)
})

function fetchCount(file: string): number {
  return fetchMock.mock.calls.filter((call) =>
    String(call[0]).includes(`/${file}`),
  ).length
}

describe('lesson content store', () => {
  it('loads a language once and serves its lessons', async () => {
    const content = await loadContent('en-home-left')

    expect(content.variants).toHaveLength(4)
    expect(fetchCount('en.json')).toBe(1)
    const language = await lessonsDb.getLanguage('en')
    expect(language?.hash).toBe(
      manifest.files.find((entry) => entry.language === 'en')?.hash,
    )

    await loadContent('en-home-right')
    expect(fetchCount('en.json')).toBe(1)
  })

  it('prefers an override over shipped content', async () => {
    const edited: LessonContent = {
      formatVersion: 1,
      variants: ['jkl', ';lk', 'kj;', 'lkj'],
    }
    await setOverride('en-home-right', edited)

    expect(await loadContent('en-home-right')).toEqual(edited)
    expect((await lessonsDb.getOverride('en-home-right'))?.document).toEqual(
      edited,
    )
    expect(fetchCount('en.json')).toBe(0)
  })

  it('re-fetches a language when the stored hash is stale', async () => {
    await lessonsDb.putLanguage({
      language: 'ru',
      document: JSON.parse(languageTexts['ru.json'] ?? '{}') as LanguageContent,
      hash: 'outdated',
      updatedAt: 0,
    })

    const content = await loadContent('ru-home-left')

    expect(content.variants).toHaveLength(4)
    expect(fetchCount('ru.json')).toBe(1)
    await expect(lessonsDb.getLanguage('ru')).resolves.toMatchObject({
      hash: manifest.files.find((entry) => entry.language === 'ru')?.hash,
    })
  })

  it('restores shipped content after resetting an override', async () => {
    await setOverride('en-index-mid', { formatVersion: 1, variants: ['gh'] })
    expect((await loadContent('en-index-mid')).variants).toEqual(['gh'])

    await resetOverride('en-index-mid')

    expect(await lessonsDb.getOverride('en-index-mid')).toBeUndefined()
    expect((await loadContent('en-index-mid')).variants).toHaveLength(4)
  })

  it('exports only the selected, known lessons', async () => {
    const edited: LessonContent = {
      formatVersion: 1,
      variants: [['alpha', 'beta']],
    }
    await setOverride('en-words', edited)

    const pack = await exportPack(
      ['en-words', 'does-not-exist'],
      '  evening edits  ',
    )

    expect(pack.format).toBe(PACK_FORMAT)
    expect(pack.exportedAt).toBeTypeOf('number')
    expect(pack.description).toBe('evening edits')
    expect(Object.keys(pack.items)).toEqual(['en-words'])
    expect(pack.items['en-words']).toEqual(edited)
  })

  it('parses packs, skips unknown ids, and reports override conflicts', async () => {
    const text = JSON.stringify({
      format: PACK_FORMAT,
      formatVersion: 1,
      exportedAt: 123,
      description: 'morning review',
      items: {
        'en-prose': { formatVersion: 1, variants: ['hello world'] },
        'no-such-lesson': { formatVersion: 1, variants: ['x'] },
      },
    })
    const parsed = parsePack(text)

    expect(parsed.exportedAt).toBe(123)
    expect(parsed.description).toBe('morning review')
    expect(parsed.items.map((item) => item.id)).toEqual(['en-prose'])
    expect(parsed.skipped).toEqual(['no-such-lesson'])

    expect(await applyPack(parsed)).toEqual({
      applied: ['en-prose'],
      conflicts: [],
    })
    expect(
      (await lessonsDb.getOverride('en-prose'))?.document.variants,
    ).toEqual(['hello world'])
    expect(await applyPack(parsed)).toEqual({
      applied: [],
      conflicts: ['en-prose'],
    })
    expect(await applyPack(parsed, true)).toEqual({
      applied: ['en-prose'],
      conflicts: [],
    })
  })

  it('overwrites only the explicitly approved conflicts', async () => {
    const text = JSON.stringify({
      format: PACK_FORMAT,
      formatVersion: 1,
      items: {
        'en-home-left': { formatVersion: 1, variants: ['asdf'] },
        'en-home-right': { formatVersion: 1, variants: ['jkl;'] },
      },
    })
    const parsed = parsePack(text)
    await resetOverride('en-home-left')
    await resetOverride('en-home-right')
    expect(await applyPack(parsed)).toEqual({
      applied: ['en-home-left', 'en-home-right'],
      conflicts: [],
    })

    const result = await applyPack(parsed, new Set(['en-home-left']))

    expect(result).toEqual({
      applied: ['en-home-left'],
      conflicts: ['en-home-right'],
    })
    expect(
      (await lessonsDb.getOverride('en-home-left'))?.document.variants,
    ).toEqual(['asdf'])
    expect(
      (await lessonsDb.getOverride('en-home-right'))?.document.variants,
    ).toEqual(['jkl;'])
  })

  it('accepts only focus keys in drill variants', async () => {
    await resetOverride('en-home-left')
    await expect(
      setOverride('en-home-left', { formatVersion: 1, variants: ['asg'] }),
    ).rejects.toThrow(/outside the focus keys/)
    expect(await lessonsDb.getOverride('en-home-left')).toBeUndefined()

    await expect(
      setOverride('en-home-left', { formatVersion: 1, variants: ['asdf'] }),
    ).resolves.toBeUndefined()
  })

  it('rejects empty or malformed variants', () => {
    expect(
      validateLessonContent({ formatVersion: 1, variants: [] }, 'drill'),
    ).not.toHaveLength(0)
    expect(
      validateLessonContent({ formatVersion: 1, variants: ['   '] }, 'prose'),
    ).not.toHaveLength(0)
    expect(
      validateLessonContent({ formatVersion: 1, variants: [['one']] }, 'drill'),
    ).not.toHaveLength(0)
    expect(
      validateLessonContent(
        { formatVersion: 1, variants: [['one', 'two']] },
        'words',
      ),
    ).toEqual([])
  })

  it('rejects malformed packs and skips invalid lesson documents', () => {
    expect(() => parsePack('{}')).toThrow('Not a KB Solo content pack')

    const parsed = parsePack(
      JSON.stringify({
        format: PACK_FORMAT,
        formatVersion: 1,
        items: {
          'en-code': { formatVersion: 2, variants: [] },
        },
      }),
    )
    expect(parsed.items).toEqual([])
    expect(parsed.skipped).toEqual(['en-code'])
  })
})
