/**
 * Primaria students from the Meshy models (docs/papercraft/reference/meshy): `nino` (trousers) and
 * `nina` (skirt, pigtails). Each generated data module holds the simplified body split by bone,
 * with a texture class per face; this file only places it on the rig and colours it from the
 * person spec (skin, hair, vest, backpack, shoes).
 *
 * The data is in H units on the root rest pose (sole at y = 0, +Z front). The builder takes
 * vertices local to the active bone, whose rest transform is a pure translation, so the emitted
 * vertex is H · (v − pivot(bone)). Winding is the GLB's (counter-clockwise seen from outside).
 */
import * as nino from './primaria-meshy-data.js';
import * as nina from './primaria-meshy-nina-data.js';

/** Models by key: { SOURCE, CLASSES, RIG_H, LANDMARKS_H, VARIANTS }. */
export const MESHY_MODELS = Object.freeze({ nino, nina });
const M = model => MESHY_MODELS[model] || nino;

/** Painted features: hidden under the VR goggles. */
const FACE = new Set(['eyeL', 'eyeR', 'smile']);
const INK = '#321853'; // eyes and smile, as recipe P04/P05
const BAG = '#19BCCD'; // the primaria backpack (recipe P19)

/** Variant: standing students carry the backpack; seated ones the plain back. */
const variant = (model, bag) => M(model).VARIANTS[bag ? 'bag' : 'plain'];

/** Part ids (data ids; components are 'M-' + id) and triangles for a configuration (data order). */
export function meshyParts({ model, bag, headset }) {
  return variant(model, bag).parts.filter(p => !(headset && FACE.has(p.id))).map(p => [p.id, p.faces.length]);
}

/** Rig in scene units, parent-relative (the rest pose only translates). */
export function meshyRig(model, H) {
  const R = M(model).RIG_H, rel = id => { const b = R[id], p = b.parent ? R[b.parent].at : [0, 0, 0]; return b.at.map((x, k) => (x - p[k]) * H); };
  return Object.fromEntries(Object.keys(R).filter(k => k !== 'root').map(k => [k, rel(k)]));
}

/** Landmarks in scene units. */
export function meshyLandmarks(model, H) {
  return Object.fromEntries(Object.entries(M(model).LANDMARKS_H).map(([k, v]) => [k, v * H]));
}

/**
 * Emit parts through the person's counting emitter. `ctx`: { at, bone, e, bones, pr, H, tone },
 * `tone(hex, normal)` tints each facet by its normal like the hand-built pieces.
 */
export function emitMeshy(ctx, ids, model, bag) {
  const { at, bone, e, bones, pr, H, tone } = ctx, { RIG_H, CLASSES } = M(model);
  const colour = { skin: pr.skin, hair: pr.hair, vest: pr.vest, shirt: pr.shirt, pants: pr.pants, shoe: pr.shoeHex, bag: pr.bag || BAG, dark: INK }; // a seated student keeps a backpack only if it is part of its single mesh
  const byId = Object.fromEntries(variant(model, bag).parts.map(p => [p.id, p]));
  for (const id of ids) {
    const p = byId[id], own = k => p.vertexBones ? p.vertexBones[k] : p.bone;
    bone(bones[p.bone]); at('M-' + id);
    // each vertex local to its bone (a skinned model's seam vertices follow the neighbouring bone)
    const V = p.vertices.map((v, k) => { const pivot = RIG_H[own(k)].at; return [(v[0] - pivot[0]) * H, (v[1] - pivot[1]) * H, (v[2] - pivot[2]) * H]; });
    p.faces.forEach(([a, c, d], i) => {
      const P = p.vertices, u = P[c].map((x, k) => x - P[a][k]), w = P[d].map((x, k) => x - P[a][k]); // facet normal in the rest pose
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const name = CLASSES[p.classes[i]];
      const hex = name === 'dark' ? INK : tone(colour[name], n, .8);
      if (p.vertexBones && (own(a) !== p.bone || own(c) !== p.bone || own(d) !== p.bone)) e.skinTri(V[a], V[c], V[d], hex, [a, c, d].map(k => bones[own(k)]));
      else e.tri(V[a], V[c], V[d], hex);
    });
  }
}

/**
 * VR goggles (10) over the Meshy head, in head-bone space: white plate in front of the eyes,
 * a top, dark straps reaching past the hair and a dark lens 0.0045 in front of the plate.
 */
export function meshyGoggles(model, e, H, C, shade, gap) {
  const L = M(model).LANDMARKS_H, pv = M(model).RIG_H.head.at;
  const ey = (L.eyeY - pv[1]) * H, fz = (L.faceZ - pv[2]) * H + .02 * H, vh = .034 * H, vw = .112 * H, gx = (L.halfHead + .012) * H;
  const P = [[-vw, ey - vh, fz], [vw, ey - vh, fz], [vw, ey + vh, fz], [-vw, ey + vh, fz]];
  e.face(P[0], P[1], P[2], C.white, [0, 0, 1]).face(P[0], P[2], P[3], C.white, [0, 0, 1]);
  const F2 = [vw * .9, ey + vh, fz - .022 * H], F3 = [-vw * .9, ey + vh, fz - .022 * H];
  e.face(P[3], P[2], F2, shade(C.white, .95), [0, 1, 0]).face(P[3], F2, F3, shade(C.white, .95), [0, 1, 0]);
  for (const sx of [-1, 1]) {
    const f0 = [sx * vw, ey + vh * .6, fz], f1 = [sx * vw, ey - vh * .6, fz], r0 = [sx * gx, ey + vh * .5, -.03 * H], r1 = [sx * gx, ey - vh * .5, -.03 * H];
    e.face(f0, f1, r1, C.dark, [sx, 0, 0]).face(f0, r1, r0, C.dark, [sx, 0, 0]);
  }
  const lw = vw * .8, lh = vh * .62, lz = fz + gap;
  e.face([-lw, ey - lh, lz], [lw, ey - lh, lz], [lw, ey + lh, lz], C.dark, [0, 0, 1]).face([-lw, ey - lh, lz], [lw, ey + lh, lz], [-lw, ey + lh, lz], C.dark, [0, 0, 1]);
}

/** Facts reported by the manifest, per model. */
export const MESHY_FACTS = Object.freeze(Object.fromEntries(Object.entries(MESHY_MODELS).map(([k, m]) => [k, {
  file: m.SOURCE.file, sha256: m.SOURCE.sha256, sourceTriangles: m.SOURCE.triangles,
  triangles: Object.fromEntries(Object.entries(m.VARIANTS).map(([v, d]) => [v, d.parts.reduce((s, p) => s + p.faces.length, 0)]))
}])));
