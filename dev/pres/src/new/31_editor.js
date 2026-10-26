/* ==========================================================================
   صانع العروض 2 — the stage editor
   Select · multi-select (Shift / Ctrl / marquee) · move with smart guides ·
   resize · inline text editing · drop images & icons · drag chart values live.
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H } = PM;
const ST = PM.ST;
const Ed = PM.Ed = { scale: 1, host: null, stage: null, ov: null, editing: null, tool: null };
const $ = (s, r = document) => r.querySelector(s);
const slide = () => ST.deck && ST.deck.slides[ST.cur];
const objById = id => (slide() ? slide().objs.find(o => o.id === id) : null);
const selected = () => [...ST.sel].map(objById).filter(Boolean);
Ed.selected = selected;
Ed.objById = objById;
const SNAP = 6;

/* ---------- mount ---------- */
Ed.mount = function (host) {
  Ed.host = host;
  host.innerHTML = `<div class="ed-wrap"><div class="ed-frame"><div class="ed-stage"></div><div class="ed-ov"></div></div></div>`;
  Ed.wrap = $('.ed-wrap', host); Ed.frame = $('.ed-frame', host); Ed.stage = $('.ed-stage', host); Ed.ov = $('.ed-ov', host);
  new ResizeObserver(() => Ed.fit()).observe(host);
  Ed.frame.addEventListener('pointerdown', onDown);
  Ed.frame.addEventListener('dblclick', onDbl);
  host.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; Ed.frame.classList.add('drop-on'); });
  host.addEventListener('dragleave', e => { if (!host.contains(e.relatedTarget)) Ed.frame.classList.remove('drop-on'); });
  host.addEventListener('drop', onDrop);
  document.addEventListener('keydown', onKey);
  document.addEventListener('paste', onPaste);
};
Ed.fit = function () {
  if (!Ed.host) return;
  const r = Ed.host.getBoundingClientRect();
  const pad = innerWidth < 760 ? 10 : 28;
  const s = Math.max(0.12, Math.min((r.width - pad * 2) / W, (r.height - pad * 2) / H));
  Ed.scale = s;
  Ed.frame.style.width = W * s + 'px'; Ed.frame.style.height = H * s + 'px';
  Ed.stage.style.transform = `scale(${s})`; Ed.ov.style.transform = `scale(${s})`;
  Ed.drawOverlay();
  PM.emit('fit');
};
/* ---------- render ---------- */
Ed.render = function () {
  const s = slide();
  if (!s) { Ed.stage.innerHTML = ''; Ed.ov.innerHTML = ''; return; }
  if (Ed.editing) return;
  PM.renderSlide(Ed.stage, s.objs, ST.deck.assets, {});
  const el = Ed.stage.firstChild; if (el) { el.style.transform = ''; }
  [...ST.sel].forEach(id => { if (!objById(id)) ST.sel.delete(id); });
  Ed.drawOverlay();
};
function elFor(id) { return Ed.stage.querySelector(`.pmo[data-id="${CSS.escape(id)}"]`); }
Ed.elFor = elFor;
/* redraw a single object in place (fast path while dragging values or styling) */
Ed.refreshObj = function (o) {
  const old = elFor(o.id); if (!old) return Ed.render();
  const nu = PM.objEl(o, ST.deck.assets);
  old.replaceWith(nu);
};

/* ---------- coordinates ---------- */
function pt(e) { const r = Ed.frame.getBoundingClientRect(); return { x: (e.clientX - r.left) / Ed.scale, y: (e.clientY - r.top) / Ed.scale }; }
Ed.pt = pt;
const selectable = (o, e) => o && !o.lock && !o.hidden && !(o.role === 'veil' && !(e && e.altKey)) && o.role !== 'tplbg';
function hit(e) {
  const els = document.elementsFromPoint(e.clientX, e.clientY).filter(x => x.classList && x.classList.contains('pmo') && Ed.stage.contains(x));
  for (const el of els) { const o = objById(el.dataset.id); if (selectable(o, e)) return o; }
  return null;
}
function bounds(list) {
  const x = Math.min(...list.map(o => o.x)), y = Math.min(...list.map(o => o.y));
  return { x, y, w: Math.max(...list.map(o => o.x + o.w)) - x, h: Math.max(...list.map(o => o.y + o.h)) - y };
}
Ed.bounds = bounds;

/* ---------- overlay: selection boxes, handles, guides, chart handles ---------- */
Ed.drawOverlay = function (guides) {
  if (!Ed.ov) return;
  const sel = selected();
  let h = '';
  const inv = 1 / Ed.scale;
  for (const o of sel) h += `<div class="sel-box${sel.length > 1 ? ' multi' : ''}" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;border-width:${1.5 * inv}px"></div>`;
  if (sel.length === 1 && !Ed.editing && !sel[0].pin) {
    const o = sel[0];
    const hs = 10 * inv;
    const dirs = o.t === 'line' ? (Math.abs(o.h) < 1 ? ['w', 'e'] : ['n', 's']) : o.t === 'icon' || o.t === 'logo' ? ['nw', 'ne', 'sw', 'se'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    for (const d of dirs) {
      const x = o.x + (d.includes('w') ? 0 : d.includes('e') ? o.w : o.w / 2);
      const y = o.y + (d.includes('n') ? 0 : d.includes('s') ? o.h : o.h / 2);
      h += `<div class="hdl" data-h="${d}" style="left:${x - hs / 2}px;top:${y - hs / 2}px;width:${hs}px;height:${hs}px;border-width:${1.5 * inv}px;cursor:${d}-resize"></div>`;
    }
    if (o.t === 'chart') h += chartHandles(o, inv);
    if (o.pctOf) h += `<div class="vh" data-v="pct" style="left:${o.x + o.w - 7 * inv}px;top:${o.y + o.h / 2 - 7 * inv}px;width:${14 * inv}px;height:${14 * inv}px;border-width:${2 * inv}px" title="اسحب لتغيير النسبة"></div>`;
  } else if (sel.length > 1) {
    const b = bounds(sel);
    h += `<div class="sel-group" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;border-width:${1 * inv}px"></div>`;
  }
  if (guides) for (const g of guides) h += g.v ? `<div class="guide" style="left:${g.v}px;top:0;width:${inv}px;height:${H}px"></div>` : `<div class="guide" style="top:${g.h}px;left:0;height:${inv}px;width:${W}px"></div>`;
  if (Ed.marquee) { const m = Ed.marquee; h += `<div class="marq" style="left:${Math.min(m.x0, m.x1)}px;top:${Math.min(m.y0, m.y1)}px;width:${Math.abs(m.x1 - m.x0)}px;height:${Math.abs(m.y1 - m.y0)}px;border-width:${inv}px"></div>`; }
  Ed.ov.innerHTML = h;
  PM.emit('overlay');
};
function chartHandles(o, inv) {
  const g = PM.chartGeom(o);
  let h = '';
  const r = 7 * inv;
  if (o.kind === 'donut' || o.kind === 'pie') {
    if (o.ring) {
      const sg = g.segs[0]; if (!sg) return '';
      const a = sg.a1, x = o.x + sg.cx + Math.cos(a) * (sg.R + sg.r) / 2, y = o.y + sg.cy + Math.sin(a) * (sg.R + sg.r) / 2;
      return `<div class="vh" data-v="ring" style="left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px;border-width:${2 * inv}px" title="اسحب لتغيير النسبة"></div>`;
    }
    g.segs.slice(0, -1).forEach((sg, k) => {
      const a = sg.a1, rr = (sg.R + sg.r) / 2 || sg.R * 0.7;
      const x = o.x + sg.cx + Math.cos(a) * rr, y = o.y + sg.cy + Math.sin(a) * rr;
      h += `<div class="vh" data-v="seg" data-k="${k}" style="left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px;border-width:${2 * inv}px" title="اسحب لتغيير الحصص"></div>`;
    });
    return h;
  }
  const pts = g.bars.length ? g.bars.map(b => ({ si: b.si, ci: b.ci, x: b.horiz ? b.end : b.x + b.w / 2, y: b.horiz ? b.y + b.h / 2 : b.end, horiz: b.horiz })) : g.pts;
  for (const p of pts) h += `<div class="vh" data-v="bar" data-si="${p.si}" data-ci="${p.ci}" style="left:${o.x + p.x - r}px;top:${o.y + p.y - r}px;width:${r * 2}px;height:${r * 2}px;border-width:${2 * inv}px;cursor:${p.horiz ? 'ew' : 'ns'}-resize" title="اسحب لتغيير القيمة"></div>`;
  return h;
}

/* ---------- pointer interactions ---------- */
let drag = null;
function onDown(e) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  if (Ed.editing) { if (e.target.closest('.pm-text.editing')) return; Ed.endEdit(); }
  const t = e.target;
  const p = pt(e);
  // value handles (charts / bars)
  if (t.classList.contains('vh')) { startValueDrag(e, t, p); return; }
  if (t.classList.contains('hdl')) { startResize(e, t.dataset.h, p); return; }
  const o = hit(e);
  if (!o) {
    if (!(e.shiftKey || e.ctrlKey || e.metaKey)) ST.sel.clear();
    Ed.marquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, add: new Set(ST.sel) };
    drag = { kind: 'marq' };
    capture(e);
    Ed.drawOverlay(); PM.emit('sel');
    return;
  }
  if (Ed.painter) { const f = Ed.painter; Ed.painter = null; document.body.classList.remove('painting'); f(o); return; }
  // image focus mode: drag inside the frame to move the photo
  if (Ed.tool === 'focus' && o.t === 'image' && ST.sel.has(o.id)) { startFocus(e, o, p); return; }
  if (e.shiftKey || e.ctrlKey || e.metaKey) { if (ST.sel.has(o.id)) ST.sel.delete(o.id); else ST.sel.add(o.id); }
  else if (!ST.sel.has(o.id)) { ST.sel.clear(); ST.sel.add(o.id); }
  const sel = selected();
  drag = { kind: 'move', p0: p, start: sel.map(s => ({ id: s.id, x: s.x, y: s.y })), moved: false, shift: e.shiftKey };
  capture(e);
  Ed.drawOverlay(); PM.emit('sel');
}
function capture(e) {
  Ed.frame.setPointerCapture(e.pointerId);
  Ed.frame.onpointermove = onMove;
  Ed.frame.onpointerup = onUp;
  Ed.frame.onpointercancel = onUp;
}
function onMove(e) {
  if (!drag) return;
  const p = pt(e);
  if (drag.kind === 'marq') {
    const m = Ed.marquee; m.x1 = p.x; m.y1 = p.y;
    const r = { x: Math.min(m.x0, m.x1), y: Math.min(m.y0, m.y1), w: Math.abs(m.x1 - m.x0), h: Math.abs(m.y1 - m.y0) };
    ST.sel = new Set(m.add);
    if (r.w > 3 || r.h > 3) for (const o of slide().objs) if (selectable(o) && o.x < r.x + r.w && o.x + o.w > r.x && o.y < r.y + r.h && o.y + o.h > r.y && !(o.w > W * 0.95 && o.h > H * 0.95)) ST.sel.add(o.id);
    Ed.drawOverlay();
    return;
  }
  if (drag.kind === 'move') {
    let dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
    if (!drag.moved && Math.hypot(dx, dy) * Ed.scale < 3) return;
    drag.moved = true;
    if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
    const ids = new Set(drag.start.map(s => s.id));
    const b0 = bounds(drag.start.map(s => Object.assign({}, objById(s.id), { x: s.x, y: s.y })));
    const sn = snap({ x: b0.x + dx, y: b0.y + dy, w: b0.w, h: b0.h }, ids, e.altKey);
    dx += sn.dx; dy += sn.dy;
    for (const s of drag.start) { const o = objById(s.id); if (o.pin) continue; o.x = s.x + dx; o.y = s.y + dy; const el = elFor(o.id); if (el) { el.style.left = o.x + 'px'; el.style.top = o.y + 'px'; } }
    Ed.drawOverlay(sn.guides);
    return;
  }
  if (drag.kind === 'resize') return doResize(e, p);
  if (drag.kind === 'value') return doValue(e, p);
  if (drag.kind === 'focus') return doFocus(e, p);
}
function onUp(e) {
  Ed.frame.onpointermove = null; Ed.frame.onpointerup = null;
  const d = drag; drag = null;
  if (!d) return;
  if (d.kind === 'marq') { Ed.marquee = null; Ed.drawOverlay(); PM.emit('sel'); return; }
  if (d.kind === 'move' && d.moved) { slide().edited = true; PM.commit('move'); Ed.drawOverlay(); PM.emit('change'); return; }
  if (d.kind === 'move' && !d.moved) {
    // clicking an already-selected item in a group picks just that one
    const o = hit(e);
    if (o && !(e.shiftKey || e.ctrlKey || e.metaKey) && ST.sel.size > 1 && d.start.length > 1) { ST.sel.clear(); ST.sel.add(o.id); Ed.drawOverlay(); PM.emit('sel'); }
    return;
  }
  if (d.kind === 'resize' || d.kind === 'focus') { slide().edited = true; PM.commit(d.kind); Ed.render(); PM.emit('change'); return; }
  if (d.kind === 'value') { PM.commit('value'); Ed.render(); PM.emit('change'); return; }
}

/* ---------- smart guides ---------- */
function snap(b, ids, off) {
  if (off) return { dx: 0, dy: 0, guides: [] };
  const th = SNAP / Ed.scale;
  const xs = [0, W / 2, W, PM.G.X0, PM.G.X1], ys = [0, H / 2, H, PM.G.TOP, PM.G.BOT];
  for (const o of slide().objs) {
    if (ids.has(o.id) || !selectable(o) || o.hidden) continue;
    if (o.w > W * 0.9 && o.h > H * 0.9) continue;
    xs.push(o.x, o.x + o.w / 2, o.x + o.w); ys.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  const cand = (pos, list) => { let best = null; for (const p of pos) for (const t of list) { const d = t - p.v; if (Math.abs(d) <= th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t }; } return best; };
  const bx = cand([{ v: b.x }, { v: b.x + b.w / 2 }, { v: b.x + b.w }], xs);
  const by = cand([{ v: b.y }, { v: b.y + b.h / 2 }, { v: b.y + b.h }], ys);
  const guides = [];
  if (bx) guides.push({ v: bx.t }); if (by) guides.push({ h: by.t });
  return { dx: bx ? bx.d : 0, dy: by ? by.d : 0, guides };
}

/* ---------- resize ---------- */
function startResize(e, dir, p) {
  const o = selected()[0]; if (!o) return;
  drag = { kind: 'resize', dir, p0: p, o0: JSON.parse(JSON.stringify(o)), id: o.id };
  capture(e);
}
function doResize(e, p) {
  const o = objById(drag.id), o0 = drag.o0, d = drag.dir;
  let dx = p.x - drag.p0.x, dy = p.y - drag.p0.y;
  let x = o0.x, y = o0.y, w = o0.w, h = o0.h;
  if (d.includes('e')) w = o0.w + dx; if (d.includes('w')) { w = o0.w - dx; x = o0.x + dx; }
  if (d.includes('s')) h = o0.h + dy; if (d.includes('n')) { h = o0.h - dy; y = o0.y + dy; }
  const keep = e.shiftKey || o.t === 'icon' || o.t === 'logo' || (o.t === 'text' && d.length === 2) || (o.t === 'chart' && o.ring);
  if (keep && d.length === 2) {
    // project the pointer onto the box diagonal: smooth for long thin boxes too
    const sx = d.includes('w') ? -1 : 1, sy = d.includes('n') ? -1 : 1;
    const k = Math.max(0.15, 1 + (dx * sx * o0.w + dy * sy * o0.h) / (o0.w * o0.w + o0.h * o0.h));
    w = o0.w * k; h = o0.h * k;
    if (d.includes('w')) x = o0.x + o0.w - w; if (d.includes('n')) y = o0.y + o0.h - h;
  }
  w = Math.max(o.t === 'line' ? 0 : 8, w); h = Math.max(o.t === 'line' ? 0 : 8, h);
  if (o.t === 'line') { if (Math.abs(o0.h) < 1) h = 0; else w = 0; }
  // edge snapping for the moving sides
  if (!e.altKey) {
    const th = SNAP / Ed.scale, ids = new Set([o.id]);
    const sn = snap({ x: d.includes('w') ? x : x + w, y: d.includes('n') ? y : y + h, w: 0, h: 0 }, ids);
    if (sn.dx) { if (d.includes('w')) { x += sn.dx; w -= sn.dx; } else if (d.includes('e')) w += sn.dx; }
    if (sn.dy) { if (d.includes('n')) { y += sn.dy; h -= sn.dy; } else if (d.includes('s')) h += sn.dy; }
    drag.guides = sn.guides; void th;
  }
  o.x = x; o.y = y; o.w = w; o.h = h;
  if (o.t === 'text' && d.length === 2 && keep) {
    const k = w / o0.w;
    o.paras.forEach((pp, i) => { const q = o0.paras[i]; pp.size = Math.max(5, Math.round(q.size * k * 4) / 4); pp.sb = (q.sb || 0) * k; pp.sa = (q.sa || 0) * k; });
  }
  if (o.t === 'text' && d.length === 1 && (d === 'e' || d === 'w')) o.h = Math.max(o.h, PM.blockH(o.paras, o.w) + 1);
  Ed.refreshObj(o);
  Ed.drawOverlay(drag.guides);
}

/* ---------- image focus (pan inside the frame) ---------- */
function startFocus(e, o, p) { drag = { kind: 'focus', id: o.id, p0: p, fx: o.fx, fy: o.fy }; capture(e); }
function doFocus(e, p) {
  const o = objById(drag.id);
  const a = ST.deck.assets[o.src];
  const sz = a && a.size ? a.size : { w: 1600, h: 1000 };
  const ar = sz.w / sz.h, br = o.w / o.h, z = o.zoom || 1;
  const dispW = ar > br ? o.h * ar * z : o.w * z, dispH = ar > br ? o.h * z : o.w / ar * z;
  const ex = Math.max(1, dispW - o.w), ey = Math.max(1, dispH - o.h);
  o.fx = PM.clamp(drag.fx - (p.x - drag.p0.x) / ex, 0, 1);
  o.fy = PM.clamp(drag.fy - (p.y - drag.p0.y) / ey, 0, 1);
  Ed.refreshObj(o);
}

/* ---------- live chart values ---------- */
function niceRound(v, max) {
  const step = Math.pow(10, Math.floor(Math.log10(Math.max(1e-9, Math.abs(max)))) - 2);
  return Math.round(v / step) * step;
}
function startValueDrag(e, t, p) {
  const o = selected()[0]; if (!o) return;
  drag = { kind: 'value', id: o.id, v: t.dataset.v, si: +t.dataset.si || 0, ci: +t.dataset.ci || 0, k: +t.dataset.k || 0, p0: p, o0: JSON.parse(JSON.stringify(o)) };
  capture(e);
}
function doValue(e, p) {
  const o = objById(drag.id);
  const s = slide();
  if (drag.v === 'pct') {
    // KPI progress bar: width = value %
    const track = s.objs.find(x => x.name === 'Track' && Math.abs(x.y - o.y) < 1);
    const tx0 = track ? track.x : o.x, tw = track ? track.w : PM.G.CW;
    const rtl = ST.deck.lang !== 'en';
    let v = rtl ? (tx0 + tw - p.x) / tw * 100 : (p.x - tx0) / tw * 100;
    v = Math.round(PM.clamp(v, 0, 100));
    o.w = Math.max(10, tw * v / 100); if (rtl) o.x = tx0 + tw - o.w;
    setVal(o.pctOf, v + '%');
    Ed.refreshObj(o); Ed.drawOverlay(); return;
  }
  const g = PM.chartGeom(o);
  const lp = { x: p.x - o.x, y: p.y - o.y };
  if (drag.v === 'bar') {
    const horiz = !!(g.plot && g.plot.horiz);
    let v = g.p2v(horiz ? lp.x : lp.y);
    const mx = Math.max(...o.series.flatMap(x => x.vals.map(Math.abs)), 1);
    v = Math.max(g.min, niceRound(v, mx));
    if (o.dec == null && Math.abs(v) >= 10) v = Math.round(v);
    o.series[drag.si].vals[drag.ci] = +v.toFixed(o.dec != null ? o.dec : (Math.abs(v) < 10 ? 1 : 0));
  } else if (drag.v === 'ring') {
    const sg = g.segs[0];
    let a = Math.atan2(lp.y - sg.cy, lp.x - sg.cx) + Math.PI / 2; if (a < 0) a += Math.PI * 2;
    const v = Math.round(a / (Math.PI * 2) * 100);
    o.series[0].vals = [v, 100 - v];
    if (o.ringOf) setVal(o.ringOf, v + '%');
  } else if (drag.v === 'seg') {
    const k = drag.k, vals = o.series[0].vals.map(Number), sum = vals.reduce((a, b) => a + b, 0);
    const sg = g.segs[k];
    let a = Math.atan2(lp.y - sg.cy, lp.x - sg.cx) + Math.PI / 2; if (a < 0) a += Math.PI * 2;
    const start = g.segs[k].a0 + Math.PI / 2, end = g.segs[k + 1].a1 + Math.PI / 2;
    a = PM.clamp(a, start + 0.02, end - 0.02);
    const pair = vals[k] + vals[k + 1];
    const nv = (a - start) / (end - start) * pair;
    vals[k] = +nv.toFixed(o.dec || (sum <= 100 ? 0 : 1)); vals[k + 1] = +(pair - vals[k]).toFixed(o.dec || (sum <= 100 ? 0 : 1));
    o.series[0].vals = vals;
  }
  if (o.bind && !o.ring) syncChart(o);
  Ed.refreshObj(o);
  Ed.drawOverlay();
  PM.emit('chartlive', o);
}
/* chart data back into the spec, plus any text that shows the same values */
function syncChart(o) {
  const s = slide();
  const cur = PM.getPath(s.spec, o.bind);
  const data = { kind: cur && cur.kind || o.kind, cats: o.cats.slice(), series: o.series.map(x => ({ name: x.name, vals: x.vals.slice() })), unit: o.unit, pre: o.pre, dec: o.dec };
  PM.setPath(s.spec, o.bind, data);
}
Ed.syncChart = syncChart;
function setVal(path, v) {
  const s = slide();
  PM.writeBind(s.spec, path, v);
  for (const t of s.objs) if (t.t === 'text') { let ch = false; t.paras.forEach(p => { if (p.bind === path) { p.t = v; ch = true; } }); if (ch) Ed.refreshObj(t); }
}

/* ---------- inline text editing ---------- */
function onDbl(e) {
  const o = hit(e);
  if (!o) return;
  if (o.t === 'text') return Ed.startEdit(o);
  if (o.t === 'chart' || o.t === 'table') return PM.emit('editdata', o);
  if (o.t === 'image') return PM.emit('replaceimage', o);
  if (o.t === 'icon') return PM.emit('changeicon', o);
}
Ed.startEdit = function (o, selectAll) {
  if (Ed.editing) Ed.endEdit();
  ST.sel.clear(); ST.sel.add(o.id);
  const el = elFor(o.id); if (!el) return;
  const inner = el.querySelector('.pmt');
  el.classList.add('editing');
  inner.contentEditable = 'true';
  inner.spellcheck = false;
  Ed.editing = { id: o.id, el, inner, before: JSON.stringify(o.paras) };
  Ed.drawOverlay();
  inner.focus();
  const r = document.createRange();
  if (selectAll) r.selectNodeContents(inner); else { r.selectNodeContents(inner); r.collapse(false); }
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  inner.addEventListener('input', growWhileTyping);
  inner.addEventListener('keydown', editKeys);
  inner.addEventListener('paste', plainPaste);
  PM.emit('editing', o);
};
function plainPaste(e) {
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, t);
}
function growWhileTyping() {
  const ed = Ed.editing; if (!ed) return;
  const o = objById(ed.id);
  const h = ed.inner.scrollHeight;
  if (h > o.h) { o.h = h; ed.el.style.height = h + 'px'; Ed.drawOverlay(); }
}
function editKeys(e) {
  if (e.key === 'Escape') { e.preventDefault(); Ed.endEdit(); }
  e.stopPropagation();
}
Ed.endEdit = function () {
  const ed = Ed.editing; if (!ed) return;
  Ed.editing = null;
  const o = objById(ed.id);
  ed.inner.contentEditable = 'false';
  ed.el.classList.remove('editing');
  if (!o) return Ed.render();
  // read paragraphs back
  const lines = [];
  const kids = [...ed.inner.childNodes];
  for (const k of kids) {
    if (k.nodeType === 3) { if (k.textContent.trim()) lines.push(k.textContent); continue; }
    if (k.classList && k.classList.contains('pmp')) lines.push(PM.readRich(k).replace(/\n+$/, ''));
    else lines.push(PM.readRich(k));
  }
  const flat = [];
  lines.forEach(l => String(l).split('\n').forEach(x => flat.push(x)));
  const texts = flat.map(t => t.replace(/\s+$/g, ''));
  while (texts.length > 1 && !PM.plain(texts[texts.length - 1]).trim()) texts.pop();
  const s = slide();
  const old = o.paras;
  if (o.joinBind) {
    const bind = old[0] && old[0].bind;
    o.paras = [Object.assign({}, old[old.length - 1], { t: texts.join(' ').trim() })];
    if (bind) PM.writeBind(s.spec, bind, o.paras[0].t);
  } else {
    const nu = texts.map((t, i) => Object.assign({}, old[Math.min(i, old.length - 1)] || old[0], { t, bind: i < old.length ? old[i].bind : null }));
    // a list of bound bullets that grew or shrank rewrites the list
    const listM = old.length && old.every(p => p.bind && /^blocks\.\d+\.items\.\d+(\.text)?$/.test(p.bind) && p.bind.split('.')[1] === old[0].bind.split('.')[1]);
    if (listM && nu.length !== old.length) {
      const bi = +old[0].bind.split('.')[1];
      const blk = s.spec.blocks[bi];
      if (blk && Array.isArray(blk.items) && blk.items.every(x => typeof x === 'string')) {
        blk.items = texts.filter(t => t.trim());
        nu.forEach((p, i) => p.bind = 'blocks.' + bi + '.items.' + i);
      }
    }
    o.paras = nu.filter((p, i) => PM.plain(p.t).trim() || i === 0);
    o.paras.forEach(p => { if (p.bind) PM.writeBind(s.spec, p.bind, p.t); });
    if (o.paras.some(p => !p.bind)) s.edited = true;
  }
  o.h = o.autoH ? PM.blockH(o.paras, o.w) + 1 : Math.max(o.h, PM.blockH(o.paras, o.w) + 1);
  o.overflow = false; delete o.base;
  if (JSON.stringify(o.paras) !== ed.before) PM.commit('text');
  Ed.render();
  PM.emit('change');
};

/* ---------- keyboard ---------- */
function typing(e) { const t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
function onKey(e) {
  if (!ST.deck || typing(e) || PM.UI && PM.UI.modalOpen && PM.UI.modalOpen()) return;
  const mod = e.ctrlKey || e.metaKey;
  const sel = selected();
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) PM.redo(); else PM.undo(); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); PM.redo(); return; }
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); PM.emit('save'); return; }
  if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); ST.sel = new Set(slide().objs.filter(o => selectable(o)).map(o => o.id)); Ed.drawOverlay(); PM.emit('sel'); return; }
  if (mod && e.key.toLowerCase() === 'c' && sel.length) { e.preventDefault(); Ed.clip = JSON.stringify(sel); return; }
  if (mod && e.key.toLowerCase() === 'x' && sel.length) { e.preventDefault(); Ed.clip = JSON.stringify(sel); Ed.del(); return; }
  if (mod && e.key.toLowerCase() === 'v' && Ed.clip) { e.preventDefault(); Ed.pasteObjs(JSON.parse(Ed.clip)); return; }
  if (mod && e.key.toLowerCase() === 'd' && sel.length) { e.preventDefault(); Ed.pasteObjs(JSON.parse(JSON.stringify(sel))); return; }
  if (!sel.length) {
    if (e.key === 'ArrowRight' || e.key === 'PageUp') { PM.emit('go', ST.deck.lang === 'en' ? 1 : -1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageDown') { PM.emit('go', ST.deck.lang === 'en' ? -1 : 1); }
    if (e.key === 'ArrowDown') PM.emit('go', 1);
    if (e.key === 'ArrowUp') PM.emit('go', -1);
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); Ed.del(); return; }
  if (e.key === 'Escape') { ST.sel.clear(); Ed.drawOverlay(); PM.emit('sel'); return; }
  if (e.key === 'Enter' && sel.length === 1 && sel[0].t === 'text') { e.preventDefault(); Ed.startEdit(sel[0], true); return; }
  const st = e.shiftKey ? 10 : 1;
  const mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
  if (mv) { e.preventDefault(); sel.forEach(o => { o.x += mv[0]; o.y += mv[1]; }); slide().edited = true; Ed.render(); clearTimeout(Ed.nudgeT); Ed.nudgeT = setTimeout(() => PM.commit('nudge'), 400); PM.emit('change'); return; }
  if (e.key === ']' ) { Ed.zorder(mod ? 'front' : 'up'); return; }
  if (e.key === '[') { Ed.zorder(mod ? 'back' : 'down'); return; }
}
Ed.del = function () {
  const s = slide(); const ids = ST.sel;
  s.objs = s.objs.filter(o => !ids.has(o.id) || o.lock);
  ST.sel = new Set(); s.edited = true;
  PM.commit('delete'); Ed.render(); PM.emit('change'); PM.emit('sel');
};
Ed.pasteObjs = function (list) {
  const s = slide();
  ST.sel.clear();
  for (const o of list) { const n = JSON.parse(JSON.stringify(o)); n.id = PM.uid(); n.x += 14; n.y += 14; n.lock = false; if (n.t === 'text') n.paras.forEach(p => p.bind = null); s.objs.push(n); ST.sel.add(n.id); }
  s.edited = true; PM.commit('paste'); Ed.render(); PM.emit('change'); PM.emit('sel');
};
Ed.zorder = function (how) {
  const s = slide(); const ids = ST.sel;
  const sel = s.objs.filter(o => ids.has(o.id)), rest = s.objs.filter(o => !ids.has(o.id));
  if (how === 'front') s.objs = [...rest, ...sel];
  else if (how === 'back') { const bg = rest.filter(o => o.role === 'bg' || o.role === 'tplbg'); const other = rest.filter(o => !(o.role === 'bg' || o.role === 'tplbg')); s.objs = [...bg, ...sel, ...other]; }
  else {
    const arr = s.objs.slice();
    const idx = sel.map(o => arr.indexOf(o)).sort((a, b) => how === 'up' ? b - a : a - b);
    for (const i of idx) { const j = how === 'up' ? i + 1 : i - 1; if (j < 0 || j >= arr.length || ids.has(arr[j].id) || (how === 'down' && (arr[j].role === 'bg' || arr[j].role === 'tplbg'))) continue; [arr[i], arr[j]] = [arr[j], arr[i]]; }
    s.objs = arr;
  }
  s.edited = true; PM.commit('z'); Ed.render(); PM.emit('change');
};
/* align / distribute the selection (or one object to the slide) */
Ed.align = function (how) {
  const sel = selected(); if (!sel.length) return;
  const b = sel.length > 1 ? bounds(sel) : { x: PM.G.X0, y: PM.G.TOP, w: PM.G.CW, h: PM.G.BOT - PM.G.TOP };
  for (const o of sel) {
    if (how === 'l') o.x = b.x; if (how === 'r') o.x = b.x + b.w - o.w; if (how === 'c') o.x = b.x + (b.w - o.w) / 2;
    if (how === 't') o.y = b.y; if (how === 'b') o.y = b.y + b.h - o.h; if (how === 'm') o.y = b.y + (b.h - o.h) / 2;
  }
  if ((how === 'dh' || how === 'dv') && sel.length > 2) {
    const k = how === 'dh' ? 'x' : 'y', d = how === 'dh' ? 'w' : 'h';
    const s = sel.slice().sort((a, c) => a[k] - c[k]);
    const total = s.reduce((a, o) => a + o[d], 0), span = s[s.length - 1][k] + s[s.length - 1][d] - s[0][k];
    const gap = (span - total) / (s.length - 1);
    let cur = s[0][k];
    for (const o of s) { o[k] = cur; cur += o[d] + gap; }
  }
  slide().edited = true; PM.commit('align'); Ed.render(); PM.emit('change');
};

/* ---------- drop: images, icons, photos from panels ---------- */
async function onDrop(e) {
  e.preventDefault();
  Ed.frame.classList.remove('drop-on');
  if (!ST.deck) return;
  const p = pt(e);
  const target = hit(e);
  const dt = e.dataTransfer;
  const icon = dt.getData('application/x-pm-icon');
  const asset = dt.getData('application/x-pm-asset');
  if (icon) { placeIcon(icon, p, target); return; }
  if (asset) { placeImage(asset, p, target); return; }
  const files = [...(dt.files || [])];
  if (!files.length) return;
  const f = files[0];
  if (/\.(pptx|docx|json)$/i.test(f.name)) { PM.emit('importfile', f); return; }
  const imgs = files.filter(x => /^image\//.test(x.type) || /\.(png|jpe?g|webp|gif)$/i.test(x.name));
  for (let i = 0; i < imgs.length; i++) {
    const id = await PM.assetFromFile(imgs[i]);
    placeImage(id, { x: p.x + i * 20, y: p.y + i * 20 }, i === 0 ? target : null);
  }
}
PM.assetFromFile = async function (file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let ext = (file.type.split('/')[1] || file.name.split('.').pop() || 'png').toLowerCase();
  if (ext === 'jpg') ext = 'jpeg';
  if (ext === 'webp' || ext === 'gif') { const conv = await PM.toPng(bytes, file.type).catch(() => null); if (conv) return PM.addAssetBytes(ST.deck, conv, 'png'); }
  return PM.addAssetBytes(ST.deck, bytes, ext);
};
/* PowerPoint cannot show webp: convert through a canvas */
PM.toPng = function (bytes, type) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); c.toBlob(b => b ? b.arrayBuffer().then(a => res(new Uint8Array(a))) : rej(), 'image/png'); };
    img.onerror = rej;
    img.src = URL.createObjectURL(new Blob([bytes], { type }));
  });
};
function placeImage(id, p, target) {
  const s = slide();
  if (target && target.t === 'image') {
    target.src = id; target.fx = 0.5; target.fy = 0.5; target.zoom = 1;
    if (target.bindImg) { const i = +target.bindImg.split('.')[1]; s.spec.imgs = s.spec.imgs || []; s.spec.imgs[i] = id; }
    ST.sel.clear(); ST.sel.add(target.id);
  } else {
    const a = ST.deck.assets[id]; const sz = a.size || { w: 1600, h: 1000 };
    const w = Math.min(420, sz.w), h = w * sz.h / sz.w;
    const o = PM.Img(PM.clamp(p.x - w / 2, 0, W - w), PM.clamp(p.y - h / 2, 0, H - h), w, h, id, {});
    o.free = true;
    s.objs.push(o); ST.sel.clear(); ST.sel.add(o.id); s.edited = true;
  }
  PM.commit('image'); Ed.render(); PM.emit('change'); PM.emit('sel');
}
Ed.placeImage = placeImage;
function placeIcon(icon, p, target) {
  const s = slide();
  if (target && target.t === 'icon') {
    target.icon = icon;
    if (target.bind) PM.writeBind(s.spec, target.bind, icon);
    ST.sel.clear(); ST.sel.add(target.id);
  } else {
    const o = PM.Ic(p.x - 24, p.y - 24, 48, icon, ST.deck.dark || (s.tone === 'dark') ? PM.K.SKY : PM.K.BLUE, {});
    s.objs.push(o); ST.sel.clear(); ST.sel.add(o.id); s.edited = true;
  }
  PM.commit('icon'); Ed.render(); PM.emit('change'); PM.emit('sel');
}
Ed.placeIcon = placeIcon;
async function onPaste(e) {
  if (!ST.deck || typing(e)) return;
  const items = [...(e.clipboardData && e.clipboardData.items || [])].filter(i => i.type.startsWith('image/'));
  if (!items.length) return;
  e.preventDefault();
  const f = items[0].getAsFile();
  const id = await PM.assetFromFile(f);
  const sel = selected();
  placeImage(id, { x: W / 2, y: H / 2 }, sel.length === 1 && sel[0].t === 'image' ? sel[0] : null);
}
})(window.PM);
