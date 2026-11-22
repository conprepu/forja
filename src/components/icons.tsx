import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (p: P): P => ({
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, ...p,
})

export const IconToday = (p: P) => (
  <svg {...base(p)}><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /><path d="M9 14.5l2 2 4-4" /></svg>
)
export const IconLists = (p: P) => (
  <svg {...base(p)}><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4" cy="6" r="1.2" fill="currentColor" /><circle cx="4" cy="12" r="1.2" fill="currentColor" /><circle cx="4" cy="18" r="1.2" fill="currentColor" /></svg>
)
export const IconHabits = (p: P) => (
  <svg {...base(p)}><path d="M12 21c4.5 0 7.5-3 7.5-7.2 0-3.3-2-5.8-3.8-7.8-.4 2-1.4 3.2-2.7 3.6C13.5 6.3 12 4 9.5 2.5 9.7 6 4.5 8.5 4.5 13.8 4.5 18 7.5 21 12 21z" /></svg>
)
export const IconSettings = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
)
export const IconPlus = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
export const IconChevronRight = (p: P) => <svg {...base({ width: 14, height: 14, strokeWidth: 2.5, ...p })}><path d="M9 5l7 7-7 7" /></svg>
export const IconChevronLeft = (p: P) => <svg {...base({ strokeWidth: 2.5, ...p })}><path d="M15 5l-7 7 7 7" /></svg>
export const IconCheck = (p: P) => <svg {...base({ strokeWidth: 3, ...p })}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
export const IconRepeat = (p: P) => <svg {...base({ width: 13, height: 13, ...p })}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></svg>
export const IconFlame = IconHabits
export const IconTrash = (p: P) => <svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
