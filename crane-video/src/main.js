// Timeline, camera, annotations, captions and playback for the paper crane guide.
import * as G from './geom.js';
import * as E from './engine.js';
import { buildSequence } from './sequence.js';
import { Renderer, TOK } from './render.js';

const W = 1080, H = 1920;
const TH = 0.003; // paper thickness per layer (world units; the square base is 1 tall)
const STAGE = { cy: 925, w: 880, h: 700 }; // stage box in px
const FOV = 24;
const LIFT = 0.0016; // ink lines sit just above the paper surface

const beats = buildSequence();
let T = 0;
for (const b of beats) { b.t0 = T; b.t1 = T + b.lead + b.dur + b.hold; T = b.t1; }
const DURATION = T;

// ---------------------------------------------------------------- per-state caches
const hCache = new WeakMap();
function heights(state) {
  if (hCache.has(state)) return hCache.get(state);
  const P = state.map((p) => ({ p, poly: E.wpoly(p), bb: null }));
  for (const q of P) q.bb = G.bbox(q.poly);
  const order = P.slice().sort((a, b) => a.p.L - b.p.L);
  const h = new Map();
  for (let i = 0; i < order.length; i++) {
    const a = order[i];
    let m = -1;
    for (let j = 0; j < i; j++) {
      const b = order[j];
      if (b.p.L >= a.p.L - 1e-9) continue;
      const hb = h.get(b.p.id);
      if (hb <= m) continue;
      if (b.bb[0] > a.bb[2] - 1e-6 || b.bb[2] < a.bb[0] + 1e-6 || b.bb[1] > a.bb[3] - 1e-6 || b.bb[3] < a.bb[1] + 1e-6) continue;
      if (G.interArea(a.poly, b.poly) > 2e-6) m = hb;
    }
    h.set(a.p.id, m + 1);
  }
  hCache.set(state, h);
  return h;
}
const adjCache = new WeakMap();
function adjacency(state) {
  if (adjCache.has(state)) return adjCache.get(state);
  const out = new Map();
  const bbs = state.map((p) => G.bbox(p.poly));
  state.forEach((p, i) => {
    const segs = [];
    for (let e = 0; e < p.poly.length; e++) {
      const a = p.poly[e], b = p.poly[(e + 1) % p.poly.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      const ivs = [];
      state.forEach((q, j) => {
        if (j === i) return;
        const bb = bbs[j];
        if (bb[0] > Math.max(a[0], b[0]) + 1e-7 || bb[2] < Math.min(a[0], b[0]) - 1e-7 || bb[1] > Math.max(a[1], b[1]) + 1e-7 || bb[3] < Math.min(a[1], b[1]) - 1e-7) return;
        for (let f = 0; f < q.poly.length; f++) {
          const c = q.poly[f], d = q.poly[(f + 1) % q.poly.length];
          const cc = (dx * (c[1] - a[1]) - dy * (c[0] - a[0])) / Math.sqrt(L2);
          const cd = (dx * (d[1] - a[1]) - dy * (d[0] - a[0])) / Math.sqrt(L2);
          if (Math.abs(cc) > 1e-7 || Math.abs(cd) > 1e-7) continue;
          let t0 = ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / L2;
          let t1 = ((d[0] - a[0]) * dx + (d[1] - a[1]) * dy) / L2;
          if (t0 > t1) [t0, t1] = [t1, t0];
          t0 = Math.max(0, t0); t1 = Math.min(1, t1);
          if (t1 - t0 > 1e-6) ivs.push([t0, t1, q.id]);
        }
      });
      ivs.sort((x, y) => x[0] - y[0]);
      let t = 0;
      for (const iv of ivs) {
        if (iv[0] > t + 1e-6) segs.push([a, b, t, iv[0], -1]);
        segs.push([a, b, Math.max(t, iv[0]), iv[1], iv[2]]);
        t = Math.max(t, iv[1]);
      }
      if (t < 1 - 1e-6) segs.push([a, b, t, 1, -1]);
    }
    out.set(p.id, segs);
  });
  adjCache.set(state, out);
  return out;
}

// ---------------------------------------------------------------- frame state at time t
function locate(t) {
  t = Math.max(0, Math.min(DURATION - 1e-6, t));
  let lo = 0, hi = beats.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (beats[m].t0 <= t) lo = m; else hi = m - 1;
  }
  return { b: beats[lo], i: lo, lt: t - beats[lo].t0 };
}
function flatFrame(state) {
  const h = heights(state);
  const off = new Map(state.map((p) => [p.id, [0, 0, (h.get(p.id) || 0) * TH]]));
  return { pieces: state, poses: state.map(E.flatPose), off };
}
// Layer offsets travel with each moving piece (so a turning stack keeps its spacing), then settle
// onto the stacking of the end state.
function opInfo(op) {
  if (op._info) return op._info;
  const hp = heights(op.work), hq = heights(op.post);
  const flat = new Map(op.work.map((p) => [p.id, E.flatPose(p)]));
  let hB = Infinity;
  for (const p of op.work) if (op.moving.has(p.id)) hB = Math.min(hB, hp.get(p.id) || 0);
  if (!isFinite(hB)) hB = 0;
  const end = op.pose(1);
  const sEnd = new Map(op.work.map((p, i) => [p.id, Math.sign(G.mmul(end[i].R, G.mT(flat.get(p.id).R))[8]) || 1]));
  return (op._info = { hp, hq, flat, hB, sEnd });
}
function opFrame(b, u, w) {
  const op = b.op;
  const I = opInfo(op);
  const poses = op.pose(u);
  const vm = op.vmap ? op.vmap(u) : null;
  const off = new Map();
  // the finished crane is pressed thin: layers close up to a sliver of their folding thickness
  const k = op.kind === 'finale' ? 1 - 0.88 * G.ease(G.win(u, 0, 0.5)) : 1;
  const standR = op.globalR ? op.globalR(u) : null;
  op.work.forEach((p, i) => {
    const hp = I.hp.get(p.id) || 0, hq = I.hq.get(p.id) ?? hp;
    if (vm && vm.has(p.id)) {
      off.set(p.id, [0, 0, G.lerp(hp, hq, w) * TH]);
    } else if (op.kind === 'finale') {
      // spacing turns with the whole crane only, not with a wing, so each wing stays on its hinge
      off.set(p.id, G.mv(standR, [0, 0, hp * k * TH]));
    } else if (op.moving.has(p.id)) {
      const Rm = G.mmul(poses[i].R, G.mT(I.flat.get(p.id).R));
      const rel = (hp - I.hB) * TH;
      const z = G.lerp(I.hB * TH, hq * TH - I.sEnd.get(p.id) * rel, w);
      off.set(p.id, G.add(G.mv(Rm, [0, 0, rel]), [0, 0, z]));
    } else {
      off.set(p.id, [0, 0, G.lerp(hp, hq, w) * TH]);
    }
  });
  return { pieces: op.work, poses, off, vm };
}
function phaseOf(b, lt) {
  if (lt < b.lead) return { ph: 'lead', f: 0 };
  if (lt < b.lead + b.dur) return { ph: 'move', f: (lt - b.lead) / b.dur };
  return { ph: 'hold', f: 1 };
}
function frameAt(t) {
  const { b, lt } = locate(t);
  const { ph, f } = phaseOf(b, lt);
  const op = b.op;
  if (op.kind === 'hold') return flatFrame(op.post);
  const span = b.u1 - b.u0;
  if (ph === 'lead') {
    if (b.u0 === 0) return flatFrame(b.pre);
    return opFrame(b, b.u0, G.smooth(b.u0));
  }
  if (ph === 'hold' && b.u1 >= 1 && op.kind !== 'finale') return flatFrame(op.post);
  const g = b.easeBeat ? G.ease(f) : f;
  const u = b.u0 + span * g;
  return opFrame(b, u, op.kind === 'collapse' ? G.smooth(u) : G.smooth(G.win(u, 0.15, 0.85)));
}

// world vertices of a frame
function geometry(fr) {
  const out = [];
  fr.pieces.forEach((p, i) => {
    const P = fr.poses[i];
    const off = fr.off.get(p.id);
    const f = fr.vm && fr.vm.get(p.id);
    const map = f ? (cp) => G.add(f(cp), off) : (cp) => G.add(G.apply(P, [cp[0], cp[1], 0]), off);
    const verts = p.poly.map((v) => map(v));
    let normal;
    if (f) {
      let n = [0, 0, 0];
      for (let j = 0; j < verts.length; j++) {
        const a = verts[j], b = verts[(j + 1) % verts.length];
        n = G.add(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]);
      }
      normal = G.norm(n);
    } else normal = G.mv(P.R, [0, 0, 1]);
    out.push({ id: p.id, p, P, off, map, bent: !!f, verts, uv: p.poly.map((v) => [v[0] * 0.8 + 0.5, v[1] * 0.8 + 0.5]), normal });
  });
  return out;
}
const samePose = (A, B) => {
  for (let k = 0; k < 9; k++) if (Math.abs(A.R[k] - B.R[k]) > 0.03) return false;
  for (let k = 0; k < 3; k++) if (Math.abs(A.T[k] - B.T[k]) > 0.03) return false;
  return true;
};
// Lines on paper that is covered (by any layer, at any moment) are not drawn: a ray from the camera
// to the line must not hit other paper first.
function occluders(geo) {
  return geo.map((g) => {
    let c = [0, 0, 0];
    for (const v of g.verts) c = G.add(c, v);
    c = G.scale(c, 1 / g.verts.length);
    let r = 0;
    for (const v of g.verts) r = Math.max(r, G.len(G.sub(v, c)));
    const tris = [];
    for (let j = 1; j < g.verts.length - 1; j++) tris.push([g.verts[0], g.verts[j], g.verts[j + 1]]);
    return { id: g.id, c, r, tris };
  });
}
function occluded(occ, selfId, cam, M) {
  const d = G.sub(M, cam), L = G.len(d);
  const dir = G.scale(d, 1 / L);
  const tmax = L - 0.0009;
  for (const o of occ) {
    if (o.id === selfId) continue;
    const oc = G.sub(o.c, cam), along = G.dot(oc, dir);
    if (along - o.r > tmax) continue;
    if (G.len(G.sub(oc, G.scale(dir, along))) > o.r) continue;
    for (const [v0, v1, v2] of o.tris) {
      const e1 = G.sub(v1, v0), e2 = G.sub(v2, v0), pv = G.cross(dir, e2), det = G.dot(e1, pv);
      if (Math.abs(det) < 1e-12) continue;
      const tv = G.sub(cam, v0), uu = G.dot(tv, pv) / det;
      // inclusive: a line seen exactly through the seam between two pieces is still covered
      if (uu < -1e-4 || uu > 1 + 1e-4) continue;
      const qv = G.cross(tv, e1), vv = G.dot(dir, qv) / det;
      if (vv < -1e-4 || uu + vv > 1 + 1e-4) continue;
      const t = G.dot(e2, qv) / det;
      if (t > 0 && t < tmax) return true;
    }
  }
  return false;
}
function edges(fr, geo, camPos) {
  const adj = adjacency(fr.pieces);
  const byId = new Map(geo.map((g) => [g.id, g]));
  const dark = [], faint = [];
  const occ = occluders(geo);
  // raw paper edges that butt against another raw edge in the same layer are not drawn
  const flatOf = (g) => !g.bent && Math.abs(Math.abs(g.normal[2]) - 1) < 1e-6;
  const rawSegs = [];
  for (const g of geo) {
    if (!flatOf(g)) continue;
    for (const [a, b, t0, t1, nb] of adj.get(g.id)) {
      if (nb >= 0) continue;
      const A = g.map([a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0]);
      const B = g.map([a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1]);
      rawSegs.push({ id: g.id, A, B });
    }
  }
  const abuts = (id, M) => {
    for (const r of rawSegs) {
      if (r.id === id) continue;
      const dx = r.B[0] - r.A[0], dy = r.B[1] - r.A[1], L2 = dx * dx + dy * dy;
      if (L2 < 1e-12) continue;
      const t = ((M[0] - r.A[0]) * dx + (M[1] - r.A[1]) * dy) / L2;
      if (t < -1e-6 || t > 1 + 1e-6) continue;
      const px = r.A[0] + dx * t, py = r.A[1] + dy * t, pz = r.A[2] + (r.B[2] - r.A[2]) * t;
      if (Math.hypot(px - M[0], py - M[1]) < 1e-5 && Math.abs(pz - M[2]) < TH * 0.6) return true;
    }
    return false;
  };
  // paper higher in the stack hides lines under it, including lines right under its edge. Works for
  // stacked paper at any angle (on the table or standing up), comparing pieces in their shared plane.
  const planeOf = (g) => {
    const n = g.normal;
    let e1 = Math.abs(n[2]) < 0.9 ? G.norm(G.cross([0, 0, 1], n)) : G.norm(G.cross([1, 0, 0], n));
    const e2 = G.cross(n, e1);
    return { n, e1, e2 };
  };
  const planar = geo.filter((g) => !g.bent).map((g) => {
    const pl = planeOf(g);
    return { g, id: g.id, L: g.p.L, n: pl.n, d: G.dot(pl.n, g.verts[0]) };
  });
  const underStack = (g, M) => {
    const n = g.normal;
    for (const c of planar) {
      if (c.id === g.id || c.L <= g.p.L) continue;
      const dn = G.dot(c.n, n);
      if (Math.abs(dn) < 0.9999) continue;
      if (Math.abs(G.dot(c.n, M) - c.d) > 0.03) continue;
      // containment in the shared plane
      const pl = planeOf(c.g);
      let poly = c.g.verts.map((v) => [G.dot(v, pl.e1), G.dot(v, pl.e2)]);
      if (G.area(poly) < 0) poly = poly.slice().reverse();
      const m = [G.dot(M, pl.e1), G.dot(M, pl.e2)];
      let inside = true;
      for (let i = 0; i < poly.length && inside; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const ex = b[0] - a[0], ey = b[1] - a[1];
        if ((ex * (m[1] - a[1]) - ey * (m[0] - a[0])) / Math.hypot(ex, ey) < -1e-6) inside = false;
      }
      if (inside) return true;
    }
    return false;
  };
  for (const g of geo) {
    const flatG = flatOf(g);
    const c = g.verts[0];
    const toCam = G.sub(camPos, c);
    const s = G.dot(g.normal, toCam) >= 0 ? 1 : -1;
    const lift = G.scale(g.normal, s * LIFT);
    for (const [a, b, t0, t1, nb] of adj.get(g.id)) {
      const pa = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, 0];
      const pb = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, 0];
      const A = G.add(g.map(pa), lift), B = G.add(g.map(pb), lift);
      let isCrease = false;
      if (nb >= 0) {
        const n = byId.get(nb);
        const same = n && (n.bent || g.bent ? G.dot(n.normal, g.normal) > 0.996 : samePose(n.P, g.P));
        if (same) {
          isCrease = true;
          if (nb < g.id) continue; // draw once
          if (E.isSilent(g.p, [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2])) continue;
        }
      }
      // short pieces keep the line depth exact along long creases under perspective
      const arr = isCrease ? faint : dark;
      const nseg = Math.max(1, Math.ceil(G.len(G.sub(B, A)) / 0.06));
      for (let q = 0; q < nseg; q++) {
        const a0 = G.lerp3(A, B, q / nseg), a1 = G.lerp3(A, B, (q + 1) / nseg);
        if (nb < 0 && flatG && abuts(g.id, G.sub(G.lerp3(a0, a1, 0.5), lift))) continue;
        if (!g.bent && underStack(g, G.sub(G.lerp3(a0, a1, 0.5), lift))) continue;
        if (occluded(occ, g.id, camPos, G.lerp3(a0, a1, 0.5))) continue;
        arr.push(...a0, ...a1);
      }
    }
  }
  return { dark, faint };
}

// ---------------------------------------------------------------- camera
const camDir = (el, az) => [Math.cos(el) * Math.sin(az), -Math.cos(el) * Math.cos(az), Math.sin(el)];
function fitCam(points, el, az) {
  const d = camDir(el, az);
  const f = G.scale(d, -1);
  let r = G.cross(f, [0, 0, 1]);
  if (G.len(r) < 1e-6) r = [1, 0, 0];
  r = G.norm(r);
  const u = G.cross(r, f);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of points) {
    const x = G.dot(p, r), y = G.dot(p, u), z = G.dot(p, d);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  }
  const wv = x1 - x0, hv = y1 - y0;
  const tn = Math.tan((FOV / 2) * Math.PI / 180);
  const Dh = hv / (2 * tn * (STAGE.h / H));
  const Dw = wv / (2 * tn * (W / H) * (STAGE.w / W));
  const D = Math.max(Dh, Dw, 2.2) + (z1 - z0) * 0.5;
  const c = G.add(G.add(G.scale(r, (x0 + x1) / 2), G.scale(u, (y0 + y1) / 2)), G.scale(d, (z0 + z1) / 2));
  return { el, az, target: c, D };
}
const CAMSET = {
  base: { el: 64 * Math.PI / 180, az: 0 },
  tilt: { el: 40 * Math.PI / 180, az: -26 * Math.PI / 180 },
  orbit: { el: 46 * Math.PI / 180, az: -30 * Math.PI / 180 },
  finale: { el: 22 * Math.PI / 180, az: -28 * Math.PI / 180 },
};
const camKey = (b) => b.step + '|' + (b.cam.tilt ? 'tilt' : b.cam.orbit ? 'orbit' : b.cam.finale ? 'finale' : 'base');
// group consecutive beats by key and fit each group
const camGroups = [];
for (const b of beats) {
  const k = camKey(b);
  const g = camGroups[camGroups.length - 1];
  if (g && g.key === k) g.beats.push(b); else camGroups.push({ key: k, beats: [b] });
}
for (const g of camGroups) {
  const pts = [];
  const finale = g.key.endsWith('finale');
  for (const b of g.beats) {
    const n = b.op.kind === 'hold' ? 1 : 9;
    for (let i = 0; i <= n; i++) {
      const t = finale ? b.t1 - 0.01 : b.t0 + (b.t1 - b.t0 - 0.01) * (i / n);
      for (const gg of geometry(frameAt(t))) pts.push(...gg.verts);
    }
  }
  const set = CAMSET[g.key.split('|')[1]];
  g.cam = fitCam(pts, set.el, set.az);
  g.t0 = g.beats[0].t0;
  g.t1 = g.beats[g.beats.length - 1].t1;
  g.blend = finale ? g.beats[0].lead + g.beats[0].dur * 0.95 : 1.0;
}
function camAt(t) {
  let i = camGroups.findIndex((g) => t < g.t1);
  if (i < 0) i = camGroups.length - 1;
  const g = camGroups[i];
  let c = g.cam;
  if (i > 0) {
    const k = G.ease((t - g.t0) / g.blend);
    const p = camGroups[i - 1].cam;
    if (k < 1) c = { el: G.lerp(p.el, c.el, k), az: G.lerp(p.az, c.az, k), D: G.lerp(p.D, c.D, k), target: G.lerp3(p.target, c.target, k) };
  }
  const d = camDir(c.el, c.az);
  // shift so the stage centre (not the frame centre) sits on the target
  const tn = Math.tan((FOV / 2) * Math.PI / 180);
  const visH = 2 * c.D * tn;
  const f = G.scale(d, -1);
  const r = G.norm(G.cross(f, [0, 0, 1]));
  const up = G.cross(r, f);
  const look = G.sub(c.target, G.scale(up, ((H / 2 - STAGE.cy) / H) * visH));
  return { pos: G.add(look, G.scale(d, c.D)), look };
}

// ---------------------------------------------------------------- annotations
function topZ(state) {
  const h = heights(state);
  let m = 0;
  for (const v of h.values()) m = Math.max(m, v);
  return m * TH + 0.004;
}
function pointPath(op, id, cp, u0, u1, lift, toward) {
  const idx = op.work.findIndex((p) => p.id === id);
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const u = u0 + (u1 - u0) * (i / 48);
    const vm = op.vmap ? op.vmap(u) : null;
    let q = vm && vm.has(id) ? vm.get(id)(cp) : G.apply(op.pose(u)[idx], [cp[0], cp[1], 0]);
    if (toward) q = G.add(toward.c, G.scale(G.sub(q, toward.c), toward.k));
    q = G.add(q, [0, 0, lift + 0.06 * Math.sin(Math.PI * (i / 48))]);
    pts.push(q);
  }
  return pts;
}
function findVertex(state, wpt) {
  for (const p of state) for (const v of p.poly) {
    const w = E.w2(p, v);
    if (Math.hypot(w[0] - wpt[0], w[1] - wpt[1]) < 1e-6) return { id: p.id, cp: v };
  }
  return null;
}
function lineExtent(state, P, D, filter) {
  let a = Infinity, b = -Infinity;
  for (const p of state) {
    if (filter && !filter(p)) continue;
    for (const v of E.wpoly(p)) {
      const dist = D[0] * (v[1] - P[1]) - D[1] * (v[0] - P[0]);
      if (Math.abs(dist) > 1e-6) continue;
      const s = (v[0] - P[0]) * D[0] + (v[1] - P[1]) * D[1];
      a = Math.min(a, s); b = Math.max(b, s);
    }
  }
  return a < b ? [a, b] : null;
}
for (const b of beats) {
  const op = b.op;
  b.anns = [];
  if (op.kind === 'hold' || op.kind === 'flip' || op.kind === 'finale') continue;
  const z = topZ(op.work) + 0.002;
  const dash = (P, D, ext) => b.anns.push({ kind: 'dash', a: [P[0] + D[0] * ext[0], P[1] + D[1] * ext[0], z], b: [P[0] + D[0] * ext[1], P[1] + D[1] * ext[1], z] });
  const arrow = (pts) => b.anns.push({ kind: 'arrow', pts });
  const ring = (c) => b.anns.push({ kind: 'ring', c: [c[0], c[1], z] });
  if (op.kind === 'fold' || op.kind === 'unfold') {
    op.parts.forEach((pt, k) => {
      const ids = op.partIds[k];
      const ext = lineExtent(op.work, pt.P, pt.D, (p) => ids.has(p.id)) || lineExtent(op.work, pt.P, pt.D);
      if (op.kind === 'fold' && ext) dash(pt.P, pt.D, ext);
      // tracked point: the moving vertex farthest from the line
      let best = null, bd = -1;
      for (const p of op.work) {
        if (!ids.has(p.id)) continue;
        for (const v of p.poly) {
          const w = E.w2(p, v);
          const d = Math.abs(pt.D[0] * (w[1] - pt.P[1]) - pt.D[1] * (w[0] - pt.P[0]));
          if (d > bd + 1e-9) { bd = d; best = { id: p.id, cp: v, w }; }
        }
      }
      if (!best) return;
      const w = (op.kind === 'unfold' ? op.wins && op.wins[k] : pt.win) || [0, 1];
      const s = ((best.w[0] - pt.P[0]) * pt.D[0] + (best.w[1] - pt.P[1]) * pt.D[1]);
      const c = [pt.P[0] + pt.D[0] * s, pt.P[1] + pt.D[1] * s, z];
      arrow(pointPath(op, best.id, best.cp, w[0], w[1], z, { c, k: 0.8 }));
    });
  } else if (op.kind === 'collapse') {
    if (b.u0 === 0) {
      for (const wp of [[0, 1], [1, 0], [-1, 0]]) {
        const v = findVertex(op.work, wp);
        if (v) arrow(pointPath(op, v.id, v.cp, 0, 1, 0.02, { c: [0, -0.2, 0], k: 0.86 }));
      }
    }
  } else if (op.kind === 'petal') {
    const kx = E.KR[0];
    dash([0, E.YK], [1, 0], [-kx, kx]);
    const v = op.work.find((p) => (op.facet.get(p.id) || '')[0] === 'b' && p.poly.some((q) => Math.hypot(...E.w2(p, q).map((x, i) => x - [0, -1][i])) < 1e-6));
    if (v) {
      const cp = v.poly.find((q) => Math.hypot(...E.w2(v, q).map((x, i) => x - [0, -1][i])) < 1e-6);
      arrow(pointPath(op, v.id, cp, 0, 1, z, { c: [0, E.YK, z], k: 0.82 }));
    }
    ring([0, -1]);
  } else if (op.kind === 'reverse') {
    const { P, D } = op.line;
    const ext = lineExtent(op.work, P, D, (p) => op.tip.has(p.id));
    if (ext) dash(P, D, [ext[0] - 0.03, ext[1] + 0.03]);
    let best = null, bd = -1;
    for (const p of op.work) {
      if (!op.tip.has(p.id)) continue;
      for (const v of p.poly) {
        const w = E.w2(p, v);
        const d = Math.hypot(w[0] - P[0], w[1] - P[1]);
        if (d > bd) { bd = d; best = { id: p.id, cp: v }; }
      }
    }
    if (best) arrow(pointPath(op, best.id, best.cp, 0, 1, z, { c: [P[0], P[1], z], k: 0.62 }));
    ring(P);
  }
}

function dashSegs(a, b, prog) {
  const L = G.len(G.sub(b, a)), dir = G.scale(G.sub(b, a), 1 / L);
  const out = [];
  const end = L * prog;
  for (let s = 0; s < end; s += 0.075) {
    const e = Math.min(s + 0.045, end);
    out.push(...G.add(a, G.scale(dir, s)), ...G.add(a, G.scale(dir, e)));
  }
  return out;
}
function polySegs(pts, prog) {
  const out = [];
  if (prog < 0.03) return { segs: out, n: 0 };
  const n = Math.max(1, Math.floor((pts.length - 1) * prog));
  for (let i = 0; i < n; i++) out.push(...pts[i], ...pts[i + 1]);
  return { segs: out, n };
}
function arrowHead(pts, n, camPos, size) {
  if (n < 1) return [];
  const tip = pts[n], prev = pts[Math.max(0, n - 3)];
  const dir = G.norm(G.sub(tip, prev));
  const view = G.norm(G.sub(camPos, tip));
  const side = G.norm(G.cross(dir, view));
  const back = G.scale(dir, -size);
  const a = G.add(tip, G.add(back, G.scale(side, size * 0.62)));
  const c = G.add(tip, G.sub(back, G.scale(side, size * 0.62)));
  return [...tip, ...a, ...tip, ...c];
}
function ringSegs(c, r, camPos) {
  const out = [];
  for (let i = 0; i < 40; i++) {
    const a0 = (i / 40) * Math.PI * 2, a1 = ((i + 1) / 40) * Math.PI * 2;
    out.push(c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0), c[2], c[0] + r * Math.cos(a1), c[1] + r * Math.sin(a1), c[2]);
  }
  return out;
}
function annotationsAt(t, camPos) {
  const { b, lt } = locate(t);
  const { ph, f } = phaseOf(b, lt);
  const list = [];
  if (!b.anns.length || ph === 'hold') return list;
  const draw = ph === 'lead' ? G.ease(lt / Math.max(0.25, b.lead * 0.85)) : 1;
  const fadeA = ph === 'lead' ? 1 : 1 - G.smooth((f - 0.5) / 0.4);
  const fadeD = ph === 'lead' ? 1 : 1 - G.smooth((f - 0.75) / 0.25);
  for (const a of b.anns) {
    if (a.kind === 'dash') {
      const segs = dashSegs(a.a, a.b, draw);
      list.push({ segs, color: TOK.halo, width: 7, opacity: fadeD * 0.9, order: 0 });
      list.push({ segs, color: TOK.annot, width: 3, opacity: fadeD, order: 1 });
    } else if (a.kind === 'arrow') {
      const { segs, n } = polySegs(a.pts, draw);
      const head = draw > 0.15 ? arrowHead(a.pts, n, camPos, 0.055 * G.smooth((draw - 0.15) / 0.2)) : [];
      const all = segs.concat(head);
      list.push({ segs: all, color: TOK.halo, width: 9, opacity: fadeA * 0.9, order: 2 });
      list.push({ segs: all, color: TOK.annot, width: 3.6, opacity: fadeA, order: 3 });
    } else if (a.kind === 'ring') {
      const k = ph === 'lead' ? G.ease(lt / Math.max(0.2, b.lead)) : 1;
      const pulse = 1 + 0.12 * Math.sin(Math.min(1, (ph === 'lead' ? lt / b.lead : 1)) * Math.PI);
      const segs = ringSegs(a.c, 0.065 * k * pulse, camPos);
      list.push({ segs, color: TOK.halo, width: 9, opacity: fadeA * 0.9, order: 4 });
      list.push({ segs, color: TOK.ring, width: 4, opacity: fadeA, order: 5 });
    }
  }
  return list;
}

// ---------------------------------------------------------------- captions
const capSegs = [];
for (const b of beats) {
  const add = (t0, text, note) => {
    const last = capSegs[capSegs.length - 1];
    if (last && last.text === text && last.step === b.step && last.note === note) return;
    capSegs.push({ t0, text, step: b.step, note });
  };
  add(b.t0, b.caption, b.note);
  if (b.holdCaption) add(b.t0 + b.lead + b.dur + 0.2, b.holdCaption, '');
}
const segAt = (t) => {
  let i = 0;
  while (i + 1 < capSegs.length && capSegs[i + 1].t0 <= t) i++;
  return i;
};

// ---------------------------------------------------------------- DOM
const root = document.getElementById('stage');
const canvas = document.getElementById('gl');
const R = new Renderer(canvas, W, H);
const el = (id) => document.getElementById(id);
const capA = el('capA'), capB = el('capB'), stepA = el('stepA'), stepB = el('stepB'), noteA = el('noteA'), noteB = el('noteB'), flipIcon = el('flip');

function setText(cur, prev, curText, prevText, age, rise = 18) {
  const kin = G.ease((age - 0.08) / 0.32), kout = 1 - G.smooth(age / 0.16);
  cur.textContent = curText;
  cur.style.opacity = String(kin);
  cur.style.transform = `translateY(${(1 - kin) * rise}px)`;
  prev.textContent = prevText;
  prev.style.opacity = prevText !== curText ? String(kout) : '0';
  prev.style.transform = `translateY(${-(1 - kout) * rise * 0.6}px)`;
}
function captionsAt(t) {
  const i = segAt(t), s = capSegs[i], p = capSegs[i - 1];
  const age = t - s.t0;
  setText(capA, capB, s.text, p ? p.text : '', i === 0 ? age + 1 : age);
  // step label changes only when the step changes
  let j = i;
  while (j > 0 && capSegs[j - 1].step === s.step) j--;
  const pj = capSegs[j - 1];
  const label = s.step === 'Done' ? '' : s.step;
  setText(stepA, stepB, label, pj ? (pj.step === 'Done' ? '' : pj.step) : '', j === 0 ? t + 1 : t - capSegs[j].t0, 10);
  let k = i;
  while (k > 0 && capSegs[k - 1].note === s.note) k--;
  const pk = capSegs[k - 1];
  setText(noteA, noteB, s.note || '', pk ? pk.note || '' : '', k === 0 ? t + 1 : t - capSegs[k].t0, 12);
  // turn-over icon
  const { b, lt } = locate(t);
  let fo = 0, rot = 0;
  if (b.op.kind === 'flip') {
    const { ph, f } = phaseOf(b, lt);
    fo = ph === 'lead' ? G.ease(lt / b.lead) : ph === 'move' ? 1 : 1 - G.smooth((lt - b.lead - b.dur) / 0.3);
    rot = ph === 'lead' ? 0 : 180 * G.ease(f);
  }
  flipIcon.style.opacity = String(fo);
  flipIcon.style.transform = `translate(-50%, -50%) rotateY(${rot}deg)`;
}

let lastGeo = null;
function renderAt(t) {
  const fr = frameAt(t);
  const geo = geometry(fr);
  const cam = camAt(t);
  R.setCamera(cam.pos, cam.look);
  R.setPaper(geo);
  const { dark, faint } = edges(fr, geo, cam.pos);
  R.setLines(dark, faint);
  let zmin = Infinity, cx = 0, cy = 0, n = 0;
  for (const g of geo) for (const v of g.verts) { zmin = Math.min(zmin, v[2]); cx += v[0]; cy += v[1]; n++; }
  R.setFloor(zmin - 0.002, 0, 0);
  R.setAnnotations(annotationsAt(t, cam.pos));
  captionsAt(t);
  R.render();
  lastGeo = geo;
}

// ---------------------------------------------------------------- playback
const params = new URLSearchParams(location.search);
const capture = params.has('capture');
let t = parseFloat(params.get('t') || '0') || 0;
let playing = !capture && !params.has('t');
let last = null;
const stepStarts = [];
for (const b of beats) if (!stepStarts.length || stepStarts[stepStarts.length - 1].step !== b.step) stepStarts.push({ step: b.step, t: b.t0 });

function fitStage() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  root.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', fitStage);
fitStage();

const scrub = el('scrub');
scrub.max = String(DURATION);
scrub.addEventListener('input', () => { t = parseFloat(scrub.value); playing = false; renderAt(t); });
function toggle() { playing = !playing; if (t >= DURATION - 0.01) t = 0; last = null; }
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
    const cur = stepStarts.findIndex((s, i) => t >= s.t && (i + 1 === stepStarts.length || t < stepStarts[i + 1].t));
    const nx = Math.max(0, Math.min(stepStarts.length - 1, cur + (e.code === 'ArrowRight' ? 1 : -1)));
    t = stepStarts[nx].t + (e.code === 'ArrowLeft' && t - stepStarts[cur].t > 1 ? 0 : 0);
    if (e.code === 'ArrowLeft' && t - stepStarts[cur].t > 1) t = stepStarts[cur].t;
    renderAt(t);
  }
});
el('hit').addEventListener('click', toggle);

function loop(now) {
  if (playing) {
    if (last !== null) t += Math.min(1 / 15, (now - last) / 1000);
    if (t >= DURATION) { t = DURATION - 0.001; playing = false; }
    renderAt(t);
    scrub.value = String(t);
  }
  last = playing ? now : null;
  requestAnimationFrame(loop);
}

window.__duration = DURATION;
window.__frame = (tt) => { t = tt; renderAt(tt); return true; };
window.__steps = stepStarts;
renderAt(t);
if (!capture) requestAnimationFrame(loop);
console.log('duration', DURATION.toFixed(2), 'beats', beats.length);
