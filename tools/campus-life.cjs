#!/usr/bin/env node
// Evidence of the campus' ambient life: short frame sequences of every room kind
// in state 6 (focused, zoomed in, x-ray on) and the overview sampled over a minute,
// plus diagnostics per frame (animation time, ticks, triangles, draw calls,
// materials, tick cost) and an optional frame-rate measurement.
//   node tools/campus-life.cjs <new-folder> [--gpu] [--frames 12] [--every 0.5]
//        [--overview 60] [--sample 3] [--only class,tale] [--fps 10]
// PLAYWRIGHT_MODULE may point to an installed Playwright; COTIZADOR_URL overrides the page.
// Sheets and GIFs: python3 -I tools/campus-life-sheets.py <folder>.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const { applyCampusState } = require('./campus-states.cjs');

const args = process.argv.slice(2);
const VALUED = ['--frames', '--every', '--overview', '--sample', '--only', '--fps'];
const out = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1]));
if (!out) { console.error('Uso: campus-life.cjs <carpeta-nueva> [--gpu] [--frames 12] [--every 0.5] [--overview 60] [--sample 3] [--only a,b] [--fps 10]'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva por corrida.`); process.exit(2); }
const option = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
const gpu = args.includes('--gpu');
const frames = Number(option('frames', 12)), every = Number(option('every', .5));
const overviewSeconds = Number(option('overview', 60)), sample = Number(option('sample', 3));
const fpsSeconds = Number(option('fps', 0));
const only = option('only', '') ? option('only').split(',') : null;
const url = process.env.COTIZADOR_URL || 'http://127.0.0.1:8087/asesor/index.html';
const browserArgs = gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

// One target per room kind of state 6. `zoom` wheel steps toward the framed room.
const TARGETS = [
  { name: 'class', label: 'Aula de nivel (primaria)', focus: ['level', 'prim'], zoom: 1 },
  { name: 'class-followup', label: 'Aula de nivel con seguimiento (preprimaria)', focus: ['level', 'pre'], zoom: 1 },
  { name: 'tale', label: 'Robótica para pequeños', focus: ['program', 'tale'], zoom: 1 },
  { name: 'master', label: 'Robot de primaria', focus: ['program', 'master'], zoom: 1 },
  { name: 'spike', label: 'Kit programable', focus: ['program', 'spike'], zoom: 1 },
  { name: 'electronics', label: 'Electrónica con formación docente', focus: ['program', 'electronics'], zoom: 1 },
  { name: 'immersive', label: 'Inmersiva (RV)', focus: ['program', 'immersive'], zoom: 1 },
  { name: 'drones', label: 'Drones (patio)', focus: ['program', 'drones'], zoom: 1 }
].filter(t => !only || only.includes(t.name));

const diag = page => page.evaluate(() => {
  if (typeof mascot === 'undefined' || !mascot) return null;
  const d = mascot.getDiagnostics();
  return { animationTime: d.animationTime, activityTicks: d.activityTicks, triangles: d.triangles, drawCalls: d.drawCalls, materials: d.materials,
    geometries: d.geometries, quality: d.quality, maxFps: d.maxFps, framePending: d.framePending, transitionsActive: d.transitionsActive,
    xray: d.xray, tickCost: d.tickCost || null, life: d.life || null, people: d.animatedPeople };
});
const settle = page => page.waitForFunction(() => {
  if (typeof mascot === 'undefined' || !mascot) return false;
  const d = mascot.getDiagnostics(); return !d.transitionsActive && !d.actorTransitions;
}, null, { timeout: 20000 }).catch(() => null).then(() => page.waitForTimeout(500));

async function sequence(page, dir, count, step, report) {
  fs.mkdirSync(dir, { recursive: true });
  const list = [];
  const t0 = Date.now();
  for (let i = 0; i < count; i++) {
    const due = t0 + i * step * 1000;
    const wait = due - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    const file = path.join(dir, `f${String(i).padStart(2, '0')}.png`);
    await page.locator('.campus-stage').screenshot({ path: file });
    list.push({ file: path.relative(out, file), wall: (Date.now() - t0) / 1000, ...(await diag(page)) });
  }
  report.push(...list);
  return list;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  let browser;
  for (let attempt = 0; attempt < 4 && !browser; attempt++) {
    try { browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined, headless: true, args: browserArgs }); }
    catch (error) { console.error('launch retry', error.message.split('\n')[0]); await new Promise(r => setTimeout(r, 2000)); }
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'es-GT' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) { /* sin almacenamiento */ } });
  await page.goto(url + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(`window.applyCampusState = ${applyCampusState.toString()}`);
  await page.locator('.campus-preview.campus-ready').waitFor({ timeout: 30000 });
  await page.evaluate(() => applyCampusState(6));
  await settle(page);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return gl ? { vendor: gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR), renderer: gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) } : null;
  });
  const report = { url, gpu, renderer, date: new Date().toISOString(), frames, every, overviewSeconds, sample, targets: {}, overview: [], fps: null, errors };
  for (const target of TARGETS) {
    // Every target starts from the default camera: zoom does not accumulate between targets.
    await page.evaluate(() => { inspectCampus('overview'); mascot.resetView(); });
    await settle(page);
    await page.evaluate(([kind, id]) => inspectCampus(kind, id), target.focus);
    await settle(page);
    const box = await page.locator('.campus-stage canvas').boundingBox();
    const at = await page.evaluate(() => { const d = mascot.getDiagnostics(); const f = d.framing; return { x: .5 + (f.insets.left - f.insets.right) / 2 / f.size.w, y: .5 + (f.insets.top - f.insets.bottom) / 2 / f.size.h }; });
    await page.mouse.move(box.x + box.width * at.x, box.y + box.height * at.y);
    for (let i = 0; i < target.zoom; i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(150); }
    await page.mouse.move(2, 2); // off the stage: no hover tag in the frames
    await settle(page);
    report.targets[target.name] = { label: target.label, frames: [] };
    await sequence(page, path.join(out, target.name), frames, every, report.targets[target.name].frames);
    console.log(target.name, 'ok');
  }
  await page.evaluate(() => { inspectCampus('overview'); mascot.resetView(); });
  await settle(page);
  if (overviewSeconds > 0) await sequence(page, path.join(out, 'overview'), Math.floor(overviewSeconds / sample) + 1, sample, report.overview);
  if (fpsSeconds > 0) {
    // Frame rate seen by the page (requestAnimationFrame is not the scene's own scheduler):
    // ticks of the scene's activity counter over a wall-clock window, overview, no input.
    const a = await diag(page);
    const startWall = Date.now();
    await page.waitForTimeout(fpsSeconds * 1000);
    const b = await diag(page);
    const seconds = (Date.now() - startWall) / 1000;
    report.fps = { seconds, sceneFps: (b.activityTicks - a.activityTicks) / seconds, animationAdvance: b.animationTime - a.animationTime, start: a, end: b };
  }
  report.final = await diag(page);
  fs.writeFileSync(path.join(out, 'life.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('Evidence:', out, 'errors:', errors.length, 'fps:', report.fps && report.fps.sceneFps.toFixed(1));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
