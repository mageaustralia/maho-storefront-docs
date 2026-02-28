# Getting Started

Maho Storefront is a headless commerce frontend built on [Cloudflare Workers](https://workers.cloudflare.com/) with three goals:

### 1. Fastest End-User Experience

Every page is server-rendered at the edge — the nearest Cloudflare PoP (200+ locations globally) serves fully rendered HTML in under 100ms. A [three-tier caching strategy](/architecture/caching) (edge cache → KV store → origin API) means users get instant responses regardless of their region. No client-side rendering delays, no loading spinners, no layout shifts.

### 2. Fantastic Developer Experience

[Hono.js](https://hono.dev/) was chosen as the framework because it's purpose-built for edge runtimes — lightweight (~14kb), fast, and ships with JSX support out of the box. Developers write familiar JSX templates that render server-side, use [Hotwire Turbo](https://turbo.hotwired.dev/) for SPA-like page transitions without a JavaScript framework, and [Stimulus.js](https://stimulus.hotwired.dev/) for progressive client-side interactivity. Styling uses [UnoCSS](https://unocss.dev/) with [DaisyUI v5](https://daisyui.com/) components for a token-driven, themeable design system. The [component variant system](/components/) makes it easy to create and swap UI variants per store without touching core logic.

### 3. Great SEO Experience

Full server-side rendering means search engines receive complete, crawlable HTML on every request — no JavaScript required to see content. Combined with proper semantic markup, structured data (Schema.org), and canonical URLs, the storefront is optimised for search engine indexing from the ground up.

## Prerequisites

- **Bun** (auto-installed by `./maho storefront:build`, or [install manually](https://bun.sh/))
- **Wrangler CLI** (installed as a dev dependency)
- A running **Maho backend** with the API Platform module enabled
- A **Cloudflare account** with Workers and KV access

## Quick Start

```bash
# Clone the repository
git clone https://github.com/mageaustralia/maho-storefront.git
cd maho-storefront

# Install dependencies
bun install

# Build CSS and JS
bun run build

# Start local dev server
bun run dev
```

The local dev server runs at `http://localhost:8787` using Wrangler's local mode with simulated KV storage.

## What's Next

- [Installation](/getting-started/installation) — detailed setup instructions
- [Project Structure](/getting-started/project-structure) — understand the codebase layout
- [Architecture Overview](/architecture/) — how the system works end-to-end
- [Deployment](/getting-started/deployment) — deploy to Cloudflare Workers
