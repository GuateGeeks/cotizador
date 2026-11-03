import { describe, expect, it } from 'vitest';
import { HIDES_INSIDE, OWN_WALLS, wallVeils, xrayBlockers, xrayKey } from '../src/world/room-xray.js';

const room = { key: 'room:prim:0', type: 'room', x: 0, y: 0, z: 0 };
const m = (key, type, x, y, z) => ({ key, type, x, y, z });

describe('room x-ray', () => {
  it('veils what stands above the room, and hides nothing above', () => {
    const map = xrayBlockers(room, [room, m('upper:prim:0', 'room', 0, 3.2, 0), m('roof:1:2', 'roof', 0, 6.4, 0)], -.54);
    expect(map.get('upper:prim:0')).toBe('veil');
    expect(map.get('roof:1:2')).toBe('veil');
  });
  it('hides buildings and veils links between the camera and the room', () => {
    const map = xrayBlockers(room, [room, m('room:x', 'room', 0, 0, 5), m('balcony:x', 'balcony', 0, 3.2, 3), m('room:behind', 'room', 0, 0, -6), m('room:side', 'room', 9, 0, 3)], 0);
    expect(map.get('room:x')).toBe('hide');
    expect(map.get('balcony:x')).toBe('veil');
    expect(map.has('room:behind')).toBe(false);
    expect(map.has('room:side')).toBe(false);
  });
  it('veils trees between at any height, and never the room itself', () => {
    const map = xrayBlockers(room, [room, m('tree:0', 'tree', 0, -1, 4)], 0);
    expect(map.get('tree:0')).toBe('veil');
    expect(map.has(room.key)).toBe(false);
  });
  it('leaves floors below the room alone', () => {
    expect(xrayBlockers({ ...room, y: 3.2 }, [m('room:below', 'room', 0, 0, 4)], 0).has('room:below')).toBe(false);
  });
  it('veils the walls that face the camera', () => {
    expect(wallVeils(0)).toEqual({ front: true, back: false, left: false, right: false });
    expect(wallVeils(Math.PI)).toEqual({ front: false, back: true, left: false, right: false });
    expect(wallVeils(-Math.PI / 2)).toEqual({ front: false, back: false, left: true, right: false });
    expect(wallVeils(-.54)).toEqual({ front: true, back: false, left: true, right: false });
  });
  it('names the shell parts and the types whose contents hide', () => {
    expect(OWN_WALLS.always).toEqual(['header', 'sill']);
    expect(OWN_WALLS.front).toEqual(['pier_front']);
    expect([...HIDES_INSIDE].sort()).toEqual(['roof', 'room']);
  });
  it('keys an x-ray by what it changes, so small turns that change nothing keep it', () => {
    const modules = [room, m('upper:prim:0', 'room', 0, 3.2, 0)];
    expect(xrayKey(room, modules, -.54)).toBe(xrayKey(room, modules, -.6));
    expect(xrayKey(room, modules, -.54)).not.toBe(xrayKey(room, modules, Math.PI));
  });
});
