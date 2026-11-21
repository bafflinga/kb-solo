import type { Faker } from '@faker-js/faker'
import type { LanguageCurriculumSetup } from './lessons/curriculum'
import type { KeyboardProfile } from './layout'
import type { LayoutId } from './types'

export interface LanguageConfig {
  label: string
  layouts: Readonly<Record<KeyboardProfile, LayoutId>>
  layoutFamilyPrefix: string
  loadFaker: () => Promise<{ faker: Faker }>
  curriculum: LanguageCurriculumSetup
}

export const LANGUAGE_CONFIG = {
  en: {
    label: 'English',
    layouts: {
      pc: 'us-qwerty',
      'mac-ansi': 'us-qwerty-mac',
      'mac-iso': 'us-qwerty-mac-iso',
    },
    layoutFamilyPrefix: 'us-',
    loadFaker: () => import('@faker-js/faker/locale/en'),
    curriculum: {
      layoutId: 'us-qwerty',
      punctuationFocus: {
        keys: {
          codes: [
            'Minus',
            'Equal',
            'BracketLeft',
            'BracketRight',
            'Semicolon',
            'Quote',
            'Comma',
            'Period',
            'Slash',
            'Backslash',
          ],
        },
      },
    },
  },
  ru: {
    label: 'Русский',
    layouts: {
      pc: 'ru-jcuken',
      'mac-ansi': 'ru-jcuken-mac',
      'mac-iso': 'ru-jcuken-mac-iso',
    },
    layoutFamilyPrefix: 'ru-',
    loadFaker: () => import('@faker-js/faker/locale/ru'),
    curriculum: {
      layoutId: 'ru-jcuken',
      punctuationFocus: { chars: ['.', ',', '!', '?', ';', ':', '"', '-'] },
      layoutOverrides: {
        'pinky-home-bottom': 'ru-jcuken-mac-iso',
        'pinky-both': 'ru-jcuken-mac-iso',
      },
    },
  },
} satisfies Record<string, LanguageConfig>

export type ContentLanguage = keyof typeof LANGUAGE_CONFIG

export const LANGUAGE_CODES = Object.keys(LANGUAGE_CONFIG) as ContentLanguage[]

export function languageConfig(language: ContentLanguage): LanguageConfig {
  return LANGUAGE_CONFIG[language]
}

export const LANGUAGE_LABEL: Record<ContentLanguage, string> =
  Object.fromEntries(
    LANGUAGE_CODES.map((code) => [code, languageConfig(code).label]),
  ) as Record<ContentLanguage, string>
