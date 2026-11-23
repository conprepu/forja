import { useState } from 'react'
import { BARS, platesPerSide } from '../../lib/plates'
import { parseDecimal } from '../../lib/units'
import { btn, field } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  initialKg?: number
}

export function PlateSheet({ open, onClose, initialKg }: Props) {
  const [text, setText] = useState(String(initialKg ?? 60))
  const [bar, setBar] = useState<number>(20)
  const kg = parseDecimal(text) ?? 0
  const r = platesPerSide(kg, bar)
  const step = (d: number) => setText(String(Math.max(0, kg + d)))

  return (
    <Sheet open={open} onClose={onClose} title="Calculadora de discos">
      <div className="grid gap-3">
        <div className="grid grid-cols-[44px_1fr_44px] items-end gap-2">
          <button type="button" className={`${btn} px-0`} aria-label="Restar 5 kg" onClick={() => step(-5)}>−5</button>
          <label className="grid gap-1 text-sm text-mut">
            Peso total (kg)
            <input
              className={`${field} text-center font-num text-xl font-bold text-ink`}
              inputMode="decimal"
              value={text}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ''))}
            />
          </label>
          <button type="button" className={`${btn} px-0`} aria-label="Sumar 5 kg" onClick={() => step(5)}>+5</button>
        </div>
        <div role="group" aria-label="Barra" className="grid grid-cols-3 gap-2">
          {BARS.map((b) => (
            <button key={b} type="button" aria-pressed={bar === b} className={`${btn} ${bar === b ? 'bg-ink text-bg' : ''}`} onClick={() => setBar(b)}>
              Barra {b} kg
            </button>
          ))}
        </div>

        <div className="hud p-4" aria-live="polite">
          {kg < bar ? (
            <p className="text-mut">El peso es menor que la barra ({bar} kg).</p>
          ) : (
            <>
              <p className="text-sm text-mut">
                Por lado: <b className="font-num text-ink">{r.perSide} kg</b>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {r.plates.length ? (
                  r.plates.map((p, i) => (
                    <span
                      key={i}
                      style={{ width: 28 + p * 1.6, height: 44 + p * 2 }}
                      className={`inline-flex items-center justify-center rounded-lg font-num text-[13px] font-bold text-bg ${p >= 20 ? 'bg-acc' : p >= 10 ? 'bg-ink' : 'bg-mut'}`}
                    >
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="text-mut">Solo la barra</span>
                )}
              </div>
              {r.leftover > 0 && (
                <p className="mt-3 text-sm text-warn">Sobran {r.leftover} kg por lado que no se pueden cargar con discos estándar.</p>
              )}
            </>
          )}
        </div>
      </div>
    </Sheet>
  )
}
