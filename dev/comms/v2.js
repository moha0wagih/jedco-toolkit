/* ==========================================================================
   مصمم التواصل الداخلي · v2.0
   1) start page: nothing opens by itself — an empty page with one «+»
   2) «مشاركة عبر Outlook» under the export menu: a new Outlook message with
      the editable design file (.jedco.json) attached and a short English text
   ========================================================================== */
(function () {
  'use strict';
  const q = id => document.getElementById(id);
  const IC = (n, sw) => svgIcon(n, sw || 1.8);
  const hasWork = () => { try { return !!(localStorage.getItem(KEY + 'boards') || localStorage.getItem(KEY + 'doc')); } catch (e) { return false; } };

  /* ---------------- start page ---------------- */
  const st = document.createElement('div'); st.id = 'v2Start'; st.setAttribute('role', 'dialog'); st.setAttribute('aria-label', 'صفحة البداية');
  st.innerHTML = `<div class="v2h"><span class="lg">${ASSETS.logo}</span>مصمم التواصل الداخلي</div>
  <div class="v2b">
    <button class="v2plus" type="button" data-v="plus" aria-label="تصميم جديد">${IC('plus', 1.6)}<span>تصميم جديد</span></button>
    <div class="v2new" role="group" aria-label="ايش تبي تصمم؟">
      <button class="v2c" data-v="blank">${IC('file-plus')}<span><b>إعلان جديد</b><small>القالب الرسمي للإعلانات الداخلية.</small></span></button>
      <button class="v2c" data-v="welcome">${IC('user')}<span><b>رسالة ترحيب</b><small>ترحيب بموظف جديد، بصورته واسمه ومسماه.</small></span></button>
      <button class="v2c" data-v="free">${IC('layers')}<span><b>تصميم حر بالطبقات</b><small>دليل أو إنفوجرافيك بمقاس تختاره.</small></span></button>
      <button class="v2c" data-v="word">${IC('file-text')}<span><b>من ملف وورد</b><small>ارفع الملف ويتوزع على القالب تلقائياً.</small></span></button>
      <button class="v2c" data-v="paste">${IC('clipboard-paste')}<span><b>من نص منسوخ</b><small>الصق نص الإيميل أو الملف ويتوزع.</small></span></button>
      <button class="v2c" data-v="open">${IC('folder-open')}<span><b>فتح ملف تصميم</b><small>ملف <bdi>.jedco.json</bdi> من جهازك أو من زميلك.</small></span></button>
    </div>
    <button class="v2back" data-v="back" type="button">${IC('arrow-right')}رجوع</button>
    <div class="v2t">أو افتح من شغلك المحفوظ</div>
    <div class="v2row" id="v2Row"></div>
  </div>
  <div class="v2sig">Designed by Mohammed Wagih · ${new Date().getFullYear()} · <b>${APP_VER}</b></div>`;
  document.body.appendChild(st);

  async function paintRow() {
    const row = q('v2Row'); let h = '';
    if (hasWork()) { let t = ''; try { t = docTitle(S.docs[S.active] || S.docs[0]); } catch (e) { } h += `<button class="v2o cont" data-v="cont">${IC('history')}كمّل آخر إعلان<bdi>${esc(t)}</bdi></button>`; }
    const lx = window.__lxApi && window.__lxApi.resumeInfo ? await window.__lxApi.resumeInfo() : null;
    if (lx) h += `<button class="v2o cont" data-v="contLx">${IC('layers')}كمّل تصميم الطبقات<bdi>${esc(lx.name)}</bdi></button>`;
    h += `<button class="v2o" data-v="lib">${IC('folder')}إعلاناتي</button><button class="v2o" data-v="lxLib">${IC('layers-3')}تصاميمي بالطبقات</button>`;
    row.innerHTML = h;
  }
  function show() { st.classList.remove('pick'); st.classList.add('on'); paintRow(); try { q('fileMenu').style.display = 'none'; q('expMenu').style.display = 'none'; } catch (e) { } try { const wm = q('wordModal'); if (wm && getComputedStyle(wm).display !== 'none') q('wmClose').click(); } catch (e) { } try { libClose(); } catch (e) { } try { if (typeof qaClose === 'function') qaClose(); } catch (e) { } }
  function hide() { st.classList.remove('on', 'pick'); requestAnimationFrame(() => { try { fit(); } catch (e) { } }); }
  // work that was left open (not saved in «إعلاناتي») is kept there before something new starts
  const norm = h => String(h || '').replace(/\s+/g, '').replace(/contenteditable="[^"]*"/g, '');
  function pristine() { try { const t = [docBlank(), docSample(), docWelcome()].map(norm); return S.docs.every(d => t.includes(norm(d.html))); } catch (e) { return false; } }
  async function secure() {
    try { commitActive(); if (hasWork() && libDirty() && !pristine()) { const ok = await libSave(true); if (ok) toast('حفظت شغلك السابق في «إعلاناتي»'); } } catch (e) { }
  }
  // a clean, empty announcement under the start page (the page stays up while a picker is open)
  async function blankBase() { await secure(); st._quiet = true; try { S.photoSrc = ASSETS.header; loadWorkspace([{ html: docBlank(), photo: ASSETS.header, extra: 0 }], null); } finally { st._quiet = false; } }
  st.addEventListener('click', async e => {
    const b = e.target.closest('[data-v]'); if (!b) return; const v = b.dataset.v;
    if (v === 'plus') { st.classList.add('pick'); setTimeout(() => { const c = st.querySelector('.v2c'); if (c) c.focus(); }, 30); return; }
    if (v === 'back') { st.classList.remove('pick'); return; }
    if (v === 'cont') { hide(); return; }
    if (v === 'contLx') { const ok = await window.__lxApi.resumeLX(); if (ok) hide(); else { toast('ما لقيت تصميم الطبقات'); paintRow(); } return; }
    if (v === 'blank' || v === 'welcome') { await secure(); hide(); newWorkspace(v); return; }
    if (v === 'free') { await blankBase(); window.__lxApi.newModal(); return; }        // the layers screen covers the page once a size is picked
    if (v === 'lxLib') { window.__lxApi.libModal(); return; }
    if (v === 'lib') { await blankBase(); hide(); libOpen(); return; }
    if (v === 'word') { q('fileWord').click(); return; }
    if (v === 'paste') { await blankBase(); openPaste('الصق نص الإعلان وأنا أوزعه على التصميم.'); return; }
    if (v === 'open') { q('fileProj').click(); return; }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && st.classList.contains('on') && st.classList.contains('pick')) st.classList.remove('pick'); });
  // a file picked from the start page: start from a clean page, then the tool fills it
  q('fileWord').addEventListener('change', e => { if (st.classList.contains('on') && e.target.files && e.target.files.length) { blankBase().then(hide); } }, true);
  q('fileProj').addEventListener('change', e => { if (st.classList.contains('on') && e.target.files && e.target.files.length) secure().then(hide); }, true);
  // anything that opens a design hides the start page
  const _lw = loadWorkspace; loadWorkspace = function () { const r = _lw.apply(this, arguments); if (!st._quiet) hide(); return r; };
  new MutationObserver(() => { if (document.body.classList.contains('lx-on')) hide(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  q('wmPasteGo') && q('wmPasteGo').addEventListener('click', () => hide());
  // dropping a design file on the tool
  document.addEventListener('drop', e => { if (st.classList.contains('on') && [...(e.dataTransfer?.files || [])].some(f => /\.(json|zip|docx)$/i.test(f.name))) secure().then(hide); }, true);
  // File menu: «صفحة البداية»
  q('fileMenu').addEventListener('click', e => { const b = e.target.closest('[data-v2]'); if (!b) return; q('fileMenu').style.display = 'none'; if (b.dataset.v2 === 'start') show(); });
  window.v2Start = { show, hide };
  // every open starts here
  show();

  /* ---------------- share by Outlook ---------------- */
  const em = q('expMenu');
  if (em) {
    em.querySelectorAll('[data-exp="openDesign"]').forEach(x => x.remove());   // opening lives in «ملف»
    const hr = document.createElement('hr'); em.appendChild(hr);
    const b = document.createElement('button'); b.className = 'v2share'; b.dataset.v2exp = 'share';
    b.innerHTML = `${IC('mail')}<span><b>مشاركة عبر Outlook</b><small>رسالة جديدة فيها ملف التصميم، يفتحه زميلك في مصمم التواصل الداخلي ويكمل عليه</small></span>`;
    em.appendChild(b);
    em.addEventListener('click', e => { if (!e.target.closest('[data-v2exp]')) return; em.style.display = 'none'; share(); });
  }
  async function share() {
    if (!window.JEDMAIL) { toast('ميزة المشاركة ما انحملت، افتح الأداة من «أدوات مطارات جدة»'); return; }
    let o; try { o = designFile(); } catch (e) { console.error(e); toast('تعذّر تجهيز ملف التصميم'); return; }
    const name = fileBase() + DF.ext;
    const title = (o.boards && o.boards[0] && o.boards[0].title) || 'Announcement';
    const blob = new Blob([JSON.stringify(o)], { type: 'application/json' });
    const body = `Hi,\n\nPlease find attached the design file "${name}".\n\nTo open and edit it: Internal Comms Designer > File > Open a file from your device.\n\nBest regards,`;
    try { await JEDMAIL.draft({ subject: `Design file: ${title}`, body, fileName: fileBase(), files: [{ name, blob }] }); }
    catch (e) { console.error(e); toast('تعذّر تجهيز الرسالة'); }
  }
  window.v2Share = share;

  /* any open menu stays fully on screen (the export menus sit at the far edge of the bar) */
  function keepIn(m) {
    if (!m || !m.offsetParent) return;
    m.style.transform = '';
    const r = m.getBoundingClientRect(), pad = 8; let dx = 0;
    if (r.left < pad) dx = pad - r.left; else if (r.right > innerWidth - pad) dx = innerWidth - pad - r.right;
    if (dx) m.style.transform = `translateX(${Math.round(dx)}px)`;
  }
  const watch = () => document.querySelectorAll('#expMenu,#fileMenu,#lxExpM,#lxFileM').forEach(m => { if (m._kp) return; m._kp = true; new MutationObserver(() => keepIn(m)).observe(m, { attributes: true, attributeFilter: ['style', 'class'] }); });
  watch(); new MutationObserver(watch).observe(document.body, { childList: true, subtree: true });
  addEventListener('resize', () => document.querySelectorAll('#expMenu,#fileMenu,#lxExpM,#lxFileM').forEach(keepIn));
})();
