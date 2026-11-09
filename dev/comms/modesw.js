/* ==========================================================================
   مصمم التواصل الداخلي · build 38 — التنقل بين «الإعلان» و«الطبقات»
   One switch, in the same spot in both views: الإعلان | الطبقات.
   · الإعلان: the editor with element types, cards, «تغيير النوع»…
   · الطبقات: the Photoshop-style view of the same design.
   Going back and forth keeps both: the layers copy is saved and reopened, and
   if the announcement changed meanwhile the layers are rebuilt from it.
   ========================================================================== */
(function () {
  'use strict';
  const IC = n => (typeof svgIcon === 'function' ? svgIcon(n, 2) : '');
  function mk(active) {
    const w = document.createElement('div'); w.className = 'msw'; w.setAttribute('role', 'tablist'); w.setAttribute('aria-label', 'طريقة العرض');
    w.innerHTML = `<button type="button" data-m="ann" role="tab" class="${active === 'ann' ? 'on' : ''}" title="واجهة الإعلان: البطاقات، أنواع العناصر، تغيير النوع…">${IC('layout-template')}<span>الإعلان</span></button><button type="button" data-m="lx" role="tab" class="${active === 'lx' ? 'on' : ''}" title="واجهة الطبقات: كل نص وصورة وشكل لحاله">${IC('layers')}<span>الطبقات</span></button>`;
    return w;
  }
  function hook() {
    // announcement bar
    const bl = document.getElementById('bLayers');
    if (bl && !bl.dataset.msw) { bl.dataset.msw = '1';
      const w = mk('ann'); bl.before(w); w.querySelector('[data-m=lx]').addEventListener('click', e => { e.stopPropagation(); bl.click(); });
      bl.classList.add('mswHid');
    }
    // layers bar
    const back = document.getElementById('lxBack');
    if (back && !back.dataset.msw) { back.dataset.msw = '1';
      const w = mk('lx'); back.before(w); w.querySelector('[data-m=ann]').addEventListener('click', e => { e.stopPropagation(); back.click(); });
      back.classList.add('mswHid');
    }
  }
  hook(); [300, 1200, 3000, 6000].forEach(t => setTimeout(hook, t));
  try { new MutationObserver(() => { const a = document.getElementById('bLayers'), c = document.getElementById('lxBack'); if ((a && !a.dataset.msw) || (c && !c.dataset.msw)) hook(); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { }
})();
