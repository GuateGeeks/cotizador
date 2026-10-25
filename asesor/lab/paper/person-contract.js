/**
 * Generates docs/papercraft/personajes/ALUMNO-PRIMARIA.md from the code: the component
 * registry, the recipe parameters, the plan and the faces really emitted by the
 * primaria base student. Dev only (tools/people-contract.mjs and the sync test).
 */
import { createBuilder } from '../campus-kit.js';
import { addPaperPerson, PRIMARIA_BASE, COMPONENTS, componentParams, GEOMETRY_CAP, RESERVE, SHADOW_TRIANGLES } from './pieces-people.js';

const f = (x, d = 4) => (Math.round(x * 10 ** d) / 10 ** d).toString();
const fmtParam = v => Array.isArray(v) ? '[' + v.map(fmtParam).join(', ') + ']' : typeof v === 'number' ? f(v) : String(v);

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
  const total = g.userData.triangles;
  g.userData.skeleton?.dispose();
  return { person, H, minY: Math.min(...ys), head: Math.max(...ys) - person.landmarks.chin, shoulders: Math.max(...torsoX) - Math.min(...torsoX),
    shoeLength: Math.max(...shoeZ) - Math.min(...shoeZ), total, geometry: Object.values(person.parts).reduce((s, n) => s + n, 0) };
}

export function alumnoContract() {
  const m = measureBase(), p = m.person, L = p.landmarks, K = componentParams(p.profile), H = p.profile.H;
  const out = [];
  out.push('# Alumno de primaria: contrato y componentes', '',
    '> Documento **generado** por `node tools/people-contract.mjs` a partir de `asesor/lab/paper/pieces-people.js`',
    '> (`PRIMARIA_BASE`, `COMPONENTS`, `componentParams`, `planPerson`, `personLandmarks`) y de las caras que el generador',
    '> emite de verdad. No se edita a mano: `asesor/test/people-contract.test.js` falla si el código y este archivo divergen.', '',
    'Alcance: solo el alumno base de primaria (cabello corto, camisa blanca de manga corta, chaleco violeta, pantalón',
    'azul marino, zapatos oscuros, mochila turquesa). Falda, otros peinados y otros niveles siguen con la receta v1',
    '(geometría idéntica a `ec4d112`); la cabeza v2 se aplica a todo alumno de primaria con cabello corto, para que la ropa',
    'no cambie la cabeza.', '');
  out.push('## Configuración reproducible', '', '```json', JSON.stringify(PRIMARIA_BASE, null, 2), '```', '',
    'Pose de referencia `rest` (de pie, `POSES.stand`). Las demás poses del inspector: `walk-0…3`, `sit`, `work`, `point`, `hand`, `vr`.', '');
  out.push('## Contrato global', '',
    '- Ejes: Y arriba, +Z frente, X lateral (la izquierda del personaje es +X). Unidades de escena; el suelo es y = 0.',
    '- Capas superpuestas: separación normal ≥ 0.004 (se emite 0.0045). Paneles que comparten arista no la necesitan.',
    '- Un hueso por vértice y por panel rígido; 12 huesos (`hips`, `torso`, `head`, `armL/R`, `foreL/R`, `legL/R`, `shinL/R`) bajo la raíz.',
    `- Presupuesto: geometría ≤ ${GEOMETRY_CAP.student} (${GEOMETRY_CAP.student + RESERVE} con la reserva de planificación de ${RESERVE}, que no se emite); sombra de contacto auxiliar de ${SHADOW_TRIANGLES} triángulos en la capa \`blob\`; total ≤ 280.`, '');
  out.push('| Medida | Objetivo | Medido en la geometría |', '|---|---:|---:|',
    `| Altura H (suela a cima del cabello) | 0.78 | ${f(m.H)} |`,
    `| Cabeza (mentón a cima) / H | 0.28 | ${f(m.head / m.H, 3)} |`,
    `| Ancho de hombros del torso / H | 0.26 | ${f(m.shoulders / m.H, 3)} |`,
    `| Largo del zapato / H | ≈ 0.145 | ${f(m.shoeLength / m.H, 3)} |`,
    `| Punto más bajo | 0 | ${f(m.minY)} |`, '');
  out.push('### Puntos de referencia (de pie)', '', '| Punto | y | y / H | Uso |', '|---|---:|---:|---|');
  const uses = { sole: 'suela', ankle: 'tobillo: entrada del zapato en el pantalón', knee: 'rodilla: hueso shin', hip: 'cadera: huesos hips y leg', shoulder: 'hombro: hueso arm', elbow: 'codo: hueso fore', wrist: 'muñeca', neckBase: 'base del cuello: hueso head', chin: 'mentón', top: 'cima del cabello' };
  for (const k of ['sole', 'ankle', 'knee', 'hip', 'wrist', 'elbow', 'shoulder', 'neckBase', 'chin', 'top']) out.push(`| ${k} | ${f(L[k])} | ${f(L[k] / H, 3)} | ${uses[k]} |`);
  out.push('', `Hombro en x = ±${f(L.shoulderX)}; piernas en x = ±${f(L.legX)}; medio ancho de hombros del torso ${f(L.halfShoulders)}.`, '');
  out.push('## Componentes', '', `Total emitido: **${m.geometry}** de geometría + ${SHADOW_TRIANGLES} de sombra = **${m.total}** (plan con reserva: ${m.geometry + RESERVE}). Mejoras tomadas por el plan: ${Object.keys(p.plan.rich).join(', ')}.`, '',
    '| Componente | Papel | Huesos | Receta | Plan | Emitidos |', '|---|---|---|---|---:|---:|');
  for (const c of p.components) {
    const reg = COMPONENTS.find(x => x.id === c.id);
    out.push(`| \`${c.id}\` | ${reg.label} | ${Object.entries(c.perBone).map(([bn, n]) => `${bn} ${n}`).join(', ')} | ${c.recipe} | ${c.planned} | ${c.triangles} |`);
  }
  out.push('');
  for (const c of p.components) {
    const reg = COMPONENTS.find(x => x.id === c.id), params = K[c.id];
    out.push(`### \`${c.id}\` · ${reg.label}`, '',
      `- **Papel:** ${reg.role}.`, `- **Origen y ejes:** ${reg.frame}.`, `- **Montaje:** ${reg.attach}.`, `- **Hueso(s):** ${reg.bones.join(', ')}.`,
      `- **Topología:** ${reg.topology}. Triángulos emitidos: **${c.triangles}** (receta ${c.recipe}).`,
      `- **Solapes y encuentros:** ${reg.overlaps}.`, `- **Revisión:** ${reg.review}.`);
    if (params) out.push(`- **Parámetros:** ${Object.entries(params).map(([k, v]) => `\`${k}\` ${fmtParam(v)}`).join('; ')}.`);
    out.push('');
  }
  out.push('## Revisar y reproducir', '',
    '```bash',
    'npm run build:inspector      # y abrir asesor/lab/inspector.html con `npm run serve` (panel «Alumno de primaria»)',
    'npm run check:people -- artifacts/paper/<run-nuevo>',
    'PLAYWRIGHT_MODULE=… node tools/alumno-shot.cjs artifacts/paper/<run-nuevo> --views char-front,char-side,char-back,char-34,campus --heights 600',
    'node tools/people-contract.mjs   # regenera este documento',
    '```', '',
    'En el inspector, `inspector.showPerson({ pose, view, only: [ids] })` aísla componentes y `inspector.setWire(true)` muestra las aristas.', '');
  return out.join('\n');
}
