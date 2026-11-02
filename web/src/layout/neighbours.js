/**
 * Pure skyline rules: each roof and detail comes only from what stands next to it, so a school
 * gains small surprises as it grows, yet the same scope always looks the same. Rooms are never touched.
 */
const COURTYARD_ROOMS = 3;
const CENTRE = 2;
const TERRACE_SPOTS = 2; // The terrace roof has two standing places.
const PLAIN_ROOFS = ['pitched', 'flat', 'garden'];

// FNV-1a: small, stable across runs and engines.
export function hashKey(key) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193);
  return hash >>> 0;
}

function stacksOf(modules) {
  const stacks = new Map();
  for (const module of modules) {
    if (!module.footprint || module.column < 0) continue;
    const stack = stacks.get(module.column) || { column: module.column, height: 0, top: null, x: module.x, z: module.z };
    if (module.floor + 1 > stack.height) Object.assign(stack, { height: module.floor + 1, top: module });
    stacks.set(module.column, stack);
  }
  return stacks;
}

function tallestColumn(stacks) {
  const sorted = [...stacks.values()].sort((a, b) => b.height - a.height || Math.abs(a.column - CENTRE) - Math.abs(b.column - CENTRE) || a.column - b.column);
  return sorted[0]?.height >= 2 ? sorted[0].column : null;
}

function roofVariant(stack, stacks, tower) {
  if (stack.column === tower) return { variant: 'tower' };
  const taller = [stacks.get(stack.column - 1), stacks.get(stack.column + 1)].filter(other => other?.height > stack.height);
  if (taller.length) {
    const occupied = Math.min(TERRACE_SPOTS, taller.filter(other => other.top.type === 'room').reduce((sum, other) => sum + (other.top.population || 1), 0));
    return { variant: 'terrace', terraceStudents: occupied };
  }
  if (stack.top.type === 'corridor') return { variant: 'flat' };
  if (stack.top.programId) return { variant: 'barrel' };
  return { variant: PLAIN_ROOFS[hashKey(`roof:${stack.column}`) % PLAIN_ROOFS.length] };
}

export function applyNeighbours(modules, layout) {
  const stacks = stacksOf(modules);
  const tower = tallestColumn(stacks);
  const result = modules.map(module => {
    if (module.type !== 'roof') return module;
    const { variant, terraceStudents } = roofVariant(stacks.get(module.column), stacks, tower);
    return { ...module, key: `${module.key}:${variant}`, asset: `arch-roof-${variant}`, variant,
      ...(terraceStudents ? { terraceStudents, population: terraceStudents } : {}) };
  });
  const detail = (key, asset, x, y, z, extra = {}) => result.push({ key, type: 'detail', asset, column: -1, floor: 0, x, y, z, rot: 0, ...extra });
  for (const stack of stacks.values()) {
    const ground = modules.find(m => m.column === stack.column && m.floor === 0 && m.footprint);
    if (ground?.type === 'corridor') detail(`pocket:${stack.column}`, 'arch-pocket-garden', stack.x, 0, stack.z + layout.bayDepth / 2 + 1.3);
    if (ground?.type === 'support') detail(`archway:${stack.column}`, 'arch-archway', stack.x, 0, stack.z + layout.bayDepth / 2 - .3);
    const next = stacks.get(stack.column + 1);
    if (next && next.height === stack.height) detail(`trim:${stack.column}:${stack.height}`, 'arch-roof-trim', (stack.x + next.x) / 2, stack.height * layout.floor, (stack.z + next.z) / 2);
  }
  if (modules.filter(m => m.type === 'room' && m.floor === 0).length >= COURTYARD_ROOMS) {
    detail('courtyard:tree', 'arch-courtyard-tree', 7, 0, 3);
    detail('courtyard:bench', 'furn-bench', 17, 0, 3);
  }
  return result;
}
