# Contrato numérico · Alumno de primaria R2

Los 20 archivos `Pxx-*.json` contienen vértices y caras de **geometría de apoyo reproducible**. Las ilustraciones del paquete comunican la dirección artística. El conteo y las coordenadas de estos JSON describen exactamente esta geometría de apoyo; no son mediciones de las ilustraciones ni una implementación final en el cotizador.

## Unidades, orientación y posiciones

- Cada coordenada está normalizada respecto a la altura completa `H`.
- `assembly.json` declara `scale_to_scene = 0.78`. Aplicar esta escala **una vez** a geometría y pivotes.
- `+Y` es arriba, `+Z` es frente y `+X` es la izquierda anatómica del alumno. `L` y `R` siempre se refieren al personaje.
- Los vértices de cada pieza son locales a su origen. Este origen no tiene que ser su centro geométrico ni su punto más bajo.
- Las posiciones de las instancias y los pivotes de `rig.rest_position_root_H` se expresan en el espacio del personaje completo en reposo.

## Transformación de una instancia

Para vectores columna:

`M_part = T(position_H) · Rz · Ry · Rx · S`

`rotation_deg_xyz` contiene grados; convertir a radianes al usar una API que los necesite. Se aplica escala/reflejo, luego X, Y, Z y finalmente traslación. No asumir que una etiqueta Euler `XYZ` de cualquier motor significa esta misma composición.

`S` utiliza `scale_xyz`; si `mirror_x` es verdadero, multiplicar el componente X por −1. Si el determinante es negativo, invertir el orden de los índices de cada triángulo. Transformar normales con la inversa transpuesta y normalizarlas.

La posición final estática es:

`p_scene = W_character · S_H · M_part · p_local`

`W_character` coloca al alumno en el campus; `S_H` aplica la altura 0.78. Para un builder que ya recibe posiciones en unidades de escena, convertir antes y evitar aplicar `S_H` por segunda vez.

## Montaje y anclajes

`instances[].mount` identifica la pieza padre y su `target_socket`. Los sockets se derivan de las transformaciones de reposo. Cuando una receta se usa a izquierda y derecha, algunos sockets indican `instance_scope`: interpretar ese socket solamente en la instancia padre indicada.

El origen de cada pieza es `source_socket = origin`. Las matrices de `assembly.json` son la referencia autoritativa; los sockets explican y verifican el montaje. No aplicar las matrices y después volver a trasladar mediante los sockets: eso duplicaría la transformación.

La relación de montaje visual no reemplaza la jerarquía de huesos. Por ejemplo, una manga puede alojar el brazo mientras ambos siguen al mismo hueso.

## Rig y animación

Se conservan exactamente: `root`, `hips`, `torso`, `head`, `armL`, `armR`, `foreL`, `foreR`, `legL`, `legR`, `shinL`, `shinR`.

Para reconstruir las posiciones locales de los huesos en reposo, restar el pivote del padre al pivote del hijo cuando todas las rotaciones de reposo son identidad, como en este paquete. Si se añaden rotaciones de reposo, usar matrices completas.

Cada instancia indica un único hueso; cada vértice y cada panel de esa instancia conservan esa influencia rígida. Cabello y rostro siguen a `head`; manos a `foreL/R`; zapatos a `shinL/R`; mochila y tirantes a `torso`.

Si los vértices se compilan en espacio del personaje, aplicar el delta de hueso desde reposo:

`p_scene = W_character · S_H · B_pose_H · inverse(B_rest_H) · M_part · p_local`

Las matrices `B_pose_H` y `B_rest_H` están en el espacio del personaje y en unidades H. El constructor real puede esperar coordenadas locales al hueso; en ese caso, el punto de entrada sería `inverse(B_rest_H) · M_part · p_local`. Inspeccionar el builder vigente para evitar repetir la transformación o romper su agrupamiento.

No acumular transformaciones sobre vértices ya animados. Conservar una postura de reposo inmutable y actualizar la pose desde esa base.

## Superficies y presupuesto

La suma de las **33 instancias** es **280 triángulos**. Incluye orejas, ojos, sonrisa, pechera, solapas, mochila y tirantes. La reserva geométrica es cero. No incluye sombra ni auxiliares del inspector. Cualquier cierre o accesorio nuevo exige redistribuir el presupuesto o declarar otra variante.

- `closed`: pieza cerrada, con cada arista compartida por dos caras y volumen positivo comprobado.
- `open`: superficie con bordes intencionalmente abiertos; no se declara sólida ni imprimible.
- `planar`: aplique sin espesor. Sus vistas de canto pueden parecer una línea.

Las vistas técnicas muestran ambas caras para inspeccionar piezas abiertas o planas. Eso no duplica triángulos en los JSON y no obliga a usar `DoubleSide` en producción. Decidir el tratamiento con la cámara, las poses y el material reales.

Las capas de ojos, sonrisa, pechera y solapas tienen comprobaciones explícitas de distancia normal a sus planos de apoyo. El mínimo de diseño es 0.004 unidades finales. Las uniones que comparten borde o penetran de manera intencional —por ejemplo, raíz de oreja, cabello y articulaciones— se tratan como encuentros de construcción, no como capas decorativas paralelas.

## Qué debe conservar Claude

Usar funciones independientes para construir piezas y emitir hacia el builder existente. Conservar IDs y rangos de índices para inspección, sin convertir obligatoriamente cada pieza en una malla o material independiente. Unificar buffers no requiere soldar todos los vértices. Mantener normales de faceta, colores y asignaciones a huesos.

## Límite de la verificación

La validación comprueba los JSON reales, geometría finita, índices, áreas, winding, conteos, altura, anclajes y determinadas separaciones de planos. No certifica todas las intersecciones entre piezas, animación, comportamiento de las superficies abiertas, integración en el cotizador ni FPS.

Antes de producción, revisar las poses previstas y sus transiciones, especialmente pelvis, cuello, hombros, codos y rodillas. Los planos montados son una vista esquemática de la receta; no deben presentarse como una reproducción artística terminada.
