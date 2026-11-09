/* ==========================================================================
   مصمم التواصل الداخلي · build 36 — العنوان على أكثر من سطر
   Each header line (Arabic title, subtitle, English title …) can be one line or
   two, on its own. Lines below a two-line title move down by themselves, unless
   the user has dragged them somewhere else.
   ========================================================================== */
(function () {
  'use strict';
  const q = (s, r) => (r || document).querySelector(s), qa = (s, r) => [...(r || document).querySelectorAll(s)];
  const titles = () => qa('.htitles .ht', page);

  /* ---------- keep the lines stacked ---------- */
  let busy = false;
  function restack() {
    if (busy) return; busy = true;
    try {
      const list = titles().map(el => {
        const auto = !el.style.top || el.style.top === el.dataset.autoTop;
        let base;
        if (auto) { const keep = el.style.top; el.style.top = ''; base = parseFloat(getComputedStyle(el).top) || 0; el.style.top = keep; if (!el.getAttribute('style')) el.removeAttribute('style'); }
        return { el, auto, base };
      }).filter(x => x.auto).sort((a, b) => a.base - b.base);
      // stack: each line starts under the one above it
      let acc = 0; const plan = [];
      for (const x of list) {
        const lh = parseFloat(getComputedStyle(x.el).lineHeight) || 0, h = x.el.offsetHeight;
        plan.push({ x, top: x.base + acc, h }); acc += Math.max(0, h - lh);
      }
      // a tall stack slides up (never above the top margin) so it stays on the photo
      const welcome = !!q('.hdr.welcome', page), limit = welcome ? 322 : 258, minTop = 26;
      if (plan.length) {
        const bottom = Math.max(...plan.map(p => p.top + p.h)), over = bottom - limit;
        const room = plan[0].top - minTop;
        const up = over > 0 ? Math.min(over, Math.max(0, room)) : 0;
        plan.forEach(p => p.top -= up);
        const still = over - up > 2;   // even at the top it does not fit: say so once
        if (still && !restack.warned) { restack.warned = true; setTimeout(() => { try { toast('العناوين صارت أطول من صورة الترويسة — صغّر حجم أحد الأسطر من «حجم هذا السطر»'); } catch (e) { } }, 50); }
        if (!still) restack.warned = false;
      }
      for (const p of plan) {
        const el = p.x.el, want = Math.round(p.top * 100) / 100;
        if (Math.abs(want - p.x.base) < 0.01) { if (el.style.top) el.style.removeProperty('top'); delete el.dataset.autoTop; if (!el.getAttribute('style')) el.removeAttribute('style'); }
        else { const v = want + 'px'; if (el.style.top !== v) el.style.top = v; el.dataset.autoTop = v; }
      }
    } catch (e) { }
    busy = false;
  }
  let raf = 0; const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(restack); };
  try {
    new MutationObserver(muts => { if (busy) return; if (muts.some(m => (m.target.closest ? m.target : m.target.parentElement)?.closest?.('.htitles') || [...(m.addedNodes || [])].some(n => n.nodeType === 1 && (n.matches('.hdr,.htitles,.ht') || n.querySelector?.('.htitles'))))) later(); })
      .observe(page, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class'] });
  } catch (e) { }
  addEventListener('resize', later);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);

  /* ---------- Enter inside a title = new line (it used to need Shift+Enter) ---------- */
  page.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing) return; const t = e.target.closest && e.target.closest('.htitles .ht'); if (!t) return;
    e.preventDefault(); e.stopImmediatePropagation();
    document.execCommand('insertLineBreak');
    // no stray space at the start of the new line or the end of the first one
    qa('br', t).forEach(br => { const n = br.nextSibling, pv = br.previousSibling; if (n && n.nodeType === 3) n.textContent = n.textContent.replace(/^[\s\u00a0]+/, ''); if (pv && pv.nodeType === 3) pv.textContent = pv.textContent.replace(/[\s\u00a0]+$/, ''); });
    later(); paintRow();
  }, true);

  /* ---------- one line ↔ two lines ---------- */
  const lines = el => el.querySelectorAll('br').length + 1;
  function textNodes(el) { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) out.push(n); return out; }
  function toOne(el) {
    qa('br', el).forEach(br => { const prev = br.previousSibling, next = br.nextSibling; const needSpace = !(prev && /\s$/.test(prev.textContent || '')) && !(next && /^\s/.test(next.textContent || '')); br.replaceWith(document.createTextNode(needSpace ? ' ' : '')); });
    el.normalize();
  }
  function toTwo(el) {
    toOne(el);
    const full = el.textContent; const trimmed = full.trim(); if (!/\s/.test(trimmed)) { toast('العنوان كلمة وحدة — اكتب كلمة ثانية أو اضغط Enter في المكان اللي تبيه'); return false; }
    const lead = full.length - full.trimStart().length; const mid = lead + trimmed.length / 2;
    // the space closest to the middle
    let best = -1; for (let i = lead + 1; i < lead + trimmed.length - 1; i++) if (/\s/.test(full[i]) && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
    if (best < 0) return false;
    let pos = 0;
    for (const n of textNodes(el)) {
      const len = n.textContent.length;
      if (best < pos + len) { const k = best - pos; const after = n.splitText(k); after.textContent = after.textContent.slice(1); after.parentNode.insertBefore(document.createElement('br'), after); break; }
      pos += len;
    }
    return true;
  }
  function setLines(el, n) {
    if (!el) return; if (lines(el) === n) return;
    try { snap(true); } catch (e) { }
    if (n === 1) toOne(el); else if (!toTwo(el)) return;
    restack(); try { afterLayout(); } catch (e) { }
    setTimeout(() => { try { snap(true); } catch (e) { } }, 250);
    paintRow();
  }

  /* ---------- the control in the side panel when a title line is selected ---------- */
  const ctxEl = document.getElementById('ctx');
  function paintRow() {
    const row = ctxEl && ctxEl.querySelector('.tlRow'); const el = S.sel && S.sel.type === 'title' ? S.sel.el : null; if (!row || !el) return;
    const n = lines(el); row.querySelectorAll('[data-tl]').forEach(b => b.classList.toggle('on', +b.dataset.tl === n));
  }
  function addRow() {
    if (!ctxEl || ctxEl.querySelector('.tlRow') || !S.sel || S.sel.type !== 'title') return;
    const row = document.createElement('div'); row.className = 'tlRow';
    row.innerHTML = `<label class="f">أسطر هذا العنوان</label><div class="tlSeg"><button type="button" data-tl="1">سطر واحد</button><button type="button" data-tl="2">سطرين</button></div><div class="hint">كل عنوان لحاله: تقدر تخلي العربي سطرين والإنجليزي سطر. اضغط Enter داخل العنوان في أي مكان ينزل سطر جديد (بدون حد). «سطرين» يقسمه من النص، و«سطر واحد» يرجّعه سطر.</div>`;
    row.addEventListener('mousedown', e => e.preventDefault());
    row.addEventListener('click', e => { const b = e.target.closest('[data-tl]'); if (b && S.sel && S.sel.type === 'title') setLines(S.sel.el, +b.dataset.tl); });
    const size = ctxEl.querySelector('#tsz'); const anchor = size && size.closest('.rowc');
    anchor ? anchor.after(row) : ctxEl.appendChild(row);
    paintRow();
  }
  if (ctxEl) new MutationObserver(addRow).observe(ctxEl, { childList: true });
  page.addEventListener('input', e => { if (e.target.closest && e.target.closest('.htitles')) { later(); paintRow(); } });
  if (ctxEl) ctxEl.addEventListener('input', e => { if (e.target.id === 'tsz') later(); });

  setTimeout(restack, 600);
  window.__titlesApi = { restack, setLines, lines };
})();
