#!/usr/bin/env node
// Mesh checks for the papercraft library and the composed growth states, in Node
// (no WebGL): triangle budgets, degenerate/NaN triangles, declared vs real size,
// geometry below the ground, coplanar overlapping faces of different colour
// (z-fighting), bone naming, assembly stages and determinism.
//   node tools/paper-mesh-check.mjs <new-folder>
// Results use PASS / FAIL / BLOCKED / NOT_RUN. Exit code 1 when any check fails.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createBuilder } from '../asesor/lab/campus-kit.js';
import { CAMPUS_LIMITS } from '../asesor/lab/campus-layout.js';
import { paperKit, newMeta } from '../asesor/lab/paper/kit.js';
import { CATALOG } from '../asesor/lab/paper/catalog.js';
import { planCampus } from '../asesor/lab/paper/plan.js';
import { composeCampus } from '../asesor/lab/paper/compose.js';
import { stateInput } from '../asesor/lab/paper/plan-fixtures.js';
import { addPaperPerson, resolvePersonProfile, personLimit } from '../asesor/lab/paper/pieces-people.js';

const CAMPUS_TRIANGLES = 40000;
const out = process.argv[2];
if (!out) { console.error('Uso: node tools/paper-mesh-check.mjs <carpeta-nueva>'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva.`); process.exit(2); }

/** Build a piece and return its triangles per opaque/transparent layer. */
function build(piece, opts = {}) {
  const b = createBuilder();
  b.base('solid');
  const p = paperKit(b);
  let meta, error = null;
  try { meta = piece.build(b, p, { id: piece.id, ...(piece.opts || {}), ...opts }) || newMeta(); }
  catch (e) { error = String(e && e.stack || e); meta = newMeta(); }
  const group = b.finish({});
  const tris = [];
  group.traverse(mesh => {
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute('position').array, col = mesh.geometry.getAttribute('color'), index = mesh.geometry.index;
    const skin = mesh.geometry.getAttribute('skinIndex'), bones = group.userData.rig.bones;
    const n = index ? index.count : pos.length / 3, size = col.itemSize;
    for (let i = 0; i < n; i += 3) {
      const v = [0, 1, 2].map(k => { const j = index ? index.getX(i + k) : i + k; return [pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]]; });
      const j0 = index ? index.getX(i) : i;
      const c = [col.array[j0 * size], col.array[j0 * size + 1], col.array[j0 * size + 2]].map(x => Math.round(x * 255)).join(',');
      tris.push({ v, layer: mesh.name, color: c, owner: bones[skin.getX(j0)]?.name });
    }
  });
  group.userData.skeleton?.dispose();
  return { meta, error, tris, bones: group.userData.rig.bones.map(bone => bone.name), triangles: group.userData.triangles };
}

const sub = (a, c) => [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
const cross = (u, w) => [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
const dot = (u, w) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
function geometryOf(t) {
  const n = cross(sub(t.v[1], t.v[0]), sub(t.v[2], t.v[0])), len = Math.hypot(...n);
  return { area: len / 2, n: len ? n.map(x => x / len) : [0, 0, 0], d: len ? dot(n, t.v[0]) / len : 0 };
}

/** 2D triangle overlap with positive area (separating axis test, shrunk by eps). */
function overlap2d(a, b, eps = 1e-5) {
  const axes = [];
  for (const tri of [a, b]) for (let i = 0; i < 3; i++) { const p = tri[i], q = tri[(i + 1) % 3]; axes.push([q[1] - p[1], p[0] - q[0]]); }
  for (const ax of axes) {
    const pa = a.map(p => p[0] * ax[0] + p[1] * ax[1]), pb = b.map(p => p[0] * ax[0] + p[1] * ax[1]);
    const len = Math.hypot(...ax) || 1;
    if (Math.min(...pa) >= Math.max(...pb) - eps * len || Math.min(...pb) >= Math.max(...pa) - eps * len) return false;
  }
  return true;
}
/** Coplanar, same-facing, overlapping opaque triangles of different colour: visible flicker. */
function zFighting(tris, limit = 25) {
  const buckets = new Map(), found = [];
  const opaque = tris.filter(t => t.layer === 'solid' || t.layer === 'soft').map(t => ({ ...t, g: geometryOf(t) })).filter(t => t.g.area > 1e-9);
  // Bucket by plane offset only (normals compared exactly below), so near-parallel planes
  // on both sides of a rounding boundary are still compared.
  const key = (n, d) => String(Math.round(d / 2e-4));
  for (const t of opaque) { const k = key(t.g.n, t.g.d); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(t); }
  for (const t of opaque) {
    const dk = Math.round(t.g.d / 2e-4);
    for (const dd of [-1, 0, 1]) for (const u of buckets.get(String(dk + dd)) || []) {
      if (u === t || u.color === t.color || dot(u.g.n, t.g.n) < .9995 || Math.abs(u.g.d - t.g.d) > 1e-4) continue;
      // Project both onto the plane's two dominant axes.
      const n = t.g.n, drop = Math.abs(n[0]) > Math.abs(n[1]) ? (Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2) : (Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2);
      const proj = tri => tri.v.map(p => p.filter((_, i) => i !== drop));
      if (overlap2d(proj(t), proj(u))) {
        found.push({ a: t.v.map(p => p.map(x => +x.toFixed(3))), b: u.v.map(p => p.map(x => +x.toFixed(3))), colors: [t.color, u.color], owners: [t.owner, u.owner] });
        if (found.length >= limit) return found;
      }
    }
  }
  return found;
}

const status = ok => ok ? 'PASS' : 'FAIL';
const report = { date: new Date().toISOString(), node: process.version, pieces: [], states: [], summary: {} };

for (const piece of CATALOG) {
  const r = build(piece);
  const checks = {};
  checks.build = status(!r.error);
  checks.budget = piece.budget == null ? 'NOT_RUN' : status(r.triangles <= piece.budget);
  const geo = r.tris.map(geometryOf);
  const nan = r.tris.some(t => t.v.flat().some(x => !Number.isFinite(x)));
  const degenerate = geo.filter(g => g.area < 1e-9).length;
  checks.finite = status(!nan);
  checks.degenerate = status(degenerate === 0);
  // Size and ground use the paper itself: contact shadows (blob) and glow are not geometry.
  const body = r.tris.filter(t => t.layer !== 'blob' && t.layer !== 'glow');
  const xs = body.flatMap(t => t.v.map(p => p[0])), ys = body.flatMap(t => t.v.map(p => p[1])), zs = body.flatMap(t => t.v.map(p => p[2]));
  const size = xs.length ? [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs)] : [0, 0, 0];
  const minY = ys.length ? Math.min(...ys) : 0;
  const d = piece.size;
  const fits = !d || (size[0] <= d.w * 1.1 + .06 && size[2] <= d.d * 1.1 + .06 && size[1] <= d.h * 1.15 + .08);
  checks.size = d ? status(fits) : 'NOT_RUN';
  checks.ground = status(piece.id === 'pedestal' || minY >= -.012);
  const zf = zFighting(r.tris);
  checks.coplanar = status(zf.length === 0);
  checks.bones = status(r.bones.every(name => name === 'root' || name === piece.id || name.startsWith(piece.id + '.')));
  const staged = r.meta.staged || [];
  checks.stages = status(staged.every(s => r.bones.includes(s.name)));
  report.pieces.push({ id: piece.id, group: piece.group, triangles: r.triangles, budget: piece.budget ?? null,
    size: size.map(v => +v.toFixed(3)), declared: d || null, minY: +minY.toFixed(3), degenerate, folds: staged.filter(s => s.style === 'fold').length,
    checks, zFighting: zf.slice(0, 5), error: r.error && r.error.split('\n')[0] });
}

// Person variants: every level, role, seed (skin, hair, skirt, cap) and posture flag.
report.people = [];
for (const level of ['pre', 'prim', 'bas', 'bach']) for (const role of ['student', 'teacher']) for (let k = 0; k < 24; k++) for (const seated of [false, true]) {
  if (role === 'teacher' && (level !== 'bach' || seated)) continue;
  const id = `v.${level}.${role}.${k}.${seated ? 's' : 'w'}`;
  const spec = { id, level, role: role === 'teacher' ? 'teacher' : undefined, seed: id, seated, headset: k === 5 };
  const r = build({ id, build: (b) => { addPaperPerson(b, spec); return newMeta(); } });
  const zf = zFighting(r.tris, 3);
  report.people.push({ id, triangles: r.triangles, checks: { build: status(!r.error), budget: status(r.triangles <= personLimit(resolvePersonProfile(spec))), coplanar: status(zf.length === 0) }, zFighting: zf });
}

for (let n = 1; n <= 6; n++) {
  const plan = planCampus(stateInput(n));
  const first = build(composeCampus(plan)), second = build(composeCampus(planCampus(stateInput(n))));
  const hash = r => crypto.createHash('sha256').update(r.tris.map(t => t.v.flat().map(x => x.toFixed(4)).join(',') + t.color).join(';')).digest('hex');
  const zf = zFighting(first.tris, 40);
  const checks = {
    build: status(!first.error),
    missing: status(!(first.meta.missing || []).length),
    budget: status(first.triangles <= CAMPUS_TRIANGLES),
    people: status(plan.people.length <= CAMPUS_LIMITS.people),
    coplanar: status(zf.length === 0),
    deterministic: status(hash(first) === hash(second))
  };
  const near = pt => plan.modules.map(m => ({ key: m.key, d: Math.hypot(m.x - pt[0], m.z - pt[2]) })).sort((x, y) => x.d - y.d).slice(0, 2).map(m => m.key);
  zf.forEach(z => { z.near = near(z.a[0]); });
  report.states.push({ n, modules: plan.modules.length, triangles: first.triangles, people: plan.people.length, missing: first.meta.missing || [],
    width: plan.bounds.width, depth: plan.bounds.depth, checks, zFighting: zf.slice(0, 8), error: first.error && first.error.split('\n')[0] });
}

const all = [...report.pieces, ...report.people, ...report.states];
for (const item of all) for (const [name, value] of Object.entries(item.checks)) {
  report.summary[name] ||= { PASS: 0, FAIL: 0, NOT_RUN: 0 };
  report.summary[name][value] = (report.summary[name][value] || 0) + 1;
}
const failures = all.flatMap(item => Object.entries(item.checks).filter(([, v]) => v === 'FAIL').map(([k]) => `${item.id ?? 'estado ' + item.n}: ${k}`));
report.status = failures.length ? 'FAIL' : 'PASS';
report.failures = failures;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ out, status: report.status, pieces: report.pieces.length, states: report.states.length, summary: report.summary, failures: failures.slice(0, 40) }, null, 1));
process.exit(failures.length ? 1 : 0);
