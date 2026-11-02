// VR gear worn by characters: each piece is merged into one vertex-coloured mesh, so it costs one draw call
// while it follows a bone, and is parented to the fitting points the character build adds.
import { BufferAttribute, Matrix4, Mesh, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { plain } from './merge.js';

const geometries = new Map();
let material = null;

function merged(asset) {
  if (geometries.has(asset.id)) return geometries.get(asset.id);
  asset.scene.updateWorldMatrix(true, true);
  const inverse = new Matrix4().copy(asset.scene.matrixWorld).invert();
  const parts = [];
  asset.scene.traverse(node => {
    if (!node.isMesh) return;
    const part = plain(node, new Matrix4().multiplyMatrices(inverse, node.matrixWorld));
    const { r, g, b } = node.material.color;
    const colours = new Float32Array(part.attributes.position.count * 3);
    for (let i = 0; i < colours.length; i += 3) colours.set([r, g, b], i);
    part.setAttribute('color', new BufferAttribute(colours, 3));
    parts.push(part);
  });
  const geometry = mergeGeometries(parts);
  geometries.set(asset.id, geometry);
  return geometry;
}

export function gearMesh(asset) {
  material ||= new MeshStandardMaterial({ vertexColors: true, roughness: .5, name: 'GG_GearVertex' });
  const mesh = new Mesh(merged(asset), material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.separate = true; // Rides on a bone: merging it with the room would leave it behind.
  mesh.userData.shared = true; // Geometry is shared by every wearer and freed by clearGear.
  return mesh;
}

export function wearGear(character, kit, { controllers }) {
  const pieces = [['vr_eyes', 'equip-vr-headset']];
  if (controllers) pieces.push(['vr_grip_l', 'equip-vr-controller'], ['vr_grip_r', 'equip-vr-controller']);
  let worn = 0;
  for (const [point, id] of pieces) {
    const anchor = character.getObjectByName(point), asset = kit.get(id);
    if (!anchor || !asset) continue; // A character exported before the fitting points existed goes without.
    anchor.add(gearMesh(asset));
    worn += 1;
  }
  return worn;
}

export function clearGear() {
  for (const geometry of geometries.values()) geometry.dispose();
  geometries.clear();
  material?.dispose();
  material = null;
}
