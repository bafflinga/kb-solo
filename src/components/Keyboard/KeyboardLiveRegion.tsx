import { FINGER_MAP } from '../../domain/fingerMap'
import type { Code, Layout } from '../../domain/types'
import { useI18n } from '../../i18n'
import type { MessageKey } from '../../i18n'

export interface KeyboardLiveRegionProps {
  code?: Code
  character?: string
  layout: Layout
}

export function KeyboardLiveRegion({
  code,
  character,
  layout,
}: KeyboardLiveRegionProps) {
  const { t } = useI18n()

  if (code === undefined) {
    return <div className="visually-hidden" aria-live="polite" />
  }

  const finger = FINGER_MAP[code]
  const key = character ?? layout.legends[code]?.base ?? code
  const fingerName = finger ? t(`finger.${finger}` as MessageKey) : ''

  return (
    <div className="visually-hidden" aria-live="polite">
      {t('nextKeyAnnouncement', { key, finger: fingerName })}
    </div>
  )
}
