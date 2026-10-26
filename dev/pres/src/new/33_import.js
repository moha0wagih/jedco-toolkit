/* ==========================================================================
   صانع العروض 2 — import (PowerPoint · Word · project file) and optional Copilot
   ========================================================================== */
(function (PM) {
'use strict';
const ST = PM.ST;
/* file → deck (analysed, laid out) */
PM.importFile = async function (file, opts = {}) {
  const name = file.name || '';
  if (/\.json$/i.test(name)) {
    const deck = PM.deserialize(await file.text());
    return { deck, report: { kind: 'project' } };
  }
  const buf = await file.arrayBuffer();
  let zip;
  try { zip = await JSZip.loadAsync(buf); } catch (e) { throw new Error('ما قدرت أفتح الملف. تأكد إنه Word ‏(.docx) أو PowerPoint ‏(.pptx) وما هو محمي بكلمة مرور.'); }
  let res;
  if (zip.file('word/document.xml')) {
    const d = await parseDocx(zip, {});
    res = PM.analyzeDocx(d, { keep: !!opts.keep });
  } else if (zip.file('ppt/presentation.xml')) {
    const p = await parsePptx(zip, {});
    res = await PM.analyzePptx(p, { keep: !!opts.keep });
    res.warnings = p.warnings || [];
  } else throw new Error('الملف ما فيه محتوى Word أو PowerPoint');
  const lang = opts.lang && opts.lang !== 'auto' ? opts.lang : (res.lang || 'ar');
  const deck = PM.newDeck({ lang, grey: !!opts.grey, dark: !!opts.dark, name: name.replace(/\.(pptx|docx)$/i, '') });
  // images from the file
  for (const [id, a] of Object.entries(res.assets || {})) {
    if (!a || !a.bytes) continue;
    let ext = a.ext === 'jpg' ? 'jpeg' : a.ext;
    deck.assets[id] = { kind: 'image', bytes: a.bytes, ext, size: a.size || PM.imgSizeOf(a.bytes), fromFile: true };
  }
  for (const spec of res.specs) {
    if (spec.kind === 'content' && !spec.blocks.length && !spec.imgs.length && !spec.title) continue;
    PM.addSlide(deck, spec);
  }
  // make sure the deck opens and closes properly
  if (!deck.slides.length || deck.slides[0].spec.kind !== 'cover') PM.addSlide(deck, { kind: 'cover', title: deck.name || (lang === 'en' ? 'Presentation' : 'عرض تقديمي'), sub: '' }, 0);
  if (deck.slides[deck.slides.length - 1].spec.kind !== 'closing') PM.addSlide(deck, { kind: 'closing', title: lang === 'en' ? 'Thank you' : 'شكراً لكم', sub: '' });
  const report = { slides: deck.slides.length, warnings: res.warnings || [], counts: {} };
  deck.slides.forEach(s => { const k = s.spec.kind === 'content' ? (PM.shape(s.spec).form) : s.spec.kind; report.counts[k] = (report.counts[k] || 0) + 1; });
  return { deck, report, specsCount: res.specs.length };
};
/* blank deck with a cover, an agenda and a closing to start from */
PM.blankDeck = function (lang) {
  const en = lang === 'en';
  const d = PM.newDeck({ lang });
  PM.addSlide(d, { kind: 'cover', title: en ? 'Presentation title' : 'عنوان العرض', sub: en ? 'Department · Date' : 'الإدارة · التاريخ' });
  PM.addSlide(d, { kind: 'content', title: en ? 'Slide title' : 'عنوان الشريحة', blocks: [{ k: 'items', items: en ? [{ title: 'First point', text: 'A short line that explains it.' }, { title: 'Second point', text: 'A short line that explains it.' }, { title: 'Third point', text: 'A short line that explains it.' }] : [{ title: 'النقطة الأولى', text: 'سطر قصير يشرح الفكرة.' }, { title: 'النقطة الثانية', text: 'سطر قصير يشرح الفكرة.' }, { title: 'النقطة الثالثة', text: 'سطر قصير يشرح الفكرة.' }] }] });
  PM.addSlide(d, { kind: 'closing', title: en ? 'Thank you' : 'شكراً لكم' });
  return d;
};
/* new slide of a given kind, with sensible starter content */
PM.starterSpec = function (kind, lang) {
  const en = lang === 'en';
  const S = {
    items: { kind: 'content', title: en ? 'Three pillars' : 'ثلاثة محاور', blocks: [{ k: 'items', items: [1, 2, 3].map(i => ({ title: (en ? 'Pillar ' : 'المحور ') + i, text: en ? 'One sentence that explains it.' : 'جملة واحدة تشرح المحور.' })) }] },
    kpis: { kind: 'content', title: en ? 'Key numbers' : 'أرقام رئيسية', blocks: [{ k: 'kpis', items: [{ value: '53M', label: en ? 'Passengers' : 'مسافر' }, { value: '98%', label: en ? 'On time' : 'التزام بالمواعيد' }, { value: '380+', label: en ? 'Daily flights' : 'رحلة يومية' }] }] },
    steps: { kind: 'content', title: en ? 'How it works' : 'آلية العمل', blocks: [{ k: 'steps', items: [1, 2, 3, 4].map(i => ({ title: (en ? 'Step ' : 'الخطوة ') + i, text: en ? 'What happens here.' : 'ايش يصير في هذي الخطوة.' })) }] },
    timeline: { kind: 'content', title: en ? 'Timeline' : 'الجدول الزمني', blocks: [{ k: 'timeline', items: ['2024', '2025', '2026', '2027'].map((y, i) => ({ date: y, title: (en ? 'Milestone ' : 'المحطة ') + (i + 1), text: '' })) }] },
    bullets: { kind: 'content', title: en ? 'Key points' : 'النقاط الرئيسية', blocks: [{ k: 'bullets', items: en ? ['First point', 'Second point', 'Third point'] : ['النقطة الأولى', 'النقطة الثانية', 'النقطة الثالثة'] }] },
    para: { kind: 'content', title: en ? 'Message' : 'الرسالة', blocks: [{ k: 'para', text: en ? 'Write the main message of this slide here.' : 'اكتب هنا الرسالة الرئيسية لهذه الشريحة.' }] },
    quote: { kind: 'content', title: '', blocks: [{ k: 'quote', text: en ? 'A short, strong quote.' : 'اقتباس قصير وقوي.', by: en ? 'Name, Title' : 'الاسم، المنصب' }] },
    compare: { kind: 'content', title: en ? 'Before and after' : 'قبل وبعد', blocks: [{ k: 'compare', a: { title: en ? 'Today' : 'الوضع الحالي', items: en ? ['Point one', 'Point two'] : ['النقطة الأولى', 'النقطة الثانية'] }, b: { title: en ? 'Target' : 'المستهدف', items: en ? ['Point one', 'Point two'] : ['النقطة الأولى', 'النقطة الثانية'] } }] },
    chart: { kind: 'content', title: en ? 'Growth' : 'النمو', blocks: [{ k: 'chart', chart: { kind: 'col', cats: ['2022', '2023', '2024', '2025'], series: [{ name: en ? 'Passengers' : 'المسافرون', vals: [31.6, 44.8, 49, 53.3] }], unit: 'M' } }] },
    table: { kind: 'content', title: en ? 'Table' : 'جدول', blocks: [{ k: 'table', rows: en ? [['Item', '2024', '2025'], ['First', '10', '12'], ['Second', '20', '24'], ['Third', '30', '33']] : [['البند', '2024', '2025'], ['الأول', '10', '12'], ['الثاني', '20', '24'], ['الثالث', '30', '33']] }] },
    photo: { kind: 'content', title: en ? 'A strong image' : 'صورة معبّرة', blocks: [], imgs: [] },
    divider: { kind: 'divider', title: en ? 'Section title' : 'عنوان القسم' },
    agenda: { kind: 'agenda', title: en ? 'Agenda' : 'جدول الأعمال', items: (en ? ['Overview', 'Main pillars', 'Timeline', 'Next steps'] : ['نظرة عامة', 'المحاور الرئيسية', 'الجدول الزمني', 'الخطوات القادمة']).map(t => ({ title: t })) },
    cover: { kind: 'cover', title: en ? 'Presentation title' : 'عنوان العرض', sub: en ? 'Department · Date' : 'الإدارة · التاريخ' },
    closing: { kind: 'closing', title: en ? 'Thank you' : 'شكراً لكم' },
    blank: { kind: 'content', title: en ? 'Title' : 'العنوان', blocks: [] }
  };
  return JSON.parse(JSON.stringify(S[kind] || S.items));
};
/* convert a slide's main content into another shape (no words change) */
PM.reshape = function (spec, to) {
  const sp = PM.shape(spec);
  const b = sp.main; if (!b) return false;
  const i = spec.blocks.indexOf(b);
  const items = sp.items.map(it => ({ title: it.title || '', text: it.text || '', value: it.value || '', bullets: it.bullets }));
  const lines = items.map(it => [it.value, it.title, it.text].filter(Boolean).join(' — ')).filter(Boolean);
  let nb = null;
  if (to === 'bullets') nb = { k: 'bullets', items: b.k === 'para' ? b.text.split(/(?<=[.!؟?])\s+|\n/).filter(Boolean) : lines };
  else if (to === 'items' || to === 'steps') nb = { k: to, items: b.k === 'para' ? b.text.split(/(?<=[.!؟?])\s+|\n/).filter(Boolean).map(t => ({ title: '', text: t })) : b.k === 'bullets' ? b.items.map(t => { const m = String(t).match(/^([^:：—-]{2,40})[:：—-]\s*(.+)$/); return m ? { title: m[1].trim(), text: m[2].trim() } : { title: t, text: '' }; }) : items.map(it => ({ title: it.title || it.value, text: it.text, bullets: it.bullets })) };
  else if (to === 'timeline') nb = { k: 'timeline', items: items.map((it, k) => ({ date: it.value || String(k + 1), title: it.title, text: it.text })) };
  else if (to === 'kpis') { if (!items.every(it => it.value || PM.numInfo(it.title))) return false; nb = { k: 'kpis', items: items.map(it => ({ value: it.value || it.title, label: it.value ? it.title : it.text, text: it.value ? it.text : '' })) }; }
  else if (to === 'para') nb = { k: 'para', text: b.k === 'para' ? b.text : lines.join('\n') };
  else if (to === 'chart') { const ch = b.k === 'table' ? PM.chartFromRows(b.rows) : (b.items && b.items.every(it => PM.numInfo(it.value)) ? { kind: 'col', cats: b.items.map(it => it.label || it.title || ''), series: [{ name: '', vals: b.items.map(it => PM.numInfo(it.value).v) }], unit: (PM.numInfo(b.items[0].value).suf || '').trim() } : null); if (!ch) return false; nb = { k: 'chart', chart: ch }; }
  if (!nb) return false;
  if (b.head) nb.head = b.head;
  spec.blocks[i] = nb;
  return true;
};
})(window.PM);
