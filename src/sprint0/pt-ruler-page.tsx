import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ChevronDown, ChevronUp, Minus, Plus, Save, SlidersHorizontal } from 'lucide-react'
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

type ReverseResult = {
  selectedPressure: number
  bubblePressure: number
  dewPressure: number
  selectedPressurePaAbs: number
}

function temperatureSymbol(unit: TemperatureUnit) {
  return unit === 'F' ? '°F' : '°C'
}

function displayTemperature(valueC: number, unit: TemperatureUnit) {
  return convertTemperature(valueC, 'C', unit)
}

function inputTemperatureToC(value: number, unit: TemperatureUnit) {
  return convertTemperature(value, unit, 'C')
}

function inputNumber(value: number, digits: number) {
  return Number(value.toFixed(digits)).toString()
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
  const [thermal, setThermal] = useState<ThermalResult | null>(null)
  const [full, setFull] = useState(false)
  const [chart, setChart] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showRuler, setShowRuler] = useState(false)
  const [showTechnical, setShowTechnical] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const table = getTable(refrigerant)
  const metadata = refrigerantMetadata[table.refrigerant]
  const superheat = mode === 'superheat'
  const subcooling = mode === 'subcooling'
  const title = superheat ? 'Recalentamiento' : subcooling ? 'Subenfriamiento' : 'Presión y temperatura'
  const zeotropic = isZeotropicWithGlide(table)
  const selectedBranch = zeotropic && application === 'condensacion' ? 'bubble' : 'dew'
  const selectedBranchLabel = zeotropic ? application === 'evaporacion' ? 'Rocío' : 'Burbuja' : 'Saturación'
  const pressureLabel = formatPressureLabel(unit, kind)

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
  const currentTemperature = parseLocalizedNumber(temperature)

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

  const reverseResult = useMemo<ReverseResult | null>(() => {
    try {
      if (!Number.isFinite(currentTemperature) || !table.points.length) return null
      const inputC = inputTemperatureToC(currentTemperature, temperatureUnit)
      const bubblePressurePaAbs = interpolatePressureFromTemperature(table, inputC, 'bubble')
      const dewPressurePaAbs = interpolatePressureFromTemperature(table, inputC, 'dew')
      const selectedPressurePaAbs = selectedBranch === 'dew' ? dewPressurePaAbs : bubblePressurePaAbs
      return {
        selectedPressurePaAbs,
        selectedPressure: paAbsoluteToPressure(selectedPressurePaAbs, unit, kind, atmospherePa),
        bubblePressure: paAbsoluteToPressure(bubblePressurePaAbs, unit, kind, atmospherePa),
        dewPressure: paAbsoluteToPressure(dewPressurePaAbs, unit, kind, atmospherePa),
      }
    } catch {
      return null
    }
  }, [atmospherePa, currentTemperature, kind, selectedBranch, table, temperatureUnit, unit])

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
  const pressureStep = unit === 'PSI' ? 0.5 : unit === 'kPa' ? 10 : unit === 'MPa' ? 0.01 : 0.1
  const temperatureStep = temperatureUnit === 'F' ? 1 : 0.5

  const updatePressure = (value: string) => {
    setPressure(value)
    setSaved(false)
  }

  const updateTemperature = (value: string) => {
    setTemperature(value)
    setSaved(false)
  }

  const nudgePressure = (delta: number) => {
    const base = Number.isFinite(currentPressure) ? currentPressure : 0
    const next = Math.min(pressureRange.max, Math.max(pressureRange.min, base + delta))
    updatePressure(inputNumber(next, unit === 'kPa' ? 0 : unit === 'MPa' ? 3 : 2))
  }

  const nudgeTemperature = (delta: number) => {
    const base = Number.isFinite(currentTemperature) ? currentTemperature : 0
    updateTemperature(inputNumber(base + delta, 1))
  }

  const calculateThermal = () => {
    setSaved(false)
    try {
      if (!table.points.length) throw new Error(`No hay tabla validada para ${refrigerant}.`)
      const pressurePaAbs = pressureToPaAbsolute(parseRequiredNumber(pressure, 'presión'), unit, kind, atmospherePa)
      const measuredC = inputTemperatureToC(parseRequiredNumber(temperature, 'temperatura'), temperatureUnit)
      const saturationC = interpolateTemperatureFromPressure(table, pressurePaAbs, superheat ? 'dew' : 'bubble')
      const resultK = superheat ? calculateSuperheat(pressurePaAbs, measuredC, table) : calculateSubcooling(pressurePaAbs, measuredC, table)
      setThermal({ resultK, saturationC, measuredC, pressurePaAbs, indicator: superheat ? evaluateSuperheat(resultK) : evaluateSubcooling(resultK) })
    } catch {
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
    await createMeasurementDraft({ workType: superheat ? 'Medición de recalentamiento' : 'Medición de subenfriamiento', refrigerant, pressures: `${pressure} ${pressureLabel}`, temperatures: `${formatNumber(displayTemperature(thermal.measuredC, temperatureUnit), 1)} ${temperatureSymbol(temperatureUnit)}`, superheatK: superheat ? thermal.resultK : undefined, subcoolingK: subcooling ? thermal.resultK : undefined, observations: `Saturación ${formatNumber(displayTemperature(thermal.saturationC, temperatureUnit), 1)} ${temperatureSymbol(temperatureUnit)}.` })
    setSaved(true)
  }

  const savePtReading = async () => {
    if (direction === 'pressure') {
      if (!liveResult) return
      const calculation = enginePressureTemperature({ refrigerant, mode: 'pressure-to-temperature', pressure: currentPressure, pressureUnit: unit, pressureKind: kind, temperatureUnit, branch: selectedBranch, atmospherePa })
      await saveCalculationHistory(calculation)
      await createMeasurementDraft({ workType: 'Lectura presión-temperatura', refrigerant, pressures: `${formatNumber(currentPressure)} ${pressureLabel}`, temperatures: `${formatNumber(displayTemperature(liveResult.selectedC, temperatureUnit), 2)} ${temperatureSymbol(temperatureUnit)}`, observations: `${selectedBranchLabel}; burbuja ${formatNumber(displayTemperature(liveResult.bubbleC, temperatureUnit), 2)} ${temperatureSymbol(temperatureUnit)}; rocío ${formatNumber(displayTemperature(liveResult.dewC, temperatureUnit), 2)} ${temperatureSymbol(temperatureUnit)}.` })
    } else {
      if (!reverseResult) return
      const calculation = enginePressureTemperature({ refrigerant, mode: 'temperature-to-pressure', temperature: currentTemperature, pressureUnit: unit, pressureKind: kind, temperatureUnit, branch: selectedBranch, atmospherePa })
      await saveCalculationHistory(calculation)
      await createMeasurementDraft({ workType: 'Lectura temperatura-presión', refrigerant, pressures: `${formatNumber(reverseResult.selectedPressure)} ${pressureLabel}`, temperatures: `${formatNumber(currentTemperature)} ${temperatureSymbol(temperatureUnit)}`, observations: `${selectedBranchLabel}; burbuja ${formatNumber(reverseResult.bubblePressure)} ${pressureLabel}; rocío ${formatNumber(reverseResult.dewPressure)} ${pressureLabel}.` })
    }
    setSaved(true)
  }

  const min = table.validRange.minC ?? -30
  const max = table.validRange.maxC ?? 50
  const rowStep = Math.max(2, Math.ceil((max - min) / 42))
  const rows = commonPressureRows(table, full ? Array.from({ length: Math.floor((max - min) / rowStep) + 1 }, (_, index) => min + index * rowStep) : [-20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35])
  const liveValueText = liveResult ? `${formatNumber(currentPressure, 2)} ${pressureLabel}, ${formatNumber(displayTemperature(liveResult.selectedC, temperatureUnit), 2)} ${temperatureSymbol(temperatureUnit)}` : `${formatNumber(clampedPressure, 2)} ${pressureLabel}`

  return <main className="sz-screen sz-pt-screen">
    <PageTitle eyebrow="Cálculo termodinámico" title={title} description={mode === 'pt' ? 'Introduce un valor y consulta la saturación al instante.' : 'Usa presión medida y temperatura real de la tubería.'} />

    <section className={`sz-pt-toolbar ${mode === 'pt' ? '' : 'is-single'}`}>
      <label>Refrigerante<select value={refrigerant} onChange={(event) => { setRefrigerant(event.target.value); setSaved(false) }}>{refrigerantTables.map((item) => <option key={item.refrigerant}>{item.refrigerant}</option>)}</select></label>
      {mode === 'pt' && <button className={`sz-icon-button sz-pt-settings-button ${showOptions ? 'active' : ''}`} type="button" aria-label="Mostrar u ocultar unidades y opciones" aria-expanded={showOptions} onClick={() => setShowOptions(!showOptions)}><SlidersHorizontal /></button>}
    </section>

    {mode === 'pt' && <>
      <div className="sz-setting-segments sz-pt-direction-switch" aria-label="Sentido del cálculo">
        <button type="button" className={direction === 'pressure' ? 'active' : ''} aria-pressed={direction === 'pressure'} onClick={() => { setDirection('pressure'); setSaved(false) }}>Presión → temperatura</button>
        <button type="button" className={direction === 'temperature' ? 'active' : ''} aria-pressed={direction === 'temperature'} onClick={() => { setDirection('temperature'); setSaved(false) }}>Temperatura → presión</button>
      </div>

      {showOptions && <section className="sz-pt-options">
        <div className="sz-two-columns"><label>Unidad de presión<select value={unit} onChange={(event) => { setUnit(event.target.value as PressureUnit); setSaved(false) }}><option value="bar">bar</option><option value="PSI">PSI</option><option value="kPa">kPa</option><option value="MPa">MPa</option></select></label><label>Referencia<select value={kind} onChange={(event) => { setKind(event.target.value as PressureKind); setSaved(false) }}><option value="gauge">Manométrica</option><option value="absolute">Absoluta</option></select></label></div>
        {zeotropic && <div className="sz-setting-segments"><button type="button" className={application === 'evaporacion' ? 'active' : ''} aria-pressed={application === 'evaporacion'} onClick={() => { setApplication('evaporacion'); setSaved(false) }}>Rocío · evaporación</button><button type="button" className={application === 'condensacion' ? 'active' : ''} aria-pressed={application === 'condensacion'} onClick={() => { setApplication('condensacion'); setSaved(false) }}>Burbuja · condensación</button></div>}
        {!zeotropic && <p className="sz-pt-option-note">Este refrigerante no necesita elegir entre rocío y burbuja para una consulta rápida.</p>}
      </section>}

      {direction === 'pressure' ? <section className="sz-pt-quick-card">
        <div className="sz-pt-input-block">
          <span>Presión medida</span>
          <div className="sz-stepper-input">
            <button type="button" aria-label={`Reducir ${pressureStep} ${pressureLabel}`} onClick={() => nudgePressure(-pressureStep)}><Minus /></button>
            <input aria-label={`Presión en ${pressureLabel}`} inputMode="decimal" value={pressure} onChange={(event) => updatePressure(event.target.value)} />
            <span>{pressureLabel}</span>
            <button type="button" aria-label={`Aumentar ${pressureStep} ${pressureLabel}`} onClick={() => nudgePressure(pressureStep)}><Plus /></button>
          </div>
        </div>
        <div className="sz-pt-live-result" role="status" aria-live="polite">
          <small>{selectedBranchLabel} · temperatura de saturación</small>
          <div><strong>{liveResult ? formatNumber(displayTemperature(liveResult.selectedC, temperatureUnit), 2) : '—'}</strong><span>{temperatureSymbol(temperatureUnit)}</span></div>
          <p>{refrigerant} · {Number.isFinite(currentPressure) ? `${formatNumber(currentPressure, 2)} ${pressureLabel}` : 'Introduce una presión válida'}</p>
          {zeotropic && liveResult && <div className="sz-pt-branch-values"><span>Burbuja <strong>{formatNumber(displayTemperature(liveResult.bubbleC, temperatureUnit), 2)} {temperatureSymbol(temperatureUnit)}</strong></span><span>Rocío <strong>{formatNumber(displayTemperature(liveResult.dewC, temperatureUnit), 2)} {temperatureSymbol(temperatureUnit)}</strong></span></div>}
        </div>
        <button className="sz-button secondary sz-pt-save" type="button" disabled={!liveResult} onClick={savePtReading}><Save />Guardar lectura</button>
        {saved && <Notice tone="success"><p>Lectura guardada en intervenciones.</p></Notice>}
      </section> : <section className="sz-pt-quick-card">
        <div className="sz-pt-input-block">
          <span>Temperatura medida</span>
          <div className="sz-stepper-input">
            <button type="button" aria-label={`Reducir ${temperatureStep} ${temperatureSymbol(temperatureUnit)}`} onClick={() => nudgeTemperature(-temperatureStep)}><Minus /></button>
            <input aria-label={`Temperatura en ${temperatureSymbol(temperatureUnit)}`} inputMode="decimal" value={temperature} onChange={(event) => updateTemperature(event.target.value)} />
            <span>{temperatureSymbol(temperatureUnit)}</span>
            <button type="button" aria-label={`Aumentar ${temperatureStep} ${temperatureSymbol(temperatureUnit)}`} onClick={() => nudgeTemperature(temperatureStep)}><Plus /></button>
          </div>
        </div>
        <div className="sz-pt-live-result" role="status" aria-live="polite">
          <small>{selectedBranchLabel} · presión de saturación</small>
          <div><strong>{reverseResult ? formatNumber(reverseResult.selectedPressure, 2) : '—'}</strong><span>{pressureLabel}</span></div>
          <p>{refrigerant} · {Number.isFinite(currentTemperature) ? `${formatNumber(currentTemperature, 1)} ${temperatureSymbol(temperatureUnit)}` : 'Introduce una temperatura válida'}</p>
          {zeotropic && reverseResult && <div className="sz-pt-branch-values"><span>Burbuja <strong>{formatNumber(reverseResult.bubblePressure, 2)} {pressureLabel}</strong></span><span>Rocío <strong>{formatNumber(reverseResult.dewPressure, 2)} {pressureLabel}</strong></span></div>}
        </div>
        <button className="sz-button secondary sz-pt-save" type="button" disabled={!reverseResult} onClick={savePtReading}><Save />Guardar lectura</button>
        {saved && <Notice tone="success"><p>Lectura guardada en intervenciones.</p></Notice>}
      </section>}

      {direction === 'pressure' && <>
        <button className="sz-pt-disclosure" type="button" aria-expanded={showRuler} onClick={() => setShowRuler(!showRuler)}><span><strong>Ajustar con regla</strong><small>Desliza para afinar la presión visualmente</small></span>{showRuler ? <ChevronUp /> : <ChevronDown />}</button>
        {showRuler && <section className="sz-ruler-shell sz-ruler-shell-compact">
          <div className="sz-ruler-header"><strong>{pressureLabel}</strong><strong>{refrigerant}</strong><strong>{temperatureSymbol(temperatureUnit)}</strong></div>
          <div className="sz-ruler-body is-compact">
            <div className="sz-ruler-scale">
              {rulerTicks.map((tick, index) => <div className="sz-ruler-tick" key={`${tick.pressure}-${index}`}><span>{formatNumber(tick.pressure, unit === 'PSI' ? 1 : 2)}</span><i /><span>{tick.temperature === null ? '—' : formatNumber(tick.temperature, 0)}</span></div>)}
              <input className="sz-ruler-slider" aria-label="Presión" aria-valuetext={liveValueText} type="range" min={pressureRange.min} max={pressureRange.max} step={pressureRange.step} value={clampedPressure} onChange={(event) => updatePressure(event.target.value)} />
              <div className="sz-ruler-cursor" style={{ bottom: `${rulerPercent}%` }}><span>{formatNumber(clampedPressure, 2)}</span><span>{liveResult ? formatNumber(displayTemperature(liveResult.selectedC, temperatureUnit), 2) : '—'}</span></div>
            </div>
          </div>
        </section>}
      </>}

      <button className="sz-pt-disclosure" type="button" aria-expanded={showTechnical} onClick={() => setShowTechnical(!showTechnical)}><span><strong>Datos del refrigerante</strong><small>Seguridad, GWP, glide y validación</small></span>{showTechnical ? <ChevronUp /> : <ChevronDown />}</button>
      {showTechnical && <section className="sz-refrigerant-summary">
        <div><span>Grupo de seguridad</span><strong>{metadata.safetyClass.value ?? metadata.safetyClass.note}</strong></div>
        <div><span>GWP / PCA</span><strong>{metadata.gwp.value ?? metadata.gwp.note}</strong></div>
        <div><span>Glide máximo</span><strong>{maxGlideK(table) === null ? 'Pendiente' : `${formatNumber(maxGlideK(table) ?? 0, 2)} K`}</strong></div>
        <div><span>Tabla P/T</span><strong>{tableStatusLabel(table)}</strong></div>
      </section>}

      <button className="sz-pt-disclosure" type="button" aria-expanded={showTable} onClick={() => setShowTable(!showTable)}><span><strong>Tabla y gráfico P/T</strong><small>Consulta detallada del refrigerante</small></span>{showTable ? <ChevronUp /> : <ChevronDown />}</button>
      {showTable && <section className="sz-pt-reference-section">
        <div className="sz-button-row"><button className="sz-button secondary" type="button" onClick={() => setFull(!full)}>{full ? <ChevronUp /> : <ChevronDown />}{full ? 'Tabla resumida' : 'Tabla completa'}</button><button className="sz-button secondary" type="button" onClick={() => setChart(!chart)}><BarChart3 />{chart ? 'Ocultar gráfico' : 'Ver gráfico'}</button></div>
        {chart && <PtChart table={table} temperatureUnit={temperatureUnit} />}
        <div className="sz-table-wrap"><table><thead><tr><th>Temperatura</th><th>Burbuja</th><th>Rocío</th></tr></thead><tbody>{rows.map((row) => <tr key={row.temperatureC}><td>{formatNumber(displayTemperature(row.temperatureC, temperatureUnit), 1)} {temperatureSymbol(temperatureUnit)}</td><td>{row.bubblePressurePaAbs === null ? '—' : formatNumber(paAbsoluteToPressure(row.bubblePressurePaAbs, unit, kind, atmospherePa))}</td><td>{row.dewPressurePaAbs === null ? '—' : formatNumber(paAbsoluteToPressure(row.dewPressurePaAbs, unit, kind, atmospherePa))}</td></tr>)}</tbody></table></div>
      </section>}
    </>}

    {(superheat || subcooling) && <>
      <section className="sz-panel sz-form"><div className="sz-two-columns"><label>Presión<input inputMode="decimal" value={pressure} onChange={(event) => updatePressure(event.target.value)} /></label><label>Unidad<select value={unit} onChange={(event) => setUnit(event.target.value as PressureUnit)}><option value="bar">bar</option><option value="PSI">PSI</option><option value="kPa">kPa</option><option value="MPa">MPa</option></select></label></div><label>Referencia<select value={kind} onChange={(event) => setKind(event.target.value as PressureKind)}><option value="gauge">Manométrica</option><option value="absolute">Absoluta</option></select></label><label>{superheat ? 'Temperatura de aspiración' : 'Temperatura de línea de líquido'} {temperatureSymbol(temperatureUnit)}<input inputMode="decimal" value={temperature} onChange={(event) => updateTemperature(event.target.value)} /></label><button className="sz-button primary" type="button" onClick={calculateThermal}>Calcular</button></section>
      <section className={`sz-result is-${thermal?.indicator.tone ?? 'idle'}`}><small>{thermal?.indicator.label ?? 'Resultado'}</small><strong>{thermal ? `${formatNumber(thermal.resultK, 1)} K` : '—'}</strong>{thermal && <><div className="sz-data-list"><p><span>Saturación</span><strong>{formatNumber(displayTemperature(thermal.saturationC, temperatureUnit), 1)} {temperatureSymbol(temperatureUnit)}</strong></p><p><span>Medida</span><strong>{formatNumber(displayTemperature(thermal.measuredC, temperatureUnit), 1)} {temperatureSymbol(temperatureUnit)}</strong></p></div><p>{thermal.indicator.explanation}</p><ul className="sz-check-list">{thermal.indicator.checks.map((check) => <li key={check}>{check}</li>)}</ul><div className="sz-button-row"><button className="sz-button secondary" type="button" onClick={saveThermal}><Save />Guardar borrador</button><button className="sz-button ghost" type="button" onClick={() => navigate('/interventions')}>Ver trabajo</button></div>{saved && <Notice tone="success"><p>Medición guardada.</p></Notice>}</>}</section>
    </>}

    {zeotropic && <Notice tone="warning"><p>Mezcla con glide: usa rocío en evaporación y burbuja en condensación.</p></Notice>}
    <Notice tone="warning"><p>No mezcles ni sustituyas refrigerantes basándote únicamente en una presión parecida.</p></Notice>
  </main>
}
