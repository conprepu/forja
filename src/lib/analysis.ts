// Análisis de un entreno: qué tanto trabajaste cada músculo, cómo vas contra la última vez y qué hacer la próxima.
// Todo son reglas simples sobre tu propio historial (nada de IA ni internet) y los pesos van siempre en kg.
import type { Exercise, Workout, WorkoutSet } from '../db/schema'
import { computeBests, type Bests } from './prs'
import { workoutVolume } from './workout'

export type Trend = 'nuevo' | 'sube' | 'igual' | 'baja'
/** subir = todas las series llegaron a 12 reps o más; repetir = el 1RM bajó; descansar = las reps se desplomaron. */
export type TipKind = 'subir' | 'repetir' | 'descansar'

export interface ExerciseAnalysis {
  exerciseId: string
  name: string
  type: Exercise['type']
  workSets: number
  /** La serie con mayor 1RM estimado (o más reps si no lleva peso). */
  top: { weight: number; reps: number } | null
  bests: Bests
  trend: Trend
  /** Cambio % de la marca principal contra la última vez; null si es la primera. */
  change: number | null
  tip: TipKind | null
}

export interface MuscleLoad {
  muscle: string
  sets: number
  /** 0–1 del total de series de trabajo. */
  share: number
}

export interface Comparison {
  name: string
  date: number
  volumePct: number | null
  durationPct: number | null
  setsDiff: number
}

export interface WorkoutAnalysis {
  durationMin: number
  workSets: number
  warmupSets: number
  volume: number
  /** Minutos por serie de trabajo (incluye los descansos). */
  minPerSet: number | null
  avgRpe: number | null
  failureSets: number
  compare: Comparison | null
  muscles: MuscleLoad[]
  exercises: ExerciseAnalysis[]
  /** Observaciones en español, de la más importante a la menos. */
  notes: string[]
}

const PUSH = ['Pecho', 'Hombros', 'Tríceps']
const PULL = ['Espalda', 'Bíceps']
const LEGS = ['Cuádriceps', 'Isquios', 'Glúteos', 'Pantorrillas']

const pct = (now: number, before: number): number | null => (before > 0 ? ((now - before) / before) * 100 : null)
const round1 = (n: number) => Math.round(n * 10) / 10
const workOnly = (sets: WorkoutSet[]) => sets.filter((s) => s.done && s.type !== 'warmup')

/** El entreno con el que se compara: el último de la misma rutina o, si no hay, del mismo nombre. */
export function comparableWorkout(w: Workout, history: Workout[]): Workout | null {
  const before = history.filter((h) => h.id !== w.id && h.startedAt < w.startedAt).sort((a, b) => b.startedAt - a.startedAt)
  const name = w.name.trim().toLowerCase()
  return (
    (w.routineId ? before.find((h) => h.routineId === w.routineId) : undefined) ??
    before.find((h) => h.name.trim().toLowerCase() === name) ??
    null
  )
}

/** Marca principal de un ejercicio: 1RM estimado si lleva peso; si no, repeticiones. */
const mainMetric = (b: Bests): number | undefined => b.e1rm ?? b.reps

function topSet(type: Exercise['type'], sets: WorkoutSet[]): { weight: number; reps: number } | null {
  const work = workOnly(sets).filter((s) => s.reps > 0)
  if (!work.length || type === 'distance') return null
  const score = (s: WorkoutSet) => (s.weight > 0 ? s.weight * (1 + s.reps / 30) : s.reps)
  const best = work.reduce((a, b) => (score(b) > score(a) ? b : a))
  return { weight: best.weight, reps: best.reps }
}

function tipFor(type: Exercise['type'], sets: WorkoutSet[], trend: Trend, change: number | null): TipKind | null {
  if (type !== 'weight_reps') return null
  const work = workOnly(sets).filter((s) => s.weight > 0)
  if (work.length >= 2 && work.every((s) => s.reps >= 12)) return 'subir'
  if (trend === 'baja' && change != null && change <= -5) return 'repetir'
  if (work.length >= 3 && work[0]!.reps > 0 && work[work.length - 1]!.reps / work[0]!.reps < 0.6) return 'descansar'
  return null
}

function analyzeExercise(ex: Exercise | undefined, exerciseId: string, sets: WorkoutSet[], priorSets: WorkoutSet[] | null): ExerciseAnalysis {
  const type = ex?.type ?? 'weight_reps'
  const bests = computeBests(type, sets)
  const now = mainMetric(bests)
  const before = priorSets ? mainMetric(computeBests(type, priorSets)) : undefined
  const change = now !== undefined && before !== undefined ? pct(now, before) : null
  const trend: Trend = change === null ? 'nuevo' : change > 1 ? 'sube' : change < -1 ? 'baja' : 'igual'
  return {
    exerciseId,
    name: ex?.name ?? exerciseId,
    type,
    workSets: workOnly(sets).length,
    top: topSet(type, sets),
    bests,
    trend,
    change: change === null ? null : round1(change),
    tip: tipFor(type, sets, trend, change),
  }
}

/** Series del ejercicio en la última vez anterior a `w` en que se hizo. */
function priorSetsOf(exerciseId: string, w: Workout, history: Workout[]): WorkoutSet[] | null {
  const prev = history
    .filter((h) => h.id !== w.id && h.startedAt < w.startedAt && h.items.some((i) => i.exerciseId === exerciseId))
    .sort((a, b) => b.startedAt - a.startedAt)[0]
  return prev ? prev.items.filter((i) => i.exerciseId === exerciseId).flatMap((i) => i.sets) : null
}

export function analyzeWorkout(w: Workout, history: Workout[], exerciseOf: (id: string) => Exercise | undefined): WorkoutAnalysis {
  const countsVolume = (id: string) => (exerciseOf(id)?.type ?? 'weight_reps') === 'weight_reps'
  const volumeOf = (x: Workout) => workoutVolume(x.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets })), countsVolume)
  const durationMin = Math.max(0, (w.endedAt - w.startedAt) / 60000)

  // ejercicios (si se repite en el mismo entreno, sus series se juntan)
  const byEx = new Map<string, WorkoutSet[]>()
  for (const it of w.items) byEx.set(it.exerciseId, [...(byEx.get(it.exerciseId) ?? []), ...it.sets])
  const exercises = [...byEx].map(([id, sets]) => analyzeExercise(exerciseOf(id), id, sets, priorSetsOf(id, w, history)))

  const allSets = w.items.flatMap((i) => i.sets.filter((s) => s.done))
  const work = allSets.filter((s) => s.type !== 'warmup')
  const warmupSets = allSets.length - work.length
  const rpes = work.map((s) => s.rpe).filter((r): r is number => typeof r === 'number')
  const avgRpe = rpes.length ? round1(rpes.reduce((a, b) => a + b, 0) / rpes.length) : null
  const failureSets = work.filter((s) => s.type === 'failure').length
  const volume = volumeOf(w)

  // músculos
  const bySets = new Map<string, number>()
  for (const it of w.items) {
    const muscle = exerciseOf(it.exerciseId)?.muscle
    if (!muscle || muscle === 'Cardio') continue
    const n = workOnly(it.sets).length
    if (n) bySets.set(muscle, (bySets.get(muscle) ?? 0) + n)
  }
  const muscleTotal = [...bySets.values()].reduce((a, b) => a + b, 0)
  const muscles: MuscleLoad[] = [...bySets]
    .map(([muscle, sets]) => ({ muscle, sets, share: muscleTotal ? sets / muscleTotal : 0 }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle))

  // comparación con la última vez
  const base = comparableWorkout(w, history)
  const compare: Comparison | null = base
    ? {
        name: base.name,
        date: base.startedAt,
        volumePct: pct(volume, volumeOf(base)),
        durationPct: pct(durationMin, (base.endedAt - base.startedAt) / 60000),
        setsDiff: work.length - base.items.reduce((n, i) => n + workOnly(i.sets).length, 0),
      }
    : null

  const notes = buildNotes({ work, volume, durationMin, avgRpe, failureSets, compare, muscles, exercises, bySets })
  return {
    durationMin: round1(durationMin),
    workSets: work.length,
    warmupSets,
    volume,
    minPerSet: work.length ? round1(durationMin / work.length) : null,
    avgRpe,
    failureSets,
    compare,
    muscles,
    exercises,
    notes,
  }
}

function sum(bySets: Map<string, number>, names: string[]): number {
  return names.reduce((n, m) => n + (bySets.get(m) ?? 0), 0)
}

function buildNotes(a: {
  work: WorkoutSet[]
  volume: number
  durationMin: number
  avgRpe: number | null
  failureSets: number
  compare: Comparison | null
  muscles: MuscleLoad[]
  exercises: ExerciseAnalysis[]
  bySets: Map<string, number>
}): string[] {
  const out: string[] = []

  if (a.compare && a.compare.volumePct !== null) {
    const v = a.compare.volumePct
    const when = new Date(a.compare.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    out.push(
      Math.abs(v) < 3
        ? `Volumen casi igual que tu último «${a.compare.name}» (${when}).`
        : `Moviste ${Math.round(Math.abs(v))} % ${v > 0 ? 'más' : 'menos'} volumen que tu último «${a.compare.name}» (${when}).`,
    )
  }

  const compared = a.exercises.filter((e) => e.trend !== 'nuevo')
  if (compared.length >= 2) {
    const up = compared.filter((e) => e.trend === 'sube').length
    const down = compared.filter((e) => e.trend === 'baja').length
    if (up === compared.length) out.push(`Todos tus ejercicios subieron contra la última vez (${up} de ${compared.length}). Buen día.`)
    else if (up > 0 && down === 0) out.push(`${up} de ${compared.length} ejercicios subieron contra la última vez y el resto se mantuvo.`)
    else if (down > 0 && up === 0) out.push(`${down} de ${compared.length} ejercicios bajaron contra la última vez y el resto se mantuvo.`)
    else if (up > 0 && down > 0) out.push(`${up} de ${compared.length} ejercicios subieron y ${down} bajaron contra la última vez.`)
    else out.push('Mantuviste tus marcas en todos los ejercicios.')
  }
  const fresh = a.exercises.filter((e) => e.trend === 'nuevo').length
  if (fresh > 0 && a.exercises.length > 1) out.push(`${fresh} ${fresh === 1 ? 'ejercicio' : 'ejercicios'} sin historial: hoy quedó tu punto de partida.`)

  const push = sum(a.bySets, PUSH)
  const pull = sum(a.bySets, PULL)
  const legs = sum(a.bySets, LEGS)
  if (push >= 4 && pull === 0) out.push(`Solo empuje hoy (${push} series) y nada de jalón: compénsalo en tu próximo entreno.`)
  else if (pull >= 4 && push === 0) out.push(`Solo jalón hoy (${pull} series) y nada de empuje: compénsalo en tu próximo entreno.`)
  else if (push >= 6 && pull > 0 && push >= pull * 2) out.push(`Más empuje que jalón (${push} vs ${pull} series).`)
  else if (pull >= 6 && push > 0 && pull >= push * 2) out.push(`Más jalón que empuje (${pull} vs ${push} series).`)
  if (legs > 0 && legs < 4 && push + pull >= 10) out.push(`Pierna casi no entró hoy (${legs} ${legs === 1 ? 'serie' : 'series'}).`)

  const top = a.muscles[0]
  if (top && a.muscles.length > 1) out.push(`Lo que más trabajaste: ${top.muscle} (${top.sets} ${top.sets === 1 ? 'serie' : 'series'}, ${Math.round(top.share * 100)} %).`)

  const loaded = a.work.filter((s) => s.reps > 0)
  if (loaded.length >= 6) {
    const mid = loaded.filter((s) => s.reps >= 6 && s.reps <= 12).length / loaded.length
    const low = loaded.filter((s) => s.reps <= 5).length / loaded.length
    const high = loaded.filter((s) => s.reps > 12).length / loaded.length
    if (mid >= 0.6) out.push(`${Math.round(mid * 100)} % de tus series fueron de 6 a 12 reps: rango de hipertrofia.`)
    else if (low >= 0.5) out.push(`${Math.round(low * 100)} % de tus series fueron de 5 reps o menos: día de fuerza.`)
    else if (high >= 0.5) out.push(`${Math.round(high * 100)} % de tus series pasaron de 12 reps: trabajo de resistencia.`)
  }

  if (a.avgRpe !== null) {
    out.push(
      a.avgRpe >= 9
        ? `RPE medio ${a.avgRpe}: muy cerca del fallo, cuida tu recuperación.`
        : a.avgRpe <= 6.5
          ? `RPE medio ${a.avgRpe}: quedó margen, puedes subir carga o reps.`
          : `RPE medio ${a.avgRpe}: intensidad bien dosificada.`,
    )
  }
  if (a.failureSets >= 4) out.push(`${a.failureSets} series al fallo: es bastante; no abuses de ellas en todos los ejercicios.`)

  if (a.durationMin >= 105) out.push(`Duró ${Math.round(a.durationMin)} min: pasada la hora y media el rendimiento suele caer; recorta descansos o ejercicios.`)

  const record = a.exercises.filter((e) => e.trend === 'sube').sort((x, y) => (y.change ?? 0) - (x.change ?? 0))[0]
  if (record && record.change !== null && record.change >= 5) out.push(`Mayor avance: ${record.name}, +${record.change} % en tu 1RM estimado.`)

  return out
}

export const TIP_TEXT: Record<TipKind, string> = {
  subir: 'Todas las series llegaron a 12 reps o más: sube un poco el peso la próxima vez.',
  repetir: 'Bajó contra la última vez: repite este peso y busca igualar tus repeticiones.',
  descansar: 'Las reps cayeron mucho entre la primera y la última serie: descansa más o baja un poco el peso.',
}
