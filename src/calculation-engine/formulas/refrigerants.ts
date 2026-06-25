import { calculateAdditionalChargeWithUnits } from '../../domain/charge'
import { calculateSubcooling as domainSubcooling, calculateSuperheat as domainSuperheat, interpolatePressureFromTemperature, interpolateTemperatureFromPressure } from '../../domain/refrigerants/calculations'
import { DEFAULT_ATMOSPHERE_PA, paAbsoluteToPressure, pressureToPaAbsolute, type PressureKind, type PressureUnit } from '../../domain/units'
import { convertTemperature } from '../../domain/technical-conversions'
import { refrigerantMetadata } from '../../data/refrigerant-metadata'
import { interpretAdditionalCharge, interpretComparison, interpretPressureTemperature, interpretSubcooling, interpretSuperheat } from '../interpretation/refrigerants'
import { generatedRefrigerantProvider, type RefrigerantProvider } from '../providers/refrigerant-provider'
import type { CalculationContext, CalculationEnvelope, CalculationWarning } from '../types'
import { defaultCalculationContext } from '../types'
import { AdditionalChargeInputSchema, PressureTemperatureInputSchema, RefrigerantComparisonInputSchema, SubcoolingInputSchema, SuperheatInputSchema, type AdditionalChargeInput, type PressureTemperatureInput, type RefrigerantComparisonInput, type SubcoolingInput, type SuperheatInput } from '../validation/refrigerants'

function requireTable(provider: RefrigerantProvider, refrigerant: string) {
  const table = provider.getTable(refrigerant)
  if (!table) throw new Error(`No existe el refrigerante ${refrigerant} en el proveedor configurado.`)
  if (table.points.length < 2) throw new Error(`No hay tabla P/T validada para ${refrigerant}.`)
  return table
}

function equivalentPressures(paAbs: number, atmospherePa: number) {
  const units: PressureUnit[] = ['bar', 'PSI', 'kPa', 'MPa']
  return Object.fromEntries(units.flatMap((unit) => [
    [`${unit}_absolute`, paAbsoluteToPressure(paAbs, unit, 'absolute', atmospherePa)],
    [`${unit}_gauge`, paAbsoluteToPressure(paAbs, unit, 'gauge', atmospherePa)],
  ])) as Record<string, number>
}

function baseWarnings(refrigerant: string, refrigerantType: string, limitations: string[]): CalculationWarning[] {
  const warnings: CalculationWarning[] = [
    { code: 'MANUFACTURER_PRIORITY', severity: 'info', message: 'Los valores y procedimientos del fabricante tienen prioridad sobre este cálculo.' },
    { code: 'APPROXIMATE_INTERPOLATION', severity: 'info', message: 'Resultado aproximado por interpolación de tabla P/T verificada.' },
  ]
  if (refrigerantType === 'zeotropic') {
    warnings.push({ code: 'DEW_BUBBLE_REQUIRED', severity: 'warning', message: 'Mezcla con glide: usa rocío para recalentamiento y burbuja para subenfriamiento.' })
  }
  if (limitations.length) {
    warnings.push({ code: 'SOURCE_LIMITATIONS', severity: 'warning', message: limitations.join(' ') })
  }
  const metaWarnings = refrigerantMetadata[refrigerant as keyof typeof refrigerantMetadata]?.warnings ?? []
  for (const message of metaWarnings.slice(0, 2)) warnings.push({ code: 'REFRIGERANT_SAFETY', severity: 'warning', message })
  return warnings
}

export type PressureTemperatureResult = {
  branch: 'dew' | 'bubble'
  pressurePaAbs: number
  pressureGaugePa: number
  pressureEquivalents: Record<string, number>
  temperatureC: number | null
  temperatureDisplay: number | null
  dewC: number | null
  bubbleC: number | null
}

export function calculatePressureTemperature(input: PressureTemperatureInput, provider = generatedRefrigerantProvider, context: CalculationContext = defaultCalculationContext()): CalculationEnvelope<PressureTemperatureInput, PressureTemperatureResult> {
  const parsed = PressureTemperatureInputSchema.parse(input)
  const table = requireTable(provider, parsed.refrigerant)
  const atmospherePa = parsed.atmospherePa ?? DEFAULT_ATMOSPHERE_PA
  let pressurePaAbs: number
  let dewC: number | null
  let bubbleC: number | null

  if (parsed.mode === 'pressure-to-temperature') {
    pressurePaAbs = pressureToPaAbsolute(parsed.pressure as number, parsed.pressureUnit, parsed.pressureKind, atmospherePa)
    dewC = interpolateTemperatureFromPressure(table, pressurePaAbs, 'dew')
    bubbleC = interpolateTemperatureFromPressure(table, pressurePaAbs, 'bubble')
  } else {
    const temperatureC = convertTemperature(parsed.temperature as number, parsed.temperatureUnit, 'C')
    dewC = temperatureC
    bubbleC = temperatureC
    pressurePaAbs = interpolatePressureFromTemperature(table, temperatureC, parsed.branch)
  }

  const selectedC = parsed.branch === 'dew' ? dewC : bubbleC
  return {
    module: 'refrigerants',
    calculator: 'pressure-temperature',
    calculatedAt: context.calculatedAt,
    source: provider.getSource(table),
    units: { pressure: parsed.pressureUnit, pressureKind: parsed.pressureKind, temperature: parsed.temperatureUnit, result: parsed.mode === 'pressure-to-temperature' ? parsed.temperatureUnit : parsed.pressureUnit },
    inputs: parsed,
    result: {
      branch: parsed.branch,
      pressurePaAbs,
      pressureGaugePa: pressurePaAbs - atmospherePa,
      pressureEquivalents: equivalentPressures(pressurePaAbs, atmospherePa),
      temperatureC: selectedC,
      temperatureDisplay: selectedC === null ? null : convertTemperature(selectedC, 'C', parsed.temperatureUnit),
      dewC,
      bubbleC,
    },
    interpretation: interpretPressureTemperature(parsed.branch),
    warnings: baseWarnings(parsed.refrigerant, table.refrigerantType, table.limitations),
  }
}

export type ThermalCalculationResult = {
  pressurePaAbs: number
  saturationC: number
  measuredC: number
  resultK: number
  label: 'Bajo' | 'Normal' | 'Elevado'
}

export function calculateSuperheat(input: SuperheatInput, provider = generatedRefrigerantProvider, context: CalculationContext = defaultCalculationContext()): CalculationEnvelope<SuperheatInput, ThermalCalculationResult> {
  const parsed = SuperheatInputSchema.parse(input)
  const table = requireTable(provider, parsed.refrigerant)
  const atmospherePa = parsed.atmospherePa ?? DEFAULT_ATMOSPHERE_PA
  const pressurePaAbs = pressureToPaAbsolute(parsed.suctionPressure, parsed.pressureUnit, parsed.pressureKind, atmospherePa)
  const measuredC = convertTemperature(parsed.suctionPipeTemperature, parsed.temperatureUnit, 'C')
  const saturationC = interpolateTemperatureFromPressure(table, pressurePaAbs, 'dew')
  const resultK = domainSuperheat(pressurePaAbs, measuredC, table)
  const interpretation = interpretSuperheat(resultK)
  return {
    module: 'refrigerants',
    calculator: 'superheat',
    calculatedAt: context.calculatedAt,
    source: provider.getSource(table),
    units: { pressure: parsed.pressureUnit, pressureKind: parsed.pressureKind, temperature: parsed.temperatureUnit, result: 'K' },
    inputs: parsed,
    result: { pressurePaAbs, saturationC, measuredC, resultK, label: interpretation.title.includes('bajo') ? 'Bajo' : interpretation.title.includes('elevado') ? 'Elevado' : 'Normal' },
    interpretation,
    warnings: baseWarnings(parsed.refrigerant, table.refrigerantType, table.limitations),
  }
}

export function calculateSubcooling(input: SubcoolingInput, provider = generatedRefrigerantProvider, context: CalculationContext = defaultCalculationContext()): CalculationEnvelope<SubcoolingInput, ThermalCalculationResult> {
  const parsed = SubcoolingInputSchema.parse(input)
  const table = requireTable(provider, parsed.refrigerant)
  const atmospherePa = parsed.atmospherePa ?? DEFAULT_ATMOSPHERE_PA
  const pressurePaAbs = pressureToPaAbsolute(parsed.liquidPressure, parsed.pressureUnit, parsed.pressureKind, atmospherePa)
  const measuredC = convertTemperature(parsed.liquidLineTemperature, parsed.temperatureUnit, 'C')
  const saturationC = interpolateTemperatureFromPressure(table, pressurePaAbs, 'bubble')
  const resultK = domainSubcooling(pressurePaAbs, measuredC, table)
  const interpretation = interpretSubcooling(resultK)
  return {
    module: 'refrigerants',
    calculator: 'subcooling',
    calculatedAt: context.calculatedAt,
    source: provider.getSource(table),
    units: { pressure: parsed.pressureUnit, pressureKind: parsed.pressureKind, temperature: parsed.temperatureUnit, result: 'K' },
    inputs: parsed,
    result: { pressurePaAbs, saturationC, measuredC, resultK, label: interpretation.title.includes('bajo') ? 'Bajo' : interpretation.title.includes('elevado') ? 'Elevado' : 'Normal' },
    interpretation,
    warnings: baseWarnings(parsed.refrigerant, table.refrigerantType, table.limitations),
  }
}

export function calculateAdditionalCharge(input: AdditionalChargeInput, context: CalculationContext = defaultCalculationContext()): CalculationEnvelope<AdditionalChargeInput, ReturnType<typeof calculateAdditionalChargeWithUnits>> {
  const parsed = AdditionalChargeInputSchema.parse(input)
  const result = calculateAdditionalChargeWithUnits(parsed)
  return {
    module: 'refrigerants',
    calculator: 'additional-charge',
    calculatedAt: context.calculatedAt,
    source: { provider: 'manufacturer-input', version: 'user-entered', generatedAt: null, limitations: ['El dato g/m debe proceder del fabricante del equipo.'] },
    units: { mass: parsed.factoryUnit, length: parsed.lengthUnit, result: 'g' },
    inputs: parsed,
    result,
    interpretation: interpretAdditionalCharge(),
    warnings: [
      { code: 'NO_PRESSURE_ONLY_CHARGE', severity: 'danger', message: 'No cargar refrigerante únicamente por presión.' },
      { code: 'MANUFACTURER_PRIORITY', severity: 'info', message: 'La placa y documentación del fabricante tienen prioridad.' },
    ],
  }
}

export function compareRefrigerants(input: RefrigerantComparisonInput, provider = generatedRefrigerantProvider, context: CalculationContext = defaultCalculationContext()) {
  const parsed = RefrigerantComparisonInputSchema.parse(input)
  const rows = parsed.temperaturesC.map((temperatureC) => ({
    temperatureC,
    pressuresPaAbs: Object.fromEntries(parsed.refrigerants.map((refrigerant) => {
      const table = requireTable(provider, refrigerant)
      try {
        return [refrigerant, interpolatePressureFromTemperature(table, temperatureC, parsed.branch)]
      } catch {
        return [refrigerant, null]
      }
    })) as Record<string, number | null>,
  }))
  const sources = parsed.refrigerants.map((refrigerant) => provider.getSource(requireTable(provider, refrigerant)))
  return {
    module: 'refrigerants' as const,
    calculator: 'comparison',
    calculatedAt: context.calculatedAt,
    source: { provider: provider.id, version: sources.map((source) => source.version).join(', '), generatedAt: sources.map((source) => source.generatedAt).filter(Boolean).join(', ') || null, limitations: [...new Set(sources.flatMap((source) => source.limitations))] },
    units: { temperature: 'C', pressure: 'Pa', pressureKind: 'absolute' as PressureKind },
    inputs: parsed,
    result: { branch: parsed.branch, rows },
    interpretation: interpretComparison(),
    warnings: [
      { code: 'NOT_INTERCHANGEABLE', severity: 'danger' as const, message: 'La comparación no implica que los refrigerantes sean intercambiables o que puedan mezclarse.' },
      { code: 'NO_MIXING', severity: 'danger' as const, message: 'No mezclar refrigerantes diferentes.' },
    ],
  }
}
