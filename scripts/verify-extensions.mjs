#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseManifest } from './lib/manifest.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const exts = parseManifest(await readFile(join(ROOT, 'extensions.manifest.yml'), 'utf8'));
let failed = 0;
for (const e of exts) {
  const checks = {
    page: join(ROOT, '.vitepress/dist/extensions', `${e.slug}.html`),
    json: join(ROOT, 'data/extensions', `${e.slug}.json`),
    pdf: join(ROOT, '.vitepress/dist/pdf', `${e.slug}.pdf`),
  };
  for (const [name, p] of Object.entries(checks)) {
    if (!existsSync(p)) { console.error(`MISSING ${name} for ${e.slug}: ${p}`); failed++; }
  }
}
if (failed) { console.error(`FAILED: ${failed} missing artifact(s)`); process.exit(1); }
console.log(`OK: ${exts.length} extension(s) fully built`);
