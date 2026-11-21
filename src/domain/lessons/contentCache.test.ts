import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lessonsDb } from '../../storage/lessonsDb'
import { loadContent } from './contentStore'
import type { LanguageContent } from './types'

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
    const match = /lessons\/([a-z]+\.json)/.exec(url)
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

describe('language download caching', () => {
  it('reuses a matching stored hash and downloads each language at most once', async () => {
    const hash = manifest.files.find((entry) => entry.language === 'ru')?.hash
    expect(hash).toBeDefined()
    await lessonsDb.putLanguage({
      language: 'ru',
      document: JSON.parse(languageTexts['ru.json'] ?? '{}') as LanguageContent,
      hash: hash ?? '',
      updatedAt: 0,
    })

    expect((await loadContent('ru-home-left')).variants.length).toBeGreaterThan(
      0,
    )
    expect(fetchCount('ru.json')).toBe(0)

    await loadContent('en-home-left')
    expect(fetchCount('en.json')).toBe(1)

    await loadContent('ru-home-right')
    await loadContent('en-home-right')

    expect(fetchCount('ru.json')).toBe(0)
    expect(fetchCount('en.json')).toBe(1)
    expect(fetchCount('manifest.json')).toBe(1)
  })
})
