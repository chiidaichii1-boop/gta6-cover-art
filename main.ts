// Vice Cover Studio — a gta6-cover-art-01 entry (Node 22, standard library only).
// The app is this directory's app/ folder: plain static files a desktop browser loads
// offline (app/index.html and its ES modules, two vendored OFL fonts, no library and no
// network request). The program hands the app in: it copies app/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json, the summary the judge
// reads, with the vendored make.fun library.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the
// others refuse an entry the scorer would refuse (more than 4 screenshots or one over
// 256 KiB; more than 993 files in app/ or 48 MiB of app files, in all, or a path under
// app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

const shots = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.'));
console.log(`handed in ${shots.length} screenshots: ${shots.join(', ')}`);
for (const shot of shots) {
  const bytes = statSync(join(out, 'screenshots', shot)).size;
  console.log(`  ${shot}: ${bytes} bytes`);
}
console.log(`dossier: ${statSync(join(out, 'dossier.json')).size} bytes`);

// Verify what was handed in, before the grader sees it: the dossier must parse,
// name exactly the screenshots on disk, and every screenshot must fit the gate's
// caps (at most 4, each at most 256 KiB). Fail loudly instead of handing in a
// broken entry.
const dossier = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
if (!Array.isArray(dossier.images) || dossier.images.length !== shots.length) {
  throw new Error(`dossier lists ${dossier.images?.length} images but ${shots.length} screenshots are on disk`);
}
// A matching count is not enough: the dossier must name exactly the files on
// disk, and each embedded image must be the file's current bytes, or the
// grader would judge a stale or mismatched render.
const dossierNames = dossier.images.map((image) => image.name).sort();
const diskNames = [...shots].sort();
if (JSON.stringify(dossierNames) !== JSON.stringify(diskNames)) {
  throw new Error(`dossier names ${dossierNames.join(', ')} but disk holds ${diskNames.join(', ')}`);
}
for (const image of dossier.images) {
  const actual = createHash('sha256').update(readFileSync(join(out, 'screenshots', image.name))).digest('hex');
  if (image.sha256 !== actual) throw new Error(`dossier sha256 for ${image.name} does not match the file on disk`);
}
for (const shot of shots) {
  const bytes = statSync(join(out, 'screenshots', shot)).size;
  if (bytes > 262144) throw new Error(`${shot} is ${bytes} bytes, over the 256 KiB screenshot cap`);
}
const appEntries = readdirSync(join(out, 'app'), { recursive: true });
if (appEntries.length > 993) throw new Error(`app/ holds ${appEntries.length} entries, over the 993 cap`);
// The entry count is not the whole gate: app/ must also fit the 48 MiB total
// and no single path may exceed 1000 bytes, or the scorer refuses the entry.
let appBytes = 0;
for (const entry of appEntries) {
  const pathBytes = Buffer.byteLength(entry, 'utf8');
  if (pathBytes > 1000) throw new Error(`app/${entry} is ${pathBytes} bytes long, over the 1000-byte path cap`);
  const stat = statSync(join(out, 'app', entry));
  if (stat.isFile()) appBytes += stat.size;
}
if (appBytes > 50331648) throw new Error(`app/ totals ${appBytes} bytes, over the 48 MiB cap`);
console.log(`verified: dossier parses, ${dossier.images.length} images, app/ has ${appEntries.length} entries, ${appBytes} bytes`);
