# IsiVoltPro Refrigeracion y Climatizacion

Superapp tecnica para instalaciones, mantenimiento y servicio de campo en refrigeracion y climatizacion.

## Objetivo

Reunir en una sola aplicacion el flujo completo del tecnico:

Cliente -> Instalacion -> Equipo -> Intervencion -> Mediciones -> Diagnostico -> Trabajo realizado -> Materiales -> Refrigerante -> Fotografias -> Firma -> Informe PDF -> Historial.

## Estado actual

Este repositorio contiene la base inicial del modulo `refrigerante`:

- Aplicacion Vite + React + TypeScript.
- Pantalla inicial profesional de IsiVoltPro.
- Estructura visual para herramientas tecnicas.
- Biblioteca inicial de refrigerantes.
- Roadmap del producto por fases.
- Reglas de seguridad tecnicas visibles desde la interfaz.

## Principios tecnicos

- No inventar datos tecnicos.
- No mostrar equivalencias sin fuentes.
- No recomendar mezclar refrigerantes.
- No recomendar carga solo por presion.
- Diferenciar presion absoluta y manometrica.
- Usar rocio y burbuja correctamente.
- Mostrar unidades, fuente y fecha de revision.
- Mantener funcionamiento offline.
- Proteger datos de clientes e intervenciones.

## Desarrollo

```bash
npm install
npm run dev
```

## Verificacion

```bash
npm run build
npm run lint
```

## Roadmap inicial

1. Base premium: navegacion, inicio, herramientas, favoritos y modo offline.
2. Herramientas frigorificas: regla P/T, recalentamiento, subenfriamiento, vacio y carga.
3. Trabajo profesional: clientes, instalaciones, equipos, intervenciones, fotos e informes PDF.
4. Climatizacion: psicrometria, carga termica, conductos, caudales y rendimiento.
5. Gestion avanzada: inventario, botellas, residuos, mantenimiento, usuarios y avisos.

## Notas sobre datos de refrigerantes

Las fichas incluidas en la interfaz son una estructura inicial de producto. Antes de activar calculos reales P/T, cada refrigerante debe incorporar tablas trazables con:

- Fuente tecnica.
- Fecha de revision.
- Unidad de presion.
- Tipo de presion.
- Datos de rocio y burbuja cuando aplique.
- Rango de temperaturas cubierto.
