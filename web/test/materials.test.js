import { describe, expect, it } from 'vitest';
import spec from '../../world/materials.json';
import { materialFor } from '../src/world/materials.js';

describe('materialFor', () => {
  it('returns one shared instance per name', () => {
    expect(materialFor('GG_IvorySoft')).toBe(materialFor('GG_IvorySoft'));
  });
  it('keeps glass cheap: transparent, never transmissive', () => {
    const glass = materialFor('GG_GlassSoft');
    expect(glass.transparent).toBe(true);
    expect(glass.transmission ?? 0).toBe(0);
    expect(glass.opacity).toBeCloseTo(spec.GG_GlassSoft.alpha);
  });
  it('matches the shared contract', () => {
    for (const [name, value] of Object.entries(spec)) {
      const material = materialFor(name);
      expect(material.roughness).toBeCloseTo(value.roughness);
      expect(`#${material.color.getHexString()}`.toUpperCase()).toBe(value.color.toUpperCase());
      expect(material.metalness).toBe(0);
    }
  });
  it('gives kit robots one material coloured per vertex', () => {
    const kit = materialFor('GG_KitVertex');
    expect(kit.vertexColors).toBe(true);
    expect(materialFor('GG_IvorySoft').vertexColors).toBe(false);
  });
  it('rejects unknown names instead of drawing the wrong colour', () => {
    expect(materialFor('Material_0')).toBeNull();
  });
});
