/* ==========================================================================
   Layout family · numbers (KPIs 1–6). Every number is set in Sequel.
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Ic, G, tx } = PM;
const isK = sp => (sp.form === 'kpis' || (sp.form === 'items' && sp.valued)) && sp.n >= 1 && sp.n <= 6;
const def = (id, name, o) => PM.def('kpis', id, name, Object.assign({ forms: ['kpis'] }, o));
const bindOf = i => 'main.items.' + i + '.';
const kb = (sp, i) => sp.form === 'kpis' ? { v: bindOf(i) + 'value', l: bindOf(i) + 'label', t: bindOf(i) + 'text' } : { v: bindOf(i) + 'value', l: bindOf(i) + 'title', t: bindOf(i) + 'text' };
const kps = sp => sp.items.map(it => ({ value: it.value || '', label: it.title || '', text: it.text || '' }));
/* the number + its label as paragraphs */
function numPs(c, sp, k, i, o = {}) {
  const b = kb(sp, i);
  const ps = [tx.num(c, k.value || '—', { size: o.ns || c.Z.kpi, color: o.nc || c.tone.num, bind: b.v, sa: o.nsa == null ? 8 : o.nsa, al: o.al })];
  if (k.label) ps.push(tx.label(c, k.label, { size: o.ls || c.Z.label * 1.32, color: o.lc || c.tone.body, bind: b.l, al: o.al, bold: o.lbold }));
  if (k.text) ps.push(tx.body(c, k.text, { size: c.Z.body * 0.92, color: o.tc || c.tone.muted, bind: b.t, sb: 4, al: o.al }));
  return ps;
}
const area = (c, sp, o) => PM.itemsArea(c, sp, o, { blockHead: true });

/* ---------- 1 · a row of big numbers ---------- */
function row(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 40;
    const ks = kps(sp), n = ks.length;
    const gx = n >= 5 ? 22 : 40;
    const cw = (G.CW - gx * (n - 1)) / n;
    const nsz = n <= 2 ? c.Z.kpi * 1.35 : n === 3 ? c.Z.kpi * 1.15 : n === 4 ? c.Z.kpi : c.Z.kpi * 0.82;
    const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: nsz }));
    const lead = style === 'icon' ? 52 : style === 'rule' ? 22 : 0;
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - lead, ps })), 1.12);
    const blockH = lead + Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const y0 = PM.place(top, G.BOT, blockH, 0.5);
    ks.forEach((k, i) => {
      const x = G.X0 + i * (cw + gx);
      if (style === 'icon') o.push(Ic(x, y0, 34, PM.iconOf(c, { title: k.label }, i), c.tone.icon, { bind: bindOf(i) + 'icon', slot: 'icon' }));
      if (style === 'rule') { o.push(Ln(x, y0, cw, 0, c.tone.rule)); o.push(R(x, y0 - 1.5, 40, 3, K.SKY)); }
      const tb = PM.tk(x, y0 + lead, cw, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
      if (style === 'divided' && i > 0) o.push(Ln(x - gx / 2, y0, 0, blockH, c.tone.rule));
    });
    return o;
  };
}
const rowA = pref => sp => isK(sp) && sp.n >= 2 && sp.n <= 5 ? pref : 0;
def('kpi-row', 'أرقام كبيرة في صف', { accepts: rowA(0.86), render: row('plain'), tags: ['أرقام'] });
def('kpi-row-rule', 'أرقام بخط علوي', { accepts: rowA(0.82), render: row('rule'), tags: ['أرقام', 'خطوط'] });
def('kpi-row-divided', 'أرقام بفواصل', { accepts: rowA(0.83), render: row('divided'), tags: ['أرقام', 'فواصل'] });
def('kpi-row-icon', 'أرقام بأيقونات', { accepts: rowA(0.8), render: row('icon'), tags: ['أرقام', 'أيقونات'] });

/* ---------- 2 · tiles (tinted / navy) ---------- */
function tiles(style) {
  return (sp, c) => {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const ks = kps(sp), n = ks.length;
    const cols = style === 'grid' ? 2 : n <= 4 ? n : 3, rows = Math.ceil(n / cols);
    const gx = 18, gy = 18;
    const cw = (G.CW - gx * (cols - 1)) / cols;
    const maxH = (G.BOT - top - gy * (rows - 1)) / rows;
    const pad = 26;
    const nsz = cols <= 2 ? c.Z.kpi * 1.1 : cols === 3 ? c.Z.kpi : c.Z.kpi * 0.86;
    const t = c.tone;
    const pss = ks.map((k, i) => {
      const hi = style === 'navy' && i === 0;
      const solid = style === 'solid';
      return numPs(c, sp, k, i, { ns: nsz, nc: hi || solid ? (c.dark ? K.NAVY : K.WHITE) : t.num, lc: hi || solid ? (c.dark ? K.NAVY : 'D5E1F0') : t.body, tc: hi || solid ? (c.dark ? '0B2E5C' : 'B7C9E2') : t.muted });
    });
    const kk = PM.groupK(pss.map(ps => ({ w: cw - pad * 2, h: maxH - pad * 2, ps })), 1.15);
    const ch = Math.min(maxH, Math.max(...pss.map(ps => PM.hK(ps, cw - pad * 2, kk))) + pad * 2 + 18);
    const total = rows * ch + (rows - 1) * gy;
    const y0 = PM.place(top, G.BOT, total, 0.45);
    ks.forEach((k, i) => {
      const r = Math.floor(i / cols), inRow = r === rows - 1 ? n - r * cols : cols;
      const off = (cols - inRow) * (cw + gx) / 2;
      const x = G.X0 + off + (i % cols) * (cw + gx), y = y0 + r * (ch + gy);
      const hi = style === 'navy' && i === 0;
      const fill = style === 'solid' ? (c.dark ? K.SKY : [K.BLUE, K.NAVY, '1F6AC6', '0B3A75'][i % 4]) : hi ? (c.dark ? K.SKY : K.NAVY) : t.cardFill;
      o.push(R(x, y, cw, ch, fill, { r: 16, name: 'Tile ' + (i + 1) }));
      const h = PM.hK(pss[i], cw - pad * 2, kk);
      const tb = PM.tk(x + pad, y + (ch - h) / 2, cw - pad * 2, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  };
}
def('kpi-tiles', 'مربعات أرقام', { accepts: sp => isK(sp) && sp.n >= 2 ? 0.8 : 0, render: tiles('tint'), tags: ['أرقام', 'مربعات'] });
def('kpi-tiles-navy', 'مربعات مع رقم مميز', { accepts: sp => isK(sp) && sp.n >= 3 ? 0.78 : 0, render: tiles('navy'), tags: ['أرقام', 'تمييز'] });
def('kpi-tiles-solid', 'مربعات أرقام ملوّنة', { accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 4 ? 0.74 : 0, render: tiles('solid'), tags: ['أرقام', 'ألوان'] });
def('kpi-grid', 'شبكة أرقام 2×2', { accepts: sp => isK(sp) && (sp.n === 4) ? 0.8 : 0, render: tiles('grid'), tags: ['أرقام', 'شبكة'] });

/* ---------- 3 · hero number + supporting numbers ---------- */
PM.def('kpis', 'kpi-hero', 'رقم رئيسي + أرقام داعمة', {
  forms: ['kpis'], tags: ['أرقام', 'رئيسي'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 5 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const ks = kps(sp);
    const hw = 410;
    const hp = numPs(c, sp, ks[0], 0, { ns: c.Z.kpi * 2.2, ls: c.Z.label * 1.45, nsa: 12 });
    o.push(T(G.X0, top, hw, G.BOT - top, hp, { va: 'm', name: 'Hero number', maxK: 1.1 }));
    o.push(Ln(G.X0 + hw + 30, top + 10, 0, G.BOT - top - 20, c.tone.rule));
    const rest = ks.slice(1), x0 = G.X0 + hw + 62, w = G.X1 - x0;
    const rh = (G.BOT - top) / rest.length;
    const pss = rest.map((k, j) => numPs(c, sp, k, j + 1, { ns: c.Z.kpiS, ls: c.Z.label, nsa: 4 }));
    const kk = PM.groupK(pss.map(ps => ({ w, h: rh - 22, ps })), 1.15);
    rest.forEach((k, j) => {
      const y = top + j * rh;
      if (j > 0) o.push(Ln(x0, y, w, 0, c.tone.rule));
      const h = PM.hK(pss[j], w, kk);
      const tb = PM.tk(x0, y + (rh - h) / 2, w, pss[j], kk, { name: 'Number ' + (j + 2) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* ---------- 4 · numbers on a full-bleed photo ---------- */
function onPhoto(style) {
  return (sp, c) => {
    const o = [];
    PM.photoBlock(c, sp, o, 0, 0, W, H, { veil: style === 'bottom' ? 'down' : 'right', a0: style === 'bottom' ? 20 : 92, a1: style === 'bottom' ? 94 : 40 });
    if (style !== 'bottom') o.push(R(0, 0, W, H, K.NAVY, { fa: 25, role: 'veil' }));
    PM.chromeOnPhoto(c, o);
    const ks = kps(sp), n = ks.length;
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { color: K.SKY, bind: 'eyebrow' }));
    if (sp.title) ps.push(tx.title(c, sp.title, { color: K.WHITE, bind: 'title' }));
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { color: 'C9D6E8', bind: 'sub' }));
    if (style === 'bottom') {
      o.push(T(G.X0, 62, 620, 130, ps, { name: 'Title' }));
      const gx = 36, cw = (G.CW - gx * (n - 1)) / n;
      const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: n <= 3 ? c.Z.kpi * 1.1 : c.Z.kpi * 0.86, nc: K.WHITE, lc: 'D5E1F0', tc: 'B7C9E2' }));
      const kk = PM.groupK(pss.map(ps => ({ w: cw, h: 160, ps })), 1.1);
      const bh = Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
      const y0 = G.BOT - bh - 6;
      ks.forEach((k, i) => {
        const x = G.X0 + i * (cw + gx);
        o.push(Ln(x, y0 - 18, cw, 0, 'FFFFFF', { sw: 0.75 })); o.push(R(x, y0 - 19.5, 34, 3, K.SKY));
        const tb = PM.tk(x, y0, cw, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
      });
    } else {
      const lw = 380;
      o.push(T(G.X0, 70, lw, 360, ps, { va: 'm', name: 'Title' }));
      const x0 = G.X0 + lw + 60, w = G.X1 - x0, rh = (G.BOT - 70) / n;
      const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: c.Z.kpiS * 1.05, nc: K.WHITE, lc: 'D5E1F0', tc: 'B7C9E2', nsa: 4 }));
      const kk = PM.groupK(pss.map(ps => ({ w, h: rh - 20, ps })), 1.15);
      ks.forEach((k, i) => {
        const y = 70 + i * rh;
        if (i > 0) o.push(Ln(x0, y, w, 0, 'FFFFFF', { sw: 0.5 }));
        const h = PM.hK(pss[i], w, kk);
        const tb = PM.tk(x0, y + (rh - h) / 2, w, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
      });
    }
    return o;
  };
}
def('kpi-photo-bottom', 'أرقام فوق صورة كاملة', { accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 4 ? 0.78 + (sp.imgs.length ? 0.1 : 0) : 0, render: onPhoto('bottom'), tags: ['أرقام', 'صورة'], tones: ['dark'] });
def('kpi-photo-side', 'صورة كاملة + أرقام جانبية', { accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 4 ? 0.76 + (sp.imgs.length ? 0.1 : 0) : 0, render: onPhoto('side'), tags: ['أرقام', 'صورة'], tones: ['dark'] });

/* ---------- 5 · photo half + numbers stack ---------- */
PM.def('kpis', 'kpi-photo-half', 'نصف صورة + أرقام', {
  forms: ['kpis'], tags: ['أرقام', 'صورة'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 4 ? 0.78 + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const pw = 400;
    PM.photoBlock(c, sp, o, W - pw, 0, pw, H, {});
    const w = W - pw - G.X0 - 50;
    const top = PM.head(c, sp, o, { w }) + 24;
    const ks = kps(sp), n = ks.length;
    const rh = (G.BOT - top) / n;
    const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: c.Z.kpiS * 1.1, nsa: 4 }));
    const kk = PM.groupK(pss.map(ps => ({ w, h: rh - 20, ps })), 1.15);
    ks.forEach((k, i) => {
      const y = top + i * rh;
      if (i > 0) o.push(Ln(G.X0, y, w, 0, c.tone.rule));
      const h = PM.hK(pss[i], w, kk);
      const tb = PM.tk(G.X0, y + (rh - h) / 2, w, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* ---------- 6 · number list: number on one side, label on the other ---------- */
PM.def('kpis', 'kpi-list', 'قائمة أرقام', {
  forms: ['kpis'], tags: ['أرقام', 'قائمة'],
  accepts: sp => isK(sp) && sp.n >= 3 && sp.n <= 6 ? 0.78 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 26;
    const ks = kps(sp), n = ks.length;
    const nw = 260, x1 = G.X0 + nw + 30, w1 = G.X1 - x1;
    const rh = (G.BOT - top) / n;
    const nps = ks.map((k, i) => [tx.num(c, k.value || '—', { size: c.Z.kpiS, bind: kb(sp, i).v, sa: 0 })]);
    const lps = ks.map((k, i) => [tx.h(c, k.label || '', { bind: kb(sp, i).l, sa: k.text ? 3 : 0 }), k.text ? tx.body(c, k.text, { bind: kb(sp, i).t }) : null].filter(Boolean));
    const kk = Math.min(PM.groupK(nps.map(ps => ({ w: nw, h: rh - 16, ps })), 1.2), PM.groupK(lps.map(ps => ({ w: w1, h: rh - 16, ps })), 1.2));
    ks.forEach((k, i) => {
      const y = top + i * rh;
      o.push(Ln(G.X0, y, G.CW, 0, i === 0 ? c.tone.accent : c.tone.rule, { sw: i === 0 ? 1.5 : 0.75 }));
      const nh = PM.hK(nps[i], nw, kk), lh = PM.hK(lps[i], w1, kk);
      const a = PM.tk(G.X0, y + (rh - nh) / 2, nw, nps[i], kk, { name: 'Number ' + (i + 1) }); if (a) o.push(a);
      const b = PM.tk(x1, y + (rh - lh) / 2, w1, lps[i], kk, { name: 'Label ' + (i + 1) }); if (b) o.push(b);
    });
    return o;
  }
});

/* ---------- 7 · navy band of numbers under a statement ---------- */
PM.def('kpis', 'kpi-band', 'شريط أرقام', {
  forms: ['kpis'], tags: ['أرقام', 'شريط'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 5 ? 0.78 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.itemsArea(c, sp, o, {}) + 30;
    const bandY = Math.max(top, 250);
    o.push(R(0, bandY, W, H - bandY, c.dark ? K.DEEP : K.NAVY, { role: 'bg', name: 'Band' }));
    const ks = kps(sp), n = ks.length, gx = 36, cw = (G.CW - gx * (n - 1)) / n;
    const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: n <= 3 ? c.Z.kpi * 1.15 : c.Z.kpi * 0.9, nc: K.WHITE, lc: 'C9D6E8', tc: 'A9BBD6' }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: H - bandY - 90, ps })), 1.12);
    const bh = Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const y0 = PM.place(bandY + 30, H - 40, bh, 0.45);
    ks.forEach((k, i) => {
      const x = G.X0 + i * (cw + gx);
      if (i > 0) o.push(Ln(x - gx / 2, y0, 0, bh, '2E558E'));
      const tb = PM.tk(x, y0, cw, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
    });
    o.forEach(ob => { if (ob.pageNum) ob.paras[0].color = '8FA5C4'; });
    return o;
  }
});

/* ---------- 8 · rings / bars for percentages ---------- */
const allPct = sp => sp.items.every(it => { const v = PM.numInfo(it.value); return v && v.pct && v.v >= 0 && v.v <= 100; });
PM.def('kpis', 'kpi-rings', 'حلقات نسب', {
  forms: ['kpis'], tags: ['نسب', 'حلقات'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 5 && allPct(sp) ? 0.9 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 34;
    const ks = kps(sp), n = ks.length, gx = 30, cw = (G.CW - gx * (n - 1)) / n;
    const d = Math.min(150, cw * 0.72, (G.BOT - top) * 0.58);
    const lps = ks.map((k, i) => [tx.label(c, k.label, { bind: kb(sp, i).l, al: 'c', size: c.Z.label * 1.1 }), k.text ? tx.body(c, k.text, { bind: kb(sp, i).t, al: 'c', sb: 3, size: c.Z.body * 0.9, color: c.tone.muted }) : null].filter(Boolean));
    const kk = PM.groupK(lps.map(ps => ({ w: cw, h: G.BOT - top - d - 24, ps })), 1.1);
    const blockH = d + 22 + Math.max(...lps.map(ps => PM.hK(ps, cw, kk)));
    const y0 = PM.place(top, G.BOT, blockH, 0.42);
    ks.forEach((k, i) => {
      const x = G.X0 + i * (cw + gx), cx = x + cw / 2;
      const v = PM.numInfo(k.value).v;
      const ch = PM.Chart(cx - d / 2, y0, d, d, { kind: 'donut', cats: ['', ''], series: [{ name: '', vals: [v, 100 - v], colors: [c.dark ? K.SKY : K.BLUE, c.dark ? '1A3F74' : 'E3EAF3'] }], unit: '%' }, { dark: c.dark, rtl: false, extra: { ring: true, center: false, legend: false, ringOf: bindOf(i) + 'value' } });
      ch.series[0].colors = [c.dark ? K.SKY : K.BLUE, c.dark ? '1A3F74' : 'E3EAF3'];
      ch.noMirror = false;
      o.push(ch);
      o.push(T(cx - d * 0.4, y0 + d / 2 - c.Z.kpiS * 0.62, d * 0.8, c.Z.kpiS * 1.25, [tx.num(c, k.value, { size: c.Z.kpiS * Math.min(1, d / 130), bind: kb(sp, i).v, al: 'c', sa: 0 })], { va: 'm', align: 'center', name: 'Ring value' }));
      const tb = PM.tk(x, y0 + d + 22, cw, lps[i], kk, { align: 'center', name: 'Label ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});
PM.def('kpis', 'kpi-bars', 'أشرطة نسب', {
  forms: ['kpis'], tags: ['نسب', 'أشرطة'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 6 && allPct(sp) ? 0.86 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 34;
    const ks = kps(sp), n = ks.length;
    const rh = Math.min(74, (G.BOT - top) / n);
    let y = PM.place(top, G.BOT, rh * n, 0.4);
    const nw = 120;
    ks.forEach((k, i) => {
      const v = PM.numInfo(k.value).v;
      o.push(T(G.X0, y, G.CW - nw - 10, 24, [tx.label(c, k.label, { bind: kb(sp, i).l, bold: true, color: c.tone.title })], { name: 'Label ' + (i + 1) }));
      o.push(T(G.X1 - nw, y - 6, nw, 30, [tx.num(c, k.value, { size: c.Z.kpiS * 0.8, bind: kb(sp, i).v, al: 'r', sa: 0 })], { name: 'Value ' + (i + 1), align: 'end' }));
      const by = y + 30;
      o.push(R(G.X0, by, G.CW, 10, c.dark ? '163A70' : 'E6ECF4', { r: 5, name: 'Track' }));
      const bar = R(G.X0, by, Math.max(10, G.CW * v / 100), 10, c.dark ? K.SKY : K.BLUE, { r: 5, name: 'Bar' });
      bar.pctOf = bindOf(i) + 'value';
      o.push(bar);
      y += rh;
    });
    return o;
  }
});

/* ---------- 9 · single statement number ---------- */
PM.def('kpis', 'kpi-single', 'رقم واحد كبير', {
  forms: ['kpis'], tags: ['رقم'],
  accepts: sp => isK(sp) && sp.n === 1 ? 0.95 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 20;
    const k = kps(sp)[0];
    const ps = numPs(c, sp, k, 0, { ns: c.Z.kpi * 3, ls: c.Z.lead * 1.15, nsa: 14 });
    o.push(T(G.X0, top, G.CW * 0.75, G.BOT - top, ps, { va: 'm', name: 'Number' }));
    return o;
  }
});
})(window.PM);
