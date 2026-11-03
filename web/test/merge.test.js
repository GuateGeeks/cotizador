import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { buildBatch, clearBatch, mergeStatic } from '../src/world/merge.js';

const a = new MeshStandardMaterial({ name: 'A' }), b = new MeshStandardMaterial({ name: 'B' });

describe('mergeStatic', () => {
  it('merges static meshes per material and keeps world placement', () => {
    const group = new Group();
    for (const [x, material] of [[0, a], [4, a], [8, b]]) {
      const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
      mesh.position.x = x;
      group.add(mesh);
    }
    mergeStatic(group);
    const meshes = group.children.filter(child => child.isMesh);
    expect(meshes).toHaveLength(2);
    const merged = meshes.find(mesh => mesh.material === a);
    merged.geometry.computeBoundingBox();
    expect(merged.geometry.boundingBox.max.x).toBeCloseTo(4.5);
  });
  it('leaves moving parts alone', () => {
    const group = new Group();
    const wheel = new Mesh(new BoxGeometry(1, 1, 1), a);
    wheel.name = 'wheel_l';
    group.add(wheel, new Mesh(new BoxGeometry(1, 1, 1), a));
    mergeStatic(group);
    expect(group.getObjectByName('wheel_l')).toBe(wheel);
  });
  it('leaves a part marked separate whole, with everything under it', () => {
    const group = new Group(), pivot = new Group();
    pivot.userData.separate = true;
    const arm = new Mesh(new BoxGeometry(1, 1, 1), a);
    pivot.add(arm);
    group.add(pivot, new Mesh(new BoxGeometry(1, 1, 1), a));
    mergeStatic(group);
    expect(arm.parent).toBe(pivot);
  });
});

describe('buildBatch', () => {
  it('draws one mesh per material, hides sources and restores them', () => {
    const parent = new Group();
    const meshes = [0, 4].map(x => { const mesh = new Mesh(new BoxGeometry(1, 1, 1).toNonIndexed(), a); mesh.position.x = x; parent.add(mesh); return mesh; });
    const state = buildBatch(meshes, parent);
    expect(state.batch).toHaveLength(1);
    expect(meshes.every(mesh => !mesh.visible)).toBe(true);
    clearBatch(state);
    expect(meshes.every(mesh => mesh.visible)).toBe(true);
    expect(parent.children).toHaveLength(2);
  });
});

describe('mergeStatic shadows', () => {
  it('can merge ground pieces without casting shadows', () => {
    const group = new Group();
    group.add(new Mesh(new BoxGeometry(1, 1, 1), a));
    mergeStatic(group, false);
    expect(group.children[0].castShadow).toBe(false);
  });
});

describe('mergeStatic groups', () => {
  it('leaves a separately merged group alone', () => {
    const group = new Group();
    const inside = new Group();
    inside.userData.separate = true;
    inside.add(new Mesh(new BoxGeometry(1, 1, 1), b));
    group.add(new Mesh(new BoxGeometry(1, 1, 1), a), inside);
    mergeStatic(inside, false);
    mergeStatic(group, true);
    expect(inside.children).toHaveLength(1);
    expect(inside.children[0].castShadow).toBe(false);
  });
});
