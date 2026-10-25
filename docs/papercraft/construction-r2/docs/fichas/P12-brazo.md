# P12 · Brazo superior

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P12-brazo.png).
- [Plano técnico PNG](../../planos/P12-brazo.png) y [SVG ampliable](../../planos/P12-brazo.svg).
- [Geometría de apoyo exacta](../../datos/P12-brazo.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Conectar hombro y codo con un segmento de piel ligero y facetado, parcialmente cubierto por la manga.

## Construcción

Segmento prismático simple, con cambios de sección definidos en la receta. Los cierres del volumen sirven para evitar extremos abiertos cuando la articulación se revela.

**Construcción declarada en los datos:** Prisma triangular cerrado, ocho triángulos.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 6 |
| Triángulos por receta | 8 |
| Instancias en este alumno | 2 |
| Triángulos aportados al conjunto | 16 |
| Caja local mínima / H | (-0.023, -0.133, -0.02925) |
| Caja local máxima / H | (0.023, -0.03, 0.01575) |
| Tamaño local X × Y × Z / H | (0.046, 0.103, 0.045) |
| Tamaño nominal de receta a H = 0.78 | (0.03588, 0.08034, 0.0351) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: ancho y longitud visible. Perfil: sección y orientación. Superior e inferior: cierres. Ubicación: cuánto queda bajo la manga y dónde se encuentra con el antebrazo.



Vistas técnicas individuales: [Frente](../../vistas/P12-brazo/frente.png) · [Espalda](../../vistas/P12-brazo/espalda.png) · [Izquierda](../../vistas/P12-brazo/izquierda.png) · [Derecha](../../vistas/P12-brazo/derecha.png) · [Superior](../../vistas/P12-brazo/superior.png) · [Inferior](../../vistas/P12-brazo/inferior.png) · [Tres cuartos](../../vistas/P12-brazo/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Las instancias siguen a armL y armR. Su longitud es coherente con el pivote de codo. Conserva el encuentro con antebrazo durante las rotaciones; el segmento no se estira para alcanzar accesorios.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P12-L | armL | (0.148, 0.68, 0) | (0, 0, 0) | (1, 1, 1) | No |
| P12-R | armR | (-0.148, 0.68, 0) | (0, 0, 0) | (1, 1, 1) | Sí |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P12-L | P11-L | origin | mount_P12_L |
| P12-R | P11-R | origin | mount_P12_R |

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
  "mount_P13_L": {
    "position_local_H": [
      0.0,
      -0.125,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P13-L. Ver instancia padre P12-L.",
    "instance_scope": "P12-L"
  },
  "mount_P13_R": {
    "position_local_H": [
      -0.0,
      -0.125,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P13-R. Ver instancia padre P12-R.",
    "instance_scope": "P12-R"
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "closed",
  "limitations": [
    "Prisma triangular de apoyo; revisar silueta del codo en giro."
  ]
}
```

## Criterios de aceptación

- La manga oculta la parte superior prevista.
- El pivote de codo y el extremo del brazo forman una articulación cubierta.
- Los dos lados mantienen proporción y asignación al hueso correcto.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No añadir una articulación nueva dentro de la pieza. No asignar huesos distintos a vértices de un mismo panel rígido.

## Diferencia entre arte y geometría de apoyo

La ilustración puede mostrar biseles y extremos con más planos. El apoyo es un prisma de sección triangular, cerrado y de ocho triángulos; los planos derivados muestran su sección real.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Manga corta](P11-manga.md) · [Antebrazo](P13-antebrazo.md)
