// Same input and output shape as the cotizador's normalizeCampusData; pinned by test/fixtures/normalize.json.
export const LEVEL_IDS = Object.freeze(['pre', 'prim', 'bas', 'bach']);
export const PROGRAM_IDS = Object.freeze(['tale', 'master', 'spike', 'electronics', 'drones', 'immersive']);
const LIMITS = Object.freeze({ students: 100000, units: 10000 });

const finite = (value, max) => Math.min(max, Math.max(0, Math.round(Number(value) || 0)));
const list = value => Array.isArray(value) ? value : [];
const canonical = (value, allowed) => allowed.filter(id => list(value).includes(id));
const sharingModes = ['separate', 'simultaneous', 'unknown'];
const text = (value, length = 120) => typeof value === 'string' ? value.slice(0, length) : '';
const ids = value => [...new Set(list(value).filter(id => typeof id === 'string' && id.length).map(id => text(id)))].sort();
const measured = (value, max = LIMITS.students) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : finite(value, max);

export function normalizeWorldInput(input = {}) {
  if (!input || typeof input !== 'object') input = {};
  const levels = canonical(input.levels, LEVEL_IDS);
  const programs = canonical(input.programs, PROGRAM_IDS);
  const rows = list(input.enrollment).filter(row => row && levels.includes(row.levelId)).map(row => ({
    id: text(row.id), levelId: row.levelId, gradeId: text(row.gradeId),
    label: text(row.label), sectionName: text(row.sectionName, 40), students: measured(row.students)
  }));
  const counts = Object.fromEntries(levels.map(id => [id, 0]));
  for (const row of rows) counts[row.levelId] = Math.min(LIMITS.students, counts[row.levelId] + finite(row.students, LIMITS.students));
  const requestedStudents = finite(input.students, LIMITS.students);
  // Explicit enrollment (including zero) wins over a potentially stale total.
  if (!rows.length && levels.length) {
    levels.forEach((id, index) => { counts[id] = Math.floor(requestedStudents / levels.length) + (index < requestedStudents % levels.length ? 1 : 0); });
  }
  // Sections with registered or still unconfirmed students; confirmed zero is empty.
  const sections = Object.fromEntries(levels.map(id => [id, rows.filter(row => row.levelId === id && (row.students == null || row.students > 0)).length]));
  const equipment = Object.fromEntries(programs.map(id => [id, { units: 0, stations: false, sharingModes: [], plans: [], flexBimestres: [], groupIds: [], simIds: [], entries: [] }]));
  for (const [index, row] of list(input.equipment).entries()) {
    if (!row || !programs.includes(row.programId)) continue;
    const entry = equipment[row.programId];
    const groupIds = ids(row.groupIds);
    const selection = {
      id: text(row.id) || `${row.programId}:${index}`, programId: row.programId,
      units: finite(row.units, LIMITS.units), stations: row.stations === true || (typeof row.stations === 'number' && row.stations > 0),
      sharing: sharingModes.includes(row.sharing) ? row.sharing : null,
      plan: text(row.plan, 80), flexBimestres: row.flexBimestres == null ? null : Math.max(1, finite(row.flexBimestres, 4)),
      groupIds, simIds: ids(row.simIds).filter(id => groupIds.includes(id)),
      // Values below belong to the quotation engine; never infer coverage here.
      participants: measured(row.participants), capacity: measured(row.capacity),
      rotations: list(row.rotations).filter(rotation => rotation && typeof rotation === 'object').map(rotation => ({
        id: text(rotation.id), label: text(rotation.label), students: measured(rotation.students), rotations: measured(rotation.rotations)
      }))
    };
    entry.entries.push(selection);
    entry.units = Math.min(LIMITS.units, entry.units + selection.units);
    entry.stations ||= selection.stations;
    if (selection.sharing) entry.sharingModes.push(selection.sharing);
    if (selection.plan) entry.plans.push(selection.plan);
    if (selection.flexBimestres != null) entry.flexBimestres.push(selection.flexBimestres);
    entry.groupIds.push(...selection.groupIds); entry.simIds.push(...selection.simIds);
  }
  Object.values(equipment).forEach(entry => {
    entry.sharingModes = canonical(entry.sharingModes, sharingModes);
    entry.plans = ids(entry.plans); entry.groupIds = ids(entry.groupIds); entry.simIds = ids(entry.simIds);
    entry.flexBimestres = [...new Set(entry.flexBimestres)].sort((a, b) => a - b);
    entry.entries.sort((a, b) => a.id.localeCompare(b.id));
  });
  const active = input.activeConfig && typeof input.activeConfig === 'object' ? input.activeConfig : null;
  const focusLevel = input.focusedLevel ?? input.focusLevel;
  const focusProgram = input.focusedProgram ?? input.focusProgram;
  return { levels, programs, counts, sections, enrollment: rows, equipment,
    students: Object.values(counts).reduce((sum, count) => sum + count, 0),
    focusLevel: levels.includes(focusLevel) ? focusLevel : null,
    focusProgram: programs.includes(focusProgram) ? focusProgram : null,
    activeConfig: active ? { kind: text(active.kind, 40), programId: programs.includes(active.programId) ? active.programId : null,
      levelId: levels.includes(active.levelId) ? active.levelId : null, entryId: text(active.entryId) || null } : null };
}
