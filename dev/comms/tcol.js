/* ==========================================================================
   مصمم التواصل الداخلي · تلوين النص المحدد
   select words → pick a colour on the floating bar → only those words change colour
   (no selection, cursor in a text → the whole text). ↺ in the row brings back the original colour.
   ========================================================================== */
(function () {
  'use strict';
  if (typeof tbar === 'undefined' || typeof TS === 'undefined' || typeof ensureSpans !== 'function') return;
  const COLS = (typeof PALETTE !== 'undefined' && PALETTE.length) ? PALETTE : [['#002657', 'كحلي'], ['#004EAA', 'أزرق'], ['#FC5C17', 'برتقالي'], ['#FFFFFF', 'أبيض']];
  const row = document.createElement('div'); row.className = 'tr tcRow';
  row.innerHTML = `<span class="tl">Color</span>${COLS.map(([c, n]) => `<button class="tcSw" data-tc="${c}" title="${n}" style="--c:${c}"></button>`).join('')}<label class="tcPick" title="لون مخصص"><input type="color" id="tbCol" value="#004eaa"><span>+</span></label><button data-tc="" class="tcClr" title="إرجاع لون الكلمات الأصلي">↺</button>`;
  tbar.appendChild(row);
  const pick = row.querySelector('#tbCol');

  const hex = c => { const m = String(c || '').match(/rgba?\(([^)]+)\)/); if (!m) return String(c || '').toUpperCase(); return '#' + m[1].split(/[\s,\/]+/).slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join('').toUpperCase(); };
  function curColor() { const n = TS.range && TS.ed && selectedTextNodesPeek(TS.range, TS.ed)[0]; return n ? hex(getComputedStyle(n.parentElement).color) : ''; }
  function mark() { const c = curColor(); row.querySelectorAll('.tcSw').forEach(b => b.classList.toggle('on', b.dataset.tc.toUpperCase() === c)); if (/^#[0-9A-F]{6}$/.test(c)) pick.value = c.toLowerCase(); }

  function applyColor(c) {
    if (!TS.range || !TS.ed || !page.contains(TS.ed)) return;
    const spans = ensureSpans();
    spans.forEach(sp => {
      if (c) sp.style.color = c; else sp.style.removeProperty('color');
      // colours set earlier on words inside go, so the new one shows everywhere in the selection
      sp.querySelectorAll('[style]').forEach(x => { if (!x.closest('.ii')) x.style.removeProperty('color'); });
      if (!sp.getAttribute('style')) sp.removeAttribute('style');
    });
    mark(); afterLayout();
  }

  // the bar stays up while the native colour window is open
  TS.picking = false;
  const _hide = hideTbar; hideTbar = function () { if (TS.picking) return; return _hide.apply(this, arguments); };
  pick.addEventListener('pointerdown', () => { TS.picking = true; });
  pick.addEventListener('input', () => applyColor(pick.value));
  pick.addEventListener('change', () => { applyColor(pick.value); TS.picking = false; });
  pick.addEventListener('blur', () => { setTimeout(() => { TS.picking = false; }, 300); });

  tbar.addEventListener('click', e => { const b = e.target.closest('[data-tc]'); if (!b) return; e.stopPropagation(); applyColor(b.dataset.tc); }, true);

  const _sync = syncTbar; syncTbar = function () { const r = _sync.apply(this, arguments); try { mark(); } catch (x) { } return r; };
})();
