/* ==========================================================================
   Layout families · bullets · statement (paragraph) · quote · compare
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Ic, G, tx } = PM;
const bindOf = i => 'main.items.' + i + '.';
const area = (c, sp, o, opt) => PM.itemsArea(c, sp, o, opt);
const isB = sp => sp.form === 'bullets' && sp.n >= 1 && sp.n <= 12;
const bText = (sp) => sp.items.map(it => it.text || it.title || '');
const bdef = (id, name, o) => PM.def('bullets', id, name, Object.assign({ forms: ['bullets'] }, o));

/* ======================= BULLETS ======================= */
function bulletList(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const items = bText(sp), n = items.length;
    const twoCol = style === 'two' || (n >= 7 && style !== 'one');
    const cols = twoCol ? 2 : 1, gx = 48;
    const cw = (G.CW - gx * (cols - 1)) / cols;
    const per = Math.ceil(n / cols);
    const mk = (t, i) => Object.assign(tx.body(c, t, { size: c.Z.lead * 0.9, color: c.tone.title, bind: bindOf(i) + 'text', bullet: style === 'dash' ? 'dash' : 'dot', sa: 16, lh: 1.42, bc: style === 'dash' ? K.SKY : c.tone.accent }), { cap: n <= 6 ? (c.en ? 21 : 26) : null });
    const groups = []; for (let k = 0; k < cols; k++) groups.push(items.slice(k * per, (k + 1) * per).map((t, j) => mk(t, k * per + j)));
    const kk = PM.groupK(groups.map(ps => ({ w: cw, h: G.BOT - top, ps })), 1.2);
    const h = Math.max(...groups.map(ps => PM.hK(ps, cw, kk)));
    const y0 = PM.place(top, G.BOT, h, 0.42);
    groups.forEach((ps, k) => { const tb = PM.tk(G.X0 + k * (cw + gx), y0, cw, ps, kk, { name: 'List ' + (k + 1) }); if (tb) o.push(tb); });
    return o;
  };
}
bdef('bul-classic', 'قائمة نقاط', { accepts: sp => isB(sp) && sp.words <= 140 ? 0.8 : 0, render: bulletList('one'), tags: ['نقاط'] });
bdef('bul-two', 'قائمة بعمودين', { accepts: sp => isB(sp) && sp.n >= 4 ? 0.76 + (sp.n >= 7 ? 0.1 : 0) : 0, render: bulletList('two'), tags: ['نقاط', 'عمودين'] });
bdef('bul-dash', 'قائمة بشرطات', { accepts: sp => isB(sp) && sp.n <= 8 ? 0.74 : 0, render: bulletList('dash'), tags: ['نقاط'] });

/* numbered / checked / icon rows with hairlines */
function bulletRows(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = bText(sp), n = items.length;
    const twoCol = n >= 6;
    const cols = twoCol ? 2 : 1, gx = 44, cw = (G.CW - gx * (cols - 1)) / cols, per = Math.ceil(n / cols);
    const pre = style === 'num' ? 54 : 40;
    const rh = (G.BOT - top) / per;
    const pss = items.map((t, i) => [Object.assign(tx.body(c, t, { size: c.Z.lead * 0.88, color: c.tone.title, bind: bindOf(i) + 'text', lh: 1.38 }), { cap: n <= 6 ? (c.en ? 20 : 24) : null })]);
    const kk = PM.groupK(pss.map(ps => ({ w: cw - pre, h: rh - 22, ps })), 1.2);
    const hs = pss.map(ps => PM.hK(ps, cw - pre, kk));
    const rowH = Math.min(rh, Math.max(...hs) + 30);
    const y0 = PM.place(top, G.BOT, rowH * per, 0.42);
    items.forEach((t, i) => {
      const col = Math.floor(i / per), r = i % per;
      const x = G.X0 + col * (cw + gx), y = y0 + r * rowH;
      o.push(Ln(x, y, cw, 0, r === 0 ? c.tone.accent : c.tone.rule, { sw: r === 0 ? 1.5 : 0.75 }));
      const yy = y + (rowH - hs[i]) / 2;
      if (style === 'num') o.push(T(x, yy - 1, 46, 30, [tx.num(c, PM.pad2(i + 1), { size: 16, color: K.SKY, sa: 0 })], { name: 'Number' }));
      else if (style === 'check') o.push(Ic(x, yy + 1, 22, 'lib:circle-check', c.tone.icon, { sw: 1.6, name: 'Check' }));
      else o.push(Ic(x, yy + 1, 22, PM.iconOf(c, { title: t }, i), c.tone.icon, { bind: bindOf(i) + 'icon', slot: 'icon' }));
      const tb = PM.tk(x + pre, yy, cw - pre, pss[i], kk, { name: 'Point ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  };
}
bdef('bul-num', 'نقاط مرقّمة', { accepts: sp => isB(sp) && sp.n >= 2 && sp.n <= 10 ? 0.8 : 0, render: bulletRows('num'), tags: ['نقاط', 'أرقام'] });
bdef('bul-check', 'قائمة تحقق', { accepts: sp => isB(sp) && sp.n >= 2 && sp.n <= 10 ? 0.76 + (/(متطلب|شروط|تحقق|checklist|requirement|criteria|معايير)/i.test(sp.title) ? 0.15 : 0) : 0, render: bulletRows('check'), tags: ['نقاط', 'تحقق'] });
bdef('bul-icon', 'نقاط بأيقونات', { accepts: sp => isB(sp) && sp.n >= 2 && sp.n <= 10 ? 0.79 : 0, render: bulletRows('icon'), tags: ['نقاط', 'أيقونات'] });

/* split: big title on one side, list on the other */
function bulletSplit(style) {
  return (sp, c) => {
    const o = [];
    const panel = style === 'panel', photo = style === 'photo';
    const pw = photo ? 360 : 330;
    PM.chrome(c, o, { noBar: panel, noLogo: panel });
    let x0, w;
    if (photo) {
      PM.photoBlock(c, sp, o, W - pw, 0, pw, H, {});
      x0 = G.X0; w = W - pw - G.X0 - 46;
      const top = PM.head(c, sp, o, { w }) + 26;
      const items = bText(sp);
      const ps = items.map((t, i) => Object.assign(tx.body(c, t, { size: c.Z.lead * 0.86, color: c.tone.title, bind: bindOf(i) + 'text', bullet: 'dot', sa: 14 }), { cap: items.length <= 6 ? (c.en ? 19 : 23) : null }));
      const kk = PM.groupK([{ w, h: G.BOT - top, ps }], 1.2);
      const tb = PM.tk(x0, PM.place(top, G.BOT, PM.hK(ps, w, kk), 0.35), w, ps, kk, { name: 'List' }); if (tb) o.push(tb);
      return o;
    }
    if (panel) { o.push(R(0, 0, pw, H, c.dark ? K.DEEP : K.NAVY, { role: 'bg', lock: true })); o.push(PM.Logo(19, 13, 58, K.WHITE)); }
    else o.push(Ln(pw, 96, 0, 350, c.tone.rule));
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: panel ? K.SKY : null }));
    if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title', color: panel ? K.WHITE : null }));
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub', color: panel ? 'C9D6E8' : null }));
    if (sp.lead) ps.push(tx.body(c, sp.lead, { bind: 'lead', sb: 14, color: panel ? 'C9D6E8' : null }));
    o.push(T(G.X0, 96, pw - G.X0 - 36, 350, ps, { va: 'm', name: 'Title', minK: 0.66 }));
    x0 = pw + 46; w = G.X1 - x0;
    const items = bText(sp);
    const bp = items.map((t, i) => Object.assign(tx.body(c, t, { size: c.Z.lead * 0.9, color: c.tone.title, bind: bindOf(i) + 'text', bullet: 'dot', sa: 16, lh: 1.42 }), { cap: items.length <= 6 ? (c.en ? 20 : 24) : null }));
    const kk = PM.groupK([{ w, h: G.BOT - 70, ps: bp }], 1.2);
    const tb = PM.tk(x0, PM.place(70, G.BOT, PM.hK(bp, w, kk), 0.5), w, bp, kk, { name: 'List' }); if (tb) o.push(tb);
    return o;
  };
}
bdef('bul-split', 'عنوان جانبي + نقاط', { accepts: sp => isB(sp) && sp.n <= 8 && PM.len(sp.title) < 90 ? 0.79 : 0, render: bulletSplit('line'), tags: ['نقاط', 'جانبي'] });
bdef('bul-panel', 'لوحة كحلية + نقاط', { accepts: sp => isB(sp) && sp.n <= 8 && PM.len(sp.title) < 90 ? 0.78 : 0, render: bulletSplit('panel'), tags: ['نقاط', 'كحلي'], tones: ['light'] });
bdef('bul-photo', 'صورة + نقاط', { accepts: sp => isB(sp) && sp.n <= 7 && sp.words <= 90 ? 0.76 + (sp.imgs.length ? 0.12 : 0) : 0, render: bulletSplit('photo'), tags: ['نقاط', 'صورة'] });

/* few big statements (≤4 short lines) */
bdef('bul-statements', 'عبارات كبيرة', {
  tags: ['عبارات'],
  accepts: sp => isB(sp) && sp.n >= 2 && sp.n <= 4 && sp.items.every(it => PM.words(it.text || it.title) <= 9) ? 0.84 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const items = bText(sp), n = items.length;
    const rh = (G.BOT - top) / n;
    const pss = items.map((t, i) => [tx.title(c, t, { size: c.Z.title * 1.05, bind: bindOf(i) + 'text', color: i === n - 1 ? c.tone.accent : c.tone.title })]);
    const kk = PM.groupK(pss.map(ps => ({ w: G.CW - 60, h: rh - 14, ps })), 1.1);
    const hh = Math.min(rh, Math.max(...pss.map(ps => PM.hK(ps, G.CW - 60, kk))) + 26);
    const y0 = PM.place(top, G.BOT, hh * n, 0.45);
    items.forEach((t, i) => {
      const y = y0 + i * hh;
      o.push(Ic(G.X0, y + (hh - 30) / 2 - 4, 30, 'lib:arrow-right', K.SKY, { sw: 1.8, flipRtl: true, name: 'Arrow' }));
      const tb = PM.tk(G.X0 + 54, y + 4, G.CW - 60, pss[i], kk, { name: 'Statement ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* bullets over a full photo */
bdef('bul-onphoto', 'نقاط فوق صورة', {
  tags: ['نقاط', 'صورة'], tones: ['dark'],
  accepts: sp => isB(sp) && sp.n <= 6 && sp.words <= 70 ? 0.74 + (sp.imgs.length ? 0.12 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.photoBlock(c, sp, o, 0, 0, W, H, { veil: 'right', a0: 94, a1: 30 });
    PM.chromeOnPhoto(c, o);
    const w = 520;
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { color: K.SKY, bind: 'eyebrow' }));
    if (sp.title) ps.push(tx.title(c, sp.title, { color: K.WHITE, bind: 'title', sa: 18 }));
    bText(sp).forEach((t, i) => ps.push(tx.body(c, t, { size: c.Z.lead * 0.86, color: 'E3ECF7', bind: bindOf(i) + 'text', bullet: 'dot', sa: 12, bc: K.SKY })));
    o.push(T(G.X0, 70, w, 400, ps, { va: 'm', name: 'Text', maxK: 1.15 }));
    return o;
  }
});

/* ======================= STATEMENT (paragraph) ======================= */
const isP = sp => sp.form === 'para' && sp.textWords > 0;
const pdef = (id, name, o) => PM.def('statement', id, name, Object.assign({ forms: ['para'] }, o));
pdef('st-big', 'عبارة كبيرة', {
  tags: ['نص', 'عبارة'],
  accepts: sp => isP(sp) && sp.textWords <= 45 ? 0.86 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', sa: 14 }));
    if (sp.title) ps.push(tx.h(c, sp.title, { size: c.Z.lead, color: c.tone.accent, bind: 'title', sa: 16 }));
    ps.push(tx.title(c, sp.text, { size: c.Z.title * 1.08, bind: 'text', color: c.tone.title }));
    o.push(R(G.X0, 150, 4, 60, K.SKY, { name: 'Accent' }));
    o.push(T(G.X0 + 34, 92, G.CW - 120, 380, ps, { va: 'm', name: 'Statement', maxK: 1.15 }));
    return o;
  }
});
pdef('st-center', 'عبارة في المنتصف', {
  tags: ['نص', 'مركز'],
  accepts: sp => isP(sp) && sp.textWords <= 40 ? 0.82 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const ps = [];
    if (sp.title) ps.push(tx.eyebrow(c, sp.title, { bind: 'title', sa: 18, al: 'c' }));
    ps.push(tx.title(c, sp.text, { size: c.Z.title * 1.05, bind: 'text', al: 'c' }));
    o.push(T(150, 90, 660, 360, ps, { va: 'm', align: 'center', name: 'Statement', maxK: 1.15 }));
    o.push(R(W / 2 - 20, 460, 40, 3, K.SKY, { name: 'Accent' }));
    return o;
  }
});
pdef('st-lead', 'فقرة مع جملة افتتاحية', {
  tags: ['نص', 'فقرة'],
  accepts: sp => isP(sp) && sp.textWords > 25 && sp.textWords <= 160 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 30;
    const parts = sp.text.split(/(?<=[.!؟?])\s+|\n/).filter(Boolean);
    const first = parts.length > 1 ? parts[0] : '';
    const rest = parts.length > 1 ? parts.slice(1).join(' ') : sp.text;
    const ps = [];
    if (first) ps.push(tx.h(c, first, { size: c.Z.lead * 1.15, color: c.tone.title, bind: 'text', sa: 18, lh: 1.4 }));
    ps.push(tx.body(c, rest, { size: c.Z.body * 1.15, bind: first ? 'text' : 'text', lh: 1.6 }));
    ps.forEach(p => p.bind = 'text'); ps.forEach((p, i) => { p.part = i; });
    const kk = PM.groupK([{ w: 640, h: G.BOT - top, ps }], 1.4);
    const tb = PM.tk(G.X0, PM.place(top, G.BOT, PM.hK(ps, 640, kk), 0.3), 640, ps, kk, { name: 'Paragraph' });
    tb.joinBind = true; o.push(tb);
    return o;
  }
});
pdef('st-twocol', 'نص بعمودين', {
  tags: ['نص', 'عمودين'],
  accepts: sp => isP(sp) && sp.textWords > 80 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 30;
    const paras = sp.text.split('\n').filter(Boolean);
    let a = [], b = [];
    if (paras.length >= 2) { const half = Math.ceil(paras.length / 2); a = paras.slice(0, half); b = paras.slice(half); }
    else { const s = sp.text.split(/(?<=[.!؟?])\s+/); const half = Math.ceil(s.length / 2); a = [s.slice(0, half).join(' ')]; b = [s.slice(half).join(' ')]; }
    const cw = (G.CW - 48) / 2;
    const pa = a.map(t => tx.body(c, t, { size: c.Z.body * 1.1, bind: 'text', sa: 10, lh: 1.6 })), pb = b.map(t => tx.body(c, t, { size: c.Z.body * 1.1, bind: 'text', sa: 10, lh: 1.6 }));
    const kk = PM.groupK([{ w: cw, h: G.BOT - top, ps: pa }, { w: cw, h: G.BOT - top, ps: pb }], 1.15);
    const ta = PM.tk(G.X0, top, cw, pa, kk, { name: 'Column 1' }), tb = PM.tk(G.X0 + cw + 48, top, cw, pb, kk, { name: 'Column 2' });
    [ta, tb].forEach(t => { if (t) { t.joinBind = true; o.push(t); } });
    o.push(Ln(G.X0 + cw + 24, top, 0, Math.max(ta ? ta.h : 0, tb ? tb.h : 0), c.tone.rule));
    return o;
  }
});
pdef('st-photo', 'صورة + فقرة', {
  tags: ['نص', 'صورة'],
  accepts: sp => isP(sp) && sp.textWords <= 120 ? 0.8 + (sp.imgs.length ? 0.12 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const pw = 440;
    PM.photoBlock(c, sp, o, W - pw, 0, pw, H, {});
    const w = W - pw - G.X0 - 50;
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow' }));
    if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title', sa: 18 }));
    ps.push(tx.body(c, sp.text, { size: c.Z.lead * 0.9, bind: 'text', lh: 1.55, color: c.tone.body }));
    o.push(T(G.X0, 70, w, 400, ps, { va: 'm', name: 'Text', maxK: 1.15 }));
    return o;
  }
});
pdef('st-onphoto', 'فقرة فوق صورة', {
  tags: ['نص', 'صورة'], tones: ['dark'],
  accepts: sp => isP(sp) && sp.textWords <= 70 ? 0.78 + (sp.imgs.length ? 0.14 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.photoBlock(c, sp, o, 0, 0, W, H, { veil: 'right', a0: 92, a1: 15 });
    PM.chromeOnPhoto(c, o);
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: K.SKY }));
    if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title', color: K.WHITE, sa: 18 }));
    ps.push(tx.body(c, sp.text, { size: c.Z.lead * 0.95, bind: 'text', color: 'E3ECF7', lh: 1.55 }));
    o.push(T(G.X0, 70, 500, 400, ps, { va: 'm', name: 'Text', maxK: 1.15 }));
    return o;
  }
});
pdef('st-split', 'عنوان جانبي + فقرة', {
  tags: ['نص', 'جانبي'],
  accepts: sp => isP(sp) && sp.title && sp.textWords > 20 ? 0.78 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const pw = 340;
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow' }));
    ps.push(tx.title(c, sp.title, { bind: 'title' }));
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub' }));
    o.push(T(G.X0, 96, pw - G.X0 - 30, 350, ps, { va: 'm', name: 'Title' }));
    o.push(Ln(pw, 120, 0, 300, c.tone.rule));
    const w = G.X1 - pw - 46;
    const bp = [tx.body(c, sp.text, { size: c.Z.lead * 0.9, bind: 'text', lh: 1.6, color: c.tone.body })];
    o.push(T(pw + 46, 80, w, 400, bp, { va: 'm', name: 'Paragraph', maxK: 1.35 }));
    return o;
  }
});

/* ======================= QUOTE ======================= */
const isQ = sp => sp.form === 'quote';
const qdef = (id, name, o) => PM.def('quote', id, name, Object.assign({ forms: ['quote'] }, o));
const qText = sp => (sp.main && sp.main.text) || '';
const qBy = sp => (sp.main && sp.main.by) || '';
qdef('q-classic', 'اقتباس كلاسيكي', {
  tags: ['اقتباس'],
  accepts: sp => isQ(sp) ? 0.86 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    o.push(T(G.X0, 66, 120, 100, [P('“', 120, { font: 'num', color: K.SKY, lh: 1 })], { name: 'Quote mark', fit: false }));
    const ps = [];
    if (sp.title) ps.push(tx.eyebrow(c, sp.title, { bind: 'title', sa: 16 }));
    ps.push(tx.title(c, qText(sp), { size: c.Z.quote, bind: 'main.text', color: c.tone.title, lh: 1.4 }));
    if (qBy(sp)) ps.push(tx.sub(c, '— ' + qBy(sp), { bind: 'main.by', sb: 20, color: c.tone.accent }));
    o.push(T(G.X0 + 20, 176, G.CW - 140, 300, ps, { va: 'm', name: 'Quote', maxK: 1.15 }));
    return o;
  }
});
qdef('q-center', 'اقتباس في المنتصف', {
  tags: ['اقتباس', 'مركز'],
  accepts: sp => isQ(sp) ? 0.82 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    o.push(T(W / 2 - 50, 70, 100, 90, [P('“', 110, { font: 'num', color: K.SKY, lh: 1, al: 'c' })], { align: 'center', name: 'Quote mark', fit: false }));
    const ps = [];
    if (sp.title) ps.push(tx.eyebrow(c, sp.title, { bind: 'title', sa: 16, al: 'c' }));
    ps.push(tx.title(c, qText(sp), { size: c.Z.quote, bind: 'main.text', al: 'c', lh: 1.4 }));
    if (qBy(sp)) ps.push(tx.sub(c, qBy(sp), { bind: 'main.by', sb: 22, al: 'c', color: c.tone.accent }));
    o.push(T(140, 166, 680, 300, ps, { va: 'm', align: 'center', name: 'Quote', maxK: 1.12 }));
    return o;
  }
});
qdef('q-photo', 'اقتباس + صورة', {
  tags: ['اقتباس', 'صورة'],
  accepts: sp => isQ(sp) ? 0.8 + (sp.imgs.length ? 0.14 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const pw = 400;
    PM.photoBlock(c, sp, o, W - pw, 0, pw, H, {});
    const w = W - pw - G.X0 - 56;
    o.push(T(G.X0, 70, 100, 90, [P('“', 100, { font: 'num', color: K.SKY, lh: 1 })], { fit: false, name: 'Quote mark' }));
    const ps = [];
    if (sp.title) ps.push(tx.eyebrow(c, sp.title, { bind: 'title', sa: 14 }));
    ps.push(tx.title(c, qText(sp), { size: c.Z.quote * 0.95, bind: 'main.text', lh: 1.42 }));
    if (qBy(sp)) ps.push(tx.sub(c, '— ' + qBy(sp), { bind: 'main.by', sb: 18, color: c.tone.accent }));
    o.push(T(G.X0, 172, w, 300, ps, { va: 'm', name: 'Quote', maxK: 1.12 }));
    return o;
  }
});
qdef('q-full', 'اقتباس فوق صورة', {
  tags: ['اقتباس', 'صورة'], tones: ['dark'],
  accepts: sp => isQ(sp) ? 0.78 + (sp.imgs.length ? 0.14 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.photoBlock(c, sp, o, 0, 0, W, H, { veil: 'right', a0: 92, a1: 20 });
    PM.chromeOnPhoto(c, o);
    o.push(T(G.X0, 80, 100, 90, [P('“', 100, { font: 'num', color: K.SKY, lh: 1 })], { fit: false, name: 'Quote mark' }));
    const ps = [];
    if (sp.title) ps.push(tx.eyebrow(c, sp.title, { bind: 'title', sa: 14, color: K.SKY }));
    ps.push(tx.title(c, qText(sp), { size: c.Z.quote, bind: 'main.text', color: K.WHITE, lh: 1.42 }));
    if (qBy(sp)) ps.push(tx.sub(c, '— ' + qBy(sp), { bind: 'main.by', sb: 18, color: K.SKY }));
    o.push(T(G.X0, 180, 520, 280, ps, { va: 'm', name: 'Quote', maxK: 1.12 }));
    return o;
  }
});

/* ======================= COMPARE ======================= */
const isC = sp => sp.form === 'compare';
const cdef = (id, name, o) => PM.def('compare', id, name, Object.assign({ forms: ['compare'] }, o));
const sideA = sp => sp.main.a, sideB = sp => sp.main.b;
function sidePs(c, s, key, o = {}) {
  const ps = [tx.h(c, s.title || '', { size: c.Z.lead * 1.05, bind: 'main.' + key + '.title', sa: 14, color: o.hc })];
  (s.items || []).forEach((t, i) => ps.push(tx.body(c, t, { size: c.Z.body * 1.12, bind: 'main.' + key + '.items.' + i, bullet: o.bullet === false ? null : 'dot', sa: 10, color: o.bc, bc: o.bcol })));
  return ps;
}
function compare(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 30;
    const gx = style === 'vs' ? 90 : 26;
    const cw = (G.CW - gx) / 2;
    const pad = style === 'panels' ? 30 : 0;
    const t = c.tone;
    const pa = sidePs(c, sideA(sp), 'a', { hc: style === 'panels' ? t.title : t.muted }), pb = sidePs(c, sideB(sp), 'b', { hc: style === 'panels' ? (c.dark ? K.NAVY : K.WHITE) : t.accent, bc: style === 'panels' ? (c.dark ? K.NAVY : 'DCE7F5') : null, bcol: style === 'panels' ? K.SKY : null });
    const kk = PM.groupK([{ w: cw - pad * 2, h: G.BOT - top - pad * 2, ps: pa }, { w: cw - pad * 2, h: G.BOT - top - pad * 2, ps: pb }], 1.15);
    const ch = Math.max(PM.hK(pa, cw - pad * 2, kk), PM.hK(pb, cw - pad * 2, kk)) + pad * 2;
    const y0 = PM.place(top, G.BOT, ch, 0.4);
    if (style === 'panels') {
      o.push(R(G.X0, y0, cw, ch, t.cardFill, { r: 16, name: 'Panel A' }));
      o.push(R(G.X0 + cw + gx, y0, cw, ch, c.dark ? K.SKY : K.NAVY, { r: 16, name: 'Panel B' }));
    }
    if (style === 'vs') {
      o.push(Ln(W / 2 - (W / 2 - G.X0 - cw - gx / 2), y0, 0, ch, t.rule));
      const cx = G.X0 + cw + gx / 2;
      o.push(E(cx - 24, y0 + ch / 2 - 24, 48, 48, c.dark ? K.SKY : K.NAVY, { name: 'VS' }));
      o.push(T(cx - 24, y0 + ch / 2 - 24, 48, 48, [P(c.en ? 'VS' : 'مقابل', c.en ? 13 : 11, { font: 'head', bold: true, color: c.dark ? K.NAVY : K.WHITE, al: 'c' })], { va: 'm', align: 'center' }));
      o.splice(o.length - 3, 1, Ln(cx, y0, 0, ch, t.rule));
    }
    if (style === 'arrow') {
      const cx = G.X0 + cw + gx / 2;
      o.push(Ic(cx - 13, y0 + ch / 2 - 13, 26, 'lib:arrow-right', K.SKY, { sw: 2, flipRtl: true, name: 'Arrow' }));
    }
    const ta = PM.tk(G.X0 + pad, y0 + pad, cw - pad * 2, pa, kk, { name: 'Side A' }); if (ta) o.push(ta);
    const tb = PM.tk(G.X0 + cw + gx + pad, y0 + pad, cw - pad * 2, pb, kk, { name: 'Side B' }); if (tb) o.push(tb);
    return o;
  };
}
cdef('cmp-vs', 'مقارنة مع دائرة', { accepts: sp => isC(sp) ? 0.84 : 0, render: compare('vs'), tags: ['مقارنة'] });
cdef('cmp-panels', 'مقارنة بلوحتين', { accepts: sp => isC(sp) ? 0.84 : 0, render: compare('panels'), tags: ['مقارنة', 'لوحات'] });
cdef('cmp-arrow', 'قبل وبعد', { accepts: sp => isC(sp) ? 0.8 + (/(قبل|بعد|before|after|الحالي|المستهدف|current|future)/i.test(sideA(sp).title + sideB(sp).title) ? 0.1 : 0) : 0, render: compare('arrow'), tags: ['مقارنة', 'قبل وبعد'] });
cdef('cmp-rows', 'مقارنة صفاً بصف', {
  tags: ['مقارنة', 'صفوف'],
  accepts: sp => isC(sp) && Math.abs(sideA(sp).items.length - sideB(sp).items.length) <= 1 && Math.max(sideA(sp).items.length, sideB(sp).items.length) <= 6 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 30;
    const A = sideA(sp), B = sideB(sp), n = Math.max(A.items.length, B.items.length);
    const cw = (G.CW - 40) / 2;
    o.push(T(G.X0, top, cw, 30, [tx.h(c, A.title, { bind: 'main.a.title', color: c.tone.muted, sa: 0 })], { name: 'Head A' }));
    o.push(T(G.X0 + cw + 40, top, cw, 30, [tx.h(c, B.title, { bind: 'main.b.title', color: c.tone.accent, sa: 0 })], { name: 'Head B' }));
    const y0 = top + 42, rh = Math.min(64, (G.BOT - y0) / n);
    for (let i = 0; i < n; i++) {
      const y = y0 + i * rh;
      o.push(Ln(G.X0, y, G.CW, 0, i === 0 ? c.tone.accent : c.tone.rule, { sw: i === 0 ? 1.5 : 0.75 }));
      if (A.items[i] != null) o.push(T(G.X0, y + 8, cw - 20, rh - 16, [tx.body(c, A.items[i], { size: c.Z.body * 1.1, bind: 'main.a.items.' + i, color: c.tone.body })], { va: 'm', name: 'A' + (i + 1) }));
      o.push(Ic(G.X0 + cw + 8, y + rh / 2 - 11, 22, 'lib:arrow-right', K.SKY, { sw: 1.8, flipRtl: true }));
      if (B.items[i] != null) o.push(T(G.X0 + cw + 40, y + 8, cw - 20, rh - 16, [tx.body(c, B.items[i], { size: c.Z.body * 1.1, bind: 'main.b.items.' + i, color: c.tone.title, bold: true })], { va: 'm', name: 'B' + (i + 1) }));
    }
    return o;
  }
});
})(window.PM);
