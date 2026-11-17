import type { Code, Legend } from '../types'
import { usQwertyLegends } from './us-qwerty'

export const usQwertyMacLegends: Record<Code, Legend> = {
  ...usQwertyLegends,
}
