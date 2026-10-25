/** Papercraft pieces: nature. Owner and contract: docs/papercraft/CONTRACT.md. */
import { PAPER as C, T, t, newMeta, shadeTone, edgeTone } from './kit.js';

const TAU = Math.PI * 2, HALF = Math.PI / 2;

/** Square frustum for the pot: outer radius grows from RB (base) to RT (rim). */
const POT = { H: .36, RB: .12, RT: .17, TH: t };
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

/** Convex canopy outline in (u, v) = (horizontal, height). */
function canopyPoly(n, cx, cy, rx, ry) {
  return Array.from({ length: n }, (_, i) => {
    const a = i / n * TAU, k = 1 + (i % 2 ? .05 : -.03);
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
}

/**
 * Vertical convex card (silhouette card, the cross-tree leaves). Outline [u, v]
 * is drawn in the XY plane (axis 'z', thickness along Z) or the ZY plane (axis
 * 'x', thickness along X). `both` draws the back face too.
 */
function sheet(b, pts, axis, hex, edge, both) {
  const P = (u, v, s) => (axis === 'z' ? [u, v, s] : [s, v, u]);
  const h = T / 2, n = pts.length, nf = axis === 'z' ? [0, 0, 1] : [1, 0, 0];
  const nb = nf.map(v => -v);
  for (let i = 1; i < n - 1; i++) {
    b.face(P(...pts[0], h), P(...pts[i], h), P(...pts[i + 1], h), hex, nf);
    if (both) b.face(P(...pts[0], -h), P(...pts[i], -h), P(...pts[i + 1], -h), hex, nb);
  }
  const cu = pts.reduce((s, q) => s + q[0], 0) / n, cv = pts.reduce((s, q) => s + q[1], 0) / n;
  for (let i = 0; i < n; i++) {
    const a = pts[i], c = pts[(i + 1) % n], out = P((a[0] + c[0]) / 2 - cu, (a[1] + c[1]) / 2 - cv, 0);
    const A = P(...a, h), Cc = P(...c, h), D = P(...c, -h), E = P(...a, -h);
    b.face(A, Cc, D, edge, out); b.face(A, D, E, edge, out);
  }
}

export const PIECES = [
  {
    id: 'tree-large', label: 'Árbol grande', group: 'nature', size: { w: 1.1, d: 1.0, h: 1.6 }, budget: 230,
    build(b, p) {
      const meta = newMeta({ focus: [0, .8, 0] });
      p.shadow(0, 0, 0, .34, .3);
      // Trunk top and branch tops sit inside the canopy (not visible), so no caps there.
      p.prism(0, 0, 0, 5, .07, .8, C.trunk, { taper: .8, top: false });
      // Two short branches leaning into the canopy (rz < 0 leans toward +X).
      b.push(0, .5, 0, 0, 0, -.6); p.prism(0, 0, 0, 3, .035, .36, C.trunkDark, { taper: .8, top: false }); b.pop();
      b.push(0, .5, 0, 0, 0, .6); p.prism(0, 0, 0, 3, .035, .36, C.trunkDark, { taper: .8, top: false }); b.pop();
      p.crown(0, 1.1, 0, .44, [C.green, C.green2, C.lime], { seed: 'tl-crown-a', sy: .95, creases: true });
      p.crown(.3, 1.0, .1, .3, [C.green2, C.green3, C.green], { seed: 'tl-crown-b', sy: .95, creases: true });
      p.spike(-.24, 0, .08, .1, .22, 5, [C.green, C.green2], { seed: 'tl-s1' });
      p.spike(.22, 0, -.1, .09, .18, 5, [C.green2, C.green3], { seed: 'tl-s2' });
      p.spike(.05, 0, .24, .08, .16, 5, [C.lime, C.green], { seed: 'tl-s3' });
      return meta;
    }
  },
  {
    id: 'tree-small', label: 'Árbol pequeño', group: 'nature', size: { w: .8, d: .8, h: 1.1 }, budget: 160,
    build(b, p) {
      const meta = newMeta({ focus: [0, .55, 0] });
      p.shadow(0, 0, 0, .26, .22);
      p.prism(0, 0, 0, 5, .06, .55, C.trunk, { taper: .8 });
      b.push(0, .42, 0, 0, 0, -.6); p.prism(0, 0, 0, 4, .03, .25, C.trunkDark, { taper: .8 }); b.pop();
      b.push(0, .42, 0, 0, 0, .6); p.prism(0, 0, 0, 4, .03, .25, C.trunkDark, { taper: .8 }); b.pop();
      p.crown(0, .8, 0, .34, [C.green, C.green2, C.lime], { seed: 'ts-crown', sy: .95, creases: true });
      p.spike(-.2, 0, .1, .09, .18, 5, [C.green, C.green2], { seed: 'ts-s1' });
      p.spike(.19, 0, -.06, .08, .14, 5, [C.green2, C.green3], { seed: 'ts-s2' });
      return meta;
    }
  },
  {
    id: 'tree-cards', label: 'Árbol de tarjetas en cruz', group: 'nature', size: { w: .96, d: .96, h: 1.26 }, budget: 90,
    build(b, p) {
      const meta = newMeta({ focus: [0, .75, 0] });
      p.shadow(0, 0, 0, .26, .26);
      p.prism(0, 0, 0, 4, .06, .6, C.trunk, { top: false });
      const poly = canopyPoly(8, 0, .84, .47, .42);
      // Card A lies in the XY plane (front faces +Z); card B crosses it in the ZY plane (front faces +X).
      // Both faces of each card are drawn (back faces wound toward -Z / -X).
      sheet(b, poly, 'z', C.green, edgeTone(C.green, .3), true);
      sheet(b, poly, 'x', C.green2, edgeTone(C.green2, .3), true);
      return meta;
    }
  },
  {
    id: 'bush', label: 'Arbusto plegado', group: 'nature', size: { w: .8, d: .7, h: .7 }, budget: 170,
    build(b, p) {
      const meta = newMeta({ focus: [0, .3, 0] });
      const cols = [C.green, C.green2, C.lime, C.green3];
      p.crystal(-.2, 0, .05, .2, .16, cols, { seed: 'bu-1', creases: true });
      p.crystal(.16, 0, -.08, .21, .17, cols, { seed: 'bu-2', creases: true });
      p.crystal(-.02, 0, .17, .15, .12, cols, { seed: 'bu-3' });
      p.crystal(-.03, 0, -.18, .14, .11, cols, { seed: 'bu-4' });
      return meta;
    }
  },
  {
    id: 'plant-rhombus', label: 'Planta de hojas en rombo', group: 'nature', size: { w: .9, d: .9, h: .8 }, budget: 70,
    build(b, p) {
      const meta = newMeta({ focus: [0, .35, 0] });
      p.shadow(0, 0, 0, .2, .2);
      const cols = [C.green, C.green2, C.lime, C.green3];
      p.leaf(0, .02, 0, .7, .24, C.green2, { rx: .08 });
      for (let i = 0; i < 6; i++) {
        const tilt = i % 2 ? .95 : .6, len = i % 2 ? .6 : .66;
        b.push(0, .02, 0, i * TAU / 6 + .3, 0, 0);
        p.leaf(0, 0, 0, len, .22, cols[i % cols.length], { rz: tilt });
        b.pop();
      }
      return meta;
    }
  },
  {
    id: 'flowers', label: 'Flores', group: 'nature', size: { w: 1.0, d: .8, h: .6 }, budget: 160,
    build(b, p) {
      const meta = newMeta({ focus: [0, .32, 0] });
      p.shadow(0, 0, 0, .42, .34);
      const greens = [C.green, C.green2, C.green3, C.lime];
      p.spike(-.3, 0, .1, .17, .3, 5, greens, { seed: 'fl-s1' });
      p.spike(.3, 0, -.05, .17, .28, 5, greens, { seed: 'fl-s2' });
      p.spike(-.05, 0, -.24, .16, .26, 5, greens, { seed: 'fl-s3' });
      p.spike(.06, 0, .2, .15, .22, 5, greens, { seed: 'fl-s4' });
      // Flat five-petal flower, diameter ~0.16: each petal is a rounded fan (6 points) in the local XZ plane.
      // The frame tilts the flower toward the camera.
      const flower = (x, y, z, hex, tilt, seed) => {
        b.push(x, y, z, 0, tilt, 0);
        const up = [0, 1, 0];
        for (let k = 0; k < 5; k++) {
          const a0 = k * TAU / 5 + (seed % 2) * .3;
          const pt = (r, a) => [Math.cos(a) * r, 0, Math.sin(a) * r];
          const P = [[0, 0, 0], pt(.045, a0 - .5), pt(.08, a0 - .25), pt(.085, a0), pt(.08, a0 + .25), pt(.045, a0 + .5)];
          for (let i = 1; i < P.length - 1; i++) b.face(P[0], P[i], P[i + 1], hex, up);
        }
        p.prism(0, 0, 0, 4, .022, .03, C.orange, { top: false });
        b.pop();
      };
      flower(-.2, .34, .14, C.yellow, HALF - .4, 0);
      flower(.2, .3, .06, C.pink, HALF - .35, 1);
      flower(.02, .24, -.16, C.pink, HALF - .45, 2);
      return meta;
    }
  },
  {
    id: 'pot', label: 'Maceta', group: 'nature', size: { w: .4, d: .4, h: .7 }, budget: 120,
    build(b, p) {
      const meta = newMeta({ focus: [0, .4, 0] });
      const { H, RB, RT, TH } = POT;
      const q = (a, c, d, e, hex, n) => { b.face(a, c, d, hex, n); b.face(a, d, e, hex, n); };
      const rad = (y, inner) => { const v = RB + (RT - RB) * y / H; return inner ? v - TH : v; };
      const at = (i, y, inner) => { const [sx, sz] = CORNERS[i], k = rad(y, inner); return [sx * k, y, sz * k]; };
      const mid = i => { const a = CORNERS[i], c = CORNERS[(i + 1) % 4]; return [a[0] + c[0], 0, a[1] + c[1]]; };
      p.shadow(0, 0, 0, .2, .2);
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4, m = mid(i);
        q(at(i, 0), at(j, 0), at(j, H), at(i, H), C.white, m);                                   // outer wall
        q(at(i, TH, true), at(j, TH, true), at(j, H, true), at(i, H, true), shadeTone(C.white, .86), [-m[0], 0, -m[2]]); // inner wall
        q(at(i, H), at(j, H), at(j, H, true), at(i, H, true), C.cream, [0, 1, 0]);             // rim band (cut edge)
      }
      q(at(0, TH, true), at(1, TH, true), at(2, TH, true), at(3, TH, true), C.creamShade, [0, 1, 0]); // floor
      p.inlay(0, .3, 0, .27, .27, C.soil);
      // Four folded leaves fanned out, plus one upright crystal leaf.
      for (const [ry, tilt, hex] of [[0, .5, C.green2], [HALF, .5, C.green], [Math.PI, .5, C.green2], [Math.PI + HALF, .5, C.green]]) {
        b.push(0, .29, 0, ry, 0, 0);
        p.leaf(0, 0, 0, .4, .14, hex, { rz: tilt });
        b.pop();
      }
      p.leaf(0, .29, 0, .48, .15, C.lime, {});
      return meta;
    }
  },
  {
    id: 'planter', label: 'Jardinera', group: 'nature', size: { w: 1.0, d: .45, h: .6 }, budget: 300, opts: { w: 1.0, d: .45 },
    build(b, p, opts = {}) {
      const W = opts.w ?? 1.0, D = opts.d ?? .45, H = .32;
      const meta = newMeta({ focus: [0, .3, 0] });
      p.shadow(0, 0, 0, W / 2, D / 2);
      // Four cardboard walls, not a solid block: front/back span the full width.
      p.card(0, H / 2, -(D / 2 - T / 2), W, H, T, C.white);
      p.card(0, H / 2, D / 2 - T / 2, W, H, T, C.white);
      p.card(-(W / 2 - T / 2), H / 2, 0, T, H, D - 2 * T, C.white);
      p.card(W / 2 - T / 2, H / 2, 0, T, H, D - 2 * T, C.white);
      p.slab(0, 0, 0, W - 2 * T, T, D - 2 * T, C.white);
      p.inlay(0, .24, 0, W - 2 * T - .02, D - 2 * T - .02, C.soil);
      // Low, wide crystal clumps. Inner walls sit at |x| <= W/2 - T and |z| <= D/2 - T; the spikes
      // keep >= 0.04 from them (max ring radius is 1.15 r): clump centres at x = ±0.22 / 0,
      // offsets within ±0.035 in x and ±0.015 in z, r = 0.09–0.11.
      const soil = .25;
      const clumps = [[-.22 * W, 0, C.green, C.green2], [0, 0, C.green2, C.green3], [.22 * W, 0, C.green, C.lime]];
      clumps.forEach(([x, z, c1, c2], i) => {
        p.crystal(x - .03, soil, z + .015, .11, .088, [c1, c2], { seed: 'pl-a' + i, creases: true });
        p.crystal(x + .035, soil, z - .015, .1, .08, [c2, c1], { seed: 'pl-b' + i });
      });
      return meta;
    }
  },
  {
    id: 'bench', label: 'Banca', group: 'nature', size: { w: .9, d: .32, h: .52 }, budget: 60,
    build(b, p) {
      const meta = newMeta({ focus: [0, .25, 0] });
      p.shadow(0, 0, 0, .5, .2);
      // Seat and backrest: one folded sheet. The profile lies in local XY; with
      // ry = PI/2 its width runs along X and local x maps to -Z (front is +Z).
      p.fold([[-.16, .24], [.13, .24], [.16, .52]], .9, T, C.orange, { ry: HALF, side: 'left' });
      // Legs: two side sheets under the seat.
      p.wall(-.42, -.13, -.42, .13, 0, .222, T, C.orange);
      p.wall(.42, -.13, .42, .13, 0, .222, T, C.orange);
      return meta;
    }
  }
];
