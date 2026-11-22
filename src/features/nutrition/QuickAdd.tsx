import { useState } from 'react'
import type { FoodEntry } from '../../db/schema'
import { quickEntry } from '../../lib/nutrition'
import { btnPri, field } from '../../ui/cls'
import { NumField } from '../../ui/NumField'

type N = number | null

interface Props {
  initial?: FoodEntry
  confirmLabel: string
  onConfirm: (entry: FoodEntry) => void
}

/** Solo kcal y macros, sin alimento. */
export function QuickAdd({ initial, confirmLabel, onConfirm }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [v, setV] = useState<{ kcal: N; p: N; c: N; f: N }>({
    kcal: initial?.kcal ?? null,
    p: initial ? initial.p : null,
    c: initial ? initial.c : null,
    f: initial ? initial.f : null,
  })

  const num = (label: string, key: 'kcal' | 'p' | 'c' | 'f') => (
    <label className="grid gap-1 text-sm text-mut">
      {label}
      <NumField decimal label={label} value={v[key]} onChange={(x) => setV((s) => ({ ...s, [key]: x }))} />
    </label>
  )

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm text-mut">
        Nombre (opcional)
        <input className={`${field} text-ink`} value={name} placeholder="Agregado rápido" onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        {num('Calorías (kcal)', 'kcal')}
        {num('Proteína (g)', 'p')}
        {num('Carbohidratos (g)', 'c')}
        {num('Grasa (g)', 'f')}
      </div>
      <button
        type="button"
        className={btnPri}
        disabled={!v.kcal || v.kcal <= 0}
        onClick={() => {
          const e = quickEntry({ name, kcal: v.kcal ?? 0, p: v.p ?? 0, c: v.c ?? 0, f: v.f ?? 0 })
          // al editar una entrada con alimento se conserva su vínculo
          onConfirm(initial?.foodId ? { ...e, foodId: initial.foodId, ...(initial.grams ? { grams: initial.grams } : {}) } : e)
        }}
      >
        {confirmLabel}
      </button>
    </div>
  )
}
