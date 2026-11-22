import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../../db/db'
import { addEntry, deleteCustomFood, getRecentFoodIds } from '../../db/nutrition'
import type { DiarySlot, Food } from '../../db/schema'
import { SLOTS, searchFoods } from '../../lib/nutrition'
import { btnGhost, chip, field } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'
import { FoodAmount } from './FoodAmount'
import { FoodForm } from './FoodForm'
import { QuickAdd } from './QuickAdd'

type Tab = 'buscar' | 'recientes' | 'mios' | 'rapido'
const TABS: { value: Tab; label: string }[] = [
  { value: 'buscar', label: 'Buscar' },
  { value: 'recientes', label: 'Recientes' },
  { value: 'mios', label: 'Míos' },
  { value: 'rapido', label: 'Rápido' },
]
const MAX_ROWS = 60

interface Props {
  open: boolean
  onClose: () => void
  date: string
  slot: DiarySlot
  onAdded: (name: string) => void
}

export function AddFoodSheet({ open, onClose, date, slot, onAdded }: Props) {
  const foods = useLiveQuery(() => db.foods.toArray(), [])
  const recent = useLiveQuery(() => getRecentFoodIds(db), [])
  const [tab, setTab] = useState<Tab>('buscar')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Food | null>(null)
  const [creating, setCreating] = useState(false)

  const byId = useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods])
  const list = useMemo(() => {
    const all = foods ?? []
    if (tab === 'recientes') return (recent ?? []).map((id) => byId.get(id)).filter((f): f is Food => !!f)
    const base = tab === 'mios' ? all.filter((f) => f.source === 'custom') : all
    return searchFoods(base, q, recent ?? [])
  }, [foods, recent, byId, tab, q])

  const close = () => {
    setQ('')
    setPicked(null)
    setCreating(false)
    onClose()
  }

  async function add(entry: Parameters<typeof addEntry>[3]) {
    await addEntry(db, date, slot, entry)
    onAdded(entry.name)
    close()
  }

  const slotLabel = SLOTS.find((s) => s.slot === slot)?.label ?? ''
  let body
  if (picked) {
    body = <FoodAmount food={picked} confirmLabel={`Agregar a ${slotLabel}`} onBack={() => setPicked(null)} onConfirm={(e) => void add(e)} />
  } else if (creating) {
    body = <FoodForm onCancel={() => setCreating(false)} onCreated={(f) => { setCreating(false); setPicked(f) }} />
  } else {
    body = (
      <>
        <div role="tablist" aria-label="Origen" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {TABS.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} className={`${chip} ${tab === t.value ? 'bg-ink text-bg' : ''}`} onClick={() => setTab(t.value)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'rapido' ? (
          <QuickAdd confirmLabel={`Agregar a ${slotLabel}`} onConfirm={(e) => void add(e)} />
        ) : (
          <>
            {tab !== 'recientes' && (
              <input type="search" className={field} placeholder="Buscar alimento" aria-label="Buscar alimento" value={q} onChange={(e) => setQ(e.target.value)} />
            )}
            <ul className="mt-1">
              {list.slice(0, MAX_ROWS).map((f) => (
                <li key={f.id} className="flex items-center border-t border-line">
                  <button type="button" onClick={() => setPicked(f)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{f.name}</span>
                      <span className="block truncate text-xs text-mut">
                        {f.brand ? `${f.brand} · ` : ''}{f.servings[0] ? `${f.servings[0].label} · ` : ''}{f.per100.kcal} kcal / 100 g
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-xl text-acc">+</span>
                  </button>
                  {tab === 'mios' && (
                    <button
                      type="button"
                      className="min-h-11 min-w-11 rounded-xl text-p"
                      aria-label={`Eliminar ${f.name}`}
                      onClick={() => window.confirm(`¿Eliminar "${f.name}"? Tu historial no cambia.`) && void deleteCustomFood(db, f.id)}
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {foods && list.length === 0 && (
              <p className="py-6 text-center text-mut">
                {tab === 'recientes' ? 'Aquí aparecerán los alimentos que agregues.' : tab === 'mios' ? 'Todavía no creaste alimentos.' : 'Sin resultados.'}
              </p>
            )}
            {list.length > MAX_ROWS && <p className="py-2 text-center text-xs text-mut">Mostrando {MAX_ROWS} de {list.length}. Escribe para filtrar.</p>}
            <button type="button" className={`${btnGhost} sticky bottom-0 mt-2 w-full bg-bg`} onClick={() => setCreating(true)}>
              + Crear alimento
            </button>
          </>
        )}
      </>
    )
  }

  return (
    <Sheet open={open} onClose={close} title={picked ? 'Cantidad' : creating ? 'Nuevo alimento' : `Agregar a ${slotLabel}`}>
      {body}
    </Sheet>
  )
}
