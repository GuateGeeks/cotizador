import { describe, expect, it } from 'vitest';
import { BENCH, BENCH_ITEMS, SWAY_PERIOD, swayPose } from '../src/world/electronics-room.js';

describe('Electronics room', () => {
  it('stands the bench in the visible front strip, clear of the tables', () => {
    expect(BENCH.z - .35).toBeGreaterThanOrEqual(1.0);
    expect(BENCH.x - 1.0).toBeGreaterThanOrEqual(-1.0); // not in the hidden left part
    const tableFront = -.2 + .65;
    expect(BENCH.z - .35 - tableFront).toBeGreaterThanOrEqual(.6); // room to pass
  });
  it('puts both machines on the worktop', () => {
    expect(BENCH_ITEMS.map(item => item[0]).sort()).toEqual(['equip-arm', 'equip-printer']);
    for (const [, dx, dz] of BENCH_ITEMS) {
      expect(Math.abs(dx) + .25).toBeLessThanOrEqual(1.0);
      expect(Math.abs(dz) + .2).toBeLessThanOrEqual(.35);
    }
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
});
