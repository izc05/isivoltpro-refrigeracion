import { useMemo, useState } from 'react'
import type { PsychrometricComparisonResult, PsychrometricState } from '../calculation-engine/formulas/psychrometrics'
import { CHART_BOUNDS, enthalpyLine, humidityRatioGKg, relativeHumidityCurve, type ChartPoint } from './psychrometric-chart-math'
import './psychrometric-chart.css'

type Props = {
  state?: PsychrometricState | null
  comparison?: PsychrometricComparisonResult | null
  pressurePa: number
}

const width = 760
const height = 430
const pad = { left: 58, right: 52, top: 30, bottom: 52 }
const rhValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const tempTicks = [-10, 0, 10, 20, 30, 40, 50]
const humidityTicks = [0, 5, 10, 15, 20, 25, 30]

const x = (temperatureC: number) => pad.left + ((temperatureC - CHART_BOUNDS.minT) / (CHART_BOUNDS.maxT - CHART_BOUNDS.minT)) * (width - pad.left - pad.right)
const y = (ratioGKg: number) => height - pad.bottom - ((ratioGKg - CHART_BOUNDS.minW) / (CHART_BOUNDS.maxW - CHART_BOUNDS.minW)) * (height - pad.top - pad.bottom)
const pathFor = (points: ChartPoint[]) => points.map((point, index) => `${index ? 'L' : 'M'} ${x(point.dryBulbC).toFixed(1)} ${y(point.humidityRatioGKg).toFixed(1)}`).join(' ')
const value = (number: number, digits = 1) => number.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })

function pointFromState(label: string, state: PsychrometricState) {
  return { label, dryBulbC: state.dryBulbC, humidityRatioGKg: state.humidityRatioGKg, relativeHumidityPct: state.relativeHumidityPct }
}

export function PsychrometricChart({ state = null, comparison = null, pressurePa }: Props) {
  const [showComfort, setShowComfort] = useState(true)
  const [showEnthalpy, setShowEnthalpy] = useState(true)
  const safePressure = Number.isFinite(pressurePa) && pressurePa > 50000 ? pressurePa : 101325
  const curves = useMemo(() => rhValues.map((rh) => ({ rh, points: relativeHumidityCurve(rh, safePressure) })), [safePressure])
  const points = comparison ? [pointFromState('A', comparison.a), pointFromState('B', comparison.b)] : state ? [pointFromState('Estado', state)] : []
  const referenceState = state ?? comparison?.a ?? null
  const enthalpy = referenceState && showEnthalpy ? enthalpyLine(referenceState.moistAirEnthalpyKJkg) : []
  const comfort = [
    { dryBulbC: 20, humidityRatioGKg: humidityRatioGKg(20, 30, safePressure) },
    { dryBulbC: 26, humidityRatioGKg: humidityRatioGKg(26, 30, safePressure) },
    { dryBulbC: 26, humidityRatioGKg: humidityRatioGKg(26, 60, safePressure) },
    { dryBulbC: 20, humidityRatioGKg: humidityRatioGKg(20, 60, safePressure) },
  ]

  return <section className="psychro-chart-card" aria-labelledby="psychro-chart-title">
    <div className="psychro-chart-head"><div><span>Carta interactiva</span><h2 id="psychro-chart-title">Carta psicrométrica</h2><p>Temperatura seca frente a razón de humedad, calculada para {value(safePressure / 1000, 1)} kPa.</p></div><div className="psychro-chart-controls"><button type="button" className={showComfort ? 'active' : ''} onClick={() => setShowComfort(!showComfort)}>Confort</button><button type="button" className={showEnthalpy ? 'active' : ''} onClick={() => setShowEnthalpy(!showEnthalpy)}>Entalpía</button></div></div>
    <div className="psychro-chart-scroll"><svg className="psychro-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Carta psicrométrica con curvas de humedad relativa y estados calculados">
      <defs><marker id="psychro-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
      <rect className="psychro-plot-bg" x={pad.left} y={pad.top} width={width - pad.left - pad.right} height={height - pad.top - pad.bottom} rx="12" />
      {tempTicks.map((tick) => <g key={`t-${tick}`}><line className="psychro-grid" x1={x(tick)} y1={pad.top} x2={x(tick)} y2={height - pad.bottom} /><text className="psychro-axis-label" x={x(tick)} y={height - 24} textAnchor="middle">{tick}°</text></g>)}
      {humidityTicks.map((tick) => <g key={`w-${tick}`}><line className="psychro-grid" x1={pad.left} y1={y(tick)} x2={width - pad.right} y2={y(tick)} /><text className="psychro-axis-label" x={width - 12} y={y(tick) + 4} textAnchor="end">{tick}</text></g>)}
      {showComfort && comfort.every((point) => Number.isFinite(point.humidityRatioGKg)) && <polygon className="psychro-comfort" points={comfort.map((point) => `${x(point.dryBulbC)},${y(point.humidityRatioGKg)}`).join(' ')} />}
      {curves.map(({ rh, points: curve }) => curve.length > 1 && <g key={rh}><path className={rh === 100 ? 'psychro-rh-line saturation' : 'psychro-rh-line'} d={pathFor(curve)} />{rh >= 30 && rh < 100 && <text className="psychro-rh-label" x={x(curve[curve.length - 1].dryBulbC) - 4} y={y(curve[curve.length - 1].humidityRatioGKg) - 5} textAnchor="end">{rh}%</text>}</g>)}
      {enthalpy.length > 1 && <path className="psychro-enthalpy-line" d={pathFor(enthalpy)} />}
      {state && <line className="psychro-dew-line" x1={x(state.dewPointC)} y1={y(state.humidityRatioGKg)} x2={x(state.dryBulbC)} y2={y(state.humidityRatioGKg)} />}
      {comparison && <line className="psychro-process-line" x1={x(comparison.a.dryBulbC)} y1={y(comparison.a.humidityRatioGKg)} x2={x(comparison.b.dryBulbC)} y2={y(comparison.b.humidityRatioGKg)} markerEnd="url(#psychro-arrow)" />}
      {points.map((point, index) => <g className={`psychro-state-point point-${index}`} key={point.label}><circle cx={x(point.dryBulbC)} cy={y(point.humidityRatioGKg)} r="7" /><circle className="pulse" cx={x(point.dryBulbC)} cy={y(point.humidityRatioGKg)} r="13" /><text x={x(point.dryBulbC) + 11} y={y(point.humidityRatioGKg) - 11}>{point.label}</text></g>)}
      <text className="psychro-axis-title" x={(pad.left + width - pad.right) / 2} y={height - 5} textAnchor="middle">Temperatura seca (°C)</text>
      <text className="psychro-axis-title" transform={`translate(${width - 7} ${(pad.top + height - pad.bottom) / 2}) rotate(-90)`} textAnchor="middle">Razón de humedad (g/kg aire seco)</text>
    </svg></div>
    {points.length ? <div className="psychro-chart-summary">{points.map((point) => <article key={point.label}><small>{point.label}</small><strong>{value(point.dryBulbC)} °C · {value(point.relativeHumidityPct, 0)} % HR</strong><span>{value(point.humidityRatioGKg, 2)} g/kg</span></article>)}{referenceState && <article><small>Punto de rocío</small><strong>{value(referenceState.dewPointC)} °C</strong><span>{value(referenceState.moistAirEnthalpyKJkg)} kJ/kg</span></article>}</div> : <p className="psychro-chart-empty">Calcula un estado para colocarlo sobre la carta. En Comparar se dibujará el proceso A → B.</p>}
    <p className="psychro-chart-note">La zona de confort es orientativa. La carta no sustituye el proyecto, las condiciones de diseño ni instrumentos calibrados.</p>
  </section>
}
