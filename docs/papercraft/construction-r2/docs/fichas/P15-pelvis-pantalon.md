# P15 · Pelvis del pantalón

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P15-pelvis-pantalon.png).
- [Plano técnico PNG](../../planos/P15-pelvis-pantalon.png) y [SVG ampliable](../../planos/P15-pelvis-pantalon.svg).
- [Geometría de apoyo exacta](../../datos/P15-pelvis-pantalon.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Conectar el bajo del chaleco con las dos piernas sin una discontinuidad visible de color o volumen.

## Construcción

Banda de pantalón de pocas caras. Las aberturas declaradas se ocultan por el torso y los segmentos superiores de piernas en el montaje de referencia.

**Construcción declarada en los datos:** Banda rectangular de cuatro paneles, ocho triángulos.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 8 |
| Triángulos por receta | 8 |
| Instancias en este alumno | 1 |
| Triángulos aportados al conjunto | 8 |
| Caja local mínima / H | (-0.1175, -0.031, -0.065) |
| Caja local máxima / H | (0.1175, 0.022, 0.065) |
| Tamaño local X × Y × Z / H | (0.235, 0.053, 0.13) |
| Tamaño nominal de receta a H = 0.78 | (0.1833, 0.04134, 0.1014) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: ancho de cintura y transición hacia piernas. Perfil: profundidad. Superior e inferior: aberturas y encuentros. Ubicación: relación con bajo del chaleco y muslos.



Vistas técnicas individuales: [Frente](../../vistas/P15-pelvis-pantalon/frente.png) · [Espalda](../../vistas/P15-pelvis-pantalon/espalda.png) · [Izquierda](../../vistas/P15-pelvis-pantalon/izquierda.png) · [Derecha](../../vistas/P15-pelvis-pantalon/derecha.png) · [Superior](../../vistas/P15-pelvis-pantalon/superior.png) · [Inferior](../../vistas/P15-pelvis-pantalon/inferior.png) · [Tres cuartos](../../vistas/P15-pelvis-pantalon/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Una instancia en hips. Los muslos tienen sus propios huesos legL y legR y no deben quedar soldados a esta pieza para animar. Mantener los solapes y revisar sentado y caminando.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P15 | hips | (0, 0.45, 0) | (0, 0, 0) | (1, 1, 1) | No |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P15 | Raíz | origin | — |

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
  "mount_P08": {
    "position_local_H": [
      0.0,
      0.0,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P08. Ver instancia padre P15.",
    "instance_scope": "P15"
  },
  "mount_P16_L": {
    "position_local_H": [
      0.058,
      0.0,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P16-L. Ver instancia padre P15.",
    "instance_scope": "P15"
  },
  "mount_P16_R": {
    "position_local_H": [
      -0.058,
      0.0,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P16-R. Ver instancia padre P15.",
    "instance_scope": "P15"
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "open",
  "limitations": [
    "Bocas superior e inferior abiertas; la inferior se cubre parcialmente con ambos muslos. Revisar vista inferior y poses sentadas."
  ]
}
```

## Criterios de aceptación

- La cintura queda cubierta por el chaleco según el montaje.
- Las piernas tienen una separación legible y no forman una columna única.
- La postura sentada no expone huecos relevantes en la unión central.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No añadir un segundo cuerpo interior completo. No afirmar que una banda abierta está cerrada en cualquier pose; esa cobertura se verifica en la integración.

## Diferencia entre arte y geometría de apoyo

El arte puede sugerir un contorno octagonal o biselado. La receta numérica es una banda de sección rectangular con cuatro paneles y ocho triángulos, abierta arriba y abajo.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Torso con chaleco](P08-torso-chaleco.md) · [Muslo del pantalón](P16-muslo-pantalon.md)
