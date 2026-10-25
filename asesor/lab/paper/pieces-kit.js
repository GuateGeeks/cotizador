/**
 * Papercraft pieces: kit. The construction vocabulary itself (reference sheet
 * 01-materiales). Also the worked example for authors of the other groups.
 */
import { PAPER as C, T, t, newMeta, stage } from './kit.js';

export const PIECES = [
  {
    id: 'kit-sheet', label: 'Lámina con espesor', group: 'kit', size: { w: .9, d: .6, h: .04 }, budget: 12,
    build(b, p) { p.slab(0, 0, 0, .9, T, .6, C.violet, { edge: .55 }); return newMeta({ focus: [.3, 0, .2] }); }
  },
  {
    id: 'kit-edge', label: 'Canto cortado', group: 'kit', size: { w: .9, d: .6, h: .06 }, budget: 12,
    build(b, p) { p.slab(0, 0, 0, .9, .06, .6, C.cream, { edge: .2 }); return newMeta({ focus: [.4, .03, .25] }); }
  },
  {
    id: 'kit-valley', label: 'Pliegue en valle', group: 'kit', size: { w: 1, d: .6, h: .3 }, budget: 40,
    build(b, p) {
      p.fold([[-.5, .28], [-.17, 0], [.17, .28], [.5, 0]], .6, t, C.ivory, { side: 'right', y: t * 1.6 }); // lifted: the sheet's thickness stays above the ground
      return newMeta({ focus: [-.17, .05, .25] });
    }
  },
  {
    id: 'kit-mountain', label: 'Pliegue en montaña', group: 'kit', size: { w: .9, d: .6, h: .3 }, budget: 24,
    build(b, p) { p.fold([[-.45, 0], [0, .3], [.45, 0]], .6, t, C.turquoise); return newMeta({ focus: [0, .28, .25] }); }
  },
  {
    id: 'kit-tab', label: 'Pestaña de unión', group: 'kit', size: { w: .8, d: .6, h: .5 }, budget: 60,
    build(b, p) {
      p.slab(0, 0, -.1, .8, .02, .6, C.cream);
      p.wall(-.12, -.05, .2, -.05, 0, .5, T, C.violet);
      p.tab(.04, .022, -.03, .28, .14, C.ivory, { rx: -.12 }); // rests on the base, never past its edge
      return newMeta({ focus: [.04, .03, .05] });
    }
  },
  {
    id: 'kit-frame', label: 'Capas superpuestas', group: 'kit', size: { w: .9, d: .2, h: .6 }, budget: 130,
    build(b, p) {
      p.wall(-.45, 0, .45, 0, 0, .6, T, C.violet);
      p.card(0, .3, .02, .44, .26, .01, C.orange, { thin: 'z' });
      p.frame(0, .3, .016, .58, .38, .07, t, C.ivory);
      p.frame(0, .3, .016 + t, .52, .32, .05, t, C.ivory);
      return newMeta({ focus: [.2, .3, .05] });
    }
  },
  {
    id: 'kit-roof', label: 'Cubierta articulada', group: 'kit', size: { w: 1, d: .7, h: .45 }, budget: 60,
    build(b, p) {
      const meta = newMeta({ focus: [0, .32, .3] });
      p.slab(0, 0, 0, 1, .3, .6, C.violet);
      const hinge = b.rig.add('kit-roof.lid', 'root', 0, .3 + t, -.32);
      b.bone(hinge);
      // Lid authored closed: one sheet folded down at the front (profile along +Z
      // via ry). The stage swings it open around the back-edge hinge.
      p.fold([[0, 0], [.64, 0], [.66, -.12]], 1.02, t, C.violetLight, { ry: -Math.PI / 2, side: 'right' });
      stage(meta, hinge, 2, 'fold', { axis: 'x', from: -1.1 });
      b.bone(b.rig.root);
      return meta;
    }
  },
  {
    id: 'kit-prism', label: 'Prisma plegado', group: 'kit', size: { w: .4, d: .4, h: .6 }, budget: 24,
    build(b, p) { p.prism(0, 0, 0, 6, .18, .6, C.orange); p.shadow(0, 0, 0, .26); return newMeta({ focus: [0, .5, 0] }); }
  },
  {
    id: 'kit-contact', label: 'Sombra de contacto', group: 'kit', size: { w: .7, d: .45, h: .55 }, budget: 260,
    build(b, p) {
      p.slab(0, 0, 0, .66, .2, .4, C.white, { edge: .1 });
      p.inlay(0, .2, 0, .6, .34, C.soil);
      p.crown(-.1, .34, 0, .17, [C.green, C.green2, C.lime], { seed: 'k1', sy: 1.15, creases: true });
      p.crown(.13, .3, .03, .13, [C.green2, C.green3, C.green], { seed: 'k2', creases: true });
      p.shadow(0, 0, 0, .44, .3);
      return newMeta({ focus: [0, .3, .2] });
    }
  }
];
