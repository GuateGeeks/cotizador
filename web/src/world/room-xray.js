// What blocks the view of a focused room, after the cotizador's x-ray (asesor/lab/campus-scene.js), with its
// thresholds scaled from its 2 m bay to our 6 m one. Pure: modules in, decisions out.
const HIDE_TYPES = new Set(['room', 'roof', 'patio']);
const VEIL_TYPES = new Set(['balcony', 'gallery', 'stairs', 'landing', 'entrance', 'tree', 'detail', 'support', 'corridor', 'planter']);

// Veiled modules of these types also hide their furniture, people and gear, leaving only their shell.
export const HIDES_INSIDE = new Set(['room', 'roof']);

// Named parts of a classroom shell (scripts/blender/assets/architecture.py, classroom_shell).
export const OWN_WALLS = {
  always: ['header', 'sill'],
  front: ['pier_front'],
  back: ['wall_back', 'accent_back', 'inner_back', 'screen', 'screen_frame'],
  side: ['wall', 'wall_low', 'wall_high', 'wall_pier', 'frame', 'glass']
};

// Map of module key to 'veil' or 'hide' for everything above the room or between it and the camera.
export function xrayBlockers(room, modules, yaw) {
  const hx = Math.sin(yaw), hz = Math.cos(yaw), out = new Map();
  for (const m of modules) {
    if (m.key === room.key || !(HIDE_TYPES.has(m.type) || VEIL_TYPES.has(m.type))) continue;
    const dx = m.x - room.x, dz = m.z - room.z;
    const above = Math.abs(dx) < 3.9 && Math.abs(dz) < 3.45 && m.y > room.y + .1;
    const along = dx * hx + dz * hz, lateral = Math.abs(dx * hz - dz * hx);
    const between = along > 1.8 && along < 13.5 && lateral < 6.6 && (m.y >= room.y - .3 || m.type === 'tree');
    // Whole buildings in front would stack veils: they step aside; thin links stay as a veil.
    if (above) out.set(m.key, 'veil');
    else if (between) out.set(m.key, HIDE_TYPES.has(m.type) ? 'hide' : 'veil');
  }
  return out;
}

// Which of the room's own walls face the camera at this yaw.
export function wallVeils(yaw) {
  const hx = Math.sin(yaw), hz = Math.cos(yaw);
  return { front: hz > .25, back: hz < -.25, left: hx < -.25, right: hx > .25 };
}
