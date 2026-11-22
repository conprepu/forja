import { useEffect, useState } from 'react'
import { parseDecimal } from '../lib/units'

interface Props {
  value: number | null
  onChange: (v: number | null) => void
  /** Con decimales (peso) o solo enteros (reps). */
  decimal?: boolean
  placeholder?: string
  label: string
  className?: string
}

/**
 * Campo numérico con teclado numérico de iOS. Guarda el texto aparte para no perder "82." o "82,"
 * mientras se escribe, y se resincroniza si el valor cambia desde fuera (p. ej. al copiar "Anterior").
 */
export function NumField({ value, onChange, decimal = false, placeholder, label, className = '' }: Props) {
  const [text, setText] = useState(value == null ? '' : String(value))

  useEffect(() => {
    setText((t) => (parseDecimal(t) === value ? t : value == null ? '' : String(value)))
  }, [value])

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      autoComplete="off"
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const t = e.target.value.replace(decimal ? /[^\d.,]/g : /\D/g, '')
        setText(t)
        onChange(parseDecimal(t))
      }}
      className={`h-11 w-full rounded-xl border border-transparent bg-soft px-1 text-center font-semibold placeholder:font-normal placeholder:text-mut ${className}`}
    />
  )
}
