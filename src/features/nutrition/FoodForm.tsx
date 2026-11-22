import { useState } from 'react'
import { db } from '../../db/db'
import { saveCustomFood } from '../../db/nutrition'
import type { Food } from '../../db/schema'
import { btn, btnPri, field } from '../../ui/cls'
import { NumField } from '../../ui/NumField'

interface Props {
  onCreated: (food: Food) => void
  onCancel: () => void
  /** Código de barras que no se encontró en Open Food Facts, para dejarlo guardado con el alimento. */
  barcode?: string
}

type N = number | null

/** Alimento propio: valores por 100 g y, opcionalmente, una porción. */
export function FoodForm({ onCreated, onCancel, barcode }: Props) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [v, setV] = useState<{ kcal: N; p: N; c: N; f: N; sl: string; sg: N }>({ kcal: null, p: null, c: null, f: null, sl: '', sg: null })
  const ok = name.trim() !== '' && v.kcal != null

  async function save() {
    const sg = v.sg ?? 0
    const food = await saveCustomFood(db, {
      name: name.trim(),
      ...(brand.trim() ? { brand: brand.trim() } : {}),
      ...(barcode ? { barcode } : {}),
      per100: { kcal: v.kcal ?? 0, p: v.p ?? 0, c: v.c ?? 0, f: v.f ?? 0 },
      servings: sg > 0 ? [{ label: v.sl.trim() || `${sg} g`, grams: sg }] : [],
    })
    onCreated(food)
  }

  const num = (label: string, key: 'kcal' | 'p' | 'c' | 'f') => (
    <label className="grid gap-1 text-sm text-mut">
      {label}
      <NumField decimal label={label} value={v[key]} onChange={(x) => setV((s) => ({ ...s, [key]: x }))} />
    </label>
  )

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm text-mut">
        Nombre
        <input className={`${field} text-ink`} value={name} placeholder="Ej. Tamal de rajas" onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="grid gap-1 text-sm text-mut">
        Marca (opcional)
        <input className={`${field} text-ink`} value={brand} onChange={(e) => setBrand(e.target.value)} />
      </label>
      <p className="text-sm font-semibold">Por cada 100 g</p>
      <div className="grid grid-cols-2 gap-2">
        {num('Calorías (kcal)', 'kcal')}
        {num('Proteína (g)', 'p')}
        {num('Carbohidratos (g)', 'c')}
        {num('Grasa (g)', 'f')}
      </div>
      <p className="text-sm font-semibold">Porción (opcional)</p>
      <div className="grid grid-cols-[1fr_100px] gap-2">
        <input className={`${field} text-ink`} aria-label="Nombre de la porción" placeholder="1 tamal" value={v.sl} onChange={(e) => setV((s) => ({ ...s, sl: e.target.value }))} />
        <NumField decimal label="Gramos de la porción" placeholder="g" value={v.sg} onChange={(x) => setV((s) => ({ ...s, sg: x }))} />
      </div>
      <button type="button" className={btnPri} disabled={!ok} onClick={() => void save()}>Guardar alimento</button>
      <button type="button" className={btn} onClick={onCancel}>Cancelar</button>
    </div>
  )
}
