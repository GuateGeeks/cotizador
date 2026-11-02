// Requires `npm run dev`. Covers the swap's parity gate and measures the largest campus.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import states from '../src/app/states.json' with { type: 'json' };

const out = process.argv[2] || '../runs/web-parity';
mkdirSync(out, { recursive: true });
const gpu = process.env.GG_GPU === '1';
const browser = await chromium.launch({ args: gpu ? ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 880 } });
const failures = [], problems = [];
const expect = (ok, text) => { if (!ok) failures.push(text); };
page.on('pageerror', e => problems.push(String(e)));
const settled = () => page.waitForFunction(() => { const d = window.world.getDiagnostics(); return d.ready && d.transitionsActive === 0 && d.pendingLoads === 0; }, null, { timeout: 90000 });
const diag = () => page.evaluate(() => window.world.getDiagnostics());
const full = { levels: ['pre', 'prim', 'bas', 'bach'], programs: ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'],
  enrollment: ['pre', 'prim', 'bas', 'bach'].flatMap(levelId => [0, 1, 2, 3].map(i => ({ id: `${levelId}${i}`, levelId, students: 30 }))) };

await page.goto('http://127.0.0.1:4410/world.html');
await settled();
await page.evaluate(input => window.world.update(input), full);
await settled();
const d = await diag();
for (const program of full.programs) expect(d.animatedPrograms.includes(program), `${program} not visible`);
for (const id of ['char-student-pre', 'char-student-primary', 'char-student-primary-boy', 'char-student-basico', 'char-student-bach', 'char-teacher']) expect(d.characters.includes(id), `${id} not in the scene`);

const fps = await page.evaluate(() => new Promise(done => {
  let frames = 0; const start = performance.now();
  const step = now => { frames += 1; if (now - start < 4000) requestAnimationFrame(step); else done(frames * 1000 / (now - start)); };
  requestAnimationFrame(step);
}));
const measured = await diag();
await page.screenshot({ path: `${out}/campus.png` });
await page.evaluate(() => window.world.setFocus({ kind: 'program', id: 'master' }));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/focus-master.png` });
expect((await diag()).lod === 'close', 'close view should use full-detail students');
await page.evaluate(() => window.world.setFocus(null));
await page.waitForTimeout(1200);

await page.evaluate(() => window.world.setFocus({ kind: 'level', id: 'prim' }));
expect((await diag()).focused === true, 'level focus ignored');
await page.evaluate(() => window.world.setFocus(null));
for (const name of ['agentGesture', 'setInsets', 'setHoverVerb', 'setView']) expect(await page.evaluate(n => typeof window.world[n] === 'function', name), `${name} missing`);
await page.evaluate(() => { window.world.setInsets({ left: 100 }); window.world.setHoverVerb('Ver'); window.world.setView('xray'); window.world.setView('normal'); window.world.agentGesture('wave'); });

const box = await page.locator('canvas').boundingBox();
const selected = await page.evaluate(([x, y]) => new Promise(done => {
  window.__selected = done;
  const canvas = document.querySelector('canvas');
  for (const type of ['pointerdown', 'pointerup']) canvas.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 1 }));
  setTimeout(() => done(null), 600);
}), [box.x + box.width * .5, box.y + box.height * .45]);
expect(selected?.key, 'clicking the school selected nothing');

await page.focus('canvas');
const yaw = (await diag()).yaw;
await page.keyboard.press('ArrowLeft');
expect((await diag()).yaw !== yaw, 'arrow key did not rotate');

await page.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'); window.__lost = gl.getExtension('WEBGL_lose_context'); window.__lost.loseContext(); });
await page.waitForTimeout(300);
expect((await diag()).contextLost === true, 'context loss not noticed');
await page.evaluate(() => window.__lost.restoreContext());
await page.waitForTimeout(800);
expect((await diag()).contextLost === false, 'context did not recover');

await page.evaluate(input => window.world.update(input), full);
const result = { date: new Date().toISOString().slice(0, 10), gpu, fps: Math.round(fps), triangles: measured.triangles, drawCalls: measured.drawCalls, geometries: measured.geometries, entities: measured.entityKeys.length, lod: measured.lod };
writeFileSync(`${out}/bench.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
expect(measured.drawCalls <= 150, `draw calls ${measured.drawCalls} over 150`);
expect(measured.lod === 'campus', 'campus view should use light students');
expect(problems.length === 0, `page problems: ${problems.slice(0, 3).join(' | ')}`);
await browser.close();
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('PASS');
