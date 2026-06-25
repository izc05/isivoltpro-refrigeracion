# Referencias GitHub HVAC

Búsqueda realizada el 25/06/2026 para orientar la evolución de IsiVoltPro Climatización. Estas referencias no autorizan copiar datos técnicos ni tablas propietarias. Cualquier reutilización de código debe respetar licencia, atribución y verificación técnica.

## Repos útiles

| Área | Repositorio | Licencia | Uso recomendado |
| --- | --- | --- | --- |
| Psicrometría | `psychrometrics/psychrolib` | MIT | Base de cálculo para propiedades de aire húmedo. Integrado vía paquete npm `psychrolib`. |
| Carta psicrométrica | `azogue/psychrochart` | MIT | Referencia visual para futura carta psicrométrica. No integrado por ser Python. |
| Carta psicrométrica TS | `nicfv/Psychart` | No declarada | Inspiración visual; no copiar código sin permiso/licencia clara. |
| A2L/refrigerantes | `MikeKapin/a2l-refrigerant-calculator` | No declarada | Inspiración funcional. No copiar tablas ni lógica sin licencia/fuentes. |
| Recalentamiento/subenfriamiento | `andypeng312/Refrigerant-App` | No declarada | Referencia histórica básica. No reutilizar código. |
| Conductos | `akseidel/WpfaksDuctOMatic` | MIT | Referencia para dimensionado de conductos tipo ductulator. Revisar antes de adaptar. |
| Conductos JS | `CentralifeG/Ductculator1` | No declarada | Inspiración de UI. No reutilizar código. |
| Conductos/tuberías | `JacobLewandowskiDev/HVAC-Calculator` | No declarada | Referencia funcional. No reutilizar código. |
| Servicio local-first | `Raat1902/OnsiteHeating-App` | MIT | Referencia para flujos local-first, trabajos e IndexedDB. |

## Integración actual

- `psychrolib` npm 1.1.1 añadido como dependencia MIT.
- Nuevo adaptador `calculatePsychrometricsFromRelHum` en `src/calculation-engine/formulas/psychrometrics.ts`.
- Nueva pantalla `/psychrometrics` activada en Herramientas.
- Resultados con fuente, versión, unidades, entradas, interpretación, advertencias e historial local.

## Siguientes adaptadores

1. Conductos: crear motor propio verificado o adaptar una librería MIT tras revisión técnica.
2. UTA/fan coils: empezar por balances de caudal/potencia con fórmulas documentadas.
3. Trabajo local-first: mejorar asociaciones historial -> equipo/intervención antes de ampliar informes.
