import { useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, BookOpen, Copy, RotateCcw, Save, Trash2 } from 'lucide-react'
import { ZodError } from 'zod'
import {
  calculateCondensationRisk,
  calculateFromDewPoint,
  calculateFromHumidityRatio,
  calculateFromRelativeHumidity,
  calculateFromVaporPressure,
  calculateFromWetBulb,
  comparePsychrometricStates,
  pressureRangeWarning,
  psychrometricPressureToPa,
  type CondensationRiskResult,
  type PsychrometricComparisonResult,
  type PsychrometricPressureUnit,
  type PsychrometricState,
} from '../calculation-engine/formulas/psychrometrics'
import { clearCalculationHistoryByCalculators, deleteCalculationHistory, listRecentCalculationHistory, saveCalculationHistory } from '../calculation-engine/history'
import type { CalculationEnvelope } from '../calculation-engine/types'
import type { CalculationHistoryRecord } from '../domain/storage/db'
import { altitudeToAtmospherePa, parseLocalizedNumber } from '../domain/units'
import { TechnicalImageGallery, VisualHelpButton } from '../visual/visual-components'
import { Notice, PageTitle, formatNumber, parseRequiredNumber, useSettings } from './shared'

type Tab = 'estado' | 'condensacion' | 'comparar' | 'aprender' | 'historial'
type Mode = 'quick' | 'advanced'
type KnownPair = 'relative-humidity' | 'wet-bulb' | 'dew-point' | 'humidity-ratio' | 'vapor-pressure'
type PressureMode = 'settings' | 'altitude' | 'manual'
type PsychCalculation = CalculationEnvelope<unknown, PsychrometricState>
type CondensationCalculation = CalculationEnvelope<unknown, CondensationRiskResult>
type CompareCalculation = CalculationEnvelope<unknown, PsychrometricComparisonResult>

const psychCalculators = ['dry-bulb-relative-humidity', 'dry-bulb-wet-bulb', 'dry-bulb-dew-point', 'dry-bulb-humidity-ratio', 'dry-bulb-vapor-pressure', 'condensation-risk', 'psychrometric-comparison']
const scope = { module: 'psychrometrics', calculator: 'dry-bulb-relative-humidity' }

const labels: Record<KnownPair, string> = {
  'relative-humidity': 'Humedad relativa',
  'wet-bulb': 'Bulbo húmedo',
  'dew-point': 'Punto de rocío',
  'humidity-ratio': 'Razón de humedad',
  'vapor-pressure': 'Presión de vapor',
}

const learning = [
  ['Qué es psicrometría', 'Estudia las propiedades del aire húmedo.', 'Sirve para interpretar confort, condensación, baterías, ventilación y procesos de UTA.', '25 °C y 50 % HR definen un estado de aire.', 'Confundir un punto de cálculo con todo el proceso de una instalación.'],
  ['Temperatura seca', 'Temperatura medida por una sonda protegida de radiación y fuentes directas.', 'Es la referencia principal de confort y cálculo sensible.', 'Un retorno a 25 °C se introduce como temperatura seca.', 'Medir pegado a una impulsión o pared fría.'],
  ['Temperatura de bulbo húmedo', 'Temperatura asociada a evaporación de agua sobre la sonda.', 'Permite obtener humedad si se combina con temperatura seca.', '25 °C seca y 18 °C húmeda describen un aire más seco que uno con 22 °C húmeda.', 'Usar el dato sin estabilizar el psicrómetro.'],
  ['Humedad relativa', 'Porcentaje entre vapor presente y vapor máximo posible a esa temperatura.', 'Ayuda a evaluar confort y saturación.', '50 % HR no significa la misma cantidad de agua a 10 °C que a 30 °C.', 'Compararla entre temperaturas distintas como si fuera humedad absoluta.'],
  ['Punto de rocío', 'Temperatura a la que el aire comienza a condensar si se enfría a presión constante.', 'Clave para superficies frías, tuberías, difusores y cámaras.', 'Si el rocío es 14 °C, una superficie a 12 °C condensa.', 'No aplicar margen de seguridad.'],
  ['Humedad absoluta', 'Masa de vapor por volumen de aire húmedo.', 'Útil para hablar de cantidad real de agua en el aire.', '10 g/m³ indica más agua que 6 g/m³.', 'Confundirla con razón de humedad g/kg de aire seco.'],
  ['Razón de humedad', 'Masa de vapor por masa de aire seco.', 'Es estable en procesos sensibles sin humidificación ni deshumidificación.', 'Un enfriamiento sensible mantiene casi constante g/kg.', 'Creer que baja solo porque baja la HR.'],
  ['Entalpía', 'Energía total aproximada del aire húmedo por kg de aire seco.', 'Permite comparar carga sensible y latente.', 'Bajar de 60 a 45 kJ/kg indica reducción energética.', 'Usarla para potencia sin conocer caudal de aire.'],
  ['Volumen específico', 'Volumen ocupado por kg de aire seco.', 'Ayuda a convertir masa y volumen de aire.', 'A mayor temperatura suele aumentar el volumen específico.', 'Ignorar presión atmosférica en altitud.'],
  ['Riesgo de condensación', 'Aparece cuando una superficie está por debajo del punto de rocío.', 'Permite revisar aislamientos, puentes térmicos y superficies frías.', 'Rocío 15 °C con superficie 13 °C es riesgo alto.', 'Medir solo aire y no medir superficie real.'],
  ['Altitud', 'La presión atmosférica disminuye al subir.', 'Afecta a las propiedades calculadas del aire.', 'A 1000 m la presión es menor que a nivel del mar.', 'Introducir hPa como Pa.'],
  ['Sensible vs deshumidificación', 'Un proceso sensible cambia temperatura con razón de humedad casi constante.', 'Sirve para interpretar baterías y mezclas de aire.', 'Si baja T y bajan g/kg, hay deshumidificación.', 'Clasificar el proceso sin estabilizar mediciones A/B.'],
] as const

function numberFrom(value: string, label: string) {
  return parseRequiredNumber(value, label)
}

function zodMessage(error: unknown) {
  if (error instanceof ZodError) return error.issues.map((issue) => issue.message).join(' ')
  return error instanceof Error ? error.message : 'No se pudo calcular con esos datos.'
}

function resultRows(state: PsychrometricState) {
  return [
    ['Temperatura seca', `${formatNumber(state.dryBulbC, 1)} °C`],
    ['Humedad relativa', `${formatNumber(state.relativeHumidityPct, 1)} %`],
    ['Bulbo húmedo', `${formatNumber(state.wetBulbC, 1)} °C`],
    ['Punto de rocío', `${formatNumber(state.dewPointC, 1)} °C`],
    ['Razón de humedad', `${formatNumber(state.humidityRatioGKg, 2)} g/kg`],
    ['Humedad absoluta', `${formatNumber(state.absoluteHumidityGM3, 2)} g/m³`],
    ['Entalpía', `${formatNumber(state.moistAirEnthalpyKJkg, 2)} kJ/kg`],
    ['Volumen específico', `${formatNumber(state.moistAirVolumeM3kg, 3)} m³/kg`],
    ['Densidad aire húmedo', `${formatNumber(state.moistAirDensityKgM3, 3)} kg/m³`],
    ['Déficit presión vapor', `${formatNumber(state.vaporPressureDeficitPa / 1000, 2)} kPa`],
  ]
}

function payloadState(record: CalculationHistoryRecord): PsychrometricState | null {
  const payload = record.payload as { result?: unknown } | undefined
  const result = payload?.result as Partial<PsychrometricState> | undefined
  return typeof result?.dryBulbC === 'number' && typeof result.relativeHumidityPct === 'number' ? result as PsychrometricState : null
}

export function PsychrometricsPage() {
  const { atmospherePa, altitudeM } = useSettings()
  const [tab, setTab] = useState<Tab>('estado')
  const [mode, setMode] = useState<Mode>('quick')
  const [pair, setPair] = useState<KnownPair>('relative-humidity')
  const [dryBulb, setDryBulb] = useState('25')
  const [relativeHumidity, setRelativeHumidity] = useState('50')
  const [wetBulb, setWetBulb] = useState('18')
  const [dewPoint, setDewPoint] = useState('13,9')
  const [humidityRatio, setHumidityRatio] = useState('9,9')
  const [vaporPressure, setVaporPressure] = useState('1580')
  const [pressureMode, setPressureMode] = useState<PressureMode>('settings')
  const [customAltitude, setCustomAltitude] = useState(String(Math.round(altitudeM)))
  const [manualPressure, setManualPressure] = useState(String(Math.round(atmospherePa)))
  const [pressureUnit, setPressureUnit] = useState<PsychrometricPressureUnit>('Pa')
  const [calculation, setCalculation] = useState<PsychCalculation | null>(null)
  const [condensation, setCondensation] = useState<CondensationCalculation | null>(null)
  const [comparison, setComparison] = useState<CompareCalculation | null>(null)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<CalculationHistoryRecord[]>([])
  const [surfaceTemp, setSurfaceTemp] = useState('12')
  const [safetyMargin, setSafetyMargin] = useState('2')
  const [aDry, setADry] = useState('30')
  const [aRh, setARh] = useState('50')
  const [aPressure, setAPressure] = useState(String(Math.round(atmospherePa)))
  const [bDry, setBDry] = useState('20')
  const [bRh, setBRh] = useState('50')
  const [bPressure, setBPressure] = useState(String(Math.round(atmospherePa)))
  const [openLearning, setOpenLearning] = useState(0)

  const effectivePressurePa = useMemo(() => {
    try {
      if (pressureMode === 'settings') return atmospherePa
      if (pressureMode === 'altitude') return altitudeToAtmospherePa(parseLocalizedNumber(customAltitude))
      return psychrometricPressureToPa(parseLocalizedNumber(manualPressure), pressureUnit)
    } catch {
      return Number.NaN
    }
  }, [atmospherePa, customAltitude, manualPressure, pressureMode, pressureUnit])

  const pressureWarning = Number.isFinite(effectivePressurePa) ? pressureRangeWarning(effectivePressurePa) : 'Introduce una presión atmosférica válida.'
  const state = calculation?.result ?? null

  const loadHistory = () => {
    void listRecentCalculationHistory(100).then((records) => setHistory(records.filter((record) => psychCalculators.includes(record.calculator)).slice(0, 30)))
  }

  useEffect(loadHistory, [])

  const calculateState = () => {
    try {
      const pressurePa = effectivePressurePa
      if (!Number.isFinite(pressurePa)) throw new Error('Introduce una presión atmosférica válida.')
      const dryBulbC = numberFrom(dryBulb, 'temperatura seca')
      const next = mode === 'quick' || pair === 'relative-humidity'
        ? calculateFromRelativeHumidity({ dryBulbC, relativeHumidityPct: numberFrom(relativeHumidity, 'humedad relativa'), pressurePa })
        : pair === 'wet-bulb'
          ? calculateFromWetBulb({ dryBulbC, wetBulbC: numberFrom(wetBulb, 'bulbo húmedo'), pressurePa })
          : pair === 'dew-point'
            ? calculateFromDewPoint({ dryBulbC, dewPointC: numberFrom(dewPoint, 'punto de rocío'), pressurePa })
            : pair === 'humidity-ratio'
              ? calculateFromHumidityRatio({ dryBulbC, humidityRatioKgKg: numberFrom(humidityRatio, 'razón de humedad') / 1000, pressurePa })
              : calculateFromVaporPressure({ dryBulbC, vaporPressurePa: numberFrom(vaporPressure, 'presión de vapor'), pressurePa })
      setCalculation(next)
      setMessage('')
    } catch (error) {
      setCalculation(null)
      setMessage(zodMessage(error))
    }
  }

  const saveCurrent = async () => {
    if (!calculation) return
    await saveCalculationHistory(calculation)
    setMessage('Estado psicrométrico guardado en historial local.')
    loadHistory()
  }

  const resetState = () => {
    setMode('quick'); setPair('relative-humidity'); setDryBulb('25'); setRelativeHumidity('50'); setWetBulb('18'); setDewPoint('13,9'); setHumidityRatio('9,9'); setVaporPressure('1580'); setCalculation(null); setMessage('')
  }

  const calculateCondensation = () => {
    try {
      const next = calculateCondensationRisk({
        dryBulbC: numberFrom(dryBulb, 'temperatura seca'),
        relativeHumidityPct: numberFrom(relativeHumidity, 'humedad relativa'),
        surfaceTempC: numberFrom(surfaceTemp, 'temperatura de superficie'),
        safetyMarginK: numberFrom(safetyMargin, 'margen de seguridad'),
        pressurePa: effectivePressurePa,
      })
      setCondensation(next)
      setMessage('')
    } catch (error) {
      setCondensation(null)
      setMessage(zodMessage(error))
    }
  }

  const saveCondensation = async () => {
    if (!condensation) return
    await saveCalculationHistory(condensation)
    setMessage('Riesgo de condensación guardado en historial local.')
    loadHistory()
  }

  const copyCurrentTo = (target: 'a' | 'b') => {
    if (!state) return
    const dry = state.dryBulbC.toFixed(1)
    const rh = state.relativeHumidityPct.toFixed(1)
    const pressure = Math.round(state.pressurePa).toString()
    if (target === 'a') { setADry(dry); setARh(rh); setAPressure(pressure) } else { setBDry(dry); setBRh(rh); setBPressure(pressure) }
  }

  const swapComparison = () => {
    const current = { aDry, aRh, aPressure, bDry, bRh, bPressure }
    setADry(current.bDry); setARh(current.bRh); setAPressure(current.bPressure)
    setBDry(current.aDry); setBRh(current.aRh); setBPressure(current.aPressure)
  }

  const calculateComparison = () => {
    try {
      const next = comparePsychrometricStates({
        a: { dryBulbC: numberFrom(aDry, 'temperatura A'), relativeHumidityPct: numberFrom(aRh, 'HR A'), pressurePa: numberFrom(aPressure, 'presión A') },
        b: { dryBulbC: numberFrom(bDry, 'temperatura B'), relativeHumidityPct: numberFrom(bRh, 'HR B'), pressurePa: numberFrom(bPressure, 'presión B') },
      })
      setComparison(next)
      setMessage('')
    } catch (error) {
      setComparison(null)
      setMessage(zodMessage(error))
    }
  }

  const saveComparison = async () => {
    if (!comparison) return
    await saveCalculationHistory(comparison)
    setMessage('Comparación psicrométrica guardada en historial local.')
    loadHistory()
  }

  const recover = (record: CalculationHistoryRecord) => {
    const recovered = payloadState(record)
    if (!recovered) return
    setDryBulb(recovered.dryBulbC.toFixed(1))
    setRelativeHumidity(recovered.relativeHumidityPct.toFixed(1))
    setManualPressure(Math.round(recovered.pressurePa).toString())
    setPressureMode('manual')
    setTab('estado')
  }

  const removeRecord = async (id: string) => {
    await deleteCalculationHistory(id)
    loadHistory()
  }

  const clearPsychHistory = async () => {
    if (!confirm('¿Borrar solo el historial psicrométrico?')) return
    await clearCalculationHistoryByCalculators(psychCalculators)
    loadHistory()
  }

  return <main className="sz-screen sz-pt-screen psychro-screen">
    <PageTitle eyebrow="Climatización" title="Psicrometría profesional" description="Estado de aire húmedo, condensación, comparación de procesos y aprendizaje técnico." />
    <div className="sz-mode-switch psychro-tabs" aria-label="Pestañas de psicrometría">{(['estado', 'condensacion', 'comparar', 'aprender', 'historial'] as const).map((value) => <button key={value} type="button" className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value === 'aprender' ? <BookOpen /> : null}{value === 'condensacion' ? 'Condensación' : value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div>

    {tab === 'estado' && <><section className="sz-panel sz-form">
      <div className="segmented two-segment"><button type="button" className={mode === 'quick' ? 'active' : ''} onClick={() => setMode('quick')}>Modo rápido</button><button type="button" className={mode === 'advanced' ? 'active' : ''} onClick={() => setMode('advanced')}>Modo avanzado</button></div>
      {mode === 'advanced' && <label>Combinación conocida<select value={pair} onChange={(event) => setPair(event.target.value as KnownPair)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      <div className="sz-two-columns">
        <div className="sz-field-with-help"><label>Temperatura seca °C<input inputMode="decimal" value={dryBulb} onChange={(event) => setDryBulb(event.target.value)} /></label><VisualHelpButton scope={{ ...scope, field: 'dryBulbC' }} /></div>
        {(mode === 'quick' || pair === 'relative-humidity') && <div className="sz-field-with-help"><label>Humedad relativa %<input inputMode="decimal" value={relativeHumidity} onChange={(event) => setRelativeHumidity(event.target.value)} /></label><VisualHelpButton scope={{ ...scope, field: 'relativeHumidityPct' }} /></div>}
        {mode === 'advanced' && pair === 'wet-bulb' && <label>Bulbo húmedo °C<input inputMode="decimal" value={wetBulb} onChange={(event) => setWetBulb(event.target.value)} /></label>}
        {mode === 'advanced' && pair === 'dew-point' && <label>Punto de rocío °C<input inputMode="decimal" value={dewPoint} onChange={(event) => setDewPoint(event.target.value)} /></label>}
        {mode === 'advanced' && pair === 'humidity-ratio' && <label>Razón de humedad g/kg<input inputMode="decimal" value={humidityRatio} onChange={(event) => setHumidityRatio(event.target.value)} /></label>}
        {mode === 'advanced' && pair === 'vapor-pressure' && <label>Presión de vapor Pa<input inputMode="decimal" value={vaporPressure} onChange={(event) => setVaporPressure(event.target.value)} /></label>}
      </div>
      <AtmosphereBlock pressureMode={pressureMode} setPressureMode={setPressureMode} customAltitude={customAltitude} setCustomAltitude={setCustomAltitude} manualPressure={manualPressure} setManualPressure={setManualPressure} pressureUnit={pressureUnit} setPressureUnit={setPressureUnit} pressurePa={effectivePressurePa} pressureWarning={pressureWarning} />
      <div className="sz-button-row"><button className="sz-button primary" type="button" onClick={calculateState}>Calcular</button><button className="sz-button secondary" type="button" onClick={resetState}><RotateCcw />Restablecer</button><button className="sz-button secondary" type="button" disabled={!calculation} onClick={saveCurrent}><Save />Guardar</button></div>
    </section><StateResult calculation={calculation} /></>}

    {tab === 'condensacion' && <><section className="sz-panel sz-form">
      <div className="sz-two-columns"><label>Temperatura seca °C<input inputMode="decimal" value={dryBulb} onChange={(event) => setDryBulb(event.target.value)} /></label><label>Humedad relativa %<input inputMode="decimal" value={relativeHumidity} onChange={(event) => setRelativeHumidity(event.target.value)} /></label><label>Superficie °C<input inputMode="decimal" value={surfaceTemp} onChange={(event) => setSurfaceTemp(event.target.value)} /></label><label>Margen seguridad K<input inputMode="decimal" value={safetyMargin} onChange={(event) => setSafetyMargin(event.target.value)} /></label></div>
      <AtmosphereBlock pressureMode={pressureMode} setPressureMode={setPressureMode} customAltitude={customAltitude} setCustomAltitude={setCustomAltitude} manualPressure={manualPressure} setManualPressure={setManualPressure} pressureUnit={pressureUnit} setPressureUnit={setPressureUnit} pressurePa={effectivePressurePa} pressureWarning={pressureWarning} />
      <div className="sz-button-row"><button className="sz-button primary" type="button" onClick={calculateCondensation}>Evaluar</button><button className="sz-button secondary" type="button" disabled={!condensation} onClick={saveCondensation}><Save />Guardar</button></div>
    </section><CondensationResult calculation={condensation} /></>}

    {tab === 'comparar' && <><section className="sz-panel sz-form"><div className="sz-two-columns">
      <StateMini title="Estado A" dry={aDry} setDry={setADry} rh={aRh} setRh={setARh} pressure={aPressure} setPressure={setAPressure} />
      <StateMini title="Estado B" dry={bDry} setDry={setBDry} rh={bRh} setRh={setBRh} pressure={bPressure} setPressure={setBPressure} />
    </div><div className="sz-button-row"><button className="sz-button secondary" type="button" disabled={!state} onClick={() => copyCurrentTo('a')}><Copy />Actual a A</button><button className="sz-button secondary" type="button" disabled={!state} onClick={() => copyCurrentTo('b')}><Copy />Actual a B</button><button className="sz-button secondary" type="button" onClick={swapComparison}><ArrowDownUp />Intercambiar</button><button className="sz-button primary" type="button" onClick={calculateComparison}>Comparar</button><button className="sz-button secondary" type="button" disabled={!comparison} onClick={saveComparison}><Save />Guardar</button></div></section><ComparisonResult calculation={comparison} /></>}

    {tab === 'aprender' && <section className="sz-panel psychro-learning">{learning.map(([title, definition, use, example, error], index) => <div className="psychro-accordion" key={title}><button type="button" aria-expanded={openLearning === index} onClick={() => setOpenLearning(openLearning === index ? -1 : index)}><strong>{title}</strong><span>{openLearning === index ? 'Cerrar' : 'Abrir'}</span></button>{openLearning === index && <div><p><strong>Definición:</strong> {definition}</p><p><strong>Uso práctico:</strong> {use}</p><p><strong>Ejemplo:</strong> {example}</p><p><strong>Error frecuente:</strong> {error}</p></div>}</div>)}</section>}

    {tab === 'historial' && <section className="sz-panel"><div className="psychro-history-head"><h2>Historial psicrométrico</h2><button className="sz-button danger" type="button" onClick={clearPsychHistory}><Trash2 />Borrar historial psicrométrico</button></div>{history.length ? <div className="psychro-history-list">{history.map((record) => <HistoryCard key={record.id} record={record} onRecover={() => recover(record)} onDuplicate={() => recover(record)} onDelete={() => void removeRecord(record.id)} />)}</div> : <p>No hay cálculos psicrométricos guardados todavía.</p>}</section>}

    {tab === 'estado' && <TechnicalImageGallery {...scope} />}
    {message && <Notice tone={message.includes('guardado') ? 'success' : 'danger'}><p>{message}</p></Notice>}
    <Notice tone="warning"><p>Cálculos aproximados con PsychroLib. Para diseño, puesta en marcha o informe final prevalecen normativa, proyecto, fabricante e instrumentos calibrados.</p></Notice>
  </main>
}

function AtmosphereBlock(props: { pressureMode: PressureMode; setPressureMode: (mode: PressureMode) => void; customAltitude: string; setCustomAltitude: (value: string) => void; manualPressure: string; setManualPressure: (value: string) => void; pressureUnit: PsychrometricPressureUnit; setPressureUnit: (unit: PsychrometricPressureUnit) => void; pressurePa: number; pressureWarning: string | null }) {
  return <div className="psychro-atmosphere"><div className="segmented three-segment"><button type="button" className={props.pressureMode === 'settings' ? 'active' : ''} onClick={() => props.setPressureMode('settings')}>Ajustes</button><button type="button" className={props.pressureMode === 'altitude' ? 'active' : ''} onClick={() => props.setPressureMode('altitude')}>Altitud</button><button type="button" className={props.pressureMode === 'manual' ? 'active' : ''} onClick={() => props.setPressureMode('manual')}>Manual</button></div>{props.pressureMode === 'altitude' && <label>Altitud m<input inputMode="decimal" value={props.customAltitude} onChange={(event) => props.setCustomAltitude(event.target.value)} /></label>}{props.pressureMode === 'manual' && <div className="sz-two-columns"><label>Presión<input inputMode="decimal" value={props.manualPressure} onChange={(event) => props.setManualPressure(event.target.value)} /></label><label>Unidad<select value={props.pressureUnit} onChange={(event) => props.setPressureUnit(event.target.value as PsychrometricPressureUnit)}><option>Pa</option><option>hPa</option><option>mbar</option><option>kPa</option><option value="bar_abs">bar abs</option></select></label></div>}<div className="sz-data-list compact"><p><span>Presión usada</span><strong>{Number.isFinite(props.pressurePa) ? `${formatNumber(props.pressurePa, 0)} Pa · ${formatNumber(props.pressurePa / 1000, 2)} kPa` : 'No válida'}</strong></p></div>{props.pressureWarning && <p className="psychro-warning">{props.pressureWarning}</p>}</div>
}

function StateResult({ calculation }: { calculation: PsychCalculation | null }) {
  if (!calculation) return <section className="sz-result"><small>Resultado principal</small><strong>--</strong><span>Calcula un estado para ver punto de rocío, humedad y entalpía.</span></section>
  const state = calculation.result
  return <section className="sz-result psychro-result"><small>{calculation.interpretation.title}</small><strong>{formatNumber(state.dewPointC, 1)} °C</strong><span>Punto de rocío · {formatNumber(state.absoluteHumidityGM3, 2)} g/m³ · {formatNumber(state.moistAirEnthalpyKJkg, 1)} kJ/kg</span><p>{calculation.interpretation.summary}</p><div className="sz-data-list">{resultRows(state).map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div><h3>Interpretación</h3><ul className="sz-check-list">{calculation.interpretation.causes.map((item) => <li key={item}>{item}</li>)}</ul>{calculation.warnings.length > 0 && <Notice tone="warning"><p>{calculation.warnings.map((warning) => warning.message).join(' ')}</p></Notice>}</section>
}

function CondensationResult({ calculation }: { calculation: CondensationCalculation | null }) {
  if (!calculation) return <section className="sz-result"><small>Condensación</small><strong>--</strong><span>Evalúa una superficie frente al punto de rocío.</span></section>
  const result = calculation.result
  return <section className={`sz-result psychro-condensation is-${result.risk}`}><small>{result.title}</small><strong>{formatNumber(result.surfaceMarginK, 1)} K</strong><span>Margen superficie-rocío</span><p>{result.summary}</p><div className="sz-data-list"><p><span>Punto de rocío</span><strong>{formatNumber(result.state.dewPointC, 1)} °C</strong></p><p><span>Superficie medida</span><strong>{formatNumber(result.surfaceTempC, 1)} °C</strong></p><p><span>Superficie segura orientativa</span><strong>{formatNumber(result.safeSurfaceTempC, 1)} °C</strong></p></div><ul className="sz-check-list">{result.recommendedChecks.map((item) => <li key={item}>{item}</li>)}</ul></section>
}

function StateMini({ title, dry, setDry, rh, setRh, pressure, setPressure }: { title: string; dry: string; setDry: (value: string) => void; rh: string; setRh: (value: string) => void; pressure: string; setPressure: (value: string) => void }) {
  return <div className="psychro-state-mini"><h3>{title}</h3><label>Temperatura seca °C<input inputMode="decimal" value={dry} onChange={(event) => setDry(event.target.value)} /></label><label>Humedad relativa %<input inputMode="decimal" value={rh} onChange={(event) => setRh(event.target.value)} /></label><label>Presión Pa<input inputMode="decimal" value={pressure} onChange={(event) => setPressure(event.target.value)} /></label></div>
}

function ComparisonResult({ calculation }: { calculation: CompareCalculation | null }) {
  if (!calculation) return <section className="sz-result"><small>Comparación</small><strong>--</strong><span>Compara dos estados A/B.</span></section>
  const deltas = calculation.result.deltas
  return <section className="sz-result"><small>{calculation.result.processLabel}</small><strong>{formatNumber(deltas.moistAirEnthalpyKJkg, 1)} kJ/kg</strong><span>Diferencia de entalpía B - A</span><p>{calculation.result.summary}</p><div className="sz-data-list">{[['Δ temperatura', `${formatNumber(deltas.dryBulbC, 1)} K`], ['Δ HR', `${formatNumber(deltas.relativeHumidityPct, 1)} %`], ['Δ punto rocío', `${formatNumber(deltas.dewPointC, 1)} K`], ['Δ razón humedad', `${formatNumber(deltas.humidityRatioGKg, 2)} g/kg`], ['Δ humedad absoluta', `${formatNumber(deltas.absoluteHumidityGM3, 2)} g/m³`], ['Δ volumen específico', `${formatNumber(deltas.moistAirVolumeM3kg, 3)} m³/kg`]].map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div></section>
}

function HistoryCard({ record, onRecover, onDuplicate, onDelete }: { record: CalculationHistoryRecord; onRecover: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const state = payloadState(record)
  const payload = record.payload as { result?: { processLabel?: string; risk?: string; source?: unknown } } | undefined
  return <article className="psychro-history-card"><div><small>{new Date(record.createdAt).toLocaleString('es-ES')} · {record.calculator}</small><h3>{state ? `${formatNumber(state.dryBulbC, 1)} °C · ${formatNumber(state.relativeHumidityPct, 1)} % HR` : payload?.result?.processLabel ?? payload?.result?.risk ?? 'Cálculo psicrométrico'}</h3></div>{state && <div className="sz-data-list compact"><p><span>Rocío</span><strong>{formatNumber(state.dewPointC, 1)} °C</strong></p><p><span>g/kg</span><strong>{formatNumber(state.humidityRatioGKg, 2)}</strong></p><p><span>Entalpía</span><strong>{formatNumber(state.moistAirEnthalpyKJkg, 1)} kJ/kg</strong></p><p><span>Presión</span><strong>{formatNumber(state.pressurePa, 0)} Pa</strong></p></div>}<div className="sz-button-row"><button className="sz-button secondary" type="button" disabled={!state} onClick={onRecover}>Abrir</button><button className="sz-button secondary" type="button" disabled={!state} onClick={onDuplicate}>Duplicar</button><button className="sz-button danger" type="button" onClick={onDelete}><Trash2 />Eliminar</button></div></article>
}
