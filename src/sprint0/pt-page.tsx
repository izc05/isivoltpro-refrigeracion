import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { refrigerantTables, type RefrigerantTable } from '../data/generated'
import { calculateSubcooling, calculateSuperheat, evaluateSubcooling, evaluateSuperheat, interpolatePressureFromTemperature, interpolateTemperatureFromPressure, type ThermalIndicator } from '../domain/refrigerants/calculations'
import { commonPressureRows, tableStatusLabel } from '../domain/refrigerants/summary'
import { formatPressureLabel, paAbsoluteToPressure, pressureToPaAbsolute, type PressureKind, type PressureUnit } from '../domain/units'
import { EmptyState, Notice, PageTitle, createMeasurementDraft, formatNumber, getTable, isZeotropicWithGlide, parseRequiredNumber, preferredPressureUnits, useSettings } from './shared'

function UnitTabs({ unit, setUnit }: { unit: PressureUnit; setUnit: (value: PressureUnit) => void }) {
  return <div className="sz-segmented">{preferredPressureUnits.map((value) => <button type="button" key={value} className={unit === value ? 'active' : ''} onClick={() => setUnit(value)}>{value}</button>)}</div>
}

type ThermalResult = { resultK: number; saturationC: number; measuredC: number; pressurePaAbs: number; indicator: ThermalIndicator }

function PtChart({ table }: { table: RefrigerantTable }) {
  const points = table.points.filter((p) => p.bubbleC !== null || p.dewC !== null)
  if (points.length < 2) return <EmptyState icon={<BarChart3 />} title="Gráfico no disponible" text="Faltan datos termodinámicos validados." />
  const sample = points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 60)) === 0)
  const temps = sample.flatMap((p) => [p.bubbleC, p.dewC]).filter((v): v is number => v !== null)
  const minT = Math.min(...temps), maxT = Math.max(...temps), minP = Math.min(...sample.map((p) => p.pressurePaAbs)), maxP = Math.max(...sample.map((p) => p.pressurePaAbs))
  const x = (t: number) => 35 + ((t - minT) / Math.max(1, maxT - minT)) * 620
  const y = (p: number) => 245 - ((p - minP) / Math.max(1, maxP - minP)) * 210
  const line = (key: 'bubbleC' | 'dewC') => sample.filter((p) => p[key] !== null).map((p) => `${x(p[key] as number)},${y(p.pressurePaAbs)}`).join(' ')
  return <div className="sz-chart"><svg viewBox="0 0 700 275" role="img" aria-label={`Curva P/T ${table.refrigerant}`}><line x1="35" y1="245" x2="670" y2="245" className="axis"/><line x1="35" y1="25" x2="35" y2="245" className="axis"/><polyline points={line('bubbleC')} className="bubble-line"/><polyline points={line('dewC')} className="dew-line"/><text x="35" y="268">{formatNumber(minT, 0)} °C</text><text x="615" y="268">{formatNumber(maxT, 0)} °C</text></svg><div className="sz-chart-legend"><span>Burbuja</span><span className="dew">Rocío</span></div></div>
}

export function PtPage({ mode = 'pt' }: { mode?: 'pt' | 'superheat' | 'subcooling' }) {
  const { atmospherePa } = useSettings()
  const navigate = useNavigate()
  const [refrigerant, setRefrigerant] = useState('R32')
  const [pressure, setPressure] = useState('9')
  const [temperature, setTemperature] = useState(mode === 'pt' ? '5' : '12,5')
  const [unit, setUnit] = useState<PressureUnit>('bar')
  const [kind, setKind] = useState<PressureKind>('gauge')
  const [direction, setDirection] = useState<'pressure' | 'temperature'>('pressure')
  const [application, setApplication] = useState<'evaporacion' | 'condensacion'>('evaporacion')
  const [message, setMessage] = useState('Introduce datos y pulsa calcular.')
  const [details, setDetails] = useState<{ bubble: string; dew: string; input: string } | null>(null)
  const [thermal, setThermal] = useState<ThermalResult | null>(null)
  const [full, setFull] = useState(false)
  const [chart, setChart] = useState(false)
  const [saved, setSaved] = useState(false)
  const table = getTable(refrigerant)
  const superheat = mode === 'superheat', subcooling = mode === 'subcooling'
  const title = superheat ? 'Recalentamiento' : subcooling ? 'Subenfriamiento' : 'Presión - Temperatura'
  const zeotropic = isZeotropicWithGlide(table)

  const calculate = () => {
    setSaved(false)
    try {
      if (!table.points.length) throw new Error(`No hay tabla validada para ${refrigerant}.`)
      if (superheat || subcooling) {
        const p = pressureToPaAbsolute(parseRequiredNumber(pressure, 'presión'), unit, kind, atmospherePa)
        const measuredC = parseRequiredNumber(temperature, 'temperatura')
        const saturationC = interpolateTemperatureFromPressure(table, p, superheat ? 'dew' : 'bubble')
        const resultK = superheat ? calculateSuperheat(p, measuredC, table) : calculateSubcooling(p, measuredC, table)
        setThermal({ resultK, saturationC, measuredC, pressurePaAbs: p, indicator: superheat ? evaluateSuperheat(resultK) : evaluateSubcooling(resultK) })
        return
      }
      if (direction === 'pressure') {
        const input = parseRequiredNumber(pressure, 'presión')
        const p = pressureToPaAbsolute(input, unit, kind, atmospherePa)
        const bubble = interpolateTemperatureFromPressure(table, p, 'bubble'), dew = interpolateTemperatureFromPressure(table, p, 'dew')
        const selected = zeotropic ? (application === 'evaporacion' ? dew : bubble) : (bubble + dew) / 2
        setMessage(`${formatNumber(selected, 2)} °C`)
        setDetails({ input: `${formatNumber(input)} ${formatPressureLabel(unit, kind)}`, bubble: `${formatNumber(bubble)} °C`, dew: `${formatNumber(dew)} °C` })
      } else {
        const input = parseRequiredNumber(temperature, 'temperatura')
        const bubble = interpolatePressureFromTemperature(table, input, 'bubble'), dew = interpolatePressureFromTemperature(table, input, 'dew')
        const selected = zeotropic ? (application === 'evaporacion' ? dew : bubble) : (bubble + dew) / 2
        setMessage(`${formatNumber(paAbsoluteToPressure(selected, unit, kind, atmospherePa))} ${formatPressureLabel(unit, kind)}`)
        setDetails({ input: `${formatNumber(input)} °C`, bubble: `${formatNumber(paAbsoluteToPressure(bubble, unit, kind, atmospherePa))}`, dew: `${formatNumber(paAbsoluteToPressure(dew, unit, kind, atmospherePa))}` })
      }
      setThermal(null)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo calcular.'); setDetails(null); setThermal(null) }
  }

  const save = async () => {
    if (!thermal) return
    await createMeasurementDraft({ workType: superheat ? 'Medición de recalentamiento' : 'Medición de subenfriamiento', refrigerant, pressures: `${pressure} ${formatPressureLabel(unit, kind)}`, temperatures: `${thermal.measuredC} °C`, superheatK: superheat ? thermal.resultK : undefined, subcoolingK: subcooling ? thermal.resultK : undefined, observations: `Saturación ${thermal.saturationC.toFixed(1)} °C.` })
    setSaved(true)
  }

  const min = table.validRange.minC ?? -30, max = table.validRange.maxC ?? 50, step = Math.max(2, Math.ceil((max - min) / 42))
  const rows = commonPressureRows(table, full ? Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step) : [-20,-15,-10,-5,0,5,10,15,20,25,30,35])

  return <main className="sz-screen"><PageTitle eyebrow="Cálculo termodinámico" title={title} description="Datos medidos y tabla trazable del refrigerante." />
    <section className="sz-panel sz-form"><label>Refrigerante<select value={refrigerant} onChange={(e) => setRefrigerant(e.target.value)}>{refrigerantTables.map((r) => <option key={r.refrigerant}>{r.refrigerant}</option>)}</select></label>
      {mode === 'pt' && <><div className="sz-segmented two"><button type="button" className={direction === 'pressure' ? 'active' : ''} onClick={() => setDirection('pressure')}>Presión → Temp.</button><button type="button" className={direction === 'temperature' ? 'active' : ''} onClick={() => setDirection('temperature')}>Temp. → Presión</button></div><label>Aplicación<select value={application} onChange={(e) => setApplication(e.target.value as typeof application)}><option value="evaporacion">Evaporación / rocío</option><option value="condensacion">Condensación / burbuja</option></select></label><UnitTabs unit={unit} setUnit={setUnit}/></>}
      <div className="sz-two-columns">{(mode !== 'pt' || direction === 'pressure') && <label>Presión<input inputMode="decimal" value={pressure} onChange={(e) => setPressure(e.target.value)}/></label>}<label>Referencia<select value={kind} onChange={(e) => setKind(e.target.value as PressureKind)}><option value="gauge">Manométrica</option><option value="absolute">Absoluta</option></select></label></div>
      {(mode !== 'pt' || direction === 'temperature') && <label>{superheat ? 'Temperatura aspiración °C' : subcooling ? 'Temperatura línea líquido °C' : 'Temperatura °C'}<input inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value)}/></label>}
      <button className="sz-button primary" type="button" onClick={calculate}>Calcular</button></section>
    {mode === 'pt' ? <section className="sz-result"><div className="sz-result-head"><span>{refrigerant}</span><small>{tableStatusLabel(table)}</small></div><small>Resultado</small><strong>{message}</strong>{details && <div className="sz-data-list"><p><span>Entrada</span><strong>{details.input}</strong></p><p><span>Burbuja</span><strong>{details.bubble}</strong></p><p><span>Rocío</span><strong>{details.dew}</strong></p></div>}</section> : <section className={`sz-result is-${thermal?.indicator.tone ?? 'idle'}`}><small>{thermal?.indicator.label ?? 'Resultado'}</small><strong>{thermal ? `${formatNumber(thermal.resultK, 1)} K` : '—'}</strong>{thermal && <><div className="sz-data-list"><p><span>Saturación</span><strong>{formatNumber(thermal.saturationC,1)} °C</strong></p><p><span>Medida</span><strong>{formatNumber(thermal.measuredC,1)} °C</strong></p></div><p>{thermal.indicator.explanation}</p><ul className="sz-check-list">{thermal.indicator.checks.map((c) => <li key={c}>{c}</li>)}</ul><div className="sz-button-row"><button className="sz-button secondary" type="button" onClick={save}><Save/>Guardar borrador</button><button className="sz-button ghost" type="button" onClick={() => navigate('/interventions')}>Ver trabajo</button></div>{saved && <Notice tone="success"><p>Medición guardada.</p></Notice>}</>}</section>}
    {mode === 'pt' && <><div className="sz-button-row"><button className="sz-button secondary" type="button" onClick={() => setFull(!full)}>{full ? <ChevronUp/> : <ChevronDown/>}{full ? 'Tabla resumida' : 'Tabla completa'}</button><button className="sz-button secondary" type="button" onClick={() => setChart(!chart)}><BarChart3/>{chart ? 'Ocultar gráfico' : 'Ver gráfico'}</button></div>{chart && <PtChart table={table}/>}<div className="sz-table-wrap"><table><thead><tr><th>Temp. °C</th><th>Burbuja</th><th>Rocío</th></tr></thead><tbody>{rows.map((r) => <tr key={r.temperatureC}><td>{formatNumber(r.temperatureC,1)}</td><td>{r.bubblePressurePaAbs === null ? '—' : formatNumber(paAbsoluteToPressure(r.bubblePressurePaAbs, unit, kind, atmospherePa))}</td><td>{r.dewPressurePaAbs === null ? '—' : formatNumber(paAbsoluteToPressure(r.dewPressurePaAbs, unit, kind, atmospherePa))}</td></tr>)}</tbody></table></div></>}
    {zeotropic && <Notice tone="warning"><p>Usa rocío para recalentamiento y burbuja para subenfriamiento.</p></Notice>}
  </main>
}
