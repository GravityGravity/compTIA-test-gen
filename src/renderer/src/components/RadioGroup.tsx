import type { KeyboardEvent } from 'react'

export interface RadioOption {
  value: string
  label: string
  detail: string
  disabled?: boolean
}

interface RadioGroupProps {
  labelledBy: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
}

/** A list of radio cards (`.choice`). Arrow keys move between the enabled options. */
export function RadioGroup({ labelledBy, options, value, onChange }: RadioGroupProps) {
  const enabled = options.filter((o) => !o.disabled)

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!step || enabled.length === 0) return
    e.preventDefault()
    const at = enabled.findIndex((o) => o.value === value)
    const next = enabled[(at + step + enabled.length) % enabled.length]!
    onChange(next.value)
    document.getElementById(`${labelledBy}-${next.value}`)?.focus()
  }

  return (
    <div className="stack-2" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {options.map((o) => (
        <button
          key={o.value}
          id={`${labelledBy}-${o.value}`}
          type="button"
          className="choice"
          role="radio"
          aria-checked={o.value === value}
          aria-disabled={o.disabled || undefined}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => !o.disabled && onChange(o.value)}
        >
          <span className="dot" />
          <span className="stack-2">
            <span className="h4">{o.label}</span>
            <span className="small">{o.detail}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
