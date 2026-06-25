# Inventario maestro de calculadoras

Objetivo: organizar el desarrollo de IsiVoltPro Climatización por paquetes pequeños, verificables y trazables. Cada calculadora debe tener motor puro, validación, interpretación, historial local y pantalla móvil prioritaria.

Prioridades:

- P0: ya existe o debe consolidarse en la fase actual.
- P1: siguiente paquete de alto valor y baja dependencia externa.
- P2: herramienta importante con fórmulas públicas y datos configurables.
- P3: módulo de diseño visual/proyecto con más estado y persistencia.
- P4: requiere catálogos, normas versionadas, permisos o modelos más complejos.

## Patrones de interfaz

| Patrón | Uso | Componentes mínimos | Prioridad |
| --- | --- | --- | --- |
| Biblioteca de calculadoras | Inicio/Herramientas | Categorías, buscador, favoritos, último cálculo, estado activo/planificado | P0 |
| Calculadora rápida | Herramientas simples | Datos, resultado grande, interpretación, guardar, historial | P0 |
| Modo aprender | Todas | Fórmula, ejemplo, errores frecuentes, medición correcta, fuente | P0 |
| Comparador | Refrigerantes/equipos/escenarios | Dos o más columnas, diferencias, advertencias, fuente | P1 |
| Asistente paso a paso | Cargas térmicas, puesta en marcha | Pasos, progreso, validación parcial, resumen final | P2 |
| Constructor visual | UTA, conductos, hidráulica, VRF | Bloques, conexión, estado por tramo/componente, panel lateral | P3 |
| Panel técnico | Diagnóstico/planta | KPIs, diagrama, alarmas, tendencias, desviaciones | P3 |
| Plano de instalación | Equipos/difusores | Plano/foto, marcadores, estado, filtros, acceso a ficha | P4 |

## P0 - Base ya activada o inmediata

| ID | Calculadora | Entradas | Fórmula/base | Resultados | Validaciones | Pantalla | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R01 | Tabla P/T refrigerante | Refrigerante, presión o temperatura, unidad, presión abs/man, rocío/burbuja | Interpolación tabla P/T versionada | Saturación, presión abs/man, dew, bubble, equivalencias | Rango de tabla, presión absoluta > 0, fuente obligatoria | Calculadora rápida + regla visual | Activa |
| R02 | Recalentamiento | Refrigerante, presión aspiración, unidad, referencia, temperatura aspiración | T tubería - T saturación rocío | K, indicador, causas, siguientes pruebas | No diagnosticar carga con un dato, dew obligatorio | Calculadora rápida + aprender | Activa |
| R03 | Subenfriamiento | Refrigerante, presión líquido/descarga, unidad, referencia, temperatura líquido | T saturación burbuja - T línea líquido | K, indicador, causas, siguientes pruebas | Bubble obligatorio, rango tabla | Calculadora rápida + aprender | Activa |
| R04 | Carga adicional por longitud | Carga placa, longitud incluida, longitud instalada, g/m, recuperado, añadido | Placa + max(0, L instalada - L incluida) x g/m | Carga total, adicional, balance recuperado/añadido | No cargar solo por presión, g/m fabricante | Pantalla báscula | Activa parcial |
| R05 | Comparador refrigerantes | Refrigerantes, temperaturas, rama dew/bubble | Interpolación P/T por temperatura común | Tabla comparativa, seguridad, GWP, glide | No declarar intercambiabilidad, no mezclar | Comparador | Activa |
| P01 | Psicrometría por T seca + HR | T seca, HR, presión | PsychroLib SI | Rocío, bulbo húmedo, humedad, entalpía, volumen | HR 0-100, presión > 0 | Calculadora rápida + historial | Activa |
| C01 | Conducto por caudal y velocidad | Caudal, velocidad máxima, relación lados | Área = Q/v; D = sqrt(4A/pi) | Sección, diámetro, rectangular sugerido | Caudal/velocidad > 0, velocidad razonable | Calculadora rápida | Activa |
| H01 | Caudal de agua | Potencia, delta T, cp, densidad | m = P/(cp*dT), Qv = m/rho | m3/h, l/s, l/min, kg/s | dT > 0, cp/rho > 0 | Calculadora rápida | Activa |
| E01 | Conversor técnico | Magnitud, unidad origen/destino | Motor unidades | Presión, vacío, temperatura, potencia, masa, longitud, caudal | Unidades compatibles | Conversor compacto | Activa |
| D01 | Diagnóstico guiado básico | Modo, salto térmico, SH, SC, relación compresión, observaciones | Reglas transparentes | Hipótesis, confianza, datos faltantes, checks | Nunca diagnosticar con un solo dato | Panel diagnóstico | Activa parcial |

## P1 - Siguiente paquete recomendado

| ID | Calculadora | Entradas | Fórmula/base | Resultados | Validaciones | Pantalla | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V01 | Vacío y estabilidad avanzada | Micrones inicial/final, tiempo, intervalos | Tendencia tiempo-vacío, tasa subida | Mínimo, subida/min, estabilidad, posible humedad/fuga | No certificar fuga automáticamente | Cronómetro + gráfica | P1 |
| T01 | Prueba de presión | Presión inicial/final, temperatura inicial/final, duración, gas | Corrección P/T ideal aproximada | Caída corregida, %, estado | Gas/temperatura obligatorios, resultado orientativo | Ensayo + informe | P1 |
| R06 | Relación de compresión | Presión baja/alta abs | P descarga abs / P aspiración abs | Ratio, indicador | Convertir siempre a absoluta | Calculadora rápida | P1 |
| R07 | Aproximación evaporador/condensador | Aire/agua entrada-salida, saturación evap/cond | Diferencias de temperatura | Approach, desviación | Definir lado aire/agua | Calculadora rápida | P1 |
| P02 | Psicrometría por dos variables | Par de variables válido, presión | PsychroLib combinaciones | Estado completo del aire | Combinaciones compatibles | Selector de variables | P1 |
| P03 | Mezcla de dos corrientes | Estado A, estado B, caudales | Balance de masa y entalpía | Estado mezcla, HR, entalpía | Misma presión/base unidades | Diagrama A+B | P1 |
| C02 | Conducto rectangular/circular inverso | Dimensiones, caudal | v = Q/A | Velocidad real, área, equivalencias | Dimensiones > 0 | Calculadora rápida | P1 |
| H02 | Potencia según caudal | Caudal, dT, cp, densidad | P = m cp dT | kW, kcal/h, BTU/h | Unidades normalizadas | Calculadora rápida | P1 |
| E02 | Intensidad monofásica/trifásica | kW, tensión, cos phi, rendimiento, fases | I = P/(V cos phi eta), I3 = P/(sqrt3 V cos phi eta) | A, potencia aparente | cos phi 0-1, V > 0 | Calculadora rápida | P1 |
| E03 | Desequilibrio de fases | Tensiones/intensidades por fase | max desviación/media | %, estado | Tres valores obligatorios | Panel eléctrico | P1 |

## P2 - Diseño técnico modular

| ID | Calculadora | Entradas | Fórmula/base | Resultados | Validaciones | Pantalla | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C03 | Pérdida de carga en conducto | Caudal, sección, longitud, rugosidad/material | Darcy-Weisbach o tabla configurable | Pa/m, Pa total, velocidad, Reynolds | Método declarado, material versionado | Tramo de red | P2 |
| C04 | Accesorios por coeficiente K | Velocidad, densidad, K, cantidad | ΔP = K rho v2/2 | Pérdida por accesorio y total | K con fuente o usuario | Lista accesorios | P2 |
| C05 | Red simple de conductos | Tramos, derivaciones, caudales | Suma tramo crítico | Pérdida total, tramo crítico | Red conectada, caudales consistentes | Constructor visual | P2 |
| V02 | Renovaciones por hora | Volumen, caudal | ACH = Q/V | renov/h, tiempo renovación | Volumen/caudal > 0 | Calculadora rápida | P2 |
| V03 | Caudal por ocupante/superficie | Ocupantes, superficie, tabla norma | Q = personas x ratio + superficie x ratio | Caudal exterior | Norma versionada seleccionable | Calculadora + tabla | P2 |
| L01 | Carga térmica rápida | Superficie, altura, orientación, uso, aislamiento, ocupantes | Coeficientes configurables | kW frío/calor orientativo | Coeficientes versionados, aviso no proyecto | Asistente 3 pasos | P2 |
| L02 | Carga por ventilación/infiltración | Caudal, condiciones exterior/interior | Potencia sensible/latente con psicrometría | kW sensible, latente, total | Estados psicrométricos válidos | Asistente | P2 |
| H03 | Diámetro tubería por velocidad | Caudal, velocidad máxima | Área = Q/v | diámetro interior, velocidad real | Material/diámetros normalizados | Calculadora rápida | P2 |
| H04 | Pérdida hidráulica tramo | Caudal, diámetro, longitud, material, fluido | Darcy-Weisbach/Hazen-Williams según método | mca, kPa, Pa/m | Régimen, rugosidad, fluido | Tramo hidráulico | P2 |
| H05 | Vaso de expansión básico | Volumen agua, temperaturas, presiones, válvula seguridad | Expansión + volumen útil | Volumen nominal | Presiones coherentes | Asistente | P2 |
| H06 | Depósito de inercia | Potencia, tiempo mínimo, volumen circuito, dT | V = P t /(cp dT) - V circuito | Volumen recomendado | t/dT > 0 | Calculadora rápida | P2 |
| A01 | ACS calentamiento | Volumen, T inicial/final, potencia | E = m cp dT | Tiempo, energía, potencia | T final > inicial | Calculadora rápida | P2 |
| F01 | Fan coil agua/aire básico | Potencia, dT agua, caudal aire, salto aire | Balances sensible/total | Caudal agua, caudal aire, condensado opcional | Condiciones coherentes | Calculadora rápida | P2 |

## P3 - Constructores visuales y proyecto

| ID | Módulo | Entradas | Base | Resultados | Validaciones | Pantalla | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| U01 | Constructor UTA | Secuencia de componentes, caudales, condiciones aire | Bloques con cálculos por sección | Estado por componente, potencia, pérdidas | Orden lógico, caudal común | Constructor visual UTA | P3 |
| U02 | Mezcla aire exterior-retorno | Estado exterior, retorno, % exterior | Balance masa/entalpía | Estado mezcla | Estados psicrométricos válidos | Bloque UTA | P3 |
| U03 | Recuperador | Estado aire, eficiencia sensible/latente, caudal | Balance recuperación | T salida, energía recuperada | Eficiencia 0-100 | Bloque UTA | P3 |
| U04 | Batería fría/caliente | Estado entrada/salida, caudal aire/agua | Psicrometría + hidráulica | Potencia, condensado, caudal agua | Salidas físicamente posibles | Bloque UTA | P3 |
| FAN01 | Ventilador afinidad | Q/P/potencia inicial, rpm/frecuencia nueva | Leyes afinidad | Nuevo Q, P, potencia, ahorro | Ratio > 0, rango realista | Curva simple | P3 |
| FAN02 | SFP | Potencia ventilador, caudal | SFP = W/(m3/s) | W/(m3/s), estado | Potencia/caudal > 0 | Calculadora rápida | P3 |
| PRJ01 | Proyecto/edificio/salas | Proyecto, edificio, plantas, salas | Modelo de datos local | Árbol, cálculos por sala | IDs, relaciones | Modo proyecto | P3 |
| PLN01 | Plano de equipos | Imagen/plano, marcadores, tipo equipo | Coordenadas + ficha | Estado visual, acceso ficha | Imagen local, no localStorage grande | Plano interactivo | P3 |
| CMP01 | Comparador general | Dos cálculos/equipos/escenarios | Diferencias estructuradas | Variaciones, mejor/peor | Misma magnitud/base | Comparador | P3 |

## P4 - Avanzado o dependiente de fuentes externas

| ID | Calculadora | Entradas | Base | Resultados | Validaciones | Pantalla | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R08 | Propiedades termodinámicas avanzadas | Refrigerante, T/P/calidad | CoolProp o JSON validado | densidad, entalpía, entropía, cp, viscosidad | Fuente/versionado obligatorio | Ficha avanzada | P4 |
| R09 | Diagrama log(p)-h | Refrigerante, puntos ciclo | CoolProp/envolvente fase | Ciclo, COP, potencia, descargas | No inventar envolvente | Gráfico interactivo | P4 |
| VRF01 | VRF multisplit | Unidades, longitudes, desniveles | Reglas fabricante/API | índice, carga, tuberías | Catálogo autorizado | Asistente VRF | P4 |
| CF01 | Cámara frigorífica | Cerramientos, producto, infiltración, uso | Modelo térmico + datos producto | carga total, selección equipo | Productos/fuentes versionadas | Asistente profesional | P4 |
| AERO01 | Bomba de calor estacional | Clima, curva máquina, demanda | Datos fabricante + clima | consumo, coste, emisiones | Datos fabricante autorizados | Comparador escenarios | P4 |
| ELEC04 | Sección y protecciones | I, longitud, método instalación, caída V | Reglamento/tablas versionadas | sección, caída, protección orientativa | Normativa seleccionable | Asistente eléctrico | P4 |
| AIR01 | CO2 ventilación | ocupación, caudal, volumen, generación CO2 | Balance concentración | ppm, caudal necesario, tiempo limpieza | Parámetros fuente | Gráfica tendencia | P4 |
| SEL01 | Selección componentes | condiciones, catálogo | API/catálogo autorizado | válvula, filtro, bomba, ventilador | Permiso/datos fuente | Selector | P4 |

## Orden de implementación recomendado

1. Consolidar P0: historial visible, guardar en intervención e informes para P/T, SH, SC, psicrometría, conductos e hidráulica.
2. Implementar P1: vacío avanzado, prueba de presión, relación de compresión, psicrometría por dos variables y electricidad básica.
3. Implementar P2: pérdidas de carga aire/agua, renovaciones, carga térmica rápida, vaso y depósito de inercia.
4. Implementar P3: constructores visuales de UTA, red de conductos y modo proyecto.
5. Implementar P4 solo cuando existan fuentes, permisos o tablas versionadas.

## Reglas obligatorias

- Fórmulas separadas de React.
- Schemas de entrada con Zod.
- Resultados estructurados con fuente, versión, fecha, unidades, entradas y advertencias.
- No copiar catálogos ni tablas cerradas.
- No mezclar normas con fórmulas: las normas van en JSON versionado seleccionable.
- Todo resultado orientativo debe declararlo.
- Todo cálculo debe poder guardarse en historial local y, cuando aplique, asociarse a intervención/equipo/proyecto.
