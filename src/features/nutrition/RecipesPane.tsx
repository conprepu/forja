import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../db/db'
import { addEntry } from '../../db/nutrition'
import { deleteRecipe } from '../../db/recipes'
import type { DiarySlot, Recipe } from '../../db/schema'
import { entryFromRecipe, recipeTotals } from '../../lib/nutrition'
import { btn, btnDanger, btnGhost, btnPri } from '../../ui/cls'
import { NumField } from '../../ui/NumField'
import { RecipeEditor } from './RecipeEditor'
import { useFoodMap } from './hooks'

interface Props {
  date: string
  slot: DiarySlot
  slotLabel: string
  onAdded: (name: string) => void
  onDone: () => void
}

export function RecipesPane({ date, slot, slotLabel, onAdded, onDone }: Props) {
  const recipes = useLiveQuery(() => db.recipes.orderBy('name').toArray(), [])
  const foods = useFoodMap()
  const [picked, setPicked] = useState<Recipe | null>(null)
  const [servings, setServings] = useState<number | null>(1)
  const [editor, setEditor] = useState<{ recipe: Recipe | null } | null>(null)

  if (picked) {
    const entry = entryFromRecipe(picked, foods, servings ?? 0)
    return (
      <div className="grid gap-3">
        <button type="button" className={`${btnGhost} justify-self-start`} onClick={() => setPicked(null)}>‹ Atrás</button>
        <h3>{picked.name}</h3>
        <label className="grid gap-1 text-sm text-mut">
          Porciones
          <NumField decimal label="Porciones" value={servings} onChange={setServings} className="!h-12 !text-lg" />
        </label>
        <div className="rounded-[18px] border border-line bg-card p-4" aria-live="polite">
          <p className="font-num text-3xl font-extrabold">{entry.kcal} <span className="text-base font-semibold text-mut">kcal</span></p>
          <p className="text-sm"><span className="text-p">P {entry.p}</span> · <span className="text-c">C {entry.c}</span> · <span className="text-f">G {entry.f}</span></p>
        </div>
        <button
          type="button"
          className={btnPri}
          disabled={!servings || servings <= 0}
          onClick={async () => {
            await addEntry(db, date, slot, entry)
            onAdded(entry.name)
            onDone()
          }}
        >
          Agregar a {slotLabel}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={btn} onClick={() => setEditor({ recipe: picked })}>Editar receta</button>
          <button
            type="button"
            className={btnDanger}
            onClick={async () => {
              if (!window.confirm(`¿Eliminar la receta "${picked.name}"? Tu historial no cambia.`)) return
              await deleteRecipe(db, picked.id)
              setPicked(null)
            }}
          >
            Eliminar
          </button>
        </div>
        <RecipeEditor open={!!editor} recipe={editor?.recipe} onClose={() => { setEditor(null); setPicked(null) }} />
      </div>
    )
  }

  return (
    <div>
      <ul>
        {(recipes ?? []).map((r) => {
          const t = recipeTotals(r, foods)
          return (
            <li key={r.id} className="border-t border-line">
              <button type="button" className="flex min-h-14 w-full items-center gap-3 py-2 text-left" onClick={() => { setPicked(r); setServings(1) }}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="block text-xs text-mut">{r.servings} {r.servings === 1 ? 'porción' : 'porciones'} · {t.perServing.kcal} kcal c/u</span>
                </span>
                <span aria-hidden="true" className="text-xl text-acc">+</span>
              </button>
            </li>
          )
        })}
      </ul>
      {recipes && recipes.length === 0 && <p className="py-6 text-center text-mut">Todavía no tienes recetas.</p>}
      <button type="button" className={`${btnGhost} mt-2 w-full`} onClick={() => setEditor({ recipe: null })}>+ Nueva receta</button>
      <RecipeEditor open={!!editor} recipe={editor?.recipe} onClose={() => setEditor(null)} />
    </div>
  )
}
