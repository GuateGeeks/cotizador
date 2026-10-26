'use strict';
// Ejecutar con: node --test asesor/test/pdf.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../propuesta-pdf.js');
const G = require('../pdf.js');

const modelo = (programas = 2) => ({
  title: 'Propuesta institucional de programas educativos', subtitle: 'Prueba', date: '24 de octubre de 2026',
  stats: [{ v: '211', l: 'estudiantes únicos' }, { v: '2', l: 'niveles' }, { v: String(programas), l: 'programas' }], levelsLine: 'Niveles: Preprimaria y Primaria.',
  invest: { label: 'Total sin IVA', net: 'Q69,112', withIva: 'Con IVA: Q77,406 (IVA de Q8,294)', parts: { main: 'Q69,112', mainLabel: 'Total sin IVA', perStudent: 'Q1,115', students: 62, net: 'Q69,112', iva: 'Q8,294', total: 'Q77,406', ivaPct: '12 %' }, warning: '' },
  legend: [['Evoluciona', 'Pagas un inicial y cuotas; al final el equipo es del colegio.']], steps: [['Revisa', 'Texto uno.'], ['Confirma', 'Texto dos.'], ['Empieza', 'Texto tres.']],
  pay: { lead: 'Pagarías Q15,481 al iniciar.', tiles: [{ l: 'Al iniciar', v: 'Q15,481' }], table: null },
  programs: Array.from({ length: programas }, (_, i) => ({
    eyebrow: 'Robótica', title: 'Robótica para pequeños · Preprimaria ' + i, sub: 'Tale-Bot · Evoluciona 8', groups: ['Kínder · A'], photo: 'x',
    tiles: [{ v: '62', l: 'estudiantes participan' }], explain: 'Texto de ejemplo con acentos: niño, año, ñandú, ¿cuántos?', note: '',
    price: { planName: 'Evoluciona 8', net: 'Q31,164', withIva: 'Q34,904', pay: 'Pago inicial de Q6,981 y 8 cuotas.', own: { title: 'El equipo se queda en tu institución', text: 'Pasa a ser propiedad del colegio.' }, minNote: '', includes: [['Equipamiento', 'Incluido.']] }, pending: ''
  })),
  overview: Array.from({ length: programas }, (_, i) => ({ photo: 'x', title: 'Robótica para pequeños · Preprimaria ' + i, sub: '4 grupos', equip: '10 Tale-Bot', students: '62 estudiantes' })),
  options: [{ label: 'Compra de equipos', tag: 'Integra · un solo pago', programs: 'Robótica, Electrónica', total: 'Q20,000' }, { label: 'Pago en cuotas', tag: 'Evoluciona · 8 meses', programs: 'Drones', total: 'Q31,161' }],
  sim: null, notes: ['Nota uno.', 'Nota dos.']
});

test('el PDF tiene estructura válida: cabecera, tabla xref coherente y fin de archivo', () => {
  const u8 = P.build(modelo(), {});
  const s = Buffer.from(u8).toString('latin1');
  assert.ok(s.startsWith('%PDF-1.4'));
  assert.ok(s.trimEnd().endsWith('%%EOF'));
  const start = Number(s.match(/startxref\n(\d+)\n/)[1]);
  assert.equal(s.slice(start, start + 4), 'xref');
  // cada entrada de la tabla apunta al inicio de su objeto
  const entradas = [...s.slice(start).matchAll(/(\d{10}) 00000 n /g)].map(m => Number(m[1]));
  entradas.forEach((off, i) => assert.ok(s.slice(off).startsWith(`${i + 1} 0 obj`), `objeto ${i + 1}`));
});

test('con muchos programas se reparte en varias páginas y el pie dice cuántas son', () => {
  const u8 = P.build(modelo(6), {});
  const s = Buffer.from(u8).toString('latin1');
  const paginas = Number(s.match(/\/Count (\d+)/)[1]);
  assert.ok(paginas >= 3);
  assert.ok(s.includes(`de ${paginas})`));
});

test('los acentos y la eñe se escriben en WinAnsi', () => {
  assert.equal(G.toWin('ñ').charCodeAt(0), 0xF1);
  assert.equal(G.toWin('é').charCodeAt(0), 0xE9);
  assert.equal(G.toWin('¿').charCodeAt(0), 0xBF);
  assert.equal(G.toWin('•').charCodeAt(0), 0x95);
});

test('el ajuste de líneas respeta el ancho máximo', () => {
  const lineas = G.wrap('Cada equipo lo usan hasta 2 estudiantes a la vez con varios equipos disponibles', 9, false, 120);
  assert.ok(lineas.length > 1);
  lineas.forEach(l => assert.ok(G.textWidth(l, 9, false) <= 120 + 0.01));
});

test('acepta el logo como imagen con transparencia (color + máscara) y la dibuja', () => {
  const zlib = require('node:zlib');
  const w = 8, h = 6, rgba = new Uint8Array(w * h * 4).map((_, i) => i % 4 === 3 ? 128 : 200);
  const { rgb, alpha } = G.splitRGBA(rgba, w, h);
  assert.equal(rgb.length, w * h * 3);
  assert.equal(alpha.length, w * h);
  assert.ok(alpha.every(a => a === 128));
  const logo = { w, h, comps: 3, data: zlib.deflateSync(rgb), filter: 'FlateDecode', smask: { data: zlib.deflateSync(alpha), filter: 'FlateDecode' } };
  const s = Buffer.from(P.build(modelo(), { logo })).toString('latin1');
  assert.ok(s.includes('/SMask'));
  assert.ok(s.includes('/Filter /FlateDecode'));
  // la tabla xref sigue siendo coherente con objetos extra de imagen
  const start = Number(s.match(/startxref\n(\d+)\n/)[1]);
  [...s.slice(start).matchAll(/(\d{10}) 00000 n /g)].forEach((m, i) => assert.ok(s.slice(Number(m[1])).startsWith(`${i + 1} 0 obj`)));
});

test('la primera hoja trae la lista de programas y el detalle empieza en otra página', () => {
  const s = Buffer.from(P.build(modelo(2), {})).toString('latin1');
  assert.ok(s.includes('Lo que incluye tu propuesta'));
  assert.ok(s.includes('Pr\xf3ximos pasos'));
  assert.ok(s.includes('Detalle de cada programa'));
  assert.ok(!s.includes('Proyección por estudiante')); // solo se incluye si la institución la pide
});

test('la proyección por estudiante solo aparece cuando el modelo la trae', () => {
  const con = modelo(1);
  con.sim = { lead: 'Proyección de prueba.', note: 'Nota.', items: [{ title: 'Robótica · Primaria', own: null, head: 'Con Q95 al mes por estudiante, el colegio recauda Q47,120.', rows: [['Cuota', 'Q95'], ['Diferencia bruta', 'Q12,216', true]] }] };
  const s = Buffer.from(P.build(con, {})).toString('latin1');
  assert.ok(s.includes('Proyección por estudiante'));
});

// JPEG mínimo: SOI, SOF0 con dimensiones y EOI. El PDF no decodifica la imagen, solo la incrusta.
const jpegPrueba = (w, h) => Uint8Array.from([0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xFF, 0xD9]);
const xrefCoherente = s => {
  const start = Number(s.match(/startxref\n(\d+)\n/)[1]);
  [...s.slice(start).matchAll(/(\d{10}) 00000 n /g)].forEach((m, i) => assert.ok(s.slice(Number(m[1])).startsWith(`${i + 1} 0 obj`), `objeto ${i + 1}`));
};

test('con la captura del campus añade la figura ilustrativa y la imagen JPEG', () => {
  const s = Buffer.from(P.build(modelo(2), { campus: jpegPrueba(1200, 760) })).toString('latin1');
  assert.ok(s.includes('Representaci\xf3n de tu configuraci\xf3n \\(ilustrativa\\)'));
  assert.ok(s.includes('/Filter /DCTDecode'));
  assert.ok(s.includes('/Width 1200') && s.includes('/Height 760'));
  xrefCoherente(s);
});

test('sin captura la propuesta sale igual y sin la figura', () => {
  const sin = Buffer.from(P.build(modelo(2), {})).toString('latin1');
  assert.ok(!sin.includes('Representaci\xf3n de tu configuraci\xf3n'));
  assert.ok(!sin.includes('/DCTDecode'));
  // una captura inválida tampoco rompe la propuesta
  const rota = Buffer.from(P.build(modelo(2), { campus: Uint8Array.from([1, 2, 3]) })).toString('latin1');
  assert.ok(!rota.includes('Representaci\xf3n de tu configuraci\xf3n'));
  xrefCoherente(rota);
  // los textos comerciales no cambian con la figura
  const con = Buffer.from(P.build(modelo(2), { campus: jpegPrueba(1200, 760) })).toString('latin1');
  for (const texto of ['Lo que incluye tu propuesta', 'Q69,112', 'Pr\xf3ximos pasos', 'Condiciones y notas']) assert.ok(sin.includes(texto) && con.includes(texto), texto);
});

test('la tabla de grados considerados aparece solo con cobertura y avisa lo que falta', () => {
  const m = modelo(2);
  const sin = Buffer.from(P.build(m, {})).toString('latin1');
  assert.ok(!sin.includes('Grados y estudiantes considerados'));
  m.coverage = { summary: '189 de 319 estudiantes registrados están incluidos en esta cotización.', missing: 130, rows: [{ grade: '1.º Primaria', level: 'Primaria', students: 24, programs: 'Robótica con Robot Master', ok: true }, { grade: '4.º Bachillerato', level: 'Bachillerato', students: 40, programs: 'Sin programa', ok: false }] };
  const con = Buffer.from(P.build(m, {})).toString('latin1');
  assert.ok(con.includes('Grados y estudiantes considerados'));
  assert.ok(con.includes('Sin programa'));
});
