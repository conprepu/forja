// Clases de Tailwind compartidas. Todo control táctil mide al menos 44 px (min-h-11).
const base = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 font-semibold disabled:opacity-50'

export const btn = `${base} bg-soft`
export const btnPri = `${base} bg-acc text-accink`
export const btnGhost = `${base} px-2 text-acc`
export const btnDanger = `${base} bg-soft text-p`
export const field = 'min-h-11 w-full rounded-xl border border-transparent bg-soft px-3 text-base'
export const card = 'my-3 rounded-[18px] border border-line bg-card p-4'
export const chip = 'inline-flex min-h-9 shrink-0 items-center rounded-full bg-soft px-3.5 text-sm font-semibold'
