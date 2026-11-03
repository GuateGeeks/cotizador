// One shared material per contract name; repeated objects never clone.
import { Color, MeshStandardMaterial } from 'three';
import spec from '../../../world/materials.json';

const cache = new Map();

export function materialFor(name) {
  if (cache.has(name)) return cache.get(name);
  const value = spec[name];
  if (!value) return null;
  const material = new MeshStandardMaterial({ name, roughness: value.roughness, metalness: 0 });
  material.color.set(value.color);
  if (value.vertexColors) material.vertexColors = true; // Kit robots: one material, colour per vertex.
  if ('alpha' in value) Object.assign(material, { transparent: true, opacity: value.alpha, depthWrite: false });
  if ('emissive' in value) Object.assign(material, { emissive: new Color(value.color), emissiveIntensity: value.emissive });
  cache.set(name, material);
  return material;
}

export function disposeMaterials() {
  for (const material of cache.values()) material.dispose();
  cache.clear();
}
