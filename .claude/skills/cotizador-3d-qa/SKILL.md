---
name: cotizador-3d-qa
description: Verificación del campus 3D del cotizador en un navegador real, con capturas de estados y vistas, presupuestos de render, rendimiento, accesibilidad y evidencia. Úsalo antes de declarar terminado cualquier cambio visual o de interacción del campus.
---

# QA del campus 3D

Un proceso que termina no prueba calidad. Abre cada imagen antes de dictaminar
y separa los resultados técnicos de los visuales. Usa `PASS`, `FAIL`, `BLOCKED`
o `NOT_RUN` con una razón breve.

## Preparación

```bash
npm ci && npm test && npm run build
npm run serve            # http://127.0.0.1:8087/asesor/index.html
```

- **Playwright** no está en `devDependencies`, para que la CI siga ligera.
  Apunta `PLAYWRIGHT_MODULE` a una instalación local (en este host:
  `/home/adawolfs/projects/tools/node_modules/playwright`) o instálalo fuera
  del repositorio.
- **SwiftShader** (por defecto) es reproducible en cualquier host, pero lento:
  no midas fps con él. **GPU** (`--gpu`, ANGLE/GL) da cifras de rendimiento;
  en WSL requiere `GALLIUM_DRIVER=d3d12 LD_LIBRARY_PATH=/usr/lib/wsl/lib` y
  falla si se crean dos contextos WebGL a la vez.
- Pillow (hojas de contacto, recortes, comparaciones de imágenes) está instalado en el
  Python del sistema (`python3-pil`, 12.1.1). El sistema no trae `pip`; hay un entorno
  alterno en `/home/adawolfs/projects/tools/.venv` con Pillow 13.
- Una sola carga pesada de GPU a la vez. Si otra sesión usa Chromium o la GPU,
  espera o coordina antes de lanzar.

## Pruebas

- `npm test`: motor, planificador del campus, experiencia y PDF. Agrega aquí
  las pruebas de derivación, crecimiento, reversibilidad y sincronización
  comercial (ver [crecimiento](../cotizador-campus-growth/SKILL.md)).
- `npm run test:browser`: el recorrido completo en Chromium. Comprueba
  presupuestos, foco, teclado, clic→edición, pausa, contexto perdido,
  movimiento reducido y campus cerrado. Usa `BROWSER_ARGS` para elegir el
  renderer.
- `npm run capture -- artifacts/campus/<run> [--gpu] [--mobile]`: los seis
  estados (`tools/campus-states.cjs`) y las cuatro vistas de referencia
  (general, frontal, patio y aulas, personajes y equipo), más una comprobación
  de que reducir de 6 a 2 equivale a construir 2 directamente. Escribe
  `report.json` con el SHA256 de cada imagen y los diagnósticos. Se niega a
  escribir en una carpeta con evidencia: usa una corrida nueva cada vez.

## Presupuestos

Están en `CAMPUS_BUDGET` (`campus-scene.js`) y en el test de navegador:

- triángulos ≤ 40 000;
- draw calls ≤ 150;
- materiales ≤ 10.

No los relajes para que una prueba pase. Si un cambio necesita más, justifícalo
con mediciones antes/después en `docs/campus-3d.md`. Obtén
`mascot.getDiagnostics()` en el campus consolidado (estado 6) y en el máximo
(todas las opciones, matrículas enormes).

## Rendimiento

- Objetivos de validación: unos 60 fps en escritorio y al menos 30 fps durante
  la interacción en un móvil representativo.
- Mide en GPU y registra dispositivo, navegador, viewport y condición (reposo,
  rotación, transición de crecimiento).
- Una emulación de viewport móvil **no** es una prueba en dispositivo real:
  nómbrala como emulación.
- Mientras el campus está a la vista, la vida ambiental sigue a un ritmo fijo
  (30 fps con `full` y puntero fino, 20 fps en táctil o `eco`); las transiciones
  suben hasta 60. En pausa, pestaña oculta, fuera de pantalla o contexto perdido
  no se pide ningún cuadro, y con movimiento reducido se muestra el reposo bajo
  demanda. Compruébalo con `targetFps`, `ambientFps`, `framePending` y `tickCost`.
- Agrega y quita módulos de forma repetida (por ejemplo, 20 ciclos de los
  estados 2↔6). `getDiagnostics().geometries` (y `renderer.info.memory`) no debe crecer
  de ciclo en ciclo.

## Revisión visual

Abre las capturas. Para el papel, aplica la comprobación de cerca de
[papercraft](../cotizador-papercraft/SKILL.md):

- espesor, cantos, pliegues, capas, pestañas, sombras y escala;
- módulos conectados, sin flotantes, superposiciones ni parpadeo;
- una escuela pequeña claramente pequeña y un campus grande claramente mayor,
  sin depender de los contadores;
- identidad compartida entre los estados 1, 3 y 6;
- legibilidad de la cámara en escritorio (panel de 360–420 px a la izquierda)
  y en móvil.

Compara con la línea base en `artifacts/campus/` (ignorada por git). Las
capturas de entrega se copian a una carpeta nueva con su `report.json`.

## Accesibilidad y recuperación

Verifica:

- el flujo completo con teclado y el foco visible;
- `prefers-reduced-motion: reduce` (`page.emulateMedia({ reducedMotion: 'reduce' })`):
  sin transiciones de UI, cámara ni 3D, con el resultado directo;
- WebGL ausente o contexto perdido (`WEBGL_lose_context`): el formulario y la
  propuesta siguen completos y hay un resumen estático;
- el campus cerrado: la cotización se completa igual;
- resize y cambio de orientación: no reinician el cotizador.

## Lecciones de los cortes del 24–25 de octubre

- **GPU real.** Chromium headless cae a SwiftShader sin avisar y la escena baja a
  calidad `eco`, sin sombras. Antes de anotar una cifra, confirma el renderer con
  `WEBGL_debug_renderer_info`. En WSL:
  `GALLIUM_DRIVER=d3d12 LD_LIBRARY_PATH=/usr/lib/wsl/lib` y
  `--ignore-gpu-blocklist --enable-gpu --use-angle=gl` (`tools/campus-perf.cjs`).
- **Composición.** Comprueba con `tools/paper-activity-check.mjs`: equipos
  visibles (≥ 250 px² en la vista general, ≥ 2 500 px² en el aula enfocada) y
  nada que atraviese mesas, sillas, muros o personas.
- **Piezas contra láminas.** `tools/alumno-piezas-r2.cjs` + `.py` comparan
  siete vistas con escala común y la ubicación resaltada.
- **Huesos únicos y personas al final del ensamblaje.** `check:paper` lo
  verifica: un nombre repetido dejaba a un estudiante visible en el paso 1.
- **Globales léxicas.** En Playwright, `mascot` e `inspectCampus` son globales
  léxicas: usa `typeof mascot !== 'undefined'`, no `window.mascot`.
- **Node.** En la terminal del agente, `node`/`npm` son funciones de nvm que
  fallan en silencio: usa la ruta absoluta del binario.

- **Parpadeo medido en el lugar.** `check:paper` mide la separación de dos planos casi paralelos en sus centroides. Medida como diferencia de distancias al origen, daba falsos positivos lejos del centro del campus.
- **Juntas y costuras.** El manifiesto de personas informa aparte, sin fallar:
  - las superposiciones de articulación de los modelos Meshy (`MESHY_JOINTS`: cuello, cintura, falda sobre el muslo, codos, rodillas, caderas);
  - los triángulos estirados de un modelo con piel por vértice (`SEAMED`), que cuenta bajo el hueso de su pieza.
- **Presupuesto según la composición.** La niña pesa 958 triángulos y aparece por semilla. Tras cambiar un modelo, mide el estado 6 en GPU y anota el margen: con la niña vigente, 37 770–39 250 de 40 000.
- **Módulos editados.** Un modelo con `SOURCE.edited` (retocado o adoptado en Blender) no se compara con su GLB: la prueba valida su procedencia. `tools/meshy-import.mjs --check` lo informa como conservado.
- **Clips.** `asesor/test/pose-clips.test.js` comprueba que un clip solo sustituye la pose con sus argumentos. Sin retoques, `POSES` es igual a `POSE_FUNCTIONS`.

El flujo completo de gestión visual está en
[GESTION-VISUAL](../../../docs/papercraft/GESTION-VISUAL.md).
