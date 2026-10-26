/* ==========================================================================
   صانع العروض 2 — document model
   deck = { v, lang, grey, dark, name, slides:[{id, spec, layout, tone, objs, edited, hidden}], assets }
   Every text paragraph keeps a bind path into its slide's spec, so content
   survives layout changes and edits flow both ways.
   ========================================================================== */
(function (PM) {
'use strict';
const ST = PM.ST = { deck: null, cur: 0, sel: new Set(), undo: [], redo: [], listeners: [] };
PM.on = fn => ST.listeners.push(fn);
PM.emit = (what) => ST.listeners.forEach(fn => { try { fn(what); } catch (e) { console.error(e); } });
const sid = () => 's' + Math.random().toString(36).slice(2, 9);

/* ---------- bind paths ---------- */
function getPath(spec, path) {
  if (!path) return undefined;
  if (path === 'lead') return spec.blocks.filter(b => b.k === 'para').map(b => b.text).join('\n');
  if (path === 'text') return spec.blocks.filter(b => b.k === 'para').map(b => b.text).join('\n');
  let o = spec;
  for (const k of path.split('.')) { if (o == null) return undefined; o = o[k]; }
  return o;
}
function setPath(spec, path, val) {
  if (!path) return;
  if (path === 'lead' || path === 'text') {
    const ps = spec.blocks.filter(b => b.k === 'para');
    if (!ps.length) { spec.blocks.unshift({ k: 'para', text: val }); return; }
    ps[0].text = val;
    for (const p of ps.slice(1)) spec.blocks.splice(spec.blocks.indexOf(p), 1);
    return;
  }
  const ks = path.split('.');
  let o = spec;
  for (let i = 0; i < ks.length - 1; i++) {
    const k = ks[i];
    if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    o = o[k];
  }
  const last = ks[ks.length - 1];
  // an item stored as a plain string (bullets) becomes text
  if (typeof o === 'string') return;
  if (Array.isArray(o) && /^\d+$/.test(last) && typeof o[last] === 'string' && typeof val === 'string') { o[last] = val; return; }
  o[last] = val;
}
PM.getPath = getPath; PM.setPath = setPath;
/* bullets live as strings; editing "items.3.text" on a bullet list writes the string */
PM.writeBind = function (spec, path, val) {
  const m = path.match(/^(blocks\.\d+)\.items\.(\d+)\.(text|title)$/);
  if (m) {
    const b = getPath(spec, m[1]);
    if (b && Array.isArray(b.items) && typeof b.items[+m[2]] === 'string') { b.items[+m[2]] = val; return; }
    if (b && b.k === 'kpis' && m[3] === 'title') { b.items[+m[2]].label = val; return; }
  }
  const m2 = path.match(/^(blocks\.\d+)\.items\.(\d+)\.date$/);
  if (m2) { const b = getPath(spec, m2[1]); if (b && b.items[+m2[2]]) { b.items[+m2[2]].date = val; return; } }
  setPath(spec, path, val);
};

/* ---------- context for rendering one slide ---------- */
PM.slideCtx = function (deck, si, extra = {}) {
  const s = deck.slides[si];
  const visible = deck.slides.filter(x => !x.hidden);
  const page = visible.indexOf(s) + 1;
  const divIdx = deck.slides.slice(0, si).filter(x => x.spec.kind === 'divider').length;
  const used = new Set();
  const c = PM.ctx({
    lang: deck.lang, dark: (s.tone || (deck.dark ? 'dark' : 'light')) === 'dark', grey: deck.grey, assets: deck.assets, page: page || si + 1, total: visible.length, kind: s.spec.kind,
    photoFor: (sp, i) => PM.autoPhoto(deck, s, i),
    iconFor: (text, i) => PM.autoIcon(text, used)
  });
  c.divIdx = divIdx;
  return Object.assign(c, extra);
};
/* brand photos: one per slide, never the same photo on two neighbouring slides */
PM.autoPhoto = function (deck, s, i) {
  s.spec.autoImgs = s.spec.autoImgs || [];
  if (s.spec.autoImgs[i] && deck.assets[s.spec.autoImgs[i]]) return s.spec.autoImgs[i];
  const pool = Object.keys(deck.assets).filter(k => deck.assets[k].stock || deck.assets[k].lib);
  if (!pool.length) return null;
  const si = deck.slides.indexOf(s);
  const near = new Set();
  deck.slides.slice(Math.max(0, si - 3), si + 4).forEach(x => { (x.spec.autoImgs || []).forEach(id => near.add(id)); (x.spec.imgs || []).forEach(id => near.add(id)); });
  // the user's own library first, then the brand photos
  const lib = pool.filter(k => deck.assets[k].lib);
  const ordered = [...lib, ...pool.filter(k => !deck.assets[k].lib)];
  const seed = (s.id || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) + i * 7;
  let pick = ordered.find((k, j) => !near.has(k) && j >= seed % ordered.length) || ordered.find(k => !near.has(k)) || ordered[seed % ordered.length];
  s.spec.autoImgs[i] = pick;
  return pick;
};
PM.autoIcon = function (text, used) {
  let list = [];
  try { list = typeof suggestIcons === 'function' ? suggestIcons(text, PM.ICONS || ICONS, 8) : []; } catch (e) { list = []; }
  const pick = list.find(n => !used.has(n)) || list[0] || ['circle-dot', 'star', 'target', 'flag', 'sparkles', 'layers', 'compass', 'award'].find(n => !used.has(n)) || 'circle-dot';
  used.add(pick);
  return 'lib:' + pick;
};

/* ---------- layouts on slides ---------- */
PM.layoutById = id => PM.LIB.find(L => L.id === id);
PM.applyLayout = function (deck, si, L, opt = {}) {
  const s = deck.slides[si];
  if (opt.tone) s.tone = opt.tone;
  const c = PM.slideCtx(deck, si);
  const r = PM.renderLayout(L, s.spec, c);
  s.layout = L.id;
  s.objs = r.objs;
  s.edited = false;
  s.overflow = r.overflow;
  s.missing = r.missing;
  return r;
};
PM.relayout = function (deck, si) {
  const s = deck.slides[si];
  const L = PM.layoutById(s.layout);
  if (!L) return PM.autoSlide(deck, si);
  return PM.applyLayout(deck, si, L);
};
/* best layout, keeping variety along the deck */
PM.autoSlide = function (deck, si) {
  const s = deck.slides[si];
  const c = PM.slideCtx(deck, si);
  const prev = deck.slides.slice(Math.max(0, si - 3), si).map(x => PM.layoutById(x.layout)).filter(Boolean);
  const avoid = [...prev.map(L => L.id), ...prev.slice(-2).map(L => L.fam)];
  // official template slides first for cover / agenda / divider / closing
  if (['cover', 'agenda', 'closing'].includes(s.spec.kind) && !deck.noOfficial) {
    const off = PM.LIB.find(L => L.official && L.kinds && L.kinds.includes(s.spec.kind));
    if (off) return PM.applyLayout(deck, si, off);
  }
  if (s.spec.kind === 'divider' && !deck.noOfficial) {
    const off = PM.LIB.find(L => L.id === 'div-official');
    if (off) return PM.applyLayout(deck, si, off);
  }
  const best = PM.autoLayout(s.spec, c, avoid);
  if (!best) { const any = PM.layoutById('mix-any'); return PM.applyLayout(deck, si, any); }
  return PM.applyLayout(deck, si, best.L);
};

/* ---------- deck ---------- */
PM.newDeck = function (o = {}) {
  return { v: 2, lang: o.lang || 'ar', grey: !!o.grey, dark: !!o.dark, name: o.name || '', slides: [], assets: Object.assign({}, PM.baseAssets()), created: Date.now() };
};
PM.addSlide = function (deck, spec, at, o = {}) {
  const s = { id: sid(), spec: Object.assign({ kind: 'content', title: '', sub: '', eyebrow: '', blocks: [], imgs: [] }, spec), layout: null, tone: o.tone || null, objs: [], edited: false };
  if (at == null) deck.slides.push(s); else deck.slides.splice(at, 0, s);
  return s;
};
PM.buildDeck = function (deck) {
  deck.slides.forEach((s, i) => { if (!s.layout) PM.autoSlide(deck, i); else PM.relayout(deck, i); });
};
/* page numbers change when slides move: refresh just the page-number boxes */
PM.renumber = function (deck) {
  const vis = deck.slides.filter(x => !x.hidden);
  deck.slides.forEach(s => { const n = vis.indexOf(s) + 1; (s.objs || []).forEach(o => { if (o.pageNum && n) o.paras[0].t = PM.pad2(n); }); });
};

/* ---------- undo / redo (whole-deck snapshots, assets excluded) ---------- */
function snap() { const d = ST.deck; return JSON.stringify({ slides: d.slides, lang: d.lang, grey: d.grey, dark: d.dark, name: d.name, noOfficial: d.noOfficial }); }
PM.commit = function (label) {
  if (!ST.deck) return;
  const s = snap();
  if (ST.undo.length && ST.undo[ST.undo.length - 1].s === s) return;
  ST.undo.push({ s, label: label || '' });
  if (ST.undo.length > 120) ST.undo.shift();
  ST.redo = [];
  PM.autosave();
};
PM.checkpoint = () => { if (!ST.undo.length) ST.undo.push({ s: snap(), label: 'start' }); };
function restore(s) { const o = JSON.parse(s); Object.assign(ST.deck, o); ST.cur = Math.min(ST.cur, ST.deck.slides.length - 1); ST.sel.clear(); }
PM.undo = function () {
  if (ST.undo.length < 2) return false;
  ST.redo.push(ST.undo.pop());
  restore(ST.undo[ST.undo.length - 1].s);
  PM.emit('all'); PM.autosave(); return true;
};
PM.redo = function () {
  if (!ST.redo.length) return false;
  const r = ST.redo.pop(); ST.undo.push(r); restore(r.s);
  PM.emit('all'); PM.autosave(); return true;
};

/* ---------- assets ---------- */
PM.baseAssets = function () {
  const a = {};
  (PM.STOCK || []).forEach((b64, i) => { a['stock:' + i] = { kind: 'image', ext: 'jpeg', stock: true, b64, size: PM.STOCK_SIZE ? PM.STOCK_SIZE[i] : { w: 1500, h: 1000 } }; });
  for (const lang of ['ar', 'en']) ((PM.BG && PM.BG[lang]) || []).forEach((u, i) => { a['tpl:' + lang + ':' + i] = { kind: 'image', ext: 'jpeg', tplbg: true, url: u, size: { w: 1280, h: 720 } }; });
  return a;
};
PM.addAssetBytes = function (deck, bytes, ext, o = {}) {
  const id = (o.prefix || 'u') + Math.random().toString(36).slice(2, 9);
  deck.assets[id] = Object.assign({ kind: 'image', bytes, ext: ext === 'jpg' ? 'jpeg' : ext, size: PM.imgSizeOf(bytes) }, o.extra || {});
  return id;
};
PM.bytesToB64 = function (bytes) { let s = ''; const ch = 0x8000; for (let i = 0; i < bytes.length; i += ch) s += String.fromCharCode.apply(null, bytes.subarray(i, i + ch)); return btoa(s); };
PM.b64ToBytes = function (b64) { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
PM.assetBytes = function (a) { if (!a) return null; if (a.bytes) return a.bytes; if (a.b64) return (a.bytes = PM.b64ToBytes(a.b64)); if (a.url && a.url.startsWith('data:')) return (a.bytes = PM.b64ToBytes(a.url.split(',')[1])); return null; };

/* ---------- project file (assets embedded, stock/template referenced) ---------- */
PM.serialize = function (deck) {
  const assets = {};
  const used = new Set();
  deck.slides.forEach(s => { (s.objs || []).forEach(o => { if (o.src) used.add(o.src); }); (s.spec.imgs || []).forEach(id => used.add(id)); (s.spec.autoImgs || []).forEach(id => used.add(id)); });
  for (const [k, a] of Object.entries(deck.assets)) {
    if (a.stock || a.tplbg) continue;
    if (!used.has(k) && !a.lib) continue;
    const b = PM.assetBytes(a);
    if (b) assets[k] = { kind: a.kind, ext: a.ext, b64: PM.bytesToB64(b), size: a.size, lib: a.lib || false, tags: a.tags || '' };
  }
  return JSON.stringify({ app: 'sanea-alorood', v: 2, deck: Object.assign({}, deck, { assets: undefined }), assets });
};
PM.deserialize = function (txt) {
  const o = JSON.parse(txt);
  if (!o || o.app !== 'sanea-alorood' || !o.deck) throw new Error('هذا الملف مو مشروع صانع العروض');
  const d = o.deck;
  d.assets = Object.assign(PM.baseAssets(), o.assets || {});
  return d;
};

/* ---------- autosave (IndexedDB) ---------- */
const DB = 'sanea2', STORE = 'decks';
function idb() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: 'id' }); r.result.createObjectStore('photos', { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
PM.idb = idb;
let saveT = null;
PM.autosave = function () {
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    const d = ST.deck; if (!d || !d.slides.length) return;
    try {
      d.id = d.id || ('d' + Date.now().toString(36));
      const db = await idb();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id: d.id, name: d.name || (d.slides[0] && d.slides[0].spec.title) || 'عرض بدون اسم', at: Date.now(), n: d.slides.length, data: PM.serialize(d) });
      PM.emit('saved');
    } catch (e) { /* storage blocked: the project file still works */ }
  }, 900);
};
PM.listSaved = async function () {
  try { const db = await idb(); return await new Promise(res => { const r = db.transaction(STORE).objectStore(STORE).getAll(); r.onsuccess = () => res((r.result || []).map(x => ({ id: x.id, name: x.name, at: x.at, n: x.n })).sort((a, b) => b.at - a.at)); r.onerror = () => res([]); }); } catch (e) { return []; }
};
PM.loadSaved = async function (id) { const db = await idb(); return await new Promise((res, rej) => { const r = db.transaction(STORE).objectStore(STORE).get(id); r.onsuccess = () => res(r.result ? PM.deserialize(r.result.data) : null); r.onerror = () => rej(r.error); }); };
PM.deleteSaved = async function (id) { const db = await idb(); return await new Promise(res => { const r = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id); r.onsuccess = () => res(true); r.onerror = () => res(false); }); };
/* personal photo library */
PM.photoLib = {
  async all() { try { const db = await idb(); return await new Promise(res => { const r = db.transaction('photos').objectStore('photos').getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); }); } catch (e) { return []; } },
  async add(rec) { const db = await idb(); return await new Promise(res => { const r = db.transaction('photos', 'readwrite').objectStore('photos').put(rec); r.onsuccess = () => res(true); r.onerror = () => res(false); }); },
  async del(id) { const db = await idb(); return await new Promise(res => { const r = db.transaction('photos', 'readwrite').objectStore('photos').delete(id); r.onsuccess = () => res(true); r.onerror = () => res(false); }); }
};
})(window.PM);
