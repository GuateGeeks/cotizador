---
name: cotizador-papercraft
description: Dirección de arte y biblioteca papercraft del campus 3D del cotizador. Úsalo al crear o cambiar geometría, materiales, paleta, personajes, vegetación o equipos de la escena para que se lean como cartulina cortada, plegada y ensamblada.
---

# Papercraft del campus

La escuela debe parecer construida con cartulina de colores cortada, plegada y
ensamblada, tanto en la vista general como al acercarse a una persona, un árbol
o un aula. **Aplicar una textura de papel a cubos no cumple la dirección.** El
papel se reconoce por la geometría: espesor, cantos, pliegues, pestañas y capas.
El material lo acompaña.

Referencia visual: `docs/papercraft/reference/papercraft-reference.png`, con
su análisis en [README](../../../docs/papercraft/reference/README.md): vista
general, vista frontal, patio y aulas, y personajes y equipo. Si el PNG falta,
el README es la descripción vigente. No lo sustituyas por una imagen inventada.

Rasgos que la definen:

- pedestal violeta facetado con pavimento claro encima;
- edificios de dos pisos en corte alrededor de un patio, con bandas marfil
  gruesas;
- pórtico naranja, escalera exterior y pasarela turquesa;
- copas poliédricas;
- personas de proporción juvenil con uniforme violeta, blanco y marino;
- fondo casi blanco.

## Unidades y medidas

Unidades de escena de `campus-layout.js`: `FLOOR_HEIGHT = 1.7`, `CELL = 2.6`.

| Pieza | Espesor | Nota |
|---|---|---|
| Muro, cubierta, losa | `T = 0.03` | Cartulina estructural |
| Mobiliario, equipos, personas, hojas | `t = 0.018` | Cartulina fina |
| Base o terreno | `0.06` + capa superior `0.018` | Cartón con cartulina pegada |

- Las capas se separan al menos un espesor del soporte. Nunca dejes dos
  superficies coplanares: provocan parpadeo (z-fighting).
- El espesor no cambia con el tamaño del módulo. Así la escala de puertas,
  mesas y personas se mantiene en una escuela pequeña y en una grande.

## Vocabulario geométrico

Implementa estos generadores en la biblioteca (hoy, `campus-kit.js`
sobre `createBuilder`). Compón los módulos solo con ellos:

- `panel(w, h, T)`: lámina con espesor. Sus caras laterales son el **canto**
  y llevan el tono de canto (ver materiales).
- `fold(profile, width, T)`: una sola lámina barrida a lo largo de un perfil
  2D `[{len, angle}]`, con juntas a inglete y sin huecos. Cada junta es un
  pliegue en valle o en montaña, con un filete de pliegue de 0.012: más oscuro
  en el valle, más claro en la montaña.
- `prism(sides, r, h, T)`: tubo de cartulina plegado, abierto o con tapas.
- `tab(len, depth, T)`: pestaña trapezoidal de pegado, de 0.06–0.08 de fondo
  y chaflanes de 35°.
- `hingedRoof(...)`: cubierta en una o dos aguas, con un hueso en la línea de
  pliegue para el despliegue animado.
- `foldedLeaf(...)` y `crossCard(...)`: hoja en rombo plegada al centro, y
  árbol de tarjetas encastradas en cruz.

Reglas:

- **Pliegues con intención**: cuatro muros de un aula son una tira plegada,
  no cuatro cajas. Entre pliegues, las superficies quedan limpias y planas.
- **Pestañas en lugares elegidos**: uniones muro–cubierta, esquinas de la base
  y pie de árboles y señales. Pon dos a cuatro por módulo, nunca en todas las
  aristas.
- **Marcos y ventanas como capas superpuestas**: un recorte (marco) sobre la
  lámina del muro, separado un espesor. No uses un hueco booleano liso.
- **Vegetación plegada**: copas poliédricas facetadas, de pocas caras y con
  canto visible. Arbustos de pirámides plegadas en jardineras blancas. Evita
  las esferas suaves y el follaje de muchas caras.
- **Personajes ensamblados**: proporción juvenil, no cabezona. Torso como
  prisma plegado, cabeza poliédrica con rostro sencillo (ojos de punto y
  sonrisa) y cabello en piezas plegadas. Extremidades de tira plegada con
  pliegues en mangas. Uniforme violeta, blanco y marino; el color de nivel va
  en un acento (mochila o cuello), no en toda la ropa. Conserva el rig por
  huesos de `campus-people.js`.
- **Equipos**: conserva la forma reconocible de producto (Tale-Bot, Robot
  Master, base SPIKE, placa de electrónica, cuadricóptero, visor de realidad
  virtual), construida con láminas y prismas.
- Mantén la animación de construcción por huesos: cada lámina que se levanta
  gira alrededor de su línea de pliegue (ver
  [crecimiento](../cotizador-campus-growth/SKILL.md)).

## Materiales y color

- Usa una sola biblioteca de materiales compartidos dentro del presupuesto
  (10 materiales). La cartulina opaca es un `MeshStandardMaterial` con
  `vertexColors`, `metalness: 0`, `roughness` entre 0.85 y 1 (empieza en
  0.92) y `flatShading` para leer cada faceta.
- La **fibra** es sutil: una variación de ±2–4 % de luminancia y una
  perturbación leve de la normal, por ruido triplanar en `onBeforeCompile`.
  Así no hacen falta UV. Si es visible como ruido en la vista general, es
  excesiva.
- **Canto**: el color de la cara mezclado un 12–18 % hacia `#FFF8EC`. Así el
  borde cortado se lee en los acercamientos sin dibujar líneas.
- **Gestión de color**: `renderer.outputColorSpace = SRGBColorSpace`. Los
  colores de vértice pasan por `new Color(hex)` (sRGB→lineal, ya lo hace
  `col()`). Una textura de color usa `SRGBColorSpace`; los mapas de datos
  (rugosidad, normal, bump, ruido) usan `NoColorSpace`. Conserva
  `NeutralToneMapping` salvo que una medición justifique otro.
- **Sombras de contacto suaves**: sombras PCF con radio moderado y las manchas
  `blob` existentes bajo mobiliario y personas. Antes de usar una API de
  sombras, compruébala en `node_modules/three` (r186 eliminó
  `PCFSoftShadowMap`).
- Prohibido: reflejos especulares, `envMap`, superficies plásticas, metálicas
  o con brillo, aspecto de arcilla (biseles redondeados, subdivisión) y ruido
  evidente.

## Paleta y jerarquía

Extráela de `DESIGN.md` y de `PAL` en `campus-kit.js`. Centraliza cambios ahí y
en `LEVEL_COLOR`/`PROGRAM_COLOR`.

| Papel | Uso | Base |
|---|---|---|
| Violeta | Identidad, volúmenes, cubiertas y canto de la base | `#6942A1`, `#6C45AE`, `#321853` |
| Marfil o blanco | Aulas y superficies principales | `#FFF8EC`, `#FBE8D0` |
| Naranja | Entradas y acciones importantes | `#FF9D38`, `#FF8B22` |
| Cian o turquesa | Conexiones, circulación y selección | `#25C2C6`, `#5FBAD6` |
| Verdes | Césped, árboles y plantas | `#7CCB6B`, `#56B366`, `#3E9A5E` |

La ropa, la piel y los recursos educativos usan variaciones discretas de estos
tonos y de los colores de nivel.

El terreno es un pedestal violeta facetado con pavimento claro encima. El verde
queda para la vegetación, no para el césped. El fondo del visor es casi blanco
lila (`#F4F1F6`), con sombra suave bajo el pedestal. Cambiarlo desde el violeta
oscuro actual afecta al contraste del HUD: actualiza `DESIGN.md` y los tokens
de `asesor.css` en el mismo cambio.

## Comprobación visual

Abre las capturas antes de opinar (ver [QA 3D](../cotizador-3d-qa/SKILL.md)).
En un acercamiento de zoom ≥ 6 a un aula, una persona, un árbol y un equipo,
deben verse el espesor, los cantos, al menos un pliegue y una pestaña, la capa
del marco y una sombra de contacto. Registra por separado el dictamen técnico
(presupuestos, errores) y el visual (lectura de papel, escala, paleta).
