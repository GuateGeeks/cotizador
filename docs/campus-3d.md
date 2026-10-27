# Campus 3D papercraft

El asesor muestra una escuela de cartulina cortada, plegada y ensamblada que crece con el
alcance de la cotización. Empieza con una sola aula y llega a un campus en U de dos pisos, con
patio, balcón, escalera, jardines, equipos en uso y personas trabajando.

Es una **representación de la configuración**: no genera partidas de construcción ni de
mobiliario, y nunca calcula precios.

Documentos relacionados:

- Guía para ejecutar, ajustar y ampliar: [papercraft/README.md](papercraft/README.md).
- Referencias visuales y su análisis: [papercraft/reference/](papercraft/reference/README.md).
- Contratos: [piezas](papercraft/CONTRACT.md) e [integración](papercraft/INTEGRATION.md).
- Registro de trabajo, roles y evidencia: [papercraft/ORCHESTRATION.md](papercraft/ORCHESTRATION.md).

## Arquitectura

| Responsabilidad | Dónde |
|---|---|
| Estado y cálculo comercial (fuente de verdad) | `asesor/asesor.js`, `motor.js`, `config.js` |
| Adaptador cotización → escena | `mascotData()`, `campusContext()` y `campusCounts()` en `asesor.js` |
| Planificador de crecimiento (puro, probado en Node) | `asesor/lab/paper/plan.js` (`planCampus`), sobre `normalizeCampusData` de `campus-layout.js` |
| Biblioteca papercraft (geometría y material) | `asesor/lab/paper/kit.js`, `material.js`, `pieces-*.js`, `catalog.js` |
| Composición (amueblado, personas, servicios) | `asesor/lab/paper/compose.js` |
| Escena: entidades, ensamblaje, actividades, cámara, selección y calidad | `asesor/lab/campus-scene.js`, `paper/scene-entities.js`, `scene-assembly.js`, `scene-activity.js` |
| Geeky (modelo 3D estilizado de GuateGeeks/geeky-animation, embebido) | `asesor/lab/campus-geeky.js` y `asesor/lab/geeky/` ([procedencia](../asesor/lab/geeky/PROVENANCE.md)) |
| Vista alternativa sin 3D | Resumen textual en `asesor.js` (`data-static-summary`) |
| Inspector de desarrollo | `asesor/lab/inspector.html` (`npm run build:inspector`) |

Hay un solo canvas WebGL. La escena consume `planCampus(data)` y agrupa los módulos en
entidades: una por pila de aulas, una de conexiones y una de terreno. Cada entidad tiene clave
estable y firma por contenido, así que solo se reconstruye lo que cambió y se libera lo que sale.

El campus vive mientras está a la vista: cada aula sigue un ciclo continuo de actividades (ver
[Vida del campus](#vida-del-campus)). Las transiciones de cámara y de ensamblaje se dibujan hasta a
60 fps y la vida ambiental a un ritmo menor. Con pausa, pestaña oculta, campus fuera de pantalla,
contexto perdido o movimiento reducido no se piden cuadros: el render vuelve a ser bajo demanda.

## Crecimiento

Resumen; las reglas completas están en la cabecera de `plan.js` y las pruebas en
`asesor/test/paper-plan.test.js`.

**Composición**

- Cinco pilas fijas alrededor de un patio abierto al frente: el ala izquierda, dos al fondo y dos
  a la derecha. Máximo dos pisos.
- Prioridad de plazas:
  1. un aula por nivel;
  2. un aula de proyecto por programa;
  3. piso superior para un nivel grande (≥ 90 estudiantes o ≥ 4 secciones), si queda plaza.
- Drones usa un patio de vuelo en lugar de aula.

**Circulación**

- Todos los pisos superiores son alcanzables: un balcón en U pegado a los frentes, la galería del
  fondo como pasarela entre las alas y una escalera exterior junto al ala derecha.
- Una prueba de grafo transitable lo comprueba.

**Entrada**

- Volumen naranja junto al flanco oeste de la primera aula, al ras de su frente y mirando a la cámara.
- Nunca queda bajo un balcón ni delante de un interior, y no se mueve entre estados.

**Terreno y vegetación**

- El pedestal se ajusta a lo construido. Al frente de las alas solo hay una franja de patio y un borde de 0.7.
  No queda una explanada vacía.
- Un porche a lo largo del flanco oeste lleva la entrada y dos árboles de flanco.
- Hay jardín trasero. Nada alto delante de los interiores: el flanco este solo lleva vegetación baja.

**Garantías**

- Es determinista y reversible: reducir el alcance da lo mismo que construir directo.
- No hay solapes ni piezas flotantes.

**Personajes**

- Son representativos, con un tope de `CAMPUS_LIMITS.people` (40).
- Los contadores muestran las cifras reales del motor.
- Se construyen según el paquete de construcción R1
  ([`papercraft/construction/`](papercraft/construction/README.md)): perfil → plan → topología →
  auditoría en `pieces-people.js` (`resolvePersonProfile`, `planPerson`, `addPaperPerson`).
  - Alturas H por nivel (suela a cima del cabello): preprimaria 0.62, primaria 0.78, básico 0.90,
    bachillerato 0.94, docente 0.98; cabeza/H 0.32–0.225 y hombros/H 0.275–0.255, medidos.
  - Cabello con núcleo de 32 triángulos (banda 8→8, transición 8→4, ápice desplazado) y mechones
    plegados de dos triángulos; variantes de coste fijo: corto 48, cola 56, moño 56, coletas 60,
    melena 60, gorra 48, gorra con coletas 60. Con visor VR se omiten el flequillo y la visera.
  - Mangas de dos secciones y cuatro paneles (8 por manga); falda en dos mitades rígidas de seis
    paneles (alternancia radial 1 / 0.78) sobre `legL`/`legR`; manos y zapatos cerrados (8 cada uno).
  - Presupuesto: geometría ≤ 271 por estudiante (279 con la reserva de 8) y ≤ 291 por docente,
    más 7 triángulos de sombra de contacto. Máximo medido: 278 estudiante, 252 docente.
  - `npm run check:people -- <carpeta-nueva>` genera el manifiesto (plan frente a caras emitidas en
    236 combinaciones, huesos, rigidez, capas ≥ 0.004 en 12 poses, proporciones y determinismo);
    `npm run shot:people` produce la escalera de lectura a 40/60/80/120/600 px con DPR 1 y 2.
  - El alumno base de primaria (`PRIMARIA_BASE`) se construye con el paquete R2
    ([papercraft/construction-r2](papercraft/construction-r2/README.md)): 20 recetas y 33 instancias
    cargadas de sus JSON (`npm run import:r2` genera `asesor/lab/paper/r2/primaria-r2-data.js`; una
    prueba falla si diverge) y su rig. Todo alumno de primaria con cabello corto usa la cabeza R2.
    Contrato generado: [papercraft/personajes/ALUMNO-PRIMARIA.md](papercraft/personajes/ALUMNO-PRIMARIA.md)
    (`npm run docs:people`). Para sumar la sombra de contacto al límite de 280 se retiran 8 tapas ocultas
    (272 + 7 = 279); el resto de combinaciones conserva la receta v1.
  - Recreaciones R3 ([papercraft/construction-r3](papercraft/construction-r3/README.md)): cabeza P01,
    núcleo del cabello P06 y chaleco P08, rehechos desde los pliegues de sus láminas, reemplazan la
    receta R2 del mismo id. El alumno de primaria con cabello corto suma 312 + 7 = 319 triángulos;
    su límite es 320 (`PERSON_LIMIT.r3Student`), el resto de estudiantes sigue en 280 y los docentes
    en 300. Comparación por pieza: `tools/alumno-piezas-r2.cjs` y `tools/alumno-piezas-r2.py`.
  - Inspector: `npm run build:inspector`, `npm run serve` y abrir `asesor/lab/inspector.html`; el panel
    «Alumno de primaria» elige pose y vista, aísla componentes y muestra aristas, hueso y triángulos.
    Capturas reproducibles: `npm run shot:alumno -- <carpeta-nueva>` y `tools/alumno-compare.py`.

## Composición de actividades

Cada tipo de aula tiene una sola actividad legible desde la vista general (yaw −0.55, pitch 0.6), desde
el aula enfocada y en un acercamiento. Lo implementa `furnishRoom` en `asesor/lab/paper/compose.js`; el
contrato con la animación está en [papercraft/ACTORES.md](papercraft/ACTORES.md).

**Reglas comunes**

- La cámara mira desde el frente izquierdo y la losa con su faldón tapa el fondo de las aulas. Por eso la
  actividad va a la derecha del pasillo central y hacia el frente abierto. El pasillo (x = 0) queda libre
  para quien camina.
- Equipos a escala de diorama (`DEVICE_SCALE`): Tale-Bot 2.7×, dino 1.8×, SPIKE 2.6×, protoboard 2.3×,
  holograma 3.6×, dron 2.2×, laptop 1.4×. La escala vive en un hueso hijo (`.size`), así que la animación
  y el ensamblaje siguen moviendo la montura sin escala.
- Cada kit va sobre un tapete del color del programa, que contrasta con la mesa.
- Solo hay sillas donde alguien se sienta. La distancia silla-mesa depende del nivel, para que las manos
  sentadas queden justo antes del borde. Cada laptop queda abierta, entera sobre la cubierta y de frente a su
  usuario.

**Por tipo**

| Aula | Composición |
|---|---|
| Nivel | Dos mesas frente a la pantalla. Los estudiantes se sientan del lado del frente, de espaldas a la cámara, cada uno con su laptop abierta. El docente está junto a la pantalla y señala. |
| Tale-Bot (preprimaria) | Pista amarilla con circuito blanco en el piso y el robot encima. Tres niños de preprimaria de rodillas en los bordes; el facilitador de pie a la izquierda. |
| Robot Master | Mesa de taller con el dino de perfil sobre tapete lima, laptop del grupo y tres constructores: dos detrás, de frente a la cámara, y uno delante. |
| SPIKE | La misma mesa con el kit, sus vigas sueltas sobre tapete rosa, la laptop y tres constructores. |
| Electrónica | Mesa de banco con la protoboard sobre tapete azul, la bandeja de componentes y la laptop. Con estaciones, cada silla está sobre su tapete numerado. |
| Inmersiva | Holograma grande al centro y el grupo con visores en círculo, abierto hacia la cámara, con el docente en el círculo. |
| Drones | Dron sobre la plataforma, dos pilotos en el borde oeste con el control en las manos y público en la banca cercana o de pie al este. |
| Formación docente | Mesa lateral al fondo izquierdo con caja de kit y bandeja; dos docentes sentados. |
| Seguimiento | Un docente con laptop del lado opuesto de la segunda mesa del aula de nivel más baja. |
| Grupos simultáneos | Segunda mesa a la izquierda del pasillo, con su set y su grupo. |

**Personas por aula.** El tope sigue en 40. `plan.js` reserva a los docentes de servicio y prioriza
talleres de 3–4 personas: facilitador y tres estudiantes. También prioriza el grupo del dron, con dos
pilotos y un espectador. Después van los caminantes y el tercer estudiante de las aulas de nivel.

**Comprobación.** `node tools/paper-activity-check.mjs <carpeta-nueva>` revisa los seis estados en
reposo, como los muestra la escena:

- apoyo de laptops, equipos, tapetes y cajas sobre su superficie;
- laptops de frente a su usuario;
- cruces triángulo-triángulo de utilería contra mesas, sillas, muros y personas, y de personas entre sí;
- píxeles visibles de cada equipo con un z-buffer por software, usando las cámaras de la app (vista general
  y aula enfocada con rayos X).

Objetivos: ≥ 250 px² en la vista general y ≥ 2 500 px² en el aula enfocada, a 1440 × 1000 (lienzo de
1020 × 924). La prueba `asesor/test/paper-composition.test.js` lo ejecuta. `--masks 6` guarda máscaras
para superponerlas a una captura real. `node tools/campus-rooms.cjs <carpeta>` toma las capturas por tipo
de aula (general, enfocada y cercana) y guarda los encuadres.

## Vida del campus

`asesor/lab/paper/scene-activity.js` (`tickLife`) anima los actores de `meta.actors`
([papercraft/ACTORES.md](papercraft/ACTORES.md)). Cada pose es una función pura de los actores y del
reloj de animación: el mismo estado y el mismo tiempo dan la misma pose, aunque la entidad se haya
reconstruido o la pestaña haya estado oculta. `tickActors(actors, run, u)` se conserva sobre ese reloj, y
`u ≥ RUN` (fin de una corrida) da el estado de reposo.

**Ciclo.** Cada aula sigue una secuencia de momentos («beats») de duración fija. El orden se baraja en
cada ciclo a partir de la clave del aula y del número de ciclo, y cada aula empieza en su propia fase:
las aulas no van sincronizadas y no se repiten en un minuto. Debajo, cada persona tiene una capa propia
(ritmo de tecleo, miradas, asentimientos), así que dos cuadros separados 1.8 s siempre difieren (lo
comprueba `asesor/test/campus-life.test.js`).

| Aula | Momentos e interacciones |
|---|---|
| Nivel | Exposición (el docente se gira y señala la pantalla; la clase mira y asiente) · pregunta (dos manos levantadas, el docente señala a una, esa estudiante habla y la clase la mira) · ronda (el docente camina hasta una laptop, revisa, señala y asiente) · parejas (vecinos que se giran y hablan por turnos) · pizarra (una estudiante se levanta, va a la pantalla, señala y vuelve; el docente se aparta y aplaude) · trabajo en silencio. |
| Robótica (Robot Master, SPIKE) | Ronda de 20 s: programar (la laptop del grupo o los botones del robot), correr (el equipo se mueve dentro de su `range` y sobre su `surface`; ruedas, cabeza y cola si existen), reaccionar (porra y choque de manos con el facilitador, o manos a la cabeza si falla) y devolver el robot. El facilitador acompaña al programador, luego ayuda desde su `away` y vuelve. |
| Tale-Bot | El grupo de rodillas alrededor de la pista programa con los botones, sigue el recorrido y celebra; el grupo que espera de pie conversa. El facilitador se acerca a la pista en una de cada dos rondas. |
| Electrónica | Conectar componentes (manos que presionan), probar, asentir cuando funciona y comentar. Con estaciones, cada dos rondas los estudiantes rotan de asiento uno por uno, con un lugar de espera libre calculado, y la ronda espera. |
| Inmersiva | Mirar alrededor, alcanzar objetos virtuales (el holograma gira más rápido y sube), levantar el visor para hablar con otro y señalar el holograma. El facilitador rodea el círculo por fuera para guiar a uno. |
| Drones | El dron flota sobre la plataforma, sube, hace dos ochos, baja, toca la plataforma y vuelve a flotar (32 s). Los pilotos sostienen el control (el hueso del control sigue sus manos), lo inclinan con el vuelo y miran al dron; el público lo sigue y aplaude al aterrizar. |
| Servicios | Formación: los docentes se pasan la caja del kit sobre su mesa. Seguimiento: el docente teclea, piensa y asiente. |
| Patio | Las parejas caminan de la entrada a una puerta y vuelven conversando; una saluda en la puerta. Los grupos de pie conversan por turnos y saludan; en la banca conversan entre sí. |
| Relevo (horarios distintos) | Tras cuatro rondas, el grupo sentado sale a un lugar libre, el que espera ocupa las sillas y el primero se sienta en la banca, en orden y por el pasillo. |

**Sin cruces.** Las rutas pasan por el pasillo central y, si una silla o una mesa estorba, salen primero
por detrás de la silla. Sentados a una mesa, los brazos suben hasta que las manos quedan sobre la
cubierta (`tops`). En el patio, quienes caminan se apartan de quien está de pie y entre sí. La prueba
`campus-life.test.js` recorre los estados 3 a 6 durante 260 s y busca personas dentro de mesas, muebles,
muros, el holograma u otras personas, manos dentro de las cubiertas y equipos fuera de su superficie o de
su `range`.

**Poses nuevas** (`campus-people.js`, mismo rig de 12 huesos): `raise` (mano arriba), `talk`, `lean`,
`pointDown`, `highFive`, `oops`, `think`, `press`, `hold` (control), `grab` y `visor` (RV); `cheer` (brazos
en V) y `wave` (brazo junto a la cabeza) se rehicieron para que las manos no tapen la cara. `applySeated`
mezcla estar sentado y de pie. `npm run check:people` revisa capas y suelo en estas poses; las hojas de
`tools/life-poses.cjs` las muestran sentado, de pie y en el docente.

**Geeky** reacciona a los grandes momentos con acciones breves y sin partículas: `giggle` cuando un robot
llega a la meta o el dron aterriza y `nod` cuando el circuito funciona. Atiende solo a los momentos del
aula enfocada o, en la vista general, al aterrizaje del dron, y como mucho cada 15 s. Conserva su lugar.
Al enfocar una actividad flota sobre el techo del lado contrario a la escalera o las galerías, si estas
quedan cerca.

**Reposo** (movimiento reducido y comprobaciones): todos en su lugar compuesto, sentados trabajando, los
equipos en `home`, el dron flotando a su altura y el holograma quieto.

## Visor e interacción

**HUD**

- Visor claro (`#F4F1F6`) con HUD de vidrio.
- Contiene el título, «Mi propuesta», las herramientas y la leyenda «Representación de tu
  configuración». Las herramientas son vista general, programa activo, restablecer, pausa y
  cerrar.

**Contadores**

- Cuatro contadores del motor: estudiantes atendidos, participaciones por programa, estudiantes
  simultáneos y equipos necesarios.
- «Equipos existentes» y «por incorporar» no se muestran, porque el motor no tiene inventario
  (brecha documentada).

**Leyenda**

La píldora «Representación de tu configuración» se despliega. Muestra la paleta de la maqueta (aula, taller,
cubierta, balcón, entrada y jardines) y el mismo resumen textual de la vista sin 3D.

**Interior de un aula (rayos X)**

- Se activa al enfocar un aula o taller, o al acercar mucho la cámara a una.
- Quedan translúcidos el techo, los pisos de arriba, la pared del aula hacia la cámara y los elementos delgados
  delante (balcón, escalera, árboles). Los muebles y personas de los pisos de arriba se ocultan.
- Los edificios completos que quedan entre la cámara y el aula se apartan (se ocultan).
- Reordena el índice compartido y dibuja la parte translúcida con el material de vidrio: no suma materiales
  ni búferes. La figura del PDF siempre muestra el campus completo.

**Geeky**

En reposo se posa sobre la azotea del ala izquierda. Al enfocar una actividad flota sobre su techo, a un lado.
Nunca queda delante de la escalera ni del balcón.

**Selección**

- Tocar un aula de nivel abre la matrícula de ese nivel; tocar un aula de proyecto abre su
  programa.
- Cada aula de una pila tiene su propia selección.
- Teclado: las flechas recorren, Enter edita, Escape e Inicio restablecen.

**Vista previa**

En el paso 3, «Ver en el campus» muestra la actividad de un programa no agregado, marcada como
vista previa. No cambia la cotización ni el PDF.

**Layout**

- El panel de configuración mide 360–420 px y se puede redimensionar.
- En móvil, la escena compacta va arriba, con el botón «Ampliar».
- «Solo configuración» o × cierran el campus. La cotización sigue completa, con un resumen textual
  de la composición.

**PDF**

Si la escena está lista, la propuesta incluye la figura «Representación de tu configuración
(ilustrativa)» desde `mascot.capture()`. Si no, el PDF sale idéntico.

## Calidad, presupuesto y mediciones

**Presupuesto** (`CAMPUS_BUDGET`):

- 40 000 triángulos, contando la pasada de sombras;
- 150 draw calls;
- 10 materiales.

**Sombras.** Solo la arquitectura proyecta sombra al mapa. Personas, mobiliario, equipos,
vegetación, piezas a ras de suelo y decoraciones de muro usan sombras de contacto.

**Calidad adaptativa**

- `full`: sombras y hasta 60 fps con puntero fino.
- `eco`: sin sombras, píxel 1× y 30 fps. Se activa cuando los cuadros superan 75 ms de forma
  sostenida.

**Ritmo de cuadros y energía**

| Situación | Cuadros |
|---|---|
| Transición (cámara, ensamblaje, viaje de Geeky) | 60 fps con `full` y puntero fino; 30 fps en táctil o `eco` |
| Solo vida ambiental | 30 fps con `full` y puntero fino; 20 fps en táctil o `eco` |
| Pausa, movimiento reducido | Bajo demanda: solo al cambiar algo; sin reloj de animación |
| Pestaña oculta, campus fuera de pantalla, contexto perdido | Ninguno (`IntersectionObserver`, `visibilitychange`, `webglcontextlost`) |

La vida ambiental no cuenta como transición: `transitionsActive` vuelve a 0 y `targetFps` baja al ritmo
ambiental. `getDiagnostics()` informa `ambientFps`, `targetFps`, `tickCost` (media, p95 y máximo de los
últimos 240 ticks, en ms) y `life` (reacciones de Geeky).

**Movimiento reducido.** El resultado se muestra directo, en el estado de reposo, sin animación.

**Mediciones del 2026-10-25** (Chromium headless; incluyen los personajes R3 y las correcciones r2):

| Condición | Estado | Triángulos | Draw calls | Materiales | fps |
|---|---|---|---|---|---|
| GPU RTX 3060 Ti (WSL, ANGLE/D3D12), 1440 × 1000, calidad `full` | 1 | 6 764–8 096 | 34 | 10 | 60 |
| Igual | 6 (actividad) | 36 952–38 808 | 75 | 10 | 60 |
| SwiftShader (CPU), 1440 × 1000, baja a `eco` | 6 | 33 906 | 62 | 10 | No medido (CPU) |

Con la composición de actividades (`tools/campus-perf.cjs`, misma GPU, renderer «ANGLE (… D3D12
(NVIDIA GeForce RTX 3060 Ti) …)», una corrida completa por vista):

| Vista, estado 6 | Triángulos antes | Triángulos después | Draw calls | Materiales | fps (p95 ms) |
|---|---|---|---|---|---|
| General | 36 952–38 284 | 34 870–36 202 | 75–92 | 10 | 59 (16.7) |
| Taller enfocado (Robot Master) | 36 868–38 060 | 34 786–35 978 | 82–100 | 10 | 60 (16.8) |

**Mediciones de la vida del campus** (2026-10-25, estado 6, 40 personas, 1440 × 1000;
`tools/campus-life.cjs`, `tools/campus-life-fps.cjs`):

| Condición | Ambiental | Transición | Tick (media / p95) | Triángulos | Draw calls | Materiales |
|---|---|---|---|---|---|---|
| GPU RTX 3060 Ti (renderer «ANGLE (Microsoft Corporation, D3D12 (NVIDIA GeForce RTX 3060 Ti), OpenGL ES 3.1)»), `full` | 30.0 fps | 59.3 fps | 0.71–0.94 / 0.9–1.5 ms | 26 109–36 350 | 60–95 | 10 |
| SwiftShader (CPU), baja a `eco` | 5–7 fps (limitado por el render en CPU) | 5.7 fps | 1.3–1.9 / 2.3–4.0 ms | 23 859–33 464 | 47–89 | 10 |
| Node, sin render (`campus-life.test.js`) | — | — | 0.57 / 0.91 ms | — | — | — |

- La GPU se mide con el Chromium headless por defecto (`headless_shell`): con `BROWSER_CHANNEL=chromium`
  el contexto WebGL de ANGLE/D3D12 no se crea en este host (`BindToCurrentSequence failed`).
- La animación no agrega geometrías ni materiales (la suite de navegador lo comprueba durante la vida
  ambiental). Con Geeky reaccionando en un taller enfocado, el máximo medido fue 33 987 triángulos.
- Geeky aporta unos 2 100 triángulos en reposo y hasta unos 4 200 en `celebrate`, con 2
  materiales propios.
- No hay fuga de memoria en ciclos entre los estados 2 y 6, ni en el inspector ni en la escena.
- No se probó en un teléfono físico: las pruebas móviles son emulación de viewport (390 × 844).

## Verificación

```bash
npm test                                   # Node: motor, planificador, PDF, experiencia, personajes, composición, vida (128)
npm run check:paper -- artifacts/paper/<run>   # mallas: presupuesto, coplanares, suelo, determinismo
npm run check:people -- artifacts/paper/<run>  # personajes: manifiesto plan/real, rig, capas, poses, proporciones
node tools/paper-activity-check.mjs artifacts/paper/<run>  # composición: apoyo, cruces, laptops, visibilidad de equipos
node tools/campus-rooms.cjs artifacts/campus/<run>         # acercamientos por tipo de aula y encuadres (framings.json)
GALLIUM_DRIVER=d3d12 LD_LIBRARY_PATH=/usr/lib/wsl/lib node tools/campus-perf.cjs artifacts/campus/<run> --gpu  # triángulos, llamadas y fps
node tools/people-shot.cjs artifacts/paper/<run> --piece person-prim --sizes 40,60,80,120,600 --dpr 1,2
python3 tools/people-compare.py <out> --shots <carpeta con ladder/, levels/, poses/>
PLAYWRIGHT_MODULE=… BROWSER_CHANNEL=chromium BROWSER_ARGS="--use-angle=swiftshader --enable-unsafe-swiftshader" \
  node asesor/test/campus-browser.cjs      # escritorio, móvil, movimiento reducido y sin WebGL
npm run capture -- artifacts/campus/<run>  # seis estados y cuatro vistas del cotizador real
node tools/campus-life.cjs artifacts/vida/<run> [--gpu] --fps 10   # vida: 12 cuadros por tipo de aula y 60 s de vista general
python3 -I tools/campus-life-sheets.py artifacts/vida/<run> --compare artifacts/vida/<antes>  # hojas, GIF y cambio entre cuadros
node tools/campus-life-fps.cjs             # fps de transición y ambiental, coste del tick (GPU=1 para la GPU)
node tools/life-poses.cjs artifacts/vida/<run>                     # hojas de las poses de la vida del campus
python3 tools/paper-compare.py <out> --sheets <paper-shot run> --states <paper-shot --states run>
```

## Procedencia

- **Geometría papercraft:** procedural original en `asesor/lab/paper/`, sin GLB ni Blender.
- **Referencias de diseño:** `docs/papercraft/reference/`. Son imágenes de dirección de arte; no
  se copian al producto.
- **Geeky:** GuateGeeks/geeky-animation, commit `0089c59`.
  - Los módulos se copiaron sin modificar en `asesor/lab/geeky/live/`, con sus SHA256 en
    `PROVENANCE.md`.
  - El repositorio no declara licencia. Es de la misma organización y la persona responsable
    pidió su integración.
- **Three.js** `0.186.1`, con licencia MIT (`asesor/vendor/THREE-LICENSE.txt`).
