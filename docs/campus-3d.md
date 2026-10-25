# Campus 3D reactivo

El campus acompaña al configurador con una maqueta low poly viva: un colegio que crece desde un aula, se llena de comunidad y muestra cada tecnología del catálogo en acción. Cada decisión del configurador tiene una consecuencia visible relacionada con lo que se configura. La configuración ocupa una columna de 360–390 px en escritorio, con la misma jerarquía que en móvil; el campus aprovecha el resto del ancho. En móvil la vista permanece arriba mientras se recorre el formulario.

## Dirección artística

**Una maqueta de juguete donde la arquitectura enmarca y las actividades protagonizan.** La isla violeta facetada, los marcos claros, los techos morados, los accesos naranjas, las circulaciones turquesa y la vegetación se conservan del storyboard «Del aula al campus». Los seis cuadros guían el crecimiento: un aula, la comunidad que llega, la robótica que abre un taller, las alas conectadas, el entorno que crece y el campus completo en acción.

- **Arquitectura como marco.** Las aulas son pabellones abiertos al frente, con un antepecho bajo y una puerta naranja. Las cubiertas son de corte: losa morada sobre la mitad posterior y celosía sobre la delantera, para leer el interior desde la cámara. Los talleres son plataformas abiertas con una sombra solo sobre el almacenamiento. Las paredes reciben sombra, pero solo cubiertas, postes y árboles la proyectan.
- **Sectores educativos.** Cada nivel ocupa una columna fija con su color: Preprimaria `#F9C36A`, Primaria `#19BCCD`, Básico `#FF8B22` y Bachillerato `#8DB442`. El color aparece en la franja de la fachada, las sillas, los banderines y los suéteres de sus estudiantes. Los interiores cambian por nivel: alfombra redonda y bloques en Preprimaria, pizarra y globo en Primaria, proyección en Básico y laptops en Bachillerato.
- **Personajes.** Las personas están articuladas en caderas, rodillas, hombros, codos y cabeza. Las proporciones cambian con la edad: en Preprimaria son pequeñas con cabeza grande y en Bachillerato tienen casi la altura adulta. Tienen ojos con brillo, mejillas, varios peinados, lentes, mochilas, tonos de piel diversos y uniforme. Las docentes llevan una franja tejida inspirada en el huipil y un gafete GuateGeeks.
- **Tecnologías reconocibles** según las fotos del catálogo:
  - **Tale-Bot**: cubo blanco con ojos grandes, botones de colores y accesorio de pico o brazos.
  - **Robot Master**: dinosaurio de piezas lima, gris y celeste.
  - **SPIKE Prime**: base con hub amarillo y matriz de luces, vigas magenta y ruedas turquesa.
  - **Electrónica**: placa azul de circuitos a presión con LED, ventilador y multímetro.
  - **Drones**: cuadricóptero blanco con protectores, sobre un mapa con volcán, lagos y helipuertos.
  - **Realidad virtual**: visores blancos y un holograma con un planeta, el Templo I de Tikal y una molécula.
- **Terreno realmente facetado.** La isla se compone de baldosas de 1,3 unidades con alturas deterministas compartidas en las esquinas. Los acantilados tienen estratos violetas y el borde es orgánico.
- **Vegetación variada.** Hay árboles redondos, pinos, árboles florecidos, arbustos y macizos de flores. Los árboles altos enmarcan el campus por los lados y el fondo; cerca de las actividades y en el borde frontal solo hay vegetación baja, para no tapar la acción.
- **Luz.** Una luz principal cálida con sombras suaves, cielo lavanda, contraluz fría y tone mapping neutral. Hay sombras de contacto bajo personas, robots y árboles.
- **Geeky como guía.** El personaje de GuateGeeks espera sobre el portal naranja de la entrada, sigue con la mirada lo que se explora, parpadea y vuela para observar la actividad elegida sin taparla: se coloca detrás y encima de ella desde la cámara. Señala con una patilla, como el gesto `gg-mentor` de Geeky Live.

## Matriz configuración → consecuencia visual

| Decisión | Consecuencia en la maqueta |
| --- | --- |
| Niveles | Se abre o se retira el sector del nivel: aula con su color, interior por edad y estudiantes de su tamaño. Se crean la circulación turquesa que une las alas y las baldosas de isla necesarias. |
| Matrícula | El aula se ocupa con hasta tres estudiantes sentados, más docente; cero deja el aula vacía con su docente. La comunidad caminante crece hasta ocho estudiantes, que entran por el portal y caminan a una puerta real de aula o taller, se detienen y regresan. Con una matrícula alta aparece un segundo piso, con escalera y balcón turquesa. |
| Secciones | Un banderín por sección registrada o pendiente, hasta seis. Las secciones confirmadas en cero no cuentan. Cuatro secciones también abren un segundo piso. |
| Programas | Cada tecnología construye su taller en un lugar fijo y empieza su ciclo de actividad (ver abajo). Quitarla lo desmonta sin mover los demás. |
| Grupos participantes | Los estudiantes del taller usan el tamaño y el color de los niveles de los grupos elegidos. La etiqueta flotante nombra esos niveles. |
| Horarios distintos (`separate`) | Hay un banco de espera con reloj. Al final de cada ciclo el grupo activo y el que espera se relevan caminando. |
| Simultaneidad (`simultaneous`) | Un segundo equipo y una segunda tripulación de otro grupo trabajan a la vez: dos robots, dos dinosaurios, dos placas o dos drones. |
| Horarios por definir (`unknown`) | Un reloj de arena turquesa gira junto al taller; trabaja un solo grupo. |
| Equipos | El estante del taller muestra cajas del kit, una cada tres equipos y hasta ocho. Cambiar la cantidad agrega o retira cajas con su animación. |
| Estaciones | Aparecen almohadillas numeradas 1–3 y la tripulación rota de rol cada ciclo: quien programaba prueba y quien probaba construye. |
| Modalidad (se elige por programa en el resumen, paso 5) | Al cambiarla, la cámara encuadra el taller de ese programa y se muestra su representación: |
| Compra (Integra) | Insignia del colegio en el kit y en el tablero, desde el primer día. Al elegirla llega un carrito de entrega. |
| Renta (Flex) y bimestres | Etiqueta turquesa de devolución en las cajas y un calendario con uno a cuatro bimestres que se encienden. Un carrito entrega y luego se lleva el equipo. |
| Evoluciona 8/16 | Tablero de 8 o 16 cuotas que se llena. La insignia de propiedad aparece al completar el plazo. |
| Avanzar de paso o solo cambiar modalidad | No construye edificios ni agrega capacidad. Las cantidades exactas siguen en los contadores. |

### Ciclos de actividad

Cada actividad es un ciclo con intención y fases legibles. Ninguna se reduce a oscilar.

| Tecnología | Ciclo (segundos) |
| --- | --- |
| Tale-Bot | 12 s: una niña coloca cinco tarjetas de flechas, presiona el botón, el robot ejecuta la secuencia celda por celda mientras se ilumina cada tarjeta, celebra y vuelve al inicio. |
| Robot Master | 13 s: un estudiante arma patas, cuello y cola del dinosaurio pieza por pieza; otro lo programa en la tableta; el robot camina, ruge, da la vuelta y regresa. |
| SPIKE Prime | 12 s: se escribe el programa en la laptop, se presiona el hub, el robot sigue la línea, levanta la palanca de la misión, celebran y vuelve. |
| Electrónica | 10 s: se coloca la pieza que falta, se activa el interruptor, los LED se encienden en secuencia y gira el ventilador; luego se mide con el multímetro. |
| Drones | 14 s: los motores arrancan, el dron despega, cruza el aro, rodea el mapa, aterriza en otro helipuerto y los pilotos se ceden el control. |
| Realidad virtual | 15 s: tres escenas de cinco segundos (planeta, Templo I de Tikal, molécula). Los estudiantes miran alrededor, alcanzan, señalan y manipulan, guiados por su docente. |

## Portada

El campus es la experiencia principal desde la portada: ocupa todo el fondo del hero y el titular, la descripción y las acciones flotan sobre él, a la izquierda, con un velo morado gradual que asegura la lectura. La cámara encuadra el colegio en la zona libre (a la derecha en escritorio; arriba en móvil, sobre el titular). Sin propuesta iniciada muestra un colegio ilustrativo completo (`showcaseData()`, solo para la escena); con avance guardado, el campus propio. En la portada tocar explora («Explorar»), mientras que dentro del recorrido tocar edita. La instancia 3D se crea una vez y acompaña a la persona de la portada al recorrido.

## Visor, barra lateral y modo solo configuración

El canvas ocupa todo el panel del campus y sobre el modelo solo flotan unas pocas capas translúcidas:

- arriba a la izquierda, el título con el aviso «Toca un taller o un aula para editarlo»;
- arriba a la derecha, la píldora «Mi propuesta»;
- a la derecha, «Cerrar campus 3D» (×), «Restablecer vista» y «Pausar»;
- abajo a la derecha, los totales de estudiantes y equipos.

En móvil desaparece la capa superior y el modelo usa todo el visor. `asesor.js` mide las capas (`syncCampusInsets()`) y la escena encuadra el modelo en el área libre mediante `mascot.setInsets({ top, right, bottom, left })`.

**Tocar es editar.** Al pasar el puntero, la etiqueta muestra «· Editar». Un clic o toque en un taller abre la configuración de ese programa (paso 4); en un aula abre la matrícula de su nivel (paso 2). La cámara encuadra lo que se edita. Gana la superficie visible más cercana bajo el puntero. Con el teclado, las flechas arriba y abajo recorren talleres y aulas, y Enter abre su edición. La explicación de cada decisión ya no se muestra como tarjeta: se anuncia a lectores de pantalla en una región `aria-live`.

En escritorio, el borde entre la configuración y el campus se arrastra para ajustar el ancho, de 320 px hasta dejar al menos 420 px al campus. Con el foco en el asa, las flechas lo ajustan, Inicio y Fin van al mínimo y al máximo, y Enter o doble clic restablecen el ancho. El valor se guarda en este navegador (`gg_asesor_config_w`). El contenido de la configuración se reacomoda por su propio ancho con *container queries*: dos columnas desde 560 px, ficha de propuesta en dos columnas desde 720 px y niveles en cuatro columnas desde 900 px.

El botón × del visor o «Solo configuración» en el encabezado ocultan el campus. El × sigue activo aunque la vista 3D falle, y al usarlo se avisa cómo volver a abrirlo. El modo solo configuración y deja el formulario con un ancho de lectura cómodo. En ese modo la escena no se carga; si ya existía, deja de renderizar. «Mostrar campus 3D» la recupera con su cámara. La preferencia se guarda en `gg_asesor_campus`.

## Exploración y cámara

Al pasar el puntero se resalta un taller o un aula y aparece su nombre con «· Editar»; el clic abre su edición. Editar o recorrer con el teclado centra la cámara en la actividad, levanta su techo o pérgola y la de un taller que tape un aula enfocada, dibuja un anillo bajo la actividad, muestra una etiqueta flotante y hace volar a Geeky hasta ella. El contexto automático del recorrido (pasos 2, 3 y 5) solo desplaza suavemente el centro, para que el campus completo siga visible; la exploración explícita y la edición del paso 4 encuadran la actividad.

Las transiciones se interrumpen sin saltos. Arrastrar, girar o acercar durante un vuelo de cámara conserva la orientación y el zoom del usuario; el foco solo cambia el centro y el encuadre base. El giro se limita a ±1,35 rad, porque la maqueta tiene un frente. El zoom va de 0,7× a 9×, suficiente para ver a un estudiante o un robot de cerca. La rueda del mouse (y Ctrl+rueda o el pellizco del trackpad) acerca hacia el punto bajo el cursor; en pantallas táctiles se usa el pellizco con dos dedos. El arrastre solo gira la maqueta: para recorrerla de cerca, la rueda acerca hacia donde apunta el cursor y, al alejar, la vista vuelve gradualmente al encuadre general. Explorar una actividad la vuelve a centrar sin perder el zoom, y «Restablecer vista» vuelve al encuadre general.

Teclado sobre el canvas:

- Flechas izquierda y derecha: girar.
- `+` y `-`: zoom (×1,27 por paso).
- Flechas arriba y abajo: recorrer actividades y niveles.
- `Inicio` o `Esc`: volver a la vista general.

Pausa y movimiento reducido congelan las actividades y presentan cada cambio en su estado final. Con movimiento reducido cada actividad muestra una pose representativa, no la pose de reposo. Fuera de vista o con la pestaña oculta se suspenden cuadros y temporizadores.

## Datos y reglas

`mascotData()` en `asesor/asesor.js` adapta el estado del configurador. El motor comercial sigue siendo la fuente de verdad de equipos, capacidad e importes.

| Campo | Uso |
| --- | --- |
| `levels` | IDs de niveles; cada uno ocupa su columna fija. |
| `students` | Matrícula total, usada como respaldo si no hay filas de matrícula. |
| `enrollment` | Filas con `id`, `levelId`, `label`, `sectionName` y `students`. Las cantidades explícitas, incluido cero, tienen prioridad. Determinan ocupación, banderines y segundo piso. |
| `programs` | IDs de programas; cada taller tiene un lugar fijo. |
| `equipment` | Entradas con `units`, `stations`, `sharing`, `groupIds`, `simIds`, `plan` y `flexBimestres`. Conservan `participants`, `capacity` y `rotations` del motor. |
| `activeConfig` | Decisión o exploración activa: `kind`, `programId`, `levelId`, `entryId` y `emphasis`. `emphasis` vale `explore` (clic o lista), `edit` (paso 4) o queda ausente (contexto automático, encuadre suave). |

La normalización elimina IDs desconocidos y repeticiones, ordena de forma canónica y acota los valores. Seleccionar varios programas no multiplica estudiantes. Cuando hay varias entradas por tecnología, no se suman participantes ni capacidades que podrían solaparse. Los horarios desconocidos conservan su incertidumbre.

Límites de densidad ilustrativa (`CAMPUS_LIMITS`):

- 8 aulas, dos por nivel;
- 3 estudiantes por aula en planta baja y 2 arriba;
- 8 caminantes y 40 personas de comunidad;
- 8 cajas por estante;
- 2 equipos concurrentes por taller.

Estos límites no definen aforo ni cambian la recomendación comercial.

### Construcción modular

La gramática aplica reglas de vecindad inspiradas en Townscaper; no usa código ni contenido de Townscaper. Las paredes laterales solo aparecen en bordes libres, y los vanos compartidos quedan abiertos. Solo hay cubierta donde no hay aula encima. El balcón y la escalera aparecen cuando existe un segundo piso, en el extremo visible del edificio. La isla solo crece: agregar opciones nunca retira baldosas, y una prueba lo verifica. Cada pieza nueva se arma por etapas: piso, muros que suben, mobiliario, cubierta que cae con rebote y personas que aparecen. Una pieza reconstruida por un cambio de vecindad o de cantidad conserva sus partes existentes, que tienen huesos con el mismo nombre; solo se animan las nuevas.

## Módulos y API

| Archivo | Responsabilidad |
| --- | --- |
| `asesor/lab/campus-layout.js` | Gramática pura y determinista: `normalizeCampusData()`, `getAdjacency()` y `deriveCampus()`. Sectores, talleres, isla, vegetación, comunidad y límites. Sin DOM ni WebGL. |
| `asesor/lab/campus-kit.js` | Kit facetado: primitivas (`block`, `soft`, `cyl`, `ball`, `ring`, `tile`, `slab`, `blob`), huesos (`Rig`) y capas. `finish()` une cada capa en una malla con esqueleto, colores por vértice y vértices compartidos. Incluye `rigidSkinning()`. |
| `asesor/lab/campus-people.js` | Personas articuladas por nivel, vocabulario de poses (caminar, arrodillarse, sentarse, alcanzar, escribir, tableta, señalar, aplaudir, celebrar, realidad virtual) y trayectorias. |
| `asesor/lab/campus-architecture.js` | Aulas por nivel, cubierta de corte, carcasa y estante de talleres, balcón y escalera, isla, caminos, portal, bandera, vegetación y aves. |
| `asesor/lab/campus-actors.js` | Los seis ciclos de actividad, el motor de tripulaciones (relevo, simultaneidad y estaciones), los indicadores de horario y modalidad y la comunidad caminante. |
| `asesor/lab/campus-geeky.js` | Geeky facetado: gafas desfasadas, pupilas con mirada, parpadeo, patillas, vuelo y sombra. |
| `asesor/lab/campus-scene.js` | Renderer, luces, ciclo de vida de entidades, construcción por etapas, techos que se levantan, cámara, selección, etiqueta, calidad adaptable y diagnósticos. |
| `asesor/campus-experience.js` | `GGCampusExperience.describe()`: título, explicación y diagrama de cada decisión, sin WebGL. |
| `asesor/asesor.js` / `asesor.css` | Montaje persistente, `mascotData()`, énfasis de foco, recorrido por teclado y etiqueta flotante. |

`window.GGLab.createMascot(container, options)` mantiene su contrato: `update(data)`, `resize()`, `rotate(delta)`, `zoom(delta)`, `resetView()`, `setPaused(value)`, `setFocus(context)`, `getDiagnostics()` y `dispose()`. Las opciones son `reduceMotion`, `onReady`, `onLost` y `onSelect({ kind, id })`.

`getDiagnostics()` agrega `breakdown` (triángulos por tipo de entidad, con la pasada de sombra), `transitionParts`, `quality` (`full` o `eco`), `frameInterval` y `geeky`.

Cada entidad es un `Group` con una malla por capa:

- `solid`: proyecta sombra;
- `soft`: no proyecta sombra;
- `glow`: pantallas y LED sin iluminación;
- `glass`: transparente;
- `blob`: sombras de contacto.

Todas las capas comparten un esqueleto. Las entidades se reconstruyen solo si cambia su firma, y al retirarlas se liberan geometrías y esqueletos. `dispose()` libera además los materiales, el mapa de sombra, el renderer, el canvas y la etiqueta.

## Presupuesto de render medido

El presupuesto anterior era de 30.000 triángulos, 300 llamadas de dibujo y 22 materiales. Se revisó con mediciones en la configuración máxima válida de la prueba de navegador: cuatro niveles, seis programas y una sección de 1000 estudiantes por grado. Los triángulos incluyen la pasada de sombra.

| Medición (configuración máxima) | Anterior | Nuevo |
| --- | --- | --- |
| Triángulos (con sombra) | 9.780 | 38.053 (eco: 33.831) |
| Llamadas de dibujo | 224 | 72 |
| Materiales | 22 | 7 |
| Geometrías en memoria | 213 | 63 |
| Personas articuladas | 4 animadas de 16 | 36 de comunidad + tripulaciones, todas animadas |
| FPS con GPU (RTX 3060 Ti vía D3D12/ANGLE, escritorio y móvil) | 29,7 | 29,7 / 29,4 (tope de 30) |
| Hilo principal con GPU | 18,9 % | 23,8 % |
| FPS con rasterizador por software (SwiftShader), escritorio | 8,5–10,1 | 5,7–6,6 completo; 7,2 eco |
| FPS con SwiftShader, canvas móvil | 16,0 | 8,7–9,7 |

**Nuevo presupuesto: 40.000 triángulos, 150 llamadas y 10 materiales** (`CAMPUS_BUDGET` en `campus-scene.js`, verificado por `campus-browser.cjs`). Se aceptan más triángulos porque las llamadas bajaron un 68 % y los materiales un 68 %, y la escena incorpora 36 personas articuladas, seis actividades completas e isla facetada.

En hardware gráfico real el campus alcanza el tope configurado de 30 FPS. En un rasterizador por software, el peor caso, es más lento que la versión anterior. Por eso existe el modo `eco`: si el intervalo medio entre cuadros supera unos 75 ms de forma sostenida, se desactiva el mapa de sombras (quedan las sombras de contacto) y la escena pasa a relación de píxel 1.

Optimizaciones medidas:

- Solo cubiertas, postes y árboles proyectan sombra, lo que bajó de 60,4k a 41,6k triángulos.
- Calcomanías planas de dos triángulos y bloques sin cara inferior.
- Piel rígida de un hueso (`rigidSkinning`, sin cambio medible en SwiftShader).
- Vértices compartidos, sin cambio medible en FPS.

Estas mediciones se tomaron en Chromium headless 1.64 con WSL2. No son FPS de dispositivos físicos ni una promesa de rendimiento en todos los equipos.

## Procedencia

- **3d-assets** (`creation-lab/benchmarks/school-flat-20261023/spec/`, commit `4dcd902`). Se adaptan a Three.js las primitivas cerradas y facetadas (`box`, `frustum`, `cone`, `blob`, `merge`), la unión por material y parte, el determinismo y la prevención de coplanaridad. Se cambian el sistema de coordenadas (Y arriba), las proporciones, la paleta y la escala; la geometría es procedural original, sin GLB ni Blender.

  | Fuente | SHA-256 |
  | --- | --- |
  | `spec/kit.py` | `71daf74de2a59493dd0c484f5e452a459dbd878c32606ce7ceb287fae98867ab` |
  | `spec/brief.json` | `5b686ae5525d9a929c391e1c55c91cad4fd675d97984043bc96d35f547a1aa28` |
  | `spec/CONTRACT.md` | `3a7179218fa062a59b9733f4aa4583de4076f347723335f9e07d67adffab473a` |

- **Geeky** ([GuateGeeks/geeky-animation](https://github.com/GuateGeeks/geeky-animation)). Se usa con permiso del titular. El repositorio no declara licencia y no contiene modelos 3D en archivo; su Geeky 3D es procedural, en `src/live/three-renderer.mjs`. El campus no incluye código del renderer de Geeky: reconstruye el personaje con las constantes canónicas de `src/live/core.mjs` (centros `BASE`, radios de aro, ojo y pupila, mirada `REST`, puente arqueado, patillas y marco `#34314f`). `core.mjs` es idéntico en `33f5920` y en `main` `0089c59`, con SHA-256 `e857eb8d5995a2ed1ef44cb4345f260e52d57d050556eae34ee3b19b470c339e`.
- **Referencias de producto.** Las formas de Tale-Bot, Robot Master, SPIKE Prime, electrónica, drones y realidad virtual se interpretan a partir de las fotos del catálogo en `assets/equipos/` y `assets/projects/`. Son representaciones ilustrativas, no réplicas técnicas ni simulaciones de sus capacidades.
- **Storyboard.** La imagen «Del aula al campus» no estaba disponible en esta sesión. Se siguieron su descripción de seis cuadros, la paleta y las reglas registradas en `DESIGN.md`.
- **Three.js** `0.186.1` conserva su licencia MIT en `asesor/vendor/THREE-LICENSE.txt`.

## Compilar y comprobar

```bash
npm ci && npm run build
npm test
python3 -m http.server 8000
```

`npm run build` genera `asesor/vendor/lab-scene.min.js`. Al publicar, actualiza el identificador `?v=` (actualmente `117`) en `index.html` y en `loadLab()` de `asesor.js`.

En GitHub, `checks.yml` corre pruebas y compilación en cada pull request y en cada rama, y comprueba que el bundle versionado coincida con las fuentes. El despliegue `pages.yml` (push a `main`) ejecuta `npm ci`, `npm test` y `npm run build` antes de preparar el sitio, así que una prueba fallida bloquea la publicación.

La integración de navegador se ejecuta aparte, con Playwright accesible y un servidor activo. `BROWSER_ARGS` (opcional) añade flags de Chromium, por ejemplo WebGL por software en WSL o CI:

```bash
PLAYWRIGHT_MODULE=playwright COTIZADOR_URL=http://127.0.0.1:8000/asesor/index.html BROWSER_CHANNEL=chromium BROWSER_ARGS="--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist" node asesor/test/campus-browser.cjs
```

`CAMPUS_CAPTURE_MOTION=1` graba además el recorrido de demostración. En PowerShell, define las mismas variables con `$env:NOMBRE = 'valor'`.

## Verificación del rediseño (24 de octubre de 2026)

- **Unitarias.** `npm test` dio 76 pruebas aprobadas. Incluyen nuevas reglas de crecimiento monotónico de la isla, secciones y pisos, participantes, simultaneidad y estaciones, y vegetación que no tapa actividades.
- **Navegador.** `campus-browser.cjs` se ejecutó con Chromium y SwiftShader, y aprobó los cuatro escenarios: escritorio, móvil, movimiento reducido y sin WebGL. El informe `artifacts/campus/summary.json` registra `passed: true`. En ese entorno por software la escena máxima pasó a calidad `eco`, como está diseñado.
- **Revisión visual.** Se abrieron las imágenes de cada iteración en escritorio y móvil. Las correcciones aplicadas tras revisarlas fueron:
  - cubiertas de corte y pérgolas reducidas;
  - escalera trasladada al extremo visible;
  - malla del campo de drones sustituida por postes bajos;
  - bancos de espera reubicados;
  - Tale-Bot a escala de juguete;
  - Geeky detrás de la actividad;
  - árboles altos fuera de las líneas de visión.

Evidencia local regenerable, no publicada (`artifacts/` está en `.gitignore`):

- `artifacts/campus/after/`: capturas con GPU de la vista general, las seis actividades y el nivel, en escritorio y móvil; `storyboard/1–6`; y `campus-interaction.webm`, de 54 s, que muestra construcción desde un aula, matrícula, talleres, cambios de horarios, equipos y renta, exploración y vista general.
- `artifacts/campus/comparison/`: hojas antes/después.
- `artifacts/campus/before/`: capturas e informe de la versión anterior y `source/`, con sus fuentes (`campus-scene.js`, `campus-layout.js`, `campus-actors.js`), que no estaban versionadas.

La prueba de navegador y las mediciones no sustituyen el ensayo en teléfonos físicos ni miden FPS de dispositivos reales.
