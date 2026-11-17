import { useI18n } from '../i18n'
import './pwaUpdatePrompt.css'

export interface PwaUpdatePromptViewProps {
  needRefresh: boolean
  offlineReady: boolean
  onReload(): void
  onDismissUpdate(): void
  onDismissOffline(): void
}

export default function PwaUpdatePromptView({
  needRefresh,
  offlineReady,
  onReload,
  onDismissUpdate,
  onDismissOffline,
}: PwaUpdatePromptViewProps) {
  const { t } = useI18n()

  if (needRefresh) {
    return (
      <div className="pwa-toast pwa-toast-update" role="alert">
        <span>{t('newVersionAvailable')}</span>
        <div className="pwa-toast-actions">
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.blur()
              onReload()
            }}
          >
            {t('reload')}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.blur()
              onDismissUpdate()
            }}
          >
            {t('close')}
          </button>
        </div>
      </div>
    )
  }

  if (offlineReady) {
    return (
      <div
        className="pwa-toast pwa-toast-offline"
        role="status"
        aria-live="polite"
      >
        <span>{t('offlineReady')}</span>
        <div className="pwa-toast-actions">
          <button
            type="button"
            onClick={(event) => {
              event.currentTarget.blur()
              onDismissOffline()
            }}
          >
            {t('dismiss')}
          </button>
        </div>
      </div>
    )
  }

  return null
}
