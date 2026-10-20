// After `npm run build`: prints gzip size per JS/CSS file and fails if the entry or any chunk blows its budget.
import { readdirSync, readFileSync, statSync } from 'node:fs'; import { gzipSync } from 'node:zlib'; import { join } from 'node:path';
const dir = new URL('./dist/assets/', import.meta.url).pathname; let files; try { files = readdirSync(dir); } catch { console.error('No dist/. Run `npm run build` first.'); process.exit(1); }
const BUDGET_KB = { entry: 90, chunk: 60, css: 20 }; let fail = false; let total = 0;
for (const f of files.filter((n) => /\.(js|css)$/.test(n)).sort()) {
  const kb = gzipSync(readFileSync(join(dir, f))).length / 1024; total += kb;
  const limit = f.endsWith('.css') ? BUDGET_KB.css : /^index-/.test(f) ? BUDGET_KB.entry : f.startsWith('react-') ? 80 : BUDGET_KB.chunk;
  const over = kb > limit; fail ||= over; console.log(`${over ? 'OVER ' : 'ok   '} ${kb.toFixed(1).padStart(7)} KB gz  (budget ${limit})  ${f}`);
}
console.log(`total JS+CSS: ${total.toFixed(1)} KB gzip`); process.exit(fail ? 1 : 0);
