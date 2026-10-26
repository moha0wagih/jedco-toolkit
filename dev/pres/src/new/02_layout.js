/* ==========================================================================
   صانع العروض 2 — layout system
   A layout is { id, fam, name, tags, accepts(sp) → 0..1, render(sp, c) → objects }.
   Layouts are authored left-to-right (English orientation: logo + edge bar on
   the left) and mirrored for Arabic. Every text box measures and fits itself,
   so nothing overlaps and the preview equals the exported file.
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Img, Ic, Logo, Veil } = PM;
const LIB = PM.LIB = [];
PM.FAMS = {};
/* register a layout; every layout exists in a light and a dark version */
PM.def = function (fam, id, name, o) {
  const base = Object.assign({ fam, id, name, tags: [], tones: ['light', 'dark'] }, o);
  LIB.push(base);
  (PM.FAMS[fam] = PM.FAMS[fam] || []).push(base);
  return base;
};

/* ---------- geometry ---------- */
const G = PM.G = { X0: 64, X1: 904, TOP: 56, BOT: 494, BAR: 15 };
G.CW = G.X1 - G.X0;

/* ---------- context ---------- */
PM.ctx = function (o) {
  const lang = o.lang || 'ar';
  const dark = !!o.dark;
  const c = {
    lang, rtl: lang !== 'en', bi: lang === 'bi', dark, tone: PM.tone(dark, o.grey), Z: PM.SCALE[lang === 'en' ? 'en' : 'ar'],
    page: o.page || 1, total: o.total || 1, assets: o.assets || {}, photoFor: o.photoFor || (() => null), iconFor: o.iconFor || (() => null), opt: o.opt || {}, kind: o.kind || 'content'
  };
  c.en = lang === 'en';
  return c;
};

/* ---------- text helpers ---------- */
/* fonts: 'head' = Sequel (English titles), 'auto' = Tajawal (Arabic) / FS Industrie (English), 'num' = Sequel */
PM.tx = {
  title: (c, t, o = {}) => P(t, (o.k || 1) * (o.size || c.Z.title), { font: 'head', bold: !c.en || o.bold, color: o.color || c.tone.title, lh: c.en ? 1.18 : 1.25, bind: o.bind, al: o.al }),
  sub: (c, t, o = {}) => P(t, (o.k || 1) * (o.size || c.Z.sub), { color: o.color || c.tone.muted, lh: 1.38, sb: o.sb == null ? 8 : o.sb, bind: o.bind, al: o.al }),
  eyebrow: (c, t, o = {}) => P(c.en ? String(t).toUpperCase() : t, o.size || c.Z.eyebrow, { font: 'head', bold: !c.en, color: o.color || c.tone.accent, track: c.en ? 0.12 : 0, sa: o.sa == null ? 8 : o.sa, bind: o.bind, al: o.al }),
  h: (c, t, o = {}) => P(t, (o.k || 1) * (o.size || c.Z.h), { bold: true, color: o.color || c.tone.title, lh: 1.25, sa: o.sa == null ? 5 : o.sa, bind: o.bind, al: o.al, font: o.font }),
  body: (c, t, o = {}) => P(t, (o.k || 1) * (o.size || c.Z.body), { color: o.color || c.tone.body, lh: o.lh || 1.45, sb: o.sb || 0, sa: o.sa || 0, bind: o.bind, al: o.al, bullet: o.bullet, bc: o.bc || c.tone.accent }),
  num: (c, t, o = {}) => P(t, (o.k || 1) * (o.size || c.Z.kpi), { font: 'num', color: o.color || c.tone.num, lh: 1.05, sa: o.sa == null ? 4 : o.sa, bind: o.bind, al: o.al }),
  label: (c, t, o = {}) => P(t, (o.k || 1) * (o.size || c.Z.label), { color: o.color || c.tone.body, lh: 1.35, bind: o.bind, al: o.al, bold: o.bold }),
  cap: (c, t, o = {}) => P(c.en ? String(t).toUpperCase() : t, o.size || c.Z.cap, { font: c.en ? 'head' : 'auto', bold: !c.en, color: o.color || c.tone.muted, track: c.en ? 0.1 : 0, bind: o.bind, al: o.al })
};
const tx = PM.tx;
/* natural height of paragraphs in a width */
PM.hOf = (ps, w) => PM.blockH(ps.filter(p => p && String(p.t).trim()), w);

/* ---------- slide chrome ---------- */
/* official content chrome: tiny logo in the top corner, the blue edge bar, page number on the language side */
PM.chrome = function (c, objs, o = {}) {
  const t = c.tone;
  objs.push(R(0, 0, W, H, t.bg, { role: 'bg', lock: true, name: 'Background' }));
  if (o.bg2) objs.push(R(...o.bg2, t.bg2, { role: 'bg', lock: true }));
  if (!o.noBar) objs.push(R(0, 84, G.BAR, 399, c.dark ? K.SKY : K.BLUE, { role: 'chrome', lock: true, name: 'Edge bar' }));
  if (!o.noLogo) objs.push(Logo(19 + (o.logoDx || 0), 13, 58, o.logoColor || t.logo));
  if (!o.noPage) {
    const pn = T(G.X0, 508, 60, 12, [P(PM.pad2(c.page), 8, { font: 'num', color: o.pageColor || t.muted })], { role: 'page', name: 'Page number', lock: true });
    pn.pageNum = true;
    objs.push(pn);
  }
  return objs;
};
/* photo-led slides: the chrome sits on the photo */
PM.chromeOnPhoto = function (c, objs, o = {}) {
  if (!o.noLogo) objs.push(Logo(19, 13, 58, o.logoColor || K.WHITE));
  if (!o.noPage) { const pn = T(G.X0, 508, 60, 12, [P(PM.pad2(c.page), 8, { font: 'num', color: o.pageColor || 'D9E3F0' })], { role: 'page', name: 'Page number', lock: true }); pn.pageNum = true; objs.push(pn); }
  return objs;
};

/* header block (eyebrow / title / subtitle); returns the y where content may start */
PM.head = function (c, sp, objs, o = {}) {
  const x = o.x == null ? G.X0 : o.x, w = o.w == null ? G.CW : o.w, y = o.y == null ? G.TOP + 2 : o.y;
  const al = o.align === 'center' ? 'center' : 'start';
  const ps = [];
  const tcol = o.color || c.tone.title;
  if (sp.eyebrow && o.eyebrow !== false) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: o.ebColor }));
  if (sp.title) ps.push(tx.title(c, sp.title, { k: o.k || 1, size: o.size, color: tcol, bind: 'title' }));
  if (sp.sub && o.sub !== false) ps.push(tx.sub(c, sp.sub, { bind: 'sub', color: o.subColor, size: o.subSize }));
  if (!ps.length) return y;
  const maxH = o.maxH || (c.en ? 108 : 118);
  const nat = PM.hOf(ps, w);
  const box = T(x, y, w, Math.min(maxH, nat + 2), ps, { align: al, name: 'Title', role: 'title', minK: 0.7 });
  objs.push(box);
  return y + Math.min(maxH, box.used + 2);
};

/* ---------- item text (title / text / bullets) ---------- */
PM.itemPs = function (c, it, o = {}) {
  const ps = [];
  const b = o.bind || '';
  const col = o.color || null;
  if (it.title) ps.push(tx.h(c, it.title, { k: o.k, size: o.hs, color: o.hColor || col, bind: b + 'title', sa: it.text || (it.bullets || []).length ? (o.hsa == null ? 5 : o.hsa) : 0, al: o.al }));
  if (it.text) ps.push(tx.body(c, it.text, { k: o.k, size: o.bs, color: o.bColor || (col ? col : null), bind: b + 'text', al: o.al }));
  (it.bullets || []).slice(0, o.maxBul || 9).forEach((t, i) => ps.push(tx.body(c, t, { k: o.k, size: (o.bs || c.Z.body) * 0.96, color: o.bColor || col, bind: b + 'bullets.' + i, bullet: 'dot', sb: i === 0 ? 3 : 2, al: o.al, bc: o.bc })));
  return ps;
};
/* a text box that grows downward from (x,y) up to maxH; returns the box */
PM.textAt = function (x, y, w, maxH, ps, o = {}) {
  ps = ps.filter(p => p && String(p.t).trim());
  if (!ps.length) return null;
  const nat = PM.hOf(ps, w);
  return T(x, y, w, Math.min(maxH, nat + 1), ps, o);
};

/* ---------- group fitting: one shared text scale for siblings (cards, columns, rows) ---------- */
PM.scalePs = (ps, k) => ps.filter(Boolean).map(p => Object.assign({}, p, { size: Math.round(p.size * k * 4) / 4, sb: (p.sb || 0) * k, sa: (p.sa || 0) * k }));
/* boxes: [{w, h, ps}] → the largest k (≤ maxK) at which every box fits; falls back to shrinking */
/* how far a paragraph may grow: readable caps per role (Arabic sets larger than wide Latin fonts) */
PM.sizeCap = function (p) {
  const ar = PM.isAr(p.t);
  if (p.cap) return p.cap;
  if (p.font === 'num') return 110;
  if (p.bold) return ar ? 27 : 22;
  return ar ? 20.5 : 18;
};
PM.groupK = function (boxes, maxK = 1.3, minK = 0.6) {
  // grow generously into free space, but never past the readable caps
  let cap = 1.7;
  for (const b of boxes) for (const p of (b.ps || [])) if (p && String(p.t).trim()) cap = Math.min(cap, PM.sizeCap(p) / p.size);
  maxK = Math.max(1, Math.min(Math.max(maxK, 1.55), cap));
  let k = maxK;
  for (const b of boxes) {
    const ps = (b.ps || []).filter(p => p && String(p.t).trim());
    if (!ps.length) continue;
    const f = PM.fitK(ps, b.w, b.h, minK, maxK);
    k = Math.min(k, f.k);
  }
  return Math.max(minK, k);
};
/* text box at a fixed scale (already fitted by groupK); height = natural height */
PM.tk = function (x, y, w, ps, k, o = {}) {
  const sp = PM.scalePs(ps, k).filter(p => String(p.t).trim());
  if (!sp.length) return null;
  const h = o.h != null ? o.h : PM.blockH(sp, w) + 1;
  const t = T(x, y, w, h, sp, Object.assign({}, o, { fit: false }));
  t.overflow = PM.blockH(sp, w) > h + 1;
  return t;
};
PM.hK = (ps, w, k) => PM.blockH(PM.scalePs(ps, k).filter(p => String(p.t).trim()), w);

/* ---------- icons ---------- */
PM.iconOf = function (c, it, i) {
  if (it.icon) return it.icon;
  return c.iconFor([it.title, it.label, it.text, (it.bullets || []).slice(0, 2).join(' ')].filter(Boolean).join(' '), i) || 'lib:circle-dot';
};

/* ---------- photos ---------- */
PM.photo = function (c, sp, i = 0) { return (sp.imgs && sp.imgs[i]) || c.photoFor(sp, i); };
/* full-bleed photo region with an optional gradient veil towards a side */
PM.photoBlock = function (c, sp, objs, x, y, w, h, o = {}) {
  const id = o.src || PM.photo(c, sp, o.i || 0);
  const im = Img(x, y, w, h, id, { r: o.r || 0, slot: 'photo' + (o.i || 0), fx: o.fx, fy: o.fy });
  im.bindImg = 'imgs.' + (o.i || 0);
  objs.push(im);
  if (o.veil) objs.push(Veil(x, y, w, h, o.veilColor || K.NAVY, o.veil, o.a0 == null ? 0 : o.a0, o.a1 == null ? 85 : o.a1));
  if (o.tint) objs.push(R(x, y, w, h, o.tintColor || K.NAVY, { fa: o.tint, role: 'veil' }));
  return im;
};

/* ---------- distributing items in a grid ---------- */
PM.grid = function (n, x, y, w, h, o = {}) {
  const cols = o.cols || Math.min(n, o.maxCols || 4);
  const rows = Math.ceil(n / cols);
  const gx = o.gx == null ? 28 : o.gx, gy = o.gy == null ? 28 : o.gy;
  const cw = (w - gx * (cols - 1)) / cols, ch = (h - gy * (rows - 1)) / rows;
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols); let col = i % cols;
    const inRow = r === rows - 1 ? n - r * cols : cols;
    let off = 0;
    if (o.center && inRow < cols) off = (cols - inRow) * (cw + gx) / 2;
    out.push({ x: x + off + col * (cw + gx), y: y + r * (ch + gy), w: cw, h: ch, i, r, c: col, rows, cols });
  }
  return out;
};

/* ---------- spec shaping: what the slide is about ---------- */
PM.shape = function (spec) {
  const sp = Object.assign({}, spec);
  sp.blocks = spec.blocks || [];
  sp.imgs = spec.imgs || [];
  const vis = sp.blocks.filter(b => b.k !== 'para' || PM.words(b.text) > 0);
  // main block = the heaviest structured block; a short para before it is its lead
  const structured = vis.filter(b => b.k !== 'para');
  let main = structured.slice().sort((a, b) => PM.blockWeight(b) - PM.blockWeight(a))[0] || vis[0] || null;
  sp.main = main;
  sp.form = main ? main.k : (sp.imgs.length ? 'photo' : 'title');
  const paras = vis.filter(b => b.k === 'para');
  sp.lead = paras.length && main && main.k !== 'para' ? paras.map(p => p.text).join('\n') : '';
  if (main && main.k === 'para') sp.text = paras.map(p => p.text).join('\n');
  sp.others = vis.filter(b => b !== main && b.k !== 'para');
  sp.items = [];
  if (main && main.items) sp.items = main.items.map(it => typeof it === 'string' ? { title: '', text: it } : Object.assign({}, it));
  if (main && main.k === 'kpis') sp.items = main.items.map(k => ({ value: k.value, title: k.label, text: k.text }));
  if (main && main.k === 'timeline') sp.items = main.items.map(t => ({ value: t.date, title: t.title, text: t.text }));
  if (spec.kind === 'agenda') sp.items = (spec.items || []).map(it => Object.assign({}, it));
  sp.n = sp.items.length;
  sp.words = sp.items.reduce((a, it) => a + PM.words([it.title, it.text, ...(it.bullets || [])].join(' ')), 0);
  sp.maxItemWords = Math.max(0, ...sp.items.map(it => PM.words([it.title, it.text, ...(it.bullets || [])].join(' '))));
  sp.hasBullets = sp.items.some(it => (it.bullets || []).length);
  sp.allTitled = sp.items.length && sp.items.every(it => it.title);
  sp.textOnly = sp.items.length && sp.items.every(it => !it.title);
  sp.valued = sp.items.length && sp.items.filter(it => it.value).length >= sp.items.length - (sp.items.length > 3 ? 1 : 0);
  sp.leadWords = PM.words(sp.lead);
  sp.textWords = PM.words(sp.text);
  sp.multi = sp.others.length > 0;
  sp.head = main && main.head || '';
  return sp;
};

/* ---------- choosing a layout ---------- */
function score(L, sp, c) {
  if (L.kinds && !L.kinds.includes(sp.kind)) return 0;
  if (!L.kinds && sp.kind !== 'content') return 0;
  let s = 0;
  try { s = L.accepts(sp, c); } catch (e) { s = 0; }
  if (!s) return 0;
  if (sp.prefer && L.fam !== sp.prefer && !(L.forms || []).includes(sp.prefer)) s *= 0.5;
  // numbered processes and timelines only for content that really is a sequence
  if (L.fam === 'steps' && sp.form !== 'steps' && !(sp.form === 'bullets' && sp.stepsHint)) s *= 0.45;
  if (L.fam === 'timeline' && sp.form !== 'timeline') return 0;
  if (L.fam === 'kpis' && sp.form !== 'kpis' && !sp.valued) return 0;
  return s;
}
PM.candidates = function (spec, c) {
  const sp = PM.shape(spec);
  const tones = c.dark ? 'dark' : 'light';
  return LIB.filter(L => L.tones.includes(tones)).map(L => ({ L, s: score(L, sp, c) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
};
/* render a layout; returns { objs, overflow, score } */
PM.renderLayout = function (L, spec, c) {
  const sp = PM.shape(spec);
  let objs = [];
  try { objs = L.render(sp, c) || []; } catch (e) { console.warn('layout failed', L.id, e); return { objs: [], overflow: 99, error: e }; }
  if (c.rtl && !L.noMirror) PM.mirror(objs);
  // bilingual decks: page number on the left, logo on the right
  if (c.bi) objs.forEach(o => { if (o.pageNum) o.x = W - o.x - o.w; });
  const overflow = objs.filter(o => o.t === 'text' && o.overflow).length + overlapCount(objs) * 2;
  objs.forEach(o => { delete o.used; });
  normBinds(objs, sp);
  const missing = PM.coverage(spec, objs, L);
  return { objs, overflow, missing };
};
/* 'main.' binds point at the main block's index in spec.blocks */
function normBinds(objs, sp) {
  const mi = sp.main ? sp.blocks.indexOf(sp.main) : -1;
  const fix = b => (b && mi >= 0 && b.startsWith('main.')) ? 'blocks.' + mi + '.' + b.slice(5) : b;
  for (const o of objs) {
    if (o.bind) o.bind = fix(o.bind);
    if (o.bindImg) o.bindImg = fix(o.bindImg);
    if (o.pctOf) o.pctOf = fix(o.pctOf);
    if (o.ringOf) o.ringOf = fix(o.ringOf);
    if (o.t === 'text') o.paras.forEach(p => { p.bind = fix(p.bind); });
  }
}
/* every piece of the user's text must appear somewhere on the slide */
PM.coverage = function (spec, objs, L) {
  const have = new Set();
  for (const o of objs) {
    if (o.t === 'text') o.paras.forEach(p => p.bind && have.add(p.bind));
    if ((o.t === 'chart' || o.t === 'table') && o.bind) have.add(o.bind + '.*');
    if (o.ringOf) have.add(o.ringOf);
  }
  const hasPrefix = pre => { for (const b of have) if (b === pre || b.startsWith(pre + '.') || b.startsWith(pre)) return true; return false; };
  const miss = [];
  const need = (cond, key) => { if (cond && !hasPrefix(key)) miss.push(key); };
  need(spec.title && !(L && L.fam === 'closing'), 'title');
  need(spec.sub && spec.kind !== 'divider', 'sub');
  need(spec.eyebrow && spec.kind === 'content', 'eyebrow');
  if (spec.kind === 'agenda') (spec.items || []).forEach((it, i) => need(it.title, 'items.' + i));
  if (spec.kind === 'content') {
    const paras = (spec.blocks || []).filter(b => b.k === 'para');
    (spec.blocks || []).forEach((b, bi) => {
      const B = 'blocks.' + bi;
      if (b.k === 'para') { if (PM.words(b.text) && !hasPrefix(B) && !have.has('lead') && !have.has('text')) miss.push(B); return; }
      if (b.k === 'table' || b.k === 'chart') { if (!hasPrefix(B)) miss.push(B); return; }
      if (b.k === 'quote') { need(true, B + '.text'); need(b.by, B + '.by'); return; }
      if (b.k === 'compare') { need(true, B + '.a'); need(true, B + '.b'); return; }
      (b.items || []).forEach((it, i) => need(true, B + '.items.' + i));
      need(b.head, B + '.head');
    });
    void paras;
  }
  return miss;
};
/* text boxes overlapping each other = a broken layout */
function overlapCount(objs) {
  const ts = objs.filter(o => o.t === 'text' && !o.pageNum);
  let n = 0;
  for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
    const a = ts[i], b = ts[j];
    const ah = Math.min(a.h, a.used || a.h), bh = Math.min(b.h, b.used || b.h);
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + ah, b.y + bh) - Math.max(a.y, b.y);
    if (ox > 2 && oy > 2) n++;
  }
  return n;
}
PM.overlapCount = overlapCount;
/* best layout for a slide: the top candidates are tried and the first that fits cleanly wins */
/* how good a rendered slide reads: body text size, balance, use of space (1 = fine) */
PM.layoutQuality = function (objs, c) {
  const plain = t => PM.plain ? PM.plain(t) : t;
  const body = [];
  let mx = 0, mw = 0, area = 0, full = false;
  for (const o of objs) {
    if (o.hidden || o.role === 'tplbg' || o.role === 'chrome' || o.role === 'veil' || o.pageNum || o.t === 'logo') continue;
    if (o.t === 'image' && o.w > 900 && o.h > 500) { full = true; continue; }
    if (o.w > 900 && o.h > 500) continue;
    let wgt = o.w * o.h;
    if (o.t === 'text') { o.paras.forEach(p => { if (PM.words(plain(p.t)) >= 4) body.push(p.size); }); wgt = o.w * Math.min(o.h, PM.blockH(o.paras, o.w)) * 1.4; }
    else if (o.t === 'rect' || o.t === 'ellipse') wgt *= (o.fill ? 0.35 : 0.08);
    else if (o.t === 'line') wgt = (o.w + o.h) * 2;
    mx += (o.x + o.w / 2) * wgt; mw += wgt;
    if (o.t !== 'line') area += Math.min(o.w * o.h, 900 * 460);
  }
  const minB = body.length ? Math.min(...body) : 16;
  const comfy = c && c.lang === 'en' ? 12.5 : 13.5;
  let q = Math.pow(PM.clamp(minB / comfy, 0.55, 1), 1.6);
  if (!full) { const bal = mw ? Math.abs(mx / mw - 480) / 960 : 0; q *= 1 - Math.min(0.3, Math.max(0, bal - 0.06) * 1.6); const fill = area / (840 * 438); if (fill < 0.2) q *= 0.88; }
  return q;
};
PM.autoLayout = function (spec, c, avoid = []) {
  const cand = PM.candidates(spec, c);
  let best = null;
  for (const { L, s } of cand.slice(0, 14)) {
    const r = PM.renderLayout(L, spec, c);
    if (r.missing && r.missing.length) continue;
    const pen = (r.overflow ? 0.35 : 1) * (avoid.includes(L.fam) ? 0.82 : 1) * (avoid.includes(L.id) ? 0.5 : 1);
    const q = PM.layoutQuality(r.objs, c);
    const sc = s * pen * (0.45 + 0.55 * q);
    if (!best || sc > best.sc) best = { L, sc, r };
    if (!r.overflow && q > 0.97 && s >= cand[0].s * 0.97) break;
  }
  return best;
};
})(window.PM);
