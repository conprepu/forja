/** 1RM estimado con Epley: kg × (1 + reps/30). Una repetición es el peso mismo. */
export function epley(kg: number, reps: number): number {
  if (kg <= 0 || reps <= 0) return 0
  if (reps === 1) return kg
  return kg * (1 + reps / 30)
}
