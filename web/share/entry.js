// Bundle entry for the shareable page (see scripts/asset-export/share.mjs).
// The artifact frame only allows fetch() to its own host and refuses .glb files, so each model ships as
// base64 GLB text and is parsed in memory; textures load through <img> instead of a blob: fetch.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export { createWorld } from '../src/world/create-world.js';
export { default as states } from '../src/app/states.json';

try { window.createImageBitmap = undefined; } catch {}

GLTFLoader.prototype.loadAsync = async function (url) {
  const response = await fetch(url.replace(/\.glb$/, '.txt'));
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const text = (await response.text()).trim();
  return this.parseAsync(Uint8Array.from(atob(text), c => c.charCodeAt(0)).buffer, '');
};
