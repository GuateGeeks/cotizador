# Geeky: voz, texto y control del cotizador

La implementación reutilizable vive en [GuateGeeks/geeky-agent](https://github.com/GuateGeeks/geeky-agent). Este repositorio contiene la integración con el motor y el campus; el cliente se copia desde un commit exacto y conserva su procedencia en `asesor/vendor/geeky-agent/manifest.json`.

## Experiencia

Geeky aparece en el acceso y la cabecera con el personaje original sobre papel claro, tinta violeta y acción naranja. Al cargar saluda con un mensaje local: conserva el paso, no conecta ni solicita micrófono. Abrir el panel muestra el retrato y un saludo breve.

«Empezar mi cotización» (o «Continuar mi cotización» si hay programas) abre localmente Propuesta antes de conectar o enviar el mensaje de guía. No depende del modelo. Sin programas muestra un borrador vacío; navegar no agrega matrícula, partidas ni precios. «Ver propuesta» abre el mismo paso y cierra el chat. Los cinco pasos manuales siguen disponibles. Los datos guardados y el último undo comercial sobreviven a navegar; una edición manual comercial posterior invalida ese undo para no sobrescribirla.

El primer mensaje conecta por texto. «Activar voz» solicita micrófono explícitamente; desactivarla detiene captura y reproducción y mantiene texto. Cerrar o salir de la página desconecta. La conversación visible permanece en memoria, con un máximo de 150 mensajes, sin persistencia entre recargas.

El asistente puede editar niveles, secciones, matrícula, programas, grupos, horarios, equipos, modalidad/plazo, IVA y proyección. Los cambios pasan por validación local y control de revisión; el motor existente calcula los importes. Puede enfocar niveles o tecnologías, elegir vistas, girar/acercar/alejar, restablecer cámara, mostrar/ocultar campus, pausar animaciones y activar gestos breves. Cámara e inspección no modifican la propuesta. Cotizador y retrato SVG funcionan sin WebGL.

## Personaje, actividad y accesibilidad

El retrato del agente usa GeekyBrain, acciones y SvgRenderer originales de [GuateGeeks/geeky-animation](https://github.com/GuateGeeks/geeky-animation), commit 0089c59, compartido con el campus. Las copias originales no se modifican; rutas y SHA-256 están en [PROVENANCE.md](../asesor/lab/geeky/PROVENANCE.md). La fuente propia es asesor/lab/agent-character.js; npm run build:agent-character genera asesor/vendor/agent-character.mjs. Reutiliza un host entre acceso y cabecera sin crear otro contexto WebGL; si falla la carga del módulo queda la imagen de marca.

La UI distingue preparado, conectando, escuchando, pensando, hablando, aplicando cambio y error. El cliente fijado en 6194d34c7fa3911adaea800cd95b095afb1c8b4b publica actividad real: hablar depende de output_audio_buffer.started/stopped/cleared, no de recibir texto o transcripción. Espera de respuesta y ejecución de herramientas tienen estados propios. El retrato usa acciones originales idle, thinking, listen, reading, writing y confused; saluda con waving y asiente ante éxito con nod. Los gestos opcionales del campus no bloquean el chat.

El dibujo tiene un máximo configurado de 30 FPS y ventanas de actividad de ocho segundos; las reacciones añaden la duración breve de su acción original. No hay movimiento autónomo continuo. Pausa local o del campus, movimiento reducido, panel cerrado y pestaña oculta suspenden RAF y conservan una pose estática. Son límites de configuración, no rendimiento medido.

Botones de alto mínimo 44 px, foco oscuro con aro amarillo y etiquetas accesibles. Escape cierra y devuelve el foco al acceso; abrir enfoca Cerrar. Estado y conversación se anuncian desde el DOM; el SVG decorativo no anuncia cuadros. Enter envía y Shift+Enter agrega línea. El panel adapta altura al viewport y área segura; a 650 px de ancho usa composición móvil y a 620 px de alto compacta cabecera y oculta elementos secundarios. Por debajo de 430 px de alto, el panel permite desplazar todo su contenido para alcanzar los controles incluso con teclado o errores visibles. [DESIGN.md](../DESIGN.md) documenta la extensión visual acotada al agente y al borrador vacío.

## Desarrollo local

En el repositorio geeky-agent, seguir su README: Node 22, copiar .env.example a .env y configurar OPENAI_API_KEY **solo en ese servidor**. Iniciar `npm start`. Orígenes predeterminados permitidos: http://127.0.0.1:8087 y http://localhost:8087.

En Cotizador, configurar temporalmente `asesor/agent-config.js` con endpoint `http://127.0.0.1:8787/session`, ejecutar `npm run serve` y abrir http://127.0.0.1:8087/asesor/index.html. No guardar claves en esa configuración pública.

## Producción

1. Desplegar el servidor de geeky-agent con HTTPS y su OPENAI_API_KEY. Su README documenta Docker, ALLOWED_ORIGINS, controles de acceso y límites.
2. Configurar ALLOWED_ORIGINS con el origen exacto que sirve Cotizador (por ejemplo https://guategeeks.com). Es el origen, no la ruta /cotizador.
3. Configurar la URL HTTPS completa del endpoint /session en `asesor/agent-config.js`, o usar la variable de repositorio GitHub **GEEKY_AGENT_ENDPOINT** para sobrescribirla durante el despliegue. Esta URL es pública; no requiere un secreto de GitHub.
4. El workflow de Pages conserva la configuración del repositorio si no existe la variable; si existe, genera solo esa configuración pública. Ninguna clave debe agregarse a Pages. El valor vacío intenta /session en el mismo origen y permite despliegues con proxy; GitHub Pages por sí solo no sirve ese endpoint.
5. Verificar voz y texto con una clave y navegador reales antes de habilitar el servicio para visitantes.

No se despliega ningún backend ni se configura ninguna credencial al instalar estos archivos. Si falta el servicio, el panel explica el fallo y el cotizador manual sigue disponible. Para ocultar el panel en un despliegue propio, establecer enabled:false en agent-config.js.

## Actualizar la versión

```sh
node tools/sync-geeky-agent.mjs ../geeky-agent <commit-completo-de-40-caracteres>
node tools/sync-geeky-agent.mjs --check
```

Solo se leen módulos comprometidos con git show. Las rutas incluyen el commit y evitan mezclar versiones en la caché. El manifiesto almacena versión, repositorio y SHA-256. Al actualizar, retirar la carpeta del commit anterior si ya no se utiliza y subir la versión de caché de agent-ui.mjs en index.html.

## Verificación

```sh
npm test
npm run build
npm run check:agent
PLAYWRIGHT_MODULE=/ruta/a/playwright npm run test:agent-browser
```

La prueba del panel inicia su propio servidor. Usa transporte simulado para probar texto, permiso denegado, cierre y redibujado; usa el adaptador real para cambios, importes del motor, undo y conflictos. La cobertura incluye apertura local de Propuesta, datos guardados, undo y estados de actividad con transporte y micrófono sintéticos. Escritorio y móvil usan emulación de viewport; guardar cada corrida en una carpeta nueva de artifacts/. No equivale a voz con micrófono físico, prueba en teléfono real ni medición de rendimiento.

El runtime tiene pruebas propias de HTTP, WebRTC simulado, voz/texto, herramientas y carreras de conexión. La verificación con OpenAI requiere credenciales y disponibilidad del modelo en la cuenta.
