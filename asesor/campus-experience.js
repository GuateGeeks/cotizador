/* Semantic feedback for the campus. Every number comes from the quotation. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGCampusExperience = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const programs = {
    tale: { name: 'Tale-Bot', action: 'Programar jugando', detail: 'Ordenan tarjetas de flechas, presionan el botón y el Tale-Bot recorre el tapete paso a paso.', icon: 'robot', color: '#ffc857' },
    master: { name: 'Robot Master', action: 'Construir y mover', detail: 'Arman un dinosaurio pieza por pieza, lo programan en la tableta y lo ponen a caminar.', icon: 'robot', color: '#ff9460' },
    spike: { name: 'SPIKE Prime', action: 'Inventar con sensores', detail: 'Programan en la laptop; el robot sigue la línea y activa la misión del tapete.', icon: 'robot', color: '#c2da62' },
    electronics: { name: 'Electrónica', action: 'Encender una idea', detail: 'Colocan la pieza que falta, encienden el interruptor y miden el circuito con el multímetro.', icon: 'circuit', color: '#71ded8' },
    drones: { name: 'Drones', action: 'Explorar el vuelo', detail: 'El piloto despega, cruza el aro sobre el mapa y aterriza; luego cede el control.', icon: 'drone', color: '#a9cdfc' },
    immersive: { name: 'Realidad virtual', action: 'Explorar otros mundos', detail: 'Con visores, exploran un planeta, el Templo I de Tikal y una molécula, guiados por su docente.', icon: 'vr', color: '#d9b5ff' }
  };
  const levels = { pre: 'Preprimaria', prim: 'Primaria', bas: 'Básico', bach: 'Bachillerato' };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const number = n => Number(n || 0).toLocaleString('es-GT');
  const named = (data, id) => data.enrollment.find(g => g.id === id)?.label || 'Grupo';
  function describe(data, previous, context = {}) {
    let focus = { ...context }, changed = false, removed = false;
    let entry = data.equipment.find(e => e.id === focus.entryId) || data.equipment.find(e => e.programId === focus.programId);
    if (previous) {
      const addedLevel = data.levels.find(id => !previous.levels.includes(id));
      const lostLevel = previous.levels.find(id => !data.levels.includes(id));
      const addedProgram = data.programs.find(id => !previous.programs.includes(id));
      const lostProgram = previous.programs.find(id => !data.programs.includes(id));
      if (addedLevel || lostLevel) { focus = { kind: 'level', levelId: addedLevel || lostLevel }; changed = true; removed = !!lostLevel && !addedLevel; }
      else if (addedProgram || lostProgram) { focus = { kind: 'program', programId: addedProgram || lostProgram }; changed = true; removed = !!lostProgram && !addedProgram; }
      else if (!same(data.enrollment, previous.enrollment)) {
        const row = data.enrollment.find(g => !same(g, previous.enrollment.find(p => p.id === g.id)));
        focus = { kind: 'enrollment', levelId: row?.levelId || context.levelId, groupId: row?.id }; changed = true;
      } else {
        for (const next of data.equipment) {
          const before = previous.equipment.find(e => e.id === next.id);
          if (!before || same(next, before)) continue;
          let kind = !same(next.groupIds, before.groupIds) ? 'groups'
            : next.sharing !== before.sharing || !same(next.simIds, before.simIds) ? 'sharing'
            : next.stations !== before.stations ? 'stations'
            : next.plan !== before.plan || next.flexBimestres !== before.flexBimestres ? 'plan' : 'equipment';
          focus = { kind, programId: next.programId, entryId: next.id }; entry = next; changed = true; break;
        }
      }
    }
    entry = data.equipment.find(e => e.id === focus.entryId) || data.equipment.find(e => e.programId === focus.programId) || entry;
    const meta = programs[focus.programId] || { name: 'Tu colegio', icon: 'school', color: '#ffc857' };
    let result = { focus, changed, removed, icon: meta.icon, color: meta.color, title: 'Tu colegio cobra vida', text: 'Toca un taller para explorar su actividad.', diagram: 'overview', items: [] };
    switch (focus.kind) {
      case 'level': {
        const name = levels[focus.levelId] || 'Tu colegio';
        result.title = removed ? name + ' sale de la propuesta' : name + ' tiene su lugar';
        result.text = removed ? 'El campus se adapta a los niveles que conservaste.' : 'Su aula se ilumina. Ahora dale una comunidad.';
        result.icon = 'school'; result.diagram = 'levels'; result.items = data.levels.map(id => ({ label: levels[id], active: id === focus.levelId })); break;
      }
      case 'enrollment': {
        const rows = data.enrollment.filter(g => !focus.levelId || g.levelId === focus.levelId);
        const students = rows.reduce((n, g) => n + (g.students || 0), 0);
        const row = rows.find(g => g.id === focus.groupId);
        result.title = number(students) + ' estudiantes en ' + (levels[focus.levelId] || 'tu colegio');
        result.text = row ? row.label + (row.students == null ? ': matrícula por confirmar.' : ': ' + number(row.students) + ' estudiantes registrados.') : changed ? 'Los grupos del colegio se reorganizan.' : 'Agrega estudiantes y observa cómo llega la comunidad.';
        result.icon = 'users'; result.diagram = 'enrollment'; result.items = rows.filter(g => g.students > 0).slice(0, 4).map(g => ({ label: g.label, value: g.students, active: g.id === focus.groupId })); break;
      }
      case 'program':
        result.title = removed ? meta.name + ' sale del campus' : meta.action || 'Elige una actividad';
        result.text = removed ? 'Retiramos su actividad; tus otros talleres siguen funcionando.' : meta.detail || 'Cada tecnología pone en marcha un taller diferente.';
        result.diagram = 'program'; break;
      case 'groups':
        result.title = number(entry?.participants) + ' estudiantes participan';
        result.text = 'Estos grupos comparten la actividad de ' + meta.name + '.';
        result.diagram = 'groups'; result.items = (entry?.groupIds || []).slice(0, 4).map(id => ({ label: named(data, id), active: true })); break;
      case 'sharing':
        result.title = entry?.sharing === 'separate' ? 'Un taller, distintos turnos' : entry?.sharing === 'simultaneous' ? 'Grupos trabajando a la vez' : 'Horarios por definir';
        result.text = entry?.sharing === 'separate' ? 'Los grupos se relevan usando el mismo conjunto de equipos.' : entry?.sharing === 'simultaneous' ? 'Los grupos marcados coinciden; la cantidad se recalcula con ellos.' : 'La recomendación conserva los escenarios mínimo y máximo.';
        result.diagram = entry?.sharing === 'separate' ? 'turns' : entry?.sharing === 'simultaneous' ? 'parallel' : 'pending';
        result.items = (entry?.groupIds || []).slice(0, 4).map(id => ({ label: named(data, id), active: entry?.sharing === 'separate' || entry?.simIds.includes(id) })); break;
      case 'stations':
      case 'equipment':
        result.title = entry?.stations ? 'Aprender por estaciones' : entry?.units == null ? 'Equipos por definir' : number(entry.units) + ' equipos en el taller';
        result.text = entry?.stations ? 'Los estudiantes rotan entre actividades. ' + number(entry?.capacity) + ' pueden usar el equipo por turno.' : 'La mesa cambia con tu cantidad de ' + meta.name + '.';
        result.diagram = entry?.stations ? 'stations' : 'equipment';
        result.items = [{ label: 'equipos', value: entry?.units || 0 }, { label: 'por turno', value: entry?.capacity || 0 }]; break;
      case 'plan': {
        const plan = entry?.plan;
        result.diagram = 'plan'; result.plan = plan; result.icon = 'calendar';
        if (plan === 'INTEGRA') { result.title = 'El equipo es de tu colegio'; result.text = 'Compra · propiedad desde el primer día.'; result.items = [{ label: 'Compra', active: true }, { label: 'Tu colegio', active: true }]; }
        else if (plan === 'FLEX') { const terms = entry.flexBimestres || 1; result.title = terms + (terms === 1 ? ' bimestre de exploración' : ' bimestres de exploración'); result.text = 'Renta · puedes cambiar de tecnología al iniciar cada bimestre; devuelves el equipo al terminar.'; result.items = Array.from({ length: terms }, (_, i) => ({ label: 'B' + (i + 1), active: true })); }
        else if (plan === 'EV8' || plan === 'EV16') { const terms = plan === 'EV8' ? 8 : 16; result.title = terms + ' meses para hacerlo tuyo'; result.text = '20 % inicial + ' + terms + ' cuotas. Propiedad al completar el plazo.'; result.items = Array.from({ length: terms }, (_, i) => ({ label: String(i + 1), active: true })); }
        else { result.title = 'Elige cómo llevarlo a tu colegio'; result.text = 'Compara compra, renta y pagos para adquirir el equipo.'; result.items = []; }
        break;
      }
      default:
        if (!data.levels.length) { result.title = 'Todo empieza con un aula'; result.text = 'Elige un nivel y mira cómo empieza a crecer.'; }
        else if (!data.programs.length) { result.title = '¿Qué van a crear aquí?'; result.text = 'Agrega una tecnología para poner el campus en acción.'; }
    }
    return result;
  }
  return { describe, programs };
});
