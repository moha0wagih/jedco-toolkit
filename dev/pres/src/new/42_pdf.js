/* ==========================================================================
   صانع العروض · v2.0 — PDF file (no print dialog) + «فتح في Outlook»
   Every visible slide is drawn at 2.5× and packed into one PDF page each
   (960 × 540 pt, the slide's own size).
   ========================================================================== */
(function (PM) {
'use strict';
let FONT_CSS = null;
function fontCSS() {
  if (FONT_CSS != null) return FONT_CSS;
  let out = '';
  for (const st of document.querySelectorAll('style')) { const m = st.textContent.match(/@font-face\s*\{[^}]*\}/g); if (m) out += m.join('\n'); }
  return (FONT_CSS = out);
}
const IS_SAFARI = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
function dataToBytes(u) { return PM.b64ToBytes(u.slice(u.indexOf(',') + 1)); }
function jpegSize(b) { let i = 2; while (i < b.length - 9) { if (b[i] !== 0xFF) { i++; continue; } const m = b[i + 1]; if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: b[i + 5] << 8 | b[i + 6], w: b[i + 7] << 8 | b[i + 8] }; i += 2 + (b[i + 2] << 8 | b[i + 3]); } return null; }

/* one slide → JPEG bytes */
async function slideJpeg(host, s, assets, ratio) {
  const node = PM.renderSlide(host, s.objs, assets, {});
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
  const opt = { pixelRatio: ratio, width: PM.W, height: PM.H, backgroundColor: '#ffffff', fontEmbedCSS: fontCSS(), quality: 0.92, cacheBust: false, skipAutoScale: true };
  if (IS_SAFARI) await htmlToImage.toJpeg(node, opt); // Safari paints pictures on the second pass
  return dataToBytes(await htmlToImage.toJpeg(node, opt));
}

/* minimal PDF writer: one JPEG per page */
function buildPdf(pages, W, H) {
  const enc = new TextEncoder();
  const parts = []; let len = 0; const offs = [];
  const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = pages.length;
  // 1 catalog, 2 pages, then per page: page, content, image
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${kids}] >>`));
  pages.forEach((p, i) => {
    const pn = 3 + i * 3, cn = pn + 1, im = pn + 2;
    obj(pn, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${im} 0 R >> >> /Contents ${cn} 0 R >>`));
    const cs = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`;
    obj(cn, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
    obj(im, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`); push(p.bytes); push('\nendstream'); });
  });
  const xref = len;
  let x = `xref\n0 ${3 + n * 3}\n0000000000 65535 f \n`;
  for (let i = 1; i < 3 + n * 3; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  push(x + `trailer\n<< /Size ${3 + n * 3} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}

PM.pdfBlob = async function (deck, onProgress) {
  if (typeof htmlToImage === 'undefined') throw new Error('مكتبة الصور ما انحملت');
  if (PM.ensurePhotos) await PM.ensurePhotos(deck);
  await document.fonts.ready;
  const vis = deck.slides.filter(s => !s.hidden);
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${PM.W}px;height:${PM.H}px;overflow:hidden;pointer-events:none`;
  document.body.appendChild(host);
  const ratio = vis.length > 40 ? 2 : 2.5;
  const pages = [];
  try {
    for (let i = 0; i < vis.length; i++) {
      if (onProgress) onProgress(i, vis.length);
      const bytes = await slideJpeg(host, vis[i], deck.assets, ratio);
      const d = jpegSize(bytes) || { w: Math.round(PM.W * ratio), h: Math.round(PM.H * ratio) };
      pages.push({ bytes, w: d.w, h: d.h });
    }
  } finally { host.remove(); }
  return buildPdf(pages, PM.W, PM.H);
};
})(window.PM);
