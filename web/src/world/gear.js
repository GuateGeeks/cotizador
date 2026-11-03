// VR gear worn by characters: each piece is merged into one vertex-coloured mesh, so it costs one draw call
// while it follows a bone, and is parented to the fitting points the character build adds.
import { BufferAttribute, Matrix4, Mesh, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plain } from './merge.js';

const geometries = new Map();
let material = null;

// Every mesh under root (except under a node skip() accepts) as one geometry in root's space, coloured per vertex.
function mergeColoured(root, skip = () => false) {
  root.updateWorldMatrix(true, true);
  const inverse = new Matrix4().copy(root.matrixWorld).invert();
  const parts = [];
  const visit = node => {
    if (node !== root && skip(node)) return;
    if (node.isMesh) {
      const part = plain(node, new Matrix4().multiplyMatrices(inverse, node.matrixWorld));
      const { r, g, b } = node.material.color;
      const colours = new Float32Array(part.attributes.position.count * 3);
      for (let i = 0; i < colours.length; i += 3) colours.set([r, g, b], i);
      part.setAttribute('color', new BufferAttribute(colours, 3));
      parts.push(part);
    }
    for (const child of node.children) visit(child);
  };
  visit(root);
  return mergeGeometries(parts);
}

function merged(asset) {
  if (!geometries.has(asset.id)) geometries.set(asset.id, mergeColoured(asset.scene));
  return geometries.get(asset.id);
}

function colourMaterial() {
  material ||= new MeshStandardMaterial({ vertexColors: true, roughness: .5, name: 'GG_GearVertex' });
  return material;
}

// A model's body as one vertex-coloured mesh (one draw), leaving the parts skip() accepts to move on their own.
// The caller owns the returned geometry and disposes it with the entity.
export function vertexMerge(root, skip) {
  const mesh = new Mesh(mergeColoured(root, skip), colourMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function gearMesh(asset) {
  const mesh = new Mesh(merged(asset), colourMaterial());
  mesh.name = asset.id;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.separate = true; // Rides on a bone: merging it with the room would leave it behind.
  mesh.userData.shared = true; // Geometry is shared by every wearer and freed by clearGear.
  return mesh;
}

// How each item rests on its fitting point: position in metres at the reference size, Euler XYZ rotation in radians.
// A grip point turns with its hand from the T-pose, so each rotation undoes the hand's turn in the clip that holds
// the item: the remote and tablet lie flat across both palms in hold (riding the left grip, shifted towards the
// right hand), the controllers stand upright in each fist in vr, one grip per side because the hands mirror.
// Solved from the characters' measured hand_poses; the browser checks measure the result.
export const GRIPS = {
  'equip-vr-headset': { position: [0, 0, 0], rotation: [0, 0, 0] },
  'equip-vr-controller': { l: { position: [0, 0, 0], rotation: [1.401, 1.128, .362] }, r: { position: [0, 0, 0], rotation: [1.52, -1.027, -.261] } },
  'equip-drone-remote': { position: [.001, -.013, -.048], rotation: [1.083, 1.276, 2.338] },
  'equip-tablet': { position: [.002, -.008, -.046], rotation: [1.083, 1.276, 2.338] }
};

function gripFor(id, point) {
  const grip = GRIPS[id];
  return grip?.[point.slice(-1)] ?? grip;
}

export function wearItem(character, kit, point, id) {
  const anchor = character.getObjectByName(point), asset = kit.get(id);
  if (!anchor || !asset) return false; // A character exported before the fitting points existed goes without.
  const mesh = gearMesh(asset), grip = gripFor(id, point);
  if (grip) {
    mesh.position.fromArray(grip.position);
    mesh.rotation.set(...grip.rotation);
  }
  mesh.userData.gear = id;
  anchor.add(mesh);
  return true;
}

export function wearGear(character, kit, { controllers }) {
  const pieces = [['vr_eyes', 'equip-vr-headset']];
  if (controllers) pieces.push(['vr_grip_l', 'equip-vr-controller'], ['vr_grip_r', 'equip-vr-controller']);
  return pieces.filter(([point, id]) => wearItem(character, kit, point, id)).length;
}

export function clearGear() {
  for (const geometry of geometries.values()) geometry.dispose();
  geometries.clear();
  material?.dispose();
  material = null;
}
