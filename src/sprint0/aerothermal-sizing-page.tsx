import { useMemo, useState } from 'react'
import { ClipboardPlus, Droplets, Printer, RotateCcw, Save } from 'lucide-react'
import { calculateAerothermalSizing, type AerothermalSizingInput, type AerothermalSizingResult } from '../calculation-engine/formulas/building-energy'
import { Notice, PageTitle, createMeasurementDraft, formatNumber, parseRequiredNumber } from './shared'

type Tab = 'demanda' | 'equipo' | 'resultados' | 'metodo'
type Emitter = 'suelo-radiante' | 'radiadores-baja' | 'radiadores-alta' | 'fancoils'
type FormState = Record<keyof AerothermalSizingInput, string> & { designOutdoorC: string; emitter: Emitter; supplyTemperatureC: string }

function readLatestLoads() {
  try {
    const saved = JSON.parse(localStorage.getItem('isivolt_latest_building_load') ?? 'null') as { result?: { heating?: { totalKw?: number }; cooling?: { totalKw?: number } } } | null
    return {
      heating: saved?.result?.heating?.totalKw ? saved.result.heating.totalKw.toFixed(2).replace('.', ',') : '8',
      cooling: saved?.result?.cooling?.totalKw ? saved.result.cooling.totalKw.toFixed(2).replace('.', ',') : '7',
    }
  } catch {
    return { heating: '8', cooling: '7' }
  }
}

const initialLoads = readLatestLoads()
const defaults: FormState = {
  heatingLoadKw: initialLoads.heating,
  coolingLoadKw: initialLoads.cooling,
  safetyFactorPct: '5',
  selectedNominalCapacityKw: '9',
  capacityAtDesignKw: '8',
  minimumModulationKw: '2,2',
  copAtDesign: '3,2',
  scop: '4,5',
  seer: '5,5',
  waterDeltaTK: '5',
  systemVolumeL: '70',
  minimumVolumeLPerKw: '10',
  glycolPct: '0',
  occupants: '4',
  dhwLitresPerPersonDay: '35',
  coldWaterC: '10',
  storageTemperatureC: '50',
  dhwRecoveryHours: '2',
  annualHeatingEquivalentHours: '1200',
  annualCoolingEquivalentHours: '500',
  electricityPriceEurKwh: '0,20',
  designOutdoorC: '-2',
  emitter: 'suelo-radiante',
  supplyTemperatureC: '35',
}

const numericLabels: Record<keyof AerothermalSizingInput, string> = {
  heatingLoadKw: 'carga de calefacción',
  coolingLoadKw: 'carga de refrigeración',
  safetyFactorPct: 'margen',
  selectedNominalCapacityKw: 'potencia nominal',
  capacityAtDesignKw: 'potencia a temperatura de diseño',
  minimumModulationKw: 'modulación mínima',
  copAtDesign: 'COP de diseño',
  scop: 'SCOP',
  seer: 'SEER',
  waterDeltaTK: 'salto térmico del agua',
  systemVolumeL: 'volumen del circuito',
  minimumVolumeLPerKw: 'volumen mínimo por kW',
  glycolPct: 'porcentaje de glicol',
  occupants: 'ocupantes',
  dhwLitresPerPersonDay: 'consumo de ACS',
  coldWaterC: 'temperatura del agua fría',
  storageTemperatureC: 'temperatura de acumulación',
  dhwRecoveryHours: 'tiempo de recuperación de ACS',
  annualHeatingEquivalentHours: 'horas equivalentes de calefacción',
  annualCoolingEquivalentHours: 'horas equivalentes de refrigeración',
  electricityPriceEurKwh: 'precio eléctrico',
}

function row(label: string, value: string) {
  return <p><span>{label}</span><strong>{value}</strong></p>
}

function emitterAdvice(emitter: Emitter, supplyTemperatureC: number) {
  const labels: Record<Emitter, string> = {
    'suelo-radiante': 'Suelo radiante/refrescante',
    'radiadores-baja': 'Radiadores de baja temperatura',
    'radiadores-alta': 'Radiadores convencionales',
    fancoils: 'Fan coils',
  }
  const recommended = emitter === 'suelo-radiante' ? [30, 40] : emitter === 'radiadores-baja' ? [40, 50] : emitter === 'radiadores-alta' ? [50, 60] : [35, 50]
  return { label: labels[emitter], recommended, suitable: supplyTemperatureC >= recommended[0] && supplyTemperatureC <= recommended[1] }
}

export function AerothermalSizingPage() {
  const [tab, setTab] = useState<Tab>('demanda')
  const [form, setForm] = useState<FormState>(defaults)
  const [result, setResult] = useState<AerothermalSizingResult | null>(null)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>('success')

  const setField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }))

  const calculate = () => {
    try {
      const keys = Object.keys(numericLabels) as Array<keyof AerothermalSizingInput>
      const input = Object.fromEntries(keys.map((key) => [key, parseRequiredNumber(form[key], numericLabels[key])])) as AerothermalSizingInput
      const next = calculateAerothermalSizing(input)
      setResult(next)
      localStorage.setItem('isivolt_latest_aerothermal_sizing', JSON.stringify({ input, extras: { emitter: form.emitter, designOutdoorC: form.designOutdoorC, supplyTemperatureC: form.supplyTemperatureC }, result: next, createdAt: new Date().toISOString() }))
      setMessage('Dimensionado actualizado.')
      setMessageTone('success')
      setTab('resultados')
    } catch (error) {
      setResult(null)
      setMessage(error instanceof Error ? error.message : 'No se pudo realizar el dimensionado.')
      setMessageTone('danger')
    }
  }

  const reset = () => { setForm({ ...defaults, ...readLatestLoads() }); setResult(null); setMessage(''); setTab('demanda') }

  const save = () => {
    if (!result) return
    const history = JSON.parse(localStorage.getItem('isivolt_aerothermal_history') ?? '[]') as unknown[]
    localStorage.setItem('isivolt_aerothermal_history', JSON.stringify([{ input: form, result, createdAt: new Date().toISOString() }, ...history].slice(0, 20)))
    setMessage('Dimensionado guardado en el historial local.')
    setMessageTone('success')
  }

  const addToIntervention = async () => {
    if (!result) return
    await createMeasurementDraft({
      workType: 'Dimensionado de aerotermia',
      observations: `Demanda de diseño: ${formatNumber(result.designHeatingKw, 2)} kW calefacción y ${formatNumber(result.designCoolingKw, 2)} kW refrigeración. Potencia recomendada: ${formatNumber(result.recommendedCapacityKw, 2)} kW. Cobertura a diseño: ${formatNumber(result.capacityCoveragePct, 0)} %. Apoyo estimado: ${formatNumber(result.backupHeatingKw, 2)} kW. ACS: ${formatNumber(result.dhwDailyVolumeL, 0)} l/día.`,
    })
    setMessage('Se ha creado un borrador en Intervenciones.')
    setMessageTone('success')
  }

  const supplyC = Number(form.supplyTemperatureC.replace(',', '.')) || 0
  const emitter = useMemo(() => emitterAdvice(form.emitter, supplyC), [form.emitter, supplyC])
  const coverageTone = result && result.capacityCoveragePct < 90 ? 'danger' : result && result.capacityCoveragePct < 100 ? 'warning' : 'success'

  return <main className="sz-screen sz-pt-screen">
    <PageTitle eyebrow="Aerotermia / Hidráulica" title="Dimensionado de aerotermia" description="Demanda térmica, selección real del equipo, modulación, ACS, caudales, inercia, vaso de expansión, electricidad y coste anual." />

    <div className="sz-mode-switch" aria-label="Pestañas de aerotermia">
      <button type="button" className={tab === 'demanda' ? 'active' : ''} onClick={() => setTab('demanda')}>Demanda</button>
      <button type="button" className={tab === 'equipo' ? 'active' : ''} onClick={() => setTab('equipo')}>Equipo</button>
      <button type="button" className={tab === 'resultados' ? 'active' : ''} onClick={() => setTab('resultados')}>Resultados</button>
      <button type="button" className={tab === 'metodo' ? 'active' : ''} onClick={() => setTab('metodo')}>Método</button>
    </div>

    {tab === 'demanda' && <>
      <section className="sz-panel sz-form">
        <h2>Cargas del edificio</h2>
        <p className="hint">Se cargan automáticamente los últimos resultados de “Carga térmica y frigorías”. También puedes escribirlos manualmente.</p>
        <div className="sz-two-columns">
          <label>Calefacción kW<input inputMode="decimal" value={form.heatingLoadKw} onChange={(event) => setField('heatingLoadKw', event.target.value)} /></label>
          <label>Refrigeración kW<input inputMode="decimal" value={form.coolingLoadKw} onChange={(event) => setField('coolingLoadKw', event.target.value)} /></label>
          <label>Exterior de diseño °C<input inputMode="decimal" value={form.designOutdoorC} onChange={(event) => setField('designOutdoorC', event.target.value)} /></label>
          <label>Margen adicional %<input inputMode="decimal" value={form.safetyFactorPct} onChange={(event) => setField('safetyFactorPct', event.target.value)} /></label>
        </div>
      </section>

      <section className="sz-panel sz-form">
        <h2>Emisores</h2>
        <div className="sz-two-columns">
          <label>Tipo de emisor<select value={form.emitter} onChange={(event) => setField('emitter', event.target.value as Emitter)}><option value="suelo-radiante">Suelo radiante/refrescante</option><option value="radiadores-baja">Radiadores baja temperatura</option><option value="radiadores-alta">Radiadores convencionales</option><option value="fancoils">Fan coils</option></select></label>
          <label>Impulsión prevista °C<input inputMode="decimal" value={form.supplyTemperatureC} onChange={(event) => setField('supplyTemperatureC', event.target.value)} /></label>
          <label>Salto térmico agua K<input inputMode="decimal" value={form.waterDeltaTK} onChange={(event) => setField('waterDeltaTK', event.target.value)} /></label>
          <label>Glicol %<input inputMode="decimal" value={form.glycolPct} onChange={(event) => setField('glycolPct', event.target.value)} /></label>
        </div>
        <Notice tone={emitter.suitable ? 'success' : 'warning'}><p>{emitter.label}: intervalo orientativo {emitter.recommended[0]}–{emitter.recommended[1]} °C. La potencia del emisor debe verificarse a la temperatura real.</p></Notice>
      </section>

      <section className="sz-panel sz-form">
        <h2>ACS</h2>
        <div className="sz-two-columns">
          <label>Ocupantes<input inputMode="numeric" value={form.occupants} onChange={(event) => setField('occupants', event.target.value)} /></label>
          <label>Litros/persona·día<input inputMode="decimal" value={form.dhwLitresPerPersonDay} onChange={(event) => setField('dhwLitresPerPersonDay', event.target.value)} /></label>
          <label>Agua fría °C<input inputMode="decimal" value={form.coldWaterC} onChange={(event) => setField('coldWaterC', event.target.value)} /></label>
          <label>Acumulación °C<input inputMode="decimal" value={form.storageTemperatureC} onChange={(event) => setField('storageTemperatureC', event.target.value)} /></label>
          <label>Recuperación h<input inputMode="decimal" value={form.dhwRecoveryHours} onChange={(event) => setField('dhwRecoveryHours', event.target.value)} /></label>
        </div>
        <button className="sz-button primary" type="button" onClick={() => setTab('equipo')}>Continuar con el equipo</button>
      </section>
    </>}

    {tab === 'equipo' && <>
      <section className="sz-panel sz-form">
        <h2>Datos reales del fabricante</h2>
        <div className="sz-two-columns">
          <label>Potencia nominal kW<input inputMode="decimal" value={form.selectedNominalCapacityKw} onChange={(event) => setField('selectedNominalCapacityKw', event.target.value)} /></label>
          <label>Potencia a diseño kW<input inputMode="decimal" value={form.capacityAtDesignKw} onChange={(event) => setField('capacityAtDesignKw', event.target.value)} /></label>
          <label>Potencia mínima kW<input inputMode="decimal" value={form.minimumModulationKw} onChange={(event) => setField('minimumModulationKw', event.target.value)} /></label>
          <label>COP a diseño<input inputMode="decimal" value={form.copAtDesign} onChange={(event) => setField('copAtDesign', event.target.value)} /></label>
          <label>SCOP<input inputMode="decimal" value={form.scop} onChange={(event) => setField('scop', event.target.value)} /></label>
          <label>SEER<input inputMode="decimal" value={form.seer} onChange={(event) => setField('seer', event.target.value)} /></label>
        </div>
      </section>

      <section className="sz-panel sz-form">
        <h2>Hidráulica, consumo y coste</h2>
        <div className="sz-two-columns">
          <label>Volumen circuito l<input inputMode="decimal" value={form.systemVolumeL} onChange={(event) => setField('systemVolumeL', event.target.value)} /></label>
          <label>Volumen mínimo l/kW<input inputMode="decimal" value={form.minimumVolumeLPerKw} onChange={(event) => setField('minimumVolumeLPerKw', event.target.value)} /></label>
          <label>Horas equivalentes calefacción<input inputMode="decimal" value={form.annualHeatingEquivalentHours} onChange={(event) => setField('annualHeatingEquivalentHours', event.target.value)} /></label>
          <label>Horas equivalentes frío<input inputMode="decimal" value={form.annualCoolingEquivalentHours} onChange={(event) => setField('annualCoolingEquivalentHours', event.target.value)} /></label>
          <label>Precio electricidad €/kWh<input inputMode="decimal" value={form.electricityPriceEurKwh} onChange={(event) => setField('electricityPriceEurKwh', event.target.value)} /></label>
        </div>
        <div className="sz-button-row"><button className="sz-button primary" type="button" onClick={calculate}><Droplets />Dimensionar instalación</button><button className="sz-button secondary" type="button" onClick={reset}><RotateCcw />Restablecer</button></div>
      </section>
    </>}

    {tab === 'resultados' && <>
      <section className="sz-result">
        <small>Potencia recomendada de diseño</small>
        <strong>{result ? `${formatNumber(result.recommendedCapacityKw, 2)} kW` : '—'}</strong>
        {result && <div className="sz-data-list">
          {row('Calefacción con margen', `${formatNumber(result.designHeatingKw, 2)} kW`)}
          {row('Refrigeración con margen', `${formatNumber(result.designCoolingKw, 2)} kW`)}
          {row('Cobertura a temperatura de diseño', `${formatNumber(result.capacityCoveragePct, 0)} %`)}
          {row('Apoyo térmico estimado', `${formatNumber(result.backupHeatingKw, 2)} kW`)}
          {row('Riesgo de ciclos cortos', result.shortCyclingRisk.toUpperCase())}
          {row('Caudal calefacción', `${formatNumber(result.heatingWaterFlowM3H, 2)} m³/h`)}
          {row('Caudal refrigeración', `${formatNumber(result.coolingWaterFlowM3H, 2)} m³/h`)}
        </div>}
        <div className="sz-button-row"><button className="sz-button secondary" type="button" disabled={!result} onClick={save}><Save />Guardar</button><button className="sz-button secondary" type="button" disabled={!result} onClick={addToIntervention}><ClipboardPlus />Intervención</button><button className="sz-button ghost" type="button" disabled={!result} onClick={() => window.print()}><Printer />PDF / imprimir</button></div>
      </section>

      {result && <>
        <Notice tone={coverageTone}><p>{result.capacityCoveragePct >= 100 ? 'El equipo cubre la carga de calefacción introducida en el punto de diseño.' : `Faltan aproximadamente ${formatNumber(result.backupHeatingKw, 2)} kW en el punto de diseño. Revisa la tabla de capacidad del fabricante o define apoyo.`}</p></Notice>
        <section className="sz-panel"><h2>ACS e hidráulica</h2><div className="sz-data-list">{row('ACS diario', `${formatNumber(result.dhwDailyVolumeL, 0)} l/día`)}{row('Energía diaria ACS', `${formatNumber(result.dhwDailyEnergyKwh, 2)} kWh/día`)}{row('Potencia de recuperación ACS', `${formatNumber(result.dhwRecoveryPowerKw, 2)} kW`)}{row('Depósito de inercia mínimo adicional', `${formatNumber(result.requiredBufferVolumeL, 0)} l`)}{row('Vaso de expansión aproximado', `${formatNumber(result.expansionVesselApproxL, 1)} l`)}</div></section>
        <section className="sz-panel"><h2>Electricidad y coste anual</h2><div className="sz-data-list">{row('Demanda térmica anual calefacción', `${formatNumber(result.annualHeatingThermalKwh, 0)} kWh`)}{row('Demanda térmica anual refrigeración', `${formatNumber(result.annualCoolingThermalKwh, 0)} kWh`)}{row('Demanda térmica anual ACS', `${formatNumber(result.annualDhwThermalKwh, 0)} kWh`)}{row('Consumo eléctrico estimado', `${formatNumber(result.annualElectricityKwh, 0)} kWh/año`)}{row('Coste estimado', `${formatNumber(result.annualCostEur, 0)} €/año`)}{row('Entrada eléctrica punta', `${formatNumber(result.peakElectricalInputKw, 2)} kW`)}{row('Intensidad monofásica orientativa', `${formatNumber(result.singlePhaseCurrentA, 1)} A`)}{row('Intensidad trifásica orientativa', `${formatNumber(result.threePhaseCurrentA, 1)} A`)}</div></section>
      </>}
    </>}

    {tab === 'metodo' && <section className="sz-panel"><h2>Criterio de dimensionado</h2><ul className="sz-check-list"><li>Parte de las cargas calculadas, no de una regla fija de W/m².</li><li>Compara la demanda con la potencia disponible del fabricante a la temperatura exterior e impulsión reales.</li><li>Comprueba cobertura, apoyo y modulación mínima para detectar sobredimensionamiento y ciclos cortos.</li><li>Calcula caudal hidráulico mediante P/(1,163 · ΔT), volumen de inercia y vaso de expansión aproximado.</li><li>Calcula energía de ACS, potencia de recuperación y consumo anual mediante COP, SCOP y SEER introducidos.</li><li>Estima la potencia eléctrica punta y las intensidades orientativas monofásica y trifásica.</li></ul><h2>Comprobaciones pendientes de fabricante</h2><p>Curvas de potencia y COP, límites de funcionamiento, desescarche, caudal mínimo, volumen mínimo, bomba circuladora, nivel sonoro, resistencia de apoyo y compatibilidad con emisores.</p></section>}

    {message && <Notice tone={messageTone}><p>{message}</p></Notice>}
    <Notice tone="warning"><p>La potencia nominal A7/W35 no basta para seleccionar una aerotermia. Introduce la potencia disponible en las condiciones reales de diseño y verifica siempre la documentación del fabricante.</p></Notice>
  </main>
}
