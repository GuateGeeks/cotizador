/*
 * Motor del asesor GuateGeeks: funciones puras y deterministas, sin DOM.
 * Calcula equipos, capacidad, estudiantes únicos e precios. No usa IA.
 * Se usa en el navegador (window.GGMotor) y en las pruebas de Node (require).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGMotor = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Capacidad y equipos compartidos ----------

  // equiposDelGrupo = ceil(estudiantes / estudiantesPorEquipo)
  function teamsFor(students, ratio) {
    return Math.ceil(students / ratio);
  }

  // groups: [{id, students}]. Solo cuentan los grupos con estudiantes (> 0).
  // sharing: 'separate' | 'simultaneous' | 'unknown'
  function recommend(groups, ratio, sharing, simIds) {
    const sized = groups.filter(g => g.students > 0);
    if (!sharing || !ratio || !sized.length) return null;
    const per = sized.map(g => teamsFor(g.students, ratio));
    const separate = Math.max(...per);
    if (sharing === 'separate') {
      return { teams: separate, suggested: separate, basis: 'separate' };
    }
    if (sharing === 'simultaneous') {
      const block = sized.filter(g => simIds.includes(g.id)).reduce((s, g) => s + teamsFor(g.students, ratio), 0);
      const rest = sized.filter(g => !simIds.includes(g.id)).map(g => teamsFor(g.students, ratio));
      const teams = Math.max(block, rest.length ? Math.max(...rest) : 0);
      return { teams, suggested: teams, basis: 'simultaneous', blockTeams: block };
    }
    // Horarios desconocidos: escenarios, nunca cobertura garantizada.
    const top2 = [...per].sort((a, b) => b - a).slice(0, 2).reduce((s, x) => s + x, 0);
    return {
      teams: null,
      suggested: separate,
      basis: 'unknown',
      scenarios: [
        { id: 'min', label: 'Cada grupo en un horario distinto', teams: separate },
        { id: 'max', label: 'Los dos grupos más grandes al mismo tiempo', teams: Math.max(separate, top2) }
      ]
    };
  }

  // Estado de cobertura de una cantidad de equipos.
  // none | unconfirmed | full | limited
  function analyze({ groups, ratio, units, sharing, simIds }) {
    const sized = groups.filter(g => g.students > 0);
    const rec = recommend(sized, ratio, sharing, simIds || []);
    if (!rec) return { rec: null, state: 'none' };
    if (rec.teams == null) return { rec, state: 'unconfirmed' };
    if (units == null) return { rec, state: 'none' };
    if (units >= rec.teams) return { rec, state: 'full' };
    const cap = units * ratio; // capacidadPorTurno
    const rotations = sized.map(g => ({ id: g.id, label: g.label, students: g.students, rotations: Math.ceil(g.students / cap) }));
    return { rec, state: 'limited', cap, rotations, maxRot: Math.max(...rotations.map(r => r.rotations)) };
  }

  // Estudiantes únicos: cada grupo se suma una sola vez aunque esté en varios programas.
  function uniqueStudents(groups, ids) {
    const set = new Set(ids);
    return groups.filter(g => set.has(g.id)).reduce((s, g) => s + (g.students || 0), 0);
  }

  // ---------- Matrícula ----------

  // enroll: { [gradeId]: { confirmed, sections: [{id, name, students|null}] } }
  function gradeData(enroll, gradeId) {
    return (enroll && enroll[gradeId]) || {
      confirmed: false,
      sections: [{ id: gradeId + '-1', name: 'A', students: null }]
    };
  }

  // Grupos de los niveles elegidos. students: null = no confirmado; 0 = cero confirmado.
  function groupsOf(enroll, levels, levelIds) {
    const out = [];
    for (const lv of levels) {
      if (!levelIds.includes(lv.id)) continue;
      for (const [gid, gname] of lv.grades) {
        const g = gradeData(enroll, gid);
        const confirmed = true; // cada sección (A, B, C...) es un grupo confirmado
        for (const s of g.sections) {
          out.push({
            id: s.id, gradeId: gid, levelId: lv.id, sectionName: s.name,
            label: gname + ' · Sección ' + s.name, students: s.students, confirmed
          });
        }
      }
    }
    return out;
  }

  // ---------- Precios (quetzales enteros) ----------

  // Reparte un monto entero en n partes que suman exacto; la última absorbe el residuo.
  function splitEven(amount, n) {
    const base = Math.floor(amount / n);
    const out = Array(n).fill(base);
    out[n - 1] += amount - base * n;
    return out;
  }

  // tariff: precios por equipo (ver config.js). fiscal: {iva, initialRate, ...}
  // Devuelve null si no hay tarifa. Todos los precios son enteros (se redondean).
  // Las instituciones educativas están exentas de IVA: el precio principal, el pago inicial y las cuotas se
  // calculan SIN IVA (`net`, `initial`, `schedule`). El monto con IVA es solo referencia (`total`, `initialIva`,
  // `scheduleIva`) para quien lo necesite; `tax` es la diferencia entre ambos.
  function quoteFor(plan, bimestres, units, tariff, fiscal) {
    if (!tariff || !units || units < 1) return null;
    const single = net => {
      net = Math.round(net);
      const tax = Math.round(net * fiscal.iva), total = net + tax;
      return { net, tax, total, initial: net, initialIva: total, schedule: [net], scheduleIva: [total], kind: 'unico' };
    };
    if (plan === 'INTEGRA') return Object.assign(single(tariff.buy * units), { months: 0 });
    if (plan === 'FLEX') {
      const b = bimestres || 1;
      const disc = fiscal.rentDiscount[b] || 0;
      // Renta: un solo monto por todo el periodo, sin pago inicial ni cuotas (como la compra).
      return Object.assign(single(tariff.rent * units * b * (1 - disc)), { months: b * fiscal.rentMonthsPerPeriod });
    }
    if (plan === 'EV8' || plan === 'EV16') {
      const e = fiscal.evolucion[plan];
      const base = Math.round((tariff[e.key] * units / fiscal.evolucionBaseUnits) * e.factor);
      // Todas las cuotas son iguales: el ajuste de unos pocos quetzales se incluye en el precio
      // (el total se redondea a un múltiplo exacto de la cuota), así no queda una cuota final distinta.
      const initial = Math.round(base * fiscal.initialRate);
      const cuota = Math.round((base - initial) / e.months);
      const net = initial + cuota * e.months;
      const initialIva = Math.round(initial * (1 + fiscal.iva)), cuotaIva = Math.round(cuota * (1 + fiscal.iva));
      const total = initialIva + cuotaIva * e.months;
      return { net, tax: total - net, total, months: e.months, initial, initialIva,
        schedule: [initial, ...Array(e.months).fill(cuota)], scheduleIva: [initialIva, ...Array(e.months).fill(cuotaIva)], kind: 'cuotas' };
    }
    return null;
  }

  // ---------- Simulador por estudiante (misma política del cotizador vigente) ----------

  // Cuota mensual sugerida: cubre el pago a GuateGeeks con un 75 % de cobro, redondeada hacia arriba a múltiplos de 5.
  function suggestedFee(total, students, months, sim) {
    if (!students || !months) return 0;
    return Math.ceil((total / students / months / sim.coverage) / sim.roundTo) * sim.roundTo;
  }
  // Ganancia estimada del colegio: ingresos menos lo que paga a GuateGeeks, antes de sus gastos propios.
  function simulate(plan, quote, students, fee, fiscal) {
    const months = plan === 'INTEGRA' ? fiscal.sim.buyMonths : quote.months;
    const income = fee * students * months, diff = income - quote.total;
    return { months, suggested: suggestedFee(quote.total, students, months, fiscal.sim), income, diff,
      perStudent: students ? diff / students : 0, perStudentMonth: students && months ? diff / students / months : 0 };
  }

  // Proyección de toda la propuesta: una sola cuota por estudiante, sobre el total de estudiantes únicos
  // (no por nivel ni por programa). El plazo es el del programa más largo. fee == null usa la sugerida.
  // Por defecto el costo es sin IVA (instituciones educativas exentas); withIva usa el monto con IVA.
  function simulateAll(quotes, students, fee, fiscal, withIva) {
    const months = Math.max(...quotes.map(q => q.months)), cost = quotes.reduce((s, q) => s + (withIva ? q.total : q.net), 0);
    const suggested = suggestedFee(cost, students, months, fiscal.sim), f = fee == null ? suggested : fee;
    const income = f * students * months, gain = income - cost;
    return { months, cost, suggested, fee: f, students, income, gain, contribution: f * months,
      costPerStudent: students ? cost / students : 0, perStudent: students ? gain / students : 0, perStudentMonth: students && months ? gain / students / months : 0 };
  }

  // ---------- Estado de cada programa de la propuesta ----------

  // Firma de todo lo que afecta equipos o precios. Si cambia, el cálculo previo queda pendiente.
  function entrySignature(entry, groups) {
    const mine = groups.filter(g => entry.groupIds.includes(g.id)).map(g => [g.id, g.students]);
    return JSON.stringify([mine, entry.sharing, [...entry.simIds].sort(), entry.units, entry.plan, entry.flexBimestres]);
  }

  // Cantidad efectiva: la elegida por el usuario o, si no hay, la sugerida por el motor.
  function effectiveUnits(entry, program, groups) {
    if (!program.ratio) return null;
    if (entry.units != null) return entry.units;
    const rec = recommend(groups.filter(g => entry.groupIds.includes(g.id)), program.ratio, entry.sharing, entry.simIds);
    return rec ? rec.suggested : null;
  }

  // draft | plan | quote | stale | priced
  function entryStatus(entry, program, groups, tariffs) {
    if (!entry.confirmed) return 'draft';
    if (!program.ratio || !tariffs[program.id]) return 'quote';
    if (entry.plan === 'UNDECIDED') return 'plan';
    if (entry.calc !== entrySignature(entry, groups)) return 'stale';
    return 'priced';
  }

  // Inversión unificada de toda la propuesta bajo cada modalidad: se suman los equipos de todos los programas
  // y niveles, sin desglose por programa. bimestres solo aplica a Flex. students = estudiantes únicos atendidos.
  function proposalOptions(entries, programs, groups, tariffs, fiscal, bimestres) {
    const rows = entries.filter(e => e.confirmed).map(e => {
      const p = programs.find(x => x.id === e.programId), units = effectiveUnits(e, p, groups);
      return { entry: e, program: p, units, tariff: tariffs[p.id], ok: !!(p.ratio && tariffs[p.id] && units) };
    });
    const priced = rows.filter(r => r.ok), unpriced = entries.length - priced.length;
    const students = uniqueStudents(groups, [...new Set(priced.flatMap(r => r.entry.groupIds))]);
    const equipment = priced.reduce((s, r) => s + r.units, 0);
    const options = {};
    ['INTEGRA', 'FLEX', 'EV8', 'EV16'].forEach(plan => {
      if (!priced.length) { options[plan] = null; return; }
      const qs = priced.map(r => quoteFor(plan, bimestres, r.units, r.tariff, fiscal));
      const len = Math.max(...qs.map(q => q.schedule.length));
      const col = (k, i) => qs.reduce((s, q) => s + (q[k][i] || 0), 0);
      const sum = k => qs.reduce((s, q) => s + q[k], 0);
      options[plan] = { plan, net: sum('net'), tax: sum('tax'), total: sum('total'), months: Math.max(...qs.map(q => q.months)), initial: sum('initial'), initialIva: sum('initialIva'),
        schedule: Array.from({ length: len }, (_, i) => col('schedule', i)), scheduleIva: Array.from({ length: len }, (_, i) => col('scheduleIva', i)), quotes: qs, kind: qs[0].kind };
    });
    return { options, students, equipment, pricedCount: priced.length, unpricedCount: unpriced, complete: entries.length > 0 && unpriced === 0, rows: priced };
  }

  // Suma solo las partidas con precio vigente. Nunca presenta el parcial como total completo.
  function proposalTotals(entries, programs, groups, tariffs, fiscal) {
    const rows = entries.map(e => {
      const p = programs.find(x => x.id === e.programId);
      const status = entryStatus(e, p, groups, tariffs);
      const units = effectiveUnits(e, p, groups);
      const quote = status === 'priced' ? quoteFor(e.plan, e.flexBimestres, units, tariffs[p.id], fiscal) : null;
      return { entry: e, status, units, quote };
    });
    const priced = rows.filter(r => r.quote);
    const sum = k => priced.reduce((s, r) => s + r.quote[k], 0);
    const unpriced = rows.length - priced.length;
    return { rows, pricedCount: priced.length, unpricedCount: unpriced, net: sum('net'), tax: sum('tax'), total: sum('total'), complete: rows.length > 0 && unpriced === 0 };
  }

  return { teamsFor, recommend, analyze, uniqueStudents, gradeData, groupsOf, splitEven, quoteFor, suggestedFee, simulate, simulateAll, proposalOptions, entrySignature, effectiveUnits, entryStatus, proposalTotals };
});
