import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BookOpen, ChevronRight, Clock3, Database, FileText, Grid3X3, Pin, PinOff, Plus, Search, Table2, Thermometer } from 'lucide-react'
import { APP_VERSION, EmptyState, PageTitle } from './shared'
import { toolCategories, tools, type ToolCategory } from './tool-catalog'

const PINNED_KEY = 'isivolt_pinned_tools'

type Tool = (typeof tools)[number]

const categoryDescriptions: Record<ToolCategory, string> = {
  refrigerantes: 'P/T, recalentamiento, subenfriamiento, vacío, carga y fichas.',
  climatizacion: 'Psicrometría, carga térmica, UTA, fan coils e inductores.',
  conductos: 'Caudales, dimensionado, pérdidas y equilibrado.',
  aerotermia: 'Hidráulica, ACS, suelo radiante y equipos de agua.',
  electricidad: 'Conversor, intensidad, protecciones y motores.',
  diagnostico: 'Hipótesis, comprobaciones y resolución de fallos.',
}

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
  return <article className={`sz-tool-row ${pinned ? 'is-pinned' : ''} ${tool.status === 'planned' ? 'is-planned' : ''}`}>
    <NavLink className="sz-tool-row-main" to={tool.path}>
      <span className="sz-tool-row-icon"><Icon /></span>
      <span className="sz-tool-row-copy"><strong>{tool.title}</strong><small>{tool.subtitle}</small></span>
      <span className="sz-tool-row-status">{tool.status === 'planned' ? 'Etapa 3' : 'Activo'}</span>
      <ChevronRight className="sz-tool-row-chevron" />
    </NavLink>
    {pinMode && <button className="sz-pin-button" type="button" aria-label={pinned ? `Desanclar ${tool.title}` : `Anclar ${tool.title}`} onClick={() => onTogglePin(tool.id)}>{pinned ? <PinOff /> : <Pin />}</button>}
  </article>
}

function QuickCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon
  return <NavLink className="sz-quick-tool-card" to={tool.path}>
    <Icon />
    <strong>{tool.title}</strong>
    <small>{tool.subtitle}</small>
  </NavLink>
}

function CategoryTile({ id, label, selected, onSelect }: { id: ToolCategory; label: string; selected: boolean; onSelect: (id: ToolCategory) => void }) {
  const firstTool = tools.find((tool) => tool.category === id)
  const Icon = firstTool?.icon ?? Grid3X3
  const activeCount = tools.filter((tool) => tool.category === id && tool.status === 'active').length
  return <button className={`sz-category-tile ${selected ? 'active' : ''}`} type="button" onClick={() => onSelect(id)}>
    <span><Icon /></span>
    <strong>{label}</strong>
    <small>{categoryDescriptions[id]}</small>
    <em>{activeCount ? `${activeCount} activas` : 'Planificada'}</em>
  </button>
}

export function HomePage() {
  const [pinnedIds, setPinnedIds] = useState<string[]>(readPinnedTools)

  useEffect(() => {
    const sync = () => setPinnedIds(readPinnedTools())
    addEventListener('storage', sync)
    return () => removeEventListener('storage', sync)
  }, [])

  const quickIds = pinnedIds.length > 0 ? pinnedIds : ['pt', 'superheat', 'subcooling', 'vacuum', 'charge', 'diagnostics', 'converter']
  const featured = tools.filter((tool) => quickIds.includes(tool.id)).slice(0, 7)

  return <main className="sz-screen sz-home sz-iphone-home">
    <section className="sz-home-identity"><div><h1>IsiVoltPro</h1><p>Refrigeración y Climatización</p></div><NavLink className="sz-icon-button" to="/settings" aria-label="Ajustes"><Grid3X3 /></NavLink></section>
    <NavLink className="sz-new-intervention" to="/interventions"><span><Plus /></span><div><strong>Nueva intervención</strong><small>Inicia una nueva intervención y guarda tus datos</small></div><ChevronRight /></NavLink>
    <div className="sz-quick-grid">{featured.slice(0, 6).map((tool) => <QuickCard key={tool.id} tool={tool} />)}</div>
    <NavLink className="sz-wide-tool-card" to="/converter"><Thermometer /><span><strong>Conversor</strong><small>Unidades, propiedades y conversiones técnicas</small></span><ChevronRight /></NavLink>
    <section className="sz-activity-strip"><article><Clock3 /><div><strong>Actividad reciente</strong><p>Cálculos e intervenciones se guardan localmente.</p></div></article><article><FileText /><div><strong>Informes</strong><p>Disponibles dentro de Trabajo.</p></div></article></section>
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

  const pinnedTools = tools.filter((tool) => pinnedIds.includes(tool.id))
  const categoryTiles = toolCategories.filter((item): item is { id: ToolCategory; label: string } => item.id !== 'todos')

  return <main className="sz-screen sz-tools-screen">
    <div className="sz-tools-heading"><PageTitle eyebrow="Caja de herramientas" title="Herramientas" description="Categorías oficiales para cálculo, explicación técnica y trabajo de campo." /><button className={`sz-button secondary sz-pin-mode ${pinMode ? 'active' : ''}`} type="button" onClick={() => setPinMode(!pinMode)}><Pin />{pinMode ? 'Terminar' : 'Anclar'}</button></div>
    <label className="sz-search"><Search /><span className="sr-only">Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar herramienta" /></label>
    <div className="sz-category-grid" aria-label="Categorías de herramientas"><button type="button" className={`sz-category-tile all ${category === 'todos' ? 'active' : ''}`} onClick={() => setCategory('todos')}><span><Grid3X3 /></span><strong>Todas</strong><small>Vista completa de herramientas activas y planificadas.</small><em>{tools.length} herramientas</em></button>{categoryTiles.map((item) => <CategoryTile key={item.id} id={item.id} label={item.label} selected={category === item.id} onSelect={setCategory} />)}</div>
    {pinnedTools.length > 0 && category === 'todos' && !query && <><div className="sz-list-label"><Pin />Favoritas</div><div className="sz-tool-list">{pinnedTools.map((tool) => <ToolRow key={tool.id} tool={tool} pinned pinMode={pinMode} onTogglePin={togglePin} />)}</div><div className="sz-list-label">Todas las herramientas</div></>}
    <div className="sz-tool-list">{visible.filter((tool) => !(pinnedTools.length > 0 && category === 'todos' && !query && pinnedIds.includes(tool.id))).map((tool) => <ToolRow key={tool.id} tool={tool} pinned={pinnedIds.includes(tool.id)} pinMode={pinMode} onTogglePin={togglePin} />)}</div>
    {visible.length === 0 && <EmptyState icon={<Grid3X3 />} title="Sin resultados" text="Prueba con presión, vacío, carga, conductos o diagnóstico." />}
    <section className="sz-summary-grid"><article className="sz-summary-card"><Database /><div><strong>Offline</strong><p>Datos guardados en el dispositivo.</p></div></article><article className="sz-summary-card"><Table2 /><div><strong>P/T</strong><p>Tablas generadas y trazables.</p></div></article><article className="sz-summary-card"><BookOpen /><div><strong>Explicado</strong><p>Modo técnico con fórmula y errores frecuentes.</p></div></article></section>
  </main>
}