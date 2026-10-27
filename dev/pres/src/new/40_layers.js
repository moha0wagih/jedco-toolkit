/* ==========================================================================
   صانع العروض 2.3 — layers panel (like Photoshop)
   Every object on the slide, top layer first. Click to select (Shift / Ctrl / ⌘
   to add), drag to reorder, eye to hide, lock to freeze, double-click to rename.
   ========================================================================== */
(function (PM) {
'use strict';
const ST = PM.ST;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LY = PM.Layers = { host: null };
const ic = n => PM.UI.ic(n);
const slide = () => ST.deck && ST.deck.slides[ST.cur];
const isTpl = o => o.role === 'bg' || o.role === 'tplbg' || o.role === 'chrome' || o.role === 'page' || o.pageNum;

/* ---------- names ---------- */
const TYPE_IC = { text: 'type', image: 'image', rect: 'square', ellipse: 'circle', line: 'minus', icon: 'star', logo: 'stamp', chart: 'chart-column', table: 'table-2' };
function baseName(o) {
  if (o.lname) return o.lname;
  if (o.role === 'tplbg') return 'خلفية القالب';
  if (o.pageNum || o.role === 'page') return 'رقم الصفحة';
  if (o.t === 'logo') return 'الشعار';
  if (o.role === 'bg') return 'خلفية الشريحة';
  if (o.role === 'veil') return 'تدرّج فوق الصورة';
  if (o.t === 'text') {
    const t = PM.plain((o.paras || []).map(p => p.t).join(' ')).replace(/\s+/g, ' ').trim();
    return t ? (t.length > 34 ? t.slice(0, 34) + '…' : t) : 'نص فارغ';
  }
  if (o.t === 'image') { const a = ST.deck.assets[o.src]; return a && a.kind === 'sug' ? 'صورة مقترحة' : 'صورة'; }
  return { rect: 'شكل', ellipse: 'دائرة', line: 'خط', icon: 'أيقونة', chart: 'رسم بياني', table: 'جدول' }[o.t] || 'عنصر';
}
LY.name = baseName;
function thumb(o) {
  if (o.t === 'image') {
    const url = PM.imgURL(ST.deck.assets, o.src);
    if (url) return `<span class="ly-th" style="background-image:url('${url}')"></span>`;
  }
  if ((o.t === 'rect' || o.t === 'ellipse') && o.fill) return `<span class="ly-th sw${o.t === 'ellipse' ? ' rd' : ''}" style="background:#${o.fill}"></span>`;
  return `<span class="ly-th ic">${ic(TYPE_IC[o.t] || 'square')}</span>`;
}

/* ---------- render ---------- */
LY.render = function (p) {
  const s = slide(); if (!s || !p) return;
  LY.host = p;
  const list = s.objs.slice().reverse();
  p.innerHTML = `<h4>${ic('layers')}طبقات الشريحة <span class="num ly-n">${s.objs.length}</span></h4>
    <p class="hint">اللي فوق في القائمة يطلع فوق في الشريحة · اسحب الطبقة لأعلى أو لأسفل عشان ترتّبها · ضغطتين على الاسم لتغييره</p>
    <div class="ly-list" id="lyList">${list.map(row).join('')}</div>
    <div class="ly-acts" id="lyActs">
      <button class="chip" data-z="front" title="أعلى طبقة">${ic('arrow-up-to-line')}للأعلى</button>
      <button class="chip" data-z="up" title="طبقة لفوق (])">${ic('chevron-up')}لفوق</button>
      <button class="chip" data-z="down" title="طبقة لتحت ([)">${ic('chevron-down')}لتحت</button>
      <button class="chip" data-z="back" title="أسفل طبقة (فوق الخلفية)">${ic('arrow-down-to-line')}للأسفل</button>
    </div>
    <div class="note" style="margin-top:12px">العين تخفي الطبقة من الشريحة ومن الملف · القفل يثبّتها عشان ما تتحرك بالغلط · طبقات <b>القالب</b> (الخلفية والشعار ورقم الصفحة) مقفولة من البداية</div>`;
  syncActs();
  bind(p);
};
function row(o) {
  const sel = ST.sel.has(o.id), tpl = isTpl(o), fixed = o.role === 'tplbg';
  return `<div class="ly${sel ? ' on' : ''}${o.hidden ? ' off' : ''}${o.lock ? ' lk' : ''}${tpl ? ' tpl' : ''}" data-id="${o.id}" draggable="${fixed ? 'false' : 'true'}">
    <span class="ly-g" title="اسحب لترتيب الطبقة">${ic('grip-vertical')}</span>${thumb(o)}
    <span class="ly-nm" dir="auto" title="${PM.esc(baseName(o))}">${PM.esc(baseName(o))}</span>${tpl ? '<span class="ly-tag">قالب</span>' : ''}
    <button class="ly-b${o.hidden ? ' act' : ''}" data-l="eye" title="${o.hidden ? 'أظهر الطبقة' : 'أخفِ الطبقة'}">${ic(o.hidden ? 'eye-off' : 'eye')}</button>
    <button class="ly-b${o.lock ? ' act' : ''}" data-l="lock" ${fixed ? 'disabled title="خلفية القالب الرسمية ثابتة"' : `title="${o.lock ? 'افتح القفل' : 'اقفل الطبقة'}"`}>${ic(o.lock ? 'lock' : 'lock-open')}</button>
  </div>`;
}
function syncActs() {
  const on = [...ST.sel].length > 0;
  $$('#lyActs button', LY.host).forEach(b => b.disabled = !on);
}
const objById = id => { const s = slide(); return s && s.objs.find(o => o.id === id); };
function changed(label) {
  const s = slide(); s.edited = true;
  PM.commit(label); PM.Ed.render(); PM.emit('change');
}

/* ---------- interactions ---------- */
function bind(p) {
  const L = $('#lyList', p); if (!L) return;
  $('#lyActs', p).onclick = e => { const b = e.target.closest('[data-z]'); if (!b || b.disabled) return; PM.Ed.zorder(b.dataset.z); };
  L.onclick = e => {
    const r = e.target.closest('.ly'); if (!r || e.target.closest('input')) return;
    const o = objById(r.dataset.id); if (!o) return;
    const btn = e.target.closest('[data-l]');
    if (btn) {
      if (btn.disabled) return;
      if (btn.dataset.l === 'eye') { o.hidden = !o.hidden; if (o.hidden) ST.sel.delete(o.id); changed('layer-eye'); }
      else { o.lock = !o.lock; if (o.lock) ST.sel.delete(o.id); changed('layer-lock'); }
      PM.Ed.drawOverlay(); PM.emit('sel');
      return;
    }
    if (o.hidden) return PM.UI.toast('الطبقة مخفية — اضغط العين عشان تظهرها');
    if (o.lock) return PM.UI.toast('الطبقة مقفولة — اضغط القفل عشان تقدر تحرّكها');
    if (PM.Ed.editing) PM.Ed.endEdit();
    if (e.shiftKey || e.ctrlKey || e.metaKey) { if (ST.sel.has(o.id)) ST.sel.delete(o.id); else ST.sel.add(o.id); }
    else { ST.sel.clear(); ST.sel.add(o.id); }
    PM.Ed.drawOverlay(); PM.emit('sel');
  };
  // rename
  L.ondblclick = e => {
    const nm = e.target.closest('.ly-nm'); if (!nm) return;
    const r = nm.closest('.ly'), o = objById(r.dataset.id); if (!o) return;
    const inp = document.createElement('input');
    inp.className = 'ly-in'; inp.value = baseName(o); inp.dir = 'auto';
    nm.replaceWith(inp); inp.focus(); inp.select();
    r.draggable = false;
    let done = false;
    const end = ok => {
      if (done) return; done = true;
      const v = inp.value.trim();
      if (ok && v && v !== baseName(o)) { o.lname = v; PM.commit('layer-name'); }
      else if (ok && !v && o.lname) { delete o.lname; PM.commit('layer-name'); }
      LY.render(LY.host);
    };
    inp.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') end(true); if (ev.key === 'Escape') end(false); };
    inp.onblur = () => end(true);
  };
  // hover → outline on the slide
  L.onpointerover = e => { const r = e.target.closest('.ly'); hl(r ? r.dataset.id : null); };
  L.onpointerleave = () => hl(null);
  // drag to reorder
  let dragId = null;
  L.ondragstart = e => {
    const r = e.target.closest('.ly'); if (!r || r.draggable === false) return e.preventDefault();
    dragId = r.dataset.id; r.classList.add('drag');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragId); } catch (er) { }
  };
  L.ondragover = e => {
    if (!dragId) return;
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    $$('.ly.dt,.ly.db', L).forEach(x => x.classList.remove('dt', 'db'));
    const r = e.target.closest('.ly'); if (!r || r.dataset.id === dragId) return;
    const b = r.getBoundingClientRect();
    r.classList.add(e.clientY < b.top + b.height / 2 ? 'dt' : 'db');
  };
  L.ondragleave = e => { if (!L.contains(e.relatedTarget)) $$('.ly.dt,.ly.db', L).forEach(x => x.classList.remove('dt', 'db')); };
  L.ondrop = e => {
    if (!dragId) return;
    e.preventDefault(); e.stopPropagation();
    const r = e.target.closest('.ly');
    const above = r && r.classList.contains('dt');
    const id = dragId; dragId = null;
    if (!r || r.dataset.id === id) return LY.render(LY.host);
    moveLayer(id, r.dataset.id, above);
  };
  L.ondragend = () => { dragId = null; $$('.ly', L).forEach(x => x.classList.remove('drag', 'dt', 'db')); };
}
/* the list is top-first; objs[] is bottom-first */
function moveLayer(id, targetId, above) {
  const s = slide();
  const o = s.objs.find(x => x.id === id); if (!o) return;
  const rest = s.objs.filter(x => x.id !== id);
  let j = rest.findIndex(x => x.id === targetId); if (j < 0) return;
  // «above» in the list = higher in the stack = later in objs
  j = above ? j + 1 : j;
  // the slide background (and the official template background) always stay at the very bottom
  let floor = 0; while (floor < rest.length && (rest[floor].role === 'tplbg' || rest[floor].role === 'bg')) floor++;
  if (o.role === 'bg' || o.role === 'tplbg') floor = 0;
  j = Math.max(j, floor);
  rest.splice(j, 0, o);
  s.objs = rest;
  changed('layer-order');
}
function hl(id) {
  const ov = PM.Ed.ov; if (!ov) return;
  const old = ov.querySelector('.ly-hl'); if (old) old.remove();
  const o = id && objById(id); if (!o || o.hidden) return;
  const inv = 1 / PM.Ed.scale;
  const d = document.createElement('div');
  d.className = 'ly-hl';
  d.style.cssText = `left:${o.x}px;top:${o.y}px;width:${Math.max(o.w, 1)}px;height:${Math.max(o.h, 1)}px;border-width:${1.5 * inv}px`;
  ov.appendChild(d);
}

/* keep the panel in step with the stage */
PM.on(w => {
  if (!PM.UI || PM.UI.tab !== 'layers' || !LY.host || !document.body.contains(LY.host)) return;
  if (w !== 'sel' && w !== 'change' && w !== 'all') return;
  if (LY.host.querySelector('.ly-in')) return; // renaming
  if (w === 'sel') {
    // light update: highlight only
    $$('.ly', LY.host).forEach(r => r.classList.toggle('on', ST.sel.has(r.dataset.id)));
    syncActs();
    const on = $('.ly.on', LY.host); if (on && on.scrollIntoViewIfNeeded) on.scrollIntoViewIfNeeded(false);
    return;
  }
  clearTimeout(LY.t); LY.t = setTimeout(() => { if (PM.UI.tab === 'layers') LY.render(LY.host); }, 60);
});
})(window.PM);
