import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/normalize.json';
import { LEVEL_IDS, PROGRAM_IDS, normalizeWorldInput } from '../src/layout/normalize.js';
import { planWorld } from '../src/layout/plan.js';

const plan = input => planWorld(normalizeWorldInput(input));
const keys = result => result.modules.map(m => m.key);
const byKey = result => new Map(result.modules.map(m => [m.key, m]));
const scope = (levels, programs = [], students = 30) => ({ levels, programs, students: students * levels.length });
const stacked = plan({ levels: ['pre', 'prim'], enrollment: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, levelId: 'prim', students: 24 })) });

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
    const result = plan(scope(['bach'], ['spike'], 120));
    const modules = result.modules;
    for (const upper of modules.filter(m => m.floor === 1 && m.footprint)) {
      expect(modules.some(m => m.floor === 0 && m.x === upper.x && m.z === upper.z && m.footprint), upper.key).toBe(true);
      expect(modules.some(m => m.type === 'roof' && m.x === upper.x && m.floor === 2), upper.key).toBe(true);
    }
  });
  it('stairs reach the balcony that serves the upper floor', () => {
    const result = byKey(stacked);
    expect(result.has('upper:prim:0') && result.has('stairs:front')).toBe(true);
    expect(result.has('balcony:1')).toBe(true);
    expect(result.has('bridge:0')).toBe(true);
    expect(byKey(plan(scope(['pre']))).has('stairs:front')).toBe(false);
  });
  it('fills gaps in the row so the school stays connected', () => {
    const result = byKey(plan(scope(['pre', 'bach'])));
    expect(result.has('corridor:1') && result.has('corridor:2')).toBe(true);
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
});
