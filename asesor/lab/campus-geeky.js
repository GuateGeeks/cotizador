/**
 * Geeky, the GuateGeeks guide, rebuilt in the campus' faceted style.
 * Proportions come from GuateGeeks/geeky-animation (src/live/core.mjs, identical
 * at 33f5920 and main 0089c59, sha256 e857eb8d…c339e):
 * offset lens centres BASE, rim/eye/pupil radii, the pupils' resting inward
 * glance REST, the arched bridge and the hooked temple-arms, frame #34314f.
 * Used with the repository owner's permission; no code from the Geeky renderer
 * is bundled, so the campus keeps a single WebGL context and one style.
 * Behaviour echoes the Live actions: perched idle with saccades and blinks,
 * glide between places, and the 'gg-mentor' gesture of pointing at the work.
 */
import { createBuilder, Rig, TAU, clamp, lerp, hash } from './campus-kit.js';

const K = .027; // character units → world units
const BASE = [{ x: -12.497, y: 2.557 }, { x: 12.497, y: -2.557 }];
const REST = [{ x: 2.452, y: -.696 }, { x: -2.607, y: .34 }];
const EYE_R = 8.95, RIM_R = 9.75, PUPIL_R = 3.12, MAXR = 4.9, ARM_LEN = 10, ARM_HOOK = 2.6;
const RIM_SCALE = [.95, 1.04]; // the original right lens is slightly larger
const FRAME = '#34314F', PAPER = '#F8F7FC';
const to3 = p => [p.x * K, -p.y * K];

export function createGeeky(materials) {
  const rig = new Rig(), b = createBuilder(rig);
  const body = rig.add('body', 'root', 0, 0, 0);
  const eyes = [], pupils = [], arms = [];
  b.layer('soft').shade(.9);
  for (let i = 0; i < 2; i++) {
    const [cx, cy] = to3(BASE[i]), r = RIM_R * K * RIM_SCALE[i], er = EYE_R * K * RIM_SCALE[i];
    b.bone(body).ring(cx, cy, 0, r, .028, FRAME, 16, 4);
    b.ring(cx, cy, -.02, r * .98, .022, '#4A4670', 16, 4);
    const eye = rig.add('eye:' + i, body, cx, cy, 0);
    b.bone(eye).shade(.97).ball(0, 0, 0, er * .97, er * .97, er * .42, PAPER, 1).shade(.9);
    const [rx, ry] = to3(REST[i]);
    const pupil = rig.add('pupil:' + i, eye, rx, ry, er * .4);
    const pr = PUPIL_R * K;
    b.bone(pupil).push(0, 0, 0, 0, Math.PI / 2).cyl(0, -.006, 0, pr, pr, .014, '#17142A', 12).pop();
    b.box(pr * .35, pr * .42, .01, pr * .5, pr * .5, .006, PAPER).box(-pr * .12, pr * .78, .01, pr * .2, pr * .2, .006, PAPER);
    eyes.push(eye); pupils.push({ bone: pupil, rest: [rx, ry], er });
  }
  // Arched bridge between the rims. Its ends sit on each rim at the anchor
  // angles of the original art (core.mjs BRIDGE_ENDS, SVG y flipped), so it
  // stays attached at any scale; the middle rises like the source drawing.
  b.bone(body);
  const rimPoint = (i, angle) => {
    const [cx, cy] = to3(BASE[i]), r = RIM_R * K * RIM_SCALE[i] * .97;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  };
  const a = rimPoint(0, Math.atan2(4.65, 7.9)), c = rimPoint(1, Math.atan2(1.2, -9.05));
  const span = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 + span * .32];
  const bridge = [];
  for (let step = 0; step <= 6; step++) { const t = step / 6, u = 1 - t; bridge.push([u * u * a[0] + 2 * u * t * m[0] + t * t * c[0], u * u * a[1] + 2 * u * t * m[1] + t * t * c[1]]); }
  for (let step = 0; step < 6; step++) {
    const [x1, y1] = bridge[step], [x2, y2] = bridge[step + 1];
    b.push((x1 + x2) / 2, (y1 + y2) / 2, 0, 0, 0, Math.atan2(y2 - y1, x2 - x1)).box(0, 0, 0, Math.hypot(x2 - x1, y2 - y1) + .012, .034, .034, FRAME).pop();
  }
  // Rounded joints where the bridge meets each rim.
  [a, c].forEach(([x, y]) => b.ball(x, y, 0, .024, .024, .024, FRAME, 0));
  // Temple-arms rest behind the frames and swing forward to point or wave.
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1, [cx, cy] = to3(BASE[i]), r = RIM_R * K * RIM_SCALE[i];
    const arm = rig.add('arm:' + i, body, cx + side * r * .97, cy + .02, -.01);
    const len = ARM_LEN * K, hook = ARM_HOOK * K;
    b.bone(arm).push(0, 0, -len / 2, 0, Math.PI / 2).cyl(0, -len / 2, 0, .014, .014, len, FRAME, 5).pop();
    b.push(0, -hook / 2, -len, 0, 0, 0).box(0, 0, 0, .026, hook + .02, .026, FRAME).pop();
    arms.push({ bone: arm, side });
  }
  const shadow = rig.add('shadow', 'root', 0, 0, 0);
  b.layer('blob').bone(shadow).blob(0, 0, 0, .32, .22, .3);
  const group = b.finish(materials, { castShadow: false });
  group.name = 'geeky';

  const state = { p: { x: 0, y: 2, z: 4 }, v: { x: 0, y: 0, z: 0 }, yaw: 0, blinkAt: 2.5, spinAt: -10, settled: true, placed: false };
  /**
   * goal: { x, y, z } hover point; look: [x, y, z] gaze target; ground: y below.
   * cameraYaw keeps the face toward the viewer.
   */
  function tick(t, dt, { goal, look, cameraYaw, moving, ground = 0, perched = false, celebrate = false }) {
    if (!state.placed || !moving) { state.p = { ...goal }; state.v = { x: 0, y: 0, z: 0 }; state.placed = true; }
    else {
      const dx = goal.x - state.p.x, dy = goal.y - state.p.y, dz = goal.z - state.p.z, dist = Math.hypot(dx, dz);
      // Critically damped glide with a lifted arc while travelling.
      const lift = Math.min(.9, dist * .35);
      const k = 9, damp = 2 * Math.sqrt(k);
      state.v.x += (dx * k - state.v.x * damp) * dt;
      state.v.z += (dz * k - state.v.z * damp) * dt;
      state.v.y += ((dy + lift) * k - state.v.y * damp) * dt;
      state.p.x += state.v.x * dt; state.p.y += state.v.y * dt; state.p.z += state.v.z * dt;
    }
    const speed = Math.hypot(state.v.x, state.v.z);
    state.settled = Math.hypot(goal.x - state.p.x, goal.y - state.p.y, goal.z - state.p.z) < .04 && speed < .05;
    const bob = moving ? Math.sin(t * 2.2) * (perched ? .015 : .05) : 0;
    const root = rig.root;
    root.position.set(state.p.x, state.p.y + bob, state.p.z);
    const lateral = state.v.x * Math.cos(cameraYaw) - state.v.z * Math.sin(cameraYaw);
    const spin = moving && t - state.spinAt < 1 ? (t - state.spinAt) * TAU : 0;
    if (celebrate && moving && t - state.spinAt > 4) state.spinAt = t;
    root.rotation.set(0, cameraYaw + spin, 0);
    body.rotation.set(clamp(-state.v.y * .08, -.25, .25) + .12, 0, clamp(-lateral * .12, -.35, .35) + (moving ? Math.sin(t * 1.3) * .04 : 0));
    // Gaze: pupils roll toward the look target, in Geeky's own frame.
    const lx = look[0] - state.p.x, ly = look[1] - state.p.y, lz = look[2] - state.p.z;
    const cy = Math.cos(-cameraYaw), sy = Math.sin(-cameraYaw);
    const localX = lx * cy + lz * sy, localZ = -lx * sy + lz * cy;
    const len = Math.hypot(localX, ly, localZ) || 1;
    let gx = localX / len, gy = ly / len;
    if (moving && perched && (t % 5) < 1.2) { gx = Math.sin(t * 3) * .7; gy = .1; }
    pupils.forEach(({ bone, rest, er }) => {
      const max = MAXR * K * .9;
      bone.position.x = lerp(bone.position.x, rest[0] + clamp(gx, -1, 1) * max, moving ? .25 : 1);
      bone.position.y = lerp(bone.position.y, rest[1] + clamp(gy, -1, 1) * max, moving ? .25 : 1);
      bone.position.z = er * .4;
    });
    // Blink every few seconds; both eyes squash together.
    if (moving && t > state.blinkAt + .16) state.blinkAt = t + 2.6 + hash(Math.floor(t)) * 3;
    const blink = moving && t > state.blinkAt && t < state.blinkAt + .16 ? .12 : 1;
    eyes.forEach(eye => { eye.scale.set(1, blink, 1); });
    // Arms: resting temples; pointing toward the activity once arrived; waving when perched.
    arms.forEach(({ bone, side }, i) => {
      let swing = side * .25, pitch = 0;
      if (moving && !perched && state.settled && i === 0) { swing = side * -1.7; pitch = -.7 + Math.sin(t * 3) * .1; }
      else if (moving && perched && (t % 7) > 5.6 && i === 1) { swing = side * -1.6; pitch = -1.2 + Math.sin(t * 12) * .35; }
      if (celebrate && moving) { swing = side * -1.5; pitch = -1.9 + Math.sin(t * 10 + i) * .3; }
      bone.rotation.set(pitch, swing, 0, 'YXZ');
    });
    shadow.position.y = ground + .02 - root.position.y;
    shadow.scale.setScalar(clamp(1.2 - (root.position.y - ground) * .15, .5, 1));
  }
  return { group, tick, state, get settled() { return state.settled; } };
}
