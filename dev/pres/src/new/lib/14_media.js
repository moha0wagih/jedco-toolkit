/* ==========================================================================
   Layout families · photo-led · table · chart
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Ic, G, tx } = PM;

/* ======================= PHOTO-LED ======================= */
const isPh = sp => sp.form === 'photo' || (sp.imgs.length && (!sp.main || PM.blockWeight(sp.main) < 0.35));
const phdef = (id, name, o) => PM.def('photo', id, name, Object.assign({ forms: ['photo'] }, o));
const shortBody = sp => sp.text || sp.lead || (sp.items || []).map(i => [i.title, i.text].filter(Boolean).join(' ')).join(' · ');
phdef('ph-full', 'صورة كاملة + عنوان', {
  tags: ['صورة', 'كاملة'], tones: ['dark'],
  accepts: sp => isPh(sp) && PM.words(shortBody(sp)) <= 40 ? 0.88 : 0,
  render(sp, c) {
    const o = [];
    PM.photoBlock(c, sp, o, 0, 0, W, H, { veil: 'up', a0: 10, a1: 92 });
    PM.chromeOnPhoto(c, o);
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { color: K.SKY, bind: 'eyebrow' }));
    if (sp.title) ps.push(tx.title(c, sp.title, { color: K.WHITE, bind: 'title', size: c.Z.title * 1.3 }));
    const body = shortBody(sp);
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { color: 'D5E1F0', bind: 'sub' }));
    if (body && !sp.sub) ps.push(tx.body(c, body, { color: 'D5E1F0', bind: sp.text ? 'text' : 'lead', sb: 10, size: c.Z.body * 1.15 }));
    o.push(T(G.X0, 250, 640, 240, ps, { va: 'b', name: 'Title', maxK: 1.1 }));
    return o;
  }
});
phdef('ph-half', 'نصف صورة + نص', {
  tags: ['صورة', 'نصف'],
  accepts: sp => isPh(sp) ? 0.84 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    PM.photoBlock(c, sp, o, W / 2, 0, W / 2, H, {});
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow' }));
    if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title', sa: 16 }));
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub' }));
    const body = shortBody(sp);
    if (body) ps.push(tx.body(c, body, { bind: sp.text ? 'text' : 'lead', size: c.Z.body * 1.15, sb: 12, lh: 1.55 }));
    o.push(T(G.X0, 80, W / 2 - G.X0 - 46, 400, ps, { va: 'm', name: 'Text', maxK: 1.15 }));
    return o;
  }
});
phdef('ph-two', 'صورتان + عنوان', {
  tags: ['صور'],
  accepts: sp => sp.imgs.length >= 2 && (!sp.main || PM.blockWeight(sp.main) < 0.5) ? 0.86 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 26;
    const gw = (G.CW - 16) / 2;
    PM.photoBlock(c, sp, o, G.X0, top, gw, G.BOT - top, { i: 0, r: 14 });
    PM.photoBlock(c, sp, o, G.X0 + gw + 16, top, gw, G.BOT - top, { i: 1, r: 14 });
    return o;
  }
});
phdef('ph-grid', 'شبكة صور', {
  tags: ['صور', 'شبكة'],
  accepts: sp => sp.imgs.length >= 3 && (!sp.main || PM.blockWeight(sp.main) < 0.5) ? 0.88 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 24;
    const n = Math.min(4, sp.imgs.length), g = 14;
    const bigW = (G.CW - g) * 0.56, smW = G.CW - g - bigW, h = G.BOT - top;
    PM.photoBlock(c, sp, o, G.X0, top, bigW, h, { i: 0, r: 14 });
    const rest = n - 1, sh = (h - g * (rest - 1)) / rest;
    for (let i = 0; i < rest; i++) PM.photoBlock(c, sp, o, G.X0 + bigW + g, top + i * (sh + g), smW, sh, { i: i + 1, r: 14 });
    return o;
  }
});
phdef('ph-strip', 'شريط صور', {
  tags: ['صور', 'شريط'],
  accepts: sp => isPh(sp) && PM.words(shortBody(sp)) <= 50 ? 0.76 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o, { noBar: true });
    const top = PM.head(c, sp, o, {}) + 20;
    const body = shortBody(sp);
    let y = top;
    if (body) { const b = PM.textAt(G.X0, top + 4, 640, 70, [tx.body(c, body, { bind: sp.text ? 'text' : 'lead', size: c.Z.body * 1.1 })], { name: 'Text' }); if (b) { o.push(b); y = b.y + b.h; } }
    const sy = Math.max(y + 26, 260);
    const n = Math.max(1, Math.min(3, sp.imgs.length || 3)), g = 6, w = (W - g * (n - 1)) / n;
    for (let i = 0; i < n; i++) PM.photoBlock(c, sp, o, i * (w + g), sy, w, H - sy, { i });
    return o;
  }
});

/* ======================= TABLE ======================= */
const isT = sp => sp.form === 'table' && sp.main && sp.main.rows && sp.main.rows.length >= 2;
const tdef = (id, name, o) => PM.def('table', id, name, Object.assign({ forms: ['table'] }, o));
function tableFs(rows, w, h, c) {
  const n = rows.length, cols = Math.max(...rows.map(r => r.length));
  const longest = Math.max(...rows.flat().map(t => PM.len(t)));
  let fs = Math.min(c.en ? 15 : 17, (h / n) * 0.42, (w / cols) / Math.max(6, Math.min(longest, 30)) * 1.9);
  return Math.max(8.5, fs);
}
function tableLayout(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const side = style === 'side';
    const top = PM.head(c, sp, o, { w: side ? G.CW - 300 : G.CW }) + 26;
    const rows = sp.main.rows;
    const w = side ? G.CW - 300 : G.CW;
    const rh = Math.min(48, (G.BOT - top) / rows.length);
    const h = rh * rows.length;
    const fs = tableFs(rows, w, h, c);
    o.push(PM.Table(G.X0, PM.place(top, G.BOT, h, 0.3), w, h, rows, { style: style === 'side' ? 'rule' : style, fs, dark: c.dark, bind: 'main.rows' }));
    if (side) {
      const ps = [];
      if (sp.lead) ps.push(tx.body(c, sp.lead, { bind: 'lead', size: c.Z.body * 1.1 }));
      if (!ps.length && sp.sub) ps.push(tx.body(c, sp.sub, { bind: 'sub' }));
      o.push(R(G.X1 - 270, top, 270, G.BOT - top, c.tone.cardFill, { r: 16 }));
      if (ps.length) o.push(T(G.X1 - 246, top + 24, 222, G.BOT - top - 48, ps, { va: 'm', name: 'Note' }));
    }
    return o;
  };
}
tdef('tbl-rule', 'جدول بخطوط', { accepts: sp => isT(sp) ? 0.86 : 0, render: tableLayout('rule'), tags: ['جدول'] });
tdef('tbl-fill', 'جدول برأس ملوّن', { accepts: sp => isT(sp) ? 0.82 : 0, render: tableLayout('fill'), tags: ['جدول'] });
tdef('tbl-zebra', 'جدول بصفوف متناوبة', { accepts: sp => isT(sp) && sp.main.rows.length >= 5 ? 0.82 : 0, render: tableLayout('zebra'), tags: ['جدول'] });
tdef('tbl-side', 'جدول + ملاحظة', { accepts: sp => isT(sp) && sp.lead && Math.max(...sp.main.rows.map(r => r.length)) <= 4 ? 0.84 : 0, render: tableLayout('side'), tags: ['جدول', 'ملاحظة'] });

/* ======================= CHART ======================= */
const chOf = sp => sp.main && (sp.main.k === 'chart' ? sp.main.chart : sp.main.chartable);
const isCh = sp => !!chOf(sp) && (sp.form === 'chart' || sp.form === 'table');
const chdef = (id, name, o) => PM.def('chart', id, name, Object.assign({ forms: ['chart', 'table'] }, o));
const chBind = sp => sp.main.k === 'chart' ? 'main.chart' : 'main.chartable';
function chartObj(c, sp, x, y, w, h, kind) {
  const ch = chOf(sp);
  return PM.Chart(x, y, w, h, Object.assign({}, ch, { kind: kind || ch.kind }), { dark: c.dark, rtl: c.rtl, fs: c.en ? 10.5 : 12, bind: chBind(sp) });
}
function chartFull(kind) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 26;
    o.push(chartObj(c, sp, G.X0, top, G.CW, G.BOT - top, kind));
    return o;
  };
}
const kindOk = (sp, k) => {
  const ch = chOf(sp); if (!ch) return 0;
  const n = ch.cats.length, s = ch.series.length;
  if (k === 'donut' || k === 'pie') return s === 1 && n >= 2 && n <= 7 ? 1 : 0;
  if (k === 'line' || k === 'area') return n >= 3 ? (PM.chartIsTime(ch.cats) ? 1.1 : 0.85) : 0;
  if (k === 'bar') return n <= 10 ? (ch.cats.some(t => PM.len(t) > 14) ? 1.08 : 0.92) : 0;
  if (k === 'stack') return s >= 2 ? 0.95 : 0;
  return n <= 12 ? 1 : 0;
};
const native = (sp, k) => (chOf(sp).kind === k ? 0.06 : 0);
chdef('ch-col', 'أعمدة', { accepts: sp => isCh(sp) ? 0.82 * kindOk(sp, 'col') + native(sp, 'col') : 0, render: chartFull('col'), tags: ['رسم بياني', 'أعمدة'] });
chdef('ch-bar', 'أشرطة أفقية', { accepts: sp => isCh(sp) ? 0.8 * kindOk(sp, 'bar') + native(sp, 'bar') : 0, render: chartFull('bar'), tags: ['رسم بياني', 'أشرطة'] });
chdef('ch-line', 'خط', { accepts: sp => isCh(sp) ? 0.8 * kindOk(sp, 'line') + native(sp, 'line') : 0, render: chartFull('line'), tags: ['رسم بياني', 'خط'] });
chdef('ch-area', 'مساحة', { accepts: sp => isCh(sp) ? 0.76 * kindOk(sp, 'area') + native(sp, 'area') : 0, render: chartFull('area'), tags: ['رسم بياني'] });
chdef('ch-donut', 'دائري مجوّف', { accepts: sp => isCh(sp) ? 0.82 * kindOk(sp, 'donut') + native(sp, 'donut') : 0, render: chartFull('donut'), tags: ['رسم بياني', 'دائري'] });
chdef('ch-stack', 'أعمدة مكدّسة', { accepts: sp => isCh(sp) ? 0.78 * kindOk(sp, 'stack') : 0, render: chartFull('stack'), tags: ['رسم بياني'] });
/* chart + insight panel: the headline number pulled from the data */
function insight(kind) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const pw = 300;
    const top = PM.head(c, sp, o, { w: G.CW - pw - 30 }) + 26;
    o.push(chartObj(c, sp, G.X0, top, G.CW - pw - 30, G.BOT - top, kind));
    const ch = chOf(sp), s = ch.series[0].vals;
    let big = '', lab = '';
    if (s.length >= 2 && s[0]) { const g = (s[s.length - 1] - s[0]) / Math.abs(s[0]) * 100; big = (g >= 0 ? '+' : '') + Math.round(g) + '%'; lab = (c.en ? 'Change from ' : 'التغيّر من ') + ch.cats[0] + (c.en ? ' to ' : ' إلى ') + ch.cats[ch.cats.length - 1]; }
    const x = G.X1 - pw;
    o.push(R(x, top, pw, G.BOT - top, c.dark ? K.SKY : K.NAVY, { r: 16, name: 'Insight' }));
    const ps = [tx.num(c, big, { size: c.Z.kpi * 1.2, color: c.dark ? K.NAVY : K.WHITE, sa: 10 }), tx.label(c, lab, { color: c.dark ? K.NAVY : 'D5E1F0', size: c.Z.label * 1.1 })];
    if (sp.lead) ps.push(tx.body(c, sp.lead, { bind: 'lead', color: c.dark ? '0B2E5C' : 'B7C9E2', sb: 16 }));
    o.push(T(x + 28, top + 28, pw - 56, G.BOT - top - 56, ps, { va: 'b', name: 'Insight text' }));
    return o;
  };
}
chdef('ch-col-insight', 'أعمدة + خلاصة', { accepts: sp => isCh(sp) && chOf(sp).series.length === 1 && chOf(sp).cats.length >= 3 && chOf(sp).cats.length <= 8 ? 0.8 * kindOk(sp, 'col') : 0, render: insight('col'), tags: ['رسم بياني', 'خلاصة'] });
chdef('ch-line-insight', 'خط + خلاصة', { accepts: sp => isCh(sp) && chOf(sp).series.length === 1 && chOf(sp).cats.length >= 3 ? 0.78 * kindOk(sp, 'line') : 0, render: insight('line'), tags: ['رسم بياني', 'خلاصة'] });
/* chart beside the KPIs it came from (tables) */
chdef('ch-donut-split', 'دائري + شرح', {
  tags: ['رسم بياني', 'دائري'],
  accepts: sp => isCh(sp) && kindOk(sp, 'donut') ? 0.78 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const pw = 340;
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow' }));
    if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title' }));
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub' }));
    if (sp.lead) ps.push(tx.body(c, sp.lead, { bind: 'lead', sb: 14 }));
    o.push(T(G.X0, 96, pw - G.X0 - 20, 350, ps, { va: 'm', name: 'Title' }));
    o.push(chartObj(c, sp, pw + 30, 90, G.X1 - pw - 30, 380, 'donut'));
    return o;
  }
});
})(window.PM);
