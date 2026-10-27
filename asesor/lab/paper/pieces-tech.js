/**
 * Papercraft pieces: tech (tecnologías educativas, versiones genéricas sin marcas).
 * Owner and contract: docs/papercraft/CONTRACT.md. Reference: sheet 06.
 */
import { PAPER as C, edgeTone } from './kit.js';
import { newMeta } from './kit.js';

const PI = Math.PI;
/** Separation between layered faces (contract: at least .004). */
const GAP = .004;
const FACE_KEYS = ['+x', '-x', '+y', '-y', '+z', '-z'];
/** `omit` list that keeps only one face (a flat printed or cut sheet). */
const only = face => FACE_KEYS.filter(k => k !== face);
const hexPoly = (r, rot = 0, n = 6) => Array.from({ length: n }, (_, i) => [Math.cos(i / n * 2 * PI + rot) * r, Math.sin(i / n * 2 * PI + rot) * r]);
const bone = (b, opts, name, x, y, z, parent) => b.rig.add(opts.id + '.' + name, parent || opts.parent || 'root', x, y, z);

/**
 * Wheel with its axle along X: faceted prism with a flat contact and a cap
 * sheet on the outer side (`sx` +1 right, -1 left). Drawn about the current origin.
 */
function wheelX(b, p, sx, r, w, sides, hex, hubR, hubHex) {
  b.push(-sx * w / 2, 0, 0, 0, 0, -sx * PI / 2);
  p.prism(0, 0, 0, sides, r, w, hex, { ry: PI / sides, topHex: edgeTone(hex, .16) });
  b.pop();
  const rc = r * Math.cos(PI / sides) * 0 + r * .999, cx = -sx * w / 2;
  for (let i = 1; i < sides - 1; i++) {
    const v = k => { const a = (k + .5) / sides * 2 * PI; return [cx, Math.cos(a) * rc, Math.sin(a) * rc]; };
    b.face(v(0), v(i), v(i + 1), edgeTone(hex, .16), [-sx, 0, 0]);
  }
  if (hubR) p.card(sx * (w / 2 + GAP + .003), 0, 0, .006, hubR * 2, hubR * 2, hubHex, { omit: only(sx > 0 ? '+x' : '-x'), rx: PI / 4 });
}
/** Open faceted ring with a visible inside (single-sided material), standing on y0. */
function ring(b, x, y0, z, sides, r, h, outer, inner, rim) {
  const ri = r - .006;
  const pt = (i, y, rr = r) => { const a = (i % sides) / sides * 2 * PI + PI / sides; return [Math.cos(a) * rr, y, Math.sin(a) * rr]; };
  b.push(x, y0, z);
  for (let i = 0; i < sides; i++) {
    const a = (i + .5) / sides * 2 * PI + PI / sides, n = [Math.cos(a), 0, Math.sin(a)], m = [-n[0], 0, -n[2]];
    const p0 = pt(i, 0), p1 = pt(i + 1, 0), p2 = pt(i + 1, h), p3 = pt(i, h);
    b.face(p0, p1, p2, outer, n).face(p0, p2, p3, outer, n);
    const q0 = pt(i, 0, ri), q1 = pt(i + 1, 0, ri), q2 = pt(i + 1, h, ri), q3 = pt(i, h, ri);
    b.face(q0, q1, q2, inner, m).face(q0, q2, q3, inner, m);
    b.face(p3, p2, q2, rim, [0, 1, 0]).face(p3, q2, q3, rim, [0, 1, 0]);
  }
  b.pop();
}
/** Perforated beam lying on the floor, centred at the origin of the current transform. */
function beam(b, p, len, hex, holes) {
  p.card(0, .007, 0, len, .014, .016, hex, { thin: 'y', omit: ['-y'], edge: .4 });
  for (let i = 0; i < holes; i++) p.inlay((i - (holes - 1) / 2) * (len / holes), .014, 0, .007, .007, C.dark, { lift: .004 });
}

export const PIECES = [
  {
    id: 'robot-tale', label: 'Robot para pequeños', group: 'tech', size: { w: .17, d: .13, h: .12 }, budget: 170,
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .06, .03], anchors: { face: [0, .085, .06] } });
      const body = bone(b, opts, 'body', 0, 0, 0);
      const R = .033, W = .02, ap = R * Math.cos(PI / 8);
      const wheels = [[1, .04], [1, -.04], [-1, .04], [-1, -.04]].map(([sx, z], i) => bone(b, opts, 'wheel' + i, sx * .07, ap, z, body));
      b.bone(body);
      p.slab(0, .02, 0, .116, .04, .12, C.yellow, { edge: .4, omit: ['-y', '+x', '-x'] });
      p.slab(0, .06, -.0275, .1, .04, .065, C.yellow, { edge: .4, omit: ['-y', '+z'] });
      // Head: dark face block, turquoise visor cap, two ring eyes.
      p.slab(0, .06, .03, .1, .04, .05, C.dark, { edge: .25, omit: ['-y', '+y', '-z'] });
      p.slab(0, .1, .03, .104, .012, .054, C.turquoise, { edge: .4 });
      for (const sx of [-1, 1]) {
        p.card(sx * .024, .085, .058, .024, .024, .006, C.turquoise, { omit: only('+z') });
      }
      // Front bumper.
      p.card(0, .04, .067, .12, .02, .014, C.turquoise, { omit: ['-z', '-y'], edge: .35 });
      for (const w of wheels) { b.bone(w); wheelX(b, p, w.position.x > 0 ? 1 : -1, R, W, 8, C.dark, .013, C.turquoise); }
      b.bone(body);
      p.shadow(0, 0, 0, .12, .09);
      b.bone(opts.parent || 'root');
      return meta;
    }
  },

  {
    id: 'robot-dino', label: 'Robot de primaria', group: 'tech', size: { w: .17, d: .46, h: .3 }, budget: 280,
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .17, .02], anchors: { head: [0, .28, .12] } });
      const body = bone(b, opts, 'body', 0, 0, 0);
      const head = bone(b, opts, 'head', 0, .26, .1, body);
      const tail = bone(b, opts, 'tail', 0, .16, -.09, body);
      b.bone(body);
      const G = C.green2, G3 = C.green3, L = C.lime;
      // Legs: foot, shin, thigh plate with a turquoise joint disc on each side.
      for (const sx of [-1, 1]) {
        p.card(sx * .05, .01, .02, .034, .02, .075, G, { thin: 'y', side: G3 });
        p.card(sx * .05, .06, -.018, .03, .095, .032, G3, { thin: 'x', side: G, rx: .3 });
        p.card(sx * .0525, .125, -.04, .012, .08, .085, L, { omit: [sx > 0 ? '-x' : '+x'] });
        p.plate(hexPoly(.016), 0, 0, C.turquoise, { x: sx * .0625, y: .125, z: -.04, rz: -sx * PI / 2 });
        // Little arms.
        p.card(sx * .04, .165, .07, .018, .03, .045, G3, { rx: .6 });
        p.plate(hexPoly(.009), 0, 0, C.turquoise, { x: sx * .0535, y: .165, z: .07, rz: -sx * PI / 2 });
      }
      // Torso tilted, front up.
      p.card(0, .155, -.02, .09, .095, .17, G, { thin: 'x', side: G3, rx: -.55 });
      // Back plates (folded spikes).
      p.spike(0, .19, -.065, .018, .035, 4, [L, G3], { seed: 'd1' });
      p.spike(0, .175, -.115, .016, .03, 4, [L, G3], { seed: 'd2' });
      p.spike(0, .155, -.16, .014, .026, 4, [L, G3], { seed: 'd3' });
      // Neck.
      p.card(0, .225, .075, .05, .1, .05, G, { thin: 'x', side: G3, rx: .35 });
      // Head with jaw, teeth, eyes.
      b.bone(head);
      p.card(0, .02, .045, .068, .052, .105, G, { thin: 'x', side: G3 });
      p.card(0, -.014, .04, .056, .014, .09, G3, { thin: 'y', rx: .18 });
      for (const x of [-.02, -.007, .007, .02]) b.face([x - .006, -.004, .094], [x + .006, -.004, .094], [x, -.02, .094], C.white, [0, 0, 1]);
      for (const sx of [-1, 1]) {
        p.card(sx * .04, .03, .06, .004, .014, .014, C.white, { omit: only(sx > 0 ? '+x' : '-x') });
        p.card(sx * .048, .03, .062, .004, .008, .008, C.dark, { omit: only(sx > 0 ? '+x' : '-x') });
        p.plate(hexPoly(.009), 0, 0, C.turquoise, { x: sx * .038, y: .01, z: .01, rz: -sx * PI / 2 });
      }
      // Tail: three tapering sheets.
      b.bone(tail);
      p.card(0, -.01, -.04, .07, .06, .085, G, { thin: 'x', side: G3, rx: -.2 });
      p.card(0, -.035, -.105, .05, .048, .075, G, { thin: 'x', side: G3, rx: -.3 });
      p.card(0, -.065, -.165, .034, .034, .065, G3, { thin: 'x', side: G, rx: -.4 });
      b.bone(body);
      p.shadow(0, 0, -.03, .12, .24);
      b.bone(opts.parent || 'root');
      return meta;
    }
  },

  {
    id: 'kit-spike', label: 'Kit de robótica programable', group: 'tech', size: { w: .3, d: .22, h: .06 }, budget: 250,
    build(b, p, opts) {
      const meta = newMeta({ focus: [-.06, .04, 0] });
      const hub = bone(b, opts, 'hub', -.06, .042, -.02);
      b.bone(opts.parent || 'root');
      // Chassis plate, two motors with turquoise shafts, two wheels.
      p.slab(-.06, .03, 0, .15, .012, .12, C.cream, { edge: .2 });
      for (const x of [-.095, -.025]) {
        p.slab(x, .042, .038, .04, .035, .03, C.white, { thin: 'y', edge: .1 });
        p.card(x, .06, .062, .01, .01, .016, C.turquoise, { omit: ['-z'] });
      }
      for (const [sx, x] of [[-1, -.149], [1, .029]]) {
        b.push(x, .0277, -.02);
        wheelX(b, p, sx, .03, .02, 8, C.dark, .012, C.turquoise);
        b.pop();
      }
      // Hub: white body, yellow stripe, dot screen.
      b.bone(hub);
      p.slab(0, 0, 0, .075, .035, .075, C.white, { edge: .15 });
      p.slab(0, .035, -.02, .075, .008, .03, C.yellow);
      p.inlay(0, .035, .017, .042, .032, C.dark);
      for (const [x, z] of [[0, 0], [-.01, 0], [.01, 0], [0, -.008], [0, .008]]) p.inlay(x, .035, .017 + z, .006, .006, C.yellow, { lift: .008 });
      b.bone(opts.parent || 'root');
      // Loose perforated beams and blocks on the table.
      b.push(.095, 0, .075, -.1); beam(b, p, .1, C.yellow, 5); b.pop();
      b.push(.09, 0, .01, .25); beam(b, p, .1, C.blue, 5); b.pop();
      b.push(.085, 0, -.065, -.2); beam(b, p, .1, C.yellow, 5); b.pop();
      p.slab(.02, 0, .085, .02, .02, .02, C.blue, { thin: 'y' });
      p.slab(-.02, 0, .09, .03, .013, .02, C.yellow, { thin: 'y' });
      p.shadow(-.01, 0, 0, .19, .12);
      return meta;
    }
  },

  {
    id: 'electronics', label: 'Electrónica', group: 'tech', size: { w: .32, d: .2, h: .075 }, budget: 230,
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .03, 0] });
      p.slab(0, 0, 0, .3, .012, .17, C.dark, { edge: .15 });
      p.slab(-.01, .012, 0, .24, .014, .12, C.ivory, { edge: .2 });
      const top = .026;
      p.inlay(-.01, top, 0, .22, .01, C.leg);
      for (const z of [-.045, -.03, .03, .045]) for (let i = 0; i < 6; i++) p.inlay(-.095 + i * .03, top, z, .008, .008, C.leg);
      // Chips and components.
      p.slab(-.04, top, 0, .05, .014, .022, C.dark, { edge: .15 });
      p.slab(.045, top, 0, .05, .014, .022, C.dark, { edge: .15 });
      p.slab(-.09, top, -.06, .01, .02, .01, C.red);
      p.slab(.07, top, .06, .01, .02, .01, C.yellow);
      p.slab(-.07, top, .06, .01, .02, .01, C.blue);
      p.slab(.095, top, -.06, .022, .01, .01, C.orange);
      // Jumper wires: ribbons folded into arches.
      p.fold([[-.09, 0], [-.07, .04], [-.05, .04], [-.03, 0]], .008, .005, C.red, { y: top, z: -.02 });
      p.fold([[-.05, 0], [-.025, .05], [.0, .05], [.025, 0]], .008, .005, C.orange, { y: top, z: .022 });
      p.fold([[.03, 0], [.05, .04], [.07, .04], [.09, 0]], .008, .005, C.turquoise, { y: top, z: -.028 });
      p.shadow(0, 0, 0, .21, .13);
      return meta;
    }
  },

  {
    id: 'drone', label: 'Dron educativo', group: 'tech', size: { w: .36, d: .36, h: .07 }, budget: 300,
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .04, 0], anchors: { camera: [0, .04, .06] } });
      const props = [];
      const corners = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
      corners.forEach(([sx, sz], i) => props.push(bone(b, opts, 'prop' + i, sx * .11, .052, sz * .11)));
      b.bone(opts.parent || 'root');
      // Central hex body: white under, violet top, dark camera on the front.
      p.plate(hexPoly(.062), .03, .02, C.white, { edge: .15 });
      p.plate(hexPoly(.044), .054, 0, C.violet);
      p.card(0, .04, .06, .03, .016, .012, C.dark, { omit: ['-z', '-y'] });
      corners.forEach(([sx, sz]) => {
        p.card(sx * .055, .04, sz * .055, .15, .01, .014, C.white, { thin: 'y', omit: ['-y', '+x', '-x'], ry: -sx * sz * PI / 4 });
        p.card(sx * .035, .015, sz * .035, .012, .03, .012, C.violetDark, { omit: ['-y', '+y'] });
        ring(b, sx * .11, .03, sz * .11, 8, .07, .025, C.turquoise, C.turquoiseDark, C.turquoiseLight);
      });
      props.forEach((pr, i) => {
        b.bone(pr);
        const a0 = i % 2 ? PI / 4 : -PI / 6;
        p.card(0, 0, 0, .1, .004, .014, C.orange, { omit: only('+y'), ry: a0 });
        p.card(0, .005, 0, .1, .004, .014, C.orange, { omit: only('+y'), ry: a0 + PI / 2 });
      });
      b.bone(opts.parent || 'root');
      p.shadow(0, 0, 0, .2, .2);
      return meta;
    }
  },

  {
    id: 'controller', label: 'Control remoto', group: 'tech', size: { w: .12, d: .065, h: .04 }, budget: 60,
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .02, 0] });
      p.slab(0, 0, 0, .12, .022, .065, C.dark, { edge: .15 });
      for (const sx of [-1, 1]) p.prism(sx * .033, .022, .012, 4, .008, .014, C.leg, { ry: PI / 4, topHex: C.turquoise });
      for (const [x, z] of [[-.01, -.018], [.01, -.018], [.045, -.012], [.045, .004]]) p.inlay(x, .022, z, .009, .009, C.turquoise);
      p.slab(.045, .022, -.028, .006, .03, .006, C.leg);
      p.shadow(0, 0, 0, .09, .06);
      return meta;
    }
  },

  {
    id: 'vr-headset', label: 'Visor de realidad virtual', group: 'tech', size: { w: .18, d: .2, h: .08 }, budget: 110,
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .04, 0], anchors: { eyes: [0, .04, -.05] } });
      p.card(0, .04, 0, .15, .075, .08, C.white, { thin: 'z', edge: .1 });
      p.card(0, .04, .049, .09, .082, .018, C.white, { thin: 'z', edge: .1, omit: ['-z', '-y'] });
      for (const sx of [-1, 1]) p.card(sx * .0615, .04, .043, .035, .082, .018, C.white, { thin: 'z', edge: .1, omit: ['-z', '-y'], ry: sx * .35 });
      p.card(0, .04, -.05, .13, .06, .02, C.dark, { thin: 'z', omit: ['+z'], edge: .25 });
      // Goggle cues on the front plate: two dark lenses and a nose notch, so it never reads as a white box.
      const front = .058 + GAP;
      for (const sx of [-1, 1]) p.card(sx * .026, .05, front + .002, .036, .026, .004, C.violetDeep, { thin: 'z', omit: only('+z') });
      b.face([-.017, .0, front], [.017, .0, front], [0, .02, front], C.dark, [0, 0, 1]);
      // Slim violet head strap, thinner than the shell so it reads as a band, not a frame.
      for (const sx of [-1, 1]) p.card(sx * .0775, .042, -.088, .008, .016, .086, C.violet, { thin: 'x', omit: ['-y'] }); // ends where the back band starts
      p.card(0, .042, -.135, .163, .016, .008, C.violet, { thin: 'z', omit: ['-y'] });
      for (const sx of [-1, 1]) p.card(sx * .0825 + sx * GAP, .04, -.02, .008, .05, .05, C.turquoise, { thin: 'x', omit: [sx > 0 ? '-x' : '+x'] });
      p.shadow(0, 0, -.04, .11, .13);
      return meta;
    }
  },

  {
    id: 'hologram', label: 'Holograma', group: 'tech', size: { w: .2, d: .2, h: .35 }, budget: 150,
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .27, 0] });
      const float = bone(b, opts, 'float', 0, .21, 0);
      b.bone(opts.parent || 'root');
      p.prism(0, 0, 0, 6, .045, .012, C.violetLight, { ry: PI / 6 });
      p.glass(0, .105, 0, .008, .21, .008);
      p.shadow(0, 0, 0, .1);
      b.bone(float);
      // Floating faceted island: dark-green belt over an inverted turquoise pyramid.
      const hex = hexPoly(.075, PI / 6), tones = [C.turquoise, C.turquoiseDark, C.turquoiseLight];
      const belts = [C.green3, C.moss, C.green2];
      for (let i = 0; i < 6; i++) {
        const a = hex[i], c = hex[(i + 1) % 6], mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
        b.face([a[0], .045, a[1]], [c[0], .045, c[1]], [0, 0, 0], tones[i % 3], [mx, -.03, mz]);
        const o = [mx, 0, mz];
        b.face([a[0], .045, a[1]], [c[0], .045, c[1]], [c[0], .075, c[1]], belts[i % 3], o).face([a[0], .045, a[1]], [c[0], .075, c[1]], [a[0], .075, a[1]], belts[i % 3], o);
      }
      p.plate(hex, .075, 0, C.green);
      p.slab(0, .075, 0, .012, .03, .012, C.trunk);
      p.spike(0, .09, 0, .026, .035, 5, [C.green2, C.green3], { seed: 'h1' });
      p.spike(0, .11, 0, .018, .03, 5, [C.lime, C.green], { seed: 'h2' });
      p.spike(.045, .075, .02, .012, .03, 4, [C.turquoiseLight, C.glass], { seed: 'h3' });
      p.spike(-.04, .075, -.03, .01, .024, 4, [C.turquoiseLight, C.glass], { seed: 'h4' });
      // Cloud of cards.
      p.card(-.1, .09, .02, .05, .018, .032, C.white, { edge: .05 });
      p.card(-.085, .106, .02, .032, .016, .026, C.white, { edge: .05 });
      p.card(-.118, .104, .02, .028, .014, .022, C.white, { edge: .05 });
      b.bone(opts.parent || 'root');
      return meta;
    }
  },

  {
    // Electronics bench and teacher training: an open tray of sorted components (sheet 06, electronics).
    id: 'component-tray', label: 'Bandeja de componentes', group: 'tech', size: { w: .16, d: .11, h: .03 }, budget: 60,
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .015, 0] });
      const W = .08, D = .055, H = .026, w = .006; // half sizes, wall height and thickness
      const quad = (a, c, d, e, hex, n) => b.face(a, c, d, hex, n).face(a, d, e, hex, n);
      const out = C.turquoise, inside = C.turquoiseDark, rim = C.turquoiseLight;
      // Open box folded from one sheet: outer walls, inner walls, rim and floor (the bottom never shows).
      const ring = [[-W, -D], [W, -D], [W, D], [-W, D]], inner = [[-W + w, -D + w], [W - w, -D + w], [W - w, D - w], [-W + w, D - w]];
      for (let i = 0; i < 4; i++) {
        const [a, c] = [ring[i], ring[(i + 1) % 4]], [ai, ci] = [inner[i], inner[(i + 1) % 4]];
        const n = [c[1] - a[1], 0, a[0] - c[0]];
        quad([a[0], 0, a[1]], [c[0], 0, c[1]], [c[0], H, c[1]], [a[0], H, a[1]], out, n);
        quad([ci[0], .004, ci[1]], [ai[0], .004, ai[1]], [ai[0], H, ai[1]], [ci[0], H, ci[1]], inside, n.map(v => -v));
        quad([a[0], H, a[1]], [c[0], H, c[1]], [ci[0], H, ci[1]], [ai[0], H, ai[1]], rim, [0, 1, 0]);
      }
      quad([-W + w, .004, D - w], [W - w, .004, D - w], [W - w, .004, -D + w], [-W + w, .004, -D + w], C.ivory, [0, 1, 0]);
      // Divider and sorted components (flat chips at two heights, never coplanar with the floor).
      p.card(0, H / 2, 0, .004, H - .004, 2 * (D - w), rim, { omit: ['-y', '-z', '+z'] });
      const parts = [[-.05, -.025, C.dark], [-.025, .02, C.red], [-.055, .022, C.yellow], [.03, -.022, C.orange], [.055, .02, C.blue], [.03, .022, C.dark], [.055, -.02, C.yellow]];
      parts.forEach(([x, z, hex], i) => p.inlay(x, .006 + (i % 2) * .004, z, .02, .016, hex));
      p.shadow(0, 0, 0, .1, .07);
      return meta;
    }
  },
  {
    id: 'kit-box', label: 'Caja de equipo', group: 'tech', size: { w: .2, d: .08, h: .26 }, budget: 60, opts: { color: C.orange },
    build(b, p, opts) {
      const meta = newMeta({ focus: [0, .13, .04] });
      const col = opts.color || C.orange;
      p.card(0, .13, 0, .2, .26, .07, C.ivory, { thin: 'z', side: C.cream, omit: ['-y'] });
      p.card(0, .13, .038, .19, .25, .006, col, { omit: ['-z'], edge: .35 });
      p.card(0, .14, .044, .15, .17, .006, C.ivory, { omit: ['-z'], edge: .1 });
      // Robot silhouette in layers.
      p.card(0, .115, .05, .09, .05, .006, C.yellow, { omit: ['-z'], edge: .3 });
      p.card(0, .155, .0535, .06, .036, .004, C.dark, { omit: only('+z') });
      for (const sx of [-1, 1]) {
        p.card(sx * .016, .155, .0585, .014, .014, .004, C.turquoise, { omit: only('+z') });
        p.card(sx * .034, .088, .0535, .026, .026, .004, C.dark, { omit: only('+z') });
      }
      p.shadow(0, 0, 0, .15, .08);
      return meta;
    }
  }
];
