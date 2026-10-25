/**
 * Papercraft people (reference sheet 07 and the "Persona y silla" close-up).
 * `addPaperPerson` replaces `addPerson` from campus-people.js with the same
 * spec, bone names, bone hierarchy and return value, so POSES, applyPose,
 * reach, placePerson and campus-actors keep working. Everything is drawn in
 * bind pose as flat facets (shaded by facet normal so every fold reads); poses
 * on the catalog pieces are applied in `meta.afterFinish`.
 *
 * Construction (sheet 07): rounded faceted head (octagonal rings, soft chin),
 * a hair dome of angular paper locks with an irregular fringe, a chamfered
 * vest prism with a white V and collar points, short puffed sleeves with a fold
 * line, wedge hands with a thumb, navy trousers or a pleated navy skirt with
 * white socks, wedge shoes. Budget: 280 triangles (students), 300 (teachers).
 */
import { PAPER as C, SCALE, newMeta, paperKit, shadeTone } from './kit.js';
import { hash, pick, lerp } from '../campus-kit.js';
import { POSES, applyPose, blendBody } from '../campus-people.js';

/**
 * Fractions of the total height H. head: chin to the top of the hair (the skull,
 * chin to crown, is about 0.86 of it: 0.21 primaria, 0.24 preprimaria); neck:
 * shoulder line to chin; sw: half shoulder width.
 */
const PROPORTION = {
  pre: { head: .28, neck: .016, torso: .26, thigh: .2, shin: .19, sw: .118 },
  prim: { head: .245, neck: .018, torso: .27, thigh: .215, shin: .205, sw: .112 },
  bas: { head: .235, neck: .02, torso: .275, thigh: .225, shin: .21, sw: .11 },
  bach: { head: .228, neck: .02, torso: .28, thigh: .228, shin: .212, sw: .11 },
  adult: { head: .205, neck: .022, torso: .29, thigh: .235, shin: .22, sw: .115 }
};
const SHOE = .035;

const LIGHT = (() => { const v = [-.3, .55, .75], l = Math.hypot(...v); return v.map(c => c / l); })();
const toneCache = new Map();
/** Facet tint by normal: the lit side of each fold slightly lighter, the far side slightly darker. */
function tone(hex, n) {
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  const k = Math.round((.9 + .17 * Math.max(-.6, Math.min(1, (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / l))) * 40) / 40;
  const key = hex + k;
  let out = toneCache.get(key);
  if (!out) { out = shadeTone(hex, Math.max(.8, Math.min(1.1, k))); toneCache.set(key, out); }
  return out;
}
const sub = (a, c) => [a[0] - c[0], a[1] - c[1], a[2] - c[2]];
const add = (a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const mix = (a, c, u) => [lerp(a[0], c[0], u), lerp(a[1], c[1], u), lerp(a[2], c[2], u)];
const crossV = (u, w) => [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
const mean = pts => { const o = [0, 0, 0]; for (const q of pts) { o[0] += q[0]; o[1] += q[1]; o[2] += q[2]; } return o.map(v => v / pts.length); };

/** One flat facet facing away from `ctr`, tinted by its own normal. */
function facet(b, a, c, d, hex, ctr) {
  let n = crossV(sub(c, a), sub(d, a));
  const m = mean([a, c, d]), out = sub(m, ctr);
  if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) n = n.map(v => -v);
  b.face(a, c, d, tone(hex, n), out);
}
/** Quad a-c-d-e as two facets. */
const facet4 = (b, a, c, d, e, hex, ctr) => { facet(b, a, c, d, hex, ctr); facet(b, a, d, e, hex, ctr); };
/** Band between two rings with the same point count; `skip(j)` leaves a panel out (hidden under hair). */
function band(b, r0, r1, hex, ctr, skip) {
  const n = r0.length;
  for (let j = 0; j < n; j++) {
    if (skip && skip(j)) continue;
    const k = (j + 1) % n, col = typeof hex === 'function' ? hex(j) : hex;
    facet(b, r0[j], r0[k], r1[k], col, ctr);
    facet(b, r0[j], r1[k], r1[j], col, ctr);
  }
}
/**
 * Folded strip tube with a rectangular section from y0 to y1 (open ends).
 * Panels: 0 back (-z), 1 +x, 2 front (+z), 3 -x. `omit` (1 / -1) drops the
 * side toward ±X (the side of an arm that faces the body).
 */
function tube(b, y0, y1, a0, d0, a1, d1, hex, o = {}) {
  const z0 = o.z0 || 0, z1 = o.z1 || 0, x0 = o.x0 || 0, x1 = o.x1 || 0;
  const r0 = [[x0 - a0, y0, z0 - d0], [x0 + a0, y0, z0 - d0], [x0 + a0, y0, z0 + d0], [x0 - a0, y0, z0 + d0]];
  const r1 = [[x1 - a1, y1, z1 - d1], [x1 + a1, y1, z1 - d1], [x1 + a1, y1, z1 + d1], [x1 - a1, y1, z1 + d1]];
  const ctr = mean([...r0, ...r1]);
  band(b, r0, r1, hex, ctr, j => (o.omit === 1 && j === 1) || (o.omit === -1 && j === 3));
  return { r0, r1, ctr };
}
/** z on the plane through a, c, d at (x, y). */
function planeZ(a, c, d, x, y) {
  const n = crossV(sub(c, a), sub(d, a));
  return a[2] - (n[0] * (x - a[0]) + n[1] * (y - a[1])) / n[2];
}
/** Bipyramid lock (pigtail, ponytail, bun): ring of `n` points around `ctr`, apexes `top` and `bottom`. */
function bundle(b, top, bottom, ctr, r, n, hex, seed) {
  const ax = sub(bottom, top), l = Math.hypot(...ax), u = mul(ax, 1 / l);
  const ref = Math.abs(u[0]) < .9 ? [1, 0, 0] : [0, 0, 1];
  const e1 = crossV(u, ref), v1 = mul(e1, 1 / Math.hypot(...e1)), v2 = crossV(u, v1);
  const ring = Array.from({ length: n }, (_, i) => {
    const a = (i + .25) / n * Math.PI * 2, k = r * (.85 + hash(seed, 'bd', i) * .3);
    return add(ctr, add(mul(v1, Math.cos(a) * k), mul(v2, Math.sin(a) * k)));
  });
  const mid = mean(ring);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    facet(b, ring[i], ring[j], top, shadeTone(hex, 1.1), mid);
    facet(b, ring[i], ring[j], bottom, i % 2 ? shadeTone(hex, .92) : hex, mid);
  }
}

/** Head ring columns [x, z] (unit): flat front panel, chamfers, flat sides, back. */
const COLS = [[-.52, 1], [.52, 1], [.97, .5], [.97, -.46], [.5, -1], [-.5, -1], [-.97, -.46], [-.97, .5]];
/** Torso octagon columns: a chamfered prism like the folded vest of sheet 07. */
const OCT = [[-.6, 1], [.6, 1], [1, .45], [1, -.45], [.6, -1], [-.6, -1], [-1, -.45], [-1, .45]];

export function addPaperPerson(b, spec) {
  const rig = b.rig, id = spec.id, teacher = spec.role === 'teacher';
  const level = teacher ? 'adult' : (spec.level || 'prim');
  const H = SCALE.person[level] || SCALE.person.prim, P = PROPORTION[level] || PROPORTION.prim;
  const seed = spec.seed ?? id, p = paperKit(b), pre = level === 'pre';

  const torsoH = P.torso * H, SW = P.sw * H, TD = SW * .56;
  const thigh = P.thigh * H, shin = P.shin * H, shoeH = SHOE * H;
  const hipY = thigh + shin + shoeH;
  const upper = (pre ? .13 : .14) * H, fore = (pre ? .105 : .118) * H;
  const h = P.head * H / 1.16, head = h;

  // Sheet 07: dark violet hair dominates; near-black and brown stay as occasional variants.
  const skin = pick(C.skin, seed, 'skin'), hairHex = pick([C.hair[1], C.hair[1], C.hair[0], C.hair[1], C.hair[1], C.hair[0], C.hair[2]], seed, 'hair');
  const girl = hash(seed, 'girl') < .5;
  let style = spec.hair || (teacher ? pick(['short', 'long', 'bun'], seed, 'style')
    : pre ? pick(['pig', 'short', 'pony', 'pig'], seed, 'style')
      : girl ? pick(['long', 'pony', 'long', 'short'], seed, 'style') : 'short');
  style = { braids: 'pig', bob: 'long', curly: 'short', spiky: 'short' }[style] || style;
  const skirt = spec.skirt ?? (!teacher && hash(seed, 'skirt') < .42);
  const vest = spec.sweater || C.uniform, shirt = teacher ? C.teacher : C.shirt;
  const pants = teacher ? C.teacherPants : C.navy;
  const capMode = spec.cap ?? (pre && !teacher && hash(seed, 'cap') < .4 ? 'worn' : null);
  const capped = capMode === 'worn' || capMode === true;
  const bag = !teacher && !spec.seated && spec.backpack !== false ? (typeof spec.backpack === 'string' ? spec.backpack : C.level[level]) : null;

  // ---- skeleton: same names, parents and joint meaning as campus-people.addPerson
  const root = rig.add(id, spec.parent || rig.root, spec.x || 0, spec.y || 0, spec.z || 0);
  root.rotation.y = spec.ry || 0;
  root.userData.rest.quaternion.copy(root.quaternion);
  const aw = .037 * H; // arm half thickness
  const shoulderX = SW + aw * .9 + .004 * H;
  const hips = rig.add(id + '.hips', root, 0, hipY, 0);
  const torso = rig.add(id + '.torso', hips, 0, 0, 0);
  const neck = rig.add(id + '.head', torso, 0, torsoH, 0);
  const armL = rig.add(id + '.armL', torso, shoulderX, torsoH * .92, 0);
  const armR = rig.add(id + '.armR', torso, -shoulderX, torsoH * .92, 0);
  const foreL = rig.add(id + '.foreL', armL, 0, -upper, 0);
  const foreR = rig.add(id + '.foreR', armR, 0, -upper, 0);
  const legX = SW * (skirt ? .42 : .5);
  const legL = rig.add(id + '.legL', hips, legX, 0, 0);
  const legR = rig.add(id + '.legR', hips, -legX, 0, 0);
  const shinL = rig.add(id + '.shinL', legL, 0, -thigh, 0);
  const shinR = rig.add(id + '.shinR', legR, 0, -thigh, 0);

  // ---- torso: chamfered vest prism, sloping shoulders, white shirt V and collar points
  b.bone(torso);
  const oct = (y, w, d, drop = 0) => OCT.map(([fx, fz]) => [fx * w, y - (Math.abs(fx) > .9 ? drop : 0), fz * d]);
  const hem = oct(-.03 * H, SW * (teacher ? .94 : .9), TD * 1.02), top = oct(torsoH, SW, TD * .94, .035 * H);
  const tctr = [0, torsoH * .5, 0];
  band(b, hem, top, vest, tctr);
  // shoulders: the shirt shows above the vest (white around the collar, as on sheet 07)
  facet4(b, top[0], top[1], top[4], top[5], shadeTone(shirt, .97), tctr);
  facet4(b, top[1], top[2], top[3], top[4], shirt, tctr);
  facet4(b, top[5], top[6], top[7], top[0], shirt, tctr);
  const lift = Math.max(.004, .005 * H);
  const fz = (x, y) => planeZ(hem[0], hem[1], top[1], x, y) + lift;
  const nw = .036 * H, vy = torsoH * (teacher ? .6 : .66), ny = torsoH * .995;
  b.face([-nw, ny, fz(-nw, ny)], [nw, ny, fz(nw, ny)], [0, vy, fz(0, vy)], shirt, [0, 0, 1]);
  for (const sx of [-1, 1]) { // shirt collar points, tilted off the V
    const A = [sx * nw * 1.25, torsoH, fz(sx * nw, ny) + lift * .6], B = [sx * .004 * H, torsoH * .955, fz(0, ny) + lift * 1.4];
    const Cc = [sx * nw * .62, torsoH * .84, fz(sx * nw * .6, torsoH * .84) + lift * 2.4];
    b.face(A, B, Cc, shadeTone(shirt, .95), [0, .3, 1]);
  }
  if (teacher) { // turquoise tie
    const z = y => fz(0, y) + lift * 1.2, tw0 = .012 * H;
    const k = [[0, torsoH * .93], [tw0, torsoH * .86], [0, torsoH * .52], [-tw0, torsoH * .86]].map(([x, y]) => [x, y, z(y)]);
    b.face(k[0], k[1], k[2], C.turquoise, [0, 0, 1]).face(k[0], k[2], k[3], shadeTone(C.turquoise, .9), [0, 0, 1]);
  }
  if (bag) {
    const bz = -TD - .004 * H, bh = torsoH * .64, y0b = torsoH * .14, bd = .05 * H;
    const r0 = [[-SW * .7, y0b, bz - bd], [SW * .7, y0b, bz - bd], [SW * .7, y0b, bz], [-SW * .7, y0b, bz]];
    const r1 = [[-SW * .62, y0b + bh, bz - bd * .8], [SW * .62, y0b + bh, bz - bd * .8], [SW * .62, y0b + bh, bz], [-SW * .62, y0b + bh, bz]];
    const bc = mean([...r0, ...r1]);
    band(b, r0, r1, bag, bc, j => j === 2); // the side against the back stays open
    if (!pre) facet4(b, r1[0], r1[1], r1[2], r1[3], shadeTone(bag, 1.08), bc);
    for (const sx of [-1, 1]) { // straps over the chest
      const x = sx * .05 * H, w = .009 * H, ya = torsoH * .985, yb = torsoH * .42, z = lift * 1.7;
      const q = [[x - w, ya, fz(x - w, ya) + z], [x + w, ya, fz(x + w, ya) + z], [x + w, yb, fz(x + w, yb) + z], [x - w, yb, fz(x - w, yb) + z]];
      b.face(q[0], q[1], q[2], shadeTone(bag, .82), [0, 0, 1]).face(q[0], q[2], q[3], shadeTone(bag, .82), [0, 0, 1]);
    }
  }

  // ---- trousers seat / pleated skirt
  if (skirt) {
    // Two halves, each on its thigh bone: seated, the skirt lies over the lap like sheet 13.
    const len = (pre ? .15 : .165) * H, rt = SW * .88, dt = TD * .96, rb = SW * 1.16, db = TD * 1.35;
    for (const [leg, sx] of [[legL, 1], [legR, -1]]) {
      b.bone(leg);
      const ang = [0, .25, .5, .75, 1].map(u => u * Math.PI);
      const topR = ang.map(a => [sx * Math.sin(a) * rt - sx * legX, .012 * H, Math.cos(a) * dt]);
      const botR = ang.map((a, i) => { const k = i % 2 ? .86 : 1; return [sx * Math.sin(a) * rb * k - sx * legX, -len, Math.cos(a) * db * k]; });
      const ctr = [-sx * legX, -len * .4, 0];
      for (let i = 0; i < 4; i++) {
        const c = i % 2 ? shadeTone(C.navy, .9) : C.navy;
        facet(b, topR[i], topR[i + 1], botR[i + 1], c, ctr);
        facet(b, topR[i], botR[i + 1], botR[i], c, ctr);
      }
    }
  } else {
    b.bone(hips);
    tube(b, -.075 * H, -.004 * H, SW * .8, TD * .84, SW * .88, TD * .94, pants); // flared: never parallel to the vest
  }

  // ---- head
  b.bone(neck);
  const y0 = P.neck * H, W = .5 * h, D = .44 * h;
  const ring = (y, sx, sz, dz = 0) => COLS.map(([fx, f]) => [fx * W * sx, y, f * D * sz + dz]);
  const yR1 = y0 + .3 * h, yR2 = y0 + .68 * h;
  const R1 = ring(yR1, .88, .9, .03 * h), R2 = ring(yR2, 1, 1);
  const hctr = [0, y0 + .45 * h, -.02 * h];
  tube(b, -.02 * H, y0 + .08 * h, .2 * W, .22 * D, .19 * W, .2 * D, shadeTone(skin, .9), { z0: -.01 * h, z1: -.02 * h }); // neck
  // chin and jaw: two chin points fanned into the jaw ring (soft, not square)
  const cz = .72 * D + .03 * h, chR = [.25 * W, y0, cz], chL = [-.25 * W, y0, cz];
  facet4(b, chL, chR, R1[1], R1[0], skin, hctr);
  facet(b, chR, R1[1], R1[2], skin, hctr); facet(b, chR, R1[2], R1[3], skin, hctr); facet(b, chR, R1[3], R1[4], skin, hctr);
  facet(b, chL, R1[0], R1[7], skin, hctr); facet(b, chL, R1[7], R1[6], skin, hctr); facet(b, chL, R1[6], R1[5], skin, hctr);
  // Skin stops at the hairline ring HL; the hair starts on the same edge, so skin and hair never overlap.
  const skinAt = (k, y) => y >= yR2 ? [R2[k][0], y, R2[k][2]] : mix(R1[k], R2[k], Math.max(0, (y - yR1) / (yR2 - yR1)));
  const HL = [.68, .68, .5, .34, .3, .3, .34, .5].map((v, k) => skinAt(k, y0 + v * h));
  const area = (a, c, d) => Math.hypot(...crossV(sub(c, a), sub(d, a)));
  for (let k = 0; k < 8; k++) {
    const j = (k + 1) % 8;
    if (area(R1[k], R1[j], HL[j]) > 1e-9) facet(b, R1[k], R1[j], HL[j], skin, hctr);
    if (area(R1[k], HL[j], HL[k]) > 1e-9) facet(b, R1[k], HL[j], HL[k], skin, hctr);
  }
  // face on the front panels (planar trapezoids)
  const faceZ = (x, y) => (y >= yR1 ? planeZ(R1[0], R1[1], R2[1], x, y) : planeZ(chL, chR, R1[1], x, y)) + Math.max(.0035, .004 * H);
  const ey = y0 + .45 * h, ew = h * (pre ? .1 : .09), eh = h * (pre ? .14 : .13), ex = h * .16;
  if (!spec.headset) {
    for (const sx of [-1, 1]) { // oval eyes (six points)
      const pts = Array.from({ length: 6 }, (_, i) => { const an = (i + .5) * Math.PI / 3, x = sx * ex + Math.cos(an) * ew / 2, y = ey + Math.sin(an) * eh / 2; return [x, y, faceZ(x, y)]; });
      for (let i = 1; i < 5; i++) b.face(pts[0], pts[i], pts[i + 1], C.ink, [0, 0, 1]);
    }
  }
  { // smile: a thin crescent
    const my = y0 + h * .2, mw = h * .1, dp = h * .05, th = h * .028;
    const Pp = [-1, -.35, .35, 1].map((u, i) => [u * mw, my + (i === 0 || i === 3 ? .02 * h : -dp * .55), 0]);
    const Q = [-1, -.35, .35, 1].map((u, i) => [u * mw, my + (i === 0 || i === 3 ? .02 * h : -dp * .55 - th), 0]);
    const at = q => [q[0], q[1], faceZ(q[0], q[1])];
    const [p0, p1, p2, p3] = Pp.map(at), [, q1, q2] = Q.map(at);
    b.face(p0, q1, p1, C.ink, [0, 0, 1]).face(p1, q1, q2, C.ink, [0, 0, 1]).face(p1, q2, p2, C.ink, [0, 0, 1]).face(p2, q2, p3, C.ink, [0, 0, 1]);
  }

  // ---- hair: a dome of folded locks hugging the skull at its hairline, wider above, irregular points
  const outDir = k => { const [fx, f] = COLS[k], l = Math.hypot(fx * W, f * D); return [fx * W / l, 0, f * D / l]; };
  const hug = (k, y, g) => add(skinAt(k, y), mul(outDir(k), g));
  const hairTone = j => shadeTone(hairHex, [1, .94, 1.04, .97][j % 4]);
  const tip = (A, B, ty, kick, hex, fwd = 0) => {
    const m = mix(A, B, .5), r = Math.hypot(m[0], m[2]) || 1;
    facet(b, A, B, [m[0] + m[0] / r * kick, ty, m[2] + m[2] / r * kick + fwd], hex, hctr);
  };
  const long = style === 'long';
  if (!capped) {
    const H0 = HL;
    // Widest ring at the temples (hair fuller than the face), then a rounded crown of four facets.
    const H1 = COLS.map(([fx, f], k) => {
      const j = 1 + (hash(seed, 'hr', k) - .5) * .12, front = f > .9;
      return [fx * W * (front ? 1.02 : 1.15) * j, y0 + ((front ? .8 : .74) + (hash(seed, 'hy', k) - .5) * .08) * h, front ? D * 1.1 : f * D * (f < 0 ? 1.28 : 1.14) * j - .02 * h];
    });
    const U = [[0, .72], [.66, -.05], [0, -.8], [-.66, -.05]].map(([fx, f], j) =>
      [fx * W * (1 + (hash(seed, 'ux', j) - .5) * .2) + (hash(seed, 'ax') - .5) * .1 * h, y0 + (1.06 + hash(seed, 'uy', j) * .1) * h, f * D - .06 * h]);
    band(b, H0, H1, hairTone, hctr);
    const lit = [1.14, 1.06, 1.2, 1.1];
    for (let j = 0; j < 4; j++) { // each crown point gathers three ring points
      const a = H1[(2 * j + 7) % 8], c = H1[2 * j], d = H1[2 * j + 1];
      facet(b, a, c, U[j], shadeTone(hairHex, lit[j]), hctr);
      facet(b, c, d, U[j], shadeTone(hairHex, lit[(j + 1) % 4]), hctr);
      facet(b, d, U[(j + 1) % 4], U[j], shadeTone(hairHex, lit[(j + 2) % 4] * .97), hctr);
    }
    facet4(b, U[0], U[1], U[2], U[3], shadeTone(hairHex, 1.22), hctr);
    if (!spec.headset) { // fringe: three points over the forehead, above the eyes, tipping forward
      const E = [0, 1, 2, 3].map(i => mix(H0[0], H0[1], i / 3));
      const sw = (hash(seed, 'sweep') < .5 ? -1 : 1) * .07 * h; // locks swept to one side
      [.57, .6, .58].forEach((v, i) => {
        const A = E[i], B = E[i + 1], m = mix(A, B, .5);
        facet(b, A, B, [m[0] + sw, y0 + v * h, m[2] + .035 * h], shadeTone(hairHex, 1.08 - i * .04), hctr);
      });
    }
    // tufts: angular locks standing out of the silhouette at the sides and back
    for (const [a, c, dy] of [[2, 3, -.1], [6, 7, -.08], [4, 5, -.14]]) {
      const m = mix(H1[a], H1[c], .5), r = Math.hypot(m[0], m[2]) || 1;
      facet(b, H1[a], H1[c], [m[0] + m[0] / r * .13 * h, m[1] + dy * h, m[2] + m[2] / r * .13 * h], shadeTone(hairHex, .96), hctr);
    }
    for (const [a, c] of [[1, 2], [7, 0]]) tip(H0[a], H0[c], y0 + .42 * h, .045 * h, hairTone(a)); // temples
    for (const [a, c] of [[2, 3], [6, 7]]) tip(H0[a], H0[c], y0 + .28 * h, .035 * h, shadeTone(hairHex, .92)); // sideburns
    if (!long) { // nape points
      tip(H0[3], H0[4], y0 + .16 * h, .035 * h, hairHex); tip(H0[5], H0[6], y0 + .16 * h, .035 * h, hairHex);
      const Mb = mix(H0[4], H0[5], .5);
      tip(H0[4], Mb, y0 + .1 * h, .04 * h, shadeTone(hairHex, .95)); tip(Mb, H0[5], y0 + .12 * h, .04 * h, hairHex);
    }
  } else {
    // preprimaria cap: hair band under the rim at the sides and back, faceted yellow crown, visor
    const CL = [.84, .84, .76, .68, .64, .64, .68, .76].map(v => y0 + v * h);
    const H0 = HL, Hi = CL.map((y, k) => hug(k, y + .03 * h, .03 * h));
    band(b, H0, Hi, hairTone, hctr);
    const C0 = CL.map((y, k) => hug(k, y, .06 * h));
    const C1 = [[0, .7], [.7, 0], [0, -.7], [-.7, 0]].map(([fx, f]) => [fx * W * 1.1, y0 + 1.04 * h, f * D * 1.1 - .02 * h]);
    const capTop = [0, y0 + 1.14 * h, -.02 * h], cap = C.yellow, cc = [0, y0 + .7 * h, 0];
    for (let j = 0; j < 4; j++) {
      const a = C0[(2 * j + 7) % 8], c = C0[2 * j], d = C0[2 * j + 1];
      facet(b, a, c, C1[j], shadeTone(cap, 1.04), cc);
      facet(b, c, d, C1[j], cap, cc);
      facet(b, d, C1[(j + 1) % 4], C1[j], shadeTone(cap, .95), cc);
    }
    for (let j = 0; j < 4; j++) facet(b, C1[j], C1[(j + 1) % 4], capTop, shadeTone(cap, j % 2 ? 1.08 : 1.14), cc);
    // visor: one card at the rim, both faces
    const vl = C0[0], vr = C0[1], vo = .26 * h;
    const fl = [vl[0] * 1.3, vl[1] - .012 * h, vl[2] + vo], fr = [vr[0] * 1.3, vr[1] - .012 * h, vr[2] + vo];
    b.face(vl, vr, fr, shadeTone(cap, 1.06), [0, 1, .3]).face(vl, fr, fl, shadeTone(cap, 1.06), [0, 1, .3]);
    b.face(vl, vr, fr, C.yellowDark, [0, -1, -.3]).face(vl, fr, fl, C.yellowDark, [0, -1, -.3]);
    if (!spec.headset) { // short fringe under the visor
      const E = [0, .5, 1].map(u => mix(H0[0], H0[1], u));
      tip(E[0], E[1], y0 + .59 * h, 0, hairHex, .035 * h); tip(E[1], E[2], y0 + .61 * h, 0, shadeTone(hairHex, 1.06), .035 * h);
    }
    tip(H0[4], H0[5], y0 + .12 * h, .04 * h, hairHex);
  }
  if (long) { // melena: a sheet folded around the back of the head, down onto the shoulders
    const tyh = y0 + .62 * h, Lf = [-.95 * W, tyh, .42 * D], Lb = [-.82 * W, tyh, -.85 * D], Rb = [.82 * W, tyh, -.85 * D], Rf = [.95 * W, tyh, .42 * D];
    const Lf2 = [-1.45 * W, y0 - .36 * h, .36 * D], Lb2 = [-.95 * W, y0 - .62 * h, -1.02 * D], Rb2 = [.95 * W, y0 - .62 * h, -1.02 * D], Rf2 = [1.45 * W, y0 - .36 * h, .36 * D];
    const M = [(hash(seed, 'lm') - .5) * .2 * W, y0 - .78 * h, -1.08 * D], inner = shadeTone(hairHex, .78);
    for (const [a, c, d, e, sx] of [[Lf, Lb, Lb2, Lf2, -1], [Rf, Rb, Rb2, Rf2, 1]]) {
      b.face(a, c, d, tone(hairHex, [sx, 0, -.2]), [sx, 0, -.15]).face(a, d, e, tone(hairHex, [sx, 0, 0]), [sx, 0, -.15]);
      b.face(a, c, d, inner, [-sx, 0, .15]).face(a, d, e, inner, [-sx, 0, .15]);
    }
    const bc = [0, tyh, 0];
    facet(b, Lb, Rb, M, shadeTone(hairHex, .96), bc); facet(b, Rb, Rb2, M, hairHex, bc); facet(b, Lb, M, Lb2, shadeTone(hairHex, .92), bc);
  }
  if (style === 'pig') for (const sx of [-1, 1]) {
    bundle(b, [sx * .85 * W, y0 + .55 * h, -.3 * D], [sx * 1.32 * W, y0 + .02 * h, -.32 * D], [sx * 1.2 * W, y0 + .36 * h, -.3 * D], .2 * h, pre ? 3 : 4, hairHex, seed + sx);
  } else if (style === 'pony') {
    bundle(b, [0, y0 + .62 * h, -.85 * D], [0, y0 - .22 * h, -1.25 * D], [0, y0 + .26 * h, -1.25 * D], .13 * h, 4, hairHex, seed);
  } else if (style === 'bun') {
    bundle(b, [0, y0 + 1.27 * h, -.55 * D], [0, y0 + .9 * h, -.6 * D], [0, y0 + 1.08 * h, -.62 * D], .16 * h, 4, hairHex, seed);
  }
  if (spec.headset) { // goggles: wider than the face, dark lens, side straps
    const vy = ey, vz = faceZ(0, vy) + .035 * h, vh = h * .13, vw = h * .42;
    const v0 = [[-vw, vy - vh, vz - .07 * h], [vw, vy - vh, vz - .07 * h], [vw, vy - vh, vz + .05 * h], [-vw, vy - vh, vz + .05 * h]];
    band(b, v0, v0.map(q => [q[0], vy + vh, q[2]]), C.white, [0, vy, vz - .01 * h]);
    const lz = vz + .05 * h + .004, lw = vw * .82, lh = vh * .66;
    b.face([-lw, vy - lh, lz], [lw, vy - lh, lz], [lw, vy + lh, lz], C.dark, [0, 0, 1]).face([-lw, vy - lh, lz], [lw, vy + lh, lz], [-lw, vy + lh, lz], C.dark, [0, 0, 1]);
    for (const sx of [-1, 1]) {
      const f0 = [sx * vw, vy + vh * .5, vz - .07 * h], f1 = [sx * vw, vy - vh * .5, vz - .07 * h], r0 = [sx * W * 1.2, vy + vh * .5, -D * .4], r1 = [sx * W * 1.2, vy - vh * .5, -D * .4];
      b.face(f0, f1, r1, C.dark, [sx, 0, 0]).face(f0, r1, r0, C.dark, [sx, 0, 0]);
    }
  }

  // ---- arms: puffed short sleeve with a fold line, bare arm, forearm, wedge hand with thumb
  for (const [arm, forearm, sx] of [[armL, foreL, 1], [armR, foreR, -1]]) {
    b.bone(arm);
    const sy1 = teacher ? -upper - .004 * H : -upper * .5, a1 = aw * (teacher ? .9 : 1.22), d1 = aw * (teacher ? .9 : 1.12);
    // sleeve: one sheet folded over the shoulder (top ridge) flaring to the hem; closed on top
    const tx = -sx * aw * .25, ty = .02 * H, tdz = aw * .9;
    const T0 = [tx, ty, -tdz], T1 = [tx, ty, tdz];
    const r = [[-a1, sy1, -d1], [a1, sy1, -d1], [a1, sy1, d1], [-a1, sy1, d1]];
    const sc = [0, (ty + sy1) / 2, 0];
    facet(b, T0, r[0], r[1], shadeTone(shirt, .97), sc); facet(b, T1, r[2], r[3], shirt, sc);
    facet4(b, T0, r[1], r[2], T1, shirt, sc); facet4(b, T1, r[3], r[0], T0, shirt, sc);
    { // fold line across the outer face of the sleeve
      const o0 = sx > 0 ? r[1] : r[0], o1 = sx > 0 ? r[2] : r[3], u = teacher ? .55 : .78;
      const A = mix(T0, o0, u), B = mix(T1, o1, u);
      let n = crossV(sub(T1, T0), sub(o0, T0)); if (n[0] * sx < 0) n = mul(n, -1);
      p.crease(A, B, n, sub(o0, T0), .006 * H, shadeTone(shirt, .82));
    }
    if (!teacher) tube(b, -upper * .42, -upper - .006 * H, aw * .8, aw * .8, aw * .74, aw * .76, skin, { omit: -sx });
    b.bone(forearm);
    const wz = fore * .13; // the forearm leans forward a little: a relaxed elbow in rest pose
    const f = tube(b, .012 * H, -fore, aw * (teacher ? .86 : .74), aw * (teacher ? .86 : .74), aw * .6, aw * .62, teacher ? shirt : skin, { omit: -sx, z1: wz });
    // hand: wrist fanned into a fingertip edge (mitten wedge), thumb forward
    let w = f.r1;
    if (teacher) { // cuff, then the bare wrist
      const yw = -fore - .004 * H;
      w = [[-aw * .55, yw, wz - aw * .58], [aw * .55, yw, wz - aw * .58], [aw * .55, yw, wz + aw * .58], [-aw * .55, yw, wz + aw * .58]];
      tube(b, -fore + .016 * H, -fore - .002 * H, aw * .64, aw * .66, aw * .64, aw * .66, shadeTone(shirt, .9), { z0: wz * .9, z1: wz });
    }
    // hand: a small mitten block, wider front to back than across, fingers a little forward; thumb in front
    const hy = -fore - .055 * H, kk = [[-aw * .6, hy, wz - aw * .62], [aw * .6, hy, wz - aw * .62], [aw * .6, hy + .006 * H, wz + aw * 1.0], [-aw * .6, hy + .006 * H, wz + aw * 1.0]];
    const hc = mean([...w, ...kk]);
    band(b, w, kk, skin, hc);
    facet4(b, kk[0], kk[1], kk[2], kk[3], shadeTone(skin, .94), hc);
    if (!pre) b.face([-sx * aw * .5, -fore - .012 * H, wz + aw * .55], [-sx * aw * .55, -fore - .042 * H, wz + aw * .7], [-sx * aw * .15, -fore - .04 * H, wz + aw * 1.25], shadeTone(skin, .93), [-sx * .6, 0, .8]);
    if (teacher && spec.notebook && sx === -1) p.card(-.01 * H, -fore - .045 * H, wz + .055 * H, .11 * H, .135 * H, .014 * H, C.orange, { thin: 'z' });
  }

  // ---- legs: trousers, or skin and white socks under the skirt; wedge shoes with a point
  const shoe = spec.shoe || (teacher ? C.dark : pick([C.dark, C.dark, C.leg], seed, 'shoe'));
  for (const [leg, lower] of [[legL, shinL], [legR, shinR]]) {
    b.bone(leg);
    if (skirt) tube(b, .01 * H, -thigh, .042 * H, .044 * H, .032 * H, .04 * H, skin); // tapered: never parallel to the vest when seated
    else tube(b, .01 * H, -thigh, .052 * H, .055 * H, .045 * H, .049 * H, pants);
    b.bone(lower);
    if (skirt) {
      const ys = -shin * .55;
      tube(b, .012 * H, ys, .036 * H, .038 * H, .033 * H, .036 * H, skin);
      tube(b, ys + .004 * H, -shin, .036 * H, .039 * H, .034 * H, .037 * H, C.shirt);
    } else tube(b, .012 * H, -shin, .044 * H, .047 * H, .04 * H, .044 * H, pants);
    const yb = -shin - shoeH, yt = -shin + .018 * H, sc = [0, -shin - shoeH * .4, .02 * H];
    const hL = [-.04 * H, yb, -.04 * H], hR = [.04 * H, yb, -.04 * H], tL = [-.03 * H, yb, .09 * H], tR = [.03 * H, yb, .09 * H];
    const kL = [-.039 * H, yt, -.032 * H], kR = [.039 * H, yt, -.032 * H];
    facet4(b, hL, hR, kR, kL, shadeTone(shoe, .9), sc); facet4(b, tL, tR, kR, kL, shoe, sc);
    facet(b, hR, tR, kR, shoe, sc); facet(b, hL, tL, kL, shoe, sc);
  }
  b.bone(root).blob(0, .004, 0, .2 * H, .16 * H, .26);
  b.bone(rig.root);

  const joints = { hips, torso, head: neck, armL, armR, foreL, foreR, legL, legR, shinL, shinR };
  return { id, root, joints, scale: H, hipY, thigh, shin, level, teacher, head };
}

// ---------------------------------------------------------------- catalog

/** Seat height at which the soles touch the floor (applyPose puts the hips at seat + .03). */
const seatFor = person => person.shin + SHOE * person.scale - .03;
function workPose() { const q = blendBody(POSES.sit(), POSES.type(0)); q.head = [.08, 0, 0]; q.torso = [.04, 0, 0]; return q; }
function makePiece({ id, label, level, budget, spec = {}, pose, width = .4, focus = .85 }) {
  return {
    id, label, group: 'people', size: { w: width, d: .3, h: SCALE.person[level] }, budget,
    build(b, p, opts) {
      const person = addPaperPerson(b, { id: opts.id, level, x: 0, y: 0, z: 0, ry: 0, ...spec });
      const meta = newMeta({ focus: [0, SCALE.person[level] * focus, 0] });
      if (pose) meta.afterFinish = () => pose(person);
      return meta;
    }
  };
}

export const PIECES = [
  makePiece({ id: 'person-pre', label: 'Preprimaria', level: 'pre', budget: 280, spec: { seed: 'pre-a', hair: 'pig', cap: 'worn' } }),
  makePiece({ id: 'person-prim', label: 'Primaria', level: 'prim', budget: 280, spec: { seed: 'prim-b', hair: 'short' } }),
  makePiece({ id: 'person-bas', label: 'Básico', level: 'bas', budget: 280, spec: { seed: 'bas-a', hair: 'long', skirt: true } }),
  makePiece({ id: 'person-bach', label: 'Bachillerato', level: 'bach', budget: 280, spec: { seed: 'bach-a', hair: 'short', skirt: false } }),
  makePiece({ id: 'person-teacher', label: 'Docente o facilitador', level: 'adult', budget: 300, spec: { seed: 'teacher-a', role: 'teacher', hair: 'short', notebook: true } }),
  makePiece({
    id: 'pose-walk', label: 'Caminar', level: 'prim', budget: 280, width: .5, spec: { seed: 'prim-b', hair: 'short' },
    pose: person => applyPose(person, POSES.walk(1.1), 'stand')
  }),
  makePiece({
    id: 'pose-sit', label: 'Sentarse', level: 'bas', budget: 280, width: .45, focus: .66, spec: { seed: 'bas-a', hair: 'long', skirt: true, seated: true },
    pose: person => applyPose(person, POSES.sit(), 'sit', seatFor(person))
  }),
  makePiece({
    id: 'pose-work', label: 'Trabajar en mesa', level: 'bas', budget: 280, width: .45, focus: .66, spec: { seed: 'bas-a', hair: 'long', skirt: true, seated: true },
    pose: person => applyPose(person, workPose(), 'sit', seatFor(person))
  }),
  makePiece({
    id: 'pose-point', label: 'Docente señalando', level: 'adult', budget: 300, width: .5, spec: { seed: 'teacher-a', role: 'teacher', hair: 'short' },
    pose: person => applyPose(person, POSES.point(.2), 'stand')
  }),
  makePiece({
    id: 'pose-headset', label: 'Con visor', level: 'bach', budget: 280, width: .45, spec: { seed: 'bach-a', hair: 'short', headset: true },
    pose: person => applyPose(person, POSES.vr(1.2, 0), 'stand')
  })
];
