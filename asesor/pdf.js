/*
 * Escritor mínimo de PDF, sin dependencias: texto Helvetica, rectángulos, líneas e imágenes JPEG.
 * Coordenadas en puntos, con el origen arriba a la izquierda (y crece hacia abajo).
 * Se usa en el navegador (window.GGPdf) y en Node (require) para probarlo.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GGPdf = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PAGE_W = 595, PAGE_H = 842;

  // Anchos de Helvetica (milésimas de em) para ASCII 32..126.
  const REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  const BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  const ACCENT = { 'áàâäã': 'a', 'éèêë': 'e', 'íìîï': 'i', 'óòôöõ': 'o', 'úùûü': 'u', 'ñ': 'n', 'ÁÀÂÄÃ': 'A', 'ÉÈÊË': 'E', 'ÍÌÎÏ': 'I', 'ÓÒÔÖÕ': 'O', 'ÚÙÛÜ': 'U', 'Ñ': 'N' };
  const BASE = {};
  Object.keys(ACCENT).forEach(k => { for (const ch of k) BASE[ch] = ACCENT[k]; });

  // Texto de JavaScript a bytes WinAnsi (cp1252), que es lo que entiende Helvetica estándar.
  const REPLACE = { '–': '-', '—': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '…': '...', '→': '>', '←': '<', '✓': '', '•': String.fromCharCode(0x95), '×': '×', '≈': '~', ' ': ' ' };
  function toWin(str) {
    let out = '';
    for (const ch of String(str)) {
      const c = REPLACE[ch] !== undefined ? REPLACE[ch] : ch;
      for (const x of c) out += x.charCodeAt(0) < 256 ? x : '?';
    }
    return out;
  }
  function charW(ch, bold) {
    const t = bold ? BOLD : REG, code = ch.charCodeAt(0);
    if (code >= 32 && code <= 126) return t[code - 32];
    if (BASE[ch]) return t[BASE[ch].charCodeAt(0) - 32];
    if (ch === '¿' || ch === '¡') return bold ? 611 : 556;
    if (ch === '·') return 278;
    if (code === 0x95) return 350;
    if (ch === '×') return 584;
    return bold ? 611 : 556;
  }
  function textWidth(str, size, bold) {
    let w = 0;
    for (const ch of toWin(str)) w += charW(ch, bold);
    return w * size / 1000;
  }
  // Parte un texto en líneas que caben en maxW.
  function wrap(str, size, bold, maxW) {
    const lines = [];
    String(str).split('\n').forEach(par => {
      let line = '';
      par.split(/\s+/).filter(Boolean).forEach(word => {
        const test = line ? line + ' ' + word : word;
        if (textWidth(test, size, bold) <= maxW || !line) line = test;
        else { lines.push(line); line = word; }
      });
      lines.push(line);
    });
    return lines;
  }

  const esc = s => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const num = n => (Math.round(n * 100) / 100).toString();
  function rgb(hex) {
    const h = hex.replace('#', '');
    return [0, 2, 4].map(i => num(parseInt(h.slice(i, i + 2), 16) / 255)).join(' ');
  }
  const bytes = s => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };

  // Lee ancho, alto y componentes de un JPEG.
  function jpegInfo(u8) {
    if (u8[0] !== 0xFF || u8[1] !== 0xD8) throw new Error('No es un JPEG');
    let i = 2;
    while (i < u8.length) {
      if (u8[i] !== 0xFF) { i++; continue; }
      const m = u8[i + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return { h: (u8[i + 5] << 8) | u8[i + 6], w: (u8[i + 7] << 8) | u8[i + 8], comps: u8[i + 9] };
      }
      i += 2 + ((u8[i + 2] << 8) | u8[i + 3]);
    }
    throw new Error('JPEG sin dimensiones');
  }

  function create() {
    const pages = [], images = [];
    let page = null;
    const Y = y => PAGE_H - y;
    const add = op => page.ops.push(op);

    function roundPath(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      const k = 0.5523 * r, X2 = x + w, Yt = Y(y), Yb = Y(y + h);
      return [
        `${num(x + r)} ${num(Yt)} m`, `${num(X2 - r)} ${num(Yt)} l`,
        `${num(X2 - r + k)} ${num(Yt)} ${num(X2)} ${num(Yt - r + k)} ${num(X2)} ${num(Yt - r)} c`,
        `${num(X2)} ${num(Yb + r)} l`,
        `${num(X2)} ${num(Yb + r - k)} ${num(X2 - r + k)} ${num(Yb)} ${num(X2 - r)} ${num(Yb)} c`,
        `${num(x + r)} ${num(Yb)} l`,
        `${num(x + r - k)} ${num(Yb)} ${num(x)} ${num(Yb + r - k)} ${num(x)} ${num(Yb + r)} c`,
        `${num(x)} ${num(Yt - r)} l`,
        `${num(x)} ${num(Yt - r + k)} ${num(x + r - k)} ${num(Yt)} ${num(x + r)} ${num(Yt)} c`, 'h'
      ].join('\n');
    }

    const api = {
      W: PAGE_W, H: PAGE_H,
      addPage() { page = { ops: [], imgs: new Set() }; pages.push(page); return pages.length; },
      pageCount: () => pages.length,
      rect(x, y, w, h, { fill, stroke, lw = 0.8, r = 0 } = {}) {
        if (!fill && !stroke) return;
        add('q');
        if (fill) add(`${rgb(fill)} rg`);
        if (stroke) add(`${rgb(stroke)} RG ${num(lw)} w`);
        add(r ? roundPath(x, y, w, h, r) : `${num(x)} ${num(Y(y + h))} ${num(w)} ${num(h)} re`);
        add(fill && stroke ? 'B' : fill ? 'f' : 'S');
        add('Q');
      },
      line(x1, y1, x2, y2, color = '#e5dfe9', lw = 0.8) {
        add(`q ${rgb(color)} RG ${num(lw)} w ${num(x1)} ${num(Y(y1))} m ${num(x2)} ${num(Y(y2))} l S Q`);
      },
      // y es la línea base del texto. align: left | right | center
      text(x, y, str, { size = 10, bold = false, color = '#302b3d', align = 'left' } = {}) {
        const w = textWidth(str, size, bold);
        const px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
        add(`BT /${bold ? 'F2' : 'F1'} ${num(size)} Tf ${rgb(color)} rg ${num(px)} ${num(Y(y))} Td (${esc(toWin(str))}) Tj ET`);
        return w;
      },
      // Devuelve las líneas escritas y la altura usada.
      paragraph(x, y, str, { size = 10, bold = false, color = '#302b3d', w = 400, lh } = {}) {
        const lines = wrap(str, size, bold, w), step = lh || size * 1.45;
        lines.forEach((ln, i) => api.text(x, y + i * step, ln, { size, bold, color }));
        return lines.length * step;
      },
      measure(str, { size = 10, bold = false, w = 400, lh } = {}) { return wrap(str, size, bold, w).length * (lh || size * 1.45); },
      // JPEG (Uint8Array) o imagen cruda: { w, h, comps: 3, data, filter?, smask?: { data, filter? } }
      addImage(src) {
        if (src instanceof Uint8Array) images.push({ data: src, ...jpegInfo(src), filter: 'DCTDecode' });
        else images.push({ comps: 3, filter: null, ...src });
        return images.length;
      },
      image(id, x, y, w, h) {
        page.imgs.add(id);
        add(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(Y(y + h))} cm /Im${id} Do Q`);
      },
      // Se llama una vez al final; permite dibujar pie de página con el total de páginas.
      // opts.only: genera un PDF con una sola página (solo para revisar el diseño en pruebas).
      build(title, onEachPage, opts = {}) {
        const totalPages = pages.length;
        if (onEachPage) pages.forEach((p, i) => { page = p; onEachPage(i + 1, totalPages, api); });
        if (opts.only) pages.splice(0, pages.length, ...pages.filter((_, i) => i + 1 === opts.only));
        const chunks = [], offsets = [];
        let pos = 0;
        const push = b => { const u = typeof b === 'string' ? bytes(b) : b; chunks.push(u); pos += u.length; };
        const begin = n => { offsets[n] = pos; push(`${n} 0 obj\n`); };
        const end = () => push('endobj\n');
        let next = 5;
        images.forEach(im => { im.obj = next++; if (im.smask) im.smaskObj = next++; });
        const firstPage = next;
        const pageObj = i => firstPage + i * 2 + 1, contentObj = i => firstPage + i * 2;
        const total = firstPage + pages.length * 2 - 1;

        push('%PDF-1.4\n%âãÏÓ\n');
        begin(1); push('<< /Type /Catalog /Pages 2 0 R >>\n'); end();
        begin(2); push(`<< /Type /Pages /Kids [${pages.map((_, i) => pageObj(i) + ' 0 R').join(' ')}] /Count ${pages.length} >>\n`); end();
        begin(3); push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\n'); end();
        begin(4); push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\n'); end();
        images.forEach(im => {
          if (im.smask) {
            begin(im.smaskObj);
            push(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceGray /BitsPerComponent 8${im.smask.filter ? ' /Filter /' + im.smask.filter : ''} /Length ${im.smask.data.length} >>\nstream\n`);
            push(im.smask.data); push('\nendstream\n'); end();
          }
          begin(im.obj);
          push(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace ${im.comps === 1 ? '/DeviceGray' : '/DeviceRGB'} /BitsPerComponent 8${im.filter ? ' /Filter /' + im.filter : ''}${im.smask ? ' /SMask ' + im.smaskObj + ' 0 R' : ''} /Length ${im.data.length} >>\nstream\n`);
          push(im.data); push('\nendstream\n'); end();
        });
        pages.forEach((p, i) => {
          const content = p.ops.join('\n');
          begin(contentObj(i)); push(`<< /Length ${content.length} >>\nstream\n`); push(content); push('\nendstream\n'); end();
          const xo = [...p.imgs].map(id => `/Im${id} ${images[id - 1].obj} 0 R`).join(' ');
          begin(pageObj(i));
          push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xo ? ` /XObject << ${xo} >>` : ''} >> /Contents ${contentObj(i)} 0 R >>\n`);
          end();
        });
        const info = total + 1;
        begin(info); push(`<< /Title (${esc(toWin(title || 'Propuesta'))}) /Producer (GuateGeeks Asesor) >>\n`); end();
        const xref = pos;
        push(`xref\n0 ${info + 1}\n0000000000 65535 f \n`);
        for (let n = 1; n <= info; n++) push(String(offsets[n]).padStart(10, '0') + ' 00000 n \n');
        push(`trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
        const out = new Uint8Array(pos); let o = 0;
        chunks.forEach(c => { out.set(c, o); o += c.length; });
        return out;
      }
    };
    return api;
  }

  // Separa píxeles RGBA en canal de color y de transparencia (sin comprimir).
  function splitRGBA(rgba, w, h) {
    const rgb = new Uint8Array(w * h * 3), alpha = new Uint8Array(w * h);
    for (let i = 0, p = 0, q = 0; i < w * h; i++, p += 4, q += 3) { rgb[q] = rgba[p]; rgb[q + 1] = rgba[p + 1]; rgb[q + 2] = rgba[p + 2]; alpha[i] = rgba[p + 3]; }
    return { rgb, alpha };
  }

  return { create, textWidth, wrap, toWin, jpegInfo, splitRGBA, PAGE_W, PAGE_H };
});
