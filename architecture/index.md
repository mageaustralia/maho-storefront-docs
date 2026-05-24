# Architecture Overview

Maho Storefront is a server-side rendered headless storefront that runs entirely on Cloudflare's edge network. It fetches catalog data from a Maho backend, caches it in Cloudflare KV, and renders HTML responses at the edge using Hono.js JSX.

## System Diagram

```mermaid
graph TB
    Browser[Browser] -->|HTTPS| Edge[Cloudflare Edge]

    subgraph "Cloudflare Workers"
        Edge --> Cache{Edge Cache}
        Cache -->|HIT| Browser
        Cache -->|MISS| Worker[Hono Worker]
        Worker --> KV[Cloudflare KV]
        KV -->|HIT| Worker
        KV -->|MISS| API[Maho API Client]
        API -->|REST| Origin[Maho Backend]
        Origin -->|JSON| API
        API -->|Cache in KV| KV
        Worker -->|SSR JSX| HTML[HTML Response]
        HTML -->|Store in Edge| Cache
        HTML --> Browser
    end

    subgraph "Background"
        Sync[/sync endpoint] -->|Populate| KV
        Freshness[Freshness Controller] -->|Revalidate| Worker
    end
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Edge Compute | [Cloudflare Workers](https://workers.cloudflare.com/) | Request handling, SSR, caching |
| Framework | [Hono.js](https://hono.dev/) | Routing, middleware, JSX rendering |
| Data Store | [Cloudflare KV](https://developers.cloudflare.com/kv/) | Catalog data cache (products, categories, CMS) |
| CSS | [UnoCSS](https://unocss.dev/) + [DaisyUI v5](https://daisyui.com/) | Atomic utilities + component library |
| Navigation | [Turbo](https://turbo.hotwired.dev/) | SPA-like page transitions without a JS framework |
| Client JS | [Stimulus.js](https://stimulus.hotwired.dev/) 3.2 | Declarative client-side controllers |
| Build | [esbuild](https://esbuild.github.io/) + UnoCSS CLI | JS bundling + CSS generation |
| Backend | [Maho](https://mahocommerce.com/) (OpenMage fork) | Catalog, cart, checkout, admin |

## Key Concepts

### Edge-First Rendering

Every catalog page is rendered as static HTML at the Cloudflare edge. There is no client-side framework runtime - Stimulus controllers attach behavior to server-rendered DOM elements.

### Three-Tier Caching

1. **Edge Cache** (~1ms) - HTML responses cached per PoP with version-tagged keys
2. **KV Store** (~10-50ms) - Catalog data (products, categories, config) cached globally
3. **Origin API** (~100-300ms) - Maho backend, hit only on KV miss or revalidation

See [Caching](/architecture/caching) for the full strategy.

### Component Variant System

The storefront uses a slot-based component system where each UI element (product card, header, footer, gallery) has multiple interchangeable variants. Which variant renders is controlled by `page.json` configuration per store.

See [Component Variants](/components/) for details.

### Multi-Store Support

A single Worker deployment serves multiple stores. Each store has its own theme, page config, and KV-prefixed data. Store resolution happens at request time based on the hostname.

See [Multi-Store](/architecture/multi-store) for details.

### Agent Readiness

Every storefront ships an AI-agent-facing surface: `/llms.txt`, content-signal `/robots.txt`, KV-driven `/sitemap.xml` with `<lastmod>`, `/.well-known/api-catalog` (RFC 9727), `/.well-known/oauth-authorization-server` (RFC 8414), `/.well-known/mcp/server-card.json`, and markdown content negotiation on every catalogue page. A dedicated MCP server (sibling Worker) is in progress for agent-driven transactions.

See [Agent Readiness](/agents/) for details.

## Source Files

| File | Lines | Description |
|------|-------|-------------|
| `src/index.tsx` | ~3000 | Main app — routes, middleware, caching, gates |
| `src/api-client.ts` | ~400 | Maho REST API wrapper (paths under `/api/rest/v2/`) |
| `src/page-config.ts` | ~150 | Component variant resolver |
| `src/types.ts` | ~400 | TypeScript type definitions |
| `src/content-store.ts` | ~50 | KV abstraction layer (with tracked timing for dev toolbar) |
| `src/asset-version.ts` | ~24 | Cache-bust hash |
| `src/dev-auth.ts` | ~600 | Password gate, dev tokens, preview, toolbar |
| `src/agents/*.ts` | ~700 total | Agent-readiness surface (llms.txt, robots, sitemap, well-known, markdown) |
| `src/plugins/filterable-pages/` | — | Brand pages, megamenu, dependent filters |
