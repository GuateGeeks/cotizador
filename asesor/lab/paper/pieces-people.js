/**
 * Papercraft people, built from the construction package R1
 * (docs/papercraft/construction: FICHAS-TECNICAS.md and the three geometry examples).
 * `addPaperPerson` replaces `addPerson` from campus-people.js with the same spec,
 * bone names, bone hierarchy and return value, so POSES, applyPose, reach,
 * placePerson and campus-actors keep working. Everything is drawn in bind pose as
 * flat facets; poses on the catalog pieces are applied in `meta.afterFinish`.
 *
 * The generator is split in profile → plan → topology → audit:
 * - `resolvePersonProfile(spec)`: level proportions, clothes, hair variant and colours;
 * - `planPerson(profile)`: the planned triangles per part (fichas §8);
 * - `addPaperPerson`: emits each part through a counting emitter, so the returned
 *   `parts` are the triangles really emitted and `tools/paper-people-manifest.mjs`
 *   checks them against the plan and against the built geometry.
 *
 * Budget: ≤ 271 triangles of geometry per student (279 with the 8-triangle planning
 * reserve) and ≤ 291 per teacher; the 7-triangle contact shadow is an auxiliary
 * mesh on the blob layer and is reported apart. Layers that overlap keep ≥ 0.0045
 * scene units of normal separation; panels that share an edge need none.
 */
import { PAPER as C, SCALE, newMeta, shadeTone } from './kit.js';
import { hash, pick, lerp } from '../campus-kit.js';
import { POSES, applyPose, blendBody } from '../campus-people.js';
import { r2Instances, r2Rig, r2Landmarks, emitR2, R2_HEAD, R2_INSTANCES, R2_RECIPES, R2_LANDMARKS_H } from './r2/person-r2.js';

/** Level profiles (fichas §3): head = chin to top of hair, sw = shoulder width, both / H. */
const PROFILE = {
  pre: { head: .32, sw: .275 },
  prim: { head: .28, sw: .26 },
  bas: { head: .255, sw: .255 },
  bach: { head: .245, sw: .255 },
  adult: { head: .225, sw: .275 }
};
/** Primaria body fractions; other levels scale neck, torso, thigh and shin to fill 1 − head − shoe. */
const BODY = { neck: .018, torso: .252, thigh: .215, shin: .195 };
const SHOE = .04;
/** Minimum separation of overlapping layers, in scene units (fichas: 0.004). */
const GAP = .0045;
/** Hair variants and their known costs (fichas §4); the cap replaces the hair core. */
export const HAIR_COST = { short: 48, pony: 56, bun: 56, pig: 60, long: 60, cap: 48, 'cap-pig': 60 };
/** Front strands (component `fringe`) per hair variant; the VR goggles replace them (and the cap's visor, 10). */
const FRONT = { short: 8, pony: 8, bun: 8, pig: 8, long: 6, cap: 4, 'cap-pig': 4 };
export const GEOMETRY_CAP = { student: 271, teacher: 291 };
export const RESERVE = 8;
export const SHADOW_TRIANGLES = 7;

const LIGHT = (() => { const v = [-.3, .55, .75], l = Math.hypot(...v); return v.map(c => c / l); })();
const toneCache = new Map();
/** Facet tint by normal (amplitude `amp`): the lit side of a fold a little lighter. */
function tone(hex, n, amp = 1) {
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  const k = Math.round((1 + amp * (-.1 + .17 * Math.max(-.6, Math.min(1, (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / l)))) * 40) / 40;
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
const dotV = (u, w) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
const unit = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const mean = pts => { const o = [0, 0, 0]; for (const q of pts) { o[0] += q[0]; o[1] += q[1]; o[2] += q[2]; } return o.map(v => v / pts.length); };
const normalOf = (a, c, d) => unit(crossV(sub(c, a), sub(d, a)));
/** Point on the plane of a-c-d at (x, y), lifted `lift` along its normal toward +z. */
function onPlane(a, c, d, x, y, lift = 0) {
  let n = normalOf(a, c, d); if (n[2] < 0) n = mul(n, -1);
  const z = a[2] - (n[0] * (x - a[0]) + n[1] * (y - a[1])) / n[2];
  return add([x, y, z], mul(n, lift));
}

/**
 * The primaria base student (construction sheet 01): explicit configuration, fixed seed.
 * Inspector, capture tools and the generated contract all build this exact spec.
 */
export const PRIMARIA_BASE = Object.freeze({
  id: 'alumno-primaria', label: 'Alumno de primaria (base)', level: 'prim', seed: 'prim-base',
  hair: 'short', cap: false, skirt: false, headset: false, skin: C.skin[0], hairColor: C.hair[1], shoe: C.dark
});

/** Resolve level proportions, clothing, hair variant and colours from a person spec. */
export function resolvePersonProfile(spec) {
  const teacher = spec.role === 'teacher', level = teacher ? 'adult' : (PROFILE[spec.level] ? spec.level : 'prim');
  const seed = spec.seed ?? spec.id, pre = level === 'pre';
  const H = SCALE.person[level], P = PROFILE[level], k = (1 - P.head - SHOE) / (1 - .28 - SHOE);
  const girl = hash(seed, 'girl') < .5;
  let style = spec.hair || (teacher ? pick(['short', 'long', 'bun'], seed, 'style')
    : pre ? pick(['pig', 'short', 'pony', 'pig'], seed, 'style')
      : girl ? pick(['long', 'pony', 'long', 'short'], seed, 'style') : 'short');
  style = { braids: 'pig', bob: 'long', curly: 'short', spiky: 'short' }[style] || style;
  if (!HAIR_COST[style]) style = 'short';
  const capMode = spec.cap ?? (pre && !teacher && hash(seed, 'cap') < .4 ? 'worn' : null);
  if (capMode === 'worn' || capMode === true) style = style === 'pig' ? 'cap-pig' : 'cap';
  const skirt = !teacher && (spec.skirt ?? hash(seed, 'skirt') < .42);
  const bag = !teacher && !spec.seated && spec.backpack !== false ? (typeof spec.backpack === 'string' ? spec.backpack : C.level[level]) : null;
  return {
    seed, level, teacher, pre, H, style, skirt, bag, headset: !!spec.headset, notebook: !!(teacher && spec.notebook),
    // Package R2 (docs/papercraft/construction-r2): the head of every short-haired primaria
    // student (clothing never changes the head) and the whole body with trousers. Every
    // other combination keeps recipe v1 (geometry of ec4d112).
    r2Head: level === 'prim' && !teacher && style === 'short', r2Body: level === 'prim' && !teacher && style === 'short' && !skirt,
    hc: P.head * H, sw: P.sw * H / 2, td: P.sw / .26 * .145 * H / 2,
    neck: BODY.neck * k * H, torso: BODY.torso * k * H, thigh: BODY.thigh * k * H, shin: BODY.shin * k * H, shoe: SHOE * H,
    skin: spec.skin || pick(C.skin, seed, 'skin'),
    // Sheet 07: dark violet hair dominates; near-black and brown stay as occasional variants.
    hair: spec.hairColor || pick([C.hair[1], C.hair[1], C.hair[0], C.hair[1], C.hair[1], C.hair[0], C.hair[2]], seed, 'hair'),
    vest: spec.sweater || C.uniform, shirt: teacher ? C.teacher : C.shirt, pants: teacher ? C.teacherPants : C.navy,
    shoeHex: spec.shoe || (teacher ? C.dark : pick([C.dark, C.dark, C.leg], seed, 'shoe'))
  };
}

/**
 * Planned triangles per component. v1 (fichas R1 §8): ears and chest straps only when they
 * fit the cap. R2 (`pr.r2Head` / `pr.r2Body`): the head, or the whole student, is the list of
 * package instances (`r2Instances`), each counted from its recipe after the documented
 * redistribution; components are instance ids (P01, P03-L…).
 */
export function planPerson(pr) {
  const plan = {};
  const r2 = r2Instances({ body: pr.r2Body, head: pr.r2Head, bag: !!pr.bag, headset: pr.headset });
  for (const [iid, n] of r2) plan[iid] = n;
  if (pr.r2Body) { if (pr.headset) plan.goggles = 10; return plan; }
  if (!pr.r2Head) {
    const capped = pr.style === 'cap' || pr.style === 'cap-pig';
    Object.assign(plan, { headNeck: 26, face: pr.headset ? 2 : 6,
      hairMass: HAIR_COST[pr.style] - FRONT[pr.style] - (pr.headset && capped ? 10 : 0), fringe: pr.headset ? 0 : FRONT[pr.style] });
  }
  Object.assign(plan, { torsoVest: 16, collar: 3, sleeves: 16, upperArms: 16, forearmsHands: 32, shoes: 16 });
  if (pr.headset) plan.goggles = 10;
  if (pr.skirt) Object.assign(plan, { skirt: 24, legs: 48 });
  else plan.pelvisTrousers = 40;
  if (pr.bag) plan.backpack = 8;
  if (pr.teacher) plan.tie = 2;
  if (pr.notebook) plan.notebook = 8;
  const cap = GEOMETRY_CAP[pr.teacher ? 'teacher' : 'student'], sum = () => Object.values(plan).reduce((s_, v) => s_ + v, 0);
  if (!pr.r2Head && sum() + 4 <= cap) plan.ears = 4;
  if (pr.bag && sum() + 4 <= cap) plan.straps = 4;
  return plan;
}

/**
 * Landmarks of the rest pose (recipe v1), in the person's space (Y up, +Z front, sole at
 * y = 0). The rig places its joints at these heights; the manifest checks bones against them.
 */
export function personLandmarks(pr) {
  const H = pr.H, ankle = pr.shoe, knee = ankle + pr.shin, hip = knee + pr.thigh, neckBase = hip + pr.torso, chin = neckBase + pr.neck;
  const shoulder = neckBase - .034 * H, elbow = shoulder - .125 * H;
  return { sole: 0, ankle, knee, hip, shoulder, elbow, neckBase, chin, top: chin + pr.hc, shoulderX: pr.sw + .007 * H, legX: pr.sw * (pr.skirt ? .4 : .44), halfShoulders: pr.sw };
}

/**
 * Components of a person: id, visual role, controlling bones, local frame and attach,
 * topology, overlap zones and review criteria, for recipe v1 (every combination outside
 * package R2). The R2 student is described by its instances (R2_PIECES in person-r2.js).
 */
export const COMPONENTS = Object.freeze([
  { id: 'headNeck', label: 'Cabeza y cuello', role: 'Volumen de la cabeza bajo el cabello y cuello corto', bones: ['head'],
    frame: 'Origen en la base del cuello (hueso head, en y = cuello del torso); Y arriba, +Z frente', attach: 'Hueso head; el cuello nace dentro del torso',
    topology: 'Anillo de mentón de 4 → anillo de mejillas de 8 (12), frente y sienes hasta la línea del cabello (8), cuello prisma triangular (6)',
    overlaps: 'Cuello dentro del torso y de la cabeza; la piel termina en la línea del cabello (arista compartida con el cabello al frente)',
    review: 'Aislado: mandíbula ancha, sin nariz. Montado: el mentón no se hunde en el cuello de la camisa' },
  { id: 'face', label: 'Rostro', role: 'Ojos y sonrisa planos', bones: ['head'], frame: 'Sobre los paneles planos de frente y mentón', attach: 'Hueso head, desplazado 0.0045 sobre la piel',
    topology: 'Dos ojos rectangulares (2 + 2), sonrisa en chevron (2)', overlaps: 'Capas sobre la piel a 0.0045', review: 'Legible a 120 px; a 80 px los ojos siguen visibles' },
  { id: 'ears', label: 'Orejas', role: 'Detalle de identidad', bones: ['head'], frame: 'Panel lateral del cráneo', attach: 'Hueso head',
    topology: 'Dos tiendas plegadas de 2 triángulos', overlaps: 'Base sobre el panel lateral (aristas en el plano)', review: 'Asoman bajo el cabello de perfil' },
  { id: 'hairMass', label: 'Masa del cabello', role: 'Silueta del cabello: coronilla, lados, nuca', bones: ['head'],
    frame: 'Anillos normalizados por la altura de cabeza hc desde el mentón', attach: 'Hueso head; al frente comparte la arista de la línea del cabello',
    topology: 'Núcleo 32: banda 8→8 (16), transición 8→4 (12), coronilla a ápice desplazado (4); patillas 2 × 2, nuca 2 × 2',
    overlaps: 'A los lados y atrás el borde inferior cuelga fuera del cráneo (no se ve el interior desde arriba)',
    review: 'Aislado: cúpula sin cornisa de boina. Montado: cubre sienes y nuca, deja ver la cara entre la línea del cabello y el mentón' },
  { id: 'fringe', label: 'Flequillo', role: 'Mechones frontales con dirección', bones: ['head'], frame: 'Base A–M–B en el anillo ancho, punta hacia abajo', attach: 'Hueso head',
    topology: 'Cuatro mechones plegados de 2 triángulos (01-mechon-plegado)', overlaps: 'Por delante de la banda y de la frente', review: 'Barrido a un lado; las puntas no tapan los ojos' },
  { id: 'torsoVest', label: 'Torso y chaleco', role: 'Volumen del torso, chaleco violeta y hombros de la camisa', bones: ['torso'],
    frame: 'Origen en la cadera (hueso torso); prisma hexagonal', attach: 'Hueso torso',
    topology: 'Banda de 6 paneles (12) y tapa (4)',
    overlaps: 'El bajo cubre el asiento del pantalón; mangas y cuello entran por dentro', review: 'Hombro inclinado; el borde del chaleco no se lee como repisa' },
  { id: 'collar', label: 'Cuello de camisa', role: 'V blanca y dos puntas de cuello', bones: ['torso'], frame: 'Panel frontal superior del chaleco', attach: 'Hueso torso; capas a 0.0045–0.015',
    topology: 'V (1), puntas (2)', overlaps: 'Sobre el chaleco y por encima de los tirantes', review: 'V centrada; puntas a ambos lados del cuello' },
  { id: 'sleeves', label: 'Mangas', role: 'Manga corta que envuelve el brazo', bones: ['armL', 'armR'],
    frame: 'Origen en el hombro (hueso armL/armR); eje −Y', attach: 'Hueso del brazo; la sección superior entra bajo el hombro',
    topology: '02-manga-desplegada: dos secciones rectangulares y cuatro paneles (8)',
    overlaps: 'El brazo entra por la boca inferior; la parte interior se hunde en el torso', review: 'Boca inferior legible; de pie y con el brazo levantado no se ve el hueco superior' },
  { id: 'upperArms', label: 'Brazos', role: 'Brazo superior', bones: ['armL', 'armR'], frame: 'Hueso del brazo, eje −Y', attach: 'Dentro de la manga',
    topology: 'Tubo de 4 paneles (8 por brazo)', overlaps: 'El antebrazo entra 0.0075 H por dentro', review: 'Codo sin hueco al flexionar' },
  { id: 'forearmsHands', label: 'Antebrazos y manos', role: 'Antebrazo y mano cerrada', bones: ['foreL', 'foreR'], frame: 'Hueso del antebrazo, eje −Y', attach: 'Codo dentro del brazo; la mano sigue al antebrazo',
    topology: 'Antebrazo 8 + mano bipirámide de 8 por lado', overlaps: 'Mano más estrecha hacia el muslo', review: 'Manos cerradas, sin pulgar' },
  { id: 'pelvisTrousers', label: 'Pelvis y pantalón', role: 'Asiento, muslos y tibias del pantalón', bones: ['hips', 'legL', 'legR', 'shinL', 'shinR'],
    frame: 'Asiento en la cadera; muslo y tibia en sus huesos', attach: 'Asiento bajo el chaleco; la tibia nace dentro del muslo',
    topology: 'Asiento 8, muslo 8 × 2, tibia 8 × 2', overlaps: 'Rodilla cubierta al caminar y al sentarse', review: 'Sin hueco en la rodilla; pantalón recto' },
  { id: 'skirt', label: 'Falda', role: 'Falda plisada (no es parte del alumno base)', bones: ['legL', 'legR'], frame: '03-media-falda-plisada', attach: 'Una mitad por muslo',
    topology: '2 × 6 paneles', overlaps: 'Cintura dentro del chaleco', review: 'Cubre el regazo sentada' },
  { id: 'legs', label: 'Piernas con calceta', role: 'Piernas bajo la falda', bones: ['legL', 'legR', 'shinL', 'shinR'], frame: 'Huesos de pierna', attach: '—',
    topology: 'Muslo 8, tibia 8 y calceta 8 por lado', overlaps: 'Calceta 0.0075 H por fuera de la piel', review: '—' },
  { id: 'shoes', label: 'Zapatos', role: 'Calzado compacto', bones: ['shinL', 'shinR'], frame: 'Hueso de la tibia; suela en y = 0 de pie', attach: 'El tobillo entra en el pantalón',
    topology: 'Cuña cerrada (8)', overlaps: 'Punta elevada: la suela solo toca el suelo en el talón', review: 'Talón, empeine y puntera legibles; largo proporcional a la pierna' },
  { id: 'backpack', label: 'Mochila', role: 'Volumen de la mochila turquesa', bones: ['torso'], frame: 'Espalda del torso', attach: 'Hueso torso; la cara delantera abierta queda dentro del chaleco',
    topology: 'Caja abierta (8)', overlaps: 'Cara delantera abierta dentro del chaleco', review: 'Volumen visible de espalda y de perfil' },
  { id: 'straps', label: 'Tirantes', role: 'Recorrido de los tirantes', bones: ['torso'], frame: 'Paneles del chaleco', attach: 'Hueso torso, a 0.0045 del chaleco',
    topology: 'Dos tiras en el pecho (4)', overlaps: 'Por debajo de las puntas del cuello', review: 'Visibles de frente' },
  { id: 'goggles', label: 'Visor VR', role: 'Accesorio', bones: ['head'], frame: 'Frente', attach: 'Hueso head', topology: '10', overlaps: '—', review: '—' },
  { id: 'tie', label: 'Corbata', role: 'Docente', bones: ['torso'], frame: 'Frente', attach: 'Hueso torso', topology: '2', overlaps: '—', review: '—' },
  { id: 'notebook', label: 'Cuaderno', role: 'Docente', bones: ['foreR'], frame: 'Mano derecha', attach: 'Hueso foreR', topology: '8', overlaps: '—', review: '—' }
]);

/**
 * VR goggles (10) over the R2 head: white plate in front of the eyes (P04 at 0.8294 H,
 * face front z ≈ 0.0782 H), a top, dark side straps outside the hair (P06 half width
 * 0.137 H) and a dark lens 0.0045 in front of the plate. Head-bone space (pivot 0.7 H).
 */
function r2Goggles(e, H) {
  const ey = (.8294 - .7) * H, fz = .0782 * H + .02 * H, vh = .034 * H, vw = .112 * H, gx = .145 * H;
  const P = [[-vw, ey - vh, fz], [vw, ey - vh, fz], [vw, ey + vh, fz], [-vw, ey + vh, fz]];
  e.face(P[0], P[1], P[2], C.white, [0, 0, 1]).face(P[0], P[2], P[3], C.white, [0, 0, 1]);
  const F2 = [vw * .9, ey + vh, fz - .022 * H], F3 = [-vw * .9, ey + vh, fz - .022 * H];
  e.face(P[3], P[2], F2, shadeTone(C.white, .95), [0, 1, 0]).face(P[3], F2, F3, shadeTone(C.white, .95), [0, 1, 0]);
  for (const sx of [-1, 1]) {
    const f0 = [sx * vw, ey + vh * .6, fz], f1 = [sx * vw, ey - vh * .6, fz], r0 = [sx * gx, ey + vh * .5, -.03 * H], r1 = [sx * gx, ey - vh * .5, -.03 * H];
    e.face(f0, f1, r1, C.dark, [sx, 0, 0]).face(f0, r1, r0, C.dark, [sx, 0, 0]);
  }
  const lw = vw * .8, lh = vh * .62, lz = fz + GAP;
  e.face([-lw, ey - lh, lz], [lw, ey - lh, lz], [lw, ey + lh, lz], C.dark, [0, 0, 1]).face([-lw, ey - lh, lz], [lw, ey + lh, lz], [-lw, ey + lh, lz], C.dark, [0, 0, 1]);
}

/** Head ring columns [x, z] (unit): flat front panel, chamfers, flat sides, back. */
const COLS = [[-.52, 1], [.52, 1], [.97, .5], [.97, -.46], [.5, -1], [-.5, -1], [-.97, -.46], [-.97, .5]];
/** Torso hexagon [x, z] (unit): front panel, chamfered sides, back panel. */
const HEX = [[-.72, 1], [.72, 1], [1, .05], [.72, -1], [-.72, -1], [-1, .05]];

export function addPaperPerson(b, spec) {
  const rig = b.rig, id = spec.id, pr = resolvePersonProfile(spec), plan = planPerson(pr);
  const { H, hc, sw: SW, td: TD, teacher, pre, skin, shirt, vest } = pr;
  const torsoH = pr.torso, thigh = pr.thigh, shin = pr.shin, shoeH = pr.shoe, hipY = shoeH + shin + thigh;
  const upper = .125 * H, fore = .105 * H, handL = .045 * H;

  // ---- counting emitter: every triangle goes through `e`, tallied under the current
  // component and bone. `spec.only` (component ids) emits just those: isolation in the inspector.
  // `spec.only` takes component ids (P03-L) or R2 recipe ids (P03: both instances).
  const parts = {}, perBone = {}, ranges = {}, trace = spec.trace ? [] : null, only = spec.only ? new Set(spec.only) : null;
  let part = null, boneName = 'root', emitted = 0;
  const at = name => { part = name; parts[name] = parts[name] || 0; perBone[name] = perBone[name] || {}; ranges[name] = ranges[name] || []; };
  const bone = target => { boneName = target.name.slice(target.name.lastIndexOf('.') + 1); b.bone(target); };
  const shown = () => !only || only.has(part) || only.has(part.split('-')[0]);
  const count = () => {
    parts[part]++; perBone[part][boneName] = (perBone[part][boneName] || 0) + 1; trace?.push(part);
    const r = ranges[part], last = r[r.length - 1];
    if (last && last[1] === emitted) last[1]++; else r.push([emitted, emitted + 1]);
    emitted++;
  };
  const e = {
    face(a, c, d, hex, toward) { if (!shown()) return e; count(); b.face(a, c, d, hex, toward); return e; },
    /** Raw triangle in the given winding (R2 data is counter-clockwise seen from outside). */
    tri(a, c, d, hex) { if (!shown()) return e; count(); b.tri(a, c, d, hex); return e; }
  };
  /** One flat facet facing away from `ctr`, tinted by its own normal. */
  const facet = (a, c, d, hex, ctr, amp = 1) => {
    let n = crossV(sub(c, a), sub(d, a));
    const out = sub(mean([a, c, d]), ctr);
    if (dotV(n, out) < 0) n = mul(n, -1);
    e.face(a, c, d, tone(hex, n, amp), out);
  };
  const facet4 = (a, c, d, f, hex, ctr, amp) => { facet(a, c, d, hex, ctr, amp); facet(a, d, f, hex, ctr, amp); };
  /** Band between two rings of equal length; `skip(j)` leaves a panel out. */
  const band = (r0, r1, hex, ctr, skip, amp) => {
    for (let j = 0; j < r0.length; j++) {
      if (skip && skip(j)) continue;
      const k = (j + 1) % r0.length, col = typeof hex === 'function' ? hex(j) : hex;
      facet(r0[j], r0[k], r1[k], col, ctr, amp); facet(r0[j], r1[k], r1[j], col, ctr, amp);
    }
  };
  /** Open tube with a rectangular section (4 panels, 8 triangles). */
  const tube = (y0, y1, a0, d0, a1, d1, hex, o = {}) => {
    const z0 = o.z0 || 0, z1 = o.z1 || 0, x0 = o.x0 || 0, x1 = o.x1 || 0;
    const r0 = [[x0 - a0, y0, z0 - d0], [x0 + a0, y0, z0 - d0], [x0 + a0, y0, z0 + d0], [x0 - a0, y0, z0 + d0]];
    const r1 = [[x1 - a1, y1, z1 - d1], [x1 + a1, y1, z1 - d1], [x1 + a1, y1, z1 + d1], [x1 - a1, y1, z1 + d1]];
    band(r0, r1, hex, mean([...r0, ...r1]));
    return { r0, r1 };
  };
  /**
   * Folded strand (01-mechon-plegado): triangles A–M–T and M–B–T, the crest M lifted
   * `depth` along `out`. The broken base A–M–B tucks under the hair band.
   */
  const strand = (A, B, T, out, depth, hex) => {
    const M = add(mix(A, B, .5), mul(unit(out), depth));
    e.face(A, M, T, tone(hex, out, .6), out).face(M, B, T, shadeTone(tone(hex, out, .6), .93), out);
  };
  /** Bipyramid lock (ponytail, pigtail, bun): ring of `n` points, apexes `top` and `bottom`. */
  const bundle = (top, bottom, ctr, r, n, hex, key) => {
    const u = unit(sub(bottom, top)), ref = Math.abs(u[0]) < .9 ? [1, 0, 0] : [0, 0, 1];
    const v1 = unit(crossV(u, ref)), v2 = crossV(u, v1);
    const ring = Array.from({ length: n }, (_, i) => {
      const a = (i + .25) / n * Math.PI * 2, k = r * (.88 + hash(pr.seed, key, i) * .24);
      return add(ctr, add(mul(v1, Math.cos(a) * k), mul(v2, Math.sin(a) * k)));
    });
    const mid = mean(ring);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      facet(ring[i], ring[j], top, hex, mid, .7); facet(ring[i], ring[j], bottom, hex, mid, .7);
    }
  };

  const finish = (joints, extra) => {
    if (!only) b.bone(joints.root).blob(0, .004, 0, .2 * H, .16 * H, .26); // auxiliary: not drawn when isolating components
    b.bone(rig.root);
    const components = Object.keys(plan).map(cid => {
      const inst = R2_INSTANCES.find(i => i.id === cid), reg = inst ? null : COMPONENTS.find(c => c.id === cid);
      return { id: cid, recipe: inst ? inst.recipe : 'v1', label: inst ? R2_RECIPES[inst.recipe].name : reg?.label || cid,
        bones: Object.keys(perBone[cid] || {}).length ? Object.keys(perBone[cid]) : inst ? [inst.bone] : reg?.bones || [],
        triangles: parts[cid] || 0, planned: plan[cid], ranges: ranges[cid] || [], perBone: perBone[cid] || {} };
    });
    const { root: r0, ...rest } = joints;
    return { id, root: r0, joints: rest, scale: H, level: pr.level, teacher, head: hc, parts, plan, profile: pr, trace, components, perBone, ranges, ...extra };
  };

  if (pr.r2Body) { // ---- the primaria R2 student: rig and every piece from the package
    const R = r2Rig(H), root = rig.add(id, spec.parent || rig.root, spec.x || 0, spec.y || 0, spec.z || 0);
    root.rotation.y = spec.ry || 0;
    root.userData.rest.quaternion.copy(root.quaternion);
    const j = { root };
    for (const [name, parent] of [['hips', 'root'], ['torso', 'hips'], ['head', 'torso'], ['armL', 'torso'], ['armR', 'torso'], ['foreL', 'armL'], ['foreR', 'armR'], ['legL', 'hips'], ['legR', 'hips'], ['shinL', 'legL'], ['shinR', 'legR']])
      j[name] = rig.add(`${id}.${name}`, j[parent], ...R[name]);
    const ids = Object.keys(plan).filter(k => k !== 'goggles');
    const sockets = emitR2({ at, bone, e, bones: j, pr, H }, ids);
    if (plan.goggles) { bone(j.head); at('goggles'); r2Goggles(e, H); }
    const L = r2Landmarks(H);
    // applyPose and seats read hipY, thigh and shin (shin: knee to the top of the shoe, as in v1).
    return finish(j, { hipY: L.hip, thigh: L.hip - L.knee, shin: L.knee - SHOE * H, landmarks: L, sockets });
  }

  // ---- skeleton: same names, parents and joint meaning as campus-people.addPerson
  const root = rig.add(id, spec.parent || rig.root, spec.x || 0, spec.y || 0, spec.z || 0);
  root.rotation.y = spec.ry || 0;
  root.userData.rest.quaternion.copy(root.quaternion);
  const shoulderX = SW + .007 * H;
  const hips = rig.add(id + '.hips', root, 0, hipY, 0);
  const torso = rig.add(id + '.torso', hips, 0, 0, 0);
  const neck = rig.add(id + '.head', torso, 0, torsoH, 0);
  const armL = rig.add(id + '.armL', torso, shoulderX, torsoH - .034 * H, 0);
  const armR = rig.add(id + '.armR', torso, -shoulderX, torsoH - .034 * H, 0);
  const foreL = rig.add(id + '.foreL', armL, 0, -upper, 0);
  const foreR = rig.add(id + '.foreR', armR, 0, -upper, 0);
  const legX = SW * (pr.skirt ? .4 : .44);
  const legL = rig.add(id + '.legL', hips, legX, 0, 0);
  const legR = rig.add(id + '.legR', hips, -legX, 0, 0);
  const shinL = rig.add(id + '.shinL', legL, 0, -thigh, 0);
  const shinR = rig.add(id + '.shinR', legR, 0, -thigh, 0);

  // ---- torsoVest (16): hexagonal vest prism, one band and a flat top
  bone(torso); at('torsoVest');
  const hexRing = (y, w, d, drop = 0) => HEX.map(([fx, fz]) => [fx * w, y - (Math.abs(fx) > .9 ? drop : 0), fz * d]);
  const hem = hexRing(-.03 * H, SW * .93, TD * 1.02), top = hexRing(torsoH, SW, TD * .94, .022 * H);
  const tctr = [0, torsoH * .5, 0];
  const front = (x, y, lift) => onPlane(hem[0], hem[1], top[1], x, y, lift);
  {
    band(hem, top, vest, tctr);
    facet4(top[0], top[1], top[3], top[4], vest, tctr); facet(top[1], top[2], top[3], vest, tctr); facet(top[4], top[5], top[0], vest, tctr);
  }
  // ---- collar (3): white V and two collar points, layered on the front panel
  at('collar');
  const nw = .036 * H, ny = torsoH * .995, vy = torsoH * (teacher ? .58 : .6);
  e.face(front(-nw, ny, GAP), front(nw, ny, GAP), front(0, vy, GAP), shirt, [0, 0, 1]);
  for (const sx of [-1, 1]) { // collar points, tilted off the V
    const A = front(sx * nw * 1.7, torsoH, GAP * 2), B = front(sx * nw * .25, torsoH * .97, GAP * 2.6), Cc = front(sx * nw * 1.45, torsoH * .84, GAP * 3.4);
    e.face(A, B, Cc, shadeTone(shirt, .9), [0, .3, 1]);
  }
  if (plan.tie) { // turquoise tie over the V
    at('tie');
    const k = [[0, torsoH * .93], [.013 * H, torsoH * .84], [0, torsoH * .5], [-.013 * H, torsoH * .84]].map(([x, y]) => front(x, y, GAP * 2.2));
    e.face(k[0], k[1], k[2], C.turquoise, [0, 0, 1]).face(k[0], k[2], k[3], shadeTone(C.turquoise, .9), [0, 0, 1]);
  }
  if (pr.bag) { // backpack (8): a box open toward the back and underneath
    at('backpack');
    const bz = -TD * .9, bd = .062 * H, bh = torsoH * .7, y0b = torsoH * .12, bw = SW * .72;
    const r0 = [[-bw, y0b, bz - bd], [bw, y0b, bz - bd], [bw, y0b, bz], [-bw, y0b, bz]];
    const r1 = [[-bw * .92, y0b + bh, bz - bd * .85], [bw * .92, y0b + bh, bz - bd * .85], [bw * .92, y0b + bh, bz], [-bw * .92, y0b + bh, bz]];
    const bc = mean([...r0, ...r1]);
    band(r0, r1, pr.bag, bc, j => j === 2);
    facet4(r1[0], r1[1], r1[2], r1[3], pr.bag, bc);
    if (plan.straps) { // two straps over the chest
      at('straps');
      for (const sx of [-1, 1]) {
        const x = sx * .072 * H, w = .011 * H, ya = torsoH * .99, yb = torsoH * .4;
        const q = [[x - w, ya], [x + w, ya], [x + w, yb], [x - w, yb]].map(([qx, qy]) => front(qx, qy, GAP * 1.5));
        e.face(q[0], q[1], q[2], shadeTone(pr.bag, .82), [0, 0, 1]).face(q[0], q[2], q[3], shadeTone(pr.bag, .82), [0, 0, 1]);
      }
    }
  }

  // ---- hips: trousers seat (8) or the pleated skirt in two rigid halves (2 × 12)
  if (pr.skirt) {
    at('skirt');
    // 03-media-falda-plisada: stations every 30° with radial factors 1 / .78 at waist and hem.
    const ax = .115 * H, az = .07 * H, len = .165 * H * (pre ? .9 : 1), wy = .012 * H;
    for (const [leg, sx] of [[legL, 1], [legR, -1]]) {
      bone(leg);
      const st = [0, 1, 2, 3, 4, 5, 6].map(i => {
        const a = i * Math.PI / 6, f = i % 2 ? .78 : 1, over = i === 0 || i === 6 ? -.008 * H : 0;
        return [sx * (Math.sin(a) * ax * f + over) - sx * legX, Math.cos(a) * az * f];
      });
      const tp = st.map(([x, z]) => [x, wy, z]), bt = st.map(([x, z]) => [(x + sx * legX) * 1.16 - sx * legX, wy - len, z * 1.16]);
      const ctr = [-sx * legX, wy - len * .5, 0];
      for (let i = 0; i < 6; i++) facet4(tp[i], bt[i], bt[i + 1], tp[i + 1], C.navy, ctr, 1.3);
    }
  } else {
    bone(hips); at('pelvisTrousers');
    tube(-.075 * H, .004 * H, SW * .82, TD * .84, SW * .86, TD * .88, pr.pants);
  }

  // ---- head: R2 pieces on every short-haired primaria student, or v1 head (20) and neck (6)
  bone(neck);
  let sockets = [];
  if (pr.r2Head) {
    sockets = emitR2({ at, bone, e, bones: { head: neck }, pr, H }, Object.keys(plan).filter(k => R2_HEAD.includes(k)));
    if (plan.goggles) { bone(neck); at('goggles'); r2Goggles(e, H); }
  } else {
  const y0 = pr.neck, W = .4375 * hc / 1.06, D = .4 * hc, v = t => y0 + t * hc;
  const ringAt = (y, s = 1, dz = 0) => COLS.map(([fx, fz]) => [fx * W * s, y, fz * D * s + dz]);
  const Cr = ringAt(v(.3));
  const hctr = [0, v(.45), 0];
  at('headNeck');
  { // triangular neck prism, from inside the torso into the head
    const nr = .2 * W, ring = yy => [0, 1, 2].map(i => { const a = i / 3 * Math.PI * 2 + Math.PI / 6; return [Math.cos(a) * nr, yy, Math.sin(a) * nr - .02 * hc]; });
    const n0 = ring(-.012 * H), n1 = ring(v(.12));
    band(n0, n1, shadeTone(skin, .88), [0, (n0[0][1] + n1[0][1]) / 2, -.02 * hc]);
  }
  const jaw = [.4, .72, .46, -.6];
  const KL = [-jaw[0] * W, y0, jaw[1] * D], KR = [jaw[0] * W, y0, jaw[1] * D], KBR = [jaw[2] * W, v(.08), jaw[3] * D], KBL = [-jaw[2] * W, v(.08), jaw[3] * D];
  facet4(KL, KR, Cr[1], Cr[0], skin, hctr); // chin front
  facet(KR, Cr[1], Cr[2], skin, hctr); facet(KR, Cr[2], Cr[3], skin, hctr); facet4(KR, Cr[3], Cr[4], KBR, skin, hctr);
  facet4(KBR, Cr[4], Cr[5], KBL, skin, hctr);
  facet(KL, Cr[7], Cr[0], skin, hctr); facet(KL, Cr[6], Cr[7], skin, hctr); facet4(KBL, Cr[5], Cr[6], KL, skin, hctr);
  // Skin stops at the hairline HL; at the sides and back it coincides with the cheek ring.
  const hl = [.56, .42];
  const HL = Cr.map((q, k) => k === 0 || k === 1 ? [q[0] * .98, v(hl[0]), q[2] * .97] : k === 2 || k === 7 ? [q[0] * .99, v(hl[1]), q[2] * .99] : q);
  facet4(Cr[0], Cr[1], HL[1], HL[0], skin, hctr); // forehead
  facet4(Cr[1], Cr[2], HL[2], HL[1], skin, hctr); facet4(Cr[7], Cr[0], HL[0], HL[7], skin, hctr);
  facet(Cr[2], Cr[3], HL[2], skin, hctr); facet(Cr[6], Cr[7], HL[7], skin, hctr);

  // ---- face (6): two eyes and a chevron smile, flat on the planar front panels
  at('face');
  const forehead = (x, y) => onPlane(Cr[0], Cr[1], HL[1], x, y, GAP);
  const chin = (x, y) => onPlane(KL, KR, Cr[1], x, y, GAP);
  const ey = v(.4), ew = hc * (pre ? .03 : .027), eh = hc * (pre ? .05 : .046), ex = hc * .15;
  if (!pr.headset) for (const sx of [-1, 1]) {
    const q = [[sx * ex - ew, ey - eh], [sx * ex + ew, ey - eh], [sx * ex + ew, ey + eh], [sx * ex - ew, ey + eh]].map(([x, y]) => forehead(x, y));
    e.face(q[0], q[1], q[2], C.ink, [0, 0, 1]).face(q[0], q[2], q[3], C.ink, [0, 0, 1]);
  }
  { const my = v(.16), mw = hc * .085, dp = hc * .04, th = hc * .024;
    const L = chin(-mw, my + .01 * hc), R = chin(mw, my + .01 * hc), Mb = chin(0, my - dp), Mt = chin(0, my - dp + th);
    e.face(L, Mb, Mt, C.ink, [0, 0, 1]).face(Mt, Mb, R, C.ink, [0, 0, 1]); }
  if (plan.ears) { // ears (4): a small folded tent on each side panel
    at('ears');
    for (const [a, c, d, sx] of [[Cr[2], Cr[3], HL[2], 1], [Cr[7], Cr[6], HL[7], -1]]) {
      const top_ = mix(a, d, .85), low = mix(a, c, .35), mid = mix(mix(a, c, .5), d, .35);
      const tip = add(mean([top_, low, mid]), [sx * .07 * hc, .01 * hc, .02 * hc]);
      e.face(top_, mid, tip, tone(skin, [sx, .3, .3]), [sx, .2, .3]).face(mid, low, tip, shadeTone(skin, .92), [sx, -.1, .2]);
    }
  }

  // ---- hair: a 32-triangle core (band 8→8, transition 8→4, offset apex) plus strands
  at('hairMass');
  const hairHex = pr.hair, style = pr.style, capped = style === 'cap' || style === 'cap-pig';
  const side = hash(pr.seed, 'apex') < .5 ? -1 : 1, Wr = .4375 * hc, Dr = D * 1.1;
  const jitter = (key, k, s) => 1 + (hash(pr.seed, key, k) - .5) * s;
  const out = q => unit([q[0], 0, q[2] + .15 * D]);
  if (!capped) {
    const R = COLS.map(([fx, fz], k) => [fx * Wr * jitter('hr', k, .06), v(fz > .9 ? .67 : .66 + (hash(pr.seed, 'hy', k) - .5) * .04), fz * (fz > .9 ? D * 1.12 : Dr * jitter('hd', k, .06))]);
    const U = [[0, .52], [.6, -.05], [0, -.62], [-.6, -.05]].map(([fx, fz], j) => [fx * Wr, v(.87 + hash(pr.seed, 'uy', j) * .05), fz * Dr]);
    const apex = [side * (.05 + hash(pr.seed, 'ax') * .05) * hc, v(1), -.06 * hc];
    const hctr2 = [0, v(.6), 0];
    band(HL, R, hairHex, hctr2, null, .8); // 16
    for (let j = 0; j < 4; j++) { // 8→4: 12
      facet(R[2 * j], R[2 * j + 1], U[j], hairHex, hctr2, .8);
      facet4(R[2 * j + 1], R[(2 * j + 2) % 8], U[(j + 1) % 4], U[j], hairHex, hctr2, .8);
    }
    for (let j = 0; j < 4; j++) facet(U[j], U[(j + 1) % 4], apex, hairHex, hctr2, .8); // crown: 4
    const depth = .0106 * H;
    if (style === 'long') { // melena (60): three front strands and a folded mantle
      if (!pr.headset) {
        at('fringe');
        const E = [R[7], R[0], R[1], R[2]];
        for (let i = 0; i < 3; i++) {
          const A = mix(E[i], E[i + 1], .05), B = mix(E[i], E[i + 1], .95), m = mix(A, B, .5);
          strand(A, B, [m[0] + side * .04 * hc, v(.49), Math.max(m[2] - .06 * hc, m[2] * .55 + D * .5)], out(m), depth, hairHex);
        }
        at('hairMass');
      }
      const ex_ = (fx, fz, y, r) => [fx * Wr * r, y, fz * Dr * r];
      const X = [ex_(-1, .25, v(.64), .92), ex_(-.78, -1, v(.64), .92), ex_(.78, -1, v(.64), .92), ex_(1, .25, v(.64), .92)];
      const Y = [ex_(-1.12, .2, v(.08), 1), ex_(-.88, -1.1, v(.04), 1), ex_(.88, -1.1, v(.04), 1), ex_(1.12, .2, v(.08), 1)];
      // Interior sheet: each corner moves inward along the mitred panel normals, so every
      // panel keeps 0.016 H (≥ 0.0099 at preprimaria) of normal separation from the exterior.
      const inset = ring => {
        const n = [0, 1, 2].map(i => { const d = sub(ring[i + 1], ring[i]), m = mix(ring[i], ring[i + 1], .5), q = unit([-d[2], 0, d[0]]); return q[0] * m[0] + q[2] * m[2] < 0 ? mul(q, -1) : q; });
        return ring.map((q, i) => { const m = unit(add(n[Math.max(0, i - 1)], n[Math.min(2, i)])); return sub(q, mul(m, .016 * H / dotV(m, n[Math.min(2, i)]))); });
      };
      const Xi = inset(X), Yi = inset(Y), mc = [0, v(.35), -.2 * D];
      for (let i = 0; i < 3; i++) {
        facet4(X[i], X[i + 1], Y[i + 1], Y[i], hairHex, mc, .8); // exterior 6
        const n = normalOf(Xi[i], Xi[i + 1], Yi[i + 1]), toward = dotV(n, sub(mc, Xi[i])) > 0 ? n : mul(n, -1);
        e.face(Xi[i], Xi[i + 1], Yi[i + 1], shadeTone(hairHex, .78), toward).face(Xi[i], Yi[i + 1], Yi[i], shadeTone(hairHex, .78), toward); // interior 6
        e.face(Y[i], Y[i + 1], Yi[i + 1], shadeTone(hairHex, .86), [0, -1, 0]).face(Y[i], Yi[i + 1], Yi[i], shadeTone(hairHex, .86), [0, -1, 0]); // lower edge 6
      }
      for (const [a, c, ai, ci, sx] of [[X[0], Y[0], Xi[0], Yi[0], -1], [X[3], Y[3], Xi[3], Yi[3], 1]]) // sides 4
        e.face(a, c, ci, shadeTone(hairHex, .9), [0, 0, 1]).face(a, ci, ai, shadeTone(hairHex, .9), [0, 0, 1]);
    } else {
      if (!pr.headset) { // four front strands across the front and chamfers, swept to one side
        at('fringe');
        const E = [R[7], R[0], R[1], R[2]], u = [0, .5, 1.5, 2.5, 3].map(t => t / 3);
        const along = t => { const s = Math.min(2.999, t * 3), i = Math.floor(s); return mix(E[i], E[i + 1], s - i); };
        const sweep = side * .05 * hc;
        for (let i = 0; i < 4; i++) {
          const A = along(u[i]), B = along(u[i + 1]), m = mix(A, B, .5);
          strand(A, B, [m[0] + sweep * (1 - Math.abs(m[0]) / Wr * .5), v(.47 + (i % 2) * .04), Math.max(m[2] - .06 * hc, m[2] * .55 + D * .5)], out(m), depth, hairHex);
        }
        at('hairMass');
      }
      for (const [a, c, sx] of [[R[2], R[3], 1], [R[6], R[7], -1]]) { // temples
        const A = mix(a, c, .1), B = mix(a, c, .7), m = mix(A, B, .5);
        strand(A, B, [m[0] * .99, v(.34), m[2] + .03 * hc], [sx, 0, .1], depth, hairHex);
      }
      const Mb = mix(R[4], R[5], .5); // nape
      for (const [A, B] of [[R[4], Mb], [Mb, R[5]]]) {
        const m = mix(A, B, .5);
        strand(A, B, [m[0] * .8, v(.16), m[2] - .07 * hc], [0, -.1, -1], depth, hairHex);
      }
      if (style === 'pony') bundle([0, v(.66), -1.02 * Dr], [0, v(.02), -1.3 * Dr], [0, v(.34), -1.28 * Dr], .12 * hc, 4, hairHex, 'pony');
      else if (style === 'bun') bundle([0, v(1.02), -.62 * Dr], [0, v(.58), -1.12 * Dr], [0, v(.8), -1.02 * Dr], .14 * hc, 4, hairHex, 'bun');
      else if (style === 'pig') for (const sx of [-1, 1]) bundle([sx * .96 * Wr, v(.58), -.32 * Dr], [sx * 1.12 * Wr, v(-.04), -.42 * Dr], [sx * 1.16 * Wr, v(.3), -.38 * Dr], .17 * hc, 3, hairHex, 'pig' + sx);
    }
  } else {
    // Cap (48): hair band under the rim 16, crown 16 (8→4, 4 to the top), visor 10, fringe 4, nape 2.
    const Lc = HL.map((q, k) => { const d = unit([COLS[k][0] * W, 0, COLS[k][1] * D]); return add([q[0], v(.68), q[2]], mul(d, .03 * hc)); });
    band(HL, Lc, hairHex, [0, v(.5), 0], null, .8);
    const cap = C.yellow, cc = [0, v(.7), 0];
    const rim = COLS.map(([fx, fz]) => [fx * Wr * 1.06, v(fz > .9 ? .7 : .64), fz * Dr * 1.04 + .01 * hc]);
    const U = [[0, .6], [.66, 0], [0, -.66], [-.66, 0]].map(([fx, fz]) => [fx * Wr, v(.9), fz * Dr - .02 * hc]);
    const topP = [0, v(1), -.03 * hc];
    for (let j = 0; j < 4; j++) {
      facet(rim[2 * j], rim[2 * j + 1], U[j], cap, cc, .8);
      facet4(rim[2 * j + 1], rim[(2 * j + 2) % 8], U[(j + 1) % 4], U[j], cap, cc, .8);
    }
    for (let j = 0; j < 4; j++) facet(U[j], U[(j + 1) % 4], topP, cap, cc, .8);
    // visor: a thick card from the front rim (top 2, bottom 2, front and sides 6)
    if (!pr.headset) { // the goggles replace the visor
      const vl = rim[0], vr = rim[1], reach_ = .16 * hc, th = Math.max(GAP * 1.4, .02 * hc);
      const fl = [vl[0] * 1.1, vl[1] - .06 * hc, vl[2] + reach_], fr = [vr[0] * 1.1, vr[1] - .06 * hc, vr[2] + reach_];
      const dn = q => [q[0], q[1] - th, q[2]];
      e.face(vl, vr, fr, shadeTone(cap, 1.06), [0, 1, .2]).face(vl, fr, fl, shadeTone(cap, 1.06), [0, 1, .2]);
      e.face(dn(vl), dn(vr), dn(fr), C.yellowDark, [0, -1, 0]).face(dn(vl), dn(fr), dn(fl), C.yellowDark, [0, -1, 0]);
      e.face(fl, fr, dn(fr), shadeTone(cap, .95), [0, 0, 1]).face(fl, dn(fr), dn(fl), shadeTone(cap, .95), [0, 0, 1]);
      for (const [a, c, sx] of [[vl, fl, -1], [vr, fr, 1]]) e.face(a, c, dn(c), shadeTone(cap, .9), [sx, 0, 0]).face(a, dn(c), dn(a), shadeTone(cap, .9), [sx, 0, 0]);
    }
    const depth = .0106 * H;
    if (!pr.headset) { // fringe under the visor
      at('fringe');
      for (const [u0, u1] of [[.15, .5], [.5, .85]]) {
        const A = mix(Lc[0], Lc[1], u0), B = mix(Lc[0], Lc[1], u1), m = mix(A, B, .5);
        strand(A, B, [m[0] + side * .03 * hc, v(.58), m[2] + .04 * hc], [0, 0, 1], depth, hairHex);
      }
      at('hairMass');
    }
    { const A = Lc[4], B = Lc[5], m = mix(A, B, .5); strand(A, B, [m[0], v(.2), m[2] - .06 * hc], [0, -.1, -1], depth, hairHex); }
    if (style === 'cap-pig') for (const sx of [-1, 1]) bundle([sx * .96 * Wr, v(.58), -.32 * Dr], [sx * 1.12 * Wr, v(-.04), -.42 * Dr], [sx * 1.16 * Wr, v(.3), -.38 * Dr], .16 * hc, 3, hairHex, 'pig' + sx);
  }
  if (pr.headset) { // VR goggles (10): white plate, top, side straps, dark lens
    at('goggles');
    const fz = forehead(0, ey)[2] + .03 * hc, vh = .12 * hc, vw = .4 * hc;
    const P = [[-vw, ey - vh, fz], [vw, ey - vh, fz], [vw, ey + vh, fz], [-vw, ey + vh, fz]];
    e.face(P[0], P[1], P[2], C.white, [0, 0, 1]).face(P[0], P[2], P[3], C.white, [0, 0, 1]);
    const F2 = [vw * .9, ey + vh, fz - .07 * hc], F3 = [-vw * .9, ey + vh, fz - .07 * hc];
    e.face(P[3], P[2], F2, shadeTone(C.white, .95), [0, 1, 0]).face(P[3], F2, F3, shadeTone(C.white, .95), [0, 1, 0]);
    for (const sx of [-1, 1]) {
      const f0 = [sx * vw, ey + vh * .6, fz], f1 = [sx * vw, ey - vh * .6, fz], r0 = [sx * W * 1.04, ey + vh * .5, -.3 * D], r1 = [sx * W * 1.04, ey - vh * .5, -.3 * D];
      e.face(f0, f1, r1, C.dark, [sx, 0, 0]).face(f0, r1, r0, C.dark, [sx, 0, 0]);
    }
    const lw = vw * .8, lh = vh * .62, lz = fz + GAP;
    e.face([-lw, ey - lh, lz], [lw, ey - lh, lz], [lw, ey + lh, lz], C.dark, [0, 0, 1]).face([-lw, ey - lh, lz], [lw, ey + lh, lz], [-lw, ey + lh, lz], C.dark, [0, 0, 1]);
  }

  }

  // ---- arms: two-section sleeve (8), upper arm (8), forearm (8), folded wedge hand (8)
  for (const [arm, forearm, sx] of [[armL, foreL, 1], [armR, foreR, -1]]) {
    bone(arm); at('sleeves');
    { // 02-manga-desplegada: top 0.066 × 0.060 H (0.052 deep here, so it stays under the shoulder when the arm rises), bottom 0.074 × 0.070 H, 0.075 H long, both ends open
      const len = (teacher ? .07 : .075) * H, ox = -sx * .03 * H, oy = -.002 * H;
      const t = [[-.033, .026], [.033, .026], [.033, -.026], [-.033, -.026]].map(([x, z]) => [ox + x * H, oy, z * H]);
      const bt = [[-.037, .035], [.037, .035], [.037, -.035], [-.037, -.035]].map(([x, z]) => [x * H + sx * .004 * H, oy - len, z * H]);
      band(t, bt, shirt, [ox, oy - len / 2, 0]);
    }
    at('upperArms');
    const aw = .026 * H;
    tube(-.035 * H, -upper - .004 * H, aw, aw * 1.04, aw * .9, aw * .94, teacher ? shirt : skin);
    bone(forearm); at('forearmsHands');
    const wz = fore * .12; // a relaxed elbow in rest pose
    // The forearm starts inside the upper arm, 0.0075 H inside its walls (≥ 0.004 at every level).
    const fw = aw * .9 - .0075 * H, ww = aw * .8;
    tube(.012 * H, -fore, fw, aw * .94 - .0075 * H, ww, ww * 1.06, teacher ? shadeTone(shirt, .96) : skin, { z1: wz, x1: sx * .004 * H }); // never parallel to the thigh
    { // closed hand (8): a knuckle ring low on the hand, the wrist apex inside the forearm, short finger point
      const hx = sx * .004 * H, yk = -fore - .028 * H, top_ = [hx, -fore + .022 * H, wz], tip = [hx + sx * .003 * H, -fore - handL, wz + .006 * H];
      const xo = hx + sx * ww * 1.1, xi = hx - sx * ww * .8; // narrower on the side that faces the thigh
      const K = [[Math.min(xo, xi), yk, wz - ww * 1.1], [Math.max(xo, xi), yk, wz - ww * 1.1], [Math.max(xo, xi), yk + .004 * H, wz + ww * 1.3], [Math.min(xo, xi), yk + .004 * H, wz + ww * 1.3]];
      const hc_ = mean(K);
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        facet(K[i], K[j], top_, skin, hc_); facet(K[i], K[j], tip, shadeTone(skin, .94), hc_);
      }
    }
    if (pr.notebook && sx === -1) { // notebook (8): a thin card held in the right hand
      at('notebook');
      const nx = -.012 * H, ny = -fore - .045 * H, nz = wz + .06 * H, hw = .055 * H, hh = .068 * H, t2 = .008 * H;
      const q = (x, y, z) => [nx + x, ny + y, nz + z];
      const Fq = [q(-t2, -hh, -hw), q(-t2, -hh, hw), q(-t2, hh, hw), q(-t2, hh, -hw)], Bq = Fq.map(p_ => [p_[0] + 2 * t2, p_[1], p_[2]]);
      e.face(Fq[0], Fq[1], Fq[2], C.orange, [-1, 0, 0]).face(Fq[0], Fq[2], Fq[3], C.orange, [-1, 0, 0]);
      e.face(Bq[0], Bq[1], Bq[2], shadeTone(C.orange, .9), [1, 0, 0]).face(Bq[0], Bq[2], Bq[3], shadeTone(C.orange, .9), [1, 0, 0]);
      e.face(Fq[2], Fq[3], Bq[3], C.white, [0, 1, 0]).face(Fq[2], Bq[3], Bq[2], C.white, [0, 1, 0]);
      e.face(Fq[1], Fq[2], Bq[2], C.white, [0, 0, 1]).face(Fq[1], Bq[2], Bq[1], C.white, [0, 0, 1]);
    }
  }

  // ---- legs: trousers, or skin with white socks under the skirt; closed wedge shoes (8)
  for (const [leg, lower] of [[legL, shinL], [legR, shinR]]) {
    bone(leg); at(pr.skirt ? 'legs' : 'pelvisTrousers');
    if (pr.skirt) tube(.008 * H, -thigh - .004 * H, .042 * H, .044 * H, .034 * H, .038 * H, skin);
    else tube(.008 * H, -thigh - .012 * H, .05 * H, .053 * H, .045 * H, .048 * H, pr.pants);
    bone(lower); at(pr.skirt ? 'legs' : 'pelvisTrousers');
    if (pr.skirt) {
      const ys = -shin * .5;
      tube(.01 * H, ys, .033 * H, .036 * H, .031 * H, .034 * H, skin);
      tube(ys + .004 * H, -shin, .039 * H, .042 * H, .037 * H, .04 * H, C.shirt); // sock cuff 0.0075 H outside the skin
    } else tube(.026 * H, -shin, .038 * H, .041 * H, .04 * H, .044 * H, pr.pants); // starts inside the thigh: the knee never opens
    at('shoes');
    const yb = -shin - shoeH, yt = -shin + .014 * H, w = .043 * H, sc = [0, -shin - shoeH * .4, .02 * H];
    const hL = [-w, yb, -.045 * H], hR = [w, yb, -.045 * H], tL = [-w * .9, yb + .008 * H, .1 * H], tR = [w * .9, yb + .008 * H, .1 * H]; // toe spring: the sole touches the floor only at the heel edge
    const kL = [-w * .96, yt, -.04 * H], kR = [w * .96, yt, -.04 * H];
    const shoe = pr.shoeHex;
    {
      facet4(hL, hR, tR, tL, shadeTone(shoe, .8), sc); facet4(hL, hR, kR, kL, shadeTone(shoe, .9), sc);
      facet4(kL, kR, tR, tL, shoe, sc); facet(hR, tR, kR, shoe, sc); facet(hL, tL, kL, shoe, sc);
    }
  }
  return finish({ root, hips, torso, head: neck, armL, armR, foreL, foreR, legL, legR, shinL, shinR }, { hipY, thigh, shin, landmarks: personLandmarks(pr), sockets });
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
  makePiece({ id: 'person-prim', label: 'Primaria', level: 'prim', budget: 280, spec: { seed: 'prim-b', hair: 'short', skirt: false } }),
  makePiece({ id: 'person-prim-skirt', label: 'Primaria con falda', level: 'prim', budget: 280, spec: { seed: 'prim-b', hair: 'short', skirt: true } }),
  makePiece({ id: 'person-bas', label: 'Básico', level: 'bas', budget: 280, spec: { seed: 'bas-a', hair: 'long', skirt: true } }),
  makePiece({ id: 'person-bach', label: 'Bachillerato', level: 'bach', budget: 280, spec: { seed: 'bach-a', hair: 'pony', skirt: false } }),
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
    id: 'pose-hand', label: 'Mano levantada', level: 'prim', budget: 280, width: .45, spec: { seed: 'prim-b', hair: 'short', skirt: true },
    pose: person => applyPose(person, POSES.hand(), 'stand')
  }),
  makePiece({
    id: 'pose-headset', label: 'Con visor', level: 'bach', budget: 280, width: .45, spec: { seed: 'bach-a', hair: 'short', headset: true },
    pose: person => applyPose(person, POSES.vr(1.2, 0), 'stand')
  })
];
