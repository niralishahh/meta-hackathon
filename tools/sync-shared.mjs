// Paste tools/shared-block.js into every panel file, between the SHARED BEGIN / END markers.
// Run from the repo root: node tools/sync-shared.mjs
// This is a dev tool only. index.html never loads anything from tools/.
import { readFileSync, writeFileSync } from 'node:fs';

const block = readFileSync(new URL('./shared-block.js', import.meta.url), 'utf8').trimEnd();
const pages = ['overview', 'backbone', 'site', 'pods', 'racks'];
const re = /^[ \t]*\/\/ ==== SHARED v\d+ BEGIN ====[\s\S]*?\/\/ ==== SHARED v\d+ END ====[^\n]*$/m;

for (const p of pages) {
  const file = new URL(`../panels/${p}.js`, import.meta.url);
  const src = readFileSync(file, 'utf8');
  if (!re.test(src)) { console.error(`panels/${p}.js: SHARED markers not found, skipped`); process.exitCode = 1; continue; }
  const out = src.replace(re, () => block);
  if (out !== src) { writeFileSync(file, out); console.log(`panels/${p}.js updated`); }
  else console.log(`panels/${p}.js already current`);
}
