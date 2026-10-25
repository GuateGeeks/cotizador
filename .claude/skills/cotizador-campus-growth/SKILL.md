---
name: cotizador-campus-growth
description: Planificador modular determinista del campus 3D (crecimiento estilo Townscaper de una aula a un campus). Úsalo al cambiar qué módulos aparecen, dónde, cómo conectan, cómo se ensamblan o cómo crecen y se reducen con la configuración.
---

# Crecimiento del campus

El planificador vive en `asesor/lab/campus-layout.js` (`deriveCampus`). Es puro:
no toca el DOM ni Three.js y se prueba en Node (`asesor/test/campus.test.js`).
Todas las reglas y límites de crecimiento están ahí, en un solo lugar.
Documenta cada cambio en `docs/campus-3d.md`.

## Principios obligatorios

- Una configuración pequeña produce una escuela pequeña; una amplia, un campus
  visiblemente mayor. **La transformación debe ser evidente sin leer
  contadores.** No basta con agregar personajes al mismo edificio.
- La escuela crece añadiendo piezas. Cada módulo tiene un **slot fijo** y un id
  estable (`room:<col>:<n>:<floor>`, `workshop:<programId>`,
  `bridge:<a>-<b>`...). Agregar una opción nunca mueve lo ya construido.
- La función es determinista: dos configuraciones equivalentes (mismo
  contenido, distinto orden) producen la misma composición. La variación usa
  `hash(key)`, nunca `Math.random`.
- Reducir el alcance quita los módulos que ya no corresponden y converge al
  mismo resultado que construir directamente esa configuración.
- La escala de puertas, mesas, personas y equipos es constante. Crecer agrega
  módulos; nunca agranda los existentes.
- La complejidad deriva del **alcance** (niveles, secciones, programas,
  simultaneidad y servicios de la modalidad), nunca del precio ni del número
  de paso.
- Hay límites para que una institución grande siga siendo legible
  (`CAMPUS_LIMITS`). Los personajes y módulos son representativos; las cifras
  reales están en los contadores.

## Composición objetivo

El estado 6 converge a la [referencia](../../../docs/papercraft/reference/README.md):

- alas de aulas de dos pisos alrededor de un **patio central** pavimentado;
- entrada naranja en un ala y escalera exterior turquesa;
- **pasarela** entre segundos pisos;
- jardineras, bancas y árboles en los bordes.

El estado 1 es una sola aula de planta baja de esa misma ala, sobre un pedestal
pequeño. Así la pieza inicial sigue reconocible en el campus grande.

## Catálogo de módulos

Cada módulo arquitectónico declara `{ id, size: {w, d, h}, anchors, connectors,
supports }` en un registro (`MODULES`) del planificador:

- `anchors`: puntos donde se apoyan otros elementos (puerta, pie de escalera,
  extremo de pasarela, banca, jardinera).
- `connectors`: aristas compartibles por lado (`north/east/south/west/up`) y
  su tipo (`wall`, `door`, `corridor`, `open`).
- `supports`: qué debe existir debajo (losa, aula o columnas).

Biblioteca mínima: base o terreno, aula inicial, aula ampliable y variantes de
esquina o extremo, módulo de piso superior, cubierta, entrada naranja,
corredor, escalera, puente o pasarela, patio, jardinera, árbol y planta, banca,
mesa y silla, laptop, robot educativo, recursos de proyecto, estudiante y
docente o facilitador. La geometría sigue
[papercraft](../cotizador-papercraft/SKILL.md).

## Reglas de construcción

Resuélvelas en el planificador, no en el renderizador:

- **Ocupación**: un mapa de slots `x:z:floor`. Un slot ocupado no admite otro
  módulo. Pruébalo con una aserción de no solapamiento.
- **Adyacencia y fachadas compartidas**: `getAdjacency` elimina los muros de
  las caras internas y la cubierta bajo un aula superior.
- **Esquinas y extremos**: la variante de aula depende de qué lados están
  libres (extremo, intermedia o esquina).
- **Soporte**: un piso superior exige un aula o columnas debajo. No hay
  módulos flotantes.
- **Escaleras**: arrancan en un slot libre a nivel del suelo y desembarcan en
  un corredor o balcón. Nunca terminan contra un muro.
- **Puertas**: cada puerta da a un corredor, patio o camino libre. El
  mobiliario no ocupa el barrido de la puerta ni atraviesa muros.
- **Alas**: dos alas se unen con corredor o pasarela, con continuidad de
  circulación turquesa hasta la entrada.
- **Patios y vegetación**: se distribuyen en los slots libres que dejan los
  módulos. Árboles altos a los lados y al fondo; frente a la cámara, solo
  vegetación baja para no tapar.

## Seis estados de referencia

Guían diseño, capturas y pruebas, y no son pasos del formulario. Los
escenarios reproducibles están en `tools/campus-states.cjs`.

| Estado | Expectativa | Señal comprobable |
|---|---|---|
| 1. Escuela inicial | Una sola aula, entrada sencilla y un pequeño exterior | 1 aula, 0 talleres, terreno mínimo |
| 2. Comunidad | Llegan grupos; aparecen aulas según niveles y secciones | aulas > 1, personas en aulas |
| 3. Robótica | Espacio de proyectos con robots, mesas y colaboración | taller del programa elegido |
| 4. Ampliación | Otra ala o un piso superior con escalera | ala nueva o `floor:1` + escalera |
| 5. Entorno y conexiones | Corredores, pasarelas, patios, árboles y bancas | conectores cerrados, vegetación creciente |
| 6. Campus consolidado | Todas las experiencias, recursos y personas | huella ≥ 3× la del estado 1 |

## Ensamblaje

Los módulos nuevos se ensamblan en este orden:

1. Base.
2. Muros que se levantan girando sobre su pliegue.
3. Cubierta que se despliega.
4. Conexiones.
5. Mobiliario y recursos.
6. Personajes.

Cada módulo tarda de 400 a 900 ms, con solapamiento controlado: una
configuración amplia no debe tardar más de unos 3 s en total. La transición es
interrumpible: el estado más reciente reemplaza el destino y no se acumula una
cola de transiciones viejas. Con movimiento reducido, el resultado aparece
directo. La animación por huesos de `campus-kit.js` (`Rig`, etapas) es la base.

## Cámara

El crecimiento físico debe notarse: no reencuadres para que una escuela
pequeña y una grande ocupen lo mismo en pantalla. Conserva el encuadre
mientras quepa y amplíalo con suavidad solo para evitar recortes.

## Pruebas

En `campus.test.js` comprueba:

- determinismo e independencia del orden;
- crecimiento monótono de la huella entre los estados 1 y 6;
- reversibilidad (reducir equivale a construir directo);
- no solapamiento, soportes y escaleras con desembarco;
- límites con instituciones enormes.
