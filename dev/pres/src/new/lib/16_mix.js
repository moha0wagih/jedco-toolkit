/* ==========================================================================
   Layout family · mixed content (2–4 different blocks on one slide)
   PM.blockBox renders any block compactly inside a box, so no content is ever
   dropped; the mix layouts arrange the boxes.
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Ic, G, tx } = PM;

/* index of each block in the spec, for edit binding */
function idxOf(sp, b) { return sp.blocks.indexOf(b); }
/* paragraphs for a block (used to measure and to draw text-like blocks) */
function blockPs(c, sp, b, o = {}) {
  const B = 'blocks.' + idxOf(sp, b) + '.';
  const k = o.k || 1;
  const ps = [];
  if (b.head && o.withHead) { ps.push(tx.cap(c, b.head, { bind: B + 'head', color: c.tone.accent, size: c.Z.cap * 1.1 })); ps[ps.length - 1].sa = 8; }
  switch (b.k) {
    case 'para': ps.push(tx.body(c, b.text, { k: k * 1.06, bind: B + 'text', lh: 1.55 })); break;
    case 'quote': ps.push(tx.h(c, '“' + b.text + '”', { k: k * 1.1, bind: B + 'text', lh: 1.45, color: c.tone.title })); if (b.by) ps.push(tx.body(c, '— ' + b.by, { bind: B + 'by', color: c.tone.accent, sb: 6 })); break;
    case 'bullets': b.items.forEach((t, i) => ps.push(tx.body(c, t, { k, bind: B + 'items.' + i, bullet: 'dot', sa: 7 }))); break;
    case 'items': case 'steps': case 'timeline':
      b.items.forEach((it, i) => {
        const pre = b.k === 'steps' ? (i + 1) + '. ' : '';
        const head = [b.k === 'timeline' && it.date ? it.date + ' · ' : '', it.value ? it.value + ' ' : '', it.title || ''].join('');
        if (head.trim()) ps.push(tx.h(c, pre + head, { k: k * 0.92, bind: B + 'items.' + i + '.title', sa: it.text || (it.bullets || []).length ? 2 : 9, sb: i ? 4 : 0 }));
        if (it.text) ps.push(tx.body(c, it.text, { k: k * 0.95, bind: B + 'items.' + i + '.text', sa: 9 }));
        (it.bullets || []).forEach((t, j) => ps.push(tx.body(c, t, { k: k * 0.92, bind: B + 'items.' + i + '.bullets.' + j, bullet: 'dot', sa: 4 })));
      });
      break;
    case 'compare':
      [['a', b.a], ['b', b.b]].forEach(([key, s]) => { ps.push(tx.h(c, s.title, { k, bind: B + key + '.title', sa: 4, sb: key === 'b' ? 10 : 0 })); s.items.forEach((t, i) => ps.push(tx.body(c, t, { k: k * 0.95, bind: B + key + '.items.' + i, bullet: 'dot', sa: 4 }))); });
      break;
  }
  return ps;
}
PM.blockPs = blockPs;
/* draw a block in a box; returns used height */
PM.blockBox = function (c, sp, b, o, x, y, w, h, opt = {}) {
  const B = 'blocks.' + idxOf(sp, b) + '.';
  let yy = y;
  if (b.head) {
    const hb = PM.textAt(x, y, w, 20, [tx.cap(c, b.head, { bind: B + 'head', color: c.tone.accent })], { name: 'Label' });
    if (hb) { o.push(hb); yy += hb.h + 8; }
  }
  const hh = y + h - yy;
  if (b.k === 'kpis' || (b.k === 'items' && b.items.every(i => i.value) && b.items.length <= 4)) {
    const ks = b.items, n = ks.length;
    const horiz = w / n > 150;
    if (horiz) {
      const gx = 22, cw = (w - gx * (n - 1)) / n;
      const pss = ks.map((kv, i) => [tx.num(c, kv.value, { size: c.Z.kpiS, bind: B + 'items.' + i + '.value', sa: 4 }), tx.label(c, kv.label || kv.title || '', { bind: B + 'items.' + i + (b.k === 'kpis' ? '.label' : '.title') })]);
      const kk = PM.groupK(pss.map(ps => ({ w: cw, h: hh, ps })), 1.15);
      const bh = Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
      ks.forEach((kv, i) => { const tb = PM.tk(x + i * (cw + gx), yy, cw, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb); if (i) o.push(Ln(x + i * (cw + gx) - gx / 2, yy, 0, bh, c.tone.rule)); });
      return yy - y + bh;
    }
    const rh = hh / n;
    const pss = ks.map((kv, i) => [tx.num(c, kv.value, { size: c.Z.kpiS * 0.85, bind: B + 'items.' + i + '.value', sa: 2 }), tx.label(c, kv.label || kv.title || '', { bind: B + 'items.' + i + (b.k === 'kpis' ? '.label' : '.title') })]);
    const kk = PM.groupK(pss.map(ps => ({ w, h: rh - 10, ps })), 1.1);
    let cy = yy;
    ks.forEach((kv, i) => { const tb = PM.tk(x, cy, w, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) { o.push(tb); cy += tb.h + 12; } });
    return cy - y;
  }
  if (b.k === 'table') {
    const rh = Math.min(40, hh / b.rows.length), th = rh * b.rows.length;
    o.push(PM.Table(x, yy, w, th, b.rows, { fs: Math.max(8.5, Math.min(c.en ? 12 : 13.5, rh * 0.42)), dark: c.dark, bind: B + 'rows' }));
    return yy - y + th;
  }
  if (b.k === 'chart' || (b.chartable && opt.chart)) {
    const ch = b.chart || b.chartable;
    o.push(PM.Chart(x, yy, w, hh, ch, { dark: c.dark, rtl: c.rtl, fs: c.en ? 10 : 11, bind: B + (b.chart ? 'chart' : 'chartable') }));
    return h;
  }
  if ((b.k === 'items' || b.k === 'steps') && b.items.length <= 4 && w > 520 && b.items.every(i => PM.words([i.title, i.text].join(' ')) <= 26 && !(i.bullets || []).length)) {
    // a short set of items reads better side by side
    const n = b.items.length, gx = 26, cw = (w - gx * (n - 1)) / n;
    const pss = b.items.map((it, i) => { const ps = []; if (it.value) ps.push(tx.num(c, it.value, { size: c.Z.kpiS * 0.8, bind: B + 'items.' + i + '.value', sa: 4 })); if (it.title) ps.push(tx.h(c, (b.k === 'steps' ? (i + 1) + '. ' : '') + it.title, { bind: B + 'items.' + i + '.title', sa: it.text ? 4 : 0 })); if (it.text) ps.push(tx.body(c, it.text, { bind: B + 'items.' + i + '.text' })); return ps; });
    const lead = opt.icons === false ? 0 : 38;
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: hh - lead, ps })), 1.15);
    const bh = lead + Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    b.items.forEach((it, i) => {
      const xx = x + i * (cw + gx);
      if (lead) o.push(Ic(xx, yy, 26, PM.iconOf(c, it, i), c.tone.icon, { bind: B + 'items.' + i + '.icon', slot: 'icon' }));
      const tb = PM.tk(xx, yy + lead, cw, pss[i], kk, { name: 'Item ' + (i + 1) }); if (tb) o.push(tb);
    });
    return yy - y + bh;
  }
  const ps = blockPs(c, sp, b);
  const kk = PM.groupK([{ w, h: hh, ps }], opt.maxK || 1.15);
  const tb = PM.tk(x, yy, w, ps, kk, { name: 'Block' });
  if (tb) { o.push(tb); return yy - y + tb.h; }
  return 0;
};
/* all content blocks except the header ones, in reading order */
const contentBlocks = sp => sp.blocks.filter(b => !(b.k === 'para' && !PM.words(b.text)));
const mdef = (id, name, o) => PM.def('mix', id, name, Object.assign({ forms: ['mix'] }, o));
const isMix = sp => sp.kind === 'content' && contentBlocks(sp).length >= 2;
const weight = b => PM.blockWeight(b);

/* M1 · stacked: blocks one under the other */
mdef('mix-stack', 'كتل متتابعة', {
  tags: ['مختلط'],
  accepts: sp => isMix(sp) && contentBlocks(sp).length <= 4 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 24;
    const bs = contentBlocks(sp);
    const tot = bs.reduce((a, b) => a + Math.max(0.2, weight(b)), 0);
    let y = top;
    const avail = G.BOT - top - 22 * (bs.length - 1);
    bs.forEach((b, i) => {
      const h = avail * Math.max(0.2, weight(b)) / tot;
      if (i > 0) { o.push(Ln(G.X0, y - 11, G.CW, 0, c.tone.rule)); }
      const used = PM.blockBox(c, sp, b, o, G.X0, y, G.CW, h);
      y += Math.min(h, Math.max(used, 20)) + 22;
    });
    return o;
  }
});
/* M2 · two columns: the lighter blocks on one side, the main block on the other */
function cols(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 28;
    const bs = contentBlocks(sp);
    const main = bs.slice().sort((a, b) => weight(b) - weight(a))[0];
    const side = bs.filter(b => b !== main);
    const lw = style === 'wide' ? 360 : (G.CW - 50) / 2, gx = 50;
    const rw = G.CW - lw - gx;
    const lx = G.X0, rx = G.X0 + lw + gx;
    if (style === 'panel') o.push(R(lx - 4, top - 4, lw + 8, G.BOT - top + 8, c.tone.cardFill, { r: 16 }));
    const pad = style === 'panel' ? 22 : 0;
    let y = top + pad;
    const avail = G.BOT - top - pad * 2 - 20 * (side.length - 1);
    const tw = side.reduce((a, b) => a + Math.max(0.25, weight(b)), 0);
    side.forEach(b => { const h = avail * Math.max(0.25, weight(b)) / tw; const used = PM.blockBox(c, sp, b, o, lx + pad, y, lw - pad * 2, h, { icons: false }); y += Math.min(h, used) + 20; });
    if (style !== 'panel') o.push(Ln(lx + lw + gx / 2, top, 0, G.BOT - top, c.tone.rule));
    PM.blockBox(c, sp, main, o, rx, top, rw, G.BOT - top, { chart: true });
    return o;
  };
}
mdef('mix-cols', 'عمودان: شرح + محتوى', { accepts: sp => isMix(sp) && contentBlocks(sp).length <= 3 ? 0.82 : 0, render: cols('half'), tags: ['مختلط', 'عمودين'] });
mdef('mix-cols-wide', 'عمود جانبي + محتوى عريض', { accepts: sp => isMix(sp) && contentBlocks(sp).length <= 3 ? 0.8 : 0, render: cols('wide'), tags: ['مختلط'] });
mdef('mix-panel', 'لوحة شرح + محتوى', { accepts: sp => isMix(sp) && contentBlocks(sp).length <= 3 ? 0.79 : 0, render: cols('panel'), tags: ['مختلط', 'لوحة'] });
/* M3 · photo + blocks */
mdef('mix-photo', 'صورة + محتوى مختلط', {
  tags: ['مختلط', 'صورة'],
  accepts: sp => isMix(sp) && contentBlocks(sp).length <= 3 && contentBlocks(sp).reduce((a, b) => a + weight(b), 0) < 1.1 ? 0.76 + (sp.imgs.length ? 0.14 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const pw = 340;
    PM.photoBlock(c, sp, o, W - pw, 0, pw, H, {});
    const w = W - pw - G.X0 - 44;
    const top = PM.head(c, sp, o, { w }) + 24;
    const bs = contentBlocks(sp);
    const avail = G.BOT - top - 18 * (bs.length - 1);
    const tot = bs.reduce((a, b) => a + Math.max(0.25, weight(b)), 0);
    let y = top;
    bs.forEach(b => { const h = avail * Math.max(0.25, weight(b)) / tot; const used = PM.blockBox(c, sp, b, o, G.X0, y, w, h, { icons: false }); y += Math.min(h, used) + 18; });
    return o;
  }
});
/* M4 · a single structured block that no family took (always available) */
mdef('mix-any', 'تخطيط مرن', {
  tags: ['مرن'],
  accepts: sp => sp.kind === 'content' && contentBlocks(sp).length >= 1 ? 0.3 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 24;
    const bs = contentBlocks(sp);
    let y = top;
    const avail = G.BOT - top - 20 * (bs.length - 1);
    const tot = bs.reduce((a, b) => a + Math.max(0.2, weight(b)), 0) || 1;
    bs.forEach(b => { const h = avail * Math.max(0.2, weight(b)) / tot; const used = PM.blockBox(c, sp, b, o, G.X0, y, G.CW, h, { chart: true }); y += Math.min(h, used) + 20; });
    if (!bs.length && sp.imgs.length) PM.photoBlock(c, sp, o, G.X0, top, G.CW, G.BOT - top, { r: 14 });
    return o;
  }
});
/* M5 · title only (empty content slide) */
mdef('mix-title', 'عنوان فقط', {
  tags: ['عنوان'],
  accepts: sp => sp.kind === 'content' && !contentBlocks(sp).length ? 0.6 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    PM.head(c, sp, o, { y: 200, size: c.Z.title * 1.3 });
    return o;
  }
});
})(window.PM);
