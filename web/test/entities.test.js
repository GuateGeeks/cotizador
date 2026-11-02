import { describe, expect, it } from 'vitest';
import { diffEntities, signatureOf } from '../src/world/entities.js';

const module = (key, extra = {}) => ({ key, asset: 'a', x: 0, y: 0, z: 0, ...extra });

describe('diffEntities', () => {
  it('keeps identical modules, adds new ones and removes the rest', () => {
    const current = new Map([['a', { signature: signatureOf(module('a')) }], ['b', { signature: signatureOf(module('b')) }]]);
    const diff = diffEntities(current, [module('a'), module('c')]);
    expect(diff.keep.map(m => m.key)).toEqual(['a']);
    expect(diff.add.map(m => m.key)).toEqual(['c']);
    expect(diff.remove).toEqual(['b']);
  });
  it('replaces a module whose asset or population changed', () => {
    const current = new Map([['a', { signature: signatureOf(module('a', { population: 1 })) }]]);
    const diff = diffEntities(current, [module('a', { population: 2 })]);
    expect(diff.remove).toEqual(['a']);
    expect(diff.add.map(m => m.key)).toEqual(['a']);
  });
});
