// The Drones field: two drones race a loop through two gates and two hoops, each in its own lane, staggered in
// height so they never touch, with speeds that swap the lead. Field-local metres (three.js axes, open front at +z).
import { CatmullRomCurve3, Vector3 } from 'three';

export const DRONE_SCALE = 1.2;
export const DRONE_RADIUS = .35; // 0.58 m wide at 1.2x, rounded up: rotor tips included
export const DRONE_HALF_HEIGHT = .06;
export const SPEED = 1.2; // metres per second along the course

// In course order (counter-clockwise seen from above). Obstacles stand across the line of flight, so they sit on the
// field's sides, where there is room between the landing ring and the edge; the course crosses over the ring. y is
// the opening's centre height: a gate's opening runs from the ground to its top bar (0.15-1.55 counted for
// clearance), a hoop's is a 1.8 m ring.
// Waypoints (kind 'via') straighten each side, so the drones fly square through every obstacle.
const PLACES = [
  { id: 'front', kind: 'via', x: 0, z: 2.0, y: 1.1 },
  { id: 'right-in', kind: 'via', x: 2.85, z: 1.7, y: 1.0 },
  { id: 'gate-right', kind: 'gate', x: 2.85, z: .9, y: .85 },
  { id: 'hoop-right', kind: 'hoop', x: 2.85, z: -.6, y: 1.3 },
  { id: 'right-out', kind: 'via', x: 2.85, z: -1.3, y: 1.4 },
  { id: 'back', kind: 'via', x: 0, z: -1.9, y: 1.4 },
  { id: 'left-in', kind: 'via', x: -2.85, z: -1.3, y: 1.4 },
  { id: 'hoop-left', kind: 'hoop', x: -2.85, z: -.6, y: 1.25 },
  { id: 'gate-left', kind: 'gate', x: -2.85, z: .9, y: .85 },
  { id: 'left-out', kind: 'via', x: -2.85, z: 1.7, y: 1.1 }
];

let centre = null;
function centreLine() {
  centre ||= new CatmullRomCurve3(PLACES.map(p => new Vector3(p.x, p.y, p.z)), true, 'centripetal');
  return centre;
}

// Each obstacle faces along the course where it stands (three.js yaw: its opening's normal is (sin, cos)).
export const OBSTACLES = PLACES.map((p, i) => {
  const t = centreLine().getTangent(i / PLACES.length);
  return { ...p, yaw: Math.atan2(t.x, t.z) };
}).filter(p => p.kind !== 'via');

// Lane A runs right and high of the centre line, lane B left and low.
const OFFSETS = { A: { side: -.3, up: .25 }, B: { side: .3, up: -.25 } };
const lanes = {};
function lane(id) {
  if (lanes[id]) return lanes[id];
  const { side, up } = OFFSETS[id], curve = centreLine(), points = [];
  for (let i = 0; i < 160; i += 1) {
    const u = i / 160, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const left = new Vector3(t.z, 0, -t.x).normalize();
    points.push(p.clone().addScaledVector(left, side).add(new Vector3(0, up, 0)));
  }
  lanes[id] = new CatmullRomCurve3(points, true, 'centripetal');
  return lanes[id];
}

export function laneLength(id) {
  return lane(id).getLength();
}

// How far along the course each drone has flown, in centre-line metres: the same average speed, different slow
// rhythms, so the lead changes hands. Lanes map it by fraction of a lap, so the outer lane is not left behind.
const RHYTHM = { A: [.37, 0], B: [.23, 1.7] };
export function distanceAt(id, t) {
  const [w, phase] = RHYTHM[id];
  return SPEED * t + .2 * Math.sin(w * t + phase);
}

function poseAt(id, u) {
  const curve = lane(id), p = curve.getPointAt(u), t = curve.getTangentAt(u);
  const next = curve.getTangentAt((u + .01) % 1), step = .01 * curve.getLength();
  const turn = (t.x * next.z - t.z * next.x) / step; // signed horizontal curvature
  const bank = Math.max(-.35, Math.min(.35, .6 * turn * SPEED)); // into the turn: the inside wing dips
  return { x: p.x, y: p.y, z: p.z, yaw: Math.atan2(t.x, t.z), pitch: -Math.asin(Math.max(-1, Math.min(1, t.y))), bank, u };
}

// Where a drone is and how it leans at time t.
export function dronePose(id, t) {
  const lap = centreLine().getLength();
  const u = (((distanceAt(id, t) / lap) % 1) + 1) % 1;
  return poseAt(id, u);
}

// The lane point nearest an obstacle's centre: where the drone passes through it.
export function closestPoint(id, obstacle) {
  let best = null;
  for (let i = 0; i < 800; i += 1) {
    const p = poseAt(id, i / 800), d = Math.hypot(p.x - obstacle.x, p.y - obstacle.y, p.z - obstacle.z);
    if (!best || d < best.d) best = { ...p, d };
  }
  return best;
}

// Reduced motion: both drones sit on the landing ring (top 0.085 m; the 1.2x drone's underside is 0.06 m below its origin).
export const REST = { A: [.45, .025, 0], B: [-.45, .025, 0] };
export const PILOTS = [{ lane: 'A', x: .7, z: 3.1 }, { lane: 'B', x: 1.5, z: 3.1 }];
export const WATCHERS = [{ x: -1.6, z: 3.1 }, { x: -2.3, z: 3.2 }];
export const FLAG = { x: -3.7, z: 2.6 };
export const COURSE_ASSETS = ['equip-drone', 'equip-drone-gate', 'equip-drone-hoop', 'equip-drone-post', 'equip-race-flag', 'equip-drone-remote'];
