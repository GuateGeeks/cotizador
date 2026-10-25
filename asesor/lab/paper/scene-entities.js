/**
 * Scene entities for the papercraft campus. The plan's modules are grouped into
 * a handful of entities with stable keys so a data change rebuilds only what
 * changed and the draw-call budget holds:
 *   bay:<x>:<z>   one stack of rooms (floors, roofs, walkways) with its furniture and people
 *   links         entrance, paths, stairs, bridge and the drone patio (with its people)
 *   terrain       pedestals and vegetation
 * Each entity is one skinned group at the origin: module positions are absolute.
 */
import { createBuilder } from '../campus-kit.js';
import { paperKit, newMeta } from './kit.js';
import { composeCampus } from './compose.js';

const BAY_TYPES = new Set(['columns', 'roof', 'corridor']);
const isBay = type => type.startsWith('room-') || BAY_TYPES.has(type);
const TERRAIN = new Set(['pedestal', 'tree-large', 'tree-small', 'tree-cards', 'bush', 'flowers', 'planter', 'bench', 'pot', 'plant-rhombus']);
const rounded = v => Math.round(v * 100) / 100;

/** Group a plan into entity descriptors { key, kind, moduleKeys, modules }. */
export function groupPlan(plan) {
  const modules = plan.modules || [];
  const clusters = [];
  const bayModules = modules.filter(m => isBay(m.type)).sort((a, b) => a.y - b.y || (a.type === 'corridor') - (b.type === 'corridor') || (a.key < b.key ? -1 : 1));
  for (const m of bayModules) {
    let c = clusters.find(c => Math.abs(c.x - m.x) < .05 && Math.abs(c.z - m.z) <= .8);
    if (!c) { c = { x: m.x, z: m.z, list: [] }; clusters.push(c); }
    c.list.push(m);
  }
  const entities = clusters.map(c => ({ key: `bay:${rounded(c.x)}:${rounded(c.z)}`, kind: 'bay', modules: c.list, x: c.x, z: c.z }));
  const links = modules.filter(m => !isBay(m.type) && !TERRAIN.has(m.type));
  const terrain = modules.filter(m => TERRAIN.has(m.type));
  if (links.length) entities.push({ key: 'links', kind: 'links', modules: links });
  if (terrain.length) entities.push({ key: 'terrain', kind: 'terrain', modules: terrain });
  entities.sort((a, b) => (a.key < b.key ? -1 : 1));
  const people = plan.people || [];
  for (const e of entities) {
    e.moduleKeys = new Set(e.modules.map(m => m.key));
    e.people = people.filter(p => e.moduleKeys.has(p.moduleKey));
  }
  return entities;
}

const pick = (m) => ({ k: m.key, t: m.type, x: m.x, y: m.y, z: m.z, r: m.ry, o: m.opts, l: m.levelId, p: m.programId, e: m.empty });
/** Content signature: what the entity looks like. Equal signatures keep their geometry. */
export function entitySignature(entity, plan) {
  const eq = new Set(entity.modules.map(m => m.programId).filter(Boolean));
  const equipment = [...eq].map(id => { const e = plan.normalized.equipment[id]; return e && { id, units: e.units, stations: e.stations, modes: e.sharingModes, groups: e.groupIds.length, sim: e.simIds.length }; });
  return JSON.stringify({ k: entity.kind, m: entity.modules.map(pick), p: entity.people, g: plan.services?.guided, sv: plan.services && [plan.services.training, plan.services.followup], equipment });
}

/** Build one entity: group, meta and the rig bookkeeping the scene needs. */
export function buildEntityGroup(entity, plan, materials) {
  const b = createBuilder();
  b.base('solid');
  const p = paperKit(b);
  const piece = composeCampus(plan, { only: entity.moduleKeys });
  let meta, error = null;
  try { meta = piece.build(b, p) || newMeta(); } catch (e) { error = String(e && e.stack || e); meta = newMeta(); }
  const group = b.finish(materials);
  if (!error && typeof meta.afterFinish === 'function') {
    try { meta.afterFinish(group); group.userData.rig.root.updateMatrixWorld(true); } catch (e) { error = String(e && e.stack || e); }
  }
  const rig = group.userData.rig;
  rig.bones.forEach(bone => { bone.userData.rest = { position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone() }; });
  return { group, meta, error, rig, triangles: group.userData.triangles };
}

/** Which selectable module (if any) each module represents. */
export function selectionOf(m) {
  if (m.type === 'roof') return null;
  if (m.type.startsWith('room-')) return m.levelId ? { kind: 'level', id: m.levelId } : m.programId ? { kind: 'program', id: m.programId } : null;
  if (m.type === 'patio' && m.programId === 'drones') return { kind: 'program', id: 'drones' };
  return null;
}
