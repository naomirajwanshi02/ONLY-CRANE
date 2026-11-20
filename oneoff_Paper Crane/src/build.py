"""Assemble crane3d.html: fold engine (from crane.html) + diagram sequence + three.js renderer."""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
lines = (root / "crane.html").read_text(encoding="utf8").split("\n")
a = next(i for i, l in enumerate(lines) if l.strip() == "<script>") + 1
b = next(i for i, l in enumerate(lines) if l.startswith("function opFinale"))
eng = "\n".join(lines[a:b])


def rep(s, x, y):
    assert s.count(x) == 1, x[:70]
    return s.replace(x, y)


# collapse (2A-2D): centre stays on the table, corners rise and meet (open end up), then it tips toward you onto the table
eng = rep(eng, "const lay = comp({ R: ID.R, t: [0, SQ2 / 2 * uC, 0] }, comp(rotL([0, 0, 0], [1, 0, 0], PI / 2 * uC), rotL([0, 0, 0], [0, 0, 1], PI / 4 * uB)));",
          "const lay = comp({ R: ID.R, t: [0, SQ2 / 2 * uC, 0] }, comp(rotL([0, 0, 0], [1, 0, 0], PI / 2 * uC), rotL([0, 0, 0], [0, 0, 1], PI / 4 * uB)));")
# reverse fold: the upper layers open toward you, whichever side is up
eng = rep(eng, "function opReverse(S, { sel, P, axisDir, outDir, tip, Lmid, tag, spine, spineRef }) {",
          "function opReverse(S, { sel, P, axisDir, outDir, tip, Lmid, tag, spine, spineRef, top = \"F\" }) {")
eng = rep(eng, '(pc.tag.side === "F" ? 1 : -1) * sLift * a', '(pc.tag.side === top ? 1 : -1) * sLift * a')

seq = (root / "src" / "seq.js").read_text(encoding="utf8")
r3d = (root / "src" / "render3d.js").read_text(encoding="utf8")
mainjs = (root / "src" / "main.js").read_text(encoding="utf8")
html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Paper Crane</title>
<link rel="stylesheet" href="../_tools/news_yap/news_yap.css">
<style>
.cr-cap{{position:absolute;left:72px;right:72px;top:318px;text-align:center;z-index:30;line-height:1}}
.cr-cap .k{{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-size:28px;letter-spacing:.04em;color:#8f7a5e}}
.cr-cap .m{{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-weight:600;font-size:54px;line-height:1.24;margin-top:20px;color:#2b1e13;letter-spacing:-.01em}}
.cr-note{{position:absolute;left:72px;right:72px;top:1400px;text-align:center;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:38px;color:#5b4630;z-index:30;
  text-shadow:0 0 6px #f6eddb,0 0 14px #ecdfc6}}
#ny-stage{{background:#ecdfc6}}
#ny-stage{{cursor:pointer}}
</style>
<script type="importmap">{{"imports":{{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}}}</script>
</head><body>
<div id="ny-stage"></div>
<script src="../_tools/news_yap/news_yap.js"></script>
<script>
{eng}
function viewVec(c) {{ return [-Math.cos(c.E) * Math.sin(c.az), -Math.cos(c.E) * Math.cos(c.az), Math.sin(c.E)]; }}
{seq}
</script>
<script type="module">
{r3d}
{{
{mainjs}
}}
</script>
</body></html>
"""
(root / "crane3d.html").write_text(html, encoding="utf8")
print("built", len(html))
