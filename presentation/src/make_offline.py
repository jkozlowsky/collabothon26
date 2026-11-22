"""Builds the offline Atlas pitch: one HTML file with libraries, map and font embedded, plus a clips/ folder.

Usage (from presentation/src):
  python3 make_offline.py                     # writes ../atlas-pitch.html and makes sure ../clips/ exists
  python3 make_offline.py atlas-pitch-b.html  # writes ../atlas-pitch-b.html
"""
import base64, json, pathlib, re, shutil, sys

here = pathlib.Path(__file__).resolve().parent
out_dir = here.parent
src_name = sys.argv[1] if len(sys.argv) > 1 else 'atlas-pitch.html'
s = (here / src_name).read_text()

def once(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)

font = base64.b64encode((here / 'inter-latin.woff2').read_bytes()).decode()
once('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">',
     "<style>@font-face{font-family:'Inter';font-style:normal;font-weight:400 800;font-display:swap;"
     f"src:url(data:font/woff2;base64,{font}) format('woff2');}}</style>")
for tag, name in [('<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>', 'd3.min.js'),
                  ('<script src="https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js"></script>', 'topojson.min.js')]:
    code = (here / name).read_text()
    assert '</script' not in code.lower()
    once(tag, f'<script>{code}</script>')
emblem = base64.b64encode((here / 'commerzbank-emblem.png').read_bytes()).decode()
once('src="commerzbank-emblem.png"', f'src="data:image/png;base64,{emblem}"')
# Local fonts referenced as url('x.woff2') (variant B's serif)
s = re.sub(r"url\('([\w.-]+\.woff2)'\)",
           lambda m: "url(data:font/woff2;base64," + base64.b64encode((here / m.group(1)).read_bytes()).decode() + ")", s)
land = json.dumps(json.loads((here / 'land-110m.json').read_text()), separators=(',', ':'))
assert '</' not in land
once("  fetch('land-110m.json')\n    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))",
     "  Promise.resolve(LAND_TOPOLOGY)")
once('<script>\n(() => {', f'<script>const LAND_TOPOLOGY = {land};</script>\n<script>\n(() => {{')
once('  // Land shapes: Natural Earth 1:110m via world-atlas, published beside this page.',
     '  // Land shapes: Natural Earth 1:110m (public domain) via world-atlas, embedded in this file.')
once('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
head = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<!-- Atlas pitch, offline build: needs no network. App recordings load from clips/ next to this file. '
        'd3 (ISC), topojson-client (ISC), world-atlas / Natural Earth (public domain), Inter (SIL OFL 1.1). -->\n')
body_start = s.index('<div class="stage"')
s = head + s[:body_start] + '</head>\n<body>\n' + s[body_start:] + '\n</body>\n</html>\n'
(out_dir / src_name).write_text(s)
(out_dir / 'clips').mkdir(exist_ok=True)
print(out_dir / src_name, round(len(s.encode()) / 1024), 'KB')
