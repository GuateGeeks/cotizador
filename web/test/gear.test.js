import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { clearGear, gearMesh, wearGear, wearItem } from '../src/world/gear.js';
import { mergeStatic } from '../src/world/merge.js';

const red = new MeshStandardMaterial({ name: 'R', color: 0xff0000 }), blue = new MeshStandardMaterial({ name: 'B', color: 0x0000ff });

function asset(id, parts) {
  const scene = new Group();
  for (const [x, material] of parts) {
    const mesh = new Mesh(new BoxGeometry(.1, .1, .1), material);
    mesh.position.x = x;
    scene.add(mesh);
  }
  return { id, scene };
}

function rig(names) {
  const body = new Group();
  for (const name of names) body.add(Object.assign(new Object3D(), { name }));
  return body;
}

const kit = new Map([['equip-vr-headset', asset('equip-vr-headset', [[0, red], [.1, blue]])], ['equip-vr-controller', asset('equip-vr-controller', [[0, blue]])]]);

describe('VR gear', () => {
  afterEach(() => clearGear());

  it('merges an asset into one vertex-coloured mesh that stays out of merging and shadows', () => {
    const mesh = gearMesh(asset('equip-vr-headset', [[0, red], [1, blue]]));
    expect(mesh.material.vertexColors).toBe(true);
    expect(mesh.geometry.getAttribute('color').count).toBe(mesh.geometry.getAttribute('position').count);
    expect(mesh.castShadow).toBe(false);
    expect(mesh.userData.separate).toBe(true);
  });

  it('keeps each part in its own colour', () => {
    const colours = gearMesh(asset('equip-vr-headset', [[0, red], [1, blue]])).geometry.getAttribute('color');
    expect(colours.getX(0)).toBeGreaterThan(.9);
    expect(colours.getZ(colours.count - 1)).toBeGreaterThan(.9);
  });

  it('shares geometry between wearers', () => {
    const a = asset('equip-vr-headset', [[0, red]]);
    expect(gearMesh(a).geometry).toBe(gearMesh(a).geometry);
  });

  it('puts the headset on the eyes and controllers in the hands, and merging leaves them there', () => {
    const body = rig(['vr_eyes', 'vr_grip_l', 'vr_grip_r']);
    expect(wearGear(body, kit, { controllers: true })).toBe(3);
    const room = new Group();
    room.add(body);
    mergeStatic(room);
    for (const name of ['vr_eyes', 'vr_grip_l', 'vr_grip_r']) expect(body.getObjectByName(name).children).toHaveLength(1);
  });

  it('wears only the headset on a distance model', () => {
    expect(wearGear(rig(['vr_eyes', 'vr_grip_l', 'vr_grip_r']), kit, { controllers: false })).toBe(1);
  });

  it('puts one item on a named grip, and skips a character without it', () => {
    const tabletKit = new Map([['equip-tablet', asset('equip-tablet', [[0, red]])]]);
    expect(wearItem(rig(['vr_grip_l']), tabletKit, 'vr_grip_l', 'equip-tablet')).toBe(true);
    expect(wearItem(rig([]), tabletKit, 'vr_grip_l', 'equip-tablet')).toBe(false);
  });

  it('skips a character exported before the fitting points existed', () => {
    expect(() => wearGear(rig([]), kit, { controllers: true })).not.toThrow();
    expect(wearGear(rig([]), kit, { controllers: true })).toBe(0);
  });
});
