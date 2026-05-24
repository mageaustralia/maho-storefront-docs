import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rewriteManual } from './markdown.mjs';

test('rewrites relative screenshot image paths to the deployed asset base', () => {
  const md = '![General tab](screenshots/followup-doc-rule-general.png)';
  const out = rewriteManual(md, { slug: 'followup-email', githubUrl: 'https://github.com/x/y' });
  assert.equal(out, '![General tab](/extensions/followup-email/followup-doc-rule-general.png)');
});

test('rewrites a ../README.md link to the github repo url', () => {
  const md = 'see [README.md](../README.md) for details';
  const out = rewriteManual(md, { slug: 'followup-email', githubUrl: 'https://github.com/x/y' });
  assert.equal(out, 'see [README.md](https://github.com/x/y) for details');
});

test('leaves absolute image urls untouched', () => {
  const md = '![x](https://cdn/x.png)';
  assert.equal(rewriteManual(md, { slug: 's', githubUrl: 'g' }), md);
});
