/* ---------- extra ops for the diagram sequence ---------- */
// several folds opened together (no 3-2-1 unfolding)
function opUnfoldMany(S, fs, win) {
  const g = new Map(), wv = new Map(); fs.forEach((f, i) => { wv.set(f, win ? win[i] : [0, 1]); f.fold.oldM.forEach((m, id) => g.set(id, f)); });
  const end = S.map(pc => { const f = g.get(pc.id); return f ? { ...pc, M: f.fold.oldM.get(pc.id), L: f.fold.oldL.get(pc.id) } : pc; });
  const mov = new Set(g.keys());
  return { pre: S, end, mov, arrow: [meanC(S, mov), meanC(end, mov)],
    draw(u) { return S.map(pc => { const f = g.get(pc.id); if (!f) return { pc, M: pc.M, key: pc.L };
      const w = wv.get(f); return { pc, M: comp(rotL(f.fold.P3, f.fold.D3, -f.fold.sign * PI * io(pr(u, w[0], w[1]))), pc.M), key: 1e6 + pc.L }; }); } };
}
// turn the model on the table about a point
function opTurn(S, c, ang) {
  const R = a => rotL([c[0], c[1], 0], [0, 0, 1], a);
  return { pre: S, end: S.map(pc => ({ ...pc, M: comp(R(ang), pc.M) })), turn: true,
    draw(u) { const r = R(ang * io(u)); return S.map(pc => ({ pc, M: comp(r, pc.M), key: pc.L })); } };
}
// rotate groups of pieces in the paper plane about a pivot each (push in: the two points part)
function opSpread(S, groups) {
  const gOf = pc => groups.find(g => g.sel(pc, cent(W2(pc))));
  const map = new Map(S.map(pc => [pc.id, gOf(pc)]));
  const R = (g, a) => rotL([g.pivot[0], g.pivot[1], 0], [0, 0, 1], g.ang * a);
  return { pre: S, end: S.map(pc => { const g = map.get(pc.id); return g ? { ...pc, M: comp(R(g, 1), pc.M) } : pc; }),
    rings: [{ pts: [groups[0].pivot], u0: -1, u1: 0.5 }],
    draw(u) { return S.map(pc => { const g = map.get(pc.id); return { pc, M: g ? comp(R(g, io(u)), pc.M) : pc.M, key: pc.L }; }); } };
}
// lift a flap a little about a line and press it back (8B: press both sides flat)
function opPress(S, groups) {
  const map = new Map(); groups.forEach(g => S.forEach(pc => { if (g.sel(pc)) map.set(pc.id, g); }));
  return { pre: S, end: S,
    draw(u) { const a = Math.sin(PI * io(u)); return S.map(pc => { const g = map.get(pc.id);
      return { pc, M: g ? comp(rotL(g.P3, g.D3, g.ang * a), pc.M) : pc.M, key: g ? 1e6 + pc.L : pc.L }; }); } };
}
// show a finished op state through a pose (head fold on the standing crane)
const posed = (op, pose) => ({ ...op, draw: (u, cam) => op.draw(u, cam).map(it => ({ ...it, M: pose(it.pc, it.M) })), posedOp: true });

/* finale: wings swing out sideways, the crane stands up */
function makePose(S, { K1, K2, wings }) {
  const D3 = [...n2([K2[0] - K1[0], K2[1] - K1[1]]), 0], P3 = [K1[0], K1[1], 0];
  return u => { const st = rotL([0, K1[1], 0], [1, 0, 0], PI / 2 * io(pr(u, 0.3, 1))), wu = io(pr(u, 0, 0.7));
    return (pc, M = pc.M) => { const w = wings.get(pc.tag.petal);
      if (w) M = comp(rotL(P3, D3, w.sign * (PI / 2 + 0.5) * wu), M);
      return comp(st, M); }; };
}
function opFinale(S, args) {
  const pose = makePose(S, args), pe = pose(1);
  return { pre: S, end: S.map(pc => ({ ...pc, M: pe(pc) })), finale: true, pose,
    rings: [{ pts: [args.press], u0: 0.55, u1: 1.05 }],
    draw(u) { const f = pose(u); return S.map(pc => ({ pc, M: f(pc), key: pc.L })); } };
}

/* ---------- the sequence, page by page as in the diagrams ---------- */
const sq = [mk([[-1, -1], [1, -1], [1, 1], [-1, 1]], ID, 0, {})];
const TL = [];
let S = sq;
const CH = [];
let chStart = 0;
const chapter = (k, m) => { CH.push({ i: TL.length, k, m }); };
const push = (op, o = {}) => { TL.push({ op, lead: o.lead ?? 0, prep: o.prep ?? (op.line ? 0.55 : 0.15), dur: o.dur ?? 1.15, hold: o.hold ?? 0.4, cam: o.cam, note: o.note || null }); S = op.end; return op; };
// every page plays, then plays once more from its start, then the next page
let pageStart = 0, pageS = null;
const page = () => { pageStart = TL.length; pageS = S; };
const repeat = () => { const n = TL.length - pageStart; const startCh = CH.length;
  const chs = CH.filter(c => c.i >= pageStart);
  chs.forEach(c => CH.push({ i: TL.length + (c.i - pageStart), k: c.k, m: c.m, again: true }));
  for (let j = 0; j < n; j++) { const e = TL[pageStart + j]; TL.push({ ...e, lead: j === 0 ? 0.6 : e.lead }); }
  S = TL[TL.length - 1].op.end; };

const O = [0, SQ2 / 2], C = [0, -SQ2 / 2], M1 = [-SQ2 / 2, 0], M2 = [SQ2 / 2, 0];
const K1 = [M1[0] + (O[0] - M1[0]) * (SQ2 - 1), M1[1] + (O[1] - M1[1]) * (SQ2 - 1)], K2 = [-K1[0], K1[1]];
const yk = K1[1], X = [0, yk];
const r2 = o => o.rank < 2;
const kiteL = () => opFold(S, { A: C, B: K1, ref: M1, sel: r2 }), kiteR = () => opFold(S, { A: C, B: K2, ref: M2, sel: r2 });
const topFold = () => opFold(S, { A: [K1[0] - 0.2, yk], B: [K2[0] + 0.2, yk], ref: O, sel: r2 });

// (1) colour side up: fold in half both ways; flip; both diagonals on the white side
page(); chapter("Step 1", "Colour side up. Fold in half and open, both ways.");
let f;
push(opHold(S), { dur: 1.6, hold: 0 });
f = push(opFold(S, { A: [-1.05, 0], B: [1.05, 0], ref: [0, 1] })); push(opUnfold(S, f), { prep: 0, dur: 0.85 });
f = push(opFold(S, { A: [0, -1.05], B: [0, 1.05], ref: [-1, 0] })); push(opUnfold(S, f), { prep: 0, dur: 0.85, hold: 0.6 });
chapter("Step 1", "Turn it over. Fold both diagonals and open.");
push(opFlip(S), { lead: 0.8, dur: 1.2 });
f = push(opFold(S, { A: [-1, -1], B: [1, 1], ref: [-1, 1] })); push(opUnfold(S, f), { prep: 0, dur: 0.85 });
f = push(opFold(S, { A: [1, -1], B: [-1, 1], ref: [1, 1] })); push(opUnfold(S, f), { prep: 0, dur: 0.85, hold: 0.8 });

// (2) collapse along the creases into the square base (white side up, corners rise and meet)
page(); chapter("Step 2", "Bring the corners together along the creases into a square.");
push(opCollapse(S), { lead: 0.9, prep: 1.4, dur: 6.0, hold: 1.4, cam: "low", note: [[0.74, "Lay it flat, open end down."]] });

// (3)-(4) per side, as in the video: edges to the centre, top down, open the three folds, lift the bottom point
function sideSteps(n, fast) {
  const sp = fast ? { prep: 0.35, dur: 0.85, hold: 0.25 } : {};
  chapter("Step 3", n === 1 ? "Fold the lower edges of the top layer to the centre line." : "Other side: edges to the centre line.");
  const kL = push(kiteL(), { lead: 0.9, ...sp }), kR = push(kiteR(), sp);
  chapter("Step 3", n === 1 ? "Fold the top triangle down over them." : "Other side: top triangle down.");
  const tp = push(topFold(), { lead: 0.6, ...sp, hold: 0.6 });
  chapter("Step 4", n === 1 ? "Open these three folds again." : "Other side: open them again.");
  push(opUnfoldMany(S, [tp, kL, kR], [[0, 0.55], [0.35, 1], [0.35, 1]]), { lead: 0.6, dur: fast ? 1.4 : 1.8, hold: 0.5 });
  chapter("Step 4", n === 1 ? "Lift the bottom point of the top layer up. The sides fold in." : "Other side: lift the point, sides in.");
  push(opPetal(S, { K1, K2, C, tagN: n }), { lead: 0.6, prep: 0.6, dur: fast ? 3.6 : 4.6, hold: 1.0 });
}
sideSteps(1, false);
chapter("Step 4", "Turn it over.");
push(opFlip(S), { lead: 0.6, dur: 1.2 });
sideSteps(2, true);

// (5) fold along the lines on both sides
const dCK = Math.hypot(K1[0] - C[0], K1[1] - C[1]), dCX = Math.hypot(X[0] - C[0], X[1] - C[1]);
const N1 = [lerp(X[0], K1[0], dCX / (dCX + dCK)), yk], N2 = [-N1[0], yk];
const legSel = o => o.rank < 2 && o.c[1] < yk - 1e-4;
page(); chapter("Step 5", "Fold the lower edges to the centre line, both sides.");
push(opFold(S, { A: C, B: N1, ref: K1, sel: legSel }), { lead: 0.9 }); push(opFold(S, { A: C, B: N2, ref: K2, sel: legSel }));
push(opFlip(S), { dur: 1.2 });
push(opFold(S, { A: C, B: N1, ref: K1, sel: legSel })); push(opFold(S, { A: C, B: N2, ref: K2, sel: legSel }), { hold: 0.8 });

// (6) as in the video: fold each thin point up between the layers (inside reverse fold), neck and tail
const midL = () => { const F = S.filter(p => p.tag.side === "F").map(p => p.L), B = S.filter(p => p.tag.side === "B").map(p => p.L);
  return Math.min(...F) > Math.max(...B) ? (Math.min(...F) + Math.max(...B)) / 2 : (Math.min(...B) + Math.max(...F)) / 2; };
const topSide = () => { const F = S.filter(p => p.tag.side === "F").map(p => p.L), B = S.filter(p => p.tag.side === "B").map(p => p.L); return Math.min(...F) > Math.max(...B) ? "F" : "B"; };
const legAxis = sgn => { const top = [sgn * Math.abs(N1[0]) / 2, yk], a = n2([C[0] - top[0], C[1] - top[1]]);
  const P = [top[0] + (C[0] - top[0]) * 0.2, top[1] + (C[1] - top[1]) * 0.2]; return { top, a, P, len: Math.hypot(C[0] - P[0], C[1] - P[1]) }; };
const NECK = 112 * PI / 180, la = legAxis(-1), ra = legAxis(1);
const RN = [[0, "Open the layers a little."], [0.24, "Push the point up between them."], [0.8, "Close it flat."]];
page(); chapter("Step 6", "Fold one thin point up, inside the layers.");
push(opReverse(S, { sel: (o, pc) => o.c[0] < 0 && o.c[1] < yk - 1e-4, P: la.P, axisDir: la.a, outDir: [Math.cos(NECK), Math.sin(NECK)], tip: C, Lmid: midL(), tag: { neck: 1 },
  spine: { P: X, D: la.a }, spineRef: la.top, top: topSide() }), { lead: 0.9, prep: 0.7, dur: 3.6, hold: 0.6, note: RN });
chapter("Step 6", "Do the same with the other point.");
push(opReverse(S, { sel: (o, pc) => o.c[0] > 0 && o.c[1] < yk - 1e-4, P: ra.P, axisDir: ra.a, outDir: [Math.cos(PI - NECK), Math.sin(PI - NECK)], tip: C, Lmid: midL(), tag: { tail: 1 },
  spine: { P: X, D: ra.a }, spineRef: ra.top, top: topSide() }), { lead: 0.6, prep: 0.5, dur: 2.8, hold: 0.8 });

// (7) fold both wings down
const petalL = n => { const a = S.filter(p => p.tag.petal === n).map(p => p.L); return a.reduce((x, y) => x + y, 0) / a.length; };
const wingFold = (n, mountain) => opFold(S, { A: [K1[0] - 0.3, yk], B: [K2[0] + 0.3, yk], ref: [0, yk + 1], sel: (o, pc) => pc.tag.petal === n, mountain });
const fp = petalL(1) > petalL(2) ? 1 : 2, bp = 3 - fp;
page(); chapter("Step 7", "Fold the front wing down.");
const wF = push(wingFold(fp, false), { lead: 0.9 });
chapter("Step 7", "Fold the back wing down too.");
const wB = push(wingFold(bp, true), { lead: 0.5, hold: 0.8 });

// (8) head: fold the tip of one point down inside
const nd = [Math.cos(NECK), Math.sin(NECK)], nTip = [la.P[0] + nd[0] * la.len, la.P[1] + nd[1] * la.len];
const hP = [la.P[0] + nd[0] * la.len * 0.72, la.P[1] + nd[1] * la.len * 0.72], HEAD = 200 * PI / 180;
page(); chapter("Step 8", "Fold the tip of one point down for the head.");
{ const nl = S.filter(p => p.tag.neck).map(p => p.L);
  push(opReverse(S, { sel: (o, pc) => !!pc.tag.neck, P: hP, axisDir: nd, outDir: [Math.cos(HEAD), Math.sin(HEAD)], tip: nTip, Lmid: (Math.min(...nl) + Math.max(...nl)) / 2, tag: { head: 1 },
    spine: { P: la.P, D: nd }, spineRef: [la.P[0] + nd[0] * 0.3 + nd[1] * 0.05, la.P[1] + nd[1] * 0.3 - nd[0] * 0.05], top: topSide() }),
    { lead: 0.9, prep: 0.6, dur: 2.8, hold: 0.8, note: [[0, "Open the point a little."], [0.24, "Push the tip down inside."], [0.8, "Close it flat."]] }); }

// (9) pull the wings out, the crane stands
page(); chapter("Step 9", "Pull the wings out gently and shape the body.");
const wings = new Map([[fp, { sign: -wF.fold.sign }], [bp, { sign: -wB.fold.sign }]]);
const fin = push(opFinale(S, { K1, K2, wings, press: [0, yk - 0.2] }), { lead: 0.9, prep: 0.2, dur: 4.2, hold: 0.4, cam: "finale" });
chapter("Done", "Your paper crane is ready.");
push({ pre: fin.pre, end: fin.end, draw: (u, cam) => fin.draw(1, cam), finale: true }, { dur: 4.0, hold: 0, cam: "keep" });
