# P02 · Cuello

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P02-cuello.png).
- [Plano técnico PNG](../../planos/P02-cuello.png) y [SVG ampliable](../../planos/P02-cuello.svg).
- [Geometría de apoyo exacta](../../datos/P02-cuello.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Separar de forma controlada la cabeza del uniforme y permitir el giro de cabeza conservando una unión discreta.

## Construcción

Pequeño volumen prismático de piel, deliberadamente simple. La parte visible es corta; los extremos se insertan en las piezas vecinas según las posiciones exactas del montaje.

**Construcción declarada en los datos:** Prisma triangular cerrado y ligeramente cónico.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 6 |
| Triángulos por receta | 8 |
| Instancias en este alumno | 1 |
| Triángulos aportados al conjunto | 8 |
| Caja local mínima / H | (-0.0225, -0.02, -0.026) |
| Caja local máxima / H | (0.0225, 0.045, 0.014) |
| Tamaño local X × Y × Z / H | (0.045, 0.065, 0.04) |
| Tamaño nominal de receta a H = 0.78 | (0.0351, 0.0507, 0.0312) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente y perfil: longitud visible y espesor. Superior e inferior: sección y cierres. Tres cuartos: comprobar que el facetado pertenece al mismo lenguaje de la cabeza.



Vistas técnicas individuales: [Frente](../../vistas/P02-cuello/frente.png) · [Espalda](../../vistas/P02-cuello/espalda.png) · [Izquierda](../../vistas/P02-cuello/izquierda.png) · [Derecha](../../vistas/P02-cuello/derecha.png) · [Superior](../../vistas/P02-cuello/superior.png) · [Inferior](../../vistas/P02-cuello/inferior.png) · [Tres cuartos](../../vistas/P02-cuello/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Seguir el hueso declarado en la instancia, que forma parte del conjunto de cabeza. Mantener el solape con cabeza y torso al girar. El origen de esta pieza no sustituye el pivote head definido por el rig.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P02 | head | (0, 0.7, 0) | (0, 0, 0) | (1, 1, 1) | No |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P02 | P08 | origin | mount_P02 |

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
  "mount_P01": {
    "position_local_H": [
      0.0,
      0.020000000000000018,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P01. Ver instancia padre P02.",
    "instance_scope": "P02"
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "closed",
  "limitations": [
    "Sigue a head; revisar cobertura inferior al inclinar la cabeza."
  ]
}
```

## Criterios de aceptación

- La altura visible se mide después del montaje, descontando los solapes.
- La camisa y el escote no exponen un hueco al girar la cabeza en las poses admitidas.
- El pivote de cabeza permanece en la posición del rig aunque se cambie el largo de este volumen.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No sumar dos veces el largo del cuello al calcular H. No convertirlo en un segmento articulado nuevo.

## Diferencia entre arte y geometría de apoyo

La geometría exacta es un prisma de sección triangular. Algunas vistas artísticas pueden sugerir una sección con más lados; ese facetado adicional no forma parte de los ocho triángulos de la receta.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Cabeza](P01-cabeza.md) · [Torso con chaleco](P08-torso-chaleco.md) · [Pechera visible de camisa](P09-pechera-camisa.md) · [Solapa del cuello de camisa](P10-solapa-cuello.md)
