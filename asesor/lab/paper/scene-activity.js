/**
 * Ambient life of the papercraft campus. Every pose is a pure function of the
 * actors composed by compose.js (`meta.actors`) and the animation clock T in
 * seconds: the same actors at the same T give the same pose whatever was shown
 * before, so a rebuilt entity, a resumed tab, a paused frame or a test always
 * land on the same frame.
 *
 * Each room runs an endless schedule of activity beats. Beats have fixed
 * lengths; their order is reshuffled every cycle from the room key and the cycle
 * number, and every room starts at its own phase, so rooms are never in sync and
 * a room does not repeat itself within a minute. Under the beat every person
 * carries an idle layer with its own seed (typing rhythm, glances, nods), so two
 * frames a second apart always differ.
 *
 *   level class: lecture at the screen, questions with raised hands, the teacher's
 *     rounds to a laptop, neighbours talking, a student at the board;
 *   robotics: a student programs (laptop or the robot's own buttons), the robot
 *     runs on its mat, the table cheers (or groans) and the facilitator
 *     high-fives, then the robot is carried back; the two tables run out of phase;
 *   electronics: plugging components, testing, nodding when it works;
 *   immersive: looking around, grabbing virtual objects, lifting the visor to talk;
 *   drones: take-off, two figure-eights and a landing; the pilot tilts the
 *     controller and the audience follows the flight and cheers the landing;
 *   services: trainers slide the kit box to each other, the follow-up teacher types;
 *   stations and separate schedules: students rotate seats or groups swap places;
 *   yard: pairs walk from the entrance to a door and back chatting, groups talk,
 *     people on benches talk to each other.
 *
 * Positions are read from the actors at runtime (seats, tables, homes, device
 * homes, bones found once through the rig by bindLife); optional fields and bones
 * degrade gracefully. `still` gives the calm final state shown with reduced
 * motion. Big moments (a robot reaching its goal, a drone landing) are returned
 * as events so the scene can react (Geeky).
 */
import { clamp, span, smooth, lerp, hash, TAU } from '../campus-kit.js';
import { applyPose, applySeated, placePerson, POSES, reach, blendBody, mixPose, along, turnTo, look, pose } from '../campus-people.js';
import { CATALOG } from './catalog.js';
import { SCALE } from './kit.js';

/** Length of the former single activity run; kept for tickActors() callers. */
export const RUN = 13;
const SIT = SCALE.seat + .02, BENCH = SCALE.bench + .02;
const sizeOf = id => (CATALOG.find(piece => piece.id === id) || {}).size;
const TABLE = sizeOf('table') || { w: .9, d: .55, h: .36 };
const BOX = sizeOf('kit-box') || { w: .2, d: .08, h: .26 };
/** Device footprints by programme (the pieces compose.js puts on project tables). */
const DEVICE_SIZE = { tale: sizeOf('robot-tale'), master: sizeOf('robot-dino'), spike: sizeOf('kit-spike'), electronics: sizeOf('electronics') };
const MAT_HALF = .33; // half length of the track mat under a device
const WALK_SPEED = .42; // world units per second, people on foot
const SIT_POSE = POSES.sit();
/** Hologram float: bob amplitude (its own, scaled units) and the turn it rests at, low in its bob. */
const HOLO_BOB = .018, HOLO_TURN = .82;
/** Walking indoors: forearms up in front (the aisle between tables is narrow), the head free. */
const INDOOR = pose({ armL: [-.35, 0, -.04], armR: [-.35, 0, .04], foreL: [-1.15, 0, 0], foreR: [-1.15, 0, 0], head: [.05, 0, 0] });
const REST_HANDS = pose({ armL: [-.7, 0, -.1], armR: [-.7, 0, .1], foreL: [-.8, 0, 0], foreR: [-.8, 0, 0], head: [.22, 0, 0], torso: [.08, 0, 0] });

// ------------------------------------------------------------------ small helpers
const wrap = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
const mod = (x, n) => ((x % n) + n) % n;
/** 1 inside [a, b] with eased ramps of `r` seconds at both ends, 0 outside. */
const win = (t, a, b, r = .5) => span(t, a, a + r) * (1 - span(t, b - r, b));
/** Smooth deterministic wobble in about [-1, 1]. */
const wobble = (t, k) => (Math.sin(t * .71 + k) + .6 * Math.sin(t * 1.37 + k * 2.3) + .4 * Math.sin(t * .29 + k * 4.1)) / 2;
const seedOf = (...values) => (hash(...values) * 4294967296) >>> 0;
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Deterministic number in [0, 1) for (seed, n). */
const chance = (seed, n) => rng((seed ^ Math.imul(n + 1, 0x9E3779B1)) >>> 0)();
const heading = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const at = (x, z, ry = 0) => ({ x, z, ry });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Schedule of beats with fixed lengths. The order is reshuffled every cycle and
 * every schedule starts at its own phase (both from `key`).
 */
function schedule(beats, key) {
  const total = beats.reduce((n, b) => n + b.dur, 0);
  return { beats, total, seed: seedOf(key, 'beats'), phase: hash(key, 'phase') * total * 5, cycle: null, order: null };
}
function beatAt(S, T) {
  const t = T + S.phase, c = Math.floor(t / S.total);
  if (S.cycle !== c) {
    // Cache of the current cycle's order only; it is a pure function of (seed, c).
    const r = rng((S.seed ^ Math.imul(c + 1, 0x9E3779B1)) >>> 0), order = S.beats.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    S.cycle = c; S.order = order;
  }
  let k = t - c * S.total;
  for (let i = 0; i < S.order.length; i++) {
    const b = S.beats[S.order[i]];
    if (k < b.dur || i === S.order.length - 1) return { id: b.id, k, dur: b.dur, n: c * S.beats.length + i };
    k -= b.dur;
  }
  return null;
}

/** Walk along `pts` at progress k (0..1, eased), turning from ry0 at the start to ry1 at the end. */
function walkAlong(ctrl, pts, k, floor, ry0, ry1, upper = INDOOR, armsW = upper === INDOOR ? .75 : .45) {
  const e = smooth(k), pos = along(pts, e);
  const ry = k < .1 ? turnTo(ry0, pos.heading, k / .1) : k > .9 ? turnTo(pos.heading, ry1, (k - .9) / .1) : pos.heading;
  placePerson(ctrl, pos.x, pos.z, ry, floor);
  // The walk cycle follows the distance travelled, so the feet do not slide.
  const moving = Math.min(1, Math.min(k, 1 - k) * 12), stride = .5 * (ctrl.scale || .8);
  const p = POSES.walk(e * pos.length / stride * Math.PI, moving);
  applyPose(ctrl, upper ? liftLowHands(ctrl, mixArms(p, upper, armsW)) : p);
}
/**
 * Long arms (an elbow below 0.54 H, as the Meshy student's) carry the forearms higher while
 * walking indoors, so the hands pass over the table tops instead of through their edge.
 */
function liftLowHands(ctrl, p) {
  const elbow = ctrl.landmarks?.elbow, H = ctrl.scale || .8;
  if (!elbow || elbow / H >= .54) return p;
  for (const key of ['foreL', 'foreR']) p[key] = [p[key][0] - .35, p[key][1], p[key][2]];
  return p;
}
/** Arms (by `w`) and head of `upper` over a walking body. */
function mixArms(walk, upper, w) {
  const out = { ...walk };
  for (const key of ['armL', 'armR', 'foreL', 'foreR', 'head']) out[key] = walk[key].map((v, i) => lerp(v, upper[key][i], key === 'head' ? 1 : w));
  return out;
}
/** Seated pose with an upper body. */
const seatPose = (ctrl, upper, seat = SIT) => applyPose(ctrl, blendBody(SIT_POSE, upper), 'sit', seat);
/** Seated at a table seat `s`: the same, with both hands kept above the table top. */
function seatAt(ctrl, upper, s, L) {
  // The hands hang beside the seat axis: a seat facing the gap between two tops still has
  // them over a top, so the edge is the nearest one of any top along the centre and both shoulder lines.
  const side = Math.abs(ctrl.joints.armR.position.x), rx = Math.cos(s.ry), rz = -Math.sin(s.ry), top = L.topOf(s);
  const edges = [];
  for (const t of L.tops) for (const o of [0, side, -side]) {
    const q = { ...s, x: s.x + rx * o, z: s.z + rz * o }, over = q.x > t.x0 && q.x < t.x1 && q.z > t.z0 && q.z < t.z1; // a shoulder already over the top
    const d = over ? 0 : edgeAlong(q, t); if (d != null) edges.push([d, t]);
  }
  edges.sort((a, b) => a[0] - b[0]);
  const edge = edges.length ? edges[0][0] : null, height = edges.length ? edges[0][1].h : top?.h;
  if (edge != null) guardTable(ctrl, upper, edge, height);
  seatPose(ctrl, upper);
}
/** Distance from a seat to a table top along the sitter's facing (null when it faces away). */
function edgeAlong(s, top) {
  const fx = Math.sin(s.ry), fz = Math.cos(s.ry);
  let t0 = -Infinity, t1 = Infinity;
  for (const [o, d, lo, hi] of [[s.x, fx, top.x0, top.x1], [s.z, fz, top.z0, top.z1]]) {
    if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) return null; continue; }
    let a = (lo - o) / d, b = (hi - o) / d;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
  }
  return t1 >= t0 && t0 >= 0 && t0 < .6 ? t0 : null;
}
/** Seated `edge` from a table's near edge (default: a chair at a catalog table), hands above its top. For tools. */
export function seatAtTable(ctrl, upper, edge = .44 - TABLE.d / 2, height = TABLE.h) { seatPose(ctrl, guardTable(ctrl, upper, edge, height)); }
const ARMS = new WeakMap();
/**
 * Raise the arms (more shoulder flexion) until both forearm tips and elbows over
 * the table clear its top (`height` above the floor): short people sit with their
 * shoulders close to the table, and a forward lean swings the arms back. Sagittal
 * approximation; the clipping test in campus-life.test.js checks the 3-D result.
 */
function guardTable(ctrl, p, edge, height = TABLE.h) {
  let a = ARMS.get(ctrl);
  if (!a) {
    const H = ctrl.scale || .8;
    a = { sh: ctrl.joints.armR.position.y, l1: Math.abs(ctrl.joints.foreR.position.y) || .16 * H, l2: .155 * H };
    ARMS.set(ctrl, a);
  }
  const top = height + .016, tau = p.torso[0], sy = SIT + .03 + a.sh * Math.cos(tau), sf = a.sh * Math.sin(tau);
  for (const [arm, fore] of [['armL', 'foreL'], ['armR', 'foreR']]) {
    for (let i = 0; i < 16; i++) {
      const A = -p[arm][0] - tau, F = A - p[fore][0];
      const ey = sy - a.l1 * Math.cos(A), ef = sf + a.l1 * Math.sin(A);
      const hy = ey - a.l2 * Math.cos(F), hf = ef + a.l2 * Math.sin(F);
      if (!((hf > edge - .04 && hy < top) || (ef > edge - .03 && ey < top))) break;
      p[arm] = [p[arm][0] - .06, p[arm][1], p[arm][2]];
    }
  }
  return p;
}
/** Turn the head (and a little of the torso) toward an absolute heading. Mutates `p`. */
function lookToward(p, bodyRy, target, pitch, w) {
  const yaw = clamp(wrap(target - bodyRy), -1.25, 1.25);
  look(p, clamp(yaw, -.95, .95), pitch, w);
  p.torso[1] = lerp(p.torso[1], yaw * .3, w);
  return p;
}
const nod = (p, t, w) => { p.head[0] += Math.sin(t * 7) * .12 * w; return p; };
/**
 * From a point to the centre aisle (x of the room's centre line): straight across
 * when that is clear, else first a step back (behind the chairs, from the point's
 * own facing `ry`) and across from there.
 */
function toAisle(L, p, x = 0) {
  const clear = (x0, z) => {
    for (let u = 0; u <= 1.001; u += .1) { const q = at(lerp(x0, x, u), z); if (dist(q, p) > .12 && L.blocked(q, .09)) return false; }
    return true;
  };
  if (!L.blocked || clear(p.x, p.z)) return [[p.x, p.z]];
  // Behind the chair it belongs to (`back`), else behind the point's own facing, else either way in z.
  const backs = [p.back, p.ry != null && [-Math.sin(p.ry), -Math.cos(p.ry)], [0, 1], [0, -1]].filter(Boolean);
  for (const [ux, uz] of backs) {
    const bx = p.x + ux * .32, bz = p.z + uz * .32;
    if (!L.blocked(at(bx, bz), .09) && clear(bx, bz)) return [[p.x, p.z], [bx, bz]];
  }
  return [[p.x, p.z]];
}
/** Walking route from a to b through the centre aisle, around chairs and tables. */
function route(L, a, b, x = 0) {
  const A = toAisle(L, a, x), B = toAisle(L, b, x).reverse();
  return [...A, [x, A[A.length - 1][1]], [x, B[0][1]], ...B];
}
/** Standing up from a seat to the spot beside it (e = 0 seated, 1 standing), or the reverse. */
function rise(ctrl, seat, stand, e, floor, height = SIT) {
  e = smooth(clamp(e));
  placePerson(ctrl, lerp(seat.x, stand.x, e), lerp(seat.z, stand.z, e), seat.ry, floor);
  applySeated(ctrl, blendBody(mixPose(SIT_POSE, POSES.stand(), e), POSES.stand()), 1 - e, height);
}

// ------------------------------------------------------------------ bones found through the rig
const BOUND = new WeakMap();
/**
 * Look up the optional bones the activities move (laptops, wheels, the robot's
 * head and tail, the trainers' kit box, the drone controller) and remember
 * their rest transforms. Call once per built entity; every bone is optional.
 */
export function bindLife(actors, rig) {
  if (!actors || !rig || typeof rig.get !== 'function') return;
  const get = name => rig.get(name) || null;
  const rest = bone => bone && { bone, x: bone.position.x, y: bone.position.y, z: bone.position.z, ry: bone.rotation.y };
  // Diorama scale of a piece lives on its `.size` child (compose.js); 1 when there is none.
  const scaleOf = name => get(name + '.size')?.scale.x || 1;
  const names = (rig.bones || []).map(bone => bone.name);
  const rooms = new Map();
  for (const room of actors.rooms || []) {
    // Floor furniture that is not in the actors: people keep out of it.
    const furniture = [['shelf', 'shelf'], ['box', 'kit-box'], ['flag', null], ['holo', 'hologram']].map(([suffix, piece]) => {
      const name = `${room.key}.${suffix}`, r = rest(get(name)), size = piece && sizeOf(piece), k = scaleOf(name);
      return r && { x: r.x, z: r.z, ry: r.ry, w: (size ? size.w : .1) * k, d: (size ? size.d : .1) * k };
    }).filter(Boolean);
    // Every laptop of the room (one per student in level classrooms: `.t<i>.lap<k>`, the follow-up `.svclap`).
    const prefix = room.key + '.';
    const laptops = names.filter(name => name.startsWith(prefix) && /^(t\d+\.lap\d*|svclap)$/.test(name.slice(prefix.length))).map(name => rest(get(name)));
    if (!laptops.length) (room.tables || []).forEach((_, i) => { const r = rest(get(`${room.key}.t${i}.lap`)); if (r) laptops.push(r); });
    rooms.set(room, {
      furniture, laptops,
      box: rest(get(`${room.key}.svcbox`)),
      devices: (room.devices || []).map(d => {
        const name = d.bone.name;
        return { wheels: [0, 1, 2, 3].map(i => get(`${name}.wheel${i}`)).filter(Boolean), head: get(`${name}.head`), tail: get(`${name}.tail`) };
      })
    });
  }
  const drones = new Map((actors.drones || []).map(d => [d, { ctl: rest(get(`${d.bone.name}.ctl`)) }]));
  BOUND.set(actors, { rooms, drones });
}

// ------------------------------------------------------------------ per-room derived data
const LIFE = new WeakMap();
const CLASS_BEATS = [{ id: 'lecture', dur: 10 }, { id: 'question', dur: 9 }, { id: 'rounds', dur: 14 }, { id: 'pairs', dur: 9 }, { id: 'board', dur: 12 }, { id: 'quiet', dur: 8 }];
const VR_BEATS = [{ id: 'explore', dur: 10 }, { id: 'grab', dur: 8 }, { id: 'talk', dur: 8 }, { id: 'point', dur: 6 }, { id: 'explore2', dur: 7 }];
const ROUND = 20; // robotics: program [0, 6], run [6, 13], react [13, 16], reset [16, 20]
const ELEC_ROUND = 16; // electronics: plug [0, 6], test [6, 10], works [10, 12.5], notes [12.5, 16]
const RELAY_SWAP = 17; // separate schedules: two facilitator cycles of work (4 rounds), then the groups trade places

/** Table tops of a room: compose's `tops` when present, else the catalog table around each centre. */
function topsOf(room) {
  if (room.kind === 'vr') return [];
  if (room.tops?.length) return room.tops.map(t => ({ index: t.index, x: t.x, z: t.z, x0: t.x0, x1: t.x1, z0: t.z0, z1: t.z1, h: (t.y ?? room.floor + TABLE.h) - room.floor }));
  return (room.tables || []).map((tb, i) => ({ index: i, x: tb[0], z: tb[2], x0: tb[0] - TABLE.w / 2, x1: tb[0] + TABLE.w / 2, z0: tb[2] - TABLE.d / 2, z1: tb[2] + TABLE.d / 2, h: TABLE.h }));
}

function lifeOf(room, actors) {
  let L = LIFE.get(room);
  if (L) return L;
  const seats = room.seats || [], tables = room.tables || [], tops = topsOf(room);
  // Only occupied chairs exist (`chair: true`); older compositions put a chair at every seat.
  const chairs = seats.some(s => 'chair' in s) ? seats.filter(s => s.chair) : seats.filter(s => !s.stand);
  const person = (p, i, role) => ({ ...p, role, i, k: hash(p.ctrl.id, 'k') * 6.283 });
  const t = room.teacher, f = room.facilitator;
  L = {
    key: room.key, programId: room.programId, seed: seedOf(room.key), phase: hash(room.key, 'room') * 400,
    get bound() { return BOUND.get(actors)?.rooms.get(room) || null; }, seats, tables, tops, chairs,
    tableOf: s => (s && s.table) || tables[s?.set ?? 0] || null,
    topOf: s => s && (tops.find(top => top.index === s.tableIndex) || (s.table && tops.slice().sort((a, b) => Math.hypot(a.x - s.table[0], a.z - s.table[2]) - Math.hypot(b.x - s.table[0], b.z - s.table[2]))[0]) || null),
    students: room.students.map((p, i) => person(p, i, 'student')),
    second: room.second.map((p, i) => person(p, i, 'second')),
    waiting: room.waiting.map((p, i) => person(p, i, 'waiting')),
    around: (room.around || []).map((p, i) => ({ ...person(p, i, 'around'), seat: null })),
    teacher: t ? { ...t, home: at(t.home[0], t.home[1], t.ry), k: hash(t.ctrl.id, 'k') * 6.283 } : null,
    facilitator: f ? { ...f, home: at(f.home[0], f.home[1], f.ry), away: Array.isArray(f.away) ? at(f.away[0], f.away[1], f.away[2] ?? f.ry) : null, k: hash(f.ctrl.id, 'k') * 6.283 } : null,
    devices: room.devices || [],
    beats: schedule(room.kind === 'vr' ? VR_BEATS : CLASS_BEATS, room.key),
    relay: !!room.relay && room.waiting.length > 0 && (room.bench || []).length > 0,
    stations: !!room.stations && room.students.length + room.second.length > 1
  };
  /** True when a person of radius r at `c` would touch a table, furniture, a chair, the bench or a wall. */
  L.blocked = (c, r) => {
    if (Math.abs(c.x) > 1.25 - r || c.z < -1.13 + r || c.z > 1.12) return true;
    if (tops.some(top => c.x > top.x0 - r && c.x < top.x1 + r && c.z > top.z0 - r && c.z < top.z1 + r)) return true;
    if ((L.bound?.furniture || []).some(f => {
      const dx = c.x - f.x, dz = c.z - f.z, cos = Math.cos(f.ry), sin = Math.sin(f.ry);
      return Math.abs(dx * cos - dz * sin) < f.w / 2 + r && Math.abs(dx * sin + dz * cos) < f.d / 2 + r;
    })) return true;
    return chairs.some(s => dist(s, c) < .18 + r) || (room.bench || []).some(b => dist(b, c) < .2 + r);
  };
  const stands = new Map();
  /**
   * Standing spot next to a chair: beside it toward the room's centre line, else
   * beside it on the other side, else behind it; the first one that is free.
   */
  L.standOf = s => {
    if (stands.has(s)) return stands.get(s);
    const side = s.x < 0 ? 1 : -1, bx = -Math.sin(s.ry), bz = -Math.cos(s.ry);
    const cands = [at(s.x + side * .34, s.z, s.ry), at(s.x - side * .34, s.z, s.ry), at(s.x + bx * .32, s.z + bz * .32, s.ry)];
    const spot = cands.find(c => chairs.every(o => o === s || dist(o, c) > .3) && !L.blocked(c, .02) && Math.abs(c.x) < 1.15 && Math.abs(c.z) < 1.08) || cands[0];
    spot.back = [bx, bz]; // the way out behind the chair (route())
    stands.set(s, spot);
    return spot;
  };
  L.laptopFor = s => {
    let best = null, bestD = .75;
    for (const lap of L.bound?.laptops || []) { const d = Math.hypot(lap.x - s.x, lap.z - s.z); if (d < bestD) { best = lap; bestD = d; } }
    return best;
  };
  if (L.facilitator && room.kind === 'project') {
    // Out of the aisle while students change seats: the first free spot near home,
    // away from tables, furniture, chairs, stand-up spots and the centre aisle.
    const h = L.facilitator.home, standSpots = chairs.map(s => L.standOf(s));
    const free = c => Math.abs(c.x) > .24 && !L.blocked(c, .14) && standSpots.every(s => dist(s, c) > .34);
    const spot = [[.3, -.3], [.3, .3], [-.3, -.3], [0, -.4], [-.3, .3], [.45, 0], [.3, -.55], [-.3, 0]].map(([dx, dz]) => at(h.x + dx, h.z + dz)).find(free);
    if (spot) { spot.ry = heading(spot, { x: 0, z: spot.z }); L.facAside = spot; }
  }
  if (L.teacher) {
    // The screen hangs on the back wall behind the teacher's corner, on the room's centre line
    // (between the tables). A student at the board stands in front of it; the teacher steps
    // aside to a free spot, or stays home and turns.
    const h = L.teacher.home, centreX = tops.length ? tops.reduce((n, top) => n + top.x, 0) / tops.length : 0;
    L.screen = { x: centreX, z: h.z - .42 };
    const boardCands = [at(lerp(centreX, h.x, .4), h.z - .05, Math.PI), at(centreX + .1, h.z + .1, Math.PI), at(h.x - .45, h.z, Math.PI)];
    L.board = boardCands.find(c => !L.blocked(c, .12) && dist(c, h) > .36) || boardCands[0];
    const asideCands = [[.25, .25], [.3, -.15], [-.1, .35], [.15, -.3]].map(([dx, dz]) => at(clamp(h.x + dx, -1.08, 1.08), clamp(h.z + dz, -1, 1), h.ry));
    L.aside = asideCands.find(c => !L.blocked(c, .12) && dist(c, L.board) > .42) || at(h.x, h.z, h.ry);
  }
  if (room.kind === 'vr') {
    const holo = room.holoCentre ? { x: room.holoCentre[0], z: room.holoCentre[1] } : room.holo?.parent?.position;
    L.holo = holo ? { x: holo.x, z: holo.z } : { x: 0, z: -.2 };
    // The facilitator stays on its spot unless it would stand on the hologram (older compositions).
    if (L.facilitator && dist(L.facilitator.home, L.holo) < .45) {
      const used = new Set(L.students.map(p => p.seat)), free = seats.find((s, i) => !used.has(i));
      L.facilitator.home = free ? at(free.x, free.z, heading(free, L.holo)) : at(L.holo.x, L.holo.z + .8, Math.PI);
    }
  }
  LIFE.set(room, L);
  return L;
}

// ------------------------------------------------------------------ level classrooms
/** Seated work: typing with a varying rhythm, glances, small shifts of weight. */
function work(t, p, intensity = 1) {
  const typing = intensity * (.35 + .65 * clamp(.5 + wobble(t * .35, p.k)));
  const out = mixPose(REST_HANDS, POSES.type(t + p.k), typing);
  out.head[1] += wobble(t * .45, p.k * 3) * .28;
  out.head[0] += wobble(t * .38, p.k * 5) * .1;
  out.torso[0] += wobble(t * .3, p.k * 7) * .05;
  return out;
}

function classRoom(room, L, T) {
  const t = T + L.phase, b = beatAt(L.beats, t), k = b.k;
  const seats = L.seats, floor = room.floor, studs = L.students.filter(p => !p.vr && seats[p.seat]);
  const pick = (n, salt = 0) => Math.floor(chance(L.seed, b.n * 13 + salt) * n);
  const teacher = L.teacher;
  // Someone at the board needs a teacher to step aside and a clear aisle (no facilitator).
  const beat = b.id === 'board' && (!teacher || L.facilitator || !studs.length) ? 'pairs' : b.id;
  const A = studs.length ? studs[pick(studs.length)] : null;
  const B = studs.length > 1 ? studs.filter(p => p !== A)[pick(studs.length - 1, 1)] : null;
  const tPos = teacher ? (beat === 'rounds' && A ? visitSpot(seats[A.seat], L) : beat === 'board' ? L.aside : teacher.home) : null;
  for (const p of studs) {
    const s = seats[p.seat];
    if (beat === 'board' && p === A && boardTrip(p, s, L, k, floor)) continue;
    placePerson(p.ctrl, s.x, s.z, s.ry, floor);
    let up = work(t, p, beat === 'lecture' ? .25 : beat === 'question' ? .4 : 1);
    if (beat === 'lecture' && teacher) {
      lookToward(up, s.ry, heading(s, k < 5 ? L.screen : tPos), -.12, win(k, .4, 9.6, 1));
      nod(up, t + p.k, win(k, 6.5 + (p.i % 3) * .6, 8 + (p.i % 3) * .6, .3));
    } else if (beat === 'question') {
      if (p === A) {
        up = mixPose(up, POSES.raise(t), win(k, 1.2, 4.3, .4));
        up = mixPose(up, POSES.talk(t, p.k), win(k, 4.4, 7.4, .4));
        if (tPos) lookToward(up, s.ry, heading(s, tPos), -.1, win(k, 1, 7.6, .5));
      } else {
        if (p === B) up = mixPose(up, POSES.raise(t + 1), win(k, 1.9, 3.6, .4) * .85);
        if (A) lookToward(up, s.ry, heading(s, seats[A.seat]), .05, win(k, 4.2, 7.6, .5));
      }
    } else if (beat === 'rounds' && p === A && tPos) {
      lookToward(up, s.ry, heading(s, tPos), -.05, win(k, 3.2, 8.6, .5));
      up = mixPose(up, POSES.talk(t, p.k), win(k, 4.6, 6.1, .3) * .8);
      nod(up, t, win(k, 6.3, 7.6, .3));
    } else if (beat === 'pairs') {
      // Neighbours turn to each other and take turns talking; the listener nods.
      const mate = studs.filter(q => q !== p).sort((x, y) => dist(s, seats[x.seat]) - dist(s, seats[y.seat]))[0];
      if (mate) {
        const w = win(k, .5, 8.5, .6), speaking = Math.floor((k + (p.i % 2) * 1.6) / 1.6) % 2 === 0;
        up = mixPose(up, speaking ? POSES.talk(t, p.k) : REST_HANDS, w * (speaking ? .9 : .6));
        lookToward(up, s.ry, heading(s, seats[mate.seat]), -.05, w);
        if (!speaking) nod(up, t, w * .7);
      }
    } else if (beat === 'board' && A) {
      lookToward(up, s.ry, heading(s, k > 4 && k < 8 ? L.board : seats[A.seat]), -.1, win(k, 1.5, 10.5, .8));
    }
    seatAt(p.ctrl, up, s, L);
  }
  if (teacher) teacherAct(teacher, L, beat, k, t, floor, seats, A);
  serviceAct(room, L, t, floor);
}

/** Beside a seated student (its stand-up spot), facing the student's work. */
function visitSpot(s, L) {
  const spot = { ...L.standOf(s) };
  const lap = L.laptopFor(s), top = L.topOf(s);
  const target = lap ? { x: lap.x, z: lap.z } : top ? { x: top.x, z: top.z } : { x: s.x + Math.sin(s.ry) * .3, z: s.z + Math.cos(s.ry) * .3 };
  spot.ry = heading(spot, { x: (target.x + s.x) / 2, z: (target.z + s.z) / 2 });
  return spot;
}

function teacherAct(teacher, L, beat, k, t, floor, seats, A) {
  const c = teacher.ctrl, h = teacher.home;
  if (beat === 'rounds' && A) {
    // Walks to a student's laptop, checks it, points, nods and walks back.
    const spot = visitSpot(seats[A.seat], L), path = route(L, h, spot);
    if (k >= .4 && k < 3.6) return walkAlong(c, path, (k - .4) / 3.2, floor, h.ry, spot.ry);
    if (k >= 8.2 && k < 11.4) return walkAlong(c, path.slice().reverse(), (k - 8.2) / 3.2, floor, spot.ry, h.ry);
    if (k >= 3.6 && k < 8.2) {
      placePerson(c, spot.x, spot.z, spot.ry, floor);
      return applyPose(c, nod(mixPose(reach(.3, 'R'), POSES.pointDown(0), win(k, 6.1, 7.7, .4)), t, win(k, 4.8, 5.9, .3)));
    }
  }
  if (beat === 'board') {
    const aside = L.aside;
    if (k >= .6 && k < 2.2) return walkAlong(c, [[h.x, h.z], [aside.x, aside.z]], (k - .6) / 1.6, floor, h.ry, aside.ry);
    if (k >= 10 && k < 11.6) return walkAlong(c, [[aside.x, aside.z], [h.x, h.z]], (k - 10) / 1.6, floor, aside.ry, h.ry);
    if (k >= 2.2 && k < 10) {
      placePerson(c, aside.x, aside.z, turnTo(aside.ry, heading(aside, L.board), win(k, 3.8, 8.2, .6) * .7), floor);
      return applyPose(c, nod(mixPose(POSES.stand(), POSES.clap(t), win(k, 7.6, 8.8, .3)), t, win(k, 5.2, 6.4, .3)));
    }
  }
  if (beat === 'pairs') {
    // Paces along the front and watches the pairs.
    const front = at(h.x - .3, h.z + .12, h.ry);
    if (k >= .6 && k < 2.6) return walkAlong(c, [[h.x, h.z], [front.x, front.z]], (k - .6) / 2, floor, h.ry, h.ry);
    if (k >= 6 && k < 8) return walkAlong(c, [[front.x, front.z], [h.x, h.z]], (k - 6) / 2, floor, h.ry, h.ry);
    const here = k >= 2.6 && k < 6 ? front : h;
    placePerson(c, here.x, here.z, here.ry + wobble(t * .6, teacher.k) * .35, floor);
    return applyPose(c, look(POSES.stand(), wobble(t * .5, teacher.k) * .5, .05, 1));
  }
  placePerson(c, h.x, h.z, h.ry, floor);
  if (beat === 'lecture') {
    // Turns to the screen and points at it, then explains to the class.
    c.root.rotation.y = turnTo(h.ry, heading(h, L.screen), win(k, .3, 5, .8) * .8);
    return applyPose(c, mixPose(POSES.talk(t, teacher.k), POSES.point(.15), win(k, .8, 4.7, .4)));
  }
  if (beat === 'question' && A) {
    // Asks, picks the first raised hand, listens and nods.
    const target = heading(h, seats[A.seat]);
    c.root.rotation.y = turnTo(h.ry, target, win(k, 2.6, 8.6, .6) * .6);
    const dir = clamp(wrap(target - c.root.rotation.y), -.6, .6);
    let p = mixPose(POSES.talk(t, teacher.k), POSES.point(dir), win(k, 3, 4.6, .3));
    p = mixPose(p, POSES.stand(), win(k, 4.6, 7.2, .4) * .6);
    return applyPose(c, nod(p, t, win(k, 7.2, 8.4, .3)));
  }
  if (beat === 'quiet') {
    c.root.rotation.y = h.ry + wobble(t * .4, teacher.k) * .3;
    return applyPose(c, mixPose(look(POSES.stand(), wobble(t * .5, teacher.k) * .6, .1, 1), POSES.think(), win(k, 2, 5.5, .6)));
  }
  applyPose(c, POSES.talk(t, teacher.k));
}

/** A student stands up, goes to the board, points at the screen and comes back. False while seated. */
function boardTrip(p, s, L, k, floor) {
  const c = p.ctrl, stand = L.standOf(s), board = L.board;
  if (k < .4 || k >= 11.6) return false;
  if (k < 1.4) { rise(c, s, stand, k - .4, floor); return true; }
  if (k >= 10.6) { rise(c, s, stand, 1 - (k - 10.6), floor); return true; }
  const path = route(L, stand, board);
  if (k < 4.2) { walkAlong(c, path, (k - 1.4) / 2.8, floor, s.ry, board.ry); return true; }
  if (k >= 7.8) { walkAlong(c, path.slice().reverse(), (k - 7.8) / 2.8, floor, board.ry, s.ry); return true; }
  placePerson(c, board.x, board.z, board.ry, floor);
  applyPose(c, mixPose(POSES.stand(), POSES.point(-.2), win(k, 4.6, 7.4, .4)));
  return true;
}

/** Service teachers at the second table: trainers slide the kit box to each other; follow-up types. */
function serviceAct(room, L, t, floor) {
  const svc = room.service;
  if (!svc || !svc.teachers.length) return;
  const seats = L.seats;
  if (svc.kind === 'training' && svc.teachers.length > 1) {
    const [a, b] = svc.teachers, sa = seats[a.seat], sb = seats[b.seat];
    const D = 12, k = mod(t + hash(room.key, 'svc') * D, D);
    // a pushes the box to b [1.2, 3.2]; b inspects it; b pushes it back [7, 9].
    const toB = span(k, 1.2, 3.2) * (1 - span(k, 7, 9));
    const box = L.bound?.box;
    if (box && sa && sb) {
      // Slides along the line between the two, never past the edge of their table.
      const dz = sb.z - sa.z, dx = sb.x - sa.x, len = Math.hypot(dx, dz) || 1, off = (toB - .5) * .2;
      const top = L.topOf(sa), m = BOX.w * .6 + .02;
      const x = box.x + dx / len * off, z = box.z + dz / len * off;
      box.bone.position.set(top ? clamp(x, Math.min(box.x, top.x0 + m), Math.max(box.x, top.x1 - m)) : x, box.y, top ? clamp(z, Math.min(box.z, top.z0 + m), Math.max(box.z, top.z1 - m)) : z);
    }
    for (const [who, s, giving, nodAt] of [[a, sa, win(k, .8, 3.4, .4) + win(k, 7.6, 9.4, .4) * .6, 9.4], [b, sb, win(k, 6.6, 9.2, .4) + win(k, 2.6, 6.4, .4) * .7, 4.4]]) {
      if (!s) continue;
      placePerson(who.ctrl, s.x, s.z, s.ry, floor);
      seatAt(who.ctrl, nod(mixPose(POSES.talk(t, who.seat * 1.7), reach(.12, 'B'), clamp(giving)), t, win(k, nodAt, nodAt + 1.2, .3)), s, L);
    }
    return;
  }
  for (const who of svc.teachers) {
    const s = seats[who.seat];
    if (!s) continue;
    placePerson(who.ctrl, s.x, s.z, s.ry, floor);
    const k = mod(t + who.seat * 2.3, 11);
    seatAt(who.ctrl, nod(mixPose(work(t, { k: who.seat * 1.3 }), POSES.think(), win(k, 6, 8.6, .5)), t, win(k, 8.6, 9.6, .3)), s, L);
  }
}

// ------------------------------------------------------------------ project rooms
/** Sets (tables) of a project room with their device and the people working there now. */
function setsOf(L, people) {
  const sets = new Map();
  const add = s => {
    if (!sets.has(s)) sets.set(s, { set: s, table: L.tables[s] || null, device: null, bones: null, people: [] });
    return sets.get(s);
  };
  L.devices.forEach((d, i) => { const entry = add(d.set); entry.device = d; entry.bones = L.bound?.devices?.[i] || null; });
  for (const p of people) { const s = L.seats[p.seatNow]; if (s) add(s.set ?? 0).people.push(p); }
  return [...sets.values()].sort((a, b) => a.set - b.set);
}
/** Round time of a set: the two tables run half a round apart. */
const roundOf = (workT, set, R) => { const tr = workT + set * R / 2, round = Math.floor(tr / R); return { round, k: tr - round * R }; };

function projectRoom(room, L, T, events, since) {
  const floor = room.floor, t = T + L.phase, elec = room.programId === 'electronics', R = elec ? ELEC_ROUND : ROUND;
  // Who is seated now: stations rotate seats, separate schedules swap groups.
  const seated = seatedGroup(room, L, t, floor, R);
  const workT = seated.workT, dt = since == null ? null : T - since;
  const sets = setsOf(L, seated.people);
  if (L.facilitator) planVisits(L, workT, sets, R);
  for (const entry of sets) {
    const { round, k } = roundOf(workT, entry.set, R);
    const success = chance(L.seed, round * 7 + entry.set) > (elec ? .25 : .3);
    if (entry.device && entry.people.length) {
      if (!elec) driveDevice(entry.device, entry.bones, k, success, round, L, entry.table);
      const goalAt = elec ? 10 : 13;
      if (success && dt != null && dt < 4 && k >= goalAt && k - dt < goalAt) events.push({ kind: elec ? 'works' : 'goal', room: room.key, set: entry.set });
    } else if (entry.device && !elec) {
      // An unattended kit runs only while the facilitator demonstrates it.
      const demo = L.visits?.find(v => v.set === entry.set && v.demo && v.from <= workT && workT < v.to);
      driveDevice(entry.device, entry.bones, demo ? workT - demo.runStart : 0, true, round, L, entry.table);
    }
    entry.people.forEach((p, i) => workAtSet(p, i, entry, k, round, success, elec, t, floor, L, seated.moving, workT));
  }
  if (L.facilitator) facilitatorAct(L, workT, floor, seated, t);
  serviceAct(room, L, t, floor);
}

/**
 * Robot motion at round time k: rests, turns, runs to its goal (or spins out), is
 * carried back. The composition says how it moves (`motion`: drive, walk, build,
 * still) and how far (`range` around `home`, on `surface`); older compositions
 * fall back on the bones the device has (wheels roll, head and tail walk, a hub builds).
 */
function driveDevice(d, bones, k, success, round, L, table) {
  const [hx, hy, hz, hry] = d.home;
  const motion = d.motion || (bones?.wheels?.length ? 'drive' : bones?.head || bones?.tail ? 'walk' : d.hub ? 'build' : 'still');
  const size = DEVICE_SIZE[L.programId] || { w: .2, d: .2 }, scale = d.scale || 1;
  const range = d.range || [clamp(MAT_HALF - Math.max(size.w, size.d) / 2, .05, .2), .05];
  let u = 0, lift = 0;
  if (k >= 6.4 && k < 16) u = success ? span(k, 6.6, 12.8) : span(k, 6.6, 11) * .55;
  else if (k >= 16) { const back = span(k, 16.6, 18.6); u = (success ? 1 : .55) * (1 - back); lift = Math.sin(back * Math.PI) * .03; }
  // Offsets in the room frame, inside the range: the rover drives out toward the room's centre line with
  // a lateral S, the walker steps along its own facing, the builder barely shifts.
  const fx = Math.sin(hry), fz = Math.cos(hry), toward = hx > 0 ? -1 : 1;
  const pathAt = v => motion === 'drive' ? { x: toward * range[0] * v, z: range[1] * Math.sin(v * TAU) * .8 }
    : motion === 'walk' ? { x: fx * v * Math.min(range[0], range[1] + Math.abs(fx) * range[0]), z: fz * v * range[1] }
    : motion === 'build' ? { x: range[0] * v * .6, z: -range[1] * v * .4 } : { x: 0, z: 0 };
  const p = pathAt(u), q = pathAt(Math.min(1, u + .02));
  let x = hx + p.x, z = hz + p.z;
  // Never off its surface: the footprint stays inside the mat, table or track.
  const surf = d.surface || (table && { x0: table[0] - TABLE.w / 2, x1: table[0] + TABLE.w / 2, z0: table[2] - TABLE.d / 2, z1: table[2] + TABLE.d / 2 });
  if (surf) {
    const half = Math.max(size.w, size.d) * scale / 2 * .8;
    x = clamp(x, Math.min(hx, surf.x0 + half), Math.max(hx, surf.x1 - half));
    z = clamp(z, Math.min(hz, surf.z0 + half), Math.max(hz, surf.z1 - half));
  }
  d.bone.position.set(x, hy + lift, z);
  let ry = hry;
  if (motion === 'drive') {
    const dx = q.x - p.x, dz = q.z - p.z;
    ry = turnTo(hry, Math.hypot(dx, dz) > 1e-6 ? Math.atan2(dx, dz) : hry, span(k, 6, 6.8) * (1 - span(k, 15.4, 16.4)));
    if (!success && k > 11 && k < 13.5) ry += Math.sin((k - 11) * 9) * .3 * (1 - span(k, 11, 13.5)); // spins out
    if (success && k > 12.8 && k < 15) ry += Math.sin((k - 12.8) / 2.2 * TAU) * .35; // a happy wiggle at the goal
    for (const wheel of bones?.wheels || []) wheel.rotation.x = u * range[0] / (.033 * scale);
  } else if (motion === 'walk') {
    ry = hry + Math.sin(k * 3.2) * .08 * win(k, 6.4, 13, .5);
    if (bones?.head) bones.head.rotation.x = Math.sin(k * 6) * .18 * win(k, 6.4, 13, .4) - win(k, 13, 15, .3) * .3 * Math.abs(Math.sin(k * 8));
    if (bones?.tail) bones.tail.rotation.y = Math.sin(k * 9) * .45 * (win(k, 6.4, 13, .4) + win(k, 13, 15.4, .3) * (success ? 1 : .2));
  } else if (motion === 'build') ry = hry + Math.sin(u * Math.PI) * .06;
  d.bone.rotation.y = ry;
  const running = k >= 6.4 && k < 13;
  if (d.hub) d.hub.rotation.y = (running ? (k - 6.4) * 9 : k >= 13 ? 6.6 * 9 : 0) + round * 1.3;
  if (d.body && motion === 'drive') d.body.position.y = running ? Math.abs(Math.sin(k * 14)) * .004 : 0;
}

/** One student at a project table during a robot (or electronics) round. */
function workAtSet(p, i, entry, k, round, success, elec, t, floor, L, moving, workT) {
  if (moving.has(p)) return; // walking between seats or groups
  const s = L.seats[p.seatNow];
  placePerson(p.ctrl, s.x, s.z, s.ry, floor);
  const programmer = entry.people[round % entry.people.length] === p;
  const devPos = entry.device ? { x: entry.device.bone.position.x, z: entry.device.bone.position.z } : entry.table ? { x: entry.table[0], z: entry.table[2] } : null;
  const lap = L.laptopFor(s);
  let up = work(t, p, .6);
  if (elec) {
    up = mixPose(up, POSES.press(t + p.k), win(k, .3, 6.2, .5));
    up = mixPose(up, programmer ? POSES.lean(1) : POSES.pointDown(0), win(k, 6, 10, .5));
    if (success) up = nod(mixPose(up, POSES.clap(t), win(k, 10.1, 11.5, .3) * .8), t, win(k, 11.4, 12.4, .3));
    else up = mixPose(up, POSES.think(), win(k, 10.2, 12.6, .5));
    up = mixPose(up, POSES.talk(t, p.k), win(k, 12.6, 15.8, .5) * ((i + round) % 2 ? .9 : .4));
    if (devPos) lookToward(up, s.ry, heading(s, devPos), .45, win(k, 0, 12.4, .5));
  } else {
    // Program: on the laptop, or with the robot's own buttons; the partner watches and suggests.
    if (programmer) {
      if (lap) { up = mixPose(up, POSES.type(t + p.k), win(k, .3, 6, .4)); lookToward(up, s.ry, heading(s, lap), .4, win(k, .3, 6, .4)); }
      else up = mixPose(up, POSES.press(t), win(k, .6, 5.6, .5) * .9);
    } else up = mixPose(mixPose(up, POSES.lean(.7), win(k, .5, 6, .5)), POSES.talk(t, p.k), win(k, 2.4, 4.4, .3) * .8);
    // Run: both lean in and follow the robot; the partner points.
    up = mixPose(up, POSES.lean(1), win(k, 6.2, 13, .5));
    if (!programmer) up = mixPose(up, POSES.pointDown(0), win(k, 8, 10, .3) * .9);
    // React: cheer and a high five with the facilitator, or hands on the head.
    if (success) {
      up = mixPose(up, POSES.cheer(t), win(k, 12.9, 14.4, .25));
      const visit = programmer && L.visits?.find(v => v.set === entry.set && v.from <= workT && workT < v.to && v.spot);
      up = visit ? mixPose(up, POSES.highFive(facSide(s, visit.spot)), win(k, 14.3, 15.4, .25)) : mixPose(up, POSES.clap(t), win(k, 14.3, 15.6, .25) * .8);
    } else up = mixPose(mixPose(up, POSES.oops(), win(k, 11.6, 13.6, .3)), POSES.think(), win(k, 13.6, 16, .4) * .8);
    // Reset: the programmer carries the robot back.
    if (programmer) up = mixPose(up, reach(.15, 'R', .1), win(k, 16.2, 18.8, .3));
    if (devPos) lookToward(up, s.ry, heading(s, devPos), .42, win(k, 6, 19, .5));
  }
  seatAt(p.ctrl, up, s, L);
}
/** 'L' or 'R': the hand on the side where `spot` stands. */
function facSide(s, spot) {
  const left = { x: Math.cos(s.ry), z: -Math.sin(s.ry) };
  return left.x * (spot.x - s.x) + left.z * (spot.z - s.z) > 0 ? 'L' : 'R';
}

/**
 * The facilitator's loop (two rounds): beside the first table's programmer for
 * its run, then at the second table (beside its programmer, or demonstrating an
 * unattended kit), then back home to talk. Stored in L.visits for the students.
 */
function planVisits(L, t, sets, R) {
  const cycle = 2 * R, t0 = Math.floor(t / cycle) * cycle;
  const visits = [];
  let prevEnd = -Infinity;
  for (const entry of sets.slice(0, 2)) {
    const rs = t0 + mod(-entry.set * R / 2, R), round = Math.round((rs + entry.set * R / 2) / R);
    const from = Math.max(rs + .28 * R, prevEnd + 2.4), to = rs + .8 * R;
    if (to - from < 3) continue;
    let spot;
    if (entry.people.length) spot = visitSpot(L.seats[entry.people[mod(round, entry.people.length)].seatNow], L);
    else if (L.facilitator.away) spot = { ...L.facilitator.away };
    else {
      // A free table: at its end on the aisle side, facing the kit.
      const top = L.tops.find(tt => tt.index === entry.set) || L.tops[0];
      const tb = top ? [top.x, 0, top.z] : entry.table || [0, 0, 0], half = top ? (top.x1 - top.x0) / 2 : TABLE.w / 2;
      spot = at(tb[0] + (tb[0] < 0 ? 1 : -1) * (half + .17), tb[2]);
      spot.ry = heading(spot, { x: tb[0], z: tb[2] });
    }
    visits.push({ set: entry.set, spot, from, to, runStart: rs, demo: !entry.people.length });
    prevEnd = to;
  }
  // Then it helps from its `away` spot (the composition keeps it free) before going home.
  const away = L.facilitator.away;
  if (away && visits.length && !visits.some(v => v.spot.x === away.x && v.spot.z === away.z)) {
    const from = prevEnd + 2.4, to = Math.min(from + 7, t0 + cycle - 3.4);
    if (to - from > 3) visits.push({ set: null, spot: { ...away }, from, to, runStart: from - 6, demo: false });
  }
  L.visits = visits;
  L.visitT0 = t0;
}
function facilitatorAct(L, t, floor, seated, roomT) {
  const f = L.facilitator, c = f.ctrl, h = f.home;
  if (seated.swap != null) {
    // Students change seats through the aisle: step aside and watch them (the rounds wait, so it starts at home).
    const a = L.facAside || h, k = seated.swap, len = seated.swapLen;
    if (k < 1.2) return walkAlong(c, [[h.x, h.z], [a.x, a.z]], k / 1.2, floor, h.ry, a.ry);
    if (k > len - 1.2) return walkAlong(c, [[a.x, a.z], [h.x, h.z]], (k - len + 1.2) / 1.2, floor, a.ry, h.ry);
    placePerson(c, a.x, a.z, a.ry + wobble(roomT * .5, f.k) * .4, floor);
    return applyPose(c, nod(mixPose(POSES.stand(), POSES.clap(roomT), win(k, len - 3, len - 1.6, .3)), roomT, win(k, 3, 4, .3)));
  }
  let here = h, ready = L.visitT0;
  for (const v of L.visits) {
    if (t >= v.from - 2.4 && t < v.from) return walkAlong(c, route(L, here, v.spot), (t - Math.max(ready, v.from - 2.4)) / (v.from - Math.max(ready, v.from - 2.4)), floor, here.ry, v.spot.ry);
    if (t >= v.from && t < v.to) {
      const kk = t - v.runStart;
      placePerson(c, v.spot.x, v.spot.z, v.spot.ry, floor);
      let p = mixPose(reach(.25, 'R'), POSES.pointDown(0), win(kk, 7.5, 9.5, .3));
      if (v.demo) p = mixPose(p, reach(.2, 'B'), win(kk, 4.6, 6.6, .3));
      p = mixPose(p, POSES.clap(t), win(kk, 12.9, 14.3, .25));
      return applyPose(c, v.demo ? p : mixPose(p, POSES.highFive('R'), win(kk, 14.3, 15.4, .25)));
    }
    here = v.spot; ready = v.to;
  }
  if (L.visits.length && t >= ready && t < ready + 2.4) return walkAlong(c, route(L, here, h), (t - ready) / 2.4, floor, here.ry, h.ry);
  const k = t - L.visitT0;
  placePerson(c, h.x, h.z, h.ry + wobble(t * .4, f.k) * .3, floor);
  applyPose(c, mixPose(mixPose(reach(.25, 'R'), POSES.talk(t, f.k), win(k, 1, 3, .5) + win(k, 30, 35, .6)), POSES.think(), win(k, 35.5, 38.5, .6) * .8));
}

// ------------------------------------------------------------------ Tale-Bot track
const AROUND_BASE = new WeakMap();
/**
 * Tale-Bot on its floor track: the kneeling group programs it with its buttons,
 * follows its run, cheers or groans, and one of them sends it back; the next group
 * stands behind, chatting and watching. The facilitator steps to its `away` spot
 * by the track for the run of every other round.
 */
function trackRoom(room, L, T, events, since) {
  const floor = room.floor, t = T + L.phase, { round, k } = roundOf(t, 0, ROUND);
  const success = chance(L.seed, round * 7) > .3, dev = L.devices[0];
  if (dev) driveDevice(dev, L.bound?.devices?.[0], k, success, round, L, null);
  if (dev && success && since != null && T - since < 4 && k >= 13 && k - (T - since) < 13) events.push({ kind: 'goal', room: room.key, set: 0 });
  const robot = dev ? { x: dev.bone.position.x, z: dev.bone.position.z } : room.track ? { x: (room.track.x0 + room.track.x1) / 2, z: (room.track.z0 + room.track.z1) / 2 } : { x: 0, z: 0 };
  const kids = L.around.filter(a => !a.waiting && a.pose === 'kneel'), programmer = kids.length ? kids[round % kids.length] : null;
  L.around.forEach((a, i) => {
    const kneel = a.pose === 'kneel', spot = a.spot, c = a.ctrl;
    if (!AROUND_BASE.has(c)) AROUND_BASE.set(c, c.root.position.y);
    placePerson(c, spot.x, spot.z, spot.ry + (kneel ? 0 : wobble(t * .4, a.k) * .25), AROUND_BASE.get(c));
    let up = kneel ? mixPose(POSES.stand(), POSES.lean(.5), .6) : POSES.stand();
    if (kneel) {
      if (a === programmer) up = mixPose(up, reach(.55, 'R'), win(k, .6, 5.6, .5));
      else up = mixPose(up, POSES.talk(t, a.k), win(k, 2.4, 4.4, .3) * .8);
      up = mixPose(up, POSES.lean(1), win(k, 6.2, 13, .5));
      if (a !== programmer) up = mixPose(up, POSES.pointDown(0), win(k, 8, 10, .3) * .9);
      if (a === programmer) up = mixPose(up, reach(.55, 'B'), win(k, 16.2, 18.8, .3));
    } else up = mixPose(up, POSES.talk(t, a.k), Math.floor((t + i * 2.3) / 2.3) % 2 ? .7 : 0);
    up = success ? mixPose(mixPose(up, POSES.cheer(t), win(k, 12.9, 14.4, .25)), POSES.clap(t), win(k, 14.3, 15.6, .25) * .8)
      : mixPose(mixPose(up, POSES.oops(), win(k, 11.6, 13.6, .3)), POSES.think(), win(k, 13.6, 16, .4) * .8);
    lookToward(up, c.root.rotation.y, heading(spot, robot), kneel ? .35 : .25, win(k, .3, 19.5, .5) * (kneel ? 1 : .8));
    applyPose(c, kneel ? blendBody(POSES.kneel(), up) : up, kneel ? 'kneel' : 'stand');
  });
  if (L.facilitator) {
    const cycle = 2 * ROUND, t0 = Math.floor(t / cycle) * cycle, away = L.facilitator.away;
    L.visits = away ? [{ set: 0, spot: { ...away, ry: heading(away, robot) }, from: t0 + 5.6, to: t0 + 16, runStart: t0, demo: true }] : [];
    L.visitT0 = t0;
    facilitatorAct(L, t, floor, { swap: null }, t);
  }
}

// ------------------------------------------------------------------ stations and separate schedules
/**
 * Seats occupied at room time t, and the clock of the rounds (`workT`). Stations:
 * after two rounds the students rotate one station; the rounds wait for them.
 * Separate schedules: after a work period the seated group goes to the front of
 * the room, the waiting group takes the seats and the first group sits on the bench.
 */
function seatedGroup(room, L, t, floor, R) {
  const moving = new Set(), all = [...L.students, ...L.second];
  if (L.relay) {
    const W = 4 * R, period = 2 * (W + RELAY_SWAP), c = Math.floor(t / period), k = t - c * period, A = L.students, B = L.waiting;
    const seatOf = (group, i) => group === A ? A[i].seat : A[i % A.length].seat;
    const swapK = k >= W && k < W + RELAY_SWAP ? k - W : k >= 2 * W + RELAY_SWAP ? k - 2 * W - RELAY_SWAP : null;
    const seatedGroup_ = swapK != null ? (k < 2 * W ? A : B) : k < W ? A : B;
    seatedGroup_.forEach((p, i) => { p.seatNow = seatOf(seatedGroup_, i); });
    const other = seatedGroup_ === A ? B : A;
    other.forEach(p => { p.seatNow = null; });
    L.second.forEach(p => { p.seatNow = p.seat; });
    if (swapK != null) relaySwap(room, L, seatedGroup_, other, i => L.seats[seatOf(seatedGroup_, i)], swapK, floor, t, moving);
    else benchGroup(room, other, t, floor);
    // The rounds (and the facilitator) wait while the groups trade places.
    const workT = c * 2 * W + (k < W ? k : k < W + RELAY_SWAP ? W : k < 2 * W + RELAY_SWAP ? k - RELAY_SWAP : 2 * W);
    return { people: [...seatedGroup_, ...L.second], moving, workT, swap: swapK, swapLen: RELAY_SWAP };
  }
  if (L.stations) {
    const swapLen = swapLength(all.length), cycle = 2 * R + swapLen, c = Math.floor(t / cycle), k = t - c * cycle, n = all.length;
    const seatOf = (i, step) => all[mod(i + step, n)].seat;
    all.forEach((p, i) => { p.seatNow = seatOf(i, c); });
    if (k >= 2 * R) stationSwap(L, all, i => seatOf(i, c), i => seatOf(i, c + 1), k - 2 * R, floor, t, moving);
    return { people: all, moving, workT: c * 2 * R + Math.min(k, 2 * R), swap: k >= 2 * R ? k - 2 * R : null, swapLen };
  }
  all.forEach(p => { p.seatNow = p.seat; });
  return { people: all, moving, workT: t };
}

/**
 * Where the first one to leave waits during a rotation: the free floor spot
 * farthest from every chair, stand-up spot, the ways from them to the aisle, the
 * stretch of aisle the others use and the facilitator's spots.
 */
function holdSpot(L, movers) {
  const stands = L.chairs.map(o => L.standOf(o)), zs = stands.map(S => S.z);
  const segs = stands.flatMap(S => [[S, at(0, S.z)], [S, at(S.x + S.back[0] * .32, S.z + S.back[1] * .32)]]);
  segs.push([at(0, Math.min(...zs) - .32), at(0, Math.max(...zs) + .32)]);
  const points = [...stands, ...L.chairs, L.facAside, L.facilitator?.home, L.facilitator?.away, L.teacher?.home].filter(Boolean);
  const toSeg = (c, [a, b]) => {
    const vx = b.x - a.x, vz = b.z - a.z, len = vx * vx + vz * vz, u = len ? clamp(((c.x - a.x) * vx + (c.z - a.z) * vz) / len) : 0;
    return Math.hypot(a.x + vx * u - c.x, a.z + vz * u - c.z);
  };
  let best = null, bestScore = -1;
  for (let z = -1; z <= 1.06; z += .065) for (let x = -1.1; x <= 1.1; x += .065) {
    const c = at(x, z);
    if (L.blocked(c, .14) || Math.abs(x) < .2) continue;
    // Reachable straight from the aisle (route()).
    let reachable = true;
    for (let d = .08; d < Math.abs(x); d += .06) if (L.blocked(at(Math.sign(x) * d, z), .1)) { reachable = false; break; }
    if (!reachable) continue;
    const score = Math.min(...points.map(o => dist(o, c)), ...segs.map(sg => toSeg(c, sg)));
    if (score > bestScore) { best = c; bestScore = score; }
  }
  best = best || at(.3, 1);
  best.ry = heading(best, { x: 0, z: best.z });
  return best;
}
/** Length of a station rotation for n people moving one at a time (see stationSwap). */
const swapLength = n => 3.2 + Math.max(1, n - 1) * 3.6 + 3;
/**
 * Rotation to the next station, one person at a time so nobody crosses: the first
 * leaves its seat for a free waiting spot, each next one moves into the seat just
 * vacated, and the first takes the last free seat. Walks go through the aisle.
 */
function stationSwap(L, all, fromOf, toOf, k, floor, t, moving) {
  const seats = L.seats;
  const movers = all.map((p, i) => ({ p, from: seats[fromOf(i)], to: seats[toOf(i)] })).filter(m => m.from && m.to && m.from !== m.to);
  if (!movers.length) return;
  const order = [movers[0]];
  for (let vacated = movers[0].from; order.length < movers.length;) {
    const next = movers.find(m => m.to === vacated && !order.includes(m));
    if (!next) break;
    order.push(next); vacated = next.from;
  }
  movers.forEach(m => { if (!order.includes(m)) order.push(m); });
  const hold = L.holdSpot ||= holdSpot(L, movers);
  order.forEach((m, j) => {
    const c = m.p.ctrl, S0 = L.standOf(m.from), S1 = L.standOf(m.to);
    moving.add(m.p);
    const seated = () => { placePerson(c, m.from.x, m.from.z, m.from.ry, floor); seatAt(c, work(t, m.p, .5), m.from, L); };
    if (j === 0) {
      const back = 3.2 + (order.length - 1) * 3.6;
      if (k < .8) return rise(c, m.from, S0, k / .8, floor);
      if (k < 3) return walkAlong(c, route(L, S0, hold), (k - .8) / 2.2, floor, m.from.ry, hold.ry);
      if (k < back) { placePerson(c, hold.x, hold.z, hold.ry + wobble(t * .5, m.p.k) * .4, floor); return applyPose(c, look(POSES.stand(), .25, .1, 1)); }
      if (k < back + 2.2) return walkAlong(c, route(L, hold, S1), (k - back) / 2.2, floor, hold.ry, m.to.ry);
      if (k < back + 3) return rise(c, m.to, S1, 1 - (k - back - 2.2) / .8, floor);
    } else {
      const a = 3.2 + (j - 1) * 3.6;
      if (k < a) return seated();
      if (k < a + .8) return rise(c, m.from, S0, (k - a) / .8, floor);
      if (k < a + 2.8) return walkAlong(c, route(L, S0, S1), (k - a - .8) / 2, floor, m.from.ry, m.to.ry);
      if (k < a + 3.6) return rise(c, m.to, S1, 1 - (k - a - 2.8) / .8, floor);
    }
    // Arrived: works at the new seat like everybody else.
    moving.delete(m.p);
    m.p.seatNow = seats.indexOf(m.to);
  });
}

/** The group on the bench chats, watches the table and sometimes waves. */
function benchGroup(room, group, t, floor) {
  group.forEach((p, i) => {
    const spot = room.bench[i % room.bench.length];
    if (!spot) return;
    placePerson(p.ctrl, spot.x, spot.z, spot.ry, floor);
    const ms = group.length > 1 ? room.bench[(i + 1) % room.bench.length] : null;
    let up = POSES.stand();
    if (ms && ms !== spot) {
      const speaking = Math.floor((t + i * 2.1) / 2.1) % 2 === 0;
      up = lookToward(mixPose(up, POSES.talk(t, p.k), speaking ? .8 : 0), spot.ry, heading(spot, ms), .05, .8);
    }
    seatPose(p.ctrl, mixPose(up, POSES.wave(t), win(mod(t + p.k * 3, 23), 18, 20, .3)));
  });
}

/**
 * Where the leaving group waits while the other group sits: free spots on the side
 * of the room opposite the bench, reachable straight from the aisle, front first.
 */
function waitSpots(L, room, n, avoid = []) {
  // On the side opposite the bench when there is one; otherwise either side.
  const benchX = room?.bench?.[0]?.x, sides = benchX != null ? [Math.sign(-benchX) || 1] : [1, -1];
  // Clear of stand-up spots and of the way from each of them to the aisle (route()).
  const legs = L.chairs.map(o => L.standOf(o)).map(S => [S, at(0, S.z)]);
  const toSegment = (c, [a, b]) => { const lx = b.x - a.x, u = lx ? clamp((c.x - a.x) / lx) : 0; return Math.hypot(a.x + lx * u - c.x, a.z - c.z); };
  const near = (c, r) => avoid.some(o => dist(o, c) < r) || (L.facAside && dist(L.facAside, c) < r)
    || (L.facilitator && dist(L.facilitator.home, c) < r) || legs.some(leg => toSegment(c, leg) < r);
  const cands = [];
  for (const side of sides) for (let z = 1.05; z >= -.95; z -= .13) for (let x = .26; x <= 1.05; x += .13) {
    const c = at(side * x, z);
    if (L.blocked(c, .16) || near(c, .36)) continue;
    let reachable = true;
    for (let d = .1; d < x; d += .08) {
      const q = at(side * d, z);
      if (L.blocked(q, .11) || near(q, .3)) { reachable = false; break; }
    }
    if (reachable) cands.push(c);
  }
  // Farthest from the aisle first, so the first to arrive never blocks the next one.
  const out = [];
  for (const c of cands) if (out.length < n && out.every(o => dist(o, c) > .3) && (!out.length || Math.abs(c.z - out[0].z) < .14)) out.push(c);
  out.sort((a, b) => Math.abs(b.x) - Math.abs(a.x));
  out.forEach(c => { c.ry = heading(c, { x: 0, z: c.z }); });
  while (out.length < n) out.push(out[out.length - 1] ? at(out[out.length - 1].x, out[out.length - 1].z - .3) : at(.3, 1));
  return out;
}
/** Separate schedules: the seated group leaves to free spots, the waiting group sits, the first takes the bench. */
function relaySwap(room, L, leaving, coming, seatFor, k, floor, t, moving) {
  const bench = room.bench, n = leaving.length;
  const spots = L.waitSpots ||= waitSpots(L, room, n);
  // One at a time: the seat nearest to the waiting spots leaves first and goes to the farthest one.
  const order = leaving.map((p, i) => i).sort((a, b) => Math.abs(seatFor(a).z - spots[0].z) - Math.abs(seatFor(b).z - spots[0].z));
  const front = j => spots[Math.min(j, spots.length - 1)];
  const before = i => at(bench[i % bench.length].x, bench[i % bench.length].z - .28, Math.PI);
  leaving.forEach((p, i) => {
    moving.add(p);
    // Each one sits back on its own bench seat (the one benchGroup uses).
    // Out first [1.2, ~7] (the facilitator has left the aisle), back to the bench last [12, 16.4].
    const j = order.indexOf(i), c = p.ctrl, s = seatFor(i), S = L.standOf(s), F = front(j), a = 1.2 + j * 1.4, B = before(i), spot = bench[i % bench.length], b0 = 12 + (n - 1 - j) * 1.2;
    if (k < a + .8) return rise(c, s, S, (k - a) / .8, floor);
    if (k < a + 4) return walkAlong(c, route(L, S, F), (k - a - .8) / 3.2, floor, s.ry, Math.PI);
    if (k < b0) { placePerson(c, F.x, F.z, heading(F, s) + wobble(t, p.k) * .3, floor); return applyPose(c, POSES.talk(t, p.k)); }
    if (k < b0 + 2.6) return walkAlong(c, route(L, F, B), (k - b0) / 2.6, floor, Math.PI, spot.ry);
    rise(c, spot, B, 1 - (k - b0 - 2.6) / .8, floor);
  });
  coming.forEach((p, i) => {
    moving.add(p);
    const c = p.ctrl, spot = bench[i % bench.length], B = before(i), s = seatFor(i), S = L.standOf(s), a = 5.4 + i * 1.8;
    if (k < a) { placePerson(c, spot.x, spot.z, spot.ry, floor); return seatPose(c, look(POSES.stand(), 0, .2, 1)); }
    if (k < a + .8) return rise(c, spot, B, (k - a) / .8, floor);
    if (k < a + 4) return walkAlong(c, route(L, B, S), (k - a - .8) / 3.2, floor, spot.ry, s.ry);
    if (k < a + 4.8) return rise(c, s, S, 1 - (k - a - 4) / .8, floor);
    placePerson(c, s.x, s.z, s.ry, floor);
    seatAt(c, work(t, p, .8), s, L);
  });
}

// ------------------------------------------------------------------ immersive
function vrRoom(room, L, T) {
  const t = T + L.phase, b = beatAt(L.beats, t), k = b.k, floor = room.floor;
  const holo = L.holo, seats = L.seats, studs = L.students.filter(p => p.vr && seats[p.seat]);
  const V = studs.length ? studs[Math.floor(chance(L.seed, b.n * 5) * studs.length)] : null;
  for (const p of studs) {
    const s = seats[p.seat];
    placePerson(p.ctrl, s.x, s.z, s.ry + wobble(t * .4, p.k) * .35 * (b.id.startsWith('explore') ? 1 : .3), floor);
    let pz = POSES.vr(t, p.k);
    if (b.id === 'grab') pz = mixPose(pz, POSES.grab(t, p.k), win(k, .4, 7.6, .6));
    if (b.id === 'point') pz = look(mixPose(pz, POSES.point(clamp(wrap(heading(s, holo) - s.ry), -.5, .5)), win(k, .5, 5.5, .5)), 0, -.15, win(k, .5, 5.5, .5));
    const other = studs.find(q => q !== p);
    if (b.id === 'talk' && V && other) {
      // One lifts the visor and turns to talk; the other turns toward the voice.
      if (p === V) {
        const turn = clamp(wrap(heading(s, seats[other.seat]) - s.ry), -.9, .9);
        pz = mixPose(mixPose(pz, POSES.visor(turn), win(k, .4, 3.4, .4)), look(POSES.talk(t, p.k), turn, -.05, 1), win(k, 3.2, 7.4, .5));
      } else pz = mixPose(pz, lookToward(POSES.talk(t + 1.3, p.k), s.ry, heading(s, seats[V.seat]), 0, 1), win(k, 3.6, 7.4, .5) * .8);
    }
    applyPose(p.ctrl, pz);
  }
  if (room.holo) {
    // The hologram turns and bobs; a grab spins it faster and lifts it.
    const grab = b.id === 'grab' ? win(k, .6, 7.4, 1) : 0, rest = room.holo.userData?.rest?.position?.y ?? 0;
    room.holo.rotation.y = HOLO_TURN + t * .5 + grab * Math.sin(k * .6) * 2.2;
    room.holo.position.y = rest + Math.sin(t * 1.4) * HOLO_BOB + grab * HOLO_BOB;
  }
  const f = L.facilitator;
  if (!f) return;
  // Guides one student during the exploration: walks around the outside of the circle (never
  // through it, never across the open front) to stand just behind that student, then comes back.
  const c = f.ctrl, h = f.home;
  const guide = V && b.id.startsWith('explore') && k > 1 && k < b.dur - .5 ? vrGuide(L, h, seats[V.seat]) : null;
  if (guide) {
    const d = b.dur, out = guide.path, back = out.slice().reverse();
    if (k < 3.4) return walkAlong(c, out, (k - 1) / 2.4, floor, h.ry, guide.spot.ry);
    if (k > d - 2.9) return walkAlong(c, back, (k - d + 2.9) / 2.4, floor, guide.spot.ry, h.ry);
    placePerson(c, guide.spot.x, guide.spot.z, guide.spot.ry, floor);
    return applyPose(c, mixPose(POSES.talk(t, f.k), POSES.point(.2), win(k, 3.8, 5.2, .3)));
  }
  placePerson(c, h.x, h.z, h.ry + wobble(t * .5, f.k) * .3, floor);
  applyPose(c, mixPose(POSES.stand(), POSES.talk(t, f.k), b.id === 'talk' ? 0 : .7));
}
/** Arc around the hologram from the facilitator's spot to just behind a student (cached per student). */
function vrGuide(L, h, s) {
  const cache = L.guides ||= new Map();
  if (cache.has(s)) return cache.get(s);
  const c = L.holo, angle = p => Math.atan2(p.x - c.x, p.z - c.z);
  const r = Math.max(dist(h, c), dist(s, c)) + .2, a0 = angle(h), aS = angle(s);
  // Both ways around; the front of the room (angle 0, toward the camera) stays open.
  const options = [1, -1].map(dir => {
    let a1 = aS - dir * .42;
    while (dir * (a1 - a0) < 0) a1 += dir * TAU;
    const pts = [];
    for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10; pts.push(at(c.x + Math.sin(a) * r, c.z + Math.cos(a) * r)); }
    const crossesFront = Math.floor((Math.min(a0, a1) + .35) / TAU) !== Math.floor((Math.max(a0, a1) - .35) / TAU) || Math.abs(a1 - a0) > Math.PI * 1.6;
    const blocked = pts.some(q => Math.abs(q.x) > 1.15 || q.z > 1.1 || q.z < -1.05);
    return { pts, cost: Math.abs(a1 - a0) + (crossesFront ? 10 : 0) + (blocked ? 20 : 0) };
  }).sort((x, y) => x.cost - y.cost);
  const best = options[0], spot = best.pts[best.pts.length - 1];
  spot.ry = heading(spot, s);
  const guide = best.cost >= 20 ? null : { spot, path: [[h.x, h.z], ...best.pts.map(q => [q.x, q.z])] };
  cache.set(s, guide);
  return guide;
}

// ------------------------------------------------------------------ drones
// Cycle (s): hovering over the pad, climb at 5, two figure-eights from 6.5, back over
// the pad at 20.5, touch-down at 24.5 (the audience cheers), take-off again at 25.7 and
// hover until 32. Without `hover` (older compositions) it rests on the pad instead.
const DRONE = { climb: 5, loop: 6.5, back: 20.5, descend: 22, down: 24.5, rise: 25.7, hover: 27.7, cycle: 32 };
const DRONE_REST = { k: 0, air: 0, loop: 0, x: 0, z: 0, y: null, vx: 0, vz: 0, phase: 0, spin: 0, landed: 0 };
function droneState(d, T) {
  const k = mod(T + hash(d.bone.name, 'drone') * DRONE.cycle, DRONE.cycle);
  const pad = (d.pad?.y ?? .07) + .01, hover = d.hover ?? null, cruise = (hover ?? .8) + .32;
  const loop = span(k, DRONE.loop, DRONE.loop + 1) * (1 - span(k, DRONE.back - 1, DRONE.back));
  const phase = span(k, DRONE.loop, DRONE.back) * TAU * 2;
  const ax = Math.min(.95, (d.host?.opts?.w || 2.4) / 2 - .3), az = Math.min(.3, (d.host?.opts?.d || 1.2) / 2 - .25);
  const rest = hover ?? pad;
  let y;
  if (k < DRONE.climb) y = rest;
  else if (k < DRONE.back) y = lerp(rest, cruise, span(k, DRONE.climb, DRONE.loop)) + Math.sin(phase * 2) * .04;
  else if (k < DRONE.descend) y = lerp(cruise, rest, span(k, DRONE.back, DRONE.descend));
  else if (k < DRONE.rise) y = hover == null ? pad : lerp(rest, pad, span(k, DRONE.descend, DRONE.down));
  else y = hover == null ? pad : lerp(pad, rest, span(k, DRONE.rise, DRONE.hover));
  if (hover != null) y += Math.sin(k * 1.7) * .02 * (1 - win(k, DRONE.descend, DRONE.hover, .5));
  // Props spin while airborne (always when it hovers); they idle on the pad.
  const onPad = win(k, DRONE.down - .1, DRONE.rise + .3, .3);
  const spin = hover != null ? 1 - onPad * .7 : span(k, DRONE.climb - 1.5, DRONE.climb) * (1 - span(k, DRONE.down, DRONE.rise));
  const air = span(k, DRONE.climb, DRONE.loop) * (1 - span(k, DRONE.back, DRONE.descend));
  return { k, air, loop, phase, y, spin, landed: win(k, DRONE.down - .2, DRONE.down + 2.6, .3),
    x: Math.sin(phase) * ax * loop, z: Math.sin(phase * 2) * az * loop, vx: Math.cos(phase) * ax * loop, vz: 2 * Math.cos(phase * 2) * az * loop };
}
function tickDrones(entries, T, dt, events, still) {
  for (const entry of entries) {
    const d = entry.d, s = still ? DRONE_REST : droneState(d, T);
    d.bone.position.set(d.home[0] + s.x, s.y ?? d.home[1], d.home[2] + s.z);
    // Banks into the turns of the figure-eight.
    d.bone.rotation.set(s.vz * .18 * s.loop, .3 + Math.cos(s.phase) * .6 * s.loop, -s.vx * .18 * s.loop);
    d.world = [d.host.x + d.bone.position.x, d.host.z + d.bone.position.z];
    entry.life = s;
    d.props.forEach((prop, i) => { prop.rotation.y = s.spin ? T * (i % 2 ? 50 : -50) * s.spin : .4; });
    if (!still && dt != null && dt < 4 && s.k >= DRONE.down && s.k - dt < DRONE.down) events.push({ kind: 'landing', room: d.host.key });
  }
}
const PILOT_BASE = new WeakMap();
/** Pilots stand at the pad's edge, both hands on the controller, tilting it with the flight; they follow the drone. */
function tickPilots(entry, T, still) {
  const d = entry.d, s = entry.life || DRONE_REST;
  (d.pilots || []).forEach((pilot, i) => {
    const ctrl = pilot.ctrl, spot = pilot.spot || { x: ctrl.root.position.x, z: ctrl.root.position.z, ry: ctrl.root.rotation.y };
    if (!PILOT_BASE.has(ctrl)) PILOT_BASE.set(ctrl, ctrl.root.position.y);
    const t = T + i * 1.7, to = Math.atan2(d.bone.position.x - spot.x, d.bone.position.z - spot.z);
    const ry = still ? spot.ry : turnTo(spot.ry, to, .5);
    placePerson(ctrl, spot.x, spot.z, ry, PILOT_BASE.get(ctrl));
    let pz = POSES.hold(still ? 0 : clamp(s.vx * .6, -1, 1), still ? 0 : clamp(s.vz * .6, -1, 1));
    if (!still) {
      lookToward(pz, ry, to, -.15 - s.air * .3, .9);
      // The second pilot talks to the first now and then; both cheer the touch-down.
      if (i > 0) pz = mixPose(pz, look(POSES.talk(t, i), -.6, 0, 1), win(mod(t, 17), 10, 13, .4) * .6);
      pz = mixPose(pz, POSES.cheer(t), s.landed * .8);
    }
    applyPose(ctrl, pz);
    if (pilot.controller) moveController({ ctl: { bone: pilot.controller }, life: s }, ctrl, s.landed * .9);
  });
}

// ------------------------------------------------------------------ yard
const YARD = new WeakMap();
function yardOf(walkers) {
  let Y = YARD.get(walkers);
  if (Y) return Y;
  const walk = walkers.filter(w => w.kind === 'walk'), pairs = [];
  for (let i = 0; i < walk.length; i += 2) pairs.push(walk.slice(i, i + 2));
  // The composed facing and height of everyone standing still (the yard turns them from there).
  Y = { pairs, base: new Map(walkers.map(w => [w, { ry: w.ctrl.root.rotation.y, y: w.ctrl.root.position.y }])), phase: pairs.map(pair => hash(pair[0].ctrl.id, 'pair')),
    // Everyone who stays in place (groups, benches): the walking pairs go around them.
    still: walkers.filter(w => w.kind !== 'walk').map(w => w.sit ? [w.sit.x, w.sit.z] : w.spot) };
  YARD.set(walkers, Y);
  return Y;
}
function tickYard(walkers, T, world, drones, still) {
  const Y = yardOf(walkers);
  const movers = Y.pairs.flatMap((pair, p) => pairWalk(pair, p, T, world, still, Y));
  separate(movers, Y.still);
  movers.forEach(m => m.apply());
  for (const w of walkers) {
    if (w.kind === 'walk' && world?.dests?.length) continue;
    const pilot = drones.find(e => e.pilot === w) || null;
    if (w.sit) benchSitter(w, walkers, T, drones, still, pilot);
    else patioGroup(w, walkers, T, drones, still, pilot, Y);
  }
}
/** A pair walks from the entrance to a classroom door and back, chatting; one waves at the door. */
function pairWalk(pair, p, T, world, still, Y) {
  if (!world?.dests?.length) return [];
  const dest = world.dests[p % world.dests.length], centre = [0, .34, -.34][p % 3];
  const lanes = pair.length > 1 ? [centre - .13, centre + .13] : [centre];
  const route = o => [[world.gate[0] + o, world.gate[1]], [world.gate[0] + o, world.spineZ + o], [dest.x + o, world.spineZ + o], [dest.x + o, dest.z]];
  const walkT = Math.max(6, along(route(centre), 1).length / WALK_SPEED), stayDoor = 7, stayGate = 6, cycle = 2 * walkT + stayDoor + stayGate;
  const t = T + Y.phase[p] * cycle * 3, k = still ? walkT + stayDoor * .5 : mod(t, cycle);
  const walking = k < walkT || (k >= walkT + stayDoor && k < 2 * walkT + stayDoor), out = k < walkT, door = k < 2 * walkT;
  // Where each one would be on its lane; tickYard moves them around people in the way before posing.
  const plans = pair.map((w, j) => {
    const pts = route(lanes[j]);
    if (!walking) { const end = door ? pts[pts.length - 1] : pts[0]; return { w, x: end[0], z: end[1], heading: door ? Math.PI : 0, length: 0, e: 0, k: 0 }; }
    const k2 = out ? k / walkT : (k - walkT - stayDoor) / walkT, e = smooth(k2), pos = along(out ? pts : pts.slice().reverse(), e);
    return { w, ...pos, e, k: k2 };
  });
  plans.forEach((plan, j) => {
    const mate = plans[1 - j], kk = plan.w.index * 1.7, speaking = Math.floor((t + j * 2.2) / 2.2) % 2 === 0;
    plan.apply = () => {
      const ctrl = plan.w.ctrl;
      if (walking) {
        const ry0 = out ? 0 : Math.PI, ry1 = out ? Math.PI : 0;
        const ry = plan.k < .1 ? turnTo(ry0, plan.heading, plan.k / .1) : plan.k > .9 ? turnTo(plan.heading, ry1, (plan.k - .9) / .1) : plan.heading;
        placePerson(ctrl, plan.x, plan.z, ry, 0);
        const upper = mate ? look(POSES.talk(t, kk), (j ? -1 : 1) * (speaking ? .4 : .6), -.05, 1) : look(POSES.stand(), wobble(t * .5, kk) * .6, 0, 1);
        const stride = .5 * (ctrl.scale || .8), amount = Math.min(1, Math.min(plan.k, 1 - plan.k) * 12);
        return applyPose(ctrl, mixArms(POSES.walk(plan.e * plan.length / stride * Math.PI, amount), upper, .45));
      }
      // At the door or back at the entrance: face each other and chat; one waves to the classroom.
      placePerson(ctrl, plan.x, plan.z, mate ? Math.atan2(mate.x - plan.x, mate.z - plan.z) : Math.PI, 0);
      const local = door ? k - walkT : k - 2 * walkT - stayDoor;
      let pz = still ? POSES.stand() : mixPose(POSES.stand(), POSES.talk(t, kk), speaking ? .8 : .1);
      if (j === 0 && door && !still) pz = mixPose(pz, POSES.wave(t), win(local, 1, 2.8, .3));
      applyPose(ctrl, pz);
    };
  });
  return plans;
}
/**
 * Keep walkers apart from people standing still and from each other: a few rounds
 * of pushing overlapping pairs apart (walkers move, standing people do not).
 * Deterministic: a fixed order and a fixed number of rounds.
 */
function separate(movers, fixed, min = .25) {
  for (let round = 0; round < 6; round++) {
    let moved = false;
    for (const m of movers) for (const [ox, oz] of fixed) {
      const dx = m.x - ox, dz = m.z - oz, d = Math.hypot(dx, dz);
      if (d >= min) continue;
      const ux = d > 1e-6 ? dx / d : Math.cos(m.heading), uz = d > 1e-6 ? dz / d : -Math.sin(m.heading);
      m.x = ox + ux * min; m.z = oz + uz * min; moved = true;
    }
    for (let i = 0; i < movers.length; i++) for (let j = i + 1; j < movers.length; j++) {
      const a = movers[i], b = movers[j], dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz);
      if (d >= min) continue;
      const ux = d > 1e-6 ? dx / d : Math.cos(a.heading), uz = d > 1e-6 ? dz / d : -Math.sin(a.heading), push = (min - d) / 2 + 1e-4;
      a.x += ux * push; a.z += uz * push; b.x -= ux * push; b.z -= uz * push; moved = true;
    }
    if (!moved) break;
  }
}
/** The drone within 5 units of (x, z), if any. */
function droneNear(drones, x, z) {
  let best = null, bestD = 5;
  for (const e of drones) { const d = Math.hypot(e.d.world[0] - x, e.d.world[1] - z); if (d < bestD) { best = e; bestD = d; } }
  return best;
}
/** People standing in the yard talk in a ring, take turns, wave; near the drone field they watch it. */
function patioGroup(w, walkers, T, drones, still, pilot, Y) {
  const [x, z] = w.spot, ctrl = w.ctrl, base = Y.base.get(w) || { ry: 0, y: 0 };
  const group = walkers.filter(o => o !== w && !o.sit && o.kind !== 'walk' && o.host === w.host);
  const t = T + w.index * 1.9, near = still ? null : droneNear(drones, x, z), dl = near?.life;
  let ry = base.ry, pz = POSES.stand();
  if (group.length && !still) {
    const cx = group.reduce((n, o) => n + o.spot[0], x) / (group.length + 1), cz = group.reduce((n, o) => n + o.spot[1], z) / (group.length + 1);
    ry = turnTo(base.ry, Math.atan2(cx - x, cz - z), .85);
    const order = [w, ...group].sort((a, b) => a.index - b.index), speaker = order[Math.floor(t / 2.6) % order.length];
    pz = speaker === w ? POSES.talk(t, w.index) : nod(look(POSES.stand(), wobble(t * .4, w.index) * .4, 0, 1), t, win(mod(t, 9), 3, 4.4, .3));
    pz = mixPose(pz, POSES.wave(t), win(mod(t + w.index * 5, 19), 14, 16, .3));
  }
  if (dl) {
    const watch = clamp(.35 + dl.air * 1.2), to = Math.atan2(near.d.world[0] - x, near.d.world[1] - z);
    ry = turnTo(ry, to, .85 * watch);
    pz = mixPose(mixPose(pz, look(POSES.stand(), 0, -.2 - .25 * dl.air, 1), watch), POSES.cheer(t), dl.landed);
  }
  placePerson(ctrl, x, z, ry, base.y);
  if (pilot) pz = holdController(pilot, pz, still);
  applyPose(ctrl, pz);
  if (pilot) moveController(pilot, ctrl);
}
/** People on a bench talk to their neighbour, follow the drone and clap when it lands. */
function benchSitter(w, walkers, T, drones, still, pilot) {
  const ctrl = w.ctrl, s = w.sit, t = T + w.index * 1.3;
  const mate = walkers.find(o => o !== w && o.sit && Math.hypot(o.sit.x - s.x, o.sit.z - s.z) < .6);
  const near = still ? null : droneNear(drones, s.x, s.z), dl = near?.life;
  let ry = s.ry, pz = POSES.stand();
  if (!still) {
    if (mate) {
      const speaking = Math.floor((t + (w.index < mate.index ? 0 : 2.4)) / 2.4) % 2 === 0;
      pz = lookToward(mixPose(pz, POSES.talk(t, w.index), speaking ? .85 : 0), s.ry, Math.atan2(mate.sit.x - s.x, mate.sit.z - s.z), .05, .85);
    } else look(pz, wobble(t * .4, w.index) * .7, 0, 1);
    if (dl) {
      const watch = clamp(.3 + dl.air * 1.2), to = Math.atan2(near.d.world[0] - s.x, near.d.world[1] - s.z);
      ry = turnTo(s.ry, to, .35 * watch);
      pz = mixPose(mixPose(pz, lookToward(POSES.stand(), ry, to, -.15 - .2 * dl.air, 1), watch * .9), POSES.clap(t), dl.landed);
    }
  }
  placePerson(ctrl, s.x, s.z, ry, 0);
  if (pilot) pz = holdController(pilot, pz, still);
  seatPose(ctrl, pz, BENCH);
  if (pilot) moveController(pilot, ctrl);
}
/** The pilot's upper body: both hands on the controller, tilted with the drone's velocity. */
function holdController(entry, pz, still) {
  const s = entry.life || DRONE_REST;
  const out = mixPose(pz, POSES.hold(still ? 0 : clamp(s.vx * .6, -1, 1), still ? 0 : clamp(s.vz * .6, -1, 1)), 1);
  out.head = pz.head.slice();
  return out;
}
/** The controller follows the pilot's hands: the tips of both forearms, in the drone patio's frame. */
let handA = null, handB = null;
function moveController(entry, ctrl, drop = 0) {
  const ctl = entry.ctl;
  if (drop > .5) return; // hands up cheering: the controller stays where it was
  if (!ctl || !ctl.bone.parent) return;
  const Vec = ctl.bone.position.constructor;
  handA ||= new Vec(); handB ||= new Vec();
  const reachLen = .14 * (ctrl.scale || .8);
  ctrl.joints.foreL.updateWorldMatrix(true, false);
  ctrl.joints.foreR.updateWorldMatrix(false, false);
  handA.set(0, -reachLen, 0).applyMatrix4(ctrl.joints.foreL.matrixWorld);
  handB.set(0, -reachLen, 0).applyMatrix4(ctrl.joints.foreR.matrixWorld);
  handA.add(handB).multiplyScalar(.5);
  ctl.bone.parent.updateWorldMatrix(true, false);
  ctl.bone.parent.worldToLocal(handA);
  ctl.bone.position.copy(handA);
  const s = entry.life || DRONE_REST;
  ctl.bone.rotation.set(-.4 + s.vz * .15, ctrl.root.rotation.y, -s.vx * .2);
}

// ------------------------------------------------------------------ calm final state (reduced motion)
function restRoom(room, L) {
  const floor = room.floor, seats = L.seats;
  for (const p of [...L.students, ...L.second]) {
    const s = seats[p.seat];
    if (!s) continue;
    p.seatNow = p.seat;
    placePerson(p.ctrl, s.x, s.z, s.ry, floor);
    if (p.vr) applyPose(p.ctrl, POSES.vr(1.2, p.k));
    else seatAt(p.ctrl, room.kind === 'project' ? mixPose(work(0, p, .3), POSES.lean(.6), .5) : work(1.5, p, .5), s, L);
  }
  if (L.relay) benchGroup(room, L.waiting, 0, floor);
  if (L.teacher) { const h = L.teacher.home; placePerson(L.teacher.ctrl, h.x, h.z, h.ry, floor); applyPose(L.teacher.ctrl, POSES.point(.3)); }
  if (L.facilitator) { const h = L.facilitator.home; placePerson(L.facilitator.ctrl, h.x, h.z, h.ry, floor); applyPose(L.facilitator.ctrl, reach(.25, 'R')); }
  L.devices.forEach((d, i) => {
    d.bone.position.set(d.home[0], d.home[1], d.home[2]); d.bone.rotation.y = d.home[3];
    if (d.hub) d.hub.rotation.y = 0;
    const bones = L.bound?.devices?.[i];
    bones?.wheels.forEach(wheel => { wheel.rotation.x = 0; });
    if (bones?.head) bones.head.rotation.x = 0;
    if (bones?.tail) bones.tail.rotation.y = 0;
  });
  const box = L.bound?.box;
  if (box) box.bone.position.set(box.x, box.y, box.z);
  if (room.service) for (const who of room.service.teachers) {
    const s = seats[who.seat];
    if (!s) continue;
    placePerson(who.ctrl, s.x, s.z, s.ry, floor);
    seatAt(who.ctrl, room.service.kind === 'training' ? reach(.1, 'B') : work(0, { k: who.seat }, .5), s, L);
  }
  L.around.forEach(a => {
    if (!AROUND_BASE.has(a.ctrl)) AROUND_BASE.set(a.ctrl, a.ctrl.root.position.y);
    placePerson(a.ctrl, a.spot.x, a.spot.z, a.spot.ry, AROUND_BASE.get(a.ctrl));
    if (a.pose === 'kneel') applyPose(a.ctrl, blendBody(POSES.kneel(), mixPose(POSES.lean(.6), POSES.pointDown(0), .4)), 'kneel');
    else applyPose(a.ctrl, POSES.stand());
  });
  if (room.holo) {
    // The hologram at its composed rest (the composition checks its visibility there).
    const r = room.holo.userData?.rest;
    if (r?.position) room.holo.position.copy(r.position);
    if (r?.quaternion) room.holo.quaternion.copy(r.quaternion);
    room.holo.rotation.y = HOLO_TURN;
    room.holo.position.y -= HOLO_BOB;
  }
}

// ------------------------------------------------------------------ entry points
/**
 * Pose everything in `list` (the actors of every entity, or one actors object)
 * for animation time T. opts.since: the previous T, to report the events that
 * happened in (since, T]; opts.still: the calm final state (reduced motion).
 * Returns the events: { kind: 'goal' | 'works' | 'landing', room }.
 */
export function tickLife(list, T, world, opts = {}) {
  const events = [], still = !!opts.still, dt = opts.since == null ? null : T - opts.since;
  const actorsList = (Array.isArray(list) ? list : [list]).filter(Boolean);
  // Drones first: the yard and the pilots look at them, whatever entity holds them.
  const drones = [];
  for (const actors of actorsList) for (const d of actors.drones || []) drones.push({ d, ctl: BOUND.get(actors)?.drones.get(d)?.ctl || null, pilot: null, life: null });
  tickDrones(drones, T, dt, events, still);
  for (const e of drones) if (e.d.pilots?.length) tickPilots(e, T, still);
  if (drones.some(e => !e.d.pilots?.length)) {
    // Older compositions without pilots: someone of the drone's own patio (or within 4 of it),
    // the nearest to the controller, holds it.
    const yard = actorsList.flatMap(actors => actors.walkers || []).filter(w => w.kind !== 'walk');
    for (const e of drones.filter(e => !e.d.pilots?.length)) {
      const host = e.d.host, home = e.ctl ? [host.x + e.ctl.x, host.z + e.ctl.z] : [host.x, host.z];
      const near = w => w.host === host.key || Math.hypot(w.spot[0] - host.x, w.spot[1] - host.z) < 4;
      e.pilot = yard.filter(w => near(w) && !drones.some(o => o !== e && o.pilot === w))
        .sort((a, b) => Math.hypot(a.spot[0] - home[0], a.spot[1] - home[1]) - Math.hypot(b.spot[0] - home[0], b.spot[1] - home[1]))[0] || null;
    }
  }
  for (const actors of actorsList) {
    for (const room of actors.rooms || []) {
      const L = lifeOf(room, actors);
      if (still) restRoom(room, L);
      else if (room.kind === 'class') classRoom(room, L, T);
      else if (room.kind === 'vr') vrRoom(room, L, T);
      else if (room.layout === 'track' || (L.around.length && !room.students.length)) trackRoom(room, L, T, events, opts.since ?? null);
      else projectRoom(room, L, T, events, opts.since ?? null);
    }
    if (actors.walkers?.length) tickYard(actors.walkers, T, world, drones, still);
  }
  return events;
}

/**
 * Former API: pose `actors` at run `run`, `u` seconds into it, on the continuous
 * clock. A run used to end at rest, so u >= RUN still gives the calm final state.
 */
export function tickActors(actors, run, u, world) {
  if (u >= RUN) return tickLife([actors], 0, world, { still: true });
  return tickLife([actors], Math.max(0, (run - 1) * RUN + u), world);
}

/** Paths from the entrance to every ground classroom, from the plan's own paths. */
export function walkerWorld(plan) {
  const mods = plan.modules || [];
  const entrance = mods.find(m => m.type === 'entrance') || { x: 0, z: 2 };
  const spine = mods.filter(m => m.key.startsWith('path:spine:'));
  const spineZ = spine.length ? spine[0].z : 1;
  const rooms = mods.filter(m => m.type.startsWith('room-') && m.type !== 'room-upper' && (m.y || 0) < .5);
  const doors = new Map(mods.filter(m => m.key.startsWith('path:door:')).map(m => [m.key.slice('path:door:'.length), m]));
  const dests = rooms.map(room => {
    const door = doors.get(room.key);
    if (door) return { x: door.x, z: door.z - door.opts.d / 2 + .3, ry: Math.PI, room };
    return { x: room.x + .5, z: room.z + 1.2 + .3, ry: Math.PI, room };
  });
  return { gate: [entrance.x, entrance.z - .1], spineZ, dests };
}
