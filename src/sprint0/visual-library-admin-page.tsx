import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Save } from 'lucide-react'
import { newId, type VisualAnnotation, type VisualResourceType } from '../domain/storage/db'
import { listAllLocalVisualResources, saveVisualResource, toggleVisualResource, visualResourceTypes, visualTypeLabels } from '../visual/visual-resources'
import type { VisualResource } from '../domain/storage/db'
import { Notice, PageTitle } from './shared'

const modules = ['refrigerants', 'psychrometrics', 'ducts', 'hydraulics', 'electricity', 'diagnostics']
const calculators = [
  'pressure-temperature',
  'superheat',
  'subcooling',
  'vacuum-procedure',
  'additional-charge',
  'technical-converter',
  'refrigerant-safety',
  'refrigerant-comparison',
  'guided-diagnostics',
  'dry-bulb-relative-humidity',
  'duct-sizing',
  'water-flow',
]

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function VisualLibraryAdminPage() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [items, setItems] = useState<VisualResource[]>([])
  const [message, setMessage] = useState('')
  const [module, setModule] = useState('psychrometrics')
  const [calculator, setCalculator] = useState('dry-bulb-relative-humidity')
  const [type, setType] = useState<VisualResourceType>('annotated-photo')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [altText, setAltText] = useState('')
  const [tags, setTags] = useState('')
  const [source, setSource] = useState('Fotografía propia')
  const [license, setLicense] = useState('Propia')
  const [imagePath, setImagePath] = useState('')
  const [relatedFields, setRelatedFields] = useState('')
  const [annotations, setAnnotations] = useState<VisualAnnotation[]>([])

  const load = () => void listAllLocalVisualResources().then(setItems)
  useEffect(load, [])

  const upload = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setMessage('Selecciona una imagen válida.'); return }
    if (file.size > 1_500_000) { setMessage('Imagen demasiado grande. Usa WebP/AVIF/JPG optimizado menor de 1,5 MB.'); return }
    setImagePath(await readFileAsDataUrl(file))
    setMessage('Imagen cargada localmente. Completa metadatos y guarda.')
  }

  const addAnnotation = () => {
    setAnnotations((current) => [...current, { id: newId('ann'), xPct: 50, yPct: 50, label: `Punto ${current.length + 1}`, description: '', field: '' }])
  }

  const save = async () => {
    if (!title.trim() || !description.trim() || !imagePath) { setMessage('Título, descripción e imagen son obligatorios.'); return }
    await saveVisualResource({
      module,
      calculator,
      type,
      title: title.trim(),
      description: description.trim(),
      imagePath,
      thumbnailPath: imagePath,
      altText: altText.trim() || title.trim(),
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      source: source.trim(),
      license: license.trim(),
      version: '1.0',
      annotations,
      relatedFields: relatedFields.split(',').map((field) => field.trim()).filter(Boolean),
      relatedCalculations: [calculator],
      active: true,
      sortOrder: Date.now(),
    })
    setTitle(''); setDescription(''); setAltText(''); setTags(''); setImagePath(''); setRelatedFields(''); setAnnotations([])
    setMessage('Recurso visual guardado en IndexedDB.')
    load()
  }

  return <main className="sz-screen sz-hub-screen"><PageTitle eyebrow="Biblioteca visual" title="Editor visual técnico" description="Añade fotografías propias, esquemas originales y anotaciones sin modificar código." />
    <section className="sz-panel sz-form">
      <div className="sz-two-columns"><label>Módulo<select value={module} onChange={(event) => setModule(event.target.value)}>{modules.map((item) => <option key={item}>{item}</option>)}</select></label><label>Calculadora<select value={calculator} onChange={(event) => setCalculator(event.target.value)}>{calculators.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <label>Tipo<select value={type} onChange={(event) => setType(event.target.value as VisualResourceType)}>{visualResourceTypes.map((item) => <option key={item} value={item}>{visualTypeLabels[item]}</option>)}</select></label>
      <div className="sz-two-columns"><label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Etiquetas<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="sonda, humedad, medición" /></label></div>
      <label>Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <label>Texto alternativo<input value={altText} onChange={(event) => setAltText(event.target.value)} /></label>
      <div className="sz-two-columns"><label>Fuente<input value={source} onChange={(event) => setSource(event.target.value)} /></label><label>Licencia<input value={license} onChange={(event) => setLicense(event.target.value)} /></label></div>
      <label>Campos relacionados<input value={relatedFields} onChange={(event) => setRelatedFields(event.target.value)} placeholder="dryBulbC, relativeHumidityPct" /></label>
      <div className="sz-button-row"><button className="sz-button secondary" type="button" onClick={() => fileRef.current?.click()}><ImagePlus />Subir imagen</button><button className="sz-button secondary" type="button" onClick={addAnnotation}>Añadir anotación</button><button className="sz-button primary" type="button" onClick={save}><Save />Guardar recurso</button></div>
      <input className="sr-only" ref={fileRef} type="file" accept="image/avif,image/webp,image/jpeg,image/png" onChange={(event) => void upload(event.target.files?.[0])} />
      {imagePath && <img className="sz-admin-preview" src={imagePath} alt="Previsualización" loading="lazy" />}
      {annotations.map((annotation, index) => <div className="sz-two-columns" key={annotation.id}><label>Anotación {index + 1}<input value={annotation.label} onChange={(event) => setAnnotations((current) => current.map((item) => item.id === annotation.id ? { ...item, label: event.target.value } : item))} /></label><label>Campo<input value={annotation.field ?? ''} onChange={(event) => setAnnotations((current) => current.map((item) => item.id === annotation.id ? { ...item, field: event.target.value } : item))} /></label></div>)}
    </section>
    {message && <Notice tone={message.includes('guardado') || message.includes('cargada') ? 'success' : 'warning'}><p>{message}</p></Notice>}
    <section className="sz-panel"><h2>Recursos locales</h2>{items.length ? <div className="sz-data-list">{items.map((item) => <p key={item.id}><span>{item.title}</span><strong><button className="sz-button secondary" type="button" onClick={() => void toggleVisualResource(item.id, !item.active).then(load)}>{item.active ? 'Desactivar' : 'Activar'}</button></strong></p>)}</div> : <p>No hay recursos visuales propios todavía.</p>}</section>
    <Notice tone="warning"><p>No copies imágenes de otras aplicaciones. Usa fotografías propias, diagramas originales o material con licencia explícita.</p></Notice>
  </main>
}
