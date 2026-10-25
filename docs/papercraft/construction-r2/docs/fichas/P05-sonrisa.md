# P05 · Sonrisa

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P05-sonrisa.png).
- [Plano técnico PNG](../../planos/P05-sonrisa.png) y [SVG ampliable](../../planos/P05-sonrisa.svg).
- [Geometría de apoyo exacta](../../datos/P05-sonrisa.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Conservar una expresión sencilla y legible, centrada en la zona inferior del rostro.

## Construcción

Superficie oscura plana que aproxima una sonrisa mediante pocos triángulos. Las coordenadas describen una forma gráfica, no una boca anatómica excavada.

**Construcción declarada en los datos:** Polígono cóncavo plano de cinco vértices, triangulación explícita.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 5 |
| Triángulos por receta | 3 |
| Instancias en este alumno | 1 |
| Triángulos aportados al conjunto | 3 |
| Caja local mínima / H | (-0.018, -0.008, -0.000865) |
| Caja local máxima / H | (0.018, 0, 0) |
| Tamaño local X × Y × Z / H | (0.036, 0.008, 0.000865) |
| Tamaño nominal de receta a H = 0.78 | (0.02808, 0.00624, 0.000675) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: curvatura, grosor y centrado. Perfil y vistas de canto: superficie plana. Tres cuartos: comprobar el apoyo sobre el frente facial, sin efecto de labios salientes.



Vistas técnicas individuales: [Frente](../../vistas/P05-sonrisa/frente.png) · [Espalda](../../vistas/P05-sonrisa/espalda.png) · [Izquierda](../../vistas/P05-sonrisa/izquierda.png) · [Derecha](../../vistas/P05-sonrisa/derecha.png) · [Superior](../../vistas/P05-sonrisa/superior.png) · [Inferior](../../vistas/P05-sonrisa/inferior.png) · [Tres cuartos](../../vistas/P05-sonrisa/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Una instancia vinculada a head. Copiar su transformación exacta y la relación con el frente de la cabeza; mantener separación geométrica normal para evitar caras coincidentes.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P05 | head | (0, 0.782448, 0.073114) | (0, 0, 0) | (1, 1, 1) | No |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P05 | P01 | origin | mount_P05 |

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
    "Cinco vértices y tres triángulos; no representa labios ni boca volumétrica."
  ]
}
```

## Criterios de aceptación

- La sonrisa queda centrada respecto al par de ojos.
- Su grosor sigue siendo discreto a 80–120 px de alto del personaje.
- No atraviesa la cabeza y se conserva estable al girarla.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No añadir dientes, cavidad interior, labios o animación facial en este alcance. La sonrisa no necesita un hueso propio.

## Diferencia entre arte y geometría de apoyo

La lámina puede mostrar más facetas y un borde físico. El apoyo numérico es una superficie plana de cinco vértices y tres triángulos. No se incorpora una boca volumétrica.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Cabeza](P01-cabeza.md) · [Ojo](P04-ojo.md)
