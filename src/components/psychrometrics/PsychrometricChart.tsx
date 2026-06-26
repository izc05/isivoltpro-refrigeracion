import { useMemo, useState } from 'react'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  ScatterController,
  Tooltip,
  type ChartData,
  type ChartDataset,
  type ChartOptions,
  type Plugin,
} from 'chart.js'
import { Scatter } from 'react-chartjs-2'
import type { PsychrometricComparisonResult, PsychrometricState } from '../../calculation-engine/formulas/psychrometrics'
import { generatePsychrometricCurves } from '../../lib/psychrometrics/chartGenerator'
import { ChartLayerControls, type PsychrometricChartLayers } from './ChartLayerControls'
import { comfortZoneDataset } from './ComfortZone'
import { ProcessLegend } from './ProcessLegend'
import { psychrometricTooltipLabel } from './PsychrometricTooltip'

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, LineController, ScatterController, Tooltip, Legend, Filler)

type ChartStatePoint = {
  x: number
  y: number
  label: string
  state: PsychrometricState
}

export type PsychrometricChartMode = 'quick' | 'advanced'

export function PsychrometricChart({
  pressurePa,
  mode = 'quick',
  state,
  comparison,
  condensation,
}: {
  pressurePa: number
  mode?: PsychrometricChartMode
  state?: PsychrometricState | null
  comparison?: PsychrometricComparisonResult | null
  condensation?: { state: PsychrometricState; surfaceTempC: number } | null
}) {
  const safePressurePa = Number.isFinite(pressurePa) && pressurePa > 0 ? pressurePa : 101325
  const [full, setFull] = useState(false)
  const [layers, setLayers] = useState<PsychrometricChartLayers>({ comfort: true, enthalpy: true, wetBulb: false, specificVolume: false })
  const advanced = mode === 'advanced'
  const chartCurves = useMemo(() => generatePsychrometricCurves({ pressurePa: safePressurePa, advanced, minTemperature: -10, maxTemperature: 50, temperatureStep: advanced ? 0.5 : 0.5 }), [advanced, safePressurePa])
  const displayedStates = useMemo(() => {
    if (comparison) return [
      toChartState(comparison.a, 'A'),
      toChartState(comparison.b, 'B'),
    ]
    if (condensation) return [toChartState(condensation.state, 'A')]
    if (state) return [toChartState(state, 'A')]
    return []
  }, [comparison, condensation, state])
  const processLabel = comparison?.processLabel ?? (condensation ? 'Enfriamiento hasta punto de rocío' : undefined)

  const data = useMemo<ChartData<'scatter'>>(() => {
    const datasets: ChartDataset<'scatter'>[] = []
    if (layers.comfort) datasets.push(comfortZoneDataset())
    datasets.push(...chartCurves.relativeHumidity.map(({ relativeHumidity, points }) => lineDataset(`${Math.round(relativeHumidity * 100)} % HR`, points, 'rgba(103, 232, 249, .28)', 1)))
    datasets.push(lineDataset('100 % saturación', chartCurves.saturation, 'rgba(56, 189, 248, .92)', 2.5))
    if (advanced && layers.enthalpy) datasets.push(...chartCurves.enthalpy.map(({ enthalpyKJkg, points }) => lineDataset(`${enthalpyKJkg} kJ/kg`, points, 'rgba(14, 165, 233, .20)', 1, [5, 5])))
    if (advanced && layers.wetBulb) datasets.push(...chartCurves.wetBulb.map(({ wetBulbC, points }) => lineDataset(`${wetBulbC} °C Bh`, points, 'rgba(163, 230, 53, .18)', 1, [4, 6])))
    if (advanced && layers.specificVolume) datasets.push(...chartCurves.specificVolume.map(({ specificVolumeM3kg, points }) => lineDataset(`${specificVolumeM3kg.toFixed(2)} m³/kg`, points, 'rgba(216, 180, 254, .18)', 1, [2, 6])))
    if (condensation) {
      const dewY = condensation.state.humidityRatioGKg
      datasets.push(lineDataset('Línea hasta rocío', [{ x: condensation.state.dewPointC, y: dewY }, { x: condensation.state.dryBulbC, y: dewY }], 'rgba(250, 204, 21, .82)', 2, [6, 5]))
      datasets.push(pointDataset('Rocío', [{ x: condensation.state.dewPointC, y: dewY, label: 'Rocío', state: condensation.state }], '#facc15', 5))
    }
    if (comparison) datasets.push(lineDataset('Proceso A-B', [{ x: comparison.a.dryBulbC, y: comparison.a.humidityRatioGKg }, { x: comparison.b.dryBulbC, y: comparison.b.humidityRatioGKg }], 'rgba(248, 113, 113, .95)', 3))
    if (displayedStates.length) datasets.push(pointDataset('Estados calculados', displayedStates, '#22d3ee', 7))
    datasets.push(...guideDatasets(displayedStates[0]))
    return { datasets }
  }, [advanced, chartCurves, comparison, condensation, displayedStates, layers])

  const options = useMemo<ChartOptions<'scatter'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    parsing: false,
    animation: false,
    normalized: true,
    interaction: { mode: 'nearest', intersect: false },
    scales: {
      x: {
        type: 'linear',
        min: -10,
        max: 50,
        grid: { color: 'rgba(148, 163, 184, .16)' },
        ticks: { color: '#cbd5e1' },
        title: { display: true, text: 'Temperatura seca (°C)', color: '#e2e8f0' },
      },
      y: {
        type: 'linear',
        min: 0,
        suggestedMax: 30,
        position: 'right',
        grid: { color: 'rgba(148, 163, 184, .13)' },
        ticks: { color: '#cbd5e1' },
        title: { display: true, text: 'Humedad específica (g/kg aire seco)', color: '#e2e8f0' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: { label: psychrometricTooltipLabel },
      },
    },
  }), [])

  return <section className={`psychro-chart-panel ${full ? 'is-fullscreen' : ''}`}>
    <div className="psychro-chart-head">
      <div>
        <small>Carta psicrométrica dinámica</small>
        <h2>{safePressurePa.toLocaleString('es-ES', { maximumFractionDigits: 0 })} Pa · {(safePressurePa / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kPa</h2>
      </div>
      <button className="sz-button secondary" type="button" onClick={() => setFull(!full)}>{full ? 'Cerrar carta' : 'Ampliar carta'}</button>
    </div>
    {advanced && <ChartLayerControls layers={layers} onChange={setLayers} />}
    <div className="psychro-chart-frame">
      <Scatter data={data} options={options} plugins={[processArrowPlugin]} />
    </div>
    <ProcessLegend label={processLabel} />
  </section>
}

function toChartState(state: PsychrometricState, label: string): ChartStatePoint {
  return { x: state.dryBulbC, y: state.humidityRatioGKg, label: `${label} · ${state.dryBulbC.toFixed(1)} °C · ${state.relativeHumidityPct.toFixed(0)} % HR`, state }
}

function lineDataset(label: string, data: Array<{ x: number; y: number }>, color: string, borderWidth: number, borderDash?: number[]): ChartDataset<'scatter'> {
  return { label, data, showLine: true, pointRadius: 0, borderColor: color, backgroundColor: color, borderWidth, borderDash, tension: 0.1 }
}

function pointDataset(label: string, data: ChartStatePoint[], color: string, radius: number): ChartDataset<'scatter'> {
  return { label, data, pointRadius: radius, pointHoverRadius: radius + 2, pointBackgroundColor: color, pointBorderColor: '#ecfeff', pointBorderWidth: 2, showLine: false }
}

function guideDatasets(point?: ChartStatePoint): ChartDataset<'scatter'>[] {
  if (!point) return []
  return [
    lineDataset('Guía temperatura', [{ x: point.x, y: 0 }, { x: point.x, y: point.y }], 'rgba(34, 211, 238, .42)', 1, [4, 5]),
    lineDataset('Guía humedad', [{ x: -10, y: point.y }, { x: point.x, y: point.y }], 'rgba(34, 211, 238, .42)', 1, [4, 5]),
  ]
}

const processArrowPlugin: Plugin<'scatter'> = {
  id: 'psychroProcessArrow',
  afterDatasetsDraw(chart) {
    const datasetIndex = chart.data.datasets.findIndex((dataset) => dataset.label === 'Proceso A-B')
    if (datasetIndex < 0) return
    const meta = chart.getDatasetMeta(datasetIndex)
    const first = meta.data[0]
    const second = meta.data[1]
    if (!first || !second) return
    const start = first.getProps(['x', 'y'], true)
    const end = second.getProps(['x', 'y'], true)
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    const size = 9
    const ctx = chart.ctx
    ctx.save()
    ctx.fillStyle = 'rgba(248, 113, 113, .98)'
    ctx.beginPath()
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6))
    ctx.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6))
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  },
}
