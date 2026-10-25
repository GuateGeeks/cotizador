#!/usr/bin/env node
// Render budget and frame rate of one campus state in the running asesor: samples getDiagnostics()
// every animation frame during an activity run (triangles with the shadow pass, draw calls, materials,
// quality) and reports the range, the fps and the WebGL renderer string, so a GPU run can be told
// apart from SwiftShader. Usage (with a local server running):
//   GALLIUM_DRIVER=d3d12 LD_LIBRARY_PATH=/usr/lib/wsl/lib node tools/campus-perf.cjs artifacts/campus/<run> --gpu [--state 6] [--views overview,program]
// PLAYWRIGHT_MODULE may point to an installed Playwright; COTIZADOR_URL overrides the page.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const { applyCampusState } = require('./campus-states.cjs');

const args = process.argv.slice(2);
const out = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!out) { console.error('Uso: campus-perf.cjs <carpeta> [--gpu] [--state 6] [--views overview,program]'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva por corrida.`); process.exit(2); }
const option = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const gpu = args.includes('--gpu');
const stateN = Number(option('state') || 6);
const views = (option('views') || 'overview,program').split(',');
const url = process.env.COTIZADOR_URL || 'http://127.0.0.1:8087/asesor/index.html';
const browserArgs = gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: browserArgs });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'es-GT' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) { /* sin almacenamiento */ } });
  await page.goto(url + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' });
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return gl ? { vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR), renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) } : null;
  });
  await page.evaluate(`window.applyCampusState = ${applyCampusState.toString()}`);
  await page.evaluate(n => applyCampusState(n), stateN);
  await page.locator('.campus-preview.campus-ready').waitFor({ timeout: 30000 });
  const report = { url, state: stateN, gpu, renderer, date: new Date().toISOString(), runs: [], errors };
  for (const view of views) {
    // Each view restarts the activity (a focus change replays it) and samples one full run.
    await page.evaluate(v => { inspectCampus('overview'); mascot.resetView(); if (v === 'program') inspectCampus('program', 'master'); }, view);
    const run = await page.evaluate(() => new Promise(resolve => {
      const samples = [], t0 = performance.now();
      let frames = 0, last = t0;
      const intervals = [];
      const tick = now => {
        frames++; intervals.push(now - last); last = now;
        const d = mascot.getDiagnostics();
        samples.push({ t: Math.round(now - t0), triangles: d.triangles, drawCalls: d.drawCalls, materials: d.materials, quality: d.quality, people: d.animatedPeople });
        if (now - t0 < 14000) requestAnimationFrame(tick); else resolve({ samples, frames, seconds: (now - t0) / 1000, intervals });
      };
      requestAnimationFrame(tick);
    }));
    const tri = run.samples.map(s => s.triangles).filter(Boolean), calls = run.samples.map(s => s.drawCalls).filter(Boolean);
    const sorted = run.intervals.slice(1).sort((a, b) => a - b), pct = q => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
    report.runs.push({ view, frames: run.frames, seconds: +run.seconds.toFixed(2), fps: +(run.frames / run.seconds).toFixed(1),
      frameMs: { p50: +pct(.5).toFixed(1), p95: +pct(.95).toFixed(1), p99: +pct(.99).toFixed(1) },
      triangles: { min: Math.min(...tri), max: Math.max(...tri) }, drawCalls: { min: Math.min(...calls), max: Math.max(...calls) },
      materials: Math.max(...run.samples.map(s => s.materials)), quality: [...new Set(run.samples.map(s => s.quality))], people: run.samples.at(-1)?.people });
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify({ out, renderer, runs: report.runs.map(r => ({ view: r.view, fps: r.fps, frameMs: r.frameMs, triangles: r.triangles, drawCalls: r.drawCalls, materials: r.materials, quality: r.quality, people: r.people })), errors: errors.length }, null, 1));
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
