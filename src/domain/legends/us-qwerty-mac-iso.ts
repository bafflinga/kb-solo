import type { Code, Legend } from '../types'
import { usQwertyMacLegends } from './us-qwerty-mac'

export const usQwertyMacIsoLegends: Record<Code, Legend> = {
  ...usQwertyMacLegends,
  Backquote: { base: '§', shift: '±' },
  Backslash: { base: '\\', shift: '|' },
  IntlBackslash: { base: '`', shift: '~' },
}
