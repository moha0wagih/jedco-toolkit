/* ============ صانع العروض — PPTX parser ============
   Reads any .pptx (JSZip instance) into a flat list of positioned elements per slide.
   Units: points on a 960x540 canvas (source decks of other sizes are scaled). */

const EMU = 12700;
const SW = 960, SH = 540;
const AR_RE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const AR_RE_G = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
const LAT_RE_G = /[A-Za-z]/g;

function kids(el, name) {
  const out = [];
  if (!el) return out;
  for (let c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && (!name || c.nodeName === name)) out.push(c);
  return out;
}
function kid(el, name) {
  if (!el) return null;
  for (let c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && c.nodeName === name) return c;
  return null;
}
function path(el, ...names) { let e = el; for (const n of names) { e = kid(e, n); if (!e) return null; } return e; }
function desc(el, name) { return el ? Array.from(el.getElementsByTagName(name)) : []; }
function attr(el, a, d) { if (!el) return d; const v = el.getAttribute(a); return (v === null || v === '') ? d : v; }
function num(el, a, d) { const v = attr(el, a, null); return v === null ? d : Number(v); }

function resolvePath(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/'); parts.pop();
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}
function relsPathFor(p) { const i = p.lastIndexOf('/'); return p.slice(0, i) + '/_rels/' + p.slice(i + 1) + '.rels'; }

async function readXml(zip, p, parser) {
  const f = zip.file(p); if (!f) return null;
  const s = await f.async('string');
  return parser.parseFromString(s, 'application/xml');
}
async function readRels(zip, p, parser) {
  const doc = await readXml(zip, relsPathFor(p), parser);
  const map = {};
  if (!doc) return map;
  for (const r of desc(doc, 'Relationship')) {
    const mode = r.getAttribute('TargetMode');
    map[r.getAttribute('Id')] = { type: r.getAttribute('Type').split('/').pop(), target: mode === 'External' ? r.getAttribute('Target') : resolvePath(p, r.getAttribute('Target')), external: mode === 'External' };
  }
  return map;
}

/* ---------- colors ---------- */
function themeColors(themeDoc) {
  const out = {};
  if (!themeDoc) return out;
  const cs = desc(themeDoc, 'a:clrScheme')[0];
  if (!cs) return out;
  for (const c of kids(cs)) {
    const n = c.nodeName.replace('a:', '');
    const s = kid(c, 'a:srgbClr'), sy = kid(c, 'a:sysClr');
    out[n] = s ? attr(s, 'val') : (sy ? attr(sy, 'lastClr', '000000') : '000000');
  }
  out.tx1 = out.dk1; out.bg1 = out.lt1; out.tx2 = out.dk2; out.bg2 = out.lt2;
  return out;
}
function colorOf(fillParent, theme) {
  if (!fillParent) return null;
  const s = kid(fillParent, 'a:srgbClr'); if (s) return applyMods(attr(s, 'val'), s);
  const sc = kid(fillParent, 'a:schemeClr'); if (sc) return applyMods(theme[attr(sc, 'val')] || '000000', sc);
  const p = kid(fillParent, 'a:prstClr'); if (p) { const v = attr(p, 'val'); return v === 'white' ? 'FFFFFF' : v === 'black' ? '000000' : '808080'; }
  const sy = kid(fillParent, 'a:sysClr'); if (sy) return attr(sy, 'lastClr', '000000');
  return null;
}
function applyMods(hex, el) {
  let [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  for (const m of kids(el)) {
    const v = num(m, 'val', 100000) / 100000;
    if (m.nodeName === 'a:lumMod') { r *= v; g *= v; b *= v; }
    if (m.nodeName === 'a:lumOff') { r += 255 * v; g += 255 * v; b += 255 * v; }
    if (m.nodeName === 'a:tint') { r = 255 - (255 - r) * v; g = 255 - (255 - g) * v; b = 255 - (255 - b) * v; }
    if (m.nodeName === 'a:shade') { r *= v; g *= v; b *= v; }
  }
  return [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function lum(hex) {
  if (!hex) return 1;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function fillInfo(spPr, theme) {
  if (!spPr) return { fill: null, line: null };
  let fill = null;
  const sf = kid(spPr, 'a:solidFill'); if (sf) fill = colorOf(sf, theme);
  const gf = kid(spPr, 'a:gradFill');
  if (gf) { const gs = desc(gf, 'a:gs')[0]; if (gs) fill = colorOf(gs, theme); }
  const bf = kid(spPr, 'a:blipFill'); if (bf) fill = 'IMG';
  let line = null;
  const ln = kid(spPr, 'a:ln');
  if (ln && !kid(ln, 'a:noFill')) { const lf = kid(ln, 'a:solidFill'); if (lf) line = colorOf(lf, theme); }
  return { fill, line };
}

/* ---------- text ---------- */
function paraSizeDefaults(lstStyle, lvl) {
  if (!lstStyle) return null;
  const l = kid(lstStyle, `a:lvl${lvl + 1}pPr`); if (!l) return null;
  const d = kid(l, 'a:defRPr'); return d ? num(d, 'sz', null) : null;
}
function readParagraphs(txBody, theme, inherit) {
  const out = [];
  if (!txBody) return out;
  const lst = kid(txBody, 'a:lstStyle');
  for (const p of kids(txBody, 'a:p')) {
    const pPr = kid(p, 'a:pPr');
    const lvl = num(pPr, 'lvl', 0);
    let bullet = null;
    if (pPr) {
      if (kid(pPr, 'a:buChar')) bullet = 'char';
      else if (kid(pPr, 'a:buAutoNum')) bullet = 'num';
      else if (kid(pPr, 'a:buNone')) bullet = 'none';
    }
    const defSz = paraSizeDefaults(lst, lvl) || (inherit && inherit.sizes && inherit.sizes[lvl]) || null;
    const runs = [];
    for (const r of kids(p)) {
      if (r.nodeName === 'a:r' || r.nodeName === 'a:fld') {
        const rPr = kid(r, 'a:rPr');
        const t = (kid(r, 'a:t') || {}).textContent || '';
        let sz = num(rPr, 'sz', null);
        const b = attr(rPr, 'b', null);
        const sf = kid(rPr, 'a:solidFill');
        runs.push({ t, sz, b: b === '1' || b === 'true' ? true : (b === '0' ? false : null), color: sf ? colorOf(sf, theme) : null });
      } else if (r.nodeName === 'a:br') runs.push({ t: '\n', sz: null });
    }
    const end = kid(p, 'a:endParaRPr');
    const endSz = num(end, 'sz', null);
    let text = runs.map(r => r.t).join('').replace(/\u000b/g, '\n');
    const sizes = runs.filter(r => r.t.trim()).map(r => r.sz || defSz || endSz || (inherit && inherit.def) || 1800);
    const size = (sizes.length ? Math.max(...sizes) : (endSz || defSz || 1800)) / 100;
    const boldRuns = runs.filter(r => r.t.trim());
    const bold = boldRuns.length > 0 && boldRuns.every(r => r.b === true || (r.b === null && inherit && inherit.bold));
    const color = (boldRuns.find(r => r.color) || {}).color || null;
    out.push({ text, size, bold, color, bullet, lvl, algn: attr(pPr, 'algn', null) });
  }
  return out;
}

/* ---------- placeholders inheritance ---------- */
function phInfo(nv) {
  const ph = nv ? desc(nv, 'p:ph')[0] : null;
  if (!ph) return null;
  return { type: attr(ph, 'type', 'body'), idx: attr(ph, 'idx', null) };
}
function findPh(spTree, ph) {
  if (!spTree) return null;
  const shapes = desc(spTree, 'p:sp');
  let byIdx = null, byType = null;
  for (const s of shapes) {
    const p = phInfo(kid(s, 'p:nvSpPr')); if (!p) continue;
    if (ph.idx !== null && p.idx === ph.idx) byIdx = s;
    if (p.type === ph.type || (ph.type === 'ctrTitle' && p.type === 'title') || (ph.type === 'subTitle' && p.type === 'body')) byType = byType || s;
  }
  return byIdx || byType;
}
function xfrmOf(spPr) {
  const x = spPr && kid(spPr, 'a:xfrm');
  if (!x) return null;
  const off = kid(x, 'a:off'), ext = kid(x, 'a:ext');
  if (!off || !ext) return null;
  return { x: num(off, 'x', 0), y: num(off, 'y', 0), w: num(ext, 'cx', 0), h: num(ext, 'cy', 0), rot: num(x, 'rot', 0), flipH: attr(x, 'flipH') === '1' };
}

/* ---------- main ---------- */
async function parsePptx(zip, opts = {}) {
  const parser = opts.parser || new DOMParser();
  const pres = await readXml(zip, 'ppt/presentation.xml', parser);
  if (!pres) throw new Error('ملف غير صالح: لا يحتوي presentation.xml');
  const presRels = await readRels(zip, 'ppt/presentation.xml', parser);
  const sz = desc(pres, 'p:sldSz')[0];
  const srcW = num(sz, 'cx', 12192000), srcH = num(sz, 'cy', 6858000);
  const scale = SW / (srcW / EMU);
  const sx = v => v / EMU * scale;
  const slidesOut = [];
  const media = {}; // path -> {bytes, ext}
  const warnings = [];
  const cache = {};
  async function getPart(p) {
    if (cache[p]) return cache[p];
    const doc = await readXml(zip, p, parser);
    const rels = await readRels(zip, p, parser);
    return (cache[p] = { doc, rels, path: p });
  }
  async function loadMedia(p) {
    if (media[p]) return p;
    const f = zip.file(p); if (!f) return null;
    media[p] = { bytes: await f.async('uint8array'), ext: p.split('.').pop().toLowerCase() };
    return p;
  }

  const sldIds = desc(pres, 'p:sldId');
  let sIndex = 0;
  for (const sid of sldIds) {
    sIndex++;
    const rid = sid.getAttribute('r:id');
    const rel = presRels[rid]; if (!rel) continue;
    const slide = await getPart(rel.target);
    if (!slide.doc) continue;
    if (attr(slide.doc.documentElement, 'show') === '0') continue; // hidden slide
    const layoutRel = Object.values(slide.rels).find(r => r.type === 'slideLayout');
    const layout = layoutRel ? await getPart(layoutRel.target) : null;
    const masterRel = layout && Object.values(layout.rels).find(r => r.type === 'slideMaster');
    const master = masterRel ? await getPart(masterRel.target) : null;
    const themeRel = master && Object.values(master.rels).find(r => r.type === 'theme');
    const theme = themeRel ? themeColors((await getPart(themeRel.target)).doc) : {};
    const layoutName = layout ? attr(desc(layout.doc, 'p:cSld')[0], 'name', '') : '';
    const lTree = layout && desc(layout.doc, 'p:spTree')[0];
    const mTree = master && desc(master.doc, 'p:spTree')[0];
    const mTx = master && desc(master.doc, 'p:txStyles')[0];
    function masterSizes(kind) {
      if (!mTx) return null;
      const st = kid(mTx, kind === 'title' ? 'p:titleStyle' : 'p:bodyStyle');
      if (!st) return null;
      return [0, 1, 2, 3, 4].map(l => paraSizeDefaults(st, l));
    }
    const els = [];
    let bgDark = false;
    const bg = desc(slide.doc, 'p:bg')[0];
    if (bg) { const f = fillInfo(kid(bg, 'p:bgPr'), theme).fill; if (f && f !== 'IMG' && lum(f) < 0.35) bgDark = true; }
    else if (layout) {
      const lbg = desc(layout.doc, 'p:bg')[0];
      if (lbg) { const f = fillInfo(kid(lbg, 'p:bgPr'), theme).fill; if (f && f !== 'IMG' && lum(f) < 0.35) bgDark = true; }
    }

    const tx = (t, x) => t ? (t.ox + (x - t.cox) * t.sx) : x;
    const ty = (t, y) => t ? (t.oy + (y - t.coy) * t.sy) : y;

    async function walk(tree, T, groupId) {
      for (const n of kids(tree)) {
        const nm = n.nodeName;
        if (nm === 'p:grpSp') {
          const gx = xfrmOf(kid(n, 'p:grpSpPr'));
          const x = kid(kid(n, 'p:grpSpPr'), 'a:xfrm');
          let nt = T;
          if (gx && x) {
            const ch = kid(x, 'a:chOff'), che = kid(x, 'a:chExt');
            const cox = num(ch, 'x', 0), coy = num(ch, 'y', 0), cw = num(che, 'cx', gx.w) || gx.w || 1, chh = num(che, 'cy', gx.h) || gx.h || 1;
            const ox = tx(T, gx.x), oy = ty(T, gx.y);
            const sxx = (T ? T.sx : 1) * (gx.w / cw || 1), syy = (T ? T.sy : 1) * (gx.h / chh || 1);
            nt = { ox, oy, cox, coy, sx: sxx, sy: syy };
          }
          const nvg = path(n, 'p:nvGrpSpPr', 'p:cNvPr');
          if (attr(nvg, 'hidden') === '1') continue;
          await walk(n, nt, (groupId || '') + '/' + attr(nvg, 'id', Math.random()));
          continue;
        }
        if (nm === 'mc:AlternateContent') {
          const choice = kid(n, 'mc:Choice') || kid(n, 'mc:Fallback');
          if (choice) await walk(choice, T, groupId);
          continue;
        }
        if (!['p:sp', 'p:pic', 'p:graphicFrame', 'p:cxnSp'].includes(nm)) continue;
        const nvKey = nm === 'p:sp' ? 'p:nvSpPr' : nm === 'p:pic' ? 'p:nvPicPr' : nm === 'p:graphicFrame' ? 'p:nvGraphicFramePr' : 'p:nvCxnSpPr';
        const nv = kid(n, nvKey);
        const cNvPr = kid(nv, 'p:cNvPr');
        if (attr(cNvPr, 'hidden') === '1') continue;
        const name = attr(cNvPr, 'name', '');
        const ph = phInfo(nv);
        const spPr = kid(n, 'p:spPr');
        let xf = nm === 'p:graphicFrame' ? (() => {
          const x = kid(n, 'p:xfrm'); if (!x) return null;
          const off = kid(x, 'a:off'), ext = kid(x, 'a:ext');
          return { x: num(off, 'x', 0), y: num(off, 'y', 0), w: num(ext, 'cx', 0), h: num(ext, 'cy', 0) };
        })() : xfrmOf(spPr);
        let inheritSp = null;
        if (ph) {
          const lsp = findPh(lTree, ph), msp = findPh(mTree, ph);
          inheritSp = lsp || msp;
          if (!xf) xf = (lsp && xfrmOf(kid(lsp, 'p:spPr'))) || (msp && xfrmOf(kid(msp, 'p:spPr')));
        }
        if (!xf) continue;
        // apply group transform (EMU), then scale
        let X = tx(T, xf.x), Y = ty(T, xf.y), W = xf.w * (T ? T.sx : 1), H = xf.h * (T ? T.sy : 1);
        const rot = ((xf.rot || 0) / 60000) % 360;
        if (Math.abs(rot - 90) < 1 || Math.abs(rot - 270) < 1) { const cx = X + W / 2, cy = Y + H / 2; [W, H] = [H, W]; X = cx - W / 2; Y = cy - H / 2; }
        const box = { x: sx(X), y: sx(Y), w: sx(W), h: sx(H) };
        const base = { name, ph: ph ? ph.type : null, group: groupId || null, ...box };

        if (nm === 'p:sp' || nm === 'p:cxnSp') {
          const geom = kid(spPr, 'a:prstGeom');
          const prst = geom ? attr(geom, 'prst', 'rect') : (kid(spPr, 'a:custGeom') ? 'cust' : 'rect');
          let { fill, line } = fillInfo(spPr, theme);
          if (!fill && !kid(spPr || n, 'a:noFill')) {
            // style reference fill (theme-styled shapes)
            const st = kid(n, 'p:style');
            const fr = st && kid(st, 'a:fillRef');
            if (fr && num(fr, 'idx', 0) > 0 && nm === 'p:sp' && !kid(kid(nv, 'p:cNvSpPr'), 'x') && attr(kid(nv, 'p:cNvSpPr'), 'txBox') !== '1') fill = colorOf(fr, theme);
            const lr = st && kid(st, 'a:lnRef');
            if (!line && lr && num(lr, 'idx', 0) > 0 && !(kid(spPr, 'a:ln') && kid(kid(spPr, 'a:ln'), 'a:noFill'))) line = colorOf(lr, theme);
          }
          const txBody = kid(n, 'p:txBody');
          let paras = [];
          if (txBody) {
            const isTitle = ph && (ph.type === 'title' || ph.type === 'ctrTitle');
            let inh = { sizes: null, def: null, bold: false };
            if (ph) {
              const lsts = [];
              if (inheritSp) { const l = kid(kid(inheritSp, 'p:txBody'), 'a:lstStyle'); if (l) lsts.push(l); }
              const ms = masterSizes(isTitle ? 'title' : 'body');
              inh.sizes = [0, 1, 2, 3, 4].map(l => { for (const ls of lsts) { const v = paraSizeDefaults(ls, l); if (v) return v; } return ms ? ms[l] : null; });
              if (isTitle) inh.bold = true;
            } else {
              inh.def = 1800;
            }
            paras = readParagraphs(txBody, theme, inh);
            if (ph && ph.type === 'body' && !isTitle) paras.forEach(p => { if (p.bullet === null) p.bullet = 'inherit'; });
          }
          const hasText = paras.some(p => p.text.trim());
          const isLine = nm === 'p:cxnSp' || ['line', 'straightConnector1', 'bentConnector2', 'bentConnector3', 'curvedConnector3'].includes(prst) || box.h < 2.5 || box.w < 2.5;
          if (isLine && !hasText) { els.push({ ...base, type: 'line', color: line || fill }); continue; }
          if (fill || line) els.push({ ...base, type: 'shape', prst, fill, line, hasText, txIdx: hasText ? els.length + 1 : null });
          if (hasText) {
            const bodyPr = kid(txBody, 'a:bodyPr');
            els.push({ ...base, type: 'text', paras, vert: attr(bodyPr, 'vert', null), filled: !!fill, fill });
          }
          continue;
        }
        if (nm === 'p:pic') {
          const bf = kid(n, 'p:blipFill');
          const blip = kid(bf, 'a:blip');
          if (!blip) continue;
          let rid = attr(blip, 'r:embed', null);
          let svgRid = null;
          for (const e of desc(blip, 'asvg:svgBlip')) svgRid = attr(e, 'r:embed', null);
          const sr = kid(bf, 'a:srcRect');
          const crop = sr ? { l: num(sr, 'l', 0) / 1e5, t: num(sr, 't', 0) / 1e5, r: num(sr, 'r', 0) / 1e5, b: num(sr, 'b', 0) / 1e5 } : null;
          const r = rid && slide.rels[rid];
          if (!r || r.external) continue;
          const mp = await loadMedia(r.target);
          let svgp = null;
          if (svgRid && slide.rels[svgRid]) svgp = await loadMedia(slide.rels[svgRid].target);
          const video = !!desc(nv, 'a:videoFile').length || !!desc(nv, 'p14:media').length;
          if (video) warnings.push({ slide: sIndex, msg: 'فيديو داخل السلايد — يُنقل كصورة غلاف فقط' });
          if (mp) els.push({ ...base, type: 'pic', media: mp, svg: svgp, crop, video });
          continue;
        }
        if (nm === 'p:graphicFrame') {
          const gd = desc(n, 'a:graphicData')[0];
          const uri = attr(gd, 'uri', '');
          if (uri.endsWith('/table')) {
            const rows = desc(gd, 'a:tr').map(tr => kids(tr, 'a:tc').map(tc => readParagraphs(kid(tc, 'a:txBody'), theme, { def: 1400 }).map(p => p.text).join('\n').trim()));
            els.push({ ...base, type: 'table', rows });
          } else if (uri.endsWith('/chart')) {
            const c = desc(gd, 'c:chart')[0];
            const r = c && slide.rels[c.getAttribute('r:id')];
            if (r) els.push({ ...base, type: 'chart', part: r.target });
          } else if (uri.endsWith('/diagram')) {
            // SmartArt: pull the text out of the data part
            const dm = desc(gd, 'dgm:relIds')[0];
            const r = dm && slide.rels[dm.getAttribute('r:dm')];
            let items = [];
            if (r) { const dd = await getPart(r.target); if (dd.doc) items = desc(dd.doc, 'dgm:pt').map(pt => desc(pt, 'a:t').map(t => t.textContent).join('').trim()).filter(Boolean); }
            warnings.push({ slide: sIndex, msg: 'SmartArt — نُقل نصّه كقائمة' });
            if (items.length) els.push({ ...base, type: 'text', paras: items.map(t => ({ text: t, size: 16, bold: false, bullet: 'char', lvl: 0 })), smartart: true });
          } else {
            warnings.push({ slide: sIndex, msg: 'عنصر غير مدعوم (' + uri.split('/').pop() + ') — تجاهلته' });
          }
        }
      }
    }
    await walk(desc(slide.doc, 'p:spTree')[0], null, null);

    // notes
    let notes = '';
    const nr = Object.values(slide.rels).find(r => r.type === 'notesSlide');
    if (nr) {
      const nd = await getPart(nr.target);
      if (nd.doc) {
        for (const sp of desc(nd.doc, 'p:sp')) {
          const p = phInfo(kid(sp, 'p:nvSpPr'));
          if (p && p.type === 'body') notes = desc(sp, 'a:p').map(pp => desc(pp, 'a:t').map(t => t.textContent).join('')).join('\n').trim();
        }
      }
    }
    slidesOut.push({ index: sIndex, layoutName, els, notes, bgDark, path: rel.target });
  }

  // language detection
  let ar = 0, la = 0;
  for (const s of slidesOut) for (const e of s.els) if (e.type === 'text') for (const p of e.paras) { ar += (p.text.match(AR_RE_G) || []).length; la += (p.text.match(LAT_RE_G) || []).length; }
  const lang = ar >= la * 0.6 ? 'ar' : 'en';
  return { slides: slidesOut, media, lang, warnings, srcRatio: srcW / srcH, zip };
}

if (typeof module !== 'undefined') module.exports = { parsePptx, kids, kid, desc, attr, num, AR_RE, lum, SW, SH, EMU, resolvePath, relsPathFor };

/* ============ صانع العروض — analyzer ============
   Turns positioned elements into a clean slide model:
   { type: cover|agenda|divider|content|closing, title, subtitle, eyebrow, sections:[...] } */

const NUM_RE = /^\s*[+\-−~≈]?\s*(SAR|USD|\$|€|ر\.?\s?س\.?|ريال)?\s*[+\-]?[\d٠-٩][\d٠-٩,.\s٬٫]*([–\-—~]\s*[\d٠-٩][\d٠-٩,.]*)?\s*(%|٪|K\+?|M\+?|B\+?|k|m|bn|مليون|مليار|ألف|الف|\+)?\s*(SAR|ريال|ر\.?\s?س\.?)?\s*$/i;
const DIGITS_ONLY = /^\s*[\d٠-٩]{1,3}\s*[.)]?\s*$/;
const CLOSING_RE = /^(thank\s*you|thanks|شكر|شكراً|شكرا|شكرًا|questions\??|q\s*&\s*a|أسئلة|نهاية العرض)/i;
const AGENDA_RE = /(agenda|contents|table of contents|outline|جدول الأعمال|جدول الاعمال|المحاور|المحتوى|محتويات|الأجندة|الاجندة|فهرس)/i;

function isAr(t) { return AR_RE.test(t); }
function clean(t) { return (t || '').replace(/\s+/g, ' ').trim(); }
function area(e) { return e.w * e.h; }
function cx(e) { return e.x + e.w / 2; }
function cy(e) { return e.y + e.h / 2; }
function inside(inner, outer, pad = 4) { const x = cx(inner), y = cy(inner); return x >= outer.x - pad && x <= outer.x + outer.w + pad && y >= outer.y - pad && y <= outer.y + outer.h + pad; }
function hOverlap(a, b) { return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)); }
function vOverlap(a, b) { return Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); }
function bbox(list) {
  const x = Math.min(...list.map(e => e.x)), y = Math.min(...list.map(e => e.y));
  const X = Math.max(...list.map(e => e.x + e.w)), Y = Math.max(...list.map(e => e.y + e.h));
  return { x, y, w: X - x, h: Y - y };
}
function isUpperLabel(t) { const s = clean(t); return s.length <= 34 && /[A-Z]/.test(s) && s === s.toUpperCase() && !/[a-z]/.test(s); }
function paraList(texts) { const out = []; for (const t of texts.sort((a, b) => a.y - b.y || a.x - b.x)) for (const p of t.paras) if (clean(p.text)) out.push({ ...p, text: p.text.replace(/\s*\n\s*/g, ' ').trim(), src: t }); return out; }
function median(a) { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
function mode(a) { const m = {}; let best = null, bc = 0; for (const v of a) { m[v] = (m[v] || 0) + 1; if (m[v] > bc) { bc = m[v]; best = v; } } return best; }

/* Parse a group of paragraphs (one card / one block) into an item */
function parseItem(paras, ctx = {}) {
  const item = {};
  let ps = paras.filter(p => clean(p.text));
  if (!ps.length) return item;
  // numbered markers "1" "2" in their own paragraphs -> numbered bullets
  const sizes = ps.map(p => p.size);
  const mx = Math.max(...sizes);
  const smaller = ps.filter(p => p.size < mx - 0.5);
  const bodySize = smaller.length ? (mode(smaller.filter(p => !p.bold).map(p => Math.round(p.size))) || mode(smaller.map(p => Math.round(p.size)))) : mx;
  // tag (pill text, e.g. RECOMMENDED)
  if (ctx.tags && ctx.tags.length) { item.tag = clean(ctx.tags.map(t => t.paras.map(p => p.text).join(' ')).join(' ')); ps = ps.filter(p => !ctx.tags.includes(p.src)); }
  // label
  if (ps.length > 1) {
    const p = ps[0];
    const short = clean(p.text).length <= 36;
    if (short && (isUpperLabel(p.text) || /^\s*[\d٠-٩]{1,2}\s{1,}\S/.test(p.text) && p.size <= bodySize + 1) && p.size <= Math.max(bodySize, 12) + 0.5) { item.label = clean(p.text); ps = ps.slice(1); }
    else if (short && p.size < bodySize - 0.5 && ps[1] && ps[1].size > p.size + 2) { item.label = clean(p.text); ps = ps.slice(1); }
  }
  // value (big number)
  const vi = ps.findIndex(p => NUM_RE.test(clean(p.text)) && clean(p.text).length <= 24 && (p.size >= Math.max(16, bodySize + 3) || ps.length <= 3 && p.bold));
  if (vi >= 0) { item.value = clean(ps[vi].text); ps.splice(vi, 1); }
  // title: first bold or larger paragraph
  if (ps.length) {
    const top = ps[0];
    const bigger = top.size >= bodySize + 1.5;
    if ((top.bold && ps.length > 1) || bigger || (ps.length === 1 && clean(top.text).length <= 60 && (top.bold || ctx.titleOnly))) { item.title = clean(top.text); ps = ps.slice(1); }
    // statement where title is split across several big paragraphs
    while (ps.length && item.title && ps[0].size >= top.size - 0.5 && ps[0].size > bodySize + 3 && !NUM_RE.test(ps[0].text)) { item.title += ' ' + clean(ps[0].text); ps = ps.slice(1); }
  }
  // note: last small paragraph
  if (ps.length >= 2) {
    const last = ps[ps.length - 1];
    if (last.size < bodySize - 0.9 || /^\s*[+*]\s/.test(last.text) && ps.length > 2) { item.note = clean(last.text); ps = ps.slice(0, -1); }
  }
  // numbered markers
  const merged = [];
  let numbered = false;
  for (let i = 0; i < ps.length; i++) {
    if (DIGITS_ONLY.test(ps[i].text) && ps[i + 1]) { numbered = true; merged.push({ ...ps[i + 1], text: ps[i + 1].text }); i++; }
    else merged.push(ps[i]);
  }
  ps = merged;
  if (ps.length >= 2 && (ps.every(p => clean(p.text).length <= 140) && (ps.filter(p => p.bullet && p.bullet !== 'none').length >= ps.length - 1 || numbered || ps.every(p => clean(p.text).length <= 70)))) {
    item.bullets = ps.map(p => clean(p.text)); if (numbered) item.numbered = true;
  } else if (ps.length) {
    item.text = ps.map(p => clean(p.text)).join('\n');
  }
  return item;
}

function itemTextLen(it) { return [it.label, it.title, it.value, it.text, it.note, ...(it.bullets || [])].filter(Boolean).join(' ').length; }

/* ---------- slide classification ---------- */
function analyzeSlide(s, i, total, lang, assets) {
  const els = s.els.slice();
  const rtl = lang === 'ar';
  const texts0 = els.filter(e => e.type === 'text');
  // drop slide numbers / footers / dates
  const dropped = [];
  const texts = texts0.filter(t => {
    const all = clean(t.paras.map(p => p.text).join(' '));
    if (['sldNum', 'ftr', 'dt'].includes(t.ph)) { dropped.push(t); return false; }
    if (/^[\d٠-٩]{1,3}$/.test(all) && (t.y > SH * 0.86 || t.y < SH * 0.08) && t.paras[0].size <= 14) { dropped.push(t); return false; }
    if (t.y > SH * 0.9 && t.paras.every(p => p.size <= 9) && all.length < 80) { dropped.push(t); return false; }
    if (/^(confidential|سري|internal)/i.test(all) && t.paras[0].size <= 10) { dropped.push(t); return false; }
    return true;
  });
  const pics = els.filter(e => e.type === 'pic');
  const shapes = els.filter(e => e.type === 'shape');
  const lines = els.filter(e => e.type === 'line');
  const tables = els.filter(e => e.type === 'table');
  const charts = els.filter(e => e.type === 'chart');
  const allText = texts.map(t => t.paras.map(p => p.text).join(' ')).join(' ').trim();

  // ---- title detection
  let title = null;
  const tph = texts.find(t => t.ph === 'title' || t.ph === 'ctrTitle');
  if (tph) title = tph;
  else {
    const cand = texts.filter(t => t.y < SH * 0.4 && clean(t.paras.map(p => p.text).join(' ')).length <= 120 && !NUM_RE.test(clean(t.paras.map(p => p.text).join(' '))));
    const score = t => Math.max(...t.paras.map(p => p.size)) + (t.y < SH * 0.2 ? 12 : 0) + (t.w > SW * 0.4 ? 6 : 0) - (t.filled ? 4 : 0);
    cand.sort((a, b) => score(b) - score(a) || a.y - b.y);
    if (cand.length) {
      const big = Math.max(...cand[0].paras.map(p => p.size));
      const others = texts.filter(t => t !== cand[0]).map(t => Math.max(...t.paras.map(p => p.size)));
      if (big >= 20 || others.every(o => o <= big)) title = cand[0];
    }
  }
  const titleText = title ? clean(title.paras.map(p => p.text).join(' ')) : '';
  const titleSize = title ? Math.max(...title.paras.map(p => p.size)) : 0;
  // eyebrow & subtitle
  let eyebrow = null, subtitle = null;
  if (title) {
    const above = texts.filter(t => t !== title && t.y + t.h <= title.y + 6 && title.y - (t.y + t.h) < 40 && hOverlap(t, title) > 0 && clean(t.paras.map(p => p.text).join(' ')).length <= 60 && Math.max(...t.paras.map(p => p.size)) <= titleSize * 0.7);
    if (above.length) eyebrow = above.sort((a, b) => b.y - a.y)[0];
    const below = texts.filter(t => t !== title && t !== eyebrow && t.y >= title.y + title.h - 8 && t.y - (title.y + title.h) < 34 && t.w >= title.w * 0.5 && Math.max(...t.paras.map(p => p.size)) < titleSize && t.paras.filter(p => clean(p.text)).length <= 1 && clean(t.paras.map(p => p.text).join(' ')).length <= 160 && !t.filled);
    if (below.length) subtitle = below.sort((a, b) => a.y - b.y)[0];
  }
  const used = new Set([title, eyebrow, subtitle].filter(Boolean));
  const rest = texts.filter(t => !used.has(t));
  const restText = rest.map(t => clean(t.paras.map(p => p.text).join(' '))).join(' ');
  const bigPics = pics.filter(p => area(p) > SW * SH * 0.06);
  const fullBleed = bigPics.filter(p => area(p) > SW * SH * 0.6);

  const base = { srcIndex: s.index, notes: s.notes || '' };
  const T = t => t ? clean(t.paras.map(p => p.text).join(' ')) : '';

  // ---- closing
  if (i === total - 1 && (CLOSING_RE.test(titleText) || CLOSING_RE.test(allText)) && allText.length < 140) {
    const extra = rest.map(T).filter(x => x && !CLOSING_RE.test(x));
    return { ...base, type: 'closing', title: titleText || (lang === 'ar' ? 'شكرًا لكم' : 'Thank You'), subtitle: [T(subtitle), ...extra].filter(Boolean).join(' · ') };
  }
  // ---- cover
  const boxedTexts = rest.filter(t => shapes.some(sh => !sh.hasText && sh.w >= 70 && sh.h >= 40 && sh.w < SW * 0.8 && inside(t, sh)));
  if (i === 0 && total > 1 && tables.length + charts.length === 0 && boxedTexts.length <= 2 && restText.length < 320) {
    const lines2 = rest.map(t => ({ t: T(t), y: t.y })).filter(o => o.t).sort((a, b) => a.y - b.y).map(o => o.t);
    return { ...base, type: 'cover', eyebrow: T(eyebrow), title: titleText || lines2.shift() || '', subtitle: T(subtitle) || '', lines: lines2.slice(0, 4) };
  }
  // ---- agenda
  if (AGENDA_RE.test(titleText) && rest.length) {
    const items = [];
    const ps = paraList(rest).filter(p => !DIGITS_ONLY.test(p.text));
    // pair title + small sub
    for (let k = 0; k < ps.length; k++) {
      const p = ps[k], n = ps[k + 1];
      if (n && n.size < p.size - 1 && n.src === p.src) { items.push({ title: clean(p.text), sub: clean(n.text) }); k++; }
      else items.push({ title: clean(p.text) });
    }
    if (items.length >= 2 && items.length <= 10) return { ...base, type: 'agenda', title: titleText, items };
  }
  // ---- divider
  const nonTitleTextLen = restText.length;
  if (i > 0 && title && titleText.length <= 70 && nonTitleTextLen <= 60 && bigPics.length === 0 && T(subtitle).length <= 90 && tables.length + charts.length === 0 && pics.filter(p => area(p) < SW * SH * 0.05).length <= 1 && (titleSize >= 24 || rest.length === 0) && (shapes.filter(sh => !sh.hasText && area(sh) > 8000 && area(sh) < SW * SH * 0.6).length === 0)) {
    return { ...base, type: 'divider', title: titleText, subtitle: [T(subtitle), restText].filter(Boolean).join(' ') };
  }

  // ---------------- content ----------------
  const slide = { ...base, type: 'content', eyebrow: T(eyebrow), title: titleText, subtitle: T(subtitle), sections: [] };
  // full-bleed photo with a short caption -> photo slide with the caption as its title
  if (fullBleed.length && !tables.length && !charts.length && restText.length <= 140 && rest.length <= 2 && (!title || !restText)) {
    const cap = rest.map(T).filter(Boolean);
    if (!slide.title) slide.title = cap.shift() || '';
    if (cap.length && !slide.subtitle) slide.subtitle = cap.join(' ');
    slide.sections.push({ kind: 'image', img: assets.addImage(fullBleed[0]), band: 1 });
    return slide;
  }
  if (s.bgDark) slide.wasDark = true;

  // containers
  const containers = shapes.filter(sh => sh.w >= 70 && sh.h >= 40 && area(sh) >= SW * SH * 0.012 && area(sh) < SW * SH * 0.62 && sh.fill !== 'IMG' && !['line', 'cust', 'rightArrow', 'leftArrow'].includes(sh.prst) && !(sh.y < 20 && sh.w > SW * 0.8));
  // remove containers that are just the background of a title/subtitle
  const cont = containers.filter(c => !rest.every(t => !inside(t, c)) || pics.some(p => inside(p, c) && area(p) < 9000));
  cont.sort((a, b) => area(a) - area(b));
  const owner = new Map(); // element -> container (smallest)
  const tagTexts = [];
  for (const t of rest) {
    const c = cont.find(c => inside(t, c));
    if (c) owner.set(t, c);
  }
  // pills: small filled shapes with short text inside a container -> tags
  for (const sh of shapes) {
    if (cont.includes(sh)) continue;
    if (sh.w < 170 && sh.h < 34 && sh.fill) {
      const t = rest.find(t => inside(t, sh, 2) && clean(t.paras.map(p => p.text).join(' ')).length <= 24);
      if (t && owner.has(t)) tagTexts.push(t);
    }
  }
  // icons
  const icons = pics.filter(p => area(p) <= 95 * 95 && p.w / p.h < 2.4 && p.h / p.w < 2.4);
  const images = pics.filter(p => !icons.includes(p) && area(p) > 95 * 95);
  for (const p of icons) {
    let c = cont.find(c => inside(p, c));
    if (!c) {
      // icon directly above a container
      c = cont.find(c => hOverlap(p, c) > p.w * 0.6 && p.y + p.h <= c.y + 4 && c.y - (p.y + p.h) < 70);
    }
    if (c) owner.set(p, c);
  }
  // build container items
  const contItems = [];
  for (const c of cont) {
    let ts = rest.filter(t => owner.get(t) === c);
    const ic = icons.filter(p => owner.get(p) === c);
    const mk = ts.filter(t => DIGITS_ONLY.test(T(t)) && t.w < 60);
    ts = ts.filter(t => !mk.includes(t));
    if (!ts.length) continue;
    // nested? skip containers fully inside another container that also holds texts (keep smaller as item, bigger becomes group)
    const tags = tagTexts.filter(t => owner.get(t) === c);
    const it = parseItem(paraList(ts), { tags });
    if (mk.length >= 2 && it.bullets) it.numbered = true;
    if (mk.length >= 2 && !it.bullets && it.text) { it.bullets = it.text.split('\n'); delete it.text; it.numbered = true; }
    if (ic.length) it.icon = assets.addIcon(ic.sort((a, b) => a.y - b.y)[0]);
    if (c.fill && c.fill !== 'IMG' && lum(c.fill) < 0.45) it.highlight = true;
    if (it.tag && /recommend|موصى|مقترح|الأفضل|best/i.test(it.tag)) it.highlight = true;
    contItems.push({ box: c, item: it, els: ts });
  }
  // nested container cleanup: if a container's box is inside another container that has items, drop the outer's duplicate texts
  // (outer containers already only own texts not owned by smaller ones)

  // loose elements
  const loose = rest.filter(t => !owner.has(t));
  const looseIcons = icons.filter(p => !owner.has(p));
  const markers = loose.filter(t => DIGITS_ONLY.test(T(t)) && t.w < 60);
  let units = loose.filter(t => !markers.includes(t)).map(t => ({ els: [t], box: { x: t.x, y: t.y, w: t.w, h: t.h } }));
  // attach icons / numeric markers to the closest unit on the same row (or just above)
  for (const m of [...looseIcons, ...markers]) {
    let best = null, bd = 1e9;
    for (const u of units) {
      const sameRow = vOverlap(m, u.box) > Math.min(m.h, 20) * 0.5 || Math.abs(cy(m) - (u.box.y + 10)) < 26;
      const gapX = m.x + m.w <= u.box.x ? u.box.x - (m.x + m.w) : (u.box.x + u.box.w <= m.x ? m.x - (u.box.x + u.box.w) : 0);
      const above = hOverlap(m, u.box) > m.w * 0.5 && m.y + m.h <= u.box.y + 6 ? u.box.y - (m.y + m.h) : 1e9;
      let d = 1e9;
      if (sameRow && gapX < 90) d = gapX;
      if (above < 60) d = Math.min(d, above + 5);
      if (d < bd) { bd = d; best = u; }
    }
    if (best) { best.marker = best.marker || m; }
  }
  // timeline detection
  const hLines = lines.filter(l => l.w > SW * 0.35 && l.h < 6);
  const dots = shapes.filter(sh => !sh.hasText && sh.w < 34 && sh.h < 34 && ['ellipse', 'roundRect', 'rect', 'flowChartConnector'].includes(sh.prst));
  let timeline = null;
  for (const L of hLines) {
    const ds = dots.filter(d => Math.abs(cy(d) - cy(L)) < 14 && cx(d) >= L.x - 30 && cx(d) <= L.x + L.w + 30);
    if (ds.length >= 3) {
      const us = units.filter(u => u.box.y >= L.y - 80 && u.box.y <= L.y + 80 && ds.some(d => Math.abs(cx(d) - (u.box.x + u.box.w / 2)) < 60));
      if (us.length >= 3) { timeline = { line: L, dots: ds, units: us }; break; }
    }
  }
  if (timeline) {
    units = units.filter(u => !timeline.units.includes(u));
    const ord = timeline.units.sort((a, b) => rtl ? (b.box.x - a.box.x) : (a.box.x - b.box.x));
    const items = ord.map(u => {
      const ps = paraList(u.els);
      const it = { date: clean(ps[0] ? ps[0].text : '') };
      const rest2 = ps.slice(1);
      if (rest2.length) { it.title = clean(rest2[0].text); if (rest2.length > 1) it.text = rest2.slice(1).map(p => clean(p.text)).join(' '); }
      return it;
    });
    const bb = bbox([timeline.line, ...timeline.units.map(u => u.box)]);
    slide.sections.push({ kind: 'timeline', items, _box: bb });
  }

  const slideBody = median(rest.flatMap(t => t.paras.filter(p => clean(p.text)).map(p => p.size))) || 14;
  // footnotes: small loose text at the bottom
  const allBoxes = [...contItems.map(c => c.box), ...units.map(u => u.box), ...images, ...tables, ...charts];
  const maxBottom = Math.max(0, ...allBoxes.map(b => b.y + b.h));
  const notes = [];
  units = units.filter(u => {
    const t = u.els[0];
    const small = t.paras.every(p => p.size <= Math.max(11, slideBody * 0.78));
    const lowest = u.box.y >= maxBottom - u.box.h - 4;
    if (small && lowest && !u.marker && (u.box.w > SW * 0.3 || u.box.y > SH * 0.8)) { notes.push({ text: T(t), box: u.box }); return false; }
    return true;
  });
  // notes inside nothing but under a container column (e.g. disclaimers) handled above

  // group loose units into lists / columns
  const unitItems = units.map(u => {
    const it = parseItem(paraList(u.els));
    if (u.marker) {
      if (u.marker.type === 'pic') it.icon = assets.addIcon(u.marker);
      else it.number = T(u.marker).replace(/[.)]/g, '');
    }
    return { box: u.box, item: it, unit: u };
  });
  // cluster by rows/cols
  const groups = clusterItems(unitItems);
  const sectionsRaw = [];
  for (const g of groups) {
    if (g.items.length === 1) {
      const it = g.items[0].item;
      const len = itemTextLen(it);
      const big = paraList(g.items[0].unit.els).some(p => p.size >= 20);
      let kind = 'text';
      if (it.bullets && !it.title && !it.label && !it.value) { sectionsRaw.push({ kind: 'bullets', items: it.bullets, numbered: !!it.numbered, _box: g.box }); continue; }
      if (big || it.value || it.label || (it.title && len < 400)) kind = 'feature';
      sectionsRaw.push(kind === 'text' ? { kind: 'text', text: [it.title, it.text, ...(it.bullets || [])].filter(Boolean).join('\n'), _box: g.box } : { kind: 'feature', item: it, _box: g.box });
    } else {
      sectionsRaw.push({ kind: g.dir === 'row' ? 'cards' : 'list', items: g.items.map(x => x.item), _box: g.box, _borderless: true });
    }
  }
  // containers → rows of cards
  const cgroups = clusterItems(contItems, true);
  for (const g of cgroups) {
    const its = g.items.map(x => x.item);
    if (its.length === 1) {
      const c = g.items[0];
      const wide = c.box.w > SW * 0.3;
      sectionsRaw.push({ kind: 'feature', item: its[0], boxed: true, _box: g.box, _wide: wide });
    } else if (g.dir === 'col') {
      sectionsRaw.push({ kind: 'cards', items: its, _box: g.box, cols: 1 });
    } else sectionsRaw.push({ kind: 'cards', items: its, _box: g.box });
  }
  for (const im of images) {
    if (fullBleed.includes(im) && (texts.length > 0)) {
      sectionsRaw.push({ kind: 'image', img: assets.addImage(im), bg: true, _box: im });
    } else sectionsRaw.push({ kind: 'image', img: assets.addImage(im), _box: im });
  }
  for (const t of tables) sectionsRaw.push({ kind: 'table', rows: t.rows, _box: t });
  for (const c of charts) sectionsRaw.push({ kind: 'chart', chart: assets.addChart(c), _box: c });
  if (notes.length) sectionsRaw.push({ kind: 'note', text: notes.map(n => n.text).join('\n'), _box: bbox(notes.map(n => n.box)) });

  // short loose text right above a section -> that section's heading
  for (const sec of sectionsRaw.slice()) {
    if (sec.kind !== 'text' || sec.text.length > 110 || sec.text.includes('\n')) continue;
    const below = sectionsRaw.filter(o => o !== sec && o._box && o._box.y >= sec._box.y + sec._box.h - 4 && o._box.y - (sec._box.y + sec._box.h) < 36 && hOverlap(o._box, sec._box) > 10);
    if (below.length === 1 && !below[0].heading) { below[0].heading = sec.text; below[0]._box = bbox([below[0]._box, sec._box]); sectionsRaw.splice(sectionsRaw.indexOf(sec), 1); }
  }
  // KPI promotion
  for (const sec of sectionsRaw) {
    if ((sec.kind === 'cards') && sec.items.length >= 2 && sec.items.every(it => it.value && !it.bullets && itemTextLen(it) < 160)) sec.kind = 'kpis';
  }
  // icon-less "list" with titles: keep
  slide.sections.push(...sectionsRaw);
  assignBands(slide, rtl);
  slide._dropped = dropped.length;
  return slide;
}

/* cluster items into rows (side by side, similar top) or columns (stacked, similar x) */
function clusterItems(arr, isContainers) {
  const left = arr.slice();
  const groups = [];
  while (left.length) {
    const a = left.shift();
    const row = [a], col = [a];
    for (const b of left) {
      const sameTop = Math.abs(a.box.y - b.box.y) < 18 && vOverlap(a.box, b.box) > Math.min(a.box.h, b.box.h) * 0.5;
      const sameSize = Math.abs(a.box.w - b.box.w) < Math.max(a.box.w, b.box.w) * 0.35;
      if (sameTop && (isContainers ? sameSize : true) && hOverlap(a.box, b.box) < 5) row.push(b);
      const sameX = Math.abs(a.box.x - b.box.x) < 24 && hOverlap(a.box, b.box) > Math.min(a.box.w, b.box.w) * 0.6;
      if (sameX && vOverlap(a.box, b.box) < 5) col.push(b);
    }
    let g;
    if (row.length >= col.length && row.length > 1) g = { dir: 'row', items: row };
    else if (col.length > 1) {
      // only chain items that are close vertically
      col.sort((p, q) => p.box.y - q.box.y);
      const chain = [col[0]];
      for (let k = 1; k < col.length; k++) { const prev = chain[chain.length - 1]; if (col[k].box.y - (prev.box.y + prev.box.h) < 60) chain.push(col[k]); }
      g = { dir: 'col', items: chain.length > 1 ? chain : [a] };
    } else g = { dir: 'row', items: [a] };
    for (const x of g.items) { const k = left.indexOf(x); if (k >= 0) left.splice(k, 1); }
    g.items.sort((p, q) => g.dir === 'row' ? (p.box.x - q.box.x) : (p.box.y - q.box.y));
    g.box = bbox(g.items.map(x => x.box));
    groups.push(g);
  }
  return groups;
}

/* bands: sections that sit side by side share a band; width = share of the row */
function assignBands(slide, rtl) {
  const secs = slide.sections.filter(s => s._box);
  secs.sort((a, b) => a._box.y - b._box.y);
  const bands = [];
  for (const s of secs) {
    let band = bands.find(b => b.secs.some(o => vOverlap(o._box, s._box) > Math.min(o._box.h, s._box.h) * 0.45 && hOverlap(o._box, s._box) < 12));
    if (s.kind === 'note' || s.kind === 'timeline') band = null;
    if (!band) { band = { secs: [], y: s._box.y }; bands.push(band); }
    band.secs.push(s);
  }
  bands.sort((a, b) => a.y - b.y);
  const ordered = [];
  bands.forEach((b, bi) => {
    b.secs.sort((p, q) => rtl ? (q._box.x - p._box.x) : (p._box.x - q._box.x));
    const tw = b.secs.reduce((s, x) => s + x._box.w, 0);
    for (const s of b.secs) {
      s.band = bi + 1;
      if (b.secs.length > 1) s.width = Math.round(Math.max(0.28, Math.min(0.72, s._box.w / tw)) * 100) / 100;
      ordered.push(s);
    }
  });
  // items inside rows follow reading order
  for (const s of ordered) {
    if (rtl && s.items && ['cards', 'kpis'].includes(s.kind) && s.cols !== 1) s.items.reverse();
  }
  slide.sections = ordered;
}

/* ---------- assets registry ---------- */
function makeAssets(parsed) {
  const list = {};
  let n = 0;
  function reg(kind, e) {
    const key = kind + ':' + (e.media || e.part) + ':' + (e.crop ? JSON.stringify(e.crop) : '');
    for (const [id, a] of Object.entries(list)) if (a.key === key) return id;
    const id = (kind === 'icon' ? 'i' : kind === 'chart' ? 'c' : 'm') + (++n);
    list[id] = { key, kind, media: e.media, svg: e.svg, crop: e.crop, part: e.part, srcW: e.w, srcH: e.h };
    return id;
  }
  return { list, addIcon: e => reg('icon', e), addImage: e => reg('image', e), addChart: e => reg('chart', e) };
}

/* JEDCO naming rules for KAIA terminals */
function applyNaming(model) {
  const changes = [], flags = [];
  const rules = [
    [/الصالة الجنوبية/g, 'الصالة 4'],
    [/(مجمع )?صالات الحج والعمرة/g, 'الصالة 3ب (مجمع صالات الحج والعمرة)'],
  ];
  function fix(str, where) {
    if (typeof str !== 'string') return str;
    let out = str;
    if (/الصالة 3ب \(مجمع صالات الحج والعمرة\)/.test(out)) return out;
    for (const [re, rep] of rules) out = out.replace(re, (m, g1) => { if (g1) return m; changes.push({ where, from: m, to: rep }); return rep; });
    if (/الصالة الشمالية|north terminal/i.test(out)) flags.push({ where, text: out });
    return out;
  }
  function walk(o, where) {
    if (Array.isArray(o)) return o.map(x => walk(x, where));
    if (o && typeof o === 'object') { for (const k of Object.keys(o)) if (!['img', 'icon', 'chart', 'kind', 'type'].includes(k)) o[k] = walk(o[k], where); return o; }
    return fix(o, where);
  }
  model.slides.forEach((s, i) => walk(s, i + 1));
  return { changes, flags };
}

function analyzeDeck(parsed) {
  const assets = makeAssets(parsed);
  const lang = parsed.lang;
  const slides = parsed.slides.map((s, i) => analyzeSlide(s, i, parsed.slides.length, lang, assets));
  const model = { lang, slides };
  stripInternal(model);
  return { model, assets: assets.list };
}
function stripInternal(model) {
  for (const s of model.slides) {
    if (!s.sections) continue;
    for (const sec of s.sections) { delete sec._box; delete sec._borderless; delete sec._wide; }
    if (!s.eyebrow) delete s.eyebrow;
    if (!s.subtitle) delete s.subtitle;
  }
}

if (typeof module !== 'undefined') {
  const P = require('./parse.js');
  global.AR_RE = P.AR_RE; global.SW = P.SW; global.SH = P.SH; global.lum = P.lum;
  module.exports = { analyzeDeck, parseItem, NUM_RE, applyNaming };
}

/* ============ صانع العروض — layout engine ============
   model slide + options -> primitives (shared by the live preview and the PPTX writer).
   Coordinates in points on a 960x540 canvas. */

const C = {
  NAVY: '002657', BLUE: '004EAA', LIGHT: '62B6F3', TEXT: '2B3442', GRAY: '4D5766', MUTED: '7C8796',
  LINE: 'CFDDEE', LINE2: 'E4ECF6', WHITE: 'FFFFFF', TEAL: '00B2BA', TINT: 'EEF4FB'
};
const L_AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

const DEFAULT_SIZES = {
  ar: { title: 32, subtitle: 17, eyebrow: 13, heading: 15, featureTitle: 26, cardTitle: 19, body: 16, bullets: 18, label: 13.5, note: 13, kpi: 46, value: 27, coverTitle: 48, dividerTitle: 40 },
  en: { title: 26, subtitle: 14.5, eyebrow: 11, heading: 12, featureTitle: 22, cardTitle: 16, body: 13.5, bullets: 15.5, label: 11, note: 11, kpi: 42, value: 24, coverTitle: 40, dividerTitle: 30 }
};
const PALETTES = {
  brand: ['004EAA', '002657', '62B6F3', '00B2BA'],
  blues: ['002657', '004EAA', '2F7DD3', '62B6F3'],
  mono: ['004EAA', '004EAA', '004EAA', '004EAA']
};
const DEFAULT_OPTS = { cardStyle: 'color', palette: 'brand', sizesMode: 'auto', sizes: DEFAULT_SIZES, imageMode: 'door' };

/* ---------- text measuring (font-metric approximations) ---------- */
const FW = { ar: 0.5, head: 0.64, body: 0.52 };
function fontKey(role, text) { if (L_AR.test(text)) return 'ar'; return role === 'head' || role === 'num' ? 'head' : 'body'; }
function charW(ch, k) {
  let f = FW[k];
  if (ch === ' ') return f * 0.55;
  if (k !== 'ar') {
    if (/[A-Z]/.test(ch)) f *= 1.18;
    else if (/[ilIj.,'|:;!()\[\]]/.test(ch)) f *= 0.5;
    else if (/[mwMW]/.test(ch)) f *= 1.35;
  } else if (!L_AR.test(ch) && /[A-Za-z0-9]/.test(ch)) f = FW.body;
  return f;
}
function textW(str, size, role, bold) {
  if (typeof MEASURE === 'function') { const m = MEASURE(str, size, role, bold); if (m != null) return m; }
  const k = fontKey(role, str);
  let w = 0; for (const ch of str) w += charW(ch, k);
  return w * size * (bold ? 1.06 : 1) * (role === 'label' ? 1.12 : 1);
}
function lineCount(str, size, role, bold, width) {
  if (!str) return 0;
  // a box can be squeezed to zero or less while layouts are tried; never let that loop forever
  if (!(width > 8)) width = 8;
  let lines = 0;
  for (const seg of String(str).split('\n')) {
    const words = seg.split(/\s+/).filter(Boolean);
    if (!words.length) { lines++; continue; }
    let cur = 0, n = 1;
    const sp = textW(' ', size, role, bold);
    for (const w of words) {
      const ww = textW(w, size, role, bold);
      if (cur > 0 && cur + sp + ww > width) { n++; cur = ww; } else cur += (cur > 0 ? sp : 0) + ww;
      if (cur > width * 1.02 && ww > width) { const k = Math.ceil(cur / width) - 1; n += k; cur -= k * width; }
    }
    lines += n;
  }
  return lines;
}
function parasHeight(paras, width) {
  let h = 0;
  paras.forEach((p, i) => {
    const w = width - (p.bullet ? p.size * 1.3 : 0);
    const n = lineCount(p.caps ? p.t.toUpperCase() : p.t, p.size, p.role, p.bold, w);
    h += n * p.size * (p.lh || 1.18) + (i ? (p.sb || 0) : 0) + (p.sa || 0);
  });
  return h;
}
function fitParas(paras, w, h, minScale = 0.6) {
  let s = 1;
  const scaled = k => paras.map(p => ({ ...p, size: Math.round(p.size * k * 2) / 2, sb: (p.sb || 0) * k }));
  while (s > minScale && parasHeight(scaled(s), w) > h) s -= 0.04;
  return scaled(s);
}

/* shrink any paragraph whose longest word cannot fit the column (avoids words breaking mid-way) */
function fitWords(paras, w) {
  for (const p of paras) {
    const words = p.role === 'num' && p.t.length <= 26 ? [p.t] : String(p.caps ? p.t.toUpperCase() : p.t).split(/\s+/);
    const avail = w - (p.bullet ? p.size * 1.3 : 0);
    let longest = words.reduce((a, x) => x.length > a.length ? x : a, '');
    const floor = p.role === 'num' ? Math.max(8, p.size * 0.6) : 8;
    while (p.size > floor && textW(longest, p.size, p.role, p.bold) > avail) p.size = Math.round((p.size - 0.5) * 2) / 2;
  }
  return paras;
}

/* ---------- primitive helpers ---------- */
function P(t, size, o = {}) { return { t: String(t == null ? '' : t), size, role: o.role || 'body', bold: !!o.bold, color: o.color || C.GRAY, sb: o.sb || 0, sa: o.sa || 0, lh: o.lh || 1.18, bullet: o.bullet || null, spc: o.spc || 0, caps: !!o.caps, bulletColor: o.bulletColor, ref: o.ref || null, line: o.line }; }
const J = (base, ...k) => base ? base.concat(k) : null;
function T(x, y, w, h, paras, o = {}) { return { k: 'text', x, y, w, h, paras, anchor: o.anchor || 't', align: o.align || 'start', name: o.name || 'Text' }; }
function iconPrim(id, x, y, s, color, item) { return { k: 'icon', asset: id, x, y, w: s, h: s, color: color || C.BLUE, item: item || null }; }

/* ---------- themes (text colours per surface) ---------- */
function surface(fill, dark) {
  if (dark) return { fill: null, fg: 'FFFFFF', body: 'E3ECF7', accent: '9FD3FA', value: 'FFFFFF', muted: 'B9C9DD', icon: 'FFFFFF', line: '6F8FBF', bullet: '9FD3FA' };
  if (!fill) return { fill: null, fg: C.NAVY, body: C.GRAY, accent: C.BLUE, value: C.BLUE, muted: C.MUTED, icon: C.BLUE, line: C.LINE2, bullet: C.BLUE };
  if (fill === C.TINT) return { fill, fg: C.NAVY, body: C.GRAY, accent: C.BLUE, value: C.BLUE, muted: C.MUTED, icon: C.BLUE, line: 'D5E3F3', bullet: C.BLUE };
  if (fill === '62B6F3') return { fill, fg: C.NAVY, body: '0F2E55', accent: C.NAVY, value: C.NAVY, muted: '1E4673', icon: C.NAVY, line: '8CCBF7', bullet: C.NAVY };
  return { fill, fg: 'FFFFFF', body: 'E6EEF8', accent: '9FD3FA', value: 'FFFFFF', muted: 'C6D6EA', icon: 'FFFFFF', line: '4F7DBE', bullet: '9FD3FA' };
}
function cardSurfaces(items, ctx) {
  const pal = PALETTES[ctx.opt.palette] || PALETTES.brand;
  const anyHi = items.some(i => i.highlight) && !items.every(i => i.highlight);
  return items.map((it, i) => {
    if (ctx.cardStyle === 'plain') return { ...surface(null, ctx.dark), rule: ctx.dark ? '4F6E9E' : 'C9D1DC' };
    if (ctx.dark) return { ...surface(null, true), frame: 'FFFFFF', frameAlpha: 35 };
    if (ctx.cardStyle === 'outline') return { ...surface(null), frame: it.highlight && anyHi ? C.BLUE : C.LINE, frameW: it.highlight && anyHi ? 1.5 : 0.9 };
    if (anyHi) return it.highlight ? surface(C.NAVY) : surface(C.TINT);
    return surface(pal[i % pal.length]);
  });
}

/* ---------- context ---------- */
function ctxFor(lang, opt, slide) {
  const rtl = lang === 'ar';
  const o = Object.assign({}, DEFAULT_OPTS, opt || {});
  const sizes = Object.assign({}, DEFAULT_SIZES[lang], (o.sizes && o.sizes[lang]) || {});
  return { rtl, lang, X0: 48, X1: 912, Y1: 506, opt: o, Z: sizes, cardStyle: (slide && slide.cardStyle) || o.cardStyle, dark: false };
}

/* ================= HEADER ================= */
function header(slide, ctx, area) {
  const out = [];
  const x = area.x, w = area.w, Z = ctx.Z;
  const en = !ctx.rtl;
  const col = ctx.dark ? { e: '9FD3FA', t: 'FFFFFF', s: 'DCE6F2' } : { e: C.BLUE, t: C.NAVY, s: C.MUTED };
  let y = area.top || 46;
  if (slide.eyebrow) {
    out.push(T(x, y, w, Z.eyebrow + 4, [P(slide.eyebrow, Z.eyebrow, { role: 'label', bold: true, color: col.e, spc: en ? 120 : 0, caps: en, ref: ['eyebrow'] })], { name: 'Eyebrow' }));
    y += Z.eyebrow + 8;
  }
  if (slide.title) {
    let paras = [P(slide.title, Z.title, { role: 'head', bold: true, color: col.t, lh: 1.08, ref: ['title'] })];
    const maxH = Z.title * 2.4;
    if (ctx.opt.sizesMode !== 'fixed') paras = fitParas(paras, w, maxH, 0.7);
    const h = Math.min(maxH, parasHeight(paras, w) + 2);
    out.push(T(x, y, w, h, paras, { name: 'Title' }));
    y += h + 6;
  }
  if (slide.subtitle) {
    let paras = [P(slide.subtitle, Z.subtitle, { color: col.s, ref: ['subtitle'] })];
    if (ctx.opt.sizesMode !== 'fixed') paras = fitParas(paras, w, Z.subtitle * 2.6, 0.8);
    const h = parasHeight(paras, w) + 2;
    out.push(T(x, y, w, h, paras, { name: 'Subtitle' }));
    y += h;
  }
  return { prims: out, bottom: y };
}

/* ================= SECTIONS ================= */
function headingBlock(sec, r, ctx, S, base) {
  if (!sec.heading) return { prims: [], h: 0 };
  const en = !ctx.rtl;
  const paras = [P(sec.heading, ctx.Z.heading * S, { role: 'label', bold: true, color: ctx.dark ? '9FD3FA' : C.BLUE, spc: en ? 100 : 0, caps: en && /^[^a-z]*$/.test(sec.heading.split('(')[0]), ref: J(base, 'heading') })];
  const h = parasHeight(paras, r.w) + 2;
  return { prims: [T(r.x, r.y, r.w, h, paras, { name: 'Heading' })], h: h + 10 * S };
}

function itemParas(it, ctx, S, sf, o = {}, base = null) {
  const en = !ctx.rtl, Z = ctx.Z;
  const ps = [];
  const big = o.big;
  if (it.label) ps.push(P(it.label, Z.label * S, { role: 'label', bold: true, color: sf.accent, spc: en ? 80 : 0, sa: 5 * S, ref: J(base, 'label') }));
  if (it.title) ps.push(P(it.title, (big ? Z.featureTitle : Z.cardTitle) * S, { bold: true, color: sf.fg, lh: 1.15, sa: 5 * S, ref: J(base, 'title') }));
  if (it.value) ps.push(P(it.value, (big ? Z.value * 1.25 : Z.value) * S, { role: 'num', color: sf.value, lh: 1.05, sb: 3 * S, sa: 6 * S, ref: J(base, 'value') }));
  if (it.text) String(it.text).split('\n').forEach((line, li) => ps.push(P(line, (big ? Z.body * 1.12 : Z.body) * S, { color: sf.body, sa: 4 * S, ref: J(base, 'text'), line: li })));
  if (it.bullets) it.bullets.forEach((b, i) => ps.push(P(b, (big ? Z.body * 1.08 : Z.body) * S, { color: sf.body, sb: (i ? 4 : 2) * S, bullet: it.numbered ? 'num' : 'dot', bulletColor: sf.bullet, ref: J(base, 'bullets', i) })));
  return ps;
}
function noteParas(it, ctx, S, sf, base) { return it.note ? [P(it.note, ctx.Z.note * S, { color: sf.muted, ref: J(base, 'note') })] : []; }

function renderCard(it, r, ctx, S, sf, measure, base) {
  const boxed = !!(sf.fill || sf.frame);
  const pad = (boxed ? 18 : 0) * S;
  const prims = [];
  const iw = r.w - pad * 2;
  const imgH = it.img ? Math.round(Math.min(150, r.w * 0.56) * S) : 0;
  let y = r.y + (imgH ? imgH + 14 * S : pad) + (sf.rule ? 4 * S : 0);
  const start = ctx.rtl ? r.x + r.w - pad : r.x + pad;
  let tagPrim = null;
  if (it.tag) {
    const tp = [P(it.tag, ctx.Z.label * 0.9 * S, { role: 'label', bold: true, color: sf.accent, spc: ctx.rtl ? 0 : 100, caps: !ctx.rtl, ref: J(base, 'tag') })];
    const tw = Math.min(iw * 0.6, textW(it.tag, tp[0].size, 'label', true) * 1.1 + 4);
    if (!it.icon) { tagPrim = T(ctx.rtl ? r.x + r.w - pad - tw : r.x + pad, y, tw, 14 * S, tp, { name: 'Tag' }); y += 18 * S; }
    else tagPrim = T(ctx.rtl ? r.x + pad : r.x + r.w - pad - tw, y + 4 * S, tw, 14 * S, tp, { name: 'Tag', align: 'end' });
  }
  if (it.icon) {
    const s = 30 * S;
    prims.push(iconPrim(it.icon, ctx.rtl ? start - s : start, y, s, sf.icon, base));
    y += s + 12 * S;
  }
  const main = fitWords(itemParas(it, ctx, S, sf, {}, base), iw);
  const mh = parasHeight(main, iw);
  const notes = noteParas(it, ctx, S, sf, base);
  const nh = notes.length ? parasHeight(notes, iw) : 0;
  const need = (y - r.y) + mh + (nh ? nh + 14 * S : 0) + pad;
  if (measure) return { prims: [], h: need };
  const H = Math.max(r.h, need);
  if (boxed) prims.unshift({ k: 'rect', x: r.x, y: r.y, w: r.w, h: H, r: 14, fill: sf.fill, stroke: sf.frame || null, sw: sf.frameW || 1, alpha: sf.frameAlpha, item: base });
  else if (sf.rule) prims.unshift({ k: 'line', x: r.x, y: r.y - 12 * S, w: r.w, h: 0, color: sf.rule, sw: 0.75 });
  if (imgH) prims.splice(1, 0, { k: 'image', asset: it.img, x: r.x, y: r.y, w: r.w, h: imgH, round: 'top', radius: 14, item: base });
  if (tagPrim) prims.push(tagPrim);
  prims.push(T(r.x + pad, y, iw, mh + 4, main, { name: 'Card text' }));
  if (nh) {
    const ny = r.y + H - pad - nh;
    prims.push({ k: 'line', x: r.x + pad, y: ny - 8 * S, w: iw, h: 0, color: sf.line, sw: 0.75 });
    prims.push(T(r.x + pad, ny, iw, nh + 2, notes, { name: 'Card note' }));
  }
  return { prims, h: H };
}

const SECTIONS = {
  cards(sec, r, ctx, S, measure, B) {
    const n = sec.items.length;
    let cols = sec.cols || (n <= 4 ? n : (n === 5 ? 5 : Math.ceil(n / 2)));
    if (cols > 1 && r.w / cols < 150) cols = Math.max(1, Math.floor(r.w / 150));
    const rows = Math.ceil(n / cols);
    const gap = 16 * S;
    const cw = (r.w - gap * (cols - 1)) / cols;
    const sfs = cardSurfaces(sec.items, ctx);
    const rowH = [];
    for (let ri = 0; ri < rows; ri++) {
      let m = 0;
      for (let ci = 0; ci < cols; ci++) { const k = ri * cols + ci; const it = sec.items[k]; if (!it) continue; m = Math.max(m, renderCard(it, { x: 0, y: 0, w: cw, h: 0 }, ctx, S, sfs[k], true, J(B, 'items', k)).h); }
      rowH.push(m);
    }
    const need = rowH.reduce((a, b) => a + b, 0) + gap * (rows - 1);
    if (measure) return { h: need };
    const extra = Math.max(0, r.h - need) / rows;
    const prims = [];
    let y = r.y;
    for (let ri = 0; ri < rows; ri++) {
      const h = rowH[ri] + (rows === 1 ? Math.min(extra, rowH[ri] * 0.5) : Math.min(extra, 30));
      for (let ci = 0; ci < cols; ci++) {
        const k = ri * cols + ci; const it = sec.items[k]; if (!it) continue;
        const x = ctx.rtl ? r.x + r.w - (ci + 1) * cw - ci * gap : r.x + ci * (cw + gap);
        prims.push(...renderCard(it, { x, y, w: cw, h }, ctx, S, sfs[k], false, J(B, 'items', k)).prims);
      }
      y += h + gap;
    }
    return { prims, h: y - gap - r.y };
  },

  kpis(sec, r, ctx, S, measure, B) {
    const n = sec.items.length;
    const cols = n <= 5 ? n : Math.ceil(n / 2);
    const rows = Math.ceil(n / cols);
    const colored = ctx.cardStyle === 'color' && !ctx.dark;
    const gap = colored ? 14 * S : 0;
    const cw = (r.w - gap * (cols - 1)) / cols;
    const pad = (colored ? 18 : 14) * S;
    const sfs = colored ? cardSurfaces(sec.items, ctx) : sec.items.map(() => surface(null, ctx.dark));
    const blocks = sec.items.map((it, k) => {
      const sf = sfs[k];
      let vsize = ctx.Z.kpi * S;
      if (it.value) while (vsize > 14 && textW(it.value, vsize, 'num') > cw - pad * 2) vsize -= 1;
      const ps = [];
      const b0 = J(B, 'items', k);
      if (it.value) ps.push(P(it.value, vsize, { role: 'num', color: sf.value, lh: 1.05, sa: 8 * S, ref: J(b0, 'value') }));
      if (it.title) ps.push(P(it.title, ctx.Z.cardTitle * 0.95 * S, { bold: true, color: sf.fg, sa: 3 * S, ref: J(b0, 'title') }));
      if (it.text) ps.push(P(it.text, ctx.Z.body * 0.95 * S, { color: sf.body, ref: J(b0, 'text') }));
      if (it.note) ps.push(P(it.note, ctx.Z.note * S, { color: sf.muted, sb: 4 * S, ref: J(b0, 'note') }));
      const ih = it.icon ? 36 * S : 0;
      fitWords(ps, cw - pad * 2);
      return { ps, h: parasHeight(ps, cw - pad * 2) + ih, ih, it, sf };
    });
    // same role, same size across the row
    const minT = Math.min(...blocks.map(b => (b.ps.find(p => p.bold) || { size: 99 }).size));
    blocks.forEach(b => { const t = b.ps.find(p => p.bold); if (t) t.size = minT; b.h = parasHeight(b.ps, cw - pad * 2) + b.ih; });
    const rowH = [];
    for (let ri = 0; ri < rows; ri++) rowH.push(Math.max(...blocks.slice(ri * cols, ri * cols + cols).map(b => b.h)) + (colored ? pad * 2 : 16 * S));
    const vgap = 16 * S;
    const need = rowH.reduce((a, b) => a + b, 0) + vgap * (rows - 1);
    if (measure) return { h: need };
    const prims = [];
    const stretch = colored && rows === 1 ? Math.min(Math.max(0, r.h - need), need * 0.35) : 0;
    let y = r.y + (colored ? 0 : Math.max(0, (r.h - need) / 2));
    for (let ri = 0; ri < rows; ri++) {
      const RH = rowH[ri] + stretch;
      for (let ci = 0; ci < cols; ci++) {
        const b = blocks[ri * cols + ci]; if (!b) continue;
        const x = ctx.rtl ? r.x + r.w - (ci + 1) * cw - ci * gap : r.x + ci * (cw + gap);
        if (colored) prims.push({ k: 'rect', x, y, w: cw, h: RH, r: 14, fill: b.sf.fill, item: J(B, 'items', ri * cols + ci) });
        else if (ci > 0) prims.push({ k: 'line', x: ctx.rtl ? x + cw : x, y: y + 4 * S, w: 0, h: RH - 8 * S, color: ctx.dark ? '6F8FBF' : C.LINE, sw: 0.9 });
        let yy = y + (colored ? pad + (RH - rowH[ri]) / 2 : 8 * S);
        if (b.it.icon) { prims.push(iconPrim(b.it.icon, x + cw / 2 - 14 * S, yy, 28 * S, b.sf.icon, J(B, 'items', ri * cols + ci))); yy += b.ih; }
        prims.push(T(x + pad, yy, cw - pad * 2, b.h - b.ih + 4, b.ps, { align: 'center', name: 'KPI' }));
      }
      y += RH + vgap;
    }
    return { prims, h: y - vgap - r.y };
  },

  list(sec, r, ctx, S, measure, B) {
    const Z = ctx.Z;
    const sf = surface(null, ctx.dark);
    const mk = sec.items.some(it => it.icon || it.number) ? 44 * S : 0;
    const tw = r.w - mk;
    const rows = sec.items.map((it, i) => {
      const ps = [];
      const b0 = J(B, 'items', i);
      if (it.label) ps.push(P(it.label, Z.label * S, { role: 'label', bold: true, color: sf.accent, sa: 3 * S, spc: ctx.rtl ? 0 : 80, ref: J(b0, 'label') }));
      if (it.title) ps.push(P(it.title, Z.cardTitle * S, { bold: true, color: sf.fg, sa: 3 * S, ref: J(b0, 'title') }));
      if (it.value) ps.push(P(it.value, Z.value * 0.9 * S, { role: 'num', color: sf.value, sa: 3 * S, ref: J(b0, 'value') }));
      if (it.text) ps.push(P(it.text, (it.title ? Z.body : Z.body * 1.12) * S, { color: it.title ? sf.body : (ctx.dark ? 'FFFFFF' : C.TEXT), ref: J(b0, 'text') }));
      if (it.bullets) it.bullets.forEach((b, bi) => ps.push(P(b, Z.body * S, { color: sf.body, bullet: 'dot', sb: 3 * S, bulletColor: sf.bullet, ref: J(b0, 'bullets', bi) })));
      if (it.note) ps.push(P(it.note, Z.note * S, { color: sf.muted, sb: 3 * S, ref: J(b0, 'note') }));
      fitWords(ps, tw);
      return { ps, h: Math.max(parasHeight(ps, tw), mk ? 28 * S : 0), it, i };
    });
    const gap = 12 * S;
    const need = rows.reduce((a, b) => a + b.h, 0) + gap * 2 * (rows.length - 1);
    if (measure) return { h: need };
    const extra = Math.max(0, r.h - need) / Math.max(1, rows.length);
    const prims = [];
    let y = r.y + Math.min(extra / 2, 10);
    rows.forEach((row, i) => {
      const h = row.h + Math.min(extra, 24 * S);
      const mx = ctx.rtl ? r.x + r.w - mk : r.x;
      const tx = ctx.rtl ? r.x : r.x + mk;
      if (row.it.icon) prims.push(iconPrim(row.it.icon, ctx.rtl ? r.x + r.w - 28 * S : r.x, y, 28 * S, sf.icon, J(B, 'items', i)));
      else if (row.it.number) prims.push(T(mx, y - 2 * S, mk - 6 * S, 28 * S, [P(String(row.it.number).padStart(2, '0'), 17 * S, { role: 'num', color: ctx.dark ? '9FD3FA' : C.LIGHT, ref: J(B, 'items', i, 'number') })], { name: 'Number' }));
      prims.push(T(tx, y, tw, row.h + 4, row.ps, { name: 'List item' }));
      y += h;
      if (i < rows.length - 1) { prims.push({ k: 'line', x: r.x, y: y + gap - 0.5, w: r.w, h: 0, color: ctx.dark ? '4F6E9E' : C.LINE2, sw: 0.75 }); y += gap * 2; }
    });
    return { prims, h: y - r.y };
  },

  feature(sec, r, ctx, S, measure, B) {
    const it = sec.item || {};
    const boxed = sec.boxed;
    let sf;
    if (ctx.dark) sf = surface(null, true);
    else if (boxed && ctx.cardStyle === 'color') sf = surface(it.highlight === false ? C.TINT : C.NAVY);
    else if (boxed) sf = { ...surface(null), frame: it.highlight ? C.BLUE : C.LINE, frameW: it.highlight ? 1.5 : 1 };
    else sf = surface(null);
    const pad = boxed ? 24 * S : 0, iw = r.w - pad * 2;
    const ps = fitWords(itemParas(it, ctx, S, sf, { big: true }, J(B, 'item')), r.w - (boxed ? 48 * S : 0));
    const ns = noteParas(it, ctx, S, sf, J(B, 'item'));
    const ih = it.icon ? 44 * S : 0;
    const need = pad * 2 + ih + parasHeight(ps, iw) + (ns.length ? parasHeight(ns, iw) + 16 * S : 0);
    if (measure) return { h: need };
    const H = boxed ? Math.max(need, r.h) : need;
    const prims = [];
    if (boxed) prims.push({ k: 'rect', x: r.x, y: r.y, w: r.w, h: H, r: 16, fill: sf.fill, stroke: sf.frame || null, sw: sf.frameW || 1, item: J(B, 'item') });
    let y = r.y + pad + (boxed && !ns.length ? (H - need) / 2 : 0);
    if (it.icon) { prims.push(iconPrim(it.icon, ctx.rtl ? r.x + r.w - pad - 34 * S : r.x + pad, y, 34 * S, sf.icon, J(B, 'item'))); y += ih; }
    prims.push(T(r.x + pad, y, iw, parasHeight(ps, iw) + 4, ps, { name: 'Feature text' }));
    if (ns.length) {
      const nh = parasHeight(ns, iw);
      const ny = boxed ? r.y + H - pad - nh : y + parasHeight(ps, iw) + 12 * S;
      prims.push(T(r.x + pad, ny, iw, nh + 2, ns, { name: 'Feature note' }));
    }
    return { prims, h: H };
  },

  timeline(sec, r, ctx, S, measure, B) {
    const n = sec.items.length;
    const cw = r.w / n;
    const pad = 8 * S;
    const pal = PALETTES[ctx.opt.palette] || PALETTES.brand;
    const sf = surface(null, ctx.dark);
    const blocks = sec.items.map((it, k) => {
      const b0 = J(B, 'items', k);
      const top = [P(it.date || '', ctx.Z.cardTitle * 0.95 * S, { role: 'num', color: sf.value, ref: J(b0, 'date') })];
      const bot = [];
      if (it.title) bot.push(P(it.title, ctx.Z.cardTitle * 0.88 * S, { bold: true, color: sf.fg, sa: 2 * S, ref: J(b0, 'title') }));
      if (it.text) bot.push(P(it.text, ctx.Z.body * 0.92 * S, { color: sf.body, ref: J(b0, 'text') }));
      return { top, bot, th: parasHeight(top, cw - pad * 2), bh: parasHeight(bot, cw - pad * 2) };
    });
    const th = Math.max(...blocks.map(b => b.th)), bh = Math.max(...blocks.map(b => b.bh));
    const need = th + 14 * S + 12 * S + 16 * S + bh;
    if (measure) return { h: need };
    const prims = [];
    const y0 = r.y + Math.max(0, (r.h - need) / 2);
    const ly = y0 + th + 14 * S + 6 * S;
    prims.push({ k: 'line', x: r.x + cw / 2, y: ly, w: r.w - cw, h: 0, color: ctx.dark ? '9FD3FA' : C.LIGHT, sw: 2 });
    blocks.forEach((b, i) => {
      const x = ctx.rtl ? r.x + r.w - (i + 1) * cw : r.x + i * cw;
      prims.push(T(x + pad, y0, cw - pad * 2, th + 2, b.top, { align: 'center', anchor: 'b', name: 'Date' }));
      const col = ctx.cardStyle === 'color' ? pal[i % pal.length] : C.BLUE;
      prims.push({ k: 'dot', x: x + cw / 2 - 7 * S, y: ly - 7 * S, w: 14 * S, h: 14 * S, fill: col });
      prims.push(T(x + pad, ly + 22 * S, cw - pad * 2, bh + 4, b.bot, { align: 'center', name: 'Milestone' }));
    });
    return { prims, h: need };
  },

  bullets(sec, r, ctx, S, measure, B) {
    const size = ctx.Z.bullets * S;
    const items = sec.items || [];
    const cols = items.length > 6 && r.w > 520 ? 2 : 1;
    const per = Math.ceil(items.length / cols);
    const gap = 28 * S;
    const cw = (r.w - gap * (cols - 1)) / cols;
    const groups = [];
    for (let c = 0; c < cols; c++) groups.push(items.slice(c * per, c * per + per).map((b, i) => P(b, size, { color: ctx.dark ? 'FFFFFF' : C.TEXT, bullet: sec.numbered ? 'num' : 'dot', sb: i ? 10 * S : 0, lh: 1.25, bulletColor: ctx.dark ? '9FD3FA' : C.BLUE, ref: J(B, 'items', c * per + i) })));
    const need = Math.max(...groups.map(g => parasHeight(g, cw)));
    if (measure) return { h: need };
    const prims = groups.map((g, c) => {
      const x = ctx.rtl ? r.x + r.w - (c + 1) * cw - c * gap : r.x + c * (cw + gap);
      return T(x, r.y, cw, Math.max(need, 10) + 6, g, { name: 'Bullets' });
    });
    return { prims, h: need };
  },

  text(sec, r, ctx, S, measure, B) {
    const ps = String(sec.text || '').split('\n').map((t, i) => P(t, ctx.Z.body * 1.12 * S, { color: ctx.dark ? 'FFFFFF' : C.TEXT, sb: i ? 6 * S : 0, lh: 1.25, ref: J(B, 'text'), line: i }));
    const need = parasHeight(ps, r.w);
    if (measure) return { h: need };
    return { prims: [T(r.x, r.y, r.w, need + 4, ps, { name: 'Body' })], h: need };
  },

  note(sec, r, ctx, S, measure, B) {
    const ps = String(sec.text || '').split('\n').map((t, i) => P(t, ctx.Z.note * S, { color: ctx.dark ? 'C6D6EA' : C.MUTED, ref: J(B, 'text'), line: i }));
    const need = parasHeight(ps, r.w);
    if (measure) return { h: need };
    return { prims: [T(r.x, r.y, r.w, need + 2, ps, { name: 'Footnote' })], h: need };
  },

  table(sec, r, ctx, S, measure, B) {
    const rows = sec.rows || [];
    const ncol = Math.max(1, ...rows.map(x => x.length));
    const size = ctx.Z.body * 1.05 * S;
    const lens = Array.from({ length: ncol }, (_, c) => Math.max(4, ...rows.map(rw => Math.min(60, String(rw[c] || '').length))));
    const tot = lens.reduce((a, b) => a + b, 0);
    const cws = lens.map(l => r.w * l / tot);
    const rh = rows.map((rw, ri) => Math.max(...cws.map((w, c) => lineCount(String(rw[c] || ''), size, 'body', ri === 0, w - 12) * size * 1.2)) + 14 * S);
    const need = rh.reduce((a, b) => a + b, 0);
    if (measure) return { h: need };
    return { prims: [{ k: 'table', x: r.x, y: r.y, w: r.w, h: need, rows, cws, rh, size, header: sec.header !== false, dark: ctx.dark, colored: ctx.cardStyle === 'color', ref: J(B, 'rows') }], h: need };
  },

  chart(sec, r, ctx, S, measure) {
    if (measure) return { h: 230 * S };
    return { prims: [{ k: 'chart', asset: sec.chart, x: r.x, y: r.y, w: r.w, h: Math.max(r.h, 160) }], h: r.h };
  },

  image(sec, r, ctx, S, measure) {
    if (measure) return { h: 200 * S };
    return { prims: [{ k: 'image', asset: sec.img, x: r.x, y: r.y, w: r.w, h: r.h, round: 'all', radius: 14 }], h: r.h };
  }
};

function measureSec(sec, w, ctx, S) {
  const r = { x: 0, y: 0, w, h: 0 };
  const hb = headingBlock(sec, r, ctx, S).h;
  const f = SECTIONS[sec.kind];
  if (!f) return hb + 20;
  return hb + f(sec, r, ctx, S, true).h;
}
function renderSec(sec, r, ctx, S, idx) {
  const B = idx == null ? null : ['sections', idx];
  const hb = headingBlock(sec, r, ctx, S, B);
  const f = SECTIONS[sec.kind];
  const out = f ? [...hb.prims, ...f(sec, { x: r.x, y: r.y + hb.h, w: r.w, h: r.h - hb.h }, ctx, S, false, B).prims] : hb.prims;
  out.forEach(p => { p.sec = idx; });
  return out;
}
function toBands(sections) {
  const bands = [];
  let cur = null;
  sections.forEach((s, i) => {
    const b = s.band || (i + 1) * 1000;
    if (!cur || cur.id !== b) { cur = { id: b, secs: [] }; bands.push(cur); }
    cur.secs.push(s);
  });
  return bands;
}

/* ================= IMAGE TREATMENTS ================= */
const IMAGE_MODES = ['door', 'half', 'full', 'band', 'grid'];
const DOOR_T = Math.tan(15 * Math.PI / 180) * 540; // ≈145pt run of the brand's 15° "Door"
function imageTreatment(mode, imgs, ctx, prims) {
  const ids = imgs.map(s => s.img);
  const n = ids.length;
  const p0 = prims.length;
  const tag = () => { for (let i = p0; i < prims.length; i++) if (prims[i].k === 'image') prims[i].imgSec = true; };

  if (mode === 'full') {
    prims.push({ k: 'image', asset: ids[0], x: 0, y: 0, w: 960, h: 540, bleed: true });
    prims.push({ k: 'fade', x: 0, y: 0, w: 960, h: 540, from: C.NAVY, to: ctx.rtl ? 'right' : 'left', a0: 30, a1: 92 });
    ctx.dark = true;
    return { x: ctx.X0, w: ctx.X1 - ctx.X0 };
  }
  if (mode === 'band') {
    const h = 196, y = 540 - h;
    const x0 = ctx.rtl ? 0 : 17, x1 = ctx.rtl ? 943 : 960;
    const w = x1 - x0;
    const k = Math.min(n, 3);
    for (let i = 0; i < k; i++) prims.push({ k: 'image', asset: ids[i], x: x0 + (w / k) * i + (i ? 3 : 0), y, w: w / k - (i < k - 1 ? 3 : 0) - (i ? 3 : 0), h, bleed: true });
    ctx.Y1 = y - 24;
    return { x: ctx.X0, w: ctx.X1 - ctx.X0 };
  }
  const PW = 960 * 0.43;
  if (mode === 'door') {
    // brand "Door": photo panel cut at 15°, plus a thin light-blue sliver running parallel
    if (ctx.rtl) {
      prims.push({ k: 'image', asset: ids[0], x: 0, y: 0, w: PW, h: 540, bleed: true, poly: [[0, 0], [PW, 0], [PW - DOOR_T, 540], [0, 540]] });
      prims.push({ k: 'poly', fill: C.LIGHT, pts: [[PW + 14, 0], [PW + 26, 0], [PW + 26 - DOOR_T, 540], [PW + 14 - DOOR_T, 540]] });
      return { x: PW + 40, w: ctx.X1 - (PW + 40) };
    }
    const X = 960 - PW;
    prims.push({ k: 'image', asset: ids[0], x: X, y: 0, w: PW, h: 540, bleed: true, poly: [[X + DOOR_T, 0], [960, 0], [960, 540], [X, 540]] });
    prims.push({ k: 'poly', fill: C.LIGHT, pts: [[X + DOOR_T - 26, 0], [X + DOOR_T - 14, 0], [X - 14, 540], [X - 26, 540]] });
    return { x: ctx.X0, w: X - 40 - ctx.X0 };
  }
  // half / grid: straight edge-to-edge panel; grid = mosaic of several photos
  const px = ctx.rtl ? 0 : 960 - PW;
  if (mode === 'grid' && n > 1) {
    const g = 5;
    if (n === 2) {
      prims.push({ k: 'image', asset: ids[0], x: px, y: 0, w: PW, h: 270 - g / 2, bleed: true });
      prims.push({ k: 'image', asset: ids[1], x: px, y: 270 + g / 2, w: PW, h: 270 - g / 2, bleed: true });
    } else {
      prims.push({ k: 'image', asset: ids[0], x: px, y: 0, w: PW, h: 300, bleed: true });
      const k = Math.min(n - 1, 3), cw = (PW - g * (k - 1)) / k;
      for (let i = 0; i < k; i++) prims.push({ k: 'image', asset: ids[i + 1], x: px + i * (cw + g), y: 300 + g, w: cw, h: 240 - g, bleed: true });
    }
  } else {
    const k = Math.min(n, 3);
    for (let i = 0; i < k; i++) prims.push({ k: 'image', asset: ids[i], x: px, y: 540 / k * i + (i ? 2.5 : 0), w: PW, h: 540 / k - (k > 1 ? 2.5 : 0), bleed: true });
  }
  return ctx.rtl ? { x: PW + 40, w: ctx.X1 - (PW + 40) } : { x: ctx.X0, w: px - 40 - ctx.X0 };
}

/* ================= CONTENT SLIDE ================= */
function layoutContent(slide, ctx, warn) {
  const secs = (slide.sections || []).filter(s => SECTIONS[s.kind]);
  const imgs = secs.filter(s => s.kind === 'image' && s.img);
  const others = secs.filter(s => s.kind !== 'image');
  const prims = [];
  let area = { x: ctx.X0, w: ctx.X1 - ctx.X0 };
  if (imgs.length && !others.length) {
    prims.push({ k: 'image', asset: imgs[0].img, x: 0, y: 0, w: 960, h: 540, bleed: true });
    if (slide.title || slide.subtitle) {
      prims.push({ k: 'fade', x: 0, y: 230, w: 960, h: 310, from: C.NAVY, to: 'bottom', a0: 0, a1: 88 });
      const ps = [];
      if (slide.eyebrow) ps.push(P(slide.eyebrow, ctx.Z.eyebrow, { role: 'label', bold: true, color: C.LIGHT, sa: 6, ref: ['eyebrow'] }));
      if (slide.title) ps.push(P(slide.title, ctx.Z.title * 1.2, { role: 'head', bold: true, color: C.WHITE, lh: 1.1, ref: ['title'] }));
      if (slide.subtitle) ps.push(P(slide.subtitle, ctx.Z.subtitle * 1.1, { color: C.WHITE, sb: 6, ref: ['subtitle'] }));
      prims.push(T(ctx.X0, 320, ctx.X1 - ctx.X0, 190, fitParas(ps, ctx.X1 - ctx.X0, 190), { anchor: 'b', name: 'Title' }));
    }
    return { prims, S: 1 };
  }
  if (imgs.length) {
    let mode = slide.imageMode || ctx.opt.imageMode || 'door';
    if (mode === 'door' && imgs.length > 1) mode = 'grid';
    area = imageTreatment(mode, imgs, ctx, prims);
  }
  const hd = header(slide, ctx, area);
  prims.push(...hd.prims);
  const body = layoutBody(slide, ctx, area, hd.bottom + 22, warn, others);
  prims.push(...body.prims);
  return { prims, S: body.S, dark: ctx.dark };
}
function layoutBody(slide, ctx, area, top, warn, others) {
  const prims = [];
  others = others || (slide.sections || []).filter(s => SECTIONS[s.kind] && s.kind !== 'image');
  const avail = ctx.Y1 - top;
  const bands = toBands(others);
  const colGap = 30;
  function bandLayout(S) {
    return bands.map(b => {
      const tw = b.secs.reduce((a, s) => a + (s.width || 1 / b.secs.length), 0);
      const free = area.w - colGap * (b.secs.length - 1);
      const ws = b.secs.map(s => free * (s.width || 1 / b.secs.length) / tw);
      const hs = b.secs.map((s, i) => measureSec(s, ws[i], ctx, S));
      return { b, ws, h: Math.max(0, ...hs) };
    });
  }
  const bandGap = 26;
  const total = Ls => Ls.reduce((a, x) => a + x.h, 0) + bandGap * (Ls.length - 1);
  let S, L;
  if (ctx.opt.sizesMode === 'fixed') { S = 1; L = bandLayout(1); }
  else {
    S = 1.28; L = bandLayout(S);
    while (total(L) > avail * (S > 1 ? 0.9 : 1) && S > 0.62) { S = Math.round((S - 0.04) * 100) / 100; L = bandLayout(S); }
  }
  if (total(L) > avail + 4) warn(ctx.opt.sizesMode === 'fixed' ? 'المحتوى أطول من المساحة بالأحجام الثابتة — قسّم السلايد أو صغّر الأحجام' : 'السلايد مزدحم — جرّب تقسيمه (زر Copilot يقترح التقسيم)');
  const spare = Math.max(0, avail - total(L));
  const extraGap = L.length > 1 ? Math.min(spare / (L.length - 1), 22) : 0;
  const rest = spare - extraGap * Math.max(0, L.length - 1);
  let y = top + Math.min(rest * 0.45, 70);
  L.forEach((x, bi) => {
    const isLastNote = bi === L.length - 1 && x.b.secs.length === 1 && x.b.secs[0].kind === 'note';
    let h = x.h;
    if (L.length === 1) h = Math.min(avail - (y - top), x.h + Math.min(rest * 0.5, 120));
    if (isLastNote) y = Math.max(y, ctx.Y1 - x.h);
    let cx = ctx.rtl ? area.x + area.w : area.x;
    x.b.secs.forEach((s, i) => {
      const w = x.ws[i];
      const xx = ctx.rtl ? cx - w : cx;
      prims.push(...renderSec(s, { x: xx, y, w, h }, ctx, S, slide.sections.indexOf(s)));
      cx = ctx.rtl ? xx - colGap : xx + w + colGap;
    });
    y += h + bandGap + extraGap;
  });
  return { prims, S };
}

/* ================= TEMPLATE SLIDES ================= */
function layoutCover(slide, ctx) {
  const en = !ctx.rtl, Z = ctx.Z;
  const x = en ? 46 : 340, w = 570;
  const ps = [];
  if (slide.eyebrow) ps.push(P(slide.eyebrow, Z.eyebrow * 1.05, { role: 'label', bold: true, color: C.LIGHT, sa: 8, spc: en ? 120 : 0, caps: en, ref: ['eyebrow'] }));
  ps.push(P(slide.title || '', Z.coverTitle, { role: 'head', bold: true, color: C.WHITE, lh: 1.05, ref: ['title'] }));
  const tp = fitParas(ps, w, 190, 0.5);
  const prims = [T(x, 270, w, 192, tp, { anchor: 'b', name: 'Title' })];
  const sp = [];
  if (slide.subtitle) sp.push(P(slide.subtitle, Z.coverTitle * 0.45, { role: 'head', bold: true, color: C.WHITE, sa: 4, ref: ['subtitle'] }));
  (slide.lines || []).forEach((l, li) => sp.push(P(l, Z.note * 1.1, { color: 'E6EEF8', sb: 2, ref: ['lines', li] })));
  if (sp.length) prims.push(T(x, 468, w, 60, fitParas(sp, w, 60, 0.6), { name: 'Subtitle' }));
  return { prims };
}
function layoutDivider(slide, ctx) {
  const ps = fitParas([P(slide.title || '', ctx.Z.dividerTitle, { role: 'head', bold: true, color: C.BLUE, lh: 1.1, ref: ['title'] })], 250, 220, 0.5);
  return { prims: [T(652, 160, 252, 220, ps, { anchor: 'ctr', name: 'Divider title' })] };
}
function layoutAgenda(slide, ctx) {
  const en = !ctx.rtl;
  const items = (slide.items || []).slice(0, 10);
  const n = Math.max(1, items.length);
  const top = 50, bottom = 500;
  const slot = Math.min(96, (bottom - top) / n);
  const y0 = top + ((bottom - top) - slot * n) / 2;
  const prims = [];
  const numW = 70;
  const x0 = 470, x1 = 905;
  const ts = n > 6 ? 0.8 : 1;
  items.forEach((it, i) => {
    const y = y0 + i * slot;
    const nx = en ? x0 : x1 - numW;
    const tx = en ? x0 + numW + 8 : x0;
    const tw = x1 - x0 - numW - 8;
    prims.push(T(nx, y, numW, slot * 0.8, [P(String(i + 1).padStart(2, '0'), 26 * ts, { role: 'num', color: i === n - 1 && n > 2 ? C.LIGHT : C.BLUE })], { name: 'Agenda number' }));
    const ps = [P(it.title || '', (en ? 15 : 18) * ts, { bold: true, color: '272829', ref: ['items', i, 'title'] })];
    if (it.sub) ps.push(P(it.sub, (en ? 11.5 : 13.5) * ts, { color: C.MUTED, sb: 3, ref: ['items', i, 'sub'] }));
    prims.push(T(tx, y + 4 * ts, tw, slot - 6, fitParas(ps, tw, slot - 8, 0.7), { name: 'Agenda item' }));
  });
  return { prims };
}

function layoutSlide(slide, lang, opt) {
  const ctx = ctxFor(lang, opt, slide);
  const warns = [];
  const warn = m => warns.push(m);
  let out;
  if (slide.type === 'cover') out = layoutCover(slide, ctx);
  else if (slide.type === 'closing') out = layoutCover({ title: slide.title || (ctx.rtl ? 'شكرًا لكم' : 'Thank You'), subtitle: slide.subtitle }, ctx);
  else if (slide.type === 'divider') out = layoutDivider(slide, ctx);
  else if (slide.type === 'agenda') out = layoutAgenda(slide, ctx);
  else out = layoutContent(slide, ctx, warn);
  out.warns = warns;
  return out;
}

if (typeof module !== 'undefined') module.exports = { layoutSlide, C, textW, parasHeight, lineCount, L_AR, DEFAULT_SIZES, IMAGE_MODES, PALETTES, P, T, J, fitParas, fitWords, ctxFor, layoutBody, layoutDivider, iconPrim, SECTIONS };

/* ============ صانع العروض — الشارتات ============
   Real, editable PowerPoint charts built from the slide's own numbers (KPIs or number tables).
   - chartFromKpis / chartFromTable: find chartable data
   - chartXml + chartXlsx: the native chart part and its embedded data sheet
   - chartSvg: the same chart drawn for the on-screen preview */

const CH_PAL = ['004EAA', '62B6F3', '002657', '14A6AE', 'A9C7E8', '7C8796', '0A1B3D', 'CDD4DE'];
const CH_TIME = /^((19|20)\d\d|Q[1-4]|H[12]|الربع|النصف|يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|محرم|صفر|ربيع|جمادى|رجب|شعبان|رمضان|شوال|ذو|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|week|الأسبوع|اسبوع|أسبوع|month|الشهر)/i;

function chDigits(s) { return String(s == null ? '' : s).replace(/[٠-٩]/g, c => c.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, c => c.charCodeAt(0) - 0x6F0).replace(/٫/g, '.').replace(/[٬،]/g, ','); }
/* "45%", "SAR 12.5M", "1,250 مسافر", "+18٪" -> { v, unit, pre } ; ranges and dates are refused */
function parseNum(s) {
  const t = chDigits(s).trim();
  if (!t || t.length > 40) return null;
  if (/\d\s*[-–—/:]\s*\d/.test(t)) return null;           // 50-100, 1/3, 10:30
  const m = t.match(/^([+\-~≈]?)\s*(SAR|ريال|\$|USD)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(%|٪|K|M|B|k|bn|مليون|مليار|ألف|الف)?\s*(\+)?\s*([^\d]{0,16})$/);
  if (!m) return null;
  let v = parseFloat(m[3].replace(/,/g, ''));
  if (m[1] === '-') v = -v;
  const suf = (m[4] || '').replace('٪', '%');
  const unit = ((m[2] || '') + '|' + suf + '|' + (m[6] || '').trim()).replace(/^\|+|\|+$/g, '');
  return { v, unit, suf, pre: m[2] || '', post: (m[6] || '').trim(), pct: suf === '%' };
}
const chShort = s => String(s || '').trim();
function chKind(cats, series, pct) {
  const n = cats.length;
  const time = n >= 3 && cats.filter(c => CH_TIME.test(chShort(c))).length >= n - 1;
  if (time) return 'line';
  if (series.length === 1 && pct && n >= 2 && n <= 6) { const sum = series[0].vals.reduce((a, b) => a + b, 0); if (sum >= 95 && sum <= 105) return 'donut'; }
  if (cats.some(c => chShort(c).length > 16) || n > 7) return 'barh';
  return 'bar';
}

/* KPIs -> one series (only when they measure the same thing and nothing else would be lost) */
function chartFromKpis(d) {
  const ks = d.kpis || [];
  if (ks.length < 2 || ks.length > 8) return null;
  const ps = ks.map(k => parseNum(k.value));
  if (ps.some(p => !p)) return null;
  const u = ps[0].unit;
  if (ps.some(p => p.unit !== u)) return null;
  if (ps.every(p => /^(19|20)\d\d$/.test(String(p.v)))) return null;
  const cats = [], cats_en = [], refs = [];
  for (const k of ks) {
    const lab = k.title || k.label;
    if (!lab || lab.length > 52 || k.text || (k.bullets && k.bullets.length) || k.note) return null;
    cats.push(lab); cats_en.push(k.title ? (k.title_en || '') : (k.label_en || ''));
    refs.push(k._r.value, k.title ? k._r.title : k._r.label);
  }
  const series = [{ name: '', vals: ps.map(p => p.v) }];
  return { type: chKind(cats, series, ps[0].pct), cats, cats_en, series, unit: u, pct: ps[0].pct, pre: ps[0].pre, suf: ps[0].suf, post: ps[0].post, refs, from: 'kpis' };
}
/* a table with a label column and number columns */
function chartFromTable(sec, si) {
  const rows = (sec.rows || []).map(r => r.map(c => String(c == null ? '' : c).trim()));
  if (rows.length < 3) return null;
  const ncol = Math.max(...rows.map(r => r.length));
  const body = rows.slice(1);
  const colNums = Array.from({ length: ncol }, (_, c) => body.map(r => parseNum(r[c])));
  const isNum = colNums.map(ps => ps.filter(Boolean).length >= Math.max(2, body.length * 0.8) && new Set(ps.filter(Boolean).map(p => p.unit)).size === 1);
  // a column of years / quarters is the category axis, not a number series
  colNums.forEach((ps, c) => { if (body.every(r => /^\s*(19|20)\d\d\s*$/.test(chDigits(r[c])))) isNum[c] = false; });
  const labelCol = isNum.findIndex(x => !x);
  if (labelCol < 0) return null;
  const numCols = isNum.map((x, c) => x ? c : -1).filter(c => c >= 0).slice(0, 4);
  if (!numCols.length || body.length > 12) return null;
  const units = numCols.map(c => colNums[c].find(Boolean).unit);
  if (numCols.length > 1 && new Set(units).size > 1) numCols.splice(1);
  const pure = isNum.every((x, c) => x || c === labelCol) && numCols.length === isNum.filter(Boolean).length;
  const cats = body.map(r => r[labelCol] || '');
  const series = numCols.map(c => ({ name: rows[0][c] || '', vals: colNums[c].map(p => p ? p.v : 0) }));
  const p0 = colNums[numCols[0]].find(Boolean);
  return { type: chKind(cats, series, p0.pct), cats, cats_en: [], series, unit: p0.unit, pct: p0.pct, pre: p0.pre, suf: p0.suf, post: p0.post, refs: [['sections', si, 'rows']], from: 'table', pure, si };
}
/* the strongest value stands out (single series, 3+ values, one clear top) */
function chTop(spec) {
  if (spec.hl === false || spec.series.length !== 1 || spec.cats.length < 3 || spec.type === 'donut') return -1;
  const v = spec.series[0].vals, mx = Math.max(...v);
  return v.filter(x => x === mx).length === 1 ? v.indexOf(mx) : -1;
}
const CH_SOFT = '9DBBE6';
function chFmt(spec, v) {
  const dec = spec.series.some(s => s.vals.some(x => Math.round(x) !== x)) ? 1 : 0;
  const n = v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return (spec.pre ? spec.pre + ' ' : '') + n + (spec.suf || '');
}
function chFormatCode(spec) {
  const dec = spec.series.some(s => s.vals.some(x => Math.round(x) !== x)) ? '.0' : '';
  const pre = spec.pre ? `"${spec.pre} "` : '';
  const suf = spec.suf ? `"${spec.suf}"` : '';
  return `${pre}#,##0${dec}${suf}`;
}

/* ---------- native PowerPoint chart ---------- */
function chEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function chCol(i) { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
function chartXml(spec, F, rtl0, o = {}) {
  const time = spec.cats.length >= 2 && spec.cats.filter(c => CH_TIME.test(chShort(c))).length >= spec.cats.length - 1;
  const rtl = rtl0 && !time;
  const NS = 'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const n = spec.cats.length;
  const catLabel = (k) => spec.cats_en && spec.cats_en[k] && o.bi ? spec.cats[k] + '\n' + spec.cats_en[k] : spec.cats[k];
  const txPr = (sz, color, face, bold) => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${Math.round(sz * 100)}" b="${bold ? 1 : 0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${chEsc(face)}"/><a:cs typeface="${chEsc(F.ar)}"/></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr>`;
  const catFace = rtl0 ? F.ar : F.body;
  const fc = chEsc(chFormatCode(spec));
  const cat = `<c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${n + 1}</c:f><c:strCache><c:ptCount val="${n}"/>${spec.cats.map((c, k) => `<c:pt idx="${k}"><c:v>${chEsc(catLabel(k))}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat>`;
  const val = (s, si) => `<c:val><c:numRef><c:f>Sheet1!$${chCol(si + 1)}$2:$${chCol(si + 1)}$${n + 1}</c:f><c:numCache><c:formatCode>${fc}</c:formatCode><c:ptCount val="${n}"/>${s.vals.map((v, k) => `<c:pt idx="${k}"><c:v>${v}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:val>`;
  const tx = (s, si) => `<c:tx><c:strRef><c:f>Sheet1!$${chCol(si + 1)}$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${chEsc(s.name || 'Value')}</c:v></c:pt></c:strCache></c:strRef></c:tx>`;
  const lblSz = o.lblSize || 12, catSz = o.catSize || 11;
  const dl = (pos, extra = '') => `<c:dLbls><c:numFmt formatCode="${fc}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(lblSz, o.lblColor || '002657', F.head, false)}${pos ? `<c:dLblPos val="${pos}"/>` : ''}<c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/>${extra}</c:dLbls>`;
  const multi = spec.series.length > 1;
  const legend = (pos) => `<c:legend><c:legendPos val="${pos}"/><c:overlay val="0"/>${txPr(catSz * 1.1, '2B3442', catFace, false)}</c:legend>`;
  const axLine = `<c:spPr><a:noFill/><a:ln w="9525"><a:solidFill><a:srgbClr val="CDD4DE"/></a:solidFill></a:ln></c:spPr>`;
  let plot = '', axes = '', leg = '';
  if (spec.type === 'donut') {
    const s = spec.series[0];
    const dpts = s.vals.map((v, k) => `<c:dPt><c:idx val="${k}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${CH_PAL[k % CH_PAL.length]}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`).join('');
    plot = `<c:doughnutChart><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/>${tx(s, 0)}${dpts}${dl(null).replace('<c:dLbls>', '<c:dLbls>').replace(txPr(lblSz, o.lblColor || '002657', F.head, false), txPr(lblSz, 'FFFFFF', F.head, false))}${cat}${val(s, 0)}</c:ser><c:firstSliceAng val="0"/><c:holeSize val="58"/></c:doughnutChart>`;
    leg = legend('r');
  } else if (spec.type === 'line') {
    const sers = spec.series.map((s, si) => `<c:ser><c:idx val="${si}"/><c:order val="${si}"/>${tx(s, si)}<c:spPr><a:ln w="31750" cap="rnd"><a:solidFill><a:srgbClr val="${CH_PAL[si]}"/></a:solidFill><a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="8"/><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="22225"><a:solidFill><a:srgbClr val="${CH_PAL[si]}"/></a:solidFill></a:ln></c:spPr></c:marker>${chTop(spec) >= 0 ? `<c:dPt><c:idx val="${chTop(spec)}"/><c:marker><c:symbol val="circle"/><c:size val="12"/><c:spPr><a:solidFill><a:srgbClr val="004EAA"/></a:solidFill><a:ln w="22225"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:marker><c:bubble3D val="0"/></c:dPt>` : ''}${dl('t')}${cat}${val(s, si)}<c:smooth val="0"/></c:ser>`).join('');
    plot = `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${sers}<c:marker val="1"/><c:axId val="5001"/><c:axId val="5002"/></c:lineChart>`;
    axes = `<c:catAx><c:axId val="5001"/><c:scaling><c:orientation val="${rtl ? 'maxMin' : 'minMax'}"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/>${axLine}${txPr(catSz, '4D5766', catFace, false)}<c:crossAx val="5002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx><c:valAx><c:axId val="5002"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="1"/><c:axPos val="${rtl ? 'r' : 'l'}"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E1E6ED"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="${fc}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="5001"/><c:crosses val="${rtl ? 'max' : 'autoZero'}"/><c:crossBetween val="between"/></c:valAx>`;
    if (multi) leg = legend('t');
  } else {
    const hz = spec.type === 'barh';
    const top = chTop(spec);
    const dpt = top < 0 ? '' : `<c:dPt><c:idx val="${top}"/><c:invertIfNegative val="0"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="004EAA"/></a:solidFill></c:spPr></c:dPt>`;
    const sers = spec.series.map((s, si) => `<c:ser><c:idx val="${si}"/><c:order val="${si}"/>${tx(s, si)}<c:spPr><a:solidFill><a:srgbClr val="${top >= 0 ? CH_SOFT : CH_PAL[si]}"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>${dpt}${dl('outEnd')}${cat}${val(s, si)}</c:ser>`).join('');
    plot = `<c:barChart><c:barDir val="${hz ? 'bar' : 'col'}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${sers}<c:gapWidth val="${multi ? 80 : 110}"/><c:overlap val="${multi ? -8 : 0}"/><c:axId val="5001"/><c:axId val="5002"/></c:barChart>`;
    // horizontal bars: first item at the top; Arabic: columns read right-to-left
    const catOri = hz ? 'maxMin' : (rtl ? 'maxMin' : 'minMax');
    const valOri = hz && rtl ? 'maxMin' : 'minMax';
    axes = `<c:catAx><c:axId val="5001"/><c:scaling><c:orientation val="${catOri}"/></c:scaling><c:delete val="0"/><c:axPos val="${hz ? (rtl ? 'r' : 'l') : 'b'}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${axLine}${txPr(catSz, hz ? '2B3442' : '4D5766', catFace, hz)}<c:crossAx val="5002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="${hz ? 60 : 100}"/><c:noMultiLvlLbl val="0"/></c:catAx><c:valAx><c:axId val="5002"/><c:scaling><c:orientation val="${valOri}"/><c:min val="0"/></c:scaling><c:delete val="1"/><c:axPos val="${hz ? 'b' : (rtl ? 'r' : 'l')}"/><c:numFmt formatCode="${fc}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="5001"/><c:crosses val="${hz ? 'autoZero' : (rtl ? 'max' : 'autoZero')}"/><c:crossBetween val="between"/></c:valAx>`;
    if (multi) leg = legend('t');
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace ${NS}><c:date1904 val="0"/><c:lang val="${rtl0 ? 'ar-SA' : 'en-US'}"/><c:roundedCorners val="0"/><c:chart><c:autoTitleDeleted val="1"/><c:plotArea><c:layout/>${plot}${axes}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea>${leg}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(catSz, '4D5766', catFace, false)}${o.withData ? '<c:externalData r:id="rId1"><c:autoUpdate val="0"/></c:externalData>' : ''}</c:chartSpace>`;
}
/* the little Excel sheet behind the chart, so «تحرير البيانات» works in PowerPoint */
async function chartXlsx(spec, JSZip) {
  const z = new JSZip();
  const X = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  z.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${X}" xmlns:r="${R}"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  z.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
  const str = (ref, t) => `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${chEsc(t)}</t></is></c>`;
  const rows = [`<row r="1">${str('A1', '')}${spec.series.map((s, si) => str(chCol(si + 1) + '1', s.name || 'Value')).join('')}</row>`];
  spec.cats.forEach((c, k) => rows.push(`<row r="${k + 2}">${str('A' + (k + 2), c)}${spec.series.map((s, si) => `<c r="${chCol(si + 1)}${k + 2}"><v>${s.vals[k]}</v></c>`).join('')}</row>`));
  z.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${X}"><sheetData>${rows.join('')}</sheetData></worksheet>`);
  return z.generateAsync({ type: 'uint8array' });
}

/* ---------- on-screen preview (SVG) ---------- */
function chartSvg(spec, w, h, o = {}) {
  const time = spec.cats.length >= 2 && spec.cats.filter(c => CH_TIME.test(chShort(c))).length >= spec.cats.length - 1;
  const rtl = !!o.rtl && !(time && spec.type !== 'barh' && spec.type !== 'donut'), rtl0 = !!o.rtl, f = o.fonts || { ar: 'Tajawal', head: 'Sequel', body: 'FS Industrie' };
  const catF = rtl0 ? f.ar : f.body, numF = f.head;
  const esc = chEsc;
  const out = [];
  const n = spec.cats.length, S = spec.series;
  const lbl = (k) => spec.cats_en && spec.cats_en[k] && o.bi ? [spec.cats[k], spec.cats_en[k]] : [spec.cats[k]];
  const catSz = o.catSize || 11, lblSz = o.lblSize || 12;
  const text = (x, y, t, sz, fam, col, anchor = 'middle', weight = 400) => out.push(`<text x="${x}" y="${y}" font-size="${sz}" font-family="${fam}" fill="#${col}" text-anchor="${anchor}" font-weight="${weight}" direction="${/[؀-ۿ]/.test(t) ? 'rtl' : 'ltr'}">${esc(t)}</text>`);
  const wrap = (t, maxW, sz) => { const words = String(t).split(/\s+/), lines = []; let cur = ''; for (const wd of words) { const nx = cur ? cur + ' ' + wd : wd; if (nx.length * sz * 0.5 > maxW && cur) { lines.push(cur); cur = wd; } else cur = nx; } if (cur) lines.push(cur); return lines.slice(0, 3); };
  if (spec.type === 'donut') {
    const s = S[0], tot = s.vals.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    const cx = h / 2, cy = h / 2, R = h / 2 - 6, r = R * 0.58;
    let a0 = -Math.PI / 2;
    s.vals.forEach((v, k) => {
      const a1 = a0 + (Math.max(0, v) / tot) * Math.PI * 2;
      const big = a1 - a0 > Math.PI ? 1 : 0;
      const p = (rr, a) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
      const [x0, y0] = p(R, a0), [x1, y1] = p(R, a1), [x2, y2] = p(r, a1), [x3, y3] = p(r, a0);
      out.push(`<path d="M${x0} ${y0}A${R} ${R} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${big} 0 ${x3} ${y3}Z" fill="#${CH_PAL[k % CH_PAL.length]}" stroke="#fff" stroke-width="1.5"/>`);
      const am = (a0 + a1) / 2, [lx, ly] = p((R + r) / 2, am);
      if (a1 - a0 > 0.35) text(lx, ly + lblSz * 0.35, chFmt(spec, v), lblSz * 0.9, numF, 'FFFFFF');
      a0 = a1;
    });
    // legend
    const lx0 = h + 24, lw = w - h - 24, rowH = Math.min(46, h / n);
    spec.cats.forEach((c, k) => {
      const y = (h - rowH * n) / 2 + k * rowH + rowH / 2;
      const sx = rtl ? lx0 + lw - 12 : lx0;
      out.push(`<rect x="${sx}" y="${y - 6}" width="12" height="12" rx="3" fill="#${CH_PAL[k % CH_PAL.length]}"/>`);
      const ls = lbl(k);
      text(rtl ? sx - 10 : sx + 22, y + catSz * 0.35 - (ls.length > 1 ? catSz * 0.55 : 0), ls[0], catSz * 1.05, catF, '2B3442', rtl ? 'end' : 'start', 700);
      if (ls[1]) text(rtl ? sx - 10 : sx + 22, y + catSz * 0.35 + catSz * 0.6, ls[1], catSz * 0.85, f.body, '7C8796', rtl ? 'end' : 'start');
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${out.join('')}</svg>`;
  }
  const max = Math.max(...S.flatMap(s => s.vals), 0) || 1;
  const legH = S.length > 1 ? 24 : 0;
  if (S.length > 1) S.forEach((s, si) => { const x = rtl ? w - 10 - si * 130 : si * 130; out.push(`<rect x="${rtl ? x - 10 : x}" y="4" width="10" height="10" rx="2" fill="#${CH_PAL[si]}"/>`); text(rtl ? x - 16 : x + 16, 13, s.name, catSz, catF, '4D5766', rtl ? 'end' : 'start'); });
  if (spec.type === 'barh') {
    const labW = Math.min(w * 0.38, 220), top = legH, rowH = (h - top) / n, bw = w - labW - 70;
    spec.cats.forEach((c, k) => {
      const y = top + k * rowH;
      const ls = lbl(k);
      const lines = wrap(ls[0], labW - 10, catSz);
      const tx = rtl ? w : 0;
      lines.forEach((l, li) => text(tx, y + rowH / 2 - (lines.length - 1) * catSz * 0.6 + li * catSz * 1.2 + catSz * 0.35 - (ls[1] ? catSz * 0.5 : 0), l, catSz, catF, '2B3442', rtl ? 'end' : 'start', 700));
      if (ls[1]) text(tx, y + rowH / 2 + catSz * 0.35 + lines.length * catSz * 0.6, ls[1], catSz * 0.82, f.body, '7C8796', rtl ? 'end' : 'start');
      const bh = Math.min(26, rowH * 0.62 / S.length);
      S.forEach((s, si) => {
        const len = Math.max(2, bw * Math.max(0, s.vals[k]) / max);
        const by = y + rowH / 2 - (bh * S.length) / 2 + si * bh;
        const bx = rtl ? w - labW - len : labW;
        const tp = chTop(spec), col = tp < 0 ? CH_PAL[si] : (k === tp ? '004EAA' : CH_SOFT);
        out.push(`<rect x="${bx}" y="${by}" width="${len}" height="${bh - 3}" rx="2" fill="#${col}"/>`);
        text(rtl ? bx - 6 : bx + len + 6, by + bh / 2 + lblSz * 0.3, chFmt(spec, s.vals[k]), lblSz, numF, '002657', rtl ? 'end' : 'start');
      });
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${out.join('')}</svg>`;
  }
  const hasEn = spec.cats_en && o.bi && spec.cats_en.some(Boolean);
  const labH = catSz * (hasEn ? 3.2 : 2.6), top = legH + lblSz * 2, base = h - labH, ph = base - top, slot = w / n;
  out.push(`<line x1="0" y1="${base}" x2="${w}" y2="${base}" stroke="#CDD4DE" stroke-width="0.75"/>`);
  const xs = k => rtl ? w - (k + 0.5) * slot : (k + 0.5) * slot;
  spec.cats.forEach((c, k) => { const ls = lbl(k); const lines = wrap(ls[0], slot - 8, catSz).slice(0, hasEn ? 1 : 2); lines.forEach((l, li) => text(xs(k), base + catSz * 1.3 + li * catSz * 1.15, l, catSz, catF, '4D5766')); if (ls[1]) text(xs(k), base + catSz * 1.3 + lines.length * catSz * 1.15, ls[1], catSz * 0.82, f.body, '7C8796'); });
  if (spec.type === 'line') {
    for (let g = 1; g <= 3; g++) out.push(`<line x1="0" y1="${base - ph * g / 3}" x2="${w}" y2="${base - ph * g / 3}" stroke="#E1E6ED" stroke-width="0.5"/>`);
    S.forEach((s, si) => {
      const pts = s.vals.map((v, k) => [xs(k), base - ph * Math.max(0, v) / max]);
      out.push(`<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#${CH_PAL[si]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
      const tp = chTop(spec);
      pts.forEach(([x, y], k) => { out.push(k === tp ? `<circle cx="${x}" cy="${y}" r="6" fill="#004EAA" stroke="#fff" stroke-width="1.8"/>` : `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#${CH_PAL[si]}" stroke-width="1.8"/>`); text(x, y - 9, chFmt(spec, s.vals[k]), lblSz, numF, '002657'); });
    });
  } else {
    const gw = slot * (S.length > 1 ? 0.7 : 0.48), bw = gw / S.length;
    S.forEach((s, si) => s.vals.forEach((v, k) => {
      const bh = Math.max(2, ph * Math.max(0, v) / max);
      const x = xs(k) - gw / 2 + (rtl ? (S.length - 1 - si) : si) * bw;
      const tp = chTop(spec), col = tp < 0 ? CH_PAL[si] : (k === tp ? '004EAA' : CH_SOFT);
      out.push(`<rect x="${x + 1}" y="${base - bh}" width="${bw - 2}" height="${bh}" rx="2" fill="#${col}"/>`);
      text(x + bw / 2, base - bh - 6, chFmt(spec, v), lblSz * (S.length > 2 ? 0.8 : 1), numF, '002657');
    }));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${out.join('')}</svg>`;
}

if (typeof module !== 'undefined') module.exports = { chTop, parseNum, chartFromKpis, chartFromTable, chartXml, chartXlsx, chartSvg, chFmt, CH_PAL };

/* ============ صانع العروض — الثيمات (رسمي · عملي · إبداعي) ============
   Each theme = a set of parameterised layouts that read the slide model and draw primitives.
   Layouts are authored in left-to-right coordinates (960×540 pt) and mirrored automatically for Arabic. */

const K = {
  NAVY: '002657', BLUE: '004EAA', LIGHT: '62B6F3', TEXT: '2B3442', GRAY: '4D5766', MUTED: '7C8796', W: 'FFFFFF',
  IVORY: 'F4F3EF', DEEP: '0A1B3D', RULE: 'CDD4DE', RULE2: 'E1E6ED', RULE_D: '2E4874', PALE: 'EEF3FA', TEAL: '14A6AE', SKY: '9DBBE6', BODY_D: 'D5E0EE'
};
const SOLO = ['Title', 'Page', 'No.', 'Number', 'Divider title', 'Value', 'Stage', 'Date', 'Info'];
const TLOGO = { x: 19, y: 13, w: 58 }; // where the official content layout puts its small logo (LTR coordinates)

/* ---------- small helpers ---------- */
const jp = (b, ...k) => b ? b.concat(k) : null;
const pad2 = n => String(n).padStart(2, '0');
const tlen = s => String(s || '').length;
function itemLen(it) { return [it.title, it.text, it.value, it.label, ...(it.bullets || [])].filter(Boolean).join(' ').length; }

/* ---------- bilingual: every Arabic text gets its English partner right underneath ---------- */
function enPath(ref) { const r = ref.slice(); const last = r.length - 1; if (typeof r[last] === 'number') r[last - 1] = r[last - 1] + '_en'; else r[last] = r[last] + '_en'; return r; }
function biExpand(ps, slide) {
  const out = [];
  for (const p of ps) {
    out.push(p);
    if (!p.ref || p.role === 'num' || !L_AR.test(p.t)) continue;
    let v = enPath(p.ref).reduce((a, k) => (a == null ? a : a[k]), slide);
    if (p.line != null && typeof v === 'string') v = v.split('\n')[p.line];
    if (typeof v !== 'string' || !v.trim()) continue;
    const e = Object.assign({}, p, { t: v.trim(), size: Math.round(p.size * 0.8 * 2) / 2, ref: enPath(p.ref), sb: 1, caps: false, bullet: p.bullet ? 'blank' : null, sa: p.sa, spc: 0 });
    p.sa = Math.min(p.sa || 0, 1.5);
    out.push(e);
  }
  return out;
}
const bgColor = D => D.c.opt.bg === 'grey' ? 'F3F4F6' : 'FFFFFF';

/* ---------- digest: what the slide contains, with edit paths kept ---------- */
function mkItem(it, B) {
  if (typeof it === 'string') return { text: it, _r: { text: B } };
  const o = Object.assign({}, it);
  o._r = {};
  for (const k of ['title', 'text', 'value', 'label', 'note', 'date', 'tag']) o._r[k] = B.concat(k);
  o._r.bullets = B.concat('bullets');
  o._b = B;
  return o;
}
function digest(slide) {
  const d = { items: [], kpis: [], bullets: [], paras: [], imgs: [], other: [], groups: [], feature: null, note: null, timeline: false, secKinds: [] };
  (slide.sections || []).forEach((s, i) => {
    const B = ['sections', i];
    d.secKinds.push(s.kind);
    if (s.qa) d.qa = true;
    if (['cards', 'list', 'timeline'].includes(s.kind)) {
      const its = (s.items || []).map((it, k) => mkItem(it, B.concat('items', k)));
      if (s.kind === 'timeline') d.timeline = true;
      d.items.push(...its);
      d.groups.push({ heading: s.heading, hr: B.concat('heading'), rows: its });
      (s.items || []).forEach((it, k) => { if (it && it.img) d.imgs.push({ id: it.img, ref: B.concat('items', k), item: true }); });
    } else if (s.kind === 'kpis') {
      d.kpis.push(...(s.items || []).map((it, k) => mkItem(it, B.concat('items', k))));
    } else if (s.kind === 'bullets') {
      const its = (s.items || []).map((t, k) => mkItem(String(t), B.concat('items', k)));
      d.bullets.push(...its);
      d.groups.push({ heading: s.heading, hr: B.concat('heading'), rows: its });
    } else if (s.kind === 'text') {
      String(s.text || '').split('\n').forEach((t, li) => { if (t.trim()) d.paras.push({ t, ref: B.concat('text'), line: li }); });
    } else if (s.kind === 'feature') {
      if (!d.feature) d.feature = mkItem(s.item || {}, B.concat('item')); else d.items.push(mkItem(s.item || {}, B.concat('item')));
    } else if (s.kind === 'note') {
      d.note = { t: s.text || '', ref: B.concat('text') };
    } else if (s.kind === 'image') {
      if (s.img) d.imgs.push({ id: s.img, ref: B });
    } else if (s.kind === 'table' || s.kind === 'chart') d.other.push(s);
  });
  d.nI = d.items.length; d.nK = d.kpis.length; d.nB = d.bullets.length;
  d.pLen = d.paras.reduce((a, p) => a + p.t.length, 0);
  d.nImg = d.imgs.filter(x => !x.item).length;
  d.withVal = d.items.filter(it => it.value).length;
  d.withBul = d.items.filter(it => it.bullets && it.bullets.length).length;
  d.avgLen = d.nI ? d.items.reduce((a, it) => a + itemLen(it), 0) / d.nI : 0;
  d.rows = d.items.length ? d.items : d.bullets;
  { const U = '(?:\\s*(?:%|٪|دقيقة|دقائق|ساعة|ساعات|يوم|أيام|يومًا|يوما|أسبوع|أسابيع|شهر|أشهر|سنة|سنوات|مليون|مليار|ألف|ريال|مسافر|رحلة|رحلات))?';
    const N = '([+\\-]?[\\d٠-٩][\\d٠-٩.,٫٬]*' + U + ')';
    const RE = new RegExp('من\\s+' + N + '\\s+(?:إلى|الى|لـ\\s*|ل)\\s*' + N);
    const REen = /from\s+([+\-]?\d[\d.,]*\s*(?:%|minutes?|mins?|hours?|days?|weeks?|months?|years?|million|M|K)?)\s+to\s+([+\-]?\d[\d.,]*\s*(?:%|minutes?|mins?|hours?|days?|weeks?|months?|years?|million|M|K)?)/i;
    const hits = [];
    const look = (t, ref, line) => { if (!t) return; const m = String(t).match(RE) || String(t).match(REen); if (m) hits.push({ a: m[1].trim(), b: m[2].trim(), t, ref, line }); };
    d.paras.forEach(p => look(p.t, p.ref, p.line));
    d.items.forEach(it => { look(it.title, it._r.title); look(it.text, it._r.text); });
    if (d.feature) { look(d.feature.title, d.feature._r.title); look(d.feature.text, d.feature._r.text); }
    d.bullets.forEach(b => look(b.text, b._r.text));
    d.ba = hits.length === 1 ? hits[0] : null;
  }
  d.tables = (slide.sections || []).map((x, i) => x.kind === 'table' ? { sec: x, i } : null).filter(Boolean);
  d.oChart = d.other.some(x => x.kind === 'chart');
  if (typeof chartFromKpis !== 'undefined') {
    d.kchart = chartFromKpis(d);
    d.tchart = d.tables.length === 1 ? chartFromTable(d.tables[0].sec, d.tables[0].i) : null;
  }
  return d;
}

/* ---------- the drawer: mirrors LTR-authored coordinates for Arabic ---------- */
class Drawer {
  constructor(ctx) { this.c = ctx; this.p = []; this.base = 'content'; this.stock = 0; this.photoN = 0; this.groups = {}; }
  finish() {
    const fixed = this.c.opt.sizesMode === 'fixed';
    for (const g of Object.values(this.groups)) {
      const sc = (ps, k) => ps.map(p => ({ ...p, size: Math.round(p.size * k * 2) / 2, sb: (p.sb || 0) * k, sa: (p.sa || 0) * k }));
      const fits = k => g.every(m => parasHeight(fitWords(sc(m.raw, k), m.w), m.w) <= m.h + 0.5);
      let k = 1;
      if (!fixed) {
        const max = Math.min(...g.map(m => m.max)), min = Math.max(...g.map(m => m.min));
        if (fits(1)) { k = 1; while (k + 0.04 <= max && fits(k + 0.04)) k += 0.04; }
        else { k = 1; while (k > min && !fits(k)) k -= 0.04; }
      }
      for (const m of g) m.prim.paras = fitWords(sc(m.raw, k), m.w);
    }
  }
  get rtl() { return this.c.rtl; }
  mx(x, w) { return this.rtl ? 960 - x - w : x; }
  push(p) { this.p.push(p); return p; }
  text(x, y, w, h, paras, o = {}) {
    paras = paras.filter(p => p && String(p.t).trim() !== '');
    if (!paras.length) return 0;
    let ps = paras.map(p => ({ ...p }));
    if (this.c.bi) ps = biExpand(ps, this.c.slide);
    const name = o.name || 'Text';
    const prim = this.push({ k: 'text', x: this.mx(x, w), y, w, h: Math.max(h, 6), paras: ps, anchor: o.anchor || 't', align: o.align || 'start', name });
    if (o.fit !== false && !SOLO.includes(name)) {
      // same role on the slide = same size: sized together after the layout is drawn
      (this.groups[name] = this.groups[name] || []).push({ prim, raw: ps, w, h, max: o.max || 1.3, min: o.min || 0.62 });
      return Math.min(parasHeight(ps, w), h);
    }
    fitWords(ps, w);
    if (o.fit !== false && this.c.opt.sizesMode !== 'fixed') prim.paras = ps = fitParas(ps, w, h, o.min || 0.62);
    return Math.min(parasHeight(ps, w), h);
  }
  rect(x, y, w, h, o = {}) { return this.push({ k: 'rect', x: this.mx(x, w), y, w, h, r: o.r || 0, fill: o.fill || null, fa: o.fa, stroke: o.stroke || null, sw: o.sw || 1, alpha: o.alpha, item: o.item || null }); }
  line(x, y, w, h, color, sw = 0.75, o = {}) { return this.push({ k: 'line', x: this.mx(x, w), y, w, h, color, sw, dash: o.dash || null }); }
  dot(x, y, s, fill, o = {}) { return this.push({ k: 'dot', x: this.mx(x, s), y, w: s, h: s, fill, ring: o.ring === undefined ? null : o.ring, rw: o.rw }); }
  poly(pts, fill) { return this.push({ k: 'poly', fill, pts: pts.map(([x, y]) => [this.rtl ? 960 - x : x, y]) }); }
  fade(x, y, w, h, from, dir, a0, a1) {
    let to = dir === 'down' ? 'bottom' : dir === 'up' ? 'top' : null;
    if (!to) to = (dir === 'toEnd') !== this.rtl ? 'right' : 'left';
    return this.push({ k: 'fade', x: this.mx(x, w), y, w, h, from, to, a0, a1 });
  }
  img(id, x, y, w, h, o = {}) {
    if (!id) return;
    return this.push({ k: 'image', asset: id, x: this.mx(x, w), y, w, h, bleed: !!o.bleed, round: o.r ? 'all' : null, radius: o.r || 0, item: o.item || null, stock: String(id).startsWith('stock:'), imgRef: o.ref || null });
  }
  icon(id, x, y, s, color, item) { if (!id) return; return this.push({ k: 'icon', asset: id, x: this.mx(x, s), y, w: s, h: s, color, item: item || null }); }
  logo(x, y, w, color) { return this.push({ k: 'logo', x: this.mx(x, w), y, w, h: w / 3.02, color }); }
  /* photo k: the slide's own picture first, then a brand photo */
  photo(d, k) {
    const own = d.imgs.filter(x => !x.item);
    if (own[k]) return { id: own[k].id, ref: own[k].ref };
    // the user's own photo library (picked by the slide's topic) comes before the brand photos
    if (typeof PHOTO_PICK === 'function') { const id = PHOTO_PICK(this.c.slide, k, this.c.page || 1, this.c.stockSeed || 0); if (id) return { id, mine: true }; }
    const pool = (typeof STOCK_IDS !== 'undefined' && STOCK_IDS.length) ? STOCK_IDS : [];
    if (!pool.length) return { id: null };
    this.stock++;
    return { id: pool[(this.c.page * 3 + k + (this.c.stockSeed || 0)) % pool.length], stock: true };
  }
  ph(d, k, x, y, w, h, o = {}) { const ph = this.photo(d, k); const pr = this.img(ph.id, x, y, w, h, Object.assign({ ref: ph.ref }, o)); if (pr) pr.phk = k; return ph; }
}

/* ---------- paragraph builders ---------- */
function itemPs(D, it, o = {}) {
  const Z = D.c.Z, ps = [], R = it._r || {};
  const fg = o.fg || K.NAVY, bc = o.bc || K.GRAY;
  if (o.value !== false && it.value) ps.push(P(it.value, o.vs || Z.value, { role: 'num', color: o.vc || K.BLUE, lh: 1.05, sa: 5, ref: R.value }));
  if (it.label && o.label !== false) ps.push(P(it.label, Z.label, { role: 'label', bold: true, color: o.lc || K.BLUE, sa: 3, ref: R.label }));
  if (it.date && o.date !== false) ps.push(P(it.date, Z.label * 1.05, { role: 'num', color: o.dc || K.BLUE, sa: 3, ref: R.date }));
  if (it.title && o.title !== false) ps.push(P(it.title, o.ts || Z.cardTitle, { bold: true, color: fg, lh: 1.15, sa: 4, ref: R.title }));
  if (it.text && o.text !== false) String(it.text).split('\n').forEach((l, li) => ps.push(P(l, o.bs || Z.body, { color: it.title ? bc : (o.solo || fg), sa: 3, lh: o.lh || 1.25, ref: R.text, line: li })));
  if (it.bullets && o.bullets !== false) it.bullets.forEach((b, bi) => ps.push(P(b, o.bs || Z.body, { color: bc, bullet: 'dot', bulletColor: o.bul || K.BLUE, sb: 3, ref: R.bullets.concat(bi) })));
  if (it.note && o.note !== false) ps.push(P(it.note, Z.note, { color: o.mc || K.MUTED, sb: 4, ref: R.note }));
  return ps;
}
function paraPs(D, d, o = {}) {
  const Z = D.c.Z;
  return d.paras.map((p, i) => P(p.t, o.bs || Z.body * 1.1, { color: o.color || K.TEXT, sb: i ? (o.gap || 8) : 0, lh: o.lh || 1.35, ref: p.ref, line: p.line }));
}
function featurePs(D, f, o = {}) {
  if (!f) return [];
  const Z = D.c.Z, R = f._r;
  const ps = [];
  if (f.title) ps.push(P(f.title, o.ts || Z.featureTitle, { bold: true, color: o.fg || K.BLUE, lh: 1.2, sa: 8, ref: R.title }));
  if (f.text) String(f.text).split('\n').forEach((l, li) => ps.push(P(l, o.bs || Z.body * 1.1, { color: o.bc || K.TEXT, lh: 1.35, sa: 4, ref: R.text, line: li })));
  if (f.value) ps.unshift(P(f.value, Z.kpi, { role: 'num', color: o.vc || K.BLUE, sa: 6, ref: R.value }));
  return ps;
}
/* the text that a layout without a "body" slot would otherwise drop */
function restPs(D, d, o = {}) { return [...featurePs(D, d.feature, o), ...paraPs(D, d, o)]; }

/* ---------- common chrome ---------- */
function pageTxt(D) { return pad2(D.c.page) + ' / ' + pad2(D.c.total); }
function headPs(D, slide, o = {}) {
  const Z = D.c.Z, ps = [];
  if (slide.eyebrow) ps.push(P(slide.eyebrow, Z.eyebrow, { role: 'label', bold: true, color: o.ec || K.BLUE, sa: 6, spc: D.rtl ? 0 : 100, caps: !D.rtl, ref: ['eyebrow'] }));
  if (slide.title) ps.push(P(slide.title, o.ts || Z.title, { role: 'head', bold: true, color: o.tc || K.NAVY, lh: 1.08, ref: ['title'] }));
  if (slide.subtitle) ps.push(P(slide.subtitle, o.ss || Z.subtitle, { role: o.subRole || 'body', bold: !!o.subBold, color: o.sc || K.MUTED, sb: 6, lh: 1.2, ref: ['subtitle'] }));
  return ps;
}


/* Q&A: question in bold, answer underneath, the original question number large in Sequel */
function qaRows(D, d, x, y, w, bot, o = {}) {
  const Z = D.c.Z, its = d.items.slice(0, 3), n = its.length;
  const gap = 22, rh = (bot - y - gap * (n - 1)) / n;
  its.forEach((it, k) => {
    const yy = y + k * (rh + gap);
    if (k) D.line(x, yy - gap / 2, w, 0, o.rule || K.RULE, 0.75);
    D.text(x, yy + 2, 64, 40, [P(it.number ? pad2(it.number) : pad2(k + 1), 24, { role: 'num', color: o.nc || K.LIGHT })], { fit: false, name: 'No.' });
    D.text(x + 76, yy, w - 76, rh, itemPs(D, it, { ts: Z.cardTitle * 1.05, bs: Z.body * 0.95, fg: o.fg || K.NAVY, bc: o.bc || K.GRAY }), { name: 'QA', max: 1.25 });
  });
}
/* =====================================================================
   THEME 1 · رسمي (formal) — ivory pages, thin rules, generous space
   ===================================================================== */
const FORMAL = (() => {
  function chrome(D, o = {}) {
    const dark = !!o.dark;
    D.rect(0, 0, 960, 540, { fill: dark ? K.DEEP : bgColor(D) });
    if (o.panel) o.panel();
    D.logo(48, 26, 62, o.logoW || dark ? K.W : K.NAVY);
    if (!o.noAccent) D.line(852, 36, 60, 0, dark ? '3C5A8C' : K.SKY, 1.5);
    const fx = o.footX || 48, fw = (o.footW || 912) - fx;
    D.line(fx, 508, fw, 0, dark ? K.RULE_D : 'D6DBE3', 0.75);
    D.text(fx + fw - 120, 514, 120, 11, [P(pageTxt(D), 7, { role: 'num', color: dark ? '7F93B5' : K.MUTED })], { align: 'end', fit: false, name: 'Page' });
  }
  function head(D, slide, x, y, w, o = {}) {
    const Z = D.c.Z;
    D.line(x, y - 12, 34, 0, o.dark ? K.LIGHT : K.LIGHT, 1.5);
    const ps = headPs(D, slide, { ts: (o.big ? 1.15 : 1) * Z.title, tc: o.dark ? K.W : K.NAVY, sc: o.dark ? K.LIGHT : K.BLUE, ss: Z.subtitle * 1.15, subRole: 'head', ec: o.dark ? K.LIGHT : K.BLUE });
    const h = D.text(x, y, w, o.maxH || Z.title * 3.4, ps, { name: 'Title' });
    return y + h;
  }
  const L = [];
  /* ---- cover ---- */
  L.push({ id: 'f-cover', type: 'cover', name: 'غلاف', fit: () => 5, render(D, s) {
    D.base = 'cover';
    const Z = D.c.Z;
    const ps = [];
    if (s.eyebrow) ps.push(P(s.eyebrow, Z.eyebrow * 1.05, { role: 'label', bold: true, color: K.LIGHT, sa: 8, spc: D.rtl ? 0 : 120, caps: !D.rtl, ref: ['eyebrow'] }));
    ps.push(P(s.title || '', Z.coverTitle, { role: 'head', bold: true, color: K.W, lh: 1.05, ref: ['title'] }));
    if (s.subtitle) ps.push(P(s.subtitle, Z.coverTitle * 0.5, { role: 'head', bold: true, color: K.LIGHT, sb: 10, lh: 1.1, ref: ['subtitle'] }));
    const lines = (s.lines || []).slice(0, 4);
    const bottom = lines.length ? 420 : 470;
    D.text(48, 120, 600, bottom - 120 - 20, ps, { anchor: 'b', min: 0.5, name: 'Title' });
    if (lines.length) {
      D.line(48, bottom, 864, 0, '6F8FBF', 0.75);
      const cw = 864 / lines.length;
      lines.forEach((l, i) => {
        if (i) D.line(48 + cw * i, bottom + 14, 0, 40, '6F8FBF', 0.75);
        D.text(48 + cw * i + (i ? 16 : 0), bottom + 16, cw - 26, 44, [P(l, Z.note * 1.1, { color: 'E6EEF8', lh: 1.25, ref: ['lines', i] })], { name: 'Info' });
      });
    }
  } });
  /* ---- agenda ---- */
  L.push({ id: 'f-agenda', type: 'agenda', name: 'أجندة', fit: () => 5, render(D, s) {
    const Z = D.c.Z;
    chrome(D);
    head(D, Object.assign({}, s, { title: s.title || (D.rtl ? 'جدول الأعمال' : 'Agenda') }), 48, 120, 300, { big: true });
    const items = (s.items || []).slice(0, 12);
    const n = Math.max(1, items.length), cols = n > 6 ? 2 : 1, per = Math.ceil(n / cols);
    const top = 96, bot = 488, slot = Math.min(84, (bot - top) / per), cw = cols === 2 ? 248 : 512;
    const y0 = top + (bot - top - slot * per) / 2;
    items.forEach((it, i) => {
      const c = Math.floor(i / per), x = 400 + c * (cw + 16), y = y0 + (i % per) * slot;
      D.line(x, y, cw, 0, K.RULE, 0.75);
      D.text(x, y + 12, 44, slot - 16, [P(pad2(i + 1), Math.min(20, slot * 0.34), { role: 'num', color: K.BLUE })], { fit: false, name: 'No.' });
      const ps = [P(it.title || '', Z.cardTitle * (n > 6 ? 0.9 : 1.12), { bold: true, color: K.NAVY, ref: ['items', i, 'title'] })];
      if (it.sub) ps.push(P(it.sub, Z.body * 0.95, { color: K.MUTED, sb: 3, ref: ['items', i, 'sub'] }));
      const ix = it.icon ? 34 : 0; if (it.icon) D.icon(it.icon, x + 48, y + 13, Math.min(24, slot * 0.4), K.BLUE, ['items', i]);
      D.text(x + 48 + ix, y + 12, cw - 48 - ix, slot - 16, ps, { name: 'Agenda item' });
    });
  } });
  /* ---- dividers ---- */
  L.push({ id: 'f-divider', type: 'divider', name: 'فاصل برقم كبير', fit: () => 5, render(D, s, d) {
    const Z = D.c.Z;
    D.ph(d, 0, 0, 0, 960, 540, { bleed: true });
    D.fade(0, 0, 960, 540, K.DEEP, 'toEnd', 94, 35);
    D.logo(48, 26, 62, K.W);
    D.line(852, 36, 60, 0, '6F8FBF', 1.5);
    D.text(48, 110, 400, 130, [P(pad2(D.c.divNo || 1), 96, { role: 'num', color: K.LIGHT, lh: 1 })], { fit: false, name: 'Number' });
    D.text(48, 270, 520, 180, [P(s.title || '', Z.dividerTitle, { role: 'head', bold: true, color: K.W, lh: 1.1, ref: ['title'] })], { min: 0.5, name: 'Divider title' });
    D.line(48, 470, 380, 0, '6F8FBF', 0.75);
  } });
  L.push({ id: 'f-divider-t', type: 'divider', name: 'فاصل التمبلت (عنوان فقط)', fit: () => 3, render(D, s) { D.base = 'divider'; D.p.push(...layoutDivider(s, D.c).prims); } });
  /* ---- closing ---- */
  L.push({ id: 'f-closing', type: 'closing', name: 'ختام', fit: () => 5, render(D, s) {
    D.base = 'closing';
    const Z = D.c.Z;
    D.line(48, 330, 60, 0, K.LIGHT, 1.5);
    const ps = [P(s.title || (D.rtl ? 'شكرًا لكم' : 'Thank You'), Z.coverTitle * 1.05, { role: 'head', bold: true, color: K.W, ref: ['title'] })];
    if (s.subtitle) ps.push(P(s.subtitle, Z.subtitle * 1.2, { color: K.LIGHT, sb: 8, ref: ['subtitle'] }));
    D.text(48, 344, 640, 140, ps, { name: 'Title' });
  } });

  /* ---- content ---- */
  L.push({ id: 'f-grid', type: 'content', name: 'شبكة محاور', fit: d => (d.other.length || d.nK) ? -1 : (d.nI >= 4 && d.nI <= 6 ? 6 : d.nI === 3 ? 3.5 : -1) - (d.avgLen > 230 ? 3 : 0), render(D, s, d) {
    const Z = D.c.Z;
    chrome(D);
    const hb = head(D, s, 48, 86, 640);
    const its = d.items.slice(0, 6), n = its.length;
    const cols = n === 4 ? 4 : 3, rows = Math.ceil(n / cols);
    const y0 = rows === 1 ? Math.max(hb + 60, 220) : Math.max(hb + 40, 170), gx = 34, gy = 26;
    const cw = (864 - gx * (cols - 1)) / cols, ch = (490 - y0 - gy * (rows - 1)) / rows;
    its.forEach((it, k) => {
      const c = k % cols, r = Math.floor(k / cols);
      const x = 48 + c * (cw + gx), y = y0 + r * (ch + gy);
      D.line(x, y, cw, 0, K.RULE, 0.75);
      let yy = y + 16;
      if (it.icon) { D.icon(it.icon, x, yy, 26, K.BLUE, it._b); yy += 38; }
      else { D.text(x, yy, 60, 14, [P(pad2(k + 1), 10, { role: 'num', color: K.BLUE })], { fit: false, name: 'No.' }); yy += 24; }
      D.text(x, yy, cw, y + ch - yy, itemPs(D, it, { vs: Z.value }), { name: 'Pillar', max: 1.45 });
    });
  } });
  L.push({ id: 'f-statement', type: 'content', name: 'رسالة + صورة', fit: d => (d.other.length || d.nI > 2 || d.nK || d.nB > 4) ? -1 : ((d.pLen || d.feature) ? 4 + (d.nImg ? 2 : 0) - (d.pLen > 950 ? 3 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    chrome(D, { footW: 590, panel: () => D.ph(d, 0, 630, 0, 330, 540, { bleed: true }) });
    const hb = head(D, s, 48, 86, 520);
    const ps = [...featurePs(D, d.feature), ...paraPs(D, d, { bs: Z.body * 1.15, lh: 1.45, gap: 10 }), ...d.rows.flatMap(it => itemPs(D, it, {}))];
    D.text(48, hb + 30, 520, 490 - hb - 30, ps, { name: 'Body' });
  } });
  L.push({ id: 'f-vision', type: 'content', name: 'رؤية + صورة', fit: d => (d.other.length || d.nI > 2 || d.nK || d.nB) ? -1 : ((d.feature || s_sub(d)) && d.pLen ? 4.5 + (d.nImg ? 1.5 : 0) - (d.pLen > 700 ? 3 : 0) : (d.feature && !d.pLen ? 3 : -1)), render(D, s, d) {
    const Z = D.c.Z;
    chrome(D, { panel: () => D.ph(d, 0, 430, 0, 530, 262, { bleed: true }) });
    let hb = head(D, s, 48, 110, 340, { big: true });
    if (d.feature) D.text(48, hb + 24, 340, 470 - hb - 24, featurePs(D, d.feature, { ts: Z.featureTitle, bs: Z.body * 1.05 }), { name: 'Statement' });
    D.line(430, 300, 0, 180, K.RULE, 0.75);
    D.line(458, 298, 36, 0, K.LIGHT, 1.5);
    const rows = d.rows.flatMap(it => itemPs(D, it, {}));
    D.text(458, 312, 454, 180, [...paraPs(D, d, { lh: 1.45 }), ...rows], { name: 'Body' });
  } });
  L.push({ id: 'f-abc', type: 'content', name: 'صورة + أقسام', fit: d => (d.other.length || d.nK) ? -1 : (d.nI >= 2 && d.nI <= 4 ? 4.5 + (d.nImg ? 1.5 : 0) - (d.avgLen > 260 ? 2 : 0) : (d.nB >= 2 && d.nB <= 4 ? 3 : -1)), render(D, s, d) {
    const Z = D.c.Z;
    chrome(D, { footX: 340, logoW: true, panel: () => { D.ph(d, 0, 0, 0, 300, 540, { bleed: true }); D.fade(0, 0, 300, 540, K.DEEP, 'down', 45, 96); } });
    D.line(32, 318, 34, 0, K.LIGHT, 1.5);
    D.text(32, 330, 240, 150, headPs(D, s, { tc: K.W, sc: 'D5E0EE', ts: Z.title * 0.95 }), { name: 'Title' });
    const its = d.rows.slice(0, 4), n = its.length;
    const top = 70, bot = 490, rh = (bot - top) / n;
    its.forEach((it, k) => {
      const y = top + k * rh;
      if (k) D.line(340, y, 572, 0, K.RULE, 0.75);
      if (it.icon) D.icon(it.icon, 340, y + 20, 28, K.BLUE, it._b);
      else D.text(340, y + 18, 60, 34, [P(pad2(k + 1), 22, { role: 'num', color: K.BLUE })], { fit: false, name: 'No.' });
      D.text(410, y + 20, 502, rh - 30, itemPs(D, it, {}), { name: 'Section' });
    });
  } });
  L.push({ id: 'f-tracks', type: 'content', name: 'مسارات', fit: d => d.other.length ? -1 : (d.nK >= 2 && d.nK <= 5 && d.nI === 0 ? 6.5 : (d.nI >= 3 && d.nI <= 5 ? (d.withVal >= d.nI - 1 ? 6 : 3.5) : -1)), render(D, s, d) {
    const Z = D.c.Z;
    chrome(D);
    const hb = head(D, s, 48, 100, 600, { big: true });
    const its = (d.nK ? d.kpis : d.items).slice(0, 5), n = its.length;
    const rest0 = restPs(D, d);
    const top = rest0.length ? Math.max(hb + 130, 300) : Math.max(hb + 60, 250), gx = 30, cw = (864 - gx * (n - 1)) / n;
    let vs = Z.kpi; for (const it of its) if (it.value) while (vs > 16 && textW(it.value, vs, 'num') > cw) vs -= 1;
    its.forEach((it, k) => {
      const x = 48 + k * (cw + gx);
      D.line(x, top, cw, 0, K.BLUE, 1.25);
      const ps = it.value ? itemPs(D, it, { vs, vc: K.BLUE }) : [P(pad2(k + 1), Z.kpi * 0.8, { role: 'num', color: K.BLUE, sa: 6 }), ...itemPs(D, it, {})];
      D.text(x, top + 16, cw, 490 - top - 16, ps, { name: 'Track' });
    });
    if (rest0.length) D.text(48, hb + 16, 760, top - hb - 40, rest0, { name: 'Intro' });
  } });
  L.push({ id: 'f-report', type: 'content', name: 'تقرير + صورة', fit: d => (d.other.length || d.nK) ? -1 : (d.rows.length >= 4 && d.rows.length <= 8 && (d.avgLen < 120 || !d.nI) ? 4.5 + (d.nImg ? 1.5 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    chrome(D, { footW: 440, panel: () => { D.ph(d, 0, 470, 120, 230, 420, { bleed: true }); D.ph(d, 1, 712, 120, 248, 170, { bleed: true }); } });
    const hb = head(D, s, 48, 86, 390);
    const cap = d.note ? [P(d.note.t, Z.note, { color: K.MUTED, ref: d.note.ref })] : restPs(D, d, { bs: Z.body * 0.95 });
    if (cap.length) D.text(712, 304, 200, 186, cap, { name: 'Caption' });
    const its = d.rows.slice(0, 8), n = its.length;
    const top = hb + 26, rh = Math.min(52, (490 - top) / n);
    its.forEach((it, k) => {
      const y = top + k * rh;
      D.line(48, y, 392, 0, K.RULE, 0.75);
      D.text(48, y + 9, 34, 12, [P(pad2(k + 1), 8.5, { role: 'num', color: K.BLUE })], { fit: false, name: 'No.' });
      D.text(88, y + 7, 352, rh - 10, itemPs(D, it, { ts: Z.body * 1.05, bs: Z.body * 0.92, solo: K.TEXT }), { name: 'Row' });
    });
  } });
  L.push({ id: 'f-gallery', type: 'content', name: 'معرض صور', fit: d => (d.nImg >= 2 && !d.other.length && d.nI <= 2 && !d.nK && d.pLen < 400) ? 6 : -1, render(D, s, d) {
    const Z = D.c.Z;
    chrome(D, { dark: true });
    const hb = head(D, s, 48, 86, 700, { dark: true });
    const y = Math.max(hb + 30, 160);
    D.ph(d, 0, 48, y, 500, 270);
    D.ph(d, 1, 568, y, 344, 270);
    const caps = [d.items[0], d.items[1]];
    if (caps[0]) D.text(48, y + 286, 500, 490 - y - 286, itemPs(D, caps[0], { fg: K.W, bc: K.BODY_D }), { name: 'Caption' });
    if (caps[1]) D.text(568, y + 286, 344, 490 - y - 286, itemPs(D, caps[1], { fg: K.W, bc: K.BODY_D }), { name: 'Caption' });
    if (!d.nI && d.pLen) D.text(48, y + 286, 864, 490 - y - 286, paraPs(D, d, { color: K.BODY_D }), { name: 'Caption' });
  } });
  L.push({ id: 'f-process', type: 'content', name: 'مراحل عملية', fit: d => (d.other.length || d.nK) ? -1 : (d.nI >= 3 && d.nI <= 5 ? (d.timeline ? 6.5 : 3) - (d.avgLen > 200 ? 2 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    chrome(D);
    const hb = head(D, s, 48, 86, 640);
    const its = d.items.slice(0, 5), n = its.length;
    const ly = Math.max(hb + 70, 240), cw = 864 / n;
    D.line(58, ly + 9, 838, 0, K.BLUE, 1, { dash: true });
    D.poly([[912, ly + 9], [902, ly + 4], [902, ly + 14]], K.BLUE);
    its.forEach((it, k) => {
      const x = 48 + k * cw;
      D.dot(x, ly, 18, k === n - 1 ? K.NAVY : K.BLUE, { ring: bgColor(D), rw: 3 });
      D.text(x - 1, ly + 4, 20, 10, [P(pad2(k + 1), 6.5, { role: 'num', color: K.W })], { align: 'center', fit: false, name: 'No.' });
      D.text(x, ly + 36, cw - 26, 490 - ly - 36, itemPs(D, it, { dc: K.BLUE }), { name: 'Step' });
    });
    const rest = restPs(D, d);
    if (rest.length && ly > 250) D.text(48, hb + 12, 640, ly - hb - 30, rest, { name: 'Intro' });
  } });
  L.push({ id: 'f-mosaic', type: 'content', name: 'نص + شبكة صور', fit: d => (d.nImg >= 3 && !d.other.length && !d.nK && d.rows.length <= 4) ? 6 : -1, render(D, s, d) {
    const Z = D.c.Z;
    chrome(D, { footW: 330 });
    const hb = head(D, s, 48, 86, 270);
    D.text(48, hb + 24, 270, 490 - hb - 24, [...restPs(D, d, { bs: Z.body }), ...d.rows.flatMap(it => itemPs(D, it, { ts: Z.body * 1.05 }))], { name: 'Body' });
    const own = d.imgs.filter(x => !x.item).length;
    const n = Math.min(9, Math.max(own, 3) <= 4 ? 4 : (own >= 6 ? 6 : own)), cols = n === 4 ? 2 : 3, rows = Math.ceil(n / cols);
    const x0 = 360, w = 600, g = 4, cw = (w - g * (cols - 1)) / cols, ch = (540 - g * (rows - 1)) / rows;
    for (let k = 0; k < n; k++) D.ph(d, k, x0 + (k % cols) * (cw + g), Math.floor(k / cols) * (ch + g), cw, ch, { bleed: true });
  } });
  L.push({ id: 'f-cards', type: 'content', name: 'بطاقات بإطار', fit: d => (d.other.length || d.nK) ? -1 : (d.nI === 4 ? 4 : d.nI === 2 ? 3 : -1) - (d.avgLen > 260 ? 2 : 0), render(D, s, d) {
    const Z = D.c.Z;
    chrome(D);
    const hb = head(D, s, 48, 86, 700);
    const its = d.items.slice(0, 4), n = its.length, cols = 2, rows = Math.ceil(n / 2);
    const y0 = Math.max(hb + 30, 160), g = 18, cw = (864 - g) / 2, ch = (490 - y0 - g * (rows - 1)) / rows;
    its.forEach((it, k) => {
      const x = 48 + (k % 2) * (cw + g), y = y0 + Math.floor(k / 2) * (ch + g);
      D.rect(x, y, cw, ch, { r: 12, stroke: K.RULE, sw: 0.9, item: it._b });
      let tx = x + 22;
      if (it.icon) { D.icon(it.icon, x + 22, y + 22, 26, K.BLUE, it._b); tx = x + 64; }
      if (it.value) D.text(x + cw - 170, y + 20, 150, 30, [P(it.value, Z.value, { role: 'num', color: K.BLUE, ref: it._r.value })], { align: 'end', name: 'Value' });
      D.text(tx, y + 22, x + cw - (it.value ? 180 : 22) - tx, ch - 40, itemPs(D, it, { value: false }), { name: 'Card' });
    });
  } });
  L.push({ id: 'f-schedule', type: 'content', name: 'جدول / أسبوع', fit: d => (d.other.length || d.nK) ? -1 : (d.nI >= 4 && d.nI <= 6 ? (d.withBul >= d.nI - 1 ? 6 : d.timeline ? 4.5 : 2.5) : -1), render(D, s, d) {
    const Z = D.c.Z;
    chrome(D);
    const hb = head(D, s, 48, 86, 640);
    const its = d.items.slice(0, 6), n = its.length, cw = 864 / n;
    const ly = Math.max(hb + 40, 190);
    D.line(48, ly, 864, 0, K.BLUE, 1);
    its.forEach((it, k) => {
      const x = 48 + k * cw;
      D.dot(x - 3, ly - 3, 6, K.BLUE, { rw: 0 });
      if (k) D.line(x - 8, ly + 18, 0, 470 - ly, K.RULE2, 0.75);
      D.text(x, ly + 18, cw - 18, 488 - ly - 18, itemPs(D, it, { ts: Z.cardTitle * 0.95, bs: Z.body * 0.95 }), { name: 'Column' });
    });
  } });
  L.push({ id: 'f-twocol', type: 'content', name: 'عمودين قوائم', fit: d => (d.groups.length === 2 && !d.other.length && !d.nK && d.groups.every(g => g.rows.length >= 2 && g.rows.length <= 6)) ? 6.5 : -1, render(D, s, d) {
    const Z = D.c.Z;
    chrome(D, { footX: 520, panel: () => D.rect(0, 0, 470, 540, { fill: K.DEEP }), logoW: true });
    head(D, s, 48, 86, 380, { dark: true });
    const col = (g, x, w, dark) => {
      const top = 200, n = g.rows.length, rh = Math.min(66, (490 - top - 30) / n);
      if (g.heading) D.text(x, top - 6, w, 22, [P(g.heading, Z.heading * 1.05, { role: 'label', bold: true, color: dark ? K.LIGHT : K.BLUE, ref: g.hr })], { name: 'Heading' });
      g.rows.forEach((it, k) => {
        const y = top + 26 + k * rh;
        D.line(x, y, w, 0, dark ? K.RULE_D : K.RULE, 0.75);
        D.text(x, y + 10, 36, 12, [P(pad2(k + 1), 8.5, { role: 'num', color: dark ? K.LIGHT : K.BLUE })], { fit: false, name: 'No.' });
        D.text(x + 40, y + 9, w - 40, rh - 12, itemPs(D, it, { fg: dark ? K.W : K.NAVY, bc: dark ? K.BODY_D : K.GRAY, solo: dark ? K.W : K.TEXT, ts: Z.body * 1.05, bs: Z.body * 0.95 }), { name: 'Row' });
      });
    };
    col(d.groups[0], 48, 380, true);
    col(d.groups[1], 520, 392, false);
  } });
  L.push({ id: 'f-duo', type: 'content', name: 'صورتان مميزتان', fit: d => (d.nI === 2 && !d.other.length && !d.nK && d.avgLen < 220) ? 3.5 + (d.nImg >= 2 || d.imgs.filter(x => x.item).length >= 2 ? 2.5 : 0) : -1, render(D, s, d) {
    const Z = D.c.Z;
    chrome(D, { dark: true });
    const hb = head(D, s, 48, 110, 300, { dark: true });
    const r = restPs(D, d, { color: K.BODY_D, bc: K.BODY_D, fg: K.LIGHT });
    if (r.length) D.text(48, hb + 22, 300, 480 - hb - 22, r, { name: 'Body' });
    d.items.slice(0, 2).forEach((it, k) => {
      const x = 384 + k * 272;
      const own = it.img ? { id: it.img } : D.photo(d, k);
      D.img(own.id, x, 96, 256, 250, { r: 0 });
      D.text(x, 362, 256, 128, itemPs(D, it, { fg: K.W, bc: K.BODY_D, vc: K.LIGHT }), { name: 'Caption' });
    });
  } });
  L.push({ id: 'f-qa', type: 'content', name: 'سؤال وجواب', fit: d => (d.qa && d.nI <= 3 && !d.other.length) ? 8 : -1, render(D, s, d) {
    const Z = D.c.Z;
    if (d.nI === 1) {
      chrome(D, { footX: 340, logoW: true, panel: () => { D.ph(d, 0, 0, 0, 300, 540, { bleed: true }); D.fade(0, 0, 300, 540, K.DEEP, 'down', 40, 96); } });
      const it = d.items[0];
      D.text(32, 300, 240, 80, [P(it.number ? pad2(it.number) : '؟', 64, { role: 'num', color: K.LIGHT })], { fit: false, name: 'No.' });
      D.text(32, 390, 240, 110, headPs(D, s, { tc: K.W, sc: K.BODY_D, ts: Z.title * 0.8 }), { name: 'Title' });
      D.text(340, 80, 572, 410, itemPs(D, it, { ts: Z.featureTitle * 0.95, fg: K.BLUE, bs: Z.body * 1.05 }), { name: 'QA', max: 1.3 });
      return;
    }
    chrome(D);
    const hb = head(D, s, 48, 86, 760);
    qaRows(D, d, 48, hb + 30, 864, 492);
  } });
  L.push({ id: 'f-qa2', type: 'content', name: 'سؤال وجواب (عمودين)', fit: d => (d.qa && d.nI <= 2 && !d.other.length) ? 7.6 : -1, render(D, s, d) {
    const Z = D.c.Z;
    chrome(D);
    const hb = head(D, s, 48, 86, 760, {});
    const its = d.items.slice(0, 2), n = its.length, y0 = hb + 30, rh = (490 - y0 - 24 * (n - 1)) / n;
    its.forEach((it, k) => {
      const y = y0 + k * (rh + 24);
      if (k) D.line(48, y - 12, 864, 0, K.RULE, 0.75);
      D.text(48, y, 70, 44, [P(it.number ? pad2(it.number) : pad2(k + 1), 30, { role: 'num', color: K.LIGHT })], { fit: false, name: 'No.' });
      D.text(128, y, 300, rh, itemPs(D, it, { text: false, ts: Z.cardTitle * 1.1, fg: K.BLUE }), { name: 'Question', max: 1.3 });
      D.line(452, y + 4, 0, rh - 8, K.RULE, 0.75);
      D.text(476, y, 436, rh, itemPs(D, it, { title: false, bs: Z.body }), { name: 'Answer', max: 1.25 });
    });
  } });
  L.push({ id: 'f-generic', type: 'content', name: 'مرن', fit: d => d.other.length ? (d.oChart || !d.tables.length ? 9 : 6) : 1, render(D, s, d) {
    chrome(D, { footW: d.nImg ? 560 : 912, panel: d.nImg ? () => D.ph(d, 0, 600, 0, 360, 540, { bleed: true }) : null });
    const w = d.nImg ? 512 : 864;
    const hb = head(D, s, 48, 86, w);
    genericBody(D, s, d, 48, w, hb + 26, 492);
  } });
  return { id: 'formal', name: 'رسمي', en: 'Formal', desc: 'هادئ ورسمي، صفحات عاجية وخطوط رفيعة ومساحات واسعة. للتعريف بالإدارات والمبادرات والتقارير.', layouts: L, preview: ['f-cover', 'f-grid', 'f-process', 'f-abc'], kit: { pfx: 'f', chrome, head, Y: 86, acc: K.LIGHT, num: K.BLUE } };
})();
function s_sub(d) { return false; }

/* =====================================================================
   THEME 2 · عملي (practical) — the official white page, icons, comparisons
   ===================================================================== */
const PRACTICAL = (() => {
  function head(D, slide, x, y, w, o = {}) {
    const Z = D.c.Z;
    D.line(x, y - 9, 34, 0, o.dark ? K.LIGHT : K.BLUE, 2);
    const h = D.text(x, y, w, o.maxH || Z.title * 3.2, headPs(D, slide, { tc: o.dark ? K.W : K.NAVY, sc: o.dark ? K.BODY_D : K.MUTED, ts: Z.title * (o.k || 1) }), { name: 'Title' });
    if (!o.noRule) D.line(x, y + h + 12, w * (o.ruleW || 0.82), 0, o.dark ? K.RULE_D : 'D3D9E2', 0.75);
    return y + h + 12;
  }
  const whiteLogo = D => D.logo(TLOGO.x, TLOGO.y, TLOGO.w, K.W);
  function rowsList(D, its, x, y, w, bot, o = {}) {
    const Z = D.c.Z, n = its.length; if (!n) return;
    const rh = Math.min(o.maxRow || 100, (bot - y) / n);
    its.forEach((it, k) => {
      const yy = y + k * rh;
      if (k || o.firstRule) D.line(x, yy, w, 0, o.dark ? K.RULE_D : K.RULE2, 0.75);
      let tx = x;
      if (it.icon) { D.icon(it.icon, x, yy + 14, 24, o.dark ? K.LIGHT : K.BLUE, it._b); tx = x + 40; }
      else if (o.check) { D.icon('lib:circle-check', x, yy + 13, 18, o.dark ? K.LIGHT : K.BLUE, it._b); tx = x + 30; }
      else if (o.nums) { D.text(x, yy + 14, 30, 14, [P(pad2(k + 1), 9, { role: 'num', color: o.dark ? K.LIGHT : K.BLUE })], { fit: false, name: 'No.' }); tx = x + 34; }
      D.text(tx, yy + 12, w - (tx - x), rh - 16, itemPs(D, it, { fg: o.dark ? K.W : K.NAVY, bc: o.dark ? K.BODY_D : K.GRAY, solo: o.dark ? K.W : K.TEXT, ts: o.ts, bs: o.bs }), { name: 'Row' });
    });
  }
  const L = [];
  L.push({ id: 'p-cover', type: 'cover', name: 'غلاف', fit: () => 5, render(D, s) {
    D.base = 'cover';
    const Z = D.c.Z;
    D.line(48, 270, 70, 0, K.LIGHT, 1.5);
    const ps = [P(s.title || '', Z.coverTitle, { role: 'head', bold: true, color: K.W, lh: 1.05, ref: ['title'] })];
    if (s.subtitle) ps.push(P(s.subtitle, Z.subtitle * 1.1, { color: 'DCE6F2', sb: 10, ref: ['subtitle'] }));
    D.text(48, 284, 600, 140, ps, { min: 0.5, name: 'Title' });
    const lines = (s.lines || []).slice(0, 3);
    if (lines.length) {
      D.line(48, 446, 864, 0, '6F8FBF', 0.75);
      lines.forEach((l, i) => D.text(48 + i * 300, 458, 280, 40, [P(l, Z.note * 1.1, { color: 'E6EEF8', ref: ['lines', i] })], { name: 'Info' }));
    }
  } });
  L.push({ id: 'p-agenda', type: 'agenda', name: 'أجندة', fit: () => 5, render(D, s) {
    const Z = D.c.Z;
    const hb = head(D, Object.assign({}, s, { title: s.title || (D.rtl ? 'جدول الأعمال' : 'Agenda') }), 48, 52, 864);
    const items = (s.items || []).slice(0, 10), n = items.length;
    const cols = n > 5 ? 2 : 1, per = Math.ceil(n / cols), cw = cols === 2 ? 410 : 864;
    const top = hb + 30, rh = Math.min(76, (490 - top) / per);
    items.forEach((it, i) => {
      const c = Math.floor(i / per), r = i % per, x = 48 + c * 454, y = top + r * rh;
      D.line(x, y, cw, 0, K.RULE2, 0.75);
      D.text(x, y + 14, 50, 26, [P(pad2(i + 1), 18, { role: 'num', color: K.BLUE })], { fit: false, name: 'No.' });
      const ps = [P(it.title || '', Z.cardTitle * 1.05, { bold: true, color: K.NAVY, ref: ['items', i, 'title'] })];
      if (it.sub) ps.push(P(it.sub, Z.body * 0.95, { color: K.MUTED, sb: 2, ref: ['items', i, 'sub'] }));
      const ix = it.icon ? 36 : 0; if (it.icon) D.icon(it.icon, x + 58, y + 14, Math.min(24, rh * 0.4), K.BLUE, ['items', i]);
      D.text(x + 58 + ix, y + 14, cw - 58 - ix, rh - 18, ps, { name: 'Agenda item' });
    });
  } });
  L.push({ id: 'p-divider', type: 'divider', name: 'فاصل التمبلت', fit: () => 5, render(D, s) { D.base = 'divider'; D.p.push(...layoutDivider(s, D.c).prims); } });
  L.push({ id: 'p-closing', type: 'closing', name: 'ختام', fit: () => 5, render(D, s) {
    D.base = 'closing';
    const Z = D.c.Z;
    D.line(48, 392, 70, 0, K.LIGHT, 1.5);
    const ps = [P(s.title || (D.rtl ? 'شكرًا لكم' : 'Thank You'), Z.coverTitle * 1.1, { role: 'head', bold: true, color: K.W, ref: ['title'] })];
    if (s.subtitle) ps.push(P(s.subtitle, Z.subtitle * 1.1, { color: 'DCE6F2', sb: 8, ref: ['subtitle'] }));
    D.text(48, 404, 700, 110, ps, { name: 'Title' });
  } });

  L.push({ id: 'p-points', type: 'content', name: 'نقاط + صورة', fit: d => (d.other.length || d.nK) ? -1 : (d.rows.length >= 2 && d.rows.length <= 4 ? 4.5 + (d.nImg ? 1.5 : 0) - (d.avgLen > 240 ? 2 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    D.ph(d, 0, 600, 0, 360, 540, { bleed: true });
    const cap = d.note ? [P(d.note.t, Z.note * 1.05, { color: K.W, ref: d.note.ref })] : [];
    if (cap.length) { D.fade(600, 300, 360, 240, K.NAVY, 'down', 0, 85); D.text(628, 440, 300, 70, cap, { anchor: 'b', name: 'Caption' }); }
    const hb = head(D, s, 48, 52, 512);
    const rest = restPs(D, d);
    let y = hb + 20;
    if (rest.length) y += D.text(48, y, 512, 90, rest, { name: 'Intro' }) + 14;
    rowsList(D, d.rows.slice(0, 4), 48, y, 512, 492, {});
  } });
  L.push({ id: 'p-compare', type: 'content', name: 'مقارنة خيارين', fit: d => (d.other.length || d.nK) ? -1 : (d.nI === 2 && (d.withBul || d.avgLen > 40) ? 6 : (d.groups.length === 2 && d.groups.every(g => g.rows.length >= 2) ? 5 : -1)), render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 52, 864);
    const opts = d.nI === 2 && !(d.groups.length === 2 && d.groups.every(g => g.rows.length >= 2) && !d.withBul) ? d.items.map(it => ({ it })) : d.groups.map(g => ({ g }));
    const y0 = hb + 26, cw = 423;
    opts.slice(0, 2).forEach((o, k) => {
      const x = 48 + k * (cw + 18), h = 492 - y0;
      D.rect(x, y0, cw, h, { r: 12, stroke: k === 0 ? K.BLUE : K.RULE, sw: k === 0 ? 1.5 : 0.9, item: o.it ? o.it._b : null });
      if (o.it) {
        const it = o.it;
        let ty = y0 + 22;
        if (it.icon) { D.icon(it.icon, x + 24, ty, 26, K.BLUE, it._b); ty += 38; }
        const head1 = [];
        if (it.value) head1.push(P(it.value, Z.value, { role: 'num', color: K.BLUE, sa: 4, ref: it._r.value }));
        if (it.title) head1.push(P(it.title, Z.cardTitle * 1.1, { bold: true, color: K.NAVY, sa: 6, ref: it._r.title }));
        if (it.text) String(it.text).split('\n').forEach((l, li) => head1.push(P(l, Z.body, { color: K.GRAY, sa: 3, ref: it._r.text, line: li })));
        const hh = D.text(x + 24, ty, cw - 48, 150, head1, { name: 'Option' });
        const bul = (it.bullets || []).map((b, bi) => mkItem(b, it._r.bullets.concat(bi)));
        rowsList(D, bul, x + 24, ty + hh + 16, cw - 48, y0 + h - 14, { check: true, firstRule: true, maxRow: 52, bs: Z.body * 0.95 });
      } else {
        const g = o.g;
        if (g.heading) D.text(x + 24, y0 + 22, cw - 48, 40, [P(g.heading, Z.cardTitle * 1.1, { bold: true, color: K.NAVY, ref: g.hr })], { name: 'Option' });
        rowsList(D, g.rows, x + 24, y0 + (g.heading ? 70 : 22), cw - 48, y0 + h - 14, { check: true, firstRule: !!g.heading, maxRow: 60, bs: Z.body * 0.95 });
      }
    });
  } });
  L.push({ id: 'p-options', type: 'content', name: 'خياران متقابلان', fit: d => (d.nI === 2 && d.withVal === 2 && !d.other.length && !d.nK) ? 5 : (d.nK === 2 && !d.nI && !d.other.length ? 4.5 : -1), render(D, s, d) {
    const Z = D.c.Z;
    D.rect(0, 0, 960, 540, { fill: K.NAVY });
    D.logo(TLOGO.x, TLOGO.y, TLOGO.w, K.W);
    const hb = head(D, s, 48, 52, 864, { dark: true });
    const its = (d.nI ? d.items : d.kpis).slice(0, 2);
    const y0 = hb + 34;
    D.line(480, y0, 0, 470 - y0, K.RULE_D, 0.75);
    its.forEach((it, k) => {
      const x = 48 + k * 456, w = 408;
      D.text(x, y0, w, 470 - y0, itemPs(D, it, { vs: Z.kpi * 1.15, vc: K.LIGHT, fg: K.W, bc: K.BODY_D, bul: K.LIGHT, ts: Z.cardTitle * 1.1 }), { name: 'Option' });
    });
  } });
  L.push({ id: 'p-journey', type: 'content', name: 'رحلة مراحل + صورة', fit: d => (d.other.length || d.nK) ? -1 : (d.nI >= 3 && d.nI <= 5 ? (d.timeline || d.withVal >= 2 ? 5.5 : 3.5) - (d.avgLen > 160 ? 2.5 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    D.ph(d, 0, 17, 392, 943, 148, { bleed: true });
    const hb = head(D, s, 48, 52, 864);
    const its = d.items.slice(0, 5), n = its.length, cw = 864 / n;
    const top = hb + 26, ly = top + 52;
    D.line(48, ly, 864, 0, K.RULE, 0.75);
    its.forEach((it, k) => {
      const x = 48 + k * cw;
      const v = it.value || it.date || pad2(k + 1);
      D.text(x, top, cw - 60, 40, [P(v, Z.value * 1.05, { role: 'num', color: K.LIGHT, ref: it.value ? it._r.value : (it.date ? it._r.date : null) })], { anchor: 'b', name: 'Stage', min: 0.4 });
      if (it.icon) D.icon(it.icon, x + cw - 56, top + 10, 24, K.NAVY, it._b);
      D.dot(x, ly - 4, 8, K.BLUE, { rw: 0 });
      D.text(x, ly + 16, cw - 22, 372 - ly - 16, itemPs(D, it, { value: false, date: false, ts: Z.cardTitle * 0.95, bs: Z.body * 0.95 }), { name: 'Stage text' });
    });
  } });
  L.push({ id: 'p-imgcheck', type: 'content', name: 'صورة + قائمة تحقق', fit: d => (d.other.length || d.nK) ? -1 : (d.rows.length >= 3 && d.rows.length <= 6 ? 4.5 + (d.nImg ? 1.5 : 0) - (d.avgLen > 200 ? 2 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    D.ph(d, 0, 0, 0, 330, 540, { bleed: true });
    D.fade(0, 0, 330, 540, K.NAVY, 'down', 35, 94);
    whiteLogo(D);
    D.line(34, 318, 34, 0, K.LIGHT, 2);
    D.text(34, 330, 266, 170, headPs(D, s, { tc: K.W, sc: K.BODY_D, ts: Z.title * 0.95 }), { name: 'Title' });
    const rest = restPs(D, d);
    let y = 60;
    if (rest.length) y += D.text(370, y, 542, 100, rest, { name: 'Intro' }) + 16;
    rowsList(D, d.rows.slice(0, 6), 370, y, 542, 492, { firstRule: true, check: !d.rows.some(it => it.icon), maxRow: 84 });
  } });
  L.push({ id: 'p-3cards', type: 'content', name: '3 بطاقات بصور', fit: d => (d.nI === 3 && !d.other.length && !d.nK) ? 4.5 + (d.imgs.filter(x => x.item).length === 3 || d.nImg >= 3 ? 2 : 0) - (d.avgLen > 220 ? 2 : 0) : -1, render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 52, 864);
    const y0 = hb + 24, cw = 274, g = 21;
    d.items.slice(0, 3).forEach((it, k) => {
      const x = 48 + k * (cw + g);
      const ph = it.img ? { id: it.img } : D.photo(d, k);
      D.img(ph.id, x, y0, cw, 128, { item: it._b });
      let ty = y0 + 144;
      if (it.icon) { D.icon(it.icon, x, ty, 22, K.BLUE, it._b); }
      D.text(it.icon ? x + 32 : x, ty, it.icon ? cw - 32 : cw, 492 - ty, itemPs(D, it, {}), { name: 'Card' });
    });
  } });
  L.push({ id: 'p-checklists', type: 'content', name: 'عمودين قوائم تحقق', fit: d => (d.other.length || d.nK) ? -1 : (d.groups.length === 2 && d.groups.every(g => g.rows.length >= 2 && g.rows.length <= 7) ? 5.5 : (d.nB >= 6 && d.nB <= 12 && !d.nI ? 4.5 : -1)), render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 52, 864);
    const groups = d.groups.length === 2 ? d.groups : [{ rows: d.bullets.slice(0, Math.ceil(d.nB / 2)) }, { rows: d.bullets.slice(Math.ceil(d.nB / 2)) }];
    const y0 = hb + 26;
    D.line(480, y0 + 4, 0, 488 - y0, K.RULE2, 0.75);
    groups.forEach((g, k) => {
      const x = 48 + k * 456, w = 408;
      let y = y0;
      if (g.heading) { D.text(x, y, w, 40, [P(g.heading, Z.cardTitle * 1.05, { bold: true, color: K.NAVY, ref: g.hr })], { name: 'Heading' }); y += 44; }
      rowsList(D, g.rows, x, y, w, 492, { check: !g.rows.some(it => it.icon), firstRule: true, maxRow: 56, bs: Z.body * 0.98 });
    });
  } });
  L.push({ id: 'p-timekpi', type: 'content', name: 'خط زمني + مؤشرات', fit: d => (d.timeline && d.nI >= 3 && d.nI <= 6 && (d.nK >= 2 && d.nK <= 5) && !d.other.length) ? 7.5 : -1, render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 52, 864);
    const its = d.items.slice(0, 6), n = its.length, cw = 864 / n;
    const ly = hb + 70;
    D.line(48 + cw / 2, ly, 864 - cw, 0, K.LIGHT, 1.5);
    its.forEach((it, k) => {
      const x = 48 + k * cw;
      const top = [];
      if (it.date) top.push(P(it.date, Z.label * 1.1, { role: 'num', color: K.BLUE, ref: it._r.date }));
      D.text(x + 6, ly - 44, cw - 12, 36, top.length ? top : [P(pad2(k + 1), Z.label * 1.1, { role: 'num', color: K.BLUE })], { align: 'center', anchor: 'b', name: 'Date' });
      D.dot(x + cw / 2 - 6, ly - 6, 12, k === n - 1 ? K.NAVY : K.BLUE);
      D.text(x + 6, ly + 18, cw - 12, 300 - ly, itemPs(D, it, { date: false, ts: Z.body * 1.05, bs: Z.body * 0.9 }), { align: 'center', name: 'Milestone' });
    });
    D.line(48, 318, 864, 0, K.RULE2, 0.75);
    const ks = d.kpis.slice(0, 5), m = ks.length, kw = 864 / m;
    ks.forEach((it, k) => {
      const x = 48 + k * kw;
      if (it.icon) D.icon(it.icon, x, 344, 26, K.BLUE, it._b);
      D.text(x + (it.icon ? 38 : 0), 338, kw - (it.icon ? 50 : 12), 150, itemPs(D, it, { vs: Z.value * 1.1, ts: Z.body * 1.02 }), { name: 'KPI' });
    });
  } });
  L.push({ id: 'p-approval', type: 'content', name: 'طلب اعتماد', fit: d => (d.other.length || d.nK) ? -1 : (d.feature && d.rows.length >= 1 && d.rows.length <= 5 ? 6 : -1) + 0, render(D, s, d) {
    const Z = D.c.Z;
    D.rect(560, 0, 400, 540, { fill: K.NAVY });
    const hb = head(D, s, 48, 52, 480);
    let y = hb + 24;
    const fp = featurePs(D, d.feature, { ts: Z.cardTitle * 1.1, fg: K.NAVY, bs: Z.body });
    const fh = Math.min(220, parasHeight(fp, 432) + 44);
    D.rect(48, y, 480, fh, { r: 12, stroke: K.BLUE, sw: 1.5, item: d.feature._b });
    D.text(72, y + 22, 432, fh - 40, fp, { name: 'Request' });
    y += fh + 16;
    const pp = paraPs(D, d, { bs: Z.body * 0.98 });
    if (pp.length && y < 440) { const h2 = Math.min(492 - y, parasHeight(pp, 432) + 40); D.rect(48, y, 480, h2, { r: 12, stroke: K.RULE, sw: 0.9 }); D.text(72, y + 20, 432, h2 - 36, pp, { name: 'Body' }); }
    const its = d.rows.slice(0, 5), n = its.length, top = 70, rh = Math.min(110, (480 - top) / n);
    its.forEach((it, k) => {
      const yy = top + k * rh;
      if (k) D.line(596, yy, 324, 0, K.RULE_D, 0.75);
      D.dot(596, yy + 14, 26, K.NAVY, { ring: K.LIGHT, rw: 1.2 });
      D.text(596, yy + 21, 26, 12, [P(String(k + 1), 9, { role: 'num', color: K.LIGHT })], { align: 'center', fit: false, name: 'No.' });
      D.text(638, yy + 14, 282, rh - 20, itemPs(D, it, { fg: K.W, bc: K.BODY_D, solo: K.W, ts: Z.body * 1.05, bs: Z.body * 0.92 }), { name: 'Point' });
    });
  } });
  L.push({ id: 'p-qa', type: 'content', name: 'سؤال وجواب', fit: d => (d.qa && d.nI <= 3 && !d.other.length) ? 8 : -1, render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 52, 864);
    const its = d.items.slice(0, 3), n = its.length, g = 18, cw = (864 - g * (n - 1)) / n, y0 = hb + 26;
    its.forEach((it, k) => {
      const x = 48 + k * (cw + g);
      D.rect(x, y0, cw, 492 - y0, { r: 12, stroke: k === 0 ? K.BLUE : K.RULE, sw: k === 0 ? 1.5 : 0.9, item: it._b });
      D.text(x + 22, y0 + 18, 80, 36, [P(it.number ? pad2(it.number) : pad2(k + 1), 22, { role: 'num', color: K.BLUE })], { fit: false, name: 'No.' });
      D.text(x + 22, y0 + 60, cw - 44, 492 - y0 - 78, itemPs(D, it, { ts: Z.cardTitle, bs: Z.body * 0.92 }), { name: 'QA', max: 1.25 });
    });
  } });
  L.push({ id: 'p-qa2', type: 'content', name: 'سؤال وجواب (عمودين)', fit: d => (d.qa && d.nI <= 2 && !d.other.length) ? 7.6 : -1, render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 52, 864, {});
    const its = d.items.slice(0, 2), n = its.length, y0 = hb + 30, rh = (490 - y0 - 24 * (n - 1)) / n;
    its.forEach((it, k) => {
      const y = y0 + k * (rh + 24);
      if (k) D.line(48, y - 12, 864, 0, K.RULE, 0.75);
      D.text(48, y, 70, 44, [P(it.number ? pad2(it.number) : pad2(k + 1), 30, { role: 'num', color: K.LIGHT })], { fit: false, name: 'No.' });
      D.text(128, y, 300, rh, itemPs(D, it, { text: false, ts: Z.cardTitle * 1.1, fg: K.BLUE }), { name: 'Question', max: 1.3 });
      D.line(452, y + 4, 0, rh - 8, K.RULE, 0.75);
      D.text(476, y, 436, rh, itemPs(D, it, { title: false, bs: Z.body }), { name: 'Answer', max: 1.25 });
    });
  } });
  L.push({ id: 'p-generic', type: 'content', name: 'مرن', fit: d => d.other.length ? (d.oChart || !d.tables.length ? 9 : 6) : 1, render(D, s, d) {
    if (d.nImg) D.ph(d, 0, 600, 0, 360, 540, { bleed: true });
    const w = d.nImg ? 512 : 864;
    const hb = head(D, s, 48, 52, w);
    genericBody(D, s, d, 48, w, hb + 24, 492);
  } });
  return { id: 'practical', name: 'عملي', en: 'Practical', desc: 'أيقونات ومقارنات وخطوط زمنية على صفحة التمبلت الرسمية. للخطط والمقترحات وطلبات الاعتماد.', layouts: L, preview: ['p-cover', 'p-points', 'p-compare', 'p-journey'], kit: { pfx: 'p', head, Y: 52, acc: K.BLUE, num: K.BLUE } };
})();

/* =====================================================================
   THEME 3 · إبداعي (creative) — photos, numbers, navy panels
   ===================================================================== */
const CREATIVE = (() => {
  function head(D, slide, x, y, w, o = {}) {
    const Z = D.c.Z;
    const h = D.text(x, y, w, o.maxH || Z.title * 3, headPs(D, slide, { tc: o.dark ? K.W : K.NAVY, sc: o.dark ? K.BODY_D : K.MUTED, ts: Z.title * (o.k || 0.95) }), { name: 'Title' });
    if (!o.noRule) D.line(x, y + h + 10, Math.min(w, 380), 0, 'D3D9E2', 1);
    return y + h + 10;
  }
  function chip(D, it, x, y, w, h, o = {}) {
    const Z = D.c.Z;
    D.rect(x, y, w, h, { r: 10, fill: K.NAVY, item: it._b });
    let tx = x + 16;
    if (it.icon) D.icon(it.icon, x + w - 38, y + 14, 22, K.LIGHT, it._b);
    D.text(tx, y + 12, w - 32 - (it.icon ? 30 : 0), h - 20, itemPs(D, it, { vs: o.vs || Z.value, vc: K.W, fg: K.LIGHT, bc: K.BODY_D, ts: Z.body * 0.95, bs: Z.body * 0.85 }), { name: 'KPI' });
  }
  function panel(D, d, x, w, k = 0) {
    D.ph(d, k, x, 250, w, 290, { bleed: true });
    D.rect(x, 0, w, 250, { fill: K.NAVY });
    D.fade(x, 250, w, 200, K.NAVY, 'down', 100, 0);
  }
  const L = [];
  L.push({ id: 'c-cover', type: 'cover', name: 'غلاف', fit: () => 5, render(D, s) {
    D.base = 'cover';
    const Z = D.c.Z;
    const ps = [P(s.title || '', Z.coverTitle * 1.05, { role: 'head', bold: true, color: K.W, lh: 1.08, ref: ['title'] })];
    if (s.subtitle) ps.push(P(s.subtitle, Z.subtitle * 1.15, { color: K.W, sb: 12, ref: ['subtitle'] }));
    (s.lines || []).slice(0, 2).forEach((l, i) => ps.push(P(l, Z.note * 1.1, { color: 'E6EEF8', sb: i ? 2 : 10, ref: ['lines', i] })));
    D.text(150, 230, 660, 230, ps, { align: 'center', anchor: 'b', min: 0.5, name: 'Title' });
  } });
  L.push({ id: 'c-agenda', type: 'agenda', name: 'أجندة', fit: () => 5, render(D, s) {
    const Z = D.c.Z;
    const d0 = { imgs: [] };
    D.ph(d0, 0, 0, 0, 340, 540, { bleed: true });
    D.fade(0, 0, 340, 540, K.NAVY, 'down', 30, 95);
    D.logo(TLOGO.x, TLOGO.y, TLOGO.w, K.W);
    D.text(36, 380, 270, 110, [P(s.title || (D.rtl ? 'جدول الأعمال' : 'Agenda'), Z.title * 1.2, { role: 'head', bold: true, color: K.W, ref: ['title'] })], { anchor: 'b', name: 'Title' });
    const items = (s.items || []).slice(0, 10), n = Math.max(1, items.length);
    const top = 60, rh = Math.min(80, (490 - top) / n), y0 = top + (490 - top - rh * n) / 2;
    items.forEach((it, i) => {
      const y = y0 + i * rh;
      if (i) D.line(380, y, 532, 0, K.RULE2, 0.75);
      D.text(380, y + 12, 50, 30, [P(pad2(i + 1), 20, { role: 'num', color: K.TEAL })], { fit: false, name: 'No.' });
      const ps = [P(it.title || '', Z.cardTitle * 1.05, { bold: true, color: K.NAVY, ref: ['items', i, 'title'] })];
      if (it.sub) ps.push(P(it.sub, Z.body * 0.95, { color: K.MUTED, sb: 2, ref: ['items', i, 'sub'] }));
      const ix = it.icon ? 36 : 0; if (it.icon) D.icon(it.icon, 440, y + 14, Math.min(24, rh * 0.4), K.TEAL, ['items', i]);
      D.text(440 + ix, y + 14, 472 - ix, rh - 18, ps, { name: 'Agenda item' });
    });
  } });
  L.push({ id: 'c-divider', type: 'divider', name: 'فاصل بصورة', fit: () => 5, render(D, s, d) {
    const Z = D.c.Z;
    D.ph(d, 0, 0, 0, 960, 540, { bleed: true });
    D.fade(0, 0, 960, 540, K.NAVY, 'toStart', 92, 10);
    D.logo(TLOGO.x, TLOGO.y, TLOGO.w, K.W);
    D.text(560, 190, 360, 200, [P(s.title || '', Z.dividerTitle, { role: 'head', bold: true, color: K.W, lh: 1.12, ref: ['title'] })], { anchor: 'ctr', min: 0.5, name: 'Divider title' });
    D.line(560, 400, 60, 0, K.TEAL, 2);
  } });
  L.push({ id: 'c-divider-t', type: 'divider', name: 'فاصل التمبلت', fit: () => 3, render(D, s) { D.base = 'divider'; D.p.push(...layoutDivider(s, D.c).prims); } });
  L.push({ id: 'c-closing', type: 'closing', name: 'ختام', fit: () => 5, render(D, s) {
    D.base = 'closing';
    const Z = D.c.Z;
    const ps = [P(s.title || (D.rtl ? 'شكرًا لكم' : 'Thank You'), Z.coverTitle * 1.1, { role: 'head', bold: true, color: K.W, ref: ['title'] })];
    if (s.subtitle) ps.push(P(s.subtitle, Z.subtitle * 1.15, { color: K.LIGHT, sb: 10, ref: ['subtitle'] }));
    D.text(150, 300, 660, 170, ps, { align: 'center', anchor: 'b', name: 'Title' });
  } });

  L.push({ id: 'c-strip', type: 'content', name: 'مقدمة + صور', fit: d => (d.other.length || d.nK || d.nI > 3) ? -1 : (d.pLen || d.feature ? 4 + (d.nImg >= 3 ? 2.5 : 0) - (d.pLen > 700 ? 3 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 44, 864);
    const ps = [...featurePs(D, d.feature, { ts: Z.cardTitle * 1.15 }), ...paraPs(D, d, { lh: 1.45 }), ...d.rows.flatMap(it => itemPs(D, it, {}))];
    // two balanced columns
    const half = Math.ceil(ps.length / 2);
    const A = ps.length > 2 ? ps.slice(0, half) : ps, B = ps.length > 2 ? ps.slice(half) : [];
    const y0 = hb + 22, h = 350 - y0;
    if (B.length) { D.text(48, y0, 418, h, A, { name: 'Body' }); D.line(480, y0, 0, h, K.RULE2, 0.75); D.text(494, y0, 418, h, B, { name: 'Body' }); }
    else D.text(48, y0, 700, h, A, { name: 'Body' });
    const n = 5, g = 12, tw = (864 - g * (n - 1)) / n;
    for (let k = 0; k < n; k++) D.ph(d, k, 48 + k * (tw + g), 372, tw, 120, { r: 8 });
  } });
  L.push({ id: 'c-axes', type: 'content', name: 'محوران بصور', fit: d => (d.nI === 2 && !d.other.length && !d.nK) ? 5 + (d.withVal ? 1 : 0) - (d.avgLen > 260 ? 2 : 0) : -1, render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 44, 864);
    const y0 = hb + 22;
    d.items.slice(0, 2).forEach((it, k) => {
      const x = 48 + k * 444, w = 420;
      const ph = it.img ? { id: it.img } : D.photo(d, k);
      D.img(ph.id, x, y0, w, 210, { r: 12, item: it._b });
      if (it.value) { D.fade(x, y0, w, 90, K.NAVY, 'down', 70, 0); D.text(x + 20, y0 + 16, w - 40, 50, [P(it.value, Z.kpi * 0.9, { role: 'num', color: K.W, ref: it._r.value })], { fit: false, name: 'Value' }); }
      D.text(x, y0 + 226, w, 492 - y0 - 226, itemPs(D, it, { value: false, ts: Z.cardTitle * 1.1 }), { name: 'Axis' });
    });
  } });
  L.push({ id: 'c-kpiband', type: 'content', name: 'شريط أرقام + صورة', fit: d => (d.nK >= 3 && d.nK <= 5 && !d.other.length) ? (d.rows.length || d.pLen ? 6.5 : 4.5) : -1, render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 44, 864);
    const y0 = hb + 20, ks = d.kpis.slice(0, 5), n = ks.length, bw = 864 / n;
    D.rect(48, y0, 864, 74, { r: 14, fill: K.NAVY });
    let vs = Z.value * 1.15; for (const it of ks) if (it.value) while (vs > 12 && textW(it.value, vs, 'num') > bw - 70) vs -= 1;
    ks.forEach((it, k) => {
      const x = 48 + k * bw;
      if (k) D.line(x, y0 + 16, 0, 42, '2E4F86', 0.75);
      if (it.icon) D.icon(it.icon, x + 18, y0 + 26, 22, K.LIGHT, it._b);
      const tx = x + (it.icon ? 52 : 18);
      D.text(tx, y0 + 12, bw - (tx - x) - 10, 54, itemPs(D, it, { vs, vc: K.W, fg: K.LIGHT, ts: Z.label * 1.05, bs: Z.label, bc: K.BODY_D }), { anchor: 'ctr', name: 'KPI' });
    });
    const y1 = y0 + 92;
    const rest = restPs(D, d);
    if (!rest.length && !d.rows.length) { const tw = (864 - 24) / 3; for (let k = 0; k < 3; k++) D.ph(d, k, 48 + k * (tw + 12), y1, tw, 492 - y1, { r: 12 }); return; }
    D.ph(d, 0, 48, y1, 400, 492 - y1, { r: 12 });
    let y = y1;
    if (rest.length) y += D.text(472, y, 440, 120, rest, { name: 'Intro' }) + 12;
    const rows = d.rows.slice(0, 5), m = rows.length;
    if (m) { const rh = (492 - y) / m; rows.forEach((it, k) => { const yy = y + k * rh; D.line(472, yy, 440, 0, K.RULE2, 0.75); let tx = 472; if (it.icon) { D.icon(it.icon, 472, yy + 12, 22, K.TEAL, it._b); tx = 506; } D.text(tx, yy + 10, 912 - tx, rh - 14, itemPs(D, it, { ts: Z.body * 1.05, bs: Z.body * 0.92, solo: K.TEXT }), { name: 'Row' }); }); }
  } });
  L.push({ id: 'c-panel', type: 'content', name: 'أرقام + لوحة جانبية', fit: d => (d.nK >= 2 && d.nK <= 6 && !d.other.length && d.rows.length <= 3) ? 5.5 : -1, render(D, s, d) {
    const Z = D.c.Z;
    panel(D, d, 640, 320, 0);
    D.text(668, 70, 260, 170, headPs(D, s, { tc: K.W, sc: K.BODY_D, ts: Z.title * 0.95 }), { name: 'Title' });
    const ks = d.kpis.slice(0, 6), n = ks.length, cols = n <= 3 ? n : (n === 4 ? 2 : 3), rows = Math.ceil(n / cols);
    const top = 60, g = 14, cw = (560 - g * (cols - 1)) / cols, ch = Math.min(130, (330 - top - g * (rows - 1)) / rows);
    let vs = Z.kpi * 0.95; for (const it of ks) if (it.value) while (vs > 14 && textW(it.value, vs, 'num') > cw - 36) vs -= 1;
    ks.forEach((it, k) => {
      const x = 48 + (k % cols) * (cw + g), y = top + Math.floor(k / cols) * (ch + g);
      D.rect(x, y, cw, ch, { r: 12, stroke: K.RULE, sw: 0.9, item: it._b });
      D.line(x + 18, y + ch - 14, 40, 0, K.TEAL, 2);
      D.text(x + 18, y + 16, cw - 36, ch - 36, itemPs(D, it, { vs, ts: Z.body, bs: Z.body * 0.9 }), { name: 'KPI' });
    });
    const yb = top + rows * (ch + g) + 6;
    const rest = [...restPs(D, d, { bs: Z.body * 0.98 }), ...d.rows.flatMap(it => itemPs(D, it, { ts: Z.body * 1.02, bs: Z.body * 0.92 }))];
    if (rest.length) D.text(48, yb, 560, 492 - yb, rest, { name: 'Body' });
    else { const tw = (560 - 24) / 3; for (let k = 0; k < 3; k++) D.ph(d, k + 1, 48 + k * (tw + 12), yb + 6, tw, 486 - yb, { r: 8 }); }
  } });
  L.push({ id: 'c-frames', type: 'content', name: 'صورة + إطارات', fit: d => (d.other.length || d.nK) ? -1 : ((d.nImg >= 4 || d.imgs.filter(x => x.item).length >= 4) ? 6 : (d.nI === 4 && d.avgLen < 120 ? 3.5 : -1)), render(D, s, d) {
    const Z = D.c.Z;
    D.ph(d, 0, 0, 0, 300, 540, { bleed: true });
    D.logo(TLOGO.x, TLOGO.y, TLOGO.w, K.W);
    const hb = head(D, s, 340, 44, 572);
    const its = d.items.length ? d.items.slice(0, 4) : [0, 1, 2, 3].map(() => null);
    const y0 = hb + 22, g = 22, cw = (572 - g) / 2, ch = (492 - y0 - g) / 2;
    its.forEach((it, k) => {
      const x = 340 + (k % 2) * (cw + g), y = y0 + Math.floor(k / 2) * (ch + g);
      const ph = it && it.img ? { id: it.img } : D.photo(d, k + 1);
      const capH = it ? 52 : 0;
      D.rect(x, y, cw, ch - capH, { r: 4, stroke: K.SKY, sw: 1 });
      D.img(ph.id, x + 8, y + 8, cw - 16, ch - capH - 16, { item: it ? it._b : null });
      if (it) D.text(x, y + ch - capH + 8, cw, capH - 8, itemPs(D, it, { ts: Z.body * 1.05, bs: Z.body * 0.9, text: !it.title || itemLen(it) < 60 }), { align: 'center', name: 'Caption' });
    });
  } });
  L.push({ id: 'c-imgkpi', type: 'content', name: 'صور + أرقام', fit: d => (d.nK >= 2 && d.nK <= 4 && !d.other.length && d.rows.length <= 2) ? 5 + (d.nImg >= 2 ? 1 : 0) : -1, render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 44, 864);
    const y0 = hb + 22;
    D.ph(d, 0, 48, y0, 480, 260, { r: 12 });
    const tw = (480 - 24) / 3;
    for (let k = 0; k < 3; k++) D.ph(d, k + 1, 48 + k * (tw + 12), y0 + 272, tw, 492 - y0 - 272, { r: 8 });
    const rest = [...restPs(D, d, { fg: K.W, bc: K.BODY_D, color: K.BODY_D }), ...d.rows.flatMap(it => itemPs(D, it, { fg: K.W, bc: K.BODY_D, solo: K.W }))];
    let y = y0;
    if (rest.length) { const h = Math.min(170, parasHeight(rest, 328) + 40); D.rect(552, y, 360, h, { r: 12, fill: K.NAVY }); D.text(568, y + 20, 328, h - 36, rest, { name: 'Box' }); y += h + 14; }
    const ks = d.kpis.slice(0, 4), cols = 2, rows = Math.ceil(ks.length / 2), g = 12, cw = (360 - g) / 2, ch = Math.min(110, (492 - y - g * (rows - 1)) / rows);
    ks.forEach((it, k) => chip(D, it, 552 + (k % 2) * (cw + g), y + Math.floor(k / 2) * (ch + g), cw, ch));
  } });
  L.push({ id: 'c-project', type: 'content', name: 'مشروع + خط زمني', fit: d => (d.timeline && d.nI >= 3 && d.nI <= 6 && !d.other.length) ? 5 + (d.nK || d.feature ? 1.5 : 0) - (d.avgLen > 90 ? 2 : 0) : -1, render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 44, 560);
    const y0 = hb + 20;
    D.ph(d, 0, 48, y0, 560, 400 - y0, { r: 12 });
    const its = d.items.slice(0, 6), n = its.length, cw = 560 / n, ly = 420;
    D.line(48, ly, 560, 0, K.RULE, 1);
    its.forEach((it, k) => {
      const x = 48 + k * cw;
      D.dot(x + cw / 2 - 5, ly - 5, 10, k === n - 1 ? K.TEAL : K.NAVY, { rw: 0 });
      D.text(x + 4, ly + 12, cw - 8, 72, itemPs(D, it, { ts: Z.body * 0.95, dc: K.BLUE, value: false, text: !it.title }), { align: 'center', name: 'Milestone' });
    });
    let y = 44;
    const top = [...(d.kpis.length ? [] : featurePs(D, d.feature, { fg: K.W, bc: K.BODY_D, ts: Z.cardTitle, vc: K.W })), ...paraPs(D, d, { color: K.BODY_D })];
    if (d.kpis.length) { d.kpis.slice(0, 2).forEach((it) => { chip(D, it, 636, y, 276, 92, { vs: Z.kpi * 0.8 }); y += 104; }); }
    if (top.length) { const h = Math.min(200, parasHeight(top, 244) + 40); D.rect(636, y, 276, h, { r: 12, fill: K.NAVY }); D.text(652, y + 20, 244, h - 36, top, { name: 'Box' }); y += h + 12; }
    const left = 492 - y;
    if (left > 90) { const k2 = left > 230 ? 2 : 1, hh = (left - 12 * (k2 - 1)) / k2; for (let k = 0; k < k2; k++) D.ph(d, k + 1, 636, y + k * (hh + 12), 276, hh, { r: 10 }); }
  } });
  L.push({ id: 'c-list', type: 'content', name: 'قائمة + لوحة جانبية', fit: d => (d.other.length || d.nK) ? -1 : (d.rows.length >= 3 && d.rows.length <= 8 ? 5 : -1), render(D, s, d) {
    const Z = D.c.Z;
    panel(D, d, 600, 360, 0);
    D.text(628, 60, 300, 180, headPs(D, s, { tc: K.W, sc: K.BODY_D, ts: Z.title * 0.95 }), { name: 'Title' });
    const rest = restPs(D, d);
    let y = 56;
    if (rest.length) y += D.text(48, y, 516, 110, rest, { name: 'Intro' }) + 14;
    const its = d.rows.slice(0, 8), n = its.length, rh = (492 - y) / n;
    its.forEach((it, k) => {
      const yy = y + k * rh;
      if (k) D.line(48, yy, 516, 0, K.RULE2, 0.75);
      if (it.icon) D.icon(it.icon, 48, yy + 10, 22, K.TEAL, it._b);
      else D.text(48, yy + 10, 36, 20, [P(pad2(k + 1), 12, { role: 'num', color: K.TEAL })], { fit: false, name: 'No.' });
      D.text(92, yy + 8, 472, rh - 12, itemPs(D, it, { ts: Z.body * 1.05, bs: Z.body * 0.92, solo: K.TEXT }), { name: 'Row' });
    });
  } });
  L.push({ id: 'c-qa', type: 'content', name: 'سؤال وجواب', fit: d => (d.qa && d.nI <= 3 && !d.other.length) ? 8 : -1, render(D, s, d) {
    const Z = D.c.Z;
    D.ph(d, 0, 0, 0, 320, 540, { bleed: true });
    D.fade(0, 0, 320, 540, K.NAVY, 'down', 25, 95);
    D.logo(TLOGO.x, TLOGO.y, TLOGO.w, K.W);
    D.text(34, 330, 256, 170, headPs(D, s, { tc: K.W, sc: K.BODY_D, ts: Z.title * 0.9 }), { anchor: 'b', name: 'Title' });
    qaRows(D, d, 356, 56, 556, 492, { nc: K.TEAL });
  } });
  L.push({ id: 'c-qa2', type: 'content', name: 'سؤال وجواب (عمودين)', fit: d => (d.qa && d.nI <= 2 && !d.other.length) ? 7.6 : -1, render(D, s, d) {
    const Z = D.c.Z;
    const hb = head(D, s, 48, 44, 864, {});
    const its = d.items.slice(0, 2), n = its.length, y0 = hb + 30, rh = (490 - y0 - 24 * (n - 1)) / n;
    its.forEach((it, k) => {
      const y = y0 + k * (rh + 24);
      if (k) D.line(48, y - 12, 864, 0, K.RULE, 0.75);
      D.text(48, y, 70, 44, [P(it.number ? pad2(it.number) : pad2(k + 1), 30, { role: 'num', color: K.TEAL })], { fit: false, name: 'No.' });
      D.text(128, y, 300, rh, itemPs(D, it, { text: false, ts: Z.cardTitle * 1.1, fg: K.BLUE }), { name: 'Question', max: 1.3 });
      D.line(452, y + 4, 0, rh - 8, K.RULE, 0.75);
      D.text(476, y, 436, rh, itemPs(D, it, { title: false, bs: Z.body }), { name: 'Answer', max: 1.25 });
    });
  } });
  L.push({ id: 'c-generic', type: 'content', name: 'مرن', fit: d => d.other.length ? (d.oChart || !d.tables.length ? 9 : 6) : 1, render(D, s, d) {
    if (d.nImg) { D.ph(d, 0, 620, 0, 340, 540, { bleed: true }); }
    const w = d.nImg ? 540 : 864;
    const hb = head(D, s, 48, 44, w);
    genericBody(D, s, d, 48, w, hb + 24, 492);
  } });
  return { id: 'creative', name: 'إبداعي', en: 'Creative', desc: 'غني بالصور والأرقام ولوحات كحلية. للزيارات والفعاليات وعرض المشاريع والإنجازات.', layouts: L, preview: ['c-cover', 'c-kpiband', 'c-axes', 'c-panel'], kit: { pfx: 'c', head, Y: 44, acc: K.TEAL, num: K.BLUE } };
})();

/* =====================================================================
   EXTRA IDEAS — shared by all three themes (each in its own colours and title style)
   photo distributions · big numbers · matrix · icon rows · charts · tables · new dividers
   ===================================================================== */
function extraLayouts(T) {
  const kit = T.kit, X = kit.pfx, L = [];
  const Y = kit.Y, ACC = kit.acc;
  const id = n => X + '-' + n;
  // page background / chrome for ordinary (light) pages
  const page = (D, o = {}) => {
    if (X === 'f') kit.chrome(D, o);
    else if (o.panel) o.panel();
  };
  const hd = (D, s, x, y, w, o = {}) => kit.head(D, s, x, y, w, o);
  const wlogo = D => X === 'f' ? D.logo(48, 26, 62, K.W) : D.logo(TLOGO.x, TLOGO.y, TLOGO.w, K.W);
  const titleW = (D, s, x, y, w, h, o = {}) => D.text(x, y, w, h, headPs(D, s, { tc: K.W, sc: o.sc || 'D5E0EE', ec: K.LIGHT, ts: D.c.Z.title * (o.k || 1.05) }), { anchor: o.anchor || 't', name: 'Title' });
  const restRows = d => d.rows;
  const white = { fg: K.W, bc: 'E3ECF7', solo: K.W, vc: K.LIGHT, lc: K.LIGHT, dc: K.LIGHT, bul: K.LIGHT, mc: 'B9C9DD' };
  const noOther = d => !d.other.length;
  const short = (d, n) => d.avgLen <= n;

  /* ---------------- photos ---------------- */
  L.push({ id: id('hero'), type: 'content', name: 'صورة كاملة + رسالة', fit: d => (!noOther(d) || d.nK || d.nI > 3 || d.nB > 4) ? -1 : ((d.feature || d.pLen) && d.pLen <= 650 && short(d, 200) ? 4 + (d.nImg ? 2 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    D.ph(d, 0, 0, 0, 960, 540, { bleed: true });
    D.fade(0, 0, 960, 540, K.DEEP, 'toEnd', 96, 12);
    wlogo(D);
    D.line(48, Y - 12, 34, 0, K.LIGHT, 1.5);
    const th = titleW(D, s, 48, Y, 500, Z.title * 3.4);
    const ps = [...featurePs(D, d.feature, { fg: K.W, bc: 'E3ECF7', vc: K.LIGHT }), ...paraPs(D, d, { color: 'E3ECF7', lh: 1.45, bs: Z.body * 1.12 }), ...d.rows.flatMap(it => itemPs(D, it, white))];
    D.text(48, Y + th + 28, 500, 492 - Y - th - 28, ps, { name: 'Body' });
  } });
  L.push({ id: id('band'), type: 'content', name: 'عنوان على صورة + أعمدة', fit: d => (!noOther(d) || d.nK || d.feature || d.pLen > 240) ? -1 : (d.rows.length >= 2 && d.rows.length <= 4 && short(d, 240) ? 4.6 + (d.nImg ? 1.5 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    if (X === 'f') D.rect(0, 0, 960, 540, { fill: bgColor(D) });
    D.ph(d, 0, 0, 0, 960, 212, { bleed: true });
    D.fade(0, 0, 960, 212, K.DEEP, 'toEnd', 92, 20);
    wlogo(D);
    titleW(D, s, 48, 60, 620, 132, { anchor: 'b', k: 1 });
    let y = 240;
    if (d.pLen) y += D.text(48, y, 864, 60, paraPs(D, d, { lh: 1.4 }), { name: 'Intro' }) + 16;
    const its = d.rows, n = its.length, g = 30, cw = (864 - g * (n - 1)) / n;
    its.forEach((it, k) => {
      const x = 48 + k * (cw + g);
      D.line(x, y, cw, 0, ACC, 1.5);
      let yy = y + 16;
      if (it.icon) { D.icon(it.icon, x, yy, 28, kit.num, it._b); yy += 40; }
      else { D.text(x, yy, 60, 22, [P(pad2(k + 1), 15, { role: 'num', color: kit.num })], { fit: false, name: 'No.' }); yy += 30; }
      D.text(x, yy, cw, 494 - yy, itemPs(D, it, {}), { name: 'Column', max: 1.5 });
    });
  } });
  L.push({ id: id('trip'), type: 'content', name: 'صور طولية + نقاط', fit: (d, s) => (!noOther(d) || d.nK || d.feature || d.pLen || d.nB || tlen(s && s.subtitle) > 70) ? -1 : (d.nI >= 3 && d.nI <= 4 && short(d, d.items.some(it => it.title_en || it.text_en) ? 110 : 170) ? 4.4 + (d.imgs.filter(x => x.item).length >= 3 ? 2.5 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    const its = d.items, n = its.length, cw = 960 / n;
    its.forEach((it, k) => {
      const x = k * cw;
      const ph = it.img ? { id: it.img } : D.photo(d, k);
      D.img(ph.id, x, 0, cw - (k < n - 1 ? 2 : 0), 540, { item: it._b, bleed: true });
    });
    D.fade(0, 0, 960, 260, K.DEEP, 'down', 92, 0);
    D.fade(0, 230, 960, 310, K.DEEP, 'down', 0, 96);
    wlogo(D);
    titleW(D, s, 48, Y + 6, 640, 150);
    its.forEach((it, k) => {
      const x = k * cw + 26, w = cw - 52;
      D.line(x, 352, 30, 0, K.LIGHT, 1.5);
      if (it.icon) D.icon(it.icon, x + w - 24, 330, 24, K.W, it._b);
      D.text(x, 366, w, 140, itemPs(D, it, Object.assign({}, white, { ts: Z.cardTitle * 1.05 })), { name: 'Column', max: 1.3 });
    });
  } });
  L.push({ id: id('overlay'), type: 'content', name: 'صورة خلفية + نقاط', fit: d => (!noOther(d) || d.nK || d.feature) ? -1 : (d.rows.length >= 2 && d.rows.length <= 6 && short(d, 200) && d.pLen <= 260 ? 2.4 : -1), render(D, s, d) {
    const Z = D.c.Z;
    D.ph(d, 0, 0, 0, 960, 540, { bleed: true });
    D.fade(0, 0, 960, 540, K.DEEP, 'down', 74, 88);
    wlogo(D);
    const th = titleW(D, s, 48, Y, 700, Z.title * 3.2);
    let y = Y + th + 30;
    if (d.pLen) y += D.text(48, y, 700, 70, paraPs(D, d, { color: 'E3ECF7', lh: 1.4 }), { name: 'Intro' }) + 18;
    const its = d.rows, n = its.length, cols = n <= 3 ? n : n === 4 ? 2 : 3, rows = Math.ceil(n / cols);
    const g = 32, cw = (864 - g * (cols - 1)) / cols, rh = (494 - y) / rows;
    its.forEach((it, k) => {
      const x = 48 + (k % cols) * (cw + g), yy = y + Math.floor(k / cols) * rh;
      D.line(x, yy, cw, 0, '5D7BAA', 0.75);
      let ty = yy + 14;
      if (it.icon) { D.icon(it.icon, x, ty, 24, K.LIGHT, it._b); ty += 34; }
      D.text(x, ty, cw, yy + rh - ty - 8, itemPs(D, it, white), { name: 'Column', max: 1.5 });
    });
  } });
  L.push({ id: id('split'), type: 'content', name: 'نصف صورة', fit: d => (!noOther(d) || d.nK || d.feature) ? -1 : (d.rows.length >= 2 && d.rows.length <= 5 && short(d, 200) && d.pLen <= 360 ? 4 + (d.nImg ? 1.5 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    page(D, { footW: 440, panel: () => D.ph(d, 0, 480, 0, 480, 540, { bleed: true }) });
    const hb = hd(D, s, 48, Y, 400);
    let y = hb + 22;
    if (d.pLen) y += D.text(48, y, 400, 110, paraPs(D, d, { lh: 1.4 }), { name: 'Intro' }) + 14;
    const its = d.rows, n = its.length, rh = (492 - y) / n;
    its.forEach((it, k) => {
      const yy = y + k * rh;
      if (k) D.line(48, yy, 400, 0, K.RULE2, 0.75);
      let tx = 48;
      if (it.icon) { D.icon(it.icon, 48, yy + 12, 24, kit.num, it._b); tx = 86; }
      D.text(tx, yy + 10, 448 - tx, rh - 14, itemPs(D, it, {}), { name: 'Row' });
    });
  } });
  L.push({ id: id('stack'), type: 'content', name: 'صورتان + نص', fit: d => (!noOther(d) || d.nK) ? -1 : ((d.feature || d.pLen) && d.rows.length <= 3 && d.pLen <= 760 && short(d, 220) ? 4 + (d.nImg >= 2 ? 2 : 0) : -1), render(D, s, d) {
    const Z = D.c.Z;
    const ph = () => { D.ph(d, 0, 600, 0, 360, 269, { bleed: true }); D.ph(d, 1, 600, 271, 360, 269, { bleed: true }); };
    page(D, { footW: 560, panel: ph });
    const hb = hd(D, s, 48, Y, 510);
    const ps = [...featurePs(D, d.feature, {}), ...paraPs(D, d, { bs: Z.body * 1.12, lh: 1.45 }), ...d.rows.flatMap(it => itemPs(D, it, {}))];
    D.text(48, hb + 26, 510, 492 - hb - 26, ps, { name: 'Body' });
  } });

  /* ---------------- type & structure ---------------- */
  L.push({ id: id('bignum'), type: 'content', name: 'رقم بطل', fit: d => (!noOther(d) || d.nK !== 1 || d.nI > 4) ? -1 : 7, render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    const k = d.kpis[0], y0 = hb + 40;
    let vs = 120; while (vs > 30 && parasHeight([P(k.value || '', vs, { role: 'num', lh: 1 })], 420) > vs * 1.12) vs -= 4;
    D.text(48, y0, 420, vs * 1.15, [P(k.value || '', vs, { role: 'num', color: kit.num, lh: 1, ref: k._r.value })], { fit: false, name: 'Value' });
    D.line(48, y0 + vs * 1.2 + 6, 60, 0, ACC, 2);
    D.text(48, y0 + vs * 1.2 + 22, 400, 492 - (y0 + vs * 1.2 + 22), itemPs(D, k, { value: false, ts: Z.cardTitle * 1.2 }), { name: 'Label' });
    const rest = [...featurePs(D, d.feature), ...paraPs(D, d, { lh: 1.45 })];
    const rows = d.rows;
    if (rest.length || rows.length) {
      D.line(500, y0, 0, 492 - y0, K.RULE, 0.75);
      let y = y0;
      if (rest.length) y += D.text(530, y, 382, rows.length ? 160 : 492 - y, rest, { name: 'Body' }) + 16;
      if (rows.length) { const rh = (492 - y) / rows.length; rows.forEach((it, i) => { const yy = y + i * rh; if (i || rest.length) D.line(530, yy, 382, 0, K.RULE2, 0.75); let tx = 530; if (it.icon) { D.icon(it.icon, 530, yy + 12, 22, kit.num, it._b); tx = 564; } D.text(tx, yy + 10, 912 - tx, rh - 14, itemPs(D, it, {}), { name: 'Row' }); }); }
    }
  } });
  L.push({ id: id('quote'), type: 'content', name: 'رسالة كبيرة', fit: d => (!noOther(d) || d.nK || d.rows.length || d.nImg) ? -1 : ((d.feature && !d.pLen && tlen(d.feature.title) + tlen(d.feature.text) <= 300) || (!d.feature && d.paras.length === 1 && d.pLen <= 280) ? 6 : -1), render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864, { k: 0.8 });
    const f = d.feature;
    const ps = f ? featurePs(D, f, { ts: Z.featureTitle * 1.35, bs: Z.body * 1.25, fg: K.NAVY }) : [P(d.paras[0].t, Z.featureTitle * 1.3, { bold: true, color: K.NAVY, lh: 1.3, ref: d.paras[0].ref, line: d.paras[0].line })];
    D.line(48, hb + 54, 70, 0, ACC, 2.5);
    D.text(48, hb + 74, 780, 470 - hb - 74, ps, { anchor: 'ctr', name: 'Statement', max: 1.5 });
  } });
  L.push({ id: id('matrix'), type: 'content', name: 'مصفوفة 2×2', fit: d => (!noOther(d) || d.nK || d.nI !== 4 || d.feature) ? -1 : (short(d, 260) && d.pLen <= 200 ? 5.5 : -1), render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    let y0 = hb + 26;
    if (d.pLen) y0 += D.text(48, y0, 864, 50, paraPs(D, d), { name: 'Intro' }) + 10;
    const mx = 480, my = y0 + (492 - y0) / 2;
    D.line(mx, y0, 0, 492 - y0, K.RULE, 0.75); D.line(48, my, 864, 0, K.RULE, 0.75);
    d.items.forEach((it, k) => {
      const c = k % 2, r = Math.floor(k / 2);
      const x = c ? mx + 30 : 48, y = r ? my + 22 : y0 + 4, w = 402, h = (r ? 492 : my) - y - 16;
      let tx = x;
      if (it.icon) { D.icon(it.icon, x, y + 2, 30, kit.num, it._b); tx = x + 46; }
      else { D.text(x, y, 44, 30, [P(pad2(k + 1), 22, { role: 'num', color: ACC === K.LIGHT ? K.BLUE : ACC })], { fit: false, name: 'No.' }); tx = x + 50; }
      D.text(tx, y, x + w - tx, h, itemPs(D, it, { ts: Z.cardTitle * 1.08 }), { name: 'Quadrant', max: 1.5 });
    });
  } });
  L.push({ id: id('icons'), type: 'content', name: 'صف أيقونات', fit: d => (!noOther(d) || d.nK || d.nI < 3 || d.nI > 6 || d.items.some(it => !it.icon)) ? -1 : (short(d, 180) && d.pLen <= 220 && !d.feature ? 6.2 : -1), render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    let y0 = hb + 30;
    if (d.pLen) y0 += D.text(48, y0, 864, 56, paraPs(D, d), { name: 'Intro' }) + 14;
    const its = d.items, n = its.length, cols = n <= 4 ? n : 3, rows = Math.ceil(n / cols);
    const cw = 864 / cols, rh = (492 - y0) / rows;
    its.forEach((it, k) => {
      const c = k % cols, r = Math.floor(k / cols), x = 48 + c * cw, y = y0 + r * rh;
      if (c) D.line(x, y + 6, 0, rh - 18, K.RULE2, 0.75);
      if (r) D.line(x + (c ? 18 : 0), y - 4, cw - 36, 0, K.RULE2, 0.75);
      const px = x + (c ? 22 : 0), pw = cw - (c ? 22 : 0) - 22;
      D.icon(it.icon, px, y + 14, rows > 1 ? 30 : 40, kit.num, it._b);
      D.text(px, y + (rows > 1 ? 56 : 70), pw, rh - (rows > 1 ? 64 : 80), itemPs(D, it, { ts: Z.cardTitle * 1.05 }), { name: 'Column', max: 1.5 });
    });
  } });
  L.push({ id: id('numbers'), type: 'content', name: 'أرقام كبيرة', fit: d => (!noOther(d) || d.nK < 2 || d.nK > 6 || d.nI > 3 || d.pLen > 320) ? -1 : 5.4 - (d.rows.length ? 0.6 : 0), render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    const ks = d.kpis, n = ks.length, cols = n <= 4 ? n : 3, rows = Math.ceil(n / cols);
    const rest = [...featurePs(D, d.feature), ...paraPs(D, d, { lh: 1.4 }), ...d.rows.flatMap(it => itemPs(D, it, {}))];
    const bot = rest.length ? 380 : 492;
    const g = 34, cw = (864 - g * (cols - 1)) / cols;
    let vs = Z.kpi * 1.35; for (const it of ks) while (vs > 16 && parasHeight([P(it.value || '', vs, { role: 'num', lh: 1 })], cw) > vs * 1.12) vs -= 1;
    const room = (bot - hb - 34) / rows, rh = Math.min(room, vs * 1.2 + 110);
    const y0 = hb + 34 + (bot - hb - 34 - rh * rows) / 2;
    ks.forEach((it, k) => {
      const x = 48 + (k % cols) * (cw + g), y = y0 + Math.floor(k / cols) * rh;
      D.line(x, y, cw, 0, K.RULE, 0.75); D.line(x, y, 34, 0, ACC, 2);
      D.text(x, y + 14, cw, vs * 1.2, [P(it.value || '', vs, { role: 'num', color: kit.num, lh: 1, ref: it._r.value })], { fit: false, name: 'Value' });
      D.text(x, y + 22 + vs * 1.15, cw, rh - 30 - vs * 1.15, itemPs(D, it, { value: false }), { name: 'KPI label', max: 1.25 });
    });
    if (rest.length) { D.line(48, 396, 864, 0, K.RULE2, 0.75); D.text(48, 410, 864, 82, rest, { name: 'Body' }); }
  } });

  L.push({ id: id('ba'), type: 'content', name: 'قبل وبعد', fit: d => (!noOther(d) || !d.ba || d.nK || d.nI > 1 || d.nB > 4 || d.pLen > 520) ? -1 : 7.2, render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    const y0 = hb + 40;
    let vs = 92; const fitV = t => parasHeight([P(t, vs, { role: 'num', lh: 1 })], 330) > vs * 1.12;
    while (vs > 30 && (fitV(d.ba.a) || fitV(d.ba.b))) vs -= 4;
    // the old figure (muted) -> the new one (brand blue)
    D.text(48, y0, 340, vs * 1.2, [P(d.ba.a, vs * 0.82, { role: 'num', color: 'A9B4C4', lh: 1 })], { fit: false, name: 'Value' });
    const ay = y0 + vs * 0.5;
    D.line(400, ay, 120, 0, ACC === K.LIGHT ? K.BLUE : ACC, 2);
    D.poly([[520, ay - 8], [534, ay], [520, ay + 8]], ACC === K.LIGHT ? K.BLUE : ACC);
    D.text(560, y0 - vs * 0.08, 352, vs * 1.25, [P(d.ba.b, vs, { role: 'num', color: kit.num, lh: 1 })], { fit: false, name: 'Value' });
    const by = y0 + vs * 1.3 + 24;
    D.line(48, by, 864, 0, K.RULE, 0.75);
    const ps = [...featurePs(D, d.feature, { ts: Z.cardTitle * 1.2 }), ...paraPs(D, d, { bs: Z.body * 1.15, lh: 1.45 }), ...d.rows.flatMap(it => itemPs(D, it, {}))];
    D.text(48, by + 20, 864, 492 - by - 20, ps, { name: 'Body', max: 1.35 });
  } });

  /* ---------------- more ideas ---------------- */
  // ascending steps: each stage sits a little higher than the one before
  L.push({ id: id('steps'), type: 'content', name: 'درجات صاعدة', fit: d => (!noOther(d) || d.nK || d.nI < 3 || d.nI > 5 || d.feature) ? -1 : (short(d, 190) && d.pLen <= 200 ? (d.timeline ? 6 : 4.4) : -1), render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    let top = hb + 30;
    if (d.pLen) top += D.text(48, top, 864, 50, paraPs(D, d), { name: 'Intro' }) + 10;
    const its = d.items, n = its.length, cw = 864 / n, bot = 488, rise = Math.min(46, (bot - top - 200) / (n - 1 || 1));
    its.forEach((it, k) => {
      const x = 48 + k * cw, y = top + (n - 1 - k) * rise;
      D.line(x, y, cw - 14, 0, k === n - 1 ? (ACC === K.LIGHT ? K.BLUE : ACC) : K.RULE, k === n - 1 ? 2 : 1);
      if (k) D.line(x, y, 0, rise, K.RULE, 1);
      const v = it.value || it.date || pad2(k + 1);
      D.text(x, y + 12, cw - 24, 36, [P(v, Z.value * 0.95, { role: 'num', color: k === n - 1 ? kit.num : K.SKY, lh: 1, ref: it.value ? it._r.value : it.date ? it._r.date : null })], { fit: false, name: 'Value' });
      let ty = y + 58;
      if (it.icon) { D.icon(it.icon, x, ty, 24, kit.num, it._b); ty += 34; }
      D.text(x, ty, cw - 24, bot - ty, itemPs(D, it, { value: false, date: false }), { name: 'Step', max: 1.35 });
    });
  } });
  // big numbered list (two columns when long)
  L.push({ id: id('numbered'), type: 'content', name: 'قائمة مرقمة كبيرة', fit: d => (!noOther(d) || d.nK || d.feature || d.rows.length < 3 || d.rows.length > 8) ? -1 : (short(d, 200) && d.pLen <= 240 ? 4.6 : -1), render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    let y0 = hb + 26;
    if (d.pLen) y0 += D.text(48, y0, 864, 56, paraPs(D, d, { lh: 1.4 }), { name: 'Intro' }) + 12;
    const its = d.rows, n = its.length, cols = n > 4 ? 2 : 1, per = Math.ceil(n / cols), cw = cols === 2 ? 414 : 864, rh = (492 - y0) / per;
    its.forEach((it, k) => {
      const c = Math.floor(k / per), r = k % per, x = 48 + c * 450, y = y0 + r * rh;
      if (r) D.line(x, y, cw, 0, K.RULE2, 0.75);
      D.text(x, y + 8, 64, Math.min(54, rh - 10), [P(pad2(k + 1), Math.min(34, rh * 0.55), { role: 'num', color: K.SKY, lh: 1 })], { fit: false, name: 'No.' });
      D.text(x + 72, y + 10, cw - 72, rh - 14, itemPs(D, it, {}), { name: 'Row' });
    });
  } });
  // one point stands out, the rest support it
  L.push({ id: id('lead'), type: 'content', name: 'نقطة رئيسية + نقاط', fit: d => (!noOther(d) || d.nK || d.feature || d.nI < 3 || d.nI > 5 || d.pLen) ? -1 : (short(d, 200) ? 4.3 : -1), render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    const y0 = hb + 30, [first, ...rest] = d.items;
    D.line(48, y0, 4, 492 - y0, ACC === K.LIGHT ? K.BLUE : ACC, 4);
    let ty = y0 + 4;
    if (first.icon) { D.icon(first.icon, 72, ty, 34, kit.num, first._b); ty += 48; }
    D.text(72, ty, 360, 492 - ty, itemPs(D, first, { ts: Z.featureTitle, bs: Z.body * 1.15, vs: Z.kpi }), { name: 'Lead', max: 1.4 });
    const rh = (492 - y0) / rest.length;
    rest.forEach((it, k) => {
      const y = y0 + k * rh;
      if (k) D.line(480, y, 432, 0, K.RULE2, 0.75);
      let tx = 480;
      if (it.icon) { D.icon(it.icon, 480, y + 12, 24, kit.num, it._b); tx = 516; }
      D.text(tx, y + 10, 912 - tx, rh - 14, itemPs(D, it, {}), { name: 'Row' });
    });
  } });
  // horizontal timeline with big dates
  L.push({ id: id('htime'), type: 'content', name: 'خط زمني بتواريخ كبيرة', fit: d => (!noOther(d) || d.nK || !d.timeline || d.nI < 3 || d.nI > 6) ? -1 : (short(d, 170) ? 6.3 : -1), render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    let y0 = hb + 30;
    if (d.pLen || d.feature) y0 += D.text(48, y0, 864, 56, restPs(D, d), { name: 'Intro' }) + 10;
    const its = d.items, n = its.length, cw = 864 / n, ly = y0 + 66;
    D.line(48, ly, 864, 0, K.RULE, 1);
    let ds = Z.kpi * 0.8; for (const it of its) while (ds > 14 && parasHeight([P(it.date || it.value || '', ds, { role: 'num', lh: 1 })], cw - 16) > ds * 1.12) ds -= 1;
    its.forEach((it, k) => {
      const x = 48 + k * cw;
      const v = it.date || it.value || pad2(k + 1);
      D.text(x, ly - ds * 1.2 - 8, cw - 16, ds * 1.2, [P(v, ds, { role: 'num', color: k === n - 1 ? kit.num : K.SKY, lh: 1, ref: it.date ? it._r.date : it.value ? it._r.value : null })], { fit: false, name: 'Value' });
      D.dot(x, ly - 5, 10, k === n - 1 ? K.BLUE : K.W, { ring: K.BLUE, rw: 2 });
      let ty = ly + 22;
      if (it.icon) { D.icon(it.icon, x, ty, 24, kit.num, it._b); ty += 34; }
      D.text(x, ty, cw - 18, 490 - ty, itemPs(D, it, { value: false, date: false }), { name: 'Step', max: 1.35 });
    });
  } });
  // numbers over a full photo
  L.push({ id: id('kpiphoto'), type: 'content', name: 'أرقام على صورة', fit: d => (!noOther(d) || d.nK < 2 || d.nK > 4 || d.nI || d.nB || d.pLen > 200 || d.feature) ? -1 : 4.8 + (d.nImg ? 1.5 : 0), render(D, s, d) {
    const Z = D.c.Z;
    D.ph(d, 0, 0, 0, 960, 540, { bleed: true });
    D.fade(0, 0, 960, 540, K.DEEP, 'down', 45, 92);
    wlogo(D);
    const th = titleW(D, s, 48, Y, 620, Z.title * 3.2);
    if (d.pLen) D.text(48, Y + th + 14, 620, 60, paraPs(D, d, { color: 'E3ECF7' }), { name: 'Intro' });
    const ks = d.kpis, n = ks.length, cw = 864 / n;
    let vs = Z.kpi * 1.3; for (const it of ks) while (vs > 18 && parasHeight([P(it.value || '', vs, { role: 'num', lh: 1 })], cw - 20) > vs * 1.12) vs -= 1;
    ks.forEach((it, k) => {
      const x = 48 + k * cw;
      if (k) D.line(x - 12, 352, 0, 130, '5D7BAA', 0.75);
      D.text(x, 352, cw - 20, vs * 1.2, [P(it.value || '', vs, { role: 'num', color: K.W, lh: 1, ref: it._r.value })], { fit: false, name: 'Value' });
      D.text(x, 360 + vs * 1.15, cw - 20, 490 - 360 - vs * 1.15, itemPs(D, it, Object.assign({ value: false }, white)), { name: 'KPI label', max: 1.3 });
    });
  } });
  // a statement on top, the points underneath in columns
  L.push({ id: id('headcols'), type: 'content', name: 'رسالة + أعمدة', fit: d => (!noOther(d) || d.nK || !d.feature || d.nI < 2 || d.nI > 4 || d.pLen > 200) ? -1 : (short(d, 200) ? 5.6 : -1), render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864, { k: 0.8 });
    const fy = hb + 22;
    const fh = D.text(48, fy, 820, 130, [...featurePs(D, d.feature, { ts: Z.featureTitle * 1.1 }), ...paraPs(D, d)], { name: 'Statement', max: 1.3 });
    const y0 = Math.max(fy + fh + 26, 270), its = d.items, n = its.length, g = 30, cw = (864 - g * (n - 1)) / n;
    its.forEach((it, k) => {
      const x = 48 + k * (cw + g);
      D.line(x, y0, cw, 0, K.RULE, 0.75); D.line(x, y0, 30, 0, ACC === K.LIGHT ? K.BLUE : ACC, 2);
      let ty = y0 + 16;
      if (it.icon) { D.icon(it.icon, x, ty, 26, kit.num, it._b); ty += 38; }
      D.text(x, ty, cw, 492 - ty, itemPs(D, it, {}), { name: 'Column', max: 1.4 });
    });
  } });

  /* ---------------- charts (real PowerPoint charts, editable) ---------------- */
  const chartOf = d => (d.tchart && d.tables.length === 1 && d.other.length === 1) ? d.tchart : (noOther(d) ? d.kchart : null);
  const alt = sp => Object.assign({}, sp, { type: sp.type === 'donut' ? 'bar' : sp.type === 'line' ? 'bar' : sp.type === 'barh' ? 'bar' : (sp.cats.some(c => c.length > 10) || sp.cats.length > 5 ? 'barh' : (sp.cats.length >= 3 ? 'line' : 'barh')) });
  const chartPrim = (D, sp, x, y, w, h) => D.push({ k: 'nchart', spec: sp, x: D.mx(x, w), y, w, h, refs: sp.refs, bi: D.c.bi, rtl: D.rtl, catSize: Math.max(13, D.c.Z.body * 1.05), lblSize: Math.max(14, D.c.Z.body * 1.12) });
  const chartFit = (d, extra) => { const c = chartOf(d); if (!c) return -1; if (c.from === 'table' && !c.pure) return -1; if (d.nI > 4 || d.pLen > 420) return -1; return (c.from === 'table' ? 9.6 : 6.8) + extra; };
  const chartRender = (variant) => function (D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    let sp = chartOf(d); if (variant) sp = alt(sp);
    const rest = [...featurePs(D, d.feature), ...paraPs(D, d, { lh: 1.45 })];
    const rows = d.rows, note = d.note ? [P(d.note.t, Z.note, { color: K.MUTED, ref: d.note.ref })] : [];
    const y0 = hb + 28;
    if (rest.length || rows.length) {
      chartPrim(D, sp, 48, y0, 540, 480 - y0);
      D.line(616, y0, 0, 480 - y0, K.RULE, 0.75);
      let y = y0;
      if (rest.length) y += D.text(640, y, 272, rows.length ? 170 : 480 - y, rest, { name: 'Body' }) + 14;
      if (rows.length) { const rh = (480 - y) / rows.length; rows.forEach((it, i) => { const yy = y + i * rh; if (i || rest.length) D.line(640, yy, 272, 0, K.RULE2, 0.75); D.text(640, yy + 10, 272, rh - 14, itemPs(D, it, {}), { name: 'Row' }); }); }
    } else chartPrim(D, sp, 48 + (sp.type === 'donut' ? 120 : 0), y0, 864 - (sp.type === 'donut' ? 240 : 0), (note.length ? 462 : 486) - y0);
    if (note.length) D.text(48, 470, 864, 20, note, { name: 'Note' });
  };
  L.push({ id: id('chart'), type: 'content', name: 'شارت', fit: d => chartFit(d, 0), render: chartRender(false) });
  L.push({ id: id('chart2'), type: 'content', name: 'شارت (شكل ثاني)', fit: d => chartFit(d, -1.2), render: chartRender(true) });

  /* ---------------- tables ---------------- */
  function tableBlock(D, sec, si, x, y, w, maxH, o = {}) {
    const Z = D.c.Z;
    const rows = (sec.rows || []).map(r => r.map(c => String(c == null ? '' : c)));
    const ncol = Math.max(1, ...rows.map(r => r.length));
    const lens = Array.from({ length: ncol }, (_, c) => Math.max(5, ...rows.map(rw => Math.min(48, String(rw[c] || '').length))));
    const tot = lens.reduce((a, b) => a + b, 0);
    const cws = lens.map(l => w * l / tot);
    let size = Math.min(o.max || Z.body * 1.2, rows.length <= 5 ? 20 : 18), rh, need;
    for (; size >= 9; size -= 0.5) {
      rh = rows.map((rw, ri) => Math.max(...cws.map((cw, c) => lineCount(String(rw[c] || ''), size, 'body', ri === 0 || (o.firstBold && c === 0), cw - 14) * size * 1.22)) + 16);
      need = rh.reduce((a, b) => a + b, 0);
      if (need <= maxH) break;
    }
    if (need < maxH * 0.8) { const g = Math.min(1.75, maxH * 0.86 / need); rh = rh.map(v => v * g); need *= g; }
    D.push({ k: 'table', x: D.mx(x, w), y, w, h: need, rows, cws, rh, size, header: sec.header !== false, firstBold: !!o.firstBold, ref: ['sections', si, 'rows'] });
    return need;
  }
  const oneTable = d => d.tables.length === 1 && d.other.length === 1 && !d.nK && !d.rows.length;
  L.push({ id: id('table'), type: 'content', name: 'جدول كامل', fit: d => oneTable(d) && d.pLen <= 360 && !d.nImg ? 9.4 : -1, render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    let y = hb + 26;
    const rest = [...featurePs(D, d.feature), ...paraPs(D, d, { lh: 1.4 })];
    if (rest.length) y += D.text(48, y, 864, 70, rest, { name: 'Intro' }) + 14;
    const note = d.note ? [P(d.note.t, Z.note, { color: K.MUTED, ref: d.note.ref })] : [];
    const t = d.tables[0];
    const h = tableBlock(D, t.sec, t.i, 48, y, 864, (note.length ? 462 : 492) - y, { firstBold: true });
    if (note.length) D.text(48, Math.min(470, y + h + 10), 864, 20, note, { name: 'Note' });
  } });
  L.push({ id: id('tablephoto'), type: 'content', name: 'جدول + صورة', fit: d => oneTable(d) && d.pLen <= 200 && Math.max(...(d.tables[0].sec.rows || [[]]).map(r => r.length)) <= 4 && (d.tables[0].sec.rows || []).length <= 8 ? 6 + (d.nImg ? 1.5 : 0) : -1, render(D, s, d) {
    const Z = D.c.Z;
    page(D, { footW: 590, panel: () => D.ph(d, 0, 640, 0, 320, 540, { bleed: true }) });
    const hb = hd(D, s, 48, Y, 560);
    let y = hb + 26;
    const rest = [...featurePs(D, d.feature), ...paraPs(D, d, { lh: 1.4 })];
    if (rest.length) y += D.text(48, y, 560, 70, rest, { name: 'Intro' }) + 14;
    const note = d.note ? [P(d.note.t, Z.note, { color: K.MUTED, ref: d.note.ref })] : [];
    const t = d.tables[0];
    const h = tableBlock(D, t.sec, t.i, 48, y, 560, (note.length ? 462 : 492) - y, { firstBold: true });
    if (note.length) D.text(48, Math.min(470, y + h + 10), 560, 20, note, { name: 'Note' });
  } });
  L.push({ id: id('tabchart'), type: 'content', name: 'جدول + شارت', fit: d => (d.tchart && oneTable(d) && d.pLen <= 200 && Math.max(...(d.tables[0].sec.rows || [[]]).map(r => r.length)) <= 5 && (d.tables[0].sec.rows || []).length <= 9) ? 9.8 : -1, render(D, s, d) {
    const Z = D.c.Z;
    page(D);
    const hb = hd(D, s, 48, Y, 864);
    let y = hb + 26;
    const rest = [...featurePs(D, d.feature), ...paraPs(D, d, { lh: 1.4 })];
    if (rest.length) y += D.text(48, y, 864, 56, rest, { name: 'Intro' }) + 12;
    const t = d.tables[0];
    tableBlock(D, t.sec, t.i, 48, y, 400, 486 - y, { firstBold: true, max: Z.body });
    D.line(472, y, 0, 486 - y, K.RULE, 0.75);
    const sp = Object.assign({}, d.tchart, { refs: [] });
    chartPrim(D, sp.type === 'donut' ? sp : (sp.type === 'barh' || sp.cats.length > 6 ? Object.assign(sp, { type: 'barh' }) : sp), 500, y, 412, 486 - y);
  } });

  /* ---------------- dividers (title only) ---------------- */
  const divT = (D, s, x, y, w, h, o = {}) => D.text(x, y, w, h, [P(s.title || '', D.c.Z.dividerTitle * (o.k || 1.05), { role: 'head', bold: true, color: o.color || K.W, lh: 1.1, ref: ['title'] })], { anchor: o.anchor || 'b', min: 0.5, name: 'Divider title' });
  L.push({ id: id('div-photo'), type: 'divider', name: 'فاصل صورة كاملة', fit: () => 4.2, render(D, s, d) {
    D.ph(d, 0, 0, 0, 960, 540, { bleed: true });
    D.fade(0, 180, 960, 360, K.DEEP, 'down', 0, 94);
    D.fade(0, 0, 960, 140, K.DEEP, 'down', 55, 0);
    wlogo(D);
    divT(D, s, 48, 250, 640, 200);
    D.line(48, 474, 64, 0, K.LIGHT, 2);
  } });
  L.push({ id: id('div-split'), type: 'divider', name: 'فاصل نصف صورة', fit: () => 4, render(D, s, d) {
    D.rect(0, 0, 480, 540, { fill: K.NAVY });
    D.ph(d, 0, 480, 0, 480, 540, { bleed: true });
    wlogo(D);
    D.line(48, 168, 64, 0, K.LIGHT, 2);
    divT(D, s, 48, 186, 384, 220, { anchor: 't' });
  } });
  L.push({ id: id('div-band'), type: 'divider', name: 'فاصل شريط صورة', fit: () => 3.8, render(D, s, d) {
    D.rect(0, 0, 960, 540, { fill: bgColor(D) });
    D.ph(d, 0, 0, 0, 960, 236, { bleed: true });
    D.fade(0, 0, 960, 120, K.DEEP, 'down', 50, 0);
    wlogo(D);
    D.line(48, 286, 64, 0, ACC === K.LIGHT ? K.BLUE : ACC, 2);
    divT(D, s, 48, 304, 760, 180, { anchor: 't', color: K.NAVY });
  } });
  L.push({ id: id('div-line'), type: 'divider', name: 'فاصل خطي', fit: () => 3.6, render(D, s) {
    D.rect(0, 0, 960, 540, { fill: K.DEEP });
    wlogo(D);
    divT(D, s, 48, 150, 760, 230, { k: 1.15 });
    D.line(48, 404, 864, 0, K.RULE_D, 0.75);
    D.line(48, 404, 96, 0, K.LIGHT, 2);
  } });
  return L;
}
[FORMAL, PRACTICAL, CREATIVE].forEach(T => T.layouts.push(...extraLayouts(T)));

const THEMES = { formal: FORMAL, practical: PRACTICAL, creative: CREATIVE };
const THEME_ORDER = ['formal', 'practical', 'creative'];

/* generic body: reuse the section renderers (plain style, no filled boxes) */
function genericBody(D, s, d, x, w, top, bottom) {
  const c = D.c;
  const ctx = Object.assign({}, c, { cardStyle: 'plain', Y1: bottom });
  const area = { x: D.mx(x, w), w };
  const others = (s.sections || []).filter(sec => sec.kind !== 'image');
  const r = layoutBody(s, ctx, area, top, m => D.c.warns.push(m), others);
  if (c.bi) for (const p of r.prims) if (p.k === 'text') { p.paras = biExpand(p.paras, s); if (parasHeight(p.paras, p.w) > p.h) { p.h = Math.max(p.h, Math.min(bottom - p.y, parasHeight(p.paras, p.w))); p.paras = fitParas(p.paras, p.w, p.h, 0.5); } }
  D.p.push(...r.prims);
}

/* ---------- picking layouts ---------- */
function slideKindOf(s) { return ['cover', 'agenda', 'divider', 'closing'].includes(s.type) ? s.type : 'content'; }
/* a layout may only be offered if it shows every piece of text on the slide */
function textPaths(slide) {
  const out = [];
  const skip = ['kind', 'icon', 'img', 'chart', 'layout', 'type', 'heading', 'autoIcon', 'highlight', 'number', 'band', 'width', 'boxed', 'cols', 'notes', 'skip', 'srcIndex', 'imageMode', 'cardStyle', 'noIcon'];
  const walk = (o, path) => {
    if (typeof o === 'string') { if (o.trim()) out.push(path); return; }
    if (Array.isArray(o)) { if (path[path.length - 1] === 'rows') { out.push(path); return; } o.forEach((x, i) => walk(x, path.concat(i))); return; }
    if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (skip.includes(k) || /_en$/.test(k)) continue; walk(o[k], path.concat(k)); }
  };
  for (const k of ['title', 'subtitle', 'eyebrow']) if (slide[k]) out.push([k]);
  walk(slide.sections || [], ['sections']);
  return out;
}
const COVER = {};
function overflowing(prims) {
  return prims.some(p => p.k === 'text' && !['Page', 'No.'].includes(p.name) && (parasHeight(p.paras, p.w) > p.h + 3 || p.y + Math.min(p.h, parasHeight(p.paras, p.w)) > 538 || Math.min(...p.paras.map(q => q.size)) < 9.5));
}
function covers(l, slide, d, lang, opt) {
  if (l.id.indexOf('generic') >= 0) return true;
  lang = lang || 'ar'; opt = opt || {};
  const key = l.id + '|' + lang + '|' + JSON.stringify([opt.sizesMode, opt.sizes && opt.sizes[lang === 'en' ? 'en' : 'ar']]) + JSON.stringify([slide.title, slide.subtitle, slide.eyebrow, slide.title_en, slide.subtitle_en, slide.sections]);
  if (COVER[key] !== undefined) return COVER[key];
  let ok = true;
  try {
    const ctx = ctxFor(lang === 'bi' ? 'ar' : lang, opt, slide); ctx.page = 1; ctx.total = 1; ctx.warns = []; ctx.slide = slide; ctx.bi = lang === 'bi';
    const D = new Drawer(ctx); l.render(D, slide, d); D.finish();
    if (overflowing(D.p)) { if (typeof process !== 'undefined' && process.env && process.env.COVDBG) D.p.filter(p => p.k === 'text' && overflowing([p])).forEach(p => console.log('  OVF', p.name, p.y, p.h, parasHeight(p.paras, p.w).toFixed(1), p.paras.map(q => q.t.slice(0, 25) + '@' + q.size).join('|'))); throw new Error('overflow'); }
    const refs = [];
    for (const p of D.p) { if (p.k === 'text') for (const q of p.paras) if (q.ref) refs.push(JSON.stringify(q.ref)); if (p.ref) refs.push(JSON.stringify(p.ref)); if (p.refs) p.refs.forEach(r => refs.push(JSON.stringify(r))); }
    const has = path => { const j = JSON.stringify(path).slice(0, -1); return refs.some(r => r === j + ']' || r.startsWith(j + ',')); };
    ok = textPaths(slide).every(has);
    if (!ok && typeof process !== 'undefined' && process.env && process.env.COVDBG) console.log('MISSING', l.id, JSON.stringify(textPaths(slide).filter(p => !has(p))));
  } catch (e) { ok = false; if (typeof process !== 'undefined' && process.env && process.env.COVDBG) console.log('COVERR', l.id, e.message); }
  const n = Object.keys(COVER).length; if (n > 4000) for (const k in COVER) delete COVER[k];
  return (COVER[key] = ok);
}
function themeCandidates(slide, themeId, lang, opt) {
  const T = THEMES[themeId] || FORMAL;
  const d = digest(slide), kind = slideKindOf(slide);
  return T.layouts.filter(l => l.type === kind).map(l => ({ l, id: l.id, name: l.name, score: l.fit(d, slide) })).filter(x => x.score > 0 && (kind !== 'content' || covers(x.l, slide, d, lang, opt))).map(({ l, ...x }) => x).sort((a, b) => b.score - a.score);
}
const PHOTO_LAYOUTS = [...['hero', 'band', 'trip', 'overlay', 'split', 'stack', 'tablephoto', 'kpiphoto', 'div-photo', 'div-split', 'div-band'].flatMap(n => ['f-', 'p-', 'c-'].map(x => x + n)), 'c-qa', 'c-list', 'f-statement', 'f-vision', 'f-abc', 'f-report', 'f-duo', 'f-divider', 'p-points', 'p-journey', 'p-imgcheck', 'p-3cards', 'c-strip', 'c-axes', 'c-kpiband', 'c-panel', 'c-frames', 'c-imgkpi', 'c-project', 'c-divider'];
function autoAssign(model, themeId, force, seed, opt, avoid) {
  const recent = [];
  let r = seed ? (() => { let s = (seed * 7919) % 233280 || 3; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })() : null;
  let lastPhoto = -3;
  model.slides.forEach((s, i) => {
    const c = themeCandidates(s, themeId, model.lang, opt);
    if (!c.length) return;
    if (!force && s.layout && c.some(x => x.id === s.layout)) { recent.push(s.layout); if (PHOTO_LAYOUTS.includes(s.layout)) lastPhoto = i; return; }
    let best = null, bs = -1e9;
    for (const x of c) {
      let sc = x.score;
      if (recent[recent.length - 1] === x.id) sc -= 2.5;
      if (recent.slice(-3).includes(x.id)) sc -= 1;
      if (PHOTO_LAYOUTS.includes(x.id)) sc += (i - lastPhoto >= 2 ? 1 : -1.2);
      if (r) sc += r() * 2.4;
      if (avoid && avoid[i] === x.id && c.length > 1) sc -= 6;
      if (sc > bs) { bs = sc; best = x; }
    }
    s.layout = best.id;
    if (PHOTO_LAYOUTS.includes(best.id)) lastPhoto = i;
    recent.push(best.id);
  });
}

/* ---------- main entry ---------- */
function layoutThemed(slide, lang, opt, themeId, info = {}) {
  const T = THEMES[themeId] || FORMAL;
  const ctx = ctxFor(lang === 'bi' ? 'ar' : lang, opt, slide);
  ctx.bi = lang === 'bi'; ctx.slide = slide;
  ctx.page = info.page || 1; ctx.total = info.total || 1; ctx.divNo = info.divNo || 1; ctx.stockSeed = info.seed || 0;
  ctx.warns = [];
  const kind = slideKindOf(slide);
  const d = digest(slide);
  const cands = T.layouts.filter(l => l.type === kind);
  let lay = cands.find(l => l.id === slide.layout && l.fit(d, slide) > 0 && (kind !== 'content' || covers(l, slide, d, lang, opt)));
  if (!lay) { const c = themeCandidates(slide, themeId, lang, opt); lay = cands.find(l => c[0] && l.id === c[0].id) || cands[cands.length - 1]; }
  const D = new Drawer(ctx);
  lay.render(D, slide, d);
  D.finish();
  // light grey pages for the official-page themes: repaint the page and redraw the template's logo + side bar
  if (D.base === 'content' && T !== FORMAL && opt && opt.bg === 'grey' && !(D.p[0] && D.p[0].k === 'rect' && D.p[0].w >= 960 && D.p[0].h >= 540)) {
    const g = new Drawer(ctx);
    g.rect(0, 0, 960, 540, { fill: 'F3F4F6' });
    g.rect(0, 73.5, 16.5, 466.5, { fill: '014EAA' });
    g.logo(TLOGO.x, TLOGO.y, TLOGO.w, K.NAVY);
    D.p.unshift(...g.p);
  }
  // text alignment chosen by the user (per text box), and English lines that start from the left
  const TA = slide.tAlign || {};
  for (const p of D.p) {
    if (p.k !== 'text') continue;
    const r0 = p.paras.find(q => q.ref);
    if (r0) p.tkey = JSON.stringify(r0.ref);
    const v = p.tkey && TA[p.tkey];
    for (const q of p.paras) {
      if (v) q.al = v;
      else if (opt && opt.enLeft && ctx.rtl && !L_AR.test(q.t) && /[A-Za-z]/.test(q.t) && q.role !== 'num') q.al = 'l';
    }
  }
  if (kind === 'content' && d.other.length && lay.id.indexOf('generic') < 0 && !D.p.some(p => ['table', 'nchart', 'chart'].includes(p.k))) ctx.warns.push('فيه جدول أو رسم بياني ما يظهر في هذا الشكل — استخدم الشكل «مرن»');
  return { prims: D.p, base: D.base, warns: ctx.warns, layout: lay.id, layoutName: lay.name, stock: D.stock, S: 1, overflow: kind === 'content' && overflowing(D.p) };
}

if (typeof module !== 'undefined') {
  Object.assign(global, require('./layout.js'));
  Object.assign(global, require('./charts.js'));
  module.exports = { THEMES, THEME_ORDER, layoutThemed, themeCandidates, autoAssign, digest };
}

/* ============ صانع العروض — PPTX writer ============
   Builds the final deck from the official (embedded) template + model + primitives. */

const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const REL = t => 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/' + t;
const E = v => Math.round(v * 12700);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const W_AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

/* ---------- image helpers ---------- */
function imgSize(b, ext) {
  try {
    if (b[0] === 0x89 && b[1] === 0x50) return { w: (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, h: (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0 };
    if (b[0] === 0xFF && b[1] === 0xD8) {
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xFF) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: b[i + 5] << 8 | b[i + 6], w: b[i + 7] << 8 | b[i + 8] };
        i += 2 + (b[i + 2] << 8 | b[i + 3]);
      }
    }
    if (b[0] === 0x47 && b[1] === 0x49) return { w: b[6] | b[7] << 8, h: b[8] | b[9] << 8 };
  } catch (e) { }
  return null;
}
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', emf: 'image/x-emf', wmf: 'image/x-wmf', tif: 'image/tiff', tiff: 'image/tiff', bmp: 'image/bmp', webp: 'image/webp' };

/* ---------- text ---------- */
function runXml(t, p, F, lang) {
  const ar = W_AR.test(t);
  let latin;
  if (ar) latin = F.ar;
  else if (p.role === 'head' || p.role === 'num') latin = F.head;
  else latin = F.body;
  const text = p.caps ? t.toUpperCase() : t;
  return `<a:r><a:rPr lang="${ar ? 'ar-SA' : 'en-US'}" altLang="en-US" sz="${Math.round(p.size * 100)}" b="${p.bold ? 1 : 0}"${p.spc ? ` spc="${p.spc}"` : ''} dirty="0"><a:solidFill><a:srgbClr val="${p.color}"/></a:solidFill><a:latin typeface="${esc(latin)}"/><a:ea typeface="${esc(latin)}"/><a:cs typeface="${esc(F.ar)}"/></a:rPr><a:t>${esc(text)}</a:t></a:r>`;
}
function splitRuns(t) {
  // keep numbers/latin with Arabic in one run – PowerPoint picks cs/latin per character
  return [t];
}
function paraXml(p, rtl, align, F, idx) {
  const al = p.al ? ({ l: 'l', c: 'ctr', r: 'r' })[p.al] : (align === 'center' ? 'ctr' : (align === 'end' ? (rtl ? 'l' : 'r') : (rtl ? 'r' : 'l')));
  const bulletInd = Math.round(p.size * 1.25 * 12700);
  let bu = '<a:buNone/>';
  let mar = '';
  if (p.bullet === 'dot') { bu = `<a:buClr><a:srgbClr val="${p.bulletColor || '004EAA'}"/></a:buClr><a:buSzPct val="100000"/><a:buFont typeface="Arial"/><a:buChar char="•"/>`; mar = ` marL="${bulletInd}" indent="-${bulletInd}"`; }
  if (p.bullet === 'blank') { mar = ` marL="${bulletInd}" indent="0"`; }
  if (p.bullet === 'num') { bu = `<a:buClr><a:srgbClr val="${p.bulletColor || '62B6F3'}"/></a:buClr><a:buSzPct val="100000"/><a:buFont typeface="${esc(F.head)}"/><a:buAutoNum type="${rtl ? 'arabicPeriod' : 'arabicPeriod'}"/>`; mar = ` marL="${bulletInd + 40000}" indent="-${bulletInd + 40000}"`; }
  const runs = splitRuns(p.t).map(t => runXml(t, p, F)).join('');
  const prtl = rtl && W_AR.test(p.t) ? 1 : 0; // latin-only lines inside Arabic decks keep LTR order (e.g. +380, SAR 50K)
  return `<a:p><a:pPr algn="${al}" rtl="${prtl}"${mar}><a:lnSpc><a:spcPct val="${Math.round((p.lh || 1.18) * 90000)}"/></a:lnSpc><a:spcBef><a:spcPts val="${Math.round((p.sb || 0) * 100)}"/></a:spcBef><a:spcAft><a:spcPts val="${Math.round((p.sa || 0) * 100)}"/></a:spcAft>${bu}</a:pPr>${runs}<a:endParaRPr lang="${rtl ? 'ar-SA' : 'en-US'}" sz="${Math.round(p.size * 100)}" dirty="0"/></a:p>`;
}

/* ---------- shapes ---------- */
function polyGeom(pts) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x, h = Math.max(...ys) - y;
  const path = pts.map((p, i) => `<a:${i ? 'lnTo' : 'moveTo'}><a:pt x="${E(p[0] - x)}" y="${E(p[1] - y)}"/></a:${i ? 'lnTo' : 'moveTo'}>`).join('');
  return `<a:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm><a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="${E(w)}" h="${E(h)}">${path}<a:close/></a:path></a:pathLst></a:custGeom>`;
}
class SlideBuilder {
  constructor(F, rtl) { this.F = F; this.rtl = rtl; this.id = 100; this.shapes = []; this.rels = []; this.rid = 10; }
  nid() { return ++this.id; }
  addRel(type, target) { const id = 'rId' + (++this.rid); this.rels.push({ id, type, target }); return id; }
  text(p) {
    const id = this.nid();
    const body = p.paras.map((pp, i) => paraXml(pp, this.rtl, p.align, this.F, i)).join('');
    this.shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(p.name || 'Text')} ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${E(p.x)}" y="${E(p.y)}"/><a:ext cx="${E(Math.max(p.w, 4))}" cy="${E(Math.max(p.h, 4))}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="${p.anchor || 't'}"><a:normAutofit/></a:bodyPr><a:lstStyle/>${body}</p:txBody></p:sp>`);
  }
  rect(p) {
    const id = this.nid();
    const adj = Math.round(Math.min(50000, (p.r || 0) / Math.max(1, Math.min(p.w, p.h)) * 100000));
    const al = p.alpha ? `<a:alpha val="${p.alpha * 1000}"/>` : '';
    const fill = p.fill ? `<a:solidFill><a:srgbClr val="${p.fill}">${p.fa != null ? `<a:alpha val="${p.fa * 1000}"/>` : ''}</a:srgbClr></a:solidFill>` : '<a:noFill/>';
    const ln = p.stroke ? `<a:ln w="${E(p.sw || 1)}"><a:solidFill><a:srgbClr val="${p.stroke}">${al}</a:srgbClr></a:solidFill></a:ln>` : '<a:ln><a:noFill/></a:ln>';
    this.shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Frame ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${E(p.x)}" y="${E(p.y)}"/><a:ext cx="${E(p.w)}" cy="${E(p.h)}"/></a:xfrm><a:prstGeom prst="${p.r ? 'roundRect' : 'rect'}"><a:avLst>${p.r ? `<a:gd name="adj" fmla="val ${adj}"/>` : ''}</a:avLst></a:prstGeom>${fill}${ln}</p:spPr><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p></p:txBody></p:sp>`);
  }
  dot(p) {
    const id = this.nid();
    this.shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Dot ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${E(p.x)}" y="${E(p.y)}"/><a:ext cx="${E(p.w)}" cy="${E(p.h)}"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${p.fill}"/></a:solidFill>${p.rw === 0 ? '<a:ln><a:noFill/></a:ln>' : `<a:ln w="${E(p.rw || 2.5)}"><a:solidFill><a:srgbClr val="${p.ring || 'FFFFFF'}"/></a:solidFill></a:ln>`}</p:spPr></p:sp>`);
  }
  line(p) {
    const id = this.nid();
    this.shapes.push(`<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="Line ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="${E(p.x)}" y="${E(p.y)}"/><a:ext cx="${E(p.w)}" cy="${E(p.h)}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="${E(p.sw || 1)}"><a:solidFill><a:srgbClr val="${p.color}"/></a:solidFill>${p.dash ? '<a:prstDash val="sysDash"/>' : ''}</a:ln></p:spPr></p:cxnSp>`);
  }
  fade(p) {
    const id = this.nid();
    this.shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Fade ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${E(p.x)}" y="${E(p.y)}"/><a:ext cx="${E(p.w)}" cy="${E(p.h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="${p.from}"><a:alpha val="${(p.a0 || 0) * 1000}"/></a:srgbClr></a:gs><a:gs pos="100000"><a:srgbClr val="${p.from}"><a:alpha val="${(p.a1 == null ? 88 : p.a1) * 1000}"/></a:srgbClr></a:gs></a:gsLst><a:lin ang="${p.to === 'right' ? 0 : p.to === 'left' ? 10800000 : p.to === 'top' ? 16200000 : 5400000}" scaled="0"/></a:gradFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`);
  }
  poly(p) {
    const id = this.nid();
    this.shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Door accent ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${polyGeom(p.pts)}<a:solidFill><a:srgbClr val="${p.fill}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`);
  }
  pic(p, mediaTarget, natural, mode, name, svgTarget) {
    const id = this.nid();
    const rid = this.addRel('image', mediaTarget);
    let src = '';
    let { x, y, w, h } = p;
    if (natural && natural.w && natural.h) {
      const c = p.crop || { l: 0, t: 0, r: 0, b: 0 };
      const vw = natural.w * (1 - c.l - c.r), vh = natural.h * (1 - c.t - c.b);
      const ar = vw / vh, br = w / h;
      if (mode === 'cover') {
        let { l, t, r, b } = c;
        if (ar > br) { const keep = br / ar; const cut = (1 - keep) / 2 * (1 - c.l - c.r); l += cut; r += cut; }
        else { const keep = ar / br; const cut = (1 - keep) / 2 * (1 - c.t - c.b); t += cut; b += cut; }
        src = `<a:srcRect l="${Math.round(l * 1e5)}" t="${Math.round(t * 1e5)}" r="${Math.round(r * 1e5)}" b="${Math.round(b * 1e5)}"/>`;
      } else {
        // contain
        if (c.l || c.t || c.r || c.b) src = `<a:srcRect l="${Math.round(c.l * 1e5)}" t="${Math.round(c.t * 1e5)}" r="${Math.round(c.r * 1e5)}" b="${Math.round(c.b * 1e5)}"/>`;
        if (ar > br) { const nh = w / ar; y += (h - nh) / 2; h = nh; } else { const nw = h * ar; x += (w - nw) / 2; w = nw; }
      }
    }
    let svgExt = '';
    if (svgTarget) { const sr = this.addRel('image', svgTarget); svgExt = `<a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="${sr}"/></a:ext></a:extLst>`; }
    let geom = '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
    let xf = `<a:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm>`;
    if (p.poly) { geom = ''; xf = polyGeom(p.poly); }
    else if (p.round) {
      const adj = Math.round(Math.min(50000, (p.radius || 12) / Math.max(1, Math.min(w, h)) * 100000));
      geom = p.round === 'top' ? `<a:prstGeom prst="round2SameRect"><a:avLst><a:gd name="adj1" fmla="val ${adj}"/><a:gd name="adj2" fmla="val 0"/></a:avLst></a:prstGeom>` : `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${adj}"/></a:avLst></a:prstGeom>`;
    }
    this.shapes.push(`<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(name || 'Picture')} ${id}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}">${svgExt}</a:blip>${src}<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xf}${geom}</p:spPr></p:pic>`);
  }
  table(p) {
    const id = this.nid();
    const F = this.F, rtl = this.rtl;
    const cell = (t, hdr, last, first) => {
      const fillHdr = hdr && p.colored;
      const fb = first && p.firstBold && !hdr;
      const pp = { t: String(t || ''), size: p.size, bold: hdr || fb, color: fillHdr ? 'FFFFFF' : (p.dark ? 'FFFFFF' : (hdr || fb ? '002657' : '2B3442')), role: 'body', lh: 1.1 };
      const bd = hdr ? `<a:lnB w="${E(1.5)}"><a:solidFill><a:srgbClr val="004EAA"/></a:solidFill></a:lnB>` : (last ? '<a:lnB><a:noFill/></a:lnB>' : `<a:lnB w="${E(0.75)}"><a:solidFill><a:srgbClr val="DCE6F2"/></a:solidFill></a:lnB>`);
      return `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/>${paraXml(pp, rtl, 'start', F)}</a:txBody><a:tcPr marL="${E(6)}" marR="${E(6)}" marT="${E(5)}" marB="${E(5)}" anchor="ctr"><a:lnL><a:noFill/></a:lnL><a:lnR><a:noFill/></a:lnR><a:lnT><a:noFill/></a:lnT>${bd}${fillHdr ? '<a:solidFill><a:srgbClr val="004EAA"/></a:solidFill>' : '<a:noFill/>'}</a:tcPr></a:tc>`;
    };
    const cws = rtl ? p.cws.slice().reverse() : p.cws;
    const grid = cws.map(w => `<a:gridCol w="${E(w)}"/>`).join('');
    const rows = p.rows.map((r, ri) => {
      const cells = Array.from({ length: p.cws.length }, (_, c) => r[c] || '');
      const ordered = rtl ? cells.reverse() : cells;
      const firstIdx = rtl ? ordered.length - 1 : 0;
      return `<a:tr h="${E(p.rh[ri])}">${ordered.map((t, ci) => cell(t, p.header && ri === 0, ri === p.rows.length - 1, ci === firstIdx)).join('')}</a:tr>`;
    }).join('');
    this.shapes.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="Table ${id}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${E(p.x)}" y="${E(p.y)}"/><a:ext cx="${E(p.w)}" cy="${E(p.h)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr${rtl ? ' rtl="1"' : ''} firstRow="1" bandRow="0"/><a:tblGrid>${grid}</a:tblGrid>${rows}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`);
  }
  chart(p, target) {
    const id = this.nid();
    const rid = this.addRel('chart', target);
    this.shapes.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="Chart ${id}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${E(p.x)}" y="${E(p.y)}"/><a:ext cx="${E(p.w)}" cy="${E(p.h)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="${rid}"/></a:graphicData></a:graphic></p:graphicFrame>`);
  }
  xml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${this.shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  }
}

/* ---------- template analysis ---------- */
async function readTemplate(tzip, parser) {
  const pres = await tzip.file('ppt/presentation.xml').async('string');
  const relsXml = await tzip.file('ppt/_rels/presentation.xml.rels').async('string');
  const relDoc = parser.parseFromString(relsXml, 'application/xml');
  const rels = {};
  for (const r of Array.from(relDoc.getElementsByTagName('Relationship'))) rels[r.getAttribute('Id')] = { type: r.getAttribute('Type'), target: 'ppt/' + r.getAttribute('Target').replace(/^\//, '').replace(/^ppt\//, '') };
  const ids = [...pres.matchAll(/<p:sldId [^>]*r:id="([^"]+)"/g)].map(m => m[1]);
  const slides = [];
  for (const id of ids) {
    const p = rels[id].target;
    const xml = await tzip.file(p).async('string');
    const rp = p.replace('slides/', 'slides/_rels/') + '.rels';
    const rx = tzip.file(rp) ? await tzip.file(rp).async('string') : '';
    slides.push({ path: p, xml, rels: rx });
  }
  // the layout used by the agenda slide carries the logo + side bar: reuse it for content slides
  // content slides use the template's plain layout that carries the small logo + side bar
  let layoutTarget = null;
  const names = {};
  tzip.forEach((p) => { if (/^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(p)) names[p] = true; });
  for (const p of Object.keys(names)) {
    const x = await tzip.file(p).async('string');
    const nm = (x.match(/<p:cSld name="([^"]*)"/) || [])[1];
    const rr = await tzip.file(p.replace('slideLayouts/', 'slideLayouts/_rels/') + '.rels').async('string');
    const m1 = /slideMaster1\.xml/.test(rr);
    names[p] = { nm, m1, logoPng: /media\/image6\.png/.test(rr) };
  }
  const prefer = Object.entries(names).find(([p, v]) => v.logoPng && v.nm === 'Default Slide' && v.m1) || Object.entries(names).find(([p, v]) => v.logoPng && v.nm === '1_Title Slide') || Object.entries(names).find(([p, v]) => v.logoPng);
  layoutTarget = prefer ? prefer[0] : (slides[1].rels.match(/Target="([^"]*slideLayout\d+\.xml)"/) || [])[1];
  return { pres, relsXml, slides, contentLayout: layoutTarget };
}

/* strip text boxes & text groups from a template slide (keep photos / gradients / logo) */
function stripTemplateText(xml) {
  let out = xml;
  // groups containing text
  out = out.replace(/<p:grpSp>(?:(?!<p:grpSp>)[\s\S])*?<\/p:grpSp>/g, m => /<a:t>/.test(m) ? '' : m);
  out = out.replace(/<p:grpSp>[\s\S]*?<\/p:grpSp>/g, m => /<a:t>/.test(m) ? '' : m);
  out = out.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, m => /<a:t>/.test(m) ? '' : m);
  return out;
}
function maxShapeId(xml) { let m = 1; for (const x of xml.matchAll(/ id="(\d+)"/g)) m = Math.max(m, +x[1]); return m; }

/* ---------- main build ---------- */
async function buildDeck({ JSZip, templateBytes, model, assets, parsed, prims, opts = {}, parser, getIcon }) {
  const F = Object.assign({}, { ar: 'Tajawal', head: 'Sequel 100 Wide 55', body: 'FS Industrie Wide Book' }, opts.fonts || {});
  const rtl = model.lang !== 'en';
  const tz = await JSZip.loadAsync(templateBytes);
  const T = await readTemplate(tz, parser);
  const [tCover, tAgenda, tAgenda8, ...rest] = T.slides;
  const tClosing = rest.pop();
  const tDividers = rest;
  // remove template slides
  for (const s of T.slides) { tz.remove(s.path); tz.remove(s.path.replace('slides/', 'slides/_rels/') + '.rels'); }
  // remove template notes slides
  tz.forEach((p) => { if (/^ppt\/notesSlides\//.test(p)) tz.remove(p); });
  let ct = await tz.file('[Content_Types].xml').async('string');
  ct = ct.replace(/<Override PartName="\/ppt\/slides\/[^"]+"[^>]*\/>/g, '').replace(/<Override PartName="\/ppt\/notesSlides\/[^"]+"[^>]*\/>/g, '');
  let presRels = T.relsXml.replace(/<Relationship [^>]*relationships\/slide"[^>]*\/>/g, '');
  let pres = T.pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, '<p:sldIdLst/>').replace(/<p:ext uri="\{521415D9-36F7-43E2-AB2F-B90AF26B5E84\}">[\s\S]*?<\/p:ext>/, '').replace(/<p:custShowLst>[\s\S]*?<\/p:custShowLst>/, '').replace(' embedTrueTypeFonts="1"', '');
  const notesMaster = (presRels.match(/Target="([^"]*notesMaster\d+\.xml)"/) || [])[1];

  // source content types (for copied chart parts)
  let srcCT = '';
  if (parsed && parsed.zip && parsed.zip.file('[Content_Types].xml')) srcCT = await parsed.zip.file('[Content_Types].xml').async('string');
  const ctHas = (s) => ct.includes(s);
  const addDefault = (ext, type) => { if (!new RegExp(`Extension="${ext}"`, 'i').test(ct)) ct = ct.replace('<Default ', `<Default Extension="${ext}" ContentType="${type}"/><Default `); };
  const addOverride = (part, type) => { if (!ctHas(`PartName="/${part}"`)) ct = ct.replace('</Types>', `<Override PartName="/${part}" ContentType="${type}"/></Types>`); };

  let mediaN = 0;
  const mediaCache = {};
  function putMedia(bytes, ext, key) {
    if (key && mediaCache[key]) return mediaCache[key];
    const name = `ppt/media/sanea_${++mediaN}.${ext}`;
    tz.file(name, bytes);
    addDefault(ext, MIME[ext] || 'application/octet-stream');
    if (key) mediaCache[key] = name;
    return name;
  }
  let chartN = 0;
  async function copyChart(asset) {
    if (asset._copied) return asset._copied;
    const src = parsed.zip;
    const srcPath = asset.part;
    const n = ++chartN;
    const dst = `ppt/charts/chart_sanea${n}.xml`;
    let xml = await src.file(srcPath).async('string');
    // brand the chart: fonts + series colors
    xml = xml.replace(/<a:latin typeface="[^"]*"/g, `<a:latin typeface="${esc(rtl ? F.ar : F.body)}"`).replace(/<a:cs typeface="[^"]*"/g, `<a:cs typeface="${esc(F.ar)}"`);
    const pal = ['004EAA', '62B6F3', '002657', '00B2BA', 'A9C7E8', '7C8796'];
    let si = 0;
    xml = xml.replace(/<c:ser>[\s\S]*?<\/c:ser>/g, ser => {
      const col = pal[si++ % pal.length];
      let pi = 0;
      ser = ser.replace(/(<c:dPt>[\s\S]*?<c:spPr>[\s\S]*?)<a:solidFill>[\s\S]*?<\/a:solidFill>/g, (m, a) => a + `<a:solidFill><a:srgbClr val="${pal[pi++ % pal.length]}"/></a:solidFill>`);
      return ser.replace(/(<c:ser>[\s\S]*?<c:spPr>)(<a:solidFill>[\s\S]*?<\/a:solidFill>)/, (m, a) => a + `<a:solidFill><a:srgbClr val="${col}"/></a:solidFill>`);
    });
    tz.file(dst, xml);
    addOverride(dst, 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml');
    const relP = srcPath.replace(/([^/]+)$/, '_rels/$1.rels');
    if (src.file(relP)) {
      let rx = await src.file(relP).async('string');
      const targets = [...rx.matchAll(/Target="([^"]+)"/g)].map(m => m[1]);
      for (const t of targets) {
        if (/^https?:/.test(t)) continue;
        const full = resolvePath(srcPath, t);
        const f = src.file(full); if (!f) continue;
        const base = full.split('/').pop();
        const nn = `ppt/charts/sanea${n}_${base}`;
        tz.file(nn, await f.async('uint8array'));
        const ov = srcCT.match(new RegExp(`<Override PartName="/${full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" ContentType="([^"]+)"`));
        const ext = base.split('.').pop();
        if (ov) addOverride(nn, ov[1]);
        else { const d = srcCT.match(new RegExp(`<Default Extension="${ext}" ContentType="([^"]+)"`, 'i')); if (d) addDefault(ext, d[1]); }
        rx = rx.replace(`Target="${t}"`, `Target="${'sanea' + n + '_' + base}"`);
      }
      tz.file(`ppt/charts/_rels/chart_sanea${n}.xml.rels`, rx);
    }
    asset._copied = '../charts/chart_sanea' + n + '.xml';
    return asset._copied;
  }

  async function genChart(p) {
    const n = ++chartN;
    const dst = `ppt/charts/chart_sanea${n}.xml`;
    tz.file(dst, chartXml(p.spec, F, rtl, { withData: true, lblSize: p.lblSize, catSize: p.catSize, bi: p.bi }));
    addOverride(dst, 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml');
    const xl = `ppt/embeddings/Microsoft_Excel_Worksheet_sanea${n}.xlsx`;
    tz.file(xl, await chartXlsx(p.spec, JSZip));
    addDefault('xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    tz.file(`ppt/charts/_rels/chart_sanea${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../embeddings/Microsoft_Excel_Worksheet_sanea${n}.xlsx"/></Relationships>`);
    return '../charts/chart_sanea' + n + '.xml';
  }

  const out = [];
  let divIdx = 0;
  for (let si = 0; si < model.slides.length; si++) {
    const slide = model.slides[si];
    if (slide.skip) continue;
    const pr = prims[si];
    let xml, relsXml;
    const sb = new SlideBuilder(F, rtl);
    const media = async (id) => assets[id];
    const draw = async (list) => {
      for (const p of list) {
        if (p.k === 'text') sb.text(p);
        else if (p.k === 'rect') sb.rect(p);
        else if (p.k === 'line') sb.line(p);
        else if (p.k === 'dot') sb.dot(p);
        else if (p.k === 'fade') sb.fade(p);
        else if (p.k === 'table') sb.table(p);
        else if (p.k === 'poly') sb.poly(p);
        else if (p.k === 'icon' || p.k === 'logo') {
          const v = getIcon ? await getIcon(p.k === 'logo' ? 'logo' : p.asset, p.color) : null;
          if (!v) continue;
          const key = p.asset + '@' + p.color;
          const target = '../media/' + putMedia(v.png, 'png', key + ':png').split('/').pop();
          const svgT = v.svg ? '../media/' + putMedia(v.svg, 'svg', key + ':svg').split('/').pop() : null;
          sb.pic({ ...p, crop: null }, target, v.size, 'contain', p.k === 'logo' ? 'Logo' : 'Icon', svgT);
        }
        else if (p.k === 'image') {
          const a = assets[p.asset]; if (!a || !a.bytes) continue;
          const target = '../media/' + putMedia(a.bytes, a.ext, p.asset).split('/').pop();
          sb.pic({ ...p, crop: p.k === 'image' ? a.crop : null }, target, a.size, p.k === 'image' ? 'cover' : 'contain', p.k === 'icon' ? 'Icon' : 'Photo');
        } else if (p.k === 'nchart') {
          sb.chart(p, await genChart(p));
        } else if (p.k === 'chart') {
          const a = assets[p.asset]; if (!a) continue;
          sb.chart(p, await copyChart(a));
        }
      }
    };
    const kind = pr.base || slide.type;
    if (['cover', 'closing', 'divider', 'agenda'].includes(kind)) {
      const t = kind === 'cover' ? tCover : kind === 'closing' ? tClosing : kind === 'agenda' ? tAgenda : tDividers[(divIdx++) % tDividers.length];
      let base = stripTemplateText(t.xml);
      sb.id = maxShapeId(base) + 10;
      await draw(pr.prims);
      xml = base.replace('</p:spTree>', sb.shapes.join('') + '</p:spTree>');
      // merge rels
      relsXml = t.rels.replace(/<Relationship [^>]*notesSlide"[^>]*\/>/g, '');
      const extra = sb.rels.map(r => `<Relationship Id="${r.id}" Type="${REL(r.type)}" Target="${r.target}"/>`).join('');
      relsXml = relsXml.replace('</Relationships>', extra + '</Relationships>');
      // avoid rId collisions: template rels use small ids, ours start at rId11 – bump if needed
      const used = new Set([...t.rels.matchAll(/Id="(rId\d+)"/g)].map(m => m[1]));
      for (const r of sb.rels) if (used.has(r.id)) { const nid = r.id + 'x'; xml = xml.split(`r:embed="${r.id}"`).join(`r:embed="${nid}"`).split(`r:id="${r.id}"`).join(`r:id="${nid}"`); relsXml = relsXml.replace(`Id="${r.id}" Type="${REL(r.type)}"`, `Id="${nid}" Type="${REL(r.type)}"`); }
    } else {
      await draw(pr.prims);
      xml = sb.xml();
      relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL('slideLayout')}" Target="../slideLayouts/${T.contentLayout.split('/').pop()}"/>${sb.rels.map(r => `<Relationship Id="${r.id}" Type="${REL(r.type)}" Target="${r.target}"/>`).join('')}</Relationships>`;
    }
    out.push({ xml, relsXml, notes: slide.notes || '' });
  }

  // write slides
  let sldIds = '';
  out.forEach((s, i) => {
    const n = i + 1;
    let rels = s.relsXml;
    if (s.notes && notesMaster) {
      const nx = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notes xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${s.notes.split('\n').map(l => `<a:p><a:pPr rtl="${W_AR.test(l) ? 1 : 0}"/><a:r><a:rPr lang="${W_AR.test(l) ? 'ar-SA' : 'en-US'}" dirty="0"/><a:t>${esc(l)}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`;
      tz.file(`ppt/notesSlides/notesSlide${n}.xml`, nx);
      tz.file(`ppt/notesSlides/_rels/notesSlide${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL('notesMaster')}" Target="../${notesMaster.replace(/^ppt\//, '').replace(/^\.\.\//, '')}"/><Relationship Id="rId2" Type="${REL('slide')}" Target="../slides/slide${n}.xml"/></Relationships>`);
      addOverride(`ppt/notesSlides/notesSlide${n}.xml`, 'application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml');
      rels = rels.replace('</Relationships>', `<Relationship Id="rIdN1" Type="${REL('notesSlide')}" Target="../notesSlides/notesSlide${n}.xml"/></Relationships>`);
    }
    tz.file(`ppt/slides/slide${n}.xml`, s.xml);
    tz.file(`ppt/slides/_rels/slide${n}.xml.rels`, rels);
    addOverride(`ppt/slides/slide${n}.xml`, 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml');
    presRels = presRels.replace('</Relationships>', `<Relationship Id="rIdS${n}" Type="${REL('slide')}" Target="slides/slide${n}.xml"/></Relationships>`);
    sldIds += `<p:sldId id="${300 + n}" r:id="rIdS${n}"/>`;
  });
  pres = pres.replace('<p:sldIdLst/>', `<p:sldIdLst>${sldIds}</p:sldIdLst>`);
  tz.file('ppt/presentation.xml', pres);
  tz.file('ppt/_rels/presentation.xml.rels', presRels);
  tz.file('[Content_Types].xml', ct);
  tz.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Office PowerPoint</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${out.length}</Slides></Properties>`);
  return tz.generateAsync({ type: opts.outType || 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

if (typeof module !== 'undefined') {
  const { resolvePath: rp } = require('./parse.js');
  Object.assign(global, require('./charts.js'));
  global.resolvePath = rp;
  module.exports = { buildDeck, imgSize };
}

/* ============ صانع العروض — icon suggestions ============
   ICONS (Lucide + Tabler tb-… + JEDCO jed-…, same library as مصمم التواصل الداخلي): { name: [tags, svgInner] }
   Arabic + English keyword map tuned for airport / corporate decks. */

const AR_ICON_WORDS = [
  ['حكومي|حكومية|الحكومية|وزارة|هيئة|جهات حكومية', 'landmark'], ['جهات|الجهات|جهة', 'building-2'], ['تقييم|التقييم|تقييمات', 'clipboard-check'], ['اختبار|اختبارات|امتحان', 'file-check'],
  ['لياقة|بدني|بدنية|رياضة', 'dumbbell'], ['سلم|السلالم|تسلق', 'tb-ladder'], ['طبي|طبية|الطبي|فحص طبي', 'stethoscope'], ['دقيقة|دقائق', 'timer'],
  ['سؤال|أسئلة|الأسئلة|استفسار', 'circle-help'], ['مقابلة|مقابلات', 'messages-square'], ['متقدم|متقدمين|المتقدمين|مرشح|مرشحين', 'user-check'],
  ['شهادة|شهادات|ترخيص|رخصة', 'award'], ['نتيجة|نتائج|درجة|درجات', 'chart-column'], ['معيار|معايير|المعايير', 'ruler'], ['منهجية|إطار|اطار', 'layers'],
  ['محاكاة|سيناريو|سيناريوهات|تمرين|تمارين', 'monitor-play'], ['فرق|فريق|الفريق', 'users'], ['قيادة|القيادة|قائد', 'crown'],
  ['عمليات|العمليات|تشغيلي|تشغيلية', 'settings'], ['مواد خطرة|خطرة|كيميائي', 'tb-biohazard'], ['تنفس|تنفسي|الجهاز التنفسي', 'tb-lungs'], ['قلب|القلب', 'heart-pulse'],
  ['عضل|العضلات|الهيكل', 'tb-bone'], ['مختبر|مختبرية|تحاليل', 'flask-conical'], ['نفسي|النفسية', 'brain'], ['عشوائي|عشوائية', 'shuffle'], ['بنك|بنك أسئلة', 'database'],
  ['مرونة|المرونة', 'tb-stretching'], ['قوة|القوة|قبضة', 'biceps-flexed'], ['جري|الجري|مشي', 'footprints'], ['بحث|البحث|إنقاذ', 'search'], ['سقف|السقف|اختراق', 'hammer'],
  ['لغة|اللغة|الإنجليزية|إنجليزي', 'languages'], ['كتابي|تحريري|كتابة', 'pen-line'], ['شفهي|محادثة', 'mic'], ['قراءة', 'book-open'], ['استماع', 'headphones'],
  ['مقارنة|مقابل', 'git-compare'], ['ملاحظات|ملاحظة', 'notebook-pen'], ['توصية|توصيات', 'thumbs-up'], ['قرار|قرارات', 'gavel'], ['ميزانية', 'wallet'],
  ['طائر|طيران|رحل|الرحلات|أسطول|ناقل', 'plane'], ['وصول|قادم', 'plane-arrival'], ['مغادر|إقلاع|اقلاع', 'plane-departure'],
  ['صالة|صالات|مبنى الركاب|تيرمينال', 'building-airport'], ['مطار', 'building-airport'], ['برج المراقبة|الملاحة الجوية|مراقبة جوية', 'tower'],
  ['مسافر|ركاب|راكب|حجاج|حاج|معتمر|زوار|ضيوف|مندوب|وفود|وفد', 'users'], ['حج|عمرة|الحرم|مكة', 'building-mosque'],
  ['حقيبة|أمتعة|امتعة|عفش', 'luggage'], ['بوابة|بوابات', 'door-enter'], ['جواز|جوازات|الهجرة', 'id'], ['تأشير|تاشير', 'license'],
  ['أمن|امن|أمني|الأمنية|حماية|سلامة|السلامة', 'shield-check'], ['تفتيش|فحص', 'scan'], ['جمارك|الجمارك', 'package'],
  ['طوارئ|الطوارئ|كوارث|الكوارث|أزمة|أزمات', 'urgent'], ['إطفاء|اطفاء|حريق|إنقاذ|انقاذ', 'flame'], ['إسعاف|اسعاف|صحة|طبي|طبية', 'first-aid-kit'],
  ['بلاغ|بلاغات|تنبيه|إنذار', 'alert-triangle'], ['ورشة|ورش|تدريب|تأهيل|دورة|دورات', 'school'], ['توعية|حملة|حملات', 'speakerphone'],
  ['اجتماع|ملتقى|مؤتمر|منتدى|جلسة', 'presentation'], ['شراكة|شريك|شركاء|اتفاقية|تعاون|تنسيق|جهات', 'heart-handshake'],
  ['استراتيجي|رؤية|هدف|أهداف|غاية', 'target-arrow'], ['رؤية 2030|٢٠٣٠', 'eye'], ['نمو|زيادة|ارتفاع|تحسن|تحسين', 'trending-up'], ['انخفاض|خفض|تقليل', 'trending-down'],
  ['مؤشر|مؤشرات|أداء|الأداء|قياس', 'chart-bar'], ['إحصاء|احصاء|أرقام|بيانات', 'chart-pie'], ['تقرير|تقارير', 'report-analytics'],
  ['ميزانية|تكلفة|تكاليف|مالي|مالية|إيراد|ايراد|ريال|استثمار', 'coins'], ['عقد|عقود|مناقصة|مشتريات', 'file-certificate'],
  ['وقت|زمن|انتظار|مدة|ساعة|ساعات', 'clock'], ['جدول|موعد|تاريخ|خطة زمنية|الجدول', 'calendar-event'], ['خطة|خطط|مسار|خارطة', 'route'],
  ['رقمي|رقمية|تقنية|تقني|ذكي|ذكية|نظام|أنظمة|منصة', 'device-desktop-analytics'], ['تطبيق|جوال', 'device-mobile'], ['ذكاء اصطناعي', 'brain'],
  ['بيئة|استدامة|مستدام|طاقة', 'leaf'], ['مياه|ماء', 'droplet'], ['كهرباء', 'bolt'], ['صيانة|إصلاح|معدات', 'tool'],
  ['نقل|حافلة|حافلات|مواصلات', 'bus'], ['قطار|الحرمين', 'train'], ['سيارة|سيارات|مواقف|ليموزين|تاكسي', 'car'],
  ['موظف|موظفين|كوادر|فريق|الموارد البشرية|توظيف', 'users-group'], ['قائد|قيادة|الرئيس التنفيذي|إدارة عليا', 'crown'],
  ['جودة|معايير|اعتماد|شهادة', 'rosette-discount-check'], ['جائزة|جوائز|إنجاز|إنجازات|انجاز|تميز|رقم قياسي', 'trophy'],
  ['رضا|تجربة|خدمة العملاء|عميل|عملاء', 'mood-smile'], ['خدمة|خدمات', 'heart-handshake'], ['ضيافة|استقبال|ترحيب', 'confetti'],
  ['مطعم|مطاعم|أغذية|طعام', 'tools-kitchen-2'], ['تسوق|متاجر|سوق حرة|تجزئة', 'shopping-bag'], ['فندق|فنادق|إقامة', 'building-skyscraper'],
  ['إعلام|إعلامي|تغطية|صحافة|أخبار', 'news'], ['تواصل|اتصال|اتصالات', 'message-circle'], ['بريد|ايميل|إيميل', 'mail'],
  ['موقع|مواقع|خريطة|منطقة', 'map-pin'], ['دولي|دولية|عالمي|عالمية|دول', 'world'], ['شحن|بضائع|لوجستي|لوجستية', 'truck-delivery'],
  ['بناء|إنشاء|مشروع|مشاريع|توسعة|تطوير', 'building'], ['ابتكار|إبداع|فكرة|أفكار', 'bulb'], ['قرار|موافقة|اعتماد القرار', 'gavel'],
  ['مخاطر|خطر|مخاطرة', 'alert-octagon'], ['حوكمة|سياسة|سياسات|لائحة|أنظمة ولوائح', 'scale'], ['تدقيق|مراجعة|تحقق', 'list-check'],
  ['تأخير|تأخر', 'hourglass'], ['جاهزية|استعداد|تشغيل|التشغيل', 'settings-check'], ['سعة|طاقة استيعابية|استيعاب', 'gauge'],
  ['رمضان', 'moon-stars'], ['اليوم الوطني|وطن|الوطن', 'flag'], ['فعالية|فعاليات|احتفال', 'sparkles'], ['زيارة|جولة', 'walk'],
  ['هدية|هدايا', 'gift'], ['فيلم|فيديو', 'movie'], ['جناح|معرض', 'building-pavilion'], ['ميكروفون|كلمة|متحدث|خطاب', 'microphone'],
  ['وثيقة|مستند|ملف', 'file-text'], ['كاونتر|إنهاء إجراءات|إجراءات', 'clipboard-check'], ['واي فاي|انترنت|إنترنت', 'wifi'],
  ['ذوي الإعاقة|إعاقة|احتياجات خاصة', 'wheelchair'], ['صلاة|مصلى|مسجد', 'building-mosque'], ['عائلة|أطفال', 'friends'],
];
const EN_ICON_WORDS = [
  ['flight|aircraft|airline|aviation|fleet', 'plane'], ['arrival|arrive|welcome', 'plane-arrival'], ['depart|departure|farewell', 'plane-departure'],
  ['terminal|airport', 'building-airport'], ['tower|air traffic', 'tower'], ['passenger|delegate|guest|visitor|people|pilgrim', 'users'],
  ['hajj|umrah|pilgrimage', 'building-mosque'], ['baggage|luggage', 'luggage'], ['gate|e-gate|border', 'door-enter'], ['passport|immigration|jawazat', 'id'],
  ['security|safe|safety|protect', 'shield-check'], ['customs', 'package'], ['emergency|crisis|disaster', 'urgent'], ['fire|rescue', 'flame'],
  ['health|medical', 'first-aid-kit'], ['training|workshop|learn', 'school'], ['awareness|campaign', 'speakerphone'], ['conference|meeting|forum|summit|pavilion', 'presentation'],
  ['partner|partnership|stakeholder|relations|collaborat|co-present', 'heart-handshake'], ['strategy|goal|target|objective', 'target-arrow'],
  ['growth|increase|improve', 'trending-up'], ['reduce|decrease', 'trending-down'], ['kpi|performance|metric|measure', 'chart-bar'], ['report|analysis', 'report-analytics'],
  ['budget|cost|sar|cash|revenue|invest|fund', 'coins'], ['time|wait|hour|minute', 'clock'], ['date|schedule|timeline|deadline|week', 'calendar-event'],
  ['plan|roadmap|route|journey', 'route'], ['digital|technology|tech|system|platform', 'device-desktop-analytics'], ['app|mobile', 'device-mobile'],
  ['ai|intelligence', 'brain'], ['sustain|environment|green|energy', 'leaf'], ['maintenance|equipment', 'tool'], ['bus|transport', 'bus'], ['train|rail', 'train'],
  ['car|parking|taxi', 'car'], ['team|staff|employee|people', 'users-group'], ['ceo|leader|leadership|executive', 'crown'], ['quality|standard|certif', 'rosette-discount-check'],
  ['award|achievement|record|excellence', 'trophy'], ['experience|satisfaction|customer', 'mood-smile'], ['service', 'heart-handshake'], ['hospitality|vip', 'confetti'],
  ['food|restaurant|dining', 'tools-kitchen-2'], ['retail|shop|duty free', 'shopping-bag'], ['hotel', 'building-skyscraper'], ['media|coverage|press|news', 'news'],
  ['communication|message', 'message-circle'], ['email|mail', 'mail'], ['location|site|map', 'map-pin'], ['global|international|world', 'world'], ['cargo|logistic|freight', 'truck-delivery'],
  ['project|construction|expansion|develop', 'building'], ['innovation|idea|creative', 'bulb'], ['decision|approval|approve', 'gavel'], ['risk', 'alert-octagon'],
  ['governance|policy|regulation|terms', 'scale'], ['audit|review|check|validate', 'list-check'], ['readiness|operation', 'settings-check'], ['capacity', 'gauge'],
  ['visit|tour', 'walk'], ['gift', 'gift'], ['film|video', 'movie'], ['speak|speech|dialogue|stage|slot', 'microphone'], ['document|file', 'file-text'],
  ['reputation|brand|identity', 'building-bank'], ['ask|request', 'hand-finger'],
];

/* ---- names: Lucide (plain), Tabler (tb-…), JEDCO custom (jed-…) ---- */
const icName = (n, ICONS) => ICONS[n] ? n : (ICONS['tb-' + n] ? 'tb-' + n : null);
const icNorm = s => String(s || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
function icStrip(w) { return w.length > 4 && w.startsWith('ال') ? w.slice(2) : (w.length > 4 && /^(بال|وال|لل|فال|كال)/.test(w) ? w.slice(3) : (w.length > 4 && /^[وبلف]ال/.test(w) ? w.slice(3) : w)); }
function icLev(a, b) { if (Math.abs(a.length - b.length) > 1) return 9; const m = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { let p = m[0]; m[0] = i; for (let j = 1; j <= b.length; j++) { const t = m[j]; m[j] = Math.min(m[j] + 1, m[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return m[b.length]; }
let AR_N = null, AR_W = null, EN_W = null, IC_IDX = null;
function icPrep(ICONS) {
  if (AR_N) return;
  const D = (typeof AR_DICT !== 'undefined' && AR_DICT) || {};
  AR_N = Object.entries(D).map(([k, v]) => [icNorm(k), v.split(' ').map(n => icName(n, ICONS)).filter(Boolean)]).filter(x => x[1].length);
  AR_W = AR_ICON_WORDS.map(([w, n]) => [w.split('|').map(icNorm), icName(n, ICONS)]).filter(x => x[1]);
  EN_W = EN_ICON_WORDS.map(([w, n]) => [new RegExp('\\b(' + w.replace(/-/g, '\\-') + ')'), icName(n, ICONS)]).filter(x => x[1]);
}
function icIndex(ICONS) {
  if (!IC_IDX) IC_IDX = Object.entries(ICONS).map(([n, v]) => ({ n, w: (' ' + v[0] + ' ').toLowerCase() }));
  return IC_IDX;
}
/* score every icon for a piece of text (Arabic and/or English) */
function suggestIcons(text, ICONS, max = 12) {
  icPrep(ICONS);
  const raw = String(text || '');
  const t = ' ' + icNorm(raw) + ' ';
  const scores = {};
  const add = (n, s) => { if (n && ICONS[n]) scores[n] = (scores[n] || 0) + s; };
  // 1) curated phrases (multi-word, strongest)
  for (const [ws, n] of AR_W) for (const w of ws) if (w && t.includes(w)) add(n, 3 + w.length / 5);
  // 2) word dictionary with Arabic prefixes stripped and small typos forgiven
  const words = (t.match(/[ء-ي]{2,}/g) || []);
  const seen = new Set();
  for (const w0 of words) {
    const ws = [w0, icStrip(w0)];
    if (seen.has(ws[1])) continue; seen.add(ws[1]);
    for (const [k, list] of AR_N) {
      let sc = 0;
      for (const x of ws) { if (k === x) sc = Math.max(sc, 3); else if (x.length >= 3 && k.length >= 3 && (k.startsWith(x) || x.startsWith(k))) sc = Math.max(sc, 2); else if (x.length >= 5 && k.length >= 5 && icLev(k, x) <= 1) sc = Math.max(sc, 1.4); }
      if (sc) list.forEach((n, i) => add(n, sc * (i === 0 ? 1.3 : 1) * (1 - i * 0.08)));
    }
  }
  // 3) English
  const low = ' ' + raw.toLowerCase() + ' ';
  for (const [re, n] of EN_W) if (re.test(low)) add(n, 3.2);
  const toks = [...new Set(low.match(/[a-z]{4,}/g) || [])].filter(x => !EN_STOP.has(x));
  if (toks.length) for (const ic of icIndex(ICONS)) {
    let s = 0;
    for (const k of toks) { if (ic.n === k || ic.n === 'tb-' + k) s += 2.2; else if (ic.w.includes(' ' + k + ' ')) s += 0.5; }
    if (s) add(ic.n, s);
  }
  const neg = /(^|\s)(no|not|without|off|stop|ban|ممنوع|منع|لا|بدون|عدم)(\s|$)/.test(t + ' ' + low);
  for (const n of Object.keys(scores)) { if (n.startsWith('jed-')) scores[n] *= 1.2; if (!neg && /-(off|x|minus|slash)$/.test(n)) scores[n] *= 0.25; if (/-(up|down|plus|minus|filled|dot|share|star|pause|pin|cog|bolt|heart|search|question|exclamation|code|dollar)$/.test(n) && !/^(trending|arrow|thumbs)/.test(n.replace(/^tb-/, ''))) scores[n] *= 0.7; }
  return Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).slice(0, max).map(x => x[0]);
}
const EN_STOP = new Set('with from that this have will into their about which while where when been were they them your more most also only over such than then very each other some what within across based through under after before during including between should would could must shall upon onto those these there here using used make made being does done every among against toward towards per'.split(' '));
function searchIcons(q, ICONS, max = 120) {
  q = String(q || '').trim();
  if (!q) return Object.keys(ICONS).slice(0, max);
  const base = suggestIcons(q, ICONS, 40);
  const out = new Set(base);
  const lq = q.toLowerCase();
  for (const b of base.slice(0, 6).filter(b => !b.startsWith('jed-'))) { const fam = b.replace(/^tb-/, '').split('-')[0]; for (const n of Object.keys(ICONS)) { if (out.size >= max) break; const m = n.replace(/^tb-/, ''); if (m === fam || m.startsWith(fam + '-')) out.add(n); } }
  if (/[a-z]/.test(lq)) for (const ic of icIndex(ICONS)) { if (out.size >= max) break; if (ic.n.includes(lq) || ic.w.includes(lq)) out.add(ic.n); }
  return [...out].slice(0, max);
}
function iconSvg(name, ICONS, color, sw = 1.6) {
  const v = ICONS[name] || ICONS['tb-' + name]; if (!v) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" color="#${color}" stroke="#${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${v[1].replace(/currentColor/g, '#' + color)}</svg>`;
}

if (typeof module !== 'undefined') module.exports = { suggestIcons, searchIcons, iconSvg, icName };

/* ============ صانع العروض — asset preparation ============
   Icons: recoloured to the brand blue (free line icons, no frames).
   Images: kept as-is (cropping is done non-destructively in the deck). */

async function prepareAssets(assets, parsed) {
  for (const [id, a] of Object.entries(assets)) {
    if (a.kind === 'chart' || a.bytes) continue;
    const m = parsed && parsed.media[a.media];
    if (!m) continue;
    a.ext = m.ext === 'jpg' ? 'jpeg' : m.ext;
    a.bytes = m.bytes;
    if (a.svg && parsed.media[a.svg]) a.svgBytes = parsed.media[a.svg].bytes;
    a.size = imgSize(a.bytes, a.ext);
    if (a.size && a.kind === 'image' && Math.min(a.size.w, a.size.h) < 500) a.lowres = true;
  }
  return assets;
}

/* Icon provider: library icons -> SVG (+PNG fallback) in any colour; source icons -> recoloured PNG */
function makeIconProvider(assets, ICONS, rasterize, recolor) {
  const cache = {};
  return async function getIcon(id, color) {
    const key = id + '@' + color;
    if (cache[key] !== undefined) return cache[key];
    let out = null;
    if (id === 'logo' && typeof LOGO_SVG !== 'undefined') {
      const svg = LOGO_SVG.replace(/fill="rgb\(100%, 100%, 100%\)"/g, `fill="#${color}"`).replace(/style="[^"]*"/, 'width="725" height="240"');
      const png = await rasterize(svg, 725, 240);
      out = { png, svg: new TextEncoder().encode(svg), size: { w: 725, h: 240 } };
    } else if (String(id).startsWith('lib:')) {
      const svg = iconSvg(id.slice(4), ICONS, color);
      if (svg) {
        const svgBytes = new TextEncoder().encode(svg);
        const png = await rasterize(svg, 192);
        out = { png, svg: svgBytes, size: { w: 192, h: 192 } };
      }
    } else {
      const a = assets[id];
      if (a && a.bytes) {
        const r = await recolor({ bytes: a.bytes, ext: a.ext, svg: a.svgBytes || null, color }).catch(() => null);
        if (r) out = { png: r.bytes, svg: null, size: imgSize(r.bytes, 'png') };
        else if (a.ext === 'png' || a.ext === 'jpeg') out = { png: a.bytes, svg: null, size: a.size, ext: a.ext };
      }
    }
    cache[key] = out;
    return out;
  };
}

/* Suggest icons for cards / KPIs / lists that have none (only when every item in the section gets one) */
function autoIconize(model, ICONS) {
  let n = 0;
  for (const s of model.slides) {
    if (s.type === 'agenda' && (s.items || []).length && !(s.items || []).some(it => it.icon || it.noIcon)) { n += smartIcons(s, ICONS, 0).n; continue; }
    for (const sec of s.sections || []) {
      if (!['cards', 'kpis', 'list'].includes(sec.kind)) continue;
      const items = sec.items || [];
      if (!items.length || items.some(it => it.icon) || items.some(it => it.number)) continue;
      const picks = items.map(it => suggestIcons([it.title, it.label, it.text, it.value && '', (it.bullets || []).join(' ')].filter(Boolean).join(' '), ICONS, 6));
      if (picks.some(p => !p.length)) continue;
      const used = new Set();
      items.forEach((it, i) => { const pick = picks[i].find(x => !used.has(x)) || picks[i][0]; used.add(pick); it.icon = 'lib:' + pick; it.autoIcon = true; n++; });
    }
    if (s.sections) for (const sec of s.sections) if (sec.kind === 'feature' && sec.boxed && sec.item && !sec.item.icon) {
      const p = suggestIcons([sec.item.title, sec.item.text].join(' '), ICONS, 1);
      if (p.length) { sec.item.icon = 'lib:' + p[0]; sec.item.autoIcon = true; n++; }
    }
  }
  return n;
}


/* «اقتراح أيقونات»: reads every point on the slide and gives each one its own fitting icon.
   Plain bullet lists become icon lists. Pressing again offers the next-best set. */
const IC_FALLBACK = ['target', 'lightbulb', 'layers', 'flag', 'compass', 'sparkles', 'star', 'rocket', 'circle-check', 'shield-check', 'gem', 'puzzle'];
function smartIcons(slide, ICONS, round = 0) {
  const secs = slide.sections || [];
  const ctxTxt = [slide.title, slide.title_en, slide.subtitle].filter(Boolean).join(' ');
  let converted = 0;
  // bullets -> icon list (keeps every word and the English partner)
  secs.forEach((sec, i) => {
    if (sec.kind !== 'bullets' || sec.qa) return;
    const its = sec.items || [];
    if (its.length < 2 || its.length > 8) return;
    const en = sec.items_en || [];
    const o = { kind: 'list', items: its.map((t, k) => Object.assign({ text: String(t) }, en[k] ? { text_en: en[k] } : {})) };
    if (sec.heading) o.heading = sec.heading; if (sec.heading_en) o.heading_en = sec.heading_en;
    secs[i] = o; converted++;
  });
  const slots = [];
  if (slide.type === 'agenda') (slide.items || []).forEach(it => { if (it && typeof it === 'object') slots.push(it); });
  for (const sec of secs) {
    if (sec.qa) continue;
    if (['cards', 'list', 'timeline', 'kpis'].includes(sec.kind)) (sec.items || []).forEach(it => { if (it && typeof it === 'object' && !it.number) slots.push(it); });
    if (sec.kind === 'feature' && sec.item && typeof sec.item === 'object') slots.push(sec.item);
  }
  if (!slots.length) return { n: 0, converted };
  const txt = it => [it.title, it.label, it.text, it.title_en, it.text_en, it.label_en, (it.bullets || []).join(' '), (it.bullets_en || []).join(' ')].filter(Boolean).join(' ');
  // ranked candidates per point (its own words first; the slide title only as a hint)
  const cand = slots.map(it => {
    const own = suggestIcons(txt(it), ICONS, 10);
    const hint = suggestIcons(txt(it) + ' ' + ctxTxt, ICONS, 10).filter(n => !own.includes(n));
    return own.concat(hint);
  });
  // global greedy: strongest match wins, no icon used twice on a slide
  const pairs = [];
  cand.forEach((list, si) => list.forEach((n, r) => pairs.push([si, n, r])));
  pairs.sort((a, b) => a[2] - b[2] || a[0] - b[0]);
  const pick = new Array(slots.length).fill(null), used = new Set();
  const skip = slots.map(() => round);   // another round: pass over the first choices
  for (const [si, n] of pairs) { if (pick[si] || used.has(n)) continue; if (skip[si] > 0) { skip[si]--; continue; } pick[si] = n; used.add(n); }
  let f = round;
  pick.forEach((n, si) => { if (!n) { while (used.has(IC_FALLBACK[f % IC_FALLBACK.length]) && f < round + 40) f++; n = IC_FALLBACK[f % IC_FALLBACK.length]; f++; used.add(n); } slots[si].icon = 'lib:' + n; slots[si].autoIcon = true; delete slots[si].noIcon; });
  return { n: slots.length, converted };
}

/* Browser recolour: draws the icon on a canvas and paints every visible pixel in the brand colour.
   Only applied when the icon has real transparency (glyph-style icons). */
function browserRasterize(svg, size, hh) {
  return new Promise((resolve) => {
    const img = new Image();
    const h = hh || size;
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = size; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, size, h);
      c.toBlob(async b => resolve(new Uint8Array(await b.arrayBuffer())), 'image/png');
    };
    img.onerror = () => resolve(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
function browserRecolor({ bytes, ext, svg, color }) {
  return new Promise((resolve) => {
    const src = svg ? new Blob([svg], { type: 'image/svg+xml' }) : new Blob([bytes], { type: ext === 'png' ? 'image/png' : 'image/' + ext });
    if (!svg && !['png', 'gif', 'webp'].includes(ext)) return resolve(null);
    const url = URL.createObjectURL(src);
    const img = new Image();
    img.onload = () => {
      const S = 256;
      const c = document.createElement('canvas'); c.width = S; c.height = S;
      const g = c.getContext('2d');
      const r = Math.min(S / (img.naturalWidth || S), S / (img.naturalHeight || S));
      const w = (img.naturalWidth || S) * r, h = (img.naturalHeight || S) * r;
      g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      const d = g.getImageData(0, 0, S, S);
      let transparent = 0;
      for (let i = 3; i < d.data.length; i += 4) if (d.data[i] < 20) transparent++;
      if (transparent / (S * S) < 0.25) { URL.revokeObjectURL(url); return resolve(null); }
      const R = parseInt(color.slice(0, 2), 16), G = parseInt(color.slice(2, 4), 16), B = parseInt(color.slice(4, 6), 16);
      for (let i = 0; i < d.data.length; i += 4) { d.data[i] = R; d.data[i + 1] = G; d.data[i + 2] = B; }
      g.putImageData(d, 0, 0);
      c.toBlob(async b => { URL.revokeObjectURL(url); resolve({ bytes: new Uint8Array(await b.arrayBuffer()), ext: 'png', recolored: true }); }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

if (typeof module !== 'undefined') {
  global.imgSize = require('./writer.js').imgSize;
  const im = require('./iconmatch.js'); global.iconSvg = im.iconSvg; global.suggestIcons = im.suggestIcons;
  module.exports = { prepareAssets, makeIconProvider, autoIconize, smartIcons };
}

/* ============ صانع العروض — المدقق ============ */
function runChecks(model, layouts, assets, naming) {
  const out = [];
  const add = (slide, level, msg) => out.push({ slide, level, msg });
  const allText = [];
  model.slides.forEach((s, i) => {
    const n = i + 1;
    if (s.skip) return;
    const L = layouts[i];
    if (!L) return;
    (L.warns || []).forEach(w => add(n, 'warn', w));
    if (s.type === 'content') {
      if (!s.title) add(n, 'warn', 'سلايد بدون عنوان');
      else if (s.title.length > 75) add(n, 'info', 'العنوان طويل (' + s.title.length + ' حرف) — الأفضل يكون سطر واحد');
      if (!(s.sections || []).length) add(n, 'error', 'سلايد فارغ — ما فيه محتوى');
      for (const sec of s.sections || []) {
        if (sec.kind === 'bullets' && (sec.items || []).length > 8) add(n, 'info', 'قائمة نقاط طويلة (' + sec.items.length + ') — يُفضّل تقسيمها');
        if (['cards', 'kpis'].includes(sec.kind) && (sec.items || []).length > 6) add(n, 'info', 'عدد البطاقات كبير (' + sec.items.length + ')');
        if (sec.kind === 'image' && sec.img && assets[sec.img] && assets[sec.img].lowres) add(n, 'warn', 'صورة دقتها منخفضة — ممكن تطلع مشوشة على الشاشة');
      }
    }
    const texts = L.prims.filter(p => p.k === 'text');
    for (const t of texts) {
      for (const p of t.paras) allText.push(p.t);
      const need = parasHeight(t.paras, t.w);
      if (need > t.h + 4 && t.name !== 'Bullets') add(n, 'error', 'نص يتجاوز مساحته: «' + short(t.paras.map(p => p.t).join(' ')) + '»');
      if (t.x < -1 || t.y < -1 || t.x + t.w > 961 || t.y + t.h > 541) add(n, 'error', 'نص خارج حدود السلايد: «' + short(t.paras[0] && t.paras[0].t) + '»');
      const minSize = Math.min(...t.paras.map(p => p.size));
      if (minSize < 8.5 && !['Page', 'No.'].includes(t.name)) add(n, 'warn', 'حجم خط صغير جداً (' + minSize + 'pt): «' + short(t.paras.find(p => p.size === minSize).t) + '»');
    }
    for (let a = 0; a < texts.length; a++) for (let b = a + 1; b < texts.length; b++) {
      const A = texts[a], B = texts[b];
      const hA = Math.min(A.h, parasHeight(A.paras, A.w)), hB = Math.min(B.h, parasHeight(B.paras, B.w));
      const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      const oy = Math.min(A.y + hA, B.y + hB) - Math.max(A.y, B.y);
      if (ox > 4 && oy > 4 && ox * oy > 0.15 * Math.min(A.w * hA, B.w * hB)) add(n, 'error', 'تداخل بين نصين: «' + short(A.paras[0].t) + '» و«' + short(B.paras[0].t) + '»');
    }
  });
  const joined = allText.join(' ');
  if (/[٠-٩]/.test(joined) && /[0-9]/.test(joined)) add(0, 'warn', 'العرض فيه خلط بين الأرقام الهندية (٠١٢) والعربية (012) — وحّدها');
  if (naming) {
    if (naming.changes.length) add(0, 'info', 'تم تعديل مسميات الصالات تلقائياً (' + naming.changes.length + ' موضع) حسب المعتمد');
    for (const f of naming.flags) add(f.where, 'error', 'يذكر «الصالة الشمالية» — المعتمد حذفها من العروض: «' + short(f.text) + '»');
  }
  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level] || a.slide - b.slide);
}
function short(t) { t = String(t || ''); return t.length > 48 ? t.slice(0, 46) + '…' : t; }
if (typeof module !== 'undefined') { global.parasHeight = require('./layout.js').parasHeight; module.exports = { runChecks }; }

/* ============ صانع العروض — قراءة ملفات Word ============
   .docx -> blocks (headings, paragraphs, list items, tables, pictures) -> slide model. */

async function parseDocx(zip, opts = {}) {
  const parser = opts.parser || new DOMParser();
  const rd = async p => zip.file(p) ? zip.file(p).async('string') : '';
  const xml = await rd('word/document.xml');
  if (!xml) throw new Error('الملف ما فيه محتوى Word');
  const doc = parser.parseFromString(xml, 'application/xml');
  // styles: id -> { name, level }
  const styles = {};
  const sx = await rd('word/styles.xml');
  if (sx) {
    const sd = parser.parseFromString(sx, 'application/xml');
    for (const st of Array.from(sd.getElementsByTagName('w:style'))) {
      const id = st.getAttribute('w:styleId');
      const nm = (st.getElementsByTagName('w:name')[0] || { getAttribute: () => '' }).getAttribute('w:val') || '';
      const ol = st.getElementsByTagName('w:outlineLvl')[0];
      const based = (st.getElementsByTagName('w:basedOn')[0] || { getAttribute: () => '' }).getAttribute('w:val');
      styles[id] = { name: nm.toLowerCase(), level: ol ? +ol.getAttribute('w:val') + 1 : null, based };
    }
  }
  const styleLevel = id => {
    let s = styles[id], n = 0;
    while (s && n++ < 5) {
      if (s.level) return s.level;
      const m = s.name.match(/^heading\s*(\d)/); if (m) return +m[1];
      if (s.name === 'title') return 0;
      if (s.name === 'subtitle') return -1;
      s = styles[s.based];
    }
    const m = String(id || '').match(/^(?:heading|عنوان)\s*(\d)$/i); if (m) return +m[1];
    if (/^title$/i.test(id || '')) return 0;
    if (/^subtitle$/i.test(id || '')) return -1;
    return null;
  };
  // relationships -> media
  const rels = {};
  const rx = await rd('word/_rels/document.xml.rels');
  for (const m of rx.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels[m[1]] = m[2];
  for (const m of rx.matchAll(/<Relationship [^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g)) rels[m[2]] = m[1];
  const assets = {};
  let imgN = 0;
  const kids = n => Array.from(n.childNodes || []).filter(c => c.nodeType === 1);
  const textOf = p => {
    let t = '';
    const walk = n => { for (const c of kids(n)) { if (c.nodeName === 'w:t') t += c.textContent; else if (c.nodeName === 'w:tab') t += ' '; else if (c.nodeName === 'w:br') t += '\n'; else if (!['w:pPr', 'w:rPr', 'w:del', 'w:instrText'].includes(c.nodeName)) walk(c); } };
    walk(p);
    return t.replace(/[  ]+/g, ' ').trim();
  };
  const blocks = [];
  async function picOf(node) {
    const out = [];
    for (const b of Array.from(node.getElementsByTagName('a:blip'))) {
      const rid = b.getAttribute('r:embed'); const tgt = rels[rid]; if (!tgt) continue;
      const path = 'word/' + tgt.replace(/^\.?\//, '').replace(/^word\//, '');
      const f = zip.file(path); if (!f) continue;
      let ext = path.split('.').pop().toLowerCase(); if (ext === 'jpg') ext = 'jpeg';
      if (!['png', 'jpeg', 'gif'].includes(ext)) continue;
      const bytes = await f.async('uint8array');
      const size = typeof imgSize === 'function' ? imgSize(bytes, ext) : null;
      if (size && (size.w < 120 || size.h < 120)) continue; // ignore tiny decorations
      const id = 'w' + (++imgN);
      assets[id] = { kind: 'image', bytes, ext, size, lowres: size ? Math.min(size.w, size.h) < 500 : false };
      out.push(id);
    }
    return out;
  }
  async function walkBody(node) {
    for (const c of kids(node)) {
      if (c.nodeName === 'w:sdt') { const sc = c.getElementsByTagName('w:sdtContent')[0]; if (sc) await walkBody(sc); continue; }
      if (c.nodeName === 'w:tbl') {
        const rows = [];
        for (const tr of kids(c).filter(x => x.nodeName === 'w:tr')) rows.push(kids(tr).filter(x => x.nodeName === 'w:tc').map(tc => kids(tc).filter(x => x.nodeName === 'w:p').map(textOf).filter(Boolean).join(' ')));
        const clean = rows.filter(r => r.some(Boolean));
        if (clean.length) {
          // a one-cell "table" is just a highlighted paragraph
          if (clean.length === 1 && clean[0].length === 1) blocks.push({ k: 'p', t: clean[0][0], boxed: true });
          else blocks.push({ k: 'table', rows: clean });
        }
        const pics = await picOf(c); pics.forEach(id => blocks.push({ k: 'img', id }));
        continue;
      }
      if (c.nodeName !== 'w:p') continue;
      const pics = await picOf(c);
      const t = textOf(c);
      const pPr = kids(c).find(x => x.nodeName === 'w:pPr');
      let sid = null, num = null, ilvl = 0, ol = null;
      if (pPr) {
        const ps = pPr.getElementsByTagName('w:pStyle')[0]; if (ps) sid = ps.getAttribute('w:val');
        const np = pPr.getElementsByTagName('w:numPr')[0];
        if (np) { const nid = np.getElementsByTagName('w:numId')[0]; num = nid ? nid.getAttribute('w:val') : '1'; const il = np.getElementsByTagName('w:ilvl')[0]; ilvl = il ? +il.getAttribute('w:val') : 0; if (num === '0') num = null; }
        const o = pPr.getElementsByTagName('w:outlineLvl')[0]; if (o) ol = +o.getAttribute('w:val') + 1;
      }
      if (t) {
        const runs = Array.from(c.getElementsByTagName('w:r')).filter(r => r.getElementsByTagName('w:t').length);
        const bold = runs.length && runs.every(r => { const b = r.getElementsByTagName('w:b')[0]; return b && b.getAttribute('w:val') !== '0' && b.getAttribute('w:val') !== 'false'; });
        const sizes = runs.map(r => { const s = r.getElementsByTagName('w:sz')[0]; return s ? +s.getAttribute('w:val') / 2 : 0; }).filter(Boolean);
        const size = sizes.length ? Math.max(...sizes) : 0;
        let lvl = ol || styleLevel(sid);
        if (/^(list|قائمة)/i.test((styles[sid] || {}).name || sid || '')) num = num || 'style';
        if (lvl != null && lvl <= 4) blocks.push({ k: 'h', lvl, t });
        else if (num) blocks.push({ k: 'li', t, lvl: ilvl, num });
        else blocks.push({ k: 'p', t, bold, size });
      }
      pics.forEach(id => blocks.push({ k: 'img', id }));
    }
  }
  const body = doc.getElementsByTagName('w:body')[0];
  await walkBody(body);
  return { blocks, assets, lang: detectLang(blocks.map(b => b.t || '').join(' ')) };
}

function detectLang(t) { const ar = (t.match(/[؀-ۿ]/g) || []).length, en = (t.match(/[A-Za-z]/g) || []).length; const tot = ar + en || 1; if (ar / tot > 0.22 && en / tot > 0.22) return 'bi'; return ar >= en * 0.3 ? 'ar' : 'en'; }
const IS_AR = t => /[؀-ۿ]/.test(t);
/* bilingual documents: pair each Arabic block with the English block next to it (either order) */
function pairBlocks(B0) {
  // 1) a block holding both languages on separate lines
  const B = B0.map(b0 => {
    const b = Object.assign({}, b0);
    if (b.t && !b.t_en && b.t.includes('\n')) {
      const ls = b.t.split('\n').map(x => x.trim()).filter(Boolean);
      const a = ls.filter(IS_AR), e = ls.filter(x => !IS_AR(x));
      if (a.length && e.length) { b.t = a.join(' '); b.t_en = e.join(' '); }
    }
    return b;
  });
  // 2) a run of Arabic blocks followed by a run of English blocks of the same shape (or the other way round)
  const free = b => b && b.t && !b.t_en && b.k !== 'table' && b.k !== 'img';
  const out = [];
  let i = 0;
  while (i < B.length) {
    const b = B[i];
    if (!free(b)) { out.push(b); i++; continue; }
    const sa = IS_AR(b.t);
    let j = i; while (free(B[j]) && IS_AR(B[j].t) === sa) j++;
    let k = j; while (free(B[k]) && IS_AR(B[k].t) !== sa) k++;
    const A = B.slice(i, j), E = B.slice(j, k);
    const same = (x, y) => x.k === y.k || (x.k !== 'h' && y.k !== 'h');
    if (E.length && A.length === E.length && A.every((x, m) => same(x, E[m]))) {
      A.forEach((x, m) => { const ar = sa ? x : E[m], en = sa ? E[m] : x; out.push(Object.assign({}, ar, { t: ar.t, t_en: en.t })); });
      i = k; continue;
    }
    if (E.length && A.length > E.length) { const off = A.length - E.length; if (A.slice(off).every((x, m) => same(x, E[m]))) { out.push(...A.slice(0, off)); A.slice(off).forEach((x, m) => { const ar = sa ? x : E[m], en = sa ? E[m] : x; out.push(Object.assign({}, ar, { t: ar.t, t_en: en.t })); }); i = k; continue; } }
    out.push(...A); i = j;
  }
  return out;
}

/* ---------- blocks -> slides ---------- */
const DOC_KPI = /^\s*((?:SAR|ريال)?\s*[+\-~]?\s*[\d٠-٩][\d٠-٩,.٫٬]*\s*(?:%|٪|\+|K|M|B|k|m|bn|مليون|مليار|ألف|الف)?\+?(?:\s*(?:دقائق|دقيقة|ساعات|ساعة|أيام|يوم|أسابيع|أسبوع|أشهر|شهر|سنوات|ريال|mins?|minutes|hours?|days?|weeks?|months?|years?))?)\s+(?:[-–—:]\s*)?(\S.{1,90})$/;
const DOC_DATE = /^(\d{4}|Q[1-4]|H[12]|الربع|النصف|يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|محرم|صفر|ربيع|جمادى|رجب|شعبان|رمضان|شوال|ذو|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|المرحلة|مرحلة|Phase|Stage|الأسبوع|Week|اليوم|Day|الأحد|الاثنين|الإثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)/i;
function splitLabel(t) {
  const m = t.match(/^(.{2,48}?)\s*[:：]\s*(.+)$/) || t.match(/^(.{2,40}?)\s+[–—-]\s+(.+)$/);
  if (!m) return null;
  if (/[.!؟?]$/.test(m[1])) return null;
  return { title: m[1].trim(), text: m[2].trim() };
}
function blocksToModel(parsed, opts = {}) {
  const { blocks, lang } = parsed;
  const ar = lang !== 'en';
  const B = lang === 'bi' ? pairBlocks(blocks) : blocks.slice();
  // promote bold / large short paragraphs to headings when the document has no heading styles
  if (!B.some(b => b.k === 'h' && b.lvl >= 1)) {
    const sizes = B.filter(b => b.k === 'p' && b.size).map(b => b.size);
    const body = sizes.length ? sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)] : 0;
    B.forEach(b => {
      if (b.k !== 'p' || b.t.length > 80 || /[.،,؛]$/.test(b.t)) return;
      if (b.size && body && b.size >= body + 3) { b.k = 'h'; b.lvl = 1; }
      else if (b.bold) { b.k = 'h'; b.lvl = 2; }
    });
  }
  const slides = [];
  // cover
  let i = 0;
  const cover = { type: 'cover', title: '', subtitle: '', lines: [] };
  const firstH = B.findIndex(b => b.k === 'h');
  const titleIdx = B.findIndex(b => b.k === 'h' && b.lvl === 0);
  const takeT = b => { cover.title = b.t; if (b.t_en) cover.title_en = b.t_en; };
  if (titleIdx >= 0) { takeT(B[titleIdx]); B.splice(titleIdx, 1); }
  else if (firstH >= 0 && B.filter(b => b.k === 'h' && b.lvl === B[firstH].lvl).length === 1) { takeT(B[firstH]); B.splice(firstH, 1); }
  else if (B[0] && B[0].k === 'p' && B[0].t.length < 90) { takeT(B[0]); B.splice(0, 1); }
  // subtitle + info lines: short paragraphs before the first heading
  while (B[0] && (B[0].k === 'p' || (B[0].k === 'h' && B[0].lvl === -1)) && B[0].t.length < 90 && cover.lines.length < 3) {
    const b = B.shift();
    if (!cover.subtitle) { cover.subtitle = b.t; if (b.t_en) cover.subtitle_en = b.t_en; }
    else { cover.lines.push(b.t); if (b.t_en) (cover.lines_en = cover.lines_en || [])[cover.lines.length - 1] = b.t_en; }
  }
  if (!cover.title) cover.title = opts.name || (ar ? 'عنوان العرض' : 'Presentation title');
  slides.push(cover);
  // intro text before first heading becomes an opening slide
  const levels = [...new Set(B.filter(b => b.k === 'h' && b.lvl >= 1).map(b => b.lvl))].sort();
  const top = levels[0], sub = levels[1];
  const useDividers = sub != null && B.filter(b => b.k === 'h' && b.lvl === top).length >= 2;
  const groups = [];
  let cur = { title: null, blocks: [] };
  for (const b of B) {
    if (b.k === 'h' && b.lvl >= 1) {
      if (cur.title || cur.blocks.length) groups.push(cur);
      cur = { title: b.t, title_en: b.t_en, lvl: b.lvl, blocks: [] };
    } else cur.blocks.push(b);
  }
  if (cur.title || cur.blocks.length) groups.push(cur);
  // agenda from the top-level headings
  const tops = groups.filter(g => g.lvl === top);
  if (tops.length >= 3 && tops.length <= 10) slides.push({ type: 'agenda', ...(lang === 'bi' ? { title: 'جدول الأعمال', title_en: 'Agenda' } : {}), items: tops.map(g => g.title_en ? { title: g.title, title_en: g.title_en } : { title: g.title }) });
  groups.forEach((g, gi) => { g.hasSub = !!(groups[gi + 1] && groups[gi + 1].lvl > g.lvl); });
  for (const g of groups) {
    if (useDividers && g.lvl === top && g.hasSub) {
      slides.push(g.title_en ? { type: 'divider', title: g.title, title_en: g.title_en } : { type: 'divider', title: g.title });
      if (!g.blocks.length) continue;
    }
    if (!g.blocks.length) { if (!useDividers) slides.push(g.title_en ? { type: 'divider', title: g.title, title_en: g.title_en } : { type: 'divider', title: g.title }); continue; }
    const cs = contentSlides(g.title || (ar ? 'مقدمة' : 'Introduction'), g.blocks, lang);
    if (g.title_en) cs.forEach(x => { x.title_en = g.title_en; });
    slides.push(...cs);
  }
  return { lang, slides };
}

function contentSlides(title, blocks, lang) {
  const secs = [];
  let k = 0;
  let subtitle = '', subtitle_en = '';
  if (blocks[0] && blocks[0].sub) { subtitle = blocks[0].t; subtitle_en = blocks[0].t_en || ''; blocks = blocks.slice(1); }
  blocks = blocks.map((b, i) => (b.k === 'p' && /[:：]\s*$/.test(b.t) && b.t.length < 120 && blocks[i + 1] && blocks[i + 1].k === 'li') ? Object.assign({}, b, { k: 'lead' }) : b);
  while (k < blocks.length) {
    const b = blocks[k];
    if (b.k === 'lead') { k++; const nx = blocks[k]; if (nx) { nx._lead = b; } continue; }
    if (b.k === 'li' && /[?؟]\s*$/.test(b.t)) { b.k = 'p'; for (let q = k + 1; blocks[q] && blocks[q].k === 'li'; q++) blocks[q].k = 'p'; }
    if (b.k === 'li') {
      const run = []; while (blocks[k] && blocks[k].k === 'li') run.push(blocks[k++]);
      // nested items become bullets of the item above
      const items = [];
      for (const r of run) {
        if (r.lvl > 0 && items.length) { const last = items[items.length - 1]; (last.bullets = last.bullets || []).push(r.t); if (r.t_en) (last.bullets_en = last.bullets_en || [])[last.bullets.length - 1] = r.t_en; continue; }
        const sl = splitLabel(r.t);
        const it = sl ? sl : { text: r.t, _plain: true };
        if (r.t_en) { const se = splitLabel(r.t_en); if (sl && se) { it.title_en = se.title; it.text_en = se.text; } else it.text_en = r.t_en; }
        items.push(it);
      }
      const sec = itemsSection(items);
      if (b._lead) { sec.heading = b._lead.t.replace(/[:：]\s*$/, ''); if (b._lead.t_en) sec.heading_en = b._lead.t_en.replace(/[:：]\s*$/, ''); }
      secs.push(sec);
      continue;
    }
    if (b.k === 'p') {
      // runs of "number + words" -> KPIs; runs of "label: text" -> list
      const run = []; while (blocks[k] && blocks[k].k === 'p') run.push(blocks[k++]);
      let j = 0;
      const isQ = t => /[?؟]\s*$/.test(t) && t.length < 240;
      const noNum = t => String(t || '').replace(/^\s*\d{1,3}\s*[.)\-–]\s*/, '');
      while (j < run.length) {
        if (isQ(run[j].t)) {
          const qa = [];
          while (run[j] && isQ(run[j].t)) {
            const q = run[j++]; const ans = [], ansE = [];
            while (run[j] && !isQ(run[j].t)) { ans.push(run[j].t); ansE.push(run[j].t_en || ''); j++; }
            const o = { title: noNum(q.t) }; const qn = q.t.match(/^\s*(\d{1,3})\s*[.)\-–]/); if (qn) o.number = qn[1]; if (ans.length) o.text = ans.join('\n');
            if (q.t_en) o.title_en = noNum(q.t_en); if (ansE.some(Boolean)) o.text_en = ansE.join('\n');
            qa.push(o);
          }
          secs.push({ kind: 'list', qa: true, items: qa });
          continue;
        }
        const kp = []; while (run[j] && run[j].t.length < 110 && DOC_KPI.test(run[j].t)) { const m = run[j].t.match(DOC_KPI); const o = { value: m[1].trim(), title: m[2].trim() }; if (run[j].t_en) { const me = run[j].t_en.match(DOC_KPI); o.title_en = me ? me[2].trim() : run[j].t_en; } kp.push(o); j++; }
        if (kp.length >= 2) { secs.push({ kind: 'kpis', items: kp }); continue; }
        if (kp.length === 1) { j--; }
        const lb = []; while (run[j] && splitLabel(run[j].t) && run[j].t.length < 400) { const o = splitLabel(run[j].t); if (run[j].t_en) { const se = splitLabel(run[j].t_en); if (se) { o.title_en = se.title; o.text_en = se.text; } else o.text_en = run[j].t_en; } lb.push(o); j++; }
        if (lb.length >= 2) { secs.push(itemsSection(lb)); continue; }
        if (lb.length === 1) j--;
        const tx = [], te = []; while (run[j] && !(tx.length && (DOC_KPI.test(run[j].t) || splitLabel(run[j].t)))) { if (run[j].boxed) { if (tx.length) break; secs.push({ kind: 'feature', item: run[j].t_en ? { text: run[j].t, text_en: run[j].t_en } : { text: run[j].t }, boxed: true }); j++; break; } tx.push(run[j].t); te.push(run[j].t_en || ''); j++; }
        if (tx.length) { const o = { kind: 'text', text: tx.join('\n') }; if (te.some(Boolean)) o.text_en = te.join('\n'); secs.push(o); }
      }
      continue;
    }
    if (b.k === 'table') {
      const r = b.rows;
      // two-column tables of numbers -> KPIs
      if (r.length >= 2 && r.length <= 6 && r.every(x => x.length === 2) && r.filter(x => /^[+\-~]?[\d٠-٩]/.test(x[1].trim())).length >= r.length - 1) {
        const body = /^[+\-~]?[\d٠-٩]/.test(r[0][1].trim()) ? r : r.slice(1);
        secs.push({ kind: 'kpis', items: body.map(x => ({ value: x[1], title: x[0] })) });
      } else secs.push({ kind: 'table', rows: r });
      k++; continue;
    }
    if (b.k === 'img') { secs.push({ kind: 'image', img: b.id }); k++; continue; }
    k++;
  }
  // a short opening sentence right under the heading = subtitle
  if (!subtitle && secs[0] && secs[0].kind === 'text' && !secs[0].text.includes('\n') && secs[0].text.length < 110 && secs.length > 1) { const f = secs.shift(); subtitle = f.text; subtitle_en = f.text_en || ''; }
  // split crowded content into several slides
  const out = [];
  let curS = [], load = 0;
  const flush = () => { if (curS.length) out.push(curS); curS = []; load = 0; };
  for (const s of splitBig(secs)) {
    const w = weight(s);
    if (curS.length && (load + w > 1 || (s.kind === 'image' && curS.filter(x => x.kind === 'image').length >= 4))) flush();
    curS.push(s); load += w;
  }
  flush();
  return out.map((sx, i) => { const o = { type: 'content', title, subtitle: i === 0 ? subtitle : '', sections: sx }; if (i === 0 && subtitle_en) o.subtitle_en = subtitle_en; return o; });
}
function itemsSection(items) {
  const plain = items.every(it => it._plain && !it.bullets);
  items.forEach(it => delete it._plain);
  if (plain) { const o = { kind: 'bullets', items: items.map(it => it.text) }; if (items.some(it => it.text_en)) o.items_en = items.map(it => it.text_en || ''); return o; }
  const dated = items.filter(it => it.title && DOC_DATE.test(it.title)).length;
  if (dated >= Math.max(2, items.length - 1) && items.length <= 6) return { kind: 'timeline', items: items.map(it => { const sh = it.text && it.text.length < 70; const o = { date: it.title, title: sh ? it.text : '', text: sh ? '' : (it.text || '') }; if (it.title_en) o.date_en = it.title_en; if (it.text_en) o[sh ? 'title_en' : 'text_en'] = it.text_en; return o; }) };
  const avg = items.reduce((a, it) => a + (it.text || '').length, 0) / items.length;
  return { kind: items.length >= 3 && items.length <= 6 && avg < 160 ? 'cards' : 'list', items: items.map(it => { const o = {}; for (const k of ['title', 'text', 'bullets', 'title_en', 'text_en', 'bullets_en']) if (it[k]) o[k] = it[k]; return o; }) };
}
function weight(s) { const k = (s.text_en || s.items_en || (s.items || []).some(it => it && (it.title_en || it.text_en))) ? 1.7 : 1; return k * weight1(s); }
function weight1(s) {
  if (s.kind === 'text') return Math.min(1, s.text.length / 750);
  if (s.kind === 'bullets') return s.items.length / 8 + s.items.join('').length / 1400;
  if (s.kind === 'table') return Math.min(1, s.rows.length / 9);
  if (s.kind === 'image') return 0.05;
  if (s.items) return s.items.length / 7 + s.items.reduce((a, it) => a + JSON.stringify(it).length, 0) / 1600;
  return 0.25;
}
function splitBig(secs) {
  const out = [];
  for (const s of secs) {
    if (s.kind === 'text' && s.text.length > 750) {
      const parts = s.text.split('\n'), pe = (s.text_en || '').split('\n'); let cur = [], ce = [];
      const push = () => { const o = { kind: 'text', text: cur.join('\n') }; if (ce.some(Boolean)) o.text_en = ce.join('\n'); out.push(o); cur = []; ce = []; };
      parts.forEach((p, k) => { if (cur.join('\n').length + p.length > 650 && cur.length) push(); cur.push(p); ce.push(pe[k] || ''); });
      if (cur.length) push();
    } else if (s.kind === 'list' && s.items.length > 1 && s.items.reduce((a, it) => a + JSON.stringify(it).length, 0) > 1500) {
      let cur = [], len = 0;
      for (const it of s.items) { const l = JSON.stringify(it).length; if (cur.length && (len + l > 1500 || cur.length >= 3)) { out.push({ ...s, items: cur }); cur = []; len = 0; } cur.push(it); len += l; }
      if (cur.length) out.push({ ...s, items: cur });
    } else if ((s.kind === 'bullets' && s.items.length > 8) || (['cards', 'list'].includes(s.kind) && s.items.length > 6)) {
      const n = Math.ceil(s.items.length / (s.kind === 'bullets' ? 7 : 6)), per = Math.ceil(s.items.length / n);
      for (let i = 0; i < s.items.length; i += per) { const o = { ...s, items: s.items.slice(i, i + per) }; if (s.items_en) o.items_en = s.items_en.slice(i, i + per); out.push(o); }
    } else out.push(s);
  }
  return out;
}

async function readDocx(zip, opts = {}) {
  const parsed = await parseDocx(zip, opts);
  const model = blocksToModel(parsed, opts);
  return { model, assets: parsed.assets, blocks: parsed.blocks };
}

if (typeof module !== 'undefined') { global.imgSize = global.imgSize || require('./writer.js').imgSize; module.exports = { readDocx, parseDocx, blocksToModel, detectLang }; }

/* ============ صانع العروض — عروض «نصية» ============
   Text-heavy or bilingual PowerPoint files are read like documents: titles, paragraphs, bullets, Q&A, tables.
   The result goes through the same smart sorter as Word files (blocksToModel). */

const PD_AR = /[؀-ۿ]/;
const PD_LABEL = /^(english|arabic|العربية|الإنجليزية|الانجليزية|عربي|إنجليزي|انجليزي)$/i;
const PD_SECTION = /^(أولاً|أولًا|اولا|ثانيًا|ثانياً|ثانيا|ثالثًا|ثالثاً|ثالثا|رابعًا|رابعاً|رابعا|خامسًا|خامساً|خامسا|سادسًا|سادساً|سابعًا|سابعاً|ثامنًا|ثامناً)\s*[:：]|^(section|part)\s+\d+\s*[:：]/i;

function pdStats(parsed) {
  let ar = 0, en = 0, chars = 0, pics = 0, n = 0;
  for (const s of parsed.slides) {
    n++;
    for (const e of s.els) {
      if (e.type === 'picture' || e.type === 'image') pics++;
      for (const p of e.paras || []) { const t = p.text || ''; chars += t.length; ar += (t.match(/[؀-ۿ]/g) || []).length; en += (t.match(/[A-Za-z]/g) || []).length; }
      for (const r of e.rows || []) for (const c of r) { chars += c.length; }
    }
  }
  const tot = ar + en || 1;
  return { bi: ar / tot > 0.2 && en / tot > 0.2, avg: chars / Math.max(1, n), pics, n };
}
function isDocLike(parsed) { const st = pdStats(parsed); return st.bi || st.avg > 520; }

/* "Program Objective | هدف البرنامج" -> { t: Arabic, t_en: English } */
function pdSplitBi(text) {
  const t = String(text || '').replace(/^\s*\d{1,2}\s+(?=\D)/, '').trim();
  const parts = t.split(/\s*[|｜]\s*/).map(x => x.trim()).filter(Boolean);
  if (parts.length === 2 && PD_AR.test(parts[0]) !== PD_AR.test(parts[1])) {
    const a = PD_AR.test(parts[0]) ? parts[0] : parts[1], e = PD_AR.test(parts[0]) ? parts[1] : parts[0];
    return { t: a, t_en: e };
  }
  return { t };
}
function pptxToBlocks(parsed) {
  const blocks = [];
  const n = parsed.slides.length;
  // recurring footer text (e.g. the programme name) – kept once as the cover title
  const footers = {};
  for (const s of parsed.slides) for (const e of s.els) if (e.type === 'text' && e.y > 470 && e.h < 40) { const t = (e.paras || []).map(p => p.text).join(' ').trim(); if (t && !/^\d+$/.test(t)) footers[t] = (footers[t] || 0) + 1; }
  const footer = Object.entries(footers).sort((a, b) => b[1] - a[1])[0];
  if (footer && footer[1] >= Math.max(2, n * 0.4)) {
    const f = footer[0].split(/\s*[|｜]\s*/)[0];
    blocks.push(Object.assign({ k: 'h', lvl: 0 }, pdSplitBi(f)));
  }
  for (const s of parsed.slides) {
    const texts = s.els.filter(e => e.type === 'text' && (e.paras || []).some(p => p.text && p.text.trim()));
    const body = texts.filter(e => {
      const all = e.paras.map(p => p.text.trim()).filter(Boolean);
      if (e.y > 470 && e.h < 40) return false;                       // footer / page number
      if (all.every(t => /^\d{1,3}$/.test(t))) return false;
      if (all.every(t => PD_LABEL.test(t))) return false;              // ENGLISH / العربية column labels
      return true;
    }).sort((a, b) => (a.y - b.y) || (a.x - b.x));
    let title = null, sub = null;
    const short = e => { const t = e.paras.map(p => p.text).join(' ').trim(); return t.length < 140 && e.paras.filter(p => p.text.trim()).length <= 2; };
    if (body[0] && body[0].y < 80 && short(body[0])) title = body.shift();
    if (title && body[0] && body[0].y < 105 && short(body[0])) sub = body.shift();
    if (title) blocks.push(Object.assign({ k: 'h', lvl: 1 }, pdSplitBi(title.paras.map(p => p.text).filter(x => x.trim()).join(' '))));
    if (sub) blocks.push(Object.assign({ k: 'p', sub: true }, pdSplitBi(sub.paras.map(p => p.text).filter(x => x.trim()).join(' '))));
    for (const e of body) {
      for (const p of e.paras) {
        const t = (p.text || '').replace(/\s+/g, ' ').trim();
        if (!t || PD_LABEL.test(t)) continue;
        if (PD_SECTION.test(t) && t.length < 90) { blocks.push({ k: 'h', lvl: 2, t }); continue; }
        if (/^[•▪●◦■\-–]\s+/.test(t) || (p.bullet && p.bullet !== 'none')) blocks.push({ k: 'li', t: t.replace(/^[•▪●◦■\-–]\s+/, ''), lvl: p.lvl || 0, num: 'b' });
        else blocks.push({ k: 'p', t, bold: !!p.bold, size: p.size });
      }
    }
    for (const tb of s.els.filter(e => e.type === 'table')) blocks.push({ k: 'table', rows: tb.rows.map(r => r.map(c => String(c || '').replace(/\n/g, ' / '))) });
  }
  return blocks;
}
function readPptxAsDoc(parsed, opts = {}) {
  const blocks = pptxToBlocks(parsed);
  const all = blocks.map(b => b.t || '').join(' ') + ' ' + blocks.map(b => b.t_en || '').join(' ');
  const lang = detectLang(all);
  const model = blocksToModel({ blocks, lang }, opts);
  return { model, blocks };
}

if (typeof module !== 'undefined') {
  const dx = require('./docx.js'); global.blocksToModel = dx.blocksToModel; global.detectLang = dx.detectLang;
  module.exports = { isDocLike, pptxToBlocks, readPptxAsDoc, pdStats };
}

/* ============ صانع العروض — التوزيع الإبداعي ============
   Turns plain text into visual structures WITHOUT changing a single word:
   paragraphs -> key message + points, lines -> cards with lead-in titles, sentences with numbers -> big numbers.
   A seed gives a different (but still sensible) arrangement every time. */

function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
const CR_NUM = /([+\-~]?\s*(?:SAR|ريال)?\s*[\d٠-٩][\d٠-٩,.٫٬]*\s*(?:%|٪|\+|K|M|B|k|bn|مليون|مليار|ألف|الف)?\+?(?:\s*(?:دقائق|دقيقة|ساعات|ساعة|أيام|يوم|أسابيع|أسبوع|أشهر|شهر|سنوات|ريال|minutes|mins?|hours?|days?|weeks?|months?|years?))?)/;
const CR_YEAR = /^(19|20|14)\d\d$/;

/* split a line into a short lead-in title + the rest, keeping every word */
function leadIn(line) {
  const t = String(line || '').trim();
  const m = t.match(/^(.{6,48}?)\s*[:：،,–—-]\s+(.{8,})$/);
  if (m) return { title: m[1].trim(), text: m[2].trim() };
  return t.length <= 60 ? { title: t } : { text: t };
}
function sentences(t) {
  const parts = String(t).replace(/([.!؟?])\s+/g, '$1\u0001').split('\u0001').map(x => x.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  // long sentence: split on Arabic/English commas into balanced chunks
  if (t.length > 260) { const c = t.replace(/([،,؛;])\s+/g, '$1\u0001').split('\u0001').map(x => x.trim()).filter(Boolean); if (c.length > 1) return c; }
  return [t];
}
function numberOf(line) {
  if (String(line).length > 130) return null;
  const m = String(line).match(CR_NUM);
  if (!m) return null;
  const v = m[1].trim();
  if (CR_YEAR.test(v.replace(/\s/g, ''))) return null;
  const before = line.slice(0, m.index).trim();
  // number leads the sentence -> the rest becomes its label; otherwise keep the whole sentence (nothing gets cut)
  const rest = before.length <= 2 ? line.slice(m.index + m[0].length).replace(/^[\s:–—-]+/, '').trim() : String(line).trim();
  if (rest.length < 3) return null;
  return { value: v, title: rest };
}
const biSplit = (s, k) => (s || '').split('\n')[k] || '';
/* lead-in for an Arabic line + its English partner, always ending with the same shape */
function leadPair(a, e) {
  const A = leadIn(a);
  if (e == null || e === '') return A;
  const B = leadIn(e);
  if (A.title && A.text) { if (B.title && B.text) { A.title_en = B.title; A.text_en = B.text; } else return { text: String(a).trim(), text_en: e }; }
  else if (A.title) A.title_en = e;
  else A.text_en = e;
  return A;
}

function creativizeSlide(s, R, V) {
  if (s.type !== 'content' || !s.sections || s.sections.some(x => ['table', 'chart'].includes(x.kind))) return s;
  const out = [];
  for (const sec of s.sections) {
    if (sec.kind === 'text') {
      const lines = String(sec.text || '').split('\n').filter(x => x.trim());
      const enL = sec.text_en ? sec.text_en.split('\n') : null;
      // lines that start with a year / quarter -> a timeline (the date moves to the marker, every word stays)
      const YR = /^\s*((?:19|20)\d\d(?:\s*[-–]\s*(?:19|20)?\d\d)?|Q[1-4]\s*(?:19|20)\d\d|(?:الربع|النصف)\s+\S+(?:\s+(?:من\s+)?(?:19|20)\d\d)?)\s*[:：\-–—|]\s*(.{3,})$/i;
      const ym = lines.map(l => l.match(YR));
      if (lines.length >= 3 && lines.length <= 6 && ym.every(Boolean)) {
        const em = enL ? enL.map(l => (l || '').match(YR)) : null;
        out.push({ kind: 'timeline', items: ym.map((m, k) => Object.assign({ date: m[1].trim(), text: m[2].trim() }, em && em[k] ? { date_en: em[k][1].trim(), text_en: em[k][2].trim() } : (enL && enL[k] ? { text_en: enL[k] } : {}))) });
        continue;
      }
      // numbers hidden inside sentences -> big numbers (+ the rest of the text stays)
      const nums = lines.map(numberOf);
      if (nums.filter(Boolean).length >= 2) {
        const kp = [], rest = [], restE = [];
        lines.forEach((l, k) => { if (nums[k]) { const o = nums[k]; if (enL) { const e = numberOf(enL[k] || ''); o.title_en = e ? e.title : (enL[k] || ''); } kp.push(o); } else { rest.push(l); restE.push(enL ? enL[k] || '' : ''); } });
        out.push({ kind: 'kpis', items: kp });
        if (rest.length) out.push(Object.assign({ kind: 'text', text: rest.join('\n') }, enL ? { text_en: restE.join('\n') } : {}));
        continue;
      }
      // one long paragraph -> key message + supporting points
      if (lines.length === 1 && lines[0].length > 200) {
        const ss = sentences(lines[0]);
        const se = enL ? sentences(enL[0] || '') : null;
        const bi = !enL || (se && se.length === ss.length);
        if (ss.length >= 2 && bi) {
          if (ss[0].length <= 260) {
            out.push({ kind: 'feature', item: Object.assign({ title: ss[0] }, se ? { title_en: se[0] } : {}) });
            const rest = ss.slice(1), restE = se ? se.slice(1) : null;
            if (rest.length >= 2 && rest.length <= 5 && V !== 1 && rest.filter(x => leadIn(x).title).length >= Math.ceil(rest.length * 0.6)) out.push({ kind: 'cards', items: rest.map((x, k) => leadPair(x, restE ? restE[k] : null)) });
            else out.push(Object.assign({ kind: 'text', text: rest.join('\n') }, restE ? { text_en: restE.join('\n') } : {}));
            continue;
          }
        }
      }
      // several lines -> cards (each line: bold lead-in + the rest)
      if (lines.length >= 2 && lines.length <= 6 && lines.every(l => l.length <= 260) && V !== 2 && lines.filter(l => leadIn(l).title).length >= Math.ceil(lines.length * 0.6)) {
        out.push({ kind: (V === 1 || lines.some(l => l.length > 170)) ? 'list' : 'cards', items: lines.map((l, k) => leadPair(l, enL ? enL[k] || '' : null)) });
        continue;
      }
      out.push(sec); continue;
    }
    if (sec.kind === 'bullets') {
      const its = sec.items || [], en = sec.items_en || null;
      { const YR = /^\s*((?:19|20)\d\d|Q[1-4]\s*(?:19|20)\d\d)\s*[:：\-–—|]\s*(.{3,})$/i; const ym = its.map(b => String(b).match(YR));
        if (its.length >= 3 && its.length <= 6 && ym.every(Boolean)) { const em = en ? en.map(b => String(b || '').match(YR)) : null; out.push({ kind: 'timeline', heading: sec.heading, items: ym.map((m, k) => Object.assign({ date: m[1], text: m[2].trim() }, em && em[k] ? { text_en: em[k][2].trim() } : (en && en[k] ? { text_en: en[k] } : {}))) }); continue; } }
      const nums = its.map(numberOf);
      if (nums.filter(Boolean).length >= 2 && nums.filter(Boolean).length >= its.length - 1 && its.length <= 6) {
        const kp = [], rest = [], restE = [];
        its.forEach((b, k) => { if (nums[k]) { const o = nums[k]; if (en) { const e = numberOf(en[k] || ''); o.title_en = e ? e.title : en[k] || ''; } kp.push(o); } else { rest.push(b); restE.push(en ? en[k] || '' : ''); } });
        out.push({ kind: 'kpis', items: kp });
        if (rest.length) out.push(Object.assign({ kind: 'bullets', items: rest }, en ? { items_en: restE } : {}));
        continue;
      }
      if (its.length >= 3 && its.length <= 6 && its.every(b => b.length > 25 && b.length < 200) && V !== 1 && its.filter(b => leadIn(b).title && leadIn(b).text).length >= Math.ceil(its.length * 0.6)) {
        out.push({ kind: V === 2 ? 'list' : 'cards', heading: sec.heading, items: its.map((b, k) => leadPair(b, en ? en[k] || '' : null)) });
        continue;
      }
      out.push(sec); continue;
    }
    if (sec.kind === 'list' && sec.items && sec.items.length <= 6 && sec.items.every(it => !it.title && it.text) && V !== 2) {
      out.push({ kind: sec.items.length >= 3 ? 'cards' : 'list', heading: sec.heading, items: sec.items.map(it => { const a = leadPair(it.text, it.text_en || null); const o = Object.assign({}, it); delete o.text; delete o.text_en; return Object.assign(o, a); }) });
      continue;
    }
    out.push(sec);
  }
  s.sections = out.map(x => { if (x.heading === undefined) delete x.heading; return x; });
  // a single section heading moves up as the slide's subtitle so no layout can lose it
  const hs = s.sections.filter(x => x.heading);
  if (hs.length === 1 && !s.subtitle) { s.subtitle = hs[0].heading; if (hs[0].heading_en) s.subtitle_en = hs[0].heading_en; delete hs[0].heading; delete hs[0].heading_en; }
  else if (hs.length === 1 && s.sections.length === 1) { const h = hs[0]; s.sections.unshift(Object.assign({ kind: 'text', text: h.heading }, h.heading_en ? { text_en: h.heading_en } : {})); delete h.heading; delete h.heading_en; }
  return s;
}
/* split slides that became too dense after the transformation */
function creativize(model, seed = 1) {
  const R = rng(seed + 7);
  const V = (seed - 1) % 3; // 0 = most visual (cards, numbers), 1 = lists & statements, 2 = calmer text
  model.slides = model.slides.map(s => creativizeSlide(s, R, V));
  model.slides.forEach(s => delete s.layout);
  return model;
}

/* ---------- keep every slide readable: split what does not fit ---------- */
function splitSlide(s) {
  if (s.type !== 'content' || !s.sections || !s.sections.length) return null;
  const wt = x => JSON.stringify(x).length;
  const secs = s.sections.filter(x => x.kind !== 'image');
  const imgs = s.sections.filter(x => x.kind === 'image');
  let A, B;
  if (secs.length >= 2) {
    const tot = secs.reduce((a, x) => a + wt(x), 0); let acc = 0, k = 0;
    while (k < secs.length - 1 && acc + wt(secs[k]) <= tot / 2) acc += wt(secs[k++]);
    if (k === 0) k = 1;
    A = secs.slice(0, k); B = secs.slice(k);
  } else if (secs.length === 1) {
    const x = secs[0];
    if (x.items && x.items.length >= 2) { const h = Math.ceil(x.items.length / 2); A = [Object.assign({}, x, { items: x.items.slice(0, h) }, x.items_en ? { items_en: x.items_en.slice(0, h) } : {})]; B = [Object.assign({}, x, { items: x.items.slice(h) }, x.items_en ? { items_en: x.items_en.slice(h) } : {})]; delete B[0].heading; }
    else if (x.kind === 'text' && x.text.split('\n').length >= 2) { const L = x.text.split('\n'), E = (x.text_en || '').split('\n'), h = Math.ceil(L.length / 2); A = [Object.assign({}, x, { text: L.slice(0, h).join('\n') }, x.text_en ? { text_en: E.slice(0, h).join('\n') } : {})]; B = [Object.assign({}, x, { text: L.slice(h).join('\n') }, x.text_en ? { text_en: E.slice(h).join('\n') } : {})]; }
    else if (x.kind === 'text' && x.text.length > 300) { const ss = sentences(x.text), es = x.text_en ? sentences(x.text_en) : null; if (ss.length < 2 || (es && es.length !== ss.length)) return null; const h = Math.ceil(ss.length / 2); A = [Object.assign({}, x, { text: ss.slice(0, h).join(' ') }, es ? { text_en: es.slice(0, h).join(' ') } : {})]; B = [Object.assign({}, x, { text: ss.slice(h).join(' ') }, es ? { text_en: es.slice(h).join(' ') } : {})]; }
    else return null;
  } else return null;
  const s1 = Object.assign({}, s, { sections: A.concat(imgs.slice(0, Math.ceil(imgs.length / 2))) });
  const s2 = Object.assign({}, s, { sections: B.concat(imgs.slice(Math.ceil(imgs.length / 2))), subtitle: '', subtitle_en: '' });
  delete s1.layout; delete s2.layout; delete s2.notes;
  return [s1, s2];
}
function fitDeck(model, themeId, opt, seed) {
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    const out = [];
    model.slides.forEach((s, i) => {
      if (s.type === 'content') {
        const r = layoutThemed(s, model.lang, opt, themeId, { page: i + 1, total: model.slides.length });
        if (r.overflow) { const sp = splitSlide(s); if (sp) { out.push(...sp); changed = true; return; } }
      }
      out.push(s);
    });
    model.slides = out;
    if (!changed) break;
    autoAssign(model, themeId, false, seed, opt);
  }
  return model;
}

if (typeof module !== 'undefined') module.exports = { creativize, leadIn, numberOf, sentences, splitSlide, fitDeck };

