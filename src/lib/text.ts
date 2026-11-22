/** Minúsculas y sin acentos, para búsquedas. */
export const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
