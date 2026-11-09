/* ==========================================================================
   مصمم التواصل الداخلي · build 37 — تنبيه «فيه نسخة جديدة»
   The online copy checks the server for a newer build when it opens (and every
   10 minutes). If there is one, a small bar offers a one-tap refresh — the work
   is saved first, so nothing is lost. Offline / file copies skip this.
   ========================================================================== */
(function () {
  'use strict';
  if (!/^https?:$/.test(location.protocol) || typeof APP_BUILD !== 'string') return;
  const mine = APP_BUILD;
  const bar = document.createElement('div'); bar.id = 'updBar'; bar.setAttribute('role', 'status');
  bar.innerHTML = `<span>فيه نسخة أحدث من الأداة <b></b></span><button type="button" data-u="go">تحديث الحين</button><button type="button" data-u="x" aria-label="إغلاق">×</button>`;
  document.body.appendChild(bar);
  let shown = '';
  async function check() {
    try {
      const r = await fetch(location.pathname + '?u=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      const t = await r.text(); const m = t.match(/APP_BUILD = '([^']+)'/); if (!m) return;
      const theirs = m[1]; const n = s => parseInt((s.match(/\d+/) || [0])[0], 10);
      if (n(theirs) > n(mine) && shown !== theirs) { shown = theirs; bar.querySelector('b').textContent = '(' + theirs + ')'; bar.classList.add('on'); }
    } catch (e) { }
  }
  bar.addEventListener('click', async e => {
    const b = e.target.closest('[data-u]'); if (!b) return;
    if (b.dataset.u === 'x') { bar.classList.remove('on'); return; }
    try { if (typeof flushAutosave === 'function') flushAutosave(); } catch (err) { }
    try { const ks = await caches.keys(); await Promise.all(ks.filter(k => k.startsWith('jedco-toolkit-')).map(k => caches.delete(k))); } catch (err) { }
    window.__hubLeaveOk = true;   // the work is saved, so no «leave site?» question
    setTimeout(() => location.reload(), 300);
  });
  setTimeout(check, 2500); setInterval(check, 10 * 60 * 1000);
  addEventListener('online', check);
})();
