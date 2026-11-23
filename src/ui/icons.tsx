import type { ReactNode } from 'react'

/** Iconos de trazo anguloso (esquinas rectas), un solo grosor para toda la app. */
function Svg({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const IconHoy = () => (
  <Svg>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="M12 8.5v7M8.5 12h7" />
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
    <path d="M8 8l2-4h4l2 4v3l-2 2h-4l-2-2z" />
    <path d="M4 21l2-5 6-2 6 2 2 5" />
  </Svg>
)

/** Visor de escáner: cuatro esquinas y una línea de lectura. */
export const IconScan = ({ size = 22 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 12h10" />
  </Svg>
)
