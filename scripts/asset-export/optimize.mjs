#!/usr/bin/env node
// Compresses a run's GLBs with meshopt into web/public/models, keeping node, material and animation names.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const [run] = process.argv.slice(2);
if (!run) { console.error('usage: optimize.mjs <run-dir>'); process.exit(1); }
const out = resolve('web/public/models');
mkdirSync(out, { recursive: true });
const tool = resolve('web/node_modules/.bin/gltfpack');
let before = 0, after = 0;
for (const name of readdirSync(run).filter(file => file.endsWith('.glb'))) {
  const source = resolve(run, name), target = resolve(out, name);
  try {
    execFileSync(tool, ['-i', source, '-o', target, '-cc', '-kn', '-km', '-ke', '-noq'], { stdio: 'pipe' });
  } catch {
    copyFileSync(source, target);
    console.warn('copied uncompressed:', name);
  }
  before += statSync(source).size;
  after += statSync(target).size;
}
console.log(`${(before / 1e6).toFixed(2)} MB -> ${(after / 1e6).toFixed(2)} MB`);
