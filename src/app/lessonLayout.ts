import { codeForChar, getLayout } from '../domain/layout'
import type { Code, ContentLanguage, Layout, LayoutId } from '../domain/types'

const FAMILY_PREFIX: Record<ContentLanguage, string> = {
  en: 'us-',
  ru: 'ru-',
}

export function resolveLessonLayout(
  language: ContentLanguage,
  lessonLayoutId: LayoutId,
  selectedLayoutId: LayoutId,
): Layout {
  const prefix = FAMILY_PREFIX[language]
  const id = selectedLayoutId.startsWith(prefix)
    ? selectedLayoutId
    : lessonLayoutId
  return getLayout(id)
}

export function mapFocusCodes(
  focusCodes: readonly Code[] | undefined,
  from: Layout,
  to: Layout,
): Code[] | undefined {
  if (focusCodes === undefined) {
    return undefined
  }
  const mapped: Code[] = []
  for (const code of focusCodes) {
    const base = from.legends[code]?.base
    const next = base === undefined ? code : (codeForChar(to, base) ?? code)
    if (!mapped.includes(next)) {
      mapped.push(next)
    }
  }
  return mapped
}
