# Cómo usar el arte y la geometría de apoyo

Las láminas artísticas muestran una dirección de acabado papercraft. La geometría numérica proporciona un montaje sencillo y reproducible dentro del presupuesto. No se afirma una coincidencia exacta entre todos los contornos y detalles del render y los vértices del apoyo.

El objetivo de entregar ambos materiales es que Claude tenga una base verificable y una meta visual. Debe identificar cualquier refinamiento que cambie topología, registrar la decisión y recalcular la cuenta antes de integrarlo.

## Diferencias que requieren atención

| Pieza | Lectura correcta |
| --- | --- |
| [P01 · Cabeza](fichas/P01-cabeza.md) | La ilustración redondea frente, mejillas y mentón mediante más anillos o biseles. El apoyo de veinte triángulos es un volumen de sección hexagonal con estrechamiento y ajuste de mandíbula; no reproduce exactamente ese contorno suave. Refinar la silueta exige revisar el reparto global de caras. |
| [P02 · Cuello](fichas/P02-cuello.md) | La geometría exacta es un prisma de sección triangular. Algunas vistas artísticas pueden sugerir una sección con más lados; ese facetado adicional no forma parte de los ocho triángulos de la receta. |
| [P03 · Oreja](fichas/P03-oreja.md) | El arte puede mostrar una oreja con biseles o planos adicionales. El apoyo numérico es un tetraedro de cuatro caras; su función es dar un pequeño cambio de contorno. |
| [P04 · Ojo](fichas/P04-ojo.md) | El arte puede sugerir relieve o más facetas. El ojo numérico es un aplique plano romboide de dos triángulos. La forma ovalada del ojo en el personaje de ubicación es dirección artística, no una segunda receta. |
| [P05 · Sonrisa](fichas/P05-sonrisa.md) | La lámina puede mostrar más facetas y un borde físico. El apoyo numérico es una superficie plana de cinco vértices y tres triángulos. No se incorpora una boca volumétrica. |
| [P06 · Núcleo del cabello](fichas/P06-cabello-nucleo.md) | El arte tiene una distribución de facetas, abertura y nuca más elaboradas; el núcleo de treinta y dos triángulos es una masa esquemática de apoyo. El borde frontal ilustrado puede parecer un flequillo. En el montaje numérico, las tres instancias P07 aportan el flequillo independiente y se cuentan por separado. |
| [P07 · Mechón de flequillo](fichas/P07-mechon-flequillo.md) | El arte muestra el carácter de una lámina plegada y puede incluir más líneas de faceta. La receta exacta usa cuatro triángulos; las tres instancias se determinan por assembly.json, sin copiar un número de mechones de la miniatura de ubicación. |
| [P08 · Torso con chaleco](fichas/P08-torso-chaleco.md) | La ilustración puede incluir recortes de escote o sisas y biseles más elaborados. El apoyo es un volumen octagonal de veintidós triángulos; la parte blanca se coloca mediante P09 y P10. Cortar un escote real requiere una topología revisada y un nuevo conteo. |
| [P09 · Pechera visible de camisa](fichas/P09-pechera-camisa.md) | La lámina artística y el apoyo comparten una forma triangular plana. El pequeño espesor visual de cartulina de la ilustración es una aproximación de acabado; el JSON contiene una sola superficie triangular sin espesor. |
| [P10 · Solapa del cuello de camisa](fichas/P10-solapa-cuello.md) | El arte puede representar un borde biselado o un pliegue. El apoyo numérico es una sola superficie triangular plana por solapa. La inclinación de montaje genera su lectura como hoja del cuello; no se añaden caras a partir del relieve ilustrado. |
| [P11 · Manga corta](fichas/P11-manga.md) | La ilustración puede sugerir una sección biselada o más planos. La receta exacta tiene dos secciones rectangulares y cuatro paneles, ocho triángulos. La prioridad común es que la sección superior tenga volumen. |
| [P12 · Brazo superior](fichas/P12-brazo.md) | La ilustración puede mostrar biseles y extremos con más planos. El apoyo es un prisma de sección triangular, cerrado y de ocho triángulos; los planos derivados muestran su sección real. |
| [P13 · Antebrazo](fichas/P13-antebrazo.md) | La ilustración puede mostrar biseles y extremos con más planos. El apoyo es un prisma de sección triangular, cerrado y de ocho triángulos, colocado entre codo y mano mediante el montaje. |
| [P14 · Mano simplificada](fichas/P14-mano.md) | La lámina revisada muestra un mitón compacto, sin pulgar separado ni bloque adicional de muñeca. Sus biseles son artísticos; la receta numérica es un prisma de sección triangular cerrado, de ocho triángulos. La mano se monta en el antebrazo mediante su transformación, sin añadir dedos ni un hueso de muñeca. |
| [P15 · Pelvis del pantalón](fichas/P15-pelvis-pantalon.md) | El arte puede sugerir un contorno octagonal o biselado. La receta numérica es una banda de sección rectangular con cuatro paneles y ocho triángulos, abierta arriba y abajo. |
| [P16 · Muslo del pantalón](fichas/P16-muslo-pantalon.md) | El arte incluye biseles o planos adicionales. La receta de apoyo es un segmento de sección rectangular cerrado de doce triángulos. Su estrechamiento, longitud y montaje se leen en los datos. |
| [P17 · Pantorrilla del pantalón](fichas/P17-pantorrilla-pantalon.md) | El arte puede mostrar una abertura superior y biseles. La receta numérica está cerrada y tiene doce triángulos. La miniatura puede resaltar una región mayor de la pierna; la pieza corresponde solo al segmento de rodilla a tobillo. |
| [P18 · Zapato](fichas/P18-zapato.md) | El arte puede sugerir una abertura superior o biseles adicionales. La receta de apoyo es un volumen cerrado de doce triángulos, sin cavidad interior. Añadir esa cavidad exige redistribuir caras. |
| [P19 · Mochila](fichas/P19-mochila.md) | El cuerpo ilustrado tiene biseles más elaborados que el apoyo cerrado de doce triángulos. La receta no incluye bolsillo ni correas: estas últimas son P20 y se cuentan como instancias separadas. |
| [P20 · Tirante de mochila](fichas/P20-tirante.md) | La lámina revisada muestra una U invertida de tres tramos: frente largo sobre el pecho, puente de hombro y retorno corto hacia la mochila. Las longitudes y los dos cambios de dirección exactos se obtienen del JSON y sus planos. La receta tiene tres paneles y seis triángulos; los cantos o biseles sugeridos por el arte no añaden caras al apoyo. |

## Lámina general y miniaturas de ubicación

La lámina general y la octava celda de cada componente pueden incluir el alumno completo para comunicar identidad o localizar la pieza. Sus detalles secundarios —por ejemplo nariz, ojos ovalados, pulgar, costuras o calcetas— no se incorporan por inferencia. El montaje R2 contiene únicamente las veinte recetas enumeradas y treinta y tres instancias.

## Cómo resolver una diferencia al implementar

1. Reproducir y comprobar primero la geometría numérica con las vistas técnicas equivalentes.
2. Comparar su silueta con la intención artística en la cámara real del campus.
3. Elegir los cambios que aportan lectura: posición de vértices, cambio de sección o redistribución de caras antes de sumar detalle.
4. Registrar si el cambio conserva o sustituye una receta. Actualizar medidas, montaje, conteos y planos derivados.
5. Comprobar el personaje completo y las poses admitidas.

El montaje de apoyo suma 280 triángulos y no tiene reserva. Una forma más elaborada requiere compensar caras en otra zona o acordar un presupuesto distinto en el proyecto. Este paquete no da autorización implícita para exceder el límite vigente.

La simplificación está dirigida a una escena 3D en pantalla. Las superficies planas o abiertas no son patrones de recorte físico y no llevan pestañas de pegado. Una vista ilustrada de reverso no obliga a añadir una segunda cara coincidente en el runtime.
