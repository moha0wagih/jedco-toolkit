/* ==========================================================================
   صانع العروض 2 — live charts
   One geometry function feeds the SVG preview, the drag handles in the editor
   and the native PowerPoint chart on export.
   obj: { t:'chart', kind:'col'|'bar'|'line'|'area'|'donut'|'pie'|'stack',
          cats:[], series:[{name, vals:[], color?}], unit, pre, dec,
          vals:true, legend, dark, hi (highlight index or -1), fs }
   ========================================================================== */
(function (PM) {
'use strict';
const K = PM.K;
const PAL_L = ['004EAA', '62B6F3', '002657', '00B2BA', 'A9C7E8', '7A8699'];
const PAL_D = ['62B6F3', 'FFFFFF', '00B2BA', 'A9C7E8', '7FA3D6', '3E7CC9'];
PM.chartPal = o => (o.dark ? PAL_D : PAL_L);
PM.chartColor = (o, si) => (o.series[si] && o.series[si].color) || PM.chartPal(o)[si % 6];
PM.fmtV = function (o, v) {
  const d = o.dec != null ? o.dec : (Math.abs(v) < 10 && Math.round(v) !== v ? 1 : 0);
  const s = Math.abs(v) >= 10000 ? v.toLocaleString('en-US', { maximumFractionDigits: d }) : Number(v).toFixed(d);
  return (o.pre || '') + s + (o.unit ? (o.unit === '%' ? '%' : o.unit.length <= 2 ? o.unit : ' ' + o.unit) : '');
};
function niceMax(m) {
  if (m <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(m)));
  const f = m / p;
  return (f <= 1 ? 1 : f <= 1.2 ? 1.2 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 3 ? 3 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 6 ? 6 : f <= 8 ? 8 : 10) * p;
}
PM.niceMax = niceMax;
/* geometry in the chart's own box (0..w, 0..h) */
PM.chartGeom = function (o) {
  const w = o.w, h = o.h, n = o.cats.length, S = o.series;
  const fs = o.fs || 11;
  const rtl = !!o.rtl && !isTime(o.cats);
  const legend = S.length > 1 && o.legend !== false;
  const g = { w, h, fs, rtl, bars: [], pts: [], segs: [], labels: [], cats: [], legend: [], grid: [] };
  if (o.kind === 'donut' || o.kind === 'pie') {
    const vals = S[0].vals.map(v => Math.max(0, +v || 0));
    const sum = vals.reduce((a, b) => a + b, 0) || 1;
    const noLeg = o.legend === false;
    const legW = noLeg ? 0 : Math.min(w * 0.46, 220);
    const size = noLeg ? Math.min(w, h) : Math.min(h - 8, w - legW - 24);
    const cx = noLeg ? w / 2 : (rtl ? w - size / 2 - 4 : size / 2 + 4), cy = h / 2;
    const R = size / 2, r = o.kind === 'donut' ? R * (o.ring ? 0.84 : 0.62) : 0;
    let a = -Math.PI / 2;
    vals.forEach((v, i) => {
      const da = v / sum * Math.PI * 2;
      g.segs.push({ i, a0: a, a1: a + da, cx, cy, R, r, v, pct: v / sum * 100 });
      a += da;
    });
    g.center = { cx, cy, R, r };
    if (noLeg) return g;
    const lx = rtl ? 0 : cx + R + 24, lw = w - size - 28;
    const rowH = Math.min(fs * 2.4, h / Math.max(1, n));
    const ly = cy - rowH * n / 2;
    o.cats.forEach((c, i) => g.legend.push({ i, x: lx, y: ly + i * rowH, w: lw, h: rowH, text: c }));
    return g;
  }
  const horiz = o.kind === 'bar';
  const stack = o.kind === 'stack';
  let max = 0, min = 0;
  if (stack) { for (let i = 0; i < n; i++) max = Math.max(max, S.reduce((a, s) => a + Math.max(0, +s.vals[i] || 0), 0)); }
  else S.forEach(s => s.vals.forEach(v => { max = Math.max(max, +v || 0); min = Math.min(min, +v || 0); }));
  const top = niceMax(max * (o.vals !== false ? 1.12 : 1.02));
  g.max = top; g.min = min < 0 ? -niceMax(-min) : 0;
  const legH = legend ? fs * 2.2 : 0;
  if (horiz) {
    const labW = Math.min(w * 0.36, Math.max(...o.cats.map(c => PM.textW(String(c), { font: 'auto' }, fs))) + 14);
    const px0 = rtl ? 8 : labW, px1 = rtl ? w - labW : w - 8;
    const py0 = legH + 4, py1 = h - 4;
    const band = (py1 - py0) / n;
    const bh = band * (S.length > 1 ? 0.72 : 0.58) / S.length;
    g.plot = { x0: px0, x1: px1, y0: py0, y1: py1, horiz: true };
    const v2x = v => rtl ? px1 - (v - g.min) / (top - g.min) * (px1 - px0 - 46) : px0 + (v - g.min) / (top - g.min) * (px1 - px0 - 46);
    g.v2p = v2x; g.p2v = p => g.min + (rtl ? (px1 - p) : (p - px0)) / (px1 - px0 - 46) * (top - g.min);
    for (let i = 0; i < n; i++) {
      const by = py0 + i * band + (band - bh * S.length) / 2;
      g.cats.push({ i, x: rtl ? px1 + 10 : 0, y: py0 + i * band, w: labW - 10, h: band, text: o.cats[i], align: rtl ? 'r' : 'r' });
      S.forEach((s, si) => {
        const v = +s.vals[i] || 0, x0 = v2x(Math.max(0, g.min)), x1 = v2x(v);
        g.bars.push({ si, ci: i, v, x: Math.min(x0, x1), y: by + si * bh, w: Math.abs(x1 - x0), h: bh - 2, end: x1, horiz: true });
      });
    }
  } else {
    const valW = 0;
    const px0 = 6 + valW, px1 = w - 6;
    const catH = fs * (o.cats.some(c => String(c).length > 10) ? 2.7 : 1.7) + 6;
    const py0 = legH + fs * 1.6 + 4, py1 = h - catH;
    g.plot = { x0: px0, x1: px1, y0: py0, y1: py1 };
    const v2y = v => py1 - (v - g.min) / (top - g.min) * (py1 - py0);
    g.v2p = v2y; g.p2v = p => g.min + (py1 - p) / (py1 - py0) * (top - g.min);
    const band = (px1 - px0) / n;
    const order = i => rtl ? n - 1 - i : i;
    const line = o.kind === 'line' || o.kind === 'area';
    const bw = band * (S.length > 1 && !stack ? 0.74 : 0.56) / (stack ? 1 : S.length);
    for (let i = 0; i < n; i++) {
      const bx = px0 + order(i) * band;
      g.cats.push({ i, x: bx, y: py1 + 6, w: band, h: catH - 6, text: o.cats[i] });
      if (line) {
        S.forEach((s, si) => { const v = +s.vals[i] || 0; g.pts.push({ si, ci: i, v, x: bx + band / 2, y: v2y(v) }); });
      } else if (stack) {
        let acc = 0;
        S.forEach((s, si) => { const v = Math.max(0, +s.vals[i] || 0); const y1 = v2y(acc), y0 = v2y(acc + v); g.bars.push({ si, ci: i, v, x: bx + (band - bw) / 2, y: y0, w: bw, h: y1 - y0, end: y0 }); acc += v; });
      } else {
        S.forEach((s, si) => {
          const v = +s.vals[i] || 0, y0 = v2y(Math.max(0, g.min)), y1 = v2y(v);
          const x = bx + (band - bw * S.length) / 2 + (rtl ? S.length - 1 - si : si) * bw;
          g.bars.push({ si, ci: i, v, x: x + 1, y: Math.min(y0, y1), w: bw - 2, h: Math.abs(y1 - y0), end: y1 });
        });
      }
    }
    if (o.grid !== false) for (let k = 1; k <= 4; k++) g.grid.push(v2y(g.min + (top - g.min) * k / 4));
    g.base = v2y(Math.max(0, g.min));
  }
  if (legend) {
    let x = rtl ? w : 0;
    S.forEach((s, si) => { const tw = PM.textW(s.name || ('Series ' + (si + 1)), { font: 'auto' }, fs) + 22; g.legend.push({ si, x: rtl ? x - tw : x, y: 0, w: tw, h: legH, text: s.name || '' }); x += rtl ? -tw - 10 : tw + 10; });
  }
  return g;
};
function isTime(cats) { return cats.length >= 3 && cats.filter(c => /^((19|20)\d\d|Q[1-4]|H[12]|\d{1,2}\/\d{2,4})$/.test(PM.digits(String(c).trim()))).length >= cats.length - 1; }
PM.chartIsTime = isTime;
/* highlight: the single largest value in a one-series chart gets the strong colour */
function hiIndex(o) {
  if (o.hi != null) return o.hi;
  if (o.series.length !== 1 || o.cats.length < 3 || o.kind === 'line' || o.kind === 'area') return -1;
  const v = o.series[0].vals.map(Number), m = Math.max(...v);
  return v.filter(x => x === m).length === 1 ? v.indexOf(m) : -1;
}
PM.chartHi = hiIndex;
const ff = (t) => PM.isAr(t) ? 'SanTaj' : 'SanFSI';
const esc = PM.esc;
/* SVG string for the stage */
PM.chartSVG = function (o) {
  const g = PM.chartGeom(o);
  const fs = g.fs;
  const txt = o.dark ? 'C9D6E8' : '3D4A5C', val = o.dark ? 'FFFFFF' : '002657', grid = o.dark ? '24477A' : 'E3E8EF', axis = o.dark ? '3D5F93' : 'C6D0DC';
  const hi = hiIndex(o);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${g.w} ${g.h}" style="overflow:visible;display:block">`;
  const T = (x, y, t, o2 = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${o2.num ? 'SanSeq' : ff(t)}" font-size="${o2.fs || fs}" fill="#${o2.fill || txt}" text-anchor="${o2.anchor || 'middle'}" ${o2.bold ? 'font-weight="700"' : ''} dominant-baseline="${o2.base || 'alphabetic'}">${esc(t)}</text>`;
  if (o.kind === 'donut' || o.kind === 'pie') {
    const vals = g.segs;
    vals.forEach(sg => {
      const col = (o.series[0].colors && o.series[0].colors[sg.i]) || PM.chartPal(o)[sg.i % 6];
      s += `<path d="${arcPath(sg)}" fill="#${col}" ${o.ring ? '' : `stroke="#${o.dark ? '002657' : 'FFFFFF'}" stroke-width="2"`}/>`;
    });
    if (o.kind === 'donut' && o.center !== false) {
      const big = vals.reduce((a, b) => b.v > a.v ? b : a, vals[0] || { pct: 0 });
      s += T(g.center.cx, g.center.cy + fs * 0.4, Math.round(big.pct) + '%', { num: true, fs: fs * 1.9, fill: val });
    }
    g.legend.forEach(l => {
      const col = (o.series[0].colors && o.series[0].colors[l.i]) || PM.chartPal(o)[l.i % 6];
      const sg = vals[l.i];
      const sw = 10, rtl = g.rtl;
      const sx = rtl ? l.x + l.w - sw : l.x;
      s += `<rect x="${sx}" y="${l.y + l.h / 2 - sw / 2}" width="${sw}" height="${sw}" rx="2.5" fill="#${col}"/>`;
      s += T(rtl ? sx - 8 : sx + sw + 8, l.y + l.h / 2 + fs * 0.36, l.text, { anchor: rtl ? 'end' : 'start' });
      s += T(rtl ? l.x : l.x + l.w, l.y + l.h / 2 + fs * 0.36, PM.fmtV(o, sg.v), { anchor: rtl ? 'start' : 'end', num: true, fill: val, fs: fs * 0.95 });
    });
    return s + '</svg>';
  }
  g.grid.forEach(y => { s += `<line x1="${g.plot.x0}" x2="${g.plot.x1}" y1="${y}" y2="${y}" stroke="#${grid}" stroke-width="0.75"/>`; });
  if (!g.plot.horiz) s += `<line x1="${g.plot.x0}" x2="${g.plot.x1}" y1="${g.base}" y2="${g.base}" stroke="#${axis}" stroke-width="1"/>`;
  const line = o.kind === 'line' || o.kind === 'area';
  if (line) {
    o.series.forEach((ser, si) => {
      const pts = g.pts.filter(p => p.si === si).sort((a, b) => a.x - b.x);
      const col = PM.chartColor(o, si);
      if (o.kind === 'area' && pts.length) s += `<path d="M${pts[0].x},${g.base} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${pts[pts.length - 1].x},${g.base} Z" fill="#${col}" fill-opacity="0.16"/>`;
      s += `<polyline points="${pts.map(p => p.x + ',' + p.y).join(' ')}" fill="none" stroke="#${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
      pts.forEach(p => { s += `<circle cx="${p.x}" cy="${p.y}" r="4.2" fill="#${o.dark ? '002657' : 'FFFFFF'}" stroke="#${col}" stroke-width="2.2"/>`; if (o.vals !== false) s += T(p.x, p.y - 10, PM.fmtV(o, p.v), { num: true, fill: val, fs: fs * 0.92 }); });
    });
  } else {
    const soft = o.dark ? '3E6BA8' : 'B8CDE6';
    g.bars.forEach(b => {
      let col = PM.chartColor(o, b.si);
      if (hi >= 0) col = b.ci === hi ? (o.dark ? K.SKY : K.BLUE) : soft;
      const r = Math.min(4, b.w / 2, b.h / 2);
      if (b.horiz) s += `<path d="${roundBar(b, r, true, g.rtl)}" fill="#${col}"/>`;
      else s += `<path d="${roundBar(b, r, false)}" fill="#${col}"/>`;
      if (o.vals !== false && o.kind !== 'stack') {
        if (b.horiz) s += T(g.rtl ? b.x - 6 : b.x + b.w + 6, b.y + b.h / 2 + fs * 0.36, PM.fmtV(o, b.v), { num: true, fill: val, anchor: g.rtl ? 'end' : 'start', fs: fs * 0.95 });
        else s += T(b.x + b.w / 2, b.end - 7, PM.fmtV(o, b.v), { num: true, fill: val, fs: fs * (o.series.length > 2 ? 0.8 : 0.95) });
      }
      if (o.kind === 'stack' && o.vals !== false && b.h > fs * 1.4) s += T(b.x + b.w / 2, b.y + b.h / 2 + fs * 0.36, PM.fmtV(o, b.v), { num: true, fill: 'FFFFFF', fs: fs * 0.85 });
    });
  }
  g.cats.forEach(cl => {
    if (g.plot.horiz) s += T(g.rtl ? cl.x : cl.w, cl.y + cl.h / 2 + fs * 0.36, cl.text, { anchor: g.rtl ? 'start' : 'end' });
    else {
      const lines = PM.wrap(String(cl.text), { font: 'auto' }, fs, cl.w - 4).slice(0, 2);
      lines.forEach((ln, k) => { s += T(cl.x + cl.w / 2, cl.y + fs + k * fs * 1.25, ln); });
    }
  });
  g.legend.forEach(l => {
    const col = PM.chartColor(o, l.si);
    s += `<rect x="${g.rtl ? l.x + l.w - 10 : l.x}" y="${l.h / 2 - 5}" width="10" height="10" rx="2.5" fill="#${col}"/>`;
    s += T(g.rtl ? l.x + l.w - 16 : l.x + 16, l.h / 2 + fs * 0.36, l.text, { anchor: g.rtl ? 'end' : 'start' });
  });
  return s + '</svg>';
};
function roundBar(b, r, horiz, rtl) {
  const { x, y, w, h } = b;
  if (h <= 0.5 || w <= 0.5) return `M${x},${y}h${w}v${h}h${-w}Z`;
  if (!horiz) return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
  if (rtl) return `M${x + w},${y} L${x + r},${y} Q${x},${y} ${x},${y + r} L${x},${y + h - r} Q${x},${y + h} ${x + r},${y + h} L${x + w},${y + h} Z`;
  return `M${x},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x},${y + h} Z`;
}
function arcPath(s) {
  const { cx, cy, R, r } = s;
  let a0 = s.a0, a1 = s.a1;
  if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
  const p = (a, rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R);
  if (!r) return `M${cx},${cy} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} Z`;
  const [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
  return `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`;
}
PM.arcPath = arcPath;
/* chart object builder */
PM.Chart = function (x, y, w, h, ch, o = {}) {
  const decOf = v => { const s = String(v); return s.includes('.') ? Math.min(2, s.split('.')[1].length) : 0; };
  const dec = ch.dec != null ? ch.dec : Math.max(0, ...ch.series.flatMap(s => s.vals.map(decOf)));
  return Object.assign({ t: 'chart', id: PM.uid(), x, y, w, h, kind: ch.kind || 'col', cats: ch.cats.slice(), series: ch.series.map(s => ({ name: s.name || '', vals: s.vals.map(Number), color: s.color, colors: s.colors })), unit: ch.unit || '', pre: ch.pre || '', dec, vals: true, dark: !!o.dark, rtl: !!o.rtl, fs: o.fs || 11, name: 'Chart', bind: o.bind || 'main.chart' }, o.extra || {});
};
/* table renderer */
PM.tableHTML = function (o) {
  const rows = o.rows || [];
  const n = Math.max(...rows.map(r => r.length));
  const fs = o.fs || 11;
  const dark = !!o.dark;
  const head = dark ? 'FFFFFF' : '002657', body = dark ? 'D5E0EE' : '3D4A5C', line = dark ? '24477A' : 'DDE3EA', accent = dark ? '62B6F3' : '004EAA';
  const rtl = !!o.rtl;
  const rh = o.h / rows.length;
  let s = `<table dir="${rtl ? 'rtl' : 'ltr'}" style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed">`;
  rows.forEach((r, ri) => {
    s += `<tr style="height:${rh}px">`;
    for (let c = 0; c < n; c++) {
      const t = r[c] == null ? '' : String(r[c]);
      const isHead = ri === 0 && o.header !== false;
      const numeric = !!PM.numInfo(t);
      const fill = isHead && o.style === 'fill' ? `background:#${dark ? '0F3B78' : '004EAA'};` : (o.style === 'zebra' && ri % 2 === 0 && ri > 0 ? `background:#${dark ? '0A2E61' : 'F3F6FA'};` : '');
      const col = isHead ? (o.style === 'fill' ? 'FFFFFF' : head) : (c === 0 ? head : body);
      const bb = isHead ? `border-bottom:1.5px solid #${accent};` : (ri === rows.length - 1 ? '' : `border-bottom:0.75px solid #${line};`);
      const fam = numeric ? 'SanSeq' : (PM.isAr(t) ? 'SanTaj' : 'SanFSI');
      s += `<td style="${fill}${bb}padding:0 ${fs * 0.7}px;font-family:${fam};font-size:${numeric ? fs * 0.9 : fs}px;color:#${col};font-weight:${isHead || (c === 0 && !numeric) ? 700 : 400};text-align:${numeric && c > 0 ? 'center' : (rtl ? 'right' : 'left')};vertical-align:middle;line-height:1.25;overflow:hidden" dir="${PM.isAr(t) ? 'rtl' : 'ltr'}">${esc(t)}</td>`;
    }
    s += '</tr>';
  });
  return s + '</table>';
};
PM.Table = function (x, y, w, h, rows, o = {}) {
  return { t: 'table', id: PM.uid(), x, y, w, h, rows: rows.map(r => r.slice()), header: true, style: o.style || 'rule', fs: o.fs || 11, dark: !!o.dark, rtl: !!o.rtl, name: 'Table', bind: o.bind || 'main.rows' };
};
})(window.PM);
