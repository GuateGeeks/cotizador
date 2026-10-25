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
