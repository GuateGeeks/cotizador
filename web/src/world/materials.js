// One shared material per contract name; repeated objects never clone.
import { Color, MeshStandardMaterial } from 'three';
import spec from '../../../world/materials.json';

const cache = new Map();
let veil = null;

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

// The see-through veil over whatever blocks a focused room: one shared, light, shadowless material.
export function veilMaterial() {
  veil ||= new MeshStandardMaterial({ name: 'GG_Veil', color: 0xfff8ec, roughness: .6, metalness: 0, transparent: true, opacity: .22, depthWrite: false });
  return veil;
}

export function disposeMaterials() {
  veil?.dispose();
  veil = null;
  for (const material of cache.values()) material.dispose();
  cache.clear();
}
