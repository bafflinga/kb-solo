import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n'
import {
  applyPack,
  loadContent,
  parsePack,
} from '../domain/lessons/contentStore'
import type { ParsedPack } from '../domain/lessons/contentStore'
import { getLessonMeta } from '../domain/lessons/registry'
import type { LessonContent, LessonKind } from '../domain/lessons/types'
import { lessonsDb } from '../storage/lessonsDb'

function formatVariants(document: LessonContent, kind: LessonKind): string {
  const sets: { label: string; variants: unknown[] }[] = [
    {
      label: document.canonicalLayout ? `${document.canonicalLayout}\n` : '',
      variants: document.variants,
    },
  ]
  return sets
    .map(({ label, variants }) =>
      [
        label,
        ...variants.map((variant, index) => {
          const text =
            kind === 'words' ? (variant as string[]).join(' ') : String(variant)
          return `${index + 1}. ${text}`
        }),
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
}

export interface ContentImportPanelProps {
  version: number
  onChange(): void
  notify(message: string): void
  onApplied?(): void
}

export function ContentImportPanel({
  version,
  onChange,
  notify,
  onApplied,
}: ContentImportPanelProps) {
  const { t, d } = useI18n()
  const [parsed, setParsed] = useState<ParsedPack | null>(null)
  const [fileName, setFileName] = useState('')
  const [currentById, setCurrentById] = useState<Record<string, LessonContent>>(
    {},
  )
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [overwrites, setOverwrites] = useState<ReadonlySet<string>>(new Set())
  const [overrideIds, setOverrideIds] = useState<ReadonlySet<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const selectAll = useRef<HTMLInputElement>(null)
  const importIds = parsed?.items.map((item) => item.id) ?? []
  const allSelected =
    importIds.length > 0 && importIds.every((id) => selected.has(id))
  const hasSome = importIds.some((id) => selected.has(id))

  useEffect(() => {
    let cancelled = false
    void lessonsDb
      .allOverrides()
      .then((records) => {
        if (!cancelled) {
          setOverrideIds(new Set(records.map((record) => record.id)))
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [version])

  useEffect(() => {
    if (selectAll.current) {
      selectAll.current.indeterminate = !allSelected && hasSome
    }
  }, [allSelected, hasSome])

  useEffect(() => {
    if (!parsed) {
      return
    }
    let cancelled = false
    void Promise.all(
      parsed.items.map(async (item) => {
        try {
          return [item.id, await loadContent(item.id)] as const
        } catch {
          return [item.id, undefined] as const
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return
      }
      const next: Record<string, LessonContent> = {}
      for (const [id, content] of entries) {
        if (content) {
          next[id] = content
        }
      }
      setCurrentById(next)
    })
    return () => {
      cancelled = true
    }
  }, [parsed])

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    try {
      const next = parsePack(await file.text())
      setParsed(next)
      setFileName(file.name)
      setSelected(new Set(next.items.map((item) => item.id)))
      setOverwrites(new Set())
      setError(null)
    } catch {
      setParsed(null)
      setCurrentById({})
      setError(t('contentImportInvalid'))
    }
  }

  function toggle(
    set: ReadonlySet<string>,
    update: (next: Set<string>) => void,
    id: string,
  ): void {
    const next = new Set(set)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    update(next)
  }

  async function apply(): Promise<void> {
    if (!parsed) {
      return
    }
    const items = parsed.items.filter((item) => selected.has(item.id))
    if (items.length === 0) {
      setError(t('contentImportNoItems'))
      return
    }
    setBusy(true)
    try {
      const result = await applyPack({ ...parsed, items }, new Set(overwrites))
      notify(
        t('contentImportApplied', {
          applied: result.applied.length,
          conflicts: result.conflicts.length,
        }),
      )
      onChange()
      setParsed(null)
      setCurrentById({})
      setError(null)
      onApplied?.()
    } catch (cause) {
      console.error(cause)
      setError(t('contentImportInvalid'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel content-import">
      <h3>{t('contentImportTitle')}</h3>
      <label className="field">
        <span>{t('contentImportFile')}</span>
        <input
          type="file"
          accept="application/json,.json"
          onChange={(event) => void handleFile(event)}
        />
      </label>
      {parsed && (
        <>
          <div className="content-pack-summary">
            <strong>
              {parsed.description || t('contentPackNoDescription')}
            </strong>
            <span className="muted">
              {t('contentPackFile', { name: fileName })}
            </span>
            <span className="muted">
              {parsed.exportedAt > 0
                ? t('contentPackExported', { date: d(parsed.exportedAt) })
                : t('contentPackExported', { date: '—' })}
            </span>
            <span className="muted">
              {t('contentPackLessonCount', { count: parsed.items.length })}
            </span>
          </div>
          <div className="content-select-all-row">
            <label className="field checkbox">
              <input
                ref={selectAll}
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(new Set(hasSome ? [] : importIds))}
              />
              <span>{t('contentSelectAllClear')}</span>
            </label>
          </div>
          <ul className="content-import-list">
            {parsed.items.map((item) => {
              const meta = getLessonMeta(item.id)
              const titleKey = meta?.titleKey
              const kind: LessonKind = meta?.kind ?? 'drill'
              const current = currentById[item.id]
              const same =
                current !== undefined &&
                JSON.stringify([
                  current.variants,
                  current.canonicalLayout,
                ]) ===
                  JSON.stringify([
                    item.document.variants,
                    item.document.canonicalLayout,
                  ])
              return (
                <li key={item.id} className="content-import-item">
                  <label className="field checkbox">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggle(selected, setSelected, item.id)}
                    />
                    <span>
                      {titleKey ? t(titleKey as MessageKey) : item.id}
                    </span>
                  </label>
                  {overrideIds.has(item.id) && (
                    <label className="field checkbox">
                      <input
                        type="checkbox"
                        checked={overwrites.has(item.id)}
                        onChange={() =>
                          toggle(overwrites, setOverwrites, item.id)
                        }
                      />
                      <span>{t('contentImportOverwrite')}</span>
                    </label>
                  )}
                  <details className="content-preview">
                    <summary>
                      {t('contentPreview')}{' '}
                      <span className={same ? 'muted' : 'content-edited'}>
                        {current === undefined
                          ? t('contentPreviewLoading')
                          : same
                            ? t('contentPreviewSame')
                            : t('contentPreviewChanged')}
                      </span>
                    </summary>
                    <div className="content-preview-columns">
                      <div>
                        <strong>{t('contentPreviewIncoming')}</strong>
                        <pre>{formatVariants(item.document, kind)}</pre>
                      </div>
                      <div>
                        <strong>{t('contentPreviewCurrent')}</strong>
                        <pre>
                          {current
                            ? formatVariants(current, kind)
                            : t('contentPreviewLoading')}
                        </pre>
                      </div>
                    </div>
                    <details className="content-preview-raw">
                      <summary>{t('contentPreviewRaw')}</summary>
                      <pre>{JSON.stringify(item.document, null, 2)}</pre>
                    </details>
                  </details>
                </li>
              )
            })}
          </ul>
          {parsed.skipped.length > 0 && (
            <p className="muted">
              {t('contentImportSkipped', { ids: parsed.skipped.join(', ') })}
            </p>
          )}
          <button
            type="button"
            disabled={busy || parsed.items.length === 0}
            onClick={() => void apply()}
          >
            {t('contentImportApply')}
          </button>
        </>
      )}
      {error && (
        <p className="content-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
