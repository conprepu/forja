import { COLORS, type ColorName } from '../db/types'
import { WEEK_ORDER, WEEKDAY_NAMES, WEEKDAY_SHORT } from '../lib/dates'
import f from './Form.module.css'

export function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className={f.segmented} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={f.segment} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  return (
    <div className={f.days} role="group" aria-label="Días de la semana">
      {WEEK_ORDER.map((d) => {
        const on = value.includes(d)
        return (
          <button
            key={d}
            type="button"
            className={f.day}
            aria-pressed={on}
            aria-label={WEEKDAY_NAMES[d]}
            // No permitir dejar la selección vacía
            onClick={() => onChange(on ? (value.length > 1 ? value.filter((x) => x !== d) : value) : [...value, d].sort())}
          >
            {WEEKDAY_SHORT[d]}
          </button>
        )
      })}
    </div>
  )
}

const COLOR_LABEL: Record<ColorName, string> = {
  blue: 'Azul', red: 'Rojo', orange: 'Naranja', yellow: 'Amarillo', green: 'Verde',
  teal: 'Turquesa', indigo: 'Índigo', purple: 'Morado', pink: 'Rosa', gray: 'Gris',
}

export function ColorPicker({ value, onChange }: { value: ColorName; onChange: (c: ColorName) => void }) {
  return (
    <div className={f.colors} role="group" aria-label="Color">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={f.color}
          style={{ background: `var(--${c})`, ['--c' as string]: `var(--${c})` }}
          aria-pressed={c === value}
          aria-label={COLOR_LABEL[c]}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  )
}

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className={f.stepper} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Menos">−</button>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Más">+</button>
    </div>
  )
}
