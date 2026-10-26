/* ==========================================================================
   صانع العروض 2 — interface controller
   ========================================================================== */
(function (PM) {
'use strict';
const ST = PM.ST, Ed = PM.Ed, K = PM.K;
const UI = PM.UI = {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ic = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icPath(n)}</svg>`;
function icPath(n) { const IC = PM.ICONS || (typeof ICONS !== 'undefined' ? ICONS : {}); return IC[n] ? IC[n][1] : '<circle cx="12" cy="12" r="9"/>'; }
UI.ic = ic;
const esc = PM.esc;
const deck = () => ST.deck;
const cur = () => ST.deck && ST.deck.slides[ST.cur];
const isPhone = () => innerWidth <= 860;
const FAM_AR = { items: 'بنود وبطاقات', kpis: 'أرقام', steps: 'مراحل', timeline: 'خط زمني', bullets: 'نقاط', statement: 'عبارات وفقرات', quote: 'اقتباسات', compare: 'مقارنات', photo: 'صور', table: 'جداول', chart: 'رسوم بيانية', cover: 'أغلفة', closing: 'ختام', divider: 'فواصل', agenda: 'جدول الأعمال', mix: 'محتوى مختلط' };
const FORM_AR = { items: 'بنود', kpis: 'أرقام', steps: 'مراحل', timeline: 'خط زمني', bullets: 'نقاط', para: 'فقرة', quote: 'اقتباس', compare: 'مقارنة', table: 'جدول', chart: 'رسم بياني', photo: 'صورة', title: 'عنوان', cover: 'غلاف', agenda: 'جدول أعمال', divider: 'فاصل', closing: 'ختام', mix: 'مختلط' };
UI.FAM_AR = FAM_AR;

/* ---------- toast / progress / modal ---------- */
let toastT;
UI.toast = function (msg, ms = 2600) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.remove('hide'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hide'), ms);
};
UI.progress = function (title, sub) {
  let p = $('#prog');
  if (title === false) { if (p) p.remove(); return; }
  if (!p) { p = document.createElement('div'); p.id = 'prog'; p.className = 'prog'; p.innerHTML = '<i></i><b></b><span></span>'; document.body.appendChild(p); }
  p.querySelector('b').textContent = title || ''; p.querySelector('span').textContent = sub || '';
};
UI.modal = function (title, body, o = {}) {
  UI.closeModal();
  const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal';
  m.innerHTML = `<div class="mbox ${o.wide ? 'wide' : ''}"><div class="mhead"><h3>${title}</h3>${o.head || ''}<button class="mx" data-close>${ic('x')}</button></div><div class="mbody">${typeof body === 'string' ? body : ''}</div>${o.foot ? `<div class="mfoot">${o.foot}</div>` : ''}</div>`;
  if (typeof body !== 'string') m.querySelector('.mbody').appendChild(body);
  m.addEventListener('pointerdown', e => { if (e.target === m) UI.closeModal(); });
  m.querySelector('[data-close]').onclick = () => UI.closeModal();
  document.body.appendChild(m);
  UI._onClose = o.onClose || null;
  return m;
};
UI.closeModal = function () { const m = $('#modal'); if (m) { m.remove(); if (UI._onClose) { const f = UI._onClose; UI._onClose = null; f(); } } };
UI.modalOpen = () => !!$('#modal');
document.addEventListener('keydown', e => { if (e.key === 'Escape' && UI.modalOpen()) { e.stopPropagation(); UI.closeModal(); } }, true);

/* ---------- boot ---------- */
UI.init = function () {
  PM.injectRenderCSS();
  $$('svg[data-ic]').forEach(s => { s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.innerHTML = icPath(s.dataset.ic); });
  $('#hLogo').innerHTML = PM.logoSVG('FFFFFF');
  $('#sLogo').innerHTML = PM.logoSVG('FFFFFF');
  Ed.mount($('#stageHost'));
  bindTop(); bindStart(); bindStrip(); bindLaybar(); bindTabs();
  PM.on(what => {
    if (what === 'all') { UI.renderAll(); }
    else if (what === 'sel') { UI.renderCtx(); if (UI.tab === 'design') UI.renderPane(); }
    else if (what === 'change') { UI.renderCtx(); scheduleThumb(); UI.renderLaybar(); }
    else if (what === 'saved') { const l = $('#savedLbl'); if (l) l.textContent = 'محفوظ ✓'; }
    else if (what === 'go') { }
  });
  PM.on(w => { if (w === 'save') saveProject(); });
  PM.on(w => { if (w === 'importfile') { } });
  PM.ST.listeners.push(function () { });
  PM.ongo = (d) => go(d);
  PM.ST.listeners.push(w => { if (w === 'editdata') { } });
  showStart();
  // first fonts may arrive late: re-measure once they are in
  document.fonts && document.fonts.ready.then(() => { PM.fontsReady = true; });
};
PM.on2 = function () { };
/* event bridge for editor requests */
PM.on(function (w) { });
const origEmit = PM.emit;
PM.emit = function (what, arg) {
  if (what === 'go') return go(arg);
  if (what === 'editdata') return dataEditor(arg);
  if (what === 'replaceimage') return pickImageFor(arg);
  if (what === 'changeicon') return iconPicker(arg);
  if (what === 'importfile') return importFile(arg);
  if (what === 'chartlive') return;
  return origEmit(what, arg);
};

/* ---------- start screen ---------- */
function segVal(id) { const b = $(`#${id} button.on`); return b ? b.dataset.v : null; }
function segBind(id, fn) { $$(`#${id} button`).forEach(b => b.onclick = () => { $$(`#${id} button`).forEach(x => x.classList.toggle('on', x === b)); if (fn) fn(b.dataset.v); }); }
function bindStart() {
  segBind('stLang'); segBind('stBg'); segBind('stTone');
  const drop = $('#stDrop');
  $('#fIn').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importFile(f); };
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('on'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('on'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('on'); const f = e.dataTransfer.files[0]; if (f) importFile(f); });
  $('#stBlankAr').onclick = () => openDeck(prepBlank('ar'));
  $('#stBlankEn').onclick = () => openDeck(prepBlank('en'));
  $('#stBack').onclick = () => hideStart();
}
function prepBlank(lang) { const d = PM.blankDeck(lang); d.grey = segVal('stBg') === 'grey'; d.dark = segVal('stTone') === 'dark'; return d; }
async function showStart() {
  $('#start').classList.remove('hide');
  $('#stBack').classList.toggle('hide', !ST.deck);
  const list = await PM.listSaved();
  const box = $('#stRecent');
  box.classList.toggle('hide', !list.length);
  $('#stRecentList').innerHTML = list.slice(0, 6).map(r => `<div class="rc" data-id="${r.id}">${ic('presentation')}<b>${esc(r.name)}</b><span class="num">${r.n}</span><span>${new Date(r.at).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'short' })}</span><button class="del" data-del="${r.id}" title="حذف">${ic('trash-2')}</button></div>`).join('');
  $$('#stRecentList .rc').forEach(el => el.onclick = async e => {
    if (e.target.closest('[data-del]')) { e.stopPropagation(); if (confirm('حذف هذا العرض من ملفاتي؟')) { await PM.deleteSaved(e.target.closest('[data-del]').dataset.del); showStart(); } return; }
    UI.progress('جاري فتح العرض…');
    try { const d = await PM.loadSaved(el.dataset.id); UI.progress(false); if (d) openDeck(d, { built: true }); } catch (err) { UI.progress(false); UI.toast('ما قدرت أفتح العرض'); }
  });
}
function hideStart() { $('#start').classList.add('hide'); Ed.fit(); }
async function importFile(f) {
  const lang = $('#start').classList.contains('hide') ? (deck() ? deck().lang : 'auto') : segVal('stLang');
  UI.progress('جاري قراءة الملف…', f.name);
  await new Promise(r => setTimeout(r, 30));
  try {
    const opt = { lang, grey: segVal('stBg') === 'grey', dark: segVal('stTone') === 'dark' };
    const r = await PM.importFile(f, opt);
    if (r.report.kind === 'project') { UI.progress(false); openDeck(r.deck, { built: true }); UI.toast('فتحت المشروع'); return; }
    UI.progress('أحلل المحتوى وأوزّع التصاميم…', `${r.deck.slides.length} شريحة`);
    await new Promise(res => setTimeout(res, 30));
    openDeck(r.deck);
    UI.progress(false);
    const c = r.report.counts, parts = Object.entries(c).filter(([k]) => !['cover', 'closing'].includes(k)).map(([k, v]) => `${v} ${FORM_AR[k] || k}`);
    UI.toast(`قرأت ${r.deck.slides.length} شريحة${parts.length ? ': ' + parts.join('، ') : ''}`, 4200);
    if (r.report.warnings && r.report.warnings.length) setTimeout(() => UI.toast(r.report.warnings[0].msg + (r.report.warnings.length > 1 ? ` (+${r.report.warnings.length - 1})` : ''), 4200), 4400);
  } catch (e) { console.error(e); UI.progress(false); UI.toast(e.message || 'صار خطأ أثناء قراءة الملف', 4200); }
}
UI.importFile = importFile;
function openDeck(d, o = {}) {
  ST.deck = d; ST.cur = 0; ST.sel.clear(); ST.undo = []; ST.redo = [];
  if (!o.built) PM.buildDeck(d);
  else d.slides.forEach((s, i) => { if (!s.objs || !s.objs.length) PM.relayout(d, i); });
  PM.renumber(d);
  PM.checkpoint();
  hideStart();
  UI.renderAll();
  PM.autosave();
}
UI.openDeck = openDeck;

/* ---------- top bar ---------- */
function bindTop() {
  const mf = $('#mFile');
  $('#bFile').onclick = e => { e.stopPropagation(); mf.classList.toggle('hide'); };
  document.addEventListener('pointerdown', e => { $$('.menu').forEach(m => { if (!m.contains(e.target) && !m.parentElement.contains(e.target)) m.classList.add('hide'); }); });
  mf.onclick = e => { const b = e.target.closest('button'); if (!b) return; mf.classList.add('hide'); fileAction(b.dataset.a); };
  $('#bUndo').onclick = () => PM.undo();
  $('#bRedo').onclick = () => PM.redo();
  $('#deckName').oninput = e => { if (deck()) { deck().name = e.target.value; PM.autosave(); } };
  segBind('segBg', v => { deck().grey = v === 'grey'; relayoutAll('bg'); });
  segBind('segTone', v => { deck().dark = v === 'dark'; deck().slides.forEach(s => s.tone = null); relayoutAll('tone'); });
  $('#bExport').onclick = exportPptx;
  $('#bPdf').onclick = () => { if (!deck()) return; Ed.endEdit(); PM.printPdf(deck()); };
  $('#bShow').onclick = () => { if (!deck()) return; Ed.endEdit(); PM.present(deck(), ST.cur); };
  $('#bCheck').onclick = checkDeck;
  $('#bCopilot').onclick = copilot;
}
function relayoutAll(label) {
  const d = deck();
  d.slides.forEach((s, i) => {
    const L = PM.layoutById(s.layout);
    const tone = (s.tone || (d.dark ? 'dark' : 'light'));
    if (L && L.tones.includes(tone)) PM.applyLayout(d, i, L); else PM.autoSlide(d, i);
  });
  PM.renumber(d); PM.commit(label); UI.renderAll();
}
async function fileAction(a) {
  if (a === 'import') { const i = document.createElement('input'); i.type = 'file'; i.accept = '.pptx,.docx,.json'; i.onchange = () => i.files[0] && importFile(i.files[0]); i.click(); }
  if (a === 'new') { showStart(); }
  if (a === 'home') { showStart(); }
  if (a === 'saveProj') saveProject();
  if (a === 'openProj') { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = () => i.files[0] && importFile(i.files[0]); i.click(); }
  if (a === 'recent') showStart();
}
function fileName(ext) { const d = deck(); const n = (d.name || (d.slides[0] && d.slides[0].spec.title) || 'عرض').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60); return n + '.' + ext; }
function saveProject() {
  if (!deck()) return;
  Ed.endEdit();
  PM.download(new Blob([PM.serialize(deck())], { type: 'application/json' }), fileName('json'));
  PM.autosave();
  UI.toast('حفظت ملف المشروع — افتحه من «ملف ← فتح ملف مشروع»');
}
async function exportPptx() {
  if (!deck()) return;
  Ed.endEdit();
  const issues = PM.checkIssues(deck()).filter(i => i.level === 'e');
  UI.progress('أجهّز ملف PowerPoint…');
  try {
    const bytes = await PM.exportPptx(deck(), (i, n) => UI.progress('أجهّز ملف PowerPoint…', `الشريحة ${i + 1} من ${n}`));
    UI.progress(false);
    PM.download(bytes, fileName('pptx'), 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    UI.toast(issues.length ? `صدّرت الملف. في ${issues.length} ملاحظة في «فحص» تستاهل نظرة.` : 'صدّرت ملف PowerPoint ✓', 3600);
  } catch (e) { console.error(e); UI.progress(false); UI.toast('ما قدرت أصدّر: ' + (e.message || e), 5000); }
}

/* ---------- render everything ---------- */
UI.renderAll = function () {
  const d = deck(); if (!d) return;
  $('#deckName').value = d.name || '';
  $$('#segBg button').forEach(b => b.classList.toggle('on', b.dataset.v === (d.grey ? 'grey' : 'white')));
  $$('#segTone button').forEach(b => b.classList.toggle('on', b.dataset.v === (d.dark ? 'dark' : 'light')));
  document.documentElement.dir = 'rtl';
  renderThumbs(); Ed.render(); UI.renderCtx(); UI.renderLaybar(); UI.renderPane();
  $('#bUndo').disabled = ST.undo.length < 2; $('#bRedo').disabled = !ST.redo.length;
};
function go(delta) {
  const d = deck(); if (!d) return;
  Ed.endEdit();
  ST.cur = PM.clamp(ST.cur + delta, 0, d.slides.length - 1);
  ST.sel.clear(); UI.renderAll(); scrollThumb();
}
UI.select = function (i) { Ed.endEdit(); ST.cur = i; ST.sel.clear(); UI.renderAll(); scrollThumb(); };

/* ---------- thumbnails ---------- */
let thumbRaf = null;
function scheduleThumb() { if (thumbRaf) return; thumbRaf = requestAnimationFrame(() => { thumbRaf = null; renderThumb(ST.cur); $('#bUndo').disabled = ST.undo.length < 2; $('#bRedo').disabled = !ST.redo.length; }); }
function thumbW() { return isPhone() ? 112 : 148; }
function renderThumbs() {
  const d = deck(), box = $('#thumbs');
  $('#slCount').textContent = d.slides.length;
  box.innerHTML = d.slides.map((s, i) => `<div class="th ${i === ST.cur ? 'cur' : ''} ${s.hidden ? 'hid' : ''}" data-i="${i}" draggable="true"><span class="n">${i + 1}</span><div class="box" style="width:${thumbW()}px;height:${thumbW() * 9 / 16}px"></div>${(s.overflow || (s.missing && s.missing.length)) ? '<i class="flag" title="تحتاج نظرة"></i>' : ''}<button class="tm" title="خيارات">${ic('ellipsis')}</button></div>`).join('');
  d.slides.forEach((s, i) => renderThumb(i));
}
function renderThumb(i) {
  const d = deck(); const el = $(`#thumbs .th[data-i="${i}"] .box`); if (!el || !d.slides[i]) return;
  PM.renderSlide(el, d.slides[i].objs, d.assets, { scale: thumbW() / 960 });
}
UI.renderThumb = renderThumb;
function scrollThumb() { const el = $(`#thumbs .th[data-i="${ST.cur}"]`); if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
function bindStrip() {
  const box = $('#thumbs');
  box.addEventListener('click', e => {
    const th = e.target.closest('.th'); if (!th) return;
    const i = +th.dataset.i;
    if (e.target.closest('.tm')) { e.stopPropagation(); slideMenu(i, e.target.closest('.tm')); return; }
    UI.select(i);
  });
  let from = null;
  box.addEventListener('dragstart', e => { const th = e.target.closest('.th'); if (!th) return; from = +th.dataset.i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'slide'); });
  box.addEventListener('dragover', e => { if (from == null) return; e.preventDefault(); $$('.th', box).forEach(t => t.classList.remove('drag-over')); const th = e.target.closest('.th'); if (th) th.classList.add('drag-over'); });
  box.addEventListener('drop', e => {
    if (from == null) return; e.preventDefault();
    const th = e.target.closest('.th'); $$('.th', box).forEach(t => t.classList.remove('drag-over'));
    if (!th) { from = null; return; }
    let to = +th.dataset.i; const d = deck();
    const [s] = d.slides.splice(from, 1); d.slides.splice(to, 0, s);
    ST.cur = to; from = null;
    PM.renumber(d); PM.commit('reorder'); UI.renderAll();
  });
  box.addEventListener('dragend', () => { from = null; $$('.th', box).forEach(t => t.classList.remove('drag-over')); });
  // add slide
  const mAdd = $('#mAdd');
  const kinds = [['items', 'بنود وبطاقات', 'layout-grid'], ['kpis', 'أرقام', 'hash'], ['steps', 'مراحل', 'footprints'], ['timeline', 'خط زمني', 'calendar-range'], ['bullets', 'نقاط', 'list'], ['para', 'فقرة أو رسالة', 'text'], ['quote', 'اقتباس', 'quote'], ['compare', 'مقارنة', 'columns-2'], ['chart', 'رسم بياني', 'chart-column'], ['table', 'جدول', 'table'], ['photo', 'صورة', 'image'], ['divider', 'فاصل قسم', 'separator-horizontal'], ['agenda', 'جدول الأعمال', 'list-ordered'], ['blank', 'شريحة بعنوان فقط', 'square']];
  mAdd.innerHTML = kinds.map(([k, t, n]) => `<button data-k="${k}">${ic(n)}${t}</button>`).join('');
  $('#bAdd').onclick = e => { e.stopPropagation(); mAdd.classList.toggle('hide'); };
  mAdd.onclick = e => { const b = e.target.closest('button'); if (!b) return; mAdd.classList.add('hide'); addSlide(b.dataset.k); };
}
function addSlide(kind) {
  const d = deck(); if (!d) return;
  const at = ST.cur + 1;
  PM.addSlide(d, PM.starterSpec(kind, d.lang), at);
  PM.autoSlide(d, at);
  ST.cur = at; ST.sel.clear();
  PM.renumber(d); PM.commit('add'); UI.renderAll(); scrollThumb();
  UI.toast('أضفت الشريحة — اضغط مرتين على أي نص لتعديله');
}
UI.addSlide = addSlide;
function slideMenu(i, anchor) {
  $$('.menu.slm').forEach(m => m.remove());
  const d = deck(), s = d.slides[i];
  const m = document.createElement('div'); m.className = 'menu slm';
  m.innerHTML = `<button data-a="dup">${ic('copy')}تكرار الشريحة</button><button data-a="up">${ic('arrow-up')}تقديم</button><button data-a="down">${ic('arrow-down')}تأخير</button><button data-a="hide">${ic(s.hidden ? 'eye' : 'eye-off')}${s.hidden ? 'إظهار في العرض' : 'إخفاء من العرض'}</button><hr><button data-a="del" style="color:#C2410C">${ic('trash-2')}حذف الشريحة</button>`;
  const r = anchor.getBoundingClientRect();
  m.style.position = 'fixed'; m.style.top = Math.min(innerHeight - 230, r.bottom + 4) + 'px'; m.style.right = Math.max(8, innerWidth - r.right) + 'px'; m.style.left = 'auto'; m.style.insetInlineStart = 'auto';
  document.body.appendChild(m);
  m.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; m.remove();
    const a = b.dataset.a;
    if (a === 'dup') { const c = JSON.parse(JSON.stringify(s)); c.id = 's' + Math.random().toString(36).slice(2, 9); c.objs.forEach(o => o.id = PM.uid()); d.slides.splice(i + 1, 0, c); ST.cur = i + 1; }
    if (a === 'up' && i > 0) { [d.slides[i - 1], d.slides[i]] = [d.slides[i], d.slides[i - 1]]; ST.cur = i - 1; }
    if (a === 'down' && i < d.slides.length - 1) { [d.slides[i + 1], d.slides[i]] = [d.slides[i], d.slides[i + 1]]; ST.cur = i + 1; }
    if (a === 'hide') s.hidden = !s.hidden;
    if (a === 'del') { if (d.slides.length <= 1) return UI.toast('العرض يحتاج شريحة وحدة على الأقل'); d.slides.splice(i, 1); ST.cur = Math.min(ST.cur, d.slides.length - 1); }
    PM.renumber(d); PM.commit('slide-' + a); UI.renderAll();
  };
  setTimeout(() => document.addEventListener('pointerdown', function h(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', h); } }), 0);
}

/* ---------- layout bar ---------- */
function candList() {
  const d = deck(), s = cur(); if (!s) return [];
  const tone = s.tone || (d.dark ? 'dark' : 'light');
  const c = PM.slideCtx(d, ST.cur, { dark: tone === 'dark' });
  c.dark = tone === 'dark'; c.tone = PM.tone(c.dark, d.grey);
  return PM.candidates(s.spec, c).map(x => x.L);
}
UI.candList = candList;
UI.renderLaybar = function () {
  const s = cur(); if (!s) return;
  const L = PM.layoutById(s.layout);
  const list = candList();
  const i = list.findIndex(x => x.id === s.layout);
  $('#lbName').textContent = L ? L.name : '—';
  $('#lbInfo').innerHTML = `<span class="num">${i >= 0 ? i + 1 : '·'}</span> من <span class="num">${list.length}</span> تصميم يناسب هذا المحتوى${s.edited ? ' · معدّلة يدوياً' : ''}`;
  const tone = s.tone || (deck().dark ? 'dark' : 'light');
  $('#toneLbl').textContent = tone === 'dark' ? 'فاتح' : 'داكن';
};
function bindLaybar() {
  $('#lbNext').onclick = () => cycle(1);
  $('#lbPrev').onclick = () => cycle(-1);
  $('#bLib').onclick = openLibrary;
  $('#bTone').onclick = () => {
    const d = deck(), s = cur(); if (!s) return;
    const now = s.tone || (d.dark ? 'dark' : 'light');
    s.tone = now === 'dark' ? 'light' : 'dark';
    const L = PM.layoutById(s.layout);
    if (L && L.tones.includes(s.tone)) PM.applyLayout(d, ST.cur, L); else PM.autoSlide(d, ST.cur);
    PM.commit('tone'); UI.renderAll();
  };
  $('#bAuto').onclick = () => { const d = deck(); PM.autoSlide(d, ST.cur); PM.renumber(d); PM.commit('auto'); UI.renderAll(); UI.toast('أعدت توزيع الشريحة'); };
  $('#bPanel').onclick = () => $('#side').classList.toggle('open');
}
function cycle(dir) {
  const d = deck(), s = cur(); if (!s) return;
  Ed.endEdit();
  const list = candList(); if (!list.length) return;
  let i = list.findIndex(x => x.id === s.layout);
  for (let k = 0; k < list.length; k++) {
    i = (i + dir + list.length) % list.length;
    const r = PM.applyLayout(d, ST.cur, list[i]);
    if (!r.missing || !r.missing.length) break;
  }
  ST.sel.clear(); PM.renumber(d); PM.commit('layout'); UI.renderAll();
}
UI.applyLayoutId = function (id) {
  const d = deck(), L = PM.layoutById(id); if (!L) return;
  Ed.endEdit();
  const s = cur();
  if (L.tones.length === 1) s.tone = L.tones[0];
  PM.applyLayout(d, ST.cur, L);
  ST.sel.clear(); PM.renumber(d); PM.commit('layout'); UI.renderAll();
};

/* ---------- previews of layouts with this slide's content ---------- */
UI.preview = function (host, L, tone, w) {
  const d = deck(), s = cur();
  const spec = JSON.parse(JSON.stringify(s.spec));
  const c = PM.slideCtx(d, ST.cur);
  c.dark = tone === 'dark'; c.tone = PM.tone(c.dark, d.grey);
  const fake = { id: s.id, spec };
  c.photoFor = (sp, i) => PM.autoPhoto(d, fake, i);
  const r = PM.renderLayout(L, spec, c);
  PM.renderSlide(host, r.objs, d.assets, { scale: w / 960 });
  return r;
};

/* ---------- side panel ---------- */
function bindTabs() {
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; UI.tab = b.dataset.t; $$('#tabs button').forEach(x => x.classList.toggle('on', x === b)); UI.renderPane(); };
  UI.tab = 'design';
}
UI.renderPane = function () {
  const p = $('#pane'); if (!p || !deck()) return;
  if (UI.tab === 'design') paneDesign(p);
  else if (UI.tab === 'insert') paneInsert(p);
  else if (UI.tab === 'photos') panePhotos(p);
  else if (UI.tab === 'gen') { if (PM.IG) PM.IG.mount(p); }
  else if (UI.tab === 'notes') paneNotes(p);
};
function paneDesign(p) {
  const s = cur(); if (!s) return;
  const sp = PM.shape(s.spec);
  const kind = s.spec.kind;
  const form = kind === 'content' ? (sp.others.length ? 'mix' : sp.form) : kind;
  const conv = kind === 'content' && sp.main && !sp.others.length ? ['items', 'kpis', 'steps', 'timeline', 'bullets', 'para', 'chart'].filter(f => f !== sp.form) : [];
  const tone = s.tone || (deck().dark ? 'dark' : 'light');
  p.innerHTML = `<h4>${ic('scan-search')}نوع المحتوى: ${FORM_AR[form] || form}</h4>
    ${conv.length ? `<p class="hint">حوّل نفس الكلام لشكل ثاني — بدون ما يتغيّر ولا حرف:</p><div class="chips">${conv.map(f => `<button class="chip" data-conv="${f}">${FORM_AR[f]}</button>`).join('')}</div>` : ''}
    <h4 style="margin-top:18px">${ic('sparkles')}تصاميم مقترحة لهذه الشريحة</h4>
    <div class="sugg" id="sugg"></div>
    <button class="bigbtn" id="pLib">${ic('layout-grid')}افتح مكتبة التصاميم كاملة</button>
    <div class="note" style="margin-top:14px">اضغط مرتين على أي نص لتعديله · اسحب أي عنصر لتحريكه · Shift للتحديد المتعدد · اسحب الصور من جهازك مباشرة على الشريحة</div>`;
  const list = candList().slice(0, 12);
  const g = $('#sugg', p);
  const w = (p.clientWidth - 28 - 10) / 2 || 150;
  list.forEach(L => {
    const el = document.createElement('div'); el.className = 'lt' + (L.id === s.layout ? ' on' : ''); el.style.height = (w * 9 / 16) + 'px';
    el.innerHTML = `<div class="h"></div><div class="cap">${esc(L.name)}</div>`;
    g.appendChild(el);
    requestAnimationFrame(() => { const r = UI.preview(el.querySelector('.h'), L, tone, w); if (r.missing && r.missing.length) el.classList.add('hide'); });
    el.onclick = () => UI.applyLayoutId(L.id);
  });
  $('#pLib', p).onclick = openLibrary;
  $$('[data-conv]', p).forEach(b => b.onclick = () => {
    const d = deck(), s2 = cur();
    const before = JSON.stringify(s2.spec);
    if (!PM.reshape(s2.spec, b.dataset.conv)) { UI.toast('هذا المحتوى ما يناسب هذا الشكل'); return; }
    s2.layout = null; PM.autoSlide(d, ST.cur);
    if (JSON.stringify(s2.spec) !== before) { PM.commit('reshape'); UI.renderAll(); UI.toast('حوّلت المحتوى — تقدر تتراجع بـ Ctrl+Z'); }
  });
}
function paneInsert(p) {
  p.innerHTML = `<h4>${ic('type')}نص</h4><div class="row3">
      <button class="tile" data-ins="title">${ic('heading')}عنوان</button><button class="tile" data-ins="text">${ic('text')}نص</button><button class="tile" data-ins="list">${ic('list')}نقاط</button></div>
    <h4>${ic('shapes')}أشكال</h4><div class="row3">
      <button class="tile" data-ins="rect">${ic('square')}مربع مستدير</button><button class="tile" data-ins="circle">${ic('circle')}دائرة</button><button class="tile" data-ins="line">${ic('minus')}خط</button></div>
    <h4>${ic('chart-column')}بيانات</h4><div class="row3">
      <button class="tile" data-ins="col">${ic('chart-column')}أعمدة</button><button class="tile" data-ins="line2">${ic('chart-line')}خط</button><button class="tile" data-ins="donut">${ic('chart-pie')}دائري</button></div>
    <div class="row2" style="margin-top:8px"><button class="tile" data-ins="table">${ic('table')}جدول</button><button class="tile" data-ins="num">${ic('hash')}رقم كبير</button></div>
    <h4>${ic('shapes')}أيقونات <span style="font-weight:400;color:var(--muted);font-size:12px">— اسحبها على الشريحة أو اضغط</span></h4>
    <input class="inp" id="icq" placeholder="ابحث: سفر، أمان، طائرة، فريق…">
    <div class="icgrid" id="icg"></div>`;
  $$('[data-ins]', p).forEach(b => b.onclick = () => insert(b.dataset.ins));
  const draw = () => {
    const q = $('#icq', p).value.trim();
    let names = [];
    try { names = q ? (typeof searchIcons === 'function' ? searchIcons(q, PM.ICONS || ICONS, 60) : suggestIcons(q, PM.ICONS || ICONS, 60)) : suggestIcons((cur() && cur().spec.title) || 'airport travel', PM.ICONS || ICONS, 36); } catch (e) { names = []; }
    if (!names.length) names = ['plane', 'plane-takeoff', 'luggage', 'users', 'shield-check', 'clock', 'target', 'globe', 'building-2', 'heart-handshake', 'sparkles', 'chart-line', 'map-pin', 'award', 'leaf', 'badge-check', 'route', 'ticket', 'headset', 'lightbulb', 'rocket', 'handshake', 'trophy', 'calendar'];
    names = names.map(n => typeof n === 'string' ? n : n.name || n[0]).filter(Boolean).slice(0, 60);
    $('#icg', p).innerHTML = names.map(n => `<button draggable="true" data-icn="${esc(n)}" title="${esc(n)}">${ic(n)}</button>`).join('');
    $$('#icg button', p).forEach(b => {
      b.ondragstart = e => e.dataTransfer.setData('application/x-pm-icon', 'lib:' + b.dataset.icn);
      b.onclick = () => { const sel = Ed.selected(); Ed.placeIcon('lib:' + b.dataset.icn, { x: 480, y: 270 }, sel.length === 1 && sel[0].t === 'icon' ? sel[0] : null); };
    });
  };
  let t; $('#icq', p).oninput = () => { clearTimeout(t); t = setTimeout(draw, 160); };
  draw();
}
function insert(kind) {
  const d = deck(), s = cur(); if (!s) return;
  const dark = (s.tone || (d.dark ? 'dark' : 'light')) === 'dark';
  const tn = PM.tone(dark, d.grey);
  const c = PM.ctx({ lang: d.lang, dark });
  let o;
  const rtl = d.lang !== 'en';
  const T = (ps, x, y, w, h) => { const t = PM.T(x, y, w, h, ps, { fit: false }); if (rtl) t.dir = 'rtl'; return t; };
  if (kind === 'title') o = T([PM.tx.title(c, d.lang === 'en' ? 'New heading' : 'عنوان جديد')], 260, 200, 440, 50);
  if (kind === 'text') o = T([PM.tx.body(c, d.lang === 'en' ? 'Type your text here' : 'اكتب النص هنا', { size: 16 })], 280, 230, 400, 60);
  if (kind === 'list') o = T([1, 2, 3].map(i => PM.tx.body(c, (d.lang === 'en' ? 'Point ' : 'نقطة ') + i, { size: 16, bullet: 'dot', sa: 8 })), 300, 200, 360, 110);
  if (kind === 'rect') o = PM.R(380, 200, 200, 140, tn.cardFill, { r: 14 });
  if (kind === 'circle') o = PM.E(420, 210, 120, 120, dark ? K.SKY : K.BLUE);
  if (kind === 'line') o = PM.Ln(330, 270, 300, 0, tn.rule, { sw: 1.5 });
  if (kind === 'num') o = T([PM.tx.num(c, '98%', { size: 64 }), PM.tx.label(c, d.lang === 'en' ? 'Label' : 'وصف الرقم', { size: 16 })], 330, 180, 300, 130);
  if (kind === 'col' || kind === 'line2' || kind === 'donut') {
    const ch = kind === 'donut' ? { kind: 'donut', cats: d.lang === 'en' ? ['A', 'B', 'C'] : ['الأول', 'الثاني', 'الثالث'], series: [{ name: '', vals: [50, 30, 20] }], unit: '%' } : { kind: kind === 'col' ? 'col' : 'line', cats: ['2022', '2023', '2024', '2025'], series: [{ name: '', vals: [31.6, 44.8, 49, 53.3] }], unit: 'M' };
    o = PM.Chart(230, 150, 500, 280, ch, { dark, rtl, fs: 12, bind: null });
    o.bind = null;
  }
  if (kind === 'table') o = PM.Table(200, 170, 560, 200, d.lang === 'en' ? [['Item', '2024', '2025'], ['First', '10', '12'], ['Second', '20', '24']] : [['البند', '2024', '2025'], ['الأول', '10', '12'], ['الثاني', '20', '24']], { dark, rtl, fs: 13, bind: null });
  if (!o) return;
  if (o.t === 'table') o.bind = null;
  s.objs.push(o); s.edited = true;
  ST.sel.clear(); ST.sel.add(o.id);
  PM.commit('insert'); Ed.render(); PM.emit('change'); PM.emit('sel');
  if (o.t === 'text') setTimeout(() => Ed.startEdit(o, true), 30);
  if (isPhone()) $('#side').classList.remove('open');
}
async function panePhotos(p) {
  const d = deck();
  p.innerHTML = `<label class="dropz" id="phUp"><input type="file" accept="image/*" multiple hidden>${ic('upload')}<div>أضف صورك (تنحفظ في مكتبتك على هذا الجهاز)</div></label>
    <h4>${ic('folder-heart')}مكتبتي</h4><div class="phgrid" id="phLib"></div>
    <h4>${ic('file-image')}صور من الملف</h4><div class="phgrid" id="phFile"></div>
    <h4>${ic('plane')}صور مطارات جدة</h4><div class="phgrid" id="phStock"></div>
    <p class="hint" style="margin-top:12px">اسحب أي صورة على الشريحة. لو سحبتها فوق صورة موجودة تستبدلها.</p>`;
  const up = $('#phUp', p);
  $('input', up).onchange = async e => {
    for (const f of e.target.files) {
      const id = await PM.assetFromFile(f);
      const a = d.assets[id]; a.lib = true;
      await PM.photoLib.add({ id, b64: PM.bytesToB64(PM.assetBytes(a)), ext: a.ext, size: a.size, name: f.name, at: Date.now() });
    }
    panePhotos(p); UI.toast('أضفت الصور لمكتبتك');
  };
  up.addEventListener('dragover', e => { e.preventDefault(); up.classList.add('on'); });
  up.addEventListener('dragleave', () => up.classList.remove('on'));
  up.addEventListener('drop', async e => { e.preventDefault(); up.classList.remove('on'); const dt = new DataTransfer(); [...e.dataTransfer.files].forEach(f => dt.items.add(f)); $('input', up).files = dt.files; $('input', up).onchange({ target: $('input', up) }); });
  const lib = await PM.photoLib.all();
  lib.forEach(r => { if (!d.assets[r.id]) d.assets[r.id] = { kind: 'image', ext: r.ext, b64: r.b64, size: r.size, lib: true }; });
  const tile = (id, del) => `<div class="ph" draggable="true" data-asset="${id}" style="background-image:url('${PM.imgURL(d.assets, id)}')">${del ? `<button class="x" data-del="${id}">×</button>` : ''}</div>`;
  $('#phLib', p).innerHTML = lib.length ? lib.map(r => tile(r.id, true)).join('') : '<p class="hint" style="grid-column:1/-1">ما فيه صور بعد.</p>';
  const fromFile = Object.keys(d.assets).filter(k => d.assets[k].fromFile);
  $('#phFile', p).innerHTML = fromFile.length ? fromFile.map(k => tile(k)).join('') : '<p class="hint" style="grid-column:1/-1">الملف ما فيه صور.</p>';
  $('#phStock', p).innerHTML = Object.keys(d.assets).filter(k => d.assets[k].stock).map(k => tile(k)).join('');
  $$('.ph', p).forEach(el => {
    el.ondragstart = e => e.dataTransfer.setData('application/x-pm-asset', el.dataset.asset);
    el.onclick = e => {
      if (e.target.closest('[data-del]')) { e.stopPropagation(); PM.photoLib.del(e.target.dataset.del).then(() => panePhotos(p)); return; }
      const sel = Ed.selected();
      Ed.placeImage(el.dataset.asset, { x: 480, y: 270 }, sel.length === 1 && sel[0].t === 'image' ? sel[0] : null);
      if (isPhone()) $('#side').classList.remove('open');
    };
  });
}
UI.panePhotos = () => { if (UI.tab === 'photos') UI.renderPane(); };
function paneNotes(p) {
  const s = cur();
  p.innerHTML = `<h4>${ic('notebook-pen')}ملاحظات المتحدث لهذه الشريحة</h4><textarea class="inp" id="notes" style="min-height:220px" placeholder="تنتقل مع الملف لخانة الملاحظات في PowerPoint">${esc(s.spec.notes || '')}</textarea>`;
  $('#notes', p).oninput = e => { s.spec.notes = e.target.value; clearTimeout(UI.nT); UI.nT = setTimeout(() => PM.commit('notes'), 600); };
}

/* ---------- context toolbar ---------- */
const SW_TEXT = [K.NAVY, K.BLUE, K.SKY, K.BODY, K.MUTED, K.WHITE];
const SW_FILL = [K.NAVY, K.BLUE, K.SKY, K.PALE, 'F3F5F8', K.WHITE];
UI.renderCtx = function () {
  const bar = $('#ctx'); if (!bar || !deck()) return;
  const sel = Ed.selected();
  let h = '';
  const sw = (list, cur2, act) => list.map(c => `<span class="sw ${cur2 === c ? 'on' : ''}" style="background:#${c}" data-${act}="${c}"></span>`).join('');
  if (!sel.length) {
    h = `<span class="lbl">اختر عنصراً لتعديله، أو:</span><button class="cb" data-a="addText">${ic('type')}نص</button><button class="cb" data-a="addImg">${ic('image-plus')}صورة</button><button class="cb" data-a="tabIcons">${ic('shapes')}أيقونة</button><button class="cb" data-a="tabGen">${ic('wand-sparkles')}توليد صورة</button><span class="cbs"></span><button class="cb" data-a="selAll">${ic('mouse-pointer-2')}تحديد الكل</button>`;
  } else if (sel.length > 1) {
    h = `<span class="lbl"><span class="num">${sel.length}</span> عناصر</span>
      <button class="cb" data-al="r" title="محاذاة لليمين">${ic('align-horizontal-justify-end')}</button><button class="cb" data-al="c" title="توسيط أفقي">${ic('align-horizontal-justify-center')}</button><button class="cb" data-al="l" title="محاذاة لليسار">${ic('align-horizontal-justify-start')}</button>
      <button class="cb" data-al="t" title="محاذاة للأعلى">${ic('align-vertical-justify-start')}</button><button class="cb" data-al="m" title="توسيط عمودي">${ic('align-vertical-justify-center')}</button><button class="cb" data-al="b" title="محاذاة للأسفل">${ic('align-vertical-justify-end')}</button>
      <span class="cbs"></span><button class="cb" data-al="dh" title="توزيع أفقي متساوٍ">${ic('align-horizontal-space-around')}</button><button class="cb" data-al="dv" title="توزيع عمودي متساوٍ">${ic('align-vertical-space-around')}</button>
      ${sel.every(o => o.t === 'text') ? `<span class="cbs"></span><button class="cb" data-a="fs-" title="تصغير الخط">A−</button><button class="cb" data-a="fs+" title="تكبير الخط">A+</button>${sw(SW_TEXT, null, 'tc')}` : ''}
      <span class="cbs"></span><button class="cb" data-a="dup">${ic('copy')}تكرار</button><button class="cb danger" data-a="del">${ic('trash-2')}حذف</button>`;
  } else {
    const o = sel[0];
    const common = `<span class="cbs"></span><button class="cb" data-a="front" title="للأمام">${ic('bring-to-front')}</button><button class="cb" data-a="back" title="للخلف">${ic('send-to-back')}</button><button class="cb" data-a="dup" title="تكرار (Ctrl+D)">${ic('copy')}</button><button class="cb danger" data-a="del" title="حذف">${ic('trash-2')}</button>`;
    if (o.t === 'text') {
      const p0 = o.paras[0] || {};
      const al = p0.al || (o.align === 'center' ? 'c' : '');
      h = `<span class="lbl">نص</span><button class="cb" data-a="edit">${ic('pencil')}تعديل</button><button class="cb" data-a="fs-" title="تصغير">A−</button><span class="cb v num">${Math.round(p0.size || 0)}</span><button class="cb" data-a="fs+" title="تكبير">A+</button>
        <button class="cb ${p0.bold ? 'on' : ''}" data-a="bold" title="عريض">${ic('bold')}</button>${sw(SW_TEXT, p0.color, 'tc')}<span class="cbs"></span>
        <button class="cb ${al === 'r' ? 'on' : ''}" data-ta="r" title="يمين">${ic('align-right')}</button><button class="cb ${al === 'c' ? 'on' : ''}" data-ta="c" title="وسط">${ic('align-center')}</button><button class="cb ${al === 'l' ? 'on' : ''}" data-ta="l" title="يسار">${ic('align-left')}</button>
        <button class="cb ${o.paras.some(p => p.bullet) ? 'on' : ''}" data-a="bul" title="نقاط">${ic('list')}</button>${common}`;
    } else if (o.t === 'image') {
      h = `<span class="lbl">صورة</span><button class="cb" data-a="replace">${ic('image-up')}استبدال</button><button class="cb ${Ed.tool === 'focus' ? 'on' : ''}" data-a="focus">${ic('move')}تحريك داخل الإطار</button>
        <button class="cb" data-a="z-">${ic('zoom-out')}</button><span class="cb v num">${Math.round((o.zoom || 1) * 100)}%</span><button class="cb" data-a="z+">${ic('zoom-in')}</button>
        <button class="cb ${o.r ? 'on' : ''}" data-a="round">${ic('square-round-corner')}زوايا</button><button class="cb" data-a="gen">${ic('wand-sparkles')}صورة بالذكاء الاصطناعي</button>${common}`;
    } else if (o.t === 'icon') {
      h = `<span class="lbl">أيقونة</span><button class="cb" data-a="icon">${ic('replace')}تغيير</button>${sw([K.NAVY, K.BLUE, K.SKY, K.WHITE, K.MUTED], o.color, 'ic')}${common}`;
    } else if (o.t === 'chart') {
      const kinds = [['col', 'chart-column', 'أعمدة'], ['bar', 'chart-bar', 'أشرطة'], ['line', 'chart-line', 'خط'], ['area', 'chart-area', 'مساحة'], ['donut', 'chart-pie', 'دائري'], ['stack', 'chart-column-stacked', 'مكدّس']];
      h = `<span class="lbl">رسم بياني</span>${o.ring ? '' : kinds.map(([k, n, t]) => `<button class="cb ${o.kind === k ? 'on' : ''}" data-ck="${k}" title="${t}">${ic(n)}</button>`).join('')}<span class="cbs"></span>
        <button class="cb" data-a="data">${ic('table-2')}تعديل الأرقام</button><button class="cb ${o.vals !== false ? 'on' : ''}" data-a="vals">${ic('hash')}الأرقام</button>
        <span class="lbl" style="margin-inline-start:8px">اسحب النقاط الزرقاء لتغيير القيم مباشرة</span>${common}`;
    } else if (o.t === 'table') {
      h = `<span class="lbl">جدول</span><button class="cb" data-a="data">${ic('table-2')}تعديل الجدول</button><button class="cb ${o.style === 'rule' ? 'on' : ''}" data-tst="rule">خطوط</button><button class="cb ${o.style === 'fill' ? 'on' : ''}" data-tst="fill">رأس ملوّن</button><button class="cb ${o.style === 'zebra' ? 'on' : ''}" data-tst="zebra">متناوب</button><button class="cb" data-a="fs-">A−</button><button class="cb" data-a="fs+">A+</button>${common}`;
    } else if (o.t === 'rect' || o.t === 'ellipse') {
      h = `<span class="lbl">شكل</span>${sw(SW_FILL, o.fill, 'fc')}${o.t === 'rect' ? `<button class="cb ${o.r ? 'on' : ''}" data-a="round">${ic('square-round-corner')}زوايا</button>` : ''}<button class="cb ${o.stroke ? 'on' : ''}" data-a="stroke">${ic('square-dashed')}إطار</button>${common}`;
    } else if (o.t === 'line') {
      h = `<span class="lbl">خط</span>${sw([K.NAVY, K.BLUE, K.SKY, K.RULE, K.WHITE], o.color, 'lc')}<button class="cb ${o.dash ? 'on' : ''}" data-a="dash">${ic('ellipsis')}متقطع</button>${common}`;
    } else h = `<span class="lbl">${esc(o.name || '')}</span>${common}`;
  }
  bar.innerHTML = h;
  bar.onclick = ctxClick;
};
function ctxClick(e) {
  const b = e.target.closest('[data-a],[data-al],[data-tc],[data-fc],[data-ic],[data-lc],[data-ta],[data-ck],[data-tst]'); if (!b) return;
  const s = cur(), sel = Ed.selected();
  const done = (label, rel) => { s.edited = true; PM.commit(label); Ed.render(); UI.renderCtx(); scheduleThumb(); };
  const ds = b.dataset;
  if (ds.al) return Ed.align(ds.al);
  if (ds.tc) { sel.filter(o => o.t === 'text').forEach(o => o.paras.forEach(p => p.color = ds.tc)); return done('color'); }
  if (ds.fc) { sel.forEach(o => { o.fill = ds.fc; o.grad = null; }); return done('fill'); }
  if (ds.ic) { sel.forEach(o => o.color = ds.ic); return done('iconcolor'); }
  if (ds.lc) { sel.forEach(o => o.color = ds.lc); return done('linecolor'); }
  if (ds.ta) { sel.forEach(o => { o.align = ds.ta === 'c' ? 'center' : 'start'; o.paras.forEach(p => p.al = ds.ta); }); return done('align'); }
  if (ds.ck) { const o = sel[0]; o.kind = ds.ck; if (o.bind) Ed.syncChart(o); if (o.bind) { const sp = PM.getPath(s.spec, o.bind); if (sp) sp.kind = ds.ck; } return done('charttype'); }
  if (ds.tst) { sel[0].style = ds.tst; return done('tablestyle'); }
  const a = ds.a;
  if (a === 'del') return Ed.del();
  if (a === 'dup') return Ed.pasteObjs(JSON.parse(JSON.stringify(sel)));
  if (a === 'front') return Ed.zorder('front');
  if (a === 'back') return Ed.zorder('back');
  if (a === 'edit') return Ed.startEdit(sel[0], true);
  if (a === 'fs+' || a === 'fs-') {
    const k = a === 'fs+' ? 1.08 : 1 / 1.08;
    sel.forEach(o => { if (o.t === 'text') { o.paras.forEach(p => { p.size = Math.max(6, Math.round(p.size * k * 4) / 4); p.sa = (p.sa || 0) * k; p.sb = (p.sb || 0) * k; }); o.h = Math.max(o.h, PM.blockH(o.paras, o.w) + 1); } if (o.t === 'table') o.fs = Math.max(7, (o.fs || 11) * k); });
    return done('size');
  }
  if (a === 'bold') { const v = !sel[0].paras[0].bold; sel[0].paras.forEach(p => p.bold = v); return done('bold'); }
  if (a === 'bul') { const o = sel[0]; const on = o.paras.some(p => p.bullet); o.paras.forEach(p => { p.bullet = on ? null : 'dot'; p.bc = p.bc || K.BLUE; }); return done('bullets'); }
  if (a === 'replace') return pickImageFor(sel[0]);
  if (a === 'focus') { Ed.tool = Ed.tool === 'focus' ? null : 'focus'; UI.renderCtx(); if (Ed.tool) UI.toast('اسحب داخل الصورة لتحريكها في إطارها'); return; }
  if (a === 'z+' || a === 'z-') { const o = sel[0]; o.zoom = PM.clamp((o.zoom || 1) + (a === 'z+' ? 0.15 : -0.15), 1, 4); return done('zoom'); }
  if (a === 'round') { sel.forEach(o => o.r = o.r ? 0 : 14); return done('round'); }
  if (a === 'gen') { UI.tab = 'gen'; $$('#tabs button').forEach(x => x.classList.toggle('on', x.dataset.t === 'gen')); UI.renderPane(); if (isPhone()) $('#side').classList.add('open'); return; }
  if (a === 'icon') return iconPicker(sel[0]);
  if (a === 'stroke') { sel.forEach(o => { o.stroke = o.stroke ? null : K.RULE; o.sw = 1; }); return done('stroke'); }
  if (a === 'dash') { sel.forEach(o => o.dash = !o.dash); return done('dash'); }
  if (a === 'data') return dataEditor(sel[0]);
  if (a === 'vals') { sel[0].vals = sel[0].vals === false; return done('vals'); }
  if (a === 'addText') return insert('text');
  if (a === 'addImg') return pickImageFor(null);
  if (a === 'tabIcons') { UI.tab = 'insert'; $$('#tabs button').forEach(x => x.classList.toggle('on', x.dataset.t === 'insert')); UI.renderPane(); if (isPhone()) $('#side').classList.add('open'); setTimeout(() => { const q = $('#icq'); if (q) q.focus(); }, 50); return; }
  if (a === 'tabGen') { UI.tab = 'gen'; $$('#tabs button').forEach(x => x.classList.toggle('on', x.dataset.t === 'gen')); UI.renderPane(); if (isPhone()) $('#side').classList.add('open'); return; }
  if (a === 'selAll') { ST.sel = new Set(s.objs.filter(o => !o.lock && o.role !== 'veil' && o.role !== 'tplbg').map(o => o.id)); Ed.drawOverlay(); UI.renderCtx(); return; }
}
function pickImageFor(target) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
  i.onchange = async () => { const f = i.files[0]; if (!f) return; const id = await PM.assetFromFile(f); Ed.placeImage(id, { x: 480, y: 270 }, target && target.t === 'image' ? target : null); };
  i.click();
}
UI.pickImageFor = pickImageFor;
function iconPicker(o) {
  const box = document.createElement('div');
  box.innerHTML = `<input class="inp" id="ipq" placeholder="ابحث بالعربي أو English: سفر، أمان، طائرة، team…"><div class="icgrid" id="ipg" style="grid-template-columns:repeat(10,1fr)"></div>`;
  UI.modal('اختر أيقونة', box);
  const draw = () => {
    const q = $('#ipq').value.trim();
    let names = [];
    try { names = q ? (typeof searchIcons === 'function' ? searchIcons(q, PM.ICONS || ICONS, 120) : suggestIcons(q, PM.ICONS || ICONS, 120)) : suggestIcons([cur().spec.title, ...(o && o.bind ? [String(PM.getPath(cur().spec, o.bind.replace(/\.icon$/, '.title')) || '')] : [])].join(' '), PM.ICONS || ICONS, 60); } catch (e) { names = []; }
    names = names.map(n => typeof n === 'string' ? n : n.name || n[0]).filter(Boolean);
    $('#ipg').innerHTML = names.map(n => `<button data-icn="${esc(n)}" title="${esc(n)}">${ic(n)}</button>`).join('') || '<p class="hint">جرّب كلمة ثانية</p>';
    $$('#ipg button').forEach(b => b.onclick = () => { UI.closeModal(); Ed.placeIcon('lib:' + b.dataset.icn, { x: 480, y: 270 }, o && o.t === 'icon' ? o : null); });
  };
  let t; $('#ipq').oninput = () => { clearTimeout(t); t = setTimeout(draw, 150); };
  draw(); setTimeout(() => $('#ipq').focus(), 30);
}

/* ---------- chart / table data editor ---------- */
function dataEditor(o) {
  if (!o) return;
  const s = cur();
  const box = document.createElement('div');
  if (o.t === 'table') {
    const rows = o.rows.map(r => r.slice());
    const render = () => {
      const n = Math.max(...rows.map(r => r.length));
      box.innerHTML = `<table class="dgrid">${rows.map((r, ri) => `<tr>${Array.from({ length: n }, (_, c) => `<${ri ? 'td' : 'th'}><input data-r="${ri}" data-c="${c}" value="${esc(r[c] || '')}"></${ri ? 'td' : 'th'}>`).join('')}<td class="del"><button data-dr="${ri}" title="حذف الصف">×</button></td></tr>`).join('')}</table>
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn sec" data-ar>${ic('plus')}صف</button><button class="btn sec" data-ac>${ic('plus')}عمود</button><button class="btn sec" data-dc>${ic('minus')}آخر عمود</button></div>`;
      $$('input', box).forEach(inp => inp.oninput = () => { rows[+inp.dataset.r][+inp.dataset.c] = inp.value; });
      $$('[data-dr]', box).forEach(b => b.onclick = () => { if (rows.length > 2) { rows.splice(+b.dataset.dr, 1); render(); } });
      $('[data-ar]', box).onclick = () => { rows.push(Array(n).fill('')); render(); };
      $('[data-ac]', box).onclick = () => { rows.forEach(r => r.push('')); render(); };
      $('[data-dc]', box).onclick = () => { if (n > 2) { rows.forEach(r => r.length = n - 1); render(); } };
    };
    render();
    UI.modal('تعديل الجدول', box, { foot: '<button class="btn pri" id="dOk">تطبيق</button>' });
    $('#dOk').onclick = () => {
      const n = Math.max(...rows.map(r => r.length));
      o.rows = rows.map(r => Array.from({ length: n }, (_, c) => r[c] || ''));
      const rh = o.h / Math.max(1, o.rows.length); void rh;
      if (o.bind) PM.setPath(s.spec, o.bind, o.rows);
      s.edited = true; PM.commit('table'); UI.closeModal(); Ed.render(); PM.emit('change');
    };
    return;
  }
  // chart
  const data = { cats: o.cats.slice(), series: o.series.map(x => ({ name: x.name, vals: x.vals.slice() })), unit: o.unit || '', pre: o.pre || '' };
  const render = () => {
    box.innerHTML = `<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px"><label style="font-size:13px">الوحدة <input class="inp" id="dUnit" style="width:90px;display:inline-block;margin-inline-start:6px" value="${esc(data.unit)}" placeholder="% أو M"></label><span class="hint">مثال: % أو M أو ريال</span></div>
      <table class="dgrid"><tr><th><input value="" disabled placeholder="الفئة"></th>${data.series.map((x, si) => `<th><input data-sn="${si}" value="${esc(x.name)}" placeholder="اسم السلسلة"></th>`).join('')}<td class="del">${data.series.length > 1 ? '' : ''}</td></tr>
      ${data.cats.map((c, ci) => `<tr><td><input data-cat="${ci}" value="${esc(c)}"></td>${data.series.map((x, si) => `<td><input class="num ltr" data-v="${si}:${ci}" value="${x.vals[ci] == null ? '' : x.vals[ci]}" inputmode="decimal"></td>`).join('')}<td class="del"><button data-dr="${ci}" title="حذف">×</button></td></tr>`).join('')}</table>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn sec" data-ar>${ic('plus')}فئة</button>${o.kind === 'donut' || o.kind === 'pie' || o.ring ? '' : `<button class="btn sec" data-as>${ic('plus')}سلسلة</button>${data.series.length > 1 ? `<button class="btn sec" data-ds>${ic('minus')}آخر سلسلة</button>` : ''}`}</div>`;
    $('#dUnit', box).oninput = e => data.unit = e.target.value.trim();
    $$('[data-sn]', box).forEach(i => i.oninput = () => data.series[+i.dataset.sn].name = i.value);
    $$('[data-cat]', box).forEach(i => i.oninput = () => data.cats[+i.dataset.cat] = i.value);
    $$('[data-v]', box).forEach(i => i.oninput = () => { const [si, ci] = i.dataset.v.split(':').map(Number); data.series[si].vals[ci] = parseFloat(PM.digits(i.value).replace(/,/g, '')) || 0; });
    $$('[data-dr]', box).forEach(b => b.onclick = () => { if (data.cats.length > 1) { const k = +b.dataset.dr; data.cats.splice(k, 1); data.series.forEach(x => x.vals.splice(k, 1)); render(); } });
    $('[data-ar]', box).onclick = () => { data.cats.push(''); data.series.forEach(x => x.vals.push(0)); render(); };
    const as = $('[data-as]', box); if (as) as.onclick = () => { data.series.push({ name: '', vals: data.cats.map(() => 0) }); render(); };
    const dsb = $('[data-ds]', box); if (dsb) dsb.onclick = () => { data.series.pop(); render(); };
  };
  render();
  UI.modal('تعديل أرقام الرسم البياني', box, { foot: '<button class="btn pri" id="dOk">تطبيق</button>' });
  $('#dOk').onclick = () => {
    o.cats = data.cats; o.series = data.series.map((x, si) => Object.assign({}, o.series[si] || {}, x)); o.unit = data.unit;
    if (o.ring && o.ringOf) { const v = data.series[0].vals[0]; o.series[0].vals = [v, 100 - v]; PM.writeBind(s.spec, o.ringOf, v + '%'); s.objs.forEach(t => { if (t.t === 'text') t.paras.forEach(p => { if (p.bind === o.ringOf) p.t = v + '%'; }); }); }
    if (o.bind && !o.ring) Ed.syncChart(o);
    s.edited = true; PM.commit('chartdata'); UI.closeModal(); Ed.render(); PM.emit('change');
  };
}
UI.dataEditor = dataEditor;

/* ---------- library ---------- */
function openLibrary() {
  const d = deck(), s = cur(); if (!s) return;
  Ed.endEdit();
  const all = PM.LIB;
  const kind = s.spec.kind;
  const sp = PM.shape(s.spec);
  const tone0 = s.tone || (d.dark ? 'dark' : 'light');
  let fam = null, tone = tone0, q = '', onlyFit = true;
  const famsAll = Object.keys(PM.FAMS);
  const box = document.createElement('div'); box.className = 'lib';
  // honest count: layouts whose light and dark render the same (official template / photo covers) count once
  const SAME = new Set(['cover-official','cover-photo','cover-split','cover-navy','cover-frame','close-official','close-navy','close-photo','div-photo','div-navy','ag-photo','cvx-band','cvx-monument','cvx-corner','cvx-triptych','cvx-lower','cvx-quarter','cvx-ribbon','cvx-strip','clx-split','clx-band','clx-lower','clx-triptych','clx-strip','dvx-center','dvx-hsplit','dvx-columns','agx-navy']);
  const totalVariants = all.reduce((a, L) => a + (SAME.has(L.id) ? 1 : L.tones.length), 0);
  box.innerHTML = `<div class="lib-f"><input class="inp opt" id="lq" placeholder="ابحث: صورة، أرقام، كحلي…" style="margin-bottom:10px">
      <div class="seg opt" id="lt" style="margin-bottom:10px;border-color:var(--line2)"><button data-v="light">فاتح</button><button data-v="dark">داكن</button></div>
      <label class="opt" style="display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--muted);margin-bottom:10px"><input type="checkbox" id="lfit" checked>اللي يناسب محتوى الشريحة فقط</label>
      <div id="lfams"></div></div><div class="lib-g" id="lg"></div>`;
  UI.modal(`مكتبة التصاميم <span class="num" style="font-size:13px;color:var(--muted);font-weight:400">${totalVariants} تصميم</span>`, box, { wide: true });
  const lg = $('#lg', box);
  const famsBox = $('#lfams', box);
  const ctxFor = (t) => { const c = PM.slideCtx(d, ST.cur); c.dark = t === 'dark'; c.tone = PM.tone(c.dark, d.grey); return c; };
  const fits = (L, t) => { const c = ctxFor(t); if (L.kinds ? !L.kinds.includes(kind) : kind !== 'content') return 0; try { return L.accepts(sp, c) || 0; } catch (e) { return 0; } };
  const drawFams = () => {
    const counts = {};
    all.forEach(L => { if (!L.tones.includes(tone)) return; if (onlyFit && !fits(L, tone)) return; counts[L.fam] = (counts[L.fam] || 0) + 1; });
    const n = Object.values(counts).reduce((a, b) => a + b, 0);
    famsBox.innerHTML = `<button class="fam ${!fam ? 'on' : ''}" data-f="">الكل <span class="c">${n}</span></button>` + famsAll.filter(f => counts[f]).map(f => `<button class="fam ${fam === f ? 'on' : ''}" data-f="${f}">${FAM_AR[f] || f} <span class="c">${counts[f]}</span></button>`).join('');
    $$('button', famsBox).forEach(b => b.onclick = () => { fam = b.dataset.f || null; drawFams(); drawGrid(); });
  };
  let io = null;
  const drawGrid = () => {
    if (io) io.disconnect();
    let list = all.filter(L => L.tones.includes(tone) && (!fam || L.fam === fam));
    if (onlyFit) list = list.filter(L => fits(L, tone)).sort((a, b) => fits(b, tone) - fits(a, tone));
    if (q) list = list.filter(L => (L.name + ' ' + (L.tags || []).join(' ') + ' ' + (FAM_AR[L.fam] || '')).includes(q));
    lg.innerHTML = '';
    const w = Math.min(300, (lg.clientWidth - 32 - 16 * 3) / (isPhone() ? 2 : 4)) || 240;
    io = new IntersectionObserver(ents => {
      ents.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target; io.unobserve(el);
        const L = PM.layoutById(el.dataset.id);
        const host = el.querySelector('.h');
        const ok = fits(L, tone);
        if (!ok) { host.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:12px">لـ ${FAM_AR[L.fam] || L.fam}</div>`; el.classList.add('bad'); return; }
        const r = UI.preview(host, L, tone, el.clientWidth);
        if (r.missing && r.missing.length) { el.classList.add('bad'); el.title = 'هذا التصميم يخفي جزءاً من محتوى الشريحة'; }
        if (r.overflow) el.title = 'المحتوى أكثر من مساحة هذا التصميم';
      });
    }, { root: lg, rootMargin: '200px' });
    list.forEach(L => {
      const el = document.createElement('div'); el.className = 'lt' + (L.id === s.layout ? ' on' : ''); el.dataset.id = L.id;
      el.innerHTML = `<div class="h" style="height:${w * 9 / 16}px;position:relative;overflow:hidden"></div><div class="cap"><span>${esc(L.name)}</span><span class="tone">${FAM_AR[L.fam] || ''}</span></div>`;
      el.onclick = () => { if (el.classList.contains('bad') && !confirm('هذا التصميم ما يعرض كل محتوى الشريحة. تبيه مع ذلك؟')) return; s.tone = tone; UI.closeModal(); UI.applyLayoutId(L.id); };
      lg.appendChild(el);
      io.observe(el);
    });
    if (!list.length) lg.innerHTML = '<p class="hint" style="grid-column:1/-1;padding:30px;text-align:center">ما فيه تصاميم بهذا الفلتر</p>';
  };
  $$('#lt button', box).forEach(b => { b.classList.toggle('on', b.dataset.v === tone); b.onclick = () => { tone = b.dataset.v; $$('#lt button', box).forEach(x => x.classList.toggle('on', x === b)); drawFams(); drawGrid(); }; });
  $('#lfit', box).onchange = e => { onlyFit = e.target.checked; drawFams(); drawGrid(); };
  let qt; $('#lq', box).oninput = e => { clearTimeout(qt); qt = setTimeout(() => { q = e.target.value.trim(); drawGrid(); }, 200); };
  drawFams(); requestAnimationFrame(drawGrid);
}
UI.openLibrary = openLibrary;

/* ---------- check ---------- */
PM.checkIssues = function (d) {
  const out = [];
  d.slides.forEach((s, i) => {
    if (s.hidden) return;
    const n = i + 1;
    const texts = s.objs.filter(o => o.t === 'text' && !o.hidden);
    texts.forEach(o => {
      const need = PM.blockH(o.paras, o.w);
      if (need > o.h + 6 && o.role !== 'page') out.push({ i, level: 'w', t: `الشريحة ${n}: نص أطول من صندوقه`, d: o.paras.map(p => p.t).join(' ').slice(0, 60) });
      if (o.paras.some(p => String(p.t).trim() && p.size < 9 && !o.pageNum)) out.push({ i, level: 'w', t: `الشريحة ${n}: خط صغير جداً`, d: 'أقل من 9 — قد يصعب قراءته' });
    });
    for (let a = 0; a < texts.length; a++) for (let b = a + 1; b < texts.length; b++) {
      const A = texts[a], B = texts[b]; if (A.pageNum || B.pageNum) continue;
      const ha = Math.min(A.h, PM.blockH(A.paras, A.w)), hb = Math.min(B.h, PM.blockH(B.paras, B.w));
      const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x), oy = Math.min(A.y + ha, B.y + hb) - Math.max(A.y, B.y);
      if (ox > 4 && oy > 4) { out.push({ i, level: 'e', t: `الشريحة ${n}: نصوص فوق بعض`, d: (A.paras[0] || {}).t + ' / ' + (B.paras[0] || {}).t }); break; }
    }
    s.objs.forEach(o => { if (!o.role && (o.x < -2 || o.y < -2 || o.x + o.w > 962 || o.y + o.h > 542) && o.t !== 'image') out.push({ i, level: 'w', t: `الشريحة ${n}: عنصر خارج حدود الشريحة`, d: o.name || o.t }); });
    s.objs.filter(o => o.t === 'image').forEach(o => { const a = d.assets[o.src]; if (a && a.size && (a.size.w < o.w * 1.2 || a.size.h < o.h * 1.2) && !a.stock && !a.tplbg) out.push({ i, level: 'w', t: `الشريحة ${n}: صورة دقتها قليلة`, d: `${a.size.w}×${a.size.h} — قد تظهر مشوشة` }); });
    if (s.missing && s.missing.length && !s.edited) out.push({ i, level: 'e', t: `الشريحة ${n}: التصميم يخفي جزءاً من المحتوى`, d: 'اضغط «توزيع ذكي» أو اختر تصميماً آخر' });
    const L = PM.layoutById(s.layout);
    if (s.spec.kind === 'content' && !s.spec.title && !(L && /quote/.test(L.fam))) out.push({ i, level: 'w', t: `الشريحة ${n}: بدون عنوان`, d: 'العنوان يساعد الجمهور يتابع' });
    // terminals naming (JEDCO rule)
    const all = texts.map(o => o.paras.map(p => p.t).join(' ')).join(' ');
    if (/الصالة الشمالية|North Terminal/i.test(all)) out.push({ i, level: 'e', t: `الشريحة ${n}: «الصالة الشمالية»`, d: 'حسب التوجيه تُحذف من العروض' });
    if (/الصالة الجنوبية|South Terminal/i.test(all)) out.push({ i, level: 'w', t: `الشريحة ${n}: «الصالة الجنوبية»`, d: 'الاسم المعتمد: الصالة 4' });
    if (/صالات الحج والعمرة/.test(all) && !/3ب/.test(all)) out.push({ i, level: 'w', t: `الشريحة ${n}: «صالات الحج والعمرة»`, d: 'الاسم المعتمد: الصالة 3ب (مجمع صالات الحج والعمرة)' });
  });
  return out;
};
function checkDeck() {
  const d = deck(); if (!d) return;
  Ed.endEdit();
  const issues = PM.checkIssues(d);
  const body = issues.length
    ? issues.map(x => `<div class="issue"><i class="dot ${x.level}"></i><div><b>${esc(x.t)}</b><span>${esc(x.d || '')}</span></div><button class="btn sec" data-go="${x.i}" style="height:34px">افتح</button></div>`).join('')
    : `<div class="issue"><i class="dot ok"></i><div><b>كل شي سليم ✓</b><span>ما لقيت نصوص متراكبة ولا محتوى مخفي ولا مشاكل في الأسماء المعتمدة.</span></div></div>`;
  UI.modal(`فحص العرض <span class="num" style="font-size:13px;color:var(--muted);font-weight:400">${issues.length}</span>`, body);
  $$('#modal [data-go]').forEach(b => b.onclick = () => { UI.closeModal(); UI.select(+b.dataset.go); });
}

/* ---------- Copilot (optional, one copy · one paste) ---------- */
function copilot() {
  const d = deck(); if (!d) return;
  Ed.endEdit();
  const specs = d.slides.map(s => s.spec);
  const prompt = PM.copilotPrompt(specs, d.lang);
  const body = `<div class="note">الأداة وزّعت المحتوى بنفسها. هذي خطوة <b>اختيارية</b> لو تبي رأي Copilot في نوع كل شريحة وعناوين أقصر. <b>نسخة وحدة ولصقة وحدة فقط</b> — Copilot يرجّع خطة قصيرة مهما كان حجم الملف، والكلام نفسه ما يتغيّر.</div>
    <h4 style="margin:16px 0 8px">١ · انسخ الطلب والصقه في Copilot</h4>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="cpCopy">${ic('copy')}نسخ الطلب</button><a class="btn sec" href="https://m365.cloud.microsoft/chat" target="_blank" rel="noopener" data-needs-online>${ic('external-link')}افتح Copilot</a><span class="hint" style="align-self:center"><span class="num">${prompt.length.toLocaleString('en')}</span> حرف</span></div>
    <h4 style="margin:18px 0 8px">٢ · الصق رد Copilot هنا</h4>
    <textarea class="inp" id="cpIn" style="min-height:150px;direction:ltr;text-align:left" placeholder="S1 | cards | …"></textarea>`;
  UI.modal('تحسين التوزيع بكوبايلوت (اختياري)', body, { foot: '<button class="btn pri" id="cpApply">طبّق الخطة</button>' });
  $('#cpCopy').onclick = async () => { try { await navigator.clipboard.writeText(prompt); UI.toast('نسخت الطلب ✓'); } catch (e) { const t = document.createElement('textarea'); t.value = prompt; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); UI.toast('نسخت الطلب ✓'); } };
  $('#cpApply').onclick = () => {
    const n = PM.applyCopilotPlan(specs, $('#cpIn').value);
    if (!n) { UI.toast('ما لقيت خطة في الرد. تأكد إنك لصقت رد Copilot كامل.', 4000); return; }
    // reshape where Copilot asked for another form, then lay everything out again
    d.slides.forEach((s, i) => { if (s.spec.prefer && PM.shape(s.spec).form !== s.spec.prefer) PM.reshape(s.spec, s.spec.prefer); });
    const keep = d.slides.filter(s => !s.spec.skip);
    const skipped = d.slides.length - keep.length;
    keep.forEach(s => s.layout = null);
    d.slides = keep;
    PM.buildDeck(d); PM.renumber(d); PM.commit('copilot');
    UI.closeModal(); UI.renderAll();
    UI.toast(`طبّقت خطة Copilot على ${n} شريحة${skipped ? ` وأخفيت ${skipped} مكررة` : ''} — تقدر تتراجع بـ Ctrl+Z`, 4500);
  };
}
})(window.PM);
