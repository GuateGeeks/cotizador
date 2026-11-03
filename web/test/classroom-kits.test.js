import { describe, expect, it } from 'vitest';
import { KIT_ASSETS, KIT_SCALE, TABLE_KITS, tableKits } from '../src/world/classroom-kits.js';
import manifests from './fixtures/kit-footprints.json';
import { PROGRAM_IDS } from '../src/layout/normalize.js';

const ids = tables => tables.map(table => table.map(item => item[0]));

describe('classroom kits', () => {
  it('has a kit for every program, each small enough for a table top', () => {
    for (const id of PROGRAM_IDS) expect(TABLE_KITS[id]?.length, id).toBeGreaterThan(0);
    for (const items of Object.values(TABLE_KITS)) for (const [, dx, dz] of items) expect(Math.abs(dx) <= .45 && Math.abs(dz) <= .45).toBe(true);
  });
  it('splits two programs over the tables, repeats one, and falls back with none', () => {
    expect(ids(tableKits(['master', 'electronics'], 'equip-organizer'))).toEqual([['equip-dino'], ['equip-electronics-kit']]);
    expect(ids(tableKits(['drones'], 'equip-laptop'))).toEqual([['equip-drone'], ['equip-drone']]);
    expect(ids(tableKits([], 'equip-laptop'))).toEqual([['equip-laptop'], ['equip-laptop']]);
    expect(ids(tableKits([], null))).toEqual([[], []]);
  });
  it('puts SPIKE rovers beside a laptop and shrinks the drone', () => {
    expect(ids(tableKits(['spike'], null))[0]).toEqual(['equip-rover-spike', 'equip-laptop']);
    expect(TABLE_KITS.drones[0][3]).toBeCloseTo(.7);
  });
  it('shows kits larger than life so they read across a classroom, still on the 1.3 m table top', () => {
    expect(KIT_SCALE).toBeGreaterThanOrEqual(1.5);
    for (const [program, items] of Object.entries(TABLE_KITS)) for (const [asset, dx, dz, scale] of items) {
      const [w, , d] = manifests[asset], half = Math.max(w, d) / 2 * scale * KIT_SCALE;
      expect(Math.abs(dx * KIT_SCALE) + half, `${program} ${asset}`).toBeLessThanOrEqual(.65);
      expect(Math.abs(dz * KIT_SCALE) + half, `${program} ${asset}`).toBeLessThanOrEqual(.65);
    }
  });
  it('lists the assets a classroom needs', () => {
    expect(KIT_ASSETS(['spike', 'drones'])).toEqual(expect.arrayContaining(['equip-rover-spike', 'equip-laptop', 'equip-drone']));
  });
});
