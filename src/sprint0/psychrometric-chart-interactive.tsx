import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from 'react'
import { LocateFixed, Maximize2, Minimize2, Minus, Plus, RotateCcw } from 'lucide-react'
import type { PsychrometricComparisonResult, PsychrometricState } from '../calculation-engine/formulas/psychrometrics'
import { CHART_BOUNDS, enthalpyLine, humidityRatioGKg, relativeHumidityCurve, type ChartPoint } from './psychrometric-chart-math'
import { createChartViewBox, fitChartPoints, zoomChartViewport, type ChartViewport } from './psychrometric-chart-viewport'
import './psychrometric-chart.css'
import './psychrometric-chart-details.css'
import './psychrometric-chart-mobile.css'

type Props = {
  state?: PsychrometricState | null
  comparison?: PsychrometricComparisonResult | null
  pressurePa: number
}

type RenderPoint = {
  id: 'state' | 'a' | 'b'
  label: string
  state: PsychrometricState
}

type ClientPoint = { x: number; y: number }

const width = 760
const height = 430
const pad = { left: 58, right: 52, top: 30, bottom: 52 }
const rhValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const tempTicks = [-10, 0, 10, 20, 30, 40, 50]
const humidityTicks = [0, 5, 10, 15, 20, 25, 30]
const defaultViewport: ChartViewport = { zoom: 1, centerX: width / 2, centerY: height / 2 }

const x = (temperatureC: number) => pad.left + ((temperatureC - CHART_BOUNDS.minT) / (CHART_BOUNDS.maxT - CHART_BOUNDS.minT)) * (width - pad.left - pad.right)
const y = (ratioGKg: number) => height - pad.bottom - ((ratioGKg - CHART_BOUNDS.minW) / (CHART_BOUNDS.maxW - CHART_BOUNDS.minW)) * (height - pad.top - pad.bottom)
const pathFor = (points: ChartPoint[]) => points.map((point, index) => `${index ? 'L' : 'M'} ${x(point.dryBulbC).toFixed(1)} ${y(point.humidityRatioGKg).toFixed(1)}`).join(' ')
const value = (number: number, digits = 1) => number.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })

function detailRows(state: PsychrometricState) {
  return [
    ['Temperatura seca', `${value(state.dryBulbC, 1)} °C`],
    ['Humedad relativa', `${value(state.relativeHumidityPct, 1)} %`],
    ['Bulbo húmedo', `${value(state.wetBulbC, 1)} °C`],
    ['Punto de rocío', `${value(state.dewPointC, 1)} °C`],
    ['Razón de humedad', `${value(state.humidityRatioGKg, 2)} g/kg`],
    ['Humedad absoluta', `${value(state.absoluteHumidityGM3, 2)} g/m³`],
    ['Entalpía', `${value(state.moistAirEnthalpyKJkg, 2)} kJ/kg`],
    ['Volumen específico', `${value(state.moistAirVolumeM3kg, 3)} m³/kg`],
    ['Densidad aire húmedo', `${value(state.moistAirDensityKgM3, 3)} kg/m³`],
    ['Presión atmosférica', `${value(state.pressurePa / 1000, 2)} kPa`],
  ]
}

export function PsychrometricChart({ state = null, comparison = null, pressurePa }: Props) {
  const cardRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pointersRef = useRef(new Map<number, ClientPoint>())
  const dragRef = useRef<{ pointerId: number; clientX: number; clientY: number; viewport: ChartViewport } | null>(null)
  const pinchRef = useRef<{ distance: number; viewport: ChartViewport; focusX: number; focusY: number } | null>(null)
  const [showComfort, setShowComfort] = useState(true)
  const [showEnthalpy, setShowEnthalpy] = useState(true)
  const [selectedId, setSelectedId] = useState<RenderPoint['id'] | null>(null)
  const [viewport, setViewport] = useState<ChartViewport>(defaultViewport)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isImmersiveFallback, setIsImmersiveFallback] = useState(false)
  const safePressure = Number.isFinite(pressurePa) && pressurePa > 50000 ? pressurePa : 101325
  const curves = useMemo(() => rhValues.map((rh) => ({ rh, points: relativeHumidityCurve(rh, safePressure) })), [safePressure])
  const points: RenderPoint[] = comparison
    ? [{ id: 'a', label: 'Estado A', state: comparison.a }, { id: 'b', label: 'Estado B', state: comparison.b }]
    : state
      ? [{ id: 'state', label: 'Estado calculado', state }]
      : []
  const selected = points.find((point) => point.id === selectedId) ?? points[0] ?? null
  const enthalpy = selected && showEnthalpy ? enthalpyLine(selected.state.moistAirEnthalpyKJkg) : []
  const viewBox = createChartViewBox(viewport, width, height)
  const expanded = isFullscreen || isImmersiveFallback
  const comfort = [
    { dryBulbC: 20, humidityRatioGKg: humidityRatioGKg(20, 30, safePressure) },
    { dryBulbC: 26, humidityRatioGKg: humidityRatioGKg(26, 30, safePressure) },
    { dryBulbC: 26, humidityRatioGKg: humidityRatioGKg(26, 60, safePressure) },
    { dryBulbC: 20, humidityRatioGKg: humidityRatioGKg(20, 60, safePressure) },
  ]

  const chartCoordinates = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: width / 2, y: height / 2 }
    const rect = svg.getBoundingClientRect()
    const currentViewBox = createChartViewBox(viewport, width, height)
    return {
      x: currentViewBox.x + ((clientX - rect.left) / Math.max(1, rect.width)) * currentViewBox.width,
      y: currentViewBox.y + ((clientY - rect.top) / Math.max(1, rect.height)) * currentViewBox.height,
    }
  }, [viewport])

  const zoomAt = useCallback((nextZoom: number, focusX = viewport.centerX, focusY = viewport.centerY) => {
    setViewport((current) => zoomChartViewport(current, nextZoom, focusX, focusY))
  }, [viewport.centerX, viewport.centerY])

  const centerSelected = useCallback(() => {
    if (!selected) {
      setViewport(defaultViewport)
      return
    }
    setViewport((current) => ({ zoom: Math.max(2.2, current.zoom), centerX: x(selected.state.dryBulbC), centerY: y(selected.state.humidityRatioGKg) }))
  }, [selected])

  const fitCurrentPoints = useCallback(() => {
    setViewport(fitChartPoints(points.map((point) => ({ x: x(point.state.dryBulbC), y: y(point.state.humidityRatioGKg) })), width, height))
  }, [points])

  useEffect(() => {
    if (comparison) fitCurrentPoints()
    else setViewport(defaultViewport)
  }, [Boolean(comparison)])

  useEffect(() => {
    if (selectedId) centerSelected()
  }, [selectedId])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === cardRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!isImmersiveFallback) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setIsImmersiveFallback(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isImmersiveFallback])

  const toggleFullscreen = async () => {
    if (isImmersiveFallback) {
      setIsImmersiveFallback(false)
      return
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    try {
      if (cardRef.current?.requestFullscreen) await cardRef.current.requestFullscreen()
      else setIsImmersiveFallback(true)
    } catch {
      setIsImmersiveFallback(true)
    }
  }

  const selectWithKeyboard = (event: KeyboardEvent<SVGGElement>, id: RenderPoint['id']) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelectedId(id)
    }
  }

  const pointerDistance = (first: ClientPoint, second: ClientPoint) => Math.hypot(second.x - first.x, second.y - first.y)

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size === 1) {
      dragRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, viewport }
    }
    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()]
      const midpoint = chartCoordinates((first.x + second.x) / 2, (first.y + second.y) / 2)
      pinchRef.current = { distance: pointerDistance(first, second), viewport, focusX: midpoint.x, focusY: midpoint.y }
      dragRef.current = null
    }
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const svg = svgRef.current
    if (!svg) return

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()]
      const distance = pointerDistance(first, second)
      const nextZoom = pinchRef.current.viewport.zoom * (distance / Math.max(1, pinchRef.current.distance))
      setViewport(zoomChartViewport(pinchRef.current.viewport, nextZoom, pinchRef.current.focusX, pinchRef.current.focusY))
      return
    }

    if (pointersRef.current.size === 1 && dragRef.current?.pointerId === event.pointerId && dragRef.current.viewport.zoom > 1) {
      const rect = svg.getBoundingClientRect()
      const startViewBox = createChartViewBox(dragRef.current.viewport, width, height)
      const deltaX = (event.clientX - dragRef.current.clientX) * startViewBox.width / Math.max(1, rect.width)
      const deltaY = (event.clientY - dragRef.current.clientY) * startViewBox.height / Math.max(1, rect.height)
      setViewport({ ...dragRef.current.viewport, centerX: dragRef.current.viewport.centerX - deltaX, centerY: dragRef.current.viewport.centerY - deltaY })
    }
  }

  const onPointerEnd = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId)
    pinchRef.current = null
    dragRef.current = null
  }

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const focus = chartCoordinates(event.clientX, event.clientY)
    zoomAt(viewport.zoom + (event.deltaY < 0 ? 0.25 : -0.25), focus.x, focus.y)
  }

  const onDoubleClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    const focus = chartCoordinates(event.clientX, event.clientY)
    zoomAt(viewport.zoom + 0.75, focus.x, focus.y)
  }

  return <section ref={cardRef} className={`psychro-chart-card ${expanded ? 'is-expanded' : ''}`} aria-labelledby="psychro-chart-title">
    <div className="psychro-chart-head"><div><span>Carta interactiva</span><h2 id="psychro-chart-title">Carta psicrométrica</h2><p>Toca un punto para consultar sus propiedades. Pellizca o usa los controles para ampliar la carta.</p></div><div className="psychro-chart-controls"><button type="button" className={showComfort ? 'active' : ''} onClick={() => setShowComfort(!showComfort)}>Confort</button><button type="button" className={showEnthalpy ? 'active' : ''} onClick={() => setShowEnthalpy(!showEnthalpy)}>Entalpía</button></div></div>
    {points.length > 1 && <div className="psychro-point-selector" aria-label="Seleccionar estado">{points.map((point) => <button key={point.id} type="button" className={selected?.id === point.id ? 'active' : ''} onClick={() => setSelectedId(point.id)}>{point.label}</button>)}</div>}
    <div className="psychro-chart-viewport-tools" aria-label="Controles de visualización">
      <button type="button" onClick={() => zoomAt(viewport.zoom - 0.5)} disabled={viewport.zoom <= 1} aria-label="Alejar carta" title="Alejar"><Minus /></button>
      <output aria-label="Nivel de zoom">{Math.round(viewport.zoom * 100)}%</output>
      <button type="button" onClick={() => zoomAt(viewport.zoom + 0.5)} disabled={viewport.zoom >= 4} aria-label="Ampliar carta" title="Ampliar"><Plus /></button>
      <button type="button" onClick={centerSelected} disabled={!selected} aria-label="Centrar punto seleccionado" title="Centrar punto"><LocateFixed /></button>
      <button type="button" onClick={() => setViewport(defaultViewport)} aria-label="Restablecer vista" title="Restablecer vista"><RotateCcw /></button>
      <button type="button" onClick={toggleFullscreen} aria-label={expanded ? 'Salir de pantalla completa' : 'Abrir en pantalla completa'} title={expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}>{expanded ? <Minimize2 /> : <Maximize2 />}</button>
    </div>
    <p className="psychro-mobile-hint">En móvil, gira el dispositivo para aprovechar mejor la pantalla. Puedes arrastrar la carta cuando esté ampliada.</p>
    <div className="psychro-chart-scroll"><svg ref={svgRef} className="psychro-chart-svg" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Carta psicrométrica ampliable con curvas de humedad relativa y estados seleccionables" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onWheel={onWheel} onDoubleClick={onDoubleClick}>
      <defs><marker id="psychro-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
      <rect className="psychro-plot-bg" x={pad.left} y={pad.top} width={width - pad.left - pad.right} height={height - pad.top - pad.bottom} rx="12" />
      {tempTicks.map((tick) => <g key={`t-${tick}`}><line className="psychro-grid" x1={x(tick)} y1={pad.top} x2={x(tick)} y2={height - pad.bottom} /><text className="psychro-axis-label" x={x(tick)} y={height - 24} textAnchor="middle">{tick}°</text></g>)}
      {humidityTicks.map((tick) => <g key={`w-${tick}`}><line className="psychro-grid" x1={pad.left} y1={y(tick)} x2={width - pad.right} y2={y(tick)} /><text className="psychro-axis-label" x={width - 12} y={y(tick) + 4} textAnchor="end">{tick}</text></g>)}
      {showComfort && comfort.every((point) => Number.isFinite(point.humidityRatioGKg)) && <polygon className="psychro-comfort" points={comfort.map((point) => `${x(point.dryBulbC)},${y(point.humidityRatioGKg)}`).join(' ')} />}
      {curves.map(({ rh, points: curve }) => curve.length > 1 && <g key={rh}><path className={rh === 100 ? 'psychro-rh-line saturation' : 'psychro-rh-line'} d={pathFor(curve)} />{rh >= 30 && rh < 100 && <text className="psychro-rh-label" x={x(curve[curve.length - 1].dryBulbC) - 4} y={y(curve[curve.length - 1].humidityRatioGKg) - 5} textAnchor="end">{rh}%</text>}</g>)}
      {enthalpy.length > 1 && <path className="psychro-enthalpy-line" d={pathFor(enthalpy)} />}
      {comparison && <line className="psychro-process-line" x1={x(comparison.a.dryBulbC)} y1={y(comparison.a.humidityRatioGKg)} x2={x(comparison.b.dryBulbC)} y2={y(comparison.b.humidityRatioGKg)} markerEnd="url(#psychro-arrow)" />}
      {selected && <g className="psychro-crosshair" aria-hidden="true"><line x1={x(selected.state.dryBulbC)} y1={y(selected.state.humidityRatioGKg)} x2={x(selected.state.dryBulbC)} y2={height - pad.bottom} /><line x1={pad.left} y1={y(selected.state.humidityRatioGKg)} x2={x(selected.state.dryBulbC)} y2={y(selected.state.humidityRatioGKg)} /></g>}
      {points.map((point, index) => <g className={`psychro-state-point point-${index} ${selected?.id === point.id ? 'selected' : ''}`} key={point.id} role="button" tabIndex={0} aria-label={`Seleccionar ${point.label}`} onClick={() => setSelectedId(point.id)} onKeyDown={(event) => selectWithKeyboard(event, point.id)}><circle cx={x(point.state.dryBulbC)} cy={y(point.state.humidityRatioGKg)} r="8" /><circle className="pulse" cx={x(point.state.dryBulbC)} cy={y(point.state.humidityRatioGKg)} r="14" /><text x={x(point.state.dryBulbC) + 12} y={y(point.state.humidityRatioGKg) - 12}>{point.label}</text></g>)}
      <text className="psychro-axis-title" x={(pad.left + width - pad.right) / 2} y={height - 5} textAnchor="middle">Temperatura seca (°C)</text>
      <text className="psychro-axis-title" transform={`translate(${width - 7} ${(pad.top + height - pad.bottom) / 2}) rotate(-90)`} textAnchor="middle">Razón de humedad (g/kg aire seco)</text>
    </svg></div>
    {selected ? <article className="psychro-selected-state" aria-live="polite"><div className="psychro-selected-head"><div><small>Punto seleccionado</small><h3>{selected.label}</h3></div><strong>{value(selected.state.dryBulbC, 1)} °C · {value(selected.state.relativeHumidityPct, 0)} % HR</strong></div><div className="psychro-selected-grid">{detailRows(selected.state).map(([label, result]) => <p key={label}><span>{label}</span><strong>{result}</strong></p>)}</div></article> : <p className="psychro-chart-empty">Introduce un estado válido para colocarlo sobre la carta.</p>}
    <p className="psychro-chart-note">Curvas y estados usan el mismo motor PsychroLib. La carta no sustituye el proyecto ni instrumentos calibrados.</p>
  </section>
}
