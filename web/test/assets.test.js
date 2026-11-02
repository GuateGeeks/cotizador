import { describe, expect, it } from 'vitest';
import { clearAssets, clipNamed, loadAsset } from '../src/world/assets.js';

describe('loadAsset', () => {
  it('rejects a failed fetch without poisoning a later retry', async () => {
    let calls = 0;
    const real = globalThis.fetch;
    globalThis.fetch = async () => { calls += 1; throw new Error('offline'); };
    await expect(loadAsset('missing', 'http://127.0.0.1:9/')).rejects.toThrow();
    await expect(loadAsset('missing', 'http://127.0.0.1:9/')).rejects.toThrow();
    globalThis.fetch = real;
    clearAssets();
    expect(calls).toBe(2);
  });
});

describe('clipNamed', () => {
  const idle = { name: 'idle' }, walk = { name: 'walk' };
  it('finds the named clip', () => {
    expect(clipNamed([idle, walk], 'walk')).toBe(walk);
  });
  it('falls back to idle for a character exported before the clip existed', () => {
    expect(clipNamed([walk, idle], 'vr')).toBe(idle);
  });
  it('falls back to the first clip when there is no idle either', () => {
    expect(clipNamed([walk], 'vr')).toBe(walk);
  });
});
