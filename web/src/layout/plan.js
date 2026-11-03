/**
 * Pure campus planner: no DOM, no three.js, no randomness.
 *
 * Every level and program owns a fixed slot, so adding scope never moves what is built.
 * Columns step back half a bay at a time, forming a V around a courtyard open to the camera:
 *   column:   0     1      2         3            4
 *   floor 2:  -     spike  immersive electronics  -
 *   floor 1:  upper upper  master    upper        upper
 *   floor 0:  pre   prim   tale      bas          bach
 *   row:      0     1      2         1            0
 * Stairs climb to a floor-1 walkway along the fronts, and a second flight reaches floor 2.
 * A level gains an upper room at 90 students or 4 sections, as the cotizador's planner does.
 */
import { levelPrograms, tablePrograms } from './classroom-programs.js';
import constants from '../../../world/constants.json';
import { applyNeighbours } from './neighbours.js';
import { LEVEL_IDS } from './normalize.js';

const [BAY_W, BAY_D] = constants.bay;
const FLOOR = constants.floor;
const ROWS = [0, 1, 2, 1, 0];
const ROW_STEP = 2.5;
const LEVEL_COLUMN = { pre: 0, prim: 1, bas: 3, bach: 4 };
const PROJECT_SLOT = { tale: [2, 0], master: [2, 1], spike: [1, 2], immersive: [2, 2], electronics: [3, 2] };
const UPPER_STUDENTS = 90, UPPER_SECTIONS = 4;
const ENTRANCE_W = 3.2;
const BALCONY_D = 1.4;
const STAIR_LENGTH = 4.48;
const LANDING = [1.4, 1];
const FOOTPRINT = [BAY_W, BAY_D];

const columnX = column => column * BAY_W;
const rowZ = column => 0 - ROWS[Math.min(column, ROWS.length - 1)] * ROW_STEP;
const balconyZ = column => rowZ(column) + BAY_D / 2 + BALCONY_D / 2;
const population = count => Math.min(4, Math.max(1, Math.ceil(count / 30)));
const needsUpper = (data, level) => (data.counts[level] || 0) >= UPPER_STUDENTS || (data.sections[level] || 0) >= UPPER_SECTIONS;

export function planWorld(data) {
  const modules = [];
  const programsOf = levelPrograms(data);
  const add = (key, type, asset, column, floor, z = rowZ(column), extra = {}) => {
    const module = { key, type, asset, column, floor, x: columnX(column), y: floor * FLOOR, z, rot: 0, ...extra };
    modules.push(module);
    return module;
  };
  const taken = new Map(); // "column:floor" -> module
  const building = (key, type, asset, column, floor, extra) => {
    const module = add(key, type, asset, column, floor, rowZ(column), { footprint: FOOTPRINT, ...extra });
    taken.set(`${column}:${floor}`, module);
  };

  const levels = data.levels.length ? data.levels : ['pre'];
  for (const level of levels) {
    const count = data.counts[level] || 0;
    building(`room:${level}:0`, 'room', 'arch-classroom-standard', LEVEL_COLUMN[level], 0, { levelId: level, population: population(count), example: !data.levels.length, programs: tablePrograms(programsOf[level] || [], false) });
    if (needsUpper(data, level)) building(`upper:${level}:0`, 'room', 'arch-classroom-upper', LEVEL_COLUMN[level], 1, { levelId: level, population: population(count / 2), programs: tablePrograms(programsOf[level] || [], true) });
  }
  for (const program of data.programs) {
    if (program === 'drones') {
      add('patio:drones', 'patio', 'arch-courtyard', 2, 0, 4.4, { programId: program });
      continue;
    }
    const [column, floor] = PROJECT_SLOT[program];
    building(`project:${program}`, 'room', program === 'immersive' ? 'arch-classroom-corner' : 'arch-classroom-expandable', column, floor, { programId: program, population: { immersive: 3, master: 3, electronics: 4 }[program] ?? 2 });
  }

  for (const module of [...taken.values()]) {
    for (let floor = module.floor - 1; floor >= 0; floor -= 1) {
      if (!taken.has(`${module.column}:${floor}`)) building(`support:${module.column}:${floor}`, 'support', 'arch-support', module.column, floor);
    }
  }
  const lastColumn = Math.max(...[...taken.values()].map(m => m.column));
  for (let column = 0; column < lastColumn; column += 1) {
    if (!taken.has(`${column}:0`)) building(`corridor:${column}`, 'corridor', 'arch-corridor', column, 0);
  }
  const east = taken.get(`${lastColumn}:0`);
  if (east?.asset === 'arch-classroom-standard') east.asset = 'arch-classroom-end';
  for (const module of taken.values()) {
    if (!taken.has(`${module.column}:${module.floor + 1}`)) add(`roof:${module.column}:${module.floor + 1}`, 'roof', 'arch-roof', module.column, module.floor + 1);
  }

  const reachOf = floor => Math.max(-1, ...[...taken.values()].filter(m => m.floor === floor && m.type === 'room').map(m => m.column));
  const walkway = (from, to, floor) => {
    for (let column = from; column <= to; column += 1) {
      const served = taken.get(`${column}:${floor}`)?.type === 'room';
      // A floor-2 balcony hangs from its room; every other span keeps posts on the walkway below.
      add(`${served ? 'balcony' : 'bridge'}:${column}:${floor}`, 'balcony', served ? 'arch-balcony' : 'arch-bridge', column, floor, balconyZ(column), floor >= 2 && served ? { hanging: true } : {});
      if (column < to) gallery(column, floor);
    }
  };
  // Links run in front of the column set further back, so they never cut through a room.
  const gallery = (column, floor) => {
    if (ROWS[column] === ROWS[column + 1]) return;
    const edge = columnX(column) + BAY_W / 2;
    const x = ROWS[column + 1] > ROWS[column] ? edge + BALCONY_D / 2 : edge - BALCONY_D / 2;
    add(`gallery:${column}:${floor}`, 'gallery', 'arch-gallery', x / BAY_W, floor, (balconyZ(column) + balconyZ(column + 1)) / 2);
  };
  const reachUpper = Math.max(reachOf(1), reachOf(2));
  if (reachUpper >= 0) {
    walkway(0, Math.max(1, reachUpper), 1);
    add('stairs:front', 'stairs', 'arch-stairs', .5, 0, balconyZ(0) + BALCONY_D / 2 + STAIR_LENGTH);
  }
  if (reachOf(2) >= 0) {
    walkway(1, reachOf(2), 2);
    gallery(0, 2);
    // The flight runs east just in front of the floor-1 walkway, from a landing at the walkway's open west end
    // up to its own platform beside the floor-2 gallery, so the walkway stays clear.
    const walkFront = balconyZ(0) + BALCONY_D / 2;
    add('landing:upper', 'landing', 'arch-stair-landing', (-BAY_W / 2 + LANDING[0] / 2) / BAY_W, 1, walkFront + LANDING[1] / 2, { size: LANDING });
    add('stairs:upper', 'stairs', 'arch-stairs-upper', (-BAY_W / 2 + LANDING[0]) / BAY_W, 1, walkFront + .45, { rot: -Math.PI / 2 });
  }
  const walkwayColumns = new Set(modules.filter(m => m.type === 'balcony').map(m => m.column));

  modules.push({ key: 'entrance', type: 'entrance', asset: 'arch-entrance', column: -1, floor: 0, x: -(BAY_W + ENTRANCE_W) / 2, y: 0, z: 0, rot: 0, footprint: [ENTRANCE_W, BAY_D] });
  const rooms = modules.filter(m => m.type === 'room').length;
  const far = reachUpper >= 0 || data.programs.includes('drones') ? 1 : 0;
  const front = far ? 9.2 : BAY_D / 2 + 2.6;
  for (let column = 0; column <= lastColumn; column += 1) add(`pathway:${column}:${far}`, 'pathway', 'arch-pathway', column, 0, front);
  for (let column = 0; column <= lastColumn; column += 1) add(`garden:${column}`, 'garden', 'arch-terrain-tile', column, 0, rowZ(column) - BAY_D - .1);
  if (rooms >= 3) {
    add(`tree:front:0:${far}`, 'tree', 'veg-tree-large', -1.3, 0, front + 2);
    add(`tree:front:east:${lastColumn}:${far}`, 'tree', 'veg-tree-large-alt', lastColumn + .3, 0, front + 2);
  }
  for (let i = 0; i < Math.min(lastColumn + 2, 1 + rooms); i += 1) add(`tree:${i}`, 'tree', i % 2 ? 'veg-tree-large-alt' : 'veg-tree-large', i - .5, 0, rowZ(Math.max(0, i)) - BAY_D / 2 - 2.4, { seedScale: .75 + (i % 3) * .15 });
  for (let i = 0; i <= lastColumn; i += 1) if (rooms >= 2) add(`planter:${i}`, 'planter', 'arch-planter', i + .22, 0, balconyZ(i), walkwayColumns.has(i) ? { hidden: true } : {});

  const west = -BAY_W / 2 - ENTRANCE_W - 3;
  const eastEdge = columnX(lastColumn) + BAY_W / 2 + 3;
  const deepest = Math.max(...[...taken.values()].map(m => ROWS[m.column]));
  const depthFront = front + 4;
  const depthBack = -deepest * ROW_STEP - BAY_D - 3.4;
  const island = { x: (west + eastEdge) / 2, z: (depthFront + depthBack) / 2, width: eastEdge - west, depth: depthFront - depthBack, height: 1.3 };
  const walk = { x0: west + 3, x1: eastEdge - 3, z: front };
  return { modules: applyNeighbours(modules.filter(m => !m.hidden), { bayDepth: BAY_D, floor: FLOOR }), island, walk, levels: LEVEL_IDS.filter(id => levels.includes(id)) };
}
