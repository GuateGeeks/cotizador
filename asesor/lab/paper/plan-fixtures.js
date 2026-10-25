/**
 * The six reference growth states (storyboard, not form steps) as planner input.
 * Same content as tools/campus-states.cjs (app state) and asesor/test/paper-plan.test.js.
 */
const rows = (grades, levelId, list) => grades.flatMap(gradeId => list.map((students, i) => ({ id: `${gradeId}-${i + 1}`, levelId, gradeId, sectionName: 'ABC'[i], students })));
const entry = (programId, enrollment, levels, sharing, plan, extra = {}) => {
  const groupIds = enrollment.filter(row => levels.includes(row.levelId)).map(row => row.id);
  return { id: `${programId}@${levels[0]}`, programId, groupIds, sharing: groupIds.length > 1 ? sharing : null,
    simIds: sharing === 'simultaneous' ? groupIds.slice(0, 2) : [], units: null, stations: false, plan, ...extra };
};
export function stateInput(n) {
  if (n <= 1) return {};
  const levels = ['pre', 'prim'];
  let enrollment = [...rows(['pk', 'ki', 'pr'], 'pre', [22]), ...rows(['p1', 'p2', 'p3'], 'prim', [24])];
  const equipment = [], programs = [];
  if (n >= 4) enrollment = [...rows(['pk', 'ki', 'pr'], 'pre', [22]), ...rows(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], 'prim', [25, 24])];
  if (n >= 5) { levels.push('bas'); enrollment.push(...rows(['b1', 'b2', 'b3'], 'bas', [30, 28])); }
  if (n >= 6) { levels.push('bach'); enrollment.push(...rows(['bc4', 'bc5'], 'bach', [32, 30])); }
  if (n >= 3) { programs.push('tale'); equipment.push(entry('tale', enrollment, ['pre'], 'separate', 'UNDECIDED')); }
  if (n >= 4) { programs.push('master'); equipment.push(entry('master', enrollment, ['prim'], 'simultaneous', 'FLEX', { flexBimestres: 3 })); }
  if (n >= 5) {
    programs.push('electronics', 'drones');
    equipment.push(entry('electronics', enrollment, ['prim'], 'separate', 'EV8', { stations: true }), entry('drones', enrollment, ['bas'], 'separate', 'INTEGRA'));
  }
  if (n >= 6) {
    programs.push('spike', 'immersive');
    equipment.push(entry('spike', enrollment, ['bas', 'bach'], 'unknown', 'EV16'), entry('immersive', enrollment, ['bach'], 'simultaneous', 'FLEX', { flexBimestres: 4 }));
  }
  return { step: n >= 3 ? 5 : 2, levels, enrollment, programs, equipment };
}
export const STATE_NAMES = Object.freeze(['Escuela inicial', 'Comunidad educativa', 'Robótica', 'Programación y ampliación', 'Entorno y conexiones', 'Campus consolidado']);
