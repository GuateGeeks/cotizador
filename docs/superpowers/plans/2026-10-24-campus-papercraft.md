# Plan: campus papercraft

Spec: [2026-10-24-campus-papercraft-design](../specs/2026-10-24-campus-papercraft-design.md).
Rama: `feat/campus-papercraft` desde `origin/main`.

Cada fase termina con `npm test`, `npm run build` y una corrida nueva de
`npm run capture`, con las imágenes abiertas. Hay dos rondas de corrección en
total, aparte de la primera ejecución.

## Fase 0 · Preparación (hecha)

- Skills `cotizador-papercraft`, `cotizador-campus-growth`,
  `cotizador-scene-contract` y `cotizador-3d-qa`.
- `AGENTS.md` y `CLAUDE.md`.
- Scripts `serve`, `test:browser` y `capture`.
- `tools/campus-states.cjs` y `tools/campus-capture.cjs`.
- Línea base en `artifacts/campus/papercraft-baseline-20261024*`.
- Análisis de la referencia.

## Fase 1 · Biblioteca de papel y materiales

1. `paper-materials.js`: cartulina mate con fibra triplanar, tono de canto y
   paleta (fondo `#F4F1F6`).
2. `paper-kit.js`: `panel`, `fold`, `prism`, `tab`, `hingedRoof`, `facetCrown`
   y `foldedLeaf`, con huesos en las líneas de pliegue.
3. Inspector `asesor/lab/inspector.html`, con una página por pieza y material
   y cámara libre.
4. Prueba en Node: normales y conteo de triángulos por primitiva; sin caras
   coplanares en las capas.

**Salida**: acercamientos del inspector que muestran espesor, canto, pliegue,
pestaña y capa.

## Fase 2 · Planificador v2

1. Registro `MODULES` con tamaño, anclajes, conectores y soportes.
2. Rejilla con patio central y alas en U, y slots e ids estables.
3. Reglas de ocupación, adyacencia, esquinas, soporte, escaleras con
   desembarco, pasarela, puertas libres, patio y vegetación.
4. Pruebas:
   - determinismo y orden;
   - crecimiento monótono 1→6;
   - reversibilidad;
   - no solapamiento;
   - soportes;
   - límites.

**Salida**: `npm test` en verde y un diagrama de slots en `docs/campus-3d.md`.

## Fase 3 · Módulos arquitectónicos y entorno

Construir con el kit:

- pedestal facetado y pavimento;
- aula inicial, ampliable y de esquina;
- piso superior y cubierta;
- entrada naranja, corredor, escalera y pasarela;
- patio, jardinera, árbol, planta y banca.

Además, ensamblaje en seis etapas: base → muros → cubierta → conexiones →
mobiliario → personas. Cada módulo tarda 400–900 ms con solapamiento, es
interrumpible y aparece directo con movimiento reducido.

**Salida**: estados 1–6 capturados; el 6 se lee como la referencia.

## Fase 4 · Personas, equipos y actividades

1. Personas de papel con proporción juvenil, uniforme y rostro, conservando
   las poses.
2. Equipos de papel: Tale-Bot, Robot Master, SPIKE con laptop, electrónica,
   dron y visor de realidad virtual, más mesa, silla y laptop.
3. Actividades:
   - caminar, sentarse, trabajar, probar un robot y acompañar;
   - relevo de grupos en las mismas estaciones;
   - sets adicionales para grupos simultáneos;
   - reposo al terminar.
4. Servicios según la modalidad: formación docente, facilitador y seguimiento
   (no se dibujan con UNDECIDED).

## Fase 5 · Integración con el cotizador

1. `setView` y botones de vista: general, programa activo y restablecer.
2. Vista previa desde el paso 3, que no toca `state.selected`.
3. Contadores separados y la leyenda «Representación de tu configuración».
4. Composición de escritorio con panel de 360–420 px y móvil con escena
   compacta ampliable, teclado y orientación.
5. Alternativa estática si no hay 3D o se pierde el contexto.
6. Captura del campus en el PDF.
7. Fondo claro, con `DESIGN.md` y tokens actualizados.
8. Retirar `createLab` del bundle.

## Fase 6 · Verificación y entrega

1. `npm test`, `npm run test:browser` (SwiftShader) y capturas en escritorio y
   móvil.
2. Medición en GPU: fps en reposo, rotación y crecimiento.
3. Prueba de fuga con 20 ciclos 2↔6, comparando las geometrías.
4. Presupuestos medidos y justificados.
5. `docs/campus-3d.md`:
   - ejecución;
   - cómo agregar un programa o un módulo;
   - paleta;
   - reglas de crecimiento;
   - cantidad de personajes;
   - calidad;
   - qué es ilustrativo y qué viene del cotizador.
6. Dictamen técnico y visual por separado; PR a `main`.
