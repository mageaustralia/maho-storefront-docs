/**
 * Rewrite a module's USER_GUIDE.md for publication under VitePress:
 *  - ](screenshots/foo.png)  -> ](/extensions/<slug>/foo.png)   (images + links)
 *  - ](../README.md)         -> ](<githubUrl>)
 * Absolute URLs (http/https, leading slash) are left untouched.
 */
export function rewriteManual(md, { slug, githubUrl }) {
  let out = md.replace(/\]\(\.\.\/README\.md\)/g, `](${githubUrl})`);
  out = out.replace(/\]\(screenshots\/([^)]+)\)/g, `](/extensions/${slug}/$1)`);
  return out;
}
