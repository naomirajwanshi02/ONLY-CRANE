// Bundles src/ (three.js included) into one self-contained crane.html that opens from disk.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const html = readFileSync('src/page.html', 'utf8').replace('<script>/*BUNDLE*/</script>', () => '<script>' + js + '</script>');
writeFileSync('crane.html', html);
console.log('crane.html', (html.length / 1024).toFixed(0), 'KB');
