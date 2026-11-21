import { describe, expect, it } from 'vitest'
import { languageConfig, LANGUAGE_CODES } from '../languages'
import { buildLessonDefs } from './curriculum'

describe('generated curriculum parity', () => {
  it('matches the frozen English and Russian definitions', () => {
    const defs = Object.fromEntries(
      LANGUAGE_CODES.map((language) => [
        language,
        buildLessonDefs(language, languageConfig(language).curriculum),
      ]),
    )
    expect(defs).toMatchSnapshot()
  })
})
