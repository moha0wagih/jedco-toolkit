/* أدوات مطارات جدة — ملاحظات عائمة (floating sticky notes over every tool).
   Designed by Mohammed Wagih · 2026 · v2.0
   Saved on this device as you type. Drag a note by its top bar, resize from its corner.
   Works the same in Safari, Chrome and Edge, on the computer and the phone. */
(function () {
  'use strict';
  if (window.JEDNOTES) return;
  var KEY = 'jedHub.notes.v1';
  var phone = function () { return document.documentElement.classList.contains('hub-phone') || document.body.classList.contains('phone') || innerWidth < 700; };
  function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  var notes = load(), shown = false, z = 10;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) { } }
  var COLORS = { sky: '#EAF4FD', sand: '#FFF6E0', mint: '#E8F7F1', white: '#FFFFFF' };
  var ORDER = ['sky', 'sand', 'mint', 'white'];

  var css = document.createElement('style');
  css.textContent =
    '#jnFab{position:fixed;z-index:2147483500;left:calc(16px + env(safe-area-inset-left,0px));bottom:calc(64px + env(safe-area-inset-bottom,0px));width:42px;height:42px;border-radius:14px;border:1px solid rgba(0,38,87,.16);' +
    'background:#fff;color:#002657;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px rgba(0,30,70,.14);transition:background .2s,transform .2s}' +
    '#jnFab:hover{background:#EEF3FA}#jnFab:active{transform:scale(.96)}#jnFab.on{background:#002657;color:#fff}' +
    '#jnFab svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    '#jnFab i{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#FC5C17;color:#fff;font:400 10.5px/18px Sequel,"Segoe UI",sans-serif;font-style:normal;text-align:center}' +
    'html.jn-home #jnFab{bottom:calc(16px + env(safe-area-inset-bottom,0px))}html.jn-off #jnFab{display:none}' +
    'body.t-comms:not(.phone) #jnFab,html.hub-t-comms:not(.hub-phone) #jnFab{left:316px}body.t-pres:not(.phone) #jnFab,html.hub-t-pres:not(.hub-phone) #jnFab{left:300px}' +
    'html.hub-phone:not(.jn-home) #jnFab,html:not(.jn-home) body.phone #jnFab{left:env(safe-area-inset-left,0px);bottom:auto;top:calc(50% + 36px);width:30px;height:44px;border-radius:0 12px 12px 0;border-left:0}' +
    'html.hub-phone:not(.jn-home) #jnFab svg,html:not(.jn-home) body.phone #jnFab svg{width:16px;height:16px}' +
    '.jn{position:fixed;z-index:2147483501;display:flex;flex-direction:column;min-width:200px;min-height:150px;border-radius:16px;border:1px solid rgba(0,38,87,.14);overflow:hidden;' +
    'box-shadow:0 16px 40px rgba(0,30,70,.18);font-family:Tajawal,"Segoe UI",Tahoma,sans-serif;direction:rtl;resize:both}' +
    '.jn-h{flex:none;display:flex;align-items:center;gap:4px;height:36px;padding:0 8px 0 6px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;border-bottom:1px solid rgba(0,38,87,.08)}' +
    '.jn-h:active{cursor:grabbing}.jn-h b{flex:1;font-size:12.5px;font-weight:600;color:#5A6B85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.jn-h button{width:28px;height:28px;flex:none;border:0;border-radius:8px;background:none;color:#5A6B85;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}' +
    '.jn-h button:hover{background:rgba(0,38,87,.08);color:#002657}.jn-h button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    '.jn-h .dot{width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,38,87,.25);margin:0 4px}' +
    '.jn textarea{flex:1;width:100%;border:0;outline:0;resize:none;background:transparent;padding:10px 14px 14px;font:500 15px/1.75 Tajawal,"Segoe UI",Tahoma,sans-serif;color:#0E1E36}' +
    '.jn textarea::placeholder{color:#8DA2C2}' +
    '.jn.sure .jn-del{background:#FDECEA;color:#B42318}' +
    '@media print{#jnFab,.jn{display:none!important}}';
  (document.head || document.documentElement).appendChild(css);

  var IC = {
    note: '<svg viewBox="0 0 24 24"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5z"/><path d="M15 3v5a1 1 0 0 0 1 1h5"/><path d="M7 13h7M7 17h4"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    min: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
  };
  var fab = document.createElement('button');
  fab.id = 'jnFab'; fab.type = 'button'; fab.title = 'ملاحظات عائمة'; fab.setAttribute('aria-label', 'ملاحظات عائمة');
  fab.innerHTML = IC.note + '<i hidden></i>';
  fab.onclick = function () { shown ? hideAll() : showAll(); };

  function count() { var i = fab.querySelector('i'), n = notes.filter(function (x) { return (x.text || '').trim(); }).length; i.hidden = !n || shown; i.textContent = n; }
  function clampBox(n) {
    var W = innerWidth, H = innerHeight;
    n.w = Math.max(200, Math.min(n.w || 300, W - 16)); n.h = Math.max(150, Math.min(n.h || 260, H - 16));
    n.x = Math.max(8, Math.min(n.x, W - n.w - 8)); n.y = Math.max(8, Math.min(n.y, H - n.h - 8));
  }
  function make(n) {
    clampBox(n);
    var el = document.createElement('div'); el.className = 'jn'; el.dataset.id = n.id;
    el.style.cssText = 'left:' + n.x + 'px;top:' + n.y + 'px;width:' + n.w + 'px;height:' + n.h + 'px;background:' + (COLORS[n.c] || COLORS.sky) + ';z-index:' + (2147483501 + (++z));
    el.innerHTML = '<div class="jn-h"><span class="dot" title="لون الملاحظة" role="button"></span><b></b>' +
      '<button class="jn-new" title="ملاحظة جديدة">' + IC.plus + '</button>' +
      '<button class="jn-min" title="إخفاء الملاحظات">' + IC.min + '</button>' +
      '<button class="jn-del" title="حذف هذه الملاحظة">' + IC.del + '</button></div>' +
      '<textarea dir="auto" placeholder="اكتب ملاحظتك… تنحفظ تلقائياً"></textarea>';
    var ta = el.querySelector('textarea'), ttl = el.querySelector('b'), dot = el.querySelector('.dot');
    dot.style.background = COLORS[n.c] || COLORS.sky;
    ta.value = n.text || '';
    var title = function () { var t = (ta.value.split('\n').find(function (l) { return l.trim(); }) || '').trim(); ttl.textContent = t || 'ملاحظة'; };
    title();
    ta.addEventListener('input', function () { n.text = ta.value; n.at = Date.now(); title(); save(); });
    // keep typing out of the tool underneath (shortcuts, undo, delete keys)
    ['keydown', 'keyup', 'keypress', 'paste', 'copy', 'cut', 'input'].forEach(function (k) { ta.addEventListener(k, function (e) { e.stopPropagation(); }); });
    el.addEventListener('pointerdown', function () { el.style.zIndex = 2147483501 + (++z); }, true);
    dot.onclick = function () { n.c = ORDER[(ORDER.indexOf(n.c || 'sky') + 1) % ORDER.length]; el.style.background = COLORS[n.c]; dot.style.background = COLORS[n.c]; save(); };
    el.querySelector('.jn-new').onclick = function () { add(n.x - 24, n.y + 24); };
    el.querySelector('.jn-min').onclick = hideAll;
    var del = el.querySelector('.jn-del');
    del.onclick = function () {
      if (ta.value.trim() && !el.classList.contains('sure')) { el.classList.add('sure'); del.title = 'اضغط مرة ثانية للحذف'; setTimeout(function () { el.classList.remove('sure'); del.title = 'حذف هذه الملاحظة'; }, 2500); return; }
      notes = notes.filter(function (x) { return x.id !== n.id; }); save(); el.remove();
      if (!notes.length) hideAll(); count();
    };
    // drag by the top bar (mouse, pen and touch)
    var h = el.querySelector('.jn-h'), drag = null;
    h.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button,.dot')) return;
      drag = { id: e.pointerId, dx: e.clientX - n.x, dy: e.clientY - n.y };
      try { h.setPointerCapture(e.pointerId); } catch (x) { }
      e.preventDefault();
    });
    h.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      n.x = e.clientX - drag.dx; n.y = e.clientY - drag.dy; clampBox(n);
      el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
    });
    var end = function (e) { if (!drag || e.pointerId !== drag.id) return; drag = null; save(); };
    h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
    // remember the size after a resize
    if (window.ResizeObserver) new ResizeObserver(function () { if (!el.isConnected) return; var w = el.offsetWidth, hh = el.offsetHeight; if (w && hh && (w !== n.w || hh !== n.h)) { n.w = w; n.h = hh; save(); } }).observe(el);
    document.body.appendChild(el);
    return el;
  }
  function add(x, y) {
    var ph = phone();
    var n = { id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: '', c: ORDER[notes.length % ORDER.length],
      w: ph ? innerWidth - 32 : 300, h: ph ? 240 : 260 };
    n.x = x != null ? x : (ph ? 16 : 70); n.y = y != null ? y : (ph ? 80 : innerHeight - 260 - 90);
    notes.push(n); save();
    var el = make(n); var ta = el.querySelector('textarea'); setTimeout(function () { try { ta.focus(); } catch (e) { } }, 30);
    shown = true; fab.classList.add('on'); count();
  }
  function showAll() {
    if (!notes.length) { add(); return; }
    document.querySelectorAll('.jn').forEach(function (x) { x.remove(); });
    notes.forEach(make); shown = true; fab.classList.add('on'); count();
  }
  function hideAll() { document.querySelectorAll('.jn').forEach(function (x) { x.remove(); }); shown = false; fab.classList.remove('on'); count(); }
  addEventListener('resize', function () { if (!shown) return; document.querySelectorAll('.jn').forEach(function (el) { var n = notes.find(function (x) { return x.id === el.dataset.id; }); if (!n) return; clampBox(n); el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; el.style.width = n.w + 'px'; el.style.height = n.h + 'px'; }); });
  // another window of the toolkit changed the notes
  addEventListener('storage', function (e) { if (e.key !== KEY) return; notes = load(); if (shown) showAll(); count(); });

  function start() { document.body.appendChild(fab); count(); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.JEDNOTES = { show: showAll, hide: hideAll, add: add, fab: fab };
})();
