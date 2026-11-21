import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n'
import { lessonsFor } from '../domain/lessons/registry'
import { LANGUAGE_CODES, LANGUAGE_LABEL } from '../domain/languages'
import type { ContentLanguage } from '../domain/types'
import { ContentImportPanel } from './ContentImportPanel'

export interface ContentTransferDialogProps {
  language: ContentLanguage
  exportIds: ReadonlySet<string>
  editedIds: ReadonlySet<string>
  version: number
  onChange(): void
  notify(message: string): void
  onToggleExport(id: string): void
  onSetExport(ids: readonly string[], selected: boolean): void
  onDownload(ids: readonly string[], description: string): void
  onClose(): void
}

export function ContentTransferDialog({
  language,
  exportIds,
  editedIds,
  version,
  onChange,
  notify,
  onToggleExport,
  onSetExport,
  onDownload,
  onClose,
}: ContentTransferDialogProps) {
  const { t } = useI18n()
  const [dialogLanguage, setDialogLanguage] = useState(language)
  const [description, setDescription] = useState('')
  const closeButton = useRef<HTMLButtonElement>(null)
  const selectAll = useRef<HTMLInputElement>(null)
  const visibleIds = lessonsFor(dialogLanguage).map((meta) => meta.id)
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => exportIds.has(id))
  const hasSome = visibleIds.some((id) => exportIds.has(id))

  useEffect(() => {
    if (selectAll.current) {
      selectAll.current.indeterminate = !allSelected && hasSome
    }
  }, [allSelected, hasSome])

  useEffect(() => {
    closeButton.current?.focus()
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="content-dialog-backdrop" onClick={onClose}>
      <div
        className="content-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-transfer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="content-dialog-header">
          <h2 id="content-transfer-title">{t('contentTransferTitle')}</h2>
          <button
            ref={closeButton}
            type="button"
            className="content-dialog-close"
            aria-label={t('close')}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="content-dialog-columns">
          <section className="content-dialog-column">
            <h3>{t('contentExportTitle')}</h3>
            <p className="muted">{t('contentExportHint')}</p>
            <label className="field">
              <span>{t('contentPackDescription')}</span>
              <input
                type="text"
                value={description}
                maxLength={120}
                onChange={(event) => setDescription(event.target.value)}
              />
              <span className="muted">{t('contentPackDescriptionHint')}</span>
            </label>
            <label className="field-row">
              <span>{t('contentLanguage')}</span>
              <select
                value={dialogLanguage}
                onChange={(event) =>
                  setDialogLanguage(event.target.value as ContentLanguage)
                }
              >
                {LANGUAGE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {LANGUAGE_LABEL[code]}
                  </option>
                ))}
              </select>
            </label>
            <div className="content-select-all-row">
              <label className="field checkbox">
                <input
                  ref={selectAll}
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onSetExport(visibleIds, !hasSome)}
                />
                <span>{t('contentSelectAllClear')}</span>
              </label>
            </div>
            <ul className="content-transfer-list">
              {lessonsFor(dialogLanguage).map((meta) => {
                const title = t(meta.titleKey as MessageKey)
                return (
                  <li key={meta.id}>
                    <label className="field checkbox">
                      <input
                        type="checkbox"
                        aria-label={title}
                        checked={exportIds.has(meta.id)}
                        onChange={() => onToggleExport(meta.id)}
                      />
                      <span>{title}</span>
                    </label>
                    {editedIds.has(meta.id) && (
                      <span className="content-edited">
                        {t('contentEdited')}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="content-actions">
              <button
                type="button"
                onClick={() => {
                  onDownload([...exportIds], description)
                  onClose()
                }}
              >
                {t('contentExportSelected')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDownload([...editedIds], description)
                  onClose()
                }}
              >
                {t('contentExportEdited')}
              </button>
            </div>
          </section>
          <section className="content-dialog-column">
            <ContentImportPanel
              version={version}
              onChange={onChange}
              notify={notify}
              onApplied={onClose}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
