/* ==========================================================================
   صانع العروض — floating text bar while typing (same bar as «مصمم التواصل الداخلي»)
   B · A− size A+ · reset · brush  /  Weight  /  Leading
   · words selected: B bolds those words · nothing selected: everything works on the whole text
   ========================================================================== */
(function (PM) {
'use strict';
const ST = PM.ST, Ed = PM.Ed, TX = PM.TextTools;
const ico = n => { const IC = PM.ICONS || (typeof ICONS !== 'undefined' ? ICONS : {}); return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${IC[n] ? IC[n][1] : ''}</svg>`; };
const bar = document.createElement('div'); bar.id = 'ftb';
bar.innerHTML = `<div class="tr"><button data-t="bold" title="عريض — حدد كلمات لتعريضها هي فقط">B</button><span class="tsep"></span><button data-t="down" title="أصغر">A−</button><input type="range" id="ftSize" min="0.5" max="3" step="0.01" value="1"><button data-t="up" title="أكبر">A+</button><span id="ftVal" class="tv">100%</span><span class="tsep"></span><button data-t="reset" title="إرجاع الحجم والسماكة والتباعد الأصلي">↺</button><span class="tsep"></span><button data-t="paint" title="ناسخ التنسيق: اضغط هنا ثم على العنصر اللي تبي تنسخ له">${ico('paintbrush')}</button></div>
<div class="tr"><span class="tl">Weight</span><button data-t="wdown">−</button><input type="range" id="ftW" min="0" max="2" step="0.05" value="0"><button data-t="wup">+</button><span id="ftWv" class="tv">0.00</span></div>
<div class="tr"><span class="tl">Leading</span><button data-t="ldown">−</button><input type="range" id="ftL" min="0.8" max="2.6" step="0.05" value="1.2"><button data-t="lup">+</button><span id="ftLv" class="tv">1.20</span></div>`;
document.body.appendChild(bar);
const $ = s => bar.querySelector(s);
const cur = () => { const ed = Ed.editing; return ed ? Ed.objById(ed.id) : null; };
let drag = false, raf = 0;

/* restyle the paragraphs being typed in, without touching the words */
function restyle(o) {
  const ed = Ed.editing; if (!ed) return;
  const tmp = document.createElement('div'); tmp.innerHTML = PM.textHTML(o);
  const nu = [...tmp.children], live = [...ed.inner.children].filter(x => x.classList && x.classList.contains('pmp'));
  live.forEach((el, i) => {
    const src = nu[Math.min(i, nu.length - 1)]; if (!src) return;
    const old = parseFloat(el.style.fontSize) || 0;
    el.setAttribute('style', src.getAttribute('style'));
    const k = old ? (parseFloat(el.style.fontSize) || old) / old : 1;
    if (Math.abs(k - 1) > 0.001) el.querySelectorAll('span[style*="font-size"]').forEach(sp => { sp.style.fontSize = (parseFloat(sp.style.fontSize) * k).toFixed(2) + 'px'; });
    const b = el.querySelector('.pmb'), sb = src.querySelector('.pmb'); if (b && sb) b.setAttribute('style', sb.getAttribute('style'));
  });
  // the box follows the words
  const h = Math.max(PM.blockH(o.paras, o.w) + 1, ed.inner.scrollHeight);
  if (h > o.h || o.autoH) { o.h = h; ed.el.style.height = h + 'px'; }
  ST.deck.slides[ST.cur].edited = true;
  Ed.drawOverlay(); sync(); place();
}
function sync() {
  const o = cur(); if (!o) return;
  const k = TX.scaleOf(o), p0 = o.paras[0] || {};
  if (!drag) { $('#ftSize').value = k; $('#ftW').value = p0.sw || 0; $('#ftL').value = p0.lh || 1.2; }
  $('#ftVal').textContent = Math.round(k * 100) + '%'; $('#ftWv').textContent = (+(p0.sw || 0)).toFixed(2); $('#ftLv').textContent = (+(p0.lh || 1.2)).toFixed(2);
  $('[data-t="bold"]').classList.toggle('on', o.paras.every(p => p.bold));
}
function place() {
  const ed = Ed.editing; if (!ed || drag) return;
  const s = getSelection(); let r = null;
  if (s.rangeCount && ed.inner.contains(s.anchorNode)) { const rg = s.getRangeAt(0); r = rg.getBoundingClientRect(); if (!r.width && !r.height) r = null; }
  const box = ed.el.getBoundingClientRect(); if (!r) r = { left: box.left + box.width / 2, right: box.left + box.width / 2, top: box.top, bottom: box.top + 20 };
  const w = bar.offsetWidth, h = bar.offsetHeight;
  let x = (r.left + r.right) / 2 - w / 2, y = r.top - h - 14;
  if (y < 60) y = Math.max(r.bottom, box.top + 10) + 14;
  bar.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + 'px'; bar.style.top = Math.max(8, Math.min(innerHeight - h - 8, y)) + 'px';
}
function show() { if (!Ed.editing) return hide(); bar.classList.add('on'); sync(); place(); }
function hide() { bar.classList.remove('on'); }

PM.on(what => { if (what === 'editing') setTimeout(show, 0); else if (!Ed.editing) hide(); });
const _end = Ed.endEdit; Ed.endEdit = function () { hide(); return _end.apply(this, arguments); };
document.addEventListener('selectionchange', () => { if (!Ed.editing || drag) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (Ed.editing) { if (!bar.classList.contains('on')) show(); else place(); } }); });
addEventListener('resize', () => { if (bar.classList.contains('on')) place(); });
document.addEventListener('scroll', () => { if (bar.classList.contains('on')) place(); }, true);

// keep the caret in the text while using the bar
bar.addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });
bar.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target.matches('input')) { drag = true; const up = () => { drag = false; removeEventListener('pointerup', up); place(); }; addEventListener('pointerup', up); } });
bar.addEventListener('input', e => {
  const o = cur(); if (!o) return; const v = +e.target.value;
  if (e.target.id === 'ftSize') TX.setScale(o, v);
  if (e.target.id === 'ftW') TX.setWeight(o, v);
  if (e.target.id === 'ftL') { if (!o.baseLh) o.baseLh = o.paras.map(p => p.lh || null); o.paras.forEach(p => p.lh = v); }
  restyle(o);
});
bar.addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return; const a = b.dataset.t; const o = cur(); if (!o) return;
  if (a === 'bold') {
    const s = getSelection(); if (s.rangeCount && !s.isCollapsed && Ed.editing.inner.contains(s.anchorNode)) { document.execCommand('bold'); return; }
    const v = !o.paras.every(p => p.bold); o.paras.forEach(p => p.bold = v); restyle(o); return;
  }
  if (a === 'up' || a === 'down') { TX.setScale(o, Math.max(.5, Math.min(3, TX.scaleOf(o) + (a === 'up' ? .1 : -.1)))); restyle(o); return; }
  if (a === 'wup' || a === 'wdown') { TX.setWeight(o, Math.max(0, Math.min(2, (o.paras[0].sw || 0) + (a === 'wup' ? .15 : -.15)))); restyle(o); return; }
  if (a === 'lup' || a === 'ldown') { if (!o.baseLh) o.baseLh = o.paras.map(p => p.lh || null); const v = Math.max(.8, Math.min(2.6, (o.paras[0].lh || 1.2) + (a === 'lup' ? .1 : -.1))); o.paras.forEach(p => p.lh = +v.toFixed(2)); restyle(o); return; }
  if (a === 'reset') { if (o.base) TX.setScale(o, 1); TX.setWeight(o, 0); if (o.baseLh) { o.paras.forEach((p, i) => { const v = o.baseLh[Math.min(i, o.baseLh.length - 1)]; if (v == null) delete p.lh; else p.lh = v; }); delete o.baseLh; } restyle(o); return; }
  if (a === 'paint') { const id = o.id, sticky = e.detail >= 2; Ed.endEdit(); ST.sel = new Set([id]); Ed.drawOverlay(); PM.emit('sel'); if (PM.Paint) PM.Paint.start(sticky); return; }
});
})(window.PM);
