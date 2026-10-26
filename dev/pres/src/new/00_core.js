/* ==========================================================================
   صانع العروض 2 — core
   Units: points on a 960×540 canvas. Every slide is a flat list of objects
   (text, rect, ellipse, line, image, icon, chart, table, logo, grad) that the
   editor moves freely and the writer turns into native PowerPoint shapes.
   ========================================================================== */
window.PM = window.PM || {};
(function (PM) {
'use strict';

const W = 960, H = 540;
PM.W = W; PM.H = H;

/* ---------- brand ---------- */
const K = {
  NAVY: '002657', BLUE: '004EAA', SKY: '62B6F3', WHITE: 'FFFFFF',
  INK: '0E1E36', BODY: '3D4A5C', MUTED: '7A8699', FAINT: 'A9B3C1',
  RULE: 'DDE3EA', RULE2: 'EBEFF4', PALE: 'EEF4FB', PALE2: 'F5F8FC', GREY: 'F3F5F8',
  DEEP: '001A3D', DEEP2: '07244F', SURF_D: '0B3166', RULE_D: '24477A', BODY_D: 'C9D6E8', MUTED_D: '8FA5C4',
  TEAL: '00B2BA', ORANGE: 'FC5C17', PURPLE: '9C12F2'
};
PM.K = K;
/* chart / infographic palette (secondary colours allowed only here) */
PM.CHART_PAL = ['004EAA', '62B6F3', '002657', '00B2BA', 'A9C7E8', '7A8699', 'FC5C17', '9C12F2'];

/* tone = the surface a slide sits on */
function tone(dark, grey) {
  if (dark) return {
    dark: true, bg: K.NAVY, bg2: K.DEEP, surf: K.SURF_D, surf2: '0F3A75', title: K.WHITE, body: K.BODY_D, muted: K.MUTED_D,
    accent: K.SKY, accent2: K.WHITE, num: K.WHITE, numSoft: '2F5A92', rule: K.RULE_D, rule2: '1A3A6B', icon: K.SKY, logo: K.WHITE,
    cardFill: '0C3470', cardText: K.WHITE, hi: K.SKY, hiText: K.NAVY, onHi: K.NAVY, ghost: '123E7B'
  };
  return {
    dark: false, bg: grey ? K.GREY : K.WHITE, bg2: grey ? 'E9EDF2' : K.PALE2, surf: grey ? K.WHITE : K.PALE2, surf2: K.PALE, title: K.NAVY, body: K.BODY, muted: K.MUTED,
    accent: K.BLUE, accent2: K.SKY, num: K.BLUE, numSoft: 'D6E4F4', rule: K.RULE, rule2: K.RULE2, icon: K.BLUE, logo: K.BLUE,
    cardFill: grey ? K.WHITE : K.PALE, cardText: K.NAVY, hi: K.NAVY, hiText: K.WHITE, onHi: K.WHITE, ghost: grey ? 'E2E8EF' : 'EEF2F7'
  };
}
PM.tone = tone;

/* ---------- type ---------- */
const AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const AR_G = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
PM.AR = AR;
PM.isAr = t => AR.test(String(t || ''));
PM.FONT = { ar: 'SanTaj', head: 'SanSeq', body: 'SanFSI', num: 'SanSeq' };
/* type scale per language (Sequel and FS Industrie are wide, Arabic needs more size to read the same) */
const SCALE = {
  ar: { hero: 46, title: 30, sub: 15, eyebrow: 11.5, lead: 18, h: 17, body: 13.5, small: 11.5, kpi: 46, kpiS: 32, num: 30, label: 12.5, quote: 26, cover: 44, divider: 40, cap: 10.5 },
  en: { hero: 40, title: 26, sub: 14, eyebrow: 9.5, lead: 17, h: 15.5, body: 13, small: 11, kpi: 42, kpiS: 30, num: 28, label: 12, quote: 22, cover: 38, divider: 33, cap: 9.5 }
};
PM.SCALE = SCALE;

/* ---------- measuring (canvas, same fonts as the stage) ---------- */
const mc = document.createElement('canvas').getContext('2d');
PM.fontsReady = false;
function fam(p, t) {
  if (p.font === 'num') return PM.FONT.num;
  if (AR.test(t)) return PM.FONT.ar;
  return p.font === 'head' ? PM.FONT.head : PM.FONT.body;
}
PM.fam = fam;
/* digits inside Arabic text are set in Sequel (brand rule: every number in Sequel) */
const NUMRUN = /([0-9٠-٩][0-9٠-٩.,٫٬:%٪+\-/]*[0-9٠-٩%٪+]?|[0-9٠-٩])/g;
function runs(t, p) {
  if (p.font === 'num') {
    // a number with an Arabic word ("12 مليون"): digits in Sequel, the word in Tajawal
    // a unit word next to the figure ("53.3 million", "12 مليون") is set smaller in the text face
    if (!AR.test(t) && !/\d\s*[A-Za-z]{2,}/.test(t)) return [{ t, f: PM.FONT.num, k: 1, num: true }];
    const out = []; let last = 0;
    t.replace(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]*|\s*[A-Za-z]{2,}[A-Za-z²\s]*/g, (m, i) => { if (i > last) out.push({ t: t.slice(last, i), f: PM.FONT.num, k: 1, num: true }); out.push(AR.test(m) ? { t: m, f: PM.FONT.ar, k: 0.62 } : { t: m, f: PM.FONT.body, k: 0.42 }); last = i + m.length; return m; });
    if (last < t.length) out.push({ t: t.slice(last), f: PM.FONT.num, k: 1, num: true });
    return out;
  }
  if (!AR.test(t)) return [{ t, f: fam(p, t), k: 1 }];
  const out = []; let last = 0;
  t.replace(NUMRUN, (m, _, i) => { if (i > last) out.push({ t: t.slice(last, i), f: PM.FONT.ar, k: 1 }); out.push({ t: m, f: PM.FONT.num, k: 0.86, num: true }); last = i + m.length; return m; });
  if (last < t.length) out.push({ t: t.slice(last), f: PM.FONT.ar, k: 1 });
  return out;
}
PM.runs = runs;
function textW(t, p, size) {
  let w = 0;
  for (const r of runs(t, p)) {
    mc.font = `${p.bold && r.f === PM.FONT.ar ? 700 : 400} ${size * r.k}px ${r.f}`;
    let x = mc.measureText(r.t).width;
    if (p.bold && r.f !== PM.FONT.ar) x *= 1.045;
    if (p.track) x += r.t.length * p.track * size;
    w += x;
  }
  return w * 1.015;
}
PM.textW = textW;
/* break a paragraph into lines for a given width */
function wrap(t, p, size, width) {
  const caps = p.caps ? String(t).toUpperCase() : String(t);
  const out = [];
  for (const seg of caps.split('\n')) {
    const words = seg.split(/(\s+)/).filter(x => x.length);
    let cur = '';
    for (const w of words) {
      const test = cur + w;
      if (cur && /\S/.test(w) && textW(test.trimEnd(), p, size) > width) { out.push(cur.trimEnd()); cur = w.trimStart(); }
      else cur = test;
    }
    out.push(cur.trimEnd());
  }
  return out;
}
PM.wrap = wrap;
function longestWordW(t, p, size) { let m = 0; for (const w of String(p.caps ? String(t).toUpperCase() : t).split(/\s+/)) m = Math.max(m, textW(w, p, size)); return m; }

/* paragraph metrics: lh is line height as a multiple of the size (exported as exact points) */
function paraH(p, width, k = 1) {
  const size = p.size * k;
  const ind = p.bullet ? size * 1.25 : 0;
  const lines = wrap(p.t, p, size, Math.max(8, width - ind)).length;
  return lines * size * (p.lh || 1.2) + (p.sb || 0) * k + (p.sa || 0) * k;
}
function blockH(paras, width, k = 1) { let h = 0; paras.forEach((p, i) => { h += paraH(p, width, k) - (i === 0 ? (p.sb || 0) * k : 0); }); return h; }
PM.blockH = blockH;
/* shrink a text block until it fits; returns {k, fits}. Words are never broken mid-way. */
function fitK(paras, w, h, minK = 0.62, maxK = 1) {
  const wordsFit = kk => paras.every(p => longestWordW(p.t, p, p.size * kk) <= w - (p.bullet ? p.size * kk * 1.25 : 0) + 0.5);
  const ok = kk => wordsFit(kk) && blockH(paras, w, kk) <= h + 0.5;
  if (maxK > 1 && ok(1)) {
    // grow into the free space (never beyond maxK)
    let lo = 1, hi = maxK;
    if (ok(hi)) return { k: hi, fits: true };
    for (let i = 0; i < 7; i++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; }
    return { k: Math.floor(lo * 50) / 50, fits: true };
  }
  let k = 1;
  while (k > minK && !ok(k)) k -= 0.02;
  return { k: Math.max(k, minK), fits: ok(Math.max(k, minK)) };
}
PM.fitK = fitK;

/* ---------- object builders ---------- */
let UID = 1;
PM.uid = () => 'o' + (UID++).toString(36) + Math.random().toString(36).slice(2, 5);
/* paragraph */
function P(t, size, o = {}) {
  return { t: String(t == null ? '' : t), size, font: o.font || (o.num ? 'num' : 'auto'), bold: !!o.bold, color: o.color || K.BODY, lh: o.lh || (size >= 24 ? 1.12 : 1.32), sb: o.sb || 0, sa: o.sa || 0, bullet: o.bullet || null, bc: o.bc || null, caps: !!o.caps, track: o.track || 0, al: o.al || null, bind: o.bind || null };
}
PM.P = P;
/* text box: fits itself (shrinks), stores its final sizes so preview = export */
function T(x, y, w, h, paras, o = {}) {
  paras = paras.filter(p => p && String(p.t).trim() !== '' || (p && p.keep));
  const f = o.fit === false ? { k: 1, fits: true } : fitK(paras, w, h, o.minK || 0.62, o.maxK || 1);
  const ps = paras.map(p => Object.assign({}, p, { size: Math.round(p.size * f.k * 4) / 4, sb: (p.sb || 0) * f.k, sa: (p.sa || 0) * f.k }));
  const used = blockH(ps, w);
  return { t: 'text', id: PM.uid(), x, y, w, h, paras: ps, va: o.va || 't', align: o.align || 'start', name: o.name || 'Text', bind: o.bind || null, role: o.role || null, overflow: !f.fits, used, k: f.k, lock: !!o.lock };
}
PM.T = T;
PM.R = (x, y, w, h, fill, o = {}) => ({ t: 'rect', id: PM.uid(), x, y, w, h, fill: fill || null, fa: o.fa == null ? 100 : o.fa, stroke: o.stroke || null, sw: o.sw || 1, r: o.r || 0, grad: o.grad || null, role: o.role || null, lock: !!o.lock, name: o.name || 'Shape' });
PM.E = (x, y, w, h, fill, o = {}) => ({ t: 'ellipse', id: PM.uid(), x, y, w, h, fill: fill || null, fa: o.fa == null ? 100 : o.fa, stroke: o.stroke || null, sw: o.sw || 1, role: o.role || null, lock: !!o.lock, name: o.name || 'Circle' });
PM.Ln = (x, y, w, h, color, o = {}) => ({ t: 'line', id: PM.uid(), x, y, w, h, color: color || K.RULE, sw: o.sw || 1, dash: !!o.dash, role: o.role || null, lock: !!o.lock, name: 'Line' });
PM.Img = (x, y, w, h, src, o = {}) => ({ t: 'image', id: PM.uid(), x, y, w, h, src, fx: o.fx == null ? 0.5 : o.fx, fy: o.fy == null ? 0.5 : o.fy, zoom: o.zoom || 1, r: o.r || 0, slot: o.slot || null, role: o.role || null, lock: !!o.lock, name: 'Photo' });
PM.Ic = (x, y, s, icon, color, o = {}) => ({ t: 'icon', id: PM.uid(), x, y, w: s, h: s, icon, color: color || K.BLUE, sw: o.sw || 1.6, slot: o.slot || null, bind: o.bind || null, role: o.role || null, name: 'Icon' });
PM.Logo = (x, y, w, color, o = {}) => ({ t: 'logo', id: PM.uid(), x, y, w, h: w * 24 / 72.5, color, role: 'chrome', lock: o.lock !== false, name: 'Logo' });
/* gradient veil: colour fading from a0 to a1 alpha in a direction ('down'|'up'|'left'|'right') */
PM.Veil = (x, y, w, h, color, dir, a0, a1, o = {}) => PM.R(x, y, w, h, color, Object.assign({ grad: { dir, a0, a1 }, role: 'veil' }, o));

/* ---------- mirroring: layouts are written left-to-right and flipped for Arabic ---------- */
function mirror(objs) {
  for (const o of objs) {
    if (o.noMirror) continue;
    o.x = W - o.x - o.w;
    if (o.t === 'line' && o.w && o.h) { o.flipH = !o.flipH; }
    if (o.t === 'image') o.fx = o.fx; // photos are never flipped
    if (o.t === 'icon' && o.flipRtl) o.icon = String(o.icon).replace(/right/, '__L').replace(/left/, 'right').replace('__L', 'left');
    if (o.grad) o.grad = Object.assign({}, o.grad, { dir: o.grad.dir === 'left' ? 'right' : o.grad.dir === 'right' ? 'left' : o.grad.dir });
    if (o.t === 'text') { o.dir = 'rtl'; o.paras.forEach(p => { if (p.al === 'l') p.al = 'r'; else if (p.al === 'r') p.al = 'l'; }); }
    if (o.t === 'chart' || o.t === 'table') o.rtl = true;
  }
  return objs;
}
PM.mirror = mirror;

/* ---------- small utils ---------- */
PM.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
PM.pad2 = n => String(n).padStart(2, '0');
PM.clone = o => JSON.parse(JSON.stringify(o));
PM.words = t => String(t || '').trim().split(/\s+/).filter(Boolean).length;
PM.len = t => String(t || '').trim().length;
PM.digits = s => String(s == null ? '' : s).replace(/[٠-٩]/g, c => c.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, c => c.charCodeAt(0) - 0x6F0);
/* "45%", "+380", "SAR 12.5M", "1,250", "٩٨٪" → number info, or null */
PM.numInfo = function (s) {
  const t = PM.digits(s).replace(/٫/g, '.').replace(/[٬،]/g, ',').replace(/٪/g, '%').trim();
  if (!t || t.length > 22) return null;
  if (/\d\s*[-–—/:]\s*\d/.test(t)) return null;
  const m = t.match(/^([+\-~≈<>]?)\s*(SAR|ريال|\$|USD|ر\.س)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(%|K|M|B|k|bn|x|X|مليون|مليار|ألف|الف|million|billion|thousand|mn|m²|m2|sqm|km|m|min|mins|hrs?|sec|م²|كم|دقيقة|دقائق|ساعة|ساعات)?\s*(\+)?\s*(SAR|ريال|ر\.س)?$/);
  if (!m) return null;
  let v = parseFloat(m[3].replace(/,/g, ''));
  if (m[1] === '-') v = -v;
  return { v, pre: (m[1] && m[1] !== '-' ? m[1] : '') + (m[2] ? m[2] + ' ' : ''), suf: (m[4] ? (/^(%|K|M|B|k|x|X)$/.test(m[4]) ? '' : ' ') + m[4] : '') + (m[5] || '') + (m[6] ? ' ' + m[6] : ''), pct: m[4] === '%', unitWord: /^[a-z²؀-ۿ]{2,}/i.test(m[4] || '') && !/^(bn|mn)$/i.test(m[4] || ''), dec: (m[3].split('.')[1] || '').length, raw: s };
};
PM.fmtNum = function (v, info) {
  const d = info && info.dec != null ? info.dec : (Math.abs(v) < 10 && v % 1 ? 1 : 0);
  let s = Math.abs(v) >= 1000 && !(info && /^(19|20)\d\d$/.test(String(info.raw || ''))) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : v.toFixed(d);
  return (info ? info.pre : '') + s + (info ? info.suf : '');
};
PM.esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
PM.hexA = (hex, a) => { const n = parseInt(hex, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
PM.lum = hex => { const n = parseInt(hex, 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };

})(window.PM);
