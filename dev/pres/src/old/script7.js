/* ============ صانع العروض v3 — واجهتان: مبسّطة ومفصّلة ============ */
(() => {
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};
const SVG = {
  chevL: '<path d="M15 6l-6 6 6 6"/>', chevR: '<path d="M9 6l6 6-6 6"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  star: '<path d="M12 3l2.6 5.6L20 9.5l-4 4 1 5.8-5-2.8-5 2.8 1-5.8-4-4 5.4-.9z"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  img: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5L20 7"/>', note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/>', upload: '<path d="M12 15V4M7 9l5-5 5 5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>'
};
const ico = (n, c = 'currentColor', s = 16, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${SVG[n]}</svg>`;
const b64ToBytes = b => { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const bytesToB64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const toast = (m, ms = 2600) => { $$('.toast').forEach(t => t.remove()); const t = el('div', { class: 'toast' }, m); document.body.append(t); setTimeout(() => t.remove(), ms); };
const busy = m => { const b = el('div', { class: 'busy' }, m); document.body.append(b); return () => b.remove(); };
const clone = o => JSON.parse(JSON.stringify(o));
const getAt = (o, p) => p.reduce((a, k) => (a == null ? a : a[k]), o);
const setAt = (o, p, v) => { const last = p[p.length - 1]; const par = getAt(o, p.slice(0, -1)); if (par != null) par[last] = v; };
const pad2 = n => String(n).padStart(2, '0');

$('#hLogo').innerHTML = LOGO;
const APP_VER = 'v1.0 Beta';
const sig = 'Designed by Mohammed Wagih · ' + new Date().getFullYear() + ' · ' + APP_VER;
$('#sig1').textContent = sig; $('#sig2').textContent = sig;

/* ---------- fonts & measuring ---------- */
const mctx = document.createElement('canvas').getContext('2d');
let FONTS_OK = false;
const FONTS_P = Promise.all(['400 16px SanTaj', '700 16px SanTaj', '400 16px SanSeq', '400 16px SanFSI'].map(f => document.fonts.load(f, 'aب1'))).then(() => { FONTS_OK = true; LAYCACHE = {}; if (ST.model) { relayout(); render(); } else render(); }).catch(() => { });
window.MEASURE = (str, size, role, bold) => {
  if (!FONTS_OK) return null;
  const ar = L_AR.test(str);
  const fam = ar ? 'SanTaj' : (role === 'head' || role === 'num' ? 'SanSeq' : 'SanFSI');
  mctx.font = `${ar && bold ? 700 : 400} ${size}px ${fam}`;
  let w = mctx.measureText(str).width;
  if (!ar && bold) w *= 1.05;
  if (role === 'label') w *= 1.08;
  return w * 1.02;
};

/* ---------- brand photos ---------- */
window.STOCK_IDS = [];
const STOCK_ASSETS = {};
STOCK.forEach((b, i) => {
  const id = 'stock:' + i; let raw = null, sz = null;
  const dec = () => raw || (raw = b64ToBytes(b));      // decoded only when a deck is exported
  STOCK_ASSETS[id] = { kind: 'image', ext: 'jpeg', stock: true, b64: b, get bytes() { return dec(); }, get size() { return sz || (sz = imgSize(dec(), 'jpeg')); } };
  STOCK_IDS.push(id);
});

/* ---------- options & state ---------- */
const LS = 'saneaAlOrood.v4';
const defOpt = () => ({ sizesMode: 'auto', sizes: clone(DEFAULT_SIZES), fonts: { ar: 'Tajawal', head: 'Sequel 100 Wide 55', body: 'FS Industrie Wide Book' }, closing: true, autoIcons: true, naming: true, bg: 'white', creative: true });
let OPT = defOpt();

/* saving files: inside the hosted link use the viewer's save prompt, otherwise a normal download */
const DL_P = (window.claude && window.claude.use) ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
async function saveFile(name, blob) {
  const dl = await DL_P;
  if (dl) { try { await dl.save({ filename: name, data: blob }); return true; } catch (e) { if (e && e.code === 'declined') return false; if (!['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(e && e.code)) { toast('تعذر الحفظ: ' + ((e && e.message) || ''), 5000); return false; } } }
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(a.href); }, 4000);
  return true;
}
const ST = { mode: 'simple', step: 1, theme: 'formal', name: 'عرض', model: null, assets: Object.assign({}, STOCK_ASSETS), layouts: [], checks: [], naming: null, act: 0, sel: null, undo: [], redo: [], urls: {}, src: null, how: null, rewritten: null, tab: 'ic', lang: null };
try {
  const s = JSON.parse(localStorage.getItem(LS) || 'null');
  if (s) { if (s.opt) OPT = Object.assign(defOpt(), s.opt, { sizes: { ar: Object.assign(defOpt().sizes.ar, (s.opt.sizes || {}).ar || {}), en: Object.assign(defOpt().sizes.en, (s.opt.sizes || {}).en || {}) } }); if (s.mode) ST.mode = s.mode; if (s.device) ST.device = s.device; if (s.theme && THEMES[s.theme]) ST.theme = s.theme; }
} catch (e) { }
const save = () => { try { localStorage.setItem(LS, JSON.stringify({ opt: OPT, mode: ST.mode, theme: ST.theme, device: ST.device })); } catch (e) { } };
const getIcon = makeIconProvider(ST.assets, ICONS, browserRasterize, browserRecolor);
const pushUndo = () => { if (!ST.model) return; ST.undo.push(JSON.stringify(ST.model)); if (ST.undo.length > 80) ST.undo.shift(); ST.redo = []; };
function undo() { if (!ST.undo.length) return toast('ما فيه شي للتراجع'); ST.redo.push(JSON.stringify(ST.model)); ST.model = JSON.parse(ST.undo.pop()); ST.sel = null; ST.act = Math.min(ST.act, ST.model.slides.length - 1); relayout(); render(); }
function redo() { if (!ST.redo.length) return toast('ما فيه شي للإعادة'); ST.undo.push(JSON.stringify(ST.model)); ST.model = JSON.parse(ST.redo.pop()); ST.sel = null; relayout(); render(); }
$('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
document.addEventListener('keydown', e => {
  const typing = /input|textarea|select/i.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
  const formField = /input|textarea|select/i.test(document.activeElement.tagName);
  if ((e.metaKey || e.ctrlKey) && (e.code === 'KeyZ' || e.code === 'KeyY' || e.key.toLowerCase() === 'z') && !formField) {
    e.preventDefault();
    if (document.activeElement.isContentEditable) document.activeElement.blur();   // save the text first, then step back
    setTimeout(() => (e.shiftKey || e.code === 'KeyY') ? redo() : undo(), 0);
  }
  if (e.key === 'Escape') { closePops(); if (!typing) { ST.sel = null; ST.multi = null; drawStage(); } }
  if (!typing && ST.model && (ST.mode === 'detail' || ST.step === 3) && !$('#show') && (e.key === 'PageDown' || e.key === 'PageUp')) { e.preventDefault(); go(ST.act + (e.key === 'PageDown' ? 1 : -1)); }
});

/* ---------- layout ---------- */
const lang = () => (ST.model && ST.model.lang) || 'ar';
const sizeLang = () => lang() === 'en' ? 'en' : 'ar';
const tplLang = l => l === 'en' ? 'en' : 'ar';
function infoFor(i) {
  const sl = ST.model.slides; let page = 0, div = 0, tdiv = 0;
  for (let k = 0; k <= i; k++) { if (sl[k].skip) continue; page++; if (sl[k].type === 'divider') div++; }
  return { page, total: sl.filter(s => !s.skip).length, divNo: div, seed: 0 };
}
function layOne(i) {
  const s = ST.model.slides[i];
  try { const r = layoutThemed(s, lang(), OPT, ST.theme, infoFor(i)); s.layout = r.layout; return r; }
  catch (e) { console.error(e); return { prims: [], warns: ['تعذر بناء الشريحة: ' + e.message], base: 'content' }; }
}
function relayout(force) {
  if (!ST.model) return;
  autoAssign(ST.model, ST.theme, force, 0, OPT);
  ST.layouts = ST.model.slides.map((s, i) => layOne(i));
  updateChecks();
}
function refreshSlide(i) {
  ST.layouts[i] = layOne(i);
  updateChecks();
  drawStage(); drawThumb(i); renderSide();
}
function updateChecks() {
  const L = ST.layouts;
  ST.checks = runChecks(ST.model, L, ST.assets, ST.naming);
  L.forEach((l, i) => { if (l && l.stock && !ST.model.slides[i].skip) ST.checks.push({ slide: i + 1, level: 'info', msg: 'فيها صورة من مكتبة صور الهوية — استبدلها بصورتك إن وجدت (اضغط على الصورة)' }); });
  if (lang() === 'bi') ST.model.slides.forEach((s, i) => { if (!s.skip && missingEn(s)) ST.checks.push({ slide: i + 1, level: 'warn', msg: 'النص الإنجليزي ناقص في هذه الشريحة — أضفه عبر Copilot (ترجمة) أو اكتبه مباشرة' }); });
  const n = ST.checks.filter(c => c.level !== 'info').length;
  $('#dCkN').textContent = n; $('#dCkN').classList.toggle('hidden', !n);
}

function missingEn(s) {
  let miss = false;
  const walk = (o) => { if (!o || typeof o !== 'object' || miss) return; if (Array.isArray(o)) return o.forEach(walk); for (const k of Object.keys(o)) { if (/_en$/.test(k) || ['kind', 'icon', 'img', 'layout', 'type', 'value', 'notes', 'chart', 'rows'].includes(k)) continue; const v = o[k]; if (typeof v === 'string' && L_AR.test(v) && !o[k + '_en']) miss = true; else if (Array.isArray(v) && v.length && typeof v[0] === 'string') { if (v.some(x => L_AR.test(x)) && !(o[k + '_en'] && o[k + '_en'].some(Boolean))) miss = true; } else walk(v); } };
  walk(s); return miss;
}
/* ---------- drawing a slide ---------- */
const FONT = { ar: "SanTaj,'Tajawal',sans-serif", head: "SanSeq,SanTaj,sans-serif", body: "SanFSI,SanTaj,sans-serif" };
const hexA = (h, a) => { const n = parseInt(h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
function bgFor(L, i, model) {
  const lg = (model || ST.model).lang;
  const B = BG[tplLang(lg)] || BG.ar;
  const base = L.base || 'content';
  if (base === 'cover') return B[0];
  if (base === 'closing') return B[9];
  if (base === 'agenda') return B[1];
  if (base === 'divider') { let d = 0; const sl = (model || ST.model).slides; const lays = model ? null : ST.layouts; for (let k = 0; k < i; k++) if (!sl[k].skip && ((lays && lays[k] && lays[k].base) === 'divider')) d++; return B[2 + d % 7]; }
  return B[10];
}
function assetUrl(id) {
  if (ST.urls[id]) return ST.urls[id];
  const a = ST.assets[id]; if (!a) return '';
  if (a.b64) return (ST.urls[id] = 'data:image/jpeg;base64,' + a.b64);
  if (!a.bytes) return '';
  const mime = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp' }[a.ext] || 'image/' + a.ext;
  return (ST.urls[id] = URL.createObjectURL(new Blob([a.bytes], { type: mime })));
}
const iconCache = {};
function iconUrl(id, color) {
  const key = id + '@' + color;
  if (iconCache[key]) return iconCache[key];
  if (String(id).startsWith('lib:')) return (iconCache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(id.slice(4), ICONS, color) || ''));
  iconCache[key] = assetUrl(id);
  getIcon(id, color).then(v => { if (v && v.png) { iconCache[key] = URL.createObjectURL(new Blob([v.png], { type: 'image/png' })); $$(`img[data-ic="${CSS.escape(key)}"]`).forEach(i => i.src = iconCache[key]); } });
  return iconCache[key];
}
const logoCache = {};
const logoSvg = c => logoCache[c] || (logoCache[c] = LOGO.replace(/fill="rgb\(100%, 100%, 100%\)"/g, `fill="#${c}"`));
const itemPathOf = ref => { if (!ref) return null; const i = ref.lastIndexOf('items'); const j = ref.lastIndexOf('item'); if (i >= 0 && typeof ref[i + 1] === 'number') return ref.slice(0, i + 2); if (j >= 0) return ref.slice(0, j + 1); return null; };

/* draws slide i (or a free slide+layout) into box at width w */
function drawSlide(box, w, L, opt = {}) {
  const live = !!opt.live, i = opt.i, rtl = (opt.model || ST.model).lang !== 'en';
  const s = el('div', { class: 'slide' + (live ? ' live' : '') });
  s.style.backgroundImage = `url(${bgFor(L, i, opt.model)})`;
  let clipN = 0;
  for (const p of L.prims) {
    if (p.k === 'text') {
      const d = el('div', { class: 'tx a-' + (p.anchor || 't') });
      d.style.cssText += `left:${p.x}px;top:${p.y}px;width:${p.w}px;min-height:${p.h}px;${p.anchor && p.anchor !== 't' ? `height:${p.h}px;` : ''}`;
      let numN = 0;
      for (const pp of p.paras) {
        const ar = L_AR.test(pp.t);
        const fam = ar ? FONT.ar : (pp.role === 'head' || pp.role === 'num' ? FONT.head : FONT.body);
        const align = pp.al ? ({ l: 'left', c: 'center', r: 'right' })[pp.al] : (p.align === 'center' ? 'center' : (p.align === 'end' ? (rtl ? 'left' : 'right') : (rtl ? 'right' : 'left')));
        const q = el('div', { class: 'pp' + (pp.bullet ? ' bul' : '') });
        q.style.cssText = `font-family:${fam};font-size:${pp.size}px;font-weight:${pp.bold && ar ? 700 : 400};${pp.bold && !ar ? '-webkit-text-stroke:.45px currentColor;' : ''}color:#${pp.color};line-height:${(pp.lh || 1.18)};text-align:${align};direction:${rtl ? 'rtl' : 'ltr'};unicode-bidi:plaintext;margin-top:${pp.sb || 0}px;margin-bottom:${pp.sa || 0}px;letter-spacing:${(pp.spc || 0) / 100}px;${pp.caps ? 'text-transform:uppercase;' : ''}`;
        const span = el('span', { class: 'tt' }, pp.t);
        if (pp.bullet === 'blank') q.style[rtl ? 'paddingRight' : 'paddingLeft'] = (pp.size / 0.8 * 1.25) + 'px';
        else if (pp.bullet) {
          q.style[rtl ? 'paddingRight' : 'paddingLeft'] = (pp.size * 1.25) + 'px';
          const ii = el('i', {}, pp.bullet === 'num' ? (++numN) + '.' : '•'); ii.style.cssText = `${rtl ? 'right' : 'left'}:0;top:0;color:#${pp.bulletColor || '004EAA'};font-family:${FONT.body}`;
          q.append(ii);
        }
        q.append(span);
        if (live && pp.ref) {
          const ip = itemPathOf(pp.ref);
          if (ip) q.dataset.item = JSON.stringify(ip);
          span.contentEditable = 'plaintext-only';
          span.spellcheck = false;
          span.style.outline = 'none';
          span.addEventListener('focus', () => { span._orig = span.textContent; if (ip) select({ kind: 'item', path: ip }, true); if (p.tkey) showAlignBar(d, i, p.tkey); });
          span.addEventListener('blur', () => setTimeout(() => { if (!document.activeElement || !document.activeElement.isContentEditable) { const ab = $('.alignBar'); if (ab && !ab.matches(':hover')) ab.remove(); } }, 150));
          span.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); span.blur(); } if (e.key === 'Escape') { span.textContent = span._orig; span.blur(); } });
          span.addEventListener('blur', () => commitText(i, pp, span));
          q.addEventListener('mousedown', e => { if (ip && (e.shiftKey || e.metaKey || e.ctrlKey)) { e.preventDefault(); if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur(); select({ kind: 'item', path: ip }); return; } if (e.target === q) { e.preventDefault(); span.focus(); } });
          q.dataset.ref = '1';
        }
        d.append(q);
      }
      s.append(d);
    } else if (p.k === 'rect') {
      const d = el('div', { class: 'rc' });
      d.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;border-radius:${p.r || 0}px;${p.fill ? `background:${p.fa != null ? hexA(p.fill, p.fa / 100) : '#' + p.fill};` : ''}${p.stroke ? `border:${p.sw || 1}px solid ${p.alpha ? hexA(p.stroke, p.alpha / 100) : '#' + p.stroke};` : ''}`;
      if (live && p.item) { d.dataset.item = JSON.stringify(p.item); d.addEventListener('mousedown', e => { if (e.target === d) select({ kind: 'item', path: p.item }); }); }
      s.append(d);
    } else if (p.k === 'line') {
      const d = el('div', { class: 'ln' });
      const st = p.dash ? 'dashed' : 'solid';
      d.style.cssText = p.w >= p.h ? `left:${p.x}px;top:${p.y}px;width:${p.w}px;border-top:${p.sw || 1}px ${st} #${p.color};pointer-events:none` : `left:${p.x}px;top:${p.y}px;height:${p.h}px;border-left:${p.sw || 1}px ${st} #${p.color};pointer-events:none`;
      s.append(d);
    } else if (p.k === 'dot') {
      const d = el('div', { class: 'dt' });
      d.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;border-radius:50%;background:#${p.fill};${p.rw === 0 ? '' : `box-shadow:0 0 0 ${p.rw || 2.5}px #${p.ring || 'FFFFFF'};`}pointer-events:none`;
      s.append(d);
    } else if (p.k === 'fade') {
      const d = el('div', { class: 'fd' });
      const dir = p.to === 'right' ? 'to right' : p.to === 'left' ? 'to left' : p.to === 'top' ? 'to top' : 'to bottom';
      d.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;pointer-events:none;background:linear-gradient(${dir},${hexA(p.from, (p.a0 || 0) / 100)},${hexA(p.from, (p.a1 == null ? 88 : p.a1) / 100)})`;
      s.append(d);
    } else if (p.k === 'poly') {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); g.setAttribute('class', 'abs'); g.setAttribute('viewBox', '0 0 960 540');
      const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      pl.setAttribute('points', p.pts.map(q => q.join(',')).join(' ')); pl.setAttribute('fill', '#' + p.fill);
      g.append(pl); s.append(g);
    } else if (p.k === 'logo') {
      const d = el('div', { class: 'lg', html: logoSvg(p.color) });
      d.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;pointer-events:none`;
      s.append(d);
    } else if (p.k === 'image') {
      const url = assetUrl(p.asset);
      if (p.poly) {
        const pts = p.poly.map(q => q.join(',')).join(' ');
        const id = 'cp' + (clipN++) + Math.random().toString(36).slice(2, 7);
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); g.setAttribute('class', 'abs'); g.setAttribute('viewBox', '0 0 960 540');
        g.innerHTML = `<defs><clipPath id="${id}"><polygon points="${pts}"/></clipPath></defs><image href="${url}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
        s.append(g);
      } else {
        const d = el('div', { class: 'im' });
        const rad = p.round === 'top' ? `${p.radius}px ${p.radius}px 0 0` : p.round === 'all' ? `${p.radius}px` : '0';
        d.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;background-image:url(${url});border-radius:${rad}`;
        if (live) { d.addEventListener('mousedown', e => { e.preventDefault(); openImagePicker({ i, prim: p }); }); d.title = 'اضغط لتغيير الصورة'; }
        if (p.item) d.dataset.item = JSON.stringify(p.item);
        s.append(d);
      }
    } else if (p.k === 'icon') {
      const key = p.asset + '@' + p.color;
      const im = el('img', { class: 'ic', 'data-ic': key, src: iconUrl(p.asset, p.color), draggable: 'false' });
      im.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;object-fit:contain`;
      if (live && p.item) { im.dataset.item = JSON.stringify(p.item); im.title = 'اضغط لتغيير الأيقونة'; im.addEventListener('mousedown', e => { e.preventDefault(); if (e.shiftKey || e.metaKey || e.ctrlKey) { select({ kind: 'item', path: p.item }); return; } select({ kind: 'item', path: p.item }, true); setTimeout(() => openIconPop(p.item, im.getBoundingClientRect()), 0); }); }
      s.append(im);
    } else if (p.k === 'nchart') {
      const g = el('div', { class: 'nch' });
      g.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px`;
      g.innerHTML = chartSvg(p.spec, p.w, p.h, { rtl, bi: p.bi, catSize: p.catSize, lblSize: p.lblSize, fonts: { ar: FONT.ar, head: FONT.head, body: FONT.body } });
      s.append(g);
      if (live) { g.style.cursor = 'pointer'; g.title = 'اضغط لتعديل أرقام الشارت'; g.addEventListener('mousedown', e => { e.preventDefault(); openChartEditor(i, p.spec); }); }
    } else if (p.k === 'table') {
      const t = el('table'); t.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;direction:${rtl ? 'rtl' : 'ltr'}`;
      p.rows.forEach((r, ri) => {
        const tr = el('tr'); tr.style.height = p.rh[ri] + 'px';
        for (let c = 0; c < p.cws.length; c++) {
          const hdr = p.header && ri === 0;
          const td = el('td', {}, r[c] || '');
          const fb = c === 0 && p.firstBold && !hdr;
          td.style.cssText = `width:${p.cws[c]}px;padding:0 6px;font-size:${p.size}px;font-family:${L_AR.test(r[c] || '') ? FONT.ar : FONT.body};font-weight:${hdr || fb ? 700 : 400};color:${hdr && p.colored ? '#fff' : (p.dark ? '#fff' : hdr || fb ? '#002657' : '#2B3442')};${hdr && p.colored ? 'background:#004EAA;' : ''}border-bottom:${hdr ? '1.5px solid #004EAA' : ri === p.rows.length - 1 ? '0' : '0.75px solid #DCE6F2'};outline:none`;
          if (live && p.ref) { td.contentEditable = 'plaintext-only'; td.addEventListener('blur', () => { const slide = ST.model.slides[i]; const rows = getAt(slide, p.ref); if (rows && rows[ri] && (rows[ri][c] || '') !== td.textContent) { pushUndo(); rows[ri][c] = td.textContent; refreshSlide(i); } }); }
          tr.append(td);
        }
        t.append(tr);
      });
      s.append(t);
    } else if (p.k === 'chart') {
      const d = el('div', { class: 'ch' }, 'رسم بياني — يُنقل كما هو بألوان وخطوط الهوية');
      d.style.cssText += `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px`;
      s.append(d);
    }
  }
  if (live) {
    s.addEventListener('dragover', e => { if (!e.dataTransfer.types.includes('text/x-icon')) return; e.preventDefault(); const t = e.target.closest && e.target.closest('[data-item]'); $$('.slide .drop').forEach(x => x.classList.remove('drop')); if (t) t.classList.add('drop'); });
    s.addEventListener('dragleave', () => $$('.slide .drop').forEach(x => x.classList.remove('drop')));
    s.addEventListener('drop', e => { const name = e.dataTransfer.getData('text/x-icon'); if (!name) return; e.preventDefault(); const t = e.target.closest && e.target.closest('[data-item]'); $$('.slide .drop').forEach(x => x.classList.remove('drop')); if (!t) return toast('اسحب الأيقونة فوق بطاقة أو عنصر'); setIcon(JSON.parse(t.dataset.item), name); });
    s.addEventListener('mousedown', e => { if (e.target === s) { ST.sel = null; closePops(); markSel(); } });
  }
  box.innerHTML = '';
  box.style.width = w + 'px'; box.style.height = (w * 540 / 960) + 'px';
  box.classList.add('sbox');
  box.append(s);
  s.style.transform = `scale(${w / 960})`;
  return s;
}
function commitText(i, pp, span) {
  const slide = ST.model.slides[i];
  const v = span.textContent.replace(/ /g, ' ').trim();
  const cur = getAt(slide, pp.ref);
  let next;
  if (pp.line != null) { const arr = String(cur || '').split('\n'); arr[pp.line] = v; next = arr.filter(x => x.trim()).join('\n'); }
  else next = v;
  if (String(cur == null ? '' : cur) === next) return;
  pushUndo();
  const last = pp.ref[pp.ref.length - 1];
  const parent = getAt(slide, pp.ref.slice(0, -1));
  if (!next && Array.isArray(parent)) parent.splice(last, 1);
  else if (!next && typeof last === 'string' && last !== 'title' && parent) delete parent[last];
  else setAt(slide, pp.ref, next);
  setTimeout(() => refreshSlide(i), 0);
}

/* ---------- selection & item tools ---------- */
/* selection: one item, or several with Shift (a range) / Ctrl·⌘ (pick one by one) */
let MODS = { t: 0 };
document.addEventListener('mousedown', e => { MODS = { shift: e.shiftKey, add: e.metaKey || e.ctrlKey, t: Date.now() }; }, true);
const parentKey = p => JSON.stringify(p.slice(0, -1));
function select(sel, keepFocus) {
  const fresh = Date.now() - MODS.t < 400;
  const prev = ST.sel;
  if (sel && sel.kind === 'item' && fresh && (MODS.shift || MODS.add) && prev && prev.kind === 'item' && parentKey(prev.path) === parentKey(sel.path) && typeof sel.path[sel.path.length - 1] === 'number') {
    const base = sel.path.slice(0, -1), k = sel.path[sel.path.length - 1];
    let set = new Set((ST.multi && ST.multi.length ? ST.multi : [prev.path[prev.path.length - 1]]));
    if (MODS.shift) { const a = ST.anchor != null ? ST.anchor : prev.path[prev.path.length - 1]; set = new Set(); for (let j = Math.min(a, k); j <= Math.max(a, k); j++) set.add(j); }
    else { if (set.has(k) && set.size > 1) set.delete(k); else set.add(k); }
    ST.multi = [...set].sort((x, y) => x - y);
    ST.sel = { kind: 'item', path: base.concat(ST.multi.includes(k) ? k : ST.multi[ST.multi.length - 1]) };
  } else {
    ST.sel = sel; ST.multi = null;
    ST.anchor = sel && sel.kind === 'item' ? sel.path[sel.path.length - 1] : null;
  }
  markSel();
}
function multiPaths() { if (!ST.sel || ST.sel.kind !== 'item') return []; const base = ST.sel.path.slice(0, -1); return ST.multi && ST.multi.length > 1 ? ST.multi.map(k => base.concat(k)) : [ST.sel.path]; }
function groupAct(act) {
  const i = ST.act, slide = ST.model.slides[i], base = ST.sel.path.slice(0, -1), arr = getAt(slide, base);
  if (!Array.isArray(arr)) return;
  let ks = ST.multi.slice().sort((a, b) => a - b);
  pushUndo();
  if (act === 'up') { if (ks[0] === 0) { ST.undo.pop(); return; } for (const k of ks) [arr[k - 1], arr[k]] = [arr[k], arr[k - 1]]; ks = ks.map(k => k - 1); }
  if (act === 'down') { if (ks[ks.length - 1] === arr.length - 1) { ST.undo.pop(); return; } for (const k of ks.slice().reverse()) [arr[k + 1], arr[k]] = [arr[k], arr[k + 1]]; ks = ks.map(k => k + 1); }
  if (act === 'dup') { const copies = ks.map(k => clone(arr[k])); const at = ks[ks.length - 1] + 1; arr.splice(at, 0, ...copies); ks = copies.map((_, j) => at + j); }
  if (act === 'del') { for (const k of ks.slice().reverse()) arr.splice(k, 1); ST.sel = null; ST.multi = null; refreshSlide(i); return toast('حذفت ' + ks.length + ' عناصر'); }
  if (act === 'icons' || act === 'noicons') {
    const used = new Set();
    for (const k of ks) {
      const it = arr[k]; if (!it || typeof it !== 'object') continue;
      if (act === 'noicons') { delete it.icon; delete it.autoIcon; it.noIcon = true; continue; }
      const pick = suggestIcons(itemText(it) + ' ' + (it.title_en || '') + ' ' + (it.text_en || ''), ICONS, 12).find(n => !used.has(n)) || IC_FALLBACK.find(n => !used.has(n));
      used.add(pick); it.icon = 'lib:' + pick; it.autoIcon = true; delete it.noIcon;
    }
  }
  ST.multi = ks; ST.sel = { kind: 'item', path: base.concat(ks[ks.length - 1]) };
  refreshSlide(i);
}
function markSel() {
  const st = curStage(); if (!st) return;
  st.querySelectorAll('.itsel').forEach(x => x.remove());
  const old = st.parentNode.querySelector('.pop'); if (old) old.remove();
  if (!ST.sel || ST.sel.kind !== 'item') return;
  const s = st.querySelector('.slide'); if (!s) return;
  const paths = multiPaths();
  if (paths.length > 1) {
    const host = st.parentNode; host.style.position = 'relative';
    const sr = s.getBoundingClientRect(), k = 960 / sr.width, hr = host.getBoundingClientRect();
    let gx0 = 1e9, gy0 = 1e9, gx1 = -1e9;
    for (const pth of paths) {
      const key = JSON.stringify(pth);
      const els = [...s.querySelectorAll('[data-item]')].filter(x => x.dataset.item === key); if (!els.length) continue;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const e of els) { const r = e.getBoundingClientRect(); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
      const o = el('div', { class: 'itsel multi' }); o.style.cssText = `left:${(x0 - sr.left) * k - 6}px;top:${(y0 - sr.top) * k - 6}px;width:${(x1 - x0) * k + 12}px;height:${(y1 - y0) * k + 12}px`; s.append(o);
      gx0 = Math.min(gx0, x0); gy0 = Math.min(gy0, y0); gx1 = Math.max(gx1, x1);
    }
    const pop = el('div', { class: 'pop' });
    const B = (t, ic, act, title) => el('button', { title: title || '', onmousedown: e => { e.preventDefault(); groupAct(act); } }, ic ? el('span', { html: ico(ic, '#fff', 13) }) : '', t);
    pop.append(el('span', { class: 'abT' }, paths.length + ' عناصر'), B('', 'up', 'up', 'قبل'), B('', 'down', 'down', 'بعد'), B('أيقونات', 'star', 'icons'), B('بدون أيقونات', '', 'noicons'), B('تكرار', 'copy', 'dup'), B('حذف', 'trash', 'del'));
    pop.style.left = Math.max(4, Math.min(hr.width - 470, ((gx0 + gx1) / 2 - hr.left) - 200)) + 'px';
    pop.style.top = Math.max(-6, (gy0 - hr.top) - 44) + 'px';
    host.append(pop);
    return;
  }
  const key = JSON.stringify(ST.sel.path);
  const els = [...s.querySelectorAll('[data-item]')].filter(x => x.dataset.item === key);
  if (!els.length) return;
  const sr = s.getBoundingClientRect(), k = 960 / sr.width;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const e of els) { const r = e.getBoundingClientRect(); x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
  const o = el('div', { class: 'itsel' });
  o.style.cssText = `left:${(x0 - sr.left) * k - 6}px;top:${(y0 - sr.top) * k - 6}px;width:${(x1 - x0) * k + 12}px;height:${(y1 - y0) * k + 12}px`;
  s.append(o);
  // floating toolbar
  const path = ST.sel.path, i = ST.act, slide = ST.model.slides[i];
  const arr = getAt(slide, path.slice(0, -1)), idx = path[path.length - 1];
  const isArr = Array.isArray(arr) && typeof idx === 'number';
  const it = getAt(slide, path);
  const pop = el('div', { class: 'pop' });
  if (it && typeof it === 'object') pop.append(el('button', { onmousedown: e => { e.preventDefault(); const r = o.getBoundingClientRect(); setTimeout(() => openIconPop(path, r), 0); } }, el('span', { html: ico('star', '#fff', 13) }), 'أيقونة'));
  if (isArr) {
    pop.append(el('button', { title: 'قبل', onmousedown: e => { e.preventDefault(); moveItem(path, -1); } }, el('span', { html: ico('up', '#fff', 13) })));
    pop.append(el('button', { title: 'بعد', onmousedown: e => { e.preventDefault(); moveItem(path, 1); } }, el('span', { html: ico('down', '#fff', 13) })));
    pop.append(el('button', { onmousedown: e => { e.preventDefault(); pushUndo(); arr.splice(idx + 1, 0, clone(arr[idx])); ST.sel = { kind: 'item', path: path.slice(0, -1).concat(idx + 1) }; refreshSlide(i); } }, el('span', { html: ico('copy', '#fff', 13) }), 'تكرار'));
    pop.append(el('button', { onmousedown: e => { e.preventDefault(); pushUndo(); arr.splice(idx, 1); ST.sel = null; refreshSlide(i); } }, el('span', { html: ico('trash', '#fff', 13) }), 'حذف'));
  }
  const host = st.parentNode; host.style.position = 'relative';
  const hr = host.getBoundingClientRect();
  pop.style.left = Math.max(4, Math.min(hr.width - 280, ((x0 + x1) / 2 - hr.left) - 120)) + 'px';
  pop.style.top = Math.max(-6, (y0 - hr.top) - 44) + 'px';
  host.append(pop);
}
function moveItem(path, d) {
  const slide = ST.model.slides[ST.act];
  const arr = getAt(slide, path.slice(0, -1)), k = path[path.length - 1], j = k + d;
  if (!Array.isArray(arr) || j < 0 || j >= arr.length) return;
  pushUndo(); [arr[k], arr[j]] = [arr[j], arr[k]];
  ST.sel = { kind: 'item', path: path.slice(0, -1).concat(j) };
  refreshSlide(ST.act);
}
function setIcon(path, name) {
  const slide = ST.model.slides[ST.act];
  const it = getAt(slide, path);
  if (!it || typeof it !== 'object') return toast('هذا العنصر ما يقبل أيقونة');
  pushUndo(); it.icon = 'lib:' + name; delete it.autoIcon;
  closePops(); refreshSlide(ST.act);
}
function closePops() { $$('.ipop').forEach(x => x.remove()); }
function itemText(it) { return typeof it === 'string' ? it : [it.title, it.label, it.text, (it.bullets || []).join(' ')].filter(Boolean).join(' '); }

/* any floating window can be moved by its header (so it never hides what you are working on) */
function makeDraggable(box, handle) {
  handle.classList.add('dragH');
  let st = null, dx = 0, dy = 0;
  handle.addEventListener('pointerdown', e => {
    if (e.target.closest('button,input,select,textarea')) return;
    e.preventDefault(); handle.setPointerCapture(e.pointerId);
    st = { x: e.clientX - dx, y: e.clientY - dy };
  });
  handle.addEventListener('pointermove', e => {
    if (!st) return;
    const r = box.getBoundingClientRect();
    let nx = e.clientX - st.x, ny = e.clientY - st.y;
    // keep at least the header on screen
    const bx = r.left - dx, by = r.top - dy;
    nx = Math.min(innerWidth - bx - 80, Math.max(-bx - r.width + 80, nx));
    ny = Math.min(innerHeight - by - 40, Math.max(-by, ny));
    dx = nx; dy = ny; box.style.transform = `translate(${dx}px,${dy}px)`;
  });
  const end = () => { st = null; };
  handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
}
function openIconPop(path, rect) {
  closePops();
  const slide = ST.model.slides[ST.act], it = getAt(slide, path);
  if (!it || typeof it !== 'object') return;
  const box = el('div', { class: 'ipop' });
  const inp = el('input', { placeholder: 'ابحث: طائرة، أمن، وقت، plane…' });
  const grid = el('div', { class: 'igrid' });
  const fill = list => { grid.innerHTML = ''; for (const n of list) if (ICONS[n]) grid.append(el('button', { title: n, onclick: () => setIcon(path, n) }, el('img', { src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(n, ICONS, '0A1F44')) }))); };
  const sug = suggestIcons(itemText(it), ICONS, 18);
  fill(sug.length ? sug.concat(FIRST.filter(n => !sug.includes(n))).slice(0, 48) : FIRST);
  inp.oninput = () => fill(inp.value.trim() ? searchIcons(inp.value, ICONS, 120) : sug.concat(FIRST));
  const hdr = el('div', { class: 'ipH', title: 'اسحب من هنا لتحريك النافذة' }, el('span', { class: 'grip' }, '⠿'), el('b', { style: 'flex:1' }, 'اختر أيقونة'), el('button', { class: 'x', onclick: closePops }, '×'));
  makeDraggable(box, hdr);
  box.append(hdr,
    el('div', { class: 'srch', style: 'margin-top:8px' }, el('span', { html: ico('search', '#9aa5b8') }), inp), grid,
    it.icon ? el('button', { class: 'lnk', style: 'color:#D9534F', onclick: () => { pushUndo(); delete it.icon; it.noIcon = true; closePops(); refreshSlide(ST.act); } }, 'إزالة الأيقونة') : '');
  document.body.append(box);
  const x = Math.min(innerWidth - 316, Math.max(8, rect.left + rect.width / 2 - 150)), y = Math.min(innerHeight - 340, rect.bottom + 8);
  box.style.left = x + 'px'; box.style.top = y + 'px';
  setTimeout(() => inp.focus(), 30);
}
document.addEventListener('mousedown', e => { const p = $('.ipop'); if (p && !p.contains(e.target)) closePops(); });

/* ---------- images ---------- */
let imgN = 0;
function pickFiles(multi) {
  return new Promise(res => {
    const inp = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', multiple: multi });
    inp.onchange = async () => {
      const ids = [];
      for (const f of inp.files) {
        let bytes = new Uint8Array(await f.arrayBuffer());
        let ext = (f.type.split('/')[1] || 'png').replace('jpg', 'jpeg');
        if (ext === 'webp') { bytes = await toPng(bytes, f.type); ext = 'png'; }
        const id = 'u' + (++imgN) + Date.now().toString(36);
        ST.assets[id] = { kind: 'image', bytes, ext, size: imgSize(bytes, ext) };
        if (ST.assets[id].size && Math.min(ST.assets[id].size.w, ST.assets[id].size.h) < 500) ST.assets[id].lowres = true;
        ids.push(id);
      }
      res(ids);
    };
    inp.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.append(inp);
    inp.addEventListener('change', () => setTimeout(() => inp.remove(), 1000));
    inp.click();
  });
}
function toPng(bytes, type) { return new Promise(r => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); c.toBlob(async b => r(new Uint8Array(await b.arrayBuffer())), 'image/png'); }; im.src = URL.createObjectURL(new Blob([bytes], { type })); }); }
function applyImage(i, prim, id) {
  const slide = ST.model.slides[i];
  pushUndo();
  if (prim && prim.item && getAt(slide, prim.item) && typeof getAt(slide, prim.item) === 'object') getAt(slide, prim.item).img = id;
  else if (prim && prim.imgRef && getAt(slide, prim.imgRef)) getAt(slide, prim.imgRef).img = id;
  else {
    // the photo slot the user clicked (1st, 2nd …): keep the others exactly as they look now
    const k = prim && prim.phk != null ? prim.phk : 0;
    slide.sections = slide.sections || [];
    const imgs = slide.sections.filter(x => x.kind === 'image');
    if (imgs[k]) imgs[k].img = id;
    else {
      const shown = ((ST.layouts[i] || {}).prims || []).filter(p => p.k === 'image' && p.phk != null).sort((a, b) => a.phk - b.phk);
      while (imgs.length < k) { const cur = shown.find(p => p.phk === imgs.length); const sec = { kind: 'image', img: cur ? cur.asset : id }; slide.sections.push(sec); imgs.push(sec); }
      slide.sections.push({ kind: 'image', img: id });
    }
  }
  ST.act = i; refreshSlide(i); renderSide();
  toast('تم تغيير الصورة');
}
function openImagePicker({ i, prim }) {
  closePops();
  const body = el('div');
  const own = prim && (prim.imgRef || prim.item) && !prim.stock;
  body.append(el('div', { style: 'display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap' },
    el('button', { class: 'btn pri sm', onclick: async () => { const ids = await pickFiles(false); if (ids[0]) { ov.remove(); applyImage(i, prim, ids[0]); } } }, el('span', { html: ico('upload', '#fff') }), 'صورة من جهازك'),
    own && prim.imgRef ? el('button', { class: 'btn ghost sm', onclick: () => { ov.remove(); pushUndo(); const sl = ST.model.slides[i]; sl.sections.splice(prim.imgRef[1], 1); refreshSlide(i); } }, 'إزالة الصورة') : ''));
  if (PL.list.length) { body.append(el('div', { class: 'note', style: 'margin-bottom:10px' }, 'من مكتبة صوري:')); const mg = el('div', { class: 'pgrid', style: 'grid-template-columns:repeat(4,1fr);margin-bottom:14px' }); PL.list.forEach(p => mg.append(el('button', { onclick: () => { ov.remove(); applyImage(i, prim, p.id); } }, el('img', { src: assetUrl(p.id) })))); body.append(mg); }
  body.append(el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px' }, el('button', { class: 'btn ghost sm', onclick: () => { ov.remove(); openPhotoLib(); } }, 'مكتبة صوري…'), el('button', { class: 'btn ghost sm', style: 'border-color:#13B5B0;color:#0E8F8B', onclick: () => { ov.remove(); openImagePrompt(i, prim); } }, '✦ اصنع صورة بكوبيلوت')));
  body.append(el('div', { class: 'note', style: 'margin-bottom:10px' }, 'أو اختر من مكتبة صور الهوية:'));
  const g = el('div', { class: 'pgrid', style: 'grid-template-columns:repeat(4,1fr)' });
  STOCK_IDS.forEach(id => g.append(el('button', { onclick: () => { ov.remove(); applyImage(i, prim, id); } }, el('img', { src: assetUrl(id) }))));
  body.append(g);
  const ov = modal(prim ? 'تغيير الصورة' : 'إضافة صورة للشريحة', body);
}




/* alignment for the text box being edited: right / centre / left / automatic */
function showAlignBar(box, i, key) {
  $$('.alignBar').forEach(x => x.remove());
  const s = ST.model.slides[i]; const cur = (s.tAlign || {})[key] || '';
  const bar = el('div', { class: 'pop alignBar' });
  const set = v => { pushUndo(); s.tAlign = s.tAlign || {}; if (v) s.tAlign[key] = v; else delete s.tAlign[key]; bar.remove(); refreshSlide(i); };
  const b = (v, t, svg) => el('button', { class: cur === v ? 'on' : '', title: t, onmousedown: e => { e.preventDefault(); set(v); } }, el('span', { html: svg }), t);
  const L = (a) => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round">${a}</svg>`;
  bar.append(el('span', { class: 'abT' }, 'محاذاة النص:'),
    b('r', 'يمين', L('<path d="M4 6h16M10 12h10M6 18h14"/>')),
    b('c', 'وسط', L('<path d="M4 6h16M7 12h10M5 18h14"/>')),
    b('l', 'يسار', L('<path d="M4 6h16M4 12h10M4 18h14"/>')),
    b('', 'تلقائي', L('<path d="M4 12a8 8 0 1 0 3-6.3M4 4v4h4"/>')),
    lang() === 'bi' ? el('button', { class: OPT.enLeft ? 'on' : '', title: 'لكل العرض', onmousedown: e => { e.preventDefault(); OPT.enLeft = !OPT.enLeft; save(); bar.remove(); relayout(); render(); toast(OPT.enLeft ? 'الأسطر الإنجليزية صارت تبدأ من اليسار في كل العرض' : 'الأسطر الإنجليزية ترجع تتبع العربي'); } }, 'الإنجليزي من اليسار') : '');
  const st = curStage(); if (!st) return;
  const host = st.parentNode, hr = host.getBoundingClientRect(), r = box.getBoundingClientRect();
  bar.style.left = Math.max(4, Math.min(hr.width - 330, r.left - hr.left)) + 'px';
  bar.style.top = Math.min(hr.height - 40, r.bottom - hr.top + 6) + 'px';
  host.append(bar);
}

/* ---------- chart <-> numbers / table ---------- */
function chartState(i) {
  const s = ST.model.slides[i]; if (!s || s.type !== 'content') return null;
  const r = ST.layouts[i];
  if (r && r.prims && r.prims.some(p => p.k === 'nchart')) return 'on';
  return themeCandidates(s, ST.theme, lang(), OPT).some(x => /-(chart|tabchart)$/.test(x.id)) ? 'off' : null;
}
function toggleChart(i) {
  const s = ST.model.slides[i], st = chartState(i);
  const c = themeCandidates(s, ST.theme, lang(), OPT);
  if (!st) return toast('ما فيه أرقام تصلح لشارت هنا — الأرقام لازم تكون بنفس الوحدة (مثلاً كلها نسب مئوية)', 4500);
  const pick = st === 'on' ? c.find(x => !/-(chart|chart2|tabchart)$/.test(x.id)) : c.find(x => /-(chart|tabchart)$/.test(x.id));
  if (!pick) return toast('هذا المحتوى له شكل واحد مناسب');
  pushUndo(); s.layout = pick.id; ST.sel = null; refreshSlide(i); renderSide();
  if (ST.mode === 'detail') renderBar(c, c.findIndex(x => x.id === pick.id), pick.name);
  toast(st === 'on' ? 'رجعت الأرقام كأرقام' : 'صارت شارت — اضغط عليه لتعديل الأرقام');
}

/* ---------- chart numbers editor ---------- */
function openChartEditor(i, spec) {
  const slide = ST.model.slides[i];
  const body = el('div');
  const setAt = (o, path, v) => { const last = path[path.length - 1]; const par = getAt(o, path.slice(0, -1)); if (par) par[last] = v; };
  let rowsIn = [];
  body.append(el('p', { class: 'note', style: 'margin:0 0 10px' }, 'عدّل الأسماء والأرقام، والشارت يتحدث مباشرة. الشارت في ملف PowerPoint قابل للتعديل كذلك («تحرير البيانات»).'));
  const tb = el('table', { style: 'width:100%;border-collapse:collapse;direction:rtl' });
  const inp = (v, w) => el('input', { value: v == null ? '' : v, style: `width:${w || '100%'};border:1px solid var(--line);border-radius:8px;padding:6px 8px;font-size:14px` });
  if (spec.from === 'table') {
    const sec = slide.sections[spec.si];
    rowsIn = sec.rows.map(r => r.map(c => inp(c)));
    rowsIn.forEach((r, ri) => tb.append(el('tr', {}, ...r.map(x => el('td', { style: 'padding:3px' }, x)))));
  } else {
    for (let k = 0; k < spec.refs.length; k += 2) {
      const vr = spec.refs[k], lr = spec.refs[k + 1];
      const a = inp(getAt(slide, lr)), b = inp(getAt(slide, vr), '120px');
      rowsIn.push([lr, a, vr, b]);
      tb.append(el('tr', {}, el('td', { style: 'padding:3px' }, a), el('td', { style: 'padding:3px;width:130px' }, b)));
    }
  }
  body.append(tb);
  const save = el('button', { class: 'btn pri sm', onclick: () => {
    pushUndo();
    if (spec.from === 'table') slide.sections[spec.si].rows = rowsIn.map(r => r.map(x => x.value.trim()));
    else rowsIn.forEach(([lr, a, vr, b]) => { setAt(slide, lr, a.value.trim()); setAt(slide, vr, b.value.trim()); });
    ov.remove(); refreshSlide(i); renderSide();
    if (ST.layouts[i] && !ST.layouts[i].prims.some(p => p.k === 'nchart')) toast('الأرقام صارت مختلفة الوحدات، فرجعت لشكل الأرقام — وحّد الوحدة لترجع للشارت');
  } }, 'حفظ');
  const ov = modal('أرقام الشارت', body, save);
}


/* =========================================================
   اصنع صورة بكوبيلوت — a detailed prompt for the exact photo slot
   ========================================================= */
const TOD = [['fajr', 'الفجر', 'soft blue-hour dawn light just before sunrise, gentle pastel sky'], ['morning', 'الضحى', 'clear morning daylight, soft warm side light'], ['noon', 'الظهر', 'bright midday daylight, crisp but not harsh, natural contrast'], ['asr', 'العصر', 'warm late-afternoon light, long soft shadows'], ['maghrib', 'المغرب', 'golden-hour sunset light, warm glow on the architecture, soft orange-blue sky'], ['dusk', 'الغسق', 'dusk twilight, deep blue sky with the terminal lights starting to glow'], ['isha', 'العشاء', 'early evening, interior lights on, calm blue-hour exterior'], ['night', 'الليل', 'night scene, warm interior lighting, clean dark sky, no light pollution haze']];
function openImagePrompt(i, prim) {
  const slide = ST.model.slides[i];
  const w = prim ? prim.w : 960, h = prim ? prim.h : 540, r = w / h;
  const shape = r > 1.25 ? 'landscape' : r < 0.8 ? 'portrait' : 'square', shapeAr = r > 1.25 ? 'عرضية' : r < 0.8 ? 'طولية' : 'مربعة';
  const ratio = r > 1.6 ? '16:9' : r > 1.25 ? '3:2' : r < 0.6 ? '9:16' : r < 0.8 ? '3:4' : '1:1';
  const topic = [slide.title, slide.subtitle].filter(Boolean).join(' — ');
  const hints = suggestIcons(JSON.stringify(slide.sections || []) + ' ' + topic, ICONS, 5).map(n => n.replace(/^(tb|jed)-/, '').replace(/-/g, ' ')).join(', ');
  const overlay = prim && prim.w >= 900;
  let tod = 'maghrib';
  const body = el('div', { class: 'ipr' });
  body.append(el('p', { class: 'note', style: 'margin:0 0 10px' }, `الصورة لمكان ${shapeAr} في الشريحة (${ratio}). اختر وقت الإضاءة، وخذ البرومبت الجاهز أو اكتب بنفسك، ثم الصقه في كوبيلوت.`));
  const tsel = el('div', { class: 'seg tod' });
  TOD.forEach(([k, n]) => tsel.append(el('button', { class: k === tod ? 'on' : '', onclick: e => { tod = k; $$('.tod button').forEach(b => b.classList.toggle('on', b === e.target)); upd(); } }, n)));
  body.append(el('b', {}, 'وقت الإضاءة'), tsel);
  const tabs = el('div', { class: 'seg', style: 'margin-top:12px' });
  const ready = el('textarea', { style: 'min-height:190px;direction:ltr;text-align:left;font-family:monospace;font-size:12.5px' });
  const own = el('textarea', { style: 'min-height:120px', placeholder: 'اكتب وصف الصورة اللي تبيها بكلامك — بالعربي أو الإنجليزي. مثال: صالة الحجاج وقت المغرب، مسافرين يمشون بهدوء، بدون شعارات.' });
  let mode = 'ready';
  const tb = (k, n) => el('button', { class: k === mode ? 'on' : '', onclick: e => { mode = k; [...tabs.children].forEach(b => b.classList.toggle('on', b === e.target)); ready.classList.toggle('hidden', k !== 'ready'); own.classList.toggle('hidden', k !== 'own'); } }, n);
  tabs.append(tb('ready', 'برومبت جاهز ومفصل'), tb('own', 'أكتب بنفسي'));
  own.classList.add('hidden');
  body.append(tabs, ready, own);
  const upd = () => {
    const light = TOD.find(t => t[0] === tod)[2];
    ready.value = [
      `Create a photorealistic editorial photograph for a Jeddah Airports (King Abdulaziz International Airport, Saudi Arabia) corporate presentation slide.`,
      `Slide topic (Arabic): «${topic}». Show it visually${hints ? ` — think of: ${hints}` : ''}.`,
      `Setting: the modern KAIA terminal architecture — large clean spaces, natural materials, elegant structure. Do NOT show a generic air-traffic control tower.`,
      `Lighting: ${light}.`,
      `Look: ARRI Alexa cinematic look, true-to-life natural colours, no oversaturation, realistic materials, soft realistic shadows and reflections, no exaggerated gloss or wet floors.`,
      `People (if any): natural and respectful, modest Saudi / Gulf attire where suitable, faces natural and undistorted.`,
      `Composition: ${shape} ${ratio}${overlay ? ', keep a calm darker area on the right side for overlaid white Arabic text' : ''}.`,
      `No text, no logos, no brand marks, no watermarks.`
    ].join('\n');
  };
  upd();
  const keep = el('input', { type: 'checkbox', checked: true });
  const copyIt = async () => { const t = mode === 'ready' ? ready.value : own.value.trim(); if (!t) return toast('اكتب وصف الصورة أولاً'); try { await navigator.clipboard.writeText(t); toast('نسخت البرومبت — الصقه في كوبيلوت (Ctrl+V)'); } catch (e) { (mode === 'ready' ? ready : own).select(); document.execCommand('copy'); toast('نسخت البرومبت'); } };
  const foot = el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;width:100%' },
    el('button', { class: 'btn ghost sm', onclick: copyIt }, 'نسخ البرومبت'),
    el('a', { class: 'btn ghost sm', href: 'https://m365.cloud.microsoft/chat', target: '_blank', rel: 'noopener', onclick: () => copyIt() }, 'نسخ وفتح كوبيلوت ↗'),
    el('span', { style: 'flex:1' }),
    el('label', { class: 'note', style: 'display:flex;gap:6px;align-items:center;margin:0' }, keep, 'احفظها في مكتبة صوري'),
    el('button', { class: 'btn pri sm', onclick: async () => {
      const ids = await pickFiles(false); if (!ids[0]) return;
      const id = ids[0];
      if (keep.checked) { try { if (!PL.db) PL.db = await plDB(); const a = ST.assets[id]; if (PL.db && a) { const mid = 'my:' + Date.now().toString(36); await plPut({ id: mid, name: slide.title || 'صورة', tags: topic, bytes: a.bytes.buffer.slice(0), w: (a.size || {}).w || 1600, h: (a.size || {}).h || 900 }); ST.assets[mid] = Object.assign({}, a, { mine: true }); PL.list.push({ id: mid, name: slide.title || 'صورة', tags: topic }); } } catch (e) { } }
      ov.remove(); applyImage(i, prim, id);
    } }, 'ارفع الصورة اللي طلعت'));
  const ov = modal('اصنع صورة بكوبيلوت', body, foot);
}


/* ---------- what's new: every new feature with a button to try it ---------- */
function openNews() {
  const need = fn => () => { if (!ST.model) return toast('افتح عرض أولاً'); ov.remove(); fn(); };
  const rows = [
    ['قصة العرض', 'رتّب الشرائح بالسحب، وأضف أجندة و«أبرز ما في العرض» و«المطلوب منكم» من نصوصك.', need(openStory)],
    ['ملفاتي', 'كل عرض ينحفظ تلقائيًا في هذا الجهاز — ارجع له وقت ما تبي (Ctrl+S للحفظ الفوري).', () => { ov.remove(); openFiles(); }],
    ['مكتبة صوري', 'ارفع صورك مرة وحدة، والأداة تختار لكل شريحة الصورة اللي تناسب كلامها.', () => { ov.remove(); openPhotoLib(); }],
    ['اصنع صورة بكوبيلوت', 'برومبت جاهز ومفصل لمكان الصورة بالضبط، مع وقت الإضاءة — أو اكتب بنفسك.', need(() => openImagePrompt(ST.act))],
    ['أيقونات ذكية', 'تقرا كل نقطة وتعطيها أيقونة تناسبها — وزر لإزالتها من الشريحة.', need(() => reIcon(ST.act))],
    ['حوّل لشارت', 'الأرقام اللي بنفس الوحدة تصير شارت PowerPoint حقيقي — اضغط عليه لتعديل الأرقام.', need(() => toggleChart(ST.act))],
    ['عرض من الجوال', 'اعرض بالسحب وملاحظاتك تحت الشريحة.', need(() => isPhone() ? phoneShow() : startShow())],
    ['الوضع الداكن', 'لمبة معلّقة: اسحب حبلها للإضاءة، وحرّكها يمين ويسار.', () => { ov.remove(); setDark(!LAMP.dark); }],
    ['تحديد متعدد', 'Shift + ضغطة: يحدد كل العناصر بين الاثنين. Ctrl/⌘ + ضغطة: تختار عنصر عنصر. بعدها حرّكهم أو كرّرهم أو احذفهم أو أعطهم أيقونات دفعة وحدة.', null],
    ['محاذاة النص', 'اضغط على أي نص في الشريحة ويطلع لك شريط: يمين / وسط / يسار — و«الإنجليزي من اليسار» للعروض الثنائية.', null],
    ['أفكار شرائح جديدة', 'قبل وبعد، خط زمني بتواريخ كبيرة، درجات صاعدة، قائمة مرقمة، نقطة رئيسية، أرقام على صورة، رسالة + أعمدة — تطلع مع «فكرة جديدة» والأسهم.', null],
  ];
  const body = el('div', { class: 'news' });
  for (const [t, d, fn] of rows) body.append(el('div', { class: 'nrow' }, el('div', {}, el('b', {}, t), el('span', {}, d)), fn ? el('button', { class: 'btn ghost sm', onclick: fn }, 'جرّب') : ''));
  const ov = modal('الجديد في صانع العروض · ' + APP_VER, body);
}

/* ---------- modal ---------- */
function modal(title, body, foot) {
  const ov = el('div', { class: 'ov', onclick: e => { if (e.target === ov) ov.remove(); } });
  const mdh = el('div', { class: 'mdh', title: 'اسحب من هنا لتحريك النافذة' }, el('span', { class: 'grip' }, '⠿'), el('h3', {}, title), el('button', { class: 'x', onclick: () => ov.remove() }, '×'));
  const md = el('div', { class: 'md' }, mdh, el('div', { class: 'mdb' }, body), foot ? el('div', { class: 'mdf' }, foot) : null);
  makeDraggable(md, mdh);
  ov.append(md);
  document.body.append(ov); return ov;
}

const closingFor = lg => lg === 'en' ? { type: 'closing', title: 'Thank You' } : lg === 'bi' ? { type: 'closing', title: 'شكرًا لكم', title_en: 'Thank You' } : { type: 'closing', title: 'شكرًا لكم' };
/* ---------- reading files ---------- */
$('#fIn').onchange = e => { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; };
async function openFile(f) {
  ST.fileId = null;
  const isDoc = /\.docx$/i.test(f.name), isPpt = /\.pptx$/i.test(f.name);
  if (!isDoc && !isPpt) return toast('الملف لازم يكون Word (.docx) أو PowerPoint (.pptx)');
  const done = busy('أقرأ الملف وأفرز المحتوى…');
  try {
    await FONTS_P.catch(() => { });
    const buf = new Uint8Array(await f.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);
    let model, assets, srcText = [], parsed = null;
    if (isDoc) {
      const r = await readDocx(zip, { parser: new DOMParser(), name: f.name.replace(/\.docx$/i, '') });
      model = r.model; assets = r.assets; srcText = r.blocks.flatMap(b => b.rows ? b.rows.flat() : [b.t || '']).filter(Boolean);
    } else {
      parsed = await parsePptx(zip);
      if (isDocLike(parsed)) { const r = readPptxAsDoc(parsed, { name: f.name.replace(/\.pptx$/i, '') }); model = r.model; assets = {}; }
      else { const r = analyzeDeck(parsed); model = r.model; assets = r.assets; await prepareAssets(assets, parsed); }
      try { srcText = parsed.slides.flatMap(s => (s.els || []).filter(e => e.paras).flatMap(e => e.paras.map(p => p.text))).filter(Boolean); } catch (e) { srcText = []; }
    }
    for (const k of Object.keys(ST.assets)) if (!k.startsWith('stock:')) delete ST.assets[k];
    Object.assign(ST.assets, assets);
    ST.parsed = parsed;
    ST.naming = OPT.naming ? applyNaming(model) : { changes: [], flags: [] };
    if (OPT.autoIcons) autoIconize(model, ICONS);
    for (const s of model.slides) for (const sec of s.sections || []) if (sec.items && sec.items.length && sec.items.every(x => x && x.highlight)) sec.items.forEach(x => { if (typeof x === 'object') delete x.highlight; });
    if (OPT.closing && !model.slides.some(s => s.type === 'closing')) model.slides.push(closingFor(model.lang));
    ST.src = { kind: isDoc ? 'docx' : 'pptx', name: f.name, text: srcText, bytes: buf };
    ST.name = f.name.replace(/\.(docx|pptx)$/i, '');
    ST.orig = model; ST.rewritten = null;
    ST.model = clone(model); ST.act = 0; ST.sel = null; ST.undo = []; ST.redo = []; ST.translated = null;
    if (ST.mode === 'simple') { relayout(true); ST.how = ST.how || 'keep'; renderS2(); }
    else { ST.base = clone(model); ST.seed = 1; designFrom(ST.base, 1); ST.built = true; render(); }
    toast('تم: ' + model.slides.length + ' شريحة');
  } catch (e) { console.error(e); toast('تعذر قراءة الملف: ' + e.message, 5000); }
  done();
}
function newBlank(lg) {
  ST.fileId = null;
  const ar = lg !== 'en';
  ST.model = { lang: lg, slides: [
    { type: 'cover', title: ar ? 'عنوان العرض' : 'Presentation Title', subtitle: ar ? 'العنوان الفرعي' : 'Subtitle', lines: [] },
    placeholderize(SAMPLES.ar[3], lg),
    { type: 'closing', title: ar ? 'شكرًا لكم' : 'Thank You' }] };
  if (lg === 'bi') ST.model.slides.forEach(addEnPlaceholders);
  ST.base = null;
  ST.src = null; ST.name = lg === 'ar' ? 'عرض جديد' : 'New deck'; ST.naming = { changes: [], flags: [] };
  ST.act = 0; ST.sel = null; ST.undo = []; ST.redo = [];
  relayout(true);
}
function summary(m) {
  const sl = m.slides;
  const n = { slides: sl.length, divs: sl.filter(s => s.type === 'divider').length, nums: 0, imgs: 0 };
  for (const s of sl) for (const sec of s.sections || []) { if (sec.kind === 'kpis') n.nums += (sec.items || []).length; (sec.items || []).forEach(it => { if (it && it.value) n.nums++; }); if (sec.kind === 'image') n.imgs++; }
  return n;
}

/* ---------- placeholders for "add slide" ---------- */
function placeholderize(s, lg) {
  const ar = lg !== 'en';
  const c = clone(s);
  let n = 0;
  const T = { title: ar ? 'عنوان' : 'Title', text: ar ? 'اكتب هنا نصًا قصيرًا يوضح الفكرة' : 'A short line that explains the idea', bul: ar ? 'نقطة مختصرة' : 'A short point' };
  const walk = (o, key) => {
    if (Array.isArray(o)) return o.map(x => typeof x === 'string' ? (key === 'rows' ? x : T.bul) : walk(x, key));
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) {
        if (typeof o[k] === 'string') {
          if (['kind', 'icon', 'img', 'layout', 'type'].includes(k)) continue;
          if (k === 'value') continue;
          if (k === 'date') o[k] = ar ? 'المرحلة ' + (++n) : 'Phase ' + (++n);
          else if (k === 'text') o[k] = T.text;
          else if (k === 'heading') o[k] = ar ? 'عنوان القسم' : 'Section';
          else o[k] = T.title;
        } else if (k === 'rows') o[k] = o[k].map((r, ri) => r.map(x => ri ? (parseNum(x) ? x : '…') : T.title));
        else o[k] = walk(o[k], k);
      }
    }
    return o;
  };
  walk(c);
  c.title = ar ? 'عنوان الشريحة' : 'Slide title';
  if (c.subtitle) c.subtitle = ar ? 'عنوان فرعي' : 'Subtitle';
  if (c.type === 'agenda') c.items.forEach((it, i) => { it.title = (ar ? 'البند ' : 'Item ') + (i + 1); delete it.sub; });
  if (c.type === 'cover') { c.title = ar ? 'عنوان العرض' : 'Presentation title'; c.lines = []; }
  if (c.type === 'divider') c.title = ar ? 'عنوان القسم' : 'Section title';
  if (c.type === 'closing') c.title = ar ? 'شكرًا لكم' : 'Thank You';
  return c;
}
function addEnPlaceholders(o) {
  if (!o || typeof o !== 'object') return o;
  if (Array.isArray(o)) { o.forEach(addEnPlaceholders); return o; }
  for (const k of Object.keys(o)) {
    if (/_en$/.test(k) || ['kind', 'icon', 'img', 'layout', 'type', 'value', 'chart'].includes(k)) continue;
    const v = o[k];
    if (typeof v === 'string' && L_AR.test(v)) o[k + '_en'] = k === 'title' ? (o.type ? 'Slide title' : 'Title') : k === 'subtitle' ? 'Subtitle' : k === 'date' ? 'Phase' : 'Short supporting line';
    else if (Array.isArray(v) && v.length && typeof v[0] === 'string' && k !== 'rows') o[k + '_en'] = v.map(() => 'A short point');
    else if (typeof v === 'object') addEnPlaceholders(v);
  }
  if (o.type === 'closing') o.title_en = 'Thank You';
  if (o.type === 'cover') o.title_en = 'Presentation title';
  return o;
}
function sampleFor(lay) {
  for (const s of SAMPLES.ar) {
    const kind = ['cover', 'agenda', 'divider', 'closing'].includes(s.type) ? s.type : 'content';
    if (kind === lay.type && lay.fit(digest(s), s) > 0) return s;
  }
  return null;
}
let LAYCACHE = {};
function layoutPreviews(theme, lg, real) {
  const key = theme + lg + (real ? 'r' : 'p');
  if (LAYCACHE[key]) return LAYCACHE[key];
  const out = [];
  for (const l of THEMES[theme].layouts) {
    if (l.id.endsWith('-t')) continue;
    const s0 = sampleFor(l); if (!s0) continue;
    const s = real ? clone(s0) : placeholderize(s0, lg);
    if (real) autoIconize({ slides: [s] }, ICONS);
    else copyIcons(s0, s);
    s.layout = l.id;
    const L = layoutThemed(s, lg, OPT, theme, { page: 3, total: 12, divNo: 1 });
    out.push({ id: l.id, name: l.name, slide: s, L, type: l.type });
  }
  return (LAYCACHE[key] = out);
}
function copyIcons(src, dst) {
  const a = clone(src); autoIconize({ slides: [a] }, ICONS);
  (a.sections || []).forEach((sec, i) => (sec.items || []).forEach((it, k) => { if (it && it.icon && dst.sections[i] && dst.sections[i].items && typeof dst.sections[i].items[k] === 'object') dst.sections[i].items[k].icon = it.icon; }));
}
function miniInto(box, w, pv, lg) { drawSlide(box, w, pv.L, { model: { lang: lg, slides: [pv.slide] }, i: 0 }); }

/* ---------- navigation ---------- */
function go(i) { if (!ST.model) return; ST.act = Math.max(0, Math.min(ST.model.slides.length - 1, i)); ST.sel = null; ST.multi = null; closePops(); drawStage(); markThumbs(); renderSide(); }
function alt(d) {
  const s = ST.model.slides[ST.act];
  const c = themeCandidates(s, ST.theme, lang(), OPT);
  if (c.length < 2) return toast('هذا المحتوى له شكل واحد مناسب');
  let k = c.findIndex(x => x.id === s.layout); if (k < 0) k = 0;
  pushUndo();
  s.layout = c[(k + d + c.length) % c.length].id;
  ST.sel = null; refreshSlide(ST.act); renderSide();
}
function setBg(v) { OPT.bg = v; save(); LAYCACHE = {}; if (ST.model) relayout(); render(); }
function setTheme(t) {
  if (!THEMES[t]) return;
  ST.theme = t; save();
  if (ST.model) { ST.model.slides.forEach(s => delete s.layout); relayout(true); }
  render();
}

/* =========================================================
   SIMPLE MODE
   ========================================================= */
const curStage = () => ST.mode === 'simple' ? $('#s3stage') : $('#dStage');
function stageWidth() {
  if (ST.mode === 'simple') { const c = $('#s3stage').parentNode; return Math.max(260, c.clientWidth - (isPhone() ? 16 : 32)); }
  const w = $('#dStageW'); return Math.max(400, Math.min(w.clientWidth - 8, (w.clientHeight - 8) * 960 / 540));
}
function renderS1() {
  const box = $('#themes'); box.innerHTML = '';
  for (const t of THEME_ORDER) {
    const T = THEMES[t];
    const pv = layoutPreviews(t, 'ar', true);
    const pick = ids => ids.map(id => pv.find(x => x.id === id)).filter(Boolean);
    const [big, ...minis] = pick(T.preview);
    const card = el('button', { class: 'th' + (ST.theme === t ? ' on' : ''), onclick: () => { ST.theme = t; save(); renderS1(); } });
    const b = el('div', { class: 'big' }); card.append(b);
    const m = el('div', { class: 'mini' }); if (!isPhone()) minis.forEach(() => m.append(el('div'))); card.append(m);
    card.append(el('div', { class: 'nm' }, el('b', {}, T.name), ST.theme === t ? el('span', { class: 'tick', html: ico('check', '#fff', 14, 3) }) : el('em', {}, el('span', { class: 'num' }, String(T.layouts.filter(l => !l.id.endsWith('-t')).length)), ' تخطيط')));
    card.append(el('p', {}, T.desc));
    box.append(card);
    requestAnimationFrame(() => { miniInto(b, b.clientWidth, big, 'ar'); if (!isPhone()) minis.forEach((x, k) => { const d = m.children[k]; miniInto(d, d.clientWidth, x, 'ar'); }); });
  }
}
function renderS1bg() {
  const b = $('#s1bg'); if (!b) return; b.innerHTML = '';
  for (const [v, n] of [['white', 'أبيض'], ['grey', 'رمادي فاتح جداً']]) b.append(el('button', { class: OPT.bg === v ? 'on' : '', onclick: () => setBg(v) }, n));
}
function renderS2() {
  const fi = $('#fileInfo'), how = $('#howBox');
  if (!ST.src || !ST.orig) { fi.classList.add('hidden'); how.classList.add('hidden'); $('#s2build').disabled = true; return; }
  const n = summary(ST.orig);
  fi.classList.remove('hidden'); fi.innerHTML = '';
  fi.append(el('span', { html: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1E63D6" stroke-width="1.6"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>` }),
    el('div', { class: 't' }, el('b', {}, ST.src.name), el('span', {}, 'قرأت الملف وفرزته إلى')),
    el('div', { class: 'chips' }, el('span', {}, el('span', { class: 'num' }, String(n.slides)), ' شريحة'), n.divs ? el('span', {}, el('span', { class: 'num' }, String(n.divs)), ' أقسام') : '', n.nums ? el('span', {}, el('span', { class: 'num' }, String(n.nums)), ' أرقام') : '', n.imgs ? el('span', {}, el('span', { class: 'num' }, String(n.imgs)), ' صور') : ''),
    el('div', { class: 'seg', style: 'width:250px' }, ...[['ar', 'عربي'], ['en', 'English'], ['bi', 'عربي + English']].map(([v, t]) => el('button', { class: ST.orig.lang === v ? 'on' : '', onclick: () => { ST.orig.lang = v; ST.model.lang = v; if (ST.rewritten) ST.rewritten.lang = v; renderS2(); } }, t))));
  how.classList.remove('hidden');
  $$('.op').forEach(o => o.classList.toggle('on', o.dataset.w === ST.how));
  const cop = $('#copBox');
  cop.classList.toggle('hidden', ST.how !== 'rewrite');
  if (ST.how === 'rewrite') renderCopBox(cop, ST.orig, slides => { ST.rewritten = { lang: ST.orig.lang, slides }; renderS2(); });
  // bilingual deck from a one-language file: offer the English via Copilot (translation only)
  const tb = $('#trBox');
  const needEn = ST.orig.lang === 'bi' && ST.how === 'keep' && ST.orig.slides.some(missingEn);
  tb.classList.toggle('hidden', !needEn);
  if (needEn) { tb.innerHTML = ''; tb.append(el('div', { class: 'note', style: 'margin-bottom:6px' }, 'الملف ما فيه نص إنجليزي كامل. أضف الترجمة عبر Copilot (كلامك العربي يبقى كما هو):')); const bx = el('div', { class: 'cop', style: 'margin:0' }); tb.append(bx); renderCopBox(bx, ST.orig, slides => { ST.translated = { lang: 'bi', slides }; renderS2(); }, 'translate'); if (ST.translated) tb.append(el('div', { class: 'ok', style: 'margin-top:6px' }, '✓ وصلت الترجمة — ' + ST.translated.slides.length + ' شريحة')); }
  $('#s2build').disabled = !(ST.how === 'keep' || (ST.how === 'rewrite' && ST.rewritten));
  renderPbar();
}
/* Copilot in parts: every part has its own copy button and its own paste box; nothing is merged until all parts are back */
const COPI = {};
function renderCopBox(box, model, onOk, mode = 'rewrite') {
  box.innerHTML = '';
  const chunks = chunkSlides(model.slides);
  const key = mode + ':' + chunks.map(c => c.length).join(',') + ':' + model.slides.length;
  const got = COPI[key] = COPI[key] || {};
  const n = chunks.length;
  box.append(el('div', { class: 'note', style: 'margin:0 0 4px' }, n > 1 ? `الملف كبير، فقسمته إلى ${n} أجزاء مرتبة حسب أقسام العرض. لكل جزء: انسخ ← الصق في Copilot ← انسخ رده كامل ← الصقه في خانته.` : 'انسخ الطلب ← الصقه في Copilot ← انسخ رده كامل ← الصقه هنا.'));
  const done = () => Object.keys(got).length === n;
  const status = el('div', { class: 'ok', style: 'margin-top:4px' });
  const upd = fire => { status.textContent = done() ? `✓ وصلت كل الأجزاء — ${chunks.reduce((a, c, k) => a + got[k].length, 0)} شريحة` : (n > 1 ? `وصل ${Object.keys(got).length} من ${n}` : ''); status.style.color = done() ? '' : '#B07A0A'; if (fire && done()) setTimeout(() => onOk(chunks.flatMap((c, k) => got[k])), 0); };
  chunks.forEach((c, k) => {
    const row = el('div', { class: 'row', style: 'align-items:stretch' });
    const mark = el('span', { class: 'ok', style: 'min-width:16px' }, got[k] ? '✓' : '');
    const first = c[0], last = c[c.length - 1];
    const label = n > 1 ? `الجزء ${k + 1} من ${n} · شرائح ${model.slides.indexOf(first) + 1}–${model.slides.indexOf(last) + 1}` : 'الطلب';
    row.append(el('div', { class: 'stp', style: 'flex:0 0 auto;min-width:0' }, el('i', {}, String(k + 1)), label, el('button', { class: 'cp', onclick: e => { e.stopPropagation(); copyText(copilotPrompt(c, k + 1, n, model.lang, mode)); toast(`تم نسخ ${n > 1 ? 'الجزء ' + (k + 1) : 'الطلب'} — الصقه في Copilot`); } }, 'نسخ')));
    const ta = el('textarea', { placeholder: n > 1 ? `الصق رد Copilot للجزء ${k + 1} هنا…` : 'الصق رد Copilot هنا…', onclick: e => e.stopPropagation(), style: 'flex:1;min-height:44px' });
    const err = el('span', { style: 'font-size:12px;color:#D9534F' });
    ta.addEventListener('input', () => {
      try { const r = parseCopilot(ta.value, true); if (r.part && r.part !== k + 1) throw new Error(`هذا رد الجزء ${r.part} مو ${k + 1}`); got[k] = r.slides; mark.textContent = '✓'; err.textContent = ''; ta.value = ''; ta.placeholder = `✓ الجزء ${k + 1}: ${r.slides.length} شريحة`; upd(true); }
      catch (e2) { if (ta.value.trim().length > 30 && /\}\s*`*\s*$/.test(ta.value.trim())) err.textContent = e2.message || 'الرد ناقص — انسخه كامل من Copilot'; }
    });
    row.append(ta, mark);
    box.append(row, err);
  });
  box.append(status); upd();
}
function chunkSlides(slides) {
  const MAX = 8500, size = s => JSON.stringify(compactSlide(s)).length;
  const chunks = []; let cur = [], len = 0;
  for (const s of slides.filter(s => !s.skip)) {
    const l = size(s);
    const atBoundary = s.type === 'divider' || s.type === 'closing';
    if (cur.length && (len + l > MAX || (atBoundary && len > MAX * 0.55))) { chunks.push(cur); cur = []; len = 0; }
    cur.push(s); len += l;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}
function compactSlide(s) {
  const drop = ['notes', 'srcIndex', 'layout', '_dropped', 'autoIcon', 'icon', 'highlight', 'skip', 'band', 'width'];
  const walk = o => { if (Array.isArray(o)) return o.map(walk); if (o && typeof o === 'object') { const r = {}; for (const [k, v] of Object.entries(o)) { if (drop.includes(k) || v === '' || v == null || (Array.isArray(v) && !v.length)) continue; r[k] = walk(v); } return r; } return o; };
  return walk(s);
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); } catch (e) { const ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); } }
function copilotPrompt(slides, part, parts, lg, mode = 'rewrite') {
  const data = JSON.stringify({ part, lang: lg, slides: slides.map(compactSlide) });
  const PART = parts > 1 ? `\nهذا الجزء ${part} من ${parts} من نفس العرض. اشتغل على شرائح هذا الجزء فقط، وأرجعها كلها بدون حذف أي شريحة أو معلومة، واكتب في بداية الـ JSON "part": ${part}.` : '';
  const BI = lg === 'bi' ? `\n- العرض ثنائي اللغة: لكل نص عربي أضف حقلاً إنجليزياً مقابلاً بنفس الاسم + "_en" (title_en، subtitle_en، text_en، bullets_en، date_en، heading_en، lines_en). ولقوائم النقاط النصية (bullets) أضف "items_en" بنفس الترتيب. ترجمة إنجليزية مؤسسية احترافية مختصرة.` : '';
  const NAMING = 'التسميات المعتمدة للصالات: «الصالة 1»، «الصالة 4» بدل «الصالة الجنوبية»، «الصالة 3ب (مجمع صالات الحج والعمرة)» بدل «صالات الحج والعمرة». لا تذكر «الصالة الشمالية».';
  const OUT = 'أرجع JSON فقط بنفس البنية {"part":..., "lang":..., "slides":[...]} داخل كتلة كود واحدة، بدون أي شرح ولا اختصار ولا "...". حافظ على قيم "img" و"chart" كما هي حرفياً.' + PART;
  if (mode === 'translate') return `أنت مترجم عروض تنفيذية في شركة مطارات جدة. هذا محتوى عرض تقديمي بصيغة JSON${parts > 1 ? ` (الجزء ${part} من ${parts})` : ''}.
المطلوب: إضافة الترجمة الإنجليزية فقط، بدون تغيير أي نص عربي أو أي بنية.
- لكل نص عربي أضف حقلاً إنجليزياً مقابلاً بنفس الاسم + "_en" (title_en، subtitle_en، text_en، bullets_en، date_en، heading_en، lines_en). ولقوائم النقاط النصية (bullets) أضف "items_en" بنفس الترتيب والعدد.
- إذا كان النص متعدد الأسطر فاجعل الترجمة بنفس عدد الأسطر.
- لا تترجم الأرقام، وانقلها كما هي. ترجمة مؤسسية احترافية مختصرة.
- ${OUT}

${data}`;
  return `أنت مصمم عروض تنفيذية مبدع في شركة مطارات جدة. هذا محتوى عرض تقديمي بصيغة JSON${parts > 1 ? ` (الجزء ${part} من ${parts})` : ''}.
المطلوب: حوّله إلى عرض بصري مقنع للإدارة العليا — ليس نصاً منقولاً، بل قصة واضحة بعناصر بصرية.

طريقة التفكير:
1. فكرة واحدة لكل شريحة، ولا تتجاوز الشريحة 45 كلمة تقريباً. قسّم أي شريحة مزدحمة.
2. استخرج كل رقم أو نسبة إلى شريحة أو قسم أرقام kpis (value قصير + title من 2-5 كلمات).
3. حوّل الفقرات إلى 3-4 بطاقات cards بعناوين قصيرة (2-4 كلمات) ونص سطر واحد، أو إلى مراحل timeline إذا فيها تسلسل زمني، أو مقارنة بين خيارين (بطاقتان بنقاط bullets).
4. ابدأ كل قسم مهم بشريحة رسالة رئيسية feature (جملة قوية واحدة)، وأضف فواصل divider بين الأقسام الكبيرة، وأجندة agenda إذا العرض طويل.
5. عناوين الشرائح قصيرة وجذابة (لا تتجاوز 7 كلمات) بلغة ${lg === 'en' ? 'English corporate style' : 'عربية مؤسسية سليمة'}.
6. لا تغيّر أي رقم أو نسبة أو تاريخ أو اسم علم أو اسم جهة، ولا تضف معلومات غير موجودة. ${NAMING}${BI}

الأنواع المتاحة: الشرائح "type": cover، agenda (items: [{title}])، divider (عنوان فقط)، content، closing. وأقسام المحتوى "kind": cards، kpis، list، feature (item: {title, text})، timeline (items: [{date, title}])، bullets، text، note، table، image، chart. عناصر items تقبل: title, text, value, bullets[], date, label.
${OUT}

${data}`;
}
function parseCopilot(txt, withPart) {
  let part = null;
  const blocks = []; const re = /```(?:json)?\s*([\s\S]*?)```/g; let m;
  while ((m = re.exec(txt))) blocks.push(m[1]);
  if (!blocks.length) { const a = txt.indexOf('{'), b = txt.lastIndexOf('}'); if (a >= 0 && b > a) blocks.push(txt.slice(a, b + 1)); }
  const slides = [];
  for (const b of blocks) { let j; try { j = JSON.parse(b.trim()); } catch (e) { throw new Error('الرد ناقص أو مقطوع — اطلب من Copilot يكمل ثم انسخه كامل'); } if (j.part) part = +j.part; if (Array.isArray(j.slides)) slides.push(...j.slides); else if (Array.isArray(j)) slides.push(...j); }
  if (!slides.length) throw new Error('ما لقيت شرائح في الرد');
  const KIND = ['cards', 'kpis', 'list', 'feature', 'timeline', 'bullets', 'text', 'note', 'table', 'image', 'chart'], TYPES = ['cover', 'agenda', 'divider', 'content', 'closing'];
  const out = slides.filter(s => s && TYPES.includes(s.type)).map(s => {
    if (s.sections) s.sections = s.sections.filter(sec => sec && KIND.includes(sec.kind)).map(sec => {
      if (sec.items && ['cards', 'kpis', 'list', 'timeline'].includes(sec.kind)) sec.items = sec.items.map(it => typeof it === 'string' ? { text: it } : it);
      if (sec.kind === 'bullets') sec.items = (sec.items || []).map(it => typeof it === 'string' ? it : [it.title, it.text].filter(Boolean).join(' — '));
      const strip = it => { if (it && it.icon && !String(it.icon).startsWith('lib:') && !ST.assets[it.icon]) delete it.icon; if (it && it.img && !ST.assets[it.img]) delete it.img; };
      (sec.items || []).forEach(strip); if (sec.item) strip(sec.item);
      if (sec.kind === 'image' && !ST.assets[sec.img]) return null;
      if (sec.kind === 'chart' && !ST.assets[sec.chart]) return null;
      return sec;
    }).filter(Boolean);
    return s;
  });
  if (!out.length) throw new Error('الرد ما فيه شرائح صالحة');
  return withPart ? { slides: out, part } : out;
}
function useRewritten(slides) {
  const notesBy = {}; (ST.orig || ST.model).slides.forEach(s => { if (s.title) notesBy[s.title] = s.notes; });
  slides.forEach(s => { const base = String(s.title || '').replace(/\s*\(\d\)\s*$/, ''); if (!s.notes && notesBy[base]) s.notes = notesBy[base]; });
  if (OPT.autoIcons) autoIconize({ slides }, ICONS);
  if (OPT.closing && !slides.some(s => s.type === 'closing')) slides.push(closingFor(lang()));
  return slides;
}
function renderS3() {
  if (!ST.model) return;
  $('#s3pill').innerHTML = '';
  $('#s3pill').append(el('span', { class: 'num' }, String(ST.model.slides.length)), ' شريحة · ثيم ' + THEMES[ST.theme].name);
  drawThumbs(); drawStage(); renderSide();
}
let lastStep = 0;
function renderSimple() {
  if (lastStep !== ST.step) { lastStep = ST.step; window.scrollTo(0, 0); $('#simple').scrollTop = 0; }
  $$('#simple .scr').forEach(s => s.classList.toggle('hidden', s.id !== 's' + ST.step));
  $$('.st').forEach(s => { const k = +s.dataset.s; s.className = 'st' + (k === ST.step ? ' on' : k < ST.step ? ' done' : ''); });
  if (ST.step === 1) { renderS1(); renderS1bg(); }
  if (ST.step === 2) renderS2();
  if (ST.step === 3) renderS3();
  renderPbar();
}
$$('.st').forEach(b => b.onclick = () => { const k = +b.dataset.s; if (k === 3 && !ST.model) return toast('ارفع الملف أولاً'); ST.step = k; renderSimple(); });
$('#s1next').onclick = () => { ST.step = ST.model && ST.built ? 3 : 2; renderSimple(); };
$('#s2back').onclick = () => { ST.step = 1; renderSimple(); };
$('#s2blank').onclick = () => { newBlank('ar'); ST.built = true; ST.step = 3; renderSimple(); };
$('#drop').addEventListener('dragover', e => { e.preventDefault(); $('#drop').classList.add('over'); });
$('#drop').addEventListener('dragleave', () => $('#drop').classList.remove('over'));
$('#drop').addEventListener('drop', e => { e.preventDefault(); $('#drop').classList.remove('over'); const f = [...(e.dataTransfer.files || [])][0]; if (f) openFile(f); });
$$('.op').forEach(o => o.addEventListener('click', e => { if (e.target.closest('.cop')) return; ST.how = o.dataset.w; renderS2(); }));
$('#s2build').onclick = () => {
  const base = ST.how === 'rewrite' && ST.rewritten ? { lang: ST.orig.lang, slides: useRewritten(clone(ST.rewritten.slides)) } : (ST.translated ? { lang: ST.orig.lang, slides: useRewritten(clone(ST.translated.slides)) } : clone(ST.orig));
  ST.base = clone(base); ST.seed = 1;
  ST.model = designFrom(ST.base, ST.seed); ST.act = 0; ST.sel = null; ST.undo = []; ST.redo = []; ST.built = true;
  ST.step = 3; renderSimple();
};
function designFrom(base, seed, avoid) {
  const m = clone(base);
  if (OPT.creative) creativize(m, seed);
  if (OPT.autoIcons) autoIconize(m, ICONS);
  m.slides.forEach(s => delete s.layout);
  ST.model = m;
  autoAssign(m, ST.theme, true, seed > 1 ? seed : 0, OPT, avoid);
  fitDeck(m, ST.theme, OPT, seed > 1 ? seed : 0);
  ST.layouts = m.slides.map((s, i) => layOne(i)); updateChecks();
  return m;
}
function newIdea() {
  if (!ST.model) return;
  if (!ST.base) ST.base = clone(ST.model);
  pushUndo();
  const u = ST.undo.slice(), act = ST.act;
  ST.seed = (ST.seed || 1) + 1;
  const prev = ST.model.slides.map(s => s.layout);
  designFrom(ST.base, ST.seed, prev);
  const changed = ST.model.slides.filter((s, i) => s.layout !== prev[i]).length;
  ST.undo = u; ST.redo = []; ST.act = Math.min(act, ST.model.slides.length - 1); ST.sel = null;
  renderAfterStructure();
  toast(`فكرة جديدة: تغيّر شكل ${changed} شريحة — اضغط مرة ثانية لفكرة أخرى، أو «تراجع» للرجوع`, 3400);
}
$('#s3theme').onclick = () => { ST.step = 1; renderSimple(); };
$('#s3idea').onclick = $('#bIdea').onclick = () => newIdea();
$('#s3undo').onclick = () => { undo(); };
$('#s3export').onclick = () => exportDeck();
$('#s3next').onclick = () => alt(-1);
$('#s3prev').onclick = () => alt(1);
$('#s3img').onclick = () => openImagePicker({ i: ST.act, prim: null });
$('#s3ic').onclick = () => reIcon(ST.act);
$('#s3chart').onclick = () => toggleChart(ST.act);
$('#s3noic').onclick = () => removeIcons(ST.act);
$('#s3dup').onclick = () => dupSlide(ST.act);
$('#s3del').onclick = () => delSlide(ST.act);
function reIcon(i) {
  const s = ST.model.slides[i];
  pushUndo();
  const had = (s.items || []).some(it => it && it.icon) || (s.sections || []).some(sec => (sec.items || []).concat(sec.item ? [sec.item] : []).some(it => it && it.icon));
  s._icRound = had ? (s._icRound || 0) + 1 : 0;
  const r = smartIcons(s, ICONS, s._icRound || 0);
  if (!r.n) { ST.undo.pop(); return toast('هذه الشريحة ما فيها نقاط تحتاج أيقونات'); }
  // make sure the chosen layout actually shows the icons
  const shows = id => { const keep = s.layout; s.layout = id; const r2 = layoutThemed(s, lang(), OPT, ST.theme, infoFor(i)); s.layout = keep; return r2.layout === id && r2.prims.some(p => p.k === 'icon'); };
  if (!shows(s.layout)) { const c = themeCandidates(s, ST.theme, lang(), OPT); const w = c.find(x => shows(x.id)); if (w) s.layout = w.id; else if (r.converted && c[0]) s.layout = c[0].id; }
  refreshSlide(i); renderSide();
  toast(r.converted ? 'حوّلت النقاط لقائمة بأيقونات تناسب كل نقطة — اضغط مرة ثانية لأيقونات بديلة' : 'اخترت أيقونة تناسب كل نقطة — اضغط مرة ثانية لأيقونات بديلة');
}

function removeIcons(i) {
  const s = ST.model.slides[i]; let n = 0;
  const strip = it => { if (it && typeof it === 'object' && it.icon) { delete it.icon; delete it.autoIcon; it.noIcon = true; n++; } };
  pushUndo();
  (s.items || []).forEach(strip);
  for (const sec of s.sections || []) { (sec.items || []).forEach(strip); if (sec.item) strip(sec.item); }
  if (!n) { ST.undo.pop(); return toast('هذه الشريحة ما فيها أيقونات'); }
  ST.sel = null; refreshSlide(i); renderSide(); toast('شلت ' + n + ' أيقونة من الشريحة');
}
function dupSlide(i) { pushUndo(); ST.model.slides.splice(i + 1, 0, clone(ST.model.slides[i])); ST.act = i + 1; relayout(); renderAfterStructure(); }
function delSlide(i) { if (ST.model.slides.length < 2) return; pushUndo(); ST.model.slides.splice(i, 1); ST.act = Math.max(0, Math.min(i, ST.model.slides.length - 1)); ST.sel = null; relayout(); renderAfterStructure(); }
function moveSlide(i, d) { const a = ST.model.slides, j = i + d; if (j < 0 || j >= a.length) return; pushUndo(); [a[i], a[j]] = [a[j], a[i]]; ST.act = j; relayout(); renderAfterStructure(); }
function renderAfterStructure() { if (ST.mode === 'simple') renderS3(); else renderDetail(); }

/* ---------- thumbs / stage / side (shared) ---------- */
function thumbBox(i) { return ST.mode === 'simple' ? $(`#s3thumbs .thumb[data-i="${i}"] .tb`) : $(`#dFilm .fi[data-i="${i}"] .tb`); }
function hasIssue(i) { return ST.checks.some(c => c.slide === i + 1 && c.level !== 'info'); }
function drawThumbs() {
  const box = ST.mode === 'simple' ? $('#s3thumbs') : $('#dFilm');
  box.innerHTML = '';
  ST.model.slides.forEach((s, i) => {
    const tb = el('div', { class: 'tb' });
    const b = ST.mode === 'simple' ? el('button', { class: 'thumb' + (i === ST.act ? ' on' : ''), 'data-i': i, onclick: () => go(i) }, el('span', {}, pad2(i + 1)), tb)
      : el('button', { class: 'fi' + (i === ST.act ? ' on' : ''), 'data-i': i, onclick: () => go(i) }, tb, pad2(i + 1));
    box.append(b);
    drawThumb(i, tb);
  });
  if (ST.mode === 'detail') box.append(el('button', { class: 'add', title: 'شريحة جديدة', onclick: () => addLayoutSlide(null) }, '+'));
}
function drawThumb(i, tb) {
  tb = tb || thumbBox(i); if (!tb) return;
  const w = ST.mode === 'simple' ? 124 : 118;
  drawSlide(tb, w, ST.layouts[i], { i });
  tb.style.opacity = ST.model.slides[i].skip ? .35 : 1;
  if (hasIssue(i)) tb.append(el('span', { class: 'dotw' }));
}
function markThumbs() { $$('#s3thumbs .thumb, #dFilm .fi').forEach(b => b.classList.toggle('on', +b.dataset.i === ST.act)); const t = $(`#s3thumbs .thumb[data-i="${ST.act}"], #dFilm .fi[data-i="${ST.act}"]`); if (t) t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
function drawStage() {
  const st = curStage(); if (!st || !ST.model) return;
  const L = ST.layouts[ST.act]; if (!L) return;
  const pop = st.parentNode.querySelector('.pop'); if (pop) pop.remove();
  st.innerHTML = ''; st.style.width = '0px'; st.style.height = '0px';
  drawSlide(st, stageWidth(), L, { live: true, i: ST.act });
  st.classList.add('stageBox');
  markSel();
  // alternatives
  const s = ST.model.slides[ST.act];
  const c = themeCandidates(s, ST.theme, lang(), OPT);
  let k = c.findIndex(x => x.id === s.layout); if (k < 0) k = 0;
  const name = (c[k] && c[k].name) || L.layoutName || '';
  if (ST.mode === 'simple') {
    $('#s3lay').textContent = name;
    $('#s3cnt').innerHTML = c.length > 1 ? `شكل <span class="num">${k + 1}</span> من <span class="num">${c.length}</span> يناسب هذا المحتوى` : 'الشكل الوحيد المناسب لهذا المحتوى';
    $('#s3dots').innerHTML = c.length > 1 ? c.slice(0, 9).map((_, j) => `<i class="${j === k ? 'on' : ''}"></i>`).join('') : '';
    $('#s3next').disabled = $('#s3prev').disabled = c.length < 2;
  } else renderBar(c, k, name);
}
function renderSide() {
  if (!ST.model) return;
  if (ST.mode === 'simple') {
    const cs = chartState(ST.act), cb = $('#s3chart');
    cb.classList.toggle('hidden', !cs); cb.querySelector('span').textContent = cs === 'on' ? 'اعرضها أرقام بدل الشارت' : 'حوّلها لشارت';
    const box = $('#s3chk'); box.innerHTML = '';
    const list = ST.checks.filter(c => c.level !== 'info');
    const infos = ST.checks.filter(c => c.level === 'info' && c.slide === ST.act + 1);
    $('#s3chkH').innerHTML = 'المدقق' + (list.length ? ` · <span class="num">${list.length}</span> ملاحظات` : '');
    if (!list.length) box.append(el('div', { class: 'allok' }, '✓ كل شيء سليم: لا تداخل ولا نص طالع عن مكانه'));
    for (const c of list.slice(0, 7).concat(infos.slice(0, 2))) box.append(el('div', { class: 'chk', onclick: () => c.slide && go(c.slide - 1) }, el('i', { class: c.level }), el('span', {}, c.slide ? 'شريحة ' : '', c.slide ? el('span', { class: 'num' }, pad2(c.slide)) : '', c.slide ? ': ' : '', c.msg)));
  } else renderPane();
}
window.addEventListener('resize', () => { if (ST.model && (ST.mode === 'detail' || ST.step === 3)) drawStage(); if (ST.mode === 'simple' && ST.step === 1) renderS1(); });

/* =========================================================
   DETAILED MODE
   ========================================================= */
function renderDetail() {
  // left panel
  const th = $('#dThemes'); th.innerHTML = '';
  for (const t of THEME_ORDER) th.append(el('button', { class: ST.theme === t ? 'on' : '', onclick: () => setTheme(t) }, THEMES[t].name));
  const dl = $('#dLang'); dl.innerHTML = '';
  for (const [v, n] of [['ar', 'عربي'], ['en', 'English'], ['bi', 'عربي + EN']]) dl.append(el('button', { class: lang() === v ? 'on' : '', onclick: () => { if (!ST.model) return toast('افتح عرض أولاً'); pushUndo(); ST.model.lang = v; if (ST.base) ST.base.lang = v; if (v === 'bi' && ST.model.slides.some(missingEn)) toast('العرض صار ثنائي — أضف الإنجليزي عبر «إعادة صياغة ← ترجمة» أو اكتبه مباشرة', 4200); LAYCACHE = {}; relayout(); renderDetail(); } }, n));
  const db = $('#dBg'); db.innerHTML = '';
  for (const [v, n] of [['white', 'أبيض'], ['grey', 'رمادي فاتح جداً']]) db.append(el('button', { class: OPT.bg === v ? 'on' : '', onclick: () => setBg(v) }, n));
  const lays = $('#dLays'); lays.innerHTML = '';
  const lg = lang();
  for (const pv of layoutPreviews(ST.theme, lg, false)) {
    if (pv.type === 'cover') continue;
    const lt = el('div', { class: 'lt' });
    lays.append(el('button', { onclick: () => addLayoutSlide(pv) }, lt, pv.name));
    requestAnimationFrame(() => miniInto(lt, lt.clientWidth, pv, lg));
  }
  renderSizes(); renderOpts();
  if (!ST.model) {
    $('#dBar').innerHTML = ''; $('#dFilm').innerHTML = '';
    const st = $('#dStage'); st.innerHTML = ''; st.className = ''; st.style.width = ''; st.style.height = '';
    st.append(el('div', { class: 'drop', style: 'max-width:560px;flex-direction:column;text-align:center', onclick: () => $('#fIn').click() },
      el('div', { class: 'ic', html: ico('upload', '#1E63D6', 30, 1.7) }), el('div', {}, el('b', {}, 'اسحب ملف وورد أو بوربوينت هنا'), el('span', {}, 'أو ابدأ بعرض فارغ من قائمة «ملف»'))));
    renderPane();
    return;
  }
  drawThumbs(); drawStage(); renderPane();
}
function renderBar(c, k, name) {
  const bar = $('#dBar'); bar.innerHTML = '';
  const s = ST.model.slides[ST.act];
  bar.append(el('span', { class: 't' }, el('span', { class: 'num' }, pad2(ST.act + 1)), ' · ' + name));
  bar.append(el('span', { style: 'flex:1' }));
  if (c.length > 1) bar.append(el('span', { class: 'alt2' }, el('button', { title: 'السابق', onclick: () => alt(-1), html: ico('chevR', '#fff', 14, 2.6) }), el('span', {}, 'شكل ', el('span', { class: 'num' }, String(k + 1)), ' من ', el('span', { class: 'num' }, String(c.length))), el('button', { title: 'التالي', onclick: () => alt(1), html: ico('chevL', '#fff', 14, 2.6) })));
  const typ = el('select', { class: 'chip', title: 'نوع الشريحة', onchange: e => { pushUndo(); changeType(s, e.target.value); delete s.layout; refreshSlide(ST.act); drawThumbs(); } });
  for (const [v, n] of [['cover', 'غلاف'], ['agenda', 'أجندة'], ['divider', 'فاصل'], ['content', 'محتوى'], ['closing', 'ختام']]) typ.append(el('option', { value: v, selected: s.type === v ? 'selected' : null }, n));
  bar.append(typ);
  bar.append(el('button', { class: 'chip', title: 'تحريك للأمام', onclick: () => moveSlide(ST.act, -1), html: ico('chevR', 'currentColor', 13) }), el('button', { class: 'chip', title: 'تحريك للخلف', onclick: () => moveSlide(ST.act, 1), html: ico('chevL', 'currentColor', 13) }));
  bar.append(el('button', { class: 'chip', onclick: () => reIcon(ST.act) }, 'أيقونات'), el('button', { class: 'chip', onclick: () => removeIcons(ST.act) }, 'إزالة الأيقونات'));
  const cs = chartState(ST.act); if (cs) bar.append(el('button', { class: 'chip', onclick: () => toggleChart(ST.act) }, cs === 'on' ? 'أرقام بدل الشارت' : 'حوّل لشارت'));
  bar.append(el('button', { class: 'chip', onclick: () => dupSlide(ST.act) }, 'تكرار'));
  bar.append(el('button', { class: 'chip', onclick: () => openNotes(ST.act) }, 'ملاحظات المتحدث' + (s.notes ? ' ●' : '')));
  bar.append(el('button', { class: 'chip', onclick: () => { pushUndo(); s.skip = !s.skip; relayout(); renderDetail(); } }, s.skip ? 'إظهار' : 'إخفاء'));
  bar.append(el('button', { class: 'chip dang', onclick: () => delSlide(ST.act) }, 'حذف'));
}
function changeType(s, t) {
  s.type = t;
  if (t === 'agenda' && !s.items) s.items = (s.sections || []).flatMap(sec => sec.items ? sec.items.map(it => ({ title: typeof it === 'string' ? it : (it.title || it.text || '') })) : (sec.item ? [{ title: sec.item.title || '' }] : [])).filter(x => x.title);
  if (t === 'agenda' && (!s.items || !s.items.length)) s.items = [{ title: '…' }, { title: '…' }, { title: '…' }];
  if (t === 'content' && !s.sections) { s.sections = []; if (s.items) s.sections.push({ kind: 'list', items: s.items.map(x => ({ title: x.title, text: x.sub })) }); if (s.lines && s.lines.length) s.sections.push({ kind: 'bullets', items: s.lines }); if (!s.sections.length) s.sections.push({ kind: 'text', text: '…' }); }
  if (t === 'cover' && !s.lines) s.lines = [];
}
function openNotes(i) {
  const s = ST.model.slides[i];
  const ta = el('textarea', { placeholder: 'اكتب ملاحظاتك للمتحدث — تظهر في PowerPoint تحت الشريحة' }); ta.value = s.notes || '';
  const ov = modal('ملاحظات المتحدث · شريحة ' + (i + 1), ta, el('button', { class: 'btn pri sm', onclick: () => { pushUndo(); s.notes = ta.value.trim(); ov.remove(); renderBar(themeCandidates(s, ST.theme, lang(), OPT), 0, ST.layouts[i].layoutName); drawStage(); } }, 'حفظ'));
}
function addLayoutSlide(pv) {
  if (!ST.model) newBlank('ar');
  pushUndo();
  let s;
  if (pv) { s = placeholderize(pv.slide, lang()); s.layout = pv.id; copyIcons(sampleFor(THEMES[ST.theme].layouts.find(l => l.id === pv.id)) || {}, s); }
  else s = placeholderize(SAMPLES.ar[3], lang());
  if (lang() === 'bi') addEnPlaceholders(s);
  const last = ST.model.slides[ST.model.slides.length - 1];
  const at = Math.min(ST.act + 1, ST.model.slides.length - (last && last.type === 'closing' ? 1 : 0));
  ST.model.slides.splice(Math.max(1, at), 0, s); ST.act = Math.max(1, at); ST.sel = null;
  relayout(); renderDetail();
  toast('أضفت شريحة — اضغط على النصوص واكتب محتواك');
}
const SIZE_ROWS = [['title', 'العنوان'], ['body', 'النص'], ['cardTitle', 'عناوين البطاقات'], ['kpi', 'الأرقام الكبيرة']];
function renderSizes() {
  const box = $('#dSizes'); box.innerHTML = '';
  const lg = sizeLang();
  for (const [k, n] of SIZE_ROWS) {
    const v = OPT.sizes[lg][k];
    const set = d => { OPT.sizes[lg][k] = Math.max(8, Math.min(72, Math.round((OPT.sizes[lg][k] + d) * 2) / 2)); save(); LAYCACHE = {}; if (ST.model) { relayout(); renderDetail(); } else renderSizes(); };
    box.append(el('div', { class: 'set' }, el('span', {}, n), el('span', { class: 'stp2' }, el('button', { onclick: () => set(-1) }, '−'), el('b', {}, String(v)), el('button', { onclick: () => set(1) }, '+'))));
  }
  box.append(el('div', { class: 'set' }, el('span', {}, 'التزم بالأحجام بالضبط (بدون تكبير/تصغير تلقائي)'), el('button', { class: 'tg' + (OPT.sizesMode === 'fixed' ? ' on' : ''), onclick: () => { OPT.sizesMode = OPT.sizesMode === 'fixed' ? 'auto' : 'fixed'; save(); LAYCACHE = {}; if (ST.model) relayout(); renderDetail(); } })));
  box.append(el('div', { class: 'set' }, el('span', {}, ''), el('button', { class: 'lnk', style: 'font-size:12px', onclick: () => { OPT.sizes = clone(DEFAULT_SIZES); OPT.sizesMode = 'auto'; save(); LAYCACHE = {}; if (ST.model) relayout(); renderDetail(); } }, 'رجوع للافتراضي')));
}
function renderOpts() {
  const box = $('#dOpts'); box.innerHTML = '';
  for (const [k, n] of [['enLeft', 'الأسطر الإنجليزية تبدأ من اليسار'], ['creative', 'توزيع إبداعي (بطاقات وأرقام من النص)'], ['autoIcons', 'أيقونات تلقائية عند الاستيراد'], ['naming', 'تسميات الصالات المعتمدة'], ['closing', 'شريحة ختام تلقائية']]) box.append(el('div', { class: 'set' }, el('span', {}, n), el('button', { class: 'tg' + (OPT[k] ? ' on' : ''), onclick: () => { OPT[k] = !OPT[k]; save(); renderOpts(); if (k === 'enLeft' && ST.model) { relayout(); render(); } } })));
}
$('#dTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ST.tab = b.dataset.t; renderPane(); });
const AVIATION = ['jed-tower-solid', 'jed-airport-solid', 'jed-tower', 'jed-terminal', 'jed-terminal-2', 'plane', 'plane-takeoff', 'plane-landing', 'jed-aircraft-front', 'jed-runway', 'jed-gate', 'jed-boarding-pass', 'tickets-plane', 'jed-haramain-train', 'jed-kaaba', 'jed-pilgrim', 'jed-mosque', 'jed-passport', 'jed-stamp', 'jed-security', 'jed-checkin', 'jed-fids', 'luggage', 'baggage-claim', 'jed-trolley', 'jed-windsock', 'jed-route', 'jed-firetruck', 'radio-tower', 'armchair', 'train-front', 'car-taxi-front', 'globe', 'earth', 'map-pin', 'route'].filter(n => ICONS[n]);
const SERVICES = ['jed-mosque', 'tb-wheelchair', 'tb-disabled', 'tb-baby-carriage', 'tb-elevator', 'tb-escalator', 'tb-stairs', 'tb-friends', 'tb-parking', 'tb-bus-stop', 'tb-bus', 'tb-car', 'train-front', 'car-taxi-front', 'tb-currency-riyal', 'tb-coins', 'tb-credit-card', 'tb-first-aid-kit', 'tb-ambulance', 'tb-charging-pile', 'tb-plug', 'tb-wifi', 'tb-coffee', 'tb-tools-kitchen-2', 'tb-shopping-bag', 'tb-gift', 'tb-armchair', 'tb-sofa', 'tb-info-circle', 'tb-help', 'tb-lock', 'tb-luggage', 'tb-briefcase', 'tb-scan', 'tb-face-id', 'tb-fingerprint', 'tb-id-badge-2', 'tb-ticket', 'tb-qrcode', 'tb-door-exit', 'tb-door-enter', 'tb-map', 'tb-map-pin', 'tb-direction-sign', 'tb-clock', 'tb-hourglass', 'tb-bell', 'tb-language', 'tb-world', 'tb-droplet', 'tb-bed'].filter(n => ICONS[n]);
const CATS = [['طيران', '*AV'], ['خدمات المطار', '*SRV'], ['مكة والحرمين', 'كعبه معتمر حرمين مسجد'], ['سلامة', 'امان طوارئ اطفاء خوذه'], ['أشخاص', 'موظف فريق عملاء شراكه'], ['وقت وتاريخ', 'وقت تاريخ تقويم مؤقت'], ['أرقام وتقارير', 'مؤشر تقرير نمو احصاء'], ['إنجاز', 'هدف جائزه تطوير ابتكار'], ['تواصل', 'بريد هاتف دعم محادثه اعلان'], ['موقع', 'موقع خريطه مبني اتجاه'], ['تعليم', 'تدريب كتاب اختبار لغه'], ['صحة', 'طبي لياقه دواء'], ['تقنية', 'تقنيه حاسب ذكاء تطبيق'], ['مال', 'ميزانيه ريال استثمار'], ['مستندات', 'ملف مرفق مهام توقيع']];
const catList = q => q === '*AV' ? AVIATION : q === '*SRV' ? SERVICES : searchIcons(q, ICONS, 200);
const FIRST = [...AVIATION, 'shield-check', 'siren', 'flame', 'hard-hat', 'heart-pulse', 'book-open', 'graduation-cap', 'presentation', 'calendar-days', 'clock', 'timer', 'building-2', 'mail', 'phone', 'headset', 'megaphone', 'users', 'user', 'handshake', 'target', 'trophy', 'award', 'lightbulb', 'rocket', 'trending-up', 'chart-bar', 'chart-pie', 'file-text', 'clipboard-check', 'circle-check', 'info', 'circle-help', 'triangle-alert', 'bell', 'star', 'sparkles', 'link', 'wifi', 'car', 'bus', 'utensils', 'coffee', 'flag', 'gift', 'leaf', 'accessibility', 'scale', 'smile', 'hand-heart', 'milestone', 'layout-grid', 'list-checks'].filter((n, i, a) => ICONS[n] && a.indexOf(n) === i);
let iconQ = '', iconCat = '';
function renderPane() {
  $$('#dTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === ST.tab));
  const P = $('#dPane'); P.innerHTML = '';
  P.style.cssText = 'display:flex;flex-direction:column;gap:12px';
  if (ST.tab === 'ic') {
    const inp = el('input', { placeholder: 'ابحث: طائرة، صالة، أمن، plane…', value: iconQ });
    const grid = el('div', { class: 'igrid' });
    const fill = list => { grid.innerHTML = ''; for (const n of list) if (ICONS[n]) grid.append(el('button', { title: n, draggable: 'true', 'data-icon': n, onclick: () => { if (!ST.model || !ST.sel || ST.sel.kind !== 'item') return toast('اضغط على العنصر في الشريحة أولاً، ثم اختر الأيقونة'); setIcon(ST.sel.path, n); } }, el('img', { src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(n, ICONS, '0A1F44')) }))); };
    const all = () => iconQ ? searchIcons(iconQ, ICONS, 200) : iconCat ? catList(iconCat) : FIRST.concat(Object.keys(ICONS).filter(n => !FIRST.includes(n))).slice(0, 300);
    inp.oninput = () => { iconQ = inp.value.trim(); iconCat = ''; fill(all()); $$('.tags button').forEach(b => b.classList.remove('on')); };
    P.append(el('div', { class: 'srch' }, el('span', { html: ico('search', '#9aa5b8') }), inp));
    if (ST.model) {
      const s = ST.model.slides[ST.act];
      const txt = [s.title, ...(s.sections || []).flatMap(sec => (sec.items || []).concat(sec.item ? [sec.item] : []).map(itemText))].join(' ');
      const sug = suggestIcons(txt, ICONS, 12);
      if (sug.length) { const sg = el('div', { class: 'igrid' }); for (const n of sug.slice(0, 12)) sg.append(el('button', { title: n, draggable: 'true', 'data-icon': n, onclick: () => { if (!ST.sel || ST.sel.kind !== 'item') return toast('اضغط على العنصر في الشريحة أولاً'); setIcon(ST.sel.path, n); } }, el('img', { src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(n, ICONS, '1E63D6')) }))); P.append(el('div', { class: 'sug' }, el('h5', {}, 'مقترحة لهذه الشريحة'), sg)); }
    }
    P.append(el('div', { class: 'tags' }, el('button', { class: !iconCat && !iconQ ? 'on' : '', onclick: () => { iconCat = ''; iconQ = ''; renderPane(); } }, 'الكل'), ...CATS.map(([n, q]) => el('button', { class: iconCat === q ? 'on' : '', onclick: () => { iconCat = q; iconQ = ''; renderPane(); } }, n))));
    P.append(el('p', { class: 'note', style: 'margin:0' }, 'اسحب الأيقونة فوق أي أيقونة أو بطاقة في الشريحة لاستبدالها، أو اضغط العنصر ثم الأيقونة.'));
    P.append(grid); fill(all());
    grid.parentNode.addEventListener('dragstart', e => { const b = e.target.closest('[data-icon]'); if (!b) return; e.dataTransfer.setData('text/x-icon', b.dataset.icon); e.dataTransfer.effectAllowed = 'copy'; });
  } else if (ST.tab === 'im') {
    if (!ST.model) { P.append(el('p', { class: 'note' }, 'افتح عرض أولاً.')); return; }
    const s = ST.model.slides[ST.act];
    const own = (s.sections || []).map((sec, k) => [sec, k]).filter(([sec]) => sec.kind === 'image' && sec.img);
    P.append(el('h3', {}, 'صور هذه الشريحة', el('em', {}, own.length ? own.length + '' : 'لا يوجد')));
    if (own.length) { const g = el('div', { class: 'pgrid' }); own.forEach(([sec, k]) => g.append(el('button', { onclick: () => openImagePicker({ i: ST.act, prim: { imgRef: ['sections', k] } }) }, el('img', { src: assetUrl(sec.img) }), el('span', { class: 'x', title: 'إزالة', onclick: e => { e.stopPropagation(); pushUndo(); s.sections.splice(k, 1); refreshSlide(ST.act); } }, '×')))); P.append(g); }
    P.append(el('button', { class: 'btn pri sm', onclick: async () => { const ids = await pickFiles(true); if (!ids.length) return; pushUndo(); ids.forEach(id => (s.sections = s.sections || []).push({ kind: 'image', img: id })); refreshSlide(ST.act); } }, el('span', { html: ico('upload', '#fff') }), 'أضف صور من جهازك'));
    P.append(el('h3', {}, 'مكتبة صور الهوية', el('em', {}, 'اضغط لإضافتها')));
    const g2 = el('div', { class: 'pgrid' });
    STOCK_IDS.forEach(id => g2.append(el('button', { onclick: () => applyImage(ST.act, null, id) }, el('img', { src: assetUrl(id) }))));
    P.append(g2);
    P.append(el('p', { class: 'note' }, 'الشكل يحدد مكان الصور. إذا ما فيه صورة كافية يستخدم صور الهوية تلقائياً — اضغط أي صورة في الشريحة لتبديلها.'));
  } else {
    if (!ST.model) { P.append(el('p', { class: 'note' }, 'افتح عرض أولاً.')); return; }
    const cnt = l => ST.checks.filter(c => c.level === l).length;
    const okN = ST.model.slides.filter((s, i) => !ST.checks.some(c => c.slide === i + 1 && c.level !== 'info')).length;
    P.append(el('div', { class: 'sum' }, el('div', { style: 'background:#EAF7EF;color:#1A8A4F' }, el('b', {}, String(okN)), 'سليمة'), el('div', { style: 'background:#FFF4DE;color:#B07A0A' }, el('b', {}, String(cnt('warn'))), 'تنبيه'), el('div', { style: 'background:#FDECEC;color:#C23B3B' }, el('b', {}, String(cnt('error'))), 'خطأ')));
    const col = { error: '#D9534F', warn: '#E5A11A', info: '#5AA9F5' };
    if (!ST.checks.length) P.append(el('div', { class: 'allok' }, '✓ كل شيء سليم'));
    for (const c of ST.checks) P.append(el('div', { class: 'ck', onclick: () => c.slide && go(c.slide - 1) }, el('span', { class: 'd', style: 'background:' + col[c.level] }), el('div', {}, el('b', {}, c.slide ? 'شريحة ' + pad2(c.slide) : 'العرض كامل'), el('span', {}, c.msg))));
    P.append(el('p', { class: 'note' }, 'يفحص: النص الطالع عن مكانه، التداخل، الخطوط الصغيرة، دقة الصور، خلط الأرقام، مسميات الصالات، الشرائح الفارغة.'));
  }
}
$('#bCheck').onclick = () => { ST.tab = 'ck'; renderPane(); };
$('#dImport').onclick = $('#bImport').onclick = () => $('#fIn').click();
$('#dStageW').addEventListener('dragover', e => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
$('#dStageW').addEventListener('drop', e => { const f = [...(e.dataTransfer.files || [])].find(f => /\.(pptx|docx)$/i.test(f.name)); if (f) { e.preventDefault(); openFile(f); } });
$('#dCopilot').onclick = () => {
  if (!ST.model) return toast('افتح عرض أولاً');
  const box = el('div', { class: 'cop' });
  let got = null, mode = 'rewrite';
  const src = ST.base || ST.model;
  const draw = () => renderCopBox(box, { lang: lang(), slides: src.slides }, sl => { got = sl; okBtn.disabled = false; okBtn.textContent = 'تطبيق (' + sl.length + ' شريحة)'; }, mode);
  const sg = el('div', { class: 'seg', style: 'margin-bottom:10px' }, ...[['rewrite', 'إعادة صياغة وتصميم'], ['translate', 'ترجمة للإنجليزي فقط']].map(([v, n]) => el('button', { class: v === mode ? 'on' : '', onclick: e => { mode = v; [...sg.children].forEach(b => b.classList.toggle('on', b === e.target)); got = null; okBtn.disabled = true; draw(); } }, n)));
  const body = el('div', {}, el('p', { class: 'note' }, 'جهاز العمل يسمح بـ Copilot فقط، فالطريقة نسخ ولصق. الأرقام والأسماء تبقى كما هي.'), sg, box);
  const okBtn = el('button', { class: 'btn pri sm', disabled: true, onclick: () => { pushUndo(); const u = ST.undo.slice(); const lg = mode === 'translate' && lang() !== 'en' ? 'bi' : lang(); ST.base = { lang: lg, slides: useRewritten(got) }; designFrom(ST.base, ST.seed || 1); ST.undo = u; ST.act = 0; ST.sel = null; renderDetail(); ov.remove(); toast(mode === 'translate' ? 'تمت إضافة الإنجليزي' : 'تم تطبيق الصياغة الجديدة'); } }, 'تطبيق');
  draw();
  const ov = modal('إعادة صياغة باحترافية عبر Copilot', body, okBtn);
};
$('#dMatch').onclick = () => {
  if (!ST.model) return toast('افتح عرض أولاً');
  if (!ST.src || !ST.src.text) return toast('المطابقة تحتاج ملف أصلي مستورد');
  const norm = t => String(t).replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2);
  const deckWords = new Set(norm(JSON.stringify(ST.model.slides.map(s => [s.title, s.subtitle, s.lines, s.items, s.sections]))));
  const miss = [];
  for (const t of ST.src.text) { const w = norm(t); if (w.length < 3) continue; const hit = w.filter(x => deckWords.has(x)).length / w.length; if (hit < 0.6) miss.push([t, Math.round(hit * 100)]); }
  const body = el('div');
  body.append(el('p', { class: 'note' }, miss.length ? `هذه ${miss.length} فقرة من الملف الأصلي غير موجودة بالكامل في العرض (قد تكون أعيدت صياغتها أو حُذفت):` : '✓ كل محتوى الملف الأصلي موجود في العرض.'));
  for (const [t, p] of miss.slice(0, 60)) body.append(el('div', { class: 'cmpRow' }, el('span', { class: 'num', style: 'color:#B07A0A;min-width:44px' }, p + '%'), el('span', {}, t)));
  modal('مطابقة المحتوى مع الملف الأصلي', body);
};

/* ---------- file menu ---------- */
$('#bFile').onclick = e => { e.stopPropagation(); $('#fileMenu').classList.toggle('on'); };
document.addEventListener('click', () => $('#fileMenu').classList.remove('on'));
$('#fileMenu').onclick = e => {
  const a = e.target.dataset.act; if (!a) return;
  if (a === 'open') $('#fIn').click();
  if (a === 'blankAr' || a === 'blankEn' || a === 'blankBi') { newBlank({ blankAr: 'ar', blankEn: 'en', blankBi: 'bi' }[a]); render(); }
  if (a === 'loadProj') $('#fProj').click();
  if (a === 'saveProj') saveProject();
  if (a === 'myPhotos') openPhotoLib();
  if (a === 'files') openFiles();
  if (a === 'saveFiles') saveToFiles(true);
  if (a === 'story') openStory();
};
function saveProject() {
  if (!ST.model) return toast('ما فيه عرض مفتوح');
  const user = {};
  for (const [id, a] of Object.entries(ST.assets)) if (!id.startsWith('stock:') && a.bytes && a.kind !== 'chart') user[id] = { kind: a.kind, ext: a.ext, b64: bytesToB64(a.bytes) };
  const proj = { app: 'sanea-alorood', v: 3, name: ST.name, theme: ST.theme, model: ST.model, naming: ST.naming, src: ST.src && ST.src.kind === 'pptx' ? bytesToB64(ST.src.bytes) : null, user };
  saveFile(ST.name + ' — مشروع صانع العروض.json', new Blob([JSON.stringify(proj)], { type: 'application/json' })).then(ok => ok && toast('تم حفظ المشروع'));
}
$('#fProj').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const done = busy('أفتح المشروع…');
  try {
    const proj = JSON.parse(await f.text());
    if (proj.app !== 'sanea-alorood') throw new Error('ملف مشروع غير معروف');
    ST.fileId = null;
    for (const k of Object.keys(ST.assets)) if (!k.startsWith('stock:')) delete ST.assets[k];
    if (proj.src) { const buf = b64ToBytes(proj.src); const parsed = await parsePptx(await JSZip.loadAsync(buf)); const r = analyzeDeck(parsed); Object.assign(ST.assets, r.assets); await prepareAssets(ST.assets, parsed); ST.parsed = parsed; ST.src = { kind: 'pptx', bytes: buf, name: proj.name, text: null }; }
    for (const [id, a] of Object.entries(proj.user || {})) { const bytes = b64ToBytes(a.b64); ST.assets[id] = { kind: a.kind, ext: a.ext, bytes, size: imgSize(bytes, a.ext) }; }
    ST.model = proj.model; ST.naming = proj.naming || { changes: [], flags: [] }; ST.name = proj.name || 'عرض'; if (proj.theme && THEMES[proj.theme]) ST.theme = proj.theme;
    ST.undo = []; ST.redo = []; ST.act = 0; ST.sel = null; ST.built = true;
    relayout(); if (ST.mode === 'simple') ST.step = 3; render();
    toast('تم فتح المشروع');
  } catch (err) { toast('تعذر فتح المشروع: ' + err.message, 4500); }
  done();
};


/* =========================================================
   قصة العرض — agenda, highlights and "what we need from you"
   ========================================================= */
const ASK_RE = /(نطلب|نأمل|نرجو|نوصي|التوصيات|توصيات|التوصية|اعتماد (?:المقترح|الخطة|الميزانية|المبادرة|البرنامج|المشروع)|الموافقة على|المطلوب منكم|المطلوب من|الخطوات القادمة|الخطوة التالية|الخطوات التالية|نقترح|\bnext steps?\b|\bwe (?:request|recommend|propose|ask)\b|\bfor (?:your )?approval\b|\bplease approve\b)/i;
const INTRO_RE = /^(هدف|أهداف|الهدف|الأهداف|نظرة عامة|مقدمة|نبذة|الغرض|عن البرنامج|عن المبادرة|objective|objectives|overview|introduction|purpose|about)/i;
function storyPlan() {
  const sl = ST.model.slides, bi = lang() === 'bi';
  const plan = { agenda: null, highlights: null, asks: null, moves: [] };
  const firstContent = sl.findIndex(s => s.type === 'content');
  const divs = sl.map((s, i) => s.type === 'divider' ? i : -1).filter(i => i >= 0);
  // agenda
  if (!sl.some(s => s.type === 'agenda')) {
    const src = divs.length >= 2 ? divs.map(i => sl[i]) : sl.filter(s => s.type === 'content' && s.title).slice(0, 7);
    if (src.length >= 3) plan.agenda = { type: 'agenda', title: lang() === 'en' ? 'Agenda' : 'جدول الأعمال', items: src.slice(0, 8).map(s => Object.assign({ title: s.title }, bi && s.title_en ? { title_en: s.title_en } : {})) };
    if (plan.agenda && bi) plan.agenda.title_en = 'Agenda';
  }
  // highlights: one strong line per section
  const groups = divs.length >= 2 ? divs.map((d, k) => ({ head: sl[d], slides: sl.slice(d + 1, divs[k + 1] || sl.length).filter(s => s.type === 'content') })) : sl.filter(s => s.type === 'content').map(s => ({ head: s, slides: [s] }));
  const pick = s => {
    for (const sec of s.sections || []) if (sec.kind === 'kpis' && sec.items && sec.items[0] && sec.items[0].value) { const k = sec.items[0]; return { value: k.value, text: k.title || k.label || '', text_en: k.title_en || k.label_en || '' }; }
    for (const sec of s.sections || []) if (sec.kind === 'feature' && sec.item && sec.item.title) return { text: sec.item.title, text_en: sec.item.title_en || '' };
    for (const sec of s.sections || []) if (sec.kind === 'text' && sec.text) { const l = String(sec.text).split('\n')[0]; if (l.length <= 160) return { text: l, text_en: String(sec.text_en || '').split('\n')[0] }; }
    for (const sec of s.sections || []) if (sec.items && sec.items[0]) { const it = sec.items[0]; if (typeof it === 'string') return { text: it, text_en: (sec.items_en || [])[0] || '' }; if (it.title) return { text: it.title, text_en: it.title_en || '' }; }
    return null;
  };
  const hl = [];
  for (const g of groups) { let h = null; for (const s of g.slides) { h = pick(s); if (h) break; } if (h && g.head.title) hl.push(Object.assign({ title: g.head.title, text: h.text }, h.value ? { value: h.value } : {}, bi ? { title_en: g.head.title_en || '', text_en: h.text_en || '' } : {})); if (hl.length >= 6) break; }
  if (hl.length >= 3) plan.highlights = Object.assign({ type: 'content', title: lang() === 'en' ? 'Key Highlights' : 'أبرز ما في العرض', sections: [{ kind: hl.some(x => x.value) ? 'cards' : 'list', items: hl.map(x => { const o = Object.assign({}, x); if (!o.text_en) delete o.text_en; if (!o.title_en) delete o.title_en; return o; }) }] }, bi ? { title_en: 'Key Highlights' } : {});
  // what we need from you
  const asks = [], seen = new Set(), from = new Set(); let cur = null;
  const add = (t, e) => { t = String(t || '').trim(); if (!t || t.length > 220 || seen.has(t) || !ASK_RE.test(/[؀-ۿ]/.test(t) ? t : t + ' ' + (e || ''))) return; seen.add(t); from.add(cur); asks.push(Object.assign({ text: t }, bi && e ? { text_en: e } : {})); };
  for (const s of sl) {
    if (s.type !== 'content') continue;
    cur = s;
    for (const sec of s.sections || []) {
      if (sec.qa) continue;
      if (sec.kind === 'text') { const L = String(sec.text || '').split('\n'), E = String(sec.text_en || '').split('\n'); L.forEach((l, k) => add(l, E[k])); }
      if (sec.kind === 'bullets') (sec.items || []).forEach((b, k) => add(b, (sec.items_en || [])[k]));
      if (sec.items && sec.kind !== 'bullets') sec.items.forEach(it => { if (it && typeof it === 'object') { if (it.title && it.text) { if (ASK_RE.test(it.title + ' ' + it.text)) add(it.title + ' — ' + it.text, it.title_en && it.text_en ? it.title_en + ' — ' + it.text_en : ''); } else add(it.text || it.title, it.text_en || it.title_en); } });
      if (sec.kind === 'feature' && sec.item) add(sec.item.title, sec.item.title_en);
    }
  }
  // already gathered on one slide of their own? then nothing to add
  if (asks.length && !(from.size === 1 && asks.length >= 2)) plan.asks = Object.assign({ type: 'content', title: lang() === 'en' ? 'What We Need From You' : 'المطلوب منكم', sections: [{ kind: 'list', items: asks.slice(0, 5) }] }, bi ? { title_en: 'What We Need From You' } : {});
  // objectives / overview belong at the start
  sl.forEach((s, i) => { if (s.type === 'content' && INTRO_RE.test(String(s.title || '').trim()) && firstContent >= 0 && i > firstContent + 1) plan.moves.push(i); });
  return plan;
}
function openStory() {
  if (!ST.model) return toast('افتح عرض أولاً');
  const plan = storyPlan(), sl = ST.model.slides;
  const body = el('div', { class: 'story' });
  body.append(el('p', { class: 'note', style: 'margin:0 0 10px' }, 'هذا تسلسل عرضك. اسحب أي شريحة من ⠿ لمكانها الجديد (أو استخدم الأسهم)، واختر الإضافات اللي تكمّل القصة — الأداة تنسخ نصوصك كما هي ولا تؤلف كلامًا جديدًا.'));
  const list = el('div', { class: 'storyList' });
  const drawList = () => {
    list.innerHTML = '';
    ST.model.slides.forEach((s, i) => {
      const name = { cover: 'غلاف', agenda: 'أجندة', divider: 'فاصل', closing: 'ختام' }[s.type] || '';
      const row = el('div', { class: 'srow' + (s.type === 'divider' ? ' div' : ''), 'data-i': i },
        el('span', { class: 'sgrip', title: 'اسحب لتغيير الترتيب' }, '⠿'), el('span', { class: 'num' }, pad2(i + 1)), el('span', { class: 'stt' }, (name ? name + ' · ' : '') + (s.title || '—')),
        el('button', { title: 'لأعلى', disabled: i === 0 ? true : null, onclick: () => { moveSlide(i, -1); drawList(); } }, '↑'),
        el('button', { title: 'لأسفل', disabled: i === ST.model.slides.length - 1 ? true : null, onclick: () => { moveSlide(i, 1); drawList(); } }, '↓'));
      list.append(row);
      dragRow(row, i);
    });
  };
  // drag a row by its handle; a line shows where it will land
  function dragRow(row, from) {
    const g = row.querySelector('.sgrip');
    g.addEventListener('pointerdown', e => {
      e.preventDefault(); g.setPointerCapture(e.pointerId);
      row.classList.add('dragging');
      const rows = [...list.querySelectorAll('.srow')];
      const mark = el('div', { class: 'sdrop' }); let to = from;
      const mv = ev => {
        const y = ev.clientY; to = rows.length;
        for (let k = 0; k < rows.length; k++) { const r = rows[k].getBoundingClientRect(); if (y < r.top + r.height / 2) { to = k; break; } }
        const ref = rows[to]; if (ref) list.insertBefore(mark, ref); else list.append(mark);
        const lr = list.getBoundingClientRect(); if (y < lr.top + 24) list.scrollTop -= 10; if (y > lr.bottom - 24) list.scrollTop += 10;
      };
      const up = () => {
        g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up);
        mark.remove(); row.classList.remove('dragging');
        let dst = to > from ? to - 1 : to;
        if (dst !== from && dst >= 0) { pushUndo(); const A = ST.model.slides; const [m] = A.splice(from, 1); A.splice(dst, 0, m); ST.act = dst; relayout(); renderAfterStructure(); }
        drawList();
      };
      g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
    });
  }
  drawList(); body.append(list);
  const opts = [];
  const opt = (key, txt, sub) => { const cb = el('input', { type: 'checkbox', checked: true }); opts.push([key, cb]); body.append(el('label', { class: 'sopt' }, cb, el('span', {}, el('b', {}, txt), sub ? el('small', {}, sub) : ''))); };
  body.append(el('h4', { style: 'margin:14px 0 6px' }, 'اقتراحات لتكمل القصة'));
  if (plan.agenda) opt('agenda', 'أضف أجندة بعد الغلاف', plan.agenda.items.length + ' بنود من عناوين أقسامك');
  if (plan.moves.length) opt('moves', 'قدّم شرائح الأهداف والمقدمة لأول العرض', plan.moves.map(i => '«' + sl[i].title + '»').join('، '));
  if (plan.highlights) opt('highlights', 'أضف شريحة «أبرز ما في العرض» قبل الختام', 'سطر واحد من كل قسم: ' + plan.highlights.sections[0].items.length + ' نقاط');
  if (plan.asks) opt('asks', 'أضف شريحة «المطلوب منكم»', plan.asks.sections[0].items.length + ' طلبات/توصيات وجدتها في نصوصك');
  if (!opts.length) body.append(el('p', { class: 'note' }, 'قصة عرضك مكتملة — ما عندي إضافات.'));
  const go = el('button', { class: 'btn pri sm', onclick: () => {
    const on = k => opts.some(([kk, cb]) => kk === k && cb.checked);
    if (!opts.some(([, cb]) => cb.checked)) { ov.remove(); return; }
    pushUndo();
    const S = ST.model.slides;
    if (on('moves')) { const moved = plan.moves.map(i => S[i]); for (const m of moved) S.splice(S.indexOf(m), 1); const at = Math.max(1, S.findIndex(s => s.type === 'content')); S.splice(at < 0 ? 1 : at, 0, ...moved); }
    if (on('agenda')) { smartIcons(plan.agenda, ICONS, 0); const at = S[0] && S[0].type === 'cover' ? 1 : 0; S.splice(at, 0, plan.agenda); }
    const endAt = () => { const c = S.length - 1; return S[c] && S[c].type === 'closing' ? c : S.length; };
    if (on('highlights')) { autoIconize({ slides: [plan.highlights] }, ICONS); S.splice(endAt(), 0, plan.highlights); }
    if (on('asks')) { smartIcons(plan.asks, ICONS, 0); S.splice(endAt(), 0, plan.asks); }
    ST.model.slides.forEach(s => { if (s === plan.highlights || s === plan.asks || s === plan.agenda) delete s.layout; });
    ov.remove(); relayout(); render(); toast('تم ترتيب قصة العرض');
  } }, 'طبّق');
  const ov = modal('قصة العرض', body, go);
}

/* =========================================================
   مكتبة صوري — the user's own photos, kept on this device
   ========================================================= */
const PL = { list: [], on: false, db: null };
function plDB() {
  return new Promise(res => {
    try {
      const r = indexedDB.open('saneaPhotos', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' });
      r.onsuccess = () => res(r.result); r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}
async function plLoad() {
  try {
    PL.db = await plDB(); if (!PL.db) return;
    const all = await new Promise(res => { const q = PL.db.transaction('p').objectStore('p').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); });
    for (const p of all) { ST.assets[p.id] = { kind: 'image', bytes: new Uint8Array(p.bytes), ext: 'jpeg', size: { w: p.w, h: p.h }, mine: true }; }
    PL.list = all.map(p => ({ id: p.id, name: p.name, tags: p.tags || '' }));
    PL.on = !!OPT.myPhotos && PL.list.length > 0;
  } catch (e) { }
}
function plPut(rec) { return new Promise(res => { try { const t = PL.db.transaction('p', 'readwrite'); t.objectStore('p').put(rec); t.oncomplete = () => res(true); t.onerror = () => res(false); } catch (e) { res(false); } }); }
function plDel(id) { return new Promise(res => { try { const t = PL.db.transaction('p', 'readwrite'); t.objectStore('p').delete(id); t.oncomplete = () => res(true); t.onerror = () => res(false); } catch (e) { res(false); } }); }
function shrinkPhoto(file) {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1920 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      c.toBlob(async b => res({ bytes: new Uint8Array(await b.arrayBuffer()), w: c.width, h: c.height }), 'image/jpeg', 0.86);
    };
    im.onerror = () => res(null);
    im.src = URL.createObjectURL(file);
  });
}
const plWords = t => (icNorm(t).match(/[ء-يa-z0-9]{3,}/g) || []).map(icStrip);
/* which of my photos fits this slide best (by the words I gave each photo) */
function PHOTO_PICK(slide, k, page, seed) {
  if (!PL.on || !PL.list.length) return null;
  const txt = new Set(plWords([slide && slide.title, slide && slide.subtitle, JSON.stringify((slide && slide.sections) || [])].join(' ')));
  const sc = PL.list.map((p, i) => ({ p, s: plWords(p.tags + ' ' + p.name).filter(w => txt.has(w)).length, i }));
  const good = sc.filter(x => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i);
  if (good.length) return good[(k + (good.length > 2 ? page : 0)) % good.length].p.id;
  return PL.list[(page * 3 + k + seed) % PL.list.length].id;
}
window.PHOTO_PICK = PHOTO_PICK;
function openPhotoLib() {
  const body = el('div');
  const grid = el('div', { class: 'plGrid' });
  const sw = el('button', { class: 'tg' + (OPT.myPhotos ? ' on' : ''), onclick: () => { OPT.myPhotos = !OPT.myPhotos; sw.classList.toggle('on', OPT.myPhotos); PL.on = OPT.myPhotos && PL.list.length > 0; save(); changed = true; } });
  let changed = false;
  const up = el('button', { class: 'btn pri sm', onclick: async () => {
    if (!PL.db) PL.db = await plDB();
    if (!PL.db) return toast('المتصفح ما يسمح بحفظ الصور هنا — جرّب من سفاري أو كروم');
    const inp = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', multiple: true });
    inp.style.cssText = 'position:fixed;left:-9999px;opacity:0'; document.body.append(inp);
    inp.onchange = async () => {
      const done = busy('أحفظ صورك…');
      for (const f of inp.files) {
        const r = await shrinkPhoto(f); if (!r) continue;
        const id = 'my:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const name = f.name.replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ');
        await plPut({ id, name, tags: '', bytes: r.bytes.buffer, w: r.w, h: r.h });
        ST.assets[id] = { kind: 'image', bytes: r.bytes, ext: 'jpeg', size: { w: r.w, h: r.h }, mine: true };
        PL.list.push({ id, name, tags: '' });
      }
      done(); inp.remove();
      if (!OPT.myPhotos && PL.list.length) { OPT.myPhotos = true; sw.classList.add('on'); save(); }
      PL.on = OPT.myPhotos && PL.list.length > 0; changed = true; fill();
    };
    inp.click();
  } }, el('span', { html: ico('upload', '#fff') }), 'أضف صور');
  const fill = () => {
    grid.innerHTML = '';
    if (!PL.list.length) grid.append(el('p', { class: 'note' }, 'ما فيه صور بعد. أضف صور مطاراتك ومشاريعك مرة وحدة، وتنحفظ في هذا الجهاز للمرات الجاية.'));
    for (const p of PL.list) {
      const t = el('input', { value: p.tags, placeholder: 'كلمات: صالة، مسافرين، حج…' });
      t.onchange = async () => { p.tags = t.value.trim(); const rec = await new Promise(res => { const q = PL.db.transaction('p').objectStore('p').get(p.id); q.onsuccess = () => res(q.result); }); if (rec) { rec.tags = p.tags; await plPut(rec); } changed = true; };
      grid.append(el('div', { class: 'plIt' }, el('div', { class: 'im', style: `background-image:url(${assetUrl(p.id)})` }),
        el('button', { class: 'x', title: 'حذف', onclick: async () => { await plDel(p.id); PL.list = PL.list.filter(x => x !== p); delete ST.assets[p.id]; PL.on = OPT.myPhotos && PL.list.length > 0; changed = true; fill(); } }, '×'), t));
    }
  };
  body.append(el('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px' }, up, el('span', { style: 'flex:1' }), el('span', {}, 'استخدم صوري في التصاميم'), sw));
  body.append(el('p', { class: 'note', style: 'margin:0 0 10px' }, 'اكتب تحت كل صورة كلمات تصف موضوعها، والأداة تختار لكل شريحة الصورة اللي تناسب كلامها.'));
  body.append(grid); fill();
  const ov = modal('مكتبة صوري', body, el('button', { class: 'btn pri sm', onclick: () => { ov.remove(); if (changed && ST.model) { relayout(); render(); toast(PL.on ? 'التصاميم صارت بصورك' : 'رجعت لصور الهوية'); } } }, 'تم'));
}

/* =========================================================
   عرض من الجوال — swipe through the slides, notes underneath
   ========================================================= */
function phoneShow(start) {
  if (!ST.model) return;
  const S = ST.model.slides.map((s, i) => i).filter(i => !ST.model.slides[i].skip);
  let k = Math.max(0, S.indexOf(start == null ? ST.act : start));
  let notesOn = true;
  const ov = el('div', { id: 'pshow' });
  const cnt = el('span', { class: 'num', dir: 'ltr', style: 'unicode-bidi:isolate' });
  const nb = el('button', { class: 'pb' }, 'ملاحظات');
  const top = el('div', { class: 'pst' }, el('button', { class: 'pb', onclick: () => close() }, '✕ إنهاء'), cnt, nb);
  const box = el('div', { class: 'psb' });
  const notes = el('div', { class: 'psn' });
  const prev = el('button', { class: 'pa' }, '→ السابق'), next = el('button', { class: 'pa pri' }, 'التالي ←');
  const nav = el('div', { class: 'psv' }, prev, next);
  ov.append(top, box, notes, nav);
  const draw = () => {
    const i = S[k], land = innerWidth > innerHeight;
    ov.classList.toggle('land', land);
    const w = land ? Math.min(innerWidth, (innerHeight - 8) * 16 / 9) : innerWidth;
    drawSlide(box, w, ST.layouts[i], { i });
    cnt.textContent = pad2(k + 1) + ' / ' + pad2(S.length);
    const n = ST.model.slides[i].notes;
    notes.textContent = n || 'لا توجد ملاحظات للمتحدث في هذه الشريحة — تقدر تضيفها من الواجهة المفصلة.';
    notes.classList.toggle('empty', !n); notes.classList.toggle('hidden', !notesOn || land);
    prev.disabled = k === 0; next.disabled = k === S.length - 1;
  };
  const step = d => { k = Math.max(0, Math.min(S.length - 1, k + d)); draw(); };
  prev.onclick = () => step(-1); next.onclick = () => step(1);
  nb.onclick = () => { notesOn = !notesOn; draw(); };
  let x0 = null, y0 = null;
  box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  box.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx > 0 ? 1 : -1); });
  box.addEventListener('click', e => { const r = box.getBoundingClientRect(); step(e.clientX < r.left + r.width / 2 ? 1 : -1); });
  const onR = () => setTimeout(draw, 120);
  const close = () => { removeEventListener('resize', onR); ov.remove(); document.body.classList.remove('noscroll'); };
  addEventListener('resize', onR);
  document.body.append(ov); document.body.classList.add('noscroll'); draw();
}

/* ---------- slideshow ---------- */
function startShow() {
  if (!ST.model) return;
  let i = ST.act;
  const ov = el('div', { id: 'show' }, el('button', { class: 'x', onclick: () => close() }, '×'));
  const box = el('div');
  ov.append(box);
  const draw = () => { const w = Math.min(innerWidth, innerHeight * 16 / 9); drawSlide(box, w, ST.layouts[i], { i }); };
  const key = e => { if (['ArrowLeft', 'PageDown', ' ', 'Enter'].includes(e.key)) { i = Math.min(ST.model.slides.length - 1, i + 1); draw(); } if (['ArrowRight', 'PageUp', 'Backspace'].includes(e.key)) { i = Math.max(0, i - 1); draw(); } if (e.key === 'Escape') close(); };
  const close = () => { document.removeEventListener('keydown', key); ov.remove(); if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); };
  ov.addEventListener('click', e => { if (e.target.closest('.x')) return; i = Math.min(ST.model.slides.length - 1, i + 1); draw(); });
  document.addEventListener('keydown', key);
  document.body.append(ov); draw();
  if (ov.requestFullscreen) ov.requestFullscreen().then(() => setTimeout(draw, 120)).catch(() => { });
}
$('#bShow').onclick = () => isPhone() ? phoneShow() : startShow();
$('#bStory').onclick = () => openStory();
$('#s3story').onclick = () => openStory();
$('#s3show').onclick = () => isPhone() ? phoneShow() : startShow();
$('#s3lib').onclick = () => openPhotoLib();

/* ---------- export ---------- */
$('#bExport').onclick = () => exportDeck();
async function exportDeck() {
  if (!ST.model) return toast('افتح عرض أولاً');
  if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
  relayout();
  const errs = ST.checks.filter(c => c.level === 'error');
  if (errs.length && !confirm('المدقق لقى ' + errs.length + ' ملاحظة مهمة. تبي تصدّر الآن؟')) return;
  const done = busy('أبني ملف PowerPoint…');
  try {
    const lg = lang();
    const keep = ST.model.slides.map((s, i) => [s, ST.layouts[i]]).filter(([s]) => !s.skip);
    const bytes = await buildDeck({ JSZip, templateBytes: b64ToBytes(TEMPLATES[tplLang(lg)]), model: { lang: lg, slides: keep.map(x => x[0]) }, assets: ST.assets, parsed: ST.parsed, prims: keep.map(x => x[1]), opts: { fonts: OPT.fonts }, parser: new DOMParser(), getIcon });
    if (await saveFile(ST.name + ' — مطارات جدة.pptx', new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }))) toast('تم التصدير ✓');
  } catch (e) { console.error(e); toast('تعذر التصدير: ' + e.message, 5000); }
  done();
}

/* ---------- PDF: every slide on its own 16:9 page through the browser's "Save as PDF" (works offline, text stays sharp) ---------- */
$('#s3pdf').onclick = $('#bPdf').onclick = () => exportPdf();
async function exportPdf() {
  if (!ST.model) return toast('افتح عرض أولاً');
  if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
  relayout();
  const done = busy('أجهّز ملف PDF…');
  const root = $('#printRoot'); root.innerHTML = '';
  ST.model.slides.forEach((s, i) => { if (s.skip) return; const pg = el('div', { class: 'pg' }); root.append(pg); drawSlide(pg, 960, ST.layouts[i], { i }); pg.classList.remove('sbox'); });
  // wait for every picture to load before printing
  const urls = [...root.querySelectorAll('.im')].map(d => (d.style.backgroundImage.match(/url\("?(.*?)"?\)/) || [])[1]).filter(Boolean);
  const bgs = [...root.querySelectorAll('.slide')].map(d => (d.style.backgroundImage.match(/url\("?(.*?)"?\)/) || [])[1]).filter(Boolean);
  await Promise.all([...new Set(urls.concat(bgs))].map(u => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = u; })));
  await Promise.all([...root.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
  await (document.fonts ? document.fonts.ready : Promise.resolve());
  done();
  const old = document.title; document.title = ST.name + ' — مطارات جدة';
  setTimeout(() => {
    window.print();
    document.title = old;
    setTimeout(() => { root.innerHTML = ''; }, 1000);
  }, 120);
  toast('اختر «حفظ بصيغة PDF» من نافذة الطباعة', 4000);
}

/* ---------- mode switch & boot ---------- */
$$('.modeSw button').forEach(b => b.onclick = () => { ST.mode = b.dataset.m; save(); if (ST.mode === 'simple' && ST.model && ST.built !== false) ST.step = ST.model ? 3 : 1; ST.sel = null; render(); });
/* ---------- phone / computer ---------- */
function isPhone() { return ST.device === 'phone' || (ST.device !== 'desktop' && Math.min(window.innerWidth, screen.width || 9999) <= 820); }
function applyDevice() {
  const ph = isPhone();
  document.body.classList.toggle('phone', ph);
  const vp = document.querySelector('meta[name=viewport]');
  if (vp) vp.setAttribute('content', !ph && ST.device === 'desktop' && screen.width <= 820 ? 'width=1280' : 'width=device-width, initial-scale=1');
  $$('.devSw button').forEach(b => b.classList.toggle('on', b.dataset.d === (ph ? 'phone' : 'desktop')));
}
$$('.devSw button').forEach(b => b.onclick = () => { ST.device = b.dataset.d; save(); applyDevice(); render(); setTimeout(render, 80); });
function renderPbar() {
  const bar = $('#pbar'); bar.innerHTML = '';
  if (!isPhone() || ST.mode !== 'simple') return;
  const btn = (txt, cls, fn, dis) => el('button', { class: 'btn ' + cls, onclick: fn, disabled: dis ? true : null }, txt);
  if (ST.step === 1) bar.append(btn('التالي: ارفع ملفك ←', 'pri', () => $('#s1next').click()));
  else if (ST.step === 2) bar.append(btn('رجوع', 'ghost', () => $('#s2back').click()), btn(ST.src ? 'ابنِ العرض ✦' : 'اختر ملفك أولاً', 'pri', () => $('#s2build').click(), $('#s2build').disabled));
  else if (ST.step === 3) bar.append(btn('▶ عرض', 'ghost', () => phoneShow()), btn('PDF', 'ghost', () => exportPdf()), btn('تصدير PowerPoint', 'pri', () => exportDeck()));
}
window.addEventListener('resize', () => { const was = document.body.classList.contains('phone'); applyDevice(); if (was !== isPhone()) render(); });
let PICKED = false;
function render() {
  if (!PICKED) return;
  applyDevice();
  if (isPhone() && ST.mode === 'detail') ST.mode = 'simple';
  document.body.classList.toggle('mode-s', ST.mode === 'simple');
  $$('.modeSw button').forEach(b => b.classList.toggle('on', b.dataset.m === ST.mode));
  $$('.sOnly').forEach(x => x.classList.toggle('hidden', ST.mode !== 'simple'));
  $$('.dOnly').forEach(x => x.classList.toggle('hidden', ST.mode !== 'detail'));
  $('#simple').classList.toggle('hidden', ST.mode !== 'simple');
  $('#detail').classList.toggle('hidden', ST.mode !== 'detail');
  if (ST.mode === 'simple') renderSimple(); else renderDetail();
}


/* =========================================================
   ملفاتي — every deck is kept in this browser and saved automatically
   ========================================================= */
const FILES = { db: null, last: '', busy: false };
function fDB() {
  if (FILES.db) return Promise.resolve(FILES.db);
  return new Promise(res => { try { const r = indexedDB.open('saneaFiles', 1); r.onupgradeneeded = () => r.result.createObjectStore('f', { keyPath: 'id' }); r.onsuccess = () => res(FILES.db = r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
}
const fTx = (mode, fn) => fDB().then(db => db ? new Promise(res => { try { const t = db.transaction('f', mode), st = t.objectStore('f'); const q = fn(st); t.oncomplete = () => res(q && q.result); t.onerror = () => res(null); } catch (e) { res(null); } }) : null);
function fileSnap() { return ST.model ? JSON.stringify(ST.model) + '|' + ST.theme + '|' + ST.name + '|' + JSON.stringify(OPT.bg) : ''; }
async function saveToFiles(manual) {
  if (!ST.model || FILES.busy) return;
  const snap = fileSnap(); if (!manual && snap === FILES.last) return;
  FILES.busy = true;
  try {
    if (!ST.fileId) ST.fileId = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const user = {};
    for (const [id, a] of Object.entries(ST.assets)) if (!id.startsWith('stock:') && !id.startsWith('my:') && a.bytes && a.kind !== 'chart') user[id] = { kind: a.kind, ext: a.ext, bytes: a.bytes, size: a.size };
    const cover = ST.model.slides.find(s => s.type === 'cover') || ST.model.slides[0] || {};
    const rec = { id: ST.fileId, name: ST.name || cover.title || 'عرض', title: cover.title || '', updated: Date.now(), theme: ST.theme, bg: OPT.bg, n: ST.model.slides.length, lang: ST.model.lang, model: ST.model, naming: ST.naming, user, src: ST.src && ST.src.kind === 'pptx' ? ST.src.bytes : null };
    const ok = await fTx('readwrite', st => st.put(rec));
    FILES.last = snap;
    const mark = $('#fSaved'); if (mark) { mark.textContent = ok === null ? '' : 'محفوظ ✓'; mark.classList.add('flash'); setTimeout(() => mark.classList.remove('flash'), 900); }
    if (manual) toast(ok === null ? 'المتصفح ما سمح بالحفظ هنا — احفظ المشروع كملف من «ملف»' : 'انحفظ في «ملفاتي» ✓');
  } finally { FILES.busy = false; }
}
setInterval(() => saveToFiles(false), 6000);
addEventListener('pagehide', () => saveToFiles(false));
async function openFromFiles(id) {
  const rec = await fTx('readonly', st => st.get(id)); if (!rec) return toast('ما لقيت الملف');
  const done = busy('أفتح الملف…');
  try {
    for (const k of Object.keys(ST.assets)) if (!k.startsWith('stock:') && !k.startsWith('my:')) delete ST.assets[k];
    ST.parsed = null; ST.src = null;
    if (rec.src) { const buf = rec.src; const parsed = await parsePptx(await JSZip.loadAsync(buf)); const r = analyzeDeck(parsed); Object.assign(ST.assets, r.assets); await prepareAssets(ST.assets, parsed); ST.parsed = parsed; ST.src = { kind: 'pptx', bytes: buf, name: rec.name, text: null }; }
    for (const [aid, a] of Object.entries(rec.user || {})) ST.assets[aid] = { kind: a.kind, ext: a.ext, bytes: a.bytes, size: a.size || imgSize(a.bytes, a.ext) };
    ST.model = rec.model; ST.naming = rec.naming || { changes: [], flags: [] }; ST.name = rec.name; ST.fileId = rec.id;
    if (rec.theme && THEMES[rec.theme]) ST.theme = rec.theme; if (rec.bg) OPT.bg = rec.bg;
    ST.undo = []; ST.redo = []; ST.act = 0; ST.sel = null; ST.multi = null; ST.built = true; ST.base = clone(rec.model); ST.seed = 1;
    relayout(); if (ST.mode === 'simple') ST.step = 3; FILES.last = fileSnap(); render();
    toast('فتحت «' + rec.name + '»');
  } catch (e) { console.error(e); toast('تعذر فتح الملف: ' + e.message, 5000); }
  done();
}
async function openFiles() {
  await saveToFiles(false);
  const list = (await fTx('readonly', st => st.getAll())) || [];
  list.sort((a, b) => b.updated - a.updated);
  const body = el('div', { class: 'files' });
  const fmt = t => { const d = new Date(t); return d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); };
  if (!list.length) body.append(el('p', { class: 'note' }, 'ما فيه ملفات محفوظة بعد. أي عرض تبنيه ينحفظ هنا تلقائيًا، وتقدر ترجع له في أي وقت من نفس الجهاز والمتصفح.'));
  const grid = el('div', { class: 'fgrid' }); body.append(grid);
  for (const r of list) {
    const lt = el('div', { class: 'fth' });
    const nm = el('input', { value: r.name, title: 'اسم الملف' });
    nm.onchange = async () => { r.name = nm.value.trim() || r.name; await fTx('readwrite', st => st.put(r)); if (r.id === ST.fileId) ST.name = r.name; };
    const card = el('div', { class: 'fcard' + (r.id === ST.fileId ? ' cur' : '') }, lt, nm,
      el('div', { class: 'fmeta' }, el('span', { class: 'num' }, String(r.n)), ' شريحة · ', { formal: 'رسمي', practical: 'عملي', creative: 'إبداعي' }[r.theme] || '', ' · ', el('span', { class: 'num' }, fmt(r.updated))),
      el('div', { class: 'fbtns' },
        el('button', { class: 'btn pri sm', onclick: () => { ov.remove(); openFromFiles(r.id); } }, 'فتح'),
        el('button', { class: 'btn ghost sm', onclick: async () => { const c = Object.assign({}, r, { id: 'f' + Date.now().toString(36), name: r.name + ' (نسخة)', updated: Date.now() }); await fTx('readwrite', st => st.put(c)); ov.remove(); openFiles(); } }, 'نسخة'),
        el('button', { class: 'btn ghost sm', style: 'color:var(--err)', onclick: async () => { if (!confirm('تحذف «' + r.name + '» نهائيًا؟')) return; await fTx('readwrite', st => st.delete(r.id)); if (r.id === ST.fileId) ST.fileId = null; card.remove(); } }, 'حذف')));
    grid.append(card);
    requestAnimationFrame(() => { try { const s0 = r.model.slides[0]; const L0 = layoutThemed(s0, r.model.lang, Object.assign({}, OPT, { bg: r.bg || OPT.bg }), r.theme || 'formal', { page: 1, total: r.n }); drawSlide(lt, lt.clientWidth, L0, { model: { lang: r.model.lang, slides: [s0] }, i: 0 }); } catch (e) { } });
  }
  const foot = el('div', { style: 'display:flex;gap:8px;align-items:center;width:100%' },
    el('span', { class: 'note', style: 'flex:1;margin:0' }, 'الحفظ تلقائي كل ثواني. الملفات تبقى في هذا الجهاز والمتصفح — لنقلها لجهاز ثاني استخدم «حفظ المشروع».'),
    ST.model ? el('button', { class: 'btn pri sm', onclick: () => saveToFiles(true) }, 'احفظ الآن') : '');
  const ov = modal('ملفاتي', body, foot);
}
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.code === 'KeyS') { e.preventDefault(); if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur(); setTimeout(() => saveToFiles(true), 0); } });

/* =========================================================
   الوضع الداكن + اللمبة المعلّقة
   - the lamp drops in smoothly, the pull cord switches it on/off
   - off: deep navy room · on: the navy lights up with a warm glow
   - drag the shade left/right across the whole width (it swings)
   ========================================================= */
const LAMP = (() => { let st = { dark: false, lit: true, x: 0.82 }; try { Object.assign(st, JSON.parse(localStorage.getItem('saneaAlOrood.lamp') || '{}')); } catch (e) { } return st; })();
const lampSave = () => { try { localStorage.setItem('saneaAlOrood.lamp', JSON.stringify(LAMP)); } catch (e) { } };
function lampBuild() {
  if ($('#lamp')) return $('#lamp');
  const glow = el('div', { id: 'lampGlow' }); document.body.prepend(glow);
  const lamp = el('div', { id: 'lamp' });
  lamp.innerHTML = `<div class="dropper"><div class="sw"><div class="cord"></div>
    <svg class="shade" viewBox="0 0 80 56"><defs><linearGradient id="lsh" x1="0" x2="1"><stop offset="0" stop-color="#0B1B3B"/><stop offset=".45" stop-color="#2B4A80"/><stop offset="1" stop-color="#0B1B3B"/></linearGradient></defs>
      <rect x="35" y="0" width="10" height="9" rx="2" fill="#1B2F55"/><path d="M8 40 C10 18 24 8 40 8 C56 8 70 18 72 40 Z" fill="url(#lsh)"/><path d="M6 40h68" stroke="#6F8FBF" stroke-width="2" stroke-linecap="round"/>
      <circle class="bulb" cx="40" cy="44" r="9" fill="#55688c"/></svg>
    <div class="pull" title="اسحب الحبل"><i></i><b></b></div></div></div>`;
  document.body.append(lamp);
  const sw = lamp.querySelector('.sw'), shade = lamp.querySelector('.shade'), pull = lamp.querySelector('.pull');
  const place = () => document.documentElement.style.setProperty('--lx', (LAMP.x * 100).toFixed(2) + '%');
  place();
  // drag the lamp sideways — it swings with the movement and settles when you let go
  let drag = null;
  shade.addEventListener('pointerdown', e => { e.preventDefault(); shade.setPointerCapture(e.pointerId); drag = { x: e.clientX, t: performance.now(), v: 0 }; sw.classList.add('drag'); });
  shade.addEventListener('pointermove', e => {
    if (!drag) return;
    const now = performance.now(), dx = e.clientX - drag.x, dt = Math.max(8, now - drag.t);
    drag.v = drag.v * 0.6 + (dx / dt) * 0.4; drag.x = e.clientX; drag.t = now;
    LAMP.x = Math.min(0.97, Math.max(0.03, e.clientX / innerWidth)); place();
    sw.style.transform = `rotate(${Math.max(-28, Math.min(28, -drag.v * 14))}deg)`;
  });
  const end = () => { if (!drag) return; sw.classList.remove('drag'); const kick = Math.max(-22, Math.min(22, drag.v * 10)); sw.style.transform = `rotate(${kick}deg)`; requestAnimationFrame(() => requestAnimationFrame(() => { sw.style.transform = 'rotate(0deg)'; })); drag = null; lampSave(); };
  shade.addEventListener('pointerup', end); shade.addEventListener('pointercancel', end);
  // the pull cord: tug it down (or tap) to switch the light
  let tug = null;
  pull.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); pull.setPointerCapture(e.pointerId); tug = { y: e.clientY, d: 0 }; pull.classList.add('tug'); });
  pull.addEventListener('pointermove', e => { if (!tug) return; tug.d = Math.max(0, Math.min(36, e.clientY - tug.y)); pull.style.setProperty('--pl', (44 + tug.d) + 'px'); });
  const rel = () => { if (!tug) return; pull.classList.remove('tug'); pull.style.setProperty('--pl', '44px'); const fire = tug.d > 10 || tug.d === 0; tug = null; if (fire) { LAMP.lit = !LAMP.lit; lampApply(); lampSave(); sw.style.transform = 'rotate(3deg)'; requestAnimationFrame(() => requestAnimationFrame(() => { sw.style.transform = 'rotate(0deg)'; })); } };
  pull.addEventListener('pointerup', rel); pull.addEventListener('pointercancel', rel);
  return lamp;
}
function lampApply() {
  document.body.classList.toggle('dark', LAMP.dark);
  document.body.classList.toggle('lit', LAMP.dark && LAMP.lit);
  $('#bLamp').classList.toggle('on', LAMP.dark);
}
function setDark(on) {
  LAMP.dark = on; lampSave();
  if (on) { const l = lampBuild(); l.classList.remove('up'); const d = l.querySelector('.dropper'); d.style.animation = 'none'; d.offsetHeight; d.style.animation = ''; lampApply(); }
  else { const l = $('#lamp'); lampApply(); if (l) { l.classList.add('up'); setTimeout(() => { if (!LAMP.dark) { l.remove(); const g = $('#lampGlow'); if (g) g.remove(); } }, 650); } }
}
$('#bLamp').onclick = () => setDark(!LAMP.dark);
$('#bFiles').onclick = () => openFiles();
$('#bNews').onclick = () => openNews();
['#bImport', '#bStory', '#bCheck', '#bShow', '#bPdf'].forEach(q => { const b = $(q); if (b && !b.title) b.title = b.textContent.trim(); });
if (LAMP.dark) setDark(true);

/* first screen: choose the device, then the tool loads */
plLoad();
function showPick() {
  const ov = $('#devPick');
  $('#dpLogo').innerHTML = LOGO;
  $('#dpSig').textContent = sig;
  const last = ST.device;
  $('#dpWait').remove(); const g = $('#devPick .dpb'); g.style.opacity = ''; g.style.pointerEvents = '';
  $$('#devPick button[data-d]').forEach(b => { b.classList.toggle('last', b.dataset.d === last); b.onclick = () => { ST.device = b.dataset.d; save(); PICKED = true; document.body.classList.add('picked'); ov.remove(); applyDevice(); render(); }; });
}
showPick();
window.__ST = ST;
})();
