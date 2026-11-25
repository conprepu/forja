import { useState } from 'react'
import { BARS, BARS_LB, warmupSets, type WarmupSet } from '../../lib/plates'
import { fromKg, parseDecimal, toKg, type WeightUnit } from '../../lib/units'
import { btn, btnPri, field } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  exerciseName: string
  /** Peso de trabajo en kg (como se guarda). */
  initialKg?: number
  unit?: WeightUnit
  onAdd: (sets: WarmupSet[]) => void
}

export function WarmupSheet({ open, onClose, exerciseName, initialKg, unit = 'kg', onAdd }: Props) {
  const lb = unit === 'lb'
  const bars: readonly number[] = lb ? BARS_LB : BARS
  const [text, setText] = useState(initialKg ? String(fromKg(initialKg, unit)) : '')
  const [bar, setBar] = useState<number>(bars[0]!)
  // los pesos se calculan y se muestran en la unidad del ejercicio; al agregarlos se guardan en kg
  const sets = warmupSets(parseDecimal(text) ?? 0, bar, lb ? { step: 5, minForBar: 135 } : undefined)

  return (
    <Sheet open={open} onClose={onClose} title="Calentamiento">
      <p className="mb-3 text-sm text-mut">{exerciseName}</p>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm text-mut">
          Peso de trabajo ({unit})
          <input
            className={`${field} text-center font-num text-xl font-bold text-ink`}
            inputMode="decimal"
            placeholder={lb ? 'Ej. 180' : 'Ej. 80'}
            value={text}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ''))}
          />
        </label>
        <div role="group" aria-label="Barra" className="grid grid-cols-3 gap-2">
          {bars.map((b) => (
            <button key={b} type="button" aria-pressed={bar === b} className={`${btn} ${bar === b ? 'bg-ink text-bg' : ''}`} onClick={() => setBar(b)}>
              Barra {b} {unit}
            </button>
          ))}
        </div>
        <div className="hud p-4" aria-live="polite">
          {sets.length ? (
            <ol className="grid gap-1">
              {sets.map((s, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-c">C</span>
                  <span className="font-num font-bold">{s.kg} {unit} × {s.reps}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-mut">Escribe un peso de trabajo mayor que la barra.</p>
          )}
        </div>
        <button
          type="button"
          className={btnPri}
          disabled={sets.length === 0}
          onClick={() => {
            onAdd(sets.map((s) => ({ ...s, kg: toKg(s.kg, unit) })))
            onClose()
          }}
        >
          Agregar {sets.length || ''} {sets.length === 1 ? 'serie' : 'series'} de calentamiento
        </button>
      </div>
    </Sheet>
  )
}
