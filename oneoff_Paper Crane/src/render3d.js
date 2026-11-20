/* three.js renderer in the Anatomy sepia "realistic scale model" look (same recipe as the naomirajwanshi02 WebAR repos):
   physically based paper painted in code, studio environment, ACES filmic tone mapping, a warm key light with soft
   real shadows on the table, a cool fill and a warm rim. The fold engine above gives each piece its rigid transform. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const W = 1080, H = 1920, FOV = 24, TH = 0.0045;
const stage = document.getElementById('ny-stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
Object.assign(renderer.domElement.style, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px', zIndex: 5 });
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture; pm.dispose(); }
scene.environmentIntensity = 0.35;
const camera = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 60); camera.up.set(0, 0, 1);

// lights (z is up): warm key from upper left front with soft shadows, cool fill, warm rim, sky/ground bounce
const hemi = new THREE.HemisphereLight('#fff6e8', '#6a5238', 0.55); hemi.position.set(0, 0, 1); scene.add(hemi);
const key = new THREE.DirectionalLight('#fff0d8', 2.2); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.012; key.shadow.radius = 4;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight('#dfe8ff', 0.45), rim = new THREE.DirectionalLight('#ffe2c0', 0.55);
scene.add(fill, fill.target, rim, rim.target);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: '#3b2a1a', opacity: 0.26 }));
ground.receiveShadow = true; scene.add(ground);

// paper painted in code: fine fibres and a little tooth; colour side warm orange, back side cream
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646, rr = (a, b) => a + (b - a) * rnd();
function paperTex(base, fibre) {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { g.strokeStyle = `rgba(${fibre},${rr(0.03, 0.09)})`; g.lineWidth = rr(0.4, 1.1);
    const x = rr(0, 1024), y = rr(0, 1024), a = rr(0, Math.PI), l = rr(4, 22); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : fibre},${rr(0.03, 0.08)})`; const s = rr(0.6, 1.8); g.fillRect(rr(0, 1024), rr(0, 1024), s, s); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function bumpTex() { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${rr(0.04, 0.12)})`; const s = rr(0.8, 2.4); g.fillRect(rr(0, 512), rr(0, 512), s, s); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t; }
const bump = bumpTex();
const matFront = new THREE.MeshStandardMaterial({ map: paperTex('#d47a44', '110,45,15'), roughness: 0.82, metalness: 0, bumpMap: bump, bumpScale: 0.6, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
const matBack = new THREE.MeshStandardMaterial({ map: paperTex('#f1e2c4', '140,110,70'), roughness: 0.9, metalness: 0, bumpMap: bump, bumpScale: 0.6, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
const MAXV = 6000;
const geo = new THREE.BufferGeometry();
const pos = new Float32Array(MAXV * 3), nor = new Float32Array(MAXV * 3), uv = new Float32Array(MAXV * 2);
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
const meshF = new THREE.Mesh(geo, matFront), meshB = new THREE.Mesh(geo, matBack);
[meshF, meshB].forEach(m => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); });
// the back face casts shadows too (a single sided mesh casts only from its front)
matFront.shadowSide = THREE.DoubleSide; matBack.shadowSide = THREE.DoubleSide;

// edges: folded edges and paper edges as thin dark lines, flat creases as faint lines (screen-space widths)
const edgeMat = new LineMaterial({ color: 0x4a3220, linewidth: 1.7, transparent: true, opacity: 0.8, resolution: new THREE.Vector2(W, H) });
const creaseMat = new LineMaterial({ color: 0x6a4a2c, linewidth: 1.1, transparent: true, opacity: 0.32, resolution: new THREE.Vector2(W, H) });
const edges = new LineSegments2(new LineSegmentsGeometry(), edgeMat), creases = new LineSegments2(new LineSegmentsGeometry(), creaseMat);
edges.frustumCulled = creases.frustumCulled = false; scene.add(edges, creases);

/* ---- camera: E (elevation), az, target T, distance D ---- */
const basis = c => { const w = viewVec(c), f = [-w[0], -w[1], -w[2]], r = nrm(cross(f, [0, 0, 1])), u = cross(r, f); return { w, r, u }; };
window.fitCam3 = (states, base, box = [840, 760]) => {
  const pts = []; states.forEach(items => items.forEach(({ pc, M }) => W3(pc, M).forEach(p => pts.push(p))));
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; pts.forEach(p => { for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); } });
  const T = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], { w, r, u } = basis(base), t = Math.tan(FOV / 2 * PI / 180);
  let D = 1; pts.forEach(p => { const d = sub(p, T), x = Math.abs(dot(d, r)), y = Math.abs(dot(d, u)), z = dot(d, w);
    D = Math.max(D, z + y / (t * box[1] / H), z + x / (t * (W / H) * box[0] / W)); });
  return { ...base, T, D };
};
const lerpCam3 = (a, b, s) => ({ E: lerp(a.E, b.E, s), az: lerp(a.az, b.az, s), T: [0, 1, 2].map(i => lerp(a.T[i], b.T[i], s)), D: Math.exp(lerp(Math.log(a.D), Math.log(b.D), s)) });
window.lerpCam = lerpCam3;
function setCam(c) { const { w } = basis(c); camera.position.set(c.T[0] + w[0] * c.D, c.T[1] + w[1] * c.D, c.T[2] + w[2] * c.D); camera.lookAt(c.T[0], c.T[1], c.T[2]); camera.updateMatrixWorld(); }
const v3 = new THREE.Vector3();
window.proj = (p) => { v3.set(p[0], p[1], p[2] || 0).project(camera); return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H]; };

/* ---- layer thickness: each sheet rests one paper-thickness above the layers under it ---- */
function ranks(S) { const Wp = S.map(W2), Cn = Wp.map(cent), r = new Map();
  S.forEach((pc, i) => { let k = 0; S.forEach((q, j) => { if (q.L < pc.L && inside(Wp[j], Cn[i])) k++; }); r.set(pc.id, k); }); return r; }
function rankInfo(op) { if (op._ri) return op._ri;
  const pre = op.pre, end = op.flatEnd || op.end, rp = ranks(pre), flatEnd = !op.finale;
  const re = flatEnd ? ranks(end) : null, Mp = new Map(pre.map(p => [p.id, p.M])), Me = new Map(end.map(p => [p.id, p.M]));
  return (op._ri = { rp, re, Mp, Me }); }
const carry = (Mnow, Mref, r) => { const R = Mnow.R, Q = Mref.R; // (Mnow Mref^-1).R * (0,0,r)
  const z = [Q[2] * r * TH, Q[5] * r * TH, Q[8] * r * TH]; return mv(R, z); };

// neighbour piece across each crease-pattern edge (-1 = paper edge), per op
function nbOf(op) { if (op._nb) return op._nb; const pcs = op.pre, nb = new Map();
  pcs.forEach(pc => { const ccw = area(pc.cp) > 0 ? 1 : -1; nb.set(pc.id, pc.cp.map((a, k) => { const b = pc.cp[(k + 1) % pc.cp.length];
    if ((Math.abs(a[0]) > 1 - 1e-6 && Math.abs(b[0]) > 1 - 1e-6 && Math.abs(a[0] - b[0]) < 1e-6) || (Math.abs(a[1]) > 1 - 1e-6 && Math.abs(b[1]) > 1 - 1e-6 && Math.abs(a[1] - b[1]) < 1e-6)) return -1;
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = n2([b[0] - a[0], b[1] - a[1]]), o = [m[0] + ccw * d[1] * 1e-4, m[1] - ccw * d[0] * 1e-4];
    const q = pcs.find(r => r !== pc && inside(r.cp, o)); return q ? q.id : -1; })); });
  return (op._nb = nb); }

/* ---- draw one frame ---- */
window.drawPaper = (op, items, cam, u) => {
  setCam(cam);
  const nb = nbOf(op), Mm = new Map(items.map(it => [it.pc.id, it.M])), ri = rankInfo(op);
  const s = !ri || op.finale || op.posedOp || !ri.re ? 0 : io(clamp(u));
  let n = 0; const eseg = [], cseg = []; let zmin = 1e9;
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const it of items) {
    const M = it.M; let off = [0, 0, 0];
    if (ri) { const a = carry(M, ri.Mp.get(it.pc.id), ri.rp.get(it.pc.id) || 0);
      const b = ri.re && ri.Me.get(it.pc.id) ? carry(M, ri.Me.get(it.pc.id), ri.re.get(it.pc.id) || 0) : a;
      off = add(mul(a, 1 - s), mul(b, s)); }
    const P = it.pc.cp.map(q => add(app(M, [q[0], q[1], 0]), off));
    const nrmv = mv(M.R, [0, 0, 1]), ccw = area(it.pc.cp) > 0;
    P.forEach(p => { zmin = Math.min(zmin, p[2]); for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); } });
    for (let k = 1; k + 1 < P.length; k++) { const tri = ccw ? [0, k, k + 1] : [0, k + 1, k];
      for (const j of tri) { if (n >= MAXV) break; pos.set(P[j], n * 3); nor.set(nrmv, n * 3); uv.set([(it.pc.cp[j][0] + 1) / 2, (it.pc.cp[j][1] + 1) / 2], n * 2); n++; } }
    // edges: lifted a hair toward whichever side faces the camera so they sit on the visible face
    const e = nb.get(it.pc.id) || [], lift = mul(nrmv, (dot(nrmv, viewVec(cam)) >= 0 ? 1 : -1) * TH * 0.4);
    P.forEach((a, k) => { const b = P[(k + 1) % P.length], q = e[k], Mq = q >= 0 ? Mm.get(q) : null;
      const seg = [...add(a, lift), ...add(b, lift)], flat = Mq && sameM(Mq, M);
      if (flat && op.idMin != null && u <= 0 && it.pc.id >= op.idMin && q >= op.idMin) return; // this fold's crease: not there until it starts
      (flat ? cseg : eseg).push(...seg); });
  }
  if (u <= 0 && op._zTop == null) { let zt = -1e9; for (let i = 2; i < n * 3; i += 3) zt = Math.max(zt, pos[i]); op._zTop = zt; }
  geo.setDrawRange(0, n); geo.attributes.position.needsUpdate = geo.attributes.normal.needsUpdate = geo.attributes.uv.needsUpdate = true;
  geo.computeBoundingSphere();
  edges.geometry.dispose(); edges.geometry = new LineSegmentsGeometry().setPositions(eseg.length ? eseg : [0, 0, 0, 0, 0, 0]);
  creases.geometry.dispose(); creases.geometry = new LineSegmentsGeometry().setPositions(cseg.length ? cseg : [0, 0, 0, 0, 0, 0]);
  creases.visible = cseg.length > 0;
  ground.position.set(0, 0, zmin - 0.003);
  // lights follow the model's centre (the sun stays put in the room)
  const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], sz = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2], 1);
  key.target.position.set(...c); key.position.set(c[0] - 1.6 * sz, c[1] - 1.2 * sz, c[2] + 3.2 * sz);
  fill.target.position.set(...c); fill.position.set(c[0] + 2 * sz, c[1] - 1.5 * sz, c[2] + 1.5 * sz);
  rim.target.position.set(...c); rim.position.set(c[0] + 1.2 * sz, c[1] + 3 * sz, c[2] + 1.6 * sz);
  const sc = key.shadow.camera, h = sz * 2.4; Object.assign(sc, { left: -h, right: h, top: h, bottom: -h, near: 0.1, far: 12 * sz }); sc.updateProjectionMatrix();
  renderer.render(scene, camera);
};
window.dispatchEvent(new Event('crane3d-ready'));
