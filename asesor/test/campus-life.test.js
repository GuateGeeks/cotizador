'use strict';
// Ambient life of the campus (asesor/lab/paper/scene-activity.js), in Node without WebGL:
// determinism, the calm state for reduced motion, events, and clipping over time
// (people through tables, walls, each other; hands through table tops; robots off tables).
const test = require('node:test');
const assert = require('node:assert/strict');

const lab = '../lab';
const load = async () => ({
  kit: await import(`${lab}/campus-kit.js`),
  paper: await import(`${lab}/paper/kit.js`),
  plan: await import(`${lab}/paper/plan.js`),
  compose: await import(`${lab}/paper/compose.js`),
  fixtures: await import(`${lab}/paper/plan-fixtures.js`),
  life: await import(`${lab}/paper/scene-activity.js`),
  three: await import('three')
});

async function campus(n) {
  const m = await load();
  const plan = m.plan.planCampus(m.fixtures.stateInput(n));
  const b = m.kit.createBuilder(); b.base('solid');
  const p = m.paper.paperKit(b);
  const meta = m.compose.composeCampus(plan).build(b, p);
  const group = b.finish({});
  meta.afterFinish?.(group);
  m.life.bindLife(meta.actors, group.userData.rig);
  return { m, plan, meta, group, actors: meta.actors, world: m.life.walkerWorld(plan), bones: group.userData.rig.bones };
}
const snapshot = bones => bones.map(bone => [bone.position.x, bone.position.y, bone.position.z, bone.rotation.x, bone.rotation.y, bone.rotation.z].map(v => Math.round(v * 1e7) / 1e7).join(',')).join(';');
const peopleOf = actors => {
  const out = [];
  for (const room of actors.rooms) {
    const staff = [room.teacher, room.facilitator, ...(room.service?.teachers || [])].filter(Boolean);
    for (const p of [...room.students, ...room.second, ...room.waiting, ...(room.around || []), ...staff]) out.push({ room, ctrl: p.ctrl, staff: staff.includes(p) });
  }
  return out;
};

test('the same actors at the same time give the same pose, whatever was shown before', async () => {
  const a = await campus(6), b = await campus(6);
  for (let T = 0; T <= 97; T += 1 / 30) a.m.life.tickLife([a.actors], T, a.world, { since: T - 1 / 30 });
  b.m.life.tickLife([b.actors], 500, b.world);
  b.m.life.tickLife([b.actors], 97, b.world);
  a.m.life.tickLife([a.actors], 97, a.world);
  assert.equal(snapshot(a.bones), snapshot(b.bones), 'pose at T = 97 does not depend on the history');
  b.m.life.tickLife([b.actors], 97.6, b.world);
  assert.notEqual(snapshot(a.bones), snapshot(b.bones), 'time moves the campus');
});

test('the campus keeps changing: frames 1.8 s apart differ in every room kind and the yard', async () => {
  const c = await campus(6);
  const groups = new Map();
  for (const room of c.actors.rooms) groups.set(room.key, [...room.students, ...room.second, ...(room.around || []), room.teacher, room.facilitator].filter(Boolean).map(p => p.ctrl));
  groups.set('yard', [...c.actors.walkers.map(w => w.ctrl), ...c.actors.drones.flatMap(d => (d.pilots || []).map(p => p.ctrl))]);
  const pose = ctrls => ctrls.map(ctrl => Object.values(ctrl.joints).concat(ctrl.root).map(j => [j.position.x, j.position.z, j.rotation.x, j.rotation.y, j.rotation.z].map(v => v.toFixed(4)).join()).join()).join('|');
  for (let T = 30; T < 150; T += 1.8) {
    c.m.life.tickLife([c.actors], T, c.world);
    const before = new Map([...groups].map(([k, ctrls]) => [k, pose(ctrls)]));
    c.m.life.tickLife([c.actors], T + 1.8, c.world);
    for (const [k, ctrls] of groups) assert.notEqual(pose(ctrls), before.get(k), `${k} moves between ${T.toFixed(1)} and ${(T + 1.8).toFixed(1)} s`);
  }
});

test('reduced motion: a calm, stable final state with robots and the drone at home', async () => {
  const c = await campus(6);
  c.m.life.tickLife([c.actors], 77, c.world);
  c.m.life.tickLife([c.actors], 0, c.world, { still: true });
  const first = snapshot(c.bones);
  c.m.life.tickLife([c.actors], 300, c.world, { still: true });
  assert.equal(snapshot(c.bones), first, 'the still state does not depend on time');
  for (const room of c.actors.rooms) for (const d of room.devices) assert.deepEqual([d.bone.position.x, d.bone.position.z], [d.home[0], d.home[2]]);
  for (const d of c.actors.drones) assert.ok(Math.abs(d.bone.position.y - (d.hover ?? .08)) < .02, 'the drone rests at its hover height (or on its pad)');
});

test('big moments are reported once: robots reach their goal, the drone lands', async () => {
  const c = await campus(6);
  const events = [];
  let prev = null;
  for (let T = 0; T < 120; T += 1 / 30) { events.push(...c.m.life.tickLife([c.actors], T, c.world, { since: prev })); prev = T; }
  const count = kind => events.filter(e => e.kind === kind).length;
  assert.ok(count('goal') >= 6, `robots reach their goal (${count('goal')})`);
  assert.ok(count('landing') >= 3 && count('landing') <= 4, `the drone lands every 32 s (${count('landing')})`);
  assert.ok(count('works') >= 3, `the electronics circuit works (${count('works')})`);
});

for (const n of [3, 4, 5, 6]) {
  test(`state ${n}: nobody walks through tables, walls, the hologram or each other; hands stay above table tops`, async () => {
    const c = await campus(n), { Vector3 } = c.m.three;
    const people = peopleOf(c.actors), problems = new Set(), v = new Vector3();
    const { CATALOG } = await import(`${lab}/paper/catalog.js`);
    const sizeOf = id => CATALOG.find(piece => piece.id === id).size;
    // Furniture on the floor that is not in the actors: shelves and kit boxes.
    const furniture = new Map(c.actors.rooms.map(room => [room, [['shelf', 'shelf'], ['box', 'kit-box']].map(([suffix, id]) => {
      const bone = c.group.userData.rig.get(`${room.key}.${suffix}`);
      return bone && { name: suffix, x: bone.position.x, z: bone.position.z, ry: bone.rotation.y, ...sizeOf(id) };
    }).filter(Boolean)]));
    const groundRooms = c.plan.modules.filter(m => m.type.startsWith('room-') && (m.y || 0) < .5);
    const BODY = .08;
    // Table tops (compose's `tops`, or the catalog table around each centre).
    const topsOf = room => room.kind === 'vr' ? [] : room.tops?.length ? room.tops.map(t => ({ ...t, h: t.y - room.floor }))
      : room.tables.map(tb => ({ x: tb[0], z: tb[2], x0: tb[0] - .45, x1: tb[0] + .45, z0: tb[2] - .275, z1: tb[2] + .275, h: .36 }));
    const note = (T, text) => { if (problems.size < 12) problems.add(`${T.toFixed(2)} s: ${text}`); };
    for (let T = 0; T < 260; T += .25) {
      c.m.life.tickLife([c.actors], T, c.world);
      c.group.updateMatrixWorld(true);
      for (const room of c.actors.rooms) {
        const here = people.filter(p => p.room === room);
        for (const p of here) {
          const { x, z } = p.ctrl.root.position;
          for (const top of topsOf(room)) {
            if (x > top.x0 - BODY + .02 && x < top.x1 + BODY - .02 && z > top.z0 - BODY + .02 && z < top.z1 + BODY - .02) note(T, `${p.ctrl.id} inside table at ${top.x},${top.z}`);
          }
          if (Math.abs(x) > 1.27 - BODY || z < -1.15 + BODY || z > 1.2) note(T, `${p.ctrl.id} outside the room walls (${x.toFixed(2)}, ${z.toFixed(2)})`);
          for (const f of furniture.get(room)) {
            const dx = x - f.x, dz = z - f.z, cos = Math.cos(f.ry), sin = Math.sin(f.ry);
            if (Math.abs(dx * cos - dz * sin) < f.w / 2 + BODY - .02 && Math.abs(dx * sin + dz * cos) < f.d / 2 + BODY - .02) note(T, `${p.ctrl.id} inside the ${f.name}`);
          }
          const holo = room.holoCentre ? { x: room.holoCentre[0], z: room.holoCentre[1] } : room.holo?.parent?.position;
          if (holo && Math.hypot(x - holo.x, z - holo.z) < .3) note(T, `${p.ctrl.id} inside the hologram`);
          // Hands (forearm tips) and heads never sink into a table top.
          const toRoom = point => p.ctrl.root.parent.worldToLocal(point);
          for (const side of ['foreL', 'foreR']) {
            v.set(0, -.15 * (p.ctrl.scale || .8), 0).applyMatrix4(p.ctrl.joints[side].matrixWorld); toRoom(v);
            for (const top of topsOf(room)) if (v.x > top.x0 + .01 && v.x < top.x1 - .01 && v.z > top.z0 + .01 && v.z < top.z1 - .01 && v.y < room.floor + top.h - .005) note(T, `${p.ctrl.id} ${side} inside table top (y ${v.y.toFixed(3)})`);
          }
        }
        for (let i = 0; i < here.length; i++) for (let j = i + 1; j < here.length; j++) {
          const a = here[i].ctrl.root.position, b = here[j].ctrl.root.position;
          if (Math.hypot(a.x - b.x, a.z - b.z) < .2) note(T, `${here[i].ctrl.id} and ${here[j].ctrl.id} overlap (${Math.hypot(a.x - b.x, a.z - b.z).toFixed(3)})`);
        }
        for (const d of room.devices) {
          // The device's mount stays on its surface (table, mat or track).
          const sf = d.surface || topsOf(room)[d.set] || topsOf(room)[0];
          if (sf && (d.bone.position.x < sf.x0 || d.bone.position.x > sf.x1 || d.bone.position.z < sf.z0 || d.bone.position.z > sf.z1)) note(T, `${d.bone.name} off its surface`);
          if (d.range && (Math.abs(d.bone.position.x - d.home[0]) > d.range[0] + 1e-6 || Math.abs(d.bone.position.z - d.home[2]) > d.range[1] + 1e-6)) note(T, `${d.bone.name} beyond its range`);
          // Nobody stands on a device moving on the floor (Tale-Bot track).
          if (room.track) for (const p of here) if (Math.hypot(p.ctrl.root.position.x - d.bone.position.x, p.ctrl.root.position.z - d.bone.position.z) < .3) note(T, `${p.ctrl.id} on the robot`);
        }
      }
      const walkers = c.actors.walkers;
      for (const w of walkers) {
        const { x, z } = w.ctrl.root.position;
        const inside = groundRooms.find(m => Math.abs(x - m.x) < 1.3 - BODY && Math.abs(z - m.z) < 1.15 - BODY);
        if (inside) note(T, `${w.ctrl.id} walks inside ${inside.key}`);
      }
      for (let i = 0; i < walkers.length; i++) for (let j = i + 1; j < walkers.length; j++) {
        const a = walkers[i].ctrl.root.position, b = walkers[j].ctrl.root.position;
        if (Math.hypot(a.x - b.x, a.z - b.z) < .2) note(T, `${walkers[i].ctrl.id} and ${walkers[j].ctrl.id} overlap in the yard`);
      }
    }
    assert.deepEqual([...problems], []);
  });
}

test('ticking 40 people stays cheap (state 6, Node)', async () => {
  const c = await campus(6);
  const times = [];
  let prev = null;
  for (let T = 0; T < 120; T += 1 / 30) { const a = performance.now(); c.m.life.tickLife([c.actors], T, c.world, { since: prev }); times.push(performance.now() - a); prev = T; }
  times.sort((a, b) => a - b);
  const avg = times.reduce((s, x) => s + x, 0) / times.length, p95 = times[Math.floor(times.length * .95)];
  assert.equal(c.bones.filter(bone => bone.name.endsWith('.hips')).length, 40);
  assert.ok(avg < 3 && p95 < 6, `tick cost avg ${avg.toFixed(3)} ms, p95 ${p95.toFixed(3)} ms`);
});

test('tickActors keeps its former signature on one continuous clock', async () => {
  const a = await campus(4), b = await campus(4);
  a.m.life.tickActors(a.actors, 3, 5.5, a.world);
  b.m.life.tickLife([b.actors], 2 * a.m.life.RUN + 5.5, b.world);
  assert.equal(snapshot(a.bones), snapshot(b.bones));
});
