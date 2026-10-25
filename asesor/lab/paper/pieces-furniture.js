/** Papercraft pieces: furniture. Owner and contract: docs/papercraft/CONTRACT.md. */
import { PAPER as C, T, t, newMeta, edgeTone, shadeTone } from './kit.js';

const PI = Math.PI;

/** Flat sheet in the XY plane at z (front toward +Z), centred on (x, y). Two triangles. */
function plane(b, x, y, z, w, h, hex, rz = 0) {
  const c = Math.cos(rz), s = Math.sin(rz);
  const P = (u, v) => [x + u * c - v * s, y + u * s + v * c, z];
  const a = P(-w / 2, -h / 2), q = P(w / 2, -h / 2), r = P(w / 2, h / 2), e = P(-w / 2, h / 2);
  b.face(a, q, r, hex, [0, 0, 1]).face(a, r, e, hex, [0, 0, 1]);
}

/** Wheel: short square prism with its axis along X, touching the floor at y = 0. */
function wheel(b, p, x, z, r, w, hex) {
  b.push(x + w / 2, r, z, 0, 0, PI / 2);
  p.prism(0, 0, 0, 4, r, w, hex, { ry: PI / 4, top: false });
  b.pop();
}

/** Folded tabletop chair, facing +Z: one sheet (back + seat) and three triangular legs. */
function chair(p, hex) {
  p.shadow(0, 0, .01, .2, .19);
  p.fold([[.14, .52], [.14, .22], [-.16, .22]], .36, t, hex, { ry: PI / 2, ends: false });
  for (const [x, z] of [[-.14, -.12], [.14, -.12], [-.14, .13], [.14, .13]]) p.card(x, .1, z, .03, .2, .03, C.leg, { omit: ['+y', '-y'] });
}

/**
 * Layered screen panel (1.0 × 0.65), centred on (0, yc) with its back at zc - T/2.
 * Outer violet card, inner display card, robot icon and four code lines as sheets.
 */
function screenPanel(b, p, yc, zc) {
  p.card(0, yc, zc, 1.0, .65, T, C.screen, { thin: 'z', omit: ['-z'] });
  const zi = zc + T / 2 + t;
  p.card(0, yc, zc + T / 2 + t / 2, .9, .56, t, C.violetDark, { thin: 'z', omit: ['-z'] });
  const zh = zi + t;
  p.card(-.2, yc - .02, zi + t / 2, .26, .2, t, C.white, { thin: 'z', omit: ['-z'] });
  p.card(-.2, yc + .13, zi + t / 2, .03, .1, t, C.white, { thin: 'z', omit: ['-z'] });
  plane(b, -.2, yc + .19, zh + .002, .05, .05, C.white);
  plane(b, -.25, yc + .01, zh + .004, .05, .05, C.violetDark);
  plane(b, -.15, yc + .01, zh + .004, .05, .05, C.violetDark);
  plane(b, -.2, yc - .07, zh + .004, .12, .025, C.violetDark);
  const lines = [[.3, .14, C.code[0]], [.22, .06, C.code[2]], [.26, -.02, C.code[1]], [.16, -.1, C.code[3]]];
  for (const [w, y, hex] of lines) plane(b, .02 + w / 2, yc + y, zi + .004, w, .04, hex);
}

/** Shelf box: body (no top or bottom), lid as a layer, front handle. Centred on x, standing on y0. */
function shelfBox(b, p, x, y0, hex) {
  p.card(x, y0 + .1, 0, .3, .2, .24, hex, { thin: 'z', omit: ['+y', '-y'] });
  p.slab(x, y0 + .2, 0, .31, t, .25, hex, { edge: edgeTone(hex, .3) });
  plane(b, x, y0 + .12, .121, .1, .02, shadeTone(hex, .85));
}

export const PIECES = [
  {
    id: 'table', label: 'Mesa de trabajo', group: 'furniture', size: { w: .9, d: .55, h: .36 }, budget: 70,
    build(b, p) {
      const meta = newMeta({ focus: [0, .2, 0], anchors: {
        'seat-n': [0, 0, -.48], 'seat-s': [0, 0, .48], 'seat-e': [.66, 0, 0], 'seat-w': [-.66, 0, 0], top: [0, .36, 0]
      } });
      p.shadow(0, 0, 0, .52, .36);
      p.slab(0, .33, 0, .9, T, .55, C.wood, { edge: C.woodEdge });
      for (const [x, z] of [[-.39, -.2], [.39, -.2], [-.39, .2], [.39, .2]]) p.prism(x, 0, z, 4, .022, .33, C.leg, { ry: PI / 4, top: false });
      return meta;
    }
  },
  {
    id: 'chair-orange', label: 'Silla naranja', group: 'furniture', size: { w: .36, d: .34, h: .52 }, budget: 64,
    build(b, p) { chair(p, C.chairOrange); return newMeta({ focus: [0, .26, 0] }); }
  },
  {
    id: 'chair-turquoise', label: 'Silla turquesa', group: 'furniture', size: { w: .36, d: .34, h: .52 }, budget: 64,
    build(b, p) { chair(p, C.chairTurquoise); return newMeta({ focus: [0, .26, 0] }); }
  },
  {
    id: 'laptop', label: 'Laptop', group: 'furniture', size: { w: .22, d: .17, h: .12 }, budget: 40,
    build(b, p) {
      const meta = newMeta({ focus: [0, .05, 0] });
      p.slab(0, 0, 0, .22, .012, .15, C.dark, { edge: C.violetDark });
      p.inlay(0, .012, .02, .18, .07, C.violetDark);
      // Screen hinged on the back edge, opened to about 110 degrees (rx tilts it back).
      b.push(0, .012, -.075, 0, -.35, 0);
      p.card(0, .075, 0, .22, .15, .008, C.dark, { thin: 'z', omit: ['-z'] });
      plane(b, 0, .075, .0065, .19, .12, C.screen);
      plane(b, -.05, .085, .0085, .05, .04, C.white);
      plane(b, -.062, .09, .0095, .008, .008, C.violetDark);
      plane(b, -.038, .09, .0095, .008, .008, C.violetDark);
      plane(b, -.05, .11, .0085, .006, .012, C.white);
      const lines = [[.06, .095, C.code[0]], [.04, .075, C.code[2]], [.05, .055, C.code[3]]];
      for (const [w, y, hex] of lines) plane(b, .02 + w / 2, y, .0085, w, .008, hex);
      b.pop();
      return meta;
    }
  },
  {
    id: 'laptop-closed', label: 'Laptop cerrada', group: 'furniture', size: { w: .22, d: .16, h: .02 }, budget: 16,
    build(b, p) {
      p.slab(0, 0, 0, .22, .02, .16, C.dark, { edge: C.violetDark });
      p.inlay(0, .02, 0, .2, .14, C.screen);
      return newMeta({ focus: [0, .01, 0] });
    }
  },
  {
    id: 'screen', label: 'Pantalla de aula', group: 'furniture', size: { w: 1.0, d: .3, h: 1.03 }, budget: 130,
    build(b, p) {
      const meta = newMeta({ focus: [0, .7, 0], anchors: { screen: [0, .705, 0] } });
      for (const x of [-.3, .3]) {
        p.slab(x, .06, 0, .04, .03, .3, C.leg);
        p.prism(x, .09, 0, 4, .025, .29, C.leg, { ry: PI / 4, top: false });
        for (const z of [-.14, .14]) wheel(b, p, x, z, .03, .03, C.leg);
      }
      screenPanel(b, p, .705, 0);
      return meta;
    }
  },
  {
    id: 'wall-screen', label: 'Pantalla de pared', group: 'furniture', size: { w: 1.0, d: .05, h: .65 }, budget: 90,
    build(b, p) {
      // Origin at the bottom centre; the back of the panel rests on the wall plane z = 0.
      const meta = newMeta({ focus: [0, .33, .02] });
      screenPanel(b, p, .325, .015);
      for (const x of [-.36, .36]) p.card(x, .054, .01, .06, .1, .02, C.leg, { thin: 'z' });
      return meta;
    }
  },
  {
    id: 'resources', label: 'Recursos de proyecto', group: 'furniture', size: { w: 1.0, d: .8, h: .2 }, budget: 160,
    build(b, p) {
      const meta = newMeta({ focus: [0, .08, .1] });
      b.push(0, 0, -.2);
      p.slab(0, 0, 0, .6, T, .4, C.turquoise, { edge: C.turquoiseDark });
      p.wall(-.28, .2, .28, .2, 0, .14, T, C.turquoise);
      p.wall(-.28, -.2, .28, -.2, 0, .14, T, C.turquoise);
      p.wall(-.3, -.195, -.3, .195, 0, .14, T, C.turquoise);
      p.wall(.3, -.195, .3, .195, 0, .14, T, C.turquoise);
      p.slab(-.12, T, -.05, .14, .06, .1, C.violet);
      p.slab(.1, T, -.08, .1, .08, .12, C.orange);
      p.slab(-.02, T, .08, .12, .05, .08, C.yellow);
      b.pop();
      // Three flat cards in front of the box, each with a raised icon (inlay).
      p.slab(-.38, 0, .2, .24, t, .24, C.orange);
      p.inlay(-.38, t, .2, .05, .05, C.ivory, { ry: PI / 4 });
      p.inlay(-.38, t, .245, .03, .012, C.creamShade);
      p.slab(0, 0, .26, .24, t, .24, C.violet);
      p.inlay(0, t, .26, .08, .08, C.white, { ry: PI / 4 });
      p.inlay(0, t, .26, .03, .03, C.violetDark, { lift: .008 });
      p.slab(.38, 0, .2, .24, t, .24, C.turquoise);
      // Glyph "</>" as bars between points (card centre 0.38, 0.2).
      const K = .55;
      const bar = (x1, z1, x2, z2) => {
        x1 *= K; z1 *= K; x2 *= K; z2 *= K;
        const len = Math.hypot(x2 - x1, z2 - z1);
        p.inlay(.38 + (x1 + x2) / 2, t, .2 + (z1 + z2) / 2, len + .012, .012, C.white, { ry: -Math.atan2(z2 - z1, x2 - x1) });
      };
      bar(-.1, -.06, -.16, 0); bar(-.16, 0, -.1, .06);
      bar(-.06, .06, -.02, -.06);
      bar(.04, -.06, .1, 0); bar(.1, 0, .04, .06);
      // Cable as a flat folded strip on the floor.
      p.fold([[-.2, 0], [0, .03], [.2, 0]], .02, t, C.dark, { x: 0, y: 0, z: .42, ends: false });
      return meta;
    }
  },
  {
    id: 'shelf', label: 'Estantería de kits', group: 'furniture', size: { w: .8, d: .3, h: .9 }, budget: 220,
    build(b, p) {
      const meta = newMeta({ focus: [0, .45, 0] });
      p.shadow(0, 0, 0, .5, .2);
      for (const x of [-.385, .385]) p.card(x, .45, 0, .03, .9, .3, C.ivory, { thin: 'x' });
      p.card(0, .45, -.145, .72, .84, .01, C.cream, { thin: 'z', omit: ['-z'] });
      for (const y0 of [0, .3, .6, .87]) p.slab(0, y0, 0, .73, T, .3, C.ivory);
      shelfBox(b, p, -.18, .63, C.violet);
      shelfBox(b, p, .18, .63, C.turquoise);
      shelfBox(b, p, -.18, .33, C.orange);
      shelfBox(b, p, -.18, .03, C.turquoise);
      shelfBox(b, p, .18, .03, C.violet);
      return meta;
    }
  },
  {
    id: 'whiteboard', label: 'Pizarra móvil', group: 'furniture', size: { w: 1.0, d: .5, h: 1.25 }, budget: 140,
    build(b, p) {
      const meta = newMeta({ focus: [0, .9, 0] });
      const yc = .9, zf = .018, zn = .027 + t / 2;
      p.shadow(0, 0, 0, .5, .22);
      p.card(0, yc, 0, 1.0, .7, t, C.ivory, { thin: 'z', omit: ['-z'] });
      p.card(0, yc + .325, zf, 1.0, .05, t, C.turquoise, { thin: 'z', omit: ['-z'] });
      p.card(0, yc - .325, zf, 1.0, .05, t, C.turquoise, { thin: 'z', omit: ['-z'] });
      p.card(-.475, yc, zf, .05, .6, t, C.turquoise, { thin: 'z', omit: ['-z'] });
      p.card(.475, yc, zf, .05, .6, t, C.turquoise, { thin: 'z', omit: ['-z'] });
      p.card(-.25, yc + .1, zn, .12, .12, t, C.orange, { thin: 'z', omit: ['-z'] });
      p.card(-.1, yc - .1, zn, .1, .1, t, C.turquoise, { thin: 'z', omit: ['-z'] });
      p.card(.22, yc + .05, zn, .12, .12, t, C.violetLight, { thin: 'z', omit: ['-z'] });
      p.slab(0, .1, 0, 1.0, .03, .12, C.turquoise);
      for (const x of [-.36, .36]) p.prism(x, .13, -.03, 4, .025, yc - .35 - .13, C.turquoise, { ry: PI / 4, top: false });
      for (const x of [-.44, .44]) wheel(b, p, x, 0, .05, .04, C.leg);
      return meta;
    }
  }
];
