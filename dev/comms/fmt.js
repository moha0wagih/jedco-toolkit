/* ==========================================================================
   مصمم التواصل الداخلي · ناسخ التنسيق (format painter) for the announcement editor
   · pick a text (or select words, or a whole card) → the brush → click another text:
     size, weight, thickness, colour and line spacing land on it exactly
   · icons: the brush carries the colour (icon → icon, text colour → icon and back)
   · one click = once · double click = stays on until Esc · ⌘/Ctrl + Alt + C / V copy & paste the look
   (the layers studio has its own painter; this one only works while it is closed)
   ========================================================================== */
(function () {
  'use strict';
  if (typeof page === 'undefined' || typeof MS === 'undefined') return;
  const MACK = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const KC = MACK ? '⌘⌥C' : 'Ctrl+Alt+C', KV = MACK ? '⌘⌥V' : 'Ctrl+Alt+V';
  const lxOn = () => !!(window.__LX && window.__LX.on);
  const pxv = v => parseFloat(v) || 0;
  const AR_RE = /[؀-ۿ]/;
  const F = window.FMT = { on: false, sticky: false, look: null, clip: null };
  const ICON_SEL = '.slot, .fi, .ii';
  const CARDY = ['pcard', 'scard', 'lst', 'pbox'];

  /* ---------- reading a look ---------- */
  function textNodes(root) {
    const out = []; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('.ii') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    while (w.nextNode()) if (w.currentNode.data.trim()) out.push(w.currentNode);
    return out;
  }
  function dirOf(ed) { const t = ed.textContent || ''; const a = (t.match(/[؀-ۿ]/g) || []).length, l = (t.match(/[A-Za-z]/g) || []).length; if (a || l) return a >= l ? 'rtl' : 'ltr'; return getComputedStyle(ed).direction === 'ltr' ? 'ltr' : 'rtl'; }
  function textLook(ed, node) {
    const n = node || textNodes(ed)[0]; const el = n ? n.parentElement : ed; const cs = getComputedStyle(el);
    const fs = pxv(cs.fontSize); const sp = el.closest('.fs'); const blk = (n ? n.parentElement.closest('p') : null) || ed;
    let lh = null; if (blk.dataset.lh) lh = +blk.dataset.lh; else if (cs.lineHeight !== 'normal') { const bl = pxv(getComputedStyle(blk).lineHeight); if (bl) lh = +(bl / maxFont(blk)).toFixed(2); }
    return { dir: ed.closest && ed.matches('.ed') ? dirOf(ed) : (AR_RE.test(n ? n.data : '') ? 'rtl' : 'ltr'), fs, fw: cs.fontWeight, col: cs.color, w: sp && sp.dataset.w ? +sp.dataset.w : 0, lh, hasLh: !!blk.dataset.lh };
  }
  function iconCol(el) {
    const slot = el.closest('.slot');
    if (slot) { const t = slotCtxTarget(slot); if (CARDY.some(c => t.classList.contains(c))) { const v = getComputedStyle(t).getPropertyValue('--c').trim(); if (v) return v; } return getComputedStyle(t).color; }
    return getComputedStyle(el).color;
  }
  const roleOf = ed => [...ed.classList].filter(c => !/^(ar|en|ed|selx|hov|tsel)$/.test(c)).sort().join('.');
  function lookFrom(src, node) {
    const look = { texts: [], col: null, icon: null };
    if (src.matches && src.matches('.ed')) {
      look.texts.push(textLook(src, node));
      // its partner in the other language (same kind of text in the same element) travels with it
      const u = unitAt(src); const d0 = look.texts[0].dir, r0 = roleOf(src);
      const mate = u && [...u.querySelectorAll('.ed')].find(e => e !== src && roleOf(e) === r0 && dirOf(e) !== d0 && textNodes(e).length);
      if (mate) look.texts.push(textLook(mate));
    }
    else {
      const eds = src.querySelectorAll ? [...src.querySelectorAll('.ed')] : []; eds.forEach(ed => { if (textNodes(ed).length && !look.texts.some(t => t.dir === dirOf(ed))) look.texts.push(textLook(ed)); });
      const ic = src.matches && src.matches(ICON_SEL) ? src : src.querySelector && src.querySelector(ICON_SEL); if (ic) look.icon = { col: iconCol(ic) };
    }
    look.col = look.texts.length ? look.texts[0].col : look.icon ? look.icon.col : null;
    return (look.texts.length || look.col) ? look : null;
  }
  // what the user means right now: selected words, the text being typed in, or the selected element
  function currentSource() {
    if (tbar.classList.contains('on') && TS.ed && TS.range) { const n = selectedTextNodesPeek(TS.range, TS.ed)[0]; return { el: TS.ed, node: n }; }
    const ed = editingEd(); if (ed) { const s = getSelection(); const n = s.rangeCount && s.anchorNode && s.anchorNode.nodeType === 3 && ed.contains(s.anchorNode) && s.anchorNode.data.trim() ? s.anchorNode : null; return { el: ed, node: n }; }
    if (MS.sel.length === 1) { const le = F.lastEd; const ok = le && le.isConnected && MS.sel[0].contains(le) && (le.matches(ICON_SEL) || textNodes(le).length); return { el: ok ? le : MS.sel[0] }; }
    if (S.sel && S.sel.el && page.contains(S.sel.el)) return { el: S.sel.el };
    return null;
  }

  /* ---------- landing a look ---------- */
  function unwrapEl(n) { const p = n.parentNode; while (n.firstChild) p.insertBefore(n.firstChild, n); n.remove(); }
  function applyText(ed, look) {
    const k = look.texts.find(t => t.dir === dirOf(ed)) || look.texts[0];
    if (!k) { if (look.col) { ed.style.color = look.col; ed.querySelectorAll('[style]').forEach(x => { if (!x.closest('.ii')) x.style.removeProperty('color'); }); return true; } return false; }
    // clean slate: the old size / bold / colour of the words go, the text itself stays
    ed.querySelectorAll('.fs, b, strong').forEach(x => { if (!x.closest('.ii')) unwrapEl(x); });
    ed.querySelectorAll('[style]').forEach(x => { if (x.closest('.ii')) return; ['font-size', 'font-weight', 'color', '-webkit-text-stroke', 'line-height'].forEach(p => x.style.removeProperty(p)); if (!x.getAttribute('style')) x.removeAttribute('style'); });
    ed.normalize();
    ed.style.color = k.col;
    const cs = getComputedStyle(ed), base = pxv(cs.fontSize), bw = cs.fontWeight;
    const needSize = Math.abs(k.fs - base) > .2, needW = String(k.fw) !== String(bw);
    const tn = textNodes(ed);
    // an empty text (still showing its hint) carries the look itself, so what gets typed later already has it
    if (!tn.length) { ['font-size', 'font-weight', '-webkit-text-stroke'].forEach(p => ed.style.removeProperty(p)); const c2 = getComputedStyle(ed); if (Math.abs(k.fs - pxv(c2.fontSize)) > .2) ed.style.fontSize = k.fs.toFixed(2) + 'px'; if (String(k.fw) !== String(c2.fontWeight)) ed.style.fontWeight = k.fw; }
    if (needSize || needW || k.w > 0) tn.forEach(t => {
      const sp = document.createElement('span'); sp.className = 'fs'; sp.dataset.k = (k.fs / base).toFixed(2);
      if (needSize) sp.style.fontSize = k.fs.toFixed(2) + 'px';
      if (needW) sp.style.fontWeight = k.fw;
      if (k.w > 0) { sp.style.setProperty('-webkit-text-stroke', k.w.toFixed(2) + 'px currentColor'); sp.dataset.w = k.w.toFixed(2); }
      t.parentNode.insertBefore(sp, t); sp.appendChild(t);
    });
    const ps = [...ed.querySelectorAll(':scope > p')]; const tg = ps.length ? ps : [ed];
    tg.forEach(t => { if (k.lh && k.hasLh) { t.dataset.lh = k.lh.toFixed(2); t.style.lineHeight = (k.lh * maxFont(t)).toFixed(2) + 'px'; } else if (k.lh) { delete t.dataset.lh; t.style.lineHeight = (k.lh * maxFont(t)).toFixed(2) + 'px'; } else { delete t.dataset.lh; t.style.removeProperty('line-height'); } });
    return true;
  }
  function applyIcon(el, col) {
    if (!col) return false; col = /^rgb/.test(col) ? rgb2hex(col).toUpperCase() : col;
    const slot = el.closest('.slot');
    if (slot) { const t = slotCtxTarget(slot); if (CARDY.some(c => t.classList.contains(c))) t.style.setProperty('--c', col); else t.style.color = col; return true; }
    el.style.color = col; return true;
  }
  function applyTo(t, look) {
    const ed = edOf(t); if (ed) return applyText(ed, look);
    const ic = t.closest && t.closest(ICON_SEL); if (ic && page.contains(ic)) return applyIcon(ic, look.icon ? look.icon.col : look.col);
    const u = unitAt(t); if (!u) return false;
    let n = 0; u.querySelectorAll('.ed').forEach(e => { if (applyText(e, look)) n++; });
    if (look.icon) u.querySelectorAll(ICON_SEL).forEach(i => { if (applyIcon(i, look.icon.col)) n++; });
    if (u.matches('.ed')) n += applyText(u, look) ? 1 : 0;
    return n > 0;
  }

  /* ---------- the brush ---------- */
  function brushCursor() { if (document.documentElement.style.getPropertyValue('--fmtBrush')) return; try { const inner = svgIcon('paintbrush', 2).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#fff" stroke-width="5">${inner}</g><g stroke="#002657" stroke-width="2">${inner}</g></svg>`; document.documentElement.style.setProperty('--fmtBrush', `url("data:image/svg+xml,${encodeURIComponent(svg)}") 3 21, copy`); } catch (x) { } }
  const chip = document.createElement('div'); chip.id = 'fmtChip'; chip.innerHTML = `${svgIcon('paintbrush', 2)}<span></span><button type="button" title="إيقاف (Esc)">${svgIcon('x', 2.2)}</button>`; document.body.appendChild(chip);
  chip.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (e.target.closest('button')) stop(); });
  function sync() { brushCursor(); chip.classList.toggle('on', F.on && !lxOn()); chip.querySelector('span').textContent = F.sticky ? 'ناسخ التنسيق شغّال — اضغط على النصوص أو الأيقونات · Esc للإيقاف' : 'اضغط على النص أو الأيقونة اللي تبي تنسخ لها التنسيق · Esc للإلغاء'; document.body.classList.toggle('fmt-painting', F.on); document.querySelectorAll('[data-ms="paint"], #tbar [data-t="paint"]').forEach(b => { b.classList.toggle('on', F.on); b.classList.toggle('sticky', F.on && F.sticky); }); }
  function start(sticky) {
    if (F.on && sticky) { F.sticky = true; sync(); toast('ناسخ التنسيق شغّال: اضغط على كل نص أو أيقونة تبي تطبّق عليها — Esc للإيقاف'); return; }
    const src = currentSource(); const look = src && lookFrom(src.el, src.node);
    if (!look) { toast('حدد النص أو الأيقونة اللي تبي تنسخ تنسيقها أول، بعدين اضغط الفرشاة'); return; }
    F.look = look; F.on = true; F.sticky = !!sticky; hideTbar();
    const ae = document.activeElement; if (ae && page.contains(ae) && ae.blur) ae.blur(); getSelection().removeAllRanges();
    sync(); toast(sticky ? 'ناسخ التنسيق شغّال: اضغط على كل نص أو أيقونة تبي تطبّق عليها — Esc للإيقاف' : 'اضغط على النص أو الأيقونة اللي تبي تنسخ لها التنسيق');
  }
  function stop() { if (!F.on) return; F.on = false; F.sticky = false; sync(); }
  F.start = start; F.stop = stop;
  { const _ds = deselect; deselect = function () { if (F.on) stop(); return _ds.apply(this, arguments); }; }
  function toggle(e) { if (e && e.detail >= 2) { start(true); return; } if (F.on) stop(); else start(false); }

  // while the brush is on, a click on the design paints instead of selecting / typing
  let eatClick = false;
  window.addEventListener('pointerdown', e => {
    if (!F.on && page.contains(e.target)) { const ed = edOf(e.target); const ic = e.target.closest(ICON_SEL); F.lastEd = ed || (ic && page.contains(ic) ? ic : null); }
    if (!F.on || lxOn()) return;
    if (e.target.closest && e.target.closest('#selbar, #tbar, [data-ms="paint"]')) return;
    if (!page.contains(e.target)) { if (e.target.closest && e.target.closest('#stage')) stop(); return; }
    e.preventDefault(); e.stopImmediatePropagation(); eatClick = true;
    const ok = applyTo(e.target, F.look);
    if (!F.sticky) stop();
    if (ok) { afterLayout(); toast('تم نسخ التنسيق ✓'); } else toast('هذا المكان ما فيه نص أو أيقونة');
  }, true);
  window.addEventListener('click', e => { if (eatClick) { eatClick = false; if (page.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); } } }, true);
  window.addEventListener('mousedown', e => { if (F.on && !lxOn() && page.contains(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);

  /* ---------- copy / paste the look with the keyboard ---------- */
  function copyLook() { const src = currentSource(); const look = src && lookFrom(src.el, src.node); if (!look) { toast('حدد نص أو أيقونة أول'); return; } F.clip = look; try { localStorage.setItem('jedFMT_look', JSON.stringify(look)); } catch (x) { } toast(`نسخت التنسيق — حدد نص ثاني واضغط ${KV}`); }
  function pasteLook() {
    let look = F.clip; if (!look) { try { look = JSON.parse(localStorage.getItem('jedFMT_look') || 'null'); } catch (x) { } }
    if (!look) { toast(`انسخ تنسيق أول: ${KC}`); return; }
    const ed = editingEd(); let n = 0;
    if (ed) n = applyText(ed, look) ? 1 : 0;
    else MS.sel.forEach(u => { if (u.matches('.ed')) { n += applyText(u, look) ? 1 : 0; return; } u.querySelectorAll('.ed').forEach(e => { n += applyText(e, look) ? 1 : 0; }); if (u.matches(ICON_SEL)) n += applyIcon(u, look.icon ? look.icon.col : look.col) ? 1 : 0; else if (look.icon) u.querySelectorAll(ICON_SEL).forEach(i => { n += applyIcon(i, look.icon.col) ? 1 : 0; }); });
    if (!n) { toast('حدد النص اللي تبي تلصق عليه التنسيق'); return; }
    afterLayout(); toast('تم لصق التنسيق ✓');
  }
  F.copyLook = copyLook; F.pasteLook = pasteLook;
  window.addEventListener('keydown', e => {
    if (lxOn() || !(e.ctrlKey || e.metaKey) || !e.altKey) { if (e.key === 'Escape' && F.on && !lxOn()) { e.preventDefault(); e.stopImmediatePropagation(); stop(); toast('وقّفت ناسخ التنسيق'); } return; }
    if (e.target.matches && e.target.matches('input,textarea,select')) return;
    if (e.code === 'KeyC') { e.preventDefault(); e.stopImmediatePropagation(); copyLook(); }
    else if (e.code === 'KeyV') { e.preventDefault(); e.stopImmediatePropagation(); pasteLook(); }
  }, true);

  /* ---------- buttons: the floating bar of a selection + the bar of selected words ---------- */
  const BRUSH_T = `ناسخ التنسيق — كليك: مرة وحدة · دبل كليك: يظل شغّال لين Esc · ${KC} / ${KV}`;
  const _msBar = msBar;
  msBar = function () {
    _msBar.apply(this, arguments);
    if (!selbar.classList.contains('on') || MS.sel.length !== 1) return;
    const u = MS.sel[0]; if (!(u.matches('.ed') || u.querySelector('.ed') || u.matches(ICON_SEL) || u.querySelector(ICON_SEL))) return;
    if (selbar.querySelector('[data-ms="paint"]')) return;
    const w0 = selbar.offsetWidth;
    const b = document.createElement('button'); b.dataset.ms = 'paint'; b.title = BRUSH_T; b.innerHTML = svgIcon('paintbrush', 2) + '<span>ناسخ التنسيق</span>';
    b.classList.toggle('on', F.on); b.classList.toggle('sticky', F.on && F.sticky);
    selbar.prepend(b); if (selbar.children.length > 1) b.insertAdjacentHTML('afterend', '<i class="mss"></i>');
    const w = selbar.offsetWidth, st = stage.getBoundingClientRect(), x = (parseFloat(selbar.style.left) || 0) - (w - w0) / 2; selbar.style.left = Math.max(st.left + 6, Math.min(st.right - w - 6, x)) + 'px';
  };
  selbar.addEventListener('click', e => { const b = e.target.closest('[data-ms="paint"]'); if (b) toggle(e); });
  { const row = tbar.querySelector('.tr'); if (row) { row.insertAdjacentHTML('beforeend', `<span class="tsep"></span><button data-t="paint" title="${BRUSH_T}">${svgIcon('paintbrush', 2.2)}</button>`); } }
  tbar.addEventListener('click', e => { const b = e.target.closest('[data-t="paint"]'); if (b) { e.stopPropagation(); toggle(e); } }, true);
  // leaving for the layers studio / another board: the brush goes away
  document.addEventListener('click', e => { if (F.on && e.target.closest && e.target.closest('#bLayers, .abHead, #fileMenu, #v2Start')) stop(); }, true);
})();
