// The Electronics room: the 3D printer and the robotic arm work at a bench in the front of the room, where the
// camera sees them, instead of standing on the floor. Room-local metres, like the other furnishing.
export const BENCH = { x: 1.0, z: 1.45, rot: 0 }; // 2.0 x 0.7 m: spans x 0..2, z 1.1..1.8
export const BENCH_ITEMS = [['equip-printer', -.55, 0, 0], ['equip-arm', .45, 0, -.4]]; // [asset, dx, dz, rotation]
export const ELECTRONICS_SPOTS = { bench: [2.45, 1.45, -Math.PI / 2], seat: [.47, -.2, Math.PI / 2] };
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
