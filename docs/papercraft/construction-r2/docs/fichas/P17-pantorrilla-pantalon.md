# P17 · Pantorrilla del pantalón

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P17-pantorrilla-pantalon.png).
- [Plano técnico PNG](../../planos/P17-pantorrilla-pantalon.png) y [SVG ampliable](../../planos/P17-pantorrilla-pantalon.svg).
- [Geometría de apoyo exacta](../../datos/P17-pantorrilla-pantalon.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Conectar rodilla y tobillo con un segmento que conserve una caída recta y un estrechamiento moderado hacia el zapato.

## Construcción

Segmento cerrado de pantalón de sección sencilla. Sus extremos y variación de ancho se leen en el JSON y en las vistas técnicas.

**Construcción declarada en los datos:** Prisma rectangular cerrado de doce triángulos.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 8 |
| Triángulos por receta | 12 |
| Instancias en este alumno | 2 |
| Triángulos aportados al conjunto | 24 |
| Caja local mínima / H | (-0.0365, -0.21, -0.047) |
| Caja local máxima / H | (0.0365, 0.01, 0.047) |
| Tamaño local X × Y × Z / H | (0.073, 0.22, 0.094) |
| Tamaño nominal de receta a H = 0.78 | (0.05694, 0.1716, 0.07332) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: ancho hacia el tobillo. Perfil: profundidad. Superior e inferior: sección de unión. Ubicación: relación con rodilla, zapato y suelo.



Vistas técnicas individuales: [Frente](../../vistas/P17-pantorrilla-pantalon/frente.png) · [Espalda](../../vistas/P17-pantorrilla-pantalon/espalda.png) · [Izquierda](../../vistas/P17-pantorrilla-pantalon/izquierda.png) · [Derecha](../../vistas/P17-pantorrilla-pantalon/derecha.png) · [Superior](../../vistas/P17-pantorrilla-pantalon/superior.png) · [Inferior](../../vistas/P17-pantorrilla-pantalon/inferior.png) · [Tres cuartos](../../vistas/P17-pantorrilla-pantalon/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Las instancias siguen a shinL y shinR. Los zapatos comparten esos huesos. El largo de pierna debe mantener el suelo de referencia cuando la pose está de pie.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P17-L | shinL | (0.058, 0.255, 0) | (0, 0, 0) | (1, 1, 1) | No |
| P17-R | shinR | (-0.058, 0.255, 0) | (0, 0, 0) | (1, 1, 1) | Sí |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P17-L | P16-L | origin | mount_P17_L |
| P17-R | P16-R | origin | mount_P17_R |

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
  "mount_P18_L": {
    "position_local_H": [
      0.0,
      -0.255,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P18-L. Ver instancia padre P17-L.",
    "instance_scope": "P17-L"
  },
  "mount_P18_R": {
    "position_local_H": [
      -0.0,
      -0.255,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P18-R. Ver instancia padre P17-R.",
    "instance_scope": "P17-R"
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "closed",
  "limitations": [
    "Revisar alineación con zapato y cobertura del cambio de hueso."
  ]
}
```

## Criterios de aceptación

- El bajo del pantalón encuentra el zapato sin hueco ni intersección excesiva.
- La rodilla no se abre al sentarse.
- La altura de apoyo final se mide en las suelas, no en los pivotes de tibia.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No corregir la altura total alargando solo esta pieza. No crear calcetas blancas en esta variante de pantalón si el diseño base no las muestra.

## Diferencia entre arte y geometría de apoyo

El arte puede mostrar una abertura superior y biseles. La receta numérica está cerrada y tiene doce triángulos. La miniatura puede resaltar una región mayor de la pierna; la pieza corresponde solo al segmento de rodilla a tobillo.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Muslo del pantalón](P16-muslo-pantalon.md) · [Zapato](P18-zapato.md)
