#!/usr/bin/env node
// Regenerates docs/papercraft/personajes/ALUMNO-PRIMARIA.md from the code (component
// registry, parameters, plan and emitted faces of the primaria base student).
//   node tools/people-contract.mjs [--check]   (--check: exit 1 if the file is out of date)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alumnoContract } from '../asesor/lab/paper/person-contract.js';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/papercraft/personajes/ALUMNO-PRIMARIA.md');
const text = alumnoContract();
if (process.argv.includes('--check')) {
  const same = fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text;
  console.log(same ? 'ALUMNO-PRIMARIA.md al día' : 'ALUMNO-PRIMARIA.md desactualizado: node tools/people-contract.mjs');
  process.exit(same ? 0 : 1);
}
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, text);
console.log(file);
