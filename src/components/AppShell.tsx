import { useEffect, useMemo, useState } from 'react'
import { mapFocusCodes, resolveLessonLayout } from '../app/lessonLayout'
import { routeKey } from '../app/navigation'
import { loadSettings, updateSettings } from '../app/settings'
import type { AppSettings } from '../app/settings'
import { navigate, useHashRoute } from '../app/useHashRoute'
import { getLayout, layoutForProfile, profileOf } from '../domain/layout'
import { allLessons, getLesson } from '../domain/lessons/registry'
import type { Code, ContentLanguage } from '../domain/types'
import { useI18n } from '../i18n'
import {
  allProgress,
  clearAllProgress,
  completedLessonIds,
  loadProgress,
  mergeProgress,
  saveProgress,
} from '../storage/progress'
import type { LessonResult } from '../storage/progress'
import { Keyboard } from './Keyboard/Keyboard'
import { createKeyboardController } from './Keyboard/keyboardController'
import { LanguageSwitcher } from './LanguageSwitcher'
import { LessonPicker } from './LessonPicker'
import { PlayScreen } from './PlayScreen'
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
  const currentKey = routeKey(route)
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

  function clearProgress(): void {
    clearAllProgress()
    setProgressVersion((version) => version + 1)
  }

  function handleFinish(result: LessonResult): void {
    saveProgress(mergeProgress(loadProgress(result.lessonId), result))
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

  const progress = allProgress()
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
  const lesson =
    route.screen === 'lesson' ? getLesson(route.lessonId) : undefined
  const lessonLayout = lesson
    ? resolveLessonLayout(
        lesson.meta.language,
        lesson.meta.layoutId,
        settings.layoutId,
      )
    : menuLayout
  const focusCodes = useMemo(
    () =>
      lesson
        ? mapFocusCodes(
            lesson.meta.focusCodes,
            getLayout(lesson.meta.layoutId),
            lessonLayout,
          )
        : undefined,
    [lesson, lessonLayout],
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
          {route.screen === 'stats' && (
            <StatsScreen progress={progress} lessons={allLessons()} />
          )}

          {route.screen === 'lesson' &&
            (lesson ? (
              <PlayScreen
                key={lesson.meta.id}
                lesson={lesson}
                layout={lessonLayout}
                focusCodes={focusCodes}
                labels={keyLabels}
                errorMode={settings.errorMode}
                strictShift={settings.strictShift}
                sound={settings.sound}
                showFeedback={settings.showFeedback}
                suspended={settingsOpen}
                shortcuts={settings.shortcuts}
                best={progress.find((item) => item.lessonId === lesson.meta.id)}
                onFinish={handleFinish}
              />
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
                      <option value="en">English</option>
                      <option value="ru">Русский</option>
                    </select>
                  </label>
                </div>
                <Keyboard
                  layout={menuLayout}
                  controller={menuKeyboard}
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
          onClearProgress={clearProgress}
          i18n={i18n}
        />
      </aside>
      <PwaUpdatePrompt />
    </div>
  )
}
