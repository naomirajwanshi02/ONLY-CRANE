# news_yap kit

| File | What it is |
|---|---|
| DESIGN.md | the news_yap design language: frame, colours, type, components, motion, transitions, sync rules |
| news_yap.css / news_yap.js | runtime: tokens, components (label, tag, count, highlight, note, ring), camera, transitions, bake, autoplay mount |
| india.js | India map paths (mainland, no islands) + `NY_INDIA.xy(lon, lat)` |
| gallery.html | live reference of every component and transition (serve this folder, open gallery.html) |
| plan_cues.py | cues.json phrases + voiceover.txt -> planned cue times (cues.js) before the recording |
| align.py | voiceover.mp3 (or ElevenLabs alignment.json) -> words.json |
| sync.py | words.json + cues.json + reel.html -> cues.js + sync-report.md (sync gate + highlight opportunities) |
| sound.py + sound/ | original sound kit (tick, pop, air, roll, stamp, bed) and the cue-driven mix (sfx.json -> mix.wav) |
| fonts/ | Oxanium + Samble |
| ../factcheck/ | WORKFLOW.md + check.py (fact gate) |
| D:\Anatomy\.claude\skills\news-yap\SKILL.md | the staged workflow (run Claude Code in D:\Anatomy and say /news-yap) |
