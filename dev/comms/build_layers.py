#!/usr/bin/env python3
"""Inject the Layers Studio (layers.css + layers.js) into tools/comms/index.html.

Run from anywhere:  python3 dev/comms/build_layers.py
Safe to run again: the previous copy between the LAYERS-STUDIO markers is replaced.
"""
import pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
TARGET = ROOT / 'tools' / 'comms' / 'index.html'
BUILD = 'build 35'

css = (HERE / 'layers.css').read_text(encoding='utf-8')
js = (HERE / 'layers.js').read_text(encoding='utf-8')
css2 = (HERE / 'v2.css').read_text(encoding='utf-8')
js2 = (HERE / 'v2.js').read_text(encoding='utf-8')
css3 = (HERE / 'fmt.css').read_text(encoding='utf-8')
js3 = (HERE / 'fmt.js').read_text(encoding='utf-8')
css4 = (HERE / 'v3.css').read_text(encoding='utf-8')
js4 = (HERE / 'v3.js').read_text(encoding='utf-8')
css5 = (HERE / 'tcol.css').read_text(encoding='utf-8')
js5 = (HERE / 'tcol.js').read_text(encoding='utf-8')
css6 = (HERE / 'ui4.css').read_text(encoding='utf-8')
js6 = (HERE / 'ui4.js').read_text(encoding='utf-8')
css7 = (HERE / 'cert.css').read_text(encoding='utf-8')
js7 = (HERE / 'conv.js').read_text(encoding='utf-8')
js8 = (HERE / 'cert.js').read_text(encoding='utf-8')
js9 = (HERE / 'titles2.js').read_text(encoding='utf-8')
import base64
def b64(name, mime):
    return f'data:{mime};base64,' + base64.b64encode((HERE / 'cert' / name).read_bytes()).decode()
cert_assets = ('window.CERT_ASSETS = {' + f'bg:"{b64("bg.jpg", "image/jpeg")}",titleAr:"{b64("title_ar.png", "image/png")}",sig:"{b64("sig_default.png", "image/png")}"' + '};')
assert '</script>' not in js and '</script>' not in js2 and '</script>' not in js3 and '</script>' not in js4 and '</script>' not in js5 and '</script>' not in js6 and '</script>' not in js7 and '</script>' not in js8 and '</script>' not in js9, 'scripts must not contain a closing script tag'
# v2.0: start page + share by Outlook run after the layers studio
# build 35: titles2.js — each header title can be one or two lines on its own, lines below move down
# build 34: conv.js — change an element's type (text ↔ cards ↔ list …); cert.js — certificate template (AR/EN, logo choice, signature upload, PNG/PDF, many names)
# build 33: ui4 — tidy top bar (no overflow), home/notes beside the title, calmer side panel; menu-clamp freeze fixed
# build 32: tcol.js — colour for the selected words (announcement bar + layers bar)
# build 31: v3.js — export weight fix, project tabs + copy/paste, free artboard, presentation bar
# build 30: format painter for the announcement editor (fmt.js) runs last
block = (f'<!-- LAYERS-STUDIO -->\n<style id="lxStyle">\n{css}\n{css2}\n{css3}\n{css4}\n{css5}\n{css6}\n{css7}\n</style>\n<script id="lxScript">\n{js}\n</script>\n'
         f'<script id="v2Script">\n{js2}\n</script>\n<script id="fmtScript">\n{js3}\n</script>\n<script id="v3Script">\n{js4}\n</script>\n<script id="tcolScript">\n{js5}\n</script>\n<script id="ui4Script">\n{js6}\n</script>\n<script id="convScript">\n{js7}\n</script>\n<script id="certAssets">\n{cert_assets}\n</script>\n<script id="certScript">\n{js8}\n</script>\n<script id="titlesScript">\n{js9}\n</script>\n<!-- /LAYERS-STUDIO -->\n')

html = TARGET.read_text(encoding='utf-8')
html = re.sub(r'<!-- LAYERS-STUDIO -->.*?<!-- /LAYERS-STUDIO -->\n?', '', html, flags=re.S)
end = html.rfind('</body>')
assert end > 0, 'no </body> in target'
html = html[:end] + block + html[end:]
html = re.sub(r"APP_BUILD = 'build \d+'", f"APP_BUILD = '{BUILD}'", html, count=1)
TARGET.write_text(html, encoding='utf-8')
print('injected', len(block), 'bytes into', TARGET)
