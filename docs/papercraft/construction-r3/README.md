# Recreaciones R3 · Alumno de primaria

Las recetas de `datos/` usan el **mismo esquema** que `construction-r2/datos` y sustituyen a la receta R2 del mismo id
al importar (`node tools/r2-import.mjs`). El montaje (`assembly.json`), el rig de 12 huesos y las demás recetas siguen
siendo R2. Las coordenadas están en H (H = 0.78), +Y arriba, +Z frente, +X izquierda anatómica.

| Receta R3 | Sustituye | Triángulos R2 → R3 | Generador |
| --- | --- | --- | --- |
| `datos/P01-cabeza.json` | `construction-r2/datos/P01-cabeza.json` | 20 → **32** | `herramientas/r3_cabeza.py` |
| `datos/P06-cabello-nucleo.json` | `construction-r2/datos/P06-cabello-nucleo.json` | 32 → **46** | `herramientas/r3_cabeza.py` |

```bash
python3 docs/papercraft/construction-r3/herramientas/r3_cabeza.py          # reescribe ambos JSON e imprime las comprobaciones
python3 docs/papercraft/construction-r3/herramientas/r3_cabeza.py --check  # solo comprobaciones (código 1 si alguna falla)
node tools/r2-import.mjs                                                    # regenera el módulo de datos del runtime
```

El generador solo usa la biblioteca estándar. Las coordenadas se escriben a mano a partir del mapa de pliegues de abajo;
el script refleja la mitad +X, orienta las caras hacia fuera y mide holguras contra las instancias R2 de `assembly.json`.

## Presupuesto

El alumno base pasa de 280 a **306** triángulos de paquete (298 emitidos tras la redistribución R2 + 7 de sombra = **305**).
El límite del proyecto (280 por estudiante, geometría ≤ 273) **no cambia** y queda **excedido**: es el único fallo aceptado
de este experimento. Los alumnos de primaria con falda usan la misma cabeza R2/R3 y también lo exceden (281–299).

## P01 · Cabeza

### Mapa de pliegues leído en `imagenes/P01-cabeza.png`

| Vista | Pliegues |
| --- | --- |
| Frente | Pliegue vertical central que divide la cara en dos paneles altos; columnas estrechas de bisel a cada lado; fila de chaflán en la frente (el vértice central superior queda más alto que las esquinas) y fila de chaflán en la barbilla que estrecha hacia el cuello (el vértice central inferior queda más bajo). |
| Espalda | Mismo pliegue central; cada mitad con una diagonal; chaflanes arriba y abajo. |
| Izquierda / Derecha | Pared lateral ancha casi vertical, con una diagonal; chaflanes superior e inferior; la nuca con más facetas. Profundidad ≈ anchura. |
| Superior | Contorno octogonal casi regular (vértices delante, detrás, a los lados y en las cuatro esquinas) con pliegues radiales hacia un vértice central. |
| Inferior | Igual que la superior: abanico radial hacia el punto del mentón/cuello. |
| Tres cuartos | Frente plano, bisel lateral y chaflanes de coronilla; confirma la sección octogonal. |

### Plan de vértices y caras (18 vértices, 32 triángulos)

- Anillo superior U (8): frente (0, 0.195), esquinas frontales (±0.085, 0.168), lados (±0.113, 0.178, −0.005), esquinas traseras (±0.078, 0.172, −0.108), nuca (0, 0.186, −0.125).
- Anillo inferior L (8): frente (0, 0.028), esquinas frontales (±0.08, 0.042), lados (±0.10, 0.062, −0.008), esquinas traseras (±0.072, 0.056, −0.098), nuca (0, 0.048, −0.112).
- Coronilla T (0, 0.218, −0.02) y mentón B (0, 0, −0.01).
- Pared U–L: 8 cuadriláteros = 16 triángulos; abanico superior 8; abanico inferior 8. Cerrada (cada arista con dos caras), sin caras degeneradas ni duplicadas, bobinado exterior coherente.
- **Frente:** los vértices frontales están en `z = 0.0612 + 0.10818·y − 0.06·|x|`. En el eje coincide con el plano facial R2; cada mitad gira 3.4° hacia atrás para dibujar el pliegue central del arte. Cada mitad es plana (sus 4 vértices son coplanares).
- Color por panel: frente `#E5AD80` en ambas mitades; paredes y abanicos alternan los tonos del paquete `#E0AA7D` / `#EAB083` / `#E5AD80`.

### Sockets conservados

Los siete sockets R2 (`origin`, `mount_P03_L/R`, `mount_P04_L/R`, `mount_P05`, `mount_P06`) conservan su posición exacta;
las instancias P02–P07 de `assembly.json` no cambian y el test de montaje (`primaria-r2.test.js`) sigue comprobando su coincidencia.

### Holguras medidas (H; 0.004 escena = 0.00513 H)

| Encuentro | Medida | Requisito |
| --- | --- | --- |
| Ojos P04-L/R → cara | 0.00685 | ≥ 0.00513 (sube por el giro de 3.4° de cada mitad) |
| Sonrisa P05 → cara | 0.00513 | ≥ 0.00513 (igual que R2: está sobre el eje) |
| Tapa superior de P02 | 3/3 vértices dentro de P01 | cuello oculto en la cabeza |
| Base de orejas P03 | dentro de la pared lateral (x ≈ 0.104 en la altura de la oreja) | la oreja asoma 0.028 H |

## P06 · Núcleo del cabello

### Mapa de pliegues leído en `imagenes/P06-cabello-nucleo.png` (aclarada para ver los pliegues)

| Vista | Pliegues |
| --- | --- |
| Frente | Ápice de coronilla centrado; anillo intermedio con vértices en las esquinas frontales; **rombo** del flequillo: vértice frontal del anillo arriba, esquinas del flequillo a los lados y punta central abajo, con pliegue vertical; faceta inferior en la sien; paredes laterales casi verticales que bajan a puntas colgantes en las esquinas frontales. |
| Espalda | Ápice con pliegues radiales; vértice trasero del anillo justo bajo el ápice que abre un triángulo grande hacia las esquinas traseras; banda baja de dos paneles con pliegue central; puntas en las esquinas. |
| Izquierda / Derecha | Masa redondeada y profunda; borde inferior dentado: flequillo corto delante, patilla, muesca, mechones detrás. Las dos vistas laterales del arte están reflejadas respecto a la convención de los planos (la vista «Izquierda» muestra el flequillo a la derecha); se tratan como la misma silueta reflejada. |
| Superior | Contorno octogonal; 8 pliegues radiales desde el ápice; un anillo interior tenue; banda exterior de paredes. |
| Inferior | Abertura en U abierta hacia la cara; puntas colgantes en las esquinas frontales; pliegue en V en el centro de la nuca; pliegues laterales sobre las orejas. |
| Tres cuartos | Jerarquía coronilla → banda → paredes, flequillo saliente y patilla delante de la oreja. |

Las láminas de conjunto (`00-personaje-completo.png`, Ubicación) fijan la longitud: la patilla termina a la altura de la parte alta
de la oreja y la nuca baja hasta el cuello. La lámina aislada de P06 dibuja las puntas más largas; se usa la lectura del conjunto.

### Plan de vértices y caras (32 vértices, 46 triángulos)

- Ápice A (0, 0.28, −0.025): la cima del cabello queda en 1.0 H en raíz, como en R2.
- Anillo de coronilla C (8, y ≈ 0.245–0.255) y ecuador E (8): punta del flequillo E0 (0, 0.176, 0.12), esquinas del flequillo (±0.09, 0.19, 0.11), lados (±0.152, 0.19, −0.02), esquinas traseras (±0.118, 0.165, −0.152), nuca (0, 0.16, −0.175).
- Borde por lado (+X; −X reflejado): punta de sien Tp (0.095, 0.146, 0.102), pliegue Q (0.13, 0.168, 0.07), punta de patilla SB (0.105, 0.085, 0.055), muesca sobre la oreja N (0.138, 0.135, −0.014), mechón tras la oreja BS (0.132, 0.07, −0.08), esquina de nuca R3 (0.09, 0.035, −0.125), punta de nuca Nk (0.045, 0.022, −0.14); muesca central de nuca (0, 0.045, −0.145).
- Caras: abanico de coronilla 8; banda C→E 16 (en el frente la diagonal C0–E1 forma el rombo del flequillo); paredes 11 por lado = 22.
- Superficie abierta (abertura inferior), sin caras degeneradas ni duplicadas, bobinado coherente hacia fuera.
- Colores del paquete por panel (`#3A2E5C`, `#392D5A`, `#3B2F5E`); el runtime los recolorea al cabello del alumno, que es muy oscuro.

### Sockets conservados

`origin`, `mount_P07_L`, `mount_P07_C`, `mount_P07_R` en su posición R2. El borde del flequillo del núcleo (y = 0.176–0.19)
queda **sobre** las raíces de los tres P07 (3/3 vértices de raíz detrás del núcleo en cada mechón) y deja sus puntas visibles.

### Holguras medidas (H)

| Encuentro | Medida | Requisito |
| --- | --- | --- |
| P06 → P01 (distancia mínima triángulo–triángulo) | 0.0186 | ≥ 0.00513, sin intersección |
| Vértices de P01 por encima de 0.15 H cubiertos por P06 | todos | el núcleo encierra la cabeza |
| P06 → orejas P03-L/R | 0.0148 | sin intersección |
| P07 → P01 | ≥ 0.0111 | sin intersección |
| Ojos y sonrisa vistos de frente y desde la cámara del campus (34°) | 0 vértices tapados por P06 | cara visible |

## Verificación

- `npm test`: 114/115; el único fallo es `alumno base de primaria: presupuesto ≤ 280 (geometría ≤ 273)` con total 305, geometría 298.
- `npm run check:people`: todos los fallos son `cap`/`budget` de las combinaciones de primaria con cabello corto y el `budget` del alumno R2.
- `npm run check:paper`: los 34 fallos son `budget` (281, 291, 299, 305); `coplanar`, `degenerate`, `bones` y el resto pasan.
- Poses (caminar, sentado, trabajo, mano levantada): sin cruces nuevos de cabello. En «mano levantada» la mano atraviesa el
  cabello por encima de la cabeza igual que con el núcleo R2 (comparado con una captura R2 de la misma pose).

## Diferencias que quedan respecto al arte

- La cabeza tiene 32 triángulos: el arte redondea con más filas de chaflán y la nuca con más facetas; aquí hay una sola pared y dos abanicos.
- Ojos y sonrisa siguen en sus sockets R2: en el arte quedan más bajos en la cara y las orejas más atrás y más grandes.
- El flequillo del núcleo termina más alto que el rombo del arte para no tapar los tres P07, que aportan las puntas.
- Las patillas son más cortas que en la lámina aislada de P06 (se sigue el conjunto y Ubicación).
- El cabello del runtime es mucho más oscuro que la cartulina violeta del arte y los pliegues se leen menos.
- La vista inferior no muestra el interior: el material es de una cara y la superficie es abierta.

## P08 · Torso y chaleco

Receta: [`datos/P08-torso-chaleco.json`](datos/P08-torso-chaleco.json). Sustituye a
`construction-r2/datos/P08-torso-chaleco.json`, que era un prisma octagonal de 22 triángulos.
La referencia es la lámina `construction-r2/imagenes/P08-torso-chaleco.png`, comparada vista
por vista y contrastada con `00-personaje-completo.png`, `21-montaje-explotado.png` y las
láminas P09, P10, P11, P19 y P20.

### Mapa de pliegues leído en la lámina

| Vista | Pliegues y aristas visibles |
| --- | --- |
| Frente | Pliegue central vertical desde el bajo hasta el fondo de la V. Escote en V que baja hasta cerca del 30 % de la altura. Las aristas de la V llegan a los puntos de cuello, a ±0.056 H. Arriba hay una franja clara de hombro que baja hacia fuera (unos 19°) y un bisel pequeño bajo ella. El borde exterior del panel delantero es vertical y forma el canto delantero de la sisa. La sisa se ve oscura entre ese borde y la silueta. Bajo la sisa aparece un bisel lateral oscuro hasta el bajo. El bajo es recto, con esquinas achaflanadas. |
| Espalda | Pliegue central vertical completo. El borde superior del cuello es casi recto, con una leve depresión central. En las esquinas superiores hay biseles de hombro que bajan hacia la sisa, y biseles laterales bajo la sisa. |
| Izquierda / Derecha | La sisa es grande, tiene forma hexagonal y ocupa la parte alta del costado. Su canto delantero es el borde del panel delantero, y bajo ella acaba en punta. Desde esa punta salen dos pliegues en abanico hasta el bajo y dejan un triángulo central. La silueta se estrecha mucho hacia el hombro. |
| Superior | El cuello abierto y oscuro va del borde trasero a la V. Los hombros son facetas claras casi cuadradas. A los lados se ven las sisas como ranuras, y los paneles delanteros caen hacia el bajo. |
| Inferior | El bajo es un polígono de unos diez lados: el frente y la espalda tienen un pliegue central y las esquinas, chaflanes pequeños. El interior se ve oscuro. |
| Tres cuartos | Hay un pliegue horizontal suave entre el fondo de la V y el canto de la sisa: la solapa queda arriba. La sisa es un hueco profundo, con el bisel claro del hombro encima. |

### Plan de vértices y caras

Hay 24 vértices, simétricos en X (+X es la izquierda anatómica). Las coordenadas son locales en
H, con el origen en la pelvis:

| Vértice | Posición (lado +X) | Papel |
| --- | --- | --- |
| F0 | (0, −0.010, 0.085) | Bajo delantero, en el pliegue central |
| Vb | (0, 0.162, 0.079) | Fondo de la V |
| B0 | (0, −0.010, −0.074) | Bajo trasero, en el pliegue central |
| Bn | (0, 0.262, −0.082) | Centro del cuello trasero |
| Fc | (±0.108, −0.010, 0.0795) | Esquina delantera del bajo |
| Hf / Hb | (±0.132, −0.010, 0.055 / −0.062) | Chaflanes laterales del bajo, el punto más ancho |
| Bc | (±0.108, −0.010, −0.0697) | Esquina trasera del bajo |
| Af / Ab | (±0.099, 0.183, 0.0732 / −0.0757) | Cantos delantero y trasero de la sisa, en el plano del panel |
| A | (±0.118, 0.125, 0) | Fondo de la sisa, de donde sale el abanico |
| S | (±0.115, 0.240, −0.004) | Punta del hombro, dentro de la boca de la manga |
| Nf / Nb | (±0.056, 0.268 / 0.264, 0.060 / −0.0798) | Puntos de cuello, delante y detrás |

Caras por lado (14):
- panel delantero bajo plano, F0–Fc–Af–Vb (2);
- solapa Vb–Af–Nf (1);
- bisel delantero del hombro Nf–Af–S (1);
- franja superior del hombro Nf–S–Nb (1);
- bisel trasero Nb–S–Ab (1);
- panel trasero plano, B0–Bc–Ab–Nb–Bn (3);
- costado (5): faceta delantera Fc–Hf–Af y Hf–A–Af, triángulo central Hf–Hb–A, faceta trasera Hb–Bc–Ab y Hb–Ab–A;
- sisa (2).

La sisa se cierra con un **valle oscuro** plegado por Af–Ab, con las caras S–Af–Ab y Af–A–Ab
mirando hacia fuera. Se lee como un hueco y no deja ver a través de la pieza desde ningún
ángulo. Los forros planos interiores sí dejaban ver el fondo en las vistas superior y de
tres cuartos.

Centro (4): la tapa interior oscura del escote, Vb–Nf–Nb, Vb–Nb–Bn y sus simétricas. Desde el
frente rellena la V por detrás de la pechera. Desde arriba se ve como el cuello abierto.

Los paneles delantero y trasero son planos por construcción: Af, Ab y Nb están sobre sus
planos. El lado +X lleva un tinte 3 % más claro y el −X un 3 % más oscuro. Con un ángulo de
pliegue pequeño, ese tinte hace visibles los pliegues centrales sin añadir caras. Todos los
colores pertenecen a la familia `#6942A1`, de modo que el recoloreado del chaleco conserva
los matices.

### Triángulos

- **P08: 36** (R2: 22; tope del encargo: 36).
- Alumno base completo: **286** triángulos de geometría + 7 de sombra = **293** (R2: 272 + 7 = 279).
- El paquete activo suma 294 (280 + 14). Supera el límite de 280: es un experimento aceptado
  y el límite no se ha cambiado.

### Sockets

Se conservan los ocho sockets de R2 con sus coordenadas exactas: `origin`, `mount_P02`,
`mount_P09`, `mount_P10_L`, `mount_P10_R`, `mount_P11_L`, `mount_P11_R` y `mount_P19`.
`assembly.json` no cambia, y el test de montaje mantiene un error inferior a 1e-6 en
todas las instancias.

### Holguras con las piezas vecinas

Las distancias están en H. Son positivas fuera del chaleco. Se midieron en reposo con la
receta final; entre paréntesis va el valor de R2.

| Pieza | Resultado |
| --- | --- |
| P09 pechera | Queda **dentro de la muesca de la V**: ninguna cara exterior del chaleco la tapa desde el frente. Queda 0.003–0.006 por detrás del plano de las aristas de la V, como una camisa vista por el escote. La punta (y = 0.164) queda 0.002 por encima del fondo de la V. |
| P10 solapas | Se apoyan sobre la arista de la V. Donde se solapan, están ≥ 0.007 por delante del chaleco y no son paralelas a la solapa (más de 1.8°). La regla de capas (0.004 de escena) se cumple. |
| P20 tirantes | Frente: 0.0006–0.0015 abajo (R2 0.012). En la esquina superior delantera, 0.019–0.024 (R2 0.026): la solapa debe retroceder hacia el cuello para dejar sitio a P10. Puente sobre el hombro: 0.007–0.018 (R2 0.030). Caída trasera: 0.006–0.007 (R2 0.020). Ningún vértice queda dentro del chaleco. |
| P19 mochila | Cara delantera: 0.003 (R2 0.008–0.017). La espalda se inclina hacia atrás 1.7°, como la cara de la mochila (1.85°). El pliegue central trasero (2.3° por lado) mantiene las caras a más de 1.8° del paralelismo, y el manifiesto no marca ninguna capa. |
| P11 mangas | La punta del hombro S queda dentro de la boca de la manga. Las esquinas interiores inferiores de la manga quedan 0.001 fuera de la sisa. |
| P12 brazos | Holgura ≥ 0.007 con el costado y el fondo de la sisa. |
| P02 cuello | Sale por la tapa del escote, con la penetración oculta bajo la cabeza. |
| P15 pelvis | Su caja (±0.1175 × ±0.065 en y = 0.022) queda **dentro** del chaleco con un margen ≥ 0.0016. En R2 las esquinas asomaban 0.026, y se veían como muescas azul marino en el bajo. |

Los ejes no cambian. Ancho de hombros del torso: 0.264 H, dentro del objetivo de 0.26 ± 0.01.

### Diferencias que quedan

- **Perfil**: la lámina estrecha mucho el chaleco hacia el hombro, con forma de campana en las
  vistas laterales. Aquí el frente y la espalda son casi verticales porque P09, P10 y P20
  (R2, fijos) están colocados para un torso de caja: la pechera llega a z = 0.0675 en y = 0.24,
  las solapas a z ≈ 0.073–0.077 y los tirantes son verticales en z = ±0.079/−0.084. Seguir la
  lámina las dejaría flotando 0.03 H. La espalda incluso se inclina 1.7° hacia atrás para recibir
  la mochila y los tirantes.
- **Sisa**: es un valle oscuro (dos caras) y no un hueco con canto interior. En el montaje
  sobresale por delante y por detrás de la manga R2, que mide ±0.037 de fondo frente a los
  ±0.075 de la sisa. En la lámina del personaje completo, la manga llena la sisa.
- **Vista inferior**: el bajo es abierto y de una sola cara, así que desde abajo solo se ve el
  vuelo del bajo. La pelvis llena ese hueco en el montaje.
- **Hombro**: la franja superior es un triángulo que acaba en punta dentro de la manga, mientras
  que la lámina dibuja una franja casi cuadrada. En la vista trasera elevada, las puntas de las
  solapas asoman sobre el cuello trasero.
- No hay bisel interior en la solapa ni el pliegue horizontal de tres cuartos: no caben en 36
  triángulos.

### Seguimiento necesario en otras piezas

- **P11 manga**: aumentar la boca a unos ±0.06 de fondo, o desplazarla, para que llene la sisa
  como en la lámina 00.
- **P20 tirante**: inclinar hacia atrás el tramo delantero alto y bajar el puente a y ≈ 0.266,
  siguiendo la solapa y el hombro, para cerrar la holgura de 0.02 en la esquina.
- **P09/P10**: para acercarse al perfil de campana de la lámina habría que retrasarlas unos
  0.02–0.03 e inclinarlas junto con la solapa.
- **P15 pelvis**: la lámina sugiere esquinas achaflanadas. Con ellas, el bajo del chaleco
  podría usar los chaflanes más grandes del arte sin que asomen las esquinas.

### Evidencia

Las carpetas de evidencia no se versionan, porque `artifacts/` está ignorado:
`artifacts/paper/r3-torso-cmp-<n>` (láminas por pieza), `r3-torso-7v-<n>`,
`r3-torso-alumno-<n>` (alumno a 600, 120 y 80 px), `r3-torso-poses-3` (caminar, sentado,
trabajo y mano alzada), `r3-torso-manifest-1` y `r3-torso-mesh-1`.
