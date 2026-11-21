# Paper crane: handoff for the next session

This repo holds a silent 9:16 video that teaches how to fold a paper crane, plus all the source code that makes it.
Hand this file to Claude in a new session and say "continue the paper crane video".

## What is where

| Path | What it is |
|---|---|
| `crane-video/paper-crane.mp4` | **The finished video.** 1080 × 1920, 30 fps, 1 min 51 s, no sound. |
| `crane-video/crane.html` | The same guide as a live page. Open it in Chrome straight from disk; it needs no internet. Click or press Space to pause, use ← and → to jump between steps, and add `?t=40` to the address to open the page paused at 40 s. |
| `crane-video/README.md` | How the code works: the fold engine, the renderer and the build. |
| `crane-video/src/` | The source. `sequence.js` holds the 24 steps (captions, timings, folds), `engine.js` the paper fold engine, `render.js` the three.js look, `main.js` the timeline, lines, camera and captions, and `page.html` the page layout. |
| `oneoff_Paper Crane/references/diagrams/` | The step diagrams the video follows. |
| `design/`, `_tools/` | Design rules (anatomy skill, sepia kit). The video's colours and type come from `design/README.md`. |
| `oneoff_Paper Crane/` (rest) | The **old** version. It is not used; kept for reference only. |

## Rebuild after a change

```
cd crane-video
npm install
node build.mjs                          # rebuilds crane.html from src/
node shots.mjs out steps                # one check frame per step into out/
node capture.mjs paper-crane.mp4 30 4   # renders every frame and encodes the MP4 (about 15 min)
```

The scripts need Node 18+, Chromium through Playwright (`npm i -D playwright` then `npx playwright install chromium`
if it is not already installed) and ffmpeg.

## Decisions the owner has made (keep these)

1. The video follows the 24 steps on the owner's reference sheet, then shows the finished crane.
2. There is no sound, voiceover, music or branding.
3. The paper is **orange on both sides** (`#d47a44`). There is no white side.
4. Only creases that appear in the reference diagrams are drawn. Back-layer creases must never show through, and no
   line is drawn where two raw edges meet.
5. The inside reverse folds (neck, tail, head) follow the owner's reference footage. The point is pre-creased first.
   Then the layers open a little and the point goes up inside, staying joined to the body (no "cut").
6. The design follows `design/README.md`: sepia page, anatomy-style captions, and one red ring as the only accent.

## Known details still open

- Step 23: short marks show on the body sides (the neck and tail crease edges between each wing and the body), and
  there is a tiny dot near the neck. The owner has not asked for these to be removed yet.
- In the finished crane the body stays flat and boxy, not puffed out.
