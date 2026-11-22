import { useSyncExternalStore } from 'react'

// Router mínimo por hash: funciona en hosting estático (GitHub Pages) sin 404s.
// Rutas: #/today, #/lists, #/lists/<id>, #/habits, #/habits/<id>, #/settings
export type Route = { path: string; segments: string[] }

function read(): Route {
  const path = window.location.hash.replace(/^#/, '') || '/today'
  return { path, segments: path.split('/').filter(Boolean) }
}

let current = read()
function subscribe(cb: () => void) {
  const handler = () => {
    current = read()
    cb()
  }
  window.addEventListener('hashchange', handler)
  return () => window.removeEventListener('hashchange', handler)
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => current)
}

export function navigate(path: string) {
  window.location.hash = path
}
