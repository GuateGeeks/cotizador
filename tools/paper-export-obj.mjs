#!/usr/bin/env node
// Export catalog pieces as OBJ (vertex colours in sRGB, one `g` group per bone, posed
// when the piece defines meta.afterFinish) plus a JSON summary per piece.
//   node tools/paper-export-obj.mjs <out-dir> [--group people]
import fs from 'node:fs';
import path from 'node:path';
import { Matrix4, Vector3, Color } from 'three';
import { createBuilder } from '../asesor/lab/campus-kit.js';
import { paperKit, newMeta } from '../asesor/lab/paper/kit.js';
import { CATALOG } from '../asesor/lab/paper/catalog.js';

const args = process.argv.slice(2), out = args.find(a => !a.startsWith('--'));
const gi = args.indexOf('--group'), group = gi >= 0 ? args[gi + 1] : null;
if (!out) { console.error('Uso: node tools/paper-export-obj.mjs <carpeta> [--group people]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

const toSRGB = c => { const k = new Color(c.r, c.g, c.b); k.convertLinearToSRGB(); return [k.r, k.g, k.b]; };
const summary = [];
for (const piece of CATALOG.filter(p => !group || p.group === group)) {
  const b = createBuilder(); b.base('solid');
  const meta = piece.build(b, paperKit(b), { id: piece.id, ...(piece.opts || {}) }) || newMeta();
  const g = b.finish({});
  if (typeof meta.afterFinish === 'function') meta.afterFinish(g);
  const rig = g.userData.rig, skeleton = g.userData.skeleton;
  rig.root.updateMatrixWorld(true);
  const posed = rig.bones.map((bone, i) => new Matrix4().multiplyMatrices(bone.matrixWorld, skeleton.boneInverses[i]));
  const lines = [`# ${piece.label} (${piece.id}) · GuateGeeks papercraft · triángulos ${g.userData.triangles}`, '# v x y z r g b (color sRGB 0-1); grupos por hueso; unidades de escena (Y arriba, +Z frente)'];
  const byBone = new Map(); let vcount = 0;
  const perBone = {};
  const v = new Vector3(), tri = [];
  g.traverse(mesh => {
    if (!mesh.isMesh || mesh.name === 'blob') return; // contact shadows are not geometry
    const pos = mesh.geometry.getAttribute('position'), col = mesh.geometry.getAttribute('color'), skin = mesh.geometry.getAttribute('skinIndex'), idx = mesh.geometry.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i += 3) {
      const ids = [0, 1, 2].map(k => idx ? idx.getX(i + k) : i + k), bone = skin.getX(ids[0]);
      if (!byBone.has(bone)) byBone.set(bone, []);
      byBone.get(bone).push(ids.map(j => {
        v.fromBufferAttribute(pos, j).applyMatrix4(posed[skin.getX(j)]);
        const c = toSRGB({ r: col.getX(j), g: col.getY(j), b: col.getZ(j) });
        return [v.x, v.y, v.z, ...c];
      }));
    }
  });
  let minY = Infinity, maxY = -Infinity;
  for (const [bone, tris] of [...byBone.entries()].sort((a, c) => a[0] - c[0])) {
    const name = rig.bones[bone].name; perBone[name] = tris.length;
    lines.push(`g ${name.replace(/\s+/g, '_')}`);
    for (const t of tris) {
      for (const p of t) { lines.push(`v ${p.slice(0, 3).map(x => x.toFixed(5)).join(' ')} ${p.slice(3).map(x => x.toFixed(4)).join(' ')}`); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
      lines.push(`f ${vcount + 1} ${vcount + 2} ${vcount + 3}`); vcount += 3;
    }
  }
  fs.writeFileSync(path.join(out, `${piece.id}.obj`), lines.join('\n') + '\n');
  summary.push({ id: piece.id, label: piece.label, triangles: g.userData.triangles, budget: piece.budget, height: +(maxY - minY).toFixed(3), posed: typeof meta.afterFinish === 'function', trianglesPerBone: perBone });
}
fs.writeFileSync(path.join(out, 'models.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ out, models: summary.length }));
