import { PsychrometricsComparisonInputSchema, type PsychrometricsComparisonInput } from '../../validation/psychrometrics'
import type { CalculationContext, CalculationEnvelope } from '../../types'
import { defaultCalculationContext } from '../../types'
import { calculateFromRelativeHumidity } from './calculate-from-relative-humidity'
import { psychrometricsSource } from './envelope'
import type { PsychrometricComparisonResult, PsychrometricProcessType } from './types'

const EPS_TEMP = 0.3
const EPS_HUMIDITY = 0.2

function classifyProcess(deltaDryBulbC: number, deltaHumidityGKg: number): { type: PsychrometricProcessType; label: string } {
  const tempUp = deltaDryBulbC > EPS_TEMP
  const tempDown = deltaDryBulbC < -EPS_TEMP
  const humUp = deltaHumidityGKg > EPS_HUMIDITY
  const humDown = deltaHumidityGKg < -EPS_HUMIDITY
  if (!tempUp && !tempDown && !humUp && !humDown) return { type: 'stable', label: 'Estado prácticamente estable' }
  if (tempUp && !humUp && !humDown) return { type: 'sensible-heating', label: 'Calentamiento sensible' }
  if (tempDown && !humUp && !humDown) return { type: 'sensible-cooling', label: 'Enfriamiento sensible' }
  if (tempDown && humDown) return { type: 'cooling-dehumidification', label: 'Enfriamiento con deshumidificación' }
  if (tempUp && humUp) return { type: 'heating-humidification', label: 'Calentamiento con humidificación' }
  if (tempDown && humUp) return { type: 'cooling-humidification', label: 'Enfriamiento con humidificación' }
  if (tempUp && humDown) return { type: 'heating-dehumidification', label: 'Calentamiento con deshumidificación' }
  return { type: 'mixed', label: 'Cambio mixto' }
}

export function comparePsychrometricStates(input: PsychrometricsComparisonInput, context: CalculationContext = defaultCalculationContext()): CalculationEnvelope<PsychrometricsComparisonInput, PsychrometricComparisonResult> {
  const parsed = PsychrometricsComparisonInputSchema.parse(input)
  const a = calculateFromRelativeHumidity(parsed.a, context).result
  const b = calculateFromRelativeHumidity(parsed.b, context).result
  const deltas = {
    dryBulbC: b.dryBulbC - a.dryBulbC,
    relativeHumidityPct: b.relativeHumidityPct - a.relativeHumidityPct,
    dewPointC: b.dewPointC - a.dewPointC,
    humidityRatioGKg: b.humidityRatioGKg - a.humidityRatioGKg,
    absoluteHumidityGM3: b.absoluteHumidityGM3 - a.absoluteHumidityGM3,
    moistAirEnthalpyKJkg: b.moistAirEnthalpyKJkg - a.moistAirEnthalpyKJkg,
    moistAirVolumeM3kg: b.moistAirVolumeM3kg - a.moistAirVolumeM3kg,
  }
  const process = classifyProcess(deltas.dryBulbC, deltas.humidityRatioGKg)
  const result: PsychrometricComparisonResult = {
    a,
    b,
    deltas,
    processType: process.type,
    processLabel: process.label,
    summary: `${process.label}: ΔT ${deltas.dryBulbC.toFixed(1)} K y Δw ${deltas.humidityRatioGKg.toFixed(2)} g/kg.`,
  }
  return {
    module: 'psychrometrics',
    calculator: 'psychrometric-comparison',
    calculatedAt: context.calculatedAt,
    source: psychrometricsSource,
    units: { pressure: 'Pa', pressureKind: 'absolute', temperature: 'C', result: 'psychrometric-comparison' },
    inputs: parsed,
    result,
    interpretation: {
      title: result.processLabel,
      summary: `${result.summary} Interpretación orientativa; confirmar con mediciones estables y objetivo de diseño.`,
      indicator: process.type === 'cooling-dehumidification' || process.type === 'heating-humidification' ? 'normal' : 'info',
      causes: ['Comparación entre dos estados psicrométricos calculados con PsychroLib.', 'No representa por sí sola la capacidad de una batería o equipo sin caudal de aire.'],
      nextChecks: ['Añadir caudal de aire para estimar potencia sensible/latente', 'Confirmar presión atmosférica y ubicación de medición', 'Comparar con condiciones de diseño'],
      formula: 'Diferencias B - A sobre temperatura, humedad, entalpía y volumen específico.',
    },
    warnings: [],
  }
}
