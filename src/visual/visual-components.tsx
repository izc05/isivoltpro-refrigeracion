import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Eye, Maximize2, X } from 'lucide-react'
import type { VisualResource } from '../domain/storage/db'
import { listVisualResources, visualTypeLabels } from './visual-resources'

type VisualScope = { module: string; calculator: string; field?: string }

function Diagram({ id }: { id: string }) {
  if (id === 'diagram:duct-airflow') return <svg viewBox="0 0 640 360" role="img"><rect x="250" y="85" width="245" height="175" rx="8" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" /><path d="M70 175h345" stroke="var(--sz-primary)" strokeWidth="20" strokeLinecap="round" /><path d="M390 135l70 40-70 40z" fill="var(--sz-primary)" /><text x="72" y="132" fill="var(--sz-text)" fontSize="22">Q aire</text><text x="300" y="294" fill="var(--sz-muted)" fontSize="18">Sección A</text></svg>
  if (id === 'diagram:hydraulics-flow') return <svg viewBox="0 0 640 360" role="img"><rect x="245" y="92" width="150" height="170" rx="14" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" /><path d="M90 130h420" stroke="var(--sz-primary)" strokeWidth="16" fill="none" strokeLinecap="round" /><path d="M510 130l-28-18v36z" fill="var(--sz-primary)" /><path d="M550 230H130" stroke="var(--sz-secondary)" strokeWidth="16" fill="none" strokeLinecap="round" /><path d="M130 230l28-18v36z" fill="var(--sz-secondary)" /><text x="96" y="98" fill="var(--sz-text)" fontSize="20">Ida</text><text x="474" y="274" fill="var(--sz-text)" fontSize="20">Retorno</text></svg>
  return <svg viewBox="0 0 640 360" role="img"><rect x="70" y="80" width="500" height="220" rx="18" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" /><circle cx="330" cy="175" r="34" fill="var(--sz-primary)" opacity=".2" /><path d="M330 208v56M300 264h60" stroke="var(--sz-primary)" strokeWidth="12" strokeLinecap="round" /><text x="145" y="130" fill="var(--sz-text)" fontSize="22">Zona ocupada</text><text x="360" y="190" fill="var(--sz-muted)" fontSize="18">Sonda T / HR</text></svg>
}

function VisualMedia({ resource }: { resource: VisualResource }) {
  if (resource.imagePath.startsWith('diagram:')) return <Diagram id={resource.imagePath} />
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

export function VisualHelpModal({ scope, title, onClose }: { scope: VisualScope; title: string; onClose: () => void }) {
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

