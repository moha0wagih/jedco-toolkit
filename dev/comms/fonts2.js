/* ==========================================================================
   مصمم التواصل الداخلي · build 38 — الخطوط
   1) Automatic: a text written in English inside an Arabic-styled line switches
      to FS Industrie by itself, and Arabic typed into an English-styled line
      switches to Tajawal. Lines that are Sequel on purpose (English title,
      numbers) keep Sequel.
   2) Manual: a «Font» row on the text bar — تلقائي / Tajawal / Sequel /
      FS Industrie — for the selected words (or the whole text if nothing is
      selected). A manual choice always wins over the automatic one.
   ========================================================================== */
(function () {
  'use strict';
  const qa = (s, r) => [...(r || document).querySelectorAll(s)];
  const isTaj = f => /tajawal/i.test(f || '');
  function langScore(t) { t = t || ''; return { lat: (t.match(/[A-Za-z]/g) || []).length, ar: (t.match(/[؀-ۿ]/g) || []).length }; }
  function wants(baseFam, text) {
    const { lat, ar } = langScore(text);
    if (lat >= 2 && lat > ar * 1.5 && isTaj(baseFam.split(',')[0])) return "FSI, Tajawal, sans-serif";
    if (ar >= 2 && ar > lat * 1.5 && !isTaj(baseFam.split(',')[0])) return "Tajawal, sans-serif";
    return '';
  }
  // the units that get one font each: a paragraph of a body, or the text element itself
  const UNITS = '.htitles .ht, #blocks .ed, #blocks .chip .ct, #blocks .iitem .itx span';
  function units(root) {
    const out = [];
    qa(UNITS, root || page).forEach(el => { if (el.closest('.phx')) return; const ps = qa(':scope > p, :scope > div', el); if (ps.length) out.push(...ps); else out.push(el); });
    return out;
  }
  function autoOne(el) {
    if (!el || !el.isConnected || el.hasAttribute('data-ff')) return;
    const had = el.dataset.autoff != null;
    if (had) { el.style.removeProperty('font-family'); delete el.dataset.autoff; }
    const base = getComputedStyle(el).fontFamily;
    const w = wants(base, el.textContent);
    if (w) { el.style.fontFamily = w; el.dataset.autoff = '1'; }
    if (!el.getAttribute('style')) el.removeAttribute('style');
  }
  function autoAll(root) { try { units(root).forEach(autoOne); } catch (e) { } }

  // typing: re-check the edited unit a moment after the last key
  let t = 0;
  page.addEventListener('input', e => {
    const ed = e.target.closest && e.target.closest(UNITS); if (!ed) return;
    clearTimeout(t); t = setTimeout(() => { const ps = qa(':scope > p, :scope > div', ed); (ps.length ? ps : [ed]).forEach(autoOne); }, 350);
  });
  // opening a design / switching tabs / adding elements
  try { new MutationObserver(muts => { if (muts.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches('.blk,.hdr,#blocks,.htitles') || n.querySelector?.('.ed,.ht'))))) setTimeout(() => autoAll(), 60); }).observe(page, { childList: true, subtree: true }); } catch (e) { }
  setTimeout(() => autoAll(), 900);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => autoAll());

  /* ---------- manual choice on the text bar ---------- */
  if (typeof tbar === 'undefined' || typeof TS === 'undefined' || typeof ensureSpans !== 'function') { window.__fontsApi = { autoAll, autoOne, wants }; return; }
  const FF = [['', 'تلقائي', 'حسب لغة النص'], ['Tajawal', 'Tajawal', 'للعربي'], ['Sequel', 'Sequel', 'الأرقام والعناوين الإنجليزية'], ['FSI', 'FS Industrie', 'النص الإنجليزي']];
  const row = document.createElement('div'); row.className = 'tr ffRow';
  row.innerHTML = `<span class="tl">Font</span>${FF.map(([v, n, d]) => `<button type="button" data-ffv="${v}" title="${d}" style="${v ? `font-family:${v},Tajawal` : ''}">${n}</button>`).join('')}`;
  tbar.appendChild(row);
  function curFF() {
    const n = TS.range && TS.ed && typeof selectedTextNodesPeek === 'function' ? selectedTextNodesPeek(TS.range, TS.ed)[0] : null;
    let el = n ? n.parentElement : TS.ed; if (!el) return null;
    const man = el.closest('[data-ff]'); return man && TS.ed && (TS.ed.contains(man) || man === TS.ed) ? man.getAttribute('data-ff') : '';
  }
  function mark() { const c = curFF(); row.querySelectorAll('[data-ffv]').forEach(b => b.classList.toggle('on', c != null && b.dataset.ffv === c)); }
  function applyFF(v) {
    if (!TS.range || !TS.ed || !page.contains(TS.ed)) return;
    const spans = ensureSpans();
    spans.forEach(sp => {
      sp.querySelectorAll('[data-ff]').forEach(x => { x.removeAttribute('data-ff'); x.style.removeProperty('font-family'); if (!x.getAttribute('style')) x.removeAttribute('style'); });
      if (v) { sp.setAttribute('data-ff', v); sp.style.fontFamily = v + ', Tajawal, sans-serif'; }
      else { sp.removeAttribute('data-ff'); sp.style.removeProperty('font-family'); if (!sp.getAttribute('style')) sp.removeAttribute('style'); }
    });
    // whole text picked → the unit itself remembers the manual font too
    const ed = TS.ed; try { if (!v) autoAll(ed.parentElement); } catch (e) { }
    mark(); try { afterLayout(); } catch (e) { }
  }
  tbar.addEventListener('click', e => { const b = e.target.closest('[data-ffv]'); if (!b) return; e.stopPropagation(); applyFF(b.dataset.ffv); }, true);
  const _sync = syncTbar; syncTbar = function () { const r = _sync.apply(this, arguments); try { mark(); } catch (x) { } return r; };
  window.__fontsApi = { autoAll, autoOne, wants, applyFF };
})();
