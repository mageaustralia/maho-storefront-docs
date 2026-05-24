import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseManifest, ManifestError } from './manifest.mjs';

const valid = `
extensions:
  - slug: followup-email
    composer_package: mageaustralia/maho-module-followup-email
    tier: paid
    category: "Checkout & Conversion"
    storefront_url_key: followup-email
    github_url: "https://github.com/x/y"
    source:
      path: "../../maho-modules/maho-module-followup-email/docs"
`;

test('parseManifest returns the extension list', () => {
  const r = parseManifest(valid);
  assert.equal(r.length, 1);
  assert.equal(r[0].slug, 'followup-email');
  assert.equal(r[0].tier, 'paid');
  assert.equal(r[0].source.path, '../../maho-modules/maho-module-followup-email/docs');
});

test('parseManifest rejects an invalid tier', () => {
  const bad = valid.replace('tier: paid', 'tier: gratis');
  assert.throws(() => parseManifest(bad), ManifestError);
});

test('parseManifest rejects a missing composer_package', () => {
  const bad = valid.replace('    composer_package: mageaustralia/maho-module-followup-email\n', '');
  assert.throws(() => parseManifest(bad), ManifestError);
});
