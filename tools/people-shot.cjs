#!/usr/bin/env node
// Readability ladder for papercraft people: each piece rendered by the inspector so
// the character measures exactly N CSS pixels tall (sole to top of hair) in the
// final image, at device pixel ratio 1 and 2, from fixed views with the same light.
// A first pass at 600 px measures the drawn height in the canvas; the viewport is
// then scaled so the person is N px tall. Writes PNGs plus report.json (measured
// heights, SHA256). The bundle is built in memory, like tools/paper-shot.cjs.
//   node tools/people-shot.cjs <new-folder> [--piece person-prim,person-pre] [--views front,34,side,back]
//        [--sizes 40,60,80,120,600] [--dpr 1,2] [--gpu]
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
const option = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
if (!out) { console.error('Uso: people-shot.cjs <carpeta-nueva> [--piece a,b] [--views front,34,side,back] [--sizes 40,80] [--dpr 1,2] [--gpu]'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva por corrida.`); process.exit(2); }
const pieces = option('piece', 'person-prim').split(',');
const views = option('views', 'front,34,side,back').split(',');
const sizes = option('sizes', '40,60,80,120,600').split(',').map(Number);
const dprs = option('dpr', '1,2').split(',').map(Number);
const gpu = args.includes('--gpu');
const browserArgs = gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// Same Chromium lock as paper-shot: one browser at a time on this host.
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

/** In the page: height in CSS px of the drawn character (pixels clearly darker than the background). */
const MEASURE = () => {
  const src = document.querySelector('canvas'), w = src.width, h = src.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;
  let top = -1, bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // Background #F4F1F6 and the lilac contact shadows stay above ~200 in every channel.
      if (Math.min(d[i], d[i + 1], d[i + 2]) < 170) { if (top < 0) top = y; bottom = y; break; }
    }
  }
  return top < 0 ? 0 : (bottom - top + 1) / (window.devicePixelRatio || 1);
};

(async () => {
  const bundle = await esbuild.build({
    entryPoints: [path.join(root, 'asesor/lab/paper/inspector-entry.js')], bundle: true, write: false,
    format: 'iife', globalName: 'GGPaper', target: 'es2019', logLevel: 'silent'
  });
  const code = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#F4F1F6;overflow:hidden}#stage{width:100%;height:100%}</style><div id="stage"></div><script>${code}</script><script>window.inspector = GGPaper.createInspector(document.getElementById('stage'));</script>`;
  fs.mkdirSync(out, { recursive: true });
  await acquire();
  const browser = await chromium.launch({ headless: true, args: browserArgs });
  const report = { date: new Date().toISOString(), renderer: gpu ? 'gpu-angle-gl' : 'swiftshader', images: [], errors: [] };
  for (const dpr of dprs) {
    const page = await browser.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: dpr });
    page.on('pageerror', e => report.errors.push(e.message));
    await page.setContent(html);
    await page.waitForFunction(() => window.inspector);
    // The inspector's own toolbar would cover small renders: hide every overlay but the canvas.
    await page.addStyleTag({ content: '#stage > :not(canvas){display:none!important}' });
    for (const id of pieces) for (const view of views) {
      await page.setViewportSize({ width: 600, height: 600 });
      await page.evaluate(([id, view]) => inspector.show(id, { view }), [id, view]);
      const ref = await page.evaluate(MEASURE);
      for (const size of sizes) {
        const side = Math.max(24, Math.round(600 * size / ref));
        await page.setViewportSize({ width: side, height: side });
        await page.evaluate(() => inspector.render());
        const measured = await page.evaluate(MEASURE);
        const name = `${id}-${view}-${size}px-dpr${dpr}.png`, file = path.join(out, name);
        await page.screenshot({ path: file });
        report.images.push({ file: name, piece: id, view, target: size, dpr, viewport: side, measuredCss: +measured.toFixed(1), sha256: sha(file) });
      }
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  const off = report.images.filter(i => Math.abs(i.measuredCss - i.target) > Math.max(2, i.target * .06));
  console.log(JSON.stringify({ out, images: report.images.length, offTarget: off.map(i => `${i.file} ${i.measuredCss}`), errors: report.errors.length }));
  process.exit(report.errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
