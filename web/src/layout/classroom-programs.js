// Which programs each level's classrooms show: those whose equipment groups include one of the level's
// enrollment rows. A program with no groups at all (the cotizador's landing showcase) shows at its usual levels.
import { PROGRAM_IDS } from './normalize.js';

export const HOME_LEVELS = { tale: ['pre'], master: ['prim'], electronics: ['prim'], drones: ['bas'], spike: ['bas', 'bach'], immersive: ['bach'] };

export function levelPrograms(data) {
  const levelOf = new Map(data.enrollment.map(row => [row.id, row.levelId]));
  const out = Object.fromEntries(data.levels.map(level => [level, []]));
  for (const program of PROGRAM_IDS.filter(id => data.programs.includes(id))) {
    const groups = data.equipment[program]?.groupIds || [];
    const levels = groups.length ? new Set(groups.map(id => levelOf.get(id))) : new Set(HOME_LEVELS[program]);
    for (const level of data.levels) if (levels.has(level)) out[level].push(program);
  }
  return out;
}

// The ground classroom shows programs 1-2; the upper one shows 3-4, or 1-2 again when there are no more.
export function tablePrograms(programs, upper) {
  return upper && programs.length > 2 ? programs.slice(2, 4) : programs.slice(0, 2);
}
