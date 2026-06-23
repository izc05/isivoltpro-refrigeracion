export function calculateAdditionalCharge(factoryChargeG: number, includedLengthM: number, installedLengthM: number, gramsPerMeter: number) {
  const additionalLengthM = Math.max(0, installedLengthM - includedLengthM)
  const additionalChargeG = additionalLengthM * gramsPerMeter
  return { additionalLengthM, additionalChargeG, totalChargeG: factoryChargeG + additionalChargeG }
}
