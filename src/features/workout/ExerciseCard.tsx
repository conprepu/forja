import type { ActiveItem, Exercise, WorkoutSet } from '../../db/schema'
import { exerciseLabel } from '../../lib/muscles'
import { fmtT } from '../../lib/time'
import { btn, chip } from '../../ui/cls'
import { columnsFor, gridTemplate, SetRow } from './SetRow'
import { useWorkout } from './store'

const REST_OPTIONS = [0, 30, 60, 90, 120, 150, 180, 240, 300]

interface Props {
  item: ActiveItem
  i: number
  ex: Exercise | undefined
  prev: WorkoutSet[] | undefined
  showRpe: boolean
  /** "A", "B"… si el ejercicio está en una superserie. */
  superLetter: string | null
  onMenu: () => void
  onSetMenu: (j: number) => void
  onMissingReps: () => void
}

export function ExerciseCard({ item, i, ex, prev, showRpe, superLetter, onMenu, onSetMenu, onMissingReps }: Props) {
  const st = useWorkout.getState
  const cols = columnsFor(ex)
  const rest = item.restSec ?? 90
  const nextRest = REST_OPTIONS[(REST_OPTIONS.indexOf(rest) + 1) % REST_OPTIONS.length] ?? 90
  const template = { gridTemplateColumns: gridTemplate(cols, showRpe) }

  return (
    <section
      aria-label={ex ? exerciseLabel(ex) : item.exerciseId}
      className={`my-3 rounded-[18px] border border-line bg-card p-4 ${superLetter ? 'border-l-4 border-l-acc' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-acc">{ex ? exerciseLabel(ex) : 'Ejercicio eliminado'}</h3>
          <p className="text-xs text-mut">
            {ex?.muscle ?? item.exerciseId}
            {superLetter && <b className="ml-2 text-acc">Superserie {superLetter}</b>}
          </p>
        </div>
        <button type="button" className={chip} onClick={() => st().setRest(i, nextRest)} aria-label="Cambiar descanso">
          {rest ? `Descanso ${fmtT(rest)}` : 'Sin descanso'}
        </button>
        <button type="button" className={`${btn} w-11 px-0`} aria-label="Opciones del ejercicio" onClick={onMenu}>
          •••
        </button>
      </div>

      <input
        className="mt-1 min-h-11 w-full bg-transparent text-sm placeholder:text-mut"
        placeholder="Agregar nota"
        aria-label="Nota del ejercicio"
        value={item.note ?? ''}
        onChange={(e) => st().setNote(i, e.target.value)}
      />

      <div className="mt-1 grid gap-1 px-0" role="group" aria-label="Series">
        <div className="grid gap-1 text-center text-xs font-semibold text-mut" style={template} aria-hidden="true">
          <span>SERIE</span>
          <span>ANTERIOR</span>
          {cols.weight && <span>{cols.weightLabel}</span>}
          <span>{cols.repsLabel}</span>
          {showRpe && <span>RPE</span>}
          <span>✓</span>
        </div>
        {item.sets.map((_, j) => (
          <SetRow
            key={j}
            i={i}
            j={j}
            sets={item.sets}
            ex={ex}
            cols={cols}
            prev={prev?.[j]}
            showRpe={showRpe}
            onTypeMenu={() => onSetMenu(j)}
            onMissingReps={onMissingReps}
          />
        ))}
      </div>

      <button type="button" className={`${btn} mt-2 w-full`} onClick={() => st().addSet(i)}>
        + Agregar serie
      </button>
    </section>
  )
}
