import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { App } from './App'

// Pedir que Safari no borre IndexedDB por inactividad. En iOS suele concederse
// solo cuando la app está instalada en la pantalla de inicio.
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
