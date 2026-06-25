import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ImagePlus, RotateCcw, Save } from 'lucide-react'
import { calculatePsychrometricsFromRelHum, type PsychrometricsResult } from '../calculation-engine/formulas/psychrometrics'
import { listRecentCalculationHistory, saveCalculationHistory } from '../calculation-engine/history'
import type { CalculationEnvelope } from '../calculation-engine/types'
import type { CalculationHistoryRecord } from '../domain/storage/db'
import { TechnicalImageGallery, VisualHelpButton } from '../visual/visual-components'
import { Notice, PageTitle, formatNumber, parseRequiredNumber, useSettings } from './shared'

type Tab = 'calcular' | 'explicacion' | 'imagenes' | 'ejemplo' | 'errores'
const scope = { module: 'psychrometrics', calculator: 'dry-bulb-relative-humidity' }

function row(label: string, value: string) { return <p><span>{label}</span><strong>{value}</strong></p> }

export function PsychrometricsPage() {
  const { atmospherePa } = useSettings()
  const [tab, setTab] = useState<Tab>('calcular')
  const [dryBulb, setDryBulb] = useState('25')
  const [relativeHumidity, setRelativeHumidity] = useState('50')
  const [pressurePa, setPressurePa] = useState(() => String(Math.round(atmospherePa)))
  const [calculation, setCalculation] = useState<CalculationEnvelope<{ dryBulbC: number; relativeHumidityPct: number; pressurePa: number }, PsychrometricsResult> | null>(null)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<CalculationHistoryRecord[]>([])

  const loadHistory = () => { void listRecentCalculationHistory(8, 'dry-bulb-relative-humidity').then(setHistory) }
  useEffect(loadHistory, [])

  const calculate = () => {
    try {
      const next = calculatePsychrometricsFromRelHum({ dryBulbC: parseRequiredNumber(dryBulb, 'temperatura seca'), relativeHumidityPct: parseRequiredNumber(relativeHumidity, 'humedad relativa'), pressurePa: parseRequiredNumber(pressurePa, 'presión atmosférica') })
      setCalculation(next); setMessage(''); setTab('calcular')
    } catch (error) { setCalculation(null); setMessage(error instanceof Error ? error.message : 'No se pudo calcular la psicrometría.') }
  }

  const reset = () => { setDryBulb('25'); setRelativeHumidity('50'); setPressurePa(String(Math.round(atmospherePa))); setCalculation(null); setMessage('') }
  const save = async () => { if (!calculation) return; await saveCalculationHistory(calculation); loadHistory(); setMessage('Cálculo guardado en historial local.') }

  const resultRows = useMemo(() => calculation ? [
    row('Punto de rocío', `${formatNumber(calculation.result.dewPointC, 1)} °C`),
    row('Bulbo húmedo', `${formatNumber(calculation.result.wetBulbC, 1)} °C`),
    row('Humedad absoluta', `${formatNumber(calculation.result.humidityRatioKgKg * 1000, 2)} g/kg aire seco`),
    row('Entalpía', `${formatNumber(calculation.result.moistAirEnthalpyKJkg, 2)} kJ/kg`),
    row('Volumen específico', `${formatNumber(calculation.result.moistAirVolumeM3kg, 3)} m³/kg`),
    row('Presión de vapor', `${formatNumber(calculation.result.vaporPressurePa, 0)} Pa`),
  ] : [], [calculation])

  return <main className="sz-screen sz-pt-screen"><PageTitle eyebrow="Climatización" title="Psicrometría" description="Propiedades de aire húmedo desde temperatura seca, humedad relativa y presión atmosférica." />
    <div className="sz-mode-switch" aria-label="Pestañas de psicrometría">{(['calcular', 'explicacion', 'imagenes', 'ejemplo', 'errores'] as const).map((value) => <button key={value} type="button" className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value === 'imagenes' ? <ImagePlus /> : value === 'ejemplo' ? <BookOpen /> : null}{value === 'explicacion' ? 'Explicación' : value === 'errores' ? 'Errores frecuentes' : value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div>
    {tab === 'calcular' && <><section className="sz-panel sz-form"><div className="sz-two-columns"><div className="sz-field-with-help"><label>Temperatura seca °C<input inputMode="decimal" value={dryBulb} onChange={(event) => setDryBulb(event.target.value)} /></label><VisualHelpButton scope={{ ...scope, field: 'dryBulbC' }} /></div><div className="sz-field-with-help"><label>Humedad relativa %<input inputMode="decimal" value={relativeHumidity} onChange={(event) => setRelativeHumidity(event.target.value)} /></label><VisualHelpButton scope={{ ...scope, field: 'relativeHumidityPct' }} /></div></div><label>Presión atmosférica Pa<input inputMode="decimal" value={pressurePa} onChange={(event) => setPressurePa(event.target.value)} /></label><div className="sz-button-row"><button className="sz-button primary" type="button" onClick={calculate}>Calcular</button><button className="sz-button secondary" type="button" onClick={reset}><RotateCcw />Restablecer</button></div></section><section className="sz-result"><small>Resultado principal</small><strong>{calculation ? `${formatNumber(calculation.result.dewPointC, 1)} °C` : '—'}</strong><span>Punto de rocío</span>{calculation && <div className="sz-data-list">{resultRows}</div>}<div className="sz-button-row"><button className="sz-button secondary" type="button" disabled={!calculation} onClick={save}><Save />Guardar historial</button><button className="sz-button ghost" type="button" disabled={!calculation} onClick={() => setTab('explicacion')}>Interpretar</button></div></section></>}
    {tab === 'explicacion' && <section className="sz-panel"><h2>{calculation?.interpretation.title ?? 'Calcula primero'}</h2><p>{calculation?.interpretation.summary ?? 'Introduce los datos en la pestaña Calcular.'}</p>{calculation && <><div className="sz-data-list compact">{calculation.interpretation.causes.map((item) => row(item, 'orientativo'))}</div><h3>Comprobaciones</h3><ul className="sz-check-list">{calculation.interpretation.nextChecks.map((item) => <li key={item}>{item}</li>)}</ul></>}</section>}
    {tab === 'imagenes' && <TechnicalImageGallery {...scope} />}
    {tab === 'ejemplo' && <section className="sz-panel"><h2>Ejemplo resuelto</h2><p>Con 25 °C, 50 % HR y 101325 Pa se obtiene un punto de rocío próximo a 13,9 °C y una entalpía próxima a 50,3 kJ/kg.</p><div className="sz-data-list"><p><span>Fuente</span><strong>PsychroLib MIT / ASHRAE Fundamentals</strong></p><p><span>Entrada mínima</span><strong>T seca + HR + presión</strong></p><p><span>Uso</span><strong>Orientativo; validar con medición calibrada</strong></p></div></section>}
    {tab === 'errores' && <section className="sz-panel"><h2>Errores frecuentes</h2><ul className="sz-check-list"><li>Medir cerca de impulsión directa, pared fría/caliente o radiación solar.</li><li>Usar una sonda sin estabilizar o sin calibración.</li><li>Confundir humedad relativa con humedad absoluta.</li><li>Ignorar la presión atmosférica en altitud.</li></ul><h2>Historial reciente</h2>{history.length ? <div className="sz-data-list">{history.map((item) => row(new Date(item.createdAt).toLocaleString('es-ES'), item.sourceProvider))}</div> : <p>No hay cálculos guardados todavía.</p>}</section>}
    {message && <Notice tone={message.startsWith('No') ? 'danger' : 'success'}><p>{message}</p></Notice>}<Notice tone="warning"><p>Resultado orientativo. En diseño o puesta en marcha prevalecen proyecto, normativa, fabricante e instrumentos calibrados.</p></Notice>
  </main>
}
