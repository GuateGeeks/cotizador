/**
 * Papercraft pieces: links (reference sheet 03-modulos-conexiones). Entrance,
 * corridor, stairs, bridge, patio, path and front steps. Owner and contract:
 * docs/papercraft/CONTRACT.md.
 */
import { PAPER as C, T, t, SCALE, newMeta, stage, edgeTone, shadeTone } from './kit.js';

/** Draw on a new bone placed at (x, y, z) but author in piece coordinates. */
function onBone(b, opts, part, x, y, z, draw) {
  const parent = opts.parent || 'root';
  const bone = b.rig.add((opts.id || 'link') + '.' + part, parent, x, y, z);
  b.bone(bone); b.push(-x, -y, -z);
  draw();
  b.pop(); b.bone(parent);
  return bone;
}

/**
 * Convex polygon in the (z, y) plane extruded along X from x0 to x1: a cut side
 * panel (stringers, cheeks, sloped rails). Face colour on the two big sides.
 */
function side(b, pts, x0, x1, hex, edge = edgeTone(hex, .35)) {
  const n = pts.length;
  let cz = 0, cy = 0;
  for (const [z, y] of pts) { cz += z; cy += y; }
  cz /= n; cy /= n;
  for (let i = 1; i < n - 1; i++) {
    b.face([x1, pts[0][1], pts[0][0]], [x1, pts[i][1], pts[i][0]], [x1, pts[i + 1][1], pts[i + 1][0]], hex, [1, 0, 0]);
    b.face([x0, pts[0][1], pts[0][0]], [x0, pts[i][1], pts[i][0]], [x0, pts[i + 1][1], pts[i + 1][0]], hex, [-1, 0, 0]);
  }
  for (let i = 0; i < n; i++) {
    const [za, ya] = pts[i], [zc, yc] = pts[(i + 1) % n], out = [0, (ya + yc) / 2 - cy, (za + zc) / 2 - cz];
    b.face([x0, ya, za], [x1, ya, za], [x1, yc, zc], edge, out);
    b.face([x0, ya, za], [x1, yc, zc], [x0, yc, zc], edge, out);
  }
}

const sideGlass = (b, pts, x0, x1) => { b.layer('glass'); side(b, pts, x0, x1, C.glass, C.glass); b.layer('main'); };

/**
 * Upper-floor gallery / walkway. Floor top sits at y = t (flush with stair landings and bridge decks);
 * `open` lists the sides without railing (left, right, front, back) where it joins stairs, bridges or the facade.
 */
function walkway(b, p, opts, meta) {
  const L = opts.len ?? 2.6, W = Math.min(opts.w ?? 1, 1.2), id = opts.id || 'link', open = opts.open || [];
  const zr = W / 2 - .02, xe = L / 2 - .02;
  p.slab(0, 0, 0, L, t, W, C.turquoiseLight, { thin: 'y', side: edgeTone(C.turquoiseLight, .5) });
  const joint = shadeTone(C.turquoiseLight, .8);
  for (let x = -L / 2 + L / 4; x < L / 2 - .1; x += L / 4) p.inlay(x, t, 0, .014, W - .06, joint);
  const n = Math.max(2, Math.round((L - .3) / .6)), has = side => !open.includes(side);
  const posts = new Set(), put = (x, z) => posts.add(x.toFixed(3) + ',' + z.toFixed(3));
  for (const [side, z] of [['back', -zr], ['front', zr]]) if (has(side)) for (let i = 0; i <= n; i++) put(-xe + i * 2 * xe / n, z);
  for (const [side, x] of [['left', -xe], ['right', xe]]) if (has(side)) { put(x, -zr); put(x, zr); }
  const drawn = new Set(), post = (x, z) => { const k = x.toFixed(3) + ',' + z.toFixed(3); if (posts.has(k) && !drawn.has(k)) { drawn.add(k); p.card(x, t + .21, z, .035, .42, .035, C.turquoise, { thin: null }); } };
  const rails = [];
  const longRail = (side, z) => has(side) && onBone(b, opts, 'rail' + side, 0, t, z, () => {
    for (let i = 0; i <= n; i++) post(-xe + i * 2 * xe / n, z);
    p.card(0, t + .435, z, 2 * xe + .035, .03, .035, C.turquoise, { thin: null });
    p.glass(0, t + .22, z, 2 * xe - .06, .3, .008);
  });
  const endRail = (side, x) => has(side) && onBone(b, opts, 'rail' + side, x, t, 0, () => {
    post(x, -zr); post(x, zr);
    p.card(x, t + .435, 0, .035, .03, 2 * zr + .035, C.turquoise, { thin: null });
    p.glass(x, t + .22, 0, .008, .3, 2 * zr - .06);
  });
  rails.push(['back', longRail('back', -zr), 'x', -1.5], ['front', longRail('front', zr), 'x', 1.5], ['left', endRail('left', -xe), 'z', 1.5], ['right', endRail('right', xe), 'z', -1.5]);
  for (const [, bone, axis, from] of rails) if (bone) stage(meta, bone, 3, 'fold', { axis, from });
  meta.anchors = { left: [-L / 2, t, 0], right: [L / 2, t, 0], front: [0, t, W / 2], back: [0, t, -W / 2] };
  meta.connectors = [{ side: 'left', type: 'corridor', at: [-L / 2, t, 0] }, { side: 'right', type: 'corridor', at: [L / 2, t, 0] }];
  return meta;
}

export const PIECES = [
  {
    id: 'entrance', label: 'Entrada naranja', group: 'links', size: { w: 1.3, d: 1.1, h: 1.5 }, budget: 300,
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .6, .2] });
      b.bone(opts.parent || 'root');
      const OP = .64, OH = 1.18, ZA = -.35;
      // Back frame: deep orange portal (piers + lintel).
      for (const s of [-1, 1]) p.card(s * (OP / 2 + .33 / 2), OH / 2, ZA, .33, OH, .4, C.orange);
      p.card(0, OH + .16, ZA, 1.3, .32, .4, C.orange);
      // Interior: warm back card and ivory floor.
      p.card(0, OH / 2, -.535, OP - .02, OH, .03, C.cream, { thin: 'z' });
      p.slab(0, 0, -.28, OP - .02, .09, .48, C.ivory, { thin: 'y', side: C.cream });
      // Glass double door, turquoise mullions.
      p.frame(0, .09 + .52, -.3 - t / 2, .62, 1.04, .035, t, C.turquoise);
      p.card(0, .61, -.3, .03, .97, t, C.turquoise, { thin: 'z' });
      p.glass(-.145, .61, -.3, .26, .97, .008);
      p.glass(.145, .61, -.3, .26, .97, .008);
      for (const s of [-1, 1]) p.card(s * .05, .6, -.28, .014, .14, .014, C.turquoiseDark, { thin: null });
      // Front frame: second layer, lifted to the front with its own visible edge.
      onBone(b, opts, 'frame', 0, 0, -.15, () => {
        for (const s of [-1, 1]) p.card(s * .455, OH / 2, -.096, .27, OH, .1, C.orangeLight, { thin: 'z', omit: ['-z'] });
        p.card(0, OH + .1, -.096, 1.18, .2, .1, C.orangeLight, { thin: 'z', omit: ['-z'] });
      });
      stage(meta, b.rig.get((opts.id || 'link') + '.frame'), 3, 'fold', { axis: 'x', from: 1.4 });
      // Ivory steps (three treads, widening outward).
      onBone(b, opts, 'steps', 0, 0, .26, () => {
        [[.8, .09], [.9, .06], [1, .03]].forEach(([w, h], i) =>
          p.slab(0, 0, -.04 + .2 * i + .1, w, h, .2, C.ivory, { thin: 'y', side: C.cream }));
      });
      stage(meta, b.rig.get((opts.id || 'link') + '.steps'), 3, 'rise');
      p.shadow(0, 0, .1, .6, .5, .16);
      meta.anchors = { door: [0, 0, .58], inside: [0, .09, -.3] };
      return meta;
    }
  },
  {
    id: 'corridor', label: 'Corredor', group: 'links', size: { w: 2.6, d: 1, h: 1.4 }, budget: 300,
    build(b, p, opts) {
      const meta = newMeta({ focus: [-.4, .5, .2] });
      b.bone(opts.parent || 'root');
      if (opts.walkway) return walkway(b, p, opts, meta);
      // Floor: light turquoise with joints.
      p.slab(0, 0, 0, 2.6, .06, 1, C.turquoiseLight, { thin: 'y', side: edgeTone(C.turquoiseLight, .5) });
      const joint = shadeTone(C.turquoiseLight, .8);
      for (const x of [-.65, 0, .65]) p.inlay(x, .06, 0, .014, .96, joint);
      p.inlay(0, .06, .18, 2.56, .014, joint);
      // Columns along the open side.
      for (const x of [-1.2, -.4, .4, 1.2]) p.card(x, .69, .4, .1, 1.26, .1, C.ivory, { thin: null });
      for (const x of [-.8, .8]) p.card(x, .685, -.4, .1, 1.25, .08, C.ivory, { thin: null });
      p.card(0, 1.26, .42, 2.6, .12, .06, C.ivory, { thin: 'z' });
      // Solid turquoise side (long back wall), folds up from its base.
      onBone(b, opts, 'wall', 0, .06, -.47, () => p.wall(-1.3, -.47, 1.3, -.47, .06, 1.26, .09, C.turquoise));
      stage(meta, b.rig.get((opts.id || 'link') + '.wall'), 1, 'fold', { axis: 'x', from: -1.5 });
      // Roof slab hinged on the back edge.
      onBone(b, opts, 'roof', 0, 1.32, -.5, () => p.slab(0, 1.32, .0, 2.7, .08, 1.1, C.ivory, { thin: 'y', edge: .1 }));
      stage(meta, b.rig.get((opts.id || 'link') + '.roof'), 2, 'fold', { axis: 'x', from: -1.2 });
      p.shadow(0, 0, 0, 1.3, .48, .14);
      meta.anchors = { left: [-1.3, 0, 0], right: [1.3, 0, 0] };
      meta.connectors = [{ side: 'left', type: 'corridor', at: [-1.3, 0, 0] }, { side: 'right', type: 'corridor', at: [1.3, 0, 0] }];
      return meta;
    }
  },
  {
    id: 'stairs', label: 'Escalera', group: 'links', size: { w: .55, d: 1.9, h: 2.17 }, budget: 480,
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .9, -.1] });
      b.bone(opts.parent || 'root');
      const id = opts.id || 'link', H = (opts.rise ?? 1.7) + t, open = opts.landing?.open || '', N = Math.max(4, Math.round(H / .155)), rise = H / N, run = opts.run ?? 1.54, g = run / N;
      const Z0 = run / 2 + .18, ZN = Z0 - (N - 1) * g, ZB = Z0 - N * g, ZE = Z0 - run - .36;
      const slope = rise / g, nose = z => rise + (Z0 - z) * slope;
      const xL = -.245, xR = .26; // rail centres
      // Treads: one zigzag sheet, riser darker than tread.
      const zig = [];
      for (let i = 0; i < N; i++) zig.push([i * g, i * rise], [i * g, (i + 1) * rise]);
      zig.push([N * g, N * rise]);
      onBone(b, opts, 'run', 0, 0, Z0, () => {
        p.fold(zig, .46, t, C.ivory, { x: .015, z: Z0, ry: Math.PI / 2, side: 'right', shade: [.88, 1], edge: .3 });
        p.slab(0, H - .08, (ZB + ZE) / 2, .55, .08, ZB - ZE, C.ivory, { thin: 'y', side: C.cream });
      });
      stage(meta, b.rig.get(id + '.run'), 3, 'rise');
      // Stringers: thick solid on the left, slim on the right; piers under the landing.
      const stringer = (x0, x1, depth, lowZ) => [[Z0, 0], [Z0, rise], [ZN, H], [ZB, H], [ZB, nose(ZB) - depth], [lowZ, 0]];
      const zl = d => Z0 - (d - rise) / slope;
      onBone(b, opts, 'zancaL', -.245, 0, 0, () => {
        side(b, stringer(0, 0, .38, zl(.38)), -.275, -.215, C.turquoise);
        p.card(-.245, (H - .08) / 2, (ZB + ZE) / 2, .06, H - .08, ZB - ZE, C.turquoise, { thin: 'x', omit: ['-y'] });
      });
      stage(meta, b.rig.get(id + '.zancaL'), 3, 'fold', { axis: 'z', from: 1.5 });
      onBone(b, opts, 'zancaR', .26, 0, 0, () => {
        side(b, stringer(0, 0, .26, zl(.26)), .245, .275, C.turquoise);
        p.card(.26, (H - .08) / 2, (ZB + ZE) / 2, .03, H - .08, ZB - ZE, C.turquoise, { thin: 'x', omit: ['-y'] });
      });
      stage(meta, b.rig.get(id + '.zancaR'), 3, 'fold', { axis: 'z', from: -1.5 });
      // Railings: turquoise posts and rails, glass inside.
      onBone(b, opts, 'rail', 0, H, -.3, () => {
        for (const [xc, inward] of [[xL, 1], [xR, -1]]) {
          const sideOpen = open === (xc < 0 ? 'left' : 'right'), backOpen = open === 'back';
          for (const [pz, py] of [[Z0 - .02, nose(Z0 - .02)], [ZN, H], [ZE + .02, H]]) {
            if ((pz === ZE + .02 && (sideOpen || backOpen)) || (pz === ZN && sideOpen)) continue;
            p.slab(xc, py, pz, .04, .42, .04, C.turquoise, { thin: null });
          }
          const r = (z0, y0, z1, y1, w = .03) => side(b, [[z0, y0 + .42], [z1, y1 + .42], [z1, y1 + .42 + w], [z0, y0 + .42 + w]], xc - .02, xc + .02, C.turquoise);
          r(Z0 - .02, nose(Z0 - .02), ZN, H);
          if (!sideOpen) r(ZN, H, ZE + .02, H);
          const gx = xc + inward * .024;
          sideGlass(b, [[Z0 - .05, nose(Z0 - .05) + .08], [ZN + .03, H + .08], [ZN + .03, H + .38], [Z0 - .05, nose(Z0 - .05) + .38]], gx - .004, gx + .004);
          if (!sideOpen) sideGlass(b, [[ZN - .03, H + .08], [ZE + .05, H + .08], [ZE + .05, H + .38], [ZN - .03, H + .38]], gx - .004, gx + .004);
        }
        if (open !== 'back') p.card(.0075, H + .435, ZE + .02, .465, .03, .03, C.turquoise, { thin: null });
      });
      stage(meta, b.rig.get(id + '.rail'), 3, 'pop');
      p.shadow(0, 0, 0, .26, .9, .16);
      meta.anchors = { bottom: [0, 0, Z0 + .1], top: [0, H, ZE + .2] };
      if (open) meta.connectors = [{ side: open, type: 'open', at: { left: [-.275, H, (ZB + ZE) / 2], right: [.275, H, (ZB + ZE) / 2], back: [0, H, ZE], front: [0, H, ZB] }[open] }];
      return meta;
    }
  },
  {
    id: 'bridge', label: 'Pasarela', group: 'links', size: { w: 2.6, d: .5, h: 2.16 }, budget: 340, opts: { len: 2.6 },
    build(b, p, opts) {
      const L = opts.len ?? 2.6, h = L / 2, id = opts.id || 'link', Y = 1.7, zr = .23, open = opts.open || [];
      const meta = newMeta({ focus: [0, 1.8, .2] });
      b.bone(opts.parent || 'root');
      // Closed ends: tall pier with ivory cap (violet left, turquoise right). Open ends: the deck runs flush
      // to the edge and a low pier carries it from below, so nothing blocks the way.
      const ends = [[-1, 'left', C.violet], [1, 'right', C.turquoise]];
      let xa = -h, xb = h;
      for (const [s, name, hex] of ends) {
        const x = s * (h - .11);
        if (open.includes(name)) p.card(x, .79, 0, .22, 1.58, .5, hex, { thin: null });
        else {
          p.card(x, 1.05, 0, .22, 2.1, .5, hex, { thin: null });
          p.slab(x, 2.1, 0, .26, .06, .54, C.ivory, { thin: 'y', side: C.cream });
          if (s < 0) xa += .22; else xb -= .22;
        }
      }
      const pa = open.includes('left') ? xa : xa + .03, pb = open.includes('right') ? xb : xb - .03;
      onBone(b, opts, 'deck', 0, Y - .06, 0, () => {
        p.slab((xa + xb) / 2, 1.58, 0, xb - xa, .12, .5, C.violet, { thin: null, edge: .3 });
        p.slab((pa + pb) / 2, Y, 0, pb - pa, t, .44, C.ivory, { thin: 'y', side: C.turquoiseLight });
      });
      stage(meta, b.rig.get(id + '.deck'), 3, 'drop');
      const sa = xa + (open.includes('left') ? .03 : .03), sb = xb - .03, sp = sb - sa, cx = (sa + sb) / 2;
      for (const s of [-1, 1]) {
        onBone(b, opts, s < 0 ? 'railB' : 'railF', 0, Y + t, s * zr, () => {
          const yb = Y + t, n = Math.max(2, Math.round(sp / .55));
          for (let i = 0; i <= n; i++) p.card(sa + i * sp / n, yb + .21, s * zr, .035, .42, .035, C.turquoise, { thin: null });
          p.card(cx, yb + .42 + .015, s * zr, sp + .04, .03, .035, C.turquoise, { thin: null });
          p.glass(cx, yb + .22, s * zr, sp - .06, .3, .008);
        });
        stage(meta, b.rig.get(id + (s < 0 ? '.railB' : '.railF')), 3, 'fold', { axis: 'x', from: s * 1.5 });
      }
      p.shadow(0, 0, 0, L / 2 - .1, .22, .12);
      meta.anchors = { left: [-h, Y + t, 0], right: [h, Y + t, 0] };
      meta.connectors = [{ side: 'left', type: 'open', at: [-h, Y + t, 0] }, { side: 'right', type: 'open', at: [h, Y + t, 0] }];
      return meta;
    }
  },
  {
    id: 'patio', label: 'Patio', group: 'links', size: { w: 2.6, d: 2.3, h: .07 }, budget: 140,
    build(b, p, opts) {
      const meta = newMeta({ focus: [.3, .06, .4] });
      b.bone(opts.parent || 'root');
      p.slab(0, 0, 0, 2.6, .03, 2.3, C.paving2, { thin: 'y', side: C.creamShade });
      onBone(b, opts, 'top', 0, .03, -1.1, () => {
        p.slab(0, .03, 0, 2.54, .03, 2.24, C.paving, { thin: 'y', side: C.cream });
        const W = 2.54 / 4, D = 2.24 / 4;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) p.inlay(-1.27 + W * (i + .5), .06, -1.12 + D * (j + .5), W - .02, D - .02, C.paving2, { lift: .002 });
        for (let i = 1; i < 4; i++) p.inlay(-1.27 + W * i, .06, 0, .012, 2.24, C.joint);
        for (let j = 1; j < 4; j++) p.inlay(0, .06, -1.12 + D * j, 2.54, .012, C.joint);
      });
      stage(meta, b.rig.get((opts.id || 'link') + '.top'), 0, 'fold', { axis: 'x', from: -1.3 });
      meta.anchors = { center: [0, .06, 0] };
      return meta;
    }
  },
  {
    id: 'path', label: 'Camino', group: 'links', size: { w: 2.6, d: .6, h: .05 }, budget: 70,
    build(b, p, opts) {
      const meta = newMeta({ focus: [.4, .04, .2] });
      b.bone(opts.parent || 'root');
      p.slab(0, 0, 0, 2.6, .02, .6, C.turquoiseDark, { thin: 'y', side: edgeTone(C.turquoise, .5) });
      onBone(b, opts, 'top', 0, .02, -.3, () => {
        p.slab(0, .02, 0, 2.56, .02, .56, C.turquoise, { thin: 'y', side: edgeTone(C.turquoise, .5) });
        const joint = shadeTone(C.turquoise, .78);
        for (const x of [-.65, 0, .65]) p.inlay(x, .04, 0, .012, .54, joint);
        p.inlay(0, .04, 0, 2.52, .012, joint);
      });
      stage(meta, b.rig.get((opts.id || 'link') + '.top'), 0, 'fold', { axis: 'x', from: -1.3 });
      meta.anchors = { left: [-1.3, .04, 0], right: [1.3, .04, 0] };
      meta.connectors = [{ side: 'left', type: 'open', at: [-1.3, 0, 0] }, { side: 'right', type: 'open', at: [1.3, 0, 0] }];
      return meta;
    }
  },
  {
    id: 'steps', label: 'Escalones', group: 'links', size: { w: 1, d: .6, h: .3 }, budget: 90,
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .2, .1] });
      b.bone(opts.parent || 'root');
      const id = opts.id || 'link', g = .2, r = .1, Z0 = .3, zig = [];
      for (let i = 0; i < 3; i++) zig.push([i * g, i * r], [i * g, (i + 1) * r]);
      zig.push([.6, .3]);
      p.fold(zig, .94, t, C.ivory, { z: Z0, ry: Math.PI / 2, side: 'right', shade: [.9, 1] });
      const cheek = [[Z0, 0], [Z0, r], [Z0 - 2 * g, .3], [-Z0, .3], [-Z0, 0]];
      for (const s of [-1, 1]) {
        onBone(b, opts, s < 0 ? 'cheekL' : 'cheekR', s * .485, 0, 0, () => side(b, cheek, s * .47, s * .5, C.ivory, C.cream));
        stage(meta, b.rig.get(id + (s < 0 ? '.cheekL' : '.cheekR')), 1, 'fold', { axis: 'z', from: -s * 1.4 });
      }
      meta.anchors = { bottom: [0, 0, .35], top: [0, .3, -.3] };
      return meta;
    }
  }
];

/** Inspection variants: the circulation contract options on show (stairs landing open, bridge ends open, gallery). */
const base = id => PIECES.find(x => x.id === id);
PIECES.push(
  { ...base('stairs'), id: 'stairs-open', label: 'Escalera con descanso abierto', opts: { run: 1.5, rise: 1.7, landing: { open: 'left' } }, build: (b, p, o) => base('stairs').build(b, p, o) },
  { ...base('bridge'), id: 'bridge-open', label: 'Pasarela con extremos abiertos', size: { w: 2.6, d: .5, h: 2.17 }, opts: { len: 2.6, open: ['left', 'right'] }, build: (b, p, o) => base('bridge').build(b, p, o) },
  { ...base('corridor'), id: 'gallery', label: 'Galería de piso superior', size: { w: 2.6, d: .9, h: .46 }, budget: 300, opts: { walkway: true, len: 2.6, w: .9, open: ['back', 'left'] }, build: (b, p, o) => base('corridor').build(b, p, o) }
);
