# P06 · Núcleo del cabello

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P06-cabello-nucleo.png).
- [Plano técnico PNG](../../planos/P06-cabello-nucleo.png) y [SVG ampliable](../../planos/P06-cabello-nucleo.svg).
- [Geometría de apoyo exacta](../../datos/P06-cabello-nucleo.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Crear una coronilla con relieve y una masa de pelo controlada que deje suficiente cara visible. El contorno debe sugerir papel facetado sin una tapa extensa y plana.

## Construcción

Núcleo por anillos y transición hacia una zona superior más pequeña y un ápice. Los vértices y caras del JSON fijan la construcción exacta. La abertura inferior es intencional y se monta sobre la cabeza.

**Construcción declarada en los datos:** Banda de 8 a 8 vértices: 16 triángulos; transición de 8 a 4: 12; ápice desplazado: 4.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 21 |
| Triángulos por receta | 32 |
| Instancias en este alumno | 1 |
| Triángulos aportados al conjunto | 32 |
| Caja local mínima / H | (-0.137, 0.02, -0.11) |
| Caja local máxima / H | (0.137, 0.28, 0.1) |
| Tamaño local X × Y × Z / H | (0.274, 0.26, 0.21) |
| Tamaño nominal de receta a H = 0.78 | (0.21372, 0.2028, 0.1638) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: ancho sobre sienes y altura de coronilla. Perfil: profundidad posterior. Superior: dirección de las crestas. Inferior: abertura y borde de encaje. Tres cuartos: jerarquía de planos y desplazamiento del punto alto.



Vistas técnicas individuales: [Frente](../../vistas/P06-cabello-nucleo/frente.png) · [Espalda](../../vistas/P06-cabello-nucleo/espalda.png) · [Izquierda](../../vistas/P06-cabello-nucleo/izquierda.png) · [Derecha](../../vistas/P06-cabello-nucleo/derecha.png) · [Superior](../../vistas/P06-cabello-nucleo/superior.png) · [Inferior](../../vistas/P06-cabello-nucleo/inferior.png) · [Tres cuartos](../../vistas/P06-cabello-nucleo/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Una instancia en head, montada según assembly.json. El núcleo y los tres mechones comparten movimiento. La cabeza cubre el interior; verificar el encuentro desde atrás y en las posiciones de cabeza admitidas.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P06 | head | (0, 0.72, 0) | (0, 0, 0) | (1, 1, 1) | No |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P06 | P01 | origin | mount_P06 |

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
  "mount_P07_L": {
    "position_local_H": [
      0.038,
      0.19000000000000006,
      0.094
    ],
    "description": "Anclaje derivado en reposo para P07-L. Ver instancia padre P06.",
    "instance_scope": "P06"
  },
  "mount_P07_C": {
    "position_local_H": [
      0.0,
      0.19000000000000006,
      0.094
    ],
    "description": "Anclaje derivado en reposo para P07-C. Ver instancia padre P06.",
    "instance_scope": "P06"
  },
  "mount_P07_R": {
    "position_local_H": [
      -0.038,
      0.19000000000000006,
      0.094
    ],
    "description": "Anclaje derivado en reposo para P07-R. Ver instancia padre P06.",
    "instance_scope": "P06"
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "open",
  "limitations": [
    "Abertura inferior intencional sobre la cabeza. No es un sólido imprimible."
  ]
}
```

## Criterios de aceptación

- El máximo del pelo determina H; no elevarlo para mejorar volumen sin recalcular el personaje.
- El núcleo se reconoce como una masa y el flequillo como una región diferenciada.
- La línea frontal no invade los ojos desde la cámara elevada.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No aumentar la triangulación de una meseta para intentar crear volumen. No pintar una mancha de luz direccional fuerte por vértice para suplir la forma.

## Diferencia entre arte y geometría de apoyo

El arte tiene una distribución de facetas, abertura y nuca más elaboradas; el núcleo de treinta y dos triángulos es una masa esquemática de apoyo. El borde frontal ilustrado puede parecer un flequillo. En el montaje numérico, las tres instancias P07 aportan el flequillo independiente y se cuentan por separado.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Cabeza](P01-cabeza.md) · [Oreja](P03-oreja.md) · [Mechón de flequillo](P07-mechon-flequillo.md)
