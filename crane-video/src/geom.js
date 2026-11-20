// Small vector / matrix / polygon helpers. 3-vectors are [x,y,z], 3x3 matrices are row-major arrays of 9.

export const EPS = 1e-9;

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Easing: calm cubic in-out, and a smoother quintic for long moves.
export const ease = (x) => {
  x = clamp01(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const smooth = (x) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};
export const win = (u, a, b) => clamp01((u - a) / (b - a));

export const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
export const mmul = (A, B) => {
  const C = new Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return C;
};
export const mv = (A, v) => [
  A[0] * v[0] + A[1] * v[1] + A[2] * v[2],
  A[3] * v[0] + A[4] * v[1] + A[5] * v[2],
  A[6] * v[0] + A[7] * v[1] + A[8] * v[2],
];
export const mT = (A) => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];

// Rodrigues rotation about a unit axis.
export function rotAxis(k, a) {
  k = norm(k);
  const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  const [x, y, z] = k;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
}

// Rigid poses {R, T}: p -> R p + T.
export const IDP = { R: I3, T: [0, 0, 0] };
export const apply = (P, p) => add(mv(P.R, p), P.T);
export const compose = (B, A) => ({ R: mmul(B.R, A.R), T: add(mv(B.R, A.T), B.T) }); // B after A
export function rotAbout(point, axis, ang) {
  const R = rotAxis(axis, ang);
  return { R, T: sub(point, mv(R, point)) };
}
function frame(p0, p1, p2) {
  const e1 = norm(sub(p1, p0));
  const e3 = norm(cross(sub(p1, p0), sub(p2, p0)));
  const e2 = cross(e3, e1);
  // columns e1 e2 e3
  return [e1[0], e2[0], e3[0], e1[1], e2[1], e3[1], e1[2], e2[2], e3[2]];
}
// Rigid motion taking triangle P to the congruent triangle Q.
export function motion3(P0, P1, P2, Q0, Q1, Q2) {
  const R = mmul(frame(Q0, Q1, Q2), mT(frame(P0, P1, P2)));
  return { R, T: sub(Q0, mv(R, P0)) };
}

// Slerp between two rigid poses (used only for gentle camera/finale blends).
export function poseLerp(A, B, t) {
  // interpolate rotation via axis-angle of A^-1 B
  const D = mmul(B.R, mT(A.R));
  const tr = D[0] + D[4] + D[8];
  let ang = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)));
  let R;
  if (ang < 1e-8) R = A.R;
  else {
    let ax = [D[7] - D[5], D[2] - D[6], D[3] - D[1]];
    if (len(ax) < 1e-8) ax = [1, 0, 0];
    R = mmul(rotAxis(ax, ang * t), A.R);
  }
  return { R, T: lerp3(A.T, B.T, t) };
}

// ---- 2D polygons (arrays of [x,y]) ----
export const c2 = (a, b) => a[0] * b[1] - a[1] * b[0];
export function area(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    s += a[0] * b[1] - a[1] * b[0];
  }
  return s / 2;
}
export function centroid(poly) {
  let cx = 0, cy = 0, A = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const f = a[0] * b[1] - b[0] * a[1];
    cx += (a[0] + b[0]) * f;
    cy += (a[1] + b[1]) * f;
    A += f;
  }
  if (Math.abs(A) < 1e-14) {
    let x = 0, y = 0;
    for (const p of poly) { x += p[0]; y += p[1]; }
    return [x / poly.length, y / poly.length];
  }
  return [cx / (3 * A), cy / (3 * A)];
}
// Split convex polygon by line through p0 with normal n. Returns [neg, pos].
export function splitPoly(poly, p0, n, eps = 1e-9) {
  const d = poly.map((p) => (p[0] - p0[0]) * n[0] + (p[1] - p0[1]) * n[1]);
  const neg = [], pos = [];
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    const a = poly[i], b = poly[j], da = d[i], db = d[j];
    if (da <= eps) neg.push(a);
    if (da >= -eps) pos.push(a);
    if ((da < -eps && db > eps) || (da > eps && db < -eps)) {
      const t = da / (da - db);
      const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      neg.push(q);
      pos.push(q);
    }
  }
  const ok = (P) => P.length >= 3 && Math.abs(area(P)) > 1e-10;
  return [ok(neg) ? dedupe(neg) : null, ok(pos) ? dedupe(pos) : null];
}
function dedupe(P) {
  const out = [];
  for (const p of P) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-10) out.push(p);
  }
  if (out.length > 1) {
    const a = out[0], b = out[out.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-10) out.pop();
  }
  return out;
}
// Convex polygon intersection area (Sutherland-Hodgman). Both CCW or CW; we normalise.
export function interArea(P, Q) {
  if (area(P) < 0) P = P.slice().reverse();
  if (area(Q) < 0) Q = Q.slice().reverse();
  let out = P;
  for (let i = 0; i < Q.length && out.length; i++) {
    const a = Q[i], b = Q[(i + 1) % Q.length];
    const n = [-(b[1] - a[1]), b[0] - a[0]]; // left normal (inside for CCW)
    const s = splitPoly(out, a, n, 1e-12)[1];
    out = s || [];
  }
  return out.length >= 3 ? Math.abs(area(out)) : 0;
}
export function bbox(P) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P) {
    if (p[0] < x0) x0 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[0] > x1) x1 = p[0];
    if (p[1] > y1) y1 = p[1];
  }
  return [x0, y0, x1, y1];
}
