/**
 * Pure campus planner: no DOM, no three.js, no randomness.
 *
 * Every level and program owns a fixed slot, so adding scope never moves what is built:
 *   column:   0     1     2       3     4     5            6
 *   floor 1:  upper upper master  upper upper spike        -
 *   floor 0:  pre   prim  tale    bas   bach  electronics  immersive
 * The order keeps the usual combinations contiguous, so schools stay compact.
 * The entrance sits west of column 0, stairs rise at the front, and drones get a patio.
 * A level gains an upper room at 90 students or 4 sections, as the cotizador's planner does.
 */
import constants from '../../../world/constants.json';
import { LEVEL_IDS } from './normalize.js';

const [BAY_W, BAY_D] = constants.bay;
const FLOOR = constants.floor;
const LEVEL_COLUMN = { pre: 0, prim: 1, bas: 3, bach: 4 };
const PROJECT_SLOT = { tale: [2, 0], master: [2, 1], electronics: [5, 0], spike: [5, 1], immersive: [6, 0] };
const UPPER_STUDENTS = 90, UPPER_SECTIONS = 4;
const ENTRANCE_W = 3.2;
const BALCONY_D = 1.4;
const STAIR_X = BAY_W / 2;
const STAIR_LENGTH = 4.48;
const FOOTPRINT = [BAY_W, BAY_D];

const columnX = column => column * BAY_W;
const population = count => Math.min(4, Math.max(1, Math.ceil(count / 30)));
const needsUpper = (data, level) => (data.counts[level] || 0) >= UPPER_STUDENTS || (data.sections[level] || 0) >= UPPER_SECTIONS;

export function planWorld(data) {
  const modules = [];
  const add = (key, type, asset, column, floor, z = 0, extra = {}) => {
    const module = { key, type, asset, column, floor, x: columnX(column), y: floor * FLOOR, z, rot: 0, ...extra };
    modules.push(module);
    return module;
  };
  const taken = new Map(); // "column:floor" -> module
  const building = (key, type, asset, column, floor, extra) => {
    const module = add(key, type, asset, column, floor, 0, { footprint: FOOTPRINT, ...extra });
    taken.set(`${column}:${floor}`, module);
  };

  const levels = data.levels.length ? data.levels : ['pre'];
  for (const level of levels) {
    const count = data.counts[level] || 0;
    building(`room:${level}:0`, 'room', 'arch-classroom-standard', LEVEL_COLUMN[level], 0, { levelId: level, population: population(count), example: !data.levels.length });
    if (needsUpper(data, level)) building(`upper:${level}:0`, 'room', 'arch-classroom-upper', LEVEL_COLUMN[level], 1, { levelId: level, population: population(count / 2) });
  }
  for (const program of data.programs) {
    if (program === 'drones') {
      add('patio:drones', 'patio', 'arch-courtyard', 1.5, 0, BAY_D / 2 + 4.6, { programId: program });
      continue;
    }
    const [column, floor] = PROJECT_SLOT[program];
    building(`project:${program}`, 'room', program === 'immersive' ? 'arch-classroom-corner' : 'arch-classroom-expandable', column, floor, { programId: program, population: 2 });
  }

  const lastColumn = Math.max(...[...taken.values()].map(m => m.column));
  for (const [column, floor] of [...taken.values()].filter(m => m.floor === 1).map(m => [m.column, 1])) {
    if (!taken.has(`${column}:0`)) building(`support:${column}`, 'support', 'arch-support', column, 0);
  }
  for (let column = 0; column < lastColumn; column += 1) {
    if (!taken.has(`${column}:0`)) building(`corridor:${column}`, 'corridor', 'arch-corridor', column, 0);
  }
  const east = taken.get(`${lastColumn}:0`);
  if (east?.asset === 'arch-classroom-standard') east.asset = 'arch-classroom-end';
  for (const module of taken.values()) {
    const above = taken.has(`${module.column}:${module.floor + 1}`);
    if (!above) add(`roof:${module.column}:${module.floor + 1}`, 'roof', 'arch-roof', module.column, module.floor + 1);
  }
  const uppers = [...taken.values()].filter(m => m.floor === 1).map(m => m.column);
  if (uppers.length) {
    const reach = Math.max(1, ...uppers);
    for (let column = 0; column <= reach; column += 1) {
      const served = taken.has(`${column}:1`);
      add(`${served ? 'balcony' : 'bridge'}:${column}`, 'balcony', served ? 'arch-balcony' : 'arch-bridge', column, 1, BAY_D / 2 + BALCONY_D / 2);
    }
    add('stairs:front', 'stairs', 'arch-stairs', .5, 0, BAY_D / 2 + BALCONY_D + STAIR_LENGTH);
  }

  modules.push({ key: 'entrance', type: 'entrance', asset: 'arch-entrance', column: -1, floor: 0, x: -(BAY_W + ENTRANCE_W) / 2, y: 0, z: 0, rot: 0, footprint: [ENTRANCE_W, BAY_D] });
  const rooms = modules.filter(m => m.type === 'room').length;
  const front = BAY_D / 2 + 2.6;
  for (let column = 0; column <= lastColumn; column += 1) add(`pathway:${column}`, 'pathway', 'arch-pathway', column, 0, front);
  for (let column = 0; column <= lastColumn; column += 1) add(`garden:${column}`, 'garden', 'arch-terrain-tile', column, 0, -BAY_D - .1);
  if (rooms >= 3) {
    add('tree:front:0', 'tree', 'veg-tree-large', -1.3, 0, front + 2.2);
    add(`tree:front:east:${lastColumn}`, 'tree', 'veg-tree-large-alt', lastColumn + .3, 0, front + 2.2);
  }
  for (let i = 0; i < Math.min(lastColumn + 2, 1 + rooms); i += 1) add(`tree:${i}`, 'tree', i % 2 ? 'veg-tree-large-alt' : 'veg-tree-large', i - .5, 0, -BAY_D / 2 - 2.4, { seedScale: .75 + (i % 3) * .15 });
  for (let i = 0; i <= lastColumn; i += 1) if (rooms >= 2) add(`planter:${i}`, 'planter', 'arch-planter', i + .22, 0, BAY_D / 2 + .7, uppers.includes(i) ? { hidden: true } : {});

  const west = -BAY_W / 2 - ENTRANCE_W - 3;
  const eastEdge = columnX(lastColumn) + BAY_W / 2 + 3;
  const depthFront = BAY_D / 2 + (data.programs.includes('drones') ? 10 : uppers.length ? 9 : 6);
  const depthBack = -BAY_D - 3.4;
  const island = { x: (west + eastEdge) / 2, z: (depthFront + depthBack) / 2, width: eastEdge - west, depth: depthFront - depthBack, height: 1.3 };
  const walk = { x0: west + 3, x1: eastEdge - 3, z: front };
  return { modules: modules.filter(m => !m.hidden), island, walk, levels: LEVEL_IDS.filter(id => levels.includes(id)) };
}
