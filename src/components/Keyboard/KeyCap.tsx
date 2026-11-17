import { memo } from 'react'
import type { Code } from '../../domain/types'
import { gridPlacement } from './keyboardModel'
import type { KeyCapModel } from './keyboardModel'

export interface KeyCapProps {
  model: KeyCapModel
  focused: boolean
  label?: string
  onMount(code: Code, element: HTMLDivElement | null): void
}

export const KeyCap = memo(function KeyCap({
  model,
  focused,
  label,
  onMount,
}: KeyCapProps) {
  const placement = gridPlacement(model)
  const showLabel = model.modifier || model.base === ' '

  return (
    <div
      ref={(element) => onMount(model.code, element)}
      className="keycap"
      data-code={model.code}
      data-state={model.used ? 'rest' : 'wrong-layout'}
      data-finger={model.finger}
      data-focused={focused ? 'true' : 'false'}
      data-shift="inactive"
      style={{
        gridColumn: `${placement.columnStart} / span ${placement.columnSpan}`,
        gridRow: `${placement.row} / span ${placement.rowSpan}`,
      }}
    >
      {showLabel ? (
        <span className="keycap-label">{label ?? model.code}</span>
      ) : (
        <>
          <span className="keycap-legend keycap-base">{model.base}</span>
          {model.shift !== undefined && model.shift !== model.base && (
            <span className="keycap-legend keycap-shift">{model.shift}</span>
          )}
        </>
      )}
    </div>
  )
})
