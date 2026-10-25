#!/usr/bin/env node
// Reproducible captures of one person (default: the primaria base student, PRIMARIA_BASE)
// with the inspector's character mode. Same camera, light, frame and scale for every run,
// so a "before" run and an "after" run compare geometry only.
//   node tools/alumno-shot.cjs <new-folder> [--views char-front,char-side,char-back,char-34,campus]
//        [--poses rest,walk-1,sit,work,hand] [--heights 80,120,600] [--dpr 1,2] [--wire]
//        [--components each|recipes|id,id] [--component-views char-34,back] [--steps char-34,char-front] [--sockets] [--gpu]
// Scale: a vertical segment of H at the person's origin measures exactly N CSS px
// (projected with the camera, via the view zoom), independent of the geometry. The ortho frame is a
// fixed box around the person, so framing does not follow the silhouette either.
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
const option = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
if (!out) { console.error('Uso: alumno-shot.cjs <carpeta-nueva> [--views …] [--poses …] [--heights 80,120,600] [--dpr 1,2] [--wire] [--components each]'); process.exit(2); }
if (fs.existsSync(out) && fs.readdirSync(out).length) { console.error(`${out} ya tiene evidencia: usa una carpeta nueva por corrida.`); process.exit(2); }
const views = option('views', 'char-front,char-side,char-back,char-34,campus').split(',');
const poses = option('poses', 'rest').split(',');
const heights = option('heights', '600').split(',').map(Number);
const dprs = option('dpr', '1').split(',').map(Number);
const components = option('components', '');
const componentViews = option('component-views', 'char-34,back').split(',');
const steps = option('steps', '');
const wire = args.includes('--wire');
const socketsFlag = args.includes('--sockets');
const gpu = args.includes('--gpu');
const H = .78; // primaria reference height (FICHAS-TECNICAS §3)
const FRAME = [-.34, 0, -.34, .34, .84, .34]; // fixed ortho frame around the person
const browserArgs = gpu ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=gl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git = cmd => { try { return execSync(cmd, { cwd: root }).toString().trim(); } catch (_) { return null; } };

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
  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#F4F1F6;overflow:hidden}#stage{width:100%;height:100%}#stage > :not(canvas){display:none!important}</style><div id="stage"></div><script>${code}</script><script>window.inspector = GGPaper.createInspector(document.getElementById('stage'));</script>`;
  fs.mkdirSync(out, { recursive: true });
  await acquire();
  const browser = await chromium.launch({ headless: true, args: browserArgs });
  const report = {
    date: new Date().toISOString(), commit: git('git rev-parse --short HEAD'), dirty: !!git('git status --porcelain -- asesor'),
    renderer: gpu ? 'gpu-angle-gl' : 'swiftshader', frame: FRAME, H, wire,
    conditions: 'inspector: HemisphereLight 1.55, sol 2.1 (−6, 11, 8) con sombra PCF, relleno 0.45, NeutralToneMapping, material paperMaterial (roughness 0.92, flatShading); fondo #F4F1F6',
    images: [], errors: []
  };
  for (const dpr of dprs) {
    const page = await browser.newPage({ viewport: { width: 600, height: 600 }, deviceScaleFactor: dpr });
    page.on('pageerror', e => report.errors.push(e.message));
    await page.setContent(html);
    await page.waitForFunction(() => window.inspector);
    const spec = await page.evaluate(() => GGPaper.PRIMARIA_BASE || null);
    if (socketsFlag) await page.evaluate(() => inspector.setSockets(true));
    report.spec = spec;
    const shoot = async (name, opts, target) => {
      // Fixed viewport per target height; the zoom makes a vertical segment of H at the
      // origin measure exactly `target` CSS px. Nothing here depends on the geometry.
      const side = Math.max(240, Math.round(target * 1.3));
      await page.setViewportSize({ width: side, height: side });
      await page.evaluate(o => inspector.showPerson(o), opts);
      const unit = await page.evaluate(h => inspector.projectedDistance([0, 0, 0], [0, h, 0]), H);
      const zoom = target / unit;
      const info = await page.evaluate(o => inspector.showPerson(o), { ...opts, zoom });
      if (wire) await page.evaluate(() => inspector.setWire(true));
      const check = await page.evaluate(h => inspector.projectedDistance([0, 0, 0], [0, h, 0]), H);
      const file = path.join(out, name);
      await page.screenshot({ path: file });
      report.images.push({ file: name, ...opts, target, measuredH: +check.toFixed(1), zoom: +zoom.toFixed(4), dpr, viewport: side, triangles: info.triangles, render: info.render, components: info.components, sha256: sha(file) });
      if (info.error) report.errors.push(`${name}: ${info.error.split('\n')[0]}`);
    };
    for (const pose of poses) for (const view of views) for (const h of heights)
      await shoot(`${pose}-${view}-${h}px-dpr${dpr}.png`, { pose, view, frame: FRAME }, h);
    if (components && dpr === dprs[0]) {
      const all = await page.evaluate(() => (inspector.showPerson({}).components || []).filter(c => c.triangles > 0).map(c => c.id));
      const recipes = [...new Set(all.filter(c => /^P\d\d/.test(c)).map(c => c.slice(0, 3)))];
      const ids = components === 'each' ? all : components === 'recipes' ? recipes : components.split(',');
      for (const id of ids) for (const view of componentViews) {
        // Isolated: auto frame on the component itself (its geometry alone), 600 px viewport.
        await page.setViewportSize({ width: 600, height: 600 });
        const info = await page.evaluate(o => inspector.showPerson(o), { pose: 'rest', view, only: [id] });
        if (wire) await page.evaluate(() => inspector.setWire(true));
        const name = `pieza-${id}-${view}.png`, file = path.join(out, name);
        await page.screenshot({ path: file });
        report.images.push({ file: name, isolated: id, view, triangles: info.triangles, sha256: sha(file) });
      }
    }
    if (steps && dpr === dprs[0]) {
      // Assembly steps of MONTAJE §5 (A–F), cumulative, mounted on the rig in rest pose.
      const STEPS = [['A', ['P15', 'P16', 'P17', 'P18']], ['B', ['P08', 'P09', 'P10']], ['C', ['P11', 'P12', 'P13', 'P14']], ['D', ['P02', 'P01', 'P03', 'P04', 'P05']], ['E', ['P06', 'P07']], ['F', ['P19', 'P20']]];
      let acc = [];
      for (const [name, ids] of STEPS) {
        acc = acc.concat(ids);
        for (const view of steps.split(',')) {
          await page.setViewportSize({ width: 600, height: 600 });
          const info = await page.evaluate(o => inspector.showPerson(o), { pose: 'rest', view, only: acc, frame: FRAME });
          if (wire) await page.evaluate(() => inspector.setWire(true));
          const file = `paso-${name}-${view}.png`;
          await page.screenshot({ path: path.join(out, file) });
          report.images.push({ file, step: name, only: [...acc], view, triangles: info.triangles, sha256: sha(path.join(out, file)) });
        }
      }
    }
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ out, images: report.images.length, errors: report.errors }));
  process.exit(report.errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
