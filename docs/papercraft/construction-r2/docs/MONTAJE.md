# Montaje del alumno · Primaria R2

Esta guía describe cómo reproducir las piezas de apoyo y unirlas dentro de un personaje articulado. Empieza con [la vista completa](../imagenes/00-personaje-completo.png), [el despiece](../imagenes/21-montaje-explotado.png) y [assembly.json](../datos/assembly.json).

Para comprobar el resultado numérico, abre [el personaje montado técnico](../planos/00-personaje-montado.png) y [el despiece técnico](../planos/21-despiece-montaje.png). Estas dos láminas se derivan del montaje y permiten distinguir las decisiones geométricas de la ilustración artística.

## 1. Preparar una única base de coordenadas

Trabaja primero con H = 1. Los vértices de cada pieza son locales; las posiciones de sus instancias están en la raíz de reposo. +Y es arriba, +Z frente y +X izquierda anatómica. El suelo es Y = 0.

Aplica H = 0.78 una sola vez al conjunto, o convierte de manera coherente tanto geometría como posiciones de huesos a unidades finales. No multipliques dos veces por H. Conserva la raíz de reposo como referencia para todas las piezas.

## 2. Transformación exacta de cada instancia

Para vectores columna, el montaje usa:

```text
D = diagonal(scale_x × signo_reflejo, scale_y, scale_z, 1)
signo_reflejo = -1 si mirror_x es true; +1 en otro caso
M_instancia = T(position_H) × Rz(rz) × Ry(ry) × Rx(rx) × D
v_raiz_H = M_instancia × v_pieza
v_escena = H × v_raiz_H
```

Las rotaciones `rotation_deg_xyz` se almacenan en grados. Se aplica primero la escala/reflexión local, luego X, Y y Z, y al final la traslación. No asumir que cualquier orden Euler de una librería produce esa misma composición.

Una reflexión cambia el signo del determinante. Si el builder no lo resuelve, invertir una vez el orden de vértices de cada triángulo reflejado al emitirlo y comprobar normales exteriores. No aplicar una segunda corrección. Para normales previamente almacenadas con escala no uniforme, usar la transformación normal correcta o recalcularlas a partir de los vértices transformados según el pipeline.

Las escalas y posiciones son datos de montaje. Un lado derecho no se obtiene simplemente desplazando una copia de la pieza izquierda si `mirror_x` o la rotación difieren.

El campo `mount` declara una relación geométrica de encaje: instancia padre, socket de la pieza y socket en el padre. Llevar ambos puntos a raíz con sus transformaciones para comprobar la coincidencia. Los sockets con `instance_scope` se interpretan en esa instancia concreta. Un punto de encaje no determina por sí solo la orientación; la matriz de la instancia sigue siendo necesaria.

La relación de montaje y la jerarquía de huesos cumplen funciones diferentes. No convertir automáticamente `parent_instance_id` en una jerarquía de objetos animados: las piezas pueden emitirse directamente al mismo builder y seguir al hueso declarado. Anidar transformaciones de reposo ya absolutas provocaría posiciones dobles.

## 3. Preparar el rig

| Hueso | Padre | Pivote en raíz de reposo / H |
| --- | --- | --- |
| root | — | (0, 0, 0) |
| hips | root | (0, 0.45, 0) |
| torso | hips | (0, 0.45, 0) |
| head | torso | (0, 0.7, 0) |
| armL | torso | (0.148, 0.68, 0) |
| armR | torso | (-0.148, 0.68, 0) |
| foreL | armL | (0.148, 0.555, 0) |
| foreR | armR | (-0.148, 0.555, 0) |
| legL | hips | (0.058, 0.45, 0) |
| legR | hips | (-0.058, 0.45, 0) |
| shinL | legL | (0.058, 0.255, 0) |
| shinR | legR | (-0.058, 0.255, 0) |

Las posiciones de la tabla son absolutas en raíz, no relativas al padre. Si el esqueleto usa transformaciones locales, derivarlas a partir de las matrices de reposo padre/hijo. En un rig de reposo solo trasladado, el desplazamiento local equivale a pivote hijo menos pivote padre.

Conservar los nombres, padres y significado de los doce huesos. Cada instancia declara el hueso responsable; todos los vértices de cada panel rígido deben tener una sola influencia no nula, de peso 1, hacia ese hueso.

## 4. Emitir piezas en el espacio que espera el builder

Existen dos entradas habituales. Verifica cuál usa el proyecto real:

| Entrada del builder | Conversión necesaria |
| --- | --- |
| Vértices en raíz de reposo | Emitir `M_instancia × v_pieza` y asociar el hueso declarado mediante el contrato de bind real. |
| Vértices locales al hueso | Emitir `inverse(B_hueso_reposo) × M_instancia × v_pieza`, donde B es la matriz global de ese hueso en reposo. |

Esta distinción evita trasladar el componente dos veces. El tipo de coordenadas del builder no puede deducirse solo del nombre `bone()` o `addPaperPerson`; hay que revisar su implementación. Los índices del esqueleto pueden estar prefijados por entidad en el cotizador: conserva la correspondencia entre el nombre semántico y el índice real.

## 5. Orden de armado visual

### Paso A · Estructura de apoyo

Construye el rig y coloca pelvis, muslos, pantorrillas y zapatos. Confirma el suelo y las cotas de cadera y rodilla. Deja visible el eje frontal para evitar zapatos invertidos.

El pantalón usa piezas distintas para pelvis y segmentos articulados. En reposo deben verse como una prenda continua; al animar, cada segmento mantiene su forma rígida. Revisa la separación entre piernas desde frente y tres cuartos.

### Paso B · Volumen del uniforme

Añade el torso con chaleco. Comprueba su ancho de hombros y profundidad de perfil. El bajo se encuentra con la pelvis; no sumes las alturas de ambas cajas como segmentos sin solape.

Monta pechera y las dos hojas del cuello. Define el orden de capas desde el soporte del chaleco hacia fuera. Las separaciones se comprueban normales al soporte y en unidades finales. La zona blanca debe leerse como camisa dentro del escote.

### Paso C · Brazos y manos

Añade brazos superiores, antebrazos y manos, siguiendo sus huesos. Después monta las mangas alrededor del hombro y del brazo. Revisa primero un lado con sus pivotes visibles y replica mediante las transformaciones declaradas.

Las mangas tienen volumen en ambas secciones. El brazo debe quedar cubierto donde corresponde, sin una abertura visible al flexionar o levantar. Las manos comparten el hueso del antebrazo; en este alcance no se incorpora una articulación de muñeca.

### Paso D · Cabeza y expresión

Coloca cuello y cabeza. Confirma la cota de mentón y el eje frontal. Añade orejas, ojos y sonrisa como instancias separadas. El par de ojos conserva simetría de colocación y la sonrisa permanece centrada.

Los apliques del rostro son superficies planas. Una vista de canto casi sin área proyectada es correcta. Su relieve visual procede de la separación controlada y de la iluminación; no convertirlos en botones gruesos para hacerlos visibles en todas las vistas.

### Paso E · Cabello

Coloca el núcleo y verifica el punto más alto. Añade los tres mechones usando sus transformaciones exactas. La raíz de los mechones queda integrada visualmente bajo el núcleo, y sus puntas respetan la zona de ojos.

Revisa frente, perfil, espalda, superior y cámara elevada. No añadir aleatoriedad a la forma base antes de aprobar su silueta. Las regiones del cabello comparten el hueso head.

### Paso F · Mochila y tirantes

Monta la mochila en la espalda, hacia −Z, y los tirantes sobre hombros y pecho. Comprueba su recorrido desde los lados y la parte superior. Las correas siguen al torso, aunque una mano las toque en una pose de presentación.

La geometría de apoyo incluye el cuerpo simple de la mochila. Los bolsillos o costuras que pudiera sugerir el arte son opcionales y consumen coste propio al representarlos con geometría.

### Paso G · Revisión conjunta

Oculta los ejes y el wireframe. Revisa el personaje con el material común y a los tamaños reales del campus. Compara una pose neutral antes de añadir una pose con manos sobre los tirantes, porque esa pose puede ocultar uniones deficientes.

La guía explotada separa piezas para explicar el armado; las distancias de separación de esa ilustración no son medidas de montaje. Siempre usar `assembly.json` para las posiciones reales.

## 6. Inventario de instancias

| Orden declarado | Instancia | Receta | Hueso | Padre de montaje |
| --- | --- | --- | --- | --- |
| 1 | P15 | P15-pelvis-pantalon | hips | Raíz |
| 2 | P08 | P08-torso-chaleco | torso | P15 |
| 3 | P02 | P02-cuello | head | P08 |
| 4 | P01 | P01-cabeza | head | P02 |
| 5 | P03-L | P03-oreja | head | P01 |
| 5 | P03-R | P03-oreja | head | P01 |
| 6 | P04-L | P04-ojo | head | P01 |
| 6 | P04-R | P04-ojo | head | P01 |
| 7 | P05 | P05-sonrisa | head | P01 |
| 8 | P06 | P06-cabello-nucleo | head | P01 |
| 9 | P07-C | P07-mechon-flequillo | head | P06 |
| 9 | P07-L | P07-mechon-flequillo | head | P06 |
| 9 | P07-R | P07-mechon-flequillo | head | P06 |
| 10 | P09 | P09-pechera-camisa | torso | P08 |
| 11 | P10-L | P10-solapa-cuello | torso | P08 |
| 11 | P10-R | P10-solapa-cuello | torso | P08 |
| 12 | P11-L | P11-manga | armL | P08 |
| 12 | P11-R | P11-manga | armR | P08 |
| 13 | P12-L | P12-brazo | armL | P11-L |
| 13 | P12-R | P12-brazo | armR | P11-R |
| 14 | P13-L | P13-antebrazo | foreL | P12-L |
| 14 | P13-R | P13-antebrazo | foreR | P12-R |
| 15 | P14-L | P14-mano | foreL | P13-L |
| 15 | P14-R | P14-mano | foreR | P13-R |
| 16 | P16-L | P16-muslo-pantalon | legL | P15 |
| 16 | P16-R | P16-muslo-pantalon | legR | P15 |
| 17 | P17-L | P17-pantorrilla-pantalon | shinL | P16-L |
| 17 | P17-R | P17-pantorrilla-pantalon | shinR | P16-R |
| 18 | P18-L | P18-zapato | shinL | P17-L |
| 18 | P18-R | P18-zapato | shinR | P17-R |
| 19 | P19 | P19-mochila | torso | P08 |
| 20 | P20-L | P20-tirante | torso | P19 |
| 20 | P20-R | P20-tirante | torso | P19 |

Este montaje contiene 33 instancias y 280 triángulos. La clasificación por pieza y el aporte de cada familia se encuentran en el [README](../README.md). Si el orden gráfico de despiece difiere del orden numérico, las transformaciones y dependencias del rig siguen siendo la autoridad.

## 7. Contactos, coberturas y poses

| Encuentro | Qué revisar |
| --- | --- |
| Cabeza–cuello–camisa | Cobertura al mirar a lados, arriba y abajo dentro del rango admitido. |
| Pelo–cabeza–orejas | Raíces cubiertas, ojos visibles y laterales sin penetración molesta. |
| Manga–torso–brazo | Aberturas cubiertas en reposo, alcance y brazo levantado. |
| Brazo–antebrazo | Encuentro del codo durante flexión y marcha. |
| Antebrazo–mano | Muñeca continua y palma orientada correctamente. |
| Torso–pelvis–muslos | Cobertura de cintura y espacio para sentarse. |
| Muslo–pantorrilla | Rodilla cubierta durante marcha y postura sentada. |
| Pantorrilla–zapato | Tobillo continuo y suela coherente con el suelo. |
| Mochila–torso–tirantes | Colocación estable en espalda y recorrido de correas. |
| Mano–tirante u objeto | Resolver mediante la pose, preservando longitud de segmentos. |

Las poses propuestas del JSON orientan la prueba; no son evidencia de que el cotizador ya las reproduzca. Evaluar también transiciones. Si una articulación expone una abertura, corregir su geometría, cobertura o rango admitido y actualizar el presupuesto.

## 8. Guardar la trazabilidad

Después de emitir la geometría, registrar por instancia: receta, hueso, rango de índices, conteo real, transformación de reposo y versión de la receta. La inspección puede aislar esos rangos sin exigir objetos permanentes de renderizado por pieza.

El montaje de apoyo es una base reproducible. El personaje integrado debe generar un informe propio para material, rig, poses, bounds, presupuesto y coste de renderizado. Consulta [QA](QA.md).
