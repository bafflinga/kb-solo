import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n'
import { exportPack, packToJson } from '../domain/lessons/contentStore'
import type { ContentPack } from '../domain/lessons/contentStore'
import { lessonsFor } from '../domain/lessons/registry'
import type { ContentLanguage } from '../domain/types'
import { lessonsDb } from '../storage/lessonsDb'
import { ContentEditor } from './ContentEditor'
import { ContentTransferDialog } from './ContentTransferDialog'

function packFileName(pack: ContentPack): string {
  const stamp = new Date(pack.exportedAt)
    .toISOString()
    .slice(0, 16)
    .replace(/[T:]/g, '-')
  const slug = pack.description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `kb-solo-${stamp}${slug ? `-${slug}` : ''}.json`
}

export interface ContentScreenProps {
  language: ContentLanguage
  version: number
  onChange(): void
  notify(message: string): void
}

export function ContentScreen({
  language,
  version,
  onChange,
  notify,
}: ContentScreenProps) {
  const { t } = useI18n()
  const [activeLanguage, setActiveLanguage] = useState(language)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [exportIds, setExportIds] = useState<ReadonlySet<string>>(new Set())
  const [editedIds, setEditedIds] = useState<ReadonlySet<string>>(new Set())
  const [transferOpen, setTransferOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void lessonsDb
      .allOverrides()
      .then((records) => {
        if (!cancelled) {
          setEditedIds(new Set(records.map((record) => record.id)))
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [version])

  function toggleExport(id: string): void {
    setExportIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function setExportSelection(ids: readonly string[], selected: boolean): void {
    setExportIds((previous) => {
      const next = new Set(previous)
      for (const id of ids) {
        if (selected) {
          next.add(id)
        } else {
          next.delete(id)
        }
      }
      return next
    })
  }

  async function download(
    ids: readonly string[],
    description: string,
  ): Promise<void> {
    if (ids.length === 0) {
      notify(t('contentNoSelection'))
      return
    }
    const pack = await exportPack(ids, description)
    if (typeof URL.createObjectURL !== 'function') {
      return
    }
    const url = URL.createObjectURL(
      new Blob([packToJson(pack)], { type: 'application/json' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = packFileName(pack)
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="panel content-screen">
      <h2>{t('contentEditor')}</h2>
      <div className="content-columns">
        <div className="content-column content-column-list">
          <label className="field-row">
            <span>{t('contentLanguage')}</span>
            <select
              value={activeLanguage}
              onChange={(event) => {
                setActiveLanguage(event.target.value as ContentLanguage)
                setSelectedId(null)
              }}
            >
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
          </label>
          <h3>{t('contentSelectLesson')}</h3>
          <ul className="content-lesson-list">
            {lessonsFor(activeLanguage).map((meta) => {
              const title = t(meta.titleKey as MessageKey)
              const kind = meta.kind
                ? t(`contentKind.${meta.kind}` as MessageKey)
                : ''
              return (
                <li
                  className={
                    selectedId === meta.id
                      ? 'content-lesson-row selected'
                      : 'content-lesson-row'
                  }
                  key={meta.id}
                >
                  <button
                    type="button"
                    className="content-lesson-button"
                    aria-current={selectedId === meta.id ? 'true' : undefined}
                    onClick={() => setSelectedId(meta.id)}
                  >
                    <span>{title}</span>
                    <span className="muted">{kind}</span>
                  </button>
                  {editedIds.has(meta.id) && (
                    <span className="content-edited">{t('contentEdited')}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="content-column content-column-editor">
          <div className="content-editor-toolbar">
            <button type="button" onClick={() => setTransferOpen(true)}>
              {t('contentTransfer')}
            </button>
          </div>
          {selectedId ? (
            <ContentEditor
              id={selectedId}
              version={version}
              onChange={onChange}
              notify={notify}
            />
          ) : (
            <p className="muted content-editor-hint">
              {t('contentEditorHint')}
            </p>
          )}
        </div>
      </div>
      {transferOpen && (
        <ContentTransferDialog
          language={activeLanguage}
          exportIds={exportIds}
          editedIds={editedIds}
          version={version}
          onChange={onChange}
          notify={notify}
          onToggleExport={toggleExport}
          onSetExport={setExportSelection}
          onDownload={(ids, description) => void download(ids, description)}
          onClose={() => setTransferOpen(false)}
        />
      )}
    </section>
  )
}
