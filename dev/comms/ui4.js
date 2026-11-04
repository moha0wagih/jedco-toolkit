/* ==========================================================================
   مصمم التواصل الداخلي · build 33 — interface tidy-up (desktop only)
   · home + notes buttons move beside the title (they used to float over the design)
   · "start from content": Word import and paste side by side in the side panel
   · element buttons get their description as a hover hint
   Every control here just presses the original button, so all behaviour stays the same.
   ========================================================================== */
(function () {
  'use strict';
  const q = id => document.getElementById(id);
  const SV = d => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const I_HOME = SV('<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>');
  const I_NOTE = SV('<path d="M15.5 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z"/><path d="M15 3v5h5"/><path d="M8 13h8"/><path d="M8 17h5"/>');
  const I_WORD = SV('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h6"/><path d="m8 12 1.5 6 2.5-4.5 2.5 4.5 1.5-6"/>');
  const I_PASTE = SV('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h4"/>');

  function brandButtons() {
    const brand = document.querySelector('#topbar .brand'); if (!brand || q('u4Brand')) return;
    const box = document.createElement('span'); box.id = 'u4Brand';
    box.innerHTML = `<span class="u4sep"></span><button type="button" id="u4Home" title="كل الأدوات (الرجوع لأدوات مطارات جدة)">${I_HOME}</button><button type="button" id="u4Notes" title="ملاحظات عائمة">${I_NOTE}<i></i></button>`;
    brand.appendChild(box);
    q('u4Home').onclick = () => { const h = q('hubHome'); if (h) h.click(); };
    q('u4Notes').onclick = () => { const f = q('jnFab'); if (f) f.click(); };
    sync();
  }
  // show each proxy only when the original exists (inside the toolkit frame there is no home link)
  function sync() {
    const h = q('hubHome'), f = q('jnFab'), bh = q('u4Home'), bn = q('u4Notes'); if (!bh) return;
    bh.style.display = h ? '' : 'none';
    bn.style.display = f ? '' : 'none';
    if (f) {
      bn.classList.toggle('on', f.classList.contains('on'));
      const c = f.querySelector('i'), t = c && getComputedStyle(c).display !== 'none' ? c.textContent.trim() : '';
      const bi = bn.querySelector('i'); if (bi.textContent !== t) bi.textContent = t;
    }
    const sep = q('u4Brand').querySelector('.u4sep'); sep.style.display = (h || f) ? '' : 'none';
  }
  let fabObs = null;
  function watchFab() {
    const f = q('jnFab'); if (!f || f._u4) return; f._u4 = true;
    fabObs = new MutationObserver(sync); fabObs.observe(f, { attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true, characterData: true });
    sync();
  }

  function startCards() {
    const qa = document.querySelector('#blockPanel .qaCards'); if (!qa || q('u4Start')) return;
    const box = document.createElement('div'); box.id = 'u4Start';
    box.innerHTML = `<button type="button" id="u4Word" title="ارفع ملف وورد ويتوزع المحتوى على التصميم تلقائياً">${I_WORD}<span>استيراد وورد<small>توزيع تلقائي</small></span></button>` +
      `<button type="button" id="u4Paste" title="الصق نص الإعلان من إيميل أو وورد أو جدول ويتوزع تلقائياً">${I_PASTE}<span>لصق نص<small>من إيميل أو جدول</small></span></button>`;
    qa.before(box);
    q('u4Word').onclick = () => { const b = q('bWord2') || q('bWord'); if (b) b.click(); };
    q('u4Paste').onclick = () => { const b = q('bPaste'); if (b) b.click(); };
  }

  function hints() {
    document.querySelectorAll('#blockBtns .bp').forEach(b => { if (b.title) return; const s = b.querySelector('small'); if (s) b.title = s.textContent.trim(); });
  }

  function init() {
    document.body.classList.add('u4');
    brandButtons(); startCards(); hints(); watchFab();
    // the shared hub / notes scripts add their buttons a moment after load
    let n = 0; const t = setInterval(() => { watchFab(); sync(); hints(); if (++n > 20 || (q('jnFab') && q('hubHome'))) clearInterval(t); }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
