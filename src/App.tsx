import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowUpDown, BarChart3, ClipboardList, Database, FileText, Gauge, Grid3X3, Home, LockKeyhole, Menu, Scale, Settings, Stethoscope, Table2, Thermometer } from 'lucide-react'
import './index.css'
import { refrigerantTables, type RefrigerantTable } from './data/generated'
import { refrigerantCategoryLabels, refrigerantMetadata, type RefrigerantCategory } from './data/refrigerant-metadata'
import { commercialRefrigerantWarning, commercialRefrigerants } from './data/commercial-refrigerants'
import { calculateSubcooling, calculateSuperheat, evaluateSubcooling, evaluateSuperheat, interpolatePressureFromTemperature, interpolateTemperatureFromPressure, type ThermalIndicator } from './domain/refrigerants/calculations'
import { commonPressureRows, formatRange, maxGlideK, tableStatusLabel } from './domain/refrigerants/summary'
import { altitudeToAtmospherePa, DEFAULT_ATMOSPHERE_PA, formatPressureLabel, paAbsoluteToPressure, pressureToPaAbsolute, parseLocalizedNumber, type PressureKind, type PressureUnit, vacuumToPaAbsolute, paAbsoluteToVacuum, type VacuumUnit } from './domain/units'
import { calculateAdditionalChargeWithUnits } from './domain/charge'
import { convertAirflow, convertCoolingPower, convertLength, convertMass, convertTemperature, copFromEer, eerFromCop, singlePhaseCurrent, threePhaseCurrent, type AirflowUnit, type CoolingPowerUnit, type LengthUnit, type MassUnit, type TemperatureUnit } from './domain/technical-conversions'
import { runDiagnosticRules } from './domain/diagnostics/rules'
import { db, newId, type Intervention } from './domain/storage/db'
import { generateInterventionPdf } from './domain/reports/pdf'

const pressureUnits: PressureUnit[] = ['Pa', 'kPa', 'MPa', 'bar', 'PSI', 'kgf/cm2', 'atm']
const preferredPressureUnits: PressureUnit[] = ['bar', 'PSI', 'kPa', 'MPa']
const vacuumUnits: VacuumUnit[] = ['micron', 'Pa_abs', 'mbar_abs', 'Torr', 'mmHg', 'inHg', 'bar_abs']
const massUnits: MassUnit[] = ['g', 'kg', 'lb', 'oz']
const lengthUnits: LengthUnit[] = ['m', 'ft']
const coolingPowerUnits: CoolingPowerUnit[] = ['kW', 'frig_h', 'BTU_h']
const airflowUnits: AirflowUnit[] = ['m3_h', 'l_s', 'CFM']
const tools = [
  ['Presión - Temperatura', 'Tabla P/T', 'pt', Thermometer],
  ['Recalentamiento', 'Cálculos', 'superheat', ArrowUpDown],
  ['Conversor', 'Presión y vacío', 'converter', Gauge],
  ['Vacío', 'Micrones y prueba', 'vacuum', Gauge],
  ['Refrigerantes', 'Tablas y datos', 'refrigerants', Table2],
  ['Comparador', 'Compatibilidad', 'compare', Scale],
  ['Calculadora de carga', 'Longitud y carga', 'charge', LockKeyhole],
  ['Diagnóstico', 'Guía rápida', 'diagnostics', Stethoscope],
  ['Intervenciones', 'Registro y clientes', 'interventions', ClipboardList],
] as const

const appIconUrl = `${import.meta.env.BASE_URL}icons/icon.png`

type ThermalResult = {
  resultK: number
  saturationC: number
  measuredC: number
  pressurePaAbs: number
  indicator: ThermalIndicator
}

type PtDirection = 'pressure-to-temp' | 'temp-to-pressure'
type PtResult = {
  pressureMeasured?: { value: string; saturationC: string; bubbleC: number; dewC: number }
  temperatureTarget?: { value: string; pressure: string; bubblePressure: number; dewPressure: number }
  glideK: number | null
  zeotropic: boolean
  error?: string
}

const formatNumber = (value: number, digits = 2) => value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })

function isZeotropicWithGlide(table: RefrigerantTable): boolean {
  const glide = maxGlideK(table)
  return table.refrigerantType === 'zeotropic' && glide !== null && glide > 0.1
}

function refrigerantOptions(category: RefrigerantCategory | 'all' = 'all') {
  return refrigerantTables.filter((table) => category === 'all' || refrigerantMetadata[table.refrigerant].category === category)
}

function getTable(name: string): RefrigerantTable {
  return refrigerantTables.find((table) => table.refrigerant === name) ?? refrigerantTables[0]
}

function useSettings() {
  const [atmospherePa, setAtmospherePa] = useState(() => {
    const saved = localStorage.getItem('isivolt_atmosphere')
    return saved ? parseFloat(saved) : DEFAULT_ATMOSPHERE_PA
  })
  const [technician, setTechnician] = useState(() => localStorage.getItem('isivolt_technician') || '')
  const [altitudeM, setAltitudeM] = useState(() => {
    const saved = localStorage.getItem('isivolt_altitude_m')
    return saved ? parseFloat(saved) : 0
  })
  
  useEffect(() => { localStorage.setItem('isivolt_atmosphere', atmospherePa.toString()) }, [atmospherePa])
  useEffect(() => { localStorage.setItem('isivolt_technician', technician) }, [technician])
  useEffect(() => { localStorage.setItem('isivolt_altitude_m', altitudeM.toString()) }, [altitudeM])

  return { atmospherePa, setAtmospherePa, technician, setTechnician, altitudeM, setAltitudeM }
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/' || location.pathname === '/tools'
  return <div className="app"><header className="topbar"><button className="icon-button" aria-label={isHome ? 'Menú' : 'Volver'} onClick={() => isHome ? undefined : navigate(-1)}>{isHome ? <Menu /> : <ArrowLeft />}</button><div><strong>IsiVoltPro <span>Refrigeración</span></strong><small>{isHome ? 'Cálculo, diagnóstico y control' : 'Herramienta técnica'}</small></div><NavLink className="icon-button" to="/settings" aria-label="Ajustes"><Settings /></NavLink></header>{children}<nav className="bottom"><NavLink to="/"><Home />Inicio</NavLink><NavLink to="/tools"><Grid3X3 />Herramientas</NavLink><NavLink to="/interventions"><ClipboardList />Intervenciones</NavLink><NavLink to="/settings"><Settings />Ajustes</NavLink></nav></div>
}

function HomePage() {
  return <main className="screen home-screen"><section className="brand-panel"><img src={appIconUrl} alt="IsiVoltPro Logo" /><div><h1>IsiVoltPro</h1><p>Refrigeración</p><span>Cálculo, diagnóstico y control de refrigerantes</span></div></section><div className="tool-grid">{tools.map(([label, subtitle, path, Icon]) => <NavLink className="tool-card" to={`/${path}`} key={path}><Icon /><strong>{label}</strong><small>{subtitle}</small></NavLink>)}</div><NavLink className="wide-action" to="/reports"><FileText />Informe PDF</NavLink><section className="info-grid"><article className="info-card"><h2>Características principales</h2><ul><li>Tablas P/T con burbuja y rocío cuando existan datos generados.</li><li>Cálculo de recalentamiento y subenfriamiento.</li><li>Registro local de intervenciones y PDF.</li><li>Funciona sin conexión.</li></ul></article><article className="info-card"><h2>Base de datos</h2><Database /><p>Los datos termodinámicos se generan con CoolProp y se almacenan localmente para uso sin conexión.</p></article><article className="info-card"><h2>Tecnologías</h2><p>React + TypeScript · Vite · Capacitor · PWA · IndexedDB</p></article></section><footer className="legal-strip">Herramienta orientativa para técnicos. Usar siempre procedimientos y normas de seguridad aplicables. <span>Versión 1.0.0</span></footer></main>
}

function SaturationTable({ table, unit, kind, atmospherePa }: { table: RefrigerantTable; unit: PressureUnit; kind: PressureKind; atmospherePa: number }) {
  if (table.points.length === 0) return <div className="empty-table"><Table2 /><strong>Tabla pendiente</strong><p>Genera datos con CoolProp para mostrar filas P/T reales. No se cargan valores manuales.</p></div>
  const rows = commonPressureRows(table, [-20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35])
  return <div className="table-wrap"><table><thead><tr><th>Temp. °C</th><th>Burbuja {formatPressureLabel(unit, kind)}</th><th>Rocío {formatPressureLabel(unit, kind)}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.temperatureC}><td>{row.temperatureC.toFixed(0)}</td><td>{row.bubblePressurePaAbs === null ? '-' : paAbsoluteToPressure(row.bubblePressurePaAbs, unit, kind, atmospherePa).toFixed(2)}</td><td>{row.dewPressurePaAbs === null ? '-' : paAbsoluteToPressure(row.dewPressurePaAbs, unit, kind, atmospherePa).toFixed(2)}</td></tr>)}</tbody></table></div>
}

function UnitTabs({ unit, setUnit }: { unit: PressureUnit; setUnit: (unit: PressureUnit) => void }) {
  return <div className="segmented">{preferredPressureUnits.map((u) => <button type="button" className={unit === u ? 'active' : ''} onClick={() => setUnit(u)} key={u}>{u}</button>)}</div>
}

function PtPage({ mode = 'pt' }: { mode?: 'pt' | 'superheat' | 'subcooling' }) {
  const { atmospherePa } = useSettings()
  const [refrigerant, setRefrigerant] = useState('R32')
  const [pressure, setPressure] = useState('9')
  const [temperature, setTemperature] = useState(mode === 'pt' ? '5' : '12,5')
  const [unit, setUnit] = useState<PressureUnit>('bar')
  const [kind, setKind] = useState<PressureKind>('gauge')
  const [result, setResult] = useState('Introduce datos y dale a calcular.')
  const [ptDirection, setPtDirection] = useState<PtDirection>('pressure-to-temp')
  const [calculationMode, setCalculationMode] = useState<'evaporacion' | 'condensacion'>('evaporacion')
  const [ptResult, setPtResult] = useState<PtResult | null>(null)
  const [thermalResult, setThermalResult] = useState<ThermalResult | null>(null)
  const table = getTable(refrigerant)
  const isSuperheat = mode === 'superheat'
  const isSubcooling = mode === 'subcooling'
  const title = isSuperheat ? 'Recalentamiento' : isSubcooling ? 'Subenfriamiento' : 'Presión - Temperatura'
  const glideK = maxGlideK(table)
  const zeotropic = isZeotropicWithGlide(table)
  const calculate = () => {
    try {
      const needsPressure = mode !== 'pt' || ptDirection === 'pressure-to-temp'
      const needsTemperature = mode !== 'pt' || ptDirection === 'temp-to-pressure'
      const p = needsPressure ? pressureToPaAbsolute(parseLocalizedNumber(pressure), unit, kind, atmospherePa) : 0
      const measuredC = needsTemperature ? parseLocalizedNumber(temperature) : 0
      if (isSuperheat) {
        const saturationC = interpolateTemperatureFromPressure(table, p, 'dew')
        const resultK = calculateSuperheat(p, measuredC, table)
        setThermalResult({ resultK, saturationC, measuredC, pressurePaAbs: p, indicator: evaluateSuperheat(resultK) })
        setResult(`${resultK.toFixed(1)} K`)
      } else if (isSubcooling) {
        const saturationC = interpolateTemperatureFromPressure(table, p, 'bubble')
        const resultK = calculateSubcooling(p, measuredC, table)
        setThermalResult({ resultK, saturationC, measuredC, pressurePaAbs: p, indicator: evaluateSubcooling(resultK) })
        setResult(`${resultK.toFixed(1)} K`)
      } else {
        setThermalResult(null)
        const nextResult: PtResult = { glideK, zeotropic }
        if (ptDirection === 'pressure-to-temp') {
          const dew = interpolateTemperatureFromPressure(table, p, 'dew')
          const bubble = interpolateTemperatureFromPressure(table, p, 'bubble')
          const saturationC = zeotropic ? (calculationMode === 'evaporacion' ? dew : bubble) : (dew + bubble) / 2
          nextResult.pressureMeasured = {
            value: `${formatNumber(parseLocalizedNumber(pressure))} ${formatPressureLabel(unit, kind)}`,
            saturationC: `${formatNumber(saturationC)} °C`,
            bubbleC: bubble,
            dewC: dew,
          }
          const targetC = parseLocalizedNumber(temperature)
          if (Number.isFinite(targetC)) {
            const targetBubble = interpolatePressureFromTemperature(table, targetC, 'bubble')
            const targetDew = interpolatePressureFromTemperature(table, targetC, 'dew')
            const targetPressure = zeotropic ? (calculationMode === 'evaporacion' ? targetDew : targetBubble) : (targetBubble + targetDew) / 2
            nextResult.temperatureTarget = {
              value: `${formatNumber(targetC)} °C`,
              pressure: `≈ ${formatNumber(paAbsoluteToPressure(targetPressure, unit, kind, atmospherePa))} ${formatPressureLabel(unit, kind)}`,
              bubblePressure: targetBubble,
              dewPressure: targetDew,
            }
          }
          setResult(nextResult.pressureMeasured.saturationC)
        } else {
          const bubblePressure = interpolatePressureFromTemperature(table, measuredC, 'bubble')
          const dewPressure = interpolatePressureFromTemperature(table, measuredC, 'dew')
          const targetPressure = zeotropic ? (calculationMode === 'evaporacion' ? dewPressure : bubblePressure) : (bubblePressure + dewPressure) / 2
          nextResult.temperatureTarget = {
            value: `${formatNumber(measuredC)} °C`,
            pressure: `≈ ${formatNumber(paAbsoluteToPressure(targetPressure, unit, kind, atmospherePa))} ${formatPressureLabel(unit, kind)}`,
            bubblePressure,
            dewPressure,
          }
          const pressureValue = parseLocalizedNumber(pressure)
          if (Number.isFinite(pressureValue)) {
            const pressurePa = pressureToPaAbsolute(pressureValue, unit, kind, atmospherePa)
            const dew = interpolateTemperatureFromPressure(table, pressurePa, 'dew')
            const bubble = interpolateTemperatureFromPressure(table, pressurePa, 'bubble')
            const saturationC = zeotropic ? (calculationMode === 'evaporacion' ? dew : bubble) : (dew + bubble) / 2
            nextResult.pressureMeasured = {
              value: `${formatNumber(pressureValue)} ${formatPressureLabel(unit, kind)}`,
              saturationC: `${formatNumber(saturationC)} °C`,
              bubbleC: bubble,
              dewC: dew,
            }
          }
          setResult(nextResult.temperatureTarget.pressure)
        }
        setPtResult(nextResult)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo calcular.'
      setResult(message)
      if (mode === 'pt') setPtResult({ glideK, zeotropic, error: message })
    }
  }
  return <main className="screen"><h1 className="page-title">{title}</h1><section className="panel form compact-form"><label>Refrigerante<select value={refrigerant} onChange={(e) => { setRefrigerant(e.target.value); setPtResult(null) }}>{refrigerantOptions().map((table) => <option key={table.refrigerant}>{table.refrigerant}</option>)}</select></label>{mode === 'pt' && <><label>Modo<div className="segmented two-segment"><button type="button" className={ptDirection === 'pressure-to-temp' ? 'active' : ''} onClick={() => setPtDirection('pressure-to-temp')}>Presión → Temperatura</button><button type="button" className={ptDirection === 'temp-to-pressure' ? 'active' : ''} onClick={() => setPtDirection('temp-to-pressure')}>Temperatura → Presión</button></div></label><label>Tipo de cálculo<select value={calculationMode} onChange={(e) => setCalculationMode(e.target.value as 'evaporacion' | 'condensacion')}><option value="evaporacion">Evaporación / rocío</option><option value="condensacion">Condensación / burbuja</option></select></label><UnitTabs unit={unit} setUnit={setUnit} /></>}<div className="two-col">{(mode !== 'pt' || ptDirection === 'pressure-to-temp') && <label>Presión<input inputMode="decimal" value={pressure} onChange={(e) => setPressure(e.target.value)} /></label>}<label>Tipo<select value={kind} onChange={(e) => setKind(e.target.value as PressureKind)}><option value="gauge">Manométrica</option><option value="absolute">Absoluta</option></select></label></div>{(mode !== 'pt' || ptDirection === 'temp-to-pressure') && <label>{mode === 'pt' ? 'Temperatura objetivo (°C)' : isSuperheat ? 'Temperatura de la tubería (°C)' : 'Temperatura línea líquido (°C)'}<input inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value)} /></label>}<button onClick={calculate}>Calcular</button></section>{mode === 'pt' ? <><section className={`pt-result-card ${ptResult?.error ? 'pt-error' : ''}`}><div className="pt-result-head"><strong>{refrigerant}</strong><span>{table.generator === 'CoolProp' ? 'Datos CoolProp validados' : 'Datos P/T pendientes'}</span></div>{ptResult?.error ? <p className="notice">{ptResult.error}</p> : <div className="pt-result-grid">{ptResult?.pressureMeasured && <article><small>Presión medida</small><strong>{ptResult.pressureMeasured.value}</strong><small>Temperatura de saturación</small><strong>{ptResult.pressureMeasured.saturationC}</strong></article>}{ptResult?.temperatureTarget && <article><small>Temperatura objetivo</small><strong>{ptResult.temperatureTarget.value}</strong><small>Presión objetivo</small><strong>{ptResult.temperatureTarget.pressure}</strong></article>}{!ptResult && <p>Introduce datos y calcula para ver resultados separados.</p>}</div>}<div className="pt-glide"><span>{zeotropic ? 'Mezcla zeotrópica' : 'Refrigerante puro o sin deslizamiento relevante'}</span><span>{zeotropic ? 'Usar rocío para recalentamiento y burbuja para subenfriamiento.' : 'Burbuja y rocío coinciden o son equivalentes en la práctica.'}</span><span>Deslizamiento: {glideK === null ? 'pendiente' : `${formatNumber(glideK)} K`}</span></div>{zeotropic && <p className="notice">Para mezclas zeotrópicas, usa rocío en recalentamiento y burbuja en subenfriamiento.</p>}</section><SaturationTable table={table} unit={unit} kind={kind} atmospherePa={atmospherePa} /><div className="button-row"><button>Tabla completa</button><button className="secondary"><BarChart3 />Gráfico</button></div></> : <section className={`result-panel result-${thermalResult?.indicator.tone ?? 'idle'}`}><small>{thermalResult ? thermalResult.indicator.label : 'Resultado'}</small><strong>{result}</strong>{thermalResult && <div className="data-list thermal-data"><p><span>Temperatura saturación</span><strong>{thermalResult.saturationC.toFixed(1)} °C</strong></p><p><span>Temperatura medida</span><strong>{thermalResult.measuredC.toFixed(1)} °C</strong></p><p><span>Presión absoluta</span><strong>{(thermalResult.pressurePaAbs / 100000).toFixed(2)} bar(a)</strong></p></div>}<div className="meter"><span /><span /><span /></div><p>{thermalResult?.indicator.explanation ?? 'Resultado orientativo. Debe interpretarse junto con subenfriamiento, temperaturas, caudal de aire, carga térmica y datos del fabricante.'}</p>{thermalResult && <ul className="check-list">{thermalResult.indicator.checks.map((check) => <li key={check}>{check}</li>)}</ul>}</section>}{kind === 'gauge' && <p className="hint">La conversión depende de la presión atmosférica configurada: {atmospherePa} Pa ({formatNumber(atmospherePa / 100000, 5)} bar).</p>}</main>
}

function ConverterPage() {
  const { atmospherePa } = useSettings()
  const [value, setValue] = useState('500')
  const [from, setFrom] = useState<PressureUnit>('bar')
  const [vacuum, setVacuum] = useState<VacuumUnit>('micron')
  const [temp, setTemp] = useState('25')
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>('C')
  const [power, setPower] = useState('3000')
  const [powerUnit, setPowerUnit] = useState<CoolingPowerUnit>('frig_h')
  const [mass, setMass] = useState('1')
  const [massUnit, setMassUnit] = useState<MassUnit>('kg')
  const [length, setLength] = useState('10')
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('m')
  const [airflow, setAirflow] = useState('500')
  const [airflowUnit, setAirflowUnit] = useState<AirflowUnit>('m3_h')
  const [kwElectrical, setKwElectrical] = useState('3,5')
  const [voltage, setVoltage] = useState('230')
  const [powerFactor, setPowerFactor] = useState('0,85')
  const [cop, setCop] = useState('3,2')
  const pa = useMemo(() => pressureToPaAbsolute(Math.max(0.00001, parseLocalizedNumber(value)), from, 'absolute', atmospherePa), [value, from, atmospherePa])
  const vacuumPa = vacuumToPaAbsolute(Math.max(0, parseLocalizedNumber(value)), vacuum)
  const tempValue = parseLocalizedNumber(temp)
  const powerValue = parseLocalizedNumber(power)
  const massValue = parseLocalizedNumber(mass)
  const lengthValue = parseLocalizedNumber(length)
  const airflowValue = parseLocalizedNumber(airflow)
  const electricalKw = parseLocalizedNumber(kwElectrical)
  const voltageValue = parseLocalizedNumber(voltage)
  const pfValue = parseLocalizedNumber(powerFactor)
  const copValue = parseLocalizedNumber(cop)
  return <main className="screen"><h1 className="page-title">Conversor técnico</h1><section className="panel form"><h2>Presión</h2><div className="two-col"><label>Valor<input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></label><label>Unidad<select value={from} onChange={(e) => setFrom(e.target.value as PressureUnit)}>{pressureUnits.map((u) => <option key={u}>{u}</option>)}</select></label></div><div className="data-list">{(['bar','PSI','kPa','MPa'] as PressureUnit[]).map((u) => <p key={u}><span>{u}</span><strong>{formatNumber(paAbsoluteToPressure(pa, u, 'absolute', atmospherePa), u === 'MPa' ? 4 : 2)}</strong></p>)}</div></section><section className="panel form"><h2>Vacío</h2><div className="two-col"><label>Valor<input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></label><label>Unidad<select value={vacuum} onChange={(e) => setVacuum(e.target.value as VacuumUnit)}>{vacuumUnits.map((u) => <option key={u}>{u}</option>)}</select></label></div><div className="data-list">{(['micron','Pa_abs','mbar_abs','inHg'] as VacuumUnit[]).map((u) => <p key={u}><span>{u}</span><strong>{formatNumber(paAbsoluteToVacuum(vacuumPa, u), 4)}</strong></p>)}</div><p className="hint">Para verificar vacío profundo en refrigeración se necesita un vacuómetro electrónico en micrones.</p></section><section className="panel form"><h2>Temperatura</h2><div className="two-col"><label>Valor<input inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} /></label><label>Unidad<select value={tempUnit} onChange={(e) => setTempUnit(e.target.value as TemperatureUnit)}><option value="C">°C</option><option value="F">°F</option></select></label></div><div className="data-list"><p><span>°C</span><strong>{formatNumber(convertTemperature(tempValue, tempUnit, 'C'))}</strong></p><p><span>°F</span><strong>{formatNumber(convertTemperature(tempValue, tempUnit, 'F'))}</strong></p></div></section><section className="panel form"><h2>Potencia frigorífica</h2><div className="two-col"><label>Valor<input inputMode="decimal" value={power} onChange={(e) => setPower(e.target.value)} /></label><label>Unidad<select value={powerUnit} onChange={(e) => setPowerUnit(e.target.value as CoolingPowerUnit)}>{coolingPowerUnits.map((u) => <option key={u}>{u}</option>)}</select></label></div><div className="data-list">{coolingPowerUnits.map((u) => <p key={u}><span>{u}</span><strong>{formatNumber(convertCoolingPower(powerValue, powerUnit, u), u === 'kW' ? 2 : 0)}</strong></p>)}</div></section><section className="panel form"><h2>Masa y longitud</h2><div className="two-col"><label>Masa<input inputMode="decimal" value={mass} onChange={(e) => setMass(e.target.value)} /></label><label>Unidad<select value={massUnit} onChange={(e) => setMassUnit(e.target.value as MassUnit)}>{massUnits.map((u) => <option key={u}>{u}</option>)}</select></label></div><div className="data-list">{massUnits.map((u) => <p key={u}><span>{u}</span><strong>{formatNumber(convertMass(massValue, massUnit, u), u === 'g' ? 0 : 3)}</strong></p>)}</div><div className="two-col"><label>Longitud<input inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} /></label><label>Unidad<select value={lengthUnit} onChange={(e) => setLengthUnit(e.target.value as LengthUnit)}>{lengthUnits.map((u) => <option key={u}>{u}</option>)}</select></label></div><div className="data-list">{lengthUnits.map((u) => <p key={u}><span>{u}</span><strong>{formatNumber(convertLength(lengthValue, lengthUnit, u), 2)}</strong></p>)}</div></section><section className="panel form"><h2>Caudal de aire</h2><div className="two-col"><label>Valor<input inputMode="decimal" value={airflow} onChange={(e) => setAirflow(e.target.value)} /></label><label>Unidad<select value={airflowUnit} onChange={(e) => setAirflowUnit(e.target.value as AirflowUnit)}>{airflowUnits.map((u) => <option key={u}>{u}</option>)}</select></label></div><div className="data-list">{airflowUnits.map((u) => <p key={u}><span>{u}</span><strong>{formatNumber(convertAirflow(airflowValue, airflowUnit, u), 1)}</strong></p>)}</div></section><section className="panel form"><h2>Eléctrico y rendimiento</h2><div className="two-col"><label>Potencia kW<input inputMode="decimal" value={kwElectrical} onChange={(e) => setKwElectrical(e.target.value)} /></label><label>Tensión V<input inputMode="decimal" value={voltage} onChange={(e) => setVoltage(e.target.value)} /></label></div><label>Factor de potencia<input inputMode="decimal" value={powerFactor} onChange={(e) => setPowerFactor(e.target.value)} /></label><div className="data-list"><p><span>Intensidad monofásica</span><strong>{formatNumber(singlePhaseCurrent(electricalKw, voltageValue, pfValue))} A</strong></p><p><span>Intensidad trifásica</span><strong>{formatNumber(threePhaseCurrent(electricalKw, 400, pfValue))} A</strong></p></div><label>COP<input inputMode="decimal" value={cop} onChange={(e) => setCop(e.target.value)} /></label><div className="data-list"><p><span>EER desde COP</span><strong>{formatNumber(eerFromCop(copValue), 2)}</strong></p><p><span>COP desde EER 12</span><strong>{formatNumber(copFromEer(12), 2)}</strong></p></div><p className="hint">Los cálculos eléctricos son orientativos y deben verificarse con REBT, fabricante y condiciones reales de instalación.</p></section></main>
}

function RefrigerantsPage() {
  const [category, setCategory] = useState<RefrigerantCategory | 'all'>('all')
  const visibleTables = refrigerantOptions(category)
  return <main className="screen"><h1 className="page-title">Refrigerantes</h1><section className="panel form compact-form"><label>Filtro<div className="segmented three-segment">{(['all', 'traditional', 'lower-gwp'] as const).map((item) => <button key={item} type="button" className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{refrigerantCategoryLabels[item]}</button>)}</div></label><p className="hint">Alternativa de menor GWP no significa equivalente directo. Usar siempre documentación del fabricante.</p></section><section className="panel warning-panel compact-warning"><strong>Productos comerciales equivalentes</strong><p>{commercialRefrigerants.length === 0 ? 'No hay productos comerciales registrados. Cuando se añadan, cada uno deberá tener tabla P/T y documentación propia.' : `${commercialRefrigerants.length} productos registrados.`}</p>{commercialRefrigerantWarning.map((warning) => <p key={warning}>{warning}</p>)}</section>{visibleTables.map((table) => { const meta = refrigerantMetadata[table.refrigerant]; const glide = maxGlideK(table); return <article className="panel refrigerant-card" key={table.refrigerant}><div className="refrigerant-title"><div><h2>{meta.name}</h2><p>{refrigerantCategoryLabels[meta.category]} · {tableStatusLabel(table)}</p></div><span>{table.generator === 'CoolProp' ? 'P/T validada' : 'Sin P/T fiable'}</span></div><dl><dt>Tipo</dt><dd>{meta.familyType.value ?? table.refrigerantType}</dd><dt>Composición</dt><dd>{meta.composition.value ?? meta.composition.note}</dd><dt>Rango</dt><dd>{formatRange(table)}</dd><dt>Seguridad</dt><dd>{meta.safetyClass.value ?? meta.safetyClass.note}</dd><dt>Inflamabilidad</dt><dd>{meta.flammability.value ?? meta.flammability.note}</dd><dt>Toxicidad</dt><dd>{meta.toxicity.value ?? meta.toxicity.note}</dd><dt>GWP / PCA</dt><dd>{meta.gwp.value ?? meta.gwp.note}</dd><dt>Deslizamiento</dt><dd>{glide === null ? 'Pendiente' : `${formatNumber(glide)} K`}</dd><dt>Presión trabajo</dt><dd>{meta.workPressure.value ?? meta.workPressure.note}</dd><dt>Aceite</dt><dd>{meta.oils.value ?? meta.oils.note}</dd><dt>Aplicaciones</dt><dd>{meta.applications.value ?? meta.applications.note}</dd><dt>Carga</dt><dd>{meta.chargingMethod.value ?? meta.chargingMethod.note}</dd><dt>Compatibilidad</dt><dd>{meta.compatibility.value ?? meta.compatibility.note}</dd></dl><ul className="warning-list">{meta.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><p className="source-line">{table.limitations.join(' ')}</p></article> })}</main>
}

function ComparePage() {
  const { atmospherePa } = useSettings()
  const [left, setLeft] = useState('R32')
  const [right, setRight] = useState('R410A')
  const leftTable = getTable(left)
  const rightTable = getTable(right)
  const rows = commonPressureRows(leftTable).map((row, index) => ({ left: row, right: commonPressureRows(rightTable)[index] }))
  return <main className="screen"><h1 className="page-title">Comparador de refrigerantes</h1><div className="compare-select"><select value={left} onChange={(event) => setLeft(event.target.value)}>{refrigerantTables.map((table) => <option key={table.refrigerant}>{table.refrigerant}</option>)}</select><span>VS</span><select value={right} onChange={(event) => setRight(event.target.value)}>{refrigerantTables.map((table) => <option key={table.refrigerant}>{table.refrigerant}</option>)}</select></div><section className="panel compare-summary"><dl><dt>{left}</dt><dd>{tableStatusLabel(leftTable)}</dd><dt>{right}</dt><dd>{tableStatusLabel(rightTable)}</dd><dt>Glide {left}</dt><dd>{maxGlideK(leftTable)?.toFixed(2) ?? 'Pendiente'} K</dd><dt>Glide {right}</dt><dd>{maxGlideK(rightTable)?.toFixed(2) ?? 'Pendiente'} K</dd></dl></section><div className="table-wrap"><table><thead><tr><th>Temp.</th><th>{left} bar(a)</th><th>{right} bar(a)</th></tr></thead><tbody>{rows.map(({ left, right }) => <tr key={left.temperatureC}><td>{left.temperatureC} °C</td><td>{left.dewPressurePaAbs === null ? '-' : paAbsoluteToPressure(left.dewPressurePaAbs, 'bar', 'absolute', atmospherePa).toFixed(2)}</td><td>{right.dewPressurePaAbs === null ? '-' : paAbsoluteToPressure(right.dewPressurePaAbs, 'bar', 'absolute', atmospherePa).toFixed(2)}</td></tr>)}</tbody></table></div><div className="panel warning-panel"><Scale /><strong>No mezclar refrigerantes</strong><p>No se debe considerar un refrigerante como sustituto directo únicamente porque sus presiones sean similares.</p><button>Ver más información</button></div></main>
}

function ChargePage() {
  const [factory, setFactory] = useState('0,85')
  const [factoryUnit, setFactoryUnit] = useState<MassUnit>('kg')
  const [included, setIncluded] = useState('5')
  const [installed, setInstalled] = useState('12')
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('m')
  const [gpm, setGpm] = useState('20')
  const [recovered, setRecovered] = useState('0')
  const [added, setAdded] = useState('0')
  const [movementUnit, setMovementUnit] = useState<MassUnit>('g')
  const r = calculateAdditionalChargeWithUnits({ factoryCharge: parseLocalizedNumber(factory), factoryUnit, includedLength: parseLocalizedNumber(included), installedLength: parseLocalizedNumber(installed), lengthUnit, additionalPerMeterG: parseLocalizedNumber(gpm), recovered: parseLocalizedNumber(recovered), recoveredUnit: movementUnit, added: parseLocalizedNumber(added), addedUnit: movementUnit })
  return <main className="screen"><h1 className="page-title">Calculadora de carga</h1><div className="panel form compact-form"><div className="two-col"><label>Carga placa<input inputMode="decimal" value={factory} onChange={(e) => setFactory(e.target.value)} /></label><label>Unidad<select value={factoryUnit} onChange={(e) => setFactoryUnit(e.target.value as MassUnit)}>{massUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></label></div><div className="two-col"><label>Longitud incluida<input inputMode="decimal" value={included} onChange={(e) => setIncluded(e.target.value)} /></label><label>Longitud instalada<input inputMode="decimal" value={installed} onChange={(e) => setInstalled(e.target.value)} /></label></div><label>Unidad longitud<select value={lengthUnit} onChange={(e) => setLengthUnit(e.target.value as LengthUnit)}>{lengthUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></label><label>Carga adicional indicada por fabricante (g/m)<input inputMode="decimal" value={gpm} onChange={(e) => setGpm(e.target.value)} /></label><div className="two-col"><label>Cantidad recuperada<input inputMode="decimal" value={recovered} onChange={(e) => setRecovered(e.target.value)} /></label><label>Cantidad añadida<input inputMode="decimal" value={added} onChange={(e) => setAdded(e.target.value)} /></label></div><label>Unidad recuperada/añadida<select value={movementUnit} onChange={(e) => setMovementUnit(e.target.value as MassUnit)}>{massUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></label></div><section className="result-panel charge-result"><small>Carga total orientativa</small><strong>{formatNumber(r.totalChargeG / 1000, 3)} kg</strong><div className="data-list thermal-data"><p><span>Carga nominal</span><strong>{formatNumber(r.totalChargeG / 1000 - r.additionalChargeG / 1000, 3)} kg</strong></p><p><span>Longitud adicional</span><strong>{formatNumber(r.additionalLengthM, 1)} m</strong></p><p><span>Carga adicional calculada</span><strong>{formatNumber(r.additionalChargeG, 0)} g</strong></p><p><span>Recuperado / añadido</span><strong>{formatNumber(r.recoveredG, 0)} g / {formatNumber(r.addedG, 0)} g</strong></p></div></section><p className="notice">La carga final debe realizarse según la placa, el manual del fabricante y el procedimiento técnico aplicable. No debe determinarse únicamente por presión.</p><button className="full-width">Guardar en intervención</button></main>
}

function VacuumPage() {
  const [microns, setMicrons] = useState('500')
  const [initial, setInitial] = useState('2500')
  const [finalValue, setFinalValue] = useState('650')
  const [vacuumMinutes, setVacuumMinutes] = useState('30')
  const [stabilityMinutes, setStabilityMinutes] = useState('10')
  const [ambient, setAmbient] = useState('24')
  const [phase, setPhase] = useState<'process' | 'isolation' | 'stability' | 'finished'>('process')
  const pa = vacuumToPaAbsolute(parseLocalizedNumber(microns), 'micron')
  const initialNumber = parseLocalizedNumber(initial)
  const finalNumber = parseLocalizedNumber(finalValue)
  const trend = [initialNumber, (initialNumber + finalNumber) / 2, finalNumber].filter(Number.isFinite)
  const maxTrend = Math.max(...trend, 1)
  return <main className="screen"><h1 className="page-title">Vacío y estabilidad</h1><section className="panel form compact-form"><label>Fase<div className="segmented two-segment"><button type="button" className={phase === 'process' ? 'active' : ''} onClick={() => setPhase('process')}>Vacío</button><button type="button" className={phase === 'isolation' ? 'active' : ''} onClick={() => setPhase('isolation')}>Aislar</button><button type="button" className={phase === 'stability' ? 'active' : ''} onClick={() => setPhase('stability')}>Estabilidad</button><button type="button" className={phase === 'finished' ? 'active' : ''} onClick={() => setPhase('finished')}>Fin</button></div></label><div className="two-col"><label>Micrones actuales<input inputMode="decimal" value={microns} onChange={(e) => setMicrons(e.target.value)} /></label><label>Temperatura ambiente °C<input inputMode="decimal" value={ambient} onChange={(e) => setAmbient(e.target.value)} /></label></div><div className="two-col"><label>Valor inicial μm<input inputMode="decimal" value={initial} onChange={(e) => setInitial(e.target.value)} /></label><label>Valor final μm<input inputMode="decimal" value={finalValue} onChange={(e) => setFinalValue(e.target.value)} /></label></div><div className="two-col"><label>Tiempo vacío min<input inputMode="decimal" value={vacuumMinutes} onChange={(e) => setVacuumMinutes(e.target.value)} /></label><label>Prueba estabilidad min<input inputMode="decimal" value={stabilityMinutes} onChange={(e) => setStabilityMinutes(e.target.value)} /></label></div></section><section className="result-panel"><small>{phase === 'process' ? 'Vacío en proceso' : phase === 'isolation' ? 'Aislamiento de bomba' : phase === 'stability' ? 'Prueba de estabilidad' : 'Prueba terminada'}</small><strong>{formatNumber(parseLocalizedNumber(microns), 0)} μm</strong><div className="data-list thermal-data"><p><span>mbar absolutos</span><strong>{formatNumber(paAbsoluteToVacuum(pa, 'mbar_abs'), 4)}</strong></p><p><span>Pa absolutos</span><strong>{formatNumber(paAbsoluteToVacuum(pa, 'Pa_abs'), 2)}</strong></p><p><span>inHg absoluto</span><strong>{formatNumber(paAbsoluteToVacuum(pa, 'inHg'), 4)}</strong></p><p><span>Variación estabilidad</span><strong>{formatNumber(finalNumber - initialNumber, 0)} μm</strong></p></div><div className="vacuum-chart" aria-label="Evolución orientativa del vacío">{trend.map((value, index) => <span key={index} style={{ height: `${Math.max(8, 100 - (value / maxTrend) * 92)}%` }} />)}</div></section><p className="notice">No usar solamente el manómetro analógico de baja presión para certificar un vacío profundo. Utiliza vacuómetro electrónico en micrones y el procedimiento del fabricante.</p></main>
}

function DiagnosticsPage() { 
  const [mode, setMode] = useState<'frio' | 'calor'>('frio')
  const [thermalDelta, setThermalDelta] = useState('5')
  const [superheat, setSuperheat] = useState('16')
  const [subcooling, setSubcooling] = useState('2')

  const findings = runDiagnosticRules({ 
    mode, 
    thermalDeltaK: parseLocalizedNumber(thermalDelta), 
    superheatK: parseLocalizedNumber(superheat), 
    subcoolingK: parseLocalizedNumber(subcooling) 
  })

  return (
    <main className="screen">
      <h1 className="page-title">Diagnóstico guiado</h1>
      
      <section className="panel form compact-form">
        <label>Modo de operación
          <select value={mode} onChange={(e) => setMode(e.target.value as 'frio' | 'calor')}>
            <option value="frio">Frío (Refrigeración)</option>
            <option value="calor">Calor (Bomba de calor)</option>
          </select>
        </label>
        <div className="two-col">
          <label>Salto térmico aire (K)<input inputMode="decimal" value={thermalDelta} onChange={(e) => setThermalDelta(e.target.value)} /></label>
          <label>Recalentamiento (K)<input inputMode="decimal" value={superheat} onChange={(e) => setSuperheat(e.target.value)} /></label>
        </div>
        <label>Subenfriamiento (K)<input inputMode="decimal" value={subcooling} onChange={(e) => setSubcooling(e.target.value)} /></label>
      </section>

      <div className="notice">El diagnóstico es orientativo y no sustituye las mediciones, la prueba de estanqueidad, la carga por peso ni la documentación del fabricante.</div>
      
      {findings.map((f) => (
        <article className="panel" key={f.cause}>
          <h2>{f.cause}</h2>
          <p>Confianza: {f.confidence}</p>
          <p>{f.supportingData.join(', ')}</p>
          <p>{f.checks.join(' · ')}</p>
        </article>
      ))}
      {findings.length === 0 && <article className="panel"><p>Los parámetros parecen estar dentro de un rango aceptable o no hay reglas coincidentes para este estado.</p></article>}
    </main>
  )
}

const interventionSchema = z.object({ clientName: z.string().min(2, 'Indica el cliente'), workType: z.string().min(2, 'Indica el trabajo'), observations: z.string().optional() })
type InterventionForm = z.infer<typeof interventionSchema>
function InterventionsPage() {
  const { technician } = useSettings()
  const [items, setItems] = useState<Intervention[]>([])
  const { register, handleSubmit, formState: { errors }, reset } = useForm<InterventionForm>({ resolver: zodResolver(interventionSchema), defaultValues: { clientName: '', workType: 'Mantenimiento' } })
  const load = () => void db.interventions.orderBy('updatedAt').reverse().toArray().then(setItems)
  useEffect(load, [])
  const save = async (data: InterventionForm) => { const now = new Date().toISOString(); await db.interventions.put({ id: newId('int'), date: now.slice(0, 10), status: 'borrador', photos: [], createdAt: now, updatedAt: now, ...data }); reset(); load() }
  const makePdf = (item: Intervention) => { const blob = generateInterventionPdf(item); const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener') }
  return <main className="screen"><h1 className="page-title">Registro de intervenciones</h1><form className="panel form" onSubmit={handleSubmit(save)}><label>Cliente<input {...register('clientName')} /></label>{errors.clientName && <span className="error">{errors.clientName.message}</span>}<label>Tipo de trabajo<input {...register('workType')} /></label><label>Observaciones<textarea {...register('observations')} /></label><button>Guardar intervención</button></form>{items.map((item) => <article className="panel row" key={item.id}><div><h2>{item.clientName}</h2><p>{item.workType} · {item.date}</p></div><button onClick={() => makePdf(item)}>PDF</button></article>)}{!technician && <p className="hint">Configura el nombre del técnico en Ajustes para que aparezca en el PDF.</p>}</main>
}

function ReportsPage() { return <main className="screen"><h1 className="page-title">Informes PDF</h1><div className="panel"><p>Los informes PDF se generan desde cada intervención y permanecen locales en el dispositivo.</p></div></main> }

function SettingsPage() { 
  const { atmospherePa, setAtmospherePa, technician, setTechnician, altitudeM, setAltitudeM } = useSettings()
  const updateAltitude = (value: number) => {
    setAltitudeM(value)
    setAtmospherePa(Math.round(altitudeToAtmospherePa(value)))
  }
  return (
    <main className="screen">
      <h1 className="page-title">Ajustes</h1>
      <div className="panel form">
        <label>Presión atmosférica (Pa)
          <input 
            type="number" 
            value={atmospherePa} 
            onChange={(e) => setAtmospherePa(parseFloat(e.target.value) || DEFAULT_ATMOSPHERE_PA)} 
          />
        </label>
        <label>Altitud aproximada (m)
          <input
            type="number"
            value={altitudeM}
            onChange={(e) => updateAltitude(parseFloat(e.target.value) || 0)}
          />
        </label>
        <label>Técnico
          <input 
            value={technician} 
            onChange={(e) => setTechnician(e.target.value)} 
            placeholder="Nombre del técnico" 
          />
        </label>
        <label>Tema
          <select defaultValue="dark">
            <option value="dark">Oscuro Premium</option>
            <option value="light">Claro</option>
          </select>
        </label>
        <p className="hint">Sin analítica, publicidad, Firebase ni servicios externos. Los datos se guardan en tu dispositivo.</p>
      </div>
    </main>
  )
}

export default function App() {
  return <Shell><Routes><Route path="/" element={<HomePage />} /><Route path="/pt" element={<PtPage />} /><Route path="/superheat" element={<PtPage mode="superheat" />} /><Route path="/subcooling" element={<PtPage mode="subcooling" />} /><Route path="/converter" element={<ConverterPage />} /><Route path="/vacuum" element={<VacuumPage />} /><Route path="/refrigerants" element={<RefrigerantsPage />} /><Route path="/compare" element={<ComparePage />} /><Route path="/charge" element={<ChargePage />} /><Route path="/diagnostics" element={<DiagnosticsPage />} /><Route path="/interventions" element={<InterventionsPage />} /><Route path="/reports" element={<ReportsPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/tools" element={<HomePage />} /></Routes></Shell>
}
