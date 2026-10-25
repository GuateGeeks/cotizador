/**
 * Workshop activities and the walking community. Every activity is an
 * authored cycle with intent — programme, run, test, celebrate, take turns —
 * not an oscillation. Configuration changes who is there and how they work:
 *   participant groups → age/size and jumper colour of the crew;
 *   separate schedules → a waiting group on a bench swaps in each cycle;
 *   simultaneous groups → a second equipment set and crew work concurrently;
 *   stations           → numbered pads and the crew rotates between roles;
 *   equipment          → storage boxes (bounded) on the shelf;
 *   plan               → ownership badge, rental calendar or instalment board.
 * All animation is a pure function of time plus small persistent clocks.
 */
import { PAL, LEVEL_COLOR, PROGRAM_COLOR, TAU, clamp, lerp, span, smooth, pick } from './campus-kit.js';
import { addPerson, applyPose, placePerson, POSES, reach, blendBody, mixPose, along, turnTo } from './campus-people.js';
import { buildWorkshopShell, buildStorage, stage, tint } from './campus-architecture.js';

const meta = () => ({ staged: [], roofs: [], people: [], focus: [0, .8, 0], tick: null });
/** Catmull-Rom through [x, y, z] points; u in [0, 1]. */
function curve(pts, u) {
  const n = pts.length - 1, f = clamp(u) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  return [0, 1, 2].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t));
}

// ------------------------------------------------------------------ crews
/**
 * Places people in activity slots ([{ x, z, ry, y }]). Each cycle a schedule
 * maps people to slots; at the end of a cycle they walk to their next place
 * (stations rotate roles; separate schedules swap with the waiting bench).
 */
function crewEngine(b, w, out, slots, { cycle, bench, prefix = 'crew', levels, seedOffset = 0, rotate = false, relay = false }) {
  const pool = levels.length ? levels : ['prim'];
  const groups = relay ? 2 : 1, people = [];
  for (let g = 0; g < groups; g++) for (let i = 0; i < slots.length; i++) {
    const level = pool[(g + seedOffset) % pool.length];
    const s = relay && g === 1 ? bench[i % bench.length] : slots[i];
    // A second group of the same level wears a lighter jumper to stay distinguishable.
    const sweater = g === 1 && pool.length === 1 ? tint(LEVEL_COLOR[level] || PAL.teal, .45) : undefined;
    const p = addPerson(b, { id: `${prefix}:${g}:${i}`, level, x: s.x, z: s.z, ry: s.ry, y: s.y ?? .1, seed: w.key + prefix + g + i, sweater, headset: w.programId === 'immersive' && !(relay && g === 1) });
    stage(out, p.root, 4 + (g * slots.length + i) * .18, 'pop');
    people.push({ p, group: g, index: i });
  }
  const swap = 1.6;
  const seat = (person, n) => relay
    ? (n % 2 === person.group ? { kind: 'slot', i: person.index } : { kind: 'bench', i: person.index })
    : { kind: 'slot', i: rotate ? (person.index + n) % slots.length : person.index };
  const spot = s => s.kind === 'slot' ? slots[s.i] : bench[s.i % bench.length];
  return {
    people,
    /** pose(slotIndex, person, localTime, cycleIndex) → { pose, base, seat }. */
    tick(t, ctx, pose) {
      const n = ctx.moving ? Math.floor(t / cycle) : 0, local = ctx.moving ? t - n * cycle : ctx.still ?? cycle * .45;
      for (const person of people) {
        const a = spot(seat(person, n)), z = spot(seat(person, n + 1));
        if (ctx.moving && (relay || rotate) && local > cycle - swap && a !== z) {
          const k = span(local, cycle - swap, cycle), heading = Math.atan2(z.x - a.x, z.z - a.z);
          const ry = k < .15 ? turnTo(a.ry, heading, k / .15) : k > .85 ? turnTo(heading, z.ry, (k - .85) / .15) : heading;
          placePerson(person.p, lerp(a.x, z.x, k), lerp(a.z, z.z, k), ry, lerp(a.y ?? .1, z.y ?? .1, k));
          applyPose(person.p, POSES.walk(t * 9, 1));
          continue;
        }
        placePerson(person.p, a.x, a.z, a.ry, a.y ?? .1);
        if (seat(person, n).kind === 'bench') {
          applyPose(person.p, blendBody(POSES.sit(), ctx.moving && (t + person.index * 2) % 6 < 1.2 ? POSES.wave(t) : POSES.stand()), 'sit', .24);
          continue;
        }
        const result = pose(seat(person, n).i, person, local, n);
        applyPose(person.p, result.pose, result.base || 'stand', result.seat);
      }
    }
  };
}

/** Schedule representations: waiting bench with a clock, or a pending hourglass. */
function scheduleProps(b, w, out, [x, z, ry]) {
  const rig = b.rig, modes = w.sharingModes;
  const separate = modes.includes('separate');
  const pending = modes.includes('unknown') && !separate && !modes.includes('simultaneous');
  const result = { bench: [], clock: null, hourglass: null };
  if (separate) {
    const bench = stage(out, rig.add('bench', 'root', x, 0, z), 2.4, 'pop');
    bench.rotation.y = ry; bench.userData.rest.quaternion.copy(bench.quaternion);
    b.bone(bench).block(0, 0, 0, .9, .22, .26, PAL.orange).block(0, .22, 0, .96, .04, .3, PAL.wood);
    b.block(.62, 0, 0, .04, 1.0, .04, PAL.inkSoft).push(.62, 1.05, 0, 0, Math.PI / 2).cyl(0, -.02, 0, .15, .15, .04, PAL.white, 12).cyl(0, -.035, 0, .17, .17, .02, PAL.ink, 12).pop();
    const hands = [rig.add('clock:h', bench, .62, 1.05, .035), rig.add('clock:m', bench, .62, 1.05, .04)];
    b.bone(hands[0]).box(0, .045, 0, .025, .09, .01, PAL.ink);
    b.bone(hands[1]).box(0, .06, 0, .018, .12, .01, PAL.orange);
    result.clock = hands;
    const c = Math.cos(ry), s = Math.sin(ry);
    result.bench = [-.25, .2].map(dx => ({ x: x + dx * c, z: z - dx * s, ry, y: 0 }));
  } else if (pending) {
    const sign = stage(out, rig.add('pending', 'root', x, 0, z), 2.4, 'pop');
    b.bone(sign).block(0, 0, 0, .05, .72, .05, PAL.inkSoft);
    const glass = rig.add('pending:glass', sign, 0, .92, 0);
    b.bone(glass).cone(0, 0, 0, .14, .16, PAL.turquoise, 6).push(0, 0, 0, 0, Math.PI).cone(0, 0, 0, .14, .16, PAL.turquoise, 6).pop();
    b.cyl(0, .16, 0, .16, .16, .03, PAL.white, 6).cyl(0, -.19, 0, .16, .16, .03, PAL.white, 6);
    result.hourglass = glass;
  }
  return result;
}

/** Plan representation: ownership badge, rental calendar or instalment board, plus a delivery cart. */
function planProps(b, w, out, [x, z]) {
  const rig = b.rig, plan = out.plan || {}, result = { tiles: [], badge: null, cart: null };
  if (!plan.rented && !plan.installments && !plan.owned) return result;
  const board = stage(out, rig.add('plan', 'root', x, .1, z), 2.6, 'pop');
  b.bone(board).block(0, 0, 0, .05, .75, .05, PAL.inkSoft).block(0, .7, 0, .62, .34, .05, PAL.white);
  if (plan.owned) {
    // Bought: the school's badge is on the kit from day one.
    b.block(0, .76, .03, .2, .2, .03, PAL.plum).push(0, .76, .03, 0, Math.PI).cone(0, 0, 0, .1, .08, PAL.plum, 4).pop();
    b.box(0, .86, .05, .08, .08, .01, PAL.yellow);
  } else {
    const terms = plan.rented ? Math.max(1, Math.min(4, plan.terms)) : plan.installments;
    const cols = plan.rented ? terms : 8, rows = plan.rented ? 1 : plan.installments / 8;
    const cw = .54 / cols, ch = rows === 1 ? .18 : .1;
    for (let i = 0; i < terms; i++) {
      const cx = -.27 + cw * (i % cols) + cw / 2, cy = .87 + (rows === 1 ? 0 : (Math.floor(i / cols) ? -.06 : .06));
      b.bone(board).box(cx, cy, .03, cw - .02, ch - .02, .01, PAL.greyLight);
      const tile = rig.add('term:' + i, board, cx, cy, .04);
      b.bone(tile).box(0, 0, 0, cw - .02, ch - .02, .01, plan.rented ? PAL.turquoise : PAL.orange);
      result.tiles.push(tile);
    }
    if (plan.installments) {
      const badge = rig.add('badge', board, .38, .87, .02);
      b.bone(badge).block(0, -.1, 0, .16, .16, .03, PAL.plum).box(0, -.01, .02, .06, .06, .01, PAL.yellow);
      result.badge = badge;
    }
  }
  const cart = rig.add('cart', 'root', x + 1.6, .1, z + .45);
  b.bone(cart).block(0, .06, 0, .4, .05, .26, PAL.orange).block(-.05, .11, 0, .18, .16, .2, PAL.white).block(.12, .11, 0, .1, .12, .18, PROGRAM_COLOR[w.programId]);
  [-.14, .14].forEach(dx => [-.12, .12].forEach(dz => b.wheel(dx, .04, dz, .04, .03, PAL.ink, 6)));
  b.block(-.22, .06, 0, .03, .35, .2, PAL.inkSoft);
  result.cart = cart; result.home = [x + .45, .1, z + .4];
  return result;
}

function animatePlan(props, t, ctx) {
  if (props.tiles.length) {
    // Rental terms or instalments advance; ownership arrives at the end of the plan.
    const loop = props.badge ? 18 : 12, local = ctx.moving ? t % loop : loop * .95;
    props.tiles.forEach((tile, i) => { const on = local > (i + 1) / (props.tiles.length + 1) * loop * .8; tile.scale.set(on ? 1 : .001, on ? 1 : .001, 1); });
    if (props.badge) props.badge.scale.setScalar(Math.max(.001, ctx.moving ? span(local, loop * .85, loop * .9) : 1));
  }
  if (props.cart) {
    const since = ctx.cue?.kind === 'plan' && ctx.cue.programId === ctx.programId ? ctx.time - ctx.cue.at : 99;
    const visible = ctx.moving && since < 5.5, k = span(since, 0, 1.6) - span(since, 3.8, 5.4);
    const [hx, , hz] = props.home, rest = props.cart.userData.rest.position;
    props.cart.scale.setScalar(visible ? 1 : .001);
    props.cart.position.set(lerp(rest.x, hx, k), rest.y, lerp(rest.z, hz, k));
  }
}

// ------------------------------------------------------------------ Tale-Bot
function taleBot(b, rig, name, accessory) {
  const bot = rig.add(name, 'root', 0, 0, 0), body = rig.add(name + ':body', bot, 0, 0, 0), eyes = rig.add(name + ':eyes', body, 0, .1, .1);
  // Toy scale (about 1.5×) so the robot reads beside preprimaria children.
  b.push(0, 0, 0, 0, 0, 0, 1.45);
  b.bone(body).shade(.9).soft(0, .1, 0, .2, .18, .2, PAL.white, .32);
  ['#F2545B', '#FF8B22', '#3BB273', '#3A7BE0', '#FFD23F'].forEach((c, i) => b.block(-.06 + (i % 3) * .06, .19, -.03 + Math.floor(i / 3) * .06, .04, .02, .04, c));
  if (accessory === 'beak') b.push(0, .07, .1, 0, Math.PI / 2).cone(0, 0, 0, .04, .07, PAL.red, 5).pop();
  if (accessory === 'arms') [-1, 1].forEach(s => b.block(s * .12, .04, .04, .03, .03, .16, '#5CC7E8'));
  b.bone(eyes).shade(1);
  [-1, 1].forEach(s => { b.push(s * .065, 0, .045, 0, Math.PI / 2).cyl(0, 0, 0, .046, .046, .016, PAL.ink, 8).pop(); b.box(s * .065 + .015, .017, .066, .017, .017, .005, PAL.white); });
  b.pop();
  b.layer('blob').bone(bot).blob(0, .01, 0, .22, .22, .3).layer('main').shade(.84);
  return { bot, body, eyes };
}

function buildTale(b, w, out) {
  const rig = b.rig, cell = .3, mx = .12, mz = .08;
  const at = (i, j) => [mx + (i - 1.5) * cell, mz + (j - 1.5) * cell];
  const mat = stage(out, rig.add('mat', 'root', 0, .112, 0), 2, 'pop');
  b.bone(mat).shade(1);
  const tones = ['#FFE7A3', '#C7F0E8', '#FFD0DA', '#D9E8FF'];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const [x, z] = at(i, j); b.tile(x, .012, z, cell - .015, cell - .015, tones[(i + j * 2) % 4]); }
  b.shade(.84);
  const [hx, hz] = at(2, 1), [tx, tz] = at(3, 3);
  b.block(hx + .07, .012, hz - .07, .07, .06, .07, '#E85D75').push(hx + .07, .072, hz - .07, Math.PI / 4).cone(0, 0, 0, .065, .06, PAL.roof, 4).pop();
  b.cyl(tx - .06, .012, tz - .05, .015, .012, .05, PAL.trunk, 4).cone(tx - .06, .05, tz - .05, .05, .09, PAL.leaf2, 6);
  // Command cards beside the mat; each lights up while the robot runs it.
  const program = ['F', 'F', 'R', 'F', 'F'];
  const cards = program.map((cmd, i) => {
    const card = rig.add('card:' + i, mat, -.62, .012, -.34 + i * .18);
    b.bone(card).tile(0, .015, 0, .15, .15, cmd === 'F' ? '#F2545B' : '#FFB000');
    if (cmd === 'F') b.face([-.04, .02, .03], [.04, .02, .03], [0, .02, -.05], PAL.white, [0, 1, 0]);
    else b.face([-.04, .02, -.03], [-.04, .02, .05], [.05, .02, .01], PAL.white, [0, 1, 0]);
    return card;
  });
  const sets = Array.from({ length: w.sets }, (_, s) => ({ ...taleBot(b, rig, 'bot:' + s, s ? 'arms' : 'beak'), start: s ? [3, 3] : [0, 3], turn: s ? 1 : -1, s }));
  function botPose(set, k) {
    let [i, j] = set.start, heading = Math.PI;
    const steps = [];
    for (const cmd of program) {
      const from = { i, j, heading };
      if (cmd === 'F') { i += Math.round(Math.sin(heading)); j += Math.round(Math.cos(heading)); } else heading += set.turn * Math.PI / 2;
      steps.push({ from, to: { i, j, heading } });
    }
    if (k <= 0) return { ...steps[0].from, step: -1 };
    const f = Math.min(steps.length - 1e-6, k * steps.length), n = Math.floor(f), p = smooth(f - n), st = steps[n];
    return { i: lerp(st.from.i, st.to.i, p), j: lerp(st.from.j, st.to.j, p), heading: lerp(st.from.heading, st.to.heading, p), step: n, moving: p > 0 && p < 1 };
  }
  const L = 12;
  const slots = [{ x: -.95, z: -.05, ry: Math.PI / 2 }, { x: .15, z: -.8, ry: 0 }];
  const sched = scheduleProps(b, w, out, [.62, 1.4, 0]);
  const crews = [crewEngine(b, w, out, slots, { cycle: L, bench: sched.bench, levels: w.participantLevels, rotate: w.stations, relay: !!sched.bench.length })];
  if (w.sets > 1) crews.push(crewEngine(b, w, out, [{ x: .95, z: .75, ry: -Math.PI / 2 - .4 }], { cycle: L, bench: [], prefix: 'crew2', levels: w.participantLevels, seedOffset: 1 }));
  out.focus = [.05, .35, .1];
  return {
    cycle: L, sched,
    tick(t, ctx) {
      const local = ctx.moving ? t % L : 6.2;
      const placed = Math.min(5, Math.floor(local / .55));
      const run = span(local, 3.6, 9.0), back = span(local, 10.4, 11.8);
      cards.forEach((card, i) => {
        const shown = local < 11.6 ? (i < placed ? 1 : 0) : 1 - span(local, 11.6, 12);
        const active = run > 0 && run < 1 && Math.floor(run * 5) === i;
        const s = Math.max(.001, shown), k = active ? 1.35 : 1;
        card.scale.set(s * k, s, s * k);
        card.position.y = .012 + (active ? .03 : 0);
      });
      for (const set of sets) {
        const pose = botPose(set, local < 9 ? run : 1 - back), [x, z] = at(pose.i, pose.j);
        set.bot.position.set(x, .124, z);
        set.bot.rotation.y = pose.heading;
        const party = local > 9 && local < 10.4;
        set.body.position.y = party ? Math.abs(Math.sin(local * 12)) * .06 : pose.moving ? Math.abs(Math.sin(local * 20)) * .008 : 0;
        set.body.rotation.y = party ? Math.sin(local * 10) * .5 : 0;
        set.eyes.scale.set(1, (local > 3.4 && local < 3.6) || local % 3.1 < .12 ? .15 : 1, 1);
      }
      const pose = (slot, person, l) => {
        const party = l > 9 && l < 10.6;
        if (slot === 0) {
          if (l < 3) return { pose: blendBody(POSES.kneel(), reach(.75 - (l % .55 < .3 ? .2 : 0), 'R')), base: 'kneel' };
          if (l < 3.7) return { pose: blendBody(POSES.kneel(), reach(.6, 'R', .3)), base: 'kneel' };
          if (party) return { pose: blendBody(POSES.kneel(), POSES.cheer(l)), base: 'kneel' };
          const q = POSES.kneel(); q.head = [.3, Math.sin(l * .8) * .25, 0]; return { pose: q, base: 'kneel' };
        }
        if (party || !ctx.moving) return { pose: blendBody(POSES.kneel(), POSES.clap(l)), base: 'kneel' };
        const q = POSES.kneel(); q.head = [.35, Math.sin(l * .9) * .3, 0]; q.armL = [-.5, 0, -.1]; q.armR = [-.5, 0, .1]; q.foreL = [-1.2, 0, 0]; q.foreR = [-1.2, 0, 0];
        return { pose: q, base: 'kneel' };
      };
      crews.forEach(crew => crew.tick(t, { ...ctx, still: 6.2 }, pose));
      out.celebrate = local > 9 && local < 10.4;
    }
  };
}

// ------------------------------------------------------------------ Robot Master
function buildMaster(b, w, out) {
  const rig = b.rig;
  const track = stage(out, rig.add('track', 'root', .25, .112, .42), 2, 'pop');
  b.bone(track).shade(1).tile(0, .012, 0, 1.25, .62, '#CDEFA0').tile(0, .012 + .004, 0, 1.15, .04, PAL.white);
  [-.5, .5].forEach(x => b.tile(x, .012 + .004, 0, .04, .5, '#7BC86C'));
  b.shade(.84);
  // Build table with a tray of bricks and a tablet for programming.
  const table = stage(out, rig.add('table', 'root', -.35, .1, -.5), 2, 'pop');
  b.bone(table).block(0, .36, 0, .9, .05, .46, PAL.wood);
  [[-.4, -.18], [.4, -.18], [-.4, .18], [.4, .18]].forEach(([x, z]) => b.block(x, 0, z, .04, .36, .04, PAL.woodDark));
  b.block(-.18, .41, .02, .36, .05, .26, '#46C6BE');
  for (let i = 0; i < 12; i++) b.block(-.32 + (i % 4) * .09, .44, -.07 + Math.floor(i / 4) * .085, .06, .03, .05, pick(['#9BD34C', '#8D90A6', '#5CC7E8', '#FFD23F', '#FFFFFF'], i));
  b.tile(.25, .41 + .015, .05, .22, .16, PAL.ink);
  b.layer('glow').tile(.25, .426 + .003, .05, .19, .13, '#C8F7E1').layer('main');
  // Robot Master dinosaur: lime and grey bricks on articulated bones.
  const dinos = [];
  for (let s = 0; s < w.sets; s++) {
    const dino = rig.add('dino:' + s, 'root', -.15, .125, .42 - s * .3);
    const body = rig.add('dino:' + s + ':body', dino, 0, .16, 0);
    b.bone(body).block(0, -.05, 0, .32, .12, .17, '#9BD34C').block(0, .07, 0, .2, .07, .14, '#8D90A6').block(.03, .14, 0, .12, .04, .1, '#5CC7E8');
    for (let k = 0; k < 4; k++) b.wheel(-.12 + k * .08, -.05, .09, .015, .01, PAL.white, 5);
    const legs = [[-.1, -1], [.1, -1], [-.1, 1], [.1, 1]].map(([x, side], k) => {
      const leg = rig.add(`dino:${s}:leg:${k}`, body, x, -.08, side * .07);
      b.bone(leg).block(0, -.09, 0, .05, .1, .05, '#8D90A6').block(.02, -.11, 0, .08, .025, .06, '#6E7387');
      return leg;
    });
    const neck = rig.add(`dino:${s}:neck`, body, .15, .03, 0);
    b.bone(neck).push(0, 0, 0, 0, 0, -.6).block(0, 0, 0, .07, .16, .08, '#9BD34C').pop();
    const head = rig.add(`dino:${s}:head`, neck, .1, .13, 0);
    b.bone(head).block(.04, -.03, 0, .16, .07, .1, '#9BD34C');
    [-1, 1].forEach(side => b.box(.05, .02, side * .052, .035, .035, .01, PAL.white).box(.055, .02, side * .056, .018, .018, .01, PAL.ink));
    const jaw = rig.add(`dino:${s}:jaw`, head, -.02, -.07, 0);
    b.bone(jaw).block(.08, -.02, 0, .13, .025, .09, '#7AB83C');
    const tail = rig.add(`dino:${s}:tail`, body, -.16, 0, 0);
    b.bone(tail).push(-.08, 0, 0, 0, 0, .25).box(0, 0, 0, .16, .07, .08, '#9BD34C').pop();
    const tip = rig.add(`dino:${s}:tip`, tail, -.15, .04, 0);
    b.bone(tip).push(-.07, 0, 0, 0, 0, .35).box(0, 0, 0, .14, .045, .05, '#8D90A6').pop();
    b.layer('blob').bone(dino).blob(0, .01, 0, .28, .14, .25).layer('main');
    dinos.push({ dino, body, legs, neck, head, jaw, tail, tip, s, build: [legs, [neck, head], [tail, tip]] });
  }
  const L = 13;
  const slots = [{ x: -.62, z: .52, ry: Math.PI / 2 + .25 }, { x: -.2, z: -.95, ry: .2 }];
  const sched = scheduleProps(b, w, out, [.62, 1.4, 0]);
  const crews = [crewEngine(b, w, out, slots, { cycle: L, bench: sched.bench, levels: w.participantLevels, rotate: w.stations, relay: !!sched.bench.length })];
  if (w.sets > 1) crews.push(crewEngine(b, w, out, [{ x: .95, z: -.15, ry: -Math.PI / 2 }], { cycle: L, bench: [], prefix: 'crew2', levels: w.participantLevels, seedOffset: 1 }));
  out.focus = [.15, .35, .2];
  return {
    cycle: L, sched,
    tick(t, ctx) {
      const local = ctx.moving ? t % L : 7.4;
      for (const d of dinos) {
        // Build: legs, neck/head and tail snap on, one part per beat.
        d.build.forEach((parts, k) => {
          const shown = local < 11.5 ? span(local, .4 + k * 1.1, .7 + k * 1.1) : (k === 0 ? 1 : 1 - span(local, 12.2, 12.8));
          parts.forEach(part => part.scale.setScalar(Math.max(.001, shown)));
        });
        const go = span(local, 5, 7.6), back = span(local, 8.6, 11);
        d.dino.position.x = -.15 + (go - back) * .75 + (d.s ? .2 : 0);
        d.dino.rotation.y = local < 7.6 ? 0 : local < 8.6 ? Math.PI * span(local, 7.7, 8.5) : local < 11 ? Math.PI : Math.PI * (1 + span(local, 11, 11.6));
        const walking = (local > 5 && local < 7.6) || (local > 8.6 && local < 11);
        d.legs.forEach((leg, k) => { leg.rotation.z = walking ? Math.sin(local * 14 + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI : 0)) * .45 : 0; });
        d.body.position.y = .16 + (walking ? Math.abs(Math.sin(local * 14)) * .015 : 0);
        const roar = span(local, 7.6, 7.9) - span(local, 8.3, 8.6);
        d.jaw.rotation.z = -roar * .6; d.neck.rotation.z = roar * .35;
        const wag = walking ? 8 : 2;
        d.tail.rotation.y = Math.sin(local * wag) * .35; d.tip.rotation.y = Math.sin(local * wag - .8) * .45;
      }
      const pose = (slot, person, l) => {
        if (slot === 0) {
          if (l < 4) return { pose: blendBody(POSES.kneel(), reach(.7 - (l % 1.1 < .5 ? .25 : 0), l % 2.2 < 1.1 ? 'R' : 'L')), base: 'kneel' };
          if (l > 7.6 && l < 9) return { pose: blendBody(POSES.kneel(), POSES.cheer(l)), base: 'kneel' };
          const q = POSES.kneel(); q.head = [.25, Math.sin(l) * .3 - .4, 0]; return { pose: q, base: 'kneel' };
        }
        if (l > 4 && l < 5.4) return { pose: POSES.type(l) };
        if (l > 7.6 && l < 9) return { pose: POSES.cheer(l + 1) };
        return { pose: l < 4 ? POSES.tablet() : mixPose(POSES.tablet(), POSES.point(.4), .7) };
      };
      crews.forEach(crew => crew.tick(t, { ...ctx, still: 7.4 }, pose));
      out.celebrate = local > 7.6 && local < 9;
    }
  };
}

// ------------------------------------------------------------------ SPIKE Prime
function spikeBase(b, rig, name, position) {
  const bot = rig.add(name, 'root', ...position);
  const chassis = rig.add(name + ':chassis', bot, 0, 0, 0);
  b.bone(chassis).block(0, .06, 0, .2, .05, .26, PAL.white).block(0, .11, -.02, .17, .1, .2, PAL.yellow);
  b.box(0, .215, -.02, .13, .01, .13, PAL.ink);
  b.layer('glow');
  [[0, 0], [-.03, -.03], [.03, -.03], [-.03, .03], [.03, .03]].forEach(([x, z]) => b.box(x, .222, -.02 + z, .022, .004, .022, '#FFFFFF'));
  b.layer('main');
  [-1, 1].forEach(s => b.block(s * .1, .05, .02, .02, .06, .3, PAL.magenta));
  b.block(0, .03, .16, .07, .03, .05, PAL.teal);
  const wheels = [-1, 1].map(s => { const wheel = rig.add(name + ':wheel:' + s, bot, s * .135, .07, -.02); b.bone(wheel).wheel(0, 0, 0, .07, .04, PAL.teal, 8).wheel(0, 0, 0, .045, .045, PAL.white, 6); return wheel; });
  const arm = rig.add(name + ':arm', bot, 0, .13, .12);
  b.bone(arm).block(0, 0, .1, .03, .03, .2, PAL.magenta).block(0, -.04, .2, .08, .06, .03, PAL.white);
  b.layer('blob').bone(bot).blob(0, .01, 0, .2, .22, .3).layer('main');
  return { bot, chassis, wheels, arm };
}

function buildSpike(b, w, out) {
  const rig = b.rig, cx = .15, cz = .25, rx = .5, rz = .24;
  const mat = stage(out, rig.add('mat', 'root', 0, .112, 0), 2, 'pop');
  b.bone(mat).shade(1).tile(cx, .012, cz, 1.45, .82, PAL.white);
  b.tile(cx - .58, .012 + .004, cz, .22, .3, '#BFF1EF').tile(cx + .62, .012 + .004, cz, .16, .3, '#FFF1B0');
  // Black line loop for the line-following challenge.
  const loop = [];
  for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU; loop.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]); }
  for (let i = 0; i < 28; i++) { const [x1, z1] = loop[i], [x2, z2] = loop[i + 1]; b.push((x1 + x2) / 2, .013, (z1 + z2) / 2, Math.atan2(x2 - x1, z2 - z1)).tile(0, .004, 0, .03, Math.hypot(x2 - x1, z2 - z1) + .01, PAL.ink).pop(); }
  b.shade(.84);
  // Mission model: a lever that raises a flag when the robot pushes it.
  const mission = stage(out, rig.add('mission', 'root', cx + rx + .2, .112, cz), 2.2, 'pop');
  b.bone(mission).block(0, 0, 0, .05, .3, .05, PAL.yellow).block(0, .3, 0, .2, .04, .05, PAL.yellow).block(-.08, 0, 0, .05, .3, .05, PAL.white);
  const flag = rig.add('mission:flag', mission, .06, .32, 0);
  b.bone(flag).block(0, 0, 0, .02, .26, .02, PAL.ink).box(.07, .2, 0, .14, .09, .01, PAL.magenta);
  // Programming corner: stool and laptop.
  const desk = stage(out, rig.add('desk', 'root', -.62, .1, -.62), 2, 'pop');
  b.bone(desk).block(0, 0, 0, .5, .36, .36, PAL.wood).block(0, .36, 0, .32, .02, .22, PAL.greyLight);
  b.push(0, .37, -.1, 0, -.3).block(0, 0, 0, .32, .2, .015, PAL.ink).pop();
  b.layer('glow').push(0, .37, -.09, 0, -.3).block(0, .02, 0, .28, .16, .004, '#DDF7FF').pop().layer('main');
  const codeBlocks = ['#FFD23F', '#3A7BE0', '#E83E8C', '#3BB273'].map((c, i) => {
    const blk = rig.add('code:' + i, desk, -.08 + (i % 2) * .08, .43 + i * .028, -.08);
    b.bone(blk).box(0, 0, 0, .1, .02, .005, c);
    return blk;
  });
  b.bone('root').block(-.62, .1, -.28, .22, .22, .22, PAL.orange);
  const bots = Array.from({ length: w.sets }, (_, s) => spikeBase(b, rig, 'spike:' + s, [cx - rx, .124, cz]));
  const L = 12;
  const slots = [{ x: -.62, z: -.28, ry: Math.PI, y: .1 }, { x: -.85, z: .62, ry: Math.PI / 2 }];
  const sched = scheduleProps(b, w, out, [.62, 1.4, 0]);
  const crews = [crewEngine(b, w, out, slots, { cycle: L, bench: sched.bench, levels: w.participantLevels, rotate: w.stations, relay: !!sched.bench.length })];
  if (w.sets > 1) crews.push(crewEngine(b, w, out, [{ x: .95, z: -.4, ry: -Math.PI / 2 - .3 }], { cycle: L, bench: [], prefix: 'crew2', levels: w.participantLevels, seedOffset: 1 }));
  out.focus = [.15, .35, .2];
  return {
    cycle: L, sched,
    tick(t, ctx) {
      const local = ctx.moving ? t % L : 5.4;
      codeBlocks.forEach((blk, i) => blk.scale.setScalar(local < 2.2 && local < i * .45 ? .001 : 1));
      bots.forEach((bot, s) => {
        const l = local - s * .5;
        const toMission = span(l, 2.6, 4.8), after = span(l, 6.2, 8.6);
        const a = Math.PI + toMission * Math.PI + after * Math.PI;
        const kx = s ? .7 : 1, kz = s ? .6 : 1;
        bot.bot.position.set(cx + Math.cos(a) * rx * kx, .124, cz + Math.sin(a) * rz * kz);
        bot.bot.rotation.y = Math.atan2(-Math.sin(a) * rx * kx, Math.cos(a) * rz * kz);
        const rolling = (toMission > 0 && toMission < 1) || (after > 0 && after < 1);
        bot.wheels.forEach(wheel => { wheel.rotation.x = rolling ? local * 10 : 0; });
        bot.arm.rotation.x = -(span(l, 4.9, 5.4) - span(l, 5.8, 6.2)) * .9;
      });
      rig.get('mission:flag').rotation.z = -1.4 + (ctx.moving ? span(local, 5.2, 5.6) - span(local, 10.6, 11.2) : 1) * 1.4;
      const pose = (slot, person, l) => {
        if (slot === 0) {
          if (l < 2.4) return { pose: blendBody(POSES.sit(), POSES.type(l)), base: 'sit', seat: .22 };
          if (l > 5.4 && l < 7) return { pose: blendBody(POSES.sit(), POSES.cheer(l)), base: 'sit', seat: .22 };
          const q = blendBody(POSES.sit(), POSES.stand()); q.head = [-.05, -.9 + Math.sin(l * .7) * .3, 0]; return { pose: q, base: 'sit', seat: .22 };
        }
        if (l > 2 && l < 2.7) return { pose: blendBody(POSES.kneel(), reach(.7, 'R', .2)), base: 'kneel' };
        if (l > 5.4 && l < 7) return { pose: blendBody(POSES.kneel(), POSES.cheer(l + 1)), base: 'kneel' };
        const q = POSES.kneel(); q.head = [.2, Math.sin(l * .8) * .5, 0]; return { pose: q, base: 'kneel' };
      };
      crews.forEach(crew => crew.tick(t, { ...ctx, still: 5.4 }, pose));
      out.celebrate = local > 5.4 && local < 7;
    }
  };
}

// ------------------------------------------------------------------ Electronics
function buildElectronics(b, w, out) {
  const rig = b.rig;
  const bench = stage(out, rig.add('bench:table', 'root', 0, .1, 0), 2, 'pop');
  b.bone(bench).block(0, .4, 0, 1.3, .05, .62, PAL.wood);
  [[-.6, -.26], [.6, -.26], [-.6, .26], [.6, .26]].forEach(([x, z]) => b.block(x, 0, z, .05, .4, .05, PAL.woodDark));
  const boards = [];
  for (let s = 0; s < w.sets; s++) {
    const ox = s ? .35 : -.15;
    // Snap-circuit base: battery, switch, three LEDs, fan and connecting snaps.
    b.bone(bench).block(ox, .45, 0, .58, .025, .44, '#3A7BE0');
    for (let i = 0; i < 5; i++) b.tile(ox, .476 + .004, -.18 + i * .09, .54, .012, '#7FB2FF');
    b.block(ox - .2, .475, .1, .1, .07, .16, PAL.ink).block(ox - .2, .545, .06, .04, .02, .04, PAL.red);
    [[-.2, -.05, .025, .22, '#3BB273'], [0, -.16, .4, .025, '#F2545B'], [.2, 0, .025, .3, '#FFD23F'], [-.05, .16, .3, .025, '#FFFFFF']].forEach(([x, z, sx, sz, c]) => b.block(ox + x, .478, z, sx, .03, sz, c));
    b.block(ox + .05, .475, .05, .1, .03, .08, PAL.white);
    const lever = rig.add(`switch:${s}`, bench, ox + .05, .51, .05);
    b.bone(lever).block(0, 0, 0, .025, .06, .025, PAL.orange);
    const leds = [0, 1, 2].map(i => {
      b.bone(bench).cyl(ox - .06 + i * .1, .478, -.08, .022, .02, .04, PAL.greyLight, 6);
      b.ball(ox - .06 + i * .1, .54, -.08, .028, .036, .028, ['#B5405A', '#4F9A5D', '#B9A23F'][i]);
      const led = rig.add(`led:${s}:${i}`, bench, ox - .06 + i * .1, .54, -.08);
      b.bone(led).layer('glow').ball(0, 0, 0, .042, .052, .042, ['#FF5D73', '#7CFF8A', '#FFE66D'][i], 0).layer('main');
      return led;
    });
    b.bone(bench).cyl(ox + .2, .478, .12, .05, .05, .06, PAL.inkSoft, 8);
    const fan = rig.add(`fan:${s}`, bench, ox + .2, .55, .12);
    b.bone(fan).box(0, 0, 0, .2, .008, .035, PAL.orange).box(0, 0, 0, .035, .008, .2, PAL.orange);
    // The missing snap the student places to close the circuit.
    const piece = rig.add(`piece:${s}`, bench, ox + .15, .48, -.17);
    b.bone(piece).block(0, 0, 0, .14, .035, .04, '#F2545B');
    boards.push({ lever, leds, fan, piece, ox, s });
  }
  b.bone(bench).block(.48, .45, .14, .2, .04, .16, '#E9EEF7');
  for (let i = 0; i < 6; i++) b.block(.42 + (i % 3) * .06, .49, .1 + Math.floor(i / 3) * .07, .04, .02, .04, pick(['#F2545B', '#3BB273', '#FFD23F', '#3A7BE0'], i));
  // Multimeter with a glowing readout while a student tests the circuit.
  b.block(-.5, .45, -.18, .14, .04, .2, PAL.yellow).tile(-.5, .49 + .005, -.21, .1, .06, PAL.ink);
  const readout = rig.add('meter', bench, -.5, .5, -.21);
  b.bone(readout).layer('glow').box(0, 0, 0, .08, .004, .045, '#B8FFD0').layer('main');
  const L = 10;
  const slots = [{ x: -.05, z: -.62, ry: 0 }, { x: .9, z: .05, ry: -Math.PI / 2 }, { x: -.9, z: .05, ry: Math.PI / 2 }].slice(0, w.stations ? 3 : 2);
  const sched = scheduleProps(b, w, out, [.62, 1.4, 0]);
  const crews = [crewEngine(b, w, out, slots, { cycle: L, bench: sched.bench, levels: w.participantLevels, rotate: w.stations, relay: !!sched.bench.length })];
  if (w.sets > 1) crews.push(crewEngine(b, w, out, [{ x: .35, z: .62, ry: Math.PI }], { cycle: L, bench: [], prefix: 'crew2', levels: w.participantLevels, seedOffset: 1 }));
  out.focus = [0, .55, 0];
  return {
    cycle: L, sched,
    tick(t, ctx) {
      const local = ctx.moving ? t % L : 5;
      for (const board of boards) {
        const l = local - board.s * .4, k = span(l, .6, 1.9) - span(l, 8.6, 9.6);
        board.piece.position.set(board.ox + .15 - .1 * k, .48 + Math.sin(k * Math.PI) * .12, -.17 + k * .09);
        const on = l > 2.4 && l < 8.4;
        board.lever.rotation.x = on ? -.7 : .5;
        board.leds.forEach((led, i) => led.scale.setScalar(on && (!ctx.moving || Math.floor(l * 4) % 3 === i || l > 6.4) ? 1 : .001));
        board.fan.rotation.y = on ? l * 18 : 0;
      }
      rig.get('meter').scale.setScalar(!ctx.moving || (local > 4.4 && local < 6.4) ? 1 : .001);
      const pose = (slot, person, l) => {
        if (slot === 0) {
          if (l < 2) return { pose: reach(.15 + (l < 1 ? .2 : 0), 'R') };
          if (l > 6.4 && l < 7.8) return { pose: POSES.cheer(l) };
          const q = POSES.stand(); q.head = [.35, Math.sin(l) * .2, 0]; q.armL = [-.6, 0, -.2]; q.foreL = [-.8, 0, 0]; return { pose: q };
        }
        if (slot === 1) {
          if (l > 2 && l < 2.6) return { pose: reach(.2, 'L', .2) };
          if (l > 4.4 && l < 6.4) return { pose: reach(.25, 'B', .1) };
          if (l > 6.4 && l < 7.8) return { pose: POSES.clap(l) };
          return { pose: mixPose(POSES.stand(), POSES.point(.2), .4) };
        }
        return { pose: l > 6.4 && l < 7.8 ? POSES.clap(l) : POSES.tablet() };
      };
      crews.forEach(crew => crew.tick(t, { ...ctx, still: 5 }, pose));
      out.celebrate = local > 6.4 && local < 7.8;
    }
  };
}

// ------------------------------------------------------------------ Drones
function drone(b, rig, name) {
  const root = rig.add(name, 'root', 0, 0, 0), body = rig.add(name + ':body', root, 0, 0, 0);
  b.bone(body).shade(.9).soft(0, 0, 0, .16, .06, .2, PAL.white, .35).box(0, -.005, .1, .05, .035, .02, PAL.ink);
  b.layer('glow').box(0, .032, -.06, .03, .006, .03, '#7CFFB2').layer('main');
  const props = [];
  for (const [x, z] of [[-.13, -.12], [.13, -.12], [-.13, .12], [.13, .12]]) {
    b.bone(body).push(x / 2, 0, z / 2, Math.atan2(x, z)).box(0, 0, 0, .025, .02, Math.hypot(x, z), PAL.ink).pop();
    b.ring(x, .01, z, .085, .008, PAL.ink, 10, 3, 0, Math.PI / 2);
    b.cyl(x, -.01, z, .015, .015, .04, PAL.inkSoft, 5);
    const prop = rig.add(name + ':prop:' + props.length, body, x, .035, z);
    b.bone(prop).box(0, 0, 0, .15, .005, .022, '#5B5870').box(0, 0, 0, .022, .005, .15, '#5B5870');
    props.push(prop);
  }
  const shadow = rig.add(name + ':shadow', 'root', 0, 0, 0);
  b.layer('blob').bone(shadow).blob(0, 0, 0, .18, .18, .25).layer('main').shade(.84);
  return { root, body, props, shadow };
}

function buildDrones(b, w, out) {
  const rig = b.rig, W = w.w, D = w.d;
  const field = stage(out, rig.add('field', 'root', 0, .08, 0), 2, 'pop');
  // Flight map: green land, lakes, a volcano and orange landing pads.
  b.bone(field).shade(1).tile(0, .012, 0, W - .3, D - .3, '#9ED67A');
  b.slab([[-1.9, -.85], [-1.0, -.9], [-.7, -.45], [-1.2, -.25], [-1.9, -.35]], .012, .006, '#6FC6EA');
  b.slab([[.5, .55], [1.3, .5], [1.6, .82], [.7, .9]], .012, .006, '#6FC6EA');
  for (let i = 0; i < 6; i++) b.tile(-.4 + i * .25, .014 + .005, .62 - Math.sin(i) * .1, .2, .04, '#F3E9DA', .3 * Math.sin(i));
  b.shade(.84).cone(-1.55, .012, -.55, .38, .42, '#7A6A8C', 7).cone(-1.55, .3, -.55, .14, .14, '#3E3550', 7);
  b.shade(1);
  const pads = [[-1.35, .45], [1.35, -.15]];
  if (w.sets > 1) pads.push([.1, .62], [-.3, -.6]);
  pads.forEach(([x, z]) => { b.cyl(x, .012, z, .22, .22, .012, PAL.orange, 10).tile(x - .06, .024 + .004, z, .03, .16, PAL.white).tile(x + .06, .024 + .004, z, .03, .16, PAL.white).tile(x, .024 + .004, z, .1, .03, PAL.white); });
  b.shade(.84);
  // Hoop gate and a light enclosure frame.
  const hoop = stage(out, rig.add('hoop', 'root', .05, .08, -.25), 2.3, 'rise');
  b.bone(hoop).block(-.32, 0, 0, .04, .95, .04, PAL.white).block(.32, 0, 0, .04, .95, .04, PAL.white).ring(0, .95, 0, .3, .03, PAL.orange, 16, 4);
  const frame = stage(out, rig.add('net', 'root', 0, 0, 0), 1, 'rise');
  b.bone(frame);
  // Low safety posts with orange caps mark the flight zone without hiding the workshops behind it.
  for (const [x, z] of [[-W / 2 + .1, -D / 2 + .1], [W / 2 - .1, -D / 2 + .1], [-W / 2 + .1, D / 2 - .1], [W / 2 - .1, D / 2 - .1]]) b.block(x, .08, z, .05, .7, .05, PAL.frame).block(x, .78, z, .08, .06, .08, PAL.orange);
  b.block(0, .5, D / 2 - .1, W - .2, .025, .025, PAL.orange).block(-W / 2 + .1, .5, 0, .025, .025, D - .2, PAL.orange);
  const drones = Array.from({ length: w.sets }, (_, s) => ({ ...drone(b, rig, 'drone:' + s), s }));
  const route = [[-1.35, .12, .45], [-1.3, .8, .4], [-.6, .95, -.2], [.05, 1.03, -.25], [.7, 1.1, -.4], [1.4, .95, -.45], [1.4, .5, -.18], [1.35, .12, -.15]];
  const route2 = [[.1, .12, .62], [.1, .9, .55], [-.6, 1.25, .1], [-1.0, 1.15, -.55], [-.5, .9, -.7], [-.3, .4, -.6], [-.3, .12, -.6]];
  const L = 14;
  const slots = [{ x: 1.85, z: .78, ry: -Math.PI / 2 - .5, y: .08 }, { x: 1.95, z: .2, ry: -Math.PI / 2 - .2, y: .08 }];
  const sched = scheduleProps(b, w, out, [-1.55, .78, 0]);
  // Pilots take turns every flight; separate schedules also swap groups.
  const crews = [crewEngine(b, w, out, slots, { cycle: L, bench: sched.bench, levels: w.participantLevels, rotate: true, relay: !!sched.bench.length })];
  if (w.sets > 1) crews.push(crewEngine(b, w, out, [{ x: -1.95, z: .75, ry: Math.PI / 2 + .4, y: .08 }], { cycle: L, bench: [], prefix: 'crew2', levels: w.participantLevels, seedOffset: 1 }));
  out.focus = [0, .7, 0];
  return {
    cycle: L, sched,
    tick(t, ctx) {
      const n = ctx.moving ? Math.floor(t / L) : 0, local = ctx.moving ? t - n * L : 5.2;
      drones.forEach(d => {
        const path = d.s ? route2 : route, reverse = !d.s && n % 2 === 1;
        const u = span(local - d.s * .8, 1.6, 10.2), k = reverse ? 1 - u : u;
        const p = curve(path, k), q = curve(path, clamp(k + (reverse ? -.02 : .02)));
        const flying = local > 1.6 && local < 10.4;
        d.root.position.set(p[0], p[1] + (flying && ctx.moving ? Math.sin(t * 6) * .01 : 0), p[2]);
        const dx = q[0] - p[0], dz = q[2] - p[2], speed = Math.hypot(dx, dz);
        if (speed > .001) d.root.rotation.y = ctx.moving ? turnTo(d.root.rotation.y, Math.atan2(dx, dz), .2) : Math.atan2(dx, dz);
        d.body.rotation.x = clamp(speed * 9, 0, .35);
        d.body.rotation.z = flying && ctx.moving ? Math.sin(t * 1.7 + d.s) * .05 : 0;
        const spin = ctx.moving ? span(local, .2, 1.4) - span(local, 10.4, 11.4) : 1;
        d.props.forEach((prop, i) => { prop.rotation.y = spin > .01 ? t * (i % 2 ? 40 : -40) * spin : .4; });
        d.shadow.position.set(p[0], .095, p[2]);
        d.shadow.scale.setScalar(clamp(1.1 - p[1] * .5, .45, 1));
      });
      const pose = (slot, person, l) => {
        if (slot === 0) return { pose: l > 10.4 && l < 11.6 ? POSES.cheer(l) : POSES.tablet() };
        if (l > 10.4 && l < 11.6) return { pose: POSES.clap(l) };
        return { pose: l > 1.6 && l < 10 ? POSES.point(Math.sin(l * .5) * .4) : POSES.stand() };
      };
      crews.forEach(crew => crew.tick(t, { ...ctx, still: 5.2 }, pose));
      out.celebrate = local > 10.4 && local < 11.6;
      const lead = drones[0].root.position;
      out.focus = [lead.x, Math.max(.7, lead.y), lead.z];
    }
  };
}

// ------------------------------------------------------------------ Immersive
function buildImmersive(b, w, out) {
  const rig = b.rig;
  const stand = stage(out, rig.add('stand', 'root', 0, .115, -.05), 2, 'pop');
  b.bone(stand).cyl(0, 0, 0, .26, .2, .12, PAL.ink, 8);
  b.layer('glow').ring(0, .13, 0, .2, .02, '#9FF4FF', 14, 3, 0, Math.PI / 2).layer('main');
  b.layer('glass').cyl(0, .13, 0, .2, .45, 1.0, '#C9F4FF', 8, true).layer('main');
  const holo = rig.add('holo', stand, 0, 1.18, 0);
  const worlds = [rig.add('holo:planet', holo, 0, 0, 0), rig.add('holo:temple', holo, 0, -.2, 0), rig.add('holo:molecule', holo, 0, 0, 0)];
  b.bone(worlds[0]).shade(.86).ball(0, 0, 0, .24, .24, .24, '#FF9F6B', 1).ring(0, 0, 0, .38, .025, '#FFE08A', 18, 3, 0, Math.PI / 2 - .35);
  const moon = rig.add('holo:moon', worlds[0], .45, .1, 0);
  b.bone(moon).ball(0, 0, 0, .06, .06, .06, '#E6E1F5', 0);
  // Templo I, Tikal: stepped pyramid with a roof comb, in pale stone.
  b.bone(worlds[1]);
  for (let i = 0; i < 6; i++) b.block(0, i * .065, 0, .5 - i * .07, .065, .44 - i * .062, i % 2 ? '#E8DCC0' : '#D9C9A6');
  b.block(0, .39, -.02, .1, .08, .1, '#E8DCC0').block(0, .47, -.03, .08, .1, .03, '#D9C9A6').block(0, .02, .2, .08, .32, .1, '#CBB98F');
  b.bone(worlds[2]);
  [[0, 0, 0, '#F2545B', .09], [.18, .08, 0, '#FFFFFF', .06], [-.16, .1, .05, '#FFFFFF', .06], [.02, -.17, .08, '#3A7BE0', .07]].forEach(([x, y, z, c, r], i) => {
    b.ball(x, y, z, r, r, r, c, 0);
    if (i) { const len = Math.hypot(x, y, z); b.push(x / 2, y / 2, z / 2, Math.atan2(x, z), Math.atan2(Math.hypot(x, z), y)).cyl(0, -len / 2, 0, .015, .015, len, PAL.greyLight, 4).pop(); }
  });
  b.shade(.84);
  const L = 15;
  const slots = [{ x: -.78, z: .32, ry: .55 }, { x: .78, z: .36, ry: -.55 }, { x: -.1, z: -.78, ry: .1 }].map(s => ({ ...s, y: .115 }));
  const sched = scheduleProps(b, w, out, [1.0, .95, -.5]);
  const crews = [crewEngine(b, w, out, slots, { cycle: L, bench: sched.bench, levels: w.participantLevels, rotate: w.stations, relay: !!sched.bench.length })];
  if (w.sets > 1) crews.push(crewEngine(b, w, out, [{ x: -.2, z: .9, ry: .3, y: .115 }, { x: .45, z: .85, ry: -.3, y: .115 }], { cycle: L, bench: [], prefix: 'crew2', levels: w.participantLevels, seedOffset: 1 }));
  const teacher = addPerson(b, { id: 'guide', role: 'teacher', x: 1.15, y: .1, z: -.55, ry: -.8, seed: w.key + 'guide' });
  stage(out, teacher.root, 4.6, 'pop');
  b.bone(teacher.joints.foreR).block(0, -.16, .06, .16, .02, .12, PAL.ink);
  out.focus = [0, .9, 0];
  return {
    cycle: L, sched,
    tick(t, ctx) {
      const local = ctx.moving ? t % L : 6.5, scene = Math.min(2, Math.floor(local / 5)), inScene = local - scene * 5;
      worlds.forEach((world, i) => world.scale.setScalar(Math.max(.001, i === scene ? (ctx.moving ? span(inScene, 0, .6) * (1 - span(inScene, 4.4, 5)) : 1) : 0)));
      holo.rotation.y = ctx.moving ? t * .5 : .6;
      holo.position.y = 1.18 + (ctx.moving ? Math.sin(t * 1.4) * .04 : 0);
      moon.position.set(Math.cos(t * 1.2) * .45, .1, Math.sin(t * 1.2) * .45);
      const pose = (slot, person, l) => {
        const sc = Math.min(2, Math.floor(l / 5)), base = POSES.vr(ctx.moving ? l : 1.2, slot * 1.7);
        if (sc === 0) { base.head[0] = -.5; base.armR = [-2.4, 0, .2]; }
        if (sc === 1 && slot === 2) return { pose: blendBody(POSES.kneel(), POSES.point(.3)), base: 'kneel' };
        if (sc === 2) { base.armL = [-1.3, .4, -.3]; base.armR = [-1.3, -.4, .3]; base.foreL = [-.6 + Math.sin(l * 3) * .2, 0, 0]; base.foreR = [-.6 + Math.cos(l * 3) * .2, 0, 0]; }
        return { pose: base };
      };
      crews.forEach(crew => crew.tick(t, { ...ctx, still: 6.5 }, pose));
      applyPose(teacher, mixPose(POSES.tablet(), POSES.point(-.5), ctx.moving && Math.sin(t * .7) > .3 ? 1 : 0));
      out.celebrate = inScene > 4 && inScene < 4.6;
    }
  };
}

const ACTIVITIES = { tale: buildTale, master: buildMaster, spike: buildSpike, electronics: buildElectronics, drones: buildDrones, immersive: buildImmersive };
const STATION_SPOTS = { tale: [[-.95, -.05], [.15, -.8]], master: [[-.62, .52], [-.2, -.95]], spike: [[-.62, -.28], [-.85, .62]], electronics: [[-.05, -.62], [.9, .05], [-.9, .05]], drones: [[1.85, .78], [1.95, .2]], immersive: [[-.78, .32], [.78, .36], [-.1, -.78]] };

export function buildWorkshop(b, w) {
  const out = meta();
  out.proxy = { x: 0, y: .7, z: 0, w: w.w, h: 1.5, d: w.d };
  buildWorkshopShell(b, w, out);
  b.base('soft');
  const storeAt = w.programId === 'drones' ? [-.95, -w.d / 2 - .3, 0] : w.programId === 'immersive' ? [1.05, -.95, -.5] : [.45, -w.d / 2 + .26, 0];
  buildStorage(b, w, out, ...storeAt);
  const activity = ACTIVITIES[w.programId](b, w, out);
  const planAt = w.programId === 'drones' ? [-1.85, -w.d / 2 - .3] : w.programId === 'immersive' ? [1.35, .35] : [1.0, -w.d / 2 + .3];
  const plan = planProps(b, w, out, planAt);
  // Station pads mark the rotation between roles.
  if (w.stations) {
    const pads = stage(out, b.rig.add('stations', 'root', 0, 0, 0), 2.8, 'pop');
    b.bone(pads).shade(1);
    STATION_SPOTS[w.programId].forEach(([x, z], i) => {
      b.cyl(x, .1, z, .2, .2, .012, [PAL.turquoise, PAL.orange, PAL.magenta][i], 10);
      for (let d = 0; d <= i; d++) b.cyl(x - .12 + d * .06, .112, z + .14, .022, .022, .006, PAL.white, 6);
    });
    b.shade(.84);
  }
  out.cycle = activity.cycle;
  out.tick = (t, ctx) => {
    activity.tick(t, ctx);
    const { clock, hourglass } = activity.sched;
    if (clock) {
      const k = ctx.moving ? (t % activity.cycle) / activity.cycle : .3, n = ctx.moving ? Math.floor(t / activity.cycle) : 2;
      clock[0].rotation.z = -((n % 12) + k) / 12 * TAU;
      clock[1].rotation.z = -k * TAU;
    }
    if (hourglass) hourglass.rotation.z = ctx.moving ? (Math.floor(t / 4) % 2) * Math.PI + span(t % 4, 3.4, 4) * Math.PI : 0;
    animatePlan(plan, t, { ...ctx, programId: w.programId });
  };
  return out;
}

// ------------------------------------------------------------------ community
/** Students walk from the entrance to a real classroom or workshop and back. */
export function buildPopulation(b, entity) {
  const out = meta(), walkers = [];
  for (const walker of entity.walkers) {
    const p = addPerson(b, { id: walker.key, level: walker.level, x: entity.route.gate[0], z: entity.route.gate[1], seed: walker.key + 'w',
      backpack: pick(['#FF8B22', '#25C2C6', '#E83E8C', '#FFD23F'], walker.key) });
    stage(out, p.root, 0, 'pop');
    walkers.push({ p, walker });
  }
  const T = 30;
  out.tick = (t, ctx) => {
    const { gate, walkZ, pathX } = entity.route, dests = entity.destinations;
    for (const { p, walker } of walkers) {
      // New arrivals start at the entrance; existing walkers keep their clock.
      if (!ctx.memory.has(walker.key)) ctx.memory.set(walker.key, ctx.moving && ctx.fresh ? t : t - walker.index * 4.2 - 3);
      const local = t - ctx.memory.get(walker.key), trip = Math.floor(local / T), u = (local % T) / T;
      const lane = walker.index % 2 ? .14 : -.14;
      if (!dests.length) { placePerson(p, gate[0] + walker.index * .3, gate[1] - .4, Math.PI); applyPose(p, POSES.wave(t)); continue; }
      const dest = dests[(walker.index + trip) % dests.length];
      const route = [[gate[0] + lane, gate[1]], [pathX + lane, walkZ + lane], [dest[0], walkZ + lane], [dest[0], dest[1]]];
      let pos, pose, heading;
      if (!ctx.moving) { pos = along(route, .3 + (walker.index * .17) % .6); heading = pos.heading; pose = POSES.walk(1.2 + walker.index, 1); }
      else if (u < .4) { pos = along(route, u / .4); heading = pos.heading; pose = POSES.walk(local * 8.5, 1); }
      else if (u < .6) { pos = along(route, 1); heading = (dest[1] < walkZ ? Math.PI : 0) + Math.sin(local * .7) * .6; pose = ctx.reaction ? POSES.cheer(t) : u < .5 ? POSES.wave(t) : POSES.stand(); }
      else { pos = along(route.slice().reverse(), (u - .6) / .4); heading = pos.heading; pose = POSES.walk(local * 8.5, 1); }
      placePerson(p, pos.x, pos.z, heading, 0);
      applyPose(p, pose);
    }
  };
  out.focus = [entity.route.pathX, .6, entity.route.walkZ];
  return out;
}
