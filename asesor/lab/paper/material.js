/**
 * Paper materials. Matte cardstock: metalness 0, roughness ~0.92, flat facets,
 * vertex colours (sRGB hex converted to linear by three.Color). A procedural
 * fibre modulates the diffuse colour by a few percent and fades out with screen
 * derivatives, so it is visible in close-ups and never shimmers in the overview.
 * No UVs and no textures: nothing to colour-manage beyond the vertex colours.
 */
import { MeshStandardMaterial, MeshBasicMaterial, MeshDepthMaterial } from 'three';
import { rigidSkinning } from '../campus-kit.js';

const FIBRE = /* glsl */`
varying vec3 vPaperPos;
float paperHash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float paperNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(paperHash(i), paperHash(i + vec3(1, 0, 0)), f.x), mix(paperHash(i + vec3(0, 1, 0)), paperHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(paperHash(i + vec3(0, 0, 1)), paperHash(i + vec3(1, 0, 1)), f.x), mix(paperHash(i + vec3(0, 1, 1)), paperHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float paperFibre(vec3 p) {
  const float FREQ = 150.0;
  float footprint = length(fwidth(p)) * FREQ;
  float amp = PAPER_FIBRE * (1.0 - smoothstep(.35, 1.1, footprint));
  float grain = paperNoise(p * FREQ) * .6 + paperNoise(p * FREQ * 2.7 + 7.1) * .4;
  float strand = paperNoise(vec3(p.x * FREQ * 3.2, p.y * FREQ * .55, p.z * FREQ * 3.2));
  float mottle = paperNoise(p * 5.0) - .5;
  return 1.0 + amp * ((grain - .5) * 1.3 + (strand - .5) * .9) + PAPER_MOTTLE * mottle;
}
`;

/**
 * Cardstock material for skinned campus meshes.
 * fibre: diffuse amplitude in close-ups (0.04 ≈ ±4 %); mottle: broad unevenness.
 */
export function paperMaterial({ fibre = .045, mottle = .025, ...params } = {}) {
  const material = rigidSkinning(new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .92, metalness: 0, ...params }));
  const rigid = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    rigid(shader, renderer);
    shader.vertexShader = 'varying vec3 vPaperPos;\n' + shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n  vPaperPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    shader.fragmentShader = `#define PAPER_FIBRE ${fibre.toFixed(4)}\n#define PAPER_MOTTLE ${mottle.toFixed(4)}\n` + FIBRE +
      shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= paperFibre( vPaperPos );');
  };
  material.customProgramCacheKey = () => `paper-fibre-${fibre}-${mottle}`;
  return material;
}

/**
 * The full material set for the builder layers. Structure and props share one
 * cardstock material; glass is a matte tinted acetate, not a reflective pane.
 */
export function paperMaterials() {
  const card = paperMaterial();
  const set = {
    solid: card, soft: card,
    glow: rigidSkinning(new MeshBasicMaterial({ vertexColors: true, toneMapped: false })),
    glass: rigidSkinning(new MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: .38, roughness: .75, metalness: 0, depthWrite: false })),
    blob: rigidSkinning(new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })),
    depth: rigidSkinning(new MeshDepthMaterial())
  };
  return set;
}
