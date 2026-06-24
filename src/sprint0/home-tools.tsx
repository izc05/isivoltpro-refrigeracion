import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronRight, Database, FileText, Grid3X3, Pin, PinOff, Plus, Search, Table2, Thermometer } from 'lucide-react'
import { APP_VERSION, EmptyState, PageTitle, appIconUrl } from './shared'
import { toolCategories, tools, type ToolCategory } from './tool-catalog'

const PINNED_KEY = 'isivolt_pinned_tools'

type Tool = (typeof tools)[number]

function readPinnedTools() {
  try {
    const value = JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function ToolRow({ tool, pinned, pinMode, onTogglePin }: { tool: Tool; pinned: boolean; pinMode: boolean; onTogglePin: (id: string) => void }) {
  const Icon = tool.icon
  return <article className={`sz-tool-row ${pinned ? 'is-pinned' : ''}`}>
    <NavLink className="sz-tool-row-main" to={tool.path}>
      <span className="sz-tool-row-icon"><Icon /></span>
      <span className="sz-tool-row-copy"><strong>{tool.title}</strong><small>{tool.subtitle}</small></span>
      <ChevronRight className="sz-tool-row-chevron" />
    </NavLink>
    {pinMode && <button className="sz-pin-button" type="button" aria-label={pinned ? `Desanclar ${tool.title}` : `Anclar ${tool.title}`} onClick={() => onTogglePin(tool.id)}>{pinned ? <PinOff /> : <Pin />}</button>}
  </article>
}

export function HomePage() {
  const [pinnedIds, setPinnedIds] = useState<string[]>(readPinnedTools)

  useEffect(() => {
    const sync = () => setPinnedIds(readPinnedTools())
    addEventListener('storage', sync)
    return () => removeEventListener('storage', sync)
  }, [])

  const featured = pinnedIds.length > 0 ? tools.filter((tool) => pinnedIds.includes(tool.id)).slice(0, 4) : tools.slice(0, 4)

  return <main className="sz-screen sz-home">
    <section className="sz-hero"><img src={appIconUrl} alt="Logotipo IsiVoltPro" /><div><span className="sz-eyebrow">Suite técnica offline</span><h1>IsiVoltPro</h1><p>Refrigeración</p><small>Cálculo, diagnóstico, registro e informes desde el móvil.</small></div></section>
    <section className="sz-dashboard-grid"><NavLink className="sz-primary-action" to="/interventions"><Plus /><span><strong>Nueva intervención</strong><small>Cliente, equipo y mediciones</small></span></NavLink><NavLink className="sz-secondary-action" to="/pt"><Thermometer /><span><strong>Regla P/T</strong><small>Presión, temperatura, burbuja y rocío</small></span></NavLink></section>
    <div className="sz-section-heading"><div><span className="sz-eyebrow">Acceso rápido</span><h2>{pinnedIds.length > 0 ? 'Herramientas ancladas' : 'Herramientas principales'}</h2></div><NavLink to="/tools">Ver todas</NavLink></div>
    <div className="sz-tool-list">{featured.map((tool) => <ToolRow key={tool.id} tool={tool} pinned={pinnedIds.includes(tool.id)} pinMode={false} onTogglePin={() => undefined} />)}</div>
    <section className="sz-summary-grid"><article className="sz-summary-card"><Database /><div><strong>Local</strong><p>Datos guardados en el dispositivo.</p></div></article><article className="sz-summary-card"><Table2 /><div><strong>P/T trazable</strong><p>Tablas generadas con CoolProp.</p></div></article><article className="sz-summary-card"><FileText /><div><strong>PDF</strong><p>Informes profesionales.</p></div></article></section>
    <footer className="sz-legal">Herramienta orientativa. Verifica siempre placa, manual, procedimiento y normativa.<span>Versión {APP_VERSION}</span></footer>
  </main>
}

export function ToolsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'todos' | ToolCategory>('todos')
  const [pinMode, setPinMode] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<string[]>(readPinnedTools)

  const visible = useMemo(() => tools.filter((tool) => {
    const matchesCategory = category === 'todos' || tool.category === category
    const matchesQuery = `${tool.title} ${tool.subtitle}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  }), [category, query])

  const togglePin = (id: string) => {
    setPinnedIds((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
      localStorage.setItem(PINNED_KEY, JSON.stringify(next))
      return next
    })
  }

  return <main className="sz-screen sz-tools-screen">
    <div className="sz-tools-heading"><PageTitle eyebrow="Caja de herramientas" title="Herramientas" description="Calculadoras y ayudas técnicas organizadas para trabajo de campo." /><button className={`sz-button secondary sz-pin-mode ${pinMode ? 'active' : ''}`} type="button" onClick={() => setPinMode(!pinMode)}><Pin />{pinMode ? 'Terminar' : 'Anclar elementos'}</button></div>
    <label className="sz-search"><Search /><span className="sr-only">Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar herramienta" /></label>
    <div className="sz-category-tabs" aria-label="Categorías de herramientas">{toolCategories.map((item) => <button type="button" key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
    {pinnedIds.length > 0 && category === 'todos' && !query && <><div className="sz-list-label"><Pin />Ancladas</div><div className="sz-tool-list">{tools.filter((tool) => pinnedIds.includes(tool.id)).map((tool) => <ToolRow key={tool.id} tool={tool} pinned pinMode={pinMode} onTogglePin={togglePin} />)}</div><div className="sz-list-label">Todas</div></>}
    <div className="sz-tool-list">{visible.filter((tool) => !(pinnedIds.length > 0 && category === 'todos' && !query && pinnedIds.includes(tool.id))).map((tool) => <ToolRow key={tool.id} tool={tool} pinned={pinnedIds.includes(tool.id)} pinMode={pinMode} onTogglePin={togglePin} />)}</div>
    {visible.length === 0 && <EmptyState icon={<Grid3X3 />} title="Sin resultados" text="Prueba con presión, vacío, carga o refrigerante." />}
  </main>
}
