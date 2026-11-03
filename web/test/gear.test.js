import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { GRIPS, clearGear, gearMesh, vertexMerge, wearGear, wearItem } from '../src/world/gear.js';
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

  it('places each item with its own grip, per side when the item has one', () => {
    const body = rig(['vr_grip_l', 'vr_grip_r']);
    wearItem(body, kit, 'vr_grip_l', 'equip-vr-controller');
    wearItem(body, kit, 'vr_grip_r', 'equip-vr-controller');
    for (const side of ['l', 'r']) {
      const mesh = body.getObjectByName(`vr_grip_${side}`).children[0];
      const grip = GRIPS['equip-vr-controller'][side] ?? GRIPS['equip-vr-controller'];
      expect(mesh.userData.gear).toBe('equip-vr-controller');
      expect(mesh.rotation.toArray().slice(0, 3)).toEqual(grip.rotation);
      expect(mesh.position.toArray()).toEqual(grip.position);
    }
  });

  it('has a grip for every item a character holds or wears', () => {
    for (const id of ['equip-vr-headset', 'equip-vr-controller', 'equip-drone-remote', 'equip-tablet']) expect(GRIPS[id], id).toBeTruthy();
  });

  it('merges a drone body into one mesh and leaves its rotors to spin', () => {
    const root = new Group();
    root.add(new Mesh(new BoxGeometry(1, 1, 1), red));
    const rotor = Object.assign(new Group(), { name: 'rotor_1' });
    rotor.add(new Mesh(new BoxGeometry(.2, .02, .2), blue));
    root.add(rotor);
    const body = vertexMerge(root, node => /^rotor_/.test(node.name));
    expect(body.material.vertexColors).toBe(true);
    expect(body.geometry.getAttribute('position').count).toBe(new BoxGeometry(1, 1, 1).toNonIndexed().getAttribute('position').count);
    expect(body.castShadow).toBe(true);
    expect(rotor.children[0].isMesh).toBe(true);
  });

  it('skips a character exported before the fitting points existed', () => {
    expect(() => wearGear(rig([]), kit, { controllers: true })).not.toThrow();
    expect(wearGear(rig([]), kit, { controllers: true })).toBe(0);
  });
});
