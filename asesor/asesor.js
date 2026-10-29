'use strict';
/*
 * Interfaz del asesor GuateGeeks (diseño 2.1). La lógica de cálculo vive en motor.js
 * y los datos editables en config.js; aquí solo se dibuja y se guarda el borrador.
 */
const { LEVELS, PROGRAMS, PLANS, TARIFFS, FISCAL, GUIDANCE, SOCRATES, PHOTOS } = window.GG_CONFIG;
const M = window.GGMotor;
const KEY = 'gg_asesor_v1';

// ---------- Estado y borrador ----------
const initial = () => ({ v: 1, step: 0, levels: [], enroll: {}, levelIndex: 0, selected: [], selectedIndex: 0, fee: null, useSuggested: true, iva: false, skipped: [] });
let state = initial();
const ui = { assign: false, assignSeen: '', assignSel: {}, review: false, single: false, lb: null, notice: '', photoIdx: {}, sub: 0, focusTitle: false, labLevel: 'bas', preview: null };
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const obj = JSON.parse(raw);
    if (obj && obj.v === 1 && Array.isArray(obj.levels) && Array.isArray(obj.selected) && obj.enroll && typeof obj.enroll === 'object') state = { ...initial(), ...obj };
    else ui.notice = 'Tu avance guardado era de otra versión y se reinició.';
  }
} catch (e) {
  ui.notice = 'No se pudo leer tu avance guardado; se empezó uno nuevo.';
}
Object.values(state.enroll || {}).forEach(g => { if (g && Array.isArray(g.sections)) g.sections.forEach((s, i) => { s.name = String.fromCharCode(65 + (i % 26)); }); });
let agentHostVersion = 0, agentHostSignature = JSON.stringify(state), agentHostRendering = false;
function store() {
  const signature = JSON.stringify(state);
  if (signature !== agentHostSignature) {
    agentHostVersion++; agentHostSignature = signature;
    window.dispatchEvent(new CustomEvent('gg:quote-changed'));
  }
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* almacenamiento no disponible: el recorrido sigue funcionando */ }
}

// ---------- Utilidades ----------
const $ = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const Q = n => 'Q' + Math.round(n).toLocaleString('es-GT');
const findL = id => LEVELS.find(x => x.id === id);
const findP = id => PROGRAMS.find(x => x.id === id);
const planOf = id => PLANS.find(x => x.id === id) || PLANS[0];
const gradeName = id => LEVELS.flatMap(l => l.grades).find(g => g[0] === id)?.[1] || id;
// Un programa puede abarcar varios niveles (p. ej. SPIKE Prime: 6.º Primaria, Básico y Bachillerato).
const entryLevels = s => LEVELS.filter(l => entryGroups(s).some(g => g.levelId === l.id));
const joinY = list => list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' y ' + list[list.length - 1];
const levelsLabel = s => joinY(entryLevels(s).map(l => l.name));
const levelKey = s => { const l = entryLevels(s); return l.length === 1 ? l[0].id : 'all'; };
const progTitle = s => findP(s.programId).name + ' · ' + levelsLabel(s);
const plural = (n, one, many) => n === 1 ? one : many;
const uid = () => Math.random().toString(36).slice(2, 7);

const ICONS = {
  robot: '<rect x="5" y="7" width="14" height="12" rx="4"/><path d="M12 3v4M2 11v5M22 11v5M9 22v-3M15 22v-3"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M9 16h6"/>',
  drone: '<path d="m8 8 8 8m0-8-8 8"/><circle cx="6" cy="6" r="4"/><circle cx="18" cy="6" r="4"/><circle cx="6" cy="18" r="4"/><circle cx="18" cy="18" r="4"/><rect x="9" y="9" width="6" height="6" rx="2"/>',
  circuit: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 2v5M14 2v5M10 17v5M14 17v5M2 10h5M2 14h5M17 10h5M17 14h5M10 10h4v4h-4z"/>',
  vr: '<path d="M5 6h14l2 3v8h-6l-3-3-3 3H3V9zM7 10h2m6 0h2M3 10H1m20 0h2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6M17 2v6M3 11h18M7 15h2M12 15h2M7 18h2"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  rotateLeft: '<path d="M4 10a8 8 0 1 1 2 9M4 4v6h6"/>',
  rotateRight: '<path d="M20 10a8 8 0 1 0-2 9M20 4v6h-6"/>',
  minus: '<path d="M5 12h14"/>', home: '<path d="m4 11 8-7 8 7M6 10v10h12V10M10 20v-6h4v6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>', check: '<path d="m5 12 4 4L19 6"/>',
  photo: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.4"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="m14 5 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/>',
  trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  school: '<path d="m3 9 9-6 9 6M5 9v12h14V9M10 21v-6h4v6M8 11h.01M16 11h.01"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 4v2"/>',
  book: '<path d="M12 5v16M3 4c5-1 7 0 9 1 2-1 4-2 9-1v15c-5-1-7 0-9 1-2-1-4-2-9-1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>', file: '<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h8"/>',
  send: '<path d="m22 2-11 11M22 2l-7 20-4-9-9-4z"/>',
  chart: '<path d="M4 20V11M10 20V4M16 20v-6M22 20H2"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M10 4v16M5.5 8h2M5.5 11h2"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.grid}</svg>`;

// ---------- Datos derivados (todo sale del motor) ----------
const groups = () => M.groupsOf(state.enroll, LEVELS, state.levels);
const activeLevels = () => LEVELS.filter(l => state.levels.includes(l.id));
const compatible = (p, g) => p.grades.includes(g.gradeId);
const entryGroups = s => groups().filter(g => s.groupIds.includes(g.id));
const participation = s => entryGroups(s).reduce((n, g) => n + (g.students || 0), 0);
const registered = () => groups().reduce((n, g) => n + (g.students || 0), 0);
const selectedParticipants = () => M.uniqueStudents(groups(), [...new Set(state.selected.flatMap(s => s.groupIds))]);
const hasStudents = () => groups().some(g => g.students > 0);
const keyOf = (id, level) => id + '@' + level;
const unitsOf = s => M.effectiveUnits(s, findP(s.programId), groups());
const analysis = s => {
  const p = findP(s.programId);
  return M.analyze({ groups: entryGroups(s), ratio: p.ratio, units: unitsOf(s), sharing: s.sharing, simIds: s.simIds });
};
const sectionsOf = gid => M.gradeData(state.enroll, gid).sections;

function ensureGrade(gid) {
  if (!state.enroll[gid]) state.enroll[gid] = JSON.parse(JSON.stringify(M.gradeData(state.enroll, gid)));
  return state.enroll[gid];
}
// Quita de las propuestas los grupos que ya no existen y los programas que se quedan sin grupos.
function pruneEntries() {
  const valid = new Set(groups().map(g => g.id));
  state.selected.forEach(s => { s.groupIds = s.groupIds.filter(id => valid.has(id)); s.simIds = s.simIds.filter(id => s.groupIds.includes(id)); });
  state.selected = state.selected.filter(s => s.groupIds.length);
  state.selectedIndex = Math.min(state.selectedIndex, Math.max(0, state.selected.length - 1));
}

// ---------- Fotografías por nivel ----------
const gallery = (pid, level) => { const all = PHOTOS[pid] || []; const f = all.filter(x => x.levels.includes(level)); return f.length ? f : all; };
function photoState(pid, level) {
  const gl = gallery(pid, level);
  const i = gl.length ? (ui.photoIdx[pid + '@' + level] || 0) % gl.length : 0;
  return { gl, i, ph: gl[i] };
}
// Galería: flechas para cambiar de foto y clic para ampliar (cierra con la X, Esc o fuera de la foto).
// Una foto que no carga (red lenta o poca memoria en el celular) se reintenta una vez; si vuelve a fallar se oculta el ícono roto.
document.addEventListener('error', e => {
  const img = e.target; if (!img || img.tagName !== 'IMG' || !img.closest('.product-media, .small-photo, .lc-photo')) return;
  if (!img.dataset.retried) { img.dataset.retried = '1'; const base = img.src.split('?')[0]; setTimeout(() => { img.src = base + '?r=' + Date.now(); }, 1500); return; }
  img.closest('.product-media, .small-photo, .lc-photo').classList.add('img-failed');
}, true);
document.addEventListener('load', e => { const img = e.target; if (img && img.tagName === 'IMG') img.closest('.img-failed')?.classList.remove('img-failed'); }, true);
function paintPhoto(k) {
  const [pid, level] = k.split('@'), { gl, i, ph } = photoState(pid, level);
  document.querySelectorAll(`[data-media="${k}"]`).forEach(box => {
    const img = box.querySelector('img'); img.src = ph.src; img.alt = ph.alt;
    const c = box.querySelector('.media-count'); if (c) c.textContent = (i + 1) + '/' + gl.length;
    const b = box.querySelector('.media-badge'); if (b) { b.textContent = ph.caption || ''; b.hidden = !ph.caption; }
  });
  if (ui.lb && ui.lb.pid === pid && ui.lb.level === level) paintLightbox();
}
function shiftPhoto(pid, level, d) {
  if (!pid && ui.lb) ({ pid, level } = ui.lb);
  const gl = gallery(pid, level); if (gl.length < 2) return;
  const k = pid + '@' + level;
  ui.photoIdx[k] = ((ui.photoIdx[k] || 0) + d + gl.length) % gl.length;
  paintPhoto(k);
}
function paintLightbox() {
  const { pid, level } = ui.lb, { gl, i, ph } = photoState(pid, level);
  const img = document.getElementById('lb-img'); img.src = ph.src; img.alt = ph.alt;
  document.getElementById('lb-cap').textContent = findP(pid).hardware + (gl.length > 1 ? ' · foto ' + (i + 1) + ' de ' + gl.length : '') + (ph.caption ? ' · ' + ph.caption : '');
  document.querySelectorAll('#lightbox .media-nav').forEach(b => b.hidden = gl.length < 2);
}
function openPhoto(pid, level) { ui.lb = { pid, level }; paintLightbox(); document.getElementById('lightbox').showModal(); }
function closePhoto() { const d = document.getElementById('lightbox'); if (d.open) d.close(); ui.lb = null; }
function media(p, level, mode = 'normal', withAction = true) {
  const { gl, i, ph } = photoState(p.id, level);
  if (!ph) return `<div class="product-media ${mode}"><div class="photo-placeholder"><span class="photo-icon">${icon('photo')}</span><b>${esc(p.hardware)}</b><small>Fotografía por incorporar</small></div></div>`;
  const many = withAction && gl.length > 1;
  return `<div class="product-media ${mode}" data-media="${p.id}@${level}"><button type="button" class="media-open" onclick="openPhoto('${p.id}','${level}')" aria-label="Ampliar la fotografía de ${esc(p.hardware)}"><img src="${ph.src}" width="900" height="600" alt="${esc(ph.alt)}" decoding="async" loading="lazy"></button><span class="media-badge" ${ph.caption ? '' : 'hidden'}>${esc(ph.caption || '')}</span>${many ? `<button type="button" class="media-nav prev" onclick="shiftPhoto('${p.id}','${level}',-1)" aria-label="Foto anterior de ${esc(p.hardware)}">‹</button><button type="button" class="media-nav next" onclick="shiftPhoto('${p.id}','${level}',1)" aria-label="Foto siguiente de ${esc(p.hardware)}">›</button><span class="media-count" aria-hidden="true">${i + 1}/${gl.length}</span>` : ''}</div>`;
}
const miniature = s => { const { ph } = photoState(s.programId, levelKey(s)); return `<span class="small-photo">${ph ? `<img src="${ph.src}" alt="" width="40" height="40">` : icon('photo')}</span>`; };

// ---------- Navegación y marco ----------
let previousStep = -1, toastTimer;
function notify(message) { const t = document.getElementById('notification'); t.textContent = message; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 4200); }
function canStep(n) { return n === 1 || (n === 2 && state.levels.length > 0) || (n === 3 && hasStudents()) || (n >= 4 && state.selected.length > 0); }
function step(n) {
  n = Math.max(0, Math.min(5, n));
  if (n === 4 && state.step !== 4) pickConfigTarget();
  if (n === 3) { const p = assignPending(), sig = p.map(g => g.id).join(); if (p.length && sig !== ui.assignSeen) { ui.assign = true; ui.assignSeen = sig; } else if (!p.length) ui.assign = false; }
  state.step = n; render();
}
function start() { step(1); }
// Confirmación propia (los cuadros nativos pueden estar bloqueados en algunos navegadores).
function askChoice(title, text, choices) {
  const d = document.getElementById('confirm'), box = document.getElementById('cf-actions');
  document.getElementById('cf-title').textContent = title; document.getElementById('cf-text').textContent = text;
  box.innerHTML = '';
  choices.forEach((c, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (c.primary ? 'btn-primary' : 'btn-outline'); b.textContent = c.label;
    b.onclick = () => { d.close(); if (c.fn) c.fn(); }; box.appendChild(b);
  });
  d.showModal(); box.querySelector('button').focus();
}
function askConfirm(title, text, yesLabel, onYes) {
  askChoice(title, text, [{ label: 'Cancelar' }, { label: yesLabel, primary: true, fn: onYes }]);
}
function resetAll() {
  askConfirm('¿Empezar de nuevo?', 'Se borrarán los niveles, estudiantes y programas que llevas. Esta acción no se puede deshacer.', 'Sí, borrar todo', () => {
    state = initial(); ui.photoIdx = {}; ui.sub = 0;
    try { localStorage.removeItem(KEY); } catch (e) { /* sin almacenamiento */ }
    render(); notify('Empezaste una propuesta nueva.');
  });
}

function updateHeader() {
  document.querySelector('.top').innerHTML = `<div class="top-inner"><button class="brand" onclick="step(0)" aria-label="GuateGeeks, ir al inicio"><img src="../assets/brand/guategeeks-logo-horizontal.png" alt="GuateGeeks" width="185" height="38"></button><div style="flex:1"></div><div class="top-right">${state.step >= 1 ? campusToggleButton() : ''}</div></div>`;
  const n = document.getElementById('notice');
  n.hidden = !ui.notice; n.querySelector('span').textContent = ui.notice;
}
// Redibuja la pantalla sin mover al usuario: se fija la altura mientras se cambia el contenido
// (para que el navegador no recorte el desplazamiento) y solo se sube al inicio al cambiar de paso.
function html(markup) {
  const changed = previousStep !== state.step || ui.focusTitle, y = window.scrollY; ui.focusTitle = false;
  const panelScroll = $.querySelector('.main-panel')?.scrollTop || 0;
  const active = document.activeElement;
  const focusAttribute = !changed && active?.closest('.main-panel') && ['id', 'onclick', 'onchange', 'aria-label'].find(name => active.hasAttribute(name));
  const focusValue = focusAttribute ? active.getAttribute(focusAttribute) : null;
  if (!changed) $.style.minHeight = $.offsetHeight + 'px';
  if (lab) { lab.dispose(); lab = null; labOpen = false; }
  $.classList.toggle('landing', state.step === 0);
  $.innerHTML = markup; updateHeader(); store(); placeMascot(); placeDuck(); placeProgressLine();
  if (changed) {
    $.style.minHeight = '';
    window.scrollTo(0, 0);
    const h = $.querySelector('h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  } else {
    const panel = $.querySelector('.main-panel'); if (panel) panel.scrollTop = panelScroll;
    if (focusAttribute) [...$.querySelectorAll('.main-panel [' + focusAttribute + ']')].find(el => el.getAttribute(focusAttribute) === focusValue)?.focus({ preventScroll: true });
    window.scrollTo(0, y);
    requestAnimationFrame(() => { $.style.minHeight = ''; });
  }
  previousStep = state.step;
  if (changed && state.step > 0 && !animPaused && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $.querySelector('.step-title')?.animate([{ opacity: .5, transform: 'translateX(12px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 280, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
}
// Pato robot que acompaña el avance: espera sobre el paso actual y, al cambiar de paso, sale corriendo hacia el siguiente.
const DUCK_SVG = `<svg viewBox="0 0 64 64" width="46" height="46" focusable="false"><ellipse class="d-shadow" cx="32" cy="60" rx="15" ry="3" fill="#241d38" opacity=".22"/>
<g class="d-leg l"><rect x="22" y="49" width="6" height="9" rx="3" fill="#ef8556"/><rect x="19" y="56" width="12" height="4" rx="2" fill="#ef8556"/></g><g class="d-leg r"><rect x="36" y="49" width="6" height="9" rx="3" fill="#ef8556"/><rect x="33" y="56" width="12" height="4" rx="2" fill="#ef8556"/></g>
<g class="d-body"><ellipse cx="30" cy="38" rx="19" ry="15" fill="#ffd36e"/><ellipse cx="30" cy="45" rx="15" ry="8" fill="#f5b942" opacity=".55"/>
<g class="d-wing"><path d="M18 36c4-6 13-6 17 1-3 7-12 9-17-1z" fill="#f5b942"/><circle cx="26" cy="38" r="2.2" fill="#685599"/></g>
<rect x="10" y="30" width="5" height="9" rx="2.5" fill="#5fbad6"/>
<g class="d-head"><line class="d-ant" x1="43" y1="12" x2="45" y2="3" stroke="#45335f" stroke-width="1.6" stroke-linecap="round"/><circle class="d-ant-b" cx="45.5" cy="3" r="2.6" fill="#5fbad6"/><circle cx="42" cy="22" r="13" fill="#ffd36e"/><rect x="36" y="16" width="18" height="11" rx="5.5" fill="#241d38"/><g class="d-eye"><circle cx="43" cy="21.5" r="2.4" fill="#5fbad6"/><circle cx="49" cy="21.5" r="2.4" fill="#5fbad6"/></g><path d="M52 24c5-1 9 0 9 2.5S57 30 52 29z" fill="#ef8556"/><circle cx="37" cy="29" r="2.4" fill="#ef8556" opacity=".45"/></g></g></svg>`;
let duck3 = null, duckHost = null, duck3Step = 0, progIO = null;
let duckEl = null, duckX = null, duckStep = 0, duckTimer = 0;
function duckTarget(lane) {
  const btn = lane.parentElement.querySelectorAll('.step-nav')[state.step - 1]; if (!btn) return null;
  const slot = btn.querySelector('i') || btn, lr = lane.getBoundingClientRect(), sr = slot.getBoundingClientRect(); return sr.left - lr.left + sr.width / 2;
}
function placeDuckSvg() {
  const lane = document.querySelector('.duck-lane');
  if (!lane || state.step < 1) { duckX = null; duckStep = 0; return; }
  const x = duckTarget(lane); if (x === null) return;
  if (!duckEl) { duckEl = document.createElement('div'); duckEl.className = 'duck wait'; duckEl.innerHTML = DUCK_SVG; }
  lane.appendChild(duckEl);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, moved = duckX !== null && duckStep !== state.step && Math.abs(x - duckX) > 3;
  clearTimeout(duckTimer);
  if (!moved || reduce) { duckEl.style.transition = 'none'; duckEl.style.left = x + 'px'; duckEl.className = 'duck wait'; duckX = x; duckStep = state.step; return; }
  // vuelve a su sitio anterior (la barra se redibujó) y de ahí corre al paso nuevo
  const from = duckX, ms = Math.min(1500, 520 + Math.abs(x - from) * 2.6);
  duckEl.style.transition = 'none'; duckEl.style.left = from + 'px'; duckEl.className = 'duck run' + (x < from ? ' left' : '');
  void duckEl.offsetWidth;
  duckEl.style.transition = 'left ' + ms + 'ms cubic-bezier(.45,.05,.35,1)'; duckEl.style.left = x + 'px';
  duckTimer = setTimeout(() => { if (duckEl) duckEl.className = 'duck wait hop' + (x < from ? ' left' : ''); }, ms);
  duckX = x; duckStep = state.step;
}
window.addEventListener('resize', () => { const lane = document.querySelector('.duck-lane'); if (!lane || !duckEl) return; const x = duckTarget(lane); if (x !== null) { duckEl.style.transition = 'none'; duckEl.style.left = x + 'px'; duckX = x; } });
function progressMarkup() {
  const names = ['Niveles', 'Estudiantes', 'Programas', 'Personalizar', 'Resumen'];
  return `<div class="steps-sticky"><nav class="steps-small" aria-label="Pasos de la propuesta"><span class="duck-lane" aria-hidden="true"></span>${names.map((name, i) => `<button class="step-nav ${state.step === i + 1 ? 'active' : state.step > i + 1 ? 'done' : ''}" onclick="step(${i + 1})" aria-label="Paso ${i + 1}: ${name}" ${state.step === i + 1 ? 'aria-current="step"' : ''} ${canStep(i + 1) ? '' : 'disabled'}><i aria-hidden="true">${state.step > i + 1 ? '✓' : i + 1}</i><span>${name}</span></button>`).join('')}</nav><div class="progress" aria-hidden="true"><div style="width:${state.step * 20}%"></div></div></div>`;
}
function summaryAside() {
  const t = M.proposalTotals(state.selected, PROGRAMS, groups(), TARIFFS, FISCAL);
  // Campus panel (3D view) with the proposal summary as a collapsible pill.
  return `<aside class="side-panel campus-panel" aria-label="Tu colegio y propuesta en vivo"><div id="campus-slot"></div><details class="campus-proposal" ${ui.campusSummary ? 'open' : ''} ontoggle="ui.campusSummary=this.open"><summary>Mi propuesta <span>${state.selected.length} ${plural(state.selected.length, 'programa', 'programas')}</span></summary><div class="campus-proposal-body"><p class="side-summary">${state.selected.length} ${plural(state.selected.length, 'programa elegido', 'programas elegidos')}</p><div class="side-metrics"><div><b data-participants>${selectedParticipants()}</b><small>estudiantes únicos</small></div></div>${state.selected.map((s, i) => { const p = findP(s.programId), r = t.rows[i]; return `<div class="side-item">${miniature(s)}<div style="min-width:0"><b>${esc(p.name)}</b><small>${esc(levelsLabel(s))} · <span data-campus-units="${i}">${p.ratio && r.units ? r.units + ' equipos' : 'por definir'}</span></small><button class="text-btn" onclick="editProgram(${i})" style="font-size:12px;margin-top:3px">${s.plan && s.plan !== 'UNDECIDED' ? esc(planOf(s.plan).tag) + ' · ' : ''}Editar</button></div></div>`; }).join('') || '<p class="campus-empty">Tu propuesta empieza con tus estudiantes. Después podrás agregar los programas.</p>'}<div class="side-actions">${state.selected.length ? `<button class="btn btn-primary" onclick="step(5)">Revisar mi propuesta ${icon('arrow')}</button>` : ''}<button class="btn btn-outline" onclick="resetAll()">Empezar de nuevo</button></div><p class="side-note">${icon('info')} Tu avance se guarda en este navegador. Los precios se confirman con GuateGeeks.</p></div></details></aside>`;
}
function frame(title, description, content) {
  html(`<div class="layout campus-layout"><section class="main-panel">${progressMarkup()}<h1 class="step-title">${title}</h1><p class="step-desc">${description}</p><details class="campus-static-summary"><summary>Resumen del campus en texto <span data-static-digest></span></summary><div data-static-summary></div></details>${content}</section><div class="config-resizer" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Ancho de la configuración. Usa las flechas para ajustarlo; Inicio y Fin para el mínimo y el máximo; Enter restablece." title="Arrastra para ajustar el ancho · doble clic restablece"></div>${summaryAside()}</div>`);
  syncConfigWidth();
}

// ---------- Paso 0: inicio ----------
const LEVEL_LINE = {
  pre: 'Aprenden jugando: guían un robot, siguen secuencias y descubren que programar es crear.',
  prim: 'Construyen, programan y resuelven retos en equipo con robots que cobran vida en el salón.',
  bas: 'Pasan de usar tecnología a crearla: sensores, mecánica y proyectos de ingeniería con propósito.',
  bach: 'Investigan e innovan con electrónica, drones y realidad virtual rumbo a su futuro.'
};
const AREA_LABEL = { 'Experiencias inmersivas': 'Realidad virtual' };
let lab = null;
const labSvg = `<svg class="lab-fallback" viewBox="0 0 620 470" aria-hidden="true" focusable="false">
<ellipse cx="310" cy="392" rx="270" ry="64" fill="#52407a"/><ellipse cx="310" cy="384" rx="270" ry="64" fill="#5d4a88"/><ellipse cx="310" cy="384" rx="246" ry="52" fill="none" stroke="#5fbad6" stroke-opacity=".6" stroke-width="3"/>
<g class="lab-screen"><ellipse cx="108" cy="322" rx="52" ry="12" fill="#2a2340" opacity=".5"/><rect x="62" y="182" width="104" height="82" rx="10" fill="#2a2340" transform="skewY(-6)"/><rect x="70" y="190" width="88" height="62" rx="6" fill="#33284f" transform="skewY(-6)"/><rect x="78" y="198" width="60" height="9" rx="4" fill="#ef8556" transform="skewY(-6)"/><rect x="78" y="214" width="48" height="9" rx="4" fill="#5fbad6" transform="skewY(-6)"/><rect x="78" y="230" width="56" height="9" rx="4" fill="#8e7bbd" transform="skewY(-6)"/><rect x="104" y="262" width="8" height="46" fill="#2a2340"/><rect x="82" y="304" width="52" height="12" rx="6" fill="#f4f0fa"/></g>
<ellipse cx="330" cy="340" rx="150" ry="26" fill="#1b1230" opacity=".45"/>
<g class="lab-robot"><rect x="188" y="236" width="270" height="62" rx="24" fill="#f4f0fa"/><rect x="224" y="168" width="170" height="86" rx="30" fill="#685599"/><rect x="258" y="148" width="104" height="26" rx="13" fill="#ef8556"/><rect x="430" y="248" width="52" height="46" rx="16" fill="#f4f0fa"/><circle cx="470" cy="270" r="13" fill="#2a2340"/><circle cx="472" cy="270" r="7" fill="#5fbad6"/><rect x="214" y="118" width="5" height="56" fill="#2a2340"/><circle cx="216" cy="114" r="12" fill="#ef8556"/>
<g><circle cx="258" cy="306" r="40" fill="#2a2340"/><circle cx="258" cy="306" r="21" fill="#5fbad6"/><circle cx="258" cy="306" r="8" fill="#ef8556"/><circle cx="414" cy="306" r="40" fill="#2a2340"/><circle cx="414" cy="306" r="21" fill="#5fbad6"/><circle cx="414" cy="306" r="8" fill="#ef8556"/></g></g>
<g class="lab-blocks"><rect x="160" y="394" width="64" height="34" rx="12" fill="#ef8556"/><rect x="230" y="394" width="64" height="34" rx="12" fill="#5fbad6"/><rect x="300" y="394" width="64" height="34" rx="12" fill="#8e7bbd"/><rect x="370" y="394" width="64" height="34" rx="12" fill="#f4f0fa"/><path d="M182 411l14-8v16z M262 420v-18m-7 7l7-8 7 8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>
<g class="lab-acc lab-acc-pre"><rect x="498" y="270" width="6" height="86" fill="#f4f0fa"/><path d="M504 272l52 14-52 18z" fill="#ef8556"/><rect x="480" y="352" width="44" height="12" rx="6" fill="#f4f0fa"/></g>
<g class="lab-acc lab-acc-prim"><circle cx="514" cy="300" r="40" fill="#ef8556"/><circle cx="514" cy="300" r="14" fill="#52407a"/><circle cx="568" cy="344" r="26" fill="#5fbad6"/><circle cx="568" cy="344" r="9" fill="#52407a"/></g>
<g class="lab-acc lab-acc-bas"><rect x="518" y="300" width="9" height="62" fill="#2a2340"/><rect x="492" y="268" width="58" height="38" rx="14" fill="#f4f0fa"/><circle cx="500" cy="287" r="9" fill="#5fbad6"/><path d="M470 270q-14 17 0 34M456 262q-24 25 0 48" fill="none" stroke="#5fbad6" stroke-width="4" stroke-linecap="round"/></g>
<g class="lab-acc lab-acc-bach"><rect x="470" y="318" width="116" height="44" rx="10" fill="#7a68a8"/><rect x="484" y="326" width="34" height="24" rx="5" fill="#2a2340"/><path d="M528 336h40M528 346h28" stroke="#ef8556" stroke-width="4" stroke-linecap="round"/><circle cx="574" cy="352" r="5" fill="#ef8556"/></g>
</svg>`;
function labLevelButtons(cur) {
  return LEVELS.map(l => `<button type="button" role="radio" class="lab-level" data-lab-level="${l.id}" aria-checked="${l.id === cur}" tabindex="${l.id === cur ? 0 : -1}" onclick="setLabLevel('${l.id}')" onkeydown="labLevelKey(event)">${esc(l.name)}</button>`).join('');
}
function setLabLevel(id) {
  if (!LEVELS.some(l => l.id === id)) return;
  ui.labLevel = id;
  document.querySelectorAll('[data-lab-level]').forEach(b => { const on = b.dataset.labLevel === id; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
  const st = document.getElementById('lab-stage'); if (st) st.dataset.level = id;
  if (lab) lab.setLevel(id);
}
function labLevelKey(e) {
  const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
  e.preventDefault();
  const ids = LEVELS.map(l => l.id), next = ids[(ids.indexOf(ui.labLevel || 'bas') + k + ids.length) % ids.length];
  setLabLevel(next); const b = document.querySelector(`[data-lab-level="${next}"]`); if (b) b.focus();
}
let labOpen = false;
function labExplode() {
  labOpen = !labOpen;
  const b = document.getElementById('lab-explode'); if (b) { b.setAttribute('aria-pressed', labOpen); b.textContent = labOpen ? 'Armar de nuevo' : 'Desarmar el robot'; }
  if (lab) lab.setExplode(labOpen); else notify('La escena 3D no está disponible en este navegador, pero la propuesta funciona igual.');
}
function labRun() { if (lab) { if (labOpen) { labOpen = false; const b = document.getElementById('lab-explode'); if (b) { b.setAttribute('aria-pressed', false); b.textContent = 'Desarmar el robot'; } } lab.run(); } else notify('La escena 3D no está disponible en este navegador, pero la propuesta funciona igual.'); }
function webglOk() { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } }
function loadLab(cb) {
  if (window.GGLab) { cb(); return; }
  if (loadLab.queue) { loadLab.queue.push(cb); return; }
  loadLab.queue = [cb];
  const sc = document.createElement('script'); sc.src = 'vendor/lab-scene.min.js?v=160'; sc.async = true;
  sc.onload = () => { const q = loadLab.queue || []; loadLab.queue = null; q.forEach(f => { try { f(); } catch (e) { console.error('No se pudo iniciar la vista 3D.', e); } }); };
  sc.onerror = () => { loadLab.queue = null; sc.remove(); campusUnavailable('No se pudo cargar la vista 3D. Tu configuración sigue disponible.'); };
  document.head.appendChild(sc);
}
// Un solo campus para escritorio y móvil. Sus datos vienen del motor, no del paso del recorrido.
let mascot = null, mascotHost = null;
let campusPrevious = null, campusFeedback = null, campusContextKey = '', campusInspection = null;
let animPaused = false; try { animPaused = localStorage.getItem('gg_asesor_pause') === '1'; } catch (e) { /* sin almacenamiento */ }
function setAnimPaused(v) {
  animPaused = !!v; try { localStorage.setItem('gg_asesor_pause', v ? '1' : '0'); } catch (e) { /* ignorar */ }
  if (mascot) mascot.setPaused(animPaused); if (duck3) duck3.setPaused(animPaused); syncPauseBtn();
}
function syncPauseBtn() { const b = mascotHost && mascotHost.querySelector('.campus-pause'); if (!b) return; b.setAttribute('aria-pressed', String(animPaused)); b.setAttribute('aria-label', animPaused ? 'Activar animaciones del colegio' : 'Pausar animaciones del colegio'); b.dataset.tip = animPaused ? 'Reanudar animaciones' : 'Pausar animaciones'; b.innerHTML = `${icon(animPaused ? 'play' : 'pause')}<span>${animPaused ? 'Reanudar' : 'Pausar'}</span>`; mascotHost.dataset.paused = String(animPaused); if (mascotHost.classList.contains('campus-ready')) mascotHost.querySelector('.campus-status').textContent = animPaused ? 'En pausa' : 'En vivo'; }
const STATION_OF = { tale: 'robotics', master: 'robotics', spike: 'robotics', electronics: 'electronics', drones: 'drones', immersive: 'immersive' };
function campusContext() {
  if (campusInspection?.step === state.step) return campusInspection.focus;
  if (state.step === 2) return { kind: 'enrollment', levelId: activeLevels()[state.levelIndex]?.id, emphasis: 'edit' };
  if (state.step === 4 && cur()) {
    const s = cur(), key = stepKeys(s)[ui.sub] || 'program';
    return { kind: key === 'quantity' ? (s.stations ? 'stations' : 'equipment') : key, programId: s.programId, entryId: s.id, emphasis: 'edit' };
  }
  if ((state.step === 3 || state.step === 5) && state.selected.length) return { kind: 'program', programId: state.selected[0].programId };
  return { kind: 'overview' };
}
// Landing showcase: an illustrative school with every level and technology. It only
// feeds the scene; the quotation and the saved draft are untouched.
function showcaseData() {
  const context = campusContext();
  const sharing = { tale: 'separate', master: 'simultaneous', spike: 'separate', electronics: 'simultaneous', drones: 'separate', immersive: 'simultaneous' };
  return { step: 0, levels: LEVELS.map(l => l.id), students: 720, focusedLevel: context.levelId, focusedProgram: context.programId, activeConfig: context, enrollment: [],
    programs: PROGRAMS.map(p => p.id),
    equipment: PROGRAMS.map(p => ({ id: p.id + '@vitrina', programId: p.id, units: 12, plan: 'INTEGRA', stations: false, sharing: sharing[p.id], groupIds: [], simIds: [], participants: null, capacity: null, rotations: [] })) };
}
// Vista previa: solo en el paso 3 y solo de un programa que todavía no está en la propuesta.
function activePreview() {
  const id = ui.preview?.programId;
  return id && state.step === 3 && !state.selected.some(s => s.programId === id) ? { programId: id } : null;
}
// Contadores del HUD: salen del motor y de la configuración, nunca de la escena.
//  attended: estudiantes únicos de los grupos de los programas (cada grupo una vez); sin programas, la matrícula registrada.
//  participations: suma de participation(s) por programa; un grupo en dos programas cuenta dos veces.
//  simultaneous: suma de los estudiantes de los grupos en simIds de las entradas con horario simultáneo.
//  teams: suma de unitsOf(s) donde el motor entrega una cantidad (null = por definir, no suma).
// No hay «existentes» ni «por incorporar»: el motor no tiene inventario (ver cotizador-scene-contract).
function campusCounts() {
  const g = groups();
  return {
    attended: state.selected.length ? selectedParticipants() : registered(),
    participations: state.selected.reduce((n, s) => n + participation(s), 0),
    simultaneous: state.selected.filter(s => s.sharing === 'simultaneous').reduce((n, s) => n + M.uniqueStudents(g, s.simIds), 0),
    teams: state.selected.reduce((n, s) => n + (unitsOf(s) ?? 0), 0)
  };
}
function mascotData() {
  if (state.step === 0 && !state.levels.length) return showcaseData();
  const context = campusContext(), preview = activePreview();
  return {
    ...(preview ? { preview } : {}),
    step: state.step, levels: state.levels.slice(), students: registered(),
    focusedLevel: context.levelId, focusedProgram: context.programId, activeConfig: context,
    programs: [...new Set(state.selected.map(s => s.programId))],
    enrollment: groups().map(g => ({ id: g.id, gradeId: g.gradeId, label: g.label, sectionName: g.sectionName, levelId: g.levelId, students: g.students })),
    equipment: state.selected.map(s => { const an = analysis(s), units = unitsOf(s), ratio = findP(s.programId).ratio; return { id: s.id, programId: s.programId, units, plan: s.plan, stations: s.stations, sharing: s.sharing, flexBimestres: s.flexBimestres, groupIds: [...s.groupIds], simIds: [...s.simIds], participants: participation(s), capacity: units != null && ratio ? units * ratio : null, rotations: an.rotations || [] }; })
  };
}
// Clicking a workshop or classroom in the model goes straight to its edition.
function editFromCampus(kind, id) {
  campusInspection = null;
  if (kind === 'program') {
    const index = state.selected.findIndex(s => s.programId === id);
    if (index >= 0) { openProgram(index); return; }
  }
  if (kind === 'level') {
    const index = activeLevels().findIndex(level => level.id === id);
    if (index >= 0) { state.levelIndex = index; ui.focusTitle = true; step(2); return; }
  }
  inspectCampus(kind, id);
}
function inspectCampus(kind, id) {
  const focus = kind === 'program' ? { kind, programId: id, emphasis: 'explore' } : kind === 'level' ? { kind, levelId: id, emphasis: 'explore' } : { kind: 'overview' };
  campusInspection = { step: state.step, focus }; campusContextKey = ''; syncCampus();
}
// The explanation is announced to assistive technology; the model itself stays uncluttered.
function paintCampusFeedback(feedback) {
  const box = mascotHost.querySelector('[data-campus-feedback]');
  box.dataset.kind = feedback.focus.kind; box.dataset.diagram = feedback.diagram; box.dataset.program = feedback.focus.programId || '';
  box.dataset.title = feedback.title; box.dataset.text = feedback.text; box.dataset.items = String((feedback.items || []).length);
  box.textContent = `${feedback.title}. ${feedback.text}`;
}
// Pérdida de contexto WebGL (típica en celulares: poca memoria de video o volver de segundo plano):
// primero se espera a que el navegador lo restaure, luego se reconstruye la escena sola y, si no se logra, se ofrece reintentar.
let lostTimer = null, recoverTries = 0;
function onCampusLost() {
  const st = mascotHost?.querySelector('.campus-status'); if (st) st.textContent = 'Reconectando vista 3D…';
  setCampusControls(false); // the camera has nothing to move until the scene is back (onReady enables them)
  clearTimeout(lostTimer); lostTimer = setTimeout(() => recoverCampus(true), 2500);
}
function recoverCampus(auto) {
  clearTimeout(lostTimer);
  if (auto && recoverTries >= 2) { campusUnavailable('La vista 3D se interrumpió. Pulsa «Reintentar vista 3D»; tu avance está guardado.', true); return; }
  if (auto) recoverTries++;
  try { mascot?.dispose(); } catch (e) { /* la escena ya estaba perdida */ }
  mascot = null;
  mascotHost?.classList.remove('campus-unavailable');
  const st = mascotHost?.querySelector('.campus-status'); if (st) st.textContent = 'Cargando vista…';
  placeMascot();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && mascot && mascot.getDiagnostics?.().contextLost) recoverCampus(true); });
function campusUnavailable(message, retry) {
  if (!mascotHost) return;
  mascotHost.classList.remove('campus-ready'); mascotHost.classList.add('campus-unavailable');
  mascotHost.querySelector('.campus-status').textContent = 'Vista sin 3D';
  const fallback = mascotHost.querySelector('.campus-fallback');
  fallback.textContent = message; const note = mascotHost.querySelector('.campus-static-note'); note.textContent = message;
  if (retry) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-small btn-outline campus-retry'; b.style.marginLeft = '10px'; b.textContent = 'Reintentar vista 3D'; b.onclick = () => { recoverTries = 0; recoverCampus(false); }; note.appendChild(b); }
  setCampusControls(false);
  paintStaticSummary();
}
// Cámara, vistas y pausa solo existen con la escena lista; cerrar y ampliar siempre funcionan.
function setCampusControls(on) {
  mascotHost?.querySelectorAll('[data-camera],[data-view],.campus-pause').forEach(b => b.disabled = !on);
  if (on) syncViewButtons();
}
function syncViewButtons() {
  const program = mascotHost?.querySelector('[data-view="program"]'); if (!program) return;
  const has = !!campusFeedback?.focus?.programId && typeof mascot?.setView === 'function';
  program.disabled = !mascotHost.classList.contains('campus-ready') || !has;
  program.title = has ? '' : (typeof mascot?.setView === 'function' ? 'Elige un programa del campus para encuadrarlo' : 'Este encuadre no está disponible en esta versión de la vista');
}
// Resumen estático: lo mismo que dibuja la escena, derivado del estado y del motor (reglas de paper/plan.js).
//  Piso superior de un nivel: estudiantes >= 90 o secciones >= 4 (sección con matrícula pendiente o mayor que 0).
//  Servicios: FLEX, EV8 y EV16 incluyen formación, acompañamiento y seguimiento; INTEGRA, orientación y 1 h de capacitación.
function compositionSummary() {
  const rows = groups(), levels = activeLevels();
  const rooms = levels.map(l => {
    const mine = rows.filter(g => g.levelId === l.id), students = mine.reduce((n, g) => n + (g.students || 0), 0), sections = mine.filter(g => g.students == null || g.students > 0).length;
    return { name: l.name, students, sections, upper: students >= 90 || sections >= 4 };
  });
  const workshops = [...new Set(state.selected.map(s => s.programId))].map(findP).filter(Boolean).map(p => ({ name: p.name, hardware: p.hardware, drones: p.id === 'drones' }));
  const plans = [...new Set(state.selected.map(s => s.plan).filter(p => p && p !== 'UNDECIDED'))];
  const SERV = { INTEGRA: 'orientación inicial y 1 hora de capacitación', FLEX: 'capacitación docente, integración, seguimiento, soporte y Sócrates Aprende', EV8: 'capacitación docente, integración, recursos, seguimiento, soporte y Sócrates Aprende', EV16: 'capacitación docente, integración, recursos, seguimiento, soporte y Sócrates Aprende' };
  return { rooms, workshops, upper: rooms.filter(r => r.upper), services: plans.map(id => ({ tag: planOf(id).tag, text: SERV[id] })) };
}
function staticSummaryMarkup() {
  const c = compositionSummary(), n = (k, one, many) => k + ' ' + plural(k, one, many);
  const li = (title, body) => `<li><b>${title}</b> ${body}</li>`;
  const floors = c.rooms.length
    ? li('Aulas por nivel:', c.rooms.map(r => `${esc(r.name)}, ${r.upper ? '2 aulas (con piso superior)' : '1 aula'} para ${n(r.students, 'estudiante', 'estudiantes')}`).join('; ') + '.')
    : li('Aulas:', 'un aula de ejemplo, hasta que elijas niveles.');
  const shops = c.workshops.length
    ? li('Talleres por programa:', c.workshops.map(w => `${esc(w.name)} (${esc(w.hardware)}): ${w.drones ? 'patio de vuelo' : 'taller'}`).join('; ') + '.')
    : li('Talleres:', 'todavía no hay programas en tu propuesta.');
  const upper = li('Pisos superiores:', c.upper.length ? c.upper.map(r => esc(r.name)).join(', ') + ' (desde 90 estudiantes o 4 secciones por nivel).' : 'ninguno por ahora (aparecen desde 90 estudiantes o 4 secciones en un nivel).');
  const serv = li('Servicios por modalidad:', c.services.length ? c.services.map(s => `${esc(s.tag)}: ${esc(s.text)}`).join('; ') + '.' : 'sin modalidad elegida, no se representa ningún servicio.');
  return `<h3>Representación de tu configuración</h3><ul>${floors}${shops}${upper}${serv}</ul><p>Es una ilustración conceptual: no genera partidas de construcción, mobiliario ni infraestructura.</p>`;
}
function paintStaticSummary() {
  const html = staticSummaryMarkup();
  const targets = [...document.querySelectorAll('[data-static-summary]')];
  targets.forEach(el => { if (el._painted !== html) { el.innerHTML = html; el._painted = html; } });
  const digest = document.querySelector('[data-static-digest]');
  if (digest) { const c = compositionSummary(); digest.textContent = `${c.rooms.length} ${plural(c.rooms.length, 'nivel', 'niveles')} · ${c.workshops.length} ${plural(c.workshops.length, 'taller', 'talleres')}`; }
}
function syncCampus() {
  if (!mascotHost) return;
  const data = mascotData(), counts = campusCounts(), units = counts.teams;
  const context = data.activeConfig, contextKey = JSON.stringify(context) + ':' + state.step;
  const next = window.GGCampusExperience.describe(data, campusPrevious, context);
  const changed = next.changed || contextKey !== campusContextKey || !campusFeedback;
  if (changed) { campusFeedback = next; if (next.changed) campusInspection = null; }
  const focus = campusFeedback.focus;
  data.activeConfig = focus; data.focusedLevel = focus.levelId; data.focusedProgram = focus.programId;
  const title = state.step === 0 ? 'Un colegio que aprende creando.' : state.step === 1 ? 'Un aula. Mil posibilidades.' : state.step === 2 ? 'Aquí empieza la comunidad.' : state.step === 3 ? '¿Qué van a crear hoy?' : state.step === 4 ? 'Así se aprende en tu colegio.' : 'Tu colegio, en acción.';
  mascotHost.querySelector('.campus-heading h2').textContent = title;
  mascotHost.querySelector('.campus-message').textContent = data.preview ? 'Vista previa de ' + findP(data.preview.programId).name + ' · no está en tu propuesta hasta que la agregues' : state.step === 0 ? (state.levels.length ? 'Tu colegio · toca un taller para conocerlo' : 'Colegio ilustrativo · toca un taller para conocerlo') : 'Toca un taller o un aula para editarlo';
  for (const [key, value] of Object.entries(counts)) mascotHost.querySelector(`[data-count="${key}"]`).textContent = value.toLocaleString('es-GT');
  mascotHost.querySelector('.campus-description').textContent = `${data.levels.length} niveles, ${data.students} estudiantes registrados, ${counts.attended} estudiantes atendidos, ${counts.participations} participaciones por programa, ${counts.simultaneous} estudiantes simultáneos, ${counts.teams} equipos necesarios y ${data.programs.length} programas. ${data.preview ? 'Vista previa de ' + findP(data.preview.programId).name + ' que no forma parte de tu propuesta. ' : ''}Representación de tu configuración: la maqueta agrupa las cantidades para facilitar su lectura.`;
  mascotHost.classList.toggle('campus-previewing', !!data.preview);
  paintStaticSummary(); syncViewButtons();
  document.querySelectorAll('[data-campus-units]').forEach(el => { const u = data.equipment[Number(el.dataset.campusUnits)]?.units; el.textContent = u ? u + ' equipos' : 'por definir'; });
  if (changed) paintCampusFeedback(campusFeedback);
  mascot?.setHoverVerb?.(state.step === 0 ? 'Explorar' : 'Editar');
  mascot?.update(data);
  if (changed) mascot?.setFocus?.(focus);
  campusPrevious = data; campusContextKey = contextKey;
  queueCampusInsets();
}
// ---- Visor a pantalla completa: la cámara encuadra el área que dejan libre las capas.
let insetsFrame = 0;
function queueCampusInsets() { if (!insetsFrame) insetsFrame = requestAnimationFrame(() => { insetsFrame = 0; syncCampusInsets(); }); }
function syncCampusInsets() {
  if (!mascot || !mascotHost || !mascotHost.isConnected || typeof mascot.setInsets !== 'function') return;
  const stage = mascotHost.querySelector('.campus-stage').getBoundingClientRect();
  if (!stage.width || !stage.height) return;
  const visible = el => el && !el.hidden && el.getClientRects().length && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  const topItems = [...mascotHost.querySelectorAll('.campus-heading, .campus-message'), document.querySelector('.campus-proposal > summary')].filter(visible);
  // The counters and the legend float over the bottom of the model.
  const bottomItems = [...mascotHost.querySelectorAll('.campus-counts, .campus-hud-bottom')].filter(visible);
  const tools = mascotHost.querySelector('.campus-tools'), box = tools && visible(tools) ? tools.getBoundingClientRect() : null;
  // A vertical toolbar on the side reserves its width; a horizontal one belongs to the band it sits in
  // (top-right on desktop, bottom on some phones), never to both.
  const vertical = box && box.height > box.width, upper = box && box.top + box.height / 2 < stage.top + stage.height / 2;
  const top = Math.max(topItems.reduce((max, el) => Math.max(max, el.getBoundingClientRect().bottom - stage.top), 0), box && !vertical && upper ? box.bottom - stage.top : 0);
  const bottom = bottomItems.reduce((max, el) => Math.max(max, stage.bottom - el.getBoundingClientRect().top), box && !vertical && !upper ? stage.bottom - box.top : 0);
  const right = vertical ? Math.max(0, stage.right - box.left) : 0;
  let left = 0, heroBottom = 0;
  const hero = mascotHost.closest('.campus-hero'), copy = hero?.querySelector('.lab-copy')?.getBoundingClientRect();
  if (copy) {
    // Beside the copy (desktop) the model takes the right side; under it (mobile) the top,
    // measured from the headline because the copy box is padded to sit below the island.
    const headline = hero.querySelector('.lab-copy h1')?.getBoundingClientRect() || copy;
    if (copy.right < stage.left + stage.width * .6) left = Math.max(0, copy.right - stage.left + 32);
    else heroBottom = Math.max(0, stage.bottom - headline.top + 16);
    heroBottom = Math.max(heroBottom, 52); // the cream curve that closes the hero
  }
  const limit = hero ? .75 : .45;
  mascot.setInsets({ top: Math.min(top, stage.height * .45), bottom: Math.min(Math.max(bottom, heroBottom), stage.height * limit), right: Math.min(right, stage.width * .25), left: Math.min(left, stage.width * .6) });
}
window.addEventListener('resize', queueCampusInsets);
document.addEventListener('toggle', e => { if (e.target.matches?.('.campus-proposal')) queueCampusInsets(); }, true);

// ---- Solo configuración: oculta el campus y conserva todo el recorrido.
let campusHidden = false; try { campusHidden = localStorage.getItem('gg_asesor_campus') === 'off'; } catch (e) { /* sin almacenamiento */ }
document.documentElement.classList.toggle('campus-off', campusHidden);
function campusToggleButton() {
  return `<button type="button" class="btn btn-small btn-outline campus-toggle" aria-pressed="${campusHidden}" onclick="toggleCampus()" title="${campusHidden ? 'Mostrar el campus 3D' : 'Ocultar el campus 3D y trabajar solo con la configuración'}">${icon(campusHidden ? 'cube' : 'panel')}<span>${campusHidden ? 'Mostrar campus 3D' : 'Solo configuración'}</span></button>`;
}
function toggleCampus() {
  campusHidden = !campusHidden;
  try { localStorage.setItem('gg_asesor_campus', campusHidden ? 'off' : 'on'); } catch (e) { /* ignorar */ }
  document.documentElement.classList.toggle('campus-off', campusHidden);
  updateHeader();
  document.querySelector('.campus-toggle')?.focus();
  placeMascot(); syncConfigWidth();
  requestAnimationFrame(() => { mascot?.resize(); queueCampusInsets(); });
}

// ---- Ancho ajustable de la configuración (escritorio). Se recuerda en este navegador.
const CONFIG_WIDTH = { min: 320, fallback: 390, step: 24 };
let configWidth = null; try { configWidth = Number(localStorage.getItem('gg_asesor_config_w')) || null; } catch (e) { /* sin almacenamiento */ }
const configMax = () => Math.max(CONFIG_WIDTH.min, Math.min(900, window.innerWidth - 420));
const defaultConfigWidth = () => Math.round(Math.min(Math.max(window.innerWidth * .3, 360), 420));
function syncConfigWidth() {
  const width = Math.round(Math.min(configMax(), Math.max(CONFIG_WIDTH.min, configWidth || defaultConfigWidth())));
  document.documentElement.style.setProperty('--config-w', width + 'px');
  const handle = document.querySelector('.config-resizer');
  if (handle) { handle.setAttribute('aria-valuemin', CONFIG_WIDTH.min); handle.setAttribute('aria-valuemax', configMax()); handle.setAttribute('aria-valuenow', width); }
  return width;
}
function setConfigWidth(value, persist = true) {
  configWidth = value == null ? null : Math.round(Math.min(configMax(), Math.max(CONFIG_WIDTH.min, value)));
  if (persist) try { configWidth == null ? localStorage.removeItem('gg_asesor_config_w') : localStorage.setItem('gg_asesor_config_w', String(configWidth)); } catch (e) { /* ignorar */ }
  syncConfigWidth(); queueCampusInsets();
}
let resizeDrag = null;
document.addEventListener('pointerdown', e => {
  const handle = e.target.closest?.('.config-resizer');
  if (!handle || e.button > 0) return;
  e.preventDefault();
  resizeDrag = { id: e.pointerId, left: handle.parentElement.getBoundingClientRect().left };
  handle.setPointerCapture?.(e.pointerId);
  document.documentElement.classList.add('config-resizing');
});
document.addEventListener('pointermove', e => {
  if (!resizeDrag || e.pointerId !== resizeDrag.id) return;
  setConfigWidth(e.clientX - resizeDrag.left, false);
});
const endResize = e => {
  if (!resizeDrag || e.pointerId !== resizeDrag.id) return;
  resizeDrag = null; document.documentElement.classList.remove('config-resizing');
  setConfigWidth(configWidth);
};
document.addEventListener('pointerup', endResize);
document.addEventListener('pointercancel', endResize);
document.addEventListener('dblclick', e => { if (e.target.closest?.('.config-resizer')) setConfigWidth(null); });
document.addEventListener('keydown', e => {
  if (!e.target.closest?.('.config-resizer')) return;
  const current = syncConfigWidth();
  const next = { ArrowLeft: current - CONFIG_WIDTH.step, ArrowRight: current + CONFIG_WIDTH.step, Home: CONFIG_WIDTH.min, End: configMax() }[e.key];
  if (next != null) { e.preventDefault(); setConfigWidth(next); }
  if (e.key === 'Enter') { e.preventDefault(); setConfigWidth(null); }
});
window.addEventListener('resize', () => syncConfigWidth());

/** Legend of the campus: the paper palette of the scene (asesor/lab/paper/kit.js) and what each piece stands for. */
const KEY_SWATCHES = [['#FFF8EC', 'Aula de un nivel (marfil)'], ['#8159C4', 'Taller de programa (banderín de color)'], ['#6C45AE', 'Cubierta; un piso superior es un nivel grande'],
  ['#25C2C6', 'Balcón, escalera y caminos'], ['#FF9D38', 'Entrada'], ['#7CCB6B', 'Jardines']];
function createCampusHost() {
  const host = document.createElement('section'); host.className = 'campus-preview';
  const tool = (attr, label, glyph) => `<button type="button" ${attr} aria-label="${label}" data-tip="${label}">${icon(glyph)}</button>`;
  const count = (key, long, short, hint) => `<div title="${hint}"><dt><span class="cl">${long}</span><span class="cs">${short}</span></dt><dd data-count="${key}">0</dd></div>`;
  // The stage fills the panel; only a few quiet layers float over the model.
  host.innerHTML = `<div class="campus-stage" tabindex="0" role="group" aria-label="Campus interactivo. Toca un taller o un aula para editarlo. Arrastra para girar y usa la rueda o el pellizco para acercarte. Flechas arriba y abajo recorren talleres y aulas y Enter abre su edición; izquierda y derecha giran; más y menos acercan; Inicio o Escape vuelven a la vista general." aria-describedby="campus-description"><p class="campus-fallback">Preparando tu colegio…</p></div>`
    + `<div class="campus-static" role="region" tabindex="0" aria-label="Resumen de tu campus en texto"><p class="campus-static-note"></p><div data-static-summary></div></div>`
    + `<div class="campus-hud">`
    + `<div class="campus-hud-top" data-hud-top><div class="campus-heading"><h2>Tu colegio</h2><span class="campus-status" role="status">Cargando vista</span></div><p class="campus-message">Toca un taller o un aula para editarlo</p></div>`
    + `<button type="button" class="campus-expand" aria-pressed="false" aria-label="Ampliar el campus">${icon('zoom')}<span>Ampliar</span></button>`
    + `<div class="campus-tools" role="toolbar" aria-label="Controles de la vista 3D">${tool('data-view="overview"', 'Vista general', 'home')}${tool('data-view="program"', 'Programa activo', 'cube')}${tool('data-camera="reset"', 'Restablecer vista', 'refresh')}<button type="button" class="campus-pause"></button><button type="button" class="campus-close" aria-label="Cerrar campus 3D" data-tip="Cerrar campus 3D">${icon('close')}</button></div>`
    + `<div class="campus-hud-bottom"><details class="campus-note campus-key"><summary>Representación de tu configuración</summary><div class="campus-key-body">`
    + `<ul class="campus-key-swatches" aria-label="Qué representa cada color">${KEY_SWATCHES.map(([tone, label]) => `<li><span style="background:${tone}" aria-hidden="true"></span>${label}</li>`).join('')}</ul>`
    + `<div data-static-summary></div></div></details>`
    + `<dl class="campus-counts" aria-label="Totales de la propuesta, calculados por el motor">`
    + count('attended', 'Estudiantes atendidos', 'Atendidos', 'Estudiantes únicos de los grupos de tus programas; cada grupo cuenta una vez. Sin programas, la matrícula registrada.')
    + count('participations', 'Participaciones por programa', 'Participaciones', 'Suma de estudiantes por programa. Un grupo en dos programas participa dos veces.')
    + count('simultaneous', 'Estudiantes simultáneos', 'A la vez', 'Estudiantes de los grupos marcados para coincidir en horario.')
    + count('teams', 'Equipos necesarios', 'Equipos', 'Equipos que el cálculo recomienda o que elegiste; los programas por definir no suman.')
    + `</dl></div>`
    + `</div><p class="sr-only" data-campus-feedback role="status" aria-live="polite" aria-atomic="true"></p><p class="sr-only campus-description" id="campus-description"></p>`;
  function camera(action) {
    if (!mascot) return;
    if (action === 'reset') { campusInspection = { step: state.step, focus: { kind: 'overview' } }; campusContextKey = ''; syncCampus(); mascot.resetView(); }
    if (action === 'left' || action === 'right') mascot.rotate(action === 'left' ? -.25 : .25);
    if (action === 'in' || action === 'out') mascot.zoom(action === 'in' ? .12 : -.12);
  }
  // Encuadres con nombre. Con una escena anterior sin setView, «Vista general» cae en resetView.
  function view(name) {
    if (!mascot) return;
    if (name === 'overview') {
      campusInspection = { step: state.step, focus: { kind: 'overview' } }; campusContextKey = ''; syncCampus();
      if (typeof mascot.setView === 'function') mascot.setView('overview'); else mascot.resetView();
    } else if (name === 'program' && typeof mascot.setView === 'function' && campusFeedback?.focus?.programId) {
      mascot.setFocus?.(campusFeedback.focus); mascot.setView('program');
    }
  }
  host.querySelectorAll('[data-camera]').forEach(b => { b.disabled = true; b.addEventListener('click', () => camera(b.dataset.camera)); });
  host.querySelectorAll('[data-view]').forEach(b => { b.disabled = true; b.addEventListener('click', () => view(b.dataset.view)); });
  host.querySelector('.campus-pause').addEventListener('click', () => setAnimPaused(!animPaused));
  // «Ampliar» alterna la altura completa en móvil sin mover el foco: un campo activo lo conserva.
  const expand = host.querySelector('.campus-expand');
  expand.addEventListener('pointerdown', e => { if (document.activeElement && document.activeElement !== document.body && document.activeElement !== expand) e.preventDefault(); });
  expand.addEventListener('click', () => {
    const on = !host.classList.contains('campus-expanded');
    host.classList.toggle('campus-expanded', on); expand.setAttribute('aria-pressed', String(on));
    expand.setAttribute('aria-label', on ? 'Reducir el campus' : 'Ampliar el campus'); expand.querySelector('span').textContent = on ? 'Reducir' : 'Ampliar';
    requestAnimationFrame(() => { mascot?.resize(); queueCampusInsets(); });
  });
  host.querySelector('.campus-close').addEventListener('click', () => { toggleCampus(); notify('Cerraste el campus 3D. Puedes volver a abrirlo con «Mostrar campus 3D» en el encabezado.'); });
  host.querySelector('.campus-stage').addEventListener('keydown', e => {
    const action = { ArrowLeft: 'left', ArrowRight: 'right', '+': 'in', '=': 'in', '-': 'out', Home: 'reset', Escape: 'reset' }[e.key];
    if (action) { e.preventDefault(); camera(action); return; }
    const current = campusFeedback?.focus || {};
    if (e.key === 'Enter' && (current.programId || current.levelId)) { e.preventDefault(); editFromCampus(current.programId ? 'program' : 'level', current.programId || current.levelId); return; }
    // Up/down tour every activity, then every level, as a keyboard alternative to tapping.
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const data = mascotData(), stops = [...data.programs.map(id => ['program', id]), ...data.levels.map(id => ['level', id])];
      if (!stops.length) return;
      e.preventDefault();
      const current = campusFeedback?.focus || {}, index = stops.findIndex(([kind, id]) => (kind === 'program' ? current.programId : current.levelId) === id && (kind === 'program') === !!current.programId);
      const [kind, id] = stops[(index + (e.key === 'ArrowDown' ? 1 : -1) + stops.length) % stops.length];
      inspectCampus(kind, id);
    }
  });
  let inView = true;
  const syncVisibility = () => { host.dataset.suspended = String(document.hidden || !inView); };
  document.addEventListener('visibilitychange', syncVisibility);
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? true; syncVisibility(); });
    observer.observe(host);
  }
  syncVisibility();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(queueCampusInsets).observe(host);
  return host;
}
function placeMascot() {
  const panel = document.getElementById('campus-slot');
  if (!panel) { mascotHost?.remove(); return; }
  if (!mascotHost) mascotHost = createCampusHost();
  panel.appendChild(mascotHost); syncPauseBtn(); syncCampus();
  if (mascot) { mascot.resize(); return; }
  if (!webglOk()) { campusUnavailable('La vista 3D no está disponible en este navegador. Puedes seguir configurando tu propuesta.'); return; }
  if (campusHidden && state.step >= 1) return; // Solo configuración: no se carga ni se renderiza la escena.
  loadLab(() => {
    if (mascot || !window.GGLab || !mascotHost || !mascotHost.isConnected) return;
    try {
      mascot = window.GGLab.createMascot(mascotHost.querySelector('.campus-stage'), {
        reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        onSelect: ({ kind, id }) => editFromCampus(kind, id),
        onReady: () => { clearTimeout(lostTimer); recoverTries = 0; mascotHost.classList.add('campus-ready'); mascotHost.classList.remove('campus-unavailable'); syncPauseBtn(); setCampusControls(true); },
        onLost: onCampusLost
      });
      mascot.setPaused(animPaused); syncCampus(); queueCampusInsets();
    } catch (e) { mascot = null; campusUnavailable('No se pudo iniciar la vista 3D. Puedes seguir configurando tu propuesta.'); }
  });
}
// Keep the activity visible without occupying the keyboard's editing space.
function compactCampusForInput() {
  if (!mascotHost) return;
  const editing = matchMedia('(max-width: 980px)').matches && !!document.activeElement?.matches('.main-panel input:not([type="radio"]):not([type="checkbox"]), .main-panel select, .main-panel textarea');
  mascotHost.classList.toggle('campus-editing', editing);
  document.body.classList.toggle('campus-input-active', editing);
}
document.addEventListener('focusin', compactCampusForInput);
document.addEventListener('focusout', () => requestAnimationFrame(compactCampusForInput));
window.visualViewport?.addEventListener('resize', compactCampusForInput);
function renderLanding() {
  const cur = ui.labLevel || 'bas', saved = state.levels.length > 0;
  html(`<section class="lab-hero campus-hero" aria-labelledby="lab-title"><div class="campus-hero-stage" aria-label="Campus 3D: un colegio GuateGeeks en acción"><div id="campus-slot"></div></div><div class="lab-inner">
<div class="lab-copy"><p class="lab-label">Experiencias STEAM para instituciones educativas</p><h1 id="lab-title">Transforma cómo enseñan tus docentes y <em>cómo aprenden tus estudiantes.</em></h1>
<p class="lab-lead">Integramos robótica, electrónica, drones y realidad virtual en tu aula con equipos, formación docente y programas listos para usar. Arma tu propuesta en minutos.</p>
<div class="hero-actions"><button class="btn btn-primary" onclick="start()">${saved ? 'Continuar mi propuesta' : 'Crear mi propuesta'} ${icon('arrow')}</button><button class="btn btn-ghost" onclick="previewExample()">Ver propuesta de ejemplo</button></div>
<ul class="lab-chips"><li>${icon('check')} Sin registro para explorar</li><li>${icon('check')} Equipos que pueden compartir tus grupos</li><li>${icon('cube')} Toca un taller del campus para conocerlo</li></ul></div>
</div></section>
<div class="landing-content"><section class="land-sec" aria-labelledby="lv-title"><h2 id="lv-title">Que la tecnología sea parte de cada clase, en cada nivel</h2><p class="land-lead">Del primer robot en preprimaria a un proyecto de drones o realidad virtual en bachillerato: la tecnología se integra al aula y crece con tus estudiantes. Tú eliges qué sumar en cada nivel; nosotros te acompañamos para que se use en clase, no que se quede guardada.</p>
<div class="level-grid">${LEVELS.map((l, i) => { const areas = [...new Set(PROGRAMS.filter(p => p.levels.includes(l.id)).map(p => AREA_LABEL[p.area] || p.area))]; const pid = { pre: 'tale', prim: 'master', bas: 'spike', bach: 'electronics' }[l.id], { ph } = photoState(pid, l.id); return `<article class="level-card lc-${i}"><div class="lc-photo">${ph ? `<img src="${ph.src}" alt="" loading="lazy">` : icon(l.icon)}</div><div class="lc-body"><h3>${esc(l.name)}</h3><p class="lc-line">${esc(LEVEL_LINE[l.id] || l.hint)}</p><small class="lc-hint">${esc(l.hint)}</small><ul>${areas.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div></article>`; }).join('')}</div>
<p class="land-note">${icon('clock')} Un mismo equipo sirve a varios grupos en horarios distintos: más estudiantes aprendiendo con la misma inversión.</p></section>
<section class="land-sec" aria-labelledby="st-title"><h2 id="st-title">Así se construye tu propuesta</h2>
<ol class="land-steps"><li><span>1</span><div><b>Cuéntanos de tus estudiantes</b><p>Ingresa los grados y secciones. No necesitas saber cuántos equipos elegir.</p></div></li><li><span>2</span><div><b>Elige qué aprenderán</b><p>Explora robótica, electrónica, drones y experiencias inmersivas.</p></div></li><li><span>3</span><div><b>Reúne todos tus programas</b><p>Revisa el equipamiento, las modalidades y la inversión de tu colegio.</p></div></li></ol></section>
<section class="land-cta"><div><h2>El mismo recorrido. Una propuesta más clara.</h2><p>Los precios son estimaciones comerciales que GuateGeeks confirma.</p></div><button class="btn btn-primary" onclick="start()">${saved ? 'Continuar mi propuesta' : 'Crear mi propuesta'} ${icon('arrow')}</button></section></div></div>`);
}
function example() {
  state = initial();
  state.levels = ['pre', 'prim'];
  const sec = (gid, list) => ({ confirmed: true, sections: list.map(([name, n], i) => ({ id: gid + '-' + (i + 1), name, students: n })) });
  state.enroll = { pk: sec('pk', [['A', 18]]), ki: sec('ki', [['A', 12], ['B', 12]]), pr: sec('pr', [['A', 20]]), p1: sec('p1', [['A', 24]]), p2: sec('p2', [['A', 27]]), p3: sec('p3', [['A', 21]]), p4: sec('p4', [['A', 30]]), p5: sec('p5', [['A', 22]]), p6: sec('p6', [['A', 25]]) };
  const mk = (pid, level, ids) => ({ id: keyOf(pid, level), programId: pid, groupIds: ids, sharing: 'separate', simIds: [], units: null, stations: false, plan: 'EV8', flexBimestres: 1, confirmed: true, calc: null });
  state.selected = [mk('tale', 'pre', ['pk-1', 'ki-1', 'ki-2', 'pr-1']), mk('master', 'prim', ['p1-1', 'p2-1', 'p3-1', 'p4-1', 'p5-1', 'p6-1'])];
  state.selected.forEach(s => { s.calc = M.entrySignature(s, groups()); });
}
function previewExample() {
  const load = () => { example(); state.step = 5; render(); notify('Colegio de ejemplo: ' + registered() + ' estudiantes y 2 programas.'); };
  if (state.selected.length) askConfirm('¿Cargar el colegio de ejemplo?', 'Reemplazará lo que llevas hasta ahora.', 'Sí, cargar ejemplo', load); else load();
}

// ---------- Paso 1: niveles ----------
function toggleLevel(id) {
  state.levels.includes(id) ? state.levels = state.levels.filter(x => x !== id) : state.levels.push(id);
  state.levels = LEVELS.filter(l => state.levels.includes(l.id)).map(l => l.id);
  state.levelIndex = 0; pruneEntries(); render();
}
function nextFromLevels() { if (!state.levels.length) { notify('Selecciona al menos un nivel educativo.'); return; } state.levelIndex = 0; step(2); }
function renderLevels() {
  frame('¿Qué niveles quieres atender?', 'Selecciona uno o varios niveles. En el siguiente paso registraremos los estudiantes de cada uno. Podrás agregar más niveles después sin perder lo que ya configuraste.',
    `<div class="chooser">${LEVELS.map(l => `<button class="option ${state.levels.includes(l.id) ? 'selected' : ''}" onclick="toggleLevel('${l.id}')" aria-pressed="${state.levels.includes(l.id)}"><span class="option-icon">${icon(l.icon)}</span><strong>${esc(l.name)}</strong><small>${esc(l.hint)}</small></button>`).join('')}</div><div class="tip">No necesitas datos de contacto para explorar. Puedes trabajar cada nivel por separado.</div><div class="foot"><button class="btn btn-outline" onclick="step(0)">← Atrás</button><button class="btn btn-primary" onclick="nextFromLevels()" ${!state.levels.length ? 'disabled' : ''}>Continuar ${icon('arrow')}</button></div>`);
}

// ---------- Paso 2: estudiantes por grado y sección ----------
function selectLevel(i) { state.levelIndex = i; ui.focusTitle = true; render(); }
function navEnrollment(d) {
  const n = activeLevels().length;
  if (d === 1 && state.levelIndex < n - 1) { state.levelIndex++; ui.focusTitle = true; render(); }
  else if (d === -1 && state.levelIndex > 0) { state.levelIndex--; ui.focusTitle = true; render(); }
  else if (d === 1) { if (!hasStudents()) { notify('Ingresa estudiantes en al menos un grado.'); return; } step(3); }
  else step(1);
}
function findSection(sid) { for (const [gid, g] of Object.entries(state.enroll)) { const s = g.sections.find(x => x.id === sid); if (s) return { gid, s }; } return null; }
function refreshTotals(gid) {
  const lv = activeLevels()[state.levelIndex];
  const gt = document.querySelector(`[data-grade-total="${gid}"]`);
  if (gt) gt.textContent = gradeTotalText(gid);
  const st = document.querySelector('[data-level-total]'); if (st && lv) st.textContent = levelTotalText(lv);
  document.querySelectorAll('[data-registered]').forEach(e => e.textContent = registered());
  document.querySelectorAll('[data-participants]').forEach(e => e.textContent = selectedParticipants());
  syncCampus();
}
function gradeTotalText(gid) {
  const secs = sectionsOf(gid), n = secs.reduce((a, s) => a + (s.students || 0), 0), pend = secs.filter(s => s.students == null).length;
  return `${n} ${plural(n, 'estudiante', 'estudiantes')}${pend ? ' · ' + pend + ' sin confirmar' : ''}`;
}
function levelTotalText(lv) {
  const gs = groups().filter(g => g.levelId === lv.id), n = gs.reduce((a, g) => a + (g.students || 0), 0), pend = gs.filter(g => g.students == null).length;
  return `${n} estudiantes${pend ? ' (' + pend + ' ' + plural(pend, 'grupo', 'grupos') + ' sin confirmar)' : ''}`;
}
function setError(input, msg) { const e = document.getElementById('err-' + input.id); if (e) { e.hidden = !msg; e.textContent = msg; } input.setAttribute('aria-invalid', String(!!msg)); }
function writeQty(gid, sid, value, input) {
  const v = value.trim();
  if (v !== '' && (!/^\d+$/.test(v) || Number(v) > 1000)) { setError(input, 'Escribe un número entero entre 0 y 1000. Deja el campo vacío si aún no lo sabes.'); return; }
  setError(input, '');
  const g = ensureGrade(gid), s = g.sections.find(x => x.id === sid);
  s.students = v === '' ? null : Number(v);
  store(); refreshTotals(gid);
}
function stepQty(gid, sid, d) {
  const g = ensureGrade(gid), s = g.sections.find(x => x.id === sid);
  s.students = Math.max(0, Math.min(1000, (s.students ?? 0) + d)); render();
}
// Los nombres de sección son siempre A, B, C... en orden; no se editan.
function letterize(g) { g.sections.forEach((s, i) => { s.name = String.fromCharCode(65 + (i % 26)); }); }
function addSection(gid) {
  const g = ensureGrade(gid); if (g.sections.length >= 12) return;
  g.sections.push({ id: gid + '-' + uid(), name: '', students: null }); letterize(g); render();
}
function removeSection(gid, sid) {
  const g = ensureGrade(gid); g.sections = g.sections.filter(s => s.id !== sid);
  if (!g.sections.length) g.sections = [{ id: gid + '-' + uid(), name: 'A', students: null }];
  letterize(g); pruneEntries(); render();
}
function sectionRow(gid, s, count, last) {
  const gname = esc(gradeName(gid));
  return `<div class="gr-sec">${count > 1 ? `<span class="gr-sn" title="Sección ${esc(s.name)}">${esc(s.name)}</span>` : '<span></span>'}<div class="number"><button type="button" aria-label="Restar un estudiante en ${gname}, sección ${esc(s.name)}" onclick="stepQty('${gid}','${s.id}',-1)">−</button><input id="qty-${s.id}" aria-label="Estudiantes en ${gname}, sección ${esc(s.name)}" aria-describedby="err-qty-${s.id}" type="text" inputmode="numeric" autocomplete="off" placeholder="—" value="${s.students ?? ''}" oninput="writeQty('${gid}','${s.id}',this.value,this)"><button type="button" aria-label="Agregar un estudiante en ${gname}, sección ${esc(s.name)}" onclick="stepQty('${gid}','${s.id}',1)">+</button></div>${count > 1 ? `<button type="button" class="gr-x" aria-label="Quitar la sección ${esc(s.name)} de ${gname}" onclick="removeSection('${gid}','${s.id}')">×</button>` : '<span></span>'}${last ? `<button type="button" class="gr-add" onclick="addSection('${gid}')" aria-label="Añadir sección en ${esc(gradeName(gid))}">+ Sección</button>` : '<span></span>'}<p class="field-error" id="err-qty-${s.id}" hidden></p></div>`;
}
function renderEnrollment() {
  const levels = activeLevels(); if (!levels.length) { step(1); return; }
  state.levelIndex = Math.min(state.levelIndex, levels.length - 1);
  const l = levels[state.levelIndex];
  frame('¿Cuántos estudiantes tienes en ' + l.name.toLowerCase() + '?',
    l.free ? 'Agrega las secciones u opciones de tu oferta, por ejemplo carreras o especialidades. No imponemos una lista de grados.' : 'Indica los estudiantes por grado y sección. Usa «Añadir sección» cuando un grado tenga varios grupos. Deja vacío lo que aún no sepas; un 0 significa que confirmaste que no hay estudiantes.',
    `<div class="level-tabs" aria-label="Niveles a completar">${levels.map((lv, i) => `<button class="level-tab ${i === state.levelIndex ? 'active' : ''}" aria-pressed="${i === state.levelIndex}" onclick="selectLevel(${i})">${i + 1}. ${esc(lv.name)}</button>`).join('')}</div><div class="gr-list">${l.grades.map(([gid, name]) => {
      const secs = sectionsOf(gid);
      return `<div class="gr-row"><div class="gr-name"><strong>${esc(name)}</strong><small data-grade-total="${gid}">${gradeTotalText(gid)}</small></div><div class="gr-secs">${secs.map((s, k) => sectionRow(gid, s, secs.length, k === secs.length - 1)).join('')}</div></div>`;
    }).join('')}</div><div class="tip">Total ingresado para ${esc(l.name)}: <b data-level-total>${levelTotalText(l)}</b>. Los mismos equipos podrán utilizarse en distintos grupos si sus horarios lo permiten.</div><div class="foot"><button class="btn btn-outline" onclick="navEnrollment(-1)">← Atrás</button><button class="btn btn-primary" onclick="navEnrollment(1)">${state.levelIndex < levels.length - 1 ? 'Siguiente nivel' : 'Ver programas'} ${icon('arrow')}</button></div>`);
}

// ---------- Cobertura: todos los grados con estudiantes deben quedar en un programa ----------
// Un grupo sin programa se puede dejar «sin programa por ahora» (state.skipped); así queda a la vista y no se pierde de la cotización.
const groupGrade = g => g.label.split(' · ')[0];
function coverage() {
  const covered = new Set(state.selected.flatMap(s => s.groupIds)), skipped = new Set(state.skipped || []);
  const gs = groups().filter(g => g.students > 0), miss = gs.filter(g => !covered.has(g.id));
  const open = miss.filter(g => !skipped.has(g.id)), hosted = g => hostsFor([g]).length > 0;
  return { gs, covered, uncovered: open, pending: open.filter(hosted), outside: open.filter(g => !hosted(g)), skipped: miss.filter(g => skipped.has(g.id)), students: gs.filter(g => covered.has(g.id)).reduce((n, g) => n + g.students, 0), total: gs.reduce((n, g) => n + g.students, 0) };
}
const hostsFor = gs => state.selected.filter(s => gs.some(g => compatible(findP(s.programId), g)));
const assignPending = () => coverage().pending;
// Una fila por grado con su estado: incluido, pendiente (hay un programa elegido compatible), fuera (ningún programa elegido aplica) o descartado.
function coverageRows() {
  const cov = coverage(), skipped = new Set(state.skipped || []), rows = [];
  groups().filter(g => g.students > 0).forEach(g => {
    let r = rows.find(x => x.gradeId === g.gradeId);
    if (!r) rows.push(r = { gradeId: g.gradeId, levelId: g.levelId, grade: groupGrade(g), students: 0, progs: [], status: 'outside' });
    r.students += g.students;
    state.selected.filter(s => s.groupIds.includes(g.id)).forEach(s => { const n = findP(s.programId).name; if (!r.progs.includes(n)) r.progs.push(n); });
    const st = cov.covered.has(g.id) ? 'ok' : skipped.has(g.id) ? 'skipped' : hostsFor([g]).length ? 'pending' : 'outside';
    if (r.status !== 'ok') r.status = st === 'ok' || r.status === 'outside' && st !== 'outside' ? st : r.status;
  });
  return rows;
}
// «1.º a 3.º Primaria», «Pre-Kínder, Kínder y Preparatoria»: los grados de un bloque sin repetir el nombre del nivel.
function gradesText(grades) {
  const suf = (grades[0].match(/ (Primaria|Básico|Bachillerato)$/) || [])[1];
  if (!suf || !grades.every(g => g.endsWith(' ' + suf))) return joinY(grades);
  const short = grades.map(g => g.slice(0, -suf.length - 1));
  return (short.length >= 3 ? short[0] + ' a ' + short[short.length - 1] : joinY(short)) + ' ' + suf;
}
// Bloques por nivel: los grados que comparten programa y estado se muestran juntos, sin repetir una fila por grado.
function coverageBlocks() {
  const blocks = [];
  coverageRows().forEach(r => {
    const key = r.levelId + '|' + r.status + '|' + r.progs.join(',');
    let b = blocks.find(x => x.key === key);
    if (!b) blocks.push(b = { key, levelId: r.levelId, status: r.status, progs: r.progs, grades: [], students: 0 });
    b.grades.push(r.grade); b.students += r.students;
  });
  blocks.forEach(b => { b.text = gradesText(b.grades); });
  return blocks;
}
function openAssign() { const p = coverage().pending; ui.assign = p.length > 0; ui.assignSeen = p.map(g => g.id).join(); state.step = 3; store(); render(); }
function toggleAssign(key, on) { ui.assignSel[key] = on; }
function skipAssign() { state.skipped = [...new Set([...(state.skipped || []), ...coverage().pending.map(g => g.id)])]; ui.assign = false; store(); notify('Esos grados quedan sin programa por ahora. Se indican en el resumen y en el PDF.'); step(5); }
function catalogFromAssign() { ui.assign = false; render(); }
// Suma los grados nuevos a los programas elegidos y deja cada programa por configurar: la cantidad de equipos se vuelve a calcular.
function applyAssign() {
  const pend = coverage().uncovered, jobs = [];
  state.selected.forEach(s => {
    const add = pend.filter(g => ui.assignSel[s.id + '|' + g.levelId] !== false && compatible(findP(s.programId), g) && !s.groupIds.includes(g.id));
    if (add.length) jobs.push([s, add]);
  });
  if (!jobs.length) { notify('Marca al menos un programa o elige otros programas para esos grados.'); return; }
  jobs.forEach(([s, add]) => {
    s.groupIds = [...s.groupIds, ...add.map(g => g.id)]; s.units = null; s.stations = false; s.simIds = []; s.sharing = s.groupIds.length > 1 ? null : 'separate'; s.confirmed = false; s.calc = null;
    s.id = s.programId + '@' + entryLevels(s).map(l => l.id).join('+');
  });
  ui.assign = false; ui.assignSel = {}; store(); step(4);
  notify('Agregamos los grados nuevos. Revisa los equipos de cada programa para actualizar la cotización.');
}
function renderAssign() {
  const pend = coverage().pending, levels = activeLevels().filter(l => pend.some(g => g.levelId === l.id));
  const cards = levels.map(l => {
    const gs = pend.filter(g => g.levelId === l.id), n = gs.reduce((a, g) => a + g.students, 0), grades = [...new Set(gs.map(groupGrade))], hosts = hostsFor(gs);
    const rows = hosts.map(s => {
      const p = findP(s.programId), key = s.id + '|' + l.id, ok = gs.filter(g => compatible(p, g)), u = unitsOf(s);
      return `<label class="assign-row"><input type="checkbox" ${ui.assignSel[key] !== false ? 'checked' : ''} onchange="toggleAssign('${key}', this.checked)"><span><b>${esc(progTitle(s))}</b><small>${esc(p.hardware)}${u ? ' · hoy ' + u + ' equipos' : ''} · sumaría ${esc(joinY([...new Set(ok.map(groupGrade))]))}</small></span></label>`;
    }).join('');
    return `<article class="assign-card"><div class="assign-head"><h2>${esc(l.name)}</h2><span class="status amber">${n} ${plural(n, 'estudiante', 'estudiantes')} sin programa</span></div><p class="assign-grades">${esc(joinY(grades))}</p>${rows ? `<p class="assign-ask">¿Quieres usar con este nivel alguno de los programas que ya elegiste?</p>${rows}` : '<p class="assign-ask">Ninguno de tus programas elegidos es compatible con estos grados. Elige un programa para este nivel en el catálogo.</p>'}</article>`;
  }).join('');
  const any = levels.some(l => hostsFor(pend.filter(g => g.levelId === l.id)).length);
  frame('Configura los grados nuevos', 'Estos grados tienen estudiantes, pero todavía no están en ningún programa. Si no los incluyes, no entran en la cotización ni en el PDF.',
    `${cards}<div class="assign-note">${icon('info')}<span>Al sumarlos, vamos a pedirte revisar los equipos de cada programa para que la cantidad y el precio se actualicen.</span></div><div class="foot">${any ? '<button class="btn btn-primary" onclick="applyAssign()">Sumar y configurar equipos ' + icon('arrow') + '</button>' : ''}<button class="btn btn-outline" onclick="catalogFromAssign()">Elegir otros programas</button><button class="text-btn" onclick="skipAssign()">Dejar estos grados sin programa por ahora</button></div>`);
}

// ---------- Paso 3: catálogo ----------
// Agrega el programa con un solo conjunto de equipos para todos los niveles compatibles (se puede separar por nivel al configurarlo).
function entryAt(pid, level) { return state.selected.findIndex(s => s.programId === pid && entryGroups(s).some(g => g.levelId === level)); }
function addProgram(id, level) {
  const p = findP(id), others = state.selected.filter(s => s.programId === id);
  if (entryAt(id, level) !== -1) return;
  const used = new Set(others.flatMap(s => s.groupIds));
  let pool = groups().filter(g => g.students > 0 && compatible(p, g) && !used.has(g.id));
  if (others.length) pool = pool.filter(g => g.levelId === level);
  if (!pool.length) return;
  const lv = [...new Set(pool.map(g => g.levelId))];
  ui.preview = null; // agregar confirma el alcance: la vista previa deja de ser necesaria
  state.selected.push({ id: id + '@' + lv.join('+'), programId: id, groupIds: pool.map(g => g.id), sharing: pool.length > 1 ? null : 'separate', simIds: [], units: null, stations: false, plan: 'UNDECIDED', flexBimestres: 1, confirmed: false, calc: null });
  render();
  notify(lv.length > 1 ? p.hardware + ' se agregó para ' + joinY(lv.map(x => findL(x).name)) + ' con el mismo equipo. Puedes separarlo por nivel al configurarlo.' : 'Programa agregado. Puedes seguir explorando otros niveles.');
}
// Separa un programa compartido en un conjunto de equipos por nivel.
function splitByLevel() {
  const s = cur(), lv = entryLevels(s); if (lv.length < 2) return;
  const parts = lv.map(l => { const ids = s.groupIds.filter(id => groups().find(g => g.id === id)?.levelId === l.id); return { ...s, id: s.programId + '@' + l.id, groupIds: ids, sharing: ids.length > 1 ? null : 'separate', simIds: [], units: null, stations: false, confirmed: false, calc: null }; });
  state.selected.splice(state.selectedIndex, 1, ...parts); ui.sub = 0; ui.focusTitle = true; render();
  notify('Separamos ' + findP(s.programId).hardware + ' por nivel. Configura cada uno por separado.');
}
// Vuelve a compartir el mismo equipo entre todos los niveles de este programa.
function mergeLevels() {
  const s = cur(), same = state.selected.filter(x => x.programId === s.programId);
  s.groupIds = [...new Set(same.flatMap(x => x.groupIds))]; s.sharing = null; s.simIds = []; s.units = null; s.stations = false; s.confirmed = false; s.calc = null;
  s.id = s.programId + '@' + entryLevels(s).map(l => l.id).join('+');
  state.selected = state.selected.filter(x => x.programId !== s.programId || x === s); state.selectedIndex = state.selected.indexOf(s); ui.sub = 0; ui.focusTitle = true; render();
  notify(findP(s.programId).hardware + ' ahora se comparte entre todos los niveles.');
}
function removeProgram(i) {
  const s = state.selected[i]; if (!s) return;
  askConfirm('¿Quitar este programa?', progTitle(s) + ' saldrá de tu propuesta.', 'Sí, quitar', () => {
    state.selected = state.selected.filter(x => x.id !== s.id); state.selectedIndex = Math.min(state.selectedIndex, Math.max(0, state.selected.length - 1)); render(); notify('Programa quitado de tu propuesta.');
  });
}
// Vista previa de un programa que no está en la propuesta: solo muestra su actividad en el campus.
// Agregar sigue siendo lo único que cambia el alcance; la vista previa no entra en state ni en el PDF.
function togglePreview(programId) {
  const on = ui.preview?.programId !== programId;
  ui.preview = on ? { programId } : null;
  document.querySelectorAll('[data-preview]').forEach(b => {
    const mine = on && b.dataset.preview === programId;
    b.setAttribute('aria-pressed', String(mine)); b.querySelector('span').textContent = mine ? 'Quitar vista previa' : 'Ver en el campus';
  });
  syncCampus();
  // En móvil el campus puede haber quedado arriba, fuera de la pantalla: se acerca sin mover el foco.
  const top = mascotHost?.getBoundingClientRect();
  if (on && top && (top.bottom < 80 || top.top > innerHeight - 80)) mascotHost.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const box = mascotHost?.querySelector('[data-campus-feedback]');
  if (box) { box.dataset.previewProgram = on ? programId : ''; box.textContent = on ? 'Vista previa: ' + findP(programId).name + '. No forma parte de tu propuesta hasta que la agregues.' : 'Vista previa cerrada.'; }
}
function nextFromPrograms() { if (!state.selected.length) { notify('Agrega al menos un programa a tu propuesta.'); return; } step(4); }
function renderPrograms() {
  if (ui.assign && coverage().pending.length) { renderAssign(); return; }
  ui.assign = false;
  const active = activeLevels().filter(l => groups().some(g => g.levelId === l.id && g.students > 0));
  frame('¿Qué les gustaría aprender?', 'Descubre programas adecuados para los niveles con estudiantes. Agrega todos los que te interesan: luego podrás ajustar grados, equipos y modalidad de cada uno.',
    `${active.map(l => {
      const list = PROGRAMS.filter(p => p.levels.includes(l.id) && groups().some(g => g.levelId === l.id && g.students > 0 && compatible(p, g)));
      return `<div class="catalog-level"><h2>${esc(l.name)}</h2><small>${l.grades.reduce((n, g) => n + groups().filter(x => x.gradeId === g[0]).reduce((a, x) => a + (x.students || 0), 0), 0)} estudiantes registrados</small></div><div class="program-grid">${list.map(p => {
        const idx = entryAt(p.id, l.id), selected = idx !== -1, shared = selected && entryLevels(state.selected[idx]).length > 1;
        return `<article class="prog ${selected ? 'chosen' : ''}">${media(p, l.id)}<div class="prog-body"><div class="eyebrow">${esc(p.area)}</div><h3>${esc(p.name)}</h3><p>${esc(p.short)}</p><details><summary>Ver qué incluye</summary><ul class="inc-bullets"><li><b>Equipo:</b> ${esc(p.hardware)}${p.ratio ? ', hasta ' + p.ratio + ' estudiantes por equipo' : ''}</li><li><b>Grados:</b> ${esc(joinY(l.grades.filter(g => p.grades.includes(g[0])).map(g => g[1])))}</li><li><b>Comprar (Integra):</b> equipo propio, orientación inicial y 1 hora de capacitación</li><li><b>Rentar (Flex):</b> equipo en renta, capacitación docente, seguimiento y soporte, Sócrates Aprende</li><li><b>Pagar en cuotas (Evoluciona):</b> el equipo pasa a ser del colegio, capacitación, recursos para el aula, seguimiento y soporte, Sócrates Aprende</li><li><b>Siguiente paso:</b> eliges los grupos, la cantidad de equipos y la modalidad</li></ul></details></div><footer><div class="equip-label"><strong>${esc(p.hardware)}</strong>${p.ratio ? 'Hasta ' + p.ratio + ' estudiantes por equipo' : 'Equipamiento por definir con GuateGeeks'}</div>${selected ? `<div class="status green" style="align-self:start">Agregado a tu propuesta</div>${shared ? `<p class="help-line" style="margin:0">Equipo compartido entre ${esc(levelsLabel(state.selected[idx]))}.</p>` : ''}<div class="prog-actions"><button class="btn btn-outline" onclick="editProgram(${idx})">Configurar este programa ${icon('arrow')}</button><button class="icon-btn" onclick="removeProgram(${idx})" aria-label="Quitar ${esc(p.name)}">${icon('trash')}</button></div>` : `<div class="prog-actions prog-actions-add"><button class="btn btn-primary" onclick="addProgram('${p.id}','${l.id}')">Agregar a mi propuesta ${icon('plus')}</button><button type="button" class="btn btn-outline preview-btn" data-preview="${p.id}" aria-pressed="${ui.preview?.programId === p.id}" aria-label="Ver ${esc(p.name)} en el campus, sin agregarlo" onclick="togglePreview('${p.id}')">${icon('eye')}<span>${ui.preview?.programId === p.id ? 'Quitar vista previa' : 'Ver en el campus'}</span></button></div>`}</footer></article>`;
      }).join('')}</div>`;
    }).join('') || '<div class="empty">Registra estudiantes para descubrir los programas compatibles.</div>'}<div class="foot"><button class="btn btn-outline" onclick="step(2)">← Editar estudiantes</button><button class="btn btn-primary" onclick="nextFromPrograms()" ${!state.selected.length ? 'disabled' : ''}>Configurar mis programas ${icon('arrow')}</button></div>`);
}

// ---------- Paso 4: configurar un programa (una decisión a la vez) ----------
const cur = () => state.selected[state.selectedIndex];
// Decisiones que aplican a este programa: sin ratio no hay equipos que calcular y con un solo grupo no hay nada que compartir.
// «Grupos» solo se pregunta si hay algo que decidir: más de un grupo posible, varios niveles o el mismo programa en otro nivel.
function groupsConfigurable(s) {
  const p = findP(s.programId), taken = new Set(state.selected.filter(x => x !== s && x.programId === s.programId).flatMap(x => x.groupIds));
  const opts = groups().filter(g => g.students > 0 && compatible(p, g) && !taken.has(g.id));
  return opts.length > 1 || entryLevels(s).length > 1 || state.selected.some(x => x !== s && x.programId === s.programId);
}
function stepKeys(s) {
  const p = findP(s.programId);
  if (!p.ratio) return ['groups'];
  return [...(groupsConfigurable(s) ? ['groups'] : []), ...(s.groupIds.length > 1 ? ['sharing'] : []), 'quantity'];
}
function changeConfig(prop, val) {
  const s = cur(); if (!s) return; s[prop] = val;
  if (prop === 'sharing') { if (val !== 'simultaneous') s.simIds = []; s.stations = false; }
  render();
}
function toggleGroup(gid) {
  const s = cur(), before = s.groupIds.length;
  if (s.groupIds.includes(gid)) {
    if (before === 1) { notify('Debe quedar al menos un grupo participante.'); return; }
    s.groupIds = s.groupIds.filter(x => x !== gid); s.simIds = s.simIds.filter(x => x !== gid);
  } else s.groupIds.push(gid);
  if (s.groupIds.length < 2) { s.sharing = 'separate'; s.simIds = []; }
  else if (before < 2) s.sharing = null; // ahora sí hay que preguntar cómo se comparten
  s.units = null; s.stations = false; render();
}
function toggleSim(gid) { const s = cur(); s.simIds = s.simIds.includes(gid) ? s.simIds.filter(x => x !== gid) : [...s.simIds, gid]; s.units = null; s.stations = false; render(); }
function adjustUnits(d) {
  const s = cur(), rec = analysis(s).rec, base = unitsOf(s) ?? (rec ? rec.teams : 1);
  s.units = Math.max(1, Math.min(1000, base + d));
  if (rec && rec.basis !== 'unknown' && s.units === rec.suggested) s.units = null; // vuelve a seguir la recomendación
  s.stations = false; render();
}
function useRecommended() { const s = cur(); s.units = null; s.stations = false; render(); }
function chooseStations() { cur().stations = true; render(); }
function useTeams(n) { const s = cur(); s.units = n; s.stations = false; render(); }
function commit(s) { s.confirmed = true; s.calc = M.entrySignature(s, groups()); }

function canProceed(s, key) {
  if (key === 'groups') return s.groupIds.length ? '' : 'Elige al menos un grupo.';
  if (key === 'sharing') {
    if (!s.sharing) return 'Elige una opción para continuar.';
    return s.sharing === 'simultaneous' && s.simIds.length < 2 ? 'Elige al menos dos grupos que coincidan en horario.' : '';
  }
  if (key === 'quantity') {
    // Cualquier cantidad de equipos es válida (también uno solo); la cobertura limitada es un aviso, no un bloqueo.
    return unitsOf(s) == null ? 'Indica cuántos equipos usarás.' : '';
  }
  return '';
}
// ---- Navegación entre programas: siempre al siguiente pendiente; lo ya guardado se revisa sin repetir ----
function nextPending(from) {
  const n = state.selected.length;
  for (let k = 1; k <= n; k++) { const i = (from + k) % n; if (!state.selected[i].confirmed) return i; }
  return -1;
}
// Al entrar a «Personalizar» desde el menú: primero lo pendiente; si todo está guardado, la revisión del actual.
function pickConfigTarget() {
  const k = state.selected.findIndex(s => !s.confirmed);
  state.selectedIndex = k >= 0 ? k : Math.min(state.selectedIndex, Math.max(0, state.selected.length - 1));
  ui.review = !!state.selected[state.selectedIndex]?.confirmed; ui.sub = 0; ui.single = false;
}
function openProgram(i) {
  state.selectedIndex = i; ui.sub = 0; ui.single = false; ui.review = !!state.selected[i].confirmed;
  state.step = 4; ui.focusTitle = true; store(); render();
}
function editProgram(i) { openProgram(i); }
function jumpTo(key) { const keys = stepKeys(cur()); ui.review = false; ui.single = true; ui.sub = Math.max(0, keys.indexOf(key)); ui.focusTitle = true; render(); }
function cfgNav(d) {
  const s = cur(), keys = stepKeys(s);
  ui.sub = Math.min(ui.sub, keys.length - 1); ui.focusTitle = true;
  if (d === -1) {
    if (ui.single) { ui.single = false; ui.review = true; render(); return; }
    if (ui.sub > 0) { ui.sub--; render(); } else step(3);
    return;
  }
  const why = canProceed(s, keys[ui.sub]); if (why) { notify(why); return; }
  if (ui.single) { commit(s); ui.single = false; ui.review = true; render(); notify('Cambio guardado.'); return; }
  if (ui.sub < keys.length - 1) { ui.sub++; render(); return; }
  commit(s);
  const nx = nextPending(state.selectedIndex);
  if (nx >= 0) { state.selectedIndex = nx; ui.sub = 0; ui.review = false; render(); } else step(5);
}
function goNextPending() { const nx = nextPending(state.selectedIndex); if (nx >= 0) openProgram(nx); else step(5); }

function equipHead(s, p) {
  return `<div class="equipment-focus">${media(p, levelKey(s), 'compact')}<div class="equipment-meta"><div class="eyebrow">Programa ${state.selectedIndex + 1} de ${state.selected.length}</div><h2>${esc(progTitle(s))}</h2><p>${esc(p.hardware)}${p.ratio ? ' · hasta ' + p.ratio + ' estudiantes por equipo' : ' · por definir'}<br>${esc(levelsLabel(s))} · ${participation(s)} estudiantes participantes</p></div></div>`;
}
// Revisión de un programa ya guardado: se cambia solo lo necesario.
function cfgReview(s, p) {
  const gs = entryGroups(s), u = unitsOf(s), an = analysis(s);
  const sharingTxt = { separate: 'Sí, en horarios distintos', simultaneous: 'Algunos grupos trabajan al mismo tiempo', unknown: 'Todavía no lo sé' }[s.sharing] || '—';
  const rows = [['groups', 'Grupos', `${gs.length} ${plural(gs.length, 'grupo', 'grupos')} · ${participation(s)} estudiantes`]];
  if (stepKeys(s).includes('sharing')) rows.push(['sharing', 'Horarios', sharingTxt]);
  if (p.ratio) rows.push(['quantity', 'Equipos', `${u ?? '—'} ${p.hardware}${an.state === 'limited' ? ' · trabajo por estaciones' : an.state === 'full' ? ' · cobertura completa' : ''}`]);
  const pend = nextPending(state.selectedIndex);
  return `<div class="review-list">${rows.map(([k, t, v]) => `<div class="review-row"><div><span>${t}</span><b>${esc(v)}</b></div>${stepKeys(s).includes(k) ? `<button class="btn btn-small btn-outline" onclick="jumpTo('${k}')" aria-label="Cambiar ${t.toLowerCase()}">Cambiar</button>` : ''}</div>`).join('')}</div><div class="foot"><button class="btn btn-outline" onclick="step(5)">Volver a mi propuesta</button>${pend >= 0 ? `<button class="btn btn-primary" onclick="goNextPending()">Configurar el siguiente pendiente ${icon('arrow')}</button>` : `<button class="btn btn-primary" onclick="step(5)">Listo, ver mi propuesta ${icon('arrow')}</button>`}</div>`;
}

function explanation(s, p, an) {
  const sized = entryGroups(s).filter(g => g.students > 0), rec = an.rec;
  const prov = sized.some(g => !g.confirmed) ? ' Parte de la matrícula está como total sin secciones, así que esta cifra es provisional.' : '';
  if (!rec) return 'Ingresa estudiantes en los grupos participantes para obtener una recomendación.';
  if (rec.basis === 'unknown') return `Sin horarios confirmados no podemos garantizar la cobertura: podrías necesitar entre <b>${rec.scenarios[0].teams}</b> y <b>${rec.scenarios[1].teams}</b> ${esc(p.hardware)}, según cuántos grupos coincidan.${prov}`;
  if (rec.basis === 'separate') {
    const big = sized.reduce((a, b) => M.teamsFor(b.students, p.ratio) > M.teamsFor(a.students, p.ratio) ? b : a);
    return `Tu grupo más grande tiene <b>${big.students} estudiantes</b> (${esc(big.label)}). Recomendamos <b>${rec.teams} ${esc(p.hardware)}</b>, con hasta ${p.ratio} estudiantes por equipo.${sized.length > 1 ? ' Los demás grupos pueden usar los mismos equipos en horarios distintos.' : ''}${prov}`;
  }
  return `Los grupos que trabajan al mismo tiempo necesitan <b>${rec.blockTeams} ${esc(p.hardware)}</b> entre ellos. Recomendamos <b>${rec.teams}</b>: el mayor entre ese bloque y los demás grupos, que usan los equipos en horarios distintos.${prov}`;
}
function coverageHTML(s, p, an) {
  const u = unitsOf(s);
  if (an.state === 'none') return '';
  if (an.state === 'unconfirmed') return '<div class="warning">Cobertura no confirmada. Si confirmas cuáles grupos coinciden en horario, podemos darte una cantidad exacta.</div>';
  if (an.state === 'full') return `<div class="tip"><b>${u} equipos</b> permiten trabajar a <b>${u * p.ratio} estudiantes</b> al mismo tiempo. Cobertura completa para los grupos seleccionados.</div>`;
  return `<div class="warning" role="alert"><b>Cobertura limitada.</b> Con ${u} ${plural(u, 'equipo', 'equipos')} ${plural(u, 'puede trabajar', 'pueden trabajar')} <b>${an.cap} estudiantes</b> al mismo tiempo, así que algunos grupos tendrían que rotar: ${an.rotations.map(r => `${esc(r.label)}, ${r.rotations} ${plural(r.rotations, 'rotación', 'rotaciones')}`).join('; ')}.${s.sharing === 'simultaneous' ? ' Las rotaciones de grupos que comparten horario deben validarse con el colegio.' : ''} Menos equipos implican una metodología y un horario por validar; no es una experiencia equivalente a la cobertura completa. <b>Puedes continuar con ${u} ${esc(p.hardware)}</b>: la cotización se calcula con esa cantidad.<div class="links" style="margin-top:12px"><button class="btn btn-small ${s.stations ? 'btn-primary' : 'btn-outline'}" onclick="chooseStations()" aria-pressed="${!!s.stations}">${s.stations ? '✓ ' : ''}Trabajar por estaciones con ${u} ${plural(u, 'equipo', 'equipos')}</button><button class="btn btn-small btn-outline" onclick="useTeams(${an.rec.teams})">Usar ${an.rec.teams} equipos (cobertura completa)</button></div>${s.stations ? '' : '<p style="margin:10px 0 0">Elige una opción para continuar.</p>'}</div>`;
}

function cfgGroups(s, p) {
  const taken = new Set(state.selected.filter(x => x !== s && x.programId === s.programId).flatMap(x => x.groupIds));
  const opts = groups().filter(g => g.students > 0 && compatible(p, g) && !taken.has(g.id));
  const lv = entryLevels(s), others = state.selected.some(x => x !== s && x.programId === s.programId);
  const share = lv.length > 1
    ? `<div class="sub-pick"><b>Mismo equipo para ${esc(levelsLabel(s))}</b><p class="help-line" style="margin:6px 0 10px">${esc(p.hardware)} puede usarse en estos niveles, así que sugerimos un solo conjunto de equipos que se comparte entre los grupos en horarios distintos. Si cada nivel tendrá su propio equipo, sepáralos.</p><button class="btn btn-small btn-outline" onclick="splitByLevel()">Usar un equipo distinto por nivel</button></div>`
    : others ? `<div class="sub-pick"><p class="help-line" style="margin:0 0 10px">Este equipo es solo para ${esc(levelsLabel(s))}. ${esc(p.hardware)} también puede compartirse con los demás niveles.</p><button class="btn btn-small btn-outline" onclick="mergeLevels()">Compartir el mismo equipo entre niveles</button></div>` : '';
  return `<div class="chips big">${opts.map(g => `<button class="chip ${s.groupIds.includes(g.id) ? 'on' : ''}" onclick="toggleGroup('${g.id}')" aria-pressed="${s.groupIds.includes(g.id)}">${s.groupIds.includes(g.id) ? '✓ ' : ''}${esc(g.label)} · ${g.students}${g.confirmed ? '' : ' (provisional)'}</button>`).join('')}</div><p class="help-line">Participan <b>${participation(s)} estudiantes</b>. Todos vienen marcados; quita los que no cursarán este programa.</p>${share}`;
}
function cfgSharing(s, p) {
  const opts = [['separate', 'Sí, en horarios distintos', 'Un mismo conjunto de equipos se usa con un grupo a la vez.'], ['simultaneous', 'Algunos grupos trabajan al mismo tiempo', 'Elige cuáles coinciden; los demás se tratan como sesiones independientes.'], ['unknown', 'Todavía no lo sé', 'Verás un escenario mínimo y uno máximo hasta confirmar los horarios.']];
  return `<div class="radios">${opts.map(([v, t, d]) => `<label class="radio ${s.sharing === v ? 'selected' : ''}"><input type="radio" name="sharing" ${s.sharing === v ? 'checked' : ''} onchange="changeConfig('sharing','${v}')"><span><strong>${t}</strong><small>${d}</small></span></label>`).join('')}</div>${s.sharing === 'simultaneous' ? `<div class="sub-pick"><span class="label">¿Cuáles grupos coinciden en horario? Elige al menos dos.</span><div class="chips big">${s.groupIds.map(id => groups().find(g => g.id === id)).filter(Boolean).map(g => `<button class="chip ${s.simIds.includes(g.id) ? 'on' : ''}" onclick="toggleSim('${g.id}')" aria-pressed="${s.simIds.includes(g.id)}">${s.simIds.includes(g.id) ? '✓ ' : ''}${esc(g.label)}</button>`).join('')}</div></div>` : ''}`;
}
function cfgQuantity(s, p) {
  const an0 = analysis(s), rec0 = an0.rec;
  if (rec0 && rec0.basis === 'unknown' && s.units == null && rec0.suggested != null) s.units = rec0.suggested;
  const an = analysis(s), rec = an.rec, u = unitsOf(s);
  if (!rec) return '<div class="warning">Ingresa estudiantes en los grupos participantes para obtener una recomendación.</div>';
  const unknown = rec.basis === 'unknown', sug = rec.suggested, shown = u ?? rec.teams, isRec = !unknown && (s.units == null || s.units === sug);
  const sized = entryGroups(s).filter(g => g.students > 0);
  const big = rec.basis === 'separate' && sized.length ? sized.reduce((x, y) => M.teamsFor(y.students, p.ratio) > M.teamsFor(x.students, p.ratio) ? y : x) : null;
  const facts = big
    ? `<ul class="qty-facts"><li><span>Grupo más grande</span><b>${big.students} estudiantes</b><small>${esc(big.label)}</small></li><li><span>Por equipo</span><b>hasta ${p.ratio} estudiantes</b><small>${esc(p.hardware)}</small></li><li class="${isRec ? 'rec' : ''}"><span>Recomendamos</span><b>${sug} ${esc(p.hardware)}</b><small>${sized.length > 1 ? 'Los demás grupos los usan en otros horarios' : 'Para ese grupo'}</small></li></ul>`
    : `<p class="qty-text">${explanation(s, p, an)}</p>${unknown ? `<ul class="qty-scen">${rec.scenarios.map(x => `<li>${esc(x.label)}: <b>${x.teams}</b> equipos</li>`).join('')}</ul>` : ''}`;
  return `<div class="rec-card qty"><div class="qty-ctl"><span class="qty-label">${esc(p.hardware)}</span><div class="number-lg"><button onclick="adjustUnits(-1)" aria-label="Reducir ${esc(p.hardware)}">−</button><strong aria-live="polite">${shown}</strong><button onclick="adjustUnits(1)" aria-label="Aumentar ${esc(p.hardware)}">+</button></div><span class="qty-state ${isRec ? 'rec' : ''}">${unknown ? 'Mínimo sugerido: ' + rec.scenarios[0].teams : isRec ? '✓ Cantidad recomendada' : 'Recomendamos ' + sug}</span>${!isRec && !unknown ? `<button class="text-btn" onclick="useRecommended()">Volver a ${sug}</button>` : ''}</div><div class="rec-body">${facts}<p class="qty-hint">Ajusta con − y +: abajo ves cuántos estudiantes pueden trabajar a la vez.</p></div></div><div id="coverage">${coverageHTML(s, p, an)}</div>`;
}
const PLAN_CARDS = [
  { pick: 'INTEGRA', ids: ['INTEGRA'], title: 'Comprar el equipo', tag: 'Integra', sum: 'Compras el equipo y queda en tu colegio desde el primer día.',
    inc: ['Equipamiento educativo, propiedad del colegio desde la compra', 'Orientación inicial para ponerlo en marcha', '1 hora de capacitación de uso; el tiempo adicional se cotiza aparte'], foot: 'No incluye Sócrates Aprende.' },
  { pick: 'FLEX', ids: ['FLEX'], title: 'Rentar por bimestres', tag: 'Flex', sum: 'Rentas el equipo y puedes cambiar de tecnología al iniciar cada bimestre.',
    inc: ['Equipo de GuateGeeks durante la renta; se devuelve al terminar', 'Capacitación docente e integración tecnológica', 'Seguimiento y soporte', 'Sócrates Aprende'], foot: 'Pruebas, ajustas y evolucionas la tecnología bimestre a bimestre.' },
  { pick: 'EV8', ids: ['EV8', 'EV16'], title: 'Pagar en cuotas para adquirir', tag: 'Evoluciona', sum: 'Pago inicial del 20 % y cuotas mensuales; al completar el plazo, el equipo pasa a ser del colegio.',
    inc: ['Equipamiento que pasa a ser del colegio al terminar de pagar', 'Capacitación docente e integración tecnológica', 'Recursos para el aula', 'Seguimiento y soporte', 'Sócrates Aprende'], foot: 'Construimos e integramos contigo un programa que se sostiene, evoluciona y crece en el tiempo.' }
];
function renderConfig() {
  if (!state.selected.length) { step(3); return; }
  state.selectedIndex = Math.min(state.selectedIndex, state.selected.length - 1);
  const s = cur(), p = findP(s.programId), keys = stepKeys(s);
  ui.sub = Math.min(ui.sub, keys.length - 1);
  if (ui.review && s.confirmed) { frame('Ya configuraste este programa', 'Está guardado. Cambia solo lo que necesites; el resto se conserva.', equipHead(s, p) + cfgReview(s, p)); return; }
  const key = keys[ui.sub], why = canProceed(s, key), last = ui.sub === keys.length - 1;
  const an = analysis(s);
  const titles = { groups: '¿Qué grupos participarán?', sharing: '¿Los grupos usan los mismos equipos en horarios distintos?', quantity: an.rec && an.rec.basis !== 'unknown' ? 'Te recomendamos ' + an.rec.teams + ' ' + p.hardware : 'Cantidad de equipos', };
  const descs = { groups: 'No todos los grados tienen que cursar este programa.', sharing: 'Esto define cuántos equipos necesitas. No hace falta un calendario completo.', quantity: 'Calculada con los grupos y horarios que indicaste. Puedes ajustarla.', };
  const body = { groups: cfgGroups, sharing: cfgSharing, quantity: cfgQuantity }[key](s, p);
  const label = ui.single ? 'Guardar cambio' : last ? (nextPending(state.selectedIndex) >= 0 ? 'Guardar y configurar el siguiente' : 'Guardar y ver mi propuesta') : 'Siguiente';
  frame(titles[key], descs[key],
    `${equipHead(s, p)}<div class="decision-dots" ${ui.single ? 'hidden' : ''} role="group" aria-label="Decisión ${ui.sub + 1} de ${keys.length}">${keys.map((k, i) => `<span class="${i <= ui.sub ? 'on' : ''}"></span>`).join('')}<small>Decisión ${ui.sub + 1} de ${keys.length}</small></div>${body}<div class="foot"><button class="btn btn-outline" onclick="cfgNav(-1)">← Atrás</button><span class="fineprint" role="status">${why}</span><button class="btn btn-primary" onclick="cfgNav(1)" ${why ? 'disabled' : ''}>${label} ${icon('arrow')}</button></div>`);
}

// ---------- Paso 5: propuesta ----------
const STATUS = {
  draft: ['amber', 'Pendiente de configurar'], plan: ['amber', 'Modalidad por elegir'], quote: ['amber', 'Requiere cotización personalizada'],
  stale: ['amber', 'Precio pendiente de actualizar'], priced: ['green', 'Precio calculado']
};
const statusChip = st => `<span class="status ${STATUS[st][0]}">${STATUS[st][1]}</span>`;
function noteFor(s, p, an) {
  const sized = entryGroups(s).filter(g => g.students > 0), prov = sized.some(g => !g.confirmed);
  if (!p.ratio) return { pending: true, text: 'Equipamiento por definir con GuateGeeks. Las estaciones y la propuesta económica se definen en la cotización.' };
  if (an.state === 'unconfirmed') return { pending: true, text: `Horarios por confirmar: podrían requerirse entre ${an.rec.scenarios[0].teams} y ${an.rec.scenarios[1].teams} equipos. La selección no confirma cobertura completa.` };
  if (an.state === 'limited') return { pending: true, text: `Con ${unitsOf(s)} ${plural(unitsOf(s), 'equipo', 'equipos')} ${plural(unitsOf(s), 'puede trabajar', 'pueden trabajar')} ${an.cap} estudiantes a la vez; el grupo más grande necesitaría ${an.maxRot} ${plural(an.maxRot, 'rotación', 'rotaciones')}. Se trabaja por estaciones y la metodología y el horario deben validarse.` };
  if (an.state === 'none') return { pending: true, text: 'Falta definir la cantidad de equipos.' };
  const n = sized.length;
  return { pending: prov, text: `${s.sharing === 'simultaneous' ? 'Los grupos que coinciden usan equipos distintos entre sí; los demás comparten el conjunto.' : (n > 1 ? `Los ${n} grupos pueden utilizar los mismos equipos en horarios distintos.` : 'Equipamiento para el grupo seleccionado.')} Cobertura completa con ${unitsOf(s)} equipos.${prov ? ' Provisional: hay grupos con total sin secciones.' : ''}` };
}
// Cuántos participan, cuántos equipos y cuántos estudiantes trabajan a la vez (explicado en lenguaje claro).
function capacityText(s, p, u, an) {
  if (!p.ratio || !u) return 'Las estaciones y la propuesta económica de este programa se definen con GuateGeeks.';
  const cap = u * p.ratio;
  const how = an.state === 'limited'
    ? 'Como hay menos equipos de los recomendados, los estudiantes de cada grupo se turnan para usarlos.'
    : s.sharing === 'simultaneous' ? 'Los grupos que coinciden en horario usan equipos distintos; los demás grupos usan los mismos equipos en otro horario.'
    : s.sharing === 'unknown' || !s.sharing ? 'Los horarios aún no están confirmados, así que esta capacidad es una estimación.'
    : 'Cada grupo usa los equipos en su propio horario, por eso los mismos equipos sirven para todos los grupos.';
  return `Cada equipo lo usan hasta ${p.ratio} estudiantes a la vez: con ${u} ${p.hardware} trabajan ${cap} estudiantes al mismo tiempo. ${how}`;
}
function capacityTiles(s, p, u, an) {
  const n = participation(s);
  if (!p.ratio || !u) return `<div class="proposal-data"><div><b>${n}</b><small>estudiantes participan en este programa</small></div><div><b>Por definir</b><small>equipos y estudiantes<br>por equipo</small></div></div>`;
  const cap = u * p.ratio;
  const how = an.state === 'limited'
    ? 'Como hay menos equipos de los recomendados, los estudiantes de cada grupo se turnan para usarlos.'
    : s.sharing === 'simultaneous' ? 'Los grupos que coinciden en horario usan equipos distintos; los demás grupos usan los mismos equipos en otro horario.'
    : s.sharing === 'unknown' || !s.sharing ? 'Los horarios aún no están confirmados, así que esta capacidad es una estimación.'
    : 'Cada grupo usa los equipos en su propio horario, por eso los mismos equipos sirven para todos los grupos.';
  return `<div class="proposal-data"><div><b>${n}</b><small>estudiantes participan en este programa</small></div><div><b>${u}</b><small>${esc(p.hardware)} en total</small></div><div><b>${cap}</b><small>estudiantes trabajan a la vez</small></div></div><p class="cap-explain">Cada equipo lo usan hasta ${p.ratio} estudiantes a la vez: con ${u} ${esc(p.hardware)} trabajan ${cap} estudiantes al mismo tiempo. ${how}</p>`;
}
// Servicios incluidos según la modalidad (textos del cotizador vigente).

// Cotización de un programa: misma información y orden que el cotizador vigente.
// ---- Así quedan tus pagos: línea de tiempo de toda la propuesta ----
const PAY_COLORS = ['#685599', '#5fbad6', '#ef8556', '#1d6a58', '#a34825', '#45335f'];
function paymentPlan(t) {
  const rows = t.rows.filter(r => r.quote);
  if (!rows.length) return null;
  const sch = r => payView(r.quote).schedule, len = Math.max(...rows.map(r => sch(r).length));
  const cols = Array.from({ length: len }, (_, m) => rows.map(r => sch(r)[m] || 0));
  const totals = cols.map(c => c.reduce((a, b) => a + b, 0));
  // Tramos de cuota mensual: cambian cuando termina el plazo de algún programa.
  const monthly = rows.filter(r => sch(r).length > 1);
  const ends = [...new Set(monthly.map(r => sch(r).length - 1))].sort((a, b) => a - b);
  const phases = []; let from = 1;
  ends.forEach(end => { phases.push({ from, to: end, amount: monthly.filter(r => sch(r).length - 1 >= end).reduce((s, r) => s + sch(r)[1], 0) }); from = end + 1; });
  return { rows, cols, totals, len, phases, initial: totals[0], grand: totals.reduce((a, b) => a + b, 0) };
}
function paymentsHTML(t) {
  const pp = paymentPlan(t); if (!pp) return '';
  const max = Math.max(...pp.totals);
  const phaseTxt = pp.phases.map(f => `<b>${Q(f.amount)}</b> al mes (${f.from === f.to ? 'mes ' + f.from : 'meses ' + f.from + ' a ' + f.to})`);
  const lead = pp.phases.length
    ? `Pagarías <b>${Q(pp.initial)}</b> al iniciar${pp.phases.length ? ' y después ' + phaseTxt.join(', luego ') : ''}.`
    : 'Es un pago único.';
  const aria = `Pagos de la propuesta: ${Q(pp.initial)} al inicio` + (pp.phases.length ? ', luego ' + pp.phases.map(f => `${Q(f.amount)} al mes de los meses ${f.from} a ${f.to}`).join(', ') : '') + `. Total ${ivaTxt()}: ${Q(pp.grand)}.`;
  const label = m => m === 0 ? 'Inicio' : String(m);
  return `<div class="pay-block"><h3>Así quedan tus pagos</h3><p class="pay-lead">${lead}${pp.rows.length > 1 && pp.phases.length > 1 ? ' La cuota cambia cuando termina el plazo de un programa.' : ''}</p>
  <div class="pay-facts">${pp.phases.length ? `<div><span>Al iniciar</span><strong>${Q(pp.initial)}</strong></div>${pp.phases.map(f => `<div><span>${f.from === f.to ? 'Mes ' + f.from : 'Meses ' + f.from + ' a ' + f.to}</span><strong>${Q(f.amount)}<small> al mes</small></strong></div>`).join('')}<div class="sum"><span>Total ${ivaTxt()}</span><strong>${Q(pp.grand)}</strong></div>` : `<div class="sum"><span>Pago único · total ${ivaTxt()}</span><strong>${Q(pp.grand)}</strong></div>`}</div>
  ${pp.len > 1 ? `<details><summary>Ver tabla de pagos mes a mes</summary><div class="pay-table-wrap"><table class="pay-table"><thead><tr><th scope="col">Mes</th><th scope="col">Pago ${ivaTxt()}</th></tr></thead><tbody>${pp.totals.map((v, m) => `<tr><th scope="row">${m === 0 ? 'Al iniciar' : 'Mes ' + m}</th><td><b>${Q(v)}</b></td></tr>`).join('')}</tbody></table></div><p class="fineprint">Precios ${ivaTxt()}, en quetzales enteros. Todas las cuotas son iguales.</p></details>` : ''}</div>`;
}

// ---- Modalidad: se elige y se compara dentro de la misma tarjeta del programa ----
// Aviso destacado: solo Evoluciona deja el equipo en la institución al completar el plazo.
const isEvo = plan => plan === 'EV8' || plan === 'EV16';
// Las instituciones educativas están exentas de IVA: los precios se muestran sin IVA y, si lo desean, con IVA.
const ivaOn = () => state.iva === true;
const ivaTxt = () => ivaOn() ? 'con IVA' : 'sin IVA';
const payView = q => ivaOn() ? { schedule: q.scheduleIva, initial: q.initialIva, total: q.total } : { schedule: q.schedule, initial: q.initial, total: q.net };
function setIva(on) { state.iva = !!on; store(); render(); }

// Selector de modalidad + el detalle de la modalidad elegida, todo en un solo bloque.

function proposalCard(s, i, row) {
  const p = findP(s.programId), an = analysis(s), note = noteFor(s, p, an), u = row.units;
  return `<article class="proposal-card"><div class="proposal-main">${media(p, levelKey(s), 'summary-media')}<div class="proposal-content"><div class="proposal-heading"><div><div class="eyebrow">${esc(p.area)}</div><h3>${esc(progTitle(s))}</h3></div><div class="proposal-tools"><button class="icon-btn" onclick="editProgram(${i})" aria-label="Editar ${esc(p.name)}">${icon('edit')}</button><button class="icon-btn" onclick="removeProgram(${i})" aria-label="Quitar ${esc(p.name)}">${icon('trash')}</button></div></div><p>${esc(p.hardware)}${row.status === 'draft' || row.status === 'quote' || row.status === 'plan' ? ' · ' + statusChip(row.status) : ''}</p><div class="groups-line">${entryGroups(s).map(g => `<span>${esc(g.label.replace(', Sección ', ' · ').replace(' · Sección ', ' · '))}</span>`).join('')}</div>${capacityTiles(s, p, u, an)}</div></div>${note.pending && row.status !== 'draft' ? `<div class="proposal-note pending">${icon('info')}<span>${note.text}</span></div>` : ''}${modalityPicker(s, i, u)}</article>`;
}

// ---- Modalidad por programa (sin precios) e inversión unificada agrupada por modalidad ----
// Cada programa puede tener su modalidad (comprar, rentar o Evoluciona); los precios solo se muestran
// agrupados por modalidad y en total, nunca por nivel ni por programa.
const MODS = [
  { k: 'INTEGRA', label: 'Comprar', tag: 'Integra', note: 'Un solo pago; el equipo es del colegio desde la compra. No incluye Sócrates Aprende.' },
  { k: 'FLEX', label: 'Rentar', tag: 'Flex', note: 'Renta por bimestres con servicios incluidos; el equipo se devuelve al terminar.' },
  { k: 'EVO', label: 'Pagar en cuotas', tag: 'Evoluciona', note: 'Pago inicial y cuotas mensuales; al terminar, el equipo es del colegio.' }
];
const modKey = plan => isEvo(plan) ? 'EVO' : plan;
function syncCalc() { if (agentHostRendering) return; state.selected.forEach(s => { if (s.confirmed) s.calc = M.entrySignature(s, groups()); }); }
// Qué recibe el colegio según la modalidad elegida, redactado por programa (se usa en pantalla y en el PDF).
const SOC = ['Sócrates Aprende', 'Plataforma de GuateGeeks para docentes y estudiantes'];
function includesFor(s, p, u) {
  const eq = `${u || 'Los'} ${p.hardware}`, months = s.plan === 'EV16' ? 16 : 8;
  if (s.plan === 'INTEGRA') return [[`${eq} para tu colegio`, 'Quedan en propiedad de la institución desde la compra'], ['Orientación inicial', 'Para ponerlos en marcha'], ['1 hora de capacitación de uso', 'El tiempo adicional se cotiza aparte'], ['No incluye Sócrates Aprende', 'Se puede sumar con otra modalidad']];
  if (s.plan === 'FLEX') return [[`${eq} en renta`, 'Son de GuateGeeks y se devuelven al terminar'], ['Cambio de tecnología', 'Puedes elegir otra al iniciar cada bimestre'], ['Capacitación docente e integración tecnológica', 'Para llevar el programa al aula'], ['Seguimiento y soporte', 'Durante toda la renta'], SOC];
  if (isEvo(s.plan)) return [[`${eq} que pasan a ser del colegio`, 'Al completar los pagos'], ['Capacitación docente e integración tecnológica', 'Para llevar el programa al aula'], ['Recursos para el aula', ''], ['Seguimiento y soporte', `Durante los ${months} meses`], SOC, ['Un programa que evoluciona', 'Se sostiene y crece contigo en el tiempo']];
  return [];
}
const OWN_TAG = { INTEGRA: ['Tuyo desde la compra', 'own'], FLEX: ['Se devuelve al terminar', 'back'], EV8: ['Tuyo al terminar de pagar', 'own'], EV16: ['Tuyo al terminar de pagar', 'own'] };
function includesHTML(s, p, u) {
  const list = includesFor(s, p, u); if (!list.length) return '';
  const [first, ...rest] = list, [tag, kind] = OWN_TAG[s.plan] || ['', ''];
  const tile = ([t, d]) => `<li class="${t.startsWith('No incluye') ? 'no' : ''}">${icon(t.startsWith('No incluye') ? 'info' : 'check')}<span><b>${esc(t)}</b>${d ? `<small>${esc(d)}</small>` : ''}</span></li>`;
  return `<div class="mod-inc"><div class="mod-inc-head"><b>Con ${esc(modLabel(s))} recibes</b></div><div class="inc-main"><span class="inc-ico">${icon('grid')}</span><span><b>${esc(first[0])}</b><small>${esc(first[1])}</small></span><em class="inc-tag ${kind}">${tag}</em></div><ul>${rest.map(tile).join('')}</ul></div>`;
}
function termBtns(i, cur, opts, fn) {
  return `<div class="term-grid" role="radiogroup" aria-label="Plazo">${opts.map(o => `<button type="button" role="radio" aria-checked="${cur === o.v}" class="term-opt ${cur === o.v ? 'on' : ''}" onclick="${fn}(${i},'${o.v}')"><b>${o.t}</b><small>${o.d}</small></button>`).join('')}</div>`;
}
// Precio por equipo: solo en la compra (Integra), para que se vea cómo se arma el total. Con IVA se redondea al quetzal.
const unitBuy = programId => { const b = TARIFFS[programId] && TARIFFS[programId].buy; return b ? (ivaOn() ? Math.round(b * (1 + FISCAL.iva)) : b) : null; };
const unitLine = (programId, units) => { const u = unitBuy(programId); return u ? `${units} × ${Q(u)} por equipo` : ''; };
function unitPriceTile(s, units) {
  const u = unitBuy(s.programId); if (!u) return '';
  return `<div class="unit-price"><span>Precio por equipo ${ivaTxt()}</span><strong>${Q(u)}</strong><small>${units ? units + ' ' + plural(units, 'equipo', 'equipos') + ' × ' + Q(u) + ' = ' + Q(u * units) : 'Se multiplica por la cantidad de equipos que elegiste'}</small></div>`;
}
function modalityPicker(s, i, units) {
  const cur = modKey(s.plan), bim = s.flexBimestres || 2;
  const seg = MODS.map(m => `<button type="button" role="radio" aria-checked="${cur === m.k}" class="seg-btn ${cur === m.k ? 'on' : ''}" onclick="setModality(${i},'${m.k}')"><b>${m.label}</b><small>${m.tag}</small></button>`).join('');
  const cm = MODS.find(m => m.k === cur);
  let sub = '';
  if (cur === 'FLEX') sub = termBtns(i, bim, [1, 2, 3, 4].map(n => ({ v: n, t: `${n} ${plural(n, 'bimestre', 'bimestres')}`, d: `${n * 2} meses${FISCAL.rentDiscount[n] ? ' · ' + Math.round(FISCAL.rentDiscount[n] * 100) + ' % de descuento' : ''}` })), 'setBim');
  if (cur === 'EVO') sub = termBtns(i, s.plan, [{ v: 'EV8', t: '8 meses', d: 'Cuotas más altas; el equipo es tuyo más pronto' }, { v: 'EV16', t: '16 meses', d: 'Cuotas más bajas; acompañamiento por más tiempo' }], 'setModality');
  return `<div class="price-panel mod-pick"><div class="seg-title" id="seg-${i}">¿Cómo quieres este programa?</div><div class="seg" role="radiogroup" aria-labelledby="seg-${i}">${seg}</div>${sub}${cur === 'INTEGRA' ? unitPriceTile(s, units) : ''}${cm ? includesHTML(s, findP(s.programId), units) : '<p class="pp-note">Elige una modalidad para este programa. Puedes combinar modalidades entre programas.</p>'}</div>`;
}
function setModality(i, k) {
  const s = state.selected[i]; if (!s) return;
  s.plan = k === 'EVO' ? (isEvo(s.plan) ? s.plan : 'EV8') : k; if (!s.flexBimestres) s.flexBimestres = 2; commit(s); render();
}
function setBim(i, n) { const s = state.selected[i]; if (!s) return; s.flexBimestres = Number(n); if (s.plan === 'FLEX') commit(s); render(); }
function setAllModality(k) { state.selected.forEach(s => { if (!s.confirmed) return; s.plan = k === 'EVO' ? (isEvo(s.plan) ? s.plan : 'EV8') : k; if (!s.flexBimestres) s.flexBimestres = 2; commit(s); }); render(); }
// Totales por modalidad: suman los programas que comparten modalidad, sin separar por nivel ni programa.
function modGroups(t) {
  return MODS.map(m => {
    const rows = t.rows.filter(r => r.quote && modKey(r.entry.plan) === m.k);
    if (!rows.length) return null;
    const sum = k => rows.reduce((s, r) => s + r.quote[k], 0);
    return { m, rows, net: sum('net'), tax: sum('tax'), total: sum('total'), names: rows.map(r => progTitle(r.entry)), terms: [...new Set(rows.map(r => r.entry.plan === 'FLEX' ? r.entry.flexBimestres : r.quote.months))].sort((x, y) => x - y) };
  }).filter(Boolean);
}
const modLabel = s => s.plan === 'INTEGRA' ? 'Compra (Integra)' : s.plan === 'FLEX' ? `Renta ${s.flexBimestres} ${plural(s.flexBimestres, 'bimestre', 'bimestres')} (Flex)` : s.plan === 'EV8' ? 'Evoluciona 8 meses' : s.plan === 'EV16' ? 'Evoluciona 16 meses' : '';
const termLabel = g => g.m.k === 'FLEX' ? joinY(g.terms.map(x => x + ' ' + plural(x, 'bimestre', 'bimestres'))) : g.m.k === 'EVO' ? joinY(g.terms.map(x => x + ' meses')) : 'un solo pago';
const modPlain = s => s.plan === 'INTEGRA' ? 'Compra de los equipos en un solo pago.' : s.plan === 'FLEX' ? `Renta por ${s.flexBimestres} ${plural(s.flexBimestres, 'bimestre', 'bimestres')} (${s.flexBimestres * 2} meses), en un solo pago.` : `Pago inicial del 20 % y cuotas mensuales durante ${s.plan === 'EV16' ? 16 : 8} meses.`;
// Costo por estudiante al mes: solo renta y Evoluciona (la compra se paga una vez y no se reparte en meses),
// entre los estudiantes de esos programas y los meses del plazo más largo.
function perStudent(t) {
  const rows = t.rows.filter(r => r.quote && r.entry.plan !== 'INTEGRA'), buy = t.rows.filter(r => r.quote && r.entry.plan === 'INTEGRA');
  const sum = k => rows.reduce((s, r) => s + r.quote[k], 0), buyAmt = buy.reduce((s, r) => s + r.quote[ivaOn() ? 'total' : 'net'], 0);
  if (!rows.length) return { monthly: null, buyAmt };
  const students = M.uniqueStudents(groups(), [...new Set(rows.flatMap(r => r.entry.groupIds))]), months = Math.max(...rows.map(r => r.quote.months)), amount = sum(ivaOn() ? 'total' : 'net'), total = students ? amount / students : 0;
  return { monthly: months && students ? Math.round(total / months) : null, months, students, total, buyAmt };
}
const equipSummary = t => t.rows.filter(r => r.quote).map(r => `${r.units} ${esc(findP(r.entry.programId).hardware)}`).join(' · ');
function investmentHTML(t) {
  const money = x => ivaOn() ? x.total : x.net, gs = modGroups(t);
  const rowsPriced = t.rows.filter(r => r.quote), n = M.uniqueStudents(groups(), [...new Set(rowsPriced.flatMap(r => r.entry.groupIds))]);
  const equipment = rowsPriced.reduce((s, r) => s + r.units, 0), pending = t.rows.filter(r => !r.quote);
  const unchosen = t.rows.filter(r => r.confirmed && r.entry.plan === 'UNDECIDED').length;
  const cards = gs.map(g => {
    const termTxt = g.m.k === 'FLEX' ? `Renta por ${joinY(g.terms.map(x => x + ' ' + plural(x, 'bimestre', 'bimestres')))}` : g.m.k === 'EVO' ? `Plazo de ${joinY(g.terms.map(x => x + ' meses'))}` : 'Un solo pago, sin cuotas';
    return `<article class="grp-card"><div class="opt-head"><b>${g.m.k === 'INTEGRA' ? 'Compra de equipos' : g.m.k === 'FLEX' ? 'Renta por bimestres' : 'Pago en cuotas'}</b><span class="pill-light">${g.m.tag}</span></div><div class="opt-total"><span>Total ${ivaTxt()}</span><strong>${Q(money(g))}</strong><small>${ivaOn() ? 'Sin IVA: ' + Q(g.net) : 'Con IVA (referencia): ' + Q(g.total)}</small></div>${g.m.k === 'INTEGRA' ? `<ul class="grp-units">${g.rows.map(r => `<li><span>${esc(progTitle(r.entry))}</span><b>${unitLine(r.entry.programId, r.units)}</b></li>`).join('')}</ul>` : `<p class="grp-prog">${esc(joinY(g.names))}</p>`}<p class="grp-term">${termTxt}</p></article>`;
  }).join('');
  const all = { net: t.net, total: t.total, tax: t.tax };
  const ps = perStudent(t);
  const totalBlock = rowsPriced.length ? `<div class="grand"><div><span>Inversión total de tu propuesta</span><strong>${Q(money(all))}</strong><small>${ivaOn() ? 'Sin IVA: ' + Q(all.net) : 'Con IVA (referencia): ' + Q(all.total) + ' · IVA de ' + Q(all.tax)}</small></div>${ps.monthly != null ? `<div><span>Por estudiante, cada mes</span><strong>${Q(ps.monthly)}<em> al mes</em></strong><small>Renta y cuotas: ${Q(Math.round(ps.total))} por estudiante en ${ps.months} meses${ps.buyAmt ? ' · sin contar la compra de equipos' : ''}</small></div>` : `<div><span>La compra se paga una sola vez</span><strong>${Q(ps.buyAmt)}</strong><small>No se divide en meses</small></div>`}</div>` : '';
  const evoRows = t.rows.filter(r => r.quote && isEvo(r.entry.plan));
  const own = evoRows.length ? `<div class="own-callout">${icon('check')}<div><b>El equipo se queda en tu institución</b><span>Con Evoluciona, al completar los pagos ${evoRows.map(r => `${r.units} ${esc(findP(r.entry.programId).hardware)}`).join(' y ')} pasan a ser propiedad del colegio.</span></div></div>` : '';
  const onlyBuy = rowsPriced.length && rowsPriced.every(r => r.entry.plan === 'INTEGRA');
  return `<section class="investment"><div class="section-heading" style="margin:0 0 8px"><h2>Inversión de tu propuesta</h2><span class="status ${t.complete ? 'green' : 'amber'}">${t.complete ? 'Calculada' : 'Parcial'}</span></div>
  <p class="inv-lead">Los montos se agrupan por modalidad y en total: <b>no se separan por nivel ni por programa</b>.</p>
  <div class="inv-facts"><div><b>${n}</b><small>estudiantes atendidos</small></div><div><b>${equipment}</b><small>${plural(equipment, 'equipo', 'equipos')} en total</small><em>${equipSummary(t)}</em></div><div><b>${rowsPriced.length}</b><small>${plural(rowsPriced.length, 'programa', 'programas')} con modalidad</small></div></div>
  ${unchosen ? `<div class="warning">${unchosen} ${plural(unchosen, 'programa todavía no tiene', 'programas todavía no tienen')} modalidad. Elígela en la tarjeta de cada programa para incluirlo en el total.${state.selected.length > 1 ? ' <span class="quick">Atajo: la misma modalidad para todos: ' + MODS.map(m => `<button type="button" class="text-btn" onclick="setAllModality('${m.k}')">${m.label}</button>`).join(' · ') + '</span>' : ''}</div>` : ''}
  ${pending.length - unchosen > 0 ? `<div class="warning">${pending.length - unchosen} ${plural(pending.length - unchosen, 'programa está pendiente', 'programas están pendientes')} de configuración o de cotización personalizada y no suma${pending.length - unchosen === 1 ? '' : 'n'} al total.</div>` : ''}
  <label class="suggested-toggle iva-toggle" for="iva-on"><input id="iva-on" type="checkbox" ${ivaOn() ? 'checked' : ''} onchange="setIva(this.checked)"> Agregar IVA</label>
  ${cards ? `<div class="grp-grid">${cards}</div>` : ''}${totalBlock}${rowsPriced.length && !onlyBuy ? paymentsHTML(t) : ''}${rowsPriced.length && onlyBuy ? '<p class="fineprint">La compra se paga una sola vez: no hay formas de pago ni cuotas.</p>' : ''}${own}
  <p class="fineprint" style="margin-top:12px">Los precios se muestran sin IVA, porque las instituciones educativas están exentas; el monto con IVA se indica como referencia. Son estimaciones comerciales y la cotización final se confirma con GuateGeeks.</p></section>`;
}

// Simulador: una sola cuota por estudiante para toda la propuesta, sobre el total de estudiantes únicos
// (no por nivel). Es la sugerida por GuateGeeks o, al quitar la sugerencia, un valor que el colegio puede cambiar.
// Aplica a renta por bimestre (Flex) y a Evoluciona; no a la compra de equipos (Integra).
function simRows(t) { return t.rows.filter(r => r.quote && r.entry.plan !== 'INTEGRA' && participation(r.entry) > 0); }
function simStudents(rows) { return M.uniqueStudents(groups(), [...new Set(rows.flatMap(r => r.entry.groupIds))]); }
function simModel(t) {
  const rows = simRows(t); if (!rows.length) return null;
  const n = simStudents(rows), sug = M.simulateAll(rows.map(r => r.quote), n, null, FISCAL, ivaOn()).suggested;
  const fee = state.useSuggested !== false ? sug : (state.fee != null ? state.fee : sug);
  return { rows, n, sug, fee, sim: M.simulateAll(rows.map(r => r.quote), n, fee, FISCAL, ivaOn()) };
}
function simResults(m, fee) {
  if (!fee) return '<p class="fineprint">Escribe una cuota mensual para ver la proyección.</p>';
  const sim = M.simulateAll(m.rows.map(r => r.quote), m.n, fee, FISCAL, ivaOn()), pay = sim.cost, covers = sim.gain >= 0, payPct = covers ? Math.round(pay / sim.income * 100) : 100;
  return `<p class="sim-say">Si cobras <b>${Q(fee)} al mes</b> a cada estudiante durante <b>${sim.months} meses</b>${m.rows.length > 1 && new Set(m.rows.map(r => r.quote.months)).size > 1 ? ' (el plazo más largo de tus programas)' : ''}:</p>
  <dl class="sim-lines" aria-label="Por estudiante: cobras ${Q(sim.contribution)}, pagas ${Q(sim.costPerStudent)} a GuateGeeks y ${covers ? 'te quedan' : 'faltan'} ${Q(Math.abs(sim.perStudent))}">
    <div><dt>Cobras a cada estudiante</dt><dd>${Q(sim.contribution)}</dd><small>${Q(fee)} × ${sim.months} meses</small></div>
    <div><dt>Pagas a GuateGeeks por cada estudiante</dt><dd>${Q(sim.costPerStudent)}</dd><small>tu inversión dividida entre ${sim.students} estudiantes</small></div>
    <div class="hl ${covers ? '' : 'neg'}"><dt>${covers ? 'Te queda por estudiante' : 'Te falta por estudiante'}</dt><dd>${Q(Math.abs(sim.perStudent))}</dd><small>unos ${Q(Math.abs(sim.perStudentMonth))} al mes</small></div></dl>
  <p class="sim-sub">En todo el colegio (${sim.students} estudiantes) cobras <b>${Q(sim.income)}</b> y de eso:</p>
  <div class="sim-bar" role="img" aria-label="De ${Q(sim.income)} recaudados, ${Q(pay)} se pagan a GuateGeeks${covers ? ' y ' + Q(sim.gain) + ' son ganancia del colegio' : ' y no alcanzan a cubrirlo'}"><span class="pay" style="width:${payPct}%"><b>Paga a GuateGeeks</b>${Q(pay)}</span>${covers ? `<span class="left" style="width:${100 - payPct}%"><b>Te queda</b>${Q(sim.gain)}</span>` : ''}</div>${covers ? '' : '<p class="sim-warn">Con esta cuota el colegio no alcanza a cubrir el pago a GuateGeeks.</p>'}`;
}
function simOut(t) {
  const m = simModel(t);
  if (!m) return '<p class="fineprint">Disponible cuando haya programas en renta o cuotas con precio calculado y estudiantes participantes.</p>';
  const useSug = state.useSuggested !== false, evo = m.rows.filter(r => isEvo(r.entry.plan));
  const ctx = `${m.sim.months} meses · ${m.n} estudiantes · ${m.rows.length} ${plural(m.rows.length, 'programa', 'programas')}`;
  const list = m.rows.map(r => `<li><b>${esc(progTitle(r.entry))}</b> · ${esc(planOf(r.entry.plan).tag)} · ${r.quote.months} meses · ${Q(payView(r.quote).total)} ${ivaTxt()}</li>`).join('');
  const own = evo.length ? `<div class="own-callout">${icon('check')}<div><b>El equipo se queda en tu institución</b><span>Con Evoluciona, al completar los pagos ${evo.map(r => `${r.units} ${esc(findP(r.entry.programId).hardware)}`).join(' y ')} pasan a ser del colegio.</span></div></div>` : '';
  return `<div class="sim-card"><div class="sim-fee">${useSug
    ? `<span>Cuota sugerida por GuateGeeks</span><strong>${Q(m.sug)} <em>al mes por estudiante</em></strong><small>${ctx}. Calculada sobre precios ${ivaTxt()}.</small>`
    : `<label for="fee-all">Tu cuota mensual por estudiante, en quetzales</label><input id="fee-all" class="field" type="text" inputmode="numeric" autocomplete="off" value="${m.fee}" oninput="setProjection(this.value,this)" aria-describedby="err-fee-all"><small>${ctx}. La sugerida por GuateGeeks es ${Q(m.sug)}.</small><p class="field-error" id="err-fee-all" hidden></p>`}</div><div id="sim-res">${simResults(m, m.fee)}</div>${own}<details class="sim-progs"><summary>Programas incluidos en el cálculo</summary><ul>${list}</ul></details><p class="fineprint">Estimación antes de los gastos, cobros e impuestos propios del colegio, incluida la morosidad.</p></div>`;
}
function setProjection(value, input) {
  const v = value.trim();
  if (v !== '' && (!/^\d+$/.test(v) || Number(v) > 10000)) { setError(input, 'Escribe una cuota en quetzales enteros, hasta 10,000.'); return; }
  setError(input, '');
  const m = simModel(M.proposalTotals(state.selected, PROGRAMS, groups(), TARIFFS, FISCAL)); if (!m) return;
  state.fee = v === '' ? null : Number(v); store();
  document.getElementById('sim-res').innerHTML = simResults(m, v === '' ? null : Number(v));
}
function toggleSuggested(on) {
  state.useSuggested = on; store();
  document.getElementById('sim-out').innerHTML = simOut(M.proposalTotals(state.selected, PROGRAMS, groups(), TARIFFS, FISCAL)); // sin re-dibujar para no cerrar el simulador
}

// ---- Descarga de la cotización en PDF ----
function downloadBlob(blob, name) { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500); }

// Texto plano de cómo se paga (el mismo criterio que la tarjeta del programa).
// Todo el contenido del PDF, ya formateado. El diseño vive en propuesta-pdf.js.
function pdfModel(includeSim = false) {
  syncCalc();
  const t = M.proposalTotals(state.selected, PROGRAMS, groups(), TARIFFS, FISCAL), pp = paymentPlan(t), gs = modGroups(t);
  const priced = t.rows.filter(r => r.quote), n = M.uniqueStudents(groups(), [...new Set(priced.flatMap(r => r.entry.groupIds))]), equipment = priced.reduce((s, r) => s + r.units, 0);
  const money = x => ivaOn() ? x.total : x.net, all = { net: t.net, total: t.total, tax: t.tax };
  const ps = perStudent(t);
  const levels = LEVELS.filter(l => state.selected.some(s => entryLevels(s).some(x => x.id === l.id))).map(l => l.name);
  // Programas: solo alcance, equipos y modalidad; los precios van agrupados por modalidad y en total
  const programs = t.rows.map(r => {
    const s = r.entry, p = findP(s.programId), an = analysis(s), note = noteFor(s, p, an), u = r.units, k = participation(s);
    const tiles = [{ v: String(k), l: 'estudiantes participan' }];
    if (p.ratio && u) tiles.push({ v: String(u), l: p.hardware + ' en total' }, { v: String(u * p.ratio), l: 'estudiantes trabajan a la vez' });
    return {
      eyebrow: p.area, title: progTitle(s), sub: p.hardware + (r.quote ? ' · ' + modLabel(s) : ''), groups: entryGroups(s).map(g => g.label.replace(', Sección ', ' · ').replace(' · Sección ', ' · ')),
      photo: s.id, tiles, explain: capacityText(s, p, u, an), note: note.pending && r.status !== 'draft' ? note.text : '',
      price: r.quote ? { planName: modLabel(s), net: null, pay: modPlain(s), own: isEvo(s.plan) ? { title: 'El equipo se queda en tu institución', text: `Al completar los ${r.quote.months} meses, los ${u} ${p.hardware} pasan a ser propiedad del colegio.` } : null, minNote: '', includes: includesFor(s, p, u) } : null,
      pending: r.status === 'draft' ? 'Falta configurar este programa para calcular su inversión.' : r.status === 'quote' ? 'Requiere cotización personalizada.' : r.status === 'plan' ? 'Falta elegir la modalidad de este programa.' : ''
    };
  });
  // Inversión agrupada por modalidad (nunca por nivel ni por programa)
  const options = gs.map(g => ({ label: g.m.k === 'INTEGRA' ? 'Compra de equipos' : g.m.k === 'FLEX' ? 'Renta por bimestres' : 'Pago en cuotas', tag: g.m.tag + ' · ' + termLabel(g), programs: g.m.k === 'INTEGRA' ? g.rows.map(r => `${findP(r.entry.programId).hardware}: ${unitLine(r.entry.programId, r.units)}`).join('; ') : joinY(g.names), total: Q(money(g)) }));
  const onlyBuy = priced.length && priced.every(r => r.entry.plan === 'INTEGRA');
  // Pagos (la compra no tiene formas de pago)
  let pay = null;
  if (onlyBuy) pay = { lead: 'Se paga una sola vez, sin cuotas. Precios ' + ivaTxt() + '.', note: `Precios ${ivaTxt()}, en quetzales enteros.`, tiles: [], table: null };
  else if (pp) {
    const phaseTxt = pp.phases.map(f => `${Q(f.amount)} al mes (${f.from === f.to ? 'mes ' + f.from : 'meses ' + f.from + ' a ' + f.to})`);
    pay = {
      lead: (pp.phases.length ? `Pagarías ${Q(pp.initial)} al iniciar y después ${phaseTxt.join(', luego ')}.` : 'Es un pago único por todo lo seleccionado.') + ` Precios ${ivaTxt()}.`,
      note: `Precios ${ivaTxt()}, en quetzales enteros.`,
      tiles: pp.phases.length ? [{ l: 'Al iniciar', v: Q(pp.initial) }, ...pp.phases.map(f => ({ l: f.from === f.to ? 'Mes ' + f.from : 'Meses ' + f.from + ' a ' + f.to, v: Q(f.amount) + ' al mes' }))].slice(0, 3) : [{ l: 'Pago único', v: Q(pp.grand) }],
      table: pp.len > 1 ? { head: ['Mes', 'Pago'], rows: pp.totals.map((v, m) => [m === 0 ? 'Al iniciar' : 'Mes ' + m, Q(v)]) } : null
    };
  }
  // Proyección por estudiante: una sola, sobre el total de estudiantes únicos; solo si la institución pidió incluirla
  const sm = includeSim ? simModel(t) : null;
  const sim = sm ? (() => {
    const x = sm.sim, useSug = state.useSuggested !== false, evo = sm.rows.filter(r => isEvo(r.entry.plan));
    return {
      lead: `Una sola cuota por estudiante para los programas en renta y en cuotas: ${x.students} estudiantes únicos y ${x.months} meses.`,
      note: 'Estimación antes de los gastos, cobros e impuestos propios del colegio, incluida la morosidad.',
      items: [{
        title: useSug ? `Cuota sugerida por GuateGeeks: ${Q(x.fee)} al mes por estudiante` : `Cuota que definiste: ${Q(x.fee)} al mes por estudiante`,
        own: evo.length ? { title: 'El equipo se queda en tu institución', text: 'Con Evoluciona, al completar los pagos ' + evo.map(r => `${r.units} ${findP(r.entry.programId).hardware}`).join(' y ') + ' pasan a ser del colegio.' } : null,
        head: x.gain >= 0 ? `Si cobras ${Q(x.fee)} al mes a cada estudiante durante ${x.months} meses, cubres lo que pagas a GuateGeeks y te queda ganancia.` : `Con ${Q(x.fee)} al mes por estudiante, no alcanzas a cubrir lo que pagas a GuateGeeks.`,
        rows: [
          ['Por cada estudiante', null],
          [`Cobras (${Q(x.fee)} × ${x.months} meses)`, Q(x.contribution)], ['Pagas a GuateGeeks', Q(x.costPerStudent)], [x.gain >= 0 ? 'Te queda' : 'Te falta', Q(Math.abs(x.perStudent)) + ' (unos ' + Q(Math.abs(x.perStudentMonth)) + ' al mes)', true],
          ['En todo el colegio', null],
          [`Cobras (${x.students} estudiantes × ${x.months} meses)`, Q(x.income)], [`Pagas a GuateGeeks (${ivaTxt()})`, Q(x.cost)], [x.gain >= 0 ? 'Te queda' : 'Te falta para cubrir el pago', Q(Math.abs(x.gain)), true]
        ]
      }]
    };
  })() : null;
  const notes = [
    ivaOn() ? `Precios en quetzales enteros. Los pagos se muestran con IVA (${Math.round(FISCAL.iva * 100)} %) a solicitud de la institución; el precio sin IVA se indica como principal.` : `Precios en quetzales enteros y sin IVA: las instituciones educativas están exentas. El monto con IVA (${Math.round(FISCAL.iva * 100)} %) se indica solo como referencia.`,
    'Los precios se agrupan por modalidad y en total; no se desglosan por nivel ni por programa.',
    'Los precios son estimaciones comerciales. La cotización final y las condiciones las confirma GuateGeeks.',
    'No todas las modalidades incluyen los mismos servicios (equipamiento, capacitación, recursos para el aula, Sócrates Aprende y soporte).',
    'Cuando los horarios de los grupos no están confirmados, la cantidad de equipos es una estimación y no una cobertura garantizada.'
  ];
  if (!onlyBuy) notes.push('Sócrates Aprende: contenido para estudiantes de 4.º a 6.º primaria en la fase actual; en los demás grados, acceso para docentes por ahora. Dato por confirmar con GuateGeeks.');
  const overview = t.rows.map(r => { const s = r.entry, p = findP(s.programId), g = entryGroups(s); return { photo: s.id, title: progTitle(s), sub: g.length + ' ' + plural(g.length, 'grupo', 'grupos'), equip: p.ratio && r.units ? r.units + ' ' + p.hardware : 'Por definir', students: participation(s) + ' ' + plural(participation(s), 'estudiante', 'estudiantes') }; });
  const LEG = { INTEGRA: ['Integra', 'Compras el equipo y queda en propiedad del colegio desde el inicio. Se paga una sola vez.'], FLEX: ['Flex', 'Rentas el equipo por bimestres (de 2 en 2 meses). Se paga una sola vez y el equipo se devuelve al terminar.'], EVO: ['Evoluciona', 'Pagas un inicial del 20 % y cuotas mensuales iguales (8 o 16 meses). Al terminar, el equipo pasa a ser del colegio.'] };
  return {
    title: 'Propuesta para tu colegio', subtitle: 'Programas de tecnología educativa elegidos con el asesor de GuateGeeks. Los precios son estimaciones que GuateGeeks confirma.',
    legend: gs.map(g => LEG[g.m.k]),
    steps: [['Revisa', 'Comparte esta propuesta con tu equipo directivo y define qué programas empiezan primero.'], ['Confirma', 'GuateGeeks valida con tu colegio los grupos, los precios y las condiciones finales.'], ['Empieza', 'Se coordina la entrega de equipos y el acompañamiento a tus docentes.']],
    date: new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' }),
    stats: [{ v: String(n), l: 'estudiantes únicos atendidos' }, { v: String(equipment), l: plural(equipment, 'equipo en total', 'equipos en total') }, { v: String(priced.length), l: plural(priced.length, 'programa seleccionado', 'programas seleccionados') }],
    levelsLine: 'Niveles: ' + joinY(levels) + '. Matrícula registrada en la institución: ' + registered() + ' estudiantes.',
    options, optionsNote: onlyBuy ? '' : '',
    invest: {
      label: 'Total de la propuesta', net: priced.length ? Q(money(all)) : 'Sin precio disponible',
      parts: priced.length ? { main: Q(money(all)), mainLabel: ivaOn() ? 'Total con IVA' : 'Total sin IVA', perStudent: ps.monthly != null ? Q(ps.monthly) + ' al mes' : '', perLabel: ps.monthly != null ? 'Por estudiante, cada mes' : 'Compra: pago único', perTotal: ps.monthly != null ? Q(Math.round(ps.total)) + ' en ' + ps.months + ' meses' + (ps.buyAmt ? ', sin la compra' : '') : '', students: ps.students || n, net: Q(all.net), iva: Q(all.tax), total: Q(all.total), ivaPct: Math.round(FISCAL.iva * 100) + ' %' } : null,
      warning: t.unpricedCount ? `${t.pricedCount ? 'Estos precios no incluyen todos los programas. ' : ''}${t.unpricedCount} ${plural(t.unpricedCount, 'programa está', 'programas están')} pendiente${t.unpricedCount === 1 ? '' : 's'} de modalidad, configuración o cotización personalizada.` : ''
    },
    coverage: (() => { const c = coverage(), bl = coverageBlocks(), lab = { ok: null, pending: 'Sin programa todavía', outside: 'No disponible con los programas elegidos', skipped: 'Sin programa por ahora' }; return { summary: `${c.students} de ${c.total} estudiantes registrados están incluidos en esta cotización.`, missing: c.total - c.students, rows: bl.map(b => ({ grade: b.text, level: findL(b.levelId).name, students: b.students, programs: b.status === 'ok' ? joinY(b.progs) : lab[b.status], ok: b.status === 'ok' })) }; })(),
    pay, overview, programs, sim, notes
  };
}
// Foto del equipo para la cotización: la marcada con pdf: true en config.js (o la primera).
function pdfPhoto(s) { const list = PHOTOS[s.programId] || []; return list.find(x => x.pdf) || list[0]; }
// Logo con transparencia: se lee el PNG, se separa el color de la transparencia y se comprime.
async function deflate(u8) {
  if (!window.CompressionStream) return null;
  const cs = new CompressionStream('deflate'), w = cs.writable.getWriter(); w.write(u8); w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
async function pdfImg(src, width) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const w = width, h = Math.round(width * img.naturalHeight / img.naturalWidth), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h);
  const { rgb, alpha } = window.GGPdf.splitRGBA(cx.getImageData(0, 0, w, h).data, w, h);
  const [cRgb, cAlpha] = [await deflate(rgb), await deflate(alpha)];
  return cRgb ? { w, h, comps: 3, data: cRgb, filter: 'FlateDecode', smask: { data: cAlpha, filter: 'FlateDecode' } } : { w, h, comps: 3, data: rgb, filter: null, smask: { data: alpha, filter: null } };
}
const pdfLogo = () => pdfImg('../assets/brand/guategeeks-logo.png', 360);
const pdfEyes = () => pdfImg('../assets/brand/guategeeks-ojos.png', 420);
// Antes de descargar se pregunta si se quiere incluir la proyección por estudiante (solo aplica a renta y cuotas).
function downloadPdf() {
  const cov = coverage(), pend = state.selected.filter(s => !s.confirmed).length, miss = cov.pending.reduce((n, g) => n + g.students, 0);
  if (miss || pend) {
    const why = [miss ? `${miss} ${plural(miss, 'estudiante no está', 'estudiantes no están')} en ningún programa` : '', pend ? `${pend} ${plural(pend, 'programa falta', 'programas faltan')} por configurar` : ''].filter(Boolean).join(' y ');
    askChoice('Termina de configurar antes de descargar', why + '. Si descargas ahora, la cotización no tomaría en cuenta a todos tus estudiantes.', [{ label: 'Ahora no' }, { label: 'Configurar ahora', primary: true, fn: () => miss ? openAssign() : step(4) }]); return;
  }
  const t = M.proposalTotals(state.selected, PROGRAMS, groups(), TARIFFS, FISCAL);
  if (!simRows(t).length) { makePdf(false); return; }
  askChoice('¿Quieres incluir la proyección por estudiante en el PDF?', 'Muestra cuánto recaudaría el colegio con la cuota por estudiante y cuánto le quedaría, para los programas en renta y en cuotas. Es opcional.', [{ label: 'No, solo la cotización', fn: () => makePdf(false) }, { label: 'Sí, incluir la proyección', primary: true, fn: () => makePdf(true) }]);
}
async function makePdf(includeSim) {
  if (!window.GGPropuestaPdf) { notify('No se pudo preparar el PDF en este navegador.'); return; }
  notify('Preparando tu cotización en PDF…');
  const photos = {};
  await Promise.all(state.selected.map(async s => { // las fotos se incluyen cuando se pueden leer; si no, el PDF sale sin ellas
    try {
      const ph = pdfPhoto(s); if (!ph) return;
      const res = await fetch(ph.src); if (res.ok) photos[s.id] = new Uint8Array(await res.arrayBuffer());
    } catch (e) { /* sin foto */ }
  }));
  try { photos.logo = await pdfLogo(); } catch (e) { /* sin logo: el PDF usa el nombre escrito */ }
  try { photos.ojos = await pdfEyes(); } catch (e) { /* sin los ojos: el PDF usa círculos de marca */ }
  // Representación del campus confirmado (sin vista previa). Si la escena no está lista o no captura, la propuesta sale igual.
  try {
    if (mascot && typeof mascot.capture === 'function' && mascotHost?.classList.contains('campus-ready')) {
      const url = mascot.capture({ width: 1200, height: 760 });
      if (typeof url === 'string' && url.startsWith('data:image/jpeg')) { const bin = atob(url.slice(url.indexOf(',') + 1)); photos.campus = Uint8Array.from(bin, ch => ch.charCodeAt(0)); }
    }
  } catch (e) { /* sin captura */ }
  try {
    const bytes = window.GGPropuestaPdf.build(pdfModel(includeSim), photos);
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'GuateGeeks_Cotizacion.pdf');
    notify('Tu cotización en PDF se descargó.');
  } catch (e) { notify('No se pudo generar el PDF. Intenta de nuevo.'); }
}

function coveragePanel() {
  const cov = coverage(); if (!cov.total) return '';
  const bl = coverageBlocks(), sum = st => bl.filter(b => st.includes(b.status)).reduce((n, b) => n + b.students, 0);
  const okN = sum(['ok']), pendN = sum(['pending']), allOk = okN === cov.total, pct = Math.round(okN / cov.total * 100);
  const n = x => `${x} ${plural(x, 'estudiante', 'estudiantes')}`;
  // Incluidos: una tarjeta por programa con los grados que lo cursan.
  const progs = [];
  bl.filter(b => b.status === 'ok').forEach(b => {
    const key = b.progs.join(','); let g = progs.find(x => x.key === key);
    if (!g) progs.push(g = { key, names: b.progs, parts: [], students: 0 });
    g.parts.push(b.text); g.students += b.students;
  });
  const included = progs.map(g => `<li class="cov-prog"><span class="cov-ico">${icon('check')}</span><div><b>${esc(joinY(g.names))}</b><span>${esc(g.parts.join(' · '))}</span></div><em>${n(g.students)}</em></li>`).join('');
  const rest = st => bl.filter(b => st.includes(b.status)).map(b => `<li class="cov-item ${st[0] === 'pending' ? 'miss' : 'out'}"><span class="cov-g">${esc(b.text)}</span><span class="cov-n">${n(b.students)}</span></li>`).join('');
  const pending = rest(['pending']), outside = rest(['outside', 'skipped']);
  const names = joinY([...new Set(state.selected.map(s => findP(s.programId).name))]);
  const lead = allOk ? `Todos tus estudiantes registrados están en la propuesta.` : `${n(cov.total - okN)} de los ${cov.total} registrados todavía no tienen programa y no suman al precio.`;
  return `<section class="coverage"><div class="section-heading" style="margin:0 0 12px"><h2>Quiénes participan</h2>${allOk ? '' : `<span class="status amber">${pendN ? 'Faltan grados' : 'Cobertura parcial'}</span>`}</div>
  <div class="cov-top"><div class="cov-num"><b>${okN}</b><span>${allOk ? 'estudiantes participan' : 'de ' + cov.total + ' participan'}</span></div><div class="cov-bar"><div class="cov-meter" role="img" aria-label="${okN} de ${cov.total} estudiantes incluidos"><i style="width:${pct}%"></i></div><p>${lead}</p></div></div>
  ${included ? `<ul class="cov-list cov-progs">${included}</ul>` : ''}
  ${pending ? `<div class="cov-group warn"><h3>Pueden sumarse a un programa que ya elegiste</h3><ul class="cov-list">${pending}</ul><p class="cov-help">${n(pendN)} podrían usar ${esc(names)}. <button type="button" class="text-btn" onclick="openAssign()">Configurar ahora</button></p></div>` : ''}
  ${outside ? `<div class="cov-group out"><h3>No disponibles con los programas elegidos</h3><ul class="cov-list">${outside}</ul><p class="cov-help">${esc(names)} no está disponible para estos grados. Puedes continuar y descargar tu cotización con los grados incluidos. Si quieres atenderlos, <button type="button" class="text-btn" onclick="state.skipped=[];step(3)">elige otro programa para ellos</button>.</p></div>` : ''}</section>`;
}
function renderSummary() {
  const list = state.selected;
  if (!list.length) { frame('Tu propuesta educativa', 'Aquí se reunirán los programas y equipos que elijas para tu institución.', `<div class="empty">Todavía no has agregado programas. Tus niveles y estudiantes registrados se conservan.</div><div class="foot"><button class="btn btn-primary" onclick="step(${hasStudents() ? 3 : state.levels.length ? 2 : 1})">${hasStudents() ? 'Elegir programas' : 'Continuar mi propuesta'} ${icon('arrow')}</button></div>`); return; }
  syncCalc();
  const t = M.proposalTotals(list, PROGRAMS, groups(), TARIFFS, FISCAL), nlevels = new Set(list.flatMap(s => entryLevels(s).map(l => l.id))).size;
  const provisional = groups().some(g => list.some(s => s.groupIds.includes(g.id)) && !g.confirmed);
  frame('Tu propuesta educativa', 'Estos son los programas y equipos que seleccionaste para tu institución. Revisa el alcance, compara tus decisiones y ajusta lo que necesites.',
    `<div class="summary-hero"><div class="summary-top"><h2>Resumen de tu propuesta</h2></div><p>Matrícula registrada: ${registered()} estudiantes.</p><div class="summary-num"><div><b>${selectedParticipants()}</b><small>estudiantes únicos<br>sin duplicarlos</small></div><div><b>${nlevels}</b><small>${plural(nlevels, 'nivel educativo', 'niveles educativos')}<br>en la propuesta</small></div><div><b>${list.length}</b><small>${plural(list.length, 'programa seleccionado', 'programas seleccionados')}<br>para tu institución</small></div></div></div>${provisional ? '<div class="warning">Algunos grupos están como total sin secciones. Las cantidades de equipos son provisionales hasta confirmar cómo se agrupan.</div>' : ''}<div class="section-heading"><h2>Programas que elegiste</h2><button class="text-btn" onclick="step(3)">+ Agregar programa</button></div>${list.map((s, i) => proposalCard(s, i, t.rows[i])).join('')}<div class="links"><button class="btn btn-outline" onclick="step(3)">+ Agregar otro programa</button><button class="btn btn-outline" onclick="step(1)">+ Agregar otro nivel</button></div>${coveragePanel()}${investmentHTML(t)}${simRows(t).length ? `<details class="optional-block" id="sim-block"><summary><span class="sim-ico">${icon('chart')}</span><span class="sim-txt"><b>¿Quieres explorar cuánto representaría esta inversión por estudiante?</b><small>Una sola cuota para todo el colegio: cuánto cobrar a cada estudiante y qué ganancia le quedaría.</small></span><span class="sim-cta">Ver mi proyección</span></summary><div class="sim-body"><label class="suggested-toggle" for="use-sug"><input id="use-sug" type="checkbox" ${state.useSuggested !== false ? 'checked' : ''} onchange="toggleSuggested(this.checked)"> Usar la cuota sugerida por GuateGeeks (desmárcala para escribir la tuya)</label><div id="sim-out" style="margin-top:12px">${simOut(t)}</div></div></details>` : ''}<section class="next-panel"><h3>Tu cotización, lista para descargar.</h3><p>Descarga un PDF con el alcance, los programas, los equipos, los precios y la forma de pago de tu propuesta.</p><div class="links"><button class="btn btn-primary" onclick="downloadPdf()">Descargar cotización en PDF ${icon('download')}</button></div></section><div class="foot"><button class="btn btn-outline" onclick="step(1)">+ Agregar otro nivel</button><button class="btn btn-outline" onclick="resetAll()">Empezar de nuevo</button></div>`);
}

function render() {
  if (ui.preview && state.step !== 3) ui.preview = null; // la vista previa no sobrevive al paso 3
  if (state.step === 0) renderLanding();
  else if (state.step === 1) renderLevels();
  else if (state.step === 2) renderEnrollment();
  else if (state.step === 3) renderPrograms();
  else if (state.step === 4) renderConfig();
  else renderSummary();
}
const lbox = document.getElementById('lightbox');
lbox.addEventListener('click', e => { if (e.target === lbox) closePhoto(); });
lbox.addEventListener('close', () => { ui.lb = null; });
lbox.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') shiftPhoto(null, null, -1); if (e.key === 'ArrowRight') shiftPhoto(null, null, 1); });
document.getElementById('notice').querySelector('button').addEventListener('click', () => { ui.notice = ''; updateHeader(); });
if (location.hash === '#ejemplo') { example(); state.step = 5; }
if (state.step > 1 && !state.levels.length) state.step = 1;
render();

// Pato robot 3D: camina por la barra de pasos, mira hacia arriba a lo que haces y espera. Si no hay WebGL queda el pato SVG.
function placeDuck() {
  const lane = document.querySelector('.duck-lane');
  if (!lane || state.step < 1) { duck3Step = 0; return; }
  if (!webglOk()) { placeDuckSvg(); return; }
  if (!duckHost) { duckHost = document.createElement('div'); duckHost.className = 'duck-host'; }
  lane.appendChild(duckHost);
  const x = duckTarget(lane); if (x === null) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, first = duck3Step === 0;
  if (duck3) { duck3.resize(); duckHideSay(); duck3.moveTo(x, { instant: first, silent: true }); duck3.setStage(state.step); if (first) duckSay(); duck3Step = state.step; return; }
  duck3Step = state.step;
  loadLab(() => {
    if (duck3 || !window.GGLab || !duckHost.isConnected) return;
    try { duck3 = window.GGLab.createDuck(duckHost, { reduceMotion: reduce, onArrive: duckSay, onLand: duckStomp }); duck3.setPaused(animPaused); duck3.setStage(state.step, true); const l = document.querySelector('.duck-lane'), t = l && duckTarget(l); if (t !== null) duck3.moveTo(t, { instant: true }); } catch (e) { duck3 = null; }
  });
}
function duckStomp() { const b = document.querySelectorAll('.step-nav')[state.step - 1]; if (!b) return; b.classList.remove('squish'); void b.offsetWidth; b.classList.add('squish'); }
const STAGE_SAY = ['', 'Niveles', 'Estudiantes', 'Programas', 'Personalizar', 'Resumen'];
let duckSayOn = false;
function duckHideSay() {}
function duckSay() {}
document.addEventListener('pointermove', e => { if (duck3) duck3.look(e.clientX, e.clientY); }, { passive: true });
document.addEventListener('pointerdown', e => { if (duck3 && e.target.closest && e.target.closest('#app')) duck3.react('click'); }, { passive: true });
document.addEventListener('input', () => { if (duck3) duck3.react('type'); }, { passive: true });
window.addEventListener('resize', () => { if (!duck3) return; const lane = document.querySelector('.duck-lane'), x = lane && duckTarget(lane); if (x !== null && x !== undefined) duck3.moveTo(x, { instant: true, silent: true }); if (duckSayOn) duckSay(); });

// El avance no se queda fijo ocupando espacio: al bajar solo queda una línea fina arriba (sin texto ni robot).
function placeProgressLine() {
  let el = document.getElementById('progress-line');
  if (!el) { el = document.createElement('div'); el.id = 'progress-line'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<i></i>'; document.body.appendChild(el); }
  if (progIO) { progIO.disconnect(); progIO = null; }
  const nav = document.querySelector('.steps-small');
  if (!nav || state.step < 1) { el.classList.remove('on'); return; }
  el.firstChild.style.width = state.step * 20 + '%';
  progIO = new IntersectionObserver(es => { el.classList.toggle('on', !es[0].isIntersecting); }, { threshold: 0 }); progIO.observe(nav);
}


// Geeky host boundary: only the semantic adapter uses quote replacement.
window.GGCotizadorHost = Object.freeze({
  getState: () => JSON.parse(JSON.stringify(state)),
  getVersion: () => agentHostVersion,
  replaceState(next) {
    const before = state;
    state = JSON.parse(JSON.stringify(next));
    ui.assign = false; ui.assignSel = {}; ui.assignSeen = ''; ui.preview = null;
    ui.sub = 0; ui.single = false; ui.review = !!state.selected?.[state.selectedIndex]?.confirmed;
    const dialog = document.getElementById('confirm'); if (dialog?.open) dialog.close();
    const previousRendering = agentHostRendering;
    agentHostRendering = true;
    try { render(); } catch (e) { state = before; store(); throw e; }
    finally { agentHostRendering = previousRendering; }
  },
  sceneCapabilities() {
    return { available: !!mascot && !campusHidden && !!mascotHost?.classList.contains('campus-ready'),
      visible: !campusHidden, paused: animPaused, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  },
  scene(action, args) {
    const no = error => ({ ok: false, error, message: 'El campus no está disponible para esa acción; la cotización sigue funcionando.' });
    const done = () => ({ ok: true, message: 'Campus actualizado.', scene: this.sceneCapabilities() });
    if (!args || typeof args !== 'object') return no('invalid_arguments');
    if (action === 'show' && typeof args.visible === 'boolean') {
      if (campusHidden === args.visible) toggleCampus(); return done();
    }
    if (action === 'pause' && typeof args.paused === 'boolean') { setAnimPaused(args.paused); return done(); }
    if (!this.sceneCapabilities().available) return no('scene_unavailable');
    if (action === 'rotate' && ['left', 'right'].includes(args.direction)) mascot.rotate(args.direction === 'left' ? -.25 : .25);
    else if (action === 'zoom' && ['in', 'out'].includes(args.direction)) mascot.zoom(args.direction === 'in' ? .12 : -.12);
    else if (action === 'reset') mascot.resetView();
    else if (action === 'view' && ['overview', 'front', 'patio', 'people', 'program'].includes(args.name)) {
      if (args.name === 'program' && !campusFeedback?.focus?.programId) return no('focus_required');
      mascot.setView(args.name);
    } else if (action === 'focus' && ['program', 'level', 'overview'].includes(args.kind)) {
      if (args.kind === 'program' && !PROGRAMS.some(p => p.id === args.id) || args.kind === 'level' && !LEVELS.some(l => l.id === args.id)) return no('unknown_focus');
      inspectCampus(args.kind, args.id);
    } else if (action === 'gesture' && ['greet', 'nod', 'point', 'celebrate'].includes(args.name)) {
      if (animPaused) return no('animation_paused');
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return no('reduced_motion');
      if (!mascot.agentGesture?.(args.name)) return no('gesture_unavailable');
    } else return no('invalid_arguments');
    return done();
  }
});
