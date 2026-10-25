# P18 · Zapato

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P18-zapato.png).
- [Plano técnico PNG](../../planos/P18-zapato.png) y [SVG ampliable](../../planos/P18-zapato.svg).
- [Geometría de apoyo exacta](../../datos/P18-zapato.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Producir un apoyo compacto con talón, empeine y puntera de volumen visible, evitando una lámina larga terminada en punta.

## Construcción

Volumen cerrado de pocos planos con perfil superior deliberado. El espesor frontal de la puntera debe permanecer positivo en la geometría de apoyo.

**Construcción declarada en los datos:** Prisma rectangular modificado de ocho vértices y doce triángulos.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 8 |
| Triángulos por receta | 12 |
| Instancias en este alumno | 2 |
| Triángulos aportados al conjunto | 24 |
| Caja local mínima / H | (-0.0435, 0, -0.048) |
| Caja local máxima / H | (0.0435, 0.06, 0.088) |
| Tamaño local X × Y × Z / H | (0.087, 0.06, 0.136) |
| Tamaño nominal de receta a H = 0.78 | (0.06786, 0.0468, 0.10608) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Perfil: talón, empeine y altura de puntera. Frente: ancho y volumen. Superior: longitud respecto al tobillo. Inferior: base de apoyo. Tres cuartos: proporción compacta dentro del personaje.



Vistas técnicas individuales: [Frente](../../vistas/P18-zapato/frente.png) · [Espalda](../../vistas/P18-zapato/espalda.png) · [Izquierda](../../vistas/P18-zapato/izquierda.png) · [Derecha](../../vistas/P18-zapato/derecha.png) · [Superior](../../vistas/P18-zapato/superior.png) · [Inferior](../../vistas/P18-zapato/inferior.png) · [Tres cuartos](../../vistas/P18-zapato/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Una instancia por lado, en shinL y shinR. +Z es el frente del personaje. Las suelas quedan en el suelo de referencia en reposo; la orientación de marcha procede del rig.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P18-L | shinL | (0.058, 0, 0) | (0, 0, 0) | (1, 1, 1) | No |
| P18-R | shinR | (-0.058, 0, 0) | (0, 0, 0) | (1, 1, 1) | Sí |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P18-L | P17-L | origin | mount_P18_L |
| P18-R | P17-R | origin | mount_P18_R |

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
    "Sin suela adicional ni detalles de cordones. La parte frontal tiene altura positiva."
  ]
}
```

## Criterios de aceptación

- La punta no se colapsa al plano de la suela.
- La longitud visual resulta proporcionada respecto a pierna y cabeza.
- Ambas suelas cumplen la cota de apoyo y mantienen relación con el tobillo.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No alargar una cuña para hacerla más visible. No añadir una suela separada, cordones o múltiples capas sin actualizar la geometría y su cuenta.

## Diferencia entre arte y geometría de apoyo

El arte puede sugerir una abertura superior o biseles adicionales. La receta de apoyo es un volumen cerrado de doce triángulos, sin cavidad interior. Añadir esa cavidad exige redistribuir caras.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Pantorrilla del pantalón](P17-pantorrilla-pantalon.md)
