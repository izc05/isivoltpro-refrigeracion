import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { BookOpen, GitBranch, ListPlus, RotateCcw, Save } from 'lucide-react'
import { calculateDuctSizing, type DuctAlternative, type DuctSizingResult } from '../calculation-engine/formulas/ducts'
import { listRecentCalculationHistory, saveCalculationHistory } from '../calculation-engine/history'
import type { CalculationEnvelope } from '../calculation-engine/types'
import type { CalculationHistoryRecord } from '../domain/storage/db'
import { TechnicalImageGallery, VisualHelpButton } from '../visual/visual-components'
import { Notice, PageTitle, formatNumber, parseRequiredNumber } from './shared'

type Tab = 'dimensionar' | 'perdidas' | 'accesorios' | 'red' | 'aprender' | 'historial'
type DuctCalculation = CalculationEnvelope<unknown, DuctSizingResult>
const scope = { module: 'ducts', calculator: 'duct-sizing' }

function row(label: string, value: string) {
  return <p><span>{label}</span><strong>{value}</strong></p>
}

function selectOptions<T extends string>(items: Array<[T, string]>) {
  return items.map(([value, label]) => <option key={value} value={value}>{label}</option>)
}

function payloadResult(record: CalculationHistoryRecord) {
  const payload = record.payload as { result?: DuctSizingResult } | undefined
  return payload?.result
}

export function DuctsPage() {
  const [tab, setTab] = useState<Tab>('dimensionar')
  const [airflow, setAirflow] = useState('1000')
  const [airflowUnit, setAirflowUnit] = useState<'m3/h' | 'L/s' | 'CFM'>('m3/h')
  const [method, setMethod] = useState<'velocity' | 'friction'>('velocity')
  const [shape, setShape] = useState<'rectangular' | 'circular'>('rectangular')
  const [networkType, setNetworkType] = useState('main-supply')
  const [material, setMaterial] = useState('galvanized-steel')
  const [velocity, setVelocity] = useState('5')
  const [pressureTarget, setPressureTarget] = useState('0,8')
  const [aspectRatio, setAspectRatio] = useState('2')
  const [lengthM, setLengthM] = useState('10')
  const [temperature, setTemperature] = useState('20')
  const [altitude, setAltitude] = useState('0')
  const [customRoughness, setCustomRoughness] = useState('0,15')
  const [calculation, setCalculation] = useState<DuctCalculation | null>(null)
  const [history, setHistory] = useState<CalculationHistoryRecord[]>([])
  const [message, setMessage] = useState('')

  const loadHistory = () => { void listRecentCalculationHistory(20, 'duct-sizing').then(setHistory) }
  useEffect(loadHistory, [])

  const calculate = () => {
    try {
      const next = calculateDuctSizing({
        airflowM3h: parseRequiredNumber(airflow, 'caudal'),
        airflowUnit,
        method,
        shape,
        networkType: networkType as never,
        material: material as never,
        maxVelocityMs: parseRequiredNumber(velocity, 'velocidad'),
        targetPressureLossPaM: parseRequiredNumber(pressureTarget, 'pérdida objetivo'),
        preferredAspectRatio: parseRequiredNumber(aspectRatio, 'relación de aspecto'),
        lengthM: parseRequiredNumber(lengthM, 'longitud'),
        temperatureC: parseRequiredNumber(temperature, 'temperatura'),
        altitudeM: parseRequiredNumber(altitude, 'altitud'),
        customRoughnessMm: material === 'custom' ? parseRequiredNumber(customRoughness, 'rugosidad') : undefined,
      })
      setCalculation(next)
      setMessage('')
      setTab('dimensionar')
    } catch (error) {
      setCalculation(null)
      setMessage(error instanceof Error ? error.message : 'No se pudo dimensionar el conducto.')
    }
  }

  const reset = () => {
    setAirflow('1000'); setAirflowUnit('m3/h'); setMethod('velocity'); setShape('rectangular'); setNetworkType('main-supply'); setMaterial('galvanized-steel')
    setVelocity('5'); setPressureTarget('0,8'); setAspectRatio('2'); setLengthM('10'); setTemperature('20'); setAltitude('0'); setCustomRoughness('0,15')
    setCalculation(null); setMessage('')
  }

  const save = async () => {
    if (!calculation) return
    await saveCalculationHistory(calculation)
    loadHistory()
    setMessage('Cálculo guardado en historial local.')
  }

  const resultRows = useMemo(() => calculation ? [
    row('Tipo de red', calculation.result.networkTypeLabel),
    row('Caudal', `${formatNumber(calculation.result.airflowM3h, 0)} m³/h · ${formatNumber(calculation.result.airflowLs, 0)} L/s · ${formatNumber(calculation.result.airflowCfm, 0)} CFM`),
    row('Material', `${calculation.result.materialLabel} · rugosidad ${formatNumber(calculation.result.roughnessMm, 2)} mm`),
    row('Conducto rectangular', `${formatNumber(calculation.result.rectangularWidthMm, 0)} x ${formatNumber(calculation.result.rectangularHeightMm, 0)} mm`),
    row('Ø por área', `${formatNumber(calculation.result.areaEquivalentDiameterMm, 0)} mm`),
    row('Diámetro hidráulico', `${formatNumber(calculation.result.hydraulicDiameterMm, 0)} mm`),
    row('Ø equivalente por fricción', `${formatNumber(calculation.result.frictionEquivalentCircularDiameterMm, 0)} mm`),
    row('Velocidad real', `${formatNumber(calculation.result.actualVelocityMs, 2)} m/s`),
    row('Pérdida lineal', `${formatNumber(calculation.result.pressureLossPaM, 2)} Pa/m`),
    row('Pérdida tramo', `${formatNumber(calculation.result.totalLinearLossPa, 1)} Pa · ${formatNumber(calculation.result.totalLinearLossMmca, 2)} mmca`),
  ] : [], [calculation])

  return <main className="sz-screen sz-pt-screen">
    <PageTitle eyebrow="Conductos" title="Dimensionado de conductos" description="Predimensiona por velocidad o pérdida lineal con material, rugosidad, tramo y alternativas comerciales." />
    <div className="sz-mode-switch" aria-label="Pestañas de conductos">{(['dimensionar', 'perdidas', 'accesorios', 'red', 'aprender', 'historial'] as const).map((value) => <button key={value} type="button" className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value === 'aprender' ? <BookOpen /> : value === 'accesorios' ? <ListPlus /> : value === 'red' ? <GitBranch /> : null}{value === 'perdidas' ? 'Pérdidas' : value === 'dimensionar' ? 'Dimensionar' : value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div>

    {tab === 'dimensionar' && <>
      <section className="sz-panel sz-form">
        <div className="sz-two-columns">
          <label>Método<select value={method} onChange={(event) => setMethod(event.target.value as 'velocity' | 'friction')}>{selectOptions([['velocity', 'Por velocidad'], ['friction', 'Por pérdida Pa/m']])}</select></label>
          <label>Tipo de red<select value={networkType} onChange={(event) => setNetworkType(event.target.value)}>{selectOptions([['main-supply', 'Principal impulsión'], ['branch-supply', 'Ramal impulsión'], ['return', 'Retorno'], ['exhaust', 'Extracción'], ['toilet-extract', 'Aseos'], ['kitchen-hood', 'Campana'], ['flexible-run', 'Tramo flexible'], ['quiet-zone', 'Zona sensible ruido']])}</select></label>
        </div>
        <div className="sz-two-columns">
          <div className="sz-field-with-help"><label>Caudal<input inputMode="decimal" value={airflow} onChange={(event) => setAirflow(event.target.value)} /></label><VisualHelpButton scope={{ ...scope, field: 'airflowM3h' }} /></div>
          <label>Unidad<select value={airflowUnit} onChange={(event) => setAirflowUnit(event.target.value as 'm3/h' | 'L/s' | 'CFM')}>{selectOptions([['m3/h', 'm³/h'], ['L/s', 'L/s'], ['CFM', 'CFM']])}</select></label>
        </div>
        <div className="sz-two-columns">
          <label>Forma<select value={shape} onChange={(event) => setShape(event.target.value as 'rectangular' | 'circular')}>{selectOptions([['rectangular', 'Rectangular'], ['circular', 'Circular']])}</select></label>
          <label>Relación ancho/alto<select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>{selectOptions([['1', '1:1'], ['1,5', '1,5:1'], ['2', '2:1'], ['3', '3:1'], ['4', '4:1'], ['5', '5:1'], ['6', 'Personalizada 6:1']])}</select></label>
        </div>
        <div className="sz-two-columns">
          <div className="sz-field-with-help"><label>Velocidad objetivo m/s<input inputMode="decimal" value={velocity} onChange={(event) => setVelocity(event.target.value)} /></label><VisualHelpButton scope={{ ...scope, field: 'maxVelocityMs' }} /></div>
          <label>Pérdida objetivo Pa/m<input inputMode="decimal" value={pressureTarget} onChange={(event) => setPressureTarget(event.target.value)} /></label>
        </div>
        <div className="sz-two-columns">
          <label>Material<select value={material} onChange={(event) => setMaterial(event.target.value)}>{selectOptions([['galvanized-steel', 'Chapa galvanizada'], ['stainless-steel', 'Acero inoxidable'], ['aluminum', 'Aluminio'], ['pvc', 'PVC'], ['smooth-flex', 'Flexible liso'], ['corrugated-flex', 'Flexible corrugado'], ['duct-board', 'Fibra / panel'], ['custom', 'Personalizado']])}</select></label>
          <label>Longitud tramo m<input inputMode="decimal" value={lengthM} onChange={(event) => setLengthM(event.target.value)} /></label>
        </div>
        {material === 'custom' && <label>Rugosidad personalizada mm<input inputMode="decimal" value={customRoughness} onChange={(event) => setCustomRoughness(event.target.value)} /></label>}
        <div className="sz-two-columns">
          <label>Temperatura aire °C<input inputMode="decimal" value={temperature} onChange={(event) => setTemperature(event.target.value)} /></label>
          <label>Altitud m<input inputMode="decimal" value={altitude} onChange={(event) => setAltitude(event.target.value)} /></label>
        </div>
        <div className="sz-button-row"><button className="sz-button primary" type="button" onClick={calculate}>Calcular</button><button className="sz-button secondary" type="button" onClick={reset}><RotateCcw />Restablecer</button></div>
      </section>
      <DuctResult calculation={calculation} rows={resultRows} onSave={save} onExplain={() => setTab('perdidas')} />
    </>}

    {tab === 'perdidas' && <section className="sz-panel"><h2>Pérdidas lineales</h2>{calculation ? <><div className="sz-data-list">{[
      row('Reynolds', formatNumber(calculation.result.reynolds, 0)),
      row('Factor de fricción', formatNumber(calculation.result.frictionFactor, 4)),
      row('Rugosidad relativa', formatNumber(calculation.result.relativeRoughness, 5)),
      row('Densidad aire', `${formatNumber(calculation.result.airDensityKgM3, 3)} kg/m³`),
      row('Viscosidad dinámica', `${formatNumber(calculation.result.airDynamicViscosityPas, 7)} Pa·s`),
      row('Pérdida lineal', `${formatNumber(calculation.result.pressureLossPaM, 2)} Pa/m`),
      row('Pérdida del tramo', `${formatNumber(calculation.result.totalLinearLossPa, 1)} Pa`),
    ]}</div><p className="sz-source">Pérdida lineal aproximada con Darcy-Weisbach. No incluye accesorios ni pérdidas singulares.</p></> : <p>Calcula primero un tramo en Dimensionar.</p>}</section>}

    {tab === 'accesorios' && <section className="sz-panel"><h2>Accesorios</h2><p>Preparado para la siguiente fase: codos, tes, reducciones, compuertas, rejillas, difusores, filtros, baterías y silenciadores mediante coeficientes K o longitud equivalente.</p><div className="sz-data-list">{[
      row('Fórmula prevista', 'Δp = K · ρv²/2'),
      row('Estado actual', 'Pérdida lineal del tramo'),
      row('Siguiente mejora', 'Listado editable y suma automática'),
    ]}</div></section>}

    {tab === 'red' && <section className="sz-panel"><h2>Red de conductos</h2><p>Preparado para fase avanzada: tramos, derivaciones, caudal restante, camino crítico y presión total requerida.</p>{calculation && <div className="sz-table-wrap"><table><thead><tr><th>Tramo</th><th>Caudal</th><th>Medida</th><th>Vel.</th><th>Pa/m</th><th>Total</th></tr></thead><tbody><tr><td>T01</td><td>{formatNumber(calculation.result.airflowM3h, 0)} m³/h</td><td>{formatNumber(calculation.result.rectangularWidthMm, 0)}x{formatNumber(calculation.result.rectangularHeightMm, 0)}</td><td>{formatNumber(calculation.result.actualVelocityMs, 2)}</td><td>{formatNumber(calculation.result.pressureLossPaM, 2)}</td><td>{formatNumber(calculation.result.totalLinearLossPa, 1)} Pa</td></tr></tbody></table></div>}</section>}

    {tab === 'aprender' && <section className="sz-panel"><h2>Aprender</h2><ul className="sz-check-list"><li>El diámetro por área no equivale siempre al diámetro por pérdida de carga.</li><li>El diámetro hidráulico representa mejor el flujo en conductos rectangulares.</li><li>La rugosidad del material puede aumentar mucho la pérdida, especialmente en conducto flexible corrugado.</li><li>Una relación ancho/alto elevada puede aumentar superficie, ruido y dificultad de montaje.</li><li>Los accesorios deben sumarse como pérdidas singulares antes de seleccionar el ventilador.</li></ul><TechnicalImageGallery {...scope} /></section>}

    {tab === 'historial' && <section className="sz-panel"><h2>Historial reciente</h2>{history.length ? <div className="sz-data-list">{history.map((item) => {
      const result = payloadResult(item)
      return row(new Date(item.createdAt).toLocaleString('es-ES'), result ? `${formatNumber(result.airflowM3h, 0)} m³/h · ${formatNumber(result.rectangularWidthMm, 0)}x${formatNumber(result.rectangularHeightMm, 0)} · ${formatNumber(result.pressureLossPaM, 2)} Pa/m` : item.sourceProvider)
    })}</div> : <p>No hay cálculos guardados todavía.</p>}</section>}

    {message && <Notice tone={message.startsWith('No') ? 'danger' : 'success'}><p>{message}</p></Notice>}
    <Notice tone="warning"><p>Resultado orientativo. No sustituye cálculo de accesorios, equilibrado, acústica, estanqueidad, normativa ni proyecto.</p></Notice>
  </main>
}

function DuctResult({ calculation, rows, onSave, onExplain }: { calculation: DuctCalculation | null; rows: ReactElement[]; onSave: () => void; onExplain: () => void }) {
  if (!calculation) return <section className="sz-result"><small>Conducto recomendado</small><strong>—</strong><span>Introduce datos para comparar dimensiones.</span></section>
  const result = calculation.result
  return <section className="sz-result"><small>Conducto recomendado</small><strong>{formatNumber(result.rectangularWidthMm, 0)} x {formatNumber(result.rectangularHeightMm, 0)} mm</strong><span>Ø {formatNumber(result.frictionEquivalentCircularDiameterMm, 0)} mm · {formatNumber(result.actualVelocityMs, 2)} m/s · {formatNumber(result.pressureLossPaM, 2)} Pa/m</span>{result.aspectRatioWarning && <Notice tone="warning"><p>{result.aspectRatioWarning}</p></Notice>}<div className="sz-data-list">{rows}</div><h3>Alternativas comerciales</h3><div className="sz-compare-cards">{result.alternatives.map((alternative) => <AlternativeCard alternative={alternative} key={alternative.id} />)}</div><div className="sz-button-row"><button className="sz-button secondary" type="button" disabled={!calculation} onClick={onSave}><Save />Guardar historial</button><button className="sz-button ghost" type="button" onClick={onExplain}>Ver pérdidas</button></div></section>
}

function AlternativeCard({ alternative }: { alternative: DuctAlternative }) {
  const title = alternative.shape === 'circular' ? `Ø${formatNumber(alternative.diameterMm ?? 0, 0)} mm` : `${formatNumber(alternative.widthMm ?? 0, 0)} x ${formatNumber(alternative.heightMm ?? 0, 0)} mm`
  return <article className={`sz-panel is-${alternative.status}`}><h2>{alternative.label}</h2><strong>{title}</strong><div className="sz-data-list compact">{[
    row('Velocidad', `${formatNumber(alternative.velocityMs, 2)} m/s`),
    row('Pérdida', `${formatNumber(alternative.pressureLossPaM, 2)} Pa/m`),
    row('Total tramo', `${formatNumber(alternative.totalLinearLossPa, 1)} Pa`),
  ]}</div><p>{alternative.note}</p></article>
}
