# P16 · Muslo del pantalón

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P16-muslo-pantalon.png).
- [Plano técnico PNG](../../planos/P16-muslo-pantalon.png) y [SVG ampliable](../../planos/P16-muslo-pantalon.svg).
- [Geometría de apoyo exacta](../../datos/P16-muslo-pantalon.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Definir la parte superior de cada pierna con un cambio de sección que evite el aspecto de columna uniforme.

## Construcción

Segmento de pantalón cerrado y facetado, con sección más amplia hacia la cadera y menor hacia la rodilla según la receta.

**Construcción declarada en los datos:** Prisma rectangular cerrado de doce triángulos.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 8 |
| Triángulos por receta | 12 |
| Instancias en este alumno | 2 |
| Triángulos aportados al conjunto | 24 |
| Caja local mínima / H | (-0.042, -0.2, -0.0525) |
| Caja local máxima / H | (0.042, 0.01, 0.0525) |
| Tamaño local X × Y × Z / H | (0.084, 0.21, 0.105) |
| Tamaño nominal de receta a H = 0.78 | (0.06552, 0.1638, 0.0819) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: ancho y separación entre piernas. Perfil: profundidad y espacio al sentarse. Superior e inferior: sección y cierres. Ubicación: unión con pelvis y rodilla.



Vistas técnicas individuales: [Frente](../../vistas/P16-muslo-pantalon/frente.png) · [Espalda](../../vistas/P16-muslo-pantalon/espalda.png) · [Izquierda](../../vistas/P16-muslo-pantalon/izquierda.png) · [Derecha](../../vistas/P16-muslo-pantalon/derecha.png) · [Superior](../../vistas/P16-muslo-pantalon/superior.png) · [Inferior](../../vistas/P16-muslo-pantalon/inferior.png) · [Tres cuartos](../../vistas/P16-muslo-pantalon/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Las dos instancias siguen a legL y legR. La longitud y posición se relacionan con el pivote de rodilla del rig. Mantener parte superior cubierta por la pelvis y el bajo del uniforme.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P16-L | legL | (0.058, 0.45, 0) | (0, 0, 0) | (1, 1, 1) | No |
| P16-R | legR | (-0.058, 0.45, 0) | (0, 0, 0) | (1, 1, 1) | Sí |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P16-L | P15 | origin | mount_P16_L |
| P16-R | P15 | origin | mount_P16_R |

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
  "mount_P17_L": {
    "position_local_H": [
      0.0,
      -0.195,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P17-L. Ver instancia padre P16-L.",
    "instance_scope": "P16-L"
  },
  "mount_P17_R": {
    "position_local_H": [
      -0.0,
      -0.195,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P17-R. Ver instancia padre P16-R.",
    "instance_scope": "P16-R"
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "closed",
  "limitations": [
    "Cierre en rodilla se conserva para animación."
  ]
}
```

## Criterios de aceptación

- La rodilla se encuentra en la cota declarada.
- El cierre y solape con pantorrilla siguen funcionando al flexionar.
- El muslo cabe sobre el asiento sin atravesar la mesa por un ajuste de escala improvisado.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No mantener iguales todas las secciones solo para simplificar el código. No asignar una misma malla rígida a ambas piernas.

## Diferencia entre arte y geometría de apoyo

El arte incluye biseles o planos adicionales. La receta de apoyo es un segmento de sección rectangular cerrado de doce triángulos. Su estrechamiento, longitud y montaje se leen en los datos.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Pelvis del pantalón](P15-pelvis-pantalon.md) · [Pantorrilla del pantalón](P17-pantorrilla-pantalon.md)
