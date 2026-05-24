import yaml from 'js-yaml';

export class ManifestError extends Error {}

const TIERS = new Set(['free', 'paid']);

function reqString(obj, key, ctx) {
  const v = obj?.[key];
  if (typeof v !== 'string' || v.trim() === '') {
    throw new ManifestError(`${ctx}: missing required string "${key}"`);
  }
  return v.trim();
}

export function parseManifest(src) {
  let doc;
  try {
    doc = yaml.load(src);
  } catch (e) {
    throw new ManifestError(`invalid YAML: ${e.message}`);
  }
  const list = doc?.extensions;
  if (!Array.isArray(list) || list.length === 0) {
    throw new ManifestError('manifest has no "extensions" list');
  }
  return list.map((e, i) => {
    const ctx = `extensions[${i}]`;
    const tier = reqString(e, 'tier', ctx);
    if (!TIERS.has(tier)) throw new ManifestError(`${ctx}: tier must be free|paid, got "${tier}"`);
    const path = reqString(e.source ?? {}, 'path', `${ctx}.source`);
    return {
      slug: reqString(e, 'slug', ctx),
      composerPackage: reqString(e, 'composer_package', ctx),
      tier,
      category: reqString(e, 'category', ctx),
      storefrontUrlKey: reqString(e, 'storefront_url_key', ctx),
      githubUrl: reqString(e, 'github_url', ctx),
      source: { path },
    };
  });
}
