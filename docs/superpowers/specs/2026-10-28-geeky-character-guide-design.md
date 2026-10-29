# Geeky como guía de la propuesta

## Intención y decisiones
El usuario pide usar al personaje Geeky dentro del agente, mejorar su UI y darle vida. Confirmó que «Empezar mi cotización» debe abrir Propuesta; no debe ocurrir al cargar el sitio. Conservamos la autorización previa para resolver detalles y trabajar con agentes.

La propuesta será un borrador válido incluso sin programas. Abrirla no crea matrícula, partidas ni precios, ni borra una propuesta guardada. El formulario manual de cinco pasos sigue accesible. El salto sucede de forma local y determinista antes de conectar con OpenAI: no depende de que el modelo decida usar una herramienta. Debe conservar el undo comercial anterior; navegar no representa una edición comercial.

## Interfaz y personaje
Mantener identidad violeta, naranja y papel claro de GuateGeeks. Geeky sustituye al icono genérico del acceso y encabeza el panel. Usar los contornos, motor de poses y renderer SVG originales de GuateGeeks/geeky-animation en el mismo commit0089c59 del personaje del campus. Es la elección de implementación del agente: consume menos recursos que otra escena WebGL y conserva identidad también sin3D. No modificar las copias originales.

Estados legibles: preparado, conectando, escuchando, pensando, hablando, aplicando un cambio y error. El transporte publica actividad real; no afirmar que está hablando solo porque llegó un fragmento de texto. El personaje saluda al abrir, escucha con atención, piensa mientras espera, reacciona a cambios exitosos y se aquieta al cerrar/ocultar. La voz empieza solo con activación explícita. Movimiento reducido o pausa detiene animaciones; el personaje queda visible estático.

Panel compacto de conversación con cabecera de personaje, estado claro, CTA inicial, acceso a propuesta, mensajes legibles, control de voz y compositor. Controles>=44px, foco visible, teclado/Escape, móvil390px y escritorio1440px, sin desbordamiento ni anuncios repetidos de cada frame. Mantener la pausa del campus y sincronizar gestos puntuales permitidos, sin controlar precios desde la escena.

## Alternativas consideradas
- Solo sustituir icono por imagen: barato pero no responde al deseo de dar vida al agente.
- Segundo visor3D del personaje: fiel pero duplica contexto WebGL y complica equipos modestos.
- Personaje SVG original con estados del transporte y gestos del campus: elegido por continuidad visual, accesibilidad y coste de render.

## Límites
Motor comercial autoritativo, ninguna credencial en frontend, módulos del transporte versionados en geeky-agent y copiados por SHA. No reescribir personaje original, no rediseñar el campus completo, no introducir un framework. Conservar borradores y conflictos de revisión. Las pruebas de voz usarán micrófono sintético.