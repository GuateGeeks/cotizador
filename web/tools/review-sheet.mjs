// Requires `npm run dev`. Captures a review baseline into a run directory: every published model as the
// scene loads it, the six growth compositions and the x-ray view, plus one labelled sheet of each.
// Usage: node tools/review-sheet.mjs ../runs/<new-run> [model-id ...]
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [out, ...only] = process.argv.slice(2);
if (!out) { console.error('usage: review-sheet.mjs <run-dir> [model-id ...]'); process.exit(1); }
if (existsSync(out) && readdirSync(out).length) { console.error(`${out} is not empty: use a new run directory`); process.exit(1); }
mkdirSync(resolve(out, 'models'), { recursive: true });
mkdirSync(resolve(out, 'compositions'), { recursive: true });
const ids = only.length ? only : readdirSync(resolve(import.meta.dirname, '../public/models')).filter(f => f.endsWith('.glb')).map(f => f.slice(0, -4)).sort();
const gpu = process.env.GG_GPU === '1';
const browser = await chromium.launch({ args: gpu ? ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const BASE = 'http://127.0.0.1:4410';
const sizes = {};

const page = await browser.newPage({ viewport: { width: 480, height: 480 } });
for (const id of ids) {
  await page.goto(`${BASE}/model.html?id=${id}`);
  await page.waitForFunction(() => window.modelReady, null, { timeout: 30000 });
  sizes[id] = (await page.evaluate(() => window.modelReady)).size;
  await page.screenshot({ path: resolve(out, 'models', `${id}.png`) });
}
await page.close();

const names = ['1 Escuela inicial', '2 Comunidad educativa', '3 Robótica', '4 Ampliación', '5 Conexiones', '6 Campus'];
const states = JSON.parse(readFileSync(resolve(import.meta.dirname, '../src/app/states.json'), 'utf8'));
const world = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const settled = () => world.waitForFunction(() => { const d = window.world.getDiagnostics(); return d.ready && d.transitionsActive === 0 && d.pendingLoads === 0 && d.batched; }, null, { timeout: 90000 });
await world.goto(`${BASE}/world.html`);
await world.waitForFunction(() => window.world);
await world.addStyleTag({ content: '.bar { display: none !important; }' }); // The demo buttons would show a stale pressed state.
const shots = [];
for (const [i, state] of states.entries()) {
  await world.evaluate(input => window.world.update(input), state);
  await settled();
  await world.waitForTimeout(600);
  shots.push([names[i], `state-${i + 1}.png`]);
  await world.screenshot({ path: resolve(out, 'compositions', `state-${i + 1}.png`) });
}
await world.evaluate(() => window.world.setView('xray'));
await world.waitForTimeout(800);
shots.push(['6 Campus, x-ray', 'xray.png']);
await world.screenshot({ path: resolve(out, 'compositions', 'xray.png') });
await world.close();

const sheet = async (file, cells, columns, width) => {
  const html = `<body style="margin:0;padding:16px;background:#F4F1F6;font:600 13px system-ui;color:#321853;display:grid;grid-template-columns:repeat(${columns},1fr);gap:12px;width:${width - 32}px">${cells.map(([label, path, note]) =>
    `<figure style="margin:0"><img src="data:image/png;base64,${readFileSync(path).toString('base64')}" style="width:100%;border-radius:8px;display:block"><figcaption style="padding-top:4px">${label}<span style="font-weight:400;opacity:.7"> ${note || ''}</span></figcaption></figure>`).join('')}</body>`;
  const p = await browser.newPage({ viewport: { width, height: 400 } });
  await p.setContent(html);
  await p.screenshot({ path: resolve(out, file), fullPage: true });
  await p.close();
};
await sheet('models-sheet.png', ids.map(id => [id, resolve(out, 'models', `${id}.png`), sizes[id].join(' × ') + ' m']), 6, 1800);
await sheet('compositions-sheet.png', shots.map(([label, file]) => [label, resolve(out, 'compositions', file)]), 2, 1800);
await browser.close();
writeFileSync(resolve(out, 'manifest.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), gpu, models: sizes, compositions: shots.map(s => s[1]) }, null, 2));
console.log(`${ids.length} models, ${shots.length} compositions -> ${out}`);
