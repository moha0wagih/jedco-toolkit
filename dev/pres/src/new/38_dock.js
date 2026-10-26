/* ==========================================================================
   صانع العروض 2 — layout dock (right side)
   Every design that fits this slide, rendered with the slide's own content.
   Hover magnifies like the macOS dock and previews the design on the stage;
   a click applies it.
   ========================================================================== */
(function (PM) {
'use strict';
const ST = PM.ST;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const D = PM.Dock = { fam: '', tone: null, all: false, key: '' };
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };

D.mount = function () {
  const host = $('#dock'); if (!host) return;
  host.innerHTML = `<div class="dk-h"><b>التصاميم</b><span class="num" id="dkN"></span><button class="dk-x" id="dkMin" title="إخفاء الدك">${PM.UI.ic('panel-right-close')}</button></div>
    <div class="dk-f"><div class="seg sm" id="dkTone"><button data-v="light">فاتح</button><button data-v="dark">داكن</button></div><select id="dkFam" class="dk-sel"></select></div>
    <label class="dk-all"><input type="checkbox" id="dkAll"> كل المكتبة</label>
    <div class="dk-list" id="dkList"></div>`;
  $('#dkMin').onclick = () => D.toggle(false);
  $('#dkOpen').onclick = () => D.toggle(true);
  $$('#dkTone button').forEach(b => b.onclick = () => { D.tone = b.dataset.v; D.key = ''; D.render(); });
  $('#dkFam').onchange = e => { D.fam = e.target.value; D.key = ''; D.render(); };
  $('#dkAll').onchange = e => { D.all = e.target.checked; D.key = ''; D.render(); };
  const list = $('#dkList');
  // macOS-dock magnification
  list.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const tiles = $$('.dk-t', list);
    for (const t of tiles) {
      const r = t.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) continue;
      const d = Math.abs(e.clientY - (r.top + r.height / 2));
      const k = 1 + 0.42 * Math.max(0, 1 - d / 170);
      t.style.transform = `scale(${k.toFixed(3)})`; t.style.zIndex = Math.round(k * 100);
    }
  });
  list.addEventListener('pointerleave', () => { $$('.dk-t', list).forEach(t => { t.style.transform = ''; t.style.zIndex = ''; }); D.endPreview(); });
  list.addEventListener('scroll', () => D.endPreview(), { passive: true });
  D.toggle(lsGet('pm.dock') !== '0', true);
};
D.toggle = function (on, quiet) {
  document.body.classList.toggle('dock-off', !on);
  if (!quiet) lsSet('pm.dock', on ? '1' : '0');
  setTimeout(() => { PM.Ed.fit(); if (on) { D.key = ''; D.render(); } }, 30);
};

function specKey(s, tone) { return s.id + '|' + tone + '|' + D.fam + '|' + D.all + '|' + JSON.stringify(s.spec).length + ':' + JSON.stringify(s.spec).slice(0, 400) + '|' + s.layout; }
D.render = function () {
  const host = $('#dock'); const d = ST.deck, s = d && d.slides[ST.cur];
  if (!host || !s || document.body.classList.contains('dock-off') || innerWidth <= 860) return;
  const tone = D.tone || s.tone || (d.dark ? 'dark' : 'light');
  $$('#dkTone button').forEach(b => b.classList.toggle('on', b.dataset.v === tone));
  const key = specKey(s, tone);
  if (key === D.key) { $$('.dk-t', host).forEach(t => t.classList.toggle('on', t.dataset.id === s.layout)); return; }
  D.key = key;
  const c = PM.slideCtx(d, ST.cur); c.dark = tone === 'dark'; c.tone = PM.tone(c.dark, d.grey);
  const sp = PM.shape(s.spec);
  const kind = s.spec.kind;
  const fits = L => { if (L.kinds ? !L.kinds.includes(kind) : kind !== 'content') return 0; try { return L.accepts(sp, c) || 0; } catch (e) { return 0; } };
  let list = PM.LIB.filter(L => L.tones.includes(tone)).map(L => ({ L, f: fits(L) }));
  if (!D.all) list = list.filter(x => x.f > 0);
  const fams = {}; list.forEach(x => fams[x.L.fam] = (fams[x.L.fam] || 0) + 1);
  $('#dkFam').innerHTML = `<option value="">كل الأنواع (${list.length})</option>` + Object.keys(fams).map(f => `<option value="${f}" ${D.fam === f ? 'selected' : ''}>${(PM.UI.FAM_AR[f] || f)} (${fams[f]})</option>`).join('');
  if (D.fam && !fams[D.fam]) D.fam = '';
  if (D.fam) list = list.filter(x => x.L.fam === D.fam);
  list.sort((a, b) => (b.f > 0) - (a.f > 0) || b.f - a.f);
  $('#dkN').textContent = list.length;
  const box = $('#dkList');
  box.innerHTML = '';
  if (D.io) D.io.disconnect();
  const W = 116;
  D.io = new IntersectionObserver(ents => ents.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target; D.io.unobserve(el);
    const L = PM.layoutById(el.dataset.id);
    const r = PM.UI.preview(el.querySelector('.h'), L, tone, W);
    if (r && r.missing && r.missing.length) { el.classList.add('bad'); el.title = L.name + ' — يخفي جزءاً من المحتوى'; }
  }), { root: box, rootMargin: '300px' });
  for (const { L, f } of list) {
    const el = document.createElement('div');
    el.className = 'dk-t' + (L.id === s.layout ? ' on' : '') + (f ? '' : ' nf');
    el.dataset.id = L.id; el.title = L.name;
    el.innerHTML = `<div class="h" style="width:${W}px;height:${W * 9 / 16}px"></div><span class="cap">${PM.esc(L.name)}</span>`;
    el.onclick = () => {
      D.endPreview(true);
      if (!f && !confirm('هذا التصميم مو مصمم لهذا النوع من المحتوى، ممكن يخفي جزءاً منه. تبيه؟')) return;
      if (el.classList.contains('bad') && f && !confirm('هذا التصميم يخفي جزءاً من محتوى الشريحة. تبيه مع ذلك؟')) return;
      const sl = ST.deck.slides[ST.cur]; sl.tone = tone;
      PM.UI.applyLayoutId(L.id);
    };
    el.onpointerenter = e => { if (e.pointerType !== 'mouse') return; clearTimeout(D.pt); D.pt = setTimeout(() => D.preview(L, tone), 380); };
    el.onpointerleave = () => clearTimeout(D.pt);
    box.appendChild(el);
    D.io.observe(el);
  }
  if (!list.length) box.innerHTML = '<p class="hint" style="padding:14px">ما فيه تصاميم بهذا الفلتر</p>';
  const on = $('.dk-t.on', box); if (on) on.scrollIntoView({ block: 'center' });
};
/* hover → the stage shows the design with the slide's content (nothing is applied) */
D.preview = function (L, tone) {
  const d = ST.deck, s = d.slides[ST.cur], Ed = PM.Ed;
  if (!s || Ed.editing) return;
  const spec = JSON.parse(JSON.stringify(s.spec));
  const c = PM.slideCtx(d, ST.cur); c.dark = tone === 'dark'; c.tone = PM.tone(c.dark, d.grey);
  const fake = { id: s.id, spec }; c.photoFor = (sp, i) => PM.autoPhoto(d, fake, i);
  const r = PM.renderLayout(L, spec, c);
  PM.renderSlide(Ed.stage, PM.explodeText(r.objs), d.assets, {});
  Ed.ov.innerHTML = `<div class="dk-pv">معاينة: ${PM.esc(L.name)} — اضغط لتطبيقه</div>`;
  D.previewing = true;
};
D.endPreview = function (skipRender) {
  clearTimeout(D.pt);
  if (!D.previewing) return;
  D.previewing = false;
  if (!skipRender) PM.Ed.render();
};
})(window.PM);
