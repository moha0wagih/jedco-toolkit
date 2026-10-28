/* أدوات مطارات جدة — shared layer loaded by every tool.
   Designed by Mohammed Wagih · 2026 · v2.0 */
(function () {
  'use strict';
  var KEY = 'jedHub.os';
  var framed = window.parent !== window;
  var hash = location.hash || '';
  var fromHub = /jedhub/.test(hash) || new URLSearchParams(location.search).get('hub') === '1';
  var os = (hash.match(/os=(mac|win|phone)/) || [])[1] || new URLSearchParams(location.search).get('os');
  if (!os) { try { os = localStorage.getItem(KEY); } catch (e) { } }
  if (!/^(mac|win|phone)$/.test(os || '')) os = Math.min(innerWidth, screen.width || 9999) < 700 ? 'phone' : (/Mac/.test(navigator.platform || '') ? 'mac' : 'win');
  var dev = os === 'phone' ? 'phone' : 'desktop';
  var root = document.documentElement;
  root.classList.add('hub-os-' + os);
  if (dev === 'phone') root.classList.add('hub-phone');
  var tool = (location.pathname.match(/tools\/([a-z]+)\//) || [])[1];
  if (tool) root.classList.add('hub-t-' + tool);
  // keep the hash clean for the tool itself
  if (fromHub && /jedhub/.test(hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } }

  window.JEDHUB = { os: os, device: dev, version: 'v2.0', framed: framed };
  /* shared helpers: «فتح في Outlook» everywhere; floating notes when a tool is opened on its own (the toolkit page has its own) */
  var BASE = (function () { var c = document.currentScript; return c && c.src ? c.src.replace(/[^\/]*$/, '') : '../../shared/'; })();
  function need(f) { var sc = document.createElement('script'); sc.src = BASE + f + '?v=20261028d'; (document.head || root).appendChild(sc); }
  need('mail.js');
  if (!document.querySelector('link[rel~="icon"]')) { [['icon', 'icon/icon.svg', 'image/svg+xml'], ['apple-touch-icon', 'icon/apple-touch-icon.png', '']].forEach(function (x) { var l = document.createElement('link'); l.rel = x[0]; l.href = BASE + x[1]; if (x[2]) l.type = x[2]; (document.head || root).appendChild(l); }); }
  if (!framed) need('notes.js');

  var css = document.createElement('style');
  css.textContent =
    '#hubCover{position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;' +
    'background:#002657;background-image:radial-gradient(1000px 600px at 85% -10%,rgba(0,78,170,.85),transparent 65%),linear-gradient(180deg,#002657,#001B40);' +
    'color:#BFCDE3;font:500 15px Tajawal,"Segoe UI",Tahoma,sans-serif;transition:opacity .3s}' +
    '#hubCover.out{opacity:0;pointer-events:none}' +
    '#hubCover i{width:34px;height:34px;border-radius:50%;border:2px solid rgba(255,255,255,.18);border-top-color:#62B6F3;animation:hubSpin .9s linear infinite}' +
    '@keyframes hubSpin{to{transform:rotate(360deg)}}' +
    '#hubHome{position:fixed;z-index:2147483645;left:calc(16px + env(safe-area-inset-left,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 15px 0 12px;' +
    'border-radius:999px;background:#002657;color:#fff;text-decoration:none;font:500 13.5px Tajawal,"Segoe UI",Tahoma,sans-serif;direction:rtl}' +
    '#hubHome svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    'html.hub-t-comms:not(.hub-phone) #hubHome{left:316px}html.hub-t-pres:not(.hub-phone) #hubHome{left:300px}' +
    'html.hub-phone #hubHome{left:env(safe-area-inset-left,0px);bottom:auto;top:50%;transform:translateY(-50%);width:30px;height:58px;padding:0;justify-content:center;border-radius:0 14px 14px 0}' +
    'html.hub-phone #hubHome span{display:none}' +
    '[data-needs-online][disabled],html.hub-offline [data-needs-online]{opacity:.38!important;pointer-events:none!important;filter:grayscale(1)}' +
    /* one direction rule everywhere: English reads from the left */
    '.hub-ltr{direction:ltr!important;text-align:left!important;unicode-bidi:isolate}';
  (document.head || root).appendChild(css);

  /* ---------- cover while the tool skips its own device screen ---------- */
  var cover = null;
  if (fromHub) {
    cover = document.createElement('div');
    cover.id = 'hubCover';
    cover.innerHTML = '<i></i><span>جاري فتح الأداة…</span>';
    root.appendChild(cover);
  }
  function hideCover() { if (!cover) return; cover.classList.add('out'); var c = cover; cover = null; setTimeout(function () { c.remove(); }, 350); }

  var PICKERS = ['#splash [data-dev="D"]', '.sp-card[data-dev="D"]', '.dpb button[data-d="D"]'];
  function findPicker() {
    for (var i = 0; i < PICKERS.length; i++) {
      var el = document.querySelector(PICKERS[i].replace('D', dev));
      if (el) return el;
    }
    return null;
  }
  function clickable(el) {
    if (!el.isConnected || !el.offsetParent) return false;
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.pointerEvents === 'none' || +cs.opacity < 0.9 || cs.visibility === 'hidden') return false;
    }
    return true;
  }
  function autoPick() {
    if (!fromHub) return;
    var t0 = Date.now(), seen = false;
    (function tick() {
      var el = findPicker();
      if (el) {
        seen = true;
        if (clickable(el)) {
          var rem = document.querySelector('#splRem,#spRem');
          if (rem) rem.checked = false; // the toolkit remembers the device, not the tool
          el.click();
          setTimeout(hideCover, 250);
          return;
        }
      }
      var waited = Date.now() - t0;
      if ((!seen && waited > 1500) || waited > 25000) { hideCover(); return; }
      setTimeout(tick, 120);
    })();
  }

  /* ---------- shortcut labels follow the chosen computer ---------- */
  var RULES = os === 'mac'
    ? [[/Ctrl\s*[\/·]\s*(⌘|Cmd)/g, '⌘'], [/Ctrl\s*\+\s*/g, '⌘'], [/\bCtrl\b/g, '⌘']]
    : [[/Ctrl\s*[\/·]\s*(⌘|Cmd)/g, 'Ctrl'], [/⌘\s*/g, 'Ctrl+']];
  function fix(s) { for (var i = 0; i < RULES.length; i++) s = s.replace(RULES[i][0], RULES[i][1]); return s; }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, svg: 1, SVG: 1 };
  /* typed text follows its own language: English from the left, Arabic from the right */
  var TXT = { text: 1, search: 1, email: 1, url: 1, '': 1 };
  function autoDir(el) {
    if (el.hasAttribute('dir')) return;
    if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && TXT[(el.getAttribute('type') || '').toLowerCase()])) {
      el.setAttribute('dir', 'auto');
      var a = getComputedStyle(el).textAlign;
      if (a === 'right' || a === 'start') el.style.textAlign = 'start';
    }
  }
  function dirs(node) {
    if (node.nodeType !== 1) return;
    if (node.matches && node.matches('input,textarea')) autoDir(node);
    if (node.querySelectorAll) [].forEach.call(node.querySelectorAll('input,textarea'), autoDir);
  }
  function walk(node) {
    if (os === 'phone') { dirs(node); return; }
    if (node.nodeType === 3) {
      var v = node.nodeValue;
      if ((v.indexOf('Ctrl') > -1 || v.indexOf('⌘') > -1) && !(node.parentNode && SKIP[node.parentNode.nodeName])) {
        var f = fix(v); if (f !== v) node.nodeValue = f;
      }
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.nodeName === 'INPUT' || node.nodeName === 'TEXTAREA') { autoDir(node); return; }
    if (SKIP[node.nodeName] || node.isContentEditable) return;
    var t = node.getAttribute('title');
    if (t && (t.indexOf('Ctrl') > -1 || t.indexOf('⌘') > -1)) node.setAttribute('title', fix(t));
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  /* ---------- work tracking: tells the toolkit a tool holds unsaved work ---------- */
  var dirty = false;
  function markDirty() {
    if (dirty || !framed) return;
    dirty = true;
    try { window.parent.postMessage({ type: 'jedhub:dirty' }, '*'); } catch (e) { }
  }
  function isWork(e) {
    var t = e.target;
    if (!t || !t.closest) return false;
    if (t.closest('#hubCover,#splash,.sp-step,#devPick,.dp,[data-hub-autosave]')) return false;
    return true;
  }
  document.addEventListener('change', function (e) { if (isWork(e) && e.target.type === 'file' && e.target.files && e.target.files.length) markDirty(); }, true);
  document.addEventListener('input', function (e) { if (isWork(e)) markDirty(); }, true);
  document.addEventListener('drop', function (e) { if (isWork(e) && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) markDirty(); }, true);
  document.addEventListener('paste', function (e) { if (isWork(e)) markDirty(); }, true);

  /* ---------- home button when a tool is opened on its own ---------- */
  function addHome() {
    if (framed || document.getElementById('hubHome')) return;
    var a = document.createElement('a');
    a.id = 'hubHome';
    a.href = '../../JEDCO Toolkit.html';
    a.title = 'الرجوع لأدوات مطارات جدة';
    a.innerHTML = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></svg><span>كل الأدوات</span>';
    a.addEventListener('click', function (e) {
      if (dirty && !window.__hubLeaveOk) {
        e.preventDefault();
        if (window.confirm('ممكن يكون عندك شغل ما انحفظ. احفظ ملفك قبل ما ترجع للرئيسية. ترجع الحين؟')) { window.__hubLeaveOk = true; location.href = a.href; }
      }
    });
    document.body.appendChild(a);
  }
  if (!framed) addEventListener('beforeunload', function (e) { if (dirty && !window.__hubLeaveOk) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- online-only features: mark a control with data-needs-online ---------- */
  function net() { root.classList.toggle('hub-offline', !navigator.onLine); }
  addEventListener('online', net); addEventListener('offline', net); net();

  function start() {
    addHome();
    walk(document.body);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') walk(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    autoPick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
