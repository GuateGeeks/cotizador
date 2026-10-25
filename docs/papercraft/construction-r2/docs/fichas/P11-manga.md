# P11 · Manga corta

## Referencias de esta pieza

- [Lámina artística con siete vistas y ubicación](../../imagenes/P11-manga.png).
- [Plano técnico PNG](../../planos/P11-manga.png) y [SVG ampliable](../../planos/P11-manga.svg).
- [Geometría de apoyo exacta](../../datos/P11-manga.json).
- [Montaje e instancias](../../datos/assembly.json).

La lámina artística fija la intención de forma y acabado. Los planos se derivan de la geometría de apoyo; sus proyecciones y los JSON son la autoridad para reproducir esa geometría. La imagen conceptual puede mostrar un acabado más rico que la receta mínima. Toda ampliación se cuenta y se valida de nuevo.

## Qué debe aportar

Rodear la parte superior del brazo mediante un volumen corto, ancho y facetado que no termine en una hombrera puntiaguda.

## Construcción

Cuatro paneles laterales entre dos secciones de cuatro vértices, ambas con ancho y profundidad positivos. La superficie lateral tiene ocho triángulos. Los extremos abiertos son una decisión de esta receta y deben quedar cubiertos en las poses admitidas.

**Construcción declarada en los datos:** Dos secciones rectangulares de cuatro vértices, cuatro paneles y ocho triángulos.

| Dato de la receta canónica | Valor |
| --- | --- |
| Unidades locales | Fracciones de la altura H; H = 0.78 unidades de escena |
| Vértices almacenados | 8 |
| Triángulos por receta | 8 |
| Instancias en este alumno | 2 |
| Triángulos aportados al conjunto | 16 |
| Caja local mínima / H | (-0.042, -0.065, -0.037) |
| Caja local máxima / H | (0.042, 0.01, 0.037) |
| Tamaño local X × Y × Z / H | (0.084, 0.075, 0.074) |
| Tamaño nominal de receta a H = 0.78 | (0.06552, 0.0585, 0.05772) |

La última fila multiplica la receta canónica por H, antes de la escala y orientación particulares de cada instancia. La caja local no es el pivote. Una dimensión de cero es válida en un aplique plano; sus caras deben conservar área positiva.

## Cómo leer las vistas

Frente: ancho superior no colapsado y abertura inferior. Perfil: profundidad y caída. Superior e inferior: secciones. Tres cuartos: volumen alrededor del brazo y encuentro con hombro.



Vistas técnicas individuales: [Frente](../../vistas/P11-manga/frente.png) · [Espalda](../../vistas/P11-manga/espalda.png) · [Izquierda](../../vistas/P11-manga/izquierda.png) · [Derecha](../../vistas/P11-manga/derecha.png) · [Superior](../../vistas/P11-manga/superior.png) · [Inferior](../../vistas/P11-manga/inferior.png) · [Tres cuartos](../../vistas/P11-manga/tres-cuartos.png).

Izquierda y derecha son **lados anatómicos del personaje**: +X es izquierda. En una vista frontal, el lado izquierdo del alumno aparece a la derecha de la imagen. Las vistas técnicas usan esta convención. La celda «Ubicación» es contexto de montaje, no una octava proyección de la pieza.

## Montaje

Una instancia por brazo, en armL y armR. El hombro y el brazo cubren las zonas de encaje. El pivote es el del rig, no el centro de la caja de la manga. Verificar reposo, alcance hacia mesa y brazo levantado.

| Instancia | Hueso | Posición raíz / H | Rotación ° X,Y,Z | Escala local | Reflejo X |
| --- | --- | --- | --- | --- | --- |
| P11-L | armL | (0.148, 0.68, 0) | (0, 0, 0) | (1, 1, 1) | No |
| P11-R | armR | (-0.148, 0.68, 0) | (0, 0, 0) | (1, 1, 1) | Sí |

Las posiciones son absolutas en el espacio raíz de reposo normalizado por H; no son offsets para sumar al pivote otra vez. Consulta [MONTAJE](../MONTAJE.md) antes de emitir en un builder que espera coordenadas locales al hueso.

### Relación con otras instancias

| Instancia | Padre de montaje | Socket propio | Socket en padre |
| --- | --- | --- | --- |
| P11-L | P08 | origin | mount_P11_L |
| P11-R | P08 | origin | mount_P11_R |

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
  "mount_P12_L": {
    "position_local_H": [
      0.0,
      0.0,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P12-L. Ver instancia padre P11-L.",
    "instance_scope": "P11-L"
  },
  "mount_P12_R": {
    "position_local_H": [
      -0.0,
      0.0,
      0.0
    ],
    "description": "Anclaje derivado en reposo para P12-R. Ver instancia padre P11-R.",
    "instance_scope": "P11-R"
  }
}
```

Los sockets describen referencias geométricas; un socket no crea un hueso ni un objeto de renderizado adicional. Cuando existe `instance_scope`, ese socket se interpreta sobre esa instancia padre concreta. La coincidencia de puntos no determina por sí sola la orientación: esta sigue estando fijada por la transformación de instancia.

### Superficies y límites declarados por la receta

```json
{
  "surface_kind": "open",
  "limitations": [
    "Ambos extremos abiertos. Su cobertura se valida en reposo; poses amplias pueden exigir tapas y rebalanceo del presupuesto."
  ]
}
```

## Criterios de aceptación

- Las dos secciones conservan área positiva.
- La manga rodea el brazo sin cortar su silueta con una aleta.
- Los extremos no dejan ver huecos desde las vistas y ángulos soportados; si los dejan, corregir montaje o contar cierres.
- Comparar la pieza aislada y montada con cámara y material reproducibles.
- Conservar el coste real indicado, o publicar el nuevo conteo si cambia la topología.

## Errores que hay que evitar

No colapsar la sección superior en una arista. No añadir tiras de pliegue que oculten un problema de volumen o creen caras coincidentes.

## Diferencia entre arte y geometría de apoyo

La ilustración puede sugerir una sección biselada o más planos. La receta exacta tiene dos secciones rectangulares y cuatro paneles, ocho triángulos. La prioridad común es que la sección superior tenga volumen.

Consulta también [DIFERENCIAS-ARTE-GEOMETRIA](../DIFERENCIAS-ARTE-GEOMETRIA.md). La lámina general y las miniaturas de ubicación pueden sugerir nariz, dedos, calcetas u otros detalles que no pertenecen al montaje de primaria. No incorporarlos sin una decisión explícita y un nuevo presupuesto.

## Piezas relacionadas

[Torso con chaleco](P08-torso-chaleco.md) · [Brazo superior](P12-brazo.md) · [Antebrazo](P13-antebrazo.md)
