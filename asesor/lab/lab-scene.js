/*
 * Escenas 3D del asesor: el campus papercraft (campus-scene.js) y el pato robot del avance.
 * La antigua escena del laboratorio de la portada (createLab) se retiró: el campus la reemplaza.
 * Se compila con esbuild junto a three.js (MIT) en vendor/lab-scene.min.js. Ver LEEME.md.
 */
import {
  WebGLRenderer, Scene, Group, Mesh, Color, Shape, ExtrudeGeometry, CylinderGeometry, SphereGeometry, PlaneGeometry,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, CanvasTexture, SRGBColorSpace, HemisphereLight, DirectionalLight,
  ACESFilmicToneMapping, PMREMGenerator, OrthographicCamera
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
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
function blobTexture(alpha = 0.5) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, `rgba(8,4,20,${alpha})`); g.addColorStop(0.55, `rgba(8,4,20,${alpha * 0.45})`); g.addColorStop(1, 'rgba(8,4,20,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

export { createMascot } from './campus-scene.js';

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
