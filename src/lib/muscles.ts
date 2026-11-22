import type { Exercise } from '../db/schema'

export const MUSCLES = [
  'Pecho',
  'Espalda',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Isquios',
  'Glúteos',
  'Pantorrillas',
  'Core',
  'Antebrazo',
  'Cardio',
] as const

export const EQUIPMENT = [
  'Barra',
  'Mancuernas',
  'Polea',
  'Máquina',
  'Peso corporal',
  'Kettlebell',
  'Smith',
  'Banda',
  'Otro',
] as const

/** "Press de banca (Barra)"; el peso corporal no lleva paréntesis. */
export const exerciseLabel = (e: Pick<Exercise, 'name' | 'equipment'>): string =>
  e.equipment && e.equipment !== 'Peso corporal' && e.equipment !== 'Otro' ? `${e.name} (${e.equipment})` : e.name
