# Referencia «GuateGeeks Papercraft»

Imagen de referencia original entregada el 2026-10-24: `papercraft-reference.png`
(lámina 1536 × 1024 con cuatro paneles; SHA256
`cc0ae3c3dcc0a5ba16ea1b7cd1d47273ae3dc803cad501e318e9f6e10f6a6d88`). Las láminas
`01`–`13` y los estudios de crecimiento amplían esa referencia por tema
(prompts en [PROMPTS.md](PROMPTS.md)). Son referencias de diseño, no capturas de la
implementación.

Las imágenes (`*.png`, ~47 MB) y los paquetes `.zip` **no se versionan** (`.gitignore`):
se conservan en el equipo de diseño y se copian en esta carpeta para trabajar. Los
hashes y los prompts sí quedan registrados aquí y en [PROMPTS.md](PROMPTS.md).

## Paneles

1. **Vista general**: tres cuartos elevada desde el frente izquierdo, a unos 35–40°.
2. **Vista frontal**: frontal elevada, a unos 20–25°.
3. **Patio y aulas**: acercamiento al patio, al aula baja y a la pasarela.
4. **Personajes y equipo**: primer plano de dos estudiantes, un docente, una
   laptop y un robot.

## Lectura de la referencia

**Base**

- Pedestal violeta grueso, de contorno orgánico redondeado. Sus laterales están
  facetados como papel arrugado o plegado en triángulos.
- La cara superior es un pavimento claro, entre marfil y lila muy pálido. **El
  verde aparece solo en la vegetación**, no como césped.
- Sombra suave bajo el pedestal sobre un fondo casi blanco con matiz lila
  (`#F4F1F6`).

**Arquitectura**

- Dos edificios de dos pisos alrededor de un patio central:
  - **Izquierda**: bloque de aulas en corte, con el frente abierto que muestra
    el interior. Paredes laterales violeta, bandas de losa y antepecho marfil
    gruesas, y un zócalo turquesa en el aula baja.
  - **Derecha**: volumen turquesa lateral, marco marfil, **pórtico de entrada
    naranja** en planta baja y **escalera exterior turquesa** con baranda que
    sube al segundo piso.
- Cubiertas planas violeta con un pequeño equipo en la azotea.
- Una **pasarela** con baranda de vidrio turquesa une los segundos pisos.
- Escalones frente a la entrada.
- Los marcos, losas y antepechos se leen como cartulina gruesa en capas.

**Interiores**

- Pared de acento violeta con una pantalla (icono de robot y líneas de código
  `</>` en naranja, turquesa y blanco).
- Mesas claras, sillas naranja y turquesa, laptops oscuras y un robot amarillo
  con ruedas (lectura Tale-Bot) sobre la mesa.
- Luz interior cálida.

**Patio**

- Jardineras blancas con arbustos facetados, como cristales de papel plegado.
- Bancas naranja con estudiantes que usan laptops.
- Grupos conversando y caminando.

**Vegetación**

- Copas poliédricas facetadas (pocas caras, planos nítidos) sobre troncos
  marrón.
- Arbustos de pirámides plegadas.

**Personas**

- Proporciones juveniles realistas, no cabezonas.
- Cabeza facetada con rostro sencillo (ojos de punto y sonrisa) y cabello en
  piezas plegadas.
- Uniforme: suéter o chaleco violeta, camisa blanca, y pantalón o falda azul
  marino. Mochilas naranja o turquesa.
- El docente lleva camisa turquesa clara y pantalón violeta oscuro.
- En el primer plano se ven pliegues en mangas y torsos, el canto del papel y
  la fibra.

**Materiales y luz**

- Cartulina mate con fibra visible solo de cerca.
- Luz diurna suave, oclusión de contacto ligera y sin brillos.

## Diferencias con el campus actual (línea base 2026-10-24)

Capturas en `artifacts/campus/papercraft-baseline-20261024*/` (local, ignorado
por git).

| Tema | Campus actual | Referencia |
|---|---|---|
| Fondo del visor | Violeta oscuro `#2E1853` | Casi blanco lila |
| Terreno | Isla de teselas violeta con «césped» lila | Pedestal violeta con pavimento claro |
| Composición | Fila de aulas por nivel, fila de talleres y fila frontal | Edificios en U alrededor de un patio, con pasarela |
| Cubierta | Pérgola de listones violeta | Cubierta plana violeta, con el frente en corte |
| Personas | Proporción infantil y ropa por color de nivel | Proporción juvenil, uniforme violeta, blanco y marino |
| Árboles | Copas low-poly | Copas facetadas de papel, más limpias |
| Material | Vértice plano sin espesor ni canto | Láminas con espesor, canto y pliegue |

Geeky no aparece en la referencia. Se conserva como marca en la entrada solo si
la persona responsable lo confirma.

## Modelos 3D generados (2026-10-25)

Entregados por la persona responsable; **no se versionan** (`.gitignore`), se conservan localmente.

| Archivo | Origen | SHA256 | Uso |
|---|---|---|---|
| `meshy/Meshy_AI_Papercraft_Student_1025165445_image-to-3d-texture.glb` | Meshy, image-to-3d con textura (369 242 triángulos, textura 2048²) | `f7908bba0ad82fb2eb595f0e9c087f338ea9525fe248a0d1cf81eee9b4137302` | Alumno de primaria del campus, vía `node tools/meshy-import.mjs` ([GESTION-VISUAL](../GESTION-VISUAL.md)). |
| `C:\Users\adawolfs\OneDrive\Documents\Blender\GuateGeeks\nina-primaria.blend` | Blender (malla Meshy de 940 triángulos, esqueleto Mixamo, textura 2048²), de la persona responsable | `197f4a9045bd3a9ed673cac369c90ff5ce6faf5ec4e11324ea48ae551b1f7191` | **Alumna de primaria vigente**, vía `pw.py adopt` de `3d-assets`. |
| `meshy/niña-primaria.glb` | Meshy, image-to-3d con textura (3 951 triángulos en 42 piezas) | `a527860238ff1d23647d6029c588b10151cb32ca9ad11389c4ed7267721dd1cb` | Versión anterior de la alumna (`node tools/meshy-import.mjs --model nina --force` la regeneraría). |
| `meshy/niña-preprimaria.glb`, `tripo/niña-preprimaria.glb` y las láminas `niña-primaria/`, `niña-preprimaria/` | Meshy y Tripo | — | Referencias; sin integrar. |
| `tripo/paper character 3d model.glb` | Tripo (7 451 triángulos) | `7a858ae65375497299f03158bc87115e43897515a380ecb553dece24f3032568` | Referencia; sin integrar. |
