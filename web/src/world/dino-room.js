// The Makerzoid room: the kit dinosaur walks a stadium loop through the open front strip while one student
// drives it from a tablet and two watch. Room-local metres, like the other furnishing in create-world.
export const DINO_SCALE = 1.5;
export const DINO_SPEED = .35; // metres per second along the loop
// Two straights along x at z - radius and z + radius, joined by half circles.
// In the room's right half: at the default view the neighbouring column hides the left half and the walkway
// above hides the back, so the loop, the driver and the watchers all sit where the camera sees them.
export const DINO_LOOP = { x: .9, z: 1.25, half: .6, radius: .4 };
// The driver stands nearest the open front so the tablet is in view; the watchers stand beside the loop.
export const MASTER_SPOTS = { driver: [1.95, 2.15], watchers: [[2.55, 1.65], [2.55, .75]] };
// Where the walk starts, and where reduced motion leaves the dinosaur: mid-way along the front straight.
export const DINO_START = DINO_LOOP.half;
export const MASTER_ASSETS = ['equip-dino', 'equip-tablet', 'equip-laptop'];

const { x: cx, z: cz, half, radius } = DINO_LOOP;
const straight = half * 2, arc = Math.PI * radius;

export function loopLength() {
  return 2 * (straight + arc);
}

// On an end turn around (ox, cz), from angle `from` turning clockwise by `s / radius`.
function around(ox, from, s) {
  const angle = from - s / radius;
  return { x: ox + radius * Math.cos(angle), z: cz + radius * Math.sin(angle), heading: Math.atan2(Math.sin(angle), -Math.cos(angle)) };
}

// Position and facing (three.js yaw, nose along +Z at 0) after walking `distance` metres.
export function loopPoint(distance) {
  let s = ((distance % loopLength()) + loopLength()) % loopLength();
  if (s < straight) return { x: cx - half + s, z: cz + radius, heading: Math.PI / 2 };
  s -= straight;
  if (s < arc) return around(cx + half, Math.PI / 2, s);
  s -= arc;
  if (s < straight) return { x: cx + half - s, z: cz - radius, heading: -Math.PI / 2 };
  return around(cx - half, -Math.PI / 2, s - straight);
}
