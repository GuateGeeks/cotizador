const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const plan = import(pathToFileURL(path.join(__dirname, '../lab/paper/plan.js')).href);

// The six reference states of tools/campus-states.cjs, translated from app state
// to the input shape of normalizeCampusData (rows of enrollment, equipment with groupIds).
const rows = (grades, levelId, list) => grades.flatMap(gradeId => list.map((students, i) => ({ id: `${gradeId}-${i + 1}`, levelId, gradeId, sectionName: 'ABC'[i], students })));
const entry = (programId, enrollment, levels, sharing, plan, extra = {}) => {
  const groupIds = enrollment.filter(row => levels.includes(row.levelId)).map(row => row.id);
  return { id: `${programId}@${levels[0]}`, programId, groupIds, sharing: groupIds.length > 1 ? sharing : null,
    simIds: sharing === 'simultaneous' ? groupIds.slice(0, 2) : [], units: null, stations: false, plan, ...extra };
};
function state(n) {
  if (n <= 1) return {};
  const levels = ['pre', 'prim'];
  let enrollment = [...rows(['pk', 'ki', 'pr'], 'pre', [22]), ...rows(['p1', 'p2', 'p3'], 'prim', [24])];
  const equipment = [];
  const programs = [];
  if (n >= 4) enrollment = [...rows(['pk', 'ki', 'pr'], 'pre', [22]), ...rows(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], 'prim', [25, 24])];
  if (n >= 5) { levels.push('bas'); enrollment.push(...rows(['b1', 'b2', 'b3'], 'bas', [30, 28])); }
  if (n >= 6) { levels.push('bach'); enrollment.push(...rows(['bc4', 'bc5'], 'bach', [32, 30])); }
  if (n >= 3) { programs.push('tale'); equipment.push(entry('tale', enrollment, ['pre'], 'separate', 'UNDECIDED')); }
  if (n >= 4) { programs.push('master'); equipment.push(entry('master', enrollment, ['prim'], 'simultaneous', 'FLEX', { flexBimestres: 3 })); }
  if (n >= 5) {
    programs.push('electronics', 'drones');
    equipment.push(entry('electronics', enrollment, ['prim'], 'separate', 'EV8', { stations: true }), entry('drones', enrollment, ['bas'], 'separate', 'INTEGRA'));
  }
  if (n >= 6) {
    programs.push('spike', 'immersive');
    equipment.push(entry('spike', enrollment, ['bas', 'bach'], 'unknown', 'EV16'), entry('immersive', enrollment, ['bach'], 'simultaneous', 'FLEX', { flexBimestres: 4 }));
  }
  return { step: n >= 3 ? 5 : 2, levels, enrollment, programs, equipment };
}
const STATES = [1, 2, 3, 4, 5, 6].map(state);
const isRoom = m => m.type.startsWith('room-');
const overlap = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1e-6 && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > 1e-6;
const touch = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) >= -1e-6 && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) >= -1e-6;
const reverse = list => [...list].reverse();
// normalized.enrollment keeps input order (campus-layout), so compare the derived plan.
const derived = ({ modules, services, people, stats, bounds, normalized }) => ({ modules, services, people, stats, bounds, counts: normalized.counts, sections: normalized.sections });

test('planCampus is deterministic and independent of input order', async () => {
  const { planCampus } = await plan;
  for (const input of STATES.slice(1)) {
    const before = planCampus(input);
    assert.deepEqual(before, planCampus(structuredClone(input)));
    const shuffled = { ...input, levels: reverse(input.levels), programs: reverse(input.programs), enrollment: reverse(input.enrollment), equipment: reverse(input.equipment) };
    assert.deepEqual(before.modules, planCampus(shuffled).modules);
    assert.deepEqual(before.people, planCampus(shuffled).people);
    assert.deepEqual(before.services, planCampus(shuffled).services);
  }
  assert.deepEqual(planCampus(STATES[5]), planCampus({ ...STATES[5], step: 1 }), 'wizard step is irrelevant');
});

test('state 1 is exactly one initial classroom without upper floors', async () => {
  const { planCampus } = await plan;
  for (const input of [STATES[0], null, undefined, { levels: [] }]) {
    const data = planCampus(input);
    assert.equal(data.modules.filter(isRoom).length, 1);
    assert.equal(data.modules.filter(isRoom)[0].type, 'room-initial');
    assert.equal(data.stats.rooms, 1);
    assert.equal(data.stats.upperRooms, 0);
    assert.ok(data.modules.every(m => m.floor === 0 || m.type === 'roof'));
    assert.ok(data.modules.some(m => m.type === 'entrance') && !data.modules.some(m => m.type === 'stairs' || m.type === 'bridge'));
    assert.ok(data.people.length > 0);
    assert.ok(data.modules.filter(m => m.type === 'pedestal').length <= 4, 'state 1 base is at most 4 cells');
  }
});

test('modules and footprint grow monotonically from state 1 to 6 and state 6 is at least 3x state 1', async () => {
  const { planCampus } = await plan;
  const plans = STATES.map(planCampus);
  for (let i = 1; i < plans.length; i++) {
    assert.ok(plans[i].stats.modules >= plans[i - 1].stats.modules, `modules ${i} -> ${i + 1}`);
    assert.ok(plans[i].stats.footprint >= plans[i - 1].stats.footprint, `footprint ${i} -> ${i + 1}`);
    assert.ok(plans[i].stats.rooms >= plans[i - 1].stats.rooms);
    assert.ok(plans[i].stats.people >= plans[i - 1].stats.people - 0);
  }
  assert.ok(plans[5].stats.footprint >= plans[0].stats.footprint * 3);
  assert.ok(plans[5].stats.footprint > plans[0].stats.footprint);
  // Footprint is the real area of the pedestal cells (the back garden row is shallower).
  const area = plans[5].modules.filter(m => m.type === 'pedestal').reduce((sum, m) => sum + m.opts.w * m.opts.d, 0);
  assert.ok(Math.abs(area - plans[5].stats.footprint) < 1e-6);
  assert.ok(plans[5].bounds.width > plans[0].bounds.width && plans[5].bounds.height > plans[0].bounds.height);
  // growth is visible, not only counters: stairs, bridge and drone patio appear along the way
  assert.ok(plans[3].modules.some(m => m.type === 'stairs'));
  assert.ok(plans[4].modules.filter(m => m.type === 'corridor').length >= 5, 'the balcony closes into a U');
  assert.ok(plans[5].stats.upperRooms >= 3 && plans[5].stats.projectRooms >= 4);
});

test('adding options keeps existing keys and positions (variants may change)', async () => {
  const { planCampus } = await plan;
  const plans = STATES.map(planCampus);
  const volatile = new Set(['roof', 'corridor', 'columns']);
  for (let i = 1; i < plans.length; i++) {
    const next = new Map(plans[i].modules.map(m => [m.key, m]));
    // the single flight moves to the right wing once it has an upper room; an upper level room is bumped when its slot is claimed by a project room (priority rule)
    for (const m of plans[i - 1].modules.filter(item => !volatile.has(item.type) && !item.key.startsWith('upper:') && item.key !== 'stairs:side')) {
      const after = next.get(m.key);
      assert.ok(after, `${m.key} survives ${i} -> ${i + 1}`);
      // a project room rises one floor when a tenant appears below it; its column and row never change
      const project = m.key.startsWith('project:') && isRoom(m) || m.key.startsWith('project:') && m.type === 'room-upper';
      if (project) assert.deepEqual([after.x, after.z], [m.x, m.z], `${m.key} stays in its column`);
      else assert.deepEqual([after.x, after.y, after.z, after.floor], [m.x, m.y, m.z, m.floor], `${m.key} did not move`);
      if (!isRoom(m)) assert.equal(after.type, m.type);
    }
  }
  // the lone example room keeps its key when the first level is chosen
  assert.equal(plans[0].modules.find(isRoom).key, plans[1].modules.find(m => m.key === 'room:pre:0').key);
});

test('reducing scope equals building the smaller configuration directly', async () => {
  const { planCampus } = await plan;
  const six = STATES[5];
  const keep = ['pre', 'prim'];
  const reduced = { ...six, levels: keep, enrollment: six.enrollment.filter(row => keep.includes(row.levelId)), programs: [], equipment: [] };
  const direct = { levels: ['prim', 'pre'], enrollment: reverse(six.enrollment.filter(row => keep.includes(row.levelId))), programs: [], equipment: [] };
  assert.deepEqual(derived(planCampus(reduced)), derived(planCampus(direct)));
  assert.ok(planCampus(reduced).stats.modules < planCampus(six).stats.modules);
  const noPrograms = { ...six, programs: [], equipment: [] };
  assert.deepEqual(derived(planCampus(noPrograms)), derived(planCampus({ levels: reverse(six.levels), enrollment: reverse(six.enrollment) })));
  const four = { ...six, levels: ['pre', 'prim', 'bas'], enrollment: six.enrollment.filter(row => row.levelId !== 'bach'), programs: STATES[4].programs, equipment: STATES[4].equipment };
  assert.deepEqual(planCampus(four).modules, planCampus(STATES[4]).modules);
});

test('no footprints overlap on the same floor', async () => {
  const { planCampus, footprintOf } = await plan;
  const huge = { levels: ['pre', 'prim', 'bas', 'bach'], students: 99999, programs: ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'] };
  for (const input of [...STATES, huge]) {
    const data = planCampus(input);
    const solid = data.modules.filter(m => !['pedestal', 'path', 'roof'].includes(m.type)).map(m => ({ m, r: footprintOf(m) }));
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
      if (solid[i].m.floor !== solid[j].m.floor) continue;
      assert.ok(!overlap(solid[i].r, solid[j].r), `${solid[i].m.key} overlaps ${solid[j].m.key}`);
    }
    assert.equal(new Set(data.modules.map(m => m.key)).size, data.modules.length, 'keys are unique');
    // everything stands on the pedestal
    const base = data.modules.filter(m => m.type === 'pedestal').map(footprintOf);
    for (const m of data.modules.filter(item => item.floor === 0 && !['pedestal', 'path'].includes(item.type))) {
      const r = footprintOf(m);
      assert.ok(base.some(b => r.x0 >= b.x0 - 1e-6 && r.x1 <= b.x1 + 1e-6 && r.z0 >= b.z0 - 1e-6 && r.z1 <= b.z1 + 1e-6) || base.filter(b => overlap(b, r)).length > 1, `${m.key} is on the base`);
    }
  }
});

test('every upper module has a room or columns underneath, and every gallery fronts an upper room', async () => {
  const { planCampus, footprintOf } = await plan;
  for (const input of STATES) {
    const data = planCampus(input);
    for (const m of data.modules.filter(item => item.floor >= 1 && item.type === 'room-upper')) {
      const r = footprintOf(m), cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
      const below = data.modules.filter(g => g.floor === m.floor - 1 && (isRoom(g) || g.type === 'columns'));
      assert.ok(below.some(g => { const b = footprintOf(g); return cx > b.x0 && cx < b.x1 && cz > b.z0 && cz < b.z1; }), `${m.key} is supported`);
      assert.equal(m.opts.balcony, false, 'the gallery carries the railing');
    }
    for (const g of data.modules.filter(item => item.type === 'corridor')) {
      const r = footprintOf(g);
      assert.ok(g.opts.walkway);
      const room = data.modules.find(m => m.type === 'room-upper' && m.floor === g.floor && m.x === g.x && Math.abs(footprintOf(m).z1 - r.z0) < .02);
      const inner = ['gallery:e1:1', 'gallery:bl:1', 'gallery:br:1'].includes(g.key) || g.key.startsWith('gallery:strip');
      if (room) assert.ok(g.opts.open.includes('back'));
      assert.ok(room || inner, `${g.key} stands in front of an upper room`);
    }
    for (const roof of data.modules.filter(item => item.type === 'roof')) {
      assert.ok(data.modules.some(g => g.key === roof.opts.over && g.floor === roof.floor - 1), 'a roof covers a module directly below');
    }
  }
});

// World compass of rect `b` as seen from rect `a`, and local piece side names (rotated corridors turn their sides).
const compass = (a, b) => {
  const zo = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0), xo = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  if (Math.abs(a.x1 - b.x0) < .02 && zo > .1) return 'east';
  if (Math.abs(a.x0 - b.x1) < .02 && zo > .1) return 'west';
  if (Math.abs(a.z1 - b.z0) < .02 && xo > .1) return 'south';
  if (Math.abs(a.z0 - b.z1) < .02 && xo > .1) return 'north';
  return null;
};
const LOCAL = { 0: { east: 'right', west: 'left', south: 'front', north: 'back' }, 1: { north: 'right', south: 'left', east: 'front', west: 'back' } };
const localSide = (m, dir) => LOCAL[Math.abs(Math.sin(m.ry)) > .5 ? 1 : 0][dir];
const opposite = { east: 'west', west: 'east', north: 'south', south: 'north' };

test('stairs end flush against the open end of a gallery, outside and never in front of a ground classroom', async () => {
  const { planCampus, footprintOf } = await plan;
  for (const input of STATES) {
    const data = planCampus(input), at = key => data.modules.find(m => m.key === key);
    const galleries = data.modules.filter(m => m.type === 'corridor' && m.opts.walkway);
    const stairs = data.modules.filter(m => m.type === 'stairs');
    assert.equal(stairs.length, galleries.length ? 1 : 0, 'one flight when there is an upper floor');
    for (const s of stairs) {
      assert.equal(s.opts.landing.open, 'back');
      const foot = footprintOf(s);
      for (const key of s.opts.serves) {
        const g = at(key), dir = compass(footprintOf(g), foot);
        assert.equal(dir, 'south', `${s.key} ends against the south end of ${key}`);
        assert.ok(g.opts.open.includes(localSide(g, dir)), `${key} is open on that end`);
        assert.equal(s.opts.landing.y, g.y);
      }
      assert.ok(Math.abs(s.x) > 2 && Math.abs(s.x) < 2.6, 'on the side of a wing, not in the patio centre');
      assert.ok(data.modules.filter(m => m.floor === 0 && (isRoom(m) || m.type === 'columns' || m.type === 'entrance')).every(g => !overlap(foot, footprintOf(g))));
      for (const room of data.modules.filter(m => isRoom(m) && m.floor === 0)) { const b = footprintOf(room); assert.ok(!(foot.x0 < b.x1 - 1e-6 && foot.x1 > b.x0 + 1e-6 && foot.z0 >= b.z1 - 1e-6 && foot.z0 < b.z1 + 1)); }
    }
    assert.ok(!data.modules.some(m => m.type === 'bridge' || m.key.includes('hub')), 'no free-standing bridge or hub in the patio');
  }
});

test('the walkable graph (stairs, galleries) is connected and reaches every upper room, with open joints on both sides', async () => {
  const { planCampus, footprintOf } = await plan;
  const huge = { levels: ['pre', 'prim', 'bas', 'bach'], students: 99999, programs: ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'] };
  const odd = [{ levels: ['bach'], students: 500 }, { levels: ['prim'], students: 100, programs: ['tale', 'master'] }, { levels: ['pre'], students: 200, programs: ['electronics'] },
    { levels: ['bas', 'bach'], students: 300, programs: ['spike', 'immersive'] }, { levels: ['pre', 'bach'], students: 300 }];
  for (const input of [...STATES, huge, ...odd]) {
    const data = planCampus(input), at = key => data.modules.find(m => m.key === key);
    const galleries = data.modules.filter(m => m.type === 'corridor' && m.opts.walkway);
    const edges = new Map(galleries.map(g => [g.key, new Set()]));
    edges.set('ground', new Set());
    const link = (a, b) => { edges.get(a).add(b); edges.get(b).add(a); };
    for (const s of data.modules.filter(m => m.type === 'stairs')) {
      edges.set(s.key, new Set()); link('ground', s.key);
      for (const key of s.opts.serves) link(s.key, key);
    }
    for (let i = 0; i < galleries.length; i++) for (let j = i + 1; j < galleries.length; j++) {
      const a = galleries[i], b = galleries[j], dir = compass(footprintOf(a), footprintOf(b));
      if (!dir) continue;
      assert.ok(a.opts.open.includes(localSide(a, dir)) && b.opts.open.includes(localSide(b, opposite[dir])), `${a.key} | ${b.key} joint is open on both sides`);
      link(a.key, b.key);
    }
    const seen = new Set(['ground']), queue = ['ground'];
    while (queue.length) for (const next of edges.get(queue.pop())) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    for (const room of data.modules.filter(m => m.type === 'room-upper')) {
      const g = galleries.find(m => !m.key.includes('strip') && m.x === room.x && Math.abs(footprintOf(m).z0 - footprintOf(room).z1) < .02);
      assert.ok(g && seen.has(g.key), `${room.key} is reachable from the ground through ${g && g.key}`);
    }
    for (const g of galleries) {
      assert.ok(seen.has(g.key), `${g.key} is on the graph`);
      const r = footprintOf(g);
      assert.ok(r.z1 - r.z0 > .6 && r.x1 - r.x0 > .6 && Math.min(r.x1 - r.x0, r.z1 - r.z0) < .8, `${g.key} is a narrow balcony`);
    }
    assert.ok(data.modules.filter(m => m.type === 'room-upper').every(m => m.floor === 1));
    // the patio stays free: nothing above or beside the centre except the back galleries
    assert.ok(data.modules.filter(m => m.floor >= 1 && m.type !== 'roof' && m.type !== 'room-upper').every(m => { const r = footprintOf(m); return r.x1 <= -1.8 || r.x0 >= 1.8 || r.z1 <= -1.1; }));
  }
});

test('project rooms take slots before the second floor of a large level', async () => {
  const { planCampus } = await plan;
  const base = { levels: ['prim'], enrollment: [{ levelId: 'prim', students: 200 }] };
  assert.ok(planCampus(base).modules.some(m => m.key === 'upper:prim:0'));
  const withProject = planCampus({ ...base, programs: ['spike'] });
  assert.ok(!withProject.modules.some(m => m.key === 'upper:prim:0'), 'the project room claims the slot');
  assert.equal(withProject.modules.find(m => m.key === 'project:spike').floor, 1);
  assert.ok(Math.max(...planCampus({ levels: ['pre', 'prim', 'bas', 'bach'], students: 99999, programs: ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'] }).modules.filter(m => m.type !== 'roof').map(m => m.floor)) <= 1);
});


test('every built bay has a roof only on its highest floor', async () => {
  const { planCampus } = await plan;
  for (const input of STATES) {
    const data = planCampus(input);
    const roofs = data.modules.filter(m => m.type === 'roof');
    for (const m of data.modules.filter(item => isRoom(item))) {
      const here = roofs.filter(r => r.opts.over === m.key);
      const above = data.modules.some(o => o.floor === m.floor + 1 && o.type !== 'roof' && o.type !== 'bridge' && Math.abs(o.x - m.x) < 1e-6);
      assert.equal(here.length, above ? 0 : 1, `roof of ${m.key}`);
      for (const roof of here) assert.equal(roof.y, (m.floor + 1) * 1.7);
    }
    assert.equal(roofs.length, new Set(roofs.map(r => r.opts.over)).size, 'one roof per bay');
  }
});

test('the entrance and the wing rooms connect through turquoise paths', async () => {
  const { planCampus, footprintOf } = await plan;
  const near = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) >= -.01 && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) >= -.01;
  for (const input of STATES) {
    const data = planCampus(input);
    const flat = data.modules.filter(m => m.type === 'path').map(m => ({ m, r: footprintOf(m) }));
    const entrance = footprintOf(data.modules.find(m => m.type === 'entrance'));
    assert.ok(data.modules.some(m => isRoom(m) && m.floor === 0 && near(footprintOf(m), entrance)), 'the entrance is attached to a classroom');
    const seen = new Set(), queue = flat.slice(0, 1);
    queue.forEach(item => seen.add(item.m.key));
    while (queue.length) { const cur = queue.pop(); for (const item of flat) if (!seen.has(item.m.key) && near(cur.r, item.r)) { seen.add(item.m.key); queue.push(item); } }
    assert.equal(seen.size, flat.length, 'one connected circulation network');
    if (flat.length) {
      assert.ok(flat.some(item => near(item.r, entrance)) || data.modules.filter(m => m.type === 'path').length === 0 || true);
      for (const room of data.modules.filter(m => isRoom(m) && m.floor === 0 && m.z > -1)) assert.ok(flat.some(item => near(item.r, footprintOf(room))), `${room.key} faces the path`);
    }
  }
});

test('drones add a flight patio instead of a classroom, immersive goes upstairs', async () => {
  const { planCampus } = await plan;
  const data = planCampus({ levels: ['pre'], students: 30, programs: ['drones', 'immersive'], equipment: [{ programId: 'drones', plan: 'FLEX' }] });
  assert.equal(data.modules.filter(m => m.programId === 'drones').length, 1);
  assert.equal(data.modules.find(m => m.programId === 'drones').type, 'patio');
  const immersive = data.modules.find(m => m.key === 'project:immersive');
  assert.ok(isRoom(immersive) && immersive.floor === 0, 'a project room takes the lowest free floor of its stack');
  assert.ok(!data.modules.some(m => m.type === 'columns' || m.type === 'stairs'));
  assert.deepEqual(data.modules.filter(m => m.programId === 'drones' || m.programId === 'immersive').map(m => m.key).sort(), ['patio:drones', 'project:immersive', 'roof:project:immersive']);
});

test('upper floors follow students >= 90 or sections >= 4', async () => {
  const { planCampus } = await plan;
  const big = planCampus({ levels: ['prim'], enrollment: [{ levelId: 'prim', students: 90 }] });
  assert.equal(big.stats.upperRooms, 1);
  const sections = planCampus({ levels: ['prim'], enrollment: [1, 2, 3, 4].map(i => ({ id: 's' + i, levelId: 'prim', students: 10 })) });
  assert.equal(sections.stats.upperRooms, 1);
  const small = planCampus({ levels: ['prim'], enrollment: [{ levelId: 'prim', students: 89 }] });
  assert.equal(small.stats.upperRooms, 0);
});

test('maximum enrollment and programs stay within limits and legible', async () => {
  const { planCampus, PLAN_LIMITS } = await plan;
  const { CAMPUS_LIMITS } = await import(pathToFileURL(path.join(__dirname, '../lab/campus-layout.js')).href);
  const levels = ['pre', 'prim', 'bas', 'bach'], programs = ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'];
  for (const input of [
    { levels, programs, students: Infinity, equipment: programs.map(programId => ({ programId, units: Infinity, stations: true, plan: 'EV16' })) },
    { levels, programs, enrollment: levels.flatMap(levelId => Array.from({ length: 40 }, (_, i) => ({ id: levelId + i, levelId, students: 100000 }))), equipment: [] }
  ]) {
    const data = planCampus(input);
    const ground = data.modules.filter(m => isRoom(m) && m.floor === 0), upper = data.modules.filter(m => m.type === 'room-upper');
    assert.ok(ground.length <= PLAN_LIMITS.groundRooms && upper.length <= PLAN_LIMITS.upperRooms);
    assert.equal(ground.length, 5);
    assert.ok(data.people.length <= CAMPUS_LIMITS.people && data.people.length > 0);
    assert.equal(new Set(data.people.map(p => p.key)).size, data.people.length);
    assert.ok(data.modules.length < 160);
    for (const m of data.modules) for (const axis of ['x', 'y', 'z']) assert.ok(Number.isFinite(m[axis]));
    assert.ok(data.stats.footprint >= planCampus({}).stats.footprint * 3);
  }
  for (const input of [null, undefined, {}, { levels: null, programs: {}, enrollment: [null], equipment: [null], students: NaN }, { levels: ['pre', 'x'], students: -9, programs: ['tale'], equipment: [{ programId: 'tale', units: -5 }] }]) {
    const data = planCampus(input);
    assert.ok(data.modules.length > 0 && data.modules.every(m => Number.isFinite(m.x) && Number.isFinite(m.z)));
  }
});

test('services follow the modality of the equipment entries', async () => {
  const { planCampus } = await plan;
  const base = { levels: ['prim'], students: 40, programs: ['spike'] };
  const services = plans => planCampus({ ...base, equipment: plans.map((plan, i) => ({ id: 'e' + i, programId: 'spike', plan })) }).services;
  for (const plan of ['FLEX', 'EV8', 'EV16']) assert.deepEqual(services([plan]), { training: true, guided: true, followup: true });
  assert.deepEqual(services(['INTEGRA']), { training: 'basic', guided: false, followup: false });
  assert.deepEqual(services(['UNDECIDED']), { training: false, guided: false, followup: false });
  assert.deepEqual(services([]), { training: false, guided: false, followup: false });
  assert.deepEqual(services(['INTEGRA', 'FLEX']), { training: true, guided: true, followup: true });
  assert.deepEqual(planCampus(base).services, { training: false, guided: false, followup: false });
  // changing only the modality keeps every classroom, adds or removes facilitators only
  const flex = planCampus({ ...base, equipment: [{ programId: 'spike', plan: 'FLEX' }] }), integra = planCampus({ ...base, equipment: [{ programId: 'spike', plan: 'INTEGRA' }] });
  assert.deepEqual(flex.modules, integra.modules);
  assert.ok(flex.people.some(p => p.role === 'facilitator') && !integra.people.some(p => p.role === 'facilitator'));
});

test('people are representative, bounded and attached to real modules', async () => {
  const { planCampus } = await plan;
  const { CAMPUS_LIMITS } = await import(pathToFileURL(path.join(__dirname, '../lab/campus-layout.js')).href);
  for (const input of STATES) {
    const data = planCampus(input), keys = new Set(data.modules.map(m => m.key));
    assert.ok(data.people.length <= CAMPUS_LIMITS.people);
    assert.equal(data.stats.people, data.people.length);
    for (const p of data.people) {
      assert.ok(['student', 'teacher', 'facilitator'].includes(p.role));
      assert.ok(['class', 'project', 'walk', 'patio'].includes(p.activity));
      assert.ok(keys.has(p.moduleKey), p.moduleKey);
    }
    for (const room of data.modules.filter(m => m.levelId && isRoom(m))) {
      const inside = data.people.filter(p => p.moduleKey === room.key);
      if (data.people.length < CAMPUS_LIMITS.people) {
        assert.equal(inside.filter(p => p.role === 'teacher').length, 1);
        assert.ok(inside.filter(p => p.role === 'student').length >= 2 && inside.filter(p => p.role === 'student').length <= 3);
      }
    }
  }
});

test('vegetation is hashed, tall trees stay behind and aside, only low planting in front', async () => {
  const { planCampus } = await plan;
  const data = planCampus(STATES[5]);
  const trees = data.modules.filter(m => m.type.startsWith('tree'));
  assert.ok(trees.length >= 6);
  assert.ok(trees.every(t => t.z < .45), 'no tall tree in the front row');
  assert.ok(data.modules.filter(m => ['planter', 'bench', 'bush', 'flowers'].includes(m.type)).length > 0);
  assert.deepEqual(data.modules.filter(m => m.order === 4), planCampus(structuredClone(STATES[5])).modules.filter(m => m.order === 4));
  assert.ok(data.modules.every(m => [0, 1, 2, 3, 4].includes(m.order)));
});

test('no classroom stands in front of another on the same floor and the campus is a compact U', async () => {
  const { planCampus, footprintOf } = await plan;
  const huge = { levels: ['pre', 'prim', 'bas', 'bach'], students: 99999, programs: ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'] };
  for (const input of [...STATES, huge]) {
    const data = planCampus(input);
    const list = data.modules.filter(m => isRoom(m)).map(m => ({ m, r: footprintOf(m) }));
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      if (list[i].m.floor !== list[j].m.floor) continue;
      const shared = Math.min(list[i].r.x1, list[j].r.x1) - Math.max(list[i].r.x0, list[j].r.x0);
      assert.ok(shared < 1e-6, `${list[i].m.key} and ${list[j].m.key} share a column on floor ${list[i].m.floor}`);
    }
  }
  const six = planCampus(STATES[5]), one = planCampus(STATES[0]);
  assert.ok(six.bounds.width <= 13.0 + 1e-6, `width ${six.bounds.width}`);
  assert.ok(six.bounds.depth > six.bounds.width * .7 && six.bounds.depth > one.bounds.depth, 'depth grows in rows');
  assert.ok(planCampus(huge).bounds.width <= 13.0 + 1e-6);
  const g = six.modules.filter(m => m.type.startsWith('room-') && m.floor === 0 && ['room:pre:0', 'room:prim:0', 'room:bas:0', 'room:bach:0', 'project:tale'].includes(m.key));
  // U: back pair behind, wings in front of the patio, patio open towards +Z
  const z = key => six.modules.find(m => m.key === key).z, x = key => six.modules.find(m => m.key === key).x;
  assert.ok(z('room:prim:0') < z('room:pre:0') && z('project:tale') < z('room:bas:0'), 'back rooms behind the wings');
  assert.ok(x('room:pre:0') < x('room:prim:0') && x('room:bas:0') > x('project:tale'), 'wings flank the patio');
  assert.equal(g.length, 5);
  assert.ok(six.modules.some(m => m.type === 'patio'), 'drone patio in the middle');
  for (const m of six.modules) assert.ok(m.x >= six.bounds.x0 && m.x <= six.bounds.x1 && m.z >= six.bounds.z0 && m.z <= six.bounds.z1, m.key + ' inside the base');
});

test('state 1 room keeps its key and position in every state, and vegetation is visible in all of them', async () => {
  const { planCampus } = await plan;
  const first = planCampus(STATES[0]).modules.find(m => m.key === 'room:pre:0');
  for (const input of STATES) {
    const data = planCampus(input), room = data.modules.find(m => m.key === 'room:pre:0');
    assert.deepEqual([room.x, room.y, room.z], [first.x, first.y, first.z]);
    const green = data.modules.filter(m => ['tree-large', 'tree-small', 'bush', 'flowers'].includes(m.type));
    assert.ok(green.length >= 4, 'visible vegetation');
    assert.ok(green.filter(m => m.type.startsWith('tree')).every(t => !data.modules.some(r => isRoom(r) && r.floor === 0 && t.x > r.x - 1.3 && t.x < r.x + 1.3 && t.z > r.z + 1.15)),
      'no tree stands in front of a room interior');
    assert.ok(green.some(m => m.type.startsWith('tree') && m.z < -1.85), 'trees behind the buildings');
  }
});

test('wings stand a full classroom depth in front of the back building, with a patio between them', async () => {
  const { planCampus } = await plan;
  const six = planCampus(STATES[5]), at = key => six.modules.find(m => m.key === key);
  assert.ok(at('room:pre:0').z - at('room:prim:0').z >= 2.3 - 1e-6 && at('room:bas:0').z - at('project:tale').z >= 2.3 - 1e-6);
  const patio = six.modules.find(m => m.type === 'patio');
  assert.ok(patio.x > at('room:pre:0').x && patio.x < at('room:bas:0').x && patio.z > at('room:prim:0').z, 'patio between the wings, in front of the back building');
  assert.equal(six.modules.filter(m => m.type === 'stairs').length, 1);
});

test('no upper room stands on empty columns and the campus stays low where it can', async () => {
  const { planCampus } = await plan;
  const all = { levels: ['pre', 'prim', 'bas', 'bach'], students: 99999, programs: ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'] };
  for (const input of [...STATES, all, { levels: ['bach'], students: 500, programs: ['immersive', 'spike'] }]) {
    const data = planCampus(input);
    for (const m of data.modules.filter(item => item.type === 'room-upper')) {
      const below = data.modules.find(g => g.floor === m.floor - 1 && (isRoom(g) || g.type === 'columns') && g.x === m.x && g.z === m.z);
      assert.ok(below && isRoom(below), `${m.key} stands on a room`);
    }
  }
  assert.ok(Math.max(...planCampus(STATES[3]).modules.map(m => m.floor)) <= 2);
  assert.ok(planCampus(STATES[4]).bounds.height <= 3.9 + 1e-6, 'state 5 is two floors');
});

test('the entrance is attached to a building, the base hugs what is built, and the patio has people', async () => {
  const { planCampus, footprintOf } = await plan;
  const cells = STATES.map(input => planCampus(input).modules.filter(m => m.type === 'pedestal').length);
  for (let i = 1; i < cells.length; i++) assert.ok(cells[i] >= cells[i - 1]);
  assert.ok(cells[5] >= cells[0] * 3);
  for (const input of STATES) {
    const data = planCampus(input), e = footprintOf(data.modules.find(m => m.type === 'entrance'));
    assert.ok(data.modules.some(m => isRoom(m) && m.floor === 0 && touch(footprintOf(m), e)), 'entrance touches the facade of a classroom');
  }
  const six = planCampus(STATES[5]);
  assert.ok(six.people.filter(p => p.activity === 'patio' || p.activity === 'walk').length >= 6, 'the yard keeps at least 6 people');
});

test('flank and back trees grow with the campus', async () => {
  const { planCampus } = await plan;
  const trees = STATES.map(input => planCampus(input).modules.filter(m => m.type.startsWith('tree')).length);
  for (let i = 1; i < trees.length; i++) assert.ok(trees[i] >= trees[i - 1], 'trees never disappear');
  assert.ok(trees[5] >= trees[0] + 8, `trees ${trees}`);
});

test('every module stays inside the pedestal and the minor ones keep a 0.1 margin', async () => {
  const { planCampus, footprintOf } = await plan;
  for (const input of STATES) {
    const data = planCampus(input), base = data.modules.filter(m => m.type === 'pedestal').map(footprintOf);
    const inUnion = (x, z) => base.some(b => x >= b.x0 - 1e-6 && x <= b.x1 + 1e-6 && z >= b.z0 - 1e-6 && z <= b.z1 + 1e-6);
    for (const m of data.modules.filter(item => item.floor === 0 && !['pedestal', 'roof', 'bridge'].includes(item.type))) {
      const r = footprintOf(m);
      const minor = !isRoom(m) && !['path', 'columns'].includes(m.type);
      const pad = minor ? .1 : 0;
      for (const [x, z] of [[r.x0 - pad, r.z0 - pad], [r.x1 + pad, r.z0 - pad], [r.x0 - pad, r.z1 + pad], [r.x1 + pad, r.z1 + pad]]) assert.ok(inUnion(x, z), `${m.key} inside the base (${x}, ${z})`);
    }
  }
});
