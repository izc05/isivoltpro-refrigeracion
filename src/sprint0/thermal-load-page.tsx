import { useMemo, useState } from 'react'
import { ClipboardPlus, Printer, RotateCcw, Save, Snowflake } from 'lucide-react'
import { calculateBuildingLoads, type BuildingLoadInput, type BuildingLoadResult, type Orientation } from '../calculation-engine/formulas/building-energy'
import { Notice, PageTitle, createMeasurementDraft, formatNumber, parseRequiredNumber } from './shared'

type Tab = 'datos' | 'resultados' | 'metodo'
type FormState = Record<keyof Omit<BuildingLoadInput, 'orientation'>, string> & { orientation: Orientation }

const defaults: FormState = {
  floorAreaM2: '100',
  heightM: '2,60',
  exteriorWallAreaM2: '80',
  windowAreaM2: '18',
  roofAreaM2: '100',
  exposedFloorAreaM2: '0',
  uWallWm2K: '0,60',
  uWindowWm2K: '1,80',
  uRoofWm2K: '0,35',
  uFloorWm2K: '0,50',
  winterOutdoorC: '-2',
  winterIndoorC: '21',
  summerOutdoorC: '38',
  summerIndoorC: '25',
  outdoorRelativeHumidityPct: '45',
  indoorRelativeHumidityPct: '50',
  airChangesPerHour: '0,50',
  heatRecoveryEfficiencyPct: '0',
  occupants: '4',
  sensibleWPerPerson: '75',
  latentWPerPerson: '55',
  lightingWm2: '6',
  equipmentW: '600',
  orientation: 'SO',
  glazingSolarFactor: '0,55',
  shadingFactor: '0,80',
  safetyFactorPct: '10',
}

const numericLabels: Record<keyof Omit<BuildingLoadInput, 'orientation'>, string> = {
  floorAreaM2: 'superficie',
  heightM: 'altura',
  exteriorWallAreaM2: 'muros exteriores',
  windowAreaM2: 'ventanas',
  roofAreaM2: 'cubierta',
  exposedFloorAreaM2: 'suelo expuesto',
  uWallWm2K: 'U de muros',
  uWindowWm2K: 'U de ventanas',
  uRoofWm2K: 'U de cubierta',
  uFloorWm2K: 'U de suelo',
  winterOutdoorC: 'temperatura exterior de invierno',
  winterIndoorC: 'temperatura interior de invierno',
  summerOutdoorC: 'temperatura exterior de verano',
  summerIndoorC: 'temperatura interior de verano',
  outdoorRelativeHumidityPct: 'humedad exterior',
  indoorRelativeHumidityPct: 'humedad interior',
  airChangesPerHour: 'renovaciones de aire',
  heatRecoveryEfficiencyPct: 'recuperación de calor',
  occupants: 'ocupantes',
  sensibleWPerPerson: 'carga sensible por persona',
  latentWPerPerson: 'carga latente por persona',
  lightingWm2: 'iluminación',
  equipmentW: 'equipos',
  glazingSolarFactor: 'factor solar del vidrio',
  shadingFactor: 'factor de sombra',
  safetyFactorPct: 'margen de seguridad',
}

function resultRow(label: string, value: string) {
  return <p><span>{label}</span><strong>{value}</strong></p>
}

export function ThermalLoadPage() {
  const [tab, setTab] = useState<Tab>('datos')
  const [form, setForm] = useState<FormState>(defaults)
  const [result, setResult] = useState<BuildingLoadResult | null>(null)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>('success')

  const setField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }))

  const calculate = () => {
    try {
      const numericEntries = Object.keys(numericLabels) as Array<keyof Omit<BuildingLoadInput, 'orientation'>>
      const numeric = Object.fromEntries(numericEntries.map((key) => [key, parseRequiredNumber(form[key], numericLabels[key])])) as Omit<BuildingLoadInput, 'orientation'>
      const next = calculateBuildingLoads({ ...numeric, orientation: form.orientation })
      setResult(next)
      localStorage.setItem('isivolt_latest_building_load', JSON.stringify({ input: { ...numeric, orientation: form.orientation }, result: next, createdAt: new Date().toISOString() }))
      setMessage('Cálculo actualizado y disponible para la herramienta de aerotermia.')
      setMessageTone('success')
      setTab('resultados')
    } catch (error) {
      setResult(null)
      setMessage(error instanceof Error ? error.message : 'No se pudo realizar el cálculo.')
      setMessageTone('danger')
    }
  }

  const reset = () => { setForm(defaults); setResult(null); setMessage(''); setTab('datos') }

  const save = () => {
    if (!result) return
    const history = JSON.parse(localStorage.getItem('isivolt_thermal_load_history') ?? '[]') as unknown[]
    localStorage.setItem('isivolt_thermal_load_history', JSON.stringify([{ input: form, result, createdAt: new Date().toISOString() }, ...history].slice(0, 20)))
    setMessage('Cálculo guardado en el historial local.')
    setMessageTone('success')
  }

  const addToIntervention = async () => {
    if (!result) return
    await createMeasurementDraft({
      workType: 'Cálculo de carga térmica',
      observations: `Calefacción: ${formatNumber(result.heating.totalKw, 2)} kW. Refrigeración: ${formatNumber(result.cooling.totalKw, 2)} kW (${formatNumber(result.cooling.frigoriasHour, 0)} frigorías/h). Carga sensible: ${formatNumber(result.cooling.sensibleW / 1000, 2)} kW. Carga latente: ${formatNumber(result.cooling.latentW / 1000, 2)} kW.`,
    })
    setMessage('Se ha creado un borrador en Intervenciones.')
    setMessageTone('success')
  }

  const coolingBreakdown = useMemo(() => result ? [
    ['Muros', result.cooling.wallsW],
    ['Ventanas por transmisión', result.cooling.windowsTransmissionW],
    ['Cubierta', result.cooling.roofW],
    ['Suelo', result.cooling.floorW],
    ['Radiación solar', result.cooling.solarW],
    ['Ventilación sensible', result.cooling.ventilationSensibleW],
    ['Ventilación latente', result.cooling.ventilationLatentW],
    ['Personas sensible', result.cooling.peopleSensibleW],
    ['Personas latente', result.cooling.peopleLatentW],
    ['Iluminación', result.cooling.lightingW],
    ['Equipos', result.cooling.equipmentW],
  ] as const : [], [result])

  return <main className="sz-screen sz-pt-screen">
    <PageTitle eyebrow="Climatización" title="Carga térmica y frigorías" description="Dimensionado por transmisión, radiación solar, ventilación, humedad, ocupación, iluminación y equipos." />

    <div className="sz-mode-switch" aria-label="Pestañas de carga térmica">
      <button type="button" className={tab === 'datos' ? 'active' : ''} onClick={() => setTab('datos')}>Datos</button>
      <button type="button" className={tab === 'resultados' ? 'active' : ''} onClick={() => setTab('resultados')}>Resultados</button>
      <button type="button" className={tab === 'metodo' ? 'active' : ''} onClick={() => setTab('metodo')}>Método</button>
    </div>

    {tab === 'datos' && <>
      <section className="sz-panel sz-form">
        <h2>Geometría y cerramientos</h2>
        <div className="sz-two-columns">
          <label>Superficie útil m²<input inputMode="decimal" value={form.floorAreaM2} onChange={(event) => setField('floorAreaM2', event.target.value)} /></label>
          <label>Altura media m<input inputMode="decimal" value={form.heightM} onChange={(event) => setField('heightM', event.target.value)} /></label>
          <label>Muros exteriores m²<input inputMode="decimal" value={form.exteriorWallAreaM2} onChange={(event) => setField('exteriorWallAreaM2', event.target.value)} /></label>
          <label>Ventanas m²<input inputMode="decimal" value={form.windowAreaM2} onChange={(event) => setField('windowAreaM2', event.target.value)} /></label>
          <label>Cubierta expuesta m²<input inputMode="decimal" value={form.roofAreaM2} onChange={(event) => setField('roofAreaM2', event.target.value)} /></label>
          <label>Suelo expuesto m²<input inputMode="decimal" value={form.exposedFloorAreaM2} onChange={(event) => setField('exposedFloorAreaM2', event.target.value)} /></label>
        </div>
        <h3>Transmitancias U</h3>
        <div className="sz-two-columns">
          <label>Muros W/m²K<input inputMode="decimal" value={form.uWallWm2K} onChange={(event) => setField('uWallWm2K', event.target.value)} /></label>
          <label>Ventanas W/m²K<input inputMode="decimal" value={form.uWindowWm2K} onChange={(event) => setField('uWindowWm2K', event.target.value)} /></label>
          <label>Cubierta W/m²K<input inputMode="decimal" value={form.uRoofWm2K} onChange={(event) => setField('uRoofWm2K', event.target.value)} /></label>
          <label>Suelo W/m²K<input inputMode="decimal" value={form.uFloorWm2K} onChange={(event) => setField('uFloorWm2K', event.target.value)} /></label>
        </div>
      </section>

      <section className="sz-panel sz-form">
        <h2>Condiciones de cálculo</h2>
        <div className="sz-two-columns">
          <label>Exterior invierno °C<input inputMode="decimal" value={form.winterOutdoorC} onChange={(event) => setField('winterOutdoorC', event.target.value)} /></label>
          <label>Interior invierno °C<input inputMode="decimal" value={form.winterIndoorC} onChange={(event) => setField('winterIndoorC', event.target.value)} /></label>
          <label>Exterior verano °C<input inputMode="decimal" value={form.summerOutdoorC} onChange={(event) => setField('summerOutdoorC', event.target.value)} /></label>
          <label>Interior verano °C<input inputMode="decimal" value={form.summerIndoorC} onChange={(event) => setField('summerIndoorC', event.target.value)} /></label>
          <label>Humedad exterior %<input inputMode="decimal" value={form.outdoorRelativeHumidityPct} onChange={(event) => setField('outdoorRelativeHumidityPct', event.target.value)} /></label>
          <label>Humedad interior %<input inputMode="decimal" value={form.indoorRelativeHumidityPct} onChange={(event) => setField('indoorRelativeHumidityPct', event.target.value)} /></label>
          <label>Renovaciones aire 1/h<input inputMode="decimal" value={form.airChangesPerHour} onChange={(event) => setField('airChangesPerHour', event.target.value)} /></label>
          <label>Recuperador %<input inputMode="decimal" value={form.heatRecoveryEfficiencyPct} onChange={(event) => setField('heatRecoveryEfficiencyPct', event.target.value)} /></label>
        </div>
      </section>

      <section className="sz-panel sz-form">
        <h2>Ganancias internas y solares</h2>
        <div className="sz-two-columns">
          <label>Ocupantes<input inputMode="numeric" value={form.occupants} onChange={(event) => setField('occupants', event.target.value)} /></label>
          <label>Iluminación W/m²<input inputMode="decimal" value={form.lightingWm2} onChange={(event) => setField('lightingWm2', event.target.value)} /></label>
          <label>Sensible por persona W<input inputMode="decimal" value={form.sensibleWPerPerson} onChange={(event) => setField('sensibleWPerPerson', event.target.value)} /></label>
          <label>Latente por persona W<input inputMode="decimal" value={form.latentWPerPerson} onChange={(event) => setField('latentWPerPerson', event.target.value)} /></label>
          <label>Equipos eléctricos W<input inputMode="decimal" value={form.equipmentW} onChange={(event) => setField('equipmentW', event.target.value)} /></label>
          <label>Orientación principal<select value={form.orientation} onChange={(event) => setField('orientation', event.target.value as Orientation)}>{(['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as Orientation[]).map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Factor solar vidrio g<input inputMode="decimal" value={form.glazingSolarFactor} onChange={(event) => setField('glazingSolarFactor', event.target.value)} /></label>
          <label>Factor de sombra<input inputMode="decimal" value={form.shadingFactor} onChange={(event) => setField('shadingFactor', event.target.value)} /></label>
          <label>Margen de seguridad %<input inputMode="decimal" value={form.safetyFactorPct} onChange={(event) => setField('safetyFactorPct', event.target.value)} /></label>
        </div>
        <div className="sz-button-row"><button className="sz-button primary" type="button" onClick={calculate}><Snowflake />Calcular frigorías</button><button className="sz-button secondary" type="button" onClick={reset}><RotateCcw />Restablecer</button></div>
      </section>
    </>}

    {tab === 'resultados' && <>
      <section className="sz-result">
        <small>Potencia frigorífica de diseño</small>
        <strong>{result ? `${formatNumber(result.cooling.totalKw, 2)} kW` : '—'}</strong>
        {result && <div className="sz-data-list">
          {resultRow('Frigorías por hora', `${formatNumber(result.cooling.frigoriasHour, 0)} frig/h`)}
          {resultRow('BTU por hora', `${formatNumber(result.cooling.btuHour, 0)} BTU/h`)}
          {resultRow('Carga sensible', `${formatNumber(result.cooling.sensibleW / 1000, 2)} kW`)}
          {resultRow('Carga latente', `${formatNumber(result.cooling.latentW / 1000, 2)} kW`)}
          {resultRow('SHR', formatNumber(result.cooling.sensibleHeatRatio, 2))}
          {resultRow('Caudal de aire orientativo', `${formatNumber(result.cooling.recommendedAirflowM3H, 0)} m³/h`)}
          {resultRow('Condensado estimado', `${formatNumber(result.cooling.condensateLitresHour, 2)} l/h`)}
          {resultRow('Calefacción de diseño', `${formatNumber(result.heating.totalKw, 2)} kW`)}
        </div>}
        <div className="sz-button-row"><button className="sz-button secondary" type="button" disabled={!result} onClick={save}><Save />Guardar</button><button className="sz-button secondary" type="button" disabled={!result} onClick={addToIntervention}><ClipboardPlus />Intervención</button><button className="sz-button ghost" type="button" disabled={!result} onClick={() => window.print()}><Printer />PDF / imprimir</button></div>
      </section>

      {result && <section className="sz-panel"><h2>Desglose de refrigeración</h2><div className="sz-data-list">{coolingBreakdown.map(([label, value]) => resultRow(label, `${formatNumber(value, 0)} W`))}</div><h2>Desglose de calefacción</h2><div className="sz-data-list">{resultRow('Muros', `${formatNumber(result.heating.wallsW, 0)} W`)}{resultRow('Ventanas', `${formatNumber(result.heating.windowsW, 0)} W`)}{resultRow('Cubierta', `${formatNumber(result.heating.roofW, 0)} W`)}{resultRow('Suelo', `${formatNumber(result.heating.floorW, 0)} W`)}{resultRow('Ventilación', `${formatNumber(result.heating.ventilationW, 0)} W`)}</div></section>}
    </>}

    {tab === 'metodo' && <section className="sz-panel"><h2>Qué calcula</h2><ul className="sz-check-list"><li>Transmisión por muros, ventanas, cubierta y suelo mediante U · A · ΔT.</li><li>Ganancia solar según orientación, superficie acristalada, factor solar y sombreado.</li><li>Ventilación sensible y latente, incluyendo recuperación de calor.</li><li>Cargas de personas, iluminación y equipos.</li><li>Potencia total, frigorías, BTU/h, SHR, caudal de aire y condensado.</li><li>Carga de calefacción para reutilizarla en el dimensionado de aerotermia.</li></ul><h2>Uso profesional</h2><p>Introduce superficies y transmitancias reales del proyecto. Las temperaturas exteriores, radiación, ventilación y simultaneidades deben corresponder a la localidad y al uso del edificio.</p></section>}

    {message && <Notice tone={messageTone}><p>{message}</p></Notice>}
    <Notice tone="warning"><p>El resultado es una ayuda de dimensionado. No sustituye un proyecto térmico, el cálculo horario, la selección del fabricante ni la comprobación reglamentaria.</p></Notice>
  </main>
}
