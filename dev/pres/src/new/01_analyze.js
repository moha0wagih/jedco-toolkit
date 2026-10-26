/* ==========================================================================
   صانع العروض 2 — content analysis
   Reads a parsed PowerPoint (positioned elements) or Word file (blocks) and
   returns clean, structured slide specs:
     { kind: cover|agenda|divider|content|closing, title, sub, eyebrow,
       blocks: [ {k:'items'|'kpis'|'steps'|'timeline'|'bullets'|'para'|'quote'|'table'|'chart'|'compare'|'qa', ...} ],
       imgs: [assetId], notes }
   ========================================================================== */
(function (PM) {
'use strict';
const isAr = PM.isAr;
const clean = t => String(t || '').replace(/[​-‏‪-‮⁦-⁩]/g, '').replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const norm = t => clean(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const wc = t => PM.words(t);
const RE_INDEX = /^(?:0?\d{1,2}|[١-٩]|[٠-٩]{1,2}|[①-⑳]|step\s*\d+|المرحلة\s*\S+|الخطوة\s*\S+)[.)\-–:]?$/i;
const RE_DATE = /(\b(19|20)\d\d\b|\bQ[1-4]\b|\bH[12]\b|\b(day|days|week|weeks|month|months|year|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d*\b|يوم|أيام|أسبوع|اسبوع|أسابيع|شهر|أشهر|سنة|عام|الربع|يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|محرم|صفر|ربيع|جمادى|رجب|شعبان|رمضان|شوال|ذو القعدة|ذو الحجة|هـ\b)/i;
const RE_CONNECT = /^(yes|no|نعم|لا|or|أو|and|و|vs\.?|مقابل)$/i;
const RE_SYMBOL = /^[\s→←↓↑↗↘➜➔▶►◀◄•·●○◆◇■□✓✔✗✘×+\-–—|/\\<>=:;,.]+$/;
const RE_AGENDA = /^(agenda|contents|table of contents|outline|المحتويات|جدول الأعمال|جدول الاعمال|المحاور|محاور العرض|الأجندة|الاجندة|فهرس)$/i;
const RE_THANKS = /^(thank you|thanks|شكرا|شكراً|شكرًا|نشكركم|شكرا لكم|شكراً لكم|q\s*&\s*a|questions\??|أسئلة|الأسئلة|اسئلة)[.!؟]?$/i;
const RE_QUOTE = /^["“”«„'‘’]/;
const RE_LABEL = /^([^:：\n]{2,48})[:：]\s+(.{3,})$/s;
const RE_STEPS_TITLE = /(process|workflow|steps|stages|phases|approach|journey|how it works|methodology|مراحل|خطوات|المراحل|الخطوات|آلية|الية|منهجية|رحلة|سير العمل|دورة)/i;
const RE_NOTE = { test: t => /^(REVIEW|TODO|FIXME|DRAFT|NEXT)\s*[·:\-–—]\s*\S/.test(t) || /^NEXT\s+[A-Z][a-z].{6,}/.test(t) || /^(review|todo|fixme)\s*[·:\-–—]/i.test(t) || /^(للمراجعة|ملاحظة للمراجعة|مراجعة)\s*[·:\-–—]/.test(t) || /\bplaceholder\b|\bgpt[ -]image\b|\(see [^)]*\.md\)/i.test(t) };
const RE_CHAPTER = /^(chapter|section|part|module|الفصل|القسم|المحور|الجزء|الباب)(\s*[\d٠-٩]+)?$/i;
const RE_COMPARE = /(before|after|vs\.?|versus|current|future|today|tomorrow|pros|cons|قبل|بعد|مقابل|الحالي|المستقبلي|المستهدف|الوضع الراهن|إيجابيات|سلبيات|التحديات|الحلول)/i;

PM.RE_DATE = RE_DATE;

/* ---------- helpers ---------- */
function paraText(p) { return clean(p.text); }
function elText(e) { return (e.paras || []).map(paraText).filter(Boolean).join('\n'); }
function maxSize(e) { return Math.max(0, ...(e.paras || []).filter(p => clean(p.text)).map(p => p.size || 0)); }
function isNumLike(t) { t = clean(t); return t.length <= 14 && !!PM.numInfo(t); }
function inside(b, c, pad = 4) { const cx = b.x + b.w / 2, cy = b.y + b.h / 2; return cx >= c.x - pad && cx <= c.x + c.w + pad && cy >= c.y - pad && cy <= c.y + c.h + pad; }
function xOverlap(a, b) { const o = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x); return o / Math.min(a.w, b.w); }
function median(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

/* split a text unit into title / value / text / bullets */
function unitToItem(paras) {
  const ps = paras.filter(p => clean(p.text));
  const it = {};
  if (!ps.length) return null;
  let i = 0;
  const first = clean(ps[0].text);
  if (RE_INDEX.test(first) && ps.length > 1) { it.index = first; i++; }
  else if (isNumLike(first) && ps.length > 1) { it.value = first; i++; }
  else if (isNumLike(first) && ps.length === 1) { it.value = first; return it; }
  const rest = ps.slice(i);
  if (!rest.length) return it;
  const sizes = rest.map(p => p.size || 0);
  const big = Math.max(...sizes);
  const t0 = clean(rest[0].text);
  const titleLike = rest.length > 1 && (rest[0].bold || (rest[0].size || 0) > median(sizes.slice(1)) + 0.5) && wc(t0) <= 14;
  let j = 0;
  if (titleLike || (rest.length > 1 && wc(t0) <= 7 && wc(clean(rest[1].text)) > wc(t0))) { it.title = t0; j = 1; }
  const tail = rest.slice(j);
  const bul = tail.filter(p => p.bullet && p.bullet !== 'none' && p.bullet !== null && p.bullet !== 'inherit' || (p.lvl || 0) > 0);
  if (tail.length >= 2 && (bul.length >= tail.length - 1 || tail.every(p => wc(clean(p.text)) <= 12))) {
    if (tail.length >= 2 && tail.length - (it.title ? 0 : 1) >= 2 && !it.title && tail.length && wc(clean(tail[0].text)) <= 14 && tail.length > 2) {
      // first line reads as a sub-title when the rest are list items
    }
    const sub = tail.length > 2 && !bul.includes(tail[0]) && bul.length >= 2 ? clean(tail[0].text) : null;
    if (sub) { it.text = sub; it.bullets = tail.slice(1).map(p => clean(p.text)); }
    else it.bullets = tail.map(p => clean(p.text));
    if (!it.title && it.bullets.length && it.bullets.length <= 1) { it.text = it.bullets[0]; delete it.bullets; }
  } else if (tail.length) it.text = tail.map(p => clean(p.text)).join('\n');
  if (!it.title && it.text && !it.value && !it.index) {
    const m = it.text.match(RE_LABEL);
    if (m && wc(m[1]) <= 6) { it.title = m[1].trim(); it.text = m[2].trim(); }
  }
  void big;
  return it;
}

/* ---------- build blocks from a list of items ---------- */
function classifyGroup(items, ctx) {
  const n = items.length;
  // numbers that do not run 1,2,3… are figures, not step numbers
  const idx = items.filter(i => i.index && /^\d+$/.test(PM.digits(i.index).replace(/[.)\-–:]$/, '')));
  const seq = idx.length >= 2 && idx.every((i, k) => k === 0 || parseInt(PM.digits(i.index)) === parseInt(PM.digits(idx[k - 1].index)) + 1);
  if ((idx.length && !seq) || items.filter(i => i.value).length >= n / 2) items.forEach(i => { if (!i.value && i.index && /^\d+$/.test(PM.digits(i.index))) { i.value = i.index; delete i.index; } });
  const withVal = items.filter(i => i.value).length;
  const withIdx = items.filter(i => i.index).length;
  const dated = items.filter(i => RE_DATE.test([i.title, i.text, i.value].filter(Boolean).join(' '))).length;
  const longText = items.some(i => wc(i.text) > 40 || (i.bullets || []).length > 4);
  const yearVals = items.filter(i => i.value && /^(19|20)\d\d$/.test(PM.digits(i.value).trim())).length;
  if (yearVals >= Math.max(2, n - 1) && n >= 3 && items.some(i => i.title || i.text)) return { k: 'timeline', items: items.map(i => ({ date: i.value || '', title: i.title || (i.value ? '' : i.text || ''), text: i.title ? [i.text, ...(i.bullets || [])].filter(Boolean).join('\n') : (i.value ? [i.text, ...(i.bullets || [])].filter(Boolean).join('\n') : (i.bullets || []).join('\n')) })) };
  if (withVal >= Math.max(2, n - (n > 3 ? 1 : 0)) && !longText && items.every(i => !i.bullets || i.bullets.length <= 1 || i.title)) {
    const pureKpi = items.every(i => !i.bullets && wc(i.text) <= 16);
    if (pureKpi) return { k: 'kpis', items: items.map(i => ({ value: i.value || '', label: i.title || i.text || '', text: i.title ? (i.text || '') : '' })) };
    return { k: 'items', items: items.map(i => ({ value: i.value, title: i.title || '', text: i.text || '', bullets: i.bullets })), valued: true };
  }
  if (dated >= Math.max(2, n - 1) && n >= 3) return { k: 'timeline', items: items.map(i => {
    const dateTxt = !i.value && !i.index && i.title && i.text && RE_DATE.test(i.text) && wc(i.text) <= 10 ? i.text : '';
    const dateTitle = !i.value && !i.index && !dateTxt && i.title && RE_DATE.test(i.title) && wc(i.title) <= 4 ? i.title : '';
    return { date: i.value || i.index || dateTxt || dateTitle, title: dateTitle ? (i.text || '') : (i.title || ''), text: dateTitle ? (i.bullets || []).join('\n') : [dateTxt ? '' : i.text, ...(i.bullets || [])].filter(Boolean).join('\n') };
  }) };
  if ((withIdx >= n - 1 && n >= 3) || (ctx.stepsHint && n >= 3)) return { k: 'steps', items: items.map(i => ({ title: i.title || i.text || '', text: i.title ? [i.text, ...(i.bullets || [])].filter(Boolean).join('\n') : (i.bullets || []).join('\n') })) };
  return { k: 'items', items: items.map(i => ({ title: i.title || '', text: i.text || '', bullets: i.bullets, value: i.value })) };
}

/* a single text unit → bullets / para / items / quote */
function textBlocks(paras) {
  const ps = paras.filter(p => clean(p.text));
  if (!ps.length) return [];
  const lines = ps.map(p => clean(p.text));
  const joined = lines.join('\n');
  if (RE_QUOTE.test(joined) && wc(joined) <= 70) {
    let m = joined.match(/^(.*?)(?:\n\s*[—–-]\s*(.+))?$/s);
    const inl = joined.match(/^["“«„'‘](.+?)["”»“'’]\s*[—–-]\s*(.{2,60})$/s);
    if (inl) m = [null, inl[1], inl[2]];
    return [{ k: 'quote', text: m[1].replace(/^["“”«„'‘’]+|["“”»„'‘’]+$/g, '').trim(), by: (m[2] || '').trim() }];
  }
  const labelled = lines.filter(l => RE_LABEL.test(l) && wc(l.split(/[:：]/)[0]) <= 6);
  if (lines.length >= 2 && labelled.length >= Math.max(2, lines.length - 1)) {
    return [{ k: 'items', items: lines.map(l => { const m = l.match(RE_LABEL); return m ? { title: m[1].trim(), text: m[2].trim() } : { title: '', text: l }; }) }];
  }
  // alternating title / detail lines (bold or bigger, then smaller) → titled items
  if (ps.length >= 4 && ps.length % 2 === 0) {
    const ev = ps.filter((_, i) => i % 2 === 0), od = ps.filter((_, i) => i % 2 === 1);
    const stronger = ev.every((p, i) => (p.bold && !od[i].bold) || (p.size || 12) > (od[i].size || 12) + 0.4);
    if (stronger && ev.every(p => wc(p.text) <= 10)) return [{ k: 'items', items: ev.map((p, i) => ({ title: clean(p.text), text: clean(od[i].text) })) }];
  }
  // a header line on top of a list
  if (ps.length >= 3 && headerLike(ps[0]) && !headerLike(ps[1])) {
    const sub = textBlocks(ps.slice(1));
    if (sub[0]) sub[0].head = clean(ps[0].text);
    return sub;
  }
  const bul = ps.filter(p => (p.bullet && p.bullet !== 'none' && p.bullet !== 'inherit') || (p.lvl || 0) > 0).length;
  if (lines.length >= 3 && (bul >= lines.length - 1 || lines.every(l => wc(l) <= 18))) return [{ k: 'bullets', items: lines }];
  if (lines.length === 2 && bul === 2) return [{ k: 'bullets', items: lines }];
  // lead line + list
  if (lines.length >= 3 && bul >= lines.length - 1 - 1 && wc(lines[0]) > 0) return [{ k: 'para', text: lines[0] }, { k: 'bullets', items: lines.slice(1) }];
  return [{ k: 'para', text: lines.join('\n') }];
}

/* ---------- chart part → editable chart ---------- */
async function readChartPart(zip, part) {
  try {
    const xml = await zip.file(part).async('string');
    const d = new DOMParser().parseFromString(xml, 'application/xml');
    const q = (el, n) => Array.from(el.getElementsByTagName(n));
    const types = ['c:barChart', 'c:bar3DChart', 'c:lineChart', 'c:line3DChart', 'c:pieChart', 'c:pie3DChart', 'c:doughnutChart', 'c:areaChart'];
    let kind = 'col', host = null;
    for (const t of types) { const e = q(d, t)[0]; if (e) { host = e; kind = /pie|doughnut/.test(t) ? (/doughnut/.test(t) ? 'donut' : 'pie') : /line/.test(t) ? 'line' : /area/.test(t) ? 'area' : ((q(e, 'c:barDir')[0] || { getAttribute: () => 'col' }).getAttribute('val') === 'bar' ? 'hbar' : 'col'); break; } }
    if (!host) return null;
    const sers = q(host, 'c:ser');
    let cats = [];
    const series = sers.map(s => {
      const nm = (q(s, 'c:tx')[0] && q(q(s, 'c:tx')[0], 'c:v')[0] || {}).textContent || '';
      const cat = q(s, 'c:cat')[0];
      if (cat && !cats.length) cats = q(cat, 'c:pt').map(p => (q(p, 'c:v')[0] || {}).textContent || '');
      const val = q(s, 'c:val')[0];
      const vals = val ? q(val, 'c:pt').map(p => parseFloat((q(p, 'c:v')[0] || {}).textContent) || 0) : [];
      const fc = val && q(val, 'c:formatCode')[0] ? q(val, 'c:formatCode')[0].textContent : '';
      return { name: nm, vals, pct: /%/.test(fc) };
    }).filter(s => s.vals.length);
    if (!series.length) return null;
    if (!cats.length) cats = series[0].vals.map((_, i) => String(i + 1));
    const pct = series[0].pct;
    return { kind, cats, series: series.map(s => ({ name: s.name, vals: s.pct && s.vals.every(v => v <= 1.0001) ? s.vals.map(v => Math.round(v * 1000) / 10) : s.vals })), unit: pct ? '%' : '' };
  } catch (e) { return null; }
}

/* a table with a label column and number columns becomes a chart option */
function chartFromRows(rows) {
  if (!rows || rows.length < 3) return null;
  const body = rows.slice(1), ncol = Math.max(...rows.map(r => r.length));
  if (body.length > 12 || ncol < 2) return null;
  const nums = Array.from({ length: ncol }, (_, c) => body.map(r => PM.numInfo(r[c])));
  const sameUnit = ps => ps.every(p => p && p.pct === ps[0].pct && (p.suf || '') === (ps[0].suf || '') && (p.pre || '') === (ps[0].pre || ''));
  const isNum = nums.map((ps, c) => ps.filter(Boolean).length >= body.length && sameUnit(ps) && !body.every(r => /^\s*(19|20)\d\d\s*$/.test(PM.digits(r[c]))));
  // rows measuring different things (%, minutes, counts) are a table, not a chart
  if (isNum.filter(Boolean).length && nums.some((ps, c) => isNum[c] === false && ps.filter(Boolean).length >= body.length)) return null;
  const lab = isNum.findIndex(x => !x); if (lab < 0) return null;
  const cols = isNum.map((x, c) => x ? c : -1).filter(c => c >= 0).slice(0, 4);
  if (!cols.length || isNum.filter((x, c) => !x && c !== lab).length) return null;
  const info = nums[cols[0]][0];
  return { kind: cols.length === 1 && body.length <= 6 && info.pct && Math.abs(body.reduce((a, r) => a + nums[cols[0]][body.indexOf(r)].v, 0) - 100) < 3 ? 'donut' : body.some(r => String(r[lab]).length > 16) ? 'hbar' : 'col', cats: body.map(r => r[lab]), series: cols.map(c => ({ name: rows[0][c] || '', vals: nums[c].map(p => p.v) })), unit: info.pct ? '%' : (info.suf || '').trim(), pre: info.pre || '' };
}
PM.chartFromRows = chartFromRows;

/* ======================================================================
   PowerPoint → specs
   ====================================================================== */
async function analyzePptx(parsed, opt = {}) {
  const KEEP = !!opt.keep;
  const tc = t => KEEP ? t : titleCase(t);
  const S = parsed.slides;
  const assets = {};
  // texts repeated across many slides at the same spot are chrome (progress strips, footers, confidentiality lines)
  const rep = {};
  S.forEach(s => s.els.filter(e => e.type === 'text').forEach(e => {
    for (const p of e.paras || []) {
      const k = norm(p.text); if (!k || k.length > 60) continue;
      (rep[k + '@' + Math.round(e.y / 30)] = rep[k + '@' + Math.round(e.y / 30)] || new Set()).add(s.index);
      (rep['*' + k] = rep['*' + k] || new Set()).add(s.index);
    }
  }));
  const repLimit = Math.max(3, Math.ceil(S.length * 0.34));
  const chromePara = (p, e, sIdx) => {
    const k = norm(p.text);
    if (!k) return true;
    if (sIdx === 0) return false;
    if (/^\d{1,3}$/.test(k) && (e.y > 470 || e.y < 40) && (p.size || 12) <= 14) return true;
    if ((e.y > 500 || e.y + e.h > 530) && (p.size || 12) <= 10) return true;
    if (k.length <= 60 && (rep[k + '@' + Math.round(e.y / 30)] || new Set()).size >= repLimit) return true;
    if (k.length <= 24 && (rep['*' + k] || new Set()).size >= Math.max(4, Math.ceil(S.length * 0.5)) && (p.size || 12) < 14) return true;
    return false;
  };
  const specs = [];
  let ai = 0;
  for (let si = 0; si < S.length; si++) {
    const s = S[si];
    const pics = s.els.filter(e => e.type === 'pic' && e.w * e.h > 960 * 540 * 0.05 && !e.video);
    const shapes = s.els.filter(e => e.type === 'shape' && (e.fill || e.line) && e.w * e.h > 960 * 540 * 0.012 && e.w * e.h < 960 * 540 * 0.6 && e.w > 40 && e.h > 30);
    /* segments: one text box may hold an eyebrow + a title + a paragraph; split them by role */
    const segs = [], noteLines = [];
    for (const e of s.els) {
      if (e.type !== 'text' || (e.vert && e.vert !== 'horz')) continue;
      const ps = (e.paras || []).filter(p => clean(p.text) && !chromePara(p, e, si)).filter(p => { if (RE_NOTE.test(clean(p.text))) { noteLines.push(clean(p.text)); return false; } return true; });
      if (!ps.length) continue;
      if (ps.length === 1 && ((RE_CONNECT.test(clean(ps[0].text)) && (ps[0].size || 12) < 16) || RE_SYMBOL.test(clean(ps[0].text)))) continue;
      if (ps.length === 1 && RE_INDEX.test(clean(ps[0].text)) && (ps[0].size || 12) < 30 && e.w < 90) continue; // decorative numbering
      let cur = [], y = e.y;
      const lineH = p => (p.size || 12) * 1.25 * (isNumLike(p.text) ? 1 : Math.max(1, Math.ceil(PM.len(p.text) * (p.size || 12) * 0.5 / Math.max(40, e.w))));
      const flush = () => { if (cur.length) { const h = cur.reduce((a, p) => a + lineH(p), 0); segs.push({ x: e.x, y, w: e.w, h, paras: cur, ph: e.ph, el: e }); y += h; cur = []; } };
      ps.forEach((p, i) => {
        const prev = ps[i - 1];
        const roleBreak = prev && (Math.abs((p.size || 12) - (prev.size || 12)) >= Math.max(3, (prev.size || 12) * 0.25) || (headerLike(prev) && !headerLike(p) && wc(p.text) > 6) || (!headerLike(prev) && headerLike(p) && wc(prev.text) > 6)) && (wc(prev.text) <= 14 || wc(p.text) <= 14);
        if (roleBreak) flush();
        cur.push(p);
      });
      flush();
    }
    const segSize = g => Math.max(...g.paras.map(p => p.size || 12));
    const segText = g => g.paras.map(paraText).join('\n');
    const spec = { kind: 'content', title: '', sub: '', eyebrow: '', blocks: [], imgs: [], notes: [s.notes || '', ...noteLines].filter(Boolean).join('\n'), src: s.index };
    for (const p of pics.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 4)) {
      const m = parsed.media[p.media]; if (!m) continue;
      const ext = m.ext === 'jpg' ? 'jpeg' : m.ext;
      if (!/^(png|jpeg|gif|webp)$/.test(ext)) continue;
      if (ext === 'png' && decorative(m.bytes)) continue; // transparent line art / patterns, not photos
      const id = 'p' + (++ai);
      assets[id] = { kind: 'image', bytes: m.bytes, ext, size: imgSizeOf(m.bytes) };
      spec.imgs.push(id);
    }
    // giant lone digits (section numbers) carry nothing
    let rest = segs.filter(g => !(/^\d{1,2}$/.test(segText(g)) && segSize(g) >= 48));
    const letters = t => (String(t).match(/[\p{L}]/gu) || []).length;
    const titleOk = g => letters(segText(g)) >= 2 && !isNumLike(segText(g)) && !RE_INDEX.test(segText(g)) && wc(segText(g)) <= 16;
    const othersMed = g => median(rest.filter(o => o !== g).map(segSize)) || 0;
    let title = rest.find(g => (g.ph === 'title' || g.ph === 'ctrTitle') && titleOk(g));
    if (!title) {
      const cand = rest.filter(g => titleOk(g) && g.y < 250).sort((a, b) => segSize(b) - segSize(a) || a.y - b.y);
      if (cand[0] && segSize(cand[0]) >= Math.max(15, othersMed(cand[0]) * 1.15) && !(cand[1] && segSize(cand[1]) === segSize(cand[0]) && Math.abs(cand[1].y - cand[0].y) > 30 && wc(segText(cand[1])) <= 6)) title = cand[0];
      else {
        const any = rest.filter(titleOk).sort((a, b) => segSize(b) - segSize(a));
        if (any[0] && segSize(any[0]) >= Math.max(18, othersMed(any[0]) * 1.2) && !(any[1] && segSize(any[1]) === segSize(any[0]))) title = any[0];
      }
    }
    if (title) {
      rest = rest.filter(g => g !== title);
      spec.title = segText(title).replace(/\n+/g, ' ');
      const eb = rest.filter(g => g.y <= title.y + 4 && title.y - (g.y + g.h) < 46 && segSize(g) < segSize(title) * 0.7 && wc(segText(g)) <= 8 && xOverlap(g, title) > 0.1).sort((a, b) => b.y - a.y)[0];
      if (eb) { spec.eyebrow = segText(eb).replace(/\n/g, ' '); rest = rest.filter(g => g !== eb); }
      const sb = rest.find(g => g.y >= title.y + title.h - 8 && g.y - (title.y + title.h) < 56 && segSize(g) < segSize(title) * 0.85 && segSize(g) >= Math.min(13, segSize(title) * 0.4) && wc(segText(g)) <= 26 && g.paras.length === 1 && xOverlap(g, title) > 0.3 && !headerLike(g.paras[0]) && !rest.some(o => o !== g && o.paras.length >= 1 && Math.abs(segSize(o) - segSize(g)) < 0.6 && !!o.paras[0].bold === !!g.paras[0].bold && Math.abs(o.w - g.w) < g.w * 0.2 && (Math.abs(o.x - g.x) < 10 || Math.abs(o.y - g.y) < 10)));
      if (sb && rest.length > 1) { spec.sub = segText(sb).replace(/\n/g, ' '); rest = rest.filter(g => g !== sb); }
    }
    const allWords = rest.reduce((a, g) => a + wc(segText(g)), 0);
    const tl = norm(spec.title);
    if (si === 0) {
      spec.kind = 'cover';
      const others = rest.slice().sort((a, b) => segSize(b) - segSize(a));
      if (!spec.title && others[0]) spec.title = segText(others.shift()).replace(/\n/g, ' ');
      if (!spec.sub) { const sb = others.filter(g => wc(segText(g)) <= 30).sort((a, b) => segSize(b) - segSize(a))[0]; if (sb) spec.sub = segText(sb).replace(/\n/g, ' '); }
      if (spec.eyebrow && !spec.sub) { spec.sub = spec.eyebrow; spec.eyebrow = ''; }
      specs.push(spec); continue;
    }
    const allT = norm([spec.title, ...rest.map(segText)].join(' '));
    if (si === S.length - 1 && (RE_THANKS.test(spec.title.trim()) || /thank you|شكر|questions|أسئلة/.test(allT)) && allWords < 40) {
      spec.kind = 'closing'; if (!spec.title) spec.title = isAr(allT) ? 'شكراً لكم' : 'Thank you';
      if (!spec.sub) { const sb = rest.find(g => wc(segText(g)) <= 20 && !RE_THANKS.test(norm(segText(g)))); if (sb) spec.sub = segText(sb).replace(/\n/g, ' '); }
      specs.push(spec); continue;
    }
    if (RE_AGENDA.test(spec.title.trim())) {
      spec.kind = 'agenda';
      spec.items = rest.flatMap(g => g.paras.map(paraText)).filter(t => t && !/^\d{1,2}$/.test(t)).map(t => ({ title: t.replace(/^\d{1,2}[.)\-\s]+/, '') }));
      specs.push(spec); continue;
    }
    const hasData = s.els.some(e => e.type === 'table' || e.type === 'chart');
    // "CHAPTER 02 · Our Airport Today" style openers are dividers, whatever decoration they carry
    const chapLab = rest.filter(g => RE_CHAPTER.test(segText(g).replace(/\n/g, ' ').trim()) || (g.paras.length > 1 && RE_CHAPTER.test(paraText(g.paras[0]))));
    if (spec.title && !hasData && (RE_CHAPTER.test(spec.eyebrow.trim()) || chapLab.length)) {
      const seen = new Set([norm(spec.title)]);
      const lines = rest.flatMap(g => g.paras.map(paraText)).filter(t => t && !RE_CHAPTER.test(t) && !/^[\d٠-٩]{1,2}$/.test(t)).filter(t => { const k = norm(t); if (seen.has(k)) return false; seen.add(k); return true; });
      if (lines.reduce((a, t) => a + wc(t), 0) <= 40) {
        spec.kind = 'divider';
        if (!spec.eyebrow || RE_CHAPTER.test(spec.eyebrow.trim())) spec.eyebrow = '';
        if (!spec.sub && lines.length) spec.sub = lines.sort((a, b) => wc(b) - wc(a))[0];
        specs.push(spec); continue;
      }
    }
    if (spec.title && allWords <= 14 && !hasData && rest.length <= 4) {
      let lines = rest.flatMap(g => g.paras.map(paraText)).filter(Boolean);
      const lab = rest.flatMap(g => g.paras).find(p => headerLike(p) && wc(p.text) <= 3);
      if (lab && lines.length === 2) { if (!spec.eyebrow) spec.eyebrow = clean(lab.text); lines = lines.filter(l => l !== clean(lab.text)); }
      if (lines.length >= 2) { /* real content: analysed below */ }
      else if (!pics.length || pics.every(p => p.w * p.h > 960 * 540 * 0.45)) { spec.kind = 'divider'; if (lines[0] && !spec.sub) spec.sub = lines[0]; specs.push(spec); continue; }
      else if (lines[0]) spec.blocks.push({ k: 'para', text: lines[0] });
    }
    spec.stepsHint = RE_STEPS_TITLE.test(tl + ' ' + norm(spec.eyebrow));
    for (const e of s.els) {
      if (e.type === 'table' && e.rows && e.rows.length) {
        const rows = e.rows.map(r => r.map(c => clean(c)));
        const ch = chartFromRows(rows);
        spec.blocks.push(ch ? { k: 'table', rows, chartable: ch } : { k: 'table', rows });
      }
      if (e.type === 'chart' && parsed.zip) { const ch = await readChartPart(parsed.zip, e.part); if (ch) spec.blocks.push({ k: 'chart', chart: ch }); }
    }
    if (spec.blocks.length && rest.length === 0) { specs.push(spec); continue; }

    /* units: segments inside the same card belong together; a column header pulls in what sits under it */
    const units = [];
    const used = new Set();
    const cont = shapes.filter(c => !(title && inside(title, c)) && rest.some(g => inside(g, c))).sort((a, b) => a.w * a.h - b.w * b.h);
    for (const c of cont) {
      const ins = rest.filter(g => !used.has(g) && inside(g, c));
      if (!ins.length) continue;
      const innerShapes = shapes.filter(o => o !== c && inside(o, c, 0) && o.w * o.h < c.w * c.h * 0.7);
      if (innerShapes.length >= 2) continue;
      ins.forEach(g => used.add(g));
      ins.sort((a, b) => a.y - b.y || a.x - b.x);
      units.push({ x: c.x, y: c.y, w: c.w, h: c.h, segs: ins, boxed: true });
    }
    const loose = rest.filter(g => !used.has(g)).sort((a, b) => a.y - b.y || a.x - b.x);
    for (const g of loose) {
      const rowSibs = loose.filter(o => o !== g && Math.abs(o.y - g.y) < 14 && Math.abs(o.w - g.w) < Math.max(o.w, g.w) * 0.35).length;
      const prev = units.filter(u => !u.boxed && xOverlap(u, g) > 0.55 && (g.y - (u.y + u.h) > -16 || (u.segs.length === 1 && isNumLike(segText(u.segs[0])) && g.y > u.y + segSize(u.segs[0]) * 0.8)) && !(isNumLike(segText(g)) && u.segs.some(x => isNumLike(segText(x)))) && Math.abs(u.x - g.x) < Math.max(30, u.w * 0.3))
        .filter(u => { const last = u.segs[u.segs.length - 1]; const gap = g.y - (u.y + u.h); const head = u.segs.length === 1 && headerLike(last.paras[0]) && last.paras.length === 1; return gap < (head ? 96 : Math.max(18, segSize(g) * 2 + 4)) && !(g.paras.length === 1 && headerLike(g.paras[0]) && u.segs.length > 0 && !head && !(u.segs.length === 1 && isNumLike(segText(last)))) && !/[:：]$/.test(segText(last)); })
        .filter(u => !(rowSibs >= 1 && g.w < u.w * 0.75))
        .sort((a, b) => (b.y + b.h) - (a.y + a.h))[0];
      const longPair = prev && wc(segText(prev.segs[prev.segs.length - 1])) > 30 && wc(segText(g)) > 30;
      if (prev && !longPair) { prev.segs.push(g); const y2 = Math.max(prev.y + prev.h, g.y + g.h), x2 = Math.max(prev.x + prev.w, g.x + g.w); prev.x = Math.min(prev.x, g.x); prev.w = x2 - prev.x; prev.h = y2 - prev.y; }
      else units.push({ x: g.x, y: g.y, w: g.w, h: g.h, segs: [g] });
    }
    /* a row of short labels / figures sitting over a row of columns (years over milestones, figures over captions)
       belongs to those columns: zip them column by column */
    {
      const short = u => !u.boxed && u.segs.length === 1 && u.segs[0].paras.length === 1 && (wc(segText(u.segs[0])) <= 4 || isNumLike(segText(u.segs[0])));
      const rows = [];
      units.filter(short).forEach(u => { const r = rows.find(r => Math.abs(r[0].y - u.y) < 12); if (r) r.push(u); else rows.push([u]); });
      for (const r of rows) {
        if (r.length < 2) continue;
        const pairs = r.map(u => units.filter(v => v !== u && !r.includes(v) && !v.boxed && v.y >= u.y + u.h - 6 && v.y - (u.y + u.h) < 130 && Math.abs(v.x - u.x) < 24 && Math.abs(v.w - u.w) < Math.max(u.w, v.w) * 0.45).sort((a, b) => a.y - b.y)[0]);
        const ok = pairs.filter(Boolean);
        if (ok.length < Math.max(2, r.length - (r.length >= 4 ? 1 : 0)) || new Set(ok).size !== ok.length) continue;
        const gaps = r.map((u, i) => pairs[i] ? pairs[i].y - (u.y + u.h) : 0).filter((_, i) => pairs[i]);
        if (Math.max(...gaps) - Math.min(...gaps) > 30) continue;
        r.forEach((u, i) => {
          const v = pairs[i]; if (!v) return;
          v.segs = u.segs.concat(v.segs);
          const y2 = Math.max(u.y + u.h, v.y + v.h), x2 = Math.max(u.x + u.w, v.x + v.w);
          v.x = Math.min(u.x, v.x); v.y = Math.min(u.y, v.y); v.w = x2 - v.x; v.h = y2 - v.y;
          units.splice(units.indexOf(u), 1);
        });
      }
    }
    (PM._dbg = PM._dbg || {})[si] = units;
    units.forEach(u => { u.paras = u.segs.flatMap(g => g.paras); u.words = wc(u.paras.map(paraText).join(' ')); u.head = u.paras.length > 1 && headerLike(u.paras[0]); });
    const live = units.filter(u => u.paras.length);

    /* groups: units of similar shape side by side, or stacked in one column */
    const sig = u => (u.words <= 8 ? 's' : u.words <= 30 ? 'm' : 'l') + (u.paras.length > 2 ? 'p' : '');
    const groups = [], pool = live.slice();
    while (pool.length) {
      const u = pool.shift(); const g = [u];
      for (let i = 0; i < pool.length; i++) {
        const v = pool[i];
        const sameW = Math.abs(v.w - u.w) < Math.max(u.w, v.w) * 0.4;
        const ratio = Math.max(u.words, v.words) / Math.max(1, Math.min(u.words, v.words));
        const lead = t => /[:：]$/.test(paraText(t.paras[t.paras.length - 1]));
        const sameShape = !lead(u) && !lead(v) && (sig(u) === sig(v) || (Math.abs(u.paras.length - v.paras.length) <= 2 && u.head === v.head && ratio <= 3));
        const rowWith = g.some(x => Math.abs(x.y - v.y) < 30);
        const colWith = g.some(x => Math.abs(x.x - v.x) < 24 && Math.abs(v.y - x.y) - (v.y > x.y ? x.h : v.h) < 70 && !live.some(o => o !== x && o !== v && !g.includes(o) && o.y > Math.min(x.y, v.y) + 4 && o.y < Math.max(x.y, v.y) - 4 && xOverlap(o, v) > 0.1)) && sameW;
        if (!!u.boxed === !!v.boxed && sameShape && ((rowWith && sameW) || colWith)) { g.push(v); pool.splice(i, 1); i--; }
      }
      groups.push(g);
    }
    const rtl = parsed.lang !== 'en';
    const order = g => g.slice().sort((a, b) => (Math.abs(a.y - b.y) < 30 ? (rtl ? b.x - a.x : a.x - b.x) : a.y - b.y));
    groups.sort((a, b) => Math.min(...a.map(u => u.y)) - Math.min(...b.map(u => u.y)) || Math.min(...a.map(u => u.x)) - Math.min(...b.map(u => u.x)));
    const headerish = g => g.length >= 3 && g.every(u => u.words <= 3 && u.paras.length === 1 && /\d/.test(paraText(u.paras[0])));
    const real = groups.filter(g => g.length >= 2 && !headerish(g));
    const ctx = { stepsHint: spec.stepsHint, lang: parsed.lang };
    const blocks = [];
    for (const g of groups) {
      if (g.length >= 2) {
        if (headerish(g) && real.length) continue;
        const items = order(g).map(u => unitToItem(u.paras)).filter(Boolean);
        let gHead = '';
        const cap = t => /[A-Z]{2}/.test(t) && t === t.toUpperCase();
        if (items.length >= 3) { const f = items[0], ft = f.title || f.text || ''; if (!f.value && !f.bullets && cap(ft) && !(f.title && f.text) && items.slice(1).every(i => !cap(i.title || i.text || ''))) { gHead = ft; items.shift(); } }
        if (items.length >= 2) {
          // a list of bare labels (icon lists) reads as titled items
          if (items.every(i => !i.title && !i.value && !i.index && i.text && wc(i.text) <= 9 && !i.bullets)) items.forEach(i => { i.title = i.text; i.text = ''; });
          const b = classifyGroup(items, ctx); if (gHead) b.head = gHead; b.y = Math.min(...g.map(u => u.y)); b.x = Math.min(...g.map(u => u.x)); blocks.push(b); continue;
        }
      }
      const u = g[0];
      { const it = u.paras.length >= 2 && u.paras.length <= 3 ? unitToItem(u.paras) : null;
        if (it && !it.value && it.index && /^\d+$/.test(PM.digits(it.index)) && (u.paras[0].size || 12) >= 28) { it.value = it.index; delete it.index; }
        if (it && it.value && !it.bullets && !/^(19|20)\d\d$/.test(PM.digits(it.value).trim()) && wc([it.title, it.text].filter(Boolean).join(' ')) <= 14 && (it.title || it.text)) { blocks.push({ k: 'kpis', items: [{ value: it.value, label: it.title || it.text, text: it.title ? it.text || '' : '' }], y: u.y, x: u.x, w: u.w }); continue; } }
      const tb = textBlocks(u.paras);
      if (tb.length === 1 && tb[0].k === 'items') { const b = classifyGroup(tb[0].items, ctx); b.y = u.y; b.x = u.x; blocks.push(b); continue; }
      if (tb.length === 1 && tb[0].k === 'quote') { tb[0].y = u.y; tb[0].x = u.x; blocks.push(tb[0]); continue; }
      if (u.head && u.paras.length >= 2) {
        // header + content in one column → a titled item (merged with sibling columns below)
        const it = unitToItem(u.paras);
        blocks.push({ k: '_col', item: it, y: u.y, x: u.x, w: u.w });
        continue;
      }
      if (u.paras.length === 1 && headerLike(u.paras[0])) { blocks.push({ k: '_hdr', text: paraText(u.paras[0]), y: u.y, x: u.x, w: u.w }); continue; }
      tb.forEach(b => { b.y = u.y; b.x = u.x; b.w = u.w; blocks.push(b); });
    }
    // sibling header-columns side by side → items
    const cols = blocks.filter(b => b.k === '_col');
    if (cols.length >= 2) {
      const it = order(cols.map(c => ({ x: c.x, y: c.y, item: c.item }))).map(c => c.item);
      const first = blocks.indexOf(cols[0]);
      blocks.splice(first, 0, { k: 'items', items: it.map(i => ({ title: i.title || '', text: i.text || '', bullets: i.bullets, value: i.value })), columns: true, y: cols[0].y });
    } else if (cols.length === 1) {
      const c = cols[0]; const i = c.item;
      const sub = [];
      if (i.text && !i.bullets) { const tb = textBlocks([{ text: i.text }]); tb[0].head = i.title; sub.push(...tb); }
      else if (i.text) sub.push({ k: 'para', text: i.text, head: i.title });
      if (i.bullets) sub.push({ k: 'bullets', items: i.bullets, head: i.text ? '' : i.title });
      sub.forEach(b => { b.y = c.y; b.x = c.x; });
      blocks.splice(blocks.indexOf(c), 0, ...sub);
    }
    // a lone header line labels the block right under it
    for (const h of blocks.filter(b => b.k === '_hdr')) {
      const below = blocks.filter(b => b !== h && b.k !== '_hdr' && b.k !== '_col' && b.y > h.y && b.y - h.y < 140 && !b.head && (b.x + (b.w || 300) > h.x - 10) && b.x < h.x + (h.w || 300)).sort((a, b) => a.y - b.y)[0];
      if (below) below.head = h.text; else blocks.push({ k: 'para', text: h.text, y: h.y, x: h.x });
    }
    const AXIS = /^((19|20)\d\d|now|today|الآن|اليوم|q[1-4]|h[12])$/i;
    const axisOnly = b => b.items && b.items.length >= 2 && b.items.every(it => { const parts = (typeof it === 'string' ? [it] : [it.value, it.date, it.title, it.label, it.text]).filter(Boolean).map(t => clean(t)); return parts.length && parts.every(t => t.split(/\n/).every(x => AXIS.test(x.trim()))); });
    let bl = blocks.filter(b => b.k !== '_col' && b.k !== '_hdr' && (KEEP || (!axisOnly(b) && !(b.k === 'para' && clean(b.text).split(/\n/).every(x => AXIS.test(x.trim()))))));
    // the same list twice (a list and its diagram) → keep the richer one
    bl = bl.filter((b, i) => {
      if (!b.items) return true;
      const key = x => b.items.map(it => norm(typeof it === 'string' ? it : it.title || it.label || '')).join('|');
      const k1 = key();
      return !bl.some((o, j) => o !== b && o.items && o.items.length === b.items.length && o.items.map(it => norm(typeof it === 'string' ? it : it.title || it.label || '')).join('|') === k1 && (b.k === 'bullets' || j < i) && !(o.k === 'bullets' && b.k !== 'bullets'));
    });
    // header strips (DAY 1 · WEEK 2 …) and progress labels that only repeat another list are dropped
    bl = bl.filter((b, i) => {
      if (!b.items || b.items.length < 3) return true;
      const labs = b.items.map(it => norm(typeof it === 'string' ? it : it.title || it.label || it.text || ''));
      if (b.k === 'timeline' && b.items.every(it => !it.text && wc(it.title) <= 3) && bl.length > 1) return false;
      const others = bl.filter(o => o !== b && o.items).flatMap(o => o.items.map(it => norm(typeof it === 'string' ? it : it.title || it.label || '')));
      const hit = labs.filter(l => l && others.some(o => o && (o.startsWith(l) || l.startsWith(o)))).length;
      return !(hit >= Math.ceil(labs.length * 0.6) && labs.every(l => wc(l) <= 5) && bl.indexOf(b) > bl.findIndex(o => o.items && o !== b));
    });
    bl.sort((a, b) => (Math.abs(a.y - b.y) < 30 ? (rtl ? b.x - a.x : a.x - b.x) : a.y - b.y));
    // figures repeated as chart labels ("31.6" over a drawn bar) are already in a KPI
    const figs = new Set(bl.filter(b => b.k === 'kpis').flatMap(b => b.items.map(it => norm(it.value))).filter(Boolean));
    if (!KEEP) bl = bl.filter(b => !(b.k === 'para' && figs.has(norm(b.text))));
    bl.forEach(b => {
      if (b.k === 'para' && b.text.includes('\n')) { const ls = b.text.split('\n'); if (figs.has(norm(ls[0]))) b.text = ls.slice(1).join('\n'); }
      if (b.k === 'bullets' && b.items.length > 2 && figs.has(norm(b.items[0]))) b.items.shift();
    });
    // rows of the same KPI grid → one block
    for (let i = bl.length - 1; i > 0; i--) {
      const a = bl[i - 1], b = bl[i];
      if (a.k === 'kpis' && b.k === 'kpis' && !b.head && a.items.length === b.items.length && a.items.length + b.items.length <= 8 && a.items.every(it => !it.text) === b.items.every(it => !it.text)) { a.items = a.items.concat(b.items); bl.splice(i, 1); }
    }
    bl.forEach(b => { delete b.y; delete b.x; });
    for (let i = 0; i < bl.length; i++) {
      const b = bl[i];
      if (b.k === 'para' && !b.head) { const ls = b.text.split('\n'); if (ls.length === 2 && isNumLike(ls[0]) && !/^(19|20)\d\d$/.test(PM.digits(ls[0]).trim()) && wc(ls[1]) <= 12) { bl[i] = { k: 'kpis', items: [{ value: ls[0], label: ls[1], text: '' }] }; continue; } }
      if ((b.k === 'bullets' || b.k === 'para') && !b.head) { const ls = b.k === 'bullets' ? b.items : b.text.split('\n'); if (ls.length >= 3 && /[A-Z]{2}/.test(ls[0]) && ls[0] === ls[0].toUpperCase() && wc(ls[0]) <= 6 && !ls.slice(1).some(x => x === x.toUpperCase() && /[A-Z]{2}/.test(x))) { b.head = ls[0]; if (b.k === 'bullets') b.items = ls.slice(1); else b.text = ls.slice(1).join('\n'); } }
      if (b.k === 'bullets' && spec.stepsHint && b.items.length >= 3 && b.items.length <= 7 && b.items.every(t => wc(t) <= 14)) bl[i] = { k: 'steps', items: b.items.map(t => { const m = t.match(RE_LABEL); return m ? { title: m[1], text: m[2] } : { title: t, text: '' }; }), head: b.head };
    }
    const keyOf = o => o.items.map(it => norm(typeof it === 'string' ? it : it.title || it.label || '')).join('|');
    bl = bl.filter((b, i) => !(b.items && bl.some((o, j) => j < i && o.items && keyOf(o) === keyOf(b))));
    {
      const capsT = t => /[A-Z]{2}/.test(t) && t === t.toUpperCase() && wc(t) <= 6;
      const flat = bl.flatMap(b => b.k === 'para' ? b.text.split('\n') : b.k === 'bullets' ? b.items : b.k === 'items' && b.items.every(it => !it.text && !it.bullets && !it.value) ? b.items.map(it => it.title) : [null]);
      if (bl.length && flat.length >= 2 && flat.every(t => t && capsT(t))) bl = [{ k: 'items', items: flat.map(t => ({ title: tc(t), text: '' })) }];
    }
    spec.blocks.push(...mergeBlocks(bl, spec));
    spec.blocks = spec.blocks.map(b => { if (b.k !== 'para' || b.head) return b; const ls = b.text.split('\n'); return ls.length === 2 && isNumLike(ls[0]) && !/^(19|20)\d\d$/.test(PM.digits(ls[0]).trim()) && wc(ls[1]) <= 12 ? { k: 'kpis', items: [{ value: ls[0], label: ls[1], text: '' }] } : b; });
    if (!spec.title) {
      const b0 = spec.blocks[0];
      if (b0 && b0.head) { spec.title = tc(b0.head); delete b0.head; }
      else if (b0 && b0.k === 'para' && wc(b0.text) <= 10) { spec.title = b0.text; spec.blocks.shift(); }
      else if (b0 && b0.k === 'para' && b0.text.includes('\n') && wc(b0.text.split('\n')[0]) <= 6) { spec.title = b0.text.split('\n')[0]; b0.text = b0.text.split('\n').slice(1).join('\n'); }
    }
    // nothing from the source may silently disappear: lines the structure did not place are added back
    {
      const have = norm([spec.title, spec.sub, spec.eyebrow, PM.specText ? PM.specText(spec) : JSON.stringify(spec.blocks)].join(' '));
      const lost = [];
      for (const g of segs) for (const p of g.paras) {
        const t = paraText(p); if (!t) continue;
        const k = norm(t); if (!k || have.includes(k)) continue;
        if (!KEEP && (wc(t) < 3 || isNumLike(t) || /^((19|20)\d\d|now|today)$/i.test(t.trim()))) continue;
        if (lost.some(x => norm(x) === k)) continue;
        lost.push(t);
      }
      if (lost.length) spec.blocks.push(lost.length > 1 ? { k: 'bullets', items: lost } : { k: 'para', text: lost[0] });
    }
    specs.push(spec);
  }
  specs.forEach(s => { if (s.kind === 'content' && !s.blocks.length && !s.imgs.length) s.kind = s.title ? 'divider' : 'skip'; });
  return { lang: parsed.lang, specs: specs.filter(s => s.kind !== 'skip'), assets };
}
function titleCase(t) { return /[a-z]/.test(t) || isAr(t) ? t : t.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()); }
function headerLike(p) {
  if (!p) return false;
  const t = clean(p.text);
  if (!t || wc(t) > 6 || /[.،؛:]$/.test(t)) return false;
  const caps = /[A-Z]/.test(t) && t === t.toUpperCase() && /[A-Z]{2}/.test(t);
  const small = (p.size || 12) <= 15;
  return (caps && (p.size || 12) <= 20) || (!!p.bold && wc(t) <= 5 && small) || (!!p.color && /^(62B6F3|004EAA|00B2BA|1E63D6)$/i.test(p.color) && wc(t) <= 5 && small);
}

/* tidy neighbouring blocks: lead paragraph + list, compare pairs, a para that only repeats the title */
function mergeBlocks(blocks, spec) {
  const out = [];
  for (const b of blocks) {
    if (b.k === 'para' && norm(b.text) === norm(spec.title)) continue;
    const prev = out[out.length - 1];
    if (prev && prev.k === 'bullets' && b.k === 'bullets') { prev.items.push(...b.items); continue; }
    if (prev && prev.k === 'para' && b.k === 'para' && wc(prev.text) + wc(b.text) < 120) { prev.text += '\n' + b.text; continue; }
    out.push(b);
  }
  // compare: exactly two item cards whose titles read as opposites
  const it = out.find(b => b.k === 'items' && b.items.length === 2 && b.items.every(i => i.title && ((i.bullets || []).length >= 2 || wc(i.text) > 8)));
  if (it && (RE_COMPARE.test(it.items.map(i => i.title).join(' ')) || RE_COMPARE.test(spec.title))) {
    const i = out.indexOf(it);
    out[i] = { k: 'compare', a: { title: it.items[0].title, items: it.items[0].bullets || [it.items[0].text] }, b: { title: it.items[1].title, items: it.items[1].bullets || [it.items[1].text] } };
  }
  return out;
}

/* a transparent PNG that is light for its size is decoration (patterns, line art), not a photo */
function decorative(b) {
  try {
    if (!(b[0] === 0x89 && b[1] === 0x50)) return false;
    const colorType = b[25];
    const sz = imgSizeOf(b);
    const px = sz.w * sz.h;
    if (colorType === 6 || colorType === 4) return b.length < Math.max(160000, px * 0.35);
    return false;
  } catch (e) { return false; }
}
function imgSizeOf(b) {
  try {
    if (b[0] === 0x89 && b[1] === 0x50) return { w: (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, h: (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0 };
    if (b[0] === 0xFF && b[1] === 0xD8) { let i = 2; while (i < b.length) { if (b[i] !== 0xFF) { i++; continue; } const m = b[i + 1]; if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: b[i + 5] << 8 | b[i + 6], w: b[i + 7] << 8 | b[i + 8] }; i += 2 + (b[i + 2] << 8 | b[i + 3]); } }
    if (b[0] === 0x47 && b[1] === 0x49) return { w: b[6] | b[7] << 8, h: b[8] | b[9] << 8 };
    if (b[8] === 0x57 && b[9] === 0x45) return { w: 1600, h: 1000 };
  } catch (e) { }
  return { w: 1600, h: 1000 };
}
PM.imgSizeOf = imgSizeOf;

/* ======================================================================
   Word → specs
   blocks: {k:'h',lvl,t} {k:'p',t,bold,size} {k:'li',t,lvl,num} {k:'table',rows} {k:'img',id}
   ====================================================================== */
function analyzeDocx(doc) {
  const B = doc.blocks.map(b => Object.assign({}, b, { t: clean(b.t) })).filter(b => b.k === 'img' || b.k === 'table' || b.t);
  const lang = doc.lang === 'bi' ? 'ar' : doc.lang;
  const specs = [];
  // headings: Word heading styles, or short bold paragraphs used as headings
  const sizes = B.filter(b => b.k === 'p' && b.size).map(b => b.size);
  const bodySize = median(sizes) || 11;
  B.forEach(b => { if (b.k === 'p' && b.t && wc(b.t) <= 12 && !/[.،:؛]$/.test(b.t) && (b.bold || (b.size && b.size >= bodySize * 1.25))) { b.k = 'h'; b.lvl = b.size >= bodySize * 1.6 ? 1 : 2; b.soft = true; } });
  let i = 0;
  // cover: Title style or the first heading
  const cover = { kind: 'cover', title: '', sub: '', blocks: [], imgs: [] };
  const t0 = B.findIndex(b => b.k === 'h' && b.lvl === 0) >= 0 ? B.findIndex(b => b.k === 'h' && b.lvl === 0) : B.findIndex(b => b.k === 'h');
  if (t0 >= 0 && t0 < 3) {
    cover.title = B[t0].t; i = t0 + 1;
    if (B[i] && (B[i].k === 'h' && B[i].lvl === -1 || (B[i].k === 'p' && wc(B[i].t) <= 18))) { cover.sub = B[i].t; i++; }
  } else cover.title = B[0] && B[0].t ? B[0].t.slice(0, 80) : (lang === 'en' ? 'Presentation' : 'عرض تقديمي');
  specs.push(cover);
  const levels = B.filter(b => b.k === 'h' && b.lvl > 0).map(b => b.lvl);
  const top = levels.length ? Math.min(...levels) : 1;
  const hasSub = levels.some(l => l > top);
  let cur = null, sectionTitle = '';
  const flush = () => { if (cur) { emit(cur); cur = null; } };
  function emit(sec) {
    const blocks = docBlocks(sec.body);
    if (!blocks.length && !sec.imgs.length) { if (sec.title) specs.push({ kind: 'divider', title: sec.title, sub: '', blocks: [], imgs: [] }); return; }
    const hint = RE_STEPS_TITLE.test(sec.title);
    if (hint) blocks.forEach((b, k) => { if (b.k === 'bullets' && b.items.length >= 3 && b.items.length <= 7 && b.items.every(t => wc(t) <= 16)) blocks[k] = { k: 'steps', items: b.items.map(t => { const m = t.match(RE_LABEL); return m ? { title: m[1], text: m[2] } : { title: t, text: '' }; }), head: b.head }; });
    for (const part of splitDense(blocks)) specs.push({ kind: 'content', title: sec.title, sub: '', eyebrow: sec.eyebrow || '', blocks: part, imgs: specs.filter(s => s.kind === 'content' && s.title === sec.title).length ? [] : sec.imgs.slice(0, 2), stepsHint: hint });
  }
  for (; i < B.length; i++) {
    const b = B[i];
    if (b.k === 'h' && b.lvl > 0) {
      if (RE_AGENDA.test(b.t)) { flush(); const items = []; while (B[i + 1] && B[i + 1].k !== 'h') { i++; if (B[i].t) items.push({ title: B[i].t }); } specs.push({ kind: 'agenda', title: b.t, items }); continue; }
      if (hasSub && b.lvl === top) {
        // look ahead: does this section have its own sub-headings?
        let j = i + 1, kids = false;
        for (; j < B.length; j++) { if (B[j].k === 'h' && B[j].lvl > 0 && B[j].lvl <= top) break; if (B[j].k === 'h' && B[j].lvl > top) { kids = true; break; } }
        flush();
        if (kids) { sectionTitle = b.t; specs.push({ kind: 'divider', title: b.t, sub: '', blocks: [], imgs: [] }); }
        else { sectionTitle = ''; cur = { title: b.t, eyebrow: '', body: [], imgs: [] }; }
        continue;
      }
      flush(); cur = { title: b.t, eyebrow: hasSub ? sectionTitle : '', body: [], imgs: [] }; continue;
    }
    if (!cur) cur = { title: sectionTitle || cover.title, body: [], imgs: [] };
    if (b.k === 'img') cur.imgs.push(b.id); else cur.body.push(b);
  }
  flush();
  // a divider immediately followed by a divider (empty section) is dropped
  const out = specs.filter((s, k) => !(s.kind === 'divider' && specs[k + 1] && specs[k + 1].kind === 'divider'));
  if (out[out.length - 1] && out[out.length - 1].kind !== 'closing') out.push({ kind: 'closing', title: lang === 'en' ? 'Thank you' : 'شكراً لكم', sub: '', blocks: [], imgs: [] });
  return { lang, specs: out, assets: doc.assets || {} };
}
function docBlocks(body) {
  const out = [];
  let k = 0;
  while (k < body.length) {
    const b = body[k];
    if (b.k === 'li') {
      const lis = []; while (body[k] && body[k].k === 'li') lis.push(body[k++]);
      const tops = lis.filter(l => (l.lvl || 0) === 0);
      // nested lists → items with bullets
      if (tops.length >= 2 && tops.length < lis.length) {
        const items = []; for (const l of lis) { if ((l.lvl || 0) === 0) items.push({ title: l.t, text: '', bullets: [] }); else if (items.length) items[items.length - 1].bullets.push(l.t); }
        items.forEach(it => { if (it.bullets.length === 1) { it.text = it.bullets[0]; it.bullets = []; } if (!it.bullets.length) delete it.bullets; });
        out.push({ k: 'items', items });
        continue;
      }
      out.push(...textBlocks(lis.map(l => ({ text: l.t, bullet: 'dot', lvl: l.lvl }))));
      continue;
    }
    if (b.k === 'table') { const ch = chartFromRows(b.rows); out.push(ch ? { k: 'table', rows: b.rows, chartable: ch } : { k: 'table', rows: b.rows }); k++; continue; }
    if (b.k === 'p') {
      const ps = []; while (body[k] && body[k].k === 'p') ps.push(body[k++]);
      // short number lines → KPIs
      const nums = ps.map(p => { const m = p.t.match(/^([+\-~]?\s*[\d٠-٩][\d٠-٩.,٫٬]*\s*(?:%|٪|K|M|B|مليون|مليار|ألف|\+)?)\s+(.{2,60})$/); return m && PM.numInfo(m[1]) ? { value: m[1].trim(), label: m[2].trim() } : null; });
      if (ps.length >= 2 && nums.every(Boolean)) { out.push({ k: 'kpis', items: nums }); continue; }
      out.push(...textBlocks(ps.map(p => ({ text: p.t, bold: p.bold }))));
      continue;
    }
    k++;
  }
  // merge neighbours
  const m = [];
  for (const b of out) { const p = m[m.length - 1]; if (p && p.k === 'bullets' && b.k === 'bullets') p.items.push(...b.items); else if (p && p.k === 'para' && b.k === 'para' && wc(p.text) + wc(b.text) < 90) p.text += '\n' + b.text; else m.push(b); }
  return m;
}
/* too much for one slide → several slides, never cutting an item in half */
function splitDense(blocks) {
  const cap = { items: 6, kpis: 6, steps: 6, timeline: 6, bullets: 7, qa: 4 };
  const parts = [];
  let cur = [], weight = 0;
  const push = () => { if (cur.length) parts.push(cur); cur = []; weight = 0; };
  for (const b of blocks) {
    let pieces = [b];
    if (cap[b.k] && b.items.length > cap[b.k] + 1) {
      const n = Math.ceil(b.items.length / cap[b.k]); const per = Math.ceil(b.items.length / n);
      pieces = []; for (let i = 0; i < b.items.length; i += per) pieces.push(Object.assign({}, b, { items: b.items.slice(i, i + per) }));
    }
    if (b.k === 'para' && wc(b.text) > 130) {
      const sents = b.text.split(/(?<=[.!؟?。])\s+|\n/).filter(Boolean); pieces = []; let acc = '';
      for (const s of sents) { if (wc(acc + ' ' + s) > 95 && acc) { pieces.push({ k: 'para', text: acc.trim() }); acc = ''; } acc += ' ' + s; }
      if (acc.trim()) pieces.push({ k: 'para', text: acc.trim() });
    }
    if (b.k === 'table' && b.rows.length > 10) { pieces = []; const hd = b.rows[0]; for (let i = 1; i < b.rows.length; i += 8) pieces.push({ k: 'table', rows: [hd, ...b.rows.slice(i, i + 8)] }); }
    for (const p of pieces) {
      const w = blockWeight(p);
      if (cur.length && (weight + w > 1.05 || cur.length >= 2)) push();
      cur.push(p); weight += w;
    }
  }
  push();
  return parts;
}
function blockWeight(b) {
  if (b.k === 'para') return wc(b.text) / 110;
  if (b.k === 'bullets') return b.items.length / 7 + b.items.reduce((a, t) => a + wc(t), 0) / 140;
  if (b.k === 'table') return Math.min(1, b.rows.length / 9);
  if (b.k === 'chart') return 0.7;
  if (b.k === 'quote') return 0.6;
  if (b.k === 'compare') return 0.9;
  const items = b.items || [];
  return items.length / 6 + items.reduce((a, i) => a + wc([i.title, i.text, ...(i.bullets || [])].join(' ')), 0) / 160;
}
PM.blockWeight = blockWeight;

/* ======================================================================
   Copilot (optional): one copy → a short plan back → one paste
   ====================================================================== */
function copilotPrompt(specs, lang) {
  const ar = lang !== 'en';
  const lines = [];
  specs.forEach((s, i) => {
    const head = `S${i + 1} [${s.kind}] ${s.title || ''}`.slice(0, 120);
    lines.push(head);
    (s.blocks || []).forEach((b, j) => {
      const sample = b.k === 'para' ? b.text : b.k === 'table' ? b.rows.slice(0, 2).map(r => r.join(' | ')).join(' / ') : b.k === 'quote' ? b.text : b.k === 'compare' ? b.a.title + ' vs ' + b.b.title : (b.items || []).map(it => typeof it === 'string' ? it : [it.value, it.title || it.label, it.date].filter(Boolean).join(' ')).join(' · ');
      lines.push(`  B${i + 1}.${j + 1} (${b.k}${b.items ? ', ' + b.items.length : ''}): ${String(sample).replace(/\s+/g, ' ').slice(0, 140)}`);
    });
  });
  const body = lines.join('\n');
  const rules = ar
    ? `أنت مصمم عروض محترف. تحت ملخص عرض تقديمي مقسم شرائح (S) وكتل (B). لا تعيد كتابة المحتوى. ارجع فقط سطراً لكل شريحة بهذا الشكل بالضبط ولا شيء غيره:
S<رقم> | <نوع> | <عنوان قصير اختياري>
الأنواع المسموحة: cards, kpis, steps, timeline, bullets, statement, quote, compare, table, chart, photo, divider, skip
- اختر النوع الذي يوصل الفكرة بأوضح شكل.
- العنوان اختياري: اكتبه فقط إذا العنوان الحالي طويل أو غير واضح (أقل من 7 كلمات، بنفس لغة العرض).
- skip للشرائح المكررة أو الفارغة.`
    : `You are an expert presentation designer. Below is an outline of a deck split into slides (S) and blocks (B). Do not rewrite the content. Reply ONLY with one line per slide in exactly this format and nothing else:
S<number> | <type> | <optional short title>
Allowed types: cards, kpis, steps, timeline, bullets, statement, quote, compare, table, chart, photo, divider, skip
- Pick the type that communicates the idea most clearly.
- The title is optional: give one only when the current title is long or unclear (under 7 words, same language as the deck).
- Use skip for duplicated or empty slides.`;
  return rules + '\n\n' + body;
}
function applyCopilotPlan(specs, reply) {
  const map = { cards: 'items', kpis: 'kpis', steps: 'steps', timeline: 'timeline', bullets: 'bullets', statement: 'para', quote: 'quote', compare: 'compare', table: 'table', chart: 'chart', photo: 'photo' };
  let n = 0;
  for (const line of String(reply || '').split(/\n+/)) {
    const m = line.replace(/[*`]/g, '').match(/S\s*(\d+)\s*[|｜]\s*([a-z]+)\s*(?:[|｜]\s*(.*))?$/i);
    if (!m) continue;
    const s = specs[+m[1] - 1]; if (!s) continue;
    const type = m[2].toLowerCase(), title = (m[3] || '').trim();
    n++;
    if (type === 'skip') { s.skip = true; continue; }
    if (type === 'divider') { s.kind = 'divider'; if (title) s.title = title; continue; }
    if (title && title.length < 90) { s.title_orig = s.title; s.title = title; }
    if (map[type]) s.prefer = map[type];
  }
  return n;
}
PM.analyzePptx = analyzePptx;
PM.analyzeDocx = analyzeDocx;
PM.copilotPrompt = copilotPrompt;
PM.applyCopilotPlan = applyCopilotPlan;
PM.splitDense = splitDense;
PM.textBlocks = textBlocks;
PM.cleanText = clean;
})(window.PM);
