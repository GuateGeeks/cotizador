# Verificación y criterios de aceptación

## 1. Qué significa validar este paquete

La validación geométrica del paquete se realiza sobre los JSON entregados. Los planos se obtienen de esos datos. El informe [VALIDACION-GEOMETRICA.json](../VALIDACION-GEOMETRICA.json) es la evidencia de las comprobaciones implementadas y de sus resultados; leer sus campos de alcance y limitaciones.

Desde la carpeta raíz descomprimida, esta comprobación vuelve a leer los JSON y no los modifica:

```bash
python3 herramientas/generar_planos.py --validate-only
```

Consultar `herramientas/README.md` antes de regenerar archivos. La opción `--presets` restablece y sobrescribe explícitamente las recetas originales; no se usa para validar ediciones propias.

El conteo reproducido por las fichas es **280 triángulos**, calculado como la suma de caras de cada receta multiplicada por sus instancias. La cuenta no incluye geometría de una aplicación que todavía no se ha integrado ni un presupuesto ficticio de reserva.

Una superficie abierta no se invalida automáticamente por tener bordes de contorno: los apliques y ciertas prendas están diseñados de ese modo. Deben distinguirse de un sólido que necesita cierres. La clasificación y las limitaciones de cada pieza se leen en su metadata.

## 2. Capas de comprobación

| Capa | Qué demuestra | Qué no demuestra |
| --- | --- | --- |
| Datos de pieza | Índices y coordenadas válidos, áreas, conteos y límites incluidos en el validador. | Parecido artístico o cobertura de articulaciones. |
| Montaje de reposo | Posiciones, jerarquía, total y medidas que el informe compruebe. | Ausencia de penetraciones en cualquier pose. |
| Planos técnicos | Vistas coherentes de una geometría concreta. | Que el render artístico coincida vértice por vértice. |
| Láminas artísticas | Dirección visual y detalles que una persona puede revisar. | Topología certificada o reconstrucción exacta a partir de píxeles. |
| Integración real | Comportamiento del builder, rig, material y escena probados. | Rendimiento en dispositivos no medidos. |

## 3. Revisión visual de componentes

Para cada pieza comprobar identidad, color, cantidad, orientación y coherencia entre vistas. Las siete vistas principales son de la pieza canónica; la celda «Ubicación» puede mostrar una instancia dentro del alumno completo.

En apliques planos, una vista de canto puede ser una línea. No exigir un volumen artificial para que todas las celdas sean igualmente vistosas. En componentes simétricos, los planos de un lado pueden parecerse; la orientación de sus instancias sigue siendo explícita en el montaje.

| Pieza o conjunto | Señal de aprobación |
| --- | --- |
| Cabeza y rostro | Cara visible, ojos y sonrisa centrados, proporciones juveniles. |
| Núcleo y flequillo | Coronilla con relieve, dirección de mechones, ojos libres desde cámara elevada. |
| Camisa y chaleco | Escote y cuello integrados, hombros sin repisa excesiva. |
| Mangas | Dos secciones amplias, volumen alrededor del brazo y encuentros cubiertos. |
| Manos | Palma compacta y orientación consistente. |
| Pantalón | Cambio de sección y separación legible de piernas. |
| Zapatos | Puntera con altura, talón y empeine compactos. |
| Mochila y tirantes | Posición posterior y recorrido de correas coherentes. |

## 4. Pruebas necesarias al integrar en el cotizador

| Control | Evidencia requerida |
| --- | --- |
| Comparación inicial | Configuración, semilla, cámara, pose, luz y escala del modelo anterior. |
| Proporciones | Medidas sobre vértices transformados en reposo; H desde suela a cabello. |
| Rig | Doce nombres y padres correctos, asignaciones de hueso y rigidez de paneles. |
| Capas | Separaciones normales de las superficies designadas en unidades finales. |
| Articulaciones | Reposo, fases de marcha, sentado, trabajo en mesa y transiciones. |
| Bounds | El personaje deformado queda dentro de la envolvente usada para culling. |
| Lectura | Vistas nativas a 80/120 px y acercamiento a 600 px, más cámara del campus. |
| Presupuesto | Caras realmente emitidas por pieza, accesorios y auxiliares, con total explícito. |
| Determinismo | Misma semilla/configuración produce los mismos buffers. |
| Rendimiento | Escena y dispositivo comparables; estadísticas y tiempos sin promesas no medidas. |

Para el control de poses, inspeccionar tanto extremos como posiciones intermedias que puedan revelar huecos. Los JSON de apoyo no sustituyen esa revisión. Las transformaciones del rig actual pueden cambiar los encuentros respecto a una imagen estática.

## 5. Condición de cierre de la implementación

La tarea de Claude queda completa cuando el alumno esté integrado, los componentes puedan inspeccionarse y exista una comparación reproducible del antes y después. Entregar manifestación de lo implementado, comprobado numéricamente, revisado visualmente y pendiente por falta de entorno o dispositivo.

La documentación de este paquete evita afirmar que esas pruebas de integración ya se realizaron. Cualquier informe posterior debe incluir fecha, revisión de código, configuración y alcance concreto.
