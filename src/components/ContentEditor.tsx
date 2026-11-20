import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n'
import {
  CONTENT_FORMAT_VERSION,
  contentAllowedCharsFor,
  loadLanguage,
  resetOverride,
  setOverride,
  validateLessonContent,
} from '../domain/lessons/contentStore'
import {
  canonicalLayoutFor,
  contentFocusCharsFor,
  focusLabels,
  resolveFocus,
} from '../domain/keyZones'
import { getLessonMeta } from '../domain/lessons/registry'
import { lessonSourceFor } from '../domain/lessons/curriculum'
import type { LessonContent, LessonKind } from '../domain/lessons/types'
import { resolveLessonLayout } from '../app/lessonLayout'
import type { Layout, LayoutId } from '../domain/types'
import { lessonsDb } from '../storage/lessonsDb'
import { LayoutSwitcher } from './LayoutSwitcher'

export interface ContentEditorProps {
  id: string
  version: number
  layoutId: LayoutId
  onLayoutChange(layoutId: LayoutId): void
  onChange(): void
  notify(message: string): void
}

function serialize(variants: unknown[], kind: LessonKind): string[] {
  const list = variants.length > 0 ? variants : ['']
  return list.map((variant) =>
    kind === 'words' ? (variant as string[]).join(' ') : String(variant),
  )
}

export function ContentEditor({
  id,
  version,
  layoutId,
  onLayoutChange,
  onChange,
  notify,
}: ContentEditorProps) {
  const { t } = useI18n()
  const meta = getLessonMeta(id)
  const activeLayout = useMemo<Layout | undefined>(
    () =>
      meta
        ? resolveLessonLayout(meta.language, meta.layoutId, layoutId)
        : undefined,
    [meta, layoutId],
  )
  const keyFocus = Boolean(meta?.focus?.keys)
  const allowedChars = useMemo(() => {
    if (!meta || !activeLayout) {
      return undefined
    }
    return keyFocus
      ? contentFocusCharsFor(meta, activeLayout.id)
      : resolveFocus(meta, activeLayout)?.chars
  }, [meta, activeLayout, keyFocus])
  const focusCharsLabel = useMemo(
    () => (meta && activeLayout ? focusLabels(meta, activeLayout) : ''),
    [meta, activeLayout],
  )
  const [shipped, setShipped] = useState<LessonContent | null>(null)
  const [loaded, setLoaded] = useState<LessonContent | null>(null)
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
    if (!document || !activeLayout) {
      return null
    }
    return {
      shipped: base ?? null,
      loaded: document,
      draft: serialize(
        lessonSourceFor(current, document, activeLayout),
        current.kind,
      ),
    }
  }, [id, activeLayout])

  async function refresh(): Promise<void> {
    const result = await load()
    if (result) {
      setShipped(result.shipped)
      setLoaded(result.loaded)
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
        setLoaded(result.loaded)
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

  const layoutSpecific = Boolean(
    activeLayout && loaded?.layoutVariants?.[activeLayout.id],
  )

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
    const current = loaded ?? shipped
    if (!kind || !current || !activeLayout) {
      return
    }
    const canonicalLayout = keyFocus
      ? (current.canonicalLayout ?? canonicalLayoutFor(meta)?.id)
      : undefined
    const variants = draft.map((text) =>
      kind === 'words' ? text.trim().split(/\s+/).filter(Boolean) : text,
    )
    const isCanonical =
      canonicalLayout === undefined || activeLayout.id === canonicalLayout
    const document: LessonContent = {
      formatVersion: CONTENT_FORMAT_VERSION,
      variants: isCanonical ? variants : current.variants,
      ...(canonicalLayout ? { canonicalLayout } : {}),
    }
    if (isCanonical) {
      if (current.layoutVariants) {
        document.layoutVariants = current.layoutVariants
      }
    } else {
      document.layoutVariants = {
        ...(current.layoutVariants ?? {}),
        [activeLayout.id]: variants,
      }
    }
    const issues = validateLessonContent(
      document,
      kind,
      contentAllowedCharsFor(meta, canonicalLayout),
    )
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
      {activeLayout && (
        <div className="content-layout-row">
          <LayoutSwitcher
            value={layoutId}
            language={meta.language}
            label={t('layout')}
            onChange={onLayoutChange}
          />
          <p className="muted">
            {t(layoutSpecific ? 'contentLayoutSpecific' : 'contentLayoutShared')}
          </p>
        </div>
      )}
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
