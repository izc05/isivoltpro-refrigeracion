import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Eye, Maximize2, X } from 'lucide-react'
import type { VisualResource } from '../domain/storage/db'
import { listVisualResources, visualTypeLabels } from './visual-resources'

type VisualScope = { module: string; calculator: string; field?: string }

const chart = { left: 58, top: 36, width: 512, height: 278, tMin: -10, tMax: 50, wMax: 32 }

function psychX(tempC: number) {
  return chart.left + ((tempC - chart.tMin) / (chart.tMax - chart.tMin)) * chart.width
}

function psychY(humidityGKg: number) {
  return chart.top + chart.height - (humidityGKg / chart.wMax) * chart.height
}

function saturationGKg(tempC: number) {
  const satVaporPa = 610.94 * Math.exp((17.625 * tempC) / (tempC + 243.04))
  const ratio = 0.62198 * satVaporPa / Math.max(1, 101325 - satVaporPa)
  return Math.min(chart.wMax, ratio * 1000)
}

function curvePath(relativeHumidity: number) {
  const points = Array.from({ length: 62 }, (_, index) => {
    const temp = chart.tMin + index * ((chart.tMax - chart.tMin) / 61)
    return `${psychX(temp).toFixed(1)},${psychY(saturationGKg(temp) * relativeHumidity).toFixed(1)}`
  })
  return `M${points.join(' L')}`
}

function PsychrometricChartDiagram() {
  const verticals = Array.from({ length: 13 }, (_, index) => -10 + index * 5)
  const horizontals = Array.from({ length: 9 }, (_, index) => index * 4)
  const rhCurves = [0.2, 0.4, 0.6, 0.8, 1]
  const enthalpy = [-10, 0, 10, 20, 30, 40, 50]
  const process = [
    [psychX(10), psychY(7.7)],
    [psychX(25), psychY(7.7)],
    [psychX(35), psychY(26.8)],
    [psychX(20), psychY(26.8)],
  ]
  return <svg className="psychro-chart-svg" viewBox="0 0 640 360" role="img" aria-labelledby="psychro-chart-title psychro-chart-desc">
    <title id="psychro-chart-title">Carta psicrométrica simplificada</title>
    <desc id="psychro-chart-desc">Diagrama técnico de temperatura seca, humedad absoluta, humedad relativa, entalpía y proceso de aire.</desc>
    <defs>
      <linearGradient id="psychro-bg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f8fdff" /><stop offset="1" stopColor="#d8f3ff" /></linearGradient>
      <marker id="psychro-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0l8 4-8 4z" fill="#dc2626" /></marker>
    </defs>
    <rect x="0" y="0" width="640" height="360" rx="18" fill="url(#psychro-bg)" />
    <path d={`M${psychX(chart.tMin)},${psychY(saturationGKg(chart.tMin))} ${Array.from({ length: 80 }, (_, index) => {
      const temp = chart.tMin + index * ((chart.tMax - chart.tMin) / 79)
      return `L${psychX(temp).toFixed(1)},${psychY(saturationGKg(temp)).toFixed(1)}`
    }).join(' ')} L${psychX(chart.tMax)},${psychY(0)} L${psychX(chart.tMin)},${psychY(0)} Z`} fill="#dff7ff" opacity=".7" />
    {verticals.map((temp) => <g key={`v-${temp}`}><line x1={psychX(temp)} y1={chart.top} x2={psychX(temp)} y2={chart.top + chart.height} className="psychro-grid" /><text x={psychX(temp)} y={340} className="psychro-axis-label" textAnchor="middle">{temp}</text></g>)}
    {horizontals.map((humidity) => <g key={`h-${humidity}`}><line x1={chart.left} y1={psychY(humidity)} x2={chart.left + chart.width} y2={psychY(humidity)} className="psychro-grid" /><text x={586} y={psychY(humidity) + 4} className="psychro-axis-label">{(humidity / 1000).toFixed(3)}</text></g>)}
    {enthalpy.map((value, index) => <line key={value} x1={psychX(-8 + index * 7)} y1={psychY(0)} x2={psychX(14 + index * 7)} y2={psychY(32)} className="psychro-diagonal" />)}
    {rhCurves.map((rh) => <g key={rh}><path d={curvePath(rh)} className={rh === 1 ? 'psychro-saturation' : 'psychro-rh'} /><text x={psychX(42)} y={psychY(saturationGKg(42) * rh) - 4} className="psychro-rh-label">{Math.round(rh * 100)}%</text></g>)}
    <path d={`M${process.map(([x, y]) => `${x},${y}`).join(' L')}`} className="psychro-process psychro-cooling" markerEnd="url(#psychro-arrow)" />
    <line x1={psychX(35)} y1={psychY(0)} x2={psychX(35)} y2={psychY(26.8)} className="psychro-guide" />
    <line x1={chart.left} y1={psychY(26.8)} x2={psychX(35)} y2={psychY(26.8)} className="psychro-guide" />
    <circle cx={psychX(35)} cy={psychY(26.8)} r="5" className="psychro-point aa" /><text x={psychX(35) + 8} y={psychY(26.8) - 8} className="psychro-point-label">AA</text>
    <circle cx={psychX(25)} cy={psychY(7.7)} r="5" className="psychro-point da" /><text x={psychX(25) + 8} y={psychY(7.7) - 8} className="psychro-point-label">DA</text>
    <circle cx={psychX(10)} cy={psychY(7.7)} r="5" className="psychro-point pp" /><text x={psychX(10) - 20} y={psychY(7.7) - 8} className="psychro-point-label">PP</text>
    <text x="320" y="22" textAnchor="middle" className="psychro-title">Carta psicrométrica · aire húmedo</text>
    <text x="320" y="353" textAnchor="middle" className="psychro-axis-title">Temperatura seca (°C)</text>
    <text x="596" y="24" className="psychro-axis-title">Humedad absoluta (kg/kg)</text>
    <text x="82" y="54" className="psychro-legend">HR · Entalpía · Volumen específico</text>
  </svg>
}

function Diagram({ id }: { id: string }) {
  if (id === 'diagram:duct-airflow') return <svg viewBox="0 0 640 360" role="img"><defs><linearGradient id="duct-body" x1="0" x2="1"><stop offset="0" stopColor="#d8f3ff" /><stop offset="1" stopColor="#f8fbff" /></linearGradient><linearGradient id="duct-flow" x1="0" x2="1"><stop offset="0" stopColor="#00c2ff" /><stop offset="1" stopColor="#2563eb" /></linearGradient></defs><rect x="32" y="32" width="576" height="296" rx="20" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" /><rect x="126" y="118" width="318" height="112" rx="16" fill="url(#duct-body)" stroke="#7dd3fc" strokeWidth="2" /><ellipse cx="126" cy="174" rx="42" ry="56" fill="#c7ecff" stroke="#38bdf8" strokeWidth="2" /><ellipse cx="444" cy="174" rx="42" ry="56" fill="#e9f8ff" stroke="#38bdf8" strokeWidth="2" /><path d="M82 174h330" stroke="url(#duct-flow)" strokeWidth="18" strokeLinecap="round" /><path d="M410 138l68 36-68 36z" fill="#2563eb" /><rect x="198" y="252" width="160" height="46" rx="12" fill="rgba(16,185,129,.14)" stroke="#10b981" /><rect x="384" y="252" width="120" height="46" rx="12" fill="rgba(250,204,21,.14)" stroke="#facc15" /><circle cx="522" cy="174" r="40" fill="none" stroke="#a855f7" strokeWidth="5" /><line x1="494" y1="146" x2="550" y2="202" stroke="#a855f7" strokeWidth="3" /><text x="66" y="92" fill="var(--sz-text)" fontSize="18" fontWeight="800">Tramo T01</text><text x="88" y="154" fill="var(--sz-text)" fontSize="16" fontWeight="800">Q</text><text x="192" y="106" fill="var(--sz-muted)" fontSize="15">600 x 300 mm</text><text x="220" y="182" fill="#0f172a" fontSize="17" fontWeight="800">Aire</text><text x="212" y="280" fill="#10b981" fontSize="14" fontWeight="800">v = 4,6 m/s</text><text x="398" y="280" fill="#ca8a04" fontSize="14" fontWeight="800">0,55 Pa/m</text><text x="484" y="234" fill="#a855f7" fontSize="14" fontWeight="800">Ø eq.</text><text x="65" y="266" fill="var(--sz-muted)" fontSize="14">Longitud · material · rugosidad</text><text x="70" y="300" fill="var(--sz-primary)" fontSize="13" fontWeight="800">Estado: adecuado / precaución / elevado</text></svg>
  if (id === 'diagram:hydraulics-flow') return <svg viewBox="0 0 640 360" role="img"><rect x="245" y="92" width="150" height="170" rx="14" fill="var(--sz-panel-muted)" stroke="var(--sz-border-strong)" /><path d="M90 130h420" stroke="var(--sz-primary)" strokeWidth="16" fill="none" strokeLinecap="round" /><path d="M510 130l-28-18v36z" fill="var(--sz-primary)" /><path d="M550 230H130" stroke="var(--sz-secondary)" strokeWidth="16" fill="none" strokeLinecap="round" /><path d="M130 230l28-18v36z" fill="var(--sz-secondary)" /><text x="96" y="98" fill="var(--sz-text)" fontSize="20">Ida</text><text x="474" y="274" fill="var(--sz-text)" fontSize="20">Retorno</text></svg>
  if (id === 'diagram:psychrometrics-rh') return <PsychrometricChartDiagram />
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

