# Prompt de investigación: diseño de personajes papercraft low poly

Para usar con la investigación profunda (*deep research*) de ChatGPT. Adjunta
estas tres imágenes al enviarlo:

- `docs/papercraft/reference/07-personajes.png`
- `docs/papercraft/reference/13-acercamientos.png`
- `artifacts/paper/compare-people-o4/1-niveles.png`

---

```text
Necesito una investigación extensa y práctica para mejorar el diseño de personajes 3D
estilo papercraft (cartulina cortada y plegada) para una escena web en tiempo real.
Entrega recomendaciones accionables y cuantitativas, no generalidades.

## Contexto del proyecto
- Producto: un cotizador educativo web (GuateGeeks). Un campus escolar en 3D crece según
  la configuración; dentro hay estudiantes y docentes representativos (hasta 40 a la vez).
- Estilo objetivo: diorama papercraft. Personajes de proporción juvenil, cabeza facetada,
  rostro simple (ojos de punto y sonrisa), cabello de mechones de papel plegado. Uniforme:
  chaleco violeta con cuello en V blanco, camisa blanca de manga corta, pantalón o falda
  plisada azul marino, calceta blanca y zapato oscuro. Mochila con el color del nivel.
  Docente con camisa turquesa clara de manga larga, chaleco y corbata. Preprimaria con
  gorra amarilla con visera. Las imágenes adjuntas son la referencia (07: vistas
  giratorias por nivel; 13: acercamientos) y la implementación actual (abajo en la
  comparación).

## Restricciones técnicas (no negociables)
- Three.js r186 (WebGL2), cámara ORTOGRÁFICA elevada en tres cuartos (pitch ≈ 34°),
  personajes de 0.6–1.0 unidades de alto vistos normalmente a 40–120 px de alto en
  pantalla, y en acercamiento hasta ~600 px.
- Geometría PROCEDURAL generada en JavaScript (sin GLB, sin texturas, sin UV): triángulos
  con color por vértice, sombreado plano (flat shading), material mate
  (MeshStandardMaterial roughness 0.92, metalness 0) con una fibra procedural sutil.
- Presupuesto: ≤ 280 triángulos por estudiante, ≤ 300 por docente (40 personajes ≈ 11 k).
- Rig: 12 huesos fijos (root, hips, torso, head, armL/R, foreL/R, legL/R, shinL/R),
  skinning RÍGIDO de una sola influencia por vértice (cada pieza sigue a un hueso; no hay
  pesos mezclados). Las poses rotan esos huesos (caminar, sentarse, teclear, señalar).
- Sin caras coplanares superpuestas (z-fighting): las capas se separan ≥ 0.004 a lo
  largo de su normal.
- Paleta cerrada (violeta #6942A1, azul marino #33438A, blanco #FBFAF7, turquesa claro
  #8FD3E6, pieles cálidas variadas, cabello violeta oscuro #2B2340/#3A2E5C).

## Problemas actuales (ver la comparación adjunta)
1. La coronilla del cabello se lee plana, como boina o gorra, en vista frontal elevada.
2. Proporciones: personajes más altos y delgados que la referencia (que es más
   rechoncha, con cabeza ≈ 0.28 de la altura en primaria).
3. Mangas cortas que de frente se leen como hombreras en punta.
4. Falda que de frente se lee como trapecio con poco plisado.
5. Lectura general de "bloques low poly" más que de papel plegado (faltan cantos,
   pliegues y capas de cartulina que se vean a 60–120 px).

## Qué investigar y entregar
A. Referentes: artistas, juegos y estudios con personajes papercraft o low poly
   "origami/cardstock" legibles a tamaño pequeño (p. ej. Paper Mario, Tearaway, Monument
   Valley, Townscaper, Alba, Lego Builder's Journey, ilustradores de papercraft 3D) y
   qué hacen exactamente con cabeza, cabello, manos y ropa. Incluye enlaces.
B. Topología por pieza con presupuesto: para cabeza, cabello (corto, melena, coletas,
   cola), torso con chaleco, mangas, manos, piernas, falda plisada, zapatos, mochila y
   gorra con visera, propone conteos de triángulos y la forma concreta (anillos de N
   lados, número de facetas, dónde van los pliegues), sumando ≤ 280. Incluye diagramas
   o pseudocódigo de vértices cuando ayude.
C. Proporciones: tabla de alturas de cabeza, torso, piernas y anchos por nivel
   (preprimaria, primaria, secundaria, docente) que se lea como la referencia y siga
   funcionando en poses sentadas y caminando con huesos rígidos.
D. Lectura a tamaño pequeño: técnicas de silueta, contraste de valores, facetado que se
   lea con luz de arriba e izquierda, color por vértice para oclusión falsa, líneas de
   pliegue o cantos claros (ancho y contraste recomendados) sin aumentar mucho los
   triángulos, y qué detalles eliminar por debajo de 80 px.
E. Cabello papercraft: patrones de mechones plegados que eviten el efecto casco o boina
   con 40–70 triángulos, y cómo variarlos de forma determinista por semilla.
F. Rigidez: cómo ocultar las juntas de un rig de una influencia (hombros, codos,
   rodillas, cadera) con piezas solapadas, mangas que tapan la articulación, etc., sin
   caras coplanares.
G. Generación procedural: estructura de código recomendada (funciones de primitivas,
   parámetros por nivel, variación por semilla) y cómo probar automáticamente
   proporciones, presupuesto y coplanaridad.
H. Un plan priorizado: los 10 cambios de mayor impacto visual por triángulo invertido,
   cada uno con el antes/después esperado y el costo en triángulos.

Formato: secciones A–H con tablas y números concretos; cita fuentes con enlace; marca
qué recomendaciones son verificadas en fuentes y cuáles son tu criterio. Escribe en español.
```
