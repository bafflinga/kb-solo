import { describe, expect, it } from 'vitest'
import {
  LANGUAGE_CONFIG,
  LANGUAGE_CODES,
  LANGUAGE_LABEL,
  languageConfig,
} from './languages'
import { buildLessonDefs } from './lessons/curriculum'

describe('language registry', () => {
  it('has a complete config for every code', () => {
    expect(LANGUAGE_CODES.length).toBeGreaterThan(0)
    for (const code of LANGUAGE_CODES) {
      const config = languageConfig(code)
      expect(config).toBe(LANGUAGE_CONFIG[code])
      expect(config.label).toBe(LANGUAGE_LABEL[code])
      expect(Object.keys(config.layouts).sort()).toEqual([
        'mac-ansi',
        'mac-iso',
        'pc',
      ])
      expect(typeof config.loadFaker).toBe('function')
    }
  })

  it('builds a full curriculum for every code', () => {
    for (const code of LANGUAGE_CODES) {
      const defs = buildLessonDefs(code, languageConfig(code).curriculum)
      expect(defs.length).toBeGreaterThan(0)
      expect(new Set(defs.map((def) => def.id)).size).toBe(defs.length)
      expect(defs.every((def) => def.language === code)).toBe(true)
      expect(defs.every((def) => def.titleKey.startsWith('lesson.'))).toBe(true)
    }
  })
})
