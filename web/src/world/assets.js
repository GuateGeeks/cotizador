// Loads kit GLBs once and swaps exported materials for the shared factory's instances.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { materialFor } from './materials.js';

const pending = new Map();

function adopt(scene) {
  scene.traverse(node => {
    if (!node.isMesh) return;
    const shared = materialFor(node.material?.name);
    if (shared) node.material = shared;
    node.castShadow = !shared?.transparent;
    node.receiveShadow = true;
    node.frustumCulled = !node.isSkinnedMesh;
  });
  return scene;
}

export function loadAsset(id, base = 'models/') {
  if (!pending.has(id)) {
    const load = new GLTFLoader().loadAsync(`${base}${id}.glb`).then(gltf => ({ id, scene: adopt(gltf.scene), animations: gltf.animations }));
    load.catch(() => pending.delete(id)); // A failed fetch must not poison a later retry.
    pending.set(id, load);
  }
  return pending.get(id);
}

export function clearAssets() {
  pending.clear();
}
