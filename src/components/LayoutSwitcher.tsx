import { layoutsForLanguage } from '../domain/layout'
import type { ContentLanguage, LayoutId } from '../domain/types'

interface LayoutSwitcherProps {
  value: LayoutId
  language: ContentLanguage
  label: string
  onChange(layoutId: LayoutId): void
}

export function LayoutSwitcher({
  value,
  language,
  label,
  onChange,
}: LayoutSwitcherProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as LayoutId)}
      >
        {layoutsForLanguage(language).map((layout) => (
          <option key={layout.id} value={layout.id}>
            {layout.displayName}
          </option>
        ))}
      </select>
    </label>
  )
}
