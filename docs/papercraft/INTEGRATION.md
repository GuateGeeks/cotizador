# Integración del campus papercraft en el cotizador

Contrato entre las dos partes de la integración. Cada parte tiene un dueño y
archivos propios. El estado comercial sigue en `asesor.js`, `motor.js` y
`config.js`, y la escena nunca calcula precios (ver
[cotizador-scene-contract](../../.claude/skills/cotizador-scene-contract/SKILL.md)).

## Parte A · Escena

**Archivos:**

- `asesor/lab/campus-scene.js`;
- `asesor/lab/campus-actors.js` y `campus-people.js`, solo si hace falta;
- `asesor/lab/lab-scene.js`, para retirar `createLab`;
- `asesor/lab/paper/scene-*.js`, nuevos.

**Qué cambia:**

- **Fuente de verdad del campus.** Pasa a ser `planCampus(data)`
  (`paper/plan.js`) en lugar de `deriveCampus`. `normalizeCampusData` sigue
  normalizando la entrada.
- **Entidades.** Cada módulo del plan, o cada bahía (aula, cubierta y
  mobiliario), es una entidad con clave estable. Se construye con las piezas
  del catálogo (`paper/catalog.js`) y se amuebla como en `paper/compose.js`.
  Un cambio de datos solo reconstruye las entidades cuya clave o firma cambió.
  Al quitar una entidad se libera su geometría; los materiales compartidos se
  conservan.
- **Materiales y luz.** `paperMaterials()` (`paper/material.js`), dentro del
  presupuesto de 10 materiales.
- **Fondo.** `#F4F1F6`, con luz como la del inspector (`paper/inspector.js`).
  Las losas y cubiertas no sombrean los interiores.
- **Ensamblaje.** Respeta las etapas `stage` de las piezas: `fold` (girar desde
  `from` sobre `axis`), `rise`, `pop` y `drop`.
  - Cada módulo tarda de 400 a 900 ms y las piezas nuevas se solapan.
  - Si llega un estado nuevo, la animación converge al más reciente, sin cola.
  - Con movimiento reducido, el resultado aparece directo.
- **Actividades legibles con un fin.** Al terminar, la escena reposa y el render
  es bajo demanda:
  - caminar por los caminos;
  - sentarse y teclear;
  - probar el robot en la mesa de proyectos;
  - el facilitador acompañando;
  - el dron sobrevolando el patio de drones;
  - visores con holograma;
  - el relevo de grupos en las mismas estaciones cuando el uso es separado,
    con los kits quietos;
  - un segundo set de estaciones cuando hay grupos simultáneos.

  El motor de relevos de `campus-actors.js` (`crewEngine`) se puede reutilizar.
  Los servicios se dibujan según `plan.services`: formación docente,
  facilitador y seguimiento con laptop.

### API de `createMascot`

Se conserva toda: `update`, `resize`, `rotate`, `zoom`, `resetView`,
`setPaused`, `setFocus`, `setInsets`, `setHoverVerb`, `getDiagnostics` y
`dispose`. Se agregan:

- **`setView(name)`:** acepta `'overview' | 'front' | 'patio' | 'people' | 'program'`.
  - `program` encuadra el foco activo.
  - Las vistas son encuadres limitados: no atraviesan el suelo ni pierden el
    campus.
- **`update(data)`:** acepta además `data.preview = { programId }`. La vista
  previa muestra la actividad de un programa no agregado, marcada
  visualmente, y nunca cambia el plan confirmado.
- **`capture({ width, height })`:** devuelve un `dataURL` JPEG del estado
  confirmado en vista general, para el PDF. Lo devuelve aunque esté en pausa.
- **`getDiagnostics()`:** suma `modules`, `plan: plan.stats`, `preview` y
  `view`.

**Selección.** Un aula de nivel selecciona `{ kind: 'level', id }` y un aula de
proyecto selecciona `{ kind: 'program', id }`, como hoy.

**Cámara.** No reencuadra para igualar tamaños: conserva el encuadre mientras
el campus quepa y lo amplía con suavidad solo para evitar recortes.

**Presupuesto.** 40 000 triángulos, 150 draw calls y 10 materiales, medidos
con `getDiagnostics()` en el estado 6 y en el máximo.

## Parte B · Interfaz del cotizador

**Archivos:** `asesor/asesor.js`, `asesor/asesor.css`, `asesor/index.html`,
`asesor/propuesta-pdf.js`, `DESIGN.md` y `.impeccable/design.json`.

**Qué se agrega o cambia:**

- **Visor claro.** Fondo `#F4F1F6`. El HUD es de vidrio claro con tinta
  `#321853` y conserva el contraste AA. Se actualizan los tokens de `DESIGN.md`.
- **Leyenda.** El texto «Representación de tu configuración» va discreto en el
  HUD.
- **Contadores.** Cuatro, separados y tomados del motor:
  - estudiantes atendidos (`uniqueStudents`);
  - participaciones por programa;
  - estudiantes simultáneos;
  - equipos necesarios.

  «Existentes» y «por incorporar» no se muestran: es una brecha del motor (ver
  la spec).
- **Vista previa.** En el paso 3, el botón «Ver en el campus» de cada programa
  no agregado llama a `update({ ...data, preview: { programId } })` y anuncia
  «Vista previa» por la región viva. «Agregar a mi propuesta» sigue siendo lo
  único que cambia el alcance.
- **Botones de vista.** «Vista general», «Programa activo» y «Restablecer»
  (`setView`), accesibles por teclado.
- **Escritorio.** Panel de 360 a 420 px a la izquierda y el modelo en el resto.
- **Móvil.** Escena compacta arriba con botón «Ampliar». Un campo con foco
  tiene prioridad sobre la escena. Los datos se conservan al rotar.
- **Respaldo.** Si no hay WebGL, se pierde el contexto o el campus está
  cerrado, se muestra un resumen estático textual de la composición: aulas,
  talleres, pisos y servicios.
- **PDF.** Con la escena lista, `mascot.capture()` se agrega como figura en la
  propuesta sin cambiar su estructura ni sus datos. La prueba va en
  `pdf.test.js`.
- **Caché.** Sube `?v=` en `index.html`.

## Verificación común

- `npm test`, `npm run build`, `npm run check:paper` y
  `npm run test:browser`, adaptado a las nuevas API.
- Capturas con `npm run capture`.
- Registro de evidencia en `docs/papercraft/ORCHESTRATION.md`.

## Contrato de circulación vertical (piso superior)

Defecto observado por la persona responsable: las escaleras terminan en plataformas cerradas que no llevan a ningún lugar. Regla:

- **Alcanzable**: todo aula de piso 1 o 2 es alcanzable caminando desde el suelo: pie de escalera sobre un camino del pedestal → escalera → descanso al mismo nivel que una **galería** (cubierta transitable delante del frente abierto de las aulas superiores) → aula. La pasarela (`bridge`) une galerías de dos edificios. Un piso 2 necesita su propia escalera desde la galería del piso 1.
- **Galería**: módulo `corridor` con `opts.walkway: true`, `opts.len`, `opts.w` (≈ 0.9) y `opts.open: ['left','right','front','back']` = lados SIN baranda (donde se une con escalera, pasarela, otra galería o la fachada de las aulas). Se coloca a la altura del piso (y = 1.7 · piso) pegada al frente de las aulas superiores, a todo su ancho.
- **Escalera**: `stairs` con `opts.landing.open` = lado del descanso superior sin baranda (el que toca la galería); su descanso queda a ras y contiguo a la galería (sin hueco ni escalón). Nunca delante del frente abierto de un aula de planta baja ni contra un muro.
- **Pasarela**: `bridge` con `opts.open: ['left','right']` en los extremos que tocan galerías, a la misma altura y contiguos.
- **Aula superior**: `room-upper` con `opts.balcony: false` cuando tiene galería delante (sin baranda propia al frente: la galería la pone en su borde exterior).
- Prueba del planificador: grafo de cubiertas transitables (escaleras, descansos, galerías, pasarelas) conectado; cada aula superior toca una galería del grafo en su frente; cada junta de dos cubiertas tiene el lado `open` en ambas; cada borde libre tiene baranda.
