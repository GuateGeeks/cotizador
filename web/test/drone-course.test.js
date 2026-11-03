import { describe, expect, it } from 'vitest';
import { COURSE_ASSETS, DRONE_HALF_HEIGHT, DRONE_RADIUS, FLAG, OBSTACLES, PILOTS, REST, SPEED, WATCHERS, closestPoint, distanceAt, dronePose, laneLength } from '../src/world/drone-course.js';

const PAD = { minX: -4, maxX: 4, minZ: -2.5, maxZ: 2.5 };
const PLANTERS = [{ minX: 2.5, maxX: 3.9, minZ: -2.0, maxZ: -1.4 }, { minX: -3.9, maxX: -2.5, minZ: -2.0, maxZ: -1.4 }];
const PLANTER_TOP = .85;
const lap = () => laneLength('A') / SPEED;
const samples = id => Array.from({ length: 600 }, (_, i) => dronePose(id, i / 600 * lap() * 1.3));
const inBox = (b, x, z, m = 0) => x > b.minX - m && x < b.maxX + m && z > b.minZ - m && z < b.maxZ + m;
// The two ends of an obstacle's frame, 1.0 m either side of its centre across the opening.
const ends = o => [-1, 1].map(s => ({ x: o.x + s * Math.cos(o.yaw), z: o.z - s * Math.sin(o.yaw) }));

describe('drone course', () => {
  it('stands every obstacle on the pad, clear of the ring and the planters', () => {
    expect(OBSTACLES.map(o => o.kind).sort()).toEqual(['gate', 'gate', 'hoop', 'hoop']);
    for (const o of OBSTACLES) for (const e of ends(o)) {
      expect(inBox(PAD, e.x, e.z), `${o.id} off the pad`).toBe(true);
      expect(Math.hypot(e.x, e.z), `${o.id} on the ring`).toBeGreaterThanOrEqual(1.75);
      for (const p of PLANTERS) expect(inBox(p, e.x, e.z, .1), `${o.id} in a planter`).toBe(false);
    }
  });
  it('faces every obstacle along the course', () => {
    for (const o of OBSTACLES) {
      const before = dronePose('A', 0), p = closestPoint('A', o);
      expect(Math.cos(p.yaw - o.yaw), o.id).toBeGreaterThan(.95);
      expect(before).toBeTruthy();
    }
  });
  it('flies each lane through every obstacle opening with edge clearance', () => {
    for (const id of ['A', 'B']) for (const o of OBSTACLES) {
      const p = closestPoint(id, o);
      const lateral = Math.abs((p.x - o.x) * Math.cos(o.yaw) - (p.z - o.z) * Math.sin(o.yaw)), vertical = Math.abs(p.y - o.y);
      if (o.kind === 'gate') {
        expect(lateral + DRONE_RADIUS + .12, `${id} ${o.id} sideways`).toBeLessThanOrEqual(.9);
        expect(vertical + DRONE_HALF_HEIGHT + .12, `${id} ${o.id} height`).toBeLessThanOrEqual(.7);
      } else expect(Math.hypot(lateral, vertical) + DRONE_RADIUS + .12, `${id} ${o.id}`).toBeLessThanOrEqual(.9);
    }
  });
  it('keeps the two drones apart at every moment', () => {
    for (let t = 0; t < 4 * lap(); t += .05) {
      const a = dronePose('A', t), b = dronePose('B', t);
      const apart = Math.abs(a.y - b.y) - 2 * DRONE_HALF_HEIGHT >= .15 || Math.hypot(a.x - b.x, a.z - b.z) - 2 * DRONE_RADIUS >= .15;
      expect(apart, `t ${t.toFixed(2)}`).toBe(true);
    }
  });
  it('stays over the pad, clear of the walkers, below a ceiling and above the planters', () => {
    for (const id of ['A', 'B']) for (const p of samples(id)) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(3.6);
      expect(p.z).toBeLessThanOrEqual(2.5);
      expect(p.z).toBeGreaterThanOrEqual(-2.5);
      expect(p.y).toBeGreaterThanOrEqual(.55); // a drone's underside stays about half a metre off the ground
      expect(p.y).toBeLessThanOrEqual(2.4);
      for (const b of PLANTERS) if (inBox(b, p.x, p.z, DRONE_RADIUS)) expect(p.y - DRONE_HALF_HEIGHT).toBeGreaterThanOrEqual(PLANTER_TOP + .12);
    }
  });
  it('changes the lead at least once a lap', () => {
    for (let start = 0; start < 4 * lap(); start += lap()) {
      let changes = 0, last = Math.sign(distanceAt('A', start) - distanceAt('B', start));
      for (let t = start; t < start + lap(); t += .05) {
        const s = Math.sign(distanceAt('A', t) - distanceAt('B', t));
        if (s && s !== last) { changes += 1; last = s; }
      }
      expect(changes, `lap from ${start.toFixed(1)} s`).toBeGreaterThanOrEqual(1);
    }
  });
  it('keeps every person and the flag clear of the lanes and obstacles', () => {
    const people = [...PILOTS, ...WATCHERS];
    for (const q of [...people, { ...FLAG, flag: true }]) {
      for (const id of ['A', 'B']) for (const p of samples(id)) expect(Math.hypot(p.x - q.x, p.z - q.z), `${JSON.stringify(q)} near lane ${id}`).toBeGreaterThanOrEqual(.3 + DRONE_RADIUS);
      for (const o of OBSTACLES) for (const e of [o, ...ends(o)]) expect(Math.hypot(e.x - q.x, e.z - q.z)).toBeGreaterThanOrEqual(.5);
      expect(Math.abs(q.x)).toBeLessThanOrEqual(4);
      expect(q.z).toBeLessThanOrEqual(3.3);
    }
    for (const [i, a] of people.entries()) for (const b of people.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(.6);
    expect(PILOTS.map(p => p.lane).sort()).toEqual(['A', 'B']);
  });
  it('rests both drones on the landing ring, apart', () => {
    for (const r of Object.values(REST)) expect(Math.hypot(r[0], r[2])).toBeLessThanOrEqual(1.7 - DRONE_RADIUS);
    expect(Math.hypot(REST.A[0] - REST.B[0], REST.A[2] - REST.B[2])).toBeGreaterThanOrEqual(2 * DRONE_RADIUS + .15);
  });
  it('loads what the field needs', () => {
    expect(COURSE_ASSETS).toEqual(expect.arrayContaining(['equip-drone', 'equip-drone-gate', 'equip-drone-hoop', 'equip-drone-post', 'equip-race-flag', 'equip-drone-remote']));
  });
});
