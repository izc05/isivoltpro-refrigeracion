import { NavLink, Route, Routes } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { BarChart3, FileText, Gauge, Home, Settings, Snowflake, Thermometer, Wrench } from 'lucide-react'
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
const vacuumUnits: VacuumUnit[] = ['micron', 'Pa_abs', 'mbar_abs', 'Torr', 'mmHg', 'inHg', 'bar_abs']
const tools = [
  ['Presión-Temperatura', 'pt', Gauge], ['Recalentamiento', 'superheat', Thermometer], ['Subenfriamiento', 'subcooling', Snowflake], ['Conversor', 'converter', BarChart3], ['Refrigerantes', 'refrigerants', Snowflake], ['Comparador', 'compare', BarChart3], ['Carga adicional', 'charge', Wrench], ['Diagnóstico', 'diagnostics', Gauge], ['Intervenciones', 'interventions', FileText], ['Informes', 'reports', FileText],
] as const

function getTable(name: string): RefrigerantTable {
  return refrigerantTables.find((table) => table.refrigerant === name) ?? refrigerantTables[0]
}

function Notice() {
  return <div className="notice">Datos PT pendientes de generar con CoolProp. La app evita usar valores termodinámicos manuales y bloquea cálculos sin tabla validada.</div>
}

function HomePage() {
  return <main className="screen"><section className="hero"><img src="/icons/icon.svg" alt="" /><div><p>IsiVoltPro</p><h1>Refrigeración</h1><span>Herramientas locales para campo</span></div></section><div className="grid">{tools.map(([label, path, Icon]) => <NavLink className="tile" to={`/${path}`} key={path}><Icon /><span>{label}</span></NavLink>)}</div><Notice /></main>
}

function PtPage({ mode = 'pt' }: { mode?: 'pt' | 'superheat' | 'subcooling' }) {
  const [refrigerant, setRefrigerant] = useState('R32')
  const [pressure, setPressure] = useState('7')
  const [temperature, setTemperature] = useState('5')
  const [unit, setUnit] = useState<PressureUnit>('bar')
  const [kind, setKind] = useState<PressureKind>('gauge')
  const [result, setResult] = useState('Introduce datos y genera tablas CoolProp para calcular.')
  const table = getTable(refrigerant)
  const isSuperheat = mode === 'superheat'
  const isSubcooling = mode === 'subcooling'
  const title = isSuperheat ? 'Recalentamiento' : isSubcooling ? 'Subenfriamiento' : 'Presión-Temperatura'
  const calculate = () => {
    try {
      const p = pressureToPaAbsolute(parseLocalizedNumber(pressure), unit, kind)
      if (isSuperheat) setResult(`Recalentamiento: ${calculateSuperheat(p, parseLocalizedNumber(temperature), table).toFixed(1)} K. Resultado orientativo.`)
      else if (isSubcooling) setResult(`Subenfriamiento: ${calculateSubcooling(p, parseLocalizedNumber(temperature), table).toFixed(1)} K. Resultado orientativo.`)
      else {
        const dew = interpolateTemperatureFromPressure(table, p, 'dew')
        const bubble = interpolateTemperatureFromPressure(table, p, 'bubble')
        const pressureFromTemp = paAbsoluteToPressure(interpolatePressureFromTemperature(table, parseLocalizedNumber(temperature), 'dew'), unit, kind)
        setResult(`Rocío ${dew.toFixed(2)} °C · Burbuja ${bubble.toFixed(2)} °C · ${pressureFromTemp.toFixed(3)} ${formatPressureLabel(unit, kind)} a ${temperature} °C`)
      }
    } catch (error) { setResult(error instanceof Error ? error.message : 'No se pudo calcular.') }
  }
  return <main className="screen"><h1>{title}</h1><div className="panel form"><label>Refrigerante<select value={refrigerant} onChange={(e) => setRefrigerant(e.target.value)}>{refrigerantTables.map((table) => <option key={table.refrigerant}>{table.refrigerant}</option>)}</select></label><label>Presión<input inputMode="decimal" value={pressure} onChange={(e) => setPressure(e.target.value)} /></label><label>Unidad<select value={unit} onChange={(e) => setUnit(e.target.value as PressureUnit)}>{pressureUnits.map((u) => <option key={u}>{u}</option>)}</select></label><label>Tipo<select value={kind} onChange={(e) => setKind(e.target.value as PressureKind)}><option value="absolute">Absoluta</option><option value="gauge">Manométrica</option></select></label><label>{isSuperheat ? 'Temperatura tubería aspiración °C' : isSubcooling ? 'Temperatura línea líquido °C' : 'Temperatura °C'}<input inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value)} /></label><button onClick={calculate}>Calcular</button></div><p className="result">{result}</p>{kind === 'gauge' && <p className="hint">La conversión depende de la presión atmosférica configurada: {DEFAULT_ATMOSPHERE_PA} Pa.</p>}<Notice /></main>
}

function ConverterPage() {
  const [value, setValue] = useState('1')
  const [from, setFrom] = useState<PressureUnit>('bar')
  const [vacuum, setVacuum] = useState<VacuumUnit>('micron')
  const pa = useMemo(() => parseLocalizedNumber(value) * (from === 'bar' ? 100000 : from === 'PSI' ? 6894.757293168 : 1), [value, from])
  return <main className="screen"><h1>Conversor</h1><section className="panel form"><label>Presión positiva<input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></label><select value={from} onChange={(e) => setFrom(e.target.value as PressureUnit)}>{pressureUnits.map((u) => <option key={u}>{u}</option>)}</select><div className="result">{pressureUnits.map((u) => <div key={u}>{u}: {paAbsoluteToPressure(Math.max(1, pa), u, 'absolute').toFixed(4)}</div>)}</div></section><section className="panel form"><h2>Vacío</h2><select value={vacuum} onChange={(e) => setVacuum(e.target.value as VacuumUnit)}>{vacuumUnits.map((u) => <option key={u}>{u}</option>)}</select><div className="result">{vacuumUnits.map((u) => <div key={u}>{u}: {paAbsoluteToVacuum(vacuumToPaAbsolute(parseLocalizedNumber(value), vacuum), u).toFixed(4)}</div>)}</div><p className="hint">Para verificar vacío profundo en refrigeración se necesita un vacuómetro electrónico en micrones.</p></section></main>
}

function RefrigerantsPage() {
  return <main className="screen"><h1>Refrigerantes</h1>{refrigerantTables.map((table) => { const meta = refrigerantMetadata[table.refrigerant]; return <article className="panel" key={table.refrigerant}><h2>{meta.name}</h2><p>{table.limitations.join(' ')}</p><dl><dt>Tipo</dt><dd>{meta.familyType.value ?? meta.familyType.note}</dd><dt>Seguridad</dt><dd>{meta.safetyClass.value ?? meta.safetyClass.note}</dd><dt>GWP</dt><dd>{meta.gwp.value ?? meta.gwp.note}</dd></dl></article> })}</main>
}

function ComparePage() { return <main className="screen"><h1>Comparador</h1><div className="panel"><p>No mezclar refrigerantes.</p><p>No se debe considerar un refrigerante como sustituto directo únicamente porque sus presiones sean similares.</p><Notice /></div></main> }

function ChargePage() {
  const [factory, setFactory] = useState('900'); const [included, setIncluded] = useState('5'); const [installed, setInstalled] = useState('8'); const [gpm, setGpm] = useState('20')
  const r = calculateAdditionalCharge(parseLocalizedNumber(factory), parseLocalizedNumber(included), parseLocalizedNumber(installed), parseLocalizedNumber(gpm))
  return <main className="screen"><h1>Carga adicional</h1><div className="panel form"><label>Carga de fábrica (g)<input value={factory} onChange={(e) => setFactory(e.target.value)} /></label><label>Longitud incluida (m)<input value={included} onChange={(e) => setIncluded(e.target.value)} /></label><label>Longitud instalada (m)<input value={installed} onChange={(e) => setInstalled(e.target.value)} /></label><label>Dato fabricante (g/m)<input value={gpm} onChange={(e) => setGpm(e.target.value)} /></label><p className="result">Adicional {r.additionalChargeG.toFixed(0)} g · Total {r.totalChargeG.toFixed(0)} g</p><p className="hint">No se propone ningún g/m automático. Debe introducirse desde documentación del fabricante.</p></div></main>
}

function DiagnosticsPage() { const findings = runDiagnosticRules({ mode: 'frio', thermalDeltaK: 5, superheatK: 16, subcoolingK: 2 }); return <main className="screen"><h1>Diagnóstico orientativo</h1><div className="notice">El diagnóstico es orientativo y no sustituye las mediciones, la prueba de estanqueidad, la carga por peso ni la documentación del fabricante.</div>{findings.map((f) => <article className="panel" key={f.cause}><h2>{f.cause}</h2><p>Confianza: {f.confidence}</p><p>{f.supportingData.join(', ')}</p><p>{f.checks.join(' · ')}</p></article>)}</main> }

const interventionSchema = z.object({ clientName: z.string().min(2, 'Indica el cliente'), workType: z.string().min(2, 'Indica el trabajo'), observations: z.string().optional() })
type InterventionForm = z.infer<typeof interventionSchema>
function InterventionsPage() {
  const [items, setItems] = useState<Intervention[]>([])
  const { register, handleSubmit, formState: { errors }, reset } = useForm<InterventionForm>({ resolver: zodResolver(interventionSchema), defaultValues: { clientName: '', workType: 'Mantenimiento' } })
  const load = () => void db.interventions.orderBy('updatedAt').reverse().toArray().then(setItems)
  useEffect(load, [])
  const save = async (data: InterventionForm) => { const now = new Date().toISOString(); await db.interventions.put({ id: newId('int'), date: now.slice(0, 10), status: 'borrador', photos: [], createdAt: now, updatedAt: now, ...data }); reset(); load() }
  const makePdf = (item: Intervention) => { const blob = generateInterventionPdf(item); const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener') }
  return <main className="screen"><h1>Intervenciones</h1><form className="panel form" onSubmit={handleSubmit(save)}><label>Cliente<input {...register('clientName')} /></label>{errors.clientName && <span className="error">{errors.clientName.message}</span>}<label>Tipo de trabajo<input {...register('workType')} /></label><label>Observaciones<textarea {...register('observations')} /></label><button>Guardar intervención</button></form>{items.map((item) => <article className="panel row" key={item.id}><div><h2>{item.clientName}</h2><p>{item.workType} · {item.date}</p></div><button onClick={() => makePdf(item)}>PDF</button></article>)}</main>
}

function ReportsPage() { return <main className="screen"><h1>Informes</h1><div className="panel"><p>Los informes PDF se generan desde cada intervención y permanecen locales en el dispositivo.</p></div></main> }
function SettingsPage() { return <main className="screen"><h1>Ajustes</h1><div className="panel form"><label>Presión atmosférica<input defaultValue={DEFAULT_ATMOSPHERE_PA} /></label><label>Técnico<input placeholder="Nombre del técnico" /></label><label>Tema<select defaultValue="dark"><option value="dark">Oscuro</option><option value="light">Claro</option><option value="system">Sistema</option></select></label><p className="hint">Sin analítica, publicidad, Firebase ni servicios externos.</p></div></main> }

export default function App() {
  return <div className="app"><Routes><Route path="/" element={<HomePage />} /><Route path="/pt" element={<PtPage />} /><Route path="/superheat" element={<PtPage mode="superheat" />} /><Route path="/subcooling" element={<PtPage mode="subcooling" />} /><Route path="/converter" element={<ConverterPage />} /><Route path="/refrigerants" element={<RefrigerantsPage />} /><Route path="/compare" element={<ComparePage />} /><Route path="/charge" element={<ChargePage />} /><Route path="/diagnostics" element={<DiagnosticsPage />} /><Route path="/interventions" element={<InterventionsPage />} /><Route path="/reports" element={<ReportsPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/tools" element={<HomePage />} /></Routes><nav className="bottom"><NavLink to="/"><Home />Inicio</NavLink><NavLink to="/tools"><Wrench />Herramientas</NavLink><NavLink to="/interventions"><FileText />Intervenciones</NavLink><NavLink to="/settings"><Settings />Ajustes</NavLink></nav></div>
}
