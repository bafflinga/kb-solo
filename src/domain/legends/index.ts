import type { Code, LayoutId, Legend } from '../types'
import { ruJcukenMacIsoLegends } from './ru-jcuken-mac-iso'
import { ruJcukenMacLegends } from './ru-jcuken-mac'
import { ruJcukenLegends } from './ru-jcuken'
import { usQwertyMacIsoLegends } from './us-qwerty-mac-iso'
import { usQwertyMacLegends } from './us-qwerty-mac'
import { usQwertyLegends } from './us-qwerty'

export const LEGEND_SETS: Readonly<Record<LayoutId, Record<Code, Legend>>> = {
  'us-qwerty': usQwertyLegends,
  'us-qwerty-mac': usQwertyMacLegends,
  'us-qwerty-mac-iso': usQwertyMacIsoLegends,
  'ru-jcuken': ruJcukenLegends,
  'ru-jcuken-mac': ruJcukenMacLegends,
  'ru-jcuken-mac-iso': ruJcukenMacIsoLegends,
}
