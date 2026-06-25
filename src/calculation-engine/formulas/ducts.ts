import { interpretDuctSizing } from '../interpretation/ducts'
import type { CalculationContext, CalculationEnvelope, CalculationWarning } from '../types'
import { defaultCalculationContext } from '../types'
import { DuctSizingInputSchema, type DuctSizingInput, type DuctSizingParsedInput } from '../validation/ducts'

export type DuctAlternative = {
  id: string
  label: string
  shape: 'rectangular' | 'circular'
  widthMm?: number
  heightMm?: number
  diameterMm?: number
  areaM2: number
  hydraulicDiameterMm: number
  velocityMs: number
  pressureLossPaM: number
  totalLinearLossPa: number
  status: 'low' | 'normal' | 'high'
  note: string
}

export type DuctSizingResult = {
  airflowM3s: number
  airflowM3h: number
  airflowLs: number
  airflowCfm: number
  areaM2: number
  areaCm2: number
  circularDiameterM: number
  circularDiameterMm: number
  areaEquivalentDiameterMm: number
  hydraulicDiameterMm: number
  frictionEquivalentCircularDiameterMm: number
  rectangularWidthMm: number
  rectangularHeightMm: number
  actualVelocityMs: number
  pressureLossPaM: number
  totalLinearLossPa: number
  totalLinearLossMmca: number
  reynolds: number
  frictionFactor: number
  roughnessMm: number
  relativeRoughness: number
  airDensityKgM3: number
  airDynamicViscosityPas: number
  materialLabel: string
  networkTypeLabel: string
  aspectRatioWarning: string | null
  alternatives: DuctAlternative[]
}

const warnings: CalculationWarning[] = [
  { code: 'ORIENTATIVE_RESULT', severity: 'info', message: 'Dimensionado orientativo; revisar pérdidas de carga, ruido, accesorios y normativa aplicable.' },
  { code: 'PROJECT_PRIORITY', severity: 'info', message: 'El proyecto, fabricante y mediciones de equilibrado tienen prioridad.' },
  { code: 'NO_ACCESSORIES_INCLUDED', severity: 'warning', message: 'La pérdida calculada es lineal; no incluye codos, tes, reducciones, rejillas, filtros ni silenciadores.' },
]

const materialRoughness: Record<Exclude<DuctSizingParsedInput['material'], 'custom'>, { label: string; roughnessMm: number }> = {
  'galvanized-steel': { label: 'Chapa galvanizada', roughnessMm: 0.15 },
  'stainless-steel': { label: 'Acero inoxidable', roughnessMm: 0.10 },
  aluminum: { label: 'Aluminio', roughnessMm: 0.10 },
  pvc: { label: 'PVC', roughnessMm: 0.01 },
  'smooth-flex': { label: 'Flexible liso', roughnessMm: 0.30 },
  'corrugated-flex': { label: 'Flexible corrugado', roughnessMm: 3.00 },
  'duct-board': { label: 'Fibra / panel', roughnessMm: 0.90 },
}

const networkTypeLabels: Record<DuctSizingParsedInput['networkType'], string> = {
  'main-supply': 'Conducto principal de impulsión',
  'branch-supply': 'Ramal de impulsión',
  return: 'Retorno',
  exhaust: 'Extracción',
  'toilet-extract': 'Ventilación de aseos',
  'kitchen-hood': 'Campana',
  'flexible-run': 'Tramo flexible',
  'quiet-zone': 'Zona sensible al ruido',
}

const circularCommercialMm = [100, 125, 150, 160, 180, 200, 224, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000]
const rectangularWidthsMm = [200, 225, 250, 280, 300, 315, 355, 400, 450, 500, 560, 600, 630, 710, 800, 900, 1000, 1120, 1250]
const rectangularHeightsMm = [100, 125, 150, 160, 180, 200, 225, 250, 280, 300, 315, 355, 400, 450, 500, 560, 600]

function roundToStep(value: number, step: number) {
  return Math.ceil(value / step) * step
}

function airflowToM3h(input: DuctSizingParsedInput) {
  if (input.airflowUnit === 'L/s') return input.airflowM3h * 3.6
  if (input.airflowUnit === 'CFM') return input.airflowM3h * 1.69901082
  return input.airflowM3h
}

function airDensity(temperatureC: number, altitudeM: number) {
  const seaLevelPa = 101325
  const pressurePa = seaLevelPa * Math.pow(1 - (2.25577e-5 * altitudeM), 5.25588)
  const gasConstantDryAir = 287.05
  return pressurePa / (gasConstantDryAir * (temperatureC + 273.15))
}

function dynamicViscosityAir(temperatureC: number) {
  const temperatureK = temperatureC + 273.15
  const referenceT = 273.15
  const referenceMu = 1.716e-5
  const sutherland = 111
  return referenceMu * Math.pow(temperatureK / referenceT, 1.5) * ((referenceT + sutherland) / (temperatureK + sutherland))
}

function hydraulicDiameterRectangular(widthMm: number, heightMm: number) {
  const widthM = widthMm / 1000
  const heightM = heightMm / 1000
  return (2 * widthM * heightM) / (widthM + heightM)
}

function frictionFactor(reynolds: number, roughnessM: number, hydraulicDiameterM: number) {
  if (reynolds <= 0) return 0
  if (reynolds < 2300) return 64 / reynolds
  const relativeRoughness = roughnessM / hydraulicDiameterM
  return 0.25 / Math.pow(Math.log10((relativeRoughness / 3.7) + (5.74 / Math.pow(reynolds, 0.9))), 2)
}

function pressureLossPaM(input: { velocityMs: number; hydraulicDiameterM: number; roughnessM: number; density: number; viscosity: number }) {
  const reynolds = (input.density * input.velocityMs * input.hydraulicDiameterM) / input.viscosity
  const factor = frictionFactor(reynolds, input.roughnessM, input.hydraulicDiameterM)
  return { reynolds, frictionFactor: factor, pressureLossPaM: factor * (1 / input.hydraulicDiameterM) * ((input.density * input.velocityMs ** 2) / 2) }
}

function statusFor(velocityMs: number, pressurePaM: number): DuctAlternative['status'] {
  if (velocityMs > 7 || pressurePaM > 1.5) return 'high'
  if (velocityMs < 3.5 && pressurePaM < 0.45) return 'low'
  return 'normal'
}

function makeRectAlternative(id: string, label: string, widthMm: number, heightMm: number, airflowM3s: number, lengthM: number, roughnessM: number, density: number, viscosity: number): DuctAlternative {
  const areaM2 = (widthMm / 1000) * (heightMm / 1000)
  const velocityMs = airflowM3s / areaM2
  const hydraulicDiameterM = hydraulicDiameterRectangular(widthMm, heightMm)
  const loss = pressureLossPaM({ velocityMs, hydraulicDiameterM, roughnessM, density, viscosity })
  const status = statusFor(velocityMs, loss.pressureLossPaM)
  return {
    id,
    label,
    shape: 'rectangular',
    widthMm,
    heightMm,
    areaM2,
    hydraulicDiameterMm: hydraulicDiameterM * 1000,
    velocityMs,
    pressureLossPaM: loss.pressureLossPaM,
    totalLinearLossPa: loss.pressureLossPaM * lengthM,
    status,
    note: status === 'high' ? 'Mayor ruido y presión.' : status === 'low' ? 'Más silenciosa, ocupa más espacio.' : 'Equilibrada para el criterio.',
  }
}

function makeCircularAlternative(id: string, label: string, diameterMm: number, airflowM3s: number, lengthM: number, roughnessM: number, density: number, viscosity: number): DuctAlternative {
  const diameterM = diameterMm / 1000
  const areaM2 = Math.PI * diameterM ** 2 / 4
  const velocityMs = airflowM3s / areaM2
  const loss = pressureLossPaM({ velocityMs, hydraulicDiameterM: diameterM, roughnessM, density, viscosity })
  const status = statusFor(velocityMs, loss.pressureLossPaM)
  return {
    id,
    label,
    shape: 'circular',
    diameterMm,
    areaM2,
    hydraulicDiameterMm: diameterMm,
    velocityMs,
    pressureLossPaM: loss.pressureLossPaM,
    totalLinearLossPa: loss.pressureLossPaM * lengthM,
    status,
    note: status === 'high' ? 'Compacta pero más exigente.' : status === 'low' ? 'Baja pérdida, mayor diámetro.' : 'Alternativa circular normalizada.',
  }
}

function nextCircularDiameter(targetDiameterMm: number) {
  return circularCommercialMm.find((diameter) => diameter >= targetDiameterMm) ?? circularCommercialMm[circularCommercialMm.length - 1]
}

function findRectangularByArea(targetAreaM2: number, preferredAspectRatio: number) {
  const candidates = rectangularWidthsMm.flatMap((width) => rectangularHeightsMm.map((height) => ({ width, height, area: (width / 1000) * (height / 1000), ratio: width / height })))
    .filter((candidate) => candidate.area >= targetAreaM2 && candidate.ratio >= 1 && candidate.ratio <= 5)
    .sort((a, b) => Math.abs(a.ratio - preferredAspectRatio) - Math.abs(b.ratio - preferredAspectRatio) || a.area - b.area)
  return candidates[0] ?? { width: roundToStep(Math.sqrt(targetAreaM2 * preferredAspectRatio) * 1000, 25), height: roundToStep(Math.sqrt(targetAreaM2 / preferredAspectRatio) * 1000, 25) }
}

function findAreaForTargetPressure(airflowM3s: number, targetPaM: number, roughnessM: number, density: number, viscosity: number, preferredAspectRatio: number) {
  let best = { areaM2: airflowM3s / 5, diff: Number.POSITIVE_INFINITY }
  for (let area = 0.01; area <= 4; area += 0.0025) {
    const widthM = Math.sqrt(area * preferredAspectRatio)
    const heightM = area / widthM
    const velocityMs = airflowM3s / area
    const hydraulicDiameterM = (2 * widthM * heightM) / (widthM + heightM)
    const loss = pressureLossPaM({ velocityMs, hydraulicDiameterM, roughnessM, density, viscosity })
    const diff = Math.abs(loss.pressureLossPaM - targetPaM)
    if (diff < best.diff) best = { areaM2: area, diff }
  }
  return best.areaM2
}

function frictionEquivalentDiameter(airflowM3s: number, targetPaM: number, roughnessM: number, density: number, viscosity: number) {
  let best = { diameterMm: 0, diff: Number.POSITIVE_INFINITY }
  for (const diameterMm of circularCommercialMm) {
    const area = Math.PI * (diameterMm / 1000) ** 2 / 4
    const velocityMs = airflowM3s / area
    const loss = pressureLossPaM({ velocityMs, hydraulicDiameterM: diameterMm / 1000, roughnessM, density, viscosity })
    const diff = Math.abs(loss.pressureLossPaM - targetPaM)
    if (diff < best.diff) best = { diameterMm, diff }
  }
  return best.diameterMm
}

export function calculateDuctSizing(input: DuctSizingInput, context: CalculationContext = defaultCalculationContext()): CalculationEnvelope<DuctSizingInput, DuctSizingResult> {
  const parsed = DuctSizingInputSchema.parse(input)
  const airflowM3h = airflowToM3h(parsed)
  const airflowM3s = airflowM3h / 3600
  const roughnessMm = parsed.material === 'custom' ? parsed.customRoughnessMm ?? 0.15 : materialRoughness[parsed.material].roughnessMm
  const roughnessM = roughnessMm / 1000
  const density = airDensity(parsed.temperatureC, parsed.altitudeM)
  const viscosity = dynamicViscosityAir(parsed.temperatureC)
  const areaM2 = parsed.method === 'friction'
    ? findAreaForTargetPressure(airflowM3s, parsed.targetPressureLossPaM, roughnessM, density, viscosity, parsed.preferredAspectRatio)
    : airflowM3s / parsed.maxVelocityMs
  const circularDiameterM = Math.sqrt((4 * areaM2) / Math.PI)
  const commercialCircle = nextCircularDiameter(circularDiameterM * 1000)
  const rect = findRectangularByArea(areaM2, parsed.preferredAspectRatio)
  const actualAreaM2 = (rect.width / 1000) * (rect.height / 1000)
  const actualVelocityMs = airflowM3s / actualAreaM2
  const hydraulicDiameterM = hydraulicDiameterRectangular(rect.width, rect.height)
  const loss = pressureLossPaM({ velocityMs: actualVelocityMs, hydraulicDiameterM, roughnessM, density, viscosity })
  const compactRect = findRectangularByArea(areaM2 * 0.82, parsed.preferredAspectRatio)
  const silentRect = findRectangularByArea(areaM2 * 1.35, parsed.preferredAspectRatio)
  const alternatives = [
    makeRectAlternative('balanced', 'Equilibrada', rect.width, rect.height, airflowM3s, parsed.lengthM, roughnessM, density, viscosity),
    makeRectAlternative('compact', 'Compacta', compactRect.width, compactRect.height, airflowM3s, parsed.lengthM, roughnessM, density, viscosity),
    makeRectAlternative('silent', 'Silenciosa', silentRect.width, silentRect.height, airflowM3s, parsed.lengthM, roughnessM, density, viscosity),
    makeCircularAlternative('circular', 'Circular normalizada', commercialCircle, airflowM3s, parsed.lengthM, roughnessM, density, viscosity),
  ]
  const frictionEquivalentCircularDiameterMm = frictionEquivalentDiameter(airflowM3s, loss.pressureLossPaM, roughnessM, density, viscosity)

  return {
    module: 'ducts',
    calculator: 'duct-sizing',
    calculatedAt: context.calculatedAt,
    source: {
      provider: 'IsiVoltPro duct sizing formula',
      version: '1.1',
      generatedAt: null,
      reviewedAt: '2026-06-25',
      limitations: ['Pérdida lineal aproximada con Darcy-Weisbach; no incluye accesorios, acústica detallada, equilibrado ni requisitos normativos específicos.'],
    },
    units: { airflow: 'm3/h', velocity: 'm/s', area: 'm2', diameter: 'mm', pressureLoss: 'Pa/m', result: 'SI' },
    inputs: parsed,
    result: {
      airflowM3s,
      airflowM3h,
      airflowLs: airflowM3s * 1000,
      airflowCfm: airflowM3h / 1.69901082,
      areaM2,
      areaCm2: areaM2 * 10000,
      circularDiameterM,
      circularDiameterMm: circularDiameterM * 1000,
      areaEquivalentDiameterMm: circularDiameterM * 1000,
      hydraulicDiameterMm: hydraulicDiameterM * 1000,
      frictionEquivalentCircularDiameterMm,
      rectangularWidthMm: rect.width,
      rectangularHeightMm: rect.height,
      actualVelocityMs,
      pressureLossPaM: loss.pressureLossPaM,
      totalLinearLossPa: loss.pressureLossPaM * parsed.lengthM,
      totalLinearLossMmca: (loss.pressureLossPaM * parsed.lengthM) / 9.80665,
      reynolds: loss.reynolds,
      frictionFactor: loss.frictionFactor,
      roughnessMm,
      relativeRoughness: roughnessM / hydraulicDiameterM,
      airDensityKgM3: density,
      airDynamicViscosityPas: viscosity,
      materialLabel: parsed.material === 'custom' ? 'Material personalizado' : materialRoughness[parsed.material].label,
      networkTypeLabel: networkTypeLabels[parsed.networkType],
      aspectRatioWarning: parsed.preferredAspectRatio > 4 ? 'Relación ancho/alto muy alargada: revisar ruido, montaje y ocupación.' : null,
      alternatives,
    },
    interpretation: interpretDuctSizing(actualVelocityMs, loss.pressureLossPaM),
    warnings,
  }
}
