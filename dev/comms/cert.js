/* ==========================================================================
   مصمم التواصل الداخلي · build 34 — قالب الشهادات (شكر وتقدير)
   The official certificate stays fixed; the user only picks the language and
   the logo, writes the text / name, and attaches the signature.
   One drawing routine paints the preview and every export, so what you see is
   exactly what you get.  Design units = the template's own pixels (3588 × 2590).
   ========================================================================== */
(function () {
  'use strict';
  const A = window.CERT_ASSETS || {};
  const W = 3588, H = 2590;                       // 10936288 × 7894638 EMU ÷ 3048
  const PT = W / (10936288 / 12700);              // design px per point (≈4.167)
  const INK = '#111D40', NAVY_BOX = '#0E1D40', TXT = '#002060', TITLE = '#192955';
  const CK = (typeof KEY === 'string' ? KEY : 'jedIC2_') + 'cert';
  const q = id => document.getElementById(id);
  const IC = (n, sw) => svgIcon(n, sw || 1.8);
  const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const DEF = {
    ar: { l1: 'يسر شركة مطارات جدة أن تمنحكم هذه الشهادة، تقديرًا لجهودكم الاستثنائية ودوركم الفاعل في', l2: 'تحقيق الشهادات والاعتمادات والجوائز الدولية', l3: 'والتي أسهمت في تعزيز مكانة الشركة وتنافسيتها على المستوى العالمي.', c1: 'الرئيس التنفيذي لشركة مطارات جدة', c2: 'المهندس مازن جوهر' },
    en: { l1: 'Jeddah Airports Company is pleased to present this certificate in recognition of your exceptional efforts and valuable contribution to achieving', l2: 'International Certifications, Accreditations, and Awards', l3: 'that have strengthened the Company’s global standing and competitiveness.', c1: 'Chief Executive Officer, Jeddah Airports Company', c2: 'Eng. Mazen Johar' },
  };
  const fresh = () => ({ lang: 'ar', logo: 'full', ar: Object.assign({ name: '' }, DEF.ar), en: Object.assign({ name: '' }, DEF.en), many: false, names: '', sigScale: 1, navy: true });
  let st = fresh(), sig = null, sigImg = null;   // sig = dataURL of the uploaded (cleaned) signature; null = the default one

  /* ---------------- images ---------------- */
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const IMG = {};
  // the bilingual logo of the tool, split into its Arabic and English halves
  function logoSVG(part) {
    const src = (typeof ASSETS !== 'undefined' && ASSETS.logo) || ''; const paths = src.match(/<path[^>]*\/>/g) || [];
    const keep = paths.filter(p => { const d = (p.match(/ d="([^"]*)"/) || [])[1] || ''; const ys = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => +m[2]); if (!ys.length) return false; const mn = Math.min(...ys), mx = Math.max(...ys); return part === 'full' || (part === 'ar' ? mx < 34 : mn > 34.5); }).map(p => p.replace(/fill="[^"]*"/, 'fill="#ffffff"'));
    const vb = part === 'ar' ? '23.2 22.3 70.4 11' : part === 'en' ? '23.2 35.7 70.4 9' : '23.2 22.3 70.4 22.4';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="1408" height="${Math.round(1408 * vb.split(' ')[3] / 70.4)}">${keep.join('')}</svg>`);
  }
  let ready = null;
  function prepare() {
    if (ready) return ready;
    ready = (async () => {
      const [bg, tAr, sDef, lf, la, le] = await Promise.all([loadImg(A.bg), loadImg(A.titleAr), loadImg(A.sig), loadImg(logoSVG('full')), loadImg(logoSVG('ar')), loadImg(logoSVG('en'))]);
      Object.assign(IMG, { bg, tAr, sDef, logo: { full: lf, ar: la, en: le } });
      try { await Promise.all(['400 40px Tajawal', '700 40px Tajawal', '400 40px Sequel', '400 40px FSI'].map(f => document.fonts.load(f))); } catch (e) { }
    })();
    return ready;
  }

  /* ---------------- drawing ---------------- */
  function wrap(ctx, text, maxW) {
    const out = []; String(text || '').split(/\n/).forEach(par => {
      const words = par.trim().split(/\s+/).filter(Boolean); let line = '';
      words.forEach(w => { const t = line ? line + ' ' + w : w; if (line && ctx.measureText(t).width > maxW) { out.push(line); line = w; } else line = t; });
      if (line) out.push(line);
    });
    return out;
  }
  function draw(ctx, s, nameOverride, preview) {
    const L = s[s.lang], ar = s.lang === 'ar', cx = W / 2;
    ctx.save(); ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(IMG.bg, 0, 0, W, H);
    // logo box (navy) — same box for every logo choice
    const bx = 1465, by = 53, bw = 657, bh = 300; ctx.fillStyle = NAVY_BOX; ctx.fillRect(bx, by, bw, bh);
    const lg = IMG.logo[s.logo] || IMG.logo.full; const lw = s.logo === 'full' ? 560 : 540; const lgh = lw * lg.height / lg.width;
    ctx.drawImage(lg, bx + (bw - lw) / 2, by + (bh - lgh) / 2, lw, lgh);
    // title
    if (ar) { const t = IMG.tAr; ctx.drawImage(t, cx - t.width / 2, 570 - t.height / 2); }
    else { ctx.fillStyle = TITLE; ctx.font = `400 ${Math.round(24 * PT)}px Sequel`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'ltr'; ctx.fillText('Certificate of Appreciation', cx, 572); }
    // body: three paragraphs, the middle one bold; shrinks a little if it gets long
    ctx.direction = ar ? 'rtl' : 'ltr'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = TXT;
    const fam = ar ? 'Tajawal' : 'FSI', maxW = ar ? 2812 : 2880;
    const paras = [[L.l1, 400], [L.l2, 700], [L.l3, 400]].filter(p => String(p[0] || '').trim());
    let fs = 16 * PT, lines;
    const lay = () => { lines = []; paras.forEach(([t, wgt]) => { ctx.font = `${wgt} ${fs}px ${fam}`; wrap(ctx, t, maxW).forEach(l => lines.push([l, wgt])); }); return lines.length * fs * 1.26; };
    while (lay() > 420 && fs > 12 * PT) fs -= 1;
    const lh = fs * 1.26; let y = 828 + lh / 2;
    lines.forEach(([l, wgt]) => { ctx.font = `${wgt} ${fs}px ${fam}`; ctx.fillText(l, cx, y); y += lh; });
    const push = Math.max(0, (y - lh / 2) - 1240);     // only when the text runs past the template's space
    // name
    const nm = (nameOverride != null ? nameOverride : L.name || '').trim();
    ctx.font = `700 ${Math.round(16 * PT)}px ${fam}`;
    if (nm) { ctx.fillStyle = TXT; ctx.fillText(nm, cx, 1352 + push); }
    else if (preview) { ctx.fillStyle = '#9aa7ba'; ctx.font = `400 ${Math.round(14 * PT)}px ${fam}`; ctx.fillText(ar ? '"الاسم"' : 'Name', cx, 1352 + push); }
    // signature (fits a fixed box, centred) + the two caption lines
    const sg = sigImg || IMG.sDef; const k = Math.min(640 / sg.width, 250 / sg.height) * (s.sigScale || 1);
    const sw = sg.width * k, sh = sg.height * k; ctx.drawImage(sg, cx - sw / 2, 1836 + push - sh, sw, sh);
    ctx.fillStyle = INK; ctx.font = `700 ${ar ? 37 : 30}px ${ar ? 'Tajawal' : 'FSI'}`;
    if (L.c1) ctx.fillText(L.c1, cx, 1872 + push);
    if (L.c2) ctx.fillText(L.c2, cx, 1920 + push);
    ctx.restore();
  }

  /* ---------------- signature clean-up: white paper → transparent, ink → navy ---------------- */
  async function cleanSignature(file) {
    const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
    const im = await loadImg(url); const sc = Math.min(1, 1800 / Math.max(im.width, im.height));
    const w = Math.max(1, Math.round(im.width * sc)), h = Math.max(1, Math.round(im.height * sc));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h), p = d.data, n = w * h;
    const lum = new Float32Array(n); let opaque = 0;
    for (let i = 0; i < n; i++) { lum[i] = 0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2]; if (p[i * 4 + 3] > 250) opaque++; }
    const hasAlpha = opaque < n * 0.97;
    const sorted = Float32Array.from(lum).sort(); const paper = sorted[Math.floor(n * 0.6)], ink = sorted[Math.floor(n * 0.005)];
    const span = Math.max(40, paper - ink);
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let i = 0; i < n; i++) {
      let a = hasAlpha ? p[i * 4 + 3] / 255 : Math.max(0, Math.min(1, (paper - 12 - lum[i]) / (span * 0.6)));
      a = a < 0.06 ? 0 : a; p[i * 4 + 3] = Math.round(a * 255);
      if (a > 0.15) { const X = i % w, Y = (i / w) | 0; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
    }
    if (x1 < 0) throw new Error('empty');
    x.putImageData(d, 0, 0);
    const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return { raw: o.toDataURL('image/png') };
  }
  // navy option: keep the strokes' shape (alpha), paint them the template's ink colour
  async function sigFrom(raw) {
    if (!raw) { sigImg = null; return; }
    const im = await loadImg(raw); if (!st.navy) { sigImg = im; return; }
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = INK; x.fillRect(0, 0, c.width, c.height);
    sigImg = c;
  }

  /* ---------------- saving the state (per viewer, best effort) ---------------- */
  let saveT = 0;
  function persist() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(CK, JSON.stringify(st)); } catch (e) { } try { if (sig) localStorage.setItem(CK + '_sig', sig); else localStorage.removeItem(CK + '_sig'); } catch (e) { } }, 600); }
  function restore() { try { const o = JSON.parse(localStorage.getItem(CK) || 'null'); if (o && o.ar && o.en) st = Object.assign(fresh(), o, { ar: Object.assign({}, DEF.ar, { name: '' }, o.ar), en: Object.assign({}, DEF.en, { name: '' }, o.en) }); } catch (e) { } try { sig = localStorage.getItem(CK + '_sig') || null; } catch (e) { sig = null; } }

  /* ---------------- UI ---------------- */
  const root = document.createElement('div'); root.id = 'crt'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'قالب الشهادات');
  root.innerHTML = `
  <div class="crtTop">
    <button class="crtBack" data-c="close" title="رجوع">${IC('arrow-right', 2)}<span>رجوع</span></button>
    <div class="crtTitle">${IC('award', 1.9)}<span>شهادة شكر وتقدير</span></div>
    <div class="crtSp"></div>
    <button class="crtB" data-c="open" title="فتح ملف شهادة محفوظ (.jedco.json)">${IC('folder-open')}<span>فتح</span></button>
    <button class="crtB" data-c="save" title="حفظ ملف الشهادة القابل للتعديل (.jedco.json)">${IC('save')}<span>حفظ الملف</span></button>
    <div class="crtRel"><button class="crtB pri" data-c="exp">${IC('download', 2)}<span>تصدير</span></button>
      <div class="crtMenu" id="crtExp">
        <button data-c="png">${IC('image')}<span>صورة PNG<small>دقة طباعة 3588 × 2590</small></span></button>
        <button data-c="pdf">${IC('file-text')}<span>PDF للطباعة<small>صفحة بمقاس الشهادة</small></span></button>
        <div class="crtMany"><button data-c="pdfAll">${IC('files')}<span>PDF لكل الأسماء<small>صفحة لكل اسم</small></span></button>
        <button data-c="zipAll">${IC('folder-down')}<span>صور PNG لكل الأسماء<small>ملف مضغوط</small></span></button></div>
      </div></div>
  </div>
  <div class="crtMain">
    <aside class="crtPanel">
      <label class="crtL">لغة الشهادة</label>
      <div class="crtSeg" data-k="lang"><button data-v="ar">عربي</button><button data-v="en">English</button></div>
      <label class="crtL">الشعار</label>
      <div class="crtLogos" data-k="logo">
        <button data-v="full"><span class="lgv"><img alt=""></span><small>الكامل</small></button>
        <button data-v="ar"><span class="lgv"><img alt=""></span><small>مطارات جدة</small></button>
        <button data-v="en"><span class="lgv"><img alt=""></span><small>jeddah airports</small></button>
      </div>
      <div class="crtSec">النص</div>
      <label class="crtL">بداية النص</label><textarea data-f="l1" rows="3"></textarea>
      <label class="crtL">السطر العريض (سبب التكريم)</label><textarea data-f="l2" rows="2"></textarea>
      <label class="crtL">ختام النص</label><textarea data-f="l3" rows="2"></textarea>
      <button class="crtLink" data-c="resetText">${IC('rotate-ccw')}إرجاع نص القالب</button>
      <div class="crtSec">الاسم</div>
      <div class="crtSeg sm" data-k="many"><button data-v="0">اسم واحد</button><button data-v="1">عدة أسماء</button></div>
      <input type="text" data-f="name" class="crtOne" placeholder="اسم المكرَّم">
      <div class="crtList"><textarea id="crtNames" rows="6" placeholder="اكتب كل اسم في سطر…"></textarea><div class="crtHint" id="crtCount"></div>
        <div class="crtNav"><button data-c="prev" title="السابق">${IC('chevron-right', 2)}</button><span id="crtWho"></span><button data-c="next" title="التالي">${IC('chevron-left', 2)}</button></div></div>
      <div class="crtSec">التوقيع</div>
      <div class="crtDrop" id="crtDrop" tabindex="0"><img id="crtSigPrev" alt=""><div><b>اضغط أو اسحب صورة التوقيع</b><small>صورة على ورقة بيضاء أو PNG — تنشال الخلفية تلقائياً</small></div></div>
      <input type="file" id="crtSigFile" accept="image/*" hidden><input type="file" id="crtProjFile" accept=".json,application/json" hidden>
      <label class="crtChk"><input type="checkbox" id="crtNavy"> تلوين التوقيع بكحلي الهوية</label>
      <label class="crtL">حجم التوقيع</label><div class="crtRange">أصغر<input type="range" id="crtSz" min="0.6" max="1.4" step="0.01">أكبر</div>
      <button class="crtLink" data-c="sigDef">${IC('rotate-ccw')}الرجوع للتوقيع الأصلي</button>
      <label class="crtL">تحت التوقيع — السطر الأول</label><input type="text" data-f="c1">
      <label class="crtL">تحت التوقيع — السطر الثاني</label><input type="text" data-f="c2">
      <div class="crtSig">Designed by Mohammed Wagih · ${typeof APP_VER === 'string' ? APP_VER : ''}</div>
    </aside>
    <div class="crtStage" id="crtStage"><canvas id="crtCv" width="1794" height="1295"></canvas></div>
  </div>`;
  document.body.appendChild(root);
  const cv = q('crtCv'), cx2 = cv.getContext('2d');
  let curIdx = 0, prevMode = null;

  const names = () => String(st.names || '').split(/\n/).map(s => s.trim()).filter(Boolean);
  function curName() { if (!st.many) return st[st.lang].name || ''; const N = names(); if (!N.length) return ''; curIdx = Math.max(0, Math.min(N.length - 1, curIdx)); return N[curIdx]; }

  let raf = 0;
  function paint() { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (!IMG.bg) return; cx2.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0); draw(cx2, st, curName(), true); }); }
  function fitStage() { const sg = q('crtStage'); const r = sg.getBoundingClientRect(); const pad = 28; const k = Math.min((r.width - pad * 2) / W, (r.height - pad * 2) / H); cv.style.width = Math.max(120, W * k) + 'px'; cv.style.height = Math.max(87, H * k) + 'px'; }

  function syncUI() {
    const L = st[st.lang], ar = st.lang === 'ar';
    root.querySelectorAll('[data-k]').forEach(g => { const v = g.dataset.k === 'many' ? (st.many ? '1' : '0') : st[g.dataset.k]; g.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === v)); });
    root.querySelectorAll('[data-f]').forEach(f => { f.value = L[f.dataset.f] || ''; f.dir = ar ? 'rtl' : 'ltr'; });
    root.querySelector('.crtOne').placeholder = ar ? 'اسم المكرَّم' : 'Recipient name';
    q('crtNames').value = st.names || ''; q('crtNames').dir = ar ? 'rtl' : 'ltr';
    root.classList.toggle('many', !!st.many); q('crtNavy').checked = !!st.navy; q('crtSz').value = st.sigScale || 1;
    q('crtSigPrev').src = sig || A.sig; root.classList.toggle('custom', !!sig);
    updCount();
  }
  function updCount() { const N = names(); q('crtCount').textContent = N.length ? `${N.length} ${N.length === 1 ? 'اسم' : N.length === 2 ? 'اسمين' : N.length <= 10 ? 'أسماء' : 'اسم'}` : 'ما فيه أسماء للحين'; curIdx = Math.max(0, Math.min(N.length - 1, curIdx)); q('crtWho').textContent = N.length ? `${curIdx + 1} / ${N.length}` : '—'; root.querySelector('.crtNav').style.visibility = N.length > 1 ? 'visible' : 'hidden'; }
  const changed = () => { persist(); paint(); };

  root.addEventListener('click', async e => {
    const seg = e.target.closest('[data-k] [data-v]');
    if (seg) { const k = seg.closest('[data-k]').dataset.k, v = seg.dataset.v; if (k === 'many') st.many = v === '1'; else st[k] = v; syncUI(); changed(); return; }
    const b = e.target.closest('[data-c]'); if (!b) { if (!e.target.closest('.crtRel')) q('crtExp').classList.remove('on'); return; }
    const c = b.dataset.c; if (c !== 'exp') q('crtExp').classList.remove('on');
    if (c === 'close') return close();
    if (c === 'exp') { q('crtExp').classList.toggle('on'); return; }
    if (c === 'resetText') { const L = st[st.lang], D = DEF[st.lang]; L.l1 = D.l1; L.l2 = D.l2; L.l3 = D.l3; syncUI(); changed(); toast('رجع نص القالب'); return; }
    if (c === 'sigDef') { sig = null; await sigFrom(null); syncUI(); changed(); toast('رجع التوقيع الأصلي'); return; }
    if (c === 'prev' || c === 'next') { curIdx += c === 'next' ? 1 : -1; updCount(); paint(); return; }
    if (c === 'png') return exportOne('png');
    if (c === 'pdf') return exportOne('pdf');
    if (c === 'pdfAll') return exportAll('pdf');
    if (c === 'zipAll') return exportAll('zip');
    if (c === 'save') return saveFile();
    if (c === 'open') return q('crtProjFile').click();
  });
  root.addEventListener('input', e => {
    const f = e.target.closest('[data-f]'); if (f) { st[st.lang][f.dataset.f] = f.value; return changed(); }
    if (e.target.id === 'crtNames') { st.names = e.target.value; updCount(); return changed(); }
    if (e.target.id === 'crtSz') { st.sigScale = +e.target.value; return changed(); }
  });
  q('crtNavy').addEventListener('change', async e => { st.navy = e.target.checked; await sigFrom(sig); changed(); });
  // logo thumbnails
  prepare().then(() => { root.querySelectorAll('.crtLogos [data-v] img').forEach(i => { i.src = logoSVG(i.closest('[data-v]').dataset.v); }); }).catch(() => { });

  // signature upload: click, keyboard, drag & drop, paste
  const drop = q('crtDrop');
  drop.addEventListener('click', () => q('crtSigFile').click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); q('crtSigFile').click(); } });
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) takeSig(f); });
  q('crtSigFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) takeSig(f); });
  addEventListener('paste', e => { if (!root.classList.contains('on') || /^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName || '')) return; const it = [...(e.clipboardData ? e.clipboardData.items : [])].find(i => i.type.startsWith('image/')); if (it) { e.preventDefault(); takeSig(it.getAsFile()); } });
  async function takeSig(f) {
    if (!f || !/^image\//.test(f.type)) { toast('اختر صورة (PNG أو JPG)'); return; }
    busy(true, 'أجهّز التوقيع…');
    try { const r = await cleanSignature(f); sig = r.raw; await sigFrom(sig); syncUI(); changed(); toast('تم إرفاق التوقيع وإزالة خلفيته'); }
    catch (e) { console.error(e); toast('ما قدرت أقرأ التوقيع من الصورة — جرّب صورة أوضح على ورقة بيضاء'); }
    busy(false);
  }

  /* ---------------- export ---------------- */
  function busy(on, m) { const b = q('busy'); if (!b) return; if (on) { b.textContent = m || 'جاري التصدير…'; b.style.display = 'flex'; } else b.style.display = 'none'; }
  function canvasFor(name) { const c = document.createElement('canvas'); c.width = W; c.height = H; draw(c.getContext('2d'), st, name, false); return c; }
  const toBlob = (c, type, qy) => new Promise(ok => c.toBlob(ok, type, qy));
  const safe = s => String(s || '').trim().slice(0, 50).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ');
  const baseName = n => `${st.lang === 'ar' ? 'شهادة شكر وتقدير' : 'Certificate of Appreciation'}${n ? ' - ' + safe(n) : ''}`;
  async function save(name, blob) { if (typeof saveOut === 'function') return saveOut(name, blob); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000); return true; }
  function checkName(n) { if (n) return true; toast(st.lang === 'ar' ? 'اكتب اسم المكرَّم أول' : 'اكتب الاسم أول (Name)'); const f = st.many ? q('crtNames') : root.querySelector('.crtOne'); f.focus(); return false; }

  // a small PDF writer: one full-page JPEG per page, page = the certificate's own size
  async function makePDF(canvases) {
    const enc = new TextEncoder(); const parts = []; const offs = []; let len = 0;
    const add = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (i, body) => { offs[i] = len; add(`${i} 0 obj\n`); body(); add('\nendobj\n'); };
    const pw = (10936288 / 12700).toFixed(2), ph = (7894638 / 12700).toFixed(2), n = canvases.length;
    add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const kids = []; for (let i = 0; i < n; i++) kids.push(`${3 + i * 3} 0 R`);
    obj(1, () => add('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => add(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${n} >>`));
    for (let i = 0; i < n; i++) {
      const jpg = new Uint8Array(await (await toBlob(canvases[i], 'image/jpeg', 0.93)).arrayBuffer());
      const p = 3 + i * 3, im = p + 1, cs = p + 2; const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
      obj(p, () => add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${cs} 0 R >>`));
      obj(im, () => { add(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); add(jpg); add('\nendstream'); });
      obj(cs, () => add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    }
    const total = 3 + n * 3, xref = len;
    let x = `xref\n0 ${total}\n0000000000 65535 f \n`; for (let i = 1; i < total; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    add(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: 'application/pdf' });
  }
  async function exportOne(kind) {
    const n = curName(); if (!checkName(n)) return;
    busy(true); await prepare(); await new Promise(r => setTimeout(r, 30));
    try { const c = canvasFor(n); const blob = kind === 'png' ? await toBlob(c, 'image/png') : await makePDF([c]); if (await save(baseName(n) + (kind === 'png' ? '.png' : '.pdf'), blob)) toast(kind === 'png' ? 'تم تصدير الشهادة PNG' : 'تم تصدير الشهادة PDF'); }
    catch (e) { console.error(e); toast('تعذّر التصدير: ' + e.message); }
    busy(false);
  }
  async function exportAll(kind) {
    const N = names(); if (!N.length) { toast('اكتب الأسماء أول — كل اسم في سطر'); q('crtNames').focus(); return; }
    await prepare();
    try {
      if (kind === 'pdf') {
        const cs = []; for (let i = 0; i < N.length; i++) { busy(true, `أجهّز الشهادة ${i + 1} من ${N.length}…`); await new Promise(r => setTimeout(r, 0)); cs.push(canvasFor(N[i])); }
        busy(true, 'أجمع ملف PDF…'); const blob = await makePDF(cs); if (await save(baseName('') + ` (${N.length}).pdf`, blob)) toast(`تم: ملف PDF فيه ${N.length} شهادة`);
      } else {
        let Z; try { Z = typeof needZip === 'function' ? await needZip() : window.JSZip; } catch (e) { } if (!Z) { toast('مكتبة الضغط ما انحملت — استخدم «PDF لكل الأسماء»'); return; }
        const z = new Z(); const used = {};
        for (let i = 0; i < N.length; i++) { busy(true, `أجهّز الشهادة ${i + 1} من ${N.length}…`); await new Promise(r => setTimeout(r, 0)); let fn = baseName(N[i]); used[fn] = (used[fn] || 0) + 1; if (used[fn] > 1) fn += ` (${used[fn]})`; z.file(fn + '.png', await toBlob(canvasFor(N[i]), 'image/png')); }
        busy(true, 'أضغط الملفات…'); const blob = await z.generateAsync({ type: 'blob' }); if (await save(baseName('') + ` (${N.length}).zip`, blob)) toast(`تم: ${N.length} شهادة PNG في ملف مضغوط`);
      }
    } catch (e) { console.error(e); toast('تعذّر التصدير: ' + e.message); }
    busy(false);
  }

  /* ---------------- editable file (.jedco.json) ---------------- */
  async function saveFile() {
    const o = { app: 'jedco-cert', format: 'jedco-comms-design', version: 1, saved: new Date().toISOString(), cert: st, sig: sig || null };
    const n = st.many ? '' : st[st.lang].name;
    if (await save(baseName(n) + '.jedco.json', new Blob([JSON.stringify(o)], { type: 'application/json' }))) toast('حفظت ملف الشهادة — تقدر تفتحه وتعدّل عليه بعدين');
  }
  async function openObj(o) {
    const c = o.cert || {}; st = Object.assign(fresh(), c, { ar: Object.assign({}, DEF.ar, { name: '' }, c.ar), en: Object.assign({}, DEF.en, { name: '' }, c.en) });
    sig = typeof o.sig === 'string' && /^data:image\//.test(o.sig) ? o.sig : null; curIdx = 0;
    await open(); await sigFrom(sig); syncUI(); changed(); toast('فتحت ملف الشهادة');
  }
  q('crtProjFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const r = new FileReader(); r.onload = () => { let o = null; try { o = JSON.parse(r.result); } catch (err) { } if (o && o.app === 'jedco-cert') openObj(o); else toast('هذا مو ملف شهادة — افتحه من «ملف ▸ فتح» في المصمم'); }; r.readAsText(f); });
  // the editor's own «open design file» door also accepts certificate files
  if (typeof openDesignText === 'function') { const prevOpen = openDesignText; openDesignText = function (txt, name, confirm) { let o = null; try { o = JSON.parse(txt); } catch (e) { } if (o && o.app === 'jedco-cert') { openObj(o); return; } return prevOpen.apply(this, arguments); }; }

  /* ---------------- open / close ---------------- */
  async function open() {
    if (!root.classList.contains('on')) { root.classList.add('on'); document.body.classList.add('crt-on'); }
    busy(true, 'أجهّز القالب…');
    try { await prepare(); } catch (e) { console.error(e); toast('تعذّر تحميل قالب الشهادة'); }
    busy(false); fitStage(); paint();
  }
  async function start() { restore(); await sigFrom(sig).catch(() => { sig = null; sigImg = null; }); syncUI(); await open(); }
  function close() { root.classList.remove('on'); document.body.classList.remove('crt-on'); q('crtExp').classList.remove('on'); try { fit(); } catch (e) { } }
  addEventListener('resize', () => { if (root.classList.contains('on')) { fitStage(); } });
  addEventListener('keydown', e => { if (!root.classList.contains('on')) return; if (e.key === 'Escape') { if (q('crtExp').classList.contains('on')) q('crtExp').classList.remove('on'); else close(); } if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.stopImmediatePropagation(); saveFile(); } }, true);

  /* ---------------- entry points: start page card + file menu ---------------- */
  function hookEntries() {
    const grid = document.querySelector('#v2Start .v2new');
    if (grid && !grid.querySelector('[data-crt]')) {
      const b = document.createElement('button'); b.className = 'v2c'; b.dataset.crt = '1'; b.type = 'button';
      b.innerHTML = `${IC('award')}<span><b>شهادة شكر وتقدير</b><small>القالب الرسمي: ترفق التوقيع وتكتب النص والاسم.</small></span>`;
      const w = grid.querySelector('[data-v="welcome"]'); w ? w.after(b) : grid.appendChild(b);
      b.addEventListener('click', e => { e.stopPropagation(); start(); });
    }
    const fm = q('fileMenu');
    if (fm && !fm.querySelector('[data-crt]')) {
      const w = fm.querySelector('[data-act="welcome"]'); const b = document.createElement('button'); b.dataset.crt = '1';
      b.innerHTML = fm.classList.contains('lxMenu') ? `${IC('award', 1.9)}<span>شهادة شكر وتقدير</span>` : 'شهادة شكر وتقدير (قالب الشهادات)';
      w ? w.after(b) : fm.appendChild(b);
      b.addEventListener('click', e => { e.stopPropagation(); fm.style.display = 'none'; start(); });
    }
  }
  hookEntries(); [300, 1200, 3000].forEach(t => setTimeout(hookEntries, t));
  const fmEl = q('fileMenu'); if (fmEl) new MutationObserver(() => { if (!fmEl.querySelector('[data-crt]')) hookEntries(); }).observe(fmEl, { childList: true });

  window.__certApi = { start, open, close, draw, state: () => st, openObj, makePDF, canvasFor, prepare };
})();
