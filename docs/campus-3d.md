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

El render es bajo demanda. La escena se construye, corre su actividad durante unos 13 s y luego
reposa sin pedir cuadros.

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

**Movimiento reducido.** El resultado se muestra directo, sin animación.

**Mediciones del 2026-10-25** (Chromium headless; incluyen los personajes R3 y las correcciones r2):

| Condición | Estado | Triángulos | Draw calls | Materiales | fps |
|---|---|---|---|---|---|
| GPU RTX 3060 Ti (WSL, ANGLE/D3D12), 1440 × 1000, calidad `full` | 1 | 6 764–8 096 | 34 | 10 | 60 |
| Igual | 6 (actividad) | 36 952–38 808 | 75 | 10 | 60 |
| SwiftShader (CPU), 1440 × 1000, baja a `eco` | 6 | 33 906 | 62 | 10 | No medido (CPU) |

- Geeky aporta unos 2 100 triángulos en reposo y hasta unos 4 200 en `celebrate`, con 2
  materiales propios.
- No hay fuga de memoria en ciclos entre los estados 2 y 6, ni en el inspector ni en la escena.
- No se probó en un teléfono físico: las pruebas móviles son emulación de viewport (390 × 844).

## Verificación

```bash
npm test                                   # Node: motor, planificador, PDF, experiencia, personajes (115)
npm run check:paper -- artifacts/paper/<run>   # mallas: presupuesto, coplanares, suelo, determinismo
npm run check:people -- artifacts/paper/<run>  # personajes: manifiesto plan/real, rig, capas, poses, proporciones
node tools/people-shot.cjs artifacts/paper/<run> --piece person-prim --sizes 40,60,80,120,600 --dpr 1,2
python3 tools/people-compare.py <out> --shots <carpeta con ladder/, levels/, poses/>
PLAYWRIGHT_MODULE=… BROWSER_CHANNEL=chromium BROWSER_ARGS="--use-angle=swiftshader --enable-unsafe-swiftshader" \
  node asesor/test/campus-browser.cjs      # escritorio, móvil, movimiento reducido y sin WebGL
npm run capture -- artifacts/campus/<run>  # seis estados y cuatro vistas del cotizador real
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
