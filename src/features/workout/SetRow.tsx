import type { ActiveSet, Exercise, WorkoutSet } from '../../db/schema'
import { setLabel } from '../../lib/workout'
import { NumField } from '../../ui/NumField'
import { unlockAudio } from './sound'
import { useWorkout } from './store'

export interface SetColumns {
  weight: boolean
  weightLabel: string
  repsLabel: string
  decimalReps: boolean
}

export function columnsFor(ex: Exercise | undefined): SetColumns {
  switch (ex?.type) {
    case 'time':
      return { weight: false, weightLabel: '', repsLabel: 'SEG', decimalReps: false }
    case 'distance':
      return { weight: true, weightLabel: 'KM', repsLabel: 'MIN', decimalReps: false }
    case 'reps':
      return { weight: false, weightLabel: '', repsLabel: 'REPS', decimalReps: false }
    default:
      return { weight: true, weightLabel: ex?.bodyweight ? '+KG' : 'KG', repsLabel: 'REPS', decimalReps: false }
  }
}

export function gridTemplate(cols: SetColumns, showRpe: boolean): string {
  return ['40px', 'minmax(0,1fr)', cols.weight ? '68px' : '', '60px', showRpe ? '48px' : '', '44px'].filter(Boolean).join(' ')
}

/** Texto de la columna "Anterior". */
export function prevText(ex: Exercise | undefined, p: WorkoutSet): string {
  if (ex?.type === 'time') return `${p.reps}s`
  if (ex?.type === 'distance') return `${p.weight}km·${p.reps}m`
  return p.weight > 0 ? `${p.weight}×${p.reps}` : `${p.reps}`
}

const TYPE_COLOR: Record<ActiveSet['type'], string> = { normal: 'text-ink', warmup: 'text-c', drop: 'text-f', failure: 'text-p' }

interface Props {
  i: number
  j: number
  sets: ActiveSet[]
  ex: Exercise | undefined
  cols: SetColumns
  prev: WorkoutSet | undefined
  showRpe: boolean
  onTypeMenu: () => void
  onMissingReps: () => void
}

export function SetRow({ i, j, sets, ex, cols, prev, showRpe, onTypeMenu, onMissingReps }: Props) {
  const s = sets[j]!
  const st = useWorkout.getState
  const label = setLabel(sets, j)
  const prevLabel = prev ? prevText(ex, prev) : '—'

  return (
    <div
      className={`grid items-center gap-1 rounded-xl py-0.5 ${s.done ? 'bg-okbg' : ''}`}
      style={{ gridTemplateColumns: gridTemplate(cols, showRpe) }}
    >
      <button
        type="button"
        aria-label={`Serie ${label}: cambiar tipo`}
        onClick={onTypeMenu}
        className={`h-11 font-num text-[15px] font-bold ${TYPE_COLOR[s.type]}`}
      >
        {label}
      </button>
      <button
        type="button"
        disabled={!prev}
        aria-label={prev ? `Usar anterior ${prevLabel}` : 'Sin serie anterior'}
        onClick={() => st().copyPrev(i, j)}
        className="h-11 truncate px-1 text-center text-[13px] text-mut disabled:opacity-100"
      >
        {prevLabel}
      </button>
      {cols.weight && (
        <NumField
          decimal
          label={cols.weightLabel}
          value={s.weight}
          placeholder={prev && prev.weight > 0 ? String(prev.weight) : s.targetWeight != null ? String(s.targetWeight) : ''}
          onChange={(v) => st().updateSet(i, j, { weight: v })}
          className={s.done ? '!bg-transparent' : ''}
        />
      )}
      <NumField
        label={cols.repsLabel}
        value={s.reps}
        placeholder={prev && prev.reps > 0 ? String(prev.reps) : (s.targetReps ?? '')}
        onChange={(v) => st().updateSet(i, j, { reps: v })}
        className={s.done ? '!bg-transparent' : ''}
      />
      {showRpe && (
        <NumField
          decimal
          label="RPE"
          value={s.rpe ?? null}
          placeholder="RPE"
          onChange={(v) => st().updateSet(i, j, { rpe: v ?? undefined })}
          className={s.done ? '!bg-transparent' : ''}
        />
      )}
      <button
        type="button"
        aria-label={s.done ? `Desmarcar serie ${label}` : `Marcar serie ${label}`}
        aria-pressed={s.done}
        onClick={() => {
          unlockAudio()
          if (st().toggleDone(i, j) === 'missing-reps') onMissingReps()
        }}
        className={`grid h-11 w-11 place-items-center rounded-xl ${s.done ? 'bg-ok text-white' : 'bg-soft'}`}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      </button>
    </div>
  )
}
