import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { db } from '../../db/db'
import { cacheOffFood, getOffProxy } from '../../db/off'
import { addEntry, getRecentFoodIds } from '../../db/nutrition'
import type { DiarySlot, Food } from '../../db/schema'
import { describeMeal, rankWebResults, withFood, type DescribedItem } from '../../lib/describe'
import { entryFromFood, macrosFor, sumMacros } from '../../lib/nutrition'
import { searchOff } from '../../lib/off'
import { btn, btnPri, field } from '../../ui/cls'
import { NumField } from '../../ui/NumField'
import { Sheet } from '../../ui/Sheet'
import { FoodChooser } from './FoodChooser'

interface Props {
  date: string
  slot: DiarySlot
  slotLabel: string
  onAdded: (name: string) => void
  onDone: () => void
}

type Row = DescribedItem & {
  key: number
  /** Opciones encontradas en internet para este renglón. */
  web?: Food[]
  searching?: boolean
  fromWeb?: boolean
  webError?: string
}

/** Registrar comiendo: describes lo que comiste; lo que no está en tu base se busca en internet (si lo configuraste). */
export function DescribePane({ date, slot, slotLabel, onAdded, onDone }: Props) {
  const foods = useLiveQuery(() => db.foods.toArray(), [])
  const recent = useLiveQuery(() => getRecentFoodIds(db), [])
  const proxy = useLiveQuery(async () => (await getOffProxy(db)) ?? '', [])
  const [text, setText] = useState('')
  const [items, setItems] = useState<Row[] | null>(null)
  const [choosing, setChoosing] = useState<number | null>(null)
  const [webFor, setWebFor] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const nextKey = useRef(1)
  const generation = useRef(0)

  const found = (items ?? []).filter((i) => i.food && i.grams > 0)
  const total = sumMacros(found.map((i) => macrosFor(i.food!.per100, i.grams)))
  const patchRow = (key: number, patch: Partial<Row>) => setItems((xs) => xs?.map((x) => (x.key === key ? { ...x, ...patch } : x)) ?? null)

  async function lookupWeb(row: Row, gen: number) {
    if (!proxy) return
    patchRow(row.key, { searching: true, webError: undefined })
    try {
      const results = rankWebResults(await searchOff(row.query, proxy), row.query)
      if (gen !== generation.current) return // se volvió a interpretar mientras buscaba
      const first = results[0]
      patchRow(row.key, { searching: false, web: results, ...(first ? { ...withFood(row, first), fromWeb: true } : {}) })
    } catch (e) {
      if (gen === generation.current) patchRow(row.key, { searching: false, webError: e instanceof Error ? e.message : 'No se pudo buscar.' })
    }
  }

  function interpret() {
    const gen = ++generation.current
    const rows: Row[] = describeMeal(text, foods ?? [], recent ?? []).map((it) => ({ ...it, key: nextKey.current++ }))
    setItems(rows)
    for (const r of rows) if (!r.food) void lookupWeb(r, gen)
  }

  async function addAll() {
    setSaving(true)
    try {
      for (const i of found) {
        const food = i.food!.source === 'off' ? await cacheOffFood(db, i.food!) : i.food!
        await addEntry(db, date, slot, entryFromFood(food, i.grams))
      }
      onAdded(found.length === 1 ? found[0]!.food!.name : `${found.length} alimentos`)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const choosingRow = choosing != null ? items?.find((r) => r.key === choosing) : undefined
  const webRow = webFor != null ? items?.find((r) => r.key === webFor) : undefined

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
      <p className="-mt-1 text-xs text-mut">
        Puedes dictar con el micrófono del teclado. Se interpreta en tu teléfono
        {proxy ? '; solo lo que no esté en tu base se busca en internet (Open Food Facts).' : ', sin enviar nada a internet.'}
      </p>
      <button type="button" className={btnPri} disabled={!text.trim() || !foods || proxy === undefined} onClick={interpret}>
        Interpretar
      </button>

      {items && items.length === 0 && <p role="status" className="py-2 text-center text-mut">No entendí qué comiste. Prueba con algo como “150 g de pollo y una taza de arroz”.</p>}

      {items && items.length > 0 && (
        <>
          <ul className="grid gap-2" aria-label="Alimentos interpretados">
            {items.map((it) => {
              const m = it.food ? macrosFor(it.food.per100, it.grams) : null
              return (
                <li key={it.key} className="hud p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      {it.food ? (
                        <p className="truncate font-semibold">{it.food.name}{it.food.brand ? <span className="font-normal text-mut"> · {it.food.brand}</span> : null}</p>
                      ) : it.searching ? (
                        <p className="font-semibold text-mut">Buscando “{it.query}” en internet…</p>
                      ) : (
                        <p className="font-semibold text-warn">No encontré “{it.query}”</p>
                      )}
                      <p className="truncate text-xs text-mut">
                        “{it.text}”{it.fromWeb && <b className="ml-1 text-accfg">· de internet, revísalo</b>}
                      </p>
                    </div>
                    <button type="button" className="min-h-11 min-w-11 cut-sm text-p" aria-label={`Quitar ${it.query}`} onClick={() => setItems((xs) => xs?.filter((x) => x.key !== it.key) ?? null)}>
                      ✕
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-[88px_1fr] items-center gap-3">
                    {it.food ? (
                      <>
                        <NumField decimal label={`Gramos de ${it.food.name}`} value={it.grams} placeholder="g" onChange={(g) => patchRow(it.key, { grams: g ?? 0, basis: 'peso' })} />
                        <div className="min-w-0 text-sm">
                          <b className="font-num">{m?.kcal} kcal</b>
                          <span className="text-mut"> · P {m?.p} · C {m?.c} · G {m?.f}</span>
                          {it.basis === 'estimado' && <p className="text-xs text-warn">Cantidad aproximada: ajusta los gramos.</p>}
                        </div>
                      </>
                    ) : (
                      <p className="col-span-2 text-sm text-mut">
                        {it.searching
                          ? 'Un momento…'
                          : it.webError
                            ? it.webError
                            : it.web && it.web.length === 0
                              ? 'Tampoco apareció en internet con datos nutrimentales.'
                              : proxy === ''
                                ? 'Configura la búsqueda en internet en Perfil para que lo busque solo.'
                                : 'Elige el alimento de tu lista o quítalo.'}
                      </p>
                    )}
                  </div>
                  <div className={`mt-2 grid gap-2 ${it.web && it.web.length > 1 ? 'grid-cols-2' : ''}`}>
                    <button type="button" className={btn} onClick={() => setChoosing(it.key)}>
                      {it.food ? 'Cambiar alimento' : 'Elegir alimento'}
                    </button>
                    {it.web && it.web.length > 1 && (
                      <button type="button" className={btn} onClick={() => setWebFor(it.key)}>
                        Otras ({it.web.length}) de internet
                      </button>
                    )}
                  </div>
                  {!it.food && !it.searching && proxy && (
                    <button type="button" className={`${btn} mt-2 w-full`} onClick={() => void lookupWeb(it, generation.current)}>
                      Buscar de nuevo en internet
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="hud p-4" aria-live="polite">
            <p className="font-num text-2xl font-extrabold">{total.kcal} <span className="text-base font-semibold text-mut">kcal</span></p>
            <p className="text-sm"><span className="text-p">P {total.p}</span> · <span className="text-c">C {total.c}</span> · <span className="text-f">G {total.f}</span></p>
          </div>
          <button type="button" className={btnPri} disabled={found.length === 0 || saving || items.some((i) => i.searching)} onClick={() => void addAll()}>
            Agregar {found.length} a {slotLabel}
          </button>
        </>
      )}

      <FoodChooser
        open={choosingRow != null}
        onClose={() => setChoosing(null)}
        onPick={(f) => {
          if (choosingRow) patchRow(choosingRow.key, { ...withFood(choosingRow, f), fromWeb: false })
        }}
      />

      <Sheet open={webRow != null} onClose={() => setWebFor(null)} title="Resultados de internet">
        <p className="mb-2 text-sm text-mut">Open Food Facts · valores por 100 g</p>
        <ul>
          {(webRow?.web ?? []).map((f) => (
            <li key={f.id} className="border-t border-line">
              <button
                type="button"
                className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
                onClick={() => {
                  if (webRow) patchRow(webRow.key, { ...withFood(webRow, f), fromWeb: true })
                  setWebFor(null)
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{f.name}</span>
                  <span className="block truncate text-xs text-mut">{f.brand ? `${f.brand} · ` : ''}{f.per100.kcal} kcal · P {f.per100.p} · C {f.per100.c} · G {f.per100.f}</span>
                </span>
                <span aria-hidden="true" className="text-xl text-accfg">+</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  )
}
