import psychrolib from 'psychrolib'
import { interpretPsychrometrics } from '../interpretation/psychrometrics'
import type { CalculationContext, CalculationEnvelope, CalculationWarning } from '../types'
import { defaultCalculationContext } from '../types'
import { PsychrometricsInputSchema, type PsychrometricsInput } from '../validation/psychrometrics'

export type PsychrometricsResult = {
  humidityRatioKgKg: number
  wetBulbC: number
  dewPointC: number
  vaporPressurePa: number
  moistAirEnthalpyJkg: number
  moistAirEnthalpyKJkg: number
  moistAirVolumeM3kg: number
  degreeOfSaturation: number
}

const warnings: CalculationWarning[] = [
  { code: 'ORIENTATIVE_RESULT', severity: 'info', message: 'Resultado orientativo; una medición de campo y el proyecto/fabricante tienen prioridad.' },
  { code: 'PSYCHROLIB_SOURCE', severity: 'info', message: 'Cálculo realizado con PsychroLib, librería MIT basada en ASHRAE Handbook - Fundamentals.' },
]

export function calculatePsychrometricsFromRelHum(input: PsychrometricsInput, context: CalculationContext = defaultCalculationContext()): CalculationEnvelope<PsychrometricsInput, PsychrometricsResult> {
  const parsed = PsychrometricsInputSchema.parse(input)
  psychrolib.SetUnitSystem(psychrolib.SI)
  const [humidityRatioKgKg, wetBulbC, dewPointC, vaporPressurePa, moistAirEnthalpyJkg, moistAirVolumeM3kg, degreeOfSaturation] = psychrolib.CalcPsychrometricsFromRelHum(
    parsed.dryBulbC,
    parsed.relativeHumidityPct / 100,
    parsed.pressurePa,
  )

  return {
    module: 'psychrometrics',
    calculator: 'dry-bulb-relative-humidity',
    calculatedAt: context.calculatedAt,
    source: {
      provider: 'PsychroLib npm package',
      version: '1.1.1',
      generatedAt: null,
      reviewedAt: '2026-06-25',
      limitations: ['SI units only in this adapter. Based on PsychroLib/ASHRAE equations; verify design work against official standards and project criteria.'],
    },
    units: { temperature: 'C', pressure: 'Pa', humidity: '%', result: 'SI' },
    inputs: parsed,
    result: {
      humidityRatioKgKg,
      wetBulbC,
      dewPointC,
      vaporPressurePa,
      moistAirEnthalpyJkg,
      moistAirEnthalpyKJkg: moistAirEnthalpyJkg / 1000,
      moistAirVolumeM3kg,
      degreeOfSaturation,
    },
    interpretation: interpretPsychrometrics(parsed.relativeHumidityPct),
    warnings,
  }
}
