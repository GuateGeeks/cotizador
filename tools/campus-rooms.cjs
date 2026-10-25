#!/usr/bin/env node
// Close-ups of every room kind in the running asesor: the overview, the focused
// room (inspectCampus) and a close zoom on it, plus the camera framing of each
// shot (framings.json) so tools/paper-activity-check.mjs can measure device
// visibility with the same cameras. Usage (with a local server running):
//   node tools/campus-rooms.cjs artifacts/campus/<run> [--state 6] [--gpu] [--only tale,prim]
// PLAYWRIGHT_MODULE may point to an installed Playwright; COTIZADOR_URL overrides the page;
// BROWSER_ARGS (space separated) overrides the Chromium flags.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { applyCampusState } = require('./campus-states.cjs');

const args = process.argv.slice(2);
const out = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!out) { console.error('Uso: campus-rooms.cjs <carpeta> [--state 6] [--gpu] [--only tale,prim]'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva por corrida.`); process.exit(2); }
const option = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const gpu = args.includes('--gpu');
const stateN = Number(option('state') || 6);
const only = option('only') ? option('only').split(',') : null;
const url = process.env.COTIZADOR_URL || 'http://127.0.0.1:8087/asesor/index.html';
const browserArgs = process.env.BROWSER_ARGS ? process.env.BROWSER_ARGS.split(' ').filter(Boolean)
  : gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
// One target per room kind (state 6 holds all of them; services live in the pre room and a project room).
const TARGETS = [
  ['level', 'pre', 'aula-pre'], ['level', 'prim', 'aula-prim'], ['level', 'bas', 'aula-bas'], ['level', 'bach', 'aula-bach'],
  ['program', 'tale', 'tale'], ['program', 'master', 'master'], ['program', 'spike', 'spike'],
  ['program', 'electronics', 'electronics'], ['program', 'immersive', 'immersive'], ['program', 'drones', 'drones']
].filter(([, id]) => !only || only.includes(id));

const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const settle = page => page.waitForFunction(() => { const d = typeof mascot !== 'undefined' && mascot.getDiagnostics?.(); return d && !d.transitionsActive && !d.actorTransitions && !d.framePending; }, null, { timeout: 25000 })
  .catch(() => null).then(() => page.waitForTimeout(700));
const diag = page => page.evaluate(() => { const d = mascot.getDiagnostics(); return { triangles: d.triangles, drawCalls: d.drawCalls, materials: d.materials, people: d.animatedPeople, quality: d.quality, yaw: d.yaw, pitch: d.pitch, zoom: d.zoom, framing: d.framing, xray: d.xray, renderer: d.renderer || null }; });

(async () => {
  fs.mkdirSync(out, { recursive: true });
  let browser = null;
  for (let attempt = 0; attempt < 4 && !browser; attempt++) {
    try { browser = await chromium.launch({ headless: true, args: browserArgs }); }
    catch (e) { if (attempt === 3) throw e; await new Promise(r => setTimeout(r, 3000)); }
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'es-GT' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) { /* sin almacenamiento */ } });
  await page.goto(url + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(`window.applyCampusState = ${applyCampusState.toString()}`);
  await page.evaluate(n => applyCampusState(n), stateN);
  await page.locator('.campus-preview.campus-ready').waitFor({ timeout: 30000 });
  await settle(page);
  const stage = page.locator('.campus-stage');
  const report = { url, state: stateN, renderer: gpu ? 'gpu-angle-gl' : 'swiftshader', date: new Date().toISOString(), shots: [], errors };
  const shot = async (file, entry) => {
    const target = path.join(out, file);
    await stage.screenshot({ path: target });
    const box = await stage.boundingBox();
    report.shots.push({ ...entry, file, sha256: sha(target), canvas: { width: Math.round(box.width), height: Math.round(box.height) }, diagnostics: await diag(page) });
  };
  await page.evaluate(() => { inspectCampus('overview'); mascot.resetView(); });
  await settle(page);
  await shot('vista-general.png', { kind: 'overview', view: 'overview' });
  for (const [kind, id, name] of TARGETS) {
    await page.evaluate(([k, i]) => { inspectCampus('overview'); mascot.resetView(); inspectCampus(k, i); }, [kind, id]);
    await settle(page);
    await shot(`${name}-foco.png`, { kind, id, view: 'focus' });
    // Close zoom toward the centre of the free area, where the focused room is framed.
    const f = report.shots[report.shots.length - 1].diagnostics.framing, box = await stage.boundingBox();
    const cx = box.x + f.insets.left + (f.size.w - f.insets.left - f.insets.right) / 2, cy = box.y + f.insets.top + (f.size.h - f.insets.top - f.insets.bottom) / 2;
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(140); }
    await page.mouse.move(box.x + 4, box.y + 4);
    await settle(page);
    await shot(`${name}-cerca.png`, { kind, id, view: 'close' });
  }
  fs.writeFileSync(path.join(out, 'framings.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify({ out, shots: report.shots.length, errors: errors.length }));
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
