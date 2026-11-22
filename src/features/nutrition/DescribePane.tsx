import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../db/db'
import { addEntry, getRecentFoodIds } from '../../db/nutrition'
import type { DiarySlot } from '../../db/schema'
import { describeMeal, withFood, type DescribedItem } from '../../lib/describe'
import { entryFromFood, macrosFor, sumMacros } from '../../lib/nutrition'
import { btn, btnPri, field } from '../../ui/cls'
import { NumField } from '../../ui/NumField'
import { FoodChooser } from './FoodChooser'

interface Props {
  date: string
  slot: DiarySlot
  slotLabel: string
  onAdded: (name: string) => void
  onDone: () => void
}

/** "Registrar comiendo": describes lo que comiste y se interpreta contra tu base de alimentos, sin enviar nada fuera. */
export function DescribePane({ date, slot, slotLabel, onAdded, onDone }: Props) {
  const foods = useLiveQuery(() => db.foods.toArray(), [])
  const recent = useLiveQuery(() => getRecentFoodIds(db), [])
  const [text, setText] = useState('')
  const [items, setItems] = useState<DescribedItem[] | null>(null)
  const [choosing, setChoosing] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const found = (items ?? []).filter((i) => i.food && i.grams > 0)
  const total = sumMacros(found.map((i) => macrosFor(i.food!.per100, i.grams)))

  const update = (idx: number, patch: Partial<DescribedItem>) => setItems((xs) => xs?.map((x, k) => (k === idx ? { ...x, ...patch } : x)) ?? null)

  async function addAll() {
    setSaving(true)
    try {
      for (const i of found) await addEntry(db, date, slot, entryFromFood(i.food!, i.grams))
      onAdded(found.length === 1 ? found[0]!.food!.name : `${found.length} alimentos`)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm text-mut">
        ¿Qué comiste?
        <textarea
          className={`${field} min-h-28 resize-none py-2.5 text-ink`}
          rows={4}
          placeholder="Ej. 2 huevos con 3 tortillas y un vaso de leche"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <p className="-mt-1 text-xs text-mut">Puedes dictar con el micrófono del teclado. Se interpreta en tu teléfono, sin enviar nada a internet.</p>
      <button type="button" className={btnPri} disabled={!text.trim() || !foods} onClick={() => setItems(describeMeal(text, foods ?? [], recent ?? []))}>
        Interpretar
      </button>

      {items && items.length === 0 && <p role="status" className="py-2 text-center text-mut">No entendí qué comiste. Prueba con algo como “150 g de pollo y una taza de arroz”.</p>}

      {items && items.length > 0 && (
        <>
          <ul className="grid gap-2" aria-label="Alimentos interpretados">
            {items.map((it, idx) => {
              const m = it.food ? macrosFor(it.food.per100, it.grams) : null
              return (
                <li key={idx} className="rounded-[18px] border border-line bg-card p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      {it.food ? (
                        <p className="truncate font-semibold">{it.food.name}</p>
                      ) : (
                        <p className="font-semibold text-warn">No encontré “{it.query}”</p>
                      )}
                      <p className="truncate text-xs text-mut">“{it.text}”</p>
                    </div>
                    <button type="button" className="min-h-11 min-w-11 rounded-xl text-p" aria-label={`Quitar ${it.query}`} onClick={() => setItems((xs) => xs?.filter((_, k) => k !== idx) ?? null)}>
                      ✕
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-[88px_1fr] items-center gap-3">
                    {it.food ? (
                      <>
                        <NumField decimal label={`Gramos de ${it.food.name}`} value={it.grams} placeholder="g" onChange={(g) => update(idx, { grams: g ?? 0, basis: 'peso' })} />
                        <div className="min-w-0 text-sm">
                          <b className="font-num">{m?.kcal} kcal</b>
                          <span className="text-mut"> · P {m?.p} · C {m?.c} · G {m?.f}</span>
                          {it.basis === 'estimado' && <p className="text-xs text-warn">Cantidad aproximada: ajusta los gramos.</p>}
                        </div>
                      </>
                    ) : (
                      <p className="col-span-2 text-sm text-mut">Elige el alimento de tu lista o quítalo.</p>
                    )}
                  </div>
                  <button type="button" className={`${btn} mt-2 w-full`} onClick={() => setChoosing(idx)}>
                    {it.food ? 'Cambiar alimento' : 'Elegir alimento'}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="rounded-[18px] border border-line bg-card p-4" aria-live="polite">
            <p className="font-num text-2xl font-extrabold">{total.kcal} <span className="text-base font-semibold text-mut">kcal</span></p>
            <p className="text-sm"><span className="text-p">P {total.p}</span> · <span className="text-c">C {total.c}</span> · <span className="text-f">G {total.f}</span></p>
          </div>
          <button type="button" className={btnPri} disabled={found.length === 0 || saving} onClick={() => void addAll()}>
            Agregar {found.length} a {slotLabel}
          </button>
        </>
      )}

      <FoodChooser
        open={choosing != null}
        onClose={() => setChoosing(null)}
        onPick={(f) => {
          const cur = choosing != null ? items?.[choosing] : undefined
          if (choosing != null && cur) update(choosing, withFood(cur, f))
        }}
      />
    </div>
  )
}
