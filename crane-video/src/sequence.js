// The folding sequence: 24 steps from the reference sheet, plus the finished crane.
import * as G from './geom.js';
import * as E from './engine.js';

const S2 = Math.SQRT1_2;
const d2 = (a) => [Math.cos(a), Math.sin(a)];
const deg = Math.PI / 180;

// Tunables for the last steps (world units: the square base is 1 tall, O at (0,0), C at (0,-1)).
export const CFG = {
  legAngle: 24 * deg, // neck and tail lean out from vertical after the reverse folds
  yP: -0.30, // where the reverse-fold line meets the spine
  wingY: 0.004, // wing fold line
  headLen: 0.17,
  headAngle: 228 * deg,
  wingOpen: 104 * deg,
};

export function buildSequence() {
  const beats = []; // {step, caption, note, op, u0, u1, dur, lead, hold, ann}
  let state = [E.piece([[0, -1], [1, 0], [0, 1], [-1, 0]], [1, 0, 0, 1], [0, 0], 0, {})];
  let prevPost = state;
  let step = '';
  let caption = '';
  let note = '';
  const set = (s, c, n = '') => { step = s; caption = c; note = n; };
  const push = (op, o = {}) => {
    const b = {
      step, caption: o.caption || caption, note: o.note !== undefined ? o.note : note,
      op, pre: prevPost, u0: o.u0 ?? 0, u1: o.u1 ?? 1, dur: o.dur ?? 1.6, lead: o.lead ?? 0.7, hold: o.hold ?? 0.5,
      easeBeat: !!o.easeBeat, holdCaption: o.holdCaption, ann: o.ann || {}, cam: o.cam || {},
    };
    beats.push(b);
    if (b.u1 >= 1) { state = op.post; prevPost = op.post; }
    return op;
  };
  const fold = (parts, o) => push(E.foldOp(state, parts), o);
  const unfold = (op, o) => push(E.unfoldOp(state, op.rec, o && o.wins), o);
  const flip = (o) => push(E.flipOp(state), { dur: 1.7, lead: 0.5, hold: 0.5, ann: { flip: true }, ...o });
  const hold = (t, o) => push(E.holdOp(state), { dur: 0, lead: 0, hold: t, ...o });
  const all = () => true;

  // ---- Step 1: fold in half both ways (corner to corner) and open
  set('Step 1', 'Fold in half corner to corner, then open.');
  hold(1.2, { caption: 'Start with a square of paper.' });
  let f = fold([{ P: [0, 0], D: [0, 1], sel: all, side: 1, dir: 'v' }], { dur: 1.5 });
  unfold(f, { dur: 1.1, lead: 0.15, hold: 0.25 });
  f = fold([{ P: [0, 0], D: [1, 0], sel: all, side: 1, dir: 'v' }], { dur: 1.5, lead: 0.5, caption: 'Now fold it in half the other way, then open.' });
  unfold(f, { dur: 1.1, lead: 0.15, hold: 0.5, caption: 'Now fold it in half the other way, then open.' });

  // ---- Step 2: turn over
  set('Step 2', 'Turn the paper over.');
  flip();

  // ---- Step 3: fold in half edge to edge both ways and open
  set('Step 3', 'Fold in half edge to edge, both ways, then open.');
  f = fold([{ P: [0, 0], D: [S2, S2], sel: all, side: 1, dir: 'v' }], { dur: 1.5 });
  unfold(f, { dur: 1.1, lead: 0.15, hold: 0.25 });
  f = fold([{ P: [0, 0], D: [S2, -S2], sel: all, side: 1, dir: 'v' }], { dur: 1.5, lead: 0.4 });
  unfold(f, { dur: 1.1, lead: 0.15, hold: 0.6 });

  // ---- Steps 4-5: collapse into the square base
  const col = E.collapseOp(state, (u) => [Math.PI * u, Math.PI * u]);
  set('Step 4', 'Bring the top and side corners down to the bottom corner.');
  push(col, { u0: 0, u1: 0.5, dur: 2.8, lead: 0.8, hold: 0.4, easeBeat: true, ann: { collapse: true }, cam: { tilt: true } });
  set('Step 5', 'Fold along the creases from behind, then flatten.');
  push(col, { u0: 0.5, u1: 1, dur: 2.8, lead: 0.2, hold: 0.4, easeBeat: true, cam: { tilt: true } });
  set('Step 6', 'This is the square base. The open end points down.');
  hold(2.0);

  // ---- Steps 7-11: kite folds, top fold, open, petal fold
  const side = (fg) => {
    const fgp = (p) => p.tag.grp === fg && !p.tag.inside;
    const outer = E.outerCorner(fg);
    const t22 = 22.5 * deg;
    const kite = fold([
      { P: [0, -1], D: [Math.sin(t22), Math.cos(t22)], sel: fgp, side: -1, dir: 'v', win: [0, 0.82] },
      { P: [0, -1], D: [-Math.sin(t22), Math.cos(t22)], sel: fgp, side: 1, dir: 'v', win: [0.18, 1] },
    ], { dur: fg === 'G1' ? 2.2 : 1.6 });
    return { kite, fgp, outer };
  };

  set('Step 7', 'Fold the lower edges of the top layer to the centre line.');
  let s1 = side('G1');
  set('Step 8', 'Fold the top triangle down over them.');
  // the whole top folds (the layers are joined at the centre line), but only the front flap shows a crease
  const topFold = (fg) => fold([{ P: [0, E.YK], D: [1, 0], sel: (p) => !p.tag.inside && !(p.tag.grp !== fg && (p.tag.facet === 'b' || p.tag.facet === 'c')), side: 1, dir: 'v', silent: (p) => p.tag.grp !== fg }], { dur: fg === 'G1' ? 1.6 : 1.3 });
  let tf = topFold('G1');
  set('Step 9', 'Open these three folds again.');
  unfold(tf, { dur: 1.2, lead: 0.5, hold: 0.15 });
  unfold(s1.kite, { dur: 1.6, lead: 0.1, hold: 0.6, wins: [[0, 0.82], [0.18, 1]] });
  set('Step 10', 'Lift the bottom point of the top layer up. The sides fold in.');
  push(E.petalOp(state), { dur: 3.4, lead: 0.9, hold: 0.4, ann: { petal: true } });
  set('Step 11', 'Press it flat.');
  hold(1.4);

  // ---- Step 12: turn over and repeat 7-10
  set('Step 12', 'Turn it over. Repeat steps 7 to 10 on this side.');
  flip();
  s1 = side('G2');
  tf = topFold('G2');
  unfold(tf, { dur: 1.0, lead: 0.3, hold: 0.1 });
  unfold(s1.kite, { dur: 1.3, lead: 0.1, hold: 0.3, wins: [[0, 0.82], [0.18, 1]] });
  push(E.petalOp(state), { dur: 2.8, lead: 0.5, hold: 0.4, ann: { petal: true } });
  set('Step 13', 'This is the bird base.');
  hold(2.2, { cam: { orbit: true } });

  // ---- Steps 14-17: narrow the lower points
  const narrow = (fg, o) => {
    const t = 11.25 * deg;
    const sel = (p) => p.tag.grp === fg && !p.tag.inside;
    return fold([
      { P: [0, -1], D: [Math.sin(t), Math.cos(t)], sel, side: -1, dir: 'v', win: [0, 0.82] },
      { P: [0, -1], D: [-Math.sin(t), Math.cos(t)], sel, side: 1, dir: 'v', win: [0.18, 1] },
    ], o);
  };
  set('Step 14', 'Fold the lower edges of the top layer to the centre line.');
  narrow(E.frontGroup(state), { dur: 2.2 });
  set('Step 15', 'Crease the folds well.');
  hold(1.2);
  set('Step 16', 'Turn it over. Repeat on this side.');
  flip();
  narrow(E.frontGroup(state), { dur: 1.8 });
  set('Step 17', 'Both lower points are now thin.');
  hold(1.4);

  // ---- Steps 18-21: inside reverse folds for the tail (right) and the neck (left)
  const P = [0, CFG.yP];
  const dOld = [0, -1, 0];
  const dR = [Math.sin(CFG.legAngle), Math.cos(CFG.legAngle), 0];
  const dL = [-Math.sin(CFG.legAngle), Math.cos(CFG.legAngle), 0];
  const lineDir = (dn) => G.norm([dOld[0] + dn[0], dOld[1] + dn[1], 0]);
  const fgNow = () => E.frontGroup(state);
  const band = () => {
    const fg = fgNow();
    return { lower: (p) => p.tag.grp !== fg && !p.tag.inside, upper: (p) => p.tag.grp === fg && !p.tag.inside };
  };
  // the two halves of the model part along the centre line while a point goes up inside
  const openSpec = () => {
    const fg = fgNow();
    return { P: [0, 0], D: [0, 1], max: 24 * deg, sel: (p) => !p.tag.inside, front: (p) => p.tag.grp === fg };
  };
  set('Step 18', 'Fold the right point up and crease it well, then open.');
  const ldR = lineDir(dR);
  const tipSideR = -Math.sign(ldR[0] * (-1 - P[1]) - ldR[1] * (0 - P[0])) || 1; // side that holds the tip
  f = fold([{ P, D: [ldR[0], ldR[1]], sel: (p) => p.tag.corner === 'R' && !p.tag.inside, side: -tipSideR, dir: 'v' }], { dur: 1.6 });
  unfold(f, { dur: 1.2, lead: 0.2, hold: 0.4 });
  set('Step 19', 'Open the layers and push the point up between them.');
  push(E.reverseOp(state, { name: 'tail', sel: (p) => p.tag.corner === 'R' && !p.tag.inside, P, dOld, dNew: dR, band: band(), open: openSpec() }), {
    dur: 4.2, lead: 0.6, hold: 0.5, ann: { reverse: true }, cam: { tilt: true },
  });
  set('Step 20', 'Do the same with the other point.');
  push(E.reverseOp(state, { name: 'neck', sel: (p) => p.tag.corner === 'L' && !p.tag.inside, P, dOld, dNew: dL, band: band(), open: openSpec() }), {
    dur: 3.6, lead: 0.7, hold: 0.5, ann: { reverse: true }, cam: { tilt: true },
  });
  set('Step 21', 'These two points become the neck and the tail.');
  hold(1.6);

  // ---- Steps 22-23: wings down
  set('Step 22', 'Fold the front wing down.');
  const fg = fgNow();
  const wingSel = (g) => (p) => p.tag.grp === g && !p.tag.inside;
  const wf = fold([{ P: [0, CFG.wingY], D: [1, 0], sel: wingSel(fg), side: 1, dir: 'v' }], { dur: 1.8 });
  const bg = fg === 'G1' ? 'G2' : 'G1';
  const wb = fold([{ P: [0, CFG.wingY], D: [1, 0], sel: wingSel(bg), side: 1, dir: 'm' }], { dur: 1.8, caption: 'Fold the back wing down too.', cam: { tilt: true } });
  set('Step 23', 'Both wings are down.');
  hold(1.3);

  // ---- Step 24: head
  set('Step 24', 'Fold the tip of the neck down inside, for the head.');
  {
    const neck = state.filter((p) => p.tag.inside === 'neck');
    const halves = [...new Set(neck.map((p) => p.tag.half))];
    const avg = (h) => { const s = neck.filter((p) => p.tag.half === h); return s.reduce((a, p) => a + p.L, 0) / s.length; };
    const upH = avg(halves[0]) > avg(halves[1]) ? halves[0] : halves[1];
    const Lneck = 1 + CFG.yP;
    const Ph = [P[0] + dL[0] * (Lneck - CFG.headLen), P[1] + dL[1] * (Lneck - CFG.headLen)];
    const dH = [Math.cos(CFG.headAngle), Math.sin(CFG.headAngle), 0];
    push(E.reverseOp(state, {
      name: 'head', sel: (p) => p.tag.inside === 'neck', P: Ph, dOld: dL, dNew: dH,
      band: { lower: (p) => p.tag.inside === 'neck' && p.tag.half !== upH, upper: (p) => p.tag.inside === 'neck' && p.tag.half === upH },
    }), { dur: 2.4, lead: 0.7, hold: 0.6, ann: { reverse: true }, cam: { zoomHead: true } });
  }

  // ---- Finished
  set('Done', 'Your paper crane is ready!');
  const fin = E.finaleOp(state, {
    y: CFG.wingY, open: CFG.wingOpen, standK: 1,
    front: new Set(state.filter((p) => E.descendsFrom(p.id, wf.rec.parts[0].ids)).map((p) => p.id)),
    back: new Set(state.filter((p) => E.descendsFrom(p.id, wb.rec.parts[0].ids)).map((p) => p.id)),
  });
  push(fin, { dur: 4.2, lead: 0.4, hold: 4.0, ann: {}, cam: { finale: true }, caption: 'Pull the wings out gently.', note: '' });
  beats[beats.length - 1].holdCaption = 'Your paper crane is ready!';
  return beats;
}
