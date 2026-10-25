/*
 * Diseño del PDF de la propuesta. Recibe un modelo con todo el texto ya formateado
 * (ver pdfModel() en asesor.js) y devuelve los bytes del PDF.
 *
 * Estructura: hoja 1 = resumen para decidir (logo, título, cifras, inversión, forma de pago y
 * lista de programas con su foto); hojas siguientes = detalle de cada programa con la foto del
 * equipo, pagos mes a mes, la proyección por estudiante (solo si se pidió) y condiciones.
 * Tipografía: nada por debajo de 9 pt; el texto corrido va en 10 a 10.5 pt.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./pdf.js'));
  else root.GGPropuestaPdf = factory(root.GGPdf);
})(typeof self !== 'undefined' ? self : this, function (GGPdf) {
  'use strict';

  const C = {
    plum: '#685599', plumDark: '#45335f', plumWash: '#f4f0fa', coral: '#ef8556', coralSoft: '#f6a07a',
    ink: '#302b3d', muted: '#625b6a', line: '#e5dfe9', soft: '#f7f5f9', white: '#ffffff',
    mint: '#e8f5f2', mintDark: '#14513f', mintLine: '#bfe0d6', amber: '#fff7e9', amberDark: '#7e551e', amberLine: '#f0dfbd',
    light: '#e4dcf3', sky: '#5fbad6'
  };
  const M = 40, CW = 515, TOP2 = 76, BOTTOM = 790;
  const LOGO_RATIO = 382 / 584;
  const T = { body: 10.5, small: 9.5, tiny: 9, lh: 1.5 };

  function build(model, photos, opts) {
    const pdf = GGPdf.create();
    const imgIds = {};
    let y = 0;

    const photoId = key => {
      if (!key || !photos || !photos[key]) return 0;
      if (!imgIds[key]) { try { imgIds[key] = pdf.addImage(photos[key]); } catch (e) { imgIds[key] = -1; } }
      return imgIds[key] > 0 ? imgIds[key] : 0;
    };
    function logo(x, yy, h) {
      const id = photoId('logo');
      if (id) { pdf.image(id, x, yy, h / LOGO_RATIO, h); return h / LOGO_RATIO; }
      const w = pdf.text(x, yy + h * 0.7, 'Guate', { size: h * 0.55, bold: true, color: C.plumDark });
      pdf.text(x + w, yy + h * 0.7, 'Geeks', { size: h * 0.55, bold: true, color: C.coral });
      return w + 60;
    }

    // ---------- Encabezados ----------
    const dot = (cx, cy, r, fill) => pdf.rect(cx - r, cy - r, r * 2, r * 2, { fill, r });
    function firstHeader() {
      logo(M, 12, 56);
      pdf.text(pdf.W - M, 35, 'Cotización de programas educativos', { size: 11, bold: true, color: C.plumDark, align: 'right' });
      pdf.text(pdf.W - M, 52, model.date, { size: T.small, color: C.muted, align: 'right' });
      pdf.rect(0, 78, pdf.W, 104, { fill: C.plumDark });
      // formas de marca dentro de la franja (círculos como en las plantillas de cotización ilustradas)
      const eyes = photoId('ojos');
      if (eyes) { const ew = 150, eh = ew * (photos.ojos.h / photos.ojos.w); pdf.image(eyes, M + CW - ew - 4, 78 + (104 - eh) / 2 + 1, ew, eh); }
      else { dot(542, 130, 44, C.coral); dot(486, 158, 20, C.sky); dot(452, 108, 13, '#7d6aa8'); dot(512, 96, 8, C.white); }
      pdf.text(M, 108, 'Cotización', { size: T.body, bold: true, color: C.coralSoft });
      let ts = 25; while (ts > 19 && GGPdf.textWidth(model.title, ts, true) > CW - 170) ts -= 0.5;
      pdf.text(M, 140, model.title, { size: ts, bold: true, color: C.white });
      pdf.paragraph(M, 158, model.subtitle, { size: T.small, color: C.light, w: CW - 180, lh: 13.5 });
      return 202;
    }
    function nextHeader() {
      logo(M, 14, 32);
      pdf.text(pdf.W - M, 38, 'Propuesta educativa', { size: T.small, bold: true, color: C.plumDark, align: 'right' });
      pdf.line(M, 56, M + CW, 56, C.line);
      return TOP2;
    }
    function newPage() {
      const first = pdf.pageCount() === 0;
      pdf.addPage();
      y = first ? firstHeader() : nextHeader();
    }
    const ensure = h => { if (y + h > BOTTOM) newPage(); };

    // ---------- Piezas ----------
    function heading(txt, sub, need = 60) {
      ensure(44 + need);
      pdf.text(M, y + 13, txt, { size: 15, bold: true, color: C.plumDark });
      pdf.line(M, y + 23, M + CW, y + 23, C.line);
      y += 38;
      if (sub) y += pdf.paragraph(M, y + 3, sub, { size: T.small, color: C.muted, w: CW, lh: 14 }) + 8;
    }
    function para(txt, o = {}) {
      const size = o.size || T.body, w = o.w || CW, lh = o.lh || size * T.lh;
      const h = pdf.measure(txt, { size, bold: o.bold, w, lh });
      ensure(h + 2);
      pdf.paragraph(o.x || M, y + size, txt, { size, bold: o.bold, color: o.color || C.ink, w, lh });
      y += h + (o.gap === undefined ? 8 : o.gap);
    }
    function tilesRow(tiles, o = {}) {
      const gap = 10, n = tiles.length, w = (CW - gap * (n - 1)) / n, h = o.h || 60;
      ensure(h + 8);
      tiles.forEach((t, i) => {
        const x = M + i * (w + gap), dark = t.dark;
        pdf.rect(x, y, w, h, { fill: dark ? C.plumDark : C.plumWash, r: 8 });
        pdf.text(x + 14, y + 26, t.v, { size: o.vsize || 20, bold: true, color: dark ? C.white : C.plumDark });
        GGPdf.wrap(t.l, T.small, false, w - 28).slice(0, 2).forEach((ln, k) => pdf.text(x + 14, y + 42 + k * 12, ln, { size: T.small, color: dark ? C.light : C.muted }));
      });
      y += h + 14;
    }
    const calloutH = (w, title, text) => 16 + (title ? 16 : 0) + GGPdf.wrap(text, T.small, false, w - 30).length * 13.5 + 6;
    function callout(x, w, ytop, title, text, tone) {
      const t = tone === 'amber' ? { bg: C.amber, line: C.amberLine, fg: C.amberDark } : { bg: C.mint, line: C.mintLine, fg: C.mintDark };
      const lines = GGPdf.wrap(text, T.small, false, w - 30), h = calloutH(w, title, text);
      pdf.rect(x, ytop, w, h, { fill: t.bg, stroke: t.line, lw: 0.6, r: 6 });
      let yy = ytop + 19;
      if (title) { pdf.text(x + 14, yy, title, { size: T.body, bold: true, color: t.fg }); yy += 16; }
      lines.forEach((ln, i) => pdf.text(x + 14, yy + i * 13.5, ln, { size: T.small, color: t.fg }));
      return h;
    }

    // ---------- Hoja 1: resumen para decidir ----------
    newPage();
    tilesRow(model.stats, { h: 64, vsize: 22 });
    if (model.levelsLine) para(model.levelsLine, { size: T.small, color: C.muted, gap: 10 });

    // Lo que incluye la propuesta: una fila por programa, solo alcance y equipos (sin precios por programa)
    heading('Lo que incluye tu propuesta', 'Los precios de la propuesta no se separan por nivel ni por programa: más abajo están unificados.', 90);
    const cols = [{ w: 270, a: 'left', t: 'Programa' }, { w: 135, a: 'left', t: 'Equipos' }, { w: 110, a: 'right', t: 'Estudiantes' }];
    const tableHead = () => {
      ensure(26 + 60);
      pdf.rect(M, y, CW, 26, { fill: C.plumDark, r: 6 });
      let x = M;
      cols.forEach(c => { pdf.text(c.a === 'right' ? x + c.w - 10 : x + 10, y + 17, c.t, { size: T.small, bold: true, color: C.white, align: c.a }); x += c.w; });
      y += 28;
    };
    tableHead();
    model.overview.forEach((r, ri) => {
      const photo = photoId(r.photo), tx = M + 10 + (photo ? 62 : 0), tw = cols[0].w - 20 - (photo ? 62 : 0);
      const t1 = GGPdf.wrap(r.title, T.small + 0.5, true, tw), t2 = GGPdf.wrap(r.sub, T.tiny, false, tw)[0] || '';
      const eq = GGPdf.wrap(r.equip, T.small + 0.5, false, cols[1].w - 16).slice(0, 2);
      const rowH = Math.max(16 + t1.length * 13 + 14, photo ? 52 : 0, 16 + eq.length * 13 + 14, 36);
      if (y + rowH > BOTTOM) { newPage(); tableHead(); }
      if (ri % 2 === 0) pdf.rect(M, y, CW, rowH, { fill: C.soft });
      if (photo) pdf.image(photo, M + 10, y + (rowH - 38) / 2, 52, 38);
      t1.forEach((ln, k) => pdf.text(tx, y + 19 + k * 13, ln, { size: T.small + 0.5, bold: true, color: C.ink }));
      pdf.text(tx, y + 19 + t1.length * 13 + 1, t2, { size: T.tiny, color: C.muted });
      eq.forEach((ln, k) => pdf.text(M + cols[0].w + 10, y + 19 + k * 13, ln, { size: T.small + 0.5, color: C.ink }));
      pdf.text(M + CW - 10, y + 19, r.students, { size: T.small + 0.5, bold: true, color: C.plumDark, align: 'right' });
      y += rowH;
    });
    pdf.line(M, y, M + CW, y, C.line);
    y += 16;
    if (model.invest.warning) { const h = calloutH(CW, '', model.invest.warning); ensure(h + 8); callout(M, CW, y, '', model.invest.warning, 'amber'); y += h + 14; }

    // Grados y estudiantes considerados: deja claro quién está incluido en la cotización
    if (model.coverage && model.coverage.rows.length) {
      heading('Grados y estudiantes considerados', model.coverage.summary, 120);
      const cc = [{ w: 190, a: 'left', t: 'Grado' }, { w: 90, a: 'right', t: 'Estudiantes' }, { w: CW - 280, a: 'left', t: 'Programas' }];
      const head = () => { ensure(26 + 40); pdf.rect(M, y, CW, 26, { fill: C.plumDark, r: 6 }); let cx = M; cc.forEach(c => { pdf.text(c.a === 'right' ? cx + c.w - 10 : cx + 10 + (c === cc[2] ? 10 : 0), y + 17, c.t, { size: T.small, bold: true, color: C.white, align: c.a }); cx += c.w; }); y += 28; };
      head();
      model.coverage.rows.forEach((r, ri) => {
        const pl = GGPdf.wrap(r.programs, T.small, false, cc[2].w - 24).slice(0, 2), h = Math.max(22, 8 + pl.length * 12 + 4);
        if (y + h > BOTTOM) { newPage(); head(); }
        pdf.rect(M, y, CW, h, { fill: r.ok ? (ri % 2 ? C.white : C.soft) : '#fff3e3', r: 4 });
        pdf.text(M + 10, y + 15, r.grade, { size: T.small + 0.5, bold: true, color: C.ink });
        pdf.text(M + cc[0].w + cc[1].w - 10, y + 15, String(r.students), { size: T.small + 0.5, color: C.ink, align: 'right' });
        pl.forEach((ln, k) => pdf.text(M + cc[0].w + cc[1].w + 20, y + 15 + k * 12, ln, { size: T.small, bold: !r.ok, color: r.ok ? C.muted : C.amberDark }));
        y += h;
      });
      y += 14;
      if (model.coverage.missing) { const msg = model.coverage.missing + ' estudiantes registrados no están incluidos en los precios de esta cotización.'; const h = calloutH(CW, '', msg); ensure(h + 8); callout(M, CW, y, '', msg, 'amber'); y += h + 14; }
    }

    // Inversión agrupada por modalidad: cada monto reúne los programas que comparten modalidad
    if (model.options && model.options.length) {
      heading('Inversión según la modalidad', 'Cada monto reúne los programas de la misma modalidad; no se separa por nivel ni por programa.', 150);
      const oc = [{ w: 190, a: 'left', t: 'Modalidad' }, { w: 220, a: 'left', t: 'Programas' }, { w: 110, a: 'right', t: 'Total' }];
      pdf.rect(M, y, CW, 26, { fill: C.plumDark, r: 6 });
      let ox = M; oc.forEach(c => { pdf.text(c.a === 'right' ? ox + c.w - 10 : ox + 10, y + 17, c.t, { size: T.small, bold: true, color: C.white, align: c.a }); ox += c.w; });
      y += 28;
      model.options.forEach((r, ri) => {
        const pl = GGPdf.wrap(r.programs, T.small, false, oc[1].w - 20).slice(0, 3), h = Math.max(40, 16 + pl.length * 12 + 10);
        ensure(h);
        pdf.rect(M, y, CW, h, { fill: ri % 2 ? C.white : C.soft, r: 6 });
        pdf.text(M + 10, y + 17, r.label, { size: T.small + 0.5, bold: true, color: C.ink });
        pdf.text(M + 10, y + 31, r.tag, { size: T.tiny, color: C.muted });
        pl.forEach((ln, k) => pdf.text(M + oc[0].w + 10, y + 17 + k * 12, ln, { size: T.small, color: C.ink }));
        pdf.text(M + CW - 10, y + 24, r.total, { size: 11.5, bold: true, color: C.plumDark, align: 'right' });
        y += h + 4;
      });
      y += 10;
    }

    // Totales (a la derecha) y cómo se paga (a la izquierda), solo con una modalidad elegida
    const inv = model.invest, P = inv.parts;
    if (P) {
      const pay0 = model.pay || { lead: '', tiles: [] }, totW = 236, leftW = CW - totW - 16, payText = pay0.lead;
      const payH = 40 + pdf.measure(payText, { size: T.body, w: leftW - 32, lh: 15 }) + ((pay0.tiles || []).length ? 62 : 0), totH = 156;
      const bh = Math.max(payH, totH);
      ensure(bh + 10);
      pdf.rect(M, y, leftW, bh, { fill: C.plumWash, r: 10 });
      pdf.text(M + 16, y + 26, 'Así se paga', { size: 12, bold: true, color: C.plumDark });
      pdf.paragraph(M + 16, y + 46, payText, { size: T.body, color: C.ink, w: leftW - 32, lh: 15 });
      const chips = (pay0.tiles || []).filter(t => !t.dark).slice(0, 3);
      if (chips.length) {
        const cw = (leftW - 32 - 8 * (chips.length - 1)) / chips.length;
        chips.forEach((t, i) => {
          const cx = M + 16 + i * (cw + 8), cy = y + bh - 58;
          pdf.rect(cx, cy, cw, 44, { fill: C.white, r: 8 });
          pdf.text(cx + 10, cy + 18, t.v, { size: 11, bold: true, color: C.plumDark });
          pdf.text(cx + 10, cy + 34, t.l, { size: T.tiny, color: C.muted });
        });
      }
      const tx0 = M + leftW + 16;
      pdf.rect(tx0, y, totW, bh, { fill: C.plumDark, r: 10 });
      pdf.text(tx0 + 18, y + 26, inv.label, { size: T.small, color: C.light });
      pdf.text(tx0 + 18, y + 58, P.main, { size: 28, bold: true, color: C.white });
      pdf.text(tx0 + 18, y + 74, P.mainLabel, { size: T.tiny, color: C.light });
      pdf.line(tx0 + 18, y + 86, tx0 + totW - 18, y + 86, '#6b5a8e');
      pdf.text(tx0 + 18, y + 104, P.perLabel, { size: T.small, color: C.light });
      pdf.text(tx0 + totW - 18, y + 104, P.perStudent, { size: T.body, bold: true, color: C.white, align: 'right' });
      if (P.perTotal) pdf.text(tx0 + 18, y + 118, P.perTotal + ' · ' + P.students + ' estudiantes', { size: T.tiny, color: C.light });
      pdf.text(tx0 + 18, y + 138, 'Sin IVA / IVA ' + P.ivaPct, { size: T.tiny, color: C.light });
      pdf.text(tx0 + totW - 18, y + 138, P.net + ' / ' + P.iva, { size: T.tiny, color: C.light, align: 'right' });
      y += bh + 20;
    }

    // Cómo leer esta cotización: las modalidades usadas, en lenguaje sencillo
    if (model.legend && model.legend.length) {
      heading('Cómo leer esta cotización', 'Las modalidades que aparecen en tu propuesta, explicadas sencillo.', 96);
      model.legend.forEach(([name, text]) => {
        const h = Math.max(30, pdf.measure(text, { size: T.small, w: CW - 130, lh: 14 }) + 14);
        ensure(h + 6);
        pdf.rect(M, y, CW, h, { fill: C.white, stroke: C.line, lw: 0.7, r: 8 });
        pdf.rect(M + 10, y + (h - 20) / 2, 92, 20, { fill: C.plum, r: 10 });
        pdf.text(M + 56, y + (h - 20) / 2 + 14, name, { size: T.small, bold: true, color: C.white, align: 'center' });
        pdf.paragraph(M + 116, y + 19, text, { size: T.small, color: C.ink, w: CW - 130, lh: 14 });
        y += h + 6;
      });
      y += 8;
    }

    // Próximos pasos
    if (model.steps && model.steps.length) {
      heading('Próximos pasos', null, 150);
      const gap = 12, sw = (CW - gap * 2) / 3, fills = [C.plumDark, C.coral, C.sky];
      const sh = Math.max(...model.steps.map(st => 48 + pdf.measure(st[1], { size: T.small, w: sw - 28, lh: 14 }))) + 10;
      ensure(sh + 10);
      model.steps.forEach((st, i) => {
        const x = M + i * (sw + gap);
        pdf.rect(x, y, sw, sh, { fill: C.soft, r: 10 });
        dot(x + 26, y + 26, 13, fills[i % 3]);
        pdf.text(x + 26, y + 31, String(i + 1), { size: 12, bold: true, color: i === 0 ? C.white : C.ink, align: 'center' });
        pdf.text(x + 48, y + 30, st[0], { size: T.body, bold: true, color: C.plumDark });
        pdf.paragraph(x + 14, y + 56, st[1], { size: T.small, color: C.muted, w: sw - 28, lh: 14 });
      });
      y += sh + 18;
    }

    // Condiciones y notas
    function notes() {
      heading('Condiciones y notas', null, 70);
      model.notes.forEach(n => para('•  ' + n, { size: T.small, lh: 14, color: C.muted, w: CW - 12, x: M + 6, gap: 5 }));
    }
    notes();

    // ---------- Detalle de cada programa ----------
    if (model.programs.length) { pdf.addPage(); y = nextHeader(); }
    heading('Detalle de cada programa', 'Qué recibe tu institución en cada programa, cuántos equipos y cómo se paga.', 200);
    model.programs.forEach(p => card(p));

    function card(p) {
      const pad = 16, innerW = CW - pad * 2, photo = photoId(p.photo);
      const imgW = photo ? 200 : 0, imgH = photo ? 133 : 0, gutter = photo ? 18 : 0;
      const textX = M + pad + imgW + gutter, textW = innerW - imgW - gutter;
      const titleLines = GGPdf.wrap(p.title, 14, true, textW), subLines = GGPdf.wrap(p.sub, T.small, false, textW);
      const groupLines = GGPdf.wrap(p.groups.join('  ·  '), T.tiny, false, textW);
      const tileGap = 6, tilesN = Math.max(1, p.tiles.length), tileW = (textW - tileGap * (tilesN - 1)) / tilesN, tileH = 52;
      const headTextH = 14 + titleLines.length * 19 + subLines.length * 14 + 6 + groupLines.length * 13 + 10 + tileH;
      const headH = Math.max(imgH, headTextH);
      const explH = pdf.measure(p.explain, { size: T.small, w: innerW, lh: 14 });
      const noteH = p.note ? calloutH(innerW, '', p.note) + 8 : 0;
      const pr = p.price, panelPad = 16;
      let priceH = 0, payLines = [], ownH = 0, incl = [];
      if (pr) {
        payLines = GGPdf.wrap(pr.pay, T.body, false, innerW - panelPad * 2 - (pr.net ? 200 : 0));
        ownH = pr.own ? calloutH(innerW - panelPad * 2, pr.own.title, pr.own.text) + 10 : 0;
        // «Qué incluye» en dos columnas para que cada programa ocupe menos espacio
        const colW = (innerW - panelPad * 2 - 16) / 2 - 12;
        const wrapped = pr.includes.map(([t, d]) => GGPdf.wrap(d ? t + '. ' + d : t, T.small, false, colW));
        incl = [wrapped.filter((_, k) => k % 2 === 0), wrapped.filter((_, k) => k % 2 === 1)];
        pr.inclH = Math.max(...incl.map(col => col.reduce((s, l) => s + l.length * 13 + 5, 0)));
        pr.colW = colW;
        priceH = panelPad * 2 + 20 + (pr.net ? Math.max(66, payLines.length * 14 + 8) : payLines.length * 14 + 10) + ownH + (pr.minNote ? 18 : 0) + 24 + pr.inclH + 2;
      } else if (p.pending) priceH = calloutH(innerW, '', p.pending);
      const total = pad + headH + 14 + explH + 8 + noteH + priceH + pad;
      ensure(Math.min(total, 380));
      if (y + total > BOTTOM) newPage();
      const top = y;
      pdf.rect(M, top, CW, total, { fill: C.white, stroke: C.line, lw: 0.8, r: 12 });
      let yy = top + pad;
      if (photo) {
        pdf.image(photo, M + pad, yy, imgW, imgH);
        pdf.rect(M + pad, yy, imgW, imgH, { stroke: C.line, lw: 0.6 });
      }
      let ty = yy + 12;
      pdf.text(textX, ty, p.eyebrow, { size: T.tiny, bold: true, color: C.plum });
      if (p.planTag) {
        const w = GGPdf.textWidth(p.planTag, T.tiny, true) + 18;
        pdf.rect(textX + textW - w, ty - 12, w, 17, { fill: C.plum, r: 8.5 });
        pdf.text(textX + textW - w / 2, ty, p.planTag, { size: T.tiny, bold: true, color: C.white, align: 'center' });
      }
      ty += 5;
      titleLines.forEach(ln => { ty += 19; pdf.text(textX, ty - 4, ln, { size: 14, bold: true, color: C.plumDark }); });
      subLines.forEach(ln => { ty += 14; pdf.text(textX, ty - 3, ln, { size: T.small, color: C.muted }); });
      ty += 6;
      groupLines.forEach(ln => { ty += 13; pdf.text(textX, ty - 3, ln, { size: T.tiny, color: C.plum }); });
      ty += 10;
      p.tiles.forEach((t, i) => {
        const x = textX + i * (tileW + tileGap);
        pdf.rect(x, ty, tileW, tileH, { fill: C.soft, r: 7 });
        pdf.text(x + 10, ty + 23, t.v, { size: 18, bold: true, color: C.plumDark });
        GGPdf.wrap(t.l, T.tiny, false, tileW - 16).slice(0, 2).forEach((ln, k) => pdf.text(x + 10, ty + 35 + k * 10.5, ln, { size: T.tiny, color: C.muted }));
      });
      yy += headH + 14;
      pdf.paragraph(M + pad, yy + T.small, p.explain, { size: T.small, color: C.muted, w: innerW, lh: 14 });
      yy += explH + 8;
      if (p.note) { const h = callout(M + pad, innerW, yy, '', p.note, 'amber'); yy += h + 8; }
      if (pr) {
        pdf.rect(M + pad, yy, innerW, priceH, { fill: C.plumWash, r: 9 });
        let py = yy + panelPad;
        pdf.text(M + pad + panelPad, py + 11, 'Modalidad: ' + pr.planName, { size: 11, bold: true, color: C.plumDark });
        py += 20;
        if (pr.net) {
          pdf.text(M + pad + panelPad, py + 11, 'Inversión sin IVA', { size: T.small, color: C.muted });
          pdf.text(M + pad + panelPad, py + 38, pr.net, { size: 24, bold: true, color: C.plumDark });
          pdf.text(M + pad + panelPad, py + 55, 'Con IVA: ' + pr.withIva, { size: T.small, color: C.muted });
        }
        payLines.forEach((ln, i) => pdf.text(M + pad + panelPad + (pr.net ? 200 : 0), py + (pr.net ? 15 : 11) + i * 14, ln, { size: T.body, color: C.ink }));
        py += pr.net ? Math.max(66, payLines.length * 14 + 8) : payLines.length * 14 + 10;
        if (pr.own) { const h = callout(M + pad + panelPad, innerW - panelPad * 2, py + 2, pr.own.title, pr.own.text, 'mint'); py += h + 10; }
        if (pr.minNote) { pdf.text(M + pad + panelPad, py + 11, pr.minNote, { size: T.small, color: C.amberDark }); py += 18; }
        pdf.text(M + pad + panelPad, py + 13, 'Qué incluye', { size: T.body, bold: true, color: C.plumDark });
        py += 24;
        incl.forEach((col, ci) => {
          const cx = M + pad + panelPad + ci * (pr.colW + 28);
          let cy = py;
          col.forEach(lines => {
            pdf.text(cx, cy + 9, '•', { size: T.small, color: C.plum });
            lines.forEach((ln, i) => pdf.text(cx + 11, cy + 9 + i * 13, ln, { size: T.small, color: C.muted }));
            cy += lines.length * 13 + 5;
          });
        });
      } else if (p.pending) callout(M + pad, innerW, yy, '', p.pending, 'amber');
      y = top + total + 16;
    }

    // ---------- Pagos mes a mes ----------
    if (model.pay && model.pay.table) {
      const t = model.pay.table;
      heading('Pagos mes a mes', (model.pay && model.pay.note) || 'Precios en quetzales enteros.', 100);
      const n = t.head.length, firstW = n === 2 ? CW - 140 : 74, lastW = n === 2 ? 140 : 80, midW = (CW - firstW - lastW) / Math.max(1, n - 2);
      const widths = t.head.map((_, i) => i === 0 ? firstW : i === n - 1 ? lastW : midW);
      const headLines = t.head.map((h, i) => GGPdf.wrap(h, T.small, true, widths[i] - 12));
      const headH = Math.max(...headLines.map(l => l.length)) * 12 + 12;
      const drawHead = () => {
        ensure(headH + 20);
        pdf.rect(M, y, CW, headH, { fill: C.plumWash });
        let x = M;
        headLines.forEach((lines, i) => {
          lines.forEach((ln, k) => pdf.text(i === 0 ? x + 8 : x + widths[i] - 8, y + 15 + k * 12, ln, { size: T.small, bold: true, color: C.plumDark, align: i === 0 ? 'left' : 'right' }));
          x += widths[i];
        });
        y += headH;
      };
      drawHead();
      t.rows.forEach((row, ri) => {
        if (y + 19 > BOTTOM) { newPage(); drawHead(); }
        if (ri % 2) pdf.rect(M, y, CW, 19, { fill: C.soft });
        let x = M;
        row.forEach((cell, i) => {
          const last = i === n - 1;
          pdf.text(i === 0 ? x + 8 : x + widths[i] - 8, y + 13.5, cell, { size: T.small, bold: last || i === 0, color: last ? C.plumDark : C.ink, align: i === 0 ? 'left' : 'right' });
          x += widths[i];
        });
        y += 19;
      });
      pdf.line(M, y, M + CW, y, C.line);
      y += 18;
    }

    // ---------- Proyección por estudiante (solo si la institución la pidió) ----------
    if (model.sim) {
      heading('Proyección por estudiante', model.sim.lead, 160);
      model.sim.items.forEach(it => {
        const pad = 14, innerW = CW - pad * 2;
        const ownH = it.own ? calloutH(innerW, it.own.title, it.own.text) + 10 : 0;
        const headLines = GGPdf.wrap(it.head, T.body, false, innerW);
        const listLines = (it.list || []).flatMap(l => GGPdf.wrap('•  ' + l, T.small, false, innerW - 6)), listH = listLines.length ? listLines.length * 13.5 + 10 : 0;
        const h = pad + 22 + listH + ownH + headLines.length * 15 + 10 + it.rows.length * 21 + 8 + pad;
        ensure(h + 8);
        pdf.rect(M, y, CW, h, { fill: C.white, stroke: C.line, lw: 0.8, r: 10 });
        let yy = y + pad;
        pdf.text(M + pad, yy + 13, it.title, { size: 12, bold: true, color: C.plumDark }); yy += 22;
        listLines.forEach((ln, k) => pdf.text(M + pad + 4, yy + 10 + k * 13.5, ln, { size: T.small, color: C.muted })); if (listLines.length) yy += listH;
        headLines.forEach((ln, k) => pdf.text(M + pad, yy + 11 + k * 15, ln, { size: T.body, color: C.ink })); yy += headLines.length * 15 + 10;
        if (it.own) { const oh = callout(M + pad, innerW, yy, it.own.title, it.own.text, 'mint'); yy += oh + 10; }
        let zi = 0;
        it.rows.forEach(r => {
          if (r[1] === null) { pdf.text(M + pad + 4, yy + 12, r[0], { size: T.small, bold: true, color: C.plumDark }); yy += 21; zi = 0; return; }
          if (zi++ % 2 === 0) pdf.rect(M + pad, yy - 2, innerW, 21, { fill: C.soft, r: 4 });
          pdf.text(M + pad + 10, yy + 12, r[0], { size: T.small, color: C.muted });
          pdf.text(M + pad + innerW - 10, yy + 12, r[1], { size: T.body, bold: true, color: r[2] ? C.mintDark : C.plumDark, align: 'right' });
          yy += 21;
        });
        y += h + 12;
      });
      para(model.sim.note, { size: T.small, lh: 14, color: C.muted });
    }

    return pdf.build(model.title, (n, total, p) => {
      p.rect(0, 836, p.W * 0.4, 6, { fill: C.plumDark }); p.rect(p.W * 0.4, 836, p.W * 0.3, 6, { fill: C.coral }); p.rect(p.W * 0.7, 836, p.W * 0.3, 6, { fill: C.sky });
      p.line(M, 806, M + CW, 806, C.line);
      p.text(M, 821, 'GuateGeeks · Propuesta educativa · Precios estimados; la cotización final la confirma GuateGeeks', { size: 8.5, color: C.muted });
      p.text(M + CW, 821, `Página ${n} de ${total}`, { size: 8.5, color: C.muted, align: 'right' });
    }, opts);
  }

  return { build };
});
