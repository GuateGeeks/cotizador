# P04 · Ojo

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P04-ojo.png).
- [Plano técnico PNG](../../planos/P04-ojo.png) y [SVG ampliable](../../planos/P04-ojo.svg).
- [Geometría de apoyo exacta](../../datos/P04-ojo.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Producir un punto oscuro pequeño y amable que se lea en el tamaño de uso del campus.

## Construcción

Aplique plano romboide de dos triángulos en la geometría de apoyo. Se usa dos veces. El acabado conceptual puede suavizar ópticamente ese rombo; no exige una esfera ni una textura.

**Construcción declarada en los datos:** Rombo plano triangulado, dos triángulos.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 4 |
| Triángulos por receta | 2 |
| Instancias en este alumno | 2 |
| Triángulos aportados al conjunto | 4 |
| Caja local mínima / H | (-0.006, -0.009, -0.000974) |
| Caja local máxima / H | (0.006, 0.009, 0.000974) |
| Tamaño local X × Y × Z / H | (0.012, 0.018, 0.001947) |
| Tamaño nominal de receta a H = 0.78 | (0.00936, 0.01404, 0.001519) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: anchura, altura y contorno. Perfil, superior e inferior: confirman que es una superficie plana de espesor geométrico nulo. Tres cuartos: relación con el plano facial. La pequeña vista de ubicación muestra el par completo.



Vistas técnicas individuales: [Frente](../../vistas/P04-ojo/frente.png) · [Espalda](../../vistas/P04-ojo/espalda.png) · [Izquierda](../../vistas/P04-ojo/izquierda.png) · [Derecha](../../vistas/P04-ojo/derecha.png) · [Superior](../../vistas/P04-ojo/superior.png) · [Inferior](../../vistas/P04-ojo/inferior.png) · [Tres cuartos](../../vistas/P04-ojo/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Ambas instancias siguen a head y se sitúan sobre el frente de la cabeza, con la separación indicada respecto a esa superficie. La distancia de capa se comprueba en escena, normal al frente, después de escalar.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P04-L | head | (0.035, 0.829448, 0.078198) | (0, 0, 0) | (1, 1, 1) | No |
| P04-R | head | (-0.035, 0.829448, 0.078198) | (0, 0, 0) | (1, 1, 1) | No |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P04-L | P01 | origin | mount_P04_L |
| P04-R | P01 | origin | mount_P04_R |

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
  "surface_kind": "planar",
  "limitations": [
    "Superficie sin espesor; vistas de canto casi lineales. La orientación coincide con la cara frontal de la cabeza."
  ]
}
```

## Criterios de aceptación

- El par mantiene la separación y altura de assembly.json.
- La vista elevada no oculta el ojo bajo el flequillo.
- Los ojos no parpadean por coplanaridad y no parecen bloques salientes.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No transformar la ilustración del ojo en un globo ocular, pupila con reflejo o malla de muchas caras. Una vista de canto estrecha es correcta para este aplique.

## Diferencia entre arte y geometría de apoyo

El arte puede sugerir relieve o más facetas. El ojo numérico es un aplique plano romboide de dos triángulos. La forma ovalada del ojo en el personaje de ubicación es dirección artística, no una segunda receta.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Cabeza](P01-cabeza.md) · [Sonrisa](P05-sonrisa.md) · [Mechón de flequillo](P07-mechon-flequillo.md)
