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
import { addPaperPerson, HAIR_COST, GEOMETRY_CAP, PERSON_LIMIT, personLimit, RESERVE, SHADOW_TRIANGLES, COMPONENTS, PRIMARIA_BASE } from '../asesor/lab/paper/pieces-people.js';
import { R2_INSTANCES, R2_RECIPES, R2_REDISTRIBUTION, R2_FACTS, R2_PROVENANCE, instancePoint } from '../asesor/lab/paper/r2/person-r2.js';

const out = process.argv[2];
if (!out) { console.error('Uso: node tools/paper-people-manifest.mjs <carpeta-nueva>'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva.`); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

const MIN_GAP = .004;
const BONES = { hips: 'root', torso: 'hips', head: 'torso', armL: 'torso', armR: 'torso', foreL: 'armL', foreR: 'armR', legL: 'hips', legR: 'hips', shinL: 'legL', shinR: 'legR' };
/** Component → bones it may live on (fichas §9), from the component registry. */
const OWNER = Object.fromEntries([...COMPONENTS.map(c => [c.id, c.bones]), ...R2_INSTANCES.map(i => [i.id, [i.bone]])]);
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
/**
 * Hidden joint overlaps of the R2 assembly (MONTAJE §7, CONTRATO-VISUAL §6): the calf top
 * sits inside the thigh at the knee and the forearm end inside the hand at the wrist. They
 * are volume overlaps, not designated layers; they are reported apart (`joints`) with their
 * gaps instead of failing the 0.004 layer rule.
 */
const JOINT_PAIRS = [['P16', 'P17'], ['P13', 'P14']];
const recipeOf = part => (part || '').split('-')[0];
const isJoint = (a, c) => JOINT_PAIRS.some(([x, y]) => (recipeOf(a) === x && recipeOf(c) === y) || (recipeOf(a) === y && recipeOf(c) === x)) && a.split('-')[1] === c.split('-')[1];
let joints = [];
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
    if (gap >= MIN_GAP - 1e-6) continue; // the package places its appliqués at exactly 0.004
    // Triangles sharing a vertex meet at an edge or corner: no separation is required there.
    if (a.v.some(p => b.v.some(q => Math.hypot(...sub(p, q)) < 1e-6))) continue;
    const n = a.n, drop = Math.abs(n[0]) > Math.abs(n[1]) ? (Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2) : (Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2);
    const proj = t => t.v.map(p => p.filter((_, k) => k !== drop));
    if (overlap2d(proj(a), proj(b))) {
      const item = { gap: +gap.toFixed(5), owners: [a.owner, b.owner], parts: [a.part, b.part], colors: [a.color, b.color] };
      if (isJoint(a.part, b.part)) { joints.push(item); continue; }
      found.push(item); if (found.length >= limit) return found;
    }
  }
  return found;
}

/** Build one person; returns the person, triangles (optionally posed) and the bone list. */
function build(spec, pose) {
  const b = createBuilder(); b.base('solid');
  const person = addPaperPerson(b, { x: 0, y: 0, z: 0, ry: 0, ...spec, trace: true });
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
      tris.push({ v: pts, layer: mesh.name, owner: rig.bones[bones[0]].name, part: mesh.name === 'blob' ? 'shadow' : person.trace[i / 3], color: [col.getX(ids[0]), col.getY(ids[0]), col.getZ(ids[0])].map(x => Math.round(x * 255)).join(',') });
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
  const real = p.parts, plan = p.plan, geometry = sum(real), budget = personLimit(p.profile), cap = p.profile.r2Head ? budget - SHADOW_TRIANGLES : GEOMETRY_CAP[teacher ? 'teacher' : 'student'];
  // Triangles per bone in the built geometry vs the emitter's per-component, per-bone tally.
  const perBone = {}; for (const t of r.tris) if (t.layer !== 'blob') { const k = t.owner.split('.').pop(); perBone[k] = (perBone[k] || 0) + 1; }
  const expected = {}; for (const bones of Object.values(p.perBone)) for (const [bone, n] of Object.entries(bones)) expected[bone] = (expected[bone] || 0) + n;
  const owners = Object.entries(p.perBone).every(([part, bones]) => Object.keys(bones).every(bone => OWNER[part]?.includes(bone)));
  const boneNames = r.bones.map(b => b.name);
  const rigOk = boneNames.length === 13 && Object.entries(BONES).every(([k, parent]) => {
    const bone = r.bones.find(b => b.name === `${spec.id}.${k}`), want = parent === 'root' ? spec.id : `${spec.id}.${parent}`;
    return bone && bone.parent?.name === want;
  });
  joints = []; const gaps = layerGaps(r.tris), jointGaps = joints;
  const jointSummary = Object.values(jointGaps.reduce((m, j) => { const k = j.parts.join('/'); m[k] = m[k] && m[k].gap <= j.gap ? m[k] : { parts: j.parts, gap: j.gap }; return m; }, {}));
  const checks = {
    plan: status(Object.keys({ ...plan, ...real }).every(k => (plan[k] || 0) === (real[k] || 0))),
    owners: status(owners),
    geometry: status(geometry + SHADOW_TRIANGLES === r.total),
    cap: status(geometry <= cap),
    budget: status(r.total <= budget),
    bones: status(Object.keys({ ...expected, ...perBone }).every(k => Math.abs((expected[k] || 0) - (perBone[k] || 0)) < 1e-9)),
    rigid: status(r.mixed === 0), rig: status(rigOk), finite: status(r.nonFinite === 0),
    degenerate: status(r.tris.every(t => Math.hypot(...cross(sub(t.v[1], t.v[0]), sub(t.v[2], t.v[0]))) > 2e-9)),
    layers: status(gaps.length === 0)
  };
  report.combos.push({ id: spec.id, recipe: p.profile.v2 ? 'v2' : 'v1', rich: Object.keys(plan.rich || {}), hair: p.profile.style, skirt: p.profile.skirt, backpack: !!p.profile.bag, headset: !!spec.headset, teacher, plan, real, geometry, planned: sum(plan), withReserve: sum(plan) + RESERVE, shadow: SHADOW_TRIANGLES, total: r.total, perBone, checks, gaps, joints: jointSummary });
}

// Poses: the reference student with skirt and the longest hair, the teacher, and a capped preprimaria.
for (const spec of [
  { ...PRIMARIA_BASE, id: 'q.base' }, { ...PRIMARIA_BASE, id: 'q.base-seated', seated: true },
  { id: 'q.prim', level: 'prim', seed: 'prim-b', hair: 'short', skirt: false },
  { id: 'q.prim-skirt', level: 'prim', seed: 'prim-b', hair: 'long', skirt: true, seated: true },
  { id: 'q.pre', level: 'pre', seed: 'pre-a', hair: 'pig', cap: 'worn', skirt: true },
  { id: 'q.teacher', role: 'teacher', level: 'adult', seed: 'teacher-a', hair: 'long', notebook: true }
]) for (const [name, pose] of Object.entries(POSE_SET)) {
  const r = build(spec, pose), body = r.tris.filter(t => t.layer !== 'blob');
  const ys = body.flatMap(t => t.v.map(p => p[1])), xs = body.flatMap(t => t.v.map(p => p[0])), zs = body.flatMap(t => t.v.map(p => p[2]));
  joints = []; const gaps = layerGaps(r.tris), jointGaps = joints;
  const jointSummary = Object.values(jointGaps.reduce((m, j) => { const k = j.parts.join('/'); m[k] = m[k] && m[k].gap <= j.gap ? m[k] : { parts: j.parts, gap: j.gap }; return m; }, {}));
  const seated = name === 'sit' || name === 'type';
  report.poses.push({ id: spec.id, pose: name, bounds: { min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)].map(x => +x.toFixed(3)), max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)].map(x => +x.toFixed(3)) },
    checks: { layers: status(gaps.length === 0), rigid: status(r.mixed === 0), ground: status(seated || Math.min(...ys) >= -.012) }, gaps, joints: jointSummary });
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

// Primaria base student: landmarks vs bones, measured contract, components.
{
  const r = build({ ...PRIMARIA_BASE, id: 'b' }), p = r.person, L = p.landmarks, body = r.tris.filter(t => t.layer !== 'blob');
  const world = name => { const bone = r.bones.find(x => x.name === `b.${name}`); const v = new Vector3(); bone.getWorldPosition(v); return v; };
  const near = (a, c) => Math.abs(a - c) < 1e-6;
  const ys = body.flatMap(t => t.v.map(q => q[1]));
  const torsoX = body.filter(t => t.owner === 'b.torso').flatMap(t => t.v.map(q => q[0]));
  const measured = { H: Math.max(...ys) - Math.min(...ys), head: Math.max(...ys) - L.chin, shoulders: Math.max(...torsoX) - Math.min(...torsoX) };
  report.base = {
    spec: PRIMARIA_BASE, landmarks: L, measured: Object.fromEntries(Object.entries(measured).map(([k, x]) => [k, +x.toFixed(4)])),
    ratios: { head: +(measured.head / measured.H).toFixed(4), shoulders: +(measured.shoulders / measured.H).toFixed(4) },
    components: p.components, geometry: sum(p.parts), total: r.total,
    checks: {
      landmarks: status(near(world('hips').y, L.hip) && near(world('head').y, L.neckBase) && near(world('armL').y, L.shoulder) && near(world('armL').x, L.shoulderX)
        && near(world('foreL').y, L.elbow) && near(world('legL').x, L.legX) && near(world('shinL').y, L.knee)),
      height: status(Math.abs(measured.H - .78) <= .78 * .005), head: status(Math.abs(measured.head / measured.H - .28) <= .01),
      shoulders: status(Math.abs(measured.shoulders / measured.H - .26) <= .01),
      budget: status(r.total <= PERSON_LIMIT.r3Student)
    }
  };
}

// Package R2: per-instance counts vs the package, redistribution, mount sockets.
{
  const r = build({ ...PRIMARIA_BASE, id: 'b' }), p = r.person;
  const byId = Object.fromEntries(R2_INSTANCES.map(i => [i.id, i]));
  const socketRoot = (inst, name) => { const s_ = R2_RECIPES[inst.recipe].sockets[name]; return s_ ? instancePoint(inst, s_.at) : null; };
  const instances = R2_INSTANCES.map(i => {
    const pkg = R2_RECIPES[i.recipe].faces.length, removed = R2_REDISTRIBUTION[i.recipe]?.faces.length || 0;
    const parent = i.parent ? byId[i.parent] : null, a = socketRoot(i, i.source), c = parent && i.target ? socketRoot(parent, i.target) : null;
    const mountError = a && c ? Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]) : null;
    return { id: i.id, recipe: i.recipe, bone: i.bone, package: pkg, removed, planned: p.plan[i.id], emitted: p.parts[i.id] || 0, ranges: p.ranges[i.id],
      perBone: p.perBone[i.id], mirror: i.mirror, mount: i.parent ? { parent: i.parent, source: i.source, target: i.target, errorH: mountError == null ? null : +mountError.toExponential(2) } : null };
  });
  const auxiliaries = r.total - sum(p.parts);
  report.r2 = { provenance: R2_PROVENANCE, facts: R2_FACTS, redistribution: R2_REDISTRIBUTION, instances, geometry: sum(p.parts), auxiliaries: { contactShadow: auxiliaries }, total: r.total,
    checks: {
      instances: status(instances.length === 33 && instances.every(x => x.emitted === x.package - x.removed && x.emitted === x.planned)),
      // Active recipe source: the R2 package (280) plus the declared change of the R3 recreations.
      packageTotal: status(instances.reduce((s_, x) => s_ + x.package, 0) === 280 + R2_FACTS.r3Delta),
      emittedTotal: status(sum(p.parts) === 280 + R2_FACTS.r3Delta - instances.reduce((s_, x) => s_ + x.removed, 0)),
      auxiliariesSeparated: status(auxiliaries === SHADOW_TRIANGLES),
      bones: status(instances.every(x => Object.keys(x.perBone).length === 1 && Object.keys(x.perBone)[0] === x.bone)),
      contiguousRanges: status(instances.every(x => x.ranges.length === 1)),
      mounts: status(instances.every(x => !x.mount || x.mount.errorH == null || x.mount.errorH < 1e-6)),
      budget: status(r.total <= PERSON_LIMIT.r3Student)
    } };
}

// Determinism and independence of options (fichas §10).
{
  const base = { id: 'd', level: 'prim', seed: 'prim-b', hair: 'short', skirt: false };
  const a = build(base), b = build(base), c = build({ ...base, backpack: '#FF0000' }), d = build({ ...base, skirt: true });
  // Head geometry relative to the head bone (clothing may move the neck pivot, never the head's shape).
  const headOf = r => { const bone = r.bones.find(x => x.name === 'd.head'), o = new Vector3(); bone.getWorldPosition(o);
    return r.tris.filter(t => t.owner === 'd.head').map(t => ({ ...t, v: t.v.map(q => [q[0] - o.x, q[1] - o.y, q[2] - o.z]) })); };
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
  ...Object.entries(report.determinism).filter(([, s]) => s === 'FAIL').map(([k]) => `determinism:${k}`),
  ...Object.entries(report.base.checks).filter(([, s]) => s === 'FAIL').map(([k]) => `base:${k}`),
  ...Object.entries(report.r2.checks).filter(([, s]) => s === 'FAIL').map(([k]) => `r2:${k}`)
];
const students = report.combos.filter(c => !c.teacher), teachers = report.combos.filter(c => c.teacher);
report.summary = { combos: report.combos.length, poses: report.poses.length, maxStudent: Math.max(...students.map(c => c.total)), maxTeacher: Math.max(...teachers.map(c => c.total)),
  maxStudentGeometry: Math.max(...students.map(c => c.geometry)), fails: fails.length, status: status(!fails.length), failures: fails.slice(0, 40) };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(report, null, 2));

// Human-readable manifest: per-part plan vs real for representative combinations, and all totals.
const pick = id => report.combos.find(c => c.id === id);
const reps = ['m.prim.short.p.b', 'm.prim.short.p.s', 'm.prim.short.f.b', 'm.prim.long.f.b', 'm.prim.pig.f.b', 'm.pre.cap-pig.f.b', 'm.bach.short.p.b.vr', 'm.teacher.long.nb'].map(pick).filter(Boolean);
const partsAll = [...new Set(reps.flatMap(c => Object.keys(c.plan)))];
const lines = ['# Manifiesto de personajes papercraft', '', `Generado ${report.date} con \`tools/paper-people-manifest.mjs\` a partir de las caras emitidas. Estado: **${report.summary.status}** (${report.combos.length} combinaciones, ${report.poses.length} poses).`, '',
  'Cada celda es plan / real. «Geometría» excluye la sombra de contacto (7 triángulos, capa `blob`); «Total» es lo que cuenta el presupuesto del proyecto.', '',
  '| Pieza | ' + reps.map(c => c.id.replace(/^m\./, '')).join(' | ') + ' |', '|---|' + reps.map(() => '---:').join('|') + '|'];
for (const part of partsAll) lines.push(`| ${part} | ` + reps.map(c => c.plan[part] == null && c.real[part] == null ? '—' : `${c.plan[part] ?? 0} / ${c.real[part] ?? 0}`).join(' | ') + ' |');
lines.push('| **Geometría** | ' + reps.map(c => `**${c.planned} / ${c.geometry}**`).join(' | ') + ' |');
lines.push('| Con reserva (8) | ' + reps.map(c => c.withReserve).join(' | ') + ' |');
lines.push('| Total con sombra (7) | ' + reps.map(c => c.total).join(' | ') + ' |', '');
lines.push(`Máximo estudiante: ${report.summary.maxStudent} triángulos (geometría ${report.summary.maxStudentGeometry} ≤ ${GEOMETRY_CAP.student}); máximo docente: ${report.summary.maxTeacher}.`, '');
lines.push('## Alumno R2 (paquete GuateGeeks_Primaria_Piezas_R2): instancias', '', `Paquete: ${R2_FACTS.recipes} recetas, ${R2_FACTS.instances} instancias, ${R2_FACTS.packageTriangles} triángulos. Emitidos: ${report.r2.geometry} de geometría + ${report.r2.auxiliaries.contactShadow} de sombra de contacto = ${report.r2.total}.`, '',
  '| Instancia | Receta | Hueso | Paquete | Quitados | Emitidos | Rango | Montaje (error H) |', '|---|---|---|---:|---:|---:|---|---|');
for (const x of report.r2.instances) lines.push(`| ${x.id} | ${x.recipe} | ${x.bone} | ${x.package} | ${x.removed} | ${x.emitted} | ${x.ranges.map(r => r.join('–')).join(', ')} | ${x.mount ? `${x.mount.parent} ${x.mount.target || ''} ${x.mount.errorH ?? '—'}` : '—'} |`);
lines.push('');
lines.push('## Proporciones medidas (pie de suela a cima del cabello, de pie)', '', '| Nivel | H | H objetivo | cabeza/H | objetivo | hombros/H | objetivo |', '|---|---:|---:|---:|---:|---:|---:|');
for (const p of report.proportions) lines.push(`| ${p.level} | ${p.H} | ${p.targetH} | ${p.headRatio} | ${p.targetHead} | ${p.shouldersRatio} | ${p.targetShoulders} |`);
lines.push('', '## Todas las combinaciones', '', '| Combinación | Pelo | Geometría | Total | Estado |', '|---|---|---:|---:|---|');
for (const c of report.combos) lines.push(`| ${c.id} | ${c.hair} | ${c.geometry} | ${c.total} | ${Object.values(c.checks).every(s => s === 'PASS') ? 'PASS' : 'FAIL'} |`);
fs.writeFileSync(path.join(out, 'MANIFEST.md'), lines.join('\n') + '\n');
console.log(JSON.stringify({ out, ...report.summary, determinism: report.determinism }));
process.exit(fails.length ? 1 : 0);
