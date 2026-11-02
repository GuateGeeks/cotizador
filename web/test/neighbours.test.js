import { describe, expect, it } from 'vitest';
import { LEVEL_IDS, PROGRAM_IDS, normalizeWorldInput } from '../src/layout/normalize.js';
import { hashKey } from '../src/layout/neighbours.js';
import { planWorld } from '../src/layout/plan.js';

const plan = input => planWorld(normalizeWorldInput(input));
const scope = (levels, programs = [], students = 30) => ({ levels, programs, students: students * levels.length });
const keys = result => result.modules.map(m => m.key);
const roofs = result => result.modules.filter(m => m.type === 'roof');
const roofAt = (result, column) => roofs(result).filter(m => m.column === column).sort((a, b) => b.floor - a.floor)[0];

describe('applyNeighbours', () => {
  it('hashes keys the same way every time', () => {
    expect(hashKey('room:pre:0')).toBe(hashKey('room:pre:0'));
    expect(hashKey('a')).not.toBe(hashKey('b'));
  });
  it('tops level stacks with pitched or flat roofs', () => {
    expect(['pitched', 'flat', 'garden']).toContain(roofAt(plan(scope(['pre', 'prim'], ['tale'])), 0).variant);
  });
  it('gives project stacks a barrel roof', () => {
    expect(roofAt(plan(scope(['pre', 'prim', 'bas', 'bach'], ['tale'])), 2).variant).toBe('barrel');
  });
  it('caps the tallest stack with a tower, and moves it when that stack changes', () => {
    const tall = plan(scope(['pre', 'prim'], ['spike', 'tale']));
    expect(roofAt(tall, 1).variant).toBe('tower');
    const taller = plan(scope(['pre', 'prim'], ['spike', 'tale', 'master', 'immersive']));
    const towers = roofs(taller).filter(m => m.variant === 'tower');
    expect(towers).toHaveLength(1);
    expect(towers[0].column).toBe(2);
    expect(roofAt(taller, 1).variant).not.toBe('tower');
  });
  it('turns a roof below a taller neighbour into a terrace, with students once that room is occupied', () => {
    const result = plan(scope(['pre', 'prim'], ['spike']));
    const roof = roofAt(result, 0);
    expect(roof.variant).toBe('terrace');
    expect(roof.terraceStudents).toBeGreaterThan(0);
  });
  it('never asks for more terrace students than there are spots', () => {
    const input = { levels: ['pre', 'prim'], programs: ['tale', 'master'], enrollment: [{ id: 'a', levelId: 'pre', students: 90 }, { id: 'b', levelId: 'prim', students: 20 }] };
    for (const roof of plan(input).modules.filter(m => m.variant === 'terrace')) expect(roof.terraceStudents ?? 0).toBeLessThanOrEqual(2);
  });
  it('fills a gap with a pocket garden and adds an archway under a span', () => {
    const gap = keys(plan(scope(['pre', 'bach'])));
    expect(gap).toContain('pocket:1');
    const span = keys(plan(scope(['pre', 'bach'], ['spike'])));
    expect(span).toContain('archway:1');
  });
  it('adds a courtyard tree and bench at three ground rooms, and removes them below that', () => {
    const three = keys(plan(scope(['pre', 'prim'], ['tale'])));
    expect(three).toContain('courtyard:tree');
    expect(three).toContain('courtyard:bench');
    expect(keys(plan(scope(['pre', 'prim'])))).not.toContain('courtyard:tree');
  });
  it('trims adjacent stacks of equal height', () => {
    expect(keys(plan(scope(['pre', 'prim'])))).toContain('trim:0:1');
    expect(keys(plan(scope(['pre', 'prim'], ['spike'])))).not.toContain('trim:0:1');
  });
  it('is deterministic', () => {
    expect(plan(scope(LEVEL_IDS, PROGRAM_IDS, 150))).toEqual(plan(scope(LEVEL_IDS, PROGRAM_IDS, 150)));
  });
  it('gives empty input one room, one roof and no details', () => {
    const result = plan({});
    expect(result.modules.filter(m => m.type === 'room')).toHaveLength(1);
    expect(roofs(result)).toHaveLength(1);
    expect(result.modules.filter(m => m.type === 'detail')).toHaveLength(0);
  });
  it('never alters rooms', () => {
    const before = plan(scope(['pre', 'prim'])).modules.filter(m => m.type === 'room');
    const after = plan(scope(['pre', 'prim'], ['spike', 'tale'])).modules.filter(m => m.type === 'room');
    for (const room of before) {
      const same = after.find(m => m.key === room.key);
      expect([same.x, same.y, same.z]).toEqual([room.x, room.y, room.z]);
    }
  });
  it('produces several distinct rooflines on a large campus', () => {
    expect(new Set(roofs(plan(scope(LEVEL_IDS, PROGRAM_IDS, 150))).map(m => m.variant)).size).toBeGreaterThanOrEqual(3);
  });
});
