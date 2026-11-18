/* ==========================================================================
   مصمم التواصل الداخلي · build 43 — إدارة ثانية تحت الجهة المرسلة
   · In the «الجهة المرسلة» panel: one optional line (Arabic + English) that
     sits under the sender department in the footer, same style as it.
   · Empty both fields → the line is removed and the footer goes back to how it was.
   · Saved on the design itself (#sender .dep2), so undo, autosave, «إعلاناتي»,
     .jedco.json, export and every board keep it.
   ========================================================================== */
(function () {
  'use strict';
  const q = (s, r) => (r || document).querySelector(s);

  /* the look — added to #mainStyle so export, previews, presentation and «الطبقات» all see it */
  const CSS = `
/* dep2: second department line under the sender */
#sender .dep2{display:block;white-space:nowrap}
#sender .dep2 .sep2{margin:0 9px}
#footer:has(#sender .dep2){margin-top:-11px}
#footer:has(#sender .dep2) #sender{top:50px}
`;
  function addCss() { const ms = q('#mainStyle'); if (ms && !ms.textContent.includes('dep2:')) ms.textContent += CSS; }

  const sender = () => q('#sender', page);
  function getSub() {
    const d = sender() && q('.dep2', sender());
    return d ? [q('.d2-ar', d).textContent, q('.d2-en', d).textContent] : ['', ''];
  }
  function setSub(ar, en) {
    const s = sender(); if (!s) return;
    ar = (ar || '').trim(); en = (en || '').trim();
    let d = q('.dep2', s);
    if (!ar && !en) { if (d) d.remove(); return; }
    if (!d) {
      s.insertAdjacentHTML('beforeend', '<div class="dep2"><span class="dep-en d2-en"></span><span class="sep2">|</span><span class="dep-ar d2-ar"></span></div>');
      d = q('.dep2', s);
    }
    q('.d2-ar', d).textContent = ar; q('.d2-en', d).textContent = en;
    q('.sep2', d).style.display = ar && en ? '' : 'none';
    if (typeof afterLayout === 'function') try { afterLayout(); } catch (e) {}
  }
  window.setSubDep = setSub;

  /* the fields in the «الجهة المرسلة» panel */
  const _ctx = window.renderCtx;
  if (typeof _ctx === 'function') window.renderCtx = renderCtx = function () {
    _ctx.apply(this, arguments);
    if (!S.sel || S.sel.type !== 'sender') return;
    const box = q('#ctx'); if (!box) return;
    const [ar, en] = getSub();
    const html = `<div id="d2Box"><label class="f">إدارة ثانية تحت الجهة (اختياري)</label>
      <input type="text" id="d2Ar" placeholder="اسم الإدارة بالعربي" value="${esc(ar)}">
      <input type="text" id="d2En" placeholder="Department name in English" dir="ltr" style="margin-top:6px" value="${esc(en)}">
      <div class="hint" style="margin-top:6px">تظهر في سطر تحت الجهة بنفس الشكل. اتركها فاضية لإخفائها.</div>
      ${ar || en ? '<div class="rowc"><button class="b danger" data-d2="clear">إزالة السطر الثاني</button></div>' : ''}</div>`;
    const dl = q('.dl', box);
    if (dl) dl.insertAdjacentHTML('afterend', html); else box.insertAdjacentHTML('beforeend', html);
  };

  document.addEventListener('input', e => {
    if (e.target.id !== 'd2Ar' && e.target.id !== 'd2En') return;
    setSub(q('#d2Ar').value, q('#d2En').value);
    const box = q('#d2Box'), has = q('#d2Ar').value.trim() || q('#d2En').value.trim();
    let row = box && q('[data-d2=clear]', box);
    if (has && !row && box) box.insertAdjacentHTML('beforeend', '<div class="rowc"><button class="b danger" data-d2="clear">إزالة السطر الثاني</button></div>');
    if (!has && row) row.parentElement.remove();
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-d2=clear]'); if (!b) return;
    e.stopPropagation(); setSub('', ''); renderCtx();
  }, true);

  addCss();
})();
