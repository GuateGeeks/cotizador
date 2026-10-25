# P01 · Cabeza

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P01-cabeza.png).
- [Plano técnico PNG](../../planos/P01-cabeza.png) y [SVG ampliable](../../planos/P01-cabeza.svg).
- [Geometría de apoyo exacta](../../datos/P01-cabeza.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Dar al alumno una cara amplia, una mandíbula corta y una superficie frontal legible. El contorno de la cara debe seguir reconociéndose cuando la cámara elevada revele parte de la coronilla.

## Construcción

Volumen facetado con un frente amplio y laterales inclinados. La receta de apoyo utiliza secciones poligonales para controlar ancho, profundidad y estrechamiento inferior. Las superficies cubiertas por el cabello conservan su función de soporte; no se deduce su forma a partir del PNG.

**Construcción declarada en los datos:** Dos secciones hexagonales, doce triángulos laterales y cuatro en cada tapa.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 12 |
| Triángulos por receta | 20 |
| Instancias en este alumno | 1 |
| Triángulos aportados al conjunto | 20 |
| Caja local mínima / H | (-0.1125, 0, -0.085) |
| Caja local máxima / H | (0.1125, 0.22, 0.085) |
| Tamaño local X × Y × Z / H | (0.225, 0.22, 0.17) |
| Tamaño nominal de receta a H = 0.78 | (0.1755, 0.1716, 0.1326) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: ancho de mejillas y mentón. Perfil: profundidad y salida del mentón. Superior: sección de la cabeza. Tres cuartos: relación entre frente y laterales. La vista inferior permite comprobar el encuentro con el cuello.



Vistas técnicas individuales: [Frente](../../vistas/P01-cabeza/frente.png) · [Espalda](../../vistas/P01-cabeza/espalda.png) · [Izquierda](../../vistas/P01-cabeza/izquierda.png) · [Derecha](../../vistas/P01-cabeza/derecha.png) · [Superior](../../vistas/P01-cabeza/superior.png) · [Inferior](../../vistas/P01-cabeza/inferior.png) · [Tres cuartos](../../vistas/P01-cabeza/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Colocar mediante la instancia de assembly.json y vincular a head. El cuello entra en la zona inferior; ojos, sonrisa y orejas usan sus instancias independientes. El cabello cubre la zona superior sin reducir la altura visible de la cara fuera del contrato.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P01 | head | (0, 0.72, 0) | (0, 0, 0) | (1, 1, 1) | No |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P01 | P02 | origin | mount_P01 |

El padre de montaje describe el encuentro entre piezas. No sustituye al hueso de movimiento ni exige anidar un objeto renderizable bajo otro. Los sockets se resuelven en el espacio local de la instancia correspondiente y se llevan a raíz mediante su transformación.

### Sockets locales declarados

```json
{
  "origin": {
    "position_local_H": [
      0,
      0,
      0
    ],
    "description": "Origen numérico de esta pieza; montaje mediante assembly.json."
  },
  "mount_P03_L": {
    "position_local_H": [
      0.094,
      0.10399999999999998,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P03-L. Ver instancia padre P01.",
    "instance_scope": "P01"
  },
  "mount_P03_R": {
    "position_local_H": [
      -0.094,
      0.10399999999999998,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P03-R. Ver instancia padre P01.",
    "instance_scope": "P01"
  },
  "mount_P04_L": {
    "position_local_H": [
      0.035,
      0.10944843959688533,
      0.07819845750778266
    ],
    "description": "Anclaje derivado en reposo para P04-L. Ver instancia padre P01.",
    "instance_scope": "P01"
  },
  "mount_P04_R": {
    "position_local_H": [
      -0.035,
      0.10944843959688533,
      0.07819845750778266
    ],
    "description": "Anclaje derivado en reposo para P04-R. Ver instancia padre P01.",
    "instance_scope": "P01"
  },
  "mount_P05": {
    "position_local_H": [
      0.0,
      0.0624484395968854,
      0.07311391205323722
    ],
    "description": "Anclaje derivado en reposo para P05. Ver instancia padre P01.",
    "instance_scope": "P01"
  },
  "mount_P06": {
    "position_local_H": [
      0.0,
      0.0,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P06. Ver instancia padre P01.",
    "instance_scope": "P01"
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "closed",
  "limitations": [
    "Forma de apoyo simplificada; el cabello oculta el cierre superior. No incluye nariz saliente."
  ]
}
```

## Criterios de aceptación

- La altura de cabeza más cabello se comprueba desde el mentón hasta el máximo del conjunto, no midiendo solo esta pieza.
- Los ojos quedan sobre el frente y visibles desde la cámara elevada.
- La mandíbula conserva una transición hacia el cuello sin formar una base cuadrada excesiva.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No añadir nariz, cuencas, labios o subdivisiones de piel para reproducir sombras de la ilustración. No deformar esta pieza para compensar una cámara más elevada.

## Diferencia entre arte y geometría de apoyo

La ilustración redondea frente, mejillas y mentón mediante más anillos o biseles. El apoyo de veinte triángulos es un volumen de sección hexagonal con estrechamiento y ajuste de mandíbula; no reproduce exactamente ese contorno suave. Refinar la silueta exige revisar el reparto global de caras.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Cuello](P02-cuello.md) · [Oreja](P03-oreja.md) · [Ojo](P04-ojo.md) · [Sonrisa](P05-sonrisa.md) · [Núcleo del cabello](P06-cabello-nucleo.md) · [Mechón de flequillo](P07-mechon-flequillo.md)
