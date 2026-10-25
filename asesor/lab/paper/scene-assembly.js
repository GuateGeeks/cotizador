/**
 * Assembly of fresh pieces from their `stage` declarations (kit.js): fold, rise,
 * pop and drop. Each module takes 0.4–0.9 s; modules start staggered so a wide
 * change finishes in about 2.5 s. A new state never queues: pieces that were
 * still assembling in a replaced entity keep their clock and the rest appear
 * settled, so the scene always converges to the latest plan.
 */
import { Quaternion, Vector3 } from 'three';
import { smooth, backOut, clamp } from '../campus-kit.js';

const AXES = { x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) };
const q = new Quaternion();
const STEP = .09;      // seconds between assembly orders inside a module
const DURATION = { fold: .55, rise: .45, drop: .45, pop: .4 };
export const MAX_ASSEMBLY = 3;

/** Staged items of an entity bound to their bones. */
export function bindStaged(meta, rig) {
  return (meta.staged || []).map(item => ({ ...item, bone: rig.get(item.name) })).filter(item => item.bone);
}

/**
 * Decide which items assemble now. `before` = bone names of the replaced record,
 * `pending` = name -> absolute start for items still assembling there.
 * `moduleIndex` maps a module key to its global stagger slot.
 */
export function planAssembly(staged, { before, pending, moduleKeys, moduleIndex, stagger, now, animate }) {
  const keys = [...moduleKeys].sort((a, b) => b.length - a.length);
  for (const item of staged) {
    const carried = pending?.get(item.name);
    item.done = false;
    item.fresh = animate && (!before?.has(item.name) || carried != null);
    if (!item.fresh) { item.done = true; continue; }
    if (carried != null) { item.start = carried; continue; }
    const module = keys.find(key => item.name === key || item.name.startsWith(key + '.') || item.name.startsWith(key + ':'));
    const slot = module != null && moduleIndex.has(module) ? moduleIndex.get(module) : 0;
    item.start = now + slot * stagger + item.order * STEP;
  }
}

/** Apply progress at time `now`; settle=true forces every item to rest. Returns true while anything animates. */
export function applyAssembly(staged, now, settle) {
  let active = false;
  for (const item of staged) {
    if (item.done) continue;
    const bone = item.bone, rest = bone.userData.rest;
    const k = settle ? 1 : clamp((now - item.start) / (DURATION[item.style] || .4));
    if (k >= 1) {
      bone.position.y = item.style === 'drop' ? rest.position.y : bone.position.y;
      bone.quaternion.copy(item.style === 'fold' ? rest.quaternion : bone.quaternion);
      bone.scale.copy(rest.scale);
      item.done = true;
      continue;
    }
    active = true;
    if (item.style === 'fold') {
      bone.quaternion.copy(rest.quaternion).multiply(q.setFromAxisAngle(AXES[item.axis || 'x'], (item.from ?? -Math.PI / 2) * (1 - smooth(k))));
      bone.scale.setScalar(k <= 0 && item.hidden !== false ? .001 : 1);
    } else if (item.style === 'rise') bone.scale.set(1, Math.max(.001, smooth(k)), 1);
    else if (item.style === 'drop') {
      bone.position.y = rest.position.y + (1 - smooth(k)) * 1.1;
      bone.scale.setScalar(k <= 0 ? .001 : 1);
    } else bone.scale.setScalar(Math.max(.001, k > 0 ? backOut(k) : 0));
  }
  return active;
}

export const pendingOf = staged => new Map(staged.filter(item => item.fresh && !item.done).map(item => [item.name, item.start]));
