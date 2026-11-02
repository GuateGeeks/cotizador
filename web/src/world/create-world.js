// Plan-driven scene. Method names follow the cotizador's createMascot so the later swap stays small.
import {
  AmbientLight, AnimationMixer, Color, DirectionalLight, ExtrudeGeometry, Group, HemisphereLight, LoopRepeat, MathUtils, Mesh,
  OrthographicCamera, PCFSoftShadowMap, Raycaster, Scene, Shape, SRGBColorSpace, Timer, Vector2, Vector3, WebGLRenderer
} from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import constants from '../../../world/constants.json';
import { normalizeWorldInput } from '../layout/normalize.js';
import { planWorld } from '../layout/plan.js';
import { clearAssets, clipNamed, loadAsset } from './assets.js';
import { diffEntities, signatureOf } from './entities.js';
import { disposeMaterials, materialFor } from './materials.js';
import { buildBatch, clearBatch, mergeStatic } from './merge.js';
import { clearGear, wearGear } from './gear.js';
import { VR_ASSETS, VR_PROPS, VR_TEACHER, VR_ZONES } from './vr-room.js';

const BASE = constants.base;
const ENTER_MS = 520, LEAVE_MS = 220;
const ROOM_ASSETS = ['furn-table-four', 'furn-chair-orange', 'furn-chair-turquoise', 'furn-shelves', 'equip-kit-storage'];
const ROSTER = { pre: ['char-student-pre'], prim: ['char-student-primary', 'char-student-primary-boy'], bas: ['char-student-basico'], bach: ['char-student-bach'] };
const TEACHER = 'char-teacher';
const withLod = id => [id, `${id}-lod1`];
const rosterFor = module => module.levelId ? ROSTER[module.levelId] : ['char-student-basico', 'char-student-bach'];
const CLOSE_VIEW = 7;
const TOP = BASE + .608;
// Hero equipment is enlarged so a program reads at campus distance. [asset, x, y, z, rotation, scale]
const PROGRAM_SETUP = {
  tale: [['equip-rover-programmable', 0, BASE, 1.1, .5, 2.4], ['equip-rover-programmable', -1.05, TOP, -.2, -.4, 1]],
  master: [['equip-dino', 0, BASE, 1.1, -.5, 2.4], ['equip-laptop', 1.35, TOP, -.2, 0, 1]],
  spike: [['equip-rover-spike', 0, BASE, 1.1, .5, 2.2], ['equip-rover-spike', 1.35, TOP, -.2, .5, 1], ['equip-laptop', -1.05, TOP, -.2, 0, 1]],
  electronics: [['equip-printer', -2.1, BASE, 1.2, .4, 1.5], ['equip-arm', 0, BASE, 1.1, .3, 2], ['equip-electronics-kit', -1.05, TOP, -.2, .2, 1.4], ['equip-electronics-kit', 1.35, TOP, -.2, -.2, 1.4]],
};
const LEVEL_TABLE_ITEM = { bas: 'equip-laptop', bach: 'equip-laptop', prim: 'equip-organizer', pre: 'equip-organizer' };
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
  return { update: noop, resize: noop, rotate: noop, zoom: noop, resetView: noop, setPaused: noop, setFocus: noop, setInsets: noop, setHoverVerb: noop, setView: noop, agentGesture: noop, capture: () => null, getDiagnostics: () => diagnostics, dispose: noop };
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
  // Warm, shadowless fill through the open fronts, so roofs do not leave interiors grey.
  const fill = new DirectionalLight(0xffcf96, 1.5);
  fill.position.set(-4, 4, 20);
  scene.add(fill);

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
  const insets = { left: 0, right: 0, top: 0, bottom: 0 };
  let gearRequested = false;
  let batched = null, batchTimer = 0, lod = 'campus', viewMode = 'normal', contextLost = false, lastGesture = null;
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
    const shift = (insets.right - insets.left) / 2;
    if (shift) camera.setViewOffset(width, height, shift, 0, width, height); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function applyLod() {
    const next = view.half < CLOSE_VIEW ? 'close' : 'campus';
    if (next === lod) return;
    lod = next;
    for (const entity of entities.values()) {
      for (const pair of entity.pairs) { pair.high.visible = lod === 'close'; pair.low.visible = lod !== 'close'; }
      if (entity.extra) entity.extra.visible = lod === 'close';
    }
    unbatch();
    scheduleBatch();
  }

  function draw() {
    if (contextLost) return;
    applyLod();
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
    release(entity);
  }

  function release(entity) {
    for (const mixer of entity.mixers) mixer.stopAllAction();
    for (const geometry of entity.owned) geometry.dispose();
    for (const walker of entity.walkers) if (walkers.includes(walker)) walkers.splice(walkers.indexOf(walker), 1);
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
      for (const entity of entities.values()) for (const mixer of entity.mixers) if (mixer.getRoot().visible) mixer.update(delta);
      for (const walker of walkers) walkAlong(walker);
      for (const entity of entities.values()) {
        for (const spinner of entity.spinners) spinner.node.rotation[spinner.axis] += delta * spinner.speed;
        for (const hover of entity.hovers) hover.position.y = hover.userData.height + Math.sin(elapsed * 1.4) * .22;
      }
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
    for (const object of walker.objects) {
      object.position.set(x, 0, z + walker.lane);
      object.rotation.y = going ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  function placeIn(group, asset, x, y, z, rotation = 0) {
    const object = asset.scene.clone(true);
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    group.add(object);
    return object;
  }

  function character(entity, kit, id, clipName, x, y, z, rotation, time = 0) {
    const make = (asset, visible) => {
      const object = cloneSkinned(asset.scene);
      object.position.set(x, y, z);
      object.rotation.y = rotation;
      object.visible = visible;
      entity.group.add(object);
      const mixer = new AnimationMixer(object);
      mixer.clipAction(clipNamed(asset.animations, clipName)).setLoop(LoopRepeat).play();
      mixer.setTime(time);
      entity.mixers.push(mixer);
      return object;
    };
    const castsShadow = entity.key.startsWith('walker:');
    entity.characters.push(id);
    const pair = { high: make(kit.get(id), lod === 'close'), low: make(kit.get(`${id}-lod1`), lod !== 'close') };
    pair.low.traverse(node => { if (node.isMesh) node.castShadow = castsShadow; });
    entity.pairs.push(pair);
    return pair;
  }

  function furnishVr(entity, kit) {
    placeIn(entity.extra, kit.get('furn-shelves'), 2.1, BASE, -1.95);
    placeIn(entity.extra, kit.get('equip-kit-storage'), -2.1, BASE, -1.95);
    for (const [asset, x, y, z, rotation, scale, onShelf] of VR_PROPS) {
      const object = placeIn(onShelf ? entity.extra : entity.inside, kit.get(asset), x, y, z, rotation);
      object.scale.setScalar(scale);
      object.traverse(node => { if (node.isMesh) node.castShadow = false; });
    }
  }

  function furnish(entity, module, kit) {
    if (module.programId === 'immersive') return furnishVr(entity, kit);
    const group = entity.inside;
    const extra = entity.extra; // Chairs, shelves and storage: dropped at campus distance to pay for the skyline.
    const table = kit.get('furn-table-four'), orange = kit.get('furn-chair-orange'), teal = kit.get('furn-chair-turquoise');
    placeIn(group, table, -1.05, BASE, -.2);
    placeIn(group, table, 1.35, BASE, -.2);
    for (const [cx, first, second] of [[-1.05, orange, teal], [1.35, teal, orange]]) {
      placeIn(extra, second, cx - .4, BASE, -.94);
      placeIn(extra, first, cx + .4, BASE, -.94);
    }
    placeIn(group, orange, .47, BASE, -.2, Math.PI / 2); // The seat stays at every distance: a student sits on it.
    placeIn(extra, kit.get('furn-shelves'), 2.1, BASE, -1.95);
    placeIn(extra, kit.get('equip-kit-storage'), -2.1, BASE, -1.95);
    for (const [asset, x, y, z, rotation, scale] of PROGRAM_SETUP[module.programId] || []) {
      const object = placeIn(group, kit.get(asset), x, y, z, rotation);
      object.scale.setScalar(scale);
      object.traverse(node => { if (/^wheel_/.test(node.name)) node.name = `still_${node.name}`; }); // Parked rovers: their wheels merge with the room.
      object.traverse(node => { if (node.isMesh) node.castShadow = false; });
    }
    const item = kit.get(LEVEL_TABLE_ITEM[module.levelId]);
    if (item) for (const x of [-1.05, 1.35]) placeIn(group, item, x, TOP, -.2);
  }

  function visibleGear(entity) {
    let visibleHeadsets = 0, visibleControllers = 0;
    entity?.group.traverseVisible(node => {
      if (node.name === 'equip-vr-headset') visibleHeadsets += 1;
      if (node.name === 'equip-vr-controller') visibleControllers += 1;
    });
    return { visibleHeadsets, visibleControllers };
  }

  function seatVr(entity, module, kit) {
    const roster = rosterFor(module);
    entity.vr = { students: 0, headsets: 0, controllers: 0 };
    for (const [i, [x, z, rotation, time]] of VR_ZONES.slice(0, module.population).entries()) {
      const pair = character(entity, kit, roster[i % roster.length], 'vr', x, BASE, z, rotation, time);
      const close = wearGear(pair.high, kit, { controllers: true }), far = wearGear(pair.low, kit, { controllers: false });
      entity.vr.students += 1;
      entity.vr.headsets += (close ? 1 : 0) + far;
      entity.vr.controllers += Math.max(close - 1, 0);
    }
    const [tx, tz, turn] = VR_TEACHER;
    character(entity, kit, TEACHER, 'interact', tx, BASE, tz, turn, .2); // By the screen, facing the room.
  }

  function seat(entity, module, kit) {
    if (module.programId === 'immersive') return seatVr(entity, module, kit);
    const seats = [[.47, -.2, Math.PI / 2, 'sit'], [2.4, 1, -.6, 'idle'], [-2.2, 1.1, .5, 'idle'], [-.9, 1.2, .2, 'interact']];
    const roster = rosterFor(module);
    for (let i = 0; i < (module.population || 1); i += 1) {
      const [x, z, rotation, clip] = seats[i];
      character(entity, kit, roster[i % roster.length], clip, x, BASE + (clip === 'sit' ? .02 : 0), z, rotation, i * .4);
    }
    if (module.programId || (module.population || 1) >= 3) character(entity, kit, TEACHER, 'interact', 2.2, BASE, -.6, -.8, .2);
  }

  function needs(module) {
    const ids = [module.asset];
    if (module.programId === 'immersive') {
      gearRequested = true;
      ids.push(...VR_ASSETS, ...rosterFor(module).flatMap(withLod), ...withLod(TEACHER));
      return ids;
    }
    if (module.type === 'room') ids.push(...ROOM_ASSETS, ...rosterFor(module).flatMap(withLod), ...withLod(TEACHER));
    if (module.terraceStudents) ids.push(...plan.levels.flatMap(level => ROSTER[level]).flatMap(withLod));
    if (LEVEL_TABLE_ITEM[module.levelId]) ids.push(LEVEL_TABLE_ITEM[module.levelId]);
    for (const [asset] of PROGRAM_SETUP[module.programId] || []) ids.push(asset);
    if (module.type === 'patio') ids.push('equip-drone');
    return ids;
  }

  function build(module, kit) {
    const group = new Group();
    const entity = { key: module.key, signature: signatureOf(module), group, mixers: [], spinners: [], walkers: [], hovers: [], pairs: [], owned: [], characters: [], home: { y: module.y }, enter: reduced ? null : 0 };
    group.position.set(module.x, module.y, module.z);
    group.rotation.y = module.rot;
    group.userData.entity = module;
    const shell = placeIn(group, kit.get(module.asset), 0, 0, 0);
    if (module.hanging) {
      // Upper walkways hang from the building; posts would stack on the deck below.
      const posts = [];
      shell.traverse(node => { if (node.name.startsWith('post')) posts.push(node); });
      for (const post of posts) post.removeFromParent();
    }
    if (module.seedScale) shell.scale.setScalar(module.seedScale);
    entity.extra = new Group();
    entity.extra.visible = lod === 'close';
    entity.inside = new Group();
    entity.extra.userData.separate = entity.inside.userData.separate = true;
    group.add(entity.extra, entity.inside);
    if (module.type === 'room') furnish(entity, module, kit);
    entity.owned = [...mergeStatic(entity.extra, false), ...mergeStatic(entity.inside, true), ...mergeStatic(group, true)];
    entity.staticMeshes = [...group.children, ...entity.inside.children].filter(child => child.isMesh);
    entity.extraMeshes = entity.extra.children.filter(child => child.isMesh);
    if (module.terraceStudents) {
      const roster = plan.levels.flatMap(level => ROSTER[level]);
      const spots = [[-.6, .9, .4, 'idle'], [.9, .5, -.5, 'interact']];
      for (let i = 0; i < module.terraceStudents && roster.length; i += 1) {
        const [x, z, rotation, clip] = spots[i];
        character(entity, kit, roster[i % roster.length], clip, x, .39, z, rotation, i * .5);
      }
    }
    if (module.type === 'room') seat(entity, module, kit);
    if (module.type === 'patio') {
      const drone = placeIn(group, kit.get('equip-drone'), 0, 2.4, 0);
      drone.scale.setScalar(3);
      drone.userData.height = 2.4;
      entity.hovers.push(drone);
      drone.traverse(node => { if (/^rotor_/.test(node.name)) entity.spinners.push({ node, axis: 'y', speed: 16 }); });
    }
    if (viewMode === 'xray' && module.type === 'roof') group.visible = false;
    if (!reduced) group.scale.setScalar(.001);
    root.add(group);
    entities.set(module.key, entity);
  }

  function unbatch() {
    clearTimeout(batchTimer);
    clearBatch(batched);
    batched = null;
  }

  function scheduleBatch() {
    clearTimeout(batchTimer);
    batchTimer = setTimeout(() => {
      if (disposed || moving() || pendingLoads) return scheduleBatch();
      clearBatch(batched);
      const settled = [...entities.values()].filter(entity => entity.group.visible).flatMap(entity => [...(entity.staticMeshes || []), ...(entity.extra?.visible ? entity.extraMeshes : [])]);
      batched = buildBatch(settled, root);
      invalidate();
    }, 300);
  }

  function discard(key) {
    const entity = entities.get(key);
    if (!entity) return;
    entities.delete(key);
    if (reduced) { root.remove(entity.group); release(entity); return; }
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
    const roster = plan.levels.flatMap(level => ROSTER[level]).filter(id => kit.get(id) && kit.get(`${id}-lod1`));
    if (!roster.length) return;
    while (walkers.length > wanted) discard(walkers.pop().key);
    for (let i = walkers.length; i < wanted; i += 1) {
      const key = `walker:${i}`;
      const group = new Group();
      const entity = { key, signature: key, group, mixers: [], spinners: [], walkers: [], hovers: [], pairs: [], owned: [], characters: [], home: { y: 0 }, enter: null };
      root.add(group);
      const { high, low } = character(entity, kit, roster[i % roster.length], 'walk', 0, 0, 0, 0, i * .3);
      const walker = { key, objects: [high, low], phase: (i * .37) % 1, lane: i % 2 ? .4 : -.4 };
      entity.walkers.push(walker);
      walkers.push(walker);
      entities.set(key, entity);
    }
  }

  function update(input) {
    if (disposed) return;
    plan = planWorld(normalizeWorldInput(input));
    unbatch();
    const mine = ++generation;
    syncIsland(plan.island);
    const entries = plan.modules;
    const current = new Map([...entities].filter(([key]) => !key.startsWith('walker:')));
    const { add, remove } = diffEntities(current, entries);
    for (const key of remove) discard(key);
    const ids = new Set(add.flatMap(needs).concat(plan.levels.flatMap(level => ROSTER[level]).flatMap(withLod)));
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
        scheduleBatch();
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
  let travelled = 0;
  const pick = event => {
    const box = renderer.domElement.getBoundingClientRect();
    const pointer = new Vector2((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1);
    const ray = new Raycaster();
    ray.setFromCamera(pointer, camera);
    for (const hit of ray.intersectObjects(root.children, true)) {
      let node = hit.object;
      while (node && !node.userData.entity) node = node.parent;
      if (node) {
        const { key, levelId, programId } = node.userData.entity;
        opts.onSelect?.({ key, levelId, programId });
        return handle.setFocus({ key });
      }
    }
  };
  const down = event => {
    dragging = { x: event.clientX, y: event.clientY };
    travelled = 0;
    try { renderer.domElement.setPointerCapture(event.pointerId); } catch { /* Synthetic events have no capture target. */ }
  };
  const move = event => {
    if (!dragging) return;
    travelled += Math.abs(event.clientX - dragging.x) + Math.abs(event.clientY - dragging.y);
    goal.yaw -= (event.clientX - dragging.x) * .006;
    goal.pitch = MathUtils.clamp(goal.pitch + (event.clientY - dragging.y) * .004, .25, 1.1);
    dragging = { x: event.clientX, y: event.clientY };
    invalidate();
  };
  const up = event => {
    if (dragging && travelled < 5) pick(event);
    dragging = null;
  };
  const key = event => {
    const actions = { ArrowLeft: () => handle.rotate(.2), ArrowRight: () => handle.rotate(-.2), '+': () => handle.zoom(.9), '=': () => handle.zoom(.9), '-': () => handle.zoom(1.1), Home: () => handle.resetView() };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  };
  const lost = event => { event.preventDefault(); contextLost = true; };
  const restored = () => { contextLost = false; invalidate(); };
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', opts.label || 'Campus interactivo');
  renderer.domElement.addEventListener('keydown', key);
  renderer.domElement.addEventListener('webglcontextlost', lost);
  renderer.domElement.addEventListener('webglcontextrestored', restored);
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
    setInsets(next) { Object.assign(insets, next); invalidate(); },
    setHoverVerb(text) { renderer.domElement.title = text || ''; },
    setView(mode) {
      viewMode = mode === 'xray' ? 'xray' : 'normal';
      unbatch();
      for (const entity of entities.values()) if (entity.key.startsWith('roof:')) entity.group.visible = viewMode === 'normal';
      scheduleBatch();
      invalidate();
    },
    agentGesture(gesture) { lastGesture = gesture; }, // Geeky is not in this scene yet; the host keeps its own character.
    setFocus(next) {
      const module = next && plan?.modules.find(m => (next.kind === 'level' && m.levelId === next.id) || (next.kind === 'program' && m.programId === next.id) || m.key === next.key);
      if (!module) return handle.resetView();
      handle.focused = true;
      goal.target.set(module.x, module.y + 1.1, module.z);
      goal.half = 4.6;
      invalidate();
    },
    breakdown() {
      const out = {};
      const count = node => { let n = 0; node.traverseVisible(o => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.castShadow ? 2 : 1); }); return n; };
      for (const entity of entities.values()) { const type = entity.key.split(':')[0]; out[type] = (out[type] || 0) + count(entity.group); }
      out.batch = (batched?.batch || []).reduce((n, mesh) => n + (mesh.geometry.attributes.position.count / 3) * (mesh.castShadow ? 2 : 1), 0);
      out.island = count(islandBody) + count(islandTop);
      return out;
    },
    planKeys(input) { return planWorld(normalizeWorldInput(input)).modules.map(m => m.key); },
    capture() { draw(); return renderer.domElement.toDataURL('image/png'); },
    getDiagnostics() {
      const keys = [...entities.keys()];
      return { ready, errors: [...errors], paused, yaw: goal.yaw, triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls,
        geometries: disposed ? 0 : renderer.info.memory.geometries, frames, geometriesBeforeDispose, entityKeys: keys, entityIds: Object.fromEntries(keys.map(key => [key, entities.get(key).group.uuid])),
        pendingLoads, transitionsActive: reduced ? 0 : moving() ? 1 : 0, framePending: !!frame, loaded: entities.size, lod, focused: handle.focused, contextLost, view: viewMode, lastGesture,
        roofVariants: [...new Set((plan?.modules || []).filter(m => m.type === 'roof').map(m => m.variant))],
        visibleRoofs: [...entities.values()].filter(entity => entity.key.startsWith('roof:') && entity.group.visible).length,
        roomDetail: lod === 'close' ? 'full' : 'light',
        batched: !!batched,
        characters: [...new Set([...entities.values()].flatMap(entity => entity.characters))],
        vr: { students: 0, headsets: 0, controllers: 0, ...entities.get('project:immersive')?.vr, gearLoaded: gearRequested, ...visibleGear(entities.get('project:immersive')) },
        animatedPrograms: [...new Set((plan?.modules || []).filter(m => m.programId).map(m => m.programId))] };
    },
    dispose() {
      if (disposed) return;
      geometriesBeforeDispose = renderer.info.memory.geometries;
      unbatch();
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('wheel', wheel);
      renderer.domElement.removeEventListener('keydown', key);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.domElement.removeEventListener('webglcontextrestored', restored);
      for (const entity of entities.values()) release(entity);
      scene.traverse(node => node.geometry?.dispose());
      disposeMaterials();
      clearGear();
      clearAssets();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };

  update(opts.data || {});
  return handle;
}
