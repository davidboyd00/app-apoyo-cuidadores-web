import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Atkinson Hyperlegible servida por la app (sin terceros, funciona sin red).
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
