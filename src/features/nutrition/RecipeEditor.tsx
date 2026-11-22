import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { saveRecipe } from '../../db/recipes'
import type { Recipe } from '../../db/schema'
import { recipeTotals } from '../../lib/nutrition'
import { btn, btnPri, field } from '../../ui/cls'
import { NumField } from '../../ui/NumField'
import { Sheet } from '../../ui/Sheet'
import { FoodChooser } from './FoodChooser'
import { useFoodMap } from './hooks'

interface Props {
  open: boolean
  recipe?: Recipe | null
  onClose: () => void
}

type Ing = { foodId: string; grams: number | null }

export function RecipeEditor({ open, recipe, onClose }: Props) {
  const foods = useFoodMap()
  const [name, setName] = useState('')
  const [servings, setServings] = useState<number | null>(1)
  const [ings, setIngs] = useState<Ing[]>([])
  const [choosing, setChoosing] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(recipe?.name ?? '')
    setServings(recipe?.servings ?? 1)
    setIngs(recipe ? recipe.ingredients.map((i) => ({ ...i })) : [])
  }, [open, recipe])

  const totals = recipeTotals({ servings: servings ?? 1, ingredients: ings.map((i) => ({ foodId: i.foodId, grams: i.grams ?? 0 })) }, foods)

  return (
    <>
      <Sheet open={open} onClose={onClose} title={recipe ? 'Editar receta' : 'Nueva receta'}>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm text-mut">
            Nombre
            <input className={`${field} text-ink`} value={name} placeholder="Ej. Bowl de pollo y arroz" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm text-mut">
            Porciones que rinde
            <NumField decimal label="Porciones" value={servings} onChange={setServings} />
          </label>

          <h3>Ingredientes</h3>
          {ings.length === 0 && <p className="rounded-[18px] border border-line bg-card px-3 py-5 text-center text-mut">Agrega los ingredientes con su peso.</p>}
          {ings.map((ing, i) => (
            <div key={i} className="grid grid-cols-[1fr_84px_44px] items-center gap-2">
              <span className="min-w-0 truncate font-semibold">{foods.get(ing.foodId)?.name ?? 'Alimento eliminado'}</span>
              <NumField decimal label={`Gramos de ${foods.get(ing.foodId)?.name ?? 'ingrediente'}`} placeholder="g" value={ing.grams} onChange={(g) => setIngs((xs) => xs.map((x, k) => (k === i ? { ...x, grams: g } : x)))} />
              <button type="button" className={`${btn} px-0 text-p`} aria-label="Quitar ingrediente" onClick={() => setIngs((xs) => xs.filter((_, k) => k !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className={btn} onClick={() => setChoosing(true)}>+ Agregar ingrediente</button>

          <div className="rounded-[18px] border border-line bg-card p-4" aria-live="polite">
            <p className="text-sm text-mut">Por porción ({Math.round(totals.grams / Math.max(1, servings ?? 1))} g aprox.)</p>
            <p className="font-num text-2xl font-extrabold">{totals.perServing.kcal} <span className="text-base font-semibold text-mut">kcal</span></p>
            <p className="text-sm">
              <span className="text-p">P {totals.perServing.p}</span> · <span className="text-c">C {totals.perServing.c}</span> · <span className="text-f">G {totals.perServing.f}</span>
            </p>
            {totals.missing.length > 0 && <p className="mt-1 text-xs text-warn">Hay ingredientes eliminados que no se están contando.</p>}
          </div>

          <button
            type="button"
            className={btnPri}
            disabled={ings.every((i) => !i.grams)}
            onClick={async () => {
              await saveRecipe(db, { ...(recipe ? { id: recipe.id } : {}), name, servings: servings ?? 1, ingredients: ings.map((i) => ({ foodId: i.foodId, grams: i.grams ?? 0 })) })
              onClose()
            }}
          >
            Guardar receta
          </button>
        </div>
      </Sheet>
      <FoodChooser open={choosing} onClose={() => setChoosing(false)} onPick={(f) => setIngs((xs) => [...xs, { foodId: f.id, grams: f.servings[0]?.grams ?? 100 }])} />
    </>
  )
}
