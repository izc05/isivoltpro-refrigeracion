import './App.css'

type Refrigerant = {
  name: string
  family: string
  safety: string
  gwp: string
  glide: string
  load: string
  status: 'Base' | 'Prioritario'
}

type Tool = {
  name: string
  detail: string
  state: 'MVP' | 'Siguiente' | 'Validacion'
}

const refrigerants: Refrigerant[] = [
  {
    name: 'R32',
    family: 'HFC',
    safety: 'A2L',
    gwp: '675',
    glide: '0 K',
    load: 'Fase liquida o segun fabricante',
    status: 'Base',
  },
  {
    name: 'R410A',
    family: 'HFC mezcla',
    safety: 'A1',
    gwp: '2088',
    glide: 'Casi 0 K',
    load: 'Fase liquida',
    status: 'Base',
  },
  {
    name: 'R134a',
    family: 'HFC',
    safety: 'A1',
    gwp: '1430',
    glide: '0 K',
    load: 'Segun equipo',
    status: 'Base',
  },
  {
    name: 'R290',
    family: 'HC',
    safety: 'A3',
    gwp: '~3',
    glide: '0 K',
    load: 'Solo personal autorizado',
    status: 'Base',
  },
  {
    name: 'R744',
    family: 'CO2',
    safety: 'A1',
    gwp: '1',
    glide: '0 K',
    load: 'Procedimiento especifico CO2',
    status: 'Base',
  },
  {
    name: 'R454B',
    family: 'HFO/HFC mezcla',
    safety: 'A2L',
    gwp: '466',
    glide: 'Pendiente validar',
    load: 'Fase liquida',
    status: 'Prioritario',
  },
]

const tools: Tool[] = [
  {
    name: 'Regla P/T',
    detail: 'Presion absoluta/manometrica, rocio, burbuja, glide y tabla trazable.',
    state: 'MVP',
  },
  {
    name: 'Recalentamiento',
    detail: 'Calcula saturacion, recalentamiento y lectura orientativa guardable.',
    state: 'Siguiente',
  },
  {
    name: 'Subenfriamiento',
    detail: 'Linea de liquido, presion, saturacion y comprobaciones tecnicas.',
    state: 'Siguiente',
  },
  {
    name: 'Control de refrigerante',
    detail: 'Botellas, recuperacion, cargas, residuos y trazabilidad por intervencion.',
    state: 'Validacion',
  },
]

const phases = [
  'Base premium: navegacion, inicio, herramientas, favoritos y modo offline.',
  'Herramientas frigorificas: P/T, recalentamiento, subenfriamiento, vacio y carga.',
  'Trabajo profesional: clientes, instalaciones, equipos, partes, fotos e informes PDF.',
  'Climatizacion: psicrometria, carga termica, conductos, caudales y rendimiento.',
  'Gestion avanzada: inventario, botellas, residuos, mantenimiento, usuarios y avisos.',
]

function App() {
  return (
    <main className="app-shell">
      <aside className="rail" aria-label="Navegacion principal">
        <div className="brand-mark">IV</div>
        <nav>
          <a href="#inicio" aria-label="Inicio">
            Inicio
          </a>
          <a href="#herramientas" aria-label="Herramientas">
            Herramientas
          </a>
          <a href="#refrigerantes" aria-label="Refrigerantes">
            Refrigerantes
          </a>
          <a href="#roadmap" aria-label="Roadmap">
            Roadmap
          </a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar" id="inicio">
          <div>
            <p className="eyebrow">IsiVoltPro</p>
            <h1>Refrigeracion y Climatizacion</h1>
          </div>
          <div className="status-strip" aria-label="Estado del sistema">
            <span>Offline preparado</span>
            <span>Datos tecnicos pendientes de validar</span>
          </div>
        </header>

        <section className="hero-panel">
          <div className="hero-copy">
            <p className="module-label">Superapp tecnica de campo</p>
            <h2>Del diagnostico al informe, sin perder trazabilidad.</h2>
            <p>
              Base inicial del modulo de refrigerantes: calculos, fichas, seguridad,
              intervenciones y registro de refrigerante en una experiencia tactil.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#herramientas">
                Abrir herramientas
              </a>
              <a className="secondary-action" href="#refrigerantes">
                Ver refrigerantes
              </a>
            </div>
          </div>
          <div className="field-card" aria-label="Resumen de intervencion">
            <div className="field-card-header">
              <span>Intervencion activa</span>
              <strong>Borrador</strong>
            </div>
            <dl>
              <div>
                <dt>Equipo</dt>
                <dd>Split bomba de calor</dd>
              </div>
              <div>
                <dt>Refrigerante</dt>
                <dd>R32</dd>
              </div>
              <div>
                <dt>Mediciones</dt>
                <dd>3 pendientes</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="safety-band" aria-label="Principios obligatorios">
          <strong>Reglas de seguridad:</strong>
          <span>No mezclar refrigerantes.</span>
          <span>No cargar solo por presion.</span>
          <span>Diferenciar presion absoluta y manometrica.</span>
          <span>Mostrar fuente y fecha de revision.</span>
        </section>

        <section className="section-grid" id="herramientas">
          <div className="section-heading">
            <p className="eyebrow">Fase 1</p>
            <h2>Herramientas tecnicas</h2>
          </div>
          <div className="tool-grid">
            {tools.map((tool) => (
              <article className="tool-card" key={tool.name}>
                <div className={`state state-${tool.state.toLowerCase()}`}>
                  {tool.state}
                </div>
                <h3>{tool.name}</h3>
                <p>{tool.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pt-rule" aria-label="Prototipo regla presion temperatura">
          <div>
            <p className="eyebrow">Regla P/T</p>
            <h2>Preparada para tablas trazables</h2>
            <p>
              El prototipo no inventa datos P/T. La capa de calculo queda separada
              para incorporar tablas validadas por refrigerante, unidad y tipo de presion.
            </p>
          </div>
          <div className="gauge" aria-hidden="true">
            <span>bar</span>
            <div className="gauge-track">
              <i style={{ height: '64%' }} />
            </div>
            <span>C</span>
          </div>
        </section>

        <section className="section-grid" id="refrigerantes">
          <div className="section-heading">
            <p className="eyebrow">Biblioteca</p>
            <h2>Refrigerantes iniciales</h2>
          </div>
          <div className="refrigerant-table" role="table" aria-label="Refrigerantes">
            <div className="table-row table-head" role="row">
              <span role="columnheader">Gas</span>
              <span role="columnheader">Familia</span>
              <span role="columnheader">Seguridad</span>
              <span role="columnheader">GWP</span>
              <span role="columnheader">Carga</span>
            </div>
            {refrigerants.map((item) => (
              <div className="table-row" role="row" key={item.name}>
                <span role="cell">
                  <strong>{item.name}</strong>
                  <small>{item.status}</small>
                </span>
                <span role="cell">{item.family}</span>
                <span role="cell">{item.safety}</span>
                <span role="cell">{item.gwp}</span>
                <span role="cell">{item.load}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="roadmap" id="roadmap">
          <div className="section-heading">
            <p className="eyebrow">GitHub backlog</p>
            <h2>Orden de desarrollo</h2>
          </div>
          <ol>
            {phases.map((phase) => (
              <li key={phase}>{phase}</li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  )
}

export default App
