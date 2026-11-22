import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './app/routes'
import { db } from './db/db'
import { startup } from './db/startup'
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

// La base se abre y se siembra antes de pintar. Si IndexedDB no está disponible, la app igual abre.
startup(db)
  .catch((e) => console.error('No se pudo iniciar la base de datos', e))
  .finally(render)
