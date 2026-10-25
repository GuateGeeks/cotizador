# Integración en el cotizador

## 1. Revisa el proyecto antes de adaptar los datos

Localiza el generador vigente de personajes, el builder de geometría, materiales, rig, poses, escena e inspector. En el kit histórico aparecen `pieces-people.js`, `kit.js` y `campus-people.js`, pero no se incluyó el builder completo ni el renderizador. Verifica las APIs reales y conserva la interfaz pública, opciones, semillas y valor de retorno que utilice el cotizador.

El kit histórico ya construye formas por facetas y asigna piezas mediante huesos. Esta entrega hace explícitas las piezas y sus contratos; no exige reemplazar toda la arquitectura.

## 2. Separación de responsabilidades

| Responsabilidad | Resultado esperado |
| --- | --- |
| Resolver perfil | Opciones y medidas globales estables para primaria. |
| Cargar o traducir receta | Vértices, caras y colores locales de la pieza. |
| Planificar instancias | Lista de componentes, transformaciones, huesos y coste previsto. |
| Emitir geometría | Datos compatibles con el builder existente. |
| Registrar manifiesto | Rango y coste real de cada instancia emitida. |
| Inspeccionar | Vistas del conjunto y aislamiento de componentes. |
| Animar | Poses mediante el rig existente, partiendo de reposo inmutable. |

Los JSON pueden incorporarse como datos o convertirse en funciones JavaScript equivalentes. En ambos casos, mantener una fuente de verdad y una prueba de correspondencia de vértices, caras, transformaciones y conteos. Los PNG y planos son documentación y no tienen que formar parte del bundle de producción.

## 3. Mantener el agrupamiento del renderizador

Construir veinte recetas independientes no implica veinte mallas, veinte materiales ni veinte huesos. Emitir hacia el builder que ya usa el proyecto. Los comentarios del kit histórico describen agrupamiento por capa y rig de entidad, pero hay que comprobar la implementación real.

Si se combina geometría con herramientas de Three.js, preservar atributos compatibles, índices, color, normales, `skinIndex` y `skinWeight`. `mergeGeometries` combina geometrías compatibles; no realiza una unión booleana ni decide la jerarquía del personaje. Una geometría con varios grupos de material puede producir varias llamadas de dibujo; agrupar bajo un nombre no demuestra que se haya reducido el coste.

La autoría debe conservar el identificador de cada pieza en un manifiesto. El runtime puede usar menos objetos, según el diseño actual de batches, culling y animación. No introducir una malla por personaje si eso empeora una agrupación que ya funciona.

## 4. Espacios y rig

Seguir la conversión de [MONTAJE](MONTAJE.md). La posición de instancia en raíz no se suma de nuevo a la posición de un hueso. Construir el rig y el bind con la convención real del proyecto.

Una influencia por vértice y un hueso común por panel conservan el movimiento rígido. Al flexionar una articulación, el encuentro se resuelve por la geometría de cobertura; no se introducen pesos suaves que doblen la cartulina sin una decisión explícita.

Al aplicar poses, restaurar o consultar las matrices de reposo y calcular la transformación deseada. Evitar acumular rotaciones o trasladar vértices cada frame desde un estado ya transformado. Mantener bounds correctos para las poses admitidas, mediante actualización o una envolvente conservadora verificada.

## 5. Colores y normales

Comprobar si el builder ya convierte los colores de la paleta al espacio que espera el material. Una doble conversión altera la apariencia. El color por vértice puede separar planos y regiones, pero una luz fuerte pintada en coordenadas locales puede entrar en conflicto con la iluminación de la escena al rotar las piezas.

Conservar discontinuidades de normales y colores donde exista un borde de papel. Soldar por posición sin atender atributos puede cambiar el acabado. Duplicar un vértice de posición para conservar un borde duro no representa por sí solo un error geométrico.

## 6. Determinismo y variantes

El alumno R2 usa una configuración fija. Una misma receta y configuración deben emitir los mismos buffers. Para introducir variaciones, asignar claves independientes de semilla a pelo, piel, ropa y accesorios; cambiar mochila no debería modificar el rostro.

Cada variante nueva necesita su propio plan de coste. Las orejas, tirantes y apliques ya forman parte del alumno entregado: no se añaden nuevamente. Bolsillos, dedos, suelas extra o cierres nuevos consumen geometría y deben constar en el manifiesto.

## 7. Integración con el producto

Mantener la relación del personaje con aulas, mesas y asientos. El crecimiento del colegio y las reglas comerciales del cotizador siguen usando su estado existente. La revisión de un componente no debe cambiar cantidades, precios, capacidad de aulas o disponibilidad de servicios.

La configuración del panel lateral debe seguir funcionando aunque la escena esté pausada o no esté visible. Respetar las preferencias de movimiento reducido y reutilizar las políticas de animación e inactividad del proyecto.

## 8. Verificación del coste real

Comparar el antes y el después con la misma escena, cantidad de personajes, cámara, resolución, DPR y dispositivo. Registrar tiempo de generación y de frame, llamadas de dibujo, geometría y memoria cuando el entorno permita medirlas.

`renderer.info` ofrece estadísticas de renderizado y memoria. Si el frame usa varias pasadas, contabilizarlas consistentemente; no comparar una pasada de color con todo el frame. Las capturas con un renderizador de software sirven para revisión visual, pero no representan el rendimiento de un teléfono.

Fuentes de las APIs: [FUENTES](FUENTES.md). Los detalles específicos de rig, presupuesto y estilo proceden del contrato del proyecto; los resultados de rendimiento deben proceder de la aplicación integrada.
