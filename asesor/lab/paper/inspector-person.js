/**
 * Character mode of the papercraft inspector: one person built from an explicit,
 * reproducible configuration (spec + pose), optionally limited to some components,
 * so every piece of the student can be reviewed alone or mounted, in the same poses
 * the campus uses. Dev only (inspector and capture tools); not loaded by the asesor.
 */
import { SCALE, newMeta } from './kit.js';
import { POSES, applyPose, blendBody } from '../campus-people.js';
import { addPaperPerson, PRIMARIA_BASE } from './pieces-people.js';

/** Poses as the campus applies them (compose.js seats people at SCALE.seat + .02). */
export const PERSON_POSES = Object.freeze({
  rest: p => applyPose(p, POSES.stand(), 'stand'),
  'walk-0': p => applyPose(p, POSES.walk(0), 'stand'),
  'walk-1': p => applyPose(p, POSES.walk(Math.PI / 2), 'stand'),
  'walk-2': p => applyPose(p, POSES.walk(Math.PI), 'stand'),
  'walk-3': p => applyPose(p, POSES.walk(Math.PI * 1.5), 'stand'),
  sit: p => applyPose(p, blendBody(POSES.sit(), POSES.stand()), 'sit', SCALE.seat + .02),
  work: p => applyPose(p, blendBody(POSES.sit(), POSES.type(.3)), 'sit', SCALE.seat + .02),
  point: p => applyPose(p, POSES.point(.2), 'stand'),
  hand: p => applyPose(p, POSES.hand(), 'stand'),
  vr: p => applyPose(p, POSES.vr(1.2, 0), 'stand')
});

/**
 * A catalog-like piece for one person. `only` lists component ids to emit (all when
 * empty); the built person is returned in meta.person (components, plan, landmarks).
 */
export function personPiece({ spec = PRIMARIA_BASE, pose = 'rest', only = null } = {}) {
  const level = spec.role === 'teacher' ? 'adult' : (spec.level || 'prim');
  return {
    id: spec.id || 'persona', label: spec.label || 'Persona', group: 'people', budget: spec.role === 'teacher' ? 300 : 280,
    size: { w: .5, d: .4, h: SCALE.person[level] },
    build(b, p, opts) {
      const person = addPaperPerson(b, { ...spec, id: opts.id, x: 0, y: 0, z: 0, ry: 0, only: only && only.length ? only : null });
      const meta = newMeta({ focus: [0, SCALE.person[level] * .55, 0] });
      meta.person = person;
      const apply = PERSON_POSES[pose] || PERSON_POSES.rest;
      meta.afterFinish = () => apply(person);
      return meta;
    }
  };
}
