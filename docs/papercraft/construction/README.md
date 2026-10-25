# GuateGeeks · Referencias de construcción papercraft · R1

Este paquete ayuda a traducir la dirección artística de los personajes de GuateGeeks a piezas sencillas de cartulina plegada. Reúne cinco láminas conceptuales, tres esquemas geométricos de apoyo y una especificación para que Claude implemente y compruebe el resultado en el generador del proyecto.

El **personaje maestro** de la primera lámina es el **modelo base de un estudiante de primaria**. «Maestro» significa referencia de diseño; no representa al docente del colegio.

## Archivos de referencia

| Archivo | Qué debe aclarar |
|---|---|
| [01-personaje-maestro.png](docs/papercraft/construction/reference/01-personaje-maestro.png) | Silueta y proporciones del estudiante base desde varias vistas. |
| [02-despiece-personaje.png](docs/papercraft/construction/reference/02-despiece-personaje.png) | Separación visual de cabeza, cabello, torso, mangas, extremidades y mochila. |
| [03-cabello-construccion.png](docs/papercraft/construction/reference/03-cabello-construccion.png) | Cómo una lámina con cresta produce mechones y una coronilla con volumen. |
| [04-mangas-construccion.png](docs/papercraft/construction/reference/04-mangas-construccion.png) | Manga de dos secciones, pliegues laterales y relación con el brazo. |
| [05-falda-construccion.png](docs/papercraft/construction/reference/05-falda-construccion.png) | Pliegues longitudinales y dos mitades que acompañan a los muslos. |

Los cinco PNG son **referencias conceptuales**. Sus detalles, líneas y proporciones orientan el diseño; no garantizan un patrón recortable, una topología exacta, un número de polígonos ni una correspondencia perfecta entre vistas.

## Archivos para implementación

| Archivo o carpeta | Uso |
|---|---|
| [GUIA-PARA-CLAUDE.md](GUIA-PARA-CLAUDE.md) | Instrucciones completas de integración y validación. |
| [FICHAS-TECNICAS.md](docs/papercraft/construction/FICHAS-TECNICAS.md) | Proporciones, construcciones propuestas, presupuestos y reglas de rig. |
| [01-mechon-plegado.svg](docs/papercraft/construction/esquemas/01-mechon-plegado.svg) | Ejemplo exacto de un mechón abierto de dos triángulos. |
| [02-manga-desplegada.svg](docs/papercraft/construction/esquemas/02-manga-desplegada.svg) | Ejemplo exacto de una manga abierta de cuatro paneles. |
| [03-media-falda-plisada.svg](docs/papercraft/construction/esquemas/03-media-falda-plisada.svg) | Ejemplo exacto de media falda de seis paneles. |
| `docs/papercraft/construction/esquemas/*.geometry.json` | Coordenadas 3D, despliegues 2D, paneles, bisagras y parámetros de cada ejemplo. |
| `docs/papercraft/construction/esquemas/verificaciones.json` | Resultados de las comprobaciones matemáticas de los tres ejemplos. |
| `PROMPTS.md` | Prompts utilizados para las cinco láminas conceptuales. |
| `MANIFIESTO.json` | Inventario, dimensiones de imágenes y hashes de integridad del paquete. |

Cada SVG también tiene un PNG de consulta con el mismo nombre. Los SVG y sus datos describen **piezas aisladas de ejemplo**: no constituyen un patrón completo del personaje ni un modelo listo para el runtime.

## Orden de uso

1. Abrir `01-personaje-maestro.png` para aprobar la silueta general.
2. Comparar la pieza dudosa con su lámina conceptual y con su esquema geométrico.
3. Leer `FICHAS-TECNICAS.md` para resolver medidas, costes y asignación a huesos.
4. Entregar `GUIA-PARA-CLAUDE.md`, esta carpeta y el código real del generador a Claude.
5. Integrar primero un estudiante de primaria, una semilla fija y cuatro vistas; después extender a ropa, edades y poses.

Cuando una imagen sugiera un detalle que excede el presupuesto, prevalece la especificación numérica. Cuando se necesita una arista o una distancia exacta de los tres ejemplos, prevalece su JSON geométrico. El texto de una lámina generada no debe usarse como una medida fiable.

## Qué mejora este paquete

La referencia desplegada hace visibles las secciones, pliegues y uniones que una imagen final deja ambiguos. Eso facilita elegir una topología y comparar la implementación con una intención de diseño concreta.

La optimización del cotizador se obtiene al implementar geometría, materiales, rig y render de manera eficiente y medirlos en el hardware objetivo. Los PNG no deben cargarse como texturas de los personajes. Este paquete no contiene modelos nuevos integrados, archivos GLB/OBJ finales ni mediciones de FPS.

## Dirección visual

Cartulina mate, facetas amplias, pliegues que cambian la silueta, uniforme violeta y marino, camisa blanca y mochila de color por nivel. La construcción debe leerse a 80 px de alto; el acercamiento sirve para revisar juntas y capas. El campus puede crecer modularmente mientras este vocabulario de personajes mantiene una identidad coherente.

Las restricciones y propuestas proceden del kit de personajes R1 y de la investigación aplicada previa de GuateGeeks. Las fichas recogen lo necesario para usar este paquete sin depender del informe anterior.
