/* ==========================================================================
   Layout families · steps (process 2–7) and timeline (dated milestones 2–8)
   No slanted shapes: connectors are straight hairlines and dots.
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Ic, G, tx } = PM;
const isSteps = sp => (sp.form === 'steps' || sp.form === 'items' || sp.form === 'bullets') && sp.n >= 2 && sp.n <= 7;
const isTL = sp => sp.form === 'timeline' && sp.n >= 2 && sp.n <= 8;
const bindOf = i => 'main.items.' + i + '.';
const its = sp => PM.its(sp);
const area = (c, sp, o, opt) => PM.itemsArea(c, sp, o, opt);
const sdef = (id, name, o) => PM.def('steps', id, name, Object.assign({ forms: ['steps'] }, o));
const tdef = (id, name, o) => PM.def('timeline', id, name, Object.assign({ forms: ['timeline'] }, o));
const stepBonus = sp => sp.form === 'steps' ? 0.12 : sp.form === 'timeline' ? -0.2 : 0;

/* ---------- S1 · horizontal: numbered dots on a line ---------- */
function hline(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 40;
    const items = its(sp), n = items.length;
    const gx = n >= 6 ? 14 : 26;
    const cw = (G.CW - gx * (n - 1)) / n;
    const d = style === 'big' ? 46 : 32;
    const pss = items.map((it, i) => PM.ips(c, it, i, { k: n >= 5 ? 0.9 : 0.98 }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - d - 26, ps })), 1.15);
    const blockH = d + 24 + Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const y0 = PM.place(top, G.BOT, blockH, 0.45);
    const cy = y0 + d / 2;
    o.push(Ln(G.X0 + d / 2, cy, G.CW - cw + 0, 0, c.tone.rule, { sw: 1.5, name: 'Connector' }));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      const done = style === 'fill' || i === 0;
      if (style === 'ring') o.push(E(x, y0, d, d, c.tone.bg, { stroke: c.tone.accent, sw: 2 }));
      else o.push(E(x, y0, d, d, done ? (c.dark ? K.SKY : K.BLUE) : (c.dark ? '163A70' : 'E3EAF3'), { name: 'Step dot' }));
      o.push(T(x, y0, d, d, [tx.num(c, String(i + 1), { size: d * 0.4, color: style === 'ring' ? c.tone.accent : done ? (c.dark ? K.NAVY : K.WHITE) : c.tone.accent, al: 'c', sa: 0 })], { va: 'm', align: 'center', name: 'Step number' }));
      const tb = PM.tk(x, y0 + d + 22, cw - 6, pss[i], kk, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  };
}
const hlA = pref => sp => isSteps(sp) && sp.maxItemWords <= (sp.n >= 6 ? 22 : 34) && !sp.hasBullets ? pref + stepBonus(sp) : 0;
sdef('steps-line', 'خط مراحل مرقّم', { accepts: hlA(0.8), render: hline('first'), tags: ['مراحل', 'خط'] });
sdef('steps-line-fill', 'خط مراحل ممتلئ', { accepts: hlA(0.78), render: hline('fill'), tags: ['مراحل'] });
sdef('steps-line-ring', 'خط مراحل بحلقات', { accepts: hlA(0.78), render: hline('ring'), tags: ['مراحل', 'حلقات'] });
sdef('steps-line-big', 'مراحل بدوائر كبيرة', { accepts: sp => hlA(0.76)(sp) && sp.n <= 5 ? 0.76 + stepBonus(sp) : 0, render: hline('big'), tags: ['مراحل'] });

/* ---------- S2 · big numerals with arrows between ---------- */
PM.def('steps', 'steps-numerals', 'أرقام كبيرة وأسهم', {
  forms: ['steps'], tags: ['مراحل', 'أرقام'],
  accepts: sp => isSteps(sp) && sp.n <= 5 && sp.maxItemWords <= 34 && !sp.hasBullets ? 0.8 + stepBonus(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 36;
    const items = its(sp), n = items.length, gx = 44;
    const cw = (G.CW - gx * (n - 1)) / n;
    const pss = items.map((it, i) => PM.ips(c, it, i, { k: 0.98 }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - 70, ps })), 1.15);
    const blockH = 66 + Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const y0 = PM.place(top, G.BOT, blockH, 0.45);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(T(x, y0 - 6, cw, 56, [tx.num(c, PM.pad2(i + 1), { size: c.Z.kpi * 1.05, color: c.dark ? K.SKY : K.SKY, sa: 0 })], { name: 'Number' }));
      if (i < n - 1) o.push(Ic(x + cw + gx / 2 - 11, y0 + 14, 22, 'lib:arrow-right', c.tone.rule, { sw: 1.6, name: 'Arrow', flipRtl: true }));
      const tb = PM.tk(x, y0 + 66, cw, pss[i], kk, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* ---------- S3 · vertical steps on a rail ---------- */
function vrail(style) {
  return (sp, c) => {
    const o = [];
    const split = style === 'split';
    PM.chrome(c, o);
    let x0 = G.X0, w = G.CW, top;
    if (split) {
      const pw = 300;
      const ps = [];
      if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow' }));
      if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title' }));
      if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub' }));
      if (sp.lead) ps.push(tx.body(c, sp.lead, { bind: 'lead', sb: 14 }));
      o.push(T(G.X0, 90, pw - 30, 360, ps, { va: 'm', name: 'Title' }));
      x0 = G.X0 + pw + 30; w = G.X1 - x0; top = 66;
    } else top = area(c, sp, o) + 26;
    const items = its(sp), n = items.length;
    const d = 30, pre = 54;
    const rowAvail = (G.BOT - top) / n - 14;
    const pss = items.map((it, i) => PM.ips(c, it, i, { k: n >= 5 ? 0.9 : 0.98 }));
    const kk = PM.groupK(pss.map(ps => ({ w: w - pre, h: rowAvail, ps })), 1.18);
    const hs = pss.map(ps => Math.max(PM.hK(ps, w - pre, kk), d));
    const gap = Math.min(30, ((G.BOT - top) - hs.reduce((a, b) => a + b, 0)) / Math.max(1, n - 1));
    const total = hs.reduce((a, b) => a + b, 0) + gap * (n - 1);
    let y = PM.place(top, G.BOT, total, 0.45);
    const ys = [];
    items.forEach((it, i) => { ys.push(y); y += hs[i] + gap; });
    o.push(Ln(x0 + d / 2, ys[0] + d / 2, 0, ys[n - 1] - ys[0], c.tone.rule, { sw: 1.5, name: 'Rail' }));
    items.forEach((it, i) => {
      o.push(E(x0, ys[i], d, d, c.dark ? K.SKY : K.BLUE, { name: 'Step dot' }));
      o.push(T(x0, ys[i], d, d, [tx.num(c, String(i + 1), { size: 12, color: c.dark ? K.NAVY : K.WHITE, al: 'c', sa: 0 })], { va: 'm', align: 'center', name: 'Step number' }));
      const tb = PM.tk(x0 + pre, ys[i] + 3, w - pre, pss[i], kk, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  };
}
sdef('steps-vertical', 'مراحل عمودية', { accepts: sp => isSteps(sp) && sp.n >= 3 && sp.n <= 6 ? 0.78 + stepBonus(sp) + (sp.maxItemWords > 30 ? 0.06 : 0) : 0, render: vrail('full'), tags: ['مراحل', 'عمودي'] });
sdef('steps-vertical-split', 'عنوان جانبي + مراحل عمودية', { accepts: sp => isSteps(sp) && sp.n >= 3 && sp.n <= 6 && sp.maxItemWords <= 36 ? 0.79 + stepBonus(sp) : 0, render: vrail('split'), tags: ['مراحل', 'جانبي'] });

/* ---------- S4 · cards joined by a line ---------- */
PM.def('steps', 'steps-cards', 'بطاقات مراحل متصلة', {
  forms: ['steps'], tags: ['مراحل', 'بطاقات'],
  accepts: sp => isSteps(sp) && sp.n >= 3 && sp.n <= 5 && sp.maxItemWords <= 34 && !sp.hasBullets ? 0.78 + stepBonus(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 40;
    const items = its(sp), n = items.length, gx = 22;
    const cw = (G.CW - gx * (n - 1)) / n, pad = 20;
    const pss = items.map((it, i) => PM.ips(c, it, i, { k: 0.94 }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw - pad * 2, h: G.BOT - top - 90, ps })), 1.12);
    const ch = Math.min(G.BOT - top, Math.max(...pss.map(ps => PM.hK(ps, cw - pad * 2, kk))) + 62 + pad);
    const y0 = PM.place(top, G.BOT, ch, 0.45);
    o.push(Ln(G.X0, y0 + 26, G.CW, 0, c.tone.rule, { sw: 1, name: 'Connector' }));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(R(x, y0 + 26 - 0.5, cw, ch - 26, c.tone.cardFill, { r: 14, name: 'Card' }));
      o.push(E(x + pad, y0 + 10, 32, 32, c.dark ? K.SKY : K.BLUE, { name: 'Step dot' }));
      o.push(T(x + pad, y0 + 10, 32, 32, [tx.num(c, String(i + 1), { size: 13, color: c.dark ? K.NAVY : K.WHITE, al: 'c', sa: 0 })], { va: 'm', align: 'center' }));
      const tb = PM.tk(x + pad, y0 + 58, cw - pad * 2, pss[i], kk, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* ---------- S5 · staircase (rising blocks) ---------- */
PM.def('steps', 'steps-stairs', 'درج تصاعدي', {
  forms: ['steps'], tags: ['مراحل', 'تصاعدي'],
  accepts: sp => isSteps(sp) && sp.n >= 3 && sp.n <= 5 && sp.maxItemWords <= 22 && !sp.hasBullets ? 0.74 + stepBonus(sp) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = its(sp), n = items.length, gx = 10;
    const cw = (G.CW - gx * (n - 1)) / n;
    const maxH = G.BOT - top;
    const pss = items.map((it, i) => PM.ips(c, it, i, { k: 0.95 }).map(p => Object.assign(p, { color: p.bold ? K.WHITE : 'D5E1F0' })));
    const kk = PM.groupK(pss.map(ps => ({ w: cw - 32, h: maxH * 0.42 - 62, ps })), 1.2, 0.7);
    const need = Math.max(...pss.map(ps => PM.hK(ps, cw - 32, kk))) + 62;
    const minH = Math.min(maxH * 0.55, Math.max(need, 120));
    const shades = c.dark ? ['0F3B78', '1F4F92', '2F64AC', '3F79C6', '5390DD'] : ['62B6F3', '3B8FE0', '1F6AC6', K.BLUE, K.NAVY];
    items.forEach((it, i) => {
      const hh = minH + (maxH - minH) * (i / (n - 1 || 1));
      const x = G.X0 + i * (cw + gx), y = G.BOT - hh;
      const sh = shades[Math.round(i * (shades.length - 1) / (n - 1 || 1))];
      o.push(R(x, y, cw, hh, sh, { r: 12, name: 'Step block' }));
      o.push(T(x + 16, y + 14, cw - 32, 30, [tx.num(c, PM.pad2(i + 1), { size: 16, color: K.WHITE, sa: 0 })], { name: 'Number' }));
      const tb = PM.tk(x + 16, y + 46, cw - 32, pss[i], kk, { name: 'Step ' + (i + 1) }); if (tb) { tb.paras.forEach(p => p.color = p.bold ? K.WHITE : (i === 0 && !c.dark ? K.NAVY : 'E6EEF8')); if (i === 0 && !c.dark) tb.paras.forEach(p => p.color = K.NAVY); o.push(tb); }
    });
    return o;
  }
});

/* ---------- S6 · cycle around a centre ---------- */
PM.def('steps', 'steps-cycle', 'دورة متكاملة', {
  forms: ['steps'], tags: ['دورة', 'دائرة'],
  accepts: sp => isSteps(sp) && sp.n >= 3 && sp.n <= 6 && sp.maxItemWords <= 14 && !sp.hasBullets ? 0.72 + stepBonus(sp) + (/دورة|cycle|loop|مستمر|continuous/i.test(sp.title) ? 0.2 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, { w: 330 }) + 10;
    const items = its(sp), n = items.length;
    const cx = 610, cy = 292, R0 = 132;
    o.push(E(cx - R0, cy - R0, R0 * 2, R0 * 2, null, { stroke: c.tone.rule, sw: 1.5, name: 'Cycle' }));
    if (sp.lead) o.push(PM.textAt(G.X0, top + 20, 300, 260, [tx.body(c, sp.lead, { bind: 'lead' })], { name: 'Lead' }));
    items.forEach((it, i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / n;
      const px = cx + Math.cos(a) * R0, py = cy + Math.sin(a) * R0;
      o.push(E(px - 20, py - 20, 40, 40, c.dark ? K.SKY : K.BLUE, { name: 'Step dot' }));
      o.push(T(px - 20, py - 20, 40, 40, [tx.num(c, String(i + 1), { size: 14, color: c.dark ? K.NAVY : K.WHITE, al: 'c', sa: 0 })], { va: 'm', align: 'center' }));
      const cs = Math.cos(a), sn = Math.sin(a);
      const side = cs > 0.25 ? 'r' : cs < -0.25 ? 'l' : (sn < 0 ? 't' : 'b');
      let bx, by, bw, va = 'm', al = 'c';
      if (side === 'r') { bx = px + 30; bw = Math.min(190, G.X1 + 40 - bx); al = 'l'; }
      else if (side === 'l') { bw = Math.min(190, px - 30 - (G.X0 + 330)); bx = px - 30 - bw; al = 'r'; }
      else { bw = 210; bx = px - bw / 2; }
      const ps = PM.ips(c, it, i, { k: 0.86 });
      const h = Math.min(90, PM.hOf(ps, bw) + 2);
      if (side === 'r' || side === 'l') by = py - h / 2; else if (side === 't') { by = py - 28 - h; va = 'b'; } else { by = py + 28; va = 't'; }
      const tb = T(bx, by, bw, h, ps, { va, name: 'Step ' + (i + 1) });
      tb.paras.forEach(p => p.al = al);
      o.push(tb);
    });
    return o;
  }
});

/* ---------- S7 · photo band + steps ---------- */
PM.def('steps', 'steps-photo', 'صورة + مراحل', {
  forms: ['steps'], tags: ['مراحل', 'صورة'],
  accepts: sp => isSteps(sp) && sp.n >= 3 && sp.n <= 5 && sp.maxItemWords <= 22 && !sp.lead && !sp.hasBullets ? 0.74 + stepBonus(sp) + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    const bandH = 210;
    PM.chrome(c, o, { noLogo: true, noBar: true });
    PM.photoBlock(c, sp, o, 0, 0, W, bandH, { veil: 'up', a0: 0, a1: 88 });
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { color: K.SKY, bind: 'eyebrow' }));
    if (sp.title) ps.push(tx.title(c, sp.title, { color: K.WHITE, bind: 'title' }));
    o.push(T(G.X0, bandH - 112, G.CW, 92, ps, { va: 'b', name: 'Title' }));
    const items = its(sp), n = items.length, gx = 24, cw = (G.CW - gx * (n - 1)) / n;
    const y0 = bandH + 36;
    const pss = items.map((it, i) => PM.ips(c, it, i, { k: 0.92 }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - y0 - 50, ps })), 1.1);
    o.push(Ln(G.X0, y0 + 14, G.CW, 0, c.tone.rule, { sw: 1.2 }));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(E(x, y0, 28, 28, c.dark ? K.SKY : K.BLUE));
      o.push(T(x, y0, 28, 28, [tx.num(c, String(i + 1), { size: 12, color: c.dark ? K.NAVY : K.WHITE, al: 'c', sa: 0 })], { va: 'm', align: 'center' }));
      const tb = PM.tk(x, y0 + 46, cw, pss[i], kk, { name: 'Step ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* ======================= TIMELINE ======================= */
const tps = (c, it, i, o = {}) => {
  const ps = [];
  if (it.title) ps.push(tx.h(c, it.title, { bind: bindOf(i) + 'title', sa: it.text ? 4 : 0, k: o.k }));
  if (it.text) ps.push(tx.body(c, it.text, { bind: bindOf(i) + 'text', k: o.k }));
  return ps;
};
const dps = (c, it, i, size, color) => [tx.num(c, it.value || '', { size, color, bind: bindOf(i) + 'date', sa: 0 })];
const dateIsWords = sp => sp.items.some(it => PM.words(it.value) > 2);

/* T1 · horizontal line, dates above, text below */
function thoriz(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 36;
    const items = sp.items, n = items.length, gx = n >= 6 ? 12 : 22;
    const cw = (G.CW - gx * (n - 1)) / n;
    const dsz = dateIsWords(sp) ? 12 : (n >= 6 ? 17 : 22);
    const dps2 = items.map((it, i) => dateIsWords(sp) ? [tx.label(c, it.value || '', { bind: bindOf(i) + 'date', color: c.tone.accent, bold: true })] : dps(c, it, i, dsz, c.tone.accent));
    const pss = items.map((it, i) => tps(c, it, i, { k: n >= 6 ? 0.88 : 0.96 }));
    const dh = Math.max(...dps2.map(ps => PM.blockH(ps, cw))) + 4;
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - dh - 40, ps })), 1.12);
    const bh = dh + 38 + Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const y0 = PM.place(top, G.BOT, bh, 0.45);
    const ly = y0 + dh + 14;
    o.push(Ln(G.X0 - 10, ly, G.CW + 20, 0, c.tone.accent, { sw: 1.5, name: 'Timeline' }));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(T(x, y0, cw, dh, dps2[i], { name: 'Date ' + (i + 1) }));
      o.push(E(x - 1, ly - 6, 12, 12, style === 'ring' ? c.tone.bg : (c.dark ? K.SKY : K.BLUE), { stroke: style === 'ring' ? c.tone.accent : null, sw: 2, name: 'Milestone' }));
      const tb = PM.tk(x, ly + 24, cw - 4, pss[i], kk, { name: 'Milestone ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  };
}
tdef('tl-horizontal', 'خط زمني أفقي', { accepts: sp => isTL(sp) && sp.maxItemWords <= 30 ? 0.86 : 0, render: thoriz('dot'), tags: ['خط زمني'] });
tdef('tl-horizontal-ring', 'خط زمني بحلقات', { accepts: sp => isTL(sp) && sp.maxItemWords <= 30 ? 0.82 : 0, render: thoriz('ring'), tags: ['خط زمني', 'حلقات'] });

/* T2 · alternating above / below */
tdef('tl-alternate', 'خط زمني متناوب', {
  tags: ['خط زمني', 'متناوب'],
  accepts: sp => isTL(sp) && sp.n >= 4 && sp.maxItemWords <= 24 ? 0.82 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 16;
    const items = sp.items, n = items.length;
    const ly = (top + G.BOT) / 2 + 6;
    const step = G.CW / n, cw = Math.min(step * 1.7, 230);
    o.push(Ln(G.X0 - 10, ly, G.CW + 20, 0, c.tone.accent, { sw: 1.5 }));
    const half = (G.BOT - top) / 2 - 18;
    const pss = items.map((it, i) => [...(dateIsWords(sp) ? [tx.label(c, it.value || '', { bind: bindOf(i) + 'date', color: c.tone.accent, bold: true, sa: 4 })] : [tx.num(c, it.value || '', { size: 18, color: c.tone.accent, bind: bindOf(i) + 'date', sa: 6 })]), ...tps(c, it, i, { k: 0.88 })]);
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: half - 18, ps })), 1.1);
    items.forEach((it, i) => {
      const cx = G.X0 + step * (i + 0.5);
      const up = i % 2 === 0;
      const x = Math.max(G.X0 - 8, Math.min(G.X1 - cw + 8, cx - cw / 2));
      o.push(E(cx - 6, ly - 6, 12, 12, c.dark ? K.SKY : K.BLUE));
      const h = PM.hK(pss[i], cw, kk);
      o.push(Ln(cx, up ? ly - 18 : ly + 6, 0, 12, c.tone.rule));
      const tb = PM.tk(x, up ? ly - 24 - h : ly + 26, cw, pss[i], kk, { align: 'center', name: 'Milestone ' + (i + 1) });
      if (tb) { tb.paras.forEach(p => p.al = 'c'); o.push(tb); }
    });
    return o;
  }
});

/* T3 · vertical list with dates on the side */
function tvert(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 24;
    const items = sp.items, n = items.length;
    const dw = dateIsWords(sp) ? 170 : 110, x1 = G.X0 + dw + 40, w1 = G.X1 - x1;
    const pss = items.map((it, i) => tps(c, it, i, { k: n >= 6 ? 0.88 : 0.95 }));
    const dpss = items.map((it, i) => dateIsWords(sp) ? [tx.label(c, it.value || '', { bind: bindOf(i) + 'date', color: c.tone.accent, bold: true })] : dps(c, it, i, 18, c.tone.accent));
    const rowAvail = (G.BOT - top) / n - 12;
    const kk = PM.groupK(pss.map(ps => ({ w: w1, h: rowAvail, ps })), 1.15);
    const hs = pss.map((ps, i) => Math.max(PM.hK(ps, w1, kk), PM.blockH(dpss[i], dw), 22));
    const gap = Math.min(28, (G.BOT - top - hs.reduce((a, b) => a + b, 0)) / Math.max(1, n - 1));
    let y = PM.place(top, G.BOT, hs.reduce((a, b) => a + b, 0) + gap * (n - 1), 0.4);
    const lx = G.X0 + dw + 18;
    const ys = []; items.forEach((_, i) => { ys.push(y); y += hs[i] + gap; });
    o.push(Ln(lx, ys[0] + 11, 0, ys[n - 1] - ys[0], c.tone.rule, { sw: 1.5, name: 'Rail' }));
    items.forEach((it, i) => {
      o.push(T(G.X0, ys[i], dw, Math.max(hs[i], 24), dpss[i], { name: 'Date ' + (i + 1), align: style === 'endDates' ? 'end' : 'start' }));
      o.push(E(lx - 5, ys[i] + 6, 10, 10, c.dark ? K.SKY : K.BLUE));
      const tb = PM.tk(x1, ys[i], w1, pss[i], kk, { name: 'Milestone ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  };
}
tdef('tl-vertical', 'خط زمني عمودي', { accepts: sp => isTL(sp) && sp.n <= 7 ? 0.8 + (sp.maxItemWords > 24 ? 0.08 : 0) : 0, render: tvert('start'), tags: ['خط زمني', 'عمودي'] });

/* T4 · big year columns */
tdef('tl-years', 'أعمدة سنوات كبيرة', {
  tags: ['خط زمني', 'سنوات'],
  accepts: sp => isTL(sp) && sp.n >= 2 && sp.n <= 5 && !dateIsWords(sp) && sp.items.every(it => PM.len(it.value) <= 8) ? 0.82 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 36;
    const items = sp.items, n = items.length, gx = 30, cw = (G.CW - gx * (n - 1)) / n;
    const pss = items.map((it, i) => tps(c, it, i, { k: 0.96 }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - 90, ps })), 1.12);
    const bh = 86 + Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const y0 = PM.place(top, G.BOT, bh, 0.45);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(T(x, y0, cw, 56, dps(c, it, i, c.Z.kpi * (n >= 5 ? 0.82 : 1), i === n - 1 ? c.tone.accent : (c.dark ? '2F5A92' : 'B8CDE6')), { name: 'Year' }));
      o.push(Ln(x, y0 + 66, cw, 0, i === n - 1 ? c.tone.accent : c.tone.rule, { sw: i === n - 1 ? 2 : 1 }));
      const tb = PM.tk(x, y0 + 84, cw, pss[i], kk, { name: 'Milestone ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* T5 · gantt-style bars (when dates read as periods) */
tdef('tl-gantt', 'مخطط زمني بالأشرطة', {
  tags: ['خط زمني', 'أشرطة'],
  accepts: sp => isTL(sp) && sp.n >= 3 && sp.n <= 7 && sp.maxItemWords <= 16 ? 0.74 + (dateIsWords(sp) ? 0.12 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = sp.items, n = items.length;
    const lw = 300, gx0 = G.X0 + lw + 20, gw = G.X1 - gx0;
    const rh = Math.min(58, (G.BOT - top) / n);
    const y0 = PM.place(top, G.BOT, rh * n, 0.4);
    // even spread across the chart width, one segment each, in order
    const seg = gw / n;
    const dk = c.dark;
    items.forEach((it, i) => { if (i % 2 === 0) o.push(R(G.X0 - 10, y0 + i * rh, G.X1 - G.X0 + 20, rh, dk ? '0D3A70' : 'F2F6FB', { r: 8, name: 'Row band' })); });
    for (let k = 0; k <= n; k++) o.push(Ln(gx0 + k * seg, y0 - 6, 0, rh * n + 6, c.tone.rule2, { sw: 0.75 }));
    items.forEach((it, i) => {
      const y = y0 + i * rh;
      const ps = [tx.h(c, it.title || it.value, { k: 0.86, bind: bindOf(i) + (it.title ? 'title' : 'date'), sa: 2 })];
      if (it.text) ps.push(tx.body(c, it.text, { size: c.Z.small, bind: bindOf(i) + 'text', color: c.tone.muted }));
      o.push(T(G.X0, y + 3, lw, rh - 6, ps, { va: 'm', name: 'Task ' + (i + 1) }));
      // bars overlap the next period a little — reads as a real schedule
      const bx = gx0 + i * seg + 4, bw = Math.min(gw - (bx - gx0) - 2, seg * (i === n - 1 ? 1 : 1.35) - 8);
      const col = i === n - 1 ? (dk ? K.WHITE : K.NAVY) : (dk ? K.SKY : K.BLUE);
      const bh = Math.min(26, rh - 14);
      o.push(R(bx, y + rh / 2 - bh / 2, Math.max(30, bw), bh, col, { r: bh / 2, name: 'Bar' }));
      if (it.value && it.title) o.push(T(bx + 8, y + rh / 2 - bh / 2, Math.max(30, bw) - 16, bh, [tx.label(c, it.value, { size: c.Z.small * 0.95, color: i === n - 1 && dk ? K.NAVY : K.WHITE, bind: bindOf(i) + 'date', al: 'c' })], { va: 'm', align: 'center', name: 'Period', fit: true }));
    });
    return o;
  }
});
})(window.PM);
