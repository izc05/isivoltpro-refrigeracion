import { useEffect, useState } from 'react'
import { altitudeToAtmospherePa, DEFAULT_ATMOSPHERE_PA } from '../domain/units'

type Theme = 'dark' | 'light'

export function useSettings() {
  const [atmospherePa, setAtmospherePa] = useState(() => Number(localStorage.getItem('isivolt_atmosphere')) || DEFAULT_ATMOSPHERE_PA)
  const [technician, setTechnician] = useState(() => localStorage.getItem('isivolt_technician') ?? '')
  const [altitudeM, setAltitudeM] = useState(() => Number(localStorage.getItem('isivolt_altitude_m')) || 0)
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('isivolt_theme') === 'light' ? 'light' : 'dark')

  useEffect(() => localStorage.setItem('isivolt_atmosphere', String(atmospherePa)), [atmospherePa])
  useEffect(() => localStorage.setItem('isivolt_technician', technician), [technician])
  useEffect(() => localStorage.setItem('isivolt_altitude_m', String(altitudeM)), [altitudeM])
  useEffect(() => {
    localStorage.setItem('isivolt_theme', theme)
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const updateAltitude = (value: number) => {
    const next = Number.isFinite(value) ? value : 0
    setAltitudeM(next)
    setAtmospherePa(Math.round(altitudeToAtmospherePa(next)))
  }

  return { atmospherePa, setAtmospherePa, technician, setTechnician, altitudeM, updateAltitude, theme, setTheme }
}
