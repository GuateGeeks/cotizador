# Fichas técnicas · Construcción papercraft · R1

## 1. Cómo leer estas fichas

Este documento define una **propuesta de construcción para implementar**. Los presupuestos son cuentas de una topología prevista, no recuentos de modelos reconstruidos a partir de los PNG.

| Tipo de información | Autoridad y límite |
|---|---|
| PNG conceptual | Dirección visual: silueta, capas, material y lectura. No certifica coordenadas, caras ni patrones recortables. |
| SVG + `*.geometry.json` | Ejemplo geométrico de una pieza pequeña; el JSON contiene sus coordenadas y el despliegue matemático. La verificación solo cubre esa pieza y esas coordenadas. |
| Propuesta de personaje | Medidas, presupuesto y reglas para el generador. Deben verificarse después de integrar, escalar y posar el personaje real. |
| Restricción del proyecto | Procede del kit original de GuateGeeks: rig, presupuesto, ausencia de UV/texturas y distancia entre capas. |

Fuentes internas: README y código de `kit-personajes-r1`; especificación del informe **GuateGeeks · Personajes papercraft — Investigación aplicada y especificación de rediseño**, de 24 de octubre de 2026; y datos de los tres esquemas incluidos en este paquete. La geometría final del generador y su manifiesto deben convertirse en la evidencia de los recuentos implementados.

## 2. Contrato común

| Aspecto | Requisito |
|---|---|
| Construcción | Procedural en JavaScript, sin UV ni texturas; color por vértice. |
| Presupuesto | Máximo 280 triángulos por estudiante; 300 por docente. Contabilizar los auxiliares que el proyecto atribuya al personaje. |
| Escena | Hasta 40 personajes; comprobar rendimiento en el cotizador completo. |
| Material | Cartulina mate; `flatShading`, `roughness = 0.92`, `metalness = 0`. |
| Rig | Exactamente 12 huesos, con nombres y padres conservados. |
| Pesos | Una influencia no nula de peso 1 por vértice. Todos los vértices de un panel rígido deben usar el mismo hueso. |
| Capas superpuestas | Separación mínima 0.004 unidades de escena, medida en la normal de la superficie y después de escalar. |
| Cámara de revisión | Ortográfica, elevación aproximada de 34° desde el horizontal; frente, tres cuartos, lateral y espalda. |
| Tamaños de revisión | 40, 60, 80, 120 y 600 px CSS; capturas nativas con DPR 1 y 2. |

En la escena, Y es arriba y +Z es el frente. Cada JSON de pieza declara su sistema local. Antes de utilizarlo en el personaje, aplicar la orientación, posición y escala pertinentes. Un pliegue de construcción no añade un hueso de animación.

Si se emite geometría normalizada y luego se multiplica uniformemente por H, usar `gapLocal = 0.004 / H` para conservar la separación mínima en escena. Un desplazamiento fijo en +Z no equivale a una separación normal en superficies inclinadas. La separación no se exige entre paneles que comparten únicamente una arista.

## 3. Personaje maestro: estudiante de primaria

Referencia visual: [01-personaje-maestro.png](reference/01-personaje-maestro.png). Despiece: [02-despiece-personaje.png](reference/02-despiece-personaje.png).

**H = 0.78 unidades**, medido desde la suela hasta el punto más alto del cabello en postura de pie. La cabeza incluye el cabello; el ancho de hombros corresponde al torso, sin añadir mangas ni brazos. Los volúmenes se solapan en las articulaciones, pero las cotas por segmentos definen los puntos de referencia verticales.

| Medida propuesta | Fracción de H | Unidades de escena para H = 0.78 |
|---|---:|---:|
| Cabeza, mentón a cima del cabello | 0.280 | 0.21840 |
| Cuello | 0.018 | 0.01404 |
| Torso, cintura a base del cuello | 0.252 | 0.19656 |
| Muslo | 0.215 | 0.16770 |
| Tibia | 0.195 | 0.15210 |
| Zapato | 0.040 | 0.03120 |
| Ancho de masa principal de cabeza/pelo | 0.245 | 0.19110 |
| Ancho del torso en hombros | 0.260 | 0.20280 |
| Profundidad del torso | 0.145 | 0.11310 |

Las seis primeras fracciones suman 1. La cadera comienza en `H × (0.040 + 0.195 + 0.215) = 0.351` unidades. Esta cota ayuda a colocar silla y piernas sin estirar el personaje para alcanzar la mesa.

Puntos iniciales de brazo: superior 0.125H, antebrazo 0.105H y mano 0.045H. Ajustar alcance dentro de las poses admitidas; la manga no determina el pivote del hombro. Tolerancias propuestas para el primer control: altura ±0.5%, cabeza/H ±0.01 y hombros ±0.01H.

Uniforme: camisa blanca `#FBFAF7`, chaleco violeta `#6942A1` con V blanco, pantalón o falda marino `#33438A`, calzado oscuro, cabello `#2B2340` o `#3A2E5C`, pieles cálidas de la paleta existente. La mochila de primaria conserva `#19BCCD`. El personaje de la primera lámina usa pelo corto; no es la variante más costosa.

La lámina maestra conserva orejas pequeñas y dos tirantes como detalles de identidad. Son opciones de implementación con coste propio: una propuesta mínima de 4 triángulos para el par de orejas y 4 para el par de tirantes lleva la variante de pantalón y pelo corto de 235 a **243 de planificación**, incluida la reserva. Si la construcción real necesita cierres o cantos adicionales, contar su coste real. Estos detalles no se añaden gratuitamente al caso máximo de 279.

El render puede insinuar una nariz o pulgares. El generador debe conservar el rostro plano, sin nariz saliente, y manos simplificadas dentro del presupuesto; esos microdetalles de la imagen no son requisitos geométricos.

### Extensión a niveles

| Nivel | H | Cabeza/H | Hombros/H | Mochila |
|---|---:|---:|---:|---|
| Preprimaria | 0.62 | 0.320 | 0.275 | `#F9C36A` |
| Primaria | 0.78 | 0.280 | 0.260 | `#19BCCD` |
| Básico | 0.90 | 0.255 | 0.255 | `#FF8B22` |
| Bachillerato | 0.94 | 0.245 | 0.255 | `#8DB442` |
| Docente | 0.98 | 0.225 | 0.275 | No imponer mochila; camisa `#8FD3E6`. |

Estas cotas son propuestas de perfiles. Gorra y cabello deben respetar la envolvente de altura; coletas o accesorios laterales requieren una envolvente explícita. Medir en postura de referencia, no sobre la caja de una pose sentada.

## 4. Cabello: masa principal y mechones

Referencia: [03-cabello-construccion.png](reference/03-cabello-construccion.png). Ejemplo exacto de una lámina abierta: [01-mechon-plegado.svg](esquemas/01-mechon-plegado.svg), con datos en `01-mechon-plegado.geometry.json`.

El objetivo es sustituir una tapa ancha y plana por una coronilla con relieve y un ápice discretamente desplazado. Mantener pocas masas; más triangulación sobre un plano no produce un pliegue.

| Componente del núcleo | Construcción | Triángulos previstos |
|---|---|---:|
| Banda inferior | Anillo de 8 puntos a anillo de 8 | 16 |
| Transición superior | Anillo de 8 a anillo de 4 | 12 |
| Coronilla | 4 caras hacia ápice desplazado | 4 |
| Núcleo | Suma | 32 |

Con `hCabeza` como altura mentón–cima: línea frontal 0.58–0.64, anillo ancho 0.70–0.78, puntos superiores 0.87–0.92 y ápice 1.00. Estas son coordenadas normalizadas iniciales respecto a la cabeza. El ápice puede desplazarse lateralmente 0.05–0.10 `hCabeza`, sin elevar H. La anchura del anillo principal puede superar la cara en 4–8%.

### Mechón plegado

Un mechón abierto se compone de `A–M–T` y `M–B–T`: dos triángulos con una cresta M que sale del plano de referencia. Su borde de unión es la polilínea **A–M–B**, no el segmento recto A–B. En la propuesta de dos triángulos, la base se oculta bajo la banda del cabello. Integrarla en el núcleo mediante retriangulación puede añadir caras y exige recalcular el coste.

El ejemplo JSON demuestra una lámina plegada, no un volumen cerrado. Si una pose expone su reverso y se necesitan contracara o canto, contabilizarlos. No duplicar caras exactamente coincidentes con winding invertido.

### Variantes excluyentes

| Variante | Cuenta propuesta | Total |
|---|---|---:|
| Corto | Núcleo 32 + cuatro mechones frontales × 2 + dos sienes × 2 + dos de nuca × 2 | 48 |
| Cola | Corto 48 + bipirámide cuadrangular 8 | 56 |
| Coletas | Corto 48 + dos bipirámides triangulares × 6 | 60 |
| Melena | Núcleo 32 + tres mechones frontales × 2 + manto 22 | 60 |
| Gorra y pelo visible | Franja inferior 16 + casquete 16 + visera 10 + flequillo 4 + nuca 2 | 48 |
| Gorra con coletas | Variante anterior 48 + dos coletas × 6 | 60 |

El manto 22 contempla exterior 6, interior desplazado 6, cantos inferiores 6 y laterales 4; arriba queda oculto. La visera 10 contempla arriba 2, abajo 2 y frente/laterales 6; raíz oculta. La gorra reemplaza el núcleo completo del pelo.

Asignación: todas las piezas siguen a `head`. Usar semillas estables y variaciones acotadas, sin alterar topología ni coste de la variante. Mantener los ojos visibles desde la cámara elevada. No fijar peinado, falda o tono de piel a una identidad de género.

## 5. Mangas: sección amplia y caída

Referencia: [04-mangas-construccion.png](reference/04-mangas-construccion.png). Ejemplo exacto: [02-manga-desplegada.svg](esquemas/02-manga-desplegada.svg), con datos en `02-manga-desplegada.geometry.json`.

Cada manga usa **dos secciones rectangulares de anchura no nula**, conectadas por cuatro paneles laterales. La sección del hombro entra bajo el torso; la inferior rodea el brazo. La boca superior no se colapsa en una arista, porque eso produce la hombrera triangular que se quiere corregir.

| Parámetro inicial del personaje | Propuesta |
|---|---|
| Ancho superior | 0.060–0.070H |
| Ancho inferior | 0.070–0.075H |
| Profundidad superior / inferior | 0.060H / 0.070H |
| Longitud | 0.075H |
| Coste por manga | 4 cuadriláteros × 2 = 8 triángulos |
| Coste del par | 16 triángulos |

Los extremos permanecen abiertos únicamente si los cubren torso y brazo en todas las poses admitidas. Si una abertura queda expuesta, corregir posición/solape o presupuestar un cierre. La lámina desplegada representa la superficie lateral; no incluye tapas.

Asignación: manga izquierda a `armL`, derecha a `armR`. Los cuatro paneles de cada manga siguen el mismo hueso. Iniciar el solape oculto en 0.015–0.025H y revisar brazos abajo, abiertos, señalando y arriba. Es un rango de partida, no una garantía de cierre para cualquier ángulo.

El pliegue visible debe proceder del cambio de planos y de la luz. Evitar una tira decorativa adicional si no mejora la lectura a 80 px o si queda fuera de presupuesto.

## 6. Falda: dos mitades con pliegues longitudinales

Referencia: [05-falda-construccion.png](reference/05-falda-construccion.png). Ejemplo exacto de una mitad: [03-media-falda-plisada.svg](esquemas/03-media-falda-plisada.svg), con datos en `03-media-falda-plisada.geometry.json`.

La propuesta tiene **dos mitades de seis paneles**, con doce triángulos por mitad y veinticuatro en total. En cada mitad, siete estaciones recorren 0° a 180° en pasos de 30°. El perfil alternado aparece tanto en cintura como en dobladillo para que los pliegues recorran la prenda.

### Corrección geométrica respecto al rango inicial del informe

Alternar radios 1 y 0.90 con intervalos de 30° no crea por sí solo un valle cóncavo: el punto intermedio aún queda por fuera de la cuerda de los puntos vecinos, cuyo radio normalizado es `cos(30°) ≈ 0.866`. El mismo argumento se conserva bajo la transformación afín que lleva el círculo a una elipse.

El esquema exacto incluido usa una alternancia **1 / 0.78** para hacer inequívocos los valles en ese ejemplo. Este valor sustituye el uso automático del rango radial 0.90–0.94 del informe anterior cuando la intención es un valle real con seis paneles por mitad. La profundidad visual definitiva debe ajustarse en el modelo y revisarse con la iluminación del cotizador. Otra solución válida puede usar una construcción de pliegue diferente y contabilizar sus caras.

Asignación: mitad izquierda a `legL` y mitad derecha a `legR`. Cada mitad permanece rígida al moverse con su muslo. Su cintura se solapa de manera oculta con el bajo del torso; el borde central necesita encaje y revisión de poses. Esta cuenta no incluye una pelvis adicional ni tapas.

Comprobar de pie, cuatro fases de caminata, sentado, tecleando y durante las transiciones. Al sentarse, las mitades deben cubrir el regazo sin abertura visible en el centro, sin exponer el interior innecesariamente y sin atravesar la mesa. El despliegue de media falda no demuestra por sí mismo que la prenda completa pueda animarse correctamente.

## 7. Cotas de los tres ejemplos geométricos

Las cotas concretas y el sistema local se leen en los archivos `*.geometry.json`. Son ejemplos de apoyo normalizados con **H = 1**. Multiplicar por 0.78 produce una primera escala para primaria, pero no resuelve su colocación, solapes ni cobertura final.

<!-- GEOMETRY_PARAMETERS_START -->
| Ejemplo y JSON fuente | Cotas exactas del ejemplo | Triángulos |
|---|---|---:|
| `01-mechon-plegado.geometry.json` | Lámina desplegada de ancho 0.050H y largo 0.080H; semipliegues de 25°. Plegado: ancho ≈0.045315H y profundidad ≈0.010565H. | 2 |
| `02-manga-desplegada.geometry.json` | Sección superior 0.066 × 0.060H; inferior 0.074 × 0.070H; longitud axial 0.075H. Ambos extremos abiertos. | 8 |
| `03-media-falda-plisada.geometry.json` | Semiejes de cintura X=0.115H y Z=0.070H; altura 0.165H; escala del perfil inferior 1.16; estaciones 0°, 30°, 60°, 90°, 120°, 150°, 180°; factores radiales 1/0.78. | 12 |

Los tres ejemplos usan X lateral, Y arriba y +Z frente. El mechón tiene su origen en M y se extiende hacia −Y con el pliegue hacia +Z; la manga nace en el centro de la abertura superior y baja hacia −Y. La media falda ocupa el lado +X de la cintura; una segunda mitad reflejada necesita corregir el winding. Ninguno incluye la transformación de montaje al personaje.

| Comprobación sobre los JSON incluidos | Resultado |
|---|---|
| Distancia intrapanel, error máximo de los tres ejemplos | 8.327e-17H, por debajo de la tolerancia 1e−10H. |
| Solape interior 2D, máximo calculado | 1.214e-17H², por debajo de la tolerancia 1e−12H². |
| Caras y bisagras | Áreas positivas, planitud y unión de extremos dentro de las tolerancias declaradas. |
| Alcance | Solo estas superficies y sus despliegues; no hay validación de un personaje completo. |
<!-- GEOMETRY_PARAMETERS_END -->

La separación de capas 0.004 se verifica en unidades finales de escena. No debe escalarse ciegamente como una proporción de H. Los JSON de superficies abiertas no incluyen el espesor de una cartulina física, pestañas de pegado ni instrucciones de impresión.

## 8. Presupuesto completo propuesto

Caso exigente: estudiante con falda, piernas con calcetas, mochila y cabello de 60 triángulos.

| Pieza | Triángulos previstos |
|---|---:|
| Cabeza visible | 20 |
| Cuello | 6 |
| Rostro: dos ojos y sonrisa | 6 |
| Cabello/gorra, variante compleja | 60 |
| Torso, V y cuello de camisa | 19 |
| Mangas cortas, par | 16 |
| Brazos superiores, par | 16 |
| Antebrazos, par | 16 |
| Manos, par | 16 |
| Falda completa | 24 |
| Muslos, par | 16 |
| Tibias y calcetas, par | 32 |
| Zapatos, par | 16 |
| Mochila, sin correas añadidas | 8 |
| **Geometría propuesta** | **271** |
| Reserva contable para auxiliares | 8 |
| **Total de planificación** | **279 / 280** |

La reserva no es una pieza y no debe emitirse como geometría. Identificar por separado malla, accesorios y auxiliares reales. No asignar automáticamente la reserva a una sombra ni atribuirle el desfase de siete triángulos observado en el kit anterior.

| Variante completa | Total de planificación, incluida reserva |
|---|---:|
| Falda y cabello complejo 60 | 279 |
| Falda y cabello corto 48 | 267 |
| Pantalón y cabello complejo 60 | 247 |
| Pantalón y cabello corto 48, base sin orejas/tirantes añadidos | 235 |
| Personaje maestro anterior + orejas 4 + tirantes 4 | 243 |
| Docente con pelo hasta 60 y cuaderno | 249 |

La versión con pantalón sustituye falda 24 + piernas/calcetas 48 por cadera 8 + segmentos de piernas 32. El docente tiene un plan propio; no se obtiene añadiendo accesorios a la variante de estudiante de 279. Correas, orejas, pulgares, cantos o tapas adicionales consumen triángulos y requieren margen explícito.

Estos totales son aritmética de diseño. El generador debe comparar el plan con los índices o caras realmente emitidos para cada combinación admitida y semilla relevante. No se ha generado un nuevo personaje 3D como parte de este paquete.

## 9. Rig y articulaciones

| Padre | Hijos |
|---|---|
| `root` | `hips` |
| `hips` | `torso`, `legL`, `legR` |
| `torso` | `head`, `armL`, `armR` |
| `armL` / `armR` | `foreL` / `foreR` |
| `legL` / `legR` | `shinL` / `shinR` |

`head`, `foreL/R` y `shinL/R` no añaden hijos. Pelo/cabeza siguen a `head`; chaleco y mochila a `torso`; mangas/brazos a `armL/R`; manos y antebrazos a `foreL/R`; muslos y medias faldas a `legL/R`; tibias y zapatos a `shinL/R`.

Asignar un peso por vértice no basta si los vértices del mismo panel pertenecen a huesos distintos. Comprobar rigidez midiendo las distancias internas del panel después de posar. Mantener cierres de brazos y antebrazos cuando el gesto expone sus extremos.

## 10. Lectura y validación de la implementación

A 80 px deben distinguirse cabeza, pelo, V blanco, postura y separación de extremidades. A 600 px se revisan juntas y capas; el aumento no justifica añadir una malla fuera de presupuesto. Evitar ruido de fibra en el plano general y variaciones arbitrarias de color por triángulo.

| Control | Evidencia que debe producir la implementación |
|---|---|
| Topología y presupuesto | Conteo real por pieza y total; todas las combinaciones admitidas cumplen el límite. |
| Geometría | Sin caras degeneradas ni duplicados coincidentes; winding y cierres visibles correctos. |
| Capas | Distancia normal ≥0.004 en superficies superpuestas designadas, después de transformar. |
| Rig | Doce nombres y jerarquía exactos; peso único; paneles rígidos. |
| Proporciones | H y medidas en postura de referencia, dentro de tolerancias acordadas. |
| Poses | Sin huecos ni penetraciones visibles en las poses admitidas y sus transiciones. |
| Bounds | Envolvente que contiene los vértices deformados de las poses soportadas. |
| Lectura | Capturas nativas a 40/60/80/120/600 px CSS, DPR 1 y 2, misma cámara y luz para comparar. |
| Determinismo | Misma semilla y perfil producen los mismos buffers; cambiar mochila no altera el rostro. |
| Rendimiento | Escena real con 40 personajes: frame time p95/p99, llamadas de dibujo y triángulos del frame completo en hardware objetivo. |

`verificaciones.json` solo informa sobre conservación de aristas, planitud, solapes 2D y cuenta de los **tres ejemplos geométricos**. No sustituye esta validación del personaje, del rig ni del cotizador. Las láminas reducen ambigüedad de construcción; la mejora de rendimiento exige implementación y medición.
