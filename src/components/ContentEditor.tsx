import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n'
import {
  CONTENT_FORMAT_VERSION,
  loadLanguage,
  resetOverride,
  setOverride,
  validateLessonContent,
} from '../domain/lessons/contentStore'
import { focusCharsFor, focusKeyLabels } from '../domain/lessons/curriculum'
import { getLessonMeta } from '../domain/lessons/registry'
import type { LessonContent, LessonKind } from '../domain/lessons/types'
import { lessonsDb } from '../storage/lessonsDb'

export interface ContentEditorProps {
  id: string
  version: number
  onChange(): void
  notify(message: string): void
}

function serialize(document: LessonContent, kind: LessonKind): string[] {
  const variants = document.variants.length > 0 ? document.variants : ['']
  return variants.map((variant) =>
    kind === 'words' ? (variant as string[]).join(' ') : String(variant),
  )
}

export function ContentEditor({
  id,
  version,
  onChange,
  notify,
}: ContentEditorProps) {
  const { t } = useI18n()
  const meta = getLessonMeta(id)
  const allowedChars = meta ? focusCharsFor(meta) : undefined
  const focusCharsLabel = meta ? focusKeyLabels(meta) : ''
  const [shipped, setShipped] = useState<LessonContent | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const rejectionId = useRef(0)
  const [rejected, setRejected] = useState<{
    id: number
    index: number
    keys: string
  } | null>(null)

  const load = useCallback(async () => {
    const current = getLessonMeta(id)
    if (!current?.kind) {
      return null
    }
    const language = await loadLanguage(current.language)
    const base = language.lessons[id]
    const override = await lessonsDb.getOverride(id)
    const document = override?.document ?? base
    return {
      shipped: base ?? null,
      draft: document ? serialize(document, current.kind) : [''],
    }
  }, [id])

  async function refresh(): Promise<void> {
    const result = await load()
    if (result) {
      setShipped(result.shipped)
      setDraft(result.draft)
      setError(null)
    }
  }

  useEffect(() => {
    if (!rejected) {
      return
    }
    const timer = window.setTimeout(() => setRejected(null), 2000)
    return () => window.clearTimeout(timer)
  }, [rejected])

  useEffect(() => {
    let cancelled = false
    void load()
      .then((result) => {
        if (cancelled || !result) {
          return
        }
        setShipped(result.shipped)
        setDraft(result.draft)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(String(cause))
        }
      })
    return () => {
      cancelled = true
    }
  }, [load, version])

  if (!meta?.kind) {
    return null
  }

  function outsideChars(text: string): string[] {
    if (!allowedChars) {
      return []
    }
    return [
      ...new Set(
        Array.from(text).filter(
          (char) => char.trim().length > 0 && !allowedChars.has(char),
        ),
      ),
    ]
  }

  function updateVariant(index: number, value: string): void {
    const pressed = outsideChars(value)
    const clean = allowedChars
      ? Array.from(value)
          .filter((char) => char.trim().length === 0 || allowedChars.has(char))
          .join('')
      : value
    if (pressed.length > 0) {
      rejectionId.current += 1
      setRejected({
        id: rejectionId.current,
        index,
        keys: pressed.join(' '),
      })
    } else if (rejected?.index === index) {
      setRejected(null)
    }
    setDraft((previous) =>
      previous.map((item, position) => (position === index ? clean : item)),
    )
  }

  function addVariant(): void {
    setDraft((previous) => [...previous, ''])
  }

  function removeVariant(index: number): void {
    setDraft((previous) =>
      previous.length === 1
        ? previous
        : previous.filter((_, position) => position !== index),
    )
  }

  function moveVariant(index: number, offset: number): void {
    setDraft((previous) => {
      const target = index + offset
      if (target < 0 || target >= previous.length) {
        return previous
      }
      const current = previous[index]
      const other = previous[target]
      if (current === undefined || other === undefined) {
        return previous
      }
      const next = [...previous]
      next[index] = other
      next[target] = current
      return next
    })
  }

  async function save(): Promise<void> {
    const kind = meta?.kind
    if (!kind) {
      return
    }
    const variants = draft.map((text) =>
      kind === 'words' ? text.trim().split(/\s+/).filter(Boolean) : text,
    )
    const document = { formatVersion: CONTENT_FORMAT_VERSION, variants }
    const issues = validateLessonContent(document, kind, allowedChars)
    if (issues.length > 0) {
      setError(
        issues[0]?.code === 'focus-keys'
          ? t('contentFocusKeysError', { chars: focusCharsLabel })
          : t('contentInvalidVariants'),
      )
      return
    }
    setBusy(true)
    try {
      await setOverride(id, document)
      onChange()
      notify(t('contentSaved'))
      setError(null)
    } catch (cause) {
      console.error(cause)
      setError(t('contentSaveError'))
    } finally {
      setBusy(false)
    }
  }

  async function reset(): Promise<void> {
    setBusy(true)
    try {
      await resetOverride(id)
      onChange()
      notify(t('contentResetDone'))
      await refresh()
    } catch (cause) {
      console.error(cause)
      setError(t('contentSaveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel content-editor">
      <h3>
        {t(meta.titleKey as MessageKey)}{' '}
        <span className="muted">
          {t(`contentKind.${meta.kind}` as MessageKey)}
        </span>
      </h3>
      {meta.kind === 'words' && (
        <p className="muted">{t('contentWordsHint')}</p>
      )}
      {meta.kind === 'code' && <p className="muted">{t('contentCodeHint')}</p>}
      {allowedChars && (
        <p className="muted content-focus-hint">
          {t('contentFocusKeysHint', { chars: focusCharsLabel })}
        </p>
      )}
      <ol className="content-variants">
        {draft.map((text, index) => {
          const pressed =
            rejected !== null && rejected.index === index ? rejected.keys : ''
          return (
            <li
              className={
                pressed.length > 0
                  ? 'content-variant invalid'
                  : 'content-variant'
              }
              key={index}
            >
              <label className="field">
                <span>{t('contentVariant', { index: index + 1 })}</span>
                <textarea
                  rows={meta.kind === 'code' ? 4 : 2}
                  value={text}
                  aria-invalid={pressed.length > 0}
                  onChange={(event) => updateVariant(index, event.target.value)}
                />
              </label>
              {pressed.length > 0 && (
                <p className="content-error" role="alert">
                  {t('contentFocusKeysPressed', {
                    keys: pressed,
                    chars: focusCharsLabel,
                  })}
                </p>
              )}
              <div className="content-variant-actions">
                <button
                  type="button"
                  aria-label={t('contentMoveUp')}
                  disabled={index === 0 || busy}
                  onClick={() => moveVariant(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={t('contentMoveDown')}
                  disabled={index === draft.length - 1 || busy}
                  onClick={() => moveVariant(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={draft.length === 1 || busy}
                  onClick={() => removeVariant(index)}
                >
                  {t('contentRemoveVariant')}
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      <button type="button" disabled={busy} onClick={addVariant}>
        {t('contentAddVariant')}
      </button>
      {error && (
        <p className="content-error" role="alert">
          {error}
        </p>
      )}
      <div className="content-actions">
        <button
          type="button"
          disabled={busy || draft.some((text) => outsideChars(text).length > 0)}
          onClick={() => void save()}
        >
          {t('contentSave')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void refresh().catch((cause: unknown) => setError(String(cause)))
          }
        >
          {t('contentDiscard')}
        </button>
        <button type="button" disabled={busy} onClick={() => void reset()}>
          {t('contentReset')}
        </button>
      </div>
      <details className="content-compare">
        <summary>{t('contentCompare')}</summary>
        <pre>{shipped ? JSON.stringify(shipped.variants, null, 2) : ''}</pre>
      </details>
    </section>
  )
}
