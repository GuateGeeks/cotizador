const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const campus = import(pathToFileURL(path.join(__dirname, '../lab/campus-layout.js')).href);

const sample = {
  step: 2, levels: ['pre', 'prim'], students: 122,
  enrollment: [{ id: 'a', levelId: 'pre', students: 42 }, { id: 'b', levelId: 'prim', students: 80 }],
  programs: ['tale', 'spike'],
  equipment: [{ id: 'kit', programId: 'spike', units: 8, stations: 4, plan: 'compra' }]
};

test('campus is deterministic and wizard navigation never builds extra geometry', async () => {
  const { deriveCampus } = await campus;
  const before = deriveCampus(sample);
  assert.deepEqual(before, deriveCampus(structuredClone(sample)));
  for (const step of [0, 1, 2, 3, 4, 5, 99]) assert.deepEqual(before, deriveCampus({ ...sample, step }));
});

test('canonical ordering and duplicate selections do not move campus plots', async () => {
  const { deriveCampus } = await campus;
  assert.deepEqual(deriveCampus(sample), deriveCampus({ ...sample, levels: ['prim', 'pre', 'prim', 'invalid'], programs: ['spike', 'tale', 'spike'] }));
});

test('enrollment is authoritative, including explicitly configured zero', async () => {
  const { normalizeCampusData } = await campus;
  const data = normalizeCampusData({ ...sample, students: 9999 });
  assert.equal(data.students, 122);
  const zero = normalizeCampusData({ levels: ['pre'], students: 150, enrollment: [{ levelId: 'pre', students: 0 }] });
  assert.equal(zero.students, 0);
});

test('total student fallback is distributed exactly, without rounding inflation', async () => {
  const { normalizeCampusData } = await campus;
  const data = normalizeCampusData({ levels: ['pre', 'prim', 'bas'], students: 101 });
  assert.deepEqual(data.counts, { pre: 34, prim: 34, bas: 33 });
  assert.equal(data.students, 101);
});

test('increasing enrollment adds stable room keys and preserves existing positions', async () => {
  const { deriveCampus } = await campus;
  const before = deriveCampus({ levels: ['pre'], students: 0 });
  const after = deriveCampus({ levels: ['pre'], students: 400 });
  assert.equal(before.tiles.length, 1);
  assert.equal(after.tiles.length, 2, 'A large enrollment adds an upper classroom to its own sector');
  const first = after.tiles.find(tile => tile.key === before.tiles[0].key);
  for (const field of ['x', 'y', 'z', 'gx', 'gz', 'floor']) assert.equal(first[field], before.tiles[0][field]);
  const upper = after.tiles.find(tile => tile.floor === 1);
  assert.equal(upper.x, first.x, 'The new floor stacks on the same sector');
  assert.equal(before.tiles[0].seated, 0, 'A level without students has an empty classroom');
  assert.ok(first.seated > 0, 'Registered students occupy their classroom');
});

test('removing a level removes its enrollment and every corresponding room', async () => {
  const { deriveCampus } = await campus;
  const data = deriveCampus({ ...sample, levels: ['prim'] });
  assert.equal(data.stats.students, 80);
  assert.equal(data.stats.levels, 1);
  assert.ok(data.tiles.every(tile => tile.levelId === 'prim'));
  assert.ok(data.entities.every(entity => !entity.key.startsWith('room:pre:')));
});

test('deleted programs remove their workshops, paths and orphaned equipment', async () => {
  const { deriveCampus } = await campus;
  const data = deriveCampus({ ...sample, programs: ['tale'] });
  assert.ok(data.workshops.every(workshop => workshop.programId === 'tale'));
  assert.ok(!data.entities.some(entity => entity.key.includes('spike')));
  assert.equal(data.stats.equipmentUnits, 0);
});

test('equipment affects workshop density and floors without changing classrooms', async () => {
  const { deriveCampus } = await campus;
  const before = deriveCampus({ ...sample, equipment: [{ programId: 'spike', units: 1 }] });
  const after = deriveCampus({ ...sample, equipment: [{ programId: 'spike', units: 16 }] });
  assert.notDeepEqual(before.workshops, after.workshops);
  assert.deepEqual(before.tiles, after.tiles);
  assert.equal(after.stats.equipmentUnits, 16);
});

test('enrollment never multiplies equipment and payment modality preserves campus architecture', async () => {
  const { deriveCampus } = await campus;
  const before = deriveCampus(sample);
  const moreStudents = deriveCampus({ ...sample, enrollment: sample.enrollment.map(row => ({ ...row, students: row.students * 50 })) });
  assert.deepEqual(before.workshops, moreStudents.workshops);
  assert.equal(before.stats.equipmentUnits, moreStudents.stats.equipmentUnits);
  const financed = deriveCampus({ ...sample, equipment: sample.equipment.map(row => ({ ...row, plan: 'arrendamiento-premium' })) });
  assert.deepEqual(before.tiles, financed.tiles);
  assert.deepEqual(before.people, financed.people);
  assert.deepEqual(before.entities.filter(entity => entity.kind !== 'workshop'), financed.entities.filter(entity => entity.kind !== 'workshop'));
  assert.equal(before.workshops[1].density, financed.workshops[1].density);
  assert.notDeepEqual(before.workshops[1].plans, financed.workshops[1].plans);
});

test('shared walls and covered roofs follow grid adjacency', async () => {
  const { getAdjacency } = await campus;
  const [west, east, upper] = getAdjacency([{ gx: 0, gz: 0, floor: 0 }, { gx: 1, gz: 0, floor: 0 }, { gx: 0, gz: 0, floor: 1 }]);
  assert.equal(west.edges.east, false);
  assert.equal(east.edges.west, false);
  assert.equal(west.edges.roof, false);
  assert.equal(upper.edges.roof, true);
  assert.equal(upper.edges.east, true);
  assert.equal(west.edges.north, true);
});

test('malformed, missing and negative input produces finite bounded entities', async () => {
  const { deriveCampus } = await campus;
  for (const input of [null, undefined, {}, { levels: null, programs: {}, enrollment: [null], equipment: [null], students: NaN },
    { levels: ['pre', 'unknown'], students: -500, programs: ['tale'], equipment: [{ programId: 'tale', units: -100, stations: NaN }] }]) {
    const data = deriveCampus(input);
    for (const entity of data.entities) for (const axis of ['x', 'y', 'z']) assert.ok(Number.isFinite(entity[axis]));
    assert.ok(data.stats.students >= 0);
    assert.ok(data.stats.equipmentUnits >= 0);
  }
});

test('extreme populations stay within geometry and representative population bounds', async () => {
  const { deriveCampus, LEVEL_IDS, PROGRAM_IDS, CAMPUS_LIMITS } = await campus;
  const data = deriveCampus({ levels: LEVEL_IDS, programs: PROGRAM_IDS, students: Infinity,
    equipment: PROGRAM_IDS.map(programId => ({ programId, units: Infinity, stations: Infinity })) });
  assert.equal(data.tiles.length, LEVEL_IDS.length * CAMPUS_LIMITS.roomsPerLevel);
  assert.equal(data.workshops.length, PROGRAM_IDS.length * CAMPUS_LIMITS.workshopFloors);
  assert.ok(data.people.length > 0 && data.people.length <= CAMPUS_LIMITS.people);
  assert.equal(data.stats.walkers, CAMPUS_LIMITS.walkers);
  assert.ok(data.tiles.every(tile => tile.seated <= CAMPUS_LIMITS.seatsPerRoom));
  assert.ok(data.workshops.every(workshop => workshop.shelf <= CAMPUS_LIMITS.shelf && workshop.sets <= 2));
  assert.ok(data.entities.length <= 19);
  assert.equal(new Set(data.entities.map(entity => entity.key)).size, data.entities.length);
  for (const entity of data.entities) {
    assert.ok(Number.isFinite(entity.x) && Math.abs(entity.x) < data.bounds.width / 2);
    assert.ok(Number.isFinite(entity.z) && Math.abs(entity.z) < data.bounds.depth / 2);
  }
});

test('focusing a level preserves its rooms and the other levels', async () => {
  const { deriveCampus } = await campus;
  const before = deriveCampus(sample), after = deriveCampus({ ...sample, focusLevel: 'prim' });
  assert.deepEqual(before.tiles.map(({ focused, ...tile }) => tile), after.tiles.map(({ focused, ...tile }) => tile));
  assert.ok(after.tiles.filter(tile => tile.levelId === 'prim').every(tile => tile.focused));
  assert.ok(after.tiles.filter(tile => tile.levelId === 'pre').every(tile => !tile.focused));
});

test('derivation does not mutate quotation inputs', async () => {
  const { deriveCampus } = await campus;
  const input = structuredClone(sample), expected = structuredClone(input);
  deriveCampus(input);
  assert.deepEqual(input, expected);
});

test('approved storyboard starts with a recognizable classroom and grows from actual configuration', async () => {
  const { deriveCampus } = await campus;
  const start = deriveCampus({});
  assert.equal(start.tiles.length, 1);
  assert.ok(start.people.length >= 3);
  assert.equal(start.workshops.length, 0);
  assert.ok(start.bounds.width < 6);
  const community = deriveCampus({ levels: ['pre'], students: 48 });
  assert.equal(community.tiles.length, 1);
  assert.ok(community.tiles[0].seated > 0 && community.stats.walkers > 0, 'Students occupy the classroom and arrive through the entrance');
  const robotics = deriveCampus({ levels: ['pre'], students: 48, programs: ['tale'] });
  assert.equal(robotics.workshops.length, 1);
  assert.deepEqual(robotics.tiles.map(({ focused, ...tile }) => tile), community.tiles.map(({ focused, ...tile }) => tile), 'A workshop never moves the classroom');
  const technology = deriveCampus({ levels: ['pre'], students: 48, programs: ['tale', 'electronics'] });
  assert.equal(technology.workshops.length, 2);
  const environment = technology.entities.find(entity => entity.kind === 'environment');
  const [x0, x1] = environment.walk;
  assert.ok(technology.workshops.every(workshop => workshop.x > x0 && workshop.x < x1), 'The circulation connects every wing');
});

test('the island only grows while options are added, tile by tile', async () => {
  const { deriveCampus } = await campus;
  const steps = [{}, { levels: ['pre'], students: 48 }, { levels: ['pre'], students: 48, programs: ['tale'] },
    { levels: ['pre', 'prim'], students: 300, programs: ['tale', 'master'] },
    { levels: ['pre', 'prim', 'bas', 'bach'], students: 900, programs: ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'] }];
  let previous = null;
  for (const step of steps) {
    const tiles = new Set(deriveCampus(step).entities.find(entity => entity.kind === 'environment').tiles.map(([i, k]) => i + ':' + k));
    if (previous) assert.ok([...previous].every(key => tiles.has(key)), 'Existing terrain is kept');
    previous = tiles;
  }
});

test('sections and enrollment decide occupancy and floors of each educational sector', async () => {
  const { deriveCampus } = await campus;
  const rows = count => Array.from({ length: count }, (_, i) => ({ id: 'p' + i, levelId: 'prim', label: 'Grupo ' + i, students: 20 }));
  const two = deriveCampus({ levels: ['prim'], enrollment: rows(2) });
  const five = deriveCampus({ levels: ['prim'], enrollment: rows(5) });
  assert.equal(two.tiles.length, 1);
  assert.equal(two.tiles[0].pennants, 2, 'One pennant per registered section');
  assert.equal(five.tiles.length, 2, 'Many sections open an upper classroom');
  const pending = deriveCampus({ levels: ['prim'], enrollment: [{ id: 'a', levelId: 'prim', students: null }, { id: 'b', levelId: 'prim', students: 0 }] });
  assert.equal(pending.tiles[0].pennants, 1, 'Unconfirmed sections count; confirmed empty ones do not');
});

test('participant groups, concurrency and stations change who works in a workshop, not its slot', async () => {
  const { deriveCampus } = await campus;
  const enrollment = [{ id: 'b1', levelId: 'bas', students: 30 }, { id: 'c4', levelId: 'bach', students: 30 }];
  const base = { levels: ['bas', 'bach'], enrollment, programs: ['spike'] };
  const one = deriveCampus({ ...base, equipment: [{ programId: 'spike', units: 6, groupIds: ['c4'], sharing: 'separate' }] }).workshops[0];
  const both = deriveCampus({ ...base, equipment: [{ programId: 'spike', units: 6, groupIds: ['b1', 'c4'], sharing: 'simultaneous', simIds: ['b1', 'c4'], stations: true }] }).workshops[0];
  assert.deepEqual(one.participantLevels, ['bach']);
  assert.deepEqual(both.participantLevels, ['bas', 'bach']);
  assert.equal(one.sets, 1);
  assert.equal(both.sets, 2, 'Simultaneous groups use a second, concurrent set');
  assert.equal(both.stations, true);
  for (const field of ['x', 'z', 'w', 'd']) assert.equal(one[field], both[field]);
  assert.equal(one.shelf, both.shelf, 'Storage follows equipment units only');
});

test('tall vegetation keeps sight lines to activities and never grows on buildings', async () => {
  const { deriveCampus, LEVEL_IDS, PROGRAM_IDS } = await campus;
  const data = deriveCampus({ levels: LEVEL_IDS, students: 900, programs: PROGRAM_IDS });
  const environment = data.entities.find(entity => entity.kind === 'environment');
  for (const plant of environment.vegetation) {
    for (const workshop of data.workshops) {
      const inside = Math.abs(plant.x - workshop.x) < workshop.w / 2 && Math.abs(plant.z - workshop.z) < workshop.d / 2;
      assert.ok(!inside, 'No plant inside a workshop');
      if (['round', 'bloom', 'pine'].includes(plant.type)) assert.ok(Math.abs(plant.x - workshop.x) > workshop.w / 2 + .4 || Math.abs(plant.z - workshop.z) > workshop.d / 2 + .4);
    }
  }
  assert.ok(environment.vegetation.length > deriveCampus({ levels: ['pre'] }).entities.find(entity => entity.kind === 'environment').vegetation.length, 'The environment fills with life');
});

test('stations are represented without multiplying purchased equipment', async () => {
  const { deriveCampus } = await campus;
  const base = { programs: ['spike'], equipment: [{ programId: 'spike', units: 8, stations: false }] };
  const individual = deriveCampus(base);
  const station = deriveCampus({ ...base, equipment: [{ ...base.equipment[0], stations: true, sharing: 'separate' }] });
  assert.equal(station.stats.equipmentUnits, 8);
  assert.equal(individual.workshops[0].stations, false);
  assert.equal(station.workshops[0].stations, true);
  assert.notDeepEqual(individual.workshops, station.workshops);
});

test('sharing choices preserve their semantic strings, simultaneous groups and motor analysis', async () => {
  const { deriveCampus } = await campus;
  for (const sharing of ['separate', 'simultaneous', 'unknown']) {
    const result = deriveCampus({ levels: ['prim'], programs: ['spike'], equipment: [{
      id: 'spike@prim', programId: 'spike', units: 4, sharing, groupIds: ['a', 'b'], simIds: ['b', 'a', 'orphan'],
      participants: 36, capacity: 12, rotations: [{ id: 'a', label: 'Primero A', students: 24, rotations: 2 }]
    }] });
    const workshop = result.workshops[0];
    assert.deepEqual(workshop.sharingModes, [sharing]);
    assert.deepEqual(workshop.simIds, ['a', 'b']);
    assert.equal(workshop.entries[0].sharing, sharing);
    assert.equal(workshop.participants, 36);
    assert.equal(workshop.capacity, 12);
    assert.equal(workshop.rotations[0].rotations, 2);
    assert.equal(workshop.units, 4);
  }
});

test('split selections retain individual plans, terms and analysis without adding overlapping participants', async () => {
  const { deriveCampus } = await campus;
  const result = deriveCampus({ programs: ['spike'], equipment: [
    { id: 'spike@prim', programId: 'spike', units: 4, sharing: 'separate', groupIds: ['shared', 'a'], participants: 60, capacity: 12, plan: 'FLEX', flexBimestres: 3 },
    { id: 'spike@bas', programId: 'spike', units: 5, sharing: 'simultaneous', groupIds: ['shared', 'b'], simIds: ['shared', 'b'], participants: 72, capacity: 15, plan: 'EV16' }
  ] });
  const workshop = result.workshops[0];
  assert.equal(workshop.units, 9);
  assert.equal(workshop.entries.length, 2);
  assert.deepEqual(workshop.sharingModes, ['separate', 'simultaneous']);
  assert.deepEqual(workshop.plans, ['EV16', 'FLEX']);
  assert.deepEqual(workshop.flexBimestres, [3]);
  assert.deepEqual(workshop.groupIds, ['a', 'b', 'shared']);
  assert.equal(workshop.participants, null);
  assert.equal(workshop.capacity, null);
  assert.deepEqual(workshop.entries.map(entry => entry.participants), [72, 60]);
});

test('unknown capacity remains unknown rather than being inferred from students or equipment', async () => {
  const { deriveCampus } = await campus;
  const workshop = deriveCampus({ levels: ['prim'], students: 300, programs: ['spike'], equipment: [
    { programId: 'spike', units: 10, sharing: 'unknown', stations: false }
  ] }).workshops[0];
  assert.equal(workshop.capacity, null);
  assert.equal(workshop.participants, null);
  assert.deepEqual(workshop.rotations, []);
  assert.deepEqual(workshop.sharingModes, ['unknown']);
});

test('focus and enrollment identities reach the renderer without moving campus architecture', async () => {
  const { deriveCampus } = await campus;
  const base = { levels: ['prim'], programs: ['spike'], enrollment: [
    { id: 'p6-a', gradeId: 'p6', levelId: 'prim', label: 'Sexto · Sección A', sectionName: 'A', students: 24 }
  ], equipment: [{ id: 'spike@prim', programId: 'spike', units: 8 }] };
  const before = deriveCampus(base);
  const activeConfig = { kind: 'groups', programId: 'spike', levelId: 'prim', entryId: 'spike@prim' };
  const after = deriveCampus({ ...base, focusedLevel: 'prim', focusedProgram: 'spike', activeConfig });
  assert.deepEqual(after.normalized.enrollment[0], base.enrollment[0]);
  assert.deepEqual(after.workshops[0].activeConfig, activeConfig);
  assert.equal(after.workshops[0].focused, true);
  assert.deepEqual(before.tiles.map(({ focused, ...tile }) => tile), after.tiles.map(({ focused, ...tile }) => tile));
  assert.deepEqual(after.bounds, before.bounds);
});

// ---- papercraft scene: entities come from the growth plan
const sceneModules = Promise.all([
  import(pathToFileURL(path.join(__dirname, '../lab/paper/plan.js')).href),
  import(pathToFileURL(path.join(__dirname, '../lab/paper/scene-entities.js')).href),
  import(pathToFileURL(path.join(__dirname, '../lab/paper/plan-fixtures.js')).href)
]);

test('scene entities group every module once, with stable keys and few entities', async () => {
  const [{ planCampus }, { groupPlan }, { stateInput }] = await sceneModules;
  for (const n of [1, 3, 6]) {
    const plan = planCampus(stateInput(n)), groups = groupPlan(plan);
    const modules = groups.flatMap(group => group.modules.map(m => m.key));
    assert.equal(new Set(modules).size, modules.length, 'a module belongs to one entity');
    assert.equal(modules.length, plan.modules.length, 'every module is in an entity');
    assert.ok(groups.length <= 14, 'few entities keep draw calls bounded');
    assert.deepEqual(groups.map(g => g.key), groupPlan(planCampus(structuredClone(stateInput(n)))).map(g => g.key));
  }
});

test('scene entities: growing keeps existing entity signatures, so only the new ones rebuild', async () => {
  const [{ planCampus }, { groupPlan, entitySignature }, { stateInput }] = await sceneModules;
  const signatures = n => { const plan = planCampus(stateInput(n)); return new Map(groupPlan(plan).filter(g => g.kind === 'bay').map(g => [g.key, entitySignature(g, plan)])); };
  const small = signatures(2), same = signatures(2);
  for (const [key, sig] of small) assert.equal(same.get(key), sig);
  const bigger = signatures(6);
  assert.ok(bigger.size > small.size, 'a wider campus has more bays');
  // Services are drawn inside existing rooms, never as extra entities.
  assert.ok(groupPlan(planCampus(stateInput(6))).every(g => g.kind !== 'service'));
});
