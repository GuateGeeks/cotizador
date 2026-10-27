'use strict';
// Ejecutar con: node --test asesor/test
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../motor.js');
const C = require('../config.js');

const g = (id, students, label) => ({ id, students, label: label || id });
const entry = (over) => Object.assign({
  id: 'e1', programId: 'master', level: 'prim', groupIds: [], sharing: 'separate', simIds: [],
  units: null, stations: false, plan: 'EV8', flexBimestres: 1, confirmed: true, calc: null
}, over);

test('caso 1: Pre-Kínder 18, Kínder A 12, Kínder B 12 y Preparatoria 20 (62), uso separado: 10 Tale-Bot', () => {
  const groups = [g('pk', 18), g('ka', 12), g('kb', 12), g('pr', 20)];
  assert.equal(groups.reduce((s, x) => s + x.students, 0), 62);
  assert.equal(M.recommend(groups, 2, 'separate', []).teams, 10);
});

test('caso 2: Kínder A y B simultáneos, demás separados: 12 Tale-Bot', () => {
  const groups = [g('pk', 18), g('ka', 12), g('kb', 12), g('pr', 20)];
  assert.equal(M.recommend(groups, 2, 'simultaneous', ['ka', 'kb']).teams, 12);
});

test('caso 3: dos secciones de 13 simultáneas, ratio 2: 14 equipos, no 13', () => {
  const groups = [g('a', 13), g('b', 13)];
  assert.equal(M.recommend(groups, 2, 'simultaneous', ['a', 'b']).teams, 14);
});

test('caso 4: cuatro secciones de 15 con Robot Master en horarios distintos: 60 participantes y 5 equipos', () => {
  const groups = ['a', 'b', 'c', 'd'].map(id => g(id, 15));
  assert.equal(groups.reduce((s, x) => s + x.students, 0), 60);
  assert.equal(M.recommend(groups, 3, 'separate', []).teams, 5);
  const a = M.analyze({ groups, ratio: 3, units: 5, sharing: 'separate', simIds: [] });
  assert.equal(a.state, 'full'); // sin rotaciones internas
});

test('caso 5: una sección de 60 con Robot Master: 20 equipos; con 5 equipos, capacidad 15 y 4 rotaciones', () => {
  const groups = [g('x', 60)];
  assert.equal(M.recommend(groups, 3, 'separate', []).teams, 20);
  const a = M.analyze({ groups, ratio: 3, units: 5, sharing: 'separate', simIds: [] });
  assert.equal(a.state, 'limited');
  assert.equal(a.cap, 15);
  assert.equal(a.maxRot, 4);
});

test('caso 6: una sección de 30 en dos programas cuenta 30 estudiantes únicos', () => {
  const groups = [g('s', 30)];
  assert.equal(M.uniqueStudents(groups, ['s', 's']), 30);
  assert.equal(M.uniqueStudents(groups, [...new Set(['s', 's'])]), 30);
});

test('caso 12: horarios desconocidos no se presentan como cobertura confirmada', () => {
  const groups = ['a', 'b', 'c', 'd'].map(id => g(id, 15));
  const a = M.analyze({ groups, ratio: 3, units: 99, sharing: 'unknown', simIds: [] });
  assert.equal(a.state, 'unconfirmed');
  assert.deepEqual(a.rec.scenarios.map(s => s.teams), [5, 10]);
  assert.equal(M.analyze({ groups, ratio: 3, units: 5, sharing: null, simIds: [] }).state, 'none');
});

test('áreas sin ratio aprobado no calculan equipos', () => {
  assert.equal(M.recommend([g('a', 20)], null, 'separate', []), null);
});

test('matrícula: vacío (null) y cero confirmado se distinguen', () => {
  const groups = M.groupsOf({ p1: { confirmed: false, sections: [{ id: 'p1-1', name: 'A', students: 0 }] } }, C.LEVELS, ['prim']);
  const p1 = groups.find(x => x.id === 'p1-1');
  const p2 = groups.find(x => x.id === 'p2-1');
  assert.equal(p1.students, 0);
  assert.equal(p2.students, null);
  assert.equal(p1.confirmed, true);
  const dos = M.groupsOf({ p1: { confirmed: false, sections: [{ id: 'a', name: 'A', students: 10 }, { id: 'b', name: 'B', students: 12 }] } }, C.LEVELS, ['prim']);
  assert.ok(dos.filter(x => x.gradeId === 'p1').every(x => x.confirmed));
});

test('caso 8 (sin IVA, quetzales enteros): Robot Master, 5 equipos, Evoluciona 8 con cuotas iguales', () => {
  const q = M.quoteFor('EV8', 1, 5, C.TARIFFS.master, C.FISCAL);
  // referencia sin IVA: 17,900 x 5 / 5 x 1.06 = 18,974; inicial 20 % = 3,795; cuotas iguales de 1,897
  assert.equal(q.initial, 3795);
  assert.equal(q.schedule.length, 9); // inicial + 8 cuotas
  assert.ok(q.schedule.slice(1).every(c => c === 1897)); // todas iguales, sin cuota final distinta
  assert.equal(q.net, 3795 + 8 * 1897); // el precio absorbe el ajuste de redondeo
  assert.equal(q.schedule.reduce((s, x) => s + x, 0), q.net);
  assert.ok(Math.abs(q.net - 18974) <= 4);
  // monto con IVA (solo referencia): cada pago x 1.12
  assert.equal(q.initialIva, 4250); assert.ok(q.scheduleIva.slice(1).every(c => c === 2125));
  assert.equal(q.total, 4250 + 8 * 2125); assert.equal(q.net + q.tax, q.total);
});

test('Evoluciona: cuotas iguales; sin IVA suman el neto y con IVA suman el total', () => {
  for (const plan of ['EV8', 'EV16']) for (const units of [1, 2, 3, 5, 7, 12, 17, 33]) for (const id of Object.keys(C.TARIFFS)) {
    const q = M.quoteFor(plan, 1, units, C.TARIFFS[id], C.FISCAL), cuotas = q.schedule.slice(1), cIva = q.scheduleIva.slice(1);
    assert.ok(cuotas.every(c => c === cuotas[0]) && cIva.every(c => c === cIva[0]), plan + ' ' + id + ' ' + units);
    assert.equal(q.initial + cuotas.reduce((s, x) => s + x, 0), q.net);
    assert.equal(q.initialIva + cIva.reduce((s, x) => s + x, 0), q.total);
    assert.equal(q.net + q.tax, q.total);
  }
});

test('cuotas e inicial suman exactamente el neto (sin IVA) y el total (con IVA) en todas las modalidades', () => {
  for (const plan of ['INTEGRA', 'FLEX', 'EV8', 'EV16']) {
    for (const units of [1, 3, 7, 14, 20, 33]) {
      for (const b of [1, 2, 3, 4]) {
        const q = M.quoteFor(plan, b, units, C.TARIFFS.spike, C.FISCAL);
        assert.equal(q.schedule.reduce((s, x) => s + x, 0), q.net, `${plan} ${units} ${b}`);
        assert.equal(q.scheduleIva.reduce((s, x) => s + x, 0), q.total, `${plan} ${units} ${b}`);
        assert.equal(q.net + q.tax, q.total);
        assert.ok(Number.isInteger(q.total) && q.schedule.every(Number.isInteger) && q.scheduleIva.every(Number.isInteger));
      }
    }
  }
});

test('FLEX aplica descuento por bimestres y plazo en meses', () => {
  const q4 = M.quoteFor('FLEX', 4, 10, C.TARIFFS.tale, C.FISCAL);
  assert.equal(q4.net, Math.round(575 * 10 * 4 * 0.95));
  assert.equal(q4.months, 8);
});

test('caso 9: una partida sin tarifa o sin ratio queda pendiente y no completa el total', () => {
  const groups = M.groupsOf({ p1: { confirmed: true, sections: [{ id: 'p1-1', name: 'A', students: 24 }] } }, C.LEVELS, ['prim']);
  const ok = entry({ id: 'ok', groupIds: ['p1-1'] });
  ok.calc = M.entrySignature(ok, groups);
  // programa nuevo sin ratio aprobado ni tarifa
  const programas = [...C.PROGRAMS, { id: 'nuevo', ratio: null }];
  const sinRatio = entry({ id: 'x', programId: 'nuevo', groupIds: ['p1-1'] });
  const t = M.proposalTotals([ok, sinRatio], programas, groups, C.TARIFFS, C.FISCAL);
  assert.equal(t.pricedCount, 1);
  assert.equal(t.unpricedCount, 1);
  assert.equal(t.complete, false);
  assert.equal(t.rows[1].status, 'quote');
  assert.ok(t.total > 0);
});

test('caso 7: dos niveles con modalidades distintas; editar uno conserva el otro', () => {
  const enroll = {
    pk: { confirmed: true, sections: [{ id: 'pk-1', name: 'A', students: 18 }] },
    p3: { confirmed: true, sections: [{ id: 'p3-1', name: 'A', students: 30 }] }
  };
  const groups = M.groupsOf(enroll, C.LEVELS, ['pre', 'prim']);
  const a = entry({ id: 'a', programId: 'tale', level: 'pre', groupIds: ['pk-1'], plan: 'INTEGRA' });
  const b = entry({ id: 'b', programId: 'master', level: 'prim', groupIds: ['p3-1'], plan: 'EV16' });
  a.calc = M.entrySignature(a, groups);
  b.calc = M.entrySignature(b, groups);
  let t = M.proposalTotals([a, b], C.PROGRAMS, groups, C.TARIFFS, C.FISCAL);
  assert.equal(t.complete, true);
  const totalAntes = t.total;
  b.units = 20; // editar el segundo
  t = M.proposalTotals([a, b], C.PROGRAMS, groups, C.TARIFFS, C.FISCAL);
  assert.equal(t.rows[0].status, 'priced');
  assert.equal(t.rows[1].status, 'stale');
  assert.equal(t.complete, false);
  assert.ok(t.total < totalAntes); // solo cuenta lo vigente
  assert.equal(t.rows[0].quote.total, M.quoteFor('INTEGRA', 1, 9, C.TARIFFS.tale, C.FISCAL).total);
});

test('caso 10: cambiar estudiantes, grupos, equipos o modalidad invalida el cálculo previo', () => {
  const mk = (n) => M.groupsOf({ p1: { confirmed: true, sections: [{ id: 'p1-1', name: 'A', students: n }] } }, C.LEVELS, ['prim']);
  const e = entry({ groupIds: ['p1-1'] });
  e.calc = M.entrySignature(e, mk(24));
  const status = (groups) => M.entryStatus(e, C.PROGRAMS[1], groups, C.TARIFFS);
  assert.equal(status(mk(24)), 'priced');
  assert.equal(status(mk(25)), 'stale');         // estudiantes
  e.units = 9; assert.equal(status(mk(24)), 'stale'); // equipos
  e.units = null; assert.equal(status(mk(24)), 'priced');
  e.plan = 'EV16'; assert.equal(status(mk(24)), 'stale'); // modalidad
  e.plan = 'EV8'; e.sharing = 'unknown'; assert.equal(status(mk(24)), 'stale'); // horarios
});

test('caso 11: el borrador sobrevive a guardar y restaurar (JSON) con la misma firma', () => {
  const groups = M.groupsOf({ p1: { confirmed: true, sections: [{ id: 'p1-1', name: 'A', students: 24 }] } }, C.LEVELS, ['prim']);
  const e = entry({ groupIds: ['p1-1'] });
  e.calc = M.entrySignature(e, groups);
  const restored = JSON.parse(JSON.stringify(e));
  assert.equal(M.entryStatus(restored, C.PROGRAMS[1], groups, C.TARIFFS), 'priced');
});

test('cantidad efectiva: usa la elegida o, si no hay, la sugerida', () => {
  const groups = [g('a', 20)];
  const e = entry({ groupIds: ['a'] });
  assert.equal(M.effectiveUnits(e, C.PROGRAMS[1], groups), 7);
  e.units = 4;
  assert.equal(M.effectiveUnits(e, C.PROGRAMS[1], groups), 4);
  assert.equal(M.effectiveUnits(e, { id: 'sin', ratio: null }, groups), null);
});

test('cuota sugerida y simulador siguen la política del cotizador vigente (SPIKE Prime, 5 equipos, Evoluciona 8, 60 estudiantes)', () => {
  const q = M.quoteFor('EV8', 1, 5, C.TARIFFS.spike, C.FISCAL);
  assert.ok(Math.abs(q.total - 71113) <= 4); // el cotizador vigente muestra Q71,113.28; aquí las cuotas quedan iguales
  const sim = M.simulate('EV8', q, 60, 0, C.FISCAL);
  assert.equal(sim.suggested, 200); // Q200.00 en el cotizador vigente
  const r = M.simulate('EV8', q, 60, 200, C.FISCAL);
  assert.equal(r.income, 96000);
  assert.ok(Math.abs(r.diff - 24887) <= 4); // Q24,886.72 en el cotizador vigente
  assert.equal(r.months, 8);
});

test('INTEGRA se simula a 8 meses y FLEX a bimestres x 2 meses', () => {
  const qi = M.quoteFor('INTEGRA', 1, 5, C.TARIFFS.master, C.FISCAL);
  assert.equal(M.simulate('INTEGRA', qi, 30, 100, C.FISCAL).months, 8);
  const qf = M.quoteFor('FLEX', 3, 5, C.TARIFFS.master, C.FISCAL);
  assert.equal(M.simulate('FLEX', qf, 30, 100, C.FISCAL).months, 6);
});

test('compra y renta se pagan en un solo monto; Evoluciona lleva 20 % inicial y cuotas (sin IVA)', () => {
  const qi = M.quoteFor('INTEGRA', 1, 5, C.TARIFFS.master, C.FISCAL);
  assert.equal(qi.initial, qi.net); assert.equal(qi.initialIva, qi.total);
  const qf = M.quoteFor('FLEX', 2, 5, C.TARIFFS.master, C.FISCAL);
  assert.equal(qf.initial, qf.net);
  assert.deepEqual(qf.schedule, [qf.net]); assert.deepEqual(qf.scheduleIva, [qf.total]); // sin pago inicial ni cuotas
  assert.equal(qf.months, 4); // plazo de la renta, solo para el simulador
  for (const plan of ['EV8', 'EV16']) {
    const q = M.quoteFor(plan, 2, 5, C.TARIFFS.master, C.FISCAL);
    assert.ok(Math.abs(q.initial - q.net * 0.2) <= 3);
    assert.ok(q.schedule.length > 2);
  }
});

test('proporciones aprobadas: Tale-Bot 2; Robot Master, SPIKE Prime, electrónica, drones y Meta Quest 3', () => {
  const ratio = id => C.PROGRAMS.find(p => p.id === id).ratio;
  assert.deepEqual(['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'].map(ratio), [2, 3, 3, 3, 3, 3]);
});

test('compatibilidad por grado según el catálogo', () => {
  const grades = id => C.PROGRAMS.find(p => p.id === id).grades;
  // Robot Master: primaria, básico y bachillerato. SPIKE Prime: desde 6.º primaria hasta bachillerato.
  assert.deepEqual(grades('master'), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'b1', 'b2', 'b3', 'bc4', 'bc5']);
  assert.deepEqual(grades('spike'), ['p6', 'b1', 'b2', 'b3', 'bc4', 'bc5']);
  // Drones: primaria alta (4.º a 6.º) en adelante.
  assert.deepEqual(grades('drones'), ['p4', 'p5', 'p6', 'b1', 'b2', 'b3', 'bc4', 'bc5']);
  // Electrónica: toda primaria, básico y bachillerato.
  assert.equal(grades('electronics').length, 11);
  assert.ok(!grades('electronics').includes('pk'));
  // Meta Quest: solo básico y bachillerato.
  assert.deepEqual(grades('immersive'), ['b1', 'b2', 'b3', 'bc4', 'bc5']);
});

test('electrónica, drones y Meta Quest ya se calculan con 3 estudiantes por equipo', () => {
  const groups = [g('a', 20), g('b', 31)];
  for (const id of ['electronics', 'drones', 'immersive']) {
    const p = C.PROGRAMS.find(x => x.id === id);
    assert.equal(M.recommend(groups, p.ratio, 'separate', []).teams, 11); // ceil(31 / 3)
    assert.ok(C.TARIFFS[id]);
  }
});
