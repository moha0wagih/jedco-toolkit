# صانع العروض 2 — Layout authoring guide

You are adding premium slide layouts for Jeddah Airports (JEDCO) to an offline presentation tool.
Each layout turns a structured slide spec into positioned objects on a 960×540 pt canvas.

## Files
- Engine: `src/new/00_core.js` (builders P, T, R, E, Ln, Img, Ic, Logo, Veil, measuring), `src/new/02_layout.js` (PM.def, chrome, head, groupK/tk, shape, coverage), `src/new/05_chart.js` (PM.Chart, PM.Table).
- Existing families to learn from (read them fully before writing): `src/new/lib/10_items.js`, `11_kpis.js`, `12_steps.js`, `13_text.js`, `14_media.js`, `15_struct.js`, `16_mix.js`.
- Write ONLY your own new file(s) under `src/new/lib/` with the name you were given. Never edit other files.
- Test harness: `test/gallery.html` + `test/shot.py` + `test/samples.js` (do not edit gallery.html/samples.js; if you need extra sample specs, create `test/samples_<yourname>.js` and a copy of the gallery `test/gallery_<yourname>.html` that loads it).
  Render: `cd test && python3 shot.py '{"lang":"ar","fam":"<fam>","only":["<blockkind>"],"scale":0.5}' shots/x.png` then view the PNG.
  After adding a file to lib, the gallery must load it: regenerate the lib script tags in YOUR gallery copy.
  Output JSON lists each layout with `ov` (overflow/overlap count) and `miss` (content dropped). Both must be 0/empty for every layout on every sample, in `ar` and `en`, `dark:false` and `dark:true`.

## Authoring model
- Author in LEFT-TO-RIGHT coordinates (English orientation: logo on the left). The engine mirrors everything for Arabic automatically. Never branch on language for positions (except struct layouts which set noMirror).
- Content box: `G.X0=64 … G.X1=904`, `G.TOP=56`, `G.BOT=494`. Page number sits at y 508.
- Start every content layout with `PM.chrome(c, o)` (background, tiny logo top corner, page number — no edge bar since v2.3) or, for full-bleed photo layouts, `PM.photoBlock(...)` + `PM.chromeOnPhoto(c, o)`.
- Header: `PM.head(c, sp, o, {...})` or `PM.itemsArea(c, sp, o)` (header + lead paragraph + block label). Use itemsArea whenever the spec may have a lead paragraph.
- Siblings (cards, columns, rows) MUST share one text scale: build paragraph lists, compute `k = PM.groupK(boxes, maxK)`, then draw each with `PM.tk(x, y, w, ps, k)`. Measure with `PM.hK(ps, w, k)` to size containers to content and to balance vertically with `PM.place(top, bottom, h, bias)`.
- Text helpers: `PM.tx.title/sub/eyebrow/h/body/num/label/cap`, items: `PM.ips(c, it, i)` (title/text/bullets of item i with correct binds), `PM.its(sp)` (items with bare short lines promoted to titles).
- Every paragraph must carry its `bind` path (exactly like the existing families: `'main.items.' + i + '.title'`, `'title'`, `'sub'`, `'eyebrow'`, `'lead'`, `'main.text'` …). The coverage check rejects any layout that drops content.
- `accepts(sp, c)` returns 0 when the layout cannot show the content well (wrong form, too many items, too many words) and otherwise a score 0.6–0.9. Be strict: a layout that looks bad with 6 items must refuse 6 items.
- Use `sp.form` (items|kpis|steps|timeline|bullets|para|quote|compare|table|chart|photo), `sp.n`, `sp.maxItemWords`, `sp.words`, `sp.hasBullets`, `sp.allTitled`, `sp.lead`, `sp.imgs`, `sp.textWords`.
- Register: `PM.def(fam, id, arabicName, { forms:[...], tags:['…'], accepts, render, tones:['light','dark'] })`. ids must be unique and prefixed with your family prefix (given to you). Arabic names must be short, clear and distinct (they appear in the library).
- Colours ONLY from the tone object `c.tone` (title, body, muted, accent, rule, cardFill, icon, bg, num) and brand constants `K.NAVY 002657, K.BLUE 004EAA, K.SKY 62B6F3, K.WHITE`. Secondary colours (teal/orange/purple) only inside charts.
- Fonts are automatic: Arabic → Tajawal, English titles → Sequel, English body → FS Industrie, every number → Sequel (`tx.num`).

## Moe's design rules (non-negotiable)
- Premium, cinematic, calm, high-end. Generous whitespace but content must feel substantial (no tiny text floating in emptiness). Balanced: never a big empty half.
- Rounded corners on boxes (r 12–16). NO drop shadows. NO slanted/diagonal shapes or cuts. NO parallelogram badges. NO progress/number strips across the top.
- NO icons or numbers inside white circles with blue rings. Icons are free line icons with no frame (PM.Ic). Filled solid dots with a number inside are fine.
- Avoid filled boxes behind body text unless the layout is explicitly a "cards" variant; prefer hairlines (0.75pt rules), whitespace and big Sequel numerals.
- Photos go edge to edge (full-bleed or full-height halves/bands touching the slide edges). Never tall photos floating as rounded cards beside text. Rounded photo tiles are OK only in multi-photo grids.
- Logo stays tiny in its corner (chrome handles it). Don't add extra logos.
- Text never overlaps; nothing sits outside the slide; all siblings same size.
- Dark versions are real designs (navy background), not inverted light ones.

## What makes a layout distinct
Each new layout must be visibly different from every existing one (composition, rhythm, emphasis) — not a colour swap. Think magazine/annual-report art direction: asymmetric grids, oversized numerals, hairline structures, photo bands, split panels, editorial typography.

## Done = 
Your file loads without console errors, every layout renders with ov=0 and miss=[] on the relevant samples in ar+en and light+dark, you looked at the renders yourself and fixed anything ugly, and you report the list of layout ids with one line each.
