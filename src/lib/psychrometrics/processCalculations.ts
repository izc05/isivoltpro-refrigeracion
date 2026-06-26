import type { PsychrometricState } from '../../calculation-engine/formulas/psychrometrics'

export type PsychrometricProcessPower = {
  sensibleKw: number
  latentKw: number
  totalKw: number
}

export function classifyPsychrometricProcess(a: PsychrometricState, b: PsychrometricState) {
  const deltaT = b.dryBulbC - a.dryBulbC
  const deltaW = b.humidityRatioGKg - a.humidityRatioGKg
  const tempUp = deltaT > 0.3
  const tempDown = deltaT < -0.3
  const humUp = deltaW > 0.2
  const humDown = deltaW < -0.2
  if (tempUp && !humUp && !humDown) return 'Calentamiento sensible'
  if (tempDown && !humUp && !humDown) return 'Enfriamiento sensible'
  if (!tempUp && !tempDown && humUp) return 'Humidificación'
  if (!tempUp && !tempDown && humDown) return 'Deshumidificación'
  if (tempUp && humUp) return 'Calentamiento con humidificación'
  if (tempDown && humDown) return 'Enfriamiento con deshumidificación'
  if (tempUp && humDown) return 'Calentamiento con deshumidificación'
  if (tempDown && humUp) return 'Enfriamiento con humidificación'
  return 'Estado prácticamente estable'
}

export function calculateProcessPower(a: PsychrometricState, b: PsychrometricState, airflowM3h: number): PsychrometricProcessPower | null {
  if (!Number.isFinite(airflowM3h) || airflowM3h <= 0) return null
  const averageDensity = (a.moistAirDensityKgM3 + b.moistAirDensityKgM3) / 2
  const dryAirMassFlowKgs = (airflowM3h / 3600) * averageDensity
  const sensibleKw = dryAirMassFlowKgs * 1.006 * (b.dryBulbC - a.dryBulbC)
  const totalKw = dryAirMassFlowKgs * (b.moistAirEnthalpyKJkg - a.moistAirEnthalpyKJkg)
  return { sensibleKw, totalKw, latentKw: totalKw - sensibleKw }
}
