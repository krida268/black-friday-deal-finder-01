// Bargain Beacon — the hand-in program (Node 22, stdlib only).
//
// It takes the repository's app/ (the static deal-finder site) and
// screenshots/ (its real renders) and lays them out in the grader's output
// directory, then writes dossier.json: the summary the judge reads, built by
// the vendored make.fun library from exactly those files.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Inside the grader MAKEFUN_OUTPUT_DIR is unset and /output is used. The
// program never deletes anything: /output is a mount point there, so it only
// creates directories and writes files inside it. Running it twice over the
// same inputs writes the same bytes twice.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The repository root: the folder holding this file.
const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own caps, from the bounty's gate.json: the dossier text cap and
// the limits on screenshots and app files. Passing them here makes this
// program refuse exactly where the scorer would — a dossier that is too
// long, or screenshots that are too big, fail here first, in the open.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
};

function handIn(folder) {
  const from = join(root, folder);
  const to = join(outDir, folder);
  if (!existsSync(from)) throw new Error(`hand-in: ${folder}/ is missing beside main.ts`);
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
handIn('app');
handIn('screenshots');

const dossier = buildDossier(outDir, DOSSIER_CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`black-friday-deal-finder-01: wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
