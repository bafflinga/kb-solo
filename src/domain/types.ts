export type Finger =
  'lp' | 'lr' | 'lm' | 'li' | 'ri' | 'rm' | 'rr' | 'rp' | 'thumb'

export type Side = 'left' | 'right'

export type Row = 'digits' | 'top' | 'home' | 'bottom'

export type KeyLevel = 'base' | 'shift' | 'alt'

export type Code = string

export type LayoutId =
  | 'us-qwerty'
  | 'us-qwerty-mac'
  | 'us-qwerty-mac-iso'
  | 'ru-jcuken'
  | 'ru-jcuken-mac'
  | 'ru-jcuken-mac-iso'

export type { ContentLanguage } from './languages'

export type UiLocale = 'en' | 'ru'

export interface Legend {
  base: string
  shift: string
  alt?: string
}

export interface KeyGeometry {
  x: number
  y: number
  u: number
  h?: number
}

export interface Layout {
  id: LayoutId
  displayName: string
  formFactor: 'ansi' | 'iso'
  legends: Record<Code, Legend>
  geometry: Record<Code, KeyGeometry>
}

export interface CueChar {
  char: string
  code?: Code
  finger?: Finger
  needsShift: boolean
}

export interface Cue {
  kind: 'char' | 'word' | 'line'
  text: string
  chars: CueChar[]
}
