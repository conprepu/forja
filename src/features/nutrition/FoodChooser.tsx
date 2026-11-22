import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../../db/db'
import type { Food } from '../../db/schema'
import { searchFoods } from '../../lib/nutrition'
import { field } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'

/** Lista simple para elegir un alimento (ingredientes de recetas). */
export function FoodChooser({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (f: Food) => void }) {
  const foods = useLiveQuery(() => db.foods.toArray(), [])
  const [q, setQ] = useState('')
  const list = useMemo(() => searchFoods(foods ?? [], q).slice(0, 60), [foods, q])

  return (
    <Sheet open={open} onClose={onClose} title="Elegir ingrediente">
      <input type="search" className={field} placeholder="Buscar alimento" aria-label="Buscar alimento" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-1">
        {list.map((f) => (
          <li key={f.id} className="border-t border-line">
            <button
              type="button"
              className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
              onClick={() => {
                onPick(f)
                setQ('')
                onClose()
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{f.name}</span>
                <span className="block truncate text-xs text-mut">{f.brand ? `${f.brand} · ` : ''}{f.per100.kcal} kcal / 100 g</span>
              </span>
              <span aria-hidden="true" className="text-xl text-acc">+</span>
            </button>
          </li>
        ))}
      </ul>
      {foods && list.length === 0 && <p className="py-6 text-center text-mut">Sin resultados.</p>}
    </Sheet>
  )
}
