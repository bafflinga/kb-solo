import { resolveFocus } from '../domain/keyZones'
import { makeProvider } from '../domain/lessons/curriculum'
import type { LessonContentMap, LessonMeta } from '../domain/lessons/types'
import type { Code, Layout } from '../domain/types'

const IGNORED_CODES: ReadonlySet<Code> = new Set<Code>(['Space', 'Enter'])

export function usedCodesForLesson(
  meta: LessonMeta,
  contentMap: LessonContentMap | undefined,
  layout: Layout,
): Code[] {
  const focusCodes = (resolveFocus(meta, layout)?.codes ?? []).filter(
    (code) => !IGNORED_CODES.has(code),
  )
  if (focusCodes.length > 0) {
    return focusCodes
  }

  const codes = new Set<Code>()
  const content = contentMap?.[meta.id]
  if (content) {
    try {
      const provider = makeProvider(meta, content)
      for (let index = 0; index < provider.templateCount; index += 1) {
        for (const cue of provider.createCues(layout, {
          variantIndex: index,
        })) {
          for (const char of cue.chars) {
            if (char.code && !IGNORED_CODES.has(char.code)) {
              codes.add(char.code)
            }
          }
        }
      }
    } catch {
      codes.clear()
    }
  }
  return [...codes]
}
