# P10 · Solapa del cuello de camisa

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P10-solapa-cuello.png).
- [Plano técnico PNG](../../planos/P10-solapa-cuello.png) y [SVG ampliable](../../planos/P10-solapa-cuello.svg).
- [Geometría de apoyo exacta](../../datos/P10-solapa-cuello.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Hacer reconocible un cuello de camisa con dos hojas blancas que nacen alrededor de la base del cuello.

## Construcción

Una hoja triangular plana de cartulina, usada dos veces. Su inclinación y posición se definen en el montaje; el pliegue y la superposición deben leerse sin añadir espesor arbitrario.

**Construcción declarada en los datos:** Un triángulo por solapa; dos instancias.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 3 |
| Triángulos por receta | 1 |
| Instancias en este alumno | 2 |
| Triángulos aportados al conjunto | 2 |
| Caja local mínima / H | (0, -0.044, 0) |
| Caja local máxima / H | (0.045, 0, 0.004523) |
| Tamaño local X × Y × Z / H | (0.045, 0.044, 0.004523) |
| Tamaño nominal de receta a H = 0.78 | (0.0351, 0.03432, 0.003528) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: punta y proporción de la hoja. Perfil: inclinación respecto al pecho. Superior: salida desde el cuello. Inferior: reverso. Ubicación: relación del par de solapas con la pechera.



Vistas técnicas individuales: [Frente](../../vistas/P10-solapa-cuello/frente.png) · [Espalda](../../vistas/P10-solapa-cuello/espalda.png) · [Izquierda](../../vistas/P10-solapa-cuello/izquierda.png) · [Derecha](../../vistas/P10-solapa-cuello/derecha.png) · [Superior](../../vistas/P10-solapa-cuello/superior.png) · [Inferior](../../vistas/P10-solapa-cuello/inferior.png) · [Tres cuartos](../../vistas/P10-solapa-cuello/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Las dos instancias siguen a torso, alrededor del cuello. La reflexión del lado opuesto conserva el papel de cada punta. Aplicar los valores de montaje y verificar el orden de profundidad respecto a P09.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P10-L | torso | (0.004, 0.705373, 0.07259) | (0, 0, 0) | (1, 1, 1) | No |
| P10-R | torso | (-0.004, 0.705373, 0.07259) | (0, 0, 0) | (1, 1, 1) | Sí |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P10-L | P08 | origin | mount_P10_L |
| P10-R | P08 | origin | mount_P10_R |

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
    "Aplique triangular inclinado. Requiere distancia normal respecto a la pechera."
  ]
}
```

## Criterios de aceptación

- Las dos hojas forman un cuello legible y no un conjunto de triángulos decorativos desconectados.
- La capa blanca no entra en el volumen del cuello o del chaleco.
- La orientación de caras permite su lectura desde la cámara principal.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No añadir un hueso o material exclusivo por solapa. La orientación anatómica izquierda/derecha se determina con los ejes del personaje.

## Diferencia entre arte y geometría de apoyo

El arte puede representar un borde biselado o un pliegue. El apoyo numérico es una sola superficie triangular plana por solapa. La inclinación de montaje genera su lectura como hoja del cuello; no se añaden caras a partir del relieve ilustrado.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Cuello](P02-cuello.md) · [Torso con chaleco](P08-torso-chaleco.md) · [Pechera visible de camisa](P09-pechera-camisa.md)
