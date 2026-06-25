import { useEffect, useRef, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { AlertTriangle, BookOpen, Building2, Camera, CheckCircle2, ClipboardList, Download, FileText, History, Moon, PackageSearch, Plus, RefreshCw, Save, Search, Sun, Trash2, UsersRound, Wrench, ChevronRight } from 'lucide-react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { refrigerantTables } from '../data/generated'
import { DEFAULT_ATMOSPHERE_PA } from '../domain/units'
import { db, exportBackup, importBackup, newId, type Intervention } from '../domain/storage/db'
import { generateInterventionPdf, interventionPdfFilename } from '../domain/reports/pdf'
import { downloadBlob, EmptyState, Notice, optionalNumber, PageTitle, useSettings } from './shared'


const workHubItems = [
  { title: 'Clientes', text: 'Datos, contacto, instalaciones e historial.', path: '/planned/clients', icon: UsersRound },
  { title: 'Instalaciones', text: 'Ubicación, uso, equipos asociados y documentación.', path: '/planned/installations', icon: Building2 },
  { title: 'Equipos', text: 'Placa, refrigerante, carga, QR, manuales e historial.', path: '/planned/equipment', icon: Wrench },
  { title: 'Intervenciones', text: 'Parte técnico, mediciones, diagnóstico y cierre.', path: '/interventions', icon: ClipboardList },
  { title: 'Fotos', text: 'Placas, mediciones, estado inicial y final.', path: '/planned/photos', icon: Camera },
  { title: 'Historial', text: 'Intervenciones, cálculos recientes y documentos.', path: '/planned/history', icon: History },
  { title: 'Informes PDF', text: 'Generación y consulta de informes desde intervenciones.', path: '/reports', icon: FileText },
]

const libraryItems = [
  { title: 'Refrigerantes', text: 'Fichas, seguridad, GWP, glide y fuentes.', path: '/refrigerants', icon: BookOpen },
  { title: 'Procedimientos', text: 'Vacío, estanqueidad, recuperación, carga y diagnóstico.', path: '/planned/procedures', icon: ClipboardList },
  { title: 'Normativa', text: 'Referencias técnicas y obligaciones aplicables.', path: '/planned/regulations', icon: FileText },
  { title: 'Productos', text: 'Equipos, repuestos, válvulas, filtros y compatibilidades.', path: '/planned/products', icon: PackageSearch },
  { title: 'Formación', text: 'Modo explicado, ejemplos, errores frecuentes y glosario.', path: '/planned/training', icon: BookOpen },
  { title: 'Biblioteca visual', text: 'Fotografías propias, esquemas, anotaciones y ayuda por campo.', path: '/visual-library', icon: Camera },
]

function HubGrid({ items }: { items: Array<{ title: string; text: string; path: string; icon: typeof BookOpen }> }) {
  return <div className="sz-hub-grid">{items.map((item) => { const Icon = item.icon; return <NavLink className="sz-hub-card" to={item.path} key={item.title}><span><Icon /></span><strong>{item.title}</strong><small>{item.text}</small><ChevronRight /></NavLink> })}</div>
}

export function WorkHubPage() {
  return <main className="sz-screen sz-hub-screen"><PageTitle eyebrow="Trabajo" title="Trabajo de campo" description="Clientes, instalaciones, equipos, intervenciones, fotografías, historial e informes PDF." /><HubGrid items={workHubItems} /><Notice tone="warning"><p>Los informes se gestionan dentro de Trabajo. Las herramientas solo guardan mediciones o borradores en intervención.</p></Notice></main>
}

export function LibraryPage() {
  return <main className="sz-screen sz-hub-screen"><PageTitle eyebrow="Biblioteca" title="Biblioteca técnica" description="Refrigerantes, procedimientos, normativa, productos y formación para el modo explicado." /><HubGrid items={libraryItems} /><Notice><p>Las referencias técnicas deben mantener fuente, fecha de revisión y limitaciones de uso.</p></Notice></main>
}

export function PlannedPage() {
  const { id } = useParams()
  const item = [...workHubItems, ...libraryItems].find((entry) => entry.path === `/planned/${id}`)
  const toolName = id?.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') ?? 'Módulo'
  return <main className="sz-screen sz-hub-screen"><PageTitle eyebrow="Pendiente de activar" title={item?.title ?? toolName} description={item?.text ?? 'Pantalla reservada para una herramienta o módulo de la hoja de ruta.'} /><section className="sz-panel"><h2>Diseño preparado, cálculo no activado</h2><p>Este acceso forma parte de la estructura iPhone navegable. La lógica se añadirá en la etapa correspondiente sin inventar datos técnicos ni sustituir cálculos validados.</p><div className="sz-data-list"><p><span>Modo rápido</span><strong>pendiente</strong></p><p><span>Modo explicado</span><strong>pendiente</strong></p><p><span>Guardar en intervención</span><strong>pendiente</strong></p></div></section><Notice tone="warning"><p>Hasta que se active, esta pantalla no muestra resultados técnicos ni recomendaciones de cálculo.</p></Notice></main>
}
const schema = z.object({
  clientName: z.string().trim().min(2, 'Indica el cliente.'),
  installationName: z.string().optional(), equipmentLabel: z.string().optional(), refrigerant: z.string().optional(),
  workType: z.string().min(2), status: z.enum(['borrador','terminada']), pressures: z.string().optional(), temperatures: z.string().optional(),
  superheatK: z.string().optional(), subcoolingK: z.string().optional(), finalVacuum: z.string().optional(), vacuumTestDuration: z.string().optional(),
  leakTest: z.string().optional(), recoveredRefrigerant: z.string().optional(), addedRefrigerant: z.string().optional(), materials: z.string().optional(),
  diagnosis: z.string().optional(), observations: z.string().optional(), conclusion: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function InterventionsPage() {
  const { technician } = useSettings()
  const [items,setItems]=useState<Intervention[]>([]),[query,setQuery]=useState(''),[show,setShow]=useState(true),[feedback,setFeedback]=useState('')
  const {register,handleSubmit,formState:{errors,isSubmitting},reset}=useForm<FormData>({resolver:zodResolver(schema),defaultValues:{clientName:'',workType:'Mantenimiento',status:'borrador',refrigerant:'R32'}})
  const load=()=>void db.interventions.orderBy('updatedAt').reverse().toArray().then(setItems)
  useEffect(()=>{void db.interventions.orderBy('updatedAt').reverse().toArray().then(setItems)},[])
  const save=async(data:FormData)=>{const now=new Date().toISOString();await db.interventions.put({id:newId('int'),date:now.slice(0,10),technician,clientName:data.clientName,installationName:data.installationName,equipmentLabel:data.equipmentLabel,refrigerant:data.refrigerant,workType:data.workType,status:data.status,pressures:data.pressures,temperatures:data.temperatures,superheatK:optionalNumber(data.superheatK),subcoolingK:optionalNumber(data.subcoolingK),finalVacuum:data.finalVacuum,vacuumTestDuration:data.vacuumTestDuration,leakTest:data.leakTest,recoveredRefrigerant:data.recoveredRefrigerant,addedRefrigerant:data.addedRefrigerant,materials:data.materials,diagnosis:data.diagnosis,observations:data.observations,conclusion:data.conclusion,photos:[],completedAt:data.status==='terminada'?now:undefined,createdAt:now,updatedAt:now});reset({clientName:'',workType:'Mantenimiento',status:'borrador',refrigerant:'R32'});setFeedback('Intervención guardada.');load()}
  const remove=async(id:string)=>{if(!confirm('¿Eliminar esta intervención local?'))return;await db.interventions.delete(id);load()}
  const pdf=(item:Intervention)=>downloadBlob(generateInterventionPdf(item),interventionPdfFilename(item))
  const visible=items.filter(i=>`${i.clientName} ${i.installationName??''} ${i.equipmentLabel??''} ${i.workType}`.toLowerCase().includes(query.toLowerCase()))
  return <main className="sz-screen"><div className="sz-title-actions"><PageTitle eyebrow="Trabajo de campo" title="Intervenciones" description="Registra antes, después y mediciones del informe."/><button className="sz-button primary" type="button" onClick={()=>setShow(!show)}><Plus/>{show?'Cerrar':'Nueva intervención'}</button></div>{show&&<form className="sz-panel sz-form" onSubmit={handleSubmit(save)}><div className="sz-two-columns"><label>Cliente *<input {...register('clientName')}/></label><label>Trabajo *<select {...register('workType')}><option>Mantenimiento</option><option>Avería</option><option>Instalación</option><option>Puesta en marcha</option><option>Estanqueidad</option><option>Recuperación</option></select></label></div>{errors.clientName&&<span className="sz-field-error">{errors.clientName.message}</span>}<div className="sz-two-columns"><label>Instalación<input {...register('installationName')}/></label><label>Equipo / ubicación<input {...register('equipmentLabel')}/></label></div><div className="sz-two-columns"><label>Refrigerante<select {...register('refrigerant')}><option value="">No indicado</option>{refrigerantTables.map(r=><option key={r.refrigerant}>{r.refrigerant}</option>)}</select></label><label>Estado<select {...register('status')}><option value="borrador">Borrador</option><option value="terminada">Terminada</option></select></label></div><fieldset><legend>Mediciones</legend><div className="sz-two-columns"><label>Presiones<input {...register('pressures')} placeholder="Baja / alta y unidades"/></label><label>Temperaturas<input {...register('temperatures')} placeholder="Retorno, impulsión, tuberías"/></label></div><div className="sz-two-columns"><label>Recalentamiento K<input {...register('superheatK')}/></label><label>Subenfriamiento K<input {...register('subcoolingK')}/></label></div><div className="sz-two-columns"><label>Vacío final<input {...register('finalVacuum')}/></label><label>Duración / estabilidad<input {...register('vacuumTestDuration')}/></label></div></fieldset><fieldset><legend>Refrigerante y estanqueidad</legend><label>Prueba estanqueidad<input {...register('leakTest')}/></label><div className="sz-two-columns"><label>Recuperado<input {...register('recoveredRefrigerant')}/></label><label>Añadido<input {...register('addedRefrigerant')}/></label></div></fieldset><label>Diagnóstico<textarea {...register('diagnosis')}/></label><label>Material<textarea {...register('materials')}/></label><label>Trabajo y observaciones<textarea {...register('observations')}/></label><label>Conclusión<textarea {...register('conclusion')}/></label><button className="sz-button primary" disabled={isSubmitting}><Save/>{isSubmitting?'Guardando…':'Guardar intervención'}</button>{feedback&&<Notice tone="success"><p>{feedback}</p></Notice>}</form>}<label className="sz-search"><Search/><span className="sr-only">Buscar</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente, equipo o trabajo"/></label><div className="sz-work-list">{visible.map(item=><article className="sz-work-card" key={item.id}><div className="sz-card-head"><div><span className="sz-eyebrow">{item.date} · {item.workType}</span><h2>{item.clientName}</h2><p>{item.installationName||'Instalación no indicada'} · {item.equipmentLabel||'Equipo no indicado'}</p></div><span className={`sz-badge ${item.status==='terminada'?'ok':'pending'}`}>{item.status}</span></div><div className="sz-data-list compact"><p><span>Refrigerante</span><strong>{item.refrigerant||'No indicado'}</strong></p><p><span>Presiones</span><strong>{item.pressures||'No indicadas'}</strong></p><p><span>Vacío</span><strong>{item.finalVacuum||'No indicado'}</strong></p></div><div className="sz-button-row"><button className="sz-button secondary" type="button" onClick={()=>pdf(item)}><Download/>PDF</button><button className="sz-button danger" type="button" onClick={()=>remove(item.id)}><Trash2/>Eliminar</button></div></article>)}</div>{!visible.length&&<EmptyState icon={<ClipboardList/>} title="No hay intervenciones" text={items.length?'No hay coincidencias.':'Crea la primera intervención o guarda un cálculo.'}/>} {!technician&&<Notice tone="warning"><p>Configura el técnico en Ajustes para incluirlo en el informe.</p></Notice>}</main>
}

export function ReportsPage() {
  const [items,setItems]=useState<Intervention[]>([])
  useEffect(()=>{void db.interventions.orderBy('updatedAt').reverse().toArray().then(setItems)},[])
  const pdf=(item:Intervention)=>downloadBlob(generateInterventionPdf(item),interventionPdfFilename(item))
  return <main className="sz-screen"><PageTitle eyebrow="Documentación" title="Informes PDF" description="Fecha y hora, mediciones, refrigerante, trabajo y conclusiones."/><section className="sz-summary-grid"><article className="sz-summary-card"><FileText/><div><strong>{items.length}</strong><p>Registradas</p></div></article><article className="sz-summary-card"><CheckCircle2/><div><strong>{items.filter(i=>i.status==='terminada').length}</strong><p>Terminadas</p></div></article><article className="sz-summary-card"><ClipboardList/><div><strong>{items.filter(i=>i.status==='borrador').length}</strong><p>Borradores</p></div></article></section><div className="sz-work-list">{items.map(item=><article className="sz-work-card" key={item.id}><div><span className="sz-eyebrow">{item.date}</span><h2>{item.clientName}</h2><p>{item.workType} · {item.equipmentLabel||'Equipo no indicado'}</p></div><button className="sz-button secondary" type="button" onClick={()=>pdf(item)}><Download/>Generar PDF</button></article>)}</div>{!items.length&&<EmptyState icon={<FileText/>} title="Sin informes" text="Se generan desde intervenciones guardadas."/>}</main>
}

export function SettingsPage() {
  const {atmospherePa,setAtmospherePa,technician,setTechnician,altitudeM,updateAltitude,theme,setTheme}=useSettings()
  const [message,setMessage]=useState(''),fileRef=useRef<HTMLInputElement|null>(null)
  const backup=async()=>{downloadBlob(new Blob([JSON.stringify(await exportBackup(),null,2)],{type:'application/json'}),`isivoltpro-backup-${new Date().toISOString().slice(0,10)}.json`);setMessage('Copia exportada.')}
  const restore=async(file?:File)=>{if(!file)return;try{await importBackup(JSON.parse(await file.text()));setMessage('Copia restaurada por ID.')}catch{setMessage('No se pudo importar la copia.')}}
  return <main className="sz-screen"><PageTitle eyebrow="Preferencias locales" title="Ajustes" description="Técnico, altitud, apariencia y copias de seguridad."/><section className="sz-panel sz-form"><label>Técnico<input value={technician} onChange={e=>setTechnician(e.target.value)} placeholder="Se muestra en el informe, no en la firma"/></label><div className="sz-two-columns"><label>Altitud m<input type="number" value={altitudeM} onChange={e=>updateAltitude(Number(e.target.value))}/></label><label>Presión atmosférica Pa<input type="number" value={Math.round(atmospherePa)} onChange={e=>setAtmospherePa(Number(e.target.value)||DEFAULT_ATMOSPHERE_PA)}/></label></div><label>Tema<div className="sz-theme-picker"><button type="button" className={theme==='dark'?'active':''} onClick={()=>setTheme('dark')}><Moon/>Oscuro premium</button><button type="button" className={theme==='light'?'active':''} onClick={()=>setTheme('light')}><Sun/>Claro</button></div></label></section><section className="sz-panel"><h2>Copias de seguridad</h2><p>Exporta clientes, equipos e intervenciones a JSON local.</p><div className="sz-button-row"><button className="sz-button secondary" type="button" onClick={backup}><Download/>Exportar</button><button className="sz-button secondary" type="button" onClick={()=>fileRef.current?.click()}><RefreshCw/>Restaurar</button></div><input className="sr-only" ref={fileRef} type="file" accept="application/json,.json" onChange={e=>void restore(e.target.files?.[0])}/>{message&&<Notice tone={message.startsWith('No')?'danger':'success'}><p>{message}</p></Notice>}</section><Notice><p>Sin analítica, publicidad ni servicios externos. Los datos permanecen en el dispositivo.</p></Notice></main>
}

export function NotFoundPage() {
  return <main className="sz-screen sz-not-found"><EmptyState icon={<AlertTriangle/>} title="Página no encontrada" text="La dirección no corresponde a una herramienta disponible."/><NavLink className="sz-button primary" to="/">Volver al inicio</NavLink></main>
}
