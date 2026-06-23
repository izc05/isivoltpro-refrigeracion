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
import { DEFAULT_ATMOSPHERE_PA, formatPressureLabel, paAbsoluteToPressure, parseLocalizedNumber, pressureToPaAbsolute, type PressureKind, type PressureUnit, vacuumToPaAbsolute, paAbsoluteToVacuum, type VacuumUnit } from './domain/units'
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

function Notice() {
  return <div className="notice">Datos PT pendientes de generar con CoolProp. La app evita usar valores termodinámicos manuales y bloquea cálculos sin tabla validada.</div>
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/' || location.pathname === '/tools'
  return <div className="app"><header className="topbar"><button className="icon-button" aria-label={isHome ? 'Menú' : 'Volver'} onClick={() => isHome ? undefined : navigate(-1)}>{isHome ? <Menu /> : <ArrowLeft />}</button><div><strong>IsiVoltPro <span>Refrigeración</span></strong><small>{isHome ? 'Cálculo, diagnóstico y control' : 'Herramienta técnica'}</small></div><NavLink className="icon-button" to="/settings" aria-label="Ajustes"><Settings /></NavLink></header>{children}<nav className="bottom"><NavLink to="/"><Home />Inicio</NavLink><NavLink to="/tools"><Grid3X3 />Herramientas</NavLink><NavLink to="/interventions"><ClipboardList />Intervenciones</NavLink><NavLink to="/settings"><Settings />Ajustes</NavLink></nav></div>
}

function HomePage() {
  return <main className="screen home-screen"><section className="brand-panel"><img src="/icons/icon.svg" alt="" /><div><h1>IsiVoltPro</h1><p>Refrigeración</p><span>Cálculo, diagnóstico y control de refrigerantes</span></div></section><div className="tool-grid">{tools.map(([label, subtitle, path, Icon]) => <NavLink className="tool-card" to={`/${path}`} key={path}><Icon /><strong>{label}</strong><small>{subtitle}</small></NavLink>)}</div><NavLink className="wide-action" to="/reports"><FileText />Informe PDF</NavLink><section className="info-grid"><article className="info-card"><h2>Características principales</h2><ul><li>Tablas P/T con burbuja y rocío cuando existan datos generados.</li><li>Cálculo de recalentamiento y subenfriamiento.</li><li>Registro local de intervenciones y PDF.</li><li>Funciona sin conexión.</li></ul></article><article className="info-card"><h2>Base de datos</h2><Database /><p>Los datos termodinámicos se generan con CoolProp y se almacenan localmente para uso sin conexión.</p></article><article className="info-card"><h2>Tecnologías</h2><p>React + TypeScript · Vite · Capacitor · PWA · IndexedDB</p></article></section><footer className="legal-strip">Herramienta orientativa para técnicos. Usar siempre procedimientos y normas de seguridad aplicables. <span>Versión 1.0.0</span></footer></main>
}

function SaturationTable({ table, unit, kind }: { table: RefrigerantTable; unit: PressureUnit; kind: PressureKind }) {
  if (table.points.length === 0) return <div className="empty-table"><Table2 /><strong>Tabla pendiente</strong><p>Genera datos con CoolProp para mostrar filas P/T reales. No se cargan valores manuales.</p></div>
  return <div className="table-wrap"><table><thead><tr><th>Temp. °C</th><th>Burbuja</th><th>Rocío</th><th>{formatPressureLabel(unit, kind)}</th></tr></thead><tbody>{table.points.slice(0, 12).map((point) => <tr key={`${point.pressurePaAbs}-${point.dewC}`}><td>{(point.dewC ?? point.bubbleC)?.toFixed(1)}</td><td>{point.bubbleC?.toFixed(1) ?? '-'}</td><td>{point.dewC?.toFixed(1) ?? '-'}</td><td>{paAbsoluteToPressure(point.pressurePaAbs, unit, kind).toFixed(2)}</td></tr>)}</tbody></table></div>
}

function UnitTabs({ unit, setUnit }: { unit: PressureUnit; setUnit: (unit: PressureUnit) => void }) {
  return <div className="segmented">{preferredPressureUnits.map((u) => <button type="button" className={unit === u ? 'active' : ''} onClick={() => setUnit(u)} key={u}>{u === 'bar' ? 'Bar(g)' : u === 'PSI' ? 'PSI(g)' : u}</button>)}</div>
}

function PtPage({ mode = 'pt' }: { mode?: 'pt' | 'superheat' | 'subcooling' }) {
  const [refrigerant, setRefrigerant] = useState('R32')
  const [pressure, setPressure] = useState('7,50')
  const [temperature, setTemperature] = useState(mode === 'pt' ? '5' : '12,5')
  const [unit, setUnit] = useState<PressureUnit>('bar')
  const [kind, setKind] = useState<PressureKind>('gauge')
  const [result, setResult] = useState('Introduce datos y genera tablas CoolProp para calcular.')
  const table = getTable(refrigerant)
  const isSuperheat = mode === 'superheat'
  const isSubcooling = mode === 'subcooling'
  const title = isSuperheat ? 'Recalentamiento' : isSubcooling ? 'Subenfriamiento' : 'Presión - Temperatura'
  const calculate = () => {
    try {
      const p = pressureToPaAbsolute(parseLocalizedNumber(pressure), unit, kind)
      if (isSuperheat) setResult(`${calculateSuperheat(p, parseLocalizedNumber(temperature), table).toFixed(1)} K`)
      else if (isSubcooling) setResult(`${calculateSubcooling(p, parseLocalizedNumber(temperature), table).toFixed(1)} K`)
      else {
        const dew = interpolateTemperatureFromPressure(table, p, 'dew')
        const bubble = interpolateTemperatureFromPressure(table, p, 'bubble')
        const pressureFromTemp = paAbsoluteToPressure(interpolatePressureFromTemperature(table, parseLocalizedNumber(temperature), 'dew'), unit, kind)
        setResult(`Rocío ${dew.toFixed(2)} °C · Burbuja ${bubble.toFixed(2)} °C · ${pressureFromTemp.toFixed(3)} ${formatPressureLabel(unit, kind)}`)
      }
    } catch (error) { setResult(error instanceof Error ? error.message : 'No se pudo calcular.') }
  }
  return <main className="screen"><h1 className="page-title">{title}</h1><section className="panel form compact-form"><label>Refrigerante<select value={refrigerant} onChange={(e) => setRefrigerant(e.target.value)}>{refrigerantTables.map((table) => <option key={table.refrigerant}>{table.refrigerant}</option>)}</select></label>{mode === 'pt' && <UnitTabs unit={unit} setUnit={setUnit} />}<div className="two-col"><label>Presión<input inputMode="decimal" value={pressure} onChange={(e) => setPressure(e.target.value)} /></label><label>Tipo<select value={kind} onChange={(e) => setKind(e.target.value as PressureKind)}><option value="absolute">Absoluta</option><option value="gauge">Manométrica</option></select></label></div>{mode !== 'pt' && <label>{isSuperheat ? 'Temperatura de la tubería (°C)' : 'Temperatura línea líquido (°C)'}<input inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value)} /></label>}<button onClick={calculate}>Calcular</button></section>{mode === 'pt' ? <><SaturationTable table={table} unit={unit} kind={kind} /><div className="button-row"><button>Tabla completa</button><button className="secondary"><BarChart3 />Gráfico</button></div></> : <section className="result-panel"><small>Resultado</small><strong>{result}</strong><div className="meter"><span /><span /><span /></div><p>Resultado orientativo. Debe interpretarse junto con subenfriamiento, temperaturas, caudal de aire, carga térmica y datos del fabricante.</p></section>}{kind === 'gauge' && <p className="hint">La conversión depende de la presión atmosférica configurada: {DEFAULT_ATMOSPHERE_PA} Pa.</p>}<Notice /></main>
}

function ConverterPage() {
  const [value, setValue] = useState('500')
  const [from, setFrom] = useState<PressureUnit>('bar')
  const [vacuum, setVacuum] = useState<VacuumUnit>('micron')
  const pa = useMemo(() => pressureToPaAbsolute(Math.max(0.00001, parseLocalizedNumber(value)), from, 'absolute'), [value, from])
  const vacuumPa = vacuumToPaAbsolute(Math.max(0, parseLocalizedNumber(value)), vacuum)
  return <main className="screen"><h1 className="page-title">Conversor de presión y vacío</h1><section className="panel form"><label>Tipo de conversión<div className="segmented"><button className="active" type="button">Presión</button><button type="button">Vacío</button></div></label><div className="two-col"><label>Valor de entrada<input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></label><label>Unidad<select value={from} onChange={(e) => setFrom(e.target.value as PressureUnit)}>{pressureUnits.map((u) => <option key={u}>{u}</option>)}</select></label></div><div className="data-list">{pressureUnits.slice(0, 6).map((u) => <p key={u}><span>{u}</span><strong>{paAbsoluteToPressure(pa, u, 'absolute').toFixed(4)}</strong></p>)}</div></section><section className="panel form"><h2>Vacío</h2><select value={vacuum} onChange={(e) => setVacuum(e.target.value as VacuumUnit)}>{vacuumUnits.map((u) => <option key={u}>{u}</option>)}</select><div className="data-list">{vacuumUnits.slice(0, 6).map((u) => <p key={u}><span>{u}</span><strong>{paAbsoluteToVacuum(vacuumPa, u).toFixed(4)}</strong></p>)}</div><p className="hint">Para verificar vacío profundo en refrigeración se necesita un vacuómetro electrónico en micrones.</p></section></main>
}

function RefrigerantsPage() {
  return <main className="screen"><h1 className="page-title">Refrigerantes</h1>{refrigerantTables.map((table) => { const meta = refrigerantMetadata[table.refrigerant]; return <article className="panel refrigerant-card" key={table.refrigerant}><div><h2>{meta.name}</h2><p>{table.limitations.join(' ')}</p></div><dl><dt>Tipo</dt><dd>{meta.familyType.value ?? meta.familyType.note}</dd><dt>Seguridad</dt><dd>{meta.safetyClass.value ?? meta.safetyClass.note}</dd><dt>GWP</dt><dd>{meta.gwp.value ?? meta.gwp.note}</dd></dl></article> })}</main>
}

function ComparePage() { return <main className="screen"><h1 className="page-title">Comparador de refrigerantes</h1><div className="compare-select"><button>R32</button><span>VS</span><button>R410A</button></div><div className="panel warning-panel"><Scale /><strong>No mezclar refrigerantes</strong><p>No se debe considerar un refrigerante como sustituto directo únicamente porque sus presiones sean similares.</p><button>Ver más información</button></div><Notice /></main> }

function ChargePage() {
  const [factory, setFactory] = useState('850'); const [included, setIncluded] = useState('5'); const [installed, setInstalled] = useState('9'); const [gpm, setGpm] = useState('20')
  const r = calculateAdditionalCharge(parseLocalizedNumber(factory), parseLocalizedNumber(included), parseLocalizedNumber(installed), parseLocalizedNumber(gpm))
  return <main className="screen"><h1 className="page-title">Calculadora de carga</h1><div className="panel form compact-form"><label>Carga de fábrica (g)<input value={factory} onChange={(e) => setFactory(e.target.value)} /></label><label>Longitud incluida (m)<input value={included} onChange={(e) => setIncluded(e.target.value)} /></label><label>Longitud instalada (m)<input value={installed} onChange={(e) => setInstalled(e.target.value)} /></label><label>Carga adicional (g/m)<input value={gpm} onChange={(e) => setGpm(e.target.value)} /></label></div><section className="result-panel charge-result"><small>Carga total calculada</small><strong>{(r.totalChargeG / 1000).toFixed(3)} kg</strong><p>Longitud adicional: {r.additionalLengthM.toFixed(0)} m · Carga adicional: {r.additionalChargeG.toFixed(0)} g</p></section><p className="hint">Introducir siempre la carga en líquido según indicaciones del fabricante.</p><button className="full-width">Guardar en intervención</button></main>
}

function DiagnosticsPage() { const findings = runDiagnosticRules({ mode: 'frio', thermalDeltaK: 5, superheatK: 16, subcoolingK: 2 }); return <main className="screen"><h1 className="page-title">Diagnóstico guiado</h1><div className="notice">El diagnóstico es orientativo y no sustituye las mediciones, la prueba de estanqueidad, la carga por peso ni la documentación del fabricante.</div>{findings.map((f) => <article className="panel" key={f.cause}><h2>{f.cause}</h2><p>Confianza: {f.confidence}</p><p>{f.supportingData.join(', ')}</p><p>{f.checks.join(' · ')}</p></article>)}</main> }

const interventionSchema = z.object({ clientName: z.string().min(2, 'Indica el cliente'), workType: z.string().min(2, 'Indica el trabajo'), observations: z.string().optional() })
type InterventionForm = z.infer<typeof interventionSchema>
function InterventionsPage() {
  const [items, setItems] = useState<Intervention[]>([])
  const { register, handleSubmit, formState: { errors }, reset } = useForm<InterventionForm>({ resolver: zodResolver(interventionSchema), defaultValues: { clientName: '', workType: 'Mantenimiento' } })
  const load = () => void db.interventions.orderBy('updatedAt').reverse().toArray().then(setItems)
  useEffect(load, [])
  const save = async (data: InterventionForm) => { const now = new Date().toISOString(); await db.interventions.put({ id: newId('int'), date: now.slice(0, 10), status: 'borrador', photos: [], createdAt: now, updatedAt: now, ...data }); reset(); load() }
  const makePdf = (item: Intervention) => { const blob = generateInterventionPdf(item); const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener') }
  return <main className="screen"><h1 className="page-title">Registro de intervenciones</h1><form className="panel form" onSubmit={handleSubmit(save)}><label>Cliente<input {...register('clientName')} /></label>{errors.clientName && <span className="error">{errors.clientName.message}</span>}<label>Tipo de trabajo<input {...register('workType')} /></label><label>Observaciones<textarea {...register('observations')} /></label><button>Guardar intervención</button></form>{items.map((item) => <article className="panel row" key={item.id}><div><h2>{item.clientName}</h2><p>{item.workType} · {item.date}</p></div><button onClick={() => makePdf(item)}>PDF</button></article>)}</main>
}

function ReportsPage() { return <main className="screen"><h1 className="page-title">Informes PDF</h1><div className="panel"><p>Los informes PDF se generan desde cada intervención y permanecen locales en el dispositivo.</p></div></main> }
function SettingsPage() { return <main className="screen"><h1 className="page-title">Ajustes</h1><div className="panel form"><label>Presión atmosférica<input defaultValue={DEFAULT_ATMOSPHERE_PA} /></label><label>Técnico<input placeholder="Nombre del técnico" /></label><label>Tema<select defaultValue="dark"><option value="dark">Oscuro</option><option value="light">Claro</option><option value="system">Sistema</option></select></label><p className="hint">Sin analítica, publicidad, Firebase ni servicios externos.</p></div></main> }

export default function App() {
  return <Shell><Routes><Route path="/" element={<HomePage />} /><Route path="/pt" element={<PtPage />} /><Route path="/superheat" element={<PtPage mode="superheat" />} /><Route path="/subcooling" element={<PtPage mode="subcooling" />} /><Route path="/converter" element={<ConverterPage />} /><Route path="/refrigerants" element={<RefrigerantsPage />} /><Route path="/compare" element={<ComparePage />} /><Route path="/charge" element={<ChargePage />} /><Route path="/diagnostics" element={<DiagnosticsPage />} /><Route path="/interventions" element={<InterventionsPage />} /><Route path="/reports" element={<ReportsPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/tools" element={<HomePage />} /></Routes></Shell>
}
