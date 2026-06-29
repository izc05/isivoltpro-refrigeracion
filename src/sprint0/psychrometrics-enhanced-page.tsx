import { PsychrometricChartWorkbench } from './psychrometric-chart-workbench'
import { PsychrometricsPage } from './psychrometrics-page'
import './psychrometric-workbench.css'

export function PsychrometricsEnhancedPage() {
  return <>
    <PsychrometricChartWorkbench />
    <section className="psychro-advanced-heading"><span>Herramientas avanzadas</span><h2>Cálculo, condensación, comparación e historial</h2><p>Se mantiene el módulo profesional completo para trabajar con más combinaciones de datos.</p></section>
    <PsychrometricsPage />
  </>
}
