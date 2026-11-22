import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './app/routes'
import { db } from './db/db'
import { applyPrefs } from './db/prefs'
import { startup } from './db/startup'
import { installFlushOnHide, useWorkout } from './features/workout/store'
import './styles/index.css'

// BASE_URL termina en '/'; el router lo quiere sin la barra final.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'
const router = createBrowserRouter(routes, { basename })

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

// La base se abre, se siembra y se recupera el entreno en curso antes de pintar.
// Si IndexedDB no está disponible, la app igual abre.
async function boot() {
  try {
    await startup(db)
    await applyPrefs(db)
    await useWorkout.getState().hydrate()
  } catch (e) {
    console.error('No se pudo iniciar la base de datos', e)
  }
  render()
}

installFlushOnHide()
void boot()
