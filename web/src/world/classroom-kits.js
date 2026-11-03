// Kits are shown larger than life, like the program rooms' hero equipment, so they read across a classroom.
export const KIT_SCALE = 1.5;

// What a classroom's tables show for each program its grades use. [asset, dx, dz, scale, rotation], offsets
// in metres from the table centre on its top; kits sit on the front half, which the room's lintel leaves in view.
export const TABLE_KITS = {
  tale: [['equip-rover-programmable', 0, .15, 1, .5]],
  master: [['equip-dino', 0, .15, .45, -.5]],
  electronics: [['equip-electronics-kit', 0, .15, 1, .2]],
  spike: [['equip-rover-spike', -.22, .15, 1, .5], ['equip-laptop', .25, .15, 1, -.3]],
  drones: [['equip-drone', 0, .15, .7, .3]],
  immersive: [['equip-vr-set', 0, .15, 1, .2]]
};

// One list of items per table: two programs share the tables, one fills both, none keeps the fallback item.
export function tableKits(programs, fallback) {
  if (!programs.length) return [0, 1].map(() => (fallback ? [[fallback, 0, 0, 1, 0]] : []));
  return [0, 1].map(i => TABLE_KITS[programs[i % programs.length]]);
}

export function KIT_ASSETS(programs) {
  return [...new Set(programs.flatMap(id => TABLE_KITS[id].map(([asset]) => asset)))];
}
