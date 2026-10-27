#!/usr/bin/env node
// Imports the Meshy primaria students (docs/papercraft/reference/meshy/*.glb: image-to-3d,
// one textured mesh each) into runtime data modules, one per model (MODELS below):
// asesor/lab/paper/meshy/primaria-meshy-*.js. The GLBs stay local (.gitignore); each module
// records its SHA256 and every parameter, and is generated (or retouched in Blender through
// 3d-assets/procedural-web, recorded in SOURCE.edited), never edited by hand.
//
// Pipeline, all in H units (sole at y = 0, height 1, +Z front):
//   1. weld the mesh by position (Meshy splits vertices on UV seams; the shape is watertight);
//   2. classify every source face by its texture colour (skin, hair, vest, shirt, pants, shoe,
//      bag, dark) with position rules and neighbour smoothing, and give it a bone;
//   3. one error-driven simplification of the whole mesh (meshoptimizer): the flat paper facets
//      of the model survive, and a single welded mesh has no cracks between bones at rest;
//   4. each simplified face takes the class and bone most voted by the source faces under it;
//   5. eyes and smile, painted only in the texture, become flat decals on the simplified face.
// Two variants: `bag` (standing) and `plain`, where the backpack is pressed onto the back and
// recoloured from its neighbours (seated students carry no backpack).
//   node tools/meshy-import.mjs [--check] [--preview <dir>] [--model nino|nina] [--force]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const jpeg = require('jpeg-js');
const { MeshoptSimplifier } = await import('meshoptimizer');

/** Triangles of the simplified body per variant (per model, `target`); decals (eyes 2 × 4, smile 3) come on top. */
const TOE = .009; // H
const LAYER_GAP = .006; // H: 0.0047 scene units on a 0.78 student, above the 0.0045 layer gap
const DECAL_GAP = .0075; // H along the normal of the facet under each decal vertex: 0.0059 scene units on a 0.78 student
/** Class prototypes in texture RGB (Meshy paints bright, flat colours). */
const PROTO = { skin: [250, 190, 110], hair: [64, 36, 96], vest: [92, 16, 205], shirt: [245, 250, 250], pants: [32, 52, 128], bag: [10, 210, 250], dark: [20, 20, 40] };
export const CLASSES = ['skin', 'hair', 'vest', 'shirt', 'pants', 'shoe', 'bag', 'dark'];
/**
 * Models. Landmarks are measured on each model (grid renders at 0.05 H) and are the pivots of
 * the rig. For the boy, UniRig (3d-assets lab, run 20261025T-meshy-primaria-unirig) predicted
 * knee 0.225, neck 0.670, hip joints 0.369 and the elbow at the sleeve hem (0.529): hip and
 * elbow follow it. Its shoulder is a clavicle inside the torso (x 0.076), made for soft weights;
 * rigid pieces keep the pivot at the top of the sleeve so the sleeve stays on the shoulder.
 * `armpit`: the armhole steps from |x| 0.128 to 0.105 above it. `boxZ`: the backpack box is
 * what lies behind it. `hairDown`: the hair reaches this low (the girl's pigtails hang beside
 * the shoulders). `skirt`: the skirt splits at x = 0 so each half follows its thigh.
 * `components`: the model comes as closed pieces (sleeves, hands, legs, shoes...): each piece
 * follows one bone and no joint is cut; its flat eye and smile plates give way to the decals.
 * Pieces are simplified one by one under one absolute error, searched to fit `target`, with at
 * least `minPiece` triangles each (up to 10 for bigger lumps, 0.8·√faces): a global pass would spend the budget on the big pieces and
 * leave hands and legs as slivers.
 */
export const MODELS = {
  nino: {
    file: 'docs/papercraft/reference/meshy/Meshy_AI_Papercraft_Student_1025165445_image-to-3d-texture.glb', out: 'asesor/lab/paper/meshy/primaria-meshy-data.js',
    L: { ankle: .07, knee: .22, hip: .37, shoulder: .625, elbow: .52, neck: .675, chin: .70 }, armpit: .56, boxZ: -.085, hairDown: .70, skirt: false, target: 264
  },
  nina: {
    file: 'docs/papercraft/reference/meshy/niña-primaria.glb', out: 'asesor/lab/paper/meshy/primaria-meshy-nina-data.js',
    L: { ankle: .088, knee: .19, hip: .36, shoulder: .625, elbow: .48, neck: .665, chin: .676 }, armpit: .53, boxZ: -.07, hairDown: .58, skirt: true, components: true, target: 296, minPiece: 4
  }
};

function readGlb(file) {
  const buf = fs.readFileSync(file);
  const jl = buf.readUInt32LE(12), J = JSON.parse(buf.subarray(20, 20 + jl)), bin = buf.subarray(20 + jl + 8);
  const acc = i => {
    const a = J.accessors[i], v = J.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
    const T = a.componentType === 5126 ? Float32Array : a.componentType === 5125 ? Uint32Array : Uint16Array;
    const off = bin.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0);
    return new T(bin.buffer.slice(off, off + a.count * n * T.BYTES_PER_ELEMENT));
  };
  const prim = J.meshes[0].primitives[0];
  const tex = J.textures[J.materials[0].pbrMetallicRoughness.baseColorTexture.index];
  const iv = J.bufferViews[J.images[tex.source].bufferView];
  const img = jpeg.decode(bin.subarray(iv.byteOffset, iv.byteOffset + iv.byteLength), { maxMemoryUsageInMB: 2048 });
  return { P: acc(prim.attributes.POSITION), UV: acc(prim.attributes.TEXCOORD_0), I: acc(prim.indices), img, sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (u, w) => [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
const r4 = v => Math.round(v * 1e4) / 1e4;

/**
 * Layered pieces (straps on the vest, the two shells of a sleeve, the skirt over its lining) lie
 * closer than the 0.0045 scene-unit layer gap: they would flicker. For every pair of parallel,
 * overlapping faces of different colour, the face of the smaller piece (inside one piece, the
 * smaller face: vest over shirt) moves away from the other along its normal; its vertices move
 * with every face of that piece that shares them.
 */
function separateLayers(tris, gap = LAYER_GAP) {
  const n = t => { const c = cross(sub(t.v[1], t.v[0]), sub(t.v[2], t.v[0])), l = Math.hypot(...c) || 1; return c.map(x => x / l); };
  const ctr = t => [0, 1, 2].map(j => (t.v[0][j] + t.v[1][j] + t.v[2][j]) / 3);
  const size = new Map(); for (const t of tris) size.set(t.piece, (size.get(t.piece) || 0) + 1);
  const box = t => [0, 1, 2].map(j => [Math.min(t.v[0][j], t.v[1][j], t.v[2][j]), Math.max(t.v[0][j], t.v[1][j], t.v[2][j])]);
  for (let pass = 0; pass < 4; pass++) {
    let moved = 0;
    for (let i = 0; i < tris.length; i++) for (let k = i + 1; k < tris.length; k++) {
      const a = tris[i], b = tris[k];
      if (a.bone !== b.bone) continue;
      const na = n(a), nb = n(b), dn = na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2];
      if (Math.abs(dn) < .9995 - .02 || (a.cls === b.cls && dn > 0)) continue; // same cloth back to back (a thin flap) also gets the gap
      const ba = box(a), bb = box(b); if (ba.some((r, j) => r[1] < bb[j][0] - gap || bb[j][1] < r[0] - gap)) continue;
      const ca = ctr(a), cb = ctr(b), d = Math.abs((cb[0] - ca[0]) * na[0] + (cb[1] - ca[1]) * na[1] + (cb[2] - ca[2]) * na[2]);
      if (d >= gap) continue;
      const area = t => Math.hypot(...cross(sub(t.v[1], t.v[0]), sub(t.v[2], t.v[0])));
      const [m, o] = (a.piece === b.piece ? area(a) <= area(b) : size.get(a.piece) <= size.get(b.piece)) ? [a, b] : [b, a], nm = n(m), co = ctr(o), cm = ctr(m);
      const sgn = (cm[0] - co[0]) * nm[0] + (cm[1] - co[1]) * nm[1] + (cm[2] - co[2]) * nm[2] >= 0 ? 1 : -1, push = (gap - d) + 1e-4;
      const keys = new Set(m.v.map(v => v.join(',')));
      for (const t of tris) if (t.piece === m.piece) t.v = t.v.map(v => keys.has(v.join(',')) ? v.map((x, j) => x + nm[j] * push * sgn) : v);
      moved++;
    }
    if (!moved) break;
  }
  for (const t of tris) t.v = t.v.map(v => v[1] < 0 ? [v[0], 0, v[2]] : v); // a pushed sole stays on the floor
}

export async function importMeshy(model) {
  await MeshoptSimplifier.ready;
  const cfg = MODELS[model], L = cfg.L, ARMPIT = cfg.armpit, BOX_Z = cfg.boxZ, file = path.join(root, cfg.file);
  const g = readGlb(file), F = g.I.length / 3;
  // ---- normalise to H and weld
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < g.P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], g.P[i + k]); mx[k] = Math.max(mx[k], g.P[i + k]); }
  const h = mx[1] - mn[1], cx = (mn[0] + mx[0]) / 2;
  const weld = new Map(), WP = [], WI = new Uint32Array(g.I.length);
  for (let f = 0; f < g.I.length; f++) {
    const i = g.I[f], x = (g.P[i * 3] - cx) / h, y = (g.P[i * 3 + 1] - mn[1]) / h, z = g.P[i * 3 + 2] / h;
    const k = `${Math.round(x * 2e5)},${Math.round(y * 2e5)},${Math.round(z * 2e5)}`;
    let w = weld.get(k); if (w === undefined) { w = WP.length / 3; weld.set(k, w); WP.push(x, y, z); }
    WI[f] = w;
  }
  // centre z on the trouser legs (y 0.1–0.3), the body's vertical axis
  let zs = 0, zn = 0; for (let i = 0; i < WP.length; i += 3) if (WP[i + 1] > .1 && WP[i + 1] < .3) { zs += WP[i + 2]; zn++; }
  const z0 = zs / zn; for (let i = 2; i < WP.length; i += 3) WP[i] -= z0;
  const W = new Float32Array(WP), NV = W.length / 3;

  // ---- per source face: centroid, texture class
  const cen = new Float32Array(F * 3);
  for (let f = 0; f < F; f++) for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) cen[f * 3 + j] += W[WI[f * 3 + k] * 3 + j] / 3;
  const texel = (u, v) => { const { img } = g, x = Math.min(img.width - 1, Math.max(0, Math.floor(u * img.width))), y = Math.min(img.height - 1, Math.max(0, Math.floor(v * img.height))), o = (y * img.width + x) * 4; return [img.data[o], img.data[o + 1], img.data[o + 2]]; };
  const cls = new Array(F);
  for (let f = 0; f < F; f++) {
    const us = [0, 1, 2].map(k => g.UV[g.I[f * 3 + k] * 2]), vs = [0, 1, 2].map(k => g.UV[g.I[f * 3 + k] * 2 + 1]);
    const u = (us[0] + us[1] + us[2]) / 3, v = (vs[0] + vs[1] + vs[2]) / 3, s = [texel(u, v), ...[0, 1, 2].map(k => texel(u + (us[k] - u) * .5, v + (vs[k] - v) * .5))];
    const rgb = [0, 1, 2].map(c => s.reduce((a, q) => a + q[c], 0) / s.length);
    let best = null, bd = Infinity;
    for (const [name, p] of Object.entries(PROTO)) { const d = (rgb[0] - p[0]) ** 2 * .3 + (rgb[1] - p[1]) ** 2 * .59 + (rgb[2] - p[2]) ** 2 * .11; if (d < bd) { bd = d; best = name; } }
    cls[f] = best;
  }
  const y = f => cen[f * 3 + 1], x = f => cen[f * 3], z = f => cen[f * 3 + 2];
  // position rules: shoes are the dark feet; the head holds only skin, hair and the dark features
  for (let f = 0; f < F; f++) {
    const Y = y(f), c = cls[f];
    if (Y < L.ankle - .004) cls[f] = 'shoe';
    else if (Y > L.chin) { if (c === 'pants' || c === 'bag' || c === 'vest') cls[f] = 'hair'; else if (c === 'shirt') cls[f] = 'skin'; }
    else if ((c === 'hair' && Y < cfg.hairDown) || c === 'dark') cls[f] = Y < L.ankle + .03 ? 'shoe' : null; // texture noise below the hair: neighbours decide
  }
  const vf = Array.from({ length: NV }, () => []);
  for (let f = 0; f < F; f++) for (let k = 0; k < 3; k++) vf[WI[f * 3 + k]].push(f);
  const smooth = (labels, passes, keep) => {
    for (let pass = 0; pass < passes; pass++) {
      const next = labels.slice();
      for (let f = 0; f < F; f++) {
        if (keep && keep(f)) continue;
        const votes = {};
        for (let k = 0; k < 3; k++) for (const o of vf[WI[f * 3 + k]]) if (o !== f && labels[o]) votes[labels[o]] = (votes[labels[o]] || 0) + 1;
        const top = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
        if (!top) continue;
        const mine = labels[f] ? votes[labels[f]] || 0 : -1;
        if (!labels[f] || top[1] > mine * 2) next[f] = top[0];
      }
      for (let f = 0; f < F; f++) labels[f] = next[f];
    }
  };
  smooth(cls, 4);

  // ---- bones. The arm hangs a little outward: its elbow is measured along its own axis.
  // The armhole steps in at the armpit: below it the arm starts at |x| 0.128, above it at 0.105,
  // so the shoulder cap of the sleeve follows the arm when it rises.
  const WAIST = .40, ARM_X = .128, CAP_X = .105;
  const armish = (X, Y, c) => Y > .30 && Y < .68 && Math.abs(X) > (Y > ARMPIT ? CAP_X : ARM_X) && (c === 'skin' || c === 'shirt');
  const axis = {};
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? 1 : -1, hand = [], sleeve = [];
    for (let f = 0; f < F; f++) if (armish(x(f), y(f), cls[f]) && Math.sign(x(f)) === sg) { if (cls[f] === 'skin' && y(f) < .40) hand.push(f); if (cls[f] === 'shirt') sleeve.push(f); }
    const hc = [0, 1, 2].map(j => hand.reduce((a, f) => a + cen[f * 3 + j], 0) / hand.length);
    const piv = [sg * .148, L.shoulder, sleeve.reduce((a, f) => a + z(f), 0) / sleeve.length];
    const d = sub(hc, piv), l = Math.hypot(...d);
    axis[s] = { piv, hand: hc, dir: d.map(v => v / l) };
  }
  const elbowT = s => (axis[s].piv[1] - L.elbow) / -axis[s].dir[1];
  const elbowAt = s => axis[s].piv.map((v, j) => v + axis[s].dir[j] * elbowT(s));
  const boneAt = (p, c) => {
    const [X, Y] = p, s = X > 0 ? 'L' : 'R';
    if ((Y > L.neck && c !== 'shirt' && c !== 'bag') || (c === 'hair' && Y > cfg.hairDown)) return 'head';
    if (c === 'skin' && Y > .655 && Math.abs(X) < .07) return 'head'; // the neck, inside the collar
    if (c === 'bag') return 'torso';
    if (armish(X, Y, c)) { const d = sub(p, axis[s].piv); return d[0] * axis[s].dir[0] + d[1] * axis[s].dir[1] + d[2] * axis[s].dir[2] > elbowT(s) ? 'fore' + s : 'arm' + s; }
    if (Y > WAIST) return 'torso';
    if (Y > L.hip) return 'hips';
    return (Y > L.knee ? 'leg' : 'shin') + s;
  };

  // ---- rig (H, root rest): pivots measured on the source
  const mean = (pred, j) => { let t = 0, n = 0; for (let f = 0; f < F; f++) if (pred(f)) { t += cen[f * 3 + j]; n++; } return t / n; };
  const legX = mean(f => (cls[f] === 'pants' || cls[f] === 'skin') && y(f) > L.ankle + .02 && y(f) < .3 && x(f) > 0 && x(f) < ARM_X, 0);
  const neckZ = mean(f => cls[f] === 'skin' && y(f) > L.neck && y(f) < L.chin + .01 && Math.abs(x(f)) < .07, 2);
  const RIG_H = {
    root: { parent: null, at: [0, 0, 0] }, hips: { parent: 'root', at: [0, L.hip, 0] }, torso: { parent: 'hips', at: [0, L.hip, 0] },
    head: { parent: 'torso', at: [0, L.neck, neckZ] }, armL: { parent: 'torso', at: axis.L.piv }, armR: { parent: 'torso', at: axis.R.piv },
    foreL: { parent: 'armL', at: elbowAt('L') }, foreR: { parent: 'armR', at: elbowAt('R') },
    legL: { parent: 'hips', at: [legX, L.hip, 0] }, legR: { parent: 'hips', at: [-legX, L.hip, 0] },
    shinL: { parent: 'legL', at: [legX, L.knee, 0] }, shinR: { parent: 'legR', at: [-legX, L.knee, 0] }
  };
  for (const b of Object.values(RIG_H)) b.at = b.at.map(r4);

  // ---- painted features: eyes and smile live only in the texture, inside large flat skin
  // triangles. Rasterise the face triangles in UV, keep the ink pixels (dark navy) and lift
  // them to 3D by barycentric coordinates; three clusters remain (two eyes, the smile).
  const ink = (() => {
    const pts = [], { img } = g;
    for (let f = 0; f < F; f++) {
      if (y(f) < L.chin || y(f) > .815 || z(f) < .05 || Math.abs(x(f)) > .1) continue;
      const uv = [0, 1, 2].map(k => [g.UV[g.I[f * 3 + k] * 2] * img.width, g.UV[g.I[f * 3 + k] * 2 + 1] * img.height]);
      const P3 = [0, 1, 2].map(k => [W[WI[f * 3 + k] * 3], W[WI[f * 3 + k] * 3 + 1], W[WI[f * 3 + k] * 3 + 2]]);
      const d = (uv[1][0] - uv[0][0]) * (uv[2][1] - uv[0][1]) - (uv[2][0] - uv[0][0]) * (uv[1][1] - uv[0][1]);
      if (Math.abs(d) < 1e-9) continue;
      for (let py = Math.floor(Math.min(uv[0][1], uv[1][1], uv[2][1])); py <= Math.max(uv[0][1], uv[1][1], uv[2][1]); py++)
        for (let px = Math.floor(Math.min(uv[0][0], uv[1][0], uv[2][0])); px <= Math.max(uv[0][0], uv[1][0], uv[2][0]); px++) {
          const u = ((px + .5 - uv[0][0]) * (uv[2][1] - uv[0][1]) - (uv[2][0] - uv[0][0]) * (py + .5 - uv[0][1])) / d;
          const v = ((uv[1][0] - uv[0][0]) * (py + .5 - uv[0][1]) - (px + .5 - uv[0][0]) * (uv[1][1] - uv[0][1])) / d;
          if (u < 0 || v < 0 || u + v > 1) continue;
          const o = (Math.min(img.height - 1, py) * img.width + Math.min(img.width - 1, px)) * 4, R = img.data[o], G = img.data[o + 1], B = img.data[o + 2];
          if (R + G + B > 180 || B < R + 40) continue; // ink: dark navy, never the warm skin or the violet hair
          pts.push([0, 1, 2].map(j => P3[0][j] + u * (P3[1][j] - P3[0][j]) + v * (P3[2][j] - P3[0][j])));
        }
    }
    const C3 = .004, cells = new Map(), key = p => `${Math.floor(p[0] / C3)},${Math.floor(p[1] / C3)}`;
    for (const p of pts) { const k = key(p); (cells.get(k) || cells.set(k, []).get(k)).push(p); }
    const seen = new Set(), blobs = [];
    for (const k0 of cells.keys()) {
      if (seen.has(k0)) continue;
      const b = { n: 0, x0: 9, x1: -9, y0: 9, y1: -9 }, stack = [k0]; seen.add(k0);
      while (stack.length) {
        const k = stack.pop(), [i, j] = k.split(',').map(Number);
        for (const p of cells.get(k)) { b.n++; b.x0 = Math.min(b.x0, p[0]); b.x1 = Math.max(b.x1, p[0]); b.y0 = Math.min(b.y0, p[1]); b.y1 = Math.max(b.y1, p[1]); }
        for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) { const n = `${i + a},${j + c}`; if (cells.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); } }
      }
      blobs.push(b);
    }
    const big = blobs.sort((a, b) => b.n - a.n).slice(0, 3).sort((a, b) => b.y0 - a.y0);
    if (big.length !== 3 || big[2].n < 20) throw new Error(`se esperaban 2 ojos y una sonrisa: ${JSON.stringify(blobs.slice(0, 5))}`);
    return big;
  })();

  // ---- pieces of a model made of closed components: bone per piece, flat face plates dropped
  const comp = new Int32Array(F).fill(-1), pieces = [];
  if (cfg.components) {
    const par = Array.from({ length: NV }, (_, i) => i), find = v => par[v] === v ? v : (par[v] = find(par[v]));
    for (let f = 0; f < F; f++) { par[find(WI[f * 3])] = find(WI[f * 3 + 1]); par[find(WI[f * 3 + 1])] = find(WI[f * 3 + 2]); }
    const ids = new Map();
    for (let f = 0; f < F; f++) {
      const r = find(WI[f * 3]); let k = ids.get(r);
      if (k === undefined) { ids.set(r, k = pieces.length); pieces.push({ faces: [], votes: {}, lo: [9, 9, 9], hi: [-9, -9, -9] }); }
      const pc = pieces[k]; comp[f] = k; pc.faces.push(f); pc.votes[cls[f]] = (pc.votes[cls[f]] || 0) + 1;
      for (const v of [0, 1, 2].map(q => WI[f * 3 + q])) for (let j = 0; j < 3; j++) { pc.lo[j] = Math.min(pc.lo[j], W[v * 3 + j]); pc.hi[j] = Math.max(pc.hi[j], W[v * 3 + j]); }
    }
    for (const pc of pieces) {
      pc.cls = Object.entries(pc.votes).sort((a, b) => b[1] - a[1])[0][0];
      pc.ctr = [0, 1, 2].map(j => pc.faces.reduce((t, f) => t + cen[f * 3 + j], 0) / pc.faces.length);
      pc.plate = pc.hi[2] - pc.lo[2] < .025 && pc.ctr[1] > L.chin - .02 && pc.ctr[1] < .82 && pc.ctr[2] > .08 && Math.abs(pc.ctr[0]) < .1; // painted eye or smile on a flat plate
      pc.volume = pc.faces.reduce((t, f) => { const [a, b, c] = [0, 1, 2].map(q => WI[f * 3 + q]); return t + (W[a * 3] * (W[b * 3 + 1] * W[c * 3 + 2] - W[b * 3 + 2] * W[c * 3 + 1]) - W[a * 3 + 1] * (W[b * 3] * W[c * 3 + 2] - W[b * 3 + 2] * W[c * 3]) + W[a * 3 + 2] * (W[b * 3] * W[c * 3 + 1] - W[b * 3 + 1] * W[c * 3])) / 6; }, 0);
      pc.scrap = pc.cls === 'bag' && pc.faces.length < 30; // loose strap ends: a few triangles each that read as noise
      pc.skirt = cfg.skirt && pc.cls === 'pants' && pc.ctr[1] > L.knee && pc.ctr[1] < WAIST;
      pc.bone = pc.skirt ? null : boneAt(pc.ctr, pc.cls === 'dark' ? 'skin' : pc.cls);
    }
    // doubled shells (two sleeves, shoes or hands in the same place): keep the bigger one
    const iou = (a, b) => { let i = 1, u = 1; for (let j = 0; j < 3; j++) { i *= Math.max(0, Math.min(a.hi[j], b.hi[j]) - Math.max(a.lo[j], b.lo[j])); u *= Math.max(a.hi[j], b.hi[j]) - Math.min(a.lo[j], b.lo[j]); } return i / u; };
    for (const a of pieces) for (const b of pieces) if (a !== b && !a.plate && !b.plate && a.cls === b.cls && a.faces.length <= b.faces.length && !b.dup && iou(a, b) > .8 && (a.faces.length < b.faces.length || pieces.indexOf(a) > pieces.indexOf(b))) a.dup = true;
  }
  const pieceBone = (f, p) => { const pc = pieces[comp[f]]; return pc.skirt ? (p[0] > 0 ? 'legL' : 'legR') : pc.bone; };

  /**
   * Source of the variant without backpack: the box of the bag (behind the back) is removed and
   * its hole closed with a fan; the straps keep their geometry and take the colour of the cloth
   * around them.
   */
  const plainSource = () => {
    if (cfg.components) { // the backpack and its straps are their own pieces: drop them
      const I = [], C = [], O = [];
      for (let f = 0; f < F; f++) if (!pieces[comp[f]].plate && !pieces[comp[f]].scrap && !pieces[comp[f]].dup && pieces[comp[f]].cls !== 'bag') { I.push(WI[f * 3], WI[f * 3 + 1], WI[f * 3 + 2]); C.push(cls[f]); O.push(f); }
      return { P: W, I, C, O, holes: 0 };
    }
    const P = Array.from(W), I = [], C = [];
    for (let f = 0; f < F; f++) { if (cls[f] === 'bag' && z(f) < BOX_Z) continue; I.push(WI[f * 3], WI[f * 3 + 1], WI[f * 3 + 2]); const back = z(f) < -.03 && y(f) < .63 && Math.abs(x(f)) < ARM_X; // the vest covers the whole back (Meshy left shirt under the bag)
      C.push(cls[f] === 'bag' ? (z(f) < 0 ? 'vest' : null) : back && cls[f] === 'shirt' ? 'vest' : cls[f]); }
    const half = new Set(); for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) half.add(`${I[t + k]},${I[t + (k + 1) % 3]}`);
    const border = new Map();
    for (let t = 0; t < I.length; t += 3) for (let k = 0; k < 3; k++) { const a = I[t + k], b = I[t + (k + 1) % 3]; if (!half.has(`${b},${a}`)) (border.get(b) || border.set(b, []).get(b)).push(a); }
    let holes = 0;
    while (border.size) {
      const [start] = border.keys(), loop = [];
      for (let v = start, guard = 0; guard < 1e6; guard++) { const list = border.get(v); if (!list) break; const to = list.shift(); if (!list.length) border.delete(v); loop.push(v); v = to; if (v === start) break; }
      if (loop.length < 3) continue;
      const c = loop.reduce((acc, v) => acc.map((q, j) => q + P[v * 3 + j] / loop.length), [0, 0, 0]), ci = P.length / 3;
      P.push(...c); holes++;
      for (let i = 0; i < loop.length; i++) { I.push(loop[i], loop[(i + 1) % loop.length], ci); C.push(c[2] < 0 ? 'vest' : null); }
    }
    // grow the cloth over the straps (and any open patch) from its neighbours
    const vfp = new Map(); for (let f = 0; f < C.length; f++) for (let k = 0; k < 3; k++) (vfp.get(I[f * 3 + k]) || vfp.set(I[f * 3 + k], []).get(I[f * 3 + k])).push(f);
    for (let guard = 0; guard < 500 && C.includes(null); guard++) {
      const next = C.slice();
      for (let f = 0; f < C.length; f++) if (!C[f]) {
        const votes = {}; for (let k = 0; k < 3; k++) for (const o of vfp.get(I[f * 3 + k])) if (C[o]) votes[C[o]] = (votes[C[o]] || 0) + 1;
        const top = Object.entries(votes).sort((p2, q) => q[1] - p2[1])[0]; if (top) next[f] = top[0];
      }
      for (let f = 0; f < C.length; f++) C[f] = next[f];
    }
    return { P, I, C, holes };
  };

  /** Cut at the joints, split vertices by bone, simplify; faces vote their class. */
  const simplifyVariant = ({ P: P0, I: I0, C: C0, O: O0 }) => {
    let DP = Array.from(P0), DI = Array.from(I0), DC = C0.slice(), DO = O0 ? O0.slice() : DC.map(() => -1);
    const cut = (n, d) => {
      const edge = new Map(), NI = [], NC = [], NO = [], P = i => [DP[i * 3], DP[i * 3 + 1], DP[i * 3 + 2]];
      const sd = i => DP[i * 3] * n[0] + DP[i * 3 + 1] * n[1] + DP[i * 3 + 2] * n[2] - d;
      const mid = (a, b) => { const k = a < b ? `${a},${b}` : `${b},${a}`; let m = edge.get(k); if (m === undefined) { const sa = sd(a), t = sa / (sa - sd(b)), A = P(a), B = P(b); m = DP.length / 3; DP.push(...A.map((v, j) => v + (B[j] - v) * t)); edge.set(k, m); } return m; };
      for (let f = 0; f < DC.length; f++) {
        const t = [DI[f * 3], DI[f * 3 + 1], DI[f * 3 + 2]], c = DC[f], sg = t.map(i => sd(i) >= 0);
        if (sg[0] === sg[1] && sg[1] === sg[2]) { NI.push(...t); NC.push(c); NO.push(DO[f]); continue; }
        const k = sg[0] !== sg[1] && sg[0] !== sg[2] ? 0 : sg[1] !== sg[0] && sg[1] !== sg[2] ? 1 : 2; // the lone vertex
        const a = t[k], b = t[(k + 1) % 3], e = t[(k + 2) % 3], ab = mid(a, b), ae = mid(a, e);
        NI.push(a, ab, ae, ab, b, e, ab, e, ae); NC.push(c, c, c); NO.push(DO[f], DO[f], DO[f]);
      }
      DI = NI; DC = NC; DO = NO;
    };
    // whole planes: cutting only a region would leave T-junctions (open borders) at its edge;
    // extra cuts inside one bone cost nothing after the simplification
    if (cfg.skirt) cut([1, 0, 0], 0); // the skirt halves follow their thighs
    if (!cfg.components) cut([0, 1, 0], L.knee), cut([0, 1, 0], L.hip), cut([0, 1, 0], WAIST), cut([0, 1, 0], ARMPIT);
    if (!cfg.components) for (const s of ['L', 'R']) {
      const sg = s === 'L' ? 1 : -1, n = axis[s].dir, e = elbowAt(s);
      cut([sg, 0, 0], ARM_X); cut([sg, 0, 0], CAP_X); cut(n, n[0] * e[0] + n[1] * e[1] + n[2] * e[2]);
    }
    const DF = DC.length, dcen = new Float32Array(DF * 3), dbone = new Array(DF);
    for (let f = 0; f < DF; f++) {
      for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) dcen[f * 3 + j] += DP[DI[f * 3 + k] * 3 + j] / 3;
      const p = [dcen[f * 3], dcen[f * 3 + 1], dcen[f * 3 + 2]];
      dbone[f] = cfg.components ? pieceBone(DO[f], p) : boneAt(p, DC[f]);
    }
    // nearest cut source face (uniform grid on centroids)
    const CELL = .02, grid = new Map(), gk = (i, j, k) => `${i},${j},${k}`;
    for (let f = 0; f < DF; f++) { const k = gk(...[0, 1, 2].map(j => Math.floor(dcen[f * 3 + j] / CELL))); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(f); }
    const nearest = q => {
      const [i, j, k] = q.map(v => Math.floor(v / CELL));
      for (let r = 1; r <= 4; r++) {
        let best = -1, bd = Infinity;
        for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) for (const f of grid.get(gk(i + a, j + b, k + c)) || []) {
          const d = (dcen[f * 3] - q[0]) ** 2 + (dcen[f * 3 + 1] - q[1]) ** 2 + (dcen[f * 3 + 2] - q[2]) ** 2; if (d < bd) { bd = d; best = f; }
        }
        if (best >= 0) return best;
      }
      return -1;
    };
    // vertices split by bone: every joint cut is a seam the simplifier keeps (both sides collapse
    // together, so there are no cracks at rest)
    const split = new Map(), SP = [], SB = [], SI = new Uint32Array(DI.length);
    for (let f = 0; f < DF; f++) for (let k = 0; k < 3; k++) {
      const v = DI[f * 3 + k], key = `${v}|${dbone[f]}`;
      let i = split.get(key); if (i === undefined) { split.set(key, i = SB.length); SP.push(DP[v * 3], DP[v * 3 + 1], DP[v * 3 + 2]); SB.push(dbone[f]); }
      SI[f * 3 + k] = i;
    }
    const SPf = new Float32Array(SP), pos = i => [SPf[i * 3], SPf[i * 3 + 1], SPf[i * 3 + 2]];
    let S, err, pieceOf = null;
    if (cfg.components) {
      const groups = new Map(); for (let f = 0; f < DF; f++) { const k = comp[DO[f]]; (groups.get(k) || groups.set(k, []).get(k)).push(SI[f * 3], SI[f * 3 + 1], SI[f * 3 + 2]); }
      const lists = [...groups.values()].map(l => new Uint32Array(l)), keys = [...groups.keys()];
      // the face reads first: head pieces take less error (the hair cap must keep covering the
      // pigtails' roots), torso and skirt a little less; legs, shoes and hands pay for it
      const weight = keys.map(k => pieces[k].skirt ? .7 : ({ head: .6, torso: .7 })[pieces[k].bone] || 1);
      // the big pieces (torso, hair, skirt, backpack) keep their extreme vertices (min and max in
      // x, y, z): height and widths survive; small pieces stay free to fall to their floor
      const lock = new Uint8Array(SPf.length / 3), zeros = new Float32Array(SPf.length / 3);
      for (const idx of lists) if (idx.length / 3 > 100) for (let j = 0; j < 3; j++) {
        let lo = idx[0], hi = idx[0];
        for (const i of idx) { if (SPf[i * 3 + j] < SPf[lo * 3 + j]) lo = i; if (SPf[i * 3 + j] > SPf[hi * 3 + j]) hi = i; }
        lock[lo] = lock[hi] = 1;
      }
      const run = e => lists.map((idx, i) => {
        let [r] = MeshoptSimplifier.simplifyWithAttributes(idx, SPf, 3, zeros, 1, [0], lock, 0, e * weight[i], ['ErrorAbsolute', 'Sparse']);
        const lump = pieces[keys[i]].bone === 'head' && pieces[keys[i]].cls === 'hair' && pieces[keys[i]].faces.length < 80; // a pigtail
        const floor = Math.min(idx.length / 3, lump ? 10 : Math.max(cfg.minPiece, Math.min(10, Math.round(Math.sqrt(idx.length / 3) * .8)))); // lumps keep volume: a pigtail is not a sheet
        if (r.length / 3 < floor) [r] = MeshoptSimplifier.simplify(idx, SPf, 3, floor * 3, 1, ['Sparse']);
        return r;
      });
      let lo = 0, hi = .2;
      for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (run(mid).reduce((t, r) => t + r.length / 3, 0) > cfg.target) lo = mid; else hi = mid; }
      const out = run(hi); S = new Uint32Array(out.reduce((t, r) => t + r.length, 0)); let o = 0; for (const r of out) { S.set(r, o); o += r.length; }
      pieceOf = new Int32Array(S.length / 3); o = 0; out.forEach((r, i) => { pieceOf.fill(i, o / 3, (o + r.length) / 3); o += r.length; });
      err = hi;
    } else [S, err] = MeshoptSimplifier.simplify(SI, SPf, 3, cfg.target * 3, 1, []);
    const tris = [];
    let dropped = 0;
    for (let t = 0; t < S.length; t += 3) {
      const ix = [S[t], S[t + 1], S[t + 2]], P3 = ix.map(pos);
      if (Math.hypot(...cross(sub(P3[1], P3[0]), sub(P3[2], P3[0]))) < 1e-7) { dropped++; continue; } // slivers: invisible, and degenerate once scaled
      if (SB[ix[0]] !== SB[ix[1]] || SB[ix[0]] !== SB[ix[2]]) throw new Error('cara simplificada entre dos huesos');
      const cv = {};
      for (const w of [[1 / 3, 1 / 3, 1 / 3], [.6, .2, .2], [.2, .6, .2], [.2, .2, .6]]) {
        const q = [0, 1, 2].map(j => P3[0][j] * w[0] + P3[1][j] * w[1] + P3[2][j] * w[2]), f = nearest(q);
        cv[DC[f]] = (cv[DC[f]] || 0) + 1;
      }
      tris.push({ v: P3, cls: Object.entries(cv).sort((p2, q) => q[1] - p2[1])[0][0], bone: SB[ix[0]], piece: pieceOf ? pieceOf[t / 3] : -1 });
    }
    if (cfg.components) separateLayers(tris);
    return { tris, error: r4(err), dropped, sourceTriangles: I0.length / 3 };
  };

  const variants = {};
  const plain = plainSource();
  const full = cfg.components
    ? (() => { const I = [], C = [], O = []; for (let f = 0; f < F; f++) if (!pieces[comp[f]].plate && !pieces[comp[f]].scrap && !pieces[comp[f]].dup) { I.push(WI[f * 3], WI[f * 3 + 1], WI[f * 3 + 2]); C.push(cls[f]); O.push(f); } return { P: W, I, C, O }; })()
    : { P: W, I: WI, C: cls };
  for (const [name, src] of [['bag', full], ['plain', plain]]) {
    const run = simplifyVariant(src), parts = {};
    for (const t of run.tris) {
      const id = t.bone === 'torso' && t.cls === 'bag' ? 'bag' : t.bone;
      const p = parts[id] ||= { id, bone: t.bone, vertices: [], faces: [], classes: [], _map: new Map() };
      p.faces.push(t.v.map(v => { const k = v.map(r4).join(','); let j = p._map.get(k); if (j === undefined) { p._map.set(k, j = p.vertices.length); p.vertices.push(v.map(r4)); } return j; }));
      p.classes.push(CLASSES.indexOf(t.cls));
    }
    for (const p of Object.values(parts)) delete p._map;
    // ---- toe spring (as the R2 adaptation of P18): the sole rises toward the toe, so a
    // swinging foot does not dig into the floor; the heel keeps y = 0 and H is unchanged
    for (const id of ['shinL', 'shinR']) {
      const p = parts[id], feet = p.vertices.filter(v => v[1] < L.ankle), zc = (Math.min(...feet.map(v => v[2])) + Math.max(...feet.map(v => v[2]))) / 2, zt = Math.max(...feet.map(v => v[2]));
      for (const v of p.vertices) if (v[1] < L.ankle && v[2] > zc) v[1] = r4(v[1] + TOE * (v[2] - zc) / (zt - zc) * (1 - v[1] / L.ankle));
    }
    // ---- caps: each part is open where a joint cut it. A bent joint shows the opening, so the
    // armholes of the torso and both ends of every limb segment are closed (fan from the first
    // vertex: seam loops are small and nearly planar), in the colour of the cloth around them.
    const cap = (id, closedBy, keep, fixed) => {
      const t = parts[id]; if (!t) return;
      const tri = [], cls2 = new Map();
      for (const p of closedBy.map(k => parts[k]).filter(Boolean)) p.faces.forEach((f, i) => { const k = f.map(j => p.vertices[j].join(',')); tri.push(k); if (p === t) for (const q of k) cls2.set(q, p.classes[i]); });
      const edges = new Set(); for (const f of tri) for (let k = 0; k < 3; k++) edges.add(`${f[k]}|${f[(k + 1) % 3]}`);
      const out = new Map(); // border: start key -> end keys
      for (const f of t.faces.map(f => f.map(j => t.vertices[j].join(',')))) for (let k = 0; k < 3; k++) { const a = f[k], b = f[(k + 1) % 3]; if (!edges.has(`${b}|${a}`)) (out.get(b) || out.set(b, []).get(b)).push(a); }
      while (out.size) {
        const [start] = out.keys(), loop = [];
        for (let v = start, g2 = 0; g2 < 1000; g2++) { const l = out.get(v); if (!l) break; const to = l.shift(); if (!l.length) out.delete(v); loop.push(v); v = to; if (v === start) break; }
        if (loop.length < 3) continue;
        const P = loop.map(k => k.split(',').map(Number)), c = [0, 1, 2].map(j => P.reduce((acc, q) => acc + q[j], 0) / P.length);
        if (!keep(c)) continue;
        const votes = {}; for (const k of loop) { const q = cls2.get(k); votes[q] = (votes[q] || 0) + 1; }
        const colour = fixed ?? +Object.entries(votes).sort((x, y) => y[1] - x[1])[0][0];
        const base = t.vertices.length; t.vertices.push(...P);
        for (let i = 1; i < P.length - 1; i++) { t.faces.push([base, base + i, base + i + 1]); t.classes.push(colour); }
        (parts._caps ||= []).push(`${id}:${P.length - 2}`);
      }
    };
    // armholes (not the neck and waist openings: head and hips fill them)
    if (!cfg.components) cap('torso', ['torso', 'bag'], c => Math.abs(c[0]) > .09 && c[1] > ARMPIT - .1, CLASSES.indexOf('shirt'));
    if (!cfg.components) for (const s of ['L', 'R']) {
      cap('leg' + s, ['leg' + s], () => true);   // hip and knee ends of the thigh
      cap('shin' + s, ['shin' + s], () => true); // knee end of the calf
      cap('arm' + s, ['arm' + s], c => c[1] < .6); // the sleeve's lower end (the armhole end stays inside the torso)
      cap('fore' + s, ['fore' + s], () => true); // elbow end of the forearm
    }
    const caps = parts._caps || []; delete parts._caps;
    // ---- decals: the painted features, projected on the simplified head
    const big = ink;
    const head = parts.head;
    /** Front surface of the simplified head under (px, py): the point and the unit normal of its facet. */
    const surfaceAt = (px, py) => {
      let best = null;
      const unit = v => { const l = Math.hypot(...v); return v.map(c => c / l); };
      head.faces.forEach(([a, b, c]) => {
        const A = head.vertices[a], B = head.vertices[b], Cc = head.vertices[c], n = cross(sub(B, A), sub(Cc, A));
        if (n[2] <= 1e-9) return;
        const d = (B[0] - A[0]) * (Cc[1] - A[1]) - (Cc[0] - A[0]) * (B[1] - A[1]);
        const u = ((px - A[0]) * (Cc[1] - A[1]) - (Cc[0] - A[0]) * (py - A[1])) / d, v = ((B[0] - A[0]) * (py - A[1]) - (px - A[0]) * (B[1] - A[1])) / d;
        if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) return;
        const z = A[2] + u * (B[2] - A[2]) + v * (Cc[2] - A[2]);
        if (!best || z > best.z) best = { z, n: unit(n) };
      });
      if (best) return best;
      // just past the outline (the girl's smile sits on the chin): the plane of the nearest front facet
      let near2 = Infinity;
      head.faces.forEach(([a, b, c]) => {
        const A = head.vertices[a], B = head.vertices[b], Cc = head.vertices[c], n = cross(sub(B, A), sub(Cc, A));
        if (n[2] <= 1e-9 || n[2] / Math.hypot(...n) < .5) return;
        const d2 = ((A[0] + B[0] + Cc[0]) / 3 - px) ** 2 + ((A[1] + B[1] + Cc[1]) / 3 - py) ** 2;
        if (d2 < near2) { near2 = d2; best = { z: A[2] - (n[0] * (px - A[0]) + n[1] * (py - A[1])) / n[2], n: unit(n) }; }
      });
      return best;
    };
    const decal = (id, pts, faces) => {
      const vertices = pts.map(([px, py]) => {
        const s = surfaceAt(px, py); if (!s) throw new Error(`${id}: fuera de la cara`);
        return [px + s.n[0] * DECAL_GAP, py + s.n[1] * DECAL_GAP, s.z + s.n[2] * DECAL_GAP].map(r4);
      });
      parts[id] = { id, bone: 'head', vertices, faces, classes: faces.map(() => CLASSES.indexOf('dark')) };
    };
    const [e1, e2, mouth] = big;
    for (const e of [e1, e2]) { // eye: hexagon of 4 triangles
      const cx2 = (e.x0 + e.x1) / 2, cy = (e.y0 + e.y1) / 2, rx = (e.x1 - e.x0) / 2 + .002, ry = (e.y1 - e.y0) / 2 + .002;
      const pts = [[cx2 - rx, cy], [cx2 - rx * .5, cy - ry], [cx2 + rx * .5, cy - ry], [cx2 + rx, cy], [cx2 + rx * .5, cy + ry], [cx2 - rx * .5, cy + ry]];
      decal(cx2 > 0 ? 'eyeL' : 'eyeR', pts, [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]]);
    }
    { // smile: the concave five-point polygon of recipe P05, fitted to the painted smile
      const w = (mouth.x1 - mouth.x0) / 2 + .002, hh = Math.max(.008, mouth.y1 - mouth.y0), cx2 = (mouth.x0 + mouth.x1) / 2, top = mouth.y1 + .002;
      decal('smile', [[cx2 - w, top], [cx2, top - hh * .38], [cx2 + w, top], [cx2 + w * .5, top - hh], [cx2 - w * .5, top - hh]], [[0, 4, 1], [1, 4, 3], [1, 3, 2]]);
    }
    variants[name] = { sourceTriangles: run.sourceTriangles, error: run.error, dropped: run.dropped, caps, ...(name === 'plain' ? { holes: plain.holes } : {}), parts: Object.values(parts) };
  }
  const eyes = variants.bag.parts.filter(p => p.id.startsWith('eye'));
  const headPart = variants.bag.parts.find(p => p.id === 'head');
  const eyeY = eyes.reduce((s, p) => s + p.vertices.reduce((a, v) => a + v[1], 0) / p.vertices.length, 0) / 2;
  const faceZ = Math.max(...eyes.flatMap(p => p.vertices.map(v => v[2]))) - DECAL_GAP;
  const halfHead = Math.max(...headPart.vertices.filter(v => Math.abs(v[1] - eyeY) < .03).map(v => Math.abs(v[0])));
  const torsoX = variants.bag.parts.filter(p => p.bone === 'torso').flatMap(p => p.vertices.filter(v => v[1] > .5 && v[1] < .62).map(v => Math.abs(v[0])));
  const LANDMARKS_H = {
    sole: 0, ankle: L.ankle, knee: L.knee, hip: L.hip, shoulder: L.shoulder, elbow: L.elbow, neckBase: L.neck, chin: L.chin, top: 1,
    shoulderX: RIG_H.armL.at[0], legX: RIG_H.legL.at[0], halfShoulders: r4(Math.max(...torsoX)), eyeY: r4(eyeY), faceZ: r4(faceZ), halfHead: r4(halfHead)
  };
  return {
    SOURCE: { model, file: cfg.file, sha256: g.sha256, bytes: g.bytes, triangles: F, vertices: g.P.length / 3, weldedVertices: NV, texture: `${g.img.width}x${g.img.height}`,
      heightUnits: r4(h), target: cfg.target, decalGap: DECAL_GAP, simplifier: `meshoptimizer ${JSON.parse(fs.readFileSync(path.join(root, 'node_modules/meshoptimizer/package.json'), 'utf8')).version}` },
    CLASSES, RIG_H, LANDMARKS_H, VARIANTS: variants
  };
}

export function meshyDataModule(data) {
  const j = v => JSON.stringify(v);
  return [
    `// Generado por tools/meshy-import.mjs desde ${data.SOURCE.file}. No editar.`,
    `export const SOURCE = Object.freeze(${j(data.SOURCE)});`,
    `export const CLASSES = Object.freeze(${j(data.CLASSES)});`,
    `export const RIG_H = Object.freeze(${j(data.RIG_H)});`,
    `export const LANDMARKS_H = Object.freeze(${j(data.LANDMARKS_H)});`,
    `export const VARIANTS = Object.freeze(${j(data.VARIANTS)});`,
    ''
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mi = process.argv.indexOf('--model'), only = mi > 0 ? [process.argv[mi + 1]] : Object.keys(MODELS);
  let stale = false;
  for (const model of only) {
    const cfg = MODELS[model], out = path.join(root, cfg.out), name = path.basename(cfg.out);
    if (!fs.existsSync(path.join(root, cfg.file))) { console.log(`${model}: sin el GLB (${cfg.file}); el módulo generado se conserva.`); continue; }
    // A module retouched in Blender (3d-assets procedural-web) is the source now: keep it unless --force.
    if (fs.existsSync(out) && /"edited":\{/.test(fs.readFileSync(out, 'utf8')) && !process.argv.includes('--force')) { console.log(`${name}: editado en Blender; se conserva (--force para regenerarlo desde el GLB).`); continue; }
    const data = await importMeshy(model), text = meshyDataModule(data);
    const pi = process.argv.indexOf('--preview');
    if (pi > 0) fs.writeFileSync(path.join(process.argv[pi + 1], `meshy-${model}.json`), JSON.stringify(data));
    for (const [v, d] of Object.entries(data.VARIANTS)) console.log(model, v, 'error', d.error, 'parts', d.parts.map(p => `${p.id}:${p.faces.length}`).join(' '), 'total', d.parts.reduce((t, p) => t + p.faces.length, 0));
    if (process.argv.includes('--check')) {
      const same = fs.existsSync(out) && fs.readFileSync(out, 'utf8') === text;
      console.log(same ? `${name} al día` : `${name} desactualizado: node tools/meshy-import.mjs --model ${model}`);
      stale ||= !same;
      continue;
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    console.log(out);
  }
  process.exit(stale ? 1 : 0);
}
