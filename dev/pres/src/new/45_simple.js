/* ==========================================================================
   صانع العروض 2 — «بسيط» و«متقدم»
   The editor opens calm: the slides, the slide, one place for designs and the
   few tools everyone needs. «متقدم» brings every tool back. Nothing is removed,
   the choice is remembered on this device.
   ========================================================================== */
(function (PM) {
'use strict';
const KEY = 'pm.ui.mode';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const M = PM.Mode = { cur: 'simple' };
const SIMPLE_TABS = ['design', 'insert', 'photos'];
M.set = function (mode, o = {}) {
  M.cur = mode === 'adv' ? 'adv' : 'simple';
  try { localStorage.setItem(KEY, M.cur); } catch (e) { }
  const app = $('#app'); if (!app) return;
  app.classList.toggle('pm-simple', M.cur === 'simple');
  $$('#segMode button').forEach(b => b.classList.toggle('on', b.dataset.v === M.cur));
  const mi = $('#mFile [data-a="mode"] span'); if (mi) mi.textContent = M.cur === 'simple' ? 'أظهر كل الأدوات (متقدم)' : 'واجهة بسيطة';
  // a tab that the simple view does not show hands over to «التصميم»
  if (M.cur === 'simple' && PM.UI && PM.UI.tab && !SIMPLE_TABS.includes(PM.UI.tab)) { const b = $('#tabs [data-t="design"]'); if (b) b.click(); }
  if (PM.ST.deck && PM.Ed && PM.Ed.fit) setTimeout(() => PM.Ed.fit(), 30);
  if (o.say && PM.UI) PM.UI.toast(M.cur === 'simple' ? 'واجهة بسيطة: الأساسيات فقط. كل الأدوات ترجع من «متقدم»' : 'واجهة متقدمة: كل الأدوات ظاهرة', 3200);
};
M.mount = function () {
  let saved = null; try { saved = localStorage.getItem(KEY); } catch (e) { }
  $$('#segMode button').forEach(b => b.onclick = () => M.set(b.dataset.v, { say: true }));
  const mi = $('#mFile [data-a="mode"]');
  if (mi) mi.addEventListener('click', e => { e.stopPropagation(); $('#mFile').classList.add('hide'); M.set(M.cur === 'simple' ? 'adv' : 'simple', { say: true }); });
  M.set(saved || 'simple');
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(M.mount, 0)); else setTimeout(M.mount, 0);
})(window.PM);
