import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseListing, ListingError } from './listing.mjs';

const valid = `
slug: followup-email
tagline: "Recover carts."
pricing_note: "Pay once."
narrative:
  challenge: "Carts get abandoned."
  solution: "Send drip emails."
feature_blocks:
  - heading: "Drip chains"
    body: "Multi-step timing."
    image: screenshots/a.png
gallery:
  - screenshots/b.png
faq:
  - q: "Needs an ESP?"
    a: "No."
`;

test('parseListing returns a normalised object for valid input', () => {
  const r = parseListing(valid);
  assert.equal(r.slug, 'followup-email');
  assert.equal(r.tagline, 'Recover carts.');
  assert.equal(r.narrative.challenge, 'Carts get abandoned.');
  assert.equal(r.featureBlocks.length, 1);
  assert.equal(r.featureBlocks[0].image, 'screenshots/a.png');
  assert.deepEqual(r.gallery, ['screenshots/b.png']);
  assert.equal(r.faq[0].q, 'Needs an ESP?');
});

test('parseListing throws ListingError when slug is missing', () => {
  assert.throws(() => parseListing('tagline: "x"'), ListingError);
});

test('parseListing throws ListingError when a feature_block lacks a heading', () => {
  const bad = 'slug: x\ntagline: "t"\nfeature_blocks:\n  - body: "b"\n';
  assert.throws(() => parseListing(bad), ListingError);
});

test('parseListing throws when tagline is missing', () => {
  assert.throws(() => parseListing('slug: x'), ListingError);
});

test('parseListing throws when feature_blocks is not a sequence', () => {
  assert.throws(() => parseListing('slug: x\ntagline: "t"\nfeature_blocks: "oops"'), ListingError);
});

test('parseListing throws when a gallery entry is not a string', () => {
  assert.throws(() => parseListing('slug: x\ntagline: "t"\ngallery:\n  - 123'), ListingError);
});

test('parseListing normalises pricing_note to pricingNote', () => {
  const r = parseListing('slug: x\ntagline: "t"\npricing_note: "Pay once."');
  assert.equal(r.pricingNote, 'Pay once.');
});
