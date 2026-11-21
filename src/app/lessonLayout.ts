import { resolveFocus } from '../domain/keyZones'
import { getLayout } from '../domain/layout'
import { languageConfig } from '../domain/languages'
import type { Code, ContentLanguage, Layout, LayoutId } from '../domain/types'
import type { LessonMeta } from '../domain/lessons/types'

export function resolveLessonLayout(
  language: ContentLanguage,
  lessonLayoutId: LayoutId,
  selectedLayoutId: LayoutId,
): Layout {
  const prefix = languageConfig(language).layoutFamilyPrefix
  const id = selectedLayoutId.startsWith(prefix)
    ? selectedLayoutId
    : lessonLayoutId
  return getLayout(id)
}

export function mapFocusCodes(
  meta: LessonMeta,
  layout: Layout,
): Code[] | undefined {
  return resolveFocus(meta, layout)?.codes
}
