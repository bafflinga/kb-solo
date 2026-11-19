import type { GenerationInfo } from '../domain/lessons/types'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n'

export interface GenerationBadgeProps {
  generation?: GenerationInfo
}

export function GenerationBadge({ generation }: GenerationBadgeProps) {
  const { t } = useI18n()
  if (!generation) {
    return null
  }
  const areaKey = `generationArea.${generation.areaId}` as MessageKey
  const sourceKey =
    `generationSentenceSource.${generation.sentenceSource}` as MessageKey
  return (
    <p className="generation-badge">
      {t('generationBadge', { area: t(areaKey), source: t(sourceKey) })}
    </p>
  )
}
