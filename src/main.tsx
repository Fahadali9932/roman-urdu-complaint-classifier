import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './features/department/v20-atmospheric.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
