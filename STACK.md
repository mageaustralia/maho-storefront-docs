# Maho Storefront - Tech Stack Overview

## Current Stack

### Frontend (Headless Storefront)
| Layer | Technology |
|-------|------------|
| **Edge Runtime** | Cloudflare Workers |
| **Framework** | Hono.js (lightweight, ~14kb) |
| **Caching** | Cloudflare KV (edge key-value store) |
| **Templating** | Hono JSX (server-side rendered) |
| **JS Framework** | Hotwired Stimulus (controllers) + Turbo (navigation) |
| **Build Tool** | esbuild |
| **Styling** | Plain CSS (no framework) |

### Backend (API)
| Layer | Technology |
|-------|------------|
| **Platform** | Maho Commerce (PHP 8.3, fork of OpenMage) |
| **API Layer** | Symfony API Platform (REST + GraphQL) |
| **Database** | MySQL |
| **Auth** | JWT tokens |

---

## Pros

### Performance
- Edge rendering = ~20ms TTFB globally (vs 200-500ms from origin)
- KV cache means most requests never hit the PHP backend
- Turbo makes navigation feel instant (no full page reloads)
- Small JS bundle (~115kb) vs typical React app (500kb+)

### Cost
- Cloudflare Workers free tier = 100k requests/day
- No Node.js servers to manage
- Backend only handles API calls, not page rendering

### Developer Experience
- Simple mental model: HTML + progressive enhancement
- No hydration mismatch bugs (common in React SSR)
- Modular JS - edit one controller without touching others
- Fast builds (~10ms with esbuild)

### SEO & Accessibility
- Full HTML rendered server-side (great for crawlers)
- Works without JavaScript (forms, links all functional)
- No client-side routing complexity

### Resilience
- Freshness checking = stale-while-revalidate pattern
- Site works even if backend is slow/down (serves cached)

---

## Cons

### Limited Interactivity
- Stimulus is for "sprinkling" JS, not complex UIs
- Building something like a drag-and-drop cart or real-time updates is harder
- No virtual DOM = manual DOM manipulation in controllers

### No Component Ecosystem
- Can't `bun install` a date picker or modal library easily
- Have to build UI components from scratch
- No design system like Tailwind UI, Radix, etc.

### State Management
- No centralized state (Redux, Zustand)
- State lives in DOM + localStorage
- Complex cross-component communication requires custom events

### Team Familiarity
- Most devs know React/Vue, fewer know Stimulus
- Harder to hire for this stack
- Less Stack Overflow / community resources

### Testing
- No established testing patterns like React Testing Library
- E2E tests (Playwright) become more important

### Edge Limitations
- KV is eventually consistent (rare but possible stale reads)
- Workers have CPU/memory limits (though generous)
- Can't run traditional sessions (stateless only)

---

## When This Stack Shines

- Content-heavy e-commerce (products, categories, CMS pages)
- SEO-critical sites
- Global audience needing fast load times
- Small team wanting simplicity over flexibility
- Sites where 90% is "read" and 10% is "interact"

## When You Might Outgrow It

- Heavy real-time features (chat, collaborative editing)
- Complex product configurators
- Admin dashboards with lots of forms/tables
- Team strongly prefers React/Vue ecosystem

---

## Directory Structure

```
maho-storefront/
├── src/
│   ├── index.tsx           # Cloudflare Worker entry point
│   ├── api-client.ts       # API client for Maho backend
│   ├── content-store.ts    # KV cache abstraction
│   ├── types.ts            # TypeScript types
│   ├── templates/          # Hono JSX templates
│   │   ├── Layout.tsx
│   │   ├── Home.tsx
│   │   ├── Product.tsx
│   │   ├── Category.tsx
│   │   ├── Checkout.tsx
│   │   └── ...
│   └── js/                 # Client-side JavaScript
│       ├── app.js          # Entry point (imports all controllers)
│       ├── api.js          # Shared API utility
│       ├── utils.js        # Helper functions
│       ├── stimulus.js     # Stimulus re-export from CDN
│       └── controllers/    # Stimulus controllers
│           ├── cart-controller.js
│           ├── checkout-controller.js
│           ├── product-controller.js
│           └── ...
├── public/
│   ├── controllers.js.txt  # Built JS bundle (generated)
│   └── styles.css          # Stylesheet
├── package.json
├── wrangler.toml           # Cloudflare config
└── deploy.sh               # Build & deploy script
```

## Build & Deploy

```bash
# Development
bun run dev          # Local wrangler dev server

# Build JS only
bun run build        # Bundles src/js/ → public/controllers.js.txt

# Deploy (builds automatically)
./deploy.sh          # Builds JS, then deploys to Cloudflare
```

## Key Concepts

### Freshness Checking
Pages include hidden metadata about when they were cached. Client JS checks if data is stale and triggers background refresh if needed.

### Stimulus Controllers
Each interactive feature is a Stimulus controller (e.g., `cart`, `checkout`, `product`). They connect to DOM elements via `data-controller` attributes and respond to events.

### KV Caching Strategy
- Categories, products, CMS pages cached in KV
- `/sync/*` endpoints refresh KV from backend
- Edge cache (Cloudflare CDN) sits in front for HTML responses

---

**TL;DR:** Fast, cheap, simple, SEO-friendly, but limited for complex interactivity. Good fit for a product catalog storefront.
