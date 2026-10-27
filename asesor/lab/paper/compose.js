/**
 * Composition: turns a growth plan (plan.js) into one buildable piece made of
 * catalog pieces, furnishing classrooms and project rooms from their anchors
 * and seating the representative people. Used by the inspector to show the six
 * growth states before the campus scene integrates the same modules.
 *
 * Every room kind has one readable activity (docs/campus-3d.md, «Composición de
 * actividades»): level classrooms face the screen with a laptop per student, the
 * Tale-Bot group kneels around a floor track, workshops share one worktable with
 * a large kit, the immersive group stands in a circle around a large hologram,
 * and the drone yard has pilots with controllers. Program devices are drawn at
 * diorama scale (DEVICE_SCALE) on a scaled child bone, so the activity still
 * moves the unscaled mount and the assembly `pop` keeps working. The central
 * aisle (x = 0) of every room stays free for the people who walk.
 * `meta.actors` is documented in docs/papercraft/ACTORES.md.
 */
import { hash } from '../campus-kit.js';
import { addPerson, applyPose, POSES, blendBody, reach } from '../campus-people.js';
import { CATALOG } from './catalog.js';
import * as PEOPLE from './pieces-people.js';
import { newMeta, SCALE, stage } from './kit.js';
import { serviceRoomsOf } from './plan.js';
import { CAMPUS_LIMITS } from '../campus-layout.js';

const NO_SHADOW = new Set(['furniture', 'tech', 'people', 'nature']);
// Ground-level pieces never need to cast into the shadow map.
const GROUND_TYPES = new Set(['pedestal', 'patio', 'path', 'steps']);

const byId = new Map(CATALOG.map(piece => [piece.id, piece]));
const ROOMS = new Set(['room-initial', 'room-extendable', 'room-corner', 'room-end', 'room-upper']);
/** Device on the project table: the catalog technology, recognisable by its shape. */
const DEVICE = { tale: 'robot-tale', master: 'robot-dino', spike: 'kit-spike', electronics: 'electronics' };
// Programming is part of the robotics activity, never a separate service.
/** Assembly order for pieces that declare no stage: connections 3, exterior and furniture 4. */
const DEFAULT_STAGE = { links: 3, nature: 4, furniture: 4, tech: 4 };
/** Colour of each programme on its track mat and pennant (paper palette). */
const PROGRAM_TONE = { tale: 'yellow', master: 'lime', spike: 'pink', electronics: 'blue', immersive: 'violetLight', drones: 'orange' };
/**
 * Diorama scale of equipment relative to the furniture: a papercraft model exaggerates props so the
 * activity reads from the overview. Program devices about 2x, the hologram and the drone more.
 */
export const DEVICE_SCALE = Object.freeze({
  'robot-tale': 2.7, 'robot-dino': 1.8, 'kit-spike': 2.6, electronics: 2.3, hologram: 3.6, drone: 2.2,
  laptop: 1.4, controller: 1.7, 'kit-box': 1.2, 'component-tray': 1.4
});
/** How each device moves in the activity; `range` is the travel the composer keeps free around home. */
const MOTION = { 'robot-tale': 'drive', 'robot-dino': 'walk', 'kit-spike': 'build', electronics: 'still' };
const RANGE = { 'robot-tale': [.16, .12], 'robot-dino': [.06, .04], 'kit-spike': [.03, .03], electronics: [0, 0] };
/** Table top above the room floor. */
const TOP = SCALE.table;
/**
 * Chair centre to table edge by the sitter's level: the seated hands (campus-people poses `type` and
 * `reach`) stop just in front of the edge instead of crossing the top.
 */
const CHAIR_GAP = Object.freeze({ pre: .17, prim: .23, bas: .245, bach: .255, adult: .265 });
/**
 * The camera looks from the front left, so the activity sits right of the central aisle and toward the
 * open front: the worktable of a workshop, the Tale-Bot track and the hologram. The side table (training
 * kits or the second set of a simultaneous group) stays at the back left, the shelf on the left wall.
 */
const WORKTABLE = Object.freeze({ x: .69, z: .28, w: 1.06, d: .84 });
const SIDE = Object.freeze({ x: -.45, z: -.74, w: .74, d: .5 });
/** Second table of a simultaneous group, left of the aisle and toward the front. */
const SECOND = Object.freeze({ x: -.62, z: .42, w: .9, d: .55 });
/** Device home on the worktable: [x, z, ry]. The dino walks in profile toward the aisle. */
const WORK_DEVICE = { 'robot-dino': [.69, .42, -Math.PI / 2], 'kit-spike': [.8, .41, 0], electronics: [.84, .44, 0] };
/** Programme mat under the kit on the worktable: [x, z, w, d] (the dino's tail makes it asymmetric). */
const WORK_MAT = { 'robot-dino': [.778, .42, .88, .42], 'kit-spike': [.79, .42, .82, .56], electronics: [.84, .44, .76, .52] };
/** Where the activity sends a facilitator to help (scene-activity.js); kept clear in every layout. */
const AWAY = Object.freeze([.02, .62, Math.PI * .5 + .6]);

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
      /** First level among the groups that use a programme (null when unknown). */
      const programLevel = id => {
        const rows = plan.normalized?.enrollment || [];
        return (sharing(id).groupIds || []).map(gid => rows.find(row => row.id === gid)?.levelId).find(Boolean) || null;
      };
      // Services live inside existing rooms (plan.serviceRooms): training in the project room nearest the
      // entrance, follow-up in the lowest-level ground room (a teacher with a laptop).
      const serviceRoom = plan.serviceRooms || serviceRoomsOf(plan.modules || [], plan.services);
      // Service teachers count against the people limit. The planner reserves their places; walkers only
      // make room for them when a plan arrives without that reservation.
      const serviceCount = (serviceRoom.training ? 2 : 0) + (serviceRoom.followup ? 1 : 0);
      const walkKeys = (plan.people || []).filter(w => (w.activity === 'walk' || w.activity === 'patio') && !w.pilot).map(w => w.key).sort().reverse();
      const excess = Math.max(0, (plan.people || []).length + serviceCount - CAMPUS_LIMITS.people);
      const dropped = new Set(walkKeys.slice(0, excess));
      let extraBudget = Math.max(0, CAMPUS_LIMITS.people - ((plan.people || []).length - dropped.size) - serviceCount);
      const addPersonFn = typeof PEOPLE.addPaperPerson === 'function' ? PEOPLE.addPaperPerson : addPerson;

      function place(type, key, parent, x, y, z, ry = 0, opts = {}, scale = 1) {
        const piece = byId.get(type);
        if (!piece) { if (!meta.missing.includes(type)) meta.missing.push(type); return null; }
        const bone = b.rig.add(key, parent, x, y, z);
        bone.rotation.y = ry; bone.userData.rest.quaternion.copy(bone.quaternion);
        // Diorama scale lives on a child bone: the mount keeps scale 1 for the activity and the assembly pop.
        let host = bone;
        if (scale !== 1) { host = b.rig.add(key + '.size', bone, 0, 0, 0); host.scale.setScalar(scale); }
        b.bone(host);
        // Budget (the shadow pass counts): only architecture casts into the shadow map;
        // props, people and plants keep their contact shadows instead.
        const soft = NO_SHADOW.has(piece.group) || GROUND_TYPES.has(type);
        if (soft) b.base('soft');
        const sub = piece.build(b, p, { ...(piece.opts || {}), ...opts, id: key, parent: host }) || newMeta();
        if (soft) b.base('solid');
        b.bone(b.rig.root);
        meta.staged.push(...(sub.staged || []));
        // Pieces without their own assembly stage pop in with their group's step.
        if (!(sub.staged || []).length && DEFAULT_STAGE[piece.group]) stage(meta, bone, DEFAULT_STAGE[piece.group], 'pop');
        if (typeof sub.afterFinish === 'function') afters.push(sub.afterFinish);
        return { bone, meta: sub, scale };
      }
      const placeScaled = (type, key, parent, x, y, z, ry = 0, opts = {}) => place(type, key, parent, x, y, z, ry, opts, DEVICE_SCALE[type] || 1);

      function person(spec, poseFn) {
        b.base('soft');
        const ctrl = addPersonFn(b, spec);
        b.base('solid');
        b.layer('main').bone(b.rig.root);
        stage(meta, ctrl.root, 5, 'pop');
        if (poseFn) afters.push(() => poseFn(ctrl));
        return ctrl;
      }
      const facing = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);

      const seatedBy = new Map();
      for (const who of plan.people || []) {
        if (who.activity === 'walk' || who.activity === 'patio' || !inScope(who.moduleKey)) continue; // placed outside, below
        if (!seatedBy.has(who.moduleKey)) seatedBy.set(who.moduleKey, []);
        seatedBy.get(who.moduleKey).push(who);
      }

      /** Paper pennant on a slim pole in the back-right corner, inside the room walls, clear of the activity. */
      function addPennant(m, parent, floor) {
        const bone = b.rig.add(m.key + '.flag', parent, 1.15, floor, -.98);
        b.bone(bone);
        const hex = p.PAPER[PROGRAM_TONE[m.programId]] || p.PAPER.orange;
        p.prism(0, 0, 0, 4, .016, 1.3, p.PAPER.ink, { top: false });
        p.card(-.2, 1.12, 0, .4, .2, .012, hex, { thin: 'z' });
        p.card(-.46, 1.12, 0, .12, .2, .012, p.edgeTone(hex, .5), { thin: 'z' });
        b.bone(b.rig.root);
        stage(meta, bone, 4, 'pop');
      }

      /** Flat programme mat under a device on a table top: contrast so the kit reads from afar. */
      function addMat(key, parent, x, y, z, w, d, tone) {
        const mat = b.rig.add(key, parent, x, y, z);
        b.bone(mat); b.layer('soft');
        p.card(0, .004, 0, w, .008, d, tone, { thin: 'y', omit: ['-y'] });
        p.card(0, .0095, d / 2 - .05, w * .7, .003, .026, p.PAPER.white, { thin: 'y', omit: ['-y'] });
        b.layer('main').bone(b.rig.root);
        stage(meta, mat, 4, 'pop');
        return mat;
      }

      /** Room kind → layout: 'class' | 'workbench' | 'track' | 'vr'. */
      const layoutOf = (m, project) => m.programId === 'immersive' ? 'vr' : m.programId === 'tale' ? 'track' : project ? 'workbench' : 'class';

      function furnishRoom(m, room) {
        const a = room.meta.anchors || {}, parent = room.bone;
        const floor = (a['table-a'] || [0, .1, 0])[1];
        const top = floor + TOP;
        const occupants = seatedBy.get(m.key) || [];
        const project = m.programId && m.programId !== 'drones';
        const eq = project ? sharing(m.programId) : null;
        const simultaneous = !!eq && eq.sharingModes.includes('simultaneous');
        const relay = !!eq && eq.sharingModes.includes('separate') && !simultaneous && eq.groupIds.length > 1;
        const layout = layoutOf(m, project);
        const training = serviceRoom.training === m.key, followup = serviceRoom.followup === m.key;
        const staff = occupants.filter(o => o.role === 'teacher' || o.role === 'facilitator');
        const students = occupants.filter(o => o.role === 'student').sort((x, y) => (x.seat ?? 0) - (y.seat ?? 0));
        const seats = [], tables = [], tops = [];
        const room_ = { key: m.key, programId: m.programId || null, levelId: m.levelId || null, kind: m.programId === 'immersive' ? 'vr' : project ? 'project' : 'class',
          layout, floor, teacher: null, facilitator: null, students: [], second: [], waiting: [], around: [], devices: [], seats, bench: [], holo: null,
          stations: !!(eq && eq.stations), relay, simultaneous, tables, tops, track: null, service: null };
        actors.rooms.push(room_);
        // Extra people (a simultaneous second group, the next group of a relay) only under the people limit.
        const take = n => { const k = Math.max(0, Math.min(n, extraBudget)); extraBudget -= k; return k; };
        const secondCount = people && project && simultaneous && layout === 'workbench' && !training ? take(2) : 0;
        const waitCount = people && relay && layout === 'workbench' ? take(2) : 0;
        const aroundExtra = people && layout === 'track' && (simultaneous || relay) ? take(2) : 0;
        const program = DEVICE[m.programId];
        const tone = p.PAPER[PROGRAM_TONE[m.programId]] || p.PAPER.orange;
        // Workshop students take the level of the groups that use the programme (Tale-Bot: pre-primary).
        const level = m.levelId || programLevel(m.programId) || (students[0] || {}).levelId || 'prim';
        // Per-table counters keep the first chair/laptop of a table on its historic bone name.
        const counters = new Map();
        const nameFor = base => { const n = (counters.get(base) || 0) + 1; counters.set(base, n); return n === 1 ? base : base + n; };

        const addTable = (i, x, z, w, d) => {
          const key = `${m.key}.t${i}`;
          place('table', key, parent, x, floor, z, 0, w === .9 && d === .55 ? {} : { w, d });
          tables.push([x, floor, z]);
          const t = { key, index: i, x, z, y: top, w, d, x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
          tops.push(t);
          return t;
        };
        // A seat at a table side: 'n' behind (z-), 's' in front (z+), facing the table.
        const seatAt = (t, side, u, extra = {}) => {
          const gap = CHAIR_GAP[extra.service ? 'adult' : level] || CHAIR_GAP.prim;
          const at = side === 'n' ? [t.x + u, t.z0 - gap, 0] : [t.x + u, t.z1 + gap, Math.PI];
          seats.push({ x: at[0], z: at[1], ry: at[2], table: [t.x, floor, t.z], tableIndex: t.index, set: extra.set ?? 0, side, ...extra });
          return seats.length - 1;
        };
        /** Laptop open on the top, in front of a seat, facing its user, fully on the top. */
        const laptopFor = (seatIndex, key) => {
          const s = seats[seatIndex], t = tops.find(tt => tt.index === s.tableIndex);
          const half = .21 / 2 + .015; // scaled laptop depth / 2 plus room for the hands
          return placeScaled('laptop', key, parent, s.x, top, s.side === 'n' ? t.z0 + half : t.z1 - half, s.side === 'n' ? Math.PI : 0);
        };
        const addDevice = (set, x, z, ry, surface, scale = DEVICE_SCALE[program] || 1) => {
          const key = `${m.key}.t${set}.dev`, placed = program && place(program, key, parent, x, surface.y, z, ry, {}, scale);
          if (!placed) return null;
          room_.devices.push({ bone: placed.bone, home: [x, surface.y, z, ry], set, body: b.rig.get(`${key}.body`) || null, hub: b.rig.get(`${key}.hub`) || null,
            scale: placed.scale, motion: MOTION[program] || 'still', range: RANGE[program] || [0, 0],
            surface: { x0: surface.x0, x1: surface.x1, z0: surface.z0, z1: surface.z1, y: surface.y } });
          return placed;
        };

        // ---- layout: furniture, devices and the seats people will use ----------------------------------
        let teacherSpot = null, facilitatorSpot = null, aroundSpots = [], benchSpots = null, sideSeats = [];
        if (layout === 'class') {
          // Two tables facing the screen with the aisle free; students sit on the front side (back to the
          // camera) with an open laptop each; the teacher stands beside the screen.
          const t0 = addTable(0, -.55, .22, .9, .55), t1 = addTable(1, .55, .22, .9, .55);
          [[t0, .2], [t1, -.2], [t0, -.22], [t1, .22]].forEach(([t, u]) => seatAt(t, 's', u));
          if (followup) sideSeats = [seatAt(t1, 'n', .22, { service: true })];
          teacherSpot = { x: .78, z: -.68, ry: -.45 };
        } else if (layout === 'workbench') {
          // One worktable right of the aisle: two builders behind it facing the camera, one in front, the
          // laptop of the group at the aisle end, the kit large on a mat in the programme colour.
          const work = addTable(0, WORKTABLE.x, WORKTABLE.z, WORKTABLE.w, WORKTABLE.d);
          seatAt(work, 'n', -.26); seatAt(work, 'n', .26); seatAt(work, 's', .26);
          const [dx, dz, dry] = WORK_DEVICE[program] || [.8, .42, 0];
          const [mx, mz, mw, md] = WORK_MAT[program] || [dx, dz, .76, .52];
          addMat(`${m.key}.t0.mat`, parent, mx, top, mz, mw, md, tone);
          addDevice(0, dx, dz, dry, { ...work, y: top + .012 });
          if (m.programId === 'electronics') placeScaled('component-tray', `${m.key}.t0.tray`, parent, .3, top, .52, .15);
          laptopFor(0, nameFor(`${m.key}.t0.lap`));
          facilitatorSpot = { x: -.35, z: .5, ry: facing([-.35, .5], [dx, dz]) };
          if (relay && waitCount) benchSpots = [{ x: -.82, z: .9, ry: Math.PI }, { x: -.42, z: .9, ry: Math.PI }];
        } else if (layout === 'track') {
          // Tale-Bot: a floor track in the programme colour with the robot on it; the group kneels around.
          const mat = { x: .6, z: .55, w: 1.08, d: .88 };
          const track = b.rig.add(`${m.key}.track`, parent, mat.x, floor, mat.z);
          b.bone(track); b.layer('soft');
          p.card(0, .004, 0, mat.w, .008, mat.d, tone, { thin: 'y', omit: ['-y'] });
          p.card(0, .0105, 0, mat.w - .1, .005, mat.d - .1, p.PAPER.ink, { thin: 'y', omit: ['-y'] });
          // White loop of the track: a rounded rectangle of eight strips.
          const W = mat.w - .34, D = mat.d - .3, k = .12, line = .028;
          for (const s of [-1, 1]) {
            p.inlay(0, .013, s * D / 2, W - 2 * k, line, p.PAPER.white);
            p.inlay(s * W / 2, .013, 0, line, D - 2 * k, p.PAPER.white);
            for (const s2 of [-1, 1]) p.inlay(s * (W / 2 - k / 2), .013 + .001, s2 * (D / 2 - k / 2), k * 1.3, line, p.PAPER.white, { ry: s * s2 * Math.PI / 4 });
          }
          b.layer('main').bone(b.rig.root);
          stage(meta, track, 4, 'pop');
          room_.track = { x0: mat.x - mat.w / 2, x1: mat.x + mat.w / 2, z0: mat.z - mat.d / 2, z1: mat.z + mat.d / 2, y: floor + .019 };
          const robot = [.56, .6];
          addDevice(0, robot[0], robot[1], -.55, room_.track);
          // Kneeling at the back and right edges of the track (shins off the mat), the next group standing behind.
          aroundSpots = [[.3, -.06, 'kneel'], [.9, -.06, 'kneel'], [1.08, .66, 'kneel'], [.55, -.44, 'stand'], [.98, -.46, 'stand']]
            .map(([x, z, pose]) => ({ x, z, ry: facing([x, z], robot), pose }));
          facilitatorSpot = { x: -.3, z: .66, ry: facing([-.3, .66], robot) };
        } else {
          // Immersive: a large hologram in the middle, the group in a circle open toward the camera.
          const centre = [.3, .56];
          place('hologram', m.key + '.holo', parent, centre[0], floor, centre[1], 0, {}, DEVICE_SCALE.hologram);
          room_.holo = b.rig.get(m.key + '.holo.float') || null;
          room_.holoCentre = centre;
          const ring = [.75, 1.95, 3.15, 4.35].map(t => [centre[0] + Math.sin(t) * .58, centre[1] + Math.cos(t) * .58]);
          facilitatorSpot = { x: ring[0][0], z: ring[0][1], ry: facing(ring[0], centre) };
          ring.slice(1).forEach(([x, z]) => seats.push({ x, z, ry: facing([x, z], centre), stand: true, set: 0 }));
        }
        if (layout === 'workbench' || layout === 'track') {
          if (training) {
            // Side table at the back left: two teachers prepare kits (training).
            const side = addTable(1, SIDE.x, SIDE.z, SIDE.w, SIDE.d);
            sideSeats = [seatAt(side, 's', -.2, { set: 1, service: true }), seatAt(side, 's', .2, { set: 1, service: true })];
            placeScaled('kit-box', m.key + '.svcbox', parent, side.x - .18, top, side.z - .1, .25);
            placeScaled('component-tray', m.key + '.svctray', parent, side.x + .17, top, side.z - .04, -.2);
          } else if (secondCount && layout === 'workbench') {
            // Simultaneous groups: a second table left of the aisle with its own set (sheet 11), its group
            // behind it facing the camera; the facilitator moves to the back of the aisle, between the tables.
            const second = addTable(1, SECOND.x, SECOND.z, SECOND.w, SECOND.d);
            sideSeats = [seatAt(second, 'n', -.2, { set: 1 }), seatAt(second, 'n', .2, { set: 1 })];
            const fit = Math.min(DEVICE_SCALE[program] || 1, program === 'robot-dino' ? 1.7 : 2.4);
            const dx = second.x - (program === 'robot-dino' ? .08 : 0);
            addMat(`${m.key}.t1.mat`, parent, second.x, top, second.z + .04, second.w - .06, program === 'robot-dino' ? .4 : .46, tone);
            addDevice(1, dx, second.z + .04, program === 'robot-dino' ? -Math.PI / 2 : 0, { ...second, y: top + .012 }, fit);
            facilitatorSpot = { x: -.02, z: -.42, ry: facing([-.02, -.42], [0, .4]) };
          }
        }
        if (project) {
          place('shelf', m.key + '.shelf', parent, -1.0, floor, layout === 'vr' || secondCount ? -.65 : -.25, Math.PI / 2);
          place('kit-box', m.key + '.box', parent, .15, floor, -1.0, 0, {}, DEVICE_SCALE['kit-box']);
          addPennant(m, parent, floor);
        }
        if (benchSpots) {
          const bench = place('bench', m.key + '.bench', parent, -.62, floor, .9, Math.PI);
          if (bench) room_.bench = benchSpots;
        }

        // ---- chairs only under seats somebody uses --------------------------------------------------------
        const studentSeats = seats.map((s, i) => i).filter(i => !seats[i].service && !seats[i].stand && seats[i].set !== 1);
        const used = new Set();
        if (layout !== 'vr' && layout !== 'track') students.forEach((who, i) => { if (studentSeats[i] != null) used.add(studentSeats[i]); });
        sideSeats.slice(0, training || followup ? sideSeats.length : secondCount).forEach(i => used.add(i));
        seats.forEach((s, i) => {
          if (s.stand || !used.has(i)) return;
          s.chair = true;
          // On a station pad the chair stands on the paper (pad + number inlays), not through it.
          const lift = room_.stations && !s.service ? .017 : 0;
          place(i % 2 ? 'chair-turquoise' : 'chair-orange', nameFor(`${m.key}.t${s.tableIndex}.c${s.side}`), parent, s.x, floor + lift, s.z, s.ry);
          // Level classrooms: an open laptop in front of every seated student.
          if (layout === 'class' && !s.service) laptopFor(i, nameFor(`${m.key}.t${s.tableIndex}.lap`));
        });
        if (room_.stations) {
          // Numbered station pads under each used seat: students rotate between them.
          const pads = [p.PAPER.turquoise, p.PAPER.orange, p.PAPER.violetLight, p.PAPER.green2];
          const key = m.key + '.pads';
          const bone = b.rig.add(key, parent, 0, 0, 0);
          b.bone(bone).layer('soft');
          seats.forEach((s, i) => {
            if (!s.chair || s.service) return;
            p.inlay(s.x, floor, s.z, .3, .26, pads[i % pads.length], { lift: .006 });
            for (let d = 0; d <= i; d++) p.inlay(s.x - .08 + d * .055, floor, s.z + (s.ry ? .1 : -.1), .026, .026, p.PAPER.white, { lift: .012 });
          });
          b.layer('main').bone(b.rig.root);
          stage(meta, bone, 4, 'pop');
        }
        if (!people) return;

        // ---- people -----------------------------------------------------------------------------------------
        const sitPose = (proj, id) => ctrl => applyPose(ctrl, blendBody(POSES.sit(), proj ? reach(.1, 'B') : POSES.type(hash(id) * 4)), 'sit', SCALE.seat + .02);
        for (const who of staff) {
          const id = `${m.key}.${who.role}`;
          const spot = (who.role === 'teacher' ? teacherSpot : facilitatorSpot) || teacherSpot || facilitatorSpot || { x: .78, z: -.68, ry: -.45 };
          const ctrl = person({ id, level: 'adult', role: 'teacher', x: spot.x, y: floor, z: spot.z, ry: spot.ry, seed: id, parent },
            c => applyPose(c, who.role === 'teacher' ? POSES.point(.3) : layout === 'vr' ? POSES.point(-.2) : reach(.25, 'R')));
          // `away`: the clear floor spot where the activity sends the facilitator to help (null: stays home).
          const entry = { ctrl, home: [spot.x, spot.z], ry: spot.ry, away: who.role === 'facilitator' ? [...AWAY] : null };
          if (who.role === 'teacher') room_.teacher = entry; else room_.facilitator = entry;
        }
        if (layout === 'track') {
          // Kneeling and standing around the track. Kept out of `students`: the activity seats those.
          const group = [...students.map((who, i) => ({ who, i, wait: false })), ...Array.from({ length: aroundExtra }, (_, i) => ({ who: null, i, wait: true }))];
          group.forEach((g, n) => {
            const spot = aroundSpots[n % aroundSpots.length];
            const id = g.who ? `${m.key}.p${g.who.seat ?? g.i}` : `${m.key}.k${g.i}`;
            const pose = g.wait ? 'stand' : spot.pose;
            // The kneel pose drops the shins 2 cm below the hips' ground: lift kneelers onto the floor.
            const ctrl = person({ id, level: g.who?.levelId || level, x: spot.x, y: floor + (pose === 'kneel' ? .022 : 0), z: spot.z, ry: spot.ry, seed: id, parent, backpack: false },
              c => pose === 'kneel' ? applyPose(c, blendBody(POSES.kneel(), reach(.55, n % 2 ? 'R' : 'B')), 'kneel') : applyPose(c, POSES.point(n % 2 ? .2 : -.2)));
            room_.around.push({ ctrl, spot: { x: spot.x, z: spot.z, ry: spot.ry }, pose, waiting: g.wait });
          });
        } else {
          students.forEach((who, i) => {
            const id = `${m.key}.p${who.seat ?? i}`;
            const index = layout === 'vr' ? i : studentSeats[i];
            const s = seats[index];
            if (!s) return;
            if (s.stand) {
              const ctrl = person({ id, level: who.levelId || level || 'bach', x: s.x, y: floor, z: s.z, ry: s.ry, seed: id, parent, headset: true, backpack: false }, c => applyPose(c, POSES.vr(hash(id) * 6, hash(id, 'k'))));
              room_.students.push({ ctrl, seat: index, vr: true, k: hash(id, 'k') * 6 });
            } else {
              const ctrl = person({ id, level: who.levelId || level, x: s.x, y: floor, z: s.z, ry: s.ry, seed: id, parent, seated: true }, sitPose(project, id));
              room_.students.push({ ctrl, seat: index });
            }
          });
        }
        // Simultaneous groups run a second set at the side table.
        sideSeats.slice(0, secondCount).forEach(index => {
          const s = seats[index], id = `${m.key}.x${index}`;
          const ctrl = person({ id, level, x: s.x, y: floor, z: s.z, ry: s.ry, seed: id, parent, seated: true }, sitPose(project, id));
          room_.second.push({ ctrl, seat: index });
        });
        if (training || followup) {
          // Teachers at the side table: two prepare kits (training) or one works on a laptop (follow-up).
          const teachers = sideSeats.map(index => {
            const s = seats[index], id = `${m.key}.svc${index}`;
            const ctrl = person({ id, level: 'adult', role: 'teacher', x: s.x, y: floor, z: s.z, ry: s.ry, seed: id, parent, seated: true },
              c => applyPose(c, blendBody(POSES.sit(), training ? reach(.1, 'B') : POSES.type(1)), 'sit', SCALE.seat + .02));
            if (followup) laptopFor(index, `${m.key}.svclap`);
            return { ctrl, seat: index };
          });
          room_.service = { kind: training ? 'training' : 'followup', teachers };
        }
        // Separate schedules with several groups: the next group waits on the bench.
        room_.bench.slice(0, waitCount).forEach((spot, i) => {
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
          // The drone hovers over the middle of the pad; the pilots hold its west edge.
          const k = m.key + '.drone', home = [0, .78, -.05];
          const drone = place('drone', k, built.bone, home[0], home[1], home[2], .3, {}, DEVICE_SCALE.drone);
          if (drone) actors.drones.push({ bone: drone.bone, home, hover: home[1], scale: DEVICE_SCALE.drone, props: [0, 1, 2, 3].map(i => b.rig.get(`${k}.prop${i}`)).filter(Boolean),
            host: m, units: m.opts.units, pilots: [], pad: { x0: -1.27, x1: 1.27, z0: -1.12, z1: 1.12, y: .06 } });
        }
      }
      if (people) {
        // Walkers and patio groups stand in their module, spread deterministically.
        // Fixed, spaced spots around each host module: people never overlap.
        const SPOTS = [[-.55, .45], [.55, .4], [0, .85], [-.6, -.35], [.6, -.4], [0, -.7], [-1.0, .9], [1.0, .9]];
        // The drone audience stands east of the pad facing the flight (the pilots hold the west edge).
        const YARD_SPOTS = [[1.5, .2], [1.45, -.42], [1.1, .85], [1.62, .72], [.5, .95], [-.4, .95], [1.55, -1.0], [-.9, .95]];
        // In front of the entrance door (porch and the path before the first classroom), never beside or behind it.
        const GATE_SPOTS = [[-.4, .95], [.45, .95], [0, 1.4], [1.05, .9], [-.75, 1.45], [.7, 1.5], [1.6, 1.2], [1.1, 1.65]];
        const PILOT_SPOTS = [[-1.1, .32], [-1.1, -.34]];
        const PAD_Y = .06, onPad = (u, v) => Math.abs(u) < 1.27 && Math.abs(v) < 1.12;
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
          const droneActor = actors.drones.find(d => d.host.key === host.key);
          if (who.pilot && droneActor) {
            // Pilot at the west edge of the pad, facing the drone, holding the controller in both hands.
            const [x, z] = PILOT_SPOTS[(who.seat || 0) % PILOT_SPOTS.length], ry = facing([x, z], [0, 0]);
            const id = `${host.key}.pilot${who.seat || 0}`;
            const ctrl = person({ id, level: who.levelId || 'bas', x, y: PAD_Y, z, ry, seed: id, parent: host.key, backpack: false }, c => applyPose(c, POSES.tablet()));
            const H = ctrl.scale || .9, ctl = place('controller', `${host.key}.drone.ctl${who.seat ? who.seat : ''}`, ctrl.root, 0, .6 * H, .21 * H, 0, {}, DEVICE_SCALE.controller);
            droneActor.pilots.push({ ctrl, spot: { x, z, ry }, controller: ctl?.bone || null, who });
            continue;
          }
          // Next free spot of this host that keeps 0.4 from everyone already standing.
          let k = used.get(host.key) || 0;
          const spots = host.type === 'entrance' ? GATE_SPOTS : droneActor ? YARD_SPOTS : SPOTS;
          const spotZ = i => ROOMS.has(host.type) ? 1.55 + Math.abs(spots[i][1]) * .5 : spots[i][1];
          while (k < spots.length && standing.some(([x, z]) => Math.hypot(x - host.x - spots[k][0], z - host.z - spotZ(k)) < .4)) k++;
          used.set(host.key, k + 1);
          if (k >= spots.length) continue;
          const id = `walk.${who.key}`, [u, v0] = spots[k];
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
          const y = (host.y || 0) > .5 ? host.y : droneActor && onPad(u, v) ? PAD_Y : 0;
          const ry = droneActor ? facing([u, v], [0, 0]) : hash(id, 'r') * 6.28;
          const ctrl = person({ id, level: who.levelId || 'prim', x: host.x + u, y, z: host.z + v, ry, seed: id },
            c => applyPose(c, droneActor ? POSES.stand() : POSES.walk(hash(id, 'ph') * 6.28, .7)));
          actors.walkers.push({ ctrl, who, host: host.key, kind: who.activity, spot: [host.x + u, host.z + v], index: actors.walkers.length });
        }
      }
      meta.afterFinish = group => afters.forEach(fn => fn(group));
      meta.focus = [0, .8, 0];
      return meta;
    }
  };
}
