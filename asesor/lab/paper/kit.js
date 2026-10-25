/**
 * Papercraft kit. Thin cards with visible cut edges, folded sheets, glue tabs,
 * layered frames, faceted crowns and folded leaves, authored on top of the
 * campus builder (campus-kit.js): vertex colours, one bone per vertex, merged
 * per render layer. Geometry must read as cut, folded and assembled cardstock;
 * the fibre in material.js only accompanies it.
 *
 * Units follow campus-layout.js (FLOOR_HEIGHT 1.7, CELL 2.6). Y up, +Z faces the
 * default camera. See docs/papercraft/CONTRACT.md.
 */
import { IcosahedronGeometry } from 'three';
import { hash, TAU } from '../campus-kit.js';

/** Card thicknesses: structural sheet, fine sheet (props, people, leaves), board base. */
export const T = .03, t = .018, BOARD = .06;

/** Shared scale. A door, a table and a person keep these sizes at every campus size. */
export const SCALE = Object.freeze({
  floor: 1.7, slab: .12, cell: 2.6, roomDepth: 2.3,
  door: { w: .52, h: 1.08 }, window: { sill: .55, h: .62 },
  table: .36, seat: .22, bench: .24, rail: .42,
  person: { pre: .62, prim: .78, bas: .9, bach: .94, adult: .98 }
});

/**
 * Paper palette. Structure violet, ivory classrooms, orange access, turquoise
 * connections, greens only for vegetation. Extracted from DESIGN.md and the
 * papercraft reference (docs/papercraft/reference).
 */
export const PAPER = Object.freeze({
  background: '#F4F1F6',
  // Solid stage colour of the cotizador viewer (the inspector and its capture tools keep `background`).
  stage: '#CDBFE8',
  violet: '#6C45AE', violetLight: '#8159C4', violetDark: '#4B2C86', violetDeep: '#3A2470', ink: '#321853',
  ivory: '#FFF8EC', cream: '#FBE8D0', creamShade: '#EFDCC2', white: '#FBFAF7',
  paving: '#F3EAE6', paving2: '#E9DEDB', joint: '#DCCFCC',
  orange: '#FF9D38', orangeDark: '#E9811F', orangeLight: '#FFB664',
  turquoise: '#25C2C6', turquoiseLight: '#5FD3D9', turquoiseDark: '#169A9F', glass: '#BDEFF3',
  green: '#7CCB6B', green2: '#56B366', green3: '#3E9A5E', lime: '#A6D85A', moss: '#2F7F4F',
  trunk: '#8A5A3B', trunkDark: '#6E4529', soil: '#7A4E33',
  wood: '#F4EEE6', woodEdge: '#E4D8CB', chairOrange: '#F59A3C', chairTurquoise: '#3DBFD0', leg: '#3A2E5C',
  screen: '#5A3A9C', code: ['#FFB000', '#FFFFFF', '#5FD3D9', '#B79CF0'],
  navy: '#33438A', shirt: '#FBFAF7', uniform: '#6942A1', teacher: '#8FD3E6', teacherPants: '#34407A',
  hair: ['#2B2340', '#3A2E5C', '#2A1C18', '#3B2419'],
  skin: ['#F0B98A', '#E2A274', '#C9875A', '#A86A43', '#8A5235'],
  yellow: '#F6C83E', yellowDark: '#E0A92A', pink: '#F48FB1', red: '#E8505B', blue: '#3A7BE0', dark: '#2B2340',
  level: { pre: '#F9C36A', prim: '#19BCCD', bas: '#FF8B22', bach: '#8DB442' }
});

const EDGE_TO = [255, 248, 236];
const edgeCache = new Map();
/** Cut-edge tone: the face colour mixed toward ivory (`amount` 0–1). */
export function edgeTone(hex, amount = .3) {
  const key = hex + amount;
  let out = edgeCache.get(key);
  if (!out) {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
    out = '#' + c.map((v, i) => Math.round(v + (EDGE_TO[i] - v) * amount).toString(16).padStart(2, '0')).join('');
    edgeCache.set(key, out);
  }
  return out;
}
/** Darker or lighter variant (k < 1 darkens, k > 1 lightens toward white). */
export function shadeTone(hex, k) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
  const f = v => Math.round(k <= 1 ? v * k : v + (255 - v) * (k - 1));
  return '#' + c.map(v => Math.max(0, Math.min(255, f(v))).toString(16).padStart(2, '0')).join('');
}

const FACES = [
  ['x', 1, [1, 0, 0]], ['x', -1, [-1, 0, 0]], ['y', 1, [0, 1, 0]], ['y', -1, [0, -1, 0]], ['z', 1, [0, 0, 1]], ['z', -1, [0, 0, -1]]
];

let icoUnique = null;
function icosahedron() {
  if (icoUnique) return icoUnique;
  const g = new IcosahedronGeometry(1, 0), pos = g.getAttribute('position').array, verts = [], tris = [], index = new Map();
  for (let i = 0; i < pos.length; i += 3) {
    const key = pos.slice(i, i + 3).map(v => v.toFixed(4)).join(',');
    if (!index.has(key)) { index.set(key, verts.length); verts.push([pos[i], pos[i + 1], pos[i + 2]]); }
    tris.push(index.get(key));
  }
  g.dispose();
  icoUnique = { verts, tris };
  return icoUnique;
}

/**
 * Fold line: a thin lighter strip along edge a→c, lifted along `n` so it never
 * shares a plane with its face. Paper folds catch the light; this is what makes a
 * faceted solid read as folded cardstock instead of a low-poly solid.
 */
function creaseStrip(b, a, c, n, inward, width, hex) {
  const l = Math.hypot(n[0], n[1], n[2]) || 1, lift = .0025, w = width;
  const o = [n[0] / l * lift, n[1] / l * lift, n[2] / l * lift];
  const P = (q, k) => [q[0] + o[0] + inward[0] * k, q[1] + o[1] + inward[1] * k, q[2] + o[2] + inward[2] * k];
  const A = P(a, 0), C = P(c, 0), D = P(c, w), E = P(a, w);
  b.face(A, C, D, hex, n).face(A, D, E, hex, n);
}
function sub3(a, c) { return [a[0] - c[0], a[1] - c[1], a[2] - c[2]]; }
function cross3(u, w) { return [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; }
function unit(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
/** For each triangle, draw fold lines on its edges (inside the face, toward its centroid). */
function creaseTriangle(b, t3, hex, width, out) {
  const m = [(t3[0][0] + t3[1][0] + t3[2][0]) / 3, (t3[0][1] + t3[1][1] + t3[2][1]) / 3, (t3[0][2] + t3[1][2] + t3[2][2]) / 3];
  let n = cross3(sub3(t3[1], t3[0]), sub3(t3[2], t3[0]));
  if (n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0) n = n.map(v => -v);
  for (let i = 0; i < 3; i++) {
    const a = t3[i], c = t3[(i + 1) % 3], mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
    creaseStrip(b, a, c, n, unit(sub3(m, mid)), width, hex);
  }
}

/**
 * Wrap a campus builder with the paper vocabulary. Every method draws into the
 * builder's current bone, transform stack and layer, and returns the kit.
 */
export function paperKit(b) {
  const quad = (a, c, d, e, hex, n) => { b.face(a, c, d, hex, n); b.face(a, d, e, hex, n); };
  const tf = (o = {}) => b.push(o.x || 0, o.y || 0, o.z || 0, o.ry || 0, o.rx || 0, o.rz || 0);

  const p = {
    b, T, t, BOARD, SCALE, PAPER, edgeTone, shadeTone,

    /**
     * Centered card (box). The thinnest axis carries the face colour; the other
     * four faces are the cut edge, mixed toward ivory. Chunky boxes (no clearly
     * thin axis) get the face colour everywhere unless `thin` is given.
     * o: { ry, rx, rz, edge: amount | hex, thin: 'x'|'y'|'z'|null, omit: ['-y', ...], side: hex for non-thin faces }
     */
    card(x, y, z, w, h, d, hex, o = {}) {
      const size = { x: w, y: h, z: d }, axes = ['x', 'y', 'z'].sort((a, c) => size[a] - size[c]);
      const thin = o.thin !== undefined ? o.thin : size[axes[0]] < size[axes[1]] * .45 ? axes[0] : null;
      const edge = o.side || (typeof o.edge === 'string' ? o.edge : edgeTone(hex, o.edge ?? .3));
      const hw = w / 2, hh = h / 2, hd = d / 2, omit = o.omit || [];
      b.push(x, y, z, o.ry || 0, o.rx || 0, o.rz || 0);
      for (const [axis, sign, n] of FACES) {
        if (omit.includes((sign > 0 ? '+' : '-') + axis)) continue;
        const color = thin == null || axis === thin ? hex : edge;
        let c;
        if (axis === 'x') { const X = sign * hw; c = [[X, -hh, -hd], [X, hh, -hd], [X, hh, hd], [X, -hh, hd]]; }
        else if (axis === 'y') { const Y = sign * hh; c = [[-hw, Y, -hd], [hw, Y, -hd], [hw, Y, hd], [-hw, Y, hd]]; }
        else { const Z = sign * hd; c = [[-hw, -hh, Z], [hw, -hh, Z], [hw, hh, Z], [-hw, hh, Z]]; }
        quad(c[0], c[1], c[2], c[3], color, n);
      }
      b.pop();
      return p;
    },

    /** Card resting on y0 (its hidden underside omitted by default). */
    slab(x, y0, z, w, h, d, hex, o = {}) { return p.card(x, y0 + h / 2, z, w, h, d, hex, { omit: ['-y'], ...o }); },

    /**
     * Vertical sheet from (x0,z0) to (x1,z1), standing on y0, height h, thickness
     * `thick` centred on the line. o: { edge, omit, face2: hex for the back }.
     */
    wall(x0, z0, x1, z1, y0, h, thick, hex, o = {}) {
      const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0);
      return p.card((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, len, h, thick, hex, { ry, thin: 'z', omit: ['-y'], ...o });
    },

    /**
     * One sheet folded along a polyline. `points` are [x, y] in the local XY
     * plane; the sheet spans local Z from -width/2 to +width/2 and has thickness
     * `thick` toward the left side of the path (or the right with side: 'right').
     * Each joint is a crisp valley or mountain fold; no gaps between faces.
     * o: { x, y, z, ry, rx, rz, edge, inner: hex for the inside, ends: true, shade: [k per segment] }
     */
    fold(points, width, thick, hex, o = {}) {
      const n = points.length;
      if (n < 2) return p;
      const sign = o.side === 'right' ? -1 : 1, W = width / 2;
      const segN = [];
      for (let i = 0; i < n - 1; i++) {
        const dx = points[i + 1][0] - points[i][0], dy = points[i + 1][1] - points[i][1], l = Math.hypot(dx, dy) || 1;
        segN.push([-dy / l * sign, dx / l * sign]);
      }
      const inner = points.map((pt, i) => {
        const a = segN[Math.max(0, i - 1)], c = segN[Math.min(n - 2, i)];
        let mx = a[0] + c[0], my = a[1] + c[1];
        const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
        const k = Math.min(3, 1 / Math.max(.2, mx * a[0] + my * a[1]));
        return [pt[0] + mx * thick * k, pt[1] + my * thick * k];
      });
      const edge = typeof o.edge === 'string' ? o.edge : edgeTone(hex, o.edge ?? .3), back = o.inner || hex;
      tf(o);
      for (let i = 0; i < n - 1; i++) {
        const [nx, ny] = segN[i], a = points[i], c = points[i + 1], ia = inner[i], ic = inner[i + 1];
        const face = o.shade ? shadeTone(hex, o.shade[i % o.shade.length]) : hex;
        quad([a[0], a[1], -W], [c[0], c[1], -W], [c[0], c[1], W], [a[0], a[1], W], face, [-nx, -ny, 0]);
        quad([ia[0], ia[1], -W], [ic[0], ic[1], -W], [ic[0], ic[1], W], [ia[0], ia[1], W], back, [nx, ny, 0]);
        quad([a[0], a[1], W], [c[0], c[1], W], [ic[0], ic[1], W], [ia[0], ia[1], W], edge, [0, 0, 1]);
        quad([a[0], a[1], -W], [c[0], c[1], -W], [ic[0], ic[1], -W], [ia[0], ia[1], -W], edge, [0, 0, -1]);
      }
      if (o.ends !== false) {
        const d0 = [points[0][0] - points[1][0], points[0][1] - points[1][1], 0];
        const d1 = [points[n - 1][0] - points[n - 2][0], points[n - 1][1] - points[n - 2][1], 0];
        const cap = (pt, ip, dir) => quad([pt[0], pt[1], -W], [pt[0], pt[1], W], [ip[0], ip[1], W], [ip[0], ip[1], -W], edge, dir);
        cap(points[0], inner[0], d0); cap(points[n - 1], inner[n - 1], d1);
      }
      b.pop();
      return p;
    },

    /**
     * Convex plate: polygon [[x, z], ...] in the local XZ plane extruded upward
     * from y0 by `thick`. Top face colour, sides as cut edge.
     * o: { x, y, z, ry, rx, rz, edge, side: hex for the sides, bottom: false }
     */
    plate(poly, y0, thick, hex, o = {}) {
      const n = poly.length, edge = o.side || (typeof o.edge === 'string' ? o.edge : edgeTone(hex, o.edge ?? .3));
      let cx = 0, cz = 0; for (const [x, z] of poly) { cx += x; cz += z; } cx /= n; cz /= n;
      const y1 = y0 + thick;
      tf(o);
      for (let i = 1; i < n - 1; i++) {
        b.face([poly[0][0], y1, poly[0][1]], [poly[i][0], y1, poly[i][1]], [poly[i + 1][0], y1, poly[i + 1][1]], hex, [0, 1, 0]);
        if (o.bottom) b.face([poly[0][0], y0, poly[0][1]], [poly[i][0], y0, poly[i][1]], [poly[i + 1][0], y0, poly[i + 1][1]], hex, [0, -1, 0]);
      }
      if (thick > 0) for (let i = 0; i < n; i++) {
        const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % n];
        const out = [(x1 + x2) / 2 - cx, 0, (z1 + z2) / 2 - cz];
        quad([x1, y0, z1], [x2, y0, z2], [x2, y1, z2], [x1, y1, z1], edge, out);
      }
      b.pop();
      return p;
    },

    /**
     * Glue tab: trapezoid hanging from an attached edge along local X at z=0,
     * reaching `depth` toward +Z, chamfers at 35°. Pose it with ry/rx.
     */
    tab(x, y, z, len, depth, hex, o = {}) {
      const inset = Math.min(len * .45, depth * Math.tan(35 * Math.PI / 180)), h = len / 2;
      return p.plate([[-h, 0], [h, 0], [h - inset, depth], [-h + inset, depth]], 0, o.thick ?? t, hex,
        { edge: o.edge ?? .45, bottom: true, x, y, z, ry: o.ry, rx: o.rx, rz: o.rz });
    },

    /**
     * Layered frame in the local XY plane, centred on (x, y), sitting in front of
     * a surface at z (toward +Z). Four cards with visible edges.
     */
    frame(x, y, z, w, h, border, thick, hex, o = {}) {
      b.push(x, y, z + thick / 2, o.ry || 0);
      const opts = { thin: 'z', edge: o.edge };
      p.card(0, h / 2 - border / 2, 0, w, border, thick, hex, opts);
      p.card(0, -h / 2 + border / 2, 0, w, border, thick, hex, opts);
      p.card(-w / 2 + border / 2, 0, 0, border, h - border * 2, thick, hex, opts);
      p.card(w / 2 - border / 2, 0, 0, border, h - border * 2, thick, hex, opts);
      b.pop();
      return p;
    },

    /** Folded prism (column, post, trunk segment) standing on y0. o: { ry, top: true, taper: rTop/r } */
    prism(x, y0, z, sides, r, h, hex, o = {}) {
      const rt = r * (o.taper ?? 1), ring = k => Array.from({ length: sides }, (_, i) => { const a = i / sides * TAU + (o.ry || 0); return [Math.cos(a) * k, Math.sin(a) * k]; });
      const lo = ring(r), hi = ring(rt);
      b.push(x, y0, z);
      for (let i = 0; i < sides; i++) {
        const j = (i + 1) % sides, a = (i + .5) / sides * TAU + (o.ry || 0);
        quad([lo[i][0], 0, lo[i][1]], [lo[j][0], 0, lo[j][1]], [hi[j][0], h, hi[j][1]], [hi[i][0], h, hi[i][1]], hex, [Math.cos(a), 0, Math.sin(a)]);
      }
      if (o.top !== false && rt > 0) for (let i = 1; i < sides - 1; i++) b.face([hi[0][0], h, hi[0][1]], [hi[i][0], h, hi[i][1]], [hi[i + 1][0], h, hi[i + 1][1]], o.topHex || edgeTone(hex, .25), [0, 1, 0]);
      b.pop();
      return p;
    },

    /**
     * Faceted paper crown: an icosahedron with jittered vertices, each facet one
     * paper patch chosen from `colors`. o: { seed, sy: vertical scale, jitter, ry, creases: lighter fold lines on lit facets }
     */
    crown(x, y, z, r, colors, o = {}) {
      const { verts, tris } = icosahedron(), seed = o.seed ?? 'crown', jit = o.jitter ?? .16, sy = o.sy ?? 1;
      const v = verts.map((q, i) => { const k = 1 + (hash(seed, i) - .5) * 2 * jit; return [q[0] * r * k, q[1] * r * k * sy, q[2] * r * k]; });
      b.push(x, y, z, o.ry || 0);
      for (let i = 0; i < tris.length; i += 3) {
        const a = v[tris[i]], c = v[tris[i + 1]], d = v[tris[i + 2]];
        const m = [(a[0] + c[0] + d[0]) / 3, (a[1] + c[1] + d[1]) / 3, (a[2] + c[2] + d[2]) / 3];
        const hex = colors[Math.floor(hash(seed, 'f', i) * colors.length) % colors.length];
        b.face(a, c, d, hex, m);
        // Fold lines on the upper, lit facets only (where folds catch the light): +3 strips per facet.
        if (o.creases && m[1] > -r * .15) creaseTriangle(b, [a, c, d], edgeTone(hex, .2), r * .018, m);
      }
      b.pop();
      return p;
    },

    /**
     * Folded paper spike (crystal bush, cone tree tier): a faceted pyramid on y0.
     * o: { seed, ry, lean: offset of the apex, creases: lighter fold lines }
     */
    spike(x, y0, z, r, h, sides, colors, o = {}) {
      const seed = o.seed ?? 'spike', lean = o.lean ?? .12;
      const apex = [(hash(seed, 'ax') - .5) * r * lean * 2, h, (hash(seed, 'az') - .5) * r * lean * 2];
      const ring = Array.from({ length: sides }, (_, i) => { const a = i / sides * TAU + (o.ry || 0), k = .85 + hash(seed, i) * .3; return [Math.cos(a) * r * k, 0, Math.sin(a) * r * k]; });
      b.push(x, y0, z);
      for (let i = 0; i < sides; i++) {
        const a = ring[i], c = ring[(i + 1) % sides], m = [(a[0] + c[0]) / 2, h * .3, (a[2] + c[2]) / 2];
        const hex = colors[Math.floor(hash(seed, 'f', i) * colors.length) % colors.length];
        b.face(a, c, apex, hex, m);
        if (o.creases) creaseTriangle(b, [a, c, apex], edgeTone(hex, .2), r * .025, m);
      }
      b.pop();
      return p;
    },

    /**
     * Wide paper crystal (folded bush of sheet 04): a low faceted body whose
     * widest ring sits at mid height under an off-centre peak. Reads as a solid
     * folded crystal, not a cone. o: { seed, ry, creases }
     */
    crystal(x, y0, z, r, h, colors, o = {}) {
      const seed = o.seed ?? 'crystal', n = 6, rot = o.ry || 0;
      const ring = (k, y, j) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU + rot + j, q = k * (.88 + hash(seed, y, i) * .24); return [Math.cos(a) * r * q, y, Math.sin(a) * r * q]; });
      const A = ring(.78, 0, 0), B = ring(1, h * .42, Math.PI / n);
      const apex = [(hash(seed, 'ax') - .5) * r * .35, h, (hash(seed, 'az') - .5) * r * .35];
      const pick = i => colors[Math.floor(hash(seed, 'f', i) * colors.length) % colors.length];
      b.push(x, y0, z);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, c1 = pick(i), c2 = pick(i + n);
        // Lower band: two triangles per side, alternating so the folds zigzag.
        const m1 = [(A[i][0] + A[j][0] + B[i][0]) / 3, h * .2, (A[i][2] + A[j][2] + B[i][2]) / 3];
        b.face(A[i], A[j], B[i], c1, m1);
        b.face(A[j], B[j], B[i], shadeTone(c1, .92), [(A[j][0] + B[j][0] + B[i][0]) / 3, h * .3, (A[j][2] + B[j][2] + B[i][2]) / 3]);
        const top = [B[i], B[j], apex], mt = [(B[i][0] + B[j][0]) / 3, h * .6, (B[i][2] + B[j][2]) / 3];
        b.face(top[0], top[1], top[2], c2, mt);
        if (o.creases) creaseTriangle(b, top, edgeTone(c2, .2), r * .03, mt);
      }
      b.pop();
      return p;
    },

    /**
     * Rhombus leaf folded along its midrib (mountain fold), double sided.
     * Base at the local origin, tip toward +Y. o: { ry, rx (tilt outward), fold (0–1), back: hex }
     */
    leaf(x, y, z, len, width, hex, o = {}) {
      const f = (o.fold ?? .35) * width * .5, mid = len * .42, back = o.back || shadeTone(hex, .82);
      const base = [0, 0, 0], tip = [0, len, 0], L = [-width / 2, mid, -f], R = [width / 2, mid, -f];
      b.push(x, y, z, o.ry || 0, o.rx || 0, o.rz || 0);
      b.face(base, R, tip, hex, [0, 0, 1]).face(base, tip, L, shadeTone(hex, .93), [0, 0, 1]);
      b.face(base, tip, R, back, [0, 0, -1]).face(base, L, tip, back, [0, 0, -1]);
      b.pop();
      return p;
    },

    /** Transparent pane on the glass layer (railings, windows). */
    glass(x, y, z, w, h, d, o = {}) {
      b.layer('glass');
      p.card(x, y, z, w, h, d, o.hex || PAPER.glass, { ...o, edge: 0 });
      b.layer('main');
      return p;
    },

    /** Flat inlay on top of a surface at y (two triangles), lifted to avoid z-fighting. */
    inlay(x, y, z, w, d, hex, o = {}) { b.tile(x, y + (o.lift ?? .004), z, w, d, hex, o.ry || 0); return p; },

    /**
     * Fold line along edge a→c of a face with normal `n`, drawn `width` into the face
     * toward `inward` and lifted off it (never coplanar). Use on sleeves, torsos, chair
     * seat–back joints and any fold that should catch the light.
     */
    crease(a, c, n, inward, width, hex) { creaseStrip(b, a, c, n, unit(inward), width, hex); return p; },
    /** Fold lines on all three edges of triangle t3 (outward hint `out`). */
    creaseTri(t3, hex, width, out) { creaseTriangle(b, t3, hex, width, out); return p; },

    /** Soft contact shadow under an object. */
    shadow(x, y, z, rx, rz = rx, opacity = .22) { b.blob(x, y + .003, z, rx, rz, opacity); return p; }
  };
  return p;
}

/**
 * Register a construction stage on a bone.
 * style: 'fold' (rotate from `from` radians about `axis` to rest), 'rise' (scale Y),
 * 'pop' (scale), 'drop' (fall into place). Order: 0 base, 1 walls, 2 roof,
 * 3 connections, 4 furniture, 5 people.
 */
export function stage(meta, bone, order, style = 'pop', extra = {}) {
  meta.staged.push({ name: bone.name, order, style, ...extra });
  return bone;
}
export const newMeta = (extra = {}) => ({ staged: [], anchors: {}, connectors: [], focus: [0, .6, 0], ...extra });
