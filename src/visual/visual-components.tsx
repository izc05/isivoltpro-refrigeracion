import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Eye, Maximize2, X } from 'lucide-react'
import type { VisualResource } from '../domain/storage/db'
import {
  isPsychrometricMeasurementScope,
  psychrometricMeasurementChecklist,
  psychrometricMeasurementErrors,
  psychrometricMeasurementSteps,
} from './psychrometric-measurement-guide'
import { listVisualResources, visualTypeLabels } from './visual-resources'
import './psychrometric-measurement-guide.css'

type VisualScope = { module: string; calculator: string; field?: string }

function PsychrometricMeasurementDiagram({ label = 'Colocación correcta de una sonda de temperatura y humedad relativa' }: { label?: string }) {
  return <svg role="img" aria-label={label} viewBox="0 0 640 360">
    <title>{label}</title>
    <rect x="34" y="32" width="572" height="292" rx="22" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="2" />
    <rect x="158" y="112" width="320" height="166" rx="24" fill="color-mix(in srgb, var(--sz-success) 9%, var(--sz-panel))" stroke="color-mix(in srgb, var(--sz-success) 55%, var(--sz-border))" strokeWidth="3" strokeDasharray="10 7" />
    <text x="181" y="145" fill="var(--sz-success)" fontSize="19" fontWeight="700">Zona representativa</text>
    <text x="181" y="169" fill="var(--sz-muted)" fontSize="15">Aire de la zona ocupada</text>

    <rect x="54" y="62" width="112" height="42" rx="10" fill="var(--sz-panel)" stroke="var(--sz-primary)" strokeWidth="3" />
    <path d="M75 82h68M143 82l-18-11v22z" fill="none" stroke="var(--sz-primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M164 78c46 7 77 21 105 45M164 91c45 13 71 31 94 57" fill="none" stroke="var(--sz-primary)" strokeWidth="3" strokeDasharray="7 6" opacity=".7" />
    <text x="54" y="127" fill="var(--sz-warning)" fontSize="15">Evitar impulsión directa</text>

    <rect x="526" y="58" width="54" height="100" rx="8" fill="var(--sz-panel)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <path d="M553 58v100M526 108h54" stroke="var(--sz-border-strong)" strokeWidth="2" />
    <circle cx="555" cy="39" r="14" fill="color-mix(in srgb, var(--sz-warning) 35%, transparent)" stroke="var(--sz-warning)" strokeWidth="3" />
    <path d="M555 15v10M555 53v10M531 39h10M569 39h10" stroke="var(--sz-warning)" strokeWidth="3" strokeLinecap="round" />
    <text x="492" y="182" fill="var(--sz-warning)" fontSize="15">Evitar sol y ventana</text>

    <rect x="508" y="247" width="74" height="36" rx="8" fill="color-mix(in srgb, var(--sz-danger) 8%, var(--sz-panel))" stroke="var(--sz-danger)" strokeWidth="2" />
    <path d="M521 258h48M521 271h48" stroke="var(--sz-danger)" strokeWidth="3" strokeLinecap="round" />
    <text x="495" y="306" fill="var(--sz-warning)" fontSize="15">Evitar calor o frío</text>

    <circle cx="332" cy="192" r="34" fill="color-mix(in srgb, var(--sz-primary) 18%, var(--sz-panel))" stroke="var(--sz-primary)" strokeWidth="4" />
    <circle cx="332" cy="192" r="11" fill="var(--sz-primary)" />
    <path d="M332 226v50M300 276h64" stroke="var(--sz-primary)" strokeWidth="10" strokeLinecap="round" />
    <rect x="365" y="177" width="88" height="30" rx="15" fill="var(--sz-primary)" />
    <text x="382" y="197" fill="var(--sz-primary-text)" fontSize="16" fontWeight="750">Sonda T / HR</text>
    <path d="M366 210c-30 12-55 11-78 1" fill="none" stroke="var(--sz-success)" strokeWidth="3" strokeDasharray="5 5" />
    <text x="202" y="233" fill="var(--sz-success)" fontSize="15">Aire libre alrededor</text>
  </svg>
}

function Diagram({ id, label }: { id: string; label: string }) {
  const common = { role: 'img' as const, 'aria-label': label, viewBox: '0 0 640 360' }

  if (id === 'diagram:pressure-temperature') return <svg {...common}>
    <circle cx="150" cy="180" r="82" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <path d="M150 180l45-52" stroke="var(--sz-primary)" strokeWidth="12" strokeLinecap="round" />
    <path d="M260 180h112" stroke="var(--sz-primary)" strokeWidth="12" strokeLinecap="round" />
    <path d="M355 150l48 30-48 30z" fill="var(--sz-primary)" />
    <rect x="438" y="78" width="54" height="190" rx="27" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <circle cx="465" cy="274" r="43" fill="color-mix(in srgb, var(--sz-primary) 24%, var(--sz-panel))" stroke="var(--sz-primary)" strokeWidth="3" />
    <path d="M465 238V120" stroke="var(--sz-primary)" strokeWidth="14" strokeLinecap="round" />
    <text x="92" y="303" fill="var(--sz-text)" fontSize="24">Presión</text>
    <text x="420" y="338" fill="var(--sz-text)" fontSize="24">T saturación</text>
    <text x="270" y="132" fill="var(--sz-muted)" fontSize="18">P ↔ T</text>
  </svg>

  if (id === 'diagram:superheat') return <svg {...common}>
    <rect x="68" y="90" width="210" height="180" rx="20" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <path d="M92 230c35-120 70 0 105-120 26 72 52 80 75 28" fill="none" stroke="var(--sz-primary)" strokeWidth="11" strokeLinecap="round" />
    <path d="M278 180h252" stroke="var(--sz-primary)" strokeWidth="18" strokeLinecap="round" />
    <circle cx="360" cy="180" r="36" fill="var(--sz-panel)" stroke="var(--sz-secondary)" strokeWidth="5" />
    <path d="M360 180l15-18" stroke="var(--sz-secondary)" strokeWidth="7" strokeLinecap="round" />
    <rect x="446" y="126" width="50" height="108" rx="22" fill="var(--sz-panel)" stroke="var(--sz-warning)" strokeWidth="5" />
    <text x="84" y="316" fill="var(--sz-text)" fontSize="21">Salida evaporador</text>
    <text x="326" y="244" fill="var(--sz-muted)" fontSize="17">Presión</text>
    <text x="433" y="257" fill="var(--sz-muted)" fontSize="17">T tubería</text>
    <text x="318" y="72" fill="var(--sz-text)" fontSize="24">Ttubo − Tsat (rocío)</text>
  </svg>

  if (id === 'diagram:subcooling') return <svg {...common}>
    <rect x="362" y="88" width="210" height="184" rx="20" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <path d="M380 122c34 116 68 0 102 116 27-71 53-80 76-28" fill="none" stroke="var(--sz-secondary)" strokeWidth="11" strokeLinecap="round" />
    <path d="M100 180h262" stroke="var(--sz-secondary)" strokeWidth="18" strokeLinecap="round" />
    <circle cx="176" cy="180" r="36" fill="var(--sz-panel)" stroke="var(--sz-primary)" strokeWidth="5" />
    <path d="M176 180l15-18" stroke="var(--sz-primary)" strokeWidth="7" strokeLinecap="round" />
    <rect x="266" y="126" width="50" height="108" rx="22" fill="var(--sz-panel)" stroke="var(--sz-warning)" strokeWidth="5" />
    <text x="360" y="316" fill="var(--sz-text)" fontSize="21">Salida condensador</text>
    <text x="140" y="244" fill="var(--sz-muted)" fontSize="17">Presión</text>
    <text x="253" y="257" fill="var(--sz-muted)" fontSize="17">T tubería</text>
    <text x="205" y="72" fill="var(--sz-text)" fontSize="24">Tsat (burbuja) − Ttubo</text>
  </svg>

  if (id === 'diagram:vacuum') return <svg {...common}>
    <rect x="66" y="216" width="126" height="82" rx="16" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <circle cx="129" cy="214" r="34" fill="var(--sz-primary)" opacity=".2" stroke="var(--sz-primary)" strokeWidth="4" />
    <path d="M192 255h96V130h112" fill="none" stroke="var(--sz-primary)" strokeWidth="12" strokeLinecap="round" />
    <rect x="282" y="96" width="120" height="68" rx="14" fill="var(--sz-panel)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <circle cx="322" cy="130" r="20" fill="none" stroke="var(--sz-secondary)" strokeWidth="4" />
    <circle cx="362" cy="130" r="20" fill="none" stroke="var(--sz-warning)" strokeWidth="4" />
    <path d="M402 130h118v104" fill="none" stroke="var(--sz-secondary)" strokeWidth="12" strokeLinecap="round" />
    <rect x="486" y="234" width="72" height="58" rx="12" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <circle cx="455" cy="130" r="28" fill="var(--sz-panel)" stroke="var(--sz-success)" strokeWidth="5" />
    <text x="432" y="136" fill="var(--sz-text)" fontSize="16">μm</text>
    <text x="82" y="332" fill="var(--sz-text)" fontSize="20">Bomba</text>
    <text x="270" y="78" fill="var(--sz-text)" fontSize="20">Manifold</text>
    <text x="418" y="84" fill="var(--sz-text)" fontSize="19">Vacuómetro</text>
    <text x="468" y="324" fill="var(--sz-text)" fontSize="20">Equipo</text>
  </svg>

  if (id === 'diagram:additional-charge') return <svg {...common}>
    <rect x="78" y="86" width="108" height="184" rx="26" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <path d="M110 86V58h44v28" fill="none" stroke="var(--sz-primary)" strokeWidth="9" />
    <rect x="54" y="278" width="156" height="38" rx="12" fill="var(--sz-panel)" stroke="var(--sz-primary)" strokeWidth="3" />
    <text x="92" y="304" fill="var(--sz-text)" fontSize="18">Báscula</text>
    <path d="M186 178h210" stroke="var(--sz-primary)" strokeWidth="13" strokeLinecap="round" />
    <path d="M386 150l48 28-48 28z" fill="var(--sz-primary)" />
    <rect x="444" y="90" width="132" height="184" rx="18" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <circle cx="510" cy="160" r="42" fill="none" stroke="var(--sz-secondary)" strokeWidth="9" />
    <text x="224" y="126" fill="var(--sz-text)" fontSize="22">Longitud adicional</text>
    <text x="216" y="238" fill="var(--sz-muted)" fontSize="20">metros × g/m fabricante</text>
  </svg>

  if (id === 'diagram:technical-converter') return <svg {...common}>
    <rect x="58" y="82" width="170" height="82" rx="18" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <rect x="412" y="82" width="170" height="82" rx="18" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <path d="M244 123h144" stroke="var(--sz-primary)" strokeWidth="12" strokeLinecap="round" />
    <path d="M372 96l44 27-44 27z" fill="var(--sz-primary)" />
    <text x="111" y="134" fill="var(--sz-text)" fontSize="26">bar</text>
    <text x="467" y="134" fill="var(--sz-text)" fontSize="26">psi</text>
    <rect x="58" y="214" width="170" height="82" rx="18" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <rect x="412" y="214" width="170" height="82" rx="18" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <path d="M244 255h144" stroke="var(--sz-secondary)" strokeWidth="12" strokeLinecap="round" />
    <path d="M372 228l44 27-44 27z" fill="var(--sz-secondary)" />
    <text x="113" y="266" fill="var(--sz-text)" fontSize="26">°C</text>
    <text x="470" y="266" fill="var(--sz-text)" fontSize="26">°F</text>
  </svg>

  if (id === 'diagram:refrigerant-safety') return <svg {...common}>
    <rect x="76" y="64" width="126" height="230" rx="34" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <path d="M112 64V35h54v29" fill="none" stroke="var(--sz-primary)" strokeWidth="10" />
    <rect x="100" y="128" width="78" height="72" rx="10" fill="var(--sz-panel)" stroke="var(--sz-primary)" strokeWidth="3" />
    <text x="112" y="156" fill="var(--sz-text)" fontSize="18">R32</text>
    <text x="108" y="183" fill="var(--sz-warning)" fontSize="18">A2L</text>
    <path d="M326 76l86 150H240z" fill="color-mix(in srgb, var(--sz-warning) 18%, var(--sz-panel))" stroke="var(--sz-warning)" strokeWidth="5" />
    <path d="M326 119c28 40-5 48 8 72 30-13 43-45 12-83 2 22-10 30-20 11z" fill="var(--sz-warning)" />
    <rect x="444" y="88" width="128" height="64" rx="16" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <rect x="444" y="174" width="128" height="64" rx="16" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <text x="467" y="127" fill="var(--sz-text)" fontSize="20">PCA / GWP</text>
    <text x="474" y="213" fill="var(--sz-text)" fontSize="20">Aceite</text>
    <text x="86" y="328" fill="var(--sz-muted)" fontSize="18">Leer placa y ficha de seguridad</text>
  </svg>

  if (id === 'diagram:refrigerant-comparison') return <svg {...common}>
    <rect x="62" y="62" width="150" height="236" rx="24" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <rect x="428" y="62" width="150" height="236" rx="24" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <text x="111" y="112" fill="var(--sz-primary)" fontSize="26">Gas A</text>
    <text x="478" y="112" fill="var(--sz-secondary)" fontSize="26">Gas B</text>
    <path d="M232 105h176M232 180h176M232 255h176" stroke="var(--sz-border-strong)" strokeWidth="3" strokeDasharray="8 8" />
    <text x="279" y="96" fill="var(--sz-text)" fontSize="19">Seguridad</text>
    <text x="298" y="171" fill="var(--sz-text)" fontSize="19">GWP</text>
    <text x="298" y="246" fill="var(--sz-text)" fontSize="19">Glide</text>
    <text x="198" y="336" fill="var(--sz-warning)" fontSize="18">Comparar no significa sustituir directamente</text>
  </svg>

  if (id === 'diagram:guided-diagnostics') return <svg {...common}>
    <rect x="242" y="34" width="156" height="62" rx="16" fill="var(--sz-primary)" opacity=".18" stroke="var(--sz-primary)" strokeWidth="3" />
    <text x="274" y="73" fill="var(--sz-text)" fontSize="21">Síntoma</text>
    <path d="M320 96v52M320 148H170M320 148h150" stroke="var(--sz-border-strong)" strokeWidth="5" fill="none" />
    <rect x="88" y="148" width="164" height="64" rx="16" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <rect x="388" y="148" width="164" height="64" rx="16" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" strokeWidth="3" />
    <text x="116" y="187" fill="var(--sz-text)" fontSize="19">Medir presión</text>
    <text x="414" y="187" fill="var(--sz-text)" fontSize="19">Medir temperatura</text>
    <path d="M170 212v62M470 212v62" stroke="var(--sz-primary)" strokeWidth="5" />
    <rect x="78" y="274" width="184" height="58" rx="16" fill="var(--sz-panel)" stroke="var(--sz-success)" strokeWidth="3" />
    <rect x="378" y="274" width="184" height="58" rx="16" fill="var(--sz-panel)" stroke="var(--sz-warning)" strokeWidth="3" />
    <text x="118" y="310" fill="var(--sz-text)" fontSize="18">Hipótesis probable</text>
    <text x="421" y="310" fill="var(--sz-text)" fontSize="18">Dato pendiente</text>
  </svg>

  if (id === 'diagram:psychrometrics-rh') return <PsychrometricMeasurementDiagram label={label} />

  if (id === 'diagram:duct-airflow') return <svg {...common}>
    <rect x="250" y="85" width="245" height="175" rx="8" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" />
    <path d="M70 175h345" stroke="var(--sz-primary)" strokeWidth="20" strokeLinecap="round" />
    <path d="M390 135l70 40-70 40z" fill="var(--sz-primary)" />
    <text x="72" y="132" fill="var(--sz-text)" fontSize="22">Q aire</text>
    <text x="300" y="294" fill="var(--sz-muted)" fontSize="18">Sección A</text>
  </svg>

  if (id === 'diagram:hydraulics-flow') return <svg {...common}>
    <rect x="245" y="92" width="150" height="170" rx="14" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" />
    <path d="M90 130h420" stroke="var(--sz-primary)" strokeWidth="16" fill="none" strokeLinecap="round" />
    <path d="M510 130l-28-18v36z" fill="var(--sz-primary)" />
    <path d="M550 230H130" stroke="var(--sz-secondary)" strokeWidth="16" fill="none" strokeLinecap="round" />
    <path d="M130 230l28-18v36z" fill="var(--sz-secondary)" />
    <text x="96" y="98" fill="var(--sz-text)" fontSize="20">Ida</text>
    <text x="474" y="274" fill="var(--sz-text)" fontSize="20">Retorno</text>
  </svg>

  return <svg {...common}>
    <rect x="70" y="80" width="500" height="220" rx="18" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" />
    <circle cx="320" cy="180" r="38" fill="var(--sz-primary)" opacity=".18" />
    <text x="195" y="250" fill="var(--sz-muted)" fontSize="20">Recurso técnico IsiVoltPro</text>
  </svg>
}

function VisualMedia({ resource }: { resource: VisualResource }) {
  if (resource.imagePath.startsWith('diagram:')) return <Diagram id={resource.imagePath} label={resource.altText} />
  return <img loading="lazy" src={resource.imagePath} alt={resource.altText} />
}

export function AnnotatedImage({ resource, onZoom }: { resource: VisualResource; onZoom?: () => void }) {
  return <figure className="sz-annotated-image"><div className="sz-visual-media"><VisualMedia resource={resource} />{resource.annotations.map((annotation) => <span className="sz-annotation-pin" key={annotation.id} style={{ left: `${annotation.xPct}%`, top: `${annotation.yPct}%` }} title={annotation.description}>{annotation.label}</span>)}{onZoom && <button className="sz-visual-zoom" type="button" onClick={onZoom} aria-label="Ampliar imagen"><Maximize2 /></button>}</div><figcaption><strong>{resource.title}</strong><small>{resource.description}</small></figcaption></figure>
}

export function ImageZoomViewer({ resource, onClose }: { resource: VisualResource | null; onClose: () => void }) {
  if (!resource) return null
  return <div className="sz-modal-backdrop" role="dialog" aria-modal="true"><div className="sz-visual-modal sz-zoom-viewer"><button className="sz-icon-button" type="button" onClick={onClose} aria-label="Cerrar"><X /></button><AnnotatedImage resource={resource} /><div className="sz-data-list compact"><p><span>Fuente</span><strong>{resource.source}</strong></p><p><span>Licencia</span><strong>{resource.license}</strong></p></div></div></div>
}

export function TechnicalImageGallery({ module, calculator, field }: VisualScope) {
  const [resources, setResources] = useState<VisualResource[]>([])
  const [zoom, setZoom] = useState<VisualResource | null>(null)
  useEffect(() => { void listVisualResources(module, calculator).then(setResources) }, [module, calculator])
  const visible = useMemo(() => field ? resources.filter((resource) => resource.relatedFields.includes(field) || resource.annotations.some((annotation) => annotation.field === field)) : resources, [field, resources])
  if (!visible.length) return <section className="sz-panel"><h2>Imágenes técnicas</h2><p>No hay recursos visuales activos para esta herramienta todavía.</p></section>
  return <section className="sz-technical-gallery"><div className="sz-gallery-grid">{visible.map((resource) => <article className="sz-gallery-card" key={resource.id}><span className="sz-badge ok">{visualTypeLabels[resource.type]}</span><AnnotatedImage resource={resource} onZoom={() => setZoom(resource)} /><div className="sz-tag-row">{resource.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}</div><ImageZoomViewer resource={zoom} onClose={() => setZoom(null)} /></section>
}

function PsychrometricMeasurementGuide({ onClose }: { onClose: () => void }) {
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return <div className="sz-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="psychro-guide-title">
    <div className="psychro-guide-modal">
      <div className="psychro-guide-scroll">
        <button className="psychro-guide-close" type="button" onClick={onClose} aria-label="Cerrar explicación"><X /></button>
        <header className="psychro-guide-header">
          <small>Procedimiento de campo</small>
          <h2 id="psychro-guide-title">Cómo medir temperatura y humedad</h2>
          <p>El objetivo es obtener un estado de aire representativo del local, sin que la lectura quede alterada por una impulsión, una superficie o una fuente de calor.</p>
        </header>

        <div className="psychro-guide-hero">
          <PsychrometricMeasurementDiagram />
          <p className="psychro-guide-caption">Sitúa el termo-higrómetro en la zona ocupada, con aire libre alrededor y fuera de influencias directas.</p>
        </div>

        <section className="psychro-guide-section" aria-labelledby="psychro-guide-steps-title">
          <h3 id="psychro-guide-steps-title">Procedimiento en cuatro pasos</h3>
          <div className="psychro-guide-steps">{psychrometricMeasurementSteps.map((step, index) => <article className="psychro-guide-step" key={step.title}><span>{index + 1}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></article>)}</div>
        </section>

        <section className="psychro-guide-section" aria-labelledby="psychro-guide-position-title">
          <h3 id="psychro-guide-position-title">Colocación correcta e incorrecta</h3>
          <div className="psychro-guide-comparison">
            <article className="psychro-guide-example is-correct"><span>Correcto</span><strong>Zona representativa</strong><p>Sonda separada de paredes, sin corriente directa y con la lectura estabilizada.</p></article>
            <article className="psychro-guide-example is-wrong"><span>Revisar</span><strong>Lectura influenciada</strong><p>Sonda frente a una impulsión, junto a una ventana o apoyada sobre una superficie.</p></article>
          </div>
        </section>

        <section className="psychro-guide-section" aria-labelledby="psychro-guide-errors-title">
          <button className="psychro-guide-errors-toggle" type="button" aria-expanded={showErrors} onClick={() => setShowErrors(!showErrors)}><strong id="psychro-guide-errors-title">Errores frecuentes</strong><span>{showErrors ? 'Ocultar' : 'Ver errores'}</span></button>
          {showErrors && <ul className="psychro-guide-errors">{psychrometricMeasurementErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
        </section>

        <section className="psychro-guide-section" aria-labelledby="psychro-guide-check-title">
          <h3 id="psychro-guide-check-title">Comprobación antes de calcular</h3>
          <div className="psychro-guide-checklist">{psychrometricMeasurementChecklist.map((item) => <p key={item}>{item}</p>)}</div>
        </section>

        <div className="psychro-guide-actions"><button className="sz-button primary" type="button" onClick={onClose}>Entendido, ir a la medición</button></div>
      </div>
    </div>
  </div>
}

export function VisualHelpModal({ scope, title, onClose }: { scope: VisualScope; title: string; onClose: () => void }) {
  if (isPsychrometricMeasurementScope(scope)) return <PsychrometricMeasurementGuide onClose={onClose} />
  return <div className="sz-modal-backdrop" role="dialog" aria-modal="true"><div className="sz-visual-modal"><button className="sz-icon-button" type="button" onClick={onClose} aria-label="Cerrar"><X /></button><h2>{title}</h2><TechnicalImageGallery {...scope} /></div></div>
}

export function VisualHelpButton({ scope, label = 'Ayuda visual' }: { scope: VisualScope; label?: string }) {
  const [open, setOpen] = useState(false)
  return <><button className="sz-visual-help-button" type="button" onClick={() => setOpen(true)}><Eye />{label}</button>{open && <VisualHelpModal scope={scope} title={label} onClose={() => setOpen(false)} />}</>
}

export function StepByStepGallery({ steps }: { steps: Array<{ title: string; text: string; media?: ReactNode }> }) {
  return <div className="sz-step-gallery">{steps.map((step, index) => <article key={step.title}><span>{index + 1}</span>{step.media}<strong>{step.title}</strong><p>{step.text}</p></article>)}</div>
}

export function CorrectIncorrectComparison({ correct, incorrect }: { correct: VisualResource; incorrect: VisualResource }) {
  return <div className="sz-comparison"><article><span className="sz-badge ok">Correcto</span><AnnotatedImage resource={correct} /></article><article><span className="sz-badge pending">Revisar</span><AnnotatedImage resource={incorrect} /></article></div>
}

export function InteractiveDiagram({ title, children }: { title: string; children: ReactNode }) {
  return <section className="sz-panel sz-interactive-diagram"><h2>{title}</h2>{children}</section>
}
