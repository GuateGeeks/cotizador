(() => {
  // Solo se incluyen precios comerciales públicos de referencia; nunca costos ni márgenes internos.
  const programs = {
    TaleBot: {name:'Robótica para pequeños',level:'preprimaria',levelName:'Preprimaria',studentsPerTeam:2,buy:2000,rent:575,evo8:14700,evo16:17000,project:'Rutas para pequeños',image:'talebot-equipo.png',gif:'rutas-pequenos.gif',alt:'Robots educativos pequeños y un recorrido de programación ilustrado',status:'Equipo real · actividad ilustrativa',description:'Una idea para explorar secuencias y direcciones mediante retos de recorrido con robótica tangible.',tags:['Secuencias','Pensamiento lógico','Orientación']},
    'Robot Master': {name:'Robótica para primaria',level:'primaria',levelName:'Primaria · 1.º a 3.º',studentsPerTeam:3,buy:2450,rent:700,evo8:17900,evo16:20600,project:'Robots que se mueven',image:'robot-master-equipo.png',gif:'robot-master-creaciones.gif',alt:'Kit de construcción robótica y un modelo ilustrado de carro programable',status:'Equipo real · actividad ilustrativa',description:'Una idea para construir modelos y explorar movimiento, secuencias y retos de programación.',tags:['Construcción','Movimiento','Pensamiento lógico']},
    Spike: {name:'Robótica para grandes',level:'secundaria',levelName:'4.º a 6.º primaria · secundaria y bachillerato',studentsPerTeam:3,buy:8200,rent:1850,evo8:59900,evo16:68900,project:'Robot Cartógrafo',image:'robot-cartografo.png',gif:'robot-cartografo-recorrido.gif',alt:'Robot cartógrafo construido para explorar rutas en una ciudad',status:'Programa disponible',description:'Los estudiantes construyen y programan un robot para explorar recorridos, medir distancias y representar una ciudad.',tags:['Programación','Medición','Resolución de problemas']},
    Snap: {name:'Electrónica',level:'transversal',levelName:'Primaria y secundaria',studentsPerTeam:3,buy:1750,rent:550,evo8:13300,evo16:15300,project:'Circuitos en Acción',image:'circuitos.png',gif:'circuitos-creaciones.gif',alt:'Estudiantes explorando circuitos y una secuencia para encender una luz',status:'Referencia de catálogo',description:'Una propuesta para explorar conexiones, energía y relaciones de causa y efecto con circuitos.',tags:['Electrónica','Experimentación','Causa y efecto']},
    Drones: {name:'Drones educativos',level:'transversal',levelName:'Primaria y secundaria',studentsPerTeam:2,buy:4150,rent:1000,evo8:30500,evo16:35100,project:'Aventura de vuelo',image:'drones-educativos-generado.png',gif:'drones-recorrido.gif',alt:'Dron educativo y ruta ilustrada para practicar un recorrido de vuelo',status:'Imagen ilustrativa · actividad propuesta',description:'Una propuesta para explorar trayectorias, orientación y resolución de retos mediante una experiencia de vuelo educativo.',tags:['Orientación espacial','Secuencias','Resolución de retos']},
    Meta: {name:'Experiencias inmersivas',level:'transversal',levelName:'Tecnología transversal',studentsPerTeam:3,buy:5550,rent:1750,evo8:44400,evo16:51100,project:'Expediciones VR',image:'realidad-virtual.png',gif:'exploracion-inmersiva.gif',alt:'Estudiantes explorando realidad virtual y una escena educativa del espacio',status:'Referencia de catálogo',description:'Una propuesta de exploraciones inmersivas con experiencias guiadas y reflexión aplicada a ciencia y tecnología.',tags:['Exploración','Ciencia','Reflexión']}
  };
  const modes = {
    BUY: {title:'INTEGRA',months:8,description:''},
    RENT: {title:'FLEX',months:2,description:'Incluye el equipo, el programa, capacitación docente, integración tecnológica, seguimiento y soporte durante la renta. El colegio puede cambiar de tecnología al iniciar cada bimestre; al terminar, devuelve el equipo.'},
    EVO8: {title:'EVOLUCIONA 8',months:8,description:'Incluye equipo, capacitación docente, integración tecnológica, seguimiento y soporte durante 8 meses. Se paga en cuotas y, al completar el programa, el equipo queda en propiedad del colegio.'},
    EVO16: {title:'EVOLUCIONA 16',months:16,description:'Incluye equipo, capacitación docente, integración tecnológica, seguimiento y soporte durante 16 meses. Se paga en cuotas y, al completar el programa, el equipo queda en propiedad del colegio.'}
  };
  function includedItems(mode, program, months) {
    const equipment = mode === 'BUY'
      ? `${program.name} para el aula; propiedad del colegio desde la compra.`
      : mode === 'RENT'
        ? `${program.name} disponible en renta durante ${months} meses; el equipo permanece en propiedad de GuateGeeks.`
        : `${program.name} para el aula; pasa a ser propiedad del colegio al completar ${months} meses.`;
    const items = [{title:'Equipamiento educativo',detail:equipment}];
    if (mode !== 'BUY') items.push({title:'Socrates Aprende',detail:'Acceso para docentes y, según el grado, contenido para estudiantes disponible por fases.'});
    if (mode === 'BUY') {
      items.push({title:'Implementación inicial',detail:'Orientación para poner en marcha el equipamiento en el aula.'});
      items.push({title:'Capacitación de uso',detail:'Incluye 1 hora de capacitación para el uso del equipo. El tiempo adicional se cotiza por separado.'});
    } else if (mode === 'RENT') {
      items[0].detail = `${program.name} disponible en renta durante ${months} meses. Se puede cambiar de tecnología al comenzar cada bimestre; el equipo, propiedad de GuateGeeks, debe devolverse al finalizar la renta.`;
      items.push({title:'Capacitación docente e integración tecnológica',detail:'Capacitación para docentes e integración de la tecnología al trabajo del aula.'});
      items.push({title:'Seguimiento y soporte',detail:`Seguimiento a la implementación y soporte durante los ${months} meses de renta.`});
    } else {
      items.push({title:'Capacitación docente e integración tecnológica',detail:'Capacitación para docentes e integración de la tecnología al trabajo del aula.'});
      items.push({title:'Recursos para el aula',detail:'Actividades prácticas y materiales de apoyo para integrar la tecnología al aprendizaje.'});
      items.push({title:'Seguimiento y soporte',detail:`Seguimiento a la implementación y soporte durante los ${months} meses del programa.`});
    }
    return items;
  }
  const modalityGuidance = {
    BUY: {
      eyebrow:'COMPRA DIRECTA', description:'',
      pros:[],
      cons:['Socrates Aprende no está incluida en INTEGRA.']
    },
    RENT: {
      eyebrow:'RENTA BIMESTRAL', description:'FLEX da acceso temporal al equipo y al programa; la tecnología puede cambiar al iniciar un nuevo bimestre.',
      pros:['El colegio puede elegir otra tecnología al iniciar cada bimestre.','Incluye capacitación docente, integración tecnológica, seguimiento y soporte.','Incluye Socrates Aprende; el contenido para estudiantes depende del grado y la fase.'],
      cons:['El equipo sigue siendo propiedad de GuateGeeks y debe devolverse al terminar la renta.','El precio cambia según la tecnología, la cantidad de equipos y los bimestres seleccionados.','El cambio de tecnología aplica al siguiente bimestre, no durante uno que ya comenzó.']
    },
    EVO8: {
      eyebrow:'PROGRAMA DE 8 MESES', description:'Se paga en formato de renta y cuotas; al completar el plazo, el equipo queda en propiedad del colegio.',
      pros:['El pago se distribuye durante 8 meses, con un pago inicial del 20 %.','Incluye capacitación docente, integración tecnológica, seguimiento y soporte; el contenido de Socrates para estudiantes depende del grado y la fase.','Al completar el programa, el equipo queda en propiedad del colegio.'],
      cons:['Para que el equipo pase a propiedad del colegio, debe completarse el plazo de 8 meses.','El programa se desarrolla con la tecnología seleccionada para ese ciclo.','La estimación no incluye gastos propios de operación del colegio.']
    },
    EVO16: {
      eyebrow:'PROGRAMA DE 16 MESES', description:'Se paga en formato de renta y cuotas; al completar el plazo, el equipo queda en propiedad del colegio.',
      pros:['El pago se distribuye durante 16 meses, con un pago inicial del 20 %.','Incluye capacitación docente, integración tecnológica, seguimiento y soporte; el contenido de Socrates para estudiantes depende del grado y la fase.','Al completar el programa, el equipo queda en propiedad del colegio.'],
      cons:['Para que el equipo pase a propiedad del colegio, debe completarse el plazo de 16 meses.','El programa se desarrolla con la tecnología seleccionada para ese ciclo.','La estimación no incluye gastos propios de operación del colegio.']
    }
  };
  function setList(id, items) {
    $(id).replaceChildren(...items.map(text => {const li=document.createElement('li');li.textContent=text;return li;}));
  }
  const $ = id => document.getElementById(id);
  const money = new Intl.NumberFormat('es-GT',{style:'currency',currency:'GTQ',minimumFractionDigits:2,maximumFractionDigits:2});
  const fmt = value => money.format(value);
  const levelFilter = $('level-filter'), programFilter = $('program-filter'), modeFilter = $('offer-filter');
  const qtyInput = $('equipment-count'), feeInput = $('school-fee'), studentsInput = $('student-count');
  function eligiblePrograms() {
    const level = levelFilter.value;
    return Object.entries(programs).filter(([,p]) => level === 'all' || p.level === level || (['primaria','secundaria'].includes(level) && p.level === 'transversal') || (level === 'primaria' && p.level === 'secundaria'));
  }
  function refreshPrograms() {
    const previous = programFilter.value;
    const eligible = eligiblePrograms();
    programFilter.replaceChildren();
    eligible.forEach(([id,p]) => programFilter.add(new Option(p.name,id)));
    programFilter.value = eligible.some(([id]) => id === previous) ? previous : (eligible[0]?.[0] || 'all');
  }
  function selectedProgramId() { return programFilter.value || eligiblePrograms()[0]?.[0] || 'Spike'; }
  function socratesAudience(level, programId) {
    if (level === 'primaria' && programId === 'Spike') return {
      badge:'FASE ACTUAL · 4.º–6.º PRIMARIA',
      description:'Los estudiantes de 4.º a 6.º primaria pueden utilizar contenido de Socrates Aprende en la fase actual. La expansión continuará con básico y después bachillerato.'
    };
    if (level === 'preprimaria' || (level === 'primaria' && programId === 'Robot Master')) return {
      badge:'ACCESO PARA DOCENTES',
      description:'En preprimaria y de 1.º a 3.º primaria, Socrates Aprende se contempla como recurso docente; por ahora no incluye contenido para estudiantes. La fase actual de contenido estudiantil abarca 4.º a 6.º primaria.'
    };
    if (level === 'secundaria') return {
      badge:'ESTUDIANTES · FASE 2',
      description:'Para este nivel, Socrates Aprende está disponible actualmente como recurso docente. El acceso estudiantil se incorporará progresivamente en la fase 2: primero básico y luego bachillerato.'
    };
    return {
      badge:'CONTENIDO ESTUDIANTIL POR FASE',
      description:'La fase actual ofrece contenido para estudiantes de 4.º a 6.º primaria. En preprimaria y de 1.º a 3.º primaria, el acceso es solo para docentes. En la fase 2 se incorporará básico y, después, bachillerato.'
    };
  }
  function totals(program, mode, quantity) {
    let net, months = modes[mode].months;
    if (mode === 'BUY') net = program.buy * quantity;
    if (mode === 'RENT') {
      const periods = Number($('rental-period')?.value || 1);
      const discount = {1:0,2:.02,3:.04,4:.05}[periods];
      net = program.rent * quantity * periods * (1 - discount);
      months = periods * 2;
    }
    if (mode === 'EVO8') net = program.evo8 * quantity / 5 * 1.06;
    if (mode === 'EVO16') net = program.evo16 * quantity / 5 * 1.10;
    const tax = net * .12, gross = net + tax;
    const initialRate = mode === 'EVO8' || mode === 'EVO16' || mode === 'RENT' ? .2 : 1;
    const initial = gross * initialRate;
    return {net,tax,gross,months,initial,monthly:mode === 'BUY' ? 0 : (gross-initial)/months,initialRate};
  }
  function render() {
    const programId = selectedProgramId(), program = programs[programId], mode = modeFilter.value, model = modes[mode];
    const isBuy = mode === 'BUY';
    const quantity = Math.max(1,Math.min(100,Math.floor(Number(qtyInput.value) || 1)));
    if (qtyInput.value !== String(quantity)) qtyInput.value = String(quantity);
    const quote = totals(program,mode,quantity), students = Number(studentsInput.value);
    const suggested = Math.ceil((quote.gross / Math.max(1,Number.isFinite(students) ? students : 1) / quote.months / .75) / 5) * 5;
    const followSuggested = $('use-suggested-fee').checked;
    feeInput.readOnly = followSuggested;
    if (followSuggested) feeInput.value = String(suggested);
    $('school-fee-help').textContent = followSuggested ? 'El cobro sigue la sugerencia; desmarca la casilla para probar una cuota propia.' : 'Prueba un cobro distinto. Puedes volver a activar la sugerencia cuando quieras.';
    const fee = Number(feeInput.value);
    $('offer-title').textContent = model.title;
    $('offer-description').textContent = model.description;
    $('offer-description').hidden = isBuy;
    $('term-badge').textContent = `${quote.months} meses`;
    $('quote-net').textContent = fmt(quote.net);
    $('quote-total-with-vat').textContent = fmt(quote.gross);
    $('tax-note').textContent = `Incluye IVA de ${fmt(quote.tax)}`;
    if (mode === 'BUY') $('quote-basis').textContent = `${quantity} ${quantity === 1 ? 'equipo' : 'equipos'} × ${fmt(program.buy)} por equipo = ${fmt(quote.net)} sin IVA`;
    else if (mode === 'RENT') $('quote-basis').textContent = `Renta de ${quantity} ${quantity === 1 ? 'equipo' : 'equipos'} durante ${quote.months} meses · ${fmt(quote.net)} sin IVA`;
    else $('quote-basis').textContent = `${model.title} para ${quantity} ${quantity === 1 ? 'equipo' : 'equipos'} · ${quote.months} meses`;
    const isEvol = mode === 'EVO8' || mode === 'EVO16';
    document.querySelector('.payment-block').hidden = !isEvol;
    $('explorer').hidden = isBuy;
    const guidance = modalityGuidance[mode];
    $('integra-details').hidden = false;
    $('integra-training').hidden = !isBuy;
    $('modality-eyebrow').textContent = guidance.eyebrow;
    $('modality-description').textContent = guidance.description;
    $('modality-description').hidden = !guidance.description;
    $('modality-pros-title').textContent = `Ventajas de ${model.title}`;
    $('modality-cons-title').textContent = 'Para tomar en cuenta';
    $('integra-pros').hidden = isBuy;
    $('integra-title').textContent = isBuy ? 'Un punto a considerar' : 'Ventajas y puntos a considerar';
    setList('modality-pros',guidance.pros);
    setList('modality-cons',guidance.cons);
    $('initial-label').textContent = isEvol || mode === 'RENT' ? 'Pago inicial · 20 %' : 'Pago inicial · 100 %';
    $('initial-payment').textContent = fmt(quote.initial);
    $('installment-label').textContent = isEvol ? `${quote.months} cuotas mensuales aprox.` : mode === 'RENT' ? `Renta mensual · ${quote.months} meses` : 'Pago único';
    $('monthly-payment').textContent = isBuy ? '—' : fmt(quote.monthly);
    $('ownership-note').textContent = isBuy ? 'El equipamiento queda en propiedad del colegio desde la compra.' : mode === 'RENT' ? 'El equipamiento se utiliza durante la renta; las condiciones finales se confirman con GuateGeeks.' : 'El equipamiento queda en propiedad del colegio al completar el contrato.';
    $('ownership-note').hidden = isBuy;
    $('rounding-note').hidden = !isEvol;
    $('rental-field').hidden = mode !== 'RENT';
    $('experience-title').textContent = program.name;
    const capacity = quantity * program.studentsPerTeam;
    const validGroupSize = Number.isSafeInteger(students) && students >= 1;
    const recommendedTeams = validGroupSize ? Math.ceil(students / program.studentsPerTeam) : 0;
    const rotations = validGroupSize ? Math.ceil(students / capacity) : 0;
    $('catalog-program-summary').textContent = program.name;
    $('catalog-level-summary').textContent = program.level === 'primaria'
      ? program.levelName.replace('Primaria · ','')
      : program.level === 'secundaria' ? '4.º–6.º primaria · secundaria y bachillerato' : program.levelName;
    $('catalog-team-summary').textContent = `${program.studentsPerTeam} por equipo`;
    $('catalog-equipment-summary').textContent = `${quantity} ${quantity === 1 ? 'equipo' : 'equipos'}`;
    $('catalog-model-summary').textContent = model.title;
    $('catalog-minimum-note').hidden = quantity >= 5;
    $('student-count-help').textContent = validGroupSize
      ? `Referencia: ${program.studentsPerTeam} estudiantes por equipo. Para ${students} estudiantes se sugieren ${recommendedTeams} ${recommendedTeams === 1 ? 'equipo' : 'equipos'}. Con los ${quantity} seleccionados hay capacidad simultánea para ${capacity}; se estiman ${rotations} ${rotations === 1 ? 'rotación' : 'rotaciones'}. Ajusta los equipos según el horario del colegio.`
      : `Referencia: ${program.studentsPerTeam} estudiantes por equipo. Ingresa la cantidad de estudiantes para estimar los equipos necesarios.`;
    $('suggested-fee').textContent = fmt(suggested);
    $('suggested-description').textContent = `El colegio puede cobrar a cada estudiante esta cuota mensual por participar en ${model.title}. Sugerida para ${quantity} ${quantity === 1 ? 'equipo' : 'equipos'} y ${Number.isFinite(students) && students > 0 ? students : 'el grupo seleccionado'} estudiantes; la institución define el monto final.`;
    const validStudents = Number.isSafeInteger(students) && students >= 1 && students <= 500;
    const validFee = Number.isFinite(fee) && fee >= 1 && fee <= 10000;
    $('validation-message').hidden = validStudents && validFee;
    $('results').hidden = !(validStudents && validFee);
    studentsInput.setAttribute('aria-invalid',String(!validStudents)); feeInput.setAttribute('aria-invalid',String(!validFee));
    if (validStudents && validFee) {
      const revenue = fee * students * quote.months, difference = revenue - quote.gross;
      $('results-period').textContent = `${quote.months} meses`;
      $('revenue-estimate').textContent = fmt(revenue);
      $('revenue-breakdown').textContent = `${fmt(fee*students)} al mes · ${students} estudiantes`;
      $('applied-monthly-fee').textContent = fmt(fee);
      $('gross-difference').textContent = fmt(difference);
      $('difference-per-student').textContent = fmt(difference/students);
      $('difference-per-student-month').textContent = fmt(difference/students/quote.months);
      $('student-total-label').textContent = `Por estudiante · durante ${quote.months} meses`;
    }
    const assetRoot = 'assets/projects/';
    $('project-image').src = assetRoot + program.image;
    $('project-image').alt = program.alt;
    $('project-animation').srcset = assetRoot + 'animations/' + program.gif;
    $('project-status').textContent = program.status;
    $('project-title').textContent = program.project;
    $('project-description').textContent = program.description;
    $('project-tags').replaceChildren(...program.tags.map(tag => {const span=document.createElement('span');span.textContent=tag;return span;}));
    $('included-title').textContent = `Qué incluye ${model.title}`;
    $('included-intro').hidden = isBuy;
    $('included-intro').textContent = mode === 'BUY'
      ? ''
      : mode === 'RENT'
        ? `FLEX incluye el equipo de ${program.name.toLowerCase()}, capacitación docente, integración tecnológica, seguimiento y soporte durante ${quote.months} meses. Puedes cambiar de tecnología al iniciar cada bimestre; al terminar, el equipo se devuelve.`
        : `${model.title} incluye ${program.name.toLowerCase()}, capacitación docente, integración tecnológica, seguimiento y soporte durante ${quote.months} meses. Al completar el programa, el equipo pasa a propiedad del colegio.`;
    $('included-features').replaceChildren(...includedItems(mode,program,quote.months).map(item => {
      const article=document.createElement('article'); article.className='included-feature';
      const heading=document.createElement('h3'); heading.textContent=item.title;
      const detail=document.createElement('p'); detail.textContent=item.detail;
      article.append(heading,detail); return article;
    }));
    const platformIncluded = mode !== 'BUY';
    $('socrates-inclusion').hidden = !platformIncluded;
    const audience = socratesAudience(levelFilter.value,programId);
    $('socrates-audience-badge').textContent = audience.badge;
    $('socrates-description').textContent = audience.description;
    $('socrates-term').textContent = `La vigencia del acceso se acuerda con GuateGeeks según el modelo ${model.title}.`;
    $('fineprint').textContent = isBuy
      ? `Precio de INTEGRA para ${quantity} ${quantity===1?'equipo':'equipos'}. La cotización final se confirma con GuateGeeks.`
      : `Estimación para ${quantity} ${quantity===1?'equipo':'equipos'} y ${studentsInput.value || 'el grupo seleccionado'} estudiantes. La inversión corresponde al modelo ${model.title}; la cuota del colegio se puede ajustar. La cotización final se confirma con GuateGeeks.`;
  }

  Object.entries(programs).forEach(([id,p]) => programFilter.add(new Option(p.name,id)));
  programFilter.value = 'Spike';
  levelFilter.addEventListener('change',() => {refreshPrograms();render();});
  [programFilter,modeFilter,qtyInput,feeInput,studentsInput].forEach(el => el.addEventListener('input',render));
  [programFilter,modeFilter].forEach(el => el.addEventListener('change',render));
  $('use-suggested-fee').addEventListener('change',render);
  $('rental-period').addEventListener('change',render);
  render();
})();
