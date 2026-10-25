# P03 · Oreja

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P03-oreja.png).
- [Plano técnico PNG](../../planos/P03-oreja.png) y [SVG ampliable](../../planos/P03-oreja.svg).
- [Geometría de apoyo exacta](../../datos/P03-oreja.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Añadir un pequeño cambio de contorno en los laterales de la cabeza. Su función principal es la silueta, sin anatomía detallada.

## Construcción

Volumen pequeño de pocas caras. La receta representa una oreja canónica; el montaje genera el par mediante sus transformaciones. El color pertenece a la misma piel de cabeza y cuello.

**Construcción declarada en los datos:** Tetraedro de cuatro caras con base de encaje oculta.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 4 |
| Triángulos por receta | 4 |
| Instancias en este alumno | 2 |
| Triángulos aportados al conjunto | 8 |
| Caja local mínima / H | (0, -0.014, -0.016) |
| Caja local máxima / H | (0.038, 0.014, 0) |
| Tamaño local X × Y × Z / H | (0.038, 0.028, 0.016) |
| Tamaño nominal de receta a H = 0.78 | (0.02964, 0.02184, 0.01248) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: cuánto sobresale. Perfil: posición respecto al rostro. Superior e inferior: espesor. Ubicación: relación con sien y cabello; no es una pieza suelta flotando lejos de la cabeza.



Vistas técnicas individuales: [Frente](../../vistas/P03-oreja/frente.png) · [Espalda](../../vistas/P03-oreja/espalda.png) · [Izquierda](../../vistas/P03-oreja/izquierda.png) · [Derecha](../../vistas/P03-oreja/derecha.png) · [Superior](../../vistas/P03-oreja/superior.png) · [Inferior](../../vistas/P03-oreja/inferior.png) · [Tres cuartos](../../vistas/P03-oreja/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Instanciar dos veces con los valores de assembly.json y vincular a head. Mantener la raíz dentro del volumen de cabeza. Si hay reflexión local, corregir la orientación de las caras al emitir la geometría.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P03-L | head | (0.094, 0.824, 0) | (0, 0, 0) | (1, 1, 1) | No |
| P03-R | head | (-0.094, 0.824, 0) | (0, 0, 0) | (1, 1, 1) | Sí |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P03-L | P01 | origin | mount_P03_L |
| P03-R | P01 | origin | mount_P03_R |

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
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "closed",
  "limitations": [
    "La base penetra de forma intencional en la cabeza y el cabello; solo el extremo exterior queda visible. Sin cavidad anatómica ni detalles interiores."
  ]
}
```

## Criterios de aceptación

- Las dos orejas conservan escala y altura equivalentes según el montaje.
- La raíz queda cubierta; no hay una separación visible entre oreja y cabeza.
- El cabello puede ocultar parcialmente la oreja, sin crear una intersección molesta en perfil.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No añadir conductos, lóbulos o textura anatómica. No construir dos recetas independientes que diverjan sin intención.

## Diferencia entre arte y geometría de apoyo

El arte puede mostrar una oreja con biseles o planos adicionales. El apoyo numérico es un tetraedro de cuatro caras; su función es dar un pequeño cambio de contorno.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Cabeza](P01-cabeza.md) · [Núcleo del cabello](P06-cabello-nucleo.md)
