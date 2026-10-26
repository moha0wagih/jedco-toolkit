/* ==========================================================================
   More data layouts · numbers · charts · tables · statements · quotes · compare
   Editorial / annual-report art direction: giant Sequel numerals, hairlines,
   edge-to-edge bands and panels. Authored left-to-right, mirrored for Arabic.
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Ic, G, tx } = PM;
const place = (a, b, h, bias) => PM.place(a, b, h, bias);
const deep = c => (c.dark ? K.DEEP : K.NAVY);
const pale = c => (c.dark ? K.SURF_D : K.PALE);
/* insert a background-level shape right after the slide background so the chrome stays on top */
const under = (o, ...shapes) => { o.splice(1, 0, ...shapes); };
/* header paragraphs for side columns / panels */
function headPs(c, sp, q = {}) {
  const ps = [];
  if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: q.eb, al: q.al }));
  if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title', color: q.tc, size: q.ts, al: q.al }));
  if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub', color: q.sc, al: q.al }));
  if (sp.lead && q.lead !== false) ps.push(tx.body(c, sp.lead, { bind: 'lead', color: q.lc, sb: 14, size: c.Z.body * 1.05, al: q.al, lh: 1.5 }));
  return ps;
}
const pageOn = (o, col) => o.forEach(ob => { if (ob.pageNum) ob.paras[0].color = col; });

/* ======================================================================
   NUMBERS (kpis)
   ====================================================================== */
const isK = sp => (sp.form === 'kpis' || (sp.form === 'items' && sp.valued)) && sp.n >= 1 && sp.n <= 6;
const kdef = (id, name, o) => PM.def('kpis', id, name, Object.assign({ forms: ['kpis'] }, o));
const kB = i => 'main.items.' + i + '.';
const kb = (sp, i) => sp.form === 'kpis' ? { v: kB(i) + 'value', l: kB(i) + 'label', t: kB(i) + 'text' } : { v: kB(i) + 'value', l: kB(i) + 'title', t: kB(i) + 'text' };
const kps = sp => sp.items.map(it => ({ value: it.value || '', label: it.title || '', text: it.text || '' }));
const allPct = sp => sp.items.every(it => { const v = PM.numInfo(it.value); return v && v.pct && v.v >= 0 && v.v <= 100; });
const longLab = sp => Math.max(0, ...sp.items.map(it => PM.words([it.title, it.text].join(' '))));
function numP(c, sp, k, i, o = {}) { return tx.num(c, k.value || '—', { size: o.ns || c.Z.kpi, color: o.nc || c.tone.num, bind: kb(sp, i).v, sa: o.nsa == null ? 8 : o.nsa, al: o.al }); }
function labPs(c, sp, k, i, o = {}) {
  const b = kb(sp, i), ps = [];
  if (k.label) ps.push(tx.label(c, k.label, { size: o.ls || c.Z.label * 1.3, color: o.lc || c.tone.body, bind: b.l, al: o.al, bold: o.lbold }));
  if (k.text) ps.push(tx.body(c, k.text, { size: c.Z.body * 0.92, color: o.tc || c.tone.muted, bind: b.t, sb: 4, al: o.al }));
  return ps;
}
const numPs = (c, sp, k, i, o = {}) => [numP(c, sp, k, i, o), ...labPs(c, sp, k, i, o)];
const area = (c, sp, o, opt) => PM.itemsArea(c, sp, o, Object.assign({ blockHead: true }, opt || {}));

/* 1 · editorial strip: giant numerals inside a pale band that runs edge to edge, labels beneath */
kdef('kx-edge', 'أرقام عملاقة على شريط', {
  tags: ['أرقام', 'شريط', 'تحريري'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 4 && longLab(sp) <= 22 ? 0.84 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const ks = kps(sp), n = ks.length, gx = 44, cw = (G.CW - gx * (n - 1)) / n;
    const nsz = c.Z.kpi * [0, 0, 1.75, 1.42, 1.12][n];
    const nps = ks.map((k, i) => [numP(c, sp, k, i, { ns: nsz, nsa: 0 })]);
    const lps = ks.map((k, i) => labPs(c, sp, k, i, { ls: c.Z.lead * 0.92, lc: c.tone.title }));
    const pad = 30;
    const kn = PM.groupK(nps.map(ps => ({ w: cw, h: 150, ps })), 1);
    const nh = Math.max(...nps.map(ps => PM.hK(ps, cw, kn)));
    const bandH = nh + pad * 2;
    const kl = PM.groupK(lps.map(ps => ({ w: cw, h: Math.max(40, G.BOT - top - bandH - 22), ps })), 1.12);
    const lh = Math.max(0, ...lps.map(ps => PM.hK(ps, cw, kl)));
    const total = bandH + 22 + lh;
    const y0 = place(top, G.BOT, total, 0.5);
    under(o, R(0, y0, W, bandH, pale(c), { role: 'bg', name: 'Band' }));
    ks.forEach((k, i) => {
      const x = G.X0 + i * (cw + gx);
      if (i > 0) o.push(Ln(x - gx / 2, y0 + 18, 0, bandH - 36, c.dark ? K.RULE_D : 'D3DEEB'));
      const a = PM.tk(x, y0 + pad, cw, nps[i], kn, { name: 'Number ' + (i + 1) }); if (a) o.push(a);
      o.push(R(x, y0 + bandH - 1.5, 36, 3, K.SKY, { name: 'Tick' }));
      const b = PM.tk(x, y0 + bandH + 22, cw, lps[i], kl, { name: 'Label ' + (i + 1) }); if (b) o.push(b);
    });
    return o;
  }
});

/* 2 · one hero value with its label beside it, the rest in a quiet row below a hairline */
kdef('kx-focus', 'رقم محوري + صف داعم', {
  tags: ['أرقام', 'رئيسي'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 5 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 28;
    const ks = kps(sp), n = ks.length;
    const hs = c.Z.kpi * 2.3;
    const hp = numP(c, sp, ks[0], 0, { ns: hs, nsa: 0 });
    const hw = Math.min(G.CW * 0.55, PM.textW(hp.t, hp, hs) + 12);
    const hh = hs * 1.12;
    const lw = Math.min(330, G.CW - hw - 36);
    const hl = labPs(c, sp, ks[0], 0, { ls: c.Z.lead, lc: c.tone.title, lbold: true });
    const rest = ks.slice(1), m = rest.length, gx = 36, cw = (G.CW - gx * (m - 1)) / m;
    const rps = rest.map((k, j) => numPs(c, sp, k, j + 1, { ns: c.Z.kpiS * (m <= 2 ? 1.1 : 0.95), nsa: 4 }));
    const kr = PM.groupK(rps.map(ps => ({ w: cw, h: 120, ps })), 1.1);
    const rh = Math.max(...rps.map(ps => PM.hK(ps, cw, kr)));
    const total = hh + 30 + 26 + rh;
    const y0 = place(top, G.BOT, total, 0.5);
    o.push(T(G.X0, y0, hw, hh, [hp], { name: 'Hero number', va: 'b' }));
    if (hl.length) { const kl = PM.groupK([{ w: lw, h: hh, ps: hl }], 1.1); const lb = PM.tk(G.X0 + hw + 28, y0 + hh - PM.hK(hl, lw, kl) - hs * 0.1, lw, hl, kl, { name: 'Hero label' }); if (lb) o.push(lb); }
    const ly = y0 + hh + 30;
    o.push(Ln(G.X0, ly, G.CW, 0, c.tone.rule));
    o.push(R(G.X0, ly - 1.5, 56, 3, K.SKY, { name: 'Tick' }));
    rest.forEach((k, j) => {
      const x = G.X0 + j * (cw + gx);
      const tb = PM.tk(x, ly + 26, cw, rps[j], kr, { name: 'Number ' + (j + 2) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* 3 · navy half with the numbers facing a full-bleed photo half */
kdef('kx-navyhalf', 'لوحة كحلية للأرقام + صورة', {
  tags: ['أرقام', 'صورة', 'كحلي'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 4 && !sp.lead && longLab(sp) <= 12 ? 0.8 + (sp.imgs.length ? 0.08 : 0) : 0,
  render(sp, c) {
    const o = [];
    const pw = 500;
    o.push(R(0, 0, W, H, deep(c), { role: 'bg', lock: true, name: 'Background' }));
    PM.photoBlock(c, sp, o, pw, 0, W - pw, H, {});
    PM.chromeOnPhoto(c, o, { pageColor: '8FA5C4' });
    const x0 = G.X0, w = pw - G.X0 - 48;
    const hp = headPs(c, sp, { eb: K.SKY, tc: K.WHITE, sc: 'C9D6E8', ts: c.Z.title * 0.92 });
    let top = 74;
    if (hp.length) { const hb = PM.textAt(x0, 74, w, 130, hp, { name: 'Title' }); o.push(hb); top = hb.y + hb.h + 30; }
    const ks = kps(sp), n = ks.length;
    const cols = n === 4 ? 2 : 1, rows = Math.ceil(n / cols), gx = 30;
    const cw = (w - gx * (cols - 1)) / cols;
    const avail = G.BOT - top;
    const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: c.Z.kpi * (cols === 2 ? 0.95 : 1.05), nc: K.WHITE, lc: 'C9D6E8', tc: 'A9BBD6', nsa: 6 }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: avail / rows - 26, ps })), 1.1);
    const rh = Math.min(avail / rows, Math.max(...pss.map(ps => PM.hK(ps, cw, kk))) + 40);
    const y0 = place(top, G.BOT, rh * rows, 0.6);
    ks.forEach((k, i) => {
      const r = Math.floor(i / cols), cc = i % cols;
      const x = x0 + cc * (cw + gx), y = y0 + r * rh;
      o.push(Ln(x, y, cw, 0, '2E558E'));
      o.push(R(x, y - 1.5, 28, 3, K.SKY, { name: 'Tick' }));
      const tb = PM.tk(x, y + 18, cw, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* 4 · ladder: numbers against a vertical spine, labels on the opposite side */
kdef('kx-ladder', 'سلّم أرقام حول محور', {
  tags: ['أرقام', 'محور', 'قائمة'],
  accepts: sp => isK(sp) && sp.n >= 3 && sp.n <= 6 && longLab(sp) <= 18 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const hw = 270;
    const hp = headPs(c, sp, {});
    if (hp.length) o.push(T(G.X0, 80, hw, 400, hp, { va: 'm', name: 'Title', minK: 0.66 }));
    const ks = kps(sp), n = ks.length;
    const ax = G.X0 + hw + 40, aw = G.X1 - ax;
    const rh = Math.min(84, (G.BOT - 70) / n);
    const nps = ks.map((k, i) => [numP(c, sp, k, i, { ns: c.Z.kpiS * 1.25, nsa: 0, al: 'r' })]);
    const lps = ks.map((k, i) => labPs(c, sp, k, i, { ls: c.Z.lead * 0.9, lc: c.tone.title, lbold: true }));
    const nw = 210, lwMax = aw - nw - 52;
    const natL = Math.max(...lps.map(ps => Math.max(...ps.map(p => PM.textW(p.t, p, p.size * 1.1))))) + 8;
    const lw0 = Math.min(lwMax, Math.max(200, natL));
    const nx = ax + (aw - (nw + 52 + lw0)) / 2, sx = nx + nw + 26, lx = sx + 26, lw = lw0;
    const k1 = Math.min(PM.groupK(nps.map(ps => ({ w: nw, h: rh - 14, ps })), 1.15), PM.groupK(lps.map(ps => ({ w: lw, h: rh - 14, ps })), 1.15));
    const y0 = place(70, G.BOT, rh * n, 0.5);
    o.push(Ln(sx, y0, 0, rh * n, c.tone.rule, { name: 'Spine' }));
    ks.forEach((k, i) => {
      const y = y0 + i * rh, cy = y + rh / 2;
      if (i > 0) o.push(Ln(nx, y, lx + lw - nx, 0, c.tone.rule2 || c.tone.rule));
      o.push(E(sx - 4.5, cy - 4.5, 9, 9, i === 0 ? K.SKY : c.tone.accent, { name: 'Dot' }));
      const nh = PM.hK(nps[i], nw, k1), lh = PM.hK(lps[i], lw, k1);
      const a = PM.tk(nx, cy - nh / 2, nw, nps[i], k1, { name: 'Number ' + (i + 1), align: 'end' }); if (a) o.push(a);
      const b = PM.tk(lx, cy - lh / 2, lw, lps[i], k1, { name: 'Label ' + (i + 1) }); if (b) o.push(b);
    });
    return o;
  }
});

/* 5 · one key sentence (the title, set large) + a row of numbers at the foot */
kdef('kx-statement', 'جملة رئيسية + أرقام', {
  tags: ['أرقام', 'عبارة'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 4 && sp.title && PM.words(sp.title) <= 16 && longLab(sp) <= 14 && sp.leadWords <= 40 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const ks = kps(sp), n = ks.length, gx = 40, cw = (G.CW - gx * (n - 1)) / n;
    const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: c.Z.kpi * (n <= 3 ? 1.3 : 1.05), nsa: 6 }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: 150, ps })), 1.1);
    const rh = Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', sa: 14 }));
    ps.push(tx.title(c, sp.title, { bind: 'title', size: c.Z.title * 1.5 }));
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub', sb: 12 }));
    if (sp.lead) ps.push(tx.body(c, sp.lead, { bind: 'lead', sb: 12, size: c.Z.body * 1.05 }));
    const tw = G.CW * 0.8;
    const kt = PM.groupK([{ w: tw, h: G.BOT - G.TOP - rh - 80, ps }], 1);
    const th = PM.hK(ps, tw, kt);
    const total = th + 64 + rh;
    const y0 = place(G.TOP + 6, G.BOT, total, 0.5);
    o.push(PM.tk(G.X0, y0, tw, ps, kt, { name: 'Statement' }));
    const ry = y0 + th + 64;
    ks.forEach((k, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(Ln(x, ry - 22, cw, 0, c.tone.rule)); o.push(R(x, ry - 23.5, 34, 3, K.SKY, { name: 'Tick' }));
      const tb = PM.tk(x, ry, cw, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* 6 · percentages as segmented horizontal tracks with the numeral leading each row */
kdef('kx-tracks', 'مسارات نسب مقسّمة', {
  tags: ['نسب', 'مسارات'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 6 && allPct(sp) && longLab(sp) <= 12 ? 0.86 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const ks = kps(sp), n = ks.length;
    const rh = Math.min(84, (G.BOT - top) / n);
    const nw = 170, tx0 = G.X0 + nw + 20, tw = G.X1 - tx0;
    const nps = ks.map((k, i) => [numP(c, sp, k, i, { ns: c.Z.kpiS * 1.05, nsa: 0 })]);
    const lps = ks.map((k, i) => labPs(c, sp, k, i, { ls: c.Z.label * 1.2, lc: c.tone.title, lbold: true }));
    const k1 = PM.groupK(nps.map(ps => ({ w: nw, h: rh - 8, ps })), 1.1);
    const k2 = PM.groupK(lps.map(ps => ({ w: tw, h: rh - 34, ps })), 1.1);
    const y0 = place(top, G.BOT, rh * n, 0.45);
    const th = 12;
    ks.forEach((k, i) => {
      const y = y0 + i * rh;
      const lh = PM.hK(lps[i], tw, k2), blockH = lh + 10 + th;
      const by = y + (rh - blockH) / 2;
      const ty = by + lh + 10;
      const nh = PM.hK(nps[i], nw, k1);
      const a = PM.tk(G.X0, ty + th / 2 - nh * 0.62, nw, nps[i], k1, { name: 'Number ' + (i + 1) }); if (a) o.push(a);
      const b = PM.tk(tx0, by, tw, lps[i], k2, { name: 'Label ' + (i + 1) }); if (b) o.push(b);
      const v = PM.numInfo(k.value).v;
      o.push(R(tx0, ty, tw, th, c.dark ? '163A70' : 'E6ECF4', { r: 3, name: 'Track' }));
      const bar = R(tx0, ty, Math.max(6, tw * v / 100), th, i === 0 ? (c.dark ? K.SKY : K.BLUE) : (c.dark ? '7FA3D6' : K.NAVY), { r: 3, name: 'Bar' });
      bar.pctOf = kB(i) + 'value'; o.push(bar);
      for (let s = 1; s < 10; s++) o.push(R(tx0 + tw * s / 10 - 1, ty, 2, th, c.tone.bg, { name: 'Segment' }));
    });
    return o;
  }
});

/* 7 · percentages as tall vertical gauges filled from the base */
kdef('kx-gauges', 'أعمدة نسب عمودية', {
  tags: ['نسب', 'أعمدة'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 5 && allPct(sp) && longLab(sp) <= 12 ? 0.84 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const ks = kps(sp), n = ks.length, gx = 30, cw = (G.CW - gx * (n - 1)) / n;
    const pss = ks.map((k, i) => [numP(c, sp, k, i, { ns: c.Z.kpiS * (n <= 3 ? 1.15 : 1), nsa: 6, al: 'c' }), ...labPs(c, sp, k, i, { al: 'c', ls: c.Z.label * 1.15 })]);
    const kk = PM.groupK(pss.map(ps => ({ w: cw - 10, h: 120, ps })), 1.08);
    const lh = Math.max(...pss.map(ps => PM.hK(ps, cw - 10, kk)));
    const th = Math.max(90, Math.min(220, G.BOT - top - lh - 22));
    const total = th + 22 + lh;
    const y0 = place(top, G.BOT, total, 0.45);
    const gw = Math.min(64, cw * 0.4);
    ks.forEach((k, i) => {
      const x = G.X0 + i * (cw + gx), cx = x + cw / 2;
      const v = PM.numInfo(k.value).v;
      o.push(Ln(x, y0 + th, cw, 0, c.tone.rule));
      o.push(R(cx - gw / 2, y0, gw, th, c.dark ? '163A70' : 'E6ECF4', { r: 12, name: 'Gauge' }));
      const fh = Math.max(gw * 0.4, th * v / 100);
      const bar = R(cx - gw / 2, y0 + th - fh, gw, fh, i === 0 ? (c.dark ? K.SKY : K.BLUE) : (c.dark ? '7FA3D6' : K.NAVY), { r: 12, name: 'Fill' });
      o.push(bar);
      const tb = PM.tk(x + 5, y0 + th + 22, cw - 10, pss[i], kk, { name: 'Number ' + (i + 1), align: 'center' }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* 8 · a single number on a navy band that runs edge to edge */
kdef('kx-one-band', 'رقم واحد على شريط كحلي', {
  tags: ['رقم', 'شريط'],
  accepts: sp => isK(sp) && sp.n === 1 ? 0.88 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 34;
    const k = kps(sp)[0];
    const ns = c.Z.kpi * 2.5;
    const np = numP(c, sp, k, 0, { ns, nc: K.WHITE, nsa: 0 });
    const nw = Math.min(520, PM.textW(np.t, np, ns) + 14);
    const lp = labPs(c, sp, k, 0, { ls: c.Z.lead * 1.05, lc: K.WHITE, tc: 'C9D6E8', lbold: true });
    const lw = G.CW - nw - 50;
    const kl = lp.length ? PM.groupK([{ w: lw, h: 160, ps: lp }], 1.1) : 1;
    const bh = Math.max(ns * 1.12, lp.length ? PM.hK(lp, lw, kl) : 0) + 80;
    const by = place(top, G.BOT + 20, bh, 0.5);
    o.push(R(0, by, W, bh, c.dark ? K.DEEP : K.NAVY, { name: 'Band' }));
    o.push(T(G.X0, by + 40, nw, ns * 1.12, [np], { name: 'Number', va: 'm' }));
    o.push(Ln(G.X0 + nw + 24, by + 34, 0, bh - 68, '2E558E'));
    if (lp.length) { const lh = PM.hK(lp, lw, kl); const lb = PM.tk(G.X0 + nw + 50, by + (bh - lh) / 2, lw, lp, kl, { name: 'Label' }); if (lb) o.push(lb); }
    return o;
  }
});

/* 9 · a single number beside a full-height photo */
kdef('kx-one-photo', 'صورة + رقم واحد', {
  tags: ['رقم', 'صورة'],
  accepts: sp => isK(sp) && sp.n === 1 ? 0.84 + (sp.imgs.length ? 0.08 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const pw = 470;
    PM.photoBlock(c, sp, o, W - pw, 0, pw, H, {});
    const w = W - pw - G.X0 - 46;
    const top = PM.head(c, sp, o, { w }) + 20;
    const k = kps(sp)[0];
    const ps = [numP(c, sp, k, 0, { ns: c.Z.kpi * 2.2, nsa: 16 })];
    labPs(c, sp, k, 0, { ls: c.Z.lead, lc: c.tone.title, lbold: true }).forEach(p => ps.push(p));
    if (sp.lead) ps.push(tx.body(c, sp.lead, { bind: 'lead', sb: 16, color: c.tone.muted }));
    const kk = PM.groupK([{ w, h: G.BOT - top - 30, ps }], 1.1);
    const h = PM.hK(ps, w, kk);
    const y = place(top + 10, G.BOT, h + 26, 0.5);
    o.push(R(G.X0, y, 48, 3, K.SKY, { name: 'Tick' }));
    const tb = PM.tk(G.X0, y + 26, w, ps, kk, { name: 'Number' }); if (tb) o.push(tb);
    return o;
  }
});

/* 10 · hairline grid: cells divided by rules only, no fills */
kdef('kx-hairgrid', 'شبكة أرقام بخطوط رفيعة', {
  tags: ['أرقام', 'شبكة', 'خطوط'],
  accepts: sp => isK(sp) && (sp.n === 4 || sp.n === 6) ? 0.82 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const ks = kps(sp), n = ks.length;
    const cols = n === 4 ? 2 : 3, rows = 2;
    const cw = G.CW / cols, pad = 26;
    const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: c.Z.kpi * (cols === 2 ? 1.05 : 0.9), nsa: 6 }));
    const maxCh = (G.BOT - top) / rows;
    const kk = PM.groupK(pss.map(ps => ({ w: cw - pad * 2, h: maxCh - pad * 2, ps })), 1.12);
    const ch = Math.min(maxCh, Math.max(...pss.map(ps => PM.hK(ps, cw - pad * 2, kk))) + pad * 2 + 10);
    const y0 = place(top, G.BOT, ch * rows, 0.5);
    o.push(Ln(G.X0, y0 + ch, G.CW, 0, c.tone.rule));
    for (let j = 1; j < cols; j++) o.push(Ln(G.X0 + j * cw, y0 + 10, 0, ch * rows - 20, c.tone.rule));
    ks.forEach((k, i) => {
      const r = Math.floor(i / cols), cc = i % cols;
      const x = G.X0 + cc * cw + (cc === 0 ? 0 : pad), y = y0 + r * ch;
      const w = cw - pad * (cc === 0 ? 1 : 2);
      const h = PM.hK(pss[i], w, kk);
      const tb = PM.tk(x, y + (ch - h) / 2, w, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* 11 · navy title panel down one edge + numbers on the open side */
kdef('kx-sidepanel', 'لوحة عنوان + أرقام', {
  tags: ['أرقام', 'كحلي', 'جانبي'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 6 && PM.len(sp.title) < 90 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o, { noBar: true, noLogo: true });
    const pw = 320;
    o.push(R(0, 0, pw, H, c.dark ? K.DEEP : K.NAVY, { role: 'bg', lock: true, name: 'Panel' }));
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    const hp = headPs(c, sp, { eb: K.SKY, tc: K.WHITE, sc: 'C9D6E8', lc: 'C9D6E8' });
    if (hp.length) o.push(T(G.X0 - 14, 90, pw - G.X0 - 22, 380, hp, { va: 'm', name: 'Title', minK: 0.66 }));
    const ks = kps(sp), n = ks.length;
    const cols = n >= 4 ? (n === 4 ? 2 : 3) : 1, rows = Math.ceil(n / cols);
    const x0 = pw + 52, w = G.X1 - x0, gx = 40, cw = (w - gx * (cols - 1)) / cols;
    const rh = (G.BOT - 60) / rows;
    const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: c.Z.kpi * (cols <= 2 ? 1.05 : 0.85), nsa: 6 }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: rh - 30, ps })), 1.12);
    const ch = Math.min(rh, Math.max(...pss.map(ps => PM.hK(ps, cw, kk))) + 50);
    const y0 = place(60, G.BOT, ch * rows, 0.5);
    ks.forEach((k, i) => {
      const r = Math.floor(i / cols), cc = i % cols;
      const x = x0 + cc * (cw + gx), y = y0 + r * ch;
      if (r > 0) o.push(Ln(x, y, cw, 0, c.tone.rule));
      if (cc > 0) o.push(Ln(x - gx / 2, y + 14, 0, ch - 28, c.tone.rule));
      const h = PM.hK(pss[i], cw, kk);
      const tb = PM.tk(x, y + (ch - h) / 2, cw, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* 12 · photo band across the top with the title on it, numbers below */
kdef('kx-photoband', 'شريط صورة + أرقام', {
  tags: ['أرقام', 'صورة', 'شريط'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 5 && sp.leadWords <= 30 && longLab(sp) <= 14 ? 0.78 + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o, { noBar: true, noLogo: true });
    const bh = 236;
    PM.photoBlock(c, sp, o, 0, 0, W, bh, { veil: 'up', a0: 88, a1: 5, fy: 0.55 });
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    const hp = headPs(c, sp, { eb: K.SKY, tc: K.WHITE, sc: 'D5E1F0', lc: 'D5E1F0' });
    if (hp.length) o.push(T(G.X0, 60, 700, bh - 60 - 22, hp, { va: 'b', name: 'Title', minK: 0.66 }));
    const ks = kps(sp), n = ks.length, gx = 36, cw = (G.CW - gx * (n - 1)) / n;
    const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: c.Z.kpi * (n <= 3 ? 1.1 : 0.88), nsa: 6 }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - bh - 50, ps })), 1.1);
    const rh = Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const y0 = place(bh + 34, G.BOT, rh, 0.5);
    ks.forEach((k, i) => {
      const x = G.X0 + i * (cw + gx);
      if (i > 0) o.push(Ln(x - gx / 2, y0, 0, rh, c.tone.rule));
      const tb = PM.tk(x, y0, cw, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* 13 · pairs in two columns: numeral + label side by side, hairline rows */
kdef('kx-pairs', 'أرقام بعمودين متقابلين', {
  tags: ['أرقام', 'عمودين'],
  accepts: sp => isK(sp) && sp.n >= 4 && sp.n <= 6 && longLab(sp) <= 14 ? 0.79 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = area(c, sp, o) + 30;
    const ks = kps(sp), n = ks.length, per = Math.ceil(n / 2);
    const gx = 56, cw = (G.CW - gx) / 2, nw = 150, lw = cw - nw - 18;
    const rh = Math.min(96, (G.BOT - top) / per);
    const nps = ks.map((k, i) => [numP(c, sp, k, i, { ns: c.Z.kpiS * 1.05, nsa: 0 })]);
    const lps = ks.map((k, i) => labPs(c, sp, k, i, { ls: c.Z.label * 1.2, lc: c.tone.title, lbold: true }));
    const k1 = Math.min(PM.groupK(nps.map(ps => ({ w: nw, h: rh - 18, ps })), 1.1), PM.groupK(lps.map(ps => ({ w: lw, h: rh - 18, ps })), 1.1));
    const y0 = place(top, G.BOT, rh * per, 0.45);
    ks.forEach((k, i) => {
      const col = Math.floor(i / per), r = i % per;
      const x = G.X0 + col * (cw + gx), y = y0 + r * rh;
      o.push(Ln(x, y, cw, 0, r === 0 ? c.tone.accent : c.tone.rule, { sw: r === 0 ? 1.5 : 0.75 }));
      const nh = PM.hK(nps[i], nw, k1), lh = PM.hK(lps[i], lw, k1);
      const a = PM.tk(x, y + (rh - nh) / 2, nw, nps[i], k1, { name: 'Number ' + (i + 1) }); if (a) o.push(a);
      const b = PM.tk(x + nw + 18, y + (rh - lh) / 2, lw, lps[i], k1, { name: 'Label ' + (i + 1) }); if (b) o.push(b);
    });
    return o;
  }
});

/* 14 · centred composition: title, then 2–3 numerals on a symmetric axis */
kdef('kx-center', 'أرقام في المنتصف', {
  tags: ['أرقام', 'مركز'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 3 && sp.leadWords <= 40 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const hp = headPs(c, sp, { al: 'c' });
    let top = G.TOP + 10;
    if (hp.length) { const hb = PM.textAt(130, G.TOP + 10, 700, 150, hp, { align: 'center', name: 'Title' }); o.push(hb); top = hb.y + hb.h + 36; }
    const ks = kps(sp), n = ks.length, cw = 240, gx = 40;
    const tw = n * cw + (n - 1) * gx, x0 = (W - tw) / 2;
    const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: c.Z.kpi * 1.25, nsa: 22, al: 'c' }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - 10, ps })), 1.1);
    const rh = Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const y0 = place(top, G.BOT, rh, 0.45);
    ks.forEach((k, i) => {
      const x = x0 + i * (cw + gx);
      if (i > 0) o.push(Ln(x - gx / 2, y0 + 6, 0, rh - 12, c.tone.rule));
      const tb = PM.tk(x, y0, cw, pss[i], kk, { name: 'Number ' + (i + 1), align: 'center' }); if (tb) o.push(tb);
      const nh = PM.hK([pss[i][0]], cw, kk);
      o.push(R(x + cw / 2 - 14, y0 + nh - 22 * kk + 8, 28, 2.5, K.SKY, { name: 'Tick' }));
    });
    return o;
  }
});

/* 15 · pale panel bleeding off the open edge holding stacked numerals; title + lead opposite */
kdef('kx-panelright', 'لوحة فاتحة + أرقام مكدّسة', {
  tags: ['أرقام', 'لوحة'],
  accepts: sp => isK(sp) && sp.n >= 2 && sp.n <= 4 && longLab(sp) <= 16 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const px = 500;
    under(o, R(px, 0, W - px, H, pale(c), { role: 'bg', name: 'Panel' }));
    const hp = headPs(c, sp, {});
    if (hp.length) o.push(T(G.X0, 80, px - G.X0 - 50, 400, hp, { va: 'm', name: 'Title', minK: 0.66 }));
    const ks = kps(sp), n = ks.length;
    const x0 = px + 56, w = G.X1 - x0 + 10;
    const rh = (H - 120) / n;
    const pss = ks.map((k, i) => numPs(c, sp, k, i, { ns: c.Z.kpi * 1.1, nsa: 6 }));
    const kk = PM.groupK(pss.map(ps => ({ w, h: rh - 26, ps })), 1.12);
    const ch = Math.min(rh, Math.max(...pss.map(ps => PM.hK(ps, w, kk))) + 40);
    const y0 = place(60, H - 60, ch * n, 0.5);
    ks.forEach((k, i) => {
      const y = y0 + i * ch;
      if (i > 0) o.push(Ln(x0, y, w, 0, c.dark ? K.RULE_D : 'D3DEEB'));
      const h = PM.hK(pss[i], w, kk);
      const tb = PM.tk(x0, y + (ch - h) / 2, w, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* ======================================================================
   CHARTS
   ====================================================================== */
const chOf = sp => sp.main && (sp.main.k === 'chart' ? sp.main.chart : sp.main.chartable);
const isCh = sp => !!chOf(sp) && (sp.form === 'chart' || sp.form === 'table');
const cdef = (id, name, o) => PM.def('chart', id, name, Object.assign({ forms: ['chart', 'table'] }, o));
const chBind = sp => sp.main.k === 'chart' ? 'main.chart' : 'main.chartable';
const round = k => (k === 'donut' || k === 'pie');
const chFs = c => (c.en ? 10.5 : 12);
function chartObj(c, sp, x, y, w, h, o = {}) {
  const ch = chOf(sp);
  const spec = Object.assign({}, ch, { kind: o.kind || ch.kind, series: o.series || ch.series });
  return PM.Chart(x, y, w, h, spec, { dark: o.dark == null ? c.dark : o.dark, rtl: c.rtl, fs: o.fs || chFs(c), bind: chBind(sp), extra: o.extra });
}
/* a sensible non-round kind for this data */
const barKind = ch => (ch.kind === 'line' || ch.kind === 'area' || ch.kind === 'col' || ch.kind === 'bar' || ch.kind === 'stack') ? ch.kind : 'col';
/* numbers pulled from the data */
function stats(c, sp) {
  const ch = chOf(sp), s = ch.series[0].vals.map(Number), n = s.length;
  const f = v => PM.fmtV(Object.assign({}, ch), v);
  const mi = s.indexOf(Math.max(...s));
  const sum = s.reduce((a, b) => a + b, 0) || 1;
  const out = {};
  out.last = { v: f(s[n - 1]), l: (c.en ? 'Latest · ' : 'آخر قيمة · ') + ch.cats[n - 1] };
  out.peak = { v: f(s[mi]), l: (c.en ? 'Peak · ' : 'الأعلى · ') + ch.cats[mi] };
  if (n >= 2 && s[0]) { const g = (s[n - 1] - s[0]) / Math.abs(s[0]) * 100; out.change = { v: (g >= 0 ? '+' : '') + Math.round(g) + '%', l: (c.en ? 'Change ' : 'التغيّر ') + ch.cats[0] + (c.en ? ' → ' : ' ← ') + ch.cats[n - 1] }; }
  out.share = { v: Math.round(s[mi] / sum * 100) + '%', l: (c.en ? 'Largest share · ' : 'الحصة الأكبر · ') + ch.cats[mi] };
  out.first = { v: f(s[0]), l: (c.en ? 'Starting point · ' : 'نقطة البداية · ') + ch.cats[0] };
  out.peakIsLast = mi === n - 1;
  out.multi = ch.series.length > 1 ? ch.series[0].name : '';
  if (out.multi) ['last', 'peak', 'first', 'change'].forEach(k => { if (out[k]) out[k].l += ' · ' + out.multi; });
  return out;
}

/* 1 · chart + narrative column ("what this means") */
cdef('cx-narrative', 'رسم بياني + ماذا يعني', {
  tags: ['رسم بياني', 'قراءة'],
  accepts: sp => isCh(sp) && chOf(sp).cats.length >= 2 && chOf(sp).cats.length <= 10 && sp.leadWords <= 60 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const nw = 250, cw = G.CW - nw - 56;
    const top = PM.head(c, sp, o, {}) + 28;
    const ch = chOf(sp);
    o.push(chartObj(c, sp, G.X0, top, cw, G.BOT - top, {}));
    const x = G.X1 - nw;
    o.push(Ln(x - 28, top, 0, G.BOT - top, c.tone.rule));
    const st = stats(c, sp);
    const a = round(ch.kind) ? st.share : (st.change || st.peak);
    const b = round(ch.kind) ? null : (st.peakIsLast ? st.last : st.peak);
    const ps = [tx.cap(c, c.en ? 'What this means' : 'ماذا يعني ذلك؟', { color: c.tone.accent, sa: 16 })];
    ps.push(tx.num(c, a.v, { size: c.Z.kpi * 1.05, sa: 4 }));
    ps.push(tx.label(c, a.l, { color: c.tone.body, size: c.Z.label * 1.1 }));
    if (b) { ps.push(Object.assign(tx.num(c, b.v, { size: c.Z.kpiS * 0.9, sa: 4, color: c.tone.title }), { sb: 18 })); ps.push(tx.label(c, b.l, { color: c.tone.muted })); }
    if (sp.lead) ps.push(tx.body(c, sp.lead, { bind: 'lead', sb: 18, lh: 1.5 }));
    o.push(T(x, top, nw, G.BOT - top, ps, { va: 'm', name: 'Insight', maxK: 1.05 }));
    return o;
  }
});

/* 2 · small multiples: one small chart per series */
cdef('cx-dual', 'رسوم صغيرة متجاورة', {
  tags: ['رسم بياني', 'مقارنة'],
  accepts: sp => isCh(sp) && !round(chOf(sp).kind) && chOf(sp).series.length >= 2 && chOf(sp).series.length <= 3 && chOf(sp).cats.length <= 8 ? 0.84 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.itemsArea(c, sp, o, {}) + 26;
    const ch = chOf(sp), S = ch.series, m = S.length, gx = 44, cw = (G.CW - gx * (m - 1)) / m;
    const pal = c.dark ? [K.SKY, 'FFFFFF', '00B2BA'] : [K.BLUE, K.NAVY, '00B2BA'];
    const hps = S.map((s, si) => [tx.h(c, s.name || '', { sa: 2 }), tx.num(c, PM.fmtV(ch, s.vals[s.vals.length - 1]), { size: c.Z.kpiS * 0.9, color: si === 0 ? c.tone.num : c.tone.title, sa: 0 }), tx.label(c, (c.en ? 'in ' : 'في ') + ch.cats[ch.cats.length - 1], { color: c.tone.muted, size: c.Z.label * 0.95 })]);
    const kk = PM.groupK(hps.map(ps => ({ w: cw, h: 100, ps })), 1);
    const hh = Math.max(...hps.map(ps => PM.hK(ps, cw, kk)));
    S.forEach((s, si) => {
      const x = G.X0 + si * (cw + gx);
      if (si > 0) o.push(Ln(x - gx / 2, top, 0, G.BOT - top, c.tone.rule));
      o.push(R(x, top, 30, 3, pal[si], { name: 'Key' }));
      const tb = PM.tk(x, top + 14, cw, hps[si], kk, { name: 'Series ' + (si + 1) }); if (tb) o.push(tb);
      const cy = top + 14 + hh + 16;
      o.push(chartObj(c, sp, x, cy, cw, G.BOT - cy, { kind: barKind(ch) === 'stack' ? 'col' : barKind(ch), series: [{ name: s.name, vals: s.vals, color: pal[si] }], extra: { hi: -1, legend: false } }));
    });
    return o;
  }
});

/* 3 · chart above, a strip of numbers pulled from the data below */
cdef('cx-strip', 'رسم بياني + شريط أرقام', {
  tags: ['رسم بياني', 'أرقام'],
  accepts: sp => isCh(sp) && !round(chOf(sp).kind) && chOf(sp).cats.length >= 3 && chOf(sp).cats.length <= 10 && !sp.lead ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 22;
    const st = stats(c, sp);
    const ks = [st.peakIsLast ? st.first : st.peak, st.last, st.change].filter(Boolean);
    const n = ks.length, gx = 40, cw = (G.CW - gx * (n - 1)) / n;
    const pss = ks.map((k, i) => [tx.num(c, k.v, { size: c.Z.kpiS * 0.95, sa: 2, color: i === 1 ? c.tone.num : c.tone.title }), tx.label(c, k.l, { color: c.tone.muted })]);
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: 70, ps })), 1);
    const rh = Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const ry = G.BOT - rh;
    o.push(chartObj(c, sp, G.X0, top, G.CW, ry - 30 - top, {}));
    o.push(Ln(G.X0, ry - 16, G.CW, 0, c.tone.rule));
    ks.forEach((k, i) => {
      const x = G.X0 + i * (cw + gx);
      if (i === 1) o.push(R(x, ry - 17.5, 34, 3, K.SKY, { name: 'Tick' }));
      const tb = PM.tk(x, ry, cw, pss[i], kk, { name: 'Stat ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});

/* 4 · headline numbers column + chart */
cdef('cx-headline', 'رقم رئيسي + رسم بياني', {
  tags: ['رسم بياني', 'رقم'],
  accepts: sp => isCh(sp) && !round(chOf(sp).kind) && chOf(sp).cats.length >= 2 && chOf(sp).cats.length <= 8 && sp.leadWords <= 40 ? 0.78 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const lw = 250;
    const top = PM.head(c, sp, o, {}) + 28;
    const st = stats(c, sp);
    const ps = [tx.num(c, st.last.v, { size: c.Z.kpi * 1.3, sa: 6 }), tx.label(c, st.last.l, { color: c.tone.body, size: c.Z.label * 1.1 })];
    if (st.change) { ps.push(Object.assign(tx.num(c, st.change.v, { size: c.Z.kpiS * 0.9, color: c.tone.title, sa: 4 }), { sb: 26 })); ps.push(tx.label(c, st.change.l, { color: c.tone.muted })); }
    if (sp.lead) ps.push(tx.body(c, sp.lead, { bind: 'lead', sb: 20 }));
    o.push(T(G.X0, top, lw, G.BOT - top, ps, { va: 'm', name: 'Headline', maxK: 1.05 }));
    o.push(Ln(G.X0 + lw + 28, top + 10, 0, G.BOT - top - 20, c.tone.rule));
    o.push(chartObj(c, sp, G.X0 + lw + 60, top, G.CW - lw - 60, G.BOT - top, {}));
    return o;
  }
});

/* 5 · chart set on a navy band that runs to the slide edges */
cdef('cx-navyband', 'رسم بياني على شريط كحلي', {
  tags: ['رسم بياني', 'كحلي'],
  accepts: sp => isCh(sp) && chOf(sp).cats.length <= 10 && !sp.lead ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 24;
    const by = Math.max(top, 150);
    o.push(R(0, by, W, H - by, c.dark ? K.DEEP : K.NAVY, { name: 'Band' }));
    o.push(chartObj(c, sp, G.X0, by + 30, G.CW, H - by - 66, { dark: true }));
    pageOn(o, '8FA5C4');
    return o;
  }
});

/* 6 · donut + share list (big percentages per category) */
cdef('cx-donut-list', 'دائري + قائمة حصص', {
  tags: ['رسم بياني', 'دائري', 'حصص'],
  accepts: sp => { const ch = chOf(sp); if (!isCh(sp) || ch.series.length !== 1 || ch.cats.length < 2 || ch.cats.length > 6) return 0; const sum = ch.series[0].vals.reduce((a, b) => a + (+b || 0), 0); return round(ch.kind) || (ch.unit === '%' && Math.abs(sum - 100) <= 2) ? 0.86 : 0; },
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.itemsArea(c, sp, o, {}) + 24;
    const ch = chOf(sp), vals = ch.series[0].vals.map(Number), sum = vals.reduce((a, b) => a + b, 0) || 1;
    const d = Math.min(300, G.BOT - top);
    const pal = PM.chartPal({ dark: c.dark });
    o.push(chartObj(c, sp, G.X0, place(top, G.BOT, d, 0.5), d, d, { kind: 'donut', extra: { legend: false } }));
    const x0 = G.X0 + d + 60, w = G.X1 - x0, n = vals.length;
    const rh = Math.min(66, (G.BOT - top) / n);
    const y0 = place(top, G.BOT, rh * n, 0.5);
    const nw = 120;
    const lps = ch.cats.map(t => [tx.label(c, t, { color: c.tone.title, bold: true, size: c.Z.label * 1.15 })]);
    const kk = PM.groupK(lps.map(ps => ({ w: w - nw - 30, h: rh - 10, ps })), 1.1);
    vals.forEach((v, i) => {
      const y = y0 + i * rh;
      if (i > 0) o.push(Ln(x0, y, w, 0, c.tone.rule));
      o.push(R(x0, y + rh / 2 - 5, 10, 10, pal[i % 6], { r: 2.5, name: 'Key' }));
      const lh = PM.hK(lps[i], w - nw - 30, kk);
      const a = PM.tk(x0 + 24, y + (rh - lh) / 2, w - nw - 30, lps[i], kk, { name: 'Category ' + (i + 1) }); if (a) o.push(a);
      o.push(T(G.X1 - nw, y + rh / 2 - c.Z.kpiS * 0.5, nw, c.Z.kpiS, [tx.num(c, Math.round(v / sum * 100) + '%', { size: c.Z.kpiS * 0.8, sa: 0, al: 'r' })], { name: 'Share ' + (i + 1), va: 'm', align: 'end' }));
    });
    return o;
  }
});

/* 7 · title column + horizontal bars */
cdef('cx-bar-side', 'عنوان جانبي + أشرطة أفقية', {
  tags: ['رسم بياني', 'أشرطة', 'جانبي'],
  accepts: sp => isCh(sp) && !round(chOf(sp).kind) && chOf(sp).cats.length >= 3 && chOf(sp).cats.length <= 8 && chOf(sp).series.length <= 2 ? 0.8 + (chOf(sp).cats.some(t => PM.len(t) > 10) ? 0.06 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const pw = 300;
    const hp = headPs(c, sp, {});
    if (hp.length) o.push(T(G.X0, 90, pw - G.X0 - 10, 360, hp, { va: 'm', name: 'Title', minK: 0.66 }));
    o.push(Ln(pw + 22, 110, 0, 320, c.tone.rule));
    o.push(chartObj(c, sp, pw + 60, 80, G.X1 - pw - 60, 400, { kind: 'bar' }));
    return o;
  }
});

/* 8 · chart + full-height photo on the open edge */
cdef('cx-photo', 'رسم بياني + صورة', {
  tags: ['رسم بياني', 'صورة'],
  accepts: sp => isCh(sp) && chOf(sp).cats.length <= 7 && !sp.lead ? 0.76 + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const pw = 290;
    PM.photoBlock(c, sp, o, W - pw, 0, pw, H, {});
    const w = W - pw - G.X0 - 44;
    const top = PM.head(c, sp, o, { w }) + 26;
    o.push(chartObj(c, sp, G.X0, top, w, G.BOT - top, {}));
    return o;
  }
});

/* 9 · trend: the change number sits in the header row, chart full width below */
cdef('cx-trend', 'اتجاه + رقم التغيّر', {
  tags: ['رسم بياني', 'اتجاه'],
  accepts: sp => { const ch = chOf(sp); return isCh(sp) && !round(ch.kind) && ch.cats.length >= 3 && ch.cats.length <= 12 && ch.series[0].vals[0] && !sp.lead ? 0.78 + (PM.chartIsTime(ch.cats) ? 0.08 : 0) : 0; },
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const nw = 220;
    const top = PM.head(c, sp, o, { w: G.CW - nw - 40 });
    const st = stats(c, sp);
    const ps = [tx.num(c, st.change.v, { size: c.Z.kpi * 1.05, sa: 2, al: 'r' }), tx.label(c, st.change.l, { color: c.tone.muted, al: 'r' })];
    const nb = T(G.X1 - nw, G.TOP + 2, nw, 90, ps, { name: 'Change', align: 'end' });
    nb.h = Math.min(nb.h, nb.used + 2);
    o.push(nb);
    const cy = Math.max(top, nb.y + nb.h) + 24;
    o.push(Ln(G.X0, cy - 10, G.CW, 0, c.tone.rule));
    const ch = chOf(sp);
    o.push(chartObj(c, sp, G.X0, cy + 6, G.CW, G.BOT - cy - 6, { kind: PM.chartIsTime(ch.cats) && ch.series.length === 1 && ch.kind !== 'col' ? 'area' : barKind(ch) }));
    return o;
  }
});

/* ======================================================================
   TABLES
   ====================================================================== */
const isT = sp => sp.form === 'table' && sp.main && sp.main.rows && sp.main.rows.length >= 2;
const tdef = (id, name, o) => PM.def('table', id, name, Object.assign({ forms: ['table'] }, o));
const nCols = sp => Math.max(...sp.main.rows.map(r => r.length));
function tableFs(rows, w, h, c) {
  const n = rows.length, cols = Math.max(...rows.map(r => r.length));
  const longest = Math.max(...rows.flat().map(t => PM.len(t)));
  const fs = Math.min(c.en ? 14 : 17, (h / n) * 0.4, (w / cols) / Math.max(6, Math.min(longest, 30)) * 1.9);
  return Math.max(8.5, fs);
}
function table(c, sp, x, top, w, bot, o = {}) {
  const rows = sp.main.rows;
  const rh = Math.min(o.maxRh || 60, (bot - top) / rows.length);
  const h = rh * rows.length;
  const fs = tableFs(rows, w, h, c);
  const y = o.y != null ? o.y : place(top, bot, h, o.bias == null ? 0.35 : o.bias);
  return PM.Table(x, y, w, h, rows, { style: o.style || 'rule', fs, dark: o.dark == null ? c.dark : o.dark, bind: 'main.rows' });
}

tdef('tbx-split', 'عنوان جانبي + جدول', {
  tags: ['جدول', 'جانبي'],
  accepts: sp => isT(sp) && nCols(sp) <= 4 && sp.main.rows.length <= 9 && PM.len(sp.title) < 90 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const pw = 300;
    const hp = headPs(c, sp, {});
    if (hp.length) o.push(T(G.X0, 90, pw - G.X0 - 10, 360, hp, { va: 'm', name: 'Title', minK: 0.66 }));
    o.push(Ln(pw + 22, 100, 0, 340, c.tone.rule));
    o.push(table(c, sp, pw + 56, 76, G.X1 - pw - 56, G.BOT, { bias: 0.5, maxRh: 60 }));
    return o;
  }
});
tdef('tbx-band', 'جدول على شريط فاتح', {
  tags: ['جدول', 'شريط'],
  accepts: sp => isT(sp) && sp.main.rows.length <= 8 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.itemsArea(c, sp, o, {}) + 26;
    const rows = sp.main.rows, rh = Math.min(56, (G.BOT - top - 30) / rows.length), th = rh * rows.length;
    const by = top, bh = H - by;
    under(o, R(0, by, W, bh, pale(c), { role: 'bg', name: 'Band' }));
    o.push(table(c, sp, G.X0, by + 28, G.CW, by + 28 + th, { y: place(by + 26, G.BOT, th, 0.4), maxRh: 56, style: 'rule' }));
    return o;
  }
});
tdef('tbx-photo', 'شريط صورة + جدول', {
  tags: ['جدول', 'صورة'],
  accepts: sp => isT(sp) && sp.main.rows.length <= 6 && !sp.lead && PM.len(sp.title) < 70 ? 0.76 + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o, { noBar: true, noLogo: true });
    const bh = 168;
    PM.photoBlock(c, sp, o, 0, 0, W, bh, { veil: 'up', a0: 90, a1: 10, fy: 0.5 });
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    const hp = headPs(c, sp, { eb: K.SKY, tc: K.WHITE, sc: 'D5E1F0' });
    if (hp.length) o.push(T(G.X0, 54, 760, bh - 54 - 16, hp, { va: 'b', name: 'Title', minK: 0.6 }));
    o.push(table(c, sp, G.X0, bh + 26, G.CW, G.BOT, { style: 'fill', bias: 0.4 }));
    return o;
  }
});
tdef('tbx-panel', 'جدول داخل لوحة كحلية', {
  tags: ['جدول', 'كحلي'],
  accepts: sp => isT(sp) && sp.main.rows.length <= 8 ? 0.78 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.itemsArea(c, sp, o, {}) + 24;
    const rows = sp.main.rows, pad = 26;
    const rh = Math.min(54, (G.BOT - top - pad * 2) / rows.length), th = rh * rows.length;
    const ph = th + pad * 2;
    const py = place(top, G.BOT, ph, 0.4);
    o.push(R(G.X0, py, G.CW, ph, c.dark ? K.SURF_D : K.NAVY, { r: 16, name: 'Panel' }));
    o.push(table(c, sp, G.X0 + pad + 4, py + pad, G.CW - pad * 2 - 8, py + pad + th, { y: py + pad, style: 'rule', dark: true, maxRh: 54 }));
    return o;
  }
});
tdef('tbx-center', 'جدول مركّز في المنتصف', {
  tags: ['جدول', 'مركز'],
  accepts: sp => isT(sp) && nCols(sp) <= 4 && sp.main.rows.length >= 3 && sp.main.rows.length <= 9 ? 0.78 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const hp = headPs(c, sp, { al: 'c' });
    let top = G.TOP + 4;
    if (hp.length) { const hb = PM.textAt(150, G.TOP + 4, 660, 130, hp, { align: 'center', name: 'Title' }); o.push(hb); top = hb.y + hb.h + 18; }
    o.push(R(W / 2 - 20, top, 40, 3, K.SKY, { name: 'Tick' }));
    const w = Math.min(G.CW, Math.max(560, nCols(sp) * 165));
    o.push(table(c, sp, (W - w) / 2, top + 24, w, G.BOT, { style: 'zebra', bias: 0.35 }));
    return o;
  }
});

/* ======================================================================
   STATEMENT (paragraph)
   ====================================================================== */
const isP = sp => sp.form === 'para' && sp.textWords > 0;
const pdef = (id, name, o) => PM.def('statement', id, name, Object.assign({ forms: ['para'] }, o));
const sentences = t => String(t).split(/(?<=[.!؟?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
const jb = tb => { if (tb) tb.joinBind = true; return tb; };
const cap = (p, c, ar, en) => Object.assign(p, { cap: c.en ? en : ar });

/* 1 · oversized first word / number */
pdef('stx-firstword', 'كلمة أولى كبيرة', {
  tags: ['نص', 'عبارة', 'تحريري'],
  accepts: sp => isP(sp) && sp.textWords >= 4 && sp.textWords <= 40 ? 0.82 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const words = sp.text.trim().split(/\s+/);
    const first = words[0], rest = words.slice(1).join(' ');
    const isNum = !!PM.numInfo(first);
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', sa: 10 }));
    if (sp.title) ps.push(tx.h(c, sp.title, { bind: 'title', color: c.tone.accent, size: c.Z.lead, sa: 18 }));
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub', sb: 0 }));
    if (isNum) ps.push(Object.assign(tx.num(c, first, { size: c.Z.kpi * 2.2, bind: 'text', sa: 6, sb: 14 }), { part: 0 }));
    else ps.push(Object.assign(P(first, c.Z.title * 2.4, { font: 'head', bold: !c.en, color: c.tone.accent, lh: 1.1, bind: 'text', sa: 6, sb: 14 }), { part: 0 }));
    ps.push(Object.assign(tx.title(c, rest, { size: c.Z.title * 1.05, bind: 'text', color: c.tone.title }), { part: 1 }));
    o.push(jb(T(G.X0, 80, G.CW * 0.84, 400, ps, { va: 'm', name: 'Statement', maxK: 1.1 })));
    return o;
  }
});

/* 2 · pull-quote paragraph with a thin vertical accent */
pdef('stx-pull', 'فقرة بخط جانبي رفيع', {
  tags: ['نص', 'فقرة'],
  accepts: sp => isP(sp) && sp.textWords >= 20 && sp.textWords <= 90 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 30;
    const w = 700;
    const ps = [cap(tx.body(c, sp.text, { size: c.Z.lead * 1.12, color: c.tone.title, bind: 'text', lh: 1.55 }), c, 25, 19.5)];
    const kk = PM.groupK([{ w, h: G.BOT - top, ps }], 1.25);
    const h = PM.hK(ps, w, kk);
    const y = place(top, G.BOT, h, 0.4);
    o.push(R(G.X0, y + 4, 2.5, h - 8, K.SKY, { name: 'Accent' }));
    o.push(jb(PM.tk(G.X0 + 36, y, w, ps, kk, { name: 'Paragraph' })));
    return o;
  }
});

/* 3 · statement in a navy band running edge to edge */
pdef('stx-navyband', 'عبارة على شريط كحلي', {
  tags: ['نص', 'عبارة', 'كحلي'],
  accepts: sp => isP(sp) && sp.textWords <= 42 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 30;
    const w = G.CW - 120;
    const ps = [tx.title(c, sp.text, { size: c.Z.title * 1.05, bind: 'text', color: K.WHITE })];
    const kk = PM.groupK([{ w, h: G.BOT - top - 90, ps }], 1.15);
    const h = PM.hK(ps, w, kk);
    const bh = h + 100;
    const by = place(top, H - 20, bh, 0.45);
    o.push(R(0, by, W, bh, c.dark ? K.DEEP : K.NAVY, { name: 'Band' }));
    o.push(R(G.X0, by + 50, 3, h, K.SKY, { name: 'Accent' }));
    o.push(jb(PM.tk(G.X0 + 34, by + 50, w, ps, kk, { name: 'Statement' })));
    return o;
  }
});

/* 4 · photo band across the top carrying the title, statement below */
pdef('stx-photoband', 'شريط صورة + عبارة', {
  tags: ['نص', 'صورة'],
  accepts: sp => isP(sp) && sp.textWords <= 60 ? 0.78 + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o, { noBar: true, noLogo: true });
    const bh = 230;
    PM.photoBlock(c, sp, o, 0, 0, W, bh, { veil: 'up', a0: 86, a1: 0, fy: 0.55 });
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    const hp = headPs(c, sp, { eb: K.SKY, tc: K.WHITE, sc: 'D5E1F0' });
    if (hp.length) o.push(T(G.X0, 60, 720, bh - 60 - 24, hp, { va: 'b', name: 'Title', minK: 0.66 }));
    const w = G.CW - 60;
    const ps = [cap(tx.body(c, sp.text, { size: c.Z.lead * 1.15, color: c.tone.title, bind: 'text', lh: 1.5 }), c, 26, 20)];
    const kk = PM.groupK([{ w, h: G.BOT - bh - 44, ps }], 1.5);
    const h = PM.hK(ps, w, kk);
    const y = place(bh + 40, G.BOT, h, 0.4);
    o.push(jb(PM.tk(G.X0, y, w, ps, kk, { name: 'Statement' })));
    return o;
  }
});

/* 5 · magazine: title + first sentence in a side column, the rest in two text columns */
pdef('stx-magazine', 'فقرة بأسلوب مجلة', {
  tags: ['نص', 'أعمدة', 'تحريري'],
  accepts: sp => isP(sp) && sp.textWords >= 50 && sp.textWords <= 230 && sentences(sp.text).length >= 3 ? 0.82 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const s = sentences(sp.text);
    const first = s[0], rest = s.slice(1);
    const lw = 290;
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow' }));
    if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title', sa: 16, size: c.Z.title * 0.9 }));
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub', sa: 10 }));
    ps.push(Object.assign(tx.h(c, first, { size: c.Z.lead * 1.05, color: c.tone.accent, bind: 'text', lh: 1.4, sb: 10 }), { part: 0 }));
    o.push(jb(T(G.X0, 74, lw, 410, ps, { va: 'm', name: 'Lead column', minK: 0.66, maxK: 1.05 })));
    const x0 = G.X0 + lw + 50, gx = 32, cw = (G.X1 - x0 - gx) / 2;
    const half = Math.ceil(rest.length / 2);
    const mk = arr => [tx.body(c, arr.join(' '), { size: c.Z.body * 1.08, bind: 'text', lh: 1.62 })];
    const pa = mk(rest.slice(0, half)), pb = rest.length > 1 ? mk(rest.slice(half)) : [];
    const kk = PM.groupK([{ w: cw, h: 380, ps: pa }, { w: cw, h: 380, ps: pb }], 1.15);
    const h = Math.max(PM.hK(pa, cw, kk), pb.length ? PM.hK(pb, cw, kk) : 0);
    const y = place(80, G.BOT, h + 26, 0.5);
    o.push(Ln(x0, y, G.X1 - x0, 0, c.tone.rule)); o.push(R(x0, y - 1.5, 40, 3, K.SKY, { name: 'Tick' }));
    o.push(jb(PM.tk(x0, y + 26, cw, pa, kk, { name: 'Column 1' })));
    if (pb.length) o.push(jb(PM.tk(x0 + cw + gx, y + 26, cw, pb, kk, { name: 'Column 2' })));
    return o;
  }
});

/* 6 · numbered sentences on hairline rows */
pdef('stx-sentences', 'جمل مرقّمة', {
  tags: ['نص', 'جمل', 'أرقام'],
  accepts: sp => { if (!isP(sp)) return 0; const s = sentences(sp.text); return s.length >= 2 && s.length <= 5 && s.every(x => PM.words(x) <= 34) && sp.textWords <= 130 ? 0.8 : 0; },
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 30;
    const s = sentences(sp.text), n = s.length;
    const nw = 70, w = G.CW - nw;
    const pss = s.map((t, i) => [Object.assign(cap(tx.body(c, t, { size: c.Z.lead * 0.95, color: c.tone.title, bind: 'text', lh: 1.45 }), c, 22, 17.5), { part: i })]);
    const avail = (G.BOT - top) / n;
    const kk = PM.groupK(pss.map(ps => ({ w, h: avail - 26, ps })), 1.3);
    const hs = pss.map(ps => PM.hK(ps, w, kk) + 30);
    const total = hs.reduce((a, b) => a + b, 0);
    let y = place(top, G.BOT, total, 0.4);
    s.forEach((t, i) => {
      o.push(Ln(G.X0, y, G.CW, 0, i === 0 ? c.tone.accent : c.tone.rule, { sw: i === 0 ? 1.5 : 0.75 }));
      o.push(T(G.X0, y + 15, nw - 10, 30, [tx.num(c, PM.pad2(i + 1), { size: 18, color: K.SKY, sa: 0 })], { name: 'Index ' + (i + 1) }));
      o.push(jb(PM.tk(G.X0 + nw, y + 15, w, pss[i], kk, { name: 'Sentence ' + (i + 1) })));
      y += hs[i];
    });
    return o;
  }
});

/* 7 · calm statement anchored low on a pale full slide */
pdef('stx-bottom', 'عبارة منخفضة على خلفية هادئة', {
  tags: ['نص', 'عبارة', 'هادئ'],
  accepts: sp => isP(sp) && sp.textWords <= 36 ? 0.78 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    under(o, R(0, 0, W, H, pale(c), { role: 'bg', name: 'Tint' }));
    const top = PM.head(c, sp, o, { w: G.CW * 0.7 }) + 30;
    const w = G.CW * 0.82;
    const ps = [tx.title(c, sp.text, { size: c.Z.title * 1.3, bind: 'text', color: c.tone.title })];
    const kk = PM.groupK([{ w, h: G.BOT - top - 40, ps }], 1.1);
    const h = PM.hK(ps, w, kk);
    const y = G.BOT - h;
    o.push(R(G.X0, y - 26, 48, 3, K.SKY, { name: 'Tick' }));
    o.push(jb(PM.tk(G.X0, y, w, ps, kk, { name: 'Statement' })));
    return o;
  }
});

/* 8 · stagger: large title top, paragraph stepped into the far column */
pdef('stx-stagger', 'عنوان كبير + فقرة متدرجة', {
  tags: ['نص', 'تحريري'],
  accepts: sp => isP(sp) && sp.title && PM.words(sp.title) <= 12 && sp.textWords >= 15 && sp.textWords <= 110 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const hp = [];
    if (sp.eyebrow) hp.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow' }));
    hp.push(tx.title(c, sp.title, { bind: 'title', size: c.Z.title * 1.4 }));
    if (sp.sub) hp.push(tx.sub(c, sp.sub, { bind: 'sub' }));
    const hb = PM.textAt(G.X0, G.TOP + 6, G.CW * 0.68, 190, hp, { name: 'Title', minK: 0.7 });
    o.push(hb);
    const x0 = G.X0 + G.CW * 0.4, w = G.X1 - x0;
    const top = hb.y + hb.h + 36;
    const ps = [cap(tx.body(c, sp.text, { size: c.Z.lead * 0.95, bind: 'text', lh: 1.6 }), c, 21, 16.5)];
    const kk = PM.groupK([{ w, h: G.BOT - top - 26, ps }], 1.3);
    const h = PM.hK(ps, w, kk);
    const y = place(top, G.BOT, h + 26, 0.6);
    o.push(Ln(x0, y, w, 0, c.tone.rule)); o.push(R(x0, y - 1.5, 40, 3, K.SKY, { name: 'Tick' }));
    o.push(jb(PM.tk(x0, y + 26, w, ps, kk, { name: 'Paragraph' })));
    return o;
  }
});

/* ======================================================================
   QUOTE
   ====================================================================== */
const isQ = sp => sp.form === 'quote';
const qdef = (id, name, o) => PM.def('quote', id, name, Object.assign({ forms: ['quote'] }, o));
const qText = sp => (sp.main && sp.main.text) || '';
const qBy = sp => (sp.main && sp.main.by) || '';
const qWords = sp => PM.words(qText(sp));
const glyph = (size, color) => P('“', size, { font: 'num', color, lh: 1 });

/* 1 · full navy with a large Sequel quote glyph */
qdef('qx-navy', 'اقتباس على خلفية كحلية', {
  tags: ['اقتباس', 'كحلي'],
  accepts: sp => isQ(sp) && qWords(sp) <= 50 ? 0.84 : 0,
  render(sp, c) {
    const o = [];
    o.push(R(0, 0, W, H, c.dark ? K.DEEP : K.NAVY, { role: 'bg', lock: true, name: 'Background' }));
    PM.chromeOnPhoto(c, o, { pageColor: '8FA5C4' });
    o.push(T(G.X0 - 6, 58, 160, 120, [glyph(190, K.SKY)], { fit: false, name: 'Quote mark' }));
    const ps = [];
    if (sp.title) ps.push(tx.eyebrow(c, sp.title, { bind: 'title', color: K.SKY, sa: 16 }));
    ps.push(Object.assign(tx.title(c, qText(sp), { size: c.Z.quote * 1.2, bind: 'main.text', color: K.WHITE, lh: 1.42 }), { cap: c.en ? 28 : 34 }));
    if (qBy(sp)) ps.push(tx.sub(c, qBy(sp), { bind: 'main.by', sb: 26, color: 'C9D6E8' }));
    const qb = T(G.X0, 190, G.CW * 0.82, 280, ps, { va: 't', name: 'Quote', maxK: 1.15 });
    o.push(qb);
    return o;
  }
});

/* 2 · navy side panel holding the glyph + attribution, quote text on the open side */
qdef('qx-split', 'لوحة المتحدث + اقتباس', {
  tags: ['اقتباس', 'لوحة'],
  accepts: sp => isQ(sp) && qWords(sp) <= 60 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o, { noBar: true, noLogo: true });
    const pw = 330;
    o.push(R(0, 0, pw, H, c.dark ? K.DEEP : K.NAVY, { role: 'bg', lock: true, name: 'Panel' }));
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    o.push(T(G.X0 - 8, 90, 160, 120, [glyph(170, K.SKY)], { fit: false, name: 'Quote mark' }));
    const sp2 = [];
    if (sp.title) sp2.push(tx.eyebrow(c, sp.title, { bind: 'title', color: K.SKY, sa: 10 }));
    if (qBy(sp)) sp2.push(tx.h(c, qBy(sp), { bind: 'main.by', color: K.WHITE, size: c.Z.lead * 0.95 }));
    if (sp2.length) {
      const bw = pw - G.X0 - 30;
      const bb = PM.textAt(G.X0, 300, bw, 170, sp2, { name: 'Attribution' });
      bb.y = G.BOT - bb.h; o.push(bb);
      o.push(R(G.X0, bb.y - 22, 36, 3, K.SKY, { name: 'Tick' }));
    }
    const x0 = pw + 56;
    o.push(T(x0, 80, G.X1 - x0, 400, [tx.title(c, qText(sp), { size: c.Z.quote * 1.05, bind: 'main.text', lh: 1.45 })], { va: 'm', name: 'Quote', maxK: 1.15 }));
    return o;
  }
});

/* 3 · quote hung on a vertical accent rule, attribution after a hairline */
qdef('qx-rule', 'اقتباس بخط عمودي', {
  tags: ['اقتباس', 'خط'],
  accepts: sp => isQ(sp) && qWords(sp) <= 70 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const w = G.CW - 160;
    const ps = [];
    if (sp.title) ps.push(tx.eyebrow(c, sp.title, { bind: 'title', sa: 18 }));
    ps.push(tx.title(c, qText(sp), { size: c.Z.quote, bind: 'main.text', color: c.tone.title, lh: 1.45 }));
    const kk = PM.groupK([{ w, h: 300, ps }], 1.15);
    const h = PM.hK(ps, w, kk);
    const byP = qBy(sp) ? [tx.label(c, qBy(sp), { bind: 'main.by', color: c.tone.accent, bold: true, size: c.Z.label * 1.25 })] : [];
    const bh = byP.length ? PM.hK(byP, w, 1) + 40 : 0;
    const y = place(70, G.BOT, h + bh, 0.45);
    o.push(R(G.X0, y, 4, h, K.SKY, { name: 'Accent' }));
    o.push(PM.tk(G.X0 + 40, y, w, ps, kk, { name: 'Quote' }));
    if (byP.length) {
      o.push(Ln(G.X0 + 40, y + h + 20, 60, 0, c.tone.rule));
      o.push(PM.tk(G.X0 + 40, y + h + 34, w, byP, 1, { name: 'Author' }));
    }
    return o;
  }
});

/* 4 · oversized line quote icon as a watermark beside the text */
qdef('qx-ghost', 'اقتباس بعلامة خلفية كبيرة', {
  tags: ['اقتباس', 'علامة'],
  accepts: sp => isQ(sp) && qWords(sp) <= 50 ? 0.78 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    o.push(Ic(G.X1 - 260, 120, 270, 'lib:quote', c.dark ? '1C4A86' : 'DCE7F4', { sw: 0.9, name: 'Watermark' }));
    const ps = [];
    if (sp.title) ps.push(tx.eyebrow(c, sp.title, { bind: 'title', sa: 18 }));
    ps.push(tx.title(c, qText(sp), { size: c.Z.quote * 1.1, bind: 'main.text', lh: 1.42 }));
    if (qBy(sp)) { ps.push(tx.sub(c, '— ' + qBy(sp), { bind: 'main.by', sb: 22, color: c.tone.accent })); }
    o.push(T(G.X0, 80, 580, 400, ps, { va: 'm', name: 'Quote', maxK: 1.12 }));
    return o;
  }
});

/* 5 · photo band across the top, quote set beneath */
qdef('qx-photoband', 'شريط صورة + اقتباس', {
  tags: ['اقتباس', 'صورة'],
  accepts: sp => isQ(sp) && qWords(sp) <= 34 ? 0.78 + (sp.imgs.length ? 0.1 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o, { noBar: true, noLogo: true });
    const bh = 220;
    PM.photoBlock(c, sp, o, 0, 0, W, bh, { veil: 'down', a0: 45, a1: 0, fy: 0.5 });
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    o.push(T(G.X0 - 4, bh + 16, 90, 90, [glyph(96, K.SKY)], { fit: false, name: 'Quote mark' }));
    const ps = [];
    if (sp.title) ps.push(tx.eyebrow(c, sp.title, { bind: 'title', sa: 12 }));
    ps.push(tx.title(c, qText(sp), { size: c.Z.quote, bind: 'main.text', lh: 1.4 }));
    if (qBy(sp)) ps.push(tx.sub(c, qBy(sp), { bind: 'main.by', sb: 16, color: c.tone.accent }));
    o.push(T(G.X0 + 90, bh + 34, G.CW - 150, G.BOT - bh - 34, ps, { va: 'm', name: 'Quote', maxK: 1.1 }));
    return o;
  }
});

/* ======================================================================
   COMPARE
   ====================================================================== */
const isC = sp => sp.form === 'compare' && sp.main && sp.main.a && sp.main.b;
const mdef = (id, name, o) => PM.def('compare', id, name, Object.assign({ forms: ['compare'] }, o));
const A = sp => sp.main.a, B = sp => sp.main.b;
const nMax = sp => Math.max(A(sp).items.length, B(sp).items.length);
const iW = sp => Math.max(0, ...A(sp).items.concat(B(sp).items).map(t => PM.words(t)));
const sTitle = (c, s, key, o = {}) => tx.h(c, s.title || '', { size: o.size || c.Z.lead * 1.05, bind: 'main.' + key + '.title', color: o.color, sa: o.sa == null ? 14 : o.sa, al: o.al });
const sItem = (c, t, key, i, o = {}) => cap2(c, tx.body(c, t, { size: o.size || c.Z.lead * 0.9, bind: 'main.' + key + '.items.' + i, bullet: o.bullet, color: o.color, sa: o.sa == null ? 12 : o.sa, bc: o.bc, al: o.al }));
const cap2 = (c, p) => Object.assign(p, { cap: c.en ? 17.5 : 22 });

/* 1 · two-tone halves touching the slide edges (light | navy) */
mdef('cmx-twotone', 'نصفان: فاتح وكحلي', {
  tags: ['مقارنة', 'نصفين'],
  accepts: sp => isC(sp) && nMax(sp) <= 6 && iW(sp) <= 14 ? 0.84 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 26;
    under(o, R(0, top, W / 2, H - top, pale(c), { role: 'bg', name: 'Half A' }));
    o.push(R(W / 2, top, W / 2, H - top, c.dark ? K.DEEP : K.NAVY, { name: 'Half B' }));
    pageOn(o, c.tone.muted);
    const pad = 40, cw = W / 2 - G.X0 - pad;
    const pa = [sTitle(c, A(sp), 'a', { color: c.tone.title }), ...A(sp).items.map((t, i) => sItem(c, t, 'a', i, { bullet: 'dot', color: c.tone.body }))];
    const pb = [sTitle(c, B(sp), 'b', { color: K.WHITE }), ...B(sp).items.map((t, i) => sItem(c, t, 'b', i, { bullet: 'dot', color: 'DCE7F5', bc: K.SKY }))];
    const kk = PM.groupK([{ w: cw, h: H - top - 70, ps: pa }, { w: cw, h: H - top - 70, ps: pb }], 1.3);
    const h = Math.max(PM.hK(pa, cw, kk), PM.hK(pb, cw, kk));
    const y = place(top + 34, H - 40, h, 0.4);
    o.push(R(G.X0, y - 20, 36, 3, c.tone.accent, { name: 'Tick A' }));
    o.push(R(W / 2 + pad, y - 20, 36, 3, K.SKY, { name: 'Tick B' }));
    o.push(PM.tk(G.X0, y, cw, pa, kk, { name: 'Side A' }));
    o.push(PM.tk(W / 2 + pad, y, cw, pb, kk, { name: 'Side B' }));
    return o;
  }
});

/* 2 · comparison table: index | A | B with the B column softly highlighted */
mdef('cmx-table', 'جدول مقارنة بعمود مميز', {
  tags: ['مقارنة', 'جدول'],
  accepts: sp => isC(sp) && nMax(sp) >= 2 && nMax(sp) <= 6 && iW(sp) <= 14 ? 0.82 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 26;
    const n = nMax(sp), iw = 70, gx = 24;
    const cw = (G.CW - iw - gx) / 2, pad = 18;
    const bx = G.X0 + iw + cw + gx;
    const ha = [sTitle(c, A(sp), 'a', { color: c.tone.muted, sa: 0, size: c.Z.lead * 0.95 })], hb = [sTitle(c, B(sp), 'b', { color: c.tone.accent, sa: 0, size: c.Z.lead * 0.95 })];
    const cells = [];
    for (let i = 0; i < n; i++) cells.push([
      A(sp).items[i] != null ? [sItem(c, A(sp).items[i], 'a', i, { sa: 0, color: c.tone.body })] : [],
      B(sp).items[i] != null ? [sItem(c, B(sp).items[i], 'b', i, { sa: 0, color: c.tone.title })] : []]);
    const avail = (G.BOT - top - 60) / n;
    const boxes = [{ w: cw - pad * 2, h: 40, ps: ha }, { w: cw - pad * 2, h: 40, ps: hb }];
    cells.forEach(r => r.forEach(ps => boxes.push({ w: cw - pad * 2, h: avail - 22, ps })));
    const kk = PM.groupK(boxes, 1.3);
    const hh = Math.max(PM.hK(ha, cw - pad * 2, kk), PM.hK(hb, cw - pad * 2, kk)) + 30;
    const rhs = cells.map(r => Math.max(...r.map(ps => ps.length ? PM.hK(ps, cw - pad * 2, kk) : 0)) + 26);
    const total = hh + rhs.reduce((a, b) => a + b, 0);
    const y0 = place(top, G.BOT, total, 0.4);
    o.push(R(bx, y0, cw, total, pale(c), { r: 14, name: 'Highlight' }));
    o.push(PM.tk(G.X0 + iw + pad, y0 + 15, cw - pad * 2, ha, kk, { name: 'Head A' }));
    o.push(PM.tk(bx + pad, y0 + 15, cw - pad * 2, hb, kk, { name: 'Head B' }));
    let y = y0 + hh;
    cells.forEach((r, i) => {
      o.push(Ln(G.X0, y, G.CW, 0, i === 0 ? c.tone.accent : c.tone.rule, { sw: i === 0 ? 1.5 : 0.75 }));
      o.push(T(G.X0, y + 13, iw - 10, 24, [tx.num(c, PM.pad2(i + 1), { size: 15, color: K.SKY, sa: 0 })], { name: 'Index ' + (i + 1) }));
      if (r[0].length) o.push(PM.tk(G.X0 + iw + pad, y + 13, cw - pad * 2, r[0], kk, { name: 'A' + (i + 1) }));
      if (r[1].length) o.push(PM.tk(bx + pad, y + 13, cw - pad * 2, r[1], kk, { name: 'B' + (i + 1) }));
      y += rhs[i];
    });
    return o;
  }
});

/* 3 · ✗ / ✓ line icons: what we leave behind vs what we gain */
mdef('cmx-checks', 'مقارنة بعلامات ✓ و ✗', {
  tags: ['مقارنة', 'تحقق'],
  accepts: sp => isC(sp) && nMax(sp) <= 6 && iW(sp) <= 14 ? 0.8 + (/(قبل|بعد|before|after|الحالي|المستهدف|current|target|future)/i.test(A(sp).title + B(sp).title) ? 0.06 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 28;
    const gx = 70, cw = (G.CW - gx) / 2, ic = 22, pre = 38;
    const sides = [['a', A(sp), 'lib:x', c.tone.muted, c.tone.body], ['b', B(sp), 'lib:check', K.SKY, c.tone.title]];
    const heads = sides.map(([key, s, , , ]) => [sTitle(c, s, key, { sa: 0, color: key === 'a' ? c.tone.muted : c.tone.accent })]);
    const items = sides.map(([key, s, , , col]) => s.items.map((t, i) => [sItem(c, t, key, i, { sa: 0, color: col })]));
    const n = nMax(sp);
    const boxes = heads.map(ps => ({ w: cw - 52, h: 40, ps }));
    items.forEach(col => col.forEach(ps => boxes.push({ w: cw - pre, h: (G.BOT - top - 70) / n - 14, ps })));
    const kk = PM.groupK(boxes, 1.3);
    const hh = Math.max(...heads.map(ps => PM.hK(ps, cw - 52, kk)));
    const rhs = []; for (let i = 0; i < n; i++) rhs.push(Math.max(...items.map(col => col[i] ? PM.hK(col[i], cw - pre, kk) : 0)) + 20);
    const total = Math.max(hh, 34) + 26 + rhs.reduce((a, b) => a + b, 0);
    const y0 = place(top, G.BOT, total, 0.4);
    o.push(Ln(G.X0 + cw + gx / 2, y0, 0, total, c.tone.rule));
    sides.forEach(([key, s, icon, icol], si) => {
      const x = G.X0 + si * (cw + gx);
      o.push(Ic(x, y0, 34, si === 0 ? 'lib:circle-x' : 'lib:circle-check', icol, { sw: 1.6, name: 'Side icon' }));
      o.push(PM.tk(x + 52, y0 + (34 - hh) / 2, cw - 52, heads[si], kk, { name: 'Head ' + key.toUpperCase() }));
      let y = y0 + Math.max(hh, 34) + 26;
      items[si].forEach((ps, i) => {
        const lh = PM.hK(ps, cw - pre, kk);
        o.push(Ic(x + 2, y + Math.min(lh, 22) / 2 - ic / 2 + 1, ic, icon, icol, { sw: 2, name: 'Mark' }));
        o.push(PM.tk(x + pre, y, cw - pre, ps, kk, { name: key.toUpperCase() + (i + 1) }));
        y += rhs[i];
      });
    });
    return o;
  }
});

/* 4 · two photos as an edge-to-edge band, each side titled on its photo */
mdef('cmx-photos', 'صورتان للمقارنة', {
  tags: ['مقارنة', 'صور'],
  accepts: sp => isC(sp) && nMax(sp) <= 4 && iW(sp) <= 10 && !sp.sub ? 0.76 + (sp.imgs.length >= 2 ? 0.12 : 0) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o, { noBar: true });
    const top = PM.head(c, sp, o, {}) + 20;
    const ph = 170, g = 4;
    PM.photoBlock(c, sp, o, 0, top, W / 2 - g / 2, ph, { i: 0, veil: 'up', a0: 85, a1: 0 });
    PM.photoBlock(c, sp, o, W / 2 + g / 2, top, W / 2 - g / 2, ph, { i: 1, veil: 'up', a0: 85, a1: 0 });
    const pad = 36, cw = W / 2 - G.X0 - pad;
    o.push(T(G.X0, top + ph - 54, cw, 40, [sTitle(c, A(sp), 'a', { color: K.WHITE, sa: 0 })], { va: 'b', name: 'Head A' }));
    o.push(T(W / 2 + pad, top + ph - 54, cw, 40, [sTitle(c, B(sp), 'b', { color: K.WHITE, sa: 0 })], { va: 'b', name: 'Head B' }));
    const pa = A(sp).items.map((t, i) => sItem(c, t, 'a', i, { bullet: 'dot', sa: 8 })), pb = B(sp).items.map((t, i) => sItem(c, t, 'b', i, { bullet: 'dot', sa: 8, color: c.tone.title, bc: K.SKY }));
    const y = top + ph + 24;
    const kk = PM.groupK([{ w: cw, h: G.BOT - y, ps: pa }, { w: cw, h: G.BOT - y, ps: pb }], 1.3);
    o.push(PM.tk(G.X0, y, cw, pa, kk, { name: 'Side A' }));
    o.push(PM.tk(W / 2 + pad, y, cw, pb, kk, { name: 'Side B' }));
    return o;
  }
});

/* 5 · two horizontal bands: side title in a column, its points running across */
mdef('cmx-bands', 'مقارنة بصفّين أفقيين', {
  tags: ['مقارنة', 'صفوف'],
  accepts: sp => isC(sp) && nMax(sp) >= 2 && nMax(sp) <= 4 && iW(sp) <= 10 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.itemsArea(c, sp, o, {}) + 26;
    const tw = 190, pad = 26, n = nMax(sp), gx = 26;
    const x0 = G.X0 + tw + pad, w = G.X1 - pad - x0, cw = (w - gx * (n - 1)) / n;
    const sides = [['a', A(sp)], ['b', B(sp)]];
    const heads = sides.map(([key, s]) => [sTitle(c, s, key, { sa: 0, color: key === 'a' ? c.tone.title : (c.dark ? K.NAVY : K.WHITE) })]);
    const cells = sides.map(([key, s]) => s.items.map((t, i) => [sItem(c, t, key, i, { sa: 0, color: key === 'a' ? c.tone.body : (c.dark ? K.NAVY : 'DCE7F5') })]));
    const bandMax = (G.BOT - top - 16) / 2;
    const boxes = heads.map(ps => ({ w: tw - pad, h: bandMax - pad * 2, ps }));
    cells.forEach(r => r.forEach(ps => boxes.push({ w: cw, h: bandMax - pad * 2 - 18, ps })));
    const kk = PM.groupK(boxes, 1.3);
    const bh = Math.min(bandMax, Math.max(...boxes.map(b => PM.hK(b.ps, b.w, kk))) + pad * 2 + 18);
    const y0 = place(top, G.BOT, bh * 2 + 16, 0.45);
    sides.forEach(([key], si) => {
      const y = y0 + si * (bh + 16);
      o.push(R(G.X0, y, G.CW, bh, si === 0 ? pale(c) : (c.dark ? K.SKY : K.NAVY), { r: 16, name: 'Band ' + key.toUpperCase() }));
      const hh = PM.hK(heads[si], tw - pad, kk);
      o.push(PM.tk(G.X0 + pad, y + (bh - hh) / 2, tw - pad, heads[si], kk, { name: 'Head ' + key.toUpperCase() }));
      o.push(Ln(x0 - pad / 2 - 2, y + 22, 0, bh - 44, si === 0 ? c.tone.rule : (c.dark ? '3E7CC9' : '2E558E')));
      cells[si].forEach((ps, i) => {
        const x = x0 + i * (cw + gx);
        const h = PM.hK(ps, cw, kk);
        const yy = y + (bh - h - 18) / 2;
        o.push(R(x, yy, 20, 2.5, si === 0 ? c.tone.accent : K.SKY, { name: 'Tick' }));
        o.push(PM.tk(x, yy + 18, cw, ps, kk, { name: key.toUpperCase() + (i + 1) }));
      });
    });
    return o;
  }
});

/* 6 · central spine: A reads toward the spine, B away from it, rows aligned */
mdef('cmx-spine', 'مقارنة حول محور مركزي', {
  tags: ['مقارنة', 'محور'],
  accepts: sp => isC(sp) && nMax(sp) <= 6 && Math.abs(A(sp).items.length - B(sp).items.length) <= 2 && iW(sp) <= 12 ? 0.8 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 26;
    const sx = G.X0 + G.CW / 2, gap = 34, cw = G.CW / 2 - gap;
    const n = nMax(sp);
    const ha = [sTitle(c, A(sp), 'a', { sa: 0, al: 'r', color: c.tone.muted })], hb = [sTitle(c, B(sp), 'b', { sa: 0, color: c.tone.accent })];
    const ra = [], rb = [];
    for (let i = 0; i < n; i++) {
      ra.push(A(sp).items[i] != null ? [sItem(c, A(sp).items[i], 'a', i, { sa: 0, al: 'r', color: c.tone.body })] : []);
      rb.push(B(sp).items[i] != null ? [sItem(c, B(sp).items[i], 'b', i, { sa: 0, color: c.tone.title })] : []);
    }
    const boxes = [{ w: cw, h: 40, ps: ha }, { w: cw, h: 40, ps: hb }];
    ra.concat(rb).forEach(ps => boxes.push({ w: cw, h: (G.BOT - top - 60) / n - 18, ps }));
    const kk = PM.groupK(boxes, 1.3);
    const hh = Math.max(PM.hK(ha, cw, kk), PM.hK(hb, cw, kk));
    const rhs = ra.map((ps, i) => Math.max(ps.length ? PM.hK(ps, cw, kk) : 0, rb[i].length ? PM.hK(rb[i], cw, kk) : 0) + 22);
    const total = hh + 28 + rhs.reduce((a, b) => a + b, 0);
    const y0 = place(top, G.BOT, total, 0.4);
    o.push(PM.tk(sx - gap - cw, y0, cw, ha, kk, { name: 'Head A', align: 'end' }));
    o.push(PM.tk(sx + gap, y0, cw, hb, kk, { name: 'Head B' }));
    o.push(Ln(sx, y0, 0, total, c.tone.rule, { name: 'Spine' }));
    o.push(E(sx - 6, y0 + hh / 2 - 6, 12, 12, c.dark ? K.SKY : K.NAVY, { name: 'Hub' }));
    let y = y0 + hh + 28;
    ra.forEach((ps, i) => {
      const h = rhs[i] - 22;
      o.push(E(sx - 3.5, y + Math.min(h, 24) / 2 - 3.5, 7, 7, K.SKY, { name: 'Dot' }));
      if (ps.length) o.push(PM.tk(sx - gap - cw, y, cw, ps, kk, { name: 'A' + (i + 1), align: 'end' }));
      if (rb[i].length) o.push(PM.tk(sx + gap, y, cw, rb[i], kk, { name: 'B' + (i + 1) }));
      y += rhs[i];
    });
    return o;
  }
});
})(window.PM);
