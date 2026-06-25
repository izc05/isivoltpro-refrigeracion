# IsiVoltPro Refrigeración

Aplicación móvil/PWA para técnicos de aire acondicionado y refrigeración. Funciona localmente, guarda intervenciones en IndexedDB y genera informes PDF desde el dispositivo.

## Funciones implementadas

- PWA instalable con service worker.
- UI mobile first con navegación inferior.
- Herramientas de presión-temperatura, recalentamiento, subenfriamiento, psicrometría, conductos, hidráulica, conversor, carga adicional, diagnóstico, refrigerantes, comparador, intervenciones, informes y ajustes.
- Conversión de presión absoluta/manométrica y vacío.
- Conversor técnico con presión, vacío, temperatura, potencia frigorífica, masa, longitud, caudal, electricidad y COP/EER.
- Calculadora de vacío con fases de prueba, valores inicial/final y gráfica orientativa.
- Calculadora de carga por peso con g, kg, lb y oz.
- Interpolación monotónica y cálculo de recalentamiento/subenfriamiento contra tablas generadas.
- Motor modular src/calculation-engine con schemas, validación, normalización, resultados trazables, interpretación y advertencias.
- Psicrometría con PsychroLib MIT, adaptada a resultados estructurados e historial local.`n- Dimensionado orientativo de conductos con sección, diámetro circular y rectangular sugerido.`n- Caudal de agua para hidráulica/aerotermia desde potencia y salto térmico.
- Almacenamiento local Dexie/IndexedDB con historial estructurado de cálculos.
- PDF A4 con jsPDF.
- Capacitor Android con `com.isivoltpro.refrigeracion`.

## Roadmap técnico

Las ampliaciones de campo están ordenadas en [ROADMAP_TECHNICAL.md](ROADMAP_TECHNICAL.md). La prioridad actual es cerrar Fase 1 antes de entrar de lleno en equipos, QR, inventario y mantenimiento.

## Limitación de datos

Los datos termodinámicos de producción no están incluidos manualmente. Deben generarse con CoolProp:

```bash
python scripts/generate_refrigerant_data.py
```

En entornos sin Python instalado pero con `uv`, usa:

```bash
npm run data:generate:uv
```

La generación actual usa CoolProp 6.8.0. Hay tablas validadas para R32, R410A, R134a, R407C, R404A, R22, R290, R600a, R1234yf y R744. R454B y R454C quedan como pendientes de validación porque CoolProp 6.8.0 no los resolvió correctamente en este entorno.

## Desarrollo

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

## Android

```bash
npm run cap:sync
npm run android:debug
npm run android:apk:release
npm run android:aab:release
```

Se necesita JDK, Android Studio/SDK y `JAVA_HOME` configurado. La firma release usa variables:

- `ISIVOLT_KEYSTORE_PATH`
- `ISIVOLT_KEYSTORE_PASSWORD`
- `ISIVOLT_KEY_ALIAS`
- `ISIVOLT_KEY_PASSWORD`

No subas keystores a Git.

## APK y AAB esperados

- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## Prueba rápida de calculadoras

- Regla P/T: abre /pt, selecciona refrigerante, unidad y presión absoluta/manométrica; guarda la lectura para crear borrador e historial.
- Recalentamiento: abre /superheat, introduce presión de aspiración y temperatura de tubería; revisa resultado, interpretación y guarda.
- Subenfriamiento: abre /subcooling, introduce presión de líquido y temperatura de línea; revisa resultado e interpretación.
- Carga adicional: abre /charge, introduce placa, longitud incluida/instalada y g/m del fabricante.
- Comparador: abre /compare; la salida es informativa y no declara intercambiabilidad.
- Psicrometría: abre /psychrometrics, introduce temperatura seca, humedad relativa y presión atmosférica.

## Pruebas ejecutadas

- TypeScript: `npm run typecheck`
- Lint: `npm run lint`
- Unitarias: `npm run test`
- Build PWA: `npm run build`
- E2E móvil: `npm run test:e2e`
- Capacitor sync: `npm run cap:sync`

## Estructura

- `src/domain`: cálculos, almacenamiento, PDF y reglas diagnósticas.
- `src/data/generated`: tablas generadas por CoolProp y fallback pendiente.
- `scripts`: generación de datos.
- `android`: proyecto Capacitor Android.
- `play-store`: textos y checklist de publicación.

## Referencias externas

La revisión de repositorios HVAC queda documentada en [docs/github-hvac-research.md](docs/github-hvac-research.md). Solo se integra código con licencia compatible y fuente técnica explícita.

## Fuentes de datos

CoolProp genera las tablas de saturación. Los metadatos regulatorios viven en `src/data/refrigerant-metadata.ts` y deben contener fuente y fecha de revisión; los campos sin fuente validada se muestran como pendientes.
