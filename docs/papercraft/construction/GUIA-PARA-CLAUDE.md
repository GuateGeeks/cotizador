# Guía para Claude · Implementación de personajes papercraft de GuateGeeks

Usa este paquete como referencia de construcción al trabajar sobre el generador real del cotizador. El resultado esperado es un personaje procedural que conserve la identidad del kit, mejore la lectura de cartulina plegada y cumpla las restricciones del proyecto.

## Material de entrada y precedencia

Lee `README.md` y `docs/papercraft/construction/FICHAS-TECNICAS.md`. Abre las cinco imágenes de `docs/papercraft/construction/reference/`. Para cabello, mangas y falda, consulta también los SVG y `*.geometry.json` de `docs/papercraft/construction/esquemas/`.

Las imágenes son dirección artística; no infieras de ellas medidas exactas, número de caras, rig ni patrones desplegables completos. Los JSON describen tres superficies pequeñas verificadas, no el personaje entero. Las fichas contienen propuestas numéricas que deben validarse al integrarlas. Si imagen y presupuesto entran en conflicto, conserva la intención visual con una topología que sí cumpla el presupuesto.

El archivo `01-personaje-maestro.png` muestra al estudiante base de primaria. No cambies su ropa a la de docente por interpretar «maestro» como profesión.

Conserva el rostro plano sin nariz saliente y manos simplificadas dentro del presupuesto, aunque el render sugiera nariz o pulgares; no reproduzcas esos microdetalles como geometría adicional.

En la lámina 02, los conjuntos visuales «Pantalón» y «Brazos y manos» agrupan piezas para explicar el montaje; no definen las divisiones de huesos o paneles del rig ni un patrón literal.

## 1. Reconocer el proyecto antes de editar

Localiza la entrada actual del generador, las primitivas, el builder de geometría, el material, el esqueleto, las poses, la escena y el inspector. En el kit original aparecen `pieces-people.js`, `kit.js` y `campus-people.js`; `campus-kit.js`, `material.js` y el renderizador completo no se incluyeron en aquel kit. Busca los archivos reales en el repositorio y adapta sus rutas; no presupongas APIs por sus nombres.

Conserva la entrada pública `addPaperPerson` si sigue vigente, las opciones compatibles, las semillas y la integración del cotizador. Separa la corrección de personajes de la lógica comercial de cotización. Inspecciona las convenciones de color, normales, índices, huesos y escala antes de añadir transformaciones.

## 2. Contrato que debes mantener

| Elemento | Condición |
|---|---|
| Malla | Procedural JavaScript; sin texturas ni UV; color por vértice y sombreado plano. |
| Estudiante / docente | ≤280 / ≤300 triángulos, con criterio explícito para accesorios y auxiliares. |
| Material base | `roughness = 0.92`, `metalness = 0`, `flatShading = true`. |
| Rig | `root`, `hips`, `torso`, `head`, `armL`, `armR`, `foreL`, `foreR`, `legL`, `legR`, `shinL`, `shinR`; jerarquía de las fichas. |
| Skinning | Una influencia no nula por vértice y un mismo hueso para todos los vértices de cada panel rígido. |
| Capas | Separación normal mínima 0.004 en unidades finales de escena. |
| Referencia primaria | H = 0.78; cabeza = 0.28H; torso en hombros = 0.26H. |
| Vista de aprobación | Ortográfica elevada ≈34°; prioridad 80 px, con revisión40–120 px y acercamiento 600 px. |

No conviertas los PNG del paquete en texturas del runtime. No añadas un material o una malla independiente por mechón, panel de falda o prenda sin una razón y una medición de coste.

## 3. Implementar primero el estudiante base

Usa una semilla fija y cabello corto de 48 triángulos, pantalón y mochila. El presupuesto de planificación de esta configuración es 235, incluyendo 8 de reserva contable. La lámina maestra muestra orejas pequeñas y dos tirantes; una construcción mínima propuesta de 4 triángulos por cada par lleva el plan a 243. Cuenta sus cierres y cantos reales si necesitas más geometría. La reserva no se emite como geometría y estas opciones no caben gratuitamente en la variante máxima de 279.

Implementa estos cambios en orden:

1. Ajusta las proporciones y los puntos de referencia de primaria. Mide H real desde suela a cabello, no desde pivotes del rig. Al ensanchar el torso, desplaza hombros y objetivos de alcance de manera coherente.
2. Construye una coronilla con núcleo de 32: banda 8→8 de 16 triángulos, transición 8→4 de 12 y cierre a ápice desplazado de 4. Añade los mechones previstos hasta 48 para pelo corto. La masa superior debe tener relieve y mantener un albedo coherente.
3. Sustituye las mangas con boca superior colapsada por cuatro paneles entre dos secciones rectangulares no degeneradas. Son 8 triángulos por manga, 16 el par.
4. Mantén cabeza visible 20, cuello 6, rostro 6 y torso/V/cuello 19 según las fichas. No añadas microdetalles para compensar problemas de silueta.
5. Verifica cuatro vistas a 80/120 px y 600 px antes de propagar el diseño a todas las variantes.

El esquema del mechón puede servir para comprobar una primitiva abierta de dos caras. Su base geométrica es A–M–B. Si la ocultas bajo otra pieza, verifica el solape y la separación; si la integras al núcleo, cuenta la retriangulación. Sus coordenadas son locales y normalizadas: no las copies directamente a la escena sin orientar y escalar.

## 4. Incorporar falda y variantes de pelo

Implementa la falda como dos mitades rígidas, cada una con 6 paneles y 12 triángulos. Vincula las mitades a `legL` y `legR`. No añadas una pelvis oculta fuera de presupuesto; usa el encaje del torso y la cintura previsto en la ficha.

El ejemplo geométrico emplea estaciones de 30° y alternancia radial 1/0.78. El rango 1/0.90 no produce un valle cóncavo en esta construcción: consulta la corrección matemática de las fichas. Ajusta el relieve mediante revisión visual, manteniendo paneles no degenerados y el coste de 24 total.

Añade las variantes de pelo como topologías discretas de coste conocido: corto 48, cola 56, coletas 60, melena 60, gorra con pelo 48 y gorra con coletas 60. La gorra reemplaza el núcleo que cubre; no se suma a una cabellera completa. Contracaras y cantos de melena y visera deben tener separación real y estar incluidos en el plan.

Deriva cada variación de una clave estable de semilla. Cambiar mochila no debe cambiar la forma del rostro o el pelo. Mantén ropa, peinado y tono de piel como opciones independientes compatibles con el producto.

## 5. Juntas, poses y capas

Los pliegues de cartulina son parte de la geometría; no añaden huesos. Cada panel conserva sus distancias internas al animarse. Las manos siguen al antebrazo, los zapatos a la tibia y el pelo a la cabeza.

Empieza con solapes ocultos de 0.015–0.025H en articulaciones, pero comprueba los ángulos soportados. Cerrar brazos o antebrazos es necesario si el movimiento expone sus extremos. Revisa de pie, cuatro fases de caminar, sentado, tecleando, señalando y con mano levantada; muestrea también las transiciones.

Para geometría normalizada, divide 0.004 por la escala uniforme antes de emitir el desplazamiento local, o verifica directamente después de transformar. Usa la normal unitaria correspondiente a la superficie. `polygonOffset` no sustituye la distancia geométrica. No dupliques caras coincidentes con winding opuesto.

La falda debe cubrir el regazo al sentarse y conservar el encaje central. La melena no debe atravesar hombros o mochila durante las poses admitidas. Actualiza o calcula una envolvente conservadora verificada para evitar recortes de culling en animación.

## 6. Presupuesto y arquitectura del generador

Mantén una separación explícita entre perfil/opciones, plan de coste, topología, emisión y auditoría. Nombres como `resolvePersonProfile`, `planParts`, `buildHair`, `buildSleeves`, `buildSkirt` y `auditGeometry` son sugerencias; adáptalos a la arquitectura real.

Genera un manifiesto a partir de las caras realmente emitidas: pieza, rango de índices, hueso, triángulos y accesorios. La exportación de modelos y sus fichas deben derivarse de la misma fuente para evitar recuentos contradictorios. Separa malla, sombra u otros auxiliares reales y reserva de planificación.

El caso de falda/pelo 60/mochila suma 271 triángulos de geometría propuesta, más 8 de reserva = 279. Un accesorio de 4 triángulos no cabe automáticamente en ese caso. Debe sustituir otra pieza, usar una variante económica o quedar fuera de la combinación admitida.

Comparte material cuando el pipeline lo permita. Mantén el color de nivel en la mochila y usa la paleta de las fichas. Comprueba si el builder ya convierte sRGB a lineal antes de añadir una conversión; evita duplicarla. Reduce la gran mancha clara del pelo y deja que la iluminación revele las facetas.

## 7. Validación necesaria

| Control | Qué entregar |
|---|---|
| Coste | Tabla del plan frente al conteo real por pieza y todas las combinaciones admitidas. |
| Malla | Atributos finitos y compatibles, caras de área positiva, sin duplicados coplanares, winding coherente. |
| Rig | 12 huesos exactos, padres correctos, peso único y rigidez de paneles comprobada. |
| Proporciones/capas | Medidas finales de H, cabeza, hombros y distancia normal tras escalar. |
| Poses | Capturas comparables de frente, tres cuartos, lateral y espalda; revisión de juntas y bounds. |
| Lectura | Capturas nativas a 40/60/80/120/600 px CSS con DPR 1 y 2, misma luz y cámara. |
| Determinismo | Buffers reproducibles para semilla/perfil; accesorios independientes. |
| Rendimiento | 40 personajes animados en hardware objetivo: frame time p95/p99, llamadas y triángulos del frame completo; CPU/GPU cuando esté disponible. |

Automatiza las comprobaciones numéricas y la captura consistente. La aprobación de silueta y material requiere mirar las imágenes. El archivo `verificaciones.json` incluido solo valida los tres ejemplos aislados y no demuestra que la integración pase estas pruebas.

No presentes una mejora de FPS sin medirla. Un render con SwiftShader puede ayudar a comparar imágenes, pero no representa el rendimiento de un teléfono. Si faltan el renderizador o hardware objetivo, entrega los cambios verificables y explica exactamente qué medición queda pendiente.

## Entrega esperada de tu implementación

Entrega el código integrado en el proyecto, un resumen de las decisiones, el manifiesto de conteos reales, los resultados de las comprobaciones y las capturas comparativas. Distingue lo implementado, lo comprobado automáticamente, lo revisado visualmente y lo pendiente. Conserva el paquete de referencia como documentación de diseño, sin añadirlo al bundle de producción salvo que exista un uso deliberado fuera del personaje.
