import { useEffect, useMemo, useState } from 'react'
import { FileText, Image, Paperclip, Plus, Save } from 'lucide-react'
import type { PsychrometricComparisonResult, PsychrometricState } from '../calculation-engine/formulas/psychrometrics'
import { saveCalculationHistory } from '../calculation-engine/history'
import type { CalculationEnvelope } from '../calculation-engine/types'
import { db, newId, type Intervention } from '../domain/storage/db'
import { downloadBlob, Notice, useSettings } from './shared'
import {
  generatePsychrometricPdf,
  psychrometricExportFilename,
  psychrometricSummaryLines,
  renderPsychrometricChart,
  type PsychrometricExportSnapshot,
} from './psychrometric-chart-export'
import './psychrometric-chart-actions.css'

type ChartCalculation =
  | CalculationEnvelope<unknown, PsychrometricState>
  | CalculationEnvelope<unknown, PsychrometricComparisonResult>

type Props = {
  svg: SVGSVGElement | null
  calculation: ChartCalculation | null
  state?: PsychrometricState | null
  comparison?: PsychrometricComparisonResult | null
  pressurePa: number
}

type Feedback = {
  tone: 'success' | 'danger' | 'info'
  text: string
}

function interventionLabel(intervention: Intervention) {
  const location = intervention.equipmentLabel || intervention.installationName || 'Sin ubicación'
  return `${intervention.date} · ${intervention.clientName} · ${location}`
}

function appendSummary(existing: string | undefined, snapshot: PsychrometricExportSnapshot) {
  const generated = new Date(snapshot.generatedAt ?? Date.now()).toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const block = [`Psicrometría (${generated})`, ...psychrometricSummaryLines(snapshot)].join('\n')
  return existing?.trim() ? `${existing.trim()}\n\n${block}` : block
}

export function PsychrometricChartActions({ svg, calculation, state = null, comparison = null, pressurePa }: Props) {
  const { technician } = useSettings()
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [selectedInterventionId, setSelectedInterventionId] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busy, setBusy] = useState(false)

  const snapshot = useMemo<PsychrometricExportSnapshot>(() => ({
    state,
    comparison,
    pressurePa,
    generatedAt: calculation?.calculatedAt ?? new Date().toISOString(),
  }), [calculation?.calculatedAt, comparison, pressurePa, state])

  const loadInterventions = () => {
    void db.interventions.orderBy('updatedAt').reverse().limit(30).toArray().then(setInterventions)
  }

  useEffect(loadInterventions, [])

  const run = async (task: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setFeedback(null)
    try {
      await task()
    } catch (error) {
      setFeedback({ tone: 'danger', text: error instanceof Error ? error.message : 'No se pudo completar la acción.' })
    } finally {
      setBusy(false)
    }
  }

  const saveToHistory = () => run(async () => {
    if (!calculation) throw new Error('Calcula primero un estado o proceso psicrométrico.')
    await saveCalculationHistory(calculation)
    setFeedback({ tone: 'success', text: 'Cálculo psicrométrico guardado en el historial local.' })
  })

  const exportPng = () => run(async () => {
    if (!svg) throw new Error('La carta todavía no está preparada para exportar.')
    const rendered = await renderPsychrometricChart(svg)
    downloadBlob(rendered.blob, psychrometricExportFilename(snapshot, 'png'))
    setFeedback({ tone: 'success', text: 'Imagen PNG de la carta generada.' })
  })

  const exportPdf = () => run(async () => {
    if (!svg) throw new Error('La carta todavía no está preparada para exportar.')
    const pdf = await generatePsychrometricPdf(svg, snapshot)
    downloadBlob(pdf, psychrometricExportFilename(snapshot, 'pdf'))
    setFeedback({ tone: 'success', text: 'Informe PDF psicrométrico generado.' })
  })

  const attachToIntervention = () => run(async () => {
    if (!selectedInterventionId) throw new Error('Selecciona una intervención.')
    if (!svg || !calculation) throw new Error('Calcula y representa la carta antes de adjuntarla.')
    const intervention = await db.interventions.get(selectedInterventionId)
    if (!intervention) throw new Error('La intervención seleccionada ya no existe.')

    const rendered = await renderPsychrometricChart(svg, 1.5)
    const updatedAt = new Date().toISOString()
    await db.interventions.put({
      ...intervention,
      photos: [rendered.dataUrl, ...(intervention.photos ?? [])],
      observations: appendSummary(intervention.observations, snapshot),
      updatedAt,
    })
    await saveCalculationHistory(calculation, { interventionId: intervention.id })
    loadInterventions()
    setFeedback({ tone: 'success', text: `Carta adjuntada a la intervención de ${intervention.clientName}.` })
  })

  const createDraftAndAttach = () => run(async () => {
    if (!svg || !calculation) throw new Error('Calcula y representa la carta antes de crear el borrador.')
    const rendered = await renderPsychrometricChart(svg, 1.5)
    const now = new Date().toISOString()
    const intervention: Intervention = {
      id: newId('int'),
      date: now.slice(0, 10),
      technician,
      clientName: 'Pendiente de asignar',
      workType: 'Medición psicrométrica',
      status: 'borrador',
      observations: appendSummary(undefined, snapshot),
      photos: [rendered.dataUrl],
      createdAt: now,
      updatedAt: now,
    }
    await db.interventions.put(intervention)
    await saveCalculationHistory(calculation, { interventionId: intervention.id })
    setSelectedInterventionId(intervention.id)
    loadInterventions()
    setFeedback({ tone: 'success', text: 'Borrador de intervención creado con la carta y los resultados adjuntos.' })
  })

  const disabled = busy || !calculation

  return <section className="psychro-export-card" aria-labelledby="psychro-export-title">
    <div className="psychro-export-head">
      <div><small>Guardar y documentar</small><h2 id="psychro-export-title">Salida del cálculo</h2></div>
      <span>{comparison ? 'Proceso A → B' : state ? 'Estado psicrométrico' : 'Sin cálculo'}</span>
    </div>

    <div className="psychro-export-buttons">
      <button className="sz-button secondary" type="button" disabled={disabled} onClick={saveToHistory}><Save />Guardar cálculo</button>
      <button className="sz-button secondary" type="button" disabled={busy || !svg} onClick={exportPng}><Image />Imagen PNG</button>
      <button className="sz-button secondary" type="button" disabled={busy || !svg} onClick={exportPdf}><FileText />Informe PDF</button>
    </div>

    <div className="psychro-attach-block">
      <label>Adjuntar a intervención existente
        <select value={selectedInterventionId} onChange={(event) => setSelectedInterventionId(event.target.value)}>
          <option value="">Seleccionar intervención</option>
          {interventions.map((intervention) => <option value={intervention.id} key={intervention.id}>{interventionLabel(intervention)}</option>)}
        </select>
      </label>
      <div className="psychro-export-buttons">
        <button className="sz-button secondary" type="button" disabled={disabled || !selectedInterventionId || !svg} onClick={attachToIntervention}><Paperclip />Adjuntar</button>
        <button className="sz-button secondary" type="button" disabled={disabled || !svg} onClick={createDraftAndAttach}><Plus />Crear borrador</button>
      </div>
      <p>Al adjuntar, la carta se guarda como imagen, el resumen se añade a observaciones y el cálculo queda vinculado a la intervención.</p>
    </div>

    {feedback && <Notice tone={feedback.tone}><p>{feedback.text}</p></Notice>}
  </section>
}
