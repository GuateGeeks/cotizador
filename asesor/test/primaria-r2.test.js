// Package R2 (docs/papercraft/construction-r2) → runtime data module → emitted student.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const load = rel => import(pathToFileURL(path.join(__dirname, rel)).href);

test('el módulo de datos R2 coincide con los JSON del paquete (node tools/r2-import.mjs)', async () => {
  const { r2DataModule } = await load('../lab/paper/r2/import.js');
  const file = path.join(__dirname, '../lab/paper/r2/primaria-r2-data.js');
  assert.equal(fs.readFileSync(file, 'utf8'), r2DataModule(path.join(__dirname, '../../docs/papercraft/construction-r2')));
});

test('R2: 20 recetas, 33 instancias, 280 triángulos (más el cambio declarado de las recetas R3); montaje coherente con sus sockets', async () => {
  const { R2_RECIPES, R2_INSTANCES, R2_FACTS, R2_PROVENANCE, instancePoint } = await load('../lab/paper/r2/person-r2.js');
  assert.equal(Object.keys(R2_RECIPES).length, 20);
  assert.equal(R2_INSTANCES.length, 33);
  // Counts come from the active recipe source: an R3 override replaces its R2 recipe, and the R2
  // package itself still sums 280 (272 emitted after the redistribution).
  for (const [id, o] of Object.entries(R2_PROVENANCE.r3)) assert.equal(R2_RECIPES[id].faces.length, o.triangles, `${id} R3`);
  assert.equal(R2_FACTS.r2PackageTriangles, 280);
  assert.equal(R2_FACTS.packageTriangles, 280 + R2_FACTS.r3Delta);
  assert.equal(R2_FACTS.emittedTriangles, 272 + R2_FACTS.r3Delta);
  const byId = Object.fromEntries(R2_INSTANCES.map(i => [i.id, i]));
  for (const i of R2_INSTANCES) {
    if (!i.parent || !i.target) continue;
    const a = instancePoint(i, R2_RECIPES[i.recipe].sockets[i.source].at), parent = byId[i.parent];
    const c = instancePoint(parent, R2_RECIPES[parent.recipe].sockets[i.target].at);
    assert.ok(Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]) < 1e-6, `${i.id} → ${i.parent}.${i.target}`);
  }
});

test('R2 emitido: cada instancia en su hueso, caras exteriores y conteo por instancia', async () => {
  const { createBuilder } = await load('../lab/campus-kit.js');
  const { addPaperPerson, PRIMARIA_R2 } = await load('../lab/paper/pieces-people.js');
  const { R2_INSTANCES, recipeFaces } = await load('../lab/paper/r2/person-r2.js');
  const b = createBuilder(); b.base('solid');
  const p = addPaperPerson(b, { ...PRIMARIA_R2, id: 't' });
  const g = b.finish({});
  for (const i of R2_INSTANCES) {
    const c = p.components.find(x => x.id === i.id);
    assert.equal(c.triangles, recipeFaces(i.recipe).length, i.id);
    assert.deepEqual(Object.keys(c.perBone), [i.bone], i.id);
  }
  // Closed pieces: every face normal points away from its piece centre (mirror winding fixed once).
  const solid = g.children.find(m => m.isMesh && m.name === 'solid'), pos = solid.geometry.getAttribute('position'), idx = solid.geometry.index;
  const tri = k => [0, 1, 2].map(j => { const v = idx.getX(k * 3 + j); return [pos.getX(v), pos.getY(v), pos.getZ(v)]; });
  for (const c of p.components) {
    const i = R2_INSTANCES.find(x => x.id === c.id);
    if (!i || !['P01', 'P02', 'P12', 'P13', 'P14', 'P16', 'P18', 'P19'].includes(i.recipe)) continue;
    const [s, e] = c.ranges[0], T = []; for (let k = s; k < e; k++) T.push(tri(k));
    const ctr = T.flat().reduce((a, v) => a.map((x, j) => x + v[j] / (T.length * 3)), [0, 0, 0]);
    for (const [a, b_, c_] of T) {
      const u = b_.map((x, j) => x - a[j]), w = c_.map((x, j) => x - a[j]);
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const m = [a, b_, c_].reduce((acc, v) => acc.map((x, j) => x + v[j] / 3), [0, 0, 0]);
      assert.ok(n[0] * (m[0] - ctr[0]) + n[1] * (m[1] - ctr[1]) + n[2] * (m[2] - ctr[2]) > 0, `${c.id}: cara hacia dentro`);
    }
  }
  g.userData.skeleton?.dispose();
});
