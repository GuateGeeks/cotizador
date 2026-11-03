// Requires `npm run dev`. A focused room opens: what blocks it veils or steps aside, and clearing restores all.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import states from '../src/app/states.json' with { type: 'json' };

const out = process.argv[2] || '../runs/web-xray';
const URL = process.env.GG_URL || 'http://127.0.0.1:4410/world.html'; // GG_URL points at another dev server.
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const failures = [];
const expect = (ok, text) => { if (!ok) failures.push(text); };

async function open(reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion });
  const problems = [];
  page.on('pageerror', e => problems.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => window.world);
  await page.addStyleTag({ content: '.bar { display: none !important; }' });
  page.problems = problems;
  return page;
}
const settled = page => page.waitForFunction(() => { const d = window.world.getDiagnostics(); return d.ready && d.transitionsActive === 0 && d.pendingLoads === 0 && d.batched; }, null, { timeout: 90000 });
const xray = page => page.evaluate(() => window.world.getDiagnostics().xray);
const focus = async (page, target) => { await page.evaluate(t => window.world.setFocus(t), target); await page.waitForTimeout(2500); await settled(page); };

const page = await open();
await page.evaluate(s => window.world.update(s), states[5]);
await settled(page);
const closed = await xray(page);
expect(closed && closed.room === null, `x-ray open before any focus: ${JSON.stringify(closed)}`);

// A click on a room the visitor sees opens it (the top-floor VR room is in view from the overview).
const point = await page.evaluate(() => window.world.screenPoint('project:immersive'));
await page.mouse.click(point.x, point.y);
await page.waitForTimeout(2500);
await settled(page);
let x = await xray(page);
expect(x.room === 'project:immersive' && x.ownVeils.includes('header'), `click did not open the VR room: ${JSON.stringify(x)}`);
await page.screenshot({ path: `${out}/click-vr.png` });
// Opening a ground room from the overview: the zoom into close view must not bring back what the x-ray stepped aside.
await page.evaluate(() => window.world.resetView());
await page.waitForTimeout(2500);
await settled(page);
await focus(page, { kind: 'level', id: 'prim' });
x = await xray(page);
expect(x.veiled.includes('upper:prim:0'), `the room above primaria is not veiled: ${JSON.stringify(x)}`);
expect(x.stray === 0, `${x.stray} meshes of the rooms above still show inside the veil`);
// Count only once the zoom has reached close view: crossing it reapplies the x-ray on purpose.
await page.waitForFunction(() => window.world.getDiagnostics().lod === 'close', null, { timeout: 20000 });
await page.waitForTimeout(300);
const builds = (await xray(page)).builds;
await focus(page, { kind: 'level', id: 'prim' });
expect((await xray(page)).builds === builds, 'refocusing the open room rebuilt the x-ray');
await page.screenshot({ path: `${out}/focus-prim.png` });

// The batch leaves x-rayed meshes out while a room is open.
await focus(page, null);
const cleared = await xray(page);
await focus(page, { kind: 'level', id: 'bas' });
x = await xray(page);
expect(x.room === 'room:bas:0', `level focus did not open básico: ${x.room}`);
expect(x.hiddenInBatch === 0, `batch draws ${x.hiddenInBatch} meshes the x-ray stepped aside`);

// Switching rooms restores the first.
const first = x;
await focus(page, { kind: 'program', id: 'electronics' });
x = await xray(page);
expect(x.room === 'project:electronics', `program focus did not open Electronics: ${x.room}`);
const stale = [...first.veiled, ...first.hidden].filter(key => key !== x.room && !x.veiled.includes(key) && !x.hidden.includes(key));
const leftovers = await page.evaluate(keys => window.world.xrayLeftovers(keys), stale);
expect(x.lodMismatches === 0, `${x.lodMismatches} characters or detail groups disagree with the view distance after switching rooms`);
expect(leftovers.length === 0, `first room's blockers still x-rayed: ${leftovers}`);
await page.screenshot({ path: `${out}/focus-electronics.png` });
// The open room's shell copy is merged per material after veiling, so it costs a few draws, not one per part.
expect(x.cloneMeshes > 0 && x.cloneMeshes <= 12, `open shell draws ${x.cloneMeshes} meshes`);

// Turning the camera to the back swaps which own walls veil.
expect(x.ownVeils.includes('pier_front'), `front wall not veiled from the front: ${x.ownVeils}`);
await page.evaluate(() => window.world.rotate(Math.PI));
await page.waitForTimeout(3000);
x = await xray(page);
expect(x.ownVeils.includes('wall_back') && !x.ownVeils.includes('pier_front'), `walls did not follow the camera: ${x.ownVeils}`);
await page.screenshot({ path: `${out}/electronics-back.png` });

// An update while open keeps the room open on the rebuilt entity.
await focus(page, { kind: 'level', id: 'prim' });
const before = await page.evaluate(() => window.world.getDiagnostics().entityIds['room:prim:0']);
await page.evaluate(s => window.world.update(s), states[3]); // Primaria loses Electronics: its classroom is rebuilt.
await settled(page);
await page.waitForTimeout(800);
x = await xray(page);
const after = await page.evaluate(() => window.world.getDiagnostics().entityIds['room:prim:0']);
expect(x.room === 'room:prim:0' && before !== after, `update while open: room ${x.room}, rebuilt ${before !== after}`);
await page.evaluate(s => window.world.update(s), states[5]);
await settled(page);

// The focused room's entity can be missing when the x-ray applies: it opens once the rebuilt room exists.
// A turn of the camera while an update rebuilds the open room keeps it open.
await focus(page, { kind: 'level', id: 'prim' });
await page.evaluate(s => { window.world.update(s); window.world.rotate(.5); }, states[3]);
await settled(page);
await page.waitForTimeout(800);
x = await xray(page);
expect(x.room === 'room:prim:0', `turning during a rebuild lost the x-ray: ${x.room}`);
// A focus given in the same tick as an update that rebuilds that room opens it.
await focus(page, null);
await page.evaluate(s => { window.world.update(s); window.world.setFocus({ kind: 'level', id: 'prim' }); }, states[5]);
await settled(page);
await page.waitForTimeout(800);
x = await xray(page);
expect(x.room === 'room:prim:0', `focus in the update's tick did not open the rebuilt room: ${x.room}`);

// Picking passes through veils: a click on the open room's front stays on it.
await focus(page, { kind: 'level', id: 'prim' });
const front = await page.evaluate(() => window.world.screenPoint('room:prim:0'));
await page.mouse.click(front.x, front.y);
await page.waitForTimeout(2000);
x = await xray(page);
expect(x.room === 'room:prim:0', `click through the veils moved the focus to ${x.room}`);

// A non-room focus and the overview both clear it, and the batch is whole again.
await focus(page, { key: 'patio:drones' });
x = await xray(page);
expect(x.room === null, `patio focus left the x-ray open: ${x.room}`);
await focus(page, { kind: 'level', id: 'prim' });
await page.evaluate(() => window.world.resetView());
await page.waitForTimeout(2500);
await settled(page);
x = await xray(page);
expect(x.room === null && !x.veiled.length && !x.hidden.length && x.batchSources === cleared.batchSources,
  `overview did not restore: ${JSON.stringify({ ...x, before: cleared.batchSources })}`);
expect(page.problems.length === 0, `page errors: ${page.problems.slice(0, 2)}`);
await page.close();

// A focus given before the first load settles opens the room once it is built.
const early = await open();
await early.evaluate(s => { window.world.update(s); window.world.setFocus({ kind: 'program', id: 'electronics' }); }, states[5]);
await settled(early);
await early.waitForTimeout(800);
x = await xray(early);
expect(x.room === 'project:electronics', `focus before the first load did not open Electronics: ${x.room}`);
expect(early.problems.length === 0, `page errors: ${early.problems.slice(0, 2)}`);
await early.close();

// Reduced motion opens and clears the same way.
const still = await open('reduce');
await still.evaluate(s => window.world.update(s), states[5]);
await settled(still);
await focus(still, { kind: 'level', id: 'prim' });
x = await xray(still);
expect(x.room === 'room:prim:0', `reduced motion did not open: ${x.room}`);
await still.evaluate(() => window.world.resetView());
await still.waitForTimeout(800);
x = await xray(still);
expect(x.room === null, `reduced motion did not clear: ${x.room}`);
await still.close();

await browser.close();
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('PASS');
