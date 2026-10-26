/* ==========================================================================
   صانع العروض 2 — export (PowerPoint · PDF · slideshow)
   Objects → native PowerPoint shapes on the official Jeddah Airports template.
   ========================================================================== */
(function (PM) {
'use strict';
const { W, H } = PM;
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const REL = t => 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/' + t;
const E = v => Math.round(v * 12700);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const AR = PM.AR;
const FONTS = PM.EXPORT_FONTS = { ar: 'Tajawal', head: 'Sequel 100 Wide 55', body: 'FS Industrie Wide Book', num: 'Sequel 100 Wide 55' };
const MIME = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml' };

/* ---------- text ---------- */
function runXml(r, p) {
  const ar = AR.test(r.t);
  const face = r.num ? FONTS.num : ar ? FONTS.ar : (p.font === 'head' || p.font === 'num') ? FONTS.head : FONTS.body;
  const sz = Math.round(p.size * (r.k || 1) * 100);
  const spc = p.track ? ` spc="${Math.round(p.track * p.size * 100)}"` : '';
  const txt = p.caps ? String(r.t).toUpperCase() : r.t;
  return `<a:r><a:rPr lang="${ar ? 'ar-SA' : 'en-US'}" altLang="en-US" sz="${sz}" b="${p.bold && !r.num ? 1 : 0}"${spc} dirty="0"><a:solidFill><a:srgbClr val="${p.color}"/></a:solidFill><a:latin typeface="${esc(face)}"/><a:ea typeface="${esc(face)}"/><a:cs typeface="${esc(r.num ? FONTS.num : FONTS.ar)}"/></a:rPr><a:t>${esc(txt)}</a:t></a:r>`;
}
function paraXml(p, box) {
  const boxR = box.dir === 'rtl';
  let al;
  if (p.al) al = { l: 'l', c: 'ctr', r: 'r' }[p.al];
  else if (box.align === 'center') al = 'ctr';
  else if (box.align === 'end') al = boxR ? 'l' : 'r';
  else al = boxR ? 'r' : 'l';
  const ind = Math.round(p.size * 1.25 * 12700);
  let bu = '<a:buNone/>', mar = '';
  if (p.bullet === 'dot') { bu = `<a:buClr><a:srgbClr val="${p.bc || '004EAA'}"/></a:buClr><a:buSzPct val="70000"/><a:buFont typeface="Arial"/><a:buChar char="●"/>`; mar = ` marL="${ind}" indent="-${ind}"`; }
  else if (p.bullet === 'dash') { bu = `<a:buClr><a:srgbClr val="${p.bc || '62B6F3'}"/></a:buClr><a:buFont typeface="Arial"/><a:buChar char="—"/>`; mar = ` marL="${ind}" indent="-${ind}"`; }
  else if (p.bullet === 'num') { bu = `<a:buClr><a:srgbClr val="${p.bc || '62B6F3'}"/></a:buClr><a:buFont typeface="${esc(FONTS.num)}"/><a:buAutoNum type="arabicPeriod"/>`; mar = ` marL="${ind}" indent="-${ind}"`; }
  const prtl = AR.test(p.t) || (boxR && !/[A-Za-z]/.test(p.t)) ? 1 : 0;
  const runs = PM.runs(String(p.t), p).map(r => runXml(r, p)).join('');
  const lh = Math.round(p.size * (p.lh || 1.2) * 100);
  return `<a:p><a:pPr algn="${al}" rtl="${prtl}"${mar}><a:lnSpc><a:spcPts val="${lh}"/></a:lnSpc><a:spcBef><a:spcPts val="${Math.round((p.sb || 0) * 100)}"/></a:spcBef><a:spcAft><a:spcPts val="${Math.round((p.sa || 0) * 100)}"/></a:spcAft>${bu}</a:pPr>${runs || ''}<a:endParaRPr lang="${prtl ? 'ar-SA' : 'en-US'}" sz="${Math.round(p.size * 100)}" dirty="0"/></a:p>`;
}
const xfrm = (o, extra = '') => `<a:xfrm${o.rot ? ` rot="${Math.round(o.rot * 60000)}"` : ''}${extra}><a:off x="${E(o.x)}" y="${E(o.y)}"/><a:ext cx="${E(Math.max(o.w, 0.5))}" cy="${E(Math.max(o.h, 0.5))}"/></a:xfrm>`;
const solid = (hex, a) => `<a:solidFill><a:srgbClr val="${hex}">${a != null && a < 100 ? `<a:alpha val="${Math.round(a * 1000)}"/>` : ''}</a:srgbClr></a:solidFill>`;

class SB {
  constructor() { this.id = 100; this.shapes = []; this.rels = []; this.rid = 20; }
  nid() { return ++this.id; }
  rel(type, target) { const id = 'rId' + (++this.rid); this.rels.push({ id, type, target }); return id; }
  text(o) {
    const id = this.nid();
    const paras = o.paras.filter(p => p).map(p => paraXml(p, o)).join('') || '<a:p><a:endParaRPr lang="en-US"/></a:p>';
    const anchor = o.va === 'm' ? 'ctr' : o.va === 'b' ? 'b' : 't';
    this.shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(o.name || 'Text')} ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(o)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="${anchor}"><a:noAutofit/></a:bodyPr><a:lstStyle/>${paras}</p:txBody></p:sp>`);
  }
  shape(o) {
    const id = this.nid();
    let geom;
    if (o.t === 'ellipse') geom = '<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom>';
    else if (o.r) { const adj = Math.round(Math.min(50000, o.r / Math.max(1, Math.min(o.w, o.h)) * 100000)); geom = `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${adj}"/></a:avLst></a:prstGeom>`; }
    else geom = '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
    let fill = '<a:noFill/>';
    if (o.grad && o.fill) {
      const g = o.grad;
      const ang = { right: 0, down: 5400000, left: 10800000, up: 16200000 }[g.dir] || 5400000;
      fill = `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="${o.fill}"><a:alpha val="${Math.round((g.a0 || 0) * 1000)}"/></a:srgbClr></a:gs><a:gs pos="100000"><a:srgbClr val="${o.fill}"><a:alpha val="${Math.round((g.a1 == null ? 100 : g.a1) * 1000)}"/></a:srgbClr></a:gs></a:gsLst><a:lin ang="${ang}" scaled="0"/></a:gradFill>`;
    } else if (o.fill) fill = solid(o.fill, o.fa);
    const ln = o.stroke ? `<a:ln w="${E(o.sw || 1)}">${solid(o.stroke, o.sa)}</a:ln>` : '<a:ln><a:noFill/></a:ln>';
    this.shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(o.name || 'Shape')} ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(o)}${geom}${fill}${ln}</p:spPr><p:txBody><a:bodyPr rtlCol="0" anchor="ctr"/><a:lstStyle/><a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p></p:txBody></p:sp>`);
  }
  line(o) {
    const id = this.nid();
    const flip = o.flipH ? ' flipH="1"' : '';
    this.shapes.push(`<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="Line ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm${flip}><a:off x="${E(o.x)}" y="${E(o.y)}"/><a:ext cx="${E(Math.max(0, o.w))}" cy="${E(Math.max(0, o.h))}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="${E(o.sw || 1)}">${solid(o.color)}${o.dash ? '<a:prstDash val="sysDash"/>' : ''}</a:ln></p:spPr></p:cxnSp>`);
  }
  pic(o, target, size, o2 = {}) {
    const id = this.nid();
    const rid = this.rel('image', target);
    let src = '';
    if (o2.cover && size && size.w && size.h) {
      // the same crop the stage shows: cover-fit, focal point, zoom
      const ar = size.w / size.h, br = o.w / o.h, z = o.zoom || 1;
      let vw, vh; if (ar > br) { vh = 1 / z; vw = (br / ar) / z; } else { vw = 1 / z; vh = (ar / br) / z; }
      const l = (1 - vw) * (o.fx == null ? 0.5 : o.fx), t = (1 - vh) * (o.fy == null ? 0.5 : o.fy);
      src = `<a:srcRect l="${Math.round(l * 1e5)}" t="${Math.round(t * 1e5)}" r="${Math.round((1 - vw - l) * 1e5)}" b="${Math.round((1 - vh - t) * 1e5)}"/>`;
    }
    let svgExt = '';
    if (o2.svgTarget) { const sr = this.rel('image', o2.svgTarget); svgExt = `<a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="${sr}"/></a:ext></a:extLst>`; }
    const geom = o.r ? `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${Math.round(Math.min(50000, o.r / Math.max(1, Math.min(o.w, o.h)) * 100000))}"/></a:avLst></a:prstGeom>` : '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
    this.shapes.push(`<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(o2.name || 'Picture')} ${id}"/><p:cNvPicPr><a:picLocks noChangeAspect="${o2.cover ? 0 : 1}"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}">${svgExt}</a:blip>${src}<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(o)}${geom}</p:spPr></p:pic>`);
  }
  table(o) {
    const id = this.nid();
    const rows = o.rows, n = Math.max(...rows.map(r => r.length));
    const rtl = !!o.rtl, dark = !!o.dark;
    const head = dark ? 'FFFFFF' : '002657', body = dark ? 'D5E0EE' : '3D4A5C', line = dark ? '24477A' : 'DDE3EA', accent = dark ? '62B6F3' : '004EAA';
    const rh = o.h / rows.length;
    const cw = o.colW || Array.from({ length: n }, () => o.w / n);
    const fs = o.fs || 11;
    const cell = (t, ri, ci) => {
      const isHead = ri === 0 && o.header !== false;
      const numeric = !!PM.numInfo(t);
      const fillHead = isHead && o.style === 'fill';
      const zebra = o.style === 'zebra' && ri > 0 && ri % 2 === 0;
      const col = isHead ? (fillHead ? 'FFFFFF' : head) : (ci === 0 ? head : body);
      const p = { t: String(t || ''), size: numeric ? fs * 0.9 : fs, bold: isHead || (ci === 0 && !numeric), color: col, lh: 1.25, font: numeric ? 'num' : 'auto', al: numeric && ci > 0 ? 'c' : null };
      const bb = isHead ? `<a:lnB w="${E(1.5)}">${solid(accent)}</a:lnB>` : ri === rows.length - 1 ? '<a:lnB><a:noFill/></a:lnB>' : `<a:lnB w="${E(0.75)}">${solid(line)}</a:lnB>`;
      const fill = fillHead ? solid(dark ? '0F3B78' : '004EAA') : zebra ? solid(dark ? '0A2E61' : 'F3F6FA') : '<a:noFill/>';
      return `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/>${paraXml(p, { dir: rtl ? 'rtl' : 'ltr' })}</a:txBody><a:tcPr marL="${E(fs * 0.7)}" marR="${E(fs * 0.7)}" marT="${E(3)}" marB="${E(3)}" anchor="ctr"><a:lnL><a:noFill/></a:lnL><a:lnR><a:noFill/></a:lnR><a:lnT><a:noFill/></a:lnT>${bb}${fill}</a:tcPr></a:tc>`;
    };
    const order = rtl ? cw.slice().reverse() : cw;
    const grid = order.map(w => `<a:gridCol w="${E(w)}"/>`).join('');
    const trs = rows.map((r, ri) => { const cells = Array.from({ length: n }, (_, c) => cell(r[c], ri, c)); return `<a:tr h="${E(rh)}">${(rtl ? cells.reverse() : cells).join('')}</a:tr>`; }).join('');
    this.shapes.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="Table ${id}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${E(o.x)}" y="${E(o.y)}"/><a:ext cx="${E(o.w)}" cy="${E(o.h)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr${rtl ? ' rtl="1"' : ''} firstRow="1" bandRow="0"/><a:tblGrid>${grid}</a:tblGrid>${trs}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`);
  }
  chart(o, target) {
    const id = this.nid();
    const rid = this.rel('chart', target);
    this.shapes.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="Chart ${id}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${E(o.x)}" y="${E(o.y)}"/><a:ext cx="${E(o.w)}" cy="${E(o.h)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="${rid}"/></a:graphicData></a:graphic></p:graphicFrame>`);
  }
  xml() { return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${this.shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`; }
}

/* ---------- native chart part ---------- */
function chEsc(s) { return esc(s); }
function col(i) { return String.fromCharCode(66 + i); }
function chartPart(o) {
  const rtl = !!o.rtl && !PM.chartIsTime(o.cats);
  const n = o.cats.length, S = o.series;
  const pal = PM.chartPal(o);
  const txt = o.dark ? 'C9D6E8' : '3D4A5C', val = o.dark ? 'FFFFFF' : '002657', grid = o.dark ? '24477A' : 'E3E8EF', axis = o.dark ? '3D5F93' : 'C6D0DC';
  const catFace = AR.test(o.cats.join('')) ? FONTS.ar : FONTS.body;
  const fs = o.fs || 11;
  const fc = (o.unit === '%' ? '0' + (o.dec ? '.' + '0'.repeat(o.dec) : '') + '"%"' : (o.dec ? '#,##0.' + '0'.repeat(o.dec) : '#,##0') + (o.unit && o.unit !== '%' ? `"${o.unit.length <= 2 ? '' : ' '}${o.unit}"` : ''));
  const pre = o.pre ? `"${o.pre}"` : '';
  const fmt = esc(pre + fc);
  const txPr = (sz, color, face) => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${Math.round(sz * 100)}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${esc(face)}"/><a:cs typeface="${esc(FONTS.ar)}"/></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr>`;
  const cat = `<c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${n + 1}</c:f><c:strCache><c:ptCount val="${n}"/>${o.cats.map((c, k) => `<c:pt idx="${k}"><c:v>${chEsc(c)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat>`;
  const vals = (s, si) => `<c:val><c:numRef><c:f>Sheet1!$${col(si)}$2:$${col(si)}$${n + 1}</c:f><c:numCache><c:formatCode>${fmt}</c:formatCode><c:ptCount val="${n}"/>${s.vals.map((v, k) => `<c:pt idx="${k}"><c:v>${+v || 0}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:val>`;
  const tx = (s, si) => `<c:tx><c:strRef><c:f>Sheet1!$${col(si)}$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${chEsc(s.name || 'Value')}</c:v></c:pt></c:strCache></c:strRef></c:tx>`;
  const dl = (pos, color) => o.vals === false ? '<c:dLbls><c:delete val="1"/></c:dLbls>' : `<c:dLbls><c:numFmt formatCode="${fmt}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(fs * 0.95, color || val, FONTS.num)}${pos ? `<c:dLblPos val="${pos}"/>` : ''}<c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>`;
  const legend = (pos) => `<c:legend><c:legendPos val="${pos}"/><c:overlay val="0"/>${txPr(fs, txt, catFace)}</c:legend>`;
  const lineSp = c2 => `<c:spPr><a:noFill/><a:ln w="9525">${solid(c2)}</a:ln></c:spPr>`;
  const multi = S.length > 1;
  let plot = '', axes = '', leg = '';
  const hi = PM.chartHi(o);
  const soft = o.dark ? '3E6BA8' : 'B8CDE6';
  if (o.kind === 'donut' || o.kind === 'pie') {
    const s = S[0];
    const cols = s.colors || pal;
    const dp = s.vals.map((v, k) => `<c:dPt><c:idx val="${k}"/><c:bubble3D val="0"/><c:spPr>${solid(cols[k % cols.length])}${o.ring ? '<a:ln><a:noFill/></a:ln>' : `<a:ln w="19050">${solid(o.dark ? '002657' : 'FFFFFF')}</a:ln>`}</c:spPr></c:dPt>`).join('');
    const lbl = o.ring || o.legend === false ? '<c:dLbls><c:delete val="1"/></c:dLbls>' : dl(null, 'FFFFFF');
    plot = o.kind === 'donut'
      ? `<c:doughnutChart><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/>${tx(s, 0)}${dp}${lbl}${cat}${vals(s, 0)}</c:ser><c:firstSliceAng val="0"/><c:holeSize val="${o.ring ? 84 : 62}"/></c:doughnutChart>`
      : `<c:pieChart><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/>${tx(s, 0)}${dp}${lbl}${cat}${vals(s, 0)}</c:ser><c:firstSliceAng val="0"/></c:pieChart>`;
    if (!o.ring && o.legend !== false) leg = legend(rtl ? 'l' : 'r');
  } else if (o.kind === 'line' || o.kind === 'area') {
    const sers = S.map((s, si) => {
      const c2 = PM.chartColor(o, si);
      if (o.kind === 'area') return `<c:ser><c:idx val="${si}"/><c:order val="${si}"/>${tx(s, si)}<c:spPr><a:solidFill><a:srgbClr val="${c2}"><a:alpha val="35000"/></a:srgbClr></a:solidFill><a:ln w="28575">${solid(c2)}</a:ln></c:spPr>${dl('t')}${cat}${vals(s, si)}</c:ser>`;
      return `<c:ser><c:idx val="${si}"/><c:order val="${si}"/>${tx(s, si)}<c:spPr><a:ln w="31750" cap="rnd">${solid(c2)}<a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="7"/><c:spPr>${solid(o.dark ? '002657' : 'FFFFFF')}<a:ln w="22225">${solid(c2)}</a:ln></c:spPr></c:marker>${dl('t')}${cat}${vals(s, si)}<c:smooth val="0"/></c:ser>`;
    }).join('');
    plot = o.kind === 'area' ? `<c:areaChart><c:grouping val="standard"/><c:varyColors val="0"/>${sers}<c:axId val="5001"/><c:axId val="5002"/></c:areaChart>` : `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${sers}<c:marker val="1"/><c:axId val="5001"/><c:axId val="5002"/></c:lineChart>`;
    axes = axXml(false, rtl);
    if (multi) leg = legend('t');
  } else {
    const hz = o.kind === 'bar', stack = o.kind === 'stack';
    const sers = S.map((s, si) => {
      const base = hi >= 0 ? soft : PM.chartColor(o, si);
      const dpt = hi >= 0 ? `<c:dPt><c:idx val="${hi}"/><c:invertIfNegative val="0"/><c:bubble3D val="0"/><c:spPr>${solid(o.dark ? '62B6F3' : '004EAA')}</c:spPr></c:dPt>` : '';
      return `<c:ser><c:idx val="${si}"/><c:order val="${si}"/>${tx(s, si)}<c:spPr>${solid(base)}</c:spPr><c:invertIfNegative val="0"/>${dpt}${dl(stack ? 'ctr' : 'outEnd', stack ? 'FFFFFF' : null)}${cat}${vals(s, si)}</c:ser>`;
    }).join('');
    plot = `<c:barChart><c:barDir val="${hz ? 'bar' : 'col'}"/><c:grouping val="${stack ? 'stacked' : 'clustered'}"/><c:varyColors val="0"/>${sers}<c:gapWidth val="${multi && !stack ? 70 : 90}"/>${stack ? '<c:overlap val="100"/>' : `<c:overlap val="${multi ? -6 : 0}"/>`}<c:axId val="5001"/><c:axId val="5002"/></c:barChart>`;
    axes = axXml(hz, rtl);
    if (multi) leg = legend('t');
  }
  function axXml(hz, rtl2) {
    const catOri = hz ? 'maxMin' : (rtl2 ? 'maxMin' : 'minMax');
    const valOri = hz && rtl2 ? 'maxMin' : 'minMax';
    return `<c:catAx><c:axId val="5001"/><c:scaling><c:orientation val="${catOri}"/></c:scaling><c:delete val="0"/><c:axPos val="${hz ? (rtl2 ? 'r' : 'l') : 'b'}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${lineSp(axis)}${txPr(fs, txt, catFace)}<c:crossAx val="5002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx><c:valAx><c:axId val="5002"/><c:scaling><c:orientation val="${valOri}"/><c:min val="0"/></c:scaling><c:delete val="1"/><c:axPos val="${hz ? 'b' : (rtl2 ? 'r' : 'l')}"/>${hz ? '' : `<c:majorGridlines><c:spPr><a:ln w="9525">${solid(grid)}</a:ln></c:spPr></c:majorGridlines>`}<c:numFmt formatCode="${fmt}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="5001"/><c:crosses val="${rtl2 && !hz ? 'max' : 'autoZero'}"/><c:crossBetween val="between"/></c:valAx>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="${NS_A}" xmlns:r="${NS_R}"><c:date1904 val="0"/><c:lang val="${o.rtl ? 'ar-SA' : 'en-US'}"/><c:roundedCorners val="0"/><c:chart><c:autoTitleDeleted val="1"/><c:plotArea><c:layout/>${plot}${axes}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea>${leg}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${Math.round(fs * 100)}"><a:solidFill><a:srgbClr val="${txt}"/></a:solidFill><a:latin typeface="${esc(catFace)}"/><a:cs typeface="${esc(FONTS.ar)}"/></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr><c:externalData r:id="rId1"><c:autoUpdate val="0"/></c:externalData></c:chartSpace>`;
}
async function chartXlsx(o, JSZip) {
  const z = new JSZip();
  const X = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
  z.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${X}" xmlns:r="${R}"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  z.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
  const str = (ref, t) => `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(t)}</t></is></c>`;
  const rows = [`<row r="1">${str('A1', '')}${o.series.map((s, si) => str(col(si) + '1', s.name || 'Value')).join('')}</row>`];
  o.cats.forEach((c, k) => rows.push(`<row r="${k + 2}">${str('A' + (k + 2), c)}${o.series.map((s, si) => `<c r="${col(si)}${k + 2}"><v>${+s.vals[k] || 0}</v></c>`).join('')}</row>`));
  z.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${X}"><sheetData>${rows.join('')}</sheetData></worksheet>`);
  return z.generateAsync({ type: 'uint8array' });
}

/* ---------- SVG → PNG (icon fallback for older PowerPoint) ---------- */
PM.rasterize = function (svg, w, h) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = w; c.height = h || w; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob(b => b ? b.arrayBuffer().then(a => res(new Uint8Array(a))) : res(null), 'image/png'); };
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
};
function iconFileSVG(name, color, sw) {
  const n = String(name || '').replace(/^lib:/, '');
  const IC = PM.ICONS || (typeof ICONS !== 'undefined' ? ICONS : {});
  const d = IC[n] ? IC[n][1] : '<circle cx="12" cy="12" r="9"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#${color}" stroke-width="${sw || 1.6}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function logoFileSVG(color) { return PM.logoSVG(color).replace(/style="[^"]*"/, 'width="725" height="240"').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/xmlns="http:\/\/www.w3.org\/2000\/svg" xmlns="http:\/\/www.w3.org\/2000\/svg"/, 'xmlns="http://www.w3.org/2000/svg"'); }

/* ---------- template ---------- */
async function readTemplate(tz) {
  const pres = await tz.file('ppt/presentation.xml').async('string');
  const relsXml = await tz.file('ppt/_rels/presentation.xml.rels').async('string');
  const rels = {};
  for (const m of relsXml.matchAll(/<Relationship ([^>]*)\/>/g)) { const id = (m[1].match(/Id="([^"]+)"/) || [])[1], t = (m[1].match(/Target="([^"]+)"/) || [])[1]; if (id) rels[id] = 'ppt/' + t.replace(/^\/?(ppt\/)?/, ''); }
  const ids = [...pres.matchAll(/<p:sldId [^>]*r:id="([^"]+)"/g)].map(m => m[1]);
  const slides = [];
  for (const id of ids) { const p = rels[id]; const xml = await tz.file(p).async('string'); const rp = p.replace('slides/', 'slides/_rels/') + '.rels'; slides.push({ path: p, xml, rels: tz.file(rp) ? await tz.file(rp).async('string') : '' }); }
  const names = {};
  tz.forEach(p => { if (/^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(p)) names[p] = 1; });
  let blank = null, logoLayout = null;
  for (const p of Object.keys(names)) {
    const x = await tz.file(p).async('string');
    const nm = (x.match(/<p:cSld name="([^"]*)"/) || [])[1] || '';
    const rr = tz.file(p.replace('slideLayouts/', 'slideLayouts/_rels/') + '.rels') ? await tz.file(p.replace('slideLayouts/', 'slideLayouts/_rels/') + '.rels').async('string') : '';
    if (/blank|فارغ/i.test(nm) && !blank) blank = p;
    if (/media\/image6\.png/.test(rr) && /Default Slide/.test(nm)) logoLayout = p;
  }
  const contentLayout = logoLayout || blank || (slides[1].rels.match(/Target="([^"]*slideLayout\d+\.xml)"/) || [])[1];
  return { pres, relsXml, slides, contentLayout };
}
function stripText(xml) {
  let out = xml;
  out = out.replace(/<p:grpSp>(?:(?!<p:grpSp>)[\s\S])*?<\/p:grpSp>/g, m => /<a:t>/.test(m) ? '' : m);
  out = out.replace(/<p:grpSp>[\s\S]*?<\/p:grpSp>/g, m => /<a:t>/.test(m) ? '' : m);
  out = out.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, m => /<a:t>/.test(m) ? '' : m);
  return out;
}
const maxId = xml => { let m = 1; for (const x of xml.matchAll(/ id="(\d+)"/g)) m = Math.max(m, +x[1]); return m; };

/* ---------- build the deck ---------- */
PM.exportPptx = async function (deck, onProgress) {
  const lang = deck.lang === 'en' ? 'en' : 'ar';
  const tplB64 = lang === 'en' ? (window.__TPL_EN || '') : (window.__TPL_AR || '');
  if (!tplB64) throw new Error('ملف التمبلت الرسمي غير موجود بجانب الأداة (tpl_ar.js / tpl_en.js)');
  const tz = await JSZip.loadAsync(PM.b64ToBytes(tplB64));
  const T = await readTemplate(tz);
  const tSl = T.slides;
  const tCover = tSl[0], tAgenda = tSl[1], tClosing = tSl[tSl.length - 1];
  const tDiv = tSl.slice(3, tSl.length - 1);
  for (const s of tSl) { tz.remove(s.path); tz.remove(s.path.replace('slides/', 'slides/_rels/') + '.rels'); }
  tz.forEach(p => { if (/^ppt\/notesSlides\//.test(p)) tz.remove(p); });
  let ct = await tz.file('[Content_Types].xml').async('string');
  ct = ct.replace(/<Override PartName="\/ppt\/slides\/[^"]+"[^>]*\/>/g, '').replace(/<Override PartName="\/ppt\/notesSlides\/[^"]+"[^>]*\/>/g, '');
  let presRels = T.relsXml.replace(/<Relationship [^>]*relationships\/slide"[^>]*\/>/g, '');
  let pres = T.pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, '<p:sldIdLst/>').replace(/<p:custShowLst>[\s\S]*?<\/p:custShowLst>/, '').replace(' embedTrueTypeFonts="1"', '').replace(/<p:ext uri="\{521415D9-36F7-43E2-AB2F-B90AF26B5E84\}">[\s\S]*?<\/p:ext>/, '');
  const notesMaster = (presRels.match(/Target="([^"]*notesMaster\d+\.xml)"/) || [])[1];
  const addDefault = (ext, type) => { if (!new RegExp(`Extension="${ext}"`, 'i').test(ct)) ct = ct.replace('<Default ', `<Default Extension="${ext}" ContentType="${type}"/><Default `); };
  const addOverride = (part, type) => { if (!ct.includes(`PartName="/${part}"`)) ct = ct.replace('</Types>', `<Override PartName="/${part}" ContentType="${type}"/></Types>`); };
  let mediaN = 0; const mediaCache = {};
  const putMedia = (bytes, ext, key) => {
    if (key && mediaCache[key]) return mediaCache[key];
    const name = `ppt/media/sanea2_${++mediaN}.${ext}`;
    tz.file(name, bytes); addDefault(ext, MIME[ext] || 'application/octet-stream');
    const t = '../media/' + name.split('/').pop();
    if (key) mediaCache[key] = t;
    return t;
  };
  let chartN = 0;
  const addChart = async (o) => {
    const n = ++chartN;
    const dst = `ppt/charts/chart_sanea2_${n}.xml`;
    tz.file(dst, chartPart(o));
    addOverride(dst, 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml');
    const xl = `ppt/embeddings/Microsoft_Excel_Worksheet_sanea2_${n}.xlsx`;
    tz.file(xl, await chartXlsx(o, JSZip));
    addDefault('xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    tz.file(`ppt/charts/_rels/chart_sanea2_${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL('package')}" Target="../embeddings/Microsoft_Excel_Worksheet_sanea2_${n}.xlsx"/></Relationships>`);
    return '../charts/chart_sanea2_' + n + '.xml';
  };
  const iconCache = {};
  const iconFiles = async (svg, key, w, h) => {
    if (iconCache[key]) return iconCache[key];
    const png = await PM.rasterize(svg, w, h);
    const out = { svg: putMedia(new TextEncoder().encode(svg), 'svg', key + ':svg'), png: png ? putMedia(png, 'png', key + ':png') : null };
    iconCache[key] = out; return out;
  };
  const out = [];
  const visible = deck.slides.filter(s => !s.hidden);
  let divK = 0;
  for (let si = 0; si < visible.length; si++) {
    const s = visible[si];
    if (onProgress) onProgress(si, visible.length);
    const sb = new SB();
    const tplObj = s.objs.find(o => o.role === 'tplbg' && o.tpl);
    let base = null;
    if (tplObj) {
      const i = tplObj.tpl.idx;
      base = i === 0 ? tCover : i === 1 ? tAgenda : i === 9 ? tClosing : tDiv[(i - 2) % Math.max(1, tDiv.length)] || tDiv[(divK++) % Math.max(1, tDiv.length)];
    }
    if (base) sb.id = maxId(stripText(base.xml)) + 10;
    for (const o of s.objs) {
      if (o.hidden || o.role === 'tplbg') continue;
      if (o.t === 'text') { if (o.paras.some(p => String(p.t).trim())) sb.text(o); }
      else if (o.t === 'rect' || o.t === 'ellipse') sb.shape(o);
      else if (o.t === 'line') sb.line(o);
      else if (o.t === 'image') {
        const a = deck.assets[o.src]; const b = PM.assetBytes(a);
        if (!b) continue;
        let ext = (a.ext || 'jpeg').replace('jpg', 'jpeg');
        let bytes = b;
        if (ext === 'webp' || ext === 'gif') { bytes = await PM.toPng(b, 'image/' + ext).catch(() => null); ext = 'png'; if (!bytes) continue; }
        sb.pic(o, putMedia(bytes, ext, o.src), a.size || PM.imgSizeOf(b), { cover: true, name: 'Photo' });
      } else if (o.t === 'icon') {
        const f = await iconFiles(iconFileSVG(o.icon, o.color, o.sw), o.icon + '@' + o.color + '@' + (o.sw || 1.6), 192);
        sb.pic(o, f.png || f.svg, null, { svgTarget: f.png ? f.svg : null, name: 'Icon' });
      } else if (o.t === 'logo') {
        const f = await iconFiles(logoFileSVG(o.color), 'logo@' + o.color, 725, 240);
        sb.pic(o, f.png || f.svg, null, { svgTarget: f.png ? f.svg : null, name: 'Logo' });
      } else if (o.t === 'chart') sb.chart(o, await addChart(o));
      else if (o.t === 'table') sb.table(o);
    }
    let xml, relsXml;
    if (base) {
      xml = stripText(base.xml).replace('</p:spTree>', sb.shapes.join('') + '</p:spTree>');
      relsXml = base.rels.replace(/<Relationship [^>]*notesSlide"[^>]*\/>/g, '');
      const used = new Set([...base.rels.matchAll(/Id="(rId\d+)"/g)].map(m => m[1]));
      for (const r of sb.rels) { let id = r.id; if (used.has(id)) { const nid = id + 'x'; xml = xml.split(`r:embed="${id}"`).join(`r:embed="${nid}"`).split(`r:id="${id}"`).join(`r:id="${nid}"`); id = nid; } relsXml = relsXml.replace('</Relationships>', `<Relationship Id="${id}" Type="${REL(r.type)}" Target="${r.target}"/></Relationships>`); }
    } else {
      xml = sb.xml();
      relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL('slideLayout')}" Target="../slideLayouts/${T.contentLayout.split('/').pop()}"/>${sb.rels.map(r => `<Relationship Id="${r.id}" Type="${REL(r.type)}" Target="${r.target}"/>`).join('')}</Relationships>`;
    }
    out.push({ xml, relsXml, notes: s.spec.notes || '' });
  }
  let sldIds = '';
  out.forEach((s, i) => {
    const n = i + 1;
    let rels = s.relsXml;
    if (s.notes && notesMaster) {
      const nx = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notes xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${s.notes.split('\n').map(l => `<a:p><a:pPr rtl="${AR.test(l) ? 1 : 0}"/><a:r><a:rPr lang="${AR.test(l) ? 'ar-SA' : 'en-US'}" dirty="0"/><a:t>${esc(l)}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`;
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
  return tz.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
};
PM.download = function (bytes, name, type) {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type: type || 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
};

/* ---------- PDF: one 16:9 page per slide through the browser's print (offline, sharp text) ---------- */
PM.printPdf = function (deck) {
  let host = document.getElementById('pmPrint');
  if (host) host.remove();
  host = document.createElement('div'); host.id = 'pmPrint';
  for (const s of deck.slides) { if (s.hidden) continue; const pg = document.createElement('div'); pg.className = 'pm-page'; host.appendChild(pg); PM.renderSlide(pg, s.objs, deck.assets, {}); }
  document.body.appendChild(host);
  const st = document.createElement('style'); st.id = 'pmPrintCss';
  st.textContent = `@page{size:960px 540px;margin:0} @media print{body>*:not(#pmPrint){display:none!important} #pmPrint{display:block!important} .pm-page{width:960px;height:540px;page-break-after:always;overflow:hidden} .pm-page .pm-slide{transform:none!important}} #pmPrint{display:none}`;
  document.head.appendChild(st);
  setTimeout(() => { window.print(); setTimeout(() => { host.remove(); st.remove(); }, 1500); }, 400);
};

/* ---------- slideshow ---------- */
PM.present = function (deck, start = 0) {
  const vis = deck.slides.filter(s => !s.hidden);
  let i = Math.max(0, vis.indexOf(deck.slides[start]));
  const ov = document.createElement('div'); ov.className = 'pm-show';
  ov.innerHTML = '<div class="pm-show-host"></div><div class="pm-show-n"></div>';
  document.body.appendChild(ov);
  const host = ov.firstChild, num = ov.lastChild;
  const draw = () => { const sc = Math.min(innerWidth / W, innerHeight / H); host.style.width = W * sc + 'px'; host.style.height = H * sc + 'px'; PM.renderSlide(host, vis[i].objs, deck.assets, { scale: sc }); num.textContent = (i + 1) + ' / ' + vis.length; };
  const key = e => { if (['ArrowLeft', 'PageDown', ' ', 'ArrowDown', 'Enter'].includes(e.key)) { i = Math.min(vis.length - 1, i + (deck.lang === 'en' && e.key === 'ArrowLeft' ? -1 : 1)); draw(); } else if (['ArrowRight', 'PageUp', 'ArrowUp', 'Backspace'].includes(e.key)) { i = Math.max(0, i + (deck.lang === 'en' && e.key === 'ArrowRight' ? 1 : -1)); draw(); } else if (e.key === 'Escape') close(); e.preventDefault(); e.stopPropagation(); };
  const close = () => { document.removeEventListener('keydown', key, true); removeEventListener('resize', draw); if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); ov.remove(); };
  ov.addEventListener('click', e => { const x = e.clientX / innerWidth; i = deck.lang === 'en' ? (x > 0.3 ? Math.min(vis.length - 1, i + 1) : Math.max(0, i - 1)) : (x < 0.7 ? Math.min(vis.length - 1, i + 1) : Math.max(0, i - 1)); draw(); });
  document.addEventListener('keydown', key, true);
  addEventListener('resize', draw);
  if (ov.requestFullscreen) ov.requestFullscreen().catch(() => { });
  draw();
};
})(window.PM);
