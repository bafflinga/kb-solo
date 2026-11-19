import { useEffect, useState } from 'react'
import { generateText, loadFaker } from '../domain/lessons/fakerGenerator'
import type { GeneratedText } from '../domain/lessons/fakerGenerator'
import type {
  GenerationAreaId,
  GenerationSentenceSource,
} from '../domain/lessons/generationAreas'
import type { ContentLanguage, Layout } from '../domain/types'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n'

export interface GenerationPreviewProps {
  language: ContentLanguage
  layout: Layout
  area: GenerationAreaId | 'random'
  source: GenerationSentenceSource
  minWords: number
}

export function GenerationPreview({
  language,
  layout,
  area,
  source,
  minWords,
}: GenerationPreviewProps) {
  const { t } = useI18n()
  const [result, setResult] = useState<GeneratedText>()
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    void loadFaker(language)
      .then((faker) => {
        if (active) {
          setResult(generateText(faker, area, source, layout, minWords))
          setFailed(false)
        }
      })
      .catch(() => {
        if (active) {
          setResult(undefined)
          setFailed(true)
        }
      })
    return () => {
      active = false
    }
  }, [language, layout, area, source, minWords, reload])

  const areaKey = result
    ? (`generationArea.${result.areaId}` as MessageKey)
    : undefined

  return (
    <div className="generation-preview">
      <div className="generation-preview-header">
        <span>{t('generationPreview')}</span>
        <button
          type="button"
          onClick={() => {
            setResult(undefined)
            setFailed(false)
            setReload((value) => value + 1)
          }}
        >
          {t('generationPreviewRegenerate')}
        </button>
      </div>
      {!result && !failed && (
        <p className="muted">{t('generationPreviewLoading')}</p>
      )}
      {failed && <p className="muted">{t('generationPreviewError')}</p>}
      {result && (
        <>
          <p className="muted">
            {areaKey ? t(areaKey) : ''} ·{' '}
            {t(
              `generationSentenceSource.${result.sentenceSource}` as MessageKey,
            )}
          </p>
          <p>
            <strong>{t('generationPreviewWords')}:</strong>{' '}
            {result.words.slice(0, 3).join(' ')}
          </p>
          <p>
            <strong>{t('generationPreviewSentences')}:</strong>{' '}
            {result.sentences.split('. ')[0]?.replace(/\.$/u, '') ?? ''}
          </p>
        </>
      )}
    </div>
  )
}
