#!/usr/bin/env node
// Pose sheets of the ambient-life vocabulary, rendered in Chromium from the real
// pieces and poses (seated at a table with the campus' hand guard, standing, teacher).
//   node tools/life-poses.cjs <new-folder> [--gpu]
// PLAYWRIGHT_MODULE may point to an installed Playwright. Writes poses-<row>-<view>.png and the bundle.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const out = process.argv[2];
if (!out || out.startsWith('--')) { console.error('Uso: life-poses.cjs <carpeta-nueva> [--gpu]'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva.`); process.exit(2); }
const gpu = process.argv.includes('--gpu');
const ROWS = [
  { label: 'Sentado a la mesa (1)', seated: true, poses: ['type', 'raise', 'talk', 'lean', 'pointDown', 'highFiveL'] },
  { label: 'Sentado a la mesa (2)', seated: true, poses: ['cheer', 'clap', 'oops', 'think', 'press', 'reach'] },
  { label: 'De pie (1)', poses: ['hold', 'grab', 'visor', 'vr', 'talk', 'point'] },
  { label: 'De pie (2)', poses: ['wave', 'cheer', 'highFiveR', 'oops', 'think', 'raise'] },
  { label: 'Docente', teacher: true, poses: ['talk', 'point', 'pointDown', 'reach', 'highFiveR', 'clap', 'think', 'hold'] }
];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  await esbuild.build({ entryPoints: [path.join(__dirname, 'life-poses-entry.js')], bundle: true, format: 'iife', globalName: 'LifePoses', outfile: path.join(out, 'life-poses.js'), logLevel: 'silent' });
  fs.writeFileSync(path.join(out, 'index.html'), '<!doctype html><meta charset="utf-8"><body style="margin:0"><canvas id="c" style="width:1800px;height:520px"></canvas><script src="life-poses.js"></script>');
  const args = gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  let browser;
  for (let i = 0; i < 4 && !browser; i++) {
    try { browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined, headless: true, args }); } catch (e) { await new Promise(r => setTimeout(r, 2000)); }
  }
  const page = await browser.newPage({ viewport: { width: 1800, height: 520 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(out, 'index.html'));
  for (const [r, row] of ROWS.entries()) for (const view of ['34', 'side', 'front']) {
    // A fresh canvas per render: one WebGL context at a time.
    await page.evaluate(() => { const old = document.getElementById('c'), c = document.createElement('canvas'); c.id = 'c'; c.style.cssText = old.style.cssText; old.replaceWith(c); });
    await page.evaluate(([row, view]) => LifePoses.render(document.getElementById('c'), { row, view }), [row, view]);
    await page.locator('#c').screenshot({ path: path.join(out, `poses-${r + 1}-${view}.png`) });
  }
  fs.writeFileSync(path.join(out, 'poses.json'), JSON.stringify({ rows: ROWS, gpu, errors }, null, 2) + '\n');
  console.log('Evidence:', out, 'errors:', errors.length, errors[0] || '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
