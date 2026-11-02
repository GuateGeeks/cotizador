// Slice scene. Method names follow the cotizador's createMascot so the later swap stays small.
import {
  AmbientLight, AnimationMixer, Box3, Clock, Color, DirectionalLight, Group, HemisphereLight, LoopRepeat, MathUtils,
  OrthographicCamera, PCFSoftShadowMap, PointLight, Scene, SRGBColorSpace, Vector3, WebGLRenderer
} from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import constants from '../../../world/constants.json';
import { clearAssets, loadAsset } from './assets.js';
import { disposeMaterials } from './materials.js';

const KIT = ['arch-island-slice', 'arch-classroom-standard', 'arch-entrance', 'arch-roof', 'furn-chair-orange', 'furn-chair-turquoise',
  'furn-table-four', 'veg-tree-large', 'veg-tree-large-alt', 'equip-rover-spike', 'char-student-primary'];
const OVERVIEW = { x: -1.2, y: 1.2, z: .6, half: 11 };
const BASE = constants.base;
const SEAT = { x: -1.05, z: -.05 };

function inertHandle(reason, onError) {
  onError?.({ kind: reason });
  const noop = () => {};
  const diagnostics = { ready: false, loaded: 0, errors: [reason], triangles: 0, geometries: 0, drawCalls: 0 };
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
  scene.add(new HemisphereLight(0xffffff, 0xd9cfe6, 1.5), new AmbientLight(0xffffff, .35));
  const sun = new DirectionalLight(0xfff4e6, 2.1);
  sun.position.set(-9, 16, 11);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 50 });
  sun.shadow.radius = 6;
  sun.shadow.bias = -.0004;
  sun.shadow.normalBias = .04;
  scene.add(sun);
  const roomLight = new PointLight(0xffd7a0, 5, 9, 1.4);
  roomLight.position.set(0, 2.5, .2);
  scene.add(roomLight);

  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 300);
  const view = { yaw: -.54, pitch: .55, target: new Vector3(OVERVIEW.x, OVERVIEW.y, OVERVIEW.z), half: OVERVIEW.half };
  const goal = { yaw: view.yaw, pitch: view.pitch, target: view.target.clone(), half: view.half };
  const world = new Group();
  scene.add(world);
  const mixers = [];
  const walkers = [];
  const spinners = [];
  const errors = [];
  let loaded = 0, ready = false, paused = false, disposed = false, frame = 0, frames = 0, elapsed = 0;
  const clock = new Clock();
  let geometriesBeforeDispose = 0;

  function place(asset, x, y, z, rotation = 0, parent = world) {
    const object = asset.scene.clone(true);
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    parent.add(object);
    return object;
  }

  function socket(object, name) {
    object.updateWorldMatrix(true, true);
    return object.getObjectByName(`socket_${name}`).getWorldPosition(new Vector3());
  }

  function snap(asset, target, own) {
    const object = place(asset, 0, 0, 0);
    const offset = target.clone().sub(socket(object, own));
    object.position.add(offset);
    return object;
  }

  function character(asset, clipName, x, y, z, rotation) {
    const object = cloneSkinned(asset.scene);
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    world.add(object);
    const mixer = new AnimationMixer(object);
    const clip = asset.animations.find(item => item.name === clipName);
    mixer.clipAction(clip).setLoop(LoopRepeat).play();
    mixers.push(mixer);
    return object;
  }

  function compose(kit) {
    const get = id => kit.get(id);
    place(get('arch-island-slice'), OVERVIEW.x, 0, OVERVIEW.z);
    const room = place(get('arch-classroom-standard'), 0, 0, 0);
    snap(get('arch-entrance'), socket(room, 'west'), 'east');
    snap(get('arch-roof'), socket(room, 'floor_above'), 'floor_below');
    place(get('furn-table-four'), SEAT.x, BASE, SEAT.z);
    place(get('furn-table-four'), 1.35, BASE, -.05);
    for (const [ox, oz, rotation, id] of [[-.4, .74, Math.PI, 'furn-chair-orange'], [.4, .74, Math.PI, 'furn-chair-turquoise'], [-.4, -.74, 0, 'furn-chair-turquoise'], [.4, -.74, 0, 'furn-chair-orange']]) {
      place(get(id), SEAT.x + ox, BASE, SEAT.z + oz, rotation);
      place(get(id === 'furn-chair-orange' ? 'furn-chair-turquoise' : 'furn-chair-orange'), 1.35 + ox, BASE, -.05 + oz, rotation);
    }
    const rover = place(get('equip-rover-spike'), 1.35, BASE + .608, -.05, .5);
    spinners.push(rover.getObjectByName('wheel_l'), rover.getObjectByName('wheel_r'));
    place(get('veg-tree-large'), 6.1, 0, -3.8);
    place(get('veg-tree-large-alt'), -8, 0, -3.2, 1.1);
    place(get('veg-tree-large'), 5.4, 0, 4, 2.2).scale.setScalar(.7);
    const student = get('char-student-primary');
    place(get('furn-chair-orange'), .47, BASE, -.05, Math.PI / 2);
    character(student, 'sit', .47, BASE + .02, -.05, Math.PI / 2);
    character(student, 'idle', 2.4, BASE, 1.2, -.6);
    walkers.push({ object: character(student, 'walk', -2, 0, 4, Math.PI / 2), phase: 0 });
    walkers.push({ object: character(student, 'walk', 1, 0, 4, Math.PI / 2), phase: 3.2 });
  }

  function walkPath(walker, time) {
    const t = time * .07 + walker.phase;
    const x = -1 + Math.cos(t) * 5, z = 4 + Math.sin(t) * 1.2;
    const facing = Math.atan2(-Math.sin(t) * 5, Math.cos(t) * 1.2);
    walker.object.position.set(x, 0, z);
    walker.object.rotation.y = facing;
  }

  function aim() {
    const distance = 60;
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

  function tick() {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    const delta = Math.min(clock.getDelta(), .1);
    const settle = 1 - Math.exp(-delta * 6);
    view.yaw = MathUtils.lerp(view.yaw, goal.yaw, settle);
    view.pitch = MathUtils.lerp(view.pitch, goal.pitch, settle);
    view.half = MathUtils.lerp(view.half, goal.half, settle);
    view.target.lerp(goal.target, settle);
    if (!paused && !reduced) {
      elapsed += delta;
      for (const mixer of mixers) mixer.update(delta);
      for (const walker of walkers) walkPath(walker, elapsed);
      for (const wheel of spinners) wheel.rotation.x += delta * 2;
    }
    draw();
  }

  function resize() {
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    draw();
  }

  let dragging = null;
  const down = event => { dragging = { x: event.clientX, y: event.clientY }; renderer.domElement.setPointerCapture?.(event.pointerId); };
  const move = event => {
    if (!dragging) return;
    goal.yaw -= (event.clientX - dragging.x) * .006;
    goal.pitch = MathUtils.clamp(goal.pitch + (event.clientY - dragging.y) * .004, .25, 1.1);
    dragging = { x: event.clientX, y: event.clientY };
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
    update() {},
    resize,
    rotate(delta) { goal.yaw += delta; },
    zoom(factor) { goal.half = MathUtils.clamp(goal.half * factor, 3, 16); },
    resetView() {
      Object.assign(goal, { yaw: -.54, pitch: .55, half: OVERVIEW.half });
      goal.target.set(OVERVIEW.x, OVERVIEW.y, OVERVIEW.z);
    },
    setPaused(next) { paused = !!next; },
    setFocus(next) {
      if (!next) return handle.resetView();
      goal.target.set(.1, 1.1, 0);
      goal.half = 4.6;
    },
    capture() { draw(); return renderer.domElement.toDataURL('image/png'); },
    getDiagnostics() {
      return { ready, loaded, errors: [...errors], paused, yaw: goal.yaw, triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls,
        geometries: disposed ? 0 : renderer.info.memory.geometries, frames, geometriesBeforeDispose };
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
      for (const mixer of mixers) mixer.stopAllAction();
      scene.traverse(node => node.geometry?.dispose());
      disposeMaterials();
      clearAssets();
      renderer.dispose();
      renderer.domElement.remove();
    }
  };

  Promise.allSettled(KIT.map(id => loadAsset(id, opts.base).then(asset => { loaded += 1; return asset; }))).then(results => {
    if (disposed) return;
    const failed = KIT.filter((_, index) => results[index].status === 'rejected');
    for (const id of failed) {
      errors.push(id);
      opts.onError?.({ kind: 'asset', id });
    }
    if (failed.length) return draw();
    compose(new Map(results.map(result => [result.value.id, result.value])));
    new Box3().setFromObject(world);
    ready = true;
    resize();
    tick();
  });
  resize();
  return handle;
}
