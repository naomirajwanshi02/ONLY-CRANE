// Flat-fold paper engine.
// The paper is a list of convex pieces. Each piece has a polygon in crease-pattern (CP) coordinates,
// a flat placement on the table (2x2 orthogonal A and translation t, world = A p + t), a stacking
// value L (higher = nearer the viewer) and tags. Ops take a flat state to the next flat state and
// supply a pose(u) for every piece in between, so every frame is real rigid paper.
import * as G from './geom.js';

const PARENT = new Map();
let NEXT = 1;
export const SQ = Math.SQRT1_2;

export function piece(poly, A, t, L, tag, src) {
  const p = { id: NEXT++, poly, A, t, L, tag: { ...tag } };
  if (src) PARENT.set(p.id, src);
  return p;
}
const withFlat = (pc, A, t, L) => ({ ...pc, A, t, L: L === undefined ? pc.L : L });
export function ancestorIn(id, map) {
  let k = id;
  while (k !== undefined) {
    if (map.has(k)) return k;
    k = PARENT.get(k);
  }
  return undefined;
}
export const descendsFrom = (id, set) => ancestorIn(id, set) !== undefined;

export const det2 = (A) => A[0] * A[3] - A[1] * A[2];
export const flatPose = (pc) => ({
  R: [pc.A[0], pc.A[1], 0, pc.A[2], pc.A[3], 0, 0, 0, det2(pc.A)],
  T: [pc.t[0], pc.t[1], 0],
});
export const w2 = (pc, p) => [pc.A[0] * p[0] + pc.A[1] * p[1] + pc.t[0], pc.A[2] * p[0] + pc.A[3] * p[1] + pc.t[1]];
const inv2 = (pc, w) => {
  const x = w[0] - pc.t[0], y = w[1] - pc.t[1];
  return [pc.A[0] * x + pc.A[2] * y, pc.A[1] * x + pc.A[3] * y];
};
export const wpoly = (pc) => pc.poly.map((p) => w2(pc, p));
export const wcent = (pc) => G.centroid(wpoly(pc));
const crossSide = (P, D, q) => Math.sign(D[0] * (q[1] - P[1]) - D[1] * (q[0] - P[0]));

// Pose -> flat placement (used to snap the end of an analytic motion).
export function poseToFlat(pc, pose) {
  const R = pose.R;
  if (Math.abs(Math.abs(R[8]) - 1) > 1e-4) throw new Error('pose is not flat: ' + R[8]);
  const A = [R[0], R[1], R[3], R[4]];
  return withFlat(pc, A, [pose.T[0], pose.T[1]]);
}

// Split a piece by a world line (P, D). Returns {left, right} (either may be null).
export function splitPiece(pc, P, D, silentNew = false) {
  const p0 = inv2(pc, P);
  const nW = [-D[1], D[0]]; // left normal
  const nC = [pc.A[0] * nW[0] + pc.A[2] * nW[1], pc.A[1] * nW[0] + pc.A[3] * nW[1]];
  const [neg, pos] = G.splitPoly(pc.poly, p0, nC);
  if (neg && pos) {
    const left = piece(pos, pc.A, pc.t, pc.L, pc.tag, pc.id);
    const right = piece(neg, pc.A, pc.t, pc.L, pc.tag, pc.id);
    const sil = (pc.silent || []).slice();
    if (silentNew) sil.push({ p0, n: nC });
    if (sil.length) { left.silent = sil; right.silent = sil; }
    return { left, right };
  }
  return pos ? { left: pc, right: null } : { left: null, right: pc };
}

// Silent creases lie on the paper but are not drawn until a later fold along the same line reveals them.
function reveal(pc, P, D) {
  const p0 = inv2(pc, P), q = inv2(pc, [P[0] + D[0], P[1] + D[1]]);
  const keep = pc.silent.filter((l) => {
    const d0 = (p0[0] - l.p0[0]) * l.n[0] + (p0[1] - l.p0[1]) * l.n[1];
    const d1 = (q[0] - l.p0[0]) * l.n[0] + (q[1] - l.p0[1]) * l.n[1];
    return Math.abs(d0) > 1e-7 || Math.abs(d1) > 1e-7;
  });
  if (keep.length === pc.silent.length) return pc;
  return { ...pc, silent: keep.length ? keep : undefined };
}
export function isSilent(pc, cp) {
  if (!pc.silent) return false;
  return pc.silent.some((l) => Math.abs((cp[0] - l.p0[0]) * l.n[0] + (cp[1] - l.p0[1]) * l.n[1]) < 1e-7);
}

// Dense-rank the stacking values so they stay small integers.
export function renorm(pieces) {
  const vals = [...new Set(pieces.map((p) => p.L))].sort((a, b) => a - b);
  const groups = [];
  for (const v of vals) {
    if (groups.length && v - groups[groups.length - 1].v < 1e-7) continue;
    groups.push({ v });
  }
  const rank = (L) => {
    let lo = 0;
    for (let i = 0; i < groups.length; i++) if (groups[i].v <= L + 1e-7) lo = i;
    return lo;
  };
  return pieces.map((p) => ({ ...p, L: rank(p.L) }));
}

const reflect = (P, D) => {
  const n = [-D[1], D[0]];
  const Rf = [1 - 2 * n[0] * n[0], -2 * n[0] * n[1], -2 * n[0] * n[1], 1 - 2 * n[1] * n[1]];
  return (pc) => {
    const A = [
      Rf[0] * pc.A[0] + Rf[1] * pc.A[2], Rf[0] * pc.A[1] + Rf[1] * pc.A[3],
      Rf[2] * pc.A[0] + Rf[3] * pc.A[2], Rf[2] * pc.A[1] + Rf[3] * pc.A[3],
    ];
    const x = pc.t[0] - P[0], y = pc.t[1] - P[1];
    const t = [Rf[0] * x + Rf[1] * y + P[0], Rf[2] * x + Rf[3] * y + P[1]];
    return withFlat(pc, A, t);
  };
};
const maxL = (S) => S.reduce((m, p) => Math.max(m, p.L), -Infinity);
const minL = (S) => S.reduce((m, p) => Math.min(m, p.L), Infinity);

// ---------------------------------------------------------------------------------------------
// FOLD: several parts, each {P, D, sel, side (+1 = left of D moves), dir 'v'|'m', win [a,b]}.
export function foldOp(state, parts) {
  let work = state.slice();
  const moveOf = new Map();
  for (let k = 0; k < parts.length; k++) {
    const pt = parts[k];
    const next = [];
    for (let pc of work) {
      if (moveOf.has(pc.id) || !pt.sel(pc)) { next.push(pc); continue; }
      if (pc.silent) pc = reveal(pc, pt.P, pt.D);
      const { left, right } = splitPiece(pc, pt.P, pt.D, !!(pt.silent && pt.silent(pc)));
      const mv = pt.side > 0 ? left : right, st = pt.side > 0 ? right : left;
      if (st) next.push(st);
      if (mv) { next.push(mv); moveOf.set(mv.id, k); }
    }
    work = next;
  }
  const Lsnap = new Map(work.map((p) => [p.id, p.L]));
  let post = work.slice();
  for (let k = 0; k < parts.length; k++) {
    const pt = parts[k];
    const ref = reflect(pt.P, pt.D);
    const M = post.filter((p) => moveOf.get(p.id) === k);
    if (!M.length) continue;
    const hi = maxL(M), lo = minL(M);
    const top = maxL(post), bot = minL(post);
    const L = new Map(M.map((p) => [p.id, pt.dir === 'm' ? bot - 1 - (p.L - lo) : top + 1 + (hi - p.L)]));
    post = post.map((p) => (moveOf.get(p.id) === k ? { ...ref(p), L: L.get(p.id) } : p));
  }
  post = renorm(post);
  const sgn = parts.map((pt) => pt.side * (pt.dir === 'm' ? -1 : 1));
  const flats = new Map(work.map((p) => [p.id, flatPose(p)]));
  const pose = (u) =>
    work.map((p) => {
      const k = moveOf.get(p.id);
      if (k === undefined) return flats.get(p.id);
      const pt = parts[k];
      const a = sgn[k] * Math.PI * G.ease(G.win(u, ...(pt.win || [0, 1])));
      return G.compose(G.rotAbout([pt.P[0], pt.P[1], 0], [pt.D[0], pt.D[1], 0], a), flats.get(p.id));
    });
  const rec = {
    parts: parts.map((pt, k) => ({ ...pt, ids: new Set(work.filter((p) => moveOf.get(p.id) === k).map((p) => p.id)) })),
    Lsnap,
  };
  const partIds = parts.map((_, k) => new Set(work.filter((p) => moveOf.get(p.id) === k).map((p) => p.id)));
  return { kind: 'fold', work, post, pose, rec, moving: new Set(moveOf.keys()), parts, partIds };
}

// UNFOLD a recorded fold (all parts, optional windows per part).
export function unfoldOp(state, rec, wins) {
  const work = state.slice();
  const partOf = new Map();
  rec.parts.forEach((pt, k) => {
    for (const p of work) if (descendsFrom(p.id, pt.ids)) partOf.set(p.id, k);
  });
  const sgn = rec.parts.map((pt) => pt.side * (pt.dir === 'm' ? -1 : 1));
  const preFlat = new Map();
  for (const p of work) {
    const k = partOf.get(p.id);
    if (k === undefined) continue;
    preFlat.set(p.id, reflect(rec.parts[k].P, rec.parts[k].D)(p));
  }
  let post = work.map((p) => {
    const q = preFlat.get(p.id) || p;
    return { ...q, L: rec.Lsnap.get(ancestorIn(p.id, rec.Lsnap)) };
  });
  post = renorm(post);
  const flats = new Map(work.map((p) => [p.id, flatPose(preFlat.get(p.id) || p)]));
  const pose = (u) =>
    work.map((p) => {
      const k = partOf.get(p.id);
      if (k === undefined) return flats.get(p.id);
      const pt = rec.parts[k];
      const w = wins ? wins[k] : [0, 1];
      const a = sgn[k] * Math.PI * (1 - G.ease(G.win(u, w[0], w[1])));
      return G.compose(G.rotAbout([pt.P[0], pt.P[1], 0], [pt.D[0], pt.D[1], 0], a), flats.get(p.id));
    });
  const partIds = rec.parts.map((_, k) => new Set(work.filter((p) => partOf.get(p.id) === k).map((p) => p.id)));
  return { kind: 'unfold', work, post, pose, moving: new Set(partOf.keys()), parts: rec.parts, partIds, wins };
}

// FLIP the model over about the vertical (y) axis.
export function flipOp(state) {
  const work = state.slice();
  const post = renorm(work.map((p) => withFlat(p, [-p.A[0], -p.A[1], p.A[2], p.A[3]], [-p.t[0], p.t[1]], -p.L)));
  const flats = work.map(flatPose);
  const pose = (u) => {
    const M = G.rotAbout([0, 0, 0], [0, 1, 0], -Math.PI * G.ease(u));
    return flats.map((f) => G.compose(M, f));
  };
  return { kind: 'flip', work, post, pose, moving: new Set(work.map((p) => p.id)) };
}

export function holdOp(state) {
  const flats = state.map(flatPose);
  return { kind: 'hold', work: state, post: state, pose: () => flats, moving: new Set() };
}

// ---------------------------------------------------------------------------------------------
// SQUARE BASE COLLAPSE. Input: the square (corners at (±1,0),(0,±1)) with all 8 sector creases,
// white side up. The bottom corner and its two sectors stay on the table; the top corner comes
// down over the front while the side corners fold in along the midline creases from behind.
const W = { R: [1, 0, 0], T: [0, 1, 0], L: [-1, 0, 0], B: [0, -1, 0] };
const MID = { TR: [0.5, 0.5, 0], TL: [-0.5, 0.5, 0], BL: [-0.5, -0.5, 0], BR: [0.5, -0.5, 0] };
const O3 = [0, 0, 0];
const mirX = (v) => [-v[0], v[1], v[2]];

// Unit vector m at 45 deg from both a and b (two roots: pick the one nearest `pref`).
function bisCone(a, b, cosA, pref) {
  const s = G.add(a, b), sl = G.len(s);
  const x = Math.min(1, (2 * cosA) / sl);
  const y = Math.sqrt(Math.max(0, 1 - x * x));
  let d = G.cross(a, b);
  const dl = G.len(d);
  const sh = G.scale(s, 1 / sl);
  if (dl < 1e-12) return sh;
  d = G.scale(d, 1 / dl);
  const m1 = G.add(G.scale(sh, x), G.scale(d, y));
  const m2 = G.sub(G.scale(sh, x), G.scale(d, y));
  return G.dot(m1, pref) >= G.dot(m2, pref) ? m1 : m2;
}

function collapseQ(tau, th) {
  const nBR = G.norm([1, -1, 0]);
  return { qR: G.mv(G.rotAxis(nBR, th), W.R), qT: [0, Math.cos(tau), Math.sin(tau)] };
}
// Follow the M point continuously along a sampled path; returns u -> mTR.
function trackM(tm, N = 3000) {
  const tab = [];
  let prev = null;
  for (let i = 0; i <= N; i++) {
    const [tau, th] = tm(i / N);
    const { qR, qT } = collapseQ(Math.min(tau, Math.PI * (1 - 1e-6)), Math.min(th, Math.PI * (1 - 1e-6)));
    const pref = prev ? prev : [SQ, SQ, 0];
    const m = bisCone(qR, qT, SQ, pref);
    tab.push(m);
    prev = m;
  }
  return (u) => {
    const f = G.clamp01(u) * N, i = Math.min(N - 1, Math.floor(f));
    return G.norm(G.lerp3(tab[i], tab[i + 1], f - i));
  };
}
export function collapseKin(tau, th, mTRin) {
  const { qR, qT } = collapseQ(tau, th);
  const mTR = mTRin || bisCone(qR, qT, SQ, [SQ, -SQ, 0]);
  const r = SQ;
  const sec = {
    'B-BR': G.IDP,
    'R-BR': G.motion3(O3, W.R, MID.BR, O3, qR, MID.BR),
    'R-TR': G.motion3(O3, W.R, MID.TR, O3, qR, G.scale(mTR, r)),
    'T-TR': G.motion3(O3, W.T, MID.TR, O3, qT, G.scale(mTR, r)),
  };
  sec['B-BL'] = G.IDP;
  sec['L-BL'] = G.motion3(O3, W.L, MID.BL, O3, mirX(qR), MID.BL);
  sec['L-TL'] = G.motion3(O3, W.L, MID.TL, O3, mirX(qR), G.scale(mirX(mTR), r));
  sec['T-TL'] = G.motion3(O3, W.T, MID.TL, O3, qT, G.scale(mirX(mTR), r));
  return { sec, qR, qT, mTR };
}

export function tagSectors(state) {
  return state.map((p) => {
    const c = wcent(p);
    const ang = Math.atan2(c[1], c[0]) * 180 / Math.PI;
    const a = (ang + 360) % 360;
    const corner = a < 45 || a >= 315 ? 'R' : a < 135 ? 'T' : a < 225 ? 'L' : 'B';
    const mid = a < 90 ? 'TR' : a < 180 ? 'TL' : a < 270 ? 'BL' : 'BR';
    return { ...p, tag: { ...p.tag, corner, mid, sec: corner + '-' + mid, grp: mid[0] === 'T' ? 'G1' : 'G2' } };
  });
}

export function collapseOp(state, timing) {
  const work = tagSectors(state);
  const flats = new Map(work.map((p) => [p.id, flatPose(p)]));
  const tm = timing || ((u) => { const e = Math.PI * G.ease(u); return [e, e]; });
  const capT = Math.PI * (1 - 1e-6);
  const mOf = trackM(tm);
  const pose = (u) => {
    let [tau, th] = tm(u);
    tau = Math.min(tau, capT);
    th = Math.min(th, capT);
    const { sec } = collapseKin(tau, th, mOf(u));
    return work.map((p) => G.compose(sec[p.tag.sec], flats.get(p.id)));
  };
  // exact end: everything lies in the square O(0,0) M(±.5,-.5) C(0,-1)
  const endPts = { R: W.B, T: W.B, L: W.B, B: W.B, TR: MID.BR, TL: MID.BL, BR: MID.BR, BL: MID.BL };
  const layer = { B: 0, R: 1, L: 1, T: 3 };
  const post = work.map((p) => {
    const [c, m] = p.tag.sec.split('-');
    const M = G.motion3(O3, W[c], MID[m], O3, endPts[c], endPts[m]);
    const q = poseToFlat(p, G.compose(M, flats.get(p.id)));
    let L = layer[c];
    if (c === 'R' || c === 'L') L = m[0] === 'T' ? 2 : 1;
    return { ...q, L };
  });
  return { kind: 'collapse', work, post: renorm(post), pose, moving: new Set(work.map((p) => p.id)), mOf, tm };
}

// ---------------------------------------------------------------------------------------------
// Square-base / bird-base landmarks (world).
export const YK = -(1 - SQ); // K line: -0.2929
export const KR = [1 - SQ, YK]; // (0.2929, -0.2929)
export const T22 = Math.tan(Math.PI / 8);
export const kiteX = (y) => (y + 1) * T22;

export function frontGroup(state) {
  const avg = (g) => {
    const S = state.filter((p) => p.tag.grp === g && !p.tag.inside);
    return S.reduce((s, p) => s + p.L, 0) / Math.max(1, S.length);
  };
  return avg('G1') >= avg('G2') ? 'G1' : 'G2';
}
export const outerCorner = (g) => (g === 'G1' ? 'T' : 'B');

// PETAL FOLD on the front flap pair (after kite + top folds were creased and opened).
export function petalOp(state) {
  const g = frontGroup(state);
  const oc = outerCorner(g);
  const facet = new Map();
  for (const p of state) {
    if (p.tag.grp !== g || p.tag.inside) continue;
    const c = wcent(p);
    const side = c[0] >= 0 ? 'r' : 'l';
    const inKite = Math.abs(c[0]) < kiteX(c[1]) - 1e-9;
    if (p.tag.corner === oc) {
      if (c[1] > YK + 1e-9) facet.set(p.id, 'a');
      else facet.set(p.id, (inKite ? 'b' : 'c') + side);
    } else if (p.tag.corner === 'R' || p.tag.corner === 'L') {
      if (!inKite && c[1] < YK) facet.set(p.id, 'd' + side);
    }
  }
  const K0 = [0, YK, 0], Kr = [KR[0], YK, 0], C = [0, -1, 0], Mr = [0.5, -0.5, 0];
  const lKC = G.len(G.sub(C, Kr)), lKM = G.len(G.sub(Mr, Kr));
  const c675 = Math.cos((67.5 * Math.PI) / 180);
  const rC2 = G.norm(G.sub(C, Kr));
  const rotOf = (phi) => G.rotAbout(K0, [-1, 0, 0], phi); // lifts the region below the K line
  // track the M ray continuously: it starts at the original M (outward) and ends at K0
  const N = 2000, tab = [];
  let prev = G.norm(G.sub(Mr, Kr));
  for (let i = 0; i <= N; i++) {
    const phi = Math.PI * (i / N) * (1 - 1e-7) + 1e-6;
    const rCf = G.norm(G.sub(G.apply(rotOf(phi), C), Kr));
    const m = bisCone(rCf, rC2, c675, prev);
    tab.push(m);
    prev = m;
  }
  const rMof = (phi) => {
    const f = G.clamp01(phi / Math.PI) * N, i = Math.min(N - 1, Math.floor(f));
    return G.norm(G.lerp3(tab[i], tab[i + 1], f - i));
  };
  const kin = (phi) => {
    const rot = rotOf(phi);
    const Cf = G.apply(rot, C);
    const M = G.add(Kr, G.scale(rMof(phi), lKM));
    const m = {};
    m.br = rot;
    m.cr = G.motion3(Kr, C, Mr, Kr, Cf, M);
    m.dr = G.motion3(Kr, Mr, C, Kr, M, C);
    m.bl = rot;
    m.cl = G.motion3(mirX(Kr), C, mirX(Mr), mirX(Kr), Cf, mirX(M));
    m.dl = G.motion3(mirX(Kr), mirX(Mr), C, mirX(Kr), mirX(M), C);
    return m;
  };
  const flats = new Map(state.map((p) => [p.id, flatPose(p)]));
  const pose = (u) => {
    const phi = Math.PI * Math.min(1 - 1e-6, G.ease(u));
    const m = kin(phi);
    return state.map((p) => {
      const f = facet.get(p.id);
      return f && f !== 'a' ? G.compose(m[f], flats.get(p.id)) : flats.get(p.id);
    });
  };
  // end state: b reflected over the K line; c folded under b; d folded in to the centre.
  const Cend = [0, 2 * YK + 1, 0];
  const mEnd = {
    br: G.rotAbout(K0, [-1, 0, 0], Math.PI), bl: G.rotAbout(K0, [-1, 0, 0], Math.PI),
    cr: G.motion3(Kr, C, Mr, Kr, Cend, K0), cl: G.motion3(mirX(Kr), C, mirX(Mr), mirX(Kr), Cend, K0),
    dr: G.motion3(Kr, Mr, C, Kr, K0, C), dl: G.motion3(mirX(Kr), mirX(Mr), C, mirX(Kr), K0, C),
  };
  const top = maxL(state);
  const rel = (p) => p.L / (top + 1) * 0.5;
  let post = state.map((p) => {
    const f = facet.get(p.id);
    if (!f || f === 'a') return p;
    const q = poseToFlat(p, G.compose(mEnd[f], flats.get(p.id)));
    const base = f[0] === 'b' ? 3 : f[0] === 'c' ? 2 : 1;
    // b and c are flipped over, so their internal order reverses
    const r = f[0] === 'd' ? -rel(p) : rel(p);
    return { ...q, L: top + base + r, tag: { ...q.tag, facet: f[0] } };
  });
  return { kind: 'petal', work: state, post: renorm(post), pose, moving: new Set([...facet].filter(([, f]) => f !== 'a').map(([id]) => id)), facet };
}

// INSIDE REVERSE FOLD of a thin flap. spec: {sel(piece) -> in flap, P (pivot on the spine),
// dOld (spine direction from P toward the tip), dNew (new direction), band:{lower(p), upper(p)}}.
export function reverseOp(state, spec) {
  const { P, dOld, dNew } = spec;
  const lineD = G.norm([dOld[0] + dNew[0], dOld[1] + dNew[1], 0]);
  const D2 = [lineD[0], lineD[1]];
  const tipSide = crossSide(P, D2, [P[0] + dOld[0], P[1] + dOld[1]]);
  let work = [];
  const tip = new Set();
  for (const pc of state) {
    if (!spec.sel(pc)) { work.push(pc); continue; }
    const { left, right } = splitPiece(pc, P, D2);
    const t = tipSide > 0 ? left : right, s = tipSide > 0 ? right : left;
    if (s) work.push(s);
    if (t) { work.push(t); tip.add(t.id); }
  }
  const T = work.filter((p) => tip.has(p.id));
  // halves of the flap: by group tag
  const grps = [...new Set(T.map((p) => p.tag.half || p.tag.grp))];
  const avgL = (g) => {
    const S = T.filter((p) => (p.tag.half || p.tag.grp) === g);
    return S.reduce((s, p) => s + p.L, 0) / S.length;
  };
  const front = grps.length > 1 ? (avgL(grps[0]) > avgL(grps[1]) ? grps[0] : grps[1]) : grps[0];
  // twist sign so the front half swings toward the viewer
  const cT = G.centroid(T.flatMap((p) => wpoly(p)));
  const v = [cT[0] - P[0], cT[1] - P[1]];
  const zSign = Math.sign(dOld[0] * v[1] - dOld[1] * v[0]) || 1;
  let rho = Math.atan2(dNew[1], dNew[0]) - Math.atan2(dOld[1], dOld[0]);
  while (rho > Math.PI) rho -= 2 * Math.PI;
  while (rho < -Math.PI) rho += 2 * Math.PI;
  // The point stays joined to the body along the pre-crease: every tip point swings about the pivot
  // by its own angle (0 on the crease, rho on the spine), so the paper bends a little instead of
  // splitting. The two layers of the point part like a book while it travels up inside, and (for the
  // neck and tail) the two halves of the model open about the centre line and close again.
  const flats = new Map(work.map((p) => [p.id, flatPose(p)]));
  const isFront = (p) => (p.tag.half || p.tag.grp) === front;
  const thOf = (q) => {
    const x = q[0] - P[0], y = q[1] - P[1];
    return Math.atan2(D2[0] * y - D2[1] * x, D2[0] * x + D2[1] * y);
  };
  const thSpine = thOf([P[0] + dOld[0], P[1] + dOld[1]]);
  const dmax = -2 * thSpine; // swing of the spine (same as rho)
  const op = spec.open || null;
  const sw = (u) => G.ease(G.win(u, op ? 0.12 : 0, op ? 0.9 : 1));
  const psiOf = (u) => (op ? op.max * G.smooth(G.win(u, 0, 0.22)) * (1 - G.smooth(G.win(u, 0.78, 1))) : 0);
  const bulge = spec.bulge ?? 0.55;
  const axP = op ? [op.P[0], op.P[1], 0] : null, axD = op ? [op.D[0], op.D[1], 0] : null;
  const sideOf = (q) => Math.sign(axD[0] * (q[1] - axP[1]) - axD[1] * (q[0] - axP[0])) || 1;
  const tipSideAx = op ? sideOf([cT[0], cT[1]]) : 1;
  // opening pieces: same side of the centre line as the point, not the point itself
  const opens = new Set();
  if (op) for (const p of work) if (!tip.has(p.id) && op.sel(p) && sideOf(wcent(p)) === tipSideAx) opens.add(p.id);
  const openPose = (p, u, k = 1) => {
    const sg = (op.front(p) ? 1 : -1) * tipSideAx;
    return G.rotAbout(axP, axD, sg * psiOf(u) * k);
  };
  const tipPoint = (p, cp, u) => {
    const w = w2(p, cp);
    const th = thOf(w);
    const del = -2 * th;
    const g = sw(u);
    const R = G.rotAxis([0, 0, 1], del * g);
    const v = G.mv(R, [w[0] - P[0], w[1] - P[1], 0]);
    let q = [P[0] + v[0], P[1] + v[1], 0];
    // layers part like a book: zero on the crease and on the spine line itself
    const dist = Math.abs(dOld[0] * (w[1] - P[1]) - dOld[1] * (w[0] - P[0]));
    const frac = Math.min(1, Math.abs(del / dmax));
    q[2] += (isFront(p) ? 1 : -1) * bulge * Math.sin(Math.PI * g) * dist * frac;
    if (op) q = G.apply(openPose(p, u, 1 - frac), q);
    return q;
  };
  const pose = (u) => work.map((p) => {
    if (tip.has(p.id)) return u >= 1 ? flatPose(reflect(P, D2)(p)) : flats.get(p.id);
    if (opens.has(p.id)) return G.compose(openPose(p, u), flats.get(p.id));
    return flats.get(p.id);
  });
  const vmap = (u) => {
    const m = new Map();
    if (u >= 1) return m;
    for (const p of work) if (tip.has(p.id)) m.set(p.id, (cp) => tipPoint(p, cp, u));
    return m;
  };
  // end: reflection over the reverse-fold line; the tip goes between band.lower and band.upper
  const ref = reflect(P, D2);
  const others = work.filter((p) => !tip.has(p.id));
  const lowSet = others.filter(spec.band.lower), upSet = others.filter(spec.band.upper);
  const lo = lowSet.length ? maxL(lowSet) : minL(others) - 1;
  const hi = upSet.length ? minL(upSet) : lo + 1;
  // inside the body: the front half of the point stays in front of the back half; each half is turned over
  const tipS = T.slice().sort((a, b) => a.L - b.L);
  const n = tipS.length;
  const ordered = [
    ...tipS.filter((p) => (p.tag.half || p.tag.grp) !== front).reverse(),
    ...tipS.filter((p) => (p.tag.half || p.tag.grp) === front).reverse(),
  ];
  const newL = new Map(ordered.map((p, i) => [p.id, lo + ((hi - lo) * (i + 1)) / (n + 1)]));
  if (hi <= lo) console.warn('reverse fold band is empty', lo, hi);
  const post = renorm(
    work.map((p) => {
      if (!tip.has(p.id)) return p;
      const q = ref(p);
      return { ...q, L: newL.get(p.id), tag: { ...q.tag, inside: spec.name || 'tip', half: q.tag.half || q.tag.grp } };
    })
  );
  return { kind: 'reverse', work, post, pose, vmap, moving: new Set([...tip, ...opens]), tip, line: { P, D: D2 }, tipSide };
}

// FINALE: wings out and the crane stands. wings: {line y, frontIds, backIds}, angle for the wings.
export function finaleOp(state, spec) {
  const flats = new Map(state.map((p) => [p.id, flatPose(p)]));
  const P3 = [0, spec.y, 0];
  const standOf = (u) => G.rotAbout([0, spec.y, 0], [1, 0, 0], (Math.PI / 2) * G.ease(G.win(u, 0.25, 1)) * spec.standK);
  const pose = (u) => {
    const w = G.ease(G.win(u, 0, 0.7));
    const stand = standOf(u);
    return state.map((p) => {
      let m = flats.get(p.id);
      if (spec.front.has(p.id)) m = G.compose(G.rotAbout(P3, [1, 0, 0], -spec.open * w), m);
      else if (spec.back.has(p.id)) m = G.compose(G.rotAbout(P3, [1, 0, 0], spec.open * w), m);
      return G.compose(stand, m);
    });
  };
  return { kind: 'finale', work: state, post: state, pose, moving: new Set(state.map((p) => p.id)), final: true, globalR: (u) => standOf(u).R };
}
