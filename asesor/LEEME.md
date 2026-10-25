# Asesor de programas GuateGeeks

Experiencia guiada en cinco pasos: niveles, estudiantes y secciones, programas, equipos y modalidad, y propuesta institucional.
Es una página estática de HTML, CSS y JavaScript. La escena 3D usa Three.js, compilado en un bundle local con esbuild. El workflow existente de GitHub Pages publica este asesor en la raíz del sitio; la propuesta original de Costa Sur se conserva en la raíz del repositorio.

## Probar en local

```bash
npm ci && npm run build
npm test
python3 -m http.server 8000
```

Abre `http://localhost:8000/asesor/index.html`. Con `#ejemplo` al final de la dirección se carga un colegio de demostración.

```bash
PLAYWRIGHT_MODULE=playwright COTIZADOR_URL=http://127.0.0.1:8000/asesor/index.html BROWSER_CHANNEL=msedge node asesor/test/campus-browser.cjs
# Sin GPU (WSL/CI): BROWSER_CHANNEL=chromium BROWSER_ARGS="--use-angle=swiftshader --enable-unsafe-swiftshader"
```

La prueba de navegador requiere una instalación de Playwright y el navegador del canal indicado. `PLAYWRIGHT_MODULE` también admite una ruta absoluta al paquete o a su archivo de entrada; `BROWSER_CHANNEL` puede ser `msedge` o `chrome` según la instalación. Guarda capturas y un informe en `artifacts/campus/`. Consulta los [comandos y alcance de validación](../docs/campus-3d.md#compilar-y-comprobar) para PowerShell y los escenarios cubiertos.

## Archivos

| Archivo | Qué contiene |
|---|---|
| `asesor/config.js` | Datos editables: niveles, programas, compatibilidad, ratios, modalidades, tarifas, fiscalidad, acceso a Sócrates y fotos |
| `asesor/motor.js` | Cálculo puro (equipos, capacidad, estudiantes únicos, importes, estados). Sin DOM |
| `asesor/asesor.js` | Interfaz y borrador local (clave `gg_asesor_v1`, esquema versión 1) |
| `asesor/asesor.css` | Configuración lateral con jerarquía móvil y canvas adaptable |
| `asesor/lab/campus-layout.js` | Normalización y reglas puras del campus, sin DOM ni WebGL |
| `asesor/lab/campus-scene.js` | Renderer, construcción por etapas, cámara, selección, calidad adaptable y ciclo de render |
| `asesor/lab/campus-kit.js` | Primitivas facetadas, huesos y capas unidas en una malla por entidad |
| `asesor/lab/campus-people.js` | Personas articuladas por nivel y vocabulario de poses |
| `asesor/lab/campus-architecture.js` | Aulas por nivel, talleres, balcón y escalera, isla facetada y entorno |
| `asesor/lab/campus-actors.js` | Ciclos de actividad de las seis tecnologías, relevos, estaciones, modalidades y comunidad caminante |
| `asesor/lab/campus-geeky.js` | Geeky facetado que guía la mirada (proporciones de GuateGeeks/geeky-animation) |
| `asesor/campus-experience.js` | Respuesta contextual y diagramas de niveles, matrícula, grupos, horarios, equipos, estaciones y modalidades |
| `asesor/lab/lab-scene.js` | Escena de portada, pato del avance y exportación de la API del campus |
| `asesor/vendor/lab-scene.min.js` | Bundle generado por `npm run build`, usado en local y en Pages |
| `asesor/pdf.js` | Escritor mínimo de PDF (texto, formas e imágenes JPEG), sin dependencias |
| `asesor/propuesta-pdf.js` | Diseño del PDF de la cotización: hoja 1 con logo, cifras, inversión, forma de pago y programas; luego el detalle de cada programa con la foto del equipo, pagos mes a mes y condiciones |
| `asesor/test/*.test.js` | Pruebas del motor, precios, estructura del PDF y reglas del campus |
| `asesor/test/campus-browser.cjs` | Prueba de integración 3D en escritorio, móvil, movimiento reducido y sin WebGL |
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
- Simulador (resumen y PDF): una sola cuota mensual por estudiante para toda la propuesta, calculada sobre el total de estudiantes únicos de los programas en renta (Flex) y en cuotas (Evoluciona), sin separar por nivel ni por programa. Cuota sugerida = total con IVA de esos programas ÷ estudiantes ÷ meses del programa más largo ÷ 0.75, redondeada hacia arriba a múltiplos de 5; el colegio puede quitar la sugerencia y escribir otra. Se muestra como «ganancia del colegio» (ingresos menos pago a GuateGeeks, antes de sus gastos propios). No aplica a Integra.

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
- `.github/workflows/pages.yml` publica el asesor en la raíz; el bundle 3D debe recompilarse antes de publicar cambios de escena.
- Las pruebas automatizadas del campus complementan la revisión visual. No constituyen una medición de FPS en dispositivos físicos ni una certificación de todas las rutas comerciales.
- El inventario de equipos existentes y la ruta de formación previstos en la dirección visual no tienen campos propios en el catálogo actual. Este rework no inventa datos, tarifas ni pasos para ellos.

## Portada: laboratorio 3D

La portada (`renderLanding()` en `asesor.js`) muestra una escena 3D a todo el ancho del hero: un robot de ruedas que se puede desarmar, bloques de programación y piezas de construcción. Se gira arrastrando (doble clic para volver), «Desarmar el robot» separa sus piezas y los puntos de la escena abren una ficha de cada parte (Esc la cierra). Es una escena conceptual: no reproduce Tale-Bot, Robot Master ni SPIKE Prime.

- `lab/lab-scene.js`: código fuente de la escena (geometrías propias, sin modelos externos).
- `vendor/lab-scene.min.js`: bundle local compartido por la portada, el campus y el pato del avance; incluye las partes utilizadas de Three.js y `RoomEnvironment`. Se carga de forma diferida cuando una de estas escenas lo necesita.
- `vendor/THREE-LICENSE.txt`: licencia MIT de three.js 0.186.1 (https://github.com/mrdoob/three.js).
- Si no hay WebGL, el script no carga o se pierde el contexto, queda la ilustración SVG incluida en la página. Con «reducir movimiento» activado la escena no se anima y la secuencia solo ilumina los bloques.

Para recompilar tras editar cualquiera de los módulos de escena, desde la raíz del repositorio:

```bash
npm ci && npm run build
```

Al publicar una versión nueva, actualiza el identificador de caché `?v=` de `lab-scene.min.js` en `loadLab()` cuando corresponda.

## Mini colegio 3D del recorrido

El campus aparece durante los cinco pasos, tanto en escritorio como en móvil y con «reducir movimiento». En escritorio, el formulario usa una columna de 360–390 px y conserva la organización de una pantalla móvil; el campus ocupa el espacio restante. En móvil, la vista permanece encima del formulario, con 200–210 px de canvas. Al editar un campo se compacta temporalmente a 130 px y deja espacio para introducir datos; el foco del control se conserva al actualizar el mismo paso.

La dirección visual es una maqueta low poly donde la arquitectura enmarca y las actividades protagonizan: pabellones abiertos con cubiertas moradas de corte, isla facetada violeta, accesos naranjas, circulación turquesa y vegetación. Crece desde un aula hasta un campus con sectores por nivel, comunidad, talleres de los programas elegidos y entorno. La construcción modular adapta muros, cubiertas, balcón y escalera según sus vecinos y arma cada pieza nueva por etapas; no utiliza assets de Townscaper.

Los niveles agregan sectores de aulas; la matrícula determina una densidad visual acotada de aulas y personas; los programas crean talleres y los equipos calculados por el motor ajustan su representación. Avanzar de paso o cambiar solo de modalidad comercial no añade edificios. Los equipos respetan el cálculo de grupos, horarios y selecciones del cotizador; no se multiplica la matrícula por programa. Los contadores muestran cantidades exactas y la escena las agrupa, como indica «Maqueta ilustrativa · cantidades agrupadas».

La escuela tiene actividad continua mientras está visible. Tale-Bot ejecuta una secuencia de tarjetas sobre su tapete; se arma y programa un dinosaurio Robot Master; un robot SPIKE Prime sigue la línea y activa una misión; en electrónica se cierra un circuito y se mide; un dron despega, cruza un aro y aterriza mientras los pilotos se turnan; con visores se explora un planeta, el Templo I de Tikal y una molécula. Los estudiantes caminan desde la entrada hacia aulas y talleres. Son representaciones ilustrativas, no réplicas físicas de los equipos.

Tocar una tecnología en el canvas o en su tira de botones centra la cámara en su taller, levanta su pérgola y muestra su nombre; Geeky vuela a observarla. Los botones de niveles hacen lo mismo con sus aulas. Una ficha explica la decisión activa, muestra grupos, turnos, capacidad o plazos según corresponda y permite abrir la configuración del programa. Modalidades y bimestres cambian sus diagramas y condiciones, sin añadir edificios ni prestaciones. `campus-experience.js` deriva estas respuestas de los datos del configurador.

Arrastrar horizontalmente gira la cámara; los botones y el teclado permiten girar, acercar, alejar y restablecer. El desplazamiento vertical táctil sigue disponible. `placeMascot()` conserva la instancia y la cámara entre pantallas; `mascotData()` proporciona datos del estado y del motor. `createMascot()` incorpora `setFocus()` y el callback `onSelect`; la implementación está en `lab/campus-layout.js` (reglas), `lab/campus-kit.js` (primitivas y huesos), `lab/campus-people.js` (personas), `lab/campus-architecture.js` (aulas, isla y entorno), `lab/campus-actors.js` (actividades y comunidad), `lab/campus-geeky.js` (Geeky) y `lab/campus-scene.js` (render, cámara y selección).

La geometría y paleta se basan en los principios Flat/Minimal del proyecto `3d-assets`, adaptados a esta dirección visual. No se importan GLB ni se ejecuta Blender en el navegador. El [documento del campus](../docs/campus-3d.md) detalla procedencia, API, límites y pruebas.

## Pato robot del avance

Los cinco pasos son cajas con su nombre (✓ en los hechos) y el pato robot 3D vive **dentro** de ellas, sin franja ni burbuja adicional (`createDuck()` en `lab/lab-scene.js`, `placeDuck()` en `asesor.js`): en la caja del paso actual ocupa el lugar del círculo numerado y, al avanzar **corre** hasta la caja nueva: arranca rápido, corre inclinado hacia adelante moviendo patas y aletas, y frena derrapando al llegar; la caja rebota como si la pisara y el pato se voltea a mirar a la persona. Cada etapa tiene su comportamiento:

1. **Niveles:** saluda moviendo las aletas y girando la cabeza.
2. **Estudiantes:** se sienta.
3. **Programas:** tropieza, se cae de frente, se queda un momento en el suelo y se levanta.
4. **Personalizar:** baila.
5. **Resumen:** celebra con saltos y un giro.

Además sigue el cursor con la cabeza y reacciona (saltito y cabeceo) cuando haces clic o escribes. La barra de pasos ya no es fija: se desplaza con la página y, al bajar, solo queda una línea fina de progreso arriba (`#progress-line`, sin texto ni robot). Sin WebGL queda un pato SVG sencillo; con «reducir movimiento» solo se coloca (sentado en el paso 2).

## Pausar las animaciones

El campus tiene un botón «Pausar / Reanudar». Pausa actividades, transiciones, diagramas animados y al pato del avance, pero permite seguir configurando, seleccionando actividades y usando la cámara: cada cambio se presenta directamente en su estado final. La preferencia se guarda en este navegador (`gg_asesor_pause`). «Reducir movimiento» mantiene visible y actualizada la maqueta sin animación.

La escena visible mantiene sus actividades con un máximo configurado de 30 FPS. Si un dispositivo no sostiene la animación, el modo `eco` desactiva el mapa de sombras y baja la relación de píxel; las mediciones están en `docs/campus-3d.md`. La pausa, el movimiento reducido, la salida de vista y la pestaña oculta detienen cuadros y temporizadores. Al volver a mostrarla reanuda cuando corresponde. Si WebGL no está disponible, aparece una explicación y el formulario sigue funcionando.

## Ojos de GuateGeeks en el PDF

La franja de la primera hoja del PDF lleva los ojos de GuateGeeks (`assets/brand/guategeeks-ojos.png`, con transparencia) en lugar de círculos. Se carga como el logo (`pdfEyes()` en `asesor.js`); si no se puede leer, el PDF vuelve a los círculos de marca.

## Validación de precios

`node --test asesor/test/precios.test.js` recalcula de forma independiente (fórmula de `costa-sur.js`) las 6 tecnologías, de 1 a 150 equipos, en Integra, Flex (1 a 4 bimestres) y Evoluciona 8 y 16: neto, IVA del 12 %, total, pago inicial del 20 %, cuotas iguales y descuentos por bimestres; además prueba instituciones de ejemplo de punta a punta (equipos por grupo y horario, varias modalidades, cantidad elegida por el colegio y precios que se invalidan al cambiar la matrícula).

## IVA: importes sin IVA por defecto

Las instituciones educativas están exentas de IVA, así que todo se calcula y se muestra **sin IVA**: el importe de cada programa, el pago inicial, las cuotas, la cuota por estudiante del simulador y el PDF. El monto con IVA (12 %) se indica siempre como referencia, y quien lo necesite puede activar «Mostrar los pagos con IVA» en la sección de inversión (la preferencia se guarda y también la sigue el PDF).

En `motor.js`, `quoteFor` devuelve `net`, `initial` y `schedule` (sin IVA, principales) y `total`, `initialIva`, `scheduleIva` y `tax` (con IVA, referencia). En Evoluciona las cuotas son iguales en ambas vistas; por eso el IVA de referencia puede diferir unos quetzales del 12 % exacto del neto.
