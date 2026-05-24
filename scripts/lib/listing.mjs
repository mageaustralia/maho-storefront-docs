import yaml from 'js-yaml';

export class ListingError extends Error {}

function reqString(obj, key, ctx) {
  const v = obj?.[key];
  if (typeof v !== 'string' || v.trim() === '') {
    throw new ListingError(`${ctx}: missing required string "${key}"`);
  }
  return v.trim();
}

/** Parse a listing.yml string into a normalised listing object. */
export function parseListing(src) {
  let doc;
  try {
    doc = yaml.load(src);
  } catch (e) {
    throw new ListingError(`invalid YAML: ${e.message}`);
  }
  if (!doc || typeof doc !== 'object') {
    throw new ListingError('listing.yml is empty or not a mapping');
  }

  const slug = reqString(doc, 'slug', 'listing');
  const out = {
    slug,
    tagline: reqString(doc, 'tagline', 'listing'),
    pricingNote: typeof doc.pricing_note === 'string' ? doc.pricing_note.trim() : '',
    narrative: {
      challenge: typeof doc?.narrative?.challenge === 'string' ? doc.narrative.challenge.trim() : '',
      solution: typeof doc?.narrative?.solution === 'string' ? doc.narrative.solution.trim() : '',
    },
    featureBlocks: [],
    gallery: [],
    faq: [],
  };

  for (const [i, b] of (doc.feature_blocks ?? []).entries()) {
    out.featureBlocks.push({
      heading: reqString(b, 'heading', `feature_blocks[${i}]`),
      body: reqString(b, 'body', `feature_blocks[${i}]`),
      image: typeof b.image === 'string' ? b.image.trim() : '',
    });
  }
  for (const [i, g] of (doc.gallery ?? []).entries()) {
    if (typeof g !== 'string' || g.trim() === '') {
      throw new ListingError(`gallery[${i}]: must be a non-empty string`);
    }
    out.gallery.push(g.trim());
  }
  for (const [i, f] of (doc.faq ?? []).entries()) {
    out.faq.push({
      q: reqString(f, 'q', `faq[${i}]`),
      a: reqString(f, 'a', `faq[${i}]`),
    });
  }
  return out;
}
