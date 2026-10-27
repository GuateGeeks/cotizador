/**
 * Articulated low-poly people. A person is a set of bones inside an entity rig,
 * so a whole classroom or workshop still renders in one draw call. Proportions
 * change with the educational level: preprimaria children are small with big
 * heads, bachillerato students are almost adult height.
 */
import { PAL, LEVEL_COLOR, TAU, hash, pick, lerp, clamp } from './campus-kit.js';
import { CLIPS } from './paper/pose-clips-data.js';

export const PERSON_SCALE = { pre: .74, prim: .86, bas: .97, bach: 1.04, adult: 1.18 };
const SKIN = ['#F3CBA5', '#E2AF86', '#C98D62', '#A06A45', '#7E5236'];
const HAIR = ['#2A1C18', '#3B2419', '#1D1724', '#4E3021', '#2A1C18'];
const STYLES = ['short', 'pony', 'braids', 'bun', 'curly', 'bob', 'short', 'spiky'];

/**
 * spec: { id, level, x, z, ry, sweater?, role?, seed?, headset?, seated? }
 * Returns a controller with bones and pose helpers.
 */
export function addPerson(b, spec) {
  const rig = b.rig, id = spec.id, level = spec.role === 'teacher' ? 'adult' : (spec.level || 'prim');
  const s = PERSON_SCALE[level] || 1, seed = spec.seed ?? id;
  const head = .27 * Math.pow(s, level === 'adult' ? .55 : .45);
  const thigh = .2 * s, shin = .19 * s, hipY = thigh + shin + .02 * s;
  const torsoH = .29 * s, torsoW = .27 * s, torsoD = .17 * s, upper = .15 * s, fore = .14 * s;
  const skin = pick(SKIN, seed, 'skin'), hair = pick(HAIR, seed, 'hair');
  const style = spec.hair || (spec.role === 'teacher' ? pick(['long', 'short', 'bun'], seed, 'style') : pick(STYLES, seed, 'style'));
  const teacher = spec.role === 'teacher';
  const sweater = spec.sweater || (teacher ? pick(['#3A7BE0', '#E85D75', '#2EAD9A'], seed, 'top') : LEVEL_COLOR[level] || PAL.teal);
  const skirt = !teacher && hash(seed, 'skirt') < .42;
  const pants = teacher ? pick(['#2F3A6E', '#3E3550', '#2F3A6E'], seed, 'pants') : PAL.navy;

  const root = rig.add(id, spec.parent || rig.root, spec.x || 0, spec.y || 0, spec.z || 0);
  root.rotation.y = spec.ry || 0;
  root.userData.rest.quaternion.copy(root.quaternion);
  const hips = rig.add(id + '.hips', root, 0, hipY, 0);
  const torso = rig.add(id + '.torso', hips, 0, 0, 0);
  const neck = rig.add(id + '.head', torso, 0, torsoH, 0);
  const armL = rig.add(id + '.armL', torso, torsoW * .62, torsoH * .88, 0);
  const armR = rig.add(id + '.armR', torso, -torsoW * .62, torsoH * .88, 0);
  const foreL = rig.add(id + '.foreL', armL, 0, -upper, 0);
  const foreR = rig.add(id + '.foreR', armR, 0, -upper, 0);
  const legL = rig.add(id + '.legL', hips, torsoW * .26, 0, 0);
  const legR = rig.add(id + '.legR', hips, -torsoW * .26, 0, 0);
  const shinL = rig.add(id + '.shinL', legL, 0, -thigh, 0);
  const shinR = rig.add(id + '.shinR', legR, 0, -thigh, 0);

  b.layer('soft').shade(.8);
  // Torso: tapered jumper with a white polo collar (students) or blouse band (teachers).
  b.bone(torso).push(0, 0, 0, Math.PI / 4).cyl(0, 0, 0, torsoW * .68, torsoW * .6, torsoH, sweater, 4).pop();
  if (teacher) {
    // Huipil-inspired woven band and a GuateGeeks lanyard.
    const band = ['#E83E8C', '#FFB000', '#25C2C6', '#E83E8C'];
    const quad = (x, y, w, h, c, z = torsoD * .44) => b.face([x - w / 2, y - h / 2, z], [x + w / 2, y - h / 2, z], [x + w / 2, y + h / 2, z], c, [0, 0, 1]).face([x - w / 2, y - h / 2, z], [x + w / 2, y + h / 2, z], [x - w / 2, y + h / 2, z], c, [0, 0, 1]);
    band.forEach((c, i) => quad(-torsoW * .3 + i * torsoW * .2, torsoH * .72, torsoW * .19, .035 * s, c));
    quad(0, torsoH * .45, .018, torsoH * .5, PAL.orange, torsoD * .45);
    quad(0, torsoH * .2, .05 * s, .06 * s, PAL.white, torsoD * .46);
  } else {
    b.face([-.05 * s, torsoH * 1.0, torsoD * .41], [.05 * s, torsoH * 1.0, torsoD * .41], [0, torsoH * .78, torsoD * .44], PAL.white, [0, 0, 1]);
  }
  if (skirt) b.bone(hips).cyl(0, -thigh * .62, 0, torsoW * .62, torsoW * .5, thigh * .66, pick(['#5B3B8C', '#2F3A6E'], seed, 'sk'), 6);
  else b.bone(hips).push(0, 0, 0, Math.PI / 4).cyl(0, -.05 * s, 0, torsoW * .55, torsoW * .6, .06 * s, pants, 4, true).pop();

  // Head: soft block, big eyes, hair style. Eyes look forward (+Z).
  b.bone(neck).shade(.9);
  const hy = head * .52 + .025 * s;
  b.soft(0, hy, 0, head * .9, head, head * .86, skin, .3);
  if (spec.headset) {
    b.soft(0, hy + head * .04, head * .43, head * .86, head * .38, head * .3, PAL.white, .3);
    b.box(0, hy + head * .04, head * .59, head * .62, head * .16, .01, PAL.inkSoft);
    b.box(0, hy + head * .12, -head * .02, head * .96, head * .12, head * .9, PAL.greyLight);
  } else {
    for (const side of [-1, 1]) {
      const ex = side * head * .2, ey = hy + head * .02, ez = head * .435;
      b.face([ex - head * .055, ey - head * .08, ez], [ex + head * .055, ey - head * .08, ez], [ex + head * .055, ey + head * .07, ez], PAL.ink, [0, 0, 1]);
      b.face([ex - head * .055, ey - head * .08, ez], [ex + head * .055, ey + head * .07, ez], [ex - head * .055, ey + head * .07, ez], PAL.ink, [0, 0, 1]);
      b.face([ex + head * .005, ey + head * .02, ez + .002], [ex + head * .04, ey + head * .02, ez + .002], [ex + head * .04, ey + head * .055, ez + .002], PAL.white, [0, 0, 1]);
      b.face([ex + side * head * .12 - head * .04, ey - head * .15, ez - .004], [ex + side * head * .12 + head * .04, ey - head * .15, ez - .004], [ex + side * head * .12, ey - head * .11, ez - .004], '#F28B82', [0, 0, 1]);
    }
    if (hash(seed, 'glasses') < .18 && !teacher) b.box(0, hy + head * .02, head * .45, head * .7, head * .035, .008, PAL.ink);
  }
  const hairTop = hy + head * .5;
  // Preprimaria caps replace the top of the hair, so no surfaces coincide.
  const cap = level === 'pre' && !teacher && hash(seed, 'cap') < .35;
  b.shade(.86);
  if (cap) { /* the cap below covers the crown */ }
  else if (style === 'curly') { b.ball(0, hairTop - head * .05, -head * .04, head * .58, head * .42, head * .55, hair); }
  else if (style === 'spiky') { b.push(0, hairTop - head * .28, -head * .06, Math.PI / 6).cyl(0, 0, 0, head * .56, head * .42, head * .3, hair, 6).pop(); b.cone(0, hairTop, -head * .05, head * .22, head * .22, hair, 4); }
  else b.push(0, hairTop - head * .3, -head * .07, Math.PI / 6).cyl(0, 0, 0, head * .56, head * .4, head * .34, hair, 6).pop();
  if (style !== 'curly' && style !== 'spiky') b.box(0, hy + head * .08, -head * .38, head * .92, head * .62, head * .14, hair);
  if (style === 'pony') b.ball(0, hy + head * .12, -head * .58, head * .16, head * .26, head * .16, hair);
  if (style === 'bun' && !cap) b.ball(0, hairTop + head * .06, -head * .12, head * .2, head * .17, head * .2, hair);
  if (style === 'braids') for (const side of [-1, 1]) b.cyl(side * head * .34, hy - head * .42, -head * .2, head * .08, head * .07, head * .5, hair, 4);
  if (style === 'bob' || style === 'long') for (const side of [-1, 1]) b.box(side * head * .45, hy - (style === 'long' ? head * .2 : 0), -head * .1, head * .1, head * (style === 'long' ? .9 : .6), head * .6, hair);
  if (style === 'long') b.box(0, hy - head * .25, -head * .42, head * .9, head * .8, head * .12, hair);
  if (cap) {
    // Crown wider than the head at every height; brim well above the eyes, in front of the forehead.
    b.push(0, hairTop - head * .2, -head * .04, Math.PI / 8).cyl(0, 0, 0, head * .6, head * .5, head * .32, LEVEL_COLOR.pre, 8).pop();
    b.cyl(0, hairTop + head * .12, -head * .04, head * .07, head * .05, head * .04, '#E9A93C', 6);
    b.block(0, hairTop - head * .2, head * .6, head * .64, head * .045, head * .4, '#E9A93C');
  }

  // Limbs: tapered prisms with hands; sleeves follow the jumper.
  b.shade(.84);
  for (const [arm, forearm] of [[armL, foreL], [armR, foreR]]) {
    b.bone(arm).cyl(0, -upper, 0, .045 * s, .052 * s, upper, sweater, 4, true);
    b.bone(forearm).cyl(0, -fore, 0, .036 * s, .043 * s, fore, teacher ? sweater : skin, 4, true);
    b.gem(0, -fore - .03 * s, 0, .038 * s, .045 * s, .038 * s, skin);
  }
  for (const [leg, lower] of [[legL, shinL], [legR, shinR]]) {
    b.bone(leg).cyl(0, -thigh, 0, .052 * s, .064 * s, thigh, skirt ? skin : pants, 4, true);
    b.bone(lower).cyl(0, -shin, 0, .042 * s, .05 * s, shin, skirt ? (hash(seed, 'socks') < .5 ? PAL.white : skin) : pants, 4, true);
    b.block(0, -shin - .025 * s, .022 * s, .085 * s, .05 * s, .14 * s, teacher ? PAL.inkSoft : pick(['#2B2142', '#FFFFFF', '#E85D75'], seed, 'shoe'));
  }
  if (spec.backpack) b.bone(torso).block(0, torsoH * .15, -torsoD * .62, torsoW * .78, torsoH * .7, torsoD * .5, spec.backpack);
  b.bone(root).blob(0, .012, 0, .2 * s, .17 * s, .28);
  b.layer('main').shade(.84).bone(b.rig.root);

  const joints = { hips, torso, head: neck, armL, armR, foreL, foreR, legL, legR, shinL, shinR };
  return { id, root, joints, scale: s, hipY, thigh, shin, level, teacher, head };
}

/** Pose vocabulary. Values are radians; `y` offsets the hips. */
const ZERO = { torso: [0, 0, 0], head: [0, 0, 0], armL: [0, 0, .08], armR: [0, 0, -.08], foreL: [0, 0, 0], foreR: [0, 0, 0], legL: [0, 0, 0], legR: [0, 0, 0], shinL: [0, 0, 0], shinR: [0, 0, 0], y: 0 };
export function pose(overrides = {}) {
  const out = {};
  for (const key of Object.keys(ZERO)) out[key] = Array.isArray(ZERO[key]) ? (overrides[key] || ZERO[key]).slice() : (overrides[key] ?? ZERO[key]);
  return out;
}
export function mixPose(a, b, t) {
  const out = {};
  for (const key of Object.keys(ZERO)) out[key] = Array.isArray(a[key]) ? a[key].map((v, i) => lerp(v, b[key][i], t)) : lerp(a[key], b[key], t);
  return out;
}
export const POSES = {
  stand: () => pose(),
  walk: (phase, amp = 1) => {
    const sw = Math.sin(phase) * .55 * amp;
    return pose({ legL: [-sw, 0, 0], legR: [sw, 0, 0], shinL: [Math.max(0, sw) * 1.1, 0, 0], shinR: [Math.max(0, -sw) * 1.1, 0, 0],
      armL: [sw * .8, 0, .1], armR: [-sw * .8, 0, -.1], foreL: [-.3, 0, 0], foreR: [-.3, 0, 0], torso: [.05 * amp, 0, 0], y: Math.abs(Math.cos(phase)) * .018 * amp });
  },
  kneel: () => pose({ legL: [0, 0, .06], legR: [0, 0, -.06], shinL: [Math.PI / 2, 0, 0], shinR: [Math.PI / 2, 0, 0], torso: [.15, 0, 0] }),
  sit: () => pose({ legL: [-Math.PI / 2, 0, .05], legR: [-Math.PI / 2, 0, -.05], shinL: [Math.PI / 2, 0, 0], shinR: [Math.PI / 2, 0, 0] }),
  // Both arms up in a V (outward first, then raised), shaking: the hands clear the big papercraft head.
  cheer: t => pose({ armL: [-2.55, 0, .6 + Math.sin(t * 12) * .12], armR: [-2.55, 0, -.6 - Math.sin(t * 12) * .12], foreL: [-.3, 0, 0], foreR: [-.3, 0, 0], head: [-.25, 0, 0] }),
  clap: t => { const c = Math.sin(t * 14) * .18; return pose({ armL: [-1.15, 0, -.32 - c], armR: [-1.15, 0, .32 + c], foreL: [-.75, 0, 0], foreR: [-.75, 0, 0], head: [-.1, 0, 0] }); },
  type: t => pose({ armL: [-.75, 0, -.1], armR: [-.75, 0, .1], foreL: [-.75 + Math.sin(t * 18) * .08, 0, 0], foreR: [-.75 + Math.cos(t * 17) * .08, 0, 0], head: [.25, 0, 0], torso: [.12, 0, 0] }),
  tablet: () => pose({ armL: [-.55, 0, -.3], armR: [-.55, 0, .3], foreL: [-1.05, 0, 0], foreR: [-1.05, 0, 0], head: [.35, 0, 0], torso: [.05, 0, 0] }),
  point: (dir = 0) => pose({ armR: [-1.45, dir, .05], foreR: [-.05, 0, 0], head: [-.05, dir * .6, 0] }),
  // The arm up and out beside the head, the forearm upright and swinging.
  wave: t => pose({ armR: [-.25, 0, -2.25], foreR: [0, 0, -.8 + Math.sin(t * 9) * .35], head: [-.05, -.15, 0] }),
  hand: () => pose({ armR: [-3.0, 0, .15], foreR: [-.1, 0, 0] }),
  vr: (t, k = 0) => pose({ head: [-.15 + Math.sin(t * .9 + k) * .25, Math.sin(t * .6 + k * 2) * .9, 0], armL: [-1.3 + Math.sin(t * 1.3 + k) * .3, .25, -.2], armR: [-1.1 + Math.cos(t * 1.1 + k) * .35, -.25, .2], foreL: [-.3, 0, 0], foreR: [-.25, 0, 0], torso: [0, Math.sin(t * .6 + k * 2) * .25, 0] }),
  // Ambient-life vocabulary (paper/scene-activity.js). Upper-body poses: seated people take
  // their legs from sit() through blendBody(). Every pose keeps the rigid 12-bone rig.
  // Arm `z`: + moves the left arm outward, - the right arm outward.
  /** Raised hand, asking to speak; the hand sways a little. */
  raise: t => pose({ armR: [-2.75, 0, -.38 + Math.sin(t * 5) * .06], foreR: [-.2 - Math.sin(t * 5) * .1, 0, 0], torso: [-.04, 0, .06], head: [-.12, .1, 0] }),
  /** Talking with both hands: forearms beat at different rates, the head bobs. `k` desynchronises people. */
  talk: (t, k = 0) => pose({
    armR: [-.55 + Math.sin(t * 3.1 + k) * .16, 0, .05], foreR: [-1.05 + Math.sin(t * 4.3 + k) * .28, 0, 0],
    armL: [-.4 + Math.sin(t * 2.3 + k * 2) * .1, 0, -.05], foreL: [-.8 + Math.sin(t * 3.7 + k) * .2, 0, 0],
    head: [-.05 + Math.sin(t * 2.1 + k) * .07, Math.sin(t * 1.3 + k) * .12, Math.sin(t * 1.7 + k) * .05], torso: [.04, Math.sin(t * 1.1 + k) * .06, 0]
  }),
  /** Leaning in over the table to watch something; forearms rest toward the work. */
  lean: (k = 1) => pose({ torso: [.32 * k, 0, 0], head: [.3 * k, 0, 0], armL: [-.55 - .25 * k, 0, -.12], armR: [-.55 - .25 * k, 0, .12], foreL: [-.85, 0, 0], foreR: [-.85, 0, 0] }),
  /** Pointing down at the table (robot, board) with the right hand. */
  pointDown: (dir = 0) => pose({ armR: [-1.05, dir, .08], foreR: [-.15, 0, 0], torso: [.22, dir * .3, 0], head: [.38, dir * .6, 0], armL: [-.5, 0, -.1], foreL: [-.8, 0, 0] }),
  /** High five: one open hand up and out to the side of the partner ('R' right, 'L' left). */
  highFive: (side = 'R') => side === 'R'
    ? pose({ armR: [-2.35, 0, -.45], foreR: [-.35, 0, 0], torso: [0, -.25, 0], head: [-.15, -.35, 0] })
    : pose({ armL: [-2.35, 0, .45], foreL: [-.35, 0, 0], torso: [0, .25, 0], head: [-.15, .35, 0] }),
  /** Hands on the head: the robot missed. */
  oops: () => pose({ armL: [-2.5, 0, .75], armR: [-2.5, 0, -.75], foreL: [-1.75, 0, 0], foreR: [-1.75, 0, 0], head: [-.1, 0, 0], torso: [-.05, 0, 0] }),
  /** Hand to the chin, thinking or reading. */
  think: () => pose({ armR: [-.85, 0, .05], foreR: [-2.0, 0, 0], armL: [-.6, 0, -.1], foreL: [-.9, 0, 0], head: [.12, 0, .1], torso: [.1, 0, 0] }),
  /** Pressing components into a board: alternating hands, low over the table. */
  press: t => {
    const l = Math.max(0, Math.sin(t * 4.2)), r = Math.max(0, -Math.sin(t * 4.2));
    return pose({ armL: [-.95 - l * .15, 0, -.08], armR: [-.95 - r * .15, 0, .08], foreL: [-.55 + l * .3, 0, 0], foreR: [-.55 + r * .3, 0, 0], torso: [.28, 0, 0], head: [.42, 0, 0] });
  },
  /** Both hands holding a controller in front of the chest; `tilt` rolls the hands (-1..1). */
  hold: (tilt = 0, pitch = 0) => pose({ armL: [-.45 - pitch * .12, 0, -.32 + tilt * .1], armR: [-.45 - pitch * .12, 0, .32 + tilt * .1], foreL: [-1.15 + tilt * .2, 0, 0], foreR: [-1.15 - tilt * .2, 0, 0], head: [.15, 0, 0] }),
  /** Reaching up toward a virtual object with both hands (VR). `t` opens and closes the grab. */
  grab: (t = 0, k = 0) => pose({ armL: [-2.0 + Math.sin(t * 1.7 + k) * .2, .2, -.15], armR: [-2.2 + Math.cos(t * 1.4 + k) * .2, -.2, .15], foreL: [-.35, 0, 0], foreR: [-.3, 0, 0], head: [-.35, Math.sin(t * .8 + k) * .3, 0], torso: [-.06, Math.sin(t * .8 + k) * .15, 0] }),
  /** Both hands lifting the visor off the eyes (VR), the head turned to someone. */
  visor: (turn = 0) => pose({ armL: [-2.45, 0, .55], armR: [-2.45, 0, -.55], foreL: [-1.85, 0, 0], foreR: [-1.85, 0, 0], head: [-.25, turn, 0], torso: [0, turn * .3, 0] })
};
/**
 * Keyframed clips retouched in Blender (3d-assets procedural-web, `pw.py import`) replace a pose
 * for the arguments they were sampled with. A clip is { args, time?, offset?, duration, frames }:
 * `time.arg` is the argument that drives it (seconds × `time.scale` = that argument), `offset.arg`
 * an argument added to its time (the per-person desync `k`); any other argument must equal the
 * sampled one (a missing argument takes the sampled default), or the function keeps the pose.
 * Frames are whole poses, interpolated linearly and looped over `duration`.
 */
const KEYS = Object.keys(ZERO);
/** The pose functions before any clip replaces them (the Blender bridge compares edits against these). */
export const POSE_FUNCTIONS = Object.freeze({ ...POSES });
function clipPose(clip, args) {
  const n = clip.frames.length;
  if (!clip.time || n === 1) return pose(clip.frames[0]);
  let t = (args[clip.time.arg] ?? 0) / clip.time.scale + (clip.offset ? args[clip.offset.arg] ?? 0 : 0);
  t = ((t % clip.duration) + clip.duration) % clip.duration;
  const f = t / clip.duration * n, i = Math.floor(f) % n, j = (i + 1) % n, u = f - Math.floor(f), a = clip.frames[i], b = clip.frames[j];
  const out = {};
  for (const key of KEYS) out[key] = Array.isArray(ZERO[key]) ? a[key].map((v, k) => lerp(v, b[key][k], u)) : lerp(a[key], b[key], u);
  return out;
}
const sampled = (clip, args) => clip.args.every((v, i) => v === '$t' || i === clip.offset?.arg || (args[i] ?? v) === v);
/** The pose table with `clips` ({ name: [clip] }) over `functions`. */
export function withClips(functions, clips) {
  const out = { ...functions };
  for (const [name, list] of Object.entries(clips)) {
    const fn = functions[name];
    if (fn) out[name] = (...args) => { const clip = list.find(c => sampled(c, args)); return clip ? clipPose(clip, args) : fn(...args); };
  }
  return out;
}
Object.assign(POSES, withClips(POSE_FUNCTIONS, CLIPS));

/** Additive head look: yaw/pitch blended over the pose's own head by `w` (0..1). Mutates `p`. */
export function look(p, yaw, pitch, w = 1) {
  p.head[0] = lerp(p.head[0], pitch, w); p.head[1] = lerp(p.head[1], yaw, w);
  return p;
}
/** Reach both hands toward something at lowered height (0 = waist, 1 = floor). */
export function reach(lower = .4, hand = 'R', extra = 0) {
  const a = -.6 - lower * .7 - extra;
  return hand === 'R' ? pose({ armR: [a, 0, .12], foreR: [-.35, 0, 0], torso: [.2 + lower * .25, 0, 0], head: [.3, 0, 0] })
    : hand === 'L' ? pose({ armL: [a, 0, -.12], foreL: [-.35, 0, 0], torso: [.2 + lower * .25, 0, 0], head: [.3, 0, 0] })
      : pose({ armL: [a, 0, -.15], armR: [a, 0, .15], foreL: [-.3, 0, 0], foreR: [-.3, 0, 0], torso: [.2 + lower * .25, 0, 0], head: [.3, 0, 0] });
}
/** Compose lower body of one pose with upper body of another. */
export function blendBody(lower, upper) {
  const out = pose();
  for (const key of ['legL', 'legR', 'shinL', 'shinR', 'y']) out[key] = Array.isArray(lower[key]) ? lower[key].slice() : lower[key];
  for (const key of ['torso', 'head', 'armL', 'armR', 'foreL', 'foreR']) out[key] = upper[key].slice();
  return out;
}

/** Kneeling lowers the hips by the shin (or `kneel`, a shorter drop for a long shoe whose toe points down). */
const KNEEL_DROP = p => -((p.kneel ?? p.shin) - .03 * p.scale);
/** Apply a pose; `base` is 'stand' | 'kneel' | 'sit' to place the hips. */
export function applyPose(person, p, base = 'stand', seat) {
  const j = person.joints;
  for (const key of ['torso', 'head', 'armL', 'armR', 'foreL', 'foreR', 'legL', 'legR', 'shinL', 'shinR']) j[key].rotation.set(p[key][0], p[key][1], p[key][2], 'YXZ');
  const lower = base === 'kneel' ? KNEEL_DROP(person) : base === 'sit' ? (seat ?? .26) - person.hipY + .03 : 0;
  j.hips.position.y = person.hipY + lower + (p.y || 0);
}
/** Apply a pose `k` of the way between standing (0) and seated on `seat` (1): standing up and sitting down. */
export function applySeated(person, p, k, seat) {
  applyPose(person, p, 'stand');
  person.joints.hips.position.y = person.hipY + clamp(k) * (seat - person.hipY + .03) + (p.y || 0);
}
export function placePerson(person, x, z, ry, y = 0) { person.root.position.set(x, y, z); person.root.rotation.set(0, ry, 0); }

/** Sample a closed or open polyline by distance. Returns { x, z, heading }. */
export function along(points, u) {
  const segments = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const length = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    segments.push(length); total += length;
  }
  let d = clamp(u) * total;
  for (let i = 0; i < segments.length; i++) {
    if (d <= segments[i] || i === segments.length - 1) {
      const k = segments[i] ? clamp(d / segments[i]) : 0, [ax, az] = points[i], [bx, bz] = points[i + 1];
      return { x: lerp(ax, bx, k), z: lerp(az, bz, k), heading: Math.atan2(bx - ax, bz - az), length: total };
    }
    d -= segments[i];
  }
  const last = points[points.length - 1];
  return { x: last[0], z: last[1], heading: 0, length: total };
}
/** Shortest-arc angle interpolation. */
export function turnTo(from, to, t) {
  let d = ((to - from) % TAU + TAU * 1.5) % TAU - Math.PI;
  return from + d * clamp(t);
}
