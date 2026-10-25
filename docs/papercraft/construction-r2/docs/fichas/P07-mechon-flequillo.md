# P07 · Mechón de flequillo

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P07-mechon-flequillo.png).
- [Plano técnico PNG](../../planos/P07-mechon-flequillo.png) y [SVG ampliable](../../planos/P07-mechon-flequillo.svg).
- [Geometría de apoyo exacta](../../datos/P07-mechon-flequillo.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Dar dirección al cabello mediante una lámina plegada que interrumpe el contorno sobre la frente.

## Construcción

Receta canónica de lámina plegada con dos paneles triangulados. El montaje usa tres instancias con sus posiciones, orientaciones y escalas. La base queda integrada visualmente bajo el núcleo del pelo.

**Construcción declarada en los datos:** Dos cuadriláteros no coplanares, cuatro triángulos.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 6 |
| Triángulos por receta | 4 |
| Instancias en este alumno | 3 |
| Triángulos aportados al conjunto | 12 |
| Caja local mínima / H | (-0.022, -0.055, -0.006521) |
| Caja local máxima / H | (0.022, 0.004, 0.012571) |
| Tamaño local X × Y × Z / H | (0.044, 0.059, 0.019093) |
| Tamaño nominal de receta a H = 0.78 | (0.03432, 0.04602, 0.014892) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: contorno y punta. Perfil: relieve del pliegue. Superior: cresta y orientación. Inferior: reverso abierto. Tres cuartos: comprobar que se lee como una lámina y no como un cono.



Vistas técnicas individuales: [Frente](../../vistas/P07-mechon-flequillo/frente.png) · [Espalda](../../vistas/P07-mechon-flequillo/espalda.png) · [Izquierda](../../vistas/P07-mechon-flequillo/izquierda.png) · [Derecha](../../vistas/P07-mechon-flequillo/derecha.png) · [Superior](../../vistas/P07-mechon-flequillo/superior.png) · [Inferior](../../vistas/P07-mechon-flequillo/inferior.png) · [Tres cuartos](../../vistas/P07-mechon-flequillo/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Las tres instancias siguen a head. Aplicar exactamente sus transformaciones; no colocarlas sumando separaciones arbitrarias en pantalla. Sus raíces se solapan en la zona definida del núcleo y sus puntas dejan libres los ojos.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P07-L | head | (0.038, 0.91, 0.094) | (0, 0, -7) | (1, 1, 1) | No |
| P07-C | head | (0, 0.91, 0.094) | (0, 0, 6) | (1, 1, 1) | No |
| P07-R | head | (-0.038, 0.91, 0.094) | (0, 0, 10) | (1, 1, 1) | No |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P07-L | P06 | origin | mount_P07_L |
| P07-C | P06 | origin | mount_P07_C |
| P07-R | P06 | origin | mount_P07_R |

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
  "surface_kind": "open",
  "limitations": [
    "Superficie plegada sin espesor. Las puntas deben permanecer por encima de los ojos."
  ]
}
```

## Criterios de aceptación

- Cada mechón mantiene una cresta visible y paneles sin área nula.
- La repetición produce un flequillo coherente, sin tres piezas idénticas alineadas mecánicamente.
- El reverso y los bordes se evalúan con el material y las vistas realmente admitidos.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No añadir un hueso por mechón. No duplicar las mismas caras en posición coincidente para simular reverso. Si se requiere espesor, presupuestar y contar el cambio.

## Diferencia entre arte y geometría de apoyo

El arte muestra el carácter de una lámina plegada y puede incluir más líneas de faceta. La receta exacta usa cuatro triángulos; las tres instancias se determinan por assembly.json, sin copiar un número de mechones de la miniatura de ubicación.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Cabeza](P01-cabeza.md) · [Ojo](P04-ojo.md) · [Núcleo del cabello](P06-cabello-nucleo.md)
