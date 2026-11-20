/* timeline, camera, captions, cues and playback controls */
const CAM0 = { E: 58 * PI / 180, az: 0 }, LOW = { E: 34 * PI / 180, az: 0 }, ORBIT = { E: 30 * PI / 180, az: -32 * PI / 180 }, CAMF = { E: 20 * PI / 180, az: -34 * PI / 180 };
let t = 0; TL.forEach(e => { e.t0 = t; e.tm = t + e.lead + e.prep; t = e.tm + e.dur + e.hold; e.t1 = t; });
const END = t;
const baseOf = e => e.cam === "finale" || e.cam === "keep" ? CAMF : e.cam === "low" ? LOW : e.cam === "orbit" ? ORBIT : CAM0;
TL.forEach((e, i) => {
  if (e.cam === "keep") { e.camT = TL[i - 1].camT; return; }
  const b = baseOf(e), cb = { ...b, T: [0, 0, 0], D: 6 };
  e.camT = fitCam3(e.cam === "finale" ? [e.op.draw(0.5, cb), e.op.draw(0.7, cb), e.op.draw(0.85, cb), e.op.draw(1, cb)] : [e.op.draw(0, cb), e.op.draw(0.5, cb), e.op.draw(1, cb)], b);
});
// one steady camera per caption (widest framing of its entries), so it does not breathe on every fold
CH.forEach((ch, k) => { const a = ch.i, z = k + 1 < CH.length ? CH[k + 1].i : TL.length, es = TL.slice(a, z).filter(e => !e.cam || e.cam === "low");
  if (!es.length) return; const D = Math.max(...es.map(e => e.camT.D)), T = [0, 1, 2].map(i => es.reduce((s, e) => s + e.camT.T[i], 0) / es.length);
  es.forEach(e => { e.camT = { ...e.camT, D, T }; }); });
function camAt(t) { const i = TL.findIndex(e => t < e.t1), k = i < 0 ? TL.length - 1 : i, e = TL[k], prev = k > 0 ? TL[k - 1].camT : e.camT;
  if (e.cam === "finale") return lerpCam(prev, e.camT, io(pr(t, e.tm, e.tm + e.dur * 0.45)));
  return lerpCam(prev, e.camT, io(pr(t, e.t0, e.t0 + 0.8))); }

/* overlay: dashed fold line (draws on), arc arrow, pop rings, FLIP arrow */
const stage = document.getElementById("ny-stage");
const svg = sv("svg", { width: 1080, height: 1920, viewBox: "0 0 1080 1920" }, stage); Object.assign(svg.style, { position: "absolute", left: 0, top: 0, zIndex: 10 });
const annG = sv("g", {}, svg);
const lnGlow = sv("line", { stroke: "#fbf3e2", "stroke-width": 9, "stroke-linecap": "round" }, annG), ln = sv("line", { stroke: "#2a1d10", "stroke-width": 3.4, "stroke-dasharray": "14 11" }, annG);
const arGlow = sv("path", { fill: "none", stroke: "#fbf3e2", "stroke-width": 10, "stroke-linecap": "round" }, annG), ar = sv("path", { fill: "none", stroke: "#2a1d10", "stroke-width": 4, "stroke-linecap": "round" }, annG);
const arHead = sv("path", { fill: "#2a1d10", stroke: "#fbf3e2", "stroke-width": 2, "paint-order": "stroke" }, annG);
const crLines = [0, 1, 2, 3].map(() => [sv("line", { stroke: "#fbf3e2", "stroke-width": 8, "stroke-linecap": "round" }, annG), sv("line", { stroke: "#2a1d10", "stroke-width": 3.2, "stroke-dasharray": "14 11" }, annG)]);
const rings = [0, 1, 2, 3].map(() => sv("circle", { r: 26, fill: "none", stroke: "#c2402f", "stroke-width": 4.5 }, annG));
const note = el("div", "cr-note", "", stage); let noteKey = "";
function arrowPath(a, b) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 30) return false;
  let nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L; if (ny > 0) { nx = -nx; ny = -ny; }
  const cx = (a[0] + b[0]) / 2 + nx * L * 0.38, cy = (a[1] + b[1]) / 2 + ny * L * 0.38, sh = 0.18;
  const A2 = [lerp(a[0], cx, sh), lerp(a[1], cy, sh)], B2 = [lerp(b[0], cx, sh), lerp(b[1], cy, sh)];
  const d = `M${A2[0]} ${A2[1]}Q${cx} ${cy} ${B2[0]} ${B2[1]}`; ar.setAttribute("d", d); arGlow.setAttribute("d", d);
  const tx = B2[0] - cx, ty = B2[1] - cy, tl = Math.hypot(tx, ty), ux = tx / tl, uy = ty / tl, hs = 20;
  arHead.setAttribute("d", `M${B2[0] + ux * 8} ${B2[1] + uy * 8}L${B2[0] - ux * hs - uy * hs * 0.55} ${B2[1] - uy * hs + ux * hs * 0.55}L${B2[0] - ux * hs + uy * hs * 0.55} ${B2[1] - uy * hs - ux * hs * 0.55}Z`); return true; }
function drawAnn(e, t) {
  const op = e.op, zt = op._zTop || 0, P3z = (x, y) => proj([x, y, zt]), um = (t - e.tm) / e.dur, started = t >= e.t0 + e.lead;
  const fade = 1 - pr(t, e.tm + e.dur * 0.5, e.tm + e.dur * 0.8), ud = eo(pr(t, e.t0 + e.lead, e.t0 + e.lead + Math.max(0.15, e.prep)));
  [lnGlow, ln, arGlow, ar, arHead, ...rings, ...crLines.flat()].forEach(x => x.style.opacity = 0);
  let txt = ""; if (e.note && started) e.note.forEach(([u0, s]) => { if (um >= u0 - 1e-9) txt = s; });
  if (txt !== noteKey) { noteKey = txt; note.textContent = txt; note._t = t; }
  const nu = txt ? eo(pr(t, note._t ?? t, (note._t ?? t) + 0.35)) : 0; note.style.opacity = nu;
  if (!started) return;
  if (op.creases) { const cu = eo(pr(t, e.t0 + e.lead, e.t0 + e.lead + 0.8)) * (1 - pr(um, 0.02, 0.15));
    op.creases.forEach(([A, B], k) => { const a = P3z(A[0] * 1.08, A[1] * 1.08), b = P3z(B[0] * 1.08, B[1] * 1.08);
      crLines[k].forEach((l, j) => { l.setAttribute("x1", a[0]); l.setAttribute("y1", a[1]); l.setAttribute("x2", b[0]); l.setAttribute("y2", b[1]); l.style.opacity = cu * (j ? 1 : 0.85); }); }); }
  if (op.rings) { let k = 0; op.rings.forEach(r => { const vis = pr(um, r.u0, r.u0 + 0.04) * (1 - pr(um, r.u1 - 0.06, r.u1));
    const pts = r.track && um > 0 ? r.track(clamp(um)) : r.pts.map(q => [q[0], q[1], (q[2] || 0) + zt]);
    pts.forEach(q => { const c = rings[k++]; if (!c) return; const s = proj(q); c.setAttribute("cx", s[0]); c.setAttribute("cy", s[1]); c.style.opacity = vis; }); }); }
  if (t > e.tm + e.dur * 0.8 || op.posedOp) return;
  if (op.line) { const [A, B] = op.line, d = n2([B[0] - A[0], B[1] - A[1]]), ext = 0.12;
    const a = P3z(A[0] - d[0] * ext, A[1] - d[1] * ext), b0 = P3z(B[0] + d[0] * ext, B[1] + d[1] * ext), b = [lerp(a[0], b0[0], ud), lerp(a[1], b0[1], ud)];
    [lnGlow, ln].forEach(l => { l.setAttribute("x1", a[0]); l.setAttribute("y1", a[1]); l.setAttribute("x2", b[0]); l.setAttribute("y2", b[1]); });
    ln.style.opacity = fade; lnGlow.style.opacity = fade * 0.85; }
  if (op.arrow && arrowPath(proj(add(op.arrow[0], [0, 0, zt])), proj(add(op.arrow[1], [0, 0, zt])))) { [ar, arHead].forEach(x => x.style.opacity = ud * fade); arGlow.style.opacity = ud * fade * 0.85; }
  if (op.flip) { const c = proj([0, -1.2, 0]), r = 120, p0 = [c[0] + r, c[1]], p1 = [c[0] - r, c[1]];
    const d = `M${p0[0]} ${p0[1]}Q${c[0]} ${c[1] + 70} ${p1[0]} ${p1[1]}`; ar.setAttribute("d", d); arGlow.setAttribute("d", d);
    arHead.setAttribute("d", `M${p1[0] - 6} ${p1[1] - 10}L${p1[0] + 22} ${p1[1] - 2}L${p1[0] + 4} ${p1[1] + 20}Z`);
    [ar, arHead].forEach(x => x.style.opacity = ud * fade); arGlow.style.opacity = ud * fade * 0.85; }
}

/* captions: step label + the diagram's own words; REPEAT tag on the second play */
const capA = el("div", "cr-cap", "", stage), capB = el("div", "cr-cap", "", stage);
CH.forEach(c => { c.t = TL[c.i].t0; });
const capHTML = c => c ? `<div class="k">${c.k}</div><div class="m">${c.m}</div>` : "";
let capKey = -1;
function drawCap(t) { let k = 0; CH.forEach((c, i) => { if (t >= c.t) k = i; });
  const c = CH[k], prev = CH[k - 1];
  if (capKey !== k) { capKey = k; capA.innerHTML = capHTML(c); capB.innerHTML = capHTML(prev); }
  const u = eo(pr(t, c.t, c.t + 0.3)); capA.style.opacity = u; capA.style.translate = `0 ${(1 - u) * 18}px`; capB.style.opacity = 1 - pr(t, c.t, c.t + 0.18); }

function render(t) {
  const cam = camAt(t), i = TL.findIndex(e => t < e.t1), e = TL[i < 0 ? TL.length - 1 : i], u = pr(t, e.tm, e.tm + e.dur);
  drawPaper(e.op, e.op.draw(u, cam), cam, u);
  drawAnn(e, t); drawCap(t);
  stage.style.setProperty("--intro", eo(pr(t, 0, 0.6)));
}
console.log("TL", END.toFixed(2), JSON.stringify(CH.map(c => [c.k + (c.again ? "*" : ""), +c.t.toFixed(2)])));
NY.mount({ end: END, render });

/* pause anywhere: tap/click toggles pause, ← → jump between steps, the bar at the bottom shows on hover */
{ const btn = document.querySelector("#ny-ctl button"), range = document.querySelector("#ny-ctl input[type=range]");
  stage.addEventListener("click", () => btn && btn.click());
  const starts = CH.map(c => c.t);
  addEventListener("keydown", ev => { if (ev.code !== "ArrowLeft" && ev.code !== "ArrowRight") return;
    const now = +range.value; let k = starts.findIndex(s => s > now + 0.05); if (k < 0) k = starts.length;
    const to = ev.code === "ArrowRight" ? starts[k] ?? END - 0.01 : starts[Math.max(0, k - 2)];
    if (btn.textContent === "Pause") btn.click(); NY.seek(to); }); }
