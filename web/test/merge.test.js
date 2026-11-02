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
