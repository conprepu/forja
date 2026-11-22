import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './app/routes'
import './styles/index.css'

// BASE_URL termina en '/'; el router lo quiere sin la barra final.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'
const router = createBrowserRouter(routes, { basename })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
