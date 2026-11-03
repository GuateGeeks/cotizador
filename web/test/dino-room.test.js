import { describe, expect, it } from 'vitest';
import { DINO_LOOP, DINO_START, MASTER_ASSETS, MASTER_SPOTS, loopLength, loopPoint } from '../src/world/dino-room.js';

const TABLES = [[-1.05, -.2], [1.35, -.2]]; // 1.3 x 1.3 m
const nearTable = (x, z, margin) => TABLES.some(([tx, tz]) => Math.abs(x - tx) < .65 + margin && Math.abs(z - tz) < .65 + margin);
const samples = () => Array.from({ length: 200 }, (_, i) => loopPoint(i / 200 * loopLength()));

describe('Makerzoid room', () => {
  it('keeps the whole loop in the open front strip, clear of the tables', () => {
    for (const { x, z } of samples()) {
      expect(z).toBeGreaterThanOrEqual(.55);
      expect(z).toBeLessThanOrEqual(1.95);
      expect(Math.abs(x)).toBeLessThanOrEqual(2.6);
      expect(nearTable(x, z, .3)).toBe(false);
    }
  });
  it('keeps every student clear of the dinosaur', () => {
    for (const [sx, sz] of [MASTER_SPOTS.driver, ...MASTER_SPOTS.watchers]) for (const { x, z } of samples()) expect(Math.hypot(x - sx, z - sz)).toBeGreaterThanOrEqual(.6);
  });
  it('closes the loop and faces along travel', () => {
    const a = loopPoint(0), b = loopPoint(loopLength());
    expect(a.x).toBeCloseTo(b.x);
    expect(a.z).toBeCloseTo(b.z);
    const c = loopPoint(.01);
    expect(Math.sin(a.heading)).toBeCloseTo((c.x - a.x) / .01, 1);
    expect(Math.cos(a.heading)).toBeCloseTo((c.z - a.z) / .01, 1);
  });
  it('turns smoothly round the ends', () => {
    for (let d = 0; d < loopLength(); d += .05) {
      const a = loopPoint(d), b = loopPoint(d + .05);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(.05, 2);
      expect(Math.abs(Math.atan2(Math.sin(b.heading - a.heading), Math.cos(b.heading - a.heading)))).toBeLessThan(.2);
    }
  });
  it('starts, and stands still under reduced motion, on the front straight the camera sees', () => {
    const { x, z } = loopPoint(DINO_START);
    expect(z).toBeCloseTo(DINO_LOOP.z + DINO_LOOP.radius);
    expect(Math.abs(x - DINO_LOOP.x)).toBeLessThanOrEqual(DINO_LOOP.half / 2);
  });
  it('puts the driver nearest the open front, so the tablet is in view', () => {
    for (const [, z] of MASTER_SPOTS.watchers) expect(MASTER_SPOTS.driver[1]).toBeGreaterThan(z);
  });
  it('loads what the room needs', () => {
    expect(MASTER_ASSETS).toEqual(expect.arrayContaining(['equip-dino', 'equip-tablet', 'equip-laptop']));
  });
});
