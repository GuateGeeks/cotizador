'use strict';
// Regla comercial: un mismo kit (Robot Master, SPIKE Prime, electrónica, realidad virtual) sirve a varios niveles.
// Agregar un programa crea UN solo conjunto de equipos para todos los niveles donde aplica; no se duplica por nivel.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('../motor.js'), C = require('../config.js');

const source = fs.readFileSync(path.join(__dirname, '../asesor.js'), 'utf8');
const pick = re => { const m = source.match(re); if (!m) throw new Error('no encontré ' + re); return m[0]; };
const code = [
  pick(/const compatible = [^\n]+/), pick(/const recommended = [^\n]+/), pick(/const entryGroups = [^\n]+/),
  pick(/function entryAt\([^\n]+/), pick(/function addProgram\(id, level\) \{[\s\S]*?\n\}\n/)
].join('\n');

// Colegio con estudiantes por grado: { grado: estudiantes }.
function school(levels, perGrade) {
  const enroll = {};
  for (const l of C.LEVELS) for (const [gid] of l.grades) if (perGrade[gid]) enroll[gid] = { confirmed: true, sections: [{ id: gid + '-1', name: 'A', students: perGrade[gid] }] };
  return { levels, enroll, selected: [] };
}
function host(state) {
  const notes = [];
  const sandbox = {
    get state() { return state; }, ui: {}, render() {}, notify: m => notes.push(m),
    groups: () => M.groupsOf(state.enroll, C.LEVELS, state.levels),
    findP: id => C.PROGRAMS.find(p => p.id === id), findL: id => C.LEVELS.find(l => l.id === id),
    joinY: a => a.join(' y ')
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(code, context);
  return { add: (id, level) => vm.runInContext('addProgram(' + JSON.stringify(id) + ',' + JSON.stringify(level) + ')', context), at: (id, level) => vm.runInContext('entryAt(' + JSON.stringify(id) + ',' + JSON.stringify(level) + ')', context), notes, sandbox };
}
const ids = e => JSON.stringify(e.groupIds);

test('Robot Master se agrega una sola vez para primaria y básico, con el mismo equipo', () => {
  const state = school(['pre', 'prim', 'bas'], { pk: 10, ki: 10, pr: 10, p1: 20, p2: 20, p3: 20, p4: 20, p5: 20, p6: 20, b1: 25, b2: 25, b3: 25 });
  const h = host(state);
  h.add('master', 'prim');
  assert.equal(state.selected.length, 1, 'un solo conjunto de equipos, no uno por nivel');
  const e = state.selected[0];
  assert.equal(e.id, 'master@prim+bas');
  assert.equal(ids(e), JSON.stringify(['p1-1', 'p2-1', 'p3-1', 'p4-1', 'p5-1', 'p6-1', 'b1-1', 'b2-1', 'b3-1']));
  assert.ok(!e.groupIds.some(id => ['pk-1', 'ki-1', 'pr-1'].includes(id)), 'preprimaria no entra: Robot Master no aplica ahí');
  assert.equal(h.at('master', 'bas'), 0, 'la tarjeta de básico aparece como elegida');
  assert.match(h.notes.at(-1), /con el mismo equipo/);
  h.add('master', 'bas');
  assert.equal(state.selected.length, 1, 'elegirlo de nuevo desde otro nivel no lo duplica');
});

test('Tale-Bot solo cubre preprimaria y un programa por nivel sigue siendo posible', () => {
  const state = school(['pre', 'prim'], { pk: 10, ki: 10, pr: 10, p1: 20, p2: 20 });
  const h = host(state);
  h.add('tale', 'pre');
  assert.equal(state.selected.length, 1);
  assert.equal(ids(state.selected[0]), JSON.stringify(['pk-1', 'ki-1', 'pr-1']));
  h.add('electronics', 'prim');
  assert.equal(state.selected.length, 2);
  assert.equal(state.selected[1].id, 'electronics@prim');
});

test('SPIKE Prime entra por defecto con los grados recomendados de todos los niveles', () => {
  const state = school(['prim', 'bas', 'bach'], { p1: 20, p2: 20, p3: 20, p4: 20, p5: 20, p6: 20, b1: 25, bc4: 30 });
  const h = host(state);
  h.add('spike', 'prim');
  assert.equal(state.selected.length, 1);
  assert.equal(ids(state.selected[0]), JSON.stringify(['p4-1', 'p5-1', 'p6-1', 'b1-1', 'bc4-1']), '1.º a 3.º no son recomendados: se pueden sumar al configurar, no vienen por defecto');
  assert.equal(state.selected[0].id, 'spike@prim+bas+bach');
});

test('si el nivel desde donde se agrega no tiene grados recomendados, entran sus grados permitidos', () => {
  const state = school(['prim', 'bas'], { p1: 20, p2: 20, p3: 20, b1: 25 });
  const h = host(state);
  h.add('spike', 'prim');
  assert.equal(state.selected.length, 1, 'sigue siendo un solo equipo');
  assert.equal(ids(state.selected[0]), JSON.stringify(['p1-1', 'p2-1', 'p3-1', 'b1-1']));
  assert.equal(h.at('spike', 'prim'), 0);
});

test('si el programa ya se separó por nivel, agregar desde otro nivel suma solo ese nivel', () => {
  const state = school(['prim', 'bas'], { p1: 20, p2: 20, b1: 25, b2: 25 });
  const h = host(state);
  state.selected.push({ id: 'master@prim', programId: 'master', groupIds: ['p1-1', 'p2-1'], sharing: null, simIds: [], units: null, stations: false, plan: 'UNDECIDED', flexBimestres: 1, confirmed: false, calc: null });
  h.add('master', 'bas');
  assert.equal(state.selected.length, 2);
  assert.equal(state.selected[1].id, 'master@bas');
  assert.equal(ids(state.selected[1]), JSON.stringify(['b1-1', 'b2-1']));
});

test('un mismo kit compartido necesita menos equipos que uno por nivel (sin duplicar costos)', () => {
  const state = school(['prim', 'bas'], { p1: 20, p2: 20, p3: 20, p4: 20, p5: 20, p6: 20, b1: 25, b2: 25, b3: 25 });
  const h = host(state);
  h.add('master', 'prim');
  const shared = state.selected[0], p = C.PROGRAMS.find(x => x.id === 'master'), gs = M.groupsOf(state.enroll, C.LEVELS, state.levels);
  shared.sharing = 'separate'; // los grupos usan el equipo en horarios distintos
  const sharedUnits = M.effectiveUnits(shared, p, gs);
  const perLevel = ['p', 'b'].map(prefix => { const ids = shared.groupIds.filter(id => id.startsWith(prefix)); return M.effectiveUnits({ ...shared, groupIds: ids, sharing: 'separate', units: null }, p, gs); });
  const duplicated = perLevel.reduce((n, u) => n + u, 0);
  assert.ok(sharedUnits > 0);
  assert.ok(sharedUnits < duplicated, 'compartido ' + sharedUnits + ' equipos frente a ' + duplicated + ' si se separa por nivel');
});

test('el cliente puede aumentar o disminuir la cantidad de equipos del kit compartido', () => {
  const state = school(['prim', 'bas'], { p1: 20, p2: 20, b1: 25, b2: 25 });
  const h = host(state);
  h.add('master', 'prim');
  const e = state.selected[0], p = C.PROGRAMS.find(x => x.id === 'master'), gs = M.groupsOf(state.enroll, C.LEVELS, state.levels);
  e.sharing = 'separate';
  const base = M.effectiveUnits(e, p, gs);
  e.units = base + 3; assert.equal(M.effectiveUnits(e, p, gs), base + 3);
  e.units = Math.max(1, base - 2); assert.equal(M.effectiveUnits(e, p, gs), Math.max(1, base - 2));
  assert.equal(e.groupIds.length, 4, 'cambiar la cantidad no reduce los niveles cubiertos');
});
