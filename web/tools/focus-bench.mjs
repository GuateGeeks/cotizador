// Requires `npm run dev`. Measures the largest campus in close view with a program room focused.
// Usage: node tools/focus-bench.mjs <run-dir> [program | key:<module key> ...]   (GG_GPU=1 for the reference desktop)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const [out, ...programs] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const gpu = process.env.GG_GPU === '1';
const browser = await chromium.launch({ args: gpu ? ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 880 } });
const settled = () => page.waitForFunction(() => { const d = window.world.getDiagnostics(); return d.ready && d.transitionsActive === 0 && d.pendingLoads === 0 && d.batched; }, null, { timeout: 90000 });
const full = { levels: ['pre', 'prim', 'bas', 'bach'], programs: ['tale', 'master', 'spike', 'electronics', 'drones', 'immersive'],
  enrollment: ['pre', 'prim', 'bas', 'bach'].flatMap(levelId => [0, 1, 2, 3].map(i => ({ id: `${levelId}${i}`, levelId, students: 30 }))) };
await page.goto('http://127.0.0.1:4410/world.html');
await page.addStyleTag({ content: '.bar { display: none !important; }' });
await settled();
await page.evaluate(input => window.world.update(input), full);
await settled();
const results = {};
for (const id of programs.length ? programs : ['master', 'electronics']) {
  await page.evaluate(p => window.world.setFocus(p.startsWith('key:') ? { key: p.slice(4) } : { kind: 'program', id: p }), id);
  await page.waitForTimeout(2500);
  await settled();
  const fps = await page.evaluate(() => new Promise(done => {
    let frames = 0; const start = performance.now();
    const step = now => { frames += 1; if (now - start < 4000) requestAnimationFrame(step); else done(frames * 1000 / (now - start)); };
    requestAnimationFrame(step);
  }));
  const d = await page.evaluate(() => window.world.getDiagnostics());
  results[id] = { fps: Math.round(fps), drawCalls: d.drawCalls, triangles: d.triangles, lod: d.lod, xray: d.xray || null };
  await page.screenshot({ path: `${out}/focus-${id.replace(/[:]/g, '_')}.png` });
}
await browser.close();
writeFileSync(`${out}/bench.json`, JSON.stringify({ date: new Date().toISOString().slice(0, 10), gpu, results }, null, 2));
console.log(JSON.stringify(results));
