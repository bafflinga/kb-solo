import { LOCALES } from '../i18n'
import type { UiLocale } from '../i18n'

interface LanguageSwitcherProps {
  locale: UiLocale
  onChange(locale: UiLocale): void
  label: string
}

export function LanguageSwitcher({
  locale,
  onChange,
  label,
}: LanguageSwitcherProps) {
  return (
    <div className="language-switcher" role="group" aria-label={label}>
      {LOCALES.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={value === locale}
          className={value === locale ? 'chip active' : 'chip'}
          onClick={(event) => {
            event.currentTarget.blur()
            onChange(value)
          }}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
