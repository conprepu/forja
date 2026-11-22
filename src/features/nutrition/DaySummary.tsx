import { addWater } from '../../db/nutrition'
import { db } from '../../db/db'
import type { Goals, Macros } from '../../db/schema'
import { ML_PER_GLASS, progress } from '../../lib/nutrition'
import { btn, card } from '../../ui/cls'
import { Ring } from '../../ui/Ring'

const MACROS = [
  { key: 'p', label: 'Proteína', bar: 'bg-p', text: 'text-p' },
  { key: 'c', label: 'Carbos', bar: 'bg-c', text: 'text-c' },
  { key: 'f', label: 'Grasa', bar: 'bg-f', text: 'text-f' },
] as const

interface Props {
  date: string
  eaten: Macros
  goals: Goals
  waterMl: number
}

export function DaySummary({ date, eaten, goals, waterMl }: Props) {
  const glasses = Math.max(1, Math.round(goals.waterMl / ML_PER_GLASS))
  const filled = Math.floor(waterMl / ML_PER_GLASS)

  return (
    <>
      <section className={`${card} grid grid-cols-[auto_1fr] items-center gap-4`} aria-label="Resumen del día">
        <Ring value={eaten.kcal} goal={goals.kcal} label={`${eaten.kcal} de ${goals.kcal} kcal`} />
        <div className="grid gap-2.5">
          <p className="text-sm text-mut">
            <b className="font-num text-base text-ink">{eaten.kcal.toLocaleString('es-MX')}</b> / {goals.kcal.toLocaleString('es-MX')} kcal
          </p>
          {MACROS.map((m) => (
            <div key={m.key}>
              <div className="flex justify-between text-sm">
                <span>{m.label}</span>
                <span>
                  <b className={`font-num ${m.text}`}>{Math.round(eaten[m.key])}</b>
                  <span className="text-mut"> / {goals[m.key]} g</span>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={m.label}
                aria-valuemin={0}
                aria-valuemax={goals[m.key]}
                aria-valuenow={Math.round(eaten[m.key])}
                className="mt-1 h-2 overflow-hidden rounded-full bg-soft"
              >
                <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${progress(eaten[m.key], goals[m.key]) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={card} aria-label="Agua">
        <div className="flex items-baseline gap-2">
          <h3 className="flex-1">Agua</h3>
          <span className="text-sm text-mut">{waterMl} / {goals.waterMl} ml</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Array.from({ length: Math.max(glasses, filled) }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={i < filled ? `Quitar vaso ${i + 1}` : `Agregar vaso ${i + 1}`}
              aria-pressed={i < filled}
              onClick={() => void addWater(db, date, i < filled ? -ML_PER_GLASS : ML_PER_GLASS)}
              className={`h-11 w-11 rounded-xl ${i < filled ? 'bg-acc' : 'bg-soft'}`}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className={btn} onClick={() => void addWater(db, date, 500)}>+ 500 ml</button>
          <button type="button" className={btn} disabled={waterMl === 0} onClick={() => void addWater(db, date, -ML_PER_GLASS)}>− 250 ml</button>
        </div>
      </section>
    </>
  )
}
