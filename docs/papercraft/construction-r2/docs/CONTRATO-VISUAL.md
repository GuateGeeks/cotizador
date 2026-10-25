# Contrato visual y geométrico · Primaria R2

## 1. Identidad del personaje

El alumno base tiene cabello corto violeta oscuro, rostro gráfico sencillo, camisa blanca de manga corta, chaleco violeta, pantalón azul marino, zapatos oscuros y mochila turquesa. Las piezas tienen planos amplios, pliegues legibles y apariencia de cartulina mate.

La prioridad de lectura es: silueta completa; proporciones; rostro y cabello; escote y mangas; postura; mochila. La fibra o las variaciones pequeñas de color acompañan la forma. La ilustración puede sugerir una nariz, bolsillos, costuras o pulgares; esos rasgos no se convierten en geometría de producción sin decisión y recuento explícitos.

## 2. Tres tipos de evidencia

| Tipo | Autoridad |
| --- | --- |
| Arte PNG | Dirección de acabado y carácter. No medir píxeles para deducir coordenadas o escala. |
| JSON de piezas y montaje | Geometría de apoyo y ensamblaje exactos de esta entrega. Resolver con estos datos diferencias menores entre vistas ilustradas. |
| Generador integrado | Evidencia final sobre malla emitida, materiales, animación y rendimiento del cotizador. Debe producir su propio manifiesto y comprobaciones. |

Los planos SVG y PNG se derivan de los JSON y deben coincidir con ellos. Si se modifica una receta, regenerar sus planos y actualizar sus métricas antes de usarla como nueva referencia. El número de facetas dibujado por la imagen generada no es un recuento topológico.

## 3. Coordenadas, escala y lateralidad

| Concepto | Convención |
| --- | --- |
| Altura H de primaria | 0.78 unidades de escena, desde suela hasta cabello en reposo. |
| Datos de piezas | Coordenadas locales normalizadas por H. |
| Montaje | Transformaciones en el espacio raíz de reposo, también normalizadas por H. |
| Arriba | +Y. |
| Frente | +Z. |
| Izquierda anatómica | +X. |
| Derecha anatómica | −X. |
| Suelo de referencia | Y = 0. |

En una proyección frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. En los planos, «Izquierda» significa mirar al personaje desde +X y «Derecha» desde −X. La geometría de una receta canónica puede colocarse con reflexiones y escalas diferentes; el nombre de una vista no cambia el sistema de ejes.

## 4. Puntos de referencia del montaje

| Punto de referencia | Valor en H |
| --- | --- |
| sole | 0 |
| ankle_reference | 0.055 |
| knee | 0.255 |
| hip | 0.45 |
| arm_shoulder | 0.68 |
| torso_center_top | 0.7 |
| head_pivot | 0.7 |
| chin | 0.72 |
| hair_top | 1 |
| head_with_hair_height | 0.28 |
| torso_shoulder_width | 0.26 |

Los valores de la tabla se copian del montaje entregado. La posición de un pivote no equivale a un extremo visible: las piezas se solapan para cubrir encuentros. El cálculo de H se hace sobre los vértices transformados; sumar cajas locales de componentes produce una altura incorrecta.

Los objetivos artísticos de primaria son cabeza de aproximadamente 0.28H, medida desde mentón a máximo del cabello, y torso de aproximadamente 0.26H en hombros, excluyendo mangas y brazos. Los valores concretos y el resultado geométrico del montaje deben leerse en `assembly.json` y `VALIDACION-GEOMETRICA.json`.

## 5. Color y material

Paleta de referencia del proyecto: chaleco `#6942A1`, pantalón `#33438A`, camisa `#FBFAF7`, mochila de primaria `#19BCCD`, cabello violeta oscuro de la familia `#2B2340`/`#3A2E5C`. Los colores exactos por cara se leen en cada receta; la piel procede de la paleta cálida del personaje elegido.

El destino conserva color por vértice, sombreado plano y apariencia mate. El contrato anterior propone `roughness = 0.92` y `metalness = 0`. Verificar el tratamiento real de color sRGB/lineal en el builder antes de añadir conversiones. Mantener una iluminación común de inspección; evitar que un tintado fuerte por cara simule una segunda luz direccional fija.

Las superficies sin espesor —ojos, sonrisa, pechera, solapas y tirantes según receta— no necesitan convertirse automáticamente en sólidos. Si se utiliza un material de doble cara, medir su coste dentro del pipeline real y revisar el resultado. No duplicar caras exactamente coincidentes con winding opuesto.

## 6. Capas y encuentros

Una capa superpuesta designada debe conservar una separación normal de al menos 0.004 unidades finales de escena. Para datos normalizados, el equivalente es `0.004 / H` antes de escalar uniformemente. La distancia se mide normal al soporte; desplazar únicamente en Z puede ser incorrecto sobre un plano inclinado.

Esta regla no describe los bordes que se unen, ni prohíbe todos los solapes de volumen. Cuello, extremidades, raíces de pelo y encuentros de prendas pueden tener penetraciones ocultas deliberadas. Cada caso debe distinguirse de dos superficies coplanares visibles que compiten en profundidad.

Las aberturas de una manga o de una banda de pelvis son intencionales. Su cobertura en reposo no certifica la cobertura durante todas las poses. Revisar los ángulos realmente admitidos y contabilizar cualquier tapa o canto que se añada.

## 7. Coste y variantes

El montaje de apoyo suma **280 triángulos** en sus 33 instancias. La cuenta incluye todos los elementos enumerados en el inventario, también orejas, rostro y tirantes. No contiene una reserva convertida en geometría. La sombra, contornos u otros auxiliares de la aplicación deben contarse de forma explícita cuando el proyecto los atribuya al personaje.

El límite anterior del proyecto es 280 triángulos por estudiante. El margen disponible de esta geometría de apoyo es 0, antes de auxiliares adicionales. Una mejora artística puede cambiar el reparto de caras, pero exige revisar el total y la compatibilidad de las combinaciones permitidas.

Con el montaje actual de 280, no hay margen para geometría adicional. Si el límite del proyecto incluye sombra, contorno u otros auxiliares, hay que simplificar o redistribuir componentes antes de incorporarlos. La cuenta de apoyo no demuestra por sí sola que el total atribuido al personaje por el builder real cumpla el límite.

Este montaje no es un presupuesto universal para todas las edades, faldas o accesorios. Para extenderlo, definir un perfil y una combinación propios, conservando las piezas reutilizables cuando sigan cumpliendo su función.

## 8. Vista de aprobación

Revisar frente, perfil, espalda y tres cuartos con pose y luz equivalentes. Añadir la cámara elevada del campus —aproximadamente 34° desde la horizontal en el contrato previo— porque es la vista real de uso.

A 80–120 px de altura deben distinguirse cabeza, flequillo, escote blanco, postura y separación de extremidades. El acercamiento de 600 px permite revisar uniones y caras; no justifica por sí solo añadir detalle fuera del presupuesto. Las vistas de piezas aisladas se amplían para poder inspeccionarlas y no representan su escala relativa sobre la página.
