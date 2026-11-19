import { useEffect, useState } from 'react'
import type { AppSettings, ClearScope } from '../app/settings'
import { PACE_LEVELS } from '../domain/pacing'
import {
  DEFAULT_SHORTCUTS,
  formatShortcut,
  isModifierCode,
  isReservedShortcut,
  needsModifier,
} from '../app/shortcuts'
import type { Shortcut, ShortcutSettings } from '../app/shortcuts'
import { hasMessage } from '../i18n'
import type { I18nValue } from '../i18n'
import type { MessageKey } from '../i18n'
import { estimateQuota } from '../storage/persistence'
import type { QuotaInfo } from '../storage/persistence'
import { APP_VERSION } from '../version'
import { LayoutSwitcher } from './LayoutSwitcher'

interface SettingsPanelProps {
  settings: AppSettings
  onPatch(patch: Partial<AppSettings>): void
  onClearProgress(scope: ClearScope): void
  i18n: I18nValue
}

interface ShortcutFieldProps {
  label: string
  value: Shortcut
  recording: boolean
  disabled: boolean
  error?: string
  keyLabel(code: string): string | undefined
  i18n: I18nValue
  onRecord(): void
  onCancel(): void
  onReset(): void
}

function ShortcutField({
  label,
  value,
  recording,
  disabled,
  error,
  keyLabel,
  i18n,
  onRecord,
  onCancel,
  onReset,
}: ShortcutFieldProps) {
  const { t } = i18n
  return (
    <div className="field shortcut-field">
      <span>{label}</span>
      <div className="field-row">
        <kbd
          className="shortcut-keys"
          data-recording={recording ? 'true' : 'false'}
        >
          {recording ? t('shortcutListening') : formatShortcut(value, keyLabel)}
        </kbd>
        <button
          type="button"
          disabled={disabled && !recording}
          onClick={(event) => {
            event.currentTarget.blur()
            if (recording) {
              onCancel()
            } else {
              onRecord()
            }
          }}
        >
          {recording ? t('shortcutCancel') : t('shortcutChange')}
        </button>
        <button
          type="button"
          disabled={disabled || recording}
          onClick={(event) => {
            event.currentTarget.blur()
            onReset()
          }}
        >
          {t('shortcutReset')}
        </button>
      </div>
      {error && (
        <span className="muted" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

function formatBytes(value: number, format: (value: number) => string): string {
  if (value < 1024) {
    return `${format(value)} B`
  }
  if (value < 1024 * 1024) {
    return `${format(value / 1024)} KB`
  }
  return `${format(value / (1024 * 1024))} MB`
}

export function SettingsPanel({
  settings,
  onPatch,
  onClearProgress,
  i18n,
}: SettingsPanelProps) {
  const { t, n } = i18n
  const [quota, setQuota] = useState<QuotaInfo>()
  const [recording, setRecording] = useState<keyof ShortcutSettings | null>(
    null,
  )
  const [shortcutError, setShortcutError] = useState<string>()
  const [clearScope, setClearScope] = useState<ClearScope>('all')
  const hintKey = `pace.${settings.paceLevel}Hint` as MessageKey

  useEffect(() => {
    let active = true
    void estimateQuota().then((info) => {
      if (active) {
        setQuota(info)
      }
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (recording === null) {
      return
    }
    const target = recording
    function handleKeyDown(event: KeyboardEvent): void {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.key === 'Escape') {
        setShortcutError(undefined)
        setRecording(null)
        return
      }
      if (isModifierCode(event.code)) {
        return
      }
      const candidate: Shortcut = {
        code: event.code,
        ctrl: event.ctrlKey,
        meta: event.metaKey,
        alt: event.altKey,
        shift: event.shiftKey,
      }
      if (needsModifier(candidate)) {
        setShortcutError(t('shortcutNeedsModifier'))
        return
      }
      if (isReservedShortcut(candidate)) {
        setShortcutError(t('shortcutReserved'))
        return
      }
      setShortcutError(undefined)
      onPatch({
        shortcuts:
          target === 'start'
            ? { ...settings.shortcuts, start: candidate }
            : { ...settings.shortcuts, pause: candidate },
      })
      setRecording(null)
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [recording, settings.shortcuts, onPatch, t])

  function keyLabel(code: string): string | undefined {
    const key: MessageKey | undefined =
      code === 'Enter'
        ? 'key.Enter'
        : code === 'Space'
          ? 'key.Space'
          : code === 'Backspace'
            ? 'key.Backspace'
            : code === 'Tab'
              ? 'key.Tab'
              : undefined
    return key ? t(key) : undefined
  }

  function clearProgress(): void {
    if (window.confirm(t('clearProgressConfirm'))) {
      onClearProgress(clearScope)
    }
  }

  return (
    <section className="panel" aria-label={t('settings')}>
      <h2>{t('settings')}</h2>
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={settings.sound}
          onChange={(event) => onPatch({ sound: event.target.checked })}
        />
        <span>{t('sound')}</span>
      </label>
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={settings.showFeedback}
          onChange={(event) => onPatch({ showFeedback: event.target.checked })}
        />
        <span>{t('showFeedback')}</span>
      </label>
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={settings.randomTemplates}
          onChange={(event) =>
            onPatch({ randomTemplates: event.target.checked })
          }
        />
        <span>{t('randomTemplates')}</span>
      </label>
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={settings.generatedDrills}
          onChange={(event) =>
            onPatch({ generatedDrills: event.target.checked })
          }
        />
        <span>{t('generatedDrills')}</span>
      </label>
      {settings.generatedDrills && (
        <p className="muted">{t('generatedDrillsHint')}</p>
      )}
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={settings.showContentEditor}
          onChange={(event) =>
            onPatch({ showContentEditor: event.target.checked })
          }
        />
        <span>{t('showContentEditor')}</span>
      </label>
      {settings.showContentEditor && (
        <p className="muted">{t('showContentEditorHint')}</p>
      )}
      <label className="field">
        <span>{t('pace')}</span>
        <select
          value={settings.paceLevel}
          onChange={(event) =>
            onPatch({
              paceLevel: event.target.value as AppSettings['paceLevel'],
            })
          }
        >
          {PACE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {t(`pace.${level}` as MessageKey)}
            </option>
          ))}
        </select>
      </label>
      {hasMessage(hintKey) && <p className="muted">{t(hintKey)}</p>}

      <LayoutSwitcher
        value={settings.layoutId}
        language={settings.contentLanguage}
        label={t('layout')}
        onChange={(layoutId) => onPatch({ layoutId })}
      />

      <label className="field">
        <span>{t('errorMode')}</span>
        <select
          value={settings.errorMode}
          onChange={(event) =>
            onPatch({
              errorMode: event.target.value as AppSettings['errorMode'],
            })
          }
        >
          <option value="block">{t('errorMode.block')}</option>
          <option value="advance">{t('errorMode.advance')}</option>
        </select>
      </label>
      <label className="field checkbox">
        <input
          type="checkbox"
          checked={settings.strictShift}
          onChange={(event) => onPatch({ strictShift: event.target.checked })}
        />
        <span>{t('strictShift')}</span>
      </label>

      <div className="shortcut-settings">
        <h3>{t('shortcuts')}</h3>
        <p className="muted">{t('shortcutHint')}</p>
        <ShortcutField
          label={t('startShortcut')}
          value={settings.shortcuts.start}
          recording={recording === 'start'}
          disabled={recording !== null}
          error={recording === 'start' ? shortcutError : undefined}
          keyLabel={keyLabel}
          i18n={i18n}
          onRecord={() => {
            setShortcutError(undefined)
            setRecording('start')
          }}
          onCancel={() => {
            setShortcutError(undefined)
            setRecording(null)
          }}
          onReset={() =>
            onPatch({
              shortcuts: {
                ...settings.shortcuts,
                start: DEFAULT_SHORTCUTS.start,
              },
            })
          }
        />
        <ShortcutField
          label={t('pauseShortcut')}
          value={settings.shortcuts.pause}
          recording={recording === 'pause'}
          disabled={recording !== null}
          error={recording === 'pause' ? shortcutError : undefined}
          keyLabel={keyLabel}
          i18n={i18n}
          onRecord={() => {
            setShortcutError(undefined)
            setRecording('pause')
          }}
          onCancel={() => {
            setShortcutError(undefined)
            setRecording(null)
          }}
          onReset={() =>
            onPatch({
              shortcuts: {
                ...settings.shortcuts,
                pause: DEFAULT_SHORTCUTS.pause,
              },
            })
          }
        />
      </div>

      {quota && (
        <p className="muted">
          {t('quota', {
            used: formatBytes(quota.usage, n),
            total: formatBytes(quota.quota, n),
          })}
        </p>
      )}
      <label className="field">
        <span>{t('clearScope')}</span>
        <select
          value={clearScope}
          onChange={(event) => setClearScope(event.target.value as ClearScope)}
        >
          <option value="all">{t('clearScope.all')}</option>
          <option value={settings.paceLevel}>{t('clearScope.current')}</option>
        </select>
      </label>
      <button type="button" className="danger" onClick={clearProgress}>
        {t('clearProgress')}
      </button>
      <p className="muted">
        {t('version')} {APP_VERSION}
      </p>
    </section>
  )
}
