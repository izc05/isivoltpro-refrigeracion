import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowUpDown, Database, FileText, Gauge, Grid3X3, LockKeyhole, Plus, Scale, Search, Stethoscope, Table2, Thermometer } from 'lucide-react'
import { APP_VERSION, EmptyState, PageTitle, appIconUrl } from './shared'

export const tools = [
  ['Presión - Temperatura', 'Conversión P/T con burbuja y rocío', '/pt', Thermometer],
  ['Recalentamiento', 'Temperatura de aspiración', '/superheat', ArrowUpDown],
  ['Subenfriamiento', 'Temperatura de línea de líquido', '/subcooling', ArrowUpDown],
  ['Conversor técnico', 'Presión, vacío, potencia y unidades', '/converter', Gauge],
  ['Vacío y estabilidad', 'Micrones, fases y registro', '/vacuum', Gauge],
  ['Calculadora de carga', 'Carga de placa y longitud adicional', '/charge', LockKeyhole],
  ['Refrigerantes', 'Datos, seguridad y trazabilidad', '/refrigerants', Table2],
  ['Comparador', 'Comparación sin equivalencias directas', '/compare', Scale],
  ['Diagnóstico guiado', 'Hipótesis y comprobaciones', '/diagnostics', Stethoscope],
] as const

export function HomePage() {
  return <main className="sz-screen sz-home">
    <section className="sz-hero"><img src={appIconUrl} alt="Logotipo IsiVoltPro" /><div><span className="sz-eyebrow">Suite técnica offline</span><h1>IsiVoltPro</h1><p>Refrigeración</p><small>Cálculo, diagnóstico, registro e informes desde el móvil.</small></div></section>
    <section className="sz-dashboard-grid"><NavLink className="sz-primary-action" to="/interventions"><Plus /><span><strong>Nueva intervención</strong><small>Cliente, equipo y mediciones</small></span></NavLink><NavLink className="sz-secondary-action" to="/pt"><Thermometer /><span><strong>Cálculo rápido P/T</strong><small>Saturación, burbuja y rocío</small></span></NavLink></section>
    <div className="sz-section-heading"><div><span className="sz-eyebrow">Herramientas</span><h2>Trabajo técnico</h2></div><NavLink to="/tools">Ver todas</NavLink></div>
    <div className="sz-tool-grid">{tools.slice(0, 6).map(([label, subtitle, path, Icon]) => <NavLink className="sz-tool-card" to={path} key={path}><Icon /><strong>{label}</strong><small>{subtitle}</small></NavLink>)}</div>
    <section className="sz-summary-grid"><article className="sz-summary-card"><Database /><div><strong>Local</strong><p>Datos guardados en el dispositivo.</p></div></article><article className="sz-summary-card"><Table2 /><div><strong>P/T trazable</strong><p>Tablas generadas con CoolProp.</p></div></article><article className="sz-summary-card"><FileText /><div><strong>PDF</strong><p>Informes profesionales.</p></div></article></section>
    <footer className="sz-legal">Herramienta orientativa. Verifica siempre placa, manual, procedimiento y normativa.<span>Versión {APP_VERSION}</span></footer>
  </main>
}

export function ToolsPage() {
  const [query, setQuery] = useState('')
  const visible = tools.filter(([a, b]) => `${a} ${b}`.toLowerCase().includes(query.toLowerCase()))
  return <main className="sz-screen"><PageTitle eyebrow="Caja de herramientas" title="Todas las herramientas" /><label className="sz-search"><Search /><span className="sr-only">Buscar</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cálculo o herramienta" /></label><div className="sz-tool-grid">{visible.map(([label, subtitle, path, Icon]) => <NavLink className="sz-tool-card" to={path} key={path}><Icon /><strong>{label}</strong><small>{subtitle}</small></NavLink>)}</div>{visible.length === 0 && <EmptyState icon={<Grid3X3 />} title="Sin resultados" text="Prueba con presión, vacío, carga o refrigerante." />}</main>
}
