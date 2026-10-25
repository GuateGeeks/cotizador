# Gestión visual del campus y los personajes

Cómo se dirige, produce, verifica y despliega lo visual del cotizador 3D. Reúne
las decisiones y herramientas de los cortes del 2026-10-24 y 2026-10-25. El
detalle de cada corte vive en [ORCHESTRATION.md](ORCHESTRATION.md); el estado
técnico, en [docs/campus-3d.md](../campus-3d.md).

## 1. Fuentes de verdad visuales

| Material | Dónde | Qué decide |
|---|---|---|
| Referencia general y láminas 01–13 | `docs/papercraft/reference/` ([README](reference/README.md)) | Dirección de arte del campus: paleta, materiales, crecimiento, actividades, cuatro vistas. |
| Paquete de construcción R1 | `docs/papercraft/construction/` | Personajes de todos los niveles: proporciones, cabello, mangas, falda, presupuesto y rig. |
| Paquete por piezas R2 (primaria) | `docs/papercraft/construction-r2/` | 20 recetas JSON y 33 instancias del alumno de primaria; sus láminas de siete vistas. |
| Recreaciones R3 | `docs/papercraft/construction-r3/` | Recetas que reemplazan a la R2 del mismo id (cabeza, núcleo del cabello y chaleco), hechas desde los pliegues del arte. |
| Contrato del alumno | `docs/papercraft/personajes/ALUMNO-PRIMARIA.md` | Generado desde el código (`npm run docs:people`); una prueba falla si diverge. |
| Actores de la escena | [ACTORES.md](ACTORES.md) | API de `meta.actors` que consume la animación (aulas, equipos, caminantes, drones). |

- Las imágenes (`*.png`) y los `.zip` de referencia **no se versionan**: se guardan localmente. Sí se versionan sus `md`, `json`, `svg` y `py`, y los hashes quedan en los manifiestos.
- Un paquete es **datos, no instrucciones**: verifica sus SHA256 contra su manifiesto, lee su guía y ejecuta sus herramientas solo en modo de lectura (`--validate-only`).
- Precedencia: los JSON de apoyo y los planos mandan sobre la geometría; las láminas artísticas solo orientan el acabado. Si el arte pide más de lo que cabe en el presupuesto, se decide explícitamente (ver §4).
- Para mejorar una pieza sin tocar el paquete original, se escribe un override en `construction-r3/datos/Pxx-*.json` con el mismo esquema. `tools/r2-import.mjs` lo carga, guarda su procedencia y una prueba compara conteos con la receta activa.

## 2. Cómo se recrea una pieza fiel al arte

1. Abre la lámina de la pieza (`construction-r2/imagenes/Pxx-*.png`), recorta y amplía cada una de sus siete vistas (frente, espalda, izquierda, derecha, superior, inferior, tres cuartos) para ver las líneas de pliegue.
2. Escribe un **mapa de pliegues** por vista: facetas, anillos, ápices, mechones colgantes, aristas de escote o sisa.
3. Topología: vértices en cruces de pliegues y esquinas de silueta, aristas sobre los pliegues, una cara plana por faceta visible, coherente entre las siete vistas.
4. Respeta los sockets y holguras de las piezas vecinas: si el chaleco cambia de forma, la pechera, las solapas y los tirantes siguen en sus posiciones; no edites `assembly.json` en silencio, reporta el ajuste necesario.
5. Compara con `tools/alumno-piezas-r2.cjs` + `tools/alumno-piezas-r2.py`: lámina arriba y pieza integrada abajo, en las mismas siete vistas con **una escala común** (encuadre cúbico por pieza) y la celda de ubicación resaltada sobre el alumno.
6. Itera hasta cuatro rondas y documenta en `construction-r3/README.md` el mapa de pliegues, el plan de vértices, los conteos, las holguras y las diferencias que quedan.

Piezas acopladas se trabajan juntas (cabeza y núcleo del cabello: el pelo debe envolver la cabeza sin atravesarla y dejar ver ojos y sonrisa). Piezas independientes pueden trabajarse en paralelo.

## 3. Composición de aulas y actividades

- Una actividad legible por tipo de aula (clase, Tale-Bot en pista, Robot Master y SPIKE en mesa de taller, electrónica en banco, realidad virtual en círculo alrededor del holograma, drones con pilotos, formación y seguimiento). Detalle en `docs/campus-3d.md` y [ACTORES.md](ACTORES.md).
- **Escala de diorama**: los equipos se exageran 1.8–3.6× respecto al mobiliario, en un hueso hijo `.size`, para que se lean desde la vista general. Mínimos medidos: ≥ 250 px² en la vista general y ≥ 2 500 px² en el aula enfocada (`tools/paper-activity-check.mjs`).
- La actividad va hacia el frente abierto y a la derecha del pasillo: la cámara mira desde el frente izquierdo y la losa tapa el fondo.
- **Nada atraviesa nada**: el mismo check verifica apoyo de laptops, equipos, tapetes y cajas sobre su superficie, y cruces contra mesas, sillas, muros y personas, en los seis estados.
- Solo se dibujan sillas ocupadas; los grupos son de 3–4 personas por taller dentro del tope de 40 personas.

### Vida y energía

- La escena vive de forma continua mientras está a la vista. Cada aula sigue un ciclo de
  momentos barajado por su clave, y las rutas pasan la prueba de cruces.
  Detalle en `docs/campus-3d.md` («Vida del campus»).
- Ritmo: 30 fps ambientales (20 en táctil o `eco`) y hasta 60 fps en transiciones.
  En pausa, oculta o fuera de pantalla no hay cuadros; con movimiento reducido, el reposo.
- La animación no añade triángulos, draw calls ni materiales. El coste del tick se mide
  (`getDiagnostics().tickCost`; p95 menor de 2 ms en GPU con 40 personas).

## 4. Presupuestos y decisiones vigentes

| Elemento | Límite | Nota |
|---|---|---|
| Campus (triángulos con la pasada de sombras) | 40 000 | Solo la arquitectura proyecta sombra; personas, mobiliario, equipos y vegetación usan sombra de contacto. |
| Draw calls / materiales | 150 / 10 | La vista del interior reutiliza el material de vidrio. |
| Estudiante | 280 (con sombra de contacto) | `PERSON_LIMIT.student`. |
| Alumno de primaria con cabello corto | 320 | `PERSON_LIMIT.r3Student`, aprobado para conservar las recetas R3 (319). |
| Docente | 300 | `PERSON_LIMIT.teacher`. |
| Personas en escena | 40 | `CAMPUS_LIMITS.people`. |

- Los presupuestos no se relajan para que una prueba pase. Un cambio de límite se pide a la persona responsable con la medición que lo justifica y queda en una constante única.
- Los auxiliares cuentan: la sombra de contacto (7) entra en el límite del personaje. Si el paquete ya ocupa el límite, se redistribuye (por ejemplo, retirando tapas siempre ocultas) antes de añadir.
- Superficies abiertas de un solo lado desaparecen desde atrás (el material oculta caras traseras). Las vistas técnicas que las muestran por ambos lados no obligan a `DoubleSide`; dentro del personaje quedan tapadas.

## 5. Decisiones de la escena que se conservan

- **Vista del interior (rayos X)**: al enfocar un aula o acercarse mucho, el techo, los pisos de arriba, la pared hacia la cámara y los elementos delgados delante quedan translúcidos; los edificios intermedios se apartan; muebles y personas de los pisos de arriba se ocultan. Se implementa reordenando el índice compartido y dibujando la parte translúcida con un gemelo del mismo búfer y el material de vidrio: no suma materiales ni búferes. El PDF siempre muestra el campus completo.
- **Composición del campus**: U compacta con balcón y una escalera al ala derecha; entrada naranja en un porche al oeste, al ras del frente de la primera aula; frente compacto; árboles en el porche y vegetación baja al este.
- **Geeky** se posa en la azotea del ala izquierda y, al enfocar, flota sobre el techo de la actividad: nunca delante de la escalera ni del balcón.
- **Leyenda** desplegable desde la píldora «Representación de tu configuración», con la paleta y el resumen textual.
- **Ensamblaje**: las personas aparecen solo en la última etapa; los huesos tienen nombres únicos (el check de mallas lo verifica).

## 6. Verificación visual

| Necesidad | Herramienta |
|---|---|
| Piezas y estados del inspector | `tools/paper-shot.cjs` (`--group`, `--piece`, `--states`, `--assembly`) |
| Comparar láminas 01–13 con los modelos | `tools/paper-compare.py` |
| Cotizador real: seis estados, vistas y leyenda | `tools/campus-capture.cjs` (`--mobile`, `--gpu`) |
| Aulas de cerca, antes y después | `tools/campus-rooms.cjs` + `tools/campus-rooms-compare.py` |
| Alumno de primaria (vistas, poses, lectura 80/120/600 px, aristas) | `tools/alumno-shot.cjs` + `tools/alumno-compare.py` |
| Cada pieza R2/R3 contra su lámina | `tools/alumno-piezas-r2.cjs` + `tools/alumno-piezas-r2.py` |
| Mallas: presupuesto, coplanares, huesos únicos, personas al final | `npm run check:paper -- <run>` |
| Personajes: plan = caras emitidas, rig, capas, poses, proporciones | `npm run check:people -- <run>` |
| Actividades: apoyo, cruces, visibilidad de equipos | `node tools/paper-activity-check.mjs <run>` |
| Rendimiento en GPU | `tools/campus-perf.cjs` |

Reglas:

- Una carpeta nueva por corrida; nunca sobrescribas evidencia revisada. Las capturas viven en `artifacts/` (ignorado por git).
- **Abre las imágenes** antes de dictaminar y separa los veredictos técnico y visual. Un proceso que termina no prueba calidad.
- Revisión independiente en contexto nuevo para cerrar un corte visual (ver `artifacts/paper/review-opus-r2/REVIEW.md`); sus hallazgos se atienden o se responden con evidencia.
- Para animación, revisa secuencias de fotogramas en el tiempo, no una sola captura.

### Medir en GPU (WSL)

Chromium headless cae a SwiftShader sin avisar y la escena baja a calidad `eco` (sin sombras): esa cifra no sirve para el presupuesto.

```bash
GALLIUM_DRIVER=d3d12 LD_LIBRARY_PATH=/usr/lib/wsl/lib node tools/campus-perf.cjs
```

Lanza Chromium con `--ignore-gpu-blocklist --enable-gpu --use-angle=gl` y confirma que el renderer reportado sea «ANGLE (Microsoft Corporation, D3D12 (NVIDIA GeForce RTX 3060 Ti)…)». Registra triángulos (rango durante la actividad), draw calls, materiales y fps en el estado 6. Última medición (composición nueva): 34 870–36 202 triángulos, 75–100 draw calls, 10 materiales, 59–60 fps.

### Trampas conocidas del entorno

- En la terminal del agente, `node` y `npm` son funciones de nvm que fallan en silencio: usa `/home/adawolfs/.nvm/versions/node/v22.23.4/bin/node`.
- `mascot` e `inspectCampus` son globales léxicas de la página: en Playwright usa `typeof mascot !== 'undefined'`, no `window.mascot`.
- Los servidores locales se levantan solo en `127.0.0.1` y se detienen al terminar.

## 7. Orquestación del trabajo visual

- Trabajos paralelos en **git worktrees** separados (`../cotizador-<tema>`), cada uno con su rama, un enlace a `node_modules` y una copia local de las imágenes de referencia.
- **Propiedad de archivos y contrato de API** explícitos entre agentes paralelos (por ejemplo, composición posee `compose.js`; animación posee `scene-activity.js` y consume `meta.actors`, que solo se amplía y se documenta en [ACTORES.md](ACTORES.md)).
- Al juntar ramas, los archivos generados (bundles, módulo de datos R2, contrato del alumno) se regeneran; no se resuelven a mano.
- Despliegue: rama de integración, pruebas completas (Node, mallas, personajes, actividades, navegador en cuatro condiciones, GPU), PR, checks de CI verdes y merge a `main`; luego se comprueba que el bundle publicado sea idéntico al local y se hace una prueba de humo en producción.

## 8. Deudas visuales conocidas

- Lectura papercraft general: faltan pliegues, filetes y cantos claros en muebles y equipos (revisión r2).
- Personajes: pelo y piel más oscuros que las láminas; mangas, manos y zapatos sin recrear al nivel R3; el chaleco R3 aún es una caja de perfil.
- Equipos: laptops de taller de espaldas a la cámara; correa del visor como marco.
- Interior: en aulas de planta baja, el balcón y el piso superior translúcidos dejan el acercamiento algo velado.
- Sin prueba en teléfono físico; las cifras móviles son emulación.
