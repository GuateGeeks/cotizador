# Geeky: voz, texto y control del cotizador

La implementación reutilizable vive en [GuateGeeks/geeky-agent](https://github.com/GuateGeeks/geeky-agent). Este repositorio contiene la integración con el motor y el campus; el cliente se copia desde un commit exacto y conserva su procedencia en `asesor/vendor/geeky-agent/manifest.json`.

## Experiencia

Geeky saluda al entrar, sin iniciar conexiones ni pedir acceso al micrófono. El primer mensaje conecta por texto. «Activar voz» pide permiso; «Desactivar voz» detiene captura y reproducción y conserva la sesión de texto. Cerrar el panel desconecta. La conversación visible permanece solo en memoria de la página.

El asistente puede editar niveles, secciones, matrícula, programas, grupos, horarios, cantidad de equipos, modalidad/plazo, IVA y proyección. Los cambios pasan por validación local y se reflejan en el formulario y el campus. Los importes provienen del motor existente. La última edición de Geeky se puede deshacer mientras no haya una edición manual posterior.

También puede enfocar un nivel o tecnología, elegir vistas, girar/acercar/alejar, restablecer la cámara, mostrar/ocultar el campus, pausar las animaciones y activar gestos breves del personaje existente. Cámara e inspección no modifican la propuesta. Se conservan movimiento reducido, la pausa y la experiencia sin WebGL.

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

La prueba del panel inicia su propio servidor. Usa transporte simulado para probar texto, permiso denegado, cierre y redibujado; usa el adaptador real para cambios, importes del motor, undo y conflictos. Capturas en artifacts/geeky-agent/. No equivale a una prueba de voz real ni a una medición en un teléfono físico.

El runtime tiene pruebas propias de HTTP, WebRTC simulado, voz/texto, herramientas y carreras de conexión. La verificación con OpenAI requiere credenciales y disponibilidad del modelo en la cuenta.
