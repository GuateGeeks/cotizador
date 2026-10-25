# GuateGeeks · Alumno de primaria por piezas · R2

**Abre [INDICE.html](INDICE.html)** para explorar el kit sin conexión: buscador de piezas, selector de lámina artística/plano técnico/siete vistas individuales y acceso a fichas y JSON. Conserva la estructura de carpetas al descomprimir.

Kit de referencias y construcción para que Claude reproduzca un alumno papercraft mediante componentes sencillos, con medidas, topologías y uniones explícitas. Está pensado para el cotizador 3D de GuateGeeks.

**Contenido central: 20 recetas de piezas, 33 instancias en el alumno, 20 láminas artísticas de componentes, una lámina del personaje completo y una de montaje.** Cada pieza incluye siete vistas artísticas —frente, espalda, izquierda, derecha, superior, inferior y tres cuartos— y una celda adicional que muestra dónde se coloca.

Los planos técnicos se calculan a partir de los JSON de apoyo y presentan vistas coherentes entre sí. La geometría de apoyo del montaje suma **280 triángulos**, incluidos los componentes de rostro, orejas, mochila y tirantes. Es un conteo de los archivos entregados; no es el coste de un frame del cotizador ni una medición de FPS.

Se incluyen **140 vistas técnicas individuales** en `vistas/`, para entregar a Claude una sola perspectiva de una pieza cuando resulte útil. Cada ficha enlaza sus siete vistas individuales si están disponibles.

## Empieza aquí

1. Abre [el personaje completo](imagenes/00-personaje-completo.png) y [el montaje explotado](imagenes/21-montaje-explotado.png).
   Consulta también [el montaje técnico](planos/00-personaje-montado.png) y [el despiece técnico](planos/21-despiece-montaje.png), calculados de los JSON.
2. Lee el [contrato visual y de medidas](docs/CONTRATO-VISUAL.md).
3. Revisa las fichas de las piezas y sus planos según el inventario.
4. Sigue las [instrucciones de montaje](docs/MONTAJE.md) con [assembly.json](datos/assembly.json).
5. Entrega a Claude este paquete completo junto con acceso al repositorio real y usa [GUIA-PARA-CLAUDE.md](GUIA-PARA-CLAUDE.md).

## Qué es cada archivo

| Material | Qué resuelve | Límite |
| --- | --- | --- |
| `imagenes/` | Silueta, material, lectura y referencias de varias perspectivas. | Son ilustraciones conceptuales; no certifican medidas, conexiones exactas ni número de polígonos. |
| `planos/` | Proyecciones calculadas de cada receta canónica. | Representan la geometría de apoyo, cuyo acabado es más simple que el arte. |
| `vistas/` | Cada perspectiva técnica en un PNG independiente. | Son exportaciones de las mismas recetas, no nuevos diseños. |
| `datos/P*.json` | Vértices, caras, colores, sockets y clasificación de superficies. | No contienen el runtime ni las APIs del cotizador. |
| `datos/assembly.json` | Instancias, transformaciones, huesos y puntos de referencia del alumno. | El comportamiento en poses debe verificarse al integrarlo. |
| `herramientas/` | Reproducción y validación de los datos y planos. | Consultar su README para comandos exactos y operaciones que escriben archivos. |
| `docs/fichas/` | Descripción, lectura de vistas, montaje y aceptación de cada pieza. | Se complementan con los JSON; no sustituyen inspección visual. |

Las piezas de la receta son componentes de autoría. Pueden terminar en los buffers y materiales agrupados que ya use el cotizador; no requieren una malla ni un hueso nuevo por componente.

## Inventario

| Pieza y ficha | Instancias | Triángulos por receta | Aporte al alumno | Vistas |
| --- | --- | --- | --- | --- |
| [P01 · Cabeza](docs/fichas/P01-cabeza.md) | 1 | 20 | 20 | [Arte](imagenes/P01-cabeza.png) · [Plano](planos/P01-cabeza.png) |
| [P02 · Cuello](docs/fichas/P02-cuello.md) | 1 | 8 | 8 | [Arte](imagenes/P02-cuello.png) · [Plano](planos/P02-cuello.png) |
| [P03 · Oreja](docs/fichas/P03-oreja.md) | 2 | 4 | 8 | [Arte](imagenes/P03-oreja.png) · [Plano](planos/P03-oreja.png) |
| [P04 · Ojo](docs/fichas/P04-ojo.md) | 2 | 2 | 4 | [Arte](imagenes/P04-ojo.png) · [Plano](planos/P04-ojo.png) |
| [P05 · Sonrisa](docs/fichas/P05-sonrisa.md) | 1 | 3 | 3 | [Arte](imagenes/P05-sonrisa.png) · [Plano](planos/P05-sonrisa.png) |
| [P06 · Núcleo del cabello](docs/fichas/P06-cabello-nucleo.md) | 1 | 32 | 32 | [Arte](imagenes/P06-cabello-nucleo.png) · [Plano](planos/P06-cabello-nucleo.png) |
| [P07 · Mechón de flequillo](docs/fichas/P07-mechon-flequillo.md) | 3 | 4 | 12 | [Arte](imagenes/P07-mechon-flequillo.png) · [Plano](planos/P07-mechon-flequillo.png) |
| [P08 · Torso con chaleco](docs/fichas/P08-torso-chaleco.md) | 1 | 22 | 22 | [Arte](imagenes/P08-torso-chaleco.png) · [Plano](planos/P08-torso-chaleco.png) |
| [P09 · Pechera visible de camisa](docs/fichas/P09-pechera-camisa.md) | 1 | 1 | 1 | [Arte](imagenes/P09-pechera-camisa.png) · [Plano](planos/P09-pechera-camisa.png) |
| [P10 · Solapa del cuello de camisa](docs/fichas/P10-solapa-cuello.md) | 2 | 1 | 2 | [Arte](imagenes/P10-solapa-cuello.png) · [Plano](planos/P10-solapa-cuello.png) |
| [P11 · Manga corta](docs/fichas/P11-manga.md) | 2 | 8 | 16 | [Arte](imagenes/P11-manga.png) · [Plano](planos/P11-manga.png) |
| [P12 · Brazo superior](docs/fichas/P12-brazo.md) | 2 | 8 | 16 | [Arte](imagenes/P12-brazo.png) · [Plano](planos/P12-brazo.png) |
| [P13 · Antebrazo](docs/fichas/P13-antebrazo.md) | 2 | 8 | 16 | [Arte](imagenes/P13-antebrazo.png) · [Plano](planos/P13-antebrazo.png) |
| [P14 · Mano simplificada](docs/fichas/P14-mano.md) | 2 | 8 | 16 | [Arte](imagenes/P14-mano.png) · [Plano](planos/P14-mano.png) |
| [P15 · Pelvis del pantalón](docs/fichas/P15-pelvis-pantalon.md) | 1 | 8 | 8 | [Arte](imagenes/P15-pelvis-pantalon.png) · [Plano](planos/P15-pelvis-pantalon.png) |
| [P16 · Muslo del pantalón](docs/fichas/P16-muslo-pantalon.md) | 2 | 12 | 24 | [Arte](imagenes/P16-muslo-pantalon.png) · [Plano](planos/P16-muslo-pantalon.png) |
| [P17 · Pantorrilla del pantalón](docs/fichas/P17-pantorrilla-pantalon.md) | 2 | 12 | 24 | [Arte](imagenes/P17-pantorrilla-pantalon.png) · [Plano](planos/P17-pantorrilla-pantalon.png) |
| [P18 · Zapato](docs/fichas/P18-zapato.md) | 2 | 12 | 24 | [Arte](imagenes/P18-zapato.png) · [Plano](planos/P18-zapato.png) |
| [P19 · Mochila](docs/fichas/P19-mochila.md) | 1 | 12 | 12 | [Arte](imagenes/P19-mochila.png) · [Plano](planos/P19-mochila.png) |
| [P20 · Tirante de mochila](docs/fichas/P20-tirante.md) | 2 | 6 | 12 | [Arte](imagenes/P20-tirante.png) · [Plano](planos/P20-tirante.png) |

**Total:** 20 recetas, 33 instancias, 280 triángulos. El conjunto utiliza 11 familias duplicadas como par, 8 singulares y 1 familia de tres mechones. Las transformaciones de cada instancia se encuentran en `assembly.json`.

## Orden de lectura para Claude

- [Guía ejecutable como encargo](GUIA-PARA-CLAUDE.md).
- [Encargo reutilizable para trabajar una sola pieza](docs/ENCARGO-POR-PIEZA.md).
- [Contrato visual](docs/CONTRATO-VISUAL.md).
- [Montaje paso a paso](docs/MONTAJE.md).
- [Integración con el generador](docs/INTEGRACION.md).
- [Control de calidad y mediciones](docs/QA.md).
- [Diferencias concretas entre arte y geometría de apoyo](docs/DIFERENCIAS-ARTE-GEOMETRIA.md).
- [Fuentes y decisiones](docs/FUENTES.md).
- [Informe de validación geométrica](VALIDACION-GEOMETRICA.json).
- [Revisión de láminas artísticas](VALIDACION-VISUAL.json).

## Precedencia respecto a R1

Este paquete define una propuesta R2 específica para **primaria con pelo corto, pantalón y mochila**. Sus JSON y su montaje sustituyen para ese alumno las cuentas de planificación de R1. R1 sigue siendo una referencia histórica y de otras variantes; no se mezclan automáticamente sus presupuestos con este montaje.

La figura tiene pelo violeta oscuro, camisa blanca, chaleco violeta, pantalón marino, zapatos oscuros y mochila turquesa. El término «personaje base» describe al estudiante de primaria, no al docente. No se incluyen falda, gorra ni variantes de otras edades en el montaje R2.

## Alcance comprobable

Los datos y planos permiten reproducir las piezas de apoyo y la postura de reposo. El paquete no afirma que el cotizador haya sido modificado, que se hayan probado todas las poses, ni que se haya medido una mejora de rendimiento. La integración debe conservar el rig y la agrupación reales del proyecto y producir sus propias capturas y mediciones.

Las láminas no son patrones de impresión para fabricar un juguete físico. Los apliques planos y superficies abiertas están elegidos para una escena 3D en pantalla; no incluyen pestañas de pegado ni tolerancias de fabricación.
