import type { DiaryEntry, DiarySlot } from '../../db/schema'
import { sumMacros } from '../../lib/nutrition'
import { btn, btnGhost, card } from '../../ui/cls'

interface Props {
  slot: DiarySlot
  label: string
  entries: DiaryEntry[]
  onAdd: () => void
  onMenu: () => void
  onEdit: (e: DiaryEntry) => void
}

export function MealSection({ slot, label, entries, onAdd, onMenu, onEdit }: Props) {
  const total = sumMacros(entries)
  return (
    <section className={card} aria-label={label} data-slot={slot}>
      <div className="flex items-center gap-1">
        <h3 className="min-w-0 flex-1">
          {label} <span className="font-normal text-mut">· {total.kcal} kcal</span>
        </h3>
        <button type="button" className={`${btn} w-11 px-0`} aria-label={`Opciones de ${label}`} onClick={onMenu}>•••</button>
      </div>
      {entries.length > 0 && (
        <ul className="mt-1">
          {entries.map((e) => (
            <li key={e.id} className="border-t border-line">
              <button type="button" onClick={() => onEdit(e)} className="flex min-h-14 w-full items-center gap-3 py-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.name}</span>
                  <span className="block text-xs text-mut">
                    {e.grams ? `${e.grams} g · ` : ''}P {e.p} · C {e.c} · G {e.f}
                  </span>
                </span>
                <b className="font-num">{e.kcal}</b>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={`${btnGhost} mt-1 w-full`} onClick={onAdd}>
        + Agregar
      </button>
    </section>
  )
}
