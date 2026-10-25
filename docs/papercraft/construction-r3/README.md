# Recreaciones R3 del alumno de primaria

Las recetas de `datos/Pxx-*.json` usan **el mismo esquema** que `construction-r2/datos` y
sustituyen a la receta R2 con el mismo id al importar (`node tools/r2-import.mjs`). Todo lo
demás (las otras recetas, `assembly.json`, el rig y los sockets) sigue siendo R2. El módulo
generado registra cada sustitución en `PROVENANCE.r3` (archivo, receta reemplazada y
triángulos antes y después). Así los tests comprueban que el paquete R2 sigue sumando 280
y que el total activo es 280 más el cambio declarado.

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
