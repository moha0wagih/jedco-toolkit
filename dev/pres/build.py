#!/usr/bin/env python3
"""Assemble صانع العروض 2 into jedco-toolkit/tools/pres/index.html (offline, single page + template scripts)."""
import re, json, glob, base64, os, sys
import os as _o; ROOT = _o.path.dirname(_o.path.abspath(__file__))
OLD = ROOT + '/src/old'
NEW = ROOT + '/src/new'
OUT = sys.argv[1] if len(sys.argv) > 1 else _o.path.join(ROOT, '..', '..', 'tools', 'pres', 'index.html')

def rd(p): return open(p, encoding='utf-8').read()
fonts = rd(ROOT + '/src/fonts.css')
css = rd(NEW + '/app.css')
html = rd(NEW + '/app.html')
jszip = rd(OLD + '/script1.js')
icons = rd(OLD + '/script2.js')
engine = rd(OLD + '/script3.js')
rest = rd(OLD + '/script6_rest.js')
m = re.search(r'const LOGO = (`[\s\S]*?`);', rest)
logo = m.group(1)
# background previews of the official template slides + brand photos
s6 = rd(OLD + '/script6.js')
bg = json.loads(re.search(r'const BG = (\{.*?\});\n', s6, re.S).group(1))
stock = json.loads(re.search(r'const STOCK = (\[.*?\]);\n', s6, re.S).group(1))
sizes = []
from PIL import Image
for i in range(len(stock)):
    im = Image.open(OLD + f'/bg/stock{i}.jpg'); sizes.append({'w': im.size[0], 'h': im.size[1]})
data = 'window.PM = window.PM || {};\nPM.LOGO = ' + logo + ';\nPM.BG = ' + json.dumps(bg) + ';\nPM.STOCK = ' + json.dumps(stock) + ';\nPM.STOCK_SIZE = ' + json.dumps(sizes) + ';\n'
mods = [NEW + f for f in ['/00_core.js', '/01_analyze.js', '/02_layout.js', '/04_render.js', '/05_chart.js']]
mods += sorted(glob.glob(NEW + '/lib/*.js'))
mods += [NEW + f for f in ['/30_state.js', '/31_editor.js', '/36_text.js', '/37_photos.js', '/33_import.js', '/34_export.js', '/32_ui.js', '/35_imagegen.js', '/38_dock.js', '/39_brain.js']]
app = '\n'.join(f'/* ---- {os.path.relpath(p, NEW)} ---- */\n' + rd(p) for p in mods)
boot = r'''
(function () {
  PM.ICONS = ICONS;
  function dropCover() { var c = document.getElementById('hubCover'); if (c) { c.classList.add('out'); setTimeout(function () { c.remove(); }, 300); } }
  function go() {
    var faces = ['400 16px SanTaj', '700 16px SanTaj', '400 16px SanSeq', '400 16px SanFSI'];
    var p = document.fonts && document.fonts.load ? Promise.all(faces.map(function (f) { return document.fonts.load(f, 'aب1'); })) : Promise.resolve();
    var t = new Promise(function (r) { setTimeout(r, 2500); });
    Promise.race([p, t]).then(function () { PM.fontsReady = true; PM.UI.init(); dropCover(); }).catch(function () { PM.UI.init(); dropCover(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
'''
page = f'''<!doctype html>
<html lang="ar" dir="rtl" data-hub-autosave>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#002657">
<title>صانع العروض</title>
<script src="../../shared/hub.js"></script>
<style>
{fonts}
{css}
</style>
</head>
<body>
{html}
<script>
{jszip}
</script>
<script>
{icons}
</script>
<script>
{engine}
</script>
<script src="tpl_ar.js"></script>
<script src="tpl_en.js"></script>
<script src="photos/lib.js"></script>
<script>
{data}
</script>
<script>
{app}
{boot}
</script>
</body>
</html>
'''
open(OUT, 'w', encoding='utf-8').write(page)
print('wrote', OUT, round(len(page.encode('utf-8')) / 1e6, 2), 'MB', len(mods), 'modules')
