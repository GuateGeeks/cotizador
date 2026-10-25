---
name: cotizador-scene-contract
description: Frontera entre el estado comercial del cotizador y la escena 3D. Úsalo al conectar datos de la cotización con el campus, al mostrar cantidades de estudiantes o equipos, al representar servicios o modalidades, o al decidir qué es ilustrativo y qué es dato real.
---

# Contrato cotizador ↔ escena

## Responsabilidades

| Capa | Dónde | Regla |
|---|---|---|
| Estado de la cotización | `state` en `asesor/asesor.js`, persistido en `localStorage` (`gg_asesor_v1`) | Única fuente de verdad |
| Cálculo comercial | `motor.js`, `config.js` | Puro; la escena nunca lo reimplementa |
| Adaptador para la escena | `mascotData()`, `showcaseData()`, `campusContext()` en `asesor.js` | Solo lee y normaliza resultados ya calculados |
| Planificación | `asesor/lab/campus-layout.js` | Pura, determinista, sin precios |
| Render, transiciones, cámara | `asesor/lab/campus-scene.js` y módulos `campus-*` | Consume el plan |
| Interacción | `editFromCampus`, `inspectCampus`, teclado del HUD | Relaciona objeto 3D ↔ campo |

La escena no calcula precios, cuotas, impuestos ni descuentos, y no agrega
estado de React ni otro gestor: el proyecto es JavaScript directo.

## Cuatro estados que no se mezclan

1. **Selección confirmada**: lo que está en `state.selected`, agregado de
   forma explícita. Es lo único que cambia el alcance y los importes.
2. **Vista previa**: explorar un programa sin agregarlo. Puede mostrar su
   actividad temporalmente, marcada como vista previa en la escena y en el
   texto accesible. Nunca entra en `state.selected` ni en el PDF.
3. **Inspección**: `campusInspection`, el objeto enfocado para explorarlo.
4. **Cámara**: zoom, giro y foco. No cambian cantidades ni importes.

Editar un dato debe actualizar solo las entidades afectadas
(`createMascot().update` compara claves estables), no regenerar la escuela en
cada pulsación.

## Reglas de equipos vigentes

Verificadas contra `motor.js` el 2026-10-24:

- `teamsFor = ceil(estudiantes / ratio)` por grupo. Ratios en `config.js`:
  Tale-Bot 2, Robot Master 3, SPIKE Prime 3, electrónica 3, drones 3 y
  Meta Quest 3.
- Grupos en horarios distintos (`separate`): el máximo por grupo. Grupos
  simultáneos: cada grupo se redondea por separado y luego se suman.
  Horario desconocido: escenarios mínimo y máximo, sin cobertura garantizada.
- Casos de referencia que el motor cumple:
  - 4 × 24 → 96 estudiantes únicos y 8 kits;
  - 2 × 24 simultáneas → 16 kits;
  - 25 + 2 simultáneas → 9 + 1 = 10 kits.
- **Brecha conocida**: el motor no tiene inventario existente. El caso «8
  necesarios − 6 compatibles disponibles = 2 por incorporar» no tiene datos ni
  reglas. No muestres «equipos existentes» ni «por incorporar» como
  calculados. Si se agrega, es un cambio del motor y del formulario, con
  pruebas propias, nunca de la escena.

## Personas y participaciones

- **Estudiantes atendidos**: `uniqueStudents` cuenta cada grupo una sola vez.
- **Participaciones**: `participation(s)` por programa.
- **Simultáneos**: los grupos en `simIds`.
- Un mismo grupo puede estar en varios programas. Mantén el total institucional
  separado de las participaciones. El solapamiento entre secciones solo se
  conoce por grupo: no inventes deduplicación por estudiante.
- Los personajes son representativos (`CAMPUS_LIMITS.people`). Un personaje no
  es una persona contratada. Los contadores del HUD muestran las cifras reales.

## Servicios y catálogo

- **Programas reales**: `tale`, `master`, `spike`, `electronics`, `drones` e
  `immersive` (`PROGRAMS` en `config.js`). No existe un programa de
  programación independiente, ni Code Studio en el catálogo. Representa la
  programación como parte de la actividad de robótica (por ejemplo, la estación
  de laptop de SPIKE). No la muestres como servicio aparte.
- **Servicios por modalidad**, según `PLANS` en `config.js`:
  - INTEGRA: compra, orientación inicial y 1 h de capacitación, sin Sócrates;
  - FLEX: renta por bimestres, con capacitación, integración, seguimiento,
    soporte y Sócrates;
  - EVOLUCIONA 8 y 16: 20 % inicial y cuotas, con capacitación, integración,
    recursos, seguimiento, soporte y Sócrates.

  Dibuja formación docente, implementación guiada o seguimiento solo si la
  modalidad elegida los incluye. Con UNDECIDED no se dibuja ningún servicio.
- Cambiar solo la modalidad conserva el alcance visual: los mismos módulos,
  con un cambio de servicios o accesorios.
- En las tarjetas comerciales conserva las fotografías reales (`PHOTOS`). La
  representación papercraft acompaña, no reemplaza.

## Lo ilustrativo

Edificios, aulas extra, jardines, árboles, caminos, bancas y personajes son una
representación conceptual. Muestra discretamente la leyenda **«Representación
de tu configuración»**. Una aula ilustrada no genera partidas de construcción,
mobiliario ni infraestructura, ni en la propuesta ni en el PDF.

## Persistencia y exportación

- Recuperar: la cotización se restaura desde `localStorage` al cargar, y el
  campus debe derivarse de ese estado sin pasos intermedios. No hay enlace
  compartible ni backend.
- Exportar: `propuesta-pdf.js` admite imágenes JPEG (`pdf.addImage`). Una
  captura del campus confirmado puede sumarse sin cambiar la estructura ni los
  datos comerciales del PDF. Prueba en `pdf.test.js`.

## Sin 3D

Sin WebGL, si falla la carga, si se pierde el contexto o si la persona cierra el
campus (`gg_asesor_campus=off`), el formulario, los cálculos y la propuesta
siguen completos. La alternativa estática debe resumir lo mismo que la escena.
