import type { Code, Legend } from '../types'
import { ruJcukenMacLegends } from './ru-jcuken-mac'

export const ruJcukenMacIsoLegends: Record<Code, Legend> = {
  ...ruJcukenMacLegends,
  Backquote: { base: '>', shift: '<' },
  Backslash: { base: 'ё', shift: 'Ё' },
  IntlBackslash: { base: ']', shift: '[' },
}
