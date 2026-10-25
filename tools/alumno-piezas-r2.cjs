#!/usr/bin/env node
// Per-piece captures for the R2 piece sheets (docs/papercraft/construction-r2/imagenes/Pxx-*.png):
// each instance alone in the seven sheet views (part-front, part-back, part-left, part-right,
// part-top, part-bottom, part-34), plus the "Ubicación" cell: the whole student and the instance
// alone, both in the same fixed frame, so tools/alumno-piezas-r2.py can overlay them.
//   node tools/alumno-piezas-r2.cjs <new-folder> [--only P01,P03-L] [--gpu]
// PLAYWRIGHT_MODULE may point to an installed Playwright package.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');
const esbuild = require('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const option = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
if (!out) { console.error('Uso: alumno-piezas-r2.cjs <carpeta-nueva> [--only P01,P03-L] [--gpu]'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva por corrida.`); process.exit(2); }
const gpu = args.includes('--gpu');
const VIEWS = ['part-front', 'part-back', 'part-left', 'part-right', 'part-top', 'part-bottom', 'part-34'];
const FRAME = [-.34, 0, -.34, .34, .84, .34]; // same fixed frame as tools/alumno-shot.cjs
const browserArgs = gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git = cmd => { try { return execSync(cmd, { cwd: root }).toString().trim(); } catch (_) { return null; } };

(async () => {
  const bundle = await esbuild.build({
    entryPoints: [path.join(root, 'asesor/lab/paper/inspector-entry.js')], bundle: true, write: false,
    format: 'iife', globalName: 'GGPaper', target: 'es2019', logLevel: 'silent'
  });
  const code = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#F4F1F6;overflow:hidden}#stage{width:100%;height:100%}#stage > :not(canvas){display:none!important}</style><div id="stage"></div><script>${code}</script><script>window.inspector = GGPaper.createInspector(document.getElementById('stage'));</script>`;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: browserArgs });
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
  const report = { date: new Date().toISOString(), commit: git('git rev-parse --short HEAD'), renderer: gpu ? 'gpu-angle-gl' : 'swiftshader', views: VIEWS, frame: FRAME, images: [], errors: [] };
  page.on('pageerror', e => report.errors.push(e.message));
  await page.setContent(html);
  await page.waitForFunction(() => window.inspector);
  const all = await page.evaluate(() => (inspector.showPerson({}).components || []).filter(c => c.triangles > 0).map(c => ({ id: c.id, bone: c.bone || c.bones, triangles: c.triangles })));
  const wanted = option('only') ? option('only').split(',') : null;
  const instances = all.filter(c => /^P\d\d/.test(c.id) && (!wanted || wanted.some(w => c.id === w || c.id.startsWith(w + '-') || c.id === w)));
  const shot = async (name, opts) => {
    const info = await page.evaluate(o => inspector.showPerson(o), opts);
    const file = path.join(out, name);
    await page.screenshot({ path: file });
    report.images.push({ file: name, ...opts, triangles: info.triangles, sha256: sha(file) });
    if (info.error) report.errors.push(`${name}: ${info.error.split('\n')[0]}`);
  };
  // Placement base: the whole student in the fixed frame, three-quarter view, at 1600 px so small
  // pieces stay sharp when the composer crops around them.
  const PLACE = 1600;
  await page.setViewportSize({ width: PLACE, height: PLACE });
  await shot('ubicacion-completo.png', { pose: 'rest', view: 'char-34', frame: FRAME });
  await page.setViewportSize({ width: 600, height: 600 });
  for (const c of instances) {
    // One cube frame per instance (centred on its bounds): the seven views share one scale, like the sheets.
    const box = await page.evaluate(id => inspector.showPerson({ pose: 'rest', only: [id] }).box, c.id);
    const mid = [0, 1, 2].map(k => (box[k] + box[k + 3]) / 2), half = Math.max(...[0, 1, 2].map(k => box[k + 3] - box[k])) * .58;
    const cube = [...mid.map(v => v - half), ...mid.map(v => v + half)];
    c.box = box;
    for (const view of VIEWS) await shot(`${c.id}-${view}.png`, { pose: 'rest', view, only: [c.id], frame: cube });
    await page.setViewportSize({ width: PLACE, height: PLACE });
    await shot(`${c.id}-ubicacion.png`, { pose: 'rest', view: 'char-34', only: [c.id], frame: FRAME });
    await page.setViewportSize({ width: 600, height: 600 });
  }
  report.instances = instances;
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify({ out, instances: instances.length, images: report.images.length, errors: report.errors.length }));
})().catch(e => { console.error(e); process.exit(1); });
