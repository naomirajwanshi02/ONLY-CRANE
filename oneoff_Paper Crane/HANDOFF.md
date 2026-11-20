# Paper crane folding guide: handoff

This is a one-off video that shows how to fold a paper crane, made for someone else. Open `crane3d.html` in Chrome to watch it. It needs internet, because three.js loads from cdn.jsdelivr.net.

## 1. What the video is

- It is a 9:16 (1080 × 1920) folding guide for a paper crane, roughly 106 s long.
- It has **no voiceover, no music, no branding and no follow card**. The only text is on-screen step captions plus short notes at the bottom.
- The paper is real 3D paper that actually folds. Folds rotate about real crease lines, and layers stack with paper thickness. The square base collapse and the petal fold are solved with real paper kinematics.
- Pausing: click or tap the page to pause or play. Space also toggles pause. ← and → jump between steps. A slider bar appears when you hover at the bottom. `?t=<seconds>` opens the page paused at that time.

## 2. What the owner asked for, in order

Every item here is still in force unless it says otherwise.

1. **Make a video from 13 diagram pages, in our design.** Those pages are in `references/diagrams/` (01 is step 1 … 13 is the finished crane).
2. Make it **really good in 3D and realistic, so people can follow it**.
3. It is **easy to follow?** I was asked to fix the hard moves:
   - Show fold-toward and fold-away line styles. *(This was later dropped to match the diagrams. All fold lines are now plain dashed lines.)*
   - Slow down the square base, split the petal fold into beats, and show the layers opening for the reverse folds.
   - Add layer thickness, and hold on each result.
4. **Visual style: take the reference from**
   - https://github.com/wheresryan22/anatomy (the "anatomy" skill)
   - https://github.com/naomirajwanshi02 (WebAR repos in the "Anatomy sepia theme")

   What that means:
   - **Renderer:** three.js.
   - **Materials:** physically based, painted in code (canvas paper fibres plus a bump map).
   - **Lighting:** a RoomEnvironment studio environment and ACES filmic tone mapping. A warm key light gives soft PCF shadows on the table, plus a cool fill light and a warm rim light.
   - **Colours:** Anatomy sepia tokens (page `#ecdfc6`, strong ink `#2b1e13`, text `#5b4630`, muted `#8f7a5e`).
5. **Use the text style from the anatomy skill**, not the news_yap fonts. Captions are a monospace step label in muted sepia (`ui-monospace, "SF Mono", Menlo, Consolas`) over a system sans instruction (`ui-sans-serif, system-ui, "Segoe UI"`) in sentence case.
6. **No repeats.** For a while every page played twice; the owner removed that.
7. **No overlapping lines or anything.** When several flaps open, they open together but staggered so they never pass through each other. There must never be "1-2-3 then 3-2-1" ordering.
8. **The page must work when opened directly from disk.** All JavaScript is inlined into the HTML, because browsers block module files on `file://` pages.
9. **Step 1 correction:** with the colour side up, fold in half both ways and open. Then turn the paper over and fold both diagonals on the white side.
10. **Steps 3, 4 and onward must match the YouTube tutorial** https://www.youtube.com/watch?v=Ux1ECrNDZl4 ("Origami: Crane [tutorial]").
    - Each side is finished before turning over: both lower edges to the centre, the top triangle down, open those three folds, then the petal fold (lift the bottom point while the sides fold in).
    - Turn over and repeat on the other side.
    - Narrow the bottom on both sides.
    - Inside-reverse-fold both thin points up (neck, then tail).
    - Fold the front wing down, then the back wing.
    - Inside-reverse-fold the head.
    - Pull the wings out.
11. The fold line for the top-triangle fold must sit **on the crease**. Annotation lines are drawn at the top surface of the paper stack, not at table level.
12. A crease must only appear **once its fold starts**, not before.
13. Notes at the bottom start with a capital letter. The "the sides fold in, in pairs" note was removed.

## 3. Current step list (`src/seq.js`)

| Step | Caption | What moves |
|---|---|---|
| 1 | Colour side up. Fold in half and open, both ways. | 2 valley folds plus unfolds |
| 1 | Turn it over. Fold both diagonals and open. | flip, 2 diagonal folds plus unfolds |
| 2 | Bring the corners together along the creases into a square. | `opCollapse`: corners rise into a 4-fin star, the fins pair up, then it tips toward you and lies flat with the open end down. The colour side is outside. |
| 3 | Fold the lower edges of the top layer to the centre line. / Fold the top triangle down over them. | kite folds (top 2 layers), top fold |
| 4 | Open these three folds again. / Lift the bottom point of the top layer up. The sides fold in. | `opUnfoldMany` with staggered windows, `opPetal` |
| 4 | Turn it over. Then the other side repeats steps 3 and 4, faster. | flip, `sideSteps(2, true)` |
| 5 | Fold the lower edges to the centre line, both sides. | narrowing folds, flip, narrowing folds |
| 6 | Fold one thin point up, inside the layers. / Do the same with the other point. | `opReverse` (open the layers, swing in, close) |
| 7 | Fold the front wing down. / Fold the back wing down too. | valley fold, mountain fold |
| 8 | Fold the tip of one point down for the head. | `opReverse` on the neck |
| 9 | Pull the wings out gently and shape the body. | `opFinale`: wings swing out into a V while the crane stands up and the camera moves to a three-quarter view |
| Done | Your paper crane is ready. | hold |

## 4. How the code works

```
oneoff_Paper Crane/
  crane3d.html   <- the BUILT page (current version). Do not edit by hand; run src/build.py
  crane.html     <- older SVG version. Its <script> holds the FOLD ENGINE used by build.py
  src/build.py   <- assembles crane3d.html = engine (from crane.html) + seq.js + render3d.js + main.js
  src/seq.js     <- extra ops + THE SEQUENCE (steps, captions, timings, notes)
  src/render3d.js<- three.js renderer (materials, lights, shadows, edges, layer thickness, camera fit)
  src/main.js    <- timeline, camera per caption, overlay (dashed line, arrow, rings), captions, notes, pause keys
  check.sh / check3d.sh <- headless Chrome frame checks
  contact sheet*.png    <- latest frame sheets
```

`crane.html` and `crane3d.html` link `../_tools/news_yap/news_yap.css` and `news_yap.js`, so keep the folder layout from the zip. That shared runtime gives the stage, controls, `NY.mount` and the easing helpers.

### Fold engine (inside `crane.html`)

- **Paper model:** the paper is a list of pieces. Each piece has:
  - `cp`: a convex polygon in crease-pattern coordinates (the square runs from −1 to 1).
  - `M`: a rigid 3D transform `{R, t}`.
  - `L`: a stacking order number.
  - `tag`: `side` F/B from the collapse, `petal` 1/2, `neck`, `tail`, `head`.
- **`splitSel(S, P, D, ref, sel)`:** splits pieces along a world line. Only pieces chosen by `sel({rank, c}, pc)` are split, where `rank` counts the layers above. It returns the moving set and `idMin`, the first id created by that split, which is used to hide a crease until its fold starts.
- **Ops:** each op returns `{pre, end, draw(u)}`, plus optional `line`, `arrow`, `rings` and `note` for the overlay.
  - `opFold`: valley or mountain fold. The rotation is π about the line.
  - `opUnfold`: reverses a fold.
  - `opFlip`: turns the model over.
  - `opCollapse`: the square base. It is single-vertex kinematics with 8 rigid sectors.
  - `opPetal`: a degree-4 vertex at K1/K2. It solves ψ by bisection so the T1/T2 triangles stay rigid.
  - `opReverse`: an inside reverse fold, done as an in-plane swing by 2β combined with a π twist about the flap's own axis. It lands exactly on the reflection. The flap's layers spread apart about its spine during the swing.
  - `opHold`.
- **Key points (world):** O (0, √2/2) is the tip, C (0, −√2/2) is the open end, and M1/M2 are the side corners. K1/K2 are where the kite lines meet the sides, and `yk` is the K-line height.

### Renderer (`render3d.js`)

- **Paper mesh:** a single dynamic BufferGeometry, drawn as two meshes. The front material is the colour side `#d47a44` on FrontSide; the back material is cream `#f1e2c4` on BackSide.
- **Thickness:** each piece is offset by `rank × TH` (TH = 0.0045) along its own normal. Ranks are computed in the op's pre state and end state, then carried and blended, which stops z-fighting. The highest offset is stored as `op._zTop` so annotation lines sit on the paper surface.
- **Edges:** fat lines drawn with LineSegments2. Folded edges and paper edges are dark; flat creases are faint.
- **Shadows:** a ShadowMaterial plane sits at the model's lowest point and catches soft shadows.
- **Camera:** each timeline entry gets `{E, az, T, D}` from `fitCam3`. Within one caption it stays steady, and between entries it eases over 0.8 s. The finale fits the whole wing motion.

## 5. How to work on it

1. Edit `src/seq.js` (steps), `src/render3d.js` (look) or `src/main.js` (overlay and captions). For fold-engine changes, edit the first `<script>` in `crane.html`.
2. Rebuild:
   ```
   python -I "oneoff_Paper Crane/src/build.py"
   ```
3. Check frames headless. This writes `check/g<t>.png`; times come from the `TL` line that prints in the console.
   ```
   sh "oneoff_Paper Crane/check3d.sh" 10 30 60
   ```
4. To export an MP4: the page supports `?capture`, which exposes `window.__isoStep`. The original project used a capture script (`STR/tools/capture.mjs`, not included) at 30 fps and 1080 × 1920. Any headless frame-by-frame capture using `?t=` frames, then ffmpeg, works too.

## 6. Known gaps and ideas

- In the petal fold, the white inner side shows briefly as the sides swing in. That is physically correct.
- The neck and tail mostly hide behind the wings until the wings fold down, which matches real paper.
- Body shaping ("press the body") is not modelled; the body stays flat.
- There is no sound yet. If sound is added, use soft paper and swish sounds, quiet.
- The petal fold could get a little more step-by-step, like the video (fold the sides first, then the point).

## 7. References in this zip

- `references/diagrams/`: the 13 diagram pages the owner supplied, in step order (01 = step 1 … 12 = step 10, 13 = finished crane).
- `references/feedback/`: the owner's screenshots of problems. 14 shows the step 3C fold line sitting below the crease; 15 shows a crease appearing at the end of step 2 before step 3 started. Both are fixed.
- The video tutorial: https://www.youtube.com/watch?v=Ux1ECrNDZl4

## 8. Design language sources

The zip's `design/` folder holds the sources behind the look:

- `design/anatomy-skill/` is the full anatomy skill. Its `SKILL.md` and `references/` describe the style.
- `design/sepia-iso-kit/` is the owner's sepia kit, with its colour tokens and the 9:16 reel layout.
- `_tools/news_yap/` holds `DESIGN.md`, `README.md` and `gallery.html`.

`design/README.md` lists the crane's exact colours, type, lights and motion rules.
