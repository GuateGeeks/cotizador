/**
 * Architecture, terrain and environment for the campus. Builders author into a
 * kit builder (see campus-kit.js) and return metadata: staged bones for the
 * construction sequence, liftable roofs, focus points and animation ticks.
 * Architecture is a light frame around activities: white posts, purple slabs,
 * orange accesses and turquoise circulation, never closed boxes.
 */
import { PAL, LEVEL_COLOR, PROGRAM_COLOR, TAU, hash, pick } from './campus-kit.js';
import { addPerson, applyPose, POSES, reach, blendBody, mixPose } from './campus-people.js';
import { FLOOR_HEIGHT, ROOM, TILE, ROW_Z } from './campus-layout.js';

const H = FLOOR_HEIGHT;
export function stage(out, bone, order, style = 'pop') { out.staged.push({ name: bone.name, order, style }); return bone; }
const meta = () => ({ staged: [], roofs: [], people: [], focus: [0, .8, 0], tick: null });

/** Lighter tint for floor inlays. */
function tint(hex, amount = .55) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, bl = n & 255;
  const m = v => Math.round(v + (255 - v) * amount);
  return '#' + [m(r), m(g), m(bl)].map(v => v.toString(16).padStart(2, '0')).join('');
}
export { tint };

// ---------------------------------------------------------------- classroom
const SEATS = [[0, -.78, 0], [-.74, -.14, Math.PI / 2], [.74, -.14, -Math.PI / 2]];
const RUG_SEATS = [[-.05, -.72, 0], [-.6, -.08, 1.2], [.5, .02, -1.5]];

export function buildRoom(b, room) {
  const rig = b.rig, W = ROOM.w, D = ROOM.d, e = room.edges, out = meta();
  const level = room.levelId || 'example', accent = room.levelId ? LEVEL_COLOR[room.levelId] : '#C9B2F2';
  const upper = room.floor > 0, pre = room.levelId === 'pre';
  out.focus = [0, 1.0, .2];
  out.proxy = { x: 0, y: H / 2, z: 0, w: W, h: H, d: D };

  const floor = stage(out, rig.add('floor', 'root', 0, 0, 0), 0, 'pop');
  b.base('soft').bone(floor).shade(.8);
  b.block(0, 0, 0, W, .12, D, PAL.frame);
  b.shade(1).tile(0, .12 + .012, .02, W - .2, D - .26, pre ? '#FFEBC9' : PAL.floor).shade(.84);
  if (!upper) b.block(.62, 0, D / 2 + .14, .62, .06, .3, PAL.orangeLight);

  const frame = stage(out, rig.add('frame', 'root', 0, 0, 0), 1, 'rise');
  // Walls receive shadows but do not cast them; roofs and posts carry the shade.
  b.base('soft').bone(frame);
  // Back wall with an interior level stripe; sector colour reads from afar.
  b.block(0, .12, -D / 2 + .07, W, H - .12, .14, PAL.wall);
  b.box(0, .5, -D / 2 + .145, W - .3, .08, .01, accent);
  // Outer side walls carry big windows; shared sides stay open for adjacency.
  for (const side of [-1, 1]) {
    const open = side < 0 ? !e.west : !e.east;
    const x = side * (W / 2 - .07);
    if (open) { if (side > 0) b.block(x, .12, D / 2 - .07, .14, H - .12, .14, PAL.frame); continue; }
    b.block(x, .12, -.05, .14, .46, D - .24, PAL.wall);
    b.block(x, 1.32, -.05, .14, H - 1.32, D - .24, PAL.wall);
    b.layer('glass').box(x, .95, -.05, .04, .74, D - .3, PAL.glass).layer('main');
    [-.45, .35].forEach(z => b.box(x, .95, z, .07, .74, .05, PAL.frame));
    b.block(x, .12, D / 2 - .07, .14, H - .12, .14, PAL.frame);
  }
  // Front frame: header, accent fascia, low parapet with an orange doorway.
  b.block(0, H - .2, D / 2 - .07, W, .2, .16, PAL.frame);
  b.box(0, H - .1, D / 2 + .012, W, .08, .01, accent);
  b.block(-.42, .12, D / 2 - .07, W - 1.62, .3, .1, PAL.wall);
  if (W / 2 - .14 - .96 > .05) b.block((W / 2 - .14 + .96) / 2, .12, D / 2 - .07, W / 2 - .14 - .96, .3, .1, PAL.wall);
  [.33, .91].forEach(x => b.block(x, .12, D / 2 - .05, .07, 1.08, .09, PAL.orange));
  b.block(.62, 1.2, D / 2 - .05, .65, .07, .09, PAL.orange);

  // Interior: a collaborative table cluster so faces turn toward the camera.
  const furniture = stage(out, rig.add('furniture', 'root', 0, .12, 0), 2, 'pop');
  b.base('soft').bone(furniture);
  const tableZ = -.14;
  if (pre) {
    b.shade(1).cyl(0, 0, -.12, .66, .66, .02, tint(accent, .35), 10).shade(.84);
    b.cyl(0, .02, -.12, .26, .26, .16, PAL.wood, 8);
    [['#F2545B', -.08, 0], ['#3A7BE0', .07, .03], ['#FFD23F', 0, .02]].forEach(([c, x, z], i) => b.box(x, .23 + i * .07, -.12 + z, .08, .07, .08, c, i * .5));
    b.block(.92, 0, -.82, .45, .38, .26, PAL.wood);
    ['#F2545B', '#3BB273', '#FFD23F'].forEach((c, i) => b.block(.78 + i * .14, .38, -.82, .11, .1, .18, c));
    [[-.75, 1.0, '#FF8FB1'], [-.45, 1.12, '#5CC7E8'], [-.15, .98, '#FFD23F']].forEach(([x, y, c]) => b.box(x, y - .12, -D / 2 + .15, .24, .2, .01, c));
  } else {
    b.block(0, .38, tableZ, 1.05, .05, .62, PAL.wood);
    [[-.45, -.24], [.45, -.24], [-.45, .2], [.45, .2]].forEach(([x, z]) => b.block(x, 0, tableZ + z, .05, .38, .05, PAL.woodDark));
    SEATS.forEach(([x, z, ry]) => {
      b.push(x, 0, z + (z < -.5 ? 0 : 0), ry);
      b.block(0, 0, -.05, .2, .22, .18, PAL.inkSoft).block(0, .22, -.05, .24, .04, .22, accent).block(0, .26, -.15, .24, .24, .04, accent);
      b.pop();
    });
    if (level === 'prim' || level === 'example') {
      b.box(-.22, .44, tableZ + .05, .2, .03, .14, '#3A7BE0', .3).box(.25, .44, tableZ - .08, .2, .03, .14, '#F2545B', -.2);
      b.cyl(.92, 0, -.85, .05, .05, .55, PAL.inkSoft, 5).ball(.92, .66, -.85, .12, .12, .12, '#5CC7E8', 1);
    } else if (level === 'bas') {
      b.box(-.2, .44, tableZ, .26, .02, .18, PAL.white, .2).box(.22, .45, tableZ + .05, .22, .03, .16, PAL.ink, -.3);
      b.layer('glow').box(.22, .468, tableZ + .05, .18, .005, .12, PAL.screen).layer('main');
    } else {
      [-.28, .28].forEach((x, i) => {
        b.box(x, .43, tableZ + .08, .3, .02, .2, PAL.greyLight, i ? -.3 : .3);
        b.push(x, .43, tableZ - .02, i ? -.3 : .3, -.35).box(0, .1, 0, .3, .2, .015, PAL.ink).pop();
        b.layer('glow').push(x, .43, tableZ - .01, i ? -.3 : .3, -.35).box(0, .1, .01, .26, .16, .005, PAL.screen).pop().layer('main');
      });
      b.cyl(.0, .41, tableZ - .2, .06, .07, .1, PAL.wood, 6).ball(0, .58, tableZ - .2, .1, .12, .1, PAL.leaf, 0);
    }
    // Board or screen on the back wall, by level.
    if (level === 'bas' || level === 'bach') {
      b.box(-.3, 1.0, -D / 2 + .15, 1.0, .58, .03, PAL.ink);
      b.layer('glow').box(-.3, 1.0, -D / 2 + .17, .9, .48, .01, level === 'bas' ? '#DDF7FF' : '#BFF6E8').layer('main');
      [['#3A7BE0', -.6, .16], ['#FF8B22', -.45, .28], ['#3BB273', -.3, .2], ['#E83E8C', -.15, .34]].forEach(([c, x, h]) => b.box(x, .8 + h / 2, -D / 2 + .185, .1, h, .01, c));
    } else {
      b.box(-.3, 1.0, -D / 2 + .15, 1.0, .56, .03, PAL.board);
      b.box(-.3, 1.0, -D / 2 + .15, 1.06, .62, .02, PAL.frame);
      [[-.55, 1.08, .3], [-.3, .95, .45], [-.05, 1.1, .2]].forEach(([x, y, w]) => b.box(x, y, -D / 2 + .17, w, .025, .01, PAL.white));
    }
    b.block(.92, 0, -.88, .42, .7, .26, PAL.wood);
    ['#F2545B', '#3A7BE0', '#FFD23F', '#3BB273'].forEach((c, i) => b.block(.76 + i * .1, .7, -.88, .07, .17 + (i % 2) * .04, .16, c));
  }

  // Pennants across the front: one per registered section (up to six).
  for (let i = 0; i < room.pennants; i++) {
    const x = -W / 2 + .35 + i * ((W - .7) / Math.max(1, 5));
    const flag = stage(out, rig.add('pennant:' + i, 'root', x, H - .22, D / 2 + .04), 3 + i * .12, 'pop');
    const c = [accent, PAL.white, PAL.orange][i % 3];
    b.bone(flag).face([-.1, 0, 0], [.1, 0, 0], [0, -.2, 0], c, [0, 0, 1]).face([-.1, 0, 0], [0, -.2, 0], [.1, 0, 0], c, [0, 0, -1]);
  }
  if (room.pennants) b.bone('root').box(0, H - .22, D / 2 + .04, W - .5, .012, .012, PAL.inkSoft);

  // Roof only where no classroom stands above. Liftable to reveal the room.
  if (e.roof) {
    const roof = stage(out, rig.add('roof', 'root', 0, H, 0), 3, 'drop');
    out.roofs.push(roof);
    b.base('solid');
    const ox0 = e.west ? .16 : 0, ox1 = e.east ? .16 : 0;
    const x0 = -W / 2 - ox0, x1 = W / 2 + ox1, cx = (x0 + x1) / 2, rw = x1 - x0;
    // Cutaway roof: a solid purple slab over the back, slats over the front so
    // the classroom stays readable from the default camera.
    const zb0 = -D / 2 - .1, zb1 = .02, zf = D / 2 + .3;
    b.bone(roof).shade(.75);
    b.block(cx, 0, (zb0 + zb1) / 2, rw, .14, zb1 - zb0, PAL.roof);
    b.shade(.9).block(cx, .14, (zb0 + zb1) / 2, rw - .16, .02, zb1 - zb0 - .16, PAL.roofLight).shade(.84);
    b.block(cx, .14, zb0 + .04, rw, .07, .08, PAL.fascia);
    for (let z = zb1 + .16; z < zf - .05; z += .2) b.block(cx, .03, z, rw - .12, .07, .055, PAL.roof);
    [x0 + .05, x1 - .05].forEach(x => b.block(x, 0, (zb1 + zf) / 2, .09, .12, zf - zb1, PAL.fascia));
    b.block(cx, 0, zf - .04, rw, .12, .08, PAL.fascia);
    if (e.west) b.block(x0 + .04, .14, (zb0 + zb1) / 2, .08, .07, zb1 - zb0, PAL.fascia);
    if (e.east) b.block(x1 - .04, .14, (zb0 + zb1) / 2, .08, .07, zb1 - zb0, PAL.fascia);
    if (hash(room.key, 'skylight') < .6 || upper) b.block(.55, .14, -.6, .42, .1, .36, PAL.frame).layer('glass').block(.55, .24, -.6, .34, .03, .3, PAL.glass).layer('main');
  }

  // People: a teacher and up to three seated students of the sector's age.
  const kidLevel = room.levelId || 'prim';
  const people = [];
  if (room.teacher) {
    const t = addPerson(b, { id: 'teacher', role: 'teacher', x: .8, y: .12, z: -.62, ry: -.9, seed: room.key + 't' });
    stage(out, t.root, 4, 'pop'); people.push({ person: t, role: 'teacher' });
  }
  for (let i = 0; i < room.seated; i++) {
    const [x, z, ry] = pre ? RUG_SEATS[i] : SEATS[i];
    const p = addPerson(b, { id: 'seat:' + i, level: kidLevel, x, y: .12, z: pre ? z : z + (i === 0 ? .2 : 0) + (i ? 0 : 0), ry, seed: room.key + ':' + i });
    if (!pre) p.root.position.set(x + (i === 1 ? .1 : i === 2 ? -.1 : 0), .12, i === 0 ? z + .06 : z);
    stage(out, p.root, 4.3 + i * .2, 'pop'); people.push({ person: p, role: 'student', index: i });
  }
  out.people = people;
  out.tick = (t, ctx) => {
    for (const { person, role, index } of people) {
      if (role === 'teacher') {
        const phase = (t * .22 + hash(room.key) ) % 1;
        const gesture = phase < .45 ? POSES.point(.35) : phase < .6 ? POSES.wave(t) : POSES.stand();
        if (ctx.reaction) applyPose(person, POSES.wave(t));
        else applyPose(person, mixPose(POSES.stand(), gesture, ctx.moving ? .9 : .9));
        person.joints.head.rotation.y = ctx.moving ? Math.sin(t * .7) * .4 : 0;
        continue;
      }
      const k = index * 2.1 + hash(room.key) * 6;
      const cycle = (t * .16 + index * .33 + hash(room.key)) % 1;
      let upperBody;
      if (ctx.reaction) upperBody = POSES.cheer(t + k);
      else if (pre) upperBody = cycle < .3 ? POSES.clap(t + k) : cycle < .55 ? reach(.65, 'B') : POSES.stand();
      else upperBody = cycle < .22 ? POSES.hand() : cycle < .7 ? reach(.25, index % 2 ? 'L' : 'R') : POSES.stand();
      if (!ctx.moving) upperBody = index === 0 && !pre ? POSES.hand() : reach(.3, 'R');
      const lower = pre ? POSES.kneel() : POSES.sit();
      applyPose(person, blendBody(lower, upperBody), pre ? 'kneel' : 'sit', .22);
      if (ctx.moving) person.joints.head.rotation.y += Math.sin(t * .9 + k) * .35;
    }
  };
  return out;
}

// ---------------------------------------------------------------- workshops
/** Program emblem as a flat icon on a disc (no text). */
function emblem(b, programId) {
  const c = PROGRAM_COLOR[programId];
  b.wheel(0, 0, 0, .2, .05, c, 10, Math.PI / 2);
  b.push(0, 0, .03);
  if (programId === 'tale') { b.soft(0, 0, 0, .2, .17, .04, PAL.white, .3); [-1, 1].forEach(s => b.box(s * .05, .01, .025, .045, .045, .01, PAL.ink)); }
  else if (programId === 'master') { b.box(-.04, -.03, 0, .12, .07, .04, PAL.white).box(.05, .04, 0, .1, .07, .04, PAL.white); }
  else if (programId === 'spike') { b.box(0, 0, 0, .16, .16, .04, PAL.yellow); for (let i = 0; i < 3; i++) b.box(-.045 + i * .045, .02, .025, .025, .025, .01, PAL.white); }
  else if (programId === 'electronics') { b.push(0, 0, 0, 0, 0, .5).box(0, .03, 0, .05, .12, .04, PAL.yellow).pop().push(0, 0, 0, 0, 0, .5).box(.02, -.05, 0, .05, .12, .04, PAL.yellow).pop(); }
  else if (programId === 'drones') { b.box(0, 0, 0, .2, .03, .04, PAL.white, 0).box(0, 0, 0, .03, .2, .04, PAL.white); }
  else { b.soft(0, 0, 0, .2, .1, .05, PAL.white, .3); b.box(0, 0, .03, .14, .05, .01, PAL.ink); }
  b.pop();
}

/** Shared workshop shell: platform, frame, pergola, emblem and storage. */
export function buildWorkshopShell(b, w, out) {
  const rig = b.rig, W = w.w, D = w.d, c = PROGRAM_COLOR[w.programId], open = w.row === 'front';
  const base = stage(out, rig.add('base', 'root', 0, 0, 0), 0, 'pop');
  b.base('soft').bone(base).shade(.8);
  if (w.programId === 'immersive') {
    b.cyl(0, 0, 0, 1.3, 1.3, .1, PAL.paving, 12).shade(1).cyl(0, .1, 0, 1.1, 1.1, .015, tint(c, .55), 12);
    b.cyl(0, .115, 0, .7, .7, .006, tint(c, .3), 12).shade(.84);
  } else if (w.programId === 'drones') {
    b.block(0, 0, 0, W, .08, D, PAL.paving2);
  } else {
    b.block(0, 0, 0, W, .1, D, PAL.paving);
    b.shade(1).tile(0, .1 + .012, .06, W - .24, D - .36, tint(c, .62)).shade(.84);
    b.box(0, .06, D / 2 + .005, W, .03, .01, c);
  }
  const frame = stage(out, rig.add('frame', 'root', 0, 0, 0), 1, 'rise');
  b.base('solid').bone(frame);
  if (!open) {
    // Light frame; the shade canopy covers only the storage strip at the back,
    // so the activity floor stays open to the camera.
    for (const x of [-W / 2 + .06, W / 2 - .06]) {
      b.block(x, .1, -D / 2 + .06, .07, 1.45, .07, PAL.frame).block(x, .1, -D / 2 + .9, .06, 1.45, .06, PAL.frame);
      b.block(x, 1.48, -D / 2 + .5, .06, .08, .95, PAL.frame);
    }
    b.block(0, 1.48, -D / 2 + .06, W, .08, .08, PAL.frame);
    const roof = stage(out, rig.add('roof', 'root', 0, 1.56, 0), 3, 'drop');
    out.roofs.push(roof);
    b.bone(roof).shade(.8);
    for (let i = 0; i < 5; i++) b.block(0, 0, -D / 2 + .08 + i * .2, W + .12, .06, .1, i % 2 ? PAL.roofLight : PAL.roof);
    b.block(0, .06, -D / 2 + .48, .06, .05, 1.0, c);
    b.shade(.84);
  }
  b.base('soft');
  // Emblem post: technology identity without text.
  const sign = stage(out, rig.add('sign', 'root', -W / 2 + .2, 0, -D / 2 + .2), 2, 'rise');
  b.bone(sign).block(0, 0, 0, .06, open ? 1.25 : 1.05, .06, PAL.inkSoft);
  b.push(0, open ? 1.3 : 1.12, 0, .4); emblem(b, w.programId); b.pop();
  return { base, frame };
}

/** Storage that represents the kit inventory (bounded) and the payment plan. */
export function buildStorage(b, w, out, x, z, ry = 0) {
  const rig = b.rig, c = PROGRAM_COLOR[w.programId];
  const shelf = stage(out, rig.add('shelf', 'root', x, .1, z), 2, 'pop');
  shelf.rotation.y = ry; shelf.userData.rest.quaternion.copy(shelf.quaternion);
  b.bone(shelf);
  b.block(0, 0, 0, .78, .04, .26, PAL.woodDark).block(0, .25, 0, .78, .03, .26, PAL.wood).block(0, .5, 0, .78, .03, .26, PAL.wood);
  [-.38, .38].forEach(dx => b.block(dx, 0, 0, .04, .53, .26, PAL.woodDark));
  const owned = w.plans.includes('INTEGRA'), rented = w.plans.includes('FLEX'), installments = w.plans.find(plan => plan === 'EV8' || plan === 'EV16');
  for (let i = 0; i < w.shelf; i++) {
    const box = stage(out, rig.add('kit:' + i, shelf, -.27 + (i % 4) * .18, .04 + Math.floor(i / 4) * .25, 0), 2.2 + i * .08, 'pop');
    b.bone(box).block(0, 0, 0, .15, .16, .2, w.programId === 'master' ? '#46C6BE' : w.programId === 'spike' ? PAL.yellow : PAL.white);
    b.block(0, .16, 0, .16, .03, .21, c);
    if (owned) b.box(0, .08, .105, .06, .07, .01, PAL.plum);
    if (rented) b.box(0, .08, .105, .07, .045, .01, PAL.turquoise);
  }
  out.plan = { owned, rented, installments: installments ? (installments === 'EV8' ? 8 : 16) : 0, terms: w.flexBimestres.length ? Math.max(...w.flexBimestres) : 1 };
  return shelf;
}

// ---------------------------------------------------------------- circulation
export function buildCirculation(b, s) {
  const rig = b.rig, out = meta(), z = ROOM.d / 2 + .32, len = s.to - s.from;
  out.focus = [(s.from + s.to) / 2, .3, z];
  const deck = stage(out, rig.add('deck', 'root', 0, 0, 0), 0, 'pop');
  b.bone(deck);
  // Turquoise balcony along the upper classrooms, starting at the stair landing.
  const x0 = s.stairsX - .42, x1 = s.to;
  b.block((x0 + x1) / 2, -.06, z, x1 - x0, .1, .55, PAL.turquoise);
  b.shade(1).tile((x0 + x1) / 2, .04 + .01, z, x1 - x0 - .04, .5, '#BFF1EF').shade(.84);
  // Slim supports where the balcony crosses open ground.
  for (let x = x0 + .12; x < x1; x += 2.6) b.block(x, -H, z + .2, .07, H - .06, .07, PAL.frame);
  const rail = stage(out, rig.add('rail', 'root', 0, 0, 0), 1, 'rise');
  b.bone(rail);
  b.block((x0 + x1) / 2, .52, z + .25, x1 - x0, .05, .05, PAL.frame);
  for (let x = x0 + .1; x < x1; x += .52) b.block(x, .04, z + .25, .04, .5, .04, PAL.frame);
  b.layer('glass').block((x0 + x1) / 2, .06, z + .25, x1 - x0, .42, .02, PAL.glass).layer('main');
  // Stairs: a turquoise flight rising toward the front at the west end.
  const stairs = stage(out, rig.add('stairs', 'root', s.stairsX, -H, 0), .5, 'rise');
  b.bone(stairs);
  const steps = 10, run = .24, rise = H / steps;
  for (let i = 0; i < steps; i++) {
    const zz = -1.15 + i * run;
    b.block(0, 0, zz, .7, rise * (i + 1), run, i % 2 ? PAL.turquoise : PAL.turquoiseDark);
    b.shade(1).tile(0, rise * (i + 1) + .012, zz, .66, run - .02, PAL.path).shade(.84);
  }
  b.block(-.38, 0, -.1, .05, H + .5, .05, PAL.frame);
  b.push(-.38, H * .5 + .2, -.1, 0, -Math.atan2(H, steps * run)).box(0, 0, 0, .04, .04, steps * run + .3, PAL.frame).pop();
  out.proxy = { x: (x0 + x1) / 2, y: 0, z, w: x1 - x0, h: .6, d: .6 };
  return out;
}

// ---------------------------------------------------------------- environment
const cornerH = (x, z) => (hash(Math.round(x * 100), Math.round(z * 100), 'h') - .5) * .07;

function terrainTile(b, rig, out, tile, set, index) {
  const [i, k, x, z] = tile;
  const bone = stage(out, rig.add(`tile:${i}:${k}`, 'root', x, 0, z), .02 * (Math.abs(i) + Math.abs(k)) + index * .002, 'tile');
  b.bone(bone).shade(1);
  const hs = TILE / 2, corners = [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]];
  const y = ([cx, cz]) => cornerH(x + cx, z + cz);
  const center = [0, (hash(i, k, 'c') - .5) * .06 + .01, 0];
  for (let c = 0; c < 4; c++) {
    const a = corners[c], d = corners[(c + 1) % 4];
    const tone = pick([PAL.lawn, PAL.lawn2, PAL.lawn3, PAL.lawn], i, k, c);
    b.face(center, [a[0], y(a), a[1]], [d[0], y(d), d[1]], tone, [0, 1, 0]);
  }
  // Cliffs where the island ends: faceted strata in deeper violets.
  const sides = [[0, -1, 0, 1], [1, 0, 1, 2], [0, 1, 2, 3], [-1, 0, 3, 0]];
  for (const [di, dk, ca, cb] of sides) {
    if (set.has((i + di) + ':' + (k + dk))) continue;
    const a = corners[ca], d = corners[cb], outward = [di, 0, dk];
    const mid = -.32 + (hash(i, k, di, dk) - .5) * .12, bottom = -.85 - hash(i, k, 'b', di) * .25;
    const bulge = (hash(i, k, 'g', dk) - .3) * .08;
    const ma = [a[0] + di * bulge, mid, a[1] + dk * bulge], md = [d[0] + di * bulge, mid + .05, d[1] + dk * bulge];
    b.face([a[0], y(a), a[1]], [d[0], y(d), d[1]], md, PAL.cliff, outward).face([a[0], y(a), a[1]], md, ma, PAL.cliff, outward);
    b.face(ma, md, [d[0] * .92, bottom, d[1] * .92], PAL.cliff2, outward).face(ma, [d[0] * .92, bottom, d[1] * .92], [a[0] * .92, bottom - .05, a[1] * .92], pick([PAL.cliff2, PAL.cliff3], i, k, di), outward);
  }
  b.shade(.84);
}

function tree(b, rig, out, v, index) {
  const bone = stage(out, rig.add(v.key, 'root', v.x, 0, v.z), 2 + index * .05, 'grow');
  const s = v.scale * .78;
  b.bone(bone);
  if (v.type === 'pine') {
    b.cyl(0, 0, 0, .07 * s, .05 * s, .35 * s, PAL.trunk, 5);
    [[.42, .3, PAL.pine], [.34, .62, '#3C9C6E'], [.24, .9, '#52B07A']].forEach(([r, y, c]) => b.cone(0, y * s - .05, 0, r * s, .55 * s, c, 7, hash(v.key) * 3));
  } else if (v.type === 'bush') {
    b.ball(0, .18 * s, 0, .3 * s, .22 * s, .28 * s, PAL.leaf2).ball(.15 * s, .25 * s, .08, .2 * s, .17 * s, .2 * s, PAL.leaf);
  } else if (v.type === 'flowers') {
    b.shade(1).cyl(0, 0, 0, .34 * s, .3 * s, .06, PAL.leaf2, 7).shade(.84);
    for (let f = 0; f < 6; f++) { const a = f / 6 * TAU + hash(v.key); b.gem(Math.cos(a) * .18 * s, .1, Math.sin(a) * .18 * s, .05, .05, .05, pick([PAL.blossom, PAL.bloom, PAL.white, '#FF7A59'], v.key, f)); }
  } else {
    const bloom = v.type === 'bloom';
    b.cyl(0, 0, 0, .08 * s, .06 * s, .55 * s, PAL.trunk, 5);
    b.push(0, 0, 0, 0, 0, .5).cyl(0, .3 * s, 0, .035 * s, .025 * s, .25 * s, PAL.trunk, 4).pop();
    b.ball(0, .8 * s, 0, .48 * s, .42 * s, .46 * s, bloom ? PAL.bloom : PAL.leaf2, 0, hash(v.key) * 3);
    b.ball(.18 * s, .98 * s, .06 * s, .32 * s, .3 * s, .3 * s, bloom ? '#FFE27A' : PAL.leaf, 0);
    b.ball(-.2 * s, .86 * s, -.05 * s, .26 * s, .24 * s, .26 * s, bloom ? '#FFC21A' : PAL.leaf3, 0);
  }
  b.layer('blob').bone(bone).blob(0, .01, 0, .45 * s, .38 * s, .22).layer('main');
  return bone;
}

export function buildEnvironment(b, env) {
  const rig = b.rig, out = meta();
  const set = new Set(env.tiles.map(([i, k]) => i + ':' + k));
  b.base('soft');
  env.tiles.forEach((tile, index) => terrainTile(b, rig, out, tile, set, index));

  // Turquoise circulation linking every sector, with an ivory centre line.
  const [wx0, wx1] = env.walk;
  const walk = stage(out, rig.add('walk', 'root', 0, 0, 0), 1, 'rise');
  b.bone(walk).shade(.85);
  b.block((wx0 + wx1) / 2, -.02, ROW_Z.walk, wx1 - wx0, .07, .86, PAL.turquoise);
  b.shade(1).tile((wx0 + wx1) / 2, .05 + .01, ROW_Z.walk, wx1 - wx0 - .1, .62, PAL.path);
  for (let x = wx0 + .3; x < wx1 - .2; x += .55) b.tile(x, .06 + .006, ROW_Z.walk, .26, .05, '#CFF4F2');
  const { x: px, z1 } = env.path;
  const pathLen = z1 - (ROW_Z.walk + .43);
  b.block(px, -.02, ROW_Z.walk + .43 + pathLen / 2, .46, .07, pathLen, PAL.turquoise);
  b.tile(px, .05 + .01, ROW_Z.walk + .43 + pathLen / 2, .34, pathLen, PAL.path).shade(.84);

  // Entrance: orange portal with a perch where Geeky waits in the overview.
  const gate = stage(out, rig.add('gate:' + env.gate.x + ':' + env.gate.z, 'root', env.gate.x, 0, env.gate.z), 1.5, 'drop');
  b.base('solid').bone(gate);
  [-.46, .46].forEach(x => b.block(x, 0, 0, .13, 1.3, .13, PAL.orange).block(x, 0, 0, .2, .08, .2, PAL.orangeLight));
  b.block(0, 1.3, 0, 1.08, .13, .18, PAL.orange);
  b.block(0, 1.43, 0, .5, .04, .22, PAL.ink);
  b.box(0, 1.37, .095, .7, .05, .01, PAL.white);
  out.gate = [env.gate.x, 1.47, env.gate.z];

  // Flag of Guatemala (plain celeste-white-celeste) beside the entrance.
  const flagPole = stage(out, rig.add('flag', 'root', env.gate.x + .85, 0, env.gate.z + .05), 1.8, 'rise');
  b.bone(flagPole).cyl(0, 0, 0, .025, .02, 1.9, PAL.greyLight, 5).ball(0, 1.92, 0, .04, .04, .04, PAL.yellow);
  const flagBones = [];
  let parent = flagPole;
  for (let i = 0; i < 3; i++) {
    const seg = rig.add('flag:' + i, parent, i === 0 ? .02 : .16, i === 0 ? 1.62 : 0, 0);
    b.bone(seg).box(.08, .12, 0, .16, .24, .01, i === 1 ? PAL.white : '#4997D0');
    flagBones.push(seg); parent = seg;
  }

  // Life grows with the configuration: benches, lamps, bike rack, birds.
  const extras = stage(out, rig.add('extras', 'root', 0, 0, 0), 2.5, 'pop');
  b.base('soft').bone(extras);
  if (env.richness >= 1) for (const x of [wx0 - .35, wx1 + .35]) {
    b.block(x, .0, ROW_Z.walk, .3, .2, .9, PAL.orange).block(x, .2, ROW_Z.walk, .34, .05, .96, PAL.wood);
    b.block(x, 0, ROW_Z.walk + .6, .05, 1.05, .05, PAL.inkSoft);
    b.layer('glow').ball(x, 1.1, ROW_Z.walk + .6, .09, .09, .09, '#FFE6A8').layer('main');
  }
  if (env.richness >= 2) {
    const bx = env.path.x - .55, bz = env.path.z1 - .9;
    for (let i = 0; i < 3; i++) b.push(bx, .14, bz - i * .14, Math.PI / 2).ring(0, 0, 0, .12, .012, i ? PAL.teal : PAL.orange, 10, 3).pop();
    b.block(bx, 0, bz - .14, .02, .06, .4, PAL.inkSoft);
  }
  out.flag = flagBones;
  b.base('solid');
  out.trees = env.vegetation.map((v, index) => ({ bone: tree(b, rig, out, v, index), v }));
  out.birds = [];
  if (env.richness >= 3) {
    for (let i = 0; i < 3; i++) {
      const bird = rig.add('bird:' + i, 'root', 0, 2.6, 0);
      b.bone(bird).ball(0, 0, 0, .06, .05, .09, PAL.white).cone(0, -.0, .09, .025, .05, PAL.orange, 4);
      const wings = [-1, 1].map(side => { const wing = rig.add('bird:' + i + ':' + side, bird, side * .04, .02, 0); b.bone(wing).box(side * .08, 0, 0, .16, .01, .07, PAL.white); return wing; });
      out.birds.push({ bone: bird, wings, i });
    }
  }
  out.tick = (t, ctx) => {
    for (const { bone, v } of out.trees) {
      if (v.type === 'flowers') continue;
      bone.rotation.z = ctx.moving ? Math.sin(t * 1.1 + v.x) * .035 * (v.type === 'bush' ? .5 : 1) : 0;
      bone.rotation.x = ctx.moving ? Math.cos(t * .8 + v.z) * .025 : 0;
    }
    flagBones.forEach((seg, i) => { seg.rotation.y = ctx.moving ? Math.sin(t * 3.2 - i * .9) * .35 : .15; });
    out.birds.forEach(({ bone, wings, i }) => {
      const a = t * .35 + i * 2.1, cx = ctx.center?.x || 0;
      bone.position.set(cx + Math.cos(a) * (3.4 + i * .4), 2.7 + Math.sin(t * 1.3 + i) * .2 + i * .15, Math.sin(a) * (2.2 + i * .3));
      bone.rotation.y = -a;
      wings.forEach((wing, w) => { wing.rotation.z = (w ? -1 : 1) * (ctx.moving ? Math.sin(t * 14 + i) * .7 : .3); });
    });
  };
  out.focus = [env.gate.x, 1, env.gate.z];
  return out;
}

