import { memo, useMemo } from 'react'
import type { Code, Layout } from '../../domain/types'
import { KeyCap } from './KeyCap'
import { buildKeyboardKeys } from './keyboardModel'
import type { KeyboardController } from './keyboardController'
import './keyboard.css'

export interface KeyboardProps {
  layout: Layout
  controller: KeyboardController
  focusCodes?: readonly Code[]
  labels?: Partial<Record<Code, string>>
}

export const Keyboard = memo(function Keyboard({
  layout,
  controller,
  focusCodes,
  labels,
}: KeyboardProps) {
  const models = useMemo(() => buildKeyboardKeys(layout), [layout])
  const focusSet = useMemo(() => new Set(focusCodes ?? []), [focusCodes])

  return (
    <div className="keyboard" aria-hidden="true">
      {models.map((model) => (
        <KeyCap
          key={model.code}
          model={model}
          focused={focusSet.has(model.code)}
          label={labels?.[model.code]}
          onMount={controller.attach}
        />
      ))}
    </div>
  )
})
