# CMS Components

Components for rendering CMS pages and CMS blocks from the Maho admin.

## CMS Pages

CMS pages are stored in KV and rendered with a standard content template. The HTML content from Maho's WYSIWYG editor is rendered within a styled container.

### Content Rendering

```html
<article class="prose max-w-none">
  <!-- CMS page HTML content rendered here -->
  {page.content}
</article>
```

The `prose` class (from UnoCSS typography preset) styles raw HTML content with proper typography — headings, paragraphs, lists, tables, images, and links all get sensible defaults.

### CMS Page Template

Each CMS page includes:
- Page title as `<h1>`
- Content heading (if set)
- Breadcrumb trail
- Featured image (if set)
- SEO meta tags from page configuration

## CMS Blocks

CMS blocks are reusable content snippets that can be embedded in any template. They're fetched by identifier and rendered inline.

### Common CMS Block Uses

| Block Identifier | Used In | Purpose |
|-----------------|---------|---------|
| Category CMS blocks | Category pages | Custom HTML above product grid |
| Homepage sections | Homepage | Promotional content sections |
| Footer content | Footer | About text, policies |
| Product notices | Product pages | Shipping/return policy |

### Rendering CMS Blocks

In JSX templates:

```tsx
// Fetch block from KV
const block = await contentStore.get(`${storeCode}:cms-block:${identifier}`);

// Render in template
{block && (
  <div class="cms-block" dangerouslySetInnerHTML={{ __html: block.content }} />
)}
```

## Blog Posts

Blog posts are rendered similarly to CMS pages with additional blog-specific features:

- Publication date
- Featured image
- Post excerpt (for listings)
- Blog post navigation (next/previous)
- SEO-optimized markup

### Blog Listing

The blog index page shows posts in a card grid:
- Featured image thumbnail
- Post title
- Excerpt
- Publication date
- "Read More" link

Source: `src/templates/components/cms/`, `src/templates/`
