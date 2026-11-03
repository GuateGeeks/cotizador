// Derives GRIPS (web/src/world/gear.js) from the characters' manifests and published GLBs, and predicts where a
// held item lands. A grip point rides its hand bone and is world-aligned in the T-pose, so in a clip it carries the
// hand's turn since the T-pose; manifests record that turn as palm and thumb directions (glTF axes, character frame).
// Usage: node tools/grip-solver.js   (prints the solved GRIPS)
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

export const CHARACTERS = ['char-student-pre', 'char-student-primary', 'char-student-primary-boy', 'char-student-basico', 'char-student-bach', 'char-teacher'];
// Each held item and the clip it is held in; the remote and tablet ride the left grip, controllers one per hand.
export const HELD = { 'equip-drone-remote': { clip: 'hold', side: 'l' }, 'equip-tablet': { clip: 'hold', side: 'l' }, 'equip-vr-controller': { clip: 'vr' } };
const CLEARANCE = .02; // metres between the hand's centre and the underside of a flat item

// The grip point's world scale, which sizes gear authored at the reference size.
export function gripScale(buffer) {
  const nodes = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString()).nodes;
  const parent = new Map(nodes.flatMap((node, i) => (node.children || []).map(child => [child, i])));
  const local = node => node.matrix ? new Matrix4().fromArray(node.matrix)
    : new Matrix4().compose(new Vector3(...(node.translation || [0, 0, 0])), new Quaternion(...(node.rotation || [0, 0, 0, 1])), new Vector3(...(node.scale || [1, 1, 1])));
  const world = new Matrix4();
  for (let i = nodes.findIndex(node => node.name === 'vr_grip_l'); i !== undefined; i = parent.get(i)) world.premultiply(local(nodes[i]));
  return Math.cbrt(Math.abs(world.determinant()));
}

function basis(palm, thumb) {
  const p = new Vector3(...palm).normalize(), t = new Vector3(...thumb);
  t.addScaledVector(p, -t.dot(p)).normalize();
  return new Matrix4().makeBasis(p, t, new Vector3().crossVectors(p, t));
}

const REST = basis([0, -1, 0], [0, 0, 1]); // T-pose: palms down, thumbs forward

// The hand's turn since the T-pose in one clip sample.
export function handRotation(sample, side) {
  return basis(sample[`palm_${side}`], sample[`thumb_${side}`]).multiply(REST.clone().transpose());
}

function mean(quaternions) {
  const sum = [0, 0, 0, 0], first = quaternions[0];
  for (const q of quaternions) {
    const sign = Math.sign(q.dot(first)) || 1;
    q.toArray().forEach((v, i) => { sum[i] += sign * v; });
  }
  return new Quaternion(...sum).normalize();
}

const round = values => values.map(v => Math.round(v * 1000) / 1000 || 0);
const eulerOf = q => round(new Euler().setFromQuaternion(q, 'XYZ').toArray().slice(0, 3));
const inverseTurn = (sample, side) => new Quaternion().setFromRotationMatrix(handRotation(sample, side)).invert();

// bodies: [{ manifest, scale }]; items: { id: manifest }.
export function solveGrips(bodies, items) {
  const grips = {};
  for (const [id, { clip, side }] of Object.entries(HELD)) {
    if (side) {
      // Flat across both palms: undo the hand's turn, and sit the item over the middle of the hands.
      const turns = [], positions = [];
      for (const { manifest, scale } of bodies) for (const sample of manifest.hand_poses[clip]) {
        const back = inverseTurn(sample, side);
        turns.push(back);
        const grip = new Vector3(...sample[`grip_${side}`]);
        const target = new Vector3(...sample.grip_l).add(new Vector3(...sample.grip_r)).multiplyScalar(.5);
        target.y += CLEARANCE + Math.abs(items[id].bounds.min[1]) * scale;
        positions.push(target.sub(grip).applyQuaternion(back).divideScalar(scale));
      }
      const position = positions.reduce((a, b) => a.add(b), new Vector3()).divideScalar(positions.length);
      grips[id] = { position: round(position.toArray()), rotation: eulerOf(mean(turns)) };
    } else {
      // Upright in each fist, from the resting hold.
      grips[id] = Object.fromEntries(['l', 'r'].map(s => [s, { position: [0, 0, 0], rotation: eulerOf(mean(bodies.map(({ manifest }) => inverseTurn(manifest.hand_poses[clip][0], s)))) }]));
    }
  }
  return grips;
}

// Where an item worn on one grip lands in a clip sample: its distance from the middle of both hands, its height
// above them, and how upright it stands.
export function placeItem({ scale }, sample, id, side, grips, item) {
  const grip = grips[id][side] ?? grips[id];
  const turn = handRotation(sample, side).multiply(new Matrix4().makeRotationFromEuler(new Euler(...grip.rotation, 'XYZ')));
  const origin = new Vector3(...sample[`grip_${side}`]).add(new Vector3(...grip.position).multiplyScalar(scale).applyMatrix4(handRotation(sample, side)));
  const box = item.bounds, centre = new Vector3(...box.min).add(new Vector3(...box.max)).multiplyScalar(.5 * scale).applyMatrix4(turn).add(origin);
  const middle = new Vector3(...sample.grip_l).add(new Vector3(...sample.grip_r)).multiplyScalar(.5);
  return { between: centre.distanceTo(middle), above: centre.y - middle.y, up: new Vector3(0, 1, 0).applyMatrix4(turn).y };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = new URL('../../', import.meta.url);
  const read = path => readFileSync(new URL(path, root));
  const bodies = CHARACTERS.map(id => ({ manifest: JSON.parse(read(`assets/manifests/${id}.json`)), scale: gripScale(read(`web/public/models/${id}.glb`)) }));
  const items = Object.fromEntries(Object.keys(HELD).map(id => [id, JSON.parse(read(`assets/manifests/${id}.json`))]));
  console.log(JSON.stringify(solveGrips(bodies, items), null, 1));
}
