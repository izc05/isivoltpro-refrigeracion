import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, BookOpen, ChevronDown, ChevronUp, Save, SlidersHorizontal } from 'lucide-react'
import { refrigerantTables, type RefrigerantTable } from '../data/generated'
import { calculatePressureTemperature as enginePressureTemperature, calculateSubcooling as engineSubcooling, calculateSuperheat as engineSuperheat } from '../calculation-engine/formulas/refrigerants'
import { saveCalculationHistory } from '../calculation-engine/refrigerants/history'
import { refrigerantMetadata } from '../data/refrigerant-metadata'
import { calculateSubcooling, calculateSuperheat, evaluateSubcooling, evaluateSuperheat, interpolatePressureFromTemperature, interpolateTemperatureFromPressure, type ThermalIndicator } from '../domain/refrigerants/calculations'
import { commonPressureRows, maxGlideK, tableStatusLabel } from '../domain/refrigerants/summary'
import { formatPressureLabel, paAbsoluteToPressure, parseLocalizedNumber, pressureToPaAbsolute, type PressureKind, type PressureUnit } from '../domain/units'
import { convertTemperature, type TemperatureUnit } from '../domain/technical-conversions'
import { EmptyState, Notice, PageTitle, createMeasurementDraft, formatNumber, getTable, isZeotropicWithGlide, parseRequiredNumber, useSettings } from './shared'
import { useUnitPreferences } from './preferences'

type ThermalResult = { resultK: number; saturationC: number; measuredC: number; pressurePaAbs: number; indicator: ThermalIndicator }

type RulerTick = { pressure: number; temperature: number | null }

function temperatureSymbol(unit: TemperatureUnit) {
  return unit === 'F' ? '°F' : '°C'
}

function displayTemperature(valueC: number, unit: TemperatureUnit) {
  return convertTemperature(valueC, 'C', unit)
}

function inputTemperatureToC(value: number, unit: TemperatureUnit) {
  return convertTemperature(value, unit, 'C')
}

function PtChart({ table, temperatureUnit }: { table: RefrigerantTable; temperatureUnit: TemperatureUnit }) {
  const points = table.points.filter((point) => point.bubbleC !== null || point.dewC !== null)
  if (points.length < 2) return <EmptyState icon={<BarChart3 />} title="Gráfico no disponible" text="Faltan datos termodinámicos validados." />
  const sample = points.filter((_, index) => index % Math.max(1, Math.floor(points.length / 60)) === 0)
  const temperatures = sample.flatMap((point) => [point.bubbleC, point.dewC]).filter((value): value is number => value !== null)
  const minT = Math.min(...temperatures)
  const maxT = Math.max(...temperatures)
  const minP = Math.min(...sample.map((point) => point.pressurePaAbs))
  const maxP = Math.max(...sample.map((point) => point.pressurePaAbs))
  const x = (temperature: number) => 35 + ((temperature - minT) / Math.max(1, maxT - minT)) * 620
  const y = (pressure: number) => 245 - ((pressure - minP) / Math.max(1, maxP - minP)) * 210
  const line = (key: 'bubbleC' | 'dewC') => sample.filter((point) => point[key] !== null).map((point) => `${x(point[key] as number)},${y(point.pressurePaAbs)}`).join(' ')
  return <div className="sz-chart"><svg viewBox="0 0 700 275" role="img" aria-label={`Curva P/T ${table.refrigerant}`}><line x1="35" y1="245" x2="670" y2="245" className="axis" /><line x1="35" y1="25" x2="35" y2="245" className="axis" /><polyline points={line('bubbleC')} className="bubble-line" /><polyline points={line('dewC')} className="dew-line" /><text x="35" y="268">{formatNumber(displayTemperature(minT, temperatureUnit), 0)} {temperatureSymbol(temperatureUnit)}</text><text x="600" y="268">{formatNumber(displayTemperature(maxT, temperatureUnit), 0)} {temperatureSymbol(temperatureUnit)}</text></svg><div className="sz-chart-legend"><span>Burbuja</span><span className="dew">Rocío</span></div></div>
}

export function PtPage({ mode = 'pt' }: { mode?: 'pt' | 'superheat' | 'subcooling' }) {
  const { atmospherePa } = useSettings()
  const { pressureUnit, temperatureUnit } = useUnitPreferences()
  const navigate = useNavigate()
  const [refrigerant, setRefrigerant] = useState('R32')
  const [pressure, setPressure] = useState('9')
  const [temperature, setTemperature] = useState(() => temperatureUnit === 'F' ? '54,5' : mode === 'pt' ? '5' : '12,5')
  const [unit, setUnit] = useState<PressureUnit>(pressureUnit)
  const [kind, setKind] = useState<PressureKind>('gauge')
  const [direction, setDirection] = useState<'pressure' | 'temperature'>('pressure')
  const [application, setApplication] = useState<'evaporacion' | 'condensacion'>('evaporacion')
  const [message, setMessage] = useState('Introduce una temperatura y pulsa calcular.')
  const [details, setDetails] = useState<{ bubble: string; dew: string; input: string } | null>(null)
  const [thermal, setThermal] = useState<ThermalResult | null>(null)
  const [full, setFull] = useState(false)
  const [chart, setChart] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showOptions, setShowOptions] = useState(true)
  const [viewMode, setViewMode] = useState<'rapido' | 'explicado'>('rapido')
  const table = getTable(refrigerant)
  const metadata = refrigerantMetadata[table.refrigerant]
  const superheat = mode === 'superheat'
  const subcooling = mode === 'subcooling'
  const title = superheat ? 'Recalentamiento' : subcooling ? 'Subenfriamiento' : 'Regla de refrigerantes'
  const zeotropic = isZeotropicWithGlide(table)
  const selectedBranch = application === 'evaporacion' ? 'dew' : 'bubble'
  const selectedBranchLabel = application === 'evaporacion' ? 'Rocío' : 'Burbuja'

  const pressureRange = useMemo(() => {
    const points = table.points.filter((point) => Number.isFinite(point.pressurePaAbs))
    if (points.length < 2) return { min: 0, max: 30, step: 0.1 }
    const values = points.map((point) => paAbsoluteToPressure(point.pressurePaAbs, unit, kind, atmospherePa))
    const min = Math.min(...values)
    const max = Math.max(...values)
    const rawStep = (max - min) / 250
    const minimumStep = unit === 'PSI' ? 0.1 : unit === 'kPa' ? 1 : unit === 'MPa' ? 0.001 : 0.01
    return { min, max, step: Math.max(rawStep, minimumStep) }
  }, [atmospherePa, kind, table, unit])

  const currentPressure = parseLocalizedNumber(pressure)

  const liveResult = useMemo(() => {
    try {
      if (!Number.isFinite(currentPressure) || !table.points.length) return null
      const pressurePaAbs = pressureToPaAbsolute(currentPressure, unit, kind, atmospherePa)
      const bubbleC = interpolateTemperatureFromPressure(table, pressurePaAbs, 'bubble')
      const dewC = interpolateTemperatureFromPressure(table, pressurePaAbs, 'dew')
      const selectedC = selectedBranch === 'dew' ? dewC : bubbleC
      return { pressurePaAbs, bubbleC, dewC, selectedC }
    } catch {
      return null
    }
  }, [atmospherePa, currentPressure, kind, selectedBranch, table, unit])

  const rulerTicks = useMemo<RulerTick[]>(() => Array.from({ length: 9 }, (_, index) => {
    const ratio = index / 8
    const tickPressure = pressureRange.max - ratio * (pressureRange.max - pressureRange.min)
    try {
      const pressurePaAbs = pressureToPaAbsolute(tickPressure, unit, kind, atmospherePa)
      const temperatureC = interpolateTemperatureFromPressure(table, pressurePaAbs, selectedBranch)
      return { pressure: tickPressure, temperature: displayTemperature(temperatureC, temperatureUnit) }
    } catch {
      return { pressure: tickPressure, temperature: null }
    }
  }), [atmospherePa, kind, pressureRange.max, pressureRange.min, selectedBranch, table, temperatureUnit, unit])

  const clampedPressure = Number.isFinite(currentPressure) ? Math.min(pressureRange.max, Math.max(pressureRange.min, currentPressure)) : pressureRange.min
  const rulerPercent = ((clampedPressure - pressureRange.min) / Math.max(0.0001, pressureRange.max - pressureRange.min)) * 100

  const calculate = () => {
    setSaved(false)
    try {
      if (!table.points.length) throw new Error(`No hay tabla validada para ${refrigerant}.`)
      if (superheat || subcooling) {
        const pressurePaAbs = pressureToPaAbsolute(parseRequiredNumber(pressure, 'presión'), unit, kind, atmospherePa)
        const measuredC = inputTemperatureToC(parseRequiredNumber(temperature, 'temperatura'), temperatureUnit)
        const saturationC = interpolateTemperatureFromPressure(table, pressurePaAbs, superheat ? 'dew' : 'bubble')
        const resultK = superheat ? calculateSuperheat(pressurePaAbs, measuredC, table) : calculateSubcooling(pressurePaAbs, measuredC, table)
        setThermal({ resultK, saturationC, measuredC, pressurePaAbs, indicator: superheat ? evaluateSuperheat(resultK) : evaluateSubcooling(resultK) })
        return
      }
      const inputDisplay = parseRequiredNumber(temperature, 'temperatura')
      const inputC = inputTemperatureToC(inputDisplay, temperatureUnit)
      const bubble = interpolatePressureFromTemperature(table, inputC, 'bubble')
      const dew = interpolatePressureFromTemperature(table, inputC, 'dew')
      const selected = selectedBranch === 'dew' ? dew : bubble
      setMessage(`${formatNumber(paAbsoluteToPressure(selected, unit, kind, atmospherePa))} ${formatPressureLabel(unit, kind)}`)
      setDetails({ input: `${formatNumber(inputDisplay)} ${temperatureSymbol(temperatureUnit)}`, bubble: `${formatNumber(paAbsoluteToPressure(bubble, unit, kind, atmospherePa))}`, dew: `${formatNumber(paAbsoluteToPressure(dew, unit, kind, atmospherePa))}` })
      setThermal(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo calcular.')
      setDetails(null)
      setThermal(null)
    }
  }

  const saveThermal = async () => {
    if (!thermal) return
    if (superheat) {
      await saveCalculationHistory(engineSuperheat({ refrigerant, suctionPressure: parseRequiredNumber(pressure, 'presión'), pressureUnit: unit, pressureKind: kind, suctionPipeTemperature: parseRequiredNumber(temperature, 'temperatura'), temperatureUnit, atmospherePa }))
    } else {
      await saveCalculationHistory(engineSubcooling({ refrigerant, liquidPressure: parseRequiredNumber(pressure, 'presión'), pressureUnit: unit, pressureKind: kind, liquidLineTemperature: parseRequiredNumber(temperature, 'temperatura'), temperatureUnit, atmospherePa }))
    }
    await createMeasurementDraft({ workType: superheat ? 'Medición de recalentamiento' : 'Medición de subenfriamiento', refrigerant, pressures: `${pressure} ${formatPressureLabel(unit, kind)}`, temperatures: `${formatNumber(displayTemperature(thermal.measuredC, temperatureUnit), 1)} ${temperatureSymbol(temperatureUnit)}`, superheatK: superheat ? thermal.resultK : undefined, subcoolingK: subcooling ? thermal.resultK : undefined, observations: `Saturación ${formatNumber(displayTemperature(thermal.saturationC, temperatureUnit), 1)} ${temperatureSymbol(temperatureUnit)}.` })
    setSaved(true)
  }

  const savePtReading = async () => {
    if (!liveResult) return
    const calculation = enginePressureTemperature({ refrigerant, mode: 'pressure-to-temperature', pressure: currentPressure, pressureUnit: unit, pressureKind: kind, temperatureUnit, branch: selectedBranch, atmospherePa })
    await saveCalculationHistory(calculation)
    await createMeasurementDraft({ workType: 'Lectura presión-temperatura', refrigerant, pressures: `${formatNumber(currentPressure)} ${formatPressureLabel(unit, kind)}`, temperatures: `${formatNumber(displayTemperature(liveResult.selectedC, temperatureUnit), 2)} ${temperatureSymbol(temperatureUnit)}`, observations: `${selectedBranchLabel}; burbuja ${formatNumber(displayTemperature(liveResult.bubbleC, temperatureUnit), 2)} ${temperatureSymbol(temperatureUnit)}; rocío ${formatNumber(displayTemperature(liveResult.dewC, temperatureUnit), 2)} ${temperatureSymbol(temperatureUnit)}.` })
    setSaved(true)
  }

  const min = table.validRange.minC ?? -30
  const max = table.validRange.maxC ?? 50
  const step = Math.max(2, Math.ceil((max - min) / 42))
  const rows = commonPressureRows(table, full ? Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, index) => min + index * step) : [-20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35])

  return <main className="sz-screen sz-pt-screen">
    <PageTitle eyebrow="Cálculo termodinámico" title={title} description={mode === 'pt' ? 'Desliza la regla o introduce un valor para consultar la saturación.' : 'Usa presión medida y temperatura real de la tubería.'} />

    <div className="sz-mode-switch" aria-label="Modo de herramienta">
      <button type="button" className={viewMode === 'rapido' ? 'active' : ''} onClick={() => setViewMode('rapido')}>Modo rápido</button>
      <button type="button" className={viewMode === 'explicado' ? 'active' : ''} onClick={() => setViewMode('explicado')}><BookOpen />Modo explicado</button>
    </div>

    {viewMode === 'explicado' && <section className="sz-explained-panel"><h2>{mode === 'pt' ? 'Qué se calcula' : superheat ? 'Recalentamiento' : 'Subenfriamiento'}</h2><p>{mode === 'pt' ? 'La regla P/T relaciona presión y temperatura de saturación. En mezclas con glide se separan rocío y burbuja.' : superheat ? 'Recalentamiento = temperatura medida en aspiración - temperatura de saturación por rocío.' : 'Subenfriamiento = temperatura de saturación por burbuja - temperatura medida en línea de líquido.'}</p><div className="sz-data-list compact"><p><span>Procedimiento</span><strong>Medir, elegir unidad, calcular, interpretar</strong></p><p><span>Error frecuente</span><strong>No confundir presión absoluta y manométrica</strong></p><p><span>Uso técnico</span><strong>Resultado orientativo con fuente de datos</strong></p></div></section>}

    <section className="sz-pt-toolbar">
      <label>Refrigerante<select value={refrigerant} onChange={(event) => setRefrigerant(event.target.value)}>{refrigerantTables.map((item) => <option key={item.refrigerant}>{item.refrigerant}</option>)}</select></label>
      <button className={`sz-icon-button sz-pt-settings-button ${showOptions ? 'active' : ''}`} type="button" aria-label="Mostrar u ocultar opciones de cálculo" aria-expanded={showOptions} onClick={() => setShowOptions(!showOptions)}><SlidersHorizontal /></button>
    </section>

    {mode === 'pt' && <>
      {showOptions && <section className="sz-pt-options">
        <div className="sz-setting-segments"><button type="button" className={direction === 'pressure' ? 'active' : ''} onClick={() => setDirection('pressure')}>Presión → temperatura</button><button type="button" className={direction === 'temperature' ? 'active' : ''} onClick={() => setDirection('temperature')}>Temperatura → presión</button></div>
        <div className="sz-two-columns"><label>Unidad de presión<select value={unit} onChange={(event) => setUnit(event.target.value as PressureUnit)}><option value="bar">bar</option><option value="PSI">PSI</option><option value="kPa">kPa</option><option value="MPa">MPa</option></select></label><label>Referencia<select value={kind} onChange={(event) => setKind(event.target.value as PressureKind)}><option value="gauge">Manométrica</option><option value="absolute">Absoluta</option></select></label></div>
        <div className="sz-setting-segments"><button type="button" className={application === 'evaporacion' ? 'active' : ''} onClick={() => setApplication('evaporacion')}>Rocío · evaporación</button><button type="button" className={application === 'condensacion' ? 'active' : ''} onClick={() => setApplication('condensacion')}>Burbuja · condensación</button></div>
      </section>}

      {direction === 'pressure' ? <section className="sz-ruler-shell">
        <div className="sz-ruler-header"><strong>{formatPressureLabel(unit, kind)}</strong><strong>{refrigerant}</strong><strong>{temperatureSymbol(temperatureUnit)}</strong></div>
        <div className="sz-ruler-body">
          <div className="sz-ruler-scale">
            {rulerTicks.map((tick, index) => <div className="sz-ruler-tick" key={`${tick.pressure}-${index}`}><span>{formatNumber(tick.pressure, unit === 'PSI' ? 1 : 2)}</span><i /><span>{tick.temperature === null ? '—' : formatNumber(tick.temperature, 0)}</span></div>)}
            <input className="sz-ruler-slider" aria-label="Presión" type="range" min={pressureRange.min} max={pressureRange.max} step={pressureRange.step} value={clampedPressure} onChange={(event) => setPressure(event.target.value)} />
            <div className="sz-ruler-cursor" style={{ bottom: `${rulerPercent}%` }}><span>{formatNumber(clampedPressure, 2)}</span><span>{liveResult ? formatNumber(displayTemperature(liveResult.selectedC, temperatureUnit), 2) : '—'}</span></div>
          </div>
          <aside className="sz-ruler-results">
            <label>Presión<input inputMode="decimal" value={pressure} onChange={(event) => setPressure(event.target.value)} /></label>
            <article><small>Presión seleccionada</small><strong>{Number.isFinite(currentPressure) ? formatNumber(currentPressure, 2) : '—'}</strong><span>{formatPressureLabel(unit, kind)}</span></article>
            <article><small>{selectedBranchLabel}</small><strong>{liveResult ? formatNumber(displayTemperature(liveResult.selectedC, temperatureUnit), 2) : '—'}</strong><span>{temperatureSymbol(temperatureUnit)}</span></article>
            <div className="sz-button-row"><button className="sz-button secondary" type="button" disabled={!liveResult} onClick={savePtReading}><Save />Guardar lectura</button></div>
            {saved && <Notice tone="success"><p>Lectura guardada en intervenciones.</p></Notice>}
          </aside>
        </div>
      </section> : <section className="sz-panel sz-form"><label>Temperatura {temperatureSymbol(temperatureUnit)}<input inputMode="decimal" value={temperature} onChange={(event) => setTemperature(event.target.value)} /></label><button className="sz-button primary" type="button" onClick={calculate}>Calcular presión</button><div className="sz-result"><small>Resultado</small><strong>{message}</strong>{details && <div className="sz-data-list"><p><span>Entrada</span><strong>{details.input}</strong></p><p><span>Burbuja</span><strong>{details.bubble}</strong></p><p><span>Rocío</span><strong>{details.dew}</strong></p></div>}</div></section>}

      <section className="sz-refrigerant-summary">
        <div><span>Grupo de seguridad</span><strong>{metadata.safetyClass.value ?? metadata.safetyClass.note}</strong></div>
        <div><span>GWP / PCA</span><strong>{metadata.gwp.value ?? metadata.gwp.note}</strong></div>
        <div><span>Glide máximo</span><strong>{maxGlideK(table) === null ? 'Pendiente' : `${formatNumber(maxGlideK(table) ?? 0, 2)} K`}</strong></div>
        <div><span>Tabla P/T</span><strong>{tableStatusLabel(table)}</strong></div>
      </section>
    </>}

    {(superheat || subcooling) && <>
      <section className="sz-panel sz-form"><div className="sz-two-columns"><label>Presión<input inputMode="decimal" value={pressure} onChange={(event) => setPressure(event.target.value)} /></label><label>Unidad<select value={unit} onChange={(event) => setUnit(event.target.value as PressureUnit)}><option value="bar">bar</option><option value="PSI">PSI</option><option value="kPa">kPa</option><option value="MPa">MPa</option></select></label></div><label>Referencia<select value={kind} onChange={(event) => setKind(event.target.value as PressureKind)}><option value="gauge">Manométrica</option><option value="absolute">Absoluta</option></select></label><label>{superheat ? 'Temperatura de aspiración' : 'Temperatura de línea de líquido'} {temperatureSymbol(temperatureUnit)}<input inputMode="decimal" value={temperature} onChange={(event) => setTemperature(event.target.value)} /></label><button className="sz-button primary" type="button" onClick={calculate}>Calcular</button></section>
      <section className={`sz-result is-${thermal?.indicator.tone ?? 'idle'}`}><small>{thermal?.indicator.label ?? 'Resultado'}</small><strong>{thermal ? `${formatNumber(thermal.resultK, 1)} K` : '—'}</strong>{thermal && <><div className="sz-data-list"><p><span>Saturación</span><strong>{formatNumber(displayTemperature(thermal.saturationC, temperatureUnit), 1)} {temperatureSymbol(temperatureUnit)}</strong></p><p><span>Medida</span><strong>{formatNumber(displayTemperature(thermal.measuredC, temperatureUnit), 1)} {temperatureSymbol(temperatureUnit)}</strong></p></div><p>{thermal.indicator.explanation}</p><ul className="sz-check-list">{thermal.indicator.checks.map((check) => <li key={check}>{check}</li>)}</ul><div className="sz-button-row"><button className="sz-button secondary" type="button" onClick={saveThermal}><Save />Guardar borrador</button><button className="sz-button ghost" type="button" onClick={() => navigate('/interventions')}>Ver trabajo</button></div>{saved && <Notice tone="success"><p>Medición guardada.</p></Notice>}</>}</section>
    </>}

    {mode === 'pt' && <><div className="sz-button-row"><button className="sz-button secondary" type="button" onClick={() => setFull(!full)}>{full ? <ChevronUp /> : <ChevronDown />}{full ? 'Tabla resumida' : 'Tabla completa'}</button><button className="sz-button secondary" type="button" onClick={() => setChart(!chart)}><BarChart3 />{chart ? 'Ocultar gráfico' : 'Ver gráfico'}</button></div>{chart && <PtChart table={table} temperatureUnit={temperatureUnit} />}<div className="sz-table-wrap"><table><thead><tr><th>Temperatura</th><th>Burbuja</th><th>Rocío</th></tr></thead><tbody>{rows.map((row) => <tr key={row.temperatureC}><td>{formatNumber(displayTemperature(row.temperatureC, temperatureUnit), 1)} {temperatureSymbol(temperatureUnit)}</td><td>{row.bubblePressurePaAbs === null ? '—' : formatNumber(paAbsoluteToPressure(row.bubblePressurePaAbs, unit, kind, atmospherePa))}</td><td>{row.dewPressurePaAbs === null ? '—' : formatNumber(paAbsoluteToPressure(row.dewPressurePaAbs, unit, kind, atmospherePa))}</td></tr>)}</tbody></table></div></>}
    {zeotropic && <Notice tone="warning"><p>Para mezclas zeotrópicas usa rocío en recalentamiento y burbuja en subenfriamiento.</p></Notice>}
    <Notice tone="warning"><p>No mezcles ni sustituyas refrigerantes basándote únicamente en una presión parecida.</p></Notice>
  </main>
}
