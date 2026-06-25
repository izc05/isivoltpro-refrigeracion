import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ImagePlus, RotateCcw, Save } from 'lucide-react'
import { calculateDuctSizing, type DuctSizingResult } from '../calculation-engine/formulas/ducts'
import { listRecentCalculationHistory, saveCalculationHistory } from '../calculation-engine/history'
import type { CalculationEnvelope } from '../calculation-engine/types'
import type { CalculationHistoryRecord } from '../domain/storage/db'
import { TechnicalImageGallery, VisualHelpButton } from '../visual/visual-components'
import { Notice, PageTitle, formatNumber, parseRequiredNumber } from './shared'

type Tab = 'calcular' | 'explicacion' | 'imagenes' | 'ejemplo' | 'errores'
const scope = { module: 'ducts', calculator: 'duct-sizing' }

function row(label: string, value: string) {
  return <p><span>{label}</span><strong>{value}</strong></p>
}

export function DuctsPage() {
  const [tab, setTab] = useState<Tab>('calcular')
  const [airflow, setAirflow] = useState('1000')
  const [velocity, setVelocity] = useState('5')
  const [aspectRatio, setAspectRatio] = useState('2')
  const [calculation, setCalculation] = useState<CalculationEnvelope<{ airflowM3h: number; maxVelocityMs: number; preferredAspectRatio: number }, DuctSizingResult> | null>(null)
  const [history, setHistory] = useState<CalculationHistoryRecord[]>([])
  const [message, setMessage] = useState('')

  const loadHistory = () => { void listRecentCalculationHistory(8, 'duct-sizing').then(setHistory) }
  useEffect(loadHistory, [])

  const calculate = () => {
    try {
      const next = calculateDuctSizing({ airflowM3h: parseRequiredNumber(airflow, 'caudal'), maxVelocityMs: parseRequiredNumber(velocity, 'velocidad'), preferredAspectRatio: parseRequiredNumber(aspectRatio, 'relación de aspecto') })
      setCalculation(next); setMessage(''); setTab('calcular')
    } catch (error) {
      setCalculation(null); setMessage(error instanceof Error ? error.message : 'No se pudo dimensionar el conducto.')
    }
  }

  const reset = () => { setAirflow('1000'); setVelocity('5'); setAspectRatio('2'); setCalculation(null); setMessage('') }
  const save = async () => { if (!calculation) return; await saveCalculationHistory(calculation); loadHistory(); setMessage('Cálculo guardado en historial local.') }

  const resultRows = useMemo(() => calculation ? [
    row('Caudal', `${formatNumber(calculation.inputs.airflowM3h, 0)} m³/h · ${formatNumber(calculation.result.airflowM3s, 3)} m³/s`),
    row('Sección mínima', `${formatNumber(calculation.result.areaM2, 4)} m² · ${formatNumber(calculation.result.areaCm2, 0)} cm²`),
    row('Diámetro circular', `${formatNumber(calculation.result.circularDiameterMm, 0)} mm`),
    row('Rectangular sugerido', `${formatNumber(calculation.result.rectangularWidthMm, 0)} x ${formatNumber(calculation.result.rectangularHeightMm, 0)} mm`),
    row('Velocidad rectangular real', `${formatNumber(calculation.result.actualVelocityMs, 2)} m/s`),
  ] : [], [calculation])

  return <main className="sz-screen sz-pt-screen">
    <PageTitle eyebrow="Conductos" title="Dimensionado de conductos" description="Calcula sección mínima desde caudal y velocidad máxima. Resultado orientativo para fase inicial." />
    <div className="sz-mode-switch" aria-label="Pestañas de conductos">{(['calcular', 'explicacion', 'imagenes', 'ejemplo', 'errores'] as const).map((value) => <button key={value} type="button" className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value === 'imagenes' ? <ImagePlus /> : value === 'ejemplo' ? <BookOpen /> : null}{value === 'explicacion' ? 'Explicación' : value === 'errores' ? 'Errores frecuentes' : value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div>

    {tab === 'calcular' && <>
      <section className="sz-panel sz-form">
        <div className="sz-field-with-help"><label>Caudal m³/h<input inputMode="decimal" value={airflow} onChange={(event) => setAirflow(event.target.value)} /></label><VisualHelpButton scope={{ ...scope, field: 'airflowM3h' }} /></div>
        <div className="sz-two-columns"><div className="sz-field-with-help"><label>Velocidad máxima m/s<input inputMode="decimal" value={velocity} onChange={(event) => setVelocity(event.target.value)} /></label><VisualHelpButton scope={{ ...scope, field: 'maxVelocityMs' }} /></div><label>Relación ancho/alto<input inputMode="decimal" value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} /></label></div>
        <div className="sz-button-row"><button className="sz-button primary" type="button" onClick={calculate}>Calcular</button><button className="sz-button secondary" type="button" onClick={reset}><RotateCcw />Restablecer</button></div>
      </section>
      <section className="sz-result"><small>Sección mínima</small><strong>{calculation ? `${formatNumber(calculation.result.areaCm2, 0)} cm²` : '—'}</strong>{calculation && <div className="sz-data-list">{resultRows}</div>}<div className="sz-button-row"><button className="sz-button secondary" type="button" disabled={!calculation} onClick={save}><Save />Guardar historial</button><button className="sz-button ghost" type="button" disabled={!calculation} onClick={() => setTab('explicacion')}>Interpretar</button></div></section>
    </>}

    {tab === 'explicacion' && <section className="sz-panel"><h2>{calculation?.interpretation.title ?? 'Calcula primero'}</h2><p>{calculation?.interpretation.summary ?? 'Introduce caudal y velocidad máxima en la pestaña Calcular.'}</p>{calculation && <><div className="sz-data-list compact">{calculation.interpretation.causes.map((item) => row(item, 'orientativo'))}</div><h3>Comprobaciones</h3><ul className="sz-check-list">{calculation.interpretation.nextChecks.map((item) => <li key={item}>{item}</li>)}</ul></>}</section>}
    {tab === 'imagenes' && <TechnicalImageGallery {...scope} />}
    {tab === 'ejemplo' && <section className="sz-panel"><h2>Ejemplo resuelto</h2><p>Para 1.000 m³/h y 5 m/s, la sección mínima es aproximadamente 556 cm² y el diámetro circular equivalente ronda 266 mm.</p><div className="sz-data-list"><p><span>Área</span><strong>Q / v</strong></p><p><span>Diámetro</span><strong>√(4 · A / π)</strong></p><p><span>Limitación</span><strong>No incluye pérdida de carga ni acústica</strong></p></div></section>}
    {tab === 'errores' && <section className="sz-panel"><h2>Errores frecuentes</h2><ul className="sz-check-list"><li>Usar caudal de una zona distinta al tramo calculado.</li><li>Elegir velocidad sin revisar ruido o pérdida de carga.</li><li>Tomar el diámetro equivalente como selección final sin tamaños normalizados.</li><li>No revisar accesorios, filtros, rejillas o silenciadores.</li></ul><h2>Historial reciente</h2>{history.length ? <div className="sz-data-list">{history.map((item) => row(new Date(item.createdAt).toLocaleString('es-ES'), item.sourceProvider))}</div> : <p>No hay cálculos guardados todavía.</p>}</section>}

    {message && <Notice tone={message.startsWith('No') ? 'danger' : 'success'}><p>{message}</p></Notice>}
    <Notice tone="warning"><p>El resultado no sustituye cálculo de pérdidas de carga, equilibrado, acústica, normativa ni proyecto.</p></Notice>
  </main>
}
