import { use, useEffect, useSyncExternalStore } from 'react'
import { lessonsDb } from '../../storage/lessonsDb'
import type { ContentLanguage } from '../types'
import { focusCharsFor } from './curriculum'
import { allLessons, getLessonMeta, isKnownLessonId } from './registry'
import type { LanguageContent, LessonContent, LessonKind } from './types'

export const CONTENT_FORMAT_VERSION = 1
export const PACK_FORMAT = 'kb-solo-content-pack'
const BASE_URL = import.meta.env.BASE_URL ?? '/'

export interface ContentManifest {
  formatVersion: number
  files: { language: ContentLanguage; file: string; hash: string }[]
}

export interface ContentStatus {
  cached: number
  total: number
}

export interface ContentPack {
  format: string
  formatVersion: number
  exportedAt: number
  description: string
  items: Record<string, LessonContent>
}

export interface ParsedPack {
  exportedAt: number
  description: string
  items: { id: string; document: LessonContent }[]
  skipped: string[]
}

export interface ApplyResult {
  applied: string[]
  conflicts: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLanguage(value: unknown): value is ContentLanguage {
  return value === 'en' || value === 'ru'
}

export type ContentValidationCode =
  'format' | 'variants' | 'variant-shape' | 'focus-keys'

export interface ContentValidationIssue {
  code: ContentValidationCode
  message: string
}

export function validateLessonContent(
  value: unknown,
  kind: LessonKind,
  allowedChars?: ReadonlySet<string>,
): ContentValidationIssue[] {
  if (!isRecord(value)) {
    return [{ code: 'format', message: 'Lesson content must be an object' }]
  }
  const issues: ContentValidationIssue[] = []
  if (value.formatVersion !== CONTENT_FORMAT_VERSION) {
    issues.push({
      code: 'format',
      message: `Unsupported content format: ${String(value.formatVersion)}`,
    })
  }
  if (!Array.isArray(value.variants)) {
    issues.push({
      code: 'variants',
      message: 'Lesson content must contain a variants array',
    })
    return issues
  }
  if (value.variants.length === 0) {
    issues.push({
      code: 'variants',
      message: 'At least one variant is required',
    })
  }
  value.variants.forEach((variant, index) => {
    const position = index + 1
    if (kind === 'words') {
      if (
        !Array.isArray(variant) ||
        variant.length === 0 ||
        variant.some((word) => typeof word !== 'string')
      ) {
        issues.push({
          code: 'variant-shape',
          message: `Invalid words variant ${position}`,
        })
      }
    } else if (typeof variant !== 'string' || variant.trim().length === 0) {
      issues.push({
        code: 'variant-shape',
        message: `Invalid ${kind} variant ${position}`,
      })
    }
  })
  if (kind === 'drill' && allowedChars) {
    value.variants.forEach((variant, index) => {
      if (typeof variant !== 'string') {
        return
      }
      const outside = Array.from(variant).find(
        (char) => char.trim().length > 0 && !allowedChars.has(char),
      )
      if (outside !== undefined) {
        issues.push({
          code: 'focus-keys',
          message: `Variant ${index + 1} uses ${JSON.stringify(outside)} outside the focus keys`,
        })
      }
    })
  }
  return issues
}

function parseLessonContent(
  value: unknown,
  kind: LessonKind,
  allowedChars?: ReadonlySet<string>,
): LessonContent {
  const issues = validateLessonContent(value, kind, allowedChars)
  if (issues.length > 0) {
    throw new Error(issues[0]?.message)
  }
  const record = value as Record<string, unknown>
  return {
    formatVersion: CONTENT_FORMAT_VERSION,
    variants: record.variants as unknown[],
  }
}

function parseLanguageContent(
  value: unknown,
  language: ContentLanguage,
): LanguageContent {
  if (
    !isRecord(value) ||
    value.formatVersion !== CONTENT_FORMAT_VERSION ||
    value.language !== language ||
    !isRecord(value.lessons)
  ) {
    throw new Error(`Invalid ${language} lesson content`)
  }
  const lessons: Record<string, LessonContent> = {}
  for (const [id, raw] of Object.entries(value.lessons)) {
    const meta = getLessonMeta(id)
    if (!meta?.kind) {
      throw new Error(`Unknown lesson in ${language} content: ${id}`)
    }
    lessons[id] = parseLessonContent(raw, meta.kind, focusCharsFor(meta))
  }
  return {
    formatVersion: CONTENT_FORMAT_VERSION,
    language,
    lessons,
  }
}

async function fetchJson(url: string): Promise<unknown> {
  if (typeof fetch === 'undefined') {
    throw new Error('fetch is unavailable')
  }
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`)
  }
  return response.json()
}

let manifestPromise: Promise<ContentManifest> | undefined

export function loadManifest(): Promise<ContentManifest> {
  if (!manifestPromise) {
    manifestPromise = (async () => {
      const value = await fetchJson(`${BASE_URL}lessons/manifest.json`)
      if (
        !isRecord(value) ||
        value.formatVersion !== CONTENT_FORMAT_VERSION ||
        !Array.isArray(value.files)
      ) {
        throw new Error('Invalid lesson manifest')
      }
      const files = value.files.map((entry) => {
        if (
          !isRecord(entry) ||
          !isLanguage(entry.language) ||
          typeof entry.file !== 'string' ||
          typeof entry.hash !== 'string'
        ) {
          throw new Error('Invalid lesson manifest entry')
        }
        return {
          language: entry.language,
          file: entry.file,
          hash: entry.hash,
        }
      })
      return { formatVersion: CONTENT_FORMAT_VERSION, files }
    })().catch((error: unknown) => {
      manifestPromise = undefined
      throw error
    })
  }
  return manifestPromise
}

const languagePending = new Map<ContentLanguage, Promise<LanguageContent>>()

export function loadLanguage(
  language: ContentLanguage,
): Promise<LanguageContent> {
  const existing = languagePending.get(language)
  if (existing) {
    return existing
  }
  const task = (async () => {
    const manifest = await loadManifest()
    const entry = manifest.files.find((item) => item.language === language)
    if (!entry) {
      throw new Error(`Missing lesson file for ${language}`)
    }
    const stored = await lessonsDb.getLanguage(language)
    if (stored?.hash === entry.hash) {
      return stored.document
    }
    const document = parseLanguageContent(
      await fetchJson(`${BASE_URL}lessons/${entry.file}`),
      language,
    )
    await lessonsDb.putLanguage({
      language,
      document,
      hash: entry.hash,
      updatedAt: Date.now(),
    })
    void refreshStatus()
    return document
  })()
  languagePending.set(language, task)
  void task.catch(() => {
    if (languagePending.get(language) === task) {
      languagePending.delete(language)
    }
  })
  return task
}

const pending = new Map<string, Promise<LessonContent>>()

export function loadContent(id: string): Promise<LessonContent> {
  const existing = pending.get(id)
  if (existing) {
    return existing
  }
  const meta = getLessonMeta(id)
  const kind = meta?.kind
  if (!meta || !kind) {
    return Promise.reject(new Error(`Unknown lesson: ${id}`))
  }
  const task = (async () => {
    const override = await lessonsDb.getOverride(id)
    if (override) {
      return override.document
    }
    const language = await loadLanguage(meta.language)
    const document = language.lessons[id]
    if (!document) {
      throw new Error(`Missing content for ${id}`)
    }
    return document
  })()
  pending.set(id, task)
  void task.catch(() => {
    if (pending.get(id) === task) {
      pending.delete(id)
    }
  })
  return task
}

let status: ContentStatus = { cached: 0, total: 0 }
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeContent(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getContentStatus(): ContentStatus {
  return status
}

export async function refreshStatus(): Promise<void> {
  const [languages, overrides] = await Promise.all([
    lessonsDb.allLanguages().catch(() => []),
    lessonsDb.allOverrides().catch(() => []),
  ])
  const ids = new Set<string>()
  for (const language of languages) {
    for (const id of Object.keys(language.document.lessons)) {
      if (isKnownLessonId(id)) {
        ids.add(id)
      }
    }
  }
  for (const override of overrides) {
    if (isKnownLessonId(override.id)) {
      ids.add(override.id)
    }
  }
  const next = { cached: ids.size, total: allLessons().length }
  if (next.cached !== status.cached || next.total !== status.total) {
    status = next
    emit()
  }
}

export async function setOverride(
  id: string,
  document: LessonContent,
): Promise<void> {
  const meta = getLessonMeta(id)
  if (!meta?.kind) {
    throw new Error(`Unknown lesson: ${id}`)
  }
  const parsed = parseLessonContent(document, meta.kind, focusCharsFor(meta))
  await lessonsDb.putOverride({ id, document: parsed, updatedAt: Date.now() })
  pending.delete(id)
  void refreshStatus()
}

export async function resetOverride(id: string): Promise<void> {
  await lessonsDb.removeOverride(id)
  pending.delete(id)
  void refreshStatus()
}

export async function exportPack(
  ids: readonly string[],
  description = '',
): Promise<ContentPack> {
  const items: Record<string, LessonContent> = {}
  for (const id of ids) {
    if (!isKnownLessonId(id)) {
      continue
    }
    items[id] = await loadContent(id)
  }
  return {
    format: PACK_FORMAT,
    formatVersion: CONTENT_FORMAT_VERSION,
    exportedAt: Date.now(),
    description: description.trim(),
    items,
  }
}

export function packToJson(pack: ContentPack): string {
  return `${JSON.stringify(pack, null, 2)}\n`
}

export function parsePack(text: string): ParsedPack {
  const value: unknown = JSON.parse(text)
  if (
    !isRecord(value) ||
    value.format !== PACK_FORMAT ||
    value.formatVersion !== CONTENT_FORMAT_VERSION ||
    !isRecord(value.items)
  ) {
    throw new Error('Not a KB Solo content pack')
  }
  const items: ParsedPack['items'] = []
  const skipped: string[] = []
  for (const [id, raw] of Object.entries(value.items)) {
    const meta = getLessonMeta(id)
    if (!meta?.kind) {
      skipped.push(id)
      continue
    }
    try {
      items.push({
        id,
        document: parseLessonContent(raw, meta.kind, focusCharsFor(meta)),
      })
    } catch {
      skipped.push(id)
    }
  }
  return {
    exportedAt: typeof value.exportedAt === 'number' ? value.exportedAt : 0,
    description:
      typeof value.description === 'string' ? value.description.trim() : '',
    items,
    skipped,
  }
}

export async function applyPack(
  pack: ParsedPack,
  overwrite: boolean | ReadonlySet<string> = false,
): Promise<ApplyResult> {
  const applied: string[] = []
  const conflicts: string[] = []
  for (const { id, document } of pack.items) {
    const existing = await lessonsDb.getOverride(id)
    const approved =
      overwrite === true || (overwrite instanceof Set && overwrite.has(id))
    if (existing && !approved) {
      conflicts.push(id)
      continue
    }
    await lessonsDb.putOverride({ id, document, updatedAt: Date.now() })
    pending.delete(id)
    applied.push(id)
  }
  void refreshStatus()
  return { applied, conflicts }
}

export function useLessonContent(id: string): LessonContent {
  return use(loadContent(id))
}

export function useContentCacheStatus(): ContentStatus {
  useEffect(() => {
    void refreshStatus()
  }, [])
  return useSyncExternalStore(
    subscribeContent,
    getContentStatus,
    getContentStatus,
  )
}
