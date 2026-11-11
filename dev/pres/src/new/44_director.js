/* ==========================================================================
   صانع العروض 2 — «المخرج»
   From raw material to a finished executive deck:
     · four ways in: raw text / a one-line idea / a Word or PowerPoint file / numbers and tables
     · a short brief (kind of deck, goal, audience, length, language, wording)
     · «مع كوبايلوت»: one request that carries the whole method → Copilot's reply
       is read here and built on the Jeddah Airports layouts
     · «بدون إنترنت»: the tool structures the material itself
     · after the build: every number is checked against the source material
   ========================================================================== */
(function (PM) {
'use strict';
const ST = PM.ST;
const D = PM.Director = {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = PM.esc;
const ic = n => PM.UI.ic(n);
const wc = t => PM.words(t);
const plain = t => PM.plain(t);
const nrm = t => String(t || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase().trim();

/* ---------- the brief ---------- */
const TYPES = [
  { id: 'decision', ar: 'قرار أو اعتماد', en: 'Decision or approval',
    arcAr: 'الخلاصة والمطلوب أولاً ← لماذا الآن ← الحل أو الخيارات ← الأثر والتكلفة ← المخاطر وكيف نعالجها ← القرار المطلوب بوضوح',
    arcEn: 'the bottom line and the ask first → why now → the solution or options → impact and cost → risks and mitigation → the decision needed',
    skel: [['الخلاصة والمطلوب', 'para'], ['لماذا الآن', 'items'], ['الحل المقترح', 'steps'], ['الأثر والتكلفة', 'kpis'], ['المخاطر وكيف نعالجها', 'compare'], ['القرار المطلوب', 'steps']],
    skelEn: [['The bottom line', 'para'], ['Why now', 'items'], ['The proposed solution', 'steps'], ['Impact and cost', 'kpis'], ['Risks and mitigation', 'compare'], ['The decision we need', 'steps']] },
  { id: 'update', ar: 'تحديث وإنجازات', en: 'Update and results',
    arcAr: 'أبرز النتائج بالأرقام ← ما تم إنجازه ← التحديات وما تعلمناه ← ما القادم ← الدعم المطلوب',
    arcEn: 'headline results in numbers → what was delivered → challenges and lessons → what comes next → the support needed',
    skel: [['أبرز النتائج', 'kpis'], ['ما تم إنجازه', 'items'], ['التحديات وما تعلمناه', 'items'], ['ما القادم', 'timeline'], ['الدعم المطلوب', 'steps']],
    skelEn: [['Headline results', 'kpis'], ['What was delivered', 'items'], ['Challenges and lessons', 'items'], ['What comes next', 'timeline'], ['The support we need', 'steps']] },
  { id: 'proposal', ar: 'مقترح أو مبادرة', en: 'Proposal or initiative',
    arcAr: 'الفرصة أو المشكلة ← الفكرة في جملة ← كيف تُنفّذ ← الأثر المتوقع ← الموارد والجدول الزمني ← المطلوب',
    arcEn: 'the opportunity or problem → the idea in one line → how it works → expected impact → resources and timeline → the ask',
    skel: [['الفرصة', 'para'], ['الفكرة', 'items'], ['كيف تُنفّذ', 'steps'], ['الأثر المتوقع', 'kpis'], ['الجدول الزمني', 'timeline'], ['المطلوب', 'steps']],
    skelEn: [['The opportunity', 'para'], ['The idea', 'items'], ['How it works', 'steps'], ['Expected impact', 'kpis'], ['Timeline', 'timeline'], ['The ask', 'steps']] },
  { id: 'aware', ar: 'تعريف وتوعية', en: 'Awareness or introduction',
    arcAr: 'لماذا يهمّك الموضوع ← ما هو ← كيف يعمل ← أمثلة من الواقع ← ماذا تفعل من اليوم',
    arcEn: 'why it matters to you → what it is → how it works → real examples → what to do from today',
    skel: [['لماذا يهمّك', 'para'], ['ما هو', 'items'], ['كيف يعمل', 'steps'], ['أمثلة من الواقع', 'items'], ['ماذا تفعل من اليوم', 'steps']],
    skelEn: [['Why it matters', 'para'], ['What it is', 'items'], ['How it works', 'steps'], ['Real examples', 'items'], ['What to do from today', 'steps']] }
];
const AUD = ['الرئيس التنفيذي', 'مجلس الإدارة', 'الإدارة التنفيذية', 'فريق العمل', 'جهات خارجية', 'الموظفين'];
const AUD_EN = { 'الرئيس التنفيذي': 'the CEO', 'مجلس الإدارة': 'the Board', 'الإدارة التنفيذية': 'executive management', 'فريق العمل': 'the working team', 'جهات خارجية': 'external parties', 'الموظفين': 'all employees' };
const LEN = { auto: { ar: 'اختر العدد المناسب للمحتوى (غالباً 6 إلى 12 شريحة محتوى)', en: 'pick what the content needs (usually 6 to 12 content slides)' }, short: { ar: 'من 5 إلى 7 شرائح محتوى', en: '5 to 7 content slides' }, mid: { ar: 'من 8 إلى 12 شريحة محتوى', en: '8 to 12 content slides' }, long: { ar: 'من 13 إلى 18 شريحة محتوى', en: '13 to 18 content slides' } };
const isExec = a => /تنفيذي|مجلس/.test(a || '');
const KEY = 'pm.director.v1';

const S = D.S = { mode: 'text', text: '', idea: '', facts: '', data: '', type: 'decision', goal: '', audience: '', len: 'auto', lang: 'auto', wording: 'rewrite', file: null, reply: '', view: 'brief', done: {} };
function load() { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); ['mode', 'text', 'idea', 'facts', 'data', 'type', 'goal', 'audience', 'len', 'lang', 'wording'].forEach(k => { if (o[k] != null) S[k] = o[k]; }); } catch (e) { } }
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { const o = {}; ['mode', 'idea', 'facts', 'type', 'goal', 'audience', 'len', 'lang', 'wording'].forEach(k => o[k] = S[k]); o.text = S.text.slice(0, 200000); o.data = S.data.slice(0, 200000); localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } }, 500); }

/* ======================================================================
   numbers: what the material really says
   ====================================================================== */
function numsOf(t) {
  const out = new Set();
  const s = PM.digits(String(t || '')).replace(/٫/g, '.').replace(/[٬,](?=\d{3}(?!\d))/g, '');
  (s.match(/\d+(?:\.\d+)?/g) || []).forEach(x => out.add(String(parseFloat(x))));
  return out;
}
D.numsOf = numsOf;

/* ======================================================================
   tables: pasted from Excel, a .csv or an .xlsx file
   ====================================================================== */
function splitCsvLine(l, sep) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(x => x.trim());
}
/* text → [{title, rows}] — tab, pipe, semicolon or comma separated; a blank line or a lone title line starts a new table */
function parseTables(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const body = lines.filter(l => l.trim());
  const cnt = ch => body.filter(l => l.includes(ch)).length;
  const sep = cnt('\t') >= body.length * 0.5 ? '\t' : cnt('|') >= body.length * 0.5 ? '|' : cnt(';') >= body.length * 0.6 ? ';' : cnt(',') >= body.length * 0.6 ? ',' : '\t';
  const tables = []; let cur = null, pendingTitle = '';
  const flush = () => { if (cur && cur.rows.length) tables.push(cur); cur = null; };
  for (const raw of lines) {
    let l = raw.replace(/\s+$/, '');
    if (!l.trim()) { flush(); continue; }
    if (sep === '|') { if (/^[\s|:\-]+$/.test(l)) continue; l = l.trim().replace(/^\|/, '').replace(/\|$/, ''); }
    const cells = splitCsvLine(l, sep);
    const filled = cells.filter(Boolean);
    if (filled.length <= 1) { flush(); pendingTitle = filled[0] || ''; continue; }
    if (!cur) { cur = { title: pendingTitle, rows: [] }; pendingTitle = ''; }
    cur.rows.push(cells);
  }
  flush();
  // square the rows and drop empty columns
  tables.forEach(t => {
    const n = Math.max(...t.rows.map(r => r.length));
    t.rows = t.rows.map(r => Array.from({ length: n }, (_, i) => r[i] || ''));
    const keep = Array.from({ length: n }, (_, c) => t.rows.some(r => r[c]));
    t.rows = t.rows.map(r => r.filter((_, c) => keep[c]));
  });
  return tables.filter(t => t.rows.length >= 2 && t.rows[0].length >= 2);
}
D.parseTables = parseTables;
const tablesToText = tabs => tabs.map(t => (t.title ? t.title + '\n' : '') + t.rows.map(r => r.join(' | ')).join('\n')).join('\n\n');

/* .xlsx → text (every sheet, shared strings, percent and date formats) */
async function readXlsx(buf) {
  const zip = await JSZip.loadAsync(buf);
  const P = new DOMParser();
  const xml = async p => zip.file(p) ? P.parseFromString(await zip.file(p).async('string'), 'application/xml') : null;
  const tags = (el, n) => el ? Array.from(el.getElementsByTagName(n)) : [];
  const ss = tags(await xml('xl/sharedStrings.xml'), 'si').map(si => tags(si, 't').map(t => t.textContent).join(''));
  const st = await xml('xl/styles.xml');
  const custom = {}; tags(st, 'numFmt').forEach(n => custom[n.getAttribute('numFmtId')] = n.getAttribute('formatCode') || '');
  const xfs = tags(tags(st, 'cellXfs')[0], 'xf').map(x => +x.getAttribute('numFmtId'));
  const kindOf = s => { const id = xfs[+s]; if (id == null) return ''; const code = custom[id] || ''; if (id === 9 || id === 10 || /%/.test(code)) return 'pct'; if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47) || (/[dy]/i.test(code.replace(/"[^"]*"|\[[^\]]*\]/g, '')) && !/[#0]/.test(code))) return 'date'; return ''; };
  const wb = await xml('xl/workbook.xml');
  const rels = await xml('xl/_rels/workbook.xml.rels');
  const relMap = {}; tags(rels, 'Relationship').forEach(r => relMap[r.getAttribute('Id')] = r.getAttribute('Target'));
  const sheets = tags(wb, 'sheet').map(s => ({ name: s.getAttribute('name'), path: 'xl/' + String(relMap[s.getAttribute('r:id')] || '').replace(/^\/?xl\//, '').replace(/^\//, '') }));
  const out = [];
  const colOf = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  for (const sh of sheets.slice(0, 8)) {
    const d = await xml(sh.path); if (!d) continue;
    const rows = [];
    for (const r of tags(d, 'row')) {
      const row = [];
      for (const c of tags(r, 'c')) {
        const t = c.getAttribute('t'), v = (tags(c, 'v')[0] || {}).textContent;
        let val = '';
        if (t === 's') val = ss[+v] || '';
        else if (t === 'inlineStr') val = tags(c, 't').map(x => x.textContent).join('');
        else if (t === 'str' || t === 'b' || t === 'e') val = v || '';
        else if (v != null && v !== '') {
          const k = kindOf(c.getAttribute('s')), n = parseFloat(v);
          if (k === 'pct') val = (Math.round(n * 10000) / 100) + '%';
          else if (k === 'date' && n > 59) { const dt = new Date(Math.round((n - 25569) * 86400000)); val = dt.toISOString().slice(0, 10); }
          else val = String(Math.round(n * 1e6) / 1e6);
        }
        row[colOf(c.getAttribute('r') || 'A1')] = String(val).trim();
      }
      if (row.some(Boolean)) rows.push(Array.from(row, x => x || ''));
      if (rows.length > 400) break;
    }
    if (rows.length >= 2) out.push((sheets.length > 1 ? sh.name + '\n' : '') + rows.map(r => r.join('\t')).join('\n'));
  }
  if (!out.length) throw new Error('ما لقيت جداول في ملف Excel');
  return out.join('\n\n');
}
D.readXlsx = readXlsx;

/* ======================================================================
   the material of each way in → { text, nums, specs, assets, name }
   ====================================================================== */
function specsToText(specs, en) {
  return specs.map((s, i) => {
    const head = en ? `--- Source slide ${i + 1} ---` : `--- شريحة المصدر ${i + 1} ---`;
    if (s.kind === 'agenda') return head + '\n' + (s.title || '') + '\n' + (s.items || []).map(x => '- ' + plain(x.title)).join('\n');
    return head + '\n' + PM.slideToText(s) + (s.notes ? '\n' + (en ? 'Notes: ' : 'ملاحظات: ') + s.notes : '');
  }).join('\n\n');
}
async function readSourceFile(f) {
  const name = f.name || '';
  const buf = await f.arrayBuffer();
  if (/\.(xlsx|xlsm)$/i.test(name)) return { kind: 'data', text: await readXlsx(buf), name };
  if (/\.(csv|tsv|txt)$/i.test(name)) return { kind: /\.txt$/i.test(name) ? 'text' : 'data', text: new TextDecoder('utf-8').decode(buf).replace(/^﻿/, ''), name };
  let zip;
  try { zip = await JSZip.loadAsync(buf); } catch (e) { throw new Error('ما قدرت أفتح الملف. المقبول: Word، PowerPoint، Excel أو CSV.'); }
  let res;
  if (zip.file('word/document.xml')) res = PM.analyzeDocx(await parseDocx(zip, {}), { keep: true });
  else if (zip.file('ppt/presentation.xml')) res = await PM.analyzePptx(await parsePptx(zip, {}), { keep: true });
  else if (zip.file('xl/workbook.xml')) return { kind: 'data', text: await readXlsx(buf), name };
  else throw new Error('الملف ما فيه محتوى Word أو PowerPoint');
  const specs = res.specs.filter(s => s.title || (s.blocks || []).length || (s.items || []).length);
  return { kind: 'file', specs, assets: res.assets || {}, lang: res.lang, name, file: f };
}
function material() {
  if (S.mode === 'text') return { text: S.text.trim(), name: '' };
  if (S.mode === 'idea') return { text: [S.idea.trim(), S.facts.trim()].filter(Boolean).join('\n\n'), idea: S.idea.trim(), facts: S.facts.trim(), name: S.idea.trim().slice(0, 60) };
  if (S.mode === 'data') return { text: S.data.trim(), tables: parseTables(S.data), name: '' };
  if (S.mode === 'file') {
    const f = S.file; if (!f) return { text: '' };
    return { text: specsToText(f.specs, f.lang === 'en'), specs: f.specs, assets: f.assets, name: (f.name || '').replace(/\.(pptx|docx)$/i, ''), srcLang: f.lang };
  }
  return { text: '' };
}
function langOf(m) {
  if (S.lang !== 'auto') return S.lang;
  if (S.mode === 'file' && m.srcLang) return m.srcLang === 'en' ? 'en' : 'ar';
  const t = m.text || '';
  const ar = (t.match(/[؀-ۿ]/g) || []).length, la = (t.match(/[A-Za-z]/g) || []).length;
  return la > ar * 2.5 && la > 40 ? 'en' : 'ar';
}

/* ======================================================================
   the request Copilot gets — the whole method in one message
   ====================================================================== */
const RULES_AR = 'قواعد مطارات جدة: اكتب «مطارات جدة» ولا تكتب JEDCO أو «جدكو». لا تذكر «الصالة الشمالية». «الصالة الجنوبية» اسمها «الصالة 4». «صالات الحج والعمرة» اسمها «الصالة 3ب (مجمع صالات الحج والعمرة)».';
const RULES_EN = 'Jeddah Airports rules: write "Jeddah Airports", never "JEDCO". Never mention the "North Terminal". The "South Terminal" is "Terminal 4". The "Hajj and Umrah terminals" are "Terminal 3B (Hajj and Umrah Terminal Complex)".';
const PART = 8500, ONE = 11500;
function chunk(text, size) {
  const paras = text.split(/\n{2,}/); const out = []; let cur = '';
  const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
  for (let p of paras) {
    while (p.length > size) { const cut = p.lastIndexOf('\n', size) > size * 0.5 ? p.lastIndexOf('\n', size) : (p.lastIndexOf(' ', size) > 0 ? p.lastIndexOf(' ', size) : size); if (cur) push(); out.push(p.slice(0, cut).trim()); p = p.slice(cut); }
    if (cur.length + p.length + 2 > size) push();
    cur += (cur ? '\n\n' : '') + p;
  }
  push();
  return out;
}
D.buildPrompt = function (m, lang) {
  const en = lang === 'en';
  const T = TYPES.find(t => t.id === S.type) || TYPES[0];
  const mode = S.mode;
  const numRule = mode === 'idea'
    ? (en ? 'There is no detailed source: write the content from your general knowledge of the topic and of the airport sector. But never invent numbers, dates or names about Jeddah Airports — write [number needed] or [name needed] in their place so the presenter fills them in. Use the facts the presenter gave exactly as written.'
      : 'لا توجد مادة مفصلة: اكتب المحتوى من معرفتك العامة بالموضوع وبقطاع المطارات. لكن ممنوع اختراع أرقام أو تواريخ أو أسماء تخص مطارات جدة: اكتب مكانها [رقم مطلوب] أو [اسم مطلوب] ليعبئها صاحب العرض. الحقائق التي كتبها صاحب العرض استخدمها كما هي.')
    : mode === 'data'
      ? (en ? 'Analyse the data before writing: highest and lowest, the trend over time, rates of change, outliers. Every important finding is one slide whose title states the finding. Use the original numbers exactly as given. Any number you calculate yourself (total, average, rate of change) must be exact, and you state how you calculated it in that slide\'s Notes line. Never invent numbers.'
        : 'حلّل البيانات قبل الكتابة: الأعلى والأدنى، الاتجاه عبر الزمن، نسب التغير، والقيم الشاذة. كل استنتاج مهم = شريحة عنوانها الاستنتاج نفسه. استخدم الأرقام الأصلية كما هي تماماً. أي رقم تحسبه أنت (مجموع، متوسط، نسبة تغير) احسبه بدقة واذكر طريقة حسابه في سطر «ملاحظات» لتلك الشريحة. ممنوع اختراع أرقام.')
      : (en ? 'Numbers, dates and names: copy them from the source exactly. Never invent a number, date, name or percentage. If a slide needs a number the source does not have, write [number needed] in its place.'
        : 'الأرقام والتواريخ والأسماء: انقلها من المادة كما هي تماماً. ممنوع اختراع أي رقم أو تاريخ أو اسم أو نسبة. إن احتاجت الشريحة رقماً غير موجود في المادة فاكتب مكانه [رقم مطلوب].');
  const wordRule = S.wording === 'keep' && mode !== 'idea'
    ? (en ? 'Keep the author\'s wording as much as possible: reorder, shorten and choose the form, but do not rewrite sentences except to shorten them.' : 'حافظ على صياغة صاحب المادة قدر الإمكان: رتّب واختصر واختر الشكل، ولا تُعد كتابة الجمل إلا للاختصار.')
    : (en ? 'Write in direct executive language: short sentences, clear verbs, no filler and no decorative phrases.' : 'اكتب بلغة تنفيذية مباشرة: جمل قصيرة، أفعال واضحة، بلا حشو ولا عبارات إنشائية.');
  const exec = isExec(S.audience) ? (en ? '\n10. The audience is executive: the bottom line and the key numbers come in the first two content slides. Heavy detail goes after a section slide titled "Appendix".' : '\n١٠. الجمهور تنفيذي: الخلاصة والأرقام الأهم في أول شريحتي محتوى. أي تفصيل ثقيل ضعه بعد شريحة فاصل عنوانها «ملحق».') : '';
  const goal = S.goal.trim();
  const ar = `أنت مخرج عروض تنفيذية بخبرة مستشار استراتيجية، وتعمل لشركة «مطارات جدة». حوّل المادة إلى عرض تقديمي كامل.

الموجز
• نوع العرض: ${T.ar}
• الهدف: ${goal || 'استنتجه من المادة'}
• الجمهور: ${S.audience || 'غير محدد'}
• الطول: ${LEN[S.len].ar}
• اللغة: العربية بلغة أعمال واضحة

طريقة العمل (نفّذها بصمت ولا تكتبها في الرد)
١. حدّد الرسالة الواحدة التي يجب أن يخرج بها الجمهور، وابنِ كل الشرائح لخدمتها. ما لا يخدمها احذفه.
٢. رتّب القصة هكذا: ${T.arcAr}.
٣. كل شريحة = رسالة واحدة. عنوان الشريحة جملة تقول الخلاصة (مثل: «زمن الانتظار انخفض 40% بعد التشغيل الجديد») وليس اسم موضوع («زمن الانتظار»)، في أقل من 10 كلمات.
٤. اختر لكل شريحة الشكل الأسرع في إيصال فكرتها: [أرقام] للمؤشرات، [مراحل] للخطوات المتتابعة، [خط زمني] للتواريخ، [مقارنة] لقبل/بعد أو لخيارين، [رسم بياني] لسلسلة أرقام، [جدول] لبيانات بعدة أعمدة، [بنود] لـ 3 إلى 6 أفكار متوازية، [فقرة] لرسالة واحدة قوية، [اقتباس] لقول مسؤول، و[نقاط] عند الحاجة فقط. لا تكرر الشكل نفسه في أكثر من شريحتين متتاليتين.
٥. اختصر: البند = عنوان من 2 إلى 5 كلمات + شرح أقل من 18 كلمة. الحد الأقصى 6 عناصر و70 كلمة في الشريحة. ما زاد قسّمه على شريحتين.
٦. ${numRule}
٧. آخر شريحة محتوى تجيب بوضوح: ما المطلوب من الجمهور أو ما الخطوة القادمة.
٨. ${wordRule}
٩. ${RULES_AR}${exec}

صيغة الرد (إلزامية، الرد تقرأه أداة آلياً)
• نص عادي فقط: بدون Markdown، بدون نجوم، بدون أي مقدمة أو تعليق قبل الرد أو بعده.
• الترتيب: غلاف (عنوان وعنوان فرعي فقط) ← محاور (إذا كان المحتوى 6 شرائح أو أكثر) ← المحتوى (شريحة «فاصل» بين الأقسام فقط إذا تجاوز العرض 10 شرائح) ← ختام.
• كل شريحة بهذا الشكل:
=== شريحة ===
النوع: غلاف أو محاور أو فاصل أو محتوى أو ختام
العنوان: …
العنوان الفرعي: … (اختياري)
ثم في شريحة المحتوى كتلة واحدة (اثنتان كحد أقصى) بإحدى هذه الصيغ بالضبط:
[أرقام]
- 53 مليون :: مسافر :: شرح قصير اختياري
[بنود]
- عنوان البند :: شرح البند
[مراحل]
1. اسم المرحلة :: ما يحدث فيها
[خط زمني]
- التاريخ :: الحدث :: تفصيل اختياري
[نقاط]
- نقطة
[فقرة]
نص الرسالة
[اقتباس]
نص الاقتباس :: اسم القائل ومنصبه
[مقارنة]
# عنوان الطرف الأول
- نقطة
# عنوان الطرف الثاني
- نقطة
[جدول]
العمود الأول | العمود الثاني | العمود الثالث
قيمة | قيمة | قيمة
[رسم بياني]
الشكل: أعمدة (أو خط أو دائري أو شريطي)
الوحدة: %
الفئة | اسم السلسلة
2024 | 49
ملاحظات: ما يقوله المتحدث في سطر أو سطرين (اختياري)
• بنود شريحة «محاور» تُكتب تحت [نقاط].
• اختم الرد بهذا السطر: === نهاية ===`;
  const enP = `You are an executive presentation director with a strategy consultant's experience, working for Jeddah Airports. Turn the source into a complete presentation.

Brief
• Kind of deck: ${T.en}
• Goal: ${goal || 'infer it from the source'}
• Audience: ${AUD_EN[S.audience] || 'not specified'}
• Length: ${LEN[S.len].en}
• Language: clear business English

Method (do it silently, do not write it in the reply)
1. Find the single message the audience must leave with, and build every slide to serve it. Cut what does not.
2. Order the story like this: ${T.arcEn}.
3. One slide = one message. The slide title is a sentence that states the conclusion (e.g. "Waiting time fell 40% after the new operation"), not a topic name ("Waiting time"), in under 10 words.
4. Give each slide the form that lands its idea fastest: [numbers] for indicators, [steps] for a sequence, [timeline] for dates, [compare] for before/after or two options, [chart] for a series of numbers, [table] for multi-column data, [items] for 3 to 6 parallel ideas, [paragraph] for one strong message, [quote] for an official's words, and [bullets] only when needed. Never use the same form on more than two slides in a row.
5. Be brief: an item = a title of 2 to 5 words + an explanation under 18 words. At most 6 elements and 70 words per slide. Split anything beyond that over two slides.
6. ${numRule}
7. The last content slide answers clearly: what is needed from the audience, or what the next step is.
8. ${wordRule}
9. ${RULES_EN}${exec}

Reply format (mandatory, a tool reads the reply automatically)
• Plain text only: no Markdown, no asterisks, no introduction or comment before or after the reply.
• Order: cover (title and subtitle only) → agenda (if there are 6 content slides or more) → content (a "section" slide between parts only if the deck passes 10 slides) → closing.
• Every slide looks like this:
=== Slide ===
Type: cover or agenda or section or content or closing
Title: …
Subtitle: … (optional)
then, on a content slide, one block (two at most) in exactly one of these forms:
[numbers]
- 53M :: passengers :: optional short explanation
[items]
- Item title :: item explanation
[steps]
1. Step name :: what happens in it
[timeline]
- Date :: event :: optional detail
[bullets]
- point
[paragraph]
The message text
[quote]
The quote :: name and title
[compare]
# First side title
- point
# Second side title
- point
[table]
First column | Second column | Third column
value | value | value
[chart]
Shape: column (or line or donut or bar)
Unit: %
Category | Series name
2024 | 49
Notes: what the presenter says in a line or two (optional)
• The agenda slide lists its items under [bullets].
• End the reply with this line: === End ===`;
  const base = en ? enP : ar;
  const srcLabel = mode === 'idea' ? (en ? 'The topic and the presenter\'s facts' : 'موضوع العرض وحقائق صاحبه') : mode === 'data' ? (en ? 'The data' : 'البيانات') : (en ? 'The source' : 'المادة');
  const tail = en ? 'Reminder: reply in the mandatory format only, starting with === Slide === and ending with === End ===.' : 'تذكير: رد بالصيغة الإلزامية فقط، تبدأ بـ === شريحة === وتنتهي بـ === نهاية ===.';
  const text = m.text;
  if (base.length + text.length <= ONE) return [`${base}\n\n${srcLabel}:\n<<<\n${text}\n>>>\n\n${tail}`];
  const chunks = chunk(text, PART), n = chunks.length;
  const parts = chunks.map((c, i) => en
    ? `Part ${i + 1} of ${n} of a source I am sending in parts. Do not analyse or summarise yet. Keep the text and reply only with: Received part ${i + 1}\n<<<\n${c}\n>>>`
    : `الجزء ${i + 1} من ${n} من مادة سأرسلها على أجزاء. لا تحلل ولا تلخص الآن. احفظ النص ورد فقط بـ: استلمت الجزء ${i + 1}\n<<<\n${c}\n>>>`);
  parts.push(`${base}\n\n${srcLabel}: ${en ? `all ${n} parts I sent above in this chat, in their order.` : `كل الأجزاء (من 1 إلى ${n}) التي أرسلتها أعلاه في هذه المحادثة، بترتيبها.`}\n\n${tail}`);
  return parts;
};

/* ======================================================================
   reading Copilot's reply → slide specs
   ====================================================================== */
const RE_SL = /^[\s#>*=\-–—_]*(?:ال)?(?:شريحة|شريحه|slide)\s*(?:رقم\s*|no\.?\s*|#\s*)?[\d٠-٩]*\s*[\s#*=\-–—_:：]*$/i;
const RE_SL_T = /^[\s#>*=\-–—_]*(?:ال)?(?:شريحة|شريحه|slide)\s*[\d٠-٩]*\s*[:：\-–—]\s*(.+?)[\s#*=_]*$/i;
const RE_END = /^[\s#>*=\-–—_]*(?:ال)?(?:نهاية|نهايه|end)[\s#*=\-–—_.]*$/i;
const RE_TYPE = /^(?:النوع|نوع الشريحة|type|kind)\s*[:：]\s*(.+)$/i;
const RE_TITLE = /^(?:العنوان|عنوان الشريحة|title)\s*[:：]\s*(.*)$/i;
const RE_SUB = /^(?:العنوان الفرعي|عنوان فرعي|subtitle|sub-title)\s*[:：]\s*(.*)$/i;
const RE_NOTES = /^(?:ملاحظات|ملاحظة|ملاحظات المتحدث|notes?|speaker notes?)\s*[:：]\s*(.*)$/i;
const RE_BLOCK = /^\[\s*([^\]]{2,40})\s*\]\s*(.*)$/;
const RE_PLACE = /\[\s*(?:رقم|اسم|تاريخ|number|name|date)[^\]]{0,24}\]/i;
function slideKind(t) {
  const n = nrm(t);
  if (/غلاف|cover|title slide/.test(n)) return 'cover';
  if (/محاور|جدول الاعمال|اجند|agenda|outline|contents/.test(n)) return 'agenda';
  if (/فاصل|قسم|divider|section/.test(n)) return 'divider';
  if (/ختام|شكر|closing|thank|end/.test(n)) return 'closing';
  return 'content';
}
const BLOCKS = [[/رسم|chart|graph/, 'chart'], [/جدول|table/, 'table'], [/مقارن|compar|versus|vs/, 'compare'], [/خط زمني|زمني|timeline|roadmap/, 'timeline'], [/مراحل|خطوات|steps|stages|process/, 'steps'], [/ارقام|مؤشرات|numbers|kpis?|metrics|figures/, 'kpis'], [/اقتباس|quote/, 'quote'], [/فقره|رساله|نص|paragraph|statement|message|text/, 'para'], [/نقاط|bullets|points|list/, 'bullets'], [/بنود|بطاقات|محاور|items|cards|pillars/, 'items']];
const blockKind = name => { const n = nrm(name); for (const [re, k] of BLOCKS) if (re.test(n)) return k; return null; };
const CANON = { items: 'بنود', kpis: 'أرقام', steps: 'مراحل', timeline: 'خط زمني', bullets: 'نقاط', para: 'فقرة', quote: 'اقتباس', compare: 'مقارنة', table: 'جدول' };
const CHART_KIND = [[/دائر|حلق|دونات|pie|donut|doughnut/, 'donut'], [/خط|منحن|line/, 'line'], [/مساح|area/, 'area'], [/شريط|افقي|bar\b|horizontal/, 'hbar'], [/اعمد|عمود|column|col\b|vertical/, 'col']];
const cleanLine = l => l.replace(/‏|‎|‫|‬/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/`+/g, '').replace(/^\s*>\s?/, '').replace(/\s+$/, '');
const isNum = t => !!PM.numInfo(String(t || '').trim());
/* «label — text» written with a dash or a colon instead of «::» */
function fixSep(body, kind) {
  if (/::/.test(body)) return body;
  if (kind === 'kpis') {
    // «38 دقيقة: زمن الانتظار» or «المستهدف: 20 دقيقة» — the numeric side is the value
    const sp = body.match(/^(.+?)\s*(?:\s[—–]\s|:\s|：\s?|\s-\s)\s*(.+)$/);
    if (sp && isNum(sp[1])) return sp[1].trim() + ' :: ' + sp[2].trim();
    if (sp && isNum(sp[2])) return sp[2].trim() + ' :: ' + sp[1].trim();
    const m = body.match(/^([+\-~≈<>]?\s*[\d٠-٩][\d٠-٩.,٫٬]*\s*(?:%|٪|[KMBkx]|مليون|مليار|ألف|الف|million|billion|thousand)?\s*\+?)\s+(.+)$/);
    if (m && isNum(m[1])) {
      // keep a unit word with the number: «38 دقيقة زمن الانتظار»
      const w = m[2].trim().split(/\s+/);
      if (w.length > 1 && isNum(m[1].trim() + ' ' + w[0])) return m[1].trim() + ' ' + w[0] + ' :: ' + w.slice(1).join(' ');
      return m[1].trim() + ' :: ' + m[2].trim();
    }
    return sp ? sp[1].trim() + ' :: ' + sp[2].trim() : body;
  }
  const m = body.match(/^(.{2,60}?)\s*(?:\s[—–]\s|:\s|：\s?|\s-\s)\s*(.+)$/);
  if (m && wc(m[1]) <= (kind === 'timeline' ? 6 : 8)) return m[1].trim() + ' :: ' + m[2].trim();
  return body;
}
function chartBlock(lines, head) {
  let kind = 'col', unit = '', asked = false; const rows = [];
  for (const raw of lines) {
    const l = raw.trim(); let m;
    if ((m = l.match(/^(?:الشكل|شكل الرسم|نوع الرسم|shape|chart type)\s*[:：]\s*(.+)$/i))) { const n = nrm(m[1]); for (const [re, k] of CHART_KIND) if (re.test(n)) { kind = k; asked = true; break; } continue; }
    if ((m = l.match(/^(?:الوحدة|الوحده|unit)\s*[:：]\s*(.*)$/i))) { unit = m[1].trim().replace(/^(?:لا يوجد|بدون|none|n\/a|-)$/i, ''); continue; }
    if (/^[\s|:\-]+$/.test(l)) continue;
    const cells = l.replace(/^\s*[-•]\s+/, '').replace(/^\|/, '').replace(/\|$/, '').split(/\s*\|\s*/).map(x => x.trim());
    if (cells.length >= 2) rows.push(cells);
  }
  if (!rows.length) return null;
  const numv = c => { const i = PM.numInfo(c); return i ? i : null; };
  let names = [];
  if (!rows[0].slice(1).some(numv)) names = rows.shift().slice(1);
  if (rows.length < 2) return rows.length ? { k: 'kpis', head, items: rows.map(r => ({ value: r[1] || '', label: r[0] || '' })) } : null;
  const ns = Math.min(4, Math.max(...rows.map(r => r.length - 1)));
  const first = numv(rows[0][1]);
  if (!unit && first) unit = first.pct ? '%' : (first.suf || '').trim();
  if (unit.length > 12) unit = '';
  return { k: 'chart', head, asked, chart: { kind, cats: rows.map(r => r[0]), series: Array.from({ length: ns }, (_, si) => ({ name: names[si] || '', vals: rows.map(r => { const i = numv(r[si + 1]); return i ? i.v : (parseFloat(PM.digits(r[si + 1] || '0').replace(/,/g, '')) || 0); }) })), unit } };
}
function tableBlock(lines, head) {
  const rows = lines.map(l => l.trim()).filter(l => l && !/^[\s|:\-]+$/.test(l)).map(l => l.replace(/^\|/, '').replace(/\|$/, '').split(/\s*\|\s*/).map(x => x.trim())).filter(r => r.length >= 2);
  if (rows.length < 2) return null;
  const n = Math.max(...rows.map(r => r.length));
  return { k: 'table', head, rows: rows.map(r => Array.from({ length: n }, (_, i) => r[i] || '')) };
}
/* the lines of one slide → blocks */
function bodyBlocks(lines) {
  const groups = []; let cur = null;
  for (const raw of lines) {
    const m = raw.trim().match(RE_BLOCK);
    const k = m && blockKind(m[1]);
    if (k) { cur = { k, head: m[2].trim(), lines: [] }; groups.push(cur); continue; }
    if (!cur) {
      // content before any [block] line: guess from the shape of the lines
      const t = raw.trim();
      cur = { k: /^\|.*\|$/.test(t) ? 'table' : /^([-•*]|\d+[.)])\s/.test(t) ? 'bullets' : 'para', head: '', lines: [], guessed: true }; groups.push(cur);
    }
    cur.lines.push(raw);
  }
  const out = [];
  for (const g of groups) {
    const ls = g.lines.filter(l => l.trim());
    if (!ls.length) continue;
    if (g.k === 'chart') { const b = chartBlock(ls, g.head); if (b) out.push(b); continue; }
    if (g.k === 'table') { const b = tableBlock(ls, g.head); if (b) out.push(b); else out.push(...bodyBlocks(ls.map(l => l.replace(/\|/g, ' ')))); continue; }
    // a guessed bullet list whose lines all carry «::» is really a set of items
    let k = g.k;
    if (g.guessed && k === 'bullets' && ls.every(l => /::/.test(l))) k = 'items';
    if (g.guessed && k === 'bullets' && ls.length >= 2) {
      const bodies = ls.map(l => l.trim().replace(/^([-•*▪●◦–]|\d+[.)]|[٠-٩]+[.)])\s*/, ''));
      if (ls.every(l => /^\s*(\d+|[٠-٩]+)[.)]\s/.test(l)) && bodies.every(b => wc(b) <= 14)) k = 'steps';
      else if (bodies.every(b => /::/.test(fixSep(b, 'kpis')) && isNum(fixSep(b, 'kpis').split('::')[0]))) k = 'kpis';
    }
    const norm = ls.map(raw => {
      const nested = /^\s{2,}[-*•]/.test(raw);
      let l = raw.trim();
      if (k === 'compare' && /^#+\s*/.test(l)) return '# ' + l.replace(/^#+\s*/, '');
      if (k === 'compare' && /[:：]$/.test(l) && !/^[-•*]/.test(l) && wc(l) <= 8) return '# ' + l.replace(/[:：]$/, '');
      if (k === 'para' || k === 'quote') return l.replace(/^[-•*]\s+/, '');
      const body = l.replace(/^([-•*▪●◦–]|\d+[.)]|[٠-٩]+[.)])\s*/, '');
      if (nested && k === 'items') return '  * ' + body;
      if (k === 'steps') return '1. ' + fixSep(body, k);
      if (['items', 'kpis', 'timeline'].includes(k)) return '- ' + fixSep(body, k);
      return '- ' + body;
    });
    const spec = PM.textToSpec('[' + CANON[k] + ']' + (g.head ? ' ' + g.head : '') + '\n' + norm.join('\n'), { blocks: [] });
    (spec.blocks || []).forEach(b => {
      if (b.items) b.items = b.items.filter(it => typeof it === 'string' ? it.trim() : (it.title || it.text || it.value || it.label || it.date));
      if (b.k === 'kpis') b.items.forEach(it => { if (!it.label && it.text) { it.label = it.text; it.text = ''; } });
      if (b.k === 'steps' || b.k === 'items') b.items.forEach(it => { if (!it.text) delete it.text; });
      if (b.items && !b.items.length) return;
      out.push(b);
    });
  }
  return out;
}
D.parseScript = function (reply, lang) {
  const en = lang === 'en';
  const lines = String(reply || '').replace(/\r/g, '').split('\n').map(cleanLine).filter(l => !/^\s*```/.test(l));
  const slides = []; let cur = null, ended = false, inNotes = false;
  const open = (title) => { cur = { kind: null, title: title || '', sub: '', body: [], notes: [] }; slides.push(cur); inNotes = false; };
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) { if (cur && !inNotes) cur.body.push(''); continue; }
    if (/^[-–—_=*]{3,}$/.test(l)) continue;
    if (RE_END.test(l)) { ended = true; continue; }
    let m;
    if (RE_SL.test(l)) { open(); continue; }
    if ((m = l.match(RE_SL_T)) && !/::/.test(l) && wc(m[1]) <= 14) { open(m[1].replace(/^(?:العنوان|title)\s*[:：]\s*/i, '')); continue; }
    if ((m = l.match(RE_TYPE))) { if (!cur || cur.kind || cur.body.some(x => x.trim())) open(); cur.kind = slideKind(m[1]); continue; }
    if ((m = l.match(RE_SUB))) { if (!cur) open(); cur.sub = m[1].trim(); continue; }
    if ((m = l.match(RE_TITLE))) { if (!cur || cur.title || cur.body.some(x => x.trim())) open(); cur.title = m[1].trim(); continue; }
    if ((m = l.match(RE_NOTES))) { if (!cur) open(); inNotes = true; if (m[1].trim()) cur.notes.push(m[1].trim()); continue; }
    if (!cur) { if (/^#{1,6}\s+\S/.test(l)) { open(l.replace(/^#+\s*/, '')); continue; } continue; }   // a preamble before the first slide is dropped
    if (inNotes && !RE_BLOCK.test(l)) { cur.notes.push(l); continue; }
    inNotes = false;
    cur.body.push(raw);
  }
  const specs = [];
  slides.forEach((s, i) => {
    let blocks = bodyBlocks(s.body);
    let kind = s.kind;
    const bare = s.body.map(x => x.trim()).filter(Boolean);
    if (!s.title && !blocks.length) return;
    if (!kind) kind = i === 0 && !blocks.length ? 'cover' : i === slides.length - 1 && !blocks.length ? 'closing' : !blocks.length ? 'divider' : 'content';
    const notes = s.notes.join('\n').trim();
    if (kind === 'cover') { specs.push({ kind, title: s.title, sub: s.sub || (blocks[0] && blocks[0].k === 'para' && wc(blocks[0].text) <= 16 ? blocks[0].text : ''), blocks: [], imgs: [], notes }); return; }
    if (kind === 'closing') { specs.push({ kind, title: s.title || (en ? 'Thank you' : 'شكراً لكم'), sub: s.sub || '', blocks: [], imgs: [], notes }); return; }
    if (kind === 'divider') { if (blocks.length) kind = 'content'; else { specs.push({ kind, title: s.title, sub: s.sub || '', blocks: [], imgs: [], notes }); return; } }
    if (kind === 'agenda') {
      const items = [];
      blocks.forEach(b => (b.items || []).forEach(it => items.push({ title: typeof it === 'string' ? it : (it.title || it.label || it.text || '') })));
      if (!items.length) bare.filter(x => !RE_BLOCK.test(x)).forEach(x => items.push({ title: x.replace(/^([-•*]|\d+[.)])\s*/, '') }));
      if (items.length >= 2) specs.push({ kind, title: s.title || (en ? 'Agenda' : 'المحاور'), items: items.filter(x => x.title).slice(0, 9), notes });
      return;
    }
    specs.push({ kind: 'content', title: s.title, sub: s.sub || '', eyebrow: '', blocks, imgs: [], notes });
  });
  return { specs, ended, slides: specs.length };
};

/* ======================================================================
   specs → a finished deck
   ====================================================================== */
const tok = t => new Set(nrm(PM.cleanText(t)).split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 3));
function tidySpecs(specs, o) {
  const en = o.lang === 'en';
  let out = specs.slice();
  // one cover first, one closing last
  const covers = out.filter(s => s.kind === 'cover');
  out = out.filter((s, i) => s.kind !== 'cover' || s === covers[0]);
  if (!covers.length) out.unshift({ kind: 'cover', title: o.name || (en ? 'Presentation' : 'عرض تقديمي'), sub: '', blocks: [], imgs: [] });
  else { out = out.filter(s => s !== covers[0]); out.unshift(covers[0]); }
  const clos = out.filter(s => s.kind === 'closing');
  out = out.filter(s => s.kind !== 'closing');
  out.push(clos[clos.length - 1] || { kind: 'closing', title: en ? 'Thank you' : 'شكراً لكم', sub: '', blocks: [], imgs: [] });
  // too much for one slide → two, never cutting an item in half
  const res = []; let split = 0;
  for (const s of out) {
    if (s.kind !== 'content' || !(s.blocks || []).length) { res.push(s); continue; }
    const parts = PM.splitDense(s.blocks);
    if (parts.length <= 1) { res.push(s); continue; }
    split += parts.length - 1;
    parts.forEach((p, i) => res.push(Object.assign({}, s, { blocks: p, notes: i ? '' : s.notes, sub: i ? '' : s.sub, imgs: i ? [] : s.imgs })));
  }
  // empty section slides in a row
  const fin = res.filter((s, i) => !(s.kind === 'divider' && res[i + 1] && ['divider', 'closing'].includes(res[i + 1].kind)));
  return { specs: fin, split };
}
/* every picture of the source file comes along: to the new slide that talks about the same thing,
   otherwise to the slide at the same point of the story (extra pictures get a photo slide of their own at build time) */
function reattach(specs, src) {
  if (!src || !src.length) return 0;
  const targets = specs.filter(s => s.kind === 'content').map(s => ({ s, t: tok(PM.specText(s)) }));
  if (!targets.length) return 0;
  const placed = new Set(); let n = 0;
  const body = src.filter(o => o.kind !== 'cover' && o.kind !== 'closing');
  body.forEach((o, k) => {
    const imgs = (o.imgs || []).filter(id => !placed.has(id));
    if (!imgs.length) return;
    const t = tok(PM.specText(o));
    let best = null, bs = 0;
    if (t.size >= 2) for (const x of targets) { let hit = 0; t.forEach(w => { if (x.t.has(w)) hit++; }); const sc = hit / Math.sqrt(t.size * Math.max(1, x.t.size)); if (sc > bs) { bs = sc; best = x; } }
    if (!best || bs < 0.22) best = targets[Math.min(targets.length - 1, Math.round(k / Math.max(1, body.length - 1) * (targets.length - 1)))];
    best.s.imgs = (best.s.imgs || []).concat(imgs);
    imgs.forEach(id => placed.add(id)); n += imgs.length;
  });
  return n;
}
D.buildDeck = function (specs, o) {
  const d = PM.newDeck({ lang: o.lang, grey: !!o.grey, dark: !!o.dark, name: o.name || '' });
  for (const [id, a] of Object.entries(o.assets || {})) {
    if (!a) continue;
    if (a.bytes && (!a.kind || a.kind === 'image')) d.assets[id] = { kind: 'image', bytes: a.bytes, ext: a.ext === 'jpg' ? 'jpeg' : a.ext, size: a.size || PM.imgSizeOf(a.bytes), fromFile: true };
    else if (!d.assets[id]) d.assets[id] = a;
  }
  const CH = { col: 'ch-col', line: 'ch-line', donut: 'ch-donut', pie: 'ch-donut', hbar: 'ch-bar', area: 'ch-area' };
  specs.forEach((sp, i) => {
    const blocks = sp.blocks || [];
    const want = blocks.length === 1 && blocks[0].k === 'chart' && blocks[0].asked ? CH[blocks[0].chart.kind] : null;
    blocks.forEach(b => { delete b.asked; });
    const s = PM.addSlide(d, sp);
    // the chart shape that was asked for is the one drawn
    if (want) { const L = PM.layoutById(want); try { if (L && L.accepts(PM.shape(s.spec), PM.slideCtx(d, i)) > 0) s.layout = want; } catch (e) { } }
  });
  if (!d.name) d.name = plain(specs[0] && specs[0].title || '');
  d.goal = S.goal.trim(); d.audience = S.audience;
  return d;
};
/* what the presenter should look at before presenting */
D.audit = function (d, o) {
  const src = o.nums, issues = [];
  d.slides.forEach((s, i) => {
    if (s.hidden) return;
    const sp = s.spec;
    // chart values are numbers, not text: they are checked too
    const txt = PM.specText(sp) + ' ' + (sp.blocks || []).filter(b => b.k === 'chart' && b.chart).map(b => b.chart.series.map(x => x.vals.join(' ')).join(' ')).join(' ');
    if (RE_PLACE.test(txt)) issues.push({ lv: 'bad', i, t: 'ناقص معلومة', d: 'فيها خانة بين قوسين [ ] تنتظر رقمك أو اسمك الصحيح' });
    if (sp.kind !== 'content') return;
    if (wc(plain(sp.title)) > 13) issues.push({ lv: 'warn', i, t: 'عنوان طويل', d: 'العنوان الأقوى أقل من 10 كلمات' });
    if (!sp.title) issues.push({ lv: 'warn', i, t: 'شريحة بدون عنوان', d: '' });
    if (src) {
      const mine = [...numsOf(txt.replace(RE_PLACE, ''))].filter(x => (+x >= 10 || x.includes('.')) && !src.has(x));
      if (mine.length) issues.push({ lv: o.mode === 'idea' ? 'info' : 'warn', i, t: o.mode === 'idea' ? 'أرقام كتبها كوبايلوت' : o.mode === 'data' ? 'أرقام محسوبة أو غير موجودة في بياناتك' : 'أرقام غير موجودة في مادتك', d: mine.slice(0, 6).join(' · ') + ' — راجعها قبل العرض' });
    }
  });
  return issues;
};
function finish(specs, o) {
  const tidy = tidySpecs(specs, o);
  const pics = reattach(tidy.specs, o.srcSpecs);
  const hadDeck = !!ST.deck;
  const d = D.buildDeck(tidy.specs, o);
  PM.UI.closeModal();
  PM.UI.progress('أوزّع التصاميم بهوية مطارات جدة…', `${d.slides.length} شريحة`);
  setTimeout(() => {
    try {
      PM.UI.openDeck(d);
      if (o.plan && d.goal) { const steps = PM.Brain.planStory(d.goal, d.audience); if (steps.some(x => x.type !== 'keep')) PM.Brain.applyPlan(steps); }
      PM.UI.progress(false);
      D.report({ d, issues: D.audit(d, o), split: tidy.split, pics, ended: o.ended, via: o.via, hadDeck, mode: o.mode });
    } catch (e) { console.error(e); PM.UI.progress(false); PM.UI.toast('صار خطأ أثناء بناء العرض: ' + (e.message || ''), 5000); }
  }, 40);
}

/* ======================================================================
   «بدون إنترنت» — the tool structures the material itself
   ====================================================================== */
/* free text → the block list the Word reader produces */
function textToBlocks(text) {
  const raw = String(text || '').replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, ''));
  const blocks = []; let i = 0;
  const isLi = l => /^\s*([-•*▪●◦–]|\d+[.)]|[٠-٩]+[.)])\s+\S/.test(l);
  const short = l => wc(l) <= 9 && !/[.،؛!؟?]$/.test(l.trim());
  const nextReal = k => { for (let j = k + 1; j < raw.length; j++) if (raw[j].trim()) return raw[j]; return ''; };
  while (i < raw.length) {
    const l = raw[i], t = l.trim();
    if (!t) { i++; continue; }
    if (/\t/.test(l) || /^\|.+\|$/.test(t)) {
      const ls = []; while (i < raw.length && raw[i].trim() && (/\t/.test(raw[i]) || /^\|.+\|$/.test(raw[i].trim()))) ls.push(raw[i++]);
      const tb = parseTables(ls.join('\n'))[0];
      if (tb) blocks.push({ k: 'table', rows: tb.rows }); else ls.forEach(x => blocks.push({ k: 'p', t: x.replace(/\t+/g, ' ').trim() }));
      continue;
    }
    let m;
    if ((m = t.match(/^(#{1,6})\s+(.+)$/))) { blocks.push({ k: 'h', lvl: Math.min(3, m[1].length), t: m[2].replace(/[:：]$/, '') }); i++; continue; }
    if (isLi(l)) { blocks.push({ k: 'li', t: t.replace(/^([-•*▪●◦–]|\d+[.)]|[٠-٩]+[.)])\s+/, ''), lvl: /^\s{2,}/.test(l) ? 1 : 0, num: true }); i++; continue; }
    const nx = nextReal(i);
    if (short(t) && nx && (/[:：]$/.test(t) || isLi(nx) || wc(nx) > wc(t) + 3 || !raw[i + 1] || !raw[i + 1].trim())) { blocks.push({ k: 'h', lvl: 2, t: t.replace(/[:：]$/, '') }); i++; continue; }
    blocks.push({ k: 'p', t }); i++;
  }
  // the first short line is the deck title
  const f = blocks[0];
  if (f && (f.k === 'h' || (f.k === 'p' && wc(f.t) <= 12))) { f.k = 'h'; f.lvl = 0; }
  // «a، b، c» written as one sentence → a list (commas inside brackets do not count)
  const listOf = t => {
    const parts = []; let cur = '', depth = 0;
    for (const ch of t.replace(/[.؟!]+\s*$/, '')) { if (/[(\[«]/.test(ch)) depth++; else if (/[)\]»]/.test(ch)) depth = Math.max(0, depth - 1); if (/[،,؛;]/.test(ch) && !depth) { parts.push(cur); cur = ''; } else cur += ch; }
    parts.push(cur);
    const ps = parts.map(x => x.trim().replace(/^و(?=\S{3,})/, '').replace(/^and\s+/i, '')).filter(Boolean);
    return ps.length >= 3 && ps.length <= 8 && ps.every(x => wc(x) >= 2 && wc(x) <= 14) && !/[.؟!]\s/.test(t.replace(/[.؟!]+\s*$/, '')) ? ps : null;
  };
  // every long paragraph is a slide: «label: text» gives its title, otherwise its opening sentence does
  const out = []; let afterHead = false;
  for (const b of blocks) {
    if (b.k !== 'p') { out.push(b); afterHead = b.k === 'h' && b.lvl > 0; continue; }
    const lm = b.t.match(/^([^:：.،؟!]{2,44})[:：]\s+(.{12,})$/s);
    if (lm && wc(lm[1]) <= 6) {
      out.push({ k: 'h', lvl: 2, t: lm[1].trim() });
      const li = listOf(lm[2]);
      if (li) li.forEach(x => out.push({ k: 'li', t: x, lvl: 0, num: true })); else out.push({ k: 'p', t: lm[2].trim() });
      afterHead = false; continue;
    }
    if (afterHead || wc(b.t) < 16) { out.push(b); afterHead = false; continue; }
    const sents = b.t.split(/(?<=[.!؟?])\s+/);
    let title = sents[0].replace(/[.!؟?،]+$/, '');
    const own = wc(title) <= 11 && sents.length > 1;
    if (!own) title = title.split(/[،,]/)[0].split(/\s+/).slice(0, 8).join(' ') + (wc(title) > 8 ? '…' : '');
    out.push({ k: 'h', lvl: 2, t: title });
    out.push({ k: 'p', t: own ? sents.slice(1).join(' ') : b.t });
  }
  return out;
}
D.localText = function (text, lang) {
  const res = PM.analyzeDocx({ blocks: textToBlocks(text), lang, assets: {} }, {});
  return res.specs;
};
/* the story of the brief as slides waiting for the presenter's own words */
D.localIdea = function (m, lang) {
  const en = lang === 'en';
  const T = TYPES.find(t => t.id === S.type) || TYPES[0];
  const specs = [{ kind: 'cover', title: m.idea || (en ? 'Presentation title' : 'عنوان العرض'), sub: '', blocks: [], imgs: [] }];
  const hint = en ? 'Write here' : 'اكتب هنا';
  const mk = (title, form) => {
    const it = n => Array.from({ length: n }, (_, i) => ({ title: `${en ? 'Point' : 'النقطة'} ${i + 1}`, text: en ? 'One line that explains it.' : 'سطر واحد يشرحها.' }));
    const b = form === 'para' ? { k: 'para', text: `${hint}: ${title}` }
      : form === 'kpis' ? { k: 'kpis', items: [1, 2, 3].map(() => ({ value: en ? '[number needed]' : '[رقم مطلوب]', label: en ? 'What it measures' : 'ايش يقيس' })) }
        : form === 'steps' ? { k: 'steps', items: it(3) }
          : form === 'timeline' ? { k: 'timeline', items: [1, 2, 3].map(i => ({ date: en ? '[date needed]' : '[تاريخ مطلوب]', title: `${en ? 'Milestone' : 'المحطة'} ${i}`, text: '' })) }
            : form === 'compare' ? { k: 'compare', a: { title: en ? 'Risk' : 'الخطر', items: [en ? 'First risk' : 'الخطر الأول', en ? 'Second risk' : 'الخطر الثاني'] }, b: { title: en ? 'How we handle it' : 'كيف نعالجه', items: [en ? 'First answer' : 'المعالجة الأولى', en ? 'Second answer' : 'المعالجة الثانية'] } }
              : { k: 'items', items: it(3) };
    return { kind: 'content', title, sub: '', eyebrow: '', blocks: [b], imgs: [] };
  };
  (en ? T.skelEn : T.skel).forEach(([title, form], i) => {
    const s = mk(title, form);
    if (i === 0 && S.goal.trim()) s.blocks = [{ k: 'para', text: S.goal.trim() }];
    specs.push(s);
  });
  // the facts the presenter already wrote become real slides
  if (m.facts) { const fl = m.facts.split('\n').map(x => x.trim().replace(/^([-•*]|\d+[.)])\s*/, '')).filter(Boolean); PM.splitDense([{ k: 'bullets', items: fl }]).forEach(part => specs.push({ kind: 'content', title: en ? 'The facts we have' : 'الحقائق اللي عندنا', sub: '', eyebrow: '', blocks: part, imgs: [] })); }
  specs.push({ kind: 'closing', title: en ? 'Thank you' : 'شكراً لكم', sub: '', blocks: [], imgs: [] });
  return specs;
};
/* tables → findings the tool can calculate itself, a chart and the table */
const RE_PERIOD = /^(?:(?:19|20)\d\d|Q[1-4]|H[12]|(?:19|20)\d\d\s*[\/\-]\s*\d{1,2}|14\d\d|الربع|يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
D.localData = function (tables, lang, extraNums) {
  const en = lang === 'en';
  const specs = [];
  const fmt = (v, info) => PM.fmtNum(Math.round(v * 100) / 100, Object.assign({}, info, { dec: v % 1 ? Math.min(2, Math.max(1, info.dec || 1)) : 0 }));
  const pct = v => (v > 0 ? '+' : '') + (Math.round(v * 10) / 10) + '%';
  const keepNum = t => { numsOf(t).forEach(x => extraNums.add(x)); return t; };
  tables.forEach((tb, ti) => {
    const rows = tb.rows, head = rows[0], body = rows.slice(1);
    const hasHead = !head.slice(1).some(c => isNum(c));
    const data = hasHead ? body : rows;
    const cols = head.length;
    const info = Array.from({ length: cols }, (_, c) => data.map(r => PM.numInfo(r[c])));
    const periodCol = c => data.filter(r => RE_PERIOD.test(PM.digits(r[c]).trim())).length >= Math.max(2, data.length - 1);
    let lab = Array.from({ length: cols }, (_, c) => c).find(c => periodCol(c));
    const numCols = info.map((ps, c) => c !== lab && ps.filter(Boolean).length >= Math.max(1, data.length - 1) ? c : -1).filter(c => c >= 0);
    if (lab == null) lab = Array.from({ length: cols }, (_, c) => c).find(c => !numCols.includes(c));
    const title = tb.title || (hasHead && numCols.length && numCols.length <= 2 && numCols.map(c => head[c]).filter(Boolean).join(en ? ' and ' : ' و')) || (hasHead && lab != null && head[lab]) || (en ? `Data ${ti + 1}` : `البيانات ${ti + 1}`);
    if (lab == null || !numCols.length || data.length < 2) { specs.push({ kind: 'content', title, blocks: [{ k: 'table', rows }], imgs: [] }); return; }
    const periods = periodCol(lab);
    const findings = [];
    numCols.slice(0, 3).forEach(c => {
      const name = hasHead ? head[c] : '';
      const vals = data.map((r, i) => ({ l: r[lab], inf: info[c][i] })).filter(x => x.inf);
      if (vals.length < 2) return;
      const i0 = vals[0].inf, isPct = i0.pct;
      const max = vals.reduce((a, b) => b.inf.v > a.inf.v ? b : a), min = vals.reduce((a, b) => b.inf.v < a.inf.v ? b : a);
      const first = vals[0], last = vals[vals.length - 1];
      const nm = name ? name + ': ' : '';
      const raw = x => plain(x.inf.raw).trim();
      if (periods) {
        if (first.inf.v) {
          const diff = last.inf.v - first.inf.v, ch = diff / Math.abs(first.inf.v) * 100;
          const val = isPct ? keepNum((diff > 0 ? '+' : '') + (Math.round(diff * 10) / 10) + (en ? ' pts' : ' نقطة')) : keepNum(pct(ch));
          findings.push({ value: val, label: nm + (en ? `change from ${first.l} to ${last.l}` : `التغير من ${first.l} إلى ${last.l}`), strong: 4 + Math.min(4, Math.abs(ch) / 10),
            headline: en ? `${nm}${diff > 0 ? 'up' : 'down'} ${val.replace(/^[+-]/, '')} from ${first.l} to ${last.l}` : `${nm}${diff > 0 ? 'ارتفاع' : 'انخفاض'} ${val.replace(/^[+-]/, '')} بين ${first.l} و${last.l}` });
        }
        findings.push({ value: raw(last), label: nm + (en ? `latest (${last.l})` : `آخر قراءة (${last.l})`), strong: 5 });
        if (max !== last && max !== first) findings.push({ value: raw(max), label: nm + (en ? `peak in ${max.l}` : `الذروة في ${max.l}`), strong: 4 });
      } else {
        findings.push({ value: raw(max), label: nm + (en ? `highest: ${max.l}` : `الأعلى: ${max.l}`), strong: 6, headline: en ? `${max.l} leads${name ? ' on ' + name : ''} with ${raw(max)}` : `${max.l} الأعلى${name ? ' في ' + name : ''} بـ ${raw(max)}` });
        findings.push({ value: raw(min), label: nm + (en ? `lowest: ${min.l}` : `الأدنى: ${min.l}`), strong: 3 });
        if (!isPct && !i0.unitWord) {
          const sum = vals.reduce((a, b) => a + b.inf.v, 0);
          findings.push({ value: keepNum(fmt(sum, i0)), label: nm + (en ? 'total' : 'الإجمالي'), strong: 5 });
          if (sum) findings.push({ value: keepNum((Math.round(max.inf.v / sum * 1000) / 10) + '%'), label: nm + (en ? `share of ${max.l}` : `حصة ${max.l} من الإجمالي`), strong: 4 });
        }
      }
    });
    const top = findings.slice().sort((a, b) => b.strong - a.strong).slice(0, 4);
    const calc = top.some(f => /change|total|share|التغير|الإجمالي|حصة/.test(f.label));
    if (top.length >= 2) {
      const lead = top.find(f => f.headline) || top[0];
      specs.push({ kind: 'content', title: lead.headline || (lead.label + ': ' + lead.value), sub: '', blocks: [{ k: 'kpis', items: top.map(f => ({ value: f.value, label: f.label })) }], imgs: [], notes: calc ? (en ? 'Change, total and share figures were calculated by the tool from your table.' : 'أرقام التغير والإجمالي والحصة حسبتها الأداة من جدولك.') : '' });
    }
    // one chart for series that share a scale, a chart each when they do not
    const scale = c => Math.max(...info[c].filter(Boolean).map(x => Math.abs(x.v)), 0);
    const apart = numCols.length > 1 && Math.max(...numCols.map(scale)) / Math.max(1e-9, Math.min(...numCols.map(scale))) > 8;
    const sets = apart ? numCols.slice(0, 2).map(c => [c]) : [numCols.slice(0, 4)];
    let charts = 0;
    sets.forEach(set => {
      const ok = data.map((r, i) => i).filter(i => set.every(c => info[c][i]));
      if (ok.length < 2 || ok.length > 12) return;
      const i0 = info[set[0]][ok[0]];
      const sum = ok.reduce((a, i) => a + info[set[0]][i].v, 0);
      const kind = periods ? (ok.length >= 5 ? 'line' : 'col') : set.length === 1 && i0.pct && ok.length <= 6 && Math.abs(sum - 100) < 3 ? 'donut' : ok.some(i => String(data[i][lab]).length > 16) ? 'hbar' : 'col';
      const unit = i0.pct ? '%' : (i0.suf || '').trim().length <= 3 ? (i0.suf || '').trim() : '';
      charts++;
      specs.push({ kind: 'content', title: apart && hasHead && head[set[0]] ? head[set[0]] : title, sub: '', blocks: [{ k: 'chart', asked: true, chart: { kind, cats: ok.map(i => data[i][lab]), series: set.map(c => ({ name: hasHead ? head[c] : '', vals: ok.map(i => info[c][i].v) })), unit } }], imgs: [] });
    });
    if (!charts || cols > 3 || data.length > 7) specs.push({ kind: 'content', title: charts ? (en ? `${title}: the detail` : `${title}: التفاصيل`) : title, blocks: [{ k: 'table', rows }], imgs: [] });
  });
  return specs;
};
D.buildLocal = async function () {
  const m = material(), lang = langOf(m), en = lang === 'en';
  const base = baseOpts(m, lang);
  let specs = [], nums = numsOf(m.text);
  if (S.mode === 'idea') specs = D.localIdea(m, lang);
  else if (S.mode === 'data') {
    if (!m.tables.length) { PM.UI.toast('ما قدرت أقرأ جدول. الصق الخلايا من Excel كما هي أو ارفع الملف.', 4200); return; }
    const body = D.localData(m.tables, lang, nums);
    specs = [{ kind: 'cover', title: S.goal.trim().split(/[.،\n]/)[0].slice(0, 70) || m.tables[0].title || (en ? 'Data review' : 'قراءة في الأرقام'), sub: '', blocks: [], imgs: [] }, ...body];
  } else if (S.mode === 'file') specs = m.specs.map(s => PM.clone(s));
  else specs = D.localText(m.text, lang);
  if (!specs.some(s => s.kind === 'content' || s.kind === 'agenda')) { PM.UI.toast('المادة قصيرة جداً. اكتب أكثر شوي.', 3500); return; }
  finish(specs, Object.assign(base, { nums: S.mode === 'idea' ? null : nums, via: 'local', plan: S.mode !== 'idea', srcSpecs: null }));
};
function baseOpts(m, lang) {
  const g = id => { const b = $(`#${id} button.on`); return b ? b.dataset.v : null; };
  const cur = ST.deck;
  return { lang, name: m.name || '', grey: cur ? cur.grey : g('stBg') === 'grey', dark: cur ? cur.dark : g('stTone') === 'dark', assets: m.assets || {}, srcSpecs: m.specs || null, mode: S.mode };
}
D.buildFromReply = function () {
  const m = material(), lang = langOf(m);
  const r = D.parseScript(S.reply, lang);
  if (!r.specs.filter(s => s.kind === 'content').length) { PM.UI.toast('ما لقيت شرائح في الرد. تأكد إنك لصقت رد Copilot كامل.', 4500); return; }
  finish(r.specs, Object.assign(baseOpts(m, lang), { nums: numsOf(m.text), ended: r.ended, via: 'copilot' }));
};

/* ======================================================================
   interface
   ====================================================================== */
const MODES = [
  { id: 'text', icon: 'file-text', t: 'نص خام', d: 'إيميل، محضر، ملاحظات' },
  { id: 'idea', icon: 'lightbulb', t: 'فكرة بسطر', d: 'كوبايلوت يكتب المحتوى' },
  { id: 'file', icon: 'presentation', t: 'ملف جاهز', d: 'Word أو PowerPoint' },
  { id: 'data', icon: 'table', t: 'أرقام وجداول', d: 'من Excel' }
];
const seg = (id, val, opts) => `<div class="seg dr-seg" data-k="${id}">${opts.map(([v, t]) => `<button data-v="${v}" class="${val === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
function ready() {
  if (S.mode === 'text') return wc(S.text) >= 12 ? '' : 'الصق المحتوى أولاً (سطرين على الأقل)';
  if (S.mode === 'idea') return S.idea.trim().length >= 6 ? '' : 'اكتب فكرة العرض أولاً';
  if (S.mode === 'file') return S.file ? '' : 'اختر ملف Word أو PowerPoint أولاً';
  if (S.mode === 'data') return parseTables(S.data).length ? '' : 'الصق جدول من Excel أو ارفع ملف الأرقام أولاً';
  return '';
}
function srcPane() {
  if (S.mode === 'text') return `<textarea class="inp dr-ta" id="drText" dir="auto" placeholder="الصق هنا أي محتوى: إيميل، محضر اجتماع، تقرير، نقاط مبعثرة…">${esc(S.text)}</textarea><div class="dr-meta" id="drMeta"></div>`;
  if (S.mode === 'idea') return `<input class="inp" id="drIdea" dir="auto" placeholder="مثل: خطة جاهزية الصالة 1 لموسم العمرة 1448" value="${esc(S.idea)}">
    <label class="dr-lab">حقائق عندك تبيها تدخل العرض <span>اختياري</span></label>
    <textarea class="inp dr-ta sm" id="drFacts" dir="auto" placeholder="أرقام، تواريخ، أسماء، قرارات… سطر لكل معلومة">${esc(S.facts)}</textarea>
    <div class="note">${ic('sparkles')} كوبايلوت يكتب المحتوى من الفكرة، وأي رقم ما يعرفه يتركه خانة <b>[رقم مطلوب]</b> تعبّيها أنت. بدون إنترنت الأداة تجهّز هيكل القصة وتترك النص لك.</div>`;
  if (S.mode === 'file') {
    const f = S.file;
    return `<label class="dr-drop" id="drDrop"><input type="file" id="drFile" accept=".pptx,.docx" hidden>${ic('upload')}<b>${f ? esc(f.name) : 'اختر ملف Word أو PowerPoint'}</b><span>${f ? `قرأت ${f.specs.length} شريحة · ${wc(specsToText(f.specs))} كلمة${Object.keys(f.assets || {}).length ? ` · ${Object.keys(f.assets).length} صورة` : ''}` : 'أو اسحبه هنا'}</span></label>
      ${ST.deck && ST.deck.slides.length > 2 ? `<button class="btn sec dr-open" id="drUseOpen">${ic('presentation')}استخدم العرض المفتوح الآن</button>` : ''}
      <div class="note">${ic('route')} المخرج يعيد بناء قصة الملف من جديد: يرتّب، يختصر، ويختار شكل كل شريحة. صور الملف ترجع للشرائح اللي تتكلم عن نفس الموضوع.</div>`;
  }
  return `<textarea class="inp dr-ta mono" id="drData" dir="ltr" placeholder="حدد الخلايا في Excel، انسخها، والصقها هنا">${esc(S.data)}</textarea>
    <div class="dr-row"><label class="btn sec">${ic('file-spreadsheet')}ارفع ملف Excel أو CSV<input type="file" id="drXls" accept=".xlsx,.xlsm,.csv,.tsv" hidden></label><span class="dr-meta" id="drMeta"></span></div>
    <div class="dr-prev" id="drPrev"></div>`;
}
function meta() {
  const el = $('#drMeta'); if (!el) return;
  if (S.mode === 'text') { const n = wc(S.text); el.textContent = n ? `${n} كلمة` : ''; }
  if (S.mode === 'data') {
    const tb = parseTables(S.data);
    el.textContent = tb.length ? `قرأت ${tb.length > 1 ? tb.length + ' جداول' : 'جدول'} · ${tb.reduce((a, t) => a + t.rows.length, 0)} صف` : (S.data.trim() ? 'ما قدرت أقرأ جدول من النص' : '');
    const pv = $('#drPrev'); if (pv) pv.innerHTML = tb.slice(0, 1).map(t => `<table dir="${PM.isAr(t.rows[0].join(' ')) ? 'rtl' : 'ltr'}">${t.rows.slice(0, 6).map((r, i) => `<tr>${r.slice(0, 7).map(c => i ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</table>${t.rows.length > 6 ? `<span>+ ${t.rows.length - 6} صف</span>` : ''}`).join('');
  }
}
function briefView() {
  const need = ready();
  return `<div class="dr">
    <section class="dr-col">
      <h4><span class="num">1</span>المادة</h4>
      <div class="dr-modes">${MODES.map(m => `<button class="dr-mode ${S.mode === m.id ? 'on' : ''}" data-m="${m.id}">${ic(m.icon)}<b>${m.t}</b><span>${m.d}</span></button>`).join('')}</div>
      <div id="drPane">${srcPane()}</div>
    </section>
    <section class="dr-col">
      <h4><span class="num">2</span>الموجز</h4>
      <label class="dr-lab">نوع العرض</label>
      <div class="chips" id="drType">${TYPES.map(t => `<button class="chip ${S.type === t.id ? 'on' : ''}" data-v="${t.id}">${t.ar}</button>`).join('')}</div>
      <label class="dr-lab">الهدف <span>ايش تبي من الجمهور بعد العرض؟</span></label>
      <textarea class="inp dr-ta xs" id="drGoal" dir="auto" placeholder="مثل: اعتماد ميزانية خطة الجاهزية قبل نهاية الشهر">${esc(S.goal)}</textarea>
      <label class="dr-lab">الجمهور</label>
      <div class="chips" id="drAud">${AUD.map(a => `<button class="chip ${S.audience === a ? 'on' : ''}" data-v="${a}">${a}</button>`).join('')}</div>
      <div class="dr-opts">
        <label>الطول ${seg('len', S.len, [['auto', 'تلقائي'], ['short', 'مختصر'], ['mid', 'متوسط'], ['long', 'مفصّل']])}</label>
        <label>اللغة ${seg('lang', S.lang, [['auto', 'تلقائي'], ['ar', 'عربي'], ['en', 'English']])}</label>
        <label>الصياغة ${seg('wording', S.wording, [['rewrite', 'تنفيذية'], ['keep', 'نصي كما هو']])}</label>
      </div>
      <h4 style="margin-top:22px"><span class="num">3</span>البناء</h4>
      <div class="dr-go">
        <button class="dr-btn pri" id="drCop" data-needs-online>${ic('sparkles')}<b>ابنِ مع كوبايلوت</b><span>تحليل وصياغة وقصة كاملة</span></button>
        <button class="dr-btn" id="drLocal">${ic('wifi-off')}<b>ابنِ بدون إنترنت</b><span>${S.mode === 'idea' ? 'هيكل القصة وأنت تكتب النص' : S.mode === 'data' ? 'الأداة تحسب الاستنتاجات بنفسها' : 'الأداة ترتّب المحتوى بنفسها'}</span></button>
      </div>
      <p class="dr-need ${need ? '' : 'hide'}" id="drNeed">${ic('triangle-alert')}<span>${need}</span></p>
    </section>
  </div>`;
}
function copilotView() {
  const m = material(), lang = langOf(m);
  const parts = D.buildPrompt(m, lang), n = parts.length;
  D._parts = parts;
  const row = (i) => {
    const last = i === n - 1;
    const label = n === 1 ? 'نسخ الطلب' : last ? `نسخ الطلب الأخير (${i + 1} من ${n})` : `نسخ الجزء ${i + 1} من ${n}`;
    return `<button class="btn ${S.done[i] ? 'sec ok' : 'pri'} dr-copy" data-i="${i}">${ic(S.done[i] ? 'check' : 'copy')}${label}</button>`;
  };
  return `<div class="dr-cp">
    <button class="dr-back" id="drBack">${ic('arrow-right')}رجوع للموجز</button>
    <div class="dr-step"><h4><span class="num">1</span>انسخ الطلب والصقه في Copilot</h4>
      ${n > 1 ? `<div class="note warn">${ic('list-checks')} المادة طويلة، فقسّمتها <b>${n - 1} ${n - 1 === 2 ? 'جزئين' : 'أجزاء'} + الطلب الأخير</b>. الصقها في <b>نفس المحادثة</b> بالترتيب، وانتظر رد Copilot القصير بعد كل جزء.</div>` : ''}
      <div class="dr-copies">${parts.map((_, i) => row(i)).join('')}<a class="btn sec" href="https://m365.cloud.microsoft/chat" target="_blank" rel="noopener" data-needs-online>${ic('external-link')}افتح Copilot</a><button class="btn sec" id="drShow">${ic('eye')}اعرض الطلب</button></div>
      <pre class="bc-pre hide" id="drPre" dir="auto">${esc(parts[n - 1])}</pre>
    </div>
    <div class="dr-step"><h4><span class="num">2</span>الصق رد Copilot هنا</h4>
      <textarea class="inp dr-ta" id="drReply" dir="auto" placeholder="=== ${lang === 'en' ? 'Slide' : 'شريحة'} ===&#10;…">${esc(S.reply)}</textarea>
      <div class="dr-status" id="drStatus"></div>
    </div>
  </div>`;
}
function replyStatus() {
  const el = $('#drStatus'), go = $('#drBuild'); if (!el) return;
  const v = S.reply.trim();
  if (!v) { el.innerHTML = ''; if (go) go.disabled = true; return; }
  const r = D.parseScript(v, langOf(material()));
  const n = r.specs.filter(s => s.kind === 'content').length;
  if (go) go.disabled = !n;
  if (!n) { el.innerHTML = `<p class="dr-need">${ic('triangle-alert')}ما لقيت شرائح في الرد. تأكد إنك نسخت رد Copilot كامل من أول «=== شريحة ===».</p>`; return; }
  el.innerHTML = `<p class="dr-ok">${ic('circle-check')}قرأت <b class="num">${r.specs.length}</b> شريحة</p>` + (r.ended ? '' : `<p class="dr-need soft">${ic('triangle-alert')}الرد يبدو مقطوع (ما وصل سطر «=== نهاية ==="). اكتب لـ Copilot: <b>«أكمل من حيث توقفت بنفس الصيغة»</b> والصق التكملة تحت الرد، أو ابنِ بما وصل.</p>`);
}
function bind() {
  const body = $('#modal .mbody'); if (!body) return;
  const foot = $('#modal .mfoot');
  if (S.view === 'copilot') {
    foot.innerHTML = `<span class="dr-hint">كل رقم في الرد يتراجع على مادتك بعد البناء</span><button class="btn pri" id="drBuild" disabled>${ic('clapperboard')}ابنِ العرض</button>`;
    $('#drBack').onclick = () => { S.view = 'brief'; draw(); };
    $$('.dr-copy', body).forEach(b => b.onclick = async () => { const i = +b.dataset.i; await PM.Brain.copy(D._parts[i]); S.done[i] = true; b.classList.remove('pri'); b.classList.add('sec', 'ok'); b.firstElementChild && b.firstElementChild.remove(); b.insertAdjacentHTML('afterbegin', ic('check')); });
    $('#drShow').onclick = () => $('#drPre').classList.toggle('hide');
    $('#drReply').oninput = e => { S.reply = e.target.value; clearTimeout(D._rt); D._rt = setTimeout(replyStatus, 250); };
    $('#drBuild').onclick = () => D.buildFromReply();
    replyStatus();
    return;
  }
  foot.innerHTML = '<span class="dr-hint">كل شي يشتغل على جهازك. كوبايلوت يشوف فقط النص اللي تنسخه له أنت.</span>';
  $$('.dr-mode', body).forEach(b => b.onclick = () => { S.mode = b.dataset.m; save(); draw(); });
  const need = () => { const t = ready(), el = $('#drNeed'); if (el) { el.classList.toggle('hide', !t); el.querySelector('span').textContent = t; } };
  const on = (id, key) => { const el = $('#' + id); if (el) el.oninput = e => { S[key] = e.target.value; save(); meta(); need(); }; };
  on('drText', 'text'); on('drIdea', 'idea'); on('drFacts', 'facts'); on('drData', 'data'); on('drGoal', 'goal');
  const pick = (id, key, toggle) => $$(`#${id} .chip`, body).forEach(b => b.onclick = () => { S[key] = toggle && S[key] === b.dataset.v ? '' : b.dataset.v; $$(`#${id} .chip`, body).forEach(x => x.classList.toggle('on', x.dataset.v === S[key])); save(); });
  pick('drType', 'type'); pick('drAud', 'audience', true);
  $$('.dr-seg', body).forEach(sg => $$('button', sg).forEach(b => b.onclick = () => { S[sg.dataset.k] = b.dataset.v; $$('button', sg).forEach(x => x.classList.toggle('on', x === b)); save(); }));
  const takeFile = async f => {
    if (!f) return;
    PM.UI.progress('أقرأ الملف…', f.name);
    await new Promise(r => setTimeout(r, 30));
    try {
      const r = await readSourceFile(f);
      PM.UI.progress(false);
      if (r.kind === 'data') { S.mode = 'data'; S.data = r.text; }
      else if (r.kind === 'text') { S.mode = 'text'; S.text = r.text; }
      else { S.mode = 'file'; S.file = r; }
      save(); draw();
    } catch (e) { console.error(e); PM.UI.progress(false); PM.UI.toast(e.message || 'ما قدرت أقرأ الملف', 4200); }
  };
  const fi = $('#drFile'); if (fi) fi.onchange = e => { const f = e.target.files[0]; e.target.value = ''; takeFile(f); };
  const xi = $('#drXls'); if (xi) xi.onchange = e => { const f = e.target.files[0]; e.target.value = ''; takeFile(f); };
  const dz = $('#drDrop');
  if (dz) { dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('on'); }); dz.addEventListener('dragleave', () => dz.classList.remove('on')); dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('on'); takeFile(e.dataTransfer.files[0]); }); }
  const uo = $('#drUseOpen'); if (uo) uo.onclick = () => { const d = ST.deck; S.file = { kind: 'file', specs: d.slides.filter(s => !s.hidden).map(s => PM.clone(s.spec)), assets: Object.fromEntries(Object.entries(d.assets).filter(([, a]) => a && a.fromFile)), lang: d.lang, name: (d.name || 'العرض المفتوح') }; draw(); };
  $('#drCop').onclick = () => {
    const t = ready(); if (t) { PM.UI.toast(t, 3200); return; }
    // a reply belongs to the request it answered: new material or a new brief starts clean
    const m = material(), key = [S.mode, S.type, S.goal, S.audience, S.len, S.lang, S.wording, m.text].join('\u0001');
    if (key !== D._key) { S.reply = ''; S.done = {}; D._key = key; }
    S.view = 'copilot'; draw();
  };
  $('#drLocal').onclick = () => { const t = ready(); if (t) { PM.UI.toast(t, 3200); return; } D.buildLocal(); };
  meta();
}
function draw() {
  const body = $('#modal .mbody'); if (!body) return;
  body.innerHTML = S.view === 'copilot' ? copilotView() : briefView();
  bind();
  body.scrollTop = 0;
}
D.open = function (mode) {
  if (PM.Ed && PM.Ed.endEdit) PM.Ed.endEdit();
  if (mode) S.mode = mode;
  S.view = 'brief';
  PM.UI.modal(`${ic('clapperboard')} المخرج <span class="dr-tag">من مادة خام إلى عرض تنفيذي كامل</span>`, '', { wide: true, foot: ' ' });
  $('#modal .mbox').classList.add('dr-box');
  // inside the toolkit page its floating buttons sit over the bottom of the window: keep the footer clear of them
  if (window.JEDHUB && window.JEDHUB.framed) $('#modal').classList.add('dr-framed');
  draw();
};
const FORM_AR = { items: 'بنود', kpis: 'أرقام', steps: 'مراحل', timeline: 'خط زمني', bullets: 'نقاط', para: 'رسالة', quote: 'اقتباس', compare: 'مقارنة', table: 'جدول', chart: 'رسم بياني', photo: 'صورة', title: 'عنوان' };
D.report = function (r) {
  const d = r.d;
  const counts = {};
  d.slides.forEach(s => { if (s.spec.kind === 'content') { const f = PM.shape(s.spec).form; counts[f] = (counts[f] || 0) + 1; } });
  const story = PM.storyOf(d);
  const order = { bad: 0, warn: 1, info: 2 };
  const issues = r.issues.slice().sort((a, b) => order[a.lv] - order[b.lv] || a.i - b.i);
  const extra = [];
  if (r.via === 'copilot' && !r.ended) extra.push({ lv: 'warn', t: 'رد Copilot كان مقطوع', d: 'بنيت الشرائح اللي وصلت. لو ناقص شي اطلب من Copilot يكمل وابنِ من جديد.' });
  if (r.split) extra.push({ lv: 'info', t: `قسّمت ${r.split} شريحة مزدحمة على شريحتين`, d: 'عشان ما ينضغط النص ويصغر الخط' });
  if (r.pics) extra.push({ lv: 'info', t: `رجّعت ${r.pics} صورة من ملفك لشرائحها`, d: 'كل صورة راحت للشريحة اللي تتكلم عن موضوعها، والصور الزايدة أخذت شريحة صور لحالها' });
  if (r.via === 'local' && r.mode === 'idea') extra.push({ lv: 'info', t: 'هذا هيكل القصة فقط', d: 'اكتب نصك مكان كل شريحة بضغطتين، أو ابنِ مع كوبايلوت ليكتب المحتوى' });
  const clean = !issues.filter(x => x.lv !== 'info').length;
  const body = `<div class="rv-top"><div class="rv-ring" style="--c:${story.score >= 8 ? '#0E8A5F' : story.score >= 6 ? '#004EAA' : '#B7791F'};--p:${story.score * 10}"><b class="num">${story.score}</b><span>من 10</span></div>
      <div><h3 style="margin:0 0 4px">العرض جاهز: <span class="num">${d.slides.length}</span> شريحة</h3>
      <p class="hint" style="margin:0 0 8px">${r.via === 'copilot' ? 'بناه المخرج من رد Copilot' : 'بناه المخرج بدون إنترنت'} · تقييم قصة العرض ${story.score} من 10</p>
      <div class="chips">${Object.entries(counts).map(([k, v]) => `<span class="chip"><b class="num">${v}</b>&nbsp;${FORM_AR[k] || k}</span>`).join('')}</div></div></div>
    <h4 class="dr-h">${ic(clean ? 'circle-check' : 'list-checks')}${clean ? 'ما لقيت شي يحتاج مراجعة' : 'راجع هذي قبل العرض'}</h4>
    <div class="rv-list">${issues.map(x => `<div class="issue"><i class="dot ${x.lv === 'bad' ? 'e' : x.lv === 'warn' ? 'w' : 'i'}"></i><div><b>الشريحة <span class="num">${x.i + 1}</span> · ${esc(x.t)}</b><span>${esc(x.d)}</span></div><button class="btn sec" data-go="${x.i}" style="height:34px">افتح</button></div>`).join('')}
    ${extra.map(x => `<div class="issue"><i class="dot ${x.lv === 'warn' ? 'w' : 'i'}"></i><div><b>${esc(x.t)}</b><span>${esc(x.d)}</span></div></div>`).join('')}</div>
    ${r.hadDeck ? `<p class="hint" style="margin-top:14px">عرضك السابق محفوظ في «ملفاتي» لو احتجته.</p>` : ''}`;
  PM.UI.modal(`${ic('clapperboard')} تقرير المخرج`, body, { foot: `<button class="btn sec" id="drStory">${ic('book-open')}قصة العرض</button><button class="btn pri" data-close2>${ic('check')}تمام، افتح العرض</button>` });
  $$('#modal [data-go]').forEach(b => b.onclick = () => { PM.UI.closeModal(); PM.UI.select(+b.dataset.go); });
  $('#modal [data-close2]').onclick = () => PM.UI.closeModal();
  $('#drStory').onclick = () => { PM.UI.closeModal(); PM.Brain.story(); };
};

/* ---------- doors: the start screen and the top bar ---------- */
D.mount = function () {
  load();
  const a = $('#stDirector'); if (a) a.onclick = () => D.open();
  const b = $('#bDirector'); if (b) b.onclick = () => D.open(ST.deck && ST.deck.slides.length > 2 && !S.text && !S.idea && !S.data ? 'file' : null);
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(D.mount, 0)); else setTimeout(D.mount, 0);
})(window.PM);
