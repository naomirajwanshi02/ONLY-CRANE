// Publishes the rendered video to ../media for GitHub Pages and the AR app.
//   node publish.mjs [paper-crane.mp4]
// Writes media/paper-crane.mp4 (1080x1920), media/paper-crane-720.mp4 (720x1280, lighter for phones),
// media/poster.jpg (the finished crane) and media/media.json (version, so apps can refresh their cache).
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
const src = path.resolve(process.argv[2] || 'paper-crane.mp4');
const out = path.resolve('..', 'media');
mkdirSync(out, { recursive: true });
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
copyFileSync(src, path.join(out, 'paper-crane.mp4'));
ff(['-i', src, '-an', '-vf', 'scale=720:1280', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(out, 'paper-crane-720.mp4')]);
const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).toString());
ff(['-ss', String(Math.max(0, dur - 1)), '-i', src, '-frames:v', '1', '-q:v', '3', path.join(out, 'poster.jpg')]);
const mf = path.join(out, 'media.json');
const prev = existsSync(mf) ? JSON.parse(readFileSync(mf, 'utf8')) : { version: 0 };
const size = (f) => statSync(path.join(out, f)).size;
const meta = {
  version: prev.version + 1,
  updated: new Date().toISOString(),
  duration: Math.round(dur * 100) / 100,
  audio: false,
  files: {
    full: { path: 'media/paper-crane.mp4', width: 1080, height: 1920, bytes: size('paper-crane.mp4') },
    mobile: { path: 'media/paper-crane-720.mp4', width: 720, height: 1280, bytes: size('paper-crane-720.mp4') },
    poster: { path: 'media/poster.jpg' },
  },
};
writeFileSync(mf, JSON.stringify(meta, null, 2) + '\n');
console.log('published version', meta.version, meta);
