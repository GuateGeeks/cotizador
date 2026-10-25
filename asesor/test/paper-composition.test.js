// Activity composition of the six growth states: props rest on their surfaces, nothing crosses a table,
// chair, wall or person, laptops face their users, every program device is visible from the overview and
// the focused-room cameras (tools/paper-activity-check.mjs), and the actor API stays backward compatible.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '../..');
const lab = file => import(pathToFileURL(path.join(root, 'asesor/lab', file)).href);

test('composed states pass the support, collision and visibility checks', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'gg-activity-'));
  try {
    let code = 0;
    try { execFileSync(process.execPath, [path.join(root, 'tools/paper-activity-check.mjs'), path.join(out, 'run')], { stdio: 'pipe' }); }
    catch (e) { code = e.status; }
    const report = JSON.parse(fs.readFileSync(path.join(out, 'run', 'report.json'), 'utf8'));
    assert.equal(code, 0, report.details.slice(0, 10).join('\n'));
    assert.equal(report.states.length, 6);
    for (const state of report.states) for (const v of state.visibility) {
      assert.ok(v.focus.visible >= report.targets.focus, `${state.n} ${v.name} focus ${v.focus.visible}`);
      if (v.overview.status !== 'NOT_RUN') assert.ok(v.overview.visible >= report.targets.overview, `${state.n} ${v.name} overview ${v.overview.visible}`);
    }
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});

test('meta.actors keeps its API and documents the new layout fields', async () => {
  const { createBuilder } = await lab('campus-kit.js');
  const { paperKit } = await lab('paper/kit.js');
  const { planCampus } = await lab('paper/plan.js');
  const { composeCampus } = await lab('paper/compose.js');
  const { stateInput } = await lab('paper/plan-fixtures.js');
  const b = createBuilder();
  b.base('solid');
  const meta = composeCampus(planCampus(stateInput(6))).build(b, paperKit(b));
  const { rooms, walkers, drones } = meta.actors;
  assert.ok(Array.isArray(walkers) && drones.length === 1);
  const keys = ['key', 'programId', 'levelId', 'kind', 'floor', 'teacher', 'facilitator', 'students', 'second', 'waiting', 'devices', 'seats', 'bench', 'holo', 'stations', 'relay', 'simultaneous', 'tables', 'service'];
  for (const room of rooms) {
    for (const key of keys) assert.ok(key in room, `${room.key}.${key}`);
    assert.ok(['class', 'project', 'vr'].includes(room.kind));
    assert.ok(['class', 'workbench', 'track', 'vr'].includes(room.layout));
    for (const d of room.devices) {
      for (const key of ['bone', 'home', 'set', 'body', 'hub']) assert.ok(key in d, `${room.key} device.${key}`);
      assert.ok(d.surface && Array.isArray(d.range) && d.scale > 1);
    }
    // Students the activity seats always have a seat; kneeling or standing groups live in `around`.
    for (const s of room.students) assert.ok(room.seats[s.seat], `${room.key} seat ${s.seat}`);
    if (room.layout === 'track') assert.ok(room.around.length >= 3 && room.students.length === 0);
    if (room.layout === 'workbench') assert.ok(room.students.length >= 2 && room.devices.length >= 1);
  }
  const drone = drones[0];
  for (const key of ['bone', 'home', 'props', 'host', 'units', 'pilots']) assert.ok(key in drone, `drone.${key}`);
  assert.equal(drone.pilots.length, 2);
  assert.ok(drone.pilots.every(p => p.controller && p.controller.parent === p.ctrl.root));
  // Bone names the activity and the x-ray rely on.
  const names = new Set(b.rig.bones.map(bone => bone.name));
  for (const name of ['project:master.t0', 'project:master.t0.dev', 'project:master.t0.mat', 'project:master.t0.lap', 'project:master.shelf', 'project:master.box', 'project:master.flag',
    'project:immersive.holo', 'project:tale.t0.dev', 'project:tale.track', 'room:prim:0.t0.lap', 'room:prim:0.t0.cs', 'room:prim:0.teacher', 'patio:drones.drone', 'patio:drones.drone.ctl', 'patio:drones.drone.ctl1']) {
    assert.ok(names.has(name), name);
  }
});
