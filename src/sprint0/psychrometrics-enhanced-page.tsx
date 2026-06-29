import { useState } from 'react'
import { BarChart3, SlidersHorizontal } from 'lucide-react'
import { PsychrometricChartWorkbench } from './psychrometric-chart-workbench'
import { PsychrometricsPage } from './psychrometrics-page'
import './psychrometric-workbench.css'
import './psychrometric-segmented.css'
import './psychrometrics-unified.css'

type PsychrometricsView = 'chart' | 'advanced'

export function PsychrometricsEnhancedPage() {
  const [view, setView] = useState<PsychrometricsView>('chart')

  return <>
    <nav className="psychro-unified-nav" aria-label="Vista de psicrometría">
      <button type="button" className={view === 'chart' ? 'active' : ''} aria-pressed={view === 'chart'} onClick={() => setView('chart')}><BarChart3 />Carta interactiva</button>
      <button type="button" className={view === 'advanced' ? 'active' : ''} aria-pressed={view === 'advanced'} onClick={() => setView('advanced')}><SlidersHorizontal />Cálculos avanzados</button>
    </nav>
    {view === 'chart' ? <PsychrometricChartWorkbench /> : <PsychrometricsPage />}
  </>
}
