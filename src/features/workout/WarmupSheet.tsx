import { useState } from 'react'
import { BARS, warmupSets, type WarmupSet } from '../../lib/plates'
import { parseDecimal } from '../../lib/units'
import { btn, btnPri, field } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  exerciseName: string
  initialKg?: number
  onAdd: (sets: WarmupSet[]) => void
}

export function WarmupSheet({ open, onClose, exerciseName, initialKg, onAdd }: Props) {
  const [text, setText] = useState(initialKg ? String(initialKg) : '')
  const [bar, setBar] = useState<number>(20)
  const sets = warmupSets(parseDecimal(text) ?? 0, bar)

  return (
    <Sheet open={open} onClose={onClose} title="Calentamiento">
      <p className="mb-3 text-sm text-mut">{exerciseName}</p>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm text-mut">
          Peso de trabajo (kg)
          <input
            className={`${field} text-center font-num text-xl font-bold text-ink`}
            inputMode="decimal"
            placeholder="Ej. 80"
            value={text}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ''))}
          />
        </label>
        <div role="group" aria-label="Barra" className="grid grid-cols-3 gap-2">
          {BARS.map((b) => (
            <button key={b} type="button" aria-pressed={bar === b} className={`${btn} ${bar === b ? 'bg-ink text-bg' : ''}`} onClick={() => setBar(b)}>
              Barra {b} kg
            </button>
          ))}
        </div>
        <div className="hud p-4" aria-live="polite">
          {sets.length ? (
            <ol className="grid gap-1">
              {sets.map((s, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-c">C</span>
                  <span className="font-num font-bold">{s.kg} kg × {s.reps}</span>
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
            onAdd(sets)
            onClose()
          }}
        >
          Agregar {sets.length || ''} {sets.length === 1 ? 'serie' : 'series'} de calentamiento
        </button>
      </div>
    </Sheet>
  )
}
