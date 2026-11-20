// Headless frame checks: node shots.mjs out_dir t1 t2 ...  (or "steps" for one frame per step)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const [out, ...ts] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('ERR ' + e.message));
await page.goto('file://' + path.resolve('crane.html') + '?capture');
await page.waitForFunction(() => window.__duration > 0, null, { timeout: 120000 });
let times = ts.map(Number);
if (ts[0] === 'steps') times = (await page.evaluate(() => window.__steps)).map((s) => s.t + 0.05);
if (ts[0] === 'every') times = Array.from({ length: Math.ceil((await page.evaluate(() => window.__duration)) / Number(ts[1])) }, (_, i) => i * Number(ts[1]));
for (const t of times) {
  await page.evaluate((t) => window.__frame(t), t);
  await page.screenshot({ path: `${out}/f${t.toFixed(2).padStart(7, '0')}.png` });
}
console.log(logs.join('\n'));
await browser.close();
