import type { ComponentType } from 'react'
import { IconComida, IconEntreno, IconHoy, IconPerfil, IconProgreso } from '../ui/icons'

export interface Tab {
  path: string
  label: string
  Icon: ComponentType
}

export const TABS: readonly Tab[] = [
  { path: '/hoy', label: 'Hoy', Icon: IconHoy },
  { path: '/entreno', label: 'Entreno', Icon: IconEntreno },
  { path: '/comida', label: 'Comida', Icon: IconComida },
  { path: '/progreso', label: 'Progreso', Icon: IconProgreso },
  { path: '/perfil', label: 'Perfil', Icon: IconPerfil },
]
