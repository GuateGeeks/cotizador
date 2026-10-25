# P19 · Mochila

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P19-mochila.png).
- [Plano técnico PNG](../../planos/P19-mochila.png) y [SVG ampliable](../../planos/P19-mochila.svg).
- [Geometría de apoyo exacta](../../datos/P19-mochila.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Identificar al alumno de primaria mediante un volumen turquesa claramente colocado sobre la espalda.

## Construcción

Volumen compacto cerrado de apoyo. La geometría prioriza silueta y proporción; cualquier bolsillo, tapa o costura sugerida por el render conceptual es detalle opcional que requiere geometría y coste propios.

**Construcción declarada en los datos:** Prisma cerrado de ocho vértices y doce triángulos.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 8 |
| Triángulos por receta | 12 |
| Instancias en este alumno | 1 |
| Triángulos aportados al conjunto | 12 |
| Caja local mínima / H | (-0.0775, 0, -0.0335) |
| Caja local máxima / H | (0.0775, 0.155, 0.0335) |
| Tamaño local X × Y × Z / H | (0.155, 0.155, 0.067) |
| Tamaño nominal de receta a H = 0.78 | (0.1209, 0.1209, 0.05226) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Espalda: tamaño respecto al torso. Perfil: profundidad y separación del cuerpo. Superior: ancho y posición sobre hombros. Inferior: base. Tres cuartos: lectura del turquesa y volumen.



Vistas técnicas individuales: [Frente](../../vistas/P19-mochila/frente.png) · [Espalda](../../vistas/P19-mochila/espalda.png) · [Izquierda](../../vistas/P19-mochila/izquierda.png) · [Derecha](../../vistas/P19-mochila/derecha.png) · [Superior](../../vistas/P19-mochila/superior.png) · [Inferior](../../vistas/P19-mochila/inferior.png) · [Tres cuartos](../../vistas/P19-mochila/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Una instancia en torso, en la parte posterior −Z. Las correas son piezas separadas sobre hombros y pecho. La mochila permanece unida al torso en todas las poses de esta variante.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P19 | torso | (0, 0.5, -0.109) | (0, 0, 0) | (1, 1, 1) | No |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P19 | P08 | origin | mount_P19 |

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
  "mount_P20_L": {
    "position_local_H": [
      0.064,
      0.19999999999999996,
      0.18
    ],
    "description": "Anclaje derivado en reposo para P20-L. Ver instancia padre P19.",
    "instance_scope": "P19"
  },
  "mount_P20_R": {
    "position_local_H": [
      -0.064,
      0.19999999999999996,
      0.18
    ],
    "description": "Anclaje derivado en reposo para P20-R. Ver instancia padre P19.",
    "instance_scope": "P19"
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "closed",
  "limitations": [
    "Sin bolsillo, cierre, asa o solapa geométrica independiente. Añadirlos exige redistribuir el presupuesto."
  ]
}
```

## Criterios de aceptación

- El tamaño no tapa por completo el contorno de brazos o cabeza.
- La raíz posterior queda colocada sobre el torso y no flotando.
- Sentado y trabajando, la mochila no atraviesa la silla o produce una intersección relevante; ajustar la variante o su visibilidad según las reglas reales del proyecto.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No confundir la vista posterior de la mochila con el frente anatómico del alumno. No convertir detalles ilustrados en accesorios gratuitos.

## Diferencia entre arte y geometría de apoyo

El cuerpo ilustrado tiene biseles más elaborados que el apoyo cerrado de doce triángulos. La receta no incluye bolsillo ni correas: estas últimas son P20 y se cuentan como instancias separadas.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Torso con chaleco](P08-torso-chaleco.md) · [Tirante de mochila](P20-tirante.md)
