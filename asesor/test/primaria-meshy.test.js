// Meshy models (docs/papercraft/reference/meshy) → runtime data modules → emitted students.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const load = rel => import(pathToFileURL(path.join(__dirname, rel)).href);
const root = path.join(__dirname, '../..');

test('Meshy: cada módulo generado coincide con su GLB cuando está presente (node tools/meshy-import.mjs)', async t => {
  const { MESHY_MODELS } = await load('../lab/paper/meshy/person-meshy.js');
  const crypto = require('node:crypto');
  for (const [model, m] of Object.entries(MESHY_MODELS)) {
    const glb = path.join(root, m.SOURCE.file);
    if (!fs.existsSync(glb)) { t.diagnostic(`${model}: el GLB es local (.gitignore)`); continue; }
    if (m.SOURCE.edited) { // retouched in Blender: the module is the source; its provenance must be complete
      assert.match(m.SOURCE.edited.sha256, /^[0-9a-f]{64}$/, `${model}: SHA256 del .blend`);
      assert.ok(m.SOURCE.edited.blend && m.SOURCE.edited.date && m.SOURCE.edited.tool, `${model}: procedencia de la edición`);
      continue;
    }
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(glb)).digest('hex'), m.SOURCE.sha256, `${model}: el GLB cambió, regenera el módulo`);
    const { importMeshy, meshyDataModule, MODELS } = await load('../../tools/meshy-import.mjs');
    assert.equal(fs.readFileSync(path.join(root, MODELS[model].out), 'utf8'), meshyDataModule(await importMeshy(model)), model);
  }
});

test('Meshy: niño y niña, dos variantes dentro del límite, cada pieza en un hueso del rig y clases conocidas', async () => {
  const { MESHY_MODELS } = await load('../lab/paper/meshy/person-meshy.js');
  const { PERSON_LIMIT, SHADOW_TRIANGLES } = await load('../lab/paper/pieces-people.js');
  assert.deepEqual(Object.keys(MESHY_MODELS).sort(), ['nina', 'nino']);
  for (const [model, m] of Object.entries(MESHY_MODELS)) {
    assert.match(m.SOURCE.sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(Object.keys(m.VARIANTS).sort(), ['bag', 'plain']);
    for (const [name, v] of Object.entries(m.VARIANTS)) {
      const total = v.parts.reduce((s, p) => s + p.faces.length, 0);
      assert.ok(total + SHADOW_TRIANGLES <= (model === 'nina' ? PERSON_LIMIT.nina : PERSON_LIMIT.r3Student), `${model}.${name}: ${total} + sombra`);
      // a separate backpack piece only stands up; a model whose backpack is part of its single mesh keeps it seated
      if (m.VARIANTS.bag.parts.some(p => p.id === 'bag')) assert.equal(v.parts.some(p => p.id === 'bag'), name === 'bag', `${model}.${name}: mochila`);
      for (const p of v.parts) {
        assert.ok(m.RIG_H[p.bone], `${model}.${name}.${p.id}: hueso ${p.bone}`);
        assert.equal(p.classes.length, p.faces.length);
        for (const c of p.classes) assert.ok(c >= 0 && c < m.CLASSES.length);
        for (const f of p.faces) for (const i of f) assert.ok(p.vertices[i]?.every(Number.isFinite), `${model}.${name}.${p.id}: vértice ${i}`);
      }
      for (const id of ['eyeL', 'eyeR', 'smile']) assert.ok(v.parts.some(p => p.id === id && p.bone === 'head'), `${model}.${name}: ${id}`);
    }
  }
});

test('Meshy emitido: todo alumno de primaria usa un modelo Meshy; las piezas siguen a su hueso', async () => {
  const { createBuilder } = await load('../lab/campus-kit.js');
  const { addPaperPerson } = await load('../lab/paper/pieces-people.js');
  const { MESHY_MODELS } = await load('../lab/paper/meshy/person-meshy.js');
  for (const [model, skirt] of [['nino', false], ['nina', true]]) for (const [seated, variant] of [[false, 'bag'], [true, 'plain']]) {
    const b = createBuilder(); b.base('solid');
    const p = addPaperPerson(b, { id: 't', level: 'prim', seed: 'prim-b', skirt, seated });
    b.finish({});
    assert.equal(p.profile.meshy, model);
    for (const part of MESHY_MODELS[model].VARIANTS[variant].parts) {
      assert.equal(p.parts['M-' + part.id], part.faces.length, `${model}.${variant}.${part.id}`);
      assert.deepEqual(Object.keys(p.perBone['M-' + part.id]), [part.bone]);
    }
  }
  const b = createBuilder(); b.base('solid');
  // Any hair or skirt request still gives a Meshy student; the seed picks boy or girl when unspecified.
  const kinds = new Set(Array.from({ length: 24 }, (_, i) => addPaperPerson(b, { id: `s${i}`, level: 'prim', seed: `s${i}`, hair: 'long' }).profile.meshy));
  assert.deepEqual([...kinds].sort(), ['nina', 'nino']);
  const vr = addPaperPerson(b, { id: 'v', level: 'prim', seed: 'prim-b', skirt: false, headset: true });
  assert.ok(!vr.parts['M-eyeL'] && !vr.parts['M-smile'] && vr.parts.goggles === 10, 'el visor oculta ojos y sonrisa');
  const r2 = addPaperPerson(b, { id: 'r', level: 'prim', seed: 'prim-b', hair: 'short', skirt: false, model: 'r2' });
  assert.ok(!r2.profile.meshy && r2.profile.r2Body, 'model: r2 conserva el cuerpo del paquete');
});
