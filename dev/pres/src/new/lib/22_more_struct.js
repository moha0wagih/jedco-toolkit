/* ==========================================================================
   More layouts · cover · divider · agenda · closing (struct, not mirrored by
   the engine) + photo-led + mixed content.
   Struct layouts are written left-to-right and flipped here once (fin), then
   every object is marked noMirror — the same contract as 15_struct.js
   (language-side logo/text, Arabic right-aligned on the right).
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Ic, G, tx } = PM;

/* ---------- struct helpers ---------- */
const S = (c, x, w) => c.rtl ? W - x - w : x;
const AL = c => c.rtl ? 'r' : 'l';
/* flip an LTR-authored struct slide for Arabic, then lock it against the engine mirror */
function fin(c, o) {
  if (c.rtl) PM.mirror(o);
  o.forEach(q => { q.noMirror = true; if (q.t === 'text' && !c.rtl) q.dir = undefined; });
  return o;
}
const sdef = (fam, kinds) => (id, name, o) => PM.def(fam, id, name, Object.assign({ kinds, noMirror: true, forms: [fam] }, o));
const bgNavy = o => o.push(R(0, 0, W, H, K.NAVY, { role: 'bg', lock: true, name: 'Background' }));
const bgTone = (c, o) => o.push(R(0, 0, W, H, c.tone.bg, { role: 'bg', lock: true, name: 'Background' }));
const bigLogo = (o, col) => o.push(PM.Logo(44, 36, 112, col || K.WHITE));
const smallLogo = (o, col) => o.push(PM.Logo(19, 13, 58, col || K.WHITE));
const edgeBar = (c, o) => o.push(R(0, 84, 15, 399, c.dark ? K.SKY : K.BLUE, { role: 'chrome', lock: true, name: 'Edge bar' }));
const topVeil = (o, h = 130, a = 60) => o.push(PM.Veil(0, 0, W, h, K.NAVY, 'down', a, 0));
const photo = (c, sp, o, x, y, w, h, i = 0, extra = {}) => PM.photoBlock(c, sp, o, x, y, w, h, Object.assign({ i }, extra));
/* the measured height of paragraphs at a width (clamped) */
const hAt = (ps, w, max) => Math.min(max, PM.hOf(ps, w) + 2);

/* cover / closing paragraphs on navy */
function cPs(c, sp, o = {}) {
  const ps = [];
  if (sp.eyebrow && o.eyebrow !== false) ps.push(tx.eyebrow(c, sp.eyebrow, { color: K.SKY, bind: 'eyebrow', al: o.al }));
  const t = o.title != null ? o.title : sp.title;
  if (t) ps.push(tx.title(c, t, { color: K.WHITE, bind: 'title', size: o.size || c.Z.cover, al: o.al }));
  if (sp.sub && o.sub !== false) ps.push(tx.sub(c, sp.sub, { color: K.BODY_D, bind: 'sub', sb: 14, size: o.subSize || c.Z.sub * 1.3, al: o.al }));
  return ps;
}
const subPs = (c, sp, o = {}) => sp.sub ? [tx.sub(c, sp.sub, { color: o.color || K.BODY_D, bind: 'sub', sb: 0, size: o.size || c.Z.sub * 1.3, al: o.al })] : [];

/* ======================= COVER ======================= */
const cover = sdef('cover', ['cover']);
const longT = sp => PM.words(sp.title) > 9;

cover('cvx-band', 'غلاف بشريط صورة وقاعدة كحلية', {
  tags: ['صورة', 'كحلي'],
  accepts: sp => 0.84,
  render(sp, c) {
    const o = []; bgNavy(o);
    const ph = 318;
    photo(c, sp, o, 0, 0, W, ph);
    o.push(PM.Veil(0, ph - 90, W, 90, K.NAVY, 'down', 0, 55));
    topVeil(o); bigLogo(o);
    const hasSub = !!sp.sub;
    const tw = hasSub ? 560 : 820;
    o.push(T(52, ph + 26, tw, H - ph - 56, cPs(c, sp, { sub: false, size: c.Z.cover * 0.92 }), { va: 'm', name: 'Title', minK: 0.55, maxK: 1.2 }));
    if (hasSub) {
      o.push(Ln(52 + tw + 30, ph + 44, 0, H - ph - 92, K.RULE_D, { sw: 0.75 }));
      o.push(T(52 + tw + 60, ph + 26, W - 52 - (52 + tw + 60), H - ph - 56, subPs(c, sp), { va: 'm', name: 'Subtitle' }));
    }
    o.push(R(52, ph - 1.5, 46, 3, K.SKY));
    return fin(c, o);
  }
});
cover('cvx-monument', 'غلاف بعنوان ضخم في المنتصف', {
  tags: ['صورة', 'وسط'],
  accepts: sp => PM.words(sp.title) <= 12 ? 0.83 : 0.6,
  render(sp, c) {
    const o = [];
    photo(c, sp, o, 0, 0, W, H);
    o.push(R(0, 0, W, H, K.NAVY, { fa: 58, role: 'veil' }));
    o.push(PM.Veil(0, 300, W, 240, K.NAVY, 'down', 0, 70));
    bigLogo(o);
    const ps = cPs(c, sp, { al: 'c', size: c.Z.cover * (longT(sp) ? 1 : 1.25) });
    const bw = 760, bh = hAt(ps, bw, 290);
    const y = 290 - bh / 2 + 10;
    o.push(R(W / 2 - 23, y - 26, 46, 3, K.SKY));
    o.push(T((W - bw) / 2, y, bw, bh, ps, { align: 'center', va: 'm', name: 'Title', minK: 0.55 }));
    return fin(c, o);
  }
});
cover('cvx-corner', 'غلاف بكتلة كحلية في الزاوية', {
  tags: ['صورة', 'كحلي'],
  accepts: sp => 0.82,
  render(sp, c) {
    const o = [];
    photo(c, sp, o, 0, 0, W, H);
    topVeil(o, 140, 55);
    const bw = 610, bh = longT(sp) ? 290 : 250;
    o.push(R(0, H - bh, bw, bh, K.NAVY, { fa: 94, name: 'Panel' }));
    o.push(R(52, H - bh, 46, 3, K.SKY));
    bigLogo(o);
    o.push(T(52, H - bh + 30, bw - 100, bh - 64, cPs(c, sp, { size: c.Z.cover * 0.9 }), { va: 'm', name: 'Title', minK: 0.55 }));
    return fin(c, o);
  }
});
cover('cvx-triptych', 'غلاف بثلاث صور', {
  tags: ['صور', 'كحلي'],
  accepts: sp => 0.8,
  render(sp, c) {
    const o = []; bgNavy(o);
    const ph = 300, g = 4, pw = (W - g * 2) / 3;
    for (let i = 0; i < 3; i++) photo(c, sp, o, i * (pw + g), 0, pw, ph, i);
    topVeil(o, 120, 62); bigLogo(o);
    o.push(R(52, ph + 28, 46, 3, K.SKY));
    o.push(T(52, ph + 44, 760, H - ph - 72, cPs(c, sp, { size: c.Z.cover * 0.88 }), { va: 'm', name: 'Title', minK: 0.55 }));
    return fin(c, o);
  }
});
cover('cvx-lower', 'غلاف بعنوان سفلي وخط أساس', {
  tags: ['صورة', 'تحريري'],
  accepts: sp => 0.84,
  render(sp, c) {
    const o = [];
    photo(c, sp, o, 0, 0, W, H);
    o.push(PM.Veil(0, 150, W, H - 150, K.NAVY, 'down', 0, 95));
    topVeil(o, 130, 50); bigLogo(o);
    const hasSub = !!sp.sub, tw = hasSub ? 560 : 800;
    o.push(T(52, 250, tw, 220, cPs(c, sp, { sub: false, size: c.Z.cover * 1.05 }), { va: 'b', name: 'Title', minK: 0.55 }));
    if (hasSub) o.push(T(W - 52 - 250, 290, 250, 180, subPs(c, sp, { color: 'FFFFFF' }), { va: 'b', name: 'Subtitle' }));
    o.push(Ln(52, 492, W - 104, 0, 'FFFFFF', { sw: 0.5 }));
    o.push(R(52, 490.5, 46, 3, K.SKY));
    return fin(c, o);
  }
});
cover('cvx-quarter', 'غلاف بصورة في الربع العلوي', {
  tags: ['صورة', 'كحلي'],
  accepts: sp => 0.8,
  render(sp, c) {
    const o = []; bgNavy(o);
    const pw = 600, ph = 350, px = W - pw;
    photo(c, sp, o, px, 0, pw, ph);
    o.push(PM.Veil(px, 0, 220, ph, K.NAVY, 'right', 100, 0));
    o.push(PM.Veil(px, ph - 120, pw, 120, K.NAVY, 'down', 0, 100));
    bigLogo(o);
    const ps = cPs(c, sp, { size: c.Z.cover * 0.95 }), th = hAt(ps, 640, 230);
    o.push(R(52, 486 - th - 22, 46, 3, K.SKY));
    o.push(T(52, 486 - th, 640, th, ps, { va: 'b', name: 'Title', minK: 0.55 }));
    return fin(c, o);
  }
});
cover('cvx-ribbon', 'غلاف بشريط كحلي عرضي', {
  tags: ['صورة', 'شريط'],
  accepts: sp => 0.8,
  render(sp, c) {
    const o = [];
    photo(c, sp, o, 0, 0, W, H);
    topVeil(o, 140, 55);
    const by = 296, bh = 168;
    o.push(R(0, by, W, bh, K.NAVY, { fa: 92, name: 'Band' }));
    bigLogo(o);
    const hasSub = !!sp.sub, tw = hasSub ? 560 : 820;
    o.push(T(52, by + 22, tw, bh - 44, cPs(c, sp, { sub: false, size: c.Z.cover * 0.85 }), { va: 'm', name: 'Title', minK: 0.5, maxK: 1.25 }));
    if (hasSub) {
      o.push(Ln(52 + tw + 30, by + 34, 0, bh - 68, K.RULE_D, { sw: 0.75 }));
      o.push(T(52 + tw + 60, by + 22, W - 52 - (52 + tw + 60), bh - 44, subPs(c, sp), { va: 'm', name: 'Subtitle' }));
    }
    o.push(R(52, by - 1.5, 46, 3, K.SKY));
    return fin(c, o);
  }
});
cover('cvx-strip', 'غلاف كحلي بشريط صورة سفلي', {
  tags: ['كحلي', 'صورة'],
  accepts: sp => 0.8,
  render(sp, c) {
    const o = []; bgNavy(o);
    o.push(PM.Veil(0, 0, W, 400, K.BLUE, 'down', 0, 45));
    const sy = 402;
    photo(c, sp, o, 0, sy, W, H - sy);
    o.push(PM.Veil(0, sy, W, 40, K.NAVY, 'down', 60, 0));
    bigLogo(o);
    o.push(T(52, 130, 800, 240, cPs(c, sp, { size: c.Z.cover * 1.05 }), { va: 'b', name: 'Title', minK: 0.55 }));
    o.push(R(52, 378, 46, 3, K.SKY));
    return fin(c, o);
  }
});

/* ======================= CLOSING ======================= */
const closing = sdef('closing', ['closing']);
const thanks = (c, sp) => sp.title || (c.en ? 'Thank you' : 'شكراً لكم');
const clSp = (c, sp) => Object.assign({}, sp, { title: thanks(c, sp), eyebrow: '' });
closing('clx-split', 'ختام نصف كحلي ونصف صورة', {
  tags: ['كحلي', 'صورة'],
  accepts: sp => 0.84,
  render(sp, c) {
    const o = []; bgNavy(o);
    const nw = 420;
    photo(c, sp, o, nw, 0, W - nw, H);
    bigLogo(o);
    o.push(R(52, 300, 46, 3, K.SKY));
    o.push(T(52, 318, nw - 100, 170, cPs(c, clSp(c, sp), { size: c.Z.divider * 1.15 }), { va: 't', name: 'Title', minK: 0.55, maxK: 1.25 }));
    return fin(c, o);
  }
});
closing('clx-band', 'ختام بشريط كحلي في الوسط', {
  tags: ['صورة', 'شريط'],
  accepts: sp => 0.82,
  render(sp, c) {
    const o = [];
    photo(c, sp, o, 0, 0, W, H);
    topVeil(o, 140, 55);
    const by = 196, bh = 170;
    o.push(R(0, by, W, bh, K.NAVY, { fa: 92, name: 'Band' }));
    bigLogo(o);
    o.push(T(120, by + 20, 720, bh - 40, cPs(c, clSp(c, sp), { size: c.Z.divider * 1.2, al: 'c' }), { align: 'center', va: 'm', name: 'Title', minK: 0.55, maxK: 1.25 }));
    return fin(c, o);
  }
});
closing('clx-lower', 'ختام بعنوان سفلي وخط أساس', {
  tags: ['صورة', 'تحريري'],
  accepts: sp => 0.83,
  render(sp, c) {
    const o = [];
    photo(c, sp, o, 0, 0, W, H);
    o.push(PM.Veil(0, 150, W, H - 150, K.NAVY, 'down', 0, 95));
    topVeil(o, 130, 50); bigLogo(o);
    const s2 = clSp(c, sp), hasSub = !!sp.sub, tw = hasSub ? 520 : 800;
    o.push(T(52, 300, tw, 170, cPs(c, s2, { sub: false, size: c.Z.divider * 1.35 }), { va: 'b', name: 'Title', minK: 0.55, maxK: 1.25 }));
    if (hasSub) o.push(T(W - 52 - 290, 300, 290, 170, subPs(c, s2, { color: 'FFFFFF' }), { va: 'b', name: 'Subtitle' }));
    o.push(Ln(52, 492, W - 104, 0, 'FFFFFF', { sw: 0.5 }));
    o.push(R(52, 490.5, 46, 3, K.SKY));
    return fin(c, o);
  }
});
closing('clx-triptych', 'ختام بثلاث صور', {
  tags: ['صور', 'كحلي'],
  accepts: sp => 0.8,
  render(sp, c) {
    const o = []; bgNavy(o);
    const ph = 300, g = 4, pw = (W - g * 2) / 3;
    for (let i = 0; i < 3; i++) photo(c, sp, o, i * (pw + g), 0, pw, ph, i);
    topVeil(o, 120, 62); bigLogo(o);
    o.push(R(W / 2 - 23, ph + 30, 46, 3, K.SKY));
    o.push(T(120, ph + 46, 720, H - ph - 76, cPs(c, clSp(c, sp), { size: c.Z.divider * 1.15, al: 'c' }), { align: 'center', va: 'm', name: 'Title', minK: 0.55, maxK: 1.25 }));
    return fin(c, o);
  }
});
closing('clx-strip', 'ختام كحلي بشريط صورة', {
  tags: ['كحلي', 'صورة'],
  accepts: sp => 0.8,
  render(sp, c) {
    const o = []; bgNavy(o);
    o.push(PM.Veil(0, 0, W, 400, K.BLUE, 'down', 0, 45));
    const sy = 402;
    photo(c, sp, o, 0, sy, W, H - sy);
    o.push(PM.Veil(0, sy, W, 40, K.NAVY, 'down', 60, 0));
    bigLogo(o);
    o.push(R(W / 2 - 23, 168, 46, 3, K.SKY));
    o.push(T(120, 186, 720, 190, cPs(c, clSp(c, sp), { size: c.Z.divider * 1.3, al: 'c' }), { align: 'center', va: 'm', name: 'Title', minK: 0.55, maxK: 1.25 }));
    return fin(c, o);
  }
});

/* ======================= DIVIDER (title only + optional eyebrow) ======================= */
const divider = sdef('divider', ['divider']);
function dPs(c, sp, o = {}) {
  const ps = [];
  if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: o.eb || (o.light ? c.tone.accent : K.SKY), al: o.al }));
  ps.push(tx.title(c, sp.title || '', { size: o.size || c.Z.divider, bind: 'title', color: o.color || (o.light ? c.tone.title : K.WHITE), al: o.al }));
  return ps;
}
divider('dvx-center', 'فاصل بعنوان في المنتصف', {
  tags: ['صورة', 'وسط'],
  accepts: sp => 0.84,
  render(sp, c) {
    const o = [];
    photo(c, sp, o, 0, 0, W, H);
    o.push(R(0, 0, W, H, K.NAVY, { fa: 66, role: 'veil' }));
    smallLogo(o);
    const ps = dPs(c, sp, { al: 'c', size: c.Z.divider * (PM.words(sp.title) <= 4 ? 1.6 : 1.3) });
    const bw = 740, bh = hAt(ps, bw, 260);
    const y = 270 - bh / 2 + 8;
    o.push(R(W / 2 - 23, y - 26, 46, 3, K.SKY));
    o.push(T((W - bw) / 2, y, bw, bh, ps, { align: 'center', va: 'm', name: 'Title', minK: 0.55, maxK: 1.3 }));
    return fin(c, o);
  }
});
divider('dvx-band', 'فاصل بشريط صورة علوي', {
  tags: ['صورة', 'شريط'],
  accepts: sp => 0.83,
  render(sp, c) {
    const o = []; bgTone(c, o);
    const ph = 300;
    photo(c, sp, o, 0, 0, W, ph);
    topVeil(o, 90, 50); smallLogo(o);
    o.push(R(64, ph - 1.5, 46, 3, K.SKY));
    o.push(T(64, ph + 30, 780, H - ph - 66, dPs(c, sp, { light: true, size: c.Z.divider * 1.2 }), { va: 'm', name: 'Title', minK: 0.55, maxK: 1.3 }));
    return fin(c, o);
  }
});
divider('dvx-lower', 'فاصل بعنوان سفلي', {
  tags: ['صورة'], tones: ['dark'],
  accepts: sp => 0.83,
  render(sp, c) {
    const o = [];
    photo(c, sp, o, 0, 0, W, H);
    o.push(PM.Veil(0, 160, W, H - 160, K.NAVY, 'down', 0, 94));
    topVeil(o, 90, 45); smallLogo(o);
    o.push(T(64, 250, 760, 222, dPs(c, sp, { size: c.Z.divider * 1.35 }), { va: 'b', name: 'Title', minK: 0.55, maxK: 1.3 }));
    o.push(Ln(64, 494, W - 128, 0, 'FFFFFF', { sw: 0.5 }));
    o.push(R(64, 492.5, 46, 3, K.SKY));
    return fin(c, o);
  }
});
divider('dvx-hsplit', 'فاصل كحلي فوق صورة', {
  tags: ['كحلي', 'صورة'],
  accepts: sp => 0.82,
  render(sp, c) {
    const o = []; bgNavy(o);
    const sy = 290;
    photo(c, sp, o, 0, sy, W, H - sy);
    smallLogo(o);
    o.push(T(64, 70, 780, sy - 112, dPs(c, sp, { size: c.Z.divider * 1.2 }), { va: 'b', name: 'Title', minK: 0.55, maxK: 1.3 }));
    o.push(R(64, sy - 26, 46, 3, K.SKY));
    return fin(c, o);
  }
});
divider('dvx-giant', 'فاصل بعنوان عملاق', {
  tags: ['نظيف', 'تحريري'],
  accepts: sp => PM.words(sp.title) <= 8 ? 0.8 : 0.55,
  render(sp, c) {
    const o = []; bgTone(c, o); edgeBar(c, o); smallLogo(o, c.tone.logo);
    o.push(T(80, 96, 800, 352, dPs(c, sp, { light: true, size: c.Z.divider * 1.7 }), { va: 'b', name: 'Title', minK: 0.5, maxK: 1.1 }));
    o.push(R(80, 470, 90, 4, c.tone.accent));
    o.push(Ln(170, 472, W - 250, 0, c.tone.rule, { sw: 0.75 }));
    return fin(c, o);
  }
});
divider('dvx-line', 'فاصل بخط أفقي ممتد', {
  tags: ['نظيف', 'خطوط'],
  accepts: sp => 0.78,
  render(sp, c) {
    const o = []; bgTone(c, o); smallLogo(o, c.tone.logo);
    const ly = 330;
    o.push(T(80, 120, 780, ly - 150, [tx.title(c, sp.title || '', { size: c.Z.divider * 1.25, bind: 'title', color: c.tone.title })], { va: 'b', name: 'Title', minK: 0.55, maxK: 1.3 }));
    o.push(Ln(0, ly, W, 0, c.tone.rule, { sw: 0.75 }));
    o.push(R(80, ly - 1.5, 70, 3, c.tone.accent));
    if (sp.eyebrow) o.push(T(80, ly + 20, 500, 30, [tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', sa: 0 })], { name: 'Eyebrow' }));
    return fin(c, o);
  }
});
divider('dvx-corner', 'فاصل بصورة في الزاوية', {
  tags: ['صورة', 'نظيف'],
  accepts: sp => PM.words(sp.title) <= 8 ? 0.8 : 0.55,
  render(sp, c) {
    const o = []; bgTone(c, o); edgeBar(c, o); smallLogo(o, c.tone.logo);
    const pw = 520, ph = 290;
    photo(c, sp, o, W - pw, H - ph, pw, ph);
    o.push(T(80, 96, 780, 150, dPs(c, sp, { light: true, size: c.Z.divider * 1.2 }), { va: 'b', name: 'Title', minK: 0.5, maxK: 1.3 }));
    o.push(R(80, 262, 46, 3, c.tone.accent));
    return fin(c, o);
  }
});
divider('dvx-columns', 'فاصل كحلي بثلاث شرائح صور', {
  tags: ['كحلي', 'صور'],
  accepts: sp => 0.8,
  render(sp, c) {
    const o = []; bgNavy(o);
    const x0 = 480, g = 4, pw = (W - x0 - g * 2) / 3;
    for (let i = 0; i < 3; i++) photo(c, sp, o, x0 + i * (pw + g), 0, pw, H, i);
    smallLogo(o);
    o.push(R(64, 196, 46, 3, K.SKY));
    o.push(T(64, 214, x0 - 120, 220, dPs(c, sp, { size: c.Z.divider * 1.1 }), { va: 't', name: 'Title', minK: 0.5, maxK: 1.3 }));
    return fin(c, o);
  }
});

/* ======================= AGENDA ======================= */
const agenda = sdef('agenda', ['agenda']);
const agItems = sp => (sp.items && sp.items.length ? sp.items : []).slice(0, 9);
const agN = sp => agItems(sp).length;
const agTitle = (c, sp) => sp.title || (c.en ? 'Agenda' : 'جدول الأعمال');
const agT = (c, sp, o = {}) => tx.title(c, agTitle(c, sp), { bind: 'title', color: o.color, size: o.size, al: o.al });
const agH = (c, it, i, o = {}) => [tx.h(c, it.title, { size: o.size || c.Z.lead * 0.95, bind: 'items.' + i + '.title', sa: 0, color: o.color })];
/* one text scale for an agenda split into columns */
function agK(c, sp, w, rh, small, numW = 54) {
  const pss = agItems(sp).map((it, i) => agH(c, it, i, { size: c.Z.lead * (small ? 0.85 : 0.98) }));
  return PM.groupK(pss.map(ps => ({ w: w - numW, h: rh - 12, ps })), 1.1);
}
/* numbered rows with hairlines; returns nothing */
function agRows(c, sp, o, x, y, w, h, opt = {}) {
  const items = opt.items || agItems(sp), n = items.length, base = opt.base || 0;
  if (!n) return;
  const rh = Math.min(opt.maxRow || 60, h / n);
  const y0 = y + Math.max(0, (h - rh * n) * (opt.bias == null ? 0.45 : opt.bias));
  const numW = opt.numW || 54;
  const pss = items.map((it, i) => agH(c, it, base + i, { size: c.Z.lead * (opt.small ? 0.85 : 0.98), color: opt.color }));
  const kk = opt.kk || PM.groupK(pss.map(ps => ({ w: w - numW, h: rh - 12, ps })), 1.1);
  items.forEach((it, i) => {
    const yy = y0 + i * rh;
    if (i > 0 || opt.firstRule) o.push(Ln(x, yy, w, 0, opt.rule || c.tone.rule, { sw: 0.75 }));
    if (opt.dots) {
      const d = Math.min(30, rh - 12);
      o.push(E(x, yy + (rh - d) / 2, d, d, opt.dotFill || c.tone.accent, { name: 'Dot' }));
      o.push(T(x, yy + (rh - d) / 2, d, d, [tx.num(c, String(base + i + 1), { size: d * 0.42, color: opt.dotText || K.WHITE, sa: 0, al: 'c' })], { align: 'center', va: 'm', name: 'Number' }));
    } else {
      o.push(T(x, yy + 4, numW - 8, rh - 8, [tx.num(c, PM.pad2(base + i + 1), { size: 15, color: opt.num || K.SKY, sa: 0 })], { va: 'm', name: 'Number' }));
    }
    const h2 = PM.hK(pss[i], w - numW, kk);
    const tb = PM.tk(x + numW, yy + (rh - h2) / 2, w - numW, pss[i], kk, { name: 'Agenda ' + (base + i + 1) }); if (tb) o.push(tb);
  });
}
agenda('agx-grid', 'جدول أعمال بشبكة مرقّمة', {
  tags: ['شبكة'],
  accepts: sp => agN(sp) >= 4 && agN(sp) <= 9 ? 0.84 : 0,
  render(sp, c) {
    const o = []; bgTone(c, o); edgeBar(c, o); smallLogo(o, c.tone.logo);
    o.push(T(64, 70, 800, 60, [agT(c, sp)], { va: 'm', name: 'Title' }));
    const items = agItems(sp), n = items.length;
    const cols = n === 4 ? 2 : 3, rows = Math.ceil(n / cols);
    const top0 = 160, bot = 486, gx = 40, gy = rows === 3 ? 18 : 30;
    const cw = (G.CW - gx * (cols - 1)) / cols, ch0 = (bot - top0 - gy * (rows - 1)) / rows;
    const numH = rows === 3 ? 0 : 46, numW = rows === 3 ? 48 : 0;
    const pss = items.map((it, i) => agH(c, it, i, { size: c.Z.lead * 0.95 }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw - numW, h: ch0 - numH - 22, ps })), 1.25);
    const ch = Math.min(ch0, 16 + numH + Math.max(...pss.map(ps => PM.hK(ps, cw - numW, kk))) + 30);
    const top = PM.place(top0, bot, ch * rows + gy * (rows - 1), 0.42);
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), k = i % cols, x = G.X0 + k * (cw + gx), y = top + r * (ch + gy);
      o.push(Ln(x, y, cw, 0, c.tone.rule, { sw: 0.75 }));
      o.push(R(x, y - 1.5, 30, 3, i === 0 ? c.tone.accent : K.SKY));
      if (numH) {
        o.push(T(x, y + 16, cw, 36, [tx.num(c, PM.pad2(i + 1), { size: 24, color: c.dark ? K.SKY : c.tone.accent, sa: 0 })], { name: 'Number' }));
        const tb = PM.tk(x, y + 16 + numH, cw, pss[i], kk, { name: 'Agenda ' + (i + 1) }); if (tb) o.push(tb);
      } else {
        o.push(T(x, y + 16, numW - 6, 30, [tx.num(c, PM.pad2(i + 1), { size: 16, color: K.SKY, sa: 0 })], { name: 'Number' }));
        const tb = PM.tk(x + numW, y + 16, cw - numW, pss[i], kk, { name: 'Agenda ' + (i + 1) }); if (tb) o.push(tb);
      }
    });
    return fin(c, o);
  }
});
agenda('agx-photo', 'جدول أعمال + صورة جانبية كاملة', {
  tags: ['صورة'],
  accepts: sp => agN(sp) >= 3 && agN(sp) <= 9 ? 0.84 : 0,
  render(sp, c) {
    const o = []; bgTone(c, o); edgeBar(c, o); smallLogo(o, c.tone.logo);
    const pw = 350;
    photo(c, sp, o, W - pw, 0, pw, H);
    const w = W - pw - 64 - 56;
    o.push(T(64, 64, w, 70, [agT(c, sp)], { va: 'm', name: 'Title' }));
    agRows(c, sp, o, 64, 156, w, 330, { small: agN(sp) > 6, maxRow: 62, bias: 0.3, firstRule: true });
    return fin(c, o);
  }
});
agenda('agx-banner', 'جدول أعمال بشريط صورة علوي', {
  tags: ['صورة', 'شريط'],
  accepts: sp => agN(sp) >= 3 && agN(sp) <= 9 ? 0.82 : 0,
  render(sp, c) {
    const o = []; bgTone(c, o);
    const bh = 170;
    photo(c, sp, o, 0, 0, W, bh);
    o.push(PM.Veil(0, 0, W, bh, K.NAVY, 'right', 92, 25));
    smallLogo(o);
    o.push(T(64, 70, 700, bh - 92, [agT(c, sp, { color: K.WHITE, size: c.Z.title * 1.15 })], { va: 'b', name: 'Title' }));
    const items = agItems(sp), n = items.length;
    const top = bh + 28, bot = 494;
    if (n <= 4) agRows(c, sp, o, 64, top, G.CW, bot - top, { maxRow: 66, bias: 0.3 });
    else {
      const per = Math.ceil(n / 2), gx = 50, cw = (G.CW - gx) / 2, rh = Math.min(64, (bot - top) / per);
      const kk = agK(c, sp, cw, rh, n > 6);
      agRows(c, sp, o, 64, top, cw, rh * per, { items: items.slice(0, per), small: n > 6, maxRow: rh, bias: 0, kk });
      agRows(c, sp, o, 64 + cw + gx, top, cw, rh * per, { items: items.slice(per), base: per, small: n > 6, maxRow: rh, bias: 0, kk });
    }
    return fin(c, o);
  }
});
agenda('agx-line', 'جدول أعمال على خط زمني', {
  tags: ['خط', 'أفقي'],
  accepts: sp => agN(sp) >= 3 && agN(sp) <= 6 ? 0.82 : 0,
  render(sp, c) {
    const o = []; bgTone(c, o); edgeBar(c, o); smallLogo(o, c.tone.logo);
    o.push(T(64, 70, 800, 60, [agT(c, sp)], { va: 'm', name: 'Title' }));
    const items = agItems(sp), n = items.length;
    const gx = 24, cw = (G.CW - gx * (n - 1)) / n, d = 38;
    const pss = items.map((it, i) => agH(c, it, i, { size: c.Z.lead * (n > 4 ? 0.88 : 0.98) }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: 170, ps })), 1.3);
    const bh = d + 22 + Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const ly = PM.place(170, 480, bh, 0.42) + d / 2;
    o.push(Ln(G.X0, ly, G.CW, 0, c.tone.rule, { sw: 1 }));
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(E(x, ly - d / 2, d, d, i === 0 ? c.tone.accent : (c.dark ? K.BLUE : K.NAVY), { name: 'Dot' }));
      o.push(T(x, ly - d / 2, d, d, [tx.num(c, String(i + 1), { size: 15, color: K.WHITE, sa: 0, al: 'c' })], { align: 'center', va: 'm', name: 'Number' }));
      const tb = PM.tk(x, ly + d / 2 + 22, cw, pss[i], kk, { name: 'Agenda ' + (i + 1) }); if (tb) o.push(tb);
    });
    return fin(c, o);
  }
});
agenda('agx-cards', 'جدول أعمال ببطاقات', {
  tags: ['بطاقات'],
  accepts: sp => agN(sp) >= 3 && agN(sp) <= 9 ? 0.8 : 0,
  render(sp, c) {
    const o = []; bgTone(c, o); edgeBar(c, o); smallLogo(o, c.tone.logo);
    o.push(T(64, 70, 800, 60, [agT(c, sp)], { va: 'm', name: 'Title' }));
    const items = agItems(sp), n = items.length;
    const cols = n <= 4 ? n : n <= 6 ? 3 : n === 9 ? 3 : 4, rows = Math.ceil(n / cols);
    const top = 160, bot = 488, g = 16;
    const cw = (G.CW - g * (cols - 1)) / cols, ch = (bot - top - g * (rows - 1)) / rows;
    const pad = 20, numH = rows >= 3 ? 26 : 40;
    const pss = items.map((it, i) => agH(c, it, i, { size: c.Z.lead * 0.92 }));
    const kk = PM.groupK(pss.map(ps => ({ w: cw - pad * 2, h: ch - pad * 2 - numH, ps })), 1.1);
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), k = i % cols;
      const inRow = r === rows - 1 ? n - r * cols : cols;
      const off = (cols - inRow) * (cw + g) / 2;
      const x = G.X0 + off + k * (cw + g), y = top + r * (ch + g);
      o.push(R(x, y, cw, ch, i === 0 ? (c.dark ? K.BLUE : K.NAVY) : c.tone.cardFill, { r: 14, name: 'Card' }));
      o.push(T(x + pad, y + pad - 4, cw - pad * 2, numH, [tx.num(c, PM.pad2(i + 1), { size: rows >= 3 ? 15 : 20, color: K.SKY, sa: 0 })], { name: 'Number' }));
      const p2 = i === 0 ? pss[i].map(p => Object.assign({}, p, { color: K.WHITE })) : pss[i];
      const h2 = PM.hK(p2, cw - pad * 2, kk);
      const tb = PM.tk(x + pad, y + ch - pad - h2, cw - pad * 2, p2, kk, { name: 'Agenda ' + (i + 1) }); if (tb) o.push(tb);
    });
    return fin(c, o);
  }
});
agenda('agx-dots', 'جدول أعمال بعنوان جانبي ونقاط مرقّمة', {
  tags: ['جانبي', 'أرقام'],
  accepts: sp => agN(sp) >= 3 && agN(sp) <= 9 ? 0.8 : 0,
  render(sp, c) {
    const o = []; bgTone(c, o); edgeBar(c, o); smallLogo(o, c.tone.logo);
    const lw = 290;
    o.push(T(64, 96, lw - 30, 330, [agT(c, sp, { size: c.Z.divider * 1.15 })], { va: 'b', name: 'Title', minK: 0.55 }));
    o.push(R(64, 444, 46, 3, c.tone.accent));
    o.push(Ln(64 + lw, 84, 0, 399, c.tone.rule, { sw: 0.75 }));
    const x = 64 + lw + 44, w = G.X1 - x;
    agRows(c, sp, o, x, 70, w, 420, { dots: true, numW: 52, small: agN(sp) > 6, maxRow: 66, dotFill: c.dark ? K.SKY : K.NAVY, dotText: c.dark ? K.NAVY : K.WHITE });
    return fin(c, o);
  }
});
agenda('agx-navy', 'جدول أعمال كحلي بعمودين', {
  tags: ['كحلي', 'عمودين'],
  accepts: sp => agN(sp) >= 4 && agN(sp) <= 9 ? 0.8 : 0,
  render(sp, c) {
    const o = []; bgNavy(o);
    o.push(PM.Veil(0, 0, W, H, K.BLUE, 'up', 40, 0));
    smallLogo(o);
    o.push(T(64, 72, 800, 60, [agT(c, sp, { color: K.WHITE })], { va: 'm', name: 'Title' }));
    o.push(R(64, 146, 46, 3, K.SKY));
    const items = agItems(sp), n = items.length, per = Math.ceil(n / 2), gx = 60, cw = (G.CW - gx) / 2;
    const top = 176, rh = Math.min(74, (480 - top) / per);
    const opt = { color: K.WHITE, rule: K.RULE_D, maxRow: rh, bias: 0, small: n > 6, numW: 60, kk: agK(c, sp, cw, rh, n > 6, 60) };
    agRows(c, sp, o, 64, top, cw, rh * per, Object.assign({ items: items.slice(0, per) }, opt));
    agRows(c, sp, o, 64 + cw + gx, top, cw, rh * per, Object.assign({ items: items.slice(per), base: per }, opt));
    return fin(c, o);
  }
});

/* ======================= PHOTO-LED (mirrored by the engine) ======================= */
const phdef = (id, name, o) => PM.def('photo', id, name, Object.assign({ forms: ['photo'] }, o));
/* photo slide with at most a short paragraph */
const phText = sp => sp.form === 'para' ? sp.text : '';
const isPhoto = (sp, maxW = 45) => !sp.others.length && (sp.form === 'photo' || (sp.form === 'para' && sp.textWords <= maxW && sp.imgs.length >= 1));
const bodyP = (c, sp, o = {}) => phText(sp) ? [tx.body(c, phText(sp), Object.assign({ bind: 'text', size: c.Z.body * 1.12, lh: 1.55 }, o))] : [];
const subP = (c, sp, o = {}) => sp.sub ? [tx.sub(c, sp.sub, Object.assign({ bind: 'sub', sb: 0 }, o))] : [];
const headPs = (c, sp, o = {}) => {
  const ps = [];
  if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: o.eb }));
  if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title', color: o.color, size: o.size }));
  return ps;
};
const imgScore = (sp, base) => base + Math.min(0.06, sp.imgs.length * 0.03);

phdef('phx-caption', 'صورة كبيرة بشريط تعليق سفلي', {
  tags: ['صورة', 'تعليق'],
  accepts: sp => isPhoto(sp, 40) && PM.len(sp.title) < 80 ? imgScore(sp, 0.84) : 0,
  render(sp, c) {
    const o = [];
    const by = 392;
    o.push(R(0, 0, W, H, c.tone.bg, { role: 'bg', lock: true, name: 'Background' }));
    PM.photoBlock(c, sp, o, 0, 0, W, by, {});
    o.push(PM.Veil(0, 0, W, 90, K.NAVY, 'down', 45, 0));
    PM.chromeOnPhoto(c, o, { pageColor: c.tone.muted });
    const right = [...subP(c, sp, { color: c.tone.body }), ...bodyP(c, sp, { size: c.Z.body * 1.02 })];
    const tw = right.length ? 400 : G.CW;
    o.push(T(G.X0, by + 18, tw, 86, headPs(c, sp, {}), { va: 'm', name: 'Title', minK: 0.55, maxK: 1.2 }));
    if (right.length) {
      o.push(Ln(G.X0 + tw + 26, by + 26, 0, 72, c.tone.rule, { sw: 0.75 }));
      o.push(T(G.X0 + tw + 52, by + 18, G.CW - tw - 52, 86, right, { va: 'm', name: 'Caption', minK: 0.6, maxK: 1.3 }));
    }
    o.push(R(G.X0, by - 1.5, 46, 3, K.SKY));
    return o;
  }
});
phdef('phx-three', 'صورة + ثلاث تعليقات قصيرة', {
  tags: ['صورة', 'بنود'],
  accepts: sp => sp.imgs.length >= 1 && (sp.form === 'items' || sp.form === 'steps') && !sp.others.length && !sp.lead && sp.n >= 2 && sp.n <= 4 && sp.maxItemWords <= 14 && !sp.hasBullets ? 0.86 : 0,
  render(sp, c) {
    const o = [];
    const ph = 290;
    o.push(R(0, 0, W, H, c.tone.bg, { role: 'bg', lock: true, name: 'Background' }));
    PM.photoBlock(c, sp, o, 0, 0, W, ph, {});
    o.push(PM.Veil(0, 90, W, ph - 90, K.NAVY, 'down', 0, 88));
    o.push(PM.Veil(0, 0, W, 80, K.NAVY, 'down', 45, 0));
    PM.chromeOnPhoto(c, o, { pageColor: c.tone.muted });
    const hp = headPs(c, sp, { color: K.WHITE, eb: K.SKY });
    if (sp.sub) hp.push(tx.sub(c, sp.sub, { bind: 'sub', color: K.BODY_D }));
    o.push(T(G.X0, 110, 720, ph - 132, hp, { va: 'b', name: 'Title', minK: 0.6 }));
    const items = PM.its(sp), n = items.length, gx = 40, cw = (G.CW - gx * (n - 1)) / n;
    const top = ph + 30;
    const pss = items.map((it, i) => PM.ips(c, it, i, {}));
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: G.BOT - top - 34, ps })), 1.35);
    const bh = 34 + Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
    const y0 = PM.place(top, G.BOT, bh, 0.4);
    items.forEach((it, i) => {
      const x = G.X0 + i * (cw + gx);
      o.push(T(x, y0, 60, 24, [tx.num(c, PM.pad2(i + 1), { size: 14, color: K.SKY, sa: 0 })], { name: 'Number' }));
      if (i > 0) o.push(Ln(x - gx / 2, y0, 0, bh, c.tone.rule, { sw: 0.75 }));
      const tb = PM.tk(x, y0 + 34, cw, pss[i], kk, { name: 'Caption ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});
phdef('phx-diptych', 'صورتان متجاورتان بشريط عنوان', {
  tags: ['صور', 'ثنائي'],
  accepts: sp => sp.imgs.length >= 2 && isPhoto(sp, 30) ? 0.86 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o, { noBar: true });
    const right = [...subP(c, sp, { color: c.tone.body }), ...bodyP(c, sp, { size: c.Z.body })];
    const tw = right.length ? 440 : G.CW;
    const hp = headPs(c, sp);
    const th = hAt(hp, tw, 120);
    const rh = right.length ? hAt(right, G.CW - tw - 40, 120) : 0;
    const bandH = Math.max(th, rh, 40);
    o.push(T(G.X0, 64, tw, bandH, hp, { va: 'b', name: 'Title', minK: 0.6 }));
    if (right.length) o.push(T(G.X0 + tw + 40, 64, G.CW - tw - 40, bandH, right, { va: 'b', name: 'Caption', minK: 0.6, maxK: 1.3 }));
    const py = 64 + bandH + 26, g = 6, pw = (W - g) / 2;
    PM.photoBlock(c, sp, o, 0, py, pw, H - py, { i: 0 });
    PM.photoBlock(c, sp, o, pw + g, py, pw, H - py, { i: 1 });
    o.push(PM.Veil(0, H - 60, W, 60, K.NAVY, 'down', 0, 45));
    o.forEach(q => { if (q.pageNum) { q.paras.forEach(p => { p.color = 'FFFFFF'; }); o.push(o.splice(o.indexOf(q), 1)[0]); } });
    return o;
  }
});
phdef('phx-mosaic', 'صورة رئيسية + فسيفساء صور', {
  tags: ['صور', 'شبكة'],
  accepts: sp => sp.imgs.length >= 3 && isPhoto(sp, 30) ? 0.87 : 0,
  render(sp, c) {
    const o = [];
    o.push(R(0, 0, W, H, c.tone.bg, { role: 'bg', lock: true, name: 'Background' }));
    const hw = 470;
    PM.photoBlock(c, sp, o, 0, 0, hw, H, { i: 0 });
    o.push(PM.Veil(0, 0, hw, 90, K.NAVY, 'down', 45, 0));
    PM.chromeOnPhoto(c, o);
    const x = hw + 44, w = G.X1 - x;
    const hp = headPs(c, sp);
    if (sp.sub) hp.push(tx.sub(c, sp.sub, { bind: 'sub' }));
    hp.push(...bodyP(c, sp, { sb: 8, size: c.Z.body }));
    const th = hAt(hp, w, 170);
    o.push(T(x, 60, w, th, hp, { name: 'Title', minK: 0.6 }));
    const top = 60 + th + 24, bot = 494, g = 10, rest = Math.min(3, sp.imgs.length - 1);
    const ah = bot - top;
    if (rest === 2) { const tw2 = (w - g) / 2; for (let i = 0; i < 2; i++) PM.photoBlock(c, sp, o, x + i * (tw2 + g), top, tw2, ah, { i: i + 1, r: 12 }); }
    else {
      const h1 = (ah - g) * 0.55, h2 = ah - g - h1, tw2 = (w - g) / 2;
      PM.photoBlock(c, sp, o, x, top, w, h1, { i: 1, r: 12 });
      for (let i = 0; i < 2; i++) PM.photoBlock(c, sp, o, x + i * (tw2 + g), top + h1 + g, tw2, h2, { i: i + 2, r: 12 });
    }
    return o;
  }
});
phdef('phx-statement', 'صورة كاملة بعبارة كبيرة في المنتصف', {
  tags: ['صورة', 'عبارة'], tones: ['dark'],
  accepts: sp => isPhoto(sp, 34) && PM.len(sp.title) < 90 ? imgScore(sp, 0.82) : 0,
  render(sp, c) {
    const o = [];
    PM.photoBlock(c, sp, o, 0, 0, W, H, {});
    o.push(R(0, 0, W, H, K.NAVY, { fa: 64, role: 'veil' }));
    PM.chromeOnPhoto(c, o);
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: K.SKY, al: 'c' }));
    if (sp.title) ps.push(tx.title(c, sp.title, { bind: 'title', color: K.WHITE, size: c.Z.title * 1.45, al: 'c' }));
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub', color: K.BODY_D, al: 'c', sb: 14 }));
    if (phText(sp)) ps.push(tx.body(c, phText(sp), { bind: 'text', color: K.BODY_D, al: 'c', sb: 14, size: c.Z.body * 1.15, lh: 1.55 }));
    const bw = 720, bh = hAt(ps, bw, 330);
    const y = 280 - bh / 2;
    o.push(R(W / 2 - 23, y - 26, 46, 3, K.SKY));
    o.push(T((W - bw) / 2, y, bw, bh, ps, { align: 'center', va: 'm', name: 'Statement', minK: 0.6 }));
    return o;
  }
});
phdef('phx-panorama', 'عنوان + صورة بانورامية حتى الحافة', {
  tags: ['صورة', 'بانوراما'],
  accepts: sp => isPhoto(sp, 34) ? imgScore(sp, 0.8) : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o, { noBar: true });
    const right = [...subP(c, sp, { color: c.tone.body }), ...bodyP(c, sp, { size: c.Z.body })];
    const tw = right.length ? 420 : G.CW;
    const hp = headPs(c, sp);
    const bandH = Math.max(hAt(hp, tw, 130), right.length ? hAt(right, G.CW - tw - 56, 130) : 0, 40);
    o.push(T(G.X0, 66, tw, bandH, hp, { va: 't', name: 'Title', minK: 0.6 }));
    if (right.length) {
      o.push(Ln(G.X0 + tw + 28, 70, 0, bandH - 6, c.tone.rule, { sw: 0.75 }));
      o.push(T(G.X0 + tw + 56, 66, G.CW - tw - 56, bandH, right, { va: 't', name: 'Caption', minK: 0.6, maxK: 1.3 }));
    }
    const py = Math.max(66 + bandH + 30, 190);
    PM.photoBlock(c, sp, o, 0, py, W, H - py, {});
    o.push(PM.Veil(0, H - 60, W, 60, K.NAVY, 'down', 0, 45));
    o.forEach(q => { if (q.pageNum) { q.paras.forEach(p => { p.color = 'FFFFFF'; }); o.push(o.splice(o.indexOf(q), 1)[0]); } });
    return o;
  }
});
phdef('phx-quad', 'نص + شبكة صور حتى الحافة', {
  tags: ['صور', 'شبكة'],
  accepts: sp => sp.imgs.length >= 3 && isPhoto(sp, 45) ? 0.84 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const x0 = 470, g = 4, n = Math.min(4, sp.imgs.length);
    const cw = (W - x0 - g) / 2, rh = (H - g) / 2;
    if (n >= 4) for (let i = 0; i < 4; i++) PM.photoBlock(c, sp, o, x0 + (i % 2) * (cw + g), Math.floor(i / 2) * (rh + g), cw, rh, { i });
    else { PM.photoBlock(c, sp, o, x0, 0, cw, H, { i: 0 }); for (let i = 0; i < 2; i++) PM.photoBlock(c, sp, o, x0 + cw + g, i * (rh + g), cw, rh, { i: i + 1 }); }
    const ps = headPs(c, sp, { size: c.Z.title * 1.1 });
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub', sb: 10 }));
    if (phText(sp)) ps.push(tx.body(c, phText(sp), { bind: 'text', sb: 16, size: c.Z.body * 1.12, lh: 1.55 }));
    o.push(T(G.X0, 90, x0 - G.X0 - 50, 390, ps, { va: 'm', name: 'Text', minK: 0.6, maxK: 1.35 }));
    return o;
  }
});
phdef('phx-trio', 'ثلاث شرائح صور + عنوان سفلي', {
  tags: ['صور', 'سينمائي'], tones: ['dark'],
  accepts: sp => sp.imgs.length >= 3 && isPhoto(sp, 30) && PM.len(sp.title) < 80 ? 0.84 : 0,
  render(sp, c) {
    const o = [];
    o.push(R(0, 0, W, H, K.NAVY, { role: 'bg', lock: true, name: 'Background' }));
    const g = 4, pw = (W - g * 2) / 3;
    for (let i = 0; i < 3; i++) PM.photoBlock(c, sp, o, i * (pw + g), 0, pw, H, { i });
    o.push(PM.Veil(0, 200, W, H - 200, K.NAVY, 'down', 0, 94));
    o.push(PM.Veil(0, 0, W, 90, K.NAVY, 'down', 45, 0));
    PM.chromeOnPhoto(c, o);
    const ps = headPs(c, sp, { color: K.WHITE, eb: K.SKY, size: c.Z.title * 1.2 });
    const right = [...subP(c, sp, { color: K.BODY_D }), ...bodyP(c, sp, { color: K.BODY_D, size: c.Z.body })];
    const tw = right.length ? 470 : 760;
    o.push(T(G.X0, 300, tw, 180, ps, { va: 'b', name: 'Title', minK: 0.6 }));
    if (right.length) o.push(T(G.X0 + tw + 50, 300, G.CW - tw - 50, 180, right, { va: 'b', name: 'Caption', minK: 0.6, maxK: 1.3 }));
    o.push(R(G.X0, 486, 46, 3, K.SKY));
    return o;
  }
});

/* ======================= MIXED CONTENT (mirrored by the engine) ======================= */
const cBlocks = sp => sp.blocks.filter(b => !(b.k === 'para' && !PM.words(b.text)));
const mxdef = (id, name, o) => PM.def('mix', id, name, Object.assign({ forms: ['mix'] }, o));
const isMx = (sp, a = 2, b = 3) => sp.kind === 'content' && cBlocks(sp).length >= a && cBlocks(sp).length <= b;
const wt = b => Math.max(0.25, PM.blockWeight(b));
const bIdx = (sp, b) => sp.blocks.indexOf(b);
const isChartB = b => b.k === 'chart' || (b.k === 'table' && b.chartable);
const isKpiB = b => b.k === 'kpis';
const firstPara = sp => cBlocks(sp).find(b => b.k === 'para');
const others = (sp, b) => cBlocks(sp).filter(x => x !== b);
const noHeavy = bs => bs.every(b => !['table', 'chart', 'compare', 'quote'].includes(b.k));
/* render a block offscreen, return {objs, h} */
function boxM(c, sp, b, x, y, w, h, opt) {
  if (isKpiB(b) && !b.head && b.items.length <= 4) {
    const t = [], n = b.items.length;
    const hz = w / n >= 170;
    const u = hz ? kpiStrip(c, sp, b, t, x, y, w, h, { ns: n <= 3 ? c.Z.kpi : c.Z.kpiS * 1.1 }) : kpiCol(c, sp, b, t, x, y, w, h);
    return { objs: t, h: Math.min(h, u) };
  }
  const t = []; const u = PM.blockBox(c, sp, b, t, x, y, w, h, Object.assign({ maxK: 1.45 }, opt || {})); return { objs: t, h: Math.min(h, Math.max(u, 10)) }; }
const shift = (objs, dy) => { objs.forEach(q => { q.y += dy; }); return objs; };
/* stack blocks in [top, bot], weighted heights, hairlines between, vertically balanced */
function stack(c, sp, bs, o, x, top, w, bot, opt = {}) {
  const gap = opt.gap || 30;
  const avail = bot - top - gap * (bs.length - 1);
  const tot = bs.reduce((a, b) => a + wt(b), 0);
  const parts = bs.map(b => boxM(c, sp, b, x, 0, w, avail * wt(b) / tot, opt));
  const total = parts.reduce((a, p) => a + p.h, 0) + gap * (bs.length - 1);
  let y = PM.place(top, bot, total, opt.bias == null ? 0.42 : opt.bias);
  parts.forEach((p, i) => {
    if (i > 0) o.push(Ln(x, y - gap / 2, w, 0, c.tone.rule, { sw: 0.75 }));
    o.push(...shift(p.objs, y));
    y += p.h + gap;
  });
}
/* a big KPI strip: numbers in Sequel, vertical hairlines; returns height */
function kpiStrip(c, sp, b, o, x, y, w, maxH, opt = {}) {
  const B = 'blocks.' + bIdx(sp, b) + '.';
  const ks = b.items, n = ks.length, gx = opt.gx || 36, cw = (w - gx * (n - 1)) / n;
  const pss = ks.map((kv, i) => [tx.num(c, kv.value, { size: opt.ns || (n <= 3 ? c.Z.kpi : c.Z.kpiS), bind: B + 'items.' + i + '.value', sa: 6, color: opt.nc }), tx.label(c, kv.label || kv.title || '', { size: c.Z.label * 1.15, bind: B + 'items.' + i + '.label', color: opt.lc })]);
  const kk = PM.groupK(pss.map(ps => ({ w: cw, h: maxH, ps })), 1.1);
  const bh = Math.max(...pss.map(ps => PM.hK(ps, cw, kk)));
  ks.forEach((kv, i) => {
    const xx = x + i * (cw + gx);
    if (i) o.push(Ln(xx - gx / 2, y, 0, bh, opt.rule || c.tone.rule, { sw: 0.75 }));
    const tb = PM.tk(xx, y, cw, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
  });
  return bh;
}
/* KPIs stacked in a column with hairlines between; returns height */
function kpiCol(c, sp, b, o, x, y, w, maxH) {
  const B = 'blocks.' + bIdx(sp, b) + '.', n = b.items.length, gap = 14;
  const pss = b.items.map((kv, i) => [tx.num(c, kv.value, { size: c.Z.kpiS * 1.1, bind: B + 'items.' + i + '.value', sa: 3 }), tx.label(c, kv.label || kv.title || '', { size: c.Z.label * 1.1, bind: B + 'items.' + i + '.label' })]);
  const kk = PM.groupK(pss.map(ps => ({ w, h: (maxH - gap * 2 * (n - 1)) / n, ps })), 1.15);
  let yy = y;
  pss.forEach((ps, i) => {
    if (i) { o.push(Ln(x, yy + gap - 0.5, Math.min(w, 200), 0, c.tone.rule, { sw: 0.75 })); yy += gap * 2; }
    const tb = PM.tk(x, yy, w, ps, kk, { name: 'Number ' + (i + 1) }); if (tb) { o.push(tb); yy += tb.h; }
  });
  return yy - y;
}
/* the paragraph block as a large intro */
function paraBig(c, sp, b, o = {}) {
  return [tx.body(c, b.text, { bind: 'blocks.' + bIdx(sp, b) + '.text', size: o.size || c.Z.lead * 0.92, color: o.color || c.tone.title, lh: 1.5 })];
}

/* 1 · lead paragraph as a large intro column + structured blocks */
mxdef('mx-intro', 'مقدمة كبيرة + محتوى منظم', {
  tags: ['مختلط', 'مقدمة'],
  accepts: sp => { if (!isMx(sp)) return 0; const p = firstPara(sp); if (!p) return 0; const rest = others(sp, p); return rest.length && PM.words(p.text) <= 60 && rest.every(b => b.k !== 'para') && rest.reduce((a, b) => a + PM.blockWeight(b), 0) <= 1.1 ? 0.85 : 0; },
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const lw = 330;
    const top = PM.head(c, sp, o, { w: lw }) + 22;
    const p = firstPara(sp);
    const ps = paraBig(c, sp, p);
    const k = PM.groupK([{ w: lw, h: G.BOT - top - 10, ps }], 1.1);
    const tb = PM.tk(G.X0, top + 6, lw, ps, k, { name: 'Intro' }); if (tb) o.push(tb);
    o.push(R(G.X0, top - 6, 36, 3, K.SKY));
    const rx = G.X0 + lw + 64, rw = G.X1 - rx;
    o.push(Ln(rx - 32, G.TOP + 8, 0, G.BOT - G.TOP - 8, c.tone.rule, { sw: 0.75 }));
    stack(c, sp, others(sp, p), o, rx, G.TOP + 14, rw, G.BOT, { icons: false, chart: true });
    return o;
  }
});
/* 2 · KPI strip on top + one block below */
mxdef('mx-kpi-top', 'شريط أرقام علوي + محتوى', {
  tags: ['مختلط', 'أرقام'],
  accepts: sp => { if (!isMx(sp, 2, 2)) return 0; const bs = cBlocks(sp), kb = bs.find(isKpiB); if (!kb || kb.items.length > 4) return 0; const ot = bs.find(b => b !== kb); return ['items', 'steps', 'bullets', 'para'].includes(ot.k) && PM.blockWeight(ot) <= 0.9 ? 0.86 : 0; },
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 28;
    const bs = cBlocks(sp), kb = bs.find(isKpiB), ot = bs.find(b => b !== kb);
    o.push(Ln(G.X0, top, G.CW, 0, c.tone.rule, { sw: 0.75 }));
    o.push(R(G.X0, top - 1.5, 46, 3, K.SKY));
    const kh = kpiStrip(c, sp, kb, o, G.X0, top + 22, G.CW, 110);
    const y2 = top + 22 + kh + 26;
    o.push(Ln(G.X0, y2, G.CW, 0, c.tone.rule, { sw: 0.75 }));
    if (ot.k === 'para') {
      const ps = paraBig(c, sp, ot, { size: c.Z.lead });
      const k = PM.groupK([{ w: 720, h: G.BOT - y2 - 40, ps }], 1.1);
      const ph = PM.hK(ps, 720, k);
      const tb = PM.tk(G.X0, PM.place(y2 + 28, G.BOT, ph, 0.4), 720, ps, k, { name: 'Text' }); if (tb) o.push(tb);
    } else {
      const p = boxM(c, sp, ot, G.X0, 0, G.CW, G.BOT - y2 - 28, {});
      o.push(...shift(p.objs, PM.place(y2 + 28, G.BOT, p.h, 0.35)));
    }
    return o;
  }
});
/* 3 · text blocks + chart on a tinted data panel touching the slide edge */
mxdef('mx-chart-panel', 'محتوى + رسم بياني على لوحة حتى الحافة', {
  tags: ['مختلط', 'رسم بياني'],
  accepts: sp => { if (!isMx(sp)) return 0; const bs = cBlocks(sp), ch = bs.filter(isChartB); return ch.length === 1 && others(sp, ch[0]).every(b => !isChartB(b) && b.k !== 'table') && others(sp, ch[0]).reduce((a, b) => a + PM.blockWeight(b), 0) <= 0.9 ? 0.87 : 0; },
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const px = 480;
    o.push(R(px, 0, W - px, H, c.tone.cardFill, { name: 'Data panel' }));
    const lw = px - G.X0 - 44;
    const top = PM.head(c, sp, o, { w: lw }) + 26;
    const bs = cBlocks(sp), cb = bs.find(isChartB);
    stack(c, sp, others(sp, cb), o, G.X0, top, lw, G.BOT, { icons: false, bias: 0.4 });
    const B = 'blocks.' + bIdx(sp, cb) + '.';
    const ch = cb.chart || cb.chartable;
    let cy = 70;
    if (cb.head) { const hb = PM.textAt(px + 40, cy, W - px - 80, 24, [tx.cap(c, cb.head, { bind: B + 'head', color: c.tone.accent })], { name: 'Label' }); if (hb) { o.push(hb); cy += hb.h + 10; } }
    o.push(PM.Chart(px + 40, cy, W - px - 80, 470 - cy, ch, { dark: c.dark, rtl: c.rtl, fs: c.en ? 10.5 : 12, bind: B + (cb.chart ? 'chart' : 'chartable') }));
    return o;
  }
});
/* 4 · photo band with the title + two blocks side by side */
mxdef('mx-photo-band', 'شريط صورة بالعنوان + كتلتان', {
  tags: ['مختلط', 'صورة'],
  accepts: sp => { if (!isMx(sp, 2, 2)) return 0; const bs = cBlocks(sp); return noHeavy(bs) && bs.every(b => PM.blockWeight(b) <= 0.75) && PM.len(sp.title) < 70 ? 0.78 + (sp.imgs.length ? 0.1 : 0) : 0; },
  render(sp, c) {
    const o = [];
    o.push(R(0, 0, W, H, c.tone.bg, { role: 'bg', lock: true, name: 'Background' }));
    const bh = 176;
    PM.photoBlock(c, sp, o, 0, 0, W, bh, {});
    o.push(PM.Veil(0, 0, W, bh, K.NAVY, 'right', 90, 20));
    PM.chromeOnPhoto(c, o, { pageColor: c.tone.muted });
    const hp = headPs(c, sp, { color: K.WHITE, eb: K.SKY });
    if (sp.sub) hp.push(tx.sub(c, sp.sub, { bind: 'sub', color: K.BODY_D }));
    o.push(T(G.X0, 64, 720, bh - 88, hp, { va: 'b', name: 'Title', minK: 0.6 }));
    const bs = cBlocks(sp), gx = 56, cw = (G.CW - gx) / 2, top = bh + 34;
    const parts = bs.map((b, i) => boxM(c, sp, b, G.X0 + i * (cw + gx), 0, cw, G.BOT - top, { icons: false }));
    const hh = Math.max(...parts.map(p => p.h));
    const y0 = PM.place(top, G.BOT, hh, 0.35);
    parts.forEach(p => o.push(...shift(p.objs, y0)));
    o.push(Ln(G.X0 + cw + gx / 2, y0, 0, hh, c.tone.rule, { sw: 0.75 }));
    return o;
  }
});
/* 5 · navy side panel holding the title + paragraph */
mxdef('mx-navy-panel', 'لوحة كحلية بالشرح + محتوى', {
  tags: ['مختلط', 'كحلي'], tones: ['light'],
  accepts: sp => { if (!isMx(sp)) return 0; const p = firstPara(sp); if (!p || PM.words(p.text) > 55) return 0; const rest = others(sp, p); return rest.length && rest.every(b => b.k !== 'para') && rest.reduce((a, b) => a + PM.blockWeight(b), 0) <= 1.1 && PM.len(sp.title) < 70 ? 0.84 : 0; },
  render(sp, c) {
    const o = [];
    PM.chrome(c, o, { noBar: true, noLogo: true });
    const pw = 360;
    o.push(R(0, 0, pw, H, K.NAVY, { name: 'Panel' }));
    o.push(PM.Logo(19, 13, 58, K.WHITE));
    const p = firstPara(sp);
    const ps = headPs(c, sp, { color: K.WHITE, eb: K.SKY });
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { bind: 'sub', color: K.BODY_D }));
    ps[ps.length - 1] && (ps[ps.length - 1].sa = 22);
    ps.push(tx.body(c, p.text, { bind: 'blocks.' + bIdx(sp, p) + '.text', color: K.BODY_D, size: c.Z.body * 1.1, lh: 1.55 }));
    o.push(T(G.X0, 90, pw - G.X0 - 36, 380, ps, { va: 'm', name: 'Panel text', minK: 0.6 }));
    const rx = pw + 54, rw = G.X1 - rx;
    stack(c, sp, others(sp, p), o, rx, G.TOP + 20, rw, G.BOT, { icons: false, chart: true });
    if (c.page) o.forEach(q => { if (q.pageNum) { q.x = rx; } });
    return o;
  }
});
/* 6 · KPI rail on the far side */
mxdef('mx-kpi-rail', 'محتوى + عمود أرقام جانبي', {
  tags: ['مختلط', 'أرقام'],
  accepts: sp => { if (!isMx(sp)) return 0; const bs = cBlocks(sp), kb = bs.find(isKpiB); if (!kb || kb.items.length > 4) return 0; const rest = others(sp, kb); return rest.every(b => !isKpiB(b) && b.k !== 'table') && rest.reduce((a, b) => a + PM.blockWeight(b), 0) <= 1 ? 0.84 : 0; },
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const rw = 210, rx = G.X1 - rw, lw = rx - G.X0 - 60;
    const top = PM.head(c, sp, o, { w: lw }) + 26;
    const bs = cBlocks(sp), kb = bs.find(isKpiB);
    stack(c, sp, others(sp, kb), o, G.X0, top, lw, G.BOT, { icons: false, chart: true, bias: 0.35 });
    o.push(Ln(rx - 30, G.TOP + 4, 0, G.BOT - G.TOP - 4, c.tone.rule, { sw: 0.75 }));
    const B = 'blocks.' + bIdx(sp, kb) + '.', n = kb.items.length, rh = (G.BOT - G.TOP - 10) / n;
    const pss = kb.items.map((kv, i) => [tx.num(c, kv.value, { size: c.Z.kpi * 0.95, bind: B + 'items.' + i + '.value', sa: 4 }), tx.label(c, kv.label || '', { size: c.Z.label * 1.15, bind: B + 'items.' + i + '.label' })]);
    const kk = PM.groupK(pss.map(ps => ({ w: rw, h: rh - 24, ps })), 1.1);
    kb.items.forEach((kv, i) => {
      const y = G.TOP + 10 + i * rh;
      if (i) o.push(Ln(rx, y, rw, 0, c.tone.rule, { sw: 0.75 }));
      const h2 = PM.hK(pss[i], rw, kk);
      const tb = PM.tk(rx, y + (rh - h2) / 2, rw, pss[i], kk, { name: 'Number ' + (i + 1) }); if (tb) o.push(tb);
    });
    return o;
  }
});
/* 7 · three blocks in three columns */
mxdef('mx-three', 'ثلاث كتل في ثلاثة أعمدة', {
  tags: ['مختلط', 'أعمدة'],
  accepts: sp => isMx(sp, 3, 3) && noHeavy(cBlocks(sp)) && cBlocks(sp).every(b => PM.blockWeight(b) <= 0.7 && (!b.items || b.items.length <= 4)) ? 0.83 : 0,
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 30;
    const bs = cBlocks(sp), gx = 56, cw = (G.CW - gx * 2) / 3;
    o.push(Ln(G.X0, top, G.CW, 0, c.tone.rule, { sw: 0.75 }));
    const parts = bs.map((b, i) => boxM(c, sp, b, G.X0 + i * (cw + gx), 0, cw, G.BOT - top - 28, { icons: false }));
    const hh = Math.max(...parts.map(p => p.h));
    const y0 = PM.place(top + 28, G.BOT, hh, 0.3);
    parts.forEach((p, i) => {
      o.push(R(G.X0 + i * (cw + gx), top - 1.5, 36, 3, i === 0 ? c.tone.accent : K.SKY));
      o.push(...shift(p.objs, y0));
      if (i) o.push(Ln(G.X0 + i * (cw + gx) - gx / 2, y0, 0, hh, c.tone.rule, { sw: 0.75 }));
    });
    return o;
  }
});
/* 8 · lead paragraph with an accent bar + one block below */
mxdef('mx-lead-bar', 'فقرة بارزة بخط جانبي + محتوى', {
  tags: ['مختلط', 'فقرة'],
  accepts: sp => { if (!isMx(sp, 2, 2)) return 0; const p = firstPara(sp); if (!p || PM.words(p.text) > 45) return 0; const ot = others(sp, p)[0]; return ot.k !== 'para' && PM.blockWeight(ot) <= 0.8 ? 0.83 : 0; },
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    const top = PM.head(c, sp, o, {}) + 26;
    const p = firstPara(sp), ot = others(sp, p)[0];
    const ps = paraBig(c, sp, p, { size: c.Z.lead });
    const k = PM.groupK([{ w: 700, h: 110, ps }], 1.05);
    const ph = PM.hK(ps, 700, k);
    o.push(R(G.X0, top + 2, 4, ph - 4, K.SKY, { name: 'Accent' }));
    const tb = PM.tk(G.X0 + 26, top, 700, ps, k, { name: 'Lead' }); if (tb) o.push(tb);
    const y2 = top + ph + 30;
    o.push(Ln(G.X0, y2, G.CW, 0, c.tone.rule, { sw: 0.75 }));
    const part = boxM(c, sp, ot, G.X0, 0, G.CW, G.BOT - y2 - 30, { chart: true });
    o.push(...shift(part.objs, PM.place(y2 + 30, G.BOT, part.h, 0.35)));
    return o;
  }
});
/* 9 · paragraph + navy KPI band (edge to edge) + items */
mxdef('mx-kpi-band', 'شريط أرقام كحلي بين الشرح والبنود', {
  tags: ['مختلط', 'أرقام', 'كحلي'],
  accepts: sp => { if (!isMx(sp, 2, 3)) return 0; const bs = cBlocks(sp), kb = bs.find(isKpiB); if (!kb || kb.items.length > 4) return 0; const rest = others(sp, kb); const p = rest.find(b => b.k === 'para'), it = rest.find(b => b.k !== 'para'); if (rest.length === 2 && !(p && it)) return 0; if (p && PM.words(p.text) > 40) return 0; if (it && !(['items', 'steps', 'bullets'].includes(it.k) && PM.blockWeight(it) <= 0.75)) return 0; return 0.84; },
  render(sp, c) {
    const o = [];
    PM.chrome(c, o);
    let y = PM.head(c, sp, o, {}) + 16;
    const bs = cBlocks(sp), kb = bs.find(isKpiB), rest = others(sp, kb);
    const p = rest.find(b => b.k === 'para'), it = rest.find(b => b.k !== 'para');
    if (p) {
      const lb = PM.textAt(G.X0, y + (it ? 0 : 14), 720, it ? 70 : 120, [tx.body(c, p.text, { bind: 'blocks.' + bIdx(sp, p) + '.text', size: it ? c.Z.body * 1.08 : c.Z.lead, color: it ? c.tone.body : c.tone.title, lh: 1.5 })], { name: 'Lead' });
      if (lb) { o.push(lb); y = lb.y + lb.h; }
    }
    const tmp = [];
    const kh = kpiStrip(c, sp, kb, tmp, G.X0, 0, G.CW, it ? 90 : 140, { nc: K.WHITE, lc: K.BODY_D, rule: K.RULE_D, ns: it ? c.Z.kpiS * 1.05 : c.Z.kpi * 1.15 });
    const bandH = kh + (it ? 40 : 64);
    const kb0 = it ? y + 22 : PM.place(y + 30, G.BOT + 20, bandH, 0.45);
    if (!it) tmp.forEach(q => { q.y += 12; });
    o.push(R(0, kb0, W, bandH, c.dark ? K.BLUE : K.NAVY, { name: 'Band' }));
    o.push(...shift(tmp, kb0 + 20));
    if (it) {
      const y2 = kb0 + bandH + 24;
      const part = boxM(c, sp, it, G.X0, 0, G.CW, G.BOT - y2, { icons: false });
      o.push(...shift(part.objs, PM.place(y2, G.BOT, part.h, 0.4)));
    }
    return o;
  }
});
})(window.PM);
