import { useRef, useState, type ReactNode } from 'react'
import { CloudDownload, CloudUpload, Database, Gauge, Languages, Moon, Ruler, Scale, Sun, Thermometer, UserRound } from 'lucide-react'
import { DEFAULT_ATMOSPHERE_PA } from '../domain/units'
import { exportBackup, importBackup } from '../domain/storage/db'
import { downloadBlob, Notice, PageTitle, useSettings } from './shared'
import { useUnitPreferences } from './preferences'

function Segment<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return <div className="sz-setting-segments">{options.map((option) => <button type="button" key={option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>
}

function SettingRow({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle?: string; children: ReactNode }) {
  return <section className="sz-setting-row"><div className="sz-setting-row-title"><span className="sz-setting-icon">{icon}</span><span><strong>{title}</strong>{subtitle && <small>{subtitle}</small>}</span></div><div className="sz-setting-control">{children}</div></section>
}

export function SettingsPage() {
  const { atmospherePa, setAtmospherePa, technician, setTechnician, altitudeM, updateAltitude, theme, setTheme } = useSettings()
  const { language, setLanguage, pressureUnit, setPressureUnit, temperatureUnit, setTemperatureUnit, distanceUnit, setDistanceUnit, massUnit, setMassUnit, vacuumUnit, setVacuumUnit } = useUnitPreferences()
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  const backup = async () => {
    downloadBlob(new Blob([JSON.stringify(await exportBackup(), null, 2)], { type: 'application/json' }), `isivoltpro-backup-${new Date().toISOString().slice(0, 10)}.json`)
    setMessage('Copia de seguridad exportada.')
  }

  const restore = async (file?: File) => {
    if (!file) return
    try {
      await importBackup(JSON.parse(await file.text()))
      setMessage('Copia restaurada correctamente.')
    } catch {
      setMessage('No se pudo importar la copia seleccionada.')
    }
  }

  return <main className="sz-screen sz-settings-screen">
    <PageTitle eyebrow="Preferencias locales" title="Ajustes" description="Unidades, perfil técnico, apariencia y datos guardados en el dispositivo." />

    <section className="sz-profile-card">
      <div className="sz-profile-copy"><span className="sz-profile-icon"><UserRound /></span><div><strong>Perfil técnico</strong><small>{technician ? 'Datos preparados para los informes' : 'Añade el nombre del técnico que realiza la intervención'}</small></div></div>
      <label>Nombre del técnico<input value={technician} onChange={(event) => setTechnician(event.target.value)} placeholder="Nombre o identificador profesional" /></label>
    </section>

    <div className="sz-settings-stack">
      <SettingRow icon={<Languages />} title="Idioma" subtitle="Interfaz de la aplicación">
        <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}><option value="es">Español</option><option value="en">English</option></select>
      </SettingRow>
      <SettingRow icon={<Gauge />} title="Presión" subtitle="Unidad predeterminada">
        <select value={pressureUnit} onChange={(event) => setPressureUnit(event.target.value as typeof pressureUnit)}><option value="bar">bar</option><option value="PSI">PSI</option><option value="kPa">kPa</option><option value="MPa">MPa</option></select>
      </SettingRow>
      <SettingRow icon={<Thermometer />} title="Temperatura">
        <Segment value={temperatureUnit} onChange={setTemperatureUnit} options={[{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }]} />
      </SettingRow>
      <SettingRow icon={<Ruler />} title="Unidad de distancia">
        <Segment value={distanceUnit} onChange={setDistanceUnit} options={[{ value: 'm', label: 'm' }, { value: 'ft', label: 'ft' }]} />
      </SettingRow>
      <SettingRow icon={<Scale />} title="Unidad de masa">
        <Segment value={massUnit} onChange={setMassUnit} options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
      </SettingRow>
      <SettingRow icon={<Database />} title="Unidad de vacío">
        <Segment value={vacuumUnit} onChange={setVacuumUnit} options={[{ value: 'micron', label: 'μm' }, { value: 'mbar_abs', label: 'mbar' }, { value: 'Pa_abs', label: 'Pa' }]} />
      </SettingRow>
      <SettingRow icon={theme === 'dark' ? <Moon /> : <Sun />} title="Apariencia" subtitle="Cambia inmediatamente en toda la aplicación">
        <Segment value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} />
      </SettingRow>
    </div>

    <section className="sz-settings-card sz-form">
      <div className="sz-settings-card-heading"><Gauge /><div><h2>Condiciones locales</h2><p>La altitud ajusta automáticamente la presión atmosférica usada en cálculos manométricos.</p></div></div>
      <div className="sz-two-columns"><label>Altitud sobre el nivel del mar<input type="number" value={altitudeM} onChange={(event) => updateAltitude(Number(event.target.value))} /><span>m</span></label><label>Presión atmosférica<input type="number" value={Math.round(atmospherePa)} onChange={(event) => setAtmospherePa(Number(event.target.value) || DEFAULT_ATMOSPHERE_PA)} /><span>Pa</span></label></div>
    </section>

    <section className="sz-settings-card">
      <div className="sz-settings-card-heading"><Database /><div><h2>Datos y copias de seguridad</h2><p>Exporta clientes, equipos e intervenciones a un archivo JSON local.</p></div></div>
      <div className="sz-button-row"><button className="sz-button secondary" type="button" onClick={backup}><CloudDownload />Exportar copia</button><button className="sz-button secondary" type="button" onClick={() => fileRef.current?.click()}><CloudUpload />Restaurar copia</button></div>
      <input className="sr-only" ref={fileRef} type="file" accept="application/json,.json" onChange={(event) => void restore(event.target.files?.[0])} />
      {message && <Notice tone={message.startsWith('No') ? 'danger' : 'success'}><p>{message}</p></Notice>}
    </section>

    <Notice><p>La aplicación funciona sin analítica ni publicidad. Los datos permanecen en el dispositivo salvo que exportes una copia.</p></Notice>
  </main>
}
