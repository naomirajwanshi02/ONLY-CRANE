# news_yap design language

News yap reels: fast, confident, clean. Every frame should look like a calm editorial page that moves with intent.
The runtime that implements this is `news_yap.js` + `news_yap.css`; the live reference is `gallery.html`.

## 1. Principles
1. **Quiet canvas, one loud thing.** Sepia paper, ink lines, one colour pop on the item being spoken about.
2. **Motion follows the voice.** Every entrance lands on a spoken word (0.00 to 0.10 s after its onset). Nothing moves without a reason.
3. **Fast, never frantic.** Short eases, no shake, no blur, no bounce. The pace comes from cutting on words, not from violent motion.
4. **Nothing crops.** Labels and tags live in screen space; only the world (maps, objects) is zoomed.
5. **Facts look like facts.** Numbers sit in count cards or tags with their unit; sources can be shown, never invented.

## 2. Frame
- 1080 x 1920, 9:16, posted as Instagram Reels and YouTube Shorts. Their UI covers three zones; keep text, numbers, buttons and the key part of every object out of them (backgrounds and object edges may pass through):
  - **Top** y 0-288: account header, progress bar.
  - **Bottom** y 1536-1920: caption, audio row, channel name, Subscribe/Follow row.
  - **Right rail** x 880-1080, y 960-1536: like / comment / share / remix / audio buttons.
- Safe content box: x 60-1020 for y 288-960; x 60-880 for y 960-1536. `?safe` on any page hatches all three zones (news_yap.js).
- Band grid (use the whole height, one job per band):

| Band | y | x | What goes there |
|---|---|---|---|
| Label / title | 300-520 | 60-1020, centred on 540 | corner label (big word + sub line) or one short title line |
| Stage | 560-1280 | 60-1020, object centred near x 500 | the main object / scene; camera anchor about [500, 920] |
| Readout | 1300-1500 | 60-880, centred near x 470 | count cards, pills, switches, notes, bottoms of end-frame cards |

- Spacing: at least 40 px between text blocks, one text block per band at a time, side gutter 60 px. Leader tags sit beside the object; below y 960 put them on its left side so they never reach the right rail. If a band is empty for a beat, let the stage object grow into it rather than leaving a hole.
- Background: `--ny-bg #efe3c8` with a soft vignette. No textures, no grids.

## 3. Colour tokens
| Token | Hex | Use |
|---|---|---|
| `--ny-bg` | #efe3c8 | page |
| `--ny-paper` | #fbf3e2 | cards, tags |
| `--ny-ink` | #2a1d10 | text, outlines |
| `--ny-ink2` | #3b2a1a | borders, lines |
| `--ny-muted` | #8a7356 | secondary text, state lines |
| `--ny-line` | #c4ae86 | faint lines, dashes |
| `--ny-hi` | #f0a868 | highlighter |
| `--ny-accent` | #b5541c | numbers, kickers |
| `--ny-pop` | #c2402f | the one active item (marker, answer) |

Rule: at most one `--ny-pop` element on screen at a time.

## 4. Type
- **Oxanium** for everything printed. Weights: 800 titles, 700 labels, 600 small caps.
- **Samble** for handwritten notes only, max 6 words.
- Sizes: title 92 to 110, label 64 to 96, tag value 32 to 40, tag key 26 to 30 (uppercase, +2 tracking), small caps 26 to 34 (+10 tracking).

## 5. Components
| Component | Look | Enters with |
|---|---|---|
| **Headline card** (hook) | paper card, source row, blue-ink headline | feed snap, then per-word highlighter |
| **Corner label** | big Oxanium word inside four corner brackets, small caps sub-line | brackets draw in, text rises |
| **Leader tag** | uppercase key, big value, thin underline, vertical stem to its object | underline draws, text fades up |
| **Count card** | paper card, thin ink border, big accent number, small caps key | rise, then number rolls up |
| **Highlighter** | `--ny-hi` bar behind a word, slightly inset | sweeps left to right in 0.18 s |
| **Note** | Samble, ink, straight (never rotated), paper underglow | wipe left to right |
| **Ring marker** | pop-red ring + dot on the map floor | ring scales in, one soft pulse |
| **Line map** | India as ink outline + faint state lines, no fill | outline draws, camera glides |
| **Stamp / tick** | for the answer only | scales from 1.15 to 1 with fade |

## 6. Motion
| Token | Value | Use |
|---|---|---|
| `ny.dur.micro` | 0.18 s | highlighter, number tick |
| `ny.dur.enter` | 0.32 s | component entrances |
| `ny.dur.exit` | 0.20 s | exits (always faster than entrances) |
| `ny.dur.scene` | 0.45 s | scene transitions |
| `ny.dur.camera` | 0.60 s | camera glides |
| `ny.stagger` | 0.06 s | between items of a group |
| Ease in | cubic out | entrances |
| Ease out | cubic in | exits |
| Ease move | cubic in-out | camera, pushes |

Never: camera shake, motion blur, elastic or back easing, spins, 3D flips. Exception: the hook (feed snap, option A) keeps its blur, overshoot, tile flip and one small shake exactly as built.
Text over a map always gets a paper-white underglow (CSS text-shadow; SVG paint-order stroke #fbf3e2) so lines never cross it; colours stay the same.

## 7. Transitions (scene to scene)
1. **Line sweep:** a thin ink line crosses the frame; the new scene is revealed behind it.
2. **Iris:** a circle opens from the object the voice names next.
3. **Push:** the old scene slides up 120 px and fades, the new rises 120 px in (cubic in-out).
4. **Draw-on:** outlines draw themselves (stroke dash), fills fade in after.
5. **Fold back:** a scene shrinks into the card it came from (used to return to the headline for the answer).
6. **Match cut:** an object keeps its position across scenes (a number card becomes a tag value).

## 8. Sync rules
- Every visual event is anchored to a phrase in `cues.json`, not to a time. Times come from the recording.
- Default lead: 0.00 s (event on word onset). Highlighter starts with the word; count-ups finish by the word's end.
- After the recording: run `sync.py`; any cue drifting more than 0.15 s from its word fails.
- Highlight pass: every spoken number, place and company should have a visual (tag, card, label or highlighter). `sync.py` lists the ones without a cue.
