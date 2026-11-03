// Requires `npm run dev`. Pins growth, convergence, reduced motion and failure handling.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import states from '../src/app/states.json' with { type: 'json' };
import dinoManifest from '../../assets/manifests/equip-dino.json' with { type: 'json' };
import { DINO_SCALE, DINO_SPEED } from '../src/world/dino-room.js';

const out = process.argv[2] || '../runs/web-growth';
mkdirSync(out, { recursive: true });
const gpu = process.env.GG_GPU === '1';
const browser = await chromium.launch({ args: gpu ? ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const failures = [];
const expect = (ok, text) => { if (!ok) failures.push(text); };
const URL = 'http://127.0.0.1:4410/world.html';
const settled = page => page.waitForFunction(() => { const d = window.world.getDiagnostics(); return d.ready && d.transitionsActive === 0 && d.pendingLoads === 0; }, null, { timeout: 60000 });
const diag = page => page.evaluate(() => window.world.getDiagnostics());

const page = await browser.newPage({ viewport: { width: 1400, height: 880 } });
const problems = [];
page.on('pageerror', e => problems.push(String(e)));
page.on('crash', () => console.error('PAGE CRASHED'));
const stage = name => console.error(`[${new Date().toISOString().slice(11, 19)}] ${name}`);
page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
await page.goto(URL);
await settled(page);
const first = await diag(page);
expect(first.entityKeys.includes('room:pre:0'), 'example room missing');

for (const [index, state] of states.entries()) {
  stage(`state ${index + 1}`);
  await page.evaluate(input => window.world.update(input), state);
  await settled(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/state-${index + 1}.png` });
  const { vr } = await diag(page);
  if (state.programs?.includes('immersive')) expect(vr.students === 3 && vr.headsets === 6 && vr.controllers === 6, `VR room on state ${index + 1}: ${JSON.stringify(vr)}`);
  else expect(vr.students === 0 && !vr.gearLoaded, `VR gear without the immersive program on state ${index + 1}: ${JSON.stringify(vr)}`);
  const { tableKits } = await diag(page);
  if (index === 1) for (const [key, tables] of Object.entries(tableKits)) {
    const fallback = key.includes(':bas:') || key.includes(':bach:') ? 'equip-laptop' : 'equip-organizer';
    expect(tables.every(t => t.length === 1 && t[0] === fallback), `classroom without programs ${key}: ${JSON.stringify(tables)}`);
  }
  if (index === states.length - 1) {
    const { electronics } = await diag(page);
    expect(electronics && ['equip-arm', 'equip-printer'].every(id => electronics.onBench.includes(id)) && electronics.floorMachines === 0 && electronics.swaying,
      `Electronics bench: ${JSON.stringify(electronics)}`);
    const want = { 'room:prim:0': [['equip-dino'], ['equip-electronics-kit']], 'room:pre:0': [['equip-rover-programmable'], ['equip-rover-programmable']],
      'room:bas:0': [['equip-rover-spike', 'equip-laptop'], ['equip-drone']] };
    for (const [key, tables] of Object.entries(want)) expect(JSON.stringify(tableKits[key]) === JSON.stringify(tables), `kits in ${key}: ${JSON.stringify(tableKits[key])}`);
  }
  const { dino } = await diag(page);
  if (state.programs?.includes('master')) expect(dino.count === 1 && dino.students === 3 && dino.tablet === true, `Makerzoid room on state ${index + 1}: ${JSON.stringify(dino)}`);
  else expect(dino.count === 0, `dinosaur without the Makerzoid program on state ${index + 1}: ${JSON.stringify(dino)}`);
}

// The dinosaur walks: it moves, and its clip runs at the speed that keeps its feet planted.
const walked = async label => {
  // World time advances at most 0.1 s per frame, so on the software renderer it runs slower than the wall
  // clock: wait for 0.2 m of walking along the loop, then check the dinosaur really moved.
  const a = (await diag(page)).dino;
  await page.waitForFunction(from => window.world.getDiagnostics().dino.distance >= from + .2, a.distance, { timeout: 30000 })
    .catch(() => failures.push(`dinosaur did not walk ${label}`));
  const b = (await diag(page)).dino;
  expect(Math.hypot(b.x - a.x, b.z - a.z) >= .15, `dinosaur did not move ${label}: ${JSON.stringify([a, b])}`);
  return b;
};
const strideScale = DINO_SPEED * dinoManifest.walk_seconds / (dinoManifest.stride * DINO_SCALE);
const walking = await walked('at campus view');
expect(Math.abs(walking.timeScale - strideScale) < .01, `walk clip speed ${walking.timeScale}, wanted ${strideScale}`);

stage('vr lod');
// The headset must ride on whichever model is visible: distance models at campus view, close models up close.
const campusVr = (await diag(page)).vr;
expect(campusVr.visibleHeadsets === 3 && campusVr.visibleControllers === 0, `VR gear at campus view: ${JSON.stringify(campusVr)}`);
await page.evaluate(() => window.world.setFocus({ kind: 'program', id: 'immersive' }));
await page.waitForFunction(() => window.world.getDiagnostics().lod === 'close', null, { timeout: 20000 });
await page.waitForTimeout(300);
const closeVr = (await diag(page)).vr;
expect(closeVr.visibleHeadsets === 3 && closeVr.visibleControllers === 6, `VR gear in close view: ${JSON.stringify(closeVr)}`);
await page.evaluate(() => window.world.setFocus({ kind: 'program', id: 'master' }));
await page.waitForFunction(() => window.world.getDiagnostics().lod === 'close', null, { timeout: 20000 });
await walked('in close view');
await page.evaluate(() => window.world.resetView());
await page.waitForFunction(() => window.world.getDiagnostics().lod === 'campus', null, { timeout: 20000 });

await page.evaluate(input => window.world.update(input), states[1]);
await settled(page);
const before = await diag(page);
await page.evaluate(input => window.world.update(input), { ...states[1], programs: ['tale'] });
await settled(page);
const after = await diag(page);
const added = after.entityKeys.filter(key => !before.entityKeys.includes(key));
expect(added.includes('project:tale'), `tale room not added: ${added}`);
// Classrooms whose programs changed are rebuilt with their new kits; everything else stays.
const reKitted = new Set(Object.keys(after.tableKits).filter(key => JSON.stringify(after.tableKits[key]) !== JSON.stringify(before.tableKits[key])));
expect(reKitted.has('room:pre:0'), `adding Tale-Bot did not re-kit preprimaria: ${JSON.stringify(after.tableKits)}`);
for (const key of before.entityKeys) if (after.entityIds[key] && !key.startsWith('roof') && !key.startsWith('tree') && !key.startsWith('planter') && !key.startsWith('pathway') && !key.startsWith('walker') && key !== 'room:prim:0' && !reKitted.has(key)) expect(after.entityIds[key] === before.entityIds[key], `${key} was rebuilt`);

await page.evaluate(input => window.world.update(input), states[5]);
await settled(page);
const baseline = await diag(page);
stage('rapid');
await page.evaluate(([a, b]) => { for (let i = 0; i < 51; i += 1) window.world.update(i % 2 ? a : b); }, [states[1], states[5]]);
await settled(page);
const rapid = await diag(page);
expect(rapid.entityKeys.length === baseline.entityKeys.length, `rapid updates ended on ${rapid.entityKeys.length}, wanted ${baseline.entityKeys.length}`);
expect(rapid.geometries <= baseline.geometries + 2, `geometry leak: ${baseline.geometries} -> ${rapid.geometries}`);
expect(rapid.dino.count === 1, `dinosaurs after rapid updates: ${rapid.dino.count}`);
console.log(JSON.stringify({ triangles: baseline.triangles, drawCalls: baseline.drawCalls, entities: baseline.entityKeys.length, geometries: baseline.geometries }));

stage('skyline');
await page.evaluate(input => window.world.update(input), states[5]);
await settled(page);
const sky = await diag(page);
await page.evaluate(() => window.world.setView('xray'));
const xray = await page.evaluate(() => window.world.getDiagnostics());
expect(xray.visibleRoofs === 0, `x-ray left ${xray.visibleRoofs} roofs visible`);
await page.evaluate(() => window.world.setView('normal'));
expect(sky.roofVariants.length >= 3, `only ${sky.roofVariants} rooflines`);
const plan = await page.evaluate(input => window.world.planKeys(input), states[1]);
await page.evaluate(([a, b]) => { for (let i = 0; i < 51; i += 1) window.world.update(i % 2 ? a : b); }, [states[5], states[1]]);
await settled(page);
const final = await diag(page);
const left = final.entityKeys.filter(key => !key.startsWith('walker') && !plan.includes(key));
expect(left.length === 0, `leftover entities: ${left.slice(0, 4)}`);
stage('reduced');
const quiet = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1000, height: 700 } });
const still = await quiet.newPage();
await still.goto(URL);
await settled(still);
await still.evaluate(input => window.world.update(input), states[3]);
await settled(still);
await still.waitForFunction(() => window.world.getDiagnostics().batched, null, { timeout: 10000 });
await still.waitForTimeout(400);
const rest = await diag(still);
const framesA = rest.frames;
await still.waitForTimeout(500);
const framesB = (await diag(still)).frames;
expect(rest.framePending === false, 'reduced motion keeps a frame pending at rest');
expect(framesA === framesB, 'reduced motion keeps rendering at rest');
await quiet.close();

stage('broken');
const broken = await browser.newPage();
const reports = [];
await broken.exposeFunction('reportWorld', value => reports.push(value));
await broken.route('**/models/arch-roof-*.glb', route => route.abort());
await broken.goto(`${URL}?report=1`);
await broken.waitForFunction(() => window.world.getDiagnostics().pendingLoads === 0, null, { timeout: 60000 });
const hurt = await diag(broken);
expect(hurt.errors.some(id => id.startsWith('arch-roof-')), `failed asset not reported: ${hurt.errors}`);
expect(reports.some(r => r.kind === 'asset' && r.id.startsWith('arch-roof-')), 'onError not called for the asset');
expect(hurt.entityKeys.includes('room:pre:0'), 'other modules should survive one failed asset');
await broken.close();

stage('broken kit');
// A classroom kit that fails to load leaves its classroom standing, with its usual table item instead.
const brokenKit = await browser.newPage();
await brokenKit.route('**/models/equip-rover-programmable.glb', route => route.abort());
await brokenKit.goto(URL);
await brokenKit.waitForFunction(() => window.world);
await brokenKit.evaluate(input => window.world.update(input), states[2]);
await brokenKit.waitForFunction(() => window.world.getDiagnostics().pendingLoads === 0, null, { timeout: 60000 });
await brokenKit.waitForTimeout(1500);
const kitless = await diag(brokenKit);
expect(kitless.entityKeys.includes('room:pre:0'), `a failed kit took preprimaria down: ${kitless.entityKeys.filter(k => k.startsWith('room'))}`);
expect(JSON.stringify(kitless.tableKits['room:pre:0']) === JSON.stringify([['equip-organizer'], ['equip-organizer']]), `preprimaria without its kit: ${JSON.stringify(kitless.tableKits['room:pre:0'])}`);
await brokenKit.close();

stage('blind');
const blind = await browser.newPage();
await blind.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
const reportsBlind = [];
await blind.exposeFunction('reportWorld', value => reportsBlind.push(value));
await blind.goto(`${URL}?report=1`);
await blind.waitForFunction(() => window.world);
expect(reportsBlind.some(r => r.kind === 'webgl'), 'no WebGL was not reported');
await blind.close();

expect(problems.length === 0, `page problems: ${problems.slice(0, 3).join(' | ')}`);
await browser.close();
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('PASS');
