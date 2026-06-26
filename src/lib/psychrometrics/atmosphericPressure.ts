export function atmosphericPressureFromAltitude(altitudeM: number) {
  if (!Number.isFinite(altitudeM)) throw new Error('La altitud debe ser un número válido.')
  return 101325 * Math.pow(1 - 2.25577e-5 * altitudeM, 5.25588)
}

export function pressurePaToKpa(pressurePa: number) {
  return pressurePa / 1000
}
