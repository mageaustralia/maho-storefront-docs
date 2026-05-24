/**
 * Rewrite a module's USER_GUIDE.md for publication under VitePress:
 *  - ](screenshots/foo.png)  -> ](/extensions/<slug>/foo.png)   (images + links)
 *  - ](../README.md)         -> ](<githubUrl>)
 *  - inline code spans containing Vue-like {{ }} -> raw <code v-pre>...</code>
 *    so VitePress's Vue renderer does not compile them (which breaks the build),
 *    while the braces still render literally for the reader.
 * Absolute URLs (http/https, leading slash) are left untouched.
 */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function rewriteManual(md, { slug, githubUrl }) {
  let out = md.replace(/\]\(\.\.\/README\.md\)/g, `](${githubUrl})`);
  out = out.replace(/\]\(screenshots\/([^)]+)\)/g, `](/extensions/${slug}/$1)`);
  // Only single-line inline code spans that actually contain `{{` need protecting.
  // Fenced code blocks (```) are already protected by VitePress and are not matched
  // here (this regex never spans newlines or triple backticks).
  out = out.replace(/`([^`\n]*\{\{[^`\n]*)`/g, (_m, inner) => `<code v-pre>${escapeHtml(inner)}</code>`);
  return out;
}
