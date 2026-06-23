# AGENTS.md

- No inventar datos técnicos ni termodinámicos.
- No modificar manualmente valores de refrigerantes en archivos generados.
- Regenerar tablas con `python scripts/generate_refrigerant_data.py` y revisar `src/data/generated/validation-report.json`.
- Ejecutar `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` y `npm run test:e2e` antes de entregar.
- Mantener funcionamiento sin conexión y sin Firebase, analítica, publicidad ni rastreadores.
- No comprometer secretos, keystores, APK/AAB firmados ni `android/keystore.properties`.
- Mantener compatibilidad Android minSdk 24 y target/compile SDK igual o superior a API 35.
- Documentar cambios en `CHANGELOG.md`.
