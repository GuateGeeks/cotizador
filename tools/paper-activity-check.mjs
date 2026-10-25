#!/usr/bin/env node
// Activity composition checks in Node (no WebGL), on the six composed growth states, posed as the
// scene shows them at rest (afterFinish poses, then tickActors at the end of a run):
//  - support: every laptop, device, mat, tray and kit box rests on its surface (table top, track,
//    floor, pad) and inside its bounds; floor props stay inside the room walls;
//  - laptops: open, on the top and facing their user;
//  - collisions: triangle-triangle crossings of props against tables, chairs, walls, people and
//    other props, and of people against furniture, walls and other people (touching is allowed);
//  - visibility: software z-buffer with the app's orthographic cameras (overview: yaw -0.55,
//    pitch 0.6, framed like the scene; focused room: the scene's focus framing with the x-ray
//    of the focused room), projected and visible pixels of every program device, and occlusion.
//   node tools/paper-activity-check.mjs <new-folder> [--framings artifacts/campus/<run>/framings.json] [--states 1,6]
// Results use PASS / FAIL / BLOCKED / NOT_RUN. Exit code 1 when any check fails.
import fs from 'node:fs';
import path from 'node:path';
import { Vector3 } from 'three';
import { createBuilder } from '../asesor/lab/campus-kit.js';
import { paperKit } from '../asesor/lab/paper/kit.js';
import { planCampus } from '../asesor/lab/paper/plan.js';
import { composeCampus } from '../asesor/lab/paper/compose.js';
import { stateInput } from '../asesor/lab/paper/plan-fixtures.js';
import { tickActors, walkerWorld, RUN } from '../asesor/lab/paper/scene-activity.js';

const args = process.argv.slice(2);
const out = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const option = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
if (!out) { console.error('Uso: node tools/paper-activity-check.mjs <carpeta-nueva> [--framings framings.json] [--states 1,6]'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva.`); process.exit(2); }
const STATES = (option('states') || '1,2,3,4,5,6').split(',').map(Number);
// --masks 6: write the z-buffer masks of those states (to compare the cameras with an app capture).
const MASKS = new Set((option('masks') || '').split(',').filter(Boolean).map(Number));
// Targets: visible pixels of every program device at the overview and in the focused room view.
const TARGET = { overview: 250, focus: 2500 };
// The app at 1440 x 1000: the campus canvas and its HUD insets (measured by tools/campus-rooms.cjs).
let CANVAS = { w: 1020, h: 924, insets: { top: 117, right: 0, bottom: 112, left: 0 } };
const framingsFile = option('framings');
if (framingsFile) {
  const shot = JSON.parse(fs.readFileSync(framingsFile, 'utf8')).shots.find(s => s.view === 'overview');
  if (shot) CANVAS = { w: shot.diagnostics.framing.size.w, h: shot.diagnostics.framing.size.h, insets: shot.diagnostics.framing.insets };
}
const YAW = -.55, PITCH = .6;
const status = ok => ok ? 'PASS' : 'FAIL';

// ---------------------------------------------------------------- posed geometry
function buildState(n) {
  const plan = planCampus(stateInput(n));
  const b = createBuilder();
  b.base('solid');
  const meta = composeCampus(plan).build(b, paperKit(b));
  const group = b.finish({});
  meta.afterFinish(group);
  const rig = group.userData.rig;
  rig.root.updateMatrixWorld(true);
  rig.bones.forEach(bone => { bone.userData.rest = { position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone() }; });
  const world = walkerWorld(plan);
  return { plan, meta, group, rig, world };
}
/** Skinned (posed) triangles with their bone, layer and colour. */
function posedTriangles(group) {
  const tris = [], v = new Vector3(), bones = group.userData.rig.bones;
  group.updateMatrixWorld(true);
  group.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const pos = mesh.geometry.getAttribute('position'), skin = mesh.geometry.getAttribute('skinIndex'), index = mesh.geometry.index;
    const inv = mesh.skeleton.boneInverses, n = index ? index.count : pos.count;
    const cache = new Map();
    const at = j => {
      let p = cache.get(j);
      if (!p) { const bi = skin.getX(j); v.fromBufferAttribute(pos, j).applyMatrix4(inv[bi]).applyMatrix4(bones[bi].matrixWorld); p = [v.x, v.y, v.z]; cache.set(j, p); }
      return p;
    };
    for (let i = 0; i < n; i += 3) {
      const j0 = index ? index.getX(i) : i, j1 = index ? index.getX(i + 1) : i + 1, j2 = index ? index.getX(i + 2) : i + 2;
      tris.push({ v: [at(j0), at(j1), at(j2)], bone: bones[skin.getX(j0)], layer: mesh.name });
    }
  });
  return tris;
}

// ---------------------------------------------------------------- item classification
/** Map every bone to the item it belongs to (furniture, prop, device, person, architecture). */
function classify(meta, rig, plan) {
  const items = new Map(); // bone name -> item
  const moduleKeys = new Set(plan.modules.map(m => m.key));
  const moduleOf = new Map(plan.modules.map(m => [m.key, m]));
  const persons = new Set(rig.bones.filter(bone => rig.get(bone.name + '.hips')).map(bone => bone.name));
  const devices = new Set();
  for (const room of meta.actors.rooms) {
    room.devices.forEach(d => devices.add(d.bone.name));
    if (room.holo) devices.add(room.key + '.holo');
  }
  meta.actors.drones.forEach(d => devices.add(d.bone.name));
  const kindOf = name => {
    if (persons.has(name)) return 'person';
    if (devices.has(name)) return 'device';
    if (/\.t\d+$/.test(name)) return 'table';
    if (/\.t\d+\.c[nsew]\d*$/.test(name)) return 'chair';
    if (/\.(t\d+\.lap\d*|svclap)$/.test(name)) return 'laptop';
    if (/\.t\d+\.mat$/.test(name) || /\.track$/.test(name)) return 'mat';
    if (/\.(shelf|box|svcbox|svctray|t\d+\.tray|bench|flag|pads|drone\.ctl\d*)$/.test(name)) return 'prop';
    return null;
  };
  for (const bone of rig.bones) {
    let o = bone, item = null, module = null;
    while (o) {
      const k = !item && kindOf(o.name);
      if (k) item = { name: o.name, kind: k };
      if (moduleKeys.has(o.name)) { module = o.name; break; }
      o = o.parent;
    }
    if (!module) { items.set(bone.name, item ? { ...item, module: null } : { name: 'root', kind: 'ground', module: null }); continue; }
    if (!item) item = { name: module, kind: 'architecture' };
    items.set(bone.name, { ...item, module, moduleType: moduleOf.get(module).type });
  }
  return items;
}

// ---------------------------------------------------------------- geometry helpers
const sub = (a, c) => [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
const cross = (u, w) => [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
const dot = (u, w) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
const boxOf = list => {
  const B = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const t of list) for (const p of t.v) for (let k = 0; k < 3; k++) { if (p[k] < B[k]) B[k] = p[k]; if (p[k] > B[k + 3]) B[k + 3] = p[k]; }
  return B;
};
const overlapBox = (A, B, eps = 0) => A[0] < B[3] - eps && B[0] < A[3] - eps && A[1] < B[4] - eps && B[1] < A[4] - eps && A[2] < B[5] - eps && B[2] < A[5] - eps;
/** Segment p→q strictly crosses triangle t (touching edges, endpoints and coplanar contact are allowed). */
function segmentCrosses(p, q, t, eps = 1e-4) {
  const e1 = sub(t[1], t[0]), e2 = sub(t[2], t[0]), d = sub(q, p);
  const h = cross(d, e2), a = dot(e1, h);
  if (Math.abs(a) < 1e-12) return false;
  const f = 1 / a, s = sub(p, t[0]), u = f * dot(s, h);
  if (u <= eps || u >= 1 - eps) return false;
  const qv = cross(s, e1), w = f * dot(d, qv);
  if (w <= eps || u + w >= 1 - eps) return false;
  const k = f * dot(e2, qv), len = Math.hypot(...d) || 1, margin = eps * 5 / len;
  return k > margin && k < 1 - margin;
}
const trianglesCross = (a, c) => [0, 1, 2].some(i => segmentCrosses(a[i], a[(i + 1) % 3], c)) || [0, 1, 2].some(i => segmentCrosses(c[i], c[(i + 1) % 3], a));
function crossings(A, B, limit = 3) {
  const found = [];
  const bb = B.map(t => ({ t, box: boxOf([t]) }));
  for (const ta of A) {
    const box = boxOf([ta]);
    for (const { t: tb, box: bx } of bb) {
      if (!overlapBox(box, bx)) continue;
      if (trianglesCross(ta.v, tb.v)) { found.push(ta.v[0].map(x => +x.toFixed(3))); if (found.length >= limit) return found; break; }
    }
  }
  return found;
}

// ---------------------------------------------------------------- per-room checks
function roomChecks(state, items, tris) {
  const { meta, rig, plan } = state;
  const results = [];
  // Item → triangles (paper only: contact shadows and glow are not geometry).
  const byItem = new Map();
  for (const t of tris) {
    if (t.layer === 'blob' || t.layer === 'glow') continue;
    const it = items.get(t.bone.name);
    if (!it || it.kind === 'ground') continue;
    const key = it.name;
    if (!byItem.has(key)) byItem.set(key, { ...it, tris: [] });
    byItem.get(key).tris.push(t);
  }
  for (const entry of byItem.values()) entry.box = boxOf(entry.tris);
  const roomActors = new Map(meta.actors.rooms.map(r => [r.key, r]));
  const hosts = [...new Set([...byItem.values()].map(it => it.module))].filter(k => roomActors.has(k) || meta.actors.drones.some(d => d.host.key === k));
  for (const key of hosts) {
    const room = roomActors.get(key), drone = meta.actors.drones.find(d => d.host.key === key);
    const module = plan.modules.find(m => m.key === key);
    const local = [...byItem.values()].filter(it => it.module === key);
    // Walkers stand in the yard without a parent module: include people standing on the drone pad.
    if (drone) for (const it of byItem.values()) if (it.kind === 'person' && it.module == null && Math.abs((it.box[0] + it.box[3]) / 2 - module.x) < 1.9 && Math.abs((it.box[2] + it.box[5]) / 2 - module.z) < 1.5) local.push(it);
    const toWorld = (x, y, z) => [module.x + x, (module.y || 0) + y, module.z + z];
    const floorY = room ? (module.y || 0) + room.floor : .06;
    const fail = [];
    const tops = room ? (room.tops || room.tables.map(t => ({ x: t[0], z: t[2], y: t[1] + .36, x0: t[0] - .45, x1: t[0] + .45, z0: t[2] - .275, z1: t[2] + .275 }))).map(t => ({ ...t, wx0: module.x + t.x0, wx1: module.x + t.x1, wz0: module.z + t.z0, wz1: module.z + t.z1, wy: (module.y || 0) + t.y })) : [];
    const inside = (box, r, m = .002) => box[0] >= r.x0 - m && box[3] <= r.x1 + m && box[2] >= r.z0 - m && box[5] <= r.z1 + m;
    // Support: props on table tops, the track, the pad or the floor.
    const supports = [];
    for (const it of local) {
      if (!['laptop', 'device', 'mat', 'prop'].includes(it.kind) || /\.(flag|pads)$/.test(it.name)) continue;
      const box = it.box;
      const onTop = tops.find(t => box[0] >= t.wx0 - .002 && box[3] <= t.wx1 + .002 && box[2] >= t.wz0 - .002 && box[5] <= t.wz1 + .002 && Math.abs(box[1] - t.wy) < .03);
      let surface = onTop ? 'table' : null, ok = !!onTop;
      if (!ok && room?.track) {
        const tr = room.track, r = { x0: module.x + tr.x0, x1: module.x + tr.x1, z0: module.z + tr.z0, z1: module.z + tr.z1 };
        if (inside(box, r) && Math.abs(box[1] - ((module.y || 0) + tr.y)) < .012) { ok = true; surface = 'track'; }
      }
      if (!ok && /\.drone\.ctl\d*$/.test(it.name)) { ok = true; surface = 'hands'; }
      if (!ok && drone && it.kind === 'device') {
        // Hovering over the pad, or landed on it (the activity ends with the drone on the pad).
        const pad = drone.pad || { x0: -1.27, x1: 1.27, z0: -1.12, z1: 1.12, y: .06 }, r = { x0: module.x + pad.x0, x1: module.x + pad.x1, z0: module.z + pad.z0, z1: module.z + pad.z1 };
        if (inside(box, r) && box[1] > pad.y + .1) { ok = true; surface = 'air'; }
        else if (inside(box, r) && box[1] >= pad.y - .004 && box[1] < pad.y + .04) { ok = true; surface = 'pad'; }
      }
      if (!ok && room) {
        // Floor props: on the floor and inside the walls.
        const r = { x0: module.x - 1.3, x1: module.x + 1.3, z0: module.z - 1.12, z1: module.z + 1.15 };
        if (inside(box, r, .01) && Math.abs(box[1] - floorY) < .012 && !['laptop', 'mat'].includes(it.kind) && !/\.t\d+\.dev$/.test(it.name)) { ok = true; surface = 'floor'; }
        if (it.kind === 'mat' && /\.track$/.test(it.name) && inside(box, r, .01) && Math.abs(box[1] - floorY) < .006) { ok = true; surface = 'floor'; }
      }
      supports.push({ item: it.name, kind: it.kind, surface, status: status(ok), min: box.slice(0, 3).map(x => +x.toFixed(3)), max: box.slice(3).map(x => +x.toFixed(3)) });
      if (!ok) fail.push(`apoyo ${it.name}`);
    }
    // Laptops: facing a seated user (the screen faces +z of its bone).
    const laptops = [];
    for (const it of local.filter(x => x.kind === 'laptop')) {
      const bone = rig.get(it.name), q = new Vector3(0, 0, 1).applyQuaternion(bone.getWorldQuaternion(new (bone.quaternion.constructor)()));
      const at = bone.getWorldPosition(new Vector3());
      const users = local.filter(x => x.kind === 'person').map(x => { const r = rig.get(x.name).getWorldPosition(new Vector3()); return { name: x.name, d: Math.hypot(r.x - at.x, r.z - at.z), dir: [r.x - at.x, r.z - at.z] }; }).sort((x, y) => x.d - y.d);
      const user = users[0], facingUser = !!user && user.d < .6 && (q.x * user.dir[0] + q.z * user.dir[1]) / user.d > .8;
      // Open: the screen rises above the base (height of the posed item).
      const open = it.box[4] - it.box[1] > .1;
      laptops.push({ item: it.name, user: user?.name || null, facing: status(facingUser), open: status(open) });
      if (!facingUser) fail.push(`laptop sin usuario de frente ${it.name}`);
      if (!open) fail.push(`laptop cerrada ${it.name}`);
    }
    // Collisions: props against everything else; people against furniture, walls and each other.
    const collisions = [];
    const seatOwner = new Map();
    if (room) {
      const seatChair = new Map();
      for (const it of local.filter(x => x.kind === 'chair')) {
        const c = rig.get(it.name).getWorldPosition(new Vector3());
        const sitter = local.filter(x => x.kind === 'person').map(x => { const r = rig.get(x.name).getWorldPosition(new Vector3()); return { name: x.name, d: Math.hypot(r.x - c.x, r.z - c.z) }; }).sort((x, y) => x.d - y.d)[0];
        if (sitter && sitter.d < .05) { seatChair.set(it.name, sitter.name); seatOwner.set(sitter.name, it.name); }
      }
    }
    const arch = it => it.kind === 'architecture';
    const wallTris = local.filter(arch).flatMap(it => it.tris.filter(t => {
      // Floor decals (tile joints) are not walls: everything resting on the floor would "cross" them.
      const ys = t.v.map(p => p[1]);
      return !(Math.max(...ys) - Math.min(...ys) < 1e-4 && Math.max(...ys) < floorY + .02);
    }));
    const archItem = { name: key + ' (muros)', kind: 'architecture', tris: wallTris, box: boxOf(wallTris) };
    const props = local.filter(it => ['laptop', 'device', 'mat', 'prop'].includes(it.kind));
    const solid = local.filter(it => ['table', 'chair', 'person', 'laptop', 'device', 'mat', 'prop'].includes(it.kind));
    const allowed = (a, c) => {
      const pair = [a.kind, c.kind].sort().join('/');
      if (a === c) return true;
      // Support contacts: things on a table, a device on its mat, a controller in its pilot's hands.
      if (pair === 'laptop/table' || pair === 'device/table' || pair === 'mat/table' || pair === 'device/mat') return true;
      if ((a.kind === 'prop' && c.kind === 'table') || (c.kind === 'prop' && a.kind === 'table')) return true;
      const ctl = [a, c].find(x => /\.drone\.ctl\d*$/.test(x.name)), other = ctl && (ctl === a ? c : a);
      if (ctl && other.kind === 'person' && rig.get(ctl.name).parent?.name === other.name) return true;
      // A seated person and their own chair.
      if (pair === 'chair/person') { const person = a.kind === 'person' ? a : c, chair = a.kind === 'chair' ? a : c; return seatOwner.get(person.name) === chair.name; }
      return false;
    };
    const pairs = [];
    for (const pr of props) for (const other of [...solid, archItem]) if (other !== pr && !allowed(pr, other)) pairs.push([pr, other]);
    const peopleList = solid.filter(it => it.kind === 'person');
    for (const pe of peopleList) for (const other of [...solid.filter(it => ['table', 'chair', 'person'].includes(it.kind)), archItem]) {
      if (other === pe || allowed(pe, other) || (other.kind === 'person' && other.name < pe.name)) continue;
      pairs.push([pe, other]);
    }
    const seen = new Set();
    for (const [x, y] of pairs) {
      const id = [x.name, y.name].sort().join('|');
      if (seen.has(id) || !x.box || !y.box || !overlapBox(x.box, y.box, .0005)) { seen.add(id); continue; }
      seen.add(id);
      const hits = crossings(x.tris, y.tris);
      if (hits.length) { collisions.push({ a: x.name, b: y.name, kinds: [x.kind, y.kind], at: hits[0] }); fail.push(`cruce ${x.name} × ${y.name}`); }
    }
    const peopleCount = local.filter(it => it.kind === 'person').length;
    results.push({ room: key, kind: room ? `${room.kind}/${room.layout}` : 'drones', people: peopleCount, chairs: local.filter(it => it.kind === 'chair').length,
      occupiedChairs: seatOwner.size, supports, laptops, collisions, status: fail.length ? 'FAIL' : 'PASS', failures: fail });
  }
  return results;
}

// ---------------------------------------------------------------- visibility (software z-buffer)
function cameraFor(view, plan) {
  const free = { w: CANVAS.w - CANVAS.insets.left - CANVAS.insets.right, h: CANVAS.h - CANVAS.insets.top - CANVAS.insets.bottom };
  const right = [Math.cos(YAW), 0, -Math.sin(YAW)], dir = [Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH)];
  const up = cross(dir, right), ul = Math.hypot(...up), upn = up.map(x => x / ul);
  const b = plan.bounds, center = { x: (b.x0 + b.x1) / 2, y: b.height * .3, z: (b.z0 + b.z1) / 2 };
  let sx = 0, sy = 0;
  for (const x of [b.x0, b.x1]) for (const h of [-.55, b.height]) for (const z of [b.z0, b.z1]) {
    const v = [x - center.x, h - center.y, z - center.z];
    sx = Math.max(sx, Math.abs(dot(v, right))); sy = Math.max(sy, Math.abs(dot(v, upn)));
  }
  const frame = { ...center, half: Math.max(sy, sx / (free.w / free.h)) * 1.05 };
  let target = frame;
  if (view.module) {
    const m = view.module, patio = m.type === 'patio';
    target = { x: m.x, y: m.y + (patio ? .45 : .85), z: m.z + (patio ? 0 : .3), half: Math.min(frame.half, patio ? 2.8 : 2.6) };
  }
  const ppu = (free.h / 2) / target.half;
  const cx = (CANVAS.insets.left - CANVAS.insets.right) / 2, cy = (CANVAS.insets.bottom - CANVAS.insets.top) / 2;
  return { right, up: upn, dir, target, ppu, ox: CANVAS.w / 2 + cx, oy: CANVAS.h / 2 - cy };
}
function render(tris, cam, idOf) {
  const W = CANVAS.w, H = CANVAS.h, depth = new Float32Array(W * H).fill(-Infinity), ids = new Int32Array(W * H).fill(-1);
  const proj = p => { const d = [p[0] - cam.target.x, p[1] - cam.target.y, p[2] - cam.target.z]; return [cam.ox + dot(d, cam.right) * cam.ppu, cam.oy - dot(d, cam.up) * cam.ppu, dot(d, cam.dir)]; };
  for (const t of tris) {
    const id = idOf(t);
    if (id === null) continue;
    const [a, c, e] = t.v.map(proj);
    // Front faces only (the paper material is single sided): counter-clockwise with y up.
    const area = (c[0] - a[0]) * (a[1] - e[1]) - (e[0] - a[0]) * (a[1] - c[1]);
    if (area <= 0) continue;
    const x0 = Math.max(0, Math.floor(Math.min(a[0], c[0], e[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], c[0], e[0])));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], c[1], e[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], c[1], e[1])));
    if (x0 > x1 || y0 > y1) continue;
    const det = (c[0] - a[0]) * (e[1] - a[1]) - (e[0] - a[0]) * (c[1] - a[1]);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + .5, py = y + .5;
      const w1 = ((px - a[0]) * (e[1] - a[1]) - (e[0] - a[0]) * (py - a[1])) / det, w2 = ((c[0] - a[0]) * (py - a[1]) - (px - a[0]) * (c[1] - a[1])) / det, w0 = 1 - w1 - w2;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * a[2] + w1 * c[2] + w2 * e[2], k = y * W + x;
      if (z > depth[k]) { depth[k] = z; ids[k] = id; }
    }
  }
  return ids;
}
function visibility(state, items, tris) {
  const { plan, meta } = state;
  const devices = [];
  for (const room of meta.actors.rooms) {
    room.devices.forEach(d => devices.push({ name: d.bone.name, room: room.key, programId: room.programId, kind: 'device', secondary: d.set > 0 }));
    if (room.holo) devices.push({ name: room.key + '.holo', room: room.key, programId: room.programId, kind: 'hologram' });
  }
  meta.actors.drones.forEach(d => devices.push({ name: d.bone.name, room: d.host.key, programId: 'drones', kind: 'drone' }));
  const index = new Map(devices.map((d, i) => [d.name, i]));
  const deviceOf = t => { const it = items.get(t.bone.name); return it && index.has(it.name) ? index.get(it.name) : -1; };
  const paper = tris.filter(t => t.layer === 'solid' || t.layer === 'soft');
  const count = ids => { const c = new Array(devices.length).fill(0); for (let k = 0; k < ids.length; k++) if (ids[k] >= 0) c[ids[k]]++; return c; };
  const views = [{ name: 'overview', module: null }];
  for (const d of devices) if (!views.some(v => v.module?.key === d.room)) views.push({ name: 'focus', module: plan.modules.find(m => m.key === d.room) });
  const rows = devices.map(d => ({ ...d, overview: null, focus: null }));
  for (const view of views) {
    const cam = cameraFor(view, plan);
    let occluders = paper;
    if (view.module) {
      // X-ray of the focused room: its slab, the wall toward the camera, rails, the floors above and
      // whole buildings between the camera and the room are see-through or hidden in the scene.
      const m = view.module;
      occluders = paper.filter(t => {
        const it = items.get(t.bone.name);
        if (!it || it.kind === 'ground' || it.module == null) return !it || it.kind === 'ground' ? true : it.kind === 'person' && m.type === 'patio';
        if (it.module === m.key) return !/\.(slab|left|rail)(\.|$)/.test(t.bone.name);
        const other = plan.modules.find(x => x.key === it.module);
        return ['pedestal', 'path', 'patio'].includes(other.type) || (m.type === 'patio' && other.type === 'bench');
      });
    }
    const triIndex = new Map(occluders.map((t, i) => [t, i]));
    const front = render(occluders, cam, t => triIndex.get(t));
    const ids = front.map(k => k < 0 ? -1 : deviceOf(occluders[k]));
    if (MASKS.has(state.n)) {
      // Grey mask (PGM) to overlay on an app capture: devices white, other geometry grey.
      const img = Buffer.alloc(ids.length);
      for (let k = 0; k < ids.length; k++) img[k] = ids[k] >= 0 ? 255 : front[k] >= 0 ? 110 : 0;
      const name = `mascara-estado-${state.n}-${view.module ? view.module.key.replace(/:/g, '_') : 'general'}.pgm`;
      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, name), Buffer.concat([Buffer.from(`P5 ${CANVAS.w} ${CANVAS.h} 255\n`), img]));
    }
    const visible = count(ids);
    const relevant = devices.map((d, i) => i).filter(i => !view.module || devices[i].room === view.module.key);
    for (const i of relevant) {
      const own = render(paper.filter(t => deviceOf(t) === i), cam, deviceOf), alone = count(own)[i];
      // Who hides the device: the items in front of its hidden pixels (largest first).
      const hidden = new Map();
      for (let k = 0; k < own.length; k++) if (own[k] === i && ids[k] !== i && front[k] >= 0) {
        const it = items.get(occluders[front[k]].bone.name), name = it ? (it.kind === 'architecture' ? it.name + ' (arq)' : it.name) : '?';
        hidden.set(name, (hidden.get(name) || 0) + 1);
      }
      const entry = { projected: alone, visible: visible[i], occlusion: alone ? +(1 - visible[i] / alone).toFixed(3) : null,
        hiddenBy: [...hidden.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([name, px]) => `${name} ${px}`) };
      // Second sets (set >= 1) share a side table at the back: reported, gated only in the focused view.
      entry.status = devices[i].secondary && view.name === 'overview' ? 'NOT_RUN' : status(visible[i] >= TARGET[view.name]);
      rows[i][view.name] = entry;
    }
  }
  return rows;
}

// ---------------------------------------------------------------- run
const report = { date: new Date().toISOString(), node: process.version, canvas: CANVAS, camera: { yaw: YAW, pitch: PITCH }, targets: TARGET, framings: framingsFile, states: [] };
for (const n of STATES) {
  const state = buildState(n);
  const items = classify(state.meta, state.rig, state.plan);
  const composed = roomChecks(state, items, posedTriangles(state.group));
  // The app shows the end of an activity run: pose everything at rest, as the scene does.
  tickActors(state.meta.actors, 1, RUN, state.world);
  state.rig.root.updateMatrixWorld(true);
  const restTris = posedTriangles(state.group);
  const rest = roomChecks(state, items, restTris);
  state.n = n;
  const vis = visibility(state, items, restTris);
  const peopleRooms = Object.fromEntries(composed.map(r => [r.room, r.people]));
  state.group.userData.skeleton?.dispose?.();
  report.states.push({ n, triangles: state.group.userData.triangles, people: state.plan.people.length, peopleRooms, composed, rest, visibility: vis,
    checks: { composed: status(composed.every(r => r.status === 'PASS')), rest: status(rest.every(r => r.status === 'PASS')),
      overview: status(vis.every(v => v.overview?.status !== 'FAIL')), focus: status(vis.every(v => v.focus?.status === 'PASS')) } });
}
const failures = report.states.flatMap(s => Object.entries(s.checks).filter(([, v]) => v === 'FAIL').map(([k]) => `estado ${s.n}: ${k}`));
const details = report.states.flatMap(s => [...s.composed.flatMap(r => r.failures.map(f => `estado ${s.n} compuesto ${r.room}: ${f}`)), ...s.rest.flatMap(r => r.failures.map(f => `estado ${s.n} reposo ${r.room}: ${f}`)),
  ...s.visibility.flatMap(v => ['overview', 'focus'].filter(k => v[k]?.status === 'FAIL').map(k => `estado ${s.n} ${k} ${v.name}: ${v[k].visible}px`))]);
report.status = failures.length ? 'FAIL' : 'PASS';
report.failures = failures;
report.details = details;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
const table = report.states.map(s => ({ n: s.n, triangles: s.triangles, people: s.people, ...s.checks,
  devices: s.visibility.map(v => `${v.name.replace(/^.*?:/, '')} ${v.overview?.visible ?? '-'}/${v.focus?.visible ?? '-'}`).join('; ') }));
console.log(JSON.stringify({ out, status: report.status, states: table, details: details.slice(0, 60) }, null, 1));
process.exit(failures.length ? 1 : 0);
