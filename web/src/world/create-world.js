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
import { disposeMaterials, materialFor, veilMaterial } from './materials.js';
import { HIDES_INSIDE, OWN_WALLS, wallVeils, xrayBlockers } from './room-xray.js';
import { buildBatch, clearBatch, mergeStatic } from './merge.js';
import { clearGear, wearGear, wearItem } from './gear.js';
import { KIT_ASSETS, KIT_SCALE, tableKits } from './classroom-kits.js';
import { BENCH, BENCH_ITEMS, ELECTRONICS_SPOTS, swayPose } from './electronics-room.js';
import workbenchManifest from '../../../assets/manifests/furn-workbench.json';
import { DINO_SCALE, DINO_SPEED, DINO_START, MASTER_ASSETS, MASTER_SPOTS, loopPoint } from './dino-room.js';
import dinoManifest from '../../../assets/manifests/equip-dino.json';
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
  master: [['equip-laptop', 1.35, TOP, -.2, 0, 1]], // The kit dinosaur walks; see placeDino.
  spike: [['equip-rover-spike', 0, BASE, 1.1, .5, 2.2], ['equip-rover-spike', 1.35, TOP, -.2, .5, 1], ['equip-laptop', -1.05, TOP, -.2, 0, 1]],
  // The printer and the arm work at the bench; see placeBench.
  electronics: [['equip-electronics-kit', -1.05, TOP, -.2, .2, 1.4], ['equip-electronics-kit', 1.35, TOP, -.2, -.2, 1.4]],
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
    if (xrayState && Math.round(goal.yaw * 4) !== xrayState.yawStep) applyXray(plan.modules.find(m => m.key === xrayState.room));
    if (animate()) {
      elapsed += delta;
      for (const entity of entities.values()) for (const mixer of entity.mixers) if (mixer.getRoot().visible) mixer.update(delta);
      for (const walker of walkers) walkAlong(walker);
      for (const entity of entities.values()) {
        if (entity.dino) poseDino(entity, DINO_START + elapsed * DINO_SPEED);
        if (entity.swayers) poseSwayers(entity, elapsed);
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
    object.userData.asset = asset.id; // Lets diagnostics and checks find placed equipment by what it is.
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

  // The walk clip runs at the speed that matches the stride to the dinosaur's travel, so its feet stay planted.
  const DINO_TIME_SCALE = DINO_SPEED * dinoManifest.walk_seconds / (dinoManifest.stride * DINO_SCALE);

  function placeDino(entity, kit) {
    const asset = kit.get('equip-dino');
    const object = cloneSkinned(asset.scene);
    object.scale.setScalar(DINO_SCALE);
    entity.group.add(object);
    const mixer = new AnimationMixer(object);
    mixer.clipAction(clipNamed(asset.animations, 'walk')).setLoop(LoopRepeat).play();
    mixer.timeScale = DINO_TIME_SCALE;
    entity.mixers.push(mixer);
    entity.dino = { object, mixer, trackers: [], tablet: false };
    poseDino(entity, DINO_START); // Reduced motion leaves it here, in view on the loop.
  }

  function poseDino(entity, distance) {
    const { object, trackers } = entity.dino;
    entity.dino.distance = distance;
    const { x, z, heading } = loopPoint(distance);
    object.position.set(x, BASE, z);
    object.rotation.y = heading;
    for (const pair of trackers) for (const body of [pair.high, pair.low]) body.rotation.y = Math.atan2(x - body.position.x, z - body.position.z);
  }

  function seatMaster(entity, module, kit) {
    const roster = rosterFor(module);
    const [dx, dz] = MASTER_SPOTS.driver;
    const driver = character(entity, kit, roster[0], 'interact', dx, BASE, dz, 0, 0);
    entity.dino.tablet = wearItem(driver.high, kit, 'vr_grip_l', 'equip-tablet');
    entity.dino.trackers.push(driver);
    for (const [i, [x, z]] of MASTER_SPOTS.watchers.slice(0, Math.max(module.population - 1, 1)).entries()) {
      entity.dino.trackers.push(character(entity, kit, roster[(i + 1) % roster.length], 'idle', x, BASE, z, 0, .4 + i * .5));
    }
    character(entity, kit, TEACHER, 'interact', 2.2, BASE, -.6, -.8, .2);
    poseDino(entity, DINO_START);
  }

  const BENCH_TOP = BASE + workbenchManifest.sockets.socket_top[1];
  const SWAY_AXES = { joint_base: 'y', joint_shoulder: 'x', joint_elbow: 'x', head_printer: 'x' };

  function placeBench(entity, kit) {
    placeIn(entity.inside, kit.get('furn-workbench'), BENCH.x, BASE, BENCH.z, BENCH.rot);
    entity.swayers = [];
    entity.bench = [];
    for (const [asset, dx, dz, rotation] of BENCH_ITEMS) {
      // Close-view detail like the chairs: their moving parts cannot merge, so they drop at campus distance.
      const object = placeIn(entity.extra, kit.get(asset), BENCH.x + dx, BENCH_TOP, BENCH.z + dz, rotation);
      object.traverse(node => { if (node.isMesh) node.castShadow = false; });
      entity.bench.push({ asset, object });
      object.traverse(node => {
        if (!(node.name in SWAY_AXES)) return;
        node.userData.separate = true; // Moving parts stay whole when the room's static parts merge.
        const axis = SWAY_AXES[node.name];
        entity.swayers.push({ node, name: node.name, axis, rest: node.name === 'head_printer' ? node.position[axis] : node.rotation[axis] });
      });
    }
    poseSwayers(entity, 0); // Reduced motion leaves the machines at rest.
  }

  function poseSwayers(entity, time) {
    const pose = swayPose(time);
    for (const { node, name, axis, rest } of entity.swayers) {
      if (name === 'head_printer') node.position[axis] = rest + pose[name];
      else node.rotation[axis] = rest + pose[name];
    }
  }

  function seatElectronics(entity, module, kit) {
    const roster = rosterFor(module);
    const [bx, bz, brot] = ELECTRONICS_SPOTS.bench, [sx, sz, srot] = ELECTRONICS_SPOTS.seat;
    character(entity, kit, roster[0], 'interact', bx, BASE, bz, brot, 0);
    character(entity, kit, roster[1 % roster.length], 'sit', sx, BASE + .02, sz, srot, .4);
    character(entity, kit, TEACHER, 'interact', 2.2, BASE, -.6, -.8, .2);
  }

  function furnish(entity, module, kit) {
    if (module.programId === 'immersive') return furnishVr(entity, kit);
    if (module.programId === 'electronics') placeBench(entity, kit);
    if (module.programId === 'master') placeDino(entity, kit);
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
    if (!module.levelId) return;
    // Classrooms show the kits of the programs their grades use; parked kits merge with the room.
    const fallback = LEVEL_TABLE_ITEM[module.levelId] || null;
    const kits = tableKits(module.programs || [], fallback);
    entity.tableKits = kits.map(items => (items.every(([asset]) => kit.has(asset)) ? items : tableKits([], fallback)[0])).map((items, i) => {
      const x = [-1.05, 1.35][i];
      for (const [asset, dx, dz, scale, rotation] of items) {
        const source = kit.get(asset);
        const object = source.animations?.length ? cloneSkinned(source.scene) : source.scene.clone(true);
        object.position.set(x + dx * KIT_SCALE, TOP, -.2 + dz * KIT_SCALE);
        object.rotation.y = rotation;
        object.scale.setScalar(scale * KIT_SCALE);
        object.traverse(node => { if (/^(wheel_|rotor_)/.test(node.name)) node.name = `still_${node.name}`; });
        entity.extra.add(object); // Close-view detail, like the chairs: dropped at campus distance to pay for the skyline.
      }
      return items.map(([asset]) => asset);
    });
  }

  function electronicsDiagnostics() {
    const room = entities.get('project:electronics');
    if (!room?.bench) return null;
    const floor = room.home.y + BASE + .01, top = room.home.y + BENCH_TOP;
    const at = new Vector3();
    let floorMachines = 0;
    const onBench = [];
    room.group.traverse(node => {
      if (!/^equip-(arm|printer)$/.test(node.userData.asset || '')) return;
      const y = node.getWorldPosition(at).y;
      if (y <= floor) floorMachines += 1;
      else if (Math.abs(y - top) < .01) onBench.push(node.userData.asset);
    });
    const swaying = room.swayers.some(({ node, name, axis, rest }) => Math.abs((name === 'head_printer' ? node.position[axis] : node.rotation[axis]) - rest) > 1e-4);
    return { onBench, floorMachines, swaying };
  }

  function dinoDiagnostics() {
    const rooms = [...entities.values()].filter(entity => entity.dino);
    const dino = rooms[0]?.dino;
    if (!dino) return { count: 0, students: 0, tablet: false };
    return { count: rooms.length, distance: dino.distance, x: dino.object.position.x, z: dino.object.position.z, timeScale: dino.mixer.timeScale, students: dino.trackers.length, tablet: dino.tablet };
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
    if (module.programId === 'master') return seatMaster(entity, module, kit);
    if (module.programId === 'electronics') return seatElectronics(entity, module, kit);
    const seats = [[.47, -.2, Math.PI / 2, 'sit'], [2.4, 1, -.6, 'idle'], [-2.2, 1.1, .5, 'idle'], [-.9, 1.2, .2, 'interact']];
    const roster = rosterFor(module);
    for (let i = 0; i < (module.population || 1); i += 1) {
      const [x, z, rotation, clip] = seats[i];
      character(entity, kit, roster[i % roster.length], clip, x, BASE + (clip === 'sit' ? .02 : 0), z, rotation, i * .4);
    }
    if (module.programId || (module.population || 1) >= 3) character(entity, kit, TEACHER, 'interact', 2.2, BASE, -.6, -.8, .2);
  }

  // Loaded with the module but never required: a classroom whose kit fails keeps its usual table item.
  function optional(module) {
    return module.levelId ? KIT_ASSETS(module.programs || []) : [];
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
    if (module.programId === 'master') ids.push(...MASTER_ASSETS);
    if (module.programId === 'electronics') ids.push('furn-workbench', ...BENCH_ITEMS.map(([asset]) => asset));
    return ids;
  }

  function build(module, kit) {
    const group = new Group();
    const entity = { key: module.key, signature: signatureOf(module), group, mixers: [], spinners: [], walkers: [], hovers: [], pairs: [], owned: [], characters: [], home: { y: module.y }, enter: reduced ? null : 0 };
    group.position.set(module.x, module.y, module.z);
    group.rotation.y = module.rot;
    group.userData.entity = module;
    // The module's own asset merges on its own, so a focused room can veil or swap just its shell.
    entity.shell = new Group();
    entity.shell.userData.separate = true;
    group.add(entity.shell);
    entity.shellAsset = kit.get(module.asset);
    const shell = placeIn(entity.shell, entity.shellAsset, 0, 0, 0);
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
    entity.owned = [...mergeStatic(entity.extra, false), ...mergeStatic(entity.inside, true), ...mergeStatic(entity.shell, true), ...mergeStatic(group, true)];
    entity.staticMeshes = [...group.children, ...entity.shell.children, ...entity.inside.children].filter(child => child.isMesh);
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

  // ---------------------------------------------------------------- x-ray of a focused room
  // Whatever stands above the focused room or between it and the camera veils or steps aside, and the room
  // shows an unmerged copy of its shell whose camera-facing walls veil (rules in room-xray.js).
  let xrayState = null;
  const partName = node => node.name.replace(/[.\d]+$/, '');

  function hideObject(state, object) {
    if (!object || !object.visible) return;
    state.hiddenObjects.push(object);
    object.visible = false;
  }

  function veilMesh(state, mesh) {
    if (!mesh.isMesh || mesh.isSkinnedMesh || mesh.material === veilMaterial()) return;
    state.veiledMeshes.push([mesh, mesh.material, mesh.castShadow]);
    mesh.material = veilMaterial();
    mesh.castShadow = false;
  }

  function applyXray(module) {
    clearXray();
    const room = module && entities.get(module.key);
    if (!room || module.type !== 'room' || !room.shellAsset) return;
    const yaw = goal.yaw;
    const state = { room: module.key, yawStep: Math.round(yaw * 4), keys: new Set([module.key]), veiled: [], hidden: [], ownVeils: [], hiddenObjects: [], veiledMeshes: [], clone: null, groups: new Map() };
    for (const [key, kind] of xrayBlockers(module, plan.modules, yaw)) {
      const entity = entities.get(key);
      if (!entity) continue;
      state.keys.add(key);
      state.groups.set(key, entity.group);
      if (kind === 'hide') { state.hidden.push(key); hideObject(state, entity.group); continue; }
      state.veiled.push(key);
      const blockerModule = plan.modules.find(m => m.key === key);
      if (HIDES_INSIDE.has(blockerModule?.type) && entity.shell) {
        // Rooms and roofs above keep only their shell, as a veil: furniture, people and gear step aside.
        for (const child of entity.group.children) if (child !== entity.shell) hideObject(state, child);
        entity.shell.traverse(node => veilMesh(state, node));
      } else {
        entity.group.traverse(node => veilMesh(state, node));
        for (const pair of entity.pairs) { hideObject(state, pair.high); hideObject(state, pair.low); }
      }
    }
    // The focused room: its merged shell steps aside for an unmerged copy whose camera-facing walls veil.
    const sides = wallVeils(yaw);
    const clone = room.shellAsset.scene.clone(true);
    clone.userData.xrayClone = true;
    hideObject(state, room.shell);
    room.group.add(clone);
    clone.updateMatrixWorld(true);
    clone.traverse(node => {
      const name = partName(node);
      const veil = OWN_WALLS.always.includes(name) || (sides.front && OWN_WALLS.front.includes(name)) || (sides.back && OWN_WALLS.back.includes(name))
        || (OWN_WALLS.side.includes(name) && ((sides.left && node.position.x < 0) || (sides.right && node.position.x > 0)));
      if (!veil) return;
      state.ownVeils.push(name);
      node.traverse(child => veilMesh(state, child));
    });
    // Merged per material once veiled: the veil parts become one draw, the rest a few.
    state.cloneOwned = mergeStatic(clone, true);
    state.clone = clone;
    state.groups.set(module.key, room.group);
    xrayState = state;
    unbatch();
    scheduleBatch();
    invalidate();
  }

  function clearXray() {
    const state = xrayState;
    if (!state) return;
    xrayState = null;
    for (const [mesh, material, castShadow] of state.veiledMeshes) { mesh.material = material; mesh.castShadow = castShadow; }
    for (const object of state.hiddenObjects) object.visible = true;
    state.clone?.removeFromParent();
    for (const geometry of state.cloneOwned || []) geometry.dispose();
    unbatch();
    scheduleBatch();
    invalidate();
  }

  function scheduleBatch() {
    clearTimeout(batchTimer);
    batchTimer = setTimeout(() => {
      if (disposed || moving() || pendingLoads) return scheduleBatch();
      clearBatch(batched);
      // Meshes under a hidden part (an x-ray steps furniture and shells aside) stay out; veiled ones batch into
      // a single veil draw, since they share one material.
      const shown = mesh => { for (let up = mesh.parent; up; up = up.parent) if (!up.visible) return false; return true; };
      const settled = [...entities.values()].filter(entity => entity.group.visible).flatMap(entity => [...(entity.staticMeshes || []), ...(entity.extra?.visible ? entity.extraMeshes : [])]).filter(shown);
      // The open room's merged shell copy joins the batch, sharing draws with the same materials elsewhere.
      if (xrayState?.clone) settled.push(...xrayState.clone.children.filter(child => child.isMesh));
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
    const ids = new Set(add.flatMap(module => [...needs(module), ...optional(module)]).concat(plan.levels.flatMap(level => ROSTER[level]).flatMap(withLod)));
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
        // An open room reopens on what the update built: its blockers and its own entity may be new.
        if (xrayState) { const open = plan.modules.find(m => m.key === xrayState.room); if (open) applyXray(open); else clearXray(); }
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
      // What the visitor sees: hidden groups and veiled links let the pointer through. Batched originals are
      // themselves invisible (the batch draws them), so only their ancestors count.
      let seen = true;
      for (let up = hit.object.parent; up; up = up.parent) if (!up.visible) seen = false;
      if (!seen) continue;
      let node = hit.object;
      while (node && !node.userData.entity) node = node.parent;
      if (node && hit.object.material === veilMaterial()) continue; // Veils let the pointer through to the open room.
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
      clearXray();
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
      if (module.type === 'room') applyXray(module); else clearXray();
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
    // Test helpers: where an entity is on screen, and which keys still show x-ray effects.
    screenPoint(key) {
      const entity = entities.get(key);
      if (!entity) return null;
      const at = entity.group.getWorldPosition(new Vector3()).add(new Vector3(0, 1.2, 1.2)).project(camera);
      const box = renderer.domElement.getBoundingClientRect();
      return { x: box.left + (at.x + 1) / 2 * box.width, y: box.top + (1 - at.y) / 2 * box.height };
    },
    xrayLeftovers(keys) {
      return keys.filter(key => {
        const entity = entities.get(key);
        if (!entity) return false;
        let left = !entity.group.visible;
        entity.group.traverse(node => { if (node.material === veilMaterial()) left = true; });
        return left;
      });
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
        dino: dinoDiagnostics(),
        xray: { hiddenInBatch: (batched?.sources || []).filter(mesh => { for (let up = mesh.parent; up; up = up.parent) if (!up.visible) return true; return false; }).length, cloneMeshes: (() => { let n = 0; xrayState?.clone?.traverse(node => { if (node.isMesh) n += 1; }); return n; })(), room: xrayState?.room ?? null, veiled: xrayState?.veiled ?? [], hidden: xrayState?.hidden ?? [], ownVeils: xrayState?.ownVeils ?? [], batchSources: batched?.sources.length ?? 0 },
        electronics: electronicsDiagnostics(),
        tableKits: Object.fromEntries([...entities.values()].filter(entity => entity.tableKits).map(entity => [entity.key, entity.tableKits])),
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
