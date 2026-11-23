import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { db } from '../../db/db'
import { clearSlot, copyEntries, copyYesterday, saveMealFromSlot } from '../../db/nutrition'
import type { DiaryEntry, DiarySlot } from '../../db/schema'
import { addDays, formatDay, todayStr } from '../../lib/dates'
import { SLOTS, slotForHour, sumMacros } from '../../lib/nutrition'
import { btn, btnDanger, btnPri, field } from '../../ui/cls'
import { IconScan } from '../../ui/icons'
import { Screen } from '../../ui/Screen'
import { Sheet } from '../../ui/Sheet'
import { useToast } from '../../ui/useToast'
import { AddFoodSheet } from './AddFoodSheet'
import { DaySummary } from './DaySummary'
import { EntrySheet } from './EntrySheet'
import { useDay, useFoodMap } from './hooks'
import { MealSection } from './MealSection'

export function NutritionScreen() {
  const [date, setDate] = useState(todayStr())
  const { entries, goals, waterMl } = useDay(date)
  const foods = useFoodMap()
  const { toast, show } = useToast()
  const [adding, setAdding] = useState<DiarySlot | null>(null)
  const [scanMode, setScanMode] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Atajo desde Hoy: llega con state.scan y abre el escáner de una vez.
  useEffect(() => {
    if (!(location.state as { scan?: boolean } | null)?.scan) return
    setScanMode(true)
    setAdding(slotForHour(new Date().getHours()))
    void navigate('.', { replace: true, state: null })
  }, [location.state, navigate])
  const [menu, setMenu] = useState<DiarySlot | null>(null)
  const [editing, setEditing] = useState<DiaryEntry | null>(null)
  const [saveMeal, setSaveMeal] = useState<DiarySlot | null>(null)
  const [mealName, setMealName] = useState('')

  const eaten = sumMacros(entries)
  const today = todayStr()
  const slotLabel = (s: DiarySlot) => SLOTS.find((x) => x.slot === s)?.label ?? ''
  const inSlot = (s: DiarySlot) => entries.filter((e) => e.slot === s)

  return (
    <Screen title="Comida">
      <div className="flex items-center gap-2">
        <button type="button" className={`${btn} w-11 px-0`} aria-label="Día anterior" onClick={() => setDate(addDays(date, -1))}>‹</button>
        <div className="flex-1 text-center">
          <h2>{date === today ? 'Hoy' : formatDay(date)}</h2>
          {date !== today && <button type="button" className="min-h-11 text-sm font-semibold text-accfg" onClick={() => setDate(today)}>Ir a hoy</button>}
        </div>
        <button type="button" className={`${btn} w-11 px-0`} aria-label="Día siguiente" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>›</button>
      </div>

      <DaySummary date={date} eaten={eaten} goals={goals} waterMl={waterMl} />

      <button
        type="button"
        className={`${btnPri} my-3 w-full`}
        onClick={() => {
          setScanMode(true)
          setAdding(slotForHour(new Date().getHours()))
        }}
      >
        <IconScan /> Escanear código de barras
      </button>

      {SLOTS.map(({ slot, label }) => (
        <MealSection key={slot} slot={slot} label={label} entries={inSlot(slot)} onAdd={() => { setScanMode(false); setAdding(slot) }} onMenu={() => setMenu(slot)} onEdit={setEditing} />
      ))}

      <AddFoodSheet
        key={`${adding ?? 'none'}-${scanMode}`}
        open={adding != null}
        scan={scanMode}
        onClose={() => setAdding(null)}
        date={date}
        slot={adding ?? 'snack'}
        onAdded={(name) => show(`${name} agregado`)}
      />
      <EntrySheet entry={editing} food={editing?.foodId ? foods.get(editing.foodId) : undefined} onClose={() => setEditing(null)} />

      <Sheet open={menu != null} onClose={() => setMenu(null)} title={menu ? slotLabel(menu) : ''}>
        {menu && (
          <div className="grid gap-2">
            <button
              type="button"
              className={btn}
              onClick={async () => {
                const n = await copyYesterday(db, date, menu)
                setMenu(null)
                show(n ? `Copiado de ayer (${n})` : 'Ayer no hay nada en esta comida')
              }}
            >
              Copiar de ayer
            </button>
            <button
              type="button"
              className={btn}
              disabled={inSlot(menu).length === 0}
              onClick={async () => {
                await copyEntries(db, date, addDays(date, 1), menu)
                setMenu(null)
                show('Copiado a mañana')
              }}
            >
              Copiar a mañana
            </button>
            <button
              type="button"
              className={btn}
              disabled={inSlot(menu).length === 0}
              onClick={() => {
                setMealName('')
                setSaveMeal(menu)
                setMenu(null)
              }}
            >
              Guardar como comida
            </button>
            <button
              type="button"
              className={btnDanger}
              disabled={inSlot(menu).length === 0}
              onClick={async () => {
                if (!window.confirm('¿Vaciar esta comida?')) return
                await clearSlot(db, date, menu)
                setMenu(null)
              }}
            >
              Vaciar
            </button>
          </div>
        )}
      </Sheet>
      <Sheet open={saveMeal != null} onClose={() => setSaveMeal(null)} title="Guardar como comida">
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm text-mut">
            Nombre
            <input className={`${field} text-ink`} value={mealName} placeholder="Ej. Desayuno de siempre" onChange={(e) => setMealName(e.target.value)} />
          </label>
          <button
            type="button"
            className={btnPri}
            onClick={async () => {
              if (saveMeal) await saveMealFromSlot(db, date, saveMeal, mealName)
              setSaveMeal(null)
              show('Comida guardada')
            }}
          >
            Guardar
          </button>
        </div>
      </Sheet>
      {toast}
    </Screen>
  )
}
