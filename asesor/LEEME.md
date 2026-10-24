# Asesor de programas GuateGeeks (diseño 2.1)

Experiencia guiada en cinco pasos: niveles, estudiantes y secciones, programas, equipos y modalidad, y propuesta institucional.
Es una página estática (HTML, CSS y JavaScript sin dependencias). No modifica `index.html` ni el flujo de despliegue de Colegio Costa Sur.

## Probar en local

```bash
cd ~/Desktop/cotizador
python3 -m http.server 8000
```

Abre `http://localhost:8000/asesor/index.html`. Con `#ejemplo` al final de la dirección se carga un colegio de demostración.

```bash
node --test asesor/test/motor.test.js asesor/test/pdf.test.js
```

## Archivos

| Archivo | Qué contiene |
|---|---|
| `asesor/config.js` | Datos editables: niveles, programas, compatibilidad, ratios, modalidades, tarifas, fiscalidad, acceso a Sócrates y fotos |
| `asesor/motor.js` | Cálculo puro (equipos, capacidad, estudiantes únicos, importes, estados). Sin DOM |
| `asesor/asesor.js` | Interfaz y borrador local (clave `gg_asesor_v1`, esquema versión 1) |
| `asesor/asesor.css` | Diseño 2.1 más ajustes de integración al final |
| `asesor/pdf.js` | Escritor mínimo de PDF (texto, formas e imágenes JPEG), sin dependencias |
| `asesor/propuesta-pdf.js` | Diseño del PDF de la cotización: hoja 1 con logo, cifras, inversión, forma de pago y programas; luego el detalle de cada programa con la foto del equipo, pagos mes a mes y condiciones |
| `asesor/test/motor.test.js`, `asesor/test/pdf.test.js` | Pruebas del motor y de la estructura del PDF |
| `assets/equipos/` | Fotos optimizadas (900 px) de Tale-Bot, Robot Master, SPIKE Prime, electrónica, drones y Meta Quest |

## Cómo editar

- **Nuevo programa o área:** agrega un objeto a `PROGRAMS` en `config.js` (`id`, `area`, `hardware`, `ratio`, `grades`, `levels`) y sus fotos en `PHOTOS`. El flujo no cambia.
- **Compatibilidad por grado:** edita `grades` de cada programa (ids de grado de `LEVELS`). Bachillerato tiene 4.º (`bc4`) y 5.º (`bc5`).
- **Ratio de estudiantes por equipo:** edita `ratio`. Con `ratio: null` el programa muestra «Equipamiento por definir con GuateGeeks» y queda como «Requiere cotización personalizada». Ratios actuales: Tale-Bot 2; Robot Master, SPIKE Prime, electrónica, drones y Meta Quest 3.
- **Modalidades y textos de lo que incluyen:** `PLANS` en `config.js`.
- **Tarifas:** `TARIFFS` (por equipo, sin IVA). Reglas comerciales en `FISCAL`: IVA, pago inicial, descuentos de renta por bimestres, plazos y factores de Evoluciona.
- **Fotos:** copia la imagen a `assets/equipos/` y agrégala a `PHOTOS` indicando los niveles donde se muestra. La marcada con `pdf: true` es la foto del equipo que sale en la cotización en PDF.

## Reglas del cálculo

- Equipos por grupo: `ceil(estudiantes / estudiantes por equipo)`.
- Grupos en horarios distintos: el máximo de los grupos. Grupos simultáneos: la suma de sus equipos; la recomendación es el mayor entre el bloque simultáneo y los demás grupos.
- Horarios desconocidos: se muestra un escenario mínimo y uno máximo, sin cobertura garantizada.
- Con menos equipos que los recomendados se muestra la capacidad por turno y las rotaciones mínimas, y hay que elegir trabajo por estaciones.
- Importes en quetzales enteros (redondeados).
- Cualquier cambio de estudiantes, grupos, equipos, horarios o modalidad deja el importe como «pendiente de actualizar» hasta recalcularlo.

## Lógica de cotización (tomada de costa-sur.js)

- INTEGRA: precio de compra × equipos; pago único.
- FLEX: renta por equipo y bimestre × equipos × bimestres, con descuento de 0, 2, 4 o 5 % según 1, 2, 3 o 4 bimestres. Es un solo monto por todo el periodo, sin pago inicial ni cuotas (como la compra); el plazo (bimestres × 2 meses) solo se usa en el simulador.
- Evoluciona 8 y 16 (los únicos con pago inicial y cuotas): precio de referencia por 5 equipos ÷ 5 × equipos × 1.06 (8 meses) o 1.10 (16 meses); 20 % de pago inicial y el resto en cuotas mensuales.
- IVA 12 %. Importes en quetzales enteros. En Evoluciona todas las cuotas son iguales: el precio absorbe el ajuste de unos pocos quetzales para que no quede una cuota final distinta.
- Aviso informativo cuando hay menos de 5 equipos (mínimo comercial).
- Simulador: cuota sugerida = total con IVA ÷ estudiantes ÷ meses ÷ 0.75, redondeada hacia arriba a múltiplos de 5. El simulador solo aparece para renta por bimestre (Flex) y Evoluciona; no se muestra para la compra de equipos (Integra). La diferencia bruta no es utilidad neta.

## Revisión de diseño con Impeccable

El proyecto tiene instalado Impeccable (`.claude/`) para revisar el diseño. Con el servidor local en marcha:

```bash
npx impeccable detect http://localhost:8000/asesor/index.html#ejemplo
```

La tipografía Avenir Next / Inter es la de la marca GuateGeeks, por eso el aviso de «fuente muy usada» se acepta a propósito.

## Limitaciones y pendientes

- Las tarifas y fórmulas son las del cotizador vigente (`costa-sur.js`). Evoluciona escala por unidad desde el precio de referencia de 5 equipos con los factores 1.06 y 1.10; confirmar con GuateGeeks que esa regla aplica a cualquier cantidad.
- Los ratios de electrónica, drones y Meta Quest (3 estudiantes por equipo) y sus grados se definieron con GuateGeeks; sus tarifas (electrónica, drones y Meta Quest) fueron confirmadas con GuateGeeks.
- El acceso a Sócrates por grado (`SOCRATES`) es un dato por confirmar.
- La propuesta solo se descarga como PDF (`Descargar cotización en PDF`); no hay solicitud de revisión ni copiado de texto, y nada se envía a GuateGeeks. El PDF se genera en el navegador e incluye las fotos cuando la página se abre desde un servidor (con `file://` el navegador bloquea leerlas y el PDF sale sin fotos).
- La página no se publica: `.github/workflows/pages.yml` solo copia `index.html`, `costa-sur.*` y `assets/`. Para publicarla habría que agregar `asesor/` a ese flujo.
- No hay prueba automática del recorrido completo en el navegador (el repositorio no tiene herramientas para ello); el recorrido se verificó a mano.

## Portada: laboratorio 3D

La portada (`renderLanding()` en `asesor.js`) muestra una escena 3D a todo el ancho del hero: un robot de ruedas que se puede desarmar, bloques de programación y piezas de construcción. Se gira arrastrando (doble clic para volver), «Desarmar el robot» separa sus piezas y los puntos de la escena abren una ficha de cada parte (Esc la cierra). Es una escena conceptual: no reproduce Tale-Bot, Robot Master ni SPIKE Prime.

- `lab/lab-scene.js`: código fuente de la escena (geometrías propias, sin modelos externos).
- `vendor/lab-scene.min.js`: la escena compilada junto con las partes usadas de three.js (613 KB; unos 158 KB comprimido, incluye el entorno de estudio `RoomEnvironment` de three.js). Se carga solo en la portada, después del texto y los botones, con un `<script>` normal, así que también funciona abriendo el archivo directamente.
- `vendor/THREE-LICENSE.txt`: licencia MIT de three.js 0.186.1 (https://github.com/mrdoob/three.js).
- Si no hay WebGL, el script no carga o se pierde el contexto, queda la ilustración SVG incluida en la página. Con «reducir movimiento» activado la escena no se anima y la secuencia solo ilumina los bloques.

Para recompilar tras editar `lab/lab-scene.js` (necesita `three` instalado en `node_modules` junto al archivo de entrada):

```bash
npx esbuild lab/lab-scene.js --bundle --minify --format=iife --global-name=GGLab --target=es2019 --legal-comments=none --outfile=vendor/lab-scene.min.js
```

Después sube el `?v=` de `lab-scene.min.js` en `initLab()`.

## Mini colegio 3D del recorrido

En los pasos 1 a 5 (solo escritorio, sin «reducir movimiento») arriba del resumen lateral hay una visualización 3D del colegio. Empieza como una escuela sencilla, sin tecnología, y evoluciona hacia algo más futurista conforme se avanza y se eligen niveles:

1. **Niveles:** cada nivel elegido levanta su edificio (los demás quedan como lote con cartel «+ Nivel») y los colores pasan de apagados a los de la marca.
2. **Estudiantes:** camino, farolas, árboles y estudiantes en el patio (según la matrícula).
3. **Programas:** aparecen las estaciones (robótica, electrónica, drones, realidad virtual) con sus estudiantes, el dron y un robot que patrulla.
4. **Personalizar:** paneles solares y árboles del fondo.
5. **Resumen:** sube la bandera y salen destellos.

El «nivel de futuro» (`techGoal` en `update()`) sube con los niveles elegidos y los pasos; con él cambian materiales, suelo con cuadrícula, neón en los techos, anillo holográfico y luces. Se puede mover: arrastrar orbita, clic derecho o Mayús+arrastrar desplaza, la rueda del ratón acerca y aleja (en los límites deja pasar el scroll de la página) y doble clic restablece la vista. No hay juego. Código: `createMascot()` en `lab/lab-scene.js`; `placeMascot()` y `mascotData()` en `asesor.js` lo reubican y lo actualizan tras cada pantalla sin recrear el WebGL.

## Pato robot del avance

Los cinco pasos son cajas con su nombre (✓ en los hechos) y el pato robot 3D vive **dentro** de ellas, sin franja ni burbuja adicional (`createDuck()` en `lab/lab-scene.js`, `placeDuck()` en `asesor.js`): en la caja del paso actual ocupa el lugar del círculo numerado y, al avanzar **corre** hasta la caja nueva: arranca rápido, corre inclinado hacia adelante moviendo patas y aletas, y frena derrapando al llegar; la caja rebota como si la pisara y el pato se voltea a mirar a la persona. Cada etapa tiene su comportamiento:

1. **Niveles:** saluda moviendo las aletas y girando la cabeza.
2. **Estudiantes:** se sienta.
3. **Programas:** tropieza, se cae de frente, se queda un momento en el suelo y se levanta.
4. **Personalizar:** baila.
5. **Resumen:** celebra con saltos y un giro.

Además sigue el cursor con la cabeza y reacciona (saltito y cabeceo) cuando haces clic o escribes. La barra de pasos ya no es fija: se desplaza con la página y, al bajar, solo queda una línea fina de progreso arriba (`#progress-line`, sin texto ni robot). Sin WebGL queda un pato SVG sencillo; con «reducir movimiento» solo se coloca (sentado en el paso 2).

## Pausar las animaciones

El colegio 3D del flujo tiene un botón «Pausar / Reanudar» (arriba a la derecha del panel). Congela el colegio y también al robot de los pasos (se queda quieto en su caja); al cambiar de paso las piezas se acomodan y luego se detiene todo. La preferencia se guarda en este navegador (`gg_asesor_pause`). El robot corre sin rebotes: arranca, corre inclinado y frena derrapando.

## Ojos de GuateGeeks en el PDF

La franja de la primera hoja del PDF lleva los ojos de GuateGeeks (`assets/brand/guategeeks-ojos.png`, con transparencia) en lugar de círculos. Se carga como el logo (`pdfEyes()` en `asesor.js`); si no se puede leer, el PDF vuelve a los círculos de marca.

## Validación de precios

`node --test asesor/test/precios.test.js` recalcula de forma independiente (fórmula de `costa-sur.js`) las 6 tecnologías, de 1 a 150 equipos, en Integra, Flex (1 a 4 bimestres) y Evoluciona 8 y 16: neto, IVA del 12 %, total, pago inicial del 20 %, cuotas iguales y descuentos por bimestres; además prueba instituciones de ejemplo de punta a punta (equipos por grupo y horario, varias modalidades, cantidad elegida por el colegio y precios que se invalidan al cambiar la matrícula).
