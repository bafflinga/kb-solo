import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { vi } from 'vitest'
import { hydrateLessons } from '../domain/lessons/registry'
import type { LanguageContent, LessonContent } from '../domain/lessons/types'

const lessonsDir = path.resolve(process.cwd(), 'public/lessons')
const manifestText = await readFile(
  path.join(lessonsDir, 'manifest.json'),
  'utf8',
)
const manifest = JSON.parse(manifestText) as {
  files: { language: string; file: string }[]
}

const languages: Record<string, string> = {}
const content: Record<string, LessonContent> = {}
for (const entry of manifest.files) {
  const text = await readFile(path.join(lessonsDir, entry.file), 'utf8')
  languages[entry.file] = text
  const document = JSON.parse(text) as LanguageContent
  Object.assign(content, document.lessons)
}
hydrateLessons(content)

vi.stubGlobal('fetch', async (input: string | URL | Request) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url
  if (url.includes('/lessons/manifest.json')) {
    return new Response(manifestText, { status: 200 })
  }
  const match = /lessons\/((?:en|ru)\.json)(?:[?#].*)?$/.exec(url)
  const file = match?.[1]
  const text = file ? languages[file] : undefined
  if (text === undefined) {
    return new Response('Not found', { status: 404 })
  }
  return new Response(text, { status: 200 })
})
