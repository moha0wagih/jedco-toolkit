/* ==========================================================================
   صانع العروض 2 — stage renderer (DOM). 1 unit = 1pt of the 960×540 slide.
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H } = PM;
const esc = PM.esc;
const col = (hex, a = 100) => a >= 100 ? '#' + hex : PM.hexA(hex, a / 100);
PM.imgURL = function (assets, id) {
  const a = assets && assets[id];
  if (!a) return '';
  if (a.url) return a.url;
  if (a.b64) return (a.url = 'data:image/' + (a.ext || 'jpeg') + ';base64,' + a.b64);
  if (a.bytes) return (a.url = URL.createObjectURL(new Blob([a.bytes], { type: 'image/' + (a.ext === 'jpg' ? 'jpeg' : a.ext || 'jpeg') })));
  return '';
};
PM.iconSVG = function (name, color, sw) {
  const n = String(name || '').replace(/^lib:/, '');
  const IC = PM.ICONS || (typeof ICONS !== 'undefined' ? ICONS : null);
  const d = IC && IC[n] ? IC[n][1] : '<circle cx="12" cy="12" r="9"/>';
  return `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="#${color}" stroke-width="${sw || 1.6}" stroke-linecap="round" stroke-linejoin="round" style="display:block;overflow:visible">${d}</svg>`;
};
PM.logoSVG = function (color) {
  return String(PM.LOGO || (typeof LOGO_SVG !== 'undefined' ? LOGO_SVG : '')).replace(/fill="rgb\(100%, 100%, 100%\)"/g, `fill="#${color}"`);
};
function paraHTML(p, o) {
  const ar = PM.isAr(p.t);
  const dir = ar ? 'rtl' : 'ltr';
  // alignment: start/end follow the text direction; explicit l/c/r win
  // alignment follows the box direction (Arabic boxes start on the right, even for a line of digits)
  const boxR = o.dir === 'rtl';
  let al = p.al ? ({ l: 'left', c: 'center', r: 'right' })[p.al] : (o.align === 'center' ? 'center' : o.align === 'end' ? (boxR ? 'left' : 'right') : (boxR ? 'right' : 'left'));
  const t = p.caps ? String(p.t).toUpperCase() : String(p.t);
  const runs = PM.runs(t, p).map(r => `<span${r.b ? ' data-b="1"' : ''} style="font-family:${r.f};${r.k !== 1 ? `font-size:${(p.size * r.k).toFixed(2)}px;` : ''}${r.b ? 'font-weight:700;' : ''}">${esc(r.t)}</span>`).join('');
  const ind = p.bullet ? p.size * 1.25 : 0;
  const bpos = boxR ? 'right:0;' : 'left:0;';
  const bul = p.bullet === 'dot' ? `<span class="pmb" style="${bpos}width:${ind}px;color:#${p.bc || '004EAA'};">●</span>` : p.bullet === 'num' ? `<span class="pmb" style="${bpos}width:${ind}px;font-family:SanSeq;font-size:${p.size * 0.8}px;color:#${p.bc || '62B6F3'}">${o.n}</span>` : p.bullet === 'dash' ? `<span class="pmb" style="${bpos}width:${ind}px;color:#${p.bc || '62B6F3'}">—</span>` : '';
  const fw = p.bold ? 700 : 400;
  return `<div class="pmp" dir="${dir}" data-bind="${p.bind || ''}" style="font-size:${p.size}px;line-height:${(p.size * (p.lh || 1.2)).toFixed(2)}px;color:#${p.color};font-weight:${fw};text-align:${al};margin-top:${(p.sb || 0).toFixed(2)}px;margin-bottom:${(p.sa || 0).toFixed(2)}px;${ind ? (boxR ? `padding-right:${ind}px;` : `padding-left:${ind}px;`) : ''}${p.track ? `letter-spacing:${(p.track * p.size).toFixed(2)}px;` : ''}${p.sw ? `-webkit-text-stroke:${(p.sw * p.size * 0.025).toFixed(2)}px currentColor;` : ''}">${bul}${runs || '&#8203;'}</div>`;
}
PM.textHTML = function (o) {
  let n = 0;
  return o.paras.map(p => { if (p.bullet === 'num') n++; return paraHTML(p, { align: o.align, n, dir: o.dir }); }).join('');
};
/* one object → element */
PM.objEl = function (o, assets) {
  const el = document.createElement('div');
  el.className = 'pmo pm-' + o.t;
  el.dataset.id = o.id;
  const st = el.style;
  st.left = o.x + 'px'; st.top = o.y + 'px'; st.width = Math.max(o.w, 0.5) + 'px'; st.height = Math.max(o.h, 0.5) + 'px';
  if (o.rot) st.transform = `rotate(${o.rot}deg)`;
  if (o.op != null && o.op < 100) st.opacity = o.op / 100;
  switch (o.t) {
    case 'rect': case 'ellipse': {
      if (o.grad) {
        const g = o.grad, dir = { down: 'to bottom', up: 'to top', left: 'to left', right: 'to right' }[g.dir] || 'to bottom';
        st.background = `linear-gradient(${dir}, ${col(o.fill, g.a0)}, ${col(o.fill, g.a1)})`;
      } else if (o.fill) st.background = col(o.fill, o.fa);
      if (o.stroke) st.boxShadow = `inset 0 0 0 ${o.sw || 1}px ${col(o.stroke, o.sa == null ? 100 : o.sa)}`;
      if (o.t === 'ellipse') st.borderRadius = '50%'; else if (o.r) st.borderRadius = Math.min(o.r, o.w / 2, o.h / 2) + 'px';
      break;
    }
    case 'line': {
      const horiz = Math.abs(o.h) < 0.5, vert = Math.abs(o.w) < 0.5;
      if (horiz || vert) {
        st.background = 'none';
        if (horiz) { st.height = '0px'; st.borderTop = `${o.sw || 1}px ${o.dash ? 'dashed' : 'solid'} #${o.color}`; st.marginTop = -(o.sw || 1) / 2 + 'px'; }
        else { st.width = '0px'; st.borderLeft = `${o.sw || 1}px ${o.dash ? 'dashed' : 'solid'} #${o.color}`; st.marginLeft = -(o.sw || 1) / 2 + 'px'; }
      } else {
        const x1 = o.flipH ? o.w : 0, x2 = o.flipH ? 0 : o.w;
        el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${o.w} ${o.h}" preserveAspectRatio="none" style="overflow:visible;display:block"><line x1="${x1}" y1="0" x2="${x2}" y2="${o.h}" stroke="#${o.color}" stroke-width="${o.sw || 1}" ${o.dash ? 'stroke-dasharray="4 3"' : ''}/></svg>`;
      }
      break;
    }
    case 'image': {
      const sa = assets && assets[o.src];
      if (sa && sa.kind === 'sug') {
        el.classList.add('pm-sug');
        const sm = Math.min(o.w, o.h) < 150;
        el.innerHTML = `<div class="pm-sugi"><svg viewBox="0 0 24 24" fill="none" stroke="#004EAA" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:${sm ? 22 : 30}px;height:${sm ? 22 : 30}px"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg><b>صورة مقترحة</b>${sm ? '' : `<span>${esc(sa.note || '')}</span>`}</div>`;
        if (o.r) st.borderRadius = o.r + 'px';
        break;
      }
      const url = PM.imgURL(assets, o.src);
      if (url) { st.backgroundImage = `url("${url}")`; st.backgroundSize = 'cover'; st.backgroundPosition = `${(o.fx * 100).toFixed(1)}% ${(o.fy * 100).toFixed(1)}%`; if (o.zoom && o.zoom > 1) { st.backgroundSize = (o.zoom * 100).toFixed(0) + '%'; imgZoom(st, o, assets); } }
      else { st.background = '#DCE5F0'; el.innerHTML = '<div class="pm-ph">＋</div>'; }
      if (o.r) st.borderRadius = o.r + 'px';
      break;
    }
    case 'icon': el.innerHTML = PM.iconSVG(o.icon, o.color, o.sw); break;
    case 'logo': el.innerHTML = PM.logoSVG(o.color); break;
    case 'text': {
      el.innerHTML = `<div class="pmt" style="justify-content:${o.va === 'm' ? 'center' : o.va === 'b' ? 'flex-end' : 'flex-start'}">${PM.textHTML(o)}</div>`;
      break;
    }
    case 'chart': el.innerHTML = PM.chartSVG ? PM.chartSVG(o) : ''; break;
    case 'table': el.innerHTML = PM.tableHTML ? PM.tableHTML(o) : ''; break;
  }
  return el;
};
/* cover-fit with zoom: background-size relative to the box keeping the photo's ratio */
function imgZoom(st, o, assets) {
  const a = assets && assets[o.src];
  const sz = a && a.size ? a.size : { w: 1600, h: 1000 };
  const ar = sz.w / sz.h, br = o.w / o.h;
  const z = o.zoom || 1;
  if (ar > br) st.backgroundSize = `auto ${(z * 100).toFixed(1)}%`; else st.backgroundSize = `${(z * 100).toFixed(1)}% auto`;
}
/* whole slide into a host element (host is sized by the caller) */
PM.renderSlide = function (host, objs, assets, o = {}) {
  host.innerHTML = '';
  const s = document.createElement('div');
  s.className = 'pm-slide';
  s.style.width = W + 'px'; s.style.height = H + 'px';
  if (o.scale) { s.style.transform = `scale(${o.scale})`; s.style.transformOrigin = '0 0'; }
  for (const ob of objs) { if (ob.hidden) continue; s.appendChild(PM.objEl(ob, assets)); }
  host.appendChild(s);
  return s;
};
PM.injectRenderCSS = function () {
  if (document.getElementById('pm-render-css')) return;
  const st = document.createElement('style');
  st.id = 'pm-render-css';
  st.textContent = `.pm-slide{position:absolute;left:0;top:0;direction:ltr;overflow:hidden;background:#fff;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;font-kerning:normal}
.pmo{position:absolute;box-sizing:border-box}
.pm-text{overflow:visible}
.pmt{display:flex;flex-direction:column;width:100%;height:100%}
.pmp{white-space:pre-wrap;word-break:normal;overflow-wrap:normal;position:relative;font-feature-settings:"kern" 1}
.pmb{position:absolute;top:0;display:inline-block;text-align:start;font-size:.62em;line-height:inherit;font-family:Arial,sans-serif}
.pm-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#7A8BA3;font-size:26px}
.pm-image{background-repeat:no-repeat}
.pm-sug{background:#E8F0FA;box-shadow:inset 0 0 0 1.5px #62B6F3;background-image:repeating-linear-gradient(135deg,rgba(98,182,243,.10) 0 10px,transparent 10px 20px)}
.pm-sugi{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:14px;text-align:center;direction:rtl;font-family:SanTaj,sans-serif;color:#3D4A5C}
.pm-sugi b{font-size:14px;color:#004EAA;font-weight:700}.pm-sugi span{font-size:11.5px;line-height:1.5;max-width:300px}`;
  document.head.appendChild(st);
};
})(window.PM);
