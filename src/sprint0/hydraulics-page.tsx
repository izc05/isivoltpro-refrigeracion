import { useEffect, useMemo, useState } from 'react'
import { BookOpen, History, RotateCcw, Save } from 'lucide-react'
import { calculateWaterFlow, type WaterFlowResult } from '../calculation-engine/formulas/hydraulics'
import { listRecentCalculationHistory, saveCalculationHistory } from '../calculation-engine/history'
import type { CalculationEnvelope } from '../calculation-engine/types'
import type { CalculationHistoryRecord } from '../domain/storage/db'
import { Notice, PageTitle, formatNumber, parseRequiredNumber } from './shared'

type Tab = 'calcular' | 'interpretar' | 'aprender' | 'historial'

function row(label: string, value: string) {
  return <p><span>{label}</span><strong>{value}</strong></p>
}

export function HydraulicsPage() {
  const [tab, setTab] = useState<Tab>('calcular')
  const [power, setPower] = useState('10')
  const [deltaT, setDeltaT] = useState('5')
  const [specificHeat, setSpecificHeat] = useState('4,186')
  const [density, setDensity] = useState('1000')
  const [calculation, setCalculation] = useState<CalculationEnvelope<{ thermalPowerKw: number; deltaTK: number; specificHeatKjKgK: number; densityKgM3: number }, WaterFlowResult> | null>(null)
  const [history, setHistory] = useState<CalculationHistoryRecord[]>([])
  const [message, setMessage] = useState('')

  const loadHistory = () => {
    void listRecentCalculationHistory(8, 'water-flow').then(setHistory)
  }

  useEffect(loadHistory, [])

  const calculate = () => {
    try {
      const next = calculateWaterFlow({ thermalPowerKw: parseRequiredNumber(power, 'potencia'), deltaTK: parseRequiredNumber(deltaT, 'salto térmico'), specificHeatKjKgK: parseRequiredNumber(specificHeat, 'calor específico'), densityKgM3: parseRequiredNumber(density, 'densidad') })
      setCalculation(next)
      setMessage('')
      setTab('calcular')
    } catch (error) {
      setCalculation(null)
      setMessage(error instanceof Error ? error.message : 'No se pudo calcular el caudal.')
    }
  }

  const reset = () => {
    setPower('10')
    setDeltaT('5')
    setSpecificHeat('4,186')
    setDensity('1000')
    setCalculation(null)
    setMessage('')
  }

  const save = async () => {
    if (!calculation) return
    await saveCalculationHistory(calculation)
    loadHistory()
    setMessage('Cálculo guardado en historial local.')
  }

  const resultRows = useMemo(() => calculation ? [
    row('Caudal', `${formatNumber(calculation.result.volumeFlowM3H, 2)} m³/h`),
    row('Litros por segundo', `${formatNumber(calculation.result.volumeFlowLs, 3)} l/s`),
    row('Litros por minuto', `${formatNumber(calculation.result.volumeFlowLmin, 1)} l/min`),
    row('Caudal másico', `${formatNumber(calculation.result.massFlowKgS, 3)} kg/s`),
    row('Base', `${formatNumber(calculation.inputs.thermalPowerKw, 2)} kW · ΔT ${formatNumber(calculation.inputs.deltaTK, 1)} K`),
  ] : [], [calculation])

  return <main className="sz-screen sz-pt-screen">
    <PageTitle eyebrow="Aerotermia e hidráulica" title="Caudal de agua" description="Calcula el caudal necesario desde potencia térmica y salto térmico." />

    <div className="sz-mode-switch" aria-label="Pestañas de hidráulica">
      {(['calcular', 'interpretar', 'aprender', 'historial'] as const).map((value) => <button key={value} type="button" className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{value === 'aprender' ? <BookOpen /> : value === 'historial' ? <History /> : null}{value.charAt(0).toUpperCase() + value.slice(1)}</button>)}
    </div>

    {tab === 'calcular' && <>
      <section className="sz-panel sz-form">
        <div className="sz-two-columns"><label>Potencia térmica kW<input inputMode="decimal" value={power} onChange={(event) => setPower(event.target.value)} /></label><label>Salto térmico K<input inputMode="decimal" value={deltaT} onChange={(event) => setDeltaT(event.target.value)} /></label></div>
        <div className="sz-two-columns"><label>Calor específico kJ/kgK<input inputMode="decimal" value={specificHeat} onChange={(event) => setSpecificHeat(event.target.value)} /></label><label>Densidad kg/m³<input inputMode="decimal" value={density} onChange={(event) => setDensity(event.target.value)} /></label></div>
        <div className="sz-button-row"><button className="sz-button primary" type="button" onClick={calculate}>Calcular</button><button className="sz-button secondary" type="button" onClick={reset}><RotateCcw />Restablecer</button></div>
      </section>
      <section className="sz-result"><small>Caudal principal</small><strong>{calculation ? `${formatNumber(calculation.result.volumeFlowM3H, 2)} m³/h` : '—'}</strong>{calculation && <div className="sz-data-list">{resultRows}</div>}<div className="sz-button-row"><button className="sz-button secondary" type="button" disabled={!calculation} onClick={save}><Save />Guardar historial</button><button className="sz-button ghost" type="button" disabled={!calculation} onClick={() => setTab('interpretar')}>Interpretar</button></div></section>
    </>}

    {tab === 'interpretar' && <section className="sz-panel"><h2>{calculation?.interpretation.title ?? 'Calcula primero'}</h2><p>{calculation?.interpretation.summary ?? 'Introduce potencia y salto térmico en la pestaña Calcular.'}</p>{calculation && <><div className="sz-data-list compact">{calculation.interpretation.causes.map((item) => row(item, 'orientativo'))}</div><h3>Comprobaciones</h3><ul className="sz-check-list">{calculation.interpretation.nextChecks.map((item) => <li key={item}>{item}</li>)}</ul></>}</section>}

    {tab === 'aprender' && <section className="sz-panel"><h2>Fórmula base</h2><p>El caudal se calcula a partir del balance sensible del agua o fluido introducido por el técnico.</p><div className="sz-data-list"><p><span>Caudal másico</span><strong>P / (cp · ΔT)</strong></p><p><span>Caudal volumétrico</span><strong>m / densidad</strong></p><p><span>Limitación</span><strong>No incluye pérdidas ni curva de bomba</strong></p></div></section>}

    {tab === 'historial' && <section className="sz-panel"><h2>Historial reciente</h2>{history.length ? <div className="sz-data-list">{history.map((item) => row(new Date(item.createdAt).toLocaleString('es-ES'), item.sourceProvider))}</div> : <p>No hay cálculos guardados todavía.</p>}</section>}

    {message && <Notice tone={message.startsWith('No') ? 'danger' : 'success'}><p>{message}</p></Notice>}
    <Notice tone="warning"><p>Resultado orientativo. Confirma tipo de fluido, porcentaje de glicol, pérdidas de carga, equilibrado y curva de bomba.</p></Notice>
  </main>
}
