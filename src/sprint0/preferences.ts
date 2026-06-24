import { useEffect, useState } from 'react'
import type { PressureUnit, VacuumUnit } from '../domain/units'
import type { LengthUnit, MassUnit, TemperatureUnit } from '../domain/technical-conversions'

export type AppLanguage = 'es' | 'en'

function storedValue<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const value = localStorage.getItem(key) as T | null
  return value && allowed.includes(value) ? value : fallback
}

export function useUnitPreferences() {
  const [language, setLanguage] = useState<AppLanguage>(() => storedValue('isivolt_language', ['es', 'en'] as const, 'es'))
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>(() => storedValue('isivolt_pressure_unit', ['bar', 'PSI', 'kPa', 'MPa'] as const, 'bar'))
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>(() => storedValue('isivolt_temperature_unit', ['C', 'F'] as const, 'C'))
  const [distanceUnit, setDistanceUnit] = useState<LengthUnit>(() => storedValue('isivolt_distance_unit', ['m', 'ft'] as const, 'm'))
  const [massUnit, setMassUnit] = useState<MassUnit>(() => storedValue('isivolt_mass_unit', ['kg', 'lb'] as const, 'kg'))
  const [vacuumUnit, setVacuumUnit] = useState<VacuumUnit>(() => storedValue('isivolt_vacuum_unit', ['micron', 'mbar_abs', 'Pa_abs'] as const, 'micron'))

  useEffect(() => localStorage.setItem('isivolt_language', language), [language])
  useEffect(() => localStorage.setItem('isivolt_pressure_unit', pressureUnit), [pressureUnit])
  useEffect(() => localStorage.setItem('isivolt_temperature_unit', temperatureUnit), [temperatureUnit])
  useEffect(() => localStorage.setItem('isivolt_distance_unit', distanceUnit), [distanceUnit])
  useEffect(() => localStorage.setItem('isivolt_mass_unit', massUnit), [massUnit])
  useEffect(() => localStorage.setItem('isivolt_vacuum_unit', vacuumUnit), [vacuumUnit])

  return {
    language,
    setLanguage,
    pressureUnit,
    setPressureUnit,
    temperatureUnit,
    setTemperatureUnit,
    distanceUnit,
    setDistanceUnit,
    massUnit,
    setMassUnit,
    vacuumUnit,
    setVacuumUnit,
  }
}
