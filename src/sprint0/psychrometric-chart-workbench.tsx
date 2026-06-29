import { useMemo, useState } from 'react'
import { ArrowDownUp, RotateCcw } from 'lucide-react'
import { calculateFromRelativeHumidity, comparePsychrometricStates } from '../calculation-engine/formulas/psychrometrics'
import { parseLocalizedNumber } from '../domain/units'
import { Notice, PageTitle, useSettings } from './shared'
import { PsychrometricChart } from './psychrometric-chart'
import { PsychrometricProcessCard } from './psychrometric-process-card'
import { psychrometricPresets } from './psychrometric-presets'

const numberFrom = (value: string) => parseLocalizedNumber(value)

export function PsychrometricChartWorkbench() {
  const { atmospherePa } = useSettings()
  const [dryA, setDryA] = useState('24')
  const [rhA, setRhA] = useState('50')
  const [compare, setCompare] = useState(false)
  const [dryB, setDryB] = useState('14')
  const [rhB, setRhB] = useState('90')

  const state = useMemo(() => {
    try { return calculateFromRelativeHumidity({ dryBulbC: numberFrom(dryA), relativeHumidityPct: numberFrom(rhA), pressurePa: atmospherePa }).result }
    catch { return null }
  }, [atmospherePa, dryA, rhA])

  const comparison = useMemo(() => {
    if (!compare) return null
    try {
      return comparePsychrometricStates({
        a: { dryBulbC: numberFrom(dryA), relativeHumidityPct: numberFrom(rhA), pressurePa: atmospherePa },
        b: { dryBulbC: numberFrom(dryB), relativeHumidityPct: numberFrom(rhB), pressurePa: atmospherePa },
      }).result
    } catch { return null }
  }, [atmospherePa, compare, dryA, dryB, rhA, rhB])

  const swap = () => {
    const first = [dryA, rhA]
    setDryA(dryB); setRhA(rhB); setDryB(first[0]); setRhB(first[1])
  }

  const reset = () => {
    setDryA('24'); setRhA('50'); setDryB('14'); setRhB('90'); setCompare(false)
  }

  return <main className="sz-screen psychro-chart-workbench">
    <PageTitle eyebrow="Climatización" title="Carta psicrométrica interactiva" description="Localiza estados de aire y visualiza procesos A → B." />
    <section className="sz-panel sz-form psychro-chart-inputs">
      <div className="segmented two-segment"><button type="button" className={!compare ? 'active' : ''} onClick={() => setCompare(false)}>Un estado</button><button type="button" className={compare ? 'active' : ''} onClick={() => setCompare(true)}>Comparar A → B</button></div>
      <div className="psychro-presets">{psychrometricPresets.map(([label, dry, rh]) => <button type="button" key={label} onClick={() => { setDryA(dry); setRhA(rh) }}>{label}</button>)}</div>
      <div className="sz-two-columns"><label>Temperatura seca A °C<input inputMode="decimal" value={dryA} onChange={(event) => setDryA(event.target.value)} /></label><label>Humedad relativa A %<input inputMode="decimal" value={rhA} onChange={(event) => setRhA(event.target.value)} /></label></div>
      {compare && <div className="sz-two-columns"><label>Temperatura seca B °C<input inputMode="decimal" value={dryB} onChange={(event) => setDryB(event.target.value)} /></label><label>Humedad relativa B %<input inputMode="decimal" value={rhB} onChange={(event) => setRhB(event.target.value)} /></label></div>}
      <div className="sz-button-row">{compare && <button className="sz-button secondary" type="button" onClick={swap}><ArrowDownUp />Intercambiar</button>}<button className="sz-button secondary" type="button" onClick={reset}><RotateCcw />Restablecer</button></div>
    </section>
    <PsychrometricChart state={state} comparison={comparison} pressurePa={atmospherePa} />
    {comparison && <PsychrometricProcessCard comparison={comparison} />}
    {!state && <Notice tone="danger"><p>Revisa temperatura y humedad relativa.</p></Notice>}
  </main>
}
