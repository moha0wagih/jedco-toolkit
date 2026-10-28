/* =====================================================================
   استوديو الطبقات — Layers Studio for «مصمم التواصل الداخلي»
   Every element of a design becomes its own layer (text, image, shape, icon, group)
   with a Photoshop-style layers panel. Works fully offline.
   Designed by Mohammed Wagih · 2026
   ===================================================================== */
(function () {
  'use strict';
  /* ---------------- helpers ---------------- */
  const q = id => document.getElementById(id);
  const IC = (n, sw) => svgIcon(n, sw || 1.9);
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const ESC = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const uid = () => 'L' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
  const R2 = v => Math.round(v * 100) / 100;
  const R1 = v => Math.round(v * 10) / 10;
  const CL = o => JSON.parse(JSON.stringify(o));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const MOD = e => e.metaKey || e.ctrlKey;
  const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const K = k => (MAC ? '⌘' : 'Ctrl+') + k;
  const FONTS = [['Tajawal', 'Tajawal · للعربي'], ['Sequel', 'Sequel · الأرقام والعناوين الإنجليزية'], ['FSI', 'FS Industrie · النص الإنجليزي']];
  const BRAND = ['#002657', '#004EAA', '#183990', '#62B6F3', '#009CA5', '#2FC0C7', '#00B2BA', '#FC5C17', '#D6D9D4', '#EEF2F6', '#5B6B82', '#FFFFFF', '#000000'];
  const BRAND_OK = BRAND.concat(['#F5C400', '#E8EEF5', '#F4F8FD', '#41536E', '#7A8AA3', '#CFD8E3', '#DCE3EC']);
  const TYPE_AR = { text: 'نص', image: 'صورة', shape: 'شكل', svg: 'أيقونة', group: 'مجموعة' };
  const TYPE_IC = { text: 'type', image: 'image', shape: 'square', svg: 'shapes', group: 'folder' };
  const toHex = c => { if (!c) return c; const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return c; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); if (p.length > 3 && p[3] < 1) return `rgba(${p[0]},${p[1]},${p[2]},${R2(p[3])})`; return '#' + p.slice(0, 3).map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase(); };
  const rgbOf = c => { c = toHex(c) || ''; let m = c.match(/^#([0-9a-f]{6})$/i); if (m) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16)); m = c.match(/rgba\(([^)]+)\)/); if (m) return m[1].split(',').slice(0, 3).map(Number); return null; };
  const cdist = (a, b) => { const x = rgbOf(a), y = rgbOf(b); if (!x || !y) return 999; return Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2); };
  const nearBrand = c => BRAND.reduce((best, b) => cdist(c, b) < cdist(c, best) ? b : best, BRAND[0]);
  const alphaOf = c => { const m = String(c || '').match(/rgba\([^)]*,\s*([\d.]+)\s*\)/); return m ? +m[1] : (c === 'transparent' ? 0 : 1); };
  const px = v => parseFloat(v) || 0;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  /* move / scale a clip-path shape: x' = x*sx + dx, y' = y*sy + dy (path() and polygon() in px) */
  function clipXform(c, sx, sy, dx, dy) {
    if (!c) return c; const f = v => R2(v);
    let m = c.match(/^path\(\s*["']([^"']*)["']\s*\)$/);
    if (m) {
      const tok = m[1].match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || []; let out = [], cmd = '', i = 0, first = true;
      const take = () => parseFloat(tok[i++]);
      while (i < tok.length) {
        if (/[a-z]/i.test(tok[i])) { cmd = tok[i++]; out.push(cmd); if (/z/i.test(cmd)) continue; }
        const abs = cmd === cmd.toUpperCase() || (first && cmd === 'm'); const X = v => abs ? v * sx + dx : v * sx, Y = v => abs ? v * sy + dy : v * sy;
        const C = cmd.toUpperCase(); if (C === 'H') out.push(f(X(take()))); else if (C === 'V') out.push(f(Y(take()))); else if (C === 'A') { const rx = take(), ry = take(), ro = take(), la = take(), sw = take(), x = take(), y = take(); out.push(f(rx * sx), f(ry * sy), ro, la, sw, f(X(x)), f(Y(y))); }
        else { const n = C === 'C' ? 3 : (C === 'S' || C === 'Q') ? 2 : 1; for (let k = 0; k < n; k++) { const x = take(), y = take(); out.push(f(X(x)), f(Y(y))); } }
        first = false; if (cmd === 'm') cmd = 'l'; if (cmd === 'M') cmd = 'L';
      }
      return `path("${out.join(' ')}")`;
    }
    m = c.match(/^polygon\((.*)\)$/);
    if (m && !/%/.test(m[1])) { return 'polygon(' + m[1].split(',').map(pt => { const [a, b] = pt.trim().split(/\s+/); return `${f(px(a) * sx + dx)}px ${f(px(b) * sy + dy)}px`; }).join(', ') + ')'; }
    return c;
  }

  /* ---------------- state ---------------- */
  const L = { pick: (() => { try { return localStorage.getItem('jedLX_pick') || 'layer'; } catch (e) { return 'layer'; } })(), on: false, doc: null, A: {}, AI: new Map(), an: 0, sel: [], ctx: null, z: 1, hist: [], hi: -1, idx: new Map(), cache: new Map(), editing: null, crop: null, clip: null, dirty: false, libId: null, open: {}, space: false, drag: null, hover: null, aiMode: false, ai: {} };
  window.__LX = L;
  function putAsset(src) { if (!src) return ''; if (/^@a/.test(src)) return src; if (L.AI.has(src)) return L.AI.get(src); const k = '@a' + (++L.an).toString(36) + Math.random().toString(36).slice(2, 5); L.A[k] = src; L.AI.set(src, k); return k; }
  const assetSrc = k => (k && L.A[k]) || k || '';
  function setAssets(obj) { L.A = {}; L.AI = new Map(); L.an = 0; Object.entries(obj || {}).forEach(([k, v]) => { if (typeof v === 'string' && /^@a/.test(k)) { L.A[k] = v; L.AI.set(v, k); } }); }

  /* ---------------- tree index + geometry ---------------- */
  function reindex() { L.idx.clear(); const walk = (arr, par) => arr.forEach(l => { L.idx.set(l.id, { l, par, arr }); if (l.type === 'group') walk(l.children, l); }); walk(L.doc.layers, null); }
  const get = id => (L.idx.get(id) || {}).l || null;
  const parentOf = id => (L.idx.get(id) || {}).par || null;
  const arrOf = id => (L.idx.get(id) || {}).arr || null;
  function ancestors(id) { const out = []; let p = parentOf(id); while (p) { out.unshift(p); p = parentOf(p.id); } return out; }
  const isIn = (id, gid) => ancestors(id).some(g => g.id === gid);
  function leaves(l, out = []) { if (l.type === 'group') l.children.forEach(c => leaves(c, out)); else out.push(l); return out; }
  function all(out = []) { const w = arr => arr.forEach(l => { out.push(l); if (l.type === 'group') w(l.children); }); w(L.doc.layers); return out; }
  function flatOrder() { const o = new Map(); let i = 0; const w = arr => arr.forEach(l => { o.set(l.id, i++); if (l.type === 'group') w(l.children); }); w(L.doc.layers); return o; }
  const effHidden = l => l.hidden || ancestors(l.id).some(g => g.hidden);
  const effLocked = l => l.locked || ancestors(l.id).some(g => g.locked);
  function corners(l) { const cx = l.x + l.w / 2, cy = l.y + l.h / 2, a = (l.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [cx + (u * l.w / 2) * c - (v * l.h / 2) * s, cy + (u * l.w / 2) * s + (v * l.h / 2) * c]); }
  function union(bs) { bs = bs.filter(Boolean); if (!bs.length) return null; const x = Math.min(...bs.map(b => b.x)), y = Math.min(...bs.map(b => b.y)); return { x, y, w: Math.max(...bs.map(b => b.x + b.w)) - x, h: Math.max(...bs.map(b => b.y + b.h)) - y }; }
  function aabb(l, incHidden) {
    if (!l) return null;
    if (l.type === 'group') { let k = l.children.filter(c => incHidden || !c.hidden); if (!k.length) k = l.children; return union(k.map(c => aabb(c, incHidden))); }
    if (!l.rot) return { x: l.x, y: l.y, w: l.w, h: l.h };
    const p = corners(l); const xs = p.map(v => v[0]), ys = p.map(v => v[1]); const x = Math.min(...xs), y = Math.min(...ys); return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  const topSel = () => { const s = L.sel.map(get).filter(Boolean); return s.filter(l => !s.some(o => o !== l && o.type === 'group' && isIn(l.id, o.id))); };
  const selBox = () => union(topSel().map(l => aabb(l)));
  const textOf = l => { if (!l) return ''; if (l.type === 'text') { const t = document.createElement('div'); t.innerHTML = l.html; return t.textContent.replace(/\s+/g, ' ').trim(); } if (l.type === 'group') { const ts = l.children.map(textOf).filter(Boolean); return ts.find(t => /[\p{L}\d]{2}/u.test(t)) || ts[0] || ''; } return ''; };
  function nameOf(l) { if (l.name) return l.name; if (l.type === 'text') return textOf(l).slice(0, 40) || 'نص'; if (l.type === 'group') { const t = textOf(l); if (t) return 'مجموعة · ' + t.slice(0, 26); const f = leaves(l).find(c => c.type === 'image' || c.type === 'svg'); return f ? 'مجموعة · ' + (f.name || TYPE_AR[f.type]) : 'مجموعة'; } return TYPE_AR[l.type] || 'طبقة'; }

  /* ---------------- render ---------------- */
  const PG = () => q('lxPage');
  function shapeCss(l) {
    const r = l.rad || [0, 0, 0, 0]; const bg = [l.grad, l.fill && l.fill !== 'transparent' ? l.fill : ''].filter(Boolean);
    let s = `background:${bg.length ? (l.grad ? l.grad + (l.fill && l.fill !== 'transparent' ? ',' + l.fill : '') : l.fill) : 'transparent'};`;
    if (l.shape === 'ellipse') s += 'border-radius:50%;'; else s += `border-radius:${r.map(v => typeof v === 'number' ? v + 'px' : v).join(' ')};`;
    const bd = l.bd; if (bd) ['top', 'right', 'bottom', 'left'].forEach((k, i) => { const b = bd[i]; if (b && b.w > 0) s += `border-${k}:${b.w}px ${b.s || 'solid'} ${b.c};`; });
    if (l.clip) s += `clip-path:${l.clip};-webkit-clip-path:${l.clip};`;
    return s;
  }
  function textCss(l) {
    const t = l.st || {}; const p = t.pad || [0, 0, 0, 0];
    return `font-family:${t.ff || 'Tajawal'};font-size:${t.fs || 16}px;font-weight:${t.fw || 400};font-style:${t.fst || 'normal'};color:${t.col || '#002657'};text-align:${t.ta || 'right'};${t.tal ? 'text-align-last:' + t.tal + ';' : ''}line-height:${t.lh ? t.lh : 'normal'};letter-spacing:${t.ls ? t.ls + 'px' : 'normal'};${t.wsp ? 'word-spacing:' + t.wsp + 'px;' : ''}direction:${t.dir || 'rtl'};white-space:${t.ws || 'normal'};overflow-wrap:break-word;${t.tt ? 'text-transform:' + t.tt + ';' : ''}${t.td && t.td !== 'none' ? 'text-decoration:' + t.td + ';' : ''}${t.ti ? 'text-indent:' + t.ti + 'px;' : ''}padding:${p.map(v => v + 'px').join(' ')};${t.bg ? 'background:' + t.bg + ';' : ''}${t.xs ? '-webkit-text-stroke:' + t.xs + ';' : ''}`;
  }
  function build(l, cache, live) {
    let el = cache.get(l.id);
    const want = l.type === 'group' ? 'G' : l.type;
    if (el && el._t !== want) { el.remove(); el = null; }
    if (!el) { el = document.createElement('div'); el._t = want; el.dataset.id = l.id; if (l.type === 'image') el.appendChild(document.createElement('img')); cache.set(l.id, el); }
    const hid = live ? l.hidden : l.hidden, lk = live && l.locked;
    if (l.type === 'group') {
      const cls = 'lxG' + (hid ? ' hid' : '') + (lk ? ' lk' : ''); if (el.className !== cls) el.className = cls;
      const css = `opacity:${l.op ?? 1};`; if (el._css !== css) { el.style.cssText = css; el._css = css; }
      return el;
    }
    const cls = 'lxL lx' + l.type[0].toUpperCase() + (hid ? ' hid' : '') + (lk ? ' lk' : ''); if (el.className !== cls) el.className = cls;
    let css = `left:${R2(l.x)}px;top:${R2(l.y)}px;width:${l.type === 'text' && l.aw ? 'max-content' : R2(l.w) + 'px'};${l.type === 'text' && l.ah !== false ? 'height:auto;' : `height:${R2(l.h)}px;`}${l.rot ? `transform:rotate(${R2(l.rot)}deg);` : ''}${(l.op ?? 1) < 1 ? `opacity:${l.op};` : ''}${l.mix ? `mix-blend-mode:${l.mix};` : ''}`;
    if (l.type === 'text') css += textCss(l) + (l.clip ? `clip-path:${l.clip};` : '');
    else if (l.type === 'shape') css += shapeCss(l);
    else if (l.type === 'image') { const r = l.rad || [0, 0, 0, 0]; css += `border-radius:${r.map(v => typeof v === 'number' ? v + 'px' : v).join(' ')};${l.clip ? `clip-path:${l.clip};` : ''}${l.bd && l.bd.w ? `outline:${l.bd.w}px solid ${l.bd.c};outline-offset:-${l.bd.w}px;` : ''}`; }
    else if (l.type === 'svg') css += `color:${l.col || '#004EAA'};${l.clip ? `clip-path:${l.clip};` : ''}`;
    if (el._css !== css) { el.style.cssText = css; el._css = css; }
    if (l.type === 'text') { if (el._h !== l.html && L.editing !== el) { el.innerHTML = l.html; el._h = l.html; } }
    else if (l.type === 'image') {
      const im = el.firstChild; const s = assetSrc(l.src); if (im._s !== s) { im.src = s; im._s = s; im.alt = ''; im.draggable = false; }
      const ic = `left:${R2(l.ix)}px;top:${R2(l.iy)}px;width:${R2(l.iw)}px;height:${R2(l.ih)}px;${l.fx || l.fy ? `transform:scale(${l.fx ? -1 : 1},${l.fy ? -1 : 1});` : ''}${l.filt ? `filter:${l.filt};` : ''}`;
      if (im._css !== ic) { im.style.cssText = ic; im._css = ic; }
    } else if (l.type === 'svg') { if (el._h !== l.svg) { el.innerHTML = l.svg; el._h = l.svg; } }
    return el;
  }
  function paintInto(container, layers, cache, live) {
    const seen = new Set();
    const place = (arr, parent) => { let i = 0; for (const l of arr) { const el = build(l, cache, live); seen.add(l.id); if (parent.children[i] !== el) parent.insertBefore(el, parent.children[i] || null); i++; if (l.type === 'group') place(l.children, el); } while (parent.children.length > i) { const x = parent.children[i]; if (x.dataset && x.dataset.id && !seen.has(x.dataset.id)) { cache.delete(x.dataset.id); } x.remove(); } };
    place(layers, container);
    for (const [id, el] of cache) if (!seen.has(id)) { el.remove(); cache.delete(id); }
  }
  function measureTexts(cache, layers) {
    const out = []; const w = arr => arr.forEach(l => { if (l.type === 'group') w(l.children); else if (l.type === 'text') { const el = cache.get(l.id); if (el && !l.hidden) out.push([l, el]); } }); w(layers);
    let moved = false;
    out.forEach(([l, el]) => {
      if (l.aw) { const nw = el.offsetWidth; if (nw && Math.abs(nw - l.w) > .2) { const ta = (l.st && l.st.ta) || 'right'; if (ta === 'center') l.x += (l.w - nw) / 2; else if (ta === 'right' || (ta === 'justify' && l.st.dir !== 'ltr')) l.x += l.w - nw; l.w = nw; moved = true; } }
      if (l.ah !== false) { const h = el.offsetHeight; if (h && Math.abs(h - l.h) > .2) l.h = h; }
      else if (!l.clip) { const fixed = el.style.height; el.style.height = 'auto'; const need = el.offsetHeight; el.style.height = fixed; if (need && need > l.h + .5) { l.h = R2(need); moved = true; } }
    });
    return moved;
  }
  let rafP = 0;
  function paint(now) { if (!L.on) return; if (!now) { if (!rafP) rafP = requestAnimationFrame(() => { rafP = 0; paint(true); }); return; } const pg = PG(); pg.style.width = L.doc.w + 'px'; pg.style.height = L.doc.h + 'px'; pg.style.background = L.doc.bg || '#fff'; paintInto(pg, L.doc.layers, L.cache, true); if (measureTexts(L.cache, L.doc.layers)) paintInto(pg, L.doc.layers, L.cache, true); sizeStage(); drawOv(); }

  /* ---------------- stage / zoom ---------------- */
  function sizeStage() { const h = q('lxHost'), pad = q('lxPad'), wr = q('lxWrap'); const M = 80; const pw = L.doc.w * L.z, ph = L.doc.h * L.z; const ox = Math.max(M, (h.clientWidth - pw) / 2), oy = Math.max(M, (h.clientHeight - ph) / 2); pad.style.width = (pw + ox * 2) + 'px'; pad.style.height = (ph + oy * 2) + 'px'; wr.style.left = ox + 'px'; wr.style.top = oy + 'px'; PG().style.transform = `scale(${L.z})`; q('lxZl') && (q('lxZl').textContent = Math.round(L.z * 100) + '%'); }
  function toPg(cx, cy) { const r = PG().getBoundingClientRect(); return [(cx - r.left) / L.z, (cy - r.top) / L.z]; }
  function setZoom(z, cx, cy) { const h = q('lxHost'); z = clamp(z, .05, 8); if (cx == null) { const r = h.getBoundingClientRect(); cx = r.left + h.clientWidth / 2; cy = r.top + h.clientHeight / 2; } const [px0, py0] = toPg(cx, cy); L.z = z; sizeStage(); const r = PG().getBoundingClientRect(); h.scrollLeft += (r.left + px0 * z) - cx; h.scrollTop += (r.top + py0 * z) - cy; drawOv(); }
  function fitZoom() { const h = q('lxHost'); L.z = clamp(Math.min((h.clientWidth - 60) / L.doc.w, (h.clientHeight - 60) / L.doc.h), .05, 4); sizeStage(); h.scrollLeft = (h.scrollWidth - h.clientWidth) / 2; h.scrollTop = (h.scrollHeight - h.clientHeight) / 2; drawOv(); }

  /* ---------------- overlay (selection, hover, guides) ---------------- */
  const HND = [['nw', -1, -1], ['n', 0, -1], ['ne', 1, -1], ['e', 1, 0], ['se', 1, 1], ['s', 0, 1], ['sw', -1, 1], ['w', -1, 0]];
  const CUR = { n: 'ns', s: 'ns', e: 'ew', w: 'ew', nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw' };
  function curFor(h, rot) { const order = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']; const i = order.indexOf(h); const k = (i + Math.round(((rot || 0) % 360 + 360) % 360 / 45)) % 8; return CUR[order[k]] + '-resize'; }
  function boxDiv(b, cls, rot) { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, { left: b.x * L.z + 'px', top: b.y * L.z + 'px', width: Math.max(1, b.w * L.z) + 'px', height: Math.max(1, b.h * L.z) + 'px' }); if (rot) d.style.transform = `rotate(${rot}deg)`; return d; }
  function outlineOf(l, cls) { if (l.type !== 'group' && l.rot) return boxDiv(l, cls, l.rot); const b = aabb(l); return b ? boxDiv(b, cls) : null; }
  function drawOv() {
    const ov = q('lxOv'); if (!ov) return; ov.innerHTML = '';
    if (L.hover && !L.sel.includes(L.hover) && !L.drag) { const h = get(L.hover); if (h && !effHidden(h)) { const d = outlineOf(h, 'lxHov'); d && ov.appendChild(d); } }
    const ts = topSel(); if (!ts.length) { drawGuides(ov); tbRefresh(); return; }
    if (L.crop) { tbHide(); const l = get(L.crop); if (l) { const gi = document.createElement('img'); gi.className = 'lxCropImg'; gi.src = assetSrc(l.src); const c = { x: l.x + l.ix, y: l.y + l.iy, w: l.iw, h: l.ih }; Object.assign(gi.style, { left: c.x * L.z + 'px', top: c.y * L.z + 'px', width: c.w * L.z + 'px', height: c.h * L.z + 'px' }); if (l.rot) { gi.style.transformOrigin = `${(l.w / 2 - l.ix) * L.z}px ${(l.h / 2 - l.iy) * L.z}px`; gi.style.transform = `rotate(${l.rot}deg)`; } ov.appendChild(gi); ov.appendChild(boxDiv(l, 'lxBox crop', l.rot)); } drawGuides(ov); return; }
    const single = ts.length === 1 && ts[0].type !== 'group' ? ts[0] : null;
    let box, rot = 0;
    if (single) { box = { x: single.x, y: single.y, w: single.w, h: single.h }; rot = single.rot || 0; }
    else { box = selBox(); if (!box) return; if (ts.length > 1 || ts[0].type === 'group') ts.forEach(l => { const d = outlineOf(l, 'lxOut'); d && ov.appendChild(d); }); }
    const bd = boxDiv(box, 'lxBox' + (L.editing ? ' edit' : '') + (single ? '' : ' multi'), rot); ov.appendChild(bd);
    const locked = ts.some(effLocked);
    if (!L.editing && !locked && !(L.drag && L.drag.mode === 'move')) {
      const W = box.w * L.z, H = box.h * L.z;
      HND.forEach(([k, u, v]) => {
        if ((k.length === 1) && ((u && H < 26) || (v && W < 26))) return;
        const h = document.createElement('i'); h.className = 'lxH' + (k.length === 1 ? ' side' + (v ? ' hz' : '') : ''); h.dataset.h = k; h.style.left = ((u + 1) / 2 * W) + 'px'; h.style.top = ((v + 1) / 2 * H) + 'px'; h.style.cursor = curFor(k, rot); bd.appendChild(h);
      });
      const ln = document.createElement('i'); ln.className = 'lxRotLine'; ln.style.left = W / 2 + 'px'; ln.style.top = '-22px'; ln.style.height = '22px'; bd.appendChild(ln);
      const rh = document.createElement('i'); rh.className = 'lxRot'; rh.dataset.h = 'rot'; rh.title = 'تدوير (Shift للقفز كل 15°)'; rh.innerHTML = IC('rotate-cw', 2.2); rh.style.left = W / 2 + 'px'; rh.style.top = '-30px'; bd.appendChild(rh);
    }
    if (L.drag && L.drag.tip) { const t = document.createElement('div'); t.className = 'lxTip'; t.textContent = L.drag.tip; const b2 = selBox() || box; t.style.left = (b2.x + b2.w / 2) * L.z + 'px'; t.style.top = (b2.y + b2.h) * L.z + 12 + 'px'; ov.appendChild(t); }
    drawGuides(ov); tbRefresh();
  }
  function drawGuides(ov) {
    const d = L.drag; if (d && d.band) { const b = d.band; ov.appendChild(boxDiv(b, 'lxBand')); }
    if (!d || !d.guides) return; d.guides.forEach(g => { const e = document.createElement('div'); e.className = 'lxGd ' + g.t; if (g.t === 'v') Object.assign(e.style, { left: g.v * L.z + 'px', top: g.a * L.z + 'px', height: (g.b - g.a) * L.z + 'px' }); else Object.assign(e.style, { top: g.v * L.z + 'px', left: g.a * L.z + 'px', width: (g.b - g.a) * L.z + 'px' }); ov.appendChild(e); });
  }

  /* ---------------- history ---------------- */
  const snapState = () => JSON.stringify({ w: L.doc.w, h: L.doc.h, bg: L.doc.bg, name: L.doc.name, layers: L.doc.layers });
  function push(keepPanel) { const s = snapState(); if (L.hist[L.hi] === s) return; L.hist = L.hist.slice(0, L.hi + 1); L.hist.push(s); if (L.hist.length > 150) L.hist.shift(); L.hi = L.hist.length - 1; L.dirty = true; autosave(); updUndo(); if (!keepPanel) { renderPanel(); renderProps(); } }
  function restoreState(s) { const o = JSON.parse(s); Object.assign(L.doc, { w: o.w, h: o.h, bg: o.bg, name: o.name, layers: o.layers }); reindex(); L.sel = L.sel.filter(get); if (L.ctx && !get(L.ctx)) L.ctx = null; L.crop = null; paint(); renderPanel(); renderProps(); autosave(); }
  function undo() { finishEdit(true); if (L.hi > 0) { L.hi--; restoreState(L.hist[L.hi]); } updUndo(); }
  function redo() { finishEdit(true); if (L.hi < L.hist.length - 1) { L.hi++; restoreState(L.hist[L.hi]); } updUndo(); }
  function updUndo() { const u = q('lxUndo'), r = q('lxRedo'); if (u) u.classList.toggle('dis', L.hi <= 0); if (r) r.classList.toggle('dis', L.hi >= L.hist.length - 1); }
  function changed(soft) { reindex(); paint(true); if (!soft) push(); }

  /* ---------------- selection ---------------- */
  function setSel(ids, keepCtx) {
    ids = [...new Set(ids)].filter(get);
    if (L.editing && !ids.includes(L.editing.dataset.id)) finishEdit(true);
    if (L.crop && !ids.includes(L.crop)) L.crop = null;
    L.sel = ids;
    if (!keepCtx) { const ps = ids.map(id => parentOf(id)); L.ctx = ps.length && ps.every(p => p && p === ps[0]) ? ps[0].id : null; }
    ids.forEach(id => ancestors(id).forEach(g => { L.open[g.id] = true; }));
    drawOv(); renderPanel(); renderProps();
  }
  // «طبقة» (default) = click picks the exact layer under the mouse, like Photoshop's auto-select layer; «مجموعة» = click picks the whole group
  function pickFrom(leafId, alt) {
    const deep = (L.pick !== 'group') !== !!alt;
    if (deep) return leafId;
    const path = ancestors(leafId).map(g => g.id).concat(leafId);
    if (L.ctx) { const k = path.indexOf(L.ctx); if (k >= 0 && k < path.length - 1) return path[k + 1]; }
    return path[0];
  }
  const hitId = t => { const el = t && t.closest && t.closest('#lxPage .lxL'); return el ? el.dataset.id : null; };

  /* ---------------- transforms ---------------- */
  function moveLayer(l, dx, dy) { if (l.type === 'group') l.children.forEach(c => moveLayer(c, dx, dy)); else { l.x += dx; l.y += dy; } }
  function scaleHtmlPx(html, s) { return html.replace(/(font-size|letter-spacing|word-spacing|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|width|height|text-indent|border-radius)\s*:\s*([^;"]+)/g, (m, k, v) => k + ':' + v.replace(/(-?[\d.]+)px/g, (mm, n) => R2(n * s) + 'px')); }
  function scaleLeaf(l, s0, ax, ay, sx, sy, uni) {
    // s0 = start copy; scale about anchor (ax, ay) in page space
    const cx0 = s0.x + s0.w / 2, cy0 = s0.y + s0.h / 2;
    const cx = ax + (cx0 - ax) * sx, cy = ay + (cy0 - ay) * sy;
    let w = s0.w * sx, h = s0.h * sy;
    if (s0.rot) { const a = s0.rot * Math.PI / 180, c = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a)); const kx = sx * c + sy * sn, ky = sx * sn + sy * c; w = s0.w * (uni ? sx : kx); h = s0.h * (uni ? sy : ky); }
    l.w = Math.max(1, w); l.h = Math.max(1, h); l.x = cx - l.w / 2; l.y = cy - l.h / 2;
    if (s0.clip) l.clip = clipXform(s0.clip, l.w / s0.w, l.h / s0.h, 0, 0);
    const u = uni ? sx : Math.sqrt(Math.abs(sx * sy));
    if (l.type === 'text') { if (uni) { l.st.fs = R2(s0.st.fs * sx); if (s0.st.ls) l.st.ls = R2(s0.st.ls * sx); if (s0.st.pad) l.st.pad = s0.st.pad.map(v => R2(v * sx)); if (s0.st.ti) l.st.ti = R2(s0.st.ti * sx); l.html = scaleHtmlPx(s0.html, sx); } }
    else if (l.type === 'image') { const k = uni ? sx : Math.max(sx, sy); const icx = s0.ix + s0.iw / 2, icy = s0.iy + s0.ih / 2; l.iw = s0.iw * (uni ? sx : k); l.ih = s0.ih * (uni ? sy : k); l.ix = icx * (l.w / s0.w) - l.iw / 2; l.iy = icy * (l.h / s0.h) - l.ih / 2; if (s0.rad) l.rad = s0.rad.map(v => typeof v === 'number' ? R2(v * u) : v); }
    else if (l.type === 'shape') { if (s0.rad) l.rad = s0.rad.map(v => typeof v === 'number' ? R2(v * u) : v); if (s0.bd) l.bd = s0.bd.map(b => b ? Object.assign({}, b, { w: R2(Math.max(b.w ? .5 : 0, b.w * u)) }) : b); }
  }
  function rotateLeaf(l, s0, cx, cy, da) { const a = da * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); const lx = s0.x + s0.w / 2 - cx, ly = s0.y + s0.h / 2 - cy; const nx = cx + lx * c - ly * s, ny = cy + lx * s + ly * c; l.x = nx - s0.w / 2; l.y = ny - s0.h / 2; l.rot = R2((((s0.rot || 0) + da) % 360 + 540) % 360 - 180); if (Math.abs(l.rot) < .01) l.rot = 0; }

  /* ---------------- snapping ---------------- */
  function snapTargets(excl) {
    const xs = [0, L.doc.w / 2, L.doc.w], ys = [0, L.doc.h / 2, L.doc.h];
    const ex = new Set(); excl.forEach(l => { ex.add(l.id); leaves(l).forEach(c => ex.add(c.id)); });
    all().forEach(l => { if (ex.has(l.id) || effHidden(l)) return; if (l.type === 'group' && excl.some(e => isIn(e.id, l.id))) return; if (excl.some(e => e.type === 'group' && isIn(l.id, e.id))) return; const b = aabb(l); if (!b || b.w * b.h > L.doc.w * L.doc.h * .92) return; xs.push(b.x, b.x + b.w / 2, b.x + b.w); ys.push(b.y, b.y + b.h / 2, b.y + b.h); });
    return { xs, ys };
  }
  function snap1(vals, targets, thr) { let best = null; vals.forEach(v => targets.forEach(t => { const d = t - v; if (Math.abs(d) <= thr && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t }; })); return best; }

  /* ---------------- pointer interactions ---------------- */
  function onDown(e) {
    if (!L.on) return;
    e.stopPropagation(); closeCtx();
    const host = q('lxHost');
    if (e.button === 1 || (e.button === 0 && L.space)) { L.drag = { mode: 'pan', x0: e.clientX, y0: e.clientY, sl: host.scrollLeft, st: host.scrollTop }; host.classList.add('grabbing'); e.preventDefault(); host.setPointerCapture(e.pointerId); return; }
    if (e.button !== 0) return;
    if (e.pointerType === 'touch') { touchDown(e); if (L.drag || (L.touch && L.touch.size >= 2)) return; }
    if (L.editing) { if (L.editing.contains(e.target)) return; finishEdit(true); }
    const [px0, py0] = toPg(e.clientX, e.clientY);
    // format painter: the click lands the copied look on what was clicked
    if (L.paint) { e.preventDefault(); const lf = hitId(e.target); if (!lf) { endPaint(); return; } paintOn(pickFrom(lf, MOD(e))); return; }
    const hd = e.target.closest && e.target.closest('.lxH,.lxRot');
    if (hd) { startXform(e, hd.dataset.h, px0, py0); return; }
    if (L.crop) { const l = get(L.crop); const id = hitId(e.target); if (l && (id === l.id || inBox(l, px0, py0, 0) || (px0 >= l.x + l.ix && px0 <= l.x + l.ix + l.iw && py0 >= l.y + l.iy && py0 <= l.y + l.iy + l.ih))) { L.drag = { mode: 'crop', x0: px0, y0: py0, s: CL(l) }; host.setPointerCapture(e.pointerId); e.preventDefault(); return; } L.crop = null; drawOv(); renderProps(); }
    const leaf = hitId(e.target);
    if (!leaf) { if (!e.shiftKey && !MOD(e)) { L.ctx = null; setSel([]); } L.drag = { mode: 'band', x0: px0, y0: py0, add: e.shiftKey || MOD(e), base: L.sel.slice() }; host.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    const deep = MOD(e) && !e.shiftKey; const id = pickFrom(leaf, deep);
    let clickSel = null;
    if (e.shiftKey) { L.drag = { mode: 'band', x0: px0, y0: py0, add: true, base: L.sel.slice(), toggle: id }; host.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    // pressing on a background (a big photo / colour block that is not selected) and dragging draws a selection box
    // like PowerPoint / Figma; a plain click on it still selects it
    if (!(L.sel.includes(id) || L.sel.some(s => isIn(id, s))) && isBackdrop(get(leaf))) { L.drag = { mode: 'band', x0: px0, y0: py0, add: false, base: [], clickId: id }; host.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    else if (L.sel.includes(id) || L.sel.some(s => isIn(id, s))) { clickSel = id; }
    else setSel([id]);
    if (!L.sel.length) return;
    const items = topSel(); if (items.some(effLocked)) { e.preventDefault(); return; }
    const lv = []; items.forEach(l => leaves(l, lv));
    L.drag = { mode: 'move', x0: px0, y0: py0, items, start: new Map(lv.map(l => [l.id, { x: l.x, y: l.y }])), b0: selBox(), moved: false, alt: e.altKey, clickSel, T: null };
    host.setPointerCapture(e.pointerId); e.preventDefault();
  }
  /* the narrowest a text box can be dragged: its longest word (measured once per drag) */
  function minTextW(s0) {
    const el = L.cache.get(s0.id); if (!el || s0.rot) return 8;
    const key = s0.id + '|' + s0.html.length + '|' + s0.st.fs + '|' + s0.st.ff; if (L._mw && L._mw.k === key) return L._mw.v;
    const keep = el.style.width, ws = el.style.whiteSpace; el.style.width = 'min-content'; if (/nowrap|^pre$/.test(ws)) el.style.whiteSpace = ws === 'pre' ? 'pre-wrap' : 'normal'; const v = el.offsetWidth; el.style.width = keep; el.style.whiteSpace = ws;
    L._mw = { k: key, v: Math.max(8, v || 8) }; return L._mw.v;
  }
  /* a background-like layer: a big photo / colour block (never a text) */
  function isBackdrop(l) { if (!l || l.type === 'text' || l.type === 'group') return false; const b = aabb(l); return !!b && b.w * b.h >= L.doc.w * L.doc.h * .22; }
  /* what a selection box picks: anything it touches; big backgrounds only when fully inside.
     «طبقة» mode picks the layers themselves (inside groups too), «مجموعة» mode picks whole groups */
  function bandHits(r) {
    const deep = L.pick !== 'group';
    const pool = deep ? (L.ctx && get(L.ctx) ? leaves(get(L.ctx)) : all().filter(l => l.type !== 'group')) : (L.ctx && get(L.ctx) ? get(L.ctx).children : L.doc.layers);
    const big = L.doc.w * L.doc.h * .22;
    return pool.filter(l => !effHidden(l) && !effLocked(l)).filter(l => {
      const b = aabb(l); if (!b) return false;
      const inside = b.x >= r.x - .5 && b.y >= r.y - .5 && b.x + b.w <= r.x + r.w + .5 && b.y + b.h <= r.y + r.h + .5;
      if (b.w * b.h >= big) return inside;
      return b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y;
    }).map(l => l.id);
  }
  function inBox(l, x, y, pad) { const b = aabb(l); return b && x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad; }
  function startXform(e, h, px0, py0) {
    const items = topSel(); if (!items.length) return;
    const lv = []; items.forEach(l => leaves(l, lv));
    const single = items.length === 1 && items[0].type !== 'group' ? items[0] : null;
    L.drag = { mode: h === 'rot' ? 'rot' : 'resize', h, x0: px0, y0: py0, items, single, s0: new Map(lv.map(l => [l.id, CL(l)])), b0: single ? { x: single.x, y: single.y, w: single.w, h: single.h } : selBox(), moved: false };
    if (h === 'rot') { const b = L.drag.b0; L.drag.c = [b.x + b.w / 2, b.y + b.h / 2]; L.drag.a0 = Math.atan2(py0 - L.drag.c[1], px0 - L.drag.c[0]); }
    else if (!single) L.drag.T = snapTargets(items);
    else if (!single.rot) L.drag.T = snapTargets(items);
    q('lxHost').setPointerCapture(e.pointerId); e.preventDefault(); e.stopPropagation();
  }
  function onMove(e) {
    if (!L.on) return;
    if (L.touch && L.touch.size >= 2) return;
    const d = L.drag;
    if (!d) { const id = hitId(e.target); const nh = id && !L.editing ? pickFrom(id, MOD(e)) : null; if (nh !== L.hover) { L.hover = nh; drawOv(); } return; }
    if (d.mode === 'pan') { const h = q('lxHost'); h.scrollLeft = d.sl - (e.clientX - d.x0); h.scrollTop = d.st - (e.clientY - d.y0); return; }
    const [px1, py1] = toPg(e.clientX, e.clientY); let dx = px1 - d.x0, dy = py1 - d.y0;
    if (!d.moved && Math.abs(dx) * L.z + Math.abs(dy) * L.z < 3) return;
    d.moved = true; const thr = 6 / L.z;
    if (d.mode === 'band') { const x = Math.min(d.x0, px1), y = Math.min(d.y0, py1); d.band = { x, y, w: Math.abs(dx), h: Math.abs(dy) }; const hit = bandHits(d.band); L.sel = d.add ? [...new Set(d.base.concat(hit))] : hit; drawOv(); return; }
    if (d.mode === 'crop') { const l = get(L.crop); l.ix = d.s.ix + dx; l.iy = d.s.iy + dy; paint(); return; }
    if (d.mode === 'move') {
      if (d.alt && !d.duped) { d.duped = true; const copies = duplicateItems(d.items, 0); d.items = copies; const lv = []; copies.forEach(l => leaves(l, lv)); d.start = new Map(lv.map(l => [l.id, { x: l.x, y: l.y }])); L.sel = copies.map(l => l.id); }
      if (!d.T) d.T = snapTargets(d.items);
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      d.guides = [];
      if (L.snap !== false && d.b0) { const b = d.b0; const sx = snap1([b.x + dx, b.x + dx + b.w / 2, b.x + dx + b.w], d.T.xs, thr), sy = snap1([b.y + dy, b.y + dy + b.h / 2, b.y + dy + b.h], d.T.ys, thr); if (sx && !(e.shiftKey && dx === 0)) { dx += sx.d; d.guides.push({ t: 'v', v: sx.t, a: Math.min(0, b.y + dy), b: Math.max(L.doc.h, b.y + dy + b.h) }); } if (sy && !(e.shiftKey && dy === 0)) { dy += sy.d; d.guides.push({ t: 'h', v: sy.t, a: Math.min(0, b.x + dx), b: Math.max(L.doc.w, b.x + dx + b.w) }); } }
      d.items.forEach(it => leaves(it).forEach(l => { const s = d.start.get(l.id); if (s) { l.x = s.x + dx; l.y = s.y + dy; } }));
      d.tip = `X ${Math.round(d.b0.x + dx)}  Y ${Math.round(d.b0.y + dy)}`; paint(); updNums(); return;
    }
    if (d.mode === 'rot') { const a = Math.atan2(py1 - d.c[1], px1 - d.c[0]); let da = (a - d.a0) * 180 / Math.PI; const base = d.single ? (d.s0.get(d.single.id).rot || 0) : 0; if (e.shiftKey) da = Math.round((base + da) / 15) * 15 - base; d.items.forEach(it => leaves(it).forEach(l => rotateLeaf(l, d.s0.get(l.id), d.c[0], d.c[1], da))); d.tip = `${Math.round(((base + da) % 360 + 540) % 360 - 180)}°`; paint(); updNums(); return; }
    if (d.mode === 'resize') { resizeMove(d, px1, py1, e); paint(); updNums(); }
  }
  function resizeMove(d, px1, py1, e) {
    const h = d.h, hx = h.includes('e') ? 1 : h.includes('w') ? -1 : 0, hy = h.includes('s') ? 1 : h.includes('n') ? -1 : 0;
    const corner = hx && hy; const thr = 6 / L.z;
    const s = d.single; d.guides = [];
    if (s) {
      const s0 = d.s0.get(s.id); const a = (s0.rot || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
      const ddx = px1 - d.x0, ddy = py1 - d.y0; let lx = ddx * c + ddy * sn, ly = -ddx * sn + ddy * c;
      const fromC = e.altKey; const k = fromC ? 2 : 1;
      let w = s0.w + hx * lx * k, hh = s0.h + hy * ly * k;
      // snap the moving edges (unrotated only)
      if (!s0.rot && d.T && L.snap !== false) { if (hx) { const edge = hx > 0 ? s0.x + w : s0.x + s0.w - w; const sx = snap1([edge], d.T.xs, thr); if (sx) { w += hx * sx.d * (fromC ? 2 : 1); d.guides.push({ t: 'v', v: sx.t, a: 0, b: L.doc.h }); } } if (hy) { const edge = hy > 0 ? s0.y + hh : s0.y + s0.h - hh; const sy = snap1([edge], d.T.ys, thr); if (sy) { hh += hy * sy.d * (fromC ? 2 : 1); d.guides.push({ t: 'h', v: sy.t, a: 0, b: L.doc.w }); } } }
      // a text box reflows like a real text frame: the words wrap to the new width and the height follows them
      // (Shift on a corner scales the text itself instead)
      const keepRatio = corner && (s.type === 'image' || s.type === 'svg' ? !e.shiftKey : e.shiftKey);
      if (keepRatio) { const r = Math.max(.02, 1 + ((w - s0.w) * s0.w + (hh - s0.h) * s0.h) / (s0.w * s0.w + s0.h * s0.h)); w = s0.w * r; hh = s0.h * r; }
      w = Math.max(4, w); hh = Math.max(4, hh);
      if (s.type === 'text' && !keepRatio) { w = Math.max(minTextW(s0), w); if (s0.ah !== false && hx) hh = s0.h; }
      // anchor = opposite edge (or center with Alt)
      const ncx = fromC ? 0 : (hx ? hx * (w - s0.w) / 2 : 0), ncy = fromC ? 0 : (hy ? hy * (hh - s0.h) / 2 : 0);
      const cx = s0.x + s0.w / 2 + ncx * c - ncy * sn, cy = s0.y + s0.h / 2 + ncx * sn + ncy * c;
      Object.assign(s, { x: cx - w / 2, y: cy - hh / 2, w, h: hh });
      if (s0.clip) { const crop = s.type === 'image' && !corner; s.clip = crop ? clipXform(s0.clip, 1, 1, -(fromC ? (s0.w - w) / 2 : (hx < 0 ? s0.w - w : 0)), -(fromC ? (s0.h - hh) / 2 : (hy < 0 ? s0.h - hh : 0))) : clipXform(s0.clip, w / s0.w, hh / s0.h, 0, 0); }
      if (s.type === 'text' && !keepRatio) { if (hx) { s.aw = false; if (s0.st.ws === 'nowrap') s.st.ws = ''; else if (s0.st.ws === 'pre') s.st.ws = 'pre-wrap'; } if (hy && !hx) s.ah = false; }
      else if (s.type === 'text') { if (corner && keepRatio) { const r = w / s0.w; s.st.fs = R2(s0.st.fs * r); if (s0.st.ls) s.st.ls = R2(s0.st.ls * r); if (s0.st.pad) s.st.pad = s0.st.pad.map(v => R2(v * r)); s.html = scaleHtmlPx(s0.html, r); } else if (hy) s.ah = false; }
      else if (s.type === 'image') { if (corner && keepRatio) { const r = w / s0.w; s.ix = s0.ix * r; s.iy = s0.iy * r; s.iw = s0.iw * r; s.ih = s0.ih * r; } else if (corner) { const rx = w / s0.w, ry = hh / s0.h; s.ix = s0.ix * rx; s.iy = s0.iy * ry; s.iw = s0.iw * rx; s.ih = s0.ih * ry; } else { /* side = crop: the picture stays where it is */ const dl = fromC ? (s0.w - w) / 2 : (hx < 0 ? s0.w - w : 0), dt = fromC ? (s0.h - hh) / 2 : (hy < 0 ? s0.h - hh : 0); s.ix = s0.ix - dl; s.iy = s0.iy - dt; } }
      d.tip = s.type === 'text' && s.ah !== false && !keepRatio ? `W ${Math.round(w)}` : `${Math.round(w)} × ${Math.round(hh)}`;
      return;
    }
    // several items / a group: scale everything around the opposite edge of the selection box
    const b = d.b0; const ddx = px1 - d.x0, ddy = py1 - d.y0; const fromC = e.altKey;
    let w = b.w + hx * ddx * (fromC ? 2 : 1), hh = b.h + hy * ddy * (fromC ? 2 : 1);
    if (d.T && L.snap !== false) { if (hx) { const edge = hx > 0 ? b.x + w : b.x + b.w - w; const sx = snap1([edge], d.T.xs, thr); if (sx) { w += hx * sx.d; d.guides.push({ t: 'v', v: sx.t, a: 0, b: L.doc.h }); } } if (hy) { const edge = hy > 0 ? b.y + hh : b.y + b.h - hh; const sy = snap1([edge], d.T.ys, thr); if (sy) { hh += hy * sy.d; d.guides.push({ t: 'h', v: sy.t, a: 0, b: L.doc.w }); } } }
    let sx = hx ? w / b.w : 1, sy = hy ? hh / b.h : 1;
    const uni = corner ? !e.shiftKey : false;
    if (uni) { const r = 1 + ((w - b.w) * b.w + (hh - b.h) * b.h) / (b.w * b.w + b.h * b.h); sx = sy = r; }
    sx = Math.max(.02, sx); sy = Math.max(.02, sy);
    const ax = fromC ? b.x + b.w / 2 : hx > 0 ? b.x : hx < 0 ? b.x + b.w : b.x + b.w / 2, ay = fromC ? b.y + b.h / 2 : hy > 0 ? b.y : hy < 0 ? b.y + b.h : b.y + b.h / 2;
    d.items.forEach(it => leaves(it).forEach(l => scaleLeaf(l, d.s0.get(l.id), ax, ay, sx, sy, uni)));
    d.tip = `${Math.round(b.w * sx)} × ${Math.round(b.h * sy)}`;
  }
  function onUp(e) {
    if (!L.on) return;
    const d = L.drag; if (!d) return; L.drag = null; q('lxHost').classList.remove('grabbing');
    try { q('lxHost').releasePointerCapture(e.pointerId); } catch (x) { }
    if (d.mode === 'pan') return;
    if (d.mode === 'band') { if (!d.moved && d.toggle) { const id = d.toggle; setSel(L.sel.includes(id) ? L.sel.filter(x => x !== id) : L.sel.concat(id), true); return; } if (!d.moved && d.clickId) { setSel([d.clickId]); return; } setSel(L.sel, false); drawOv(); return; }
    if (d.moved) { changed(); renderProps(); }
    else if (d.mode === 'move' && d.clickSel) { setSel([d.clickSel]); }
    drawOv();
  }
  function onDbl(e) {
    if (!L.on) return;
    const at = document.elementFromPoint(e.clientX, e.clientY); const leaf = hitId(at); if (!leaf) { if (L.ctx) { const g = L.ctx; L.ctx = parentOf(g) ? parentOf(g).id : null; setSel([g], true); } return; }
    const cur = topSel()[0];
    if (cur && cur.type === 'group' && isIn(leaf, cur.id)) { L.ctx = cur.id; const id = pickFrom(leaf, false); setSel([id], true); return; }
    const l = get(leaf); if (!l || effLocked(l)) return;
    if (l.type === 'text') { setSel([l.id]); startEdit(l, e); return; }
    if (l.type === 'image') { setSel([l.id]); L.crop = l.id; drawOv(); renderProps(); say('وضع القص: اسحب الصورة لتحريكها داخل الإطار، وغيّر التكبير من الخصائص. اضغط Esc للخروج'); return; }
    setSel([pickFrom(leaf, false)]);
  }
  /* touch: 2 fingers = pinch zoom + pan, 1 finger on empty = pan */
  function touchDown(e) {
    L.touch = L.touch || new Map(); L.touch.set(e.pointerId, [e.clientX, e.clientY]);
    if (L.touch.size === 2) { L.drag = null; const p = [...L.touch.values()]; const h = q('lxHost'); L.pinch = { d0: Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]), z0: L.z, cx: (p[0][0] + p[1][0]) / 2, cy: (p[0][1] + p[1][1]) / 2, sl: h.scrollLeft, st: h.scrollTop }; return; }
    if (!hitId(e.target) && !(e.target.closest && e.target.closest('.lxH,.lxRot'))) { const h = q('lxHost'); L.drag = { mode: 'pan', x0: e.clientX, y0: e.clientY, sl: h.scrollLeft, st: h.scrollTop }; setSel([]); }
  }
  function touchMove(e) { if (!L.touch || !L.touch.has(e.pointerId)) return; L.touch.set(e.pointerId, [e.clientX, e.clientY]); if (L.touch.size === 2 && L.pinch) { const p = [...L.touch.values()]; const dd = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); setZoom(L.pinch.z0 * dd / L.pinch.d0, (p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2); } }
  function touchUp(e) { if (L.touch) { L.touch.delete(e.pointerId); if (L.touch.size < 2) L.pinch = null; } }

  /* ---------------- text editing ---------------- */
  function startEdit(l, e) {
    const el = L.cache.get(l.id); if (!el) return; L.editing = el; el.contentEditable = 'true'; el.spellcheck = false; el.focus();
    const sel = getSelection(); let r = null;
    if (e && document.caretRangeFromPoint) r = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (!r || !el.contains(r.startContainer)) { r = document.createRange(); r.selectNodeContents(el); } else if (e && e.detail >= 2) { r = document.createRange(); r.selectNodeContents(el); }
    sel.removeAllRanges(); sel.addRange(r); drawOv(); renderProps(); tbShow(l);
  }
  function cleanHtml(h) { const t = document.createElement('template'); t.innerHTML = h; t.content.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(x => x.remove()); t.content.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || /javascript:/i.test(a.value) || a.name === 'contenteditable' || a.name === 'class') n.removeAttribute(a.name); })); return t.innerHTML; }
  function finishEdit(save) {
    tbHide(); const el = L.editing; if (!el) return; L.editing = null; el.removeAttribute('contenteditable'); const l = get(el.dataset.id);
    if (l && save) { const h = cleanHtml(el.innerHTML); const empty = !el.textContent.trim() && !el.querySelector('img,svg'); if (empty) { removeIds([l.id]); return; } if (h !== l.html) { l.html = h; el._h = h; changed(); } }
    try { getSelection().removeAllRanges(); } catch (x) { }
    paint(); renderProps();
  }
  function rangeInEdit() { if (!L.editing) return null; const s = getSelection(); if (!s.rangeCount) return null; const r = s.getRangeAt(0); if (r.collapsed || !L.editing.contains(r.commonAncestorContainer)) return null; return r; }
  function styleRange(prop, val) { const r = rangeInEdit(); if (!r) return false; const sp = document.createElement('span'); sp.style[prop] = val; try { sp.appendChild(r.extractContents()); sp.querySelectorAll('*').forEach(c => { if (c.style) c.style[prop] = ''; }); r.insertNode(sp); const s = getSelection(); s.removeAllRanges(); const nr = document.createRange(); nr.selectNodeContents(sp); s.addRange(nr); } catch (x) { return false; } L.cache.get(L.editing.dataset.id) && measureTexts(L.cache, L.doc.layers); drawOv(); return true; }

  /* ---------------- format painter (ناسخ التنسيق) ----------------
     copies the exact look of one layer (or a group: one look per kind of layer inside it) and lands it on others:
     text = font, size, weight, colour, spacing, alignment · shape = fill, gradient, border, corners · icon = colour, line weight
     · picture = corners, border, colour corrections · all = transparency. Colour also crosses kinds (text colour → icon / shape). */
  const TXT_STRIP = ['font-family', 'font-size', 'font-weight', 'font-style', 'color', 'letter-spacing', 'word-spacing', 'line-height', 'text-transform', '-webkit-text-stroke'];
  function firstRunStyle(el) {
    if (!el) return null; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (n.data.trim()) return getComputedStyle(n.parentElement); } return getComputedStyle(el);
  }
  function lookOf(list) {
    const look = { kinds: {} };
    const lv = []; list.forEach(l => leaves(l, lv));
    lv.forEach(l => {
      if (look.kinds[l.type]) return;
      const o = { op: l.op ?? 1 };
      if (l.type === 'text') {
        const t = l.st || {}; const cs = firstRunStyle(L.cache.get(l.id)); const fs = cs ? px(cs.fontSize) : t.fs;
        Object.assign(o, { ff: cs ? cs.fontFamily.replace(/"/g, "'") : t.ff, fs: R2(fs || t.fs || 16), fw: cs ? cs.fontWeight : t.fw, fst: cs && cs.fontStyle !== 'normal' ? cs.fontStyle : '', col: cs ? toHex(cs.color) : t.col,
          lh: t.lh || (cs && cs.lineHeight !== 'normal' ? R2(px(cs.lineHeight) / fs) : null), ls: cs && cs.letterSpacing !== 'normal' ? R2(px(cs.letterSpacing)) : (t.ls || 0), wsp: t.wsp || 0,
          tt: cs && cs.textTransform !== 'none' ? cs.textTransform : '', td: t.td || '', xs: t.xs || '', bg: t.bg || '', ta: t.ta, tal: t.tal, dir: t.dir || 'rtl' });
        look.col = look.col || o.col;
      } else if (l.type === 'shape') { Object.assign(o, { fill: l.fill, grad: l.grad || '', bd: l.bd ? CL(l.bd) : null, rad: l.rad ? CL(l.rad) : null, shape: l.shape }); look.col = look.col || (l.fill && l.fill !== 'transparent' ? l.fill : null); }
      else if (l.type === 'svg') { Object.assign(o, { col: l.col, sw: l.sw }); look.col = look.col || l.col; }
      else if (l.type === 'image') Object.assign(o, { rad: l.rad ? CL(l.rad) : null, bd: l.bd ? CL(l.bd) : null, filt: l.filt || '' });
      look.kinds[l.type] = o;
    });
    look.name = list.length === 1 ? nameOf(list[0]) : list.length + ' طبقات';
    return look;
  }
  function stripTextLook(html) {
    const t = document.createElement('template'); t.innerHTML = html;
    t.content.querySelectorAll('b,strong,i,em').forEach(n => { const p = n.parentNode; while (n.firstChild) p.insertBefore(n.firstChild, n); n.remove(); });
    t.content.querySelectorAll('[style]').forEach(n => { TXT_STRIP.forEach(k => n.style.removeProperty(k)); if (!n.getAttribute('style').trim()) n.removeAttribute('style'); });
    t.content.querySelectorAll('font').forEach(n => { n.removeAttribute('color'); n.removeAttribute('face'); n.removeAttribute('size'); });
    return t.innerHTML;
  }
  function applyLook(l, look) {
    const k = look.kinds[l.type];
    if (l.type === 'text') {
      if (k) {
        // Arabic keeps its Arabic font and English its English font (brand rule); everything else is copied as is
        const sameDir = (l.st.dir || 'rtl') === k.dir;
        if (sameDir) l.st.ff = k.ff;
        Object.assign(l.st, { fs: k.fs, fw: k.fw, fst: k.fst, col: k.col, lh: k.lh, ls: k.ls, wsp: k.wsp, tt: k.tt, td: k.td, xs: k.xs, bg: k.bg });
        if (sameDir) { l.st.ta = k.ta; l.st.tal = k.tal; }
        l.html = sameDir ? stripTextLook(l.html) : stripProp(stripTextLook(l.html), 'font-family'); l.op = k.op;
      } else if (look.col) { l.st.col = look.col; l.html = stripProp(l.html, 'color'); } else return false;
      return true;
    }
    if (l.type === 'shape') {
      if (k) { l.fill = k.fill; l.grad = k.grad; l.bd = k.bd ? CL(k.bd) : null; if (k.rad && l.shape !== 'ellipse' && k.shape !== 'ellipse') l.rad = CL(k.rad); l.op = k.op; }
      else if (look.col) { l.fill = look.col; l.grad = ''; } else return false;
      return true;
    }
    if (l.type === 'svg') {
      if (k) { l.col = k.col; l.op = k.op; if (k.sw && /stroke-width/.test(l.svg || '')) { l.sw = k.sw; l.svg = l.svg.replace(/stroke-width="[^"]*"/, `stroke-width="${k.sw}"`); } }
      else if (look.col) l.col = look.col; else return false;
      return true;
    }
    if (l.type === 'image' && k) { l.rad = k.rad ? CL(k.rad) : [0, 0, 0, 0]; l.bd = k.bd ? CL(k.bd) : null; l.filt = k.filt; l.op = k.op; return true; }
    return false;
  }
  function lookTo(ids, look) {
    let n = 0; ids.map(get).filter(Boolean).forEach(t => leaves(t).forEach(l => { if (!effLocked(l) && applyLook(l, look)) n++; }));
    return n;
  }
  // the mouse pointer becomes a small paint brush while the painter is on
  function brushCursor() { if (document.documentElement.style.getPropertyValue('--lxBrush')) return; try { const inner = svgIcon('paintbrush', 2).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#fff" stroke-width="5">${inner}</g><g stroke="#002657" stroke-width="2">${inner}</g></svg>`; document.documentElement.style.setProperty('--lxBrush', `url("data:image/svg+xml,${encodeURIComponent(svg)}") 3 21, copy`); } catch (x) { } }
  function paintBtn() { brushCursor(); [q('lxPaintB'), document.querySelector('#lxProps [data-a="paint"]')].forEach(b => { if (b) { b.classList.toggle('on', !!L.paint); b.classList.toggle('sticky', !!(L.paint && L.paint.sticky)); } }); document.body.classList.toggle('lx-painting', !!L.paint); if (TB && TB.classList.contains('on')) tbSync(); }
  function startPaint(sticky) {
    if (L.editing) finishEdit(true);
    const ts = topSel(); if (!ts.length && !(L.paint && sticky)) { say('حدد العنصر اللي تبي تنسخ تنسيقه أول، بعدين اضغط «ناسخ التنسيق»'); return; }
    L.paint = { look: ts.length ? lookOf(ts) : L.paint.look, sticky: !!sticky }; paintBtn();
    say(sticky ? 'ناسخ التنسيق شغّال: اضغط على كل عنصر تبي تطبّق عليه — Esc للإيقاف' : 'اضغط على العنصر اللي تبي تنسخ له التنسيق');
  }
  function endPaint() { if (!L.paint) return; L.paint = null; paintBtn(); }
  function paintOn(id) {
    const look = L.paint.look; const n = lookTo([id], look);
    if (!L.paint.sticky) endPaint();
    if (!n) { say('هذا العنصر ما يقبل هذا التنسيق'); return; }
    setSel([id]); changed(); renderProps(); say('تم نسخ التنسيق ✓');
  }
  function copyLook() { const ts = topSel(); if (!ts.length) return; L.lookClip = lookOf(ts); try { localStorage.setItem('jedLX_look', JSON.stringify(L.lookClip)); } catch (x) { } say('نسخت التنسيق — حدد عنصر ثاني واضغط ' + (MAC ? '⌘⌥V' : 'Ctrl+Alt+V')); }
  function pasteLook() { let look = L.lookClip; if (!look) { try { look = JSON.parse(localStorage.getItem('jedLX_look') || 'null'); } catch (x) { } } if (!look) { say('انسخ تنسيق أول: ' + (MAC ? '⌘⌥C' : 'Ctrl+Alt+C')); return; } const ts = topSel(); if (!ts.length) return; const n = lookTo(ts.map(l => l.id), look); if (!n) { say('المحدد ما يقبل هذا التنسيق'); return; } changed(); renderProps(); say('تم لصق التنسيق ✓'); }

  /* ---------------- structural actions ---------------- */
  function removeIds(ids) { ids.forEach(id => { const a = arrOf(id); if (!a) return; const i = a.findIndex(x => x.id === id); if (i >= 0) a.splice(i, 1); reindex(); }); pruneGroups(); L.sel = L.sel.filter(get); if (L.ctx && !get(L.ctx)) L.ctx = null; changed(); renderPanel(); renderProps(); }
  function pruneGroups() { let again = true; while (again) { again = false; all().forEach(l => { if (l.type === 'group' && !l.children.length) { const a = arrOf(l.id); a.splice(a.indexOf(l), 1); reindex(); again = true; } }); } }
  function delSel() { const ts = topSel(); if (!ts.length) return; if (ts.some(effLocked)) { say('فيه طبقة مقفولة ضمن المحدد — افتح القفل أولاً'); return; } const n = ts.length; removeIds(ts.map(l => l.id)); say(n > 1 ? `تم حذف ${n} طبقات` : 'تم الحذف'); }
  function reid(l) { l.id = uid(); if (l.type === 'group') l.children.forEach(reid); return l; }
  function duplicateItems(items, off) { const fo = flatOrder(); const out = []; items.slice().sort((a, b) => fo.get(a.id) - fo.get(b.id)).forEach(l => { const c = reid(CL(l)); if (off) moveLayer(c, off, off); const a = arrOf(l.id); a.splice(a.indexOf(l) + 1, 0, c); out.push(c); reindex(); }); reindex(); return out; }
  function dupSel() { const ts = topSel(); if (!ts.length) return; const c = duplicateItems(ts, 14); setSel(c.map(l => l.id), true); changed(); }
  function groupSel() {
    const ts = topSel(); if (ts.length < 2) { say('حدد طبقتين أو أكثر (Shift + كليك أو من قائمة الطبقات) ثم اضغط «تجميع»'); return; }
    const fo = flatOrder(); ts.sort((a, b) => fo.get(a.id) - fo.get(b.id));
    const top = ts[ts.length - 1]; const arr = arrOf(top.id); const g = { id: uid(), type: 'group', name: '', children: [], op: 1 };
    const same = ts.every(l => arrOf(l.id) === arr); let at = arr.indexOf(top);
    ts.forEach(l => { const a = arrOf(l.id); const i = a.indexOf(l); a.splice(i, 1); if (a === arr && i < at) at--; g.children.push(l); });
    if (same) arr.splice(at + 1, 0, g); else L.doc.layers.splice(Math.min(L.doc.layers.length, at + 1), 0, g);
    reindex(); pruneGroups(); reindex(); L.open[g.id] = true; L.ctx = parentOf(g.id) ? parentOf(g.id).id : null; setSel([g.id], true); changed(); say('تم التجميع: تتحرك مع بعض الحين — دبل كليك للدخول لأي عنصر داخلها');
  }
  function ungroupSel() {
    const gs = topSel().filter(l => l.type === 'group'); if (!gs.length) { say('حدد مجموعة أولاً'); return; }
    const out = []; gs.forEach(g => { const a = arrOf(g.id); const i = a.indexOf(g); const k = g.children; k.forEach(c => { if (g.op != null && g.op < 1) c.op = R2((c.op ?? 1) * g.op); if (g.hidden) c.hidden = true; }); a.splice(i, 1, ...k); out.push(...k.map(c => c.id)); delete L.open[g.id]; });
    reindex(); L.ctx = null; setSel(out); changed(); say(out.length ? `تم فك التجميع: ${out.length} طبقات منفصلة` : 'تم');
  }
  function flattenAll(scope) {
    const target = scope ? scope : null; let n = 0;
    const flat = arr => { const out = []; arr.forEach(l => { if (l.type === 'group') { n++; const op = l.op ?? 1; flat(l.children).forEach(c => { if (op < 1) c.op = R2((c.op ?? 1) * op); if (l.hidden) c.hidden = true; out.push(c); }); } else out.push(l); }); return out; };
    if (target) { const a = arrOf(target.id); const i = a.indexOf(target); a.splice(i, 1, ...flat(target.children)); n++; } else L.doc.layers = flat(L.doc.layers);
    reindex(); L.ctx = null; setSel([]); changed(); say(n ? `تم فك ${n} مجموعة — كل عنصر صار طبقة مستقلة` : 'ما فيه مجموعات');
  }
  function mergeGroups() { const ts = topSel(); if (ts.length < 2) { say('حدد مجموعتين أو أكثر عشان أدمجها في مجموعة وحدة'); return; } const fo = flatOrder(); ts.sort((a, b) => fo.get(a.id) - fo.get(b.id)); const kids = []; ts.forEach(l => { if (l.type === 'group') kids.push(...l.children); else kids.push(l); }); const top = ts[ts.length - 1]; const arr = arrOf(top.id); const g = { id: uid(), type: 'group', name: ts.find(l => l.type === 'group' && l.name) ? ts.find(l => l.type === 'group' && l.name).name : '', children: kids, op: 1 }; let at = arr.indexOf(top); ts.forEach(l => { const a = arrOf(l.id); const i = a.indexOf(l); a.splice(i, 1); if (a === arr && i < at) at--; }); arr.splice(at + 1, 0, g); reindex(); pruneGroups(); reindex(); L.open[g.id] = true; setSel([g.id]); changed(); say('تم دمج المجموعات في مجموعة وحدة'); }
  function order(dir) {
    const ts = topSel(); if (!ts.length) return; const fo = flatOrder(); const list = ts.slice().sort((a, b) => fo.get(a.id) - fo.get(b.id)); if (dir === 1 || dir === -2) list.reverse();
    list.forEach(l => { const a = arrOf(l.id); const i = a.indexOf(l); a.splice(i, 1); const j = dir === 2 ? a.length : dir === -2 ? 0 : clamp(i + dir, 0, a.length); a.splice(j, 0, l); reindex(); });
    changed();
  }
  function alignSel(m) {
    const ts = topSel(); if (!ts.length) return; const ref = ts.length === 1 ? { x: 0, y: 0, w: L.doc.w, h: L.doc.h } : selBox();
    ts.forEach(l => { const b = aabb(l); let dx = 0, dy = 0; if (m === 'l') dx = ref.x - b.x; if (m === 'c') dx = ref.x + ref.w / 2 - (b.x + b.w / 2); if (m === 'r') dx = ref.x + ref.w - (b.x + b.w); if (m === 't') dy = ref.y - b.y; if (m === 'm') dy = ref.y + ref.h / 2 - (b.y + b.h / 2); if (m === 'b') dy = ref.y + ref.h - (b.y + b.h); moveLayer(l, dx, dy); });
    changed();
  }
  function distribute(axis) {
    const ts = topSel(); if (ts.length < 3) { say('التوزيع يحتاج 3 طبقات أو أكثر'); return; }
    const bs = ts.map(l => ({ l, b: aabb(l) })); const k = axis === 'h' ? 'x' : 'y', s = axis === 'h' ? 'w' : 'h'; bs.sort((a, b) => a.b[k] - b.b[k]);
    const first = bs[0].b, last = bs[bs.length - 1].b; const total = bs.reduce((t, o) => t + o.b[s], 0); const gap = (last[k] + last[s] - first[k] - total) / (bs.length - 1);
    let cur = first[k] + first[s] + gap; bs.slice(1, -1).forEach(o => { const d = cur - o.b[k]; moveLayer(o.l, k === 'x' ? d : 0, k === 'y' ? d : 0); cur += o.b[s] + gap; });
    changed();
  }
  function insertLayer(l, at) {
    let arr = L.doc.layers, idx = arr.length;
    const s = topSel(); const ref = at || (s.length ? s[s.length - 1] : null);
    if (ref) { arr = arrOf(ref.id); idx = arr.indexOf(ref) + 1; } else if (L.ctx && get(L.ctx)) { arr = get(L.ctx).children; idx = arr.length; }
    arr.splice(idx, 0, l); reindex(); changed(true); setSel([l.id]); push();
  }
  function viewCenter() { const h = q('lxHost'); const r = h.getBoundingClientRect(); const [x, y] = toPg(r.left + h.clientWidth / 2, r.top + h.clientHeight / 2); return [clamp(x, 40, L.doc.w - 40), clamp(y, 40, L.doc.h - 40)]; }
  function addText(lang) {
    const ar = lang !== 'en'; const [cx, cy] = viewCenter(); const w = Math.min(420, L.doc.w * .6);
    const l = { id: uid(), type: 'text', name: '', x: cx - w / 2, y: cy - 20, w, h: 40, rot: 0, op: 1, ah: true, aw: true, html: ar ? 'نص جديد' : 'New text', st: { ff: ar ? 'Tajawal' : 'Sequel', fs: ar ? 30 : 24, fw: ar ? 700 : 400, col: '#002657', ta: ar ? 'right' : 'left', lh: 1.4, ls: 0, dir: ar ? 'rtl' : 'ltr', pad: [0, 0, 0, 0] } };
    insertLayer(l); setTimeout(() => startEdit(get(l.id)), 30);
  }
  function addShape(kind) {
    const [cx, cy] = viewCenter(); const line = kind === 'line'; const sq = kind === 'square'; const w = line ? 260 : kind === 'ellipse' || sq ? 180 : 260, h = line ? 2 : kind === 'ellipse' || sq ? 180 : 150;
    insertLayer({ id: uid(), type: 'shape', shape: kind === 'ellipse' ? 'ellipse' : 'rect', name: line ? 'خط' : kind === 'ellipse' ? 'دائرة' : sq ? 'مربع' : 'مستطيل', x: cx - w / 2, y: cy - h / 2, w, h, rot: 0, op: 1, fill: line ? '#D6D9D4' : kind === 'ellipse' ? '#62B6F3' : sq ? '#004EAA' : '#EEF2F6', rad: line ? [1, 1, 1, 1] : [16, 16, 16, 16], bd: null });
  }
  function iconSvg(name, sw) { let s = svgIcon(name, sw || 1.8); return s.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" '); }
  function addIcon(name, x, y) {
    const sel = topSel(); if (sel.length === 1 && sel[0].type === 'svg' && x == null) { const l = sel[0]; l.svg = iconSvg(name, l.sw || 1.8); l.icon = name; l.name = ''; changed(); say('تم تبديل الأيقونة'); return; }
    const [cx, cy] = x != null ? [x, y] : viewCenter(); insertLayer({ id: uid(), type: 'svg', name: '', icon: name, sw: 1.8, x: cx - 32, y: cy - 32, w: 64, h: 64, rot: 0, op: 1, col: '#004EAA', svg: iconSvg(name, 1.8) });
  }
  function addLogo() { const svg = ASSETS.logo.replace(/rgb\(100%,\s*100%,\s*100%\)/g, 'currentColor').replace(/fill="#fff(fff)?"/gi, 'fill="currentColor"'); const w = Math.round(Math.min(150, L.doc.w * .16)), h = Math.round(w * 24 / 72.5); insertLayer({ id: uid(), type: 'svg', name: 'شعار مطارات جدة', x: L.doc.w - w - 36, y: 30, w, h, rot: 0, op: 1, col: '#002657', svg: svg.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" ') }); }
  async function imgInfo(src) { const im = new Image(); im.src = src; try { await im.decode(); } catch (e) { } return { w: im.naturalWidth || 400, h: im.naturalHeight || 300 }; }
  async function fileToData(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }); }
  async function shrinkData(src, max) { const i = await imgInfo(src); if (Math.max(i.w, i.h) <= max) return src; const k = max / Math.max(i.w, i.h); const c = document.createElement('canvas'); c.width = Math.round(i.w * k); c.height = Math.round(i.h * k); const im = new Image(); im.src = src; await im.decode(); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return /png|webp|gif/.test(src.slice(0, 30)) ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .92); }
  async function addImageData(src, x, y) {
    src = await shrinkData(src, 4000); const i = await imgInfo(src); const mx = L.doc.w * .5, my = L.doc.h * .5; const k = Math.min(1, mx / i.w, my / i.h); const w = i.w * k, h = i.h * k;
    const [cx, cy] = x != null ? [x, y] : viewCenter();
    insertLayer({ id: uid(), type: 'image', name: 'صورة', x: cx - w / 2, y: cy - h / 2, w, h, rot: 0, op: 1, src: putAsset(src), ix: 0, iy: 0, iw: w, ih: h, rad: [0, 0, 0, 0] });
  }
  async function replaceImage(l, src) { src = await shrinkData(src, 4000); const i = await imgInfo(src); const k = Math.max(l.w / i.w, l.h / i.h); l.iw = i.w * k; l.ih = i.h * k; l.ix = (l.w - l.iw) / 2; l.iy = (l.h - l.ih) / 2; l.src = putAsset(src); changed(); say('تم استبدال الصورة'); }
  async function fitImage(l, mode) { const i = await imgInfo(assetSrc(l.src)); const k = mode === 'contain' ? Math.min(l.w / i.w, l.h / i.h) : Math.max(l.w / i.w, l.h / i.h); l.iw = i.w * k; l.ih = i.h * k; l.ix = (l.w - l.iw) / 2; l.iy = (l.h - l.ih) / 2; changed(); }
  async function frameToImage(l) { const i = await imgInfo(assetSrc(l.src)); const k = Math.min(l.iw / i.w, l.ih / i.h); const cx = l.x + l.ix + l.iw / 2, cy = l.y + l.iy + l.ih / 2; l.w = l.iw; l.h = l.ih; l.x = cx - l.w / 2; l.y = cy - l.h / 2; l.ix = 0; l.iy = 0; changed(); }
  function zoomInner(l, f) { const cx = l.ix + l.iw / 2, cy = l.iy + l.ih / 2; l.iw *= f; l.ih *= f; l.ix = cx - l.iw / 2; l.iy = cy - l.ih / 2; paint(); }
  async function removeBg(l) {
    if (typeof cutout !== 'function') return say('تفريغ الخلفية غير متاح في هذه النسخة');
    const r = await cutout(assetSrc(l.src)); if (!r) return;
    const k = Math.min(l.w / r.w, l.h / r.h); const w = r.w * k, h = r.h * k; l.src = putAsset(r.src); l.iw = w; l.ih = h; l.ix = (l.w - w) / 2; l.iy = (l.h - h) / 2; changed(); say('تم تفريغ الخلفية');
  }
  /* clipboard (inside the tool) */
  function copySel(cut) { const ts = topSel(); if (!ts.length) return; const fo = flatOrder(); L.clip = { items: ts.slice().sort((a, b) => fo.get(a.id) - fo.get(b.id)).map(CL), assets: {} }; const used = usedAssets(L.clip.items); used.forEach(k => { L.clip.assets[k] = L.A[k]; }); L.clip.n = 0; try { localStorage.setItem('jedLX_clip', JSON.stringify(L.clip)); } catch (x) { } if (cut) delSel(); else say(ts.length > 1 ? `تم نسخ ${ts.length} طبقات` : 'تم النسخ'); }
  function pasteClip() { let c = L.clip; if (!c) { try { c = JSON.parse(localStorage.getItem('jedLX_clip') || 'null'); } catch (x) { } } if (!c || !c.items || !c.items.length) return false; Object.entries(c.assets || {}).forEach(([k, v]) => { if (v && !L.A[k]) { L.A[k] = v; L.AI.set(v, k); } }); c.n = (c.n || 0) + 1; const items = c.items.map(it => { const x = reid(CL(it)); moveLayer(x, 14 * c.n, 14 * c.n); return x; }); const s = topSel(); let arr = L.doc.layers, i = arr.length; if (s.length) { arr = arrOf(s[s.length - 1].id); i = arr.indexOf(s[s.length - 1]) + 1; } arr.splice(i, 0, ...items); reindex(); setSel(items.map(l => l.id)); changed(); return true; }
  function usedAssets(layers) { const s = new Set(); const w = arr => arr.forEach(l => { if (l.type === 'group') w(l.children); else if (l.type === 'image' && l.src) s.add(l.src); }); w(layers); return [...s]; }

  /* ---------------- layers panel ---------------- */
  function thumbOf(l) {
    if (l.type === 'image') return `<span class="th"><img src="${ESC(assetSrc(l.src))}" alt=""></span>`;
    if (l.type === 'text') return `<span class="th"><b>T</b></span>`;
    if (l.type === 'shape') { const bg = l.grad || (l.fill && l.fill !== 'transparent' ? l.fill : 'transparent'); const bd = l.bd && l.bd.find(b => b && b.w > 0); return `<span class="th"><i style="background:${ESC(bg)};${bd ? `border:1.5px solid ${ESC(bd.c)};` : ''}${l.shape === 'ellipse' ? 'border-radius:50%;width:13px;height:13px' : ''}${l.h < 4 ? ';height:2px' : ''}${l.w < 4 ? ';width:2px;height:16px' : ''}"></i></span>`; }
    if (l.type === 'svg') return `<span class="th" style="color:${ESC(l.col || '#004EAA')}">${l.svg && l.svg.length < 4000 ? l.svg : IC('shapes')}</span>`;
    return `<span class="th">${IC(L.open[l.id] ? 'folder-open' : 'folder')}</span>`;
  }
  function renderPanel() {
    const box = q('lxList'); if (!box || !L.on) return;
    const rows = []; const visit = (arr, depth) => { for (let i = arr.length - 1; i >= 0; i--) { const l = arr[i]; rows.push([l, depth]); if (l.type === 'group' && L.open[l.id]) visit(l.children, depth + 1); } };
    visit(L.doc.layers, 0); L._rows = rows.map(r => r[0].id);
    if (!rows.length) { box.innerHTML = `<div class="lxEmpty">ما فيه طبقات للحين.<br>أضف نص أو صورة أو شكل من الخصائص، أو اسحب أيقونة على التصميم.</div>`; return; }
    box.innerHTML = rows.map(([l, d]) => `<div class="lxR${L.sel.includes(l.id) ? ' on' : ''}${l.hidden ? ' hid' : ''}${L.ctx === l.id ? ' inctx' : ''}" data-id="${l.id}"><span class="ind" style="width:${d * 14}px"></span>${l.type === 'group' ? `<span class="car${L.open[l.id] ? ' cl' : ''}" data-a="tog">${IC('chevron-left', 2.4)}</span>` : '<span class="car"></span>'}${thumbOf(l)}<span class="nm" title="${ESC(nameOf(l))}">${ESC(nameOf(l))}</span><button class="ib${l.locked ? ' st' : ''}" data-a="lock" title="${l.locked ? 'فتح القفل' : 'قفل الطبقة (ما تتحرك ولا تتحدد من التصميم)'}">${IC(l.locked ? 'lock' : 'lock-open')}</button><button class="ib${l.hidden ? ' st' : ''}" data-a="eye" title="${l.hidden ? 'إظهار' : 'إخفاء'}">${IC(l.hidden ? 'eye-off' : 'eye')}</button></div>`).join('');
    const on = box.querySelector('.lxR.on'); if (on && !box._noScroll) { const r = on.getBoundingClientRect(), br = box.getBoundingClientRect(); if (r.top < br.top || r.bottom > br.bottom) on.scrollIntoView({ block: 'nearest' }); }
    const cnt = q('lxCount'); if (cnt) cnt.textContent = `${all().filter(l => l.type !== 'group').length} طبقة`;
  }
  function wirePanel() {
    const box = q('lxList'); let pd = null;
    box.addEventListener('pointerdown', e => {
      const row = e.target.closest('.lxR'); if (!row || e.button !== 0) return; const id = row.dataset.id; const a = e.target.closest('[data-a]');
      if (a) { e.preventDefault(); const l = get(id); if (a.dataset.a === 'tog') { L.open[id] = !L.open[id]; renderPanel(); } if (a.dataset.a === 'eye') { l.hidden = !l.hidden; if (l.hidden) L.sel = L.sel.filter(x => x !== id); changed(); } if (a.dataset.a === 'lock') { l.locked = !l.locked; changed(); } return; }
      if (e.target.closest('input')) return;
      pd = { id, y0: e.clientY, x0: e.clientX, started: false, e: { shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey }, pid: e.pointerId };
    });
    box.addEventListener('pointermove', e => {
      if (!pd) { const row = e.target.closest('.lxR'); const id = row ? row.dataset.id : null; if (id !== L.hover) { L.hover = id; drawOv(); } return; }
      if (!pd.started && Math.abs(e.clientY - pd.y0) < 5) return;
      if (!pd.started) { pd.started = true; try { box.setPointerCapture(pd.pid); } catch (x) { } if (!L.sel.includes(pd.id)) setSel([pd.id]); box._noScroll = true; [...box.querySelectorAll('.lxR')].forEach(r => { if (L.sel.includes(r.dataset.id)) r.classList.add('drag'); }); }
      box.querySelectorAll('.dropA,.dropB,.dropIn').forEach(r => r.classList.remove('dropA', 'dropB', 'dropIn'));
      const t = document.elementFromPoint(e.clientX, e.clientY); const row = t && t.closest && t.closest('.lxR'); pd.target = null;
      const br = box.getBoundingClientRect(); if (e.clientY < br.top + 24) box.scrollTop -= 10; if (e.clientY > br.bottom - 24) box.scrollTop += 10;
      if (!row || L.sel.includes(row.dataset.id) || L.sel.some(s => isIn(row.dataset.id, s))) return;
      const r = row.getBoundingClientRect(); const f = (e.clientY - r.top) / r.height; const tl = get(row.dataset.id);
      const pos = tl.type === 'group' && f > .28 && f < .72 ? 'in' : f < .5 ? 'above' : 'below';
      row.classList.add(pos === 'in' ? 'dropIn' : pos === 'above' ? 'dropB' : 'dropA'); pd.target = { id: row.dataset.id, pos };
    });
    const end = e => {
      if (!pd) return; const p = pd; pd = null; box._noScroll = false; try { box.releasePointerCapture(e.pointerId); } catch (x) { }
      box.querySelectorAll('.drag,.dropA,.dropB,.dropIn').forEach(r => r.classList.remove('drag', 'dropA', 'dropB', 'dropIn'));
      if (!p.started) { // click (a second click on the same row = rename)
        const id = p.id; const now = Date.now(); if (lastClick.id === id && now - lastClick.t < 420 && !p.e.shiftKey && !MOD(p.e)) { lastClick = {}; renamePanel(id); return; } lastClick = { id, t: now }; if (p.e.shiftKey && L.sel.length) { const rows = L._rows; const a = rows.indexOf(L.sel[L.sel.length - 1]), b = rows.indexOf(id); const [s, t] = a < b ? [a, b] : [b, a]; const parent = parentOf(id); setSel(rows.slice(s, t + 1).filter(x => parentOf(x) === parent)); }
        else if (MOD(p.e)) setSel(L.sel.includes(id) ? L.sel.filter(x => x !== id) : L.sel.concat(id));
        else setSel([id]);
        return;
      }
      if (p.target) moveTo(topSel().map(l => l.id), p.target.id, p.target.pos);
    };
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    let lastClick = {};
    function renamePanel(id) { const row = box.querySelector(`.lxR[data-id="${id}"]`); if (!row) return; const l = get(id); const nm = row.querySelector('.nm'); nm.innerHTML = `<input value="${ESC(nameOf(l))}">`; const inp = nm.firstChild; inp.focus(); inp.select(); const done = ok => { if (inp._d) return; inp._d = 1; if (ok) { const v = inp.value.trim(); l.name = v; changed(); } else renderPanel(); }; inp.onkeydown = ev => { ev.stopPropagation(); if (ev.key === 'Enter') done(true); if (ev.key === 'Escape') done(false); }; inp.onblur = () => done(true); inp.onpointerdown = ev => ev.stopPropagation(); }
  }
  function moveTo(ids, tid, pos) {
    const fo = flatOrder(); const items = ids.map(get).filter(Boolean).sort((a, b) => fo.get(a.id) - fo.get(b.id)); if (!items.length) return;
    const tgt = get(tid); if (!tgt || items.some(l => l.id === tid || (l.type === 'group' && isIn(tid, l.id)))) return;
    items.forEach(l => { const a = arrOf(l.id); a.splice(a.indexOf(l), 1); reindex(); });
    if (pos === 'in') { tgt.children.push(...items); L.open[tgt.id] = true; }
    else { const a = arrOf(tid); const i = a.indexOf(tgt); a.splice(pos === 'above' ? i + 1 : i, 0, ...items); }
    reindex(); pruneGroups(); reindex(); setSel(items.map(l => l.id)); changed();
  }

  /* ---------------- properties panel ---------------- */
  const swatches = (fn, cur, none) => `<div class="sws">${none ? `<button class="sw none${!cur || cur === 'transparent' ? ' on' : ''}" title="بدون" data-c="${fn}" data-v="transparent"></button>` : ''}${BRAND.map(c => `<button class="sw${cur && toHex(cur).toUpperCase() === c ? ' on' : ''}" style="background:${c}" title="${c}" data-c="${fn}" data-v="${c}"></button>`).join('')}<label class="sw pick" title="لون مخصص"><input type="color" data-cp="${fn}" value="${/^#[0-9a-f]{6}$/i.test(toHex(cur) || '') ? toHex(cur) : '#004eaa'}"></label>${window.EyeDropper ? `<button class="sw eye" data-eye="${fn}" title="قطّارة: خذ لون من الشاشة">${IC('pipette', 2)}</button>` : ''}</div>`;
  const num = (k, lbl, v, dis) => `<label class="num" title="${lbl}"><span data-scrub="${k}">${lbl}</span><input type="number" data-n="${k}" value="${v}" ${dis ? 'disabled' : ''} step="1"></label>`;
  function geomVals() { const ts = topSel(); const single = ts.length === 1 && ts[0].type !== 'group' ? ts[0] : null; const b = single ? { x: single.x, y: single.y, w: single.w, h: single.h } : selBox(); return { b, rot: single ? single.rot || 0 : 0, single }; }
  function updNums() { const p = q('lxProps'); if (!p || !L.sel.length) return; const { b, rot } = geomVals(); if (!b) return; const set = (k, v) => { const i = p.querySelector(`[data-n="${k}"]`); if (i && document.activeElement !== i) i.value = Math.round(v * 10) / 10; }; set('x', b.x); set('y', b.y); set('w', b.w); set('h', b.h); set('r', rot); }
  function selHead(ts) {
    if (ts.length > 1) return `<div class="sel"><span class="th">${IC('layers')}</span><div><b>${ts.length} طبقات محددة</b><small>التعديل تحت ينطبق عليها كلها</small></div></div>`;
    const l = ts[0]; const th = l.type === 'image' ? `<img src="${ESC(assetSrc(l.src))}" alt="">` : IC(TYPE_IC[l.type]);
    const inside = parentOf(l.id); return `<div class="sel"><span class="th">${th}</span><div><b>${TYPE_AR[l.type]}${l.locked ? ' · مقفولة' : ''}</b><small>${ESC(nameOf(l))}</small></div></div>${inside ? `<div class="row"><button class="b" data-a="selParent" style="flex:1" title="Esc">${IC('folder-open')} داخل «${ESC(nameOf(inside).slice(0, 24))}» — حدد المجموعة كاملة</button></div>` : ''}`;
  }
  function renderProps() {
    const p = q('lxProps'); if (!p || !L.on) return;
    const keepAi = q('lxAiReq') ? q('lxAiReq').value : '';
    const ts = topSel(); let h = '';
    if (L.aiMode) h += aiPanel();
    if (!ts.length) { h += pageProps(); p.innerHTML = h; afterProps(p, keepAi); return; }
    const one = ts.length === 1 ? ts[0] : null; const { b, rot, single } = geomVals();
    h += selHead(ts);
    h += `<div class="row"><button class="b${L.paint ? ' on' : ''}" data-a="paint" style="flex:1" title="كليك: مرة وحدة · دبل كليك: يظل شغّال لين Esc">${IC('paintbrush')} ناسخ التنسيق</button><button class="b ic" data-a="lookCopy" title="نسخ التنسيق (${MAC ? '⌘⌥C' : 'Ctrl+Alt+C'})">${IC('copy')}</button><button class="b ic" data-a="lookPaste" title="لصق التنسيق على المحدد (${MAC ? '⌘⌥V' : 'Ctrl+Alt+V'})">${IC('clipboard-paste')}</button></div>`;
    h += `<h4>المحاذاة ${ts.length === 1 ? '<small style="font-weight:400;color:#7A8AA3">(بالنسبة للصفحة)</small>' : ''}</h4><div class="row"><div class="seg">${[['r', 'align-end-vertical', 'يمين'], ['c', 'align-center-vertical', 'وسط أفقي'], ['l', 'align-start-vertical', 'يسار'], ['t', 'align-start-horizontal', 'أعلى'], ['m', 'align-center-horizontal', 'وسط عمودي'], ['b', 'align-end-horizontal', 'أسفل']].map(([k, i, t]) => `<button data-al="${k}" title="${t}">${IC(i)}</button>`).join('')}</div></div>`;
    if (ts.length >= 3) h += `<div class="row"><button class="b" data-a="disH" style="flex:1">${IC('align-horizontal-distribute-center')} توزيع أفقي</button><button class="b" data-a="disV" style="flex:1">${IC('align-vertical-distribute-center')} توزيع عمودي</button></div>`;
    h += `<h4>المقاس والمكان</h4><div class="grid4">${num('x', 'X', R1(b.x))}${num('y', 'Y', R1(b.y))}${num('w', 'W', R1(b.w))}${num('h', 'H', R1(b.h), single && single.type === 'text' && single.ah !== false)}</div><div class="grid4">${num('r', '°', R1(rot), !single)}<button class="b" data-a="lockRatio" title="تكبير وتصغير بنفس النسبة">${IC(L.ratio === false ? 'lock-open' : 'lock')} ${L.ratio === false ? 'نسبة حرة' : 'نفس النسبة'}</button></div>`;
    const op = one ? Math.round((one.op ?? 1) * 100) : 100;
    h += `<div class="row"><label>الشفافية</label><input type="range" min="0" max="100" value="${op}" data-r="op"><span class="rv">${op}%</span></div>`;
    if (one && one.type === 'text') h += textProps(one);
    if (one && one.type === 'shape') h += shapeProps(one);
    if (one && one.type === 'image') h += imageProps(one);
    if (one && one.type === 'svg') h += svgProps(one);
    if (one && one.type === 'group') h += `<h4>المجموعة</h4><div class="row"><button class="b" data-a="enter" style="flex:1">${IC('scan-eye')} دخول للعناصر</button><button class="b" data-a="ungroup" style="flex:1">${IC('ungroup')} فك التجميع</button></div><div class="row"><button class="b" data-a="flatThis" style="flex:1">${IC('layers-3')} فك كل المجموعات داخلها</button></div>`;
    if (ts.length > 1 && ts.every(l => l.type === 'text')) h += multiTextProps(ts);
    h += `<h4>ترتيب الطبقة</h4><div class="row"><div class="seg"><button data-a="front" title="للأمام تماماً (${K('⇧]')})">${IC('bring-to-front')}</button><button data-a="fwd" title="خطوة للأمام (${K(']')})">${IC('arrow-up')}</button><button data-a="bwd" title="خطوة للخلف (${K('[')})">${IC('arrow-down')}</button><button data-a="back" title="للخلف تماماً (${K('⇧[')})">${IC('send-to-back')}</button></div></div>`;
    h += `<div class="row">${ts.length > 1 ? `<button class="b" data-a="group" style="flex:1" title="${K('G')}">${IC('group')} تجميع</button>` : ''}${ts.length > 1 && ts.filter(l => l.type === 'group').length >= 1 ? `<button class="b" data-a="mergeG" style="flex:1">${IC('combine')} دمج المجموعات</button>` : ''}</div>`;
    h += `<div class="row"><button class="b" data-a="dup" style="flex:1" title="${K('D')}">${IC('copy')} نسخ</button><button class="b" data-a="lock" style="flex:1">${IC(ts.every(l => l.locked) ? 'lock-open' : 'lock')} ${ts.every(l => l.locked) ? 'فتح' : 'قفل'}</button><button class="b dn" data-a="del" style="flex:1">${IC('trash-2')} حذف</button></div>`;
    h += `<div class="row"><button class="b" data-a="raster" style="flex:1" title="تدمج الطبقات المحددة في صورة وحدة (مثل Merge في الفوتوشوب)">${IC('images')} تحويل لصورة</button><button class="b" data-a="expSel" style="flex:1" title="تصدير المحدد فقط كصورة PNG">${IC('file-image')} تصدير المحدد</button></div>`;
    if (!L.aiMode) h += `<div class="row"><button class="b ai" data-a="aiOn" style="flex:1">${IC('sparkles')} تعديل ذكي على المحدد</button></div>`;
    p.innerHTML = h; afterProps(p, keepAi);
  }
  function textProps(l) {
    const t = l.st; const ed = !!L.editing; const fam = (t.ff || '').split(',')[0].replace(/['"]/g, '').trim();
    const lh = t.lh ? R2(t.lh) : 1.2;
    return `<h4>النص ${ed ? '<small style="font-weight:400;color:#FC5C17">· وضع الكتابة: الألوان والحجم والعريض تنطبق على الكلام المظلل</small>' : ''}</h4>
    <div class="row"><button class="b pri" data-a="${ed ? 'endEdit' : 'edit'}" style="flex:1">${IC(ed ? 'badge-check' : 'pen-line')} ${ed ? 'إنهاء الكتابة (Esc)' : 'تعديل الكلام (دبل كليك)'}</button></div>
    <div class="row"><select data-s="ff">${FONTS.map(([v, n]) => `<option value="${v}"${fam === v ? ' selected' : ''}>${n}</option>`).join('')}${FONTS.some(f => f[0] === fam) ? '' : `<option value="${ESC(fam)}" selected>${ESC(fam)} (خارج الهوية)</option>`}</select></div>
    <div class="row"><div class="seg" style="flex:none;width:120px"><button data-a="fw4" class="${+t.fw < 600 ? 'on' : ''}">عادي</button><button data-a="fw7" class="${+t.fw >= 600 ? 'on' : ''}"><b>عريض</b></button></div>${num('fs', 'px', R1(t.fs))}<button class="b ic" data-a="fs-" title="أصغر">A−</button><button class="b ic" data-a="fs+" title="أكبر">A+</button></div>
    <div class="row"><div class="seg">${[['right', 'align-right', 'يمين'], ['center', 'align-center', 'وسط'], ['left', 'align-left', 'يسار'], ['justify', 'align-justify', 'ضبط']].map(([k, i, n]) => `<button data-ta="${k}" class="${(t.ta || 'right') === k ? 'on' : ''}" title="${n}">${IC(i)}</button>`).join('')}</div><div class="seg" style="flex:none;width:86px"><button data-dir="rtl" class="${t.dir !== 'ltr' ? 'on' : ''}" title="عربي (من اليمين)">ع</button><button data-dir="ltr" class="${t.dir === 'ltr' ? 'on' : ''}" title="English (from the left)">En</button></div></div>
    <div class="row"><label>لون النص</label></div>${swatches('tcol', t.col)}
    <div class="row" style="margin-top:8px"><label>تباعد الأسطر</label><input type="range" min="0.8" max="2.6" step="0.05" value="${lh}" data-r="lh"><span class="rv">${lh}</span></div>
    <div class="row"><label>تباعد الحروف</label><input type="range" min="-3" max="12" step="0.1" value="${t.ls || 0}" data-r="ls"><span class="rv">${R1(t.ls || 0)}</span></div>
    <div class="row"><label>العرض</label><div class="seg"><button data-a="awOn" class="${l.aw ? 'on' : ''}" title="الصندوق يكبر مع الكلام (سطر واحد)">تلقائي</button><button data-a="awOff" class="${!l.aw ? 'on' : ''}" title="عرض ثابت والكلام ينزل سطر جديد">ثابت</button></div></div>
    <div class="row"><label>الارتفاع</label><div class="seg"><button data-a="ahOn" class="${l.ah !== false ? 'on' : ''}">تلقائي</button><button data-a="ahOff" class="${l.ah === false ? 'on' : ''}">ثابت</button></div></div>
    <div class="row"><label>خلفية النص</label></div>${swatches('tbg', t.bg, true)}`;
  }
  function multiTextProps(ts) { return `<h4>النص (لكل المحدد)</h4><div class="row"><select data-s="ffAll"><option value="">— الخط —</option>${FONTS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></div><div class="row"><button class="b ic" data-a="fsAll-">A−</button><button class="b ic" data-a="fsAll+">A+</button><div class="seg"><button data-a="fwAll4">عادي</button><button data-a="fwAll7"><b>عريض</b></button></div></div><div class="row"><label>لون النص</label></div>${swatches('tcolAll', null)}`; }
  function shapeProps(l) {
    const r = (l.rad || [0])[0]; const rn = typeof r === 'number' ? r : px(r); const b = (l.bd || []).find(x => x && x.w > 0); const mixed = l.bd && l.bd.some(x => x && x.w > 0) && !l.bd.every(x => x && x.w > 0);
    return `${l._img ? `<div class="row"><button class="b" data-a="backImg" style="flex:1">${IC('image')} رجوع للصورة</button></div>` : ''}<h4>الشكل</h4><div class="row"><div class="seg"><button data-sh="rect" class="${l.shape !== 'ellipse' ? 'on' : ''}">${IC('square')} مستطيل</button><button data-sh="ellipse" class="${l.shape === 'ellipse' ? 'on' : ''}">${IC('circle')} دائرة</button></div></div>
    <div class="row"><label>التعبئة</label>${l.grad ? `<button class="b" data-a="noGrad" title="فيه تدرج لوني — اضغط لتحويله للون واحد">${IC('x')} إزالة التدرج</button>` : ''}</div>${swatches('fill', l.grad ? null : l.fill, true)}
    ${l.shape !== 'ellipse' ? `<div class="row" style="margin-top:8px"><label>الزوايا</label><input type="range" min="0" max="${Math.round(Math.min(l.w, l.h) / 2)}" value="${R1(rn)}" data-r="rad"><span class="rv">${R1(rn)}</span></div>` : ''}
    <div class="row" style="margin-top:6px"><label>الإطار</label>${b ? `<input type="range" min="0.5" max="20" step="0.5" value="${b.w}" data-r="bw"><span class="rv">${b.w}</span>` : ''}${mixed ? `<button class="b" data-a="bdAll">إطار كامل</button>` : ''}</div>${swatches('bd', b ? b.c : null, true)}`;
  }
  function imageProps(l) {
    const crop = L.crop === l.id; const f = parseFilt(l.filt);
    return `<h4>الصورة</h4><div class="row"><button class="b pri" data-a="imgRep" style="flex:1">${IC('replace')} استبدال الصورة</button><button class="b${L.imgFill ? ' on' : ''}" data-a="imgFillT" style="flex:1" title="تبدّل الصورة بلون تختاره، بنفس الإطار والزوايا">${IC('paint-bucket')} تعبئة بلون</button></div>
    ${L.imgFill ? `<div class="row"><label>اختر لون التعبئة</label></div>${swatches('imgfill', null)}` : ''}
    <div class="row"><button class="b${crop ? ' on' : ''}" data-a="crop" style="flex:1">${IC('crop')} ${crop ? 'إنهاء القص' : 'قص / تحريك داخل الإطار'}</button></div>
    ${crop ? `<div class="row"><label>تكبير</label><button class="b ic" data-a="iz-">−</button><button class="b ic" data-a="iz+">+</button></div>` : ''}
    <div class="row"><div class="seg"><button data-a="cover" title="تعبئة الإطار كامل">ملء الإطار</button><button data-a="contain" title="الصورة كاملة داخل الإطار">احتواء</button><button data-a="toImg" title="الإطار بحجم الصورة">إطار بحجم الصورة</button></div></div>
    <div class="row"><button class="b" data-a="flipX" style="flex:1">${IC('flip-horizontal-2')} قلب أفقي</button><button class="b" data-a="flipY" style="flex:1">${IC('flip-vertical-2')} قلب عمودي</button></div>
    <div class="row"><button class="b" data-a="rmbg" style="flex:1">${IC('wand-sparkles')} إزالة الخلفية</button><button class="b" data-a="circle" style="flex:1">${IC('circle')} قص دائري</button></div>
    <div class="row"><label>الزوايا</label><input type="range" min="0" max="${Math.round(Math.min(l.w, l.h) / 2)}" value="${R1(px((l.rad || [0])[0]))}" data-r="irad"><span class="rv">${R1(px((l.rad || [0])[0]))}</span></div>
    <h4>تحسين الصورة</h4>
    <div class="row"><label>الإضاءة</label><input type="range" min="50" max="150" value="${f.b}" data-r="fb"><span class="rv">${f.b}%</span></div>
    <div class="row"><label>التباين</label><input type="range" min="50" max="150" value="${f.c}" data-r="fc"><span class="rv">${f.c}%</span></div>
    <div class="row"><label>التشبع</label><input type="range" min="0" max="160" value="${f.s}" data-r="fsat"><span class="rv">${f.s}%</span></div>
    <div class="row"><button class="b" data-a="fReset" style="flex:1">↺ إرجاع الألوان الأصلية</button></div>`;
  }
  function svgProps(l) { return `<h4>الأيقونة / الرسم</h4><div class="row"><label>اللون</label></div>${swatches('icol', l.col)}${/stroke-width/.test(l.svg || '') ? `<div class="row" style="margin-top:8px"><label>سماكة الخط</label><input type="range" min="0.5" max="4" step="0.1" value="${l.sw || 1.8}" data-r="sw"><span class="rv">${l.sw || 1.8}</span></div>` : ''}<div class="hint" style="margin-top:8px">لتبديل الأيقونة: اختر أي أيقونة من تبويب «الأيقونات» وهي محددة.</div>`; }
  function parseFilt(f) { const o = { b: 100, c: 100, s: 100 }; if (!f) return o; const m1 = f.match(/brightness\(([\d.]+)\)/), m2 = f.match(/contrast\(([\d.]+)\)/), m3 = f.match(/saturate\(([\d.]+)\)/); if (m1) o.b = Math.round(m1[1] * 100); if (m2) o.c = Math.round(m2[1] * 100); if (m3) o.s = Math.round(m3[1] * 100); return o; }
  function pageProps() {
    const d = L.doc; return `<div class="sel"><span class="th">${IC('frame')}</span><div><b>الصفحة</b><small>${ESC(d.name || 'تصميم')} · ${Math.round(d.w)} × ${Math.round(d.h)}</small></div></div>
    <h4>إضافة</h4><div class="addg"><button class="b" data-a="addTextAr">${IC('type')}نص عربي</button><button class="b" data-a="addTextEn">${IC('text')}English text</button><button class="b" data-a="addImg">${IC('image-plus')}صورة</button><button class="b" data-a="addSquare">${IC('square')}مربع</button><button class="b" data-a="addRect">${IC('rectangle-horizontal')}مستطيل</button><button class="b" data-a="addEllipse">${IC('circle')}دائرة</button><button class="b" data-a="addLine">${IC('minus')}خط فاصل</button><button class="b" data-a="addLogo">${IC('badge-check')}شعار مطارات جدة</button><button class="b" data-a="tabIcons">${IC('shapes')}أيقونة</button></div>
    <h4>مقاس الصفحة</h4><div class="grid4">${num('pw', 'W', Math.round(d.w))}${num('ph', 'H', Math.round(d.h))}</div><div class="row"><button class="b" data-a="fitH" style="flex:1" title="يقص أو يمد الصفحة لآخر عنصر">${IC('maximize')} ملاءمة الارتفاع للمحتوى</button></div>
    <div class="row"><label>لون الخلفية</label></div>${swatches('pbg', d.bg)}
    <h4>أدوات</h4><div class="row"><button class="b" data-a="lint" style="flex:1">${IC('shield-check')} فحص الهوية</button><button class="b" data-a="flatAll" style="flex:1">${IC('layers-3')} فك كل المجموعات</button></div>
    <div class="row"><button class="b" data-a="selAll" style="flex:1">${IC('square-dashed')} تحديد الكل</button><button class="b" data-a="snapT" style="flex:1">${IC('magnet' in ICONS ? 'magnet' : 'move')} ${L.snap === false ? 'تشغيل المغناطيس' : 'إيقاف المغناطيس'}</button></div>
    <div id="lxLint"></div>
    <h4>طريقة الشغل</h4><div class="hint"><b>كليك</b> يحدد الطبقة (أو مجموعتها) · <b>دبل كليك</b> يدخل للمجموعة، ويعدّل النص، ويقص الصورة<br><b>${MAC ? '⌘' : 'Ctrl'} + كليك</b> يحدد أي طبقة مباشرة حتى لو داخل مجموعة<br><b>Shift + كليك</b> أو <b>اسحب مربع</b> من مكان فاضي أو من فوق الخلفية لتحديد أكثر من طبقة<br><b>مربع النص</b>: اسحب أطرافه والكلام ينزل ويطلع معه تلقائياً · <b>Shift</b> على الزاوية يكبّر الخط نفسه<br><b>ناسخ التنسيق</b>: حدد عنصر واضغط الفرشاة ثم اضغط على عنصر ثاني (دبل كليك على الفرشاة يخليها شغّالة لين Esc) · <kbd>${MAC ? '⌘⌥C' : 'Ctrl+Alt+C'}</kbd>/<kbd>${MAC ? '⌘⌥V' : 'Ctrl+Alt+V'}</kbd> نسخ ولصق التنسيق<br>المربعات الصغيرة: تكبير وتصغير · الدائرة فوق: تدوير · <b>Alt</b> من المنتصف · <b>Shift</b> يلغي/يثبت النسبة<br>في الصورة: الأطراف الجانبية <b>تقص</b> والزوايا <b>تكبّر</b><br>اسحب الطبقات في القائمة لتغيير ترتيبها أو لإدخالها داخل مجموعة<br><kbd>${K('G')}</kbd> تجميع · <kbd>${K('⇧G')}</kbd> فك · <kbd>${K('D')}</kbd> نسخ · <kbd>${K('C')}</kbd>/<kbd>${K('V')}</kbd> نسخ ولصق · <kbd>Del</kbd> حذف · الأسهم للتحريك الدقيق · <kbd>Space</kbd> + سحب للتنقل · <kbd>${K('Z')}</kbd> تراجع</div>`;
  }
  function afterProps(p, keepAi) {
    if (q('lxAiReq') && keepAi && !q('lxAiReq').value) q('lxAiReq').value = keepAi;
    p.querySelectorAll('[data-n]').forEach(inp => { inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); }; inp.onchange = () => applyNum(inp.dataset.n, parseFloat(inp.value)); });
    p.querySelectorAll('[data-scrub]').forEach(s => { s.onpointerdown = e => { const k = s.dataset.scrub; const inp = p.querySelector(`[data-n="${k}"]`); if (!inp || inp.disabled) return; const v0 = parseFloat(inp.value) || 0, x0 = e.clientX; s.setPointerCapture(e.pointerId); const mv = ev => { const v = R1(v0 + (ev.clientX - x0) * (ev.shiftKey ? 10 : 1) * (k === 'fs' ? .25 : 1) * -1 * (getComputedStyle(s).direction === 'rtl' ? -1 : 1)); inp.value = v; applyNum(k, v, true); }; const up = () => { s.removeEventListener('pointermove', mv); s.removeEventListener('pointerup', up); push(); }; s.addEventListener('pointermove', mv); s.addEventListener('pointerup', up); }; });
    p.querySelectorAll('[data-r]').forEach(r => { r.oninput = () => { applyRange(r.dataset.r, parseFloat(r.value)); const o = r.nextElementSibling; if (o && o.classList.contains('rv')) o.textContent = r.dataset.r === 'op' || r.dataset.r[0] === 'f' && r.dataset.r !== 'fs' ? r.value + '%' : r.value; }; r.onchange = () => push(true); });
    p.querySelectorAll('[data-cp]').forEach(c => { c.oninput = () => applyColor(c.dataset.cp, c.value, true); c.onchange = () => applyColor(c.dataset.cp, c.value); });
    p.querySelectorAll('select[data-s]').forEach(s => { s.onchange = () => applySelect(s.dataset.s, s.value); });
  }
  function applyNum(k, v, live) {
    if (!isFinite(v)) return;
    if (k === 'pw' || k === 'ph') {
      const old = k === 'pw' ? L.doc.w : L.doc.h, nv = clamp(v, 50, 12000), d = nv - old;
      if (k === 'ph' && d) { // things sitting on the bottom edge (footer, frame lines) follow the page
        L.doc.layers.forEach(l => { const b = aabb(l, true); if (!b || Math.abs(b.y + b.h - old) > 2.5) return; if (l.type === 'shape' && b.h > old * .3) l.h = Math.max(2, l.h + d); else moveLayer(l, 0, d); });
      }
      L.doc[k === 'pw' ? 'w' : 'h'] = nv; paint(); if (!live) { push(); fitZoom(); } return;
    }
    const ts = topSel(); if (!ts.length) return;
    if (k === 'fs') { ts.forEach(l => { if (l.type === 'text') setFs(l, v); }); paint(); if (!live) push(true); return; }
    const { b, single } = geomVals();
    if (single) {
      const l = single; if (k === 'x') l.x = v; if (k === 'y') l.y = v; if (k === 'r') l.rot = ((v % 360) + 540) % 360 - 180;
      if (k === 'w' || k === 'h') { const s0 = CL(l); const keep = L.ratio !== false && l.type !== 'text'; let sx = k === 'w' ? v / s0.w : (keep ? v / s0.h : 1), sy = k === 'h' ? v / s0.h : (keep ? v / s0.w : 1); if (l.type === 'text') { if (k === 'w') l.aw = false; l.w = k === 'w' ? Math.max(4, v) : l.w; if (k === 'h') { l.ah = false; l.h = Math.max(4, v); } } else scaleLeaf(l, s0, s0.x, s0.y, sx, sy, keep); if (l.type !== 'text') { l.x = s0.x; l.y = s0.y; } }
    } else {
      if (k === 'x' || k === 'y') { const d = v - (k === 'x' ? b.x : b.y); ts.forEach(l => moveLayer(l, k === 'x' ? d : 0, k === 'y' ? d : 0)); }
      if (k === 'w' || k === 'h') { const keep = L.ratio !== false; const s = v / (k === 'w' ? b.w : b.h); const sx = k === 'w' || keep ? s : 1, sy = k === 'h' || keep ? s : 1; const lv = []; ts.forEach(l => leaves(l, lv)); lv.forEach(l => scaleLeaf(l, CL(l), b.x, b.y, sx, sy, keep)); }
    }
    paint(); updNums(); if (!live) push(true);
  }
  function setFs(l, v) { v = clamp(v, 4, 600); const r = v / (l.st.fs || 16); l.st.fs = R1(v); l.html = l.html.replace(/font-size\s*:\s*([\d.]+)px/g, (m, n) => 'font-size:' + R2(n * r) + 'px'); }
  function applyRange(k, v) {
    const ts = topSel(); const one = ts[0];
    if (k === 'op') { ts.forEach(l => l.op = v / 100); paint(); return; }
    if (!one) return;
    if (k === 'lh') one.st.lh = v; if (k === 'ls') one.st.ls = v;
    if (k === 'rad') { one.rad = [v, v, v, v]; } if (k === 'irad') one.rad = [v, v, v, v];
    if (k === 'bw') { one.bd = (one.bd || [null, null, null, null]).map(b => b && b.w > 0 ? Object.assign({}, b, { w: v }) : b); }
    if (k === 'sw') { one.sw = v; one.svg = one.svg.replace(/stroke-width="[^"]*"/, `stroke-width="${v}"`); }
    if (k === 'fb' || k === 'fc' || k === 'fsat') { const f = parseFilt(one.filt); if (k === 'fb') f.b = v; if (k === 'fc') f.c = v; if (k === 'fsat') f.s = v; one.filt = f.b === 100 && f.c === 100 && f.s === 100 ? '' : `brightness(${f.b / 100}) contrast(${f.c / 100}) saturate(${f.s / 100})`; }
    paint();
  }
  function applyColor(fn, v, live) {
    const ts = topSel(); const one = ts[0];
    if (fn === 'pbg') { L.doc.bg = v; paint(); if (!live) { push(); } return; }
    if ((fn === 'tcol' || fn === 'tbg') && L.editing && rangeInEdit()) { styleRange(fn === 'tcol' ? 'color' : 'backgroundColor', v === 'transparent' ? 'transparent' : v); if (!live) { syncEditing(); } return; }
    if (fn === 'tcolAll') { ts.forEach(l => { if (l.type === 'text') { l.st.col = v; l.html = stripProp(l.html, 'color'); } }); }
    if (!one) return;
    if (fn === 'tcol') { one.st.col = v; one.html = stripProp(one.html, 'color'); if (L.editing) { L.editing.style.color = v; L.editing.querySelectorAll('[style]').forEach(c => c.style.color = ''); } }
    if (fn === 'tbg') one.st.bg = v === 'transparent' ? '' : v;
    if (fn === 'fill') { one.fill = v; if (v !== 'transparent') one.grad = ''; }
    // v2.0: a picture becomes a colour fill in the same frame (the picture is kept, «رجوع للصورة» brings it back)
    if (fn === 'imgfill' && one.type === 'shape' && one._img) one.fill = v;
    if (fn === 'imgfill' && one.type === 'image') { one._img = { src: one.src, ix: one.ix, iy: one.iy, iw: one.iw, ih: one.ih, filt: one.filt, flipX: one.flipX, flipY: one.flipY }; one.type = 'shape'; one.shape = 'rect'; one.fill = v; one.grad = ''; one.bd = one.bd || null; one.rad = one.rad || [0, 0, 0, 0]; one.name = one.name && one.name !== 'صورة' ? one.name : 'تعبئة'; L.imgFill = false; if (L.crop === one.id) L.crop = null; }
    if (fn === 'bd') { if (v === 'transparent') one.bd = null; else { const cur = (one.bd || []).find(b => b && b.w > 0); const w = cur ? cur.w : 1.5; one.bd = (one.bd && one.bd.some(b => b && b.w > 0) ? one.bd : [1, 1, 1, 1].map(() => ({ w, s: 'solid', c: v }))).map(b => b && b.w > 0 ? Object.assign({}, b, { c: v }) : b); } }
    if (fn === 'icol') one.col = v;
    paint(); if (!live) { push(true); renderProps(); }
  }
  function syncEditing() { const el = L.editing; if (!el) return; const l = get(el.dataset.id); if (l) { l.html = cleanHtml(el.innerHTML); el._h = l.html; push(true); } }
  function stripProp(html, prop) { return html.replace(new RegExp(`(^|[;"\\s])${prop}\\s*:[^;"]*;?`, 'g'), '$1'); }
  function applySelect(k, v) { const ts = topSel(); if (k === 'ff') { const l = ts[0]; l.st.ff = v; l.html = stripProp(l.html, 'font-family'); } if (k === 'ffAll' && v) ts.forEach(l => { if (l.type === 'text') { l.st.ff = v; l.html = stripProp(l.html, 'font-family'); } }); changed(); renderProps(); }
  function onPropsClick(e) {
    const b = e.target.closest('button'); if (!b || !L.on) return;
    if (b.dataset.c) { applyColor(b.dataset.c, b.dataset.v); return; }
    if (b.dataset.eye) { new EyeDropper().open().then(r => applyColor(b.dataset.eye, r.sRGBHex)).catch(() => { }); return; }
    if (b.dataset.al) { alignSel(b.dataset.al); return; }
    const ts = topSel(), one = ts[0];
    if (b.dataset.ta) { if (L.editing && rangeInEdit()) { } one.st.ta = b.dataset.ta; one.st.tal = ''; changed(); renderProps(); return; }
    if (b.dataset.dir) { one.st.dir = b.dataset.dir; changed(); renderProps(); return; }
    if (b.dataset.sh) { one.shape = b.dataset.sh; changed(); renderProps(); return; }
    const a = b.dataset.a; if (!a) return;
    const fsStep = (l, f) => setFs(l, l.st.fs * f);
    const A = {
      paint: () => { if (e.detail >= 2) { startPaint(true); return; } if (L.paint) endPaint(); else startPaint(false); }, lookCopy: copyLook, lookPaste: pasteLook,
      disH: () => distribute('h'), disV: () => distribute('v'), lockRatio: () => { L.ratio = L.ratio === false; renderProps(); },
      edit: () => startEdit(one), endEdit: () => finishEdit(true),
      fw4: () => { if (L.editing && rangeInEdit()) { styleRange('fontWeight', '400'); return; } one.st.fw = 400; one.html = stripProp(one.html, 'font-weight'); changed(); renderProps(); },
      fw7: () => { if (L.editing && rangeInEdit()) { styleRange('fontWeight', '700'); return; } one.st.fw = 700; one.html = stripProp(one.html, 'font-weight'); changed(); renderProps(); },
      'fs-': () => { if (L.editing && rangeInEdit()) { const r = rangeInEdit(); const n = r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer; styleRange('fontSize', R1(px(getComputedStyle(n).fontSize) / 1.1) + 'px'); return; } fsStep(one, 1 / 1.1); changed(); renderProps(); },
      'fs+': () => { if (L.editing && rangeInEdit()) { const r = rangeInEdit(); const n = r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer; styleRange('fontSize', R1(px(getComputedStyle(n).fontSize) * 1.1) + 'px'); return; } fsStep(one, 1.1); changed(); renderProps(); },
      'fsAll-': () => { ts.forEach(l => l.type === 'text' && fsStep(l, 1 / 1.1)); changed(); }, 'fsAll+': () => { ts.forEach(l => l.type === 'text' && fsStep(l, 1.1)); changed(); },
      fwAll4: () => { ts.forEach(l => { if (l.type === 'text') { l.st.fw = 400; l.html = stripProp(l.html, 'font-weight'); } }); changed(); }, fwAll7: () => { ts.forEach(l => { if (l.type === 'text') { l.st.fw = 700; l.html = stripProp(l.html, 'font-weight'); } }); changed(); },
      awOn: () => { one.aw = true; changed(); renderProps(); }, awOff: () => { one.aw = false; changed(); renderProps(); }, ahOn: () => { one.ah = true; changed(); renderProps(); }, ahOff: () => { one.ah = false; changed(); renderProps(); },
      noGrad: () => { one.grad = ''; if (!one.fill || one.fill === 'transparent') one.fill = '#EEF2F6'; changed(); renderProps(); },
      bdAll: () => { const c = (one.bd || []).find(x => x && x.w > 0); one.bd = [0, 0, 0, 0].map(() => Object.assign({ s: 'solid' }, c)); changed(); renderProps(); },
      imgRep: () => pickImage(src => replaceImage(one, src)),
      imgFillT: () => { L.imgFill = !L.imgFill; renderProps(); },
      backImg: () => { if (!one._img) return; Object.assign(one, one._img, { type: 'image' }); delete one._img; delete one.shape; delete one.fill; delete one.grad; changed(); renderProps(); },
      addSquare: () => addShape('square'),
      crop: () => { L.crop = L.crop === one.id ? null : one.id; drawOv(); renderProps(); },
      'iz-': () => { zoomInner(one, 1 / 1.1); push(true); }, 'iz+': () => { zoomInner(one, 1.1); push(true); },
      cover: () => fitImage(one, 'cover'), contain: () => fitImage(one, 'contain'), toImg: () => frameToImage(one),
      flipX: () => { one.fx = !one.fx; changed(); }, flipY: () => { one.fy = !one.fy; changed(); },
      rmbg: () => removeBg(one), circle: () => { const s = Math.min(one.w, one.h); const cx = one.x + one.w / 2, cy = one.y + one.h / 2; one.ix -= (s - one.w) / 2; one.iy -= (s - one.h) / 2; one.w = s; one.h = s; one.x = cx - s / 2; one.y = cy - s / 2; one.rad = ['50%', '50%', '50%', '50%']; changed(); renderProps(); },
      fReset: () => { one.filt = ''; changed(); renderProps(); },
      selParent: () => { const p0 = parentOf(one.id); if (p0) setSel([p0.id]); }, enter: () => { L.ctx = one.id; L.open[one.id] = true; setSel(one.children.filter(c => !c.hidden).map(c => c.id), true); }, ungroup: ungroupSel, flatThis: () => flattenAll(one),
      front: () => order(2), fwd: () => order(1), bwd: () => order(-1), back: () => order(-2),
      group: groupSel, mergeG: mergeGroups, dup: dupSel, del: delSel,
      lock: () => { const v = !ts.every(l => l.locked); ts.forEach(l => l.locked = v); if (v) L.sel = []; changed(); renderProps(); say(v ? 'تم القفل: الطبقة ما تتحرك ولا تتحدد من التصميم (تقدر تفتحها من قائمة الطبقات)' : 'تم فتح القفل'); },
      raster: rasterSel, expSel: () => exportPNG(4, { sel: true }),
      aiOn: () => { L.aiMode = true; renderProps(); }, aiOff: () => { L.aiMode = false; L.ai = {}; renderProps(); }, aiRun: aiRun, aiCopy: aiCopy, aiApply: aiApply,
      addTextAr: () => addText('ar'), addTextEn: () => addText('en'), addImg: () => pickImage(src => addImageData(src)), addRect: () => addShape('rect'), addEllipse: () => addShape('ellipse'), addLine: () => addShape('line'), addLogo, tabIcons: () => setTab('icons'),
      fitH: () => { const b = union(L.doc.layers.filter(l => !l.hidden).map(l => aabb(l))); if (b) { L.doc.h = Math.ceil(Math.max(100, b.y + b.h + 30)); changed(); fitZoom(); renderProps(); } },
      lint: runLint, flatAll: () => flattenAll(null), selAll: () => setSel(L.doc.layers.filter(l => !l.locked && !l.hidden).map(l => l.id)), snapT: () => { L.snap = L.snap === false; renderProps(); },
    };
    A[a] && A[a]();
  }

  /* ---------------- brand check ---------------- */
  function runLint() {
    const out = []; const cols = new Map(); const fonts = new Map();
    const addC = (c, l) => { if (!c || c === 'transparent' || alphaOf(c) === 0) return; const h = toHex(c); if (!/^#/.test(h)) return; if (BRAND_OK.some(b => cdist(b, h) < 10)) return; if (!cols.has(h)) cols.set(h, []); cols.get(h).push(l.id); };
    all().forEach(l => { if (l.type === 'text') { addC(l.st.col, l); const f = (l.st.ff || '').split(',')[0].replace(/['"]/g, '').trim(); if (!FONTS.some(x => x[0] === f)) { if (!fonts.has(f)) fonts.set(f, []); fonts.get(f).push(l.id); } (l.html.match(/color:\s*(#[0-9a-f]{3,6}|rgba?\([^)]*\))/gi) || []).forEach(m => addC(m.split(':')[1].trim(), l)); } if (l.type === 'shape') { addC(l.fill, l); (l.bd || []).forEach(b => b && b.w > 0 && addC(b.c, l)); } if (l.type === 'svg') addC(l.col, l); });
    let h = '<div class="card">';
    if (!cols.size && !fonts.size) h += '<div class="ok">✓ التصميم مطابق لألوان وخطوط هوية مطارات جدة.</div>';
    fonts.forEach((ids, f) => { h += `<div class="lint"><i style="background:#fff"></i><div>خط خارج الهوية: <b>${ESC(f || '—')}</b> (${ids.length})<br><button class="b" data-fixf="${ESC(f)}" style="margin-top:4px;height:26px">تحويل لـ Tajawal / Sequel</button></div></div>`; });
    cols.forEach((ids, c) => { h += `<div class="lint"><i style="background:${c}"></i><div>لون خارج الهوية <bdi>${c}</bdi> (${ids.length})<br><button class="b" data-fixc="${c}" style="margin-top:4px;height:26px">تحويل لأقرب لون: <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${nearBrand(c)};vertical-align:middle"></span></button> <button class="b" data-selc="${c}" style="margin-top:4px;height:26px">تحديدها</button></div></div>`; });
    h += '</div>'; const box = q('lxLint'); if (box) { box.innerHTML = h; box._cols = cols; box._fonts = fonts; }
  }
  function onLintClick(e) {
    const b = e.target.closest('[data-fixc],[data-selc],[data-fixf]'); if (!b) return; const box = q('lxLint');
    if (b.dataset.selc) { setSel(box._cols.get(b.dataset.selc) || []); return; }
    if (b.dataset.fixf != null) { (box._fonts.get(b.dataset.fixf) || []).forEach(id => { const l = get(id); if (!l) return; const ar = /[؀-ۿ]/.test(textOf(l)); l.st.ff = ar ? 'Tajawal' : (/\d/.test(textOf(l)) && textOf(l).length < 30 ? 'Sequel' : 'FSI'); l.html = stripProp(l.html, 'font-family'); }); changed(); runLint(); return; }
    const c = b.dataset.fixc, nb = nearBrand(c); const same = x => x && /^#|rgb/.test(x) && toHex(x).toUpperCase() === c.toUpperCase();
    all().forEach(l => { if (l.type === 'text') { if (same(l.st.col)) l.st.col = nb; l.html = l.html.replace(/color:\s*(#[0-9a-f]{3,6}|rgba?\([^)]*\))/gi, (m, x) => same(x) ? 'color:' + nb : m); } if (l.type === 'shape') { if (same(l.fill)) l.fill = nb; (l.bd || []).forEach(bb => { if (bb && same(bb.c)) bb.c = nb; }); } if (l.type === 'svg' && same(l.col)) l.col = nb; });
    changed(); runLint();
  }

  /* ---------------- smart edit (Claude when available, Copilot copy/paste offline) ---------------- */
  let sampleFn = null; (async () => { try { if (window.claude && claude.use) sampleFn = await claude.use('sample'); } catch (x) { sampleFn = null; } })();
  function aiPanel() {
    const engine = sampleFn ? 'يعدّل مباشرة باستخدام Claude' : 'بدون إنترنت: ينسخ لك طلب جاهز لـ Copilot وتلصق الرد';
    let h = `<div class="ai"><h4 style="margin-top:0;color:#004EAA">${IC('sparkles')} تعديل ذكي</h4><div class="hint" style="margin-bottom:8px">1) حدد الطبقات اللي تبي تعدلها (أو لا تحدد شي للتصميم كامل)<br>2) اكتب ايش تبي يتعدّل<br>3) اضغط «عدّل»</div><div class="msg">المحدد: <b>${L.sel.length ? L.sel.length + ' طبقة' : 'التصميم كامل'}</b> · ${engine}</div>
    <textarea id="lxAiReq" placeholder="مثال: خلّ العنوان أكبر وأزرق، وقرّب البطاقات من بعض، وحط الصورة يسار"></textarea><div class="row" style="margin-top:8px"><button class="b ai" data-a="aiRun" style="flex:1" ${L.ai.busy ? 'disabled' : ''}>${L.ai.busy ? '…' : 'عدّل'}</button><button class="b" data-a="aiOff">إغلاق</button></div>`;
    if (L.ai.cop) h += `<div class="hint" style="margin-top:6px"><b>طريقة Copilot:</b><br>1) «انسخ الطلب» والصقه في Copilot<br>2) انسخ رد Copilot كامل والصقه تحت<br>3) «طبّق»</div><div class="row" style="margin-top:6px"><button class="b" data-a="aiCopy" style="flex:1">📋 انسخ الطلب</button></div><textarea id="lxAiResp" placeholder="الصق رد Copilot هنا…" style="direction:ltr;text-align:left"></textarea><div class="row" style="margin-top:6px"><button class="b ai" data-a="aiApply" style="flex:1">طبّق</button></div>`;
    if (L.ai.msg) h += `<div class="msg ${L.ai.err ? 'err' : ''}">${ESC(L.ai.msg)}</div>`;
    return h + '</div>';
  }
  function aiTargets() { const ts = topSel(); return ts.length ? ts : L.doc.layers.slice(); }
  function aiPrompt(req) {
    const tg = aiTargets(); const slim = l => { const c = CL(l); const w = o => { delete o.svg; if (o.children) o.children.forEach(w); }; w(c); return c; };
    return `You edit part of a design made of layers (JSON) for Jeddah Airports (مطارات جدة).
Brand: colors #002657 navy, #004EAA blue, #62B6F3 light blue, white; secondary #00B2BA, #FC5C17, #D6D9D4. Fonts: "Tajawal" for Arabic, "Sequel" for numbers and English headlines, "FSI" for English body text. No shadows, rounded boxes, no invented patterns. Arabic text on the right, English on the left, clear spacing between an Arabic line and its English line.
Page size: ${Math.round(L.doc.w)} x ${Math.round(L.doc.h)} px.
Layer format: {id, type: text|image|shape|svg|group, name, x, y, w, h (px, page coordinates), rot (deg), op (0-1), hidden, locked}
- text: html (inline HTML), st {ff font, fs size px, fw weight, col color, ta align, lh line-height ratio, ls letter-spacing px, dir rtl|ltr, pad [t,r,b,l]}, ah (auto height)
- shape: shape rect|ellipse, fill color, grad (css gradient or ""), rad [4 corner radii px], bd [4 sides {w,s,c}] or null
- image: src (keep as is), ix, iy, iw, ih (picture rect inside the frame), rad
- svg: col color (svg markup omitted, keep it)
- group: children [...]

User request (Arabic): «${req}»

Selected layers:
${JSON.stringify(tg.map(slim))}

Reply with ONE json code block only, exactly in this shape:
{"layers":[ ...changed or new layers, full objects, keep the same id for changed ones... ], "delete":[ ...ids to remove ], "note":"one short Arabic line"}
Only include layers you changed or added. Keep src values unchanged. No other text.`;
  }
  async function aiRun() {
    const req = (q('lxAiReq') && q('lxAiReq').value || '').trim(); if (!req) { L.ai = { msg: 'اكتب ايش تبي يتعدّل.', err: true }; renderProps(); return; }
    finishEdit(true); const prompt = aiPrompt(req);
    if (!sampleFn) { L.ai = { cop: { prompt }, req }; renderProps(); if (q('lxAiReq')) q('lxAiReq').value = req; return; }
    L.ai = { busy: true, msg: 'جاري التعديل…' }; renderProps(); if (q('lxAiReq')) q('lxAiReq').value = req;
    try { const { text } = await sampleFn(prompt, { cache: false }); L.ai = { msg: '✓ ' + aiApplyText(text) }; } catch (e) { L.ai = { err: true, msg: (e && e.code === 'not_granted') ? 'ما تم السماح باستخدام Claude — تقدر تستخدم Copilot بدالها' : 'تعذّر التعديل: ' + (e.message || e) }; if (e && e.code === 'not_granted') sampleFn = null; }
    renderProps();
  }
  async function aiCopy() { const t = L.ai.cop.prompt; try { await navigator.clipboard.writeText(t); } catch (x) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } say('تم نسخ الطلب — الصقه في Copilot'); }
  function aiApply() { try { L.ai = { msg: '✓ ' + aiApplyText(q('lxAiResp').value) }; } catch (e) { L.ai = Object.assign(L.ai, { err: true, msg: 'ما قدرت أطبّق الرد: ' + e.message + ' — انسخ رد Copilot كامل والصقه.' }); } renderProps(); }
  function aiApplyText(raw) {
    let t = String(raw || '').replace(/[“”]/g, '"').replace(/```[a-z]*\n?/gi, ''); const s = t.indexOf('{'), e = t.lastIndexOf('}'); if (s < 0 || e < s) throw new Error('ما لقيت JSON في الرد');
    const o = JSON.parse(t.slice(s, e + 1)); const ls = Array.isArray(o.layers) ? o.layers : []; let n = 0;
    const okL = l => l && typeof l === 'object' && /^(text|image|shape|svg|group)$/.test(l.type) && isFinite(l.x) && isFinite(l.y) && isFinite(l.w) && isFinite(l.h);
    const fix = (l, old) => { if (l.type === 'text') { l.html = cleanHtml(String(l.html || '')); l.st = Object.assign({}, old && old.st, l.st || {}); } if (l.type === 'svg') l.svg = old && old.svg ? old.svg : (l.icon ? iconSvg(l.icon) : iconSvg('circle')); if (l.type === 'image') { l.src = old ? old.src : l.src; if (!L.A[l.src]) return false; } if (l.type === 'group') { l.children = (l.children || []).filter(c => { const oc = get(c.id); return okL(c) && fix(c, oc) !== false; }); } return true; };
    ls.forEach(nl0 => { if (!okL(nl0)) return; const old = get(nl0.id); const nl = old && old.type === nl0.type ? Object.assign(CL(old), nl0, old.type === 'text' ? { st: Object.assign({}, old.st, nl0.st || {}) } : {}) : nl0; if (fix(nl, old) === false) return; if (old) { const a = arrOf(old.id); a[a.indexOf(old)] = nl; } else { nl.id = nl.id && !get(nl.id) ? nl.id : uid(); L.doc.layers.push(nl); } reindex(); n++; });
    (Array.isArray(o.delete) ? o.delete : []).forEach(id => { const a = arrOf(id); if (a) { a.splice(a.findIndex(x => x.id === id), 1); reindex(); n++; } });
    if (!n) throw new Error('ما وصل أي تعديل'); reindex(); L.sel = L.sel.filter(get); changed(); return o.note || 'تم التعديل';
  }

  /* ---------------- export / save / library ---------------- */
  function busy(on, t) { const b = q('lxBusy'); b.querySelector('span').textContent = t || 'لحظة…'; b.classList.toggle('on', !!on); }
  function offsetLayers(layers, dx, dy) { return layers.map(l => { const c = CL(l); moveLayer(c, dx, dy); return c; }); }
  async function renderNode(layers, w, h, bg) {
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-100000px;top:0;z-index:-1'; const pg = document.createElement('div'); pg.style.cssText = `position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${bg || 'transparent'}`; host.appendChild(pg); document.body.appendChild(host);
    const cache = new Map(); paintInto(pg, layers, cache, false); if (measureTexts(cache, layers)) paintInto(pg, layers, cache, false); pg.querySelectorAll('.hid').forEach(x => x.remove());
    await document.fonts.ready; await Promise.all([...pg.querySelectorAll('img')].map(i => i.decode().catch(() => { })));
    return { host, pg };
  }
  async function toImageData(layers, w, h, bg, ratio, jpg) {
    const { host, pg } = await renderNode(layers, w, h, bg);
    try {
      const saf = typeof IS_SAFARI !== 'undefined' && IS_SAFARI; const maxA = saf ? 16.7e6 : 200e6; let pr = Math.min(ratio, Math.sqrt(maxA / (w * h)), 16000 / Math.max(w, h)); pr = Math.max(.05, Math.floor(pr * 100) / 100);
      const o = { pixelRatio: pr, width: w, height: h, fontEmbedCSS: FONT_CSS + (L.doc.fonts || ''), cacheBust: false, backgroundColor: bg || undefined };
      const fn = jpg ? htmlToImage.toJpeg : htmlToImage.toPng; if (jpg) o.quality = .94; if (saf) { await fn(pg, o); await fn(pg, o); }
      const url = await fn(pg, o); return { url, pr };
    } finally { host.remove(); }
  }
  const fname = ext => ((L.doc.name || 'تصميم').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'تصميم') + ext;
  async function exportPNG(ratio, opt = {}) {
    finishEdit(true); let layers = L.doc.layers, w = L.doc.w, h = L.doc.h, bg = opt.transparent ? '' : (L.doc.bg || '#ffffff');
    if (opt.sel) { const ts = topSel(); if (!ts.length) return say('حدد طبقة أو أكثر أولاً'); const fo = flatOrder(); const b = selBox(); layers = offsetLayers(ts.slice().sort((a, c) => fo.get(a.id) - fo.get(c.id)), -b.x, -b.y); w = Math.ceil(b.w); h = Math.ceil(b.h); bg = ''; }
    busy(true, 'جاري التصدير…'); document.body.classList.add('lx-exporting');
    try { const { url, pr } = await toImageData(layers, w, h, bg, ratio, opt.jpg); const ok = await saveOut(fname(opt.sel ? '_جزء.png' : opt.jpg ? '.jpg' : '.png'), dataToBlob(url)); if (ok) say(`تم التصدير: ${Math.round(w * pr)} × ${Math.round(h * pr)} بكسل`); }
    catch (e) { console.error(e); say('تعذّر التصدير: ' + (e.message || e)); }
    busy(false); document.body.classList.remove('lx-exporting');
  }
  async function exportPDF() {
    finishEdit(true); const box = q('lxPrint'); box.innerHTML = ''; const pg = document.createElement('div'); pg.style.cssText = `position:relative;width:${L.doc.w}px;height:${L.doc.h}px;overflow:hidden;background:${L.doc.bg || '#fff'}`; box.appendChild(pg); const cache = new Map(); paintInto(pg, L.doc.layers, cache, false); pg.querySelectorAll('.hid').forEach(x => x.remove());
    box.style.display = 'block'; if (measureTexts(cache, L.doc.layers)) { paintInto(pg, L.doc.layers, cache, false); pg.querySelectorAll('.hid').forEach(x => x.remove()); } box.style.display = '';
    let st = q('lxPageSize'); if (!st) { st = document.createElement('style'); st.id = 'lxPageSize'; document.head.appendChild(st); } st.textContent = `@media print{@page{size:${L.doc.w}px ${L.doc.h}px;margin:0}html,body{height:auto!important;overflow:visible!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
    document.body.classList.add('lx-printing'); const t = document.title; document.title = fname('');
    await document.fonts.ready; await wait(80); window.print(); document.title = t; document.body.classList.remove('lx-printing'); box.innerHTML = ''; say('اختر «حفظ كـ PDF» من نافذة الطباعة');
  }
  async function rasterSel() {
    const ts = topSel(); if (!ts.length) return; const fo = flatOrder(); const b = selBox(); const sorted = ts.slice().sort((a, c) => fo.get(a.id) - fo.get(c.id));
    busy(true, 'جاري الدمج…');
    try { const { url } = await toImageData(offsetLayers(sorted, -b.x, -b.y), Math.ceil(b.w), Math.ceil(b.h), '', 3, false); const top = sorted[sorted.length - 1]; const arr = arrOf(top.id); const l = { id: uid(), type: 'image', name: 'صورة مدمجة', x: b.x, y: b.y, w: Math.ceil(b.w), h: Math.ceil(b.h), rot: 0, op: 1, src: putAsset(url), ix: 0, iy: 0, iw: Math.ceil(b.w), ih: Math.ceil(b.h), rad: [0, 0, 0, 0] }; arr.splice(arr.indexOf(top) + 1, 0, l); reindex(); sorted.forEach(x => { const a = arrOf(x.id); a.splice(a.indexOf(x), 1); reindex(); }); pruneGroups(); reindex(); setSel([l.id]); changed(); say('تم دمج الطبقات في صورة وحدة'); }
    catch (e) { console.error(e); say('تعذّر الدمج'); }
    busy(false);
  }
  function fileObj() { const used = usedAssets(L.doc.layers); const assets = {}; used.forEach(k => { if (L.A[k]) assets[k] = L.A[k]; }); return { app: 'jedco-layers', v: 1, name: L.doc.name || 'تصميم', w: L.doc.w, h: L.doc.h, bg: L.doc.bg, layers: L.doc.layers, fonts: L.doc.fonts || '', assets, savedAt: new Date().toISOString(), by: 'JEDCO Toolkit · مصمم التواصل الداخلي (استوديو الطبقات)' }; }
  async function saveFile() { finishEdit(true); const ok = await saveOut(fname('.layers.json'), new Blob([JSON.stringify(fileObj())], { type: 'application/json' })); if (ok) { L.dirty = false; say('تم حفظ ملف الطبقات — يفتحه أي زميل من «ملف ▸ فتح ملف تصميم»'); } }
  /* my designs (browser storage) */
  const LDB = { open() { return this.p || (this.p = new Promise(res => { try { const r = indexedDB.open('jedIC2_lx', 1); r.onupgradeneeded = () => r.result.createObjectStore('d', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } })); }, async put(v) { const db = await this.open(); if (!db) throw new Error('nodb'); return new Promise((res, rej) => { const t = db.transaction('d', 'readwrite'); t.objectStore('d').put(v); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }, async del(id) { const db = await this.open(); if (!db) return; return new Promise(res => { const t = db.transaction('d', 'readwrite'); t.objectStore('d').delete(id); t.oncomplete = () => res(); t.onerror = () => res(); }); }, async get(id) { const db = await this.open(); if (!db) return null; return new Promise(res => { const r = db.transaction('d').objectStore('d').get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); }, async all() { const db = await this.open(); if (!db) return []; return new Promise(res => { const out = []; const c = db.transaction('d').objectStore('d').openCursor(); c.onsuccess = e => { const x = e.target.result; if (x) { const v = x.value; out.push({ id: v.id, name: v.name, updated: v.updated, thumb: v.thumb, w: v.w, h: v.h }); x.continue(); } else res(out.sort((a, b) => b.updated - a.updated)); }; c.onerror = () => res(out); }); } };
  let asT = 0;
  // text that is being typed right now goes into the design before any save (without ending the typing)
  function syncTyping() { const el = L.editing; if (!el) return; const l = get(el.dataset.id); if (l) { const h = cleanHtml(el.innerHTML); if (h !== l.html) { l.html = h; el._h = h; } } }
  function autosave(now) {
    clearTimeout(asT);
    const go = async () => {
      if (!L.doc) return; syncTyping(); if (!L.libId) L.libId = 'x' + Date.now().toString(36);
      const id = L.libId; try { localStorage.setItem('jedLX_last', id); if (L.on) localStorage.setItem('jedLX_open', id); } catch (x) { }
      try { const t = Date.now(); await LDB.put({ id, name: L.doc.name || 'تصميم', w: L.doc.w, h: L.doc.h, updated: t, thumb: L.thumb || '', data: fileObj() }); L.dirty = false; try { const pd = JSON.parse(localStorage.getItem('jedLX_pend') || 'null'); if (pd && pd.id === id && pd.t <= t) localStorage.removeItem('jedLX_pend'); } catch (x) { } } catch (e) { console.warn('lx autosave', e); }
    };
    if (now) return go(); asT = setTimeout(go, 600);
  }
  async function saveThumb() { if (!L.libId || !L.doc) return; const id = L.libId; try { const k = Math.min(1, 320 / L.doc.w); const { url } = await toImageData(L.doc.layers, L.doc.w, L.doc.h, L.doc.bg || '#fff', k, true); if (L.libId === id) L.thumb = url; const rec = await LDB.get(id); if (rec) { rec.thumb = url; await LDB.put(rec); } } catch (e) { console.warn('thumb', e); } }
  async function loadRec(id) { const rec = await LDB.get(id); if (!rec || !rec.data) return rec; try { const pd = JSON.parse(localStorage.getItem('jedLX_pend') || 'null'); if (pd && pd.id === id && pd.t > (rec.updated || 0) && Array.isArray(pd.layers)) { Object.assign(rec.data, { name: pd.name, w: pd.w, h: pd.h, bg: pd.bg, fonts: pd.fonts, layers: pd.layers }); } } catch (e) { } return rec; }
  /* ---- link between an announcement board and its layered version ---- */
  const hashStr = t => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return t.length + ':' + h; };
  function getLinks() { try { return JSON.parse(localStorage.getItem('jedLX_links') || '[]'); } catch (e) { return []; } }
  function setLinks(a) { try { localStorage.setItem('jedLX_links', JSON.stringify(a.slice(-60))); } catch (e) { } }
  function boardKey() { let html = ''; try { if (typeof commitActive === 'function') commitActive(); html = (S.docs && S.docs[S.active] && S.docs[S.active].html) || page.innerHTML; } catch (e) { html = page ? page.innerHTML : ''; } const t1 = page && page.querySelector('.t1') ? page.querySelector('.t1').textContent.trim() : ''; return { hash: hashStr(html), lib: (typeof S !== 'undefined' && S.libId) || null, act: (typeof S !== 'undefined' && S.active) || 0, t1 }; }
  function findLink(k) { const ls = getLinks(); return ls.slice().reverse().find(x => x.hash === k.hash) || (k.lib ? ls.slice().reverse().find(x => x.lib === k.lib && x.act === k.act) : null) || (k.t1 ? ls.slice().reverse().find(x => !x.lib && x.t1 === k.t1) : null) || null; }
  function addLink(k, lx) { const ls = getLinks().filter(x => x.lx !== lx && x.hash !== k.hash); ls.push(Object.assign({}, k, { lx, t: Date.now() })); setLinks(ls); }
  function updLayersBtn() { const b = q('bLayers'); if (!b) return; let has = false; try { has = !!(page && page.querySelector('.hdr') && findLink(boardKey())); } catch (e) { } b.classList.toggle('lxHas', has); const l = b.querySelector('.lbl'); if (l) l.textContent = has ? 'متابعة الطبقات' : 'طبقات'; b.title = has ? 'عندك نسخة طبقات معدّلة من هذا الإعلان — اضغط لفتحها وتكمل عليها' : 'تفكيك التصميم الحالي إلى طبقات منفصلة (مثل الفوتوشوب): كل نص وصورة وشكل وأيقونة تتحكم فيه لحاله'; }
  async function libModal() {
    const list = await LDB.all(); const ago = typeof window.__ago === 'function' ? window.__ago : (t => new Date(t).toLocaleString('ar-SA-u-nu-latn'));
    modal(`<h3>تصاميمي (الطبقات)</h3><p>كل تصميم بالطبقات ينحفظ هنا تلقائياً على هذا الجهاز والمتصفح. للمشاركة مع زميل استخدم «حفظ ملف الطبقات».</p>${list.length ? `<div class="lib">${list.map(e => `<div class="it${e.id === L.libId ? ' cur' : ''}" data-id="${e.id}"><div class="tn" data-l="open">${e.thumb ? `<img src="${e.thumb}" alt="">` : IC('image')}</div><div class="mt"><b>${ESC(e.name)}</b><small>${Math.round(e.w)}×${Math.round(e.h)} · ${ESC(ago(e.updated))}</small></div><div class="ac"><button data-l="open">${e.id === L.libId ? 'مفتوح' : 'فتح'}</button><button data-l="dup">نسخة</button><button data-l="del" class="dn">حذف</button></div></div>`).join('')}</div>` : '<div class="lxEmpty">ما فيه تصاميم محفوظة للحين.</div>'}<div class="acts"><button class="wmb pri" data-l="new">+ تصميم جديد</button><button class="wmb" data-l="close">إغلاق</button></div>`, async (k, ev) => {
      const it = ev.target.closest('.it'); const id = it && it.dataset.id;
      if (k === 'close') return closeModal(); if (k === 'new') { closeModal(); return newModal(); }
      if (k === 'open' && id) { if (id === L.libId) return closeModal(); const r = await loadRec(id); if (r) { if (L.on) { await autosave(true); saveThumb(); } openObj(r.data, { libId: id, thumb: r.thumb }); closeModal(); } }
      if (k === 'dup' && id) { const r = await LDB.get(id); if (r) { r.id = 'x' + Date.now().toString(36); r.name += ' (نسخة)'; r.data.name = r.name; r.updated = Date.now(); await LDB.put(r); libModal(); } }
      if (k === 'del' && id) { const b = ev.target.closest('button'); if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'متأكد؟'; setTimeout(() => { if (b.isConnected) { b.classList.remove('sure'); b.textContent = 'حذف'; } }, 3000); return; } await LDB.del(id); if (id === L.libId) L.libId = null; libModal(); }
    });
  }
  function modal(html, on) { const m = q('lxModal'); m.innerHTML = `<div class="md">${html}</div>`; m.classList.add('on'); m.onclick = e => { if (e.target === m) return closeModal(); const b = e.target.closest('[data-l]'); if (b) on(b.dataset.l, e); }; }
  function closeModal() { q('lxModal').classList.remove('on'); }
  const SIZES = [['عرض الإعلان', 845, 1200], ['A4 عمودي', 794, 1123], ['A4 أفقي', 1123, 794], ['شاشة 16:9', 1920, 1080], ['مربع (سوشال)', 1080, 1080], ['ستوري / جوال', 1080, 1920]];
  function newModal() {
    let pick = SIZES[0];
    modal(`<h3>تصميم جديد بالطبقات</h3><p>اختر المقاس، وبعدها أضف النصوص والصور والأشكال والأيقونات بحرية. تقدر تغيّر المقاس بعدين من خصائص الصفحة.</p><div class="sizes">${SIZES.map((s, i) => { const k = 46 / Math.max(s[1], s[2]); return `<button data-l="sz" data-i="${i}" class="${i ? '' : 'on'}"><i style="width:${Math.round(s[1] * k)}px;height:${Math.round(s[2] * k)}px"></i>${s[0]}<small>${s[1]}×${s[2]}</small></button>`; }).join('')}</div><div class="cust">مقاس مخصص: <input id="lxNW" type="number" value="845"> × <input id="lxNH" type="number" value="1200"> px</div><div class="cust">الاسم: <input id="lxNN" type="text" value="تصميم جديد" style="width:220px;font-family:Tajawal;direction:rtl"></div><div class="acts"><button class="wmb pri" data-l="go">إنشاء صفحة فاضية</button><button class="wmb" data-l="tpl" title="الهيدر والفوتر الرسمي لمطارات جدة كطبقات تقدر تعدلها">من قالب الإعلان الرسمي</button><button class="wmb" data-l="tplW">من قالب رسالة الترحيب</button><button class="wmb" data-l="close">إلغاء</button></div>`, (k, ev) => {
      if (k === 'close') return closeModal();
      if (k === 'tpl' || k === 'tplW') { closeModal(); fromTemplate(k === 'tplW' ? 'welcome' : 'blank', q('lxNN') && q('lxNN').value.trim() !== 'تصميم جديد' ? q('lxNN').value.trim() : ''); return; }
      if (k === 'sz') { const b = ev.target.closest('[data-i]'); pick = SIZES[+b.dataset.i]; q('lxNW').value = pick[1]; q('lxNH').value = pick[2]; q('lxModal').querySelectorAll('.sizes button').forEach(x => x.classList.toggle('on', x === b)); }
      if (k === 'go') { const w = clamp(+q('lxNW').value || 845, 50, 12000), h = clamp(+q('lxNH').value || 1200, 50, 12000); closeModal(); openDoc({ name: q('lxNN').value.trim() || 'تصميم جديد', w, h, bg: '#ffffff', layers: [] }, {}); }
    });
    setTimeout(() => q('lxModal').querySelectorAll('.cust input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation())), 0);
  }
  function pickImage(cb) { const i = q('lxImgIn'); i.onchange = async () => { const f = i.files[0]; i.value = ''; if (!f) return; cb(await fileToData(f)); }; i.click(); }

  /* ---------------- open / close ---------------- */
  function openDoc(doc, o = {}) {
    clearTimeout(asT);
    if (o.assets) setAssets(o.assets); else if (!o.keepAssets) setAssets({});
    L.doc = { name: doc.name || 'تصميم', w: doc.w, h: doc.h, bg: doc.bg || '#ffffff', layers: doc.layers || [], fonts: doc.fonts || '' };
    L.libId = o.libId || null; L.thumb = o.thumb || ''; L.sel = []; L.ctx = null; L.crop = null; L.editing = null; L.hist = []; L.hi = -1; L.open = {}; L.cache.forEach(el => el.remove()); L.cache.clear(); L.aiMode = false; L.ai = {};
    injectFonts(L.doc.fonts);
    reindex(); enter(); paint(true); fitZoom(); push(); L.dirty = false; updUndo(); renderPanel(); renderProps(); setTab('layers');
    if (!o.libId) autosave(true).then(saveThumb); else autosave(true);
  }
  function openObj(o, opt = {}) { if (!o || o.app !== 'jedco-layers' || !Array.isArray(o.layers) || !(o.w > 0) || !(o.h > 0)) { say('ملف الطبقات غير صالح'); return false; } const assets = o.assets || {}; openDoc({ name: o.name, w: o.w, h: o.h, bg: o.bg, layers: sanitizeLayers(o.layers), fonts: o.fonts }, { assets, libId: opt.libId, thumb: opt.thumb }); return true; }
  function sanitizeLayers(arr) { return (arr || []).filter(l => l && /^(text|image|shape|svg|group)$/.test(l.type)).map(l => { l.id = l.id || uid(); if (l.type === 'text') l.html = cleanHtml(String(l.html || '')); if (l.type === 'svg') { const t = document.createElement('template'); t.innerHTML = String(l.svg || ''); t.content.querySelectorAll('script,foreignObject').forEach(x => x.remove()); t.content.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || /javascript:/i.test(a.value)) n.removeAttribute(a.name); })); l.svg = t.innerHTML; } if (l.type === 'group') l.children = sanitizeLayers(l.children); return l; }); }
  function injectFonts(css) { let st = q('lxFonts'); if (!st) { st = document.createElement('style'); st.id = 'lxFonts'; document.head.appendChild(st); } st.textContent = css || ''; }
  function enter() { if (L.on) return; L.on = true; if (typeof closeSheets === 'function') closeSheets(); if (typeof qaClose === 'function') try { qaClose(); } catch (e) { } if (typeof libClose === 'function') try { libClose(); } catch (e) { } if (typeof deselect === 'function') try { deselect(); } catch (e) { } document.body.classList.add('lx-on', 'lx-tab-layers'); const sh = document.querySelector('#iconPanel .shead b'); if (sh) { sh._t = sh._t || sh.textContent; sh.textContent = 'الطبقات والأيقونات'; } const sh2 = document.querySelector('#blockPanel .shead b'); if (sh2) { sh2._t = sh2._t || sh2.textContent; sh2.textContent = 'الخصائص'; } if (document.body.classList.contains('free-on') && q('fmBack')) { document.body.classList.remove('free-on'); } setTimeout(() => { sizeStage(); fitZoom(); }, 30); }
  async function exitLX() { endPaint(); tbHide(); finishEdit(true); if (L.doc) { await autosave(true); saveThumb(); } L.on = false; document.body.classList.remove('lx-on', 'lx-tab-layers', 'lx-tab-icons'); document.querySelectorAll('#iconPanel .shead b, #blockPanel .shead b').forEach(x => { if (x._t) x.textContent = x._t; }); L.cache.forEach(el => el.remove()); L.cache.clear(); q('lxOv').innerHTML = ''; if (typeof closeSheets === 'function') closeSheets(); try { localStorage.removeItem('jedLX_open'); } catch (e) { } setTimeout(() => { try { fit(); } catch (e) { } updLayersBtn(); }, 30); say(L.linkedBoard ? 'تعديلاتك محفوظة — اضغط «متابعة الطبقات» وترجع لها بنفس المكان' : 'تعديلاتك محفوظة في «تصاميمي»'); }
  function setTab(t) { document.body.classList.toggle('lx-tab-layers', t === 'layers'); document.body.classList.toggle('lx-tab-icons', t === 'icons'); q('lxTabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); }
  const isPh = () => document.body.classList.contains('phone');

  /* ======================================================================
     DECOMPOSE: turn any rendered design (HTML) into separate layers
     ====================================================================== */
  const TXT_INH = ['-webkit-text-stroke-width', '-webkit-text-stroke-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'color', 'letter-spacing', 'word-spacing', 'line-height', 'text-transform', 'white-space', 'direction', 'text-align', 'text-align-last', 'text-indent', 'font-variant-numeric', 'font-feature-settings'];
  const BLOCKY = /^(block|flex|grid|table|list-item|flow-root|table-row|table-cell|table-row-group|table-header-group|table-footer-group|inline-flex|inline-grid|inline-table)$/;
  const MERGE_TAGS = /^(P|LI|UL|OL|BR)$/;
  async function decompose(html, w, h, opt = {}) {
    const fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.setAttribute('sandbox', 'allow-same-origin'); fr.style.cssText = `position:fixed;left:-30000px;top:0;width:${Math.ceil(w)}px;height:${Math.ceil(h || 1200)}px;border:0;visibility:visible;pointer-events:none`;
    document.body.appendChild(fr);
    try {
      await new Promise(res => { fr.onload = res; fr.srcdoc = html; setTimeout(res, 6000); });
      const d = fr.contentDocument, win = fr.contentWindow;
      await d.fonts.ready; await Promise.all([...d.images].map(i => i.decode ? i.decode().catch(() => { }) : 0));
      const root = (opt.root && d.querySelector(opt.root)) || d.querySelector('.page') || d.body;
      if (!h) { fr.style.height = Math.ceil(root.scrollHeight + 4) + 'px'; await wait(30); }
      prep(d, win, root); await wait(40); await d.fonts.ready;
      const R = root.getBoundingClientRect(); const W = Math.round(opt.w || R.width), H = Math.round(opt.h || h || R.height);
      const ctx = { d, win, ox: R.left, oy: R.top, root, fonts: '' };
      const rcs = win.getComputedStyle(root); let bg = toHex(rcs.backgroundColor); if (alphaOf(bg) < .05) bg = '#ffffff';
      const own = await visuals(root, rcs, ctx, 1, null, true);
      let layers = own.concat(await walkKids(root, ctx, 1, null, 0));
      layers = tidy(layers);
      // fonts that are not part of the tool
      try { const used = new Set(); const w2 = arr => arr.forEach(l => { if (l.type === 'group') w2(l.children); if (l.type === 'text') used.add((l.st.ff || '').split(',')[0].replace(/['"]/g, '').trim()); }); w2(layers); const have = ['Tajawal', 'Sequel', 'FSI']; [...d.styleSheets].forEach(ss => { try { [...ss.cssRules].forEach(r => { if (r.type === 5) { const fam = (r.style.getPropertyValue('font-family') || '').replace(/['"]/g, '').trim(); if (used.has(fam) && !have.includes(fam)) ctx.fonts += r.cssText + '\n'; } }); } catch (e) { } }); } catch (e) { }
      return { layers, w: W, h: H, bg, fonts: ctx.fonts };
    } finally { if (opt.keep) window.__lxFrame = fr; else fr.remove(); }
  }
  function prep(d, win, root) {
    const gcs = (el, p) => win.getComputedStyle(el, p);
    // 1) turn ::before / ::after into real elements so they become layers
    const els = [root, ...root.querySelectorAll('*')];
    const st = d.createElement('style'); st.textContent = '.lxNoPse::before,.lxNoPse::after{content:none!important;display:none!important}'; d.head.appendChild(st);
    const jobs = [];
    els.forEach(el => { if (el.closest('svg') || el.hasAttribute('data-ph') && !el.textContent.trim()) return; ['::before', '::after'].forEach(p => { const cs = gcs(el, p); const c = cs.content; if (!c || c === 'none' || c === 'normal') return; if (cs.display === 'none') return; let st0 = ''; for (let i = 0; i < cs.length; i++) { const k = cs[i]; if (k === 'content') continue; st0 += `${k}:${cs.getPropertyValue(k)};`; } jobs.push([el, p, st0, c]); }); });
    jobs.forEach(([el, p, cs, c]) => {
      if (el.hasAttribute('data-ph')) return;
      const sp = d.createElement('span'); let txt = '';
      const m = c.match(/^"((?:[^"\\]|\\.)*)"$/); if (m) txt = m[1].replace(/\\([0-9a-f]{1,6})\s?/gi, (x, hh) => String.fromCodePoint(parseInt(hh, 16))).replace(/\\(.)/g, '$1');
      else { const a = c.match(/^attr\(([\w-]+)\)$/); if (a) txt = el.getAttribute(a[1]) || ''; }
      sp.setAttribute('style', cs); sp.textContent = txt; sp.setAttribute('data-lxpse', '1');
      if (p === '::before') el.insertBefore(sp, el.firstChild); else el.appendChild(sp);
      el.classList.add('lxNoPse');
    });
    // 2) wrap loose text that sits next to boxes, so it gets its own position
    [root, ...root.querySelectorAll('*')].forEach(el => {
      if (el.closest('svg')) return; const cs = gcs(el); if (cs.display === 'none') return;
      const texts = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
      if (!texts.length) return;
      const flexy = /flex|grid/.test(cs.display);
      const hasBlock = [...el.children].some(c => { const s = gcs(c); return BLOCKY.test(s.display) && s.position !== 'absolute' && s.position !== 'fixed' && !MERGE_TAGS.test(c.tagName); });
      if (!flexy && !hasBlock) return;
      texts.forEach(t => { const sp = d.createElement('span'); if (!flexy) sp.style.display = 'block'; t.parentNode.insertBefore(sp, t); sp.appendChild(t); });
    });
    d.body.classList.add('exporting');
  }
  const gc = (ctx, el, p) => ctx.win.getComputedStyle(el, p);
  function rectOf(ctx, el) { const r = el.getBoundingClientRect(); return { x: r.left - ctx.ox, y: r.top - ctx.oy, w: r.width, h: r.height }; }
  function inter(a, b) { if (!b) return a; const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y); const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h); if (x2 <= x || y2 <= y) return null; return { x, y, w: x2 - x, h: y2 - y }; }
  const same = (a, b) => a && b && Math.abs(a.x - b.x) < 1.5 && Math.abs(a.y - b.y) < 1.5 && Math.abs(a.w - b.w) < 1.5 && Math.abs(a.h - b.h) < 1.5;
  function rotOf(cs) { const t = cs.transform; if (!t || t === 'none') return 0; const m = t.match(/matrix\(([^)]+)\)/); if (!m) return 0; const v = m[1].split(',').map(Number); const a = Math.atan2(v[1], v[0]) * 180 / Math.PI; return Math.abs(a) < .05 ? 0 : R2(a); }
  function rotBox(ctx, el, cs) { const rot = rotOf(cs); const r = rectOf(ctx, el); if (!rot) return { ...r, rot: 0 }; const m = cs.transform.match(/matrix\(([^)]+)\)/); const v = m[1].split(',').map(Number); const sc = Math.hypot(v[0], v[1]); const w = el.offsetWidth * sc, h = el.offsetHeight * sc; return { x: r.x + r.w / 2 - w / 2, y: r.y + r.h / 2 - h / 2, w, h, rot }; }
  const radArr = cs => ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map(k => { const v = cs[k]; if (!v || v === '0px') return 0; if (/%/.test(v)) return v.split(' ')[0]; const n = px(v.split(' ')[0]); return R2(n); });
  // a box cut by a rounded parent takes the parent's rounding on the corners it shares with it
  function clipRad(rad, box, clip) {
    if (!clip || !clip.rad) return rad; const n = v => typeof v === 'number' ? v : 0; const e = 1.5;
    const L0 = Math.abs(box.x - clip.x) < e, T0 = Math.abs(box.y - clip.y) < e, R0 = Math.abs(box.x + box.w - clip.x - clip.w) < e, B0 = Math.abs(box.y + box.h - clip.y - clip.h) < e;
    const hit = [L0 && T0, R0 && T0, R0 && B0, L0 && B0];
    return (rad || [0, 0, 0, 0]).map((v, i) => hit[i] && clip.rad[i] ? (typeof clip.rad[i] === 'number' ? Math.max(n(v), clip.rad[i]) : clip.rad[i]) : v);
  }
  async function natural(src) { const im = new Image(); im.src = src; try { await im.decode(); } catch (e) { } return [im.naturalWidth || 0, im.naturalHeight || 0]; }
  async function dataOf(src, el) {
    if (!src) return ''; if (/^data:/.test(src)) return src;
    try { if (/^blob:/.test(src)) { const b = await (await fetch(src)).blob(); return await fileToData(b); } } catch (e) { }
    try { if (el && el.naturalWidth) { const c = document.createElement('canvas'); c.width = el.naturalWidth; c.height = el.naturalHeight; c.getContext('2d').drawImage(el, 0, 0); return c.toDataURL('image/png'); } } catch (e) { }
    return src;
  }
  function placeContent(box, nw, nh, fit, pos) {
    // where the picture is drawn inside its box (object-fit / background-size)
    let w = box.w, h = box.h;
    if (fit === 'cover' || fit === 'contain') { const k = fit === 'cover' ? Math.max(box.w / nw, box.h / nh) : Math.min(box.w / nw, box.h / nh); w = nw * k; h = nh * k; }
    else if (fit === 'none') { w = nw; h = nh; }
    else if (fit === 'scale-down') { const k = Math.min(1, box.w / nw, box.h / nh); w = nw * k; h = nh * k; }
    else if (fit && fit !== 'fill') { const p = fit.split(/\s+/); const pw = v => /%/.test(v) ? box.w * px(v) / 100 : px(v); const ph = v => /%/.test(v) ? box.h * px(v) / 100 : px(v); if (p[0] === 'auto' && p[1] && p[1] !== 'auto') { h = ph(p[1]); w = nw * h / nh; } else if (p[0] !== 'auto') { w = pw(p[0]); h = p[1] && p[1] !== 'auto' ? ph(p[1]) : nh * w / nw; } else { w = nw; h = nh; } }
    const ps = (pos || '50% 50%').split(/\s+/); const kw = v => /%/.test(v) ? (box.w - w) * px(v) / 100 : v === 'left' || v === 'top' ? 0 : v === 'right' ? box.w - w : v === 'center' ? (box.w - w) / 2 : px(v); const kh = v => /%/.test(v) ? (box.h - h) * px(v) / 100 : v === 'top' ? 0 : v === 'bottom' ? box.h - h : v === 'center' ? (box.h - h) / 2 : px(v);
    return { x: box.x + kw(ps[0]), y: box.y + kh(ps[1] || ps[0]), w, h };
  }
  async function imgLayer(ctx, src, box, content, clip, rad, op, name, extra) {
    const frame = inter(inter(box, content) || box, clip ? clip : null); if (!frame || frame.w < 1 || frame.h < 1) return null;
    const data = await dataOf(src, extra && extra.el);
    return Object.assign({ id: uid(), type: 'image', name: name || 'صورة', x: R2(frame.x), y: R2(frame.y), w: R2(frame.w), h: R2(frame.h), rot: 0, op: R2(op), src: putAsset(data), ix: R2(content.x - frame.x), iy: R2(content.y - frame.y), iw: R2(content.w), ih: R2(content.h), rad: clipRad(rad, frame, clip) }, extra && extra.props || {});
  }
  async function visuals(el, cs, ctx, op, clip, isRoot) {
    const out = []; const box = rotBox(ctx, el, cs); if (box.w < .5 || box.h < .5) return out;
    const bgc = toHex(cs.backgroundColor); const bgi = cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
    const parts = bgi ? splitBg(bgi) : []; const urls = parts.filter(p => /^url\(/.test(p)); const grads = parts.filter(p => /gradient\(/.test(p));
    const bdAll = ['Top', 'Right', 'Bottom', 'Left'].map(s => { const w = px(cs['border' + s + 'Width']); const st = cs['border' + s + 'Style']; const c = toHex(cs['border' + s + 'Color']); return w > 0 && st !== 'none' && st !== 'hidden' ? { w: R2(w), s: st, c: alphaOf(c) > .02 ? c : 'transparent' } : null; });
    const bd = bdAll.map(b => b && b.c !== 'transparent' ? b : null);
    const hasBd = bd.some(Boolean); const hasFill = !isRoot && alphaOf(bgc) > .02;
    const rad = radArr(cs); const clipP = cs.clipPath && cs.clipPath !== 'none' ? normClip(cs.clipPath, box) : '';
    const sides = bd.map((x, i) => x ? i : -1).filter(i => i >= 0);
    if (!isRoot && !hasFill && !grads.length && sides.length === 1 && bdAll.filter(Boolean).length === 1 && !box.rot) {
      // a single border (divider) becomes a real line layer
      const i = sides[0], w = bd[i].w; const ln = i === 0 ? { x: box.x, y: box.y, w: box.w, h: w } : i === 2 ? { x: box.x, y: box.y + box.h - w, w: box.w, h: w } : i === 1 ? { x: box.x + box.w - w, y: box.y, w, h: box.h } : { x: box.x, y: box.y, w, h: box.h };
      const c = clip ? inter(ln, clip) : ln; const solid = bd[i].s === 'solid';
      if (c) out.push({ id: uid(), type: 'shape', shape: 'rect', name: 'خط', x: R2(c.x), y: R2(c.y), w: R2(c.w), h: R2(c.h), rot: 0, op: R2(op), fill: solid ? bd[i].c : 'transparent', grad: '', rad: [0, 0, 0, 0], bd: solid ? null : [0, 1, 2, 3].map(k => k === (i === 0 || i === 2 ? 0 : 3) ? Object.assign({}, bd[i]) : null), clip: '' });
    } else if (hasFill || grads.length || (hasBd && !isRoot)) {
      let b = box; const cl = clip && !box.rot ? inter(box, clip) : box; if (!cl) return out; b = cl;
      out.push({ id: uid(), type: 'shape', shape: 'rect', name: guessShapeName(el, b), x: R2(b.x), y: R2(b.y), w: R2(b.w), h: R2(b.h), rot: box.rot || 0, op: R2(op), fill: hasFill ? bgc : 'transparent', grad: grads.join(','), rad: clipRad(rad, b, clip), bd: hasBd ? bdAll : null, clip: clipP });
    }
    for (const u of urls.slice(0, 1)) {
      const src = u.replace(/^url\(["']?/, '').replace(/["']?\)$/, ''); const [nw, nh] = await natural(src); if (!nw) continue;
      const bl = px(cs.borderLeftWidth), bt = px(cs.borderTopWidth); const pb = { x: box.x + bl, y: box.y + bt, w: box.w - bl - px(cs.borderRightWidth), h: box.h - bt - px(cs.borderBottomWidth) };
      const size = cs.backgroundSize.split(',')[0].trim(); const pos = `${cs.backgroundPositionX.split(',')[0].trim()} ${cs.backgroundPositionY.split(',')[0].trim()}`;
      const content = placeContent(pb, nw, nh, size === 'auto' || size === 'auto auto' ? 'auto' : size, pos);
      const l = await imgLayer(ctx, src, pb, content, clip, rad, op, 'صورة خلفية', { props: clipP ? { clip: clipP } : {} }); if (l) { if (box.rot) l.rot = box.rot; out.push(l); }
    }
    return out;
  }
  function normClip(c, r) { const m = c.match(/^polygon\((.*)\)$/); if (!m) return c; return 'polygon(' + m[1].split(',').map(pt => { const [a, b] = pt.trim().split(/\s+/); const v = (s, n) => /%/.test(s) ? px(s) / 100 * n : px(s); return `${R2(v(a, r.w))}px ${R2(v(b, r.h))}px`; }).join(', ') + ')'; }
  function splitBg(s) { const out = []; let depth = 0, cur = ''; for (const ch of s) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
  function guessShapeName(el, b) { if (b.h <= 3 || b.w <= 3) return 'خط'; const c = (el.className && el.className.baseVal == null ? el.className : '') || ''; if (/disc|dot|badge|circle/.test(c) || (Math.abs(b.w - b.h) < 2 && b.w < 80)) return 'دائرة'; if (b.w > 300 && b.h > 120) return 'خلفية'; return 'صندوق'; }
  function hasOwnText(el) { return [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); }
  function isTextBlock(ctx, el, cs) {
    if (/flex|grid/.test(cs.display)) return false; if (!visText(ctx, el)) return false; if (el.tagName === 'svg') return false;
    for (const c of el.children) { const s = gc(ctx, c); if (s.display === 'none') continue; if (s.position === 'absolute' || s.position === 'fixed') continue; if (c.tagName === 'IMG' || c.tagName === 'svg' || c.tagName === 'BR') continue; if (BLOCKY.test(s.display)) { if (!MERGE_TAGS.test(c.tagName)) return false; if (!isTextBlock(ctx, c, s) && visText(ctx, c)) return false; if (alphaOf(s.backgroundColor) > .02) return false; } else if (/inline-block|inline-flex|inline-grid/.test(s.display)) { /* inline boxes stay inside the text */ } }
    return true;
  }
  const isOut = s => s.position === 'absolute' || s.position === 'fixed';
  // text that is actually shown (hidden placeholders do not count)
  function visText(ctx, el) { const tw = ctx.d.createTreeWalker(el, 4); let n; while ((n = tw.nextNode())) { if (n.textContent.trim() && n.parentElement && !n.parentElement.closest('svg') && n.parentElement.getClientRects().length && gc(ctx, n.parentElement).visibility !== 'hidden') return true; } return false; }
  function textLayer(ctx, el, cs, op, clip) {
    const b = rotBox(ctx, el, cs); if (b.w < 1 || b.h < 1) return null;
    const c = el.cloneNode(true); const os = [el, ...el.querySelectorAll('*')], cl = [c, ...c.querySelectorAll('*')];
    const kill = [];
    for (let i = 1; i < os.length; i++) {
      const o = os[i], k = cl[i]; if (!k) continue; const s = gc(ctx, o);
      if (s.display === 'none') { kill.push(k); continue; }
      if (isOut(s) && o.parentElement === el) { kill.push(k); continue; }
      if (o.closest('svg') && o.tagName !== 'svg') continue;
      const ps = gc(ctx, o.parentElement); const st = [];
      TXT_INH.forEach(p => { const v = s.getPropertyValue(p); if (v !== ps.getPropertyValue(p)) st.push(`${p}:${v}`); });
      if (s.display !== 'inline') st.push(`display:${s.display}`);
      if (s.verticalAlign !== 'baseline') st.push(`vertical-align:${s.verticalAlign}`);
      const deco = s.textDecorationLine; if (deco && deco !== 'none' && deco !== ps.textDecorationLine) st.push(`text-decoration:${deco} ${toHex(s.textDecorationColor)}`);
      if (alphaOf(s.backgroundColor) > .02) st.push(`background-color:${toHex(s.backgroundColor)}`);
      const boxy = s.display !== 'inline' || alphaOf(s.backgroundColor) > .02;
      { const blockish = boxy || /^(P|UL|OL|LI|H[1-6]|BLOCKQUOTE|FIGURE|DL|DD|PRE)$/.test(o.tagName); ['margin', 'padding'].forEach(p => { const v = ['Top', 'Right', 'Bottom', 'Left'].map(sd => s[p + sd]); if (blockish || v.some(x => x !== '0px')) st.push(`${p}:${v.join(' ')}`); }); }
      if (boxy) { const r = radArr(s); if (r.some(Boolean)) st.push(`border-radius:${r.map(v => typeof v === 'number' ? v + 'px' : v).join(' ')}`); ['Top', 'Right', 'Bottom', 'Left'].forEach(sd => { const w = px(s['border' + sd + 'Width']); if (w > 0 && s['border' + sd + 'Style'] !== 'none') st.push(`border-${sd.toLowerCase()}:${w}px ${s['border' + sd + 'Style']} ${toHex(s['border' + sd + 'Color'])}`); }); }
      if (/inline-block|inline-flex/.test(s.display) || o.tagName === 'IMG' || o.tagName === 'svg') { const r = o.getBoundingClientRect(); st.push(`width:${R2(r.width)}px`, `height:${R2(r.height)}px`); if (s.display === 'inline-flex') st.push(`align-items:${s.alignItems}`, `justify-content:${s.justifyContent}`, `gap:${s.gap}`); }
      if (s.opacity !== '1') st.push(`opacity:${s.opacity}`);
      if (o.tagName === 'svg') { st.push(`color:${toHex(s.color)}`); }
      if (o.tagName === 'IMG') { k.setAttribute('src', o.currentSrc || o.src); }
      [...k.attributes].forEach(a => { if (!/^(style|src|href|dir|viewBox|viewbox|d|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|cx|cy|r|rx|ry|x|y|x1|y1|x2|y2|width|height|points|transform|xmlns|fill-rule|clip-rule|opacity|fill-opacity|stroke-opacity|preserveAspectRatio)$/i.test(a.name)) k.removeAttribute(a.name); });
      if (o.tagName !== 'svg' && !o.closest('svg')) k.setAttribute('style', st.join(';')); else if (o.tagName === 'svg') k.setAttribute('style', st.join(';'));
    }
    kill.forEach(k => k.remove());
    // margins that collapsed outside the original box would push the text down
    const firstB = c.firstElementChild, lastB = c.lastElementChild; if (firstB && /margin/.test(firstB.getAttribute('style') || '') && px(cs.paddingTop) === 0 && px(cs.borderTopWidth) === 0) firstB.style.marginTop = '0px'; if (lastB && px(cs.paddingBottom) === 0 && px(cs.borderBottomWidth) === 0) lastB.style.marginBottom = '0px';
    const html = c.innerHTML.replace(/\s+contenteditable="[^"]*"/g, '').trim(); if (!c.textContent.trim()) return null;
    const fs = px(cs.fontSize); const lhv = cs.lineHeight; const lh = lhv === 'normal' ? null : R2(px(lhv) / fs);
    let ta = cs.textAlign; const dir = cs.direction; if (ta === 'start') ta = dir === 'rtl' ? 'right' : 'left'; if (ta === 'end') ta = dir === 'rtl' ? 'left' : 'right'; if (ta === '-webkit-center') ta = 'center';
    let tal = cs.textAlignLast; if (tal === 'auto') tal = ''; if (tal === 'start') tal = dir === 'rtl' ? 'right' : 'left'; if (tal === 'end') tal = dir === 'rtl' ? 'left' : 'right';
    const pad = ['Top', 'Right', 'Bottom', 'Left'].map(sd => R2(px(cs['padding' + sd]) + px(cs['border' + sd + 'Width'])));
    const extra = 0.25; let x = b.x, w = b.w + extra; if (ta === 'right' || (ta === 'justify' && dir === 'rtl')) x -= extra; else if (ta === 'center') x -= extra / 2;
    const ls = cs.letterSpacing === 'normal' ? 0 : R2(px(cs.letterSpacing));
    const ws = cs.whiteSpace; const wsp = px(cs.wordSpacing);
    const st = { ff: cs.fontFamily.replace(/"/g, "'"), fs: R2(fs), fw: cs.fontWeight, fst: cs.fontStyle === 'normal' ? '' : cs.fontStyle, col: toHex(cs.color), ta, tal, lh, ls, dir, ws: ws === 'normal' ? '' : ws, tt: cs.textTransform === 'none' ? '' : cs.textTransform, td: cs.textDecorationLine === 'none' ? '' : `${cs.textDecorationLine} ${toHex(cs.textDecorationColor)}`, ti: px(cs.textIndent) || 0, wsp: wsp || 0, pad, xs: px(cs.webkitTextStrokeWidth) > 0 ? `${cs.webkitTextStrokeWidth} ${toHex(cs.webkitTextStrokeColor)}` : '' };
    const lineH = (lh ? lh * fs : fs * 1.35) + pad[0] + pad[2]; const one = b.h <= lineH * 1.45 && !/<(br|p|li|div)\b/i.test(html) && ta !== 'justify';
    return { id: uid(), type: 'text', name: '', x: R2(x), y: R2(b.y), w: R2(w), h: R2(b.h), rot: b.rot || 0, op: R2(op), ah: true, aw: one, html, st };
  }
  function svgLayer(ctx, el, cs, op, clip) {
    const b = rotBox(ctx, el, cs); if (b.w < 1 || b.h < 1) return null; if (clip && !inter(b, clip)) return null;
    const c = el.cloneNode(true); const col = toHex(cs.color);
    const os = [...el.querySelectorAll('*')], cl = [...c.querySelectorAll('*')];
    os.forEach((o, i) => { const k = cl[i]; if (!k) return; const s = gc(ctx, o); ['fill', 'stroke'].forEach(p => { const v = s.getPropertyValue(p); if (!v) return; if (o.hasAttribute(p) && !/currentColor/i.test(o.getAttribute(p)) && !o.getAttribute('style')) return; if (v === 'none') { k.setAttribute(p, 'none'); return; } const hx = toHex(v); k.setAttribute(p, hx === col ? 'currentColor' : hx); }); const sw = s.strokeWidth; if (sw && !o.hasAttribute('stroke-width') && s.stroke !== 'none') k.setAttribute('stroke-width', px(sw)); if (s.display === 'none') k.remove(); k.removeAttribute('class'); });
    const rs = cs; ['fill', 'stroke'].forEach(p => { const v = rs.getPropertyValue(p); if (v && !el.hasAttribute(p)) { if (v === 'none') c.setAttribute(p, 'none'); else { const hx = toHex(v); c.setAttribute(p, hx === col ? 'currentColor' : hx); } } });
    if (!c.getAttribute('viewBox')) { const vw = px(el.getAttribute('width')) || b.w, vh = px(el.getAttribute('height')) || b.h; c.setAttribute('viewBox', `0 0 ${vw} ${vh}`); }
    c.removeAttribute('class'); c.removeAttribute('style'); c.removeAttribute('width'); c.removeAttribute('height'); c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); if (!c.getAttribute('preserveAspectRatio')) c.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    c.querySelectorAll('script,foreignObject').forEach(x => x.remove());
    const slot = el.closest('[data-icon]'); const big = b.w > 70 && b.w / b.h > 2;
    return { id: uid(), type: 'svg', name: big ? 'شعار / رسم' : '', icon: slot ? slot.getAttribute('data-icon') : '', sw: px(c.getAttribute('stroke-width')) || 0, x: R2(b.x), y: R2(b.y), w: R2(b.w), h: R2(b.h), rot: b.rot || 0, op: R2(op), col, svg: c.outerHTML };
  }
  const SEM = /(^|\s)(blk|card|scard|pcard|chip|chipw|iitem|info|li|stp|steps|pbox|tag|hdr|htitles|footer|sender|pillars|lst|section|box|panel|item|row-card|note|callout|badge|kpi|stat|col)(\s|$)/i;
  function groupName(el) {
    const c = (typeof el.className === 'string' ? el.className : '') + ' ' + (el.id || '');
    if (/\bhdr\b/.test(c)) return 'الهيدر'; if (/\bfooter\b|#footer/.test(c) || el.id === 'footer') return 'الفوتر'; if (el.id === 'sender') return 'الجهة المرسلة'; if (el.id === 'blocks') return 'المحتوى'; if (el.id === 'free') return 'عناصر حرة'; if (/\bhtitles\b/.test(c)) return 'عناوين الهيدر';
    const t = el.getAttribute && el.getAttribute('data-type'); if (t && typeof BLOCK_TYPES !== 'undefined') { const bt = BLOCK_TYPES.find(x => x[0] === t); if (bt) return bt[1]; }
    return '';
  }
  function imgName(el) { const c = (typeof el.className === 'string' ? el.className : '') + ' ' + (el.parentElement && el.parentElement.id || ''); if (/hphoto/.test(c)) return 'صورة الهيدر'; if (/\bhover\b/.test(c)) return 'تدرج الهيدر'; if (/footer/.test(c)) return 'الفوتر'; if (/avatar|person/.test(c)) return 'صورة الشخص'; return el.alt || 'صورة'; }
  async function walkKids(el, ctx, op, clip, depth) {
    const kids = [...el.children].map((c, i) => { const s = gc(ctx, c); const pos = s.position !== 'static'; const z = s.zIndex === 'auto' ? 0 : +s.zIndex || 0; return { c, s, k: pos ? (z < 0 ? -1 + z / 1e6 : 1 + z) : 0, i }; });
    kids.sort((a, b) => a.k - b.k || a.i - b.i);
    const out = []; for (const { c, s } of kids) out.push(...await walk(c, s, ctx, op, clip, depth + 1)); return out;
  }
  async function walk(el, cs, ctx, op, clip, depth) {
    if (cs.display === 'none' || cs.visibility === 'hidden' && !el.querySelector('*')) return [];
    if (/^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|META|LINK|INPUT|BUTTON)$/.test(el.tagName) && el.tagName !== 'BUTTON') return [];
    const o2 = op * (parseFloat(cs.opacity) || 0); if (o2 < .01) return [];
    if (el.tagName === 'svg') { if (cs.visibility === 'hidden') return []; const l = svgLayer(ctx, el, cs, o2, clip); return l ? [l] : []; }
    if (el.tagName === 'IMG') {
      if (cs.visibility === 'hidden') return []; const src = el.currentSrc || el.src; if (!src) return []; const box = rectOf(ctx, el); const nw = el.naturalWidth, nh = el.naturalHeight; if (!nw) return [];
      const content = placeContent(box, nw, nh, cs.objectFit || 'fill', cs.objectPosition);
      const l = await imgLayer(ctx, src, box, content, clip, radArr(cs), o2, imgName(el), { el, props: { filt: cs.filter && cs.filter !== 'none' ? cs.filter : '', clip: cs.clipPath && cs.clipPath !== 'none' ? cs.clipPath : '' } });
      const rr = rotOf(cs); if (l && rr) { const rb = rotBox(ctx, el, cs); Object.assign(l, { x: rb.x, y: rb.y, w: rb.w, h: rb.h, rot: rr, ix: 0, iy: 0, iw: rb.w, ih: rb.h }); }
      return l ? [l] : [];
    }
    if (el.tagName === 'CANVAS') { try { const u = el.toDataURL(); const b = rectOf(ctx, el); const l = await imgLayer(ctx, u, b, b, clip, radArr(cs), o2, 'رسم'); return l ? [l] : []; } catch (e) { return []; } }
    const own = cs.visibility === 'hidden' ? [] : await visuals(el, cs, ctx, o2, clip);
    if (cs.visibility !== 'hidden' && isTextBlock(ctx, el, cs)) {
      const t = textLayer(ctx, el, cs, o2, clip); const extraKids = [];
      for (const c of el.children) { const s = gc(ctx, c); if (isOut(s) && s.display !== 'none') extraKids.push(...await walk(c, s, ctx, o2, clip, depth + 1)); }
      const items = own.concat(t ? [t] : [], extraKids); if (items.length > 1 && (own.length || extraKids.length)) return [{ id: uid(), type: 'group', name: groupName(el), children: items, op: 1 }];
      return items;
    }
    let nclip = clip; if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const r = rectOf(ctx, el); const c2 = inter(r, clip); nclip = c2 ? Object.assign(c2, { rad: same(c2, r) ? radArr(cs) : (clip && clip.rad) }) : { x: 0, y: 0, w: 0, h: 0 }; }
    const kids = await walkKids(el, ctx, o2, nclip, depth);
    if (cs.clipPath && cs.clipPath !== 'none' && kids.length) { const r = rectOf(ctx, el); const pc = clipXform(normClip(cs.clipPath, r), 1, 1, r.x, r.y); if (pc !== cs.clipPath || /^path/.test(pc)) kids.forEach(k => leaves(k).forEach(lf => { if (!lf.clip && !lf.rot) lf.clip = clipXform(pc, 1, 1, -lf.x, -lf.y); })); }
    const items = own.concat(kids); if (!items.length) return [];
    const cls = typeof el.className === 'string' ? el.className : '';
    const semantic = own.length || SEM.test(cls) || el.id === 'footer' || el.id === 'sender' || /^(SECTION|ARTICLE|HEADER|FOOTER|LI|TR|TABLE|FIGURE|ASIDE|NAV)$/.test(el.tagName) || depth <= 1 || el.hasAttribute('data-type');
    if (items.length >= 2 && semantic) return [{ id: uid(), type: 'group', name: groupName(el), children: items, op: 1 }];
    if (items.length === 1 && items[0].type === 'group' && !items[0].name) items[0].name = groupName(el);
    return items;
  }
  function tidy(arr) {
    // drop empty groups, unwrap groups with one child, and lift a group that only holds another group
    const out = []; arr.forEach(l => { if (l.type === 'group') { l.children = tidy(l.children); if (!l.children.length) return; if (l.children.length === 1) { const c = l.children[0]; if (l.name && c.type === 'group' && !c.name) c.name = l.name; if (l.op < 1) c.op = R2((c.op ?? 1) * l.op); out.push(c); return; } } out.push(l); });
    return out;
  }
  /* ---- sources ---- */
  async function fromBoard(fresh) {
    if (!page || !page.querySelector('.hdr')) return say('ما فيه تصميم مفتوح');
    if (L.on && L.doc) await autosave(true);
    const key = boardKey();
    if (fresh !== true) { const ln = findLink(key); const rec = ln && await loadRec(ln.lx); if (rec && rec.data) { openObj(rec.data, { libId: rec.id, thumb: rec.thumb }); L.linkedBoard = key; addLink(key, rec.id); say('فتحت نسخة الطبقات اللي عدّلت عليها — للتفكيك من جديد من الإعلان الأصلي: ملف ▸ تفكيك من جديد'); return; } }
    setAssets({});
    try { if (typeof commitActive === 'function') commitActive(); } catch (e) { }
    busy(true, 'جاري تفكيك التصميم إلى طبقات…');
    try {
      const pc = page.cloneNode(true); pc.querySelectorAll('[contenteditable]').forEach(x => x.removeAttribute('contenteditable')); pc.style.transform = ''; pc.style.boxShadow = 'none';
      const css = q('mainStyle') ? q('mainStyle').textContent : FONT_CSS;
      const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${css}</style><style>html,body{margin:0!important;height:auto!important;overflow:visible!important;background:#fff!important}#page{box-shadow:none!important}</style></head><body class="exporting">${pc.outerHTML}</body></html>`;
      const r = await decompose(html, PW, 0, { root: '#page' });
      const title = (page.querySelector('.t1') && page.querySelector('.t1').textContent.trim()) || 'إعلان';
      openDoc({ name: title + ' (طبقات)', w: r.w, h: r.h, bg: r.bg, layers: r.layers, fonts: r.fonts }, { keepAssets: true });
      L.linkedBoard = key; addLink(key, L.libId);
      say(`تم التفكيك: ${all().filter(l => l.type !== 'group').length} طبقة — كل عنصر تقدر تحركه وتكبّره وتحذفه لحاله. التصميم الأصلي ما تغيّر`);
    } catch (e) { console.error(e); say('تعذّر التفكيك: ' + (e.message || e)); }
    busy(false);
  }
  async function fromTemplate(kind, name) {
    L.linkedBoard = null;
    if (L.on && L.doc) await autosave(true); setAssets({});
    busy(true, 'جاري تجهيز القالب…');
    try {
      const host = document.createElement('div'); host.id = 'page'; host.innerHTML = kind === 'welcome' ? docWelcome() : docBlank(); for (const i of host.querySelectorAll('img.hphoto')) { if (!/^data:/.test(i.getAttribute('src') || '')) i.src = ASSETS.header; const nat = await imgInfo(i.getAttribute('src')); const ar = nat.w / nat.h || 1.6; const w = Math.max(PW, HDR_H * ar), h = w / ar; i.style.width = w + 'px'; i.style.left = (PW - w) / 2 + 'px'; i.style.top = (HDR_H - h) / 2 + 'px'; } try { renderDynamic(host); } catch (e) { }
      host.querySelectorAll('#blocks > .blk').forEach(b => b.remove()); const bl = host.querySelector('#blocks'); if (bl) bl.style.minHeight = kind === 'welcome' ? '420px' : '620px';
      host.querySelectorAll('[contenteditable]').forEach(x => x.removeAttribute('contenteditable'));
      const css = q('mainStyle') ? q('mainStyle').textContent : FONT_CSS;
      const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${css}</style><style>html,body{margin:0!important;height:auto!important;overflow:visible!important;background:#fff!important}#page{box-shadow:none!important}</style></head><body class="exporting">${host.outerHTML.replace('id="page"', 'id="page" style="position:relative"')}</body></html>`;
      const r = await decompose(html, PW, 0, { root: '#page' });
      openDoc({ name: name || (kind === 'welcome' ? 'رسالة ترحيب' : 'إعلان') + ' (طبقات)', w: r.w, h: r.h, bg: r.bg, layers: r.layers, fonts: r.fonts }, { keepAssets: true });
      say('القالب الرسمي جاهز كطبقات — أضف النصوص والصور، وتقدر تمد الصفحة من «مقاس الصفحة»');
    } catch (e) { console.error(e); say('تعذّر تجهيز القالب: ' + (e.message || e)); }
    busy(false);
  }
  async function fromFree(o) {
    L.linkedBoard = null;
    if (!o || !o.html || !o.w || !o.h) return say('ملف التصميم الحر غير صالح');
    if (L.on && L.doc) await autosave(true);
    busy(true, 'جاري تفكيك التصميم إلى طبقات…');
    try { setAssets({}); let html = String(o.html).replace(/<script[\s\S]*?<\/script>/gi, ''); const fcss = `<style>${FONT_CSS}</style>`; html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + fcss) : fcss + html; const r = await decompose(html, o.w, o.h, { w: o.w, h: o.h }); openDoc({ name: o.name || 'تصميم', w: o.w, h: o.h, bg: r.bg, layers: r.layers, fonts: r.fonts }, { keepAssets: true }); say(`تم فتح التصميم مفكك: ${all().filter(l => l.type !== 'group').length} طبقة`); }
    catch (e) { console.error(e); say('تعذّر فتح التصميم: ' + (e.message || e)); }
    busy(false);
  }

  /* ---------------- floating bar: shows on any selection and while typing ----------------
     text: B · A− size A+ · reset / Weight / Leading (words selected while typing: size and bold go on those words only)
     always: ناسخ التنسيق · تجميع · فك التجميع · فك الكل */
  let TB = null;
  function tbBuild() {
    TB = document.createElement('div'); TB.id = 'lxTb';
    TB.innerHTML = `<div class="tr rt"><button data-t="bold" title="عريض — على الكلمات المحددة أو النص كامل">B</button><span class="tsep"></span><button data-t="down" title="أصغر">A−</button><input type="range" data-r="size" min="0.5" max="3" step="0.01" value="1"><button data-t="up" title="أكبر">A+</button><span class="tv" data-v="size">100%</span><span class="tsep"></span><button data-t="reset" title="إرجاع الحجم والسماكة والتباعد">↺</button></div>
      <div class="tr rt"><span class="tl">Weight</span><button data-t="wdown">−</button><input type="range" data-r="w" min="0" max="2" step="0.05" value="0"><button data-t="wup">+</button><span class="tv" data-v="w">0.00</span></div>
      <div class="tr rt"><span class="tl">Leading</span><button data-t="ldown">−</button><input type="range" data-r="lh" min="0.8" max="2.6" step="0.05" value="1.4"><button data-t="lup">+</button><span class="tv" data-v="lh">1.40</span></div>
      <div class="tr rg"><button class="lb" data-t="paint" title="ناسخ التنسيق — كليك: مرة وحدة · دبل كليك: يظل شغّال لين Esc · ${MAC ? '⌘⌥C / ⌘⌥V' : 'Ctrl+Alt+C / Ctrl+Alt+V'}">${IC('paintbrush', 2.2)}<span>ناسخ التنسيق</span></button><span class="tsep"></span><button class="lb" data-t="group" title="تجميع (${K('G')})">${IC('group', 2.2)}<span>تجميع</span></button><button class="lb" data-t="ungroup" title="فك التجميع (${K('⇧G')})">${IC('ungroup', 2.2)}<span>فك التجميع</span></button><button class="lb" data-t="flat" title="فك كل المجموعات: كل عنصر يصير طبقة مستقلة">${IC('layers-3', 2.2)}<span>فك الكل</span></button></div>`;
    document.body.appendChild(TB);
    TB.addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });
    TB.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.target.matches('input')) { TB.drag = true; const up = () => { TB.drag = false; removeEventListener('pointerup', up); tbPlace(); push(true); renderProps(); }; addEventListener('pointerup', up); } });
    TB.addEventListener('input', e => { const l = tbLayer(); if (!l) return; const k = e.target.dataset.r, v = +e.target.value; if (k === 'size') tbSize(l, TB.base.fs * v); if (k === 'w') tbWeight(l, v); if (k === 'lh') { l.st.lh = v; paint(); } tbSync(); });
    TB.addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b || b.disabled) return; const a = b.dataset.t;
      if (a === 'paint') { if (L.editing) { const id = L.editing.dataset.id; finishEdit(true); setSel([id]); } if (e.detail >= 2) startPaint(true); else if (L.paint) endPaint(); else startPaint(false); return; }
      if (a === 'group' || a === 'ungroup' || a === 'flat') {
        if (L.editing) { const id = L.editing.dataset.id; finishEdit(true); setSel([id]); }
        if (a === 'group') groupSel(); if (a === 'ungroup') ungroupSel();
        if (a === 'flat') { const gs = topSel().filter(l => l.type === 'group'); if (gs.length) { const ids = []; gs.forEach(g => { leaves(g).forEach(c => ids.push(c.id)); }); gs.forEach(g => { if (get(g.id)) flattenAll(get(g.id)); }); setSel(ids.filter(get)); } else flattenAll(null); }
        return;
      }
      const l = tbLayer(); if (!l) return;
      if (a === 'bold') { const r = rangeInEdit(); if (r) { const n = r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer; styleRange('fontWeight', +getComputedStyle(n).fontWeight >= 600 ? '400' : '700'); } else { l.st.fw = +l.st.fw >= 600 ? 400 : 700; if (L.editing) L.editing.querySelectorAll('[style]').forEach(c => c.style.fontWeight = ''); else l.html = stripProp(l.html, 'font-weight'); paint(); } }
      if (a === 'up' || a === 'down') { const r = rangeInEdit(); const f = a === 'up' ? 1.1 : 1 / 1.1; if (r) { const n = r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer; styleRange('fontSize', R1(px(getComputedStyle(n).fontSize) * f) + 'px'); } else tbSize(l, l.st.fs * f); }
      if (a === 'wup' || a === 'wdown') tbWeight(l, clamp(tbW(l) + (a === 'wup' ? .15 : -.15), 0, 2));
      if (a === 'lup' || a === 'ldown') { l.st.lh = R2(clamp((l.st.lh || 1.4) + (a === 'lup' ? .1 : -.1), .8, 2.6)); paint(); }
      if (a === 'reset') { tbSize(l, TB.base.fs); l.st.xs = TB.base.xs; l.st.lh = TB.base.lh; paint(); }
      tbSync(); push(true); renderProps();
    });
    document.addEventListener('selectionchange', () => { if (L.editing && TB.classList.contains('on') && !TB.drag) requestAnimationFrame(tbPlace); });
    q('lxHost').addEventListener('scroll', () => { if (TB.classList.contains('on')) tbPlace(); });
  }
  // the text the bar works on: the one being typed in, or one selected text layer
  const tbLayer = () => { if (L.editing) return get(L.editing.dataset.id); const ts = topSel(); return ts.length === 1 && ts[0].type === 'text' ? ts[0] : null; };
  const tbW = l => { const m = String(l.st.xs || '').match(/([\d.]+)px/); return m ? +m[1] : 0; };
  function tbWeight(l, v) { l.st.xs = v > 0.001 ? `${R2(v)}px currentColor` : ''; paint(); }
  // the whole text: box size + any sized words inside it keep their proportion
  function tbSize(l, v) { v = clamp(v, 4, 600); if (!L.editing) { setFs(l, v); paint(); return; } const r = v / (l.st.fs || 16); l.st.fs = R1(v); L.editing.querySelectorAll('[style*="font-size"]').forEach(c => { c.style.fontSize = R2(px(c.style.fontSize) * r) + 'px'; }); paint(); }
  function tbSync() {
    if (!TB) return; const l = tbLayer(); const ts = topSel();
    TB.querySelectorAll('.rt').forEach(r => r.style.display = l ? '' : 'none');
    const en = (a, on) => { const b = TB.querySelector(`[data-t="${a}"]`); b.disabled = !on; };
    en('group', !L.editing && ts.length >= 2); en('ungroup', !L.editing && ts.some(x => x.type === 'group')); en('flat', all().some(x => x.type === 'group'));
    const pb = TB.querySelector('[data-t="paint"]'); pb.classList.toggle('on', !!L.paint); pb.classList.toggle('sticky', !!(L.paint && L.paint.sticky));
    if (!l) return;
    if (!TB.base || TB.base.id !== l.id) TB.base = { id: l.id, fs: l.st.fs || 16, xs: l.st.xs || '', lh: l.st.lh };
    const k = (l.st.fs || 16) / (TB.base.fs || 16), w = tbW(l), lh = l.st.lh || 1.4;
    const set = (r, v) => { const i = TB.querySelector(`[data-r="${r}"]`); if (i && !TB.drag) i.value = v; };
    set('size', k); set('w', w); set('lh', lh);
    TB.querySelector('[data-v="size"]').textContent = Math.round(k * 100) + '%'; TB.querySelector('[data-v="w"]').textContent = w.toFixed(2); TB.querySelector('[data-v="lh"]').textContent = (+lh).toFixed(2);
    TB.querySelector('[data-t="bold"]').classList.toggle('on', +l.st.fw >= 600);
  }
  function tbPlace() {
    if (!TB || TB.drag || !TB.classList.contains('on')) return; let r = null, box;
    if (L.editing) {
      const s = getSelection(); if (s.rangeCount && L.editing.contains(s.anchorNode)) { r = s.getRangeAt(0).getBoundingClientRect(); if (!r.width && !r.height) r = null; }
      box = L.editing.getBoundingClientRect();
    } else { const b = selBox(); if (!b) return; const pg = PG().getBoundingClientRect(); box = { left: pg.left + b.x * L.z, top: pg.top + b.y * L.z, width: b.w * L.z, height: b.h * L.z }; box.right = box.left + box.width; box.bottom = box.top + box.height; }
    if (!r) r = { left: box.left + box.width / 2, right: box.left + box.width / 2, top: box.top - (L.editing ? 0 : 34), bottom: (box.bottom != null ? box.bottom : box.top + box.height) };
    const hr = q('lxHost').getBoundingClientRect();
    const w = TB.offsetWidth, h = TB.offsetHeight; let x = (r.left + r.right) / 2 - w / 2, y = r.top - h - 14; if (y < hr.top + 6) y = r.bottom + 14;
    if (y + h > hr.bottom - 6) y = Math.max(hr.top + 6, hr.bottom - h - 6);
    TB.style.left = Math.max(hr.left + 6, Math.min(hr.right - w - 6, x)) + 'px'; TB.style.top = y + 'px';
  }
  function tbShow() { tbRefresh(); }
  function tbHide() { if (TB) TB.classList.remove('on'); }
  // called after every overlay redraw: the bar follows the selection
  function tbRefresh() {
    if (!L.on || isPh() || L.crop || (L.drag && L.drag.mode !== 'pan') || q('lxModal').classList.contains('on') || (!L.editing && !L.sel.length)) { tbHide(); return; }
    if (!TB) tbBuild(); TB.classList.add('on'); tbSync(); tbPlace();
  }

  /* ======================================================================
     UI shell
     ====================================================================== */
  function buildUI() {
    const top = document.createElement('div'); top.id = 'lxTop';
    top.innerHTML = `<button class="tb" id="lxBack" title="الرجوع للإعلانات (التصميم محفوظ في «تصاميمي»)">${IC('arrow-right')}<span class="lbl">الإعلانات</span></button>
      <div class="rel"><button class="tb" id="lxFileB">${IC('folder')}<span class="lbl">ملف ▾</span></button><div class="menu" id="lxFileM">
        <button data-f="new">تصميم جديد بالطبقات…</button><button data-f="lib">تصاميمي…<small>كل التصاميم المحفوظة على هذا الجهاز</small></button><hr>
        <button data-f="save">حفظ ملف الطبقات (للمشاركة)<small><bdi>.layers.json</bdi> · يفتحه زميلك ويكمل التعديل</small></button><button data-f="open">فتح ملف تصميم…</button><hr>
        <button data-f="rename">تغيير اسم التصميم…</button><button data-f="fresh">تفكيك من جديد من الإعلان الأصلي<small>نسخة طبقات جديدة، وتبقى نسختك الحالية في «تصاميمي»</small></button><button data-f="dupDoc">حفظ نسخة جديدة في «تصاميمي»</button></div></div>
      <button class="tb dis" id="lxUndo" title="تراجع (${K('Z')})">${IC('undo-2')}</button><button class="tb dis" id="lxRedo" title="إعادة (${K('⇧Z')})">${IC('redo-2')}</button>
      <span class="sep dsk"></span>
      <button class="tb dsk" id="lxGroupB" title="تجميع (${K('G')})">${IC('group')}<span class="lbl">تجميع</span></button><button class="tb dsk" id="lxUngroupB" title="فك التجميع (${K('⇧G')})">${IC('ungroup')}<span class="lbl">فك</span></button>
      <button class="tb dsk" id="lxPaintB" title="ناسخ التنسيق — كليك: ينسخ مرة وحدة · دبل كليك: يظل شغّال لين تضغط Esc · ${MAC ? '⌘⌥C / ⌘⌥V' : 'Ctrl+Alt+C / Ctrl+Alt+V'} نسخ ولصق التنسيق">${IC('paintbrush')}<span class="lbl">ناسخ التنسيق</span></button>
      <button class="tb dsk" id="lxPickB" title="ايش يحدد الكليك على التصميم؟ (اضغط للتبديل) — ${MAC ? '⌘' : 'Ctrl'} + كليك يسوي العكس"></button>
      <button class="tb dsk" id="lxAiB" title="تعديل ذكي">${IC('sparkles')}<span class="lbl">تعديل ذكي</span></button>
      <span class="sp"></span>
      <button class="tb dsk" id="lxZo">−</button><span id="lxZl" class="dsk">100%</span><button class="tb dsk" id="lxZi">+</button><button class="tb dsk" id="lxFit" title="${K('0')}">ملاءمة</button>
      <span class="sep dsk"></span>
      <button class="tb" id="lxSave" title="حفظ في «تصاميمي» (${K('S')})">${IC('save')}<span class="lbl">حفظ</span></button>
      <div class="rel"><button class="tb pri" id="lxExpB">${IC('download')}<span class="lbl">تصدير ▾</span></button><div class="menu" id="lxExpM" style="left:0;right:auto">
        <button data-e="png4">صورة PNG عالية الجودة (4x)</button><button data-e="png2">صورة PNG عادية (2x)</button><button data-e="jpg">صورة JPG (حجم أخف)</button><button data-e="pngT">PNG بخلفية شفافة</button><button data-e="pdf">PDF (للطباعة)</button><hr><button data-e="sel">تصدير الطبقات المحددة فقط (PNG)</button><button data-e="file">ملف الطبقات القابل للتعديل</button></div></div>`;
    q('topbar').appendChild(top);
    const host = document.createElement('div'); host.id = 'lxHost'; host.tabIndex = -1; host.innerHTML = `<div id="lxPad"><div id="lxWrap"><div id="lxPage"></div><div id="lxOv"></div></div></div>`; q('stage').appendChild(host);
    const tabs = document.createElement('div'); tabs.id = 'lxTabs'; tabs.innerHTML = `<button data-t="layers" class="on">${'الطبقات'}</button><button data-t="icons">الأيقونات</button>`;
    const lay = document.createElement('div'); lay.id = 'lxLay'; lay.innerHTML = `<div id="lxLayHead"><span id="lxCount"></span><span><button data-lb="expand">فتح الكل</button><button data-lb="collapse">إغلاق الكل</button></span></div><div id="lxList"></div><div id="lxLayBar"><button data-lb="group" title="تجميع (${K('G')})">${IC('group')}تجميع</button><button data-lb="ungroup" title="فك (${K('⇧G')})">${IC('ungroup')}فك</button><button data-lb="dup" title="نسخ (${K('D')})">${IC('copy')}</button><button data-lb="up" title="للأمام">${IC('arrow-up')}</button><button data-lb="down" title="للخلف">${IC('arrow-down')}</button><button data-lb="del" title="حذف">${IC('trash-2')}</button></div>`;
    const ip = q('iconPanel'); const sh = ip.querySelector('.shead'); if (sh) sh.after(tabs, lay); else ip.prepend(tabs, lay); tabs.after(lay);
    const props = document.createElement('div'); props.id = 'lxProps'; q('blockPanel').appendChild(props);
    const extra = document.createElement('div'); extra.innerHTML = `<div id="lxCtx"></div><div id="lxModal"></div><div id="lxBusy"><i></i><span>لحظة…</span></div><div id="lxPrint"></div><input type="file" id="lxImgIn" accept="image/*" hidden><input type="file" id="lxFileIn" accept=".json,application/json" hidden><nav id="lxTab"></nav>`; [...extra.children].forEach(c => document.body.appendChild(c));
    q('lxTab').innerHTML = [['layers', 'layers', 'الطبقات'], ['props', 'sliders-horizontal' in ICONS ? 'sliders-horizontal' : 'pen-line', 'الخصائص'], ['add', 'plus', 'إضافة'], ['icons', 'shapes', 'أيقونات'], ['more', 'ellipsis', 'المزيد']].map(([k, i, n]) => `<button data-pt="${k}">${IC(i)}<span>${n}</span></button>`).join('');
    // wiring
    host.addEventListener('pointerdown', onDown); host.addEventListener('pointermove', e => { touchMove(e); onMove(e); }); host.addEventListener('pointerup', e => { touchUp(e); onUp(e); }); host.addEventListener('pointercancel', e => { touchUp(e); onUp(e); }); host.addEventListener('dblclick', onDbl);
    host.addEventListener('pointerleave', () => { if (L.hover && !L.drag) { L.hover = null; drawOv(); } });
    host.addEventListener('contextmenu', onCtx);
    host.addEventListener('input', e => { if (L.editing && L.editing.contains(e.target)) { measureTexts(L.cache, L.doc.layers); drawOv(); L.dirty = true; autosave(); } });
    host.addEventListener('scroll', () => closeCtx());
    props.addEventListener('mousedown', e => { if (L.editing && e.target.closest('button')) e.preventDefault(); }); props.addEventListener('click', onPropsClick); props.addEventListener('click', onLintClick);
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) setTab(b.dataset.t); });
    lay.addEventListener('click', e => { const b = e.target.closest('[data-lb]'); if (!b) return; const k = b.dataset.lb; if (k === 'expand') { all().forEach(l => { if (l.type === 'group') L.open[l.id] = true; }); renderPanel(); } if (k === 'collapse') { L.open = {}; renderPanel(); } if (k === 'group') groupSel(); if (k === 'ungroup') ungroupSel(); if (k === 'dup') dupSel(); if (k === 'up') order(1); if (k === 'down') order(-1); if (k === 'del') delSel(); });
    wirePanel();
    q('lxPaintB').onclick = e => { if (e.detail >= 2) { startPaint(true); return; } if (L.paint) { endPaint(); return; } startPaint(false); };
    q('lxBack').onclick = exitLX; q('lxUndo').onclick = undo; q('lxRedo').onclick = redo; q('lxGroupB').onclick = groupSel; q('lxUngroupB').onclick = ungroupSel; q('lxAiB').onclick = () => { L.aiMode = !L.aiMode; renderProps(); if (isPh()) openSheet('blocks'); };
    const pickLbl = () => { q('lxPickB').innerHTML = `${IC(L.pick === 'group' ? 'folder' : 'layers')}<span class="lbl">الكليك يحدد: ${L.pick === 'group' ? 'المجموعة' : 'الطبقة'}</span>`; }; pickLbl(); q('lxPickB').onclick = () => { L.pick = L.pick === 'group' ? 'layer' : 'group'; try { localStorage.setItem('jedLX_pick', L.pick); } catch (x) { } pickLbl(); say(L.pick === 'group' ? 'الكليك الحين يحدد المجموعة كاملة (دبل كليك يدخل لعناصرها)' : 'الكليك الحين يحدد الطبقة نفسها حتى لو داخل مجموعة'); };
    q('lxZi').onclick = () => setZoom(L.z * 1.2); q('lxZo').onclick = () => setZoom(L.z / 1.2); q('lxFit').onclick = fitZoom;
    q('lxSave').onclick = async () => { await autosave(true); saveThumb(); say(`تم الحفظ في «تصاميمي»: ${L.doc.name}`); };
    const tog = (b, m) => { q(b).onclick = e => { e.stopPropagation(); const on = !q(m).classList.contains('on'); document.querySelectorAll('#lxTop .menu').forEach(x => x.classList.remove('on')); q(m).classList.toggle('on', on); }; };
    tog('lxFileB', 'lxFileM'); tog('lxExpB', 'lxExpM');
    document.addEventListener('pointerdown', e => { if (!e.target.closest('#lxTop .rel')) document.querySelectorAll('#lxTop .menu').forEach(x => x.classList.remove('on')); if (!e.target.closest('#lxCtx')) closeCtx(); });
    q('lxFileM').onclick = e => { const k = e.target.closest('[data-f]')?.dataset.f; q('lxFileM').classList.remove('on'); if (k === 'new') newModal(); if (k === 'lib') libModal(); if (k === 'save') saveFile(); if (k === 'open') q('lxFileIn').click(); if (k === 'rename') renameDoc(); if (k === 'fresh') { exitLX().then(() => fromBoard(true)); } if (k === 'dupDoc') { L.libId = null; L.doc.name += ' (نسخة)'; autosave(true).then(saveThumb); say('تم حفظ نسخة جديدة'); renderProps(); } };
    // v2.0: share the editable layers file in a new Outlook message
    { const m = q('lxExpM'); m.insertAdjacentHTML('beforeend', `<hr><button data-e="share" class="v2share">${IC('mail')}<span><b>مشاركة عبر Outlook</b><small>رسالة جديدة فيها ملف الطبقات، يفتحه زميلك في مصمم التواصل الداخلي ويكمل عليه</small></span></button>`); }
    q('lxExpM').addEventListener('click', async e => { if (!e.target.closest('[data-e="share"]')) return; q('lxExpM').classList.remove('on'); if (!window.JEDMAIL) { say('ميزة المشاركة ما انحملت، افتح الأداة من «أدوات مطارات جدة»'); return; } finishEdit(true); const name = fname('.layers.json'); const blob = new Blob([JSON.stringify(fileObj())], { type: 'application/json' }); const title = (L.doc && L.doc.name) || 'Design'; try { await JEDMAIL.draft({ kind: 'design', subject: `Design file: ${title}`, body: `Hi,\n\nPlease find attached the design file "${name}".\n\nTo open and edit it: Internal Comms Designer > File > Open a file from your device.\n\nBest regards,`, fileName: name.replace(/\.layers\.json$/, ''), files: [{ name, blob }] }); } catch (x) { console.error(x); say('تعذّر تجهيز الرسالة'); } });
    q('lxExpM').onclick = e => { const k = e.target.closest('[data-e]')?.dataset.e; q('lxExpM').classList.remove('on'); if (k === 'png4') exportPNG(4); if (k === 'png2') exportPNG(2); if (k === 'jpg') exportPNG(3, { jpg: true }); if (k === 'pngT') exportPNG(4, { transparent: true }); if (k === 'pdf') exportPDF(); if (k === 'sel') exportPNG(4, { sel: true }); if (k === 'file') saveFile(); };
    if (location.protocol !== 'file:' && window.claude) { const p = q('lxExpM').querySelector('[data-e=pdf]'); if (p) p.remove(); }
    q('lxFileIn').onchange = () => { const f = q('lxFileIn').files[0]; q('lxFileIn').value = ''; if (!f) return; const r = new FileReader(); r.onload = () => { try { const o = JSON.parse(r.result); if (o.app === 'jedco-layers') openObj(o); else if (o.app === 'jedco-free-design') fromFree(o); else if (typeof openDesignText === 'function') { exitLX(); openDesignText(String(r.result), f.name, true); } } catch (x) { say('الملف تالف أو غير مدعوم'); } }; r.readAsText(f); };
    q('lxTab').onclick = e => { const b = e.target.closest('[data-pt]'); if (!b) return; const k = b.dataset.pt; q('lxTab').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b && !x.classList.contains('on'))); if (k === 'layers') { setTab('layers'); openSheet('icons'); } if (k === 'icons') { setTab('icons'); openSheet('icons'); } if (k === 'props') openSheet('blocks'); if (k === 'add') { closeSheets(); actionSheet('إضافة', [['نص عربي', 'type', () => addText('ar')], ['English text', 'text', () => addText('en')], ['صورة', 'image-plus', () => pickImage(s => addImageData(s))], ['مستطيل', 'square', () => addShape('rect')], ['دائرة', 'circle', () => addShape('ellipse')], ['خط فاصل', 'minus', () => addShape('line')], ['شعار مطارات جدة', 'badge-check', addLogo]]); } if (k === 'more') { closeSheets(); actionSheet('المزيد', [['تراجع', 'undo-2', undo], ['إعادة', 'redo-2', redo], ['تجميع المحدد', 'group', groupSel], ['فك التجميع', 'ungroup', ungroupSel], ['حفظ في «تصاميمي»', 'save', () => q('lxSave').click()], ['تصاميمي', 'folder', libModal], ['تصدير PNG', 'download', () => exportPNG(3)], ['حفظ ملف الطبقات', 'file-json', saveFile], ['ملاءمة الحجم للشاشة', 'maximize', fitZoom], ['رجوع للإعلانات', 'arrow-right', exitLX]]); } };
    // icons from the library
    const ig = q('iconGrid'); if (ig) { ig.addEventListener('click', e => { if (!L.on) return; const it = e.target.closest('.it'); if (!it) return; e.stopPropagation(); e.preventDefault(); addIcon(it.dataset.icon); if (isPh()) closeSheets(); }, true); }
    window.addEventListener('resize', () => { if (L.on) { sizeStage(); drawOv(); } });
    // keyboard + wheel + clipboard + drop (capture so the announcement editor does not also react)
    window.addEventListener('keydown', onKeyAll, true); window.addEventListener('keyup', e => { if (e.code === 'Space' && L.on) { L.space = false; q('lxHost').classList.remove('pan'); } }, true);
    window.addEventListener('wheel', e => { if (!L.on || !(e.target.closest && e.target.closest('#lxHost'))) return; if (e.ctrlKey || e.metaKey) { e.preventDefault(); e.stopImmediatePropagation(); setZoom(L.z * Math.exp(-e.deltaY * (e.ctrlKey && Math.abs(e.deltaY) < 30 ? .012 : .0025)), e.clientX, e.clientY); } }, { passive: false, capture: true });
    ['gesturestart', 'gesturechange'].forEach(t => window.addEventListener(t, e => { if (!L.on) return; e.preventDefault(); e.stopImmediatePropagation(); if (t === 'gesturestart') L.gz = L.z; else setZoom(L.gz * e.scale, e.clientX, e.clientY); }, { passive: false, capture: true }));
    window.addEventListener('paste', async e => { if (!L.on) return; if (e.target.closest && e.target.closest('input,textarea')) return; if (L.editing) { e.preventDefault(); const t = e.clipboardData.getData('text/plain'); document.execCommand('insertText', false, t); return; } const files = [...(e.clipboardData && e.clipboardData.files || [])].filter(f => /^image\//.test(f.type)); e.preventDefault(); e.stopImmediatePropagation(); if (files.length) { for (const f of files) await addImageData(await fileToData(f)); return; } if (pasteClip()) return; const t = e.clipboardData.getData('text/plain'); if (t && t.trim()) { addText(/[؀-ۿ]/.test(t) ? 'ar' : 'en'); setTimeout(() => { const el = L.editing; if (el) { el.textContent = t.trim(); finishEdit(true); } }, 60); } }, true);
    window.addEventListener('dragover', e => { if (!L.on || !(e.target.closest && e.target.closest('#lxHost'))) return; const ty = [...e.dataTransfer.types]; if (ty.includes('text/x-icon') || ty.includes('Files')) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    window.addEventListener('drop', async e => { if (!L.on || !(e.target.closest && e.target.closest('#lxHost'))) return; const ic = e.dataTransfer.getData('text/x-icon'); const [x, y] = toPg(e.clientX, e.clientY); if (ic) { e.preventDefault(); e.stopImmediatePropagation(); addIcon(ic, x, y); return; } const files = [...e.dataTransfer.files]; const img = files.filter(f => /^image\//.test(f.type)); if (img.length) { e.preventDefault(); e.stopImmediatePropagation(); for (const f of img) await addImageData(await fileToData(f), x, y); } }, true);
    const flush = () => { if (!L.doc || !(L.on || L.dirty)) return; syncTyping(); if (!L.libId) L.libId = 'x' + Date.now().toString(36); try { localStorage.setItem('jedLX_pend', JSON.stringify({ id: L.libId, t: Date.now(), name: L.doc.name, w: L.doc.w, h: L.doc.h, bg: L.doc.bg, fonts: L.doc.fonts, layers: L.doc.layers })); } catch (e) { } autosave(true); };
    window.addEventListener('beforeunload', flush); window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    window.addEventListener('blur', () => { if (L.on) flush(); });
    // autosaved work should not trigger the toolkit's «unsaved work» warning
    ['lxHost', 'lxProps', 'lxLay', 'lxModal', 'lxTop'].forEach(id => q(id) && q(id).setAttribute('data-hub-autosave', ''));
  }
  function renameDoc() { modal(`<h3>اسم التصميم</h3><div class="cust"><input id="lxRn" type="text" value="${ESC(L.doc.name)}" style="width:100%;font-family:Tajawal;direction:rtl"></div><div class="acts"><button class="wmb pri" data-l="ok">حفظ</button><button class="wmb" data-l="close">إلغاء</button></div>`, k => { if (k === 'ok') { L.doc.name = q('lxRn').value.trim() || L.doc.name; push(); } closeModal(); }); setTimeout(() => { const i = q('lxRn'); i.focus(); i.select(); i.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { L.doc.name = i.value.trim() || L.doc.name; push(); closeModal(); } }; }, 30); }
  /* context menu */
  function onCtx(e) {
    if (!L.on) return; e.preventDefault(); e.stopPropagation(); const leaf = hitId(e.target); if (leaf) { const id = pickFrom(leaf, MOD(e)); if (!L.sel.includes(id) && !L.sel.some(s => isIn(id, s))) setSel([id]); }
    const ts = topSel(); const m = q('lxCtx'); const it = (a, t, k, dn) => `<button data-c="${a}"${dn ? ' class="dn"' : ''}><span>${t}</span>${k ? `<kbd>${k}</kbd>` : ''}</button>`;
    let h = '';
    if (ts.length) { h += it('copy', 'نسخ', K('C')) + it('cut', 'قص', K('X')) + it('paste', 'لصق', K('V')) + it('dup', 'تكرار', K('D')) + '<hr>' + it('lookCopy', 'نسخ التنسيق', MAC ? '⌘⌥C' : 'Ctrl+Alt+C') + it('lookPaste', 'لصق التنسيق', MAC ? '⌘⌥V' : 'Ctrl+Alt+V') + it('paintT', 'ناسخ التنسيق (فرشاة)', '') + '<hr>' + it('front', 'للأمام تماماً', K('⇧]')) + it('fwd', 'خطوة للأمام', K(']')) + it('bwd', 'خطوة للخلف', K('[')) + it('back', 'للخلف تماماً', K('⇧[')) + '<hr>' + (ts.length > 1 ? it('group', 'تجميع', K('G')) : '') + (ts.some(l => l.type === 'group') ? it('ungroup', 'فك التجميع', K('⇧G')) : '') + (ts.length === 1 && parentOf(ts[0].id) ? it('outG', 'إخراج من المجموعة', '') : '') + it('lock', ts.every(l => l.locked) ? 'فتح القفل' : 'قفل', K('L')) + it('hide', 'إخفاء', K('⇧H')) + it('raster', 'تحويل لصورة', '') + it('expSel', 'تصدير المحدد PNG', '') + '<hr>' + it('del', 'حذف', 'Del', true); }
    else h += it('paste', 'لصق', K('V')) + it('selAll', 'تحديد الكل', K('A')) + '<hr>' + it('addT', 'إضافة نص', '') + it('addI', 'إضافة صورة', '') + it('addR', 'إضافة مستطيل', '');
    m.innerHTML = h; m.classList.add('on'); const r = m.getBoundingClientRect(); m.style.left = Math.min(e.clientX, innerWidth - r.width - 8) + 'px'; m.style.top = Math.min(e.clientY, innerHeight - r.height - 8) + 'px';
    m.onclick = ev => { const b = ev.target.closest('[data-c]'); if (!b) return; closeCtx(); const a = b.dataset.c; const map = { lookCopy: copyLook, lookPaste: pasteLook, paintT: () => startPaint(false), copy: () => copySel(), cut: () => copySel(true), paste: () => { if (!pasteClip()) say('ما فيه شي منسوخ'); }, dup: dupSel, front: () => order(2), fwd: () => order(1), bwd: () => order(-1), back: () => order(-2), group: groupSel, ungroup: ungroupSel, outG: () => { const l = ts[0]; const g = parentOf(l.id); moveTo([l.id], g.id, 'above'); }, lock: () => { const v = !ts.every(l => l.locked); ts.forEach(l => l.locked = v); if (v) L.sel = []; changed(); }, hide: () => { ts.forEach(l => l.hidden = true); L.sel = []; changed(); }, raster: rasterSel, expSel: () => exportPNG(4, { sel: true }), del: delSel, selAll: () => setSel(L.doc.layers.filter(l => !l.locked && !l.hidden).map(l => l.id)), addT: () => addText('ar'), addI: () => pickImage(s => addImageData(s)), addR: () => addShape('rect') }; map[a] && map[a](); };
  }
  function closeCtx() { const m = q('lxCtx'); if (m) m.classList.remove('on'); }
  /* keyboard */
  function onKey(e) {
    if (!L.on) return; if (q('lxModal').classList.contains('on')) { if (e.key === 'Escape') closeModal(); return; }
    const t = e.target; const inField = t.closest && t.closest('input,textarea,select,[contenteditable]:not(.lxT)');
    const mod = MOD(e), k = e.key.toLowerCase();
    if (L.editing) { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finishEdit(true); return; } if (mod && k === 's') { e.preventDefault(); e.stopImmediatePropagation(); finishEdit(true); q('lxSave').click(); } e.stopImmediatePropagation(); return; }
    if (inField) return;
    const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (e.code === 'Space' && !mod) { stop(); if (!L.space) { L.space = true; q('lxHost').classList.add('pan'); } return; }
    if (mod && k === 'z') { stop(); e.shiftKey ? redo() : undo(); return; }
    if (mod && k === 'y') { stop(); redo(); return; }
    if (mod && k === 's') { stop(); e.shiftKey ? saveFile() : q('lxSave').click(); return; }
    if (mod && (k === '=' || k === '+')) { stop(); setZoom(L.z * 1.2); return; }
    if (mod && k === '-') { stop(); setZoom(L.z / 1.2); return; }
    if (mod && k === '0') { stop(); fitZoom(); return; }
    if (mod && k === '1') { stop(); setZoom(1); return; }
    if (mod && k === 'a') { stop(); const scope = L.ctx && get(L.ctx) ? get(L.ctx).children : L.doc.layers; setSel(scope.filter(l => !l.locked && !l.hidden).map(l => l.id), true); return; }
    if (mod && e.altKey && e.code === 'KeyC') { stop(); copyLook(); return; }
    if (mod && e.altKey && e.code === 'KeyV') { stop(); pasteLook(); return; }
    if (mod && k === 'v') return; // handled by paste event
    if (mod && k === 'c') { if (L.sel.length) { stop(); copySel(); } return; }
    if (mod && k === 'x') { if (L.sel.length) { stop(); copySel(true); } return; }
    if (e.key === 'Escape') { stop(); if (L.paint) { endPaint(); say('وقّفت ناسخ التنسيق'); return; } if (L.crop) { L.crop = null; drawOv(); renderProps(); return; } if (L.aiMode) { L.aiMode = false; renderProps(); return; } const p0 = L.sel.length === 1 && parentOf(L.sel[0]); if (p0) { setSel([p0.id]); return; } if (L.ctx) { const g = L.ctx; setSel([g]); return; } setSel([]); return; }
    if (!L.sel.length) return;
    if (mod && k === 'g') { stop(); e.shiftKey ? ungroupSel() : groupSel(); return; }
    if (mod && k === 'd') { stop(); dupSel(); return; }
    if (mod && k === 'l') { stop(); const ts = topSel(); const v = !ts.every(l => l.locked); ts.forEach(l => l.locked = v); if (v) L.sel = []; changed(); return; }
    if (mod && e.shiftKey && k === 'h') { stop(); topSel().forEach(l => l.hidden = true); L.sel = []; changed(); return; }
    if (mod && (e.key === ']' || e.code === 'BracketRight')) { stop(); order(e.shiftKey ? 2 : 1); return; }
    if (mod && (e.key === '[' || e.code === 'BracketLeft')) { stop(); order(e.shiftKey ? -2 : -1); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { stop(); delSel(); return; }
    if (e.key === 'Enter') { stop(); const l = topSel()[0]; if (!l) return; if (l.type === 'text') startEdit(l); else if (l.type === 'group') { L.ctx = l.id; L.open[l.id] = true; setSel(l.children.filter(c => !c.hidden).map(c => c.id), true); } else if (l.type === 'image') { L.crop = l.id; drawOv(); renderProps(); } return; }
    const st = e.shiftKey ? 10 : 1; const mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
    if (mv) { stop(); const ts = topSel(); if (ts.some(effLocked)) return; ts.forEach(l => moveLayer(l, mv[0], mv[1])); paint(); updNums(); clearTimeout(onKey.t); onKey.t = setTimeout(() => push(true), 350); }
  }
  function onKeyAll(e) { if (!L.on) return; onKey(e); const t = e.target; if (!(t.closest && t.closest('input,textarea,select'))) e.stopImmediatePropagation(); }

  /* ======================================================================
     hooks into the announcement editor
     ====================================================================== */
  function hook() {
    buildUI();
    // top bar button in the announcement editor
    const tb = document.createElement('button'); tb.className = 'tb'; tb.id = 'bLayers'; tb.title = 'تفكيك التصميم الحالي إلى طبقات منفصلة (مثل الفوتوشوب): كل نص وصورة وشكل وأيقونة تتحكم فيه لحاله'; tb.innerHTML = `${IC('layers', 2)}<span class="lbl">طبقات</span>`; tb.onclick = fromBoard;
    const anchor = q('bQA'); if (anchor) anchor.before(tb); else q('topbar').appendChild(tb);
    // file menu entries
    // file menu: one tidy grouped list (new / open / import / save) — same actions as before
    const fm = q('fileMenu'); if (fm) {
      const it = (attr, ic, txt, kb) => `<button ${attr}>${IC(ic, 1.9)}<span>${txt}</span>${kb ? `<kbd>${kb}</kbd>` : ''}</button>`;
      fm.classList.add('lxMenu');
      fm.innerHTML = `<div class="mh">جديد</div>${it('data-act="blank"', 'file-plus', 'إعلان جديد')}${it('data-act="welcome"', 'user', 'رسالة ترحيب')}${it('data-lx="lxNew"', 'layers', 'تصميم حر بالطبقات…')}
        <hr><div class="mh">فتح</div>${it('data-act="lib"', 'folder', 'إعلاناتي')}${it('data-lx="lxLib"', 'layers-3', 'تصاميمي بالطبقات')}${it('data-act="open"', 'folder-open', 'فتح ملف من جهازك…')}
        <hr><div class="mh">حفظ</div>${it('data-act="libSave"', 'save', 'حفظ في «إعلاناتي»', K('S'))}${it('data-act="save"', 'download', 'حفظ نسخة على جهازك')}
        <hr>${it('data-v2="start"', 'house', 'صفحة البداية')}`;
      fm.addEventListener('click', e => { const b = e.target.closest('[data-lx]'); if (!b) return; fm.style.display = 'none'; const k = b.dataset.lx; if (k === 'lxNew') newModal(); if (k === 'lxLib') libModal(); });
    }
    // free designs (guides / infographics) now open fully decomposed into layers
    window.openFreeLegacy = window.openFree; window.openFree = o => fromFree(o);
    // free-design mode button (if someone is still in it)
    const fmTop = q('fmTop'); if (fmTop) { const b = document.createElement('button'); b.className = 'pri'; b.textContent = 'تفكيك إلى طبقات'; b.onclick = () => { const fr = q('fmFrame'); if (!fr || !fr.contentDocument) return; const html = '<!doctype html>' + fr.contentDocument.documentElement.outerHTML.replace(/<div id="fxSel"[\s\S]*?<\/div>/, ''); fromFree({ html, w: parseFloat(fr.style.width), h: parseFloat(fr.style.height), name: 'تصميم' }); }; fmTop.prepend(b); }
    // design files: layers files open here
    if (typeof openDesignText === 'function') { const orig = openDesignText; openDesignText = function (txt, name, confirm) { try { const o = JSON.parse(txt); if (o && o.app === 'jedco-layers') { openObj(o); return; } if (o && o.app === 'jedco-free-design') { fromFree(o); return; } } catch (e) { } return orig.apply(this, arguments); }; }
    // phone: selecting opens the properties sheet
    // back from the toolkit home / a reload: reopen the design you were working on
    // back from a reload: the start page offers to reopen the layers design you were working on
    async function resumeLX() { let id = null; try { id = localStorage.getItem('jedLX_open'); } catch (e) { } if (!id) return false; const rec = await loadRec(id); if (!rec || !rec.data || L.on) return false; openObj(rec.data, { libId: rec.id, thumb: rec.thumb }); const k = getLinks().find(x => x.lx === rec.id); L.linkedBoard = k || null; say('رجعتك لتصميم الطبقات اللي كنت شغال عليه، كل تعديلاتك موجودة'); return true; }
    async function resumeInfo() { let id = null; try { id = localStorage.getItem('jedLX_open'); } catch (e) { } if (!id) return null; try { const rec = await loadRec(id); return rec && rec.data ? { id: rec.id, name: rec.name || rec.title || (rec.data && rec.data.name) || 'تصميم بالطبقات', thumb: rec.thumb || null } : null; } catch (e) { return null; } }
    updLayersBtn();
    if (typeof activate === 'function') { const _act = activate; activate = function () { const r = _act.apply(this, arguments); setTimeout(updLayersBtn, 300); return r; }; }
    let ubT = 0; const ub = () => { if (L.on) return; clearTimeout(ubT); ubT = setTimeout(updLayersBtn, 900); };
    document.addEventListener('pointerup', ub, true); document.addEventListener('keyup', ub, true);
    window.__lxApi = { resumeLX, resumeInfo, fromBoard, fromFree, openObj, newModal, libModal, exitLX, get state() { return L; }, paint, setSel, groupSel, ungroupSel, flattenAll, exportPNG, get, all, aabb, topSel, undo, redo, alignSel, order, addText, addShape, addIcon, addLogo, decompose, fileObj, applyNum, renderProps, renderPanel };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
})();
