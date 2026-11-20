// Renders the guide frame by frame and encodes a silent MP4.
//   node capture.mjs [out.mp4] [fps] [workers]
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] || 'paper-crane.mp4';
const fps = Number(process.argv[3] || 30);
const workers = Number(process.argv[4] || 3);
const dir = path.resolve('frames');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const url = 'file://' + path.resolve('crane.html') + '?capture';
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const probe = await chromium.launch({ args });
const pg = await probe.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto(url);
await pg.waitForFunction(() => window.__duration > 0, null, { timeout: 120000 });
const duration = await pg.evaluate(() => window.__duration);
await probe.close();
const N = Math.ceil(duration * fps);
console.log('duration', duration.toFixed(2), 's, frames', N);

const t0 = Date.now();
let done = 0;
async function worker(k) {
  const browser = await chromium.launch({ args });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.waitForFunction(() => window.__duration > 0, null, { timeout: 120000 });
  for (let i = k; i < N; i += workers) {
    await page.evaluate((t) => window.__frame(t), i / fps);
    await page.screenshot({ path: `${dir}/${String(i).padStart(5, '0')}.png` });
    if (++done % 150 === 0) console.log(done, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  await browser.close();
}
await Promise.all(Array.from({ length: workers }, (_, k) => worker(k)));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${dir}/%05d.png`, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log('wrote', out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
