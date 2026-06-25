import { z } from 'zod'

export const PressureUnitSchema = z.enum(['Pa', 'kPa', 'MPa', 'bar', 'PSI', 'kgf/cm2', 'atm'])
export const PressureKindSchema = z.enum(['absolute', 'gauge'])
export const TemperatureUnitSchema = z.enum(['C', 'F'])
export const SaturationBranchSchema = z.enum(['dew', 'bubble'])

const finiteNumber = z.number().finite()
const nonNegativeNumber = finiteNumber.min(0)

export const PressureTemperatureInputSchema = z.object({
  refrigerant: z.string().min(1, 'Selecciona un refrigerante.'),
  mode: z.enum(['pressure-to-temperature', 'temperature-to-pressure']),
  pressure: finiteNumber.optional(),
  pressureUnit: PressureUnitSchema.default('bar'),
  pressureKind: PressureKindSchema.default('gauge'),
  temperature: finiteNumber.optional(),
  temperatureUnit: TemperatureUnitSchema.default('C'),
  branch: SaturationBranchSchema.default('dew'),
  atmospherePa: finiteNumber.positive().optional(),
}).superRefine((input, ctx) => {
  if (input.mode === 'pressure-to-temperature' && input.pressure === undefined) {
    ctx.addIssue({ code: 'custom', path: ['pressure'], message: 'Introduce una presión.' })
  }
  if (input.mode === 'temperature-to-pressure' && input.temperature === undefined) {
    ctx.addIssue({ code: 'custom', path: ['temperature'], message: 'Introduce una temperatura.' })
  }
})

export const SuperheatInputSchema = z.object({
  refrigerant: z.string().min(1, 'Selecciona un refrigerante.'),
  suctionPressure: finiteNumber,
  pressureUnit: PressureUnitSchema.default('bar'),
  pressureKind: PressureKindSchema.default('gauge'),
  suctionPipeTemperature: finiteNumber,
  temperatureUnit: TemperatureUnitSchema.default('C'),
  atmospherePa: finiteNumber.positive().optional(),
})

export const SubcoolingInputSchema = z.object({
  refrigerant: z.string().min(1, 'Selecciona un refrigerante.'),
  liquidPressure: finiteNumber,
  pressureUnit: PressureUnitSchema.default('bar'),
  pressureKind: PressureKindSchema.default('gauge'),
  liquidLineTemperature: finiteNumber,
  temperatureUnit: TemperatureUnitSchema.default('C'),
  atmospherePa: finiteNumber.positive().optional(),
})

export const AdditionalChargeInputSchema = z.object({
  factoryCharge: nonNegativeNumber,
  factoryUnit: z.enum(['g', 'kg', 'lb', 'oz']).default('kg'),
  includedLength: nonNegativeNumber,
  installedLength: nonNegativeNumber,
  lengthUnit: z.enum(['m', 'ft']).default('m'),
  additionalPerMeterG: nonNegativeNumber,
  recovered: nonNegativeNumber.default(0),
  recoveredUnit: z.enum(['g', 'kg', 'lb', 'oz']).default('g'),
  added: nonNegativeNumber.default(0),
  addedUnit: z.enum(['g', 'kg', 'lb', 'oz']).default('g'),
})

export const RefrigerantComparisonInputSchema = z.object({
  refrigerants: z.array(z.string().min(1)).min(2, 'Compara al menos dos refrigerantes.'),
  temperaturesC: z.array(finiteNumber).default([-20, -10, 0, 10, 20, 30, 40]),
  branch: SaturationBranchSchema.default('dew'),
})

export type PressureTemperatureInput = z.infer<typeof PressureTemperatureInputSchema>
export type SuperheatInput = z.infer<typeof SuperheatInputSchema>
export type SubcoolingInput = z.infer<typeof SubcoolingInputSchema>
export type AdditionalChargeInput = z.infer<typeof AdditionalChargeInputSchema>
export type RefrigerantComparisonInput = z.infer<typeof RefrigerantComparisonInputSchema>
