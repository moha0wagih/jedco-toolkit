/* ==========================================================================
   صانع العروض 2 — free text
   · every text piece on a slide is its own object (title, sub-title, each
     card title, each body, each list) — nothing moves with anything else
   · text tools from «مصمم التواصل الداخلي»: size slider, thickness slider,
     bold for selected words (B / ⌘B), reset
   ========================================================================== */
(function (PM) {
'use strict';
const ST = PM.ST;

/* ---------- split multi-paragraph boxes into independent pieces ---------- */
// paragraphs of one list (or one multi-paragraph body) stay together; everything else is its own piece
function runKey(p, i) {
  if (p.bind) {
    if (/\.bullets\.\d+$/.test(p.bind)) return p.bind.replace(/\.\d+$/, '');
    if (/^(blocks\.\d+\.)?items\.\d+$/.test(p.bind) || /^main\.items\.\d+$/.test(p.bind)) return p.bind.replace(/\.\d+$/, '') + (p.bullet ? ':list' : ':' + i);
    return p.bind;
  }
  return p.bullet ? '__list' : '__' + i;
}
PM.explodeText = function (objs) {
  const out = [];
  for (const o of objs) {
    if (o.t !== 'text' || o.pageNum || o.role === 'page' || o.role === 'chrome' || !o.paras || o.paras.length < 2 || o.keepGroup) { out.push(o); continue; }
    const runs = [];
    o.paras.forEach((p, i) => {
      const k = runKey(p, i);
      const last = runs[runs.length - 1];
      if (last && last.k === k) last.ps.push(p); else runs.push({ k, ps: [p] });
    });
    if (runs.length < 2) { out.push(o); continue; }
    // where the original box placed its content (flex column + vertical anchor)
    const full = o.paras.map(p => PM.blockH([Object.assign({}, p, { sb: 0 })], o.w) + (p.sb || 0));
    const total = full.reduce((a, b) => a + b, 0);
    let y = o.va === 'm' ? o.y + (o.h - total) / 2 : o.va === 'b' ? o.y + o.h - total : o.y;
    let pi = 0;
    runs.forEach((r, ri) => {
      const ps = r.ps.map((p, j) => Object.assign({}, p, j === 0 ? { sb: 0 } : {}));
      const top = y + (r.ps[0].sb || 0);
      const h = PM.blockH(ps, o.w);
      const n = Object.assign({}, o, { id: PM.uid(), y: top, h: h + 1, paras: ps, va: 't', name: (o.name || 'Text') + (runs.length > 1 ? ' · ' + (ri + 1) : ''), autoH: true, overflow: false, used: h });
      delete n.joinBind;
      if (o.joinBind && r.ps.every(p => p.bind === r.ps[0].bind)) n.joinBind = true;
      out.push(n);
      for (let j = 0; j < r.ps.length; j++) y += full[pi++];
    });
  }
  return out;
};

/* ---------- read an edited paragraph back, keeping bold words ---------- */
PM.readRich = function (el) {
  let out = '';
  const walk = (n, bold) => {
    if (n.nodeType === 3) { const t = n.textContent.replace(/​/g, ''); if (t) out += bold ? PM.BO + t + PM.BC : t; return; }
    if (n.nodeType !== 1) return;
    if (n.classList && n.classList.contains('pmb')) return;
    if (n.tagName === 'BR') { out += '\n'; return; }
    const st = n.getAttribute && (n.getAttribute('style') || '');
    const b = /font-weight:\s*(normal|400)/.test(st) && n.tagName === 'SPAN' && !(n.dataset && n.dataset.b) ? false : (bold || n.tagName === 'B' || n.tagName === 'STRONG' || (n.dataset && n.dataset.b === '1') || (n.tagName === 'SPAN' && /font-weight:\s*(bold|[6-9]00)/.test(st)));
    const block = n !== el && /^(DIV|P)$/.test(n.tagName);
    if (block && out && !out.endsWith('\n')) out += '\n';
    n.childNodes.forEach(c => walk(c, b));
  };
  walk(el, false);
  // merge neighbouring bold spans, drop empty markers
  return out.replace(new RegExp(PM.BC + PM.BO, 'g'), '').replace(new RegExp(PM.BO + PM.BC, 'g'), '');
};

/* ---------- size / thickness / bold tools for the context bar ---------- */
const TX = PM.TextTools = {};
TX.base = function (o) { if (!o.base) o.base = o.paras.map(p => ({ size: p.size, sb: p.sb || 0, sa: p.sa || 0 })); return o.base; };
TX.scaleOf = function (o) { const b = TX.base(o); return b[0] && b[0].size ? o.paras[0].size / b[0].size : 1; };
TX.setScale = function (o, k) {
  const b = TX.base(o);
  o.paras.forEach((p, i) => { const q = b[Math.min(i, b.length - 1)]; p.size = Math.max(5, Math.round(q.size * k * 4) / 4); p.sb = q.sb * k; p.sa = q.sa * k; });
  TX.fitH(o);
};
TX.fitH = function (o) { const need = PM.blockH(o.paras, o.w) + 1; if (o.autoH || need > o.h) o.h = need; };
TX.setWeight = function (o, v) { o.paras.forEach(p => { p.sw = v || 0; }); };
TX.reset = function (o) { if (o.base) TX.setScale(o, 1); o.paras.forEach(p => { p.sw = 0; p.t = PM.plain(p.t); }); };
/* bold the words the user selected while editing (or toggle the whole piece) */
TX.boldSelection = function () {
  const ed = PM.Ed.editing;
  if (ed) { document.execCommand('bold'); return true; }
  return false;
};
})(window.PM);
