// Merges an entity's static parts per material, so a furnished room costs a few draw calls.
import { BufferAttribute, Matrix4, Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const MOVING = /^(wheel_|rotor_)/; // Only parts the runtime animates; other pivots stay available in the GLB.

export function plain(mesh, relative) {
  const geometry = mesh.geometry.clone();
  for (const name of Object.keys(geometry.attributes)) if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
  // Compressed GLBs use quantized attributes, which cannot hold transformed values.
  for (const name of ['position', 'normal']) {
    const source = geometry.getAttribute(name);
    const values = new Float32Array(source.count * 3);
    for (let i = 0; i < source.count; i += 1) values.set([source.getX(i), source.getY(i), source.getZ(i)], i * 3);
    geometry.setAttribute(name, new BufferAttribute(values, 3));
  }
  geometry.morphAttributes = {};
  const expanded = geometry.index ? geometry.toNonIndexed() : geometry;
  expanded.applyMatrix4(relative);
  return expanded;
}

export function mergeStatic(root, castShadow = true) {
  root.updateWorldMatrix(true, true);
  const inverse = new Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  const visit = node => {
    if (node !== root && (MOVING.test(node.name) || node.userData.separate)) return;
    if (node.isMesh && !node.isSkinnedMesh) {
      if (!groups.has(node.material)) groups.set(node.material, []);
      groups.get(node.material).push(node);
    }
    for (const child of node.children) visit(child);
  };
  visit(root);
  const owned = [];
  for (const [material, meshes] of groups) {
    const geometry = mergeGeometries(meshes.map(mesh => plain(mesh, new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld))));
    for (const mesh of meshes) mesh.removeFromParent();
    const merged = new Mesh(geometry, material);
    merged.castShadow = castShadow && !material.transparent;
    merged.receiveShadow = true;
    root.add(merged);
    owned.push(geometry);
  }
  return owned;
}

// Combines the merged meshes of settled entities into one mesh per material. Originals stay hidden
// so raycasts still identify the entity, and clearing the batch restores them immediately.
export function buildBatch(meshes, parent) {
  const groups = new Map();
  parent.updateWorldMatrix(true, false);
  const inverse = new Matrix4().copy(parent.matrixWorld).invert();
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    const id = `${mesh.material.uuid}|${mesh.castShadow}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(mesh);
  }
  const batch = [];
  for (const list of groups.values()) {
    const material = list[0].material;
    const geometry = mergeGeometries(list.map(mesh => mesh.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld))));
    const merged = new Mesh(geometry, material);
    merged.castShadow = list[0].castShadow;
    merged.receiveShadow = true;
    merged.userData.batch = true;
    parent.add(merged);
    batch.push(merged);
    for (const mesh of list) mesh.visible = false;
  }
  return { batch, sources: meshes };
}

export function clearBatch(state) {
  for (const mesh of state?.sources || []) mesh.visible = true;
  for (const mesh of state?.batch || []) { mesh.removeFromParent(); mesh.geometry.dispose(); }
}
