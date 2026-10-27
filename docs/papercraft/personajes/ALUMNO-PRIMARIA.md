# Alumno de primaria: contrato y componentes

> Documento **generado** por `node tools/people-contract.mjs` a partir de los módulos de datos Meshy y R2
> (`asesor/lab/paper/meshy/primaria-meshy-*.js` y `asesor/lab/paper/r2/primaria-r2-data.js`, generados por `node tools/meshy-import.mjs` y `node tools/r2-import.mjs`),
> de `asesor/lab/paper/r2/person-r2.js` y de las caras que el builder emite de verdad. No se edita a mano:
> `asesor/test/people-contract.test.js` falla si código, datos y documento divergen.

## Modelos del campus: Meshy

Todo alumno de primaria del campus se construye con un modelo de Meshy: el niño (pantalón) o la niña (falda y coletas), según `skirt` o, sin indicarlo, la semilla.
Lo genera `node tools/meshy-import.mjs` (un módulo por modelo en `asesor/lab/paper/meshy/`); `asesor/test/primaria-meshy.test.js` compara cada módulo con su GLB cuando está presente.
La variedad sale del perfil: piel, cabello, chaleco, mochila y zapatos. `model: 'r2'` construye el alumno del paquete R2 (sección siguiente) y las variantes v1 de cabello y falda.

### Niño (`nino`)

Fuente `docs/papercraft/reference/meshy/Meshy_AI_Papercraft_Student_1025165445_image-to-3d-texture.glb` (local; SHA256 `f7908bba0ad82fb2eb595f0e9c087f338ea9525fe248a0d1cf81eee9b4137302`): 369242 triángulos con textura 2048x2048, objetivo 264 (meshoptimizer 1.0.1).
Malla única: cortes en las articulaciones como costuras, una simplificación guiada por error y tapas en los extremos de cada segmento.
Clase de color por cara desde la textura; ojos y sonrisa como calcomanías.

| Medida | Medido en la geometría |
|---|---:|
| H (suela a cima del cabello) | 0.7798 |
| Cabeza (mentón a cima) / H | 0.3 |
| Ancho de hombros del torso / H | 0.281 |
| Punto más bajo | 0.0002 |
| Triángulos de pie (mochila) | 305 + 7 de sombra = 312 ≤ 320 |
| Triángulos sentado (sin mochila) | 310 + 7 de sombra = 317 ≤ 320 |

#### Rig

Pivotes medidos en el modelo y contrastados con UniRig (cadera y codo siguen su predicción; el hombro rígido queda en la punta del hombro).

| Hueso | Padre | Pivote raíz de reposo / H | Relativo al padre (escena) | Medido en el builder |
|---|---|---|---|---|
| hips | root | (0, 0.37, 0) | (0, 0.2886, 0) | (0, 0.2886, 0) |
| torso | hips | (0, 0.37, 0) | (0, 0, 0) | (0, 0.2886, 0) |
| head | torso | (0, 0.675, 0.006) | (0, 0.2379, 0.0048) | (0, 0.5265, 0.0048) |
| armL | torso | (0.148, 0.625, -0.011) | (0.1154, 0.1989, -0.0087) | (0.1154, 0.4875, -0.0087) |
| armR | torso | (-0.148, 0.625, -0.004) | (-0.1154, 0.1989, -0.0031) | (-0.1154, 0.4875, -0.0031) |
| foreL | armL | (0.163, 0.52, -0.005) | (0.0113, -0.0819, 0.0046) | (0.1268, 0.4056, -0.0041) |
| foreR | armR | (-0.163, 0.52, -0.001) | (-0.0114, -0.0819, 0.0027) | (-0.1268, 0.4056, -0.0005) |
| legL | hips | (0.054, 0.37, 0) | (0.042, 0, 0) | (0.042, 0.2886, 0) |
| legR | hips | (-0.054, 0.37, 0) | (-0.042, 0, 0) | (-0.042, 0.2886, 0) |
| shinL | legL | (0.054, 0.22, 0) | (0, -0.117, 0) | (0.042, 0.1716, 0) |
| shinR | legR | (-0.054, 0.22, 0) | (0, -0.117, 0) | (-0.042, 0.1716, 0) |

| Punto | H |
|---|---:|
| sole | 0 |
| ankle | 0.07 |
| knee | 0.22 |
| hip | 0.37 |
| shoulder | 0.625 |
| elbow | 0.52 |
| neckBase | 0.675 |
| chin | 0.7 |
| top | 1 |
| shoulderX | 0.148 |
| legX | 0.0539 |
| halfShoulders | 0.1416 |
| eyeY | 0.7832 |
| faceZ | 0.1045 |
| halfHead | 0.1488 |

#### Piezas por variante

| Pieza | Hueso | De pie (mochila) | Sentado |
|---|---|---:|---:|
| `M-foreR` | foreR | 12 | 14 |
| `M-shinR` | shinR | 22 | 24 |
| `M-head` | head | 58 | 53 |
| `M-armR` | armR | 8 | 10 |
| `M-bag` | torso | 42 | — |
| `M-legR` | legR | 16 | 14 |
| `M-torso` | torso | 62 | 103 |
| `M-hips` | hips | 13 | 13 |
| `M-legL` | legL | 16 | 16 |
| `M-shinL` | shinL | 20 | 24 |
| `M-armL` | armL | 11 | 14 |
| `M-foreL` | foreL | 14 | 14 |
| `M-eyeL` | head | 4 | 4 |
| `M-eyeR` | head | 4 | 4 |
| `M-smile` | head | 3 | 3 |

### Niña (`nina`)

Fuente `/mnt/c/Users/adawolfs/OneDrive/Documents/Blender/GuateGeeks/nina-primaria.blend` (local; SHA256 `197f4a9045bd3a9ed673cac369c90ff5ce6faf5ec4e11324ea48ae551b1f7191`): 940 triángulos con textura 2048x2048, objetivo 940 (undefined).
Piezas cerradas (mangas, manos, piernas, zapatos, coletas): cada pieza sigue a un hueso, la falda se divide en x = 0 y cada pieza se simplifica con un mismo error absoluto.
Clase de color por cara desde la textura; ojos y sonrisa como calcomanías.

| Medida | Medido en la geometría |
|---|---:|
| H (suela a cima del cabello) | 0.7794 |
| Cabeza (mentón a cima) / H | 0.329 |
| Ancho de hombros del torso / H | 0.386 |
| Punto más bajo | 0.0006 |
| Triángulos de pie (mochila) | 951 + 7 de sombra = 958 ≤ 320 |
| Triángulos sentado (sin mochila) | 951 + 7 de sombra = 958 ≤ 320 |

#### Rig

Pivotes medidos en el modelo (cuadrícula de 0.05 H).

| Hueso | Padre | Pivote raíz de reposo / H | Relativo al padre (escena) | Medido en el builder |
|---|---|---|---|---|
| hips | root | (0.004, 0.407, -0.02) | (0.0034, 0.3176, -0.0159) | (0.0034, 0.3176, -0.0159) |
| torso | hips | (0.003, 0.507, -0.024) | (-0.0009, 0.0782, -0.0025) | (0.0025, 0.3959, -0.0184) |
| head | torso | (0.002, 0.66, -0.019) | (-0.0009, 0.1188, 0.0039) | (0.0016, 0.5146, -0.0145) |
| armL | torso | (0.117, 0.63, -0.008) | (0.0884, 0.0952, 0.0122) | (0.0909, 0.491, -0.0062) |
| armR | torso | (-0.116, 0.63, -0.009) | (-0.0934, 0.0952, 0.0117) | (-0.0909, 0.491, -0.0067) |
| foreL | armL | (0.155, 0.501, -0.006) | (0.0303, -0.1004, 0.0018) | (0.1212, 0.3906, -0.0044) |
| foreR | armR | (-0.151, 0.501, -0.006) | (-0.0273, -0.1002, 0.0023) | (-0.1182, 0.3909, -0.0044) |
| legL | hips | (0.053, 0.407, -0.02) | (0.0381, -0.0005, 0) | (0.0415, 0.3171, -0.0159) |
| legR | hips | (-0.05, 0.408, -0.02) | (-0.0421, 0.0005, 0) | (-0.0388, 0.3181, -0.0159) |
| shinL | legL | (0.067, 0.225, -0.007) | (0.0105, -0.1416, 0.0101) | (0.0519, 0.1755, -0.0058) |
| shinR | legR | (-0.059, 0.23, -0.008) | (-0.007, -0.1387, 0.0094) | (-0.0458, 0.1794, -0.0066) |

| Punto | H |
|---|---:|
| sole | 0 |
| ankle | 0.1 |
| chin | 0.6716 |
| top | 1 |
| kneelLift | 0.095 |
| hip | 0.4072 |
| knee | 0.225 |
| elbow | 0.5008 |
| shoulder | 0.6295 |
| neckBase | 0.6598 |
| shoulderX | 0.1165 |
| legX | 0.0532 |
| eyeY | 0.7733 |
| faceZ | 0.1012 |
| halfHead | 0.1757 |
| halfShoulders | 0.1793 |

#### Piezas por variante

| Pieza | Hueso | De pie (mochila) | Sentado |
|---|---|---:|---:|
| `M-head` | head | 286 | 286 |
| `M-torso` | torso | 197 | 197 |
| `M-armL` | armL | 45 | 45 |
| `M-armR` | armR | 45 | 45 |
| `M-foreL` | foreL | 56 | 56 |
| `M-foreR` | foreR | 56 | 56 |
| `M-legL` | legL | 54 | 54 |
| `M-legR` | legR | 55 | 55 |
| `M-shinL` | shinL | 70 | 70 |
| `M-shinR` | shinR | 76 | 76 |
| `M-eyeR` | head | 4 | 4 |
| `M-eyeL` | head | 4 | 4 |
| `M-smile` | head | 3 | 3 |

Configuración base (niño; con `skirt: true`, la niña):

```json
{
  "id": "alumno-primaria",
  "label": "Alumno de primaria (Meshy)",
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

## Paquete R2 (`model: 'r2'`)

Alcance: con `model: 'r2'`, el alumno de primaria con cabello corto, pantalón y mochila se construye completo con el paquete R2.
Con R2, todo alumno de primaria con cabello corto usa la cabeza R2 (P01–P07), también con falda, para que la ropa no cambie la cabeza.
Las demás combinaciones conservan la receta v1 (geometría idéntica a `ec4d112`).

### Procedencia

Paquete `GuateGeeks_Primaria_Piezas_R2` (GuateGeeks · Primaria por piezas R2), montaje `GG-PRIMARIA-R2`, esquema 2.0.
20 recetas, 33 instancias, 320 triángulos en el paquete. Los datos se **cargan** de los JSON (importados a un módulo generado), no se transcriben a mano.

Recreaciones R3 activas (`docs/papercraft/construction-r3/datos`, mismo esquema): P01 (20 → 32 triángulos), P06 (32 → 46 triángulos), P08 (22 → 36 triángulos). El paquete R2 sin ellas suma 280.

| Archivo | SHA256 |
|---|---|
| `datos/assembly.json` | `dad773894f2fe1986fbad3e1320c52d313e936d672f2a0187882fbfb206cc50b` |
| `r3/datos/P01-cabeza.json` | `fe2c0fe49f2bfcf23ae3ef84eca4c28b3e8ec05f7a76cc99c356f3ca26fbe7f4` |
| `datos/P02-cuello.json` | `7a162ed08ce0695cc7e39f04ec512630f9cc82850f48b640c3af23a8e1c8b983` |
| `datos/P03-oreja.json` | `92f3bc1ca213b2e78bb33d0e2fc898e34ae6eef9bf295f06c2f0f50952275d1c` |
| `datos/P04-ojo.json` | `239459d7738c96f5e7944f60d30466d4c745f5dd4d355778fa111043c88f7b7f` |
| `datos/P05-sonrisa.json` | `e78951ee34d3a6e2e8cbfcedbcfbf9b6d90dec0e0453f2950f32f28bb52bc1ff` |
| `r3/datos/P06-cabello-nucleo.json` | `0fa6f5854b313b8290525df65420f3300fd48d2cf47a58a3c49c48b298c43a4d` |
| `datos/P07-mechon-flequillo.json` | `539e80f45e868d9dc3b9c7effa608391251a3f2a1587b4806c070d5f25afe5e7` |
| `r3/datos/P08-torso-chaleco.json` | `78ed69eb6c92f13b5260127647ed9fffe240adb7aaeecf9b62df978802b2036a` |
| `datos/P09-pechera-camisa.json` | `4b516d87e5b8fce7f9395aa109cfee6b36d16c207df0c752d4afe92ad2fa099e` |
| `datos/P10-solapa-cuello.json` | `fb2f2a32cebc912d9d831151fcfc6cdce38d1ed9fc567b1b75ef6587b67eb0a4` |
| `datos/P11-manga.json` | `13daf2ac6b000a3860a812e0e701e6b63e7cbea2265133062f331485343c6c92` |
| `datos/P12-brazo.json` | `9e699c69cd77ac961b5bf845672c43ba19fd97f3443054248a8f891cfdebe83e` |
| `datos/P13-antebrazo.json` | `941308426168d76035becaa55a57bb08b1f5c447da1b533a436cedd745e3759e` |
| `datos/P14-mano.json` | `e8469c41144debd9fced1051c8559f313684d8332288b32e6d1161dba536f2c2` |
| `datos/P15-pelvis-pantalon.json` | `3cb653e6931858bf6cba60073b3fed9b3a10cb2cecc162c91dcd2cfef3657c3a` |
| `datos/P16-muslo-pantalon.json` | `9fff60e1d198f73e5073686cf4cfbd83ce5f77d8aa9bb1d95301127bb568d928` |
| `datos/P17-pantorrilla-pantalon.json` | `3650e22780dceeeefe5f49fb4ce8ff316bdc2a88920f7b605e7599dfa1e5d8d4` |
| `datos/P18-zapato.json` | `2e1e0b846c133e400574fd09fd3ab7cf88d77401cc3b141170594eb5640bc8fc` |
| `datos/P19-mochila.json` | `aa02e8474509b7f6ccfb23d6539ba2f2a8b6743de14e78ad3c50c0d9b0def7b3` |
| `datos/P20-tirante.json` | `d3c8d088adfe8161218b391028e0e809d705aaf36b3380404b1cd346b8213b70` |

### Configuración reproducible

```json
{
  "id": "alumno-primaria-r2",
  "label": "Alumno de primaria (paquete R2)",
  "level": "prim",
  "seed": "prim-base",
  "hair": "short",
  "cap": false,
  "skirt": false,
  "headset": false,
  "skin": "#F0B98A",
  "hairColor": "#3A2E5C",
  "shoe": "#2B2340",
  "model": "r2"
}
```

La piel, el cabello, el chaleco, la mochila y los zapatos del paquete se recolorean a los de la configuración conservando el matiz relativo de cada cara; camisa y pantalón usan los colores del paquete. Los hex son sRGB y el builder los convierte una sola vez a lineal (`THREE.Color`).

### Contrato global

- Ejes: +Y arriba, +Z frente, +X izquierda anatómica. Suelo y = 0. Datos normalizados por H; H = 0.78 se aplica una sola vez.
- Transformación de instancia (MONTAJE §2): `M = T(position) · Rz · Ry · Rx · diag(sx·(mirror ? −1 : 1), sy, sz)`, grados. El builder recibe vértices locales al hueso activo: `H · (M·v − pivote_raíz(hueso))`. Las instancias reflejadas invierten el orden de cada triángulo una vez.
- Un hueso por instancia y por vértice (peso 1); 12 huesos con los nombres y padres del proyecto.
- Capas designadas (ojos, sonrisa, pechera, solapas, tirantes): separación normal ≥ 0.004. Solapes ocultos de articulación (rodilla P16/P17, muñeca P13/P14) se informan aparte en el manifiesto.

| Medida | Objetivo | Medido en la geometría |
|---|---:|---:|
| H (suela a cima del cabello) | 0.78 | 0.78 |
| Cabeza (mentón a cima) / H | 0.28 | 0.28 |
| Ancho de hombros del torso / H | 0.26 | 0.264 |
| Largo del zapato / H | — | 0.136 |
| Punto más bajo | 0 | 0 |

#### Puntos de referencia (`landmarks_H`)

| Punto | H | Escena |
|---|---:|---:|
| sole | 0 | 0 |
| ankle_reference | 0.055 | 0.0429 |
| knee | 0.255 | 0.1989 |
| hip | 0.45 | 0.351 |
| arm_shoulder | 0.68 | 0.5304 |
| torso_center_top | 0.7 | 0.546 |
| head_pivot | 0.7 | 0.546 |
| chin | 0.72 | 0.5616 |
| hair_top | 1 | 0.78 |
| head_with_hair_height | 0.28 | 0.2184 |
| torso_shoulder_width | 0.26 | 0.2028 |

#### Rig

| Hueso | Padre | Pivote raíz de reposo / H | Relativo al padre (escena) | Medido en el builder |
|---|---|---|---|---|
| hips | root | (0, 0.45, 0) | (0, 0.351, 0) | (0, 0.351, 0) |
| torso | hips | (0, 0.45, 0) | (0, 0, 0) | (0, 0.351, 0) |
| head | torso | (0, 0.7, 0) | (0, 0.195, 0) | (0, 0.546, 0) |
| armL | torso | (0.148, 0.68, 0) | (0.1154, 0.1794, 0) | (0.1154, 0.5304, 0) |
| armR | torso | (-0.148, 0.68, 0) | (-0.1154, 0.1794, 0) | (-0.1154, 0.5304, 0) |
| foreL | armL | (0.148, 0.555, 0) | (0, -0.0975, 0) | (0.1154, 0.4329, 0) |
| foreR | armR | (-0.148, 0.555, 0) | (0, -0.0975, 0) | (-0.1154, 0.4329, 0) |
| legL | hips | (0.058, 0.45, 0) | (0.0452, 0, 0) | (0.0452, 0.351, 0) |
| legR | hips | (-0.058, 0.45, 0) | (-0.0452, 0, 0) | (-0.0452, 0.351, 0) |
| shinL | legL | (0.058, 0.255, 0) | (0, -0.1521, 0) | (0.0452, 0.1989, 0) |
| shinR | legR | (-0.058, 0.255, 0) | (0, -0.1521, 0) | (-0.0452, 0.1989, 0) |

### Presupuesto

- Paquete: 320 triángulos, sin reserva. El proyecto cuenta la sombra de contacto (7, capa `blob`, auxiliar) en el límite, así que se **redistribuye**: se retiran 8 tapas ocultas. Límite del alumno con las recetas R3: 320 (el resto de estudiantes, 280).
- Emitido: **312** de geometría + 7 de sombra = **319** ≤ 320. Reserva: 0 (no es geometría).

| Receta | Caras retiradas (índice en el JSON) | Motivo |
|---|---|---|
| P13 | 7 | Tapa inferior del antebrazo, dentro de la mano (mismo hueso fore) |
| P14 | 6 | Tapa superior de la mano, dentro del antebrazo (mismo hueso fore) |
| P17 | 8, 10 | Tapa inferior de la pantorrilla, dentro del zapato (mismo hueso shin) |

#### Adaptaciones de integración (solo posiciones de vértices)

| Receta | Vértices (local / H) | Motivo |
|---|---|---|
| P18 | 2 → (0.0435, 0.008, 0.088); 3 → (-0.0435, 0.008, 0.088) | Punta elevada 0.008 H: la suela deja de ser coplanar con el suelo del campus |

### Instancias

| # | Instancia | Receta | Hueso | Reflejo | Posición / H | Rotación (°) | Paquete | Emitidos | Rango (triángulos) |
|---:|---|---|---|---|---|---|---:|---:|---|
| 1 | `P15` | P15 · Pelvis del pantalón | hips | no | (0, 0.45, 0) | (0, 0, 0) | 8 | 8 | 0–8 |
| 2 | `P08` | P08 · Torso y chaleco | torso | no | (0, 0.45, 0) | (0, 0, 0) | 36 | 36 | 8–44 |
| 3 | `P02` | P02 · Cuello | head | no | (0, 0.7, 0) | (0, 0, 0) | 8 | 8 | 44–52 |
| 4 | `P01` | P01 · Cabeza | head | no | (0, 0.72, 0) | (0, 0, 0) | 32 | 32 | 52–84 |
| 5 | `P03-L` | P03 · Oreja | head | no | (0.094, 0.824, 0) | (0, 0, 0) | 4 | 4 | 84–88 |
| 5 | `P03-R` | P03 · Oreja | head | sí | (-0.094, 0.824, 0) | (0, 0, 0) | 4 | 4 | 88–92 |
| 6 | `P04-L` | P04 · Ojo | head | no | (0.035, 0.8294, 0.0782) | (0, 0, 0) | 2 | 2 | 92–94 |
| 6 | `P04-R` | P04 · Ojo | head | no | (-0.035, 0.8294, 0.0782) | (0, 0, 0) | 2 | 2 | 94–96 |
| 7 | `P05` | P05 · Sonrisa | head | no | (0, 0.7824, 0.0731) | (0, 0, 0) | 3 | 3 | 96–99 |
| 8 | `P06` | P06 · Núcleo del cabello | head | no | (0, 0.72, 0) | (0, 0, 0) | 46 | 46 | 99–145 |
| 9 | `P07-L` | P07 · Mechón de flequillo | head | no | (0.038, 0.91, 0.094) | (0, 0, -7) | 4 | 4 | 145–149 |
| 9 | `P07-C` | P07 · Mechón de flequillo | head | no | (0, 0.91, 0.094) | (0, 0, 6) | 4 | 4 | 149–153 |
| 9 | `P07-R` | P07 · Mechón de flequillo | head | no | (-0.038, 0.91, 0.094) | (0, 0, 10) | 4 | 4 | 153–157 |
| 10 | `P09` | P09 · Pechera de camisa | torso | no | (0, 0.6902, 0.0675) | (0, 0, 0) | 1 | 1 | 157–158 |
| 11 | `P10-L` | P10 · Solapa del cuello | torso | no | (0.004, 0.7054, 0.0726) | (0, 0, 0) | 1 | 1 | 158–159 |
| 11 | `P10-R` | P10 · Solapa del cuello | torso | sí | (-0.004, 0.7054, 0.0726) | (0, 0, 0) | 1 | 1 | 159–160 |
| 12 | `P11-L` | P11 · Manga corta | armL | no | (0.148, 0.68, 0) | (0, 0, 0) | 8 | 8 | 160–168 |
| 13 | `P12-L` | P12 · Brazo | armL | no | (0.148, 0.68, 0) | (0, 0, 0) | 8 | 8 | 168–176 |
| 14 | `P13-L` | P13 · Antebrazo | foreL | no | (0.148, 0.555, 0) | (0, 0, 0) | 8 | 7 | 176–183 |
| 15 | `P14-L` | P14 · Mano | foreL | no | (0.148, 0.437, 0.012) | (0, 0, 0) | 8 | 7 | 183–190 |
| 16 | `P16-L` | P16 · Muslo del pantalón | legL | no | (0.058, 0.45, 0) | (0, 0, 0) | 12 | 12 | 190–202 |
| 17 | `P17-L` | P17 · Pantorrilla del pantalón | shinL | no | (0.058, 0.255, 0) | (0, 0, 0) | 12 | 10 | 202–212 |
| 18 | `P18-L` | P18 · Zapato | shinL | no | (0.058, 0, 0) | (0, 0, 0) | 12 | 12 | 212–224 |
| 12 | `P11-R` | P11 · Manga corta | armR | sí | (-0.148, 0.68, 0) | (0, 0, 0) | 8 | 8 | 224–232 |
| 13 | `P12-R` | P12 · Brazo | armR | sí | (-0.148, 0.68, 0) | (0, 0, 0) | 8 | 8 | 232–240 |
| 14 | `P13-R` | P13 · Antebrazo | foreR | sí | (-0.148, 0.555, 0) | (0, 0, 0) | 8 | 7 | 240–247 |
| 15 | `P14-R` | P14 · Mano | foreR | sí | (-0.148, 0.437, 0.012) | (0, 0, 0) | 8 | 7 | 247–254 |
| 16 | `P16-R` | P16 · Muslo del pantalón | legR | sí | (-0.058, 0.45, 0) | (0, 0, 0) | 12 | 12 | 254–266 |
| 17 | `P17-R` | P17 · Pantorrilla del pantalón | shinR | sí | (-0.058, 0.255, 0) | (0, 0, 0) | 12 | 10 | 266–276 |
| 18 | `P18-R` | P18 · Zapato | shinR | sí | (-0.058, 0, 0) | (0, 0, 0) | 12 | 12 | 276–288 |
| 19 | `P19` | P19 · Mochila | torso | no | (0, 0.5, -0.109) | (0, 0, 0) | 12 | 12 | 288–300 |
| 20 | `P20-L` | P20 · Tirante | torso | no | (0.064, 0.7, 0.071) | (0, 0, 0) | 6 | 6 | 300–306 |
| 20 | `P20-R` | P20 · Tirante | torso | sí | (-0.064, 0.7, 0.071) | (0, 0, 0) | 6 | 6 | 306–312 |

### Recetas

#### P01 · Cabeza

- **Papel:** Volumen facial facetado y redondeado, con frente plano para ojos y sonrisa.
- **Construcción:** Prisma octogonal achaflanado: anillos de 8 vértices arriba y abajo (16 triángulos de pared), abanico superior de 8 hacia la coronilla y abanico inferior de 8 hacia el mentón. Pliegue vertical central en el frente; cada mitad conserva el plano facial R2 en el eje. Superficie: `closed`; 32 triángulos, 18 vértices; color base #E5AD80.
- **Instancias:** `P01` (head).
- **Sockets:** origin, mount_P03_L, mount_P03_R, mount_P04_L, mount_P04_R, mount_P05, mount_P06.
- **Límites:** Forma de apoyo facetada; el cabello oculta el cierre superior. No incluye nariz saliente. Cada mitad frontal se inclina 3.4° respecto al plano R2: ojos y sonrisa conservan ≥ 0.004 de separación normal; los ojos quedan algo más separados en su borde exterior.

#### P02 · Cuello

- **Papel:** Conecta el torso con la cabeza manteniendo un volumen visible pequeño.
- **Construcción:** Prisma triangular cerrado y ligeramente cónico. Superficie: `closed`; 8 triángulos, 6 vértices; color base #E5AD80.
- **Instancias:** `P02` (head).
- **Sockets:** origin, mount_P01.
- **Límites:** Sigue a head; revisar cobertura inferior al inclinar la cabeza.

#### P03 · Oreja

- **Papel:** Pequeña oreja facetada; una receta se refleja para el lado derecho.
- **Construcción:** Tetraedro de cuatro caras con base de encaje oculta. Superficie: `closed`; 4 triángulos, 4 vértices; color base #E5AD80.
- **Instancias:** `P03-L` (head), `P03-R` (head).
- **Sockets:** origin.
- **Límites:** La base penetra de forma intencional en la cabeza y el cabello; solo el extremo exterior queda visible. Sin cavidad anatómica ni detalles interiores.

#### P04 · Ojo

- **Papel:** Aplique oscuro de ojo; repetir dos veces sin volumen adicional.
- **Construcción:** Rombo plano triangulado, dos triángulos. Superficie: `planar`; 2 triángulos, 4 vértices; color base #321853.
- **Instancias:** `P04-L` (head), `P04-R` (head).
- **Sockets:** origin.
- **Límites:** Superficie sin espesor; vistas de canto casi lineales. La orientación coincide con la cara frontal de la cabeza.

#### P05 · Sonrisa

- **Papel:** Sonrisa breve, angular y legible como un aplique de papel.
- **Construcción:** Polígono cóncavo plano de cinco vértices, triangulación explícita. Superficie: `planar`; 3 triángulos, 5 vértices; color base #321853.
- **Instancias:** `P05` (head).
- **Sockets:** origin.
- **Límites:** Cinco vértices y tres triángulos; no representa labios ni boca volumétrica.

#### P06 · Núcleo del cabello

- **Papel:** Casquete facetado con coronilla, flequillo frontal, patillas y nuca; deja la cara visible.
- **Construcción:** Ápice de coronilla con abanico de 8, banda de 8 a 8 hasta el ecuador (16, con el rombo frontal del flequillo), y paredes laterales y traseras de 11 triángulos por lado: punta de sien, patilla delante de la oreja, muesca sobre la oreja, mechón detrás, punta de nuca y muesca central. Superficie: `open`; 46 triángulos, 32 vértices; color base #3A2E5C.
- **Instancias:** `P06` (head).
- **Sockets:** origin, mount_P07_L, mount_P07_C, mount_P07_R.
- **Límites:** Superficie abierta: abertura inferior intencional sobre la cabeza y la cara. No es un sólido imprimible. El flequillo del núcleo termina sobre las raíces de los tres P07; las puntas del flequillo las aportan los P07.

#### P07 · Mechón de flequillo

- **Papel:** Mechón ancho de papel con una cresta longitudinal; tres instancias forman el flequillo.
- **Construcción:** Dos cuadriláteros no coplanares, cuatro triángulos. Superficie: `open`; 4 triángulos, 6 vértices; color base #3A2E5C.
- **Instancias:** `P07-L` (head), `P07-C` (head), `P07-R` (head).
- **Sockets:** origin.
- **Límites:** Superficie plegada sin espesor. Las puntas deben permanecer por encima de los ojos.

#### P08 · Torso y chaleco

- **Papel:** Chaleco abierto con escote en V profundo, pliegue central delantero y trasero, hombros descendentes con bisel, sisas y bajo facetado ligeramente acampanado (R3, fiel a la lámina).
- **Construcción:** R3: 24 vértices. Por lado: panel delantero bajo (2), solapa del escote (1), bisel del hombro (1), hombro superior (1), bisel trasero (1), panel trasero (3), costado en abanico desde el fondo de la sisa (5) y sisa cerrada por un valle oscuro (2). Tapa interior oscura del escote (4). 36 triángulos. Superficie: `open`; 36 triángulos, 24 vértices; color base #6942A1.
- **Instancias:** `P08` (torso).
- **Sockets:** origin, mount_P02, mount_P09, mount_P10_L, mount_P10_R, mount_P11_L, mount_P11_R, mount_P19.
- **Límites:** Bajo abierto: la pelvis P15 entra por el borde inferior y su caja queda dentro del chaleco en reposo. El escote y las sisas se ven huecos mediante caras interiores oscuras orientadas hacia fuera (tapa del escote y valle de la sisa); no hay segunda capa de camisa. Perfil más recto que la lámina: la pechera P09, las solapas P10 y los tirantes P20 de R2 fijan el frente y la espalda casi verticales.

#### P09 · Pechera de camisa

- **Papel:** Triángulo blanco que hace visible el escote en V.
- **Construcción:** Un triángulo; no tiene espesor ni volumen de camisa oculto. Superficie: `planar`; 1 triángulos, 3 vértices; color base #FBFAF7.
- **Instancias:** `P09` (torso).
- **Sockets:** origin.
- **Límites:** Aplique plano colocado a distancia normal controlada del chaleco.

#### P10 · Solapa del cuello

- **Papel:** Una hoja triangular del cuello; reflejar para obtener la segunda.
- **Construcción:** Un triángulo por solapa; dos instancias. Superficie: `planar`; 1 triángulos, 3 vértices; color base #FBFAF7.
- **Instancias:** `P10-L` (torso), `P10-R` (torso).
- **Sockets:** origin.
- **Límites:** Aplique triangular inclinado. Requiere distancia normal respecto a la pechera.

#### P11 · Manga corta

- **Papel:** Manga corta con boca superior positiva y salida amplia para el brazo.
- **Construcción:** Dos secciones rectangulares de cuatro vértices, cuatro paneles y ocho triángulos. Superficie: `open`; 8 triángulos, 8 vértices; color base #FBFAF7.
- **Instancias:** `P11-L` (armL), `P11-R` (armR).
- **Sockets:** origin, mount_P12_L, mount_P12_R.
- **Límites:** Ambos extremos abiertos. Su cobertura se valida en reposo; poses amplias pueden exigir tapas y rebalanceo del presupuesto.

#### P12 · Brazo

- **Papel:** Segmento superior del brazo, parcialmente cubierto por la manga.
- **Construcción:** Prisma triangular cerrado, ocho triángulos. Superficie: `closed`; 8 triángulos, 6 vértices; color base #E5AD80.
- **Instancias:** `P12-L` (armL), `P12-R` (armR).
- **Sockets:** origin, mount_P13_L, mount_P13_R.
- **Límites:** Prisma triangular de apoyo; revisar silueta del codo en giro.

#### P13 · Antebrazo

- **Papel:** Antebrazo más estrecho hacia la muñeca, con leve desplazamiento hacia delante.
- **Construcción:** Prisma triangular cerrado de secciones variables. Superficie: `closed`; 8 triángulos, 6 vértices; color base #E5AD80.
- **Instancias:** `P13-L` (foreL), `P13-R` (foreR).
- **Sockets:** origin, mount_P14_L, mount_P14_R.
- **Límites:** La mano comparte foreL/foreR; no hay hueso adicional de muñeca.
- **Redistribución:** sin las caras 7.

#### P14 · Mano

- **Papel:** Mano simplificada de palma ancha y dedos reunidos.
- **Construcción:** Prisma triangular cerrado, ocho triángulos. Superficie: `closed`; 8 triángulos, 6 vértices; color base #E5AD80.
- **Instancias:** `P14-L` (foreL), `P14-R` (foreR).
- **Sockets:** origin.
- **Límites:** Sin dedos ni pulgar separado. Es un volumen de apoyo facetado.
- **Redistribución:** sin las caras 6.

#### P15 · Pelvis del pantalón

- **Papel:** Cintura y pelvis del pantalón que enlazan chaleco y muslos.
- **Construcción:** Banda rectangular de cuatro paneles, ocho triángulos. Superficie: `open`; 8 triángulos, 8 vértices; color base #33438A.
- **Instancias:** `P15` (hips).
- **Sockets:** origin, mount_P08, mount_P16_L, mount_P16_R.
- **Límites:** Bocas superior e inferior abiertas; la inferior se cubre parcialmente con ambos muslos. Revisar vista inferior y poses sentadas.

#### P16 · Muslo del pantalón

- **Papel:** Pierna de pantalón desde cadera a rodilla, ligeramente cónica.
- **Construcción:** Prisma rectangular cerrado de doce triángulos. Superficie: `closed`; 12 triángulos, 8 vértices; color base #33438A.
- **Instancias:** `P16-L` (legL), `P16-R` (legR).
- **Sockets:** origin, mount_P17_L, mount_P17_R.
- **Límites:** Cierre en rodilla se conserva para animación.

#### P17 · Pantorrilla del pantalón

- **Papel:** Pantalón desde rodilla hasta tobillo, con solape de unión.
- **Construcción:** Prisma rectangular cerrado de doce triángulos. Superficie: `closed`; 12 triángulos, 8 vértices; color base #33438A.
- **Instancias:** `P17-L` (shinL), `P17-R` (shinR).
- **Sockets:** origin, mount_P18_L, mount_P18_R.
- **Límites:** Revisar alineación con zapato y cobertura del cambio de hueso.
- **Redistribución:** sin las caras 8, 10.

#### P18 · Zapato

- **Papel:** Zapato compacto con talón, empeine alto y puntera de espesor visible.
- **Construcción:** Prisma rectangular modificado de ocho vértices y doce triángulos. Superficie: `closed`; 12 triángulos, 8 vértices; color base #2B2340.
- **Instancias:** `P18-L` (shinL), `P18-R` (shinR).
- **Sockets:** origin.
- **Límites:** Sin suela adicional ni detalles de cordones. La parte frontal tiene altura positiva.
- **Adaptación:** Punta elevada 0.008 H: la suela deja de ser coplanar con el suelo del campus.

#### P19 · Mochila

- **Papel:** Cuerpo de mochila compacto y cónico, situado en la espalda.
- **Construcción:** Prisma cerrado de ocho vértices y doce triángulos. Superficie: `closed`; 12 triángulos, 8 vértices; color base #19BCCD.
- **Instancias:** `P19` (torso).
- **Sockets:** origin, mount_P20_L, mount_P20_R.
- **Límites:** Sin bolsillo, cierre, asa o solapa geométrica independiente. Añadirlos exige redistribuir el presupuesto.

#### P20 · Tirante

- **Papel:** Correa plana de tres tramos: pecho, puente de hombro y unión trasera.
- **Construcción:** Tres paneles rectangulares, seis triángulos por tirante. Superficie: `open`; 6 triángulos, 8 vértices; color base #19BCCD.
- **Instancias:** `P20-L` (torso), `P20-R` (torso).
- **Sockets:** origin.
- **Límites:** Superficie sin espesor. El puente mantiene holgura sobre el hombro en reposo.

## Revisar y reproducir

```bash
npm run build:inspector      # y abrir asesor/lab/inspector.html con `npm run serve` (panel «Alumno de primaria»)
npm run check:people -- artifacts/paper/<run-nuevo>
PLAYWRIGHT_MODULE=… node tools/alumno-shot.cjs artifacts/paper/<run-nuevo> --views char-front,char-side,char-back,char-34,campus --heights 600
node tools/r2-import.mjs        # regenera el módulo de datos desde el paquete
node tools/people-contract.mjs   # regenera este documento
```

En el inspector, `inspector.showPerson({ pose, view, only: ['P03' | 'P03-L' | …] })` aísla recetas o instancias, `setWire(true)` muestra las aristas y `setSockets(true)` los ejes y puntos de unión.
