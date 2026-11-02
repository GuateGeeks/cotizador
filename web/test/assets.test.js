import { describe, expect, it } from 'vitest';
import { clearAssets, loadAsset } from '../src/world/assets.js';

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
