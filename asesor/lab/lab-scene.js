/*
 * Escena 3D de la portada: «laboratorio vivo de posibilidades».
 * Un robot de ruedas que se puede desarmar, bloques de programación, una pantalla y accesorios por nivel,
 * sobre una plataforma de trabajo. Se orbita arrastrando, y los puntos de la escena abren una ficha de la parte.
 *
 * Todo son geometrías propias (sin modelos externos) con materiales físicos y un entorno de estudio.
 * Los colores salen de las variables CSS del proyecto (--navy, --plum, --coral, --sky).
 * Se compila con esbuild junto a three.js (MIT) en vendor/lab-scene.min.js. Ver LEEME.md.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Color, Shape, ExtrudeGeometry, CylinderGeometry, BoxGeometry,
  SphereGeometry, CapsuleGeometry, IcosahedronGeometry, TorusGeometry, PlaneGeometry, RingGeometry, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial,
  CanvasTexture, SRGBColorSpace, HemisphereLight, DirectionalLight, PointLight, ACESFilmicToneMapping, DoubleSide,
  PMREMGenerator, InstancedMesh, Object3D, Points, BufferGeometry, Float32BufferAttribute, PointsMaterial, AdditiveBlending,
  Sprite, SpriteMaterial, Vector3, Vector2, Raycaster, Plane, ConeGeometry, EdgesGeometry, LineSegments, LineBasicMaterial, OrthographicCamera
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const ICONS = {
  pre: ['start', 'up', 'right', 'flag'],
  prim: ['start', 'up', 'loop', 'turn'],
  bas: ['start', 'loop', 'eye', 'if'],
  bach: ['start', 'eye', 'if', 'wave']
};
// qué niveles ven cada experiencia extra, según el catálogo (drones desde primaria alta; realidad virtual desde básico)
const EXTRA_LEVELS = { drone: ['prim', 'bas', 'bach'], vr: ['bas', 'bach'] };
const FRAMING = { // punto que mira la cámara y giro extra por nivel
  pre: { x: 1.4, y: 1.3, z: 0.3, yaw: 0.0 },
  prim: { x: 1.8, y: 1.3, z: -0.2, yaw: 0.05 },
  bas: { x: 1.9, y: 1.3, z: 0.0, yaw: 0.0 },
  bach: { x: 2.0, y: 1.2, z: -0.2, yaw: -0.04 }
};
const INFO = {
  sensor: { name: 'Sensor', text: 'Son los ojos del robot: detecta lo que hay delante para que decida qué hacer. Los estudiantes aprenden a leer datos y a hacer que el robot reaccione.' },
  motor: { name: 'Motores y ruedas', text: 'Convierten una secuencia de código en movimiento. Probar, medir y ajustar la velocidad es parte del aprendizaje.' },
  board: { name: 'Placa controladora', text: 'Es el cerebro del robot: ejecuta el programa que escriben los estudiantes y coordina sensores y motores.' },
  blocks: { name: 'Bloques de código', text: 'Arrastrar bloques es programar. Se empieza con secuencias sencillas y, según el nivel, se avanza a ciclos, decisiones y datos.' },
  drone: { name: 'Dron educativo', text: 'Programan rutas de vuelo y aprenden sobre control, sensores y seguridad. Aplican matemáticas y física para que el dron haga lo que planearon.' },
  vr: { name: 'Realidad virtual', text: 'Exploran lugares y conceptos que no caben en un salón: del sistema solar a un laboratorio de química, con guía de su docente.' },
  screen: { name: 'Pantalla de programación', text: 'Aquí ven su programa, lo prueban y comparan el resultado con lo que esperaban.' }
};

// ---------- utilidades ----------
const ease = { out: t => 1 - Math.pow(1 - t, 3), inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function mix(a, b, t) { const A = new Color(a), B = new Color(b); return '#' + A.lerp(B, t).getHexString(); }
function cssVar(name, fallback) { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; }

function roundedBox(w, h, d, r, seg = 3) {
  const bev = Math.min(r * 0.7, h * 0.32), bs = bev * 0.9, sw = Math.max(0.05, w - 2 * bs), sd = Math.max(0.05, d - 2 * bs), rr = Math.max(0.02, r - bs), x = -sw / 2, y = -sd / 2;
  const s = new Shape();
  s.moveTo(x + rr, y); s.lineTo(x + sw - rr, y); s.quadraticCurveTo(x + sw, y, x + sw, y + rr); s.lineTo(x + sw, y + sd - rr);
  s.quadraticCurveTo(x + sw, y + sd, x + sw - rr, y + sd); s.lineTo(x + rr, y + sd); s.quadraticCurveTo(x, y + sd, x, y + sd - rr);
  s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
  const depth = Math.max(0.01, h - 2 * bev);
  const g = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bs, bevelSegments: seg, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, -depth / 2, 0);
  return g;
}
function gearGeo(R, r, teeth, thick) {
  const s = new Shape(), n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = i % 4, rad = (k === 1 || k === 2) ? R : r;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  s.closePath();
  const hole = new Shape(); hole.absarc(0, 0, r * 0.32, 0, Math.PI * 2, true); s.holes.push(hole);
  const g = new ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 12 });
  g.translate(0, 0, -thick / 2);
  return g;
}

function iconTexture(kind, bg, fg = '#ffffff') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = fg; x.fillStyle = fg; x.lineWidth = 11; x.lineCap = 'round'; x.lineJoin = 'round';
  const arrow = (x1, y1, x2, y2) => { x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); const a = Math.atan2(y2 - y1, x2 - x1); x.beginPath(); x.moveTo(x2, y2); x.lineTo(x2 - 24 * Math.cos(a - .6), y2 - 24 * Math.sin(a - .6)); x.moveTo(x2, y2); x.lineTo(x2 - 24 * Math.cos(a + .6), y2 - 24 * Math.sin(a + .6)); x.stroke(); };
  if (kind === 'start') { x.beginPath(); x.moveTo(46, 32); x.lineTo(46, 96); x.lineTo(98, 64); x.closePath(); x.fill(); }
  else if (kind === 'up') arrow(64, 100, 64, 30);
  else if (kind === 'right') arrow(28, 64, 100, 64);
  else if (kind === 'turn') { x.beginPath(); x.arc(64, 70, 30, Math.PI * 1.1, Math.PI * 2.1); x.stroke(); arrow(94, 70, 94, 44); }
  else if (kind === 'loop') { x.beginPath(); x.arc(64, 64, 30, Math.PI * .2, Math.PI * 1.1); x.stroke(); x.beginPath(); x.arc(64, 64, 30, Math.PI * 1.2, Math.PI * 2.1); x.stroke(); arrow(40, 90, 36, 84); }
  else if (kind === 'eye') { x.beginPath(); x.ellipse(64, 64, 40, 24, 0, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(64, 64, 11, 0, Math.PI * 2); x.fill(); }
  else if (kind === 'if') { x.font = '800 78px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 64, 70); }
  else if (kind === 'wave') { x.beginPath(); for (let i = 0; i <= 60; i++) { const px = 22 + i * 1.4, py = 64 + Math.sin(i / 60 * Math.PI * 4) * 22; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
  else if (kind === 'flag') { x.beginPath(); x.moveTo(42, 100); x.lineTo(42, 26); x.stroke(); x.beginPath(); x.moveTo(42, 28); x.lineTo(98, 44); x.lineTo(42, 62); x.closePath(); x.fill(); }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t;
}
function screenTexture(level, cols) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 200;
  const x = c.getContext('2d'); x.fillStyle = cols.screen; x.fillRect(0, 0, 320, 200);
  x.fillStyle = 'rgba(255,255,255,.14)'; [18, 34, 50].forEach(px => { x.beginPath(); x.arc(px, 18, 5, 0, 7); x.fill(); });
  const seq = ICONS[level], palette = [cols.coral, cols.sky, cols.plumLight, cols.white];
  seq.forEach((k, i) => {
    const y = 40 + i * 34; x.fillStyle = palette[i % 4]; x.beginPath(); x.roundRect(22 + i * 8, y, 190, 26, 8); x.fill();
    x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.roundRect(34 + i * 8, y + 9, 70 + (i % 2) * 36, 8, 4); x.fill();
  });
  x.fillStyle = cols.coral; x.beginPath(); x.arc(270, 160, 22, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(264, 150); x.lineTo(264, 170); x.lineTo(282, 160); x.closePath(); x.fill();
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t;
}
function blobTexture(alpha = 0.5) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, `rgba(8,4,20,${alpha})`); g.addColorStop(0.55, `rgba(8,4,20,${alpha * 0.45})`); g.addColorStop(1, 'rgba(8,4,20,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}
function glowTexture(color) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color); g.addColorStop(0.25, color + '88'); g.addColorStop(1, color + '00');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}
function platformTexture(base, light) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d'), g = x.createRadialGradient(256, 256, 20, 256, 256, 256);
  g.addColorStop(0, light); g.addColorStop(1, base); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 2;
  for (let i = 0; i <= 512; i += 43) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; return t;
}
function floorTexture(line) { // cuadrícula que se desvanece hacia el horizonte
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d'); x.strokeStyle = line; x.lineWidth = 2;
  for (let i = 0; i <= 1024; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 1024); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(1024, i); x.stroke(); }
  x.globalCompositeOperation = 'destination-in';
  const g = x.createRadialGradient(512, 512, 40, 512, 512, 512); g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------- escena ----------
export function createLab(container, opts = {}) {
  const reduce = !!opts.reduceMotion;
  const cols = {
    navy: cssVar('--navy', '#45335f'), plum: cssVar('--plum', '#685599'), coral: cssVar('--coral', '#ef8556'), sky: cssVar('--sky', '#5fbad6'), white: '#f4f0fa'
  };
  cols.plumLight = mix(cols.plum, '#ffffff', 0.28); cols.screen = mix(cols.navy, '#000000', 0.35);
  cols.platform = mix(cols.navy, '#ffffff', 0.08); cols.platformLight = mix(cols.navy, '#ffffff', 0.18); cols.dark = '#241d38'; cols.board = mix(cols.navy, cols.sky, 0.28);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const canvas = renderer.domElement; canvas.className = 'lab-canvas'; canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 120);
  const world = new Group(); scene.add(world);
  const disposables = [];
  const track = o => { disposables.push(o); return o; };
  const physical = (hex, rough, metal, extra = {}) => track(new MeshPhysicalMaterial({ color: hex, roughness: rough, metalness: metal, ...extra }));
  const M = (hex, rough = 0.6, metal = 0.05, extra = {}) => track(new MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal, ...extra }));
  const glow = (hex, k = 1) => M(hex, 0.35, 0, { emissive: new Color(hex), emissiveIntensity: k });

  // Entorno de estudio para reflejos y luces
  try {
    const pm = new PMREMGenerator(renderer), env = new RoomEnvironment();
    scene.environment = pm.fromScene(env, 0.04).texture; scene.environmentIntensity = 0.55; pm.dispose(); env.dispose && env.dispose();
  } catch (e) { /* sin entorno: quedan las luces directas */ }
  scene.add(new HemisphereLight(0xe4dcf3, new Color(cols.navy), 0.55));
  const key = new DirectionalLight(0xfff4ec, 2.2); key.position.set(-6, 11, 8); scene.add(key);
  const fill = new PointLight(new Color(cols.sky), 30, 32, 1.6); fill.position.set(9, 4, 5); scene.add(fill);
  const rim = new PointLight(new Color(cols.coral), 26, 28, 1.6); rim.position.set(-6, 5, -8); scene.add(rim);

  // Suelo: cuadrícula que se pierde en el horizonte + plataforma de trabajo
  const floor = new Mesh(track(new PlaneGeometry(70, 70)), track(new MeshBasicMaterial({ map: track(floorTexture('rgba(140,120,200,.35)')), transparent: true, depthWrite: false })));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.56; world.add(floor);
  const platform = new Mesh(track(new CylinderGeometry(6.6, 6.9, 0.55, 80)), [
    M(mix(cols.navy, '#000', 0.2), 0.7, 0.1), new MeshStandardMaterial({ map: track(platformTexture(mix(cols.navy, '#000', 0.12), cols.platform)), roughness: 0.8, metalness: 0.05, envMapIntensity: 0.35 }), M(mix(cols.navy, '#000', 0.25), 0.7, 0.1)
  ]);
  platform.position.y = -0.275; world.add(platform);
  const ring = new Mesh(track(new RingGeometry(6.28, 6.4, 100)), track(new MeshBasicMaterial({ color: cols.sky, transparent: true, opacity: 0.6, side: DoubleSide })));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012; world.add(ring);
  const ring2 = new Mesh(track(new RingGeometry(7.3, 7.34, 100)), track(new MeshBasicMaterial({ color: cols.coral, transparent: true, opacity: 0.35, side: DoubleSide })));
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = -0.5; world.add(ring2);

  const blobTex = track(blobTexture());
  const blobPlane = (w, d, x, z, a = 0.8) => { const m = new Mesh(track(new PlaneGeometry(w, d)), track(new MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: a }))); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); return m; };
  const halo = (hex, size, x, y, z, op = 0.9) => { const s = new Sprite(track(new SpriteMaterial({ map: track(glowTexture(hex)), blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: op }))); s.scale.set(size, size, 1); s.position.set(x, y, z); return s; };

  // Partículas que flotan sobre el laboratorio
  const N = 110, pos = new Float32Array(N * 3), seed = [];
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = Math.random() * 7; pos[i * 3 + 2] = (Math.random() - 0.5) * 14; seed.push(Math.random() * 6.28); }
  const pg = track(new BufferGeometry()); pg.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const dots = new Points(pg, track(new PointsMaterial({ map: track(glowTexture('#ffffff')), size: 0.34, transparent: true, opacity: 0.7, depthWrite: false, blending: AdditiveBlending, color: new Color(cols.sky) })));
  world.add(dots);

  // ----- Robot protagonista, hecho de partes que se separan -----
  const robot = new Group(); world.add(robot);
  const parts = [];
  const addPart = (g, dir, dist, delay = 0) => { robot.add(g); parts.push({ g, base: g.position.clone(), dir: new Vector3(...dir), dist, delay }); return g; };
  const anchor = (parent, x, y, z) => { const o = new Object3D(); o.position.set(x, y, z); parent.add(o); return o; };

  // chasis
  const chassisG = new Group();
  const white = physical(cols.white, 0.4, 0.05, { clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const chassis = new Mesh(track(roundedBox(3.7, 0.52, 2.3, 0.3)), white); chassis.position.y = 0.8; chassisG.add(chassis);
  const skid = new Mesh(track(roundedBox(3.2, 0.2, 1.9, 0.12)), M(cols.dark, 0.5, 0.4)); skid.position.y = 0.48; chassisG.add(skid);
  [-1, 1].forEach(sz => { const led = new Mesh(track(new BoxGeometry(3.0, 0.05, 0.05)), glow(cols.coral, 1.1)); led.position.set(0, 0.82, sz * 1.16); chassisG.add(led); });
  [[-1.55, -0.9], [-1.55, 0.9], [1.45, -0.9], [1.45, 0.9]].forEach(([sx, sz]) => { const sc = new Mesh(track(new CylinderGeometry(0.07, 0.07, 0.06, 12)), M('#9d95b0', 0.3, 0.9)); sc.position.set(sx, 1.08, sz); chassisG.add(sc); });
  addPart(chassisG, [0, 0, 0], 0, 0);

  // placa controladora (queda dentro de la carcasa; se ve al desarmar)
  const boardG = new Group(); boardG.position.y = 1.16;
  const pcb = new Mesh(track(roundedBox(2.2, 0.08, 1.5, 0.06, 2)), M(cols.board, 0.45, 0.2)); boardG.add(pcb);
  [[-0.5, 0.2, 0.5, 0.5], [0.45, -0.2, 0.4, 0.4], [0.6, 0.35, 0.3, 0.3]].forEach(([x, z, w, d]) => { const ch = new Mesh(track(new BoxGeometry(w, 0.08, d)), M('#15101f', 0.4, 0.3)); ch.position.set(x, 0.08, z); boardG.add(ch); });
  for (let i = 0; i < 9; i++) { const pin = new Mesh(track(new BoxGeometry(0.06, 0.1, 0.06)), M('#d9b25f', 0.3, 0.9)); pin.position.set(-0.8 + i * 0.2, 0.08, -0.62); boardG.add(pin); }
  const bled = new Mesh(track(new SphereGeometry(0.05, 10, 8)), glow(cols.sky, 1.6)); bled.position.set(0.9, 0.08, 0.5); boardG.add(bled);
  const boardAnchor = anchor(boardG, 0, 0.25, 0);
  addPart(boardG, [0, 1, 0], 0.55, 0.1);

  // carcasa
  const shellG = new Group(); shellG.position.set(-0.3, 1.66, 0);
  const shell = new Mesh(track(roundedBox(2.5, 0.88, 1.95, 0.4)), physical(cols.plum, 0.32, 0.1, { clearcoat: 1, clearcoatRoughness: 0.12 })); shellG.add(shell);
  const win = new Mesh(track(roundedBox(0.12, 0.34, 1.3, 0.1, 2)), physical(cols.dark, 0.1, 0.5, { clearcoat: 1 })); win.position.set(1.12, 0.05, 0); shellG.add(win);
  for (let i = 0; i < 4; i++) { const v = new Mesh(track(new BoxGeometry(0.9, 0.03, 0.06)), M(cols.dark, 0.5)); v.position.set(-0.4, 0.46, -0.45 + i * 0.3); shellG.add(v); }
  addPart(shellG, [0, 1, 0], 1.1, 0.2);

  // tapa coral con engranaje
  const lidG = new Group(); lidG.position.set(-0.3, 2.18, 0);
  const lid = new Mesh(track(roundedBox(1.9, 0.16, 1.4, 0.2)), physical(cols.coral, 0.35, 0.05, { clearcoat: 0.8, clearcoatRoughness: 0.2 })); lidG.add(lid);
  const gear = new Mesh(track(gearGeo(0.62, 0.5, 10, 0.18)), M(cols.sky, 0.35, 0.5)); gear.position.set(0.4, 0.24, 0.5); lidG.add(gear);
  addPart(lidG, [0, 1, 0], 1.7, 0.3);

  // antena
  const mastG = new Group(); mastG.position.set(-1.2, 2.4, -0.55);
  const mast = new Mesh(track(new CylinderGeometry(0.04, 0.05, 1.1, 10)), M('#8a82a0', 0.3, 0.8)); mast.position.y = 0.5; mastG.add(mast);
  const bulb = new Mesh(track(new SphereGeometry(0.17, 20, 16)), glow(cols.coral, 0.9)); bulb.position.y = 1.1; mastG.add(bulb);
  mastG.add(halo(cols.coral, 1.5, 0, 1.1, 0, 0.8));
  addPart(mastG, [0, 1, 0], 2.4, 0.4);

  // cabeza con sensor
  const headG = new Group(); headG.position.set(1.85, 0.95, 0);
  const head = new Mesh(track(roundedBox(0.72, 0.64, 1.6, 0.24)), white); headG.add(head);
  const eyes = [];
  [-0.45, 0.45].forEach(z => {
    const bez = new Mesh(track(new CylinderGeometry(0.29, 0.29, 0.12, 32)), M(cols.dark, 0.3, 0.6)); bez.rotation.z = Math.PI / 2; bez.position.set(0.36, 0.02, z); headG.add(bez);
    const lens = new Mesh(track(new CylinderGeometry(0.22, 0.22, 0.06, 32)), physical('#0d0a16', 0.05, 0.6, { clearcoat: 1 })); lens.rotation.z = Math.PI / 2; lens.position.set(0.42, 0.02, z); headG.add(lens);
    const pu = new Mesh(track(new SphereGeometry(0.1, 16, 12)), glow(cols.sky, 1.4)); pu.position.set(0.47, 0.02, z); headG.add(pu); eyes.push(pu);
  });
  const bar = new Mesh(track(roundedBox(0.4, 0.1, 1.2, 0.05, 2)), M(cols.dark, 0.4, 0.4)); bar.position.set(0, 0.36, 0); headG.add(bar);
  const sensorAnchor = anchor(headG, 0.5, 0.02, 0);
  headG.add(halo(cols.sky, 1.1, 0.5, 0.02, 0, 0.55));
  addPart(headG, [1, 0.15, 0], 1.3, 0.15);

  // batería trasera
  const packG = new Group(); packG.position.set(-1.98, 0.98, 0);
  const pack = new Mesh(track(roundedBox(0.8, 0.66, 1.5, 0.14)), physical(cols.navy, 0.4, 0.2, { clearcoat: 0.5 })); packG.add(pack);
  const band = new Mesh(track(new BoxGeometry(0.82, 0.12, 1.2)), glow(cols.coral, 0.6)); band.position.y = 0.05; packG.add(band);
  addPart(packG, [-1, 0, 0], 1.4, 0.25);

  // ruedas
  const wheels = [];
  const tire = track(new CylinderGeometry(0.66, 0.66, 0.5, 40)), tread = track(new BoxGeometry(0.1, 0.09, 0.5));
  const rubber = M('#17121f', 0.85, 0.05);
  let motorAnchor = null;
  [[1.15, 1.22], [1.15, -1.22], [-1.2, 1.22], [-1.2, -1.22]].forEach(([wx, wz], idx) => {
    const w = new Group(); w.position.set(wx, 0.66, wz); const spin = new Group(); w.add(spin);
    const t = new Mesh(tire, rubber); t.rotation.x = Math.PI / 2; spin.add(t);
    const knobs = new InstancedMesh(tread, rubber, 24), d = new Object3D();
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; d.position.set(Math.cos(a) * 0.69, Math.sin(a) * 0.69, 0); d.rotation.set(0, 0, a); d.updateMatrix(); knobs.setMatrixAt(i, d.matrix); }
    spin.add(knobs);
    const hub = new Mesh(track(new CylinderGeometry(0.4, 0.4, 0.54, 28)), M(cols.sky, 0.25, 0.7)); hub.rotation.x = Math.PI / 2; spin.add(hub);
    for (let i = 0; i < 5; i++) { const sp = new Mesh(track(new BoxGeometry(0.1, 0.78, 0.58)), M(cols.white, 0.4, 0.2)); sp.rotation.z = i / 5 * Math.PI; spin.add(sp); }
    const cap = new Mesh(track(new CylinderGeometry(0.12, 0.12, 0.64, 18)), M(cols.coral, 0.3, 0.3)); cap.rotation.x = Math.PI / 2; spin.add(cap);
    addPart(w, [0, 0, Math.sign(wz)], 1.25, 0.05); wheels.push(spin);
    if (idx === 0) motorAnchor = anchor(w, 0, 0, 0.3);
  });

  robot.position.set(0.8, 0, -0.5); robot.scale.setScalar(1.12);
  const robotShadow = blobPlane(5.6, 3.6, 0.9, -0.5, 0.95); world.add(robotShadow);

  // ----- Secuencia de bloques -----
  const blocksGroup = new Group(); blocksGroup.position.set(-1.4, 0, 3.0); world.add(blocksGroup);
  const blockCols = [cols.coral, cols.sky, cols.plumLight, cols.white];
  const blocks = [];
  for (let i = 0; i < 4; i++) {
    const g = new Group(); g.position.x = i * 1.32;
    const bodyMat = physical(blockCols[i], 0.35, 0.03, { clearcoat: 0.7, clearcoatRoughness: 0.2, emissive: new Color(blockCols[i]), emissiveIntensity: 0 });
    const body = new Mesh(track(roundedBox(1.14, 0.5, 1.14, 0.2)), bodyMat); body.position.y = 0.27; g.add(body);
    const tab = new Mesh(track(new BoxGeometry(0.22, 0.26, 0.5)), bodyMat); tab.position.set(0.66, 0.27, 0); g.add(tab);
    const face = new Mesh(track(new PlaneGeometry(0.82, 0.82)), new MeshBasicMaterial({ transparent: true })); face.rotation.x = -Math.PI / 2; face.position.y = 0.535; g.add(face);
    disposables.push(face.material);
    blocksGroup.add(g); blocks.push({ g, mat: bodyMat, face });
  }
  const blocksAnchor = anchor(blocksGroup, 2.0, 0.9, 0);
  world.add(blobPlane(6.0, 2.0, 1.3, 3.1, 0.8));

  // ----- Pantalla de programación -----
  const screenGroup = new Group(); screenGroup.position.set(-3.7, 0, -2.4); screenGroup.rotation.y = 0.55; world.add(screenGroup);
  const stand = new Mesh(track(roundedBox(1.5, 0.18, 1.1, 0.1)), white); stand.position.y = 0.09; screenGroup.add(stand);
  const neck = new Mesh(track(new CylinderGeometry(0.09, 0.09, 1.1, 12)), M('#8a82a0', 0.3, 0.8)); neck.position.y = 0.7; screenGroup.add(neck);
  const frame = new Mesh(track(roundedBox(2.7, 0.2, 1.8, 0.16)), physical(cols.dark, 0.3, 0.4, { clearcoat: 0.6 })); frame.rotation.x = Math.PI / 2 - 0.12; frame.position.set(0, 1.95, 0); screenGroup.add(frame);
  const screenFace = new Mesh(track(new PlaneGeometry(2.38, 1.46)), new MeshBasicMaterial()); screenFace.position.set(0, 1.95, 0.104); screenFace.rotation.x = -0.12; screenGroup.add(screenFace);
  disposables.push(screenFace.material);
  screenGroup.add(halo(cols.sky, 4.2, 0, 1.95, 0.4, 0.25));
  const screenAnchor = anchor(screenGroup, 0, 2.5, 0.2);
  world.add(blobPlane(2.6, 1.8, -3.55, -2.3, 0.7));


  // ----- Dron que vuela sobre el laboratorio -----
  const droneG = new Group(); world.add(droneG);
  const drone = new Group(); droneG.add(drone);
  const dBody = new Mesh(track(roundedBox(0.9, 0.3, 0.9, 0.2)), white); drone.add(dBody);
  const dTop = new Mesh(track(roundedBox(0.58, 0.16, 0.58, 0.12)), physical(cols.coral, 0.35, 0.05, { clearcoat: 0.8 })); dTop.position.y = 0.2; drone.add(dTop);
  const dCam = new Mesh(track(new SphereGeometry(0.17, 20, 14)), physical('#0d0a16', 0.05, 0.6, { clearcoat: 1 })); dCam.position.set(0.46, -0.08, 0); drone.add(dCam);
  [Math.PI / 4, -Math.PI / 4].forEach(a => { const arm = new Mesh(track(new BoxGeometry(2.0, 0.07, 0.13)), M(cols.dark, 0.4, 0.4)); arm.rotation.y = a; drone.add(arm); });
  const rotors = [];
  [[0.7, 0.7], [0.7, -0.7], [-0.7, 0.7], [-0.7, -0.7]].forEach(([x, z], i) => {
    const r = new Group(); r.position.set(x, 0.1, z);
    const mt = new Mesh(track(new CylinderGeometry(0.14, 0.16, 0.16, 16)), M(cols.dark, 0.35, 0.6)); r.add(mt);
    const disc = new Mesh(track(new CylinderGeometry(0.52, 0.52, 0.012, 32)), track(new MeshBasicMaterial({ color: cols.sky, transparent: true, opacity: 0.22, depthWrite: false }))); disc.position.y = 0.1; r.add(disc);
    const bl = new Group(); bl.position.y = 0.1; [0, 1].forEach(k => { const b = new Mesh(track(new BoxGeometry(1.0, 0.014, 0.08)), M(cols.white, 0.5)); b.rotation.y = k * Math.PI / 2; bl.add(b); }); r.add(bl);
    drone.add(r); rotors.push(bl);
  });
  const dLedF = new Mesh(track(new SphereGeometry(0.06, 10, 8)), glow(cols.sky, 1.6)); dLedF.position.set(0.46, 0.0, 0.3); drone.add(dLedF);
  const dLedB = new Mesh(track(new SphereGeometry(0.06, 10, 8)), glow(cols.coral, 1.6)); dLedB.position.set(-0.46, 0.0, 0); drone.add(dLedB);
  drone.add(halo(cols.sky, 1.8, 0, 0, 0, 0.25));
  const droneAnchor = anchor(drone, 0, 0.3, 0);
  const droneShadow = blobPlane(1.6, 1.6, 0, 0, 0.7); world.add(droneShadow);
  droneG.scale.setScalar(1.1);
  function placeDrone(a) {
    const cx = 1.6, cz = -1.6, R = 3.4;
    droneG.position.set(cx + Math.cos(a) * R, 4.6 + Math.sin(a * 2) * 0.28, cz + Math.sin(a) * R * 0.8);
    drone.rotation.y = -a - Math.PI / 2 + Math.PI; drone.rotation.z = Math.sin(a) * 0.08; drone.rotation.x = Math.cos(a) * 0.08;
    droneShadow.position.set(droneG.position.x, 0.03, droneG.position.z); droneShadow.scale.setScalar(0.7 - (droneG.position.y - 4.3) * 0.05);
  }
  placeDrone(0.9);

  // ----- Estudiante explorando con lentes de realidad virtual (mismo lenguaje de juguete que el robot) -----
  const vrG = new Group(); vrG.position.set(-4.3, 0, 1.9); vrG.rotation.y = 1.1; world.add(vrG);
  const skin = physical('#e9b891', 0.5, 0, { clearcoat: 0.3 });
  const suit = physical(cols.plumLight, 0.35, 0.05, { clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const pants = physical(cols.navy, 0.4, 0.05, { clearcoat: 0.5 });
  const pedestal = new Mesh(track(new CylinderGeometry(1.0, 1.1, 0.14, 48)), physical(cols.white, 0.4, 0.05, { clearcoat: 0.6 })); pedestal.position.y = 0.07; vrG.add(pedestal);
  const pRing = new Mesh(track(new RingGeometry(0.78, 0.9, 48)), track(new MeshBasicMaterial({ color: cols.sky, side: DoubleSide }))); pRing.rotation.x = -Math.PI / 2; pRing.position.y = 0.15; vrG.add(pRing);
  vrG.add(halo(cols.sky, 3.2, 0, 0.2, 0, 0.3));
  [-0.2, 0.2].forEach(x => {
    const l = new Mesh(track(new CapsuleGeometry(0.16, 0.5, 6, 14)), pants); l.position.set(x, 0.72, 0); vrG.add(l);
    const sh = new Mesh(track(roundedBox(0.34, 0.18, 0.56, 0.08, 2)), physical(cols.coral, 0.4, 0.03, { clearcoat: 0.7 })); sh.position.set(x, 0.24, 0.07); vrG.add(sh);
  });
  const torso = new Mesh(track(new CapsuleGeometry(0.38, 0.45, 8, 18)), suit); torso.scale.z = 0.78; torso.position.y = 1.5; vrG.add(torso);
  const vrHead = new Group(); vrHead.position.y = 2.28; vrG.add(vrHead);
  vrHead.add(new Mesh(track(new SphereGeometry(0.33, 28, 20)), skin));
  const hair = new Mesh(track(new SphereGeometry(0.345, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5)), physical('#3a2723', 0.5, 0, { clearcoat: 0.4 })); hair.position.y = 0.04; hair.rotation.x = -0.35; vrHead.add(hair);
  const hs = new Mesh(track(roundedBox(0.8, 0.36, 0.42, 0.14)), physical(cols.white, 0.3, 0.05, { clearcoat: 1, clearcoatRoughness: 0.1 })); hs.position.set(0, 0.03, 0.26); vrHead.add(hs);
  const visor = new Mesh(track(roundedBox(0.66, 0.24, 0.05, 0.08, 2)), physical('#0d0a16', 0.05, 0.6, { clearcoat: 1 })); visor.position.set(0, 0.03, 0.5); vrHead.add(visor);
  const vGlow = new Mesh(track(new BoxGeometry(0.44, 0.07, 0.02)), glow(cols.sky, 1.5)); vGlow.position.set(0, 0.03, 0.535); vrHead.add(vGlow);
  const strap = new Mesh(track(new TorusGeometry(0.36, 0.045, 10, 32)), physical(cols.white, 0.4, 0.05, { clearcoat: 0.6 })); strap.rotation.x = Math.PI / 2; strap.position.y = 0.05; vrHead.add(strap);
  const arms = [];
  [-1, 1].forEach(sd => {
    const a = new Group(); a.position.set(sd * 0.5, 1.82, 0); a.rotation.x = -1.2; a.rotation.z = sd * 0.2; vrG.add(a);
    const up = new Mesh(track(new CapsuleGeometry(0.1, 0.62, 6, 12)), suit); up.position.y = -0.4; a.add(up);
    const hand = new Mesh(track(new SphereGeometry(0.115, 16, 12)), skin); hand.position.y = -0.82; a.add(hand);
    const ctl = new Mesh(track(new CapsuleGeometry(0.06, 0.16, 4, 10)), physical(cols.white, 0.3, 0.05, { clearcoat: 0.8 })); ctl.position.set(0, -0.9, 0.03); a.add(ctl);
    const cr = new Mesh(track(new TorusGeometry(0.1, 0.018, 8, 22)), glow(cols.coral, 1.4)); cr.position.set(0, -0.99, 0.03); cr.rotation.x = Math.PI / 2; a.add(cr);
    arms.push(a);
  });
  // lo que ve: un planeta con su órbita flotando delante
  const holo = new Group(); holo.position.set(0, 1.6, 1.4); vrG.add(holo);
  holo.add(new Mesh(track(new SphereGeometry(0.42, 28, 20)), physical(cols.sky, 0.3, 0.05, { clearcoat: 0.8, emissive: new Color(cols.sky), emissiveIntensity: 0.25 })));
  holo.add(new Mesh(track(new SphereGeometry(0.5, 20, 14)), track(new MeshBasicMaterial({ color: cols.white, wireframe: true, transparent: true, opacity: 0.35 }))));
  const orbit = new Mesh(track(new TorusGeometry(0.78, 0.02, 8, 48)), glow(cols.coral, 1.2)); orbit.rotation.x = Math.PI / 2.4; holo.add(orbit);
  const moon = new Mesh(track(new SphereGeometry(0.09, 14, 10)), glow(cols.coral, 1.2)); orbit.add(moon); moon.position.set(0.78, 0, 0);
  holo.add(halo(cols.sky, 2.6, 0, 0, 0, 0.3));
  const vrAnchor = anchor(vrHead, 0, 0.5, 0);
  vrG.add(blobPlane(2.6, 2.0, 0, 0.1, 0.55));
  const extras = { drone: droneG, vr: vrG };

  // ----- Accesorios por nivel -----
  const accessories = { pre: new Group(), prim: new Group(), bas: new Group(), bach: new Group() };
  Object.values(accessories).forEach(g => { g.visible = false; world.add(g); });
  { // Preprimaria: recorrido con flechas y meta
    const g = accessories.pre;
    [[2.9, -0.6, 'right'], [3.8, -0.6, 'up']].forEach(([x, z, k], i) => {
      const t = new Mesh(track(roundedBox(0.8, 0.1, 0.8, 0.12)), physical(i ? cols.sky : cols.plumLight, 0.35, 0.05, { clearcoat: 0.6 })); t.position.set(x, 0.08, z); g.add(t);
      const f = new Mesh(track(new PlaneGeometry(0.56, 0.56)), new MeshBasicMaterial({ map: track(iconTexture(k, i ? cols.sky : cols.plumLight)) })); f.rotation.x = -Math.PI / 2; f.position.set(x, 0.14, z); g.add(f); disposables.push(f.material);
    });
    const pole = new Mesh(track(new CylinderGeometry(0.05, 0.05, 1.9, 10)), M('#8a82a0', 0.3, 0.8)); pole.position.set(4.3, 1.0, -1.5); g.add(pole);
    const flag = new Mesh(track(new BoxGeometry(0.9, 0.55, 0.05)), glow(cols.coral, 0.35)); flag.position.set(4.78, 1.68, -1.5); g.add(flag);
    const pad = new Mesh(track(roundedBox(0.9, 0.12, 0.9, 0.16)), white); pad.position.set(4.3, 0.1, -1.5); g.add(pad);
    g.add(blobPlane(3.2, 2.6, 3.9, -1.0));
  }
  { // Primaria: engranajes y piezas para construir
    const g = accessories.prim, a = new Mesh(track(gearGeo(0.9, 0.74, 12, 0.22)), M(cols.coral, 0.35, 0.5)), b = new Mesh(track(gearGeo(0.66, 0.54, 9, 0.22)), M(cols.sky, 0.35, 0.5));
    a.position.set(3.7, 1.35, -1.9); b.position.set(4.95, 1.0, -1.9); b.rotation.z = 0.2; g.add(a, b); g.userData = { a, b };
    const post = new Mesh(track(roundedBox(3.2, 0.16, 1.1, 0.1)), white); post.position.set(4.3, 0.1, -1.9); g.add(post);
    [[3.7, 1.2], [4.95, 0.9]].forEach(([x, h]) => { const p = new Mesh(track(new CylinderGeometry(0.1, 0.1, h, 10)), M('#8a82a0', 0.3, 0.8)); p.position.set(x, h / 2, -1.95); g.add(p); });
    [[3.3, 1.7, cols.plumLight], [4.0, 1.7, cols.coral], [3.65, 2.05, cols.sky]].forEach(([x, z, c], i) => {
      const br = new Mesh(track(roundedBox(0.64, 0.4, 0.64, 0.1)), physical(c, 0.35, 0.03, { clearcoat: 0.7 })); br.position.set(x, 0.2 + (i === 2 ? 0.4 : 0), z); g.add(br);
    });
    g.add(blobPlane(3.8, 2.4, 4.3, -1.8));
  }
  { // Básico: sensor de distancia que "ve" un obstáculo y le responde al robot
    const g = accessories.bas;
    const base = new Mesh(track(roundedBox(1.5, 0.12, 1.3, 0.14)), white); base.position.set(4.9, 0.08, -0.7); g.add(base);
    const post = new Mesh(track(new CylinderGeometry(0.09, 0.11, 1.0, 14)), M('#8a82a0', 0.3, 0.8)); post.position.set(4.9, 0.64, -0.7); g.add(post);
    const mod = new Group(); mod.position.set(4.9, 1.3, -0.7); mod.rotation.y = -Math.PI / 2 + 0.2; g.add(mod); // mira hacia el robot
    const pcb = new Mesh(track(roundedBox(1.0, 0.5, 0.14, 0.08, 2)), physical(cols.sky, 0.35, 0.1, { clearcoat: 0.7 })); mod.add(pcb);
    [-0.25, 0.25].forEach(x => {
      const rim = new Mesh(track(new CylinderGeometry(0.19, 0.19, 0.12, 28)), M('#9d95b0', 0.3, 0.85)); rim.rotation.x = Math.PI / 2; rim.position.set(x, 0, 0.1); mod.add(rim);
      const eye = new Mesh(track(new CylinderGeometry(0.14, 0.14, 0.05, 24)), physical('#0d0a16', 0.1, 0.5, { clearcoat: 1 })); eye.rotation.x = Math.PI / 2; eye.position.set(x, 0, 0.17); mod.add(eye);
    });
    const waves = [];
    for (let i = 0; i < 3; i++) { const w = new Mesh(track(new RingGeometry(0.5 + i * 0.4, 0.55 + i * 0.4, 40, 1, -Math.PI * 0.22, Math.PI * 0.44)), track(new MeshBasicMaterial({ color: cols.sky, transparent: true, opacity: 0.85 - i * 0.22, side: DoubleSide }))); w.rotation.y = -Math.PI / 2; w.rotation.x = 0; w.position.set(4.9, 1.3, -0.7); w.rotation.set(0, -Math.PI / 2 + 0.2, 0); w.translateZ(0.2); g.add(w); waves.push(w); }
    // obstáculo a detectar: bloque con franjas
    const obs = new Mesh(track(roundedBox(0.8, 0.8, 0.8, 0.14)), physical(cols.coral, 0.4, 0.03, { clearcoat: 0.7 })); obs.position.set(4.2, 0.42, 1.2); g.add(obs);
    [0.16, -0.16].forEach(dy => { const st = new Mesh(track(new BoxGeometry(0.84, 0.1, 0.84)), M(cols.white, 0.5)); st.position.set(4.2, 0.42 + dy, 1.2); g.add(st); });
    g.userData = { waves }; g.add(blobPlane(3.2, 3.6, 4.6, 0.3));
  }
  { // Bachillerato: placa electrónica
    const g = accessories.bach;
    const board = new Mesh(track(roundedBox(3.1, 0.16, 2.1, 0.14)), M(cols.board, 0.45, 0.25)); board.position.set(4.2, 0.12, -1.3); g.add(board);
    [[-1.0, -0.5, 1.8], [-0.2, 0.0, 1.9], [0.4, 0.5, 1.6]].forEach(([dx, dz, len]) => { const tr = new Mesh(track(new BoxGeometry(len, 0.03, 0.06)), M('#d9b25f', 0.3, 0.9)); tr.position.set(4.2 + dx, 0.22, -1.3 + dz); g.add(tr); });
    [[-0.9, -0.1], [0.5, -0.3]].forEach(([dx, dz]) => { const ch = new Mesh(track(roundedBox(0.7, 0.22, 0.7, 0.08)), M('#15101f', 0.4, 0.3)); ch.position.set(4.2 + dx, 0.31, -1.3 + dz); g.add(ch); });
    const led = new Mesh(track(new SphereGeometry(0.09, 12, 10)), glow(cols.coral, 1.6)); led.position.set(5.2, 0.28, -0.7); g.add(led);
    const pin = new Mesh(track(new CylinderGeometry(0.07, 0.07, 1.3, 10)), M('#8a82a0', 0.3, 0.8)); pin.position.set(3.1, 0.8, -1.9); g.add(pin);
    const ball = new Mesh(track(new SphereGeometry(0.2, 20, 16)), glow(cols.sky, 1.1)); ball.position.set(3.1, 1.52, -1.9); g.add(ball);
    g.add(halo(cols.sky, 1.6, 3.1, 1.52, -1.9, 0.7)); g.add(blobPlane(3.6, 2.6, 4.2, -1.3));
  }

  // ---------- puntos interactivos y ficha de parte ----------
  let selected = null;
  const hotspotDefs = [
    { id: 'sensor', node: sensorAnchor }, { id: 'motor', node: motorAnchor }, { id: 'board', node: boardAnchor },
    { id: 'blocks', node: blocksAnchor }, { id: 'screen', node: screenAnchor },
    { id: 'drone', node: droneAnchor, grp: droneG }, { id: 'vr', node: vrAnchor, grp: vrG }
  ];
  const layer = document.createElement('div'); layer.className = 'lab-hots'; container.appendChild(layer);
  const hots = hotspotDefs.map(h => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lab-hot'; b.setAttribute('aria-label', 'Ver detalle: ' + INFO[h.id].name); b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<i aria-hidden="true"></i><span>' + INFO[h.id].name + '</span>';
    b.addEventListener('click', e => { e.stopPropagation(); selectPart(selected === h.id ? null : h.id); });
    layer.appendChild(b); return { ...h, el: b, v: new Vector3() };
  });
  const card = document.createElement('div'); card.className = 'lab-card'; card.hidden = true; card.setAttribute('role', 'region'); card.setAttribute('aria-label', 'Detalle de la parte');
  card.innerHTML = '<button type="button" class="lab-card-x" aria-label="Cerrar detalle">×</button><h2></h2><p></p>';
  container.appendChild(card);
  card.querySelector('.lab-card-x').addEventListener('click', () => selectPart(null));
  const onKey = e => { if (e.key === 'Escape' && selected) selectPart(null); };
  document.addEventListener('keydown', onKey);

  // ---------- estado, animaciones y render ----------
  let level = opts.level || 'prim', alive = true, visible = true, raf = 0, running = false;
  const tweens = [];
  const tween = (dur, update, done, delay = 0) => tweens.push({ t0: performance.now() + delay, dur, update, done });
  const cam = { x: 0, y: 0, z: 0, az: 0.62, el: 0.4, zoom: 1 };
  const goal = { az: 0.62, el: 0.4 }; // lo que el usuario orbita; la cámara lo sigue suavizada
  let explode = 0, aspect = 1, pw = 1, ph = 1, last = performance.now(), hasDrag = false, idleT = 0;
  const focusOf = () => { const f = FRAMING[level]; return { x: f.x, y: f.y, z: f.z }; };
  Object.assign(cam, focusOf());

  function applyExplode() {
    parts.forEach(p => { const e = ease.inOut(clamp((explode - p.delay) / (1 - p.delay * 0.9), 0, 1)); p.g.position.copy(p.base).addScaledVector(p.dir, p.dist * e); });
  }
  function applyCamera(dt) {
    const small = pw < 520, narrow = aspect < 0.9, wide = pw >= 900;
    const base = wide ? 27 / (aspect * 0.72) : 27 / aspect;
    const dist = clamp(base * (wide ? 1.1 : 0.9), wide ? 23 : 16, 44) * (small ? 1.12 : 1) * cam.zoom;
    const k = Math.min(1, dt * 5);
    goal.el = clamp(goal.el, 0.12, 0.85);
    cam.az += (goal.az - cam.az) * k; cam.el += (goal.el - cam.el) * k;
    const az = cam.az + FRAMING[level].yaw, el = cam.el;
    camera.position.set(cam.x + Math.sin(az) * Math.cos(el) * dist, cam.y + Math.sin(el) * dist, cam.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(cam.x - (wide ? 0 : narrow ? 0.3 : 1.0), cam.y - (narrow ? 0.4 : small ? -0.35 : 0), cam.z);
    camera.aspect = aspect;
    if (wide) camera.setViewOffset(pw, ph, -pw * 0.2, ph * 0.08, pw, ph); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function placeHotspots() {
    hots.forEach(h => {
      h.node.getWorldPosition(h.v); h.v.project(camera);
      const on = !running && (!h.grp || h.grp.visible) && h.v.z < 1 && Math.abs(h.v.x) < 1.05 && Math.abs(h.v.y) < 1.05;
      h.el.style.visibility = on ? 'visible' : 'hidden';
      if (on) h.el.style.transform = `translate(${((h.v.x + 1) / 2 * pw).toFixed(1)}px,${((1 - h.v.y) / 2 * ph).toFixed(1)}px)`;
    });
  }
  function selectPart(id) {
    selected = id;
    hots.forEach(h => h.el.setAttribute('aria-pressed', String(h.id === id)));
    if (id) { card.querySelector('h2').textContent = INFO[id].name; card.querySelector('p').textContent = INFO[id].text; card.hidden = false; } else card.hidden = true;
    const from = { x: cam.x, y: cam.y, z: cam.z, zoom: cam.zoom }, v = new Vector3();
    let target;
    if (id) { hots.find(h => h.id === id).node.getWorldPosition(v); target = { x: v.x, y: v.y, z: v.z, zoom: 0.85 }; } else target = { ...focusOf(), zoom: 1 };
    if (reduce) Object.assign(cam, target); else tween(800, t => { const e = ease.inOut(t); for (const k of Object.keys(target)) cam[k] = from[k] + (target[k] - from[k]) * e; });
    requestRender();
  }
  function setIcons() {
    const seq = ICONS[level];
    blocks.forEach((b, i) => {
      if (b.face.material.map) b.face.material.map.dispose();
      b.face.material.map = iconTexture(seq[i], blockCols[i] === cols.white ? mix(cols.plum, '#fff', 0.1) : blockCols[i]); b.face.material.needsUpdate = true;
    });
    if (screenFace.material.map) screenFace.material.map.dispose();
    screenFace.material.map = screenTexture(level, cols); screenFace.material.needsUpdate = true;
  }
  function showAccessories(animate) {
    Object.entries(accessories).forEach(([k, g]) => {
      if (k === level) { g.visible = true; if (animate && !reduce) { g.scale.setScalar(0.01); tween(520, t => g.scale.setScalar(0.01 + 0.99 * ease.back(t)), null, 120); } else g.scale.setScalar(1); }
      else if (g.visible) { if (animate && !reduce) tween(200, t => g.scale.setScalar(1 - ease.out(t) * 0.99), () => { g.visible = false; }); else g.visible = false; }
    });
  }

  function showExtras(animate) {
    Object.entries(extras).forEach(([k, g]) => {
      const on = EXTRA_LEVELS[k].includes(level);
      if (on && !g.visible) { g.visible = true; if (animate && !reduce) { g.scale.setScalar(0.01); tween(520, t => g.scale.setScalar((k === 'drone' ? 1.1 : 1) * (0.01 + 0.99 * ease.back(t))), null, 200); } else g.scale.setScalar(k === 'drone' ? 1.1 : 1); }
      else if (!on && g.visible) { if (animate && !reduce) tween(200, t => g.scale.setScalar((k === 'drone' ? 1.1 : 1) * (1 - ease.out(t) * 0.99)), () => { g.visible = false; }); else g.visible = false; }
    });
    droneShadow.visible = droneG.visible;
  }
  function loop(now) {
    raf = 0; if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let active = false;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i], p = (now - tw.t0) / tw.dur;
      if (p < 0) { active = true; continue; }
      tw.update(Math.min(1, p));
      if (p >= 1) { tweens.splice(i, 1); if (tw.done) tw.done(); } else active = true;
    }
    if (!reduce) {
      idleT += dt;
      if (!hasDrag && !selected) goal.az += Math.sin(idleT * 0.35) * dt * 0.05; // vaivén lento mientras nadie interactúa
      const pos = dots.geometry.attributes.position;
      for (let i = 0; i < N; i++) { let y = pos.getY(i) + dt * 0.18; if (y > 7) y = 0; pos.setY(i, y); pos.setX(i, pos.getX(i) + Math.sin(idleT * 0.4 + seed[i]) * dt * 0.12); }
      pos.needsUpdate = true;
      ring.material.opacity = 0.45 + Math.sin(idleT * 1.6) * 0.15; ring2.rotation.z += dt * 0.08;
      bulb.material.emissiveIntensity = 0.8 + Math.sin(idleT * 3) * 0.35;
      placeDrone(0.9 + idleT * 0.45); rotors.forEach((r, i) => { r.rotation.y += dt * 38 * (i % 2 ? 1 : -1); }); droneShadow.visible = droneG.visible;
      vrG.rotation.y = 1.1 + Math.sin(idleT * 0.6) * 0.22; arms.forEach((a, i) => { a.rotation.x = -1.15 + Math.sin(idleT * 1.1 + i) * 0.12; });
      holo.rotation.y += dt * 0.7; orbit.rotation.z += dt * 1.4; holo.position.y = 1.6 + Math.sin(idleT * 1.4) * 0.08;
      active = true;
    }
    if (Math.abs(goal.az - cam.az) > 0.001 || Math.abs(goal.el - cam.el) > 0.001) active = true;
    applyExplode(); applyCamera(dt || 0.016); renderer.render(scene, camera); placeHotspots();
    if (active && visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  const requestRender = () => { if (!raf && alive && visible) { last = performance.now(); raf = requestAnimationFrame(loop); } };

  function setLevel(id, animate = true) {
    if (!ICONS[id]) return;
    const prev = level; level = id; setIcons(); showAccessories(animate); showExtras(animate);
    const from = { x: cam.x, y: cam.y, z: cam.z }, to = focusOf();
    if (!selected) { if (animate && !reduce) tween(700, t => { const e = ease.inOut(t); for (const k of Object.keys(to)) cam[k] = from[k] + (to[k] - from[k]) * e; }); else Object.assign(cam, to); }
    if (animate && !reduce && prev !== id) blocks.forEach((b, i) => tween(260, t => { b.g.position.y = Math.sin(t * Math.PI) * 0.35; }, () => { b.g.position.y = 0; }, i * 70));
    requestRender();
  }
  function setExplode(on) {
    const from = explode, to = on ? 1 : 0;
    if (reduce) { explode = to; requestRender(); return; }
    tween(1100, t => { explode = from + (to - from) * t; });
    requestRender();
  }

  // Secuencia: los bloques se activan uno a uno y el robot responde
  function run() {
    if (running) return Promise.resolve();
    if (explode > 0.05) { setExplode(false); return new Promise(r => setTimeout(() => r(run()), 1250)); }
    running = true; if (selected) selectPart(null);
    const step = 520, startX = 0.8, gearBase = gear.rotation.z;
    const pulse = (b, on) => { b.mat.emissiveIntensity = on ? 0.7 : 0; b.g.position.y = on ? 0.16 : 0; };
    const acc = accessories[level];
    return new Promise(done => {
      if (reduce) {
        blocks.forEach((b, i) => setTimeout(() => { blocks.forEach(x => pulse(x, false)); pulse(b, true); requestRender(); }, i * 450));
        setTimeout(() => { blocks.forEach(x => pulse(x, false)); running = false; requestRender(); done(); }, blocks.length * 450 + 300);
        return;
      }
      blocks.forEach((b, i) => setTimeout(() => { blocks.forEach(x => pulse(x, false)); pulse(b, true); requestRender(); }, i * step));
      const total = blocks.length * step; let lastX = startX;
      const roll = x => { wheels.forEach(w => { w.rotation.z -= (x - lastX) / 0.66; }); lastX = x; robot.position.x = x; robotShadow.position.x = x + 0.1; };
      tween(900, t => { roll(startX + ease.inOut(t) * 1.7); gear.rotation.z = gearBase + (lastX - startX) * 3; }, null, step * 0.9);
      tween(700, t => { robot.rotation.y = Math.sin(t * Math.PI) * 0.5; }, null, step * 2.1);
      tween(900, t => { roll(startX + 1.7 - ease.inOut(t) * 1.7); }, null, step * 3.0);
      if (acc.userData && acc.userData.a) tween(total, t => { acc.userData.a.rotation.z = t * 5; acc.userData.b.rotation.z = 0.2 - t * 5 * 0.9; });
      if (acc.userData && acc.userData.waves) acc.userData.waves.forEach((w, i) => tween(560, t => { w.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.18); w.material.opacity = (0.8 - i * 0.2) * (0.6 + 0.4 * Math.sin(t * Math.PI)); }, null, step * (1.2 + i * 0.25)));
      eyes.forEach(e => tween(total, t => { e.material.emissiveIntensity = 1.2 + Math.sin(t * Math.PI * 4) * 0.7; }));
      setTimeout(() => { blocks.forEach(x => pulse(x, false)); robot.position.x = startX; robot.rotation.y = 0; running = false; requestRender(); done(); }, total + 500);
      requestRender();
    });
  }

  // Ensamblado inicial: el robot llega desarmado, se arma y responde una vez
  function intro() {
    if (reduce) return;
    explode = 1; blocks.forEach((b, i) => { b.g.position.y = 4; tween(620, t => { b.g.position.y = 4 * (1 - ease.out(t)); }, () => { b.g.position.y = 0; }, 250 + i * 160); });
    tween(1500, t => { explode = 1 - ease.inOut(t); }, null, 500);
    setTimeout(() => { if (alive && !selected && explode < 0.05) run(); }, 2900);
  }

  function resize() {
    pw = Math.max(1, container.clientWidth); ph = Math.max(1, container.clientHeight); aspect = pw / ph;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75)); renderer.setSize(pw, ph, false); requestRender();
  }
  const ro = new ResizeObserver(resize); ro.observe(container);
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestRender(); }, { threshold: 0.02 }); io.observe(container);

  // Orbitar arrastrando (en táctil solo en horizontal, para no bloquear el scroll) y volver con doble clic
  let drag = null;
  const onDown = e => { if (e.target.closest('.lab-hot,.lab-card')) return; drag = { x: e.clientX, y: e.clientY, az: goal.az, el: goal.el, id: e.pointerId, touch: e.pointerType === 'touch' }; };
  const onMove = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!hasDrag && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    if (!hasDrag) { hasDrag = true; try { container.setPointerCapture(e.pointerId); } catch (_) {} container.classList.add('is-dragging'); }
    goal.az = drag.az - dx * 0.008; if (!drag.touch) goal.el = drag.el + dy * 0.005;
    requestRender();
  };
  const onUp = () => { drag = null; hasDrag = false; container.classList.remove('is-dragging'); };
  const onDbl = () => { goal.az = 0.62; goal.el = 0.4; requestRender(); };
  container.addEventListener('pointerdown', onDown); container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerup', onUp); container.addEventListener('pointercancel', onUp); container.addEventListener('dblclick', onDbl);
  const onVis = () => { if (!document.hidden) requestRender(); };
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); opts.onLost && opts.onLost(); });

  setIcons(); showAccessories(false); showExtras(false); resize(); applyExplode(); applyCamera(0.016); renderer.render(scene, camera); placeHotspots();
  requestAnimationFrame(() => { opts.onReady && opts.onReady(); intro(); requestRender(); });

  return {
    setLevel, run, resize, setExplode,
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); document.removeEventListener('keydown', onKey);
      container.removeEventListener('pointerdown', onDown); container.removeEventListener('pointermove', onMove); container.removeEventListener('pointerup', onUp); container.removeEventListener('pointercancel', onUp); container.removeEventListener('dblclick', onDbl);
      disposables.forEach(d => { if (d.map) d.map.dispose(); d.dispose && d.dispose(); });
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      if (scene.environment) scene.environment.dispose();
      renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); canvas.remove(); layer.remove(); card.remove();
    }
  };
}

// ---------- Mini colegio 3D del recorrido: crece con la propuesta y se puede recorrer jugando ----------
// Cada nivel elegido levanta un edificio, los estudiantes llegan al patio y cada programa abre una estación.
// El robot es el avatar: toca el suelo o un edificio y va hacia allí; recoge «ideas» para jugar. Arrastrar o usar ◀ ▶ gira el colegio.
const TIPS = ['', 'Cada nivel que eliges levanta un edificio.', 'Tus estudiantes llegan al patio del colegio.', 'Cada programa abre una estación nueva.', 'Ajusta los detalles y tu colegio se prepara.', 'Tu colegio está listo para innovar.'];
const SPOTS = {
  hall: ['Tu colegio', 'Todo empieza aquí: eligen niveles, programas y equipos a la medida de la institución.'],
  pre: ['Preprimaria', 'Juegan con secuencias y descubren cómo se mueve un robot.'],
  prim: ['Primaria', 'Construyen, programan y prueban sus propias ideas.'],
  bas: ['Básico', 'Suman sensores y resuelven retos de programación y construcción.'],
  bach: ['Bachillerato', 'Trabajan con electrónica y datos para crear proyectos con propósito.'],
  robotics: ['Estación de robótica', 'Los equipos se comparten entre grupos en horarios distintos.'],
  electronics: ['Estación de electrónica', 'Circuitos, sensores y prototipos para crear sus propios inventos.'],
  drones: ['Estación de drones', 'Programan rutas de vuelo y aprenden sobre control y seguridad.'],
  immersive: ['Realidad virtual', 'Exploran lugares y conceptos que no caben en un salón.']
};
const PROG_STATION = { tale: 'robotics', master: 'robotics', spike: 'robotics', electronics: 'electronics', drones: 'drones', immersive: 'immersive' };

export function createMascot(container, opts = {}) {
  const cols = { navy: cssVar('--navy', '#45335f'), plum: cssVar('--plum', '#685599'), coral: cssVar('--coral', '#ef8556'), sky: cssVar('--sky', '#5fbad6'), white: '#f4f0fa', dark: '#241d38' };
  cols.plumLight = mix(cols.plum, '#ffffff', 0.28); cols.screen = mix(cols.navy, '#000000', 0.35);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const canvas = renderer.domElement; canvas.className = 'mascot-canvas'; container.appendChild(canvas);
  const scene = new Scene(), camera = new PerspectiveCamera(30, 1, 0.1, 120);
  try { const pm = new PMREMGenerator(renderer), env = new RoomEnvironment(); scene.environment = pm.fromScene(env, 0.04).texture; scene.environmentIntensity = 0.55; pm.dispose(); } catch (e) { /* luces directas */ }
  scene.add(new HemisphereLight(0xfff1e0, new Color(cols.plum), 0.75));
  const key = new DirectionalLight(0xfff4ec, 2.5); key.position.set(-5, 10, 7); scene.add(key);
  const fillL = new PointLight(new Color(cols.sky), 24, 40, 1.6); fillL.position.set(9, 4, 6); scene.add(fillL);
  const rimL = new PointLight(new Color(cols.coral), 20, 34, 1.6); rimL.position.set(-7, 5, -9); scene.add(rimL);
  const disp = []; const track = o => { disp.push(o); return o; };
  const phys = (hex, r, m, ex = {}) => track(new MeshPhysicalMaterial({ color: hex, roughness: r, metalness: m, ...ex }));
  const std = (hex, r = 0.6, m = 0.05, ex = {}) => track(new MeshStandardMaterial({ color: hex, roughness: r, metalness: m, ...ex }));
  const glw = (hex, k = 1) => std(hex, 0.35, 0, { emissive: new Color(hex), emissiveIntensity: k });
  const white = phys(cols.white, 0.4, 0.05, { clearcoat: 0.6 }), darkM = std(cols.dark, 0.5, 0.4), metal = std('#8a82a0', 0.3, 0.8);
  const blobT = track(blobTexture(0.6));
  const blob = (w, d, x, z, a = 0.8) => { const m = new Mesh(track(new PlaneGeometry(w, d)), track(new MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false, opacity: a }))); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); return m; };
  const halo = (hex, size) => { const sp = new Sprite(track(new SpriteMaterial({ map: track(glowTexture(hex)), blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 }))); sp.scale.set(size, size, 1); return sp; };
  const labelSprite = text => {
    const c = document.createElement('canvas'); c.width = 320; c.height = 110; const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,.96)'; x.beginPath(); x.roundRect(6, 10, 308, 90, 45); x.fill();
    x.fillStyle = cols.coral; x.beginPath(); x.arc(56, 55, 26, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '800 40px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('+', 56, 57);
    x.fillStyle = cols.navy; x.font = '800 38px system-ui, sans-serif'; x.textAlign = 'left'; x.fillText(text, 96, 57);
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; const sp = new Sprite(track(new SpriteMaterial({ map: track(t), transparent: true })));
    sp.scale.set(2.5, 0.86, 1); return sp;
  };
  const world = new Group(); scene.add(world);
  const FILL0 = 24, RIM0 = 20;

  // suelo y plataforma
  const floorM = new Mesh(track(new PlaneGeometry(80, 80)), track(new MeshBasicMaterial({ map: track(floorTexture('rgba(150,130,210,.4)')), transparent: true, depthWrite: false })));
  floorM.rotation.x = -Math.PI / 2; floorM.position.y = -0.42; world.add(floorM);
  const platSide = std('#d9c08e', 0.7, 0.05), platTop = std('#3fb06a', 0.7, 0.02, { envMapIntensity: 0.25, map: track(platformTexture('#d4d4d4', '#ffffff')) }), platRim = std('#b99a62', 0.7, 0.05);
  const plat = new Mesh(track(new CylinderGeometry(8.2, 8.4, 0.4, 72)), [platSide, platTop, platRim]);
  plat.position.y = -0.2; world.add(plat);
  const pring = new Mesh(track(new RingGeometry(7.8, 7.92, 90)), track(new MeshBasicMaterial({ color: cols.sky, transparent: true, opacity: 0.7, side: DoubleSide }))); pring.rotation.x = -Math.PI / 2; pring.position.y = 0.012; world.add(pring);
  const ripple = new Mesh(track(new RingGeometry(7.9, 8.15, 90)), track(new MeshBasicMaterial({ color: cols.coral, transparent: true, opacity: 0, side: DoubleSide }))); ripple.rotation.x = -Math.PI / 2; ripple.position.y = 0.02; ripple.visible = false; world.add(ripple);
  const pickables = [], spots = {};
  const pick = (obj, k) => { obj.traverse(o => { if (o.isMesh) { o.userData.key = k; pickables.push(o); } }); };
  const edgesOf = (geo, color) => new LineSegments(track(new EdgesGeometry(geo)), track(new LineBasicMaterial({ color, transparent: true, opacity: 0.8 })));

  // ---- espacios que se habilitan con cada paso: todo lo "gated" aparece al llegar a su paso ----
  const gates = [];
  const gate = (obj, n) => { obj.userData.base = obj.scale.x || 1; obj.scale.setScalar(0.01); obj.visible = false; gates.push({ obj, n, t: 0 }); return obj; };
  const leafA = std('#5fa889', 0.7, 0), leafB = std('#7cc4a4', 0.7, 0), trunkM = std('#6b4f3a', 0.8, 0);
  const tree = (x, z, sc) => { const g = new Group(); g.position.set(x, 0, z); g.scale.setScalar(sc); const t = new Mesh(track(new CylinderGeometry(0.09, 0.12, 0.7, 8)), trunkM); t.position.y = 0.35; g.add(t); const a = new Mesh(track(new SphereGeometry(0.55, 14, 10)), leafA); a.position.y = 1.0; g.add(a); const b = new Mesh(track(new SphereGeometry(0.4, 12, 9)), leafB); b.position.set(0.25, 1.4, 0.1); g.add(b); world.add(g); g.add(blob(1.6, 1.6, 0, 0, 0.5)); return g; };
  [[-7, -1.2, 1.1, 2], [7, -1.2, 1.1, 2], [-6.6, -4.8, 1.2, 4], [6.6, -4.8, 1.2, 4], [0, -7.3, 1.2, 4]].forEach(([x, z, sc, n]) => gate(tree(x, z, sc), n));
  const lampM = glw('#ffe7b0', 1.3);
  [[-1.0, 0.8], [1.0, 0.8]].forEach(([x, z]) => { const g = new Group(); g.position.set(x, 0, z); const p = new Mesh(track(new CylinderGeometry(0.04, 0.05, 1.4, 8)), metal); p.position.y = 0.7; g.add(p); const l = new Mesh(track(new SphereGeometry(0.11, 12, 8)), lampM); l.position.y = 1.45; g.add(l); const hl = halo('#ffe7b0', 0.9); hl.position.y = 1.45; g.add(hl); world.add(g); gate(g, 2); });

  // ---- edificios por nivel: se levantan al elegirse; si no, queda el lote en construcción ----
  const winM = glw('#ffe7b0', 0.55), hallRoof = std('#d9744f', 0.65, 0.05);
  const wingDefs = { pre: { x: -4.7, z: -3.4, w: 2.8, h: 1.3, col: cols.sky, name: 'Preprimaria' }, prim: { x: 4.7, z: -3.4, w: 2.8, h: 1.8, col: cols.coral, name: 'Primaria' }, bas: { x: -3.0, z: -6.1, w: 2.8, h: 2.2, col: cols.plumLight, name: 'Básico' }, bach: { x: 3.0, z: -6.1, w: 2.8, h: 2.7, col: cols.plum, name: 'Bachillerato' } };
  const wings = {};
  Object.entries(wingDefs).forEach(([id, d]) => {
    const g = new Group(); g.position.set(d.x, 0, d.z); world.add(g);
    const solid = new Group(); g.add(solid);
    const bodyM = phys(d.col, 0.4, 0.04, { clearcoat: 0.7, clearcoatRoughness: 0.2 }); const body = new Mesh(track(roundedBox(d.w, d.h, 2.0, 0.16)), bodyM); body.position.y = d.h / 2; solid.add(body);
    const roof = new Mesh(track(new BoxGeometry(d.w + 0.24, 0.12, 2.24)), hallRoof); roof.position.y = d.h + 0.06; solid.add(roof);
    const band = new Mesh(track(new BoxGeometry(d.w + 0.02, 0.1, 2.02)), white); band.position.y = d.h - 0.18; solid.add(band);
    const rows = Math.max(1, Math.floor((d.h - 0.3) / 0.6));
    for (let r = 0; r < rows; r++) for (let c = -1; c <= 1; c++) { const w = new Mesh(track(new BoxGeometry(0.46, 0.32, 0.04)), winM); w.position.set(c * 0.82, 0.55 + r * 0.6, 1.02); solid.add(w); }
    const dr = new Mesh(track(roundedBox(0.4, 0.5, 0.08, 0.04, 2)), darkM); dr.position.set(0, 0.25, 1.03); solid.add(dr);
    // lote en construcción: losa, conos y cartel
    const lot = new Group(); g.add(lot);
    const slabGeo = track(roundedBox(d.w, 0.08, 2.0, 0.1, 2));
    const slab = new Mesh(slabGeo, track(new MeshBasicMaterial({ color: d.col, transparent: true, opacity: 0.45 }))); slab.position.y = 0.05; lot.add(slab);
    const edge = edgesOf(track(new BoxGeometry(d.w, 0.08, 2.0)), d.col); edge.position.y = 0.05; lot.add(edge);
    [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]].forEach(([sx, sz]) => { const cn = new Mesh(track(new ConeGeometry(0.11, 0.3, 10)), std(sx * sz > 0 ? '#ffffff' : cols.coral, 0.5, 0)); cn.position.set(sx * (d.w / 2 - 0.15), 0.23, sz); lot.add(cn); });
    const lab = labelSprite(d.name); lab.position.set(0, 1.25, 0.2); lot.add(lab);
    pick(solid, id); pick(lot, id);
    spots[id] = { approach: new Vector3(d.x, 0, d.z + 2.1) };
    wings[id] = { g, solid, lot, lab, bodyM, c0: new Color(mix(d.col, '#d9d0bf', 0.65)), c1: new Color(d.col), t: 0, want: 0 };
    solid.scale.y = 0.01; solid.visible = false;
  });

  // ---- edificio principal: escuela moderna (techo plano, ventanales, marquesina, paneles solares) ----
  const hall = new Group(); hall.position.set(0, 0, -3.7); world.add(hall);
  const hallWall = phys('#fff1d6', 0.55, 0.02, { clearcoat: 0.3 }), glassM = phys('#bfe6f5', 0.2, 0.2, { clearcoat: 1, emissive: new Color(cols.sky), emissiveIntensity: 0.0 });
  const hb = new Mesh(track(roundedBox(5.8, 2.4, 2.4, 0.12)), hallWall); hb.position.y = 1.2; hall.add(hb);
  [-1, 1].forEach(sd => { const gl = new Mesh(track(roundedBox(1.9, 0.62, 0.07, 0.05, 2)), glassM); gl.position.set(sd * 1.85, 1.65, 1.22); hall.add(gl); for (let k = 1; k < 3; k++) { const mu = new Mesh(track(new BoxGeometry(0.04, 0.62, 0.09)), white); mu.position.set(sd * 1.85 + (k - 2) * 0.63 + 0.0, 1.65, 1.23); hall.add(mu); } const lo = new Mesh(track(roundedBox(1.9, 0.42, 0.07, 0.05, 2)), glassM); lo.position.set(sd * 1.85, 0.62, 1.22); hall.add(lo); });
  const stripeM = phys('#ffd36e', 0.45, 0.04, { clearcoat: 0.7 });
  const stripe = new Mesh(track(new BoxGeometry(5.84, 0.16, 2.44)), stripeM); stripe.position.y = 1.08; hall.add(stripe);
  const hroof = new Mesh(track(new BoxGeometry(6.0, 0.14, 2.6)), hallRoof); hroof.position.y = 2.47; hall.add(hroof);
  const neonM = glw(cols.sky, 1.5), neons = [];
  const neon = (parent, w, x, y, z, d = 0.05) => { const n = new Mesh(track(new BoxGeometry(w, 0.05, d)), neonM); n.position.set(x, y, z); parent.add(n); neons.push(n); return n; };
  neon(hall, 6.0, 0, 2.56, 1.31); neon(hall, 6.0, 0, 2.56, -1.31); neon(hall, 0.05, -3.0, 2.56, 0, 2.6); neon(hall, 0.05, 3.0, 2.56, 0, 2.6);
  const holoRing = new Mesh(track(new TorusGeometry(1.2, 0.025, 8, 60)), glw(cols.sky, 1.4)); holoRing.rotation.x = Math.PI / 2; holoRing.position.set(0, 3.9, -0.2); hall.add(holoRing); const holoHalo = halo(cols.sky, 3.2); holoHalo.position.copy(holoRing.position); hall.add(holoHalo);
  const canopy = new Mesh(track(roundedBox(2.4, 0.14, 1.3, 0.06, 2)), phys(cols.plum, 0.35, 0.05, { clearcoat: 0.8 })); canopy.position.set(0, 1.5, 1.75); hall.add(canopy);
  [-1.0, 1.0].forEach(x => { const c = new Mesh(track(new CylinderGeometry(0.05, 0.05, 1.45, 10)), metal); c.position.set(x, 0.75, 2.3); hall.add(c); });
  const door = new Mesh(track(roundedBox(1.0, 1.25, 0.08, 0.05, 2)), glassM); door.position.set(0, 0.63, 1.23); hall.add(door);
  const dstrip = new Mesh(track(new BoxGeometry(0.06, 1.2, 0.02)), glw(cols.sky, 0.8)); dstrip.position.set(0, 0.63, 1.28); hall.add(dstrip);
  [0, 1].forEach(k => { const st = new Mesh(track(new BoxGeometry(2.0 - k * 0.3, 0.1, 0.5)), std('#cfc6e4', 0.7, 0)); st.position.set(0, 0.05 + k * 0.1, 1.6 + (1 - k) * 0.35); hall.add(st); });
  const signC = document.createElement('canvas'); signC.width = 512; signC.height = 128; { const x = signC.getContext('2d'); x.fillStyle = cols.navy; x.beginPath(); x.roundRect(0, 0, 512, 128, 28); x.fill(); x.fillStyle = '#fff'; x.font = '800 62px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Tu colegio', 256, 68); x.fillStyle = cols.coral; x.beginPath(); x.arc(52, 64, 14, 0, 7); x.fill(); x.fillStyle = cols.sky; x.beginPath(); x.arc(460, 64, 14, 0, 7); x.fill(); }
  const signT = new CanvasTexture(signC); signT.colorSpace = SRGBColorSpace; const sign = new Mesh(track(new PlaneGeometry(2.3, 0.58)), new MeshBasicMaterial({ map: track(signT), transparent: true })); sign.position.set(0, 2.05, 1.24); hall.add(sign); disp.push(sign.material);
  [-1.9, 0, 1.9].forEach((x, i) => { const sp = new Group(); sp.position.set(x, 2.7, -0.2); sp.rotation.x = -0.22; const pn = new Mesh(track(new BoxGeometry(1.5, 0.05, 0.9)), phys('#2a5f9e', 0.25, 0.5, { clearcoat: 0.8, emissive: new Color('#2a5f9e'), emissiveIntensity: 0.15 })); sp.add(pn); hall.add(sp); gate(sp, 4); });
  const path = new Mesh(track(roundedBox(1.4, 0.04, 4.6, 0.05, 2)), std('#cfc6e4', 0.8, 0)); path.position.set(0, 0.03, -0.1); gate(path, 2); world.add(path);
  // asta con bandera en la plaza; sube al terminar
  const poleG = new Group(); poleG.position.set(2.5, 0, -1.2); world.add(poleG);
  const pole = new Mesh(track(new CylinderGeometry(0.035, 0.04, 3.0, 8)), metal); pole.position.y = 1.5; poleG.add(pole);
  const flag = new Mesh(track(new BoxGeometry(0.75, 0.45, 0.03)), glw(cols.coral, 0.5)); flag.position.set(0.4, 1.0, 0); poleG.add(flag);
  const poleBase = new Mesh(track(new CylinderGeometry(0.18, 0.2, 0.12, 14)), white); poleBase.position.y = 0.06; poleG.add(poleBase);
  pick(hall, 'hall'); spots.hall = { approach: new Vector3(0, 0, -0.6) };
  world.add(blob(7, 3.8, 0, -3.7, 0.6));
  const DOOR = new Vector3(0, 0, -2.4);

  Object.values(wingDefs).forEach((d, i) => { const g = Object.values(wings)[i].solid; neon(g, d.w + 0.24, 0, d.h + 0.14, 1.12); });

  // ---- personas: cada una hace algo con sentido ----
  const skins = ['#e9b891', '#c98f66', '#f0c9a6', '#a56b48'], shirts = [cols.coral, cols.sky, cols.plumLight, '#f4f0fa', '#8e7bbd'], hairs = ['#3a2723', '#1f1714', '#6b4a2f', '#2a1d1a'];
  function makePawn(i, vr) {
    const g = new Group();
    [-0.07, 0.07].forEach(x => { const l = new Mesh(track(new CapsuleGeometry(0.055, 0.14, 3, 8)), phys(cols.navy, 0.5, 0.05)); l.position.set(x, 0.15, 0); g.add(l); });
    const body = new Mesh(track(new CapsuleGeometry(0.15, 0.24, 4, 10)), phys(shirts[i % shirts.length], 0.45, 0.02, { clearcoat: 0.4 })); body.position.y = 0.46; g.add(body);
    const headG = new Group(); headG.position.y = 0.86; g.add(headG);
    headG.add(new Mesh(track(new SphereGeometry(0.14, 14, 10)), phys(skins[i % skins.length], 0.5, 0, { clearcoat: 0.2 })));
    const hair = new Mesh(track(new SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52)), std(hairs[i % hairs.length], 0.6, 0)); hair.position.y = 0.02; hair.rotation.x = -0.3; headG.add(hair);
    if (vr) { const hs = new Mesh(track(roundedBox(0.3, 0.14, 0.16, 0.05, 2)), white); hs.position.set(0, 0.0, 0.12); headG.add(hs); const vz = new Mesh(track(new BoxGeometry(0.22, 0.07, 0.02)), glw(cols.sky, 1.5)); vz.position.set(0, 0, 0.205); headG.add(vz); }
    const arms = [-1, 1].map(sd => { const a = new Group(); a.position.set(sd * 0.19, 0.62, 0); const up = new Mesh(track(new CapsuleGeometry(0.045, 0.2, 3, 8)), phys(shirts[i % shirts.length], 0.45, 0.02)); up.position.y = -0.13; a.add(up); const hd = new Mesh(track(new SphereGeometry(0.05, 8, 6)), phys(skins[i % skins.length], 0.5, 0)); hd.position.y = -0.27; a.add(hd); if (vr) { const c = new Mesh(track(new CapsuleGeometry(0.025, 0.07, 3, 6)), white); c.position.set(0, -0.3, 0.02); a.add(c); } g.add(a); return a; });
    g.scale.setScalar(0.01); g.visible = false; world.add(g);
    return { g, headG, arms, t: 0, want: 0, sc: 0.95 + Math.random() * 0.15, ph: Math.random() * 6.28, act: 'idle', home: new Vector3(), face: 0, from: new Vector3(), prog: Math.random(), speed: 0.3 + Math.random() * 0.25, station: null };
  }

  // ---- estaciones: cada programa abre su espacio de trabajo ----
  const stDefs = { robotics: { x: -5.0, z: 1.6, col: cols.coral, name: 'Robótica' }, electronics: { x: -2.1, z: 4.3, col: cols.sky, name: 'Electrónica' }, drones: { x: 2.1, z: 4.3, col: cols.plumLight, name: 'Drones' }, immersive: { x: 5.0, z: 1.6, col: cols.plum, name: 'Realidad virtual' } };
  const stations = {}, holoGroups = [], leds = [];
  let miniBot = null;
  Object.entries(stDefs).forEach(([id, d]) => {
    const g = new Group(); g.position.set(d.x, 0, d.z); world.add(g);
    const pad = new Mesh(track(new CylinderGeometry(1.45, 1.5, 0.1, 44)), phys(d.col, 0.45, 0.05, { clearcoat: 0.5 })); pad.position.y = 0.05; pad.material.transparent = true; g.add(pad);
    const gring = new Mesh(track(new RingGeometry(1.5, 1.62, 44)), track(new MeshBasicMaterial({ color: d.col, transparent: true, opacity: 0.6, side: DoubleSide }))); gring.rotation.x = -Math.PI / 2; gring.position.y = 0.02; g.add(gring);
    const prop = new Group(); prop.position.y = 0.1; g.add(prop);
    if (id === 'robotics') {
      const bot = new Group(); prop.add(bot);
      const b = new Mesh(track(roundedBox(0.95, 0.32, 0.62, 0.12)), white); b.position.y = 0.38; bot.add(b);
      const sh = new Mesh(track(roundedBox(0.6, 0.26, 0.5, 0.12)), phys(cols.plum, 0.35, 0.1, { clearcoat: 1 })); sh.position.y = 0.66; bot.add(sh);
      [[0.32, 0.36], [0.32, -0.36], [-0.32, 0.36], [-0.32, -0.36]].forEach(([x, z]) => { const w = new Mesh(track(new CylinderGeometry(0.17, 0.17, 0.14, 18)), std('#17121f', 0.85)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.2, z); bot.add(w); });
      const e = new Mesh(track(new SphereGeometry(0.06, 10, 8)), glw(cols.sky, 1.4)); e.position.set(0.5, 0.4, 0.14); bot.add(e);
      miniBot = bot;
      [-0.9, 0, 0.9].forEach((x, k) => { const cn = new Mesh(track(new ConeGeometry(0.09, 0.24, 10)), std(k % 2 ? '#ffffff' : cols.sky, 0.5, 0)); cn.position.set(x, 0.12, -0.75); prop.add(cn); });
    } else if (id === 'electronics') {
      const top = new Mesh(track(roundedBox(1.9, 0.1, 1.05, 0.06, 2)), std('#cfc6e4', 0.6, 0.05)); top.position.y = 0.72; prop.add(top);
      [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]].forEach(([x, z]) => { const l = new Mesh(track(new CylinderGeometry(0.05, 0.05, 0.7, 8)), metal); l.position.set(x, 0.35, z); prop.add(l); });
      const bd = new Mesh(track(roundedBox(1.1, 0.06, 0.7, 0.05, 2)), std(mix(cols.navy, cols.sky, 0.3), 0.45, 0.25)); bd.position.set(-0.2, 0.8, 0); prop.add(bd);
      [[-0.45, 0.1, 0.32], [0.05, -0.12, 0.26]].forEach(([x, z, w]) => { const c = new Mesh(track(new BoxGeometry(w, 0.08, w)), std('#15101f', 0.4, 0.3)); c.position.set(x, 0.87, z); prop.add(c); });
      [[0.25, 0.2, cols.coral], [0.35, 0.2, cols.sky]].forEach(([x, z, c]) => { const l = new Mesh(track(new SphereGeometry(0.05, 10, 8)), glw(c, 1.6)); l.position.set(x, 0.86, z); prop.add(l); leds.push(l); });
      const mon = new Mesh(track(roundedBox(0.7, 0.5, 0.06, 0.05, 2)), phys(cols.dark, 0.3, 0.4)); mon.position.set(0.62, 1.1, -0.3); mon.rotation.y = -0.3; prop.add(mon);
      const monf = new Mesh(track(new PlaneGeometry(0.6, 0.4)), new MeshBasicMaterial({ map: screenTexture('bach', cols) })); monf.position.set(0.62, 1.1, -0.265); monf.rotation.y = -0.3; prop.add(monf); disp.push(monf.material);
    } else if (id === 'drones') {
      const cs = new Mesh(track(roundedBox(1.0, 0.36, 0.64, 0.1)), white); cs.position.y = 0.3; prop.add(cs);
      const sc = new Mesh(track(new BoxGeometry(0.56, 0.02, 0.34)), glw(cols.sky, 0.8)); sc.position.set(-0.1, 0.49, 0); prop.add(sc);
      [-0.3, 0.3].forEach(x => { const st = new Mesh(track(new CylinderGeometry(0.04, 0.04, 0.2, 8)), darkM); st.position.set(x, 0.52, 0.2); prop.add(st); });
      const hp = new Mesh(track(new RingGeometry(0.4, 0.5, 4, 1, Math.PI / 4)), track(new MeshBasicMaterial({ color: '#ffffff', side: DoubleSide }))); hp.rotation.x = -Math.PI / 2; hp.position.set(0, 0.03, 1.0); prop.add(hp);
    } else {
      const pd = new Mesh(track(new CylinderGeometry(0.36, 0.44, 0.5, 20)), white); pd.position.y = 0.25; prop.add(pd);
      const hg = new Group(); hg.position.y = 1.2; prop.add(hg);
      hg.add(new Mesh(track(new SphereGeometry(0.4, 22, 16)), phys(cols.sky, 0.3, 0.05, { clearcoat: 0.8, emissive: new Color(cols.sky), emissiveIntensity: 0.25 })));
      hg.add(new Mesh(track(new SphereGeometry(0.5, 16, 12)), track(new MeshBasicMaterial({ color: cols.white, wireframe: true, transparent: true, opacity: 0.35 }))));
      const orb = new Mesh(track(new TorusGeometry(0.72, 0.015, 8, 40)), glw(cols.coral, 1.2)); orb.rotation.x = Math.PI / 2.4; hg.add(orb); holoGroups.push({ hg, orb });
    }
    prop.scale.setScalar(0.01); prop.visible = false;
    const lab = labelSprite(d.name); lab.position.set(0, 1.5, 0); g.add(lab);
    pick(g, id); spots[id] = { approach: new Vector3(d.x, 0, d.z + 2.1) };
    stations[id] = { g, prop, gring, pad, lab, t: 0, want: 0, base: d.col, pos: new Vector3(d.x, 0, d.z) };
    gate(g, 3);
  });

  // estudiantes de estación (aparecen cuando la estación existe) y del patio
  const crew = [];
  const crewDefs = { robotics: [[-0.95, 1.0], [0.95, 1.0]], electronics: [[-0.5, -0.95], [0.4, -0.95]], drones: [[0, 1.0]], immersive: [[-0.8, 0.9], [0.8, 0.9]] };
  let idx = 0;
  Object.entries(crewDefs).forEach(([st, slots]) => slots.forEach(([dx, dz]) => {
    const pw = makePawn(idx++, st === 'immersive'); const c = stations[st].pos; pw.station = st; pw.act = { robotics: 'robot', electronics: 'solder', drones: 'fly', immersive: 'vr' }[st];
    pw.home.set(c.x + dx, 0, c.z + dz); pw.face = st === 'electronics' ? 0 : Math.atan2(c.x - pw.home.x, c.z - pw.home.z); pw.g.position.copy(pw.home); pw.g.rotation.y = pw.face; crew.push(pw);
  }));
  const yard = [];
  for (let i = 0; i < 5; i++) {
    const pw = makePawn(idx++, false); pw.station = null;
    if (i < 2) { pw.act = 'chat'; pw.home.set(i ? -2.3 : -3.0, 0, 0.7); pw.face = Math.atan2(i ? -1 : 1, 0.0001) + 0; pw.g.position.copy(pw.home); pw.g.rotation.y = i ? -Math.PI / 2 : Math.PI / 2; }
    else { pw.act = 'walk'; pw.from.set(-4 + Math.random() * 8, 0, 0.6 + Math.random() * 2.4); pw.g.position.copy(pw.from); }
    yard.push(pw);
  }

  // ---- dron que sobrevuela (se acerca a la estación de drones cuando existe) ----
  const droneG = new Group(); world.add(droneG); const drone = new Group(); droneG.add(drone);
  drone.add(new Mesh(track(roundedBox(0.9, 0.3, 0.9, 0.2)), white));
  const dtop = new Mesh(track(roundedBox(0.58, 0.16, 0.58, 0.12)), phys(cols.coral, 0.35, 0.05, { clearcoat: 0.8 })); dtop.position.y = 0.2; drone.add(dtop);
  const dcam = new Mesh(track(new SphereGeometry(0.17, 18, 12)), phys('#0d0a16', 0.05, 0.6, { clearcoat: 1 })); dcam.position.set(0.46, -0.08, 0); drone.add(dcam);
  [Math.PI / 4, -Math.PI / 4].forEach(a => { const arm = new Mesh(track(new BoxGeometry(2.0, 0.07, 0.13)), darkM); arm.rotation.y = a; drone.add(arm); });
  const rotors = [];
  [[0.7, 0.7], [0.7, -0.7], [-0.7, 0.7], [-0.7, -0.7]].forEach(([x, z]) => {
    const r = new Group(); r.position.set(x, 0.1, z);
    r.add(new Mesh(track(new CylinderGeometry(0.14, 0.16, 0.16, 14)), darkM));
    const disc = new Mesh(track(new CylinderGeometry(0.52, 0.52, 0.012, 28)), track(new MeshBasicMaterial({ color: cols.sky, transparent: true, opacity: 0.25, depthWrite: false }))); disc.position.y = 0.1; r.add(disc);
    const bl = new Group(); bl.position.y = 0.1; [0, 1].forEach(k => { const b = new Mesh(track(new BoxGeometry(1.0, 0.014, 0.08)), std(cols.white, 0.5)); b.rotation.y = k * Math.PI / 2; bl.add(b); }); r.add(bl);
    drone.add(r); rotors.push(bl);
  });
  const dled = new Mesh(track(new SphereGeometry(0.07, 10, 8)), glw(cols.sky, 1.6)); dled.position.set(0.46, 0, 0.3); drone.add(dled);
  droneG.scale.setScalar(0.62); gate(droneG, 3);
  const dShadow = blob(1.6, 1.6, 0, 0, 0.55); world.add(dShadow);
  const dc = { x: 0, z: -0.5, y: 5.0, R: 5.4 };

  // ---- avatar: el robot del colegio ----
  const avatar = new Group(); world.add(avatar); const rbt = new Group(); avatar.add(rbt);
  const cb = new Mesh(track(roundedBox(3.7, 0.52, 2.3, 0.3)), white); cb.position.y = 0.8; rbt.add(cb);
  const sk = new Mesh(track(roundedBox(3.2, 0.2, 1.9, 0.12)), darkM); sk.position.y = 0.48; rbt.add(sk);
  [-1, 1].forEach(sd => { const l = new Mesh(track(new BoxGeometry(3.0, 0.05, 0.05)), glw(cols.coral, 1.1)); l.position.set(0, 0.82, sd * 1.16); rbt.add(l); });
  const shell = new Mesh(track(roundedBox(2.5, 0.88, 1.95, 0.4)), phys(cols.plum, 0.32, 0.1, { clearcoat: 1, clearcoatRoughness: 0.12 })); shell.position.set(-0.3, 1.66, 0); rbt.add(shell);
  const win = new Mesh(track(roundedBox(0.12, 0.34, 1.3, 0.1, 2)), phys(cols.dark, 0.1, 0.5, { clearcoat: 1 })); win.position.set(0.82, 1.7, 0); rbt.add(win);
  const lidM = new Mesh(track(roundedBox(1.9, 0.16, 1.4, 0.2)), phys(cols.coral, 0.35, 0.05, { clearcoat: 0.8 })); lidM.position.set(-0.3, 2.18, 0); rbt.add(lidM);
  const gear = new Mesh(track(gearGeo(0.62, 0.5, 10, 0.18)), std(cols.sky, 0.35, 0.5)); gear.position.set(0.1, 2.42, 0.5); rbt.add(gear);
  const mast = new Mesh(track(new CylinderGeometry(0.04, 0.05, 1.1, 8)), metal); mast.position.set(-1.2, 2.7, -0.5); rbt.add(mast);
  const bulb = new Mesh(track(new SphereGeometry(0.17, 18, 14)), glw(cols.coral, 0.9)); bulb.position.set(-1.2, 3.3, -0.5); rbt.add(bulb);
  const head = new Mesh(track(roundedBox(0.72, 0.64, 1.6, 0.24)), white); head.position.set(1.85, 0.95, 0); rbt.add(head);
  const eyes = [];
  [-0.45, 0.45].forEach(z => {
    const lens = new Mesh(track(new CylinderGeometry(0.24, 0.24, 0.1, 24)), phys('#0d0a16', 0.05, 0.6, { clearcoat: 1 })); lens.rotation.z = Math.PI / 2; lens.position.set(2.25, 0.97, z); rbt.add(lens);
    const pu = new Mesh(track(new SphereGeometry(0.1, 14, 10)), glw(cols.sky, 1.4)); pu.position.set(2.32, 0.97, z); rbt.add(pu); eyes.push(pu);
  });
  const wheels = [], rubber = std('#17121f', 0.85, 0.05), tireG = track(new CylinderGeometry(0.66, 0.66, 0.5, 28)), treadG = track(new BoxGeometry(0.1, 0.09, 0.5));
  [[1.15, 1.22], [1.15, -1.22], [-1.2, 1.22], [-1.2, -1.22]].forEach(([x, z]) => {
    const w = new Group(); w.position.set(x, 0.66, z); const spin = new Group(); w.add(spin);
    const t = new Mesh(tireG, rubber); t.rotation.x = Math.PI / 2; spin.add(t);
    const k = new InstancedMesh(treadG, rubber, 18), d = new Object3D();
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; d.position.set(Math.cos(a) * 0.69, Math.sin(a) * 0.69, 0); d.rotation.set(0, 0, a); d.updateMatrix(); k.setMatrixAt(i, d.matrix); }
    spin.add(k);
    const hub = new Mesh(track(new CylinderGeometry(0.4, 0.4, 0.54, 22)), std(cols.sky, 0.25, 0.7)); hub.rotation.x = Math.PI / 2; spin.add(hub);
    const cap = new Mesh(track(new CylinderGeometry(0.12, 0.12, 0.64, 12)), std(cols.coral, 0.3, 0.3)); cap.rotation.x = Math.PI / 2; spin.add(cap);
    rbt.add(w); wheels.push(spin);
  });
  const AV = 0.4; avatar.scale.setScalar(AV); avatar.position.set(-2.6, 0, 1.2);
  const avShadow = blob(2.0, 1.4, 0, 1.4, 0.8); world.add(avShadow);

  // ---- chispas (celebración) y luciérnagas ----
  const SP = 90, spPos = new Float32Array(SP * 3), spVel = new Float32Array(SP * 3), spLife = new Float32Array(SP), spCol = new Float32Array(SP * 3);
  const spG = track(new BufferGeometry()); spG.setAttribute('position', new Float32BufferAttribute(spPos, 3)); spG.setAttribute('color', new Float32BufferAttribute(spCol, 3));
  world.add(new Points(spG, track(new PointsMaterial({ map: track(glowTexture('#ffffff')), size: 0.38, transparent: true, depthWrite: false, blending: AdditiveBlending, vertexColors: true }))));
  for (let i = 0; i < SP; i++) { spPos[i * 3 + 1] = -50; spLife[i] = 0; }
  let spHead = 0; const tmpC = new Color();
  function burst(x, y, z, hex, n = 22) {
    tmpC.set(hex);
    for (let k = 0; k < n; k++) { const i = spHead++ % SP, a = Math.random() * 6.28, u = 1 + Math.random() * 2.2; spPos[i * 3] = x; spPos[i * 3 + 1] = y; spPos[i * 3 + 2] = z; spVel[i * 3] = Math.cos(a) * u; spVel[i * 3 + 1] = 2 + Math.random() * 2.5; spVel[i * 3 + 2] = Math.sin(a) * u; spLife[i] = 1; spCol[i * 3] = tmpC.r; spCol[i * 3 + 1] = tmpC.g; spCol[i * 3 + 2] = tmpC.b; }
  }
  const PN = 50, ppos = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) { ppos[i * 3] = (Math.random() - 0.5) * 17; ppos[i * 3 + 1] = Math.random() * 6; ppos[i * 3 + 2] = (Math.random() - 0.5) * 15; }
  const ppg = track(new BufferGeometry()); ppg.setAttribute('position', new Float32BufferAttribute(ppos, 3));
  const dustM = track(new PointsMaterial({ map: track(glowTexture('#ffffff')), size: 0.4, transparent: true, opacity: 0.6, depthWrite: false, blending: AdditiveBlending, color: new Color(cols.sky) })); world.add(new Points(ppg, dustM));

  // ---------- estado y bucle (solo visualización: el colegio evoluciona con la propuesta) ----------
  container.setAttribute('role', 'img'); container.setAttribute('aria-label', 'Ilustración 3D de tu colegio: se vuelve más tecnológico conforme avanzas en la propuesta.');
  const goal = { az: 0.45, el: 0.5 }, cam = { az: 0.45, el: 0.5 }, view = { z: 1, zg: 1, px: 0, pxg: 0, pz: 0, pzg: 0 };
  let data = { step: 1, levels: [], students: 0, programs: [] };
  let calm = false, settleT = 0;
  let alive = true, visible = true, raf = 0, last = performance.now(), T = 0, w = 1, h = 1, dragging = false, idle = 0, celebrated = false, flagT = 0, tech = 0, techGoal = 0, yardN = 0;
  const lastPos = avatar.position.clone();
  const cWall0 = new Color('#fff1d6'), cWall1 = new Color('#f7f3ff'), cRoof0 = new Color('#d9744f'), cRoof1 = new Color('#3b2f73'), cGlass0 = new Color('#bfe6f5'), cGlass1 = new Color('#1d2a63'), cStripe0 = new Color('#ffd36e'), cStripe1 = new Color(cols.coral);
  const cTop0 = new Color('#3fb06a'), cTop1 = new Color('#4a2fb0'), cSide0 = new Color('#d9c08e'), cSide1 = new Color('#4b3a9a'), cRim0 = new Color('#b99a62'), cRim1 = new Color('#3aa0d0');
  function applyTech(t) {
    hallWall.color.lerpColors(cWall0, cWall1, t); hallRoof.color.lerpColors(cRoof0, cRoof1, t); glassM.color.lerpColors(cGlass0, cGlass1, t); glassM.emissiveIntensity = 0.02 + 0.3 * t; stripeM.color.lerpColors(cStripe0, cStripe1, t);
    platTop.color.lerpColors(cTop0, cTop1, t); platSide.color.lerpColors(cSide0, cSide1, t); platRim.color.lerpColors(cRim0, cRim1, t);
    floorM.material.opacity = clamp((t - 0.1) / 0.5, 0, 1); pring.material.opacity = clamp((t - 0.1) / 0.5, 0, 1) * (0.55 + Math.sin(T * 1.8) * 0.15); dustM.opacity = 0.6 * clamp((t - 0.25) / 0.5, 0, 1);
    fillL.intensity = FILL0 * (0.7 + 0.6 * t); rimL.intensity = RIM0 * (0.7 + 0.6 * t); platTop.emissive.setRGB(0.16 * t, 0.1 * t, 0.34 * t); platTop.emissiveIntensity = 1;
    ripple.visible = t > 0.3; { const q = (T * 0.45) % 1; ripple.scale.setScalar(1 + q * 0.18); ripple.material.opacity = (1 - q) * 0.7 * clamp((t - 0.3) / 0.4, 0, 1); }
    dustM.color.setHSL((0.55 + Math.sin(T * 0.3) * 0.12 + 1) % 1, 0.8, 0.65); winM.emissiveIntensity = 0.12 + 0.55 * t;
    neonM.emissiveIntensity = 1.6 * clamp((t - 0.3) / 0.4, 0, 1); neons.forEach(n => { n.visible = t > 0.32; });
    const hr = clamp((t - 0.55) / 0.3, 0, 1); holoRing.visible = holoHalo.visible = hr > 0.02; holoRing.scale.setScalar(Math.max(0.01, hr)); holoHalo.material.opacity = 0.8 * hr; holoRing.rotation.z += 0.01;
    Object.values(wings).forEach(wg => wg.bodyM.color.lerpColors(wg.c0, wg.c1, t));
  }
  const patrol = [new Vector3(-2.6, 0, 1.2), new Vector3(2.6, 0, 1.2), new Vector3(2.0, 0, 3.0), new Vector3(-2.0, 0, 3.0)]; let pIdx = 0;

  function update(d) {
    data = Object.assign(data, d);
    Object.keys(wings).forEach(id => { wings[id].want = data.levels.includes(id) ? 1 : 0; });
    const on = new Set((data.programs || []).map(p => PROG_STATION[p]).filter(Boolean));
    Object.keys(stations).forEach(id => { stations[id].want = on.has(id) ? 1 : 0; });
    const hasStu = data.step >= 2 && (data.students || 0) > 0;
    crew.forEach(c => { c.want = hasStu && stations[c.station].want ? 1 : 0; });
    yardN = hasStu ? clamp(Math.round((data.students || 0) / 60), 2, yard.length) : 0;
    yard.forEach((p, i) => { p.want = i < yardN ? 1 : 0; });
    techGoal = clamp(data.levels.length * 0.17 + (data.step >= 2 ? 0.05 : 0) + ((data.programs || []).length ? 0.1 : 0) + (data.step >= 3 ? 0.1 : 0) + (data.step >= 4 ? 0.08 : 0) + (data.step >= 5 ? 0.15 : 0), 0, 1);
    if (data.step >= 5 && !celebrated) { celebrated = true; [0, 250, 550].forEach((dl, k) => setTimeout(() => { if (alive) burst(2.5 + (k - 1) * 0.9, 3.4, -1.2, [cols.coral, cols.sky, cols.white][k], 28); }, dl)); }
    if (data.step < 5) celebrated = false;
    settleT = 2.5; request();
  }
  const faceTo = (obj, tx, tz) => { obj.rotation.y = Math.atan2(tx - obj.position.x, tz - obj.position.z); };
  function animPawn(p, dt) {
    p.t += (p.want - p.t) * Math.min(1, dt * 4); const t = clamp(p.t, 0, 1); p.g.visible = t > 0.02; const sc = Math.max(0.01, t * p.sc);
    if (!p.g.visible) return;
    const a = T + p.ph, L = p.arms[0], R = p.arms[1];
    p.g.scale.setScalar(sc);
    if (p.act === 'walk') {
      p.prog += dt * p.speed / 3.2; if (p.prog >= 1) { p.prog = 0; p.from.set(-4.5 + Math.random() * 9, 0, 0.8 + Math.random() * 2.6); }
      const f = p.prog; p.g.position.set(p.from.x + (DOOR.x - p.from.x) * f, Math.abs(Math.sin(a * 7)) * 0.03, p.from.z + (DOOR.z - p.from.z) * f); faceTo(p.g, DOOR.x, DOOR.z);
      p.g.scale.setScalar(sc * (f > 0.9 ? (1 - f) * 10 : 1) + 0.0001); L.rotation.x = Math.sin(a * 7) * 0.5; R.rotation.x = -Math.sin(a * 7) * 0.5;
    } else if (p.act === 'chat') {
      p.g.position.y = 0; p.headG.rotation.x = Math.sin(a * 2.2) * 0.12; L.rotation.x = Math.sin(a * 2.6) > 0.4 ? -1.0 + Math.sin(a * 9) * 0.3 : 0; R.rotation.x = Math.sin(a * 2.6 + 3) > 0.4 ? -1.0 + Math.sin(a * 9) * 0.3 : 0;
    } else if (p.act === 'robot') {
      p.headG.rotation.y = Math.sin(a * 0.7) * 0.25; L.rotation.x = -0.4 + Math.sin(a * 3) * 0.2; R.rotation.x = -1.1 + Math.sin(a * 2 + p.ph) * 0.35; if (miniBot) { const dx = miniBot.parent.parent.position.x + miniBot.position.x - p.g.position.x, dz = miniBot.parent.parent.position.z - p.g.position.z; p.g.rotation.y = Math.atan2(dx, dz); }
    } else if (p.act === 'solder') {
      p.g.rotation.y = 0; p.headG.rotation.x = 0.55; L.rotation.x = -1.15 + Math.sin(a * 5) * 0.08; R.rotation.x = -1.2 + Math.sin(a * 6 + 1) * 0.14; p.g.position.y = 0;
    } else if (p.act === 'vr') {
      p.headG.rotation.y = Math.sin(a * 0.9) * 0.55; p.headG.rotation.x = Math.sin(a * 0.6) * 0.15; L.rotation.x = -1.2 + Math.sin(a * 1.8) * 0.5; R.rotation.x = -1.2 + Math.sin(a * 1.8 + 1.5) * 0.5; L.rotation.z = 0.2; R.rotation.z = -0.2; p.g.rotation.y = p.face + Math.sin(a * 0.5) * 0.3;
    } else if (p.act === 'fly') {
      faceTo(p.g, droneG.position.x, droneG.position.z); p.headG.rotation.x = -0.45; L.rotation.x = -0.9; R.rotation.x = -0.9; p.g.position.y = 0;
    }
  }
  function frame(now) {
    raf = 0; if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!calm) T += dt; else settleT = Math.max(0, settleT - dt);
    const k = Math.min(1, dt * 4.5);
    tech += (techGoal - tech) * Math.min(1, dt * 1.6); applyTech(tech);
    gates.forEach(gt => { const want = data.step >= gt.n ? 1 : 0; gt.t += (want - gt.t) * Math.min(1, dt * 3); const t = clamp(gt.t, 0, 1); gt.obj.visible = t > 0.02; gt.obj.scale.setScalar(Math.max(0.01, ease.back(Math.min(1, t)) * gt.obj.userData.base)); });
    dShadow.visible = data.step >= 3;
    Object.values(wings).forEach(wg => {
      wg.t += (wg.want - wg.t) * Math.min(1, dt * 3.5); const t = clamp(wg.t, 0, 1);
      wg.solid.visible = t > 0.02; wg.solid.scale.y = Math.max(0.01, ease.back(Math.min(1, t))); wg.lot.visible = t < 0.5; wg.lab.position.y = 1.25 + Math.sin(T * 2.2) * 0.07;
    });
    Object.values(stations).forEach(st => {
      st.t += (st.want - st.t) * Math.min(1, dt * 3.5); const t = clamp(st.t, 0, 1);
      st.prop.visible = t > 0.02; st.prop.scale.setScalar(Math.max(0.01, ease.back(Math.min(1, t)))); st.gring.material.opacity = st.want ? 0.9 : 0.35 + Math.sin(T * 2) * 0.12; st.pad.material.opacity = st.want ? 1 : 0.3; st.pad.material.depthWrite = !!st.want; st.lab.visible = !st.want; st.lab.position.y = 1.5 + Math.sin(T * 2.2) * 0.07;
    });
    if (miniBot) miniBot.position.x = Math.sin(T * 0.9) * 0.8;
    leds.forEach((l, i) => { l.material.emissiveIntensity = 0.6 + (Math.sin(T * (4 + i * 2)) > 0 ? 1.4 : 0); });
    crew.forEach(p => animPawn(p, dt)); yard.forEach(p => animPawn(p, dt));
    // robot que patrulla por el camino cuando ya hay programas (adorno, no se controla)
    const rb = clamp(gates.find(g => g.obj === droneG).t, 0, 1); avatar.visible = avShadow.visible = rb > 0.05;
    const pos = avatar.position, tg = patrol[pIdx], dx = tg.x - pos.x, dz = tg.z - pos.z, dist = Math.hypot(dx, dz);
    avatar.scale.setScalar(Math.max(0.01, AV * rb));
    if (dist < 0.1) pIdx = (pIdx + 1) % patrol.length; else { const sp = Math.min(dist, 1.3 * dt); pos.x += dx / dist * sp; pos.z += dz / dist * sp; const ang = Math.atan2(-dz, dx); let da = ang - avatar.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); avatar.rotation.y += da * Math.min(1, dt * 4); }
    const trav = pos.distanceTo(lastPos); lastPos.copy(pos); wheels.forEach(sw => { sw.rotation.z -= trav / (0.66 * AV); });
    rbt.position.y = Math.sin(T * 1.6) * 0.03; gear.rotation.z += dt * 0.8; avShadow.position.set(pos.x, 0.03, pos.z); avShadow.rotation.z = -avatar.rotation.y;
    bulb.material.emissiveIntensity = 0.7 + Math.sin(T * 3) * 0.35; eyes.forEach(e => { e.material.emissiveIntensity = 1.1 + Math.sin(T * 2.2) * 0.4; });
    for (let i = 0; i < SP; i++) { if (spLife[i] > 0) { spLife[i] -= dt * 1.1; spVel[i * 3 + 1] -= 7 * dt; spPos[i * 3] += spVel[i * 3] * dt; spPos[i * 3 + 1] += spVel[i * 3 + 1] * dt; spPos[i * 3 + 2] += spVel[i * 3 + 2] * dt; if (spLife[i] <= 0) spPos[i * 3 + 1] = -50; } }
    spG.attributes.position.needsUpdate = true; spG.attributes.color.needsUpdate = true;
    const dOn = stations.drones.want ? 1 : 0, gx = dOn ? stations.drones.pos.x : 0, gz = dOn ? stations.drones.pos.z : -0.5, gy = dOn ? 3.0 : 5.0, gR = dOn ? 2.3 : 5.4;
    dc.x += (gx - dc.x) * dt * 1.5; dc.z += (gz - dc.z) * dt * 1.5; dc.y += (gy - dc.y) * dt * 1.5; dc.R += (gR - dc.R) * dt * 1.5;
    const a = 0.6 + T * (data.step >= 5 ? 0.9 : 0.55); droneG.position.set(dc.x + Math.cos(a) * dc.R, dc.y + Math.sin(a * 2) * 0.25, dc.z + Math.sin(a) * dc.R * 0.8);
    drone.rotation.y = -a + Math.PI * 1.5; drone.rotation.z = Math.sin(a) * 0.1; drone.rotation.x = Math.cos(a) * 0.1; dShadow.position.set(droneG.position.x, 0.03, droneG.position.z);
    rotors.forEach((r, i) => { r.rotation.y += dt * 38 * (i % 2 ? 1 : -1); });
    holoGroups.forEach(o => { o.hg.rotation.y += dt * 0.8; o.orb.rotation.z += dt * 1.4; o.hg.position.y = 1.2 + Math.sin(T * 1.4) * 0.07; });
    flagT += ((data.step >= 5 ? 1 : 0) - flagT) * Math.min(1, dt * 2); flag.position.y = 1.0 + flagT * 1.5; flag.scale.x = 1 + Math.sin(T * 5) * 0.05;
    idle += dt; if (!calm && !dragging && idle > 3) goal.az += Math.sin(T * 0.4) * dt * 0.05;
    cam.az += (goal.az - cam.az) * k; cam.el += (goal.el - cam.el) * k;
    view.z += (view.zg - view.z) * k; view.px += (view.pxg - view.px) * k; view.pz += (view.pzg - view.pz) * k;
    const aspect = w / h, d = Math.max(27, 27 / Math.max(0.7, aspect)) * view.z;
    camera.position.set(view.px + Math.sin(cam.az) * Math.cos(cam.el) * d, 1.4 + Math.sin(cam.el) * d, view.pz + Math.cos(cam.az) * Math.cos(cam.el) * d + 0.5); camera.lookAt(view.px, 1.5, view.pz - 0.4);
    renderer.render(scene, camera);
    const needs = !calm || settleT > 0 || dragging || Math.abs(goal.az - cam.az) > 0.002 || Math.abs(goal.el - cam.el) > 0.002 || Math.abs(view.zg - view.z) > 0.002 || Math.abs(view.pxg - view.px) > 0.002 || Math.abs(view.pzg - view.pz) > 0.002;
    if (needs && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const request = () => { if (!raf && alive && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  function resize() {
    w = Math.max(1, container.clientWidth); h = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); request();
  }
  const ro = new ResizeObserver(resize); ro.observe(container);
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) request(); }, { threshold: 0.01 }); io.observe(container);

  // mover y acercar: arrastrar orbita, clic derecho o Mayús+arrastrar desplaza, la rueda hace zoom, doble clic restablece
  let down = null;
  const onDown = e => { down = { x: e.clientX, y: e.clientY, az: goal.az, el: goal.el, px: view.pxg, pz: view.pzg, id: e.pointerId, moved: false, pan: e.button === 2 || e.shiftKey }; idle = 0; };
  const onMove = e => {
    if (!down || e.pointerId !== down.id) return; const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) < 5) return;
    if (!down.moved) { down.moved = true; dragging = true; try { container.setPointerCapture(e.pointerId); } catch (_) {} container.classList.add('is-dragging'); }
    if (down.pan) { const rx = Math.cos(cam.az), rz = -Math.sin(cam.az), fx = -Math.sin(cam.az), fz = -Math.cos(cam.az), sc = 0.03 * view.zg; view.pxg = clamp(down.px - (rx * dx - fx * dy) * sc, -7, 7); view.pzg = clamp(down.pz - (rz * dx - fz * dy) * sc, -7, 7); }
    else { goal.az = down.az - dx * 0.012; goal.el = clamp(down.el + dy * 0.006, 0.18, 1.2); }
    request();
  };
  const onUp = () => { dragging = false; down = null; idle = 0; container.classList.remove('is-dragging'); };
  const onWheel = e => {
    const next = clamp(view.zg * Math.exp(e.deltaY * 0.0016), 0.28, 1.25);
    if (next === view.zg) return; // en los límites deja pasar el scroll de la página
    e.preventDefault(); view.zg = next; idle = 0; request();
  };
  const onDbl = () => { goal.az = 0.45; goal.el = 0.5; view.zg = 1; view.pxg = 0; view.pzg = 0; request(); };
  const onCtx = e => e.preventDefault();
  container.addEventListener('pointerdown', onDown); container.addEventListener('pointermove', onMove); container.addEventListener('pointerup', onUp); container.addEventListener('pointercancel', onUp);
  container.addEventListener('wheel', onWheel, { passive: false }); container.addEventListener('dblclick', onDbl); container.addEventListener('contextmenu', onCtx);
  resize(); update({}); tech = techGoal; request();
  return {
    update, resize, setPaused(v) { calm = !!v; settleT = 1.5; request(); },
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      container.removeEventListener('pointerdown', onDown); container.removeEventListener('pointermove', onMove); container.removeEventListener('pointerup', onUp); container.removeEventListener('pointercancel', onUp); container.removeEventListener('wheel', onWheel); container.removeEventListener('dblclick', onDbl); container.removeEventListener('contextmenu', onCtx);
      disp.forEach(d => { if (d.map) d.map.dispose(); d.dispose && d.dispose(); }); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      if (scene.environment) scene.environment.dispose(); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); canvas.remove();
    }
  };
}

// ---------- Pato robot del avance (inspirado en un robot-pato articulado: casco con visor, cuello de servos, patas con articulaciones) ----------
// Camina por la barra de pasos, mira hacia arriba hacia lo que haces y espera. Un lienzo transparente cubre toda la barra.
export function createDuck(container, opts = {}) {
  const reduce = !!opts.reduceMotion;
  const C = { shell: '#55bfe8', beak: cssVar('--coral', '#ef8556'), face: '#c9c6d2', eye: '#ffc83d', body: '#55bfe8', fin: '#86d3f0', foot: cssVar('--coral', '#ef8556'), sole: '#ffc83d', black: '#1c1826', metal: '#aeb3c2' };
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement; canvas.className = 'duck-canvas'; container.appendChild(canvas);
  const scene = new Scene(), camera = new OrthographicCamera(0, 10, 4, 0, -30, 30); camera.position.z = 10;
  try { const pm = new PMREMGenerator(renderer), env = new RoomEnvironment(); scene.environment = pm.fromScene(env, 0.04).texture; scene.environmentIntensity = 0.7; pm.dispose(); } catch (e) { /* luces directas */ }
  scene.add(new HemisphereLight(0xffffff, 0xb9aee0, 0.9));
  const key = new DirectionalLight(0xffffff, 2.4); key.position.set(-3, 6, 8); scene.add(key);
  const disp = []; const track = o => { disp.push(o); return o; };
  const phys = (hex, r, m, ex = {}) => track(new MeshPhysicalMaterial({ color: hex, roughness: r, metalness: m, ...ex }));
  const blackM = phys(C.black, 0.45, 0.35, { clearcoat: 0.3 }), metalM = phys(C.metal, 0.3, 0.9), shellM = phys(C.shell, 0.35, 0.02, { clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const duck = new Group(); scene.add(duck);       // posición en x; gira para mirar a un lado u otro
  const bodyG = new Group(); duck.add(bodyG);      // sube y baja al caminar
  // ---- patas articuladas ----
  const legs = [], finList = [];
  [-0.55, 0.55].forEach(z => {
    const hip = new Group(); hip.position.set(0, 1.55, z); bodyG.add(hip);
    const servoH = new Mesh(track(roundedBox(0.55, 0.5, 0.42, 0.1, 2)), metalM); servoH.position.y = -0.1; hip.add(servoH);
    const thigh = new Mesh(track(roundedBox(0.34, 0.62, 0.3, 0.08, 2)), blackM); thigh.position.y = -0.5; hip.add(thigh);
    const knee = new Group(); knee.position.y = -0.8; hip.add(knee);
    const kServo = new Mesh(track(new CylinderGeometry(0.2, 0.2, 0.46, 18)), metalM); kServo.rotation.x = Math.PI / 2; knee.add(kServo);
    const shin = new Mesh(track(roundedBox(0.3, 0.6, 0.28, 0.07, 2)), blackM); shin.position.y = -0.38; knee.add(shin);
    const ankle = new Group(); ankle.position.y = -0.72; knee.add(ankle);
    const aServo = new Mesh(track(roundedBox(0.4, 0.3, 0.4, 0.08, 2)), metalM); aServo.position.y = 0.02; ankle.add(aServo);
    const shoe = new Mesh(track(roundedBox(1.25, 0.3, 0.82, 0.14)), phys(C.foot, 0.4, 0.02, { clearcoat: 0.6 })); shoe.position.set(0.25, -0.2, 0); ankle.add(shoe);
    const sole = new Mesh(track(roundedBox(1.3, 0.12, 0.86, 0.06, 2)), phys(C.sole, 0.5, 0.02)); sole.position.set(0.25, -0.38, 0); ankle.add(sole);
    legs.push({ hip, knee, ankle, sd: z > 0 ? 1 : -1 });
  });
  // ---- pelvis y torso ----
  const pelvis = new Mesh(track(roundedBox(1.15, 0.38, 1.3, 0.1, 2)), blackM); pelvis.position.y = 1.62; bodyG.add(pelvis);
  const torso = new Mesh(track(roundedBox(1.55, 0.95, 1.15, 0.28)), shellM); torso.position.set(0.0, 2.2, 0); bodyG.add(torso);
  [-1, 1].forEach(sd => {
    const fin = new Mesh(track(roundedBox(1.0, 0.8, 0.07, 0.12, 2)), phys(C.fin, 0.4, 0.02, { clearcoat: 0.7 })); fin.position.set(-0.15, 2.05, sd * 0.62); fin.rotation.z = -0.15; fin.rotation.x = sd * 0.1; bodyG.add(fin); finList.push({ fin, sd });
    const dot = new Mesh(track(new CylinderGeometry(0.1, 0.1, 0.1, 14)), metalM); dot.rotation.x = Math.PI / 2; dot.position.set(0.35, 2.2, sd * 0.62); bodyG.add(dot);
  });
  // ---- cuello de servos ----
  const neck = new Group(); neck.position.set(0.1, 2.65, 0); bodyG.add(neck);
  const seg = (parent, y) => { const g = new Group(); g.position.y = y; parent.add(g); const b = new Mesh(track(roundedBox(0.42, 0.5, 0.42, 0.08, 2)), blackM); b.position.y = 0.25; g.add(b); const s = new Mesh(track(new CylinderGeometry(0.17, 0.17, 0.5, 16)), metalM); s.rotation.x = Math.PI / 2; s.position.y = 0.08; g.add(s); return g; };
  const n1 = seg(neck, 0), n2 = seg(n1, 0.5), n3 = new Group(); n3.position.y = 0.5; n2.add(n3);
  // ---- cabeza: casco con visor, pico y ojo-cámara ----
  const head = new Group(); head.position.y = 0.55; n3.add(head);
  const hs = new Mesh(track(roundedBox(2.2, 1.1, 1.75, 0.34)), shellM); hs.position.set(0.35, 0.45, 0); head.add(hs);
  const visor = new Mesh(track(roundedBox(0.1, 0.72, 1.45, 0.05, 2)), phys(C.face, 0.55, 0.05)); visor.position.set(1.42, 0.5, 0); head.add(visor);
  const beak = new Mesh(track(roundedBox(0.7, 0.22, 1.7, 0.1, 2)), phys(C.beak, 0.4, 0.02, { clearcoat: 0.6 })); beak.position.set(1.28, 0.02, 0); beak.rotation.z = -0.08; head.add(beak);
  const eyes = [];
  [-1, 1].forEach(sd => {
    const ring = new Mesh(track(new CylinderGeometry(0.34, 0.34, 0.14, 28)), phys(C.eye, 0.35, 0.05, { clearcoat: 0.6 })); ring.rotation.x = Math.PI / 2; ring.position.set(0.75, 0.62, sd * 0.9); head.add(ring);
    const lens = new Mesh(track(new CylinderGeometry(0.2, 0.2, 0.08, 24)), phys('#0b0814', 0.05, 0.6, { clearcoat: 1 })); lens.rotation.x = Math.PI / 2; lens.position.set(0.75, 0.62, sd * 0.97); head.add(lens);
    const hl = new Mesh(track(new SphereGeometry(0.05, 8, 6)), new MeshBasicMaterial({ color: '#ffffff' })); hl.position.set(0.82, 0.7, sd * 1.01); head.add(hl);
    eyes.push(lens);
  });
  const ant = new Mesh(track(new CylinderGeometry(0.025, 0.025, 0.5, 8)), metalM); ant.position.set(0.1, 1.2, 0.5); head.add(ant);
  const antB = new Mesh(track(new SphereGeometry(0.08, 12, 10)), new MeshStandardMaterial({ color: '#5fbad6', emissive: new Color('#5fbad6'), emissiveIntensity: 1.2 })); antB.position.set(0.1, 1.48, 0.5); head.add(antB);
  const shadow = new Mesh(track(new PlaneGeometry(3.4, 1.4)), track(new MeshBasicMaterial({ map: track(blobTexture(0.5)), transparent: true, depthWrite: false }))); shadow.position.set(0, 0.02, -2); scene.add(shadow);

  // ---- estado ----
  let w = 1, h = 1, S = 20, alive = true, visible = true, raf = 0, last = performance.now(), T = 0;
  let x = 0, tx = 0, from = 0, travel = 0, walkT = 0, phase = 0, facing = 0, yaw = -0.45, mode = 'idle', lookUpT = 0, hopT = -1, nodT = -1, blinkT = 3, glanceT = 6, glance = 0;
  let calm = reduce, paused = false, settleT = 0;
  let hopN = 1, hopI = 0, hopP = 0, faceCamT = 0, stageSq = 0;
  let stage = 1, beh = null, sitAmt = 0, danceAmt = 0, celAmt = 0, spinT = -1;
  function startBeh() {
    if (opts.onArrive) opts.onArrive();
    if (calm) { settleT = 0.9; request(); return; }
    lookUpT = Math.max(lookUpT, 2.2); faceCamT = 1.6; hopT = -1; if (opts.onLand) opts.onLand();
    if (stage === 1) beh = { name: 'wave', t: 0 }; else if (stage === 3) beh = { name: 'trip', t: 0 }; else if (stage === 5) { spinT = 0; beh = null; } else beh = null;
  }
  function setStage(n, quiet) { if (n === stage) return; stage = n; beh = null; if (!quiet && mode !== 'walk') startBeh(); request(); }
  const ptr = { yaw: 0, pitch: 0 };
  const FACE = { right: -0.5, left: Math.PI + 0.5 };
  function resize() {
    w = Math.max(1, container.clientWidth); h = Math.max(1, container.clientHeight); S = h / 5.9;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
    camera.left = 0; camera.right = w / S; camera.top = h / S; camera.bottom = 0; camera.updateProjectionMatrix(); request();
  }
  function moveTo(px, o = {}) {
    const nx = px / S; if (o.instant || calm) { x = tx = nx; mode = 'idle'; if (!o.silent) startBeh(); request(); return; }
    if (Math.abs(nx - x) < 0.05) { tx = nx; return; }
    from = x; tx = nx; travel = Math.abs(tx - from); hopN = Math.max(1, Math.round(travel / 3.4)); hopI = 0; hopP = 0; mode = 'walk'; facing = tx > x ? 0 : 1; request();
  }
  function react(kind) { if (calm) return; if (kind === 'type') { lookUpT = Math.max(lookUpT, 1.4); } else { hopT = 0; nodT = 0; lookUpT = Math.max(lookUpT, 0.6); } request(); }
  function look(cx, cy) {
    const r = container.getBoundingClientRect(), px = r.left + (x * S), py = r.bottom - 3 * S;
    ptr.yaw = clamp((cx - px) / 400, -1, 1) * (facing ? -1 : 1); ptr.pitch = clamp((py - cy) / 260, -0.6, 1); request();
  }
  const ang = (a, b, k) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * k; };
  function frame(now) {
    raf = 0; if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!calm) T += dt; else settleT = Math.max(0, settleT - dt);
    let walking = false, running = false, sf = 0, brake = 0, hy = 0, sq = 0, lag = 0, tuck = 0;
    if (mode === 'walk') {
      // carrera: arranca rápido, corre inclinado hacia adelante y frena derrapando al llegar
      running = true; walking = true;
      const dur = clamp(travel / 12, 0.5, 1.4); walkT += dt / dur; const p = clamp(walkT, 0, 1), A = 0.12, B = 0.78;
      const vmax = 1 / (A / 2 + (B - A) + (1 - B) / 2);
      const pos = p < A ? vmax * p * p / (2 * A) : p < B ? vmax * (A / 2 + (p - A)) : vmax * (A / 2 + (B - A) + (p - B) - (p - B) * (p - B) / (2 * (1 - B)));
      const v = p < A ? vmax * p / A : p < B ? vmax : vmax * (1 - (p - B) / (1 - B));
      x = from + (tx - from) * clamp(pos, 0, 1); sf = clamp(v / vmax, 0, 1); brake = clamp((p - B) / (1 - B), 0, 1);
      phase += dt * (9 + 11 * sf); lag = 0.5 * sf; sq = -0.04 * Math.sin(brake * Math.PI);
      if (p >= 1) { mode = 'idle'; x = tx; walking = false; running = false; sf = 0; startBeh(); }
    }
    if (faceCamT > 0) faceCamT = Math.max(0, faceCamT - dt);
    // comportamiento propio de cada etapa
    sitAmt += (((stage === 2 && !walking) ? 1 : 0) - sitAmt) * Math.min(1, dt * 4); if (reduce) sitAmt = stage === 2 ? 1 : 0;
    const dancing = !calm && stage === 4 && !walking ? 1 : 0, celeb = !calm && stage === 5 && !walking ? 1 : 0;
    danceAmt += (dancing - danceAmt) * Math.min(1, dt * 4); celAmt += (celeb - celAmt) * Math.min(1, dt * 4);
    let tripRot = 0, tripY = 0, tripHead = 0, flail = 0, squint = 1;
    const tripping = !!(beh && beh.name === 'trip');
    if (tripping) {
      beh.t += dt; const tt = beh.t;
      if (tt < 0.6) { tripRot = -0.45 * (tt / 0.6); flail = 1; }
      else if (tt < 0.95) { const q = (tt - 0.6) / 0.35, e = q * q; tripRot = -0.45 - 1.05 * e; tripY = -0.15 * e; flail = 1 - q; }
      else if (tt < 2.3) { const q = tt - 0.95; tripRot = -1.5 + (q < 0.25 ? Math.sin(q / 0.25 * Math.PI) * 0.12 : 0); tripHead = -0.5; squint = 0.25; }
      else if (tt < 3.4) { const q = (tt - 2.3) / 1.1, e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2; tripRot = -1.5 * (1 - e) + Math.sin(q * Math.PI * 3) * 0.1 * (1 - q); flail = 0.6 * (1 - q); tripHead = -0.3 * (1 - q); }
      else { beh = null; lookUpT = 1.5; hopT = 0; }
    }
    let waveAmt = 0; if (beh && beh.name === 'wave') { beh.t += dt; waveAmt = 1; if (beh.t > 3.6) beh = null; }
    const sw = walking ? 1 : 0, ph = phase, dph = T * 6.5;
    legs.forEach((lg, i) => {
      const a = ph + (i ? Math.PI : 0), s = Math.sin(a), fl = Math.sin(T * 22 + (i ? Math.PI : 0)), da = Math.sin(dph + (i ? Math.PI : 0));
      let hipA = running ? s * 0.95 * sf + 0.55 * Math.sin(brake * Math.PI) : 0, kneeA = running ? -Math.max(0, Math.sin(a + 1.2)) * 1.5 * sf : 0;
      hipA += fl * 0.8 * flail + da * 0.28 * danceAmt; kneeA += -Math.max(0, fl) * 0.6 * flail - Math.max(0, da) * 0.5 * danceAmt;
      hipA = hipA * (1 - sitAmt) + 1.45 * sitAmt; kneeA = kneeA * (1 - sitAmt) - 1.45 * sitAmt;
      const kk = Math.min(1, dt * 14);
      lg.hip.rotation.z += (hipA - lg.hip.rotation.z) * kk; lg.knee.rotation.z += (kneeA - lg.knee.rotation.z) * kk; lg.ankle.rotation.z += ((-(hipA + kneeA)) - lg.ankle.rotation.z) * kk;
    });
    const bob = walking ? Math.abs(Math.sin(ph)) * 0.035 * sf : Math.sin(T * 1.7) * 0.03;
    let hop = 0; if (hopT >= 0) { hopT += dt * 2.6; hop = Math.sin(Math.min(1, hopT) * Math.PI) * 0.55; if (hopT > 1) hopT = -1; }
    const celHop = Math.abs(Math.sin(T * 5.2)) * 0.85 * celAmt, danceY = Math.abs(Math.sin(dph)) * 0.18 * danceAmt;
    bodyG.position.y = (bob + hop + celHop + danceY) * (1 - sitAmt * 0.8) - 0.5 * sitAmt + tripY + hy;
    { const sy = 1 + sq, sxz = 1 / Math.sqrt(sy); bodyG.scale.set(sxz, sy, sxz); }
    const rzT = (running ? -0.24 * sf + 0.38 * Math.sin(brake * Math.PI) : 0) + tripRot + sitAmt * 0.06 + Math.sin(dph) * 0.06 * danceAmt;
    bodyG.rotation.z += (rzT - bodyG.rotation.z) * Math.min(1, dt * (tripping ? 18 : 8));
    finList.forEach(f => { const amp = waveAmt + celAmt + danceAmt, flap = Math.sin(T * 14) * 0.6 * (waveAmt + celAmt) + Math.sin(dph * 2) * 0.5 * danceAmt + Math.sin(T * 30) * 0.5 * flail; f.fin.rotation.y += ((f.sd * (0.25 * amp + flap + 0.5 * sf)) - f.fin.rotation.y) * Math.min(1, dt * 12); });
    if (spinT >= 0) { spinT += dt / 0.9; if (spinT >= 1) spinT = -1; }
    const spinOff = spinT >= 0 ? (1 - Math.pow(1 - spinT, 3)) * Math.PI * 2 : 0;
    // cuello y cabeza: al llegar mira hacia arriba; luego sigue el puntero y de vez en cuando mira alrededor
    lookUpT = Math.max(0, lookUpT - dt);
    const up = lookUpT > 0 ? 1 : 0; glanceT -= dt; if (glanceT <= 0) { glanceT = 5 + Math.random() * 5; glance = (Math.random() - 0.5) * 1.2; }
    nodT = nodT >= 0 ? nodT + dt * 3 : -1; const nod = nodT >= 0 ? -Math.sin(Math.min(1, nodT) * Math.PI) * 0.45 : 0; if (nodT > 1) nodT = -1;
    const pitch = walking ? 0.1 + lag * 0.6 : up * 0.55 + clamp(ptr.pitch, -0.2, 0.7) * 0.5 + nod + tripHead + celAmt * 0.5 + Math.sin(dph * 2) * 0.2 * danceAmt;
    const yw = walking ? 0 : (up ? ptr.yaw * 0.25 : ptr.yaw * 0.6 + glance * 0.4) + (waveAmt ? Math.sin(T * 2.2) * 0.9 : 0) + Math.sin(dph) * 0.5 * danceAmt;
    const k = Math.min(1, dt * 7);
    n1.rotation.z += ((walking ? 0.28 : 0.18 + up * 0.1) - n1.rotation.z) * k; n2.rotation.z += ((walking ? 0.2 : 0.12 + pitch * 0.25) - n2.rotation.z) * k; n3.rotation.z += ((walking ? 0.1 : 0.05 + pitch * 0.2) - n3.rotation.z) * k;
    neck.rotation.y += (yw * 0.5 - neck.rotation.y) * k; head.rotation.y += (yw * 0.7 - head.rotation.y) * k; head.rotation.z += ((pitch * 0.5 - 0.08 + (walking ? Math.sin(ph * 2) * 0.05 : Math.sin(T * 1.3) * 0.03)) - head.rotation.z) * k;
    blinkT -= dt; const bl = squint < 1 ? squint : (blinkT < 0.12 ? 0.12 : 1); if (blinkT < 0) blinkT = 2.5 + Math.random() * 3; eyes.forEach(e => { e.scale.y = bl; });
    antB.material.emissiveIntensity = 0.9 + Math.sin(T * 4) * 0.4;
    // orientación y posición
    yaw = ang(yaw, (faceCamT > 0 && !walking) ? -Math.PI / 2 + (facing ? 0.15 : -0.15) : (facing ? FACE.left : FACE.right), Math.min(1, dt * 8)); duck.rotation.y = yaw + spinOff; duck.position.set(x, 0, 0); shadow.position.x = x; shadow.scale.x = 1 - (hop + celHop + hy) * 0.3;
    renderer.render(scene, camera);
    const active = !calm || settleT > 0;
    if (active && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const request = () => { if (!raf && alive && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const ro = new ResizeObserver(resize); ro.observe(container);
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) request(); }, { threshold: 0 }); io.observe(container);
  resize(); renderer.render(scene, camera);
  return {
    moveTo, setStage, react, look, resize, setPaused(v) { paused = !!v; calm = reduce || paused; if (calm) { beh = null; spinT = -1; settleT = 1.2; if (mode === 'walk') { x = tx; mode = 'idle'; } } request(); },
    dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); disp.forEach(d => { if (d.map) d.map.dispose(); d.dispose && d.dispose(); }); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); if (scene.environment) scene.environment.dispose(); renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); canvas.remove(); }
  };
}
