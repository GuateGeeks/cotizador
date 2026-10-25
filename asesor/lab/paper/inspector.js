/**
 * Development inspector for the papercraft library: every piece alone or by
 * group, from fixed views, with an assembly scrubber. Used by
 * asesor/lab/inspector.html and tools/paper-shot.cjs. Not loaded by the asesor.
 */
import {
  WebGLRenderer, Scene, OrthographicCamera, MeshBasicMaterial, SkinnedMesh, AxesHelper, OctahedronGeometry, HemisphereLight, DirectionalLight, Color, Mesh, PlaneGeometry,
  ShadowMaterial, Group, Vector3, Quaternion, SRGBColorSpace, NeutralToneMapping, PCFShadowMap, Box3
} from 'three';
import { createBuilder, releaseEntityGroup, clamp, smooth, backOut, rigidSkinning } from '../campus-kit.js';
import { paperKit, newMeta, PAPER } from './kit.js';
import { paperMaterials } from './material.js';
import { CATALOG, GROUPS } from './catalog.js';
import { personPiece, PERSON_POSES } from './inspector-person.js';
import { PRIMARIA_BASE } from './pieces-people.js';

export const VIEWS = Object.freeze({
  '34': { yaw: -.55, pitch: .6 }, front: { yaw: 0, pitch: .4 }, side: { yaw: -Math.PI / 2, pitch: .28 },
  back: { yaw: Math.PI - .55, pitch: .5 }, top: { yaw: 0, pitch: 1.5 }, close: { yaw: -.55, pitch: .45, zoom: 2.6 },
  // Low and close: people and equipment at a table, under the slab of the floor above.
  people: { yaw: -.4, pitch: .22, zoom: 2.6 },
  // Character sheets (construction sheet 01): almost level, so proportions read as drawn.
  'char-front': { yaw: 0, pitch: .12 }, 'char-side': { yaw: -Math.PI / 2, pitch: .12 }, 'char-back': { yaw: Math.PI, pitch: .12 },
  'char-34': { yaw: -.6, pitch: .2 },
  // The campus camera (campus-scene.js: DEFAULT_YAW -.55, PITCH .6).
  campus: { yaw: -.55, pitch: .6 },
  // The seven views of the R2 piece sheets (imagenes/Pxx): left/right are anatomical (+X is the person's left).
  'part-front': { yaw: 0, pitch: .22 }, 'part-back': { yaw: Math.PI, pitch: .22 }, 'part-left': { yaw: Math.PI / 2, pitch: .22 },
  'part-right': { yaw: -Math.PI / 2, pitch: .22 }, 'part-top': { yaw: 0, pitch: 1.45 }, 'part-bottom': { yaw: 0, pitch: -1.45 },
  'part-34': { yaw: -.6, pitch: .35 }
});
const AXES = { x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) };

/** Build one catalog piece into its own skinned group. Errors are captured, never thrown. */
export function buildPiece(piece, materials, opts = {}) {
  const b = createBuilder();
  b.base('solid');
  const p = paperKit(b);
  let meta = null, error = null;
  try { meta = piece.build(b, p, { id: piece.id, ...(piece.opts || {}), ...opts }) || newMeta(); }
  catch (e) { error = String(e && e.stack || e); meta = newMeta(); }
  const group = b.finish(materials);
  // Poses must be applied after finish(): the skeleton binds to the pose bones
  // have at that moment. The resulting pose becomes the rest for the scrubber.
  if (!error && typeof meta.afterFinish === 'function') {
    try {
      meta.afterFinish(group);
      group.userData.rig.root.updateMatrixWorld(true);
      group.userData.rig.bones.forEach(bone => { bone.userData.rest = { position: bone.position.clone(), quaternion: bone.quaternion.clone() }; });
    } catch (e) { error = String(e && e.stack || e); }
  }
  const bounds = new Box3();
  group.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); bounds.union(o.geometry.boundingBox); } });
  return { piece, group, meta, error, triangles: group.userData.triangles, bounds };
}

export function createInspector(container, { pieces = CATALOG, ui = false, labels = true } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  container.style.position = 'relative';
  container.appendChild(renderer.domElement);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;font:600 13px/1.2 Inter,system-ui,sans-serif;color:' + PAPER.ink;
  container.appendChild(overlay);

  const scene = new Scene();
  scene.background = new Color(PAPER.background);
  scene.add(new HemisphereLight(0xffffff, 0xd9cfe6, 1.55));
  const sun = new DirectionalLight(0xfff3e4, 2.1);
  sun.position.set(-6, 11, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new DirectionalLight(0xe6dcff, .45);
  fill.position.set(7, 4, -6); scene.add(fill);
  const ground = new Mesh(new PlaneGeometry(400, 400), new ShadowMaterial({ color: 0x3a2470, opacity: .16 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const camera = new OrthographicCamera(-1, 1, 1, -1, -200, 400);
  const materials = paperMaterials();
  let shown = [], view = VIEWS['34'], viewName = '34', assembly = 1, focusPoint = null, fixed = null, wire = false, socketsOn = false;
  // Axes and attach points (rest pose, root space of the person): one shared material.
  const socketMaterial = new MeshBasicMaterial({ color: 0xff8b22, depthTest: false, transparent: true });
  // Fold edges / wireframe overlay: one shared material, a skinned twin per mesh (follows poses).
  const wireMaterial = rigidSkinning(new MeshBasicMaterial({ color: PAPER.ink, wireframe: true, transparent: true, opacity: .5, depthTest: true }));
  function applyWire() {
    for (const s of shown) s.group.traverse(o => {
      if (o.isSkinnedMesh && o.userData.wireTwin === undefined && (o.name === 'solid' || o.name === 'soft')) {
        const twin = new SkinnedMesh(o.geometry, wireMaterial); twin.name = 'wire'; twin.frustumCulled = false;
        twin.bind(o.skeleton, o.bindMatrix); twin.visible = wire; o.userData.wireTwin = twin; o.parent.add(twin);
      }
      if (o.name === 'wire') o.visible = wire;
    });
  }

  function clear() { shown.forEach(s => { s.group.getObjectByName('sockets')?.traverse(o => o.geometry?.dispose()); releaseEntityGroup(s.group); }); shown = []; overlay.textContent = ''; }

  function place(list, columns) {
    // Spacing follows the pieces' own scale, so tabletop props are not lost in empty space.
    const sizes = list.map(s => s.bounds.getSize(new Vector3()));
    const typical = sizes.map(v => Math.max(v.x, v.z)).sort((x, y) => x - y)[Math.floor(sizes.length / 2)] || 1;
    const gap = Math.max(.12, typical * .9);
    const cells = list.map((s, i) => ({ s, w: Math.max(typical * .4, sizes[i].x), d: Math.max(typical * .4, sizes[i].z) }));
    const cols = columns || Math.ceil(Math.sqrt(list.length * 1.6));
    const rows = [];
    for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols));
    let z = 0;
    rows.forEach(row => {
      const depth = Math.max(...row.map(c => c.d)), width = row.reduce((n, c) => n + c.w, 0) + gap * (row.length - 1);
      let x = -width / 2;
      row.forEach(c => {
        const center = c.s.bounds.getCenter(new Vector3());
        c.s.group.position.set(x + c.w / 2 - center.x, 0, z + depth / 2 - center.z);
        x += c.w + gap;
      });
      z += depth + gap * 1.6;
    });
    // Centre the whole layout on the origin.
    const zmid = (z - gap * 1.6) / 2;
    list.forEach(s => { s.group.position.z -= zmid; });
  }

  function worldBounds() {
    const box = new Box3();
    shown.forEach(s => box.union(s.bounds.clone().translate(s.group.position)));
    return box;
  }

  function frame() {
    // A fixed frame keeps the camera between growth states, so growth reads physically.
    const box = fixed || worldBounds();
    if (box.isEmpty()) return;
    const w = container.clientWidth || 800, h = container.clientHeight || 600;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    const center = focusPoint || box.getCenter(new Vector3());
    const dir = new Vector3(Math.sin(view.yaw) * Math.cos(view.pitch), Math.sin(view.pitch), Math.cos(view.yaw) * Math.cos(view.pitch));
    camera.position.copy(center).addScaledVector(dir, 60);
    camera.up.set(0, 1, 0);
    if (view.pitch > 1.45) camera.up.set(0, 0, -1);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    const inv = camera.matrixWorldInverse;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const xi of [box.min.x, box.max.x]) for (const yi of [box.min.y, box.max.y]) for (const zi of [box.min.z, box.max.z]) {
      const v = new Vector3(xi, yi, zi).applyMatrix4(inv);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    }
    const pad = labels && shown.length > 1 ? (y1 - y0) * .08 : 0;
    let cw = (x1 - x0) * 1.12, ch = (y1 - y0) * 1.18 + pad * 2;
    let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - pad;
    if (focusPoint) { cx = 0; cy = 0; }
    if (cw / ch < w / h) cw = ch * w / h; else ch = cw * h / w;
    const zoom = view.zoom || 1;
    camera.left = cx - cw / 2 / zoom; camera.right = cx + cw / 2 / zoom; camera.top = cy + ch / 2 / zoom; camera.bottom = cy - ch / 2 / zoom;
    camera.updateProjectionMatrix();
    const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 4);
    sun.position.copy(center).add(new Vector3(-6, 11, 8).normalize().multiplyScalar(span * 2));
    sun.target.position.copy(center);
    const sc = sun.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = .1; sc.far = span * 5; sc.updateProjectionMatrix();
  }

  function paintLabels() {
    overlay.textContent = '';
    if (!labels || shown.length < 2) return;
    const w = container.clientWidth, h = container.clientHeight;
    // Labels sit under each piece; a label that would cover another one moves down.
    const placed = [];
    shown.forEach(s => {
      const b = s.bounds.clone().translate(s.group.position);
      const v = new Vector3((b.min.x + b.max.x) / 2, 0, b.max.z + .15).project(camera);
      const el = document.createElement('div');
      el.textContent = s.piece.label + (s.error ? ' · ERROR' : '');
      const x = (v.x + 1) / 2 * w, width = el.textContent.length * 7.4 + 8;
      let y = (1 - v.y) / 2 * h + 6;
      for (let guard = 0; guard < 12 && placed.some(r => Math.abs(r.x - x) < (r.w + width) / 2 && Math.abs(r.y - y) < 17); guard++) y += 17;
      placed.push({ x, y, w: width });
      el.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:translateX(-50%);white-space:nowrap;background:#f4f1f6cc;padding:0 4px;border-radius:4px;` + (s.error ? 'color:#c0262d' : '');
      overlay.appendChild(el);
    });
  }

  function applyAssembly() {
    for (const s of shown) {
      const staged = s.meta.staged || [];
      if (!staged.length) continue;
      const orders = Math.max(...staged.map(i => i.order)) + 1;
      for (const item of staged) {
        const bone = s.group.userData.rig.get(item.name);
        if (!bone) continue;
        const rest = bone.userData.rest;
        // Each order owns a window; neighbours overlap by half a window.
        const k = clamp((assembly * (orders + .5) - item.order) / 1.5);
        bone.position.copy(rest.position); bone.quaternion.copy(rest.quaternion); bone.scale.set(1, 1, 1);
        if (k >= 1) continue;
        if (item.style === 'fold') {
          const q = new Quaternion().setFromAxisAngle(AXES[item.axis || 'x'], (item.from ?? -Math.PI / 2) * (1 - smooth(k)));
          bone.quaternion.copy(rest.quaternion).multiply(q);
          if (k <= 0 && item.hidden !== false) bone.scale.setScalar(.001);
        } else if (item.style === 'rise') bone.scale.set(1, Math.max(.001, smooth(k)), 1);
        else if (item.style === 'drop') { bone.position.y = rest.position.y + (1 - smooth(k)) * 1.1; if (k <= 0) bone.scale.setScalar(.001); }
        else bone.scale.setScalar(Math.max(.001, k > 0 ? backOut(k) : 0));
      }
    }
  }

  function render() { frame(); applyAssembly(); applyWire(); renderer.render(scene, camera); paintLabels(); }

  function buildList(ids) {
    const list = ids.map(id => pieces.find(piece => piece.id === id)).filter(Boolean).map(piece => buildPiece(piece, materials));
    list.forEach(s => scene.add(s.group));
    return list;
  }

  const api = {
    groups: () => GROUPS.filter(g => pieces.some(p => p.group === g.id)),
    pieces: group => pieces.filter(p => !group || p.group === group).map(p => ({ id: p.id, label: p.label, group: p.group })),
    showGroup(group, { columns } = {}) {
      clear(); focusPoint = null; fixed = null;
      shown = buildList(pieces.filter(p => p.group === group).map(p => p.id));
      place(shown, columns); render(); return api.info();
    },
    show(id, { view: name = viewName } = {}) {
      clear(); fixed = null; viewName = name; view = VIEWS[name] || VIEWS['34'];
      shown = buildList([id]);
      const s = shown[0];
      focusPoint = name === 'close' && s ? new Vector3(...(s.meta.focus || [0, .6, 0])) : null;
      render(); return api.info();
    },
    /** Show an ad-hoc piece (for example a composed campus) that is not in the catalog. */
    showPiece(piece, { view: name = viewName, frame = null, focus = null, zoom = null } = {}) {
      clear(); viewName = name; view = { ...(VIEWS[name] || VIEWS['34']), ...(zoom ? { zoom } : {}) };
      focusPoint = focus ? new Vector3(...focus) : null;
      fixed = frame ? new Box3(new Vector3(frame[0], frame[1], frame[2]), new Vector3(frame[3], frame[4], frame[5])) : null;
      const s = buildPiece(piece, materials);
      scene.add(s.group); shown = [s];
      render(); return { ...api.info()[0], missing: s.meta.missing || [] };
    },
    setView(name) {
      viewName = name; view = VIEWS[name] || VIEWS['34'];
      const s = shown.length === 1 ? shown[0] : null;
      focusPoint = name === 'close' && s ? new Vector3(...(s.meta.focus || [0, .6, 0])).add(s.group.position) : null;
      render();
    },
    setAssembly(value) { assembly = clamp(value); render(); },
    /** Toggle the fold-edge (wireframe) overlay. */
    setWire(value) { wire = !!value; render(); },
    /** Axes at the person's root and the attach points (sockets) of every R2 instance; applies to the next showPerson. */
    setSockets(value) { socketsOn = !!value; },
    /**
     * Character mode: one person from an explicit spec (default: the primaria base
     * student), a named pose and an optional list of components to isolate.
     * Returns id / bone / real triangles per component and the measured landmarks.
     */
    showPerson({ spec = PRIMARIA_BASE, pose = 'rest', only = null, view: name = viewName, zoom = null, focus = null, frame = null } = {}) {
      clear(); fixed = frame ? new Box3(new Vector3(frame[0], frame[1], frame[2]), new Vector3(frame[3], frame[4], frame[5])) : null; viewName = name; view = { ...(VIEWS[name] || VIEWS['34']), ...(zoom ? { zoom } : {}) };
      focusPoint = focus ? new Vector3(...focus) : null;
      const s = buildPiece(personPiece({ spec, pose, only }), materials);
      scene.add(s.group); shown = [s];
      render();
      const person = s.meta.person;
      if (socketsOn && person?.sockets?.length) {
        const g = new Group(); g.name = 'sockets';
        g.add(new AxesHelper(.12));
        for (const k of person.sockets) { const m_ = new Mesh(new OctahedronGeometry(.005), socketMaterial); m_.position.set(...k.root); m_.renderOrder = 5; g.add(m_); }
        s.group.add(g); render();
      }
      const call = renderer.info.render;
      return { ...api.info()[0], pose, only, render: { calls: call.calls, triangles: call.triangles }, sockets: person?.sockets || null, components: person?.components || null, plan: person?.plan || null, landmarks: person?.landmarks || null };
    },
    poses: () => Object.keys(PERSON_POSES),
    /** CSS-pixel distance between two world points with the current camera (scale probes). */
    projectedDistance(a, b) {
      const w = container.clientWidth, h = container.clientHeight;
      const pa = new Vector3(...a).project(camera), pb = new Vector3(...b).project(camera);
      return Math.hypot((pa.x - pb.x) / 2 * w, (pa.y - pb.y) / 2 * h);
    },
    /** GPU resources the renderer still holds (leak checks). */
    memory: () => ({ ...renderer.info.memory, programs: renderer.info.programs?.length ?? null }),
    info: () => shown.map(s => ({ id: s.piece.id, label: s.piece.label, group: s.piece.group, triangles: s.triangles, budget: s.piece.budget ?? null,
      size: s.bounds.isEmpty() ? null : s.bounds.getSize(new Vector3()).toArray().map(v => Math.round(v * 1000) / 1000),
      declared: s.piece.size || null, staged: (s.meta.staged || []).length, error: s.error,
      box: s.bounds.isEmpty() ? null : [...s.bounds.min.toArray(), ...s.bounds.max.toArray()].map(v => Math.round(v * 1000) / 1000) })),
    render,
    dispose() { clear(); renderer.dispose(); renderer.domElement.remove(); overlay.remove(); }
  };
  if (ui) { mountUI(container, api); mountPersonUI(container, api); }
  window.addEventListener('resize', render);
  return api;
}

function mountUI(container, api) {
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;left:12px;top:12px;display:flex;flex-direction:column;gap:6px;max-height:calc(100% - 24px);overflow:auto;background:#fffaf3e6;border-radius:12px;padding:10px;font:500 13px Inter,system-ui,sans-serif;color:#321853;z-index:2;width:220px';
  container.appendChild(bar);
  const button = (text, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.style.cssText = 'text-align:left;border:1px solid #e5dfe9;background:#fff;border-radius:8px;padding:6px 8px;cursor:pointer;font:inherit;color:inherit'; b.onclick = fn; return b; };
  const views = document.createElement('div'); views.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px';
  Object.keys(VIEWS).forEach(v => views.appendChild(button(v, () => api.setView(v))));
  bar.appendChild(views);
  const slider = document.createElement('input'); slider.type = 'range'; slider.min = 0; slider.max = 1; slider.step = .01; slider.value = 1;
  slider.setAttribute('aria-label', 'Ensamblaje'); slider.oninput = () => api.setAssembly(Number(slider.value));
  bar.appendChild(slider);
  api.groups().forEach(g => {
    const h = document.createElement('strong'); h.textContent = g.label; h.style.marginTop = '6px'; bar.appendChild(h);
    bar.appendChild(button('Ver todo', () => api.showGroup(g.id)));
    api.pieces(g.id).forEach(p => bar.appendChild(button(p.label, () => api.show(p.id))));
  });
  const first = api.groups()[0];
  if (first) api.showGroup(first.id);
}

/** Character panel: pose, view, edges and one checkbox per component of the primaria student. */
function mountPersonUI(container, api) {
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;right:12px;top:12px;display:flex;flex-direction:column;gap:6px;max-height:calc(100% - 24px);overflow:auto;background:#fffaf3e6;border-radius:12px;padding:10px;font:500 13px Inter,system-ui,sans-serif;color:#321853;z-index:2;width:250px';
  container.appendChild(box);
  const state = { pose: 'rest', view: 'char-34', only: new Set(), wire: false };
  const title = document.createElement('strong'); title.textContent = 'Alumno de primaria'; box.appendChild(title);
  const select = (label, options, key) => {
    const l = document.createElement('label'); l.textContent = label + ' '; const s = document.createElement('select');
    options.forEach(o => { const opt = document.createElement('option'); opt.value = o; opt.textContent = o; s.appendChild(opt); });
    s.value = state[key]; s.onchange = () => { state[key] = s.value; show(); }; l.appendChild(s); box.appendChild(l);
  };
  select('Pose', api.poses(), 'pose');
  select('Vista', Object.keys(VIEWS), 'view');
  const wire = document.createElement('label'); const wc = document.createElement('input'); wc.type = 'checkbox';
  wc.onchange = () => { state.wire = wc.checked; api.setWire(state.wire); }; wire.append(wc, ' Aristas'); box.appendChild(wire);
  const sk = document.createElement('label'); const skc = document.createElement('input'); skc.type = 'checkbox';
  skc.onchange = () => { api.setSockets(skc.checked); show(); }; sk.append(skc, ' Ejes y puntos de unión'); box.appendChild(sk);
  const list = document.createElement('div'); box.appendChild(list);
  const total = document.createElement('div'); box.appendChild(total);
  function show() {
    const info = api.showPerson({ pose: state.pose, view: state.view, only: [...state.only] });
    api.setWire(state.wire);
    list.textContent = '';
    const all = (info.components || []);
    all.forEach(c => {
      const row = document.createElement('label'); row.style.cssText = 'display:flex;gap:6px;align-items:baseline';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = state.only.has(c.id);
      cb.onchange = () => { if (cb.checked) state.only.add(c.id); else state.only.delete(c.id); show(); };
      const txt = document.createElement('span'); txt.textContent = `${c.id} · ${c.label} · ${c.bones.join('/')} · ${c.triangles} · [${(c.ranges || []).map(r => r.join('–')).join(', ')}]`;
      row.append(cb, txt); list.appendChild(row);
    });
    total.textContent = `Triángulos: ${info.triangles} (marca piezas para aislarlas)`;
  }
  const open = document.createElement('button'); open.type = 'button'; open.textContent = 'Mostrar alumno'; open.onclick = show; box.appendChild(open);
}
