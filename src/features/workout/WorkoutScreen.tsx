import { useState } from 'react'
import type { FinishResult } from '../../db/workouts'
import { ActiveWorkoutView } from './ActiveWorkout'
import { FinishSummary } from './FinishSummary'
import { RoutineHome } from './RoutineHome'
import { useWorkout } from './store'

export function WorkoutScreen() {
  const active = useWorkout((s) => s.active)
  // El resumen vive aquí: al terminar, el entreno activo desaparece pero el resumen debe seguir visible.
  const [summary, setSummary] = useState<FinishResult | null>(null)

  return (
    <>
      {active ? <ActiveWorkoutView onFinished={setSummary} /> : <RoutineHome />}
      <FinishSummary result={summary} onClose={() => setSummary(null)} />
    </>
  )
}
