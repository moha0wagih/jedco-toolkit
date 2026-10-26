/* ==========================================================================
   Layout family · items (cards / pillars / features: title + text, 2–8)
   Every sibling shares one text scale; compositions are balanced vertically.
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Ic, G, tx } = PM;
const def = (id, name, o) => PM.def('items', id, name, Object.assign({ forms: ['items', 'steps', 'bullets'] }, o));
const isItems = sp => (sp.form === 'items' || sp.form === 'steps' || sp.form === 'bullets' || sp.form === 'timeline') && sp.n >= 2 && sp.n <= 8;
const fitN = (sp, a, b) => sp.n >= a && sp.n <= b;
function its(sp) {
  return sp.items.map(it => (!it.title && it.text && PM.words(it.text) <= 9 && !(it.bullets || []).length) ? Object.assign({}, it, { title: it.text, text: '', _t2t: true }) : it);
}
const bindOf = (it, i) => 'main.items.' + i + '.';
const ips = (c, it, i, o = {}) => PM.itemPs(c, it._t2t ? { title: it.title, bullets: it.bullets } : it, Object.assign({ bind: bindOf(it, i) }, o, it._t2t ? { tBind: 'text' } : {})).map(p => { if (it._t2t && p.bind && p.bind.endsWith('title')) p.bind = p.bind.replace(/title$/, 'text'); return p; });
/* header + optional lead + optional block label; returns content top */
function area(c, sp, objs, o = {}) {
  let y = PM.head(c, sp, objs, o.head || {});
  if (sp.lead && o.lead !== false) {
    const lb = PM.textAt(o.lx || G.X0, y + 12, o.lw || Math.min(G.CW, 680), 72, [tx.body(c, sp.lead, { size: c.Z.body * 1.08, color: c.tone.body, bind: 'lead', lh: 1.5 })], { name: 'Lead' });
    if (lb) { objs.push(lb); y = lb.y + lb.h; }
  }
  if (sp.head && o.blockHead !== false) {
    const hb = PM.textAt(G.X0, y + 16, G.CW, 22, [tx.cap(c, sp.head, { color: c.tone.accent, bind: 'main.head' })], { name: 'Label' });
    if (hb) { objs.push(hb); y = hb.y + hb.h; }
  }
  return y;
}
PM.itemsArea = area;
PM.its = its;
PM.ips = ips;
/* place a block of height h inside [top, bottom]: a little above centre, never above top */
const place = PM.place = (top, bottom, h, bias = 0.42) => top + Math.max(0, (bottom - top - h) * bias);

/* ---------- 1 · columns (icon / number / rule on top) ---------- */
function columns(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 34;
    const items = its(sp), n = items.length;
    const gx = n >= 5 ? 24 : n === 4 ? 32 : 44;
    const cw = (G.CW - gx * (n - 1)) / n;
    const lead = { icon: 50, num: 52, rule: 22, 'rule-num': 46, divided: 0, plain: 0 }[style];
    const avail = G.BOT - top - lead;
    const pss = items.map((it, i) => ips(c, it, i, { k: n >= 5 ? 0.92 : 1 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: avail, ps })), n >= 5 ? 1.12 : 1.3);
    const hs = pss.map(ps => PM.hK(ps, cw, k));
    const blockH = lead + Math.max(...hs);
    const y0 = place(top, G.BOT, blockH);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      let y = y0;
      if (style === 'icon') { o.push(Ic(x, y, 32, PM.iconOf(c, it, i), c.tone.icon, { bind: bindOf(it, i) + 'icon', slot: 'icon' })); y += lead; }
      if (style === 'num') { o.push(T(x, y - 4, cw, 44, [tx.num(c, PM.pad2(i + 1), { size: c.Z.num * 1.1, color: K.SKY })], { name: 'Number' })); y += lead; }
      if (style === 'rule') { o.push(Ln(x, y, cw, 0, c.tone.accent, { sw: 2 })); y += lead; }
      if (style === 'rule-num') { o.push(Ln(x, y, cw, 0, c.tone.rule, { sw: 1 })); o.push(R(x, y - 1.5, 36, 3, K.SKY)); o.push(T(x, y + 14, cw, 22, [tx.num(c, PM.pad2(i + 1), { size: 13, color: c.tone.accent })], { name: 'Number' })); y += lead; }
      const tb = PM.tk(x, y, cw, pss[i], k, { name: 'Item ' + (i + 1) });
      if (tb) o.push(tb);
      if (style === 'divided' && i > 0) o.push(Ln(x - gx / 2, y0 - 4, 0, blockH + 8, c.tone.rule));
    });
    return o;
  };
}
const colAccept = (lo, hi, pref) => sp => isItems(sp) && fitN(sp, lo, hi) && sp.maxItemWords <= (sp.n >= 5 ? 30 : 48) && !sp.hasBullets ? pref - Math.abs(sp.n - 3.5) * 0.02 : 0;
def('items-cols-icon', 'أعمدة بأيقونات', { accepts: colAccept(2, 5, 0.86), render: columns('icon'), tags: ['أيقونات', 'أعمدة'] });
def('items-cols-num', 'أعمدة مرقّمة', { accepts: colAccept(2, 5, 0.8), render: columns('num'), tags: ['أرقام', 'أعمدة'] });
def('items-cols-rule', 'أعمدة بخط علوي', { accepts: colAccept(2, 5, 0.78), render: columns('rule'), tags: ['خطوط', 'أعمدة'] });
def('items-cols-rulenum', 'أعمدة بخط ورقم', { accepts: colAccept(3, 5, 0.8), render: columns('rule-num'), tags: ['أرقام', 'خطوط'] });
def('items-cols-divided', 'أعمدة بفواصل', { accepts: colAccept(3, 5, 0.74), render: columns('divided'), tags: ['فواصل'] });
def('items-cols-plain', 'أعمدة نظيفة', { accepts: colAccept(2, 4, 0.7), render: columns('plain'), tags: ['بسيط'] });

/* ---------- 2 · cards (rounded, tinted, no shadows) ---------- */
function cards(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 28;
    const items = its(sp), n = items.length;
    const cols = style === 'grid' ? 2 : n <= 4 ? n : n <= 6 ? 3 : 4;
    const rows = Math.ceil(n / cols);
    const gx = 18, gy = 18;
    const cw = (G.CW - gx * (cols - 1)) / cols;
    const pad = cw < 180 ? 18 : 24;
    const iconH = style === 'grid' ? 0 : 42;
    const maxCH = (G.BOT - top - gy * (rows - 1)) / rows;
    const tw = style === 'grid' ? cw - pad * 2 - 44 : cw - pad * 2;
    const pss = items.map((it, i) => ips(c, it, i, { k: n >= 6 ? 0.88 : 0.96 }));
    const k = PM.groupK(pss.map(ps => ({ w: tw, h: maxCH - pad * 2 - iconH, ps })), 1.22);
    const contentH = Math.max(...pss.map(ps => PM.hK(ps, tw, k))) + iconH + pad * 2;
    const ch = Math.min(maxCH, Math.max(contentH + 10, maxCH * (rows > 1 ? 0.8 : 0.62)));
    const totalH = rows * ch + (rows - 1) * gy;
    const y0 = place(top, G.BOT, totalH, 0.45);
    const t = c.tone;
    const pal = c.dark ? ['0F3B78'] : [K.BLUE, K.NAVY, '1F6AC6', '0B3A75'];
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), inRow = r === rows - 1 ? n - r * cols : cols;
      const off = (cols - inRow) * (cw + gx) / 2;
      const x = G.X0 + off + (i % cols) * (cw + gx), y = y0 + r * (ch + gy);
      let fill, fg, body, ic, stroke = null;
      if (style === 'tint' || style === 'grid') { fill = t.cardFill; fg = t.title; body = t.body; ic = t.icon; }
      else if (style === 'navy') { const hi = i === 0; fill = hi ? (c.dark ? K.SKY : K.NAVY) : t.cardFill; fg = hi ? (c.dark ? K.NAVY : K.WHITE) : t.title; body = hi ? (c.dark ? '0B2E5C' : 'D5E1F0') : t.body; ic = hi ? (c.dark ? K.NAVY : K.SKY) : t.icon; }
      else if (style === 'color') { fill = pal[i % pal.length]; fg = K.WHITE; body = c.dark ? K.BODY_D : 'DCE7F5'; ic = K.SKY; }
      else { fill = null; stroke = c.dark ? '2E558E' : 'D3DCE8'; fg = t.title; body = t.body; ic = t.icon; }
      o.push(R(x, y, cw, ch, fill, { r: 14, stroke, sw: 1, name: 'Card ' + (i + 1) }));
      if (style === 'grid') {
        o.push(Ic(x + pad, y + pad, 28, PM.iconOf(c, it, i), ic, { bind: bindOf(it, i) + 'icon', slot: 'icon' }));
        const tb = PM.tk(x + pad + 44, y + pad, tw, pss[i], k, { name: 'Card text ' + (i + 1), h: ch - pad * 2, va: 'm' });
        if (tb) { tb.paras.forEach(p => { if (p.bold) p.color = fg; else p.color = body; }); o.push(tb); }
      } else {
        o.push(Ic(x + pad, y + pad, 28, PM.iconOf(c, it, i), ic, { bind: bindOf(it, i) + 'icon', slot: 'icon' }));
        const tb = PM.tk(x + pad, y + pad + iconH, tw, pss[i], k, { name: 'Card text ' + (i + 1) });
        if (tb) { tb.paras.forEach(p => { if (p.bold) p.color = fg; else p.color = body; }); o.push(tb); }
      }
    });
    return o;
  };
}
const cardAccept = (lo, hi, pref) => sp => isItems(sp) && fitN(sp, lo, hi) && sp.maxItemWords <= 44 ? pref : 0;
def('items-cards-tint', 'بطاقات ناعمة', { accepts: cardAccept(2, 8, 0.8), render: cards('tint'), tags: ['بطاقات'] });
def('items-cards-navy', 'بطاقات مع بطاقة مميزة', { accepts: cardAccept(3, 6, 0.76), render: cards('navy'), tags: ['بطاقات', 'تمييز'] });
def('items-cards-color', 'بطاقات ملوّنة', { accepts: cardAccept(2, 6, 0.74), render: cards('color'), tags: ['بطاقات', 'ألوان'] });
def('items-cards-outline', 'بطاقات بإطار', { accepts: cardAccept(2, 8, 0.72), render: cards('outline'), tags: ['بطاقات', 'إطار'] });
def('items-cards-grid', 'شبكة بطاقات أفقية', { accepts: sp => isItems(sp) && (sp.n === 4 || sp.n === 6) && sp.maxItemWords <= 40 ? 0.8 : 0, render: cards('grid'), tags: ['شبكة'] });

/* ---------- 3 · rows: title column + text column, hairlines ---------- */
function rows(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const items = its(sp), n = items.length;
    const pre = style === 'num' ? 58 : style === 'icon' ? 42 : 0;
    const tW = 250, gap = 28;
    const textX = G.X0 + tW + gap, textW = G.X1 - textX;
    const rowAvail = (G.BOT - top) / n - 24;
    const tps = items.map((it, i) => it.title ? [tx.h(c, it.title, { bind: bindOf(it, i) + 'title', sa: 0 })] : []);
    const bps = items.map((it, i) => ips(c, Object.assign({}, it, { title: '' }), i));
    const k = Math.min(PM.groupK(tps.map(ps => ({ w: tW - pre, h: rowAvail, ps })), 1.18), PM.groupK(bps.map(ps => ({ w: textW, h: rowAvail, ps })), 1.18));
    const hs = items.map((_, i) => Math.max(PM.hK(tps[i], tW - pre, k), PM.hK(bps[i], textW, k), 22));
    const total = hs.reduce((a, b) => a + b + 26, 0);
    let y = place(top, G.BOT, total, 0.4);
    items.forEach((it, i) => {
      o.push(Ln(G.X0, y, G.CW, 0, i === 0 ? c.tone.accent : c.tone.rule, { sw: i === 0 ? 1.5 : 0.75 }));
      const yy = y + 13;
      let x = G.X0;
      if (style === 'num') { o.push(T(x, yy - 1, 50, 26, [tx.num(c, PM.pad2(i + 1), { size: 15, color: c.tone.accent })], { name: 'Number' })); x += pre; }
      if (style === 'icon') { o.push(Ic(x, yy, 22, PM.iconOf(c, it, i), c.tone.icon, { bind: bindOf(it, i) + 'icon', slot: 'icon' })); x += pre; }
      const tb = PM.tk(x, yy, tW - (x - G.X0), tps[i], k, { name: 'Row title' }); if (tb) o.push(tb);
      const bb = PM.tk(textX, yy + 1, textW, bps[i], k, { name: 'Row text' }); if (bb) o.push(bb);
      y += hs[i] + 26;
    });
    return o;
  };
}
const rowAccept = pref => sp => isItems(sp) && fitN(sp, 2, 6) && sp.allTitled && sp.items.some(i => i.text || (i.bullets || []).length) ? pref + (sp.maxItemWords > 30 ? 0.08 : 0) : 0;
def('items-rows', 'صفوف بعناوين', { accepts: rowAccept(0.78), render: rows('plain'), tags: ['صفوف', 'جدولي'] });
def('items-rows-num', 'صفوف مرقّمة', { accepts: rowAccept(0.76), render: rows('num'), tags: ['صفوف', 'أرقام'] });
def('items-rows-icon', 'صفوف بأيقونات', { accepts: rowAccept(0.75), render: rows('icon'), tags: ['صفوف', 'أيقونات'] });

/* ---------- 4 · split: big title panel + items ---------- */
function split(style) {
  return (sp, c) => {
    const o = [];
    const panelW = 340;
    const t = c.tone;
    const panel = style === 'panel';
    PM.chrome(c, o, { noBar: panel, noLogo: panel });
    if (panel) { o.push(R(0, 0, panelW, H, c.dark ? K.DEEP : K.NAVY, { role: 'bg', lock: true, name: 'Panel' })); o.push(PM.Logo(19, 13, 58, K.WHITE)); }
    else o.push(Ln(panelW, 96, 0, 350, t.rule));
    const hw = panelW - G.X0 - 36;
    const hcol = panel ? { color: K.WHITE, eb: K.SKY, sub: 'C9D6E8' } : {};
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: hcol.eb }));
    if (sp.title) ps.push(tx.title(c, sp.title, { color: hcol.color, bind: 'title' }));
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { color: hcol.sub, bind: 'sub' }));
    if (sp.lead) ps.push(tx.body(c, sp.lead, { color: hcol.sub || t.body, bind: 'lead', sb: 16, size: c.Z.body * 1.05 }));
    o.push(T(G.X0, 96, hw, 350, ps, { va: 'm', name: 'Title', minK: 0.66 }));
    const items = its(sp), n = items.length;
    const x0 = panelW + 46, w = G.X1 - x0;
    const pre = 54;
    const rowAvail = (G.BOT - 64) / n - 22;
    const pss = items.map((it, i) => ips(c, it, i, { k: n >= 5 ? 0.92 : 1 }));
    const k = PM.groupK(pss.map(ps => ({ w: w - pre, h: rowAvail, ps })), 1.2);
    const hs = pss.map(ps => Math.max(PM.hK(ps, w - pre, k), 26));
    const total = hs.reduce((a, b) => a + b + 30, -30);
    let y = place(64, G.BOT, total, 0.5);
    items.forEach((it, i) => {
      if (i > 0) o.push(Ln(x0, y - 15, w, 0, t.rule));
      if (style === 'num' || panel) o.push(T(x0, y - 2, 46, 30, [tx.num(c, PM.pad2(i + 1), { size: 17, color: panel ? t.accent : K.SKY })], { name: 'Number' }));
      else o.push(Ic(x0, y, 24, PM.iconOf(c, it, i), t.icon, { bind: bindOf(it, i) + 'icon', slot: 'icon' }));
      const tb = PM.tk(x0 + pre, y, w - pre, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
      y += hs[i] + 30;
    });
    return o;
  };
}
const splitAccept = pref => sp => isItems(sp) && fitN(sp, 2, 6) && sp.maxItemWords <= 36 && PM.len(sp.title) < 90 ? pref : 0;
def('items-split-icon', 'عنوان جانبي + بنود بأيقونات', { accepts: splitAccept(0.79), render: split('icon'), tags: ['جانبي'] });
def('items-split-num', 'عنوان جانبي + بنود مرقّمة', { accepts: splitAccept(0.77), render: split('num'), tags: ['جانبي', 'أرقام'] });
def('items-split-panel', 'لوحة كحلية + بنود', { accepts: splitAccept(0.78), render: split('panel'), tags: ['جانبي', 'كحلي'], tones: ['light'] });

/* ---------- 5 · photo half (edge to edge) + items ---------- */
function photoSide(style) {
  return (sp, c) => {
    const o = [];
    const t = c.tone;
    const pw = style === 'wide' ? 440 : 380;
    PM.chrome(c, o);
    PM.photoBlock(c, sp, o, W - pw, 0, pw, H, {});
    const x0 = G.X0, w = W - pw - G.X0 - 46;
    const top = PM.head(c, sp, o, { w }) + 22;
    let y1 = top;
    if (sp.lead) { const lb = PM.textAt(x0, top - 6, w, 64, [tx.body(c, sp.lead, { bind: 'lead' })], { name: 'Lead' }); if (lb) { o.push(lb); y1 = lb.y + lb.h + 12; } }
    const items = its(sp), n = items.length;
    const pre = style === 'num' ? 46 : 38;
    const rowAvail = (G.BOT - y1) / n - 18;
    const pss = items.map((it, i) => ips(c, it, i, { k: n >= 5 ? 0.9 : 0.96 }));
    const k = PM.groupK(pss.map(ps => ({ w: w - pre, h: rowAvail, ps })), 1.18);
    const hs = pss.map(ps => Math.max(PM.hK(ps, w - pre, k), 22));
    const total = hs.reduce((a, b) => a + b + 22, -22);
    let y = place(y1, G.BOT, total, 0.35);
    items.forEach((it, i) => {
      if (style === 'num') o.push(T(x0, y, 40, 26, [tx.num(c, PM.pad2(i + 1), { size: 15, color: K.SKY })], { name: 'Number' }));
      else o.push(Ic(x0, y + 1, 22, PM.iconOf(c, it, i), t.icon, { bind: bindOf(it, i) + 'icon', slot: 'icon' }));
      const tb = PM.tk(x0 + pre, y, w - pre, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
      y += hs[i] + 22;
    });
    return o;
  };
}
const phAccept = pref => sp => isItems(sp) && fitN(sp, 2, 5) && sp.maxItemWords <= 30 ? pref + (sp.imgs.length ? 0.12 : 0) : 0;
def('items-photo-icon', 'صورة جانبية + بنود', { accepts: phAccept(0.76), render: photoSide('icon'), tags: ['صورة'] });
def('items-photo-num', 'صورة جانبية + بنود مرقّمة', { accepts: phAccept(0.74), render: photoSide('num'), tags: ['صورة', 'أرقام'] });
def('items-photo-wide', 'صورة عريضة + بنود', { accepts: sp => phAccept(0.72)(sp) && sp.maxItemWords <= 22 ? 0.72 : 0, render: photoSide('wide'), tags: ['صورة'] });

/* ---------- 6 · photo band on top + items row ---------- */
function photoTop(style) {
  return (sp, c) => {
    const o = [];
    const bandH = 224;
    PM.chrome(c, o, { noLogo: true, noBar: true });
    PM.photoBlock(c, sp, o, 0, 0, W, bandH, { veil: 'up', a0: 0, a1: 88 });
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { color: K.SKY, bind: 'eyebrow' }));
    if (sp.title) ps.push(tx.title(c, sp.title, { color: K.WHITE, bind: 'title' }));
    o.push(T(G.X0, bandH - 118, G.CW, 96, ps, { va: 'b', name: 'Title' }));
    const items = its(sp), n = items.length;
    const top = bandH + 30, gx = 32;
    const cw = (G.CW - gx * (n - 1)) / n;
    const lead = style === 'icon' ? 38 : 18;
    const pss = items.map((it, i) => ips(c, it, i, { k: n >= 4 ? 0.9 : 0.96 }));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - lead, ps })), 1.15);
    const blockH = lead + Math.max(...pss.map(ps => PM.hK(ps, cw, k)));
    const y0 = place(top, G.BOT, blockH, 0.4);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      if (style === 'icon') o.push(Ic(x, y0, 24, PM.iconOf(c, it, i), c.tone.icon, { bind: bindOf(it, i) + 'icon', slot: 'icon' }));
      else o.push(R(x, y0, 30, 3, K.SKY));
      const tb = PM.tk(x, y0 + lead, cw, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  };
}
const ptAccept = pref => sp => isItems(sp) && fitN(sp, 2, 4) && sp.maxItemWords <= 26 && !sp.lead && !sp.sub ? pref + (sp.imgs.length ? 0.12 : 0) : 0;
def('items-phototop-icon', 'شريط صورة + أعمدة', { accepts: ptAccept(0.74), render: photoTop('icon'), tags: ['صورة', 'أعمدة'] });
def('items-phototop-rule', 'شريط صورة + أعمدة بخط', { accepts: ptAccept(0.72), render: photoTop('rule'), tags: ['صورة'] });

/* ---------- 7 · icon grid / tiles (short labels) ---------- */
function iconGrid(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const items = its(sp), n = items.length;
    const cols = n <= 4 ? n : n <= 6 ? 3 : 4, rows = Math.ceil(n / cols);
    const gx = 20, gy = 20;
    const cw = (G.CW - gx * (cols - 1)) / cols;
    const maxCH = (G.BOT - top - gy * (rows - 1)) / rows;
    const s = 38;
    const pss = items.map((it, i) => [tx.h(c, it.title || it.text, { k: 0.95, bind: bindOf(it, i) + (it.title && !it._t2t ? 'title' : 'text'), sa: it.text && it.title && !it._t2t ? 4 : 0 }), it.title && it.text && !it._t2t ? tx.body(c, it.text, { k: 0.88, bind: bindOf(it, i) + 'text' }) : null].filter(Boolean));
    const k = PM.groupK(pss.map(ps => ({ w: cw - 28, h: maxCH - s - 54, ps })), 1.2);
    const contentH = s + 16 + Math.max(...pss.map(ps => PM.hK(ps, cw - 28, k)));
    const ch = style === 'tile' ? Math.min(maxCH, Math.max(contentH + 48, maxCH * 0.7)) : contentH;
    const total = rows * ch + (rows - 1) * gy;
    const y0 = place(top, G.BOT, total, 0.45);
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), inRow = r === rows - 1 ? n - r * cols : cols;
      const off = (cols - inRow) * (cw + gx) / 2;
      const x = G.X0 + off + (i % cols) * (cw + gx), y = y0 + r * (ch + gy);
      if (style === 'tile') o.push(R(x, y, cw, ch, c.tone.cardFill, { r: 14, name: 'Tile' }));
      const cy = y + (ch - contentH) / 2;
      o.push(Ic(x + (cw - s) / 2, cy, s, PM.iconOf(c, it, i), c.tone.icon, { bind: bindOf(it, i) + 'icon', slot: 'icon', sw: 1.4 }));
      const tb = PM.tk(x + 14, cy + s + 16, cw - 28, pss[i], k, { align: 'center', name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  };
}
const igAccept = pref => sp => isItems(sp) && fitN(sp, 3, 8) && sp.maxItemWords <= 16 && !sp.hasBullets ? pref + (sp.maxItemWords <= 8 ? 0.08 : 0) : 0;
def('items-icongrid', 'شبكة أيقونات', { accepts: igAccept(0.76), render: iconGrid('open'), tags: ['أيقونات', 'شبكة'] });
def('items-icontiles', 'مربعات أيقونات', { accepts: igAccept(0.75), render: iconGrid('tile'), tags: ['أيقونات', 'مربعات'] });

/* ---------- 8 · hub: centre circle with items around it ---------- */
PM.def('items', 'items-hub', 'محور ودائرة', {
  forms: ['items'], tags: ['محور', 'دائرة'],
  accepts: sp => isItems(sp) && (sp.n === 4 || sp.n === 6) && sp.maxItemWords <= 18 && !sp.hasBullets ? 0.72 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, { align: 'center' }) + 16;
    const items = its(sp), n = items.length, per = n / 2;
    const colW = 262;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.95 }));
    const rh = (G.BOT - top) / per;
    const k = PM.groupK(pss.map(ps => ({ w: colW, h: rh - 18, ps })), 1.15);
    const cx = W / 2, cy = (top + G.BOT) / 2, r = Math.min(72, (G.BOT - top) / 2 - 22);
    o.push(E(cx - r - 18, cy - r - 18, (r + 18) * 2, (r + 18) * 2, null, { stroke: c.tone.rule, sw: 1 }));
    o.push(E(cx - r, cy - r, r * 2, r * 2, c.dark ? K.SKY : K.NAVY, { name: 'Hub' }));
    o.push(Ic(cx - 24, cy - 24, 48, PM.iconOf(c, { title: sp.title }, 0), c.dark ? K.NAVY : K.WHITE, { sw: 1.3, slot: 'icon' }));
    items.forEach((it, i) => {
      const left = i < per, kk = left ? i : i - per;
      const ymid = top + kk * rh + rh / 2;
      const x = left ? G.X0 : G.X1 - colW;
      const h = PM.hK(pss[i], colW, k);
      const tb = PM.tk(x, ymid - h / 2, colW, pss[i], k, { align: left ? 'end' : 'start', name: 'Item ' + (i + 1) });
      tb.paras.forEach(p => p.al = left ? 'r' : 'l');
      o.push(tb);
      const lx = left ? x + colW + 16 : cx + r + 26;
      const lx2 = left ? cx - r - 26 : x - 16;
      o.push(Ln(lx, ymid, Math.max(4, lx2 - lx), 0, c.tone.rule, { dash: true }));
      o.push(E((left ? lx2 : lx) - 3.5, ymid - 3.5, 7, 7, K.SKY));
    });
    return o;
  }
});

/* ---------- 9 · feature: one highlighted item + the rest ---------- */
PM.def('items', 'items-feature', 'بند رئيسي + بنود', {
  forms: ['items'], tags: ['مميز'],
  accepts: sp => isItems(sp) && fitN(sp, 3, 5) && sp.allTitled && sp.maxItemWords <= 40 ? 0.72 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 28;
    const items = its(sp);
    const fw = 350, t = c.tone;
    const hiFill = c.dark ? K.SKY : K.NAVY, hiFg = c.dark ? K.NAVY : K.WHITE, hiBody = c.dark ? '0B2E5C' : 'D5E1F0';
    o.push(R(G.X0, top, fw, G.BOT - top, hiFill, { r: 16, name: 'Feature' }));
    const f = items[0];
    o.push(Ic(G.X0 + 30, top + 30, 34, PM.iconOf(c, f, 0), c.dark ? K.NAVY : K.SKY, { bind: bindOf(f, 0) + 'icon', slot: 'icon' }));
    const fps = ips(c, f, 0, { k: 1.1 }).map(p => Object.assign(p, { color: p.bold ? hiFg : hiBody }));
    o.push(T(G.X0 + 30, top + 84, fw - 60, G.BOT - top - 112, fps, { va: 'b', name: 'Feature text', maxK: 1.2 }));
    const rest = items.slice(1);
    const x0 = G.X0 + fw + 36, w = G.X1 - x0;
    const pss = rest.map((it, j) => ips(c, it, j + 1, { k: 0.95 }));
    const rh = (G.BOT - top) / rest.length;
    const k = PM.groupK(pss.map(ps => ({ w: w - 38, h: rh - 24, ps })), 1.15);
    rest.forEach((it, j) => {
      const y = top + j * rh;
      if (j > 0) o.push(Ln(x0, y, w, 0, t.rule));
      const h = PM.hK(pss[j], w - 38, k), yy = y + (rh - h) / 2;
      o.push(Ic(x0, yy + 1, 22, PM.iconOf(c, it, j + 1), t.icon, { bind: bindOf(it, j + 1) + 'icon', slot: 'icon' }));
      const tb = PM.tk(x0 + 38, yy, w - 38, pss[j], k, { name: 'Item ' + (j + 2) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* ---------- 10 · band: items on a full-width colour band ---------- */
PM.def('items', 'items-band', 'شريط عرضي', {
  forms: ['items'], tags: ['شريط'],
  accepts: sp => isItems(sp) && fitN(sp, 3, 5) && sp.maxItemWords <= 24 && !sp.hasBullets ? 0.7 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const bandY = Math.max(top, 236), bandH = H - bandY;
    o.push(R(0, bandY, W, bandH, c.dark ? K.DEEP : K.NAVY, { role: 'bg', name: 'Band' }));
    const items = its(sp), n = items.length, gx = 34;
    const cw = (G.CW - gx * (n - 1)) / n;
    const pss = items.map((it, i) => ips(c, it, i, { k: 0.92 }).map(p => Object.assign(p, { color: p.bold ? K.WHITE : 'C9D6E8' })));
    const k = PM.groupK(pss.map(ps => ({ w: cw, h: bandH - 120, ps })), 1.15);
    const blockH = 42 + Math.max(...pss.map(ps => PM.hK(ps, cw, k)));
    const y0 = place(bandY + 30, H - 46, blockH, 0.45);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(Ic(x, y0, 26, PM.iconOf(c, it, i), K.SKY, { bind: bindOf(it, i) + 'icon', slot: 'icon' }));
      const tb = PM.tk(x, y0 + 42, cw, pss[i], k, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
      if (i > 0) o.push(Ln(x - gx / 2, y0, 0, blockH, '2E558E'));
    });
    o.forEach(ob => { if (ob.pageNum) ob.paras[0].color = '8FA5C4'; });
    return o;
  }
});
})(window.PM);
