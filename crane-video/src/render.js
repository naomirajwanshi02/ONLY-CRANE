// three.js renderer: painted paper, studio light, soft shadows, fat ink lines, annotations.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

export const TOK = {
  page: '#ecdfc6',
  ink: '#2b1e13',
  text: '#5b4630',
  muted: '#8f7a5e',
  annot: '#2a1d10',
  halo: '#fbf3e2',
  ring: '#c2402f',
  colour: '#d47a44',
  white: '#f1e2c4',
  crease: '#d3cfc8', // creases are light grey; only paper outlines are ink
};

function fibreCanvas(size, seed) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#f4f4f4';
  g.fillRect(0, 0, size, size);
  // speckle
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 236 + rnd() * 19;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
  // fibres
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * size, y = rnd() * size, a = rnd() * Math.PI * 2, l = 6 + rnd() * 26;
    g.strokeStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.25 + rnd() * 0.35})` : `rgba(120,110,100,${0.05 + rnd() * 0.08})`;
    g.lineWidth = 0.6 + rnd() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return c;
}

export class Renderer {
  constructor(canvas, W, H) {
    this.W = W; this.H = H;
    const r = (this.r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true }));
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.9;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.setClearColor(0x000000, 0);

    const scene = (this.scene = new THREE.Scene());
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(r), 0.04).texture;

    const cam = (this.cam = new THREE.PerspectiveCamera(24, W / H, 0.05, 200));
    cam.up.set(0, 0, 1);

    // lights: warm key with soft shadows, cool fill, warm rim
    const key = (this.key = new THREE.DirectionalLight(0xfff0dc, 2.4));
    key.position.set(-2.2, -2.6, 6.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = sc.bottom = -2.4; sc.right = sc.top = 2.4; sc.near = 0.5; sc.far = 20;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.012;
    key.shadow.radius = 4;
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xd9e4ff, 0.85);
    fill.position.set(3.5, -1.5, 3);
    const rim = new THREE.DirectionalLight(0xffcf9a, 0.9);
    rim.position.set(1.5, 4.5, 2.2);
    scene.add(fill, rim);

    // floor that only catches shadows
    const floor = (this.floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: 0x3a2412, opacity: 0.15, depthWrite: false })));
    floor.receiveShadow = true;
    floor.renderOrder = -1;
    scene.add(floor);

    // paper
    const tex = new THREE.CanvasTexture(fibreCanvas(1024, 7));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    const bump = new THREE.CanvasTexture(fibreCanvas(1024, 11));
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    const mat = (color, side) =>
      new THREE.MeshStandardMaterial({
        color, side, map: tex, bumpMap: bump, bumpScale: 0.6, roughness: 0.86, metalness: 0,
        envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
      });
    this.geo = new THREE.BufferGeometry();
    this.front = new THREE.Mesh(this.geo, mat(TOK.colour, THREE.FrontSide));
    this.back = new THREE.Mesh(this.geo, mat(TOK.colour, THREE.BackSide)); // both sides orange
    for (const m of [this.front, this.back]) { m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false; scene.add(m); }

    // ink lines on the paper
    const lm = (color, width, opacity) => {
      const m = new LineMaterial({ color, linewidth: width, transparent: opacity < 1, opacity, depthWrite: false });
      m.resolution.set(W, H);
      return m;
    };
    this.darkMat = lm(TOK.ink, 2.4, 1);
    this.faintMat = lm(TOK.crease, 1.7, 0.95);
    this.dark = new LineSegments2(new LineSegmentsGeometry(), this.darkMat);
    this.faint = new LineSegments2(new LineSegmentsGeometry(), this.faintMat);
    for (const l of [this.dark, this.faint]) { l.frustumCulled = false; scene.add(l); }

    // annotation layer (always on top)
    this.annGroup = new THREE.Group();
    this.annGroup.renderOrder = 10;
    scene.add(this.annGroup);
    this.annPool = [];
  }

  // pieces: [{verts:[[x,y,z],...], uv:[[u,v],...], normal:[x,y,z]}]; edges: {dark:[...], faint:[...]} flat xyz arrays
  setPaper(polys) {
    let n = 0;
    for (const p of polys) n += (p.verts.length - 2) * 3;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let k = 0;
    for (const p of polys) {
      const V = p.verts, U = p.uv, N = p.normal;
      for (let i = 1; i < V.length - 1; i++) {
        for (const j of [0, i, i + 1]) {
          pos[k * 3] = V[j][0]; pos[k * 3 + 1] = V[j][1]; pos[k * 3 + 2] = V[j][2];
          nor[k * 3] = N[0]; nor[k * 3 + 1] = N[1]; nor[k * 3 + 2] = N[2];
          uv[k * 2] = U[j][0]; uv[k * 2 + 1] = U[j][1];
          k++;
        }
      }
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.computeBoundingSphere();
  }
  setLines(dark, faint) {
    const set = (obj, arr) => {
      obj.geometry.dispose();
      const g = new LineSegmentsGeometry();
      if (arr.length) g.setPositions(arr);
      obj.geometry = g;
      obj.visible = arr.length > 0;
    };
    set(this.dark, dark);
    set(this.faint, faint);
  }
  // ann: [{segs:[flat xyz], color, width, opacity}]
  setAnnotations(list) {
    while (this.annPool.length < list.length) {
      const m = new LineMaterial({ color: 0, linewidth: 2, transparent: true, depthTest: false, depthWrite: false });
      m.resolution.set(this.W, this.H);
      const o = new LineSegments2(new LineSegmentsGeometry(), m);
      o.frustumCulled = false;
      o.renderOrder = 20;
      this.annGroup.add(o);
      this.annPool.push(o);
    }
    this.annPool.forEach((o, i) => {
      const a = list[i];
      if (!a || !a.segs.length || a.opacity <= 0.001) { o.visible = false; return; }
      o.visible = true;
      o.geometry.dispose();
      const g = new LineSegmentsGeometry();
      g.setPositions(a.segs);
      o.geometry = g;
      o.material.color.set(a.color);
      o.material.linewidth = a.width;
      o.material.opacity = a.opacity;
      o.renderOrder = 20 + (a.order || 0);
    });
  }
  setCamera(pos, target) {
    this.cam.position.set(...pos);
    this.cam.lookAt(...target);
    this.cam.updateMatrixWorld();
  }
  // floor shadow strength 0..1 (the table shadow only appears under the finished crane)
  setShadow(k) {
    this.floor.material.opacity = 0.15 * k;
    this.floor.visible = k > 0.001;
  }
  setFloor(z, cx, cy) {
    this.floor.position.set(cx, cy, z);
    this.key.target.position.set(cx, cy, z);
    this.key.position.set(cx - 2.2, cy - 2.6, z + 6.5);
  }
  render() {
    this.r.render(this.scene, this.cam);
  }
}
