# P20 · Tirante de mochila

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P20-tirante.png).
- [Plano técnico PNG](../../planos/P20-tirante.png) y [SVG ampliable](../../planos/P20-tirante.svg).
- [Geometría de apoyo exacta](../../datos/P20-tirante.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Conectar visualmente mochila, hombro y pecho mediante una banda estrecha y continua.

## Construcción

Banda de tres paneles triangulados: tramo de pecho, puente sobre el hombro y descenso hacia la mochila. El montaje utiliza una receta canónica a ambos lados; cada receta tiene seis triángulos.

**Construcción declarada en los datos:** Tres paneles rectangulares, seis triángulos por tirante.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 8 |
| Triángulos por receta | 6 |
| Instancias en este alumno | 2 |
| Triángulos aportados al conjunto | 12 |
| Caja local mínima / H | (-0.009, -0.15, -0.155) |
| Caja local máxima / H | (0.009, 0.02, 0.008) |
| Tamaño local X × Y × Z / H | (0.018, 0.17, 0.163) |
| Tamaño nominal de receta a H = 0.78 | (0.01404, 0.1326, 0.12714) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: ancho y recorrido vertical. Perfil: cambio de dirección sobre el hombro. Superior: encuentro con mochila. Inferior: reverso abierto. Ubicación: relación con cuello, chaleco y mano.



Vistas técnicas individuales: [Frente](../../vistas/P20-tirante/frente.png) · [Espalda](../../vistas/P20-tirante/espalda.png) · [Izquierda](../../vistas/P20-tirante/izquierda.png) · [Derecha](../../vistas/P20-tirante/derecha.png) · [Superior](../../vistas/P20-tirante/superior.png) · [Inferior](../../vistas/P20-tirante/inferior.png) · [Tres cuartos](../../vistas/P20-tirante/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Dos instancias vinculadas a torso. Respetar la posición respecto al frente del chaleco y al hombro. La mano puede colocarse sobre un punto de contacto mediante la pose del brazo; el tirante no se mueve con la mano.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P20-L | torso | (0.064, 0.7, 0.071) | (0, 0, 0) | (1, 1, 1) | No |
| P20-R | torso | (-0.064, 0.7, 0.071) | (0, 0, 0) | (1, 1, 1) | Sí |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P20-L | P19 | origin | mount_P20_L |
| P20-R | P19 | origin | mount_P20_R |

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
    "Superficie sin espesor. El puente mantiene holgura sobre el hombro en reposo."
  ]
}
```

## Criterios de aceptación

- La banda conserva separación de capa donde cubre el chaleco.
- Los dos lados mantienen un recorrido coherente hasta la mochila.
- La pose de agarre coloca la palma sobre el tirante sin desplazar el conjunto del torso.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No crear dos prismas gruesos verticales para simular correas. No asignar el tirante al antebrazo porque una mano lo toque. Si se añade espesor, contar caras y verificar su efecto a tamaño pequeño.

## Diferencia entre arte y geometría de apoyo

La ilustración puede distribuir sus paneles sobre pecho y hombro sin mostrar un descenso posterior completo. El recorrido exacto del JSON es pecho, puente de hombro y descenso hacia la mochila: tres paneles y seis triángulos. Usar esa ruta al montar para evitar una correa incompleta o atravesando el torso.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Torso con chaleco](P08-torso-chaleco.md) · [Mano simplificada](P14-mano.md) · [Mochila](P19-mochila.md)
