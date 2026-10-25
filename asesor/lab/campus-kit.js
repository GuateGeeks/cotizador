/**
 * Faceted construction kit for the campus. Every entity is authored as
 * vertex-coloured, flat-shaded primitives attached to named bones, then merged
 * into one skinned mesh per render layer. One draw call can therefore carry a
 * whole classroom, its furniture and its articulated people.
 *
 * Primitive vocabulary and the closed-solid rules follow the CC0 kit in
 * 3d-assets/creation-lab/benchmarks/school-flat-20261023/spec/kit.py
 * (box, frustum, cone, blob, prism, merge-by-material), rewritten for Three.js
 * with Y up, vertex colours and bones.
 */
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, Matrix4, Vector3,
  Quaternion, Euler, Bone, Skeleton, SkinnedMesh, Group, Color,
  BoxGeometry, CylinderGeometry, IcosahedronGeometry, OctahedronGeometry, TorusGeometry
} from 'three';

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
/** 0→1 progress of t inside [a, b], eased. */
export const span = (t, a, b) => smooth((t - a) / (b - a));
export const backOut = t => { t = clamp(t); const s = 1.9; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
/** Deterministic hash in [0, 1). */
export function hash(...values) {
  let h = 2166136261;
  for (const value of values) {
    const s = String(value);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
export const pick = (list, ...seed) => list[Math.floor(hash(...seed) * list.length) % list.length];

// Storyboard palette: violet island, ivory frames, purple roofs, orange access,
// turquoise circulation. Technology colours follow the real catalog products.
export const PAL = {
  lawn: '#A68BDC', lawn2: '#9A7DD3', lawn3: '#B39AE3', cliff: '#7650B8', cliff2: '#5F3E9E', cliff3: '#4A2F84',
  paving: '#F1E5D3', paving2: '#E6D7C1', path: '#FBF3E6', turquoise: '#25C2C6', turquoiseDark: '#169A9F',
  frame: '#FFF8EF', wall: '#FBE8D0', wallShade: '#EBD3B7', roof: '#6C45AE', roofLight: '#8159C4', fascia: '#FFF8EF',
  orange: '#FF8B22', orangeLight: '#FFAE52', wood: '#E7AC6A', woodDark: '#B77B48', floor: '#F6E4CB',
  ink: '#2B2142', inkSoft: '#4A3F63', grey: '#8D90A6', greyLight: '#D3D5E0', white: '#FFFFFF', black: '#1C1726',
  leaf: '#7CCB6B', leaf2: '#56B366', leaf3: '#3E9A5E', lime: '#B8DD5E', pine: '#2F8A63', trunk: '#7A5136',
  bloom: '#FFD23F', blossom: '#FF8FB1', soil: '#8C5E3E', water: '#5CC7E8', sky: '#BDEBFF',
  board: '#2E5E4E', screen: '#9FF4FF', glass: '#A6E7EE', red: '#F2545B', green: '#3BB273', blue: '#3A7BE0',
  yellow: '#FFD23F', magenta: '#E83E8C', teal: '#2EC4E6', lilac: '#C9B2F2', cream: '#FFF3DD', navy: '#2F3A6E', plum: '#5B3B8C'
};
export const LEVEL_COLOR = { pre: '#F9C36A', prim: '#19BCCD', bas: '#FF8B22', bach: '#8DB442' };
export const PROGRAM_COLOR = { tale: '#FFC857', master: '#9BD34C', spike: '#E83E8C', electronics: '#3A7BE0', drones: '#FF8B22', immersive: '#B58CFF' };

const colorCache = new Map();
export function col(hex) {
  let c = colorCache.get(hex);
  if (!c) { c = new Color(hex); colorCache.set(hex, c); }
  return c;
}

// Template primitives: three.js geometries already carry correct winding.
const templates = new Map();
function template(key, make) {
  let entry = templates.get(key);
  if (!entry) {
    let geometry = make();
    if (geometry.index) { const flat = geometry.toNonIndexed(); geometry.dispose(); geometry = flat; }
    const array = Float32Array.from(geometry.getAttribute('position').array);
    geometry.dispose();
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < array.length; i += 3) { minY = Math.min(minY, array[i]); maxY = Math.max(maxY, array[i]); }
    entry = { array, minY, maxY };
    templates.set(key, entry);
  }
  return entry;
}

function chamferArray(bevel) {
  // Unit cube (-.5….5) with cut edges and corners: 44 outward triangles.
  const h = .5, b = Math.min(.45, bevel);
  const P = (sx, sy, sz, axis) => axis === 0 ? [sx * h, sy * (h - b), sz * (h - b)] : axis === 1 ? [sx * (h - b), sy * h, sz * (h - b)] : [sx * (h - b), sy * (h - b), sz * h];
  const tris = [];
  const add = (a, c, d) => tris.push(a, c, d);
  const quad = (a, c, d, e) => { add(a, c, d); add(a, d, e); };
  const S = [-1, 1];
  for (const s of S) {
    quad(P(s, -1, -1, 0), P(s, 1, -1, 0), P(s, 1, 1, 0), P(s, -1, 1, 0));
    quad(P(-1, s, -1, 1), P(1, s, -1, 1), P(1, s, 1, 1), P(-1, s, 1, 1));
    quad(P(-1, -1, s, 2), P(1, -1, s, 2), P(1, 1, s, 2), P(-1, 1, s, 2));
  }
  for (const a of S) for (const c of S) {
    quad(P(a, c, -1, 0), P(a, c, -1, 1), P(a, c, 1, 1), P(a, c, 1, 0));
    quad(P(a, -1, c, 0), P(a, -1, c, 2), P(a, 1, c, 2), P(a, 1, c, 0));
    quad(P(-1, a, c, 1), P(-1, a, c, 2), P(1, a, c, 2), P(1, a, c, 1));
  }
  for (const x of S) for (const y of S) for (const z of S) add(P(x, y, z, 0), P(x, y, z, 1), P(x, y, z, 2));
  // Orient each convex face away from the centre.
  const out = [];
  for (let i = 0; i < tris.length; i += 3) {
    const [p, q, r] = [tris[i], tris[i + 1], tris[i + 2]];
    const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], w = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const m = [(p[0] + q[0] + r[0]), (p[1] + q[1] + r[1]), (p[2] + q[2] + r[2])];
    if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) out.push(...p, ...r, ...q); else out.push(...p, ...q, ...r);
  }
  return out;
}

function cross(a, b, c) {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
}

/** Bone hierarchy authored in bind pose. */
export class Rig {
  constructor() { this.bones = []; this.byName = new Map(); this.root = this.add('root', null, 0, 0, 0); }
  add(name, parent, x = 0, y = 0, z = 0) {
    const bone = new Bone();
    bone.name = name;
    bone.position.set(x, y, z);
    const owner = parent == null ? null : typeof parent === 'string' ? this.byName.get(parent) : parent;
    if (parent != null && !owner) throw new Error('Unknown bone parent ' + parent);
    owner?.add(bone);
    bone.userData.index = this.bones.length;
    bone.userData.rest = { position: bone.position.clone(), quaternion: bone.quaternion.clone() };
    this.bones.push(bone); this.byName.set(name, bone);
    return bone;
  }
  get(name) { return this.byName.get(name); }
  has(name) { return this.byName.has(name); }
}

const LAYERS = ['solid', 'soft', 'glow', 'glass', 'blob'];

/**
 * Geometry builder. Coordinates are local to the active bone in bind pose and
 * to the active transform stack. `finish()` returns a Group with one mesh per
 * populated layer, sharing one skeleton.
 */
export function createBuilder(rig = new Rig()) {
  const data = Object.fromEntries(LAYERS.map(name => [name, { pos: [], col: [], bone: [] }]));
  const stack = [new Matrix4()];
  const boneMatrix = new Matrix4(), work = new Matrix4(), local = new Matrix4();
  const v = new Vector3(), q = new Quaternion(), e = new Euler(), s = new Vector3(), t = new Vector3();
  let bone = rig.root, layer = 'solid', base = 'solid', shadeLow = .84;
  rig.root.updateWorldMatrix(true, true);

  function useBone(target) {
    bone = typeof target === 'string' ? rig.get(target) : target;
    if (!bone) throw new Error('Unknown bone ' + target);
    bone.updateWorldMatrix(true, false);
    boneMatrix.copy(bone.matrixWorld);
    return api;
  }
  function compose(x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    return local.compose(t.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz, 'YXZ')), s.set(sx, sy, sz));
  }
  function emit(entry, matrix, hex, alphaCenter = null) {
    const target = data[layer], c = col(hex), index = bone.userData.index;
    work.multiplyMatrices(boneMatrix, stack[stack.length - 1]).multiply(matrix);
    const { array, minY, maxY } = entry, range = maxY - minY;
    for (let i = 0; i < array.length; i += 3) {
      const k = range > 1e-6 ? shadeLow + (1 - shadeLow) * (array[i + 1] - minY) / range : 1;
      v.set(array[i], array[i + 1], array[i + 2]).applyMatrix4(work);
      target.pos.push(v.x, v.y, v.z);
      if (layer === 'blob') target.col.push(c.r, c.g, c.b, alphaCenter == null ? 1 : (Math.hypot(array[i], array[i + 2]) < 1e-4 ? alphaCenter : 0));
      else target.col.push(c.r * k, c.g * k, c.b * k);
      target.bone.push(index);
    }
    return api;
  }
  const api = {
    rig,
    bone: useBone,
    /** 'main' returns to the base layer: shadow-casting structure or soft props. */
    layer(name) { if (name === 'main') name = base; if (!LAYERS.includes(name)) throw new Error('Unknown layer ' + name); layer = name; return api; },
    base(name) { base = name; layer = name; return api; },
    shade(value = .84) { shadeLow = value; return api; },
    /** Push a transform: translate, yaw/pitch/roll (radians), uniform or xyz scale. */
    push(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
      stack.push(stack[stack.length - 1].clone().multiply(compose(x, y, z, ry, rx, rz, sx, sy, sz).clone()));
      return api;
    },
    pop() { if (stack.length > 1) stack.pop(); return api; },
    at(x, y, z, ry, draw) { api.push(x, y, z, ry || 0); draw(); api.pop(); return api; },
    /** Centered box. */
    box(x, y, z, w, h, d, hex, ry = 0) { return emit(template('box', () => new BoxGeometry(1, 1, 1)), compose(x, y, z, ry, 0, 0, w, h, d), hex); },
    /** Box resting on y0. Its hidden bottom face is omitted (camera is always above). */
    block(x, y0, z, w, h, d, hex, ry = 0) {
      return emit(template('block', () => {
        const g = new BoxGeometry(1, 1, 1).toNonIndexed(), src = g.getAttribute('position').array, keep = [];
        // BoxGeometry face order: +x, -x, +y, -y, +z, -z (6 vertices each when non-indexed).
        for (let i = 0; i < src.length; i += 18) if (i / 18 !== 3) keep.push(...src.slice(i, i + 18));
        g.setAttribute('position', new Float32BufferAttribute(keep, 3));
        return g;
      }), compose(x, y0 + h / 2, z, ry, 0, 0, w, h, d), hex);
    },
    /** Flat decal: only the top face (two triangles), for mats, lines and inlays. */
    tile(x, y, z, w, d, hex, ry = 0) {
      const hw = w / 2, hd = d / 2, c = Math.cos(ry), s = Math.sin(ry);
      const p = (u, v) => [x + u * c + v * s, y, z - u * s + v * c];
      return api.face(p(-hw, -hd), p(hw, -hd), p(hw, hd), hex, [0, 1, 0]).face(p(-hw, -hd), p(hw, hd), p(-hw, hd), hex, [0, 1, 0]);
    },
    /** Chamfered box: soft toy-like silhouettes for heads, robots, cushions. */
    soft(x, y, z, w, h, d, hex, bevel = .22, ry = 0) {
      const key = 'cbox:' + bevel.toFixed(3);
      return emit(template(key, () => { const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(chamferArray(bevel), 3)); return g; }), compose(x, y, z, ry, 0, 0, w, h, d), hex);
    },
    /** Frustum/cylinder/cone standing on y0. */
    cyl(x, y0, z, rBottom, rTop, h, hex, seg = 8, open = false, ry = 0) {
      const ratio = rBottom > 0 ? rTop / rBottom : 1;
      const key = `cyl:${seg}:${ratio.toFixed(3)}:${open}`;
      const base = rBottom > 0 ? rBottom : rTop;
      return emit(template(key, () => new CylinderGeometry(ratio, rBottom > 0 ? 1 : 0, 1, seg, 1, open)), compose(x, y0 + h / 2, z, ry, 0, 0, base, h, base), hex);
    },
    /** Horizontal cylinder along X (wheels, rolls, pipes). */
    wheel(x, y, z, r, width, hex, seg = 8, ry = 0) {
      return emit(template(`cyl:${seg}:1.000:false`, () => new CylinderGeometry(1, 1, 1, seg, 1, false)), compose(x, y, z, ry, 0, Math.PI / 2, r, width, r), hex);
    },
    cone(x, y0, z, r, h, hex, seg = 7, ry = 0) { return api.cyl(x, y0, z, r, 0, h, hex, seg, false, ry); },
    /** Low-poly blob; detail 0 = 20 faces, 1 = 80 faces. */
    ball(x, y, z, rx, ry = rx, rz = rx, hex = PAL.white, detail = 0, yaw = 0) {
      return emit(template('ico:' + detail, () => new IcosahedronGeometry(1, detail)), compose(x, y, z, yaw, 0, 0, rx, ry, rz), hex);
    },
    gem(x, y, z, rx, ry = rx, rz = rx, hex = PAL.white) { return emit(template('oct', () => new OctahedronGeometry(1, 0)), compose(x, y, z, 0, 0, 0, rx, ry, rz), hex); },
    /** Torus in the XY plane; rx/ry rotate it. */
    ring(x, y, z, radius, tube, hex, seg = 16, tubeSeg = 4, ry = 0, rx = 0) {
      return emit(template(`torus:${seg}:${tubeSeg}:${(tube / radius).toFixed(3)}`, () => new TorusGeometry(1, tube / radius, tubeSeg, seg)), compose(x, y, z, ry, rx, 0, radius, radius, radius), hex);
    },
    /** Raw triangle (counter-clockwise seen from outside). */
    tri(a, b, c, hex) {
      const target = data[layer], color = col(hex), index = bone.userData.index;
      work.multiplyMatrices(boneMatrix, stack[stack.length - 1]);
      for (const p of [a, b, c]) {
        v.set(p[0], p[1], p[2]).applyMatrix4(work);
        target.pos.push(v.x, v.y, v.z);
        if (layer === 'blob') target.col.push(color.r, color.g, color.b, 1); else target.col.push(color.r, color.g, color.b);
        target.bone.push(index);
      }
      return api;
    },
    quad(a, b, c, d, hex) { api.tri(a, b, c, hex); return api.tri(a, c, d, hex); },
    /** Triangle oriented so its normal points along `toward` ([x,y,z]). */
    face(a, b, c, hex, toward) {
      const n = cross(a, b, c);
      return n[0] * toward[0] + n[1] * toward[1] + n[2] * toward[2] >= 0 ? api.tri(a, b, c, hex) : api.tri(a, c, b, hex);
    },
    /** Extruded star-shaped polygon [[x,z]…] from y0 to y0+h (top and sides). */
    slab(points, y0, h, hex, sideHex = hex) {
      const n = points.length;
      let cx = 0, cz = 0; for (const [x, z] of points) { cx += x; cz += z; } cx /= n; cz /= n;
      for (let i = 0; i < n; i++) {
        const [x1, z1] = points[i], [x2, z2] = points[(i + 1) % n];
        api.face([cx, y0 + h, cz], [x1, y0 + h, z1], [x2, y0 + h, z2], hex, [0, 1, 0]);
        const out = [(x1 + x2) / 2 - cx, 0, (z1 + z2) / 2 - cz];
        api.face([x1, y0, z1], [x1, y0 + h, z1], [x2, y0 + h, z2], sideHex, out);
        api.face([x1, y0, z1], [x2, y0 + h, z2], [x2, y0, z2], sideHex, out);
      }
      return api;
    },
    /** Soft contact shadow disc on the blob layer. */
    blob(x, y, z, rx, rz = rx, opacity = .26) {
      const previous = layer; layer = 'blob';
      const seg = 7, target = data.blob, index = bone.userData.index, ink = col('#24123F');
      work.multiplyMatrices(boneMatrix, stack[stack.length - 1]);
      const ring = [];
      for (let i = 0; i < seg; i++) { const a = i / seg * TAU; ring.push([x + Math.cos(a) * rx, y, z + Math.sin(a) * rz]); }
      for (let i = 0; i < seg; i++) {
        for (const [p, alpha] of [[[x, y, z], opacity], [ring[(i + 1) % seg], 0], [ring[i], 0]]) {
          v.set(p[0], p[1], p[2]).applyMatrix4(work);
          target.pos.push(v.x, v.y, v.z); target.col.push(ink.r, ink.g, ink.b, alpha); target.bone.push(index);
        }
      }
      layer = previous;
      return api;
    },
    triangleCount() { return LAYERS.reduce((n, name) => n + data[name].pos.length / 9, 0); },
    /** Build meshes. materials: { solid, soft, glow, glass, blob }. */
    finish(materials, { castShadow = true } = {}) {
      const group = new Group();
      rig.root.updateMatrixWorld(true);
      const skeleton = new Skeleton(rig.bones);
      group.add(rig.root);
      const identity = new Matrix4();
      for (const name of LAYERS) {
        const layerData = data[name];
        if (!layerData.pos.length) continue;
        const geometry = new BufferGeometry();
        const count = layerData.pos.length / 3;
        geometry.setAttribute('position', new Float32BufferAttribute(layerData.pos, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(layerData.col, name === 'blob' ? 4 : 3));
        const skinIndex = new Uint16Array(count * 4), skinWeight = new Float32Array(count * 4);
        for (let i = 0; i < count; i++) { skinIndex[i * 4] = layerData.bone[i]; skinWeight[i * 4] = 1; }
        geometry.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndex, 4));
        geometry.setAttribute('skinWeight', new Float32BufferAttribute(skinWeight, 4));
        // Flat shading derives facet normals per pixel, so identical corners
        // (position, colour, bone) can be shared: same triangles, far fewer vertices.
        const welded = mergeVertices(geometry, 1e-4);
        geometry.dispose();
        welded.computeVertexNormals();
        const mesh = new SkinnedMesh(welded, materials[name]);
        mesh.name = name;
        mesh.bind(skeleton, identity);
        mesh.frustumCulled = false; // bones travel; a cached bind sphere would cull walkers.
        mesh.castShadow = castShadow && name === 'solid';
        if (mesh.castShadow && materials.depth) mesh.customDepthMaterial = materials.depth;
        mesh.receiveShadow = name === 'solid' || name === 'soft';
        if (name === 'blob' || name === 'glass') mesh.renderOrder = name === 'blob' ? 1 : 2;
        group.add(mesh);
      }
      group.userData.skeleton = skeleton;
      group.userData.rig = rig;
      group.userData.triangles = api.triangleCount();
      return group;
    }
  };
  return api;
}

/**
 * Every vertex here follows exactly one bone. three.js skins with four
 * influences (16 bone-texture fetches per vertex); this patch fetches one.
 * Measured with the maximal campus; see docs/campus-3d.md.
 */
const RIGID_BASE = `#ifdef USE_SKINNING
  mat4 boneMatX = getBoneMatrix( skinIndex.x );
#endif`;
const RIGID_SKIN = `#ifdef USE_SKINNING
  transformed = ( bindMatrixInverse * ( boneMatX * ( bindMatrix * vec4( transformed, 1.0 ) ) ) ).xyz;
#endif`;
const RIGID_NORMAL = `#ifdef USE_SKINNING
  mat4 skinMatrix = bindMatrixInverse * boneMatX * bindMatrix;
  objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
#endif`;
export function rigidSkinning(material) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <skinbase_vertex>', RIGID_BASE)
      .replace('#include <skinnormal_vertex>', RIGID_NORMAL)
      .replace('#include <skinning_vertex>', RIGID_SKIN);
  };
  material.customProgramCacheKey = () => 'campus-rigid-skin';
  return material;
}

export function releaseEntityGroup(group) {
  group.traverse(object => { if (object.isMesh) object.geometry.dispose(); });
  group.userData.skeleton?.dispose();
  group.removeFromParent();
}
