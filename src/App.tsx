import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowUpDown, BarChart3, ClipboardList, Database, FileText, Gauge, Grid3X3, Home, LockKeyhole, Menu, Scale, Settings, Stethoscope, Table2, Thermometer } from 'lucide-react'
import './index.css'
import { refrigerantTables, type RefrigerantTable } from './data/generated'
import { refrigerantMetadata } from './data/refrigerant-metadata'
import { calculateSubcooling, calculateSuperheat, interpolatePressureFromTemperature, interpolateTemperatureFromPressure } from './domain/refrigerants/calculations'
import { commonPressureRows, formatRange, maxGlideK, tableStatusLabel } from './domain/refrigerants/summary'
import { DEFAULT_ATMOSPHERE_PA, formatPressureLabel, paAbsoluteToPressure, pressureToPaAbsolute, parseLocalizedNumber, type PressureKind, type PressureUnit, vacuumToPaAbsolute, paAbsoluteToVacuum, type VacuumUnit } from './domain/units'
import { calculateAdditionalCharge } from './domain/charge'
import { runDiagnosticRules } from './domain/diagnostics/rules'
import { db, newId, type Intervention } from './domain/storage/db'
import { generateInterventionPdf } from './domain/reports/pdf'

const pressureUnits: PressureUnit[] = ['Pa', 'kPa', 'MPa', 'bar', 'PSI', 'kgf/cm2', 'atm']
const preferredPressureUnits: PressureUnit[] = ['bar', 'PSI', 'kPa', 'MPa']
const vacuumUnits: VacuumUnit[] = ['micron', 'Pa_abs', 'mbar_abs', 'Torr', 'mmHg', 'inHg', 'bar_abs']
const tools = [
  ['Presión - Temperatura', 'Tabla P/T', 'pt', Thermometer],
  ['Recalentamiento', 'Cálculos', 'superheat', ArrowUpDown],
  ['Conversor', 'Presión y vacío', 'converter', Gauge],
  ['Refrigerantes', 'Tablas y datos', 'refrigerants', Table2],
  ['Comparador', 'Compatibilidad', 'compare', Scale],
  ['Calculadora de carga', 'Longitud y carga', 'charge', LockKeyhole],
  ['Diagnóstico', 'Guía rápida', 'diagnostics', Stethoscope],
  ['Intervenciones', 'Registro y clientes', 'interventions', ClipboardList],
] as const

function getTable(name: string): RefrigerantTable {
  return refrigerantTables.find((table) => table.refrigerant === name) ?? refrigerantTables[0]
}

function useSettings() {
  const [atmospherePa, setAtmospherePa] = useState(() => {
    const saved = localStorage.getItem('isivolt_atmosphere')
    return saved ? parseFloat(saved) : DEFAULT_ATMOSPHERE_PA
  })
  const [technician, setTechnician] = useState(() => localStorage.getItem('isivolt_technician') || '')
  
  useEffect(() => { localStorage.setItem('isivolt_atmosphere', atmospherePa.toString()) }, [atmospherePa])
  useEffect(() => { localStorage.setItem('isivolt_technician', technician) }, [technician])

  return { atmospherePa, setAtmospherePa, technician, setTechnician }
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/' || location.pathname === '/tools'
  return <div className="app"><header className="topbar"><button className="icon-button" aria-label={isHome ? 'Menú' : 'Volver'} onClick={() => isHome ? undefined : navigate(-1)}>{isHome ? <Menu /> : <ArrowLeft />}</button><div><strong>IsiVoltPro <span>Refrigeración</span></strong><small>{isHome ? 'Cálculo, diagnóstico y control' : 'Herramienta técnica'}</small></div><NavLink className="icon-button" to="/settings" aria-label="Ajustes"><Settings /></NavLink></header>{children}<nav className="bottom"><NavLink to="/"><Home />Inicio</NavLink><NavLink to="/tools"><Grid3X3 />Herramientas</NavLink><NavLink to="/interventions"><ClipboardList />Intervenciones</NavLink><NavLink to="/settings"><Settings />Ajustes</NavLink></nav></div>
}

function HomePage() {
  return <main className="screen home-screen"><section className="brand-panel"><img src="/icons/icon.png" alt="IsiVoltPro Logo" /><div><h1>IsiVoltPro</h1><p>Refrigeración</p><span>Cálculo, diagnóstico y control de refrigerantes</span></div></section><div className="tool-grid">{tools.map(([label, subtitle, path, Icon]) => <NavLink className="tool-card" to={`/${path}`} key={path}><Icon /><strong>{label}</strong><small>{subtitle}</small></NavLink>)}</div><NavLink className="wide-action" to="/reports"><FileText />Informe PDF</NavLink><section className="info-grid"><article className="info-card"><h2>Características principales</h2><ul><li>Tablas P/T con burbuja y rocío cuando existan datos generados.</li><li>Cálculo de recalentamiento y subenfriamiento.</li><li>Registro local de intervenciones y PDF.</li><li>Funciona sin conexión.</li></ul></article><article className="info-card"><h2>Base de datos</h2><Database /><p>Los datos termodinámicos se generan con CoolProp y se almacenan localmente para uso sin conexión.</p></article><article className="info-card"><h2>Tecnologías</h2><p>React + TypeScript · Vite · Capacitor · PWA · IndexedDB</p></article></section><footer className="legal-strip">Herramienta orientativa para técnicos. Usar siempre procedimientos y normas de seguridad aplicables. <span>Versión 1.0.0</span></footer></main>
}

function SaturationTable({ table, unit, kind, atmospherePa }: { table: RefrigerantTable; unit: PressureUnit; kind: PressureKind; atmospherePa: number }) {
  if (table.points.length === 0) return <div className="empty-table"><Table2 /><strong>Tabla pendiente</strong><p>Genera datos con CoolProp para mostrar filas P/T reales. No se cargan valores manuales.</p></div>
  const rows = commonPressureRows(table, [-20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35])
  return <div className="table-wrap"><table><thead><tr><th>Temp. °C</th><th>Burbuja {formatPressureLabel(unit, kind)}</th><th>Rocío {formatPressureLabel(unit, kind)}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.temperatureC}><td>{row.temperatureC.toFixed(0)}</td><td>{row.bubblePressurePaAbs === null ? '-' : paAbsoluteToPressure(row.bubblePressurePaAbs, unit, kind, atmospherePa).toFixed(2)}</td><td>{row.dewPressurePaAbs === null ? '-' : paAbsoluteToPressure(row.dewPressurePaAbs, unit, kind, atmospherePa).toFixed(2)}</td></tr>)}</tbody></table></div>
}

function UnitTabs({ unit, setUnit }: { unit: PressureUnit; setUnit: (unit: PressureUnit) => void }) {
  return <div className="segmented">{preferredPressureUnits.map((u) => <button type="button" className={unit === u ? 'active' : ''} onClick={() => setUnit(u)} key={u}>{u === 'bar' ? 'Bar(g)' : u === 'PSI' ? 'PSI(g)' : u}</button>)}</div>
}

function PtPage({ mode = 'pt' }: { mode?: 'pt' | 'superheat' | 'subcooling' }) {
  const { atmospherePa } = useSettings()
  const [refrigerant, setRefrigerant] = useState('R32')
  const [pressure, setPressure] = useState('7,50')
  const [temperature, setTemperature] = useState(mode === 'pt' ? '5' : '12,5')
  const [unit, setUnit] = useState<PressureUnit>('bar')
  const [kind, setKind] = useState<PressureKind>('gauge')
  const [result, setResult] = useState('Introduce datos y dale a calcular.')
  const table = getTable(refrigerant)
  const isSuperheat = mode === 'superheat'
  const isSubcooling = mode === 'subcooling'
  const title = isSuperheat ? 'Recalentamiento' : isSubcooling ? 'Subenfriamiento' : 'Presión - Temperatura'
  const calculate = () => {
    try {
      const p = pressureToPaAbsolute(parseLocalizedNumber(pressure), unit, kind, atmospherePa)
      if (isSuperheat) setResult(`${calculateSuperheat(p, parseLocalizedNumber(temperature), table).toFixed(1)} K`)
      else if (isSubcooling) setResult(`${calculateSubcooling(p, parseLocalizedNumber(temperature), table).toFixed(1)} K`)
      else {
        const dew = interpolateTemperatureFromPressure(table, p, 'dew')
        const bubble = interpolateTemperatureFromPressure(table, p, 'bubble')
        const pressureFromTemp = paAbsoluteToPressure(interpolatePressureFromTemperature(table, parseLocalizedNumber(temperature), 'dew'), unit, kind, atmospherePa)
        setResult(`Rocío ${dew.toFixed(2)} °C · Burbuja ${bubble.toFixed(2)} °C · ${pressureFromTemp.toFixed(3)} ${formatPressureLabel(unit, kind)}`)
      }
    } catch (error) { setResult(error instanceof Error ? error.message : 'No se pudo calcular.') }
  }
  return <main className="screen"><h1 className="page-title">{title}</h1><section className="panel form compact-form"><label>Refrigerante<select value={refrigerant} onChange={(e) => setRefrigerant(e.target.value)}>{refrigerantTables.map((table) => <option key={table.refrigerant}>{table.refrigerant}</option>)}</select></label>{mode === 'pt' && <UnitTabs unit={unit} setUnit={setUnit} />}<div className="two-col"><label>Presión<input inputMode="decimal" value={pressure} onChange={(e) => setPressure(e.target.value)} /></label><label>Tipo<select value={kind} onChange={(e) => setKind(e.target.value as PressureKind)}><option value="absolute">Absoluta</option><option value="gauge">Manométrica</option></select></label></div>{mode !== 'pt' && <label>{isSuperheat ? 'Temperatura de la tubería (°C)' : 'Temperatura línea líquido (°C)'}<input inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value)} /></label>}<button onClick={calculate}>Calcular</button></section>{mode === 'pt' ? <><SaturationTable table={table} unit={unit} kind={kind} atmospherePa={atmospherePa} /><div className="button-row"><button>Tabla completa</button><button className="secondary"><BarChart3 />Gráfico</button></div></> : <section className="result-panel"><small>Resultado</small><strong>{result}</strong><div className="meter"><span /><span /><span /></div><p>Resultado orientativo. Debe interpretarse junto con subenfriamiento, temperaturas, caudal de aire, carga térmica y datos del fabricante.</p></section>}{kind === 'gauge' && <p className="hint">La conversión depende de la presión atmosférica configurada: {atmospherePa} Pa.</p>}</main>
}

function ConverterPage() {
  const { atmospherePa } = useSettings()
  const [value, setValue] = useState('500')
  const [from, setFrom] = useState<PressureUnit>('bar')
  const [vacuum, setVacuum] = useState<VacuumUnit>('micron')
  const pa = useMemo(() => pressureToPaAbsolute(Math.max(0.00001, parseLocalizedNumber(value)), from, 'absolute', atmospherePa), [value, from, atmospherePa])
  const vacuumPa = vacuumToPaAbsolute(Math.max(0, parseLocalizedNumber(value)), vacuum)
  return <main className="screen"><h1 className="page-title">Conversor de presión y vacío</h1><section className="panel form"><label>Tipo de conversión<div className="segmented"><button className="active" type="button">Presión</button><button type="button">Vacío</button></div></label><div className="two-col"><label>Valor de entrada<input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></label><label>Unidad<select value={from} onChange={(e) => setFrom(e.target.value as PressureUnit)}>{pressureUnits.map((u) => <option key={u}>{u}</option>)}</select></label></div><div className="data-list">{pressureUnits.slice(0, 6).map((u) => <p key={u}><span>{u}</span><strong>{paAbsoluteToPressure(pa, u, 'absolute', atmospherePa).toFixed(4)}</strong></p>)}</div></section><section className="panel form"><h2>Vacío</h2><select value={vacuum} onChange={(e) => setVacuum(e.target.value as VacuumUnit)}>{vacuumUnits.map((u) => <option key={u}>{u}</option>)}</select><div className="data-list">{vacuumUnits.slice(0, 6).map((u) => <p key={u}><span>{u}</span><strong>{paAbsoluteToVacuum(vacuumPa, u).toFixed(4)}</strong></p>)}</div><p className="hint">Para verificar vacío profundo en refrigeración se necesita un vacuómetro electrónico en micrones.</p></section></main>
}

function RefrigerantsPage() {
  return <main className="screen"><h1 className="page-title">Refrigerantes</h1>{refrigerantTables.map((table) => { const meta = refrigerantMetadata[table.refrigerant]; const glide = maxGlideK(table); return <article className="panel refrigerant-card" key={table.refrigerant}><div><h2>{meta.name}</h2><p>{tableStatusLabel(table)}</p></div><dl><dt>Tipo tabla</dt><dd>{table.refrigerantType}</dd><dt>Rango</dt><dd>{formatRange(table)}</dd><dt>Deslizamiento</dt><dd>{glide === null ? 'Pendiente' : `${glide.toFixed(2)} K`}</dd><dt>Seguridad</dt><dd>{meta.safetyClass.value ?? meta.safetyClass.note}</dd><dt>GWP</dt><dd>{meta.gwp.value ?? meta.gwp.note}</dd></dl><p className="source-line">{table.limitations.join(' ')}</p></article> })}</main>
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
  const [factory, setFactory] = useState('850'); const [included, setIncluded] = useState('5'); const [installed, setInstalled] = useState('9'); const [gpm, setGpm] = useState('20')
  const r = calculateAdditionalCharge(parseLocalizedNumber(factory), parseLocalizedNumber(included), parseLocalizedNumber(installed), parseLocalizedNumber(gpm))
  return <main className="screen"><h1 className="page-title">Calculadora de carga</h1><div className="panel form compact-form"><label>Carga de fábrica (g)<input value={factory} onChange={(e) => setFactory(e.target.value)} /></label><label>Longitud incluida (m)<input value={included} onChange={(e) => setIncluded(e.target.value)} /></label><label>Longitud instalada (m)<input value={installed} onChange={(e) => setInstalled(e.target.value)} /></label><label>Carga adicional (g/m)<input value={gpm} onChange={(e) => setGpm(e.target.value)} /></label></div><section className="result-panel charge-result"><small>Carga total calculada</small><strong>{(r.totalChargeG / 1000).toFixed(3)} kg</strong><p>Longitud adicional: {r.additionalLengthM.toFixed(0)} m · Carga adicional: {r.additionalChargeG.toFixed(0)} g</p></section><p className="hint">Introducir siempre la carga en líquido según indicaciones del fabricante.</p><button className="full-width">Guardar en intervención</button></main>
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
  const { atmospherePa, setAtmospherePa, technician, setTechnician } = useSettings()
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
  return <Shell><Routes><Route path="/" element={<HomePage />} /><Route path="/pt" element={<PtPage />} /><Route path="/superheat" element={<PtPage mode="superheat" />} /><Route path="/subcooling" element={<PtPage mode="subcooling" />} /><Route path="/converter" element={<ConverterPage />} /><Route path="/refrigerants" element={<RefrigerantsPage />} /><Route path="/compare" element={<ComparePage />} /><Route path="/charge" element={<ChargePage />} /><Route path="/diagnostics" element={<DiagnosticsPage />} /><Route path="/interventions" element={<InterventionsPage />} /><Route path="/reports" element={<ReportsPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/tools" element={<HomePage />} /></Routes></Shell>
}
