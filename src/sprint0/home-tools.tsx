import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AlertTriangle, BookOpen, ChevronRight, ClipboardList, Database, FileText, Grid3X3, Pin, PinOff, Plus, QrCode, Search, Table2, UserPlus } from 'lucide-react'
import { APP_VERSION, EmptyState, PageTitle } from './shared'
import { db, type Intervention } from '../domain/storage/db'
import { toolCategories, tools, type ToolCategory } from './tool-catalog'

const PINNED_KEY = 'isivolt_pinned_tools'

type Tool = (typeof tools)[number]
type WorkSnapshot = { last?: Intervention; drafts: number; total: number }

const categoryDescriptions: Record<ToolCategory, string> = {
  refrigerantes: 'P/T, recalentamiento, subenfriamiento, vacío, carga y fichas.',
  climatizacion: 'Psicrometría, carga térmica, UTA, fan coils e inductores.',
  conductos: 'Caudales, dimensionado, pérdidas y equilibrado.',
  aerotermia: 'Hidráulica, ACS, suelo radiante y equipos de agua.',
  electricidad: 'Conversor, intensidad, protecciones y motores.',
  diagnostico: 'Hipótesis, comprobaciones y resolución de fallos.',
}

function readStringArray(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]')
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

function IosToolIcon({ tool, pinned }: { tool: Tool; pinned: boolean }) {
  const Icon = tool.icon
  return <NavLink className={`sz-ios-app is-${tool.category} ${pinned ? 'is-pinned' : ''}`} to={tool.path} aria-label={`${tool.title}. ${tool.subtitle}`}>
    <span className="sz-ios-app-glyph"><Icon /></span>
    <strong>{tool.title}</strong>
    {pinned && <i aria-hidden="true" />}
  </NavLink>
}

function IosShortcut({ to, icon: Icon, label, tone }: { to: string; icon: typeof Plus; label: string; tone: string }) {
  return <NavLink className={`sz-ios-shortcut is-${tone}`} to={to}>
    <span><Icon /></span>
    <strong>{label}</strong>
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
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readStringArray(PINNED_KEY))
  const [work, setWork] = useState<WorkSnapshot>({ drafts: 0, total: 0 })

  useEffect(() => {
    const sync = () => setPinnedIds(readStringArray(PINNED_KEY))
    addEventListener('storage', sync)
    return () => removeEventListener('storage', sync)
  }, [])

  useEffect(() => {
    let active = true
    void db.interventions.orderBy('updatedAt').reverse().toArray().then((items) => {
      if (!active) return
      setWork({ last: items[0], drafts: items.filter((item) => item.status === 'borrador').length, total: items.length })
    })
    return () => { active = false }
  }, [])

  const activeTools = tools.filter((tool) => tool.status === 'active')
  const orderedTools = [
    ...activeTools.filter((tool) => pinnedIds.includes(tool.id)),
    ...activeTools.filter((tool) => !pinnedIds.includes(tool.id)),
  ]

  return <main className="sz-screen sz-home sz-iphone-home">
    <section className="sz-home-identity">
      <div><h1>IsiVoltPro</h1><p>Refrigeración y Climatización</p></div>
      <NavLink className="sz-icon-button" to="/tools" aria-label="Todas las herramientas"><Grid3X3 /></NavLink>
    </section>

    <NavLink className="sz-home-primary-action" to="/interventions">
      <span><Plus /></span>
      <div><strong>Nueva intervención</strong><small>Cliente, equipo, mediciones e informe</small></div>
      <ChevronRight />
    </NavLink>

    <section className="sz-ios-shortcuts" aria-label="Accesos de trabajo">
      <IosShortcut to="/interventions" icon={ClipboardList} label={work.last ? 'Continuar' : 'Trabajo'} tone="blue" />
      <IosShortcut to="/planned/qr" icon={QrCode} label="Escanear QR" tone="cyan" />
      <IosShortcut to="/planned/clients" icon={UserPlus} label="Nueva ficha" tone="violet" />
      <IosShortcut to="/reports" icon={FileText} label="Informes" tone="orange" />
    </section>

    <div className="sz-section-heading compact">
      <div><span className="sz-eyebrow">Acceso inmediato</span><h2>Cálculos</h2></div>
      <NavLink to="/tools">Ver todos</NavLink>
    </div>

    <section className="sz-ios-app-grid" aria-label="Calculadoras">
      {orderedTools.map((tool) => <IosToolIcon key={tool.id} tool={tool} pinned={pinnedIds.includes(tool.id)} />)}
    </section>

    <section className="sz-home-overview">
      <NavLink to="/interventions" className={work.drafts ? 'is-warning' : 'is-ok'}>
        <AlertTriangle /><span><strong>{work.drafts ? `${work.drafts} borradores` : 'Trabajo al día'}</strong><small>{work.last ? `Último: ${work.last.clientName}` : 'Todavía no hay intervenciones'}</small></span><ChevronRight />
      </NavLink>
      <NavLink to="/settings">
        <Database /><span><strong>{work.total} registros locales</strong><small>Copia, unidades y apariencia</small></span><ChevronRight />
      </NavLink>
    </section>

    <footer className="sz-legal">Herramienta orientativa. Verifica placa, manual, procedimiento y normativa.<span>Versión {APP_VERSION}</span></footer>
  </main>
}

export function ToolsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'todos' | ToolCategory>('todos')
  const [pinMode, setPinMode] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readStringArray(PINNED_KEY))

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
