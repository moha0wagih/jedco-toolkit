/* ==========================================================================
   Gap layouts — content shapes found in real JEDCO decks that the other
   families refuse:
     gb-  items WITH sub-bullets (deliverables, workstreams, pillars …)
     gk-  numbers that each carry a sentence of description
     gs-  process steps with long descriptions (25–45 words)
     gm-  mixed content (para + items, kpis + bullets, items + table …)
     gq-  statement / quote extras
   Authored left-to-right, mirrored for Arabic by the engine. Every layout
   measures itself in accepts() and refuses content it cannot set cleanly.
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Ic, G, tx } = PM;
const place = (a, b, h, bias) => PM.place(a, b, h, bias);
const area = (c, sp, o, opt) => PM.itemsArea(c, sp, o, opt);
const sum = a => a.reduce((x, y) => x + y, 0);
const mx = a => Math.max(0, ...a);
const deep = c => (c.dark ? K.DEEP : K.NAVY);
const card = c => (c.dark ? '0C3470' : K.PALE);
const softRule = c => (c.dark ? K.RULE_D : 'D3DEEB');
const dotC = c => (c.dark ? K.SKY : K.BLUE);
const under = (o, ...s) => { o.splice(1, 0, ...s); };
const pageOn = (o, col) => o.forEach(ob => { if (ob.pageNum) ob.paras[0].color = col; });
const barTo = (o, y0, y1) => o.forEach(ob => { if (ob.name === 'Edge bar') { ob.y = y0; ob.h = Math.max(0, y1 - y0); } });

/* ---------- self-check: a layout only accepts what it can set cleanly ---------- */
const minBody = c => (c.en ? 11 : 11.75);
function fitsClean(render, sp, c) {
  if (!c || !c.Z) return true;
  let objs;
  try { objs = render(sp, c); } catch (e) { return false; }
  if (!objs || !objs.length) return false;
  const ts = objs.filter(o => o.t === 'text');
  if (ts.some(o => o.overflow)) return false;
  if (PM.overlapCount(objs)) return false;
  if (ts.some(o => o.x < -1 || o.x + o.w > W + 1 || o.y < -1 || o.y + Math.min(o.h, o.used || o.h) > H + 1)) return false;
  let mn = 99;
  ts.forEach(o => o.paras.forEach(p => { if (p.font !== 'num' && p.bind && /items|text|lead|rows/.test(p.bind) && String(p.t).trim()) mn = Math.min(mn, p.size); }));
  return mn >= minBody(c);
}
function gdef(fam, id, name, o) {
  const base = o.accepts;
  const L = PM.def(fam, id, name, Object.assign({ tones: ['light', 'dark'] }, o));
  L.accepts = (sp, c) => { const s = base(sp, c); if (!s) return 0; return fitsClean(L.render, sp, c) ? s : 0; };
  return L;
}
/* numbers never wrap: shrink the shared scale until every value sits on one line */
function oneLine(pss, w, k) { const one = (ps, kk) => ps.every(p => PM.hK([p], w, kk) <= p.size * kk * (p.lh || 1.1) * 1.2); while (k > 0.4 && !pss.every(ps => one(ps, k))) k -= 0.02; return k; }
/* lower k until a composed total height fits */
function fitTo(k, avail, total, floor = 0.6) { while (k > floor && total(k) > avail) k -= 0.02; return k; }

/* ---------- item paragraphs (title / text / bullet range) ---------- */
const bOf = (q, i) => (q.B || 'main.') + 'items.' + i + '.';
function titleP(c, it, i, q = {}) {
  if (!it.title) return [];
  return [tx.h(c, it.title, { bind: bOf(q, i) + 'title', sa: q.hsa || 0, size: q.hs, color: q.hc, al: q.al })];
}
function bodyPs(c, it, i, q = {}) {
  const B = bOf(q, i), ps = [];
  const bl = it.bullets || [];
  const from = q.from || 0, to = q.to == null ? bl.length : q.to;
  if (it.text && !q.noText) ps.push(tx.body(c, it.text, { size: q.ts || c.Z.body, color: q.tc || c.tone.body, bind: B + 'text', sa: to > from ? (q.tsa == null ? 9 : q.tsa) : 0, lh: 1.42 }));
  for (let j = from; j < to; j++) ps.push(tx.body(c, bl[j], { size: (q.bs || c.Z.body) * 0.97, color: q.bc || c.tone.body, bind: B + 'bullets.' + j, bullet: 'dot', sb: ps.length ? (q.bg == null ? 6 : q.bg) : 0, bc: q.dot || K.SKY, lh: 1.36 }));
  return ps;
}
const textPs = (c, it, i, q = {}) => (it.text ? [tx.body(c, it.text, { size: q.ts || c.Z.body, color: q.tc || c.tone.body, bind: bOf(q, i) + 'text', lh: 1.42 })] : []);
const bulPs = (c, it, i, from, to, q = {}) => bodyPs(c, Object.assign({}, it, { text: '' }), i, Object.assign({}, q, { from, to }));
const nBul = it => (it.bullets || []).length;
const maxBul = sp => mx(sp.items.map(nBul));
const bulWords = sp => mx(sp.items.map(it => mx((it.bullets || []).map(PM.words))));
/* header paragraphs for side panels / photo bands */
function headPs(c, sp, q = {}) {
  const ps = [];
  if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: q.eb }));
  if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title', color: q.tc, size: q.ts }));
  if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub', color: q.sc }));
  if (sp.lead && q.lead !== false) ps.push(tx.body(c, sp.lead, { bind: 'lead', color: q.lc, sb: 14, size: c.Z.body * 1.05, lh: 1.5 }));
  return ps;
}
const num = (c, s, size, color) => tx.num(c, s, { size, color, sa: 0 });

/* ======================================================================
   ITEMS WITH SUB-BULLETS (gb-)
   ====================================================================== */
const isB = sp => !sp.multi && (sp.form === 'items' || sp.form === 'steps') && sp.hasBullets && sp.n >= 2 && sp.n <= 5 && maxBul(sp) <= 6;
const bdef = (id, name, o) => gdef('items', id, name, Object.assign({ forms: ['items'] }, o));
const stB = sp => (sp.form === 'items' ? 0 : -0.1);

/* B1 · deliverables: number, hairline header, title row aligned across columns, bullets beneath */
bdef('gb-deliver', 'مخرجات بأعمدة وخط علوي', {
  tags: ['نقاط فرعية', 'أعمدة', 'مخرجات'],
  accepts: sp => isB(sp) && sp.n <= 4 && sp.allTitled ? 0.88 + stB(sp) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o) + (c.dark ? 44 : 30);
    const items = sp.items, n = items.length, gx = n >= 4 ? 30 : 44, cw = (G.CW - gx * (n - 1)) / n;
    const hps = items.map((it, i) => titleP(c, it, i, { hs: c.Z.h * 1.1, hc: c.dark ? K.WHITE : t.title }));
    const bps = items.map((it, i) => bodyPs(c, it, i, { tc: t.muted }));
    const NUM = 24, HG = 14, BG = c.dark ? 44 : 22;
    let k = Math.min(1.25, PM.groupK(items.map((_, i) => ({ w: cw, h: G.BOT - top - NUM - HG - BG, ps: hps[i].concat(bps[i]) })), 1.25));
    const tot = kk => NUM + HG + mx(hps.map(ps => PM.hK(ps, cw, kk))) + BG + mx(bps.map(ps => PM.hK(ps, cw, kk)));
    k = fitTo(k, G.BOT - top, tot);
    const headH = mx(hps.map(ps => PM.hK(ps, cw, k)));
    const y0 = place(top, G.BOT, tot(k), 0.42);
    const headBot = y0 + NUM + HG + headH;
    if (c.dark) under(o, R(0, y0 - 24, W, headBot - y0 + 24 + 20, K.DEEP, { role: 'bg', name: 'Header band' }));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(T(x, y0 - 2, 60, 22, [num(c, PM.pad2(i + 1), 13, c.dark ? K.SKY : t.accent)], { name: 'Number' }));
      if (!c.dark) o.push(Ln(x, y0 + NUM, cw, 0, t.rule));
      o.push(R(x, y0 + NUM - 1.5, 34, 3, K.SKY, { name: 'Tick' }));
      const a = PM.tk(x, y0 + NUM + HG, cw, hps[i], k, { name: 'Title ' + (i + 1) }); if (a) o.push(a);
      const b = PM.tk(x, headBot + BG, cw, bps[i], k, { name: 'Bullets ' + (i + 1) }); if (b) o.push(b);
      if (c.dark && i > 0) o.push(Ln(x - gx / 2, headBot + BG, 0, mx(bps.map(ps => PM.hK(ps, cw, k))), t.rule));
    });
    return o;
  }
});

/* B2 · workstream cards: icon, title, inner hairline, bullet list */
bdef('gb-cards', 'بطاقات مسارات عمل بنقاط', {
  tags: ['نقاط فرعية', 'بطاقات', 'مسارات'],
  accepts: sp => isB(sp) && sp.n <= 4 ? 0.85 + stB(sp) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o) + 28;
    const items = sp.items, n = items.length, gx = 18, cw = (G.CW - gx * (n - 1)) / n, pad = n >= 4 ? 20 : 24, tw = cw - pad * 2;
    const IC = 40;
    const hps = items.map((it, i) => titleP(c, it, i, { hc: t.title }));
    const bps = items.map((it, i) => bodyPs(c, it, i, { tc: t.muted }));
    const fixed = pad * 2 + IC + 26;
    let k = Math.min(1.2, PM.groupK(items.map((_, i) => ({ w: tw, h: G.BOT - top - fixed, ps: hps[i].concat(bps[i]) })), 1.2));
    const tot = kk => fixed + mx(hps.map(ps => PM.hK(ps, tw, kk))) + mx(bps.map(ps => PM.hK(ps, tw, kk)));
    k = fitTo(k, G.BOT - top, tot);
    const headH = mx(hps.map(ps => PM.hK(ps, tw, k)));
    const ch = Math.min(G.BOT - top, tot(k) + 8);
    const y0 = place(top, G.BOT, ch, 0.45);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(R(x, y0, cw, ch, c.dark ? null : card(c), { r: 14, stroke: c.dark ? '2E558E' : null, sw: 1, name: 'Card ' + (i + 1) }));
      o.push(Ic(x + pad, y0 + pad, 26, PM.iconOf(c, it, i), t.icon, { bind: bOf({}, i) + 'icon', slot: 'icon' }));
      const a = PM.tk(x + pad, y0 + pad + IC, tw, hps[i], k, { name: 'Title ' + (i + 1) }); if (a) o.push(a);
      const ry = y0 + pad + IC + headH + 12;
      o.push(Ln(x + pad, ry, tw, 0, softRule(c)));
      const b = PM.tk(x + pad, ry + 14, tw, bps[i], k, { name: 'Bullets ' + (i + 1) }); if (b) o.push(b);
    });
    return o;
  }
});

/* B3 · two titled lists side by side (2) or a 2×2 of lists (4); dark: second column on a deep panel bleeding off the edge */
bdef('gb-twocol', 'قائمتان بعناوين كبيرة', {
  tags: ['نقاط فرعية', 'عمودين'],
  accepts: sp => isB(sp) && (sp.n === 2 || sp.n === 4) && sp.allTitled ? 0.87 + (sp.n === 2 ? 0.03 : 0) + stB(sp) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o) + 34;
    const items = sp.items, n = items.length, rows = n / 2;
    const mid = G.X0 + G.CW / 2, g2 = 44;
    const xs = [G.X0, mid + g2], ws = [mid - g2 - G.X0, G.X1 - mid - g2];
    const hs = c.Z.h * (n === 2 ? 1.32 : 1.12);
    const hps = items.map((it, i) => titleP(c, it, i, { hs, hsa: it.text ? 6 : 0, hc: i % 2 && c.dark ? K.WHITE : t.title }).concat(textPs(c, it, i, { tc: t.muted })));
    const bps = items.map((it, i) => bulPs(c, it, i, 0, nBul(it), {}));
    const RG = 18, BG = 20, ROWG = 30;
    const rowH = (r, kk) => { const a = items.slice(r * 2, r * 2 + 2).map((_, j) => r * 2 + j); return mx(a.map(i => PM.hK(hps[i], ws[i % 2], kk))) + RG + BG + mx(a.map(i => PM.hK(bps[i], ws[i % 2], kk))); };
    const tot = kk => { let s = 0; for (let r = 0; r < rows; r++) s += rowH(r, kk); return s + ROWG * (rows - 1); };
    let k = Math.min(1.25, PM.groupK(items.map((_, i) => ({ w: ws[i % 2], h: (G.BOT - top) / rows - RG - BG, ps: hps[i].concat(bps[i]) })), 1.25));
    k = fitTo(k, G.BOT - top, tot);
    const y0 = place(top, G.BOT, tot(k), 0.42);
    if (c.dark) under(o, R(mid, y0 - 34, W - mid, H - y0 + 34, K.DEEP, { role: 'bg', name: 'Panel' }));
    else o.push(Ln(mid, y0, 0, tot(k), t.rule, { name: 'Divider' }));
    let y = y0;
    for (let r = 0; r < rows; r++) {
      const a = [r * 2, r * 2 + 1];
      const hh = mx(a.map(i => PM.hK(hps[i], ws[i % 2], k)));
      if (r > 0) { if (!c.dark) o.push(Ln(G.X0, y - ROWG / 2, G.CW, 0, t.rule)); else o.push(Ln(G.X0, y - ROWG / 2, mid - g2 - G.X0, 0, t.rule), Ln(mid + g2, y - ROWG / 2, ws[1], 0, t.rule)); }
      a.forEach(i => {
        const x = xs[i % 2], w = ws[i % 2];
        const ta = PM.tk(x, y, w, hps[i], k, { name: 'Title ' + (i + 1) }); if (ta) o.push(ta);
        o.push(Ln(x, y + hh + RG, w, 0, c.dark ? K.RULE_D : t.rule));
        o.push(R(x, y + hh + RG - 1.5, 34, 3, K.SKY, { name: 'Tick' }));
        const b = PM.tk(x, y + hh + RG + BG, w, bps[i], k, { name: 'Bullets ' + (i + 1) }); if (b) o.push(b);
      });
      y += rowH(r, k) + ROWG;
    }
    return o;
  }
});

/* B4 · rows: number + title on one side, text and bullets (in two columns when long) on the other */
bdef('gb-rows', 'صفوف: عنوان جانبي ونقاط', {
  tags: ['نقاط فرعية', 'صفوف'],
  accepts: sp => isB(sp) && sp.n <= 4 && sp.allTitled ? 0.86 + (sp.maxItemWords > 30 ? 0.03 : 0) + stB(sp) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o) + 28;
    const items = sp.items, n = items.length;
    const tw = 226, gap = 44, rx = G.X0 + tw + gap, rw = G.X1 - rx;
    const two = (items.some(it => nBul(it) >= 4) || (n >= 3 && maxBul(sp) >= 3)) && rw >= 480, sg = 30, sw = two ? (rw - sg) / 2 : rw;
    const half = it => (two ? Math.ceil(nBul(it) / 2) : nBul(it));
    const hps = items.map((it, i) => titleP(c, it, i, { hc: c.dark ? K.WHITE : t.title }));
    const tps = items.map((it, i) => textPs(c, it, i, { tc: t.muted }));
    const aps = items.map((it, i) => bulPs(c, it, i, 0, half(it), {}));
    const cps = items.map((it, i) => bulPs(c, it, i, half(it), nBul(it), {}));
    const NUM = 26, RG = 40;
    const rH = (i, kk) => Math.max(NUM + PM.hK(hps[i], tw, kk), PM.hK(tps[i], rw, kk) + (tps[i].length ? 10 : 0) + Math.max(PM.hK(aps[i], sw, kk), PM.hK(cps[i], sw, kk)));
    const tot = kk => sum(items.map((_, i) => rH(i, kk))) + RG * (n - 1);
    let k = Math.min(1.2, PM.groupK(items.map((_, i) => ({ w: sw, h: (G.BOT - top) / n - RG, ps: aps[i] })).concat(items.map((_, i) => ({ w: tw, h: 90, ps: hps[i] }))), 1.2));
    k = fitTo(k, G.BOT - top, tot);
    const y0 = place(top, G.BOT, tot(k), 0.42);
    if (c.dark) under(o, R(0, y0 - 22, G.X0 + tw + 18, tot(k) + 44, K.DEEP, { role: 'bg', name: 'Title column', r: 0 }));
    let y = y0;
    items.forEach((it, i) => {
      if (i > 0) o.push(Ln(c.dark ? rx : G.X0, y - RG / 2, c.dark ? rw : G.CW, 0, t.rule));
      o.push(T(G.X0, y - 2, 60, 22, [num(c, PM.pad2(i + 1), 13, c.dark ? K.SKY : t.accent)], { name: 'Number' }));
      const a = PM.tk(G.X0, y + NUM, tw, hps[i], k, { name: 'Title ' + (i + 1) }); if (a) o.push(a);
      let yy = y;
      const tb = PM.tk(rx, yy, rw, tps[i], k, { name: 'Text ' + (i + 1) }); if (tb) { o.push(tb); yy += tb.h + 10; }
      const b1 = PM.tk(rx, yy, sw, aps[i], k, { name: 'Bullets ' + (i + 1) }); if (b1) o.push(b1);
      const b2 = PM.tk(rx + sw + sg, yy, sw, cps[i], k, { name: 'Bullets ' + (i + 1) + 'b' }); if (b2) o.push(b2);
      y += rH(i, k) + RG;
    });
    return o;
  }
});

/* B5 · stacked bands (accordion): the first band is "open" in navy, bullets run across in columns */
bdef('gb-bands', 'أشرطة متراكبة بنقاط', {
  tags: ['نقاط فرعية', 'أشرطة', 'صفوف'],
  accepts: sp => isB(sp) && sp.n >= 3 && sp.allTitled && bulWords(sp) <= 9 ? 0.84 + (sp.n >= 4 ? 0.04 : 0) + stB(sp) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o) + 24;
    const items = sp.items, n = items.length, gy = n >= 5 ? 8 : 12, pad = n >= 5 ? 14 : 20, px = 24;
    const mb = maxBul(sp), cols = mb <= 3 ? mb : mb === 4 ? 2 : 3;
    const lw = 236, rx0 = G.X0 + px + lw + 28, rw = G.X1 - px - rx0, cg = 22, cw = (rw - cg * (cols - 1)) / cols;
    const hi = i => i === 0;
    const fg = i => (hi(i) ? (c.dark ? K.NAVY : K.WHITE) : t.title);
    const bc = i => (hi(i) ? (c.dark ? '0B2E5C' : 'D5E1F0') : t.body);
    const dot = i => (hi(i) ? (c.dark ? K.NAVY : K.SKY) : K.SKY);
    const per = it => Math.ceil(nBul(it) / cols) || 1;
    const lps = items.map((it, i) => titleP(c, it, i, { hc: fg(i), hsa: it.text ? 4 : 0 }).concat(textPs(c, it, i, { tc: bc(i), ts: c.Z.body * 0.95 })));
    const cps = items.map((it, i) => { const out = []; for (let j = 0; j < cols; j++) out.push(bulPs(c, it, i, j * per(it), Math.min(nBul(it), (j + 1) * per(it)), { bc: bc(i), dot: dot(i), bg: 4 })); return out; });
    const bH = (i, kk) => pad * 2 + Math.max(PM.hK(lps[i], lw - 44, kk), mx(cps[i].map(ps => PM.hK(ps, cw, kk))));
    const tot = kk => sum(items.map((_, i) => bH(i, kk))) + gy * (n - 1);
    let k = Math.min(1.15, PM.groupK(items.map((_, i) => ({ w: lw - 44, h: (G.BOT - top) / n - pad * 2 - gy, ps: lps[i] })).concat([].concat(...cps.map(a => a.map(ps => ({ w: cw, h: (G.BOT - top) / n - pad * 2 - gy, ps }))))), 1.15));
    k = fitTo(k, G.BOT - top, tot);
    let y = place(top, G.BOT, tot(k), 0.45);
    items.forEach((it, i) => {
      const bh = bH(i, k);
      o.push(R(G.X0, y, G.CW, bh, hi(i) ? (c.dark ? K.SKY : K.NAVY) : card(c), { r: 14, name: 'Band ' + (i + 1) }));
      o.push(T(G.X0 + px, y + pad, 40, 22, [num(c, PM.pad2(i + 1), 13, hi(i) ? (c.dark ? K.NAVY : K.SKY) : t.accent)], { name: 'Number' }));
      const a = PM.tk(G.X0 + px + 44, y + pad, lw - 44, lps[i], k, { name: 'Title ' + (i + 1) }); if (a) o.push(a);
      if (!hi(i)) o.push(Ln(rx0 - 14, y + pad, 0, bh - pad * 2, softRule(c)));
      cps[i].forEach((ps, j) => { const b = PM.tk(rx0 + j * (cw + cg), y + pad, cw, ps, k, { name: 'Bullets ' + (i + 1) + '.' + j }); if (b) o.push(b); });
      y += bh + gy;
    });
    return o;
  }
});

/* B6 · navy header strip on every column, bullets beneath */
bdef('gb-navyhead', 'أعمدة برأس كحلي', {
  tags: ['نقاط فرعية', 'أعمدة', 'كحلي'],
  accepts: sp => isB(sp) && sp.allTitled ? 0.84 + stB(sp) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o) + 28;
    const items = sp.items, n = items.length, gx = n >= 4 ? 16 : 22, cw = (G.CW - gx * (n - 1)) / n, hp = n >= 5 ? 14 : 18;
    const sFill = c.dark ? K.SKY : K.NAVY, sInk = c.dark ? K.NAVY : K.WHITE;
    const hps = items.map((it, i) => titleP(c, it, i, { hc: sInk }));
    const bps = items.map((it, i) => bodyPs(c, it, i, { tc: t.muted }));
    const SG = 20;
    const tot = kk => mx(hps.map(ps => PM.hK(ps, cw - hp * 2, kk))) + 28 + SG + mx(bps.map(ps => PM.hK(ps, cw - 8, kk)));
    let k = Math.min(1.2, PM.groupK(items.map((_, i) => ({ w: cw - hp * 2, h: 100, ps: hps[i] })).concat(items.map((_, i) => ({ w: cw - 8, h: G.BOT - top - 90, ps: bps[i] }))), 1.2));
    k = fitTo(k, G.BOT - top, tot);
    const sh = mx(hps.map(ps => PM.hK(ps, cw - hp * 2, k))) + 28;
    const y0 = place(top, G.BOT, tot(k), 0.42);
    const bodyH = mx(bps.map(ps => PM.hK(ps, cw - 8, k)));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(R(x, y0, cw, sh, sFill, { r: 12, name: 'Header ' + (i + 1) }));
      const a = PM.tk(x + hp, y0, cw - hp * 2, hps[i], k, { name: 'Title ' + (i + 1), h: sh, va: 'm' }); if (a) o.push(a);
      if (c.dark) o.push(Ln(x + 4, y0 + sh + SG - 8, 0, bodyH + 8, K.RULE_D));
      const b = PM.tk(x + (c.dark ? 16 : 4), y0 + sh + SG, cw - (c.dark ? 20 : 8), bps[i], k, { name: 'Bullets ' + (i + 1) }); if (b) o.push(b);
    });
    return o;
  }
});

/* B7 · numbered workstreams: big numeral, title, bullets hung on a vertical accent rule */
bdef('gb-numbered', 'مسارات عمل مرقّمة بنقاط', {
  tags: ['نقاط فرعية', 'أرقام', 'أعمدة'],
  accepts: sp => isB(sp) && sp.n >= 3 && sp.allTitled ? 0.84 + stB(sp) + (sp.form === 'steps' ? 0.14 : 0) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const items = sp.items, n = items.length, gx = n >= 5 ? 26 : 38, cw = (G.CW - gx * (n - 1)) / n, ind = 18;
    const NUMH = 54;
    const hps = items.map((it, i) => titleP(c, it, i, { hc: t.title }));
    const bps = items.map((it, i) => bodyPs(c, it, i, { tc: t.muted }));
    const tot = kk => NUMH + mx(hps.map(ps => PM.hK(ps, cw, kk))) + 18 + mx(bps.map(ps => PM.hK(ps, cw - ind, kk)));
    let k = Math.min(1.22, PM.groupK(items.map((_, i) => ({ w: cw - ind, h: G.BOT - top - NUMH - 60, ps: bps[i] })).concat(items.map((_, i) => ({ w: cw, h: 80, ps: hps[i] }))), 1.22));
    k = fitTo(k, G.BOT - top, tot);
    const headH = mx(hps.map(ps => PM.hK(ps, cw, k)));
    const bodyH = mx(bps.map(ps => PM.hK(ps, cw - ind, k)));
    const y0 = place(top, G.BOT, tot(k), 0.42);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      if (c.dark) {
        o.push(E(x, y0, 38, 38, K.SKY, { name: 'Step dot' }));
        o.push(T(x, y0, 38, 38, [tx.num(c, String(i + 1), { size: 15, color: K.NAVY, al: 'c', sa: 0 })], { va: 'm', align: 'center', name: 'Number' }));
      } else o.push(T(x - 2, y0 - 6, cw, 52, [num(c, PM.pad2(i + 1), 40, K.SKY)], { name: 'Number', fit: false }));
      const a = PM.tk(x, y0 + NUMH, cw, hps[i], k, { name: 'Title ' + (i + 1) }); if (a) o.push(a);
      const by = y0 + NUMH + headH + 18;
      o.push(R(x, by + 2, 2, Math.max(10, PM.hK(bps[i], cw - ind, k) - 4), c.dark ? K.SKY : t.accent, { name: 'Rule' }));
      const b = PM.tk(x + ind, by, cw - ind, bps[i], k, { name: 'Bullets ' + (i + 1) }); if (b) o.push(b);
      if (!c.dark && i > 0) o.push(Ln(x - gx / 2, y0 + 8, 0, NUMH + headH + 18 + bodyH - 8, t.rule));
    });
    return o;
  }
});

/* B8 · photo band edge to edge (top in light, bottom in dark) + bulleted columns */
bdef('gb-photo', 'شريط صورة + أعمدة نقاط', {
  tags: ['نقاط فرعية', 'صورة', 'أعمدة'],
  accepts: sp => isB(sp) && sp.n <= 4 && !sp.lead && sp.allTitled ? 0.8 + (sp.imgs.length ? 0.12 : 0) + stB(sp) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    const items = sp.items, n = items.length, gx = n >= 4 ? 30 : 42, cw = (G.CW - gx * (n - 1)) / n;
    let top, bot;
    if (!c.dark) {
      const bh = 196;
      PM.chrome(c, o, { noLogo: true });
      PM.photoBlock(c, sp, o, 0, 0, W, bh, { veil: 'up', a0: 88, a1: 10, fy: 0.55 });
      o.push(PM.Logo(19, 13, 58, K.WHITE));
      const hp = headPs(c, sp, { eb: K.SKY, tc: K.WHITE, sc: 'D5E1F0', lead: false });
      if (hp.length) o.push(T(G.X0, 64, G.CW * 0.86, bh - 64 - 24, hp, { va: 'b', name: 'Title', minK: 0.66 }));
      barTo(o, bh + 24, 483);
      top = bh + 34; bot = G.BOT;
    } else {
      const bh = 132;
      PM.chrome(c, o, { noPage: true });
      PM.photoBlock(c, sp, o, 0, H - bh, W, bh, { veil: 'down', a0: 70, a1: 20 });
      PM.chromeOnPhoto(c, o, { noLogo: true });
      barTo(o, 84, H - bh - 24);
      top = area(c, sp, o) + 30; bot = H - bh - 26;
    }
    const hps = items.map((it, i) => titleP(c, it, i, { hc: t.title }));
    const bps = items.map((it, i) => bodyPs(c, it, i, { tc: t.muted }));
    const tot = kk => 18 + mx(hps.map(ps => PM.hK(ps, cw, kk))) + 14 + mx(bps.map(ps => PM.hK(ps, cw, kk)));
    let k = Math.min(1.15, PM.groupK(items.map((_, i) => ({ w: cw, h: bot - top - 30, ps: hps[i].concat(bps[i]) })), 1.15));
    k = fitTo(k, bot - top, tot);
    const headH = mx(hps.map(ps => PM.hK(ps, cw, k)));
    const y0 = place(top, bot, tot(k), 0.5);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(R(x, y0, 34, 3, K.SKY, { name: 'Tick' }));
      const a = PM.tk(x, y0 + 18, cw, hps[i], k, { name: 'Title ' + (i + 1) }); if (a) o.push(a);
      const b = PM.tk(x, y0 + 18 + headH + 14, cw, bps[i], k, { name: 'Bullets ' + (i + 1) }); if (b) o.push(b);
      if (i > 0) o.push(Ln(x - gx / 2, y0, 0, tot(k), t.rule));
    });
    return o;
  }
});

/* B9 · pillars: tinted panels with a centred head, standing on one shared foundation bar */
bdef('gb-pillars', 'ركائز على قاعدة مشتركة', {
  tags: ['نقاط فرعية', 'ركائز'],
  accepts: sp => isB(sp) && sp.n >= 3 && sp.allTitled && bulWords(sp) <= 10 ? 0.84 + stB(sp) + (/ركائز|محاور|pillar/i.test(sp.title) ? 0.06 : 0) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = sp.items, n = items.length, gx = 14, cw = (G.CW - gx * (n - 1)) / n, pad = n >= 5 ? 16 : 20, tw = cw - pad * 2;
    const IC = 38, FB = 22;
    const hps = items.map((it, i) => titleP(c, it, i, { hc: t.title, al: 'c' }));
    const bps = items.map((it, i) => bodyPs(c, it, i, { tc: t.muted, bg: 5 }));
    const fixed = pad * 2 + IC + 26 + FB;
    const tot = kk => fixed + mx(hps.map(ps => PM.hK(ps, tw, kk))) + mx(bps.map(ps => PM.hK(ps, tw, kk)));
    let k = Math.min(1.15, PM.groupK(items.map((_, i) => ({ w: tw, h: G.BOT - top - fixed - 30, ps: bps[i] })).concat(items.map((_, i) => ({ w: tw, h: 70, ps: hps[i] }))), 1.15));
    k = fitTo(k, G.BOT - top, tot);
    const headH = mx(hps.map(ps => PM.hK(ps, tw, k)));
    const ph = tot(k) - FB;
    const y0 = place(top, G.BOT, tot(k), 0.5);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(R(x, y0, cw, ph, card(c), { r: 14, name: 'Pillar ' + (i + 1) }));
      o.push(Ic(x + cw / 2 - 13, y0 + pad, 26, PM.iconOf(c, it, i), t.icon, { bind: bOf({}, i) + 'icon', slot: 'icon' }));
      const a = PM.tk(x + pad, y0 + pad + IC, tw, hps[i], k, { name: 'Title ' + (i + 1), align: 'center' }); if (a) o.push(a);
      const ry = y0 + pad + IC + headH + 12;
      o.push(Ln(x + cw / 2 - 18, ry, 36, 0, K.SKY, { sw: 2 }));
      const b = PM.tk(x + pad, ry + 14, tw, bps[i], k, { name: 'Bullets ' + (i + 1) }); if (b) o.push(b);
    });
    o.push(R(G.X0, y0 + ph + 10, G.CW, 9, c.dark ? K.SKY : K.NAVY, { r: 4.5, name: 'Foundation' }));
    return o;
  }
});

/* B10 · title panel down one edge (navy in light, photo in dark) + rows of titled bullet lists */
bdef('gb-split', 'لوحة عنوان + بنود بنقاط', {
  tags: ['نقاط فرعية', 'لوحة', 'صفوف'],
  accepts: sp => isB(sp) && sp.n <= 4 && sp.allTitled && PM.len(sp.title) < 90 ? 0.83 + stB(sp) + (sp.lead ? 0.04 : 0) : 0,
  render(sp, c) {
    const o = [], t = c.tone, pw = 316;
    PM.chrome(c, o, { noBar: true, noLogo: true });
    if (c.dark) PM.photoBlock(c, sp, o, 0, 0, pw, H, { tint: 62, tintColor: K.DEEP });
    else o.push(R(0, 0, pw, H, K.NAVY, { role: 'bg', lock: true, name: 'Panel' }));
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    pageOn(o, 'C9D6E8');
    const hp = headPs(c, sp, { eb: K.SKY, tc: K.WHITE, sc: 'C9D6E8', lc: 'D5E1F0' });
    if (hp.length) o.push(T(G.X0, 92, pw - G.X0 - 34, 380, hp, { va: 'm', name: 'Title', minK: 0.62 }));
    const items = sp.items, n = items.length;
    const rx = pw + 50, rw = G.X1 - rx;
    const two = items.some(it => nBul(it) >= 4), sg = 26, sw = two ? (rw - sg) / 2 : rw;
    const half = it => (two ? Math.ceil(nBul(it) / 2) : nBul(it));
    const hps = items.map((it, i) => titleP(c, it, i, { hsa: 0 }).concat(textPs(c, it, i, { tc: t.muted })));
    const aps = items.map((it, i) => bulPs(c, it, i, 0, half(it), {}));
    const cps = items.map((it, i) => bulPs(c, it, i, half(it), nBul(it), {}));
    const RG = 34, HG = 12;
    const rH = (i, kk) => 24 + PM.hK(hps[i], rw - 40, kk) + HG + Math.max(PM.hK(aps[i], sw, kk), PM.hK(cps[i], sw, kk));
    const tot = kk => sum(items.map((_, i) => rH(i, kk))) + RG * (n - 1);
    let k = Math.min(1.15, PM.groupK(items.map((_, i) => ({ w: sw, h: (G.BOT - 70) / n - 60, ps: aps[i] })), 1.15));
    k = fitTo(k, G.BOT - 64, tot);
    let y = place(64, G.BOT, tot(k), 0.5);
    items.forEach((it, i) => {
      if (i > 0) o.push(Ln(rx, y - RG / 2, rw, 0, t.rule));
      o.push(T(rx, y - 2, 60, 22, [num(c, PM.pad2(i + 1), 13, c.dark ? K.SKY : t.accent)], { name: 'Number' }));
      const a = PM.tk(rx, y + 24, rw - 40, hps[i], k, { name: 'Title ' + (i + 1) }); if (a) o.push(a);
      const by = y + 24 + PM.hK(hps[i], rw - 40, k) + HG;
      const b1 = PM.tk(rx, by, sw, aps[i], k, { name: 'Bullets ' + (i + 1) }); if (b1) o.push(b1);
      const b2 = PM.tk(rx + sw + sg, by, sw, cps[i], k, { name: 'Bullets ' + (i + 1) + 'b' }); if (b2) o.push(b2);
      y += rH(i, k) + RG;
    });
    return o;
  }
});

/* ======================================================================
   NUMBERS WITH DESCRIPTIONS (gk-)
   ====================================================================== */
const kB = i => 'main.items.' + i + '.';
const kb = (sp, i) => sp.form === 'kpis' ? { v: kB(i) + 'value', l: kB(i) + 'label', t: kB(i) + 'text' } : { v: kB(i) + 'value', l: kB(i) + 'title', t: kB(i) + 'text' };
const isKD = sp => !sp.multi && (sp.form === 'kpis' || (sp.form === 'items' && sp.valued)) && sp.items.filter(it => it.text).length >= Math.max(1, sp.n - 1) && !sp.hasBullets;
const kdef = (id, name, o) => gdef('kpis', id, name, Object.assign({ forms: ['kpis'] }, o));
const vP = (c, sp, it, i, size, color, q = {}) => tx.num(c, it.value || '—', { size, color, bind: kb(sp, i).v, sa: q.sa == null ? 0 : q.sa, al: q.al });
const lP = (c, sp, it, i, q = {}) => (it.title ? [tx.label(c, it.title, { size: q.size || c.Z.label * 1.3, color: q.color || c.tone.title, bind: kb(sp, i).l, bold: true, al: q.al })] : []);
const dP = (c, sp, it, i, q = {}) => (it.text ? [tx.body(c, it.text, { size: q.size || c.Z.body, color: q.color || c.tone.body, bind: kb(sp, i).t, sb: q.sb || 0, lh: 1.45, al: q.al })] : []);
const maxKW = sp => mx(sp.items.map(it => PM.words(it.text)));

/* K1 · ledger: number | label | description, hairline rows (dark: zebra bands) */
kdef('gk-ledger', 'سجل أرقام بوصف', {
  tags: ['أرقام', 'وصف', 'صفوف'],
  accepts: sp => isKD(sp) && sp.n >= 2 && sp.n <= 6 && maxKW(sp) <= 30 ? 0.86 + (sp.n >= 4 ? 0.02 : 0) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o, { blockHead: true }) + 24;
    const items = sp.items, n = items.length;
    const nw = n >= 5 ? 190 : 214, lw = n >= 5 ? 210 : 236, g = 28;
    const lx = G.X0 + nw + g, dx = lx + lw + g, dw = G.X1 - dx;
    const zp = c.dark ? 18 : 0;
    const ns = c.Z.kpiS * (n >= 5 ? 0.92 : 1.08);
    const nps = items.map((it, i) => [vP(c, sp, it, i, ns, c.dark ? K.SKY : t.num)]);
    const nk = oneLine(nps, nw - zp, PM.groupK(nps.map(ps => ({ w: nw - zp, h: 60, ps })), 1));
    const lps = items.map((it, i) => lP(c, sp, it, i));
    const dps = items.map((it, i) => dP(c, sp, it, i, { color: t.body }));
    const RG = n >= 5 ? 16 : 22;
    const rH = (i, kk) => Math.max(PM.hK(nps[i], nw - zp, nk), PM.hK(lps[i], lw, kk), PM.hK(dps[i], dw - zp, kk)) + RG * 2;
    const tot = kk => sum(items.map((_, i) => rH(i, kk)));
    let k = Math.min(1.2, PM.groupK(items.map((_, i) => ({ w: dw - zp, h: (G.BOT - top) / n - RG * 2, ps: dps[i] })).concat(items.map((_, i) => ({ w: lw, h: (G.BOT - top) / n - RG * 2, ps: lps[i] }))), 1.2));
    k = fitTo(k, G.BOT - top, tot);
    let y = place(top, G.BOT, tot(k), 0.42);
    items.forEach((it, i) => {
      const h = rH(i, k);
      if (c.dark) { if (i % 2 === 0) o.push(R(G.X0, y + 3, G.CW, h - 6, '0C3470', { r: 12, name: 'Row band' })); }
      else o.push(Ln(G.X0, y, G.CW, 0, i === 0 ? t.accent : t.rule, { sw: i === 0 ? 1.5 : 0.75 }));
      const nh = PM.hK(nps[i], nw - zp, nk);
      const a = PM.tk(G.X0 + zp, y + RG - 2, nw - zp, nps[i], nk, { name: 'Number ' + (i + 1) }); if (a) o.push(a);
      const b = PM.tk(lx, y + RG + Math.max(0, (nh - PM.hK(lps[i], lw, k)) / 2) * 0.6, lw, lps[i], k, { name: 'Label ' + (i + 1) }); if (b) o.push(b);
      const d = PM.tk(dx, y + RG, dw - zp, dps[i], k, { name: 'Description ' + (i + 1) }); if (d) o.push(d);
      y += h;
    });
    if (!c.dark) o.push(Ln(G.X0, y, G.CW, 0, t.rule));
    return o;
  }
});

/* K2 · columns: label on top, big number, sky tick, description (dark: rounded tiles) */
kdef('gk-cols', 'أعمدة أرقام بوصف', {
  tags: ['أرقام', 'وصف', 'أعمدة'],
  accepts: sp => isKD(sp) && sp.n >= 2 && sp.n <= 4 && maxKW(sp) <= 34 ? 0.87 : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o, { blockHead: true }) + 30;
    const items = sp.items, n = items.length, gx = c.dark ? 18 : (n >= 4 ? 36 : 52), cw = (G.CW - gx * (n - 1)) / n;
    const pad = c.dark ? 24 : 0, tw = cw - pad * 2;
    const ns = c.Z.kpi * [0, 0, 1.4, 1.2, 0.98][n];
    const nps = items.map((it, i) => [vP(c, sp, it, i, ns, t.num)]);
    const nk = oneLine(nps, tw, PM.groupK(nps.map(ps => ({ w: tw, h: 120, ps })), 1));
    const lps = items.map((it, i) => lP(c, sp, it, i, { color: c.dark ? K.SKY : t.accent }));
    const dps = items.map((it, i) => dP(c, sp, it, i));
    const NH = mx(nps.map(ps => PM.hK(ps, tw, nk)));
    const tot = kk => pad * 2 + mx(lps.map(ps => PM.hK(ps, tw, kk))) + 12 + NH + 22 + mx(dps.map(ps => PM.hK(ps, tw, kk)));
    let k = Math.min(1.25, PM.groupK(items.map((_, i) => ({ w: tw, h: G.BOT - top - NH - 80, ps: lps[i].concat(dps[i]) })), 1.25));
    k = fitTo(k, G.BOT - top, tot);
    const LH = mx(lps.map(ps => PM.hK(ps, tw, k)));
    const y0 = place(top, G.BOT, tot(k), 0.45);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      if (c.dark) o.push(R(x, y0, cw, tot(k), card(c), { r: 14, name: 'Tile ' + (i + 1) }));
      else if (i > 0) o.push(Ln(x - gx / 2, y0, 0, tot(k), t.rule));
      const a = PM.tk(x + pad, y0 + pad, tw, lps[i], k, { name: 'Label ' + (i + 1) }); if (a) o.push(a);
      const b = PM.tk(x + pad, y0 + pad + LH + 12, tw, nps[i], nk, { name: 'Number ' + (i + 1) }); if (b) o.push(b);
      o.push(R(x + pad, y0 + pad + LH + 12 + NH + 8, 34, 3, K.SKY, { name: 'Tick' }));
      const d = PM.tk(x + pad, y0 + pad + LH + 12 + NH + 22, tw, dps[i], k, { name: 'Description ' + (i + 1) }); if (d) o.push(d);
    });
    return o;
  }
});

/* K3 · hero number on a full-height panel with its story, the rest as described rows */
kdef('gk-hero', 'رقم رئيسي على لوحة + أرقام بوصف', {
  tags: ['أرقام', 'وصف', 'لوحة', 'رئيسي'],
  accepts: sp => isKD(sp) && sp.n >= 2 && sp.n <= 4 && maxKW(sp) <= 32 && PM.len(sp.title) < 70 ? 0.84 : 0,
  render(sp, c) {
    const o = [], t = c.tone, pw = 392;
    PM.chrome(c, o, { noBar: true, noLogo: true });
    const pf = c.dark ? K.PALE : K.NAVY, ink = c.dark ? K.NAVY : K.WHITE, soft = c.dark ? K.BODY : 'C9D6E8';
    o.push(R(0, 0, pw, H, pf, { role: 'bg', lock: true, name: 'Panel' }));
    o.push(PM.Logo(19, 13, 58, c.dark ? K.NAVY : K.WHITE));
    pageOn(o, c.dark ? K.MUTED : 'C9D6E8');
    const iw = pw - G.X0 - 38;
    const hp = headPs(c, sp, { eb: c.dark ? K.BLUE : K.SKY, tc: ink, sc: soft, lc: soft, ts: c.Z.title * 0.92 });
    let hy = 80;
    if (hp.length) { const hb = T(G.X0, hy, iw, 160, hp, { name: 'Title', minK: 0.66 }); o.push(hb); hy = hb.y + Math.min(hb.h, hb.used + 2); }
    const items = sp.items, h0 = items[0];
    const hps = [vP(c, sp, h0, 0, c.Z.kpi * 1.55, c.dark ? K.BLUE : K.SKY, { sa: 10 })].concat(lP(c, sp, h0, 0, { color: ink, size: c.Z.lead })).concat(dP(c, sp, h0, 0, { color: soft, sb: 8 }));
    const hb = T(G.X0, hy + 24, iw, G.BOT - hy - 24, hps, { va: 'b', name: 'Hero', minK: 0.6 }); o.push(hb);
    const rest = items.slice(1), m = rest.length;
    const rx = pw + 50, rw = G.X1 - rx, nw = 150, tx0 = rx + nw + 20, tw = G.X1 - tx0;
    const nps = rest.map((it, j) => [vP(c, sp, it, j + 1, c.Z.kpiS * 1.05, t.num)]);
    const nk = oneLine(nps, nw, PM.groupK(nps.map(ps => ({ w: nw, h: 60, ps })), 1));
    const rps = rest.map((it, j) => lP(c, sp, it, j + 1, { size: c.Z.label * 1.3 }).concat(dP(c, sp, it, j + 1, { sb: 4 })));
    const RG = 40;
    const rH = (j, kk) => Math.max(PM.hK(nps[j], nw, nk), PM.hK(rps[j], tw, kk));
    const tot = kk => sum(rest.map((_, j) => rH(j, kk))) + RG * (m - 1);
    let k = Math.min(1.25, PM.groupK(rps.map(ps => ({ w: tw, h: (G.BOT - 70) / m - RG, ps })), 1.25));
    k = fitTo(k, G.BOT - 70, tot);
    let y = place(70, G.BOT, tot(k), 0.5);
    rest.forEach((it, j) => {
      if (j > 0) o.push(Ln(rx, y - RG / 2, rw, 0, t.rule));
      const a = PM.tk(rx, y, nw, nps[j], nk, { name: 'Number ' + (j + 2) }); if (a) o.push(a);
      const b = PM.tk(tx0, y + 2, tw, rps[j], k, { name: 'Label ' + (j + 2) }); if (b) o.push(b);
      y += rH(j, k) + RG;
    });
    return o;
  }
});

/* K4 · description-first tiles: label and sentence on top, the number anchored at the tile foot */
kdef('gk-tiles', 'مربعات وصف ثم رقم', {
  tags: ['أرقام', 'وصف', 'بطاقات'],
  accepts: sp => isKD(sp) && [3, 4, 6].includes(sp.n) && maxKW(sp) <= (sp.n === 6 ? 14 : 24) ? 0.85 + (sp.n === 6 ? 0.03 : 0) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o, { blockHead: true }) + 26;
    const items = sp.items, n = items.length, cols = n === 4 ? 2 : 3, rows = Math.ceil(n / cols);
    const gx = 18, gy = 18, cw = (G.CW - gx * (cols - 1)) / cols, pad = 22, tw = cw - pad * 2;
    const ns = c.Z.kpi * (rows > 1 ? 0.9 : 1.15);
    const nps = items.map((it, i) => [vP(c, sp, it, i, ns, c.dark ? K.WHITE : t.num)]);
    const nk = oneLine(nps, tw, PM.groupK(nps.map(ps => ({ w: tw, h: 90, ps })), 1));
    const NH = mx(nps.map(ps => PM.hK(ps, tw, nk)));
    const tps = items.map((it, i) => lP(c, sp, it, i, { color: t.title }).concat(dP(c, sp, it, i, { color: t.muted, sb: 4 })));
    const thOf = kk => pad * 2 + mx(tps.map(ps => PM.hK(ps, tw, kk))) + 22 + NH;
    const tot = kk => thOf(kk) * rows + gy * (rows - 1);
    let k = Math.min(1.2, PM.groupK(tps.map(ps => ({ w: tw, h: (G.BOT - top) / rows - NH - pad * 2 - 30, ps })), 1.2));
    k = fitTo(k, G.BOT - top, tot);
    const th = Math.min((G.BOT - top - gy * (rows - 1)) / rows, Math.max(thOf(k), rows > 1 ? 0 : 200));
    const y0 = place(top, G.BOT, th * rows + gy * (rows - 1), 0.45);
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), x = G.X0 + (i % cols) * (cw + gx), y = y0 + r * (th + gy);
      o.push(R(x, y, cw, th, c.dark ? null : card(c), { r: 14, stroke: c.dark ? '2E558E' : null, name: 'Tile ' + (i + 1) }));
      const a = PM.tk(x + pad, y + pad, tw, tps[i], k, { name: 'Label ' + (i + 1) }); if (a) o.push(a);
      const ny = y + th - pad - NH;
      o.push(R(x + pad, ny - 12, 30, 3, K.SKY, { name: 'Tick' }));
      const b = PM.tk(x + pad, ny, tw, nps[i], nk, { name: 'Number ' + (i + 1) }); if (b) o.push(b);
    });
    return o;
  }
});

/* ======================================================================
   STEPS WITH LONG DESCRIPTIONS (gs-)
   ====================================================================== */
const isLS = sp => !sp.multi && sp.form === 'steps' && sp.n >= 3 && sp.n <= 5 && !sp.hasBullets && sp.maxItemWords >= 16 && sp.maxItemWords <= 52;
const sdef = (id, name, o) => gdef('steps', id, name, Object.assign({ forms: ['steps'] }, o));
const stepPs = (c, it, i, q = {}) => titleP(c, it, i, { hc: q.hc, hsa: it.text ? 8 : 0, hs: q.hs }).concat(textPs(c, it, i, { tc: q.tc, ts: q.ts }));

/* S1 · numeral rail: Sequel numerals joined by a hairline, long text columns beneath */
sdef('gs-rail', 'مراحل بأرقام على خط ونص طويل', {
  tags: ['مراحل', 'نص طويل', 'خط'],
  accepts: sp => isLS(sp) && (sp.n <= 4 || sp.maxItemWords <= 34) ? 0.9 : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o) + (c.dark ? 50 : 34);
    const items = sp.items, n = items.length, gx = n >= 5 ? 24 : 34, cw = (G.CW - gx * (n - 1)) / n;
    const NH = 40, NG = 26;
    const pss = items.map((it, i) => stepPs(c, it, i, { tc: t.body, hc: t.title }));
    const tot = kk => NH + NG + mx(pss.map(ps => PM.hK(ps, cw, kk)));
    let k = Math.min(1.2, PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - NH - NG, ps })), 1.2));
    k = fitTo(k, G.BOT - top, tot);
    const y0 = place(top, G.BOT, tot(k), 0.42);
    if (c.dark) under(o, R(0, y0 - 20, W, NH + 40, K.DEEP, { role: 'bg', name: 'Rail band' }));
    const nwid = 58;
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(T(x - 2, y0 - 4, nwid, NH + 4, [num(c, PM.pad2(i + 1), 30, i === 0 ? (c.dark ? K.SKY : K.BLUE) : (c.dark ? K.WHITE : K.SKY))], { name: 'Number', fit: false }));
      const lx = x + nwid + 6, lw = (i < n - 1 ? cw + gx : cw) - nwid - 16;
      o.push(Ln(lx, y0 + NH / 2 - 2, lw, 0, i === 0 ? (c.dark ? K.SKY : K.BLUE) : (c.dark ? K.RULE_D : t.rule), { sw: i === 0 ? 1.5 : 1 }));
      const b = PM.tk(x, y0 + NH + NG, cw, pss[i], k, { name: 'Step ' + (i + 1) }); if (b) o.push(b);
    });
    return o;
  }
});

/* S2 · spine rows: numbered dots on a vertical spine, title column, long text column */
sdef('gs-spine', 'مراحل عمودية بنص طويل', {
  tags: ['مراحل', 'نص طويل', 'عمودي'],
  accepts: sp => isLS(sp) ? 0.88 + (sp.n >= 4 ? 0.02 : 0) : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = sp.items, n = items.length, d = 28;
    const tx0 = G.X0 + d + 24, tw = 210, bx = tx0 + tw + 30, bw = G.X1 - bx;
    const tps = items.map((it, i) => titleP(c, it, i, { hc: c.dark ? K.SKY : t.title }));
    const bps = items.map((it, i) => textPs(c, it, i, { tc: t.body }));
    const RG = n >= 5 ? 22 : 30;
    const rH = (i, kk) => Math.max(d, PM.hK(tps[i], tw, kk), PM.hK(bps[i], bw, kk));
    const tot = kk => sum(items.map((_, i) => rH(i, kk))) + RG * (n - 1);
    let k = Math.min(1.2, PM.groupK(bps.map(ps => ({ w: bw, h: (G.BOT - top) / n - RG, ps })).concat(tps.map(ps => ({ w: tw, h: (G.BOT - top) / n - RG, ps }))), 1.2));
    k = fitTo(k, G.BOT - top, tot);
    const y0 = place(top, G.BOT, tot(k), 0.42);
    let y = y0; const ys = [];
    items.forEach((_, i) => { ys.push(y); y += rH(i, k) + RG; });
    o.push(Ln(G.X0 + d / 2, ys[0] + d / 2, 0, ys[n - 1] - ys[0], c.dark ? K.RULE_D : t.rule, { sw: 1.5, name: 'Spine' }));
    items.forEach((it, i) => {
      const yy = ys[i];
      const f = c.dark ? K.SKY : (i === 0 ? K.BLUE : 'E3EAF3');
      const ink = c.dark ? K.NAVY : (i === 0 ? K.WHITE : K.BLUE);
      o.push(E(G.X0, yy, d, d, f, { name: 'Step dot' }));
      o.push(T(G.X0, yy, d, d, [tx.num(c, String(i + 1), { size: 12, color: ink, al: 'c', sa: 0 })], { va: 'm', align: 'center', name: 'Number' }));
      if (i > 0 && !c.dark) o.push(Ln(tx0, yy - RG / 2, G.X1 - tx0, 0, t.rule));
      const a = PM.tk(tx0, yy + 2, tw, tps[i], k, { name: 'Title ' + (i + 1) }); if (a) o.push(a);
      const b = PM.tk(bx, yy + 3, bw, bps[i], k, { name: 'Text ' + (i + 1) }); if (b) o.push(b);
    });
    return o;
  }
});

/* S3 · step cards joined by arrows; the first card is the current step */
sdef('gs-cards', 'بطاقات مراحل بنص طويل', {
  tags: ['مراحل', 'نص طويل', 'بطاقات'],
  accepts: sp => isLS(sp) && (sp.n <= 4 || sp.maxItemWords <= 30) ? 0.86 : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = area(c, sp, o) + 28;
    const items = sp.items, n = items.length, gx = 30, cw = (G.CW - gx * (n - 1)) / n, pad = n >= 5 ? 16 : 22, tw = cw - pad * 2;
    const NH = 44;
    const hi = i => i === 0;
    const fill = i => (hi(i) ? (c.dark ? K.SKY : K.NAVY) : card(c));
    const fg = i => (hi(i) ? (c.dark ? K.NAVY : K.WHITE) : t.title);
    const bc = i => (hi(i) ? (c.dark ? '0B2E5C' : 'D5E1F0') : t.body);
    const pss = items.map((it, i) => stepPs(c, it, i, { hc: fg(i), tc: bc(i) }));
    const tot = kk => pad * 2 + NH + mx(pss.map(ps => PM.hK(ps, tw, kk)));
    let k = Math.min(1.15, PM.groupK(pss.map(ps => ({ w: tw, h: G.BOT - top - pad * 2 - NH, ps })), 1.15));
    k = fitTo(k, G.BOT - top, tot);
    const ch = tot(k) + 6;
    const y0 = place(top, G.BOT, ch, 0.45);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(R(x, y0, cw, ch, fill(i), { r: 14, name: 'Card ' + (i + 1) }));
      o.push(T(x + pad, y0 + pad - 4, 80, 40, [num(c, PM.pad2(i + 1), 26, hi(i) ? (c.dark ? K.NAVY : K.SKY) : (c.dark ? K.SKY : K.BLUE))], { name: 'Number', fit: false }));
      const b = PM.tk(x + pad, y0 + pad + NH, tw, pss[i], k, { name: 'Step ' + (i + 1) }); if (b) o.push(b);
      if (i < n - 1) o.push(Ic(x + cw + gx / 2 - 9, y0 + pad + 8, 18, 'lib:arrow-right', K.SKY, { sw: 1.8, flipRtl: true, name: 'Arrow' }));
    });
    return o;
  }
});

/* ======================================================================
   MIXED CONTENT (gm-)
   ====================================================================== */
const blocksOf = sp => sp.blocks.filter(b => !(b.k === 'para' && !PM.words(b.text)));
const bi = (sp, b) => sp.blocks.indexOf(b);
const mdef = (id, name, o) => gdef('mix', id, name, Object.assign({ forms: ['mix'] }, o));
const kindsOf = sp => blocksOf(sp).map(b => b.k).sort().join('+');
const one = (sp, k) => blocksOf(sp).filter(b => b.k === k);
/* measure a blockBox without drawing it */
const boxH = (c, sp, b, w, h, opt) => { const tmp = []; return PM.blockBox(c, sp, b, tmp, 0, 0, w, h, opt); };
/* block label (cap) if the block has a head */
function blockLabel(c, sp, b, o, x, y, w) {
  if (!b.head) return 0;
  const hb = PM.textAt(x, y, w, 20, [tx.cap(c, b.head, { bind: 'blocks.' + bi(sp, b) + '.head', color: c.tone.accent })], { name: 'Label' });
  if (hb) { o.push(hb); return hb.h + 10; }
  return 0;
}

/* M1 · lead paragraph in a side column + items (with bullets) as columns */
mdef('gm-lead-items', 'فقرة جانبية + بنود بنقاط', {
  tags: ['مختلط', 'فقرة', 'نقاط فرعية'],
  accepts: sp => {
    const bs = blocksOf(sp); if (bs.length !== 2) return 0;
    const p = one(sp, 'para')[0], it = one(sp, 'items')[0] || one(sp, 'steps')[0];
    if (!p || !it || it.items.length < 2 || it.items.length > 4 || PM.words(p.text) > 60) return 0;
    return 0.86 + (it.items.some(x => (x.bullets || []).length) ? 0.06 : 0);
  },
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 34;
    const pb = one(sp, 'para')[0], ib = one(sp, 'items')[0] || one(sp, 'steps')[0];
    const B = 'blocks.' + bi(sp, ib) + '.';
    const lw = 262, gap = 56, rx = G.X0 + lw + gap, rw = G.X1 - rx;
    // paragraph column (blockBox) — measured first, then drawn centred against the items
    const pH = boxH(c, sp, pb, lw - 22, G.BOT - top, { maxK: 1.42 });
    const items = ib.items.map(x => (typeof x === 'string' ? { text: x } : x)), n = items.length, gx = 28, cw = (rw - gx * (n - 1)) / n;
    const lab = ib.head ? 30 : 0;
    const hps = items.map((it, i) => titleP(c, it, i, { B }));
    const bps = items.map((it, i) => bodyPs(c, it, i, { B, tc: t.muted }));
    const tot = kk => lab + 18 + mx(hps.map(ps => PM.hK(ps, cw, kk))) + 14 + mx(bps.map(ps => PM.hK(ps, cw, kk)));
    let k = Math.min(1.15, PM.groupK(items.map((_, i) => ({ w: cw, h: G.BOT - top - 60, ps: hps[i].concat(bps[i]) })), 1.15));
    k = fitTo(k, G.BOT - top, tot);
    const blockH = Math.max(pH, tot(k));
    const y0 = place(top, G.BOT, blockH, 0.42);
    if (c.dark) under(o, R(0, y0 - 30, G.X0 + lw + 20, Math.min(H - y0 + 30, blockH + 60), K.DEEP, { role: 'bg', name: 'Lead panel' }));
    const py = y0 + (blockH - pH) * 0.3;
    o.push(R(G.X0, py + 4, 2.5, pH - 8, K.SKY, { name: 'Accent' }));
    PM.blockBox(c, sp, pb, o, G.X0 + 22, py, lw - 22, G.BOT - py, { maxK: 1.42 });
    o.forEach(ob => { if (ob.t === 'text' && ob.paras.some(p => p.bind === 'blocks.' + bi(sp, pb) + '.text')) ob.paras.forEach(p => { p.color = t.title; }); });
    if (!c.dark) o.push(Ln(G.X0 + lw + gap / 2, y0, 0, blockH, t.rule));
    let yy = y0 + blockLabel(c, sp, ib, o, rx, y0, rw);
    const headH = mx(hps.map(ps => PM.hK(ps, cw, k)));
    items.forEach((it, i) => {
      const x = rx + i * (cw + gx);
      o.push(R(x, yy, 30, 3, K.SKY, { name: 'Tick' }));
      const a = PM.tk(x, yy + 18, cw, hps[i], k, { name: 'Title ' + (i + 1) }); if (a) o.push(a);
      const b = PM.tk(x, yy + 18 + headH + 14, cw, bps[i], k, { name: 'Bullets ' + (i + 1) }); if (b) o.push(b);
    });
    return o;
  }
});

/* M2 · numbers on an edge-to-edge band + the follow-up points in two columns beneath */
mdef('gm-kpi-bullets', 'شريط أرقام + نقاط', {
  tags: ['مختلط', 'أرقام', 'نقاط'],
  accepts: sp => {
    const bs = blocksOf(sp), ks = one(sp, 'kpis'), bl = one(sp, 'bullets'), ps = one(sp, 'para');
    if (ks.length !== 1 || bl.length !== 1 || ps.length > 1 || bs.length !== 2 + ps.length) return 0;
    if (ks[0].items.length < 2 || ks[0].items.length > 4 || bl[0].items.length > 8) return 0;
    if (ps.length && PM.words(ps[0].text) > 40) return 0;
    return 0.9;
  },
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    let top = PM.head(c, sp, o, {});
    const pb = one(sp, 'para')[0], kb_ = one(sp, 'kpis')[0], bb = one(sp, 'bullets')[0];
    if (pb) { const tmp = []; const used = PM.blockBox(c, sp, pb, tmp, G.X0, top + 12, Math.min(G.CW, 700), 70, {}); tmp.forEach(x => o.push(x)); top += 12 + used; }
    const KB = 'blocks.' + bi(sp, kb_) + '.items.';
    const ks = kb_.items, n = ks.length, gx = 40, cw = (G.CW - gx * (n - 1)) / n;
    const nps = ks.map((x, i) => [tx.num(c, x.value, { size: c.Z.kpi * (n >= 4 ? 0.82 : 0.98), color: c.dark ? K.WHITE : t.num, bind: KB + i + '.value', sa: 6 })]);
    const nk = oneLine(nps, cw, PM.groupK(nps.map(ps => ({ w: cw, h: 70, ps })), 1));
    const lps = ks.map((x, i) => (x.label ? [tx.label(c, x.label, { bold: true, color: t.title, bind: KB + i + '.label', size: c.Z.label * 1.25 })] : []).concat(x.text ? [tx.body(c, x.text, { color: t.muted, bind: KB + i + '.text', sb: 3, size: c.Z.body * 0.95 })] : []));
    const items = bb.items, m = items.length, cols = m >= 4 ? 2 : 1, per = Math.ceil(m / cols), bg = 40, bw = (G.CW - bg * (cols - 1)) / cols;
    const BB = 'blocks.' + bi(sp, bb) + '.items.';
    const bcs = []; for (let j = 0; j < cols; j++) bcs.push(items.slice(j * per, (j + 1) * per).map((s, q) => tx.body(c, s, { bind: BB + (j * per + q), bullet: 'dot', bc: K.SKY, sb: q ? 7 : 0, lh: 1.38, color: t.body })));
    const pad = 26, NH = mx(nps.map(ps => PM.hK(ps, cw, nk)));
    const blab = bb.head ? 30 : 0, klab = kb_.head ? 30 : 0;
    const tot = kk => klab + pad * 2 + NH + mx(lps.map(ps => PM.hK(ps, cw, kk))) + 30 + blab + mx(bcs.map(ps => PM.hK(ps, bw, kk)));
    let k = Math.min(1.2, PM.groupK(lps.map(ps => ({ w: cw, h: 90, ps })).concat(bcs.map(ps => ({ w: bw, h: 160, ps }))), 1.2));
    k = fitTo(k, G.BOT - top - 22, tot);
    const bandH = pad * 2 + NH + mx(lps.map(ps => PM.hK(ps, cw, k)));
    let y = place(top + 22, G.BOT, tot(k), 0.4);
    y += blockLabel(c, sp, kb_, o, G.X0, y, G.CW);
    under(o, R(0, y, W, bandH, c.dark ? K.DEEP : K.PALE, { role: 'bg', name: 'Band' }));
    ks.forEach((x, i) => {
      const xx = G.X0 + i * (cw + gx);
      if (i > 0) o.push(Ln(xx - gx / 2, y + 20, 0, bandH - 40, c.dark ? K.RULE_D : 'D3DEEB'));
      const a = PM.tk(xx, y + pad, cw, nps[i], nk, { name: 'Number ' + (i + 1) }); if (a) o.push(a);
      const b = PM.tk(xx, y + pad + NH, cw, lps[i], k, { name: 'Label ' + (i + 1) }); if (b) o.push(b);
    });
    y += bandH + 30;
    y += blockLabel(c, sp, bb, o, G.X0, y, G.CW);
    bcs.forEach((ps, j) => { const b = PM.tk(G.X0 + j * (bw + bg), y, bw, ps, k, { name: 'Points ' + (j + 1) }); if (b) o.push(b); });
    return o;
  }
});

/* M3 · items as a numbered side column + the table on the wide side (blockBox) */
mdef('gm-items-table', 'بنود جانبية + جدول', {
  tags: ['مختلط', 'جدول', 'بنود'],
  accepts: sp => {
    const bs = blocksOf(sp), it = one(sp, 'items')[0], tb = one(sp, 'table')[0], ps = one(sp, 'para');
    if (!it || !tb || bs.length !== 2 + ps.length || ps.length > 1) return 0;
    if (it.items.length < 2 || it.items.length > 4 || tb.rows.length > 8 || (tb.rows[0] || []).length > 5) return 0;
    if (it.items.some(x => (x.bullets || []).length > 3 || PM.words([x.title, x.text].join(' ')) > 22)) return 0;
    return 0.88;
  },
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    let top = PM.head(c, sp, o, {});
    const pb = one(sp, 'para')[0], ib = one(sp, 'items')[0], tb = one(sp, 'table')[0];
    if (pb) { const tmp = []; const used = PM.blockBox(c, sp, pb, tmp, G.X0, top + 12, Math.min(G.CW, 720), 70, {}); tmp.forEach(x => o.push(x)); top += 12 + used; }
    top += 30;
    const lw = 270, gap = 48, rx = G.X0 + lw + gap, rw = G.X1 - rx, pad = c.dark ? 22 : 0, iw = lw - pad * 2 - 34;
    const B = 'blocks.' + bi(sp, ib) + '.';
    const items = ib.items.map(x => (typeof x === 'string' ? { text: x } : x)), n = items.length, RG = 22;
    const pss = items.map((it, i) => titleP(c, it, i, { B, hsa: 3 }).concat(bodyPs(c, it, i, { B, tc: t.muted, ts: c.Z.body * 0.95 })));
    const tot = kk => pad * 2 + sum(pss.map(ps => PM.hK(ps, iw, kk))) + RG * (n - 1);
    let k = Math.min(1.12, PM.groupK(pss.map(ps => ({ w: iw, h: (G.BOT - top) / n - RG, ps })), 1.12));
    k = fitTo(k, G.BOT - top, tot);
    const tH = boxH(c, sp, tb, rw, G.BOT - top);
    const blockH = Math.max(tot(k), tH);
    const y0 = place(top, G.BOT, blockH, 0.42);
    if (c.dark) o.push(R(G.X0, y0, lw, blockH, card(c), { r: 14, name: 'Panel' }));
    else o.push(Ln(G.X0 + lw + gap / 2, y0, 0, blockH, t.rule));
    let y = y0 + pad + (blockH - tot(k)) / 2;
    items.forEach((it, i) => {
      if (i > 0 && !c.dark) o.push(Ln(G.X0, y - RG / 2, lw, 0, t.rule));
      o.push(T(G.X0 + pad, y, 30, 20, [num(c, PM.pad2(i + 1), 12, c.dark ? K.SKY : t.accent)], { name: 'Number' }));
      const a = PM.tk(G.X0 + pad + 34, y, iw, pss[i], k, { name: 'Item ' + (i + 1) }); if (a) { o.push(a); y += a.h + RG; }
    });
    PM.blockBox(c, sp, tb, o, rx, y0 + (blockH - tH) / 2, rw, tH);
    return o;
  }
});

/* M4 · table on the open side + notes (para / bullets) in a panel that bleeds off the edge */
mdef('gm-table-notes', 'جدول + لوحة ملاحظات', {
  tags: ['مختلط', 'جدول', 'لوحة'],
  accepts: sp => {
    const bs = blocksOf(sp), tb = one(sp, 'table')[0];
    if (!tb || bs.length < 2 || bs.length > 3 || bs.some(b => b !== tb && b.k !== 'para' && b.k !== 'bullets')) return 0;
    if (tb.rows.length > 8 || (tb.rows[0] || []).length > 4) return 0;
    const words = sum(bs.filter(b => b !== tb).map(b => b.k === 'para' ? PM.words(b.text) : sum(b.items.map(PM.words))));
    return words <= 70 ? 0.88 : 0;
  },
  render(sp, c) {
    const o = [], t = c.tone, pw = 300;
    PM.chrome(c, o);
    under(o, R(W - pw, 0, pw, H, c.dark ? K.DEEP : K.PALE, { role: 'bg', name: 'Notes panel' }));
    const lw = W - pw - G.X0 - 44;
    const top = PM.head(c, sp, o, { w: lw }) + 30;
    const tb = one(sp, 'table')[0], notes = blocksOf(sp).filter(b => b !== tb);
    const tH = boxH(c, sp, tb, lw, G.BOT - top);
    const ty = place(top, G.BOT, tH, 0.42);
    PM.blockBox(c, sp, tb, o, G.X0, ty, lw, tH);
    const nx = W - pw + 36, nw = pw - 36 - 44;
    const hs = notes.map(b => boxH(c, sp, b, nw, 150, { maxK: 1.15 }));
    const GAP = 26, totN = sum(hs) + GAP * (notes.length - 1) + 20;
    let y = place(90, G.BOT, totN, 0.45);
    o.push(R(nx, y, 30, 3, K.SKY, { name: 'Tick' }));
    y += 20;
    notes.forEach((b, i) => {
      const used = PM.blockBox(c, sp, b, o, nx, y, nw, 150, { maxK: 1.15 });
      y += used + GAP;
    });
    return o;
  }
});

/* ======================================================================
   STATEMENT / QUOTE EXTRAS (gq-)
   ====================================================================== */
/* Q1 · a paragraph built on a figure: the first number in it is lifted out large beside the text */
const NUMRE = /[+\-−]?\d[\d.,٫]*\s*(%|٪)?/;
const SCALE = /^(مليون|مليار|ألف|آلاف|million|billion|thousand|percent|%)/i;
function figure(text) {
  const raw = String(text || ''), d = PM.digits(raw);
  const m = d.match(NUMRE);
  if (!m) return null;
  const v = m[0].trim();
  if (v.replace(/[^\d]/g, '').length < 1 || /^(19|20)\d\d$/.test(v)) return null;
  const after = d.slice(m.index + m[0].length).trim().split(/\s+/).filter(Boolean);
  let cap = [];
  if (after[0] && SCALE.test(after[0])) cap = after.slice(0, 2);
  else if (after[0]) cap = after.slice(0, 1);
  return { v, cap: cap.join(' ').replace(/[،,.؛;]+$/, '') };
}
gdef('statement', 'gq-figure', 'فقرة برقم بارز', {
  forms: ['para'], tags: ['نص', 'أرقام', 'عبارة'],
  accepts: sp => sp.form === 'para' && sp.textWords >= 15 && sp.textWords <= 70 && figure(sp.text) ? 0.86 : 0,
  render(sp, c) {
    const o = [], t = c.tone, f = figure(sp.text), nw = 300;
    PM.chrome(c, o);
    if (c.dark) under(o, R(0, 0, G.X0 + nw, H, K.DEEP, { role: 'bg', name: 'Figure panel' }));
    const fps = [tx.num(c, f.v, { size: 120, color: c.dark ? K.SKY : K.BLUE, sa: 6, lh: 1 })];
    if (f.cap) fps.push(tx.h(c, f.cap, { size: c.Z.lead, color: c.dark ? K.WHITE : t.title, sa: 0 }));
    const fb = T(G.X0, 120, nw - 40, 300, fps, { va: 'm', name: 'Figure', minK: 0.4 });
    o.push(fb);
    o.push(R(G.X0, fb.y + (fb.h - fb.used) / 2 - 18, 40, 3, K.SKY, { name: 'Tick' }));
    if (!c.dark) o.push(Ln(G.X0 + nw, 110, 0, 320, t.rule));
    const x = G.X0 + nw + 48, w = G.X1 - x;
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', sa: 10 }));
    if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title', size: c.Z.title * 0.92, sa: 18 }));
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub', sb: 0, sa: 14 }));
    ps.push(Object.assign(tx.body(c, sp.text, { size: c.Z.lead * 1.02, color: c.dark ? K.BODY_D : t.body, bind: 'text', lh: 1.55 }), { cap: c.en ? 19 : 23 }));
    o.push(T(x, 70, w, 420, ps, { va: 'm', name: 'Statement', minK: 0.66, maxK: 1.2 }));
    return o;
  }
});

/* Q2 · quote on an edge-to-edge band, the glyph hanging over its top edge, attribution beneath */
gdef('quote', 'gq-band', 'اقتباس على شريط عرضي', {
  forms: ['quote'], tags: ['اقتباس', 'شريط'],
  accepts: sp => sp.form === 'quote' && PM.words(sp.main && sp.main.text) <= 48 ? 0.84 : 0,
  render(sp, c) {
    const o = [], t = c.tone;
    PM.chrome(c, o);
    const q = sp.main.text, by = sp.main.by;
    let top = 70;
    if (sp.title) { const hb = PM.textAt(G.X0, 64, G.CW, 40, [tx.eyebrow(c, sp.title, { bind: 'title', sa: 0 })], { name: 'Title' }); o.push(hb); top = hb.y + hb.h; }
    const w = G.CW - 80;
    const qps = [Object.assign(tx.title(c, q, { size: c.Z.quote * 1.08, bind: 'main.text', color: c.dark ? K.WHITE : K.NAVY, lh: 1.42 }), { cap: c.en ? 27 : 33 })];
    const kk = PM.groupK([{ w, h: 230, ps: qps }], 1.2);
    const qh = PM.hK(qps, w, kk);
    const pad = 54, bh = qh + pad * 2;
    const byH = by ? 46 : 0;
    const by0 = place(top + 60, G.BOT, bh + byH, 0.5);
    under(o, R(0, by0, W, bh, c.dark ? K.DEEP : K.PALE, { role: 'bg', name: 'Band' }));
    o.push(T(G.X0 - 6, by0 - 62, 130, 100, [P('“', 150, { font: 'num', color: K.SKY, lh: 1 })], { fit: false, name: 'Quote mark' }));
    o.push(PM.tk(G.X0 + 40, by0 + pad, w, qps, kk, { name: 'Quote' }));
    if (by) {
      o.push(R(G.X1 - 300, by0 + bh + 24, 30, 3, K.SKY, { name: 'Tick' }));
      o.push(T(G.X1 - 300, by0 + bh + 34, 300, 30, [tx.label(c, by, { bind: 'main.by', color: t.title, bold: true, size: c.Z.label * 1.2 })], { name: 'Attribution' }));
    }
    return o;
  }
});
})(window.PM);
