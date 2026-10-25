# Alumno de primaria: contrato y componentes

> Documento **generado** por `node tools/people-contract.mjs` a partir de `asesor/lab/paper/pieces-people.js`
> (`PRIMARIA_BASE`, `COMPONENTS`, `componentParams`, `planPerson`, `personLandmarks`) y de las caras que el generador
> emite de verdad. No se edita a mano: `asesor/test/people-contract.test.js` falla si el código y este archivo divergen.

Alcance: solo el alumno base de primaria (cabello corto, camisa blanca de manga corta, chaleco violeta, pantalón
azul marino, zapatos oscuros, mochila turquesa). Falda, otros peinados y otros niveles siguen con la receta v1
(geometría idéntica a `ec4d112`); la cabeza v2 se aplica a todo alumno de primaria con cabello corto, para que la ropa
no cambie la cabeza.

## Configuración reproducible

```json
{
  "id": "alumno-primaria",
  "label": "Alumno de primaria (base)",
  "level": "prim",
  "seed": "prim-base",
  "hair": "short",
  "cap": false,
  "skirt": false,
  "headset": false,
  "skin": "#F0B98A",
  "hairColor": "#3A2E5C",
  "shoe": "#2B2340"
}
```

Pose de referencia `rest` (de pie, `POSES.stand`). Las demás poses del inspector: `walk-0…3`, `sit`, `work`, `point`, `hand`, `vr`.

## Contrato global

- Ejes: Y arriba, +Z frente, X lateral (la izquierda del personaje es +X). Unidades de escena; el suelo es y = 0.
- Capas superpuestas: separación normal ≥ 0.004 (se emite 0.0045). Paneles que comparten arista no la necesitan.
- Un hueso por vértice y por panel rígido; 12 huesos (`hips`, `torso`, `head`, `armL/R`, `foreL/R`, `legL/R`, `shinL/R`) bajo la raíz.
- Presupuesto: geometría ≤ 271 (279 con la reserva de planificación de 8, que no se emite); sombra de contacto auxiliar de 7 triángulos en la capa `blob`; total ≤ 280.

| Medida | Objetivo | Medido en la geometría |
|---|---:|---:|
| Altura H (suela a cima del cabello) | 0.78 | 0.78 |
| Cabeza (mentón a cima) / H | 0.28 | 0.28 |
| Ancho de hombros del torso / H | 0.26 | 0.26 |
| Largo del zapato / H | ≈ 0.145 | 0.145 |
| Punto más bajo | 0 | 0 |

### Puntos de referencia (de pie)

| Punto | y | y / H | Uso |
|---|---:|---:|---|
| sole | 0 | 0 | suela |
| ankle | 0.0312 | 0.04 | tobillo: entrada del zapato en el pantalón |
| knee | 0.1833 | 0.235 | rodilla: hueso shin |
| hip | 0.351 | 0.45 | cadera: huesos hips y leg |
| wrist | 0.3416 | 0.438 | muñeca |
| elbow | 0.4235 | 0.543 | codo: hueso fore |
| shoulder | 0.521 | 0.668 | hombro: hueso arm |
| neckBase | 0.5476 | 0.702 | base del cuello: hueso head |
| chin | 0.5616 | 0.72 | mentón |
| top | 0.78 | 1 | cima del cabello |

Hombro en x = ±0.1069; piernas en x = ±0.0446; medio ancho de hombros del torso 0.1014.

## Componentes

Total emitido: **271** de geometría + 7 de sombra = **278** (plan con reserva: 279). Mejoras tomadas por el plan: torso, sleeves, shoes, backpack.

| Componente | Papel | Huesos | Receta | Plan | Emitidos |
|---|---|---|---|---:|---:|
| `headNeck` | Cabeza y cuello | head 26 | v2 | 26 | 26 |
| `face` | Rostro | head 6 | v1 | 6 | 6 |
| `ears` | Orejas | head 4 | v1 | 4 | 4 |
| `hairMass` | Masa del cabello | head 40 | v2 | 40 | 40 |
| `fringe` | Flequillo | head 8 | v2 | 8 | 8 |
| `torsoVest` | Torso y chaleco | torso 28 | v2+ | 28 | 28 |
| `collar` | Cuello de camisa | torso 3 | v1 | 3 | 3 |
| `sleeves` | Mangas | armL 10, armR 10 | v2+ | 20 | 20 |
| `upperArms` | Brazos | armL 8, armR 8 | v1 | 16 | 16 |
| `forearmsHands` | Antebrazos y manos | foreL 16, foreR 16 | v1 | 32 | 32 |
| `pelvisTrousers` | Pelvis y pantalón | hips 8, legL 8, shinL 8, legR 8, shinR 8 | v1 | 40 | 40 |
| `shoes` | Zapatos | shinL 12, shinR 12 | v2+ | 24 | 24 |
| `backpack` | Mochila | torso 12 | v2+ | 12 | 12 |
| `straps` | Tirantes | torso 12 | v2+ | 12 | 12 |

### `headNeck` · Cabeza y cuello

- **Papel:** Volumen de la cabeza bajo el cabello y cuello corto.
- **Origen y ejes:** Origen en la base del cuello (hueso head, en y = cuello del torso); Y arriba, +Z frente.
- **Montaje:** Hueso head; el cuello nace dentro del torso.
- **Hueso(s):** head.
- **Topología:** Anillo de mentón de 4 → anillo de mejillas de 8 (12), frente y sienes hasta la línea del cabello (8), cuello prisma triangular (6). Triángulos emitidos: **26** (receta v2).
- **Solapes y encuentros:** Cuello dentro del torso y de la cabeza; la piel termina en la línea del cabello (arista compartida con el cabello al frente).
- **Revisión:** Aislado: mandíbula ancha, sin nariz. Montado: el mentón no se hunde en el cuello de la camisa.
- **Parámetros:** `jaw` [0.52, 0.7, 0.52, -0.62]; `neckRadius` 0.018; `skullW` 0.0901; `skullD` 0.0874.

### `face` · Rostro

- **Papel:** Ojos y sonrisa planos.
- **Origen y ejes:** Sobre los paneles planos de frente y mentón.
- **Montaje:** Hueso head, desplazado 0.0045 sobre la piel.
- **Hueso(s):** head.
- **Topología:** Dos ojos rectangulares (2 + 2), sonrisa en chevron (2). Triángulos emitidos: **6** (receta v1).
- **Solapes y encuentros:** Capas sobre la piel a 0.0045.
- **Revisión:** Legible a 120 px; a 80 px los ojos siguen visibles.
- **Parámetros:** `eyeV` 0.4; `eye` [0.027, 0.046]; `eyeX` 0.15; `smileV` 0.16.

### `ears` · Orejas

- **Papel:** Detalle de identidad.
- **Origen y ejes:** Panel lateral del cráneo.
- **Montaje:** Hueso head.
- **Hueso(s):** head.
- **Topología:** Dos tiendas plegadas de 2 triángulos. Triángulos emitidos: **4** (receta v1).
- **Solapes y encuentros:** Base sobre el panel lateral (aristas en el plano).
- **Revisión:** Asoman bajo el cabello de perfil.
- **Parámetros:** `reach` 0.12.

### `hairMass` · Masa del cabello

- **Papel:** Silueta del cabello: coronilla, lados, nuca.
- **Origen y ejes:** Anillos normalizados por la altura de cabeza hc desde el mentón.
- **Montaje:** Hueso head; al frente comparte la arista de la línea del cabello.
- **Hueso(s):** head.
- **Topología:** Núcleo 32: banda 8→8 (16), transición 8→4 (12), coronilla a ápice desplazado (4); patillas 2 × 2, nuca 2 × 2. Triángulos emitidos: **40** (receta v2).
- **Solapes y encuentros:** A los lados y atrás el borde inferior cuelga fuera del cráneo (no se ve el interior desde arriba).
- **Revisión:** Aislado: cúpula sin cornisa de boina. Montado: cubre sienes y nuca, deja ver la cara entre la línea del cabello y el mentón.
- **Parámetros:** `hairline` [0.52, 0.4]; `lowV` [0.52, 0.52, 0.38, 0.22, 0.18, 0.18, 0.22, 0.38]; `lowOut` [0, 0, 0.03, 0.04, 0.045, 0.045, 0.04, 0.03]; `ringV` 0.67; `ringFrontV` 0.66; `ringFrontZ` 1.16; `ringScale` 1.05; `upper` [[0, 0.64], [0.76, -0.02], [0, -0.72], [-0.76, -0.02]]; `upperV` 0.92; `apexSide` 0.07; `apexZ` -0.04; `tint` 1.15; `sideburnV` 0.3; `napeV` 0.06.

### `fringe` · Flequillo

- **Papel:** Mechones frontales con dirección.
- **Origen y ejes:** Base A–M–B en el anillo ancho, punta hacia abajo.
- **Montaje:** Hueso head.
- **Hueso(s):** head.
- **Topología:** Cuatro mechones plegados de 2 triángulos (01-mechon-plegado). Triángulos emitidos: **8** (receta v2).
- **Solapes y encuentros:** Por delante de la banda y de la frente.
- **Revisión:** Barrido a un lado; las puntas no tapan los ojos.
- **Parámetros:** `sweep` 0.07; `tipV` [0.44, 0.49, 0.45, 0.5]; `tipZ` 1.05; `crest` 1.3.

### `torsoVest` · Torso y chaleco

- **Papel:** Volumen del torso, chaleco violeta y hombros de la camisa.
- **Origen y ejes:** Origen en la cadera (hueso torso); prisma hexagonal.
- **Montaje:** Hueso torso.
- **Hueso(s):** torso.
- **Topología:** v1: banda de 6 paneles (12) y tapa (4). v2+: banda hasta el pecho (12), banda pecho→hombros con frente y espalda violeta y costados blancos (12), tapa blanca inclinada (4). Triángulos emitidos: **28** (receta v2+).
- **Solapes y encuentros:** El bajo cubre el asiento del pantalón; mangas y cuello entran por dentro.
- **Revisión:** Hombro inclinado; el borde del chaleco no se lee como repisa.
- **Parámetros:** `chestY` 0.1081; `neckX` 0.0629; `neckZ` 0.0452; `shoulderX` 0.0953; `drop` 0.0234.

### `collar` · Cuello de camisa

- **Papel:** V blanca y dos puntas de cuello.
- **Origen y ejes:** Panel frontal superior del chaleco.
- **Montaje:** Hueso torso; capas a 0.0045–0.015.
- **Hueso(s):** torso.
- **Topología:** V (1), puntas (2). Triángulos emitidos: **3** (receta v1).
- **Solapes y encuentros:** Sobre el chaleco y por encima de los tirantes.
- **Revisión:** V centrada; puntas a ambos lados del cuello.
- **Parámetros:** `halfWidth` 0.0281.

### `sleeves` · Mangas

- **Papel:** Manga corta que envuelve el brazo.
- **Origen y ejes:** Origen en el hombro (hueso armL/armR); eje −Y.
- **Montaje:** Hueso del brazo; la sección superior entra bajo el hombro.
- **Hueso(s):** armL, armR.
- **Topología:** 02-manga-desplegada: dos secciones rectangulares y cuatro paneles (8); v2+ cierra la sección superior (2). Triángulos emitidos: **20** (receta v2+).
- **Solapes y encuentros:** El brazo entra por la boca inferior; la parte interior se hunde en el torso.
- **Revisión:** Boca inferior legible; de pie y con el brazo levantado no se ve el hueco superior.
- **Parámetros:** `inset` 0.0094; `topY` 0.0156; `length` 0.0624; `top` [0.0234, 0.0211]; `bottom` [0.0281, 0.0265]; `flare` 0.0031.

### `upperArms` · Brazos

- **Papel:** Brazo superior.
- **Origen y ejes:** Hueso del brazo, eje −Y.
- **Montaje:** Dentro de la manga.
- **Hueso(s):** armL, armR.
- **Topología:** Tubo de 4 paneles (8 por brazo). Triángulos emitidos: **16** (receta v1).
- **Solapes y encuentros:** El antebrazo entra 0.0075 H por dentro.
- **Revisión:** Codo sin hueco al flexionar.
- **Parámetros:** `half` 0.0203; `length` 0.0975.

### `forearmsHands` · Antebrazos y manos

- **Papel:** Antebrazo y mano cerrada.
- **Origen y ejes:** Hueso del antebrazo, eje −Y.
- **Montaje:** Codo dentro del brazo; la mano sigue al antebrazo.
- **Hueso(s):** foreL, foreR.
- **Topología:** Antebrazo 8 + mano bipirámide de 8 por lado. Triángulos emitidos: **32** (receta v1).
- **Solapes y encuentros:** Mano más estrecha hacia el muslo.
- **Revisión:** Manos cerradas, sin pulgar.
- **Parámetros:** `length` 0.0819; `hand` 0.0351.

### `pelvisTrousers` · Pelvis y pantalón

- **Papel:** Asiento, muslos y tibias del pantalón.
- **Origen y ejes:** Asiento en la cadera; muslo y tibia en sus huesos.
- **Montaje:** Asiento bajo el chaleco; la tibia nace dentro del muslo.
- **Hueso(s):** hips, legL, legR, shinL, shinR.
- **Topología:** Asiento 8, muslo 8 × 2, tibia 8 × 2. Triángulos emitidos: **40** (receta v1).
- **Solapes y encuentros:** Rodilla cubierta al caminar y al sentarse.
- **Revisión:** Sin hueco en la rodilla; pantalón recto.
- **Parámetros:** `seat` [-0.0585, 0.0031]; `thighHalf` 0.039; `shinHalf` 0.0343.

### `shoes` · Zapatos

- **Papel:** Calzado compacto.
- **Origen y ejes:** Hueso de la tibia; suela en y = 0 de pie.
- **Montaje:** El tobillo entra en el pantalón.
- **Hueso(s):** shinL, shinR.
- **Topología:** v1: cuña cerrada (8). v2+: suela, talón, empeine, puntera y dos costados (12). Triángulos emitidos: **24** (receta v2+).
- **Solapes y encuentros:** Punta elevada: la suela solo toca el suelo en el talón.
- **Revisión:** Talón, empeine y puntera legibles; largo proporcional a la pierna.
- **Parámetros:** `length` 0.1131; `halfWidth` 0.0335; `toeH` 0.0234; `toeTopZ` 0.0546; `spring` 0.0062.

### `backpack` · Mochila

- **Papel:** Volumen de la mochila turquesa.
- **Origen y ejes:** Espalda del torso.
- **Montaje:** Hueso torso; la cara delantera abierta queda dentro del chaleco.
- **Hueso(s):** torso.
- **Topología:** v1: caja abierta (8). v2+: más fondo (2) y solapa (2). Triángulos emitidos: **12** (receta v2+).
- **Solapes y encuentros:** Solapa a 0.0045 de la cara trasera.
- **Revisión:** Volumen visible de espalda y de perfil.
- **Parámetros:** `depth` 0.0546; `flap` 0.45; `halfWidth` 0.073; `height` 0.1376.

### `straps` · Tirantes

- **Papel:** Recorrido de los tirantes.
- **Origen y ejes:** Paneles del chaleco.
- **Montaje:** Hueso torso, a 0.0045 del chaleco.
- **Hueso(s):** torso.
- **Topología:** v1: dos tiras en el pecho (4). v2+: pecho, hombro y espalda hasta la mochila (12). Triángulos emitidos: **12** (receta v2+).
- **Solapes y encuentros:** Por debajo de las puntas del cuello.
- **Revisión:** Pasan por encima del hombro y llegan a la mochila.
- **Parámetros:** `x` 0.0484; `w` 0.007; `chestEnd` 0.112.

## Revisar y reproducir

```bash
npm run build:inspector      # y abrir asesor/lab/inspector.html con `npm run serve` (panel «Alumno de primaria»)
npm run check:people -- artifacts/paper/<run-nuevo>
PLAYWRIGHT_MODULE=… node tools/alumno-shot.cjs artifacts/paper/<run-nuevo> --views char-front,char-side,char-back,char-34,campus --heights 600
node tools/people-contract.mjs   # regenera este documento
```

En el inspector, `inspector.showPerson({ pose, view, only: [ids] })` aísla componentes y `inspector.setWire(true)` muestra las aristas.
