/**
 * Composition: turns a growth plan (plan.js) into one buildable piece made of
 * catalog pieces, furnishing classrooms and project rooms from their anchors
 * and seating the representative people. Used by the inspector to show the six
 * growth states before the campus scene integrates the same modules.
 */
import { hash } from '../campus-kit.js';
import { addPerson, applyPose, POSES, blendBody, reach } from '../campus-people.js';
import { CATALOG } from './catalog.js';
import * as PEOPLE from './pieces-people.js';
import { newMeta, SCALE, stage } from './kit.js';
const NO_SHADOW = new Set(['furniture', 'tech', 'people', 'nature']);
// Ground-level pieces never need to cast into the shadow map.
const GROUND_TYPES = new Set(['pedestal', 'patio', 'path', 'steps']);
import { CAMPUS_LIMITS } from '../campus-layout.js';

const byId = new Map(CATALOG.map(piece => [piece.id, piece]));
const ROOMS = new Set(['room-initial', 'room-extendable', 'room-corner', 'room-end', 'room-upper']);
/** Device on the project table: the catalog technology, recognisable by its shape. */
const DEVICE = { tale: 'robot-tale', master: 'robot-dino', spike: 'kit-spike', electronics: 'electronics' };
// Programming is part of the robotics activity, never a separate service.
/** Assembly order for pieces that declare no stage: connections 3, exterior and furniture 4. */
const DEFAULT_STAGE = { links: 3, nature: 4, furniture: 4, tech: 4 };
/** Colour of each programme on its track mat and pennant (paper palette). */
const PROGRAM_TONE = { tale: 'yellow', master: 'lime', spike: 'pink', electronics: 'blue', immersive: 'violetLight', drones: 'orange' };
const LAPTOP = { master: true, spike: true, electronics: false, tale: false };

/**
 * `only` (Set of module keys) restricts the composition to those modules and the
 * people hosted by them, so the scene can build one bay or one group of
 * connections at a time. `meta.actors` exposes what the scene animates.
 */
export function composeCampus(plan, { furnish = true, people = true, only = null } = {}) {
  return {
    id: 'campus', label: 'Campus', group: 'campus',
    build(b, p) {
      const meta = newMeta({ missing: [] }), afters = [];
      const actors = meta.actors = { rooms: [], walkers: [], drones: [] };
      const inScope = key => !only || only.has(key);
      const sharing = id => plan.normalized?.equipment?.[id] || { sharingModes: [], groupIds: [], simIds: [], units: 0, stations: false };
      // Services live inside existing rooms: training in the project room nearest the entrance,
      // follow-up in the lowest-level ground room (a teacher with a laptop).
      const entrance = (plan.modules || []).find(m => m.type === 'entrance') || { x: 0, z: 2 };
      const roomsAll = (plan.modules || []).filter(m => ROOMS.has(m.type) && !m.empty);
      const nearest = list => list.sort((a, c) => Math.hypot(a.x - entrance.x, a.z - entrance.z) + (a.y || 0) * 2 - Math.hypot(c.x - entrance.x, c.z - entrance.z) - (c.y || 0) * 2)[0];
      const LEVEL_RANK = { pre: 0, prim: 1, bas: 2, bach: 3 };
      const serviceRoom = {
        training: plan.services?.training ? nearest(roomsAll.filter(m => m.programId && m.programId !== 'drones' && m.programId !== 'immersive'))?.key : null,
        followup: plan.services?.followup ? roomsAll.filter(m => !m.programId && (m.y || 0) < .5).sort((a, c) => (LEVEL_RANK[a.levelId] ?? -1) - (LEVEL_RANK[c.levelId] ?? -1))[0]?.key : null
      };
      // Service teachers count against the people limit: the last walkers (by key) make room for them.
      const serviceCount = (serviceRoom.training ? 2 : 0) + (serviceRoom.followup ? 1 : 0);
      const walkKeys = (plan.people || []).filter(w => w.activity === 'walk' || w.activity === 'patio').map(w => w.key).sort().reverse();
      const excess = Math.max(0, (plan.people || []).length + serviceCount - CAMPUS_LIMITS.people);
      const dropped = new Set(walkKeys.slice(0, excess));
      let extraBudget = Math.max(0, CAMPUS_LIMITS.people - ((plan.people || []).length - dropped.size) - serviceCount);
      const addPersonFn = typeof PEOPLE.addPaperPerson === 'function' ? PEOPLE.addPaperPerson : addPerson;

      function place(type, key, parent, x, y, z, ry = 0, opts = {}) {
        const piece = byId.get(type);
        if (!piece) { if (!meta.missing.includes(type)) meta.missing.push(type); return null; }
        const bone = b.rig.add(key, parent, x, y, z);
        bone.rotation.y = ry; bone.userData.rest.quaternion.copy(bone.quaternion);
        b.bone(bone);
        // Budget (the shadow pass counts): only architecture casts into the shadow map;
        // props, people and plants keep their contact shadows instead.
        const soft = NO_SHADOW.has(piece.group) || GROUND_TYPES.has(type);
        if (soft) b.base('soft');
        const sub = piece.build(b, p, { ...(piece.opts || {}), ...opts, id: key, parent: bone }) || newMeta();
        if (soft) b.base('solid');
        b.bone(b.rig.root);
        meta.staged.push(...(sub.staged || []));
        // Pieces without their own assembly stage pop in with their group's step.
        if (!(sub.staged || []).length && DEFAULT_STAGE[piece.group]) stage(meta, bone, DEFAULT_STAGE[piece.group], 'pop');
        if (typeof sub.afterFinish === 'function') afters.push(sub.afterFinish);
        return { bone, meta: sub };
      }

      function person(spec, poseFn) {
        b.base('soft');
        const ctrl = addPersonFn(b, spec);
        b.base('solid');
        b.layer('main').bone(b.rig.root);
        stage(meta, ctrl.root, 5, 'pop');
        if (poseFn) afters.push(() => poseFn(ctrl));
        return ctrl;
      }

      const seatedBy = new Map();
      for (const who of plan.people || []) {
        if (who.activity === 'walk' || who.activity === 'patio' || !inScope(who.moduleKey)) continue; // placed outside, below
        if (!seatedBy.has(who.moduleKey)) seatedBy.set(who.moduleKey, []);
        seatedBy.get(who.moduleKey).push(who);
      }

      /** Paper pennant on a slim pole in the front-right corner, inside the room walls. */
      function addPennant(m, parent, floor) {
        const bone = b.rig.add(m.key + '.flag', parent, 1.12, floor, .85);
        b.bone(bone);
        const hex = p.PAPER[PROGRAM_TONE[m.programId]] || p.PAPER.orange;
        p.prism(0, 0, 0, 4, .016, 1.3, p.PAPER.ink, { top: false });
        p.card(-.2, 1.12, 0, .4, .2, .012, hex, { thin: 'z' });
        p.card(-.46, 1.12, 0, .12, .2, .012, p.edgeTone(hex, .5), { thin: 'z' });
        b.bone(b.rig.root);
        stage(meta, bone, 4, 'pop');
      }

      function furnishRoom(m, room) {
        const a = room.meta.anchors || {}, parent = room.bone;
        // Two staggered tables inside the walls (inner x ±1.27); chairs in front and behind
        // each table, so no chair reaches a wall or another table's chair.
        const floor = (a['table-a'] || [0, .1, 0])[1];
        const tables = [[-.6, floor, -.1], [.6, floor, .45]];
        const occupants = seatedBy.get(m.key) || [];
        const project = m.programId && m.programId !== 'drones';
        const seats = [];
        const eq = project ? sharing(m.programId) : null;
        const simultaneous = !!eq && eq.sharingModes.includes('simultaneous');
        const relay = !!eq && eq.sharingModes.includes('separate') && !simultaneous && eq.groupIds.length > 1;
        const room_ = { key: m.key, programId: m.programId || null, levelId: m.levelId || null, kind: m.programId === 'immersive' ? 'vr' : project ? 'project' : 'class',
          floor, teacher: null, facilitator: null, students: [], second: [], waiting: [], devices: [], seats, bench: [], holo: null, stations: !!(eq && eq.stations), relay, simultaneous, tables };
        actors.rooms.push(room_);
        // Classrooms draw their own framed screen on the accent wall.
        if (m.programId === 'immersive') {
          place('hologram', m.key + '.holo', parent, 0, 0, -.2);
          room_.holo = b.rig.get(m.key + '.holo.float') || null;
          place('shelf', m.key + '.shelf', parent, -1.05, 0, -.75, Math.PI / 2);
          addPennant(m, parent, floor);
          [[-.55, .25], [.55, .3], [0, .65]].forEach(([x, z], i) => seats.push({ x, z, ry: Math.atan2(-x, -.2 - z), stand: true }));
        } else {
          tables.forEach((at, i) => {
            const key = `${m.key}.t${i}`;
            place('table', key, parent, at[0], at[1], at[2]);
            for (const [side, dz, ry] of [['n', -.44, 0], ['s', .44, Math.PI]]) {
              place(i % 2 ? 'chair-turquoise' : 'chair-orange', `${key}.c${side}`, parent, at[0] - .12, at[1], at[2] + dz, ry);
              seats.push({ x: at[0] - .12, z: at[2] + dz, ry, table: at, set: i });
            }
            const top = SCALE.table + .024;
            const dev = project && DEVICE[m.programId];
            if (dev) {
              // Track mat in the programme colour under the robot: reads as a project room from afar.
              const mat = b.rig.add(`${key}.mat`, parent, at[0] + (i ? .12 : 0), at[1] + SCALE.table + .008, at[2]);
              b.bone(mat); b.layer('soft');
              p.card(0, 0, 0, .66, .012, .4, p.PAPER[PROGRAM_TONE[m.programId]] || p.PAPER.orange, { thin: 'y', ry: i ? -.5 : .4 });
              p.card(0, .0125, 0, .44, .004, .03, p.PAPER.white, { thin: 'y', ry: i ? -.5 : .4 });
              b.layer('main').bone(b.rig.root);
              stage(meta, mat, 4, 'pop');
            }
            // One unit on the table of a single kit, two sets otherwise (unknown units: both).
            const drawDevice = dev && (i === 0 || eq.units !== 1);
            if (drawDevice) {
              const home = i === 0 ? [at[0], top, at[2], .4] : [at[0] + .12, top, at[2], -.5];
              const placed = place(DEVICE[m.programId], `${key}.dev`, parent, home[0], home[1], home[2], home[3]);
              if (placed) room_.devices.push({ bone: placed.bone, home, set: i, body: b.rig.get(`${key}.dev.body`) || null, hub: b.rig.get(`${key}.dev.hub`) || null });
            }
            if (!project || LAPTOP[m.programId]) place('laptop', `${key}.lap`, parent, at[0] - .2, top, at[2] + .05, Math.PI / 2 * (i % 2 ? -1 : 1) * .6);
          });
          if (project) {
            place('shelf', m.key + '.shelf', parent, -1.08, 0, -.55, Math.PI / 2);
            place('kit-box', m.key + '.box', parent, 1.0, 0, -.8, -.3);
            addPennant(m, parent, floor);
          }
          if (room_.stations) {
            // Numbered station pads under each seat: students rotate between them.
            const pads = [p.PAPER.turquoise, p.PAPER.orange, p.PAPER.violetLight, p.PAPER.green2];
            const key = m.key + '.pads';
            const bone = b.rig.add(key, parent, 0, 0, 0);
            b.bone(bone).layer('soft');
            seats.forEach((s, i) => {
              p.inlay(s.x, floor, s.z + (s.ry ? .02 : -.02), .3, .26, pads[i % pads.length], { lift: .006 });
              for (let d = 0; d <= i; d++) p.inlay(s.x - .08 + d * .055, floor, s.z + (s.ry ? .02 : -.02), .026, .026, p.PAPER.white, { lift: .012 });
            });
            b.layer('main').bone(b.rig.root);
            stage(meta, bone, 4, 'pop');
          }
          if (relay) {
            // A waiting group sits on the bench by the front-left corner.
            const bench = place('bench', m.key + '.bench', parent, -.72, floor, .98, Math.PI);
            if (bench) room_.bench = [{ x: -.9, z: .95, ry: Math.PI }, { x: -.52, z: .95, ry: Math.PI }];
          }
        }
        if (!people) return;
        let seat = 0;
        const standIn = (id, who, at, ry) => ({ id, level: who.levelId || 'prim', x: at.x, y: floor, z: at.z, ry, seed: id, parent, seated: true });
        const sitPose = (project, id) => ctrl => applyPose(ctrl, blendBody(POSES.sit(), project ? reach(.1, 'B') : POSES.type(hash(id) * 4)), 'sit', SCALE.seat + .02);
        for (const who of occupants) {
          const id = `${m.key}.p${who.seat ?? seat}`;
          if (who.role === 'teacher' || who.role === 'facilitator') {
            // Teacher by the screen; facilitator at the free end of the first table.
            const at = who.role === 'teacher' ? [.15, floor, -.8] : [tables[0][0] + .62, floor, tables[0][2]];
            const ry = who.role === 'teacher' ? .35 : -Math.PI / 2;
            const ctrl = person({ id, level: 'adult', role: 'teacher', x: at[0], y: at[1] || 0, z: at[2], ry, seed: id, parent },
              c => applyPose(c, who.role === 'teacher' ? POSES.point(.3) : reach(.25, 'R')));
            if (who.role === 'teacher') room_.teacher = { ctrl, home: [at[0], at[2]], ry }; else room_.facilitator = { ctrl, home: [at[0], at[2]], ry };
            continue;
          }
          const s = seats[seat++ % Math.max(1, seats.length)];
          if (!s) continue;
          if (s.stand) {
            const ctrl = person({ id, level: who.levelId || 'bach', x: s.x, y: floor, z: s.z, ry: s.ry, seed: id, parent, headset: true }, c => applyPose(c, POSES.vr(hash(id) * 6, hash(id, 'k'))));
            room_.students.push({ ctrl, seat: seats.indexOf(s), vr: true, k: hash(id, 'k') * 6 });
          } else {
            const ctrl = person({ id, level: who.levelId || 'prim', x: s.x, y: floor, z: s.z, ry: s.ry, seed: id, parent, seated: true }, sitPose(project, id));
            room_.students.push({ ctrl, seat: seats.indexOf(s) });
          }
        }
        // Extra representative people only when the plan leaves room under the people limit.
        const level = (occupants.find(o => o.role === 'student') || {}).levelId || m.levelId || 'prim';
        const sitters = (list, ids) => list.forEach(index => {
          const s = seats[index];
          if (!s || extraBudget <= 0) return;
          extraBudget--;
          const id = `${m.key}.${ids}${index}`, ctrl = person({ ...standIn(id, { levelId: level }, s, s.ry) }, sitPose(project, id));
          (ids === 'x' ? room_.second : room_.waiting).push({ ctrl, seat: index });
        });
        // Simultaneous groups run a second set of stations at the second table.
        const training = serviceRoom.training === m.key, followup = serviceRoom.followup === m.key;
        if (project && simultaneous && m.programId !== 'immersive' && !training) sitters([2, 3], 'x');
        room_.service = null;
        if (training || followup) {
          // Teachers at the second table: two prepare kits (training) or one works on a laptop (follow-up).
          const spots = training ? [2, 3] : [3];
          const teachers = spots.map(index => {
            const t = seats[index];
            if (!t) return null;
            const id = `${m.key}.svc${index}`;
            const ctrl = person({ id, level: 'adult', role: 'teacher', x: t.x, y: floor, z: t.z, ry: t.ry, seed: id, parent, seated: true },
              c => applyPose(c, blendBody(POSES.sit(), reach(.1, 'B')), 'sit', SCALE.seat + .02));
            return { ctrl, seat: index };
          }).filter(Boolean);
          if (training) place('kit-box', m.key + '.svcbox', parent, tables[1][0] + .12, tables[1][1] + SCALE.table + .005, tables[1][2], .3);
          room_.service = { kind: training ? 'training' : 'followup', teachers };
        }
        // Separate schedules with several groups: the next group waits on the bench.
        if (relay) room_.bench.forEach((spot, i) => {
          if (extraBudget <= 0) return;
          extraBudget--;
          const id = `${m.key}.w${i}`, ctrl = person({ id, level, x: spot.x, y: floor, z: spot.z, ry: spot.ry, seed: id, parent, seated: true },
            c => applyPose(c, blendBody(POSES.sit(), POSES.stand()), 'sit', SCALE.seat + .02));
          room_.waiting.push({ ctrl, seat: i, bench: spot });
        });
      }

      const all = [...(plan.modules || [])].sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
      const modules = all.filter(m => inScope(m.key));
      for (const m of modules) {
        let opts = m.opts || {};
        // The planner marks free corners as [back-left, back-right, front-right, front-left] booleans.
        if (m.type === 'pedestal' && Array.isArray(opts.round) && typeof opts.round[0] === 'boolean') {
          opts = { ...opts, round: ['back-left', 'back-right', 'front-right', 'front-left'].filter((_, i) => opts.round[i]) };
        }
        const built = place(m.type, m.key, 'root', m.x, m.y ?? 0, m.z, m.ry || 0, opts);
        if (!built || !furnish) continue;
        if (ROOMS.has(m.type) && !m.empty) furnishRoom(m, built);
        if (m.programId === 'drones') {
          const k = m.key + '.drone';
          const drone = place('drone', k, built.bone, 0, .7, 0, .3);
          place('controller', k + '.ctl', built.bone, -.6, 0, .55);
          if (drone) actors.drones.push({ bone: drone.bone, home: [0, .7, 0], props: [0, 1, 2, 3].map(i => b.rig.get(`${k}.prop${i}`)).filter(Boolean), host: m, units: m.opts.units });
        }
      }
      if (people) {
        // Walkers and patio groups stand in their module, spread deterministically.
        // Fixed, spaced spots around each host module: people never overlap.
        const SPOTS = [[-.55, .45], [.55, .4], [0, .85], [-.6, -.35], [.6, -.4], [0, -.7], [-1.0, .9], [1.0, .9]];
        const used = new Map(), standing = [], benchTaken = new Map();
        const benchesAll = all.filter(m => m.type === 'bench' && (m.y || 0) < .5);
        const benchFor = host => {
          const near = benchesAll.map(bn => ({ bn, d: Math.hypot(bn.x - host.x, bn.z - host.z) })).filter(e => e.d < 4.5 && (benchTaken.get(e.bn.key) || 0) < 2).sort((x, y) => x.d - y.d)[0];
          if (!near) return null;
          const seat = benchTaken.get(near.bn.key) || 0;
          benchTaken.set(near.bn.key, seat + 1);
          return { x: near.bn.x, z: near.bn.z, ry: near.bn.ry || 0, seat };
        };
        for (const who of plan.people || []) {
          if ((who.activity !== 'walk' && who.activity !== 'patio') || dropped.has(who.key)) continue;
          const host = modules.find(m => m.key === who.moduleKey);
          if (!host) continue;
          // Next free spot of this host that keeps 0.4 from everyone already standing.
          let k = used.get(host.key) || 0;
          const spotZ = i => ROOMS.has(host.type) ? 1.55 + Math.abs(SPOTS[i][1]) * .5 : SPOTS[i][1];
          while (k < SPOTS.length && standing.some(([x, z]) => Math.hypot(x - host.x - SPOTS[k][0], z - host.z - spotZ(k)) < .4)) k++;
          used.set(host.key, k + 1);
          if (k >= SPOTS.length) continue;
          const id = `walk.${who.key}`, [u, v0] = SPOTS[k];
          // Patio groups sit on a free bench when the plan has one nearby.
          const bench = who.activity === 'patio' && benchFor(host);
          if (bench) {
            const ry = bench.ry || 0, off = bench.seat === 0 ? -.2 : .2, bx = bench.x + Math.cos(ry) * off, bz = bench.z - Math.sin(ry) * off;
            const ctrl = person({ id, level: who.levelId || 'prim', x: bx, y: 0, z: bz + Math.cos(ry) * .02, ry, seed: id, seated: true },
              c => applyPose(c, blendBody(POSES.sit(), POSES.stand()), 'sit', SCALE.bench + .02));
            actors.walkers.push({ ctrl, who, host: host.key, kind: 'patio', sit: { x: bx, z: bz, ry }, spot: [bx, bz], index: actors.walkers.length });
            continue;
          }
          // A room hosts its walkers in front of it, on the patio, never inside.
          const v = ROOMS.has(host.type) ? 1.55 + Math.abs(v0) * .5 : v0;
          standing.push([host.x + u, host.z + v]);
          const ctrl = person({ id, level: who.levelId || 'prim', x: host.x + u, y: (host.y || 0) > .5 ? host.y : 0, z: host.z + v, ry: hash(id, 'r') * 6.28, seed: id },
            c => applyPose(c, POSES.walk(hash(id, 'ph') * 6.28, .7)));
          actors.walkers.push({ ctrl, who, host: host.key, kind: who.activity, spot: [host.x + u, host.z + v], index: actors.walkers.length });
        }
      }
      meta.afterFinish = group => afters.forEach(fn => fn(group));
      meta.focus = [0, .8, 0];
      return meta;
    }
  };
}
