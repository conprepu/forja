import { useState } from 'react'
import type { Food, FoodEntry } from '../../db/schema'
import { entryFromFood } from '../../lib/nutrition'
import { btn, btnGhost, btnPri, chip } from '../../ui/cls'
import { NumField } from '../../ui/NumField'

interface Props {
  food: Food
  initialGrams?: number
  confirmLabel: string
  onConfirm: (entry: FoodEntry) => void
  onBack: () => void
}

const MACROS = [
  ['Proteína', 'p', 'text-p'],
  ['Carbohidratos', 'c', 'text-c'],
  ['Grasa', 'f', 'text-f'],
] as const

/** Elige cuántos gramos (o porciones) y muestra los macros en vivo. */
export function FoodAmount({ food, initialGrams, confirmLabel, onConfirm, onBack }: Props) {
  const [grams, setGrams] = useState<number | null>(initialGrams ?? food.servings[0]?.grams ?? 100)
  const g = grams ?? 0
  const entry = entryFromFood(food, g)

  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-2">
        <button type="button" className={btnGhost} onClick={onBack}>‹ Atrás</button>
      </div>
      <div>
        <h3>{food.name}</h3>
        {food.brand && <p className="text-sm text-mut">{food.brand}</p>}
        <p className="text-xs text-mut">Por 100 g: {food.per100.kcal} kcal · P {food.per100.p} · C {food.per100.c} · G {food.per100.f}</p>
      </div>

      <label className="grid gap-1 text-sm text-mut">
        Cantidad (g)
        <NumField decimal label="Gramos" value={grams} placeholder="0" onChange={setGrams} className="!h-12 !text-lg" />
      </label>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Porciones">
        {[{ label: '100 g', grams: 100 }, ...food.servings].map((s) => (
          <button key={`${s.label}-${s.grams}`} type="button" aria-pressed={g === s.grams} className={`${chip} ${g === s.grams ? 'bg-ink text-bg' : ''}`} onClick={() => setGrams(s.grams)}>
            {s.label}{s.label.endsWith('g') && s.label.startsWith(String(s.grams)) ? '' : ` · ${s.grams} g`}
          </button>
        ))}
      </div>

      <div className="rounded-[18px] border border-line bg-card p-4" aria-live="polite">
        <p className="font-num text-3xl font-extrabold">{entry.kcal} <span className="text-base font-semibold text-mut">kcal</span></p>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          {MACROS.map(([label, key, color]) => (
            <div key={key}>
              <dt className="text-xs text-mut">{label}</dt>
              <dd className={`font-num text-lg font-bold ${color}`}>{entry[key]} g</dd>
            </div>
          ))}
        </dl>
      </div>

      <button type="button" className={btnPri} disabled={g <= 0} onClick={() => onConfirm(entry)}>
        {confirmLabel}
      </button>
      <button type="button" className={btn} onClick={onBack}>Cancelar</button>
    </div>
  )
}
