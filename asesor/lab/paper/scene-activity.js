/**
 * Readable activities for the papercraft campus. Every activity is a pure
 * function of (run, u): `run` counts activity runs and `u` is seconds since the
 * run started (0..RUN). A run ends in a rest state that is the start of the next
 * one, so the scene can stop rendering at u = RUN and a rebuilt entity (or
 * reduced motion, or pause) simply shows the rest state of the current run:
 *   students type seated or test the robot on the project table;
 *   the facilitator (plan.services.guided) walks between the tables;
 *   the drone takes off, flies over its patio and lands;
 *   visor wearers explore the hologram;
 *   separate schedules with several groups: one group leaves and the next sits
 *   at the same stations (kits stay put); simultaneous groups work at a second set;
 *   stations: students rotate to the next pad;
 *   walkers go from the entrance to a classroom door and back, on the paths.
 */
import { clamp, span, smooth } from '../campus-kit.js';
import { applyPose, placePerson, POSES, reach, blendBody, mixPose, along, turnTo } from '../campus-people.js';
import { SCALE } from './kit.js';

export const RUN = 13;
const SIT = SCALE.seat + .02;
const typed0 = POSES.type(0);

/** Amplitude of ongoing work: ramps in, fades out so the run ends at rest. */
const amp = u => span(u, .2, 1) * (1 - span(u, RUN - 1.6, RUN));

function seatedPose(ctrl, u, phase, project, lean = 0) {
  const a = amp(u);
  const upper = project ? reach(.1 + lean * .2 * a, 'B') : mixPose(typed0, POSES.type(u + phase), a);
  applyPose(ctrl, blendBody(POSES.sit(), upper), 'sit', SIT);
}
const route = (a, b) => [[a.x, a.z], [0, a.z], [0, b.z], [b.x, b.z]];

/** Walk from `a` to `b` through the centre aisle during [t0, t1]; returns true when travelling. */
function travel(ctrl, a, b, u, t0, t1, floor, seated) {
  const k = clamp((u - t0) / (t1 - t0));
  if (k <= 0 || k >= 1) {
    const at = k <= 0 ? a : b;
    placePerson(ctrl, at.x, at.z, at.ry, floor);
    return false;
  }
  const pts = route(a, b), pos = along(pts, smooth(k));
  const turn = k < .12 ? turnTo(a.ry, pos.heading, k / .12) : k > .88 ? turnTo(pos.heading, b.ry, (k - .88) / .12) : pos.heading;
  placePerson(ctrl, pos.x, pos.z, turn, floor);
  applyPose(ctrl, POSES.walk(u * 9, 1));
  return true;
}

const mod = (x, n) => ((x % n) + n) % n;

function tickRoom(room, run, u, T) {
  const floor = room.floor, seats = room.seats, a = amp(u);
  const sitters = [...room.students, ...room.second];
  const rotate = room.stations && sitters.length > 1;
  const slotOf = (person, k) => rotate ? sitters[mod(sitters.indexOf(person) + k, sitters.length)].seat : person.seat;
  const moveWindow = [RUN * .45, RUN * .7];
  const relay = room.relay && room.waiting.length > 0;
  for (const person of sitters) {
    if (relay && room.students.includes(person)) continue;
    const from = seats[slotOf(person, run - 1)], to = seats[slotOf(person, run)];
    if (rotate && from !== to) {
      if (travel(person.ctrl, from, to, u, moveWindow[0], moveWindow[1], floor)) continue;
      const at = u < moveWindow[0] ? from : to;
      placePerson(person.ctrl, at.x, at.z, at.ry, floor);
    } else placePerson(person.ctrl, to.x, to.z, to.ry, floor);
    if (person.vr) {
      applyPose(person.ctrl, mixPose(POSES.vr(1.2, person.k), POSES.vr(T + person.k, person.k), a));
      continue;
    }
    const idx = person.seat, here = seats[idx];
    seatedPose(person.ctrl, u, idx * 1.7, room.kind === 'project', room.devices.length ? Math.sin(u * 1.3 + idx) : 0);
    if (room.kind === 'project') {
      // Look toward the robot being tested.
      const dev = room.devices.find(d => d.set === (here.set ?? 0));
      if (dev) person.ctrl.joints.head.rotation.set(.3, clamp((dev.bone.position.x - here.x) * 1.4, -.5, .5) * (here.ry ? -1 : 1) * a, 0);
    }
  }
  if (relay) {
    // Separate schedules: one group leaves and the next sits at the same stations.
    // Even runs end with the first group seated; odd runs with the waiting group.
    const firstStartsSeated = mod(run - 1, 2) === 0;
    room.students.forEach((p, i) => relayMove(p, i, firstStartsSeated, [RUN * .22, RUN * .5], u, floor, seats[p.seat], room.bench[i % room.bench.length]));
    room.waiting.forEach((p, i) => {
      const host = room.students[i % room.students.length];
      relayMove(p, i, !firstStartsSeated, [RUN * .3, RUN * .58], u, floor, seats[host ? host.seat : i], room.bench[i % room.bench.length]);
    });
  }
  // Devices: the robot (and its body with it) is driven across the table and back.
  for (const d of room.devices) {
    const go = span(u, .8 + d.set * .9, 8.8 + d.set * .9), wave = Math.sin(go * Math.PI);
    d.bone.position.set(d.home[0] + wave * (d.set ? -.14 : .16), d.home[1], d.home[2] + wave * .12);
    d.bone.rotation.y = d.home[3] + Math.sin(go * Math.PI * 2) * .55;
    if (d.hub) d.hub.rotation.y = go * Math.PI * 4 * (run % 2 ? 1 : -1);
  }
  if (room.holo) {
    room.holo.rotation.y = .6 + T * .5;
    room.holo.position.y = room.holo.userData.rest.position.y + Math.sin(T * 1.4) * .03;
  }
  if (room.service) {
    // Teachers at the second table: preparing kits (training) or typing on a laptop (follow-up).
    for (const t of room.service.teachers) {
      const s = seats[t.seat];
      placePerson(t.ctrl, s.x, s.z, s.ry, floor);
      const upper = room.service.kind === 'training' ? mixPose(reach(.1, 'B'), reach(.35, 'B'), .5 + .5 * Math.sin(u * 1.2 + t.seat) * a) : mixPose(typed0, POSES.type(u), a);
      applyPose(t.ctrl, blendBody(POSES.sit(), upper), 'sit', SIT);
    }
  }
  if (room.teacher) {
    const t = room.teacher;
    placePerson(t.ctrl, t.home[0], t.home[1], t.ry + Math.sin(u * .8) * .15 * a, floor);
    applyPose(t.ctrl, POSES.point(.3 + Math.sin(u * 1.1) * .25 * a));
  }
  if (room.facilitator) {
    // Walks to the second table, helps for a while and comes back.
    const f = room.facilitator, home = { x: f.home[0], z: f.home[1], ry: f.ry }, away = { x: .02, z: .62, ry: Math.PI * .5 + .6 };
    if (u < 2.2) { placePerson(f.ctrl, home.x, home.z, home.ry, floor); applyPose(f.ctrl, reach(.25, 'R')); }
    else if (u < 5) travel(f.ctrl, home, away, u, 2.2, 5, floor);
    else if (u < 9) { placePerson(f.ctrl, away.x, away.z, away.ry, floor); applyPose(f.ctrl, reach(.2 + Math.sin(u * 1.4) * .08, 'R')); }
    else if (u < 11.8) travel(f.ctrl, away, home, u, 9, 11.8, floor);
    else { placePerson(f.ctrl, home.x, home.z, home.ry, floor); applyPose(f.ctrl, reach(.25, 'R')); }
  }
}

function relayMove(p, i, startAtSeat, win, u, floor, seat, spot) {
  const S = { x: seat.x, z: seat.z, ry: seat.ry }, B = { x: spot.x, z: spot.z, ry: spot.ry };
  const from = startAtSeat ? S : B, to = startAtSeat ? B : S;
  if (travel(p.ctrl, from, to, u, win[0], win[1], floor)) return;
  const at = u < win[0] ? from : to;
  placePerson(p.ctrl, at.x, at.z, at.ry, floor);
  if (at === S) seatedPose(p.ctrl, u, i * 1.7, true);
  else applyPose(p.ctrl, blendBody(POSES.sit(), u > RUN * .62 && u < RUN * .62 + 1.2 ? POSES.wave(u) : POSES.stand()), 'sit', SIT);
}

function tickDrones(actors, run, u) {
  for (const d of actors.drones) {
    const fly = span(u, 1, 2.4) * (1 - span(u, 9.4, 11.4));
    const phase = span(u, 2.4, 9.4) * Math.PI * 2;
    const loop = Math.min(1, Math.max(0, fly));
    const x = Math.sin(phase) * .95 * loop, z = Math.sin(phase * 2) * .3 * loop;
    d.bone.position.set(d.home[0] + x, .08 + fly * (.8 + Math.sin(phase * 2) * .05), d.home[2] + z);
    d.bone.rotation.y = .3 + Math.cos(phase) * .6 * loop;
    d.world = [d.host.x + d.bone.position.x, d.host.z + d.bone.position.z];
    const spin = span(u, .6, 1.4) * (1 - span(u, 11.4, 12.4));
    d.props.forEach((prop, i) => { prop.rotation.y = u * (i % 2 ? 50 : -50) * spin + (spin ? 0 : .4); });
  }
}

/** Paths from the entrance to every ground classroom, from the plan's own paths. */
export function walkerWorld(plan) {
  const mods = plan.modules || [];
  const entrance = mods.find(m => m.type === 'entrance') || { x: 0, z: 2 };
  const spine = mods.filter(m => m.key.startsWith('path:spine:'));
  const spineZ = spine.length ? spine[0].z : 1;
  const rooms = mods.filter(m => m.type.startsWith('room-') && m.type !== 'room-upper' && (m.y || 0) < .5);
  const doors = new Map(mods.filter(m => m.key.startsWith('path:door:')).map(m => [m.key.slice('path:door:'.length), m]));
  const dests = rooms.map(room => {
    const door = doors.get(room.key);
    if (door) return { x: door.x, z: door.z - door.opts.d / 2 + .3, ry: Math.PI, room };
    return { x: room.x + .5, z: room.z + 1.2 + .3, ry: Math.PI, room };
  });
  return { gate: [entrance.x, entrance.z - .1], spineZ, dests };
}

function tickWalkers(actors, run, u, world, drones) {
  actors.walkers.forEach((w, i) => {
    const { ctrl } = w;
    if (w.kind === 'walk' && world.dests.length) {
      const dest = world.dests[(i >> 1) % world.dests.length], lane = (i % 2 ? .14 : -.14) + (i % 3) * .08;
      const pts = [[world.gate[0] + lane, world.gate[1]], [world.gate[0] + lane, world.spineZ + lane], [dest.x + lane, world.spineZ + lane], [dest.x + lane, dest.z]];
      // Even runs end at the classroom door, odd runs back at the entrance.
      const outbound = run % 2 === 0, path = outbound ? pts : pts.slice().reverse();
      const t0 = 1 + (i % 4) * .4, t1 = RUN - 2.6 + (i % 4) * .15, k = clamp((u - t0) / (t1 - t0));
      const at = along(path, k), walking = k > 0 && k < 1;
      const heading = walking ? at.heading : k <= 0 ? Math.PI : outbound ? Math.PI + Math.sin(u * .8) * .3 * (1 - span(u, RUN - 1, RUN)) : 0;
      placePerson(ctrl, at.x, at.z, heading, 0);
      applyPose(ctrl, walking ? POSES.walk(u * 9 + i, 1) : k >= 1 && outbound && u > t1 + .3 && u < RUN - .8 ? POSES.wave(u) : POSES.stand());
      return;
    }
    if (w.sit) {
      // Seated on a bench: stays put, claps when the drone lands.
      const drone = drones[0], ry = w.sit.ry;
      placePerson(ctrl, w.sit.x, w.sit.z, drone?.world ? turnTo(ry, Math.atan2(drone.world[0] - w.sit.x, drone.world[1] - w.sit.z), .5 * span(u, 1, 2)) : ry, 0);
      const landed = u > 10.6 && u < RUN - .6;
      applyPose(ctrl, blendBody(POSES.sit(), landed ? POSES.clap(u) : POSES.stand()), 'sit', SIT - SCALE.seat + SCALE.bench);
      return;
    }
    // Patio group: watches the drone; cheers when it lands.
    const [x, z] = w.spot, drone = drones[0];
    const facing = w.facing ?? (w.facing = ctrl.root.rotation.y);
    const heading = drone?.world ? turnTo(facing, Math.atan2(drone.world[0] - x, drone.world[1] - z), .85 * span(u, 1, 2)) : facing;
    placePerson(ctrl, x, z, heading, 0);
    const landed = u > 10.6 && u < RUN - .6;
    applyPose(ctrl, landed ? POSES.clap(u) : !drone && u > 3 + i && u < 6 + i ? POSES.wave(u) : POSES.stand());
  });
}

/** Pose everything an entity animates for state (run, u). */
export function tickActors(actors, run, u, world, drones = []) {
  if (!actors) return;
  const T = (run - 1) * RUN + u;
  if (actors.rooms) actors.rooms.forEach(room => tickRoom(room, run, u, T));
  if (actors.drones?.length) tickDrones(actors, run, u);
  if (actors.walkers?.length) tickWalkers(actors, run, u, world, actors.drones?.length ? actors.drones : drones);
}
