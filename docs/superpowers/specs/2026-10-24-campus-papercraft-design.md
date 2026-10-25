# Campus 3D papercraft

## Objetivo

Rehacer la representación visual del campus del asesor como una escuela de
cartulina cortada, plegada y ensamblada. Debe crecer de forma evidente, de una
aula a un campus en U con patio, a partir del alcance real de la cotización.
Referencia: [docs/papercraft/reference](../../papercraft/reference/README.md).
Skills: `.claude/skills/cotizador-*`.

## Hallazgos de la inspección (2026-10-24, `main` en `db3e823`)

- **Stack**:
  - sitio estático con JavaScript directo, sin React, así que React Three Fiber
    y Drei no aplican;
  - Three.js 0.186.1 y esbuild 0.25.12, que generan `asesor/vendor/lab-scene.min.js`;
  - Node 22, con `npm test` en CI (`checks.yml`).
  - `main` se publica en guategeeks.com/cotizador.
- **Flujo**:
  - portada (paso 0) más cinco pasos: Niveles, Estudiantes, Programas,
    Configuración (cobertura, cantidad, horarios y modalidad) y Propuesta;
  - estado en `state`, persistido en `localStorage` (`gg_asesor_v1`) y
    restaurado al cargar;
  - no hay enlace compartible ni backend;
  - el PDF (`propuesta-pdf.js`) admite imágenes JPEG.
- **Motor**: `motor.js` cumple los casos de referencia:
  - 4 × 24 → 96 únicos y 8 kits;
  - 2 × 24 simultáneas → 16 kits;
  - 25 + 2 simultáneas → 10 kits;
  - Tale-Bot usa ratio 2; Robot Master y SPIKE Prime, ratio 3.
- **Brechas del motor**, que no se ocultan:
  1. No hay **inventario existente**: el caso «8 − 6 = 2 por incorporar» no
     tiene datos ni regla.
  2. No hay un programa de **programación** ni Code Studio en el catálogo.
     Los programas reales son tale, master, spike, electronics, drones e
     immersive.
  3. Los servicios (formación, implementación guiada, seguimiento y Sócrates)
     dependen de la modalidad (`PLANS`), no de un catálogo aparte.
- **Campus actual**:
  - geometría de vértice plana sin espesor;
  - planificador puro en `campus-layout.js` (slots fijos por nivel y programa);
  - render bajo demanda, interrumpible, con movimiento reducido, contexto
    perdido y cierre del campus;
  - presupuesto de 40k triángulos, 150 draw calls y 10 materiales.
  - Línea base del estado 6: 32 057 triángulos, 59 draw calls y 7 materiales,
    en `artifacts/campus/papercraft-baseline-20261024*`.

## Decisiones propuestas

1. **Evolucionar, no reescribir**: se conservan el contrato `createMascot`, la
   frontera con `asesor.js`, el rig por huesos (pliegues = huesos en la línea
   de pliegue), el motor de actividades (relevo, sets simultáneos, estaciones)
   y las pruebas. Se sustituyen la geometría, los materiales, la composición y
   los personajes.
2. **Biblioteca de papel** (`asesor/lab/paper-kit.js`): `panel`, `fold`,
   `prism`, `tab`, `hingedRoof`, `facetCrown` y `foldedLeaf`, sobre
   `createBuilder`. Materiales compartidos (`paper-materials.js`): cartulina
   estándar mate con fibra triplanar en `onBeforeCompile` y tono de canto por
   vértice.
3. **Planificador v2** en `campus-layout.js`:
   - registro `MODULES` (tamaño, anclajes, conectores y soportes);
   - rejilla con patio central y alas en U;
   - crecimiento por aulas y pisos según niveles y secciones, talleres según
     programas, y pasarela y escalera al existir un segundo piso en dos alas;
   - API `deriveCampus` estable.
4. **Fondo claro** del visor (`#F4F1F6`) según la referencia. El HUD pasa a
   tinta violeta sobre vidrio claro. Se actualizan `DESIGN.md` y los tokens
   en el mismo cambio.
5. **Personas** de proporción juvenil con uniforme violeta, blanco y marino.
   El nivel va como acento.
6. **Vistas** con `setView('overview'|'front'|'patio'|'people')` en la escena,
   usadas por el HUD, las capturas y el inspector.
7. **Vista previa**: en el paso 3, «Ver en el campus» muestra la actividad de
   un programa no agregado, marcada «Vista previa». No toca `state.selected`.
8. **Contadores**:
   - se muestran estudiantes atendidos, participaciones, simultáneos y equipos
     necesarios;
   - «existentes» y «por incorporar» no se muestran mientras el motor no tenga
     inventario (brecha 1).
9. **Leyenda** «Representación de tu configuración» en el HUD.
10. **Exportación**: la captura JPEG del campus confirmado se agrega como una
    página o figura del PDF, sin cambiar sus datos.
11. **Inspector de desarrollo** en `asesor/lab/inspector.html`: módulos,
    materiales, personajes, vegetación, equipos y los estados 1, 3 y 6, con
    las transiciones de crecimiento y reducción.
12. **Limpieza**: se retira `createLab` (escena antigua del robot) del bundle,
    porque ya no se usa.

## Preguntas abiertas para la persona responsable

- ¿Fondo claro como la referencia (recomendado) o se conserva el visor violeta
  oscuro de `DESIGN.md`?
- ¿Se conserva Geeky en la entrada? No aparece en la referencia.
- Inventario existente: ¿se agrega al formulario y al motor en este trabajo o
  queda como brecha documentada? Por defecto, queda como brecha.

## Riesgos

- El espesor multiplica los triángulos: una lámina tiene 12 frente a los 2 de
  un plano. Mitigaciones:
  - canto solo en las aristas visibles;
  - sin caras inferiores ni ocultas;
  - instanciado o fusión de sillas y mesas;
  - detalle por zoom en calidad eco.

  Se mide antes de tocar el presupuesto.
- SwiftShader es lento: las cifras de fps se miden en GPU, y el móvil real
  queda pendiente si no hay dispositivo.
- La composición en U cambia los slots: se fijan nuevos ids estables y se
  migran las pruebas de layout.
