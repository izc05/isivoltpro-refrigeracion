# IsiVoltPro Refrigeración

Aplicación móvil/PWA para técnicos de aire acondicionado y refrigeración. Funciona localmente, guarda intervenciones en IndexedDB y genera informes PDF desde el dispositivo.

## Funciones implementadas

- PWA instalable con service worker.
- UI mobile first con navegación inferior.
- Herramientas de presión-temperatura, recalentamiento, subenfriamiento, conversor, carga adicional, diagnóstico, refrigerantes, comparador, intervenciones, informes y ajustes.
- Conversión de presión absoluta/manométrica y vacío.
- Interpolación monotónica y cálculo de recalentamiento/subenfriamiento contra tablas generadas.
- Almacenamiento local Dexie/IndexedDB.
- PDF A4 con jsPDF.
- Capacitor Android con `com.isivoltpro.refrigeracion`.

## Limitación de datos

Los datos termodinámicos de producción no están incluidos manualmente. Deben generarse con CoolProp:

```bash
python scripts/generate_refrigerant_data.py
```

El entorno actual no tiene Python, por lo que las tablas quedan en estado pendiente y los cálculos PT se bloquean de forma segura.

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

## Fuentes de datos

CoolProp genera las tablas de saturación. Los metadatos regulatorios viven en `src/data/refrigerant-metadata.ts` y deben contener fuente y fecha de revisión; los campos sin fuente validada se muestran como pendientes.
