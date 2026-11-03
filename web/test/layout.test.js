import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/normalize.json';
import { LEVEL_IDS, PROGRAM_IDS, normalizeWorldInput } from '../src/layout/normalize.js';
import { planWorld } from '../src/layout/plan.js';

const plan = input => planWorld(normalizeWorldInput(input));
const keys = result => result.modules.map(m => m.key);
const byKey = result => new Map(result.modules.map(m => [m.key, m]));
const scope = (levels, programs = [], students = 30) => ({ levels, programs, students: students * levels.length });
const stackedInput = { levels: ['pre', 'prim'], enrollment: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, levelId: 'prim', students: 24 })) };
const stacked = plan(stackedInput);
const ROWS = [0, 1, 2, 1, 0];

describe('normalizeWorldInput', () => {
  it('matches the cotizador on every recorded input', () => {
    for (const { input, output } of fixtures) expect(normalizeWorldInput(input)).toEqual(output);
  });
});

describe('planWorld', () => {
  it('is deterministic', () => {
    expect(plan(scope(['pre', 'bas'], ['spike']))).toEqual(plan(scope(['pre', 'bas'], ['spike'])));
  });
  it('gives one valid example room for empty or bad input', () => {
    for (const input of [{}, null, { levels: ['nope'] }, { programs: 7 }]) {
      const result = plan(input);
      expect(keys(result)).toContain('room:pre:0');
      expect(result.modules.filter(m => m.type === 'room')).toHaveLength(1);
    }
  });
  it('never moves an existing key when scope is added', () => {
    let previous = plan(scope(['pre']));
    const steps = [scope(['pre', 'prim']), scope(['pre', 'prim'], ['tale']), scope(['pre', 'prim', 'bach'], ['tale', 'spike']), scope(LEVEL_IDS, PROGRAM_IDS, 120)];
    for (const step of steps) {
      const next = plan(step);
      const after = byKey(next);
      for (const m of previous.modules) {
        const kept = after.get(m.key);
        if (kept) expect([kept.x, kept.y, kept.z]).toEqual([m.x, m.y, m.z]);
      }
      previous = next;
    }
  });
  it('removing a program removes only what depends on it', () => {
    const full = byKey(plan(scope(['pre', 'prim'], ['tale', 'master'])));
    const fewer = byKey(plan(scope(['pre', 'prim'], ['tale'])));
    expect(fewer.has('project:master')).toBe(false);
    expect(fewer.has('room:pre:0') && fewer.has('room:prim:0') && fewer.has('project:tale')).toBe(true);
    expect(full.get('room:prim:0').x).toBe(fewer.get('room:prim:0').x);
  });
  it('never overlaps two modules on one floor, even at the limit', () => {
    const buildings = plan(scope(LEVEL_IDS, PROGRAM_IDS, 200)).modules.filter(m => m.footprint);
    for (const [i, a] of buildings.entries()) for (const b of buildings.slice(0, i)) {
      if (a.floor !== b.floor) continue;
      const apart = Math.abs(a.x - b.x) >= (a.footprint[0] + b.footprint[0]) / 2 - 1e-6 || Math.abs(a.z - b.z) >= (a.footprint[1] + b.footprint[1]) / 2 - 1e-6;
      expect(apart, `${a.key} overlaps ${b.key}`).toBe(true);
    }
  });
  it('supports every upper module and roofs every stack', () => {
    const modules = plan(scope(['bach'], ['spike'], 120)).modules;
    for (const upper of modules.filter(m => m.floor >= 1 && m.footprint)) {
      expect(modules.some(m => m.floor === upper.floor - 1 && m.x === upper.x && m.z === upper.z && m.footprint), upper.key).toBe(true);
    }
    for (const top of modules.filter(m => m.footprint && m.type !== 'entrance' && !modules.some(o => o.footprint && o.floor === m.floor + 1 && o.x === m.x))) {
      expect(modules.some(m => m.type === 'roof' && m.x === top.x && m.floor === top.floor + 1), top.key).toBe(true);
    }
  });
  it('lifts spike alone onto supports', () => {
    const result = byKey(plan({ programs: ['spike'] }));
    expect(result.get('project:spike').floor).toBe(2);
    expect(result.has('support:1:0') && result.has('support:1:1')).toBe(true);
  });
  it('steps the campus into a V no wider than five columns', () => {
    const result = byKey(plan(scope(LEVEL_IDS, PROGRAM_IDS, 150)));
    expect(result.get('room:pre:0').z).toBe(0);
    expect(result.get('room:prim:0').z).toBe(-2.5);
    expect(result.get('project:tale').z).toBe(-5);
    expect(result.get('room:bas:0').z).toBe(-2.5);
    expect(result.get('room:bach:0').z).toBe(0);
    expect(result.get('project:immersive').floor).toBe(2);
    expect(Math.max(...[...result.values()].filter(m => m.footprint).map(m => m.column))).toBe(4);
  });
  it('gives every upper room an unbroken route to the ground', () => {
    for (const input of [scope(LEVEL_IDS, PROGRAM_IDS, 150), stackedInput, { programs: ['electronics'] }, scope(['bach'], ['immersive'], 120)]) {
      const result = byKey(plan(input));
      const walkway = (column, floor) => result.has(`balcony:${column}:${floor}`) || result.has(`bridge:${column}:${floor}`);
      expect(result.has('stairs:front')).toBe(true);
      for (const room of [...result.values()].filter(m => m.type === 'room' && m.floor >= 1)) {
        const start = room.floor === 2 ? 1 : 0;
        if (room.floor === 2) expect(result.has('stairs:upper') && result.has('gallery:0:2'), room.key).toBe(true);
        for (let column = start; column <= room.column; column += 1) {
          expect(walkway(column, room.floor), `${room.key} column ${column}`).toBe(true);
          if (column < room.column && Math.abs(result.get(`balcony:${column}:${room.floor}`)?.row ?? 0) >= 0 && ROWS[column] !== ROWS[column + 1]) expect(result.has(`gallery:${column}:${room.floor}`), `${room.key} link ${column}`).toBe(true);
        }
      }
    }
  });
  it('only hangs upper walkways from a room; other spans stand on the walkway below', () => {
    for (const input of [{ levels: ['pre', 'prim'], programs: ['electronics'] }, scope(LEVEL_IDS, PROGRAM_IDS, 150)]) {
      const result = byKey(plan(input));
      for (const walk of [...result.values()].filter(m => (m.type === 'balcony' || m.type === 'gallery') && m.floor === 2)) {
        if (walk.hanging) expect(walk.type === 'balcony' && result.get(`balcony:${walk.column}:2`) === walk && [...result.values()].some(m => m.type === 'room' && m.floor === 2 && m.column === walk.column), walk.key).toBe(true);
        else expect([...result.values()].some(m => m.type === 'balcony' && m.floor === 1 && Math.abs(m.x - walk.x) <= 3.5), walk.key).toBe(true);
      }
    }
  });
  it('starts the upper flight on its own landing, clear of the floor-1 walkway', () => {
    for (const input of [scope(LEVEL_IDS, PROGRAM_IDS, 150), { programs: ['spike'] }, scope(['pre'], ['immersive'])]) {
      const result = byKey(plan(input));
      const flight = result.get('stairs:upper'), landing = result.get('landing:upper'), walk = result.get('bridge:0:1') || result.get('balcony:0:1');
      expect(landing?.floor, 'landing').toBe(1);
      // The flight is .9 m wide with its stringers and runs east from its origin; the walkway is 1.4 m deep.
      expect(flight.z - .45, 'flight over the walkway').toBeGreaterThanOrEqual(walk.z + .7 - 1e-6);
      expect(Math.abs(landing.x + landing.size[0] / 2 - flight.x), 'flight starts at the landing edge').toBeLessThan(1e-6);
      expect(Math.abs(landing.z - landing.size[1] / 2 - (walk.z + .7)), 'landing meets the walkway').toBeLessThan(1e-6);
      // The walkway's front rail leaves its last .95 m open; the landing must reach into that gap.
      expect(landing.x - landing.size[0] / 2, 'landing at the open end').toBeLessThanOrEqual(walk.x - 2.05);
      expect(Math.abs(flight.x + 4.48 + 1.52 - (result.get('gallery:0:2').x + .7)), 'top platform reaches the gallery').toBeLessThan(1e-6);
    }
  });
  it('keeps the upper stair posts off the front stairs', () => {
    const result = byKey(plan(scope(LEVEL_IDS, PROGRAM_IDS, 150)));
    const front = result.get('stairs:front'), post = result.get('stairs:upper').x + 5.9;
    expect(post - .1).toBeGreaterThan(front.x + .75 + .03);
  });
  it('fills gaps in the row so the school stays connected', () => {
    const result = byKey(plan(scope(['pre', 'bach'])));
    expect(result.has('corridor:1') && result.has('corridor:2') && result.has('corridor:3')).toBe(true);
  });
  it('grows the island with the scope and always contains the school', () => {
    const small = plan(scope(['pre'])), large = plan(scope(LEVEL_IDS, PROGRAM_IDS, 150));
    expect(large.island.width).toBeGreaterThan(small.island.width);
    for (const m of large.modules) {
      expect(Math.abs(m.x - large.island.x)).toBeLessThan(large.island.width / 2);
      expect(Math.abs(m.z - large.island.z)).toBeLessThan(large.island.depth / 2);
    }
  });
  it('makes every program visibly present', () => {
    const result = plan(scope(['prim', 'bas'], PROGRAM_IDS));
    for (const program of PROGRAM_IDS) expect(result.modules.some(m => m.programId === program), program).toBe(true);
  });
  it('populates rooms from student counts, within a bound', () => {
    const quiet = byKey(plan({ levels: ['prim'], students: 10 })).get('room:prim:0').population;
    const busy = byKey(plan({ levels: ['prim'], students: 5000 })).get('room:prim:0').population;
    expect(quiet).toBeGreaterThanOrEqual(1);
    expect(busy).toBeGreaterThan(quiet);
    expect(busy).toBeLessThanOrEqual(4);
  });
  it('puts three students in the VR room and two in the other program rooms', () => {
    const result = planWorld(normalizeWorldInput(scope(LEVEL_IDS, PROGRAM_IDS, 150)));
    for (const m of result.modules.filter(m => m.programId && m.type === 'room')) expect(m.population, m.programId).toBe(['immersive', 'master'].includes(m.programId) ? 3 : 2);
  });
});
