import type { Faker } from '@faker-js/faker'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { mapFocusCodes, resolveLessonLayout } from '../app/lessonLayout'
import { usedCodesForLesson } from '../app/lessonPreview'
import { routeKey } from '../app/navigation'
import { loadSettings, updateSettings } from '../app/settings'
import type { AppSettings, ClearScope } from '../app/settings'
import { navigate, useHashRoute } from '../app/useHashRoute'
import { setMuted } from '../audio/audio'
import { getLayout, layoutForProfile, profileOf } from '../domain/layout'
import {
  getContentStatus,
  loadLanguage,
  loadLessonContentMap,
  refreshStatus,
} from '../domain/lessons/contentStore'
import { loadFaker } from '../domain/lessons/fakerGenerator'
import { allLessons, getLessonMeta } from '../domain/lessons/registry'
import type { LessonContentMap } from '../domain/lessons/types'
import { LANGUAGE_CODES, LANGUAGE_LABEL } from '../domain/languages'
import type { Code, ContentLanguage } from '../domain/types'
import { useI18n } from '../i18n'
import {
  allProgress,
  clearProgress,
  completedLessonIds,
  loadProgress,
  mergeProgress,
  saveProgress,
} from '../storage/progress'
import type { LessonResult } from '../storage/progress'
import { Keyboard } from './Keyboard/Keyboard'
import { createKeyboardController } from './Keyboard/keyboardController'
import { ContentScreen } from './ContentScreen'
import { ContentToast } from './ContentToast'
import type { ToastMessage } from './ContentToast'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ContentErrorBoundary, LessonGate } from './LessonGate'
import { LessonPicker } from './LessonPicker'
import PwaUpdatePrompt from './PwaUpdatePrompt'
import { SettingsPanel } from './SettingsPanel'
import { StatsScreen } from './StatsScreen'

export default function AppShell() {
  const i18n = useI18n()
  const { t, locale, setLocale } = i18n
  const route = useHashRoute()
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [settingsKey, setSettingsKey] = useState<string | null>(null)
  const [, setProgressVersion] = useState(0)
  const [contentVersion, setContentVersion] = useState(0)
  const [previewContent, setPreviewContent] = useState<LessonContentMap>({})
  const [hovered, setHovered] = useState<{ id: string; key: string } | null>(
    null,
  )
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [fakerState, setFakerState] = useState<{
    language: ContentLanguage
    instance: Faker
  }>()
  const tRef = useRef(t)
  const currentKey = routeKey(route)
  const faker =
    settings.generatedContent &&
    fakerState?.language === settings.contentLanguage
      ? fakerState.instance
      : undefined

  useEffect(() => {
    tRef.current = t
  }, [t])

  useEffect(() => {
    if (!settings.generatedContent) {
      return
    }
    let active = true
    void loadFaker(settings.contentLanguage)
      .then((instance) => {
        if (active) {
          setFakerState({ language: settings.contentLanguage, instance })
        }
      })
      .catch(() => {
        if (active) {
          setFakerState(undefined)
        }
      })
    return () => {
      active = false
    }
  }, [settings.generatedContent, settings.contentLanguage])

  const notify = useCallback((text: string): void => {
    setToast({ id: Date.now() + Math.random(), text })
  }, [])
  const dismissToast = useCallback((): void => setToast(null), [])
  const handleContentChange = useCallback((): void => {
    setContentVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    setMuted(!settings.sound)
  }, [settings.sound])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await loadLanguage(settings.contentLanguage)
        await refreshStatus()
        if (!cancelled) {
          const status = getContentStatus()
          notify(
            tRef.current('contentCached', {
              cached: status.cached,
              total: status.total,
            }),
          )
        }
      } catch (error) {
        console.error(error)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [settings.contentLanguage, notify])

  useEffect(() => {
    let cancelled = false
    void loadLessonContentMap(settings.contentLanguage)
      .then((map) => {
        if (!cancelled) {
          setPreviewContent(map)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewContent({})
        }
      })
    return () => {
      cancelled = true
    }
  }, [settings.contentLanguage, contentVersion])

  const settingsOpen = settingsKey === currentKey

  function closeSettings(): void {
    setSettingsKey(null)
  }

  function toggleSettings(): void {
    setSettingsKey((key) => (key === currentKey ? null : currentKey))
  }

  function patch(next: Partial<AppSettings>): void {
    setSettings(updateSettings(next))
  }

  function changeLocale(next: typeof locale): void {
    setLocale(next)
    patch({ locale: next })
  }

  function changeContentLanguage(next: ContentLanguage): void {
    patch({
      contentLanguage: next,
      layoutId: layoutForProfile(profileOf(settings.layoutId), next),
    })
  }

  function clear(scope: ClearScope): void {
    clearProgress(scope === 'all' ? undefined : scope)
    setProgressVersion((version) => version + 1)
  }

  function handleFinish(result: LessonResult): void {
    saveProgress(
      mergeProgress(loadProgress(result.lessonId, result.paceLevel), result),
    )
    setProgressVersion((version) => version + 1)
  }

  useEffect(() => {
    if (!settingsOpen) {
      return
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setSettingsKey(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [settingsOpen])

  const progress = allProgress(settings.paceLevel)
  const completedIds = completedLessonIds()

  const lessons = allLessons().filter(
    (meta) => meta.language === settings.contentLanguage,
  )

  const [menuKeyboard] = useState(createKeyboardController)

  const keyLabels = useMemo<Partial<Record<Code, string>>>(
    () => ({
      Tab: t('key.Tab'),
      CapsLock: t('key.CapsLock'),
      ShiftLeft: t('key.ShiftLeft'),
      ShiftRight: t('key.ShiftRight'),
      Enter: t('key.Enter'),
      Backspace: t('key.Backspace'),
      Space: t('key.Space'),
    }),
    [t],
  )

  const menuLayout = getLayout(settings.layoutId)
  const lessonMeta =
    route.screen === 'lesson' ? getLessonMeta(route.lessonId) : undefined
  const lessonLayout = lessonMeta
    ? resolveLessonLayout(
        lessonMeta.language,
        lessonMeta.layoutId,
        settings.layoutId,
      )
    : menuLayout
  const focusCodes = useMemo(
    () => (lessonMeta ? mapFocusCodes(lessonMeta, lessonLayout) : undefined),
    [lessonMeta, lessonLayout],
  )

  const hoveredMeta =
    route.screen === 'menu' && hovered?.key === currentKey
      ? lessons.find((meta) => meta.id === hovered.id)
      : undefined
  const previewLayout = hoveredMeta
    ? resolveLessonLayout(
        hoveredMeta.language,
        hoveredMeta.layoutId,
        settings.layoutId,
      )
    : menuLayout
  const previewCodes = useMemo(
    () =>
      hoveredMeta
        ? usedCodesForLesson(hoveredMeta, previewContent, previewLayout)
        : undefined,
    [hoveredMeta, previewContent, previewLayout],
  )

  return (
    <div className="app">
      <div className="app-shell" inert={settingsOpen}>
        <a className="skip-link" href="#main">
          {t('menu')}
        </a>
        <header className="app-header">
          <h1>{t('appName')}</h1>
          <LanguageSwitcher
            locale={locale}
            onChange={changeLocale}
            label={t('language')}
          />
          <nav aria-label={t('menu')} className="app-nav">
            <a
              href="#/"
              className={route.screen === 'menu' ? 'active' : ''}
              onClick={closeSettings}
            >
              {t('menu')}
            </a>
            <a
              href="#/stats"
              className={route.screen === 'stats' ? 'active' : ''}
              onClick={closeSettings}
            >
              {t('stats')}
            </a>
            {settings.showContentEditor && (
              <a
                href="#/content"
                className={route.screen === 'content' ? 'active' : ''}
                onClick={closeSettings}
              >
                {t('contentEditor')}
              </a>
            )}
            <button
              type="button"
              className={settingsOpen ? 'active' : ''}
              aria-expanded={settingsOpen}
              aria-controls="settings-drawer"
              onClick={toggleSettings}
            >
              {t('settings')}
            </button>
          </nav>
        </header>

        <main id="main" className="app-main">
          {route.screen === 'content' && (
            <ContentScreen
              key={settings.contentLanguage}
              language={settings.contentLanguage}
              layoutId={settings.layoutId}
              onLayoutChange={(next) => patch({ layoutId: next })}
              version={contentVersion}
              onChange={handleContentChange}
              notify={notify}
            />
          )}

          {route.screen === 'stats' && (
            <StatsScreen
              progress={progress}
              lessons={allLessons()}
              paceLevel={settings.paceLevel}
            />
          )}

          {route.screen === 'lesson' &&
            (lessonMeta ? (
              <ContentErrorBoundary
                fallback={
                  <section className="panel">
                    <h2>{t('play')}</h2>
                    <p>{t('contentError')}</p>
                    <a href="#/">{t('back')}</a>
                  </section>
                }
              >
                <Suspense
                  fallback={
                    <section className="panel">
                      <h2>{t('play')}</h2>
                      <p>{t('loadingContent')}</p>
                    </section>
                  }
                >
                  <LessonGate
                    key={`${lessonMeta.id}:${contentVersion}`}
                    lessonId={lessonMeta.id}
                    layout={lessonLayout}
                    focusCodes={focusCodes}
                    labels={keyLabels}
                    errorMode={settings.errorMode}
                    strictShift={settings.strictShift}
                    showFeedback={settings.showFeedback}
                    randomTemplates={settings.randomTemplates}
                    generatedContent={settings.generatedContent}
                    faker={faker}
                    generationArea={settings.generationArea}
                    generationSentenceSource={settings.generationSentenceSource}
                    generationMinPhraseWords={settings.generationMinPhraseWords}
                    paceLevel={settings.paceLevel}
                    suspended={settingsOpen}
                    shortcuts={settings.shortcuts}
                    best={progress.find(
                      (item) => item.lessonId === lessonMeta.id,
                    )}
                    onFinish={handleFinish}
                  />
                </Suspense>
              </ContentErrorBoundary>
            ) : (
              <section className="panel">
                <h2>{t('play')}</h2>
                <p>{t('selectLesson')}</p>
                <a href="#/">{t('back')}</a>
              </section>
            ))}

          {route.screen === 'menu' && (
            <>
              <section className="panel">
                <div className="menu-controls">
                  <label className="field-row">
                    <span>{t('contentLanguage')}</span>
                    <select
                      value={settings.contentLanguage}
                      onChange={(event) =>
                        changeContentLanguage(
                          event.target.value as ContentLanguage,
                        )
                      }
                    >
                      {LANGUAGE_CODES.map((code) => (
                        <option key={code} value={code}>
                          {LANGUAGE_LABEL[code]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <Keyboard
                  layout={previewLayout}
                  controller={menuKeyboard}
                  focusCodes={previewCodes}
                  labels={keyLabels}
                />
              </section>
              <LessonPicker
                lessons={lessons}
                language={settings.contentLanguage}
                progress={progress}
                completedIds={completedIds}
                onSelect={(id) =>
                  navigate(`#/lesson/${encodeURIComponent(id)}`)
                }
                onHover={(id) =>
                  setHovered(id ? { id, key: currentKey } : null)
                }
              />
            </>
          )}
        </main>
      </div>

      <div
        className="settings-backdrop"
        data-open={settingsOpen ? 'true' : 'false'}
        aria-hidden="true"
        onClick={closeSettings}
      />

      <aside
        id="settings-drawer"
        className="settings-drawer"
        data-open={settingsOpen ? 'true' : 'false'}
        aria-label={t('settings')}
      >
        <button
          type="button"
          className="settings-close"
          aria-label={t('close')}
          onClick={closeSettings}
        >
          ×
        </button>
        <SettingsPanel
          settings={settings}
          onPatch={patch}
          onClearProgress={clear}
          i18n={i18n}
        />
      </aside>
      <PwaUpdatePrompt />
      <ContentToast message={toast} onDismiss={dismissToast} />
    </div>
  )
}
