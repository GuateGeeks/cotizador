// Six reference states of the campus (storyboard, not form steps). Each one is
// built from scratch so a state is reproducible on its own and growth/reduction
// can be compared against a direct build. Runs inside the page: it only uses
// the asesor globals (state, initial, groups, commit, render).
'use strict';

const STATES = Object.freeze([
  { id: 1, name: 'escuela-inicial', label: 'Escuela inicial' },
  { id: 2, name: 'comunidad', label: 'Comunidad educativa' },
  { id: 3, name: 'robotica', label: 'Robótica' },
  { id: 4, name: 'ampliacion', label: 'Programación y ampliación' },
  { id: 5, name: 'entorno', label: 'Entorno y conexiones' },
  { id: 6, name: 'campus', label: 'Campus consolidado' }
]);

/* global state, initial, groups, commit, render */
function applyCampusState(n) {
  state = initial(); // eslint-disable-line no-global-assign
  const sections = (grades, list) => { for (const g of grades) state.enroll[g] = { confirmed: true, sections: list.map((students, i) => ({ id: `${g}-${i + 1}`, name: 'ABC'[i], students })) }; };
  const of = levels => groups().filter(g => levels.includes(g.levelId)).map(g => g.id);
  const entry = (programId, levels, sharing, plan, extra = {}) => {
    const ids = of(levels);
    return { id: `${programId}@${levels[0]}`, programId, groupIds: ids, sharing: ids.length > 1 ? sharing : null, simIds: sharing === 'simultaneous' ? ids.slice(0, 2) : [], units: null, stations: false, plan, confirmed: true, calc: null, ...extra };
  };
  if (n <= 1) { state.step = 1; render(); return; }
  state.levels = ['pre', 'prim'];
  sections(['pk', 'ki', 'pr'], [22]);
  sections(['p1', 'p2', 'p3'], [24]);
  state.selected = [];
  if (n >= 3) state.selected.push(entry('tale', ['pre'], 'separate', 'UNDECIDED'));
  if (n >= 4) {
    sections(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], [25, 24]);
    state.selected.push(entry('master', ['prim'], 'simultaneous', 'FLEX', { flexBimestres: 3 }));
  }
  if (n >= 5) {
    state.levels.push('bas');
    sections(['b1', 'b2', 'b3'], [30, 28]);
    state.selected.push(entry('electronics', ['prim'], 'separate', 'EV8', { stations: true }), entry('drones', ['bas'], 'separate', 'INTEGRA'));
  }
  if (n >= 6) {
    state.levels.push('bach');
    sections(['bc4', 'bc5'], [32, 30]);
    state.selected.push(entry('spike', ['bas', 'bach'], 'unknown', 'EV16'), entry('immersive', ['bach'], 'simultaneous', 'FLEX', { flexBimestres: 4 }));
  }
  state.selected.forEach(commit);
  state.step = n >= 3 ? 5 : 2;
  render();
}

module.exports = { STATES, applyCampusState };
