// The Electronics room as a maker lab: three workbench stations in a U around an open middle, each with its own
// job and students. Room-local metres (open front at +z); items [asset, x, z, rotation, scale = 1] sit on the bench
// tops at BASE + 0.75; the circuit kits show larger than life so they read from the room's front. A bench at
// rotation 0 faces the room's front; +pi/2 faces +x, -pi/2 faces -x.
const H = Math.PI / 2;
export const STATIONS = [
  { id: 'printing', bench: { asset: 'furn-workbench-short', x: -2.38, z: -.3, rot: H },
    items: [['equip-printer', -2.38, -.65, H], ['equip-spool-rack', -2.38, -.05, H], ['equip-printed-parts', -2.38, .25, H]],
    students: [{ x: -1.6, z: -.3, rot: -H, clip: 'idle', stool: false }] },
  { id: 'arm', bench: { asset: 'furn-workbench-short', x: 2.38, z: -.3, rot: -H },
    items: [['equip-arm', 2.38, -.55, -H], ['equip-laptop', 2.38, .1, -H]],
    students: [{ x: 1.6, z: -.3, rot: H, clip: 'interact', stool: false }] },
  { id: 'circuits', bench: { asset: 'furn-workbench', x: 0, z: -1.88, rot: 0 },
    items: [['equip-electronics-kit', -.5, -1.85, .2, 1.4], ['equip-electronics-kit', .5, -1.85, -.2, 1.4]],
    students: [{ x: -.45, z: -1.2, rot: Math.PI, clip: 'sit', stool: true }, { x: .45, z: -1.2, rot: Math.PI, clip: 'sit', stool: true }] }
];
// Front-left of the open middle, facing the circuits bench: low enough on screen from the default camera that
// the bench and its seated students show above the teacher, not behind.
export const ELECTRONICS_TEACHER = [-1.2, 1.4, Math.atan2(1.2, -3.28)];
export const MACHINES = new Set(['equip-printer', 'equip-arm']);
export const LAB_ASSETS = [...new Set(STATIONS.flatMap(s => [s.bench.asset, ...s.items.map(([asset]) => asset)])), 'furn-stool'];

const LENGTH = { 'furn-workbench': 2.0, 'furn-workbench-short': 1.4 }, DEPTH = .7;
// A bench's floor rectangle: its length runs along x at rotation 0, along z when turned a quarter.
export function footprint({ asset, x, z, rot }) {
  const along = Math.abs(Math.cos(rot)) > .5, w = (along ? LENGTH[asset] : DEPTH) / 2, d = (along ? DEPTH : LENGTH[asset]) / 2;
  return { minX: x - w, maxX: x + w, minZ: z - d, maxZ: z + d };
}

export const SWAY_PERIOD = 6;

// The arm reaches out and back while its base turns; the printer head slides along its rail. 0 is the rest pose.
export function swayPose(t) {
  const a = 2 * Math.PI * t / SWAY_PERIOD;
  return {
    joint_base: .6 * Math.sin(a),
    joint_shoulder: .35 * Math.sin(2 * a),
    joint_elbow: -.45 * Math.sin(2 * a),
    head_printer: .1 * Math.sin(3 * a)
  };
}
