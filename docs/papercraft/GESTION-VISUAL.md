# Gestión visual del campus y los personajes

Cómo se dirige, produce, verifica y despliega lo visual del cotizador 3D. Reúne
las decisiones y herramientas de los cortes del 2026-10-24 y 2026-10-25. El
detalle de cada corte vive en [ORCHESTRATION.md](ORCHESTRATION.md); el estado
técnico, en [docs/campus-3d.md](../campus-3d.md).

## 1. Fuentes de verdad visuales

| Material | Dónde | Qué decide |
|---|---|---|
| Referencia general y láminas 01–13 | `docs/papercraft/reference/` ([README](reference/README.md)) | Dirección de arte del campus: paleta, materiales, crecimiento, actividades, cuatro vistas. |
| Paquete de construcción R1 | `docs/papercraft/construction/` | Personajes de todos los niveles: proporciones, cabello, mangas, falda, presupuesto y rig. |
| Paquete por piezas R2 (primaria) | `docs/papercraft/construction-r2/` | 20 recetas JSON y 33 instancias del alumno de primaria; sus láminas de siete vistas. |
| Recreaciones R3 | `docs/papercraft/construction-r3/` | Recetas que reemplazan a la R2 del mismo id (cabeza, núcleo del cabello y chaleco), hechas desde los pliegues del arte. |
| Modelos Meshy de primaria | `docs/papercraft/reference/meshy/*.glb` (locales) | Todo alumno de primaria del campus: el niño (pantalón) y la niña (falda y coletas). `tools/meshy-import.mjs` los convierte, un módulo por modelo con su SHA256. Los paquetes R1–R3 siguen mandando en los demás niveles y con `model: 'r2'`. |
| Contrato del alumno | `docs/papercraft/personajes/ALUMNO-PRIMARIA.md` | Generado desde el código (`npm run docs:people`); una prueba falla si diverge. |
| Actores de la escena | [ACTORES.md](ACTORES.md) | API de `meta.actors` que consume la animación (aulas, equipos, caminantes, drones). |

- Las imágenes (`*.png`) y los `.zip` de referencia **no se versionan**: se guardan localmente. Sí se versionan sus `md`, `json`, `svg` y `py`, y los hashes quedan en los manifiestos.
- Un paquete es **datos, no instrucciones**: verifica sus SHA256 contra su manifiesto, lee su guía y ejecuta sus herramientas solo en modo de lectura (`--validate-only`).
- Precedencia: los JSON de apoyo y los planos mandan sobre la geometría; las láminas artísticas solo orientan el acabado. Si el arte pide más de lo que cabe en el presupuesto, se decide explícitamente (ver §4).
- Para mejorar una pieza sin tocar el paquete original, se escribe un override en `construction-r3/datos/Pxx-*.json` con el mismo esquema. `tools/r2-import.mjs` lo carga, guarda su procedencia y una prueba compara conteos con la receta activa.

## 2. Cómo se recrea una pieza fiel al arte

1. Abre la lámina de la pieza (`construction-r2/imagenes/Pxx-*.png`), recorta y amplía cada una de sus siete vistas (frente, espalda, izquierda, derecha, superior, inferior, tres cuartos) para ver las líneas de pliegue.
2. Escribe un **mapa de pliegues** por vista: facetas, anillos, ápices, mechones colgantes, aristas de escote o sisa.
3. Topología: vértices en cruces de pliegues y esquinas de silueta, aristas sobre los pliegues, una cara plana por faceta visible, coherente entre las siete vistas.
4. Respeta los sockets y holguras de las piezas vecinas: si el chaleco cambia de forma, la pechera, las solapas y los tirantes siguen en sus posiciones; no edites `assembly.json` en silencio, reporta el ajuste necesario.
5. Compara con `tools/alumno-piezas-r2.cjs` + `tools/alumno-piezas-r2.py`: lámina arriba y pieza integrada abajo, en las mismas siete vistas con **una escala común** (encuadre cúbico por pieza) y la celda de ubicación resaltada sobre el alumno.
6. Itera hasta cuatro rondas y documenta en `construction-r3/README.md` el mapa de pliegues, el plan de vértices, los conteos, las holguras y las diferencias que quedan.

Piezas acopladas se trabajan juntas (cabeza y núcleo del cabello: el pelo debe envolver la cabeza sin atravesarla y dejar ver ojos y sonrisa). Piezas independientes pueden trabajarse en paralelo.

### Modelos generados (Meshy) en el rig rígido

Los GLB de Meshy (image-to-3d con textura) no entran tal cual: cada alumno tiene 320 triángulos
y la escena no usa texturas. `tools/meshy-import.mjs` los convierte sin pasos manuales. El niño
(~369 000 triángulos, una sola malla cerrada) sigue estos pasos:

1. Normaliza a H (suela en 0, altura 1, eje en las piernas), suelda por posición y clasifica cada
   cara por el color de su textura (piel, cabello, chaleco, camisa, pantalón, zapato, mochila).
2. Corta la malla densa con **planos completos** en cada articulación (rodilla, cadera, cintura,
   sisa escalonada, codo) y separa los vértices por hueso: el simplificador conserva los cortes
   como costuras, así que en reposo no hay grietas y cada cara es de un solo hueso. Un corte
   limitado a una región deja juntas en T y bordes abiertos.
3. Una simplificación guiada por error (meshoptimizer) conserva las facetas planas del modelo;
   cada cara simplificada vota su clase entre las caras densas bajo ella. Los colores salen del
   perfil de cada alumno (piel, cabello, chaleco, mochila, zapatos), con el tono por normal.
4. Ojos y sonrisa solo están pintados: se rasterizan en UV, se elevan a 3D y vuelven como
   calcomanías a 0.0075 H del rostro simplificado.
5. Se tapan las sisas y los extremos de cada segmento de brazo y pierna (al doblar se verían
   huecos) y la puntera sube 0.009 H, como la adaptación P18 de R2.
6. Variante sin mochila para quien está sentado: se quita la caja, se cierra el hueco y los
   tirantes toman el color de la ropa.

**La niña vigente es el modelo de Blender de la persona responsable** (`nina-primaria.blend`, 25 de
octubre de 2026): una malla de 940 triángulos riggeada con un esqueleto Mixamo, adoptada con
`pw.py adopt` de `3d-assets` **sin reducir sus polígonos**, a petición expresa:

- cada vértice sigue a su hueso de más peso entre los 12 del campus (mapa
  `procedural-web/mixamo-map.json`). Los triángulos entre dos huesos se estiran en la
  articulación (`skinTri` del builder): siguen siendo una influencia por vértice, sin grietas;
- el chaleco y la mochila siguen al torso: al levantar el brazo se estira la manga;
- colores por cara desde su textura, recoloreados por alumno; ojos y sonrisa como calcomanías
  (11 triángulos); la mochila forma parte de la malla y la conserva también sentada;
- capas a menos de 0.006 H separadas por su normal, suela en mecedora (puntera 0.012 H, talón
  0.006 H) y el pivote `hips` a la altura de los muslos, para sentarse en la silla;
- su límite propio es `PERSON_LIMIT.nina` = 960 (951 + sombra). Con ella, el campus mayor mide
  37 770–39 250 triángulos en GPU frente al tope de 40 000: el margen depende de cuántas niñas
  haya en escena.

La versión anterior de la niña (3 951 triángulos) llegaba en 42 piezas cerradas (mangas, manos, piernas, zapatos,
coletas, falda), con ojos y sonrisa en placas planas. Por eso usa el modo por piezas:

- cada pieza sigue a un hueso y la falda se parte en x = 0 para que cada mitad siga a su muslo;
- se descartan las placas de la cara (vuelven como calcomanías), las puntas sueltas de los
  tirantes y las cáscaras duplicadas (dos mangas o zapatos en el mismo sitio);
- cada pieza se simplifica con un mismo error absoluto, buscado para caber en el objetivo, con
  menos error en la cabeza (×0.6), el torso y la falda (×0.7), un mínimo por pieza (las coletas,
  10) y los extremos de las piezas grandes bloqueados para conservar alto y anchos;
- las capas a menos de 0.006 H (tirantes sobre el chaleco, chaleco sobre la camisa, solapas
  espalda con espalda) se separan a lo largo de su normal.

Una simplificación global dejaba las piezas pequeñas como astillas y encogía la cúpula del
cabello 4 % de la altura.

Los pivotes se midieron en el modelo y se contrastaron con UniRig (laboratorio de `3d-assets`,
run `20261025T-meshy-primaria-unirig`): rodilla y cuello coinciden; cadera (0.37 H) y codo en el
borde de la manga (0.52 H) siguen a UniRig. Su hombro es una clavícula interna pensada para
pesos suaves; con piezas rígidas el pivote queda en la punta del hombro para que la manga no se
separe al levantar el brazo.

### Retoque en Blender

Los alumnos Meshy y las poses se retocan en Blender con el puente de `3d-assets`
(`procedural-web/pw.py`, skill `gg3d-blender-web`):

1. `export` crea un `.blend` con el rig, una pieza por objeto, un material por clase de color y
   una acción por pose.
2. Se retoca en Blender.
3. `import --apply` escribe de vuelta:
   - el módulo del modelo, con `SOURCE.edited` (el `.blend`, su SHA256 y la versión de Blender);
   - `asesor/lab/paper/pose-clips-data.js`, con los clips que difieren de las funciones de pose.

Desde entonces el módulo editado es la fuente: `tools/meshy-import.mjs` no lo pisa sin `--force`
y la prueba de sincronía valida la procedencia. Los clips sustituyen la pose en `POSES` solo
para los argumentos con que se muestrearon; el tiempo y el desfase `k` cuentan como tiempo.
`POSE_FUNCTIONS` conserva las funciones originales. Tras importar: bundles, `npm test`,
`check:people`, `check:paper` y capturas abiertas.

## 3. Composición de aulas y actividades

- Una actividad legible por tipo de aula (clase, Tale-Bot en pista, Robot Master y SPIKE en mesa de taller, electrónica en banco, realidad virtual en círculo alrededor del holograma, drones con pilotos, formación y seguimiento). Detalle en `docs/campus-3d.md` y [ACTORES.md](ACTORES.md).
- **Escala de diorama**: los equipos se exageran 1.8–3.6× respecto al mobiliario, en un hueso hijo `.size`, para que se lean desde la vista general. Mínimos medidos: ≥ 250 px² en la vista general y ≥ 2 500 px² en el aula enfocada (`tools/paper-activity-check.mjs`).
- La actividad va hacia el frente abierto y a la derecha del pasillo: la cámara mira desde el frente izquierdo y la losa tapa el fondo.
- **Nada atraviesa nada**: el mismo check verifica apoyo de laptops, equipos, tapetes y cajas sobre su superficie, y cruces contra mesas, sillas, muros y personas, en los seis estados.
- Solo se dibujan sillas ocupadas; los grupos son de 3–4 personas por taller dentro del tope de 40 personas.

### Vida y energía

- La escena vive de forma continua mientras está a la vista. Cada aula sigue un ciclo de
  momentos barajado por su clave, y las rutas pasan la prueba de cruces.
  Detalle en `docs/campus-3d.md` («Vida del campus»).
- Ritmo: 30 fps ambientales (20 en táctil o `eco`) y hasta 60 fps en transiciones.
  En pausa, oculta o fuera de pantalla no hay cuadros; con movimiento reducido, el reposo.
- La animación no añade triángulos, draw calls ni materiales. El coste del tick se mide
  (`getDiagnostics().tickCost`; p95 menor de 2 ms en GPU con 40 personas).

## 4. Presupuestos y decisiones vigentes

| Elemento | Límite | Nota |
|---|---|---|
| Campus (triángulos con la pasada de sombras) | 40 000 | Solo la arquitectura proyecta sombra; personas, mobiliario, equipos y vegetación usan sombra de contacto. |
| Draw calls / materiales | 150 / 10 | La vista del interior reutiliza el material de vidrio. |
| Estudiante | 280 (con sombra de contacto) | `PERSON_LIMIT.student`. |
| Alumno de primaria con cabello corto | 320 | `PERSON_LIMIT.r3Student`, aprobado para conservar las recetas R3 (319); el niño Meshy usa el mismo límite (305 y 310 de pie y sentado, más la sombra). |
| Niña de primaria | 960 | `PERSON_LIMIT.nina`: el modelo de Blender de la persona responsable conserva sus 940 triángulos (951 con ojos y sonrisa, 958 con sombra). |
| Docente | 300 | `PERSON_LIMIT.teacher`. |
| Personas en escena | 40 | `CAMPUS_LIMITS.people`. |

- Los presupuestos no se relajan para que una prueba pase. Un cambio de límite se pide a la persona responsable con la medición que lo justifica y queda en una constante única.
- Los auxiliares cuentan: la sombra de contacto (7) entra en el límite del personaje. Si el paquete ya ocupa el límite, se redistribuye (por ejemplo, retirando tapas siempre ocultas) antes de añadir.
- Superficies abiertas de un solo lado desaparecen desde atrás (el material oculta caras traseras). Las vistas técnicas que las muestran por ambos lados no obligan a `DoubleSide`; dentro del personaje quedan tapadas.

## 5. Decisiones de la escena que se conservan

- **Vista del interior (rayos X)**: al enfocar un aula o acercarse mucho, el techo, los pisos de arriba, la pared hacia la cámara y los elementos delgados delante quedan translúcidos; los edificios intermedios se apartan; muebles y personas de los pisos de arriba se ocultan. Se implementa reordenando el índice compartido y dibujando la parte translúcida con un gemelo del mismo búfer y el material de vidrio: no suma materiales ni búferes. El PDF siempre muestra el campus completo.
- **Composición del campus**: U compacta con balcón y una escalera al ala derecha; entrada naranja en un porche al oeste, al ras del frente de la primera aula; frente compacto; árboles en el porche y vegetación baja al este.
- **Geeky** se posa en la azotea del ala izquierda y, al enfocar, flota sobre el techo de la actividad: nunca delante de la escalera ni del balcón.
- **Leyenda** desplegable desde la píldora «Representación de tu configuración», con la paleta y el resumen textual.
- **Ensamblaje**: las personas aparecen solo en la última etapa; los huesos tienen nombres únicos (el check de mallas lo verifica).

## 6. Verificación visual

| Necesidad | Herramienta |
|---|---|
| Piezas y estados del inspector | `tools/paper-shot.cjs` (`--group`, `--piece`, `--states`, `--assembly`) |
| Comparar láminas 01–13 con los modelos | `tools/paper-compare.py` |
| Cotizador real: seis estados, vistas y leyenda | `tools/campus-capture.cjs` (`--mobile`, `--gpu`) |
| Aulas de cerca, antes y después | `tools/campus-rooms.cjs` + `tools/campus-rooms-compare.py` |
| Alumno de primaria (vistas, poses, lectura 80/120/600 px, aristas) | `tools/alumno-shot.cjs` + `tools/alumno-compare.py` |
| Cada pieza R2/R3 contra su lámina | `tools/alumno-piezas-r2.cjs` + `tools/alumno-piezas-r2.py` |
| Mallas: presupuesto, coplanares, huesos únicos, personas al final | `npm run check:paper -- <run>` |
| Personajes: plan = caras emitidas, rig, capas, poses, proporciones | `npm run check:people -- <run>` |
| Actividades: apoyo, cruces, visibilidad de equipos | `node tools/paper-activity-check.mjs <run>` |
| Rendimiento en GPU | `tools/campus-perf.cjs` |
| Modelo Meshy desde su GLB (sincronía y `--check`) | `node tools/meshy-import.mjs [--model nino\|nina] [--check] [--force]` |
| Retocar o adoptar modelos y poses en Blender | `3d-assets/procedural-web/pw.py doctor\|export\|import\|adopt` |
| Clips de animación retocados | `asesor/test/pose-clips.test.js`; `POSE_FUNCTIONS` conserva las funciones |

Reglas:

- Una carpeta nueva por corrida; nunca sobrescribas evidencia revisada. Las capturas viven en `artifacts/` (ignorado por git).
- **Abre las imágenes** antes de dictaminar y separa los veredictos técnico y visual. Un proceso que termina no prueba calidad.
- Revisión independiente en contexto nuevo para cerrar un corte visual (ver `artifacts/paper/review-opus-r2/REVIEW.md`); sus hallazgos se atienden o se responden con evidencia.
- Para animación, revisa secuencias de fotogramas en el tiempo, no una sola captura.

### Medir en GPU (WSL)

Chromium headless cae a SwiftShader sin avisar y la escena baja a calidad `eco` (sin sombras): esa cifra no sirve para el presupuesto.

```bash
GALLIUM_DRIVER=d3d12 LD_LIBRARY_PATH=/usr/lib/wsl/lib node tools/campus-perf.cjs
```

Lanza Chromium con `--ignore-gpu-blocklist --enable-gpu --use-angle=gl` y confirma que el renderer reportado sea «ANGLE (Microsoft Corporation, D3D12 (NVIDIA GeForce RTX 3060 Ti)…)». Registra triángulos (rango durante la actividad), draw calls, materiales y fps en el estado 6. Última medición (alumnos Meshy; la niña de 958 triángulos): 37 770–39 250 triángulos, 75–95 draw calls, 10 materiales, calidad `full`. El margen depende de cuántas niñas salgan por semilla: vuelve a medir tras cambiar un modelo.

### Trampas conocidas del entorno

- En la terminal del agente, `node` y `npm` son funciones de nvm que fallan en silencio: usa `/home/adawolfs/.nvm/versions/node/v22.23.4/bin/node`.
- `mascot` e `inspectCampus` son globales léxicas de la página: en Playwright usa `typeof mascot !== 'undefined'`, no `window.mascot`.
- Los servidores locales se levantan solo en `127.0.0.1` y se detienen al terminar.
- Un script propio con nombre de módulo estándar (`inspect.py`) rompe a PIL si se ejecuta desde su carpeta: usa `python3 -I`.
- El Blender de Windows se llama desde WSL con rutas de Windows (`wslpath -w`); para abrir su interfaz, lánzalo desacoplado. Exporta e importa con la misma versión con la que se edita.
- Antes de leer un `.blend` de la persona responsable, comprueba si su Blender tiene cambios sin guardar (`*` en el título): se lee el archivo del disco.

## 7. Orquestación del trabajo visual

- Trabajos paralelos en **git worktrees** separados (`../cotizador-<tema>`), cada uno con su rama, un enlace a `node_modules` y una copia local de las imágenes de referencia.
- **Propiedad de archivos y contrato de API** explícitos entre agentes paralelos (por ejemplo, composición posee `compose.js`; animación posee `scene-activity.js` y consume `meta.actors`, que solo se amplía y se documenta en [ACTORES.md](ACTORES.md)).
- Al juntar ramas, los archivos generados (bundles, módulo de datos R2, contrato del alumno) se regeneran; no se resuelven a mano.
- Despliegue: rama de integración, pruebas completas (Node, mallas, personajes, actividades, navegador en cuatro condiciones, GPU), PR, checks de CI verdes y merge a `main`; luego se comprueba que el bundle publicado sea idéntico al local y se hace una prueba de humo en producción.

## 8. Deudas visuales conocidas

- Lectura papercraft general: faltan pliegues, filetes y cantos claros en muebles y equipos (revisión r2).
- Niña (modelo de autor): en el borde de calceta y piel quedan caras en diagonal blanco y naranja; al saludar, la manga estirada se ve delgada; la mochila se conserva al sentarse.
- Alumnos Meshy: al levantar los brazos la manga del niño se ve como un anillo delgado y la tapa de la sisa como un triángulo blanco; la niña tiene mangas de 4 triángulos y manos angulosas, y su torso pierde parte de la V del chaleco. Cabezas de 0.30 H (niño) y 0.32 H (niña) frente a 0.28 H del perfil R1. En primaria ya no hay variantes de peinado ni de falda v1: la variedad es de colores y de niño o niña.
- Personajes: pelo y piel más oscuros que las láminas; mangas, manos y zapatos sin recrear al nivel R3; el chaleco R3 aún es una caja de perfil.
- Equipos: laptops de taller de espaldas a la cámara; correa del visor como marco.
- Interior: en aulas de planta baja, el balcón y el piso superior translúcidos dejan el acercamiento algo velado.
- Sin prueba en teléfono físico; las cifras móviles son emulación.
