/**
 * Living campus: an original adjacency-driven miniature (not Townscaper assets).
 * Each layout entity becomes one skinned, vertex-coloured group built with the
 * faceted kit (campus-kit.js). New parts assemble in sequence, existing parts
 * keep their place, roofs lift to reveal the explored activity and Geeky guides
 * the eye. All GPU resources are disposed on replacement or on dispose().
 */
import {
  WebGLRenderer, Scene, OrthographicCamera, Mesh, MeshStandardMaterial, MeshBasicMaterial,
  HemisphereLight, DirectionalLight, BoxGeometry, MeshDepthMaterial, RingGeometry, SRGBColorSpace, NeutralToneMapping,
  PCFShadowMap, Vector3, Vector2, Raycaster, DoubleSide
} from 'three';
import { deriveCampus, PROGRAM_NAMES, LEVEL_NAMES } from './campus-layout.js';
import { createBuilder, releaseEntityGroup, rigidSkinning, clamp, lerp, backOut, smooth } from './campus-kit.js';
import { buildRoom, buildCirculation, buildEnvironment } from './campus-architecture.js';
import { buildWorkshop, buildPopulation } from './campus-actors.js';
import { createGeeky } from './campus-geeky.js';

// Measured budget (see docs/campus-3d.md): triangles include the shadow pass.
export const CAMPUS_BUDGET = Object.freeze({ triangles: 40000, drawCalls: 150, materials: 10 });
const DEFAULT_YAW = -.55, YAW_LIMIT = 1.35, PITCH = .6, DISTANCE = 30;
// Up close the camera frames roughly one student; zoom is multiplicative.
const ZOOM_MIN = .7, ZOOM_MAX = 9;
const BUILDERS = { room: buildRoom, workshop: buildWorkshop, circulation: buildCirculation, environment: buildEnvironment, population: buildPopulation };

export function createMascot(container, opts = {}) {
  const reduced = !!opts.reduceMotion;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
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
  // Warm key light with soft shadows, lavender sky fill and a cool rim.
  scene.add(new HemisphereLight(0xfff3e4, 0x5b3f96, 1.55));
  const sun = new DirectionalLight(0xffe0b6, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const rim = new DirectionalLight(0xb9a8ff, .55);
  rim.position.set(8, 5, -9); scene.add(rim);

  const solid = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .86, metalness: 0 });
  const materials = {
    solid, soft: solid,
    glow: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    glass: new MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: .32, roughness: .15, depthWrite: false }),
    blob: new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }),
    depth: new MeshDepthMaterial()
  };
  new Set(Object.values(materials)).forEach(rigidSkinning);
  const markerMaterial = new MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: .85, side: DoubleSide, depthWrite: false, toneMapped: false });
  const hitMaterial = new MeshBasicMaterial({ visible: false });
  const hitGeometry = new BoxGeometry(1, 1, 1), markerGeometry = new RingGeometry(.92, 1, 40);
  const marker = new Mesh(markerGeometry, markerMaterial);
  marker.rotation.x = -Math.PI / 2; marker.visible = false; marker.renderOrder = 3;
  scene.add(marker);
  const geeky = createGeeky(materials);
  scene.add(geeky.group);

  const records = new Map(), memory = new Map();
  let layout = deriveCampus({}), lastData = {}, disposed = false, lost = false, ready = false;
  let paused = false, visible = true, pendingFrame = 0, pendingTimer = 0, lastTime = 0, animationTime = 0, activityTicks = 0;
  let yaw = DEFAULT_YAW, targetYaw = DEFAULT_YAW, zoomValue = 1, targetZoom = 1, pointer = null, hovered = null;
  // Interface overlays float over the canvas; the model frames itself in the free area.
  let size = { w: 800, h: 500 }, insets = { top: 0, right: 0, bottom: 0, left: 0 };
  // Offset on the view plane, set only by zooming toward the cursor; dragging always rotates.
  const pan = new Vector3(), panTarget = new Vector3(), axisX = new Vector3(), axisY = new Vector3();
  const touches = new Map();
  let hoverVerb = 'Editar';
  function freeArea() {
    return { w: Math.max(size.w * .3, size.w - insets.left - insets.right), h: Math.max(size.h * .22, size.h - insets.top - insets.bottom) };
  }
  let view = { x: 0, y: .6, z: 0, half: 4 }, targetView = { ...view };
  let focus = { kind: 'overview' }, lastCue = null, cueSequence = 0, configurationKey = '', reactionAt = -10, cue = null;
  const raycaster = new Raycaster(), mouse = new Vector2();
  const moving = () => !reduced && !paused;

  // ---------------------------------------------------------------- camera
  function fitHalf(bounds, angle) {
    const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
    const screenW = bounds.width * c + bounds.depth * s;
    const screenH = (bounds.width * s + bounds.depth * c) * Math.sin(PITCH) + bounds.height * Math.cos(PITCH);
    const free = freeArea();
    return Math.max(screenH / 2, screenW / 2 / (free.w / free.h)) * 1.02;
  }
  function positionCamera() {
    // Pixels per world unit come from the free area; the look-at point lands at its centre.
    const free = freeArea(), ppu = (free.h / 2) / (view.half / zoomValue);
    const cx = (insets.left - insets.right) / 2, cy = (insets.bottom - insets.top) / 2;
    camera.left = (-size.w / 2 - cx) / ppu; camera.right = (size.w / 2 - cx) / ppu;
    camera.top = (size.h / 2 - cy) / ppu; camera.bottom = (-size.h / 2 - cy) / ppu;
    const cx0 = view.x + pan.x, cy0 = view.y + pan.y, cz0 = view.z + pan.z;
    camera.position.set(cx0 + Math.sin(yaw) * Math.cos(PITCH) * DISTANCE, cy0 + Math.sin(PITCH) * DISTANCE, cz0 + Math.cos(yaw) * Math.cos(PITCH) * DISTANCE);
    camera.lookAt(cx0, cy0, cz0);
    camera.updateProjectionMatrix();
  }
  function focusIds() {
    const programId = focus.programId || (focus.kind === 'program' ? focus.id : null);
    const levelId = focus.levelId || (focus.kind === 'level' ? focus.id : null);
    return { programId: records.has('workshop:' + programId) ? programId : null, levelId: layout.tiles.some(tile => tile.levelId === levelId) ? levelId : null };
  }
  /** World-space focus for the camera, stable (not following moving robots). */
  function focusTarget() {
    const { programId, levelId } = focusIds();
    if (programId) {
      const w = layout.workshops.find(item => item.programId === programId);
      return { x: w.x, y: w.row === 'front' ? .75 : .55, z: w.z, half: w.programId === 'drones' ? 2.1 : w.programId === 'immersive' ? 1.75 : 1.55, kind: 'program', id: programId };
    }
    if (levelId) {
      const rooms = layout.tiles.filter(tile => tile.levelId === levelId);
      const top = Math.max(...rooms.map(room => room.floor));
      return { x: rooms[0].x, y: .9 + top * .85, z: rooms[0].z + .5, half: 1.75 + top * .55, kind: 'level', id: levelId };
    }
    return null;
  }
  function applyView() {
    const b = layout.bounds;
    const base = { x: b.centerX, y: b.height > 3 ? 1.0 : .55, z: b.centerZ, half: fitHalf(b, targetYaw) };
    const target = focusTarget();
    if (!target) { targetView = base; return; }
    // Wizard context is a gentle emphasis; an explicit exploration frames the activity.
    // Ambient context only nudges the centre; explicit exploration frames the target.
    const k = explicit() ? 1 : .2;
    targetView = { x: lerp(base.x, target.x, k), y: lerp(base.y, target.y, k), z: lerp(base.z, target.z, k), half: explicit() ? lerp(base.half, Math.min(base.half, target.half), k) : base.half * 1.03 };
  }

  // ---------------------------------------------------------------- entities
  function buildEntity(entity, previous) {
    const b = createBuilder();
    const meta = BUILDERS[entity.kind](b, entity);
    const group = b.finish(materials);
    group.position.set(entity.x, entity.y || 0, entity.z);
    group.userData.entityKey = entity.key;
    const select = entity.kind === 'workshop' ? { kind: 'program', id: entity.programId } : entity.kind === 'room' && entity.levelId ? { kind: 'level', id: entity.levelId } : null;
    if (meta.proxy && select) {
      const proxy = new Mesh(hitGeometry, hitMaterial);
      proxy.position.set(meta.proxy.x, meta.proxy.y, meta.proxy.z); proxy.scale.set(meta.proxy.w, meta.proxy.h, meta.proxy.d);
      proxy.userData.select = select;
      group.add(proxy);
    }
    group.userData.select = select;
    const rig = group.userData.rig;
    const before = previous?.names || new Set();
    const staged = meta.staged.map(item => ({ ...item, bone: rig.get(item.name), fresh: !before.has(item.name) })).filter(item => item.bone);
    for (const item of staged) item.rest = { y: item.bone.position.y, scale: item.bone.scale.clone() };
    return { entity, group, meta, staged, names: new Set(rig.bones.map(bone => bone.name)), select,
      people: rig.bones.filter(bone => bone.name.endsWith('.hips')).length };
  }
  function stagedAmount(item, age) {
    const p = clamp((age - item.order * .13) / .5);
    return p;
  }
  /** Apply the construction sequence; returns true while anything is still assembling. */
  function animateConstruction(record, settleNow) {
    let active = false;
    const age = settleNow ? 99 : animationTime - record.born;
    for (const item of record.staged) {
      if (!item.fresh || item.done) continue;
      const p = settleNow ? 1 : stagedAmount(item, age), bone = item.bone, s = Math.max(.001, p > 0 ? backOut(p) : 0);
      if (item.style === 'rise') bone.scale.set(1, Math.max(.001, smooth(p)), 1);
      else if (item.style === 'drop') { bone.userData.stageScale = p > 0 ? 1 : .001; bone.userData.drop = (1 - smooth(p)) * 1.1; }
      else if (item.style === 'tile') bone.scale.set(Math.max(.001, smooth(p)), Math.max(.001, smooth(p)), Math.max(.001, smooth(p)));
      else bone.scale.setScalar(s);
      if (p >= 1) { item.done = true; if (item.style !== 'drop') bone.scale.copy(item.rest.scale); bone.userData.drop = 0; bone.userData.stageScale = 1; } else active = true;
    }
    return active;
  }
  function liftTarget(record) {
    const { programId, levelId } = focusIds(), e = record.entity;
    if (hovered && hovered === record) return .25;
    if (!programId && !levelId) return 0;
    if (e.kind === 'workshop' && e.programId === programId) return 1;
    if (e.kind === 'room' && e.levelId === levelId) return 1;
    // Clear the line of sight to a focused classroom.
    if (levelId && e.kind === 'workshop' && e.row === 'mid') { const room = layout.tiles.find(tile => tile.levelId === levelId); return room && room.column === e.column ? 1 : 0; }
    return 0;
  }
  const explicit = () => ['explore', 'edit'].includes(focus.emphasis) || (!focus.emphasis && ['groups', 'sharing', 'stations', 'equipment', 'plan'].includes(focus.kind));
  function animateRoofs(record, rate) {
    const target = !explicit() && hovered !== record ? liftTarget(record) * .35 : liftTarget(record);
    record.lift = rate >= 1 ? target : (record.lift || 0) + (target - (record.lift || 0)) * rate;
    if (Math.abs(target - record.lift) < .002) record.lift = target;
    for (const roof of record.meta.roofs) {
      // Revealed roofs rise and shrink away instead of floating in the frame.
      roof.position.y = roof.userData.rest.position.y + (roof.userData.drop || 0) + record.lift * .9;
      roof.scale.setScalar(Math.max(.001, (roof.userData.stageScale ?? 1) * (1 - record.lift * .999)));
    }
    return Math.abs(target - record.lift) > .002;
  }

  function context(record, time, live) {
    const relevantKinds = ['enrollment', 'groups', 'level', 'sharing', 'stations'];
    const { programId, levelId } = focusIds();
    const relevant = record.entity.kind === 'population' || (record.entity.levelId && record.entity.levelId === levelId) || (record.entity.programId && record.entity.programId === programId);
    if (!memory.has(record.entity.key)) memory.set(record.entity.key, new Map());
    return { moving: live, time, reaction: live && relevantKinds.includes(focus.kind) && relevant && time - reactionAt < 1.6,
      cue, memory: memory.get(record.entity.key), fresh: record.fresh, center: { x: layout.bounds.centerX } };
  }
  function tickActors(live) {
    for (const record of records.values()) if (!record.removing) record.meta.tick?.(animationTime, context(record, animationTime, live));
  }
  function geekyGoal() {
    const env = records.get('environment')?.meta;
    const target = focusTarget(), right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    if (target && explicit()) {
      const record = target.kind === 'program' ? records.get('workshop:' + target.id) : null;
      const f = record ? record.meta.focus : null;
      const look = f ? [record.group.position.x + f[0], f[1], record.group.position.z + f[2]] : [target.x, target.y, target.z];
      // Hover behind and above the activity (as seen from the camera) so Geeky
      // watches it without ever covering it.
      const away = { x: -Math.sin(yaw), z: -Math.cos(yaw) }, side = .7, back = target.kind === 'level' ? .2 : .55;
      return { goal: { x: target.x + right.x * side + away.x * back, y: Math.max(1.8, target.y + 1.3), z: target.z + right.z * side + away.z * back }, look, perched: false,
        celebrate: !!record?.meta.celebrate, ground: 0 };
    }
    const gate = env?.gate || [0, 1.47, 3];
    const look = target ? [target.x, target.y, target.z] : [layout.bounds.centerX, .5, layout.bounds.centerZ - 1];
    return { goal: { x: gate[0], y: gate[1] + .26, z: gate[2] }, look, perched: true, celebrate: false, ground: gate[1] };
  }
  function updateMarker(time) {
    const target = focusTarget();
    marker.visible = !!target && explicit();
    if (!marker.visible) return;
    const w = target.kind === 'program' ? layout.workshops.find(item => item.programId === target.id) : null;
    const radius = w ? Math.max(w.w, w.d) * .62 : 1.55;
    marker.position.set(target.x, (target.kind === 'level' ? layout.tiles.find(t => t.levelId === target.id && t.floor === 0)?.y || 0 : 0) + .03, target.kind === 'level' ? target.z - .5 : target.z);
    marker.scale.setScalar(radius * (moving() ? 1 + Math.sin(time * 3) * .015 : 1));
  }
  function updateTag() {
    // Hover wins: it previews what a click will open for editing.
    const target = hovered?.select ? { kind: hovered.select.kind, id: hovered.select.id, hover: true } : focusTarget();
    const record = target && (target.kind === 'program' ? records.get('workshop:' + target.id) : [...records.values()].find(r => r.entity.kind === 'room' && r.entity.levelId === target.id && r.entity.floor === 0));
    if (!record || !ready) { tag.hidden = true; return; }
    const e = record.entity;
    const text = target.kind === 'program' ? PROGRAM_NAMES[target.id] + (e.participantLevels?.length ? ' · ' + e.participantLevels.map(id => LEVEL_NAMES[id]).join(', ') : '') : LEVEL_NAMES[target.id];
    const label = target.hover ? (target.kind === 'program' ? PROGRAM_NAMES[target.id] : LEVEL_NAMES[target.id]) + ' · ' + hoverVerb : text;
    if (tag.textContent !== label || tag.hidden) { tag.textContent = label; tag.hidden = false; tag.dataset.width = tag.offsetWidth; }
    const top = e.kind === 'room' ? (layout.tiles.filter(t => t.levelId === e.levelId).length > 1 ? 3.7 : 2.05) : e.row === 'front' ? 1.95 : 1.85;
    const point = new Vector3(e.x, top, e.z).project(camera);
    const width = container.clientWidth, height = container.clientHeight;
    const half = Math.min(width / 2 - 8, (Number(tag.dataset.width) || 120) / 2 + 8);
    const x = clamp((point.x * .5 + .5) * width, insets.left + half, width - insets.right - half);
    const y = clamp((.5 - point.y * .5) * height, insets.top + 34, Math.max(insets.top + 34, height - insets.bottom - 8));
    tag.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
    tag.hidden = false;
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
      animateConstruction(record, true); animateRoofs(record, 1);
    }
    yaw = targetYaw; zoomValue = targetZoom; view = { ...targetView }; pan.copy(panTarget);
    tickActors(!reduced);
    const g = geekyGoal();
    geeky.tick(animationTime, 0, { ...g, cameraYaw: yaw, moving: false });
  }
  let transitions = 0, transitionParts = {};
  // Adaptive quality: slow devices drop the shadow map (contact blobs remain)
  // and render at pixel ratio 1. Decided once from sustained frame intervals.
  let quality = 'full', slowFrames = 0, frameEma = 33;
  function degrade() {
    if (quality === 'eco') return;
    quality = 'eco';
    renderer.shadowMap.enabled = false;
    new Set([...Object.values(materials)]).forEach(material => { material.needsUpdate = true; });
    resize();
  }
  function frame(time) {
    pendingFrame = 0;
    if (!canRender()) return;
    const interval = lastTime ? time - lastTime : 33;
    const dt = lastTime ? clamp(interval / 1000, .001, .1) : .033;
    lastTime = time;
    if (moving() && interval < 400) {
      frameEma += (interval - frameEma) * .1;
      slowFrames = frameEma > 75 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
      if (slowFrames > 45) degrade();
    }
    const live = moving();
    let active = 0;
    const parts = {};
    if (live) { animationTime += dt; activityTicks++; }
    if (!live) settle();
    else {
      const rate = 1 - Math.exp(-dt * 6);
      for (const [key, record] of records) {
        if (record.removing) {
          record.fade = Math.max(0, (record.fade ?? 1) - dt * 3.5);
          record.group.scale.setScalar(Math.max(.001, backOut(record.fade) * record.fade));
          if (record.fade === 0) { releaseEntityGroup(record.group); records.delete(key); } else active++;
          continue;
        }
        if (animateConstruction(record, false)) { active++; parts['build:' + key] = 1; }
        if (animateRoofs(record, rate)) { active++; parts['roof:' + key] = 1; }
      }
      yaw += (targetYaw - yaw) * rate; zoomValue += (targetZoom - zoomValue) * rate;
      if (Math.abs(targetYaw - yaw) < .0005) yaw = targetYaw; else { active++; parts.yaw = 1; }
      if (Math.abs(targetZoom - zoomValue) < .0005 * targetZoom) zoomValue = targetZoom; else { active++; parts.zoom = 1; }
      pan.lerp(panTarget, rate);
      if (pan.distanceToSquared(panTarget) < 1e-6) pan.copy(panTarget); else { active++; parts.pan = 1; }
      for (const key of Object.keys(view)) {
        view[key] += (targetView[key] - view[key]) * rate;
        if (Math.abs(targetView[key] - view[key]) < .002) view[key] = targetView[key]; else { active++; parts['view:' + key] = 1; }
      }
      tickActors(true);
      const g = geekyGoal();
      geeky.tick(animationTime, dt, { ...g, cameraYaw: yaw, moving: true });
      if (!geeky.settled) { active++; parts.geeky = 1; }
    }
    transitions = active; transitionParts = parts;
    updateMarker(animationTime);
    positionCamera();
    const b = layout.bounds, size = Math.max(b.width, b.depth) / 2 + 2.2;
    sun.position.set(b.centerX - 7, 13, b.centerZ + 8); sun.target.position.set(b.centerX, 0, b.centerZ);
    Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: 1, far: 40 });
    sun.shadow.camera.updateProjectionMatrix();
    try {
      renderer.render(scene, camera);
      if (!ready) { ready = true; opts.onReady?.(); }
    } catch (error) { lost = true; opts.onLost?.(error); return; }
    updateTag();
    if (live && canRender()) pendingTimer = setTimeout(() => { pendingTimer = 0; schedule(); }, Math.max(0, 33.34 - (performance.now() - time)));
    else if (active) schedule();
    else lastTime = 0;
  }

  // ---------------------------------------------------------------- focus & selection
  function setFocus(next = {}) {
    if (disposed) return;
    focus = typeof next === 'object' && next ? { ...next, kind: next.kind || 'overview' } : { kind: 'overview' };
    reactionAt = animationTime;
    if (focus.kind === 'plan') cue = { kind: 'plan', programId: focus.programId, at: animationTime };
    // Exploring something centres it again; the user's zoom level is kept.
    if (['explore', 'edit'].includes(focus.emphasis) || focus.kind === 'overview') panTarget.set(0, 0, 0);
    lastCue = { kind: focus.kind, type: focus.kind, id: focus.programId || focus.levelId || focus.id || null, at: ++cueSequence };
    applyView();
    if (!moving()) settle();
    schedule();
  }
  function selectTargets() {
    scene.updateMatrixWorld(true);
    const rect = canvas.getBoundingClientRect(), out = [];
    for (const record of records.values()) {
      if (record.removing || !record.select) continue;
      if (record.entity.kind === 'room' && record.entity.floor !== 0) continue;
      const e = record.entity, f = record.meta.focus || [0, .5, 0];
      const point = new Vector3(e.x + (e.kind === 'workshop' ? 0 : f[0]), (e.y || 0) + (e.kind === 'workshop' ? .45 : 1.3), e.z + (e.kind === 'workshop' ? .1 : f[2])).project(camera);
      out.push({ kind: record.select.kind, id: record.select.id, x: rect.left + (point.x * .5 + .5) * rect.width, y: rect.top + (.5 - point.y * .5) * rect.height });
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

  // ---------------------------------------------------------------- data
  function update(data) {
    if (disposed) return;
    lastData = data || {};
    layout = deriveCampus(lastData);
    const wanted = new Set(layout.entities.map(entity => entity.key));
    for (const [key, record] of records) if (!wanted.has(key)) record.removing = true;
    for (const entity of layout.entities) {
      const signature = JSON.stringify(entity);
      const previous = records.get(entity.key);
      if (previous && previous.signature === signature && !previous.removing) continue;
      const record = buildEntity(entity, previous && !previous.removing ? previous : null);
      record.signature = signature;
      record.born = animationTime;
      record.fresh = ready && moving();
      record.lift = previous?.lift || 0;
      if (!ready || !moving()) record.staged.forEach(item => { item.fresh = false; });
      if (previous) releaseEntityGroup(previous.group);
      scene.add(record.group);
      records.set(entity.key, record);
      // Pose before the first frame so nothing renders in bind pose.
      record.meta.tick?.(animationTime, context(record, animationTime, !reduced));
      if (!moving()) animateConstruction(record, true);
      else animateConstruction(record, false);
    }
    const nextKey = JSON.stringify({ normalized: layout.normalized, activeConfig: lastData.activeConfig });
    if (nextKey !== configurationKey) {
      configurationKey = nextKey;
      const requested = lastData.activeConfig || (lastData.focusedProgram ? { kind: 'program', programId: lastData.focusedProgram } : lastData.focusedLevel ? { kind: 'level', levelId: lastData.focusedLevel } : focus);
      setFocus(requested);
    } else applyView();
    if (!moving() || !canRender()) settle();
    schedule();
  }

  function resize() {
    if (disposed || lost) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    size = { w: rect.width, h: rect.height };
    renderer.setPixelRatio(quality === 'eco' ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
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
    insets = clean;
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
    const limit = Math.max(layout.bounds.width, layout.bounds.depth) * .6;
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
  function resetView() { targetYaw = DEFAULT_YAW; targetZoom = 1; panTarget.set(0, 0, 0); setFocus({ kind: 'overview' }); schedule(); }
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
      const record = select ? [...records.values()].find(r => r.select && r.select.kind === select.kind && r.select.id === select.id && !r.removing) : null;
      if (record !== hovered) { hovered = record; canvas.style.cursor = record ? 'pointer' : 'grab'; schedule(); }
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
    update, resize, rotate, zoom, resetView, setPaused, setFocus, setInsets, setHoverVerb,
    getDiagnostics() {
      const list = [...records.values()].filter(record => !record.removing);
      const building = list.filter(record => record.staged.some(item => item.fresh && !item.done)).length;
      const uniqueMaterials = new Set([...Object.values(materials), markerMaterial, hitMaterial]).size;
      return { ...layout.stats, actorCount: list.length, animatedPeople: list.reduce((sum, record) => sum + record.people, 0),
        animatedPrograms: list.filter(record => record.entity.kind === 'workshop').map(record => record.entity.programId),
        activityTicks, animationTime, reactionCount: cueSequence, actorTransitions: reduced || paused ? 0 : building,
        entities: records.size, materials: uniqueMaterials, geometries: renderer.info.memory.geometries,
        triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls,
        framePending: !!pendingFrame || !!pendingTimer, paused, visible, contextLost: lost,
        focus: { ...focus }, focusedProgram: focus.programId || (focus.kind === 'program' ? focus.id : null), lastCue,
        transitionsActive: reduced || paused ? 0 : transitions + (records.size !== list.length ? 1 : 0),
        breakdown: list.reduce((acc, record) => { const k = record.entity.kind; acc[k] = (acc[k] || 0) + record.group.children.reduce((n, mesh) => n + (mesh.isMesh && mesh.geometry.attributes.position ? mesh.geometry.attributes.position.count / 3 * (mesh.castShadow ? 2 : 1) : 0), 0); return acc; }, {}),
        transitionParts: { ...transitionParts },
        selectTargets: selectTargets(), geeky: { ...geeky.state.p, settled: geeky.settled },
        quality, frameInterval: Math.round(frameEma), yaw, zoom: zoomValue, camera: 'orthographic', maxFps: 30, limits: CAMPUS_BUDGET };
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
      [hitGeometry, markerGeometry].forEach(geometry => geometry.dispose());
      new Set([...Object.values(materials), markerMaterial, hitMaterial]).forEach(material => material.dispose());
      sun.shadow.map?.dispose(); renderer.dispose(); canvas.remove(); tag.remove();
    }
  };
}
