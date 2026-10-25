/**
 * Papercraft campus growth planner (v3, compact U). Pure ESM: no DOM, no three.js,
 * no Math.random. Same `input` as `deriveCampus`; returns catalog pieces
 * (`modules`). Scope (levels, sections, programs, modality) drives everything;
 * price and wizard step never do.
 *
 * Coordinates: Y up, +Z faces the camera (front-left, above). Classrooms are
 * 2.6 (x) x 2.3 (z), 1.7 tall, origin at the footprint centre, front open to +Z.
 * Five columns (c = -2..2, x = (c + .5) * 2.6, total width 13.0). Every column
 * holds ONE stack of rooms, so no room is ever in front of another on the same
 * floor: growth is upwards (floors 0..2), not sideways.
 *
 *              c=-2        c=-1   c=0       c=1       c=2        (x -3.9 .. 6.5)
 *   row A  garden (trees, shallow strip, coordinator)
 *   row B               [  BL  ][  BR  ]                          rooms z -2.4
 *   row F   [  W  ]  <-- PATIO (drones) -->  [ E1 ][ E2 ]         rooms z -0.7
 *   row G   entrance (-2.9)     drones pad (0)  yard / spine path
 *   row H   low front planting (appears from 3 ground rooms)
 *   W and the back pair share a wall (z overlap 0.6), as do BR and E1: a U
 *   open to the front around the patio, staggered like Townscaper.
 *
 * SLOT TABLE (stack: floor 0 / floor 1 / floor 2). Fixed; keys never move.
 *   W  (c=-2, F): pre  room:pre:0   | upper:pre:0   | project:electronics
 *   BL (c=-1, B): prim room:prim:0  | upper:prim:0  | project:spike
 *   BR (c= 0, B): project:tale      | project:master| project:immersive
 *   E1 (c= 1, F): bas  room:bas:0   | upper:bas:0   | -
 *   E2 (c= 2, F): bach room:bach:0  | upper:bach:0  | -
 *   drones -> no room: `patio:drones` flight pad in the yard (0, 1.95).
 *   No level chosen -> one `room-initial` (example) in W with key room:pre:0.
 *   Limits: 5 ground rooms (one per column) and 8 upper rooms (5 + 3).
 *
 * RULES
 *  - Level upper floor (floor 1) when students >= 90 or sections >= 4.
 *  - Support: a module at floor f needs a room or `columns` at f-1 in its
 *    stack; missing levels under a built floor are `columns` (open frame).
 *  - Floor-1 gallery: each side (west = W,BL,BR; east = E1,E2) is continuous at
 *    floor 1 from its first stack to the farthest stack with any upper room;
 *    stacks without an upper room get a walkway `corridor` (floor 1, on top of
 *    their room or columns) or `columns` when a room sits above them.
 *  - `stairs:west` (and `stairs:east`) exist when the side has any upper room:
 *    foot on a free patio cell beside the wing's inner face (never in front of
 *    a room), top at that face, `opts.landing` on the front balcony of the first
 *    floor-1 module (W / E1), 0.35 from the open front, never against a wall.
 *    Floor-2 rooms are reached from the floor-1 gallery inside the building.
 *  - `bridge:0` joins W and E1 at floor 1 across the patio (len 5.2) when both
 *    sides have a real `room-upper`.
 *  - Room variant: neighbour stacks at the same floor decide: none -> room-initial,
 *    one -> room-end, two -> room-extendable; a neighbour in the other row
 *    (the U turns) -> room-corner (`opts.turn`). Key and position never change.
 *  - `roof` only over the top module of each stack (none over a walkway).
 *  - Base: one `pedestal` per cell of rows A,B,F,G (+H from 3 ground rooms) over
 *    the column range [min(-2, built), max(-1, built)]; grows monotonically.
 *  - Paths: `path:spine:<c>` in front of the wings; `path:door:<room>` from the
 *    back rooms to the spine; the entrance touches the spine.
 *  - Decor on a fixed 1.3 x 1.15 lattice by hash(position); slots of rooms,
 *    paths, stairs, bridge and yard are reserved, so decor only ever appears.
 *    Trees: garden row, row B and outer columns; rows G/H only low planting.
 *  - services (equipment modalities): FLEX/EV8/EV16 -> training, guided, followup
 *    true; INTEGRA only -> training 'basic' (1 h); otherwise all false.
 *  - People: teacher per level room, 2-3 seated students, facilitator in project
 *    rooms when `guided`, walkers in the yard; never above CAMPUS_LIMITS.people.
 *
 * order: 0 base (pedestal, entrance), 1 rooms/columns, 2 roofs and upper rooms,
 * 3 connections (paths, walkways, stairs, bridge, drone pad), 4 exterior.
 */
import { normalizeCampusData, CAMPUS_LIMITS, LEVEL_IDS, PROGRAM_IDS, FLOOR_HEIGHT } from '../campus-layout.js';

export const CELL_W = 2.6;
export const CELL_D = 2.3;
export const ROW_Z = Object.freeze({ A: -4.8, B: -3.0, F: -0.7, G: 1.6, H: 3.1 });
/** Row A is a planted back garden (decor only, never buildings); its depth is shallower. */
export const GARDEN_D = 1.3;
/** Row H is only the front lip of the base (stairs foot, margin): no plaza in front of the wings. */
export const FRONT_D = .7;
/** West porch of the base: hosts the entrance beside the first classroom, along rows B, F and G (plus A and H when built). */
export const PORCH = Object.freeze({ x: -6.0, w: 1.6, z: -.7, d: CELL_D * 3 });
export const SERVICE_PLANS = Object.freeze(['FLEX', 'EV8', 'EV16']);
export const PLAN_LIMITS = Object.freeze({ groundRooms: 5, upperRooms: 5 });

const UPPER_STUDENTS = 90, UPPER_SECTIONS = 4;
const ROW_ORDER = ['A', 'B', 'F', 'G', 'H'];
const colX = c => round((c + .5) * CELL_W);
const round = value => Math.round(value * 1000) / 1000;
const noise = (a, b, k1, k2, k3) => Math.abs(Math.sin(a * k1 + b * k2) * k3) % 1;
const cellKey = (c, r) => c + ':' + r;

/** Plan-view footprint (w along x, d along z) per piece type. */
export const FOOTPRINTS = Object.freeze({
  'room-initial': [CELL_W, CELL_D], 'room-extendable': [CELL_W, CELL_D], 'room-corner': [CELL_W, CELL_D], 'room-end': [CELL_W, CELL_D],
  'room-upper': [CELL_W, CELL_D], columns: [CELL_W, CELL_D], corridor: [CELL_W, 1.2], entrance: [1.4, 1.2], stairs: [1.9, .7], patio: [2.4, 1.2],
  planter: [1, .5], bench: [1, .45], 'tree-large': [.9, .9], 'tree-small': [.7, .7], bush: [.5, .5], flowers: [.5, .5]
});
/** Footprint {x0,x1,z0,z1} of a module in plan view, or null for flat/virtual pieces. */
export function footprintOf(module) {
  const size = module.type === 'stairs' ? (Math.abs(Math.sin(module.ry)) < .5 ? [.6, 1.86] : [1.86, .6]) : module.type === 'bridge' ? (Math.abs(Math.sin(module.ry)) > .5 ? [.6, module.opts.len] : [module.opts.len, .6]) : module.type === 'pedestal' ? [module.opts.w, module.opts.d]
    : module.type === 'path' ? [2.6, .6] : module.type === 'corridor' && module.opts.walkway ? (Math.abs(Math.sin(module.ry)) > .5 ? [module.opts.w, module.opts.len] : [module.opts.len, module.opts.w]) : FOOTPRINTS[module.type];
  if (!size) return null;
  return { x0: module.x - size[0] / 2, x1: module.x + size[0] / 2, z0: module.z - size[1] / 2, z1: module.z + size[1] / 2 };
}

// One stack of rooms per column. Tenants fill a stack from the ground up without gaps
// (floor = number of present tenants before it): `level` is the level room, `upper` its
// second floor (students >= 90 or sections >= 4), `program` a project room. Level rooms
// and their keys never move; a project room rises one floor when a tenant below it appears.
// Two floors at most (5 stacks x 2): rooms are representative. Priority: one room per level, one project
// room per program, and only then the second floor of a large level (>= 90 students or >= 4 sections),
// so a project room takes the slot first and an upper level room appears only while a slot is left.
const STACKS = Object.freeze([
  { id: 'w', c: -2, row: 'F', tenants: [{ level: 'pre' }, { program: 'electronics' }, { upper: 'pre' }] },
  { id: 'bl', c: -1, row: 'B', tenants: [{ level: 'prim' }, { program: 'spike' }, { upper: 'prim' }] },
  { id: 'br', c: 0, row: 'B', tenants: [{ program: 'tale' }, { program: 'master' }] },
  { id: 'e1', c: 1, row: 'F', tenants: [{ level: 'bas' }, { program: 'immersive' }, { upper: 'bas' }] },
  { id: 'e2', c: 2, row: 'F', tenants: [{ level: 'bach' }, { upper: 'bach' }] }
]);
// Balcony in U at floor-1 height, glued to the buildings (gallery = `corridor` with `walkway`, depth 0.7):
//  - a gallery in front of every upper room, across its full width;
//  - on each inner face of the wings a straight side run (`gallery:strip-west/east`, rotated, 2.3 long) that
//    joins the wing gallery with the back galleries, so the balcony turns the corner without gaps;
//  - the back galleries (BL, BR) form the walkway between the two wings (fillers `gallery:bl:1` / `gallery:br:1`
//    appear without a room behind them only to close the ring);
//  - ONE outside flight of stairs climbs from the pedestal floor along the right wing (left wing when there is
//    no right one) up to the south end of that side run (`landing.open: 'back'`); the patio stays free.
const GALLERY_W = .7, STAIRS_RUN = 1.5, STAIRS_TOP = .93; // top end of a flight lies 0.93 from its centre
// The orange entrance stands against the west flank of the first classroom, flush with its front and facing the
// camera: never under a gallery, never in front of an interior, and in the same place in every state.
const ENTRANCE = Object.freeze({ x: -5.9, z: -.15 });
// Flank trees frame the campus on the porch, outside every classroom's front; the east flank (in front of the last
// classroom) only takes low planting.
const FLANK_TREES = Object.freeze([{ key: 'tree:flank:west', type: 'tree-large', x: -6.2, z: 2.15, c: -2 }, { key: 'tree:flank:porch', type: 'tree-small', x: -6.3, z: -1.35, c: -2 }, { key: 'bush:flank:east', type: 'bush', x: 7.35, z: 2.3, c: 2 }]);
const DRONES = Object.freeze({ x: 0, z: 1.66 });
const BAND_Z = .754; // front path tiles (2.6 x 0.6) just in front of the wings
const galleryZ = stack => ROW_Z[stack.row] + CELL_D / 2 + GALLERY_W / 2 + .004;
const galleryFront = stack => galleryZ(stack) + GALLERY_W / 2;
const STRIP = Object.freeze({ z0: galleryFront({ row: 'B' }), z1: galleryFront({ row: 'F' }), x: 2.6 - GALLERY_W / 2 }); // strip runs z0..z1 at x = +-STRIP.x
const rectOf = (x, z, w, d) => ({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
const inside = (x, z, rect, pad) => x > rect.x0 - pad && x < rect.x1 + pad && z > rect.z0 - pad && z < rect.z1 + pad;

// Static reservations: decor never sits where a module may ever be built.
const RESERVED = [
  ...STACKS.map(stack => rectOf(colX(stack.c), ROW_Z[stack.row], CELL_W, CELL_D)),
  rectOf(0, galleryZ(STACKS[1]), CELL_W * 2, GALLERY_W + .2),
  ...[-1, 1].flatMap(sign => [rectOf(sign * STRIP.x, (STRIP.z0 + STRIP.z1) / 2, GALLERY_W + .1, STRIP.z1 - STRIP.z0), rectOf(sign * STRIP.x, STRIP.z1 + STAIRS_TOP, .7, 1.9)]),
  { x0: -60, x1: 60, z0: .45, z1: 1.06 },
  rectOf(ENTRANCE.x, ENTRANCE.z + .3, 1.4, 1.8), rectOf(DRONES.x, DRONES.z, 2.4, 1.2),
  ...FLANK_TREES.map(t => rectOf(t.x, t.z, 1.1, 1.1))
];

const sortModules = list => list.sort((a, b) => a.order - b.order || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

export function derivePlanServices(normalized) {
  const plans = new Set(Object.values(normalized.equipment).flatMap(entry => entry.plans));
  const full = SERVICE_PLANS.some(plan => plans.has(plan));
  if (full) return { training: true, guided: true, followup: true };
  if (plans.has('INTEGRA')) return { training: 'basic', guided: false, followup: false };
  return { training: false, guided: false, followup: false };
}

export function planCampus(input = {}) {
  const normalized = normalizeCampusData(input);
  const services = derivePlanServices(normalized);
  const has = { level: id => normalized.levels.includes(id), program: id => normalized.programs.includes(id) };
  const modules = [];
  const add = (key, type, x, z, floor, opts, order, extra = {}) =>
    modules.push({ key, type, x: round(x), y: round(floor * FLOOR_HEIGHT), z: round(z), floor, ry: extra.ry || 0, opts, ...extra.tags, order });

  const example = !normalized.levels.length;
  const hasUpperLevel = id => has.level(id) && (normalized.counts[id] >= UPPER_STUDENTS || normalized.sections[id] >= UPPER_SECTIONS);
  const levelTags = id => ({ levelId: id });
  const programOpts = id => ({ units: normalized.equipment[id].units, stations: normalized.equipment[id].stations });

  // ---- tenants per stack, floors assigned from the ground up -------------------------------
  const rooms = STACKS.map(stack => stack.tenants.map(slot => {
    if (slot.level) {
      if (!has.level(slot.level) && !(example && slot.level === 'pre')) return null;
      return { key: `room:${slot.level}:0`, tags: example ? {} : levelTags(slot.level),
        opts: { example, students: normalized.counts[slot.level] || 0, sections: normalized.sections[slot.level] || 0 } };
    }
    if (slot.upper) {
      if (!hasUpperLevel(slot.upper)) return null;
      return { key: `upper:${slot.upper}:0`, tags: levelTags(slot.upper),
        opts: { students: normalized.counts[slot.upper], sections: normalized.sections[slot.upper], balcony: true } };
    }
    if (!has.program(slot.program)) return null;
    return { key: `project:${slot.program}`, tags: { programId: slot.program }, opts: { ...programOpts(slot.program), balcony: true } };
  }).filter(Boolean).slice(0, 2));
  const idxOf = id => STACKS.findIndex(stack => stack.id === id);
  const roomAt = (id, floor) => rooms[idxOf(id)][floor] || null;
  const wantsUpper = ids => ids.some(id => rooms[idxOf(id)].length >= 2);
  // ---- modules per stack -----------------------------------------------------------------------
  const names = {}; // `${floor}:${stackId}` -> module key
  STACKS.forEach((stack, idx) => {
    const x = colX(stack.c), z = ROW_Z[stack.row], list = rooms[idx];
    const sameRow = delta => STACKS[idx + delta] && STACKS[idx + delta].row === stack.row ? rooms[idx + delta] : null;
    const other = delta => STACKS[idx + delta] && STACKS[idx + delta].row !== stack.row ? rooms[idx + delta] : null;
    list.forEach((room, floor) => {
      names[`${floor}:${stack.id}`] = room.key;
      const left = sameRow(-1), right = sameRow(1);
      const neighbors = { west: !!(left && left[floor]), east: !!(right && right[floor]) };
      if (floor === 0) {
        const turn = !neighbors.west && other(-1) && other(-1)[0] ? 'west' : !neighbors.east && other(1) && other(1)[0] ? 'east' : null;
        const count = (neighbors.west ? 1 : 0) + (neighbors.east ? 1 : 0);
        const type = turn ? 'room-corner' : count === 0 ? 'room-initial' : count === 1 ? 'room-end' : 'room-extendable';
        add(room.key, type, x, z, 0, { w: CELL_W, d: CELL_D, neighbors, turn, ...room.opts }, 1, { tags: room.tags });
      } else add(room.key, 'room-upper', x, z, floor, { w: CELL_W, d: CELL_D, neighbors, ...room.opts, balcony: false }, 2, { tags: room.tags });
    });
    if (list.length) {
      const top = list.length - 1, m = modules.find(item => item.key === list[top].key);
      add('roof:' + m.key, 'roof', x, z, top + 1, { w: CELL_W, d: CELL_D, over: m.key, neighbors: m.opts.neighbors }, 2, { tags: list[top].tags });
    }
  });

  // ---- balcony in U: wing galleries, side runs on the inner faces, back galleries, one outside flight ------------------
  const galleryAt = {}; // stackId -> { key, stack, idx, open[], room }
  STACKS.forEach((stack, idx) => { if (rooms[idx].length >= 2) galleryAt[stack.id] = { key: `gallery:${stack.id}:1`, stack, idx, open: [], room: true }; });
  if (galleryAt.e2 && !galleryAt.e1) galleryAt.e1 = { key: 'gallery:e1:1', stack: STACKS[idxOf('e1')], idx: idxOf('e1'), open: [], room: false };
  const wingW = !!galleryAt.w, wingE = !!(galleryAt.e1 || galleryAt.e2);
  const any = Object.keys(galleryAt).length > 0;
  const stairsSide = wingE ? 'east' : 'west';
  const strips = { west: any && (stairsSide === 'west' || wingW), east: any && (stairsSide === 'east' || wingE) };
  // back run: both segments when both side runs exist, otherwise from the stairs side up to the farthest back room
  const back = { bl: !!galleryAt.bl, br: !!galleryAt.br };
  if (strips.west && strips.east) { back.bl = true; back.br = true; } else if (back.bl || back.br) back[stairsSide === 'west' ? 'bl' : 'br'] = true;
  for (const id of ['bl', 'br']) if (back[id] && !galleryAt[id]) galleryAt[id] = { key: `gallery:${id}:1`, stack: STACKS[idxOf(id)], idx: idxOf(id), open: [], room: false };
  for (const g of Object.values(galleryAt)) {
    if (g.room) g.open.push('back');
    const next = delta => STACKS[g.idx + delta] && STACKS[g.idx + delta].row === g.stack.row ? galleryAt[STACKS[g.idx + delta].id] : null;
    if (next(-1)) g.open.push('left');
    if (next(1)) g.open.push('right');
  }
  if (strips.west && galleryAt.w) galleryAt.w.open.push('right');
  if (strips.east && galleryAt.e1) galleryAt.e1.open.push('left');
  if (strips.west && galleryAt.bl) galleryAt.bl.open.push('front');
  if (strips.east && galleryAt.br) galleryAt.br.open.push('front');
  for (const g of Object.values(galleryAt)) {
    names[`g1:${g.stack.id}`] = g.key;
    add(g.key, 'corridor', colX(g.stack.c), galleryZ(g.stack), 1, { len: CELL_W, w: GALLERY_W, walkway: true, open: [...new Set(g.open)].sort() }, 3);
  }
  // side runs (rotated 90 degrees: local right = north end, local left = south end, local back = west side, local front = east side)
  const stripLen = round(STRIP.z1 - STRIP.z0);
  for (const sideName of ['west', 'east']) {
    if (!strips[sideName]) continue;
    const open = ['right'];
    if (sideName === 'west' && galleryAt.w) open.push('back');
    if (sideName === 'east' && galleryAt.e1) open.push('front');
    if (stairsSide === sideName) open.push('left');
    add(`gallery:strip-${sideName}`, 'corridor', sideName === 'west' ? -STRIP.x : STRIP.x, (STRIP.z0 + STRIP.z1) / 2, 1, { len: stripLen, w: GALLERY_W, walkway: true, open: open.sort() }, 3, { ry: Math.PI / 2 });
  }
  if (any) {
    const x = stairsSide === 'west' ? -STRIP.x : STRIP.x;
    add('stairs:side', 'stairs', x, STRIP.z1 + STAIRS_TOP, 0, { run: STAIRS_RUN, rise: FLOOR_HEIGHT, wing: stairsSide, serves: [`gallery:strip-${stairsSide}`],
      landing: { open: 'back', x, z: round(STRIP.z1 - .1), y: FLOOR_HEIGHT } }, 3);
  }

  // ---- entrance (on the west flank of the first classroom, on the porch), drone patio ------------------
  add('entrance', 'entrance', ENTRANCE.x, ENTRANCE.z, 0, { w: 1.4, d: 1.2, attachedTo: 'room:pre:0' }, 0);
  if (has.program('drones')) add('patio:drones', 'patio', DRONES.x, DRONES.z, 0, { w: 2.4, d: 1.2, programId: 'drones', units: normalized.equipment.drones.units }, 3, { tags: { programId: 'drones' } });

  // base: the real footprint of what is built (+ one garden cell behind, front rows from 2 rooms)
  const groundRooms = rooms.filter(list => list.length).length;
  const front = groundRooms >= 3 || has.program('drones');
  const ROWS = [['A', -5.45, -4.15], ['B', -4.15, -1.85], ['F', -1.85, .45], ['G', .45, 2.75], ['H', 2.75, 2.75 + FRONT_D]];
  const cells = new Set([cellKey(-2, 'G')]), cols = []; // the porch always has the front row beside it
  for (const m of modules) {
    const fp = footprintOf(m);
    if (!fp || m.type === 'roof' || m.type === 'bridge' || m.type === 'entrance') continue; // the entrance stands on the porch
    for (let c = Math.floor((fp.x0 + .01) / CELL_W); c <= Math.ceil((fp.x1 - .01) / CELL_W) - 1; c++) {
      cols.push(c);
      for (const [r, z0, z1] of ROWS) if (fp.z0 + .01 < z1 && fp.z1 - .01 > z0) cells.add(cellKey(c, r));
      if (m.floor === 0 && m.type.startsWith('room-') && fp.z0 > -1.9) cells.add(cellKey(c, 'B')); // garden behind a wing room
    }
  }
  const minC = Math.min(...cols), maxC = Math.max(...cols);
  if (groundRooms >= 2) for (let c = minC; c <= maxC; c++) for (const r of front ? ROW_ORDER : ROW_ORDER.slice(0, 4)) cells.add(cellKey(c, r));
  // A front lip (stairs foot) runs along the whole front, never as a bump under one column.
  if ([...cells].some(id => id.endsWith(':H'))) for (let c = minC; c <= maxC; c++) for (const r of ['G', 'H']) cells.add(cellKey(c, r));
  // paths: front tiles (2.6 x 0.6) in front of the wings wherever the front row exists
  for (let c = minC; c <= maxC; c++) if (cells.has(cellKey(c, 'G'))) add(`path:spine:${c}`, 'path', colX(c), BAND_Z, 0, {}, 3);
  for (const id of cells) {
    const [c, r] = id.split(':'), cc = Number(c);
    const free = (dc, dr) => !cells.has(cellKey(cc + dc, ROW_ORDER[ROW_ORDER.indexOf(r) + dr]));
    const north = free(0, -1), south = free(0, 1), west = free(-1, 0) && cc !== -2, east = free(1, 0);
    add(`base:${c}:${r}`, 'pedestal', colX(cc), ROW_Z[r], 0, { w: CELL_W, d: r === 'A' ? GARDEN_D : r === 'H' ? FRONT_D : CELL_D, round: [north && west, north && east, south && east, south && west] }, 0);
  }
  // The porch follows the whole west edge (garden and front lip included) so the base reads as one sheet.
  const porchA = cells.has(cellKey(-2, 'A')), porchH = cells.has(cellKey(-2, 'H'));
  add('base:porch', 'pedestal', PORCH.x, PORCH.z, 0, { w: PORCH.w, d: PORCH.d, round: [!porchA, false, false, !porchH] }, 0);
  if (porchA) add('base:porch:A', 'pedestal', PORCH.x, ROW_Z.A, 0, { w: PORCH.w, d: GARDEN_D, round: [true, false, false, false] }, 0);
  if (porchH) add('base:porch:H', 'pedestal', PORCH.x, ROW_Z.H, 0, { w: PORCH.w, d: FRONT_D, round: [false, false, false, true] }, 0);
  for (const t of FLANK_TREES) if (cells.has(cellKey(t.c, t.z < .45 ? 'F' : 'G'))) add(t.key, t.type, t.x, t.z, 0, { scale: 1 }, 4);
  // Back garden: trees frame the campus from behind and grow with the columns.
  for (let c = minC; c <= maxC; c++) for (const dx of [-.6, .6]) if (cells.has(cellKey(c, 'A'))) {
    const i = Math.round((colX(c) + dx) / .65), seed = noise(i, 7, 91.7, 47.3, 9123.77);
    const kind = seed < .45 ? 'tree-large' : seed < .8 ? 'tree-small' : 'bush';
    add(`tree:garden:${i}`, kind, round(colX(c) + dx + (seed - .5) * .1), round(ROW_Z.A + (seed * 7 % 1 - .5) * .1), 0, { scale: round(.9 + seed * .3) }, 4, { ry: round(Math.floor(seed * 4) * Math.PI / 2) });
  }

  // ---- decor ---------------------------------------------------------------------------------------
  for (let i = minC * 2; i < (maxC + 1) * 2; i++) for (let k = -4; k < 4; k++) {
    // lattice 1.3 x 1.15 aligned with the cells (rows start at z = -4.15)
    const x = round((i + .5) * 1.3), z = round(-4.15 + 1.15 * (k + 4 + .5));
    const col = Math.floor(x / CELL_W), row = z < -1.85 ? 'B' : z < .45 ? 'F' : z < 2.75 ? 'G' : 'H';
    if (row === 'H' || !cells.has(cellKey(col, row))) continue; // the front lip stays clear
    if (RESERVED.some(rect => inside(x, z, rect, .55))) continue;
    const seed = noise(i, k, 91.7, 47.3, 9123.77), seed2 = noise(i, k, 12.9898, 78.233, 43758.5453);
    const tall = row === 'B';
    if (seed2 > (tall ? .95 : .5)) continue;
    const kind = tall ? (seed < .35 ? 'tree-large' : seed < .6 ? 'tree-small' : seed < .8 ? 'bush' : 'flowers')
      : (seed < .35 ? 'planter' : seed < .6 ? 'bush' : seed < .85 ? 'flowers' : 'bench');
    const name = kind.startsWith('tree') ? 'tree' : kind;
    add(`${name}:${i}:${k}`, kind, x, z, 0, { scale: round(.9 + seed * .3) }, 4, { ry: round(Math.floor(seed2 * 4) * Math.PI / 2) });
  }

  sortModules(modules);

  // ---- people ------------------------------------------------------------------------------------------------
  const roomList = modules.filter(m => m.type.startsWith('room-'));
  const levelRooms = roomList.filter(m => m.levelId || m.opts.example);
  const tiers = [[], [], [], [], []];
  for (const room of roomList) {
    const isProject = !!room.programId && !room.levelId;
    const floors = levelRooms.filter(m => m.levelId === room.levelId).length || 1;
    const share = room.opts.example ? 36 : Math.ceil((room.opts.students || 0) / floors);
    const seats = isProject ? 2 : share >= 30 ? 3 : 2;
    const levelId = room.levelId || null;
    const activity = isProject ? 'project' : 'class';
    if (!isProject) tiers[0].push({ key: room.key + ':teacher', role: 'teacher', levelId, moduleKey: room.key, activity, seat: 0 });
    else if (services.guided) tiers[0].push({ key: room.key + ':facilitator', role: 'facilitator', levelId, moduleKey: room.key, activity, seat: 0 });
    for (let seat = 0; seat < seats; seat++) {
      tiers[seat < 2 ? 2 : 3].push({ key: `${room.key}:seat:${seat}`, role: 'student', levelId, moduleKey: room.key, activity, seat });
    }
  }
  const walkerCount = example ? 2 : normalized.students > 0 ? Math.min(CAMPUS_LIMITS.walkers, Math.ceil(normalized.students / 45)) : 0;
  const yard = has.program('drones') ? 'patio:drones' : 'entrance';
  for (let index = 0; index < walkerCount; index++) {
    tiers[index < 6 ? 1 : 4].push({ key: 'walker:' + index, role: 'student', levelId: normalized.levels.length ? normalized.levels[index % normalized.levels.length] : ['prim', 'pre'][index % 2],
      moduleKey: index % 2 ? yard : 'entrance', activity: index % 2 ? 'patio' : 'walk', seat: index });
  }
  const people = tiers.flat().slice(0, CAMPUS_LIMITS.people).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  // ---- stats and bounds ---------------------------------------------------------------------------------------------
  const pedestals = modules.filter(m => m.type === 'pedestal');
  const roofs = modules.filter(m => m.type === 'roof');
  const x0 = Math.min(...pedestals.map(m => m.x - m.opts.w / 2)), x1 = Math.max(...pedestals.map(m => m.x + m.opts.w / 2));
  const z0 = Math.min(...pedestals.map(m => m.z - m.opts.d / 2)), z1 = Math.max(...pedestals.map(m => m.z + m.opts.d / 2));
  return {
    normalized, modules, services, people,
    stats: { rooms: roomList.length, upperRooms: roomList.filter(m => m.type === 'room-upper').length,
      projectRooms: roomList.filter(m => m.programId).length, modules: modules.length,
      footprint: round(pedestals.reduce((sum, m) => sum + m.opts.w * m.opts.d, 0)), people: people.length },
    bounds: { x0: round(x0), x1: round(x1), z0: round(z0), z1: round(z1), width: round(x1 - x0), depth: round(z1 - z0),
      height: round(Math.max(...roofs.map(m => m.y)) + .4) }
  };
}

export { LEVEL_IDS, PROGRAM_IDS };
