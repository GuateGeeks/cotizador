import { describe, expect, it } from 'vitest';
import { ELECTRONICS_TEACHER, LAB_ASSETS, STATIONS, SWAY_PERIOD, footprint, swayPose } from '../src/world/electronics-room.js';

const SHELVES = { minX: 1.575, maxX: 2.625, minZ: -2.115, maxZ: -1.79 }, STORAGE = { minX: -2.5, maxX: -1.7, minZ: -2.15, maxZ: -1.73 };
const overlap = (a, b) => a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;

describe('Electronics room', () => {
  it('keeps every bench inside the walls and clear of the shelves, the storage and each other', () => {
    const boxes = STATIONS.map(s => footprint(s.bench));
    for (const b of boxes) {
      expect(b.minX).toBeGreaterThanOrEqual(-2.75);
      expect(b.maxX).toBeLessThanOrEqual(2.75);
      expect(b.minZ).toBeGreaterThanOrEqual(-2.25);
      expect(b.maxZ).toBeLessThanOrEqual(2.25);
      expect(overlap(b, SHELVES) || overlap(b, STORAGE)).toBe(false);
    }
    for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(overlap(a, b)).toBe(false);
  });
  it('puts every student outside every bench and apart from each other', () => {
    const people = STATIONS.flatMap(s => s.students).concat([{ x: ELECTRONICS_TEACHER[0], z: ELECTRONICS_TEACHER[1] }]);
    for (const p of people) for (const s of STATIONS) {
      const b = footprint(s.bench);
      expect(p.x > b.minX - .15 && p.x < b.maxX + .15 && p.z > b.minZ - .15 && p.z < b.maxZ + .15, `${p.x},${p.z} inside ${s.id}`).toBe(false);
    }
    for (const [i, p] of people.entries()) for (const q of people.slice(i + 1)) expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThanOrEqual(.6);
  });
  it('puts every item on its bench top and faces students toward their bench', () => {
    for (const s of STATIONS) {
      const b = footprint(s.bench);
      for (const [, x, z] of s.items) expect(x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ, `${s.id} item off its bench`).toBe(true);
      for (const p of s.students) {
        const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
        expect(Math.cos(Math.atan2(cx - p.x, cz - p.z) - p.rot)).toBeGreaterThan(.7);
      }
    }
  });
  it('has a printing, an arm and a circuits station with four students', () => {
    expect(STATIONS.map(s => s.id).sort()).toEqual(['arm', 'circuits', 'printing']);
    expect(STATIONS.flatMap(s => s.students)).toHaveLength(4);
    expect(LAB_ASSETS).toEqual(expect.arrayContaining(['furn-workbench', 'furn-workbench-short', 'furn-stool', 'equip-printer', 'equip-arm', 'equip-spool-rack']));
  });
  it('keeps the printer carriage on its rail', () => {
    // Rail half-length 0.17 m, carriage half-width 0.035 m.
    let reach = 0;
    for (let t = 0; t < SWAY_PERIOD; t += .01) reach = Math.max(reach, Math.abs(swayPose(t).head_printer));
    expect(reach + .035).toBeLessThanOrEqual(.17);
  });
  it('sways from a neutral pose and loops', () => {
    expect(Object.values(swayPose(0)).every(v => v === 0)).toBe(true);
    for (const [k, v] of Object.entries(swayPose(1.3))) expect(swayPose(1.3 + SWAY_PERIOD)[k]).toBeCloseTo(v);
    expect(Object.values(swayPose(1.3)).some(v => Math.abs(v) > .05)).toBe(true);
  });
  it('keeps the teacher out of the default view of the circuits bench, facing it', () => {
    // Project into the default camera (yaw -0.54, pitch 0.55: it looks from the room's front-left, -x +z). The
    // teacher's silhouette (0.5 x 0.4 m, up to 1.7 m tall) must not overlap on screen the bench top with its kits
    // (0.75-0.95 m) or either seated student (0.45-1.15 m), so none of them hides behind the teacher.
    const yaw = -.54, pitch = .55;
    const right = [Math.cos(yaw), 0, -Math.sin(yaw)], up = [-Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), -Math.cos(yaw) * Math.sin(pitch)];
    const dot = (a, p) => a[0] * p[0] + a[1] * p[1] + a[2] * p[2];
    const box = points => ({ minX: Math.min(...points.map(p => dot(right, p))), maxX: Math.max(...points.map(p => dot(right, p))),
      minY: Math.min(...points.map(p => dot(up, p))), maxY: Math.max(...points.map(p => dot(up, p))) });
    const block = (x0, x1, y0, y1, z0, z1) => [x0, x1].flatMap(x => [y0, y1].flatMap(y => [z0, z1].map(z => [x, y, z])));
    const circuits = STATIONS.find(s => s.id === 'circuits'), b = footprint(circuits.bench);
    const seen = [box(block(b.minX, b.maxX, .75, .95, b.minZ, b.maxZ)), ...circuits.students.map(p => box(block(p.x - .25, p.x + .25, .45, 1.15, p.z - .2, p.z + .2)))];
    const [tx, tz, trot] = ELECTRONICS_TEACHER;
    const teacher = box(block(tx - .25, tx + .25, 0, 1.7, tz - .2, tz + .2));
    for (const part of seen) {
      const hides = teacher.minX < part.maxX && part.minX < teacher.maxX && teacher.minY < part.maxY && part.minY < teacher.maxY;
      expect(hides, `teacher ${JSON.stringify(teacher)} over ${JSON.stringify(part)}`).toBe(false);
    }
    const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
    expect(Math.cos(Math.atan2(cx - tx, cz - tz) - trot)).toBeGreaterThan(.95);
  });
  it('shows the circuit kits at 1.4 scale, wholly on the bench top', () => {
    // The kit's footprint is 0.36 x 0.26 m at scale 1; turned by its rotation, its scaled corners stay on the 2.0 x 0.7 m top.
    const circuits = STATIONS.find(s => s.id === 'circuits'), b = footprint(circuits.bench);
    const kits = circuits.items.filter(([asset]) => asset === 'equip-electronics-kit');
    expect(kits).toHaveLength(2);
    for (const [, x, z, rot, scale] of kits) {
      expect(scale).toBe(1.4);
      const w = .36 * scale / 2, d = .26 * scale / 2;
      const ex = w * Math.abs(Math.cos(rot)) + d * Math.abs(Math.sin(rot)), ez = w * Math.abs(Math.sin(rot)) + d * Math.abs(Math.cos(rot));
      expect(x - ex >= b.minX && x + ex <= b.maxX && z - ez >= b.minZ && z + ez <= b.maxZ, `kit at ${x},${z} hangs off the bench`).toBe(true);
    }
    const [[, ax, , arot, as], [, bx, , brot, bs]] = kits;
    const reach = (rot, scale) => .36 * scale / 2 * Math.abs(Math.cos(rot)) + .26 * scale / 2 * Math.abs(Math.sin(rot));
    expect(Math.abs(ax - bx)).toBeGreaterThan(reach(arot, as) + reach(brot, bs)); // The two kits do not overlap.
  });
});
