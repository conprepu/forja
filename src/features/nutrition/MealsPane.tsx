import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { addMeal, deleteMeal } from '../../db/nutrition'
import type { DiarySlot } from '../../db/schema'
import { sumMacros } from '../../lib/nutrition'

interface Props {
  date: string
  slot: DiarySlot
  onAdded: (name: string) => void
  onDone: () => void
}

/** Comidas guardadas ("mi desayuno de siempre"): un toque agrega todo. */
export function MealsPane({ date, slot, onAdded, onDone }: Props) {
  const meals = useLiveQuery(() => db.meals.orderBy('name').toArray(), [])

  return (
    <div>
      <ul>
        {(meals ?? []).map((m) => {
          const t = sumMacros(m.entries)
          return (
            <li key={m.id} className="flex items-center border-t border-line">
              <button
                type="button"
                className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left"
                onClick={async () => {
                  await addMeal(db, m, date, slot)
                  onAdded(m.name)
                  onDone()
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.name}</span>
                  <span className="block truncate text-xs text-mut">{m.entries.length} {m.entries.length === 1 ? 'alimento' : 'alimentos'} · {t.kcal} kcal · P {t.p}</span>
                </span>
                <span aria-hidden="true" className="text-xl text-accfg">+</span>
              </button>
              <button
                type="button"
                className="min-h-11 min-w-11 cut-sm text-p"
                aria-label={`Eliminar ${m.name}`}
                onClick={() => window.confirm(`¿Eliminar la comida guardada "${m.name}"?`) && void deleteMeal(db, m.id)}
              >
                ✕
              </button>
            </li>
          )
        })}
      </ul>
      {meals && meals.length === 0 && (
        <p className="py-6 text-center text-mut">Guarda una comida desde el menú ••• de Desayuno, Comida, Cena o Snacks para reutilizarla aquí.</p>
      )}
    </div>
  )
}
