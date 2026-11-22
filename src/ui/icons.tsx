import type { ReactNode } from 'react'

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconHoy = () => (
  <Svg>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)

export const IconEntreno = () => (
  <Svg>
    <path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12" />
  </Svg>
)

export const IconComida = () => (
  <Svg>
    <path d="M12 3c3 4 6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 9 7 12 3z" />
  </Svg>
)

export const IconProgreso = () => (
  <Svg>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Svg>
)

export const IconPerfil = () => (
  <Svg>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Svg>
)
