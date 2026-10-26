/*
 * Configuración editable del asesor: niveles, programas, compatibilidad, ratios,
 * modalidades, tarifas, fiscalidad y fotos. Ver LEEME.md para editarla.
 * Se carga en el navegador (window.GG_CONFIG) y en las pruebas (require).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GG_CONFIG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Niveles y grados. Cada grado admite varias secciones (A, B, C...).
  const LEVELS = [
    { id: 'pre', name: 'Preprimaria', icon: 'grid', hint: 'Pre-Kínder, Kínder y Preparatoria',
      grades: [['pk', 'Pre-Kínder'], ['ki', 'Kínder'], ['pr', 'Preparatoria']] },
    { id: 'prim', name: 'Primaria', icon: 'book', hint: 'De 1.º a 6.º Primaria',
      grades: [['p1', '1.º Primaria'], ['p2', '2.º Primaria'], ['p3', '3.º Primaria'], ['p4', '4.º Primaria'], ['p5', '5.º Primaria'], ['p6', '6.º Primaria']] },
    { id: 'bas', name: 'Básico', icon: 'users', hint: 'De 1.º a 3.º Básico',
      grades: [['b1', '1.º Básico'], ['b2', '2.º Básico'], ['b3', '3.º Básico']] },
    { id: 'bach', name: 'Bachillerato', icon: 'school', hint: '4.º y 5.º Bachillerato',
      grades: [['bc4', '4.º Bachillerato'], ['bc5', '5.º Bachillerato']] }
  ];

  const PRIM = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const BAS = ['b1', 'b2', 'b3'];
  const BACH = ['bc4', 'bc5'];

  // Compatibilidad (grades) y ratio (estudiantes máximos por equipo) por programa.
  // Robótica: Tale-Bot 2, Robot Master 3, SPIKE Prime 3. Electrónica, drones y Meta Quest: 3.
  // Drones: de 4.º primaria en adelante. Meta Quest: solo básico y bachillerato.
  // ratio: null = "Equipamiento por definir con GuateGeeks" (no se calcula ni se cotiza).
  const PROGRAMS = [
    { id: 'tale', name: 'Robótica para pequeños', icon: 'robot', area: 'Robótica', hardware: 'Tale-Bot', ratio: 2,
      short: 'Secuencias, orientación y retos de programación tangible.',
      levels: ['pre'], grades: ['pk', 'ki', 'pr'] },
    { id: 'master', name: 'Robótica con Robot Master', icon: 'robot', area: 'Robótica', hardware: 'Robot Master', ratio: 3,
      short: 'Construcción, movimiento y pensamiento computacional mediante desafíos.',
      levels: ['prim', 'bas', 'bach'], grades: [...PRIM, ...BAS, ...BACH] },
    { id: 'spike', name: 'Robótica con SPIKE Prime', icon: 'robot', area: 'Robótica', hardware: 'LEGO SPIKE Prime', ratio: 3,
      short: 'Sensores, mecánica y programación progresiva con proyectos de ingeniería.',
      levels: ['prim', 'bas', 'bach'], grades: ['p6', ...BAS, ...BACH] },
    { id: 'electronics', name: 'Electrónica creativa', icon: 'robot', area: 'Electrónica', hardware: 'Kit de electrónica', ratio: 3,
      short: 'Circuitos, sensores y proyectos que conectan la teoría con la práctica.',
      levels: ['prim', 'bas', 'bach'], grades: [...PRIM, ...BAS, ...BACH] },
    { id: 'drones', name: 'Drones educativos', icon: 'robot', area: 'Drones', hardware: 'Dron educativo', ratio: 3,
      short: 'Exploración de vuelo, seguridad y retos tecnológicos colaborativos.',
      levels: ['prim', 'bas', 'bach'], grades: ['p4', 'p5', 'p6', ...BAS, ...BACH] },
    { id: 'immersive', name: 'Experiencias inmersivas', icon: 'robot', area: 'Experiencias inmersivas', hardware: 'Meta Quest', ratio: 3,
      short: 'Exploraciones de realidad virtual y actividades interactivas guiadas.',
      levels: ['bas', 'bach'], grades: [...BAS, ...BACH] }
  ];

  // Modalidades que ve el usuario. Las condiciones se confirman en la cotización validada.
  const PLANS = [
    { id: 'UNDECIDED', title: 'Comparar opciones', tag: 'Por decidir', desc: 'Quiero conocer las alternativas antes de elegir.' },
    { id: 'INTEGRA', title: 'Comprar', tag: 'Integra', desc: 'Compra del equipo: queda en propiedad del colegio desde la compra. Incluye orientación inicial y 1 hora de capacitación de uso; el tiempo adicional se cotiza aparte. No incluye Sócrates Aprende.' },
    { id: 'FLEX', title: 'Rentar', tag: 'Flex', desc: 'Renta por bimestres. Puedes cambiar de tecnología al iniciar cada bimestre. El equipo es de GuateGeeks y se devuelve al terminar. Incluye capacitación docente, integración tecnológica, seguimiento, soporte y Sócrates Aprende.' },
    { id: 'EV8', title: 'Pagar en 8 meses', tag: 'Evoluciona 8', desc: 'Pago inicial del 20 % y cuotas mensuales durante 8 meses. El equipo pasa a ser del colegio al completar el plazo. Incluye capacitación docente, integración tecnológica, recursos para el aula, seguimiento, soporte y Sócrates Aprende. Construimos e integramos contigo un programa que se sostiene, evoluciona y crece en el tiempo.' },
    { id: 'EV16', title: 'Pagar en 16 meses', tag: 'Evoluciona 16', desc: 'Pago inicial del 20 % y cuotas mensuales durante 16 meses. El equipo pasa a ser del colegio al completar el plazo. Incluye los mismos servicios que Evoluciona 8 durante 16 meses.' }
  ];

  // Tarifas del cotizador vigente (costa-sur.js), en quetzales sin IVA. Las de electrónica, drones y Meta Quest están confirmadas con GuateGeeks.
  //  buy:  precio por equipo (Integra)
  //  rent: precio por equipo y por bimestre (Flex); la renta se paga completa en un solo monto
  //  evo8 / evo16: precio de referencia por 5 equipos (Evoluciona), se escala por unidad (fiscal.evolucion)
  const TARIFFS = {
    tale:        { buy: 2000, rent: 575,  evo8: 14700, evo16: 17000 },
    master:      { buy: 2450, rent: 700,  evo8: 17900, evo16: 20600 },
    spike:       { buy: 8200, rent: 1850, evo8: 59900, evo16: 68900 },
    electronics: { buy: 1750, rent: 550,  evo8: 13300, evo16: 15300 },
    drones:      { buy: 4150, rent: 1000, evo8: 30500, evo16: 35100 },
    immersive:   { buy: 5550, rent: 1750, evo8: 44400, evo16: 51100 }
  };

  // Configuración fiscal y reglas comerciales vigentes. Precios en quetzales enteros.
  const FISCAL = {
    iva: 0.12,
    initialRate: 0.2,                       // pago inicial solo en Evoluciona (compra y renta son un solo pago)
    rentDiscount: { 1: 0, 2: 0.02, 3: 0.04, 4: 0.05 }, // descuento por bimestres rentados
    rentMonthsPerPeriod: 2,
    minUnits: 5,                            // mínimo comercial informativo (equipos)
    // Simulador: cuota sugerida = ceil(total con IVA / estudiantes / meses / cobertura, al múltiplo de redondeo)
    sim: { coverage: 0.75, roundTo: 5, buyMonths: 8 },
    evolucionBaseUnits: 5,                  // las tarifas evo8/evo16 están expresadas por 5 equipos
    evolucion: {
      EV8:  { key: 'evo8',  months: 8,  factor: 1.06 },
      EV16: { key: 'evo16', months: 16, factor: 1.10 }
    }
  };

  // Ventajas y puntos a considerar por modalidad (textos del cotizador vigente).
  const GUIDANCE = {
    UNDECIDED: { description: '', pros: [], cons: ['Elige una modalidad para ver sus condiciones.'] },
    INTEGRA: { description: '', pros: [], cons: ['Sócrates Aprende no está incluida en Integra.'] },
    FLEX: { description: 'Flex da acceso temporal al equipo y al programa; la tecnología puede cambiar al iniciar un nuevo bimestre.',
      pros: ['El colegio puede elegir otra tecnología al iniciar cada bimestre.', 'Incluye capacitación docente, integración tecnológica, seguimiento y soporte.', 'Incluye Sócrates Aprende; el contenido para estudiantes depende del grado y la fase.'],
      cons: ['El equipo sigue siendo propiedad de GuateGeeks y debe devolverse al terminar la renta.', 'El precio cambia según la tecnología, la cantidad de equipos y los bimestres seleccionados.', 'El cambio de tecnología aplica al siguiente bimestre, no durante uno que ya comenzó.'] },
    EV8: { description: 'Se paga en formato de renta y cuotas; al completar el plazo, el equipo queda en propiedad del colegio.',
      pros: ['El pago se distribuye durante 8 meses, con un pago inicial del 20 %.', 'Incluye capacitación docente, integración tecnológica, seguimiento y soporte; el contenido de Socrates para estudiantes depende del grado y la fase.', 'Al completar el programa, el equipo queda en propiedad del colegio.'],
      cons: ['Para que el equipo pase a propiedad del colegio, debe completarse el plazo de 8 meses.', 'El programa se desarrolla con la tecnología seleccionada para ese ciclo.', 'La estimación no incluye gastos propios de operación del colegio.'] },
    EV16: { description: 'Se paga en formato de renta y cuotas; al completar el plazo, el equipo queda en propiedad del colegio.',
      pros: ['El pago se distribuye durante 16 meses, con un pago inicial del 20 %.', 'Incluye capacitación docente, integración tecnológica, seguimiento y soporte; el contenido de Socrates para estudiantes depende del grado y la fase.', 'Al completar el programa, el equipo queda en propiedad del colegio.'],
      cons: ['Para que el equipo pase a propiedad del colegio, debe completarse el plazo de 16 meses.', 'El programa se desarrolla con la tecnología seleccionada para ese ciclo.', 'La estimación no incluye gastos propios de operación del colegio.'] }
  };

  // Acceso a Sócrates por grado: 'docente' | 'ahora' (contenido estudiantil, fase actual) | 'fase2'.
  // Dato pendiente de confirmar con GuateGeeks.
  const SOCRATES = {
    pk: 'docente', ki: 'docente', pr: 'docente', p1: 'docente', p2: 'docente', p3: 'docente',
    p4: 'ahora', p5: 'ahora', p6: 'ahora', b1: 'fase2', b2: 'fase2', b3: 'fase2', bc4: 'fase2', bc5: 'fase2'
  };

  // Fotos por programa y nivel (rutas relativas a asesor/index.html).
  // caption (opcional): texto visible sobre la imagen. pdf: foto del equipo que se usa en la cotización en PDF.
  const PHOTOS = {
    tale: [
      { src: '../assets/equipos/talebot3.jpg', levels: ['pre'], alt: 'Niños de preprimaria guiando un Tale-Bot sobre un tapete en el salón' },
      { src: '../assets/equipos/talebot2.jpg', levels: ['pre'], alt: 'Dos niños programando un Tale-Bot con tarjetas de direcciones y una tableta' },
      { src: '../assets/equipos/talebot1.jpg', pdf: true, levels: ['pre'], alt: 'Tale-Bot sobre un tapete de actividades con animales y caminos' }
    ],
    master: [
      { src: '../assets/equipos/robotmaster3.jpg', levels: ['prim'], alt: 'Dos niños controlan desde una tableta un carro armado con Robot Master' },
      { src: '../assets/equipos/robotmaster2.jpg', levels: ['prim'], alt: 'Robot construido con piezas Robot Master y una aplicación de programación en el teléfono' },
      { src: '../assets/equipos/robotmaster1.jpg', pdf: true, levels: ['prim'], alt: 'Kit Robot Master con sus piezas ordenadas, la caja y las guías de actividades' }
    ],
    spike: [
      { src: '../assets/equipos/spikeprimaria2.jpg', levels: ['prim'], alt: 'Dos estudiantes programan con una laptop un robot armado con LEGO SPIKE Prime' },
      { src: '../assets/equipos/spikeprimaria3.jpg', pdf: true, levels: ['prim'], alt: 'Cuatro robots distintos armados con LEGO SPIKE Prime sobre una mesa' },
      { src: '../assets/equipos/spikebasico1.jpg', levels: ['bas', 'bach'], alt: 'Estudiantes arman modelos con los kits de LEGO SPIKE Prime' },
      { src: '../assets/equipos/spikebasico2.jpg', levels: ['bas', 'bach'], alt: 'Dos estudiantes ensamblan un robot con LEGO SPIKE Prime' },
      { src: '../assets/equipos/spikebasico4.jpg', levels: ['bas', 'bach'], alt: 'Estudiantes con un trazador XY construido con LEGO SPIKE Prime' }
    ],
    electronics: [
      { src: '../assets/equipos/electronica-circuitos.jpg', pdf: true, levels: ['prim', 'bas', 'bach'], alt: 'Estudiantes explorando circuitos y una secuencia para encender una luz' }
    ],
    drones: [
      { src: '../assets/equipos/drones-ilustrativo.jpg', pdf: true, levels: ['prim', 'bas', 'bach'], alt: 'Dron educativo y una ruta ilustrada para practicar un recorrido de vuelo' }
    ],
    immersive: [
      { src: '../assets/equipos/inmersivo-ilustrativo.jpg', pdf: true, levels: ['bas', 'bach'], alt: 'Estudiantes explorando realidad virtual y una escena educativa del espacio' }
    ]
  };

  return { LEVELS, PROGRAMS, PLANS, TARIFFS, FISCAL, GUIDANCE, SOCRATES, PHOTOS };
});
