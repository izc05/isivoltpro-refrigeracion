import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ArrowUpDown, BarChart3, ChevronDown, ChevronUp, Database, FileText, Gauge, Grid3X3, LockKeyhole, Plus, Save, Scale, Search, Stethoscope, Table2, Thermometer, Wrench } from 'lucide-react'
import { refrigerantTables, type RefrigerantTable } from '../data/generated'
import { calculateSubcooling, calculateSuperheat, evaluateSubcooling, evaluateSuperheat, interpolatePressureFromTemperature, interpolateTemperatureFromPressure, type ThermalIndicator } from '../domain/refrigerants/calculations'
import { commonPressureRows, maxGlideK, tableStatusLabel } from '../domain/refrigerants/summary'
import { formatPressureLabel, paAbsoluteToPressure, paAbsoluteToVacuum, pressureToPaAbsolute, type PressureKind, type PressureUnit, type VacuumUnit, vacuumToPaAbsolute } from '../domain/units'
import { calculateAdditionalChargeWithUnits } from '../domain/charge'
import { convertAirflow, convertCoolingPower, convertLength, convertMass, convertTemperature, copFromEer, eerFromCop, singlePhaseCurrent, threePhaseCurrent, type AirflowUnit, type CoolingPowerUnit, type LengthUnit, type MassUnit, type TemperatureUnit } from '../domain/technical-conversions'
import { APP_VERSION, EmptyState, Notice, PageTitle, appIconUrl, createMeasurementDraft, formatNumber, getTable, isZeotropicWithGlide, parseRequiredNumber, preferredPressureUnits, useSettings } from './shared'

const pressureUnits: PressureUnit[] = ['Pa', 'kPa', 'MPa', 'bar', 'PSI', 'kgf/cm2', 'atm']
const vacuumUnits: VacuumUnit[] = ['micron', 'Pa_abs', 'mbar_abs', 'Torr', 'mmHg', 'inHg', 'bar_abs']
const massUnits: MassUnit[] = ['g', 'kg', 'lb', 'oz']
const lengthUnits: LengthUnit[] = ['m', 'ft']
const coolingPowerUnits: CoolingPowerUnit[] = ['kW', 'frig_h', 'BTU_h']
const airflowUnits: AirflowUnit[] = ['m3_h', 'l_s', 'CFM']

export const tools = [
  ['Presión - Temperatura', 'Conversión P/T con burbuja y rocío', '/pt', Thermometer],
  ['Recalentamiento', 'Temperatura de aspiración', '/superheat', ArrowUpDown],
  ['Subenfriamiento', 'Temperatura de línea de líquido', '/subcooling', ArrowUpDown],
  ['Conversor técnico', 'Presión, vacío, potencia y unidades', '/converter', Gauge],
  ['Vacío y estabilidad', 'Micrones, fases y registro', '/vacuum', Gauge],
  ['Calculadora de carga', 'Carga de placa y longitud adicional', '/charge', LockKeyhole],
  ['Refrigerantes', 'Datos, seguridad y trazabilidad', '/refrigerants', Table2],
  ['Comparador', 'Comparación sin equivalencias directas', '/compare', Scale],
  ['Diagnóstico guiado', 'Hipótesis y comprobaciones', '/diagnostics', Stethoscope],
] as const

export function HomePage() {
  return <main className="sz-screen sz-home">
    <section className="sz-hero"><img src={appIconUrl} alt="Logotipo IsiVoltPro" /><div><span className="sz-eyebrow">Suite técnica offline</span><h1>IsiVoltPro</h1><p>Refrigeración</p><small>Cálculo, diagnóstico, registro e informes desde el móvil.</small></div></section>
    <section className="sz-dashboard-grid"><NavLink className="sz-primary-action" to="/interventions"><Plus /><span><strong>Nueva intervención</strong><small>Cliente, equipo y mediciones</small></span></NavLink><NavLink className="sz-secondary-action" to="/pt"><Thermometer /><span><strong>Cálculo rápido P/T</strong><small>Saturación, burbuja y rocío</small></span></NavLink></section>
    <div className="sz-section-heading"><div><span className="sz-eyebrow">Herramientas</span><h2>Trabajo técnico</h2></div><NavLink to="/tools">Ver todas</NavLink></div>
    <div className="sz-tool-grid">{tools.slice(0, 6).map(([label, subtitle, path, Icon]) => <NavLink className="sz-tool-card" to={path} key={path}><Icon /><strong>{label}</strong><small>{subtitle}</small></NavLink>)}</div>
    <section className="sz-summary-grid"><article className="sz-summary-card"><Database /><div><strong>Local</strong><p>Datos guardados en el dispositivo.</p></div></article><article className="sz-summary-card"><Table2 /><div><strong>P/T trazable</strong><p>Tablas generadas con CoolProp.</p></div></article><article className="sz-summary-card"><FileText /><div><strong>PDF</strong><p>Informes profesionales.</p></div></article></section>
    <footer className="sz-legal">Herramienta orientativa. Verifica siempre placa, manual, procedimiento y normativa.<span>Versión {APP_VERSION}</span></footer>
  </main>
}

export function ToolsPage() {
  const [query, setQuery] = useState('')
  const visible = tools.filter(([a, b]) => `${a} ${b}`.toLowerCase().includes(query.toLowerCase()))
  return <main className="sz-screen"><PageTitle eyebrow="Caja de herramientas" title="Todas las herramientas" /><label className="sz-search"><Search /><span className="sr-only">Buscar</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cálculo o herramienta" /></label><div className="sz-tool-grid">{visible.map(([label, subtitle, path, Icon]) => <NavLink className="sz-tool-card" to={path} key={path}><Icon /><strong>{label}</strong><small>{subtitle}</small></NavLink>)}</div>{visible.length === 0 && <EmptyState icon={<Grid3X3 />} title="Sin resultados" text="Prueba con presión, vacío, carga o refrigerante." />}</main>
}

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

function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  const [shown, setShown] = useState(open)
  return <section className="sz-panel sz-collapsible"><button className="sz-collapsible-head" type="button" onClick={() => setShown(!shown)}><span><Wrench/><strong>{title}</strong></span>{shown ? <ChevronUp/> : <ChevronDown/>}</button>{shown && <div className="sz-collapsible-body">{children}</div>}</section>
}

function Safe({ fn, digits = 2, suffix = '' }: { fn: () => number; digits?: number; suffix?: string }) { try { return <strong>{formatNumber(fn(), digits)}{suffix}</strong> } catch { return <strong>—</strong> } }

export function ConverterPage() {
  const { atmospherePa } = useSettings()
  const [p,setP]=useState('9'),[pu,setPu]=useState<PressureUnit>('bar'),[pk,setPk]=useState<PressureKind>('gauge')
  const [v,setV]=useState('500'),[vu,setVu]=useState<VacuumUnit>('micron')
  const [t,setT]=useState('25'),[tu,setTu]=useState<TemperatureUnit>('C')
  const [power,setPower]=useState('3000'),[powerUnit,setPowerUnit]=useState<CoolingPowerUnit>('frig_h')
  const [mass,setMass]=useState('1'),[massUnit,setMassUnit]=useState<MassUnit>('kg'),[length,setLength]=useState('10'),[lengthUnit,setLengthUnit]=useState<LengthUnit>('m')
  const [flow,setFlow]=useState('500'),[flowUnit,setFlowUnit]=useState<AirflowUnit>('m3_h')
  const [kw,setKw]=useState('3,5'),[voltage,setVoltage]=useState('230'),[pf,setPf]=useState('0,85'),[cop,setCop]=useState('3,2')
  return <main className="sz-screen"><PageTitle eyebrow="Conversión" title="Conversor técnico" description="Presión y vacío conservan valores independientes." />
    <Section title="Presión" open><div className="sz-two-columns"><label>Valor<input value={p} onChange={(e)=>setP(e.target.value)}/></label><label>Unidad<select value={pu} onChange={(e)=>setPu(e.target.value as PressureUnit)}>{pressureUnits.map(u=><option key={u}>{u}</option>)}</select></label></div><label>Referencia<select value={pk} onChange={(e)=>setPk(e.target.value as PressureKind)}><option value="gauge">Manométrica</option><option value="absolute">Absoluta</option></select></label><div className="sz-data-list">{preferredPressureUnits.map(u=><p key={u}><span>{formatPressureLabel(u,pk)}</span><Safe fn={()=>paAbsoluteToPressure(pressureToPaAbsolute(parseRequiredNumber(p,'presión'),pu,pk,atmospherePa),u,pk,atmospherePa)}/></p>)}</div></Section>
    <Section title="Vacío absoluto" open><div className="sz-two-columns"><label>Valor<input value={v} onChange={(e)=>setV(e.target.value)}/></label><label>Unidad<select value={vu} onChange={(e)=>setVu(e.target.value as VacuumUnit)}>{vacuumUnits.map(u=><option key={u}>{u}</option>)}</select></label></div><div className="sz-data-list">{(['micron','Pa_abs','mbar_abs','inHg'] as VacuumUnit[]).map(u=><p key={u}><span>{u}</span><Safe digits={u==='micron'?0:4} fn={()=>paAbsoluteToVacuum(vacuumToPaAbsolute(parseRequiredNumber(v,'vacío'),vu),u)}/></p>)}</div><Notice tone="warning"><p>Verifica vacío profundo con vacuómetro electrónico en micrones.</p></Notice></Section>
    <Section title="Temperatura"><div className="sz-two-columns"><label>Valor<input value={t} onChange={(e)=>setT(e.target.value)}/></label><label>Unidad<select value={tu} onChange={(e)=>setTu(e.target.value as TemperatureUnit)}><option value="C">°C</option><option value="F">°F</option></select></label></div><div className="sz-data-list"><p><span>°C</span><Safe fn={()=>convertTemperature(parseRequiredNumber(t,'temperatura'),tu,'C')}/></p><p><span>°F</span><Safe fn={()=>convertTemperature(parseRequiredNumber(t,'temperatura'),tu,'F')}/></p></div></Section>
    <Section title="Potencia frigorífica"><div className="sz-two-columns"><label>Valor<input value={power} onChange={(e)=>setPower(e.target.value)}/></label><label>Unidad<select value={powerUnit} onChange={(e)=>setPowerUnit(e.target.value as CoolingPowerUnit)}>{coolingPowerUnits.map(u=><option key={u}>{u}</option>)}</select></label></div><div className="sz-data-list">{coolingPowerUnits.map(u=><p key={u}><span>{u}</span><Safe digits={u==='kW'?2:0} fn={()=>convertCoolingPower(parseRequiredNumber(power,'potencia'),powerUnit,u)}/></p>)}</div></Section>
    <Section title="Masa y longitud"><div className="sz-two-columns"><label>Masa<input value={mass} onChange={(e)=>setMass(e.target.value)}/></label><label>Unidad<select value={massUnit} onChange={(e)=>setMassUnit(e.target.value as MassUnit)}>{massUnits.map(u=><option key={u}>{u}</option>)}</select></label></div><div className="sz-data-list">{massUnits.map(u=><p key={u}><span>{u}</span><Safe fn={()=>convertMass(parseRequiredNumber(mass,'masa'),massUnit,u)}/></p>)}</div><div className="sz-two-columns"><label>Longitud<input value={length} onChange={(e)=>setLength(e.target.value)}/></label><label>Unidad<select value={lengthUnit} onChange={(e)=>setLengthUnit(e.target.value as LengthUnit)}>{lengthUnits.map(u=><option key={u}>{u}</option>)}</select></label></div><div className="sz-data-list">{lengthUnits.map(u=><p key={u}><span>{u}</span><Safe fn={()=>convertLength(parseRequiredNumber(length,'longitud'),lengthUnit,u)}/></p>)}</div></Section>
    <Section title="Caudal y electricidad"><div className="sz-two-columns"><label>Caudal<input value={flow} onChange={(e)=>setFlow(e.target.value)}/></label><label>Unidad<select value={flowUnit} onChange={(e)=>setFlowUnit(e.target.value as AirflowUnit)}>{airflowUnits.map(u=><option key={u}>{u}</option>)}</select></label></div><div className="sz-data-list">{airflowUnits.map(u=><p key={u}><span>{u}</span><Safe fn={()=>convertAirflow(parseRequiredNumber(flow,'caudal'),flowUnit,u)}/></p>)}</div><div className="sz-two-columns"><label>kW eléctricos<input value={kw} onChange={(e)=>setKw(e.target.value)}/></label><label>Tensión<input value={voltage} onChange={(e)=>setVoltage(e.target.value)}/></label></div><label>Factor potencia<input value={pf} onChange={(e)=>setPf(e.target.value)}/></label><div className="sz-data-list"><p><span>Monofásica</span><Safe suffix=" A" fn={()=>singlePhaseCurrent(parseRequiredNumber(kw,'potencia'),parseRequiredNumber(voltage,'tensión'),parseRequiredNumber(pf,'factor'))}/></p><p><span>Trifásica 400 V</span><Safe suffix=" A" fn={()=>threePhaseCurrent(parseRequiredNumber(kw,'potencia'),400,parseRequiredNumber(pf,'factor'))}/></p></div><label>COP<input value={cop} onChange={(e)=>setCop(e.target.value)}/></label><div className="sz-data-list"><p><span>EER</span><Safe fn={()=>eerFromCop(parseRequiredNumber(cop,'COP'))}/></p><p><span>COP comprobación</span><Safe fn={()=>copFromEer(eerFromCop(parseRequiredNumber(cop,'COP')))}/></p></div></Section>
  </main>
}

export function ChargePage() {
  const navigate=useNavigate(),[factory,setFactory]=useState('0,85'),[fu,setFu]=useState<MassUnit>('kg'),[included,setIncluded]=useState('5'),[installed,setInstalled]=useState('12'),[lu,setLu]=useState<LengthUnit>('m'),[gpm,setGpm]=useState('20'),[recovered,setRecovered]=useState('0'),[added,setAdded]=useState('0'),[mu,setMu]=useState<MassUnit>('g'),[saved,setSaved]=useState(false)
  const calc=useMemo(()=>{try{return{value:calculateAdditionalChargeWithUnits({factoryCharge:parseRequiredNumber(factory,'carga'),factoryUnit:fu,includedLength:parseRequiredNumber(included,'longitud'),installedLength:parseRequiredNumber(installed,'longitud'),lengthUnit:lu,additionalPerMeterG:parseRequiredNumber(gpm,'g/m'),recovered:parseRequiredNumber(recovered,'recuperado'),recoveredUnit:mu,added:parseRequiredNumber(added,'añadido'),addedUnit:mu}),error:''}}catch(e){return{value:null,error:e instanceof Error?e.message:'Datos no válidos'}}},[factory,fu,included,installed,lu,gpm,recovered,added,mu])
  const save=async()=>{if(!calc.value)return;await createMeasurementDraft({workType:'Cálculo de carga adicional',recoveredRefrigerant:`${calc.value.recoveredG} g`,addedRefrigerant:`${calc.value.addedG} g`,observations:`Carga total orientativa ${formatNumber(calc.value.totalChargeG/1000,3)} kg; adicional ${formatNumber(calc.value.additionalChargeG,0)} g.`});setSaved(true)}
  return <main className="sz-screen"><PageTitle eyebrow="Carga por peso" title="Calculadora de carga" description="Usa exclusivamente el dato g/m del fabricante."/><section className="sz-panel sz-form"><div className="sz-two-columns"><label>Carga placa<input value={factory} onChange={e=>setFactory(e.target.value)}/></label><label>Unidad<select value={fu} onChange={e=>setFu(e.target.value as MassUnit)}>{massUnits.map(u=><option key={u}>{u}</option>)}</select></label></div><div className="sz-two-columns"><label>Longitud incluida<input value={included} onChange={e=>setIncluded(e.target.value)}/></label><label>Longitud instalada<input value={installed} onChange={e=>setInstalled(e.target.value)}/></label></div><label>Unidad longitud<select value={lu} onChange={e=>setLu(e.target.value as LengthUnit)}>{lengthUnits.map(u=><option key={u}>{u}</option>)}</select></label><label>Carga adicional g/m<input value={gpm} onChange={e=>setGpm(e.target.value)}/></label><div className="sz-two-columns"><label>Recuperado<input value={recovered} onChange={e=>setRecovered(e.target.value)}/></label><label>Añadido<input value={added} onChange={e=>setAdded(e.target.value)}/></label></div><label>Unidad<select value={mu} onChange={e=>setMu(e.target.value as MassUnit)}>{massUnits.map(u=><option key={u}>{u}</option>)}</select></label></section>{calc.error?<Notice tone="danger"><p>{calc.error}</p></Notice>:calc.value&&<section className="sz-result"><small>Carga total orientativa</small><strong>{formatNumber(calc.value.totalChargeG/1000,3)} kg</strong><div className="sz-data-list"><p><span>Longitud adicional</span><strong>{formatNumber(calc.value.additionalLengthM,1)} m</strong></p><p><span>Carga adicional</span><strong>{formatNumber(calc.value.additionalChargeG,0)} g</strong></p><p><span>Recuperado / añadido</span><strong>{formatNumber(calc.value.recoveredG,0)} / {formatNumber(calc.value.addedG,0)} g</strong></p></div><div className="sz-button-row"><button className="sz-button secondary" type="button" onClick={save}><Save/>Guardar intervención</button><button className="sz-button ghost" type="button" onClick={()=>navigate('/interventions')}>Abrir trabajo</button></div>{saved&&<Notice tone="success"><p>Borrador guardado.</p></Notice>}</section>}<Notice tone="warning"><p>La presión por sí sola no determina la carga correcta.</p></Notice></main>
}

export function VacuumPage() {
  const [microns,setMicrons]=useState('500'),[initial,setInitial]=useState('2500'),[finalValue,setFinal]=useState('650'),[phase,setPhase]=useState<'process'|'isolation'|'stability'|'finished'>('process'),[seconds,setSeconds]=useState(0),[running,setRunning]=useState(false),[saved,setSaved]=useState(false)
  const timer=useRef<number|null>(null)
  useEffect(()=>{if(!running)return;timer.current=window.setInterval(()=>setSeconds(s=>s+1),1000);return()=>{if(timer.current)window.clearInterval(timer.current)}},[running])
  const value=Number(microns.replace(',','.')),pa=Number.isFinite(value)?vacuumToPaAbsolute(Math.max(0,value),'micron'):NaN,change=Number(finalValue.replace(',','.'))-Number(initial.replace(',','.')),elapsed=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`
  const save=async()=>{await createMeasurementDraft({workType:'Vacío y estabilidad',finalVacuum:`${microns} micrones`,vacuumTestDuration:elapsed,observations:`Fase ${phase}; inicial ${initial}; final ${finalValue}; variación ${change} μm.`});setSaved(true)}
  return <main className="sz-screen"><PageTitle eyebrow="Procedimiento" title="Vacío y estabilidad" description="Registra fases y evolución sin certificar automáticamente ausencia de fugas."/><section className="sz-panel sz-form"><div className="sz-segmented four">{([['process','Vacío'],['isolation','Aislar'],['stability','Estabilidad'],['finished','Fin']] as const).map(([v,l])=><button type="button" key={v} className={phase===v?'active':''} onClick={()=>setPhase(v)}>{l}</button>)}</div><label>Micrones actuales<input value={microns} onChange={e=>setMicrons(e.target.value)}/></label><div className="sz-two-columns"><label>Inicial μm<input value={initial} onChange={e=>setInitial(e.target.value)}/></label><label>Final μm<input value={finalValue} onChange={e=>setFinal(e.target.value)}/></label></div></section><section className="sz-result"><small>Fase: {phase}</small><strong>{Number.isFinite(value)?`${formatNumber(value,0)} μm`:'—'}</strong><div className="sz-timer">{elapsed}</div><div className="sz-button-row"><button className="sz-button primary" type="button" onClick={()=>setRunning(!running)}>{running?'Pausar':'Iniciar'}</button><button className="sz-button secondary" type="button" onClick={()=>{setRunning(false);setSeconds(0)}}>Reiniciar</button></div><div className="sz-data-list"><p><span>mbar abs</span><strong>{Number.isFinite(pa)?formatNumber(paAbsoluteToVacuum(pa,'mbar_abs'),4):'—'}</strong></p><p><span>Variación</span><strong>{Number.isFinite(change)?`${formatNumber(change,0)} μm`:'—'}</strong></p></div><button className="sz-button secondary full" type="button" onClick={save}><Save/>Guardar registro</button>{saved&&<Notice tone="success"><p>Registro guardado.</p></Notice>}</section><Notice tone="warning"><p>La subida de micrones puede deberse a humedad, desgasificación, temperatura, conexiones o fuga.</p></Notice></main>
}
