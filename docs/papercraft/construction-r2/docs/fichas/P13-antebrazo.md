# P13 · Antebrazo

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P13-antebrazo.png).
- [Plano técnico PNG](../../planos/P13-antebrazo.png) y [SVG ampliable](../../planos/P13-antebrazo.svg).
- [Geometría de apoyo exacta](../../datos/P13-antebrazo.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Unir codo y mano con una forma sencilla que permita poses de escritura, agarre y descanso.

## Construcción

Segmento prismático de piel, reducido hacia la muñeca según la receta. El facetado debe acompañar el volumen y conservar cierres útiles para las poses.

**Construcción declarada en los datos:** Prisma triangular cerrado de secciones variables.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 6 |
| Triángulos por receta | 8 |
| Instancias en este alumno | 2 |
| Triángulos aportados al conjunto | 16 |
| Caja local mínima / H | (-0.0205, -0.118, -0.026) |
| Caja local máxima / H | (0.0205, 0.009, 0.0239) |
| Tamaño local X × Y × Z / H | (0.041, 0.127, 0.0499) |
| Tamaño nominal de receta a H = 0.78 | (0.03198, 0.09906, 0.038922) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente y perfil: estrechamiento y eje longitudinal. Superior e inferior: sección del codo y de la muñeca. Tres cuartos: relación entre caras y orientación de la futura mano.



Vistas técnicas individuales: [Frente](../../vistas/P13-antebrazo/frente.png) · [Espalda](../../vistas/P13-antebrazo/espalda.png) · [Izquierda](../../vistas/P13-antebrazo/izquierda.png) · [Derecha](../../vistas/P13-antebrazo/derecha.png) · [Superior](../../vistas/P13-antebrazo/superior.png) · [Inferior](../../vistas/P13-antebrazo/inferior.png) · [Tres cuartos](../../vistas/P13-antebrazo/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Vincular a foreL o foreR, con el pivote de codo declarado en el rig. La mano comparte ese hueso en esta versión. Utilizar sus transformaciones separadas para mantener la posición de la muñeca.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P13-L | foreL | (0.148, 0.555, 0) | (0, 0, 0) | (1, 1, 1) | No |
| P13-R | foreR | (-0.148, 0.555, 0) | (0, 0, 0) | (1, 1, 1) | Sí |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P13-L | P12-L | origin | mount_P13_L |
| P13-R | P12-R | origin | mount_P13_R |

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
  "mount_P14_L": {
    "position_local_H": [
      0.0,
      -0.11800000000000005,
      0.012
    ],
    "description": "Anclaje derivado en reposo para P14-L. Ver instancia padre P13-L.",
    "instance_scope": "P13-L"
  },
  "mount_P14_R": {
    "position_local_H": [
      -0.0,
      -0.11800000000000005,
      0.012
    ],
    "description": "Anclaje derivado en reposo para P14-R. Ver instancia padre P13-R.",
    "instance_scope": "P13-R"
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "closed",
  "limitations": [
    "La mano comparte foreL/foreR; no hay hueso adicional de muñeca."
  ]
}
```

## Criterios de aceptación

- La parte superior se encuentra correctamente con el brazo al flexionar el codo.
- La mano no queda desconectada al posar.
- La longitud no cambia entre reposo, marcha y trabajo en mesa.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No confundir el pivote del codo con el centro geométrico. No aplicar rotaciones acumulativas que alteren la postura de reposo.

## Diferencia entre arte y geometría de apoyo

La ilustración puede mostrar biseles y extremos con más planos. El apoyo es un prisma de sección triangular, cerrado y de ocho triángulos, colocado entre codo y mano mediante el montaje.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Brazo superior](P12-brazo.md) · [Mano simplificada](P14-mano.md)
