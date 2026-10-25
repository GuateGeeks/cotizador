#!/usr/bin/env node
// Evidence captures from the running asesor: the six reference states, the four
// reference views and close-ups, plus a growth/reduction check and render
// diagnostics. Usage (with `npm run serve` running):
//   npm run capture -- artifacts/campus/<run> [--gpu] [--mobile] [--states 1,3,6]
// PLAYWRIGHT_MODULE may point to an installed Playwright; COTIZADOR_URL overrides the page.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { STATES, applyCampusState } = require('./campus-states.cjs');

const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--'));
if (!out) { console.error('Uso: campus-capture.cjs <carpeta> [--gpu] [--mobile] [--states 1,2,3]'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva por corrida.`); process.exit(2); }
const flag = name => args.includes('--' + name);
const option = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const gpu = flag('gpu');
const wanted = (option('states') || '1,2,3,4,5,6').split(',').map(Number);
const viewport = flag('mobile') ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
const url = process.env.COTIZADOR_URL || 'http://127.0.0.1:8087/asesor/index.html';
// SwiftShader is reproducible on any host; --gpu uses the host GPU through ANGLE/GL.
const browserArgs = gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const settle = page => page.waitForFunction(() => { const d = window.mascot?.getDiagnostics?.(); return d && !d.transitionsActive && !d.actorTransitions; }, null, { timeout: 15000 }).catch(() => null).then(() => page.waitForTimeout(600));

// Reference views. A scene may expose setView(name); otherwise fall back to the public controls.
async function view(page, name) {
  const done = await page.evaluate(name => typeof mascot.setView === 'function' ? (mascot.setView(name), true) : false, name);
  if (done) return;
  await page.evaluate(() => { inspectCampus('overview'); mascot.resetView(); });
  if (name === 'front') await page.evaluate(() => mascot.rotate(.55));
  if (name === 'patio' || name === 'people') {
    if (name === 'people') await page.evaluate(() => inspectCampus('program', state.selected[0]?.programId || 'tale'));
    await settle(page);
    const box = await page.locator('.campus-stage canvas').boundingBox();
    // The focused program is framed in the free area; zoom toward its centre.
    const at = name === 'patio' ? [.5, .62] : [.5, .5];
    await page.mouse.move(box.x + box.width * at[0], box.y + box.height * at[1]);
    for (let i = 0; i < (name === 'patio' ? 4 : 3); i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(120); }
  }
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: browserArgs });
  const page = await browser.newPage({ viewport, locale: 'es-GT' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) { /* sin almacenamiento */ } });
  await page.goto(url + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await page.evaluate(`window.applyCampusState = ${applyCampusState.toString()}`);
  await page.evaluate(() => applyCampusState(1));
  await page.locator('.campus-preview.campus-ready').waitFor({ timeout: 30000 });
  const report = { url, viewport, renderer: gpu ? 'gpu-angle-gl' : 'swiftshader', date: new Date().toISOString(), states: [], views: [], growth: null, errors };
  const shot = async (file, entry) => {
    const target = path.join(out, file);
    await page.locator('.campus-stage').screenshot({ path: target });
    const d = await page.evaluate(() => { const x = mascot.getDiagnostics(); return { triangles: x.triangles, drawCalls: x.drawCalls, materials: x.materials, rooms: x.rooms, workshops: x.workshops, people: x.animatedPeople, quality: x.quality }; });
    return { ...entry, file, sha256: sha(target), diagnostics: d };
  };
  for (const s of STATES.filter(s => wanted.includes(s.id))) {
    await page.evaluate(n => applyCampusState(n), s.id);
    await settle(page);
    report.states.push(await shot(`estado-${s.id}-${s.name}.png`, s));
  }
  // The four reference views on the consolidated campus.
  await page.evaluate(() => applyCampusState(6));
  await settle(page);
  for (const name of ['overview', 'front', 'patio', 'people']) {
    await view(page, name);
    await settle(page);
    report.views.push(await shot(`vista-${name}.png`, { view: name }));
  }
  // Reduction must converge to a direct build of the smaller state.
  await page.evaluate(() => { inspectCampus('overview'); mascot.resetView(); applyCampusState(2); });
  await settle(page);
  const reduced = await page.evaluate(() => mascot.getDiagnostics());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(`window.applyCampusState = ${applyCampusState.toString()}`);
  await page.evaluate(() => applyCampusState(2));
  await page.locator('.campus-preview.campus-ready').waitFor({ timeout: 30000 });
  await settle(page);
  const direct = await page.evaluate(() => mascot.getDiagnostics());
  const keys = ['rooms', 'workshops', 'entities'];
  report.growth = { reduced: Object.fromEntries(keys.map(k => [k, reduced[k]])), direct: Object.fromEntries(keys.map(k => [k, direct[k]])), status: keys.every(k => reduced[k] === direct[k]) ? 'PASS' : 'FAIL' };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify({ out, states: report.states.length, views: report.views.length, growth: report.growth.status, errors: errors.length }));
  process.exit(errors.length || report.growth.status !== 'PASS' ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
