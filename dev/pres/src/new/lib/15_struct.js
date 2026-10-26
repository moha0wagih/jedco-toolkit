/* ==========================================================================
   Layout families · cover · agenda · section divider · closing
   The official template slides keep their own artwork (language-specific,
   so these layouts are positioned directly and never mirrored).
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H, K, P, T, R, E, Ln, Ic, G, tx } = PM;
const tplLang = c => c.lang === 'en' ? 'en' : 'ar';
const tpl = (c, i) => 'tpl:' + tplLang(c) + ':' + i;
const bgImg = (c, i) => { const im = PM.Img(0, 0, W, H, tpl(c, i), { role: 'tplbg' }); im.lock = true; im.tpl = { lang: tplLang(c), idx: i }; im.noMirror = true; im.name = 'Template background'; return im; };
/* start/end x for text on the language side */
const S = (c, x, w) => c.rtl ? W - x - w : x;
const AL = c => c.rtl ? 'r' : 'l';
const nm = (o) => { o.noMirror = true; if (o.t === 'text') o.dir = undefined; return o; };
function rtlText(c, t) { if (c.rtl) t.dir = 'rtl'; t.noMirror = true; return t; }
const sdef = (fam, kinds) => (id, name, o) => PM.def(fam, id, name, Object.assign({ kinds, noMirror: true, forms: [fam] }, o));

/* ======================= COVER ======================= */
const cover = sdef('cover', ['cover']);
function coverText(c, sp, o, x, y, w, h, opt = {}) {
  const ps = [];
  if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { color: K.SKY, bind: 'eyebrow', al: opt.al || AL(c) }));
  ps.push(tx.title(c, sp.title || '', { color: K.WHITE, bind: 'title', size: c.Z.cover, al: opt.al || AL(c) }));
  if (sp.sub) ps.push(tx.sub(c, sp.sub, { color: 'D5E1F0', bind: 'sub', sb: 12, size: c.Z.sub * 1.1, al: opt.al || AL(c) }));
  o.push(rtlText(c, T(x, y, w, h, ps, { va: opt.va || 'b', name: 'Title', minK: 0.6 })));
}
cover('cover-official', 'الغلاف الرسمي', {
  tags: ['رسمي'], official: true,
  accepts: sp => 1,
  render(sp, c) {
    const o = [bgImg(c, 0)];
    coverText(c, sp, o, S(c, 52, 600), 250, 600, 230);
    return o;
  }
});
cover('cover-photo', 'غلاف بصورة كاملة', {
  tags: ['صورة'],
  accepts: sp => 0.9,
  render(sp, c) {
    const o = [];
    const im = PM.photoBlock(c, sp, o, 0, 0, W, H, {}); im.noMirror = true;
    o.push(nm(PM.Veil(0, 0, W, H, K.NAVY, 'down', 5, 92)));
    o.push(nm(PM.Veil(0, 0, W, H, K.NAVY, c.rtl ? 'left' : 'right', 60, 0)));
    o.push(nm(PM.Logo(S(c, 44, 112), 36, 112, K.WHITE)));
    coverText(c, sp, o, S(c, 52, 620), 230, 620, 252);
    return o;
  }
});
cover('cover-split', 'غلاف نصف كحلي', {
  tags: ['كحلي', 'صورة'],
  accepts: sp => 0.86,
  render(sp, c) {
    const o = [];
    const pw = 430;
    o.push(nm(R(0, 0, W, H, K.NAVY, { role: 'bg', lock: true })));
    const im = PM.photoBlock(c, sp, o, c.rtl ? 0 : W - (W - pw), 0, W - pw, H, {}); im.x = c.rtl ? 0 : pw; im.noMirror = true;
    o.push(nm(PM.Logo(S(c, 44, 112), 36, 112, K.WHITE)));
    coverText(c, sp, o, S(c, 52, pw - 100), 140, pw - 100, 330);
    o.push(nm(R(S(c, 52, 40), 480, 40, 3, K.SKY)));
    return o;
  }
});
cover('cover-navy', 'غلاف كحلي نظيف', {
  tags: ['كحلي'],
  accepts: sp => 0.8,
  render(sp, c) {
    const o = [nm(R(0, 0, W, H, K.NAVY, { role: 'bg', lock: true }))];
    o.push(nm(PM.Veil(0, 0, W, H, K.BLUE, c.rtl ? 'right' : 'left', 0, 55)));
    o.push(nm(PM.Logo(S(c, 44, 112), 36, 112, K.WHITE)));
    coverText(c, sp, o, S(c, 52, 700), 200, 700, 260, { va: 'm' });
    o.push(nm(R(S(c, 52, 40), 470, 40, 3, K.SKY)));
    return o;
  }
});
cover('cover-frame', 'غلاف بصورة مؤطرة بالكحلي', {
  tags: ['صورة', 'كحلي'],
  accepts: sp => 0.82,
  render(sp, c) {
    const o = [nm(R(0, 0, W, H, K.NAVY, { role: 'bg', lock: true }))];
    const im = PM.photoBlock(c, sp, o, 0, 0, W, 330, {}); im.noMirror = true;
    o.push(nm(PM.Veil(0, 200, W, 130, K.NAVY, 'down', 0, 100)));
    o.push(nm(PM.Logo(S(c, 44, 112), 36, 112, K.WHITE)));
    coverText(c, sp, o, S(c, 52, 760), 300, 760, 190, { va: 't' });
    return o;
  }
});

/* ======================= CLOSING ======================= */
const closing = sdef('closing', ['closing']);
const thanks = (c, sp) => sp.title || (c.en ? 'Thank you' : 'شكراً لكم');
closing('close-official', 'الختام الرسمي', {
  tags: ['رسمي'], official: true,
  accepts: sp => 1,
  render(sp, c) {
    const o = [bgImg(c, 9)];
    coverText(c, Object.assign({}, sp, { title: thanks(c, sp) }), o, S(c, 52, 600), 270, 600, 210);
    return o;
  }
});
closing('close-navy', 'ختام كحلي', {
  tags: ['كحلي'],
  accepts: sp => 0.86,
  render(sp, c) {
    const o = [nm(R(0, 0, W, H, K.NAVY, { role: 'bg', lock: true }))];
    o.push(nm(PM.Logo(W / 2 - 90, 150, 180, K.WHITE)));
    const ps = [tx.title(c, thanks(c, sp), { color: K.WHITE, bind: 'title', size: c.Z.divider, al: 'c' })];
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { color: 'C9D6E8', bind: 'sub', al: 'c', sb: 12 }));
    o.push(rtlText(c, T(120, 300, 720, 150, ps, { align: 'center', va: 't', name: 'Title' })));
    return o;
  }
});
closing('close-photo', 'ختام بصورة', {
  tags: ['صورة'],
  accepts: sp => 0.84,
  render(sp, c) {
    const o = [];
    const im = PM.photoBlock(c, sp, o, 0, 0, W, H, {}); im.noMirror = true;
    o.push(nm(R(0, 0, W, H, K.NAVY, { fa: 62, role: 'veil' })));
    o.push(nm(PM.Logo(W / 2 - 70, 120, 140, K.WHITE)));
    const ps = [tx.title(c, thanks(c, sp), { color: K.WHITE, bind: 'title', size: c.Z.divider * 1.1, al: 'c' })];
    if (sp.sub) ps.push(tx.sub(c, sp.sub, { color: 'D5E1F0', bind: 'sub', al: 'c', sb: 12 }));
    o.push(rtlText(c, T(120, 260, 720, 170, ps, { align: 'center', va: 'm', name: 'Title' })));
    return o;
  }
});

/* ======================= DIVIDER (title only, by preference) ======================= */
const divider = sdef('divider', ['divider']);
divider('div-official', 'الفاصل الرسمي', {
  tags: ['رسمي'], official: true,
  accepts: sp => 1,
  render(sp, c) {
    const v = 2 + ((c.divIdx || 0) % 7);
    const o = [bgImg(c, v)];
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', al: AL(c) }));
    ps.push(tx.title(c, sp.title, { size: c.Z.divider, bind: 'title', al: AL(c) }));
    o.push(rtlText(c, T(540, 150, 360, 240, ps, { va: 'm', name: 'Title', minK: 0.55 })));
    return o;
  }
});
divider('div-photo', 'فاصل بصورة كاملة', {
  tags: ['صورة'],
  accepts: sp => 0.9,
  render(sp, c) {
    const o = [];
    const im = PM.photoBlock(c, sp, o, 0, 0, W, H, {}); im.noMirror = true;
    o.push(nm(PM.Veil(0, 0, W, H, K.NAVY, c.rtl ? 'left' : 'right', 92, 10)));
    o.push(nm(PM.Logo(S(c, 19, 58), 13, 58, K.WHITE)));
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: K.SKY, al: AL(c) }));
    ps.push(tx.title(c, sp.title, { size: c.Z.divider * 1.15, bind: 'title', color: K.WHITE, al: AL(c) }));
    o.push(rtlText(c, T(S(c, 64, 520), 150, 520, 240, ps, { va: 'm', name: 'Title' })));
    return o;
  }
});
divider('div-navy', 'فاصل كحلي', {
  tags: ['كحلي'],
  accepts: sp => 0.86,
  render(sp, c) {
    const o = [nm(R(0, 0, W, H, K.NAVY, { role: 'bg', lock: true }))];
    o.push(nm(PM.Logo(S(c, 19, 58), 13, 58, K.WHITE)));
    o.push(nm(R(S(c, 64, 46), 214, 46, 3, K.SKY)));
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', color: K.SKY, al: AL(c) }));
    ps.push(tx.title(c, sp.title, { size: c.Z.divider * 1.2, bind: 'title', color: K.WHITE, al: AL(c) }));
    o.push(rtlText(c, T(S(c, 64, 700), 236, 700, 200, ps, { va: 't', name: 'Title' })));
    return o;
  }
});
divider('div-half', 'فاصل نصف صورة', {
  tags: ['صورة', 'نصف'],
  accepts: sp => 0.85,
  render(sp, c) {
    const o = [nm(R(0, 0, W, H, c.dark ? K.NAVY : K.WHITE, { role: 'bg', lock: true }))];
    const pw = 420;
    const im = PM.photoBlock(c, sp, o, 0, 0, pw, H, {}); im.x = c.rtl ? 0 : W - pw; im.noMirror = true;
    o.push(nm(PM.Logo(S(c, 19, 58), 13, 58, c.dark ? K.WHITE : K.BLUE)));
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', al: AL(c) }));
    ps.push(tx.title(c, sp.title, { size: c.Z.divider * 1.1, bind: 'title', al: AL(c) }));
    o.push(rtlText(c, T(S(c, 64, W - pw - 120), 150, W - pw - 120, 240, ps, { va: 'm', name: 'Title' })));
    return o;
  }
});
divider('div-light', 'فاصل أبيض كبير', {
  tags: ['نظيف'],
  accepts: sp => 0.8,
  render(sp, c) {
    const t = c.tone;
    const o = [nm(R(0, 0, W, H, t.bg, { role: 'bg', lock: true }))];
    o.push(nm(R(c.rtl ? W - 15 : 0, 84, 15, 399, c.dark ? K.SKY : K.BLUE, { role: 'chrome', lock: true })));
    o.push(nm(PM.Logo(S(c, 19, 58), 13, 58, t.logo)));
    const ps = [];
    if (sp.eyebrow) ps.push(tx.eyebrow(c, sp.eyebrow, { bind: 'eyebrow', al: AL(c) }));
    ps.push(tx.title(c, sp.title, { size: c.Z.divider * 1.35, bind: 'title', al: AL(c) }));
    o.push(rtlText(c, T(S(c, 80, 760), 130, 760, 280, ps, { va: 'm', name: 'Title' })));
    return o;
  }
});

/* ======================= AGENDA ======================= */
const agenda = sdef('agenda', ['agenda']);
const agItems = sp => (sp.items && sp.items.length ? sp.items : []).slice(0, 9);
const agTitle = (c, sp) => sp.title || (c.en ? 'Agenda' : 'جدول الأعمال');
function agList(c, sp, o, x, y, w, h, opt = {}) {
  const items = agItems(sp), n = items.length;
  if (!n) return;
  const rh = Math.min(opt.maxRow || 58, h / n);
  const y0 = y + Math.max(0, (h - rh * n) * 0.45);
  const numW = 56;
  const pss = items.map((it, i) => [tx.h(c, it.title, { size: c.Z.lead * (n > 6 ? 0.85 : 0.98), bind: 'items.' + i + '.title', sa: 0, color: opt.color, al: AL(c) })]);
  const kk = PM.groupK(pss.map(ps => ({ w: w - numW, h: rh - 14, ps })), 1.1);
  items.forEach((it, i) => {
    const yy = y0 + i * rh;
    if (i > 0 || opt.firstRule) o.push(nm(Ln(x, yy, w, 0, opt.rule || c.tone.rule, { sw: 0.75 })));
    const nx = c.rtl ? x + w - numW + 8 : x;
    o.push(rtlText(c, T(nx, yy + 4, numW - 8, rh - 8, [tx.num(c, PM.pad2(i + 1), { size: 15, color: opt.num || K.SKY, sa: 0, al: AL(c) })], { va: 'm', name: 'Number' })));
    const tbx = c.rtl ? x : x + numW;
    const h2 = PM.hK(pss[i], w - numW, kk);
    const tb = PM.tk(tbx, yy + (rh - h2) / 2, w - numW, pss[i], kk, { name: 'Agenda ' + (i + 1) }); if (tb) o.push(rtlText(c, tb));
  });
}
agenda('ag-official', 'جدول الأعمال الرسمي', {
  tags: ['رسمي'], official: true,
  accepts: sp => 1,
  render(sp, c) {
    const o = [bgImg(c, 1)];
    o.push(rtlText(c, T(400, 60, 500, 60, [tx.title(c, agTitle(c, sp), { bind: 'title', al: AL(c) })], { va: 'm', name: 'Title' })));
    agList(c, sp, o, 400, 140, 500, 350);
    return o;
  }
});
agenda('ag-navy', 'جدول أعمال بلوحة كحلية', {
  tags: ['كحلي'],
  accepts: sp => 0.86,
  render(sp, c) {
    const o = [nm(R(0, 0, W, H, c.tone.bg, { role: 'bg', lock: true }))];
    const pw = 330;
    o.push(nm(R(c.rtl ? W - pw : 0, 0, pw, H, K.NAVY, { role: 'bg', lock: true })));
    o.push(nm(PM.Logo(S(c, 19, 58), 13, 58, K.WHITE)));
    o.push(rtlText(c, T(S(c, 64, pw - 110), 150, pw - 110, 240, [tx.title(c, agTitle(c, sp), { bind: 'title', color: K.WHITE, size: c.Z.divider, al: AL(c) })], { va: 'm', name: 'Title' })));
    agList(c, sp, o, S(c, pw + 50, W - pw - 110), 80, W - pw - 110, 400);
    return o;
  }
});
agenda('ag-columns', 'جدول أعمال بأعمدة', {
  tags: ['أعمدة'],
  accepts: sp => agItems(sp).length >= 2 && agItems(sp).length <= 5 ? 0.84 : 0,
  render(sp, c) {
    const t = c.tone;
    const o = [nm(R(0, 0, W, H, t.bg, { role: 'bg', lock: true }))];
    o.push(nm(R(c.rtl ? W - 15 : 0, 84, 15, 399, c.dark ? K.SKY : K.BLUE, { role: 'chrome', lock: true })));
    o.push(nm(PM.Logo(S(c, 19, 58), 13, 58, t.logo)));
    o.push(rtlText(c, T(S(c, 64, 800), 70, 800, 60, [tx.title(c, agTitle(c, sp), { bind: 'title', al: AL(c) })], { name: 'Title' })));
    const items = agItems(sp), n = items.length, gx = 26, cw = (G.CW - gx * (n - 1)) / n;
    const pss = items.map((it, i) => [tx.h(c, it.title, { size: c.Z.lead, bind: 'items.' + i + '.title', al: AL(c), sa: 0 })]);
    const kk = PM.groupK(pss.map(ps => ({ w: cw, h: 160, ps })), 1.1);
    items.forEach((it, i) => {
      const k = c.rtl ? n - 1 - i : i;
      const x = G.X0 + k * (cw + gx);
      o.push(rtlText(c, T(x, 210, cw, 70, [tx.num(c, PM.pad2(i + 1), { size: c.Z.kpi * 1.1, color: i === 0 ? t.accent : (c.dark ? '2F5A92' : 'B8CDE6'), al: AL(c), sa: 0 })], { name: 'Number' })));
      o.push(nm(Ln(x, 290, cw, 0, i === 0 ? t.accent : t.rule, { sw: i === 0 ? 2 : 1 })));
      const tb = PM.tk(x, 308, cw, pss[i], kk, { name: 'Agenda ' + (i + 1) }); if (tb) o.push(rtlText(c, tb));
    });
    return o;
  }
});
agenda('ag-photo', 'جدول أعمال فوق صورة', {
  tags: ['صورة'],
  accepts: sp => 0.82,
  render(sp, c) {
    const o = [];
    const im = PM.photoBlock(c, sp, o, 0, 0, W, H, {}); im.noMirror = true;
    o.push(nm(PM.Veil(0, 0, W, H, K.NAVY, c.rtl ? 'right' : 'left', 25, 95)));
    o.push(nm(PM.Logo(S(c, 19, 58), 13, 58, K.WHITE)));
    o.push(rtlText(c, T(S(c, 64, 330), 150, 330, 240, [tx.title(c, agTitle(c, sp), { bind: 'title', color: K.WHITE, size: c.Z.divider, al: AL(c) })], { va: 'm', name: 'Title' })));
    agList(c, sp, o, S(c, 440, 460), 80, 460, 400, { color: K.WHITE, rule: '5A7BAE' });
    return o;
  }
});
})(window.PM);
