/* ==========================================================================
   صانع العروض · v2.0 — «افتح العرض كما هو»
   Reads a PowerPoint file and rebuilds every slide exactly where it was:
   background, master / layout graphics, text boxes (size, colour, weight,
   alignment, line spacing, bullets), pictures (with their crop), shapes,
   lines, groups and tables. Nothing is redesigned; every piece becomes a
   free object the user edits inside the tool.
   ========================================================================== */
(function (PM) {
'use strict';
const EMU_PT = 12700;
const kids = (el, n) => el ? [...el.children].filter(c => c.localName === n) : [];
const kid = (el, n) => el ? [...el.children].find(c => c.localName === n) || null : null;
const path = (el, ...ns) => { let e = el; for (const n of ns) { e = kid(e, n); if (!e) return null; } return e; };
const deep = (el, n) => el ? el.getElementsByTagNameNS('*', n)[0] || null : null;
const num = (v, d = 0) => { const x = parseFloat(v); return isFinite(x) ? x : d; };
const parse = xml => new DOMParser().parseFromString(xml, 'application/xml');
const dirOf = p => p.replace(/[^/]*$/, '');
function resolve(base, target) {
  if (/^\//.test(target)) return target.slice(1);
  const parts = (dirOf(base) + target).split('/'); const out = [];
  for (const s of parts) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); }
  return out.join('/');
}
async function relsOf(zip, part) {
  const rp = dirOf(part) + '_rels/' + part.split('/').pop() + '.rels';
  const f = zip.file(rp); const map = {};
  if (!f) return map;
  const d = parse(await f.async('string'));
  for (const r of d.getElementsByTagNameNS('*', 'Relationship')) {
    if (r.getAttribute('TargetMode') === 'External') continue;
    map[r.getAttribute('Id')] = { type: (r.getAttribute('Type') || '').split('/').pop(), target: resolve(part, r.getAttribute('Target')) };
  }
  return map;
}
const relByType = (rels, t) => Object.values(rels).find(r => r.type === t);

/* ---------------- colour ---------------- */
function hexToRgb(h) { const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbToHex(r) { return r.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase(); }
function rgbToHsl([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; }
function hslToRgb([h, s, l]) { if (!s) return [l * 255, l * 255, l * 255]; const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }; const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255]; }
const PRST = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080', grey: '808080', darkGray: 'A9A9A9', lightGray: 'D3D3D3', orange: 'FFA500', navy: '000080' };
/* a colour element (srgbClr / schemeClr / sysClr / prstClr) → { c: 'RRGGBB', a: 0..100 } */
function clr(el, T, ph) {
  if (!el) return null;
  let base = null;
  const n = el.localName;
  if (n === 'srgbClr') base = el.getAttribute('val');
  else if (n === 'sysClr') base = el.getAttribute('lastClr') || (el.getAttribute('val') === 'window' ? 'FFFFFF' : '000000');
  else if (n === 'prstClr') base = PRST[el.getAttribute('val')] || '000000';
  else if (n === 'scrgbClr') base = rgbToHex(['r', 'g', 'b'].map(k => num(el.getAttribute(k)) / 100000 * 255));
  else if (n === 'schemeClr') {
    let v = el.getAttribute('val');
    if (v === 'phClr') return ph ? Object.assign({}, ph) : { c: '000000', a: 100 };
    v = (T.map && T.map[v]) || v;
    base = (T.scheme && T.scheme[v]) || '000000';
  } else return null;
  let rgb = hexToRgb(base || '000000'), a = 100;
  let hsl = null;
  for (const m of el.children) {
    const val = num(m.getAttribute('val')) / 100000;
    if (m.localName === 'alpha') a = val * 100;
    else if (m.localName === 'lumMod') { hsl = hsl || rgbToHsl(rgb); hsl[2] *= val; rgb = hslToRgb(hsl); }
    else if (m.localName === 'lumOff') { hsl = hsl || rgbToHsl(rgb); hsl[2] = Math.min(1, hsl[2] + val); rgb = hslToRgb(hsl); }
    else if (m.localName === 'tint') { rgb = rgb.map(c => c + (255 - c) * (1 - val)); hsl = null; }
    else if (m.localName === 'shade') { rgb = rgb.map(c => c * val); hsl = null; }
  }
  return { c: rgbToHex(rgb), a: Math.round(a) };
}
const COLOR_TAGS = ['srgbClr', 'schemeClr', 'sysClr', 'prstClr', 'scrgbClr'];
const firstClr = el => el ? [...el.children].find(c => COLOR_TAGS.includes(c.localName)) || null : null;
/* a fill holder (spPr, bgPr, rPr…) → { kind:'solid'|'grad'|'none'|'blip', … } */
function fillOf(holder, T, ph) {
  if (!holder) return null;
  for (const f of holder.children) {
    if (f.localName === 'noFill') return { kind: 'none' };
    if (f.localName === 'solidFill') { const c = clr(firstClr(f), T, ph); return c ? { kind: 'solid', c } : null; }
    if (f.localName === 'gradFill') {
      const stops = [...f.getElementsByTagNameNS('*', 'gs')].map(g => ({ pos: num(g.getAttribute('pos')) / 100000, c: clr(firstClr(g), T, ph) })).filter(s => s.c).sort((a, b) => a.pos - b.pos);
      const lin = kid(f, 'lin');
      return stops.length ? { kind: 'grad', stops, ang: lin ? num(lin.getAttribute('ang')) / 60000 : 90 } : null;
    }
    if (f.localName === 'blipFill') return { kind: 'blip', el: f };
    if (f.localName === 'grpFill') return { kind: 'grp' };
  }
  return null;
}

/* ---------------- theme / master / layout ---------------- */
async function loadTheme(zip, part) {
  const T = { scheme: {}, map: {}, fills: [], bgFills: [], lines: [], fontMajor: '', fontMinor: '' };
  const f = zip.file(part); if (!f) return T;
  const d = parse(await f.async('string'));
  const cs = deep(d.documentElement, 'clrScheme');
  if (cs) for (const c of cs.children) { const v = c.children[0]; if (!v) continue; T.scheme[c.localName] = v.localName === 'sysClr' ? (v.getAttribute('lastClr') || '000000') : (v.getAttribute('val') || '000000'); }
  const fs = deep(d.documentElement, 'fmtScheme');
  if (fs) {
    const fl = kid(fs, 'fillStyleLst'), bl = kid(fs, 'bgFillStyleLst'), ll = kid(fs, 'lnStyleLst');
    T.fills = fl ? [...fl.children] : []; T.bgFills = bl ? [...bl.children] : []; T.lines = ll ? [...ll.children] : [];
  }
  return T;
}
function wrapFill(el) { const w = document.implementation.createDocument(null, 'w'); const r = w.documentElement; r.appendChild(w.importNode(el, true)); return r; }
async function loadPart(zip, part) { const f = zip.file(part); if (!f) return null; const d = parse(await f.async('string')); return { part, doc: d, root: d.documentElement, rels: await relsOf(zip, part) }; }
function phInfo(sp) {
  const nv = kid(sp, 'nvSpPr') || kid(sp, 'nvPicPr') || kid(sp, 'nvGraphicFramePr') || kid(sp, 'nvGrpSpPr') || kid(sp, 'nvCxnSpPr');
  const ph = nv ? path(nv, 'nvPr', 'ph') : null;
  if (!ph) return null;
  return { type: ph.getAttribute('type') || (ph.getAttribute('idx') ? 'body' : 'body'), idx: ph.getAttribute('idx'), hasType: ph.hasAttribute('type') };
}
function phIndex(pp) {
  const out = { byIdx: {}, byType: {} };
  const tree = pp ? deep(pp.root, 'spTree') : null; if (!tree) return out;
  for (const sp of tree.getElementsByTagNameNS('*', 'sp')) {
    const p = phInfo(sp); if (!p) continue;
    if (p.idx != null && !out.byIdx[p.idx]) out.byIdx[p.idx] = sp;
    if (!out.byType[p.type]) out.byType[p.type] = sp;
  }
  return out;
}
const normType = t => t === 'ctrTitle' ? 'title' : t === 'subTitle' || t === 'obj' ? 'body' : t;
function findPh(ix, p) {
  if (!ix || !p) return null;
  if (p.idx != null && ix.byIdx[p.idx]) return ix.byIdx[p.idx];
  if (p.hasType || p.idx == null) return ix.byType[p.type] || ix.byType[normType(p.type)] || null;
  return ix.byType[p.type] || null;
}

/* ---------------- text ---------------- */
const LV = ['lvl1pPr', 'lvl2pPr', 'lvl3pPr', 'lvl4pPr', 'lvl5pPr', 'lvl6pPr', 'lvl7pPr', 'lvl8pPr', 'lvl9pPr'];
function lvlNodes(lstStyle, lvl) { if (!lstStyle) return []; const n = kid(lstStyle, LV[lvl]) || null; return n ? [n] : []; }
function attrIn(chain, a) { for (const n of chain) if (n && n.hasAttribute && n.hasAttribute(a)) return n.getAttribute(a); return null; }
function childIn(chain, names) { for (const n of chain) { if (!n) continue; const c = [...n.children].find(x => names.includes(x.localName)); if (c) return c; } return null; }
function spacing(node, size) {
  if (!node) return null;
  const pct = kid(node, 'spcPct'), pts = kid(node, 'spcPts');
  if (pct) return { pct: num(pct.getAttribute('val')) / 100000 };
  if (pts) return { pts: num(pts.getAttribute('val')) / 100 };
  return null;
}

/* ---------------- images ---------------- */
const IMG_EXT = { png: 'png', jpg: 'jpeg', jpeg: 'jpeg', gif: 'gif', webp: 'webp', bmp: 'png', svg: 'svg' };
async function imageAsset(ctx, relId, rels, box, crop, alpha) {
  const r = rels[relId]; if (!r) return null;
  const f = ctx.zip.file(r.target); if (!f) return null;
  const ext = (r.target.split('.').pop() || '').toLowerCase();
  if (!IMG_EXT[ext]) { ctx.warn.unsupportedImg++; return null; }
  const key = r.target + '|' + JSON.stringify(crop || {}) + '|' + Math.round(box.w / Math.max(1, box.h) * 100);
  if (ctx.imgCache[key]) return ctx.imgCache[key];
  const bytes = await f.async('uint8array');
  let out = null;
  try {
    const blob = new Blob([bytes], { type: ext === 'svg' ? 'image/svg+xml' : 'image/' + IMG_EXT[ext] });
    const bmp = await loadBitmap(blob);
    let iw = bmp.width || bmp.naturalWidth || 0, ih = bmp.height || bmp.naturalHeight || 0;
    if (ext === 'svg') { const fr0 = box.w / Math.max(0.01, box.h); if (!iw || !ih) { iw = 1200; ih = Math.round(1200 / fr0); } const up = Math.max(1, 1800 / Math.max(iw, ih)); iw = Math.round(iw * up); ih = Math.round(ih * up); }
    const c = crop || {};
    const sx = iw * (c.l || 0), sy = ih * (c.t || 0);
    const sw = Math.max(1, iw * (1 - (c.l || 0) - (c.r || 0))), sh = Math.max(1, ih * (1 - (c.t || 0) - (c.b || 0)));
    // the frame shape decides the final picture (PowerPoint stretches the crop into the frame)
    const fr = box.w / Math.max(0.01, box.h);
    let W = sw, H = sw / fr;
    if (H > sh) { H = sh; W = sh * fr; }
    const long = Math.max(W, H), lim = 2400, k = long > lim ? lim / long : 1;
    const cw = Math.max(1, Math.round(W * k)), chh = Math.max(1, Math.round(H * k));
    const plain = !crop && Math.abs(iw / ih - fr) < 0.01 && ext !== 'svg' && ext !== 'bmp' && iw <= lim && ih <= lim;
    if (plain) out = { bytes, ext: IMG_EXT[ext], w: iw, h: ih };
    else {
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = chh;
      const g = cv.getContext('2d');
      // negative crop values (the picture smaller than its frame) leave transparent margins
      if (ext === 'svg') g.drawImage(bmp, 0, 0, cw, chh); else g.drawImage(bmp, sx, sy, sw, sh, 0, 0, cw, chh);
      const png = ext === 'png' || ext === 'gif' || ext === 'svg' || ext === 'webp';
      const b = await new Promise(res => cv.toBlob(res, png ? 'image/png' : 'image/jpeg', 0.92));
      out = { bytes: new Uint8Array(await b.arrayBuffer()), ext: png ? 'png' : 'jpeg', w: cw, h: chh };
    }
    if (bmp.close) bmp.close();
  } catch (e) { ctx.warn.unsupportedImg++; return null; }
  const id = 'asis' + Math.random().toString(36).slice(2, 9);
  ctx.deck.assets[id] = { kind: 'image', bytes: out.bytes, ext: out.ext, size: { w: out.w, h: out.h }, fromFile: true };
  ctx.imgCache[key] = id;
  return id;
}
function loadBitmap(blob) {
  if (window.createImageBitmap && blob.type !== 'image/svg+xml') return createImageBitmap(blob);
  return new Promise((ok, no) => { const u = URL.createObjectURL(blob); const im = new Image(); im.onload = () => { ok(im); setTimeout(() => URL.revokeObjectURL(u), 1000); }; im.onerror = no; im.src = u; });
}
async function gradImage(ctx, f, w, h) {
  const k = Math.min(2, 1600 / Math.max(w, h));
  const cw = Math.max(2, Math.round(w * k)), chh = Math.max(2, Math.round(h * k));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = chh;
  const g = cv.getContext('2d');
  const a = (f.ang || 0) * Math.PI / 180, cx = cw / 2, cy = chh / 2, L = Math.abs(cw * Math.cos(a)) / 2 + Math.abs(chh * Math.sin(a)) / 2;
  const gr = g.createLinearGradient(cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
  f.stops.forEach(s => gr.addColorStop(Math.max(0, Math.min(1, s.pos)), PM.hexA(s.c.c, s.c.a / 100)));
  g.fillStyle = gr; g.fillRect(0, 0, cw, chh);
  const b = await new Promise(res => cv.toBlob(res, 'image/png'));
  const id = 'asis' + Math.random().toString(36).slice(2, 9);
  ctx.deck.assets[id] = { kind: 'image', bytes: new Uint8Array(await b.arrayBuffer()), ext: 'png', size: { w: cw, h: chh }, fromFile: true };
  return id;
}
/* custom outlines (custGeom) are drawn as a picture so they keep their exact shape */
async function custGeomImage(ctx, cg, w, h, fill, line) {
  const pl = kid(cg, 'pathLst'); if (!pl) return null;
  const k = Math.min(3, 1800 / Math.max(w, h, 1));
  const cw = Math.max(2, Math.round(w * k)), chh = Math.max(2, Math.round(h * k));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = chh;
  const g = cv.getContext('2d');
  for (const p of kids(pl, 'path')) {
    const pw = num(p.getAttribute('w'), 0) || 1, ph = num(p.getAttribute('h'), 0) || 1;
    const sx = cw / pw, sy = chh / ph;
    g.beginPath();
    let cx = 0, cy = 0;
    for (const c of p.children) {
      const pts = kids(c, 'pt').map(t => [num(t.getAttribute('x')) * sx, num(t.getAttribute('y')) * sy]);
      if (c.localName === 'moveTo' && pts[0]) { g.moveTo(...pts[0]); [cx, cy] = pts[0]; }
      else if (c.localName === 'lnTo' && pts[0]) { g.lineTo(...pts[0]); [cx, cy] = pts[0]; }
      else if (c.localName === 'cubicBezTo' && pts.length === 3) { g.bezierCurveTo(...pts[0], ...pts[1], ...pts[2]); [cx, cy] = pts[2]; }
      else if (c.localName === 'quadBezTo' && pts.length === 2) { g.quadraticCurveTo(...pts[0], ...pts[1]); [cx, cy] = pts[1]; }
      else if (c.localName === 'arcTo') {
        const wR = num(c.getAttribute('wR')) * sx, hR = num(c.getAttribute('hR')) * sy, st = num(c.getAttribute('stAng')) / 60000 * Math.PI / 180, sw = num(c.getAttribute('swAng')) / 60000 * Math.PI / 180;
        const ox = cx - wR * Math.cos(st), oy = cy - hR * Math.sin(st);
        g.ellipse(ox, oy, Math.max(0.01, wR), Math.max(0.01, hR), 0, st, st + sw, sw < 0);
        cx = ox + wR * Math.cos(st + sw); cy = oy + hR * Math.sin(st + sw);
      } else if (c.localName === 'close') g.closePath();
    }
    if (fill && p.getAttribute('fill') !== 'none') { g.fillStyle = PM.hexA(fill.c, fill.a / 100); g.fill(); }
    if (line && p.getAttribute('stroke') !== '0') { g.strokeStyle = PM.hexA(line.c.c, line.c.a / 100); g.lineWidth = Math.max(1, line.w * k); g.stroke(); }
  }
  const b = await new Promise(res => cv.toBlob(res, 'image/png'));
  const id = 'asis' + Math.random().toString(36).slice(2, 9);
  ctx.deck.assets[id] = { kind: 'image', bytes: new Uint8Array(await b.arrayBuffer()), ext: 'png', size: { w: cw, h: chh }, fromFile: true };
  return id;
}

/* ---------------- one slide ---------------- */
function xf(el) {
  const x = kid(el, 'xfrm'); if (!x) return null;
  const off = kid(x, 'off'), ext = kid(x, 'ext');
  if (!off || !ext) return null;
  const r = { x: num(off.getAttribute('x')), y: num(off.getAttribute('y')), w: num(ext.getAttribute('cx')), h: num(ext.getAttribute('cy')), rot: num(x.getAttribute('rot')) / 60000, flipH: x.getAttribute('flipH') === '1', flipV: x.getAttribute('flipV') === '1' };
  const co = kid(x, 'chOff'), ce = kid(x, 'chExt');
  if (co && ce) { r.chX = num(co.getAttribute('x')); r.chY = num(co.getAttribute('y')); r.chW = num(ce.getAttribute('cx')); r.chH = num(ce.getAttribute('cy')); }
  return r;
}
function lineOf(spPr, style, T) {
  const ln = kid(spPr, 'ln');
  let c = null, w = 0.75, dash = false, none = false;
  if (ln) {
    if (kid(ln, 'noFill')) none = true;
    const f = fillOf(ln, T); if (f && f.kind === 'solid') c = f.c; else if (f && f.kind === 'grad') c = f.stops[0].c;
    if (ln.hasAttribute('w')) w = num(ln.getAttribute('w')) / EMU_PT;
    const pd = kid(ln, 'prstDash'); if (pd && pd.getAttribute('val') !== 'solid') dash = true;
  }
  if (!c && !none && style) { const lr = kid(style, 'lnRef'); if (lr && num(lr.getAttribute('idx')) > 0) { c = clr(firstClr(lr), T); const tl = T.lines[num(lr.getAttribute('idx')) - 1]; if (tl && !ln) w = num(tl.getAttribute('w'), 9525) / EMU_PT; } }
  if (none || !c) return null;
  return { c, w, dash };
}
function shapeFill(spPr, style, T) {
  const f = fillOf(spPr, T);
  if (f) return f;
  if (style) {
    const fr = kid(style, 'fillRef');
    const idx = fr ? num(fr.getAttribute('idx')) : 0;
    if (fr && idx > 0) {
      const ph = clr(firstClr(fr), T);
      const tf = idx >= 1001 ? T.bgFills[idx - 1001] : T.fills[idx - 1];
      if (tf) { const r = fillOf(wrapFill(tf), T, ph); if (r) return r; }
      return ph ? { kind: 'solid', c: ph } : null;
    }
  }
  return null;
}

async function convertSlide(ctx, sl) {
  const { T } = ctx;
  const objs = [];
  const add = o => { if (o) objs.push(o); };
  // groups: child box → slide box (scale, then the group's own rotation / flip around its centre)
  const ID = { pt: (x, y) => [x, y], sx: 1, sy: 1, rot: 0 };
  const place = (b, G) => {
    const [cx, cy] = G.pt(b.x + b.w / 2, b.y + b.h / 2);
    const w = b.w * G.sx, h = b.h * G.sy;
    return { X: ctx.ox + (cx - w / 2) / EMU_PT * ctx.k, Y: ctx.oy + (cy - h / 2) / EMU_PT * ctx.k, W: w / EMU_PT * ctx.k, H: h / EMU_PT * ctx.k, rot: ((b.rot || 0) + G.rot) % 360 };
  };

  /* ---- background (slide → layout → master) ---- */
  const bgOf = pp => { const cs = pp && kid(pp.root, 'cSld'); return cs && kid(cs, 'bg'); };
  let bgPart = null, bg = null;
  for (const pp of [sl.slide, sl.layout, sl.master]) { const b = bgOf(pp); if (b) { bg = b; bgPart = pp; break; } }
  let bgFill = null;
  if (bg) {
    const bp = kid(bg, 'bgPr'), br = kid(bg, 'bgRef');
    if (bp) bgFill = fillOf(bp, T);
    else if (br) { const idx = num(br.getAttribute('idx')); const ph = clr(firstClr(br), T); const tf = idx >= 1001 ? T.bgFills[idx - 1001] : T.fills[idx - 1]; bgFill = (tf && fillOf(wrapFill(tf), T, ph)) || (ph ? { kind: 'solid', c: ph } : null); }
  }
  const BW = ctx.slideW * ctx.k, BH = ctx.slideH * ctx.k;
  if (bgFill && bgFill.kind === 'solid') add(Object.assign(PM.R(ctx.ox, ctx.oy, BW, BH, bgFill.c.c, { fa: bgFill.c.a }), { name: 'الخلفية', lock: true, role: 'asis-bg' }));
  else if (bgFill && bgFill.kind === 'grad') { const id = await gradImage(ctx, bgFill, BW, BH); add(Object.assign(PM.Img(ctx.ox, ctx.oy, BW, BH, id), { name: 'الخلفية', lock: true, role: 'asis-bg' })); }
  else if (bgFill && bgFill.kind === 'blip') {
    const blip = kid(bgFill.el, 'blip'); const rid = blip && (blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') || blip.getAttribute('r:embed'));
    const id = rid ? await imageAsset(ctx, rid, bgPart.rels, { w: BW, h: BH }, null) : null;
    if (id) add(Object.assign(PM.Img(ctx.ox, ctx.oy, BW, BH, id), { name: 'الخلفية', lock: true, role: 'asis-bg' }));
    else add(Object.assign(PM.R(ctx.ox, ctx.oy, BW, BH, 'FFFFFF'), { name: 'الخلفية', lock: true, role: 'asis-bg' }));
  } else add(Object.assign(PM.R(ctx.ox, ctx.oy, BW, BH, 'FFFFFF'), { name: 'الخلفية', lock: true, role: 'asis-bg' }));

  /* ---- shapes ---- */
  const titleBits = [], textBits = [];
  async function walk(tree, pp, G, layer) {
    for (let el of tree.children) {
      if (el.localName === 'AlternateContent') {
        const ch = kid(el, 'Choice'), fb = kid(el, 'Fallback');
        const pick = [ch, fb].map(x => x && [...x.children].find(c => ['sp', 'pic', 'grpSp', 'cxnSp', 'graphicFrame'].includes(c.localName))).find(Boolean);
        if (!pick) continue; el = pick;
      }
      const nm = el.localName;
      if (!['sp', 'pic', 'grpSp', 'cxnSp', 'graphicFrame'].includes(nm)) continue;
      const nv = kid(el, nm === 'sp' ? 'nvSpPr' : nm === 'pic' ? 'nvPicPr' : nm === 'grpSp' ? 'nvGrpSpPr' : nm === 'cxnSp' ? 'nvCxnSpPr' : 'nvGraphicFramePr');
      const cnv = nv && kid(nv, 'cNvPr');
      if (cnv && cnv.getAttribute('hidden') === '1') continue;
      const name = (cnv && cnv.getAttribute('name')) || '';
      const ph = phInfo(el);
      // placeholders on the layout / master are only prompts — the slide brings its own
      if (layer !== 'slide' && ph) continue;
      if (nm === 'grpSp') {
        const g = xf(kid(el, 'grpSpPr'));
        if (!g) { await walk(el, pp, G, layer); continue; }
        const sx = g.chW ? g.w / g.chW : 1, sy = g.chH ? g.h / g.chH : 1;
        const gcx = g.x + g.w / 2, gcy = g.y + g.h / 2, ga = (g.rot || 0) * Math.PI / 180, ca = Math.cos(ga), sa = Math.sin(ga);
        const G2 = { sx: G.sx * sx, sy: G.sy * sy, rot: G.rot + (g.rot || 0), pt: (x, y) => {
          let lx = g.x + (x - (g.chX || 0)) * sx, ly = g.y + (y - (g.chY || 0)) * sy;
          if (g.flipH) lx = 2 * gcx - lx; if (g.flipV) ly = 2 * gcy - ly;
          const dx = lx - gcx, dy = ly - gcy;
          return G.pt(gcx + dx * ca - dy * sa, gcy + dx * sa + dy * ca);
        } };
        await walk(el, pp, G2, layer); continue;
      }
      const spPr = kid(el, 'spPr');
      const style = kid(el, 'style');
      let box = nm === 'graphicFrame' ? (() => { const x = kid(el, 'xfrm'); if (!x) return null; const o = kid(x, 'off'), e = kid(x, 'ext'); return o && e ? { x: num(o.getAttribute('x')), y: num(o.getAttribute('y')), w: num(e.getAttribute('cx')), h: num(e.getAttribute('cy')), rot: 0 } : null; })() : xf(spPr);
      // placeholder geometry / styles come from the layout, then the master
      let lph = null, mph = null;
      if (ph) { lph = findPh(ctx.ixL, ph); mph = findPh(ctx.ixM, lph ? phInfo(lph) || ph : ph) || findPh(ctx.ixM, ph); }
      if (!box && lph) box = xf(kid(lph, 'spPr'));
      if (!box && mph) box = xf(kid(mph, 'spPr'));
      if (!box) continue;
      const { X, Y, W, H, rot } = place(box, G);
      if (nm === 'graphicFrame') {
        const tbl = deep(el, 'tbl');
        if (tbl) {
          const rows = [...kids(tbl, 'tr')].map(tr => kids(tr, 'tc').map(tc => [...tc.getElementsByTagNameNS('*', 't')].map(t => t.textContent).join(' ').trim()));
          if (rows.length && rows[0].length) {
            const sz = [...tbl.getElementsByTagNameNS('*', 'rPr')].find(r => r.hasAttribute('sz')); const fs = (sz ? num(sz.getAttribute('sz')) / 100 : 18) * ctx.k;
            const tp = kid(tbl, 'tblPr'); const head = tp && tp.getAttribute('firstRow') === '1', band = tp && tp.getAttribute('bandRow') === '1';
            const t = PM.Table(X, Y, W, H, rows, { fs: Math.max(7, Math.min(28, fs)), rtl: !!(tp && tp.getAttribute('rtl') === '1'), style: head ? 'fill' : band ? 'zebra' : 'rule' }); t.bind = null; t.name = name || 'جدول';
            add(t); rows.flat().forEach(x => x && textBits.push(x));
          }
        } else ctx.warn.charts++;
        continue;
      }
      if (nm === 'pic' || (nm === 'sp' && spPr && kid(spPr, 'blipFill'))) {
        const bf = nm === 'pic' ? kid(el, 'blipFill') : kid(spPr, 'blipFill');
        const blip = bf && kid(bf, 'blip');
        const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
        const svgB = blip && deep(blip, 'svgBlip');
        // a vector graphic (SVG) wins over its picture copy; EMF/WMF copies can't be drawn in the browser
        let rid = svgB && svgB.getAttributeNS(R, 'embed');
        const main = blip && (blip.getAttributeNS(R, 'embed') || blip.getAttribute('r:embed'));
        if (!rid || !pp.rels[rid]) rid = main;
        if (!rid) continue;
        const sr = kid(bf, 'srcRect');
        const crop = sr ? { l: num(sr.getAttribute('l')) / 100000, t: num(sr.getAttribute('t')) / 100000, r: num(sr.getAttribute('r')) / 100000, b: num(sr.getAttribute('b')) / 100000 } : null;
        const id = await imageAsset(ctx, rid, pp.rels, { w: W, h: H }, crop && (crop.l || crop.t || crop.r || crop.b) ? crop : null);
        if (!id) continue;
        const o = PM.Img(X, Y, W, H, id); o.name = name || 'صورة';
        const geo = spPr && kid(spPr, 'prstGeom');
        if (geo && geo.getAttribute('prst') === 'roundRect') { const av = deep(geo, 'gd'); o.r = (av ? num((av.getAttribute('fmla') || '').replace(/\D/g, ''), 16667) : 16667) / 100000 * Math.min(W, H); }
        if (geo && geo.getAttribute('prst') === 'ellipse') o.r = Math.min(W, H) / 2;
        const am = blip && kid(blip, 'alphaModFix'); if (am) o.op = num(am.getAttribute('amt'), 100000) / 1000;
        if (rot) o.rot = rot;
        add(o);
        continue;
      }
      // ---- geometry ----
      const geo = spPr && kid(spPr, 'prstGeom'), cg = spPr && kid(spPr, 'custGeom');
      const prst = geo ? geo.getAttribute('prst') : cg ? 'cust' : (nm === 'cxnSp' ? 'line' : 'rect');
      const fill = nm === 'cxnSp' ? null : shapeFill(spPr, style, T);
      const ln = lineOf(spPr, style, T);
      const isLine = /^(line|straightConnector\d*|bentConnector\d*|curvedConnector\d*)$/.test(prst) || nm === 'cxnSp';
      if (isLine) {
        if (ln) { const o = PM.Ln(X, Y, W, H, ln.c.c, { sw: Math.max(0.5, ln.w * ctx.k), dash: ln.dash }); o.flipH = !!(box.flipH ^ box.flipV); o.name = name || 'خط'; if (rot) o.rot = rot; add(o); }
        continue;
      }
      const solid = fill && fill.kind === 'solid' ? fill.c : fill && fill.kind === 'grad' ? fill.stops[0].c : null;
      if (prst === 'cust' && (solid || ln)) {
        const id = await custGeomImage(ctx, cg, W, H, solid, ln ? { c: ln.c, w: ln.w * ctx.k } : null);
        if (id) { const o = PM.Img(X, Y, W, H, id); o.name = name || 'شكل'; if (rot) o.rot = rot; add(o); }
      } else if (solid || ln) {
        let o;
        if (prst === 'ellipse') o = PM.E(X, Y, W, H, solid ? solid.c : null, { fa: solid ? solid.a : 100 });
        else {
          let r = 0;
          if (/^(roundRect|round2SameRect|snipRoundRect|round1Rect)$/.test(prst)) { const gd = geo && deep(geo, 'gd'); const v = gd ? num((gd.getAttribute('fmla') || '').replace(/[^\d]/g, ''), 16667) : 16667; r = v / 100000 * Math.min(W, H); }
          if (!/^(rect|roundRect|round2SameRect|snipRoundRect|round1Rect|flowChartProcess|flowChartAlternateProcess)$/.test(prst)) ctx.warn.shapes++;
          o = PM.R(X, Y, W, H, solid ? solid.c : null, { fa: solid ? solid.a : 100, r });
        }
        if (ln) { o.stroke = ln.c.c; o.sw = Math.max(0.5, ln.w * ctx.k); }
        if (fill && fill.kind === 'grad' && fill.stops.length > 1 && prst !== 'ellipse') { const id = await gradImage(ctx, fill, W, H); o = Object.assign(PM.Img(X, Y, W, H, id), { r: o.r || 0 }); }
        o.name = name || 'شكل'; if (rot) o.rot = rot;
        add(o);
      }
      // ---- text ----
      const tb = kid(el, 'txBody');
      if (tb && tb.getElementsByTagNameNS('*', 't').length) {
        const t = buildText(ctx, el, tb, ph, lph, mph, style, { X, Y, W, H });
        if (t) {
          t.name = name || 'نص'; if (rot) t.rot = rot;
          add(t);
          const txt = t.paras.map(p => PM.plain(p.t)).join('\n').trim();
          if (ph && /title|ctrTitle/.test(ph.type)) titleBits.push(txt); else if (txt) textBits.push(txt);
        }
      }
    }
  }
  const showM = n => !n || n.root.getAttribute('showMasterSp') !== '0';
  if (showM(sl.slide) && showM(sl.layout) && sl.master) { const tr = deep(sl.master.root, 'spTree'); if (tr) await walk(tr, sl.master, ID, 'master'); }
  if (showM(sl.slide) && sl.layout) { const tr = deep(sl.layout.root, 'spTree'); if (tr) await walk(tr, sl.layout, ID, 'layout'); }
  const tr = deep(sl.slide.root, 'spTree'); if (tr) await walk(tr, sl.slide, ID, 'slide');
  return { objs, title: titleBits.join(' ').trim(), texts: textBits };
}

function buildText(ctx, el, tb, ph, lph, mph, style, B) {
  const { T } = ctx;
  const bodyPr = kid(tb, 'bodyPr');
  const bodies = [bodyPr, lph && path(lph, 'txBody', 'bodyPr'), mph && path(mph, 'txBody', 'bodyPr')];
  const ins = a => { const v = attrIn(bodies, a); return v == null ? null : num(v) / EMU_PT * ctx.k; };
  const l = ins('lIns') ?? 7.2 * ctx.k, r = ins('rIns') ?? 7.2 * ctx.k, t = ins('tIns') ?? 3.6 * ctx.k, b = ins('bIns') ?? 3.6 * ctx.k;
  const anchor = attrIn(bodies, 'anchor') || (ph && /title|ctrTitle/.test(ph.type) ? 'ctr' : 't');
  const noWrap = attrIn(bodies, 'wrap') === 'none';
  const vert = attrIn(bodies, 'vert');
  const af = bodyPr && kid(bodyPr, 'normAutofit');
  const fScale = af && af.hasAttribute('fontScale') ? num(af.getAttribute('fontScale')) / 100000 : 1;
  const lnRed = af && af.hasAttribute('lnSpcReduction') ? num(af.getAttribute('lnSpcReduction')) / 100000 : 0;
  // which master text style applies
  const kind = !ph ? 'other' : /title|ctrTitle/.test(ph.type) ? 'title' : /dt|ftr|sldNum/.test(ph.type) ? 'other' : 'body';
  const txS = ctx.txStyles[kind];
  const lsts = [kid(tb, 'lstStyle'), lph && path(lph, 'txBody', 'lstStyle'), mph && path(mph, 'txBody', 'lstStyle'), txS, kind === 'other' && !ph ? ctx.defStyle : null];
  const fontRefClr = style && kid(style, 'fontRef') ? clr(firstClr(kid(style, 'fontRef')), T) : null;
  const paras = [];
  let anyRtl = false;
  for (const p of kids(tb, 'p')) {
    const pPr = kid(p, 'pPr');
    const lvl = Math.min(8, pPr && pPr.hasAttribute('lvl') ? num(pPr.getAttribute('lvl')) : 0);
    const chain = [pPr, ...lsts.flatMap(s => lvlNodes(s, lvl))];
    const defR = chain.map(n => n && kid(n, 'defRPr'));
    let text = '', size = null, bold = null, color = null, allBold = true, anyBoldRun = false, runs = 0;
    const pieces = [];
    for (const n of p.children) {
      if (n.localName === 'br') { pieces.push({ t: '\n' }); continue; }
      if (n.localName !== 'r' && n.localName !== 'fld') continue;
      const rPr = kid(n, 'rPr');
      const tx = (kid(n, 't') || {}).textContent || '';
      const rc = [rPr, ...defR];
      const sz = attrIn(rc, 'sz'); const bd = attrIn(rc, 'b');
      const f = (() => { for (const x of rc) { if (!x) continue; const ff = fillOf(x, T); if (ff && ff.kind === 'solid') return ff.c; if (ff && ff.kind === 'grad') return ff.stops[0].c; } return null; })();
      const isB = bd === '1' || bd === 'true';
      if (tx.trim()) { runs++; if (size == null && sz) size = num(sz) / 100; if (color == null && f) color = f; if (!isB) allBold = false; else anyBoldRun = true; }
      pieces.push({ t: tx, b: isB });
    }
    if (!runs) allBold = false;
    // bold words inside a normal paragraph keep their weight
    text = pieces.map(x => x.t === '\n' ? '\n' : (anyBoldRun && !allBold && x.b && x.t.trim() ? PM.BO + x.t + PM.BC : x.t)).join('');
    if (size == null) { const ds = attrIn(defR, 'sz'); size = ds ? num(ds) / 100 : (kind === 'title' ? 44 : 18); }
    if (color == null) { for (const x of defR) { if (!x) continue; const ff = fillOf(x, T); if (ff && ff.kind === 'solid') { color = ff.c; break; } } }
    if (color == null) color = fontRefClr || clr({ localName: 'schemeClr', getAttribute: () => 'tx1', children: [] }, T) || { c: '000000', a: 100 };
    const rtl = attrIn(chain, 'rtl') === '1' || PM.isAr(text);
    if (rtl) anyRtl = true;
    let algn = attrIn(chain, 'algn');
    const al = algn === 'ctr' ? 'c' : algn === 'r' ? 'r' : algn === 'l' ? 'l' : (rtl ? 'r' : 'l');
    const ls = spacing(childIn(chain, ['lnSpc']), size);
    const sb = spacing(childIn(chain, ['spcBef']), size), sa = spacing(childIn(chain, ['spcAft']), size);
    const S = size * fScale * ctx.k;
    let lh = 1.2;
    if (ls && ls.pct) lh = 1.2 * Math.max(0.5, ls.pct - lnRed);
    else if (ls && ls.pts) lh = Math.max(0.6, ls.pts * ctx.k / S);
    const bu = childIn(chain, ['buNone', 'buChar', 'buAutoNum', 'buBlip']);
    const bch = bu && bu.localName === 'buChar' ? bu.getAttribute('char') || '•' : '';
    const bullet = bu && bu.localName === 'buChar' ? (/[–—\-]/.test(bch) ? 'dash' : 'dot') : bu && bu.localName === 'buAutoNum' ? 'num' : bu && bu.localName === 'buBlip' ? 'dot' : null;
    const buC = childIn(chain, ['buClr']); const bc = buC ? clr(firstClr(buC), T) : null;
    const P = PM.P(text, Math.round(S * 4) / 4, { bold: allBold && runs > 0, color: color.c, lh, al, bullet: text.trim() ? bullet : null, bc: bc ? bc.c : null,
      sb: sb ? (sb.pts != null ? sb.pts * ctx.k : sb.pct * S) : 0, sa: sa ? (sa.pts != null ? sa.pts * ctx.k : sa.pct * S) : 0 });
    if (!text.trim()) { P.t = ''; P.keep = true; P.bullet = null; }
    if (color.a < 100) P.op = color.a;
    paras.push(P);
  }
  while (paras.length && !String(paras[paras.length - 1].t).trim()) paras.pop();
  if (!paras.some(p => String(p.t).trim())) return null;
  let x = B.X + l, y = B.Y + t, w = Math.max(4, B.W - l - r), h = Math.max(4, B.H - t - b);
  if (vert && vert !== 'horz') ctx.warn.vertical++;
  if (noWrap) { const need = Math.max(...paras.map(p => PM.textW(PM.plain(p.t), p, p.size))) + 2; if (need > w) { const al0 = paras[0].al; if (al0 === 'r') x -= need - w; else if (al0 === 'c') x -= (need - w) / 2; w = need; } }
  const o = PM.T(x, y, w, h, paras, { fit: false, va: anchor === 'ctr' ? 'm' : anchor === 'b' ? 'b' : 't' });
  o.paras.forEach(p => { if (p.keep) p.keep = true; });
  if (anyRtl) o.dir = 'rtl';
  o.asis = true;
  return o;
}

/* ---------------- the whole file ---------------- */
PM.importAsIs = async function (file, opts = {}) {
  const buf = await file.arrayBuffer();
  let zip;
  try { zip = await JSZip.loadAsync(buf); } catch (e) { throw new Error('ما قدرت أفتح الملف. تأكد إنه PowerPoint ‏(.pptx) وما هو محمي بكلمة مرور.'); }
  const pres = await loadPart(zip, 'ppt/presentation.xml');
  if (!pres) throw new Error('«كما هو» يشتغل على ملفات PowerPoint ‏(.pptx) فقط');
  const sz = deep(pres.root, 'sldSz');
  const cx = sz ? num(sz.getAttribute('cx'), 12192000) : 12192000, cy = sz ? num(sz.getAttribute('cy'), 6858000) : 6858000;
  const slideW = cx / EMU_PT, slideH = cy / EMU_PT;
  const k = Math.min(PM.W / slideW, PM.H / slideH);
  const ctx = { zip, k, slideW, slideH, ox: (PM.W - slideW * k) / 2, oy: (PM.H - slideH * k) / 2, imgCache: {}, warn: { charts: 0, shapes: 0, unsupportedImg: 0, vertical: 0 } };
  ctx.defStyle = (() => { const d = kid(pres.root, 'defaultTextStyle'); return d; })();
  const name = (file.name || '').replace(/\.pptx$/i, '');
  const ids = kid(pres.root, 'sldIdLst');
  const order = ids ? kids(ids, 'sldId').map(s => s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || s.getAttribute('r:id')) : [];
  const slideParts = order.map(id => pres.rels[id] && pres.rels[id].target).filter(Boolean);
  if (!slideParts.length) throw new Error('الملف ما فيه شرائح');
  const deck = PM.newDeck({ lang: 'ar', grey: false, dark: false, name });
  ctx.deck = deck;
  const cacheM = {}, cacheL = {};
  let arChars = 0, enChars = 0;
  for (let i = 0; i < slideParts.length; i++) {
    if (opts.onProgress) opts.onProgress(i, slideParts.length);
    const slide = await loadPart(zip, slideParts[i]); if (!slide) continue;
    const lr = relByType(slide.rels, 'slideLayout');
    const layout = lr ? (cacheL[lr.target] || (cacheL[lr.target] = await loadPart(zip, lr.target))) : null;
    const mr = layout && relByType(layout.rels, 'slideMaster');
    const master = mr ? (cacheM[mr.target] || (cacheM[mr.target] = await loadPart(zip, mr.target))) : null;
    if (master && !master.T) {
      const th = relByType(master.rels, 'theme');
      master.T = await loadTheme(zip, th ? th.target : 'ppt/theme/theme1.xml');
      const cm = kid(master.root, 'clrMap'); if (cm) for (const a of cm.attributes) master.T.map[a.name] = a.value;
      const ts = kid(master.root, 'txStyles');
      master.txStyles = { title: ts && kid(ts, 'titleStyle'), body: ts && kid(ts, 'bodyStyle'), other: ts && kid(ts, 'otherStyle') };
      master.ix = phIndex(master);
    }
    if (layout && !layout.ix) layout.ix = phIndex(layout);
    ctx.T = master ? master.T : await loadTheme(zip, 'ppt/theme/theme1.xml');
    ctx.txStyles = master ? master.txStyles : { title: null, body: null, other: null };
    ctx.ixL = layout ? layout.ix : null; ctx.ixM = master ? master.ix : null;
    const r = await convertSlide(ctx, { slide, layout, master });
    // notes
    let notes = '';
    const nr = relByType(slide.rels, 'notesSlide');
    if (nr && zip.file(nr.target)) {
      const nd = parse(await zip.file(nr.target).async('string'));
      for (const sp of nd.getElementsByTagNameNS('*', 'sp')) { const p = phInfo(sp); if (p && p.type === 'body') notes += [...sp.getElementsByTagNameNS('*', 'p')].map(pp => [...pp.getElementsByTagNameNS('*', 't')].map(t => t.textContent).join('')).join('\n'); }
    }
    const all = (r.title + ' ' + r.texts.join(' '));
    arChars += (all.match(/[؀-ۿ]/g) || []).length; enChars += (all.match(/[A-Za-z]/g) || []).length;
    const lines = r.texts.flatMap(t => t.split('\n')).map(t => t.trim()).filter(Boolean).slice(0, 12);
    const spec = i === 0 ? { kind: 'cover', title: r.title || lines[0] || name, sub: lines[r.title ? 0 : 1] || '' } : { kind: 'content', title: r.title || '', blocks: lines.length ? [{ k: 'bullets', items: lines }] : [], imgs: [] };
    if (notes.trim()) spec.notes = notes.trim();
    const s = PM.addSlide(deck, spec);
    s.objs = r.objs; s.layout = 'asis'; s.asis = true; s.edited = true;
    if (slide.root.getAttribute('show') === '0') s.hidden = true;
  }
  deck.lang = arChars >= enChars ? 'ar' : 'en';
  deck.asis = true;
  const warnings = [];
  if (ctx.warn.charts) warnings.push({ msg: `في ${ctx.warn.charts} رسم بياني أو SmartArt ما قدرت أنقله، أضفه من «إضافة»` });
  if (ctx.warn.unsupportedImg) warnings.push({ msg: `${ctx.warn.unsupportedImg} من الصور بصيغة ما تنعرض في المتصفح (مثل EMF)، تقدر تبدّلها من «الصور»` });
  if (ctx.warn.shapes) warnings.push({ msg: `بعض الأشكال الخاصة (${ctx.warn.shapes}) انرسمت كمستطيل` });
  if (Math.abs(slideW / slideH - 16 / 9) > 0.02) warnings.push({ msg: 'مقاس العرض الأصلي مو 16:9، فحطيته في النص بنفس نسبته' });
  return { deck, report: { kind: 'asis', slides: deck.slides.length, warnings } };
};
})(window.PM);
