import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import SprintZeroAppV2 from './SprintZeroAppV2.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SprintZeroAppV2 />
    </BrowserRouter>
  </StrictMode>,
)
