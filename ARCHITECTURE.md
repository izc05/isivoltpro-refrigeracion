# Arquitectura

React/Vite renderiza una PWA offline. Capacitor empaqueta `dist` para Android. El dominio está separado de la UI: unidades, refrigerantes, diagnóstico, carga, almacenamiento y PDF. IndexedDB es la única persistencia de V1.

## Capa de cálculo

`src/calculation-engine` es la API modular para calculadoras técnicas. No sustituye `src/domain`; lo envuelve para conservar cálculos ya validados y añadir contrato estable:

- `units`: reexporta conversiones y tipos de unidades.
- `validation`: schemas Zod de entradas.
- `formulas`: funciones de cálculo puras/orquestadas por módulo.
- `interpretation`: interpretación técnica separada del cálculo numérico.
- `providers`: interfaces de datos trazables, empezando por refrigerantes generados.

El primer módulo activo es refrigerantes: P/T, recalentamiento, subenfriamiento, carga adicional y comparador. Cada resultado incluye fuente, versión, fecha, unidades, entradas, resultado, interpretación y advertencias. El historial estructurado se guarda en Dexie `calculationHistory` y se incluye en las copias de seguridad.
