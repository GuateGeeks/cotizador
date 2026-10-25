#!/usr/bin/env node
// Manifest and audit of the papercraft people (construction package R1, fichas §8–§10).
// For every admitted combination (level × hair × skirt × backpack/seated × headset,
// plus teachers) it builds the person and compares, from the faces really emitted:
//   plan vs real triangles per part; parts + contact shadow vs the built geometry;
//   triangles per bone vs the part → bone assignment; one bone per triangle (rigid
//   panels); the 12 bone names and parents; finite, non-degenerate triangles;
//   overlapping parallel layers closer than 0.004 (bind pose and every sampled pose);
//   proportions of the reference profiles; determinism and option independence.
//   node tools/paper-people-manifest.mjs <new-folder>
// Writes manifest.json and MANIFEST.md. Results use PASS / FAIL. Exit 1 on any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Matrix4, Vector3 } from 'three';
import { createBuilder } from '../asesor/lab/campus-kit.js';
import { POSES, applyPose, blendBody } from '../asesor/lab/campus-people.js';
import { SCALE } from '../asesor/lab/paper/kit.js';
import { addPaperPerson, HAIR_COST, GEOMETRY_CAP, RESERVE, SHADOW_TRIANGLES } from '../asesor/lab/paper/pieces-people.js';

const out = process.argv[2];
if (!out) { console.error('Uso: node tools/paper-people-manifest.mjs <carpeta-nueva>'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva.`); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

const MIN_GAP = .004;
const BONES = { hips: 'root', torso: 'hips', head: 'torso', armL: 'torso', armR: 'torso', foreL: 'armL', foreR: 'armR', legL: 'hips', legR: 'hips', shinL: 'legL', shinR: 'legR' };
/** Part → bones it must live on (fichas §9); `null` splits evenly over the listed pair. */
const OWNER = {
  head: ['head'], neck: ['head'], face: ['head'], hair: ['head'], ears: ['head'], goggles: ['head'],
  torso: ['torso'], tie: ['torso'], backpack: ['torso'], straps: ['torso'], hipPiece: ['hips'],
  skirt: ['legL', 'legR'], thighs: ['legL', 'legR'], sleeves: ['armL', 'armR'], upperArms: ['armL', 'armR'],
  forearms: ['foreL', 'foreR'], hands: ['foreL', 'foreR'], notebook: ['foreR'], shins: ['shinL', 'shinR'], shoes: ['shinL', 'shinR']
};
const status = ok => ok ? 'PASS' : 'FAIL';
const sum = o => Object.values(o).reduce((s, v) => s + v, 0);
const sub = (a, c) => [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
const cross = (u, w) => [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
const dot = (u, w) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2];

function overlap2d(a, b, eps = 1e-5) {
  for (const tri of [a, b]) for (let i = 0; i < 3; i++) {
    const p = tri[i], q = tri[(i + 1) % 3], ax = [q[1] - p[1], p[0] - q[0]], len = Math.hypot(...ax) || 1;
    const pa = a.map(v => v[0] * ax[0] + v[1] * ax[1]), pb = b.map(v => v[0] * ax[0] + v[1] * ax[1]);
    if (Math.min(...pa) >= Math.max(...pb) - eps * len || Math.min(...pb) >= Math.max(...pa) - eps * len) return false;
  }
  return true;
}
/** Overlapping parallel opaque triangles of different colour closer than MIN_GAP along their normal. */
function layerGaps(tris, limit = 5) {
  const geo = tris.filter(t => t.layer !== 'blob').map(t => {
    const n = cross(sub(t.v[1], t.v[0]), sub(t.v[2], t.v[0])), l = Math.hypot(...n);
    return { ...t, n: n.map(x => x / l), d: dot(n, t.v[0]) / l, area: l / 2 };
  }).filter(t => t.area > 1e-10);
  const found = [];
  for (let i = 0; i < geo.length; i++) for (let j = i + 1; j < geo.length; j++) {
    const a = geo[i], b = geo[j];
    if (a.color === b.color) continue;
    const c = dot(a.n, b.n);
    if (Math.abs(c) < .9995) continue;
    // Plane distance measured where the triangles are (centroids), not at the origin:
    // nearly parallel planes would otherwise report a distance that depends on the pose.
    const ca = a.v.reduce((s, p) => s.map((x, k) => x + p[k] / 3), [0, 0, 0]), cb = b.v.reduce((s, p) => s.map((x, k) => x + p[k] / 3), [0, 0, 0]);
    const gap = Math.min(Math.abs(dot(a.n, cb) - a.d), Math.abs(dot(b.n, ca) - b.d));
    if (gap >= MIN_GAP) continue;
    // Triangles sharing a vertex meet at an edge or corner: no separation is required there.
    if (a.v.some(p => b.v.some(q => Math.hypot(...sub(p, q)) < 1e-6))) continue;
    const n = a.n, drop = Math.abs(n[0]) > Math.abs(n[1]) ? (Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2) : (Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2);
    const proj = t => t.v.map(p => p.filter((_, k) => k !== drop));
    if (overlap2d(proj(a), proj(b))) { found.push({ gap: +gap.toFixed(5), owners: [a.owner, b.owner], colors: [a.color, b.color] }); if (found.length >= limit) return found; }
  }
  return found;
}

/** Build one person; returns the person, triangles (optionally posed) and the bone list. */
function build(spec, pose) {
  const b = createBuilder(); b.base('solid');
  const person = addPaperPerson(b, { x: 0, y: 0, z: 0, ry: 0, ...spec });
  const g = b.finish({});
  if (pose) pose(person);
  const rig = g.userData.rig, skeleton = g.userData.skeleton;
  rig.root.updateMatrixWorld(true);
  const posed = rig.bones.map((bone, i) => new Matrix4().multiplyMatrices(bone.matrixWorld, skeleton.boneInverses[i]));
  const tris = [], v = new Vector3();
  let mixed = 0, nonFinite = 0;
  g.traverse(mesh => {
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute('position'), col = mesh.geometry.getAttribute('color'), skin = mesh.geometry.getAttribute('skinIndex'), idx = mesh.geometry.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i += 3) {
      const ids = [0, 1, 2].map(k => idx ? idx.getX(i + k) : i + k), bones = ids.map(j => skin.getX(j));
      if (bones[1] !== bones[0] || bones[2] !== bones[0]) mixed++;
      const pts = ids.map(j => { v.fromBufferAttribute(pos, j).applyMatrix4(posed[skin.getX(j)]); return [v.x, v.y, v.z]; });
      if (pts.flat().some(x => !Number.isFinite(x))) nonFinite++;
      tris.push({ v: pts, layer: mesh.name, owner: rig.bones[bones[0]].name, color: [col.getX(ids[0]), col.getY(ids[0]), col.getZ(ids[0])].map(x => Math.round(x * 255)).join(',') });
    }
  });
  const total = g.userData.triangles;
  skeleton?.dispose();
  return { person, tris, total, mixed, nonFinite, bones: rig.bones };
}
const hashTris = tris => crypto.createHash('sha256').update(tris.map(t => t.v.flat().map(x => x.toFixed(5)).join(',') + t.color).join(';')).digest('hex');

const POSE_SET = {
  stand: p => applyPose(p, POSES.stand(), 'stand'),
  'walk-0': p => applyPose(p, POSES.walk(0), 'stand'), 'walk-1': p => applyPose(p, POSES.walk(Math.PI / 2), 'stand'),
  'walk-2': p => applyPose(p, POSES.walk(Math.PI), 'stand'), 'walk-3': p => applyPose(p, POSES.walk(Math.PI * 1.5), 'stand'),
  'walk-mid': p => applyPose(p, POSES.walk(.8), 'stand'),
  sit: p => applyPose(p, POSES.sit(), 'sit', p.shin + .04 * p.scale - .03),
  type: p => applyPose(p, blendBody(POSES.sit(), POSES.type(.3)), 'sit', p.shin + .04 * p.scale - .03),
  point: p => applyPose(p, POSES.point(.2), 'stand'), hand: p => applyPose(p, POSES.hand(), 'stand'),
  'hand-mid': p => applyPose(p, (() => { const q = POSES.hand(); q.armR = q.armR.map(x => x / 2); return q; })(), 'stand'),
  vr: p => applyPose(p, POSES.vr(1.2, 0), 'stand')
};

const report = { date: new Date().toISOString(), node: process.version, minGap: MIN_GAP, reserve: RESERVE, shadow: SHADOW_TRIANGLES, combos: [], poses: [], proportions: [], determinism: {}, summary: {} };
const combos = [];
for (const level of ['pre', 'prim', 'bas', 'bach']) for (const hair of Object.keys(HAIR_COST)) for (const skirt of [false, true]) for (const seated of [false, true]) for (const headset of [false, true])
  combos.push({ id: `m.${level}.${hair}.${skirt ? 'f' : 'p'}.${seated ? 's' : 'b'}${headset ? '.vr' : ''}`, level, seed: `m-${level}`, hair: hair.startsWith('cap') ? (hair === 'cap-pig' ? 'pig' : 'short') : hair, cap: hair.startsWith('cap') ? 'worn' : false, skirt, seated, headset });
for (const hair of ['short', 'long', 'bun']) for (const notebook of [false, true]) for (const seated of [false, true])
  combos.push({ id: `m.teacher.${hair}${notebook ? '.nb' : ''}${seated ? '.s' : ''}`, role: 'teacher', level: 'adult', seed: 'm-teacher', hair, notebook, seated });

for (const spec of combos) {
  const r = build(spec), p = r.person, teacher = !!spec.role;
  const real = p.parts, plan = p.plan, geometry = sum(real), budget = teacher ? 300 : 280, cap = GEOMETRY_CAP[teacher ? 'teacher' : 'student'];
  const perBone = {}; for (const t of r.tris) if (t.layer !== 'blob') { const k = t.owner.split('.').pop(); perBone[k] = (perBone[k] || 0) + 1; }
  const expected = {}; for (const [part, n] of Object.entries(real)) { const own = OWNER[part]; for (const bone of own) expected[bone] = (expected[bone] || 0) + n / own.length; }
  const boneNames = r.bones.map(b => b.name);
  const rigOk = boneNames.length === 13 && Object.entries(BONES).every(([k, parent]) => {
    const bone = r.bones.find(b => b.name === `${spec.id}.${k}`), want = parent === 'root' ? spec.id : `${spec.id}.${parent}`;
    return bone && bone.parent?.name === want;
  });
  const gaps = layerGaps(r.tris);
  const checks = {
    plan: status(Object.keys({ ...plan, ...real }).every(k => plan[k] === real[k])),
    geometry: status(geometry + SHADOW_TRIANGLES === r.total),
    cap: status(geometry <= cap),
    budget: status(r.total <= budget),
    bones: status(Object.keys({ ...expected, ...perBone }).every(k => Math.abs((expected[k] || 0) - (perBone[k] || 0)) < 1e-9)),
    rigid: status(r.mixed === 0), rig: status(rigOk), finite: status(r.nonFinite === 0),
    degenerate: status(r.tris.every(t => Math.hypot(...cross(sub(t.v[1], t.v[0]), sub(t.v[2], t.v[0]))) > 2e-9)),
    layers: status(gaps.length === 0)
  };
  report.combos.push({ id: spec.id, hair: p.profile.style, skirt: p.profile.skirt, backpack: !!p.profile.bag, headset: !!spec.headset, teacher, plan, real, geometry, planned: sum(plan), withReserve: sum(plan) + RESERVE, shadow: SHADOW_TRIANGLES, total: r.total, perBone, checks, gaps });
}

// Poses: the reference student with skirt and the longest hair, the teacher, and a capped preprimaria.
for (const spec of [
  { id: 'q.prim', level: 'prim', seed: 'prim-b', hair: 'short', skirt: false },
  { id: 'q.prim-skirt', level: 'prim', seed: 'prim-b', hair: 'long', skirt: true, seated: true },
  { id: 'q.pre', level: 'pre', seed: 'pre-a', hair: 'pig', cap: 'worn', skirt: true },
  { id: 'q.teacher', role: 'teacher', level: 'adult', seed: 'teacher-a', hair: 'long', notebook: true }
]) for (const [name, pose] of Object.entries(POSE_SET)) {
  const r = build(spec, pose), body = r.tris.filter(t => t.layer !== 'blob');
  const ys = body.flatMap(t => t.v.map(p => p[1])), xs = body.flatMap(t => t.v.map(p => p[0])), zs = body.flatMap(t => t.v.map(p => p[2]));
  const gaps = layerGaps(r.tris);
  const seated = name === 'sit' || name === 'type';
  report.poses.push({ id: spec.id, pose: name, bounds: { min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)].map(x => +x.toFixed(3)), max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)].map(x => +x.toFixed(3)) },
    checks: { layers: status(gaps.length === 0), rigid: status(r.mixed === 0), ground: status(seated || Math.min(...ys) >= -.012) }, gaps });
}

// Proportions of the reference profiles, measured on the built geometry in rest pose.
for (const [level, role] of [['pre'], ['prim'], ['bas'], ['bach'], ['adult', 'teacher']]) {
  const spec = { id: `r.${level}`, level, role, seed: `r-${level}`, hair: 'short', skirt: false, backpack: false };
  const r = build(spec), p = r.person, pr = p.profile, body = r.tris.filter(t => t.layer !== 'blob');
  const ys = body.flatMap(t => t.v.map(q => q[1])), H = Math.max(...ys) - Math.min(...ys);
  const chin = p.hipY + pr.torso + pr.neck, head = Math.max(...ys) - chin;
  const torso = body.filter(t => t.owner.endsWith('.torso') && t.color !== '0,0,0').flatMap(t => t.v.map(q => q[0]));
  const shoulders = Math.max(...torso) - Math.min(...torso);
  const target = { pre: [.32, .275], prim: [.28, .26], bas: [.255, .255], bach: [.245, .255], adult: [.225, .275] }[level];
  report.proportions.push({ level, H: +H.toFixed(4), targetH: SCALE.person[level], headRatio: +(head / H).toFixed(4), targetHead: target[0], shouldersRatio: +(shoulders / H).toFixed(4), targetShoulders: target[1],
    checks: { height: status(Math.abs(H - SCALE.person[level]) <= SCALE.person[level] * .005), head: status(Math.abs(head / H - target[0]) <= .01), shoulders: status(Math.abs(shoulders / H - target[1]) <= .01) } });
}

// Determinism and independence of options (fichas §10).
{
  const base = { id: 'd', level: 'prim', seed: 'prim-b', hair: 'short', skirt: false };
  const a = build(base), b = build(base), c = build({ ...base, backpack: '#FF0000' }), d = build({ ...base, skirt: true });
  const headOf = r => r.tris.filter(t => t.owner === 'd.head');
  report.determinism = {
    sameSeed: status(hashTris(a.tris) === hashTris(b.tris)),
    backpackKeepsHead: status(hashTris(headOf(a)) === hashTris(headOf(c))),
    skirtKeepsHead: status(hashTris(headOf(a)) === hashTris(headOf(d)))
  };
}

const fails = [
  ...report.combos.flatMap(c => Object.entries(c.checks).filter(([, s]) => s === 'FAIL').map(([k]) => `${c.id}:${k}`)),
  ...report.poses.flatMap(c => Object.entries(c.checks).filter(([, s]) => s === 'FAIL').map(([k]) => `${c.id}/${c.pose}:${k}`)),
  ...report.proportions.flatMap(c => Object.entries(c.checks).filter(([, s]) => s === 'FAIL').map(([k]) => `${c.level}:${k}`)),
  ...Object.entries(report.determinism).filter(([, s]) => s === 'FAIL').map(([k]) => `determinism:${k}`)
];
const students = report.combos.filter(c => !c.teacher), teachers = report.combos.filter(c => c.teacher);
report.summary = { combos: report.combos.length, poses: report.poses.length, maxStudent: Math.max(...students.map(c => c.total)), maxTeacher: Math.max(...teachers.map(c => c.total)),
  maxStudentGeometry: Math.max(...students.map(c => c.geometry)), fails: fails.length, status: status(!fails.length), failures: fails.slice(0, 40) };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(report, null, 2));

// Human-readable manifest: per-part plan vs real for representative combinations, and all totals.
const pick = id => report.combos.find(c => c.id === id);
const reps = ['m.prim.short.p.b', 'm.prim.short.f.b', 'm.prim.long.f.b', 'm.prim.pig.f.b', 'm.pre.cap-pig.f.b', 'm.bach.short.p.b.vr', 'm.teacher.long.nb'].map(pick).filter(Boolean);
const partsAll = [...new Set(reps.flatMap(c => Object.keys(c.plan)))];
const lines = ['# Manifiesto de personajes papercraft', '', `Generado ${report.date} con \`tools/paper-people-manifest.mjs\` a partir de las caras emitidas. Estado: **${report.summary.status}** (${report.combos.length} combinaciones, ${report.poses.length} poses).`, '',
  'Cada celda es plan / real. «Geometría» excluye la sombra de contacto (7 triángulos, capa `blob`); «Total» es lo que cuenta el presupuesto del proyecto.', '',
  '| Pieza | ' + reps.map(c => c.id.replace(/^m\./, '')).join(' | ') + ' |', '|---|' + reps.map(() => '---:').join('|') + '|'];
for (const part of partsAll) lines.push(`| ${part} | ` + reps.map(c => c.plan[part] == null && c.real[part] == null ? '—' : `${c.plan[part] ?? 0} / ${c.real[part] ?? 0}`).join(' | ') + ' |');
lines.push('| **Geometría** | ' + reps.map(c => `**${c.planned} / ${c.geometry}**`).join(' | ') + ' |');
lines.push('| Con reserva (8) | ' + reps.map(c => c.withReserve).join(' | ') + ' |');
lines.push('| Total con sombra (7) | ' + reps.map(c => c.total).join(' | ') + ' |', '');
lines.push(`Máximo estudiante: ${report.summary.maxStudent} triángulos (geometría ${report.summary.maxStudentGeometry} ≤ ${GEOMETRY_CAP.student}); máximo docente: ${report.summary.maxTeacher}.`, '');
lines.push('## Proporciones medidas (pie de suela a cima del cabello, de pie)', '', '| Nivel | H | H objetivo | cabeza/H | objetivo | hombros/H | objetivo |', '|---|---:|---:|---:|---:|---:|---:|');
for (const p of report.proportions) lines.push(`| ${p.level} | ${p.H} | ${p.targetH} | ${p.headRatio} | ${p.targetHead} | ${p.shouldersRatio} | ${p.targetShoulders} |`);
lines.push('', '## Todas las combinaciones', '', '| Combinación | Pelo | Geometría | Total | Estado |', '|---|---|---:|---:|---|');
for (const c of report.combos) lines.push(`| ${c.id} | ${c.hair} | ${c.geometry} | ${c.total} | ${Object.values(c.checks).every(s => s === 'PASS') ? 'PASS' : 'FAIL'} |`);
fs.writeFileSync(path.join(out, 'MANIFEST.md'), lines.join('\n') + '\n');
console.log(JSON.stringify({ out, ...report.summary, determinism: report.determinism }));
process.exit(fails.length ? 1 : 0);
