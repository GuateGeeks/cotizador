#!/usr/bin/env node
// Frame rate of the living campus (state 6): during a camera transition (rotating for 3 s), at the
// ambient rate (no input, 5 s), the tick cost, and the triangles while Geeky reacts in a focused room.
//   GPU=1 node tools/campus-life-fps.cjs   (GPU via ANGLE/GL; default SwiftShader). Prints the results.
// PLAYWRIGHT_MODULE may point to an installed Playwright; COTIZADOR_URL overrides the page.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { applyCampusState } = require('./campus-states.cjs');
(async () => {
  const gpu = process.env.GPU === '1';
  const b = await chromium.launch({ headless: true, args: gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(process.env.COTIZADOR_URL || 'http://127.0.0.1:8087/asesor/index.html');
  await p.evaluate(`window.applyCampusState = ${applyCampusState.toString()}`);
  await p.locator('.campus-preview.campus-ready').waitFor({ timeout: 30000 });
  await p.evaluate(() => applyCampusState(6));
  await p.waitForTimeout(6000);
  const d = () => p.evaluate(() => { const x = mascot.getDiagnostics(); return { ticks: x.activityTicks, tri: x.triangles, fps: x.targetFps, q: x.quality, tc: x.tickCost, life: x.life }; });
  // Camera transition: keep rotating for 3 s.
  const a = await d(), t0 = Date.now();
  const iv = setInterval(() => p.evaluate(() => mascot.rotate(.02)).catch(() => {}), 60);
  await p.waitForTimeout(3000); clearInterval(iv);
  const b2 = await d(), s = (Date.now() - t0) / 1000;
  console.log('transition fps', ((b2.ticks - a.ticks) / s).toFixed(1), 'target', b2.fps, b2.q);
  await p.waitForTimeout(2500);
  const c = await d(), t1 = Date.now(); await p.waitForTimeout(5000); const e = await d();
  console.log('ambient fps', ((e.ticks - c.ticks) / ((Date.now() - t1) / 1000)).toFixed(1), 'target', e.fps, e.q, 'tick', JSON.stringify(e.tc), 'reactions', JSON.stringify(e.life));
  // Triangles while Geeky reacts (focus a robot room and wait through goals).
  await p.evaluate(() => inspectCampus('program', 'master'));
  let maxTri = 0, reacted = 0;
  for (let i = 0; i < 80; i++) { await p.waitForTimeout(500); const x = await d(); maxTri = Math.max(maxTri, x.tri); reacted = x.life.reactions; }
  console.log('focused master 40 s: max triangles', maxTri, 'reactions', reacted);
  await b.close();
})();
