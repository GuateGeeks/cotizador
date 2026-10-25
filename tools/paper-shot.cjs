#!/usr/bin/env node
// Renders papercraft pieces from the inspector (asesor/lab/paper) into PNGs plus a
// report.json (triangles, size, staged bones, build errors, SHA256 of each image).
// The bundle is built in memory, so no server is needed and parallel runs are safe.
//   node tools/paper-shot.cjs <new-folder> [--group rooms] [--piece id[,id]] [--views 34,front,close]
//        [--assembly 0,.35,.7] [--no-sheet] [--gpu]
// PLAYWRIGHT_MODULE may point to an installed Playwright package.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const esbuild = require('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const option = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const flag = name => args.includes('--' + name);
if (!out) { console.error('Uso: paper-shot.cjs <carpeta-nueva> [--group g] [--piece a,b] [--views 34,front,close] [--assembly 0,.5] [--no-sheet] [--gpu]'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva por corrida.`); process.exit(2); }
const views = (option('views') || '34,front,close').split(',').filter(Boolean);
const assembly = option('assembly') ? option('assembly').split(',').map(Number) : [];
const browserArgs = flag('gpu') ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// One Chromium at a time on this host (memory is shared with other sessions):
// parallel callers wait for the lock; a lock left by a dead process is taken over.
const LOCK = path.join(require('node:os').tmpdir(), 'gg-paper-shot.lock');
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
async function acquire() {
  for (;;) {
    try { fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' }); return; }
    catch (e) {
      const owner = Number(fs.readFileSync(LOCK, 'utf8')) || 0;
      if (!alive(owner)) { try { fs.unlinkSync(LOCK); } catch (_) { /* raced */ } continue; }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}
const release = () => { try { if (Number(fs.readFileSync(LOCK, 'utf8')) === process.pid) fs.unlinkSync(LOCK); } catch (_) { /* gone */ } };
process.on('exit', release);

(async () => {
  const bundle = await esbuild.build({
    entryPoints: [path.join(root, 'asesor/lab/paper/inspector-entry.js')], bundle: true, write: false,
    format: 'iife', globalName: 'GGPaper', target: 'es2019', logLevel: 'silent'
  });
  const code = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  fs.mkdirSync(out, { recursive: true });
  await acquire();
  const browser = await chromium.launch({ headless: true, args: browserArgs });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#F4F1F6}#stage{width:100%;height:100%}</style><div id="stage"></div><script>${code}</script><script>window.inspector = GGPaper.createInspector(document.getElementById('stage'));</script>`);
  await page.waitForFunction(() => window.inspector);
  const catalog = await page.evaluate(() => GGPaper.CATALOG.map(p => ({ id: p.id, group: p.group })));
  const group = option('group'), only = option('piece') ? option('piece').split(',') : null;
  const targets = (option('states') || option('leak')) && !group && !only ? [] : catalog.filter(p => (!group || p.group === group) && (!only || only.includes(p.id)));
  if (only) for (const id of only) if (!catalog.some(p => p.id === id)) errors.push(`Pieza desconocida: ${id}`);
  const report = { date: new Date().toISOString(), renderer: flag('gpu') ? 'gpu-angle-gl' : 'swiftshader', images: [], pieces: [], errors };
  const shot = async (name, size) => {
    await page.setViewportSize(size);
    await page.evaluate(() => inspector.render());
    const file = path.join(out, name);
    await page.screenshot({ path: file });
    report.images.push({ file: name, sha256: sha(file) });
  };
  if (option('states')) {
    // Growth states: plan → composed campus, all framed like the largest state so growth reads physically.
    const ns = option('states').split(',').map(Number), big = Math.max(...ns), size = { width: 1500, height: 1000 };
    await page.setViewportSize(size);
    const compose = (n, o) => page.evaluate(([n, o]) => {
      const plan = GGPaper.planCampus(GGPaper.stateInput(n));
      const r = inspector.showPiece(GGPaper.composeCampus(plan), o);
      return { ...r, modules: plan.modules.length, people: plan.people.length, stats: plan.stats,
        tale: plan.modules.find(m => m.key === 'project:tale') || null };
    }, [n, o]);
    const largest = await compose(big, { view: '34' });
    report.states = [];
    for (const n of ns) {
      const r = await compose(n, { view: '34', frame: largest.box });
      await shot(`estado-${n}.png`, size);
      report.states.push({ n, triangles: r.triangles, modules: r.modules, people: r.people, missing: r.missing, error: r.error, stats: r.stats });
      if (r.error) errors.push(`estado ${n}: ${r.error.split('\n')[0]}`);
    }
    const views = [['vista-general', { view: '34' }], ['vista-frontal', { view: 'front' }], ['patio-y-aulas', { view: 'close', zoom: 3.2, focus: [0, .5, .2] }]];
    if (largest.tale) views.push(['personajes-y-equipo', { view: 'people', zoom: 6.5, focus: [largest.tale.x - .6, .55, largest.tale.z - .1] }]);
    for (const [name, o] of views) { await compose(big, o); await shot(`${name}.png`, size); }
    for (const a of assembly) {
      await compose(1, { view: '34' }); await page.evaluate(a => inspector.setAssembly(a), a);
      await shot(`ensamblaje-${String(a).replace('.', '')}.png`, size);
      await page.evaluate(() => inspector.setAssembly(1));
    }
  }
  if (option('leak')) {
    // Grow and shrink repeatedly: GPU geometries must return to the same count every cycle.
    const cycles = Number(option('leak')) || 20, samples = [];
    for (let i = 0; i < cycles; i++) {
      for (const n of [2, 6]) await page.evaluate(n => inspector.showPiece(GGPaper.composeCampus(GGPaper.planCampus(GGPaper.stateInput(n))), { view: '34' }), n);
      samples.push(await page.evaluate(() => inspector.memory()));
    }
    const geo = samples.map(s => s.geometries), stable = geo.slice(2).every(g => g === geo[2]);
    report.leak = { cycles, geometries: geo, textures: samples.map(s => s.textures), programs: samples.map(s => s.programs), status: stable ? 'PASS' : 'FAIL' };
    if (!stable) errors.push('fuga: las geometrías crecen entre ciclos ' + geo.join(','));
  }
  const groups = [...new Set(targets.map(p => p.group))];
  if (!flag('no-sheet') && !only) for (const g of groups) {
    await page.setViewportSize({ width: 1500, height: 1000 });
    await page.evaluate(g => inspector.showGroup(g), g);
    await shot(`${g}-sheet.png`, { width: 1500, height: 1000 });
  }
  for (const target of targets) {
    let info = null;
    for (const v of views) {
      info = await page.evaluate(([id, v]) => inspector.show(id, { view: v }), [target.id, v]);
      await shot(`${target.id}-${v}.png`, { width: 900, height: 700 });
    }
    if (info && info[0]?.staged) for (const a of assembly) {
      await page.evaluate(([id, a]) => { inspector.show(id, { view: '34' }); inspector.setAssembly(a); }, [target.id, a]);
      await shot(`${target.id}-asm-${String(a).replace('.', '')}.png`, { width: 900, height: 700 });
      await page.evaluate(() => inspector.setAssembly(1));
    }
    if (info) report.pieces.push(info[0]);
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  const failed = report.pieces.filter(p => p.error);
  const over = report.pieces.filter(p => p.budget != null && p.triangles > p.budget);
  console.log(JSON.stringify({ out, pieces: report.pieces.length, images: report.images.length,
    buildErrors: failed.map(p => p.id), overBudget: over.map(p => `${p.id} ${p.triangles}/${p.budget}`), consoleErrors: errors.length }));
  process.exit(failed.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
