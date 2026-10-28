#!/usr/bin/env python3
"""Inject the Layers Studio (layers.css + layers.js) into tools/comms/index.html.

Run from anywhere:  python3 dev/comms/build_layers.py
Safe to run again: the previous copy between the LAYERS-STUDIO markers is replaced.
"""
import pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
TARGET = ROOT / 'tools' / 'comms' / 'index.html'
BUILD = 'build 30'

css = (HERE / 'layers.css').read_text(encoding='utf-8')
js = (HERE / 'layers.js').read_text(encoding='utf-8')
css2 = (HERE / 'v2.css').read_text(encoding='utf-8')
js2 = (HERE / 'v2.js').read_text(encoding='utf-8')
css3 = (HERE / 'fmt.css').read_text(encoding='utf-8')
js3 = (HERE / 'fmt.js').read_text(encoding='utf-8')
assert '</script>' not in js and '</script>' not in js2 and '</script>' not in js3, 'scripts must not contain a closing script tag'
# v2.0: start page + share by Outlook run after the layers studio
# build 30: format painter for the announcement editor (fmt.js) runs last
block = (f'<!-- LAYERS-STUDIO -->\n<style id="lxStyle">\n{css}\n{css2}\n{css3}\n</style>\n<script id="lxScript">\n{js}\n</script>\n'
         f'<script id="v2Script">\n{js2}\n</script>\n<script id="fmtScript">\n{js3}\n</script>\n<!-- /LAYERS-STUDIO -->\n')

html = TARGET.read_text(encoding='utf-8')
html = re.sub(r'<!-- LAYERS-STUDIO -->.*?<!-- /LAYERS-STUDIO -->\n?', '', html, flags=re.S)
end = html.rfind('</body>')
assert end > 0, 'no </body> in target'
html = html[:end] + block + html[end:]
html = re.sub(r"APP_BUILD = 'build \d+'", f"APP_BUILD = '{BUILD}'", html, count=1)
TARGET.write_text(html, encoding='utf-8')
print('injected', len(block), 'bytes into', TARGET)
