import type { PsychrometricPressureUnit } from '../calculation-engine/formulas/psychrometrics'
import { formatNumber } from './shared'
import './psychrometric-pressure-control.css'

export type PsychrometricPressureMode = 'settings' | 'altitude' | 'manual'

type Props = {
  mode: PsychrometricPressureMode
  onModeChange: (mode: PsychrometricPressureMode) => void
  altitudeM: string
  onAltitudeChange: (value: string) => void
  manualPressure: string
  onManualPressureChange: (value: string) => void
  pressureUnit: PsychrometricPressureUnit
  onPressureUnitChange: (unit: PsychrometricPressureUnit) => void
  effectivePressurePa: number
  approximateAltitudeM: number
  warning: string | null
}

export function PsychrometricPressureControl(props: Props) {
  return <section className="psychro-pressure-control" aria-labelledby="psychro-pressure-title">
    <div className="psychro-pressure-heading">
      <div><small>Condiciones atmosféricas</small><h2 id="psychro-pressure-title">Presión de cálculo</h2></div>
      <strong>{Number.isFinite(props.effectivePressurePa) ? `${formatNumber(props.effectivePressurePa / 1000, 2)} kPa` : 'No válida'}</strong>
    </div>

    <div className="segmented three-segment" aria-label="Origen de la presión atmosférica">
      <button type="button" className={props.mode === 'settings' ? 'active' : ''} onClick={() => props.onModeChange('settings')}>Ajustes</button>
      <button type="button" className={props.mode === 'altitude' ? 'active' : ''} onClick={() => props.onModeChange('altitude')}>Altitud</button>
      <button type="button" className={props.mode === 'manual' ? 'active' : ''} onClick={() => props.onModeChange('manual')}>Manual</button>
    </div>

    {props.mode === 'altitude' && <label>Altitud sobre el nivel del mar (m)<input inputMode="decimal" value={props.altitudeM} onChange={(event) => props.onAltitudeChange(event.target.value)} /></label>}
    {props.mode === 'manual' && <div className="sz-two-columns"><label>Presión atmosférica<input inputMode="decimal" value={props.manualPressure} onChange={(event) => props.onManualPressureChange(event.target.value)} /></label><label>Unidad<select value={props.pressureUnit} onChange={(event) => props.onPressureUnitChange(event.target.value as PsychrometricPressureUnit)}><option value="Pa">Pa</option><option value="hPa">hPa</option><option value="mbar">mbar</option><option value="kPa">kPa</option><option value="bar_abs">bar abs</option></select></label></div>}

    <div className="psychro-pressure-summary">
      <p><span>Presión utilizada</span><strong>{Number.isFinite(props.effectivePressurePa) ? `${formatNumber(props.effectivePressurePa, 0)} Pa` : 'No válida'}</strong></p>
      <p><span>Altitud equivalente</span><strong>{Number.isFinite(props.approximateAltitudeM) ? `${formatNumber(props.approximateAltitudeM, 0)} m` : 'No disponible'}</strong></p>
    </div>

    {props.warning && <p className="psychro-pressure-warning">{props.warning}</p>}
  </section>
}
