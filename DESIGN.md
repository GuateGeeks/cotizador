---
name: Campus vivo del asesor
description: Configuración educativa lateral y campus animado con actividades seleccionables y respuesta contextual.
colors:
  plum: "#6942a1"
  plum-dark: "#321853"
  plum-wash: "#eee4fb"
  ink: "#321853"
  muted: "#6d5879"
  paper: "#ffffff"
  cream: "#fff8ec"
  configuration: "#fffaf3"
  line: "#e5dfe9"
  coral: "#ef8556"
  action: "#ff9d38"
  action-hover: "#ffb356"
  focus: "#ffc857"
  scene: "#F4F1F6"
  scene-ink: "#321853"
  scene-muted: "#58446f"
  scene-hover: "#6942a124"
  scene-glass: "#ffffffcc"
  scene-line: "#3218532e"
  scene-focus-ring: "#321853"
  camera-ink: "#321853"
  agent-launcher-hover: "#fff0d9"
  agent-surface: "#f4eff9"
  agent-listening: "#356a5c"
  agent-error-status: "#88421d"
  agent-error-paper: "#fff3e3"
  agent-error-ink: "#743b13"
  agent-input-line: "#cbbbd9"
  agent-disclosure: "#faf8fc"
typography:
  body:
    fontFamily: '"Avenir Next", Avenir, Inter, "Segoe UI", system-ui, sans-serif'
    fontSize: "15px"
    lineHeight: 1.55
  step-title:
    fontSize: "30px"
    fontWeight: 750
    lineHeight: 1.13
    letterSpacing: "-0.8px"
  step-description:
    fontSize: "13px"
    lineHeight: 1.6
  control-label:
    fontSize: "12px"
  agent-small:
    fontSize: "11px"
    lineHeight: 1.5
  agent-message:
    fontSize: "14px"
    lineHeight: 1.65
  agent-mobile-input:
    fontSize: "16px"
    lineHeight: 1.45
  agent-draft-title:
    fontSize: "23px"
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  agent-title-short:
    fontSize: "24px"
  agent-title-mobile:
    fontSize: "27px"
  agent-title:
    fontSize: "29px"
    fontWeight: 780
    lineHeight: 1.1
    letterSpacing: "-0.025em"
rounded:
  flush: "0px"
  input: "7px"
  control: "9px"
  tab: "8px"
  button: "12px"
  option: "16px"
spacing:
  compact: "8px"
  small: "12px"
  medium: "16px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "10px 14px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  camera-control:
    backgroundColor: "transparent"
    textColor: "{colors.camera-ink}"
    rounded: "{rounded.control}"
    padding: "8px"
    size: "44px"
  camera-control-hover:
    backgroundColor: "{colors.scene-hover}"
  enrollment-input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    width: "62px"
    height: "44px"
  level-tab:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tab}"
    padding: "9px"
  level-tab-active:
    backgroundColor: "{colors.plum-dark}"
    textColor: "{colors.paper}"
  level-option:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.option}"
    padding: "16px"
  level-option-selected:
    backgroundColor: "{colors.plum-wash}"
  configuration-panel:
    backgroundColor: "{colors.configuration}"
    rounded: "{rounded.flush}"
    padding: "22px 28px"
    width: "390px"
  activity-tab:
    backgroundColor: "transparent"
    textColor: "{colors.scene-ink}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
    height: "40px"
  activity-feedback:
    textColor: "{colors.scene-ink}"
    padding: "18px 0"
  viewer-glass:
    backgroundColor: "{colors.scene-glass}"
    textColor: "{colors.scene-ink}"
    rounded: "12px"
    padding: "8px 12px"
  agent-start:
    backgroundColor: "{colors.action}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 13px"
    height: "44px"
  agent-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.option}"
    width: "390px"
    height: "710px"
  viewer-counter:
    backgroundColor: "{colors.scene-glass}"
    textColor: "{colors.scene-ink}"
    rounded: "12px"
    padding: "8px 12px"
    width: "92px"
---

# Campus vivo del asesor

La superficie es un configurador: primero debe permitir entender y editar la propuesta. La referencia visual aprobada por el usuario es el storyboard «Del aula al campus», de seis cuadros. La maqueta traduce las decisiones a un colegio low poly cálido, con módulos conectados y materiales planos. Se conservan la identidad GuateGeeks y el recorrido comercial.

La configuración ocupa un panel lateral de 360 a 420 px en escritorio (por defecto un 30 % del ancho dentro de ese rango; el redimensionador permite ajustarlo y se recuerda), con la misma composición angosta del flujo móvil. El modelo ocupa el espacio restante. Ambos reutilizan DOM, datos, cámara ortográfica, controles y resumen. El panel de configuración se desplaza independientemente de la escena en escritorio. En móvil, el campus queda visible arriba, compacto (de 260 a 380 px), con el botón «Ampliar» que alterna la altura completa sin mover el foco; al editar un campo se compacta a 130–140 px y oculta temporalmente controles secundarios para ceder espacio al formulario. La edición conserva el foco y los datos sobreviven a la rotación.

Cada nivel abre su sector con color propio; la matrícula ocupa las aulas y trae comunidad por la entrada; las secciones agregan banderines y pisos; los programas construyen talleres con ciclos de actividad propios; grupos, horarios, simultaneidad, estaciones y equipos cambian quién trabaja y con qué. Tocar una tecnología en el canvas o en su tira de botones centra la cámara en su taller, levanta su pérgola y lleva a Geeky a observarla; los niveles también se pueden explorar y las flechas arriba/abajo recorren todo. Una ficha contextual relaciona cada decisión con matrícula, grupos, turnos, estaciones, equipos o plazos. Modalidades y bimestres cambian diagramas y condiciones; no añaden edificios ni servicios. Las cantidades exactas pertenecen al texto: la maqueta agrupa la escala y no es un plano arquitectónico ni una representación uno a uno.

La construcción es modular y por etapas (piso, muros, mobiliario, cubierta con rebote, personas); solo las piezas nuevas se animan y la isla crece baldosa a baldosa. Cada tecnología sigue un ciclo con intención (programar, ejecutar, probar, celebrar, ceder el turno); la comunidad camina hacia aulas y talleres reales; los árboles, la bandera y las aves dan vida al entorno. La escena visible mantiene actividad con un máximo configurado de 30 FPS, sin afirmar FPS medidos. Girar, acercar y restablecer funcionan con botones, teclado y arrastre horizontal. Pausar o reducir movimiento congela actividades y diagramas y aplica las modificaciones directamente; salir de vista u ocultar la pestaña suspende cuadros y temporizadores.

Paleta del configurador: tinta #321853, secundario #6d5879, acento #6942a1, acción naranja #ff9d38 y fondo #fffaf3.

Visor claro (papercraft): fondo #F4F1F6 en el contenedor del campus y en sus estados de carga, error y cierre. El HUD es vidrio claro (blanco al 80 %, borde #321853 al 18 %, desenfoque suave; opaco con `prefers-reduced-transparency`) con tinta #321853 (13,5:1 sobre el fondo) y texto secundario #58446f (7,6:1). Las etiquetas emergentes de las herramientas invierten el esquema: texto blanco sobre #321853 (15,1:1). El foco combina un aro interior #321853 de 2 px con un contorno #ffc857 de 3 px y 2 px de separación: el amarillo solo aporta 1,4:1 sobre el fondo claro, por lo que el aro oscuro es el que garantiza el contraste. Herramientas del visor (Vista general, Programa activo, Restablecer, Pausar y Cerrar) de 44 × 44 px en una fila arriba a la derecha (columna en móvil), con etiqueta al pasar o enfocar. Separación de 8/12/16/24 px. Escena: isla facetada violeta, fachadas marfil, cubierta plana violeta, acceso naranja y circulaciones turquesa.

Leyenda y contadores: la leyenda «Representación de tu configuración» va en el pie izquierdo del visor, discreta y siempre visible. Cuatro contadores del motor van en el pie derecho (en móvil, compactos y en una fila): estudiantes atendidos, participaciones por programa, estudiantes simultáneos y equipos necesarios. No hay «existentes» ni «por incorporar» porque el motor no tiene inventario. Sin WebGL, con pérdida de contexto o con el campus cerrado, un resumen textual sustituye a la escena con la misma leyenda.

Escena: isla facetada violeta, fachadas marfil, cubierta plana violeta, acceso naranja y circulaciones turquesa. Las tecnologías se reconocen por su forma de producto (Tale-Bot, dinosaurio Robot Master, base SPIKE, placa de circuitos, cuadricóptero, visores con holograma) y por su ciclo de actividad. Personas articuladas con proporciones por edad y colores de nivel. Geeky, de GuateGeeks/geeky-animation, guía la mirada desde la entrada. Las reglas de construcción y detalle proceden del benchmark school-flat de 3d-assets, adaptadas al storyboard.

Referencias: `docs/campus-3d.md`. Se recuperaron el texto y una imagen de la conversación «Definir storyboards 3D». La imagen adicional «Del aula al campus» suministrada durante la implementación prevalece como dirección visual final; el rediseño del 24 de octubre de 2026 siguió su descripción de seis cuadros y estas reglas.


## Components

### Geeky, guía de la propuesta

Extensión acotada al acceso, chat y borrador vacío de Propuesta (asesor/agent.css). Conserva el campus descrito arriba: papel y crema, tinta violeta, tipografía heredada y naranja para «Empezar mi cotización». La cabecera usa el SVG original de Geeky, sin otro visor 3D. Las variantes agent-* del frontmatter son valores intencionales del componente; conservan la paleta y jerarquía globales. Violeta claro distingue mensajes del usuario y hover; verde identifica escucha y marrón/naranja identifica error junto con texto explícito. No depender solo del color.

El acceso queda a 20 px de los bordes derecho e inferior; el panel limita ancho y altura al viewport con 40 px de margen total. La cabecera reserva 112 × 104 px al personaje. A 650 px de ancho, panel = viewport menos 24 px, con área segura inferior y retrato de 98 × 96 px. A 620 px de alto compacta cabecera y compositor y oculta barra de propuesta y disclosure. La conversación se desplaza dentro del panel; texto largo puede partirse. Los tamaños agent-* documentan la jerarquía propia del chat y borrador, sin ampliar por defecto la escala del formulario. Las propiedades tipográficas normativas están en el frontmatter.

El panel se eleva con sombra violeta suave; recetas y entrada de 220 ms en el sidecar. Botones de al menos 44 px de alto; botones y disclosure conservan foco de 2 px oscuro con separación de 3 px y aro amarillo de 5 px. El área de texto no usa aro ni sombra de foco; el contenedor mantiene un cambio de borde discreto. El retrato es decorativo: estado y anuncios pertenecen al DOM. La actividad proviene del transporte; recibir texto no representa voz. El SVG limita frecuencia a 30 FPS y actividad a ventanas de ocho segundos más la duración de reacciones originales. Pausa local o del campus, movimiento reducido, cierre y pestaña oculta dejan pose estática; no es rendimiento medido.

«Empezar mi cotización» abre Propuesta localmente antes de conectar. La carga inicial conserva el paso; navegar conserva datos y undo comercial. Ver [docs/geeky-agent.md](docs/geeky-agent.md) para comportamiento, procedencia y verificación.
