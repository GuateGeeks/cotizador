# P14 · Mano simplificada

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P14-mano.png).
- [Plano técnico PNG](../../planos/P14-mano.png) y [SVG ampliable](../../planos/P14-mano.svg).
- [Geometría de apoyo exacta](../../datos/P14-mano.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Dar una terminación legible al brazo y una superficie de contacto para objetos, conservando una silueta compacta.

## Construcción

Pequeño volumen facetado que resume palma y terminación de dedos. El modelo de apoyo evita dedos individuales y articulaciones adicionales.

**Construcción declarada en los datos:** Prisma triangular cerrado, ocho triángulos.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 6 |
| Triángulos por receta | 8 |
| Instancias en este alumno | 2 |
| Triángulos aportados al conjunto | 16 |
| Caja local mínima / H | (-0.0205, -0.047, -0.0221) |
| Caja local máxima / H | (0.0205, 0.006, 0.02305) |
| Tamaño local X × Y × Z / H | (0.041, 0.053, 0.04515) |
| Tamaño nominal de receta a H = 0.78 | (0.03198, 0.04134, 0.035217) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente y perfil: volumen de palma, ancho y espesor. Superior e inferior: entrada de muñeca y extremo. Ubicación: orientación respecto al antebrazo y al objeto que podría sostener.



Vistas técnicas individuales: [Frente](../../vistas/P14-mano/frente.png) · [Espalda](../../vistas/P14-mano/espalda.png) · [Izquierda](../../vistas/P14-mano/izquierda.png) · [Derecha](../../vistas/P14-mano/derecha.png) · [Superior](../../vistas/P14-mano/superior.png) · [Inferior](../../vistas/P14-mano/inferior.png) · [Tres cuartos](../../vistas/P14-mano/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Una por lado, vinculada al mismo hueso que su antebrazo. La orientación de la palma resulta de la transformación de la instancia y de la pose, sin un hueso de muñeca nuevo.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P14-L | foreL | (0.148, 0.437, 0.012) | (0, 0, 0) | (1, 1, 1) | No |
| P14-R | foreR | (-0.148, 0.437, 0.012) | (0, 0, 0) | (1, 1, 1) | Sí |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P14-L | P13-L | origin | mount_P14_L |
| P14-R | P13-R | origin | mount_P14_R |

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
    "Sin dedos ni pulgar separado. Es un volumen de apoyo facetado."
  ]
}
```

## Criterios de aceptación

- La entrada de muñeca mantiene el solape previsto con el antebrazo.
- Las dos manos no quedan orientadas de manera incompatible con la anatomía del personaje.
- En una pose de agarre, la mano llega al punto de contacto sin estirar el segmento.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No intentar replicar pulgares o dedos insinuados por el render con geometría extra sin actualizar presupuesto y vistas. No interpretar esta simplificación como una mano anatómica realista.

## Diferencia entre arte y geometría de apoyo

La ilustración puede incluir acabado, sombras o bordes que no se expresan como caras adicionales en la receta. La geometría de apoyo y sus posiciones están fijadas por los JSON.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Antebrazo](P13-antebrazo.md) · [Tirante de mochila](P20-tirante.md)
