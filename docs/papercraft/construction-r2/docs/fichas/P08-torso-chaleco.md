# P08 · Torso con chaleco

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P08-torso-chaleco.png).
- [Plano técnico PNG](../../planos/P08-torso-chaleco.png) y [SVG ampliable](../../planos/P08-torso-chaleco.svg).
- [Geometría de apoyo exacta](../../datos/P08-torso-chaleco.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Proporcionar el volumen principal del uniforme: hombros amplios, transición hacia cintura y frente violeta que permita leer el escote blanco.

## Construcción

Volumen facetado de sección poligonal con ancho y profundidad controlados. La geometría de apoyo integra el volumen visible del chaleco; no añade un torso humano completo debajo. El JSON declara los cierres y aberturas reales.

**Construcción declarada en los datos:** Dos anillos octagonales, dieciséis triángulos laterales y seis en tapa superior.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 16 |
| Triángulos por receta | 22 |
| Instancias en este alumno | 1 |
| Triángulos aportados al conjunto | 22 |
| Caja local mínima / H | (-0.13, -0.01, -0.071) |
| Caja local máxima / H | (0.13, 0.25, 0.071) |
| Tamaño local X × Y × Z / H | (0.26, 0.26, 0.142) |
| Tamaño nominal de receta a H = 0.78 | (0.2028, 0.2028, 0.11076) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: proporción de hombros y cintura. Perfil: profundidad. Superior: encuentro del cuello y pendiente de hombros. Inferior: encuentro con pelvis. Tres cuartos: relación con mangas y pechera.



Vistas técnicas individuales: [Frente](../../vistas/P08-torso-chaleco/frente.png) · [Espalda](../../vistas/P08-torso-chaleco/espalda.png) · [Izquierda](../../vistas/P08-torso-chaleco/izquierda.png) · [Derecha](../../vistas/P08-torso-chaleco/derecha.png) · [Superior](../../vistas/P08-torso-chaleco/superior.png) · [Inferior](../../vistas/P08-torso-chaleco/inferior.png) · [Tres cuartos](../../vistas/P08-torso-chaleco/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Vincular a torso. Colocar pechera, solapas, mochila y tirantes por sus instancias. La pelvis entra por el borde inferior; las mangas cubren las uniones laterales según los pivotes del rig.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P08 | torso | (0, 0.45, 0) | (0, 0, 0) | (1, 1, 1) | No |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P08 | P15 | origin | mount_P08 |

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
  "mount_P02": {
    "position_local_H": [
      0.0,
      0.24999999999999994,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P02. Ver instancia padre P08.",
    "instance_scope": "P08"
  },
  "mount_P09": {
    "position_local_H": [
      0.0,
      0.24017740853706032,
      0.06747128936123317
    ],
    "description": "Anclaje derivado en reposo para P09. Ver instancia padre P08.",
    "instance_scope": "P08"
  },
  "mount_P10_L": {
    "position_local_H": [
      0.004,
      0.2553725579278268,
      0.07258970765858967
    ],
    "description": "Anclaje derivado en reposo para P10-L. Ver instancia padre P08.",
    "instance_scope": "P08"
  },
  "mount_P10_R": {
    "position_local_H": [
      -0.004,
      0.2553725579278268,
      0.07258970765858967
    ],
    "description": "Anclaje derivado en reposo para P10-R. Ver instancia padre P08.",
    "instance_scope": "P08"
  },
  "mount_P11_L": {
    "position_local_H": [
      0.148,
      0.23000000000000004,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P11-L. Ver instancia padre P08.",
    "instance_scope": "P08"
  },
  "mount_P11_R": {
    "position_local_H": [
      -0.148,
      0.23000000000000004,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P11-R. Ver instancia padre P08.",
    "instance_scope": "P08"
  },
  "mount_P19": {
    "position_local_H": [
      0.0,
      0.04999999999999999,
      -0.109
    ],
    "description": "Anclaje derivado en reposo para P19. Ver instancia padre P08.",
    "instance_scope": "P08"
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "open",
  "limitations": [
    "Bajo abierto y oculto por pelvis en reposo. Comprobar unión al inclinar torso; sin garantía de todas las poses."
  ]
}
```

## Criterios de aceptación

- El ancho objetivo de hombros se mide en el torso, excluyendo mangas y brazos.
- El borde superior no forma una repisa sobredimensionada alrededor de la cabeza.
- El bajo mantiene cobertura sobre la pelvis durante las poses admitidas.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No sumar dos volúmenes completos coincidentes de camisa y chaleco. Los detalles visibles de camisa se resuelven con las piezas P09, P10 y P11.

## Diferencia entre arte y geometría de apoyo

La ilustración puede incluir recortes de escote o sisas y biseles más elaborados. El apoyo es un volumen octagonal de veintidós triángulos; la parte blanca se coloca mediante P09 y P10. Cortar un escote real requiere una topología revisada y un nuevo conteo.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Cuello](P02-cuello.md) · [Pechera visible de camisa](P09-pechera-camisa.md) · [Solapa del cuello de camisa](P10-solapa-cuello.md) · [Manga corta](P11-manga.md) · [Pelvis del pantalón](P15-pelvis-pantalon.md) · [Mochila](P19-mochila.md) · [Tirante de mochila](P20-tirante.md)
