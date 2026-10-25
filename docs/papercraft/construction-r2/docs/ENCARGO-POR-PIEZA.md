# Encargo reutilizable para una pieza

Usar después de leer `GUIA-PARA-CLAUDE.md` y reconocer el proyecto. Sustituir `PIEZA` por un basename del inventario, por ejemplo `P11-manga`. El objetivo es que cada modificación tenga una referencia concreta y vuelva a comprobarse en el alumno completo.

## Texto para Claude

Implementa o corrige el componente `PIEZA` del alumno de primaria papercraft en el repositorio actual.

Lee:

- `docs/fichas/PIEZA.md`.
- `imagenes/PIEZA.png`, como dirección artística.
- `planos/PIEZA.svg` o `.png`, como proyecciones de apoyo.
- Las siete imágenes de `vistas/PIEZA/`.
- `datos/PIEZA.json` y sus instancias en `datos/assembly.json`.
- `docs/MONTAJE.md` y la nota correspondiente de `docs/DIFERENCIAS-ARTE-GEOMETRIA.md`.

Antes de cambiar la forma, verifica el espacio de coordenadas, origen, dimensiones, hueso, transformaciones de instancias, sockets, superficies abiertas y conteo de caras. Conserva los contratos globales y las uniones con otras piezas.

Reproduce primero la receta numérica y comprueba que sus vistas técnicas coinciden con el resultado de tu implementación bajo proyecciones equivalentes. Después evalúa su silueta respecto al arte, usando también el personaje completo.

Si hace falta un refinamiento, prioriza mover vértices o modificar secciones manteniendo un montaje y coste verificables. Cuando cambie la topología, calcula el efecto sobre todas las instancias de esa receta y sobre el total del alumno. El montaje R2 ocupa 280 triángulos antes de auxiliares; no añadas detalles sin redistribuir el presupuesto vigente.

Mantén el builder, material compartido, rig y sistema de agrupamiento existentes. Una función de construcción independiente no exige una nueva malla, material o hueso. Conserva la identidad de la pieza y su rango de geometría en el manifiesto.

Comprueba:

1. La pieza aislada desde frente, espalda, izquierda, derecha, superior, inferior y tres cuartos.
2. La pieza montada con sus vecinas.
3. Las poses que afectan a sus encuentros.
4. La lectura del personaje a 80/120 px y el acercamiento de 600 px.
5. Geometría, orientación de caras, capas y conteo realmente emitido.

Entrega el cambio implementado, sus parámetros y conteos, capturas equivalentes antes/después y la revisión dentro del personaje. Actualiza la documentación y los planos derivados si cambiaste la receta que pasa a ser la fuente de verdad.

Avanza de forma autónoma dentro de este componente y sus ajustes de integración necesarios. Explica cualquier incompatibilidad concreta que requiera cambiar el contrato global. No declares completada la pieza únicamente porque se vea bien aislada.
