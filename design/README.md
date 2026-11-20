# Design language: source files

This folder holds the sources behind the crane's look, so you can match or extend it without the original machine.

## What is here

| Folder | What it is | Use it for |
|---|---|---|
| `anatomy-skill/` | The full "anatomy" skill (same as github.com/wheresryan22/anatomy). `SKILL.md` is the entry point; `references/` holds the style rules; `kit/` and `examples/` hold working code. | The visual style: typography, sepia palette, shading, card layout, calm eased motion. The crane's caption style comes from here. To use it with Claude Code, copy the folder to `~/.claude/skills/anatomy/`. |
| `sepia-iso-kit/` | The owner's sepia isometric kit (`iso-kit.ts`, `iso.css`, `reel.css`, `bulb.css`, React parts, the taps analogy kit). | Exact sepia colour tokens and the 9:16 reel frame layout used in the owner's other videos. |
| `../_tools/news_yap/` | The news_yap runtime and its rules: `DESIGN.md`, `README.md`, `gallery.html`, `news_yap.css`, `news_yap.js`, fonts. | The stage, timeline, playback controls, `?t=` and `?capture`, easing helpers. The crane page loads these files directly. |

## The crane's look

- **Frame:** 9:16, 1080 × 1920. Keep the top 15% and bottom 20% free of important content, because the Instagram UI covers them.
- **Page:** `#ecdfc6`.
- **Ink:**
  - Strong `#2b1e13` for the captions.
  - Text `#5b4630` for the notes.
  - Muted `#8f7a5e` for the step labels.
  - Annotation lines `#2a1d10` on a pale halo `#fbf3e2`.
- **Paper:** the colour side is `#d47a44` and the white side is `#f1e2c4`. Both get canvas fibre textures and a bump map.
- **Rings:** the only accent is the red ring `#c2402f`, which marks where to press or pinch.
- **Type:**
  - Step label: `ui-monospace, "SF Mono", Menlo, Consolas`, 28px, letter-spacing .04em.
  - Instruction: `ui-sans-serif, system-ui, "Segoe UI"`, weight 600, 54px, sentence case.
  - Notes: the same sans at 38px. Start each note with a capital letter.
- **3D:** three.js 0.160.0 with RoomEnvironment (intensity 0.35) and ACES filmic tone mapping (exposure 0.9). A warm key light casts soft PCF shadows onto a ShadowMaterial floor, with a cool fill light and a warm rim light. The camera is a perspective camera with a 24° field of view.
- **Motion:** use calm eased moves, hold every result, and let a crease appear only once its fold starts. Never open folds in 1-2-3 then 3-2-1 order. Show each step once, with no repeats.
- **Never add:** a voiceover, music, branding, a watermark, a follow card or a new colour.

## Wider house palette (from the owner's sepia standard)

Use this palette only if you need more tones:

- **Ink:** hi `#3b2a1a`, mid `#8a7356`, lo `#b9a47f`, faint `#d8c8a6`, lit `#1e140a`.
- **Surfaces:**
  - face `#f6ecd6`
  - top `#fbf3e2`
  - lit-top `#fff8ea`
  - lit-shade `#ecdcbc`
  - shades `#d9c5a0`, `#e2d0ad`, `#eadbbd`, `#f1e5cb`
- **Text:** body `#5a4630`, strong `#2a1d10`, muted `#9a8466`.
- **Emphasis:** rust `#b5541c` marks only what is active. Everything else stays neutral sepia. If something needs emphasis, use an ink tone rather than a new colour.
