// Requires `npm run share`. Serves the shareable page under the artifact frame's fetch rules and checks
// that every model loads: the frame only allows fetch() to its own host, never data: or blob: URLs.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../share-dist');
const out = process.argv[2] || '../runs/web-share';
mkdirSync(out, { recursive: true });
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com";
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.txt': 'text/plain' };
// The host wraps the page in a document skeleton with this reset; the local server does the same.
const SKELETON = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>';
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '') || 'guategeeks-world.html';
  try {
    let body = readFileSync(join(root, path));
    if (path.endsWith('.html')) body = SKELETON + body + '</body></html>';
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream', 'Content-Security-Policy': CSP });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(4420, '127.0.0.1');

const gpu = process.env.GG_GPU === '1';
const browser = await chromium.launch({ args: gpu ? ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const failures = [];
for (const [width, height, name] of [[1280, 800, 'desktop'], [400, 820, 'phone']]) {
  const page = await browser.newPage({ viewport: { width, height } });
  const problems = [];
  page.on('pageerror', e => problems.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') problems.push(m.text().slice(0, 160)); });
  await page.goto('http://127.0.0.1:4420/');
  await page.waitForFunction(() => { const d = window.world?.getDiagnostics(); return d?.ready && d.loaded > 0 && d.pendingLoads === 0 && d.transitionsActive === 0; }, null, { timeout: 90000 }).catch(() => failures.push(`${name}: campus never settled`));
  const d = await page.evaluate(() => window.world.getDiagnostics());
  if (d.errors.length) failures.push(`${name}: ${d.errors.length} load errors, first: ${String(d.errors[0]).slice(0, 160)}`);
  if (d.characters.length < 6) failures.push(`${name}: ${d.characters.length} characters`);
  if (problems.length) failures.push(`${name}: ${problems[0]}`);
  if (!(await page.evaluate(() => document.querySelector('#status').hidden))) failures.push(`${name}: loading label still shown`);
  await page.screenshot({ path: `${out}/share-${name}.png` });
  await page.close();
}
await browser.close();
server.close();
console.log(failures.length ? `FAIL\n${failures.join('\n')}` : 'PASS');
process.exit(failures.length ? 1 : 0);
