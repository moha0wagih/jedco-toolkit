/* ==========================================================================
   More layouts · items (ix-) · steps (sx-) · timeline (tx-) · bullets (bx-)
   Editorial / annual-report art direction: asymmetric grids, oversized
   Sequel numerals, hairline structures, edge-to-edge photo bands and panels.
   Authored left-to-right, mirrored for Arabic by the engine.
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Ic, G, tx } = PM;
const place = (a, b, h, bias) => PM.place(a, b, h, bias);
const area = (c, sp, o, opt) => PM.itemsArea(c, sp, o, opt);
const bindOf = i => 'main.items.' + i + '.';
const its = sp => PM.its(sp);
const ips = (c, it, i, q) => PM.ips(c, it, i, q);
const sum = a => a.reduce((x, y) => x + y, 0);
const deep = c => (c.dark ? K.DEEP : K.NAVY);
const pale = c => (c.dark ? K.SURF_D : K.PALE);
const tileFill = c => (c.dark ? '163F7A' : 'E4EEF9');
const dotFill = c => (c.dark ? K.SKY : K.BLUE);
const dotInk = c => (c.dark ? K.NAVY : K.WHITE);
const ghostInk = c => (c.dark ? '25508C' : 'D3E2F3');
/* shapes that must sit under the chrome (edge bar, logo) go right after the background */
const under = (o, ...s) => { o.splice(1, 0, ...s); };
const pageOn = (o, col) => o.forEach(ob => { if (ob.pageNum) ob.paras[0].color = col; });
const recolor = (tb, fg, body) => { if (tb) tb.paras.forEach(p => { p.color = p.bold ? fg : body; }); return tb; };
const fitN = (sp, a, b) => sp.n >= a && sp.n <= b;
/* small rounded tinted square with a free line icon (never a ring) */
function tile(o, c, x, y, s, icon, bind) {
  o.push(R(x, y, s, s, tileFill(c), { r: Math.round(s * 0.26), name: 'Icon tile' }));
  const is = s * 0.54;
  o.push(Ic(x + (s - is) / 2, y + (s - is) / 2, is, icon, c.tone.icon, { bind, slot: 'icon', sw: 1.6 }));
}
/* filled dot with a number */
function dot(o, c, x, y, d, label, fill, ink) {
  o.push(E(x, y, d, d, fill || dotFill(c), { name: 'Step dot' }));
  o.push(T(x, y, d, d, [tx.num(c, label, { size: d * 0.4, color: ink || dotInk(c), al: 'c', sa: 0 })], { va: 'm', align: 'center', name: 'Step number' }));
}
/* stacked rows: one shared scale, balanced vertically */
function stack(pss, w, top, bot, q = {}) {
  const n = pss.length, g = q.gap == null ? 26 : q.gap;
  const avail = (bot - top - g * (n - 1)) / n - (q.pad || 0);
  const k = PM.groupK(pss.map(ps => ({ w, h: avail, ps })), q.maxK || 1.2);
  const hs = pss.map((ps, i) => Math.max(PM.hK(ps, w, k), q.minH || 0));
  let gap = g;
  if (q.fill && n > 1) gap = Math.max(g, Math.min(q.fill, (bot - top - sum(hs)) / (n - 1)));
  const total = sum(hs) + gap * (n - 1);
  const y0 = place(top, bot, total, q.bias == null ? 0.42 : q.bias);
  const ys = []; let y = y0; hs.forEach(h => { ys.push(y); y += h + gap; });
  return { k, hs, ys, gap, total, y0 };
}
/* title + text paragraphs of a dated milestone */
const tps = (c, it, i, q = {}) => {
  const ps = [];
  if (it.title) ps.push(tx.h(c, it.title, { bind: bindOf(i) + 'title', sa: it.text ? 4 : 0, k: q.k, color: q.hc }));
  if (it.text) ps.push(tx.body(c, it.text, { bind: bindOf(i) + 'text', k: q.k, color: q.bc }));
  return ps;
};
const isShortDate = v => PM.len(v) <= 9 && /\d/.test(PM.digits(v)) && PM.words(v) <= 2;
const isYears = sp => sp.items.every(it => /^\s*[0-9٠-٩]{4}\s*$/.test(String(it.value || '')));
const longDates = sp => sp.items.some(it => !isShortDate(it.value || ''));
function dateP(c, it, i, size, color, q = {}) {
  const v = it.value || '';
  if (isShortDate(v)) return tx.num(c, v, { size, color, bind: bindOf(i) + 'date', sa: q.sa == null ? 0 : q.sa, al: q.al });
  return P(v, (c.en ? 11.5 : 14.5) * (q.lk || 1), { bold: true, color, bind: bindOf(i) + 'date', sa: q.sa || 0, al: q.al, lh: 1.25 });
}
/* bullets */
const bText = sp => sp.items.map(it => it.text || it.title || '');
const bP = (c, t, i, q = {}) => Object.assign(tx.body(c, t, { size: q.size || c.Z.lead * 0.88, color: q.color || c.tone.title, bind: bindOf(i) + 'text', lh: q.lh || 1.4, bullet: q.bullet, sa: q.sa || 0, bc: q.bc, al: q.al }), { cap: q.cap === undefined ? (c.en ? 20 : 24) : q.cap });
/* header paragraphs for side panels */
function headPs(c, sp, q = {}) {
  const ps = [];
  if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: q.eb }));
  if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title', color: q.tc }));
  if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub', color: q.sc }));
  if (sp.lead && q.lead !== false) ps.push(tx.body(c, sp.lead, { bind: 'lead', color: q.lc, sb: 14, size: c.Z.body * 1.05, lh: 1.5 }));
  return ps;
}

/* ======================================================================
   ITEMS
   ====================================================================== */
const idef = (id, name, o) => PM.def('items', id, name, Object.assign({ forms: ['items'] }, o));
const isI = sp => !sp.multi && (sp.form === 'items' || sp.form === 'steps') && sp.n >= 2 && sp.n <= 8;
const iB = sp => (sp.form === 'items' ? 0 : -0.12);
const noBul = sp => !sp.hasBullets;

/* I1 · asymmetric lead: first item set large, the rest stacked in a hairline column */
idef('ix-asym-lead', 'بند رئيسي كبير + عمود بنود', {
  tags: ['تحريري', 'غير متماثل'],
  accepts: sp => isI(sp) && fitN(sp, 3, 5) && sp.allTitled && sp.maxItemWords <= 34 ? 0.8 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const items = its(sp), n = items.length;
    const lw = Math.round(G.CW * 0.44), gx = 64, rx = G.X0 + lw + gx, rw = G.X1 - rx;
    const lps = ips(c, items[0], 0, { hs: c.Z.title * 0.82, bs: c.Z.lead * 0.86, hsa: 12 });
    const lk = PM.groupK([{ w: lw, h: G.BOT - top - 70, ps: lps }], 1.12);
    const lh = 64 + PM.hK(lps, lw, lk);
    const pre = 46;
    const rps = items.slice(1).map((it, j) => ips(c, it, j + 1, { k: 0.96 }));
    const st = stack(rps, rw - pre, top, G.BOT, { gap: 30, maxK: 1.15, fill: 44 });
    const blockH = Math.max(lh, st.total);
    const y0 = place(top, G.BOT, blockH, 0.42);
    const ly = y0 + (blockH - lh) * 0.5;
    o.push(T(G.X0, ly, 120, 44, [tx.num(c, '01', { size: 34, color: K.SKY, sa: 0 })], { name: 'Number' }));
    o.push(R(G.X0, ly + 50, 44, 3, c.tone.accent, { name: 'Accent' }));
    const tb = PM.tk(G.X0, ly + 64, lw, lps, lk, { name: 'Lead item' }); if (tb) o.push(tb);
    o.push(Ln(G.X0 + lw + gx / 2, y0, 0, blockH, c.tone.rule, { name: 'Divider' }));
    const dy = y0 + (blockH - st.total) / 2 - st.y0;
    items.slice(1).forEach((it, j) => {
      const y = st.ys[j] + dy;
      if (j > 0) o.push(Ln(rx, y - st.gap / 2, rw, 0, c.tone.rule));
      o.push(T(rx, y + 1, 40, 22, [tx.num(c, PM.pad2(j + 2), { size: 13, color: c.tone.accent, sa: 0 })], { name: 'Number' }));
      const b = PM.tk(rx + pre, y, rw - pre, rps[j], st.k, { name: 'Item ' + (j + 2) }); if (b) o.push(b);
    });
    return o;
  }
});

/* I2 · two-tier bento: a tinted top tier of cards, an open hairline tier beneath */
idef('ix-tiers', 'صفّان: بطاقات وأعمدة مفتوحة', {
  tags: ['شبكة', 'بطاقات', 'تحريري'],
  accepts: sp => isI(sp) && (sp.n === 5 || sp.n === 7) && sp.maxItemWords <= 28 && noBul(sp) ? 0.8 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = its(sp), n = items.length;
    const a = Math.floor(n / 2), b = n - a, gx = 20, gy = 22, pad = 22;
    const cwA = (G.CW - gx * (a - 1)) / a, cwB = (G.CW - gx * (b - 1)) / b;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.95 }));
    const availA = (G.BOT - top - gy) * 0.52 - pad * 2 - 30, availB = (G.BOT - top - gy) * 0.48 - 40;
    const k = PM.groupK(pss.map((ps, i) => i < a ? { w: cwA - pad * 2, h: availA, ps } : { w: cwB, h: availB, ps }), 1.15);
    const hA = Math.max(...pss.slice(0, a).map(ps => PM.hK(ps, cwA - pad * 2, k))) + pad * 2 + 30;
    const hB = Math.max(...pss.slice(a).map(ps => PM.hK(ps, cwB, k))) + 36;
    const total = hA + gy + 10 + hB;
    const y0 = place(top, G.BOT, total, 0.45);
    items.forEach((it, i) => {
      if (i < a) {
        const x = G.X0 + i * (cwA + gx);
        o.push(R(x, y0, cwA, hA, c.tone.cardFill, { r: 14, name: 'Card' }));
        o.push(T(x + pad, y0 + pad - 2, 60, 24, [tx.num(c, PM.pad2(i + 1), { size: 15, color: c.tone.accent, sa: 0 })], { name: 'Number' }));
        const tb = PM.tk(x + pad, y0 + pad + 30, cwA - pad * 2, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
      } else {
        const j = i - a, x = G.X0 + j * (cwB + gx), y = y0 + hA + gy + 10;
        o.push(Ln(x, y, cwB, 0, c.tone.rule));
        o.push(R(x, y - 1.5, 30, 3, K.SKY));
        o.push(T(x, y + 10, 60, 20, [tx.num(c, PM.pad2(i + 1), { size: 12, color: c.tone.muted, sa: 0 })], { name: 'Number' }));
        const tb = PM.tk(x, y + 36, cwB, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
      }
    });
    return o;
  }
});

/* I3 · oversized numerals in the margin, hairline rows */
idef('ix-margin-num', 'أرقام ضخمة في الهامش', {
  tags: ['أرقام', 'صفوف', 'تحريري'],
  accepts: sp => isI(sp) && fitN(sp, 2, 4) && sp.maxItemWords <= 40 ? 0.8 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 22;
    const items = its(sp), n = items.length;
    const nw = n <= 3 ? 150 : 126, x1 = G.X0 + nw, w1 = G.X1 - x1;
    const pss = items.map((it, i) => ips(c, it, i));
    const st = stack(pss, w1, top, G.BOT, { gap: 30, maxK: 1.25, minH: n <= 3 ? 64 : 50, fill: 56 });
    const ns = Math.min(n <= 3 ? 76 : 60, Math.max(...st.hs) + 12);
    items.forEach((it, i) => {
      const y = st.ys[i];
      if (i > 0) o.push(Ln(G.X0, y - st.gap / 2, G.CW, 0, c.tone.rule));
      o.push(T(G.X0 - 4, y - ns * 0.12, nw - 10, ns * 1.1, [tx.num(c, PM.pad2(i + 1), { size: ns, color: ghostInk(c), sa: 0, lh: 1 })], { name: 'Numeral', fit: false }));
      const tb = PM.tk(x1, y, w1, pss[i], st.k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* I4 · ledger: two columns of numbered hairline rows */
idef('ix-ledger', 'سجل بعمودين', {
  tags: ['صفوف', 'عمودين', 'أرقام'],
  accepts: sp => isI(sp) && fitN(sp, 4, 8) && sp.maxItemWords <= (sp.n >= 7 ? 22 : 30) && noBul(sp) ? 0.79 + iB(sp) + (sp.n >= 6 ? 0.04 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 24;
    const items = its(sp), n = items.length, per = Math.ceil(n / 2), gx = 56, cw = (G.CW - gx) / 2, pre = 44;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.95 }));
    const rh = (G.BOT - top) / per;
    const k = PM.groupK(pss.map(ps => ({ w: cw - pre, h: rh - 30, ps })), 1.18);
    const hs = pss.map(ps => PM.hK(ps, cw - pre, k));
    const rowH = Math.min(rh, Math.max(...hs) + 34);
    const y0 = place(top, G.BOT, rowH * per, 0.42);
    o.push(Ln(G.X0 + cw + gx / 2, y0 + 8, 0, rowH * per - 16, c.tone.rule, { name: 'Divider' }));
    items.forEach((it, i) => {
      const col = Math.floor(i / per), r = i % per;
      const x = G.X0 + col * (cw + gx), y = y0 + r * rowH;
      o.push(Ln(x, y, cw, 0, r === 0 ? c.tone.accent : c.tone.rule, { sw: r === 0 ? 1.5 : 0.75 }));
      const yy = y + 16;
      o.push(T(x, yy + 1, 40, 22, [tx.num(c, PM.pad2(i + 1), { size: 13, color: K.SKY, sa: 0 })], { name: 'Number' }));
      const tb = PM.tk(x + pre, yy, cw - pre, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* I5 · staggered: items alternate above and below a centre rule, icon tiles on the line */
idef('ix-stagger', 'بنود متناوبة حول خط', {
  tags: ['متناوب', 'أيقونات'],
  accepts: sp => isI(sp) && fitN(sp, 4, 5) && sp.maxItemWords <= 22 && noBul(sp) ? 0.77 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 18;
    const items = its(sp), n = items.length;
    const slot = G.CW / n, cw = Math.min(slot * 2 - 28, 250), s = 40;
    const half = (G.BOT - top - s) / 2 - 22;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.92, al: 'c' }));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: half, ps })), 1.12);
    const hs = pss.map(ps => PM.hK(ps, cw, k));
    const up = Math.max(...hs.filter((_, i) => i % 2 === 0)), dn = Math.max(...hs.filter((_, i) => i % 2 === 1));
    const total = up + 22 + s + 22 + dn;
    const y0 = place(top, G.BOT, total, 0.5);
    const ly = y0 + up + 22 + s / 2;
    o.push(Ln(G.X0, ly, G.CW, 0, c.tone.rule, { sw: 1.2, name: 'Axis' }));
    items.forEach((it, i) => {
      const cx = G.X0 + slot * (i + 0.5);
      tile(o, c, cx - s / 2, ly - s / 2, s, PM.iconOf(c, it, i), bindOf(i) + 'icon');
      const x = Math.max(G.X0 - 6, Math.min(G.X1 - cw + 6, cx - cw / 2));
      const isUp = i % 2 === 0;
      const y = isUp ? ly - s / 2 - 18 - hs[i] : ly + s / 2 + 18;
      const tb = PM.tk(x, y, cw, pss[i], k, { align: 'center', name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* I6 · table of pillars: navy capitals, tinted shafts, a plinth */
idef('ix-pillars', 'أعمدة الركائز', {
  tags: ['ركائز', 'أعمدة', 'بطاقات'],
  accepts: sp => isI(sp) && fitN(sp, 3, 5) && sp.allTitled && sp.maxItemWords <= 34 ? 0.8 + iB(sp) + (/(ركائز|محاور|pillar)/i.test(sp.title) ? 0.06 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = its(sp), n = items.length, gx = 14, cw = (G.CW - gx * (n - 1)) / n, pad = 18;
    const hps = items.map((it, i) => [tx.h(c, it.title, { bind: bindOf(i) + 'title', sa: 0, color: K.WHITE, al: 'c' })]);
    const bps = items.map((it, i) => ips(c, Object.assign({}, it, { title: '' }), i, { al: 'c' }));
    const avail = G.BOT - top - 12;
    const kh = PM.groupK(hps.map(ps => ({ w: cw - pad * 2, h: 70, ps })), 1.12);
    const capH = Math.max(...hps.map(ps => PM.hK(ps, cw - pad * 2, kh))) + 30 + 26;
    const kb = PM.groupK(bps.map(ps => ({ w: cw - pad * 2, h: avail - capH - pad * 2, ps })), 1.18);
    const shaftH = Math.max(...bps.map(ps => PM.hK(ps, cw - pad * 2, kb))) + pad * 2 + 10;
    const total = Math.min(avail, Math.max(capH + shaftH, (G.BOT - top) * 0.72)) + 12;
    const y0 = place(top, G.BOT, total, 0.45);
    const colH = total - 12;
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(R(x, y0, cw, colH, c.tone.cardFill, { r: 14, name: 'Pillar' }));
      o.push(R(x, y0, cw, capH, c.dark ? K.BLUE : K.NAVY, { r: 14, name: 'Capital' }));
      o.push(T(x, y0 + 14, cw, 20, [tx.num(c, PM.pad2(i + 1), { size: 12, color: K.SKY, al: 'c', sa: 0 })], { align: 'center', name: 'Number' }));
      const th = PM.tk(x + pad, y0 + 38, cw - pad * 2, hps[i], kh, { align: 'center', name: 'Pillar title' }); if (th) o.push(th);
      const tb = PM.tk(x + pad, y0 + capH + pad, cw - pad * 2, bps[i], kb, { align: 'center', name: 'Pillar text' }); if (tb) o.push(tb);
    });
    o.push(R(G.X0, y0 + colH + 6, G.CW, 6, c.dark ? K.SKY : K.NAVY, { r: 3, name: 'Plinth' }));
    return o;
  }
});

/* I7 · icon-tile rows in two columns */
idef('ix-tile-rows', 'بنود بأيقونات في مربعات', {
  tags: ['أيقونات', 'عمودين'],
  accepts: sp => isI(sp) && fitN(sp, 4, 8) && sp.maxItemWords <= (sp.n >= 7 ? 20 : 28) && noBul(sp) ? 0.8 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 28;
    const items = its(sp), n = items.length, cols = 2, per = Math.ceil(n / cols), gx = 48, cw = (G.CW - gx) / 2;
    const s = per >= 4 ? 40 : 46, pre = s + 18;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.95 }));
    const rh = (G.BOT - top) / per;
    const k = PM.groupK(pss.map(ps => ({ w: cw - pre, h: rh - 22, ps })), 1.18);
    const hs = pss.map(ps => Math.max(PM.hK(ps, cw - pre, k), s));
    const rowH = Math.min(rh, Math.max(...hs) + (per >= 4 ? 22 : 34));
    const y0 = place(top, G.BOT, rowH * per, 0.42);
    items.forEach((it, i) => {
      const col = Math.floor(i / per), r = i % per;
      const x = G.X0 + col * (cw + gx), y = y0 + r * rowH;
      tile(o, c, x, y, s, PM.iconOf(c, it, i), bindOf(i) + 'icon');
      const h = PM.hK(pss[i], cw - pre, k);
      const tb = PM.tk(x + pre, y + Math.max(0, (s - h) / 2) - 1, cw - pre, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* I8 · columns headed by icon tiles, generous titles */
idef('ix-tile-cols', 'أعمدة بأيقونات في مربعات', {
  tags: ['أيقونات', 'أعمدة'],
  accepts: sp => isI(sp) && fitN(sp, 2, 4) && sp.maxItemWords <= 40 && noBul(sp) ? 0.81 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 34;
    const items = its(sp), n = items.length, gx = n === 2 ? 72 : 40, cw = (G.CW - gx * (n - 1)) / n, s = 54;
    const pss = items.map((it, i) => ips(c, it, i, { hs: c.Z.h * 1.12, hsa: 8 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - s - 30, ps })), 1.2);
    const blockH = s + 28 + Math.max(...pss.map(ps => PM.hK(ps, cw, k)));
    const y0 = place(top, G.BOT, blockH, 0.42);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      tile(o, c, x, y0, s, PM.iconOf(c, it, i), bindOf(i) + 'icon');
      o.push(Ln(x + s + 16, y0 + s / 2, cw - s - 16, 0, c.tone.rule));
      const tb = PM.tk(x, y0 + s + 28, cw, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* I9 · columns under huge pale numerals */
idef('ix-ghost-cols', 'أعمدة بأرقام باهتة كبيرة', {
  tags: ['أرقام', 'أعمدة', 'تحريري'],
  accepts: sp => isI(sp) && fitN(sp, 2, 4) && sp.maxItemWords <= 36 && noBul(sp) ? 0.8 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 20;
    const items = its(sp), n = items.length, gx = 40, cw = (G.CW - gx * (n - 1)) / n;
    const ns = n <= 3 ? 104 : 88;
    const pss = items.map((it, i) => ips(c, it, i));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - ns - 20, ps })), 1.22);
    const blockH = ns * 0.92 + 18 + Math.max(...pss.map(ps => PM.hK(ps, cw, k)));
    const y0 = place(top, G.BOT, blockH, 0.42);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(T(x - 4, y0 - ns * 0.1, cw, ns, [tx.num(c, PM.pad2(i + 1), { size: ns, color: ghostInk(c), sa: 0, lh: 1 })], { name: 'Numeral', fit: false }));
      o.push(R(x, y0 + ns * 0.92 - 2, 36, 3, K.SKY, { name: 'Accent' }));
      const tb = PM.tk(x, y0 + ns * 0.92 + 18, cw, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* I10 · two-tone: tinted title panel (edge to edge) + a two-column grid */
idef('ix-twotone', 'لوحة عنوان ملوّنة + شبكة', {
  tags: ['جانبي', 'شبكة', 'لوحة'],
  accepts: sp => isI(sp) && [2, 3, 4, 6].includes(sp.n) && sp.maxItemWords <= (sp.n === 6 ? 22 : 30) && PM.len(sp.title) < 80 && noBul(sp) ? 0.79 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const pw = 330;
    under(o, R(0, 0, pw, H, pale(c), { role: 'bg', lock: true, name: 'Panel' }));
    o.push(T(G.X0, 90, pw - G.X0 - 34, 360, headPs(c, sp), { va: 'm', name: 'Title', minK: 0.66 }));
    const items = its(sp), n = items.length;
    const x0 = pw + 48, w = G.X1 - x0, cols = n <= 3 ? 1 : 2, gx = 36, cw = (w - gx * (cols - 1)) / cols;
    const rows = Math.ceil(n / cols), gy = 30, s = 36;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.95 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: (G.BOT - 70 - gy * (rows - 1)) / rows - s - 18, ps })), 1.18);
    const rh = Math.max(...pss.map(ps => PM.hK(ps, cw, k))) + s + 16;
    const total = rh * rows + gy * (rows - 1);
    const y0 = place(70, G.BOT, total, 0.5);
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), cc = i % cols;
      const x = x0 + cc * (cw + gx), y = y0 + r * (rh + gy);
      if (r > 0) o.push(Ln(x, y - gy / 2, cw, 0, c.tone.rule));
      tile(o, c, x, y, s, PM.iconOf(c, it, i), bindOf(i) + 'icon');
      const tb = PM.tk(x, y + s + 16, cw, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* I11 · bento: one tall hero card + a mosaic of smaller cards */
idef('ix-bento', 'شبكة بينتو', {
  tags: ['بطاقات', 'شبكة', 'مميز'],
  accepts: sp => isI(sp) && fitN(sp, 3, 5) && sp.maxItemWords <= (sp.n === 5 ? 24 : 30) && noBul(sp) ? 0.79 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = its(sp), n = items.length, g = 16, pad = 22;
    const hw = Math.round(G.CW * 0.34), rx = G.X0 + hw + g, rw = G.X1 - rx;
    // cells for the rest
    const cells = [];
    const avail = G.BOT - top;
    if (n === 3) { cells.push([0, 0, 1, 1], [0, 1, 1, 1]); }
    if (n === 4) { cells.push([0, 0, 0.5, 1], [0.5, 0, 0.5, 1], [0, 1, 1, 1]); }
    if (n === 5) { cells.push([0, 0, 0.5, 1], [0.5, 0, 0.5, 1], [0, 1, 0.5, 1], [0.5, 1, 0.5, 1]); }
    const cw = cl => cl[2] * rw - (cl[2] < 1 ? g / 2 : 0);
    const s = 30;
    const pss = items.slice(1).map((it, j) => ips(c, it, j + 1, { k: 0.92 }));
    const k = PM.groupK(pss.map((ps, j) => ({ w: cw(cells[j]) - pad * 2, h: (avail - g) / 2 - pad * 2 - s - 12, ps })), 1.12);
    const ch = Math.min((avail - g) / 2, Math.max(...pss.map((ps, j) => PM.hK(ps, cw(cells[j]) - pad * 2, k))) + pad * 2 + s + 14);
    const total = ch * 2 + g;
    const y0 = place(top, G.BOT, total, 0.45);
    const hiFill = c.dark ? K.SKY : K.NAVY, hiFg = c.dark ? K.NAVY : K.WHITE, hiBody = c.dark ? '0B2E5C' : 'D5E1F0';
    o.push(R(G.X0, y0, hw, total, hiFill, { r: 16, name: 'Hero' }));
    o.push(Ic(G.X0 + pad + 4, y0 + pad + 4, 38, PM.iconOf(c, items[0], 0), c.dark ? K.NAVY : K.SKY, { bind: bindOf(0) + 'icon', slot: 'icon', sw: 1.4 }));
    const hps = ips(c, items[0], 0, { hs: c.Z.h * 1.25, bs: c.Z.body * 1.05, hsa: 8 });
    const hk = PM.groupK([{ w: hw - pad * 2 - 8, h: total - pad * 2 - 70, ps: hps }], 1.15);
    const hh = PM.hK(hps, hw - pad * 2 - 8, hk);
    const ht = PM.tk(G.X0 + pad + 4, y0 + total - pad - 4 - hh, hw - pad * 2 - 8, hps, hk, { name: 'Hero text' }); if (ht) o.push(recolor(ht, hiFg, hiBody));
    items.slice(1).forEach((it, j) => {
      const cl = cells[j];
      const x = rx + cl[0] * rw + (cl[0] > 0 ? g / 2 : 0), y = y0 + cl[1] * (ch + g), w = cw(cl);
      o.push(R(x, y, w, ch, c.tone.cardFill, { r: 16, name: 'Card' }));
      o.push(Ic(x + pad, y + pad, s - 4, PM.iconOf(c, it, j + 1), c.tone.icon, { bind: bindOf(j + 1) + 'icon', slot: 'icon' }));
      const tb = PM.tk(x + pad, y + pad + s + 12, w - pad * 2, pss[j], k, { name: 'Item ' + (j + 2) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* I12 · ribbon: a navy band carries the titles, texts sit beneath */
idef('ix-ribbon', 'شريط عناوين كحلي', {
  tags: ['شريط', 'أعمدة'],
  accepts: sp => isI(sp) && fitN(sp, 3, 5) && sp.allTitled && sp.maxItemWords <= 30 && noBul(sp) && sp.items.every(it => PM.words(it.title) <= 5) ? 0.79 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const items = its(sp), n = items.length, gx = 30, cw = (G.CW - gx * (n - 1)) / n;
    const hps = items.map((it, i) => [tx.h(c, it.title, { bind: bindOf(i) + 'title', sa: 0, color: K.WHITE, size: c.Z.h * 1.05 })]);
    const bps = items.map((it, i) => ips(c, Object.assign({}, it, { title: '' }), i));
    const kh = PM.groupK(hps.map(ps => ({ w: cw, h: 60, ps })), 1.1);
    const th = Math.max(...hps.map(ps => PM.hK(ps, cw, kh)));
    const bandH = th + 26 + 40;
    const kb = PM.groupK(bps.map(ps => ({ w: cw, h: G.BOT - top - bandH - 30, ps })), 1.2);
    const bh = Math.max(...bps.map(ps => PM.hK(ps, cw, kb)));
    const total = bandH + 26 + bh;
    const y0 = place(top, G.BOT, total, 0.45);
    under(o, R(0, y0, W, bandH, c.dark ? K.DEEP : K.NAVY, { role: 'bg', name: 'Ribbon' }));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(T(x, y0 + 18, 60, 20, [tx.num(c, PM.pad2(i + 1), { size: 12, color: K.SKY, sa: 0 })], { name: 'Number' }));
      const t1 = PM.tk(x, y0 + 44, cw, hps[i], kh, { name: 'Title ' + (i + 1) }); if (t1) o.push(t1);
      if (i > 0) o.push(Ln(x - gx / 2, y0 + 18, 0, bandH - 36, '2E558E'));
      const t2 = PM.tk(x, y0 + bandH + 26, cw, bps[i], kb, { name: 'Text ' + (i + 1) }); if (t2) o.push(t2);
    });
    return o;
  }
});

/* I13 · two-row grid with solid numbered dots and one horizontal hairline */
idef('ix-dot-grid', 'شبكة بنقاط مرقّمة', {
  tags: ['شبكة', 'أرقام'],
  accepts: sp => isI(sp) && fitN(sp, 5, 8) && sp.maxItemWords <= (sp.n >= 7 ? 20 : 26) && noBul(sp) ? 0.79 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = its(sp), n = items.length, cols = Math.ceil(n / 2), gx = 28, cw = (G.CW - gx * (cols - 1)) / cols, d = 30;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.92 }));
    const rowAvail = (G.BOT - top - 40) / 2 - d - 16;
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: rowAvail, ps })), 1.15);
    const rh = d + 16 + Math.max(...pss.map(ps => PM.hK(ps, cw, k)));
    const total = rh * 2 + 44;
    const y0 = place(top, G.BOT, total, 0.45);
    o.push(Ln(G.X0, y0 + rh + 22, G.CW, 0, c.tone.rule, { name: 'Divider' }));
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), cc = i % cols;
      const x = G.X0 + cc * (cw + gx), y = y0 + r * (rh + 44);
      dot(o, c, x, y, d, String(i + 1));
      const tb = PM.tk(x, y + d + 16, cw, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* I14 · cards with the number on top and the title anchored to the foot */
idef('ix-card-foot', 'بطاقات بأرقام علوية', {
  tags: ['بطاقات', 'أرقام'],
  accepts: sp => isI(sp) && [2, 3, 4, 6].includes(sp.n) && sp.maxItemWords <= (sp.n >= 5 ? 22 : 32) && noBul(sp) ? 0.78 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = its(sp), n = items.length, cols = n <= 4 ? n : 3, rows = Math.ceil(n / cols), gx = 16, gy = 16, pad = 22;
    const cw = (G.CW - gx * (cols - 1)) / cols;
    const maxCH = (G.BOT - top - gy * (rows - 1)) / rows;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.94 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw - pad * 2, h: maxCH - pad * 2 - 58, ps })), 1.16);
    const need = Math.max(...pss.map(ps => PM.hK(ps, cw - pad * 2, k))) + pad * 2 + 58;
    const ch = Math.min(maxCH, Math.max(need + 20, maxCH * (rows > 1 ? 0.86 : 0.8)));
    const total = ch * rows + gy * (rows - 1);
    const y0 = place(top, G.BOT, total, 0.45);
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), inRow = r === rows - 1 ? n - r * cols : cols;
      const off = (cols - inRow) * (cw + gx) / 2;
      const x = G.X0 + off + (i % cols) * (cw + gx), y = y0 + r * (ch + gy);
      o.push(R(x, y, cw, ch, null, { r: 16, stroke: c.dark ? '2E558E' : 'D3DCE8', sw: 1, name: 'Card' }));
      o.push(T(x + pad, y + pad - 4, 90, 38, [tx.num(c, PM.pad2(i + 1), { size: 30, color: c.tone.accent, sa: 0 })], { name: 'Number' }));
      const h = PM.hK(pss[i], cw - pad * 2, k);
      const tb = PM.tk(x + pad, y + ch - pad - h, cw - pad * 2, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* I15 · checkerboard of navy and tinted cards */
idef('ix-checker', 'بطاقات متناوبة الألوان', {
  tags: ['بطاقات', 'شبكة', 'ألوان'],
  accepts: sp => isI(sp) && [4, 6, 8].includes(sp.n) && sp.maxItemWords <= (sp.n === 8 ? 18 : 26) && noBul(sp) ? 0.78 + iB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = its(sp), n = items.length, cols = n / 2, rows = 2, g = 14, pad = 22;
    const cw = (G.CW - g * (cols - 1)) / cols, maxCH = (G.BOT - top - g) / 2;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.92 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw - pad * 2, h: maxCH - pad * 2 - 40, ps })), 1.14);
    const need = Math.max(...pss.map(ps => PM.hK(ps, cw - pad * 2, k))) + pad * 2 + 40;
    const ch = Math.min(maxCH, Math.max(need + 8, maxCH * 0.82));
    const y0 = place(top, G.BOT, ch * 2 + g, 0.45);
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), cc = i % cols, x = G.X0 + cc * (cw + g), y = y0 + r * (ch + g);
      const hi = (r + cc) % 2 === 0;
      const fill = hi ? (c.dark ? K.BLUE : K.NAVY) : c.tone.cardFill;
      o.push(R(x, y, cw, ch, fill, { r: 14, name: 'Card' }));
      o.push(Ic(x + pad, y + pad, 26, PM.iconOf(c, it, i), hi ? K.SKY : c.tone.icon, { bind: bindOf(i) + 'icon', slot: 'icon' }));
      const tb = PM.tk(x + pad, y + pad + 40, cw - pad * 2, pss[i], k, { name: 'Item ' + (i + 1) });
      if (tb) o.push(hi ? recolor(tb, K.WHITE, 'D5E1F0') : tb);
    });
    return o;
  }
});

/* I16 · photo half on the start edge + a grid of items */
idef('ix-photo-grid', 'صورة جانبية + شبكة بنود', {
  tags: ['صورة', 'شبكة'],
  accepts: sp => isI(sp) && [2, 3, 4, 6].includes(sp.n) && sp.maxItemWords <= (sp.n === 6 ? 18 : 26) && noBul(sp) && !sp.lead ? 0.77 + iB(sp) + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    const pw = 340;
    PM.chrome(c, o, { noBar: true, noLogo: true });
    PM.photoBlock(c, sp, o, 0, 0, pw, H, {});
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    pageOn(o, K.WHITE);
    const x0 = pw + 48, w = G.X1 - x0;
    const top = PM.head(c, sp, o, { x: x0, w }) + 30;
    const items = its(sp), n = items.length, cols = n <= 3 ? 1 : 2, gx = 32, cw = (w - gx * (cols - 1)) / cols;
    const rows = Math.ceil(n / cols), gy = 26;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.94 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: (G.BOT - top - gy * (rows - 1)) / rows - 18, ps })), 1.16);
    const rh = Math.max(...pss.map(ps => PM.hK(ps, cw, k))) + 18;
    const total = rh * rows + gy * (rows - 1);
    const y0 = place(top, G.BOT, total, 0.4);
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), cc = i % cols, x = x0 + cc * (cw + gx), y = y0 + r * (rh + gy);
      o.push(Ln(x, y, cw, 0, c.tone.rule));
      o.push(R(x, y - 1.5, 28, 3, K.SKY));
      const tb = PM.tk(x, y + 18, cw, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* I17 · photo band at the foot, items above it */
idef('ix-photo-foot', 'بنود فوق شريط صورة سفلي', {
  tags: ['صورة', 'أعمدة'],
  accepts: sp => isI(sp) && fitN(sp, 2, 4) && sp.maxItemWords <= 22 && noBul(sp) && !sp.lead && !sp.sub ? 0.76 + iB(sp) + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    const bandH = 168;
    PM.chrome(c, o, { noPage: true });
    PM.photoBlock(c, sp, o, 0, H - bandH, W, bandH, { veil: 'down', a0: 0, a1: 55 });
    PM.chromeOnPhoto(c, o, { noLogo: true });
    const bot = H - bandH - 28;
    const top = PM.head(c, sp, o) + 28;
    const items = its(sp), n = items.length, gx = 36, cw = (G.CW - gx * (n - 1)) / n, s = 30;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.94 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: bot - top - s - 14, ps })), 1.14);
    const blockH = s + 14 + Math.max(...pss.map(ps => PM.hK(ps, cw, k)));
    const y0 = place(top, bot, blockH, 0.5);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(Ic(x, y0, 26, PM.iconOf(c, it, i), c.tone.icon, { bind: bindOf(i) + 'icon', slot: 'icon' }));
      if (i > 0) o.push(Ln(x - gx / 2, y0, 0, blockH, c.tone.rule));
      const tb = PM.tk(x, y0 + s + 14, cw, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    // the edge bar would cross the photo: keep it above the band only
    o.forEach(ob => { if (ob.name === 'Edge bar') ob.h = Math.min(ob.h, H - bandH - 84 - 20); });
    return o;
  }
});

/* I18 · open grid on a hairline cross structure */
idef('ix-gridlines', 'شبكة بخطوط متقاطعة', {
  tags: ['شبكة', 'خطوط'],
  accepts: sp => isI(sp) && [4, 6, 8].includes(sp.n) && sp.maxItemWords <= (sp.n === 8 ? 18 : 28) && noBul(sp) ? 0.79 + iB(sp) + (sp.n === 4 ? 0.02 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 24;
    const items = its(sp), n = items.length, cols = n / 2, padX = n === 8 ? 18 : 28, padY = 22;
    const cw = G.CW / cols;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.94 }));
    const s = 34;
    const k = PM.groupK(pss.map(ps => ({ w: cw - padX * 2, h: (G.BOT - top) / 2 - padY * 2 - s - 14, ps })), 1.16);
    const ch = Math.min((G.BOT - top) / 2, Math.max(...pss.map(ps => PM.hK(ps, cw - padX * 2, k))) + padY * 2 + s + 14);
    const y0 = place(top, G.BOT, ch * 2, 0.45);
    o.push(Ln(G.X0, y0 + ch, G.CW, 0, c.tone.rule, { name: 'Grid' }));
    for (let j = 1; j < cols; j++) o.push(Ln(G.X0 + j * cw, y0 + 10, 0, ch * 2 - 20, c.tone.rule, { name: 'Grid' }));
    for (let j = 1; j < cols; j++) o.push(E(G.X0 + j * cw - 3.5, y0 + ch - 3.5, 7, 7, K.SKY, { name: 'Node' }));
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), cc = i % cols;
      const x = G.X0 + cc * cw + (cc === 0 ? 0 : padX), w = cw - padX - (cc === 0 ? 0 : padX) - (cc === cols - 1 ? 0 : 0);
      const y = y0 + r * ch + padY;
      tile(o, c, x, y, s, PM.iconOf(c, it, i), bindOf(i) + 'icon');
      const tb = PM.tk(x, y + s + 14, Math.min(w, cw - padX * 2), pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* ======================================================================
   STEPS
   ====================================================================== */
const sdef = (id, name, o) => PM.def('steps', id, name, Object.assign({ forms: ['steps'] }, o));
const isS = sp => !sp.multi && (sp.form === 'steps' || sp.form === 'items') && sp.n >= 2 && sp.n <= 7;
const sB = sp => (sp.form === 'steps' ? 0.1 : -0.08);

/* S1 · rail with big step names above, numbers small, text below */
sdef('sx-rail-names', 'سكة بأسماء مراحل كبيرة', {
  tags: ['مراحل', 'خط', 'تحريري'],
  accepts: sp => isS(sp) && fitN(sp, 2, 5) && sp.allTitled && sp.items.every(it => PM.words(it.title) <= 4) && sp.maxItemWords <= 30 && noBul(sp) ? 0.8 + sB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const items = its(sp), n = items.length, gx = 30, cw = (G.CW - gx * (n - 1)) / n;
    const hps = items.map((it, i) => [Object.assign(tx.title(c, it.title, { bind: bindOf(i) + 'title', size: c.Z.title * (n >= 5 ? 0.7 : 0.82), color: c.tone.title }), { cap: c.Z.title })]);
    const bps = items.map((it, i) => ips(c, Object.assign({}, it, { title: '' }), i));
    const kh = PM.groupK(hps.map(ps => ({ w: cw, h: 80, ps })), 1);
    const th = Math.max(...hps.map(ps => PM.hK(ps, cw, kh)));
    const kb = PM.groupK(bps.map(ps => ({ w: cw - 4, h: G.BOT - top - th - 80, ps })), 1.18);
    const bh = Math.max(...bps.map(ps => PM.hK(ps, cw - 4, kb)));
    const total = 26 + th + 22 + 30 + bh;
    const y0 = place(top, G.BOT, total, 0.45);
    const ly = y0 + 26 + th + 22;
    o.push(Ln(G.X0, ly, G.CW, 0, c.tone.rule, { sw: 1.5, name: 'Rail' }));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(T(x, y0, 80, 20, [tx.num(c, PM.pad2(i + 1), { size: 12, color: K.SKY, sa: 0 })], { name: 'Number' }));
      const th1 = PM.tk(x, y0 + 26 + (th - PM.hK(hps[i], cw, kh)), cw, hps[i], kh, { name: 'Step name' }); if (th1) o.push(th1);
      o.push(R(x, ly - 2, Math.min(cw, 56), 4, i === 0 ? c.tone.accent : K.SKY, { r: 2, name: 'Marker' }));
      const tb = PM.tk(x, ly + 30, cw - 4, bps[i], kb, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* S2 · vertical process, large numerals in a side column */
sdef('sx-side-numerals', 'مراحل عمودية بأرقام جانبية', {
  tags: ['مراحل', 'عمودي', 'أرقام'],
  accepts: sp => isS(sp) && fitN(sp, 3, 6) && sp.maxItemWords <= 40 ? 0.79 + sB(sp) + (sp.maxItemWords > 24 ? 0.03 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 22;
    const items = its(sp), n = items.length;
    const nw = 96, x1 = G.X0 + nw + 30, w1 = G.X1 - x1;
    const titled = sp.allTitled;
    const tW = titled ? 230 : 0, bx = x1 + (titled ? tW + 30 : 0), bw = G.X1 - bx;
    const tps2 = items.map((it, i) => titled ? [tx.h(c, it.title, { bind: bindOf(i) + 'title', sa: 0 })] : []);
    const bps = items.map((it, i) => titled ? ips(c, Object.assign({}, it, { title: '' }), i) : ips(c, it, i));
    const rowAvail = (G.BOT - top) / n - 22;
    let k = PM.groupK(bps.map(ps => ({ w: bw, h: rowAvail, ps })), 1.18);
    if (titled) k = Math.min(k, PM.groupK(tps2.map(ps => ({ w: tW, h: rowAvail, ps })), 1.18));
    const ns = n <= 4 ? 40 : 32;
    const hs = items.map((_, i) => Math.max(PM.hK(tps2[i], tW || 10, k), PM.hK(bps[i], bw, k), ns * 0.9));
    const gap = Math.max(18, Math.min(n <= 3 ? 64 : 44, (G.BOT - top - sum(hs)) / Math.max(1, n - 1)));
    const total = sum(hs) + gap * (n - 1);
    let y = place(top, G.BOT, total, 0.42);
    o.push(Ln(G.X0 + nw + 14, y, 0, total, c.tone.rule, { name: 'Spine' }));
    items.forEach((it, i) => {
      if (i > 0) o.push(Ln(x1, y - gap / 2, w1, 0, c.tone.rule));
      o.push(T(G.X0, y - 2, nw, ns * 1.1, [tx.num(c, PM.pad2(i + 1), { size: ns, color: i === 0 ? c.tone.accent : K.SKY, sa: 0, lh: 1 })], { name: 'Numeral', fit: false }));
      o.push(E(G.X0 + nw + 10, y + 6, 8, 8, i === 0 ? c.tone.accent : K.SKY));
      if (titled) { const t1 = PM.tk(x1, y, tW, tps2[i], k, { name: 'Step name' }); if (t1) o.push(t1); }
      const tb = PM.tk(bx, y + (titled ? 2 : 0), bw, bps[i], k, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
      y += hs[i] + gap;
    });
    return o;
  }
});

/* S3 · roadmap: stacked horizontal phase bands deepening in tone */
sdef('sx-bands', 'مراحل بأشرطة متدرجة', {
  tags: ['مراحل', 'خارطة طريق', 'أشرطة'],
  accepts: sp => isS(sp) && fitN(sp, 3, 5) && sp.allTitled && sp.maxItemWords <= 28 && noBul(sp) ? 0.79 + sB(sp) + (/(خارطة|roadmap|مرحل|phase)/i.test(sp.title) ? 0.05 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 24;
    const items = its(sp), n = items.length, g = 10, padX = 26;
    const shades = c.dark ? ['0C3470', '123F80', '1A4C93', '245AA6', '2F68B8'] : ['E4EEF9', 'C9DCF2', '62B6F3', '1F6AC6', K.NAVY];
    const pick = i => shades[Math.round(i * (shades.length - 1) / (n - 1))];
    const darkInk = i => c.dark || i >= Math.ceil(n / 2);
    const nW = 70, tW = 220, bx = G.X0 + padX + nW + tW + 20, bw = G.X1 - padX - bx;
    const tps2 = items.map((it, i) => [tx.h(c, it.title, { bind: bindOf(i) + 'title', sa: 0 })]);
    const bps = items.map((it, i) => ips(c, Object.assign({}, it, { title: '' }), i));
    const rh0 = (G.BOT - top - g * (n - 1)) / n;
    const k = Math.min(PM.groupK(tps2.map(ps => ({ w: tW, h: rh0 - 24, ps })), 1.15), PM.groupK(bps.map(ps => ({ w: bw, h: rh0 - 24, ps })), 1.15));
    const need = Math.max(...items.map((_, i) => Math.max(PM.hK(tps2[i], tW, k), PM.hK(bps[i], bw, k)))) + 30;
    const rh = Math.min(rh0, Math.max(need, 62, rh0 * 0.72));
    const y0 = place(top, G.BOT, rh * n + g * (n - 1), 0.45);
    items.forEach((it, i) => {
      const y = y0 + i * (rh + g), ind = i * 18;
      o.push(R(G.X0 + ind, y, G.CW - ind, rh, pick(i), { r: 14, name: 'Phase band' }));
      const fg = darkInk(i) ? K.WHITE : K.NAVY, body = darkInk(i) ? (c.dark ? K.BODY_D : 'DCE7F5') : K.BODY;
      o.push(T(G.X0 + ind + padX, y, nW, rh, [tx.num(c, PM.pad2(i + 1), { size: 22, color: darkInk(i) ? K.SKY : K.BLUE, sa: 0 })], { va: 'm', name: 'Number' }));
      const t1 = PM.tk(G.X0 + ind + padX + nW, y + (rh - PM.hK(tps2[i], tW - ind, k)) / 2, tW - ind, tps2[i], k, { name: 'Phase' }); if (t1) o.push(recolor(t1, fg, body));
      const bh = PM.hK(bps[i], bw, k);
      const t2 = PM.tk(bx, y + (rh - bh) / 2, bw, bps[i], k, { name: 'Phase text' }); if (t2) o.push(recolor(t2, fg, body));
    });
    return o;
  }
});

/* S4 · snake path: two rows joined by a turn on the end edge */
sdef('sx-snake', 'مسار متعرج بصفين', {
  tags: ['مراحل', 'مسار'],
  accepts: sp => isS(sp) && fitN(sp, 5, 7) && sp.maxItemWords <= (sp.n === 7 ? 18 : 22) && noBul(sp) ? 0.79 + sB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = its(sp), n = items.length, a = Math.ceil(n / 2), b = n - a;
    const right = G.X1 - 24, gx = 26, cw = (right - G.X0 - gx * (a - 1)) / a, d = 30;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.9 }));
    const rowAvail = (G.BOT - top - 2 * (d + 18) - 30) / 2;
    const k = PM.groupK(pss.map(ps => ({ w: cw - 6, h: rowAvail, ps })), 1.12);
    const hA = Math.max(...pss.slice(0, a).map(ps => PM.hK(ps, cw - 6, k))), hB = Math.max(...pss.slice(a).map(ps => PM.hK(ps, cw - 6, k)));
    const total = d + 18 + hA + 30 + d + 18 + hB;
    const y0 = place(top, G.BOT, total, 0.45);
    const y1 = y0 + d / 2, y2 = y0 + d + 18 + hA + 30 + d / 2;
    const xs = i => i < a ? G.X0 + i * (cw + gx) : G.X0 + (a - 1 - (i - a)) * (cw + gx);
    o.push(Ln(G.X0 + d / 2, y1, right + 16 - G.X0 - d / 2 - 14, 0, c.tone.rule, { sw: 1.5, name: 'Path' }));
    o.push(R(right - 14, y1, 30, y2 - y1, null, { r: 14, stroke: c.tone.rule, sw: 1.5, name: 'Turn' }));
    o.push(R(right - 16, y1 - 2, 16, y2 - y1 + 4, c.tone.bg, { name: 'Turn mask' }));
    o.push(Ln(xs(n - 1) + d / 2, y2, right + 2 - xs(n - 1) - d / 2, 0, c.tone.rule, { sw: 1.5, name: 'Path' }));
    items.forEach((it, i) => {
      const x = xs(i), y = i < a ? y0 : y2 - d / 2;
      dot(o, c, x, y, d, String(i + 1), i === n - 1 ? (c.dark ? K.WHITE : K.NAVY) : null, i === n - 1 ? (c.dark ? K.NAVY : K.WHITE) : null);
      const tb = PM.tk(x, y + d + 18, cw - 6, pss[i], k, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* S5 · photo half on the end edge + vertical steps with numerals */
sdef('sx-photo', 'صورة + مراحل مرقّمة', {
  tags: ['مراحل', 'صورة'],
  accepts: sp => isS(sp) && fitN(sp, 3, 5) && sp.maxItemWords <= 24 && noBul(sp) ? 0.77 + sB(sp) + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    const pw = 360;
    PM.chrome(c, o);
    PM.photoBlock(c, sp, o, W - pw, 0, pw, H, {});
    const x0 = G.X0, w = W - pw - G.X0 - 46;
    let top = PM.head(c, sp, o, { w }) + 22;
    if (sp.lead) { const lb = PM.textAt(x0, top - 4, w, 60, [tx.body(c, sp.lead, { bind: 'lead' })], { name: 'Lead' }); if (lb) { o.push(lb); top = lb.y + lb.h + 16; } }
    const items = its(sp), n = items.length, pre = 58;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.95 }));
    const st = stack(pss, w - pre, top, G.BOT, { gap: 22, maxK: 1.15, minH: 30, fill: 34 });
    o.push(Ln(x0 + 15, st.ys[0] + 15, 0, st.ys[n - 1] - st.ys[0], c.tone.rule, { sw: 1.2, name: 'Rail' }));
    items.forEach((it, i) => {
      dot(o, c, x0, st.ys[i], 30, String(i + 1));
      const tb = PM.tk(x0 + pre, st.ys[i] + 3, w - pre, pss[i], st.k, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* S6 · tall tinted tiles, big numeral at the foot */
sdef('sx-tiles', 'بطاقات مراحل برقم سفلي', {
  tags: ['مراحل', 'بطاقات', 'أرقام'],
  accepts: sp => isS(sp) && fitN(sp, 3, 5) && sp.maxItemWords <= 30 && noBul(sp) ? 0.78 + sB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 28;
    const items = its(sp), n = items.length, gx = 26, cw = (G.CW - gx * (n - 1)) / n, pad = 22, ns = 54;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.95 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw - pad * 2, h: G.BOT - top - pad * 2 - ns - 24, ps })), 1.15);
    const need = Math.max(...pss.map(ps => PM.hK(ps, cw - pad * 2, k))) + pad * 2 + ns + 30;
    const ch = Math.min(G.BOT - top, Math.max(need, (G.BOT - top) * 0.8));
    const y0 = place(top, G.BOT, ch, 0.45);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      const last = i === n - 1;
      o.push(R(x, y0, cw, ch, last ? (c.dark ? K.SKY : K.NAVY) : c.tone.cardFill, { r: 16, name: 'Step tile' }));
      const tb = PM.tk(x + pad, y0 + pad, cw - pad * 2, pss[i], k, { name: 'Step ' + (i + 1) });
      if (tb) o.push(last ? recolor(tb, c.dark ? K.NAVY : K.WHITE, c.dark ? '0B2E5C' : 'D5E1F0') : tb);
      o.push(T(x + pad, y0 + ch - pad - ns, cw - pad * 2, ns, [tx.num(c, PM.pad2(i + 1), { size: ns, color: last ? (c.dark ? K.NAVY : K.SKY) : ghostInk(c), sa: 0, lh: 1 })], { va: 'b', name: 'Numeral', fit: false }));
      if (i < n - 1) o.push(Ic(x + cw + gx / 2 - 9, y0 + ch / 2 - 9, 18, 'lib:arrow-right', K.SKY, { sw: 1.8, flipRtl: true, name: 'Arrow' }));
    });
    return o;
  }
});

/* S7 · centre spine, steps alternating on both sides */
sdef('sx-spine', 'مراحل حول عمود مركزي', {
  tags: ['مراحل', 'عمودي', 'متناوب'],
  accepts: sp => isS(sp) && fitN(sp, 3, 6) && sp.maxItemWords <= 24 && noBul(sp) && !sp.lead ? 0.78 + sB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, { align: 'center' }) + 22;
    const items = its(sp), n = items.length, cx = W / 2, cw = 330, d = 30;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.95 }));
    const step = (G.BOT - top) / (n + 1);
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: step * 2 - 16, ps })), 1.15);
    const hs = pss.map(ps => PM.hK(ps, cw, k));
    const s2 = Math.max(step, Math.max(...hs) / 2 + 10);
    const ys = items.map((_, i) => i * s2);
    const span = ys[n - 1] + Math.max(hs[n - 1], d);
    const y0 = place(top, G.BOT, span, 0.4);
    o.push(Ln(cx, y0 + 6, 0, ys[n - 1], c.tone.rule, { sw: 1.5, name: 'Spine' }));
    items.forEach((it, i) => {
      const y = y0 + ys[i];
      dot(o, c, cx - d / 2, y - 9, d, String(i + 1));
      const left = i % 2 === 0;
      const x = left ? cx - d / 2 - 26 - cw : cx + d / 2 + 26;
      const tb = PM.tk(x, y - 6, cw, pss[i], k, { align: left ? 'end' : 'start', name: 'Step ' + (i + 1) });
      if (tb) { tb.paras.forEach(p => { p.al = left ? 'r' : 'l'; }); o.push(tb); }
    });
    return o;
  }
});

/* S8 · ladder: each step indented a little further, hairline rows */
sdef('sx-ladder', 'سلّم مراحل متدرج', {
  tags: ['مراحل', 'تصاعدي', 'صفوف'],
  accepts: sp => isS(sp) && fitN(sp, 3, 5) && sp.maxItemWords <= 22 && noBul(sp) ? 0.77 + sB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 22;
    const items = its(sp), n = items.length, indStep = n <= 4 ? 90 : 64, pre = 64;
    const w = G.CW - indStep * (n - 1) - pre;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.95 }));
    const st = stack(pss, w, top, G.BOT, { gap: 24, maxK: 1.15, minH: 30, fill: 40 });
    items.forEach((it, i) => {
      const x = G.X0 + i * indStep, y = st.ys[i];
      o.push(Ln(x, y - st.gap / 2, G.X1 - x, 0, i === 0 ? c.tone.accent : c.tone.rule, { sw: i === 0 ? 1.5 : 0.75 }));
      o.push(T(x, y - 2, 56, 36, [tx.num(c, PM.pad2(i + 1), { size: 24, color: i === n - 1 ? c.tone.accent : K.SKY, sa: 0 })], { name: 'Number' }));
      const tb = PM.tk(x + pre, y, w, pss[i], st.k, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* S9 · many steps in two columns with numbered dots on short rails */
sdef('sx-two-col', 'مراحل بعمودين', {
  tags: ['مراحل', 'عمودين'],
  accepts: sp => isS(sp) && fitN(sp, 5, 7) && sp.maxItemWords <= 30 && noBul(sp) ? 0.78 + sB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = its(sp), n = items.length, per = Math.ceil(n / 2), gx = 60, cw = (G.CW - gx) / 2, d = 30, pre = 50;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.95 }));
    const rh = (G.BOT - top) / per;
    const k = PM.groupK(pss.map(ps => ({ w: cw - pre, h: rh - 24, ps })), 1.15);
    const hs = pss.map(ps => Math.max(PM.hK(ps, cw - pre, k), d));
    const rowH = Math.min(rh, Math.max(...hs) + 30);
    const y0 = place(top, G.BOT, rowH * per - 30, 0.42);
    for (let col = 0; col < 2; col++) {
      const cnt = col === 0 ? per : n - per;
      if (cnt > 1) o.push(Ln(G.X0 + col * (cw + gx) + d / 2, y0 + d / 2, 0, (cnt - 1) * rowH, c.tone.rule, { sw: 1.2, name: 'Rail' }));
    }
    items.forEach((it, i) => {
      const col = Math.floor(i / per), r = i % per;
      const x = G.X0 + col * (cw + gx), y = y0 + r * rowH;
      dot(o, c, x, y, d, String(i + 1));
      const tb = PM.tk(x + pre, y + 3, cw - pre, pss[i], k, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* S10 · two-tone: tinted upper band with the header, steps straddle the band edge */
sdef('sx-band-edge', 'مراحل على حافة شريط ملوّن', {
  tags: ['مراحل', 'شريط'],
  accepts: sp => isS(sp) && fitN(sp, 3, 6) && sp.maxItemWords <= (sp.n >= 6 ? 18 : 26) && noBul(sp) ? 0.78 + sB(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 34;
    const items = its(sp), n = items.length, gx = n >= 6 ? 16 : 26, cw = (G.CW - gx * (n - 1)) / n, d = 44;
    const pss = items.map((it, i) => ips(c, it, i, { k: n >= 6 ? 0.9 : 0.96 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - d - 24, ps })), 1.15);
    const bh = Math.max(...pss.map(ps => PM.hK(ps, cw, k)));
    const total = d + 24 + bh;
    const y0 = place(top, G.BOT, total, 0.5);
    under(o, R(0, 0, W, y0 + d / 2, pale(c), { role: 'bg', lock: true, name: 'Band' }));
    o.push(Ln(G.X0, y0 + d / 2, G.CW, 0, c.dark ? K.SKY : K.BLUE, { sw: 1.2, name: 'Edge' }));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      dot(o, c, x, y0, d, PM.pad2(i + 1), c.dark ? K.SKY : K.NAVY, c.dark ? K.NAVY : K.WHITE);
      const tb = PM.tk(x, y0 + d + 24, cw, pss[i], k, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* ======================================================================
   TIMELINE
   ====================================================================== */
const tdef = (id, name, o) => PM.def('timeline', id, name, Object.assign({ forms: ['timeline'] }, o));
const isTL = sp => !sp.multi && sp.form === 'timeline' && sp.n >= 2 && sp.n <= 8;

/* T1 · bold bar with pill date labels sitting on it */
tdef('tx-bar-pills', 'شريط زمني بتواريخ كبسولية', {
  tags: ['خط زمني', 'كبسولات'],
  accepts: sp => isTL(sp) && fitN(sp, 3, 6) && sp.maxItemWords <= 24 ? 0.84 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 34;
    const items = sp.items, n = items.length, gx = n >= 6 ? 14 : 22, cw = (G.CW - gx * (n - 1)) / n;
    const lk = longDates(sp);
    const dps2 = items.map((it, i) => [dateP(c, it, i, n >= 6 ? 14 : 16, K.WHITE, { al: 'c', lk: 0.95 })]);
    const natW = Math.max(...dps2.map(ps => PM.textW(ps[0].t, ps[0], ps[0].size)));
    const pw = Math.min(cw - 4, natW + 32);
    const dk = PM.groupK(dps2.map(ps => ({ w: pw - 20, h: 40, ps })), 1);
    const ph = Math.max(...dps2.map(ps => PM.hK(ps, pw - 20, dk))) + 16;
    const pss = items.map((it, i) => tps(c, it, i, { k: n >= 6 ? 0.9 : 0.96 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - ph - 30, ps })), 1.15);
    const bh = Math.max(...pss.map(ps => PM.hK(ps, cw, k)));
    const total = ph + 28 + bh;
    const y0 = place(top, G.BOT, total, 0.45);
    o.push(R(G.X0 - 10, y0 + ph / 2 - 3, G.CW + 20, 6, c.dark ? K.SKY : K.NAVY, { r: 3, name: 'Bar' }));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      const last = i === n - 1;
      o.push(R(x, y0, pw, ph, last ? K.SKY : (c.dark ? K.BLUE : K.BLUE), { r: ph / 2, name: 'Pill' }));
      const dp = PM.tk(x + 10, y0, pw - 20, dps2[i], dk, { h: ph, va: 'm', align: 'center', name: 'Date ' + (i + 1) });
      if (dp) { if (last) dp.paras.forEach(p => { p.color = K.NAVY; }); o.push(dp); }
      const tb = PM.tk(x, y0 + ph + 28, cw - 4, pss[i], k, { name: 'Milestone ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* T2 · years as huge tinted numerals */
tdef('tx-ghost-years', 'سنوات ضخمة باهتة', {
  tags: ['خط زمني', 'سنوات', 'تحريري'],
  accepts: sp => isTL(sp) && fitN(sp, 2, 4) && isYears(sp) && sp.maxItemWords <= 30 ? 0.84 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 22;
    const items = sp.items, n = items.length, gx = 36, cw = (G.CW - gx * (n - 1)) / n;
    let ys = n <= 2 ? 120 : n === 3 ? 96 : 76;
    while (ys > 40 && PM.textW('2030', { font: 'num' }, ys) > cw + 6) ys -= 4;
    const pss = items.map((it, i) => tps(c, it, i));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - ys - 34, ps })), 1.22);
    const bh = Math.max(...pss.map(ps => PM.hK(ps, cw, k)));
    const total = ys + 30 + bh;
    const y0 = place(top, G.BOT, total, 0.42);
    o.push(Ln(G.X0, y0 + ys + 12, G.CW, 0, c.tone.rule, { name: 'Axis' }));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx), last = i === n - 1;
      o.push(T(x - 3, y0, cw + 6, ys * 1.05, [dateP(c, it, i, ys, last ? c.tone.accent : ghostInk(c), { sa: 0 })], { name: 'Year', fit: false }));
      o.push(E(x, y0 + ys + 8, 9, 9, last ? c.tone.accent : K.SKY));
      const tb = PM.tk(x, y0 + ys + 30, cw, pss[i], k, { name: 'Milestone ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* T3 · milestones over a photo band */
tdef('tx-photo-band', 'خط زمني على شريط صورة', {
  tags: ['خط زمني', 'صورة'],
  accepts: sp => isTL(sp) && fitN(sp, 3, 6) && sp.maxItemWords <= 20 && !sp.lead ? 0.8 + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    const bandH = 258;
    PM.chrome(c, o, { noLogo: true, noBar: true });
    PM.photoBlock(c, sp, o, 0, 0, W, bandH, { veil: 'down', a0: 55, a1: 90 });
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    const hp = [];
    if (sp.eyebrow) hp.push(tx.eyebrow(c, sp.eyebrow, { color: K.SKY, bind: 'eyebrow' }));
    if (sp.title) hp.push(tx.title(c, sp.title, { color: K.WHITE, bind: 'title' }));
    if (sp.sub) hp.push(tx.sub(c, sp.sub, { color: 'C9D6E8', bind: 'sub' }));
    o.push(T(G.X0, 56, G.CW, 96, hp, { name: 'Title', minK: 0.7 }));
    const items = sp.items, n = items.length, gx = n >= 6 ? 14 : 22, cw = (G.CW - gx * (n - 1)) / n;
    const dps2 = items.map((it, i) => [dateP(c, it, i, n >= 6 ? 18 : 22, K.WHITE, { lk: 1 })]);
    const dk = PM.groupK(dps2.map(ps => ({ w: cw, h: 50, ps })), 1);
    const dh = Math.max(...dps2.map(ps => PM.hK(ps, cw, dk)));
    const ly = bandH - 30;
    o.push(Ln(G.X0 - 10, ly, G.CW + 20, 0, 'FFFFFF', { sw: 1, name: 'Timeline' }));
    const pss = items.map((it, i) => tps(c, it, i, { k: n >= 6 ? 0.9 : 0.96 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw - 4, h: G.BOT - bandH - 30, ps })), 1.15);
    const bh = Math.max(...pss.map(ps => PM.hK(ps, cw - 4, k)));
    const y1 = place(bandH + 26, G.BOT, bh, 0.35);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      const dp = PM.tk(x, ly - 14 - dh, cw, dps2[i], dk, { name: 'Date ' + (i + 1) }); if (dp) o.push(dp);
      o.push(E(x, ly - 5, 10, 10, K.SKY));
      const tb = PM.tk(x, y1, cw - 4, pss[i], k, { name: 'Milestone ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* T4 · centre spine, dates on one side, milestones on the other, alternating */
tdef('tx-spine', 'خط زمني مركزي متناوب', {
  tags: ['خط زمني', 'عمودي', 'متناوب'],
  accepts: sp => isTL(sp) && fitN(sp, 3, 6) && sp.maxItemWords <= 22 && !sp.lead ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, { align: 'center' }) + 20;
    const items = sp.items, n = items.length, cx = W / 2, cw = 320, gap = 30;
    const pss = items.map((it, i) => tps(c, it, i, { k: 0.95 }));
    const dps2 = items.map((it, i) => [dateP(c, it, i, 24, c.tone.accent)]);
    const rh = (G.BOT - top) / n;
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: rh - 10, ps })), 1.12);
    const hs = items.map((_, i) => Math.max(PM.hK(pss[i], cw, k), PM.hK(dps2[i], cw, 1), 24));
    const g2 = Math.max(10, Math.min(26, (G.BOT - top - sum(hs)) / Math.max(1, n - 1)));
    const total = sum(hs) + g2 * (n - 1);
    let y = place(top, G.BOT, total, 0.4);
    o.push(Ln(cx, y, 0, total, c.tone.rule, { sw: 1.5, name: 'Spine' }));
    items.forEach((it, i) => {
      const left = i % 2 === 0;
      o.push(E(cx - 6, y + 7, 12, 12, i === n - 1 ? c.tone.accent : K.SKY));
      const tx0 = left ? cx - gap - cw : cx + gap, dx0 = left ? cx + gap : cx - gap - cw;
      const tb = PM.tk(tx0, y, cw, pss[i], k, { name: 'Milestone ' + (i + 1) });
      if (tb) { tb.paras.forEach(p => { p.al = left ? 'r' : 'l'; }); o.push(tb); }
      const db = PM.tk(dx0, y + 1, cw, dps2[i], 1, { name: 'Date ' + (i + 1) });
      if (db) { db.paras.forEach(p => { p.al = left ? 'l' : 'r'; }); o.push(db); }
      y += hs[i] + g2;
    });
    return o;
  }
});

/* T5 · date column on a tinted panel running edge to edge, hairline rows */
tdef('tx-date-panel', 'تواريخ على لوحة جانبية', {
  tags: ['خط زمني', 'صفوف', 'لوحة'],
  accepts: sp => isTL(sp) && fitN(sp, 3, 8) && sp.maxItemWords <= (sp.n >= 7 ? 18 : 30) ? 0.81 + (sp.n >= 6 ? 0.03 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o, { lw: 560 }) + 24;
    const items = sp.items, n = items.length;
    const lk = longDates(sp);
    const dw = lk ? 190 : 150, x1 = G.X0 + dw + 36, w1 = G.X1 - x1;
    const titled = items.every(it => it.title && it.text);
    const tW = titled ? Math.min(250, w1 * 0.4) : 0, bx = x1 + (titled ? tW + 26 : 0), bw = G.X1 - bx;
    const tps2 = items.map((it, i) => titled ? [tx.h(c, it.title, { bind: bindOf(i) + 'title', sa: 0 })] : tps(c, it, i));
    const bps = items.map((it, i) => titled ? [tx.body(c, it.text, { bind: bindOf(i) + 'text' })] : []);
    const dps2 = items.map((it, i) => [dateP(c, it, i, n >= 7 ? 18 : n >= 5 ? 21 : 24, c.tone.accent, { lk: 1 })]);
    const rowAvail = (G.BOT - top) / n - 16;
    let k = PM.groupK(tps2.map(ps => ({ w: titled ? tW : w1, h: rowAvail, ps })), 1.15);
    if (titled) k = Math.min(k, PM.groupK(bps.map(ps => ({ w: bw, h: rowAvail, ps })), 1.15));
    const hs = items.map((_, i) => Math.max(PM.hK(tps2[i], titled ? tW : w1, k), PM.hK(bps[i], bw, k), PM.hK(dps2[i], dw - 20, 1)));
    const gap = Math.max(14, Math.min(30, (G.BOT - top - sum(hs)) / Math.max(1, n - 1)));
    const total = sum(hs) + gap * (n - 1);
    const y0 = place(top, G.BOT, total, 0.42);
    under(o, R(0, y0 - 22, G.X0 + dw, total + 44, pale(c), { role: 'bg', name: 'Date panel', r: 0 }));
    let y = y0;
    items.forEach((it, i) => {
      if (i > 0) o.push(Ln(x1, y - gap / 2, G.X1 - x1, 0, c.tone.rule));
      const db = PM.tk(G.X0 + 6, y, dw - 26, dps2[i], 1, { name: 'Date ' + (i + 1) }); if (db) o.push(db);
      o.push(R(G.X0 + dw - 2, y + 6, 4, 14, i === n - 1 ? c.tone.accent : K.SKY, { r: 2 }));
      const t1 = PM.tk(x1, y, titled ? tW : w1, tps2[i], k, { name: 'Milestone ' + (i + 1) }); if (t1) o.push(t1);
      if (titled) { const t2 = PM.tk(bx, y + 1, bw, bps[i], k, { name: 'Detail ' + (i + 1) }); if (t2) o.push(t2); }
      y += hs[i] + gap;
    });
    return o;
  }
});

/* T6 · long timelines on two parallel lines */
tdef('tx-two-row', 'خط زمني بصفين', {
  tags: ['خط زمني', 'صفين'],
  accepts: sp => isTL(sp) && fitN(sp, 5, 8) && sp.maxItemWords <= (sp.n >= 7 ? 16 : 20) ? 0.81 + (sp.n >= 7 ? 0.05 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 24;
    const items = sp.items, n = items.length, a = Math.ceil(n / 2), gx = 22, cw = (G.CW - gx * (a - 1)) / a;
    const dps2 = items.map((it, i) => [dateP(c, it, i, 18, c.tone.accent, { lk: 1 })]);
    const dk = PM.groupK(dps2.map(ps => ({ w: cw, h: 44, ps })), 1);
    const dh = Math.max(...dps2.map(ps => PM.hK(ps, cw, dk)));
    const pss = items.map((it, i) => tps(c, it, i, { k: 0.9 }));
    const rowAvail = (G.BOT - top - 2 * (dh + 30) - 30) / 2;
    const k = PM.groupK(pss.map(ps => ({ w: cw - 6, h: rowAvail, ps })), 1.12);
    const hA = Math.max(...pss.slice(0, a).map(ps => PM.hK(ps, cw - 6, k))), hB = Math.max(...pss.slice(a).map(ps => PM.hK(ps, cw - 6, k)));
    const rowA = dh + 30 + hA, rowB = dh + 30 + hB, gy = 36;
    const y0 = place(top, G.BOT, rowA + gy + rowB, 0.45);
    [[0, a, y0], [a, n, y0 + rowA + gy]].forEach(([s, e, yy]) => {
      const ly = yy + dh + 12;
      o.push(Ln(G.X0 - 10, ly, G.CW + 20, 0, c.tone.rule, { sw: 1.2, name: 'Timeline' }));
      for (let i = s; i < e; i++) {
        const x = G.X0 + (i - s) * (cw + gx);
        const db = PM.tk(x, yy, cw, dps2[i], dk, { name: 'Date ' + (i + 1) }); if (db) o.push(db);
        o.push(E(x, ly - 5, 10, 10, i === n - 1 ? c.tone.accent : K.SKY));
        const tb = PM.tk(x, ly + 18, cw - 6, pss[i], k, { name: 'Milestone ' + (i + 1) }); if (tb) o.push(tb);
      }
    });
    return o;
  }
});

/* T7 · the destination: past milestones on a line lead to a highlighted final card */
tdef('tx-destination', 'محطات نحو هدف مميز', {
  tags: ['خط زمني', 'هدف', 'مميز'],
  accepts: sp => isTL(sp) && fitN(sp, 3, 5) && sp.maxItemWords <= 20 ? 0.8 + (/(2030|رؤية|vision|نحو|towards|road)/i.test(sp.title + ' ' + (sp.items[sp.n - 1].value || '')) ? 0.06 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const items = sp.items, n = items.length, fw = n >= 5 ? 230 : 260, gx = 18, pad = 26;
    const rx = G.X0, rw = G.CW - fw - 30, m = n - 1, cw = (rw - gx * (m - 1)) / m;
    const dps2 = items.map((it, i) => [dateP(c, it, i, i === m ? 34 : (m >= 5 ? 15 : 18), i === m ? (c.dark ? K.NAVY : K.SKY) : c.tone.accent, { lk: i === m ? 1.25 : 1 })]);
    const dk = PM.groupK(dps2.slice(0, m).map(ps => ({ w: cw, h: 44, ps })), 1);
    const dh = Math.max(...dps2.slice(0, m).map(ps => PM.hK(ps, cw, dk)));
    const pss = items.map((it, i) => tps(c, it, i, { k: i === m ? 1.08 : 0.92 }));
    const k = PM.groupK(pss.slice(0, m).map(ps => ({ w: cw - 4, h: G.BOT - top - dh - 40, ps })), 1.12);
    const bh = Math.max(...pss.slice(0, m).map(ps => PM.hK(ps, cw - 4, k)));
    const fdw = fw - pad * 2 - 30;
    { const p0 = dps2[m][0]; while (p0.size > 18 && PM.textW(p0.t, p0, p0.size) > fdw) p0.size -= 1; }
    const fk = PM.groupK([{ w: fw - pad * 2, h: G.BOT - top - pad * 2 - 60, ps: pss[m] }], 1.15);
    const fdh = PM.hK(dps2[m], fdw, 1);
    const fh = Math.max(PM.hK(pss[m], fw - pad * 2, fk) + fdh + pad * 2 + 18, dh + 30 + bh + 20, 200);
    const y0 = place(top, G.BOT, fh, 0.45);
    const ly = y0 + 34 + dh;
    const ty = ly - 18 - dh;
    o.push(Ln(rx, ly, rw + 30, 0, c.tone.rule, { sw: 1.5, name: 'Timeline' }));
    for (let i = 0; i < m; i++) {
      const x = rx + i * (cw + gx);
      const db = PM.tk(x, ty, cw, dps2[i], dk, { name: 'Date ' + (i + 1) }); if (db) o.push(db);
      o.push(E(x, ly - 5, 10, 10, K.SKY));
      const tb = PM.tk(x, ly + 22, cw - 4, pss[i], k, { name: 'Milestone ' + (i + 1) }); if (tb) o.push(tb);
    }
    const fx = G.X1 - fw;
    o.push(R(fx, y0, fw, fh, c.dark ? K.SKY : K.NAVY, { r: 16, name: 'Destination' }));
    o.push(Ic(fx + fw - pad - 24, y0 + pad, 24, 'lib:flag', c.dark ? K.NAVY : K.SKY, { sw: 1.6, name: 'Flag' }));
    const fps = [...dps2[m].map(p => Object.assign({}, p, { sa: 14 })), ...pss[m]];
    const ft = PM.tk(fx + pad, y0 + pad, fdw, [dps2[m][0]], 1, { name: 'Date ' + n }); if (ft) o.push(ft);
    const fb = PM.tk(fx + pad, y0 + fh - pad - PM.hK(pss[m], fw - pad * 2, fk), fw - pad * 2, pss[m], fk, { name: 'Milestone ' + n });
    if (fb) o.push(recolor(fb, c.dark ? K.NAVY : K.WHITE, c.dark ? '0B2E5C' : 'D5E1F0'));
    void fps;
    return o;
  }
});

/* T8 · period cards: pill headers above tinted cards, one or two rows */
tdef('tx-period-cards', 'بطاقات فترات زمنية', {
  tags: ['خط زمني', 'بطاقات', 'فترات'],
  accepts: sp => isTL(sp) && fitN(sp, 3, 8) && sp.maxItemWords <= (sp.n >= 6 ? 18 : 26) ? 0.8 + (longDates(sp) ? 0.06 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = sp.items, n = items.length, cols = n <= 5 ? n : Math.ceil(n / 2), rows = Math.ceil(n / cols);
    const gx = 14, gy = 16, cw = (G.CW - gx * (cols - 1)) / cols, pad = 18;
    const dps2 = items.map((it, i) => [dateP(c, it, i, 16, c.dark ? K.NAVY : K.WHITE, { lk: 1 })]);
    const dk = PM.groupK(dps2.map(ps => ({ w: cw - pad * 2, h: 40, ps })), 1);
    const dh = Math.max(...dps2.map(ps => PM.hK(ps, cw - pad * 2, dk))) + 16;
    const pss = items.map((it, i) => tps(c, it, i, { k: 0.92 }));
    const maxCH = (G.BOT - top - gy * (rows - 1)) / rows;
    const k = PM.groupK(pss.map(ps => ({ w: cw - pad * 2, h: maxCH - dh - pad * 2, ps })), 1.12);
    const need = dh + pad * 2 + Math.max(...pss.map(ps => PM.hK(ps, cw - pad * 2, k)));
    const ch = Math.min(maxCH, Math.max(need + 6, maxCH * (rows > 1 ? 0.82 : 0.66)));
    const y0 = place(top, G.BOT, ch * rows + gy * (rows - 1), 0.45);
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), inRow = r === rows - 1 ? n - r * cols : cols;
      const off = (cols - inRow) * (cw + gx) / 2;
      const x = G.X0 + off + (i % cols) * (cw + gx), y = y0 + r * (ch + gy);
      o.push(R(x, y, cw, ch, c.tone.cardFill, { r: 14, name: 'Card' }));
      o.push(R(x, y, cw, dh, c.dark ? K.SKY : K.BLUE, { r: 14, name: 'Period' }));
      o.push(R(x, y + dh - 14, cw, 14, c.dark ? K.SKY : K.BLUE, { name: 'Period' }));
      const db = PM.tk(x + pad, y, cw - pad * 2, dps2[i], dk, { h: dh, va: 'm', name: 'Date ' + (i + 1) }); if (db) o.push(db);
      const tb = PM.tk(x + pad, y + dh + pad, cw - pad * 2, pss[i], k, { name: 'Milestone ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* ======================================================================
   BULLETS
   ====================================================================== */
const bdef = (id, name, o) => PM.def('bullets', id, name, Object.assign({ forms: ['bullets'] }, o));
const isB = sp => !sp.multi && sp.form === 'bullets' && sp.n >= 2 && sp.n <= 10;

/* B1 · two-tone split: the list continues across a white half and a navy half */
bdef('bx-twotone', 'نقاط على لوحتين بلونين', {
  tags: ['نقاط', 'لوحة', 'عمودين'],
  accepts: sp => isB(sp) && fitN(sp, 4, 10) && sp.words <= 150 && !sp.lead ? 0.78 + (sp.n >= 6 ? 0.04 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const sx = W / 2 + 10;
    under(o, R(sx, 0, W - sx, H, deep(c), { role: 'bg', lock: true, name: 'Panel' }));
    const top = PM.head(c, sp, o, { w: sx - G.X0 - 40 }) + 26;
    const items = bText(sp), n = items.length, a = Math.ceil(n / 2);
    const lw = sx - G.X0 - 44, rx = sx + 44, rw = G.X1 + 10 - rx;
    const la = items.slice(0, a).map((t, i) => bP(c, t, i, { bullet: 'dot', sa: 14, cap: c.en ? 18 : 22 }));
    const lb = items.slice(a).map((t, j) => bP(c, t, a + j, { bullet: 'dot', sa: 14, color: K.WHITE, bc: K.SKY, cap: c.en ? 18 : 22 }));
    const k = PM.groupK([{ w: lw, h: G.BOT - top, ps: la }, { w: rw, h: G.BOT - 90, ps: lb }], 1.2);
    const ha = PM.hK(la, lw, k), hb = PM.hK(lb, rw, k);
    const t1 = PM.tk(G.X0, place(top, G.BOT, ha, 0.4), lw, la, k, { name: 'List 1' }); if (t1) o.push(t1);
    const y2 = Math.max(90, place(top, G.BOT, hb, 0.4));
    o.push(T(rx, y2 - 34, 120, 20, [tx.num(c, PM.pad2(a + 1) + '—' + PM.pad2(n), { size: 11, color: K.SKY, sa: 0 })], { name: 'Range' }));
    const t2 = PM.tk(rx, y2, rw, lb, k, { name: 'List 2' }); if (t2) o.push(t2);
    o.push(T(G.X0, place(top, G.BOT, ha, 0.4) - 34, 120, 20, [tx.num(c, PM.pad2(1) + '—' + PM.pad2(a), { size: 11, color: c.tone.accent, sa: 0 })], { name: 'Range' }));
    return o;
  }
});

/* B2 · key takeaway: first point set large, the rest small in columns beneath */
bdef('bx-takeaway', 'خلاصة رئيسية + نقاط', {
  tags: ['نقاط', 'خلاصة', 'مميز'],
  accepts: sp => isB(sp) && fitN(sp, 4, 8) && PM.words(bText(sp)[0]) <= 18 && sp.words <= 130 ? 0.8 + (/(خلاص|أهم|key|takeaway|priorit|أولوي)/i.test(sp.title) ? 0.05 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = bText(sp), n = items.length, rest = items.slice(1), m = rest.length;
    const cols = m <= 3 ? m : m === 4 ? 2 : 3, per = Math.ceil(m / cols), gx = 36, cw = (G.CW - gx * (cols - 1)) / cols;
    const kp = [tx.title(c, items[0], { bind: bindOf(0) + 'text', size: c.Z.title * 1.1, color: c.tone.title })];
    const kk = PM.groupK([{ w: G.CW - 60, h: 120, ps: kp }], 1.05);
    const kh = PM.hK(kp, G.CW - 60, kk);
    const groups = []; for (let g = 0; g < cols; g++) groups.push(rest.slice(g * per, (g + 1) * per).map((t, j) => bP(c, t, 1 + g * per + j, { size: c.Z.body * 1.1, color: c.tone.body, bullet: 'dot', sa: 12, cap: c.en ? 16.5 : 20.5 })));
    const k = PM.groupK(groups.map(ps => ({ w: cw, h: G.BOT - top - kh - 70, ps })), 1.2);
    const lh = Math.max(...groups.map(ps => PM.hK(ps, cw, k)));
    const total = 34 + kh + 34 + lh;
    const y0 = place(top, G.BOT, total, 0.42);
    o.push(T(G.X0, y0, 200, 22, [tx.cap(c, c.en ? 'Key takeaway' : 'الخلاصة', { color: c.tone.accent })], { name: 'Label' }));
    o.push(R(G.X0, y0 + 26, 40, 3, K.SKY, { name: 'Accent' }));
    const tk = PM.tk(G.X0, y0 + 34, G.CW - 60, kp, kk, { name: 'Key point' }); if (tk) o.push(tk);
    const ly = y0 + 34 + kh + 18;
    o.push(Ln(G.X0, ly, G.CW, 0, c.tone.rule));
    groups.forEach((ps, g) => { const tb = PM.tk(G.X0 + g * (cw + gx), ly + 18, cw, ps, k, { name: 'List ' + (g + 1) }); if (tb) o.push(tb); });
    return o;
  }
});

/* B3 · a big quote mark carries the first point, the list follows on the other side */
bdef('bx-quote', 'نقطة مقتبسة + قائمة', {
  tags: ['نقاط', 'اقتباس', 'مميز'],
  accepts: sp => isB(sp) && fitN(sp, 3, 7) && PM.words(bText(sp)[0]) <= 20 && sp.words <= 110 ? 0.78 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 22;
    const items = bText(sp), n = items.length;
    const lw = 360, rx = G.X0 + lw + 64, rw = G.X1 - rx;
    const kp = [tx.title(c, items[0], { bind: bindOf(0) + 'text', size: c.Z.quote * 0.95, color: c.tone.title, lh: 1.35 })];
    const kk = PM.groupK([{ w: lw, h: G.BOT - top - 90, ps: kp }], 1.1);
    const kh = 86 + PM.hK(kp, lw, kk);
    const rest = items.slice(1).map((t, j) => bP(c, t, j + 1, { sa: 0 }));
    const st = stack(rest.map(p => [p]), rw, top, G.BOT, { gap: 28, maxK: 1.15, fill: 40 });
    const total = Math.max(kh, st.total);
    const y0 = place(top, G.BOT, total, 0.42);
    const ky = y0 + (total - kh) / 2;
    o.push(T(G.X0 - 4, ky - 10, 100, 96, [P('“', 110, { font: 'num', color: K.SKY, lh: 1 })], { name: 'Quote mark', fit: false }));
    const tk = PM.tk(G.X0, ky + 86, lw, kp, kk, { name: 'Key point' }); if (tk) o.push(tk);
    o.push(Ln(G.X0 + lw + 32, y0, 0, total, c.tone.rule));
    const dy = y0 + (total - st.total) / 2 - st.y0;
    rest.forEach((p, j) => {
      const y = st.ys[j] + dy;
      if (j > 0) o.push(Ln(rx, y - st.gap / 2, rw, 0, c.tone.rule));
      const tb = PM.tk(rx, y, rw, [p], st.k, { name: 'Point ' + (j + 2) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* B4 · numbered checklist: completed points muted with ticks, the next point highlighted, the rest open */
bdef('bx-checklist', 'قائمة إنجاز مع الخطوة التالية', {
  tags: ['نقاط', 'تحقق', 'حالة'],
  accepts: sp => isB(sp) && fitN(sp, 4, 8) && sp.words <= 110 ? 0.74 + (/(متطلب|شروط|تحقق|checklist|إنجاز|progress|status|حالة|متابعة)/i.test(sp.title) ? 0.16 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 22;
    const items = bText(sp), n = items.length, done = Math.max(1, Math.floor(n / 3)), next = done;
    const pre = 56, padX = 20;
    const pss = items.map((t, i) => [bP(c, t, i, { color: i < done ? c.tone.muted : i === next ? (c.dark ? K.NAVY : K.WHITE) : c.tone.title, cap: c.en ? 18 : 22 })]);
    const w = G.CW - pre - padX * 2;
    const st = stack(pss, w, top, G.BOT, { gap: n >= 7 ? 16 : 22, maxK: 1.2, minH: 24, pad: 6, fill: n >= 7 ? 26 : 40 });
    items.forEach((t, i) => {
      const y = st.ys[i];
      if (i === next) o.push(R(G.X0, y - st.gap / 2 + 2, G.CW, st.hs[i] + st.gap - 4, c.dark ? K.SKY : K.NAVY, { r: 12, name: 'Next' }));
      else if (i > 0 && i !== next + 1) o.push(Ln(G.X0 + padX, y - st.gap / 2, G.CW - padX * 2, 0, c.tone.rule));
      const iy = y + st.hs[i] / 2 - 11;
      if (i < done) o.push(Ic(G.X0 + padX, iy, 22, 'lib:circle-check', K.SKY, { sw: 1.6, name: 'Done' }));
      else if (i === next) o.push(Ic(G.X0 + padX, iy, 22, 'lib:arrow-right', c.dark ? K.NAVY : K.SKY, { sw: 2, flipRtl: true, name: 'Next' }));
      else o.push(T(G.X0 + padX - 2, iy + 1, 34, 20, [tx.num(c, PM.pad2(i + 1), { size: 12, color: c.tone.accent, sa: 0 })], { name: 'Number' }));
      const tb = PM.tk(G.X0 + padX + pre, y, w, pss[i], st.k, { name: 'Point ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* B5 · points as a grid of icon tiles */
bdef('bx-tiles', 'نقاط بأيقونات في شبكة', {
  tags: ['نقاط', 'أيقونات', 'شبكة'],
  accepts: sp => isB(sp) && [4, 6, 8].includes(sp.n) && sp.items.every(it => PM.words(it.text || it.title) <= 14) ? 0.79 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const items = bText(sp), n = items.length, cols = n === 3 ? 3 : n === 4 ? 2 : n === 6 ? 3 : 4, rows = Math.ceil(n / cols);
    const gx = 34, gy = 34, cw = (G.CW - gx * (cols - 1)) / cols, s = 46;
    const pss = items.map((t, i) => [bP(c, t, i, { size: c.Z.lead * 0.82, cap: c.en ? 17 : 21 })]);
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: (G.BOT - top - gy * (rows - 1)) / rows - s - 18, ps })), 1.16);
    const rh = s + 18 + Math.max(...pss.map(ps => PM.hK(ps, cw, k)));
    const y0 = place(top, G.BOT, rh * rows + gy * (rows - 1), 0.42);
    items.forEach((t, i) => {
      const r = Math.floor(i / cols), x = G.X0 + (i % cols) * (cw + gx), y = y0 + r * (rh + gy);
      tile(o, c, x, y, s, PM.iconOf(c, { title: t }, i), bindOf(i) + 'icon');
      const tb = PM.tk(x, y + s + 18, cw, pss[i], k, { name: 'Point ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* B6 · huge pale numerals in the margin */
bdef('bx-margin-num', 'نقاط بأرقام ضخمة', {
  tags: ['نقاط', 'أرقام', 'تحريري'],
  accepts: sp => isB(sp) && fitN(sp, 2, 5) && sp.words <= 80 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 22;
    const items = bText(sp), n = items.length, nw = 120, x1 = G.X0 + nw, w1 = G.X1 - x1 - 40;
    const pss = items.map((t, i) => [bP(c, t, i, { size: c.Z.lead, cap: c.en ? 22 : 26 })]);
    const st = stack(pss, w1, top, G.BOT, { gap: 26, maxK: 1.2, minH: 52, fill: 48 });
    const ns = 56;
    items.forEach((t, i) => {
      const y = st.ys[i];
      if (i > 0) o.push(Ln(G.X0, y - st.gap / 2, G.CW, 0, c.tone.rule));
      o.push(T(G.X0 - 4, y + st.hs[i] / 2 - ns * 0.55, nw - 10, ns * 1.1, [tx.num(c, PM.pad2(i + 1), { size: ns, color: ghostInk(c), sa: 0, lh: 1 })], { name: 'Numeral', fit: false }));
      const tb = PM.tk(x1, y + Math.max(0, (st.hs[i] - PM.hK(pss[i], w1, st.k)) / 2), w1, pss[i], st.k, { name: 'Point ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* B7 · photo band across the top, the list in columns below */
bdef('bx-photo-band', 'شريط صورة + نقاط', {
  tags: ['نقاط', 'صورة'],
  accepts: sp => isB(sp) && fitN(sp, 3, 8) && sp.words <= 100 && !sp.lead && !sp.sub ? 0.77 + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    const bandH = 196;
    PM.chrome(c, o, { noLogo: true, noBar: true });
    PM.photoBlock(c, sp, o, 0, 0, W, bandH, { veil: 'up', a0: 88, a1: 10 });
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    const hp = [];
    if (sp.eyebrow) hp.push(tx.eyebrow(c, sp.eyebrow, { color: K.SKY, bind: 'eyebrow' }));
    if (sp.title) hp.push(tx.title(c, sp.title, { color: K.WHITE, bind: 'title' }));
    o.push(T(G.X0, bandH - 112, G.CW, 90, hp, { va: 'b', name: 'Title', minK: 0.7 }));
    const items = bText(sp), n = items.length, cols = n <= 3 ? 1 : 2, per = Math.ceil(n / cols), gx = 52, cw = (G.CW - gx * (cols - 1)) / cols;
    const groups = []; for (let g = 0; g < cols; g++) groups.push(items.slice(g * per, (g + 1) * per).map((t, j) => bP(c, t, g * per + j, { bullet: 'dot', sa: 12, cap: c.en ? 18 : 22 })));
    const top = bandH + 30;
    const k = PM.groupK(groups.map(ps => ({ w: cw, h: G.BOT - top, ps })), 1.2);
    const h = Math.max(...groups.map(ps => PM.hK(ps, cw, k)));
    const y0 = place(top, G.BOT, h, 0.4);
    groups.forEach((ps, g) => { const tb = PM.tk(G.X0 + g * (cw + gx), y0, cw, ps, k, { name: 'List ' + (g + 1) }); if (tb) o.push(tb); });
    if (cols > 1) o.push(Ln(G.X0 + cw + gx / 2, y0, 0, h, c.tone.rule));
    return o;
  }
});

/* B8 · newspaper flow: three columns with hairline separators, accent numbers */
bdef('bx-columns', 'نقاط بثلاثة أعمدة', {
  tags: ['نقاط', 'أعمدة'],
  accepts: sp => isB(sp) && fitN(sp, 6, 10) && sp.words <= 140 ? 0.79 + (sp.n >= 8 ? 0.04 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const items = bText(sp), n = items.length, cols = 3, per = Math.ceil(n / cols), gx = 44, cw = (G.CW - gx * (cols - 1)) / cols, pre = 36;
    const pss = items.map((t, i) => [bP(c, t, i, { size: c.Z.body * 1.18, cap: c.en ? 16 : 20 })]);
    const rh = (G.BOT - top) / per;
    const k = PM.groupK(pss.map(ps => ({ w: cw - pre, h: rh - 22, ps })), 1.2);
    const hs = pss.map(ps => PM.hK(ps, cw - pre, k));
    const rowH = Math.min(rh, Math.max(...hs) + 26);
    const y0 = place(top, G.BOT, rowH * per, 0.42);
    for (let g = 1; g < cols; g++) o.push(Ln(G.X0 + g * (cw + gx) - gx / 2, y0, 0, rowH * per - 10, c.tone.rule));
    items.forEach((t, i) => {
      const col = Math.floor(i / per), r = i % per, x = G.X0 + col * (cw + gx), y = y0 + r * rowH;
      o.push(T(x, y + 1, 32, 20, [tx.num(c, PM.pad2(i + 1), { size: 12, color: K.SKY, sa: 0 })], { name: 'Number' }));
      const tb = PM.tk(x + pre, y, cw - pre, pss[i], k, { name: 'Point ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* B9 · centred stack of short statements with small accent dividers */
bdef('bx-center-stack', 'عبارات متمركزة', {
  tags: ['نقاط', 'مركز', 'عبارات'],
  accepts: sp => isB(sp) && fitN(sp, 2, 5) && !sp.lead && sp.items.every(it => PM.words(it.text || it.title) <= 12) ? 0.79 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, { align: 'center' }) + 26;
    const items = bText(sp), n = items.length, w = 640, x = (W - w) / 2;
    const pss = items.map((t, i) => [Object.assign(tx.h(c, t, { bind: bindOf(i) + 'text', size: c.Z.lead * 1.2, sa: 0, al: 'c', color: i === 0 ? c.tone.accent : c.tone.title }), { cap: c.en ? 22 : 27 })]);
    const st = stack(pss, w, top, G.BOT, { gap: 40, maxK: 1.15, fill: 56 });
    items.forEach((t, i) => {
      const y = st.ys[i];
      if (i > 0) o.push(R(W / 2 - 14, y - st.gap / 2 - 1.5, 28, 3, K.SKY, { r: 1.5, name: 'Divider' }));
      const tb = PM.tk(x, y, w, pss[i], st.k, { align: 'center', name: 'Statement ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});
})(window.PM);
