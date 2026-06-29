import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownUp, RotateCcw } from 'lucide-react'
import {
  calculateFromRelativeHumidity,
  comparePsychrometricStates,
  pressureRangeWarning,
  type PsychrometricPressureUnit,
} from '../calculation-engine/formulas/psychrometrics'
import { parseLocalizedNumber } from '../domain/units'
import { Notice, PageTitle, useSettings } from './shared'
import { PsychrometricChart } from './psychrometric-chart'
import { PsychrometricChartActions } from './psychrometric-chart-actions'
import { PsychrometricPressureControl, type PsychrometricPressureMode } from './psychrometric-pressure-control'
import { pressureToApproximateAltitudeM, pressureValueForUnit, resolvePsychrometricPressurePa } from './psychrometric-pressure-utils'
import { PsychrometricProcessCard } from './psychrometric-process-card'
import { psychrometricPresets } from './psychrometric-presets'

const numberFrom = (value: string) => parseLocalizedNumber(value)

export function PsychrometricChartWorkbench() {
  const { atmospherePa, altitudeM } = useSettings()
  const chartHostRef = useRef<HTMLDivElement>(null)
  const [chartSvg, setChartSvg] = useState<SVGSVGElement | null>(null)
  const [dryA, setDryA] = useState('24')
  const [rhA, setRhA] = useState('50')
  const [compare, setCompare] = useState(false)
  const [dryB, setDryB] = useState('14')
  const [rhB, setRhB] = useState('90')
  const [pressureMode, setPressureMode] = useState<PsychrometricPressureMode>('settings')
  const [customAltitude, setCustomAltitude] = useState(String(Math.round(altitudeM)))
  const [manualPressure, setManualPressure] = useState(String(Math.round(atmospherePa)))
  const [pressureUnit, setPressureUnit] = useState<PsychrometricPressureUnit>('Pa')

  const effectivePressurePa = useMemo(() => {
    try {
      return resolvePsychrometricPressurePa({
        mode: pressureMode,
        settingsPressurePa: atmospherePa,
        altitudeInput: customAltitude,
        manualInput: manualPressure,
        manualUnit: pressureUnit,
      })
    } catch {
      return Number.NaN
    }
  }, [atmospherePa, customAltitude, manualPressure, pressureMode, pressureUnit])

  const pressureWarning = Number.isFinite(effectivePressurePa) ? pressureRangeWarning(effectivePressurePa) : 'Introduce una presión atmosférica válida.'
  const approximateAltitudeM = pressureToApproximateAltitudeM(effectivePressurePa)

  const stateCalculation = useMemo(() => {
    try { return calculateFromRelativeHumidity({ dryBulbC: numberFrom(dryA), relativeHumidityPct: numberFrom(rhA), pressurePa: effectivePressurePa }) }
    catch { return null }
  }, [dryA, effectivePressurePa, rhA])
  const state = stateCalculation?.result ?? null

  const comparisonCalculation = useMemo(() => {
    if (!compare) return null
    try {
      return comparePsychrometricStates({
        a: { dryBulbC: numberFrom(dryA), relativeHumidityPct: numberFrom(rhA), pressurePa: effectivePressurePa },
        b: { dryBulbC: numberFrom(dryB), relativeHumidityPct: numberFrom(rhB), pressurePa: effectivePressurePa },
      })
    } catch { return null }
  }, [compare, dryA, dryB, effectivePressurePa, rhA, rhB])
  const comparison = comparisonCalculation?.result ?? null
  const activeCalculation = compare ? comparisonCalculation : stateCalculation

  useEffect(() => {
    setChartSvg(chartHostRef.current?.querySelector<SVGSVGElement>('svg.psychro-chart-svg') ?? null)
  }, [compare, comparison, state])

  const changePressureUnit = (nextUnit: PsychrometricPressureUnit) => {
    let currentPressurePa = effectivePressurePa
    if (!Number.isFinite(currentPressurePa)) currentPressurePa = atmospherePa
    setPressureUnit(nextUnit)
    setManualPressure(pressureValueForUnit(currentPressurePa, nextUnit))
  }

  const swap = () => {
    const first = [dryA, rhA]
    setDryA(dryB); setRhA(rhB); setDryB(first[0]); setRhB(first[1])
  }

  const reset = () => {
    setDryA('24'); setRhA('50'); setDryB('14'); setRhB('90'); setCompare(false)
  }

  return <main className="sz-screen psychro-chart-workbench">
    <PageTitle eyebrow="Climatización" title="Carta psicrométrica interactiva" description="Localiza estados de aire, visualiza procesos y genera documentación técnica." />
    <section className="sz-panel sz-form psychro-chart-inputs">
      <div className="segmented two-segment"><button type="button" className={!compare ? 'active' : ''} onClick={() => setCompare(false)}>Un estado</button><button type="button" className={compare ? 'active' : ''} onClick={() => setCompare(true)}>Comparar A → B</button></div>
      <div className="psychro-presets">{psychrometricPresets.map(([label, dry, rh]) => <button type="button" key={label} onClick={() => { setDryA(dry); setRhA(rh) }}>{label}</button>)}</div>
      <div className="sz-two-columns"><label>Temperatura seca A °C<input inputMode="decimal" value={dryA} onChange={(event) => setDryA(event.target.value)} /></label><label>Humedad relativa A %<input inputMode="decimal" value={rhA} onChange={(event) => setRhA(event.target.value)} /></label></div>
      {compare && <div className="sz-two-columns"><label>Temperatura seca B °C<input inputMode="decimal" value={dryB} onChange={(event) => setDryB(event.target.value)} /></label><label>Humedad relativa B %<input inputMode="decimal" value={rhB} onChange={(event) => setRhB(event.target.value)} /></label></div>}
      <PsychrometricPressureControl
        mode={pressureMode}
        onModeChange={setPressureMode}
        altitudeM={customAltitude}
        onAltitudeChange={setCustomAltitude}
        manualPressure={manualPressure}
        onManualPressureChange={setManualPressure}
        pressureUnit={pressureUnit}
        onPressureUnitChange={changePressureUnit}
        effectivePressurePa={effectivePressurePa}
        approximateAltitudeM={approximateAltitudeM}
        warning={pressureWarning}
      />
      <div className="sz-button-row">{compare && <button className="sz-button secondary" type="button" onClick={swap}><ArrowDownUp />Intercambiar</button>}<button className="sz-button secondary" type="button" onClick={reset}><RotateCcw />Restablecer</button></div>
    </section>
    <div ref={chartHostRef} className="psychro-chart-host"><PsychrometricChart state={state} comparison={comparison} pressurePa={effectivePressurePa} /></div>
    {comparison && <PsychrometricProcessCard comparison={comparison} />}
    <PsychrometricChartActions
      svg={chartSvg}
      calculation={activeCalculation}
      state={compare ? null : state}
      comparison={comparison}
      pressurePa={effectivePressurePa}
    />
    {!state && <Notice tone="danger"><p>Revisa temperatura, humedad relativa y presión atmosférica.</p></Notice>}
  </main>
}
