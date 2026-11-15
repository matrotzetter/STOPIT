// Point d'entrée : affiche le composant App dans la page index.html.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Demande au navigateur de ne pas effacer nos données de lui-même quand il
// manque de place. (« ?. » : on ne fait rien si le navigateur ne connaît pas cette fonction.)
navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
