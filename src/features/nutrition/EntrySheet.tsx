import { db } from '../../db/db'
import { deleteEntry, updateEntry } from '../../db/nutrition'
import type { DiaryEntry, Food } from '../../db/schema'
import { btnDanger } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'
import { FoodAmount } from './FoodAmount'
import { QuickAdd } from './QuickAdd'

/** Un alimento reconstruido del snapshot de la entrada (por 100 g), por si el original ya no existe. */
function foodFromEntry(e: DiaryEntry, original: Food | undefined): Food {
  if (original) return original
  const k = 100 / (e.grams ?? 100)
  return { id: e.foodId ?? e.id, name: e.name, per100: { kcal: e.kcal * k, p: e.p * k, c: e.c * k, f: e.f * k }, servings: [], source: 'custom' }
}

interface Props {
  entry: DiaryEntry | null
  food: Food | undefined
  onClose: () => void
}

/** Editar los gramos (o los macros, si fue rápido) de una entrada, o borrarla. */
export function EntrySheet({ entry, food, onClose }: Props) {
  return (
    <Sheet open={!!entry} onClose={onClose} title={entry?.name ?? 'Entrada'}>
      {entry && (
        <div className="grid gap-3">
          {entry.grams && entry.grams > 0 ? (
            <FoodAmount
              key={entry.id}
              food={foodFromEntry(entry, food)}
              initialGrams={entry.grams}
              confirmLabel="Guardar cambios"
              onBack={onClose}
              onConfirm={async (e) => {
                await updateEntry(db, entry.id, { grams: e.grams, kcal: e.kcal, p: e.p, c: e.c, f: e.f })
                onClose()
              }}
            />
          ) : (
            <QuickAdd
              key={entry.id}
              initial={entry}
              confirmLabel="Guardar cambios"
              onConfirm={async (e) => {
                await updateEntry(db, entry.id, { name: e.name, kcal: e.kcal, p: e.p, c: e.c, f: e.f })
                onClose()
              }}
            />
          )}
          <button
            type="button"
            className={btnDanger}
            onClick={async () => {
              await deleteEntry(db, entry.id)
              onClose()
            }}
          >
            Eliminar
          </button>
        </div>
      )}
    </Sheet>
  )
}
