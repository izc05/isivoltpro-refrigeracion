# Biblioteca visual técnica

La biblioteca visual permite asociar fotografías propias, esquemas originales, anotaciones y diagramas a cada módulo/calculadora.

## Modelo

Cada recurso visual incluye:

- id, módulo, calculadora y tipo;
- título, descripción y texto alternativo;
- imagen o diagrama interno;
- fuente, licencia y versión;
- etiquetas;
- anotaciones por porcentaje de posición;
- campos y cálculos relacionados;
- estado activo y orden.

## Componentes

- `VisualHelpButton`
- `VisualHelpModal`
- `TechnicalImageGallery`
- `AnnotatedImage`
- `StepByStepGallery`
- `CorrectIncorrectComparison`
- `InteractiveDiagram`
- `ImageZoomViewer`

## Editor

Ruta local: `/visual-library`.

Permite subir imágenes propias, elegir módulo/calculadora, añadir metadatos, crear anotaciones básicas, activar/desactivar recursos y guardar en IndexedDB. No usa localStorage para imágenes.

## Reglas

- No copiar imágenes de otras aplicaciones.
- Preferir WebP/AVIF o imágenes optimizadas.
- Mantener texto alternativo.
- Indicar fuente y licencia.
- Usar recursos propios o con permiso explícito.
