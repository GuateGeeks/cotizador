import { describe, expect, it } from 'vitest';
import { VR_ASSETS, VR_PROPS, VR_ZONES } from '../src/world/vr-room.js';

describe('VR room', () => {
  it('gives every VR student a zone of their own', () => {
    expect(VR_ZONES).toHaveLength(3);
    for (const [i, [x, z]] of VR_ZONES.entries()) for (const [ox, oz] of VR_ZONES.slice(i + 1)) expect(Math.hypot(x - ox, z - oz)).toBeGreaterThanOrEqual(1.4);
  });
  it('keeps the zones inside the room and clear of the screen and shelf', () => {
    const [, sx, , sz] = VR_PROPS.find(([asset]) => asset === 'equip-screen-vr');
    for (const [x, z] of VR_ZONES) {
      expect(Math.abs(x)).toBeLessThanOrEqual(2.4);
      expect(Math.abs(z)).toBeLessThanOrEqual(1.9);
      expect(Math.hypot(x - sx, z - sz)).toBeGreaterThanOrEqual(.9);
      expect(Math.hypot(x - 2.1, z + 1.95)).toBeGreaterThanOrEqual(.9);
    }
  });
  it('stands the students in the front strip, where the roof and the front beam do not hide them', () => {
    // Visible students in the other rooms stand 1.0-1.2 m in from the open front (z), like these.
    for (const [, z] of VR_ZONES) expect(z).toBeGreaterThanOrEqual(.9);
  });
  it('starts each student at a different point of the loop', () => {
    expect(new Set(VR_ZONES.map(zone => zone[3])).size).toBe(3);
  });
  it('lists the gear among the room assets', () => {
    expect(VR_ASSETS).toEqual(expect.arrayContaining(['equip-vr-headset', 'equip-vr-controller', 'equip-vr-zone', 'equip-screen-vr']));
  });
});
