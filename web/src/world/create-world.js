// Plan-driven scene. Method names follow the cotizador's createMascot so the later swap stays small.
import {
  AmbientLight, AnimationMixer, Color, DirectionalLight, ExtrudeGeometry, Group, HemisphereLight, LoopRepeat, MathUtils, Mesh,
  OrthographicCamera, PCFSoftShadowMap, Scene, Shape, SRGBColorSpace, Timer, Vector3, WebGLRenderer
} from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import constants from '../../../world/constants.json';
import { normalizeWorldInput } from '../layout/normalize.js';
import { planWorld } from '../layout/plan.js';
import { clearAssets, loadAsset } from './assets.js';
import { diffEntities, signatureOf } from './entities.js';
import { disposeMaterials, materialFor } from './materials.js';

const BASE = constants.base;
const ENTER_MS = 520, LEAVE_MS = 220;
const STUDENT = 'char-student-primary';
const ROOM_ASSETS = ['furn-table-four', 'furn-chair-orange', 'furn-chair-turquoise', STUDENT];
const PROGRAM_EQUIPMENT = { spike: 'equip-rover-spike' };
const easeOut = t => 1 - Math.pow(1 - t, 3) + Math.sin(t * Math.PI) * .07;

function roundedRect(width, depth, radius) {
  const shape = new Shape();
  const x = -width / 2, y = -depth / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.absarc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
  shape.lineTo(x + width, y + depth - radius);
  shape.absarc(x + width - radius, y + depth - radius, radius, 0, Math.PI / 2);
  shape.lineTo(x + radius, y + depth);
  shape.absarc(x + radius, y + depth - radius, radius, Math.PI / 2, Math.PI);
  shape.lineTo(x, y + radius);
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
  return shape;
}

function islandGeometry(width, depth, height, inset, bevel) {
  const radius = Math.min(width, depth) * .2;
  const geometry = new ExtrudeGeometry(roundedRect(width - inset - bevel * 2, depth - inset - bevel * 2, radius), {
    depth: height, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 18
  });
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

function inertHandle(reason, onError) {
  onError?.({ kind: reason });
  const noop = () => {};
  const diagnostics = { ready: false, loaded: 0, errors: [reason], triangles: 0, geometries: 0, drawCalls: 0, entityKeys: [], entityIds: {}, pendingLoads: 0, transitionsActive: 0, framePending: false, frames: 0 };
  return { update: noop, resize: noop, rotate: noop, zoom: noop, resetView: noop, setPaused: noop, setFocus: noop, capture: () => null, getDiagnostics: () => diagnostics, dispose: noop };
}

export function createWorld(container, opts = {}) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  } catch {
    return inertHandle('webgl', opts.onError);
  }
  const reduced = !!opts.reduceMotion;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  container.append(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const scene = new Scene();
  scene.background = new Color(constants.palette.stage);
  scene.add(new HemisphereLight(0xffffff, 0xe6dcef, 1.7), new AmbientLight(0xffffff, .45));
  const sun = new DirectionalLight(0xfff4e6, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 6;
  sun.shadow.bias = -.0004;
  sun.shadow.normalBias = .04;
  scene.add(sun, sun.target);

  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 400);
  const view = { yaw: -.54, pitch: .55, target: new Vector3(0, 1, 0), half: 11 };
  const goal = { yaw: view.yaw, pitch: view.pitch, target: view.target.clone(), half: view.half };
  const overview = { target: new Vector3(0, 1, 0), half: 11 };
  const root = new Group();
  scene.add(root);
  const islandBody = new Mesh(new ExtrudeGeometry(roundedRect(2, 2, .2), { depth: 1 }), materialFor('GG_PurplePrimary'));
  const islandTop = new Mesh(islandBody.geometry.clone(), materialFor('GG_IvorySoft'));
  islandTop.receiveShadow = true;
  islandBody.castShadow = true;
  root.add(islandBody, islandTop);

  const entities = new Map();
  const leaving = new Set();
  const errors = [];
  const walkers = [];
  let plan = null, frame = 0, frames = 0, elapsed = 0, ready = false, paused = false, disposed = false, pendingLoads = 0, generation = 0, geometriesBeforeDispose = 0, islandKey = '';
  const timer = new Timer();

  const animate = () => !paused && !reduced;
  const moving = () => [...entities.values()].some(entity => entity.enter != null) || leaving.size > 0;
  const cameraSettling = () => Math.abs(view.yaw - goal.yaw) > 1e-3 || Math.abs(view.pitch - goal.pitch) > 1e-3 || Math.abs(view.half - goal.half) > 1e-2 || view.target.distanceTo(goal.target) > 1e-2;

  function aim() {
    const distance = 120;
    camera.position.set(
      view.target.x + Math.sin(view.yaw) * Math.cos(view.pitch) * distance,
      view.target.y + Math.sin(view.pitch) * distance,
      view.target.z + Math.cos(view.yaw) * Math.cos(view.pitch) * distance);
    camera.lookAt(view.target);
    const width = container.clientWidth || 1, height = container.clientHeight || 1;
    const aspect = width / height;
    const half = aspect < 1.4 ? view.half * 1.4 / aspect : view.half;
    Object.assign(camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
    camera.updateProjectionMatrix();
  }

  function draw() {
    aim();
    renderer.render(scene, camera);
    frames += 1;
  }

  function invalidate() {
    if (!frame && !disposed) frame = requestAnimationFrame(tick);
  }

  function applyEnter(entity, t) {
    const k = Math.max(.001, easeOut(t));
    entity.group.scale.setScalar(k);
    entity.group.position.y = entity.home.y + (1 - Math.min(1, t * 1.4)) * .7;
  }

  function finishLeave(entity) {
    leaving.delete(entity);
    root.remove(entity.group);
    for (const mixer of entity.mixers) mixer.stopAllAction();
    for (const walker of entity.walkers) walkers.splice(walkers.indexOf(walker), 1);
  }

  function tick(time) {
    frame = 0;
    if (disposed) return;
    timer.update(time);
    const delta = Math.min(timer.getDelta(), .1);
    const settle = reduced ? 1 : 1 - Math.exp(-delta * 6);
    view.yaw = MathUtils.lerp(view.yaw, goal.yaw, settle);
    view.pitch = MathUtils.lerp(view.pitch, goal.pitch, settle);
    view.half = MathUtils.lerp(view.half, goal.half, settle);
    view.target.lerp(goal.target, settle);
    for (const entity of entities.values()) {
      if (entity.enter == null) continue;
      entity.enter = Math.min(1, entity.enter + delta * 1000 / ENTER_MS);
      applyEnter(entity, entity.enter);
      if (entity.enter === 1) { entity.enter = null; entity.group.scale.setScalar(1); entity.group.position.y = entity.home.y; }
    }
    for (const entity of [...leaving]) {
      entity.leave -= delta * 1000 / LEAVE_MS;
      entity.group.scale.setScalar(Math.max(.001, entity.leave));
      if (entity.leave <= 0) finishLeave(entity);
    }
    if (animate()) {
      elapsed += delta;
      for (const entity of entities.values()) for (const mixer of entity.mixers) mixer.update(delta);
      for (const walker of walkers) walkAlong(walker);
      for (const entity of entities.values()) for (const wheel of entity.spinners) wheel.rotation.x += delta * 2;
    }
    draw();
    if (animate() || moving() || cameraSettling()) invalidate();
  }

  function walkAlong(walker) {
    const { x0, x1, z } = plan.walk;
    const span = (x1 - x0) * 2;
    const distance = (elapsed * .9 + walker.phase * span) % span;
    const going = distance < span / 2;
    const x = going ? x0 + distance : x1 - (distance - span / 2);
    walker.object.position.set(x, 0, z + walker.lane);
    walker.object.rotation.y = going ? Math.PI / 2 : -Math.PI / 2;
  }

  function placeIn(group, asset, x, y, z, rotation = 0) {
    const object = asset.scene.clone(true);
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    group.add(object);
    return object;
  }

  function character(entity, asset, clipName, x, y, z, rotation, time = 0) {
    const object = cloneSkinned(asset.scene);
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    entity.group.add(object);
    const mixer = new AnimationMixer(object);
    mixer.clipAction(asset.animations.find(item => item.name === clipName)).setLoop(LoopRepeat).play();
    mixer.setTime(time);
    entity.mixers.push(mixer);
    return object;
  }

  function furnish(entity, module, kit) {
    const table = kit.get('furn-table-four'), orange = kit.get('furn-chair-orange'), teal = kit.get('furn-chair-turquoise'), student = kit.get(STUDENT);
    const floor = BASE;
    placeIn(entity.group, table, -1.05, floor, -.2);
    placeIn(entity.group, table, 1.35, floor, -.2);
    for (const [cx, first, second] of [[-1.05, orange, teal], [1.35, teal, orange]]) {
      placeIn(entity.group, first, cx - .4, floor, .54, Math.PI);
      placeIn(entity.group, second, cx + .4, floor, .54, Math.PI);
      placeIn(entity.group, second, cx - .4, floor, -.94);
      placeIn(entity.group, first, cx + .4, floor, -.94);
    }
    placeIn(entity.group, orange, .47, floor, -.2, Math.PI / 2);
    const seats = [[.47, -.2, Math.PI / 2, 'sit'], [2.4, 1, -.6, 'idle'], [-2.2, 1.1, .5, 'idle'], [-.1, 1.2, .2, 'interact']];
    for (let i = 0; i < (module.population || 1); i += 1) {
      const [x, z, rotation, clip] = seats[i];
      character(entity, student, clip, x, floor + (clip === 'sit' ? .02 : 0), z, rotation, i * .4);
    }
    const equipment = kit.get(PROGRAM_EQUIPMENT[module.programId]);
    if (equipment) {
      const rover = placeIn(entity.group, equipment, 1.35, floor + .608, -.2, .5);
      entity.spinners.push(rover.getObjectByName('wheel_l'), rover.getObjectByName('wheel_r'));
    }
  }

  function needs(module) {
    const ids = [module.asset];
    if (module.type === 'room') ids.push(...ROOM_ASSETS);
    if (PROGRAM_EQUIPMENT[module.programId]) ids.push(PROGRAM_EQUIPMENT[module.programId]);
    return ids;
  }

  function build(module, kit) {
    const group = new Group();
    const entity = { key: module.key, signature: signatureOf(module), group, mixers: [], spinners: [], walkers: [], home: { y: module.y }, enter: reduced ? null : 0 };
    group.position.set(module.x, module.y, module.z);
    group.rotation.y = module.rot;
    const shell = placeIn(group, kit.get(module.asset), 0, 0, 0);
    if (module.seedScale) shell.scale.setScalar(module.seedScale);
    if (module.type === 'room') furnish(entity, module, kit);
    if (!reduced) group.scale.setScalar(.001);
    root.add(group);
    entities.set(module.key, entity);
  }

  function discard(key) {
    const entity = entities.get(key);
    if (!entity) return;
    entities.delete(key);
    if (reduced) { root.remove(entity.group); for (const mixer of entity.mixers) mixer.stopAllAction(); return; }
    entity.leave = 1;
    leaving.add(entity);
  }

  function syncIsland(island) {
    const key = `${island.width}|${island.depth}`;
    if (key === islandKey) return;
    islandKey = key;
    islandBody.geometry.dispose();
    islandTop.geometry.dispose();
    islandBody.geometry = islandGeometry(island.width, island.depth, island.height, 0, .3);
    islandTop.geometry = islandGeometry(island.width, island.depth, .1, .55, .04);
    islandBody.position.set(island.x, -.42, island.z);
    islandTop.position.set(island.x, -.05, island.z);
    overview.target.set(island.x, 1.6, island.z);
    overview.half = Math.max(island.width * .46, island.depth * .78);
    if (!handle.focused) { goal.target.copy(overview.target); goal.half = overview.half; }
    const reach = Math.max(island.width, island.depth) * .75 + 6;
    sun.position.set(island.x - 12, 24, island.z + 15);
    sun.target.position.set(island.x, 0, island.z);
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 90 });
    sun.shadow.camera.updateProjectionMatrix();
  }

  function syncWalkers(wanted, kit) {
    const student = kit.get(STUDENT);
    if (!student) return;
    while (walkers.length > wanted) {
      const walker = walkers.pop();
      discard(walker.key);
    }
    for (let i = walkers.length; i < wanted; i += 1) {
      const key = `walker:${i}`;
      const group = new Group();
      const entity = { key, signature: key, group, mixers: [], spinners: [], walkers: [], home: { y: 0 }, enter: null };
      root.add(group);
      const object = character(entity, student, 'walk', 0, 0, 0, 0, i * .3);
      const walker = { key, object, phase: (i * .37) % 1, lane: i % 2 ? .4 : -.4 };
      entity.walkers.push(walker);
      walkers.push(walker);
      entities.set(key, entity);
    }
  }

  function update(input) {
    if (disposed) return;
    plan = planWorld(normalizeWorldInput(input));
    const mine = ++generation;
    syncIsland(plan.island);
    const entries = plan.modules;
    const current = new Map([...entities].filter(([key]) => !key.startsWith('walker:')));
    const { add, remove } = diffEntities(current, entries);
    for (const key of remove) discard(key);
    const ids = new Set(add.flatMap(needs).concat(STUDENT));
    pendingLoads += 1;
    Promise.allSettled([...ids].map(id => loadAsset(id, opts.base).then(asset => [id, asset]))).then(results => {
      pendingLoads -= 1;
      if (disposed) return;
      const kit = new Map();
      [...ids].forEach((id, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') kit.set(id, result.value[1]);
        else if (!errors.includes(id)) { errors.push(id); opts.onError?.({ kind: 'asset', id }); }
      });
      if (mine === generation) {
        for (const module of add) {
          if (entities.has(module.key) || !needs(module).every(id => kit.has(id))) continue;
          build(module, kit);
        }
        syncWalkers(Math.min(8, 2 + Math.floor(plan.modules.filter(m => m.type === 'room').length / 2)), kit);
        ready = true;
        resize();
      }
      invalidate();
    });
    invalidate();
  }

  function resize() {
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    invalidate();
  }

  let dragging = null;
  const down = event => { dragging = { x: event.clientX, y: event.clientY }; renderer.domElement.setPointerCapture?.(event.pointerId); };
  const move = event => {
    if (!dragging) return;
    goal.yaw -= (event.clientX - dragging.x) * .006;
    goal.pitch = MathUtils.clamp(goal.pitch + (event.clientY - dragging.y) * .004, .25, 1.1);
    dragging = { x: event.clientX, y: event.clientY };
    invalidate();
  };
  const up = () => { dragging = null; };
  const wheel = event => { event.preventDefault(); handle.zoom(event.deltaY > 0 ? 1.1 : .9); };
  renderer.domElement.addEventListener('pointerdown', down);
  renderer.domElement.addEventListener('pointermove', move);
  renderer.domElement.addEventListener('pointerup', up);
  renderer.domElement.addEventListener('wheel', wheel, { passive: false });
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(container);

  const handle = {
    focused: false,
    update,
    resize,
    rotate(delta) { goal.yaw += delta; invalidate(); },
    zoom(factor) { goal.half = MathUtils.clamp(goal.half * factor, 3, 40); invalidate(); },
    resetView() {
      handle.focused = false;
      Object.assign(goal, { yaw: -.54, pitch: .55, half: overview.half });
      goal.target.copy(overview.target);
      invalidate();
    },
    setPaused(next) { paused = !!next; invalidate(); },
    setFocus(next) {
      const module = next && plan?.modules.find(m => (next.kind === 'level' && m.levelId === next.id) || (next.kind === 'program' && m.programId === next.id) || m.key === next.key);
      if (!module) return handle.resetView();
      handle.focused = true;
      goal.target.set(module.x, module.y + 1.1, module.z);
      goal.half = 4.6;
      invalidate();
    },
    capture() { draw(); return renderer.domElement.toDataURL('image/png'); },
    getDiagnostics() {
      const keys = [...entities.keys()];
      return { ready, errors: [...errors], paused, yaw: goal.yaw, triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls,
        geometries: disposed ? 0 : renderer.info.memory.geometries, frames, geometriesBeforeDispose, entityKeys: keys, entityIds: Object.fromEntries(keys.map(key => [key, entities.get(key).group.uuid])),
        pendingLoads, transitionsActive: reduced ? 0 : moving() ? 1 : 0, framePending: !!frame, loaded: entities.size };
    },
    dispose() {
      if (disposed) return;
      geometriesBeforeDispose = renderer.info.memory.geometries;
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('wheel', wheel);
      for (const entity of entities.values()) for (const mixer of entity.mixers) mixer.stopAllAction();
      scene.traverse(node => node.geometry?.dispose());
      disposeMaterials();
      clearAssets();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };

  update(opts.data || {});
  return handle;
}
