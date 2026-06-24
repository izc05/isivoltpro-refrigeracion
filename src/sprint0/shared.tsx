import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, FileText, Grid3X3, Home, RefreshCw, Settings, Wifi, WifiOff } from 'lucide-react'
import { refrigerantTables, type RefrigerantTable } from '../data/generated'
import { maxGlideK } from '../domain/refrigerants/summary'
import { altitudeToAtmospherePa, DEFAULT_ATMOSPHERE_PA, parseLocalizedNumber, type PressureUnit } from '../domain/units'
import { db, newId, type Intervention } from '../domain/storage/db'

export const APP_VERSION = '1.1.0-sprint0'
export const appIconUrl = `${import.meta.env.BASE_URL}icons/icon.png`
export const preferredPressureUnits: PressureUnit[] = ['bar', 'PSI', 'kPa', 'MPa']

export const formatNumber = (value: number, digits = 2) => value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export function parseRequiredNumber(value: string, label: string) {
  const parsed = parseLocalizedNumber(value)
  if (!Number.isFinite(parsed)) throw new Error(`Introduce un valor válido en ${label}.`)
  return parsed
}

export function optionalNumber(value?: string) {
  if (!value?.trim()) return undefined
  const parsed = parseLocalizedNumber(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function getTable(name: string): RefrigerantTable {
  return refrigerantTables.find((table) => table.refrigerant === name) ?? refrigerantTables[0]
}

export function isZeotropicWithGlide(table: RefrigerantTable) {
  const glide = maxGlideK(table)
  return table.refrigerantType === 'zeotropic' && glide !== null && glide > 0.1
}

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

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    addEventListener('online', on)
    addEventListener('offline', off)
    return () => { removeEventListener('online', on); removeEventListener('offline', off) }
  }, [])
  return online
}

function useUpdateReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    void navigator.serviceWorker.ready.then((registration) => {
      const inspect = () => registration.installing?.addEventListener('statechange', () => {
        if (registration.installing?.state === 'installed' && navigator.serviceWorker.controller) setReady(true)
      })
      registration.addEventListener('updatefound', inspect)
      void registration.update()
    }).catch(() => undefined)
  }, [])
  return ready
}

export function Shell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  useSettings()
  const online = useOnline()
  const updateReady = useUpdateReady()
  const home = location.pathname === '/' || location.pathname === '/tools'
  return <div className="sz-app">
    <header className="sz-topbar">
      {home ? <NavLink className="sz-icon-button" to="/" aria-label="Inicio"><Home /></NavLink> : <button className="sz-icon-button" type="button" aria-label="Volver" onClick={() => navigate(-1)}><ArrowLeft /></button>}
      <div className="sz-topbar-title"><strong>IsiVoltPro <span>Refrigeración</span></strong><small>{home ? 'Herramienta técnica de campo' : 'Cálculo y registro profesional'}</small></div>
      <NavLink className="sz-icon-button" to="/settings" aria-label="Ajustes"><Settings /></NavLink>
    </header>
    <div className={`sz-connection ${online ? 'is-online' : 'is-offline'}`} role="status">{online ? <Wifi /> : <WifiOff />}<span>{online ? 'Con conexión · guardado local activo' : 'Sin conexión · modo local activo'}</span></div>
    {updateReady && <div className="sz-update-banner"><RefreshCw /><span>Nueva versión disponible.</span><button type="button" onClick={() => window.location.reload()}>Actualizar</button></div>}
    {children}
    <nav className="sz-bottom-nav" aria-label="Navegación principal">
      <NavLink to="/"><Home /><span>Inicio</span></NavLink><NavLink to="/tools"><Grid3X3 /><span>Herramientas</span></NavLink><NavLink to="/interventions"><ClipboardList /><span>Trabajo</span></NavLink><NavLink to="/reports"><FileText /><span>Informes</span></NavLink><NavLink to="/settings"><Settings /><span>Ajustes</span></NavLink>
    </nav>
  </div>
}

export function PageTitle({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <header className="sz-page-title">{eyebrow && <span className="sz-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</header>
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="sz-empty">{icon}<strong>{title}</strong><p>{text}</p></div>
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'success' | 'danger'; children: ReactNode }) {
  return <div className={`sz-notice is-${tone}`}>{tone === 'warning' || tone === 'danger' ? <AlertTriangle /> : <CheckCircle2 />}<div>{children}</div></div>
}

export async function createMeasurementDraft(input: Partial<Intervention> & Pick<Intervention, 'workType'>) {
  const now = new Date().toISOString()
  await db.interventions.put({ id: newId('int'), date: now.slice(0, 10), clientName: 'Pendiente de asignar', status: 'borrador', photos: [], createdAt: now, updatedAt: now, ...input })
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
