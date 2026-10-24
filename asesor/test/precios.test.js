'use strict';
// Validación de precios contra la fórmula del cotizador vigente (costa-sur.js), calculada de forma independiente.
// Ejecutar con: node --test asesor/test/precios.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../motor.js');
const { PROGRAMS, TARIFFS, FISCAL } = require('../config.js');

// Referencia independiente (misma fórmula que costa-sur.js, sin redondear)
const ref = {
  INTEGRA: (t, u) => t.buy * u,
  FLEX: (t, u, b) => t.rent * u * b * (1 - ({ 1: 0, 2: 0.02, 3: 0.04, 4: 0.05 })[b]),
  EV8: (t, u) => t.evo8 * u / 5 * 1.06,
  EV16: (t, u) => t.evo16 * u / 5 * 1.10
};
const ids = Object.keys(TARIFFS);

test('INTEGRA y FLEX: neto, IVA y total coinciden con la fórmula para 1 a 150 equipos en todas las tecnologías', () => {
  for (const id of ids) for (let u = 1; u <= 150; u++) {
    const q = M.quoteFor('INTEGRA', 1, u, TARIFFS[id], FISCAL), n = ref.INTEGRA(TARIFFS[id], u);
    assert.equal(q.net, Math.round(n), `${id} integra ${u}`); assert.equal(q.tax, Math.round(n * 0.12)); assert.equal(q.total, q.net + q.tax);
    for (const b of [1, 2, 3, 4]) {
      const f = M.quoteFor('FLEX', b, u, TARIFFS[id], FISCAL), nf = ref.FLEX(TARIFFS[id], u, b);
      assert.equal(f.net, Math.round(nf), `${id} flex ${u} x${b}`); assert.equal(f.total, f.net + f.tax);
      assert.ok(Math.abs(f.tax - nf * 0.12) <= 1, 'IVA del 12 % con diferencia máxima de Q1 por redondeo');
      assert.equal(f.months, b * 2); assert.deepEqual(f.schedule, [f.total]); // pago único
    }
  }
});

test('Evoluciona 8 y 16: total dentro del ajuste de redondeo, 20 % inicial y cuotas iguales', () => {
  for (const id of ids) for (let u = 1; u <= 150; u++) for (const plan of ['EV8', 'EV16']) {
    const e = FISCAL.evolucion[plan], q = M.quoteFor(plan, 1, u, TARIFFS[id], FISCAL), net = ref[plan](TARIFFS[id], u), gross = net * 1.12;
    assert.ok(Math.abs(q.total - gross) <= e.months / 2 + 1.5, `${id} ${plan} ${u}: ${q.total} vs ${gross.toFixed(2)}`);
    assert.equal(q.total, q.net + q.tax);
    assert.ok(Math.abs(q.initial - gross * 0.2) <= e.months / 2 + 1.5, 'inicial ≈ 20 %');
    const cuotas = q.schedule.slice(1); assert.equal(cuotas.length, e.months);
    assert.ok(cuotas.every(c => c === cuotas[0]), 'todas las cuotas iguales');
    assert.equal(q.schedule.reduce((s, x) => s + x, 0), q.total, 'inicial + cuotas = total');
    assert.ok(Math.abs(q.net - net) <= e.months / 2 + 1.5);
  }
});

test('el IVA del total nunca difiere del 12 % del neto en más de Q2', () => {
  for (const id of ids) for (let u = 1; u <= 60; u++) for (const plan of ['INTEGRA', 'FLEX', 'EV8', 'EV16']) {
    const q = M.quoteFor(plan, 3, u, TARIFFS[id], FISCAL); assert.ok(Math.abs(q.tax - q.net * 0.12) <= 2, `${id} ${plan} ${u}`);
  }
});

test('ejemplos calculados a mano: Tale-Bot, 10 equipos (62 estudiantes, uso separado)', () => {
  const t = TARIFFS.tale;
  assert.deepEqual(['net', 'tax', 'total'].map(k => M.quoteFor('INTEGRA', 1, 10, t, FISCAL)[k]), [20000, 2400, 22400]);        // 2000 x 10
  assert.deepEqual(['net', 'tax', 'total'].map(k => M.quoteFor('FLEX', 1, 10, t, FISCAL)[k]), [5750, 690, 6440]);              // 575 x 10 x 1 bimestre
  assert.deepEqual(['net', 'tax', 'total'].map(k => M.quoteFor('FLEX', 4, 10, t, FISCAL)[k]), [21850, 2622, 24472]);           // 575 x 10 x 4 x 0.95
  const e8 = M.quoteFor('EV8', 1, 10, t, FISCAL);                                                                               // 14,700 x 10 / 5 x 1.06 = 31,164 sin IVA
  assert.equal(e8.initial, 6981); assert.equal(e8.schedule[1], 3490); assert.equal(e8.total, 34901); assert.equal(e8.net, 31162);
  const e16 = M.quoteFor('EV16', 1, 10, t, FISCAL);                                                                             // 17,000 x 10 / 5 x 1.10 = 37,400 sin IVA
  assert.equal(e16.total + 0 >= 41887 - 9 && e16.total <= 41888 + 9, true); assert.equal(e16.schedule.length, 17);
});

test('descuento por bimestres: 2 % a 2, 4 % a 3 y 5 % a 4 bimestres', () => {
  const t = TARIFFS.master, base = b => t.rent * 10 * b;
  assert.equal(M.quoteFor('FLEX', 2, 10, t, FISCAL).net, Math.round(base(2) * 0.98));
  assert.equal(M.quoteFor('FLEX', 3, 10, t, FISCAL).net, Math.round(base(3) * 0.96));
  assert.equal(M.quoteFor('FLEX', 4, 10, t, FISCAL).net, Math.round(base(4) * 0.95));
});

// ---- Instituciones de ejemplo: equipos y precio de punta a punta ----
const prog = id => PROGRAMS.find(p => p.id === id);
function colegio(entradas, grupos) {
  const entries = entradas.map((e, i) => Object.assign({ id: 'e' + i, groupIds: grupos.map(g => g.id), sharing: 'separate', simIds: [], units: null, flexBimestres: 2, confirmed: true }, e));
  entries.forEach(e => { e.calc = M.entrySignature(e, grupos); });
  return M.proposalTotals(entries, PROGRAMS, grupos, TARIFFS, FISCAL);
}
const gr = (n, ...tam) => tam.map((s, i) => ({ id: n + i, label: n + i, students: s }));

test('institución A: 62 estudiantes de preprimaria en 4 grupos, horarios separados → 10 Tale-Bot', () => {
  const t = colegio([{ programId: 'tale', plan: 'INTEGRA' }], gr('pre', 18, 12, 12, 20));
  assert.equal(t.rows[0].units, 10); assert.equal(t.net, 20000); assert.equal(t.total, 22400); assert.ok(t.complete);
});

test('institución B: 149 estudiantes de primaria; el grupo más grande define los equipos (separados)', () => {
  const g = gr('p', 25, 24, 25, 25, 25, 25);                       // 149
  const t = colegio([{ programId: 'master', plan: 'FLEX', flexBimestres: 3 }], g);
  assert.equal(t.rows[0].units, 9);                                 // ceil(25/3) = 9
  assert.equal(t.net, Math.round(TARIFFS.master.rent * 9 * 3 * 0.96)); assert.equal(t.total, t.net + t.tax);
});

test('institución C: dos grupos de 13 simultáneos con ratio 2 → 14 equipos (no 13)', () => {
  const g = gr('k', 13, 13), t = colegio([{ programId: 'tale', plan: 'INTEGRA', sharing: 'simultaneous', simIds: ['k0', 'k1'] }], g);
  assert.equal(t.rows[0].units, 14); assert.equal(t.net, 14 * 2000);
});

test('institución D: dos programas con modalidades distintas suman sus importes y el total es la suma exacta', () => {
  const g = gr('x', 30, 28, 30);
  const entries = [
    { programId: 'spike', plan: 'EV16' }, { programId: 'drones', plan: 'FLEX', flexBimestres: 4 }, { programId: 'immersive', plan: 'INTEGRA' }
  ];
  const t = colegio(entries, g);
  assert.ok(t.complete); assert.equal(t.pricedCount, 3);
  assert.equal(t.net, t.rows.reduce((s, r) => s + r.quote.net, 0)); assert.equal(t.tax, t.rows.reduce((s, r) => s + r.quote.tax, 0)); assert.equal(t.total, t.net + t.tax);
  assert.equal(t.rows[0].units, 10); assert.equal(t.rows[1].units, 10); assert.equal(t.rows[2].units, 10); // ceil(30/3)
});

test('un cambio de grupos invalida el precio: nunca se cobra un cálculo viejo', () => {
  const g = gr('a', 20, 20), entries = [{ id: 'e', programId: 'master', plan: 'INTEGRA', groupIds: ['a0', 'a1'], sharing: 'separate', simIds: [], units: null, flexBimestres: 2, confirmed: true }];
  entries[0].calc = M.entrySignature(entries[0], g);
  assert.equal(M.proposalTotals(entries, PROGRAMS, g, TARIFFS, FISCAL).complete, true);
  g[0].students = 40;                                              // el colegio cambia la matrícula
  const t = M.proposalTotals(entries, PROGRAMS, g, TARIFFS, FISCAL);
  assert.equal(t.complete, false); assert.equal(t.rows[0].status, 'stale'); assert.equal(t.total, 0);
});

test('programa sin tarifa o sin modalidad no suma importes', () => {
  const g = gr('a', 20), t = colegio([{ programId: 'master', plan: 'UNDECIDED' }], g);
  assert.equal(t.complete, false); assert.equal(t.total, 0); assert.equal(t.rows[0].status, 'plan');
});

test('si el colegio indica otra cantidad de equipos, el precio usa esa cantidad (no la sugerida)', () => {
  const g = gr('a', 30), e = { id: 'e', programId: 'master', plan: 'INTEGRA', groupIds: ['a0'], sharing: 'separate', simIds: [], units: 7, flexBimestres: 2, confirmed: true };
  e.calc = M.entrySignature(e, g);
  const t = M.proposalTotals([e], PROGRAMS, g, TARIFFS, FISCAL);
  assert.equal(t.rows[0].units, 7); assert.equal(t.net, 7 * TARIFFS.master.buy);
});
