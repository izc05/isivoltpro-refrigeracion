import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Wrench } from 'lucide-react'
import { formatPressureLabel, paAbsoluteToPressure, paAbsoluteToVacuum, pressureToPaAbsolute, type PressureKind, type PressureUnit, type VacuumUnit, vacuumToPaAbsolute } from '../domain/units'
import { convertAirflow, convertCoolingPower, convertLength, convertMass, convertTemperature, copFromEer, eerFromCop, singlePhaseCurrent, threePhaseCurrent, type AirflowUnit, type CoolingPowerUnit, type LengthUnit, type MassUnit, type TemperatureUnit } from '../domain/technical-conversions'
import { Notice, PageTitle, formatNumber, parseRequiredNumber, preferredPressureUnits, useSettings } from './shared'

const pressureUnits: PressureUnit[] = ['Pa', 'kPa', 'MPa', 'bar', 'PSI', 'kgf/cm2', 'atm']
const vacuumUnits: VacuumUnit[] = ['micron', 'Pa_abs', 'mbar_abs', 'Torr', 'mmHg', 'inHg', 'bar_abs']
const massUnits: MassUnit[] = ['g', 'kg', 'lb', 'oz']
const lengthUnits: LengthUnit[] = ['m', 'ft']
const coolingPowerUnits: CoolingPowerUnit[] = ['kW', 'frig_h', 'BTU_h']
const airflowUnits: AirflowUnit[] = ['m3_h', 'l_s', 'CFM']

function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  const [shown, setShown] = useState(open)
  return <section className="sz-panel sz-collapsible"><button className="sz-collapsible-head" type="button" onClick={() => setShown(!shown)}><span><Wrench/><strong>{title}</strong></span>{shown ? <ChevronUp/> : <ChevronDown/>}</button>{shown && <div className="sz-collapsible-body">{children}</div>}</section>
}

function safeValue(fn: () => number, digits: number, suffix: string) {
  try { return `${formatNumber(fn(), digits)}${suffix}` } catch { return '—' }
}

function Safe({ fn, digits = 2, suffix = '' }: { fn: () => number; digits?: number; suffix?: string }) {
  return <strong>{safeValue(fn, digits, suffix)}</strong>
}

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
