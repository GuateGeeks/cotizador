/**
 * Primaria R2 (package GuateGeeks_Primaria_Piezas_R2): recipes P01–P20 and the 33
 * instances of assembly.json, emitted through the existing builder. The data module is
 * generated from the package JSON (tools/r2-import.mjs); this file only transforms it.
 *
 * Transform (docs/MONTAJE.md §2), column vectors, degrees:
 *   M = T(position_H) · Rz · Ry · Rx · diag(scale_x · (mirror ? −1 : 1), scale_y, scale_z)
 *   v_scene = H · M · v. The builder takes vertices local to the active bone, whose rest
 *   transform is a pure translation, so the emitted vertex is H · (M · v − pivot_root_H(bone)).
 *   Mirrored instances reverse each triangle once (determinant < 0).
 */
import { shadeTone } from '../kit.js';
import { H as R2_H, RIG_H, RECIPES, INSTANCES, LANDMARKS_H, BUDGET, PROVENANCE } from './primaria-r2-data.js';

export { RECIPES as R2_RECIPES, INSTANCES as R2_INSTANCES, RIG_H as R2_RIG_H, LANDMARKS_H as R2_LANDMARKS_H, BUDGET as R2_BUDGET, PROVENANCE as R2_PROVENANCE };

/**
 * Budget redistribution (DIFERENCIAS-ARTE-GEOMETRIA.md, GUIA §5): the project counts the
 * 7-triangle contact shadow against the 280 limit, and the package uses all 280. These
 * caps sit inside a closed piece of the same bone (checked numerically: at most 0.0016 H
 * outside it) and are never visible in any pose: forearm bottom inside the hand, hand top
 * inside the forearm, calf bottom inside the shoe. 8 triangles fewer → 272 + 7 = 279.
 */
export const R2_REDISTRIBUTION = Object.freeze({
  P13: { faces: [7], reason: 'Tapa inferior del antebrazo, dentro de la mano (mismo hueso fore)' },
  P14: { faces: [6], reason: 'Tapa superior de la mano, dentro del antebrazo (mismo hueso fore)' },
  P17: { faces: [8, 10], reason: 'Tapa inferior de la pantorrilla, dentro del zapato (mismo hueso shin)' }
});

/**
 * Integration adaptations (vertex positions only, no faces added or removed). P18: the sole is
 * flat on y = 0 in the package, coplanar with the campus floor pieces (paper-mesh-check flags
 * it under the entrance mat). The two toe vertices of the sole rise 0.008 H (toe spring, as the
 * v1 shoe): the sole touches the floor along the heel edge, H and the heel stay unchanged.
 */
export const R2_ADAPTATIONS = Object.freeze({
  P18: { vertices: { 2: [.0435, .008, .088], 3: [-.0435, .008, .088] }, reason: 'Punta elevada 0.008 H: la suela deja de ser coplanar con el suelo del campus' }
});
const recipeVertices = id => RECIPES[id].vertices.map((v, k) => R2_ADAPTATIONS[id]?.vertices[k] || v);

/** Head instances (hair and face follow `head`): used alone on short-haired primaria students with a skirt. */
export const R2_HEAD = Object.freeze(INSTANCES.filter(i => i.bone === 'head').map(i => i.id));
const BAG = new Set(['P19', 'P20-L', 'P20-R']);
const HEADSET_HIDES = new Set(['P04-L', 'P04-R', 'P07-C', 'P07-L', 'P07-R']); // eyes and fringe under the goggles

const rad = d => d * Math.PI / 180;
/** Root-rest position (in H) of a local recipe vertex for one instance. */
export function instancePoint(inst, v) {
  const s = inst.scale, m = inst.mirror ? -1 : 1;
  let x = v[0] * s[0] * m, y = v[1] * s[1], z = v[2] * s[2];
  const [rx, ry, rz] = inst.rotation.map(rad);
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  return [x + inst.position[0], y + inst.position[1], z + inst.position[2]];
}
/** Faces of a recipe after the documented redistribution. */
export function recipeFaces(recipeId) {
  const r = RECIPES[recipeId], drop = new Set(R2_REDISTRIBUTION[recipeId]?.faces || []);
  return r.faces.map((f, i) => ({ f, color: r.colors[i], index: i })).filter(x => !drop.has(x.index));
}

/** Instance ids and planned triangles for a configuration (order of assembly.json). */
export function r2Instances({ body, head, bag, headset }) {
  if (!body && !head) return [];
  return INSTANCES.filter(i => (body || i.bone === 'head') && (bag || !BAG.has(i.id)) && !(headset && HEADSET_HIDES.has(i.id)))
    .map(i => [i.id, recipeFaces(i.recipe).length]);
}

/** Rig of the R2 student in scene units, parent-relative (the rest pose only translates). */
export function r2Rig(H) {
  const rel = id => { const b = RIG_H[id], p = b.parent && b.parent !== 'root' ? RIG_H[b.parent].at : [0, 0, 0]; return b.at.map((x, k) => (x - p[k]) * H); };
  return Object.fromEntries(Object.keys(RIG_H).filter(k => k !== 'root').map(k => [k, rel(k)]));
}

/** Landmarks in scene units (assembly.json landmarks_H × H). */
export function r2Landmarks(H) {
  const L = LANDMARKS_H;
  return { sole: 0, ankle: L.ankle_reference * H, knee: L.knee * H, hip: L.hip * H, shoulder: L.arm_shoulder * H,
    elbow: RIG_H.foreL.at[1] * H, neckBase: L.head_pivot * H, chin: L.chin * H, top: L.hair_top * H,
    shoulderX: RIG_H.armL.at[0] * H, legX: RIG_H.legL.at[0] * H, halfShoulders: L.torso_shoulder_width / 2 * H };
}

const lum = hex => { const n = parseInt(hex.slice(1), 16); return .2126 * (n >> 16 & 255) + .7152 * (n >> 8 & 255) + .0722 * (n & 255); };
/** Recolour families the person spec controls (skin, hair, vest, backpack, shoes), keeping each face's relative tint. */
function recolor(recipe, hex, pr) {
  const target = { '#E5AD80': pr.skin, '#3A2E5C': pr.hair, '#6942A1': pr.vest, '#19BCCD': pr.bag, '#2B2340': pr.shoeHex }[recipe.base];
  if (!target || target.toUpperCase() === recipe.base) return hex;
  return shadeTone(target, lum(hex) / lum(recipe.base));
}

/**
 * Emit instances through the person's counting emitter. `ctx`: { at, bone, e, bones, pr, H }.
 * `pivots` maps bone name → the root-rest pivot (H) the emitted vertices are made relative to
 * (the R2 rig; a v1 body keeps the R2 head pivot for the head). Returns the world-rest
 * attach points (scene units) of every instance socket, for inspection.
 */
export function emitR2(ctx, ids) {
  const { at, bone, e, bones, pr, H } = ctx, sockets = [];
  const byId = Object.fromEntries(INSTANCES.map(i => [i.id, i]));
  for (const iid of ids) {
    const inst = byId[iid], recipe = RECIPES[inst.recipe], pivot = RIG_H[inst.bone].at;
    bone(bones[inst.bone]); at(iid);
    const local = v => { const q = instancePoint(inst, v); return [(q[0] - pivot[0]) * H, (q[1] - pivot[1]) * H, (q[2] - pivot[2]) * H]; };
    const V = recipeVertices(inst.recipe).map(local);
    for (const { f, color } of recipeFaces(inst.recipe)) {
      const [a, c, d] = inst.mirror ? [f[2], f[1], f[0]] : f;
      e.tri(V[a], V[c], V[d], recolor(recipe, color, pr));
    }
    for (const [name, s] of Object.entries(recipe.sockets)) {
      if (s.scope && s.scope !== iid) continue;
      sockets.push({ instance: iid, name, bone: inst.bone, root: instancePoint(inst, s.at).map(x => x * H) });
    }
  }
  return sockets;
}

/**
 * Package facts reported by the manifest and the generated contract. `r3Delta` is the triangle change of
 * the active R3 recreations over the R2 recipes they replace (summed over instances), so the R2 package
 * total stays checkable: r2PackageTriangles = packageTriangles − r3Delta.
 */
const r3Delta = INSTANCES.reduce((s, i) => { const o = PROVENANCE.r3?.[i.recipe]; return s + (o ? o.triangles - o.replacedTriangles : 0); }, 0);
export const R2_FACTS = Object.freeze({
  H: R2_H, recipes: Object.keys(RECIPES).length, instances: INSTANCES.length,
  packageTriangles: INSTANCES.reduce((s, i) => s + RECIPES[i.recipe].faces.length, 0),
  emittedTriangles: INSTANCES.reduce((s, i) => s + recipeFaces(i.recipe).length, 0),
  r3: Object.keys(PROVENANCE.r3 || {}), r3Delta,
  r2PackageTriangles: INSTANCES.reduce((s, i) => s + RECIPES[i.recipe].faces.length, 0) - r3Delta
});
