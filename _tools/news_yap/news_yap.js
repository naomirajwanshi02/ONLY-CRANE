/* news_yap runtime: deterministic render(t), cue timing, components and transitions.
   Usage in a reel page:
     <link rel="stylesheet" href="news_yap.css"><script src="cues.js"></script><script src="news_yap.js"></script>
     NY.mount({ end: 70, render: t => { ... } });
   Times come from NY.cue("id") (resolved from the recording by sync.py into cues.js), never hard-coded. */
(function () {
  const NY = (window.NY = {});
  const NS = "http://www.w3.org/2000/svg";

  /* ---------- math + easing (DESIGN.md section 6) ---------- */
  NY.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  NY.p = (t, a, b) => NY.clamp((t - a) / (b - a));
  NY.lerp = (a, b, u) => a + (b - a) * u;
  NY.e = {
    out: x => 1 - Math.pow(1 - x, 3),
    in: x => x * x * x,
    inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  };
  NY.dur = { micro: 0.18, enter: 0.32, exit: 0.2, scene: 0.45, camera: 0.6, stagger: 0.06 };
  /* progress of an element that enters at t0 and exits at t1 (exit optional): 0..1 */
  NY.life = (t, t0, t1 = Infinity) => NY.e.out(NY.p(t, t0, t0 + NY.dur.enter)) * (1 - NY.e.in(NY.p(t, t1 - NY.dur.exit, t1)));

  /* ---------- cues ---------- */
  // window.NY_CUES = { id: seconds } is written by sync.py from the recording.
  // window.NY_CUES_EST = { id: seconds } holds planned times used until the recording exists.
  NY.cue = (id, lead = 0) => {
    const c = (window.NY_CUES && window.NY_CUES[id]) ?? (window.NY_CUES_EST && window.NY_CUES_EST[id]);
    if (c == null) { console.warn("news_yap: missing cue", id); return 0; }
    return c + lead;
  };

  /* ---------- DOM helpers ---------- */
  NY.el = (tag, cls, html, parent, style) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (style) e.style.cssText = style; if (parent) parent.appendChild(e); return e; };
  NY.sv = (tag, attrs, parent, html) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };

  /* ---------- entrance styles (apply progress u in 0..1) ---------- */
  NY.enter = {
    fade: (el, u) => { el.style.opacity = u; },
    rise: (el, u) => { el.style.opacity = u; el.style.translate = `0 ${(1 - u) * 22}px`; },
    scale: (el, u) => { el.style.opacity = u; el.style.scale = 0.9 + 0.1 * u; },
    wipe: (el, u) => { el.style.opacity = u > 0 ? 1 : 0; el.style.clipPath = `inset(-20% ${(1 - u) * 100}% -20% 0)`; },
    push: (el, u) => { el.style.opacity = u; el.style.translate = `0 ${(1 - u) * 120}px`; },
  };

  /* ---------- components ---------- */
  // corner-bracket label in the title band
  NY.label = (parent, { top = 320 } = {}) => {
    const root = NY.el("div", "ny-label", "", parent, `top:${top}px`);
    let key = "";
    return {
      root,
      render(t, t0, t1, main, sub) {
        const k = main + "|" + sub;
        if (k !== key) { key = k; root.innerHTML = main ? `<div class="box"><span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span><div class="m">${main}</div><div class="s">${sub || ""}</div></div>` : ""; }
        const u = NY.life(t, t0, t1);
        root.style.opacity = u;
        const d = 34 * NY.e.out(NY.p(t, t0, t0 + NY.dur.enter + 0.1));
        root.querySelectorAll(".c").forEach(c => c.style.setProperty("--d", d + "px"));
        const m = root.querySelector(".m"); if (m) NY.enter.rise(m, NY.e.out(NY.p(t, t0 + 0.06, t0 + 0.06 + NY.dur.enter)));
      },
    };
  };
  // leader tag: uppercase key, big value, underline, stem down to an anchor (screen space SVG)
  NY.tag = (svg, { key, value, width }) => {
    const g = NY.sv("g", {}, svg), inner = NY.sv("g", {}, g);
    const W = width || Math.max(key.length * 17, value.length * 21) + 10;
    const glow = { stroke: "#fbf3e2", "stroke-width": 12, "stroke-linejoin": "round", "paint-order": "stroke" }; // paper underglow, text colour unchanged
    NY.sv("text", { x: 0, y: 30, "font-size": 26, "font-weight": 600, fill: "#8a7356", "letter-spacing": 2, ...glow }, inner).textContent = key.toUpperCase();
    NY.sv("text", { x: 0, y: 76, "font-size": 40, "font-weight": 800, fill: "#2a1d10", ...glow }, inner).textContent = value;
    const ulGlow = NY.sv("line", { x1: 0, y1: 92, x2: W, y2: 92, stroke: "#fbf3e2", "stroke-width": 10, "stroke-linecap": "round" }, g);
    const ul = NY.sv("line", { x1: 0, y1: 92, x2: W, y2: 92, stroke: "#3b2a1a", "stroke-width": 2 }, g);
    const stem = NY.sv("line", { stroke: "#3b2a1a", "stroke-width": 2 }, svg);
    return {
      W,
      render(t, t0, t1, ax, ay) {
        const u = NY.life(t, t0, t1);
        const y = Math.max(520, ay - 200), xMax = (y + 92 > 960 ? 880 : 1080 - 60) - W;   // below y 960 keep clear of the right button rail
        const x = ax + 24 <= xMax ? Math.max(60, ax + 24) : Math.max(60, Math.min(xMax, ax - 24 - W));
        g.setAttribute("transform", `translate(${x} ${y})`);
        ul.setAttribute("x2", W * NY.e.out(NY.p(t, t0, t0 + NY.dur.enter))); ulGlow.setAttribute("x2", ul.getAttribute("x2"));
        g.style.opacity = u > 0 ? 1 - NY.e.in(NY.p(t, t1 - NY.dur.exit, t1)) : 0;
        NY.enter.rise(inner, NY.e.out(NY.p(t, t0 + 0.08, t0 + 0.08 + NY.dur.enter)));
        stem.setAttribute("x1", ax); stem.setAttribute("y1", ay); stem.setAttribute("x2", ax);
        stem.setAttribute("y2", NY.lerp(ay, y + 92, NY.e.out(NY.p(t, t0, t0 + NY.dur.enter)))); stem.style.opacity = u;
      },
    };
  };
  // count card with a rolling number; value is a number (rolls) or a string (fades)
  NY.count = (parent, { x, y, value, key, prefix = "", suffix = "", indian = true }) => {
    const d = NY.el("div", "ny-count", `<div class="v${String(prefix + value + suffix).length > 6 ? " s" : ""}"></div><div class="k">${key.toUpperCase()}</div>`, parent, `left:${x}px;top:${y}px`);
    const v = d.querySelector(".v");
    const fmt = n => { const s = String(Math.round(n)); if (!indian || s.length <= 3) return s; return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + s.slice(-3); };
    return {
      render(t, t0, t1) {
        NY.enter.rise(d, NY.life(t, t0, t1));
        v.textContent = typeof value === "number" ? prefix + fmt(value * NY.e.out(NY.p(t, t0, t0 + 0.5))) + suffix : prefix + value + suffix;
      },
    };
  };
  // highlighter: wraps each word of el; render with an array of word onset times
  NY.highlight = el => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="ny-w">${w}</span>`).join(" ");
    const spans = [...el.querySelectorAll(".ny-w")];
    return { words, render(t, times) { spans.forEach((s, i) => s.style.setProperty("--u", times[i] == null ? 0 : NY.e.out(NY.p(t, times[i], times[i] + NY.dur.micro)))); } };
  };
  // handwritten note (Samble), wipes in
  NY.note = (parent, text, { x, y, size = 64 }) => {
    const n = NY.el("div", "ny-note", text, parent, `left:${x}px;top:${y}px;font-size:${size}px`);
    return { render(t, t0, t1) { NY.enter.wipe(n, NY.e.out(NY.p(t, t0, t0 + 0.4))); n.style.opacity = t < t0 ? 0 : 1 - NY.e.in(NY.p(t, t1 - NY.dur.exit, t1)); } };
  };
  // ring marker on a map floor (world space)
  NY.ring = svgParent => {
    const g = NY.sv("g", {}, svgParent);
    const pulse = NY.sv("ellipse", { rx: 22, ry: 13, fill: "none", stroke: "#c2402f", "stroke-width": 3 }, g);
    const ring = NY.sv("ellipse", { rx: 22, ry: 13, fill: "none", stroke: "#c2402f", "stroke-width": 4 }, g);
    NY.sv("ellipse", { rx: 6, ry: 3.6, fill: "#c2402f" }, g);
    return {
      render(t, t0, x, y, active = true) {
        g.setAttribute("transform", `translate(${x} ${y})`);
        const u = NY.e.out(NY.p(t, t0, t0 + NY.dur.enter));
        g.style.opacity = t < t0 ? 0 : active ? 1 : 0.45;
        ring.setAttribute("transform", `scale(${0.4 + 0.6 * u})`);
        const q = NY.p(t, t0 + 0.2, t0 + 1.0); pulse.setAttribute("transform", `scale(${1 + q * 1.4})`); pulse.style.opacity = q > 0 && q < 1 ? 1 - q : 0;
      },
    };
  };

  /* ---------- camera (world group) ---------- */
  // keys: [{t, T:[x,y], Z}] ; the camera arrives at key.t, gliding for dur.camera before it
  NY.camera = keys => t => {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1] || a, dur = Math.min(NY.dur.camera, Math.max(0.001, b.t - a.t));
    const u = NY.e.inOut(NY.p(t, b.t - dur, b.t));
    return { T: [NY.lerp(a.T[0], b.T[0], u), NY.lerp(a.T[1], b.T[1], u)], Z: Math.exp(NY.lerp(Math.log(a.Z), Math.log(b.Z), u)) };
  };
  NY.applyCam = (g, cam, ctr = [540, 900]) => g.setAttribute("transform", `translate(${ctr[0]} ${ctr[1]}) scale(${cam.Z}) translate(${-cam.T[0]} ${-cam.T[1]})`);
  NY.toScreen = (cam, x, y, ctr = [540, 900]) => [(x - cam.T[0]) * cam.Z + ctr[0], (y - cam.T[1]) * cam.Z + ctr[1]];

  /* ---------- transitions ---------- */
  NY.tx = {
    // thin ink line crosses left to right; returns reveal fraction for clip of the new scene
    sweep(stage, t, t0) {
      let line = stage.querySelector(".ny-sweep"); if (!line) line = NY.el("div", "ny-sweep", "", stage);
      const u = NY.e.inOut(NY.p(t, t0, t0 + NY.dur.scene));
      line.style.display = u > 0 && u < 1 ? "block" : "none"; line.style.left = u * 1080 + "px";
      return u;
    },
    reveal(el, u) { el.style.clipPath = `inset(0 ${(1 - u) * 100}% 0 0)`; },
    iris(el, u, cx = 540, cy = 900) { el.style.clipPath = u >= 1 ? "" : `circle(${u * 1300}px at ${cx}px ${cy}px)`; },
    push(oldEl, newEl, u) { oldEl.style.opacity = 1 - u; oldEl.style.translate = `0 ${-120 * u}px`; newEl.style.opacity = u; newEl.style.translate = `0 ${120 * (1 - u)}px`; },
    draw(path, u) { const L = path.__len || (path.__len = path.getTotalLength()); path.style.strokeDasharray = L; path.style.strokeDashoffset = L * (1 - u); },
  };

  /* ---------- bake a heavy static SVG group into an image (smooth playback) ---------- */
  NY.bake = (g, { x, y, w, h, scale = 2 }, defsHtml = "") => new Promise(res => {
    const src = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w * scale}" height="${h * scale}">${defsHtml}${g.innerHTML}</svg>`;
    const img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = w * scale; c.height = h * scale; c.getContext("2d").drawImage(img, 0, 0); g.innerHTML = ""; NY.sv("image", { href: c.toDataURL("image/png"), x, y, width: w, height: h }, g); res(); };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
  });

  /* ---------- mount: fit, autoplay loop, hidden controls, seek API ---------- */
  NY.mount = ({ end, render, ready = [], audio = null }) => {
    const stage = document.getElementById("ny-stage");
    if (!document.getElementById("ny-fit")) { const f = NY.el("div", "", "", document.body); f.id = "ny-fit"; f.appendChild(stage); }
    NY.el("div", "ny-safe", "", stage, "top:0;height:15%"); NY.el("div", "ny-safe", "", stage, "bottom:0;height:20%");
    NY.el("div", "ny-safe", "", stage, "left:880px;top:960px;height:576px");   // Reels / Shorts right button rail (DESIGN.md section 2)
    const ctl = NY.el("div", "", `<button>Pause</button><select><option value="1">1×</option><option value=".5">0.5×</option><option value=".25">0.25×</option></select><input type="range" min="0" max="${end}" step="0.01" value="0"><span style="width:60px">0.00 s</span><label><input type="checkbox"> safe zones</label>`, document.body); ctl.id = "ny-ctl";
    const [btn, sel, range, out, lab] = [ctl.children[0], ctl.children[1], ctl.children[2], ctl.children[3], ctl.children[4]];
    const fit = () => { const k = Math.min(innerWidth / 1080, innerHeight / 1920); stage.style.transform = `translate(-50%,-50%) scale(${k})`; };
    addEventListener("resize", fit); fit();
    const qs = new URLSearchParams(location.search);
    if (qs.has("safe")) stage.classList.add("ny-show-safe");
    let playing = !qs.has("t"), cur = +(qs.get("t") || 0), last = performance.now(), speed = 1;
    // voice: browsers block sound until the first click or key, so the page starts silent and the voice joins on the first interaction
    const au = audio ? Object.assign(new Audio(audio), { preload: "auto" }) : null;
    let voiced = false;
    const startVoice = () => { if (!au || voiced) return; voiced = true; au.currentTime = cur; au.playbackRate = speed; if (playing) au.play().catch(() => (voiced = false)); };
    if (au) { addEventListener("pointerdown", startVoice); addEventListener("keydown", startVoice); out.title = "click the page to hear the voice"; }
    NY.seek = t => { cur = t; if (au && voiced && Math.abs(au.currentTime - t) > 0.25) au.currentTime = t; render(t); range.value = t; out.textContent = t.toFixed(2) + " s"; };
    const loop = now => {
      if (playing) {
        if (au && voiced && !au.paused) { cur = au.currentTime; if (cur >= end - 0.02 || au.ended) { au.currentTime = 0; cur = 0; au.play(); } }
        else cur = (cur + Math.min(0.05, (now - last) / 1000) * speed) % end;
        render(cur); range.value = cur; out.textContent = cur.toFixed(2) + " s";
      }
      last = now; requestAnimationFrame(loop);
    };
    // ?capture: no clock, no controls; STR/tools/capture.mjs drives frames through window.__isoStep(dt, t)
    if (qs.has("capture")) {
      playing = false; ctl.style.display = "none";
      Promise.all([document.fonts.ready, ...ready]).then(() => { window.__isoStep = (dt, t) => { render(t); return true; }; });
      return stage;
    }
    Promise.all([document.fonts.ready, ...ready]).then(() => { NY.seek(cur); last = performance.now(); requestAnimationFrame(loop); });
    btn.onclick = () => { playing = !playing; btn.textContent = playing ? "Pause" : "Play"; if (au && voiced) playing ? au.play() : au.pause(); };
    sel.onchange = () => { speed = +sel.value; if (au) au.playbackRate = speed; };
    range.oninput = () => { playing = false; btn.textContent = "Play"; if (au) au.pause(); NY.seek(+range.value); };
    lab.querySelector("input").onchange = e => stage.classList.toggle("ny-show-safe", e.target.checked);
    addEventListener("keydown", e => { if (e.code === "Space") { e.preventDefault(); btn.click(); } });
    return stage;
  };
})();
