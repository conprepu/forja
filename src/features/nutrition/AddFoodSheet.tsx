import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../../db/db'
import { cacheOffFood, lookupBarcode } from '../../db/off'
import { addEntry, deleteCustomFood, getRecentFoodIds } from '../../db/nutrition'
import type { DiarySlot, Food, FoodEntry } from '../../db/schema'
import { searchOff } from '../../lib/off'
import { SLOTS, searchFoods } from '../../lib/nutrition'
import { btn, btnGhost, chip, field } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'
import { FoodAmount } from './FoodAmount'
import { FoodForm } from './FoodForm'
import { MealsPane } from './MealsPane'
import { QuickAdd } from './QuickAdd'
import { RecipesPane } from './RecipesPane'
import { Scanner } from './Scanner'

type Tab = 'buscar' | 'recientes' | 'mios' | 'recetas' | 'comidas' | 'rapido'
const TABS: { value: Tab; label: string }[] = [
  { value: 'buscar', label: 'Buscar' },
  { value: 'recientes', label: 'Recientes' },
  { value: 'mios', label: 'Míos' },
  { value: 'recetas', label: 'Recetas' },
  { value: 'comidas', label: 'Comidas' },
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

type Online = { status: 'idle' | 'loading' | 'done' | 'error'; results: Food[]; message: string }
const IDLE: Online = { status: 'idle', results: [], message: '' }

export function AddFoodSheet({ open, onClose, date, slot, onAdded }: Props) {
  const foods = useLiveQuery(() => db.foods.toArray(), [])
  const recent = useLiveQuery(() => getRecentFoodIds(db), [])
  const [tab, setTab] = useState<Tab>('buscar')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Food | null>(null)
  const [creating, setCreating] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [online, setOnline] = useState<Online>(IDLE)
  const [miss, setMiss] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const byId = useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods])
  const list = useMemo(() => {
    const all = foods ?? []
    if (tab === 'recientes') return (recent ?? []).map((id) => byId.get(id)).filter((f): f is Food => !!f)
    const base = tab === 'mios' ? all.filter((f) => f.source === 'custom') : all
    return searchFoods(base, q, recent ?? [])
  }, [foods, recent, byId, tab, q])

  const close = () => {
    abort.current?.abort()
    setQ('')
    setPicked(null)
    setCreating(false)
    setScanning(false)
    setOnline(IDLE)
    setMiss(null)
    onClose()
  }

  async function add(entry: FoodEntry) {
    await addEntry(db, date, slot, entry)
    onAdded(entry.name)
    close()
  }

  async function searchOnline() {
    abort.current?.abort()
    const ctl = new AbortController()
    abort.current = ctl
    setOnline({ status: 'loading', results: [], message: '' })
    try {
      const results = await searchOff(q, (u, i) => fetch(u, i), ctl.signal)
      setOnline({ status: 'done', results, message: results.length ? '' : 'Open Food Facts no encontró nada con ese nombre.' })
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return
      setOnline({ status: 'error', results: [], message: e instanceof Error ? e.message : 'No se pudo buscar.' })
    }
  }

  async function onCode(code: string) {
    setScanning(false)
    setBusy(true)
    setMiss(null)
    setOnline(IDLE)
    try {
      const food = await lookupBarcode(db, code)
      if (food) setPicked(food)
      else setMiss(code.replace(/\D/g, ''))
    } catch (e) {
      setOnline({ status: 'error', results: [], message: e instanceof Error ? e.message : 'No se pudo buscar el código.' })
    } finally {
      setBusy(false)
    }
  }

  const slotLabel = SLOTS.find((s) => s.slot === slot)?.label ?? ''
  const addLabel = `Agregar a ${slotLabel}`
  const searchable = tab === 'buscar' || tab === 'mios'

  let body
  if (picked) {
    body = <FoodAmount food={picked} confirmLabel={addLabel} onBack={() => setPicked(null)} onConfirm={(e) => void add(e)} />
  } else if (creating) {
    body = <FoodForm barcode={miss ?? undefined} onCancel={() => setCreating(false)} onCreated={(f) => { setCreating(false); setMiss(null); setPicked(f) }} />
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

        {tab === 'rapido' && <QuickAdd confirmLabel={addLabel} onConfirm={(e) => void add(e)} />}
        {tab === 'recetas' && <RecipesPane date={date} slot={slot} slotLabel={slotLabel} onAdded={onAdded} onDone={close} />}
        {tab === 'comidas' && <MealsPane date={date} slot={slot} onAdded={onAdded} onDone={close} />}

        {(searchable || tab === 'recientes') && (
          <>
            {searchable && (
              <div className="grid grid-cols-[1fr_44px] gap-2">
                <input
                  type="search"
                  className={field}
                  placeholder="Buscar alimento"
                  aria-label="Buscar alimento"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value)
                    if (online.status !== 'idle') setOnline(IDLE)
                  }}
                />
                <button type="button" className={`${btn} px-0`} aria-label="Escanear código de barras" onClick={() => setScanning(true)}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M8 8v8M12 8v8M16 8v8" />
                  </svg>
                </button>
              </div>
            )}

            {busy && <p role="status" className="py-3 text-center text-sm text-mut">Buscando código…</p>}
            {miss && (
              <div role="alert" className="mt-2 rounded-[18px] border border-line bg-card p-4">
                <p className="font-semibold">No encontramos el código {miss}.</p>
                <p className="text-sm text-mut">Puedes crear el alimento con los datos de la etiqueta y quedará guardado con su código.</p>
                <button type="button" className={`${btn} mt-2 w-full`} onClick={() => setCreating(true)}>Crear alimento con este código</button>
              </div>
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
              <p className="py-4 text-center text-mut">
                {tab === 'recientes' ? 'Aquí aparecerán los alimentos que agregues.' : tab === 'mios' ? 'Todavía no creaste alimentos.' : 'Sin resultados en tu base.'}
              </p>
            )}
            {list.length > MAX_ROWS && <p className="py-2 text-center text-xs text-mut">Mostrando {MAX_ROWS} de {list.length}. Escribe para filtrar.</p>}

            {tab === 'buscar' && q.trim().length >= 2 && (
              <section aria-label="Open Food Facts" className="mt-2">
                {online.status === 'idle' && (
                  <button type="button" className={`${btn} w-full`} onClick={() => void searchOnline()}>
                    Buscar “{q.trim()}” en Open Food Facts
                  </button>
                )}
                {online.status === 'loading' && <p role="status" className="py-3 text-center text-sm text-mut">Buscando en Open Food Facts…</p>}
                {(online.status === 'error' || (online.status === 'done' && online.message)) && (
                  <p role="alert" className="py-3 text-center text-sm text-warn">{online.message}</p>
                )}
                {online.results.length > 0 && (
                  <>
                    <h3 className="mt-2 text-sm text-mut">Open Food Facts</h3>
                    <ul>
                      {online.results.map((f) => (
                        <li key={f.id} className="border-t border-line">
                          <button
                            type="button"
                            className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
                            onClick={async () => setPicked(await cacheOffFood(db, f))}
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
                  </>
                )}
              </section>
            )}

            {tab !== 'recientes' && (
              <button type="button" className={`${btnGhost} sticky bottom-0 mt-2 w-full bg-bg`} onClick={() => setCreating(true)}>
                + Crear alimento
              </button>
            )}
            {online.status === 'error' && !q && <p role="alert" className="py-2 text-center text-sm text-warn">{online.message}</p>}
          </>
        )}
      </>
    )
  }

  return (
    <>
      <Sheet open={open} onClose={close} title={picked ? 'Cantidad' : creating ? 'Nuevo alimento' : addLabel}>
        {body}
      </Sheet>
      <Scanner open={open && scanning} onClose={() => setScanning(false)} onCode={(c) => void onCode(c)} />
    </>
  )
}
