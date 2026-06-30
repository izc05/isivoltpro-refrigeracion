export type PsychrometricMeasurementStep = {
  title: string
  text: string
}

export const psychrometricMeasurementSteps: PsychrometricMeasurementStep[] = [
  {
    title: 'Elige una zona representativa',
    text: 'Mide en la zona ocupada, donde el aire represente las condiciones reales del local. Evita impulsiones, retornos, puertas abiertas y rincones sin circulación.',
  },
  {
    title: 'Coloca bien la sonda',
    text: 'Deja aire libre alrededor del sensor. No lo pegues a paredes, techos, ventanas, equipos calientes o superficies frías, y evita sujetarlo con la mano durante la lectura.',
  },
  {
    title: 'Espera a que se estabilice',
    text: 'No registres el dato mientras temperatura o humedad sigan cambiando claramente. Espera hasta obtener una lectura estable según la respuesta del instrumento.',
  },
  {
    title: 'Registra las condiciones',
    text: 'Anota temperatura seca, humedad relativa, ubicación, hora y presión o altitud usada. En procesos A → B identifica claramente cada punto de medida.',
  },
]

export const psychrometricMeasurementErrors = [
  'Medir directamente bajo un difusor o frente a una corriente de aire.',
  'Colocar la sonda junto a una ventana con radiación solar.',
  'Apoyar el sensor sobre una pared fría, caliente o húmeda.',
  'Leer el valor nada más encender o mover el instrumento.',
  'Tapar parcialmente el sensor con la mano, ropa o una funda.',
  'Comparar los puntos A y B sin mantener el mismo criterio de ubicación y estabilización.',
]

export const psychrometricMeasurementChecklist = [
  'Sonda en una zona representativa.',
  'Sin impulsión directa ni radiación solar.',
  'Sensor separado de paredes y fuentes de calor o frío.',
  'Temperatura y humedad estabilizadas.',
  'Ubicación, hora y presión o altitud identificadas.',
  'Unidades revisadas: °C y % HR.',
]

export function isPsychrometricMeasurementScope(scope: { module: string; calculator: string }) {
  return scope.module === 'psychrometrics' && scope.calculator === 'dry-bulb-relative-humidity'
}
