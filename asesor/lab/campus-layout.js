/**
 * Pure, bounded campus grammar. Numbers are illustrative visual density, never
 * a promise of classroom capacity. The quotation remains the source of truth.
 *
 * Plan (Y up, +Z faces the default camera):
 *   back row  — one classroom sector per educational level, up to two floors;
 *   walkway   — turquoise circulation that links every occupied sector;
 *   mid row   — one open workshop per robotics/electronics technology;
 *   front row — drone flight field, immersive pavilion and the entrance.
 * Every level and technology owns a fixed slot, so adding an option never
 * moves what is already built. The island grows tile by tile around them.
 */
export const LEVEL_IDS = Object.freeze(['pre', 'prim', 'bas', 'bach']);
export const PROGRAM_IDS = Object.freeze(['tale', 'master', 'spike', 'electronics', 'drones', 'immersive']);
export const LEVEL_NAMES = Object.freeze({ pre: 'Preprimaria', prim: 'Primaria', bas: 'Básico', bach: 'Bachillerato' });
export const PROGRAM_NAMES = Object.freeze({ tale: 'Tale-Bot', master: 'Robot Master', spike: 'SPIKE Prime', electronics: 'Electrónica', drones: 'Drones', immersive: 'Realidad virtual' });
// Catalog compatibility, used only to colour participants when no groups are chosen yet.
export const PROGRAM_LEVELS = Object.freeze({ tale: ['pre'], master: ['prim'], spike: ['prim', 'bas', 'bach'], electronics: ['prim', 'bas', 'bach'], drones: ['prim', 'bas', 'bach'], immersive: ['bas', 'bach'] });
export const CAMPUS_LIMITS = Object.freeze({ rooms: 8, roomsPerLevel: 2, workshopFloors: 1, people: 40, seatsPerRoom: 3, walkers: 8, shelf: 8, students: 100000, units: 10000 });
export const CELL = 2.6;
export const FLOOR_HEIGHT = 1.7;
export const TILE = 1.3;
export const COLUMN_X = Object.freeze([-3.9, -1.3, 1.3, 3.9]);
export const ROW_Z = Object.freeze({ back: -2.85, walk: -1.18, mid: .45, front: 3.3 });
export const ROOM = Object.freeze({ w: CELL, d: 2.3 });
const LEVEL_COLUMN = { pre: 0, prim: 1, bas: 2, bach: 3 };
const UPPER_STUDENTS = 90, UPPER_SECTIONS = 4;
export const WORKSHOP_SLOTS = Object.freeze({
  tale: { x: -3.9, z: ROW_Z.mid, w: 2.2, d: 2.2, row: 'mid', column: 0 },
  master: { x: -1.3, z: ROW_Z.mid, w: 2.2, d: 2.2, row: 'mid', column: 1 },
  spike: { x: 1.3, z: ROW_Z.mid, w: 2.2, d: 2.2, row: 'mid', column: 2 },
  electronics: { x: 3.9, z: ROW_Z.mid, w: 2.2, d: 2.2, row: 'mid', column: 3 },
  drones: { x: -2.75, z: ROW_Z.front, w: 4.5, d: 2.3, row: 'front', column: .5 },
  immersive: { x: 2.65, z: ROW_Z.front, w: 3.1, d: 2.3, row: 'front', column: 2.5 }
});

const finite = (value, max) => Math.min(max, Math.max(0, Math.round(Number(value) || 0)));
const list = value => Array.isArray(value) ? value : [];
const canonical = (value, allowed) => allowed.filter(id => list(value).includes(id));
const sharingModes = ['separate', 'simultaneous', 'unknown'];
const text = (value, length = 120) => typeof value === 'string' ? value.slice(0, length) : '';
const ids = value => [...new Set(list(value).filter(id => typeof id === 'string' && id.length).map(id => text(id)))].sort();
const measured = (value, max = CAMPUS_LIMITS.students) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : finite(value, max);
const round = value => Math.round(value * 1000) / 1000;

export function normalizeCampusData(input = {}) {
  if (!input || typeof input !== 'object') input = {};
  const levels = canonical(input.levels, LEVEL_IDS);
  const programs = canonical(input.programs, PROGRAM_IDS);
  const rows = list(input.enrollment).filter(row => row && levels.includes(row.levelId)).map(row => ({
    id: text(row.id), levelId: row.levelId, gradeId: text(row.gradeId),
    label: text(row.label), sectionName: text(row.sectionName, 40), students: measured(row.students)
  }));
  const counts = Object.fromEntries(levels.map(id => [id, 0]));
  for (const row of rows) counts[row.levelId] = Math.min(CAMPUS_LIMITS.students, counts[row.levelId] + finite(row.students, CAMPUS_LIMITS.students));
  const requestedStudents = finite(input.students, CAMPUS_LIMITS.students);
  // Explicit enrollment (including zero) wins over a potentially stale total.
  if (!rows.length && levels.length) {
    levels.forEach((id, index) => { counts[id] = Math.floor(requestedStudents / levels.length) + (index < requestedStudents % levels.length ? 1 : 0); });
  }
  // Sections with registered or still unconfirmed students; confirmed zero is empty.
  const sections = Object.fromEntries(levels.map(id => [id, rows.filter(row => row.levelId === id && (row.students == null || row.students > 0)).length]));
  const equipment = Object.fromEntries(programs.map(id => [id, { units: 0, stations: false, sharingModes: [], plans: [], flexBimestres: [], groupIds: [], simIds: [], entries: [] }]));
  for (const [index, row] of list(input.equipment).entries()) {
    if (!row || !programs.includes(row.programId)) continue;
    const entry = equipment[row.programId];
    const groupIds = ids(row.groupIds);
    const selection = {
      id: text(row.id) || `${row.programId}:${index}`, programId: row.programId,
      units: finite(row.units, CAMPUS_LIMITS.units), stations: row.stations === true || (typeof row.stations === 'number' && row.stations > 0),
      sharing: sharingModes.includes(row.sharing) ? row.sharing : null,
      plan: text(row.plan, 80), flexBimestres: row.flexBimestres == null ? null : Math.max(1, finite(row.flexBimestres, 4)),
      groupIds, simIds: ids(row.simIds).filter(id => groupIds.includes(id)),
      // Values below belong to the quotation engine; never infer coverage here.
      participants: measured(row.participants), capacity: measured(row.capacity),
      rotations: list(row.rotations).filter(rotation => rotation && typeof rotation === 'object').map(rotation => ({
        id: text(rotation.id), label: text(rotation.label), students: measured(rotation.students), rotations: measured(rotation.rotations)
      }))
    };
    entry.entries.push(selection);
    entry.units = Math.min(CAMPUS_LIMITS.units, entry.units + selection.units);
    entry.stations ||= selection.stations;
    if (selection.sharing) entry.sharingModes.push(selection.sharing);
    if (selection.plan) entry.plans.push(selection.plan);
    if (selection.flexBimestres != null) entry.flexBimestres.push(selection.flexBimestres);
    entry.groupIds.push(...selection.groupIds); entry.simIds.push(...selection.simIds);
  }
  Object.values(equipment).forEach(entry => {
    entry.sharingModes = canonical(entry.sharingModes, sharingModes);
    entry.plans = ids(entry.plans); entry.groupIds = ids(entry.groupIds); entry.simIds = ids(entry.simIds);
    entry.flexBimestres = [...new Set(entry.flexBimestres)].sort((a, b) => a - b);
    entry.entries.sort((a, b) => a.id.localeCompare(b.id));
  });
  const active = input.activeConfig && typeof input.activeConfig === 'object' ? input.activeConfig : null;
  const focusLevel = input.focusedLevel ?? input.focusLevel;
  const focusProgram = input.focusedProgram ?? input.focusProgram;
  return { levels, programs, counts, sections, enrollment: rows, equipment,
    students: Object.values(counts).reduce((sum, count) => sum + count, 0),
    focusLevel: levels.includes(focusLevel) ? focusLevel : null,
    focusProgram: programs.includes(focusProgram) ? focusProgram : null,
    activeConfig: active ? { kind: text(active.kind, 40), programId: programs.includes(active.programId) ? active.programId : null,
      levelId: levels.includes(active.levelId) ? active.levelId : null, entryId: text(active.entryId) || null } : null };
}

const slotKey = (x, z, floor) => `${x}:${z}:${floor}`;
/** Public adjacency helper: no walls on internal faces, no roof under a room. */
export function getAdjacency(tiles) {
  const occupied = new Set(tiles.map(tile => slotKey(tile.gx, tile.gz, tile.floor)));
  return tiles.map(tile => ({ ...tile, edges: {
    north: !occupied.has(slotKey(tile.gx, tile.gz - 1, tile.floor)),
    east: !occupied.has(slotKey(tile.gx + 1, tile.gz, tile.floor)),
    south: !occupied.has(slotKey(tile.gx, tile.gz + 1, tile.floor)),
    west: !occupied.has(slotKey(tile.gx - 1, tile.gz, tile.floor)),
    roof: !occupied.has(slotKey(tile.gx, tile.gz, tile.floor + 1)),
    below: tile.floor > 0 && occupied.has(slotKey(tile.gx, tile.gz, tile.floor - 1))
  } }));
}

function roomTiles(normalized) {
  const tiles = [];
  if (!normalized.levels.length) {
    // Storyboard frame 1: a single illustrative classroom before any choice.
    tiles.push({ key: 'room:0:0', kind: 'room', levelId: null, gx: 0, gz: 0, floor: 0, example: true, students: 0, sections: 0 });
  }
  for (const levelId of normalized.levels) {
    const column = LEVEL_COLUMN[levelId], students = normalized.counts[levelId], sections = normalized.sections[levelId];
    tiles.push({ key: `room:${column}:0`, kind: 'room', levelId, gx: column, gz: 0, floor: 0, example: false, students, sections });
    if (students >= UPPER_STUDENTS || sections >= UPPER_SECTIONS) tiles.push({ key: `room:${column}:1`, kind: 'room', levelId, gx: column, gz: 0, floor: 1, example: false, students, sections });
  }
  return tiles;
}

const inside = (x, z, rect, pad = 0) => x >= rect.x0 - pad && x <= rect.x1 + pad && z >= rect.z0 - pad && z <= rect.z1 + pad;
const rectOf = (x, z, w, d) => ({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
const noise = (a, b, k1, k2, k3) => Math.abs(Math.sin(a * k1 + b * k2) * k3) % 1;

export function deriveCampus(input = {}) {
  const normalized = normalizeCampusData(input);
  const raw = roomTiles(normalized);
  const rooms = getAdjacency(raw).map(tile => {
    const floors = raw.filter(other => other.gx === tile.gx).length;
    const share = tile.example ? 0 : Math.ceil(tile.students / floors);
    const seats = tile.floor > 0 ? CAMPUS_LIMITS.seatsPerRoom - 1 : CAMPUS_LIMITS.seatsPerRoom;
    const seated = tile.example ? 3 : share > 0 ? Math.min(seats, Math.ceil(share / 12)) : 0;
    return { ...tile, column: tile.gx, x: COLUMN_X[tile.gx], z: ROW_Z.back, y: tile.floor * FLOOR_HEIGHT, seated,
      teacher: tile.example || !!tile.levelId, pennants: Math.min(6, tile.sections),
      focused: !!tile.levelId && (normalized.focusLevel === tile.levelId || normalized.activeConfig?.levelId === tile.levelId) };
  });
  const columns = [...new Set(rooms.map(room => room.column))].sort((a, b) => a - b);

  const workshops = normalized.programs.map(programId => {
    const slot = WORKSHOP_SLOTS[programId], equipment = normalized.equipment[programId];
    const groupLevels = [...new Set(equipment.groupIds.map(id => normalized.enrollment.find(row => row.id === id)?.levelId).filter(Boolean))];
    const fallback = PROGRAM_LEVELS[programId].filter(id => normalized.levels.includes(id));
    const participantLevels = canonical(groupLevels.length ? groupLevels : fallback.length ? fallback : PROGRAM_LEVELS[programId].slice(0, 1), LEVEL_IDS);
    const simultaneous = equipment.sharingModes.includes('simultaneous');
    return { key: 'workshop:' + programId, kind: 'workshop', programId, ...slot, y: 0,
      density: Math.min(3, Math.max(1, Math.ceil(equipment.units / 4))),
      // Concurrent groups run a second set; storage boxes represent the kit inventory.
      sets: simultaneous && equipment.units > 1 ? 2 : 1,
      shelf: equipment.units > 0 ? Math.min(CAMPUS_LIMITS.shelf, Math.ceil(equipment.units / 3)) : 0,
      stations: equipment.stations, units: equipment.units, sharingModes: equipment.sharingModes, plans: equipment.plans,
      flexBimestres: equipment.flexBimestres, groupIds: equipment.groupIds, simIds: equipment.simIds, entries: equipment.entries,
      participantLevels, groupCount: Math.min(3, equipment.groupIds.length),
      // Per-entry values stay separate when several levels share a program.
      participants: equipment.entries.length === 1 ? equipment.entries[0].participants : null,
      capacity: equipment.entries.length === 1 ? equipment.entries[0].capacity : null,
      rotations: equipment.entries.length === 1 ? equipment.entries[0].rotations : [],
      focused: normalized.focusProgram === programId || normalized.activeConfig?.programId === programId,
      activeConfig: normalized.activeConfig?.programId === programId ? normalized.activeConfig : null };
  });

  // Footprints decide the island; the walkway joins every occupied sector.
  const midColumns = workshops.filter(w => w.row === 'mid').map(w => w.column);
  const allColumns = [...new Set([...columns, ...midColumns])].sort((a, b) => a - b);
  const front = workshops.some(w => w.row === 'front');
  const footprints = [];
  rooms.filter(room => room.floor === 0).forEach(room => footprints.push({ ...rectOf(room.x, room.z, ROOM.w, ROOM.d), kind: 'room' }));
  workshops.forEach(w => footprints.push({ ...rectOf(w.x, w.z, w.w, w.d), kind: 'workshop' }));
  const minColumn = Math.min(...allColumns), maxColumn = Math.max(...allColumns);
  const walk = { x0: COLUMN_X[minColumn] - CELL / 2, x1: COLUMN_X[maxColumn] + CELL / 2, z0: ROW_Z.walk - .42, z1: ROW_Z.walk + .42 };
  // The yard in front of each sector keeps room for arriving students.
  allColumns.forEach(column => footprints.push({ ...rectOf(COLUMN_X[column], ROW_Z.mid, CELL, 2.2), kind: 'yard' }));
  const gaps = [-5.2, -2.6, 0, 2.6, 5.2];
  const middle = (COLUMN_X[minColumn] + COLUMN_X[maxColumn]) / 2;
  // Nearest gap between sectors; ties lean toward the island centre.
  const pathX = front ? 0 : gaps.reduce((best, gap) => Math.abs(gap - middle) + Math.abs(gap) * .01 < Math.abs(best - middle) + Math.abs(best) * .01 ? gap : best, gaps[0]);
  let frontEdge = Math.max(...footprints.map(rect => rect.z1)) + .45;
  if (front) frontEdge = Math.max(frontEdge, ROW_Z.front + 1.6);
  const pathRect = { x0: pathX - .2, x1: pathX + .2, z0: walk.z1, z1: frontEdge };
  const upperRooms = rooms.filter(room => room.floor === 1);
  const structures = [];
  if (upperRooms.length) {
    const upperColumns = upperRooms.map(room => room.column).sort((a, b) => a - b);
    // Stairs sit at the camera-facing (west) end; the balcony runs to the last upper room.
    const first = Math.min(...columns), to = upperColumns[upperColumns.length - 1];
    const stairsX = round(COLUMN_X[first] - CELL / 2 - .42);
    structures.push({ key: 'circulation', kind: 'circulation', x: 0, y: FLOOR_HEIGHT, z: ROW_Z.back,
      from: round(COLUMN_X[first] - CELL / 2), to: round(COLUMN_X[to] + CELL / 2), stairsX, uppers: upperColumns });
    footprints.push({ ...rectOf(stairsX, ROW_Z.back + .2, .9, 2.3), kind: 'stairs' });
  }
  const occupied = [...footprints, walk, pathRect];
  const xs = occupied.flatMap(rect => [rect.x0, rect.x1]), zs = occupied.flatMap(rect => [rect.z0, rect.z1]);
  const totalUnits = Object.values(normalized.equipment).reduce((sum, entry) => sum + entry.units, 0);
  const richness = Math.min(3, (normalized.students > 0 ? 1 : 0) + (normalized.programs.length > 0 ? 1 : 0) + (normalized.programs.length > 2 || normalized.levels.length > 2 ? 1 : 0));
  // A richer campus earns a planted margin at the back and sides (never in front).
  const margin = richness >= 2 ? 1.25 : .7;
  const extent = { x0: Math.min(...xs) - margin, x1: Math.max(...xs) + margin, z0: Math.min(...zs) - margin, z1: frontEdge + .2 };

  // Faceted island tiles: dilated footprints plus a hashed, organic coastline.
  const islandTiles = [];
  for (let i = -6; i <= 5; i++) for (let k = -5; k <= 4; k++) {
    const x = round((i + .5) * TILE), z = round((k + .5) * TILE);
    if (occupied.some(rect => inside(x, z, rect, .78)) || inside(x, z, extent, -.15)) islandTiles.push({ i, k, x, z });
  }
  const tileSet = new Set(islandTiles.map(tile => tile.i + ':' + tile.k));
  for (const tile of [...islandTiles]) {
    for (const [di, dk] of [[1, 0], [-1, 0], [0, -1]]) {
      const i = tile.i + di, k = tile.k + dk, key = i + ':' + k;
      if (tileSet.has(key) || i < -6 || i > 5 || k < -5 || k > 4) continue;
      if (noise(i, k, 12.9898, 78.233, 43758.5453) < .16) { tileSet.add(key); islandTiles.push({ i, k, x: round((i + .5) * TILE), z: round((k + .5) * TILE) }); }
    }
  }
  islandTiles.sort((a, b) => a.i - b.i || a.k - b.k);

  const blocked = [...footprints, walk, pathRect];
  const vegetation = [];
  for (const tile of islandTiles) {
    if (blocked.some(rect => inside(tile.x, tile.z, rect, .32))) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dk]) => !tileSet.has((tile.i + di) + ':' + (tile.k + dk)));
    const seed = noise(tile.i, tile.k, 91.7, 47.3, 9123.77);
    const chance = edge ? [.55, .7, .82, .9][richness] : [.25, .4, .55, .7][richness];
    if (seed > chance) continue;
    let type = edge ? (seed < .2 ? 'pine' : seed < .42 && richness > 1 ? 'bloom' : 'round') : (seed < .25 || richness < 1 ? 'bush' : 'flowers');
    // Tall trees frame the campus from the sides and back; near activities and
    // along the camera-facing edge only low planting keeps sight lines open.
    const nearActivity = footprints.some(rect => rect.kind !== 'room' && inside(tile.x, tile.z, rect, .75));
    if ((type === 'round' || type === 'bloom' || type === 'pine') && (nearActivity || tile.z > frontEdge - 1.6)) type = seed < .5 ? 'bush' : 'flowers';
    vegetation.push({ key: `veg:${tile.i}:${tile.k}`, type, x: round(tile.x + (seed - .5) * .35), z: round(tile.z + (seed * 7 % 1 - .5) * .35), scale: round(.85 + seed * .35) });
  }

  // Community: classroom occupants sit in their rooms; walkers arrive from
  // the entrance toward real destinations along the circulation.
  const occupants = rooms.reduce((sum, room) => sum + room.seated + (room.teacher ? 1 : 0), 0);
  const walkerCount = !normalized.levels.length ? 2 : normalized.students > 0 ? Math.min(CAMPUS_LIMITS.walkers, Math.ceil(normalized.students / 45)) : 0;
  const walkers = Array.from({ length: Math.min(walkerCount, Math.max(0, CAMPUS_LIMITS.people - occupants)) }, (_, index) => ({
    key: 'walker:' + index, index, level: normalized.levels.length ? normalized.levels[index % normalized.levels.length] : ['prim', 'pre'][index % 2]
  }));
  const people = [
    ...rooms.flatMap(room => [
      ...(room.teacher ? [{ key: room.key + ':teacher', role: 'teacher', roomKey: room.key, levelId: room.levelId }] : []),
      ...Array.from({ length: room.seated }, (_, seat) => ({ key: room.key + ':seat:' + seat, role: 'student', roomKey: room.key, levelId: room.levelId, seated: true }))
    ]),
    ...walkers.map(walker => ({ key: walker.key, role: 'student', levelId: walker.level, seated: false }))
  ];
  const destinations = [
    ...rooms.filter(room => room.floor === 0).map(room => [round(room.x + .62), round(room.z + ROOM.d / 2 - .25)]),
    ...workshops.filter(w => w.row === 'mid').map(w => [round(w.x - .78), round(w.z - w.d / 2 + .2)])
  ];
  const environment = { key: 'environment', kind: 'environment', x: 0, y: 0, z: 0, richness, tiles: islandTiles.map(({ i, k, x, z }) => [i, k, x, z]),
    vegetation, walk: [round(walk.x0), round(walk.x1)], path: { x: pathX, z1: round(frontEdge) }, columns: allColumns,
    gate: { x: pathX, z: round(frontEdge - .35) } };
  const population = { key: 'population', kind: 'population', x: 0, y: 0, z: 0, walkers,
    route: { gate: [pathX, round(frontEdge - .7)], walkZ: ROW_Z.walk, pathX }, destinations };

  const bounds = { width: round(extent.x1 - extent.x0), depth: round(extent.z1 - extent.z0), centerX: round((extent.x0 + extent.x1) / 2),
    centerZ: round((extent.z0 + extent.z1) / 2), height: upperRooms.length ? 3.9 : 2.2, x0: round(extent.x0), x1: round(extent.x1), z0: round(extent.z0), z1: round(extent.z1) };
  return {
    normalized, tiles: rooms, workshops, people,
    entities: [...rooms, ...workshops, ...structures, environment, population],
    stats: { levels: normalized.levels.length, programs: normalized.programs.length, students: normalized.students, rooms: rooms.length,
      workshops: workshops.length, people: people.length, walkers: walkers.length, equipmentUnits: totalUnits, islandTiles: islandTiles.length, vegetation: vegetation.length },
    bounds
  };
}
