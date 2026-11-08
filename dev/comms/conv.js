/* ==========================================================================
   مصمم التواصل الداخلي · build 34 — تغيير نوع العنصر بضغطة
   Any text element (text, heading, cards, card section, list, steps, tagline,
   greeting) turns into any other one. The words, icons and colour travel with it.
   ========================================================================== */
(function () {
  'use strict';
  const KINDS = [
    ['text', 'نص عادي', 'align-justify'],
    ['heading', 'عنوان فرعي', 'heading'],
    ['pillars', 'بطاقات', 'layout-grid'],
    ['card', 'قسم في بطاقة', 'panels-top-left'],
    ['list', 'قائمة نقاط', 'list-checks'],
    ['path', 'خطوات', 'route'],
    ['tagline', 'جملة مميزة', 'quote'],
    ['greet', 'تحية', 'hand'],
  ];
  const CONVERTIBLE = new Set(KINDS.map(k => k[0]));
  const COLORS = ['#009CA5', '#183990', '#FC5C17', '#004EAA', '#62B6F3', '#2FC0C7', '#002657'];
  const $q = (s, r) => (r || document).querySelector(s), $qa = (s, r) => [...(r || document).querySelectorAll(s)];
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  const htm = el => el ? el.innerHTML.trim() : '';
  const icOf = el => { const s = el && el.querySelector('[data-icon]'); return s ? s.dataset.icon : ''; };
  const paraUnits = (arBox, enBox) => {   // paragraphs of a two-column body, paired by order
    const ps = box => box ? ($qa(':scope > p, :scope > div', box).length ? $qa(':scope > p, :scope > div', box) : [box]).filter(p => txt(p) || p.querySelector('.ii')) : [];
    const a = ps(arBox), e = ps(enBox), n = Math.max(a.length, e.length), out = [];
    for (let i = 0; i < n; i++) out.push({ ar: txt(a[i]), en: txt(e[i]), arH: htm(a[i]), enH: htm(e[i]) });
    return out;
  };
  const one = (a, e, icon, c) => ({ ar: txt(a), en: txt(e), arH: htm(a), enH: htm(e), icon: icon || '', c: c || '' });

  /* read any block into { head, units[], color } */
  function read(b) {
    const t = b.dataset.type; let head = null, units = [], color = '';
    const cv = el => el ? (el.style.getPropertyValue('--c') || '').trim() : '';
    if (t === 'text') units = paraUnits($q('.body.ar', b), $q('.body.en', b));
    else if (t === 'heading') units = [one($q('.hd.ar', b), $q('.hd.en', b))];
    else if (t === 'tagline') units = [one($q('.tg1', b), $q('.tg2', b))];
    else if (t === 'greet') units = [one($q('.g1.ar', b), $q('.g1.en', b)), one($q('.g2.ar', b), $q('.g2.en', b))];
    else if (t === 'pillars') { units = $qa('.pcard', b).map(c => one($q('.pl.ar', c), $q('.pl.en', c), icOf(c), cv(c))); color = units[0] && units[0].c; }
    else if (t === 'card') { const sc = $q('.scard', b); color = cv(sc); head = one($q('.hd.ar', b), $q('.hd.en', b), icOf($q('.mid', b))); units = paraUnits($q('.body.ar', b), $q('.body.en', b)); if (units[0]) units[0].icon = head.icon; }
    else if (t === 'list') { color = cv($q('.lst', b)); units = $qa('.li', b).map(li => one($q('.lt.ar', li), $q('.lt.en', li), icOf(li))); }
    else if (t === 'path') { color = cv($q('.pbox', b)); head = one($q('.phead .hd.ar', b), $q('.phead .hd.en', b)); units = $qa('.stp', b).map(s => one($q('.sl1', s), $q('.sl2', s), icOf(s))); }
    if (head && !head.ar && !head.en) head = null;
    units = units.filter(u => u.ar || u.en || /class="ii/.test(u.arH + u.enH));
    return { head, units, color };
  }

  const pickIcon = (u, used, fb) => { let ic = u.icon; if (!ic) { try { ic = iconForItem(u.ar || '', u.en || '', used); } catch (e) { } } ic = ic || fb; used.add(ic); return ic; };

  /* build the new block from the content */
  function build(type, d) {
    let { head, units, color } = d; const used = new Set(); const all = head ? [head, ...units] : units.slice();
    const joinT = (arr, k, sep) => arr.map(u => u[k]).filter(Boolean).join(sep);
    let html, fill = [];   // fill: [selector, list-of-html] to keep bold / colours / inline icons
    if (type === 'text') {
      const L = all.length ? all : [{ ar: '', en: '' }];
      html = B.text({ ar: L.map(u => u.ar), en: L.map(u => u.en) });
      fill = [['.body.ar', L.map(u => u.arH)], ['.body.en', L.map(u => u.enH)]];
    } else if (type === 'heading') {
      const u = head || units[0] || { ar: '', en: '' }; const rest = head ? [] : units.slice(1);
      html = B.heading({ ar: [u.ar, ...rest.map(x => x.ar)].filter(Boolean).join(' · '), en: [u.en, ...rest.map(x => x.en)].filter(Boolean).join(' · ') });
    } else if (type === 'tagline') {
      html = B.tagline({ ar: joinT(all, 'ar', ' '), en: joinT(all, 'en', ' ') });
    } else if (type === 'greet') {
      const a = all[0] || { ar: '', en: '' }, r = all.slice(1);
      html = B.greet({ ar1: a.ar, en1: a.en, ar2: joinT(r, 'ar', ' '), en2: joinT(r, 'en', ' ') });
    } else if (type === 'pillars') {
      let L = all.slice(); if (!L.length) L = [{ ar: '', en: '' }];
      if (L.length > 7) { const extra = L.slice(6); L = L.slice(0, 6).concat([{ ar: joinT(extra, 'ar', '، '), en: joinT(extra, 'en', ', '), icon: extra[0].icon }]); }
      html = B.pillars({ cards: L.map((u, i) => [pickIcon(u, used, 'circle-check'), u.c || (i === 0 && color) || COLORS[i % COLORS.length], u.ar, u.en]) });
    } else if (type === 'card') {
      const h = head || (units.length > 1 ? units[0] : null); const body = head ? units : (units.length > 1 ? units.slice(1) : units);
      const icon = (h && h.icon) || (units[0] && units[0].icon) || pickIcon(h || units[0] || {}, used, 'shield-check');
      html = B.card({ c: color || '#009CA5', icon, tar: h ? h.ar : '', ten: h ? h.en : '', ar: body.map(u => u.ar), en: body.map(u => u.en) });
      fill = [['.body.ar', body.map(u => u.arH)], ['.body.en', body.map(u => u.enH)]];
    } else if (type === 'list') {
      const L = all.length ? all : [{ ar: '', en: '' }];
      html = B.list({ c: color || '#009CA5', items: L.map(u => ({ ar: u.ar, en: u.en, icon: u.icon || 'circle-check' })) });
    } else if (type === 'path') {
      let L = units.length ? units : (head ? [head] : []); if (!L.length) L = [{ ar: '' }, { ar: '' }, { ar: '' }];
      html = B.path({ c: color || '#004EAA', label_ar: head && units.length ? head.ar : '', label_en: head && units.length ? head.en : '', ar: L.map(u => u.ar), en: L.map(u => u.en), icons: L.map(u => u.icon || '') });
    }
    const tmp = document.createElement('div'); tmp.innerHTML = html; const nb = tmp.firstElementChild;
    fill.forEach(([sel, list]) => { const box = $q(sel, nb); if (box && list.length) box.innerHTML = list.map(h => `<p>${h || '<br>'}</p>`).join(''); });
    return nb;
  }

  function convert(b, type) {
    if (!b || b.dataset.type === type) return;
    const d = read(b); const nb = build(type, d); if (!nb) return;
    try { snap(true); } catch (e) { }
    if (b.style.marginTop) nb.style.marginTop = b.style.marginTop;
    if (S.sel && b.contains(S.sel.el)) { try { deselect(); } catch (e) { } }
    b.replaceWith(nb); try { renderDynamic(nb); } catch (e) { }
    S.curBlk = nb; try { hideBar(); afterLayout(); } catch (e) { }
    setTimeout(() => { try { snap(true); } catch (e) { } }, 300);
    const lost = (type === 'heading' || type === 'tagline') && d.units.length + (d.head ? 1 : 0) > 1;
    toast(lost ? 'تم التحويل — جمعت الأسطر في سطر واحد (تقدر تتراجع بـ ⌘Z)' : 'تم تغيير النوع');
  }

  /* ---------- the picker ---------- */
  const pop = document.createElement('div'); pop.id = 'cvPop'; pop.setAttribute('role', 'menu'); document.body.appendChild(pop);
  let target = null;
  function openPop(b, anchor) {
    target = b; const cur = b.dataset.type;
    pop.innerHTML = `<div class="cvH">تغيير النوع إلى</div>` + KINDS.map(([k, l, ic]) => `<button data-cv="${k}" ${k === cur ? 'class="on" disabled' : ''}>${svgIcon(ic, 1.9)}<span>${l}</span>${k === cur ? '<small>الحالي</small>' : ''}</button>`).join('');
    pop.classList.add('on'); const r = anchor.getBoundingClientRect(); const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.left - pw - 8; if (x < 8) x = Math.min(innerWidth - pw - 8, r.right + 8);
    let y = r.top; if (document.body.classList.contains('phone')) { x = (innerWidth - pw) / 2; y = r.top - ph - 10; }
    y = Math.max(8, Math.min(innerHeight - ph - 8, y)); pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  function closePop() { pop.classList.remove('on'); target = null; }
  pop.addEventListener('click', e => { const k = e.target.closest('[data-cv]'); if (!k || k.disabled) return; const b = target; closePop(); convert(b, k.dataset.cv); });
  addEventListener('pointerdown', e => { if (pop.classList.contains('on') && !pop.contains(e.target) && !e.target.closest('[data-b=cvt]')) closePop(); }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });

  /* add the button to the floating block bar every time it is drawn */
  const bar = document.getElementById('blockbar');
  const addBtn = () => {
    const b = S.hovBlk; if (!b || !CONVERTIBLE.has(b.dataset.type) || bar.querySelector('[data-b=cvt]')) return;
    const btn = document.createElement('button'); btn.dataset.b = 'cvt'; btn.className = 'cvt'; btn.title = 'تغيير النوع (نص، بطاقات، قائمة…)'; btn.innerHTML = svgIcon('replace', 2);
    const dup = bar.querySelector('[data-b=dup]'); dup ? dup.after(btn) : bar.appendChild(btn);
  };
  if (bar) {
    new MutationObserver(addBtn).observe(bar, { childList: true });
    bar.addEventListener('click', e => { const btn = e.target.closest('[data-b=cvt]'); if (!btn) return; e.stopPropagation(); const b = S.hovBlk; if (!b) return; pop.classList.contains('on') && target === b ? closePop() : openPop(b, btn); }, true);
  }
  // phones: a tap on an element shows its bar (a tap does not always send a mouse move)
  try { page.addEventListener('click', e => { if (!document.body.classList.contains('phone') || S.dragBlk) return; const b = e.target.closest('#blocks > .blk'); if (b && b !== S.hovBlk) showBar(b); }); } catch (e) { }
  /* also in the side panel (and the phone's edit sheet) whenever something inside the element is selected */
  const ctxEl = document.getElementById('ctx');
  const selBlk = () => { let el = S.sel && S.sel.el; if (!el || !el.closest) { const a = document.activeElement; el = a && a.closest && a.closest('#page .ed') ? a : null; } const b = el && el.closest('#blocks > .blk'); return b && CONVERTIBLE.has(b.dataset.type) ? b : null; };
  function addRow() {
    if (!ctxEl || ctxEl.querySelector('.cvRow')) return; const b = selBlk(); if (!b) return;
    const row = document.createElement('div'); row.className = 'cvRow';
    row.innerHTML = `<label class="f">نوع العنصر — اضغط لتغييره</label><div class="cvChips">${KINDS.map(([k, l, ic]) => `<button type="button" data-cv="${k}" class="${k === b.dataset.type ? 'on' : ''}" title="${l}">${svgIcon(ic, 1.9)}<span>${l}</span></button>`).join('')}</div>`;
    row.addEventListener('mousedown', e => e.preventDefault());
    row.addEventListener('click', e => { const k = e.target.closest('[data-cv]'); if (!k || k.classList.contains('on')) return; const blk = selBlk() || (refresh.last && page.contains(refresh.last) ? refresh.last : b); convert(blk, k.dataset.cv); });
    ctxEl.appendChild(row);
  }
  if (ctxEl) new MutationObserver(addRow).observe(ctxEl, { childList: true });
  // typing inside an element: show (or move) the row for that element
  const refresh = () => { if (!ctxEl) return; const r = ctxEl.querySelector('.cvRow'); const b = selBlk(); if (r && (!b || !r.querySelector(`[data-cv="${b.dataset.type}"].on`))) r.remove(); addRow(); if (b) refresh.last = b; };
  try { page.addEventListener('focusin', () => setTimeout(refresh, 0)); page.addEventListener('focusout', () => setTimeout(refresh, 150)); } catch (e) { }
  window.__cvApi = { convert, read, build, KINDS, openPop };
})();
