/* ==========================================================================
   صانع العروض 2 — Jeddah Airports photo library (offline)
   · 220+ tagged photos from «مكتبة الصور» (photos/lib.js: tags + thumbnails,
     photos/<id>.js: full photo, loaded only when used)
   · picks the photo that matches what the slide talks about
   · when nothing fits, leaves a marked frame with the picture it suggests
   ========================================================================== */
(function (PM) {
'use strict';
const ST = PM.ST;
const LIB = () => PM.PHOTOLIB || {};

/* ---------- text normalising (Arabic + English) ---------- */
const norm = t => String(t || '').toLowerCase()
  .replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/[^\p{L}\p{N}\s-]/gu, ' ');
const STOP = new Set('في من على الى إلى عن مع هذا هذه ذلك التي الذي the and for with from into that this are our your will been have has was ال و او أو ثم كل'.split(' '));
function tokens(t) {
  return norm(t).split(/\s+/).map(w => w.replace(/^(و|ف|ب|ل|ك)?ال/, '')).filter(w => w.length >= 3 && !STOP.has(w));
}
PM.specText = function (spec) {
  const out = [spec.title, spec.sub, spec.eyebrow];
  const walk = v => { if (v == null) return; if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!/^(k|kind|icon|unit|pre|dec|w)$/.test(k)) walk(x); }); };
  walk(spec.blocks); walk(spec.items);
  return PM.plain(out.filter(Boolean).join(' '));
};

/* ---------- index ---------- */
let IDX = null;
function index() {
  if (IDX) return IDX;
  IDX = Object.entries(LIB()).map(([pid, m]) => ({ pid, m, kw: new Set(m.kw.flatMap(k => tokens(k)).concat(m.kw.map(k => norm(k).trim()))) }));
  return IDX;
}
function matchScore(toks, e) {
  let s = 0; const hit = new Set();
  for (const t of toks) for (const k of e.kw) {
    if (hit.has(k)) continue;
    if (k === t || (k.length >= 4 && t.startsWith(k)) || (t.length >= 4 && k.startsWith(t))) { s += 1; hit.add(k); }
  }
  return s;
}

/* subjects the library may not cover: suggest the picture instead of a random photo */
const TOPICS = [
  { re: /حج|حجاج|الحجيج|ضيوف الرحمن|hajj|pilgrim/i, tags: ['hajj', 'حج', 'pilgrims', 'حجاج'], ar: 'حجاج بلباس الإحرام يعبرون صالة الحج تحت المظلات البيضاء', en: 'Hajj pilgrims in white ihram walking under the white tent roof of the Hajj terminal at golden hour, calm and organised' },
  { re: /عمره|عمرة|معتمر|umrah/i, tags: ['umrah', 'عمره', 'pilgrims', 'حجاج'], ar: 'معتمرون يصلون إلى صالة حديثة ويستقبلهم فريق المطار', en: 'Umrah pilgrims in ihram arriving through a bright modern terminal hall, welcomed by airport staff, warm natural light' },
  { re: /قطار|الحرمين|train|rail/i, tags: ['train', 'قطار'], ar: 'قطار الحرمين السريع في محطة المطار', en: 'Haramain high speed train at the airport station platform, sleek and modern, soft daylight' },
  { re: /اطفاء|إطفاء|حريق|الانقاذ|الإنقاذ|fire|rescue/i, tags: ['fire', 'اطفاء'], ar: 'مركبة إطفاء المطار جاهزة على الساحة', en: 'Airport fire and rescue vehicle ready on the apron, crew in protective gear, dramatic sky' },
  { re: /طاقه شمسيه|طاقة شمسية|استدامه|استدامة|كربون|انبعاث|بيئ|sustainab|carbon|solar/i, tags: ['sustainability', 'استدامه', 'garden', 'حديقه'], ar: 'ألواح طاقة شمسية ومساحات خضراء حول مباني المطار', en: 'Solar panels and green landscaping around a modern airport terminal, clean bright daylight' },
  { re: /تدريب|تاهيل|تأهيل|ورشه|ورشة|training|workshop/i, tags: ['training', 'تدريب', 'meeting', 'اجتماع'], ar: 'جلسة تدريب لموظفي المطار في قاعة حديثة', en: 'Airport staff in a modern training room, engaged discussion, natural window light' },
  { re: /رقمي|تقني|ذكاء اصطناعي|ذكي|الكتروني|إلكتروني|digital|technology|smart|ai\b/i, tags: ['technology', 'تقنيه', 'check-in', 'تسجيل'], ar: 'أجهزة خدمة ذاتية وشاشات رقمية في صالة المغادرة', en: 'Self-service kiosks and digital screens in a bright departure hall, travellers using them, clean modern look' },
  { re: /اتفاقيه|اتفاقية|توقيع|شراكه|شراكة|مذكره|agreement|partnership|signing|mou/i, tags: ['meeting', 'اجتماع', 'office', 'مكتب'], ar: 'توقيع اتفاقية في قاعة اجتماعات رسمية', en: 'Formal agreement signing at a meeting table, two executives shaking hands, premium boardroom' },
  { re: /عائل|اطفال|أطفال|families|children/i, tags: ['families', 'عائلات'], ar: 'عائلة مسافرة تتجول في صالة المطار', en: 'A travelling family walking through a bright airport terminal, relaxed and happy' }
];

/* best photo for a slide (or a suggestion when nothing fits) */
PM.photoPick = function (deck, s, i, o = {}) {
  const text = PM.specText(s.spec);
  const toks = tokens(text);
  const dark = (s.tone || (deck.dark ? 'dark' : 'light')) === 'dark';
  const si = deck.slides.indexOf(s);
  const near = new Set();
  deck.slides.slice(Math.max(0, si - 4), si + 5).forEach(x => { if (x === s) (x.spec.autoImgs || []).forEach((id, k) => { if (k !== i) near.add(id); }); else { (x.spec.autoImgs || []).forEach(id => near.add(id)); (x.spec.imgs || []).forEach(id => near.add(id)); } });
  const used = new Set(); deck.slides.forEach(x => (x.spec.autoImgs || []).forEach(id => used.add(id)));
  const cover = ['cover', 'closing', 'divider'].includes(s.spec.kind);
  const seed = (s.id || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) + i * 13;
  const list = index().map(e => {
    const m = matchScore(toks, e);
    let sc = m * 3 + (e.m.hero || 0) * (cover ? 1.2 : 0.6);
    if (dark && /night|sunset/.test(e.m.light)) sc += 0.8;
    if (!dark && e.m.light === 'day') sc += 0.3;
    if (used.has('ph:' + e.pid)) sc -= 1.5;
    sc += ((seed * 31 + e.pid.charCodeAt(4) * 7 + +e.pid.slice(2)) % 10) / 25; // gentle variety between equal photos
    return { id: 'ph:' + e.pid, e, m, sc };
  }).filter(x => !near.has(x.id)).sort((a, b) => b.sc - a.sc);
  // the user's own photos join the race with a head start
  const mine = Object.keys(deck.assets).filter(k => deck.assets[k].lib && !near.has(k));
  const best = list[0];
  // topic the library does not cover → suggestion
  const mode = deck.photoSug || 'auto';
  if (mode !== 'never' && !cover) {
    const topic = TOPICS.find(t => t.re.test(text));
    const covered = topic && list.slice(0, 12).some(x => topic.tags.some(tg => x.e.kw.has(norm(tg).trim())));
    if ((topic && !covered) || (mode === 'always' && (!best || best.m === 0))) {
      return PM.suggestPhoto(deck, s, i, topic || null, text);
    }
  }
  if (mine.length && (!best || best.m === 0)) return mine[(seed) % mine.length];
  if (best) return best.id;
  const stock = Object.keys(deck.assets).filter(k => deck.assets[k].stock && !near.has(k));
  return stock[seed % Math.max(1, stock.length)] || null;
};

/* a marked frame: «صورة مقترحة» with what it should show */
PM.suggestPhoto = function (deck, s, i, topic, text) {
  const id = 'sug:' + s.id + ':' + i;
  const title = PM.plain(s.spec.title || '');
  const ar = topic ? topic.ar : `صورة تعبّر عن «${title.slice(0, 60) || 'موضوع الشريحة'}» في مطار الملك عبدالعزيز`;
  const en = topic ? topic.en : `A premium cinematic photo at King Abdulaziz International Airport (Jeddah) that expresses: ${title.slice(0, 80)}. Clean composition, natural light, no text or logos`;
  deck.assets[id] = { kind: 'sug', note: ar, prompt: en, size: { w: 1600, h: 1000 } };
  return id;
};

/* the library replaces the old picker */
PM.autoPhoto = function (deck, s, i) {
  s.spec.autoImgs = s.spec.autoImgs || [];
  const cur = s.spec.autoImgs[i];
  if (cur && deck.assets[cur]) return cur;
  const pick = PM.photoPick(deck, s, i);
  s.spec.autoImgs[i] = pick;
  return pick;
};
/* other photos that fit this slide (for «بدائل» in the photo bar) */
PM.photoAlternatives = function (deck, s, n = 12) {
  const toks = tokens(PM.specText(s.spec));
  return index().map(e => ({ id: 'ph:' + e.pid, sc: matchScore(toks, e) * 3 + (e.m.hero || 0) * 0.5 })).sort((a, b) => b.sc - a.sc).slice(0, n).map(x => x.id);
};
PM.photoSearch = function (q, n = 120) {
  const toks = tokens(q);
  if (!toks.length) return index().slice().sort((a, b) => (b.m.hero || 0) - (a.m.hero || 0)).slice(0, n).map(e => 'ph:' + e.pid);
  return index().map(e => ({ id: 'ph:' + e.pid, sc: matchScore(toks, e) + (norm(e.m.note).includes(norm(q).trim()) ? 2 : 0) })).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, n).map(x => x.id);
};

/* ---------- assets: thumbnails right away, full photos on demand ---------- */
const _base = PM.baseAssets;
PM.baseAssets = function () {
  const a = _base();
  for (const [pid, m] of Object.entries(LIB())) a['ph:' + pid] = { kind: 'image', ext: 'jpeg', libph: true, pid, url: 'data:image/jpeg;base64,' + m.th, size: { w: m.w, h: m.h }, thumb: true };
  return a;
};
const loaded = {}, waiting = {};
PM.__ph = function (pid, b64) { loaded[pid] = b64; (waiting[pid] || []).forEach(f => f(b64)); delete waiting[pid]; };
PM.loadPhoto = function (pid) {
  return new Promise(res => {
    if (loaded[pid]) return res(loaded[pid]);
    if (waiting[pid]) { waiting[pid].push(res); return; }
    waiting[pid] = [res];
    const sc = document.createElement('script');
    sc.src = 'photos/' + pid + '.js';
    sc.onerror = () => { (waiting[pid] || []).forEach(f => f(null)); delete waiting[pid]; };
    document.head.appendChild(sc);
  });
};
/* make sure the full-size photos used in a deck (or a slide) are in memory */
PM.ensurePhotos = async function (deck, slides) {
  const ids = new Set();
  (slides || deck.slides).forEach(s => (s.objs || []).forEach(o => { if (o.t === 'image' && o.src && String(o.src).startsWith('ph:')) ids.add(o.src); }));
  let changed = false;
  await Promise.all([...ids].map(async id => {
    const a = deck.assets[id]; if (!a || !a.thumb) return;
    const b64 = await PM.loadPhoto(a.pid);
    if (b64) { a.b64 = b64; a.url = 'data:image/jpeg;base64,' + b64; delete a.bytes; a.thumb = false; changed = true; }
  }));
  return changed;
};
/* the stage swaps in the sharp photo as soon as it arrives */
PM.onReady = PM.onReady || [];
const hookStage = () => {
  const Ed = PM.Ed; if (!Ed || Ed._phHook) return; Ed._phHook = true;
  const r0 = Ed.render;
  Ed.render = function () {
    r0.apply(this, arguments);
    const d = ST.deck, s = d && d.slides[ST.cur];
    if (!s) return;
    PM.ensurePhotos(d, [s]).then(ch => { if (ch && !Ed.editing) { r0.apply(Ed); if (PM.UI && PM.UI.renderThumb) PM.UI.renderThumb(ST.cur); } });
  };
};
if (PM.Ed) hookStage(); else document.addEventListener('DOMContentLoaded', hookStage);
})(window.PM);
