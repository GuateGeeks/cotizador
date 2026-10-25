# Campus papercraft · guía para ejecutar, ajustar y ampliar

La escuela del asesor está hecha de cartulina cortada, plegada y ensamblada.
Crece de una aula a un campus en U según el alcance de la cotización.

| Tema | Documento |
|---|---|
| Referencias visuales | [reference/](reference/README.md) |
| Contrato de piezas | [CONTRACT.md](CONTRACT.md) |
| Integración con el cotizador | [INTEGRATION.md](INTEGRATION.md) |
| Registro del trabajo | [ORCHESTRATION.md](ORCHESTRATION.md) |
| Skills | `.claude/skills/cotizador-*` |

## Ejecutar y ver

```bash
npm ci && npm test && npm run build
npm run serve                      # http://127.0.0.1:8087/asesor/index.html
npm run build:inspector            # inspector: http://127.0.0.1:8087/asesor/lab/inspector.html
```

El **inspector** muestra:

- cada pieza sola o por grupo;
- seis vistas: `34`, `front`, `side`, `back`, `top` y `close`;
- un control de ensamblaje.

Es una herramienta de desarrollo: el asesor no la carga.

**Evidencia.** Usa una carpeta nueva por corrida, dentro de `artifacts/`
(ignorada por git):

```bash
export PLAYWRIGHT_MODULE=/ruta/a/playwright
node tools/paper-shot.cjs artifacts/paper/<run> --group rooms --views 34,front,close --assembly 0,.5
node tools/paper-shot.cjs artifacts/paper/<run> --states 1,2,3,4,5,6 --assembly .15,.45,.75
node tools/paper-shot.cjs artifacts/paper/<run> --leak 10
npm run check:paper -- artifacts/paper/<run>
```

Qué produce cada corrida:

- **`--group`:** hoja del grupo y vistas por pieza.
- **`--states`:** los seis estados con la cámara fija del más grande, las
  cuatro vistas de referencia y el ensamblaje.
- **`--leak`:** ciclos de crecimiento y reducción, con la memoria de GPU de
  cada ciclo.
- **`check:paper`:** las pruebas de malla (ver más abajo).

## Piezas: biblioteca papercraft

`asesor/lab/paper/` contiene:

- **`kit.js`:** primitivas de papel y la paleta `PAPER`. Las primitivas son
  `card` (lámina con canto), `slab`, `wall`, `fold` (lámina plegada en valle o
  montaña), `plate`, `tab` (pestaña), `frame` (marco en capas), `prism`,
  `crown` (copa facetada), `spike`, `leaf`, `glass`, `inlay` y `shadow`. Además
  define `stage` para el ensamblaje y `SCALE`, la escala compartida.
- **`material.js`:** cartulina mate (`metalness 0`, `roughness 0.92`) con fibra
  procedural que solo aparece de cerca.
- **`pieces-*.js`:** las piezas por grupo (aulas, conexiones, vegetación,
  mobiliario, tecnologías y personajes). `catalog.js` las reúne.
- **`plan.js`:** el planificador de crecimiento.
- **`compose.js`:** convierte un plan en un campus amueblado.

### Incorporar un módulo arquitectónico

1. Agrega la pieza en `pieces-rooms.js` o `pieces-links.js` con la forma del
   [contrato](CONTRACT.md): `id`, `label`, `group`, `size`, `budget` y
   `build(b, p, opts)`. Compón solo con primitivas del kit, nombra los huesos
   con el prefijo `opts.id`, declara anclas y conectores, y usa `stage` con un
   `fold` como mínimo.
2. Revísala en el inspector y con `paper-shot --piece <id>`.
3. Pasa `npm run check:paper` (presupuesto, tamaño, suelo, coplanares).
4. Para que el campus la use, el planificador (`plan.js`) debe emitir módulos
   con ese `type` en un slot fijo, con su prueba en `paper-plan.test.js`.

### Agregar un programa visual

Un programa existe solo si está en el catálogo real (`asesor/config.js`). Con
eso:

1. Agrega la tecnología como pieza en `pieces-tech.js`, con una forma de
   producto reconocible y sin marcas.
2. En `plan.js`, dale un slot fijo de aula de proyecto (`PROGRAM_IDS` y la tabla
   de pilas de la cabecera).
3. En `compose.js` (`DEVICE`), indica qué pieza va sobre la mesa de proyecto.
   Si se programa con laptop, agrégalo a `LAPTOP`.
4. Agrega su actividad en la escena y su texto en `campus-experience.js`.

### Cambiar la paleta

- Los tonos de papel están en `PAPER` (`kit.js`). Los cantos se derivan con
  `edgeTone` y las variantes con `shadeTone`, así que no hace falta repetir hex.
- Los tokens de interfaz están en `DESIGN.md` y `asesor.css`. La jerarquía es:
  - violeta para estructura;
  - marfil para aulas;
  - naranja para entradas y acciones;
  - turquesa para conexiones y selección;
  - verdes solo para vegetación.

## Crecimiento

Las reglas viven en un solo lugar, la cabecera de `plan.js`, que documenta la
tabla de slots:

- **Pilas.** Una pila de aulas por columna, de hasta tres pisos: ala izquierda,
  dos al fondo y dos a la derecha, alrededor de un patio abierto al frente.
- **Niveles.** Cada nivel tiene su aula. Gana un piso superior con 90
  estudiantes o más, o con 4 secciones o más.
- **Programas.** Cada programa tiene su aula de proyectos. El de drones va en el
  patio.
- **Conexiones.** Hay escaleras cuando existe un piso superior, y una pasarela
  cuando las dos alas tienen piso superior.
- **Base y vegetación.** El pedestal crece por celdas. El jardín trasero solo
  lleva vegetación.
- **Límites.** Están en `PLAN_LIMITS` y `CAMPUS_LIMITS`.

Las pruebas de `paper-plan.test.js` comprueban:

- determinismo;
- crecimiento monótono;
- que reducir el alcance equivale a construir directamente;
- que no hay solapes;
- que cada piso tiene soporte;
- escaleras con desembarco;
- que ninguna aula queda delante de otra;
- ancho máximo de 13.0.

**Personajes representativos.** `CAMPUS_LIMITS.people` (en
`campus-layout.js`) limita cuántas personas se dibujan. Los contadores del HUD
muestran las cifras reales del motor. El orden de recorte por prioridad está en
`plan.js`, en la sección de personas.

## Calidad y rendimiento

- **Presupuesto.** 40 000 triángulos, 150 draw calls y 10 materiales
  (`CAMPUS_BUDGET` en `campus-scene.js`). Cada pieza tiene su propio `budget`.
- **Calidad gráfica.** La calidad eco desactiva las sombras y fija la
  resolución en 1×; se ajusta en `campus-scene.js`. La fibra del papel se
  regula con `paperMaterial({ fibre, mottle })`.
- **Pruebas de malla** (`tools/paper-mesh-check.mjs`, en Node y sin WebGL):
  - presupuesto;
  - triángulos degenerados o con `NaN`;
  - tamaño real frente al declarado;
  - nada por debajo del suelo;
  - **caras coplanares superpuestas de distinto color**, que en pantalla
    parpadean;
  - huesos y etapas;
  - determinismo;
  - 216 variantes de persona;
  - los seis estados compuestos.

## Qué es ilustrativo y qué es dato

**Ilustrativo:**

- edificios, aulas extra, pisos, pasarelas y escaleras;
- jardines, árboles, bancas y personajes;
- la posición de cada cosa.

El campus es una **representación de la configuración**: no genera partidas
de construcción, mobiliario ni infraestructura.

**Viene del cotizador** (`asesor.js`, `motor.js` y `config.js`):

- niveles, secciones y matrícula;
- programas elegidos y sus grupos;
- uso compartido o simultáneo;
- equipos;
- modalidad y los servicios que incluye;
- todos los contadores.

La escena no calcula precios.
