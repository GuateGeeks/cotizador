/**
 * Living papercraft campus. The scene is fed by the growth plan (paper/plan.js):
 * its modules are grouped into a few entities (paper/scene-entities.js), each one
 * a single skinned group built from the paper catalog. New pieces assemble from
 * their `stage` declarations (paper/scene-assembly.js), activities end at rest
 * (paper/scene-activity.js) and rendering is on demand. All GPU resources are
 * disposed on replacement or on dispose(); the shared materials are kept.
 */
import {
  WebGLRenderer, Scene, OrthographicCamera, Mesh, MeshBasicMaterial, HemisphereLight, DirectionalLight, BoxGeometry,
  RingGeometry, PlaneGeometry, ShadowMaterial, Color, SRGBColorSpace, NeutralToneMapping, PCFShadowMap, Vector3, Vector2, Raycaster, DoubleSide, BufferGeometry, SkinnedMesh
} from 'three';
import { PROGRAM_NAMES, LEVEL_NAMES } from './campus-layout.js';
import { releaseEntityGroup, clamp, lerp, backOut } from './campus-kit.js';
import { createGeeky } from './campus-geeky.js';
import { paperMaterials } from './paper/material.js';
import { PAPER } from './paper/kit.js';
import { planCampus } from './paper/plan.js';
import { groupPlan, entitySignature, buildEntityGroup, selectionOf } from './paper/scene-entities.js';
import { bindStaged, planAssembly, applyAssembly, pendingOf } from './paper/scene-assembly.js';
import { RUN, tickActors, walkerWorld } from './paper/scene-activity.js';

// Measured budget (see docs/campus-3d.md): triangles include the shadow pass.
export const CAMPUS_BUDGET = Object.freeze({ triangles: 40000, drawCalls: 150, materials: 10 });
const DEFAULT_YAW = -.55, YAW_LIMIT = 1.35, PITCH = .6, DISTANCE = 30;
const PITCH_MIN = .2, PITCH_MAX = 1.15;
// Up close the camera frames roughly one student; zoom is multiplicative.
const ZOOM_MIN = .7, ZOOM_MAX = 9;
export const VIEW_NAMES = Object.freeze(['overview', 'front', 'patio', 'people', 'program']);

export function createMascot(container, opts = {}) {
  const reduced = !!opts.reduceMotion;
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(PAPER.background, 1);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'mascot-canvas campus-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'grab';
  container.appendChild(canvas);
  const tag = document.createElement('div');
  tag.className = 'campus-tag'; tag.setAttribute('aria-hidden', 'true'); tag.hidden = true;
  container.appendChild(tag);

  const scene = new Scene(), camera = new OrthographicCamera(-8, 8, 6, -6, .1, 80);
  scene.background = new Color(PAPER.background);
  // Light as in the papercraft inspector: bright sky, warm key with soft shadows, lilac fill.
  scene.add(new HemisphereLight(0xffffff, 0xd9cfe6, 1.55));
  const sun = new DirectionalLight(0xfff3e4, 2.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new DirectionalLight(0xe6dcff, .45);
  fill.position.set(8, 5, -9); scene.add(fill);
  const groundMaterial = new ShadowMaterial({ color: 0x3a2470, opacity: .16 });
  const groundGeometry = new PlaneGeometry(240, 240);
  const ground = new Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.552; ground.receiveShadow = true; scene.add(ground);

  const materials = paperMaterials();
  const markerMaterial = new MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: .85, side: DoubleSide, depthWrite: false, toneMapped: false });
  const hitMaterial = new MeshBasicMaterial({ visible: false });
  const hitGeometry = new BoxGeometry(1, 1, 1), markerGeometry = new RingGeometry(.92, 1, 40);
  const marker = new Mesh(markerGeometry, markerMaterial);
  marker.rotation.x = -Math.PI / 2; marker.visible = false; marker.renderOrder = 3;
  scene.add(marker);
  const geeky = createGeeky(materials);
  scene.add(geeky.group);

  // ---- state
  const records = new Map();
  let confirmed = planCampus({}), plan = confirmed, previewState = null, lastData = {}, world = walkerWorld(plan);
  let disposed = false, lost = false, ready = false;
  let paused = false, visible = true, pendingFrame = 0, pendingTimer = 0, lastTime = 0, animationTime = 0, activityTicks = 0;
  // Activity runs: `run` counts them, `runStart` is when the current one began (animation clock).
  let run = 0, runStart = -1e9;
  let yaw = DEFAULT_YAW, targetYaw = DEFAULT_YAW, pitch = PITCH, targetPitch = PITCH, zoomValue = 1, targetZoom = 1, pointer = null, hovered = null;
  let size = { w: 800, h: 500 }, insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const pan = new Vector3(), panTarget = new Vector3(), axisX = new Vector3(), axisY = new Vector3();
  const touches = new Map();
  let hoverVerb = 'Editar';
  let viewMode = 'overview';
  let frameBox = null; // retained framing: kept while the campus fits
  let view = { x: 0, y: .6, z: 0, half: 4 }, targetView = { ...view };
  let focus = { kind: 'overview' }, lastCue = null, cueSequence = 0, configurationKey = '';
  const raycaster = new Raycaster(), mouse = new Vector2();
  const moving = () => !reduced && !paused;
  const runTime = () => moving() ? clamp(animationTime - runStart, 0, RUN) : RUN;
  const freeArea = () => ({ w: Math.max(size.w * .3, size.w - insets.left - insets.right), h: Math.max(size.h * .22, size.h - insets.top - insets.bottom) });

  // ---------------------------------------------------------------- plan helpers
  const centerOf = p => ({ x: (p.bounds.x0 + p.bounds.x1) / 2, z: (p.bounds.z0 + p.bounds.z1) / 2 });
  const moduleFor = (p, select) => {
    if (!select) return null;
    const rooms = p.modules.filter(m => m.type.startsWith('room-'));
    if (select.kind === 'program') return rooms.find(m => m.programId === select.id) || p.modules.find(m => m.type === 'patio' && m.programId === select.id) || null;
    if (select.kind === 'level') return rooms.filter(m => m.levelId === select.id).sort((a, b) => a.y - b.y)[0] || null;
    return null;
  };
  const programLevels = id => {
    const eq = plan.normalized.equipment[id];
    return eq ? [...new Set(eq.groupIds.map(gid => plan.normalized.enrollment.find(row => row.id === gid)?.levelId).filter(Boolean))] : [];
  };
  const records_ = () => [...records.values()].filter(record => !record.removing);

  // ---------------------------------------------------------------- camera
  function axes(y, p) {
    const right = new Vector3(Math.cos(y), 0, -Math.sin(y)), dir = new Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
    return { right, up: new Vector3().crossVectors(dir, right).normalize() };
  }
  /** Largest screen offsets of the campus box around a centre, in world units. */
  function extent(p, center, y, pt) {
    const { right, up } = axes(y, pt), b = p.bounds, v = new Vector3();
    let sx = 0, sy = 0;
    for (const x of [b.x0, b.x1]) for (const h of [-.55, b.height]) for (const z of [b.z0, b.z1]) {
      v.set(x - center.x, h - center.y, z - center.z);
      sx = Math.max(sx, Math.abs(v.dot(right))); sy = Math.max(sy, Math.abs(v.dot(up)));
    }
    return { sx, sy };
  }
  function fitBox(p, y, pt, free) {
    const c = centerOf(p), center = { x: c.x, y: p.bounds.height * .3, z: c.z };
    const e = extent(p, center, y, pt);
    return { ...center, half: Math.max(e.sy, e.sx / (free.w / free.h)) * 1.05 };
  }
  function positionCamera() {
    // Pixels per world unit come from the free area; the look-at point lands at its centre.
    const free = freeArea(), ppu = (free.h / 2) / (view.half / zoomValue);
    const cx = (insets.left - insets.right) / 2, cy = (insets.bottom - insets.top) / 2;
    camera.left = (-size.w / 2 - cx) / ppu; camera.right = (size.w / 2 - cx) / ppu;
    camera.top = (size.h / 2 - cy) / ppu; camera.bottom = (-size.h / 2 - cy) / ppu;
    const cx0 = view.x + pan.x, cy0 = view.y + pan.y, cz0 = view.z + pan.z;
    camera.position.set(cx0 + Math.sin(yaw) * Math.cos(pitch) * DISTANCE, cy0 + Math.sin(pitch) * DISTANCE, cz0 + Math.cos(yaw) * Math.cos(pitch) * DISTANCE);
    camera.lookAt(cx0, cy0, cz0);
    camera.updateProjectionMatrix();
  }
  /** World-space focus for the camera, stable (not following moving things). */
  function focusSelect() {
    const programId = focus.programId || (focus.kind === 'program' ? focus.id : null);
    const levelId = focus.levelId || (focus.kind === 'level' ? focus.id : null);
    return programId && moduleFor(plan, { kind: 'program', id: programId }) ? { kind: 'program', id: programId }
      : levelId && moduleFor(plan, { kind: 'level', id: levelId }) ? { kind: 'level', id: levelId } : null;
  }
  function focusTarget() {
    const select = focusSelect() || (previewState?.active ? { kind: 'program', id: previewState.programId } : null);
    const m = moduleFor(plan, select);
    if (!m) return null;
    const patio = m.type === 'patio';
    return { x: m.x, y: m.y + (patio ? .45 : .85), z: m.z + (patio ? 0 : .3), base: m.y, half: patio ? 2.8 : 2.6, kind: select.kind, id: select.id, module: m, radius: patio ? 1.5 : 1.7 };
  }
  const explicit = () => ['explore', 'edit'].includes(focus.emphasis) || (!focus.emphasis && ['groups', 'sharing', 'stations', 'equipment', 'plan'].includes(focus.kind));
  /** Fixed framings for setView(); null = follow the camera rules below. */
  function viewTarget() {
    const c = centerOf(plan), b = plan.bounds;
    if (viewMode === 'patio') {
      const patio = plan.modules.find(m => m.type === 'patio');
      const at = patio ? { x: patio.x, z: patio.z } : { x: c.x, z: b.z1 - 3 };
      return { x: at.x, y: .5, z: at.z - .4, half: 3.1 };
    }
    if (viewMode === 'people') {
      // Low, close view of a table; a ground-floor room whose front is not hidden by a stair.
      const stairs = plan.modules.filter(m => m.type === 'stairs');
      const ground = plan.modules.filter(m => m.type.startsWith('room-') && (m.y || 0) < .5);
      const clear = ground.filter(m => stairs.every(st => Math.abs(st.x - m.x) > 2.2 || st.z + 1 < m.z));
      const room = [...(clear.length ? clear : ground)].sort((a, c) => (c.programId ? 1 : 0) - (a.programId ? 1 : 0))[0];
      return room ? { x: room.x - .35, y: .55, z: room.z + .05, half: 1.45 } : null;
    }
    if (viewMode === 'program') {
      const t = focusTarget();
      if (t) return { x: t.x, y: t.y, z: t.z, half: t.half };
      const room = plan.modules.find(m => m.type.startsWith('room-') && m.programId) || plan.modules.find(m => m.type.startsWith('room-'));
      return room ? { x: room.x, y: room.y + .85, z: room.z + .3, half: 2.6 } : null;
    }
    return null;
  }
  function applyView() {
    const free = freeArea(), fixed = viewTarget();
    if (fixed) { targetView = fixed; return; }
    // Keep the framing while the whole campus fits; widen it only to avoid clipping.
    const base = fitBox(plan, targetYaw, targetPitch, free);
    if (!frameBox) frameBox = base;
    else {
      const e = extent(plan, frameBox, targetYaw, targetPitch);
      if (e.sy > frameBox.half * .985 || e.sx > frameBox.half * (free.w / free.h) * .985) frameBox = { ...base };
    }
    const target = focusTarget();
    if (!target) { targetView = { ...frameBox }; return; }
    // Wizard context is a gentle emphasis; an explicit exploration frames the activity.
    const k = explicit() ? 1 : .2;
    targetView = { x: lerp(frameBox.x, target.x, k), y: lerp(frameBox.y, target.y, k), z: lerp(frameBox.z, target.z, k),
      half: explicit() ? lerp(frameBox.half, Math.min(frameBox.half, target.half), k) : frameBox.half * 1.03 };
  }
  /** Geeky steps out of close-up framings (people view, tight zoom) so it never covers the work. */
  const geekyHidden = () => viewMode === 'people' || view.half / zoomValue < 1.6;
  function lighting() {
    const c = centerOf(plan), b = plan.bounds, s = Math.max(b.width, b.depth) / 2 + 2.2;
    sun.position.set(c.x - 3, 14, c.z + 4); sun.target.position.set(c.x, 0, c.z);
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 40 });
    sun.shadow.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- activity
  /** Start an activity run unless one is still going (never interrupts or snaps). */
  function triggerActivity() {
    if (disposed || !moving()) return;
    if (runTime() >= RUN) { run++; runStart = animationTime; }
  }
  function tickAll() {
    const u = runTime(), drones = [];
    for (const record of records.values()) if (!record.removing && record.meta.actors) tickActors(record.meta.actors, run, u, world, drones);
  }

  // ---------------------------------------------------------------- entities
  function makeRecord(entity, previous, assembleOpts) {
    const built = buildEntityGroup(entity, plan, materials);
    const { group } = built;
    group.userData.entityKey = entity.key;
    const staged = bindStaged(built.meta, built.rig);
    planAssembly(staged, { before: previous?.names, pending: previous ? pendingOf(previous.staged) : null, moduleKeys: entity.moduleKeys.size ? entity.moduleKeys : new Set([entity.key]), ...assembleOpts });
    const selects = [];
    for (const m of entity.modules) {
      const select = selectionOf(m);
      if (!select) continue;
      const proxy = new Mesh(hitGeometry, hitMaterial);
      proxy.position.set(m.x, m.y + .85, m.z); proxy.scale.set(2.5, 1.7, 2.2);
      proxy.userData.select = select;
      group.add(proxy);
      selects.push({ ...select, module: m, proxy });
    }
    return { entity, group, meta: built.meta, error: built.error, staged, names: new Set(built.rig.bones.map(bone => bone.name)),
      selects, people: built.rig.bones.filter(bone => bone.name.endsWith('.hips')).length, triangles: built.triangles };
  }

  function update(data) {
    if (disposed) return;
    lastData = data || {};
    const { preview, ...rest } = lastData;
    const before = new Set(confirmed.normalized.programs);
    confirmed = planCampus(rest);
    // Geeky celebrates a program that joins the proposal (never a preview, never on first load).
    if (ready && confirmed.normalized.programs.some(id => !before.has(id))) geeky.cue?.('celebrate');
    const programId = preview && typeof preview === 'object' ? preview.programId : null;
    const previewActive = !!programId && Object.keys(confirmed.normalized.equipment).length >= 0 && !confirmed.normalized.programs.includes(programId)
      && ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'].includes(programId);
    const confirmedKeys = new Set(confirmed.modules.map(m => m.key));
    plan = previewActive ? planCampus({ ...rest, programs: [...(rest.programs || []), programId] }) : confirmed;
    previewState = programId ? { programId, active: previewActive, keys: previewActive ? plan.modules.filter(m => !confirmedKeys.has(m.key)).map(m => m.key) : [] } : null;
    world = walkerWorld(plan);

    const groups = groupPlan(plan);
    const wanted = new Set(groups.map(group => group.key));
    for (const [key, record] of records) if (!wanted.has(key)) record.removing = true;
    // Fresh modules assemble in plan order, overlapping, never queued behind older work.
    const known = new Set([...records.values()].filter(record => !record.removing).flatMap(record => [...record.entity.moduleKeys, record.entity.key]));
    const freshModules = groups.flatMap(group => (group.modules.length ? group.modules : [{ key: group.key, order: 0 }]).filter(m => !known.has(m.key)))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.key < b.key ? -1 : 1));
    const moduleIndex = new Map(freshModules.map((m, i) => [m.key, i]));
    const stagger = Math.min(.14, 1.6 / Math.max(1, freshModules.length));
    const animate = ready && moving();
    let changed = false;
    for (const group of groups) {
      const signature = entitySignature(group, plan);
      const previous = records.get(group.key);
      if (previous && previous.signature === signature && !previous.removing) { previous.entity = group; previous.selects.forEach(s => { s.module = group.modules.find(m => m.key === s.module.key) || s.module; }); continue; }
      const live = previous && !previous.removing ? previous : null;
      const record = makeRecord(group, live, { moduleIndex, stagger, now: animationTime, animate });
      if (record.error) console.error('campus entity', group.key, record.error);
      record.signature = signature;
      if (previous) { releaseEntityGroup(previous.group); }
      scene.add(record.group);
      records.set(group.key, record);
      changed = true;
      applyAssembly(record.staged, animationTime, !animate);
    }
    if (changed && animate) assemblyDeadline = performance.now() + 3500;
    lighting();
    const nextKey = JSON.stringify({ normalized: confirmed.normalized, activeConfig: lastData.activeConfig, preview: programId });
    if (nextKey !== configurationKey) {
      configurationKey = nextKey;
      const requested = lastData.activeConfig || (lastData.focusedProgram ? { kind: 'program', programId: lastData.focusedProgram } : lastData.focusedLevel ? { kind: 'level', levelId: lastData.focusedLevel } : focus);
      setFocus(requested, true);
    } else applyView();
    if (changed) triggerActivity();
    tickAll();
    if (!moving() || !canRender()) settle();
    schedule();
  }

  // ---------------------------------------------------------------- overlays
  function updateMarker(time) {
    const target = focusTarget();
    marker.visible = !!target && (explicit() || !!previewState?.active && target.id === previewState.programId);
    if (!marker.visible) return;
    const isPreview = previewState?.active && target.id === previewState.programId && !focusSelect();
    markerMaterial.color.set(isPreview ? 0x25c2c6 : 0xffc857);
    marker.position.set(target.module.x, target.base + .03 + (target.module.type === 'patio' ? 0 : .12), target.module.z);
    marker.scale.setScalar(target.radius * (moving() ? 1 + Math.sin(time * 3) * .015 : 1));
  }
  function updateTag() {
    // Hover wins: it previews what a click will open for editing.
    const target = hovered ? { kind: hovered.kind, id: hovered.id, hover: true } : focusTarget();
    const m = target && moduleFor(plan, target);
    if (!m || !ready) { tag.hidden = true; return; }
    const name = target.kind === 'program' ? PROGRAM_NAMES[target.id] : LEVEL_NAMES[target.id];
    const levels = target.kind === 'program' ? programLevels(target.id) : [];
    const isPreview = target.kind === 'program' && previewState?.active && previewState.programId === target.id;
    const text = (isPreview ? 'Vista previa · ' : '') + name + (levels.length ? ' · ' + levels.map(id => LEVEL_NAMES[id]).join(', ') : '');
    const label = target.hover ? name + ' · ' + hoverVerb : text;
    if (tag.textContent !== label || tag.hidden) { tag.textContent = label; tag.hidden = false; tag.dataset.width = tag.offsetWidth; }
    const point = new Vector3(m.x, m.y + (m.type === 'patio' ? 1.3 : 2.05), m.z).project(camera);
    const width = container.clientWidth, height = container.clientHeight;
    const half = Math.min(width / 2 - 8, (Number(tag.dataset.width) || 120) / 2 + 8);
    const x = clamp((point.x * .5 + .5) * width, insets.left + half, width - insets.right - half);
    const y = clamp((.5 - point.y * .5) * height, insets.top + 34, Math.max(insets.top + 34, height - insets.bottom - 8));
    tag.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
    tag.hidden = false;
  }
  /** Top of the roof over the stack at (x, z), or of the ground when nothing is built there. */
  const ROOF_H = .42;
  const roofTop = (x, z) => Math.max(0, ...plan.modules.filter(m => m.type === 'roof' && Math.abs(m.x - x) < 1.3 && Math.abs(m.z - z) < 1.15).map(m => m.y + ROOF_H));
  function geekyGoal() {
    const c = centerOf(plan), target = focusTarget();
    const away = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    if (target && explicit()) {
      // Above the roof of the focused activity, nudged away from the camera: never in front of a balcony or the stairs.
      const top = roofTop(target.x, target.z) || target.y + 1.3, right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
      return { goal: { x: target.x + right.x * 1.1 + away.x * .5, y: top + .35, z: target.z + right.z * 1.1 + away.z * .5 }, look: [target.x, target.y, target.z], perched: false, celebrate: false, ground: top };
    }
    // At rest Geeky perches on the roof of the outermost wing (left of the camera), clear of the stairs and galleries.
    const roofs = plan.modules.filter(m => m.type === 'roof').sort((a, b) => a.x - b.x || b.z - a.z);
    const perch = roofs[0] ? [roofs[0].x, roofs[0].y + ROOF_H, roofs[0].z] : [c.x - 2, 0, c.z];
    const look = target ? [target.x, target.y, target.z] : [c.x, .5, c.z + 1];
    return { goal: { x: perch[0], y: perch[1] + .55, z: perch[2] }, look, perched: true, celebrate: false, ground: perch[1] };
  }

  // ---------------------------------------------------------------- x-ray of a focused classroom
  // A focused (or closely zoomed) classroom shows its interior: its roof, the floors above it, its own
  // wall facing the camera and every tall module between it and the camera are drawn as translucent card.
  // Furniture and people of a classroom above are hidden, so only its card shell remains as a veil; whole
  // buildings between the camera and the classroom are hidden.
  // The index is reordered as [opaque | translucent | hidden]: the opaque mesh draws the first range and a
  // twin mesh (same attributes and skeleton, the glass material) the second, so no material or buffer is added.
  const XRAY_TYPES = /^(room-|roof|columns|corridor|stairs|bridge|entrance|tree-)/;
  const SHELL = /^\.(back|left|right|slab|rail|body|lid|posts)(\.|$)/;
  let xray = { key: '', parts: [] };
  function xrayRoom() {
    const target = focusTarget();
    if (target && explicit() && target.module.type.startsWith('room-')) return target.module;
    if (viewMode !== 'people' && view.half / zoomValue >= 2) return null;
    const at = { x: view.x + pan.x, y: view.y + pan.y, z: view.z + pan.z };
    const score = m => Math.hypot(m.x - at.x, m.z + .3 - at.z) + Math.abs(m.y + .85 - at.y) * .8;
    const room = plan.modules.filter(m => m.type.startsWith('room-')).sort((a, b) => score(a) - score(b))[0];
    return room && score(room) < 2.5 ? room : null;
  }
  function xrayBlockers(room) {
    const h = { x: Math.sin(yaw), z: Math.cos(yaw) }, modules = new Map(), own = [];
    for (const m of plan.modules) {
      if (m === room || !XRAY_TYPES.test(m.type)) continue;
      const dx = m.x - room.x, dz = m.z - room.z;
      const above = Math.abs(dx) < 1.3 && Math.abs(dz) < 1.15 && m.y > room.y + .1;
      const along = dx * h.x + dz * h.z, lateral = Math.abs(dx * h.z - dz * h.x);
      const between = along > .6 && along < 4.5 && lateral < 2.2 && (m.y >= room.y - .1 || m.type.startsWith('tree-'));
      // Whole buildings in front would stack veils: they step aside; thin links stay as a veil.
      if (above) modules.set(m.key, 'veil');
      else if (between) modules.set(m.key, /^(room-|roof|columns)/.test(m.type) ? 'hide' : 'veil');
    }
    own.push('.slab', '.rail');
    if (h.x < -.25) own.push('.left');
    if (h.x > .25) own.push('.right');
    if (h.z < -.25) own.push('.back');
    return { modules, own: own.map(suffix => room.key + suffix) };
  }
  function clearXray() {
    for (const part of xray.parts) {
      // A released entity already disposed its meshes (and this twin with them).
      if (![...records.values()].some(record => record.group === part.group)) continue;
      part.mesh.geometry.setDrawRange(0, Infinity);
      if (!part.ghost) continue;
      part.ghost.removeFromParent();
      // The twin shares the opaque mesh's buffers: drop them before disposing so only the twin goes.
      for (const name of Object.keys(part.ghost.geometry.attributes)) part.ghost.geometry.deleteAttribute(name);
      part.ghost.geometry.setIndex(null);
      part.ghost.geometry.dispose();
    }
    xray = { key: '', parts: [] };
  }
  function updateXray() {
    const room = xrayRoom();
    const key = room ? [room.key, Math.round(yaw * 4), ...records_().map(record => record.group.id)].join(':') : '';
    if (key === xray.key) return;
    clearXray();
    xray.key = key;
    if (!room) return;
    const { modules, own } = xrayBlockers(room);
    const rooms = new Set(plan.modules.filter(m => m.type.startsWith('room-')).map(m => m.key));
    // 0 opaque, 1 translucent, 2 hidden
    const modeOf = name => {
      if (own.some(n => name === n || name.startsWith(n + '.'))) return 1;
      for (const [k, how] of modules) {
        if (name !== k && !name.startsWith(k + '.') && !name.startsWith(k + ':')) continue;
        if (how === 'hide') return 2;
        return name === k || !rooms.has(k) || SHELL.test(name.slice(k.length)) ? 1 : 2;
      }
      return 0;
    };
    for (const record of records_()) {
      const bones = record.group.userData.rig?.bones || [];
      const mode = bones.map(bone => modeOf(bone.name));
      if (!mode.some(Boolean)) continue;
      for (const mesh of record.group.children.filter(o => o.isSkinnedMesh && o.name !== 'xray')) {
        const geometry = mesh.geometry, index = geometry.index, skin = geometry.getAttribute('skinIndex');
        // Glass, screens and contact shadows have no veil: they stay unless their part is hidden (blobs go with any veil).
        const card = mesh.name === 'solid' || mesh.name === 'soft';
        const lists = [[], [], []];
        for (let i = 0; i < index.count; i += 3) {
          const m = mode[skin.getX(index.getX(i))];
          lists[card ? m : m === 2 || (m && mesh.name === 'blob') ? 2 : 0].push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
        }
        const [keep, ghost, hidden] = lists;
        if (!ghost.length && !hidden.length) continue;
        index.array.set(keep.concat(ghost, hidden)); index.needsUpdate = true;
        geometry.setDrawRange(0, keep.length);
        if (!ghost.length) { xray.parts.push({ mesh, ghost: null, group: record.group }); continue; }
        const twin = new BufferGeometry();
        for (const [name, attribute] of Object.entries(geometry.attributes)) twin.setAttribute(name, attribute);
        twin.setIndex(index); twin.setDrawRange(keep.length, ghost.length);
        const ghostMesh = new SkinnedMesh(twin, materials.glass);
        ghostMesh.name = 'xray'; ghostMesh.frustumCulled = false; ghostMesh.renderOrder = 3;
        ghostMesh.bind(record.group.userData.skeleton, mesh.bindMatrix);
        record.group.add(ghostMesh);
        xray.parts.push({ mesh, ghost: ghostMesh, group: record.group });
      }
    }
  }

  // ---------------------------------------------------------------- loop
  function canRender() { return !disposed && !lost && visible && !document.hidden; }
  function cancelFrame() { if (pendingFrame) cancelAnimationFrame(pendingFrame); if (pendingTimer) clearTimeout(pendingTimer); pendingFrame = 0; pendingTimer = 0; }
  function schedule() {
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = 0; }
    if (canRender() && !pendingFrame) pendingFrame = requestAnimationFrame(frame);
  }
  function settle() {
    for (const [key, record] of records) {
      if (record.removing) { releaseEntityGroup(record.group); records.delete(key); continue; }
      applyAssembly(record.staged, animationTime, true);
    }
    yaw = targetYaw; pitch = targetPitch; zoomValue = targetZoom; view = { ...targetView }; pan.copy(panTarget);
    tickAll();
    const g = geekyGoal();
    geeky.tick(animationTime, 0, { ...g, cameraYaw: yaw, moving: false });
    geeky.group.visible = !geekyHidden();
  }
  let transitions = 0, transitionParts = {}, assemblyDeadline = 0;
  // Adaptive quality: slow devices drop the shadow map (contact blobs remain)
  // and render at pixel ratio 1. Decided once from sustained frame intervals.
  let quality = 'full', slowFrames = 0, frameEma = 33;
  // 60 fps on desktops at full quality; 30 fps on touch devices and in eco quality (battery, heat).
  const finePointer = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
  const maxFps = () => quality === 'full' && finePointer ? 60 : 30;
  const frameBudget = () => 1000 / maxFps();
  function degrade() {
    if (quality === 'eco') return;
    quality = 'eco';
    renderer.shadowMap.enabled = false;
    new Set(Object.values(materials)).forEach(material => { material.needsUpdate = true; });
    resize();
  }
  function frame(time) {
    pendingFrame = 0;
    if (!canRender()) return;
    const interval = lastTime ? time - lastTime : 33;
    const dt = lastTime ? clamp(interval / 1000, .001, .5) : .033;
    lastTime = time;
    if (moving() && interval < 400) {
      frameEma += (interval - frameEma) * .1;
      slowFrames = frameEma > 75 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
      if (slowFrames > 45) degrade();
    }
    const live = moving();
    let active = 0;
    const parts = {};
    let geekyBusy = false;
    if (live) { animationTime += dt; activityTicks++; }
    if (!live) settle();
    else {
      const rate = 1 - Math.exp(-dt * 6);
      for (const [key, record] of records) {
        if (record.removing) {
          record.fade = Math.max(0, (record.fade ?? 1) - dt * 3.5);
          record.group.scale.y = Math.max(.001, backOut(record.fade) * record.fade);
          if (record.fade === 0) { releaseEntityGroup(record.group); records.delete(key); } else active++;
          continue;
        }
        // A slow device never hangs mid-assembly: past the deadline the final state is shown.
        if (applyAssembly(record.staged, animationTime, performance.now() > assemblyDeadline)) { active++; parts['build:' + key] = 1; }
      }
      yaw += (targetYaw - yaw) * rate; pitch += (targetPitch - pitch) * rate; zoomValue += (targetZoom - zoomValue) * rate;
      if (Math.abs(targetYaw - yaw) < .0005) yaw = targetYaw; else { active++; parts.yaw = 1; }
      if (Math.abs(targetPitch - pitch) < .0005) pitch = targetPitch; else { active++; parts.pitch = 1; }
      if (Math.abs(targetZoom - zoomValue) < .0005 * targetZoom) zoomValue = targetZoom; else { active++; parts.zoom = 1; }
      pan.lerp(panTarget, rate);
      if (pan.distanceToSquared(panTarget) < 1e-6) pan.copy(panTarget); else { active++; parts.pan = 1; }
      for (const key of Object.keys(view)) {
        view[key] += (targetView[key] - view[key]) * rate;
        if (Math.abs(targetView[key] - view[key]) < .002) view[key] = targetView[key]; else { active++; parts['view:' + key] = 1; }
      }
      tickAll();
      const g = geekyGoal();
      geeky.tick(animationTime, Math.min(dt, .1), { ...g, cameraYaw: yaw, moving: true }); // slow devices: travel keeps its pace
      geeky.group.visible = !geekyHidden();
      // Geeky's travel is a transition; its gaze, blinks and gestures only keep frames coming.
      if (!geeky.settled) { if (geeky.state.gliding) { active++; parts.geeky = 1; } else geekyBusy = true; }
    }
    transitions = active; transitionParts = parts;
    updateMarker(animationTime);
    positionCamera();
    updateXray();
    try {
      renderer.render(scene, camera);
      if (!ready) { ready = true; opts.onReady?.(); }
    } catch (error) { lost = true; opts.onLost?.(error); return; }
    updateTag();
    // Render on demand: keep going only while something is still moving.
    // Activities keep frames coming but are not 'transitions': those settle quickly and report 0.
    const running = live && runTime() < RUN;
    if (live && (active || running || geekyBusy) && canRender()) pendingTimer = setTimeout(() => { pendingTimer = 0; schedule(); }, Math.max(0, frameBudget() - (performance.now() - time)));
    else if (active) schedule();
    else lastTime = 0;
  }

  // ---------------------------------------------------------------- focus, views & selection
  function setFocus(next = {}, keepView = false) {
    if (disposed) return;
    focus = typeof next === 'object' && next ? { ...next, kind: next.kind || 'overview' } : { kind: 'overview' };
    if (focus.kind === 'plan') lastCue = { kind: 'plan', programId: focus.programId };
    if (!keepView && (['explore', 'edit'].includes(focus.emphasis) || focus.kind === 'overview')) viewMode = 'overview';
    if (viewMode === 'overview' && (['explore', 'edit'].includes(focus.emphasis) || focus.kind === 'overview')) panTarget.set(0, 0, 0);
    lastCue = { kind: focus.kind, type: focus.kind, id: focus.programId || focus.levelId || focus.id || null, at: ++cueSequence };
    applyView();
    triggerActivity();
    if (!moving()) settle();
    schedule();
  }
  /** Named framings: overview, front, patio, people, program (the active focus). Bounded, always above the ground. */
  function setView(name) {
    if (disposed || !VIEW_NAMES.includes(name)) return;
    viewMode = name;
    targetZoom = 1; panTarget.set(0, 0, 0);
    frameBox = name === 'overview' ? null : frameBox;
    if (name === 'overview') { targetYaw = DEFAULT_YAW; targetPitch = PITCH; focus = { kind: 'overview' }; }
    else if (name === 'front') { targetYaw = 0; targetPitch = .38; }
    else if (name === 'patio') { targetYaw = -.3; targetPitch = .52; }
    else if (name === 'people') { targetYaw = -.4; targetPitch = .22; }
    else { targetYaw = DEFAULT_YAW; targetPitch = .5; }
    targetPitch = clamp(targetPitch, PITCH_MIN, PITCH_MAX);
    applyView();
    if (!moving()) settle();
    schedule();
  }
  /** A screen point that really lands on this room's proxy (stacked rooms occlude each other). */
  function visiblePoint(select, proxies) {
    const m = select.module, patio = m.type === 'patio', probe = new Vector3();
    const offsets = patio ? [[0, .45, 0]] : [[0, .75, .35], [-.5, .75, .35], [.5, .75, .35], [0, .5, .6], [0, 1.1, .2], [-.6, .5, .3], [.6, .5, .3], [0, .75, -.2], [0, .3, .5], [0, 1.3, 0],
      ...[1.45, .15, -.15].flatMap(dy => [-1, -.55, .55, 1, 0].flatMap(dx => [.8, 0, -.8].map(dz => [dx, dy + .1, dz]))), ...[1.5, 1.2].flatMap(dy => [-1, 0, 1].map(dx => [dx, dy, .9]))];
    let fallback = null;
    for (const [dx, dy, dz] of offsets) {
      probe.set(m.x + dx, m.y + dy, m.z + dz).project(camera);
      if (Math.abs(probe.x) > 1 || Math.abs(probe.y) > 1) { fallback ||= { x: probe.x, y: probe.y }; continue; }
      raycaster.setFromCamera(new Vector2(probe.x, probe.y), camera);
      if (raycaster.intersectObjects(proxies, false)[0]?.object === select.proxy) return { x: probe.x, y: probe.y };
      fallback ||= { x: probe.x, y: probe.y };
    }
    return fallback;
  }
  function selectTargets() {
    scene.updateMatrixWorld(true); camera.updateMatrixWorld();
    const rect = canvas.getBoundingClientRect(), out = [], proxies = [];
    for (const record of records.values()) if (!record.removing) for (const select of record.selects) proxies.push(select.proxy);
    for (const record of records.values()) {
      if (record.removing) continue;
      for (const select of record.selects) {
        const point = visiblePoint(select, proxies);
        out.push({ kind: select.kind, id: select.id, x: rect.left + (point.x * .5 + .5) * rect.width, y: rect.top + (.5 - point.y * .5) * rect.height });
      }
    }
    return out;
  }
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    const proxies = [];
    for (const record of records.values()) if (!record.removing) record.group.children.forEach(child => { if (child.userData.select) proxies.push(child); });
    // The nearest surface wins: whatever the visitor actually sees under the pointer.
    return raycaster.intersectObjects(proxies, false)[0]?.object.userData.select || null;
  }
  function selectAt(event) {
    // What is under the pointer wins; a small allowance helps imprecise taps.
    const near = selectTargets().filter(target => target.kind === 'program')
      .map(target => ({ ...target, distance: Math.hypot(target.x - event.clientX, target.y - event.clientY) }))
      .filter(target => target.distance < 25).sort((a, b) => a.distance - b.distance)[0];
    const selected = pick(event) || (near ? { kind: near.kind, id: near.id } : null);
    if (selected) { setFocus({ kind: selected.kind, id: selected.id, emphasis: 'explore' }); opts.onSelect?.({ ...selected }); }
  }

  // ---------------------------------------------------------------- capture
  /** JPEG of the confirmed campus in the overview, for the proposal. Works while paused or hidden. */
  function capture({ width = 1200, height = 800 } = {}) {
    if (disposed || lost) return null;
    width = Math.round(clamp(Number(width) || 1200, 64, 4096)); height = Math.round(clamp(Number(height) || 800, 64, 4096));
    settle();
    const saved = { size, insets, view: { ...view }, yaw, pitch, zoomValue, pan: pan.clone(), ratio: renderer.getPixelRatio(), plan };
    // Preview modules are not part of the confirmed state: hide them for this frame only.
    const hidden = [];
    if (previewState?.active) for (const key of previewState.keys) for (const record of records.values()) {
      const bone = record.group.userData.rig?.get(key);
      if (bone) { hidden.push([bone, bone.scale.clone()]); bone.scale.setScalar(.001); }
    }
    const was = { marker: marker.visible, tag: tag.hidden, geeky: geeky.group.visible };
    marker.visible = false; geeky.group.visible = false;
    clearXray(); // the proposal figure shows the whole campus; the next frame restores the x-ray
    size = { w: width, h: height }; insets = { top: 0, right: 0, bottom: 0, left: 0 };
    yaw = DEFAULT_YAW; pitch = PITCH; zoomValue = 1; pan.set(0, 0, 0);
    plan = confirmed;
    view = fitBox(confirmed, DEFAULT_YAW, PITCH, { w: width, h: height });
    let url = null;
    try {
      renderer.setPixelRatio(1); renderer.setSize(width, height, false);
      positionCamera();
      renderer.render(scene, camera);
      url = canvas.toDataURL('image/jpeg', .9);
    } catch (error) { url = null; }
    plan = saved.plan; size = saved.size; insets = saved.insets; yaw = saved.yaw; pitch = saved.pitch; zoomValue = saved.zoomValue; pan.copy(saved.pan); view = saved.view;
    hidden.forEach(([bone, scale]) => bone.scale.copy(scale));
    marker.visible = was.marker; geeky.group.visible = was.geeky;
    renderer.setPixelRatio(saved.ratio);
    resize();
    return url;
  }

  function resize() {
    if (disposed || lost) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (Math.abs(size.w - rect.width) > 2 || Math.abs(size.h - rect.height) > 2) frameBox = null; // a new viewport frames the campus afresh
    size = { w: rect.width, h: rect.height };
    renderer.setPixelRatio(quality === 'eco' ? 1 : Math.min(window.devicePixelRatio || 1, typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches ? 1.75 : 1.5));
    renderer.setSize(rect.width, rect.height, false);
    // Smaller canvases do not need a 2K shadow map.
    const shadowSize = rect.width * Math.min(window.devicePixelRatio || 1, 1.75) > 900 ? 2048 : 1024;
    if (sun.shadow.mapSize.x !== shadowSize) { sun.shadow.mapSize.set(shadowSize, shadowSize); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    applyView();
    if (!moving()) view = { ...targetView };
    positionCamera();
    schedule();
  }
  /** Verb shown on hover: what a click does here (e.g. 'Editar', 'Explorar'). */
  function setHoverVerb(verb) { hoverVerb = String(verb || 'Editar').slice(0, 24); }
  /** Pixel insets covered by interface overlays: { top, right, bottom, left }. */
  function setInsets(next = {}) {
    if (disposed) return;
    const clean = Object.fromEntries(['top', 'right', 'bottom', 'left'].map(key => [key, Math.max(0, Math.round(Number(next[key]) || 0))]));
    if (['top', 'right', 'bottom', 'left'].every(key => clean[key] === insets[key])) return;
    insets = clean; frameBox = null;
    applyView();
    if (!moving()) view = { ...targetView };
    positionCamera();
    schedule();
  }
  function rotate(delta) { if (!disposed && Number.isFinite(delta)) { targetYaw = clamp(targetYaw + delta, -YAW_LIMIT, YAW_LIMIT); applyView(); if (!moving()) settle(); schedule(); } }
  function viewAxes() {
    camera.updateMatrixWorld();
    axisX.setFromMatrixColumn(camera.matrixWorld, 0); axisY.setFromMatrixColumn(camera.matrixWorld, 1);
  }
  function clampPan() {
    const limit = Math.max(plan.bounds.width, plan.bounds.depth) * .6;
    if (panTarget.length() > limit) panTarget.setLength(limit);
  }
  /** Zoom by a factor, keeping the world point under (clientX, clientY) in place. */
  function zoomAt(factor, clientX, clientY) {
    if (disposed || !Number.isFinite(factor)) return;
    const previous = targetZoom, next = clamp(previous * factor, ZOOM_MIN, ZOOM_MAX);
    if (next === previous) return;
    if (clientX != null) {
      const rect = canvas.getBoundingClientRect();
      const u = (clientX - rect.left) / rect.width, v = (clientY - rect.top) / rect.height;
      viewAxes();
      const sx = camera.left + u * (camera.right - camera.left), sy = camera.top - v * (camera.top - camera.bottom);
      const k = (zoomValue / previous) * (1 - previous / next);
      panTarget.addScaledVector(axisX, sx * k).addScaledVector(axisY, sy * k);
      clampPan();
    }
    targetZoom = next;
    // Zooming back out drifts toward the framed centre.
    if (next < previous && next <= 1.001) panTarget.multiplyScalar(next <= ZOOM_MIN + .01 ? 0 : .5);
    if (!moving()) settle();
    schedule();
  }
  function zoom(delta) { if (!disposed && Number.isFinite(delta)) zoomAt(Math.exp(delta * 2)); }
  function resetView() { targetYaw = DEFAULT_YAW; targetPitch = PITCH; targetZoom = 1; panTarget.set(0, 0, 0); viewMode = 'overview'; frameBox = null; setFocus({ kind: 'overview' }); schedule(); }
  function setPaused(value) { paused = !!value; if (paused) settle(); schedule(); }
  function wheel(event) {
    if (disposed) return;
    event.preventDefault();
    const lines = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
    // Trackpad pinch arrives as ctrl+wheel with small deltas.
    zoomAt(Math.exp(-event.deltaY * lines * (event.ctrlKey ? .012 : .0018)), event.clientX, event.clientY);
  }
  function down(event) {
    if (event.pointerType === 'touch') {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pointer = { pinch: true, distance: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, dragging: true };
        return;
      }
    }
    if (event.isPrimary === false || event.button > 0) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, dragging: false };
  }
  function move(event) {
    if (event.pointerType === 'touch' && touches.has(event.pointerId)) touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointer?.pinch) {
      if (touches.size < 2) return;
      const [a, b] = [...touches.values()], distance = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      // Pinch zooms toward the fingers' midpoint; it never drags the model.
      if (pointer.distance > 0) zoomAt(distance / pointer.distance, mx, my);
      Object.assign(pointer, { distance, mx, my });
      return;
    }
    if (!pointer) {
      if (event.pointerType !== 'mouse') return;
      const select = pick(event);
      const next = select ? { kind: select.kind, id: select.id } : null;
      if ((next?.kind + next?.id) !== (hovered?.kind + hovered?.id)) { hovered = next; canvas.style.cursor = next ? 'pointer' : 'grab'; schedule(); }
      return;
    }
    if (pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (!pointer.dragging) {
      // Dragging only rotates; a vertical touch drag keeps scrolling the page.
      if (Math.abs(dy) > 9 && Math.abs(dy) > Math.abs(dx)) { pointer = null; return; }
      if (Math.abs(dx) < 6) return;
      pointer.dragging = true;
      canvas.setPointerCapture?.(event.pointerId);
      canvas.style.cursor = 'grabbing';
    }
    rotate((event.clientX - pointer.lastX) * -.009);
    pointer.lastX = event.clientX;
  }
  function up(event) {
    if (event.pointerType === 'touch') touches.delete(event.pointerId);
    if (pointer?.pinch) { if (touches.size === 0) pointer = null; return; }
    if (!pointer || pointer.id !== event.pointerId) return;
    const select = !pointer.dragging && event.type !== 'pointercancel' && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 7;
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    pointer = null; canvas.style.cursor = hovered ? 'pointer' : 'grab';
    if (select) selectAt(event);
  }
  function leave() { if (hovered) { hovered = null; canvas.style.cursor = 'grab'; schedule(); } }
  function visibility() {
    if (document.hidden) { settle(); cancelFrame(); lastTime = 0; }
    else { resize(); schedule(); }
  }
  function contextLost(event) { event.preventDefault(); lost = true; ready = false; cancelFrame(); opts.onLost?.(); }
  function contextRestored() { if (disposed) return; lost = false; ready = false; resize(); update(lastData); }
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('webglcontextlost', contextLost, false);
  canvas.addEventListener('webglcontextrestored', contextRestored, false);
  document.addEventListener('visibilitychange', visibility);
  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(container);
  if (!resizeObserver) window.addEventListener('resize', resize);
  const intersectionObserver = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible) { resize(); schedule(); } else { settle(); cancelFrame(); lastTime = 0; }
  }, { rootMargin: '80px' }) : null;
  intersectionObserver?.observe(container);
  update({}); resize();

  return {
    update, resize, rotate, zoom, resetView, setPaused, setFocus: next => setFocus(next), setInsets, setHoverVerb, setView, capture,
    getDiagnostics() {
      const list = records_();
      const building = list.filter(record => record.staged.some(item => item.fresh && !item.done)).length;
      const uniqueMaterials = new Set([...Object.values(materials), markerMaterial, hitMaterial, groundMaterial, ...(geeky.ownMaterials?.() || [])]).size;
      const stats = confirmed.stats, services = confirmed.services;
      const sum = (kind, record) => record.group.children.reduce((n, mesh) => n + (mesh.isMesh && mesh.name !== 'xray' && mesh.geometry.attributes.position ? mesh.geometry.attributes.position.count / 3 * (mesh.castShadow ? 2 : 1) : 0), 0);
      return { levels: confirmed.normalized.levels.length, programs: confirmed.normalized.programs.length, students: confirmed.normalized.students,
        rooms: stats.rooms, workshops: stats.projectRooms + (confirmed.modules.some(m => m.type === 'patio') ? 1 : 0), people: stats.people,
        equipmentUnits: Object.values(confirmed.normalized.equipment).reduce((n, e) => n + e.units, 0), modules: confirmed.modules.length, plan: { ...stats, services: { ...services } }, preview: previewState ? { programId: previewState.programId, active: previewState.active, modules: previewState.keys.length } : null,
        services: list.flatMap(record => (record.meta.actors?.rooms || []).filter(room => room.service).map(room => ({ kind: room.service.kind, room: room.key, programId: room.programId, levelId: room.levelId }))),
        view: viewMode, actorCount: list.length, animatedPeople: list.reduce((n, record) => n + record.people, 0),
        animatedPrograms: [...new Set(list.flatMap(record => (record.meta.actors?.rooms || []).filter(room => room.programId).map(room => room.programId).concat((record.meta.actors?.drones || []).map(() => 'drones'))))],
        activityTicks, animationTime, activityRun: run, activityTime: runTime(), reactionCount: cueSequence, actorTransitions: reduced || paused ? 0 : building,
        entities: records.size, entityKeys: list.map(record => record.entity.key), materials: uniqueMaterials, geometries: renderer.info.memory.geometries,
        triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls,
        framePending: !!pendingFrame || !!pendingTimer, paused, visible, contextLost: lost,
        focus: { ...focus }, focusedProgram: focus.programId || (focus.kind === 'program' ? focus.id : null), lastCue,
        transitionsActive: reduced || paused ? 0 : transitions + (records.size !== list.length ? 1 : 0),
        breakdown: list.reduce((acc, record) => { const k = record.entity.kind; acc[k] = (acc[k] || 0) + sum(k, record); return acc; }, {}),
        errors: list.filter(record => record.error).map(record => record.entity.key),
        transitionParts: { ...transitionParts },
        selectTargets: selectTargets(), geeky: { ...geeky.state.p, settled: geeky.settled },
        xray: xray.key ? { room: xray.key.split(':').slice(0, -1 - records_().length).join(':'), meshes: xray.parts.length } : null,
        quality, frameInterval: Math.round(frameEma), yaw, pitch, zoom: zoomValue, framing: { half: view.half, target: { ...targetView }, size: { ...size }, insets: { ...insets } }, camera: 'orthographic', maxFps: maxFps(), limits: CAMPUS_BUDGET };
    },
    dispose() {
      if (disposed) return;
      disposed = true; cancelFrame(); resizeObserver?.disconnect(); intersectionObserver?.disconnect();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('wheel', wheel);
      window.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('webglcontextrestored', contextRestored);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('resize', resize);
      for (const record of records.values()) releaseEntityGroup(record.group);
      records.clear(); releaseEntityGroup(geeky.group);
      [hitGeometry, markerGeometry, groundGeometry].forEach(geometry => geometry.dispose());
      new Set([...Object.values(materials), markerMaterial, hitMaterial, groundMaterial]).forEach(material => material.dispose());
      sun.shadow.map?.dispose(); renderer.dispose(); canvas.remove(); tag.remove();
    }
  };
}
