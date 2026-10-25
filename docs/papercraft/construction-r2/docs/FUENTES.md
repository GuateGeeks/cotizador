# Fuentes, procedencia y decisiones

## Entradas del proyecto

Esta entrega parte de la dirección papercraft de GuateGeeks y de la comparación aportada por el usuario entre la lámina de personajes y los modelos existentes. Se mantiene el alumno de primaria como primera base de trabajo.

Documentos y código utilizados como contexto:

- Kit histórico de personajes R1: `pieces-people.js`, `kit.js`, `campus-people.js`, referencia `07-personajes.png` y modelos exportados.
- `GuateGeeks_Papercraft_Construccion_R1`: guía, fichas y ejemplos de mechón, manga y media falda.
- Investigación y auditoría anteriores de personajes: proporciones, primitivas, rig y discrepancias de conteo del exportado.
- Solicitud actual: cada pieza por separado, vistas de cada perspectiva e instrucciones de armado para Claude.

Los archivos originales del cotizador no se sustituyen con esta documentación. La entrega define recetas y un montaje nuevo de apoyo para primaria. Sus colores, medidas y topologías son decisiones de diseño del proyecto, no dimensiones de un producto comercial.

## Referencias técnicas primarias

Consultadas el 25 de octubre de 2026. Verificar la versión instalada del proyecto al integrar.

- [Three.js · BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html): atributos, índices, grupos, normales y límites geométricos. Los grupos de material pueden generar llamadas separadas.
- [Three.js · BufferGeometryUtils](https://threejs.org/docs/pages/module-BufferGeometryUtils.html): combinación de geometrías compatibles y atributos; no define por sí sola el montaje ni el rig.
- [Three.js · SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html): esqueleto, índices/pesos por vértice, bind y bounds animados.
- [Three.js · WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html): estadísticas de renderizado y memoria, y contabilización cuando existen varias pasadas.

## Decisiones propias de esta entrega

Son decisiones de diseño, no resultados de una medición de rendimiento:

- Veinte recetas para treinta y tres instancias de un alumno de primaria.
- Componentes de autoría con geometría de apoyo simple y proyecciones calculadas.
- Separación entre ilustración conceptual, datos exactos y validación de integración.
- Reutilización de recetas para pares y tres mechones.
- Conservación del rig de doce huesos y de los sistemas de agrupamiento existentes al integrar.
- Prioridad de silueta, proporción, mangas, cabello, cuello y zapatos.

El número real de triángulos se calcula desde los JSON entregados y se informa en el README y el reporte geométrico. Las imágenes generadas no se utilizan como evidencia de ese conteo. No se afirma que las piezas sean patrones imprimibles ni que se hayan probado todas las poses o dispositivos.
