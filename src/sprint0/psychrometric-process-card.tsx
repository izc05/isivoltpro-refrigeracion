import type { PsychrometricComparisonResult } from '../calculation-engine/formulas/psychrometrics'
import { calculatePsychrometricProcessMetrics } from './psychrometric-process-metrics'
import './psychrometric-process-card.css'

type Props = {
  comparison: PsychrometricComparisonResult
}

const format = (value: number, digits = 1) => value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const signed = (value: number, digits = 1) => `${value >= 0 ? '+' : ''}${format(value, digits)}`

export function PsychrometricProcessCard({ comparison }: Props) {
  const metrics = calculatePsychrometricProcessMetrics(comparison)
  const waterText = metrics.waterDirection === 'removed'
    ? `${format(metrics.waterChangeGKg, 2)} g de agua retirada por kg de aire seco`
    : metrics.waterDirection === 'added'
      ? `${format(metrics.waterChangeGKg, 2)} g de agua añadida por kg de aire seco`
      : 'Cambio de humedad despreciable'

  return <section className="psychro-process-card" aria-labelledby="psychro-process-title">
    <header>
      <div><small>Análisis del proceso A → B</small><h2 id="psychro-process-title">{comparison.processLabel}</h2></div>
      <span className={`psychro-process-badge is-${comparison.processType}`}>{comparison.processType.replaceAll('-', ' ')}</span>
    </header>

    <div className="psychro-process-metrics">
      <article><span>ΔT</span><strong>{signed(metrics.deltaTemperatureK, 1)} K</strong><small>Cambio sensible</small></article>
      <article><span>Δw</span><strong>{signed(metrics.deltaHumidityRatioGKg, 2)} g/kg</strong><small>Cambio de humedad</small></article>
      <article><span>Δh</span><strong>{signed(metrics.deltaEnthalpyKJkg, 1)} kJ/kg</strong><small>Cambio energético</small></article>
    </div>

    <div className="psychro-process-water"><span>Balance de agua</span><strong>{waterText}</strong></div>

    {metrics.waterDirection === 'removed' && <p className="psychro-process-help">La cantidad indicada equivale al condensado teórico por cada kg de aire seco que atraviesa el proceso. Para obtener litros por hora hace falta conocer el caudal de aire.</p>}
    {metrics.saturationExceeded && <p className="psychro-process-alert danger"><strong>Trayectoria no físicamente viable:</strong> la línea recta A → B supera la curva de saturación hasta {format(metrics.maximumExcessGKg, 2)} g/kg. El proceso real debe pasar por saturación y condensación.</p>}
    {metrics.pressureDifferencePa > 500 && <p className="psychro-process-alert warning"><strong>Presiones diferentes:</strong> A y B difieren en {format(metrics.pressureDifferencePa / 1000, 2)} kPa. Revisa que ambos puntos correspondan a la misma instalación o altitud.</p>}
    {!metrics.saturationExceeded && metrics.pressureDifferencePa <= 500 && <p className="psychro-process-ok">La trayectoria calculada se mantiene dentro de la zona psicrométrica válida y ambos estados usan presiones compatibles.</p>}
  </section>
}
