/* ==========================================================================
   مصمم التواصل الداخلي · v2.1
   1) PNG export keeps the text weight (stroke) on every browser — when a browser
      drops -webkit-text-stroke inside the export, the same thickness is drawn
      with an even ring of text-shadows instead
   2) project tabs (up to 5 open at once, like Adobe) + copy / paste between them
   3) free artboard size: a switch on the stretch handle lets the page get
      shorter or longer than its content (the content is cut at the footer)
   4) presentation: the control bar never sits on the design
   ========================================================================== */
(function () {
  'use strict';
  const q = id => document.getElementById(id);
  const IC = (n, sw) => svgIcon(n, sw || 1.9);
  const say = m => { try { toast(m); } catch (e) { } };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const lx = () => window.__lxApi;
  const lxOn = () => !!(lx() && lx().state.on);
  const ESC = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* =====================================================================
     1) text weight survives the PNG export
     ===================================================================== */
  const H2I = window.htmlToImage;
  /* The browser's own export (SVG foreignObject) drops -webkit-text-stroke in Safari, and Safari also
     ignores the text-shadow fallback. So the weight is no longer left to the browser at all:
       pass 1 — the design exactly as is, with the stroke switched off
       pass 2 — only the weighted text, in its own colour, on a transparent layer
     then pass 2 is thickened on a plain canvas (the same way a stroke grows the letters) and laid
     over pass 1. Plain canvas drawing works the same in every browser. */
  if (H2I && typeof H2I.toCanvas === 'function') {
    const orig = {}; ['toPng', 'toJpeg', 'toBlob', 'toCanvas'].forEach(k => { if (typeof H2I[k] === 'function') orig[k] = H2I[k].bind(H2I); });
    const SAF = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
    let css = document.getElementById('v3InkCss');
    if (!css) { css = document.createElement('style'); css.id = 'v3InkCss'; document.head.appendChild(css); }
    css.textContent = `.v3ink,.v3ink *{color:transparent!important;-webkit-text-fill-color:transparent!important;background:none!important;background-color:transparent!important;border-color:transparent!important;box-shadow:none!important;text-shadow:none!important;outline:none!important;text-decoration-color:transparent!important;-webkit-text-stroke-width:0!important}
.v3ink img,.v3ink svg,.v3ink video,.v3ink canvas,.v3ink picture{opacity:0!important}
.v3ink *::before,.v3ink *::after{opacity:0!important;background:none!important;border-color:transparent!important;box-shadow:none!important}
.v3ink [data-v3ink]{color:var(--v3c)!important;-webkit-text-fill-color:var(--v3c)!important}`;
    function inked(node) {
      const out = []; const nr = node.getBoundingClientRect(); const s = (nr.width / (node.offsetWidth || nr.width)) || 1;
      [node, ...node.querySelectorAll('*')].forEach(el => {
        if (!(el instanceof Element)) return; const cs = getComputedStyle(el); const w = parseFloat(cs.webkitTextStrokeWidth) || 0; if (w <= 0.001) return;
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        let own = false; for (const n of el.childNodes) if (n.nodeType === 3 && n.data.trim()) { own = true; break; } if (!own) return;
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
        out.push({ el, w, col: cs.webkitTextStrokeColor || cs.color, fill: cs.color, x: (r.left - nr.left) / s, y: (r.top - nr.top) / s, wd: r.width / s, ht: r.height / s });
      });
      return out;
    }
    async function render(node, o) {
      o = Object.assign({}, o || {});
      const list = inked(node);
      if (!list.length) return orig.toCanvas(node, o);
      const all = [node, ...node.querySelectorAll('*')].filter(el => { const w = parseFloat(getComputedStyle(el).webkitTextStrokeWidth) || 0; return w > 0.001; });
      const keep = all.map(el => [el, el.style.getPropertyValue('-webkit-text-stroke-width'), el.style.getPropertyPriority('-webkit-text-stroke-width')]);
      const restore = () => keep.forEach(([el, v, p]) => { if (v) el.style.setProperty('-webkit-text-stroke-width', v, p); else el.style.removeProperty('-webkit-text-stroke-width'); });
      let base, ink;
      try {
        all.forEach(el => el.style.setProperty('-webkit-text-stroke-width', '0px', 'important'));
        base = await orig.toCanvas(node, o);
        // pass 2: only the weighted text
        list.forEach(it => { it.el.setAttribute('data-v3ink', ''); it.el.style.setProperty('--v3c', it.col); });
        node.classList.add('v3ink');
        const o2 = Object.assign({}, o); delete o2.backgroundColor;
        if (SAF) await orig.toCanvas(node, o2);   // Safari draws fonts on the second pass
        ink = await orig.toCanvas(node, o2);
      } finally {
        node.classList.remove('v3ink'); list.forEach(it => { it.el.removeAttribute('data-v3ink'); it.el.style.removeProperty('--v3c'); }); restore();
      }
      // thicken: the stroke grows each letter by half its width on every side
      const k = base.width / (o.width || node.offsetWidth || base.width);
      const g = base.getContext('2d');
      list.forEach(it => {
        const r = it.w * 0.45 * k; if (r < 0.15) return; const pad = Math.ceil(r) + 2;
        const sx = Math.max(0, Math.floor(it.x * k) - pad), sy = Math.max(0, Math.floor(it.y * k) - pad);
        const sw = Math.min(ink.width - sx, Math.ceil(it.wd * k) + pad * 2), sh = Math.min(ink.height - sy, Math.ceil(it.ht * k) + pad * 2); if (sw <= 0 || sh <= 0) return;
        const off = []; const rings = r > 1.5 ? [r, r * 0.66, r * 0.33] : [r, r * 0.5];
        rings.forEach(rr => { const n = Math.max(12, Math.ceil(Math.PI * 2 * rr * 1.5)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; off.push([Math.cos(a) * rr, Math.sin(a) * rr]); } });
        off.push([0, 0]);
        // grow on a scratch canvas first (so overlapping copies don't darken the edges twice over the photo), then lay it down once
        // keep only this text's own colour (anything else the browser still painted on this layer is dropped)
        const rgb = (String(it.col).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const src = document.createElement('canvas'); src.width = sw; src.height = sh; const sg = src.getContext('2d'); sg.drawImage(ink, sx, sy, sw, sh, 0, 0, sw, sh);
        if (rgb.length === 3) { const id = sg.getImageData(0, 0, sw, sh), d = id.data; for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; if (Math.abs(d[i] - rgb[0]) + Math.abs(d[i + 1] - rgb[1]) + Math.abs(d[i + 2] - rgb[2]) > 90) d[i + 3] = 0; else { d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; } } sg.putImageData(id, 0, 0); }
        const t = document.createElement('canvas'); t.width = sw + pad * 2; t.height = sh + pad * 2; const tg = t.getContext('2d');
        off.forEach(([dx, dy]) => tg.drawImage(src, pad + dx, pad + dy));
        g.drawImage(t, sx - pad, sy - pad);
      });
      return base;
    }
    H2I.toCanvas = (node, o) => render(node, o);
    H2I.toPng = async (node, o) => (await render(node, o)).toDataURL('image/png');
    H2I.toJpeg = async (node, o) => { const c = await render(node, o); return c.toDataURL('image/jpeg', (o && o.quality) || 0.95); };
    H2I.toBlob = async (node, o) => { const c = await render(node, o); return new Promise(r => c.toBlob(r, 'image/png')); };
    window.__v3render = render;
  }

  /* =====================================================================
     4) presentation: the bar keeps out of the design
     ===================================================================== */
  if (typeof layoutPresent === 'function') {
    const BAR = 96; // room kept free under the design for the bar
    layoutPresent = function () {
      const pPage = q('pPage'), pWrap = q('pWrap'); const vw = innerWidth, vh = innerHeight;
      const fixH = page.style.getPropertyValue('--abh'); pPage.style.height = fixH || '';
      pPage.classList.toggle('abfix', !!fixH);
      const H = pPage.offsetHeight;
      const s = pMode === 'fit' ? Math.min((vw - 60) / PW, (vh - 30 - BAR) / H) : Math.min((vw - 80) / PW, 2.2);
      pPage.style.transform = `scale(${s})`; pWrap.style.width = PW * s + 'px'; pWrap.style.height = H * s + 'px';
      pWrap.style.marginTop = pMode === 'fit' ? Math.max(24, (vh - BAR - H * s) / 2) + 'px' : '40px'; pWrap.style.marginBottom = BAR + 24 + 'px';
      document.querySelectorAll('#pBar [data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === pMode));
      barWake();
    };
    // the bar fades out while the mouse rests, and comes back on any move
    let idle = 0; const pres = q('present');
    function barWake() { if (!pres) return; pres.classList.remove('v3idle'); clearTimeout(idle); idle = setTimeout(() => { if (pres.classList.contains('on') && !pres.matches(':has(#pBar:hover)')) pres.classList.add('v3idle'); }, 2600); }
    if (pres) { pres.addEventListener('pointermove', barWake); pres.addEventListener('wheel', barWake, { passive: true }); pres.addEventListener('touchstart', barWake, { passive: true }); }
  }

  /* =====================================================================
     3) free artboard size (announcement)
     the fixed height lives inside the page as a tiny <style> marker, so undo,
     saving, files, «تصاميمي», previews and the layers screen all carry it
     ===================================================================== */
  const MK = 'style.abFix';
  const fixOf = root => { const m = (root || page).querySelector(':scope > ' + MK); return m ? +m.dataset.h || 0 : 0; };
  const fixCss = h => `:is(#page,#pPage,.abp-page,.libpg):has(> style.abFix[data-h="${h}"]){height:${h}px!important}:is(#page,#pPage,.abp-page,.libpg):has(> style.abFix[data-h="${h}"]) #blocks{flex:1 1 0!important;min-height:0!important;overflow:hidden!important;padding-bottom:0!important}`;
  function setFix(h) {
    let m = page.querySelector(':scope > ' + MK);
    if (!h) { if (m) m.remove(); page.style.removeProperty('--abh'); return; }
    h = Math.round(Math.max(300, Math.min(12000, h)));
    if (!m) { m = document.createElement('style'); m.className = 'abFix'; page.appendChild(m); }
    if (+m.dataset.h !== h) { m.dataset.h = h; m.textContent = fixCss(h); }
    page.style.setProperty('--abh', h + 'px');
  }
  function syncFix() { const h = fixOf(); if (h) page.style.setProperty('--abh', h + 'px'); else page.style.removeProperty('--abh'); updFree(); }
  if (typeof applyExtra === 'function') {
    const _ae = applyExtra; applyExtra = function () { syncFix(); return _ae.apply(this, arguments); };
    const _ps = posStretch; posStretch = function () { const r = _ps.apply(this, arguments); placeFree(); const h = fixOf(); if (h) { const l = q('hLbl'); if (l) l.textContent = `حجم حر · ${Math.round(page.offsetHeight)} × ${Math.round(PW)}`; } return r; };
  }
  const st = q('stretch');
  let fb = null;
  if (st) {
    // two ways to size the page: «تمديد عادي» (as before: only longer, follows the content) or «حجم حر» (any height, cuts the content)
    fb = document.createElement('div'); fb.id = 'abFree'; fb.setAttribute('role', 'group'); fb.setAttribute('aria-label', 'طريقة تغيير طول التصميم');
    st.after(fb);
    fb.addEventListener('pointerdown', e => e.stopPropagation());
    fb.addEventListener('click', e => {
      e.stopPropagation(); const b = e.target.closest('[data-m]'); if (!b) return; const want = b.dataset.m, h = fixOf();
      if (want === 'auto' && h) { const cur = page.offsetHeight; setFix(0); try { S.extra = 0; applyExtra(); const nat = page.offsetHeight; S.extra = Math.max(0, Math.round(cur - nat)); applyExtra(); afterLayout(); } catch (x) { } say('تمديد عادي: الطول يتبع المحتوى وتقدر تطوّله بالسحب'); }
      else if (want === 'free' && !h) { setFix(page.offsetHeight); try { S.extra = 0; } catch (x) { } say('حجم حر: اسحب الشريط تحت التصميم لفوق أو لتحت بحرية — اللي ينقص يتقص من تحت'); }
      else return;
      try { applyExtra(); snap(true); } catch (x) { }
    });
    // free drag (only while the switch is on); the normal drag stays as it was
    st.addEventListener('pointerdown', e => {
      if (!fixOf()) return; e.preventDefault(); e.stopImmediatePropagation();
      const y0 = e.clientY, h0 = page.offsetHeight;
      const mv = ev => { setFix(h0 + (ev.clientY - y0) / S.scale); try { posStretch(); } catch (x) { } };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); try { applyExtra(); snap(true); } catch (x) { } };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    }, true);
  }
  function placeFree() { if (!fb || !st) return; fb.style.top = st.style.top; }
  function updFree() { if (!fb) return; const on = !!fixOf(); fb.innerHTML = `<button type="button" data-m="auto" class="${on ? '' : 'on'}" title="مثل قبل: الطول يتبع المحتوى، والسحب يطوّل فقط">${IC('move-vertical', 2)}<span>تمديد عادي</span></button><button type="button" data-m="free" class="${on ? 'on' : ''}" title="طول ثابت تتحكم فيه بحرية — تطوّل أو تقصّر حتى لو قص المحتوى">${IC('crop', 2)}<span>حجم حر</span></button>`; }
  syncFix(); placeFree();
  new MutationObserver(() => syncFix()).observe(page, { childList: true });

  /* =====================================================================
     2a) copy / paste elements of an announcement (⌘C ⌘X ⌘V) — works across tabs
     ===================================================================== */
  const MARK = '⁣JEDCO-COPY:';
  const isTyping = t => t && t.closest && (t.closest('input,textarea,select,[contenteditable="true"],.ed') || (t.isContentEditable));
  const kindOf = el => {
    if (el.matches('#blocks > .blk')) return { k: 'blk', c: '#blocks' };
    if (el.matches('.htitles .ht')) return { k: 'ht', c: '.htitles' };
    if (el.matches('#free > .fi')) return { k: 'fi', c: '#free' };
    const p = el.parentElement; const cls = p && ['pillars', 'info', 'lst', 'steps', 'chipw'].find(c => p.classList.contains(c));
    return cls ? { k: 'child', c: '.' + cls } : null;
  };
  function boardHtml() {
    const pc = page.cloneNode(true); pc.querySelectorAll('[contenteditable]').forEach(x => x.removeAttribute('contenteditable')); pc.querySelectorAll('.selx,.hov,.tsel,.drop-hl').forEach(x => x.classList.remove('selx', 'hov', 'tsel', 'drop-hl')); pc.style.transform = ''; pc.style.boxShadow = 'none';
    const css = q('mainStyle') ? q('mainStyle').textContent : FONT_CSS;
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${css}</style><style>html,body{margin:0!important;height:auto!important;overflow:visible!important;background:#fff!important}#page{box-shadow:none!important}</style></head><body class="exporting">${pc.outerHTML}</body></html>`;
  }
  function writeMarker(txt) {
    const ae = document.activeElement; const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { } ta.remove(); try { ae && ae.focus && ae.focus({ preventScroll: true }); } catch (e) { }
    if (!ok && navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => { });
  }
  function annCopy(cut) {
    const els = MS.sel.filter(el => page.contains(el) && el.id !== 'sender' && !el.classList.contains('wp'));
    const items = []; els.forEach(el => { const k = kindOf(el); if (!k) return; const c = el.cloneNode(true); [c, ...c.querySelectorAll('*')].forEach(x => x.classList.remove('selx', 'hov', 'tsel', 'drop-hl')); items.push({ k: k.k, c: k.c, html: c.outerHTML, grp: el.dataset.grp || '' }); });
    if (!items.length) { say('هذا العنصر ثابت في القالب وما ينسخ'); return; }
    const pr = page.getBoundingClientRect(), sc = S.scale || 1;
    const rects = els.map(el => { const r = el.getBoundingClientRect(); return { x: (r.left - pr.left) / sc, y: (r.top - pr.top) / sc, w: r.width / sc, h: r.height / sc }; });
    const id = Date.now().toString(36);
    window.__annClip = { marker: MARK + id, items, board: { html: boardHtml(), rects }, from: T.curId() + ':' + S.active, n: 0 };
    writeMarker(window.__annClip.marker);
    if (cut) { try { msDel(); } catch (e) { } say(items.length > 1 ? `تم قص ${items.length} عناصر` : 'تم القص'); }
    else say(items.length > 1 ? `تم نسخ ${items.length} عناصر — الصقها في أي مشروع مفتوح ${KB('V')}` : `تم النسخ — الصقه في أي مشروع مفتوح ${KB('V')}`);
  }
  function annPaste() {
    const c = window.__annClip; if (!c || !c.items.length) return false;
    try { msBegin(); } catch (e) { }
    const same = c.from === T.curId() + ':' + S.active; c.n = (c.n || 0) + 1; const off = same ? 16 * c.n : 0;
    const selTop = MS.sel.length ? MS.sel.map(el => el.matches('#blocks > .blk') ? el : el.closest('#blocks > .blk')).filter(Boolean).pop() : null;
    let afterBlk = selTop || null; const gm = {}; const out = []; let skipped = 0;
    c.items.forEach(it => {
      const t = document.createElement('template'); t.innerHTML = it.html; const el = t.content.firstElementChild; if (!el) return;
      el.querySelectorAll('[data-grp]').forEach(x => x.removeAttribute('data-grp'));
      if (it.grp) el.dataset.grp = gm[it.grp] || (gm[it.grp] = newGid()); else el.removeAttribute('data-grp');
      if (it.k === 'blk') { const box = page.querySelector('#blocks'); if (!box) { skipped++; return; } if (afterBlk && box.contains(afterBlk)) afterBlk.after(el); else box.appendChild(el); afterBlk = el; }
      else if (it.k === 'ht') { const box = page.querySelector('.htitles'); if (!box) { skipped++; return; } box.appendChild(el); if (off) moveBy(el, off, off); }
      else if (it.k === 'fi') { const box = page.querySelector('#free'); if (!box) { skipped++; return; } box.appendChild(el); if (off) moveBy(el, off, off); }
      else { const near = MS.sel.map(s => s.closest(it.c) || (s.matches(it.c) ? s : null) || s.querySelector(it.c)).filter(Boolean)[0]; const box = near || page.querySelector(it.c); if (!box) { skipped++; return; } box.appendChild(el); }
      out.push(el);
    });
    if (!out.length) { say('ما فيه مكان مناسب لهذا العنصر في هذا الإعلان'); return true; }
    try { cleanGroups(); MS.gIn = null; desel0(); MS.sel = msNorm(out); renderDynamic(); msCommitLayout(); } catch (e) { console.warn(e); }
    say(skipped ? `تم اللصق (${out.length}) — ${skipped} ما لقى له مكان في هذا الإعلان` : (out.length > 1 ? `تم لصق ${out.length} عناصر` : 'تم اللصق'));
    return true;
  }
  window.addEventListener('keydown', e => {
    if (lxOn() || !(e.ctrlKey || e.metaKey) || e.altKey || document.body.classList.contains('phone')) return;
    const k = e.code; if (k !== 'KeyC' && k !== 'KeyX') return;
    if (isTyping(e.target) || (q('v2Start') && q('v2Start').classList.contains('on'))) return;
    const sel = getSelection(); if (sel && !sel.isCollapsed && String(sel).trim()) return;   // real text selected: normal copy
    if (!MS.sel.length) return;
    e.preventDefault(); e.stopImmediatePropagation(); annCopy(k === 'KeyX');
  }, true);
  window.addEventListener('paste', e => {
    if (lxOn() || document.body.classList.contains('phone')) return;
    if (isTyping(e.target)) return;
    const c = window.__annClip; if (!c) return; const t = e.clipboardData && e.clipboardData.getData('text/plain');
    if (t !== c.marker) return; e.preventDefault(); e.stopImmediatePropagation(); annPaste();
  }, true);
  // right-click menu: copy / paste
  const sm = q('selmenu');
  if (typeof scaler !== 'undefined' && sm) {
    scaler.addEventListener('contextmenu', () => { if (!sm.classList.contains('on')) return; const has = !!window.__annClip; const can = MS.sel.length > 0; sm.insertAdjacentHTML('afterbegin', `<button data-v3="copy"${can ? '' : ' disabled'}><span>نسخ</span><kbd>${KB('C')}</kbd></button><button data-v3="paste"${has ? '' : ' disabled'}><span>لصق</span><kbd>${KB('V')}</kbd></button><hr>`); sm.style.top = Math.max(8, Math.min(innerHeight - sm.offsetHeight - 8, parseFloat(sm.style.top) || 0)) + 'px'; });
    sm.addEventListener('click', e => { const b = e.target.closest('[data-v3]'); if (!b || b.disabled) return; sm.classList.remove('on'); if (b.dataset.v3 === 'copy') annCopy(false); else annPaste(); });
  }

  /* =====================================================================
     2b) project tabs — up to 5 projects open, switch freely like Adobe
     every tab keeps its own announcement (all boards + undo) and its own
     layers design; switching never loses work
     ===================================================================== */
  const MAX = 5;
  const TDB = { open() { return this.p || (this.p = new Promise(r => { try { const o = indexedDB.open('jedIC2_tabs', 1); o.onupgradeneeded = () => o.result.createObjectStore('s'); o.onsuccess = () => r(o.result); o.onerror = () => r(null); } catch (e) { r(null); } })); },
    async get() { const db = await this.open(); if (!db) return null; return new Promise(r => { const t = db.transaction('s').objectStore('s').get('tabs'); t.onsuccess = () => r(t.result || null); t.onerror = () => r(null); }); },
    async put(v) { const db = await this.open(); if (!db) return; return new Promise(r => { const t = db.transaction('s', 'readwrite'); t.objectStore('s').put(v, 'tabs'); t.oncomplete = r; t.onerror = r; }); } };
  const tid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const T = { tabs: [{ id: tid(), title: '', kind: 'ann', snap: null }], cur: 0, busy: false, curId() { return (this.tabs[this.cur] || {}).id || ''; } };
  window.__tabs = T;
  const startOn = () => !!(q('v2Start') && q('v2Start').classList.contains('on'));
  function liveTitle() {
    if (lxOn()) { const d = lx().state.doc; return (d && d.name) || 'تصميم بالطبقات'; }
    if (startOn() && T.tabs[T.cur] && T.tabs[T.cur].fresh) return 'مشروع جديد';
    const t = (page.querySelector('.htitles .t1') || {}).textContent || (page.querySelector('.htitles .t3') || {}).textContent || '';
    let first = ''; try { first = (S.docs.map((d, i) => i === S.active ? '' : titleOf(d.html || '')).find(x => x && x.trim()) || '').trim(); } catch (e) { }
    return t.trim() || first || (S.docs.length > 1 ? `${S.docs.length} إعلانات` : 'إعلان بدون عنوان');
  }
  async function snapLive() {
    const tab = T.tabs[T.cur]; if (!tab) return;
    let lxs = null;
    if (lxOn()) { const id = await lx().saveNow(); const L = lx().state; lxs = { libId: id, hist: L.hist, hi: L.hi }; }
    commitActive();
    let dirty = false; try { dirty = libDirty() && !(tab.fresh); } catch (e) { }
    tab.snap = { docs: S.docs.map(d => Object.assign({}, d)), active: S.active, libId: S.libId || null, savedSig: S.savedSig || '', scroll: stage.scrollTop, start: startOn(), lx: lxs };
    tab.kind = lxs ? 'lx' : 'ann'; tab.title = liveTitle(); tab.dirty = dirty && !lxs;
  }
  async function loadSnap(sn) {
    if (!sn) return;
    if (!sn.lx && lxOn()) await lx().exitLX({ quiet: true });
    S.docs = sn.docs.map(d => Object.assign({}, d)); S.active = -1; activate(Math.max(0, Math.min(sn.active || 0, S.docs.length - 1)), true);
    S.libId = sn.libId || null; S.savedSig = sn.savedSig || ''; try { store('libId', S.libId || ''); store('savedSig', S.savedSig); } catch (e) { }
    renderStack(); try { updDirtyDot(); } catch (e) { }
    requestAnimationFrame(() => { stage.scrollTop = sn.scroll || 0; });
    if (sn.lx && sn.lx.libId) { const ok = await lx().openLib(sn.lx.libId, { hist: sn.lx.hist, hi: sn.lx.hi }); if (!ok) say('ما لقيت تصميم الطبقات لهذا التبويب'); }
    if (sn.start) window.v2Start.show(); else window.v2Start.hide();
  }
  const busyNow = () => T.busy || (q('busy') && q('busy').style.display === 'flex') || (q('lxBusy') && q('lxBusy').classList.contains('on'));
  async function go(i) {
    if (i === T.cur || !T.tabs[i] || busyNow()) return; T.busy = true; paint();
    try { if (lxOn()) { try { lx().state.editing && document.activeElement && document.activeElement.blur(); } catch (e) { } } await snapLive(); const sn = T.tabs[i].snap; T.cur = i; await loadSnap(sn); T.tabs[i].snap = null; T.tabs[i].dirty = false; }
    catch (e) { console.error(e); say('تعذّر التبديل بين المشاريع'); }
    T.busy = false; paint(); persist();
  }
  async function blankLive() {
    if (lxOn()) await lx().exitLX({ quiet: true });
    const st = q('v2Start'); st._quiet = true;
    try { S.photoSrc = ASSETS.header; loadWorkspace([{ html: docBlank(), photo: ASSETS.header, extra: 0 }], null); S.libId = null; try { libMark(); } catch (e) { } } finally { st._quiet = false; }
  }
  async function add() {
    if (busyNow()) return;
    if (T.tabs.length >= MAX) { say(`الحد الأقصى ${MAX} مشاريع مفتوحة — سكّر واحد عشان تفتح جديد`); return; }
    T.busy = true;
    try { await snapLive(); T.tabs.push({ id: tid(), title: 'مشروع جديد', kind: 'ann', snap: null, fresh: true }); T.cur = T.tabs.length - 1; await blankLive(); window.v2Start.show(); }
    catch (e) { console.error(e); say('تعذّر فتح تبويب جديد'); }
    T.busy = false; paint(); persist();
  }
  async function close(i) {
    if (busyNow()) return;
    if (i !== T.cur) await go(i); if (T.cur !== i) return;
    const tab = T.tabs[i];
    const drop = async () => {
      T.busy = true;
      try {
        T.tabs.splice(i, 1);
        if (!T.tabs.length) { T.tabs.push({ id: tid(), title: 'مشروع جديد', kind: 'ann', snap: null, fresh: true }); T.cur = 0; await blankLive(); window.v2Start.show(); }
        else { T.cur = Math.min(i, T.tabs.length - 1); const sn = T.tabs[T.cur].snap; await loadSnap(sn); T.tabs[T.cur].snap = null; T.tabs[T.cur].dirty = false; }
      } catch (e) { console.error(e); }
      T.busy = false; paint(); persist();
    };
    if (lxOn()) { await lx().saveNow(); }
    let pristine = false; try { const t = [docBlank(), docSample(), docWelcome()].map(h => String(h).replace(/\s+/g, '').replace(/contenteditable="[^"]*"/g, '')); commitActive(); pristine = S.docs.every(d => t.includes(String(d.html).replace(/\s+/g, '').replace(/contenteditable="[^"]*"/g, ''))); } catch (e) { }
    if (tab.fresh || pristine || lxOn()) return drop();
    askSave(drop);
  }
  /* ---- the strip ---- */
  const bar = document.createElement('div'); bar.id = 'v3Tabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'المشاريع المفتوحة');
  document.body.appendChild(bar); document.body.classList.add('v3tabs');
  function paint() {
    const live = T.tabs[T.cur]; if (live) { live.title = liveTitle(); live.kind = lxOn() ? 'lx' : 'ann'; }
    document.body.classList.toggle('v3fresh', !!(live && live.fresh));
    bar.innerHTML = `<div class="v3tl">${T.tabs.map((t, i) => `<div class="v3t${i === T.cur ? ' on' : ''}" role="tab" aria-selected="${i === T.cur}" data-i="${i}" title="${ESC(t.title)}">${IC(t.kind === 'lx' ? 'layers' : 'megaphone', 1.9)}<span class="v3n">${ESC(t.title || 'مشروع')}</span>${t.dirty && i !== T.cur ? '<i class="v3d" title="فيه تعديلات ما انحفظت في «إعلاناتي»"></i>' : ''}<button class="v3x" data-x="${i}" title="إغلاق المشروع" aria-label="إغلاق">${IC('x', 2.2)}</button></div>`).join('')}</div>
      <button class="v3add" data-add title="${T.tabs.length >= MAX ? `الحد الأقصى ${MAX} مشاريع` : 'فتح مشروع جديد في تبويب جديد'}"${T.tabs.length >= MAX ? ' disabled' : ''}>${IC('plus', 2.2)}</button><span class="v3c">${T.tabs.length} / ${MAX}</span>`;
  }
  bar.addEventListener('click', e => {
    const x = e.target.closest('[data-x]'); if (x) { e.stopPropagation(); close(+x.dataset.x); return; }
    if (e.target.closest('[data-add]')) { if (T.tabs.length >= MAX) say(`الحد الأقصى ${MAX} مشاريع مفتوحة — سكّر واحد عشان تفتح جديد`); else add(); return; }
    const t = e.target.closest('.v3t'); if (t) go(+t.dataset.i);
  });
  bar.addEventListener('auxclick', e => { const t = e.target.closest('.v3t'); if (t && e.button === 1) { e.preventDefault(); close(+t.dataset.i); } });
  // keep the live tab's name fresh
  let rt = 0; const refresh = () => { clearTimeout(rt); rt = setTimeout(() => { if (!T.busy) { const t = T.tabs[T.cur]; if (t && t.fresh && !startOn()) t.fresh = false; paint(); } }, 500); };
  document.addEventListener('keyup', refresh, true); document.addEventListener('pointerup', refresh, true);
  new MutationObserver(refresh).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const vs = q('v2Start'); if (vs) new MutationObserver(refresh).observe(vs, { attributes: true, attributeFilter: ['class'] });
  /* ---- kept on this device: the tabs come back after a reload ---- */
  let pt = 0;
  function persist() { clearTimeout(pt); pt = setTimeout(() => { const v = { cur: T.cur, tabs: T.tabs.map((t, i) => ({ id: t.id, title: t.title, kind: t.kind, dirty: !!t.dirty, fresh: !!t.fresh, snap: i === T.cur || !t.snap ? null : Object.assign({}, t.snap, { docs: t.snap.docs.map(d => ({ html: d.html, photo: d.photo, extra: d.extra || 0 })), lx: t.snap.lx ? { libId: t.snap.lx.libId } : null }) })) }; TDB.put(v).catch(() => { }); }, 300); }
  addEventListener('pagehide', () => { clearTimeout(pt); const t = T.tabs[T.cur]; if (t) t.title = liveTitle(); persist(); });
  TDB.get().then(v => {
    if (v && Array.isArray(v.tabs) && v.tabs.length > 1 && v.tabs.every(t => t.id)) {
      T.tabs = v.tabs.slice(0, MAX).map(t => Object.assign({}, t)); T.cur = Math.max(0, Math.min(v.cur || 0, T.tabs.length - 1));
      // a closed-down tab that has no stored state cannot be restored
      T.tabs = T.tabs.filter((t, i) => i === T.cur || t.snap); T.cur = Math.max(0, T.tabs.findIndex(t => t.id === v.tabs[v.cur || 0].id)); T.tabs[T.cur].snap = null;
    }
    paint();
  }).catch(() => paint());
  paint();
  window.v3Tabs = { go, add, close, paint, snapLive, T };
})();
