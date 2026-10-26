/* ==========================================================================
   صانع العروض 2 — the tool's brain
   · «توجيه»: select anything (or nothing = the whole slide), write what you
     want; the tool does it itself, or prepares one Copilot paste for wording
   · «رأي الأداة»: an honest review of the slide with one-click fixes
   · «قصة العرض»: the deck as a story, and a better story for a stated goal
   · find & replace, approved terminal names, format painter, pin
   ========================================================================== */
(function (PM) {
'use strict';
const ST = PM.ST, K = PM.K;
const B = PM.Brain = {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = PM.esc;
const deck = () => ST.deck;
const cur = () => ST.deck && ST.deck.slides[ST.cur];
const ic = n => PM.UI.ic(n);
const plain = t => PM.plain(t);
const words = t => PM.words(plain(t));
const nrm = t => String(t || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
const en = () => deck() && deck().lang === 'en';

/* ======================================================================
   slide ⇄ plain text (what Copilot reads and writes back)
   ====================================================================== */
const SEC = { items: 'بنود', kpis: 'أرقام', steps: 'مراحل', timeline: 'خط زمني', bullets: 'نقاط', para: 'فقرة', quote: 'اقتباس', compare: 'مقارنة', table: 'جدول', chart: 'رسم بياني' };
const SEC_EN = { items: 'items', kpis: 'numbers', steps: 'steps', timeline: 'timeline', bullets: 'bullets', para: 'paragraph', quote: 'quote', compare: 'compare', table: 'table', chart: 'chart' };
PM.slideToText = function (spec) {
  const L = [];
  if (spec.title) L.push('العنوان: ' + plain(spec.title));
  if (spec.sub) L.push('العنوان الفرعي: ' + plain(spec.sub));
  for (const b of spec.blocks || []) {
    L.push('[' + (SEC[b.k] || b.k) + ']' + (b.head ? ' ' + plain(b.head) : ''));
    if (b.k === 'items') b.items.forEach(it => { L.push('- ' + [it.value, it.title].filter(Boolean).map(plain).join(' ') + (it.text ? ' :: ' + plain(it.text) : '')); (it.bullets || []).forEach(x => L.push('  * ' + plain(x))); });
    else if (b.k === 'kpis') b.items.forEach(it => L.push('- ' + plain(it.value) + ' :: ' + plain(it.label || '') + (it.text ? ' :: ' + plain(it.text) : '')));
    else if (b.k === 'steps') b.items.forEach((it, i) => L.push((i + 1) + '. ' + plain(it.title || '') + (it.text ? ' :: ' + plain(it.text) : '')));
    else if (b.k === 'timeline') b.items.forEach(it => L.push('- ' + plain(it.date || '') + ' :: ' + plain(it.title || '') + (it.text ? ' :: ' + plain(it.text) : '')));
    else if (b.k === 'bullets') b.items.forEach(t => L.push('- ' + plain(t)));
    else if (b.k === 'para') L.push(plain(b.text));
    else if (b.k === 'quote') L.push(plain(b.text) + (b.by ? ' :: ' + plain(b.by) : ''));
    else if (b.k === 'compare') { L.push('# ' + plain(b.a.title || '')); b.a.items.forEach(t => L.push('- ' + plain(t))); L.push('# ' + plain(b.b.title || '')); b.b.items.forEach(t => L.push('- ' + plain(t))); }
    else if (b.k === 'table') b.rows.forEach(r => L.push(r.map(plain).join(' | ')));
    else if (b.k === 'chart') { const c = b.chart; L.push('الوحدة: ' + (c.unit || '')); c.cats.forEach((cat, i) => L.push(cat + ' | ' + c.series.map(x => x.vals[i]).join(' | '))); }
  }
  return L.join('\n');
};
PM.textToSpec = function (txt, base) {
  const spec = JSON.parse(JSON.stringify(base || { kind: 'content', title: '', sub: '', blocks: [], imgs: [] }));
  const lines = String(txt).replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, '')).filter(l => l.trim() && !/^```/.test(l.trim()));
  const kindOf = name => { const n = nrm(name).trim(); for (const [k, v] of Object.entries(SEC)) if (n.startsWith(nrm(v))) return k; for (const [k, v] of Object.entries(SEC_EN)) if (n.startsWith(v)) return k; return null; };
  let blocks = [], b = null, cmpSide = null, title = null, sub = null;
  const split = l => l.split(/\s*::\s*/);
  for (const raw of lines) {
    const l = raw.trim();
    let m;
    if ((m = l.match(/^(العنوان الفرعي|subtitle)\s*[:：]\s*(.*)$/i))) { sub = m[2].trim(); continue; }
    if ((m = l.match(/^(العنوان|title)\s*[:：]\s*(.*)$/i))) { title = m[2].trim(); continue; }
    if ((m = l.match(/^\[([^\]]+)\]\s*(.*)$/))) { const k = kindOf(m[1]); b = k ? { k } : { k: 'para', text: '' }; if (m[2]) b.head = m[2].trim(); blocks.push(b); cmpSide = null; continue; }
    if (!b) { b = { k: 'para', text: '' }; blocks.push(b); }
    const body = l.replace(/^(-|\*|•|\d+[.)])\s*/, '');
    if (b.k === 'items') {
      if (/^\s{2,}\*|^\*/.test(raw) && b.items && b.items.length) { const it = b.items[b.items.length - 1]; (it.bullets = it.bullets || []).push(body); continue; }
      const [t, x] = split(body); (b.items = b.items || []).push({ title: t || '', text: x || '' });
    } else if (b.k === 'kpis') { const [v, lab, x] = split(body); (b.items = b.items || []).push({ value: v || '', label: lab || '', text: x || '' }); }
    else if (b.k === 'steps') { const [t, x] = split(body); (b.items = b.items || []).push({ title: t || '', text: x || '' }); }
    else if (b.k === 'timeline') { const [dte, t, x] = split(body); (b.items = b.items || []).push({ date: dte || '', title: t || '', text: x || '' }); }
    else if (b.k === 'bullets') (b.items = b.items || []).push(body);
    else if (b.k === 'quote') { const [t, by] = split(body); b.text = t; if (by) b.by = by; }
    else if (b.k === 'compare') {
      if (/^#/.test(l)) { cmpSide = !b.a ? 'a' : 'b'; b[cmpSide] = { title: l.replace(/^#+\s*/, ''), items: [] }; continue; }
      if (!cmpSide) { cmpSide = 'a'; b.a = { title: '', items: [] }; }
      b[cmpSide].items.push(body);
    } else if (b.k === 'table') (b.rows = b.rows || []).push(l.split(/\s*\|\s*/));
    else if (b.k === 'chart') {
      if ((m = l.match(/^(الوحدة|unit)\s*[:：]\s*(.*)$/i))) { b._unit = m[2]; continue; }
      const parts = l.split(/\s*\|\s*/); (b._rows = b._rows || []).push(parts);
    } else b.text = (b.text ? b.text + '\n' : '') + body;
  }
  blocks = blocks.map(x => {
    if (x.k === 'chart') { const rows = x._rows || []; const ns = Math.max(1, ...rows.map(r => r.length - 1)); return { k: 'chart', head: x.head, chart: { kind: (base && base.blocks && (base.blocks.find(bb => bb.k === 'chart') || {}).chart || {}).kind || 'col', cats: rows.map(r => r[0]), series: Array.from({ length: ns }, (_, si) => ({ name: '', vals: rows.map(r => parseFloat(PM.digits(r[si + 1] || '0').replace(/,/g, '')) || 0) })), unit: x._unit || '' } }; }
    if (x.k === 'compare') { x.a = x.a || { title: '', items: [] }; x.b = x.b || { title: '', items: [] }; }
    return x;
  }).filter(x => (x.items && x.items.length) || x.text || x.rows || x.chart || x.a);
  if (title != null) spec.title = title;
  if (sub != null) spec.sub = sub;
  if (blocks.length) spec.blocks = blocks;
  return spec;
};

/* ======================================================================
   Copilot: one copy, one paste
   ====================================================================== */
B.copy = async function (txt) {
  try { await navigator.clipboard.writeText(txt); } catch (e) { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
  PM.UI.toast('نسخت الطلب ✓ الصقه في Copilot');
};
const RULES = `قواعد مطارات جدة: لا تذكر «الصالة الشمالية». «الصالة الجنوبية» اسمها «الصالة 4». «صالات الحج والعمرة» اسمها «الصالة 3ب (مجمع صالات الحج والعمرة)». حافظ على كل الأرقام كما هي إلا لو طلب التوجيه غير ذلك.`;
B.copilotModal = function (title, prompt, placeholder, onApply) {
  const body = `<div class="note">${ic('sparkles')} نسخة وحدة ولصقة وحدة. الرد يرجع بنفس الصيغة وتطبّقه الأداة بنفسها.</div>
    <h4 style="margin:14px 0 8px">١ · انسخ الطلب والصقه في Copilot</h4>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="bcCopy">${ic('copy')}نسخ الطلب</button><a class="btn sec" href="https://m365.cloud.microsoft/chat" target="_blank" rel="noopener" data-needs-online>${ic('external-link')}افتح Copilot</a><button class="btn sec" id="bcShow">${ic('eye')}اعرض الطلب</button></div>
    <pre class="bc-pre hide" id="bcPre">${esc(prompt)}</pre>
    <h4 style="margin:16px 0 8px">٢ · الصق رد Copilot هنا</h4>
    <textarea class="inp" id="bcIn" style="min-height:160px" placeholder="${esc(placeholder || '')}"></textarea>`;
  PM.UI.modal(title, body, { foot: '<button class="btn pri" id="bcApply">طبّق الرد</button>' });
  $('#bcCopy').onclick = () => B.copy(prompt);
  $('#bcShow').onclick = () => $('#bcPre').classList.toggle('hide');
  $('#bcApply').onclick = () => { const v = $('#bcIn').value.trim(); if (!v) { PM.UI.toast('الصق رد Copilot أولاً'); return; } const ok = onApply(v); if (ok !== false) PM.UI.closeModal(); };
};

/* ======================================================================
   «توجيه» — instructions in plain Arabic (or English)
   ====================================================================== */
const has = (t, re) => re.test(t);
const COLORS = [[/كحلي|navy/, K.NAVY], [/سماوي|ازرق فاتح|sky|light blue/, K.SKY], [/ازرق|blue/, K.BLUE], [/ابيض|white/, K.WHITE], [/رمادي|grey|gray/, K.MUTED], [/اسود|black/, K.INK]];
const FORMS = [[/ارقام|مؤشرات|kpi|numbers/, 'kpis'], [/خط زمني|جدول زمني|timeline/, 'timeline'], [/مراحل|خطوات|steps|process/, 'steps'], [/نقاط|bullet/, 'bullets'], [/بطاقات|بنود|كروت|cards|items/, 'items'], [/فقره|نص متصل|paragraph/, 'para'], [/شارت|رسم بياني|chart|graph/, 'chart']];
function targetsFor(t, sel, s) {
  if (sel.length) return sel;
  const texts = s.objs.filter(o => o.t === 'text' && !o.pageNum && o.role !== 'chrome');
  if (has(t, /عنوان|title/)) return texts.filter(o => o.paras.some(p => p.bind === 'title'));
  if (has(t, /ارقام|الرقم|numbers?/)) return texts.filter(o => o.paras.some(p => p.font === 'num'));
  if (has(t, /الايقونات|ايقونه|icons?/)) return s.objs.filter(o => o.t === 'icon');
  if (has(t, /الصور|صوره|photo|image/)) return s.objs.filter(o => o.t === 'image' && o.role !== 'tplbg');
  if (has(t, /النص|الكلام|text/)) return texts.filter(o => !o.paras.some(p => p.bind === 'title'));
  return texts;
}
const AI_RE = /اختصر|لخص|صياغ|صيغ|اعد كتابه|اكتب|حسن الكلام|حسن النص|ترجم|زود|اضف نقطه|اضف بند|وضح|بسط|rewrite|shorten|summar|translate|improve the text|add a point|simplify/;
B.local = function (raw, sel) {
  const d = deck(), s = cur(); if (!s) return { ok: false };
  const t = nrm(raw).replace(/\s+/g, ' ').trim();
  const Ed = PM.Ed, UI = PM.UI;
  const done = (msg, label, relaid) => { s.edited = !relaid; PM.commit(label || 'directive'); if (relaid) UI.renderAll(); else { Ed.render(); UI.renderCtx(); PM.emit('change'); } return { ok: true, msg }; };
  if (AI_RE.test(t)) return { ok: false, ai: true };
  // title text: «العنوان: …» / «غير العنوان إلى …»
  let m = raw.match(/^\s*(?:العنوان|title)\s*[:：]\s*(.+)$/i) || raw.match(/(?:غير|غيّر|خل|خلي|اجعل)\s+العنوان\s+(?:إلى|الى|ل|يكون)?\s*[«"']?(.+?)[»"']?\s*$/);
  if (m) { s.spec.title = m[1].trim(); s.objs.forEach(o => { if (o.t === 'text') o.paras.forEach(p => { if (p.bind === 'title') p.t = s.spec.title; }); }); return done('غيّرت العنوان', 'title'); }
  const much = has(t, /كثير|جدا|مره|اكثر بكثير|much|a lot/) ? 1.3 : has(t, /شوي|قليل|بسيط|شوية|slightly|a bit|little/) ? 1.06 : 1.15;
  const tg = targetsFor(t, sel, s);
  const tx = tg.filter(o => o.t === 'text');
  if (has(t, /صوره مقترحه|اقترح صوره|suggest(ed)? (a )?photo/)) {
    const imgs = s.objs.filter(o => o.t === 'image' && o.role !== 'tplbg' && (!sel.length || sel.includes(o)));
    if (!imgs.length) return B.photoLayout(true);
    imgs.forEach((o, k) => { o.src = PM.suggestPhoto(d, s, o.bindImg ? +o.bindImg.split('.')[1] : k, null, PM.specText(s.spec)); });
    return done('حطيت «صورة مقترحة» مكان الصور', 'sug');
  }
  if (has(t, /(اضف|حط|ابي|ابغى|ابغا|مع|بدون|add|with|use).{0,12}(صوره|photo|image)/) && !has(t, /بدون صوره|without/)) return B.photoLayout(false);
  if (has(t, /(كبر|اكبر|تكبير|bigger|larger|increase|enlarge)/) && tx.length) { tx.forEach(o => PM.TextTools.setScale(o, PM.TextTools.scaleOf(o) * much)); return done('كبّرت ' + (tx.length > 1 ? tx.length + ' نصوص' : 'النص'), 'size'); }
  if (has(t, /(صغر|اصغر|تصغير|smaller|decrease|reduce)/) && tx.length) { tx.forEach(o => PM.TextTools.setScale(o, PM.TextTools.scaleOf(o) / much)); return done('صغّرت ' + (tx.length > 1 ? tx.length + ' نصوص' : 'النص'), 'size'); }
  if (has(t, /(اسمك|اثقل|اعرض الخط|ثخن|thicker|heavier)/) && tx.length) { tx.forEach(o => PM.TextTools.setWeight(o, Math.min(2, (o.paras[0].sw || 0) + 0.5))); return done('زدت سماكة الخط', 'weight'); }
  if (has(t, /(انحف|اخف|thinner|lighter weight)/) && tx.length) { tx.forEach(o => PM.TextTools.setWeight(o, Math.max(0, (o.paras[0].sw || 0) - 0.5))); return done('خففت سماكة الخط', 'weight'); }
  if (has(t, /(بدون|شيل|ازل).{0,6}(عريض|bold)/) && tx.length) { tx.forEach(o => o.paras.forEach(p => { p.bold = false; p.t = plain(p.t); })); return done('شلت العريض', 'bold'); }
  if (has(t, /(عريض|bold)/) && tx.length) { tx.forEach(o => o.paras.forEach(p => p.bold = true)); tx.forEach(o => PM.TextTools.fitH(o)); return done('خليته عريض', 'bold'); }
  const col = COLORS.find(([re]) => re.test(t));
  if (col && has(t, /(لون|خل|خلي|اجعل|colou?r|make)/) && tg.length && !has(t, /(الشريحه|الخلفيه|slide|background)/)) {
    tg.forEach(o => { if (o.t === 'text') o.paras.forEach(p => p.color = col[1]); else if (o.t === 'icon' || o.t === 'line') o.color = col[1]; else if (o.t === 'rect' || o.t === 'ellipse') { o.fill = col[1]; o.grad = null; } });
    return done('غيّرت اللون', 'color');
  }
  if (has(t, /(داكن|غامق|كحلي|dark)/) && !has(t, /(نص|لون|text|colou?r)/)) return B.setTone('dark');
  if (has(t, /(فاتح|ابيض|light)/) && has(t, /(خل|خلي|اجعل|خليها|الشريحه|make|slide)/) && !has(t, /(نص|لون|text|colou?r)/)) return B.setTone('light');
  if (has(t, /(يمين|right)/) && has(t, /(محاذا|اليمين|align|خل)/) && tx.length) { tx.forEach(o => { o.align = 'start'; o.paras.forEach(p => p.al = 'r'); }); return done('حاذيت لليمين', 'align'); }
  if (has(t, /(يسار|left)/) && has(t, /(محاذا|اليسار|align|خل)/) && tx.length) { tx.forEach(o => { o.align = 'start'; o.paras.forEach(p => p.al = 'l'); }); return done('حاذيت لليسار', 'align'); }
  if (has(t, /(وسط|توسيط|center|centre)/) && tx.length) { tx.forEach(o => { o.align = 'center'; o.paras.forEach(p => p.al = 'c'); }); return done('وسّطت النص', 'align'); }
  const form = FORMS.find(([re]) => re.test(t));
  if (form && has(t, /(حول|خل|خلي|اعرض|اجعل|بشكل|ك|convert|make|show|as)/)) {
    const before = JSON.stringify(s.spec);
    if (!PM.reshape(s.spec, form[1])) return { ok: true, msg: 'هذا المحتوى ما يتحول لهذا الشكل بدون تغيير الكلام — جرّب «اسأل كوبايلوت»', warn: true };
    s.layout = null; PM.autoSlide(d, ST.cur); PM.renumber(d);
    if (JSON.stringify(s.spec) === before) return { ok: true, msg: 'المحتوى أصلاً بهذا الشكل' };
    return done('حوّلت المحتوى', 'reshape', true);
  }
  if (has(t, /(قسم|قسمها|افصل|split)/)) return B.split(ST.cur);
  if (has(t, /(تصميم ثاني|تصميم اخر|غير التصميم|بديل|another|different)/)) { PM.UI.cycle(1); return { ok: true, msg: 'غيّرت التصميم' }; }
  if (has(t, /(رتب|نظم|وزع|توزيع|tidy|arrange|clean)/)) {
    if (sel.length > 1) { B.tidy(sel); return done('رتّبت المحاذاة', 'tidy'); }
    PM.autoSlide(d, ST.cur); PM.renumber(d); return done('أعدت توزيع الشريحة', 'auto', true);
  }
  if (has(t, /(احذف|امسح|شيل|delete|remove)/) && sel.length) { PM.Ed.del(); return { ok: true, msg: 'حذفت' }; }
  const mv = has(t, /(فوق|اعلى|ارفع|up)/) ? [0, -16] : has(t, /(تحت|اسفل|نزل|down)/) ? [0, 16] : has(t, /(يمين|right)/) ? [16, 0] : has(t, /(يسار|left)/) ? [-16, 0] : null;
  if (mv && has(t, /(حرك|ارفع|نزل|ودي|move)/) && sel.length) { sel.forEach(o => { o.x += mv[0]; o.y += mv[1]; }); return done('حرّكت', 'nudge'); }
  return { ok: false };
};
B.setTone = function (tone) {
  const d = deck(), s = cur();
  s.tone = tone;
  const L = PM.layoutById(s.layout);
  if (L && L.tones.includes(tone)) PM.applyLayout(d, ST.cur, L); else PM.autoSlide(d, ST.cur);
  PM.renumber(d); PM.commit('tone'); PM.UI.renderAll();
  return { ok: true, msg: tone === 'dark' ? 'خليت الشريحة داكنة' : 'خليت الشريحة فاتحة' };
};
/* switch to the best design that carries a photo */
B.photoLayout = function (suggest) {
  const d = deck(), s = cur();
  const list = PM.UI.candList().filter(L => /photo|صورة|صور/.test(L.id + ' ' + (L.tags || []).join(' ') + ' ' + L.name));
  if (!list.length) return { ok: true, msg: 'ما فيه تصميم بصورة يناسب هذا المحتوى — اسحب صورة على الشريحة مباشرة', warn: true };
  const keep = d.photoSug;
  if (suggest) d.photoSug = 'always';
  s.spec.autoImgs = [];
  for (const L of list) { const r = PM.applyLayout(d, ST.cur, L); if (!r.missing || !r.missing.length) break; }
  if (suggest) { s.objs.filter(o => o.t === 'image' && o.bindImg).forEach(o => { const i = +o.bindImg.split('.')[1]; o.src = PM.suggestPhoto(d, s, i, null, PM.specText(s.spec)); s.spec.autoImgs[i] = o.src; }); }
  d.photoSug = keep;
  PM.renumber(d); PM.commit('photo'); PM.UI.renderAll();
  return { ok: true, msg: suggest ? 'حطيت تصميماً بصورة مقترحة — اضغط عليها واصنعها' : 'حطيت تصميماً فيه صورة من مكتبة مطارات جدة' };
};
/* split a dense slide into two */
B.split = function (i) {
  const d = deck(), s = d.slides[i];
  const bl = s.spec.blocks || [];
  let a, b;
  if (bl.length >= 2) { const h = Math.ceil(bl.length / 2); a = bl.slice(0, h); b = bl.slice(h); }
  else if (bl[0] && Array.isArray(bl[0].items) && bl[0].items.length >= 4) { const it = bl[0].items, h = Math.ceil(it.length / 2); a = [Object.assign({}, bl[0], { items: it.slice(0, h) })]; b = [Object.assign({}, bl[0], { items: it.slice(h) })]; }
  else if (bl[0] && bl[0].k === 'para') { const ss = bl[0].text.split(/(?<=[.!؟?])\s+/); if (ss.length < 2) return { ok: true, msg: 'المحتوى قصير على التقسيم', warn: true }; const h = Math.ceil(ss.length / 2); a = [{ k: 'para', text: ss.slice(0, h).join(' ') }]; b = [{ k: 'para', text: ss.slice(h).join(' ') }]; }
  else return { ok: true, msg: 'ما لقيت طريقة نظيفة لتقسيم هذي الشريحة', warn: true };
  s.spec.blocks = a; s.layout = null;
  const n = PM.addSlide(d, Object.assign({}, JSON.parse(JSON.stringify(s.spec)), { blocks: JSON.parse(JSON.stringify(b)), title: s.spec.title + (en() ? ' (cont.)' : ' (تابع)'), autoImgs: [] }), i + 1);
  void n;
  PM.autoSlide(d, i); PM.autoSlide(d, i + 1); PM.renumber(d); PM.commit('split'); PM.UI.renderAll();
  return { ok: true, msg: 'قسّمتها لشريحتين' };
};
/* snap near-equal edges and equalise gaps */
B.tidy = function (list) {
  const xs = []; list.forEach(o => { [o.x, o.x + o.w].forEach(v => { const c = xs.find(g => Math.abs(g.v - v) < 10); if (c) c.n++; else xs.push({ v, n: 1 }); }); });
  list.forEach(o => {
    const L = xs.filter(g => g.n > 1).find(g => Math.abs(g.v - o.x) < 10 && g.v !== o.x); if (L) o.x = L.v;
    const R = xs.filter(g => g.n > 1).find(g => Math.abs(g.v - (o.x + o.w)) < 10); if (R && o.t !== 'text') o.w = R.v - o.x;
  });
};
/* ask Copilot to do the wording */
B.copilotDirective = function (raw, sel) {
  const s = cur(); const lang = en() ? 'English' : 'العربية';
  const texts = sel.filter(o => o.t === 'text');
  if (texts.length) {
    const content = texts.map((o, i) => `[${i + 1}]\n` + o.paras.map(p => plain(p.t)).join('\n')).join('\n');
    const prompt = `أنت محرر محتوى عروض مطارات جدة (JEDCO). نفّذ التوجيه على النصوص المرقّمة.
التوجيه: «${raw}»
${RULES}
- اللغة: ${lang}. لا تضيف مقدمة ولا شرح.
- رد بنفس الصيغة بالضبط: رقم النص بين قوسين في سطر لحاله، وتحته أسطره (كل فقرة في سطر).

<<<
${content}
>>>`;
    B.copilotModal('توجيه عبر كوبايلوت', prompt, '[1]\n…', reply => {
      const parts = {}; let k = null;
      reply.replace(/\r/g, '').split('\n').forEach(l => { const m = l.trim().match(/^\[(\d+)\]\s*(.*)$/); if (m) { k = +m[1]; parts[k] = m[2] ? [m[2]] : []; } else if (k && l.trim()) parts[k].push(l.trim()); });
      let n = 0;
      texts.forEach((o, i) => {
        const L = parts[i + 1]; if (!L || !L.length) return;
        const old = o.paras;
        o.paras = L.map((t, j) => Object.assign({}, old[Math.min(j, old.length - 1)], { t, bind: j < old.length ? old[j].bind : null }));
        o.paras.forEach(p => { if (p.bind) PM.writeBind(s.spec, p.bind, p.t); });
        PM.TextTools.fitH(o); n++;
      });
      if (!n) { PM.UI.toast('ما لقيت نصوصاً مرقّمة في الرد', 3500); return false; }
      s.edited = true; PM.commit('copilot-text'); PM.Ed.render(); PM.emit('change'); PM.UI.toast(`عدّلت ${n} نص ✓ تقدر تتراجع بـ Ctrl+Z`);
    });
    return;
  }
  const prompt = `أنت محرر محتوى عروض مطارات جدة (JEDCO). نفّذ التوجيه على محتوى الشريحة.
التوجيه: «${raw}»
${RULES}
- اللغة: ${lang}. لا تضيف مقدمة ولا شرح.
- رد بنفس الصيغة بالضبط (العنوان، ثم الأقسام بين أقواس مربعة، وكل بند في سطر يبدأ بـ - ويفصل العنوان عن الشرح بـ :: ). تقدر تغيّر نوع القسم لو التوجيه يطلب.
- الأقسام المتاحة: [بنود] [أرقام] [مراحل] [خط زمني] [نقاط] [فقرة] [اقتباس] [مقارنة] [جدول] [رسم بياني]

<<<
${PM.slideToText(s.spec)}
>>>`;
  B.copilotModal('توجيه عبر كوبايلوت', prompt, 'العنوان: …\n[بنود]\n- … :: …', reply => {
    const nu = PM.textToSpec(reply, s.spec);
    if (JSON.stringify(nu.blocks) === JSON.stringify(s.spec.blocks) && nu.title === s.spec.title) { PM.UI.toast('ما تغيّر شي — تأكد إنك لصقت الرد كامل', 3500); return false; }
    s.spec = nu; s.layout = null; s.spec.autoImgs = [];
    PM.autoSlide(deck(), ST.cur); PM.renumber(deck()); PM.commit('copilot-slide'); PM.UI.renderAll();
    PM.UI.toast('طبّقت رد Copilot على الشريحة ✓ تقدر تتراجع بـ Ctrl+Z', 3500);
  });
};
/* the instruction box */
B.directive = function (prefill) {
  const sel = PM.Ed.selected();
  const scope = sel.length ? (sel.length === 1 ? 'العنصر المحدد' : `${sel.length} عناصر محددة`) : 'الشريحة كاملة';
  const ex = sel.length ? ['كبّر شوي', 'خلّه عريض', 'لونه سماوي', 'وسّطه', 'اختصر الكلام'] : ['حوّلها لأرقام', 'خلّها داكنة', 'أضف صورة', 'اقترح صورة', 'قسّمها لشريحتين', 'كبّر العنوان', 'اختصر الكلام وخلّه أقوى'];
  const body = `<div class="dir-scope">${ic('crosshair')}التوجيه على: <b>${scope}</b>${sel.length ? '' : ' <span class="hint">(حدد عنصراً قبلها لو تبي التوجيه عليه فقط)</span>'}</div>
    <textarea class="inp" id="dirIn" style="min-height:84px" placeholder="اكتب ايش تبي… مثل: كبّر الأرقام شوي وخلّ العنوان كحلي">${esc(prefill || '')}</textarea>
    <div class="chips" style="margin-top:8px">${ex.map(x => `<button class="chip" data-ex="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <p class="hint" style="margin-top:10px">الأداة تنفّذ بنفسها: الأحجام، السماكة، الألوان، المحاذاة، الفاتح والداكن، تحويل الشكل (أرقام، مراحل، خط زمني، نقاط، بطاقات، شارت)، الصور، التقسيم، التحريك. وللصياغة (اختصار، تحسين، ترجمة، إضافة نقاط) تجهز لك طلب Copilot بلصقة وحدة.</p>`;
  PM.UI.modal('توجيه', body, { foot: `<button class="btn sec" id="dirAi">${ic('sparkles')}اسأل كوبايلوت</button><button class="btn pri" id="dirGo">${ic('wand-sparkles')}نفّذ</button>` });
  const inp = $('#dirIn'); setTimeout(() => inp.focus(), 30);
  $$('[data-ex]').forEach(b => b.onclick = () => { inp.value = b.dataset.ex; inp.focus(); });
  const run = () => {
    const v = inp.value.trim(); if (!v) return;
    const r = B.local(v, sel);
    if (r.ok) { PM.UI.closeModal(); PM.UI.toast((r.warn ? '' : '✓ ') + r.msg, 3200); return; }
    PM.UI.closeModal();
    B.copilotDirective(v, sel);
    if (!r.ai) PM.UI.toast('هذا التوجيه يحتاج صياغة — جهزت لك طلب Copilot', 3200);
  };
  $('#dirGo').onclick = run;
  $('#dirAi').onclick = () => { const v = inp.value.trim(); if (!v) return; PM.UI.closeModal(); B.copilotDirective(v, sel); };
  inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } e.stopPropagation(); };
};

/* ======================================================================
   «رأي الأداة» — slide review
   ====================================================================== */
const PALETTE = new Set([K.NAVY, K.BLUE, K.SKY, K.WHITE, K.BODY, K.MUTED, K.INK, K.FAINT, K.BODY_D, K.MUTED_D, '0E1E36', '3D4A5C', '7A8699'].map(x => String(x).toUpperCase()));
function metrics(objs, d) {
  const texts = objs.filter(o => o.t === 'text' && !o.hidden && !o.pageNum && o.role !== 'chrome' && o.paras.some(p => plain(p.t).trim()));
  const sizes = texts.flatMap(o => o.paras.filter(p => plain(p.t).trim()).map(p => p.size));
  const wordsN = texts.reduce((a, o) => a + o.paras.reduce((b, p) => b + words(p.t), 0), 0);
  // visual weight → balance; content cover → emptiness
  let mx = 0, mw = 0, area = 0;
  const content = objs.filter(o => !o.hidden && o.role !== 'tplbg' && o.role !== 'chrome' && o.role !== 'veil' && !o.pageNum && !(o.w > 900 && o.h > 500) && o.t !== 'logo');
  for (const o of content) {
    let wgt = o.w * o.h;
    if (o.t === 'text') wgt = o.w * Math.min(o.h, PM.blockH(o.paras, o.w)) * 1.4;
    else if (o.t === 'rect' || o.t === 'ellipse') wgt *= (o.fill ? 0.35 : 0.08);
    else if (o.t === 'line') wgt = (o.w + o.h) * 2;
    else if (o.t === 'icon') wgt *= 0.8;
    mx += (o.x + o.w / 2) * wgt; mw += wgt;
    if (o.t !== 'line') area += Math.min(o.w * o.h, 900 * 460);
  }
  const fullPhoto = objs.some(o => o.t === 'image' && o.w > 900 && o.h > 500);
  const bal = mw ? (mx / mw - 480) / 960 : 0;
  return { texts, sizes, minS: sizes.length ? Math.min(...sizes) : 0, maxS: sizes.length ? Math.max(...sizes) : 0, words: wordsN, bal, fill: Math.min(1, area / (840 * 438)), fullPhoto };
}
/* try the designs that fit and keep the one with the best numbers */
B.bestLayout = function (goal) {
  const d = deck(), s = cur();
  const list = PM.UI.candList().slice(0, 30);
  let best = null;
  for (const L of list) {
    const c = PM.slideCtx(d, ST.cur);
    const spec = JSON.parse(JSON.stringify(s.spec));
    const fake = { id: s.id, spec }; c.photoFor = (sp, i) => PM.autoPhoto(d, fake, i);
    let r; try { r = PM.renderLayout(L, spec, c); } catch (e) { continue; }
    if ((r.missing && r.missing.length) || r.overflow) continue;
    const m = metrics(r.objs, d);
    let sc = goal === 'font' ? m.minS * 2 - Math.abs(m.bal) * 20 : goal === 'balance' ? -Math.abs(m.bal) * 100 + m.minS * 0.3 : goal === 'fill' ? -Math.abs(m.fill - 0.5) * 40 + m.minS * 0.3 - Math.abs(m.bal) * 10 : m.minS - Math.abs(m.bal) * 20;
    if (L.id === s.layout) sc -= 0.5;
    if (!best || sc > best.sc) best = { L, sc };
  }
  if (!best) return { ok: true, msg: 'ما لقيت تصميماً أفضل لهذا المحتوى', warn: true };
  PM.UI.applyLayoutId(best.L.id);
  return { ok: true, msg: 'طبّقت «' + best.L.name + '»' };
};
PM.critique = function (d, i) {
  const s = d.slides[i]; const out = []; let score = 10;
  const add = (lv, t, dd, fix, pen) => { out.push({ lv, t, d: dd || '', fix }); score -= pen != null ? pen : (lv === 'bad' ? 2 : lv === 'warn' ? 1 : 0); };
  const m = metrics(s.objs, d);
  const kind = s.spec.kind;
  const issues = PM.checkIssues(d).filter(x => x.i === i);
  if (kind !== 'content') {
    add('good', kind === 'cover' ? 'غلاف رسمي بهوية مطارات جدة' : kind === 'closing' ? 'ختام يطابق الغلاف' : kind === 'divider' ? 'فاصل قسم بعنوان فقط — حسب التوجيه' : 'جدول أعمال من القالب الرسمي', '');
    if (s.spec.title && words(s.spec.title) > 9) add('warn', 'العنوان طويل لشريحة ' + (kind === 'divider' ? 'فاصل' : 'رئيسية'), `${words(s.spec.title)} كلمة — الأقوى ٣ إلى ٦ كلمات`, { label: 'اختصره عبر كوبايلوت', run: () => B.copilotDirective('اختصر العنوان إلى ٣–٦ كلمات بدون ما يضيع معناه', s.objs.filter(o => o.t === 'text' && o.paras.some(p => p.bind === 'title'))) });
  } else {
    // density
    if (m.words > 110) add('bad', 'الشريحة مزدحمة', `${m.words} كلمة — الجمهور ما يقرأ ويسمع بنفس الوقت`, { label: 'قسّمها لشريحتين', run: () => B.split(i) }, 2.5);
    else if (m.words > 75) add('warn', 'كلام كثير شوي', `${m.words} كلمة — جرّب تختصر أو تقسم`, { label: 'اختصر عبر كوبايلوت', run: () => B.copilotDirective('اختصر الكلام بحوالي ٣٠٪ وخلّه أقوى، وحافظ على كل الأرقام', []) });
    else if (m.words > 0) add('good', 'كمية الكلام مريحة', `${m.words} كلمة`);
    // readability
    if (m.minS && m.minS < 11) add('bad', 'فيه خط صغير يصعب قراءته', `أصغر خط ${Math.round(m.minS)} — الحد المريح ١٣ وفوق`, { label: 'جرّب تصميماً بخط أكبر', run: () => B.bestLayout('font') });
    else if (m.minS && m.minS < 13) add('warn', 'بعض النصوص صغيرة', `أصغر خط ${Math.round(m.minS)}`, { label: 'جرّب تصميماً بخط أكبر', run: () => B.bestLayout('font') });
    else if (m.minS) add('good', 'الخطوط مقروءة', `أصغر خط ${Math.round(m.minS)}`);
    // hierarchy
    const tt = s.objs.find(o => o.t === 'text' && o.paras.some(p => p.bind === 'title'));
    const body = m.sizes.filter(z => !tt || z < tt.paras[0].size - 0.5).sort((a, b) => a - b);
    const med = body.length ? body[Math.floor(body.length / 2)] : 0;
    if (!s.spec.title) add('warn', 'بدون عنوان', 'العنوان يساعد الجمهور يفهم الشريحة بنظرة', { label: 'اكتب عنواناً عبر التوجيه', run: () => B.directive('العنوان: ') });
    else {
      if (tt && med && tt.paras[0].size / med < 1.3) add('warn', 'العنوان قريب من حجم النص', 'التسلسل البصري ضعيف — كبّر العنوان', { label: 'كبّر العنوان', run: () => { PM.TextTools.setScale(tt, PM.TextTools.scaleOf(tt) * 1.2); s.edited = true; PM.commit('size'); PM.Ed.render(); return { ok: true, msg: 'كبّرت العنوان' }; } });
      else add('good', 'تسلسل واضح بين العنوان والنص', '');
      if (words(s.spec.title) > 12) add('warn', 'العنوان طويل', `${words(s.spec.title)} كلمة — الأفضل أقل من ١٠`, { label: 'اختصره عبر كوبايلوت', run: () => B.copilotDirective('اختصر العنوان لأقل من ٨ كلمات بدون ما يضيع معناه', tt ? [tt] : []) });
    }
    // balance & space (a full-bleed photo carries its own weight)
    if (!m.fullPhoto) {
      if (Math.abs(m.bal) > 0.15) add('warn', 'الثقل مايل لجهة وحدة', `المحتوى متركز ${m.bal > 0 ? 'يمين' : 'يسار'} الشريحة والجهة الثانية فاضية`, { label: 'جرّب تصميماً متوازناً', run: () => B.bestLayout('balance') });
      else add('good', 'توزيع متوازن', '');
      if (m.fill < 0.22 && m.words < 40) add('warn', 'فراغ كبير', 'المحتوى قليل على مساحة الشريحة', { label: 'جرّب تصميماً يعبّي المساحة', run: () => B.bestLayout('fill') });
    }
    // numbers that deserve to be seen
    const sp = PM.shape(s.spec);
    const nums = (PM.specText(s.spec).match(/[\d٠-٩][\d٠-٩.,٫%٪]*/g) || []).filter(x => x.replace(/\D/g, '').length >= 2 && !/^(19|20)\d\d$/.test(PM.digits(x)));
    if (nums.length >= 3 && !['kpis', 'chart', 'table'].includes(sp.form) && !sp.valued) add('warn', 'فيه أرقام مدفونة في الكلام', `${nums.length} أرقام — الأرقام لما تبرز تقنع أكثر`, { label: 'حوّلها لأرقام بارزة', run: () => B.local('حوّلها لأرقام', []) });
    // photos
    const imgs = s.objs.filter(o => o.t === 'image' && o.role !== 'tplbg');
    const sugs = imgs.filter(o => d.assets[o.src] && d.assets[o.src].kind === 'sug');
    if (sugs.length) add('warn', 'فيها صورة مقترحة لازم تتصنع', d.assets[sugs[0].src].note, { label: 'افتح صانع الصور', run: () => { ST.sel = new Set([sugs[0].id]); PM.Ed.drawOverlay(); PM.UI.renderCtx(); const b = document.querySelector('#ctx [data-a="gen"]'); if (b) b.click(); return { ok: true, msg: 'جهزت صانع الصور بوصف الصورة' }; } }, 0.5);
    else if (!imgs.length && m.words < 70) {
      const near = d.slides.slice(Math.max(0, i - 3), i + 3).filter(x => x !== s && x.objs.some(o => o.t === 'image' && o.role !== 'tplbg')).length;
      if (!near) add('info', 'ممكن صورة تعطيها حياة', 'الشرائح اللي حولها كلها بدون صور', { label: 'حط تصميماً بصورة', run: () => B.photoLayout(false) }, 0.3);
    }
    // alignment after manual edits
    if (s.edited) {
      const xs = m.texts.map(o => o.dir === 'rtl' ? o.x + o.w : o.x);
      let near = 0; for (let a = 0; a < xs.length; a++) for (let b2 = a + 1; b2 < xs.length; b2++) { const dd = Math.abs(xs[a] - xs[b2]); if (dd > 0.6 && dd < 9) near++; }
      if (near) add('warn', 'محاذاة غير دقيقة', `${near} نصوص قريبة من بعض بس مو على نفس الخط`, { label: 'رتّب المحاذاة', run: () => { B.tidy(m.texts); s.edited = true; PM.commit('tidy'); PM.Ed.render(); return { ok: true, msg: 'رتّبت المحاذاة' }; } });
    }
  }
  // problems the checker found
  issues.forEach(x => add(x.level === 'e' ? 'bad' : 'warn', x.t.replace(/^الشريحة \d+: /, ''), x.d, null, x.level === 'e' ? 2 : 0.7));
  // brand colours
  const off = new Set(); s.objs.forEach(o => { if (o.t === 'text') o.paras.forEach(p => { const c = String(p.color || '').toUpperCase(); if (c && !PALETTE.has(c)) off.add(c); }); });
  if (off.size) add('warn', 'ألوان خارج هوية مطارات جدة', [...off].map(c => '#' + c).join('، '), { label: 'رجّعها لألوان الهوية', run: () => { s.objs.forEach(o => { if (o.t === 'text') o.paras.forEach(p => { if (!PALETTE.has(String(p.color).toUpperCase())) p.color = (s.tone === 'dark' || (!s.tone && d.dark)) ? K.WHITE : K.BODY; }); }); s.edited = true; PM.commit('brand'); PM.Ed.render(); return { ok: true, msg: 'رجّعت الألوان للهوية' }; } });
  else add('good', 'ألوان وخطوط الهوية', 'Tajawal للعربي و Sequel للأرقام');
  // consistency of the title position with the deck
  if (kind === 'content') {
    const ty = o => { const t = o.objs.find(x => x.t === 'text' && x.paras.some(p => p.bind === 'title')); return t ? t.y : null; };
    const ys = d.slides.filter(x => x !== s && x.spec.kind === 'content').map(ty).filter(v => v != null).sort((a, b) => a - b);
    const my = ty(s);
    if (ys.length >= 3 && my != null) { const med = ys[Math.floor(ys.length / 2)]; if (Math.abs(my - med) > 30) add('info', 'مكان العنوان يختلف عن باقي العرض', 'العين تتعود على مكان ثابت للعنوان', null, 0.3); }
  }
  score = Math.max(0, Math.min(10, Math.round(score * 2) / 2));
  return { score, items: out };
};
B.review = function () {
  const d = deck(); if (!d) return;
  PM.Ed.endEdit();
  const r = PM.critique(d, ST.cur);
  const label = r.score >= 9 ? 'ممتازة' : r.score >= 7 ? 'جيدة' : r.score >= 5 ? 'تحتاج لمسات' : 'تحتاج شغل';
  const col = r.score >= 9 ? '#0E8A5F' : r.score >= 7 ? '#004EAA' : r.score >= 5 ? '#B7791F' : '#C2410C';
  const order = { bad: 0, warn: 1, info: 2, good: 3 };
  const items = r.items.slice().sort((a, b) => order[a.lv] - order[b.lv]);
  const body = `<div class="rv-top"><div class="rv-ring" style="--c:${col};--p:${r.score * 10}"><b class="num">${r.score}</b><span>من 10</span></div><div><h3 style="margin:0 0 4px;color:${col}">${label}</h3><p class="hint" style="margin:0">رأي الأداة في الشريحة <span class="num">${ST.cur + 1}</span>: الكثافة، الوضوح، التوازن، الهوية، والتناسق مع باقي العرض.</p></div></div>
    <div class="rv-list">${items.map((x, k) => `<div class="issue rv-${x.lv}"><i class="dot ${x.lv === 'bad' ? 'e' : x.lv === 'warn' ? 'w' : x.lv === 'good' ? 'ok' : 'i'}"></i><div><b>${esc(x.t)}</b><span>${esc(x.d || '')}</span></div>${x.fix ? `<button class="btn sec" data-fix="${k}" style="height:34px">${esc(x.fix.label)}</button>` : ''}</div>`).join('')}</div>`;
  PM.UI.modal('رأي الأداة', body, { foot: `<button class="btn sec" id="rvAll">${ic('scan-eye')}راجع كل الشرائح</button><button class="btn sec" id="rvDir">${ic('wand-sparkles')}توجيه</button>` });
  $$('#modal [data-fix]').forEach(b => b.onclick = () => {
    const x = items[+b.dataset.fix]; PM.UI.closeModal();
    const res = x.fix.run();
    if (res && res.msg) PM.UI.toast((res.warn ? '' : '✓ ') + res.msg, 3000);
  });
  $('#rvDir').onclick = () => { PM.UI.closeModal(); B.directive(); };
  $('#rvAll').onclick = () => { PM.UI.closeModal(); B.reviewAll(); };
};
B.reviewAll = function () {
  const d = deck();
  const rows = d.slides.map((s, i) => ({ i, r: PM.critique(d, i), s })).filter(x => !x.s.hidden);
  const avg = rows.reduce((a, x) => a + x.r.score, 0) / Math.max(1, rows.length);
  const body = `<p class="hint">متوسط العرض: <b class="num">${avg.toFixed(1)}</b> من 10. الشرائح مرتبة من الأضعف.</p>` + rows.sort((a, b) => a.r.score - b.r.score).map(x => {
    const top = x.r.items.filter(y => y.lv === 'bad' || y.lv === 'warn').slice(0, 2).map(y => y.t).join(' · ') || 'سليمة';
    return `<div class="issue"><i class="dot ${x.r.score >= 8 ? 'ok' : x.r.score >= 6 ? 'w' : 'e'}"></i><div><b>الشريحة <span class="num">${x.i + 1}</span> — <span class="num">${x.r.score}</span>/10</b><span>${esc(top)}</span></div><button class="btn sec" data-go="${x.i}" style="height:34px">افتح</button></div>`;
  }).join('');
  PM.UI.modal('رأي الأداة في كل العرض', body);
  $$('#modal [data-go]').forEach(b => b.onclick = () => { PM.UI.closeModal(); PM.UI.select(+b.dataset.go); setTimeout(B.review, 120); });
};

/* ======================================================================
   «قصة العرض»
   ====================================================================== */
const ROLE = { cover: 'افتتاح', agenda: 'أجندة', divider: 'فصل', closing: 'ختام', kpis: 'أرقام', chart: 'أرقام', table: 'أرقام', steps: 'خطة', timeline: 'خطة', quote: 'اقتباس', compare: 'مقارنة', para: 'رسالة', statement: 'رسالة', items: 'تفاصيل', bullets: 'تفاصيل', mix: 'تفاصيل', photo: 'صورة' };
const ROLE_C = { 'افتتاح': '#002657', 'أجندة': '#3C4C64', 'فصل': '#004EAA', 'ختام': '#002657', 'أرقام': '#0E8A5F', 'خطة': '#7C3AED', 'اقتباس': '#B7791F', 'مقارنة': '#C2410C', 'رسالة': '#0891B2', 'تفاصيل': '#6B7A90', 'صورة': '#62B6F3' };
PM.slideRole = function (s) {
  const k = s.spec.kind;
  if (k !== 'content') return ROLE[k];
  const sp = PM.shape(s.spec);
  const f = sp.others && sp.others.length ? (['kpis', 'chart', 'table'].includes(sp.form) ? sp.form : 'mix') : sp.form;
  return ROLE[f] || 'تفاصيل';
};
PM.storyOf = function (d) {
  const vis = d.slides.map((s, i) => ({ s, i, role: PM.slideRole(s), words: metrics(s.objs, d).words })).filter(x => !x.s.hidden);
  const notes = []; let score = 10;
  const add = (lv, t, dd, fix, pen) => { notes.push({ lv, t, d: dd || '', fix }); score -= pen != null ? pen : (lv === 'bad' ? 2 : lv === 'warn' ? 1 : 0); };
  const content = vis.filter(x => x.s.spec.kind === 'content');
  const sections = []; let curSec = { title: 'البداية', items: [] };
  vis.forEach(x => { if (x.s.spec.kind === 'divider') { sections.push(curSec); curSec = { title: plain(x.s.spec.title), items: [] }; } else if (x.s.spec.kind === 'content') curSec.items.push(x); });
  sections.push(curSec);
  const secs = sections.filter(x => x.items.length || x.title !== 'البداية');
  // opening
  const firstContent = content.slice(0, 3).map(x => x.role);
  if (content.length >= 5 && !firstContent.some(r => r === 'رسالة' || r === 'أرقام')) add('warn', 'البداية ما فيها رسالة واضحة', 'أول شرائح تفاصيل — الجمهور يحتاج يعرف «ليش هو هنا» من البداية', { label: 'أضف شريحة «الرسالة الرئيسية»', run: () => B.addSlideAt(B.introIndex(), { kind: 'content', title: en() ? 'The key message' : 'الرسالة الرئيسية', blocks: [{ k: 'para', text: en() ? 'In one sentence: what should the audience remember?' : 'بجملة وحدة: ايش الشي اللي لازم يتذكره الجمهور من هذا العرض؟' }] }) });
  else if (content.length) add('good', 'بداية تدخل في الموضوع', '');
  // agenda
  const dividers = vis.filter(x => x.s.spec.kind === 'divider');
  if (content.length >= 8 && dividers.length >= 2 && !vis.some(x => x.s.spec.kind === 'agenda')) add('warn', 'عرض طويل بدون جدول أعمال', `${dividers.length} أقسام — جدول الأعمال يعطي الجمهور الخريطة`, { label: 'أضف جدول أعمال من عناوين الأقسام', run: () => B.addSlideAt(1, { kind: 'agenda', title: en() ? 'Agenda' : 'جدول الأعمال', items: dividers.map(x => ({ title: plain(x.s.spec.title) })) }) });
  // numbers placement
  const firstNum = vis.findIndex(x => x.role === 'أرقام');
  if (firstNum > 0 && firstNum / vis.length > 0.6 && content.length >= 6) add('warn', 'الأرقام جاية متأخرة', `أول شريحة أرقام رقمها ${firstNum + 1} من ${vis.length} — الأرقام تشد الانتباه بدري`, { label: 'قدّم شريحة الأرقام', run: () => B.moveSlide(vis[firstNum].i, B.introIndex()) });
  else if (firstNum >= 0) add('good', 'الأرقام في مكان يشد الانتباه', '');
  // monotony
  let run = 1, worst = 1, worstAt = 0;
  for (let k = 1; k < content.length; k++) { if (content[k].role === content[k - 1].role) { run++; if (run > worst) { worst = run; worstAt = k; } } else run = 1; }
  if (worst >= 4) add('warn', 'تكرار نفس النوع', `${worst} شرائح «${content[worstAt].role}» ورا بعض — نوّع بين أرقام وصور ورسائل`, { label: 'وزّع التصاميم من جديد بتنويع أكبر', run: () => { const d2 = deck(); d2.slides.forEach((x, i) => { if (!x.edited) { x.layout = null; PM.autoSlide(d2, i); } }); PM.renumber(d2); PM.commit('story-variety'); PM.UI.renderAll(); return { ok: true, msg: 'وزّعت التصاميم بتنويع أكبر' }; } }, 0.7);
  // dense slides
  const dense = content.filter(x => x.words > 110);
  if (dense.length) add(dense.length > 2 ? 'bad' : 'warn', `${dense.length} شرائح مزدحمة`, 'الشرائح المزدحمة تكسر إيقاع القصة', { label: 'افتح أزحمها', run: () => { PM.UI.select(dense.sort((a, b) => b.words - a.words)[0].i); return { ok: true, msg: 'افتح «رأي الأداة» لتقسيمها' }; } });
  // sections balance
  const lone = secs.filter(x => x.title !== 'البداية' && x.items.length === 0);
  if (lone.length) add('warn', 'أقسام بدون محتوى', lone.map(x => x.title).join('، '));
  // ending
  const lastC = content[content.length - 1];
  if (lastC && !/خطو|التالي|القادم|المطلوب|التوصي|next|recommend|ask|decision|قرار/i.test(PM.specText(lastC.s.spec))) add('warn', 'النهاية ما فيها مطلوب أو خطوة جاية', 'الختام الأقوى: ايش تبي من الجمهور بعد العرض؟', { label: 'أضف «الخطوات القادمة» قبل الختام', run: () => B.addSlideAt(B.closingIndex(), { kind: 'content', title: en() ? 'Next steps' : 'الخطوات القادمة', blocks: [{ k: 'steps', items: (en() ? ['Decision needed', 'Owner and date', 'Follow-up'] : ['القرار المطلوب', 'المسؤول والموعد', 'المتابعة']).map(t => ({ title: t, text: '' })) }] }) });
  else if (lastC) add('good', 'نهاية فيها خطوة واضحة', '');
  if (vis.length > 30) add('warn', 'العرض طويل', `${vis.length} شريحة — لو الجمهور تنفيذي، ٱنقل التفاصيل لملحق`, null, 0.5);
  score = Math.max(0, Math.min(10, Math.round(score * 2) / 2));
  return { vis, sections: secs, notes, score };
};
B.introIndex = function () { const d = deck(); let i = 0; while (i < d.slides.length && ['cover', 'agenda'].includes(d.slides[i].spec.kind)) i++; return i; };
B.closingIndex = function () { const d = deck(); const k = d.slides.findIndex(x => x.spec.kind === 'closing'); return k < 0 ? d.slides.length : k; };
B.addSlideAt = function (at, spec) { const d = deck(); PM.addSlide(d, spec, at); PM.autoSlide(d, at); ST.cur = at; PM.renumber(d); PM.commit('story-add'); PM.UI.renderAll(); return { ok: true, msg: 'أضفت الشريحة — عدّل نصها بضغطتين' }; };
B.moveSlide = function (from, to) { const d = deck(); const [s] = d.slides.splice(from, 1); d.slides.splice(to > from ? to - 1 : to, 0, s); ST.cur = d.slides.indexOf(s); PM.renumber(d); PM.commit('story-move'); PM.UI.renderAll(); return { ok: true, msg: 'نقلت الشريحة' }; };

/* a better order for a stated goal (local plan) */
B.planStory = function (purpose, audience) {
  const d = deck();
  const exec = /تنفيذي|مجلس|الادار|الإدار|ceo|board|exec/i.test(audience || '');
  const list = d.slides.map((s, i) => ({ s, i, role: PM.slideRole(s), words: metrics(s.objs, d).words })).filter(x => !x.s.hidden);
  const cover = list.filter(x => x.s.spec.kind === 'cover');
  const agenda = list.filter(x => x.s.spec.kind === 'agenda');
  const closing = list.filter(x => x.s.spec.kind === 'closing');
  const body = list.filter(x => !['cover', 'agenda', 'closing'].includes(x.s.spec.kind));
  const steps = [];
  cover.forEach(x => steps.push({ type: 'keep', x }));
  agenda.forEach(x => steps.push({ type: 'keep', x }));
  const hasMsg = body.slice(0, 3).some(x => x.role === 'رسالة');
  if (purpose && !hasMsg) steps.push({ type: 'new', spec: { kind: 'content', title: en() ? 'The key message' : 'الرسالة الرئيسية', blocks: [{ k: 'para', text: purpose }] }, why: 'تبدأ القصة بالهدف' });
  const firstNum = body.find(x => x.role === 'أرقام');
  const moved = new Set();
  if (exec && firstNum && body.indexOf(firstNum) > 2) { steps.push({ type: 'move', x: firstNum, why: 'الجمهور التنفيذي يبي الأرقام بدري' }); moved.add(firstNum); }
  const appendix = [];
  for (const x of body) {
    if (moved.has(x)) continue;
    if (exec && x.words > 120 && x.role === 'تفاصيل') { appendix.push(x); continue; }
    steps.push({ type: 'keep', x });
  }
  const lastC = body[body.length - 1];
  if (purpose && lastC && !/خطو|التالي|القادم|المطلوب|next|decision|قرار/i.test(PM.specText(lastC.s.spec))) steps.push({ type: 'new', spec: { kind: 'content', title: en() ? 'What we need' : 'المطلوب', blocks: [{ k: 'steps', items: (en() ? ['The decision', 'Owner and date', 'Follow-up'] : ['القرار المطلوب', 'المسؤول والموعد', 'المتابعة']).map(t => ({ title: t, text: '' })) }] }, why: 'تنتهي القصة بالمطلوب من الجمهور' });
  if (appendix.length) { steps.push({ type: 'new', spec: { kind: 'divider', title: en() ? 'Appendix' : 'ملحق' }, why: 'التفاصيل الثقيلة تنتقل للملحق' }); appendix.forEach(x => steps.push({ type: 'appendix', x })); }
  closing.forEach(x => steps.push({ type: 'keep', x }));
  return steps;
};
B.applyPlan = function (steps) {
  const d = deck(); const nu = [];
  for (const st of steps) {
    if (st.x) nu.push(st.x.s);
    else if (st.spec) { const tmp = { id: 's' + Math.random().toString(36).slice(2, 9), spec: Object.assign({ kind: 'content', title: '', sub: '', eyebrow: '', blocks: [], imgs: [] }, st.spec), layout: null, tone: null, objs: [], edited: false }; nu.push(tmp); }
  }
  d.slides.filter(s => s.hidden).forEach(s => nu.push(s));
  d.slides = nu;
  d.slides.forEach((s, i) => { if (!s.layout) PM.autoSlide(d, i); });
  ST.cur = 0; PM.renumber(d); PM.commit('story'); PM.UI.renderAll();
};
B.story = function () {
  const d = deck(); if (!d) return;
  PM.Ed.endEdit();
  const st = PM.storyOf(d);
  const flow = st.vis.map(x => `<button class="sf" data-go="${x.i}" title="${esc(plain(x.s.spec.title || ''))}" style="--rc:${ROLE_C[x.role] || '#6B7A90'}"><span class="num">${x.i + 1}</span><i>${x.role}</i></button>`).join('');
  const roles = {}; st.vis.forEach(x => roles[x.role] = (roles[x.role] || 0) + 1);
  const notes = st.notes.slice().sort((a, b) => ({ bad: 0, warn: 1, info: 2, good: 3 })[a.lv] - ({ bad: 0, warn: 1, info: 2, good: 3 })[b.lv]);
  const body = `<div class="rv-top"><div class="rv-ring" style="--c:${st.score >= 8 ? '#0E8A5F' : st.score >= 6 ? '#004EAA' : '#B7791F'};--p:${st.score * 10}"><b class="num">${st.score}</b><span>من 10</span></div><div><h3 style="margin:0 0 4px">قصة العرض</h3><p class="hint" style="margin:0"><span class="num">${st.vis.length}</span> شريحة · <span class="num">${st.sections.filter(x => x.title !== 'البداية').length}</span> أقسام · ${Object.entries(roles).map(([k, v]) => `${k} <span class="num">${v}</span>`).join(' · ')}</p></div></div>
    <div class="sflow">${flow}</div>
    <div class="ssecs">${st.sections.map(x => `<div class="ssec"><b>${esc(x.title)}</b><span>${x.items.map(y => esc(plain(y.s.spec.title || '—'))).join(' ← ') || '<em>بدون شرائح</em>'}</span></div>`).join('')}</div>
    <div class="rv-list">${notes.map((x, k) => `<div class="issue"><i class="dot ${x.lv === 'bad' ? 'e' : x.lv === 'warn' ? 'w' : x.lv === 'good' ? 'ok' : 'i'}"></i><div><b>${esc(x.t)}</b><span>${esc(x.d)}</span></div>${x.fix ? `<button class="btn sec" data-fix="${k}" style="height:34px">${esc(x.fix.label)}</button>` : ''}</div>`).join('')}</div>
    <div class="sbetter hide" id="sBetter">
      <h4>${ic('target')}ايش الهدف من العرض؟</h4>
      <textarea class="inp" id="sGoal" style="min-height:70px" placeholder="مثل: إقناع الإدارة التنفيذية باعتماد ميزانية خطة جاهزية موسم العمرة قبل نهاية الشهر">${esc(d.goal || '')}</textarea>
      <h4 style="margin-top:12px">${ic('users')}الجمهور</h4>
      <div class="chips" id="sAud">${['الرئيس التنفيذي', 'مجلس الإدارة', 'الإدارة التنفيذية', 'فريق العمل', 'جهات خارجية', 'الموظفين'].map(a => `<button class="chip ${d.audience === a ? 'on' : ''}" data-a="${a}">${a}</button>`).join('')}</div>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn pri" id="sPlan">${ic('wand-sparkles')}اقترح قصة أفضل</button><button class="btn sec" id="sCop">${ic('sparkles')}اطلبها من كوبايلوت</button></div>
      <div id="sPlanOut"></div>
    </div>`;
  PM.UI.modal('قصة العرض', body, { wide: true, foot: `<button class="btn pri" id="sOpen">${ic('lightbulb')}كيف تكون القصة أفضل؟</button>` });
  $$('#modal [data-go]').forEach(b => b.onclick = () => { PM.UI.closeModal(); PM.UI.select(+b.dataset.go); });
  $$('#modal [data-fix]').forEach(b => b.onclick = () => { const x = notes[+b.dataset.fix]; PM.UI.closeModal(); const r = x.fix.run(); if (r && r.msg) PM.UI.toast('✓ ' + r.msg, 3000); });
  $('#sOpen').onclick = () => { $('#sBetter').classList.remove('hide'); $('#sOpen').classList.add('hide'); $('#sGoal').focus(); $('#sBetter').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $$('#sAud .chip').forEach(b => b.onclick = () => { $$('#sAud .chip').forEach(x => x.classList.toggle('on', x === b)); d.audience = b.dataset.a; });
  $('#sGoal').oninput = e => { d.goal = e.target.value; };
  $('#sPlan').onclick = () => {
    const goal = $('#sGoal').value.trim();
    const steps = B.planStory(goal, d.audience);
    const lab = { keep: '', new: 'جديدة', move: 'منقولة', appendix: 'للملحق' };
    const changes = steps.filter(x => x.type !== 'keep').length;
    $('#sPlanOut').innerHTML = `<h4 style="margin-top:16px">${ic('route')}القصة المقترحة ${changes ? `<span class="hint">(${changes} تغيير)</span>` : ''}</h4>
      <ol class="splan">${steps.map(x => `<li class="sp-${x.type}"><span>${esc(plain(x.x ? (x.x.s.spec.title || '—') : x.spec.title))}</span>${lab[x.type] ? `<em>${lab[x.type]}</em>` : ''}${x.why ? `<small>${esc(x.why)}</small>` : ''}</li>`).join('')}</ol>
      ${changes ? `<button class="btn pri" id="sApply">${ic('check')}طبّق القصة المقترحة</button> <span class="hint">تقدر تتراجع بـ Ctrl+Z</span>` : '<p class="hint">ترتيبك الحالي يخدم الهدف. لتحسين الصياغة نفسها جرّب «اطلبها من كوبايلوت».</p>'}`;
    const ap = $('#sApply'); if (ap) ap.onclick = () => { PM.UI.closeModal(); B.applyPlan(steps); PM.UI.toast('✓ طبّقت القصة المقترحة — الشرائح الجديدة جاهزة لنصك', 3500); };
  };
  $('#sCop').onclick = () => {
    const goal = $('#sGoal').value.trim();
    if (!goal) { PM.UI.toast('اكتب الهدف من العرض أولاً'); $('#sGoal').focus(); return; }
    const vis = d.slides.map((s, i) => ({ s, i })).filter(x => !x.s.hidden);
    const list = vis.map(x => `S${x.i + 1} | ${PM.slideRole(x.s)} | ${plain(x.s.spec.title || '—')} | ${plain(PM.specText(x.s.spec)).replace(/\s+/g, ' ').slice(0, 140)}`).join('\n');
    const prompt = `أنت مستشار قصص عروض تنفيذية لمطارات جدة (JEDCO).
الهدف من العرض: «${goal}»
الجمهور: ${d.audience || 'غير محدد'}
${RULES}
هذي شرائح العرض بالترتيب (رقم | دور | عنوان | مختصر المحتوى):
${list}

اقترح قصة أقوى تخدم الهدف. رد بهذه الصيغة فقط، بدون أي شرح:
ORDER: S1, S2, N1, S5, ...   (الترتيب الجديد، تقدر تحذف شرائح ما تخدم الهدف بعدم ذكرها)
N1 | النوع | العنوان | محتوى قصير   (لكل شريحة جديدة؛ النوع واحد من: رسالة، أرقام، مراحل، نقاط، بنود، فاصل)
TITLE S4 | عنوان أقوى   (اختياري لتحسين عنوان شريحة موجودة)`;
    PM.UI.closeModal();
    B.copilotModal('قصة أفضل عبر كوبايلوت', prompt, 'ORDER: S1, S2, N1, …\nN1 | رسالة | … | …', reply => B.applyCopilotStory(reply));
  };
};
B.applyCopilotStory = function (reply) {
  const d = deck();
  const L = reply.replace(/\r/g, '').split('\n').map(x => x.trim()).filter(Boolean);
  const ord = L.find(x => /^ORDER\s*[:：]/i.test(x));
  if (!ord) { PM.UI.toast('ما لقيت سطر ORDER في الرد', 3500); return false; }
  const news = {};
  L.forEach(x => { const m = x.match(/^(N\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|?\s*(.*)$/i); if (m) news[m[1].toUpperCase()] = { type: m[2].trim(), title: m[3].trim(), text: m[4].trim() }; });
  L.forEach(x => { const m = x.match(/^TITLE\s+S(\d+)\s*\|\s*(.+)$/i); if (m) { const s = d.slides[+m[1] - 1]; if (s) { s.spec.title = m[2].trim(); s.layout = s.layout; PM.relayout(d, +m[1] - 1); } } });
  const typeSpec = (n) => {
    const t = nrm(n.type);
    if (/فاصل|divider/.test(t)) return { kind: 'divider', title: n.title };
    if (/ارقام|numbers/.test(t)) return { kind: 'content', title: n.title, blocks: [{ k: 'kpis', items: n.text.split(/[،,;]\s*/).filter(Boolean).slice(0, 4).map(x => { const mm = x.match(/^([\d٠-٩.,%٪+]+\s*\S*)\s+(.*)$/); return mm ? { value: mm[1], label: mm[2] } : { value: '—', label: x }; }) }] };
    if (/مراحل|steps/.test(t)) return { kind: 'content', title: n.title, blocks: [{ k: 'steps', items: n.text.split(/[،,;]\s*/).filter(Boolean).map(x => ({ title: x, text: '' })) }] };
    if (/نقاط|bullets/.test(t)) return { kind: 'content', title: n.title, blocks: [{ k: 'bullets', items: n.text.split(/[،,;]\s*/).filter(Boolean) }] };
    if (/بنود|items/.test(t)) return { kind: 'content', title: n.title, blocks: [{ k: 'items', items: n.text.split(/[،,;]\s*/).filter(Boolean).map(x => ({ title: x, text: '' })) }] };
    return { kind: 'content', title: n.title, blocks: [{ k: 'para', text: n.text || n.title }] };
  };
  const toks = ord.replace(/^ORDER\s*[:：]\s*/i, '').split(/[,،\s]+/).filter(Boolean);
  const steps = [];
  const seen = new Set();
  for (const tk of toks) {
    const up = tk.toUpperCase();
    let m;
    if ((m = up.match(/^S(\d+)$/))) { const i = +m[1] - 1; const s = d.slides[i]; if (s && !seen.has(i)) { seen.add(i); steps.push({ type: 'keep', x: { s } }); } }
    else if (news[up]) steps.push({ type: 'new', spec: typeSpec(news[up]) });
  }
  if (!steps.length) { PM.UI.toast('ما قدرت أقرأ الترتيب من الرد', 3500); return false; }
  // the cover and closing always stay in place
  const cov = d.slides.find(s => s.spec.kind === 'cover'), clo = d.slides.find(s => s.spec.kind === 'closing');
  if (cov && !steps.some(x => x.x && x.x.s === cov)) steps.unshift({ type: 'keep', x: { s: cov } });
  if (clo && !steps.some(x => x.x && x.x.s === clo)) steps.push({ type: 'keep', x: { s: clo } });
  const dropped = d.slides.filter(s => !steps.some(x => x.x && x.x.s === s) && !s.hidden);
  dropped.forEach(s => { s.hidden = true; steps.push({ type: 'keep', x: { s } }); });
  B.applyPlan(steps);
  PM.UI.toast(`✓ طبّقت قصة Copilot${dropped.length ? ` وأخفيت ${dropped.length} شريحة (موجودة لو تبيها)` : ''}`, 4000);
};

/* ======================================================================
   find & replace · approved terminal names
   ====================================================================== */
function replaceIn(val, find, rep) {
  if (typeof val === 'string') return val.split(find).join(rep);
  if (Array.isArray(val)) return val.map(v => replaceIn(v, find, rep));
  if (val && typeof val === 'object') { const o = {}; for (const [k, v] of Object.entries(val)) o[k] = /^(k|kind|icon|bind)$/.test(k) ? v : replaceIn(v, find, rep); return o; }
  return val;
}
B.count = function (find) {
  const d = deck(); let n = 0; const where = new Set();
  d.slides.forEach((s, i) => s.objs.forEach(o => { if (o.t === 'text') o.paras.forEach(p => { const c = plain(p.t).split(find).length - 1; if (c) { n += c; where.add(i); } }); if (o.t === 'table') o.rows.forEach(r => r.forEach(c2 => { const c = String(c2).split(find).length - 1; if (c) { n += c; where.add(i); } })); }));
  return { n, where: [...where] };
};
B.replaceAll = function (find, rep) {
  const d = deck(); if (!find) return 0;
  const { n } = B.count(find);
  d.slides.forEach(s => {
    ['title', 'sub', 'eyebrow', 'notes'].forEach(k => { if (typeof s.spec[k] === 'string') s.spec[k] = s.spec[k].split(find).join(rep); });
    if (s.spec.blocks) s.spec.blocks = replaceIn(s.spec.blocks, find, rep);
    if (s.spec.items) s.spec.items = replaceIn(s.spec.items, find, rep);
    s.objs.forEach(o => {
      if (o.t === 'text') { let ch = false; o.paras.forEach(p => { if (!p.t.includes(find) && plain(p.t).includes(find)) p.t = plain(p.t); if (p.t.includes(find)) { p.t = p.t.split(find).join(rep); ch = true; if (p.bind) PM.writeBind(s.spec, p.bind, p.t); } }); if (ch) PM.TextTools.fitH(o); }
      if (o.t === 'table') o.rows = o.rows.map(r => r.map(c => String(c).split(find).join(rep)));
    });
  });
  if (n) { PM.commit('replace'); PM.UI.renderAll(); }
  return n;
};
B.findReplace = function () {
  const d = deck(); if (!d) return;
  PM.Ed.endEdit();
  const body = `<label class="f">ابحث عن</label><input class="inp" id="frF" placeholder="كلمة أو جملة">
    <label class="f" style="margin-top:10px">استبدلها بـ</label><input class="inp" id="frR" placeholder="اتركها فاضية للحذف">
    <p class="hint" id="frN" style="margin-top:10px"></p><div id="frW" class="chips"></div>`;
  PM.UI.modal('بحث واستبدال في كل العرض', body, { foot: `<button class="btn pri" id="frGo">${ic('replace')}استبدل الكل</button>` });
  const upd = () => { const f = $('#frF').value; if (!f) { $('#frN').textContent = ''; $('#frW').innerHTML = ''; return; } const r = B.count(f); $('#frN').innerHTML = r.n ? `لقيتها <b class="num">${r.n}</b> مرة في <b class="num">${r.where.length}</b> شريحة` : 'ما لقيتها'; $('#frW').innerHTML = r.where.map(i => `<button class="chip" data-go="${i}">الشريحة <span class="num">${i + 1}</span></button>`).join(''); $$('#frW [data-go]').forEach(b => b.onclick = () => { PM.UI.closeModal(); PM.UI.select(+b.dataset.go); }); };
  $('#frF').oninput = upd; setTimeout(() => $('#frF').focus(), 30);
  $('#frGo').onclick = () => { const f = $('#frF').value; if (!f) return; const n = B.replaceAll(f, $('#frR').value); PM.UI.closeModal(); PM.UI.toast(n ? `✓ استبدلت ${n} مرة` : 'ما لقيت الكلمة'); };
};
B.fixTerminals = function () {
  const d = deck(); let n = 0;
  n += B.replaceAll('الصالة الجنوبية', 'الصالة 4');
  n += B.replaceAll('South Terminal', 'Terminal 4');
  // «صالات الحج والعمرة» → the approved name (once, never twice)
  const T3 = 'الصالة 3ب (مجمع صالات الحج والعمرة)';
  d.slides.forEach(s => s.objs.forEach(o => { if (o.t === 'text') o.paras.forEach(p => { if (p.t.includes('صالات الحج والعمرة') && !p.t.includes('3ب')) { p.t = p.t.replace(/(مجمع\s+)?صالات الحج والعمرة/g, T3); n++; if (p.bind) PM.writeBind(s.spec, p.bind, p.t); PM.TextTools.fitH(o); } }); }));
  PM.commit('terminals'); PM.UI.renderAll();
  return n;
};
})(window.PM);
