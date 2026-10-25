'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { describe, programs } = require('../campus-experience.js');

function fixture() {
  return {
    levels: ['pre', 'prim'], students: 78, programs: ['tale'],
    enrollment: [
      { id: 'pk-1', levelId: 'pre', label: 'Prekínder A', students: 18 },
      { id: 'ki-1', levelId: 'pre', label: 'Kínder A', students: 30 },
      { id: 'p1-1', levelId: 'prim', label: 'Primero A', students: 30 }
    ],
    equipment: [{ id: 'tale@pre', programId: 'tale', units: 15, capacity: 30, participants: 48,
      groupIds: ['pk-1', 'ki-1'], simIds: [], sharing: 'separate', stations: false, plan: 'EV8', flexBimestres: 1 }]
  };
}

test('every catalog technology describes its own workshop activity when added', () => {
  const titles = new Set();
  for (const id of ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive']) {
    const before = fixture(); before.programs = []; before.equipment = [];
    const after = structuredClone(before); after.programs.push(id);
    const feedback = describe(after, before);
    assert.equal(feedback.focus.programId, id);
    assert.equal(feedback.changed, true);
    assert.equal(feedback.diagram, 'program');
    assert.ok(feedback.title.length > 8 && feedback.text.length > 20);
    titles.add(feedback.title);
  }
  assert.equal(titles.size, Object.keys(programs).length, 'Technology activities are distinct');
});

test('enrollment feedback belongs to the changed level even when equipment recalculates', () => {
  const before = fixture(), after = structuredClone(before);
  after.enrollment[0].students = 48; after.students += 30;
  after.equipment[0].units = 24; after.equipment[0].capacity = 48;
  const feedback = describe(after, before, { kind: 'overview' });
  assert.equal(feedback.focus.kind, 'enrollment');
  assert.equal(feedback.focus.groupId, 'pk-1');
  assert.equal(feedback.title, '78 estudiantes en Preprimaria');
  assert.equal(feedback.items.reduce((sum, row) => sum + row.value, 0), 78);
  assert.equal(feedback.items.find(row => row.active).label, 'Prekínder A');
});

test('blank enrollment stays pending while a confirmed zero is described as zero', () => {
  const before = fixture(), pending = structuredClone(before);
  pending.enrollment[0].students = null;
  const blank = describe(pending, before);
  assert.equal(blank.text, 'Prekínder A: matrícula por confirmar.');
  const confirmed = structuredClone(pending); confirmed.enrollment[0].students = 0;
  const zero = describe(confirmed, pending);
  assert.equal(zero.text, 'Prekínder A: 0 estudiantes registrados.');
  assert.equal(blank.title, zero.title, 'The same total does not erase the pending/confirmed distinction');
  const equipmentPending = fixture(); equipmentPending.equipment[0].units = null;
  assert.equal(describe(equipmentPending, null, { kind: 'equipment', programId: 'tale' }).title, 'Equipos por definir');
});

test('removing a level or program explains the removal without celebrating an addition', () => {
  const before = fixture(), after = structuredClone(before);
  after.levels = ['pre'];
  const level = describe(after, before);
  assert.equal(level.removed, true);
  assert.equal(level.focus.levelId, 'prim');
  assert.match(level.title, /sale de la propuesta/);
  const noProgram = structuredClone(before); noProgram.programs = []; noProgram.equipment = [];
  const program = describe(noProgram, before);
  assert.equal(program.removed, true);
  assert.match(program.title, /Tale-Bot sale del campus/);
});

test('selected groups report participating students and names from the quote', () => {
  const before = fixture(), after = structuredClone(before);
  after.equipment[0].groupIds = ['pk-1']; after.equipment[0].participants = 18;
  const feedback = describe(after, before);
  assert.equal(feedback.focus.kind, 'groups');
  assert.equal(feedback.title, '18 estudiantes participan');
  assert.deepEqual(feedback.items, [{ label: 'Prekínder A', active: true }]);
});

test('turn-taking, simultaneous groups, and unknown schedules have different representations', () => {
  const before = fixture(), simultaneous = structuredClone(before);
  simultaneous.equipment[0].sharing = 'simultaneous';
  simultaneous.equipment[0].simIds = ['ki-1'];
  const parallel = describe(simultaneous, before);
  assert.equal(parallel.diagram, 'parallel');
  assert.deepEqual(parallel.items.map(row => row.active), [false, true]);
  const turns = describe(before, simultaneous);
  assert.equal(turns.diagram, 'turns');
  assert.ok(turns.items.every(row => row.active));
  const unknown = structuredClone(before); unknown.equipment[0].sharing = 'unknown';
  assert.equal(describe(unknown, before).diagram, 'pending');
  const moreSimultaneous = structuredClone(simultaneous); moreSimultaneous.equipment[0].simIds.push('pk-1');
  assert.equal(describe(moreSimultaneous, simultaneous).focus.kind, 'sharing', 'Changing coincident groups remains a schedule action');
});

test('equipment and stations show actual capacity without changing the enrollment meaning', () => {
  const before = fixture(), after = structuredClone(before);
  after.equipment[0].units = 3; after.equipment[0].capacity = 6;
  const equipment = describe(after, before);
  assert.equal(equipment.diagram, 'equipment');
  assert.equal(equipment.title, '3 equipos en el taller');
  assert.deepEqual(equipment.items.map(item => item.value), [3, 6]);
  const stations = structuredClone(after); stations.equipment[0].stations = true;
  const rotation = describe(stations, after);
  assert.equal(rotation.diagram, 'stations');
  assert.match(rotation.text, /6 pueden usar el equipo por turno/);
  assert.equal(stations.students, before.students);
});

test('ownership and rental timelines use the selected plan and actual duration', () => {
  const before = fixture();
  for (const [plan, bimestres, periods, title] of [
    ['INTEGRA', 1, 2, 'El equipo es de tu colegio'],
    ['FLEX', 1, 1, '1 bimestre de exploración'],
    ['FLEX', 4, 4, '4 bimestres de exploración'],
    ['EV8', 1, 8, '8 meses para hacerlo tuyo'],
    ['EV16', 1, 16, '16 meses para hacerlo tuyo']
  ]) {
    const after = structuredClone(before);
    Object.assign(after.equipment[0], { plan, flexBimestres: bimestres });
    const feedback = describe(after, null, { kind: 'plan', entryId: 'tale@pre', programId: 'tale' });
    assert.equal(feedback.title, title);
    assert.equal(feedback.items.length, periods);
    assert.equal(feedback.plan, plan);
    if (plan === 'FLEX') assert.match(feedback.text, /devuelves el equipo/);
    if (plan.startsWith('EV')) assert.match(feedback.text, /20 % inicial/);
  }
  const flex = structuredClone(before); flex.equipment[0].plan = 'FLEX';
  const longer = structuredClone(flex); longer.equipment[0].flexBimestres = 4;
  assert.equal(describe(longer, flex).focus.kind, 'plan', 'Changing only rental duration updates the timeline');
});

test('feedback is a pure view of configuration and exploration does not invent a change', () => {
  const data = fixture(), saved = structuredClone(data), context = { kind: 'program', programId: 'tale' };
  const feedback = describe(data, saved, context);
  assert.equal(feedback.changed, false);
  assert.equal(feedback.removed, false);
  assert.deepEqual(data, saved);
  assert.deepEqual(context, { kind: 'program', programId: 'tale' });
  const undecided = structuredClone(data); undecided.equipment[0].plan = 'UNDECIDED';
  const pending = describe(undecided, data);
  assert.equal(pending.diagram, 'plan');
  assert.equal(pending.items.length, 0);
  assert.match(pending.title, /Elige cómo/);
});
