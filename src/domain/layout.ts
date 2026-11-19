import type { Code, ContentLanguage, Layout, LayoutId } from './types'
import { ANSI_GEOMETRY, ISO_GEOMETRY } from './geometry'
import { LEGEND_SETS } from './legends'

export { fingerFor } from './fingerMap'

export type KeyboardProfile = 'pc' | 'mac-ansi' | 'mac-iso'

const LAYOUTS: Record<LayoutId, Layout> = {
  'us-qwerty': {
    id: 'us-qwerty',
    displayName: 'US QWERTY',
    formFactor: 'ansi',
    legends: LEGEND_SETS['us-qwerty'],
    geometry: ANSI_GEOMETRY,
  },
  'us-qwerty-mac': {
    id: 'us-qwerty-mac',
    displayName: 'US QWERTY (Mac, ANSI)',
    formFactor: 'ansi',
    legends: LEGEND_SETS['us-qwerty-mac'],
    geometry: ANSI_GEOMETRY,
  },
  'us-qwerty-mac-iso': {
    id: 'us-qwerty-mac-iso',
    displayName: 'US QWERTY (Mac, ISO)',
    formFactor: 'iso',
    legends: LEGEND_SETS['us-qwerty-mac-iso'],
    geometry: ISO_GEOMETRY,
  },
  'ru-jcuken': {
    id: 'ru-jcuken',
    displayName: 'Русская (Windows)',
    formFactor: 'ansi',
    legends: LEGEND_SETS['ru-jcuken'],
    geometry: ANSI_GEOMETRY,
  },
  'ru-jcuken-mac': {
    id: 'ru-jcuken-mac',
    displayName: 'Русская (Mac, ANSI)',
    formFactor: 'ansi',
    legends: LEGEND_SETS['ru-jcuken-mac'],
    geometry: ANSI_GEOMETRY,
  },
  'ru-jcuken-mac-iso': {
    id: 'ru-jcuken-mac-iso',
    displayName: 'Русская (Mac, ISO)',
    formFactor: 'iso',
    legends: LEGEND_SETS['ru-jcuken-mac-iso'],
    geometry: ISO_GEOMETRY,
  },
}

const PROFILE_BY_LAYOUT: Readonly<Record<LayoutId, KeyboardProfile>> = {
  'us-qwerty': 'pc',
  'us-qwerty-mac': 'mac-ansi',
  'us-qwerty-mac-iso': 'mac-iso',
  'ru-jcuken': 'pc',
  'ru-jcuken-mac': 'mac-ansi',
  'ru-jcuken-mac-iso': 'mac-iso',
}

const LAYOUT_BY_PROFILE: Readonly<
  Record<KeyboardProfile, Record<ContentLanguage, LayoutId>>
> = {
  pc: { en: 'us-qwerty', ru: 'ru-jcuken' },
  'mac-ansi': { en: 'us-qwerty-mac', ru: 'ru-jcuken-mac' },
  'mac-iso': { en: 'us-qwerty-mac-iso', ru: 'ru-jcuken-mac-iso' },
}

const PROFILE_ORDER: readonly KeyboardProfile[] = ['pc', 'mac-ansi', 'mac-iso']

export function getLayout(id: LayoutId): Layout {
  const layout = LAYOUTS[id]
  if (!layout) {
    throw new Error(`Unknown layout: ${id}`)
  }
  return layout
}

export function allLayouts(): Layout[] {
  return Object.values(LAYOUTS)
}

export function isLayoutId(value: unknown): value is LayoutId {
  return typeof value === 'string' && value in LAYOUTS
}

export function profileOf(id: LayoutId): KeyboardProfile {
  return PROFILE_BY_LAYOUT[id]
}

export function layoutForProfile(
  profile: KeyboardProfile,
  language: ContentLanguage,
): LayoutId {
  return LAYOUT_BY_PROFILE[profile][language]
}

export function layoutsForLanguage(language: ContentLanguage): Layout[] {
  return PROFILE_ORDER.map((profile) =>
    getLayout(LAYOUT_BY_PROFILE[profile][language]),
  )
}

export function codeForChar(layout: Layout, char: string): Code | undefined {
  const codes = Object.keys(layout.legends)

  for (const code of codes) {
    if (layout.legends[code]?.base === char) {
      return code
    }
  }
  for (const code of codes) {
    if (layout.legends[code]?.shift === char) {
      return code
    }
  }
  for (const code of codes) {
    if (layout.legends[code]?.alt === char) {
      return code
    }
  }

  return undefined
}

export function resolveKeyCode(
  code: Code,
  from: Layout,
  to: Layout,
  identityCodes: readonly Code[] = [],
): Code | undefined {
  if (identityCodes.includes(code)) {
    return to.legends[code] === undefined ? undefined : code
  }
  const base = from.legends[code]?.base
  return base === undefined ? code : (codeForChar(to, base) ?? code)
}

export function inputCodeFor(layout: Layout, code: Code): Code {
  if (layout.formFactor === 'iso') {
    if (code === 'Backquote') {
      return 'IntlBackslash'
    }
    if (code === 'IntlBackslash') {
      return 'Backquote'
    }
  }
  return code
}

export function expectedKeyFor(
  layout: Layout,
  code: Code,
  opts: { shift: boolean; alt: boolean },
): string | undefined {
  const legend = layout.legends[code]
  if (!legend) {
    return undefined
  }
  if (opts.alt && legend.alt !== undefined) {
    return legend.alt
  }
  if (opts.shift) {
    return legend.shift
  }
  return legend.base
}
