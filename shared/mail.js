/* أدوات مطارات جدة — «فتح في Outlook»: a ready new message with the file attached.
   Designed by Mohammed Wagih · 2026 · v2.0

   Computer: builds a draft e-mail file (.eml, marked unsent) that opens in Outlook
   as a NEW message with the attachment, subject and text already in place.
   Phone: the system share sheet (pick Outlook) with the file attached.
   Works offline — nothing leaves the device until the user presses Send in Outlook.

   JEDMAIL.draft({ subject, body, files: [{ name, blob }] })  → Promise<'eml'|'share'|'mailto'|false>
*/
(function () {
  'use strict';
  if (window.JEDMAIL) return;
  var CRLF = '\r\n';

  function b64Utf8(s) { return btoa(unescape(encodeURIComponent(s))); }
  function hdrWord(s) {
    if (/^[\x20-\x7e]*$/.test(s)) return s;
    var out = [], cur = '';
    Array.from(s).forEach(function (ch) { if (b64Utf8(cur + ch).length > 44) { out.push(cur); cur = ''; } cur += ch; });
    if (cur) out.push(cur);
    return out.map(function (x) { return '=?UTF-8?B?' + b64Utf8(x) + '?='; }).join(CRLF + ' ');
  }
  function wrap76(s) { return s.replace(/(.{76})/g, '$1' + CRLF); }
  function blobB64(blob) {
    return new Promise(function (ok, no) {
      var r = new FileReader();
      r.onload = function () { var u = String(r.result); ok(u.slice(u.indexOf(',') + 1)); };
      r.onerror = function () { no(r.error); };
      r.readAsDataURL(blob);
    });
  }
  function isPhone() {
    var h = document.documentElement;
    if (h.classList.contains('hub-phone') || (document.body && document.body.classList.contains('phone'))) return true;
    return /iPhone|iPod|Android.+Mobile/.test(navigator.userAgent || '');
  }
  function safeName(s) { return String(s || 'message').replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 80) || 'message'; }

  async function buildEml(o) {
    var bnd = '----=_JED_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    var out = [
      'To: ',
      'Subject: ' + hdrWord(o.subject || ''),
      'X-Unsent: 1',
      'X-Mailer: Jeddah Airports Toolkit',
      'MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="' + bnd + '"',
      '',
      'This is a multi-part message in MIME format.',
      '',
      '--' + bnd,
      'Content-Type: text/plain; charset="utf-8"',
      'Content-Transfer-Encoding: base64',
      '',
      wrap76(b64Utf8(String(o.body || '').replace(/\r?\n/g, CRLF)))
    ];
    for (var i = 0; i < (o.files || []).length; i++) {
      var f = o.files[i];
      // Outlook keeps the attachment only when the headers are strictly standard:
      // a plain ASCII name for every mail app, plus the real (Arabic) name as RFC 2231 parts
      var ext = (f.name.match(/(\.[A-Za-z0-9]+)+$/) || [''])[0];
      var ascii = f.name.slice(0, f.name.length - ext.length).replace(/[^A-Za-z0-9 _.-]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (/[^\x00-\x7f]/.test(f.name) || ascii.replace(/[^A-Za-z0-9]/g, '').length < 3) ascii = 'Jeddah Airports ' + (o.kind || 'file');
      ascii = ascii.slice(0, 60) + ext;
      var enc = encodeURIComponent(f.name).replace(/['()*!]/g, function (c) { return '%' + c.charCodeAt(0).toString(16).toUpperCase(); });
      var parts = [], k = 0;
      for (var j = 0; j < enc.length; k++) { var cut = Math.min(enc.length, j + 60); while (cut < enc.length && /%[0-9A-F]?$/.test(enc.slice(j, cut))) cut--; parts.push(' filename*' + k + '*=' + (k ? '' : "UTF-8''") + enc.slice(j, cut) + ';'); j = cut; }
      parts[parts.length - 1] = parts[parts.length - 1].replace(/;$/, '');
      out.push('--' + bnd,
        'Content-Type: application/octet-stream; name="' + ascii + '"',
        'Content-Transfer-Encoding: base64',
        'Content-Disposition: attachment; filename="' + ascii + '";',
        parts.join(CRLF),
        '',
        wrap76(await blobB64(f.blob)));
    }
    out.push('--' + bnd + '--', '');
    return new Blob([out.join(CRLF)], { type: 'message/rfc822' });
  }

  function save(blob, name) {
    var u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }

  /* ---------- small guide card: what to do with the downloaded draft ---------- */
  var css = null;
  function guide(fileName, kind) {
    if (!css) {
      css = document.createElement('style');
      css.textContent = '#jedMailTip{position:fixed;z-index:2147483600;left:50%;bottom:24px;transform:translateX(-50%);width:min(440px,calc(100vw - 24px));' +
        'background:#fff;color:#0E1E36;border:1px solid #D5DBE4;border-radius:18px;padding:18px 20px 16px;direction:rtl;text-align:right;' +
        'font:500 14.5px/1.7 Tajawal,"Segoe UI",Tahoma,sans-serif;box-shadow:0 18px 50px rgba(0,30,70,.22)}' +
        '#jedMailTip b{display:block;font-size:16.5px;font-weight:700;color:#002657;margin-bottom:4px}' +
        '#jedMailTip p{margin:4px 0 0;color:#4A5870}#jedMailTip bdi{font-family:inherit;color:#002657;font-weight:700}' +
        '#jedMailTip .x{position:absolute;top:10px;left:12px;width:30px;height:30px;border:0;border-radius:10px;background:none;color:#7A8AA3;font-size:20px;cursor:pointer}' +
        '#jedMailTip .x:hover{background:#F2F5F9;color:#002657}#jedMailTip .ok{margin-top:12px;height:38px;padding:0 18px;border:0;border-radius:11px;background:#002657;color:#fff;font:600 14px Tajawal,"Segoe UI",sans-serif;cursor:pointer}';
      document.head.appendChild(css);
    }
    var old = document.getElementById('jedMailTip'); if (old) old.remove();
    var mac = /Mac/.test(navigator.platform || navigator.userAgent || '');
    var d = document.createElement('div'); d.id = 'jedMailTip'; d.setAttribute('role', 'status');
    d.innerHTML = kind === 'mailto'
      ? '<button class="x" aria-label="إغلاق">×</button><b>فتحت لك رسالة جديدة</b><p>نزّلت الملف <bdi dir="ltr"></bdi> على جهازك. ارفقه في الرسالة واضغط إرسال.</p><button class="ok">تمام</button>'
      : '<button class="x" aria-label="إغلاق">×</button><b>رسالتك جاهزة في Outlook</b><p>نزّلت لك ملف الرسالة <bdi dir="ltr"></bdi>. افتحه وبتنفتح رسالة جديدة في Outlook فيها المرفق والنص، تكتب الإيميل وترسل.</p>' +
        (mac ? '<p>إذا انفتح في تطبيق ثاني: كلك يمين على الملف ← فتح بواسطة ← <bdi>Microsoft Outlook</bdi></p>' : '<p>إذا ما انفتح في Outlook: كلك يمين على الملف ← فتح باستخدام ← <bdi>Outlook</bdi></p>') +
        '<button class="ok">تمام</button>';
    d.querySelector('bdi').textContent = fileName;
    var close = function () { d.remove(); };
    d.querySelector('.x').onclick = close; d.querySelector('.ok').onclick = close;
    document.body.appendChild(d);
    setTimeout(function () { if (d.isConnected) close(); }, 16000);
  }

  async function draft(o) {
    o = o || {};
    var files = (o.files || []).filter(function (f) { return f && f.blob; });
    // phone: share sheet with the file (pick Outlook)
    if (isPhone() && navigator.share && navigator.canShare) {
      try {
        var fl = files.map(function (f) { return new File([f.blob], f.name, { type: f.blob.type || 'application/octet-stream' }); });
        if (navigator.canShare({ files: fl })) {
          await navigator.share({ files: fl, title: o.subject || '', text: o.body || '' });
          return 'share';
        }
      } catch (e) { if (e && e.name === 'AbortError') return false; }
      // no file sharing: download the file and open a plain draft
      files.forEach(function (f) { save(f.blob, f.name); });
      location.href = 'mailto:?subject=' + encodeURIComponent(o.subject || '') + '&body=' + encodeURIComponent(o.body || '');
      guide(files.map(function (f) { return f.name; }).join('، '), 'mailto');
      return 'mailto';
    }
    var eml = await buildEml({ subject: o.subject, body: o.body, files: files, kind: o.kind });
    var nm = safeName(o.fileName || o.subject || (files[0] && files[0].name)) + '.eml';
    save(eml, nm);
    guide(nm, 'eml');
    return 'eml';
  }

  window.JEDMAIL = { draft: draft, buildEml: buildEml };
})();
