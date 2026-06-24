import { ArrowUpDown, Gauge, LockKeyhole, Scale, Stethoscope, Table2, Thermometer } from 'lucide-react'

export type ToolCategory = 'refrigerantes' | 'mediciones' | 'servicio'

export const toolCategories: Array<{ id: 'todos' | ToolCategory; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'refrigerantes', label: 'Refrigerantes' },
  { id: 'mediciones', label: 'Mediciones' },
  { id: 'servicio', label: 'Servicio' },
]

export const tools = [
  {
    id: 'pt',
    title: 'Regla de refrigerantes',
    subtitle: 'Calcula presión y temperatura de saturación con burbuja y rocío.',
    path: '/pt',
    icon: Thermometer,
    category: 'refrigerantes',
  },
  {
    id: 'superheat',
    title: 'Recalentamiento',
    subtitle: 'Calcula el recalentamiento usando presión de aspiración y temperatura de tubería.',
    path: '/superheat',
    icon: ArrowUpDown,
    category: 'mediciones',
  },
  {
    id: 'subcooling',
    title: 'Subenfriamiento',
    subtitle: 'Calcula el subenfriamiento usando presión de alta y temperatura de líquido.',
    path: '/subcooling',
    icon: ArrowUpDown,
    category: 'mediciones',
  },
  {
    id: 'converter',
    title: 'Conversor técnico',
    subtitle: 'Convierte presión, vacío, potencia, masa, longitud y caudal.',
    path: '/converter',
    icon: Gauge,
    category: 'servicio',
  },
  {
    id: 'vacuum',
    title: 'Vacío y estabilidad',
    subtitle: 'Registra micrones, tiempo de vacío y evolución tras el aislamiento.',
    path: '/vacuum',
    icon: Gauge,
    category: 'servicio',
  },
  {
    id: 'charge',
    title: 'Calculadora de carga',
    subtitle: 'Calcula carga adicional por longitud usando el dato del fabricante.',
    path: '/charge',
    icon: LockKeyhole,
    category: 'servicio',
  },
  {
    id: 'refrigerants',
    title: 'Ficha de refrigerantes',
    subtitle: 'Consulta seguridad, GWP, glide, aceites y método de carga.',
    path: '/refrigerants',
    icon: Table2,
    category: 'refrigerantes',
  },
  {
    id: 'compare',
    title: 'Comparador de refrigerantes',
    subtitle: 'Compara propiedades y curvas sin declarar sustituciones directas.',
    path: '/compare',
    icon: Scale,
    category: 'refrigerantes',
  },
  {
    id: 'diagnostics',
    title: 'Resolución de problemas',
    subtitle: 'Genera hipótesis y comprobaciones a partir de las mediciones disponibles.',
    path: '/diagnostics',
    icon: Stethoscope,
    category: 'servicio',
  },
] as const
