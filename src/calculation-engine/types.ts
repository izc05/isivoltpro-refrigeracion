import type { PressureKind, PressureUnit } from '../domain/units'
import type { TemperatureUnit } from '../domain/technical-conversions'

export type CalculationModule =
  | 'refrigerants'
  | 'diagnostics'
  | 'ducts'
  | 'psychrometrics'
  | 'ventilation'
  | 'thermal-loads'
  | 'hydraulics'
  | 'aerothermal'
  | 'ahu'
  | 'electricity'
  | 'equipment'
  | 'reports'

export type CalculationSeverity = 'info' | 'warning' | 'danger'

export type CalculationWarning = {
  code: string
  severity: CalculationSeverity
  message: string
}

export type CalculationSource = {
  provider: string
  version: string
  generatedAt: string | null
  reviewedAt?: string
  limitations: string[]
}

export type CalculationInterpretation = {
  title: string
  summary: string
  indicator?: 'low' | 'normal' | 'high' | 'info'
  causes: string[]
  nextChecks: string[]
  formula?: string
  example?: string
}

export type CalculationEnvelope<TInputs, TResult> = {
  module: CalculationModule
  calculator: string
  calculatedAt: string
  source: CalculationSource
  units: {
    pressure?: PressureUnit
    pressureKind?: PressureKind
    temperature?: TemperatureUnit
    result?: string
    [key: string]: string | undefined
  }
  inputs: TInputs
  result: TResult
  interpretation: CalculationInterpretation
  warnings: CalculationWarning[]
}

export type CalculationContext = {
  calculatedAt: string
}

export function defaultCalculationContext(): CalculationContext {
  return { calculatedAt: new Date().toISOString() }
}
