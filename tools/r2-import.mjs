#!/usr/bin/env node
// Imports the primaria R2 package (docs/papercraft/construction-r2/datos) into a runtime
// data module, asesor/lab/paper/r2/primaria-r2-data.js: recipes P01–P20 (vertices, faces,
// face colours, sockets, surface kind), the 33 instances of assembly.json, the rig,
// landmarks and budget, plus the SHA256 of every JSON read. The package stays the single
// source: the module is generated, never edited, and asesor/test/primaria-r2.test.js fails
// if it drifts from the JSON.
//   node tools/r2-import.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { r2DataModule } from '../asesor/lab/paper/r2/import.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'asesor/lab/paper/r2/primaria-r2-data.js');
const text = r2DataModule(path.join(root, 'docs/papercraft/construction-r2'));
if (process.argv.includes('--check')) {
  const same = fs.existsSync(out) && fs.readFileSync(out, 'utf8') === text;
  console.log(same ? 'primaria-r2-data.js al día' : 'primaria-r2-data.js desactualizado: node tools/r2-import.mjs');
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(out, text);
console.log(out);
