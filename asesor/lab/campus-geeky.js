/**
 * Geeky, the GuateGeeks guide, as the stylised 3-D character of GuateGeeks/geeky-animation.
 * The original brain (poses, gaze, blinks, actions) and the original geometry (extruded rims,
 * lens-shaped eyes, hooked temples) are mounted inside this scene through ./geeky/embedded.js:
 * one WebGL context, the campus' lights, no copied file modified.
 * Provenance and file hashes: ./geeky/PROVENANCE.md.
 *
 * API used by campus-scene.js: createGeeky(materials) -> { group, tick(time, dt, goal), settled, state }.
 * Geeky owns exactly two materials (ownMaterials()), whatever the pose.
 * Extras: cue(name, params) plays a short action ('greet' | 'waving' | 'point' | 'celebrate' | ...),
 * ownMaterials() lists the materials Geeky owns (the campus' `materials` are not touched), dispose().
 * `releaseEntityGroup(geeky.group)` already disposes everything Geeky owns (see userData.skeleton).
 *
 * Rest: Geeky animates only while something happens (appearing, gliding, a cue, the gaze following a
 * new target) and about 3 s afterwards; then it keeps a static pose and `settled` is true. The living
 * campus keeps rendering for its own activities; Geeky's travel alone counts as a transition. The scene
 * cues short reactions (`giggle`, `nod`) on big moments. With reduced motion the pose is always static.
 */
import { Group } from 'three';
import { clamp } from './campus-kit.js';
import { createEmbeddedGeeky } from './geeky/embedded.js';
import { ACTIONS, resolveAction } from './geeky/live/actions.mjs';

const K = .027; // character units -> world units (the same scale as the previous low-poly Geeky: lenses at +-.34)
const REST_AFTER = 3; // seconds of calm before the pose freezes
const GAZE_REACH = 40; // character units; lookAt() only needs the direction
const FACE_TILT = -.2; // lean the face up a little toward the elevated camera

export function createGeeky(materials, options = {}) {
  const reduced = options.reduced ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const embedded = createEmbeddedGeeky({ reduced });
  const { brain, stage } = embedded;
  stage.scale.setScalar(K);
  const group = new Group();
  group.name = 'geeky';
  group.add(stage);

  const state = { p: { x: 0, y: 2, z: 4 }, v: { x: 0, y: 0, z: 0 }, yaw: 0, placed: false, settled: true, clock: 0, activeUntil: 0, greeted: false, focusKey: null, gaze: null, celebrating: false };
  let drawn = false, disposed = false;

  function wake(seconds = REST_AFTER) { state.activeUntil = Math.max(state.activeUntil, state.clock + seconds); }

  /** Play a short action. Looping actions are refused: they would never let Geeky rest. */
  function cue(name, params) {
    if (disposed || reduced) return false;
    const def = resolveAction(name);
    if (def.loop) return false;
    brain.play(def.id, { params, restart: true });
    wake(def.dur + REST_AFTER);
    return true;
  }

  function toLocal(vector, yaw) {
    const c = Math.cos(-yaw), s = Math.sin(-yaw);
    return { x: vector[0] * c + vector[2] * s, y: vector[1], z: -vector[0] * s + vector[2] * c };
  }

  function lidsVisible() { return embedded.renderer.eyes.some(eye => eye.lidT.visible || eye.lidB.visible); }

  function tick(t, dt, { goal, look, cameraYaw, moving, perched = false, celebrate = false }) {
    if (disposed) return;
      const animate = moving && !reduced;
    // Glide to the goal (critically damped, with a lifted arc while travelling).
    if (!state.placed || !animate) { state.p = { ...goal }; state.v = { x: 0, y: 0, z: 0 }; }
    else {
      const dx = goal.x - state.p.x, dy = goal.y - state.p.y, dz = goal.z - state.p.z, dist = Math.hypot(dx, dz);
      const lift = Math.min(.9, dist * .35), k = 9, damp = 2 * Math.sqrt(k);
      state.v.x += (dx * k - state.v.x * damp) * dt;
      state.v.z += (dz * k - state.v.z * damp) * dt;
      state.v.y += ((dy + lift) * k - state.v.y * damp) * dt;
      state.p.x += state.v.x * dt; state.p.y += state.v.y * dt; state.p.z += state.v.z * dt;
    }
    const speed = Math.hypot(state.v.x, state.v.z);
    const gliding = !(Math.hypot(goal.x - state.p.x, goal.y - state.p.y, goal.z - state.p.z) < .04 && speed < .05);
    const lateral = state.v.x * Math.cos(cameraYaw) - state.v.z * Math.sin(cameraYaw);
    group.position.set(state.p.x, state.p.y, state.p.z);
    group.rotation.set(FACE_TILT, cameraYaw, clamp(-lateral * .12, -.3, .3), 'YXZ');
    state.yaw = cameraYaw;
    state.placed = true;

    // Gaze: world point -> Geeky's own frame -> stage direction (character units, y down, z toward the viewer).
    const local = toLocal([look[0] - state.p.x, look[1] - state.p.y, look[2] - state.p.z], cameraYaw);
    const length = Math.hypot(local.x, local.y, local.z) || 1;
    const aim = { x: local.x / length, y: local.y / length, z: local.z / length };
    const gazeMoved = !state.gaze || Math.hypot(aim.x - state.gaze.x, aim.y - state.gaze.y, aim.z - state.gaze.z) > .06;

    if (animate) {
      state.clock += dt;
      if (!state.greeted) { state.greeted = true; brain.play('greet'); wake(ACTIONS.greet.dur + REST_AFTER); }
      const key = perched ? 'home' : look.map(v => v.toFixed(2)).join();
      if (state.focusKey !== key) {
        const firstFocus = state.focusKey === null;
        state.focusKey = key;
        if (!firstFocus) {
          wake();
          if (!perched) {
            // Point a temple toward the activity, in the screen's own plane (counter-clockwise angle in degrees).
            const toTarget = toLocal([look[0] - goal.x, look[1] - goal.y, look[2] - goal.z], cameraYaw);
            cue('point', { angle: Math.round(Math.atan2(toTarget.y, toTarget.x) * 180 / Math.PI) });
          }
        }
      }
      if (celebrate && !state.celebrating) cue('celebrate');
      state.celebrating = !!celebrate;
      if (gliding) wake(1);
      if (gazeMoved) { state.gaze = aim; wake(); }
      brain.lookAt(state.gaze.x * GAZE_REACH, -state.gaze.y * GAZE_REACH, Math.max(8, state.gaze.z * GAZE_REACH + 14));
    } else state.gaze = aim;

    group.updateMatrixWorld(true);
    const calm = !gliding && state.clock >= state.activeUntil && brain.act.id === brain.base && !brain.from
      && brain.blinkState.t < 0 && !brain.particles.length;
    if (animate && !calm) { embedded.step(dt); drawn = true; }
    else if (!drawn) { embedded.step(0); drawn = true; }
    else if (lidsVisible()) embedded.step(0); // clip planes follow the world matrix
    state.settled = animate ? calm : true;
    state.gliding = animate && gliding; // only travel is a scene transition; gaze and blinks are activity
  }

  function ownMaterials() { return embedded.materials(); }
  /** Geometries Geeky caches lazily by shape (pupil sizes, glyphs): bounded, built once, reused. */
  function cachedGeometries() { return embedded.renderer.geoCache?.size || 0; }
  function dispose() {
    if (disposed) return;
    disposed = true;
    embedded.dispose();
  }
  // releaseEntityGroup() disposes mesh geometries and then this "skeleton": we hook our materials and textures in.
  group.userData.skeleton = { dispose };

  embedded.step(0); // pose the meshes once so nothing is drawn at the origin before the first tick
  drawn = true;
  return { group, tick, cue, ownMaterials, cachedGeometries, dispose, state, get settled() { return state.settled; } };
}
