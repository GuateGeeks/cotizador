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

describe('signatureOf', () => {
  it('rebuilds a classroom when its programs change, and only then', () => {
    const room = { key: 'room:prim:0', asset: 'arch-classroom-standard', x: 0, y: 0, z: 0, rot: 0, population: 2, programs: ['master'] };
    expect(signatureOf(room)).not.toBe(signatureOf({ ...room, programs: ['master', 'electronics'] }));
    expect(signatureOf(room)).toBe(signatureOf({ ...room, programs: ['master'] }));
  });
});
