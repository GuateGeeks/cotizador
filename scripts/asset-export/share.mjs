#!/usr/bin/env node
// Builds the shareable page into web/share-dist: the page, one bundled script, and every published model
// decompressed and packed as base64 text (the artifact host serves neither .glb nor data: fetches).
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const web = resolve(import.meta.dirname, '../../web');
const out = resolve(web, 'share-dist');
const models = resolve(web, 'public/models');
const scratch = resolve(out, '.glb');
rmSync(out, { recursive: true, force: true });
mkdirSync(resolve(out, 'packed'), { recursive: true });
mkdirSync(scratch, { recursive: true });

let bytes = 0;
for (const name of readdirSync(models).filter(file => file.endsWith('.glb'))) {
  const plain = resolve(scratch, name);
  execFileSync(resolve(web, 'node_modules/.bin/gltfpack'), ['-i', resolve(models, name), '-o', plain, '-kn', '-km', '-ke', '-noq'], { stdio: 'pipe' });
  const text = readFileSync(plain).toString('base64');
  writeFileSync(resolve(out, 'packed', name.replace(/\.glb$/, '.txt')), text);
  bytes += text.length;
}
rmSync(scratch, { recursive: true });
execFileSync(resolve(web, 'node_modules/.bin/esbuild'), [resolve(web, 'share/entry.js'), '--bundle', '--format=esm', '--minify', '--target=es2020', `--outfile=${resolve(out, 'world.js')}`], { stdio: 'pipe' });
copyFileSync(resolve(web, 'share/guategeeks-world.html'), resolve(out, 'guategeeks-world.html'));
console.log(`share-dist: ${readdirSync(resolve(out, 'packed')).length} models, ${(bytes / 1e6).toFixed(1)} MB packed`);
