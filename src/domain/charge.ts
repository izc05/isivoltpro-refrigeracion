import { convertLength, convertMass, type LengthUnit, type MassUnit } from './technical-conversions'

export function calculateAdditionalCharge(factoryChargeG: number, includedLengthM: number, installedLengthM: number, gramsPerMeter: number) {
  const additionalLengthM = Math.max(0, installedLengthM - includedLengthM)
  const additionalChargeG = additionalLengthM * gramsPerMeter
  return { additionalLengthM, additionalChargeG, totalChargeG: factoryChargeG + additionalChargeG }
}

export function calculateAdditionalChargeWithUnits(input: {
  factoryCharge: number
  factoryUnit: MassUnit
  includedLength: number
  installedLength: number
  lengthUnit: LengthUnit
  additionalPerMeterG: number
  recovered: number
  recoveredUnit: MassUnit
  added: number
  addedUnit: MassUnit
}) {
  const factoryChargeG = convertMass(input.factoryCharge, input.factoryUnit, 'g')
  const includedLengthM = convertLength(input.includedLength, input.lengthUnit, 'm')
  const installedLengthM = convertLength(input.installedLength, input.lengthUnit, 'm')
  const recoveredG = convertMass(input.recovered, input.recoveredUnit, 'g')
  const addedG = convertMass(input.added, input.addedUnit, 'g')
  return { ...calculateAdditionalCharge(factoryChargeG, includedLengthM, installedLengthM, input.additionalPerMeterG), recoveredG, addedG }
}
