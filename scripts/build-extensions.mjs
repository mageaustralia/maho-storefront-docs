#!/usr/bin/env node
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseManifest } from './lib/manifest.mjs';
import { parseListing } from './lib/listing.mjs';
import { rewriteManual } from './lib/markdown.mjs';

const DOCS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const manifestPath = join(DOCS_ROOT, 'extensions.manifest.yml');
  const exts = parseManifest(await readFile(manifestPath, 'utf8'));

  // These trees are 100% generated - never hand-author here. Clean so removed
  // extensions don't linger.
  for (const dir of ['extensions', 'public/extensions', 'data/extensions']) {
    await rm(join(DOCS_ROOT, dir), { recursive: true, force: true });
  }

  const index = [];
  for (const ext of exts) {
    const srcDir = resolve(dirname(manifestPath), ext.source.path);
    if (!existsSync(srcDir)) throw new Error(`source not found for ${ext.slug}: ${srcDir}`);
    const screenshotsDir = join(srcDir, 'screenshots');
    if (!existsSync(screenshotsDir)) throw new Error(`screenshots/ not found for ${ext.slug}: ${screenshotsDir}`);

    // 1. Manual page.
    const guide = await readFile(join(srcDir, 'USER_GUIDE.md'), 'utf8');
    const page = rewriteManual(guide, { slug: ext.slug, githubUrl: ext.githubUrl });
    await mkdir(join(DOCS_ROOT, 'extensions'), { recursive: true });
    await writeFile(join(DOCS_ROOT, 'extensions', `${ext.slug}.md`), page);

    // 2. Screenshots -> public.
    await cp(screenshotsDir, join(DOCS_ROOT, 'public/extensions', ext.slug), { recursive: true });

    // 3. Product-page marketing JSON.
    const listing = parseListing(await readFile(join(srcDir, 'listing.yml'), 'utf8'));
    const toAsset = (p) => p.replace(/^screenshots\//, `/extensions/${ext.slug}/`);
    const productJson = {
      slug: ext.slug,
      name: ext.name,
      composerPackage: ext.composerPackage,
      tier: ext.tier,
      category: ext.category,
      storefrontUrlKey: ext.storefrontUrlKey,
      githubUrl: ext.githubUrl,
      docsUrl: `/extensions/${ext.slug}`,
      pdfUrl: `/pdf/${ext.slug}.pdf`,
      tagline: listing.tagline,
      pricingNote: listing.pricingNote,
      narrative: listing.narrative,
      featureBlocks: listing.featureBlocks.map((b) => ({ ...b, image: toAsset(b.image) })),
      gallery: listing.gallery.map(toAsset),
      faq: listing.faq,
    };
    await mkdir(join(DOCS_ROOT, 'data/extensions'), { recursive: true });
    await writeFile(join(DOCS_ROOT, 'data/extensions', `${ext.slug}.json`), JSON.stringify(productJson, null, 2));

    index.push({ slug: ext.slug, title: ext.name, tier: ext.tier, category: ext.category, link: `/extensions/${ext.slug}` });
    console.log(`synced ${ext.slug}`);
  }

  await writeFile(join(DOCS_ROOT, 'data/extensions/_index.json'), JSON.stringify(index, null, 2));

  const landing = [
    '# Extension Manuals',
    '',
    'User guides for every Mage Australia extension. Each manual is available online and as a downloadable PDF. Modules are Composer-installable - pay once, updates included.',
    '',
    ...index.map((e) => `- **[${e.title}](${e.link})** - ${e.category} ([PDF](/pdf/${e.slug}.pdf))`),
    '',
  ].join('\n');
  await writeFile(join(DOCS_ROOT, 'extensions', 'index.md'), landing);

  console.log(`done: ${index.length} extension(s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
