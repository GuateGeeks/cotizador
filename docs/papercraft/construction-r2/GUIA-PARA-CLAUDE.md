# Encargo para Claude · Alumno de primaria por piezas R2

Trabaja sobre el repositorio real del cotizador 3D de GuateGeeks. Usa este paquete para construir un alumno papercraft mediante componentes documentados y reproducibles. Completa el alcance de implementación y validación; avanza de forma autónoma en decisiones reversibles y explica cualquier bloqueo concreto de acceso o entorno.

## Resultado esperado

Un alumno de primaria con cabello corto, camisa blanca, chaleco violeta, pantalón marino, zapatos oscuros y mochila turquesa, integrado en el generador existente. Debe poder inspeccionarse completo y por piezas, con una comparación reproducible del antes y después.

Este encargo se limita a ese alumno. Conserva el funcionamiento de otros niveles, faldas, peinados y accesorios existentes mientras mejoras la base. No alteres lógica comercial, cantidades ni precios del cotizador.

## Material que debes leer

1. `README.md` y `docs/CONTRATO-VISUAL.md`.
2. `imagenes/00-personaje-completo.png` y `imagenes/21-montaje-explotado.png`.
3. Las veinte fichas en `docs/fichas/`, con sus láminas artísticas y planos.
4. `datos/assembly.json` y los veinte JSON de piezas.
5. `docs/MONTAJE.md`, `docs/INTEGRACION.md`, `docs/QA.md` y el informe geométrico.

Las imágenes comunican intención artística. Los JSON y planos fijan la geometría de apoyo y el montaje exactos de esta entrega. No deduzcas coordenadas, medidas o número de polígonos de las facetas dibujadas por el arte. Los apliques planos y superficies abiertas son decisiones explícitas; no los extruyas automáticamente.

La propuesta R2 específica de primaria sustituye para este alumno los presupuestos de planificación anteriores. El conjunto entregado contiene 20 recetas, 33 instancias y **280 triángulos**. No sumes nuevamente orejas, ojos, sonrisa o tirantes: ya están incluidos. Cualquier cierre, bolsillo, canto o detalle añadido cambia el presupuesto.

## Fase 1 · Reconocer y guardar una comparación inicial

Localiza el generador, builder, material, esqueleto, poses, escena e inspector vigentes. En el kit histórico aparecen `addPaperPerson`, `pieces-people.js`, `kit.js` y `campus-people.js`; verifica sus rutas y APIs reales. Revisa instrucciones del repositorio y conserva los cambios locales existentes.

Antes de editar geometría, registra una configuración fija del alumno actual y captura frente, perfil, espalda, tres cuartos y cámara elevada del campus. Conserva semilla, pose, escala, encuadre, luz y material para comparar. Si modificas material o iluminación, muestra su efecto en una comparación separada.

## Fase 2 · Contrato global y piezas

Usa el sistema de ejes y unidades del montaje: +Y arriba, +Z frente, +X izquierda anatómica; piezas normalizadas por H y H = 0.78. La altura se mide desde suela a máximo del pelo en reposo. Los puntos de referencia están en `landmarks_H`.

Separa perfil, recetas, instancias, emisión y manifiesto. Cada pieza debe mantener identificador, dimensiones, origen, sockets, hueso, caras, colores y clasificación de superficies. Reutiliza recetas para las instancias reflejadas o escaladas. Mantén una fuente de verdad para datos, documentación y conteos.

Conserva los doce huesos existentes y sus funciones. La tabla del rig entrega pivotes en espacio raíz de reposo; conviértelos correctamente si el constructor espera posiciones relativas al padre.

## Fase 3 · Construcción con prioridades visuales

Implementa primero masas y proporciones del alumno. Después corrige:

- Núcleo del cabello con coronilla y perfil legibles, y tres mechones que respeten el rostro.
- Chaleco, escote y hojas del cuello con capas coherentes.
- Mangas con dos secciones amplias, evitando un extremo superior colapsado.
- Zapatos compactos con altura frontal de puntera y empeine.
- Encuentros de extremidades y recorrido de mochila/tirantes.

Abre cada lámina y plano antes de resolver su pieza. Revisa el componente aislado y montado. Mantén una semilla fija y limita la aleatoriedad hasta aprobar la base. El detalle de nariz, dedos, costuras o bolsillos que pudiera insinuar el arte no se incorpora gratuitamente.

## Fase 4 · Ensamblaje y emisión

Aplica las transformaciones según `docs/MONTAJE.md`: para vectores columna, escala/reflexión local, Rx, Ry, Rz y traslación. Los ángulos están en grados. Las posiciones de instancia están en raíz de reposo; no volver a sumar el pivote del hueso.

Verifica si el builder recibe vértices locales al hueso o en raíz y realiza la conversión adecuada. Aplica H una vez, de forma coherente entre geometría y rig. Si hay reflexión, corrige el winding una sola vez donde lo requiera el pipeline.

Emite los componentes hacia el sistema de agrupamiento que ya utiliza el cotizador. Veinte recetas no exigen veinte mallas o materiales, y no justifican reemplazar un batching existente por una malla por personaje. Preserva normales, colores, índices y asignaciones al esqueleto.

Cada vértice usa una influencia no nula de peso 1 y cada panel rígido comparte hueso. Pelo y rostro siguen a head; manos al antebrazo; zapatos a la tibia; mochila y correas al torso. No añadas huesos para pliegues decorativos.

Mantén el sombreado plano, material mate y color por vértice del proyecto. Comprueba el tratamiento sRGB/lineal para evitar conversiones duplicadas. Las capas superpuestas designadas deben conservar 0.004 unidades finales de separación normal; los solapes ocultos de articulación se documentan por separado.

## Fase 5 · Inspector y validación

Amplía el inspector existente para aislar piezas y consultar identificador, hueso y triángulos. Permite ver wireframe, ejes y puntos de unión. La inspección puede usar metadata y rangos de índices sin conservar un objeto independiente por pieza en producción.

Comprueba:

- Índices y atributos válidos, caras de área positiva y orientación coherente.
- Conteo real por instancia y total, con accesorios y auxiliares diferenciados.
- Altura final, proporción de cabeza y ancho de torso.
- Asignaciones a huesos y rigidez de paneles.
- Separaciones de capa y encuentros visibles.
- Reposo, fases de marcha, sentado, trabajo en mesa y transiciones.
- Bounds adecuados para las poses admitidas.
- Frente, perfil, espalda, tres cuartos y cámara elevada del campus.
- Lectura nativa a 80/120 px de alto y revisión a 600 px.
- Determinismo de configuración y semilla.

El límite del estudiante es 280 triángulos según el contrato del proyecto. La cuenta del paquete es una referencia de apoyo; compara con las caras que el builder emite realmente. La reserva contable no es geometría, y las sombras u otros auxiliares deben identificarse explícitamente.

El montaje entregado ocupa los 280 triángulos. Si el builder atribuye auxiliares al límite o si necesitas añadir biseles, cierres, recortes de escote o una cavidad de zapato para acercarte al arte, redistribuye el presupuesto antes de añadirlos. Consulta `docs/DIFERENCIAS-ARTE-GEOMETRIA.md` para identificar esas diferencias deliberadas.

Compara el coste de renderizado con la misma escena, resolución, DPR y dispositivo. Si existe acceso al hardware objetivo, registra tiempos de frame y estadísticas. Si falta, entrega las comprobaciones realizadas y especifica qué medición queda pendiente. No presentes una mejora de FPS sin medirla.

## Entrega

1. Código integrado en el repositorio.
2. Contratos y documentación de componentes actualizados.
3. Manifiesto derivado de la geometría realmente emitida.
4. Capturas antes/después con configuración equivalente.
5. Capturas de los componentes principales aislados y montados.
6. Resultados de validación y limitaciones concretas.
7. Instrucciones para abrir el inspector y reproducir la comparación.

Considera cerrado el trabajo cuando el alumno esté integrado, pueda inspeccionarse por piezas y exista evidencia que permita juzgar la mejora visual y el coste. Extiende después a otros niveles solo como un encargo posterior, usando esta base comprobada.
