/**
 * Generates docs/papercraft/personajes/ALUMNO-PRIMARIA.md from the code: the R2 data module
 * (recipes, instances, rig, landmarks, provenance), the documented redistribution and the
 * faces the builder really emits for the primaria base student. Dev only
 * (tools/people-contract.mjs and the sync test).
 */
import { createBuilder } from '../campus-kit.js';
import { addPaperPerson, PRIMARIA_BASE, SHADOW_TRIANGLES, PERSON_LIMIT } from './pieces-people.js';
import { R2_RECIPES, R2_INSTANCES, R2_RIG_H, R2_LANDMARKS_H, R2_PROVENANCE, R2_REDISTRIBUTION, R2_ADAPTATIONS, R2_FACTS, r2Rig } from './r2/person-r2.js';

const f = (x, d = 4) => (Math.round(x * 10 ** d) / 10 ** d).toString();
const vec = (v, d = 4) => `(${v.map(x => f(x, d)).join(', ')})`;

/** Build the base student and measure it on its emitted geometry (rest pose = bind pose). */
export function measureBase(spec = PRIMARIA_BASE) {
  const b = createBuilder(); b.base('solid');
  const person = addPaperPerson(b, { ...spec, id: 'b' });
  const g = b.finish({});
  const bones = g.userData.rig.bones, tris = [];
  g.traverse(m => {
    if (!m.isMesh || m.name === 'blob') return;
    const pos = m.geometry.getAttribute('position'), skin = m.geometry.getAttribute('skinIndex'), idx = m.geometry.index;
    for (let i = 0; i < idx.count; i += 3) {
      const ids = [0, 1, 2].map(k => idx.getX(i + k));
      tris.push({ v: ids.map(j => [pos.getX(j), pos.getY(j), pos.getZ(j)]), bone: bones[skin.getX(ids[0])].name });
    }
  });
  const ys = tris.flatMap(t => t.v.map(p => p[1]));
  const torsoX = tris.filter(t => t.bone === 'b.torso').flatMap(t => t.v.map(p => p[0]));
  const shoeZ = tris.filter(t => t.bone === 'b.shinL').flatMap(t => t.v.map(p => p[1] < person.landmarks.ankle + .02 ? p[2] : null)).filter(z => z != null);
  const H = Math.max(...ys) - Math.min(...ys);
  const world = {};
  g.userData.rig.root.updateMatrixWorld(true);
  for (const bone of bones) if (bone.name.startsWith('b.')) world[bone.name.slice(2)] = bone.matrixWorld.elements.slice(12, 15);
  const total = g.userData.triangles;
  g.userData.skeleton?.dispose();
  return { person, H, minY: Math.min(...ys), head: Math.max(...ys) - person.landmarks.chin, shoulders: Math.max(...torsoX) - Math.min(...torsoX),
    shoeLength: Math.max(...shoeZ) - Math.min(...shoeZ), total, geometry: Object.values(person.parts).reduce((s, n) => s + n, 0), world };
}

export function alumnoContract() {
  const m = measureBase(), p = m.person, H = p.scale, rel = r2Rig(H);
  const out = [];
  out.push('# Alumno de primaria R2: contrato y componentes', '',
    '> Documento **generado** por `node tools/people-contract.mjs` a partir del módulo de datos R2',
    '> (`asesor/lab/paper/r2/primaria-r2-data.js`, generado a su vez desde los JSON del paquete por `node tools/r2-import.mjs`),',
    '> de `asesor/lab/paper/r2/person-r2.js` y de las caras que el builder emite de verdad. No se edita a mano:',
    '> `asesor/test/people-contract.test.js` falla si código, datos y documento divergen.', '',
    'Alcance: el alumno base de primaria con cabello corto, pantalón y mochila se construye completo con el paquete R2.',
    'Todo alumno de primaria con cabello corto usa la cabeza R2 (P01–P07), también con falda, para que la ropa no cambie la cabeza.',
    'Las demás combinaciones conservan la receta v1 (geometría idéntica a `ec4d112`).', '');
  out.push('## Procedencia', '', `Paquete \`${R2_PROVENANCE.package}\` (${R2_PROVENANCE.manifest}), montaje \`${R2_PROVENANCE.assembly}\`, esquema ${R2_PROVENANCE.schema}.`,
    `${R2_FACTS.recipes} recetas, ${R2_FACTS.instances} instancias, ${R2_FACTS.packageTriangles} triángulos en el paquete. Los datos se **cargan** de los JSON (importados a un módulo generado), no se transcriben a mano.`, '',
    ...(R2_FACTS.r3.length ? [`Recreaciones R3 activas (\`docs/papercraft/construction-r3/datos\`, mismo esquema): ${Object.entries(R2_PROVENANCE.r3).map(([id, o]) => `${id} (${o.replacedTriangles} → ${o.triangles} triángulos)`).join(', ')}. El paquete R2 sin ellas suma ${R2_FACTS.r2PackageTriangles}.`, ''] : []),
    '| Archivo | SHA256 |', '|---|---|');
  for (const [file, hash] of Object.entries(R2_PROVENANCE.sha256)) out.push(`| \`${file}\` | \`${hash}\` |`);
  out.push('', '## Configuración reproducible', '', '```json', JSON.stringify(PRIMARIA_BASE, null, 2), '```', '',
    'La piel, el cabello, el chaleco, la mochila y los zapatos del paquete se recolorean a los de la configuración conservando el matiz relativo de cada cara; camisa y pantalón usan los colores del paquete. Los hex son sRGB y el builder los convierte una sola vez a lineal (`THREE.Color`).', '');
  out.push('## Contrato global', '',
    '- Ejes: +Y arriba, +Z frente, +X izquierda anatómica. Suelo y = 0. Datos normalizados por H; H = 0.78 se aplica una sola vez.',
    '- Transformación de instancia (MONTAJE §2): `M = T(position) · Rz · Ry · Rx · diag(sx·(mirror ? −1 : 1), sy, sz)`, grados. El builder recibe vértices locales al hueso activo: `H · (M·v − pivote_raíz(hueso))`. Las instancias reflejadas invierten el orden de cada triángulo una vez.',
    '- Un hueso por instancia y por vértice (peso 1); 12 huesos con los nombres y padres del proyecto.',
    '- Capas designadas (ojos, sonrisa, pechera, solapas, tirantes): separación normal ≥ 0.004. Solapes ocultos de articulación (rodilla P16/P17, muñeca P13/P14) se informan aparte en el manifiesto.', '');
  out.push('| Medida | Objetivo | Medido en la geometría |', '|---|---:|---:|',
    `| H (suela a cima del cabello) | 0.78 | ${f(m.H)} |`,
    `| Cabeza (mentón a cima) / H | ${R2_LANDMARKS_H.head_with_hair_height} | ${f(m.head / m.H, 3)} |`,
    `| Ancho de hombros del torso / H | ${R2_LANDMARKS_H.torso_shoulder_width} | ${f(m.shoulders / m.H, 3)} |`,
    `| Largo del zapato / H | — | ${f(m.shoeLength / m.H, 3)} |`,
    `| Punto más bajo | 0 | ${f(m.minY)} |`, '');
  out.push('### Puntos de referencia (`landmarks_H`)', '', '| Punto | H | Escena |', '|---|---:|---:|');
  for (const [k, v] of Object.entries(R2_LANDMARKS_H)) out.push(`| ${k} | ${v} | ${f(v * H)} |`);
  out.push('', '### Rig', '', '| Hueso | Padre | Pivote raíz de reposo / H | Relativo al padre (escena) | Medido en el builder |', '|---|---|---|---|---|');
  for (const [k, b] of Object.entries(R2_RIG_H)) if (k !== 'root') out.push(`| ${k} | ${b.parent} | ${vec(b.at, 3)} | ${vec(rel[k])} | ${vec(m.world[k])} |`);
  const removed = Object.entries(R2_REDISTRIBUTION).reduce((s, [r, x]) => s + x.faces.length * R2_INSTANCES.filter(i => i.recipe === r).length, 0);
  out.push('', '## Presupuesto', '',
    `- Paquete: ${R2_FACTS.packageTriangles} triángulos, sin reserva. El proyecto cuenta la sombra de contacto (${SHADOW_TRIANGLES}, capa \`blob\`, auxiliar) en el límite, así que se **redistribuye**: se retiran ${removed} tapas ocultas. Límite del alumno con las recetas R3: ${PERSON_LIMIT.r3Student} (el resto de estudiantes, ${PERSON_LIMIT.student}).`,
    `- Emitido: **${m.geometry}** de geometría + ${SHADOW_TRIANGLES} de sombra = **${m.total}** ${m.total <= PERSON_LIMIT.r3Student ? '≤ ' + PERSON_LIMIT.r3Student : '> ' + PERSON_LIMIT.r3Student + ': **excede** el límite'}. Reserva: 0 (no es geometría).`, '',
    '| Receta | Caras retiradas (índice en el JSON) | Motivo |', '|---|---|---|');
  for (const [r, x] of Object.entries(R2_REDISTRIBUTION)) out.push(`| ${r} | ${x.faces.join(', ')} | ${x.reason} |`);
  out.push('', '### Adaptaciones de integración (solo posiciones de vértices)', '', '| Receta | Vértices (local / H) | Motivo |', '|---|---|---|');
  for (const [r, x] of Object.entries(R2_ADAPTATIONS)) out.push(`| ${r} | ${Object.entries(x.vertices).map(([k, v]) => `${k} → ${vec(v)}`).join('; ')} | ${x.reason} |`);
  out.push('', '## Instancias', '', '| # | Instancia | Receta | Hueso | Reflejo | Posición / H | Rotación (°) | Paquete | Emitidos | Rango (triángulos) |', '|---:|---|---|---|---|---|---|---:|---:|---|');
  for (const i of R2_INSTANCES) {
    const c = p.components.find(x => x.id === i.id);
    out.push(`| ${i.order} | \`${i.id}\` | ${i.recipe} · ${R2_RECIPES[i.recipe].name} | ${i.bone} | ${i.mirror ? 'sí' : 'no'} | ${vec(i.position)} | ${vec(i.rotation, 1)} | ${R2_RECIPES[i.recipe].faces.length} | ${c ? c.triangles : 0} | ${c ? c.ranges.map(r => r.join('–')).join(', ') : '—'} |`);
  }
  out.push('', '## Recetas', '');
  for (const r of Object.values(R2_RECIPES)) {
    out.push(`### ${r.id} · ${r.name}`, '', `- **Papel:** ${r.purpose}`, `- **Construcción:** ${r.construction} Superficie: \`${r.kind}\`; ${r.faces.length} triángulos, ${r.vertices.length} vértices; color base ${r.base}.`,
      `- **Instancias:** ${R2_INSTANCES.filter(i => i.recipe === r.id).map(i => `\`${i.id}\` (${i.bone})`).join(', ')}.`,
      `- **Sockets:** ${Object.keys(r.sockets).join(', ')}.`);
    if (r.limitations.length) out.push(`- **Límites:** ${r.limitations.join(' ')}`);
    if (R2_REDISTRIBUTION[r.id]) out.push(`- **Redistribución:** sin las caras ${R2_REDISTRIBUTION[r.id].faces.join(', ')}.`);
    if (R2_ADAPTATIONS[r.id]) out.push(`- **Adaptación:** ${R2_ADAPTATIONS[r.id].reason}.`);
    out.push('');
  }
  out.push('## Revisar y reproducir', '', '```bash',
    'npm run build:inspector      # y abrir asesor/lab/inspector.html con `npm run serve` (panel «Alumno de primaria»)',
    'npm run check:people -- artifacts/paper/<run-nuevo>',
    'PLAYWRIGHT_MODULE=… node tools/alumno-shot.cjs artifacts/paper/<run-nuevo> --views char-front,char-side,char-back,char-34,campus --heights 600',
    'node tools/r2-import.mjs        # regenera el módulo de datos desde el paquete',
    'node tools/people-contract.mjs   # regenera este documento', '```', '',
    'En el inspector, `inspector.showPerson({ pose, view, only: [\'P03\' | \'P03-L\' | …] })` aísla recetas o instancias, `setWire(true)` muestra las aristas y `setSockets(true)` los ejes y puntos de unión.', '');
  return out.join('\n');
}
