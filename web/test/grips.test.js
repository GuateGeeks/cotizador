import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GRIPS } from '../src/world/gear.js';
import { CHARACTERS, HELD, gripScale, placeItem, solveGrips } from '../tools/grip-solver.js';

const root = new URL('../../', import.meta.url);
const manifest = id => JSON.parse(readFileSync(new URL(`assets/manifests/${id}.json`, root)));
const glb = id => new URL(`web/public/models/${id}.glb`, root);
// The character GLBs come from git-ignored Meshy sources; a clone without them skips these checks.
const present = CHARACTERS.every(id => existsSync(glb(id)));
const bodies = present ? CHARACTERS.map(id => ({ id, manifest: manifest(id), scale: gripScale(readFileSync(glb(id))) })) : [];
const items = Object.fromEntries(Object.keys(HELD).map(id => [id, manifest(id)]));

describe.skipIf(!present)('held item grips', () => {
  it('match what the solver derives from the characters', () => {
    const solved = solveGrips(bodies, items);
    for (const [id, grip] of Object.entries(solved)) {
      for (const side of grip.l ? ['l', 'r'] : [null]) {
        const want = side ? grip[side] : grip, have = side ? GRIPS[id][side] : GRIPS[id];
        for (const key of ['position', 'rotation']) want[key].forEach((v, i) => expect(have[key][i], `${id} ${side ?? ''} ${key}`).toBeCloseTo(v, 2));
      }
    }
  });

  it('places every held item in the hands on every character height', () => {
    for (const body of bodies) {
      const h = body.manifest.size_m[1];
      for (const [id, { clip, side }] of Object.entries(HELD)) {
        for (const sample of body.manifest.hand_poses[clip]) {
          const at = placeItem(body, sample, id, side ?? 'l', GRIPS, items[id]);
          const where = `${body.id} ${id} frame ${sample.frame}`;
          if (clip === 'hold') {
            expect(at.between, where).toBeLessThanOrEqual(.06 * h);
            expect(at.above, where).toBeGreaterThanOrEqual(-.01);
            expect(at.up, where).toBeGreaterThanOrEqual(.9);
          } else for (const s of ['l', 'r']) expect(placeItem(body, sample, id, s, GRIPS, items[id]).up, `${where} ${s}`).toBeGreaterThanOrEqual(.7);
        }
      }
    }
  });
});
