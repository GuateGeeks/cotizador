// The component contract of the primaria student is generated from the code; it must not drift.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const contract = import(pathToFileURL(path.join(__dirname, '../lab/paper/person-contract.js')).href);

test('ALUMNO-PRIMARIA.md coincide con el generador (node tools/people-contract.mjs)', async () => {
  const { alumnoContract } = await contract;
  const file = path.join(__dirname, '../../docs/papercraft/personajes/ALUMNO-PRIMARIA.md');
  assert.equal(fs.readFileSync(file, 'utf8'), alumnoContract());
});

test('alumno base de primaria: medidas, presupuesto y plan = caras emitidas', async () => {
  const { measureBase } = await contract;
  const m = measureBase();
  assert.ok(Math.abs(m.H - .78) <= .78 * .005, `H ${m.H}`);
  assert.ok(Math.abs(m.head / m.H - .28) <= .01, `cabeza/H ${m.head / m.H}`);
  assert.ok(Math.abs(m.shoulders / m.H - .26) <= .01, `hombros/H ${m.shoulders / m.H}`);
  assert.ok(m.minY >= -1e-6, 'nada bajo el suelo');
  for (const c of m.person.components) assert.equal(c.triangles, c.planned, c.id);
});

// Budget kept apart so that an over-budget recipe still runs the checks above. Limit: PERSON_LIMIT.r3Student.
test('alumno base de primaria: presupuesto ≤ 320 con las recetas R3 (geometría ≤ 313)', async () => {
  const { measureBase } = await contract;
  const m = measureBase();
  assert.ok(m.total <= 320 && m.geometry <= 313, `total ${m.total}, geometría ${m.geometry}`);
});
