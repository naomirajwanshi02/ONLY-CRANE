# Paper crane folding guide (new build)

A silent 9:16 (1080 × 1920) step-by-step video showing how to fold a paper crane, made with real 3D paper.
It follows the 24 steps on the reference sheet, then shows the finished crane.
This is a new build. It does not use the older `oneoff_Paper Crane` code.

- `paper-crane.mp4` is the video, about 110 s, 30 fps, with no audio.
- `crane.html` is the same guide as a live page. It is self-contained (three.js is inlined), so it opens straight from disk.
  - Click or press Space to pause or play.
  - ← and → jump between steps.
  - Hover at the bottom to show a slider.
  - `?t=<seconds>` opens the page paused at that time.

## How it works

| File | What it does |
|---|---|
| `src/engine.js` | Flat-fold paper engine. The paper is a set of convex pieces in crease-pattern coordinates. Each piece has a flat placement on the table, a stacking value and tags. Each op takes one flat state to the next and gives a rigid pose for every piece at every moment in between. |
| `src/sequence.js` | The 24 steps: captions, timings and the ops for each step. Tunables are in `CFG`. |
| `src/render.js` | three.js renderer. It has painted paper fibres with a bump map, RoomEnvironment, ACES tone mapping, a warm key light with soft shadows, a cool fill light and a warm rim light, plus fat ink lines. |
| `src/main.js` | Timeline, per-step camera fit, annotations (dashed fold lines, arrows that trace the real path of the paper, the red ring), captions and playback. |
| `src/page.html` | Page template: captions in the anatomy type style and the sepia tokens. |
| `build.mjs` | Bundles everything into `crane.html`. |
| `capture.mjs` | Renders every frame in headless Chromium and encodes the MP4 with ffmpeg. |
| `shots.mjs` | Takes check frames: `node shots.mjs out 12.5 40` or `node shots.mjs out every 1.5`. |

### The fold ops

- **Plain folds and unfolds** rotate the moving layers by π about the crease.
- **Collapse into the square base (steps 4–5)** uses exact single-vertex kinematics. The bottom corner stays on the table while the top and side corners come down together. The 45° sector angles hold at every frame.
- **Petal fold (steps 10 and 12)** uses an exact spherical four-bar at each kite point. The point lifts about the top crease while the sides fold in under it.
- **Inside reverse folds (steps 19, 20 and 24)** open the two halves of the point about its spine while it swings up, then close them between the body layers.
- A crease line only appears once its fold starts. Every annotation is drawn on the top surface of the paper stack.

## Rebuild

```
npm install
node build.mjs
node capture.mjs paper-crane.mp4 30 4
```

## Design

The design follows `../design/README.md` and the anatomy skill:
- Sepia page `#ecdfc6`, ink `#2b1e13`, notes `#5b4630` and muted labels `#8f7a5e`.
- Paper colour side `#d47a44` and white side `#f1e2c4`. The only accent is the red ring `#c2402f`.
- Step labels are monospace; instructions are system sans, weight 600, in sentence case.
- No voiceover, music, branding or follow card.
