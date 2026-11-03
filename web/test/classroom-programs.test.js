import { describe, expect, it } from 'vitest';
import { levelPrograms, tablePrograms } from '../src/layout/classroom-programs.js';
import { normalizeWorldInput } from '../src/layout/normalize.js';
import { planWorld } from '../src/layout/plan.js';
import { signatureOf } from '../src/world/entities.js';

const row = (id, levelId, students = 25) => ({ id, levelId, gradeId: id.split('-')[0], sectionName: 'A', students });
const school = (rows, equipment, programs = Object.keys(equipment)) => normalizeWorldInput({
  levels: [...new Set(rows.map(r => r.levelId))], enrollment: rows, programs,
  equipment: Object.entries(equipment).map(([programId, groupIds]) => ({ id: `${programId}@x`, programId, groupIds }))
});
const showcase = normalizeWorldInput({ levels: ['pre', 'prim', 'bas', 'bach'], students: 720, enrollment: [], programs: ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'],
  equipment: ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'].map(programId => ({ id: `${programId}@vitrina`, programId, groupIds: [] })) });

describe('classroom programs', () => {
  it('takes the programs whose groups include a row of the level, in program order', () => {
    expect(levelPrograms(school([row('p1-1', 'prim'), row('b1-1', 'bas')], { electronics: ['p1-1'], master: ['p1-1'], drones: ['b1-1'] })))
      .toEqual({ prim: ['master', 'electronics'], bas: ['drones'] });
  });
  it('ignores groups of another level', () => {
    expect(levelPrograms(school([row('b1-1', 'bas'), row('bc4-1', 'bach')], { spike: ['b1-1'] }))).toEqual({ bas: ['spike'], bach: [] });
  });
  it('ignores a program the school deselected', () => {
    expect(levelPrograms(school([row('b1-1', 'bas')], { spike: ['b1-1'], drones: ['b1-1'] }, ['drones']))).toEqual({ bas: ['drones'] });
  });
  it('counts rows with no students', () => {
    expect(levelPrograms(school([row('b1-1', 'bas', 0)], { spike: ['b1-1'] }))).toEqual({ bas: ['spike'] });
  });
  it('puts a program with no groups at its usual levels (the landing showcase)', () => {
    expect(levelPrograms(showcase)).toEqual({ pre: ['tale'], prim: ['master', 'electronics'], bas: ['spike', 'drones'], bach: ['spike', 'immersive'] });
  });
  it('gives the upper classroom the next two programs, or repeats', () => {
    expect(tablePrograms(['tale', 'master', 'spike'], false)).toEqual(['tale', 'master']);
    expect(tablePrograms(['tale', 'master', 'spike'], true)).toEqual(['spike']);
    expect(tablePrograms(['master'], true)).toEqual(['master']);
    expect(tablePrograms([], false)).toEqual([]);
  });
  it('puts the programs on the classroom modules', () => {
    const plan = planWorld(showcase);
    expect(plan.modules.find(m => m.key === 'room:prim:0').programs).toEqual(['master', 'electronics']);
  });
  it('rebuilds only the classrooms of the level whose programs changed', () => {
    const rows = [row('p1-1', 'prim'), row('b1-1', 'bas')];
    const before = planWorld(school(rows, { master: ['p1-1'], drones: ['b1-1'] }));
    const after = planWorld(school(rows, { master: ['p1-1'], drones: ['b1-1'], spike: ['b1-1'] }));
    const sig = (plan, key) => signatureOf(plan.modules.find(m => m.key === key));
    expect(sig(after, 'room:prim:0')).toBe(sig(before, 'room:prim:0'));
    expect(sig(after, 'room:bas:0')).not.toBe(sig(before, 'room:bas:0'));
  });
});
