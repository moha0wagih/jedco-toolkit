/* ==========================================================================
   مصمم التواصل الداخلي · build 42 — لغة المحتوى
   One choice per announcement: عربي + English | عربي فقط | English فقط.
   · It changes the content only (header titles + every element under it).
     The footer (values + sender) stays exactly as it is.
   · Nothing is deleted: the other language is only hidden, so switching back
     brings it back. The choice is saved on the design itself (#blocks[data-lang]),
     so undo, autosave, «إعلاناتي», .jedco.json and every board keep it.
   ========================================================================== */
(function () {
  'use strict';
  const q = (s, r) => (r || document).querySelector(s), qa = (s, r) => [...(r || document).querySelectorAll(s)];

  /* ---------- the look (added to #mainStyle so export, previews, presentation and «الطبقات» all see it) ---------- */
  const A = '#blocks[data-lang=ar]', E = '#blocks[data-lang=en]', S1 = '#blocks[data-lang]';
  const HA = ':has(> #blocks[data-lang=ar]) > .hdr', HE = ':has(> #blocks[data-lang=en]) > .hdr';
  const CSS = `
/* lang1: one-language content */
${A} .ed.en,${E} .ed.ar{display:none!important}
${S1} .row{grid-template-columns:1fr}
${A} .lst .li{grid-template-columns:1fr 44px}${A} .lst .lslot{order:1}
${E} .lst .li{grid-template-columns:44px 1fr}${E} .lst .lslot{order:-1}
${A} .scard .row{grid-template-columns:1fr 56px}${A} .scard .row>div:first-child{display:none}${A} .scard .mid{order:1}
${E} .scard .row{grid-template-columns:56px 1fr}${E} .scard .row>div:last-child{display:none}${E} .scard .mid{order:-1}
${E} .pillars{direction:ltr}
${E} .pcard .pl.en{font-size:11px;line-height:18px;margin-top:12px;-webkit-text-stroke:.55px currentColor}
${E} .info,${E} .itx{direction:ltr}
${E} .steps{direction:ltr}
${E} .stp:not(:last-child)::after{right:calc(-50% + 30px);left:calc(50% + 30px)}
${E} .stp:not(:last-child)::before{left:auto;right:calc(-50% + 26px);border-right-color:transparent;border-left-color:var(--c)}
${E} .stp .sl2{margin-top:8px;font-size:11px;line-height:16px;opacity:1;-webkit-text-stroke:.5px currentColor}
${E} .tag .tg2{font-size:16px;line-height:26px;color:var(--navy);margin-top:0;-webkit-text-stroke:.55px currentColor}
${E} .lt.en{font-size:12px;line-height:18px}
${E} .hd.en{font-size:13px}
/* header titles */
${HA} .htitles .t3,${HA} .htitles .t4{display:none!important}
${HE} .htitles .t1,${HE} .htitles .t2{display:none!important}
${HE}:not(.welcome) .htitles .t3{top:80px;font-size:calc(25px * var(--ts));line-height:calc(38px * var(--ts))}
${HE}:not(.welcome) .htitles .t4{display:block;top:124px;font-family:FSI;font-size:calc(17px * var(--ts));line-height:calc(28px * var(--ts));direction:ltr;text-align:right;-webkit-text-stroke:.3px currentColor}
${HA}.welcome .htitles .t1{top:150px}
${HA}.welcome .htitles .t2{top:196px;font-size:calc(16px * var(--ts));line-height:calc(26px * var(--ts))}
${HE}.welcome .htitles .t3{top:150px}
${HE}.welcome .htitles .t4{top:192px;font-size:calc(14px * var(--ts));line-height:calc(22px * var(--ts))}
`;
  const UI_CSS = `
#lgBox{margin:0 0 14px}
#lgBox h3{margin:0 0 8px}
#lgBox .lgseg{display:flex;gap:3px;background:#eef3f9;border-radius:9px;padding:3px}
#lgBox .lgseg button{flex:1;border:0;background:transparent;border-radius:7px;padding:7px 4px;font-size:12.5px;cursor:pointer;color:var(--ui-text);white-space:nowrap;font-family:Tajawal}
#lgBox .lgseg button[data-l=en]{font-family:FSI}
#lgBox .lgseg button.on{background:#fff;color:var(--ui-acc);font-weight:700;box-shadow:0 1px 3px rgba(0,38,87,.15)}
#lgBox .hint{margin-top:6px}
`;
  function addCss() {
    const ms = q('#mainStyle'); if (ms && !ms.textContent.includes('lang1:')) ms.textContent += CSS;
    if (!q('#lgUiStyle')) { const s = document.createElement('style'); s.id = 'lgUiStyle'; s.textContent = UI_CSS; document.head.appendChild(s); }
  }

  /* ---------- state on the design ---------- */
  const langOf = el => { const b = el && el.closest ? el.closest('#blocks') : null; const v = b && b.dataset.lang; return v === 'ar' || v === 'en' ? v : 'both'; };
  const cur = () => { const b = q('#blocks', page); const v = b && b.dataset.lang; return v === 'ar' || v === 'en' ? v : 'both'; };

  /* ---------- chips + date/place items follow the content language ---------- */
  const _chip = window.renderChip, _item = window.renderItem;
  function withLang(el, lang, fn) { const keep = el.dataset.cfg; const c = getCfg(el); c.lang = lang; setCfg(el, c); try { fn(el); } finally { el.dataset.cfg = keep; } }
  if (typeof _chip === 'function') window.renderChip = renderChip = function (chip) { const m = langOf(chip); if (m === 'both') return _chip(chip); withLang(chip, m, _chip); };
  if (typeof _item === 'function') window.renderItem = renderItem = function (it) {
    const m = langOf(it); if (m === 'both') return _item(it); if (m === 'ar') return withLang(it, 'ar', _item);
    const c = getCfg(it), tx = q('.itx', it); let l1, ph = false;
    if (c.kind === 'date') { const D = pd(c.v); if (D) l1 = enDate(D, c.year); else { l1 = 'Date'; ph = true; } }
    else if (c.kind === 'time') l1 = `${c.h || '10'}:${c.mi || '00'} ${c.ap || 'am'}`;
    else { l1 = c.en || (c.kind === 'loc' ? 'Location' : 'Text'); ph = !c.en; }
    tx.innerHTML = `<span class="l1 en${ph ? ' phx' : ''}">${esc(l1)}</span>`;
  };

  /* ---------- the English subtitle line (t4) ---------- */
  function ensureT4() {
    const ht = q('.htitles', page); if (!ht) return;
    let t4 = q('.t4', ht); if (!t4) { ht.insertAdjacentHTML('beforeend', ed('ht t4', 'Subtitle', '')); t4 = q('.t4', ht); }
    const wel = !!q('.hdr.welcome', page); if (!wel) t4.dataset.ph = 'Subtitle';
  }

  /* comfortable sizes for one wide column (balancing two columns makes no sense here) */
  function singleSizes() {
    const m = cur(); if (m === 'both') return;
    qa('.blk[data-type=text]', page).forEach(b => {
      if (m === 'ar') { b.style.setProperty('--ar-fs', '13.2px'); b.style.setProperty('--ar-lh', '22.4px'); }
      else { b.style.setProperty('--en-fs', '11px'); b.style.setProperty('--en-lh', '17.6px'); }
    });
  }

  function setLang(m) {
    const bl = q('#blocks', page); if (!bl) return;
    if (m === cur()) return;
    if (typeof deselect === 'function') deselect();
    H.mute = true; clearTimeout(H.t);   // one undo step for the whole switch
    const P = ['--ar-fs', '--ar-lh', '--en-fs', '--en-lh'], texts = qa('.blk[data-type=text]', page);
    if (m === 'both') {
      bl.removeAttribute('data-lang');
      // the two-column sizes come back exactly as they were
      texts.forEach(b => { let o = null; try { o = JSON.parse(b.dataset.lgfs || 'null'); } catch (e) { } P.forEach(p => { if (o && o[p]) b.style.setProperty(p, o[p]); else b.style.removeProperty(p); }); delete b.dataset.lgfs; });
    } else {
      if (cur() === 'both') texts.forEach(b => { const o = {}; P.forEach(p => { const v = b.style.getPropertyValue(p); if (v) o[p] = v; }); b.dataset.lgfs = JSON.stringify(o); });
      bl.dataset.lang = m; ensureT4(); singleSizes();
    }
    renderDynamic();
    try { window.__titlesApi && window.__titlesApi.restack(); } catch (e) { }
    afterLayout(); sync();
    setTimeout(() => { try { window.__titlesApi && window.__titlesApi.restack(); } catch (e) { } }, 60);
    setTimeout(() => { clearTimeout(H.t); H.mute = false; snap(true); }, 400);
    toast(m === 'ar' ? 'المحتوى صار عربي فقط — الإنجليزي محفوظ ويرجع لو رجعت للغتين' : m === 'en' ? 'المحتوى صار English فقط — العربي محفوظ ويرجع لو رجعت للغتين' : 'رجع المحتوى بلغتين');
  }

  /* ---------- the control in the side panel ---------- */
  function box() {
    if (q('#lgBox')) return;
    const panel = q('#blockPanel'); if (!panel) return;
    const h3 = qa('h3', panel).find(h => h.textContent.trim() === 'إضافة عنصر'); if (!h3) return;
    const d = document.createElement('div'); d.id = 'lgBox';
    d.innerHTML = `<h3>لغة المحتوى</h3><div class="lgseg" role="tablist"><button type="button" data-l="both">عربي + English</button><button type="button" data-l="ar">عربي فقط</button><button type="button" data-l="en">English only</button></div><div class="hint">الفوتر يبقى زي ما هو. النص المخفي ما ينحذف.</div>`;
    h3.before(d);
    d.addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (!b) return; e.stopPropagation(); setLang(b.dataset.l); });
    sync();
  }
  function sync() { const m = cur(); qa('#lgBox [data-l]').forEach(b => b.classList.toggle('on', b.dataset.l === m)); }

  /* keep the control right after undo / switching boards / opening files */
  const _sp = window.setPage;
  if (typeof _sp === 'function') window.setPage = setPage = function () { const r = _sp.apply(this, arguments); sync(); return r; };
  const _rb = window.rebalance;
  if (typeof _rb === 'function') window.rebalance = rebalance = function () { const r = _rb.apply(this, arguments); singleSizes(); return r; };
  const bb = q('#bBalance'); if (bb) bb.addEventListener('click', () => singleSizes());

  function init() {
    addCss(); box(); renderDynamic(); sync();
    // undo / redo / opening a file replace the page: keep the switch showing the right language
    try { new MutationObserver(() => sync()).observe(page, { childList: true, attributes: true, attributeFilter: ['data-lang'], subtree: true }); } catch (e) { }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.__langApi = { setLang, cur };
})();
