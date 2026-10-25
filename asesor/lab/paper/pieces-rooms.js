/**
 * Papercraft pieces: rooms (architecture A, reference sheet 02-modulos-aulas).
 * Owner and contract: docs/papercraft/CONTRACT.md.
 *
 * Every classroom variant comes from one parametrised builder (`room`). Local
 * frame: footprint 2.6 x 2.3 centred on the origin, floor board on y = 0, front
 * (open side) toward +Z. Walls are cut sheets that fold up from their lower edge
 * (stage order 1); the ivory top slab folds down from a back-edge hinge (order 2).
 */
import { PAPER as C, T, t, newMeta, stage, edgeTone, shadeTone } from './kit.js';

const W = 2.6, D = 2.3, HW = W / 2, HD = D / 2;
const F = .10;          // floor board thickness (top of the floor)
const TOP = 1.58;       // underside of the top slab
const SLAB = .12;       // top slab thickness (top face at 1.70)
const FASCIA = .14;     // ivory band hanging in front of the slab
const H = TOP - F;      // height of a wall sheet
const FOLD = 1.45;      // start angle of wall folds (almost flat on the floor)

const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Vertical decal facing +Z (two triangles), centred. Soft layer by the caller. */
function decal(b, x, y, z, w, h, hex) {
  const a = [x - w / 2, y - h / 2, z], c = [x + w / 2, y - h / 2, z], d = [x + w / 2, y + h / 2, z], e = [x - w / 2, y + h / 2, z];
  b.face(a, c, d, hex, [0, 0, 1]).face(a, d, e, hex, [0, 0, 1]);
}

/** Four-card layered frame centred on (x, y) in a plane at z, thickness t. */
function frame4(p, x, y, z, w, h, border, hex) {
  const o = { thin: 'z' };
  p.card(x, y + h / 2 - border / 2, z, w, border, t, hex, o);
  p.card(x, y - h / 2 + border / 2, z, w, border, t, hex, o);
  p.card(x - w / 2 + border / 2, y, z, border, h - border * 2, t, hex, o);
  p.card(x + w / 2 - border / 2, y, z, border, h - border * 2, t, hex, o);
}

/**
 * Wall sheet in local XY (x along its length, y up from 0, thickness along z),
 * built from cards around one rectangular opening so the cut edges stay visible.
 * op: { x0, x1, y0, y1 } or null.
 */
function sheet(p, len, h, th, hex, op, topOmit) {
  const hl = len / 2, up = topOmit ? ['+y'] : [];
  if (!op) { p.card(0, h / 2, 0, len, h, th, hex, { omit: ['-y', ...up] }); return; }
  p.card((-hl + op.x0) / 2, h / 2, 0, op.x0 + hl, h, th, hex, { omit: ['-y', ...up] });
  p.card((op.x1 + hl) / 2, h / 2, 0, hl - op.x1, h, th, hex, { omit: ['-y', ...up] });
  const w = op.x1 - op.x0, cx = (op.x0 + op.x1) / 2;
  if (op.y0 > 0) p.card(cx, op.y0 / 2, 0, w, op.y0, th, hex, { omit: ['-y', '-x', '+x'] });
  if (op.y1 < h) p.card(cx, (op.y1 + h) / 2, 0, w, h - op.y1, th, hex, { omit: ['-x', '+x', ...up] });
}

/** Three-sided door casing (top + two jambs) laid on a wall face. s: +1 faces +z, -1 faces -z. */
function casing(p, cx, w, hDoor, s, hex) {
  const zc = s * (T / 2 + t / 2 + .001), bd = .06;
  p.card(cx, hDoor + bd / 2, zc, w + bd * 2, bd, t, hex, { thin: 'z' });
  p.card(cx - w / 2 - bd / 2, hDoor / 2, zc, bd, hDoor, t, hex, { thin: 'z' });
  p.card(cx + w / 2 + bd / 2, hDoor / 2, zc, bd, hDoor, t, hex, { thin: 'z' });
}

/**
 * Classroom in front cut. cfg: { id, left: 'window'|'solid'|'open', right: 'door'|'wall'|'open', upper }.
 */
function room(b, p, o, cfg) {
  const id = o.id || cfg.id, parent = o.parent || 'root';
  const left = o.left || cfg.left, right = o.right || cfg.right, upper = o.upper ?? cfg.upper;
  const meta = newMeta({ focus: [0, .8, .3] });
  const solidL = left === 'solid';
  // Inner faces of the side walls (the back wall and slab are sized from them).
  const xa = left === 'open' ? -HW : solidL ? -HW + .1 : -HW + T;
  const xb = right === 'open' ? HW : HW - T;
  const slabX0 = solidL ? -HW + .1 : -HW, slabW = HW - slabX0, slabCx = (slabX0 + HW) / 2;

  b.bone(parent);
  // Floor board with tile joints.
  p.card(0, F / 2, 0, W, F, D, C.paving, { thin: 'y', omit: ['-y'], side: C.ivory });
  b.layer('soft');
  for (const z of [-.69, -.23, .23, .69]) p.inlay(0, F, z, 2.3, .012, C.joint);
  for (const x of [-.87, -.43, 0, .43, .87]) p.inlay(x, F, 0, .012, 1.95, C.joint);
  b.layer('main');

  // Glue flaps standing at the floor edge (visible in the base stage), outside the wall lines.
  for (const x of [-.7, .7]) p.tab(x, F, -HD, .3, .13, C.cream, { ry: Math.PI, rx: -1.1 });
  if (!upper) {
    if (left !== 'open' && !solidL) p.tab(-HW, F, -.45, .3, .13, C.cream, { ry: -Math.PI / 2, rx: -1.1 });
    if (right !== 'open') p.tab(HW, F, -.45, .3, .13, C.cream, { ry: Math.PI / 2, rx: -1.1 });
  }

  // Back wall: ivory sheet, violet accent panel, framed screen.
  const back = b.rig.add(id + '.back', parent, 0, F, -HD + T / 2);
  b.bone(back);
  const len = xb - xa, cx = (xa + xb) / 2, zi = T / 2;
  p.card(cx, H / 2, 0, len, H, T, C.ivory, { omit: ['-y', '+y'], thin: 'z' });
  // Budget: decorations flush to a wall never cast into the shadow map.
  b.base('soft');
  // Coordinator round: orange accent wall with a large violet screen, as in sheet 02.
  p.card(cx, (H - .08) / 2, zi + t / 2 + .002, len - .12, H - .08, t, C.orange, { thin: 'z' });
  const zs = zi + t + .004;
  p.card(cx, .97, zs + t / 2, 1.22, .64, t, C.screen, { thin: 'z' });
  frame4(p, cx, .97, zs + t + .002 + t / 2, 1.34, .76, .06, C.ivory);
  b.layer('soft');
  const zd = zs + t + .003;
  decal(b, cx - .44, .97, zd, .2, .2, C.ivory);
  decal(b, cx - .48, .99, zd + .002, .04, .05, C.violetDeep);
  decal(b, cx - .40, .99, zd + .002, .04, .05, C.violetDeep);
  decal(b, cx - .44, .91, zd + .002, .09, .02, C.violetDeep);
  C.code.slice(0, 3).forEach((hex, i) => decal(b, cx + .14 + i * .03, 1.11 - i * .13, zd, .46 - i * .08, .035, hex));
  b.layer('main');
  for (const x of [cx - .7, cx + .7]) p.tab(x, H - t - .004, zi, .34, .12, C.ivory);
  b.base('solid');
  stage(meta, back, 1, 'fold', { axis: 'x', from: FOLD });

  // Left wall.
  if (left !== 'open') {
    if (solidL) {
      const lw = b.rig.add(id + '.left', parent, -HW + .05, F, .1);
      b.bone(lw);
      const h2 = TOP + SLAB - F;
      b.push(0, 0, 0, -Math.PI / 2);
      p.card(0, h2 / 2, 0, 2.5, h2, .1, C.violet, { thin: 'z', omit: ['-y'] });
      b.pop();
      // Faceted outer face: pleats as triangles over a coarse grid.
      const zs4 = [-1.25, -.4, .45, 1.25], ys = [0, h2 / 2, h2], X = -.056;
      const V = (i, j) => [X - (i > 0 && i < 3 && j === 1 ? .035 : 0), ys[j], zs4[i]];
      for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) {
        const a = V(i, j), c = V(i + 1, j), d = V(i + 1, j + 1), e = V(i, j + 1);
        const k = [1, .9, 1.08, .84][(i + j * 2) % 4];
        b.face(a, c, d, shadeTone(C.violet, k), [-1, 0, 0]);
        b.face(a, d, e, shadeTone(C.violet, k > 1 ? .9 : k + .1), [-1, 0, 0]);
      }
      stage(meta, lw, 1, 'fold', { axis: 'z', from: -FOLD });
    } else {
      const lw = b.rig.add(id + '.left', parent, -HW + T / 2, F, 0);
      b.bone(lw);
      b.push(0, 0, 0, -Math.PI / 2);
      // local +z is world -x: inner face is local -z.
      sheet(p, D, H, T, C.ivory, left === 'window' ? { x0: -.5, x1: .5, y0: .55, y1: 1.17 } : null, true);
      if (left === 'window') {
        b.base('soft'); // window frames and glass do not need to cast
        const zi2 = -(T / 2 + t / 2 + .001);
        frame4(p, 0, .86, zi2, 1.14, .76, .07, C.white);
        frame4(p, 0, .86, zi2 - t - .002, 1.06, .68, .03, C.turquoise);
        frame4(p, 0, .86, -zi2, 1.14, .76, .07, C.white);
        p.glass(0, .86, 0, .98, .6, .008);
        b.base('solid');
      }
      p.tab(.6, H - t - .004, -T / 2, .34, .12, C.ivory, { ry: Math.PI });
      b.pop();
      stage(meta, lw, 1, 'fold', { axis: 'z', from: -FOLD });
    }
  }

  // Right wall.
  if (right !== 'open') {
    const rw = b.rig.add(id + '.right', parent, HW - T / 2, F, 0);
    b.bone(rw);
    b.push(0, 0, 0, -Math.PI / 2);
    // local +z is world -x: inner face is local +z.
    if (right === 'door') {
      const op = { x0: .19, x1: .71, y0: 0, y1: 1.08 };
      sheet(p, D, H, T, C.ivory, op, true);
      casing(p, .45, .52, 1.08, 1, C.orange);
      casing(p, .45, .52, 1.08, -1, C.orange);
    } else {
      sheet(p, D, H, T, C.ivory, null, true);
      p.card(-.1, .72, T / 2 + t / 2 + .002, 1.7, 1.1, t, C.orange, { thin: 'z' });
    }
    p.tab(-.5, H - t - .004, T / 2, .34, .12, C.ivory);
    b.pop();
    stage(meta, rw, 1, 'fold', { axis: 'z', from: FOLD });
  }

  // Top slab (ivory), hinged on its back edge, with the thick front band.
  const slab = b.rig.add(id + '.slab', parent, 0, TOP, -HD);
  b.bone(slab);
  // Coordinator round: the slab does not cast shadow, so the cut-away interior stays lit.
  b.base('soft');
  p.card(slabCx, SLAB / 2, HD, slabW, SLAB, D, C.ivory, { thin: 'y', edge: .2, omit: ['-y'] });
  // Visible underside (seen when the slab is folded open during assembly).
  { const x0 = slabX0, x1 = HW, z1 = D, u = shadeTone(C.ivory, .93);
    b.face([x0, 0, 0], [x1, 0, 0], [x1, 0, z1], u, [0, -1, 0]).face([x0, 0, 0], [x1, 0, z1], [x0, 0, z1], u, [0, -1, 0]); }
  p.crease([slabX0, SLAB, D], [HW, SLAB, D], [0, 1, 0], [0, 0, -1], .035, C.white);
  // Exterior glue flaps under the slab, folded over the outer face of the side walls.
  if (left === 'window') p.card(-HW - t / 2 - .003, -.1, .35 + HD, t, .2, .34, C.cream, { thin: 'x', edge: .45 });
  if (right !== 'open') p.card(HW + t / 2 + .003, -.1, .35 + HD, t, .2, .34, C.cream, { thin: 'x', edge: .45 });
  p.card(slabCx, -FASCIA / 2, D - .046, slabW - .008, FASCIA, .08, C.cream, { thin: 'z', edge: .35, omit: ['+y'] });
  b.layer('soft');
  for (const z of [.55, 1.15, 1.75]) p.inlay(slabCx, SLAB, z, slabW - .2, .012, C.creamShade);
  for (const x of [-.65, 0, .65]) p.inlay(x, SLAB, HD, .012, D - .2, C.creamShade);
  b.layer('main');
  for (const [x, z] of [[slabX0 + .065, D - .075], [HW - .065, D - .075], [HW - .065, .07]]) p.card(x, SLAB + .04, z, .08, .08, .08, C.turquoise, { omit: ['-y'] }); // hidden underside: never coplanar with a roof placed on top
  b.base('solid');
  stage(meta, slab, 2, 'fold', { axis: 'x', from: -1.1 });

  if (upper && o.balcony !== false) {
    b.bone(parent);
    // Front kerb (antepecho) and glass railing.
    const kerb = .08;
    p.card(0, F + kerb / 2, HD - .05, W, kerb, .1, C.ivory, { thin: 'y', omit: ['-y'], edge: .25 });
    const rail = b.rig.add(id + '.rail', parent, 0, F + kerb, HD - .05);
    b.bone(rail);
    const rh = .42;
    for (const x of [-1.22, -.61, 0, .61, 1.22]) p.card(x, rh / 2, 0, .045, rh, .045, C.turquoise, { omit: ['-y'] });
    p.card(0, rh + .015, 0, W - .06, .03, .06, C.turquoise, { thin: 'y' });
    p.card(0, .02, 0, W - .06, .04, .045, C.turquoise, { omit: ['-y'] });
    for (let i = 0; i < 4; i++) p.glass(-.915 + i * .61, rh / 2, 0, .55, rh - .1, .01);
    stage(meta, rail, 3, 'fold', { axis: 'x', from: FOLD });
  }
  b.bone(parent);

  meta.anchors = {
    door: [HW - T, F, .45], screen: [cx, 1.07, -HD + T + .06],
    'table-a': [-.55, F, -.15], 'table-b': [.5, F, .3], teacher: [.85, F, -.62]
  };
  meta.connectors = [
    { side: 'left', type: left === 'open' ? 'open' : 'wall', at: [-HW, F, 0] },
    { side: 'right', type: right === 'open' ? 'open' : 'wall', at: [HW, F, 0] },
    { side: 'front', type: 'open', at: [0, F, HD] },
    { side: 'up', type: 'wall', at: [0, TOP + SLAB, 0] }
  ];
  if (upper) meta.placeY = 1.7;
  return meta;
}

/** Perimeter ring of the pedestal slab (counter-clockwise from above), corners optionally rounded. */
function pedestalRing(w, d, round, r = .55, seg = 5) {
  const hw = w / 2, hd = d / 2;
  const corners = [
    ['front-left', -1, 1, [-1, 0], [0, 1]], ['front-right', 1, 1, [0, 1], [1, 0]],
    ['back-right', 1, -1, [1, 0], [0, -1]], ['back-left', -1, -1, [0, -1], [-1, 0]]
  ];
  const ring = [];
  for (const [name, sx, sz, nin, nout] of corners) {
    if (!round.includes(name)) { ring.push([sx * hw, sz * hd]); continue; }
    const c = [sx * (hw - r), sz * (hd - r)], a0 = Math.atan2(nin[1], nin[0]);
    let da = Math.atan2(nout[1], nout[0]) - a0;
    if (da > Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;
    for (let i = 0; i <= seg; i++) { const a = a0 + da * i / seg; ring.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
  }
  // Subdivide long edges so the pleats stay about the same size.
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length], n = Math.max(1, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / .46));
    for (let k = 0; k < n; k++) out.push([a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n]);
  }
  return out;
}

const ROOMS = {
  'room-initial': { id: 'room-initial', left: 'window', right: 'door' },
  'room-extendable': { id: 'room-extendable', left: 'window', right: 'open' },
  'room-corner': { id: 'room-corner', left: 'solid', right: 'door' },
  'room-end': { id: 'room-end', left: 'open', right: 'wall' },
  'room-upper': { id: 'room-upper', left: 'window', right: 'door', upper: true },
  'room-upper-open': { id: 'room-upper-open', left: 'window', right: 'door', upper: true }
};

export const PIECES = [
  {
    id: 'pedestal', label: 'Base modular', group: 'rooms', size: { w: 2.6, d: 2.3, h: .55 }, budget: 260,
    opts: { w: 2.6, d: 2.3, round: [] },
    build(b, p, o) {
      const meta = newMeta({ focus: [.6, -.1, .9] });
      const w = o.w || 2.6, d = o.d || 2.3, h = .55, round = o.round || []; // coordinator round: thicker plinth, as in the reference
      const id = o.id || 'pedestal', parent = o.parent || 'root';
      const body = b.rig.add(id + '.body', parent, 0, -h, 0);
      b.bone(body);
      b.push(0, h, 0);
      const S = pedestalRing(w, d, round), n = S.length;
      let cx = 0, cz = 0; for (const [x, z] of S) { cx += x; cz += z; } cx /= n; cz /= n;
      // Two pleat rows: top ring (S) -> mid ring at the edge midpoints -> bottom ring, slightly inset.
      const inset = (x, z, k) => { const dx = cx - x, dz = cz - z, l = Math.hypot(dx, dz) || 1; return [x + dx / l * k, z + dz / l * k]; };
      const Mid = S.map((a, i) => {
        const c = S[(i + 1) % n], q = inset((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, i % 2 ? .035 : .0);
        return [q[0], -h * .5, q[1]];
      });
      const Bot = S.map(a => { const q = inset(a[0], a[1], .025); return [q[0], -h, q[1]]; });
      const tones = [1, .9, .8, 1.08, .95];
      const tone = (i, k) => shadeTone(C.violet, tones[Math.floor(rnd(i * 4 + k) * 5)]);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, pr = (i + n - 1) % n, a = S[i], c = S[j];
        const out = [(a[0] + c[0]) / 2 - cx, 0, (a[1] + c[1]) / 2 - cz];
        const A = [a[0], 0, a[1]], Cc = [c[0], 0, c[1]];
        b.face(A, Cc, Mid[i], tone(i, 0), out);
        b.face(Cc, Mid[j], Mid[i], tone(i, 1), out);
        b.face(Mid[pr], Mid[i], Bot[i], tone(i, 2), out);
        b.face(Bot[i], Mid[i], Bot[j], tone(i, 3), out);
      }
      // Pavement top (fan) and tile joints clipped to the outline.
      for (let i = 0; i < n; i++) {
        const a = S[i], c = S[(i + 1) % n];
        b.face([cx, 0, cz], [a[0], 0, a[1]], [c[0], 0, c[1]], C.paving, [0, 1, 0]);
      }
      const span = (axis, v) => {
        const hits = [];
        for (let i = 0; i < n; i++) {
          const a = S[i], c = S[(i + 1) % n], u0 = axis === 'z' ? a[1] : a[0], u1 = axis === 'z' ? c[1] : c[0];
          if ((u0 - v) * (u1 - v) <= 0 && u0 !== u1) {
            const k = (v - u0) / (u1 - u0);
            hits.push(axis === 'z' ? a[0] + (c[0] - a[0]) * k : a[1] + (c[1] - a[1]) * k);
          }
        }
        return hits.length >= 2 ? [Math.min(...hits), Math.max(...hits)] : null;
      };
      b.layer('soft');
      const nz = Math.round(d / .46), nx = Math.round(w / .43);
      for (let k = 1; k < nz; k++) {
        const z = -d / 2 + k * d / nz, s = span('z', z);
        if (s && s[1] - s[0] > .3) p.inlay((s[0] + s[1]) / 2, 0, z, s[1] - s[0] - .16, .014, C.joint);
      }
      for (let k = 1; k < nx; k++) {
        const x = -w / 2 + k * w / nx, s = span('x', x);
        if (s && s[1] - s[0] > .3) p.inlay(x, 0, (s[0] + s[1]) / 2, .014, s[1] - s[0] - .16, C.joint);
      }
      b.layer('main');
      b.pop();
      stage(meta, body, 0, 'rise');
      b.bone(parent);
      meta.connectors = [
        { side: 'up', type: 'wall', at: [0, 0, 0] }, { side: 'front', type: 'open', at: [0, 0, d / 2] },
        { side: 'back', type: 'open', at: [0, 0, -d / 2] }, { side: 'left', type: 'open', at: [-w / 2, 0, 0] },
        { side: 'right', type: 'open', at: [w / 2, 0, 0] }
      ];
      return meta;
    }
  },
  { id: 'room-initial', label: 'Aula inicial', group: 'rooms', size: { w: 2.6, d: 2.3, h: 1.7 }, budget: 700, opts: {}, build: (b, p, o) => room(b, p, o, ROOMS['room-initial']) },
  { id: 'room-extendable', label: 'Aula ampliable', group: 'rooms', size: { w: 2.6, d: 2.3, h: 1.7 }, budget: 650, opts: {}, build: (b, p, o) => room(b, p, o, ROOMS['room-extendable']) },
  { id: 'room-corner', label: 'Aula de esquina', group: 'rooms', size: { w: 2.6, d: 2.3, h: 1.7 }, budget: 700, opts: {}, build: (b, p, o) => room(b, p, o, ROOMS['room-corner']) },
  { id: 'room-end', label: 'Aula de extremo', group: 'rooms', size: { w: 2.6, d: 2.3, h: 1.7 }, budget: 650, opts: {}, build: (b, p, o) => room(b, p, o, ROOMS['room-end']) },
  {
    id: 'room-upper', label: 'Piso superior', group: 'rooms', size: { w: 2.6, d: 2.3, h: 1.7 }, budget: 700,
    place: { y: 1.7 }, opts: {}, build: (b, p, o) => room(b, p, o, ROOMS['room-upper'])
  },
  {
    id: 'room-upper-open', label: 'Piso superior (frente abierto)', group: 'rooms', size: { w: 2.6, d: 2.3, h: 1.7 }, budget: 700,
    place: { y: 1.7 }, opts: { balcony: false }, build: (b, p, o) => room(b, p, o, ROOMS['room-upper-open'])
  },
  {
    id: 'roof', label: 'Cubierta', group: 'rooms', size: { w: 2.6, d: 2.3, h: .42 }, budget: 180, opts: {},
    build(b, p, o) {
      const id = o.id || 'roof', parent = o.parent || 'root', meta = newMeta({ focus: [.5, .25, .1] });
      const lid = b.rig.add(id + '.lid', parent, 0, 0, -HD);
      b.bone(lid);
      b.base('soft'); // coordinator round: roofs never shade the classrooms below
      b.push(0, 0, HD);
      const rim = .1, rh = .14, rc = { thin: 'y', edge: .25 };
      const ro = { ...rc, omit: ['-y'] };
      p.card(0, rh / 2, HD - rim / 2, W, rh, rim, C.ivory, ro);
      p.card(0, rh / 2, -HD + rim / 2, W, rh, rim, C.ivory, ro);
      p.card(-HW + rim / 2, rh / 2, 0, rim, rh, D - rim * 2, C.ivory, ro);
      p.card(HW - rim / 2, rh / 2, 0, rim, rh, D - rim * 2, C.ivory, ro);
      // Underside in dark violet, visible when the lid is folded open.
      b.face([-HW, .006, -HD], [HW, .006, -HD], [HW, .006, HD], C.violetDark, [0, -1, 0]).face([-HW, .006, -HD], [HW, .006, HD], [-HW, .006, HD], C.violetDark, [0, -1, 0]);
      p.card(0, .08 + T / 2, 0, W - rim * 2 - .004, T, D - rim * 2 - .004, C.violet, { thin: 'y', edge: .15, omit: ['-y'] });
      // Rooftop unit: violet body, lid and a layered grille.
      const top = .08 + T;
      p.card(.7, top + .1, -.1, .5, .2, .34, C.violetDark, { thin: null, omit: ['-y'], edge: 0 });
      p.card(.7, top + .215, -.1, .56, .03, .4, C.violetLight, { thin: 'y', edge: .2 });
      frame4(p, .7, top + .1, -.1 + .17 + t / 2 + .001, .4, .14, .025, C.violetDeep);
      b.layer('soft');
      for (let i = 0; i < 3; i++) decal(b, .7, top + .065 + i * .035, -.1 + .17 + t + .003, .35, .014, C.violetDeep);
      b.layer('main');
      b.pop();
      b.base('solid');
      stage(meta, lid, 2, 'fold', { axis: 'x', from: -1.1 });
      b.bone(parent);
      meta.anchors = { unit: [.7, .3, -.1] };
      meta.connectors = [{ side: 'up', type: 'open', at: [0, .14, 0] }];
      return meta;
    }
  },
  {
    id: 'columns', label: 'Columnas de soporte', group: 'rooms', size: { w: 2.6, d: 2.3, h: 1.7 }, budget: 200, opts: {},
    build(b, p, o) {
      const id = o.id || 'columns', parent = o.parent || 'root', meta = newMeta({ focus: [0, .9, .4] });
      const cols = b.rig.add(id + '.posts', parent, 0, 0, 0);
      b.bone(cols);
      const pos = [[-1.05, -.85], [1.05, -.85], [-1.05, .85], [1.05, .85]];
      for (const [x, z] of pos) p.prism(x, 0, z, 4, .14, TOP, C.violet, { ry: Math.PI / 4, top: false });
      // Braces: flat triangular gussets under the slab, toward the inside of each column.
      const g = .42, y1 = TOP - .002, e = edgeTone(C.violet, .3);
      for (const [x, z] of pos) {
        const sx = -Math.sign(x), sz = -Math.sign(z), xf = x + sx * .1, zf = z + sz * .1;
        // gusset in plane z = const, thickness T
        b.face([xf, y1, z - T / 2], [xf, y1 - g, z - T / 2], [xf + sx * g, y1, z - T / 2], C.violetLight, [0, 0, -1]);
        b.face([xf, y1, z + T / 2], [xf, y1 - g, z + T / 2], [xf + sx * g, y1, z + T / 2], C.violetLight, [0, 0, 1]);
        b.face([xf, y1 - g, z - T / 2], [xf, y1 - g, z + T / 2], [xf + sx * g, y1, z + T / 2], e, [sx, -1, 0]);
        b.face([xf, y1 - g, z - T / 2], [xf + sx * g, y1, z + T / 2], [xf + sx * g, y1, z - T / 2], e, [sx, -1, 0]);
        // gusset in plane x = const
        b.face([x - T / 2, y1, zf], [x - T / 2, y1 - g, zf], [x - T / 2, y1, zf + sz * g], shadeTone(C.violet, .88), [-1, 0, 0]);
        b.face([x + T / 2, y1, zf], [x + T / 2, y1 - g, zf], [x + T / 2, y1, zf + sz * g], shadeTone(C.violet, .88), [1, 0, 0]);
        b.face([x - T / 2, y1 - g, zf], [x + T / 2, y1 - g, zf], [x + T / 2, y1, zf + sz * g], e, [0, -1, sz]);
        b.face([x - T / 2, y1 - g, zf], [x + T / 2, y1, zf + sz * g], [x - T / 2, y1, zf + sz * g], e, [0, -1, sz]);
      }
      stage(meta, cols, 1, 'rise');
      const slab = b.rig.add(id + '.slab', parent, 0, TOP, -HD);
      b.bone(slab);
      p.card(0, SLAB / 2, HD, W, SLAB, D, C.ivory, { thin: 'y', edge: .2 });
      p.card(0, -FASCIA / 2, D - .046, W - .008, FASCIA, .08, C.cream, { thin: 'z', edge: .35, omit: ['+y'] });
      b.layer('soft');
      for (const z of [.55, 1.15, 1.75]) p.inlay(0, SLAB, z, W - .2, .012, C.creamShade);
      for (const x of [-.65, 0, .65]) p.inlay(x, SLAB, HD, .012, D - .2, C.creamShade);
      b.layer('main');
      stage(meta, slab, 2, 'fold', { axis: 'x', from: -1.1 });
      b.bone(parent);
      meta.connectors = [{ side: 'up', type: 'wall', at: [0, TOP + SLAB, 0] }, { side: 'front', type: 'open', at: [0, 0, HD] }];
      return meta;
    }
  }
];
